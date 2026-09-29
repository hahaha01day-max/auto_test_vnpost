'use strict';

/**
 * Helper GHI cho phân hệ 09 — Sản xuất sản phẩm (`/inventory/production`).
 *
 * Nguồn (vnpost-web af8cda07): `features/production/pages/ProductionListPage.jsx`,
 * `components/ProductionCreateDrawer.jsx`, `components/ProductionDetailDrawer.jsx`,
 * `services/productionApi.js`.
 *
 * 🔴 Phân vai đo 24/09/2026 (làn 8):
 *  - Nút "Tạo phiếu sản xuất" và "Xác nhận" cùng gắn quyền `create_import_stock`.
 *  - Cửa hàng trưởng (`shop`): GET `/production` 200, FE ẩn nút (không có quyền) — nhưng BE vẫn nhận
 *    POST lập phiếu nếu gọi thẳng API (đo bằng API 24/09).
 *  - GDV điểm bán (`seed_gdv`): FE có nút Tạo, nhưng BE trả **401** cho CẢ GET lẫn POST `/production`
 *    ⇒ bấm "Lưu phiếu" báo "Không có quyền truy cập". Bốn quyền `PRODUCTION_*` (TBL_PERMISSION
 *    11125–11128) không gắn vào function nào (TBL_FUNCTION_PERMISSION rỗng).
 *  - Vai tỉnh (`province`): chọn điểm bán `AUTO8_SHOP` rồi danh sách 200 + có nút Xác nhận; nhưng ô
 *    "Điểm bán / kho sản xuất" của drawer chỉ trả KHO ở chế độ HUB ⇒ không lập được phiếu cho POS qua UI.
 *  ⇒ Case form (không lưu) chạy bằng GDV + chặn POST ở mạng; case xác nhận chạy bằng vai tỉnh, phiếu
 *    Nháp tiền đề lập qua API với đúng payload FE.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const BASE = () => process.env.VNPOST_BASE_URL;
const ROUTE = '/inventory/production';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();
const GHI_CHU = 'AUTO TEST 09 - khong su dung';

function duLieu() {
	const d = seed.doc().duLieu;
	const sx = d?.sanPhamSanXuat;
	if (!sx?.coCongThuc) throw new Error('Sổ seed chưa có sản phẩm sản xuất — chạy 00_seed bước 10 (--no-deps).');
	return { shopId: d.diemBan.shopId, tenShop: d.diemBan.tenShop, tenXa: d.toChuc.tenXa, sx, tc: d.sanPham.sanPhamTheoGiaVon.tieuChuan };
}

/** Mở drawer "Tạo phiếu sản xuất" (vai cấp điểm bán — kho tự chọn kho mặc định). */
async function moForm(page, vai) {
	await moTrang(page, `${BASE()}${ROUTE}`, vai);
	const nut = khung(page).getByRole('button', { name: 'Tạo phiếu sản xuất' });
	await expect(nut, `Vai ${vai} không thấy nút "Tạo phiếu sản xuất"`).toBeVisible({ timeout: 30_000 });
	await nut.click();
	const d = page.locator('.ant-drawer-open').filter({ hasText: 'Tạo phiếu sản xuất' }).last();
	await expect(d.getByPlaceholder('Tìm sản phẩm chế biến theo tên / SKU / barcode')).toBeVisible({ timeout: 30_000 });
	return d;
}

/** Tìm và tick một sản phẩm chế biến; trả thẻ (card) của nó. 🚫 Không Escape — Escape đóng cả drawer. */
async function chonThanhPham(page, d, ten) {
	const o = d.getByPlaceholder('Tìm sản phẩm chế biến theo tên / SKU / barcode');
	await o.click();
	await o.fill(ten);
	const muc = page.getByText(ten, { exact: true }).last();
	await expect(muc, `Ô tìm sản phẩm chế biến không ra "${ten}"`).toBeVisible({ timeout: 30_000 });
	await muc.click();
	await d.locator('.ant-drawer-title').click();
	const the = d.locator('.rounded.border').filter({ has: page.getByText(ten, { exact: true }) }).first();
	await expect(the, 'Tick thành phẩm xong mà không có thẻ sản xuất').toBeVisible({ timeout: 20_000 });
	await expect(d.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 });
	return the;
}

const oSoLuong = (the) => the.locator('.ant-input-number-input').first();

