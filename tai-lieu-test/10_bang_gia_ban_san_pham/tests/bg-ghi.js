'use strict';

/**
 * Helper GHI phân hệ 10 — bảng giá TẠM của auto test.
 *
 * Nguồn (vnpost-web af8cda07): `features/pricing/pages/PricingFormPage.jsx`, `PricingListPage.jsx`,
 * `components/tabs/TabGeneralInfo.jsx`, `TabProducts.jsx`, `components/ProductPriceTable.jsx`,
 * `services/pricingApi.js`.
 *
 * 🔴 Bảng giá tạm áp cho điểm bán RÁC `diemBanNhan` (tỉnh/xã rác riêng `…_55976508`), 🚫 KHÔNG cho
 *    điểm bán seed: bảng giá đã phê duyệt đổi GIÁ BÁN ở quầy, mà mọi case POS đọc giá 100.000 của
 *    `AUTO8_BANGGIA`. Tên tạm: `AUTO8_BGT_<hậu tố>`, xoá trong `finally`.
 * 🔴 Lưu xong trang tự `navigate(-1)` — đọc body response create/update thì bọc catch.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const { chonPhamViDiemBan } = require('../../00_seed/helpers');
const pp = require('./price-page');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const BASE = () => process.env.VNPOST_BASE_URL;
const chuan = pp.chuan;
const hau = () => Date.now().toString().slice(-7);
const TEN = (x) => `${seed.PREFIX}BGT_${x}`;

function duLieu() {
	const d = seed.doc().duLieu;
	if (!d?.diemBanNhan?.shopId) throw new Error('Sổ seed thiếu `diemBanNhan` (điểm bán rác nhận hàng) — xem 04_3.');
	const sp = d.sanPham.sanPhamTheoGiaVon;
	return { rac: d.diemBanNhan, seedShop: d.diemBan, toChuc: d.toChuc, sp, danhMuc: { ten: d.sanPham.tenDanhMuc, ma: d.sanPham.maDanhMuc }, bangGiaSeed: d.bangGiaBan };
}

const ngay = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const homNay = () => ngay(new Date());
const sauNgay = (n) => ngay(new Date(Date.now() + n * 86_400_000));

async function moTao(page) {
	// 🔴 Đi từ DANH SÁCH rồi bấm "Thêm mới": Lưu/Huỷ gọi `navigate(-1)` — mở thẳng URL tạo thì lùi ra
	//    khỏi màn (mất toast "Thêm bảng giá thành công", không về Quản lý bảng giá).
	await pp.moMan(page, 'tct');
	await pp.khung(page).getByRole('button', { name: /Thêm mới/ }).first().click();
	await expect(page.getByPlaceholder('Nhập tên bảng giá'), 'Không mở được trang Thêm bảng giá').toBeVisible({ timeout: 30_000 });
}

const the = (page, ten) => page.getByRole('tab', { name: ten, exact: true });

async function datNgay(page, placeholder, v) {
	const o = page.getByPlaceholder(placeholder);
	await o.click();
	await o.fill(v);
	await o.press('Enter');
}

/**
 * Khai thẻ Thông tin chung. `status`: 1/0, `includeTax`: 1/0. `gio = ['HH:mm', 'HH:mm']` ⇒ bỏ tick "Không cài đặt khung giờ"
 * (mặc định TICK — `TabGeneralInfo.jsx` initialValue true) rồi khai khung giờ trong ngày.
 */
async function dienChung(page, { ten, pb, batDau = homNay(), ketThuc, status, includeTax, gio } = {}) {
	await the(page, 'Thông tin chung').click();
	if (ten != null) await page.getByPlaceholder('Nhập tên bảng giá').fill(ten);
	if (pb != null) await page.getByPlaceholder('Nhập tên phiên bản').fill(pb);
	if (batDau) await datNgay(page, 'Chọn ngày bắt đầu', batDau);
	if (ketThuc) await datNgay(page, 'Chọn ngày kết thúc', ketThuc);
	if (gio) {
		const o = page.getByRole('checkbox', { name: 'Không cài đặt khung giờ' });
		if (await o.isChecked()) await page.getByText('Không cài đặt khung giờ', { exact: true }).click();
		await datNgay(page, 'Chọn giờ bắt đầu', gio[0]);
		await datNgay(page, 'Chọn giờ kết thúc', gio[1]);
	}
	if (status === 0) await page.getByRole('radio', { name: 'Ngừng kích hoạt' }).check({ force: true });
	if (includeTax === 0) await page.getByText('Đơn giá chưa bao gồm VAT (Giá trước thuế)', { exact: true }).click();
}

