'use strict';

/**
 * Helper 13_3 — phiếu đặt hàng NCC (PO) bằng vai `tct`, mặc định đặt về KHO TCT (user cho phép 24/09/2026).
 * 🔴 Đo 24/09: TCT đặt về kho HUB tỉnh (`khoTct:false`) thì BE hạ "Gửi NCC" thành Bản nháp + xoá shopId.
 * Nguồn (vnpost-web — xem fe-moc.json): `features/purchaseOrder/pages/{PurchaseOrderListPage,
 * PurchaseOrderFormPage,PurchaseOrderDetailPage}.jsx`.
 * Seed: NCC `AUTO<N>_NCC` · hợp đồng `AUTO<N>_HD` · bảng giá mua 60.000 đ (đã gồm VAT 8%) cho mọi SKU seed.
 * 🔴 PO KHÔNG xoá được ⇒ phiếu ghi chú `AUTO TEST 13_3` ở lại.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');

const BASE = () => process.env.VNPOST_BASE_URL;
const chuan = dx.chuan;
const khung = (page) => page.locator('.ant-pro-page-container').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const GHI_CHU = 'AUTO TEST 13_3';
const d = () => seed.doc().duLieu;
const TINH = () => d().toChuc?.tenTinh || process.env.VNPOST_SCOPE_LABEL_PROVINCE;
const HUB = () => d().hubTinh.tenShop;
const NCC = () => d().nhaCungCap.tenNcc;
const HD = () => d().sanPhamNcc.soHopDong;
const SP = () => d().sanPham.sanPhamTheoGiaVon.tieuChuan;
const fi = (page, nhan) => page.locator('.ant-form-item').filter({ hasText: nhan }).first();
const moSelect = (page) => page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');

async function moDs(page, vai = 'tct') {
	// 🔴 Màn còn gọi list `size=1&status=PENDING` để đếm phiếu chờ duyệt — bỏ response đó.
	const cho = page.waitForResponse((r) => /\/purchase-orders\?/.test(r.url()) && new URL(r.url()).searchParams.get('size') !== '1', { timeout: 60_000 }).catch(() => null);
	await moTrang(page, `${BASE()}/inventory/purchase-order`, vai);
	const res = await cho;
	await expect(khung(page).locator('#keyword')).toBeVisible({ timeout: 30_000 });
	return res ? res.json().catch(() => null) : null;
}

async function tim(page, tuKhoa) {
	await khung(page).locator('#keyword').fill(tuKhoa);
	const cho = page.waitForResponse((r) => /\/purchase-orders\?/.test(r.url()) && new URL(r.url()).searchParams.get('size') !== '1', { timeout: 20_000 });
	await khung(page).getByRole('button', { name: 'Tìm kiếm' }).click();
	const res = await cho;
	await page.waitForTimeout(800);
	return { url: new URL(res.url()), body: await res.json() };
}

/** Chọn kho trong hộp cây: tỉnh làn → mục `ten` ở cột cuối. */
async function chonKho(page, nhan, ten = HUB(), tinh = TINH()) {
	await fi(page, nhan).locator('.ant-select').click();
	const hop = page.getByRole('dialog').filter({ has: page.locator('.sp-column') }).last();
	await expect(hop).toBeVisible();
	await hop.locator('.sp-column').first().getByPlaceholder('Tìm kiếm').fill(tinh);
	const oTinh = hop.locator('.sp-column').first().getByText(tinh, { exact: true });
	await oTinh.click();
	const muc = ten ? hop.locator('.sp-column').last().locator('.sp-item').filter({ hasText: ten }).first() : hop.locator('.sp-column').last().locator('.sp-item').first();
	// 🔴 Vai TỈNH: hộp mở ra đã tích sẵn tỉnh của mình nhưng CHƯA nạp kho (cột kho "Không có dữ liệu", đo
	//    24/09/2026) ⇒ cú bấm trên là BỎ chọn. Kho chưa hiện thì bấm lại để chọn — lúc đó mới gọi API kho.
	if (!(await muc.waitFor({ timeout: 5_000 }).then(() => true).catch(() => false))) await oTinh.click();
	if (!ten) ten = (await muc.innerText()).trim();
	await muc.click();
	await hop.locator('button.ant-btn-primary').filter({ hasText: 'Xác nhận' }).click();
	await expect(fi(page, nhan)).toContainText(ten);
	// 🔴 Hộp đóng xong trả focus về ô kho (bất đồng bộ) ⇒ dropdown mở ngay sau đó bị đóng mất. Chờ đóng hẳn.
	await expect(hop).toBeHidden();
	await page.waitForTimeout(800);
	await page.locator('body').click({ position: { x: 5, y: 300 } });
	return ten;
}