async function datSoLuong(page, the, v) {
	const o = oSoLuong(the);
	await o.fill(String(v));
	await o.press('Tab');
	await expect(the.page().locator('.ant-drawer-open .ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 });
	return o.inputValue();
}

/** Đọc các dòng nguyên liệu tiêu hao: [{ ten, can, ton, tag }]. */
async function dongNguyenLieu(the) {
	const ds = the.locator('.grid');
	const n = await ds.count();
	const out = [];
	for (let i = 0; i < n; i++) {
		const t = chuan(await ds.nth(i).innerText());
		const m = t.match(/Cần\s*([\d.,-]+)\s*\/\s*Tồn\s*([\d.,-]+)/);
		out.push({ text: t, can: m ? Number(m[1].replace(/,/g, '')) : null, ton: m ? Number(m[2].replace(/,/g, '')) : null, tag: /Thiếu/.test(t) ? 'Thiếu' : /Đủ/.test(t) ? 'Đủ' : '' });
	}
	return out;
}

/** Bấm "Lưu phiếu"; trả { res, body, thongBao } (res = null nếu FE chặn không gửi). */
async function luu(page, d, timeout = 30_000) {
	const cho = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/production') && r.request().method() === 'POST', { timeout }).catch(() => null);
	// 🔴 Bắt thông báo NGAY khi hiện: message antd tự tắt sau ~3 giây — đọc sau khi chờ response
	//    (FE chặn ⇒ chờ hết timeout) là đã mất, ra chuỗi rỗng.
	//    Toast CŨ (vd. "Không có quyền truy cập" của GDV khi tải danh sách) phải tắt hẳn trước khi bấm,
	//    không thì bắt nhầm nó.
	await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
	const tb = page.locator('.ant-message-notice').first().waitFor({ timeout }).then(() => page.locator('.ant-message-notice').allInnerTexts()).catch(() => []);
	await d.getByRole('button', { name: 'Lưu phiếu' }).click();
	const [res, tbs] = await Promise.all([cho, tb]);
	const body = res ? await res.json().catch(() => ({})) : null;
	const thongBao = chuan(tbs.join(' | '));
	return { res, body, thongBao };
}

/** GDV lập một phiếu Nháp qua UI (🔴 đo 24/09: BE trả 401 — case `09_010_003` đỏ vì lý do này). */
async function lapPhieuNhap(page, soLuong = 1) {
	const { sx } = duLieu();
	const d = await moForm(page, 'seed_gdv');
	await d.getByPlaceholder('Ghi chú').fill(GHI_CHU);
	const the = await chonThanhPham(page, d, sx.coCongThuc.tenSanPham);
	await datSoLuong(page, the, soLuong);
	const kq = await luu(page, d);
	expect(kq.res, `Bấm Lưu phiếu không gửi request. Thông báo: ${kq.thongBao}`).not.toBeNull();
	expect(String(kq.body?.status?.code), `Lập phiếu lỗi: ${kq.body?.status?.message}`).toBe('200');
	return { data: kq.body.data, thongBao: kq.thongBao, gui: JSON.parse(kq.res.request().postData() || '{}') };
}

/** Vai tỉnh: mở màn, chọn điểm bán seed qua drawer 3 cột (tỉnh → xã → điểm bán Pos mini). */
async function moDanhSachTinh(page) {
	const { tenShop, tenXa, shopId } = duLieu();
	await moTrang(page, `${BASE()}${ROUTE}`, 'province');
	await khung(page).locator('.ant-select').filter({ hasText: 'Chọn điểm bán' }).click();
	const dr = page.locator('.ant-drawer-open').last();
	const cot = (i) => dr.locator('.sp-column').nth(i);
	await cot(1).getByText(tenXa, { exact: true }).click();
	await cot(2).getByText(tenShop, { exact: true }).click();
	const cho = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/production') && r.url().includes(`shopId=${shopId}`) && r.request().method() === 'GET', { timeout: 30_000 });
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	const res = await cho;
	expect(res.status(), 'Vai tỉnh đọc danh sách phiếu sản xuất lỗi').toBe(200);
	await expect(khung(page).locator('.ant-table-tbody')).toBeVisible();
	return res.json();
}

const dongPhieu = (page, code) => khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: code }).first();

/** Chi tiết phiếu qua API bằng header của phiên. */
async function chiTiet(page, st, id) {
	return (await k.goiApi(page, st, `/production/${id}`)).data;
}

module.exports = { duLieu, moForm, chonThanhPham, oSoLuong, datSoLuong, dongNguyenLieu, luu, lapPhieuNhap, moDanhSachTinh, dongPhieu, chiTiet, chuan, khung, GHI_CHU, ROUTE };