/** Thẻ Phạm vi khu vực: tick điểm bán RÁC. */
async function chonPhamViRac(page) {
	const { rac } = duLieu();
	await the(page, 'Phạm vi khu vực').click();
	await chonPhamViDiemBan(page, page.locator('.sp-body').first(), { tenTinh: rac.tenTinh, tenXa: rac.tenXa, tenShop: rac.tenShop });
}

/** Chờ thông báo mới (sau khi toast cũ tắt) quanh một hành động; trả chuỗi thông báo. */
async function thongBaoQuanh(page, hanhDong, timeout = 15_000) {
	await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
	const tb = page.locator('.ant-message-notice').first().waitFor({ timeout }).then(() => page.locator('.ant-message-notice').allInnerTexts()).catch(() => []);
	await hanhDong();
	return chuan((await tb).join(' | '));
}

/** Thẻ Sản phẩm: thêm theo SKU; trả thông báo. */
async function themSku(page, sku, { loai } = {}) {
	await the(page, 'Sản phẩm').click();
	if (loai) await chonLoaiSp(page, loai);
	await page.locator('.ant-radio-button-wrapper').filter({ hasText: /^Mã SKU$/ }).first().click();
	await page.getByPlaceholder('Nhập mã SKU').fill(sku);
	return thongBaoQuanh(page, () => page.getByRole('button', { name: 'Thêm vào danh sách' }).click());
}

/** Ô "Loại sản phẩm" ở panel trái (Sản phẩm thường / Combo). */
async function chonLoaiSp(page, nhan) {
	const o = page.locator('.ant-tabs-tabpane-active .ant-select').filter({ hasText: /Sản phẩm thường|Combo sản phẩm/ }).first();
	await o.click();
	// Nhiều dropdown antd còn trong DOM (đóng mà chưa gỡ) — lọc theo HIỂN THỊ, 🚫 `.last()` mù.
	await page.locator('.ant-select-item-option').filter({ hasText: new RegExp(`^${nhan}$`), visible: true }).first().click();
	await expect(o).toContainText(nhan);
}

const dongSp = (page, sku) => page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').filter({ hasText: sku }).first();

/** Điền Đơn giá cho dòng SKU (đóng gợi ý của InputCurrency — xem seed bước 5). */
async function datGia(page, sku, gia) {
	const o = dongSp(page, sku).locator('.ant-input-number-input').first();
	await o.fill(String(gia));
	const goiY = page.locator('.suggestions-portal [role="option"]');
	await goiY.first().waitFor({ state: 'visible', timeout: 3_000 }).catch(() => {});
	await o.press('Escape');
	await expect(goiY).toHaveCount(0);
	await o.blur();
	return o.inputValue();
}

/**
 * Bấm Lưu (Popconfirm "Xác nhận lưu bảng giá này?" → "Lưu"). Trả { res, body, thongBao }.
 * res = null nếu FE chặn. `chan` = true ⇒ chặn request ghi ở mạng.
 */
async function luu(page, { timeout = 30_000, chan = false, sua = false } = {}) {
	const dich = sua ? /chain-price-list\/update/ : /chain-price-list\/create/;
	const bi = [];
	if (chan) {
		await page.route('**/__api/chain-price-list/**', (route) => {
			const r = route.request();
			if (r.method() === 'GET') return route.continue();
			bi.push(r.postData());
			return route.fulfill({ status: 403, contentType: 'application/json', body: '{"status":{"code":"403","message":"Bị auto test chặn"}}' });
		});
	}
	const cho = page.waitForResponse((r) => dich.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), { timeout }).catch(() => null);
	const thongBao = await thongBaoQuanh(page, async () => {
		await page.getByRole('button', { name: 'Lưu', exact: true }).last().click();
		const hop = page.locator('.ant-popover:visible').filter({ hasText: 'Xác nhận lưu bảng giá này?' }).last();
		await expect(hop).toBeVisible();
		await hop.getByRole('button', { name: 'Lưu', exact: true }).click();
	}, timeout);
	const res = chan ? null : await cho;
	const body = res ? await res.json().catch(() => null) : null;
	return { res, body, thongBao, bi };
}

/** Thẻ Phạm vi khu vực: tick điểm bán SEED (chỉ cho nhóm POS 10_130 — bảng giá chỉ chứa SP sản xuất). */
async function chonPhamViSeed(page) {
	const { seedShop, toChuc } = duLieu();
	await the(page, 'Phạm vi khu vực').click();
	await chonPhamViDiemBan(page, page.locator('.sp-body').first(), { tenTinh: toChuc.tenTinh, tenXa: toChuc.tenXa, tenShop: seedShop.tenShop });
}