/** Chọn option của Select antd theo `title`, thử lại vì option mới mở còn chạy hiệu ứng (click trượt, Enter lúc ăn lúc không). */
async function chonOption(page, o, ten, goTim = true) {
	for (let lan = 0; lan < 3; lan++) {
		await o.locator('.ant-select').click();
		if (goTim) {
			// SelectSupplier gọi API tìm theo từng phím ⇒ chờ response của từ khoá đầy đủ, danh sách mới hết dựng lại.
			const cho = page.waitForResponse((r) => /supplier/i.test(r.url()) && r.url().includes(encodeURIComponent(ten)), { timeout: 15_000 }).catch(() => null);
			await page.keyboard.type(ten);
			await cho;
		}
		const m = page.locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${ten}"]`).first();
		await m.waitFor({ timeout: 15_000 });
		await page.waitForTimeout(400);
		await m.click({ force: true });
		if (await expect(o).toContainText(ten, { timeout: 3_000 }).then(() => true).catch(() => false)) return;
		await page.keyboard.press('Escape');
	}
	await expect(o, `Không chọn được "${ten}"`).toContainText(ten);
}

async function chonNcc(page, ten = NCC(), hd = HD()) {
	await chonOption(page, fi(page, 'Nhà cung cấp'), ten);
	await expect(fi(page, 'Hợp đồng NCC').locator('.ant-select')).not.toHaveClass(/ant-select-disabled/);
	await chonOption(page, fi(page, 'Hợp đồng NCC'), hd, false);
}

async function chonNgay(page) {
	await fi(page, 'Ngày nhập dự kiến').locator('input').click();
	await page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) td.ant-picker-cell-today').first().click();
}

const bangSp = (page) => page.locator('.ant-pro-card').filter({ hasText: 'Danh sách sản phẩm' }).locator('.ant-table').first();

async function themSp(page, ten = SP().tenSanPham, sl = 1) {
	const o = page.locator('.ant-pro-card').filter({ hasText: 'Danh sách sản phẩm' }).getByPlaceholder('Tìm kiếm sản phẩm');
	await o.click();
	await o.fill(ten);
	await page.getByText(ten, { exact: true }).last().click();
	const r = bangSp(page).locator('tbody tr.ant-table-row').filter({ hasText: ten }).last();
	await expect(r, `Không thêm được ${ten} vào PO`).toBeVisible({ timeout: 20_000 });
	if (sl !== 1) {
		const so = r.locator('.ant-input-number-input').first();
		await so.fill(String(sl));
		await so.press('Tab');
	}
	return r;
}

/** Mở form tạo và điền đủ trường (kho HUB làn · NCC · hợp đồng · ngày · ghi chú · 1 SP). */
/** `khoTct: true` ⇒ đặt về kho của Tổng công ty (mục đầu cột kho khi chọn "Tổng công ty"). */
async function moTaoDayDu(page, { sl = 1, ghiChu = GHI_CHU, khoTct = true } = {}) {
	await moTrang(page, `${BASE()}/inventory/purchase-order/create`, 'tct');
	await expect(fi(page, 'Kho đặt hàng')).toBeVisible({ timeout: 30_000 });
	const kho = khoTct ? await chonKho(page, 'Kho đặt hàng', null, 'Tổng công ty') : await chonKho(page, 'Kho đặt hàng');
	await expect(fi(page, 'Kho nhận hàng')).toContainText(kho);
	await chonNcc(page);
	await chonNgay(page);
	await fi(page, 'Ghi chú').locator('textarea').fill(ghiChu);
	await themSp(page, SP().tenSanPham, sl);
}

/** Bấm nút footer form PO (`Lưu nháp` · `Lưu` · `Gửi nhà cung cấp`); trả { tb, body, ma, id }. */
async function luu(page, nhan) {
	const cho = page.waitForResponse((r) => /\/purchase-orders(\/\d+)?$/.test(new URL(r.url()).pathname) && ['POST', 'PUT'].includes(r.request().method()), { timeout: 30_000 }).catch(() => null);
	const nut = page.locator('.ant-pro-footer-bar button').filter({ hasText: new RegExp(`^${nhan}$`) });
	const tb = await dx.thongBaoQuanh(page, async () => {
		await nut.click();
		if (nhan === 'Gửi nhà cung cấp') await page.locator('.ant-popover:visible .ant-btn-primary').filter({ hasText: 'Xác nhận' }).click();
	});
	const res = await cho;
	const body = res ? await res.json().catch(() => null) : null;
	return { tb, body, ma: body?.data?.code, id: body?.data?.id };
}

/** Tạo 1 PO đủ trường rồi bấm `nhan`; trả { ma, id, tb }. */
async function taoPO(page, nhan = 'Lưu nháp', opt = {}) {
	await moTaoDayDu(page, opt);
	const kq = await luu(page, nhan);
	expect(kq.tb, `Tạo PO (${nhan}) không thành công`).toContain('Tạo phiếu đặt hàng thành công');
	expect(kq.ma, 'Response tạo PO không trả mã phiếu').toMatch(/^PO/);
	return kq;
}

async function moChiTiet(page, ma, vai = 'tct') {
	await moDs(page, vai);
	await tim(page, ma);
	const r = dong(page).filter({ hasText: ma }).first();
	await expect(r, `Không thấy PO ${ma}`).toBeVisible({ timeout: 20_000 });
	await r.locator('td').nth(1).click();
	await expect(page).toHaveURL(/purchase-order\/\d+/, { timeout: 20_000 });
	await expect(page.getByText('Danh sách sản phẩm').first()).toBeVisible({ timeout: 30_000 });
}

async function trangThai(page, ma, vai = 'tct') {
	await moDs(page, vai);
	await tim(page, ma);
	const r = dong(page).filter({ hasText: ma }).first();
	if (!(await r.count())) return null;
	return chuan(await r.locator('.ant-tag').last().innerText());
}

const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dmy = (dt) => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;

/** Ở chi tiết PO "Đã gửi NCC": bấm "NCC xác nhận", chọn ngày giao, (tuỳ chọn) sửa SL xác nhận. Trả { tb, gui }. */
async function nccXacNhan(page, slXacNhan) {
	await page.getByRole('button', { name: 'NCC xác nhận' }).click();
	const m = page.getByRole('dialog').filter({ hasText: 'NCC xác nhận số lượng' }).last();
	await expect(m).toBeVisible();
	await m.locator('.ant-picker input').first().click();
	await page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) td.ant-picker-cell-today').first().click();
	if (slXacNhan !== undefined) {
		const o = m.locator('.ant-input-number-input').first();
		await o.fill(String(slXacNhan));
		await o.press('Tab');
	}
	const cho = page.waitForRequest((r) => /purchase-orders\/\d+\/confirm/.test(r.url()), { timeout: 20_000 }).catch(() => null);
	const tb = await dx.thongBaoQuanh(page, () => m.locator('.ant-btn-primary').last().click());
	const rq = await cho;
	return { tb, gui: rq ? JSON.parse(rq.postData() || '{}') : null };
}

/** Nút "Nhập kho" ở chi tiết PO (tên truy cập kèm icon ⇒ khớp đuôi). */
const po_nutNhapKho = (page) => page.getByRole('button', { name: /(^| )Nhập kho$/ }).first();

/**
 * Ở chi tiết PO "NCC xác nhận": bấm "Nhập kho" → drawer "Phiếu nhập kho" → nhập lô mọi dòng → Nhập kho.
 * `sl` (tuỳ chọn) = SL nhập kho dòng đầu; nhập thiếu thì `thieu`: 'desau' (giữ giao một phần) | 'giaosau' (tạo đơn giao sau).
 * Trả { tb, body, dr }.
 */