/** Tạo nhanh bảng giá tạm (1 SKU, mặc định điểm bán rác). Trả { ten }. */
async function taoTam(page, { ten = TEN(hau()), sku, gia = 123_000, phamVi = 'rac', loai, ...chung } = {}) {
	const { sp } = duLieu();
	await moTao(page);
	await dienChung(page, { ten, pb: `${ten}_PB`, ...chung });
	if (phamVi === 'seed') await chonPhamViSeed(page);
	else await chonPhamViRac(page);
	const tbThem = await themSku(page, sku || sp.tieuChuan.sku, { loai });
	expect(tbThem, `Không thêm được ${sku || sp.tieuChuan.sku} vào bảng giá`).toContain('Đã thêm');
	await datGia(page, sku || sp.tieuChuan.sku, gia);
	const kq = await luu(page);
	expect(kq.res, `Lưu bảng giá tạm không gửi request. Thông báo: ${kq.thongBao}`).not.toBeNull();
	expect(kq.res.status(), `Tạo bảng giá tạm lỗi: ${kq.thongBao}`).toBeLessThan(400);
	expect(kq.thongBao).toContain('Thêm bảng giá thành công');
	return { ten, gui: JSON.parse(kq.res.request().postData() || '{}') };
}

/** Mở danh sách, gõ tìm tên; trả dòng. */
async function timDong(page, ten) {
	await pp.moMan(page, 'tct');
	await pp.taiLaiBoi(page, () => pp.oTim(page).fill(ten));
	return pp.dong(page).filter({ hasText: ten }).first();
}

/** Tra bảng giá theo tên (API danh sách → chi tiết) bằng header của phiên. */
async function chiTietTheoTen(page, st, ten) {
	const ds = (await k.goiApi(page, st, '/chain-price-list/get-all', { name: ten, page: 0, size: 20 })).data || [];
	const x = ds.find((v) => v.name === ten);
	if (!x) return null;
	const ct = (await k.goiApi(page, st, '/chain-price-list/detail', { priceListId: x.priceListId })).data;
	return { ...x, ct };
}

async function sanPhamCua(page, st, priceListId) {
	return (await k.goiApi(page, st, '/chain-price-list/items', { priceListId, page: 0, size: 200 })).data || [];
}

const nutIcon = (dong, icon) => dong.locator(`button:has(.anticon-${icon})`).first();

/** Xoá một bảng giá tạm qua UI (nếu đang Kích hoạt + đã duyệt mà bị chặn thì ngừng kích hoạt trước). */
async function xoaTam(page, ten) {
	const d = await timDong(page, ten);
	if (!(await d.count())) return 'khong-thay';
	const cho = page.waitForResponse((r) => /chain-price-list\/delete/.test(r.url()), { timeout: 20_000 }).catch(() => null);
	await nutIcon(d, 'delete').click();
	const hop = page.locator('.ant-popover:visible').filter({ hasText: 'Xác nhận xóa bảng giá?' }).last();
	await hop.getByRole('button', { name: 'Xóa', exact: true }).click();
	const res = await cho;
	return res ? res.status() : 'khong-goi';
}

/** Phê duyệt bảng giá qua UI (danh sách → dấu tích → Đồng ý). */
async function duyet(page, ten) {
	const d = await timDong(page, ten);
	await expect(d, `Không thấy ${ten} để phê duyệt`).toBeVisible({ timeout: 20_000 });
	const hop = await popconfirm(page, d, 'check', 'Xác nhận phê duyệt bảng giá?');
	const tb = await thongBaoQuanh(page, () => hop.getByRole('button', { name: 'Đồng ý' }).click());
	expect(tb, `Phê duyệt ${ten} không thành công`).toContain('Phê duyệt bảng giá thành công');
}

async function popconfirm(page, dong, icon, tieuDe) {
	await nutIcon(dong, icon).click();
	const hop = page.locator('.ant-popover:visible').filter({ hasText: tieuDe }).last();
	await expect(hop, `Không mở hộp "${tieuDe}"`).toBeVisible();
	return hop;
}

/** Cột theo tiêu đề của bảng danh sách. */
async function oCot(page, dong, tieuDe) {
	const th = (await pp.cot(page).allInnerTexts()).map(chuan);
	const i = th.indexOf(tieuDe);
	expect(i, `Danh sách không có cột "${tieuDe}": ${th.join(' · ')}`).toBeGreaterThan(-1);
	return chuan(await dong.locator('td').nth(i).innerText());
}

module.exports = { duLieu, moTao, the, dienChung, chonPhamViRac, chonPhamViSeed, duyet, themSku, chonLoaiSp, dongSp, datGia, luu, taoTam, timDong, chiTietTheoTen, sanPhamCua, xoaTam, popconfirm, nutIcon, oCot, thongBaoQuanh, TEN, hau, homNay, sauNgay, chuan };