async function nhapKho(page, { sl, thieu = 'desau' } = {}) {
	await po_nutNhapKho(page).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Phiếu nhập kho' }).last();
	await expect(dr.locator('tr[data-row-key]').first()).toBeVisible({ timeout: 20_000 });
	const dongs = dr.locator('tr[data-row-key]');
	const n = await dongs.count();
	const hom = new Date();
	const hsd = new Date(hom.getTime() + 365 * 86400_000);
	for (let i = 0; i < n; i++) {
		const r = dongs.nth(i);
		if (i === 0 && sl !== undefined) {
			const o = r.locator('.ant-input-number-input').first();
			await o.fill(String(sl));
			await o.press('Tab');
		}
		await k.nhapLo(page, r, [{ nsx: dmy(hom), hsd: dmy(hsd) }]);
	}
	const cho = page.waitForResponse((r) => /import|stock/.test(r.url()) && r.request().method() === 'POST', { timeout: 60_000 }).catch(() => null);
	const tb = await dx.thongBaoQuanh(page, async () => {
		await dr.locator('button').filter({ hasText: /^\s*Nhập kho\s*$/ }).last().click();
		// Nhập ít hơn SL NCC xác nhận ⇒ drawer hỏi cách xử lý phần thiếu.
		const thieuDr = page.locator('.ant-drawer-open').filter({ hasText: 'Nhập kho thiếu so với số đã xác nhận' }).last();
		if (await thieuDr.waitFor({ timeout: 4_000 }).then(() => true).catch(() => false)) {
			await thieuDr.locator('button').filter({ hasText: thieu === 'giaosau' ? 'Tạo đơn giao sau' : 'Để sau' }).click();
		}
	}, 30_000);
	const res = await cho;
	return { tb, body: res ? await res.json().catch(() => null) : null, dr };
}

/**
 * CTKM NCC tiền đề cho 030_022: phạm vi SP `AUTO<N>_SKU_DD` — giảm `giam`/SP + mua `mua` tặng `tang`.
 * Tạo (nếu chưa có) + kích hoạt bằng API (`supplierPromotionApi.js`); trả { id, ten, dong() } — `dong()` NGỪNG CTKM.
 * 🔴 CTKM tự áp vào mọi PO của NCC ⇒ chỉ đặt phạm vi SKU đích danh, và luôn gọi `dong()` trong finally.
 */
async function dungCtkm(browser, { giam = 5000, mua = 2, tang = 1 } = {}) {
	const p = await k.moPhienPhu(browser, 'tct', '/supplier/promotions');
	const sku = d().sanPham.sanPhamTheoGiaVon.dichDanh.sku;
	const ten = `${d().nhaCungCap.tenNcc}_CTKM_13_3`;
	const supplierId = d().sanPhamNcc.supplierId;
	const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);
	let km = ds((await k.goiGhi(p.page, p.st, 'GET', '/supplier-promotions', { keyword: ten, page: 0, size: 50 })).data).find((x) => x.name === ten);
	if (!km) {
		const hom = new Date();
		const den = new Date(hom.getTime() + 30 * 86400_000);
		const f = (t, gio) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${gio}`;
		const r = await k.goiGhi(p.page, p.st, 'POST', '/supplier-promotions', {}, {
			name: ten, supplierId, startDate: f(hom, '00:00:00'), endDate: f(den, '23:59:59'),
			minOrderAmount: null, minOrderQuantity: null, note: 'AUTO TEST 13_3',
			items: [
				{ rewardType: 'AMOUNT_PRODUCT', scope: 'PRODUCT', sku, tierMinQty: 1, discountAmount: giam, giftSku: sku },
				{ rewardType: 'BUY_X_GET_Y', scope: 'PRODUCT', sku, tierMinQty: mua, buyQuantity: mua, giftSku: sku, giftQuantity: tang },
			],
		});
		expect(String(r?.status?.code), `Tạo CTKM NCC lỗi: ${r?.status?.message}`).toBe('200');
		km = ds((await k.goiGhi(p.page, p.st, 'GET', '/supplier-promotions', { keyword: ten, page: 0, size: 50 })).data).find((x) => x.name === ten);
	}
	expect(km, `Không thấy CTKM "${ten}"`).toBeTruthy();
	if (km.status !== 'ACTIVE') {
		const r = await k.goiGhi(p.page, p.st, 'POST', `/supplier-promotions/${km.id}/activate`);
		expect(String(r?.status?.code), `Kích hoạt CTKM lỗi: ${r?.status?.message}`).toBe('200');
	}
	return {
		id: km.id, ten, sku,
		dong: async () => { try { await k.goiGhi(p.page, p.st, 'POST', `/supplier-promotions/${km.id}/deactivate`); } finally { await p.dong(); } },
	};
}

module.exports = { chonOption, dungCtkm, nccXacNhan, nhapKho, dmy, po_nutNhapKho, BASE, chuan, khung, dong, GHI_CHU, TINH, HUB, NCC, HD, SP, fi, moSelect, moDs, tim, chonKho, chonNcc, chonNgay, bangSp, themSp, moTaoDayDu, luu, taoPO, moChiTiet, trangThai };
