'use strict';

/**
 * Helper nhóm **xuất trả nhà cung cấp** (phân hệ 14_1 lập phiếu · 14_2 gom/tách).
 *
 * Trace 20/09/2026:
 *
 * | Thứ | Giá trị |
 * |---|---|
 * | Route danh sách | `/inventory/stock-return-request` — tiêu đề *Xuất trả nhà cung cấp* |
 * | Route tạo phiếu | `/inventory/stock-return-request/create` — *Tạo phiếu xuất trả nhà cung cấp* |
 * | API danh sách | `GET /stock/v2/stock-return-request` |
 *
 * 🔴 Nút trên màn **đổi theo vai**: `shop` thấy **"Tạo phiếu trả"**; `province` thấy
 * **"Gom phiếu (N)"** kèm cột ô chọn. Đo trực tiếp, 🚫 đừng giả định vai nào cũng như nhau.
 *
 * 🔴 Form tạo phiếu có hai nguồn hàng: **"Theo phiếu nhập kho"** (mặc định) và
 * **"Theo SKU / Mã lô / Serial"**.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE = '/inventory/stock-return-request';
const ROUTE_TAO = '/inventory/stock-return-request/create';
const API = '/stock/v2/stock-return-request';

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const cot = (page) => khung(page).locator('.ant-table-thead th');

async function moDanhSach(page, vai) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API) && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, ROUTE, vai);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

/** Mở form tạo phiếu trả (chỉ vai điểm bán có nút này). */
async function moFormTao(page) {
	const nut = khung(page).getByRole('button', { name: 'Tạo phiếu trả' }).first();
	if ((await nut.count()) === 0) return null;
	await nut.click({ force: true });
	await page.waitForTimeout(5_000);
	return khung(page);
}

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/stock|return|invoice/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}


// ───────── Form tạo phiếu (StockReturnRequestFormPage.jsx) — đo DOM 24/09/2026 ─────────
const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');

const O_PHIEU = 'Nhập mã phiếu nhập/chuyển kho';
const O_LO = 'Nhập mã lô rồi tìm để thêm sản phẩm của lô';
const O_SERIAL = 'Quét/nhập serial rồi tìm để thêm sản phẩm';
const hang = (box) => box.locator('.ant-table-tbody tr.ant-table-row');
const fItem = (box, nhan) => box.locator('.ant-form-item').filter({ hasText: nhan }).first();
const thongBao = dx.thongBaoQuanh;

/** Chỉ POST/PUT vào luồng phiếu trả (để assert "không phát sinh POST"). */
function ghiPhieuTra(page) {
	const ds = [];
	page.on('request', (r) => {
		if (r.method() !== 'GET' && r.url().includes(API)) ds.push(`${r.method()} ${r.url()}`);
	});
	return ds;
}

/** Tra mã phiếu nhập; trả thông báo hiện ra (nếu có). */
async function traPhieuNhap(page, box, ma) {
	await box.getByPlaceholder(O_PHIEU).fill(ma);
	return thongBao(page, async () => {
		const cho = page.waitForResponse((r) => r.url().includes('/import-export/detail'), { timeout: 30_000 }).catch(() => null);
		await fItem(box, 'Mã phiếu nhập / chuyển kho').getByRole('button', { name: 'Tìm' }).click();
		await cho;
		await page.waitForTimeout(2_500);
	}, 6_000);
}

async function doiNguonSku(page, box) {
	await box.getByText('Theo SKU / Mã lô / Serial', { exact: true }).click();
	await expect(box.getByPlaceholder(O_LO)).toBeVisible();
}

async function traLo(page, box, ma) {
	await box.getByPlaceholder(O_LO).fill(ma);
	return thongBao(page, async () => {
		await fItem(box, 'Mã lô hàng').getByRole('button', { name: 'Tìm' }).click();
		await page.waitForTimeout(3_000);
	}, 8_000);
}

async function traSerial(page, box, s) {
	await box.getByPlaceholder(O_SERIAL).fill(s);
	return thongBao(page, async () => {
		await fItem(box, 'Nhập / quét serial').getByRole('button', { name: 'Tìm' }).click();
		await page.waitForTimeout(3_000);
	}, 8_000);
}

/** Thêm SP qua ô "Thêm sản phẩm theo SKU" (dropdown là div thường, 🚫 không phải .ant-select-dropdown). */
async function themSku(page, box, ten) {
	const o = fItem(box, 'Thêm sản phẩm theo SKU');
	const cho = page.waitForResponse((r) => /variants|product/i.test(r.url()) && r.url().includes(encodeURIComponent(ten)), { timeout: 20_000 }).catch(() => null);
	await o.getByPlaceholder('Tìm sản phẩm').fill(ten);
	await cho;
	const muc = o.locator('div.absolute').getByText(ten, { exact: true }).first();
	await expect(muc, `Ô tìm SKU không ra ${ten}`).toBeVisible({ timeout: 15_000 });
	const truoc = await hang(box).count();
	await muc.click();
	await expect.poll(() => hang(box).count(), { timeout: 20_000 }).toBeGreaterThan(truoc);
	await page.locator('.ant-page-header-heading-title').first().click();
	return hang(box).filter({ hasText: ten }).last();
}

async function chonLyDo(page, box, ten) {
	await fItem(box, 'Lý do trả hàng').locator('.ant-select').click();
	await page.locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${ten}"]`).click();
	await expect(fItem(box, 'Lý do trả hàng')).toContainText(ten);
}

/** Ô SL trả (InputNumber) của một dòng — nhập rồi blur để antd áp min/max. */
async function nhapSl(dong, sl) {
	const o = dong.locator('.ant-input-number-input').first(); // cột SL trả là ô số đầu tiên (tab SKU không có cột "SL phiếu")
	await o.fill(String(sl));
	await o.press('Tab');
	return o;
}

const nutFooter = (page, nhan) => page.locator('.ant-pro-footer-bar button').filter({ hasText: nhan });

/** Bấm nút footer, gom thông báo message. */
async function bam(page, nhan) {
	return thongBao(page, () => nutFooter(page, nhan).click(), 6_000);
}

/** Mã lô còn tồn của một SP ở điểm bán (API batch-product). */
async function loCon(page, st, shopId, productId, variantId) {
	const b = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, productId, variantId, size: 500 });
	return (b.data || []).filter((l) => Number(l.remainQuantity) > 0 && !l.deleted);
}

/** Phiếu tồn đầu kỳ đã chốt của điểm bán seed (nhiều SP, mỗi SP 1 lô) — nguồn chuẩn cho tab "Theo phiếu nhập kho". */
async function phieuDauKy(page, st, shopId) {
	const r = await k.goiApi(page, st, '/stock/v2/import-export/find', {
		fromDate: Date.now() - 180 * 86400_000, toDate: Date.now() + 86400_000, page: 0, size: 100, shopId, type: 'IMPORT',
	});
	const p = (r.data || []).find((x) => x.subType === 'OPENING_BALANCE' && x.status === 'CHECKOUT');
	expect(p, 'Điểm bán seed chưa có phiếu tồn đầu kỳ đã chốt').toBeTruthy();
	return (await k.goiApi(page, st, '/stock/v2/import-export/detail', { shopId, code: p.code, fetchItems: true })).data;
}

/** Dọn phiếu trả do test tạo: điểm bán huỷ (`/cancel`). */
async function huyPhieu(page, st, id) {
	if (!id) return;
	await k.goiGhi(page, st, 'POST', `${API}/${id}/cancel`, {}, {});
}


const dmyNgay = (dt) => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;

/**
 * Tạo + chốt 1 phiếu nhập kho ở điểm bán seed: SP giá tiêu chuẩn, `lo.length` lô mới mỗi lô `sl`.
 * 🔴 Ở cấp điểm bán chỉ SP `STANDARD` nhập tay được (SP khác không có bảng giá, ô SL bị khoá).
 * Vai `seed_gdv` — Cửa hàng trưởng bị tắt CREATE_IMPORT_STOCK. Trả { code, stockInOutId, lo: [mã] }.
 */
async function phieuNhapNhieuLo(browser, { soLo = 2, sl = 10 } = {}) {
	const { storageStateFor } = require('../../shared/auth/accounts');
	const ctx = await browser.newContext({ storageState: storageStateFor('seed_gdv'), viewport: { width: 1440, height: 1000 } });
	const page = await ctx.newPage();
	try {
		const tc = seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan;
		const dr = await k.moFormNhap(page, 'seed_gdv');
		const { dong: d } = await k.themSanPham(page, dr, tc.tenSanPham);
		await d.locator('input[role="spinbutton"]').first().fill(String(soLo * sl));
		const goc = `A${process.env.VNPOST_LANE || ''}R${Date.now().toString().slice(-6)}`;
		const hom = new Date();
		const hsd = new Date(hom.getTime() + 365 * 86400_000);
		const lo = Array.from({ length: soLo }, (_, i) => ({ ma: `${goc}${i + 1}`, sl, nsx: dmyNgay(hom), hsd: dmyNgay(hsd) }));
		await k.nhapLo(page, d, lo);
		const choDuyet = page.waitForResponse((x) => x.url().includes('/import-export/confirm'), { timeout: 60_000 });
		const { body } = await k.bamVaCho(page, dr.getByRole('button', { name: /^Nhập kho$/ }).last(), '/stock/v3/import-export?');
		expect(String(body?.status?.code), `Tạo phiếu nhập lỗi: ${body?.status?.message}`).toBe('200');
		const duyet = await (await choDuyet).json();
		expect(String(duyet?.status?.code), `Duyệt phiếu nhập lỗi: ${duyet?.status?.message}`).toBe('200');
		return { code: body.data.code, stockInOutId: body.data.stockInOutId, lo: lo.map((x) => x.ma), sl, tc };
	} finally {
		await ctx.close();
	}
}

/**
 * Tạo phiếu trả bằng API (payload đối chiếu request thật của form, 24/09/2026) — tiền đề nhanh cho nhóm 020–050.
 * `page/st` phải là phiên ĐIỂM BÁN. Mỗi dòng = 1 SP của phiếu tồn đầu kỳ (FIFO, BT-1, BT-2, TC…) × `sl`, lô duy nhất của SP đó.
 * Trả { id, code, body }.
 */
async function taoPhieuApi(page, st, { sl = 1, draft = false, soDong = 1, note = 'Hàng bán chậm', items } = {}) {
	const shopId = seed.doc().duLieu.diemBan.shopId;
	if (!items) items = await dongDauKy(page, st, { sl, soDong });
	const body = await k.goiGhi(page, st, 'POST', API, {}, { shopId, sourceType: 'BY_SKU', note, items, draft });
	expect(String(body?.status?.code), `Tạo phiếu trả bằng API lỗi: ${body?.status?.message}`).toBe('200');
	return { id: body.data.id, code: body.data.code, body };
}

/** Dòng payload phiếu trả từ phiếu tồn đầu kỳ (mỗi SP 1 lô) — cùng khuôn request thật của form. */
async function dongDauKy(page, st, { sl = 1, soDong = 1 } = {}) {
	const shopId = seed.doc().duLieu.diemBan.shopId;
	{
		const dk = await phieuDauKy(page, st, shopId);
		return dk.items.slice(0, soDong).map((it) => {
			const b = (it.batchProducts || [])[0] || {};
			return {
				productId: it.productId, variantId: it.variantId, productName: it.productName, variantName: it.variantName,
				productSku: it.sku, unitId: b.productUnitId ?? it.productUnitId, unitName: 'Cái', convertToMainUnit: 1,
				quantity: sl, batchCode: b.batchCode, batchProductId: b.batchProductId, sourceShopId: shopId,
			};
		});
	}
}

/** Thông báo BE bỏ đuôi mã request " (AbCdEf)". */
const msg = (b) => chuan(b?.status?.message).replace(/\s*\([A-Za-z0-9]{6}\)$/, '');

/** Chi tiết phiếu trả bằng phiên bất kỳ. */
async function chiTietPhieu(page, st, id) {
	return (await k.goiApi(page, st, `${API}/${id}`)).data;
}

/**
 * Gọi `/approve` bằng phiên phụ của `vai` (ward | province | tct | shop). `sl`: số hoặc hàm (item) → SL duyệt.
 * Trả body (🚫 không tự assert — case kiểm lỗi cần đọc thông báo).
 */
/**
 * 🔴 Phiên CHÍNH của spec (vai đang mở giao diện). Mở phiên phụ CÙNG tài khoản là xoay mất refresh token của
 *    phiên chính ⇒ request sau đó trả SSHOP-405 "Mã truy cập hết hạn" / bị đá về màn đăng nhập. Đặt trong beforeEach.
 */
const phienChinh = { vai: null, page: null, st: null };
function datPhienChinh(vai, page, st) {
	Object.assign(phienChinh, { vai, page, st });
}
/** Phiên phụ đang mở sẵn theo vai (spec tự quản đóng) — `goiDuyet` dùng lại thay vì đăng nhập thêm (xoay token). */
const phienSan = {};
function datPhienSan(vai, p) {
	if (p) phienSan[vai] = p;
	else delete phienSan[vai];
}

async function goiDuyet(browser, vai, id, { approved = true, sl, description, extra = {} } = {}) {
	const p = phienChinh.vai === vai ? { ...phienChinh, dong: async () => {} } : phienSan[vai] ? { ...phienSan[vai], dong: async () => {} } : await k.moPhienPhu(browser, vai, ROUTE);
	try {
		let items;
		if (approved) {
			const ct = await chiTietPhieu(p.page, p.st, id).catch(() => null);
			items = (ct?.items || []).map((it) => ({
				itemId: it.id,
				approvedQuantity: sl === undefined ? Number(it.quantity) : typeof sl === 'function' ? sl(it) : sl,
			}));
		}
		return await k.goiGhi(p.page, p.st, 'POST', `${API}/${id}/approve`, {}, { approved, items, description, ...extra });
	} finally {
		await p.dong();
	}
}

/** Duyệt đủ SL, assert 200. */
async function duyetDu(browser, vai, id) {
	const b = await goiDuyet(browser, vai, id);
	expect(String(b?.status?.code), `${vai} duyệt phiếu ${id} lỗi: ${b?.status?.message}`).toBe('200');
	return b;
}

/**
 * Dọn phiếu do test tạo. Nháp/Chờ duyệt ⇒ điểm bán huỷ; Xã đã duyệt ⇒ tỉnh từ chối.
 * 🔴 Đo 24/09: phiếu APPROVED KHÔNG dọn được — BE chặn từ chối, `/cancel` không hoàn kho ⇒ để nguyên, ghi chú.
 * `ps` = phiên điểm bán { page, st }.
 */
async function donPhieu(browser, ps, id) {
	if (!id) return;
	const { test } = require('@playwright/test');
	const ct = await chiTietPhieu(ps.page, ps.st, id).catch(() => null);
	const s = ct?.request?.status;
	let x;
	if (['DRAFT', 'PENDING'].includes(s)) x = await k.goiGhi(ps.page, ps.st, 'POST', `${API}/${id}/cancel`, {}, {});
	else if (s === 'WARD_APPROVED') x = await goiDuyet(browser, 'province', id, { approved: false, description: 'AUTO TEST 14_1 dọn phiếu' });
	else return;
	if (String(x?.status?.code) !== '200') {
		test.info().annotations.push({ type: 'không dọn được', description: `Phiếu trả ${ct.request.code} (${s}): ${x?.status?.message}` });
	}
}

// ───────── Danh sách (StockReturnRequestListPage.jsx) ─────────
/** Lọc danh sách theo mã phiếu; trả URL request GET đã gửi. */
async function timMa(page, ma) {
	await khung(page).getByPlaceholder('Tìm theo mã phiếu').fill(ma);
	return bamTimKiem(page);
}

async function bamTimKiem(page) {
	// 🔴 Danh sách là RTK Query: bấm Tìm với ĐÚNG bộ lọc đang có thì dùng cache, KHÔNG gửi request ⇒ trả null.
	const cho = page.waitForResponse((x) => x.url().includes(API) && x.request().method() === 'GET' && /page=/.test(x.url()), { timeout: 8_000 }).catch(() => null);
	await khung(page).getByRole('button', { name: 'Tìm kiếm' }).click();
	const res = await cho;
	await page.waitForTimeout(1_000);
	return res ? { url: new URL(res.url()), body: await res.json() } : { url: null, body: null };
}

/** Rê chuột vào nút "Xử lý" của dòng ⇒ trả [{ nhan, nguyHiem }] các mục menu. */
async function menuXuLy(page, row) {
	const nut = row.getByRole('button', { name: 'Xử lý' });
	if (!(await nut.count())) return null;
	await nut.hover();
	const m = page.locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu').last();
	await expect(m).toBeVisible();
	const it = m.locator('.ant-dropdown-menu-item');
	const kq = [];
	for (let i = 0; i < (await it.count()); i++) {
		kq.push({ nhan: chuan(await it.nth(i).innerText()), nguyHiem: /danger/.test((await it.nth(i).getAttribute('class')) || '') });
	}
	return kq;
}

async function bamMenu(page, row, nhan) {
	await menuXuLy(page, row);
	await page.locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item').filter({ hasText: nhan }).last().click();
}

/** Điều hướng trong app (🚫 page.goto làm mất token RAM) — đẩy history cho react-router. */
async function diToi(page, url) {
	await page.evaluate((u) => {
		window.history.pushState({}, '', u);
		window.dispatchEvent(new PopStateEvent('popstate'));
	}, url);
}

/** Mở drawer chi tiết của dòng. */
async function moChiTiet(page, row) {
	await row.getByRole('button', { name: 'Chi tiết' }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu xuất trả NCC' }).last();
	await expect(dr.locator('.ant-descriptions')).toBeVisible({ timeout: 20_000 });
	return dr;
}

/** Trạng thái từng mốc vòng đời trong drawer chi tiết: [{ ten, tt: finish|wait|error|process }]. */
async function vongDoi(dr) {
	return dr.locator('.rr-lifecycle-steps .ant-steps-item').evaluateAll((l) =>
		l.map((e) => ({
			ten: (e.querySelector('.ant-steps-item-title')?.textContent || '').normalize('NFC').trim(),
			tt: (e.className.match(/ant-steps-item-(finish|wait|error|process)/) || [])[1],
		})),
	);
}

/**
 * Nhập `sl` SP đích danh có serial (`AUTO<N>_SP_DD`) vào kho mặc định điểm bán seed bằng API (khuôn payload thật của
 * `DrawerImportReceipt.jsx`: POST /stock/v3/import-export → POST /stock/v3/import-export/confirm). Vai `seed_gdv`.
 * 🔴 Form nhập tay ở điểm bán khoá ô SL với SP không có bảng giá ⇒ đi API. Trả { lo, serials, productId, variantId }.
 */
async function nhapHangSerial(browser, { sl = 6 } = {}) {
	const p = await k.moPhienPhu(browser, 'seed_gdv', '/inventory/import');
	try {
		const d = seed.doc().duLieu;
		const ten = d.sanPham.sanPhamTheoGiaVon.dichDanh.tenSanPham;
		const shopId = d.diemBan.shopId;
		const ds = (await k.goiGhi(p.page, p.st, 'GET', '/chain/products/basic-search-product-unit', { productName: ten, page: 0, size: 20 })).data || [];
		const u = ds.find((x) => x.productName === ten && x.convertToMainUnit === 1);
		expect(u, `Không tìm thấy SP ${ten}`).toBeTruthy();
		expect(u.isSerialRequired, `${ten} không quản lý serial`).toBe(true);
		const kho = ((await k.goiGhi(p.page, p.st, 'GET', `/shops/${shopId}/inventory`)).data || []).find((x) => x.isDefault)?.id;
		const hau = Date.now().toString().slice(-6);
		const serials = Array.from({ length: sl }, (_, i) => `A${process.env.VNPOST_LANE || ''}SR${hau}${i}`);
		const lo = `A${process.env.VNPOST_LANE || ''}DD${hau}`;
		const hom = new Date();
		const f = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
		const gia = 60000;
		const tao = await k.goiGhi(p.page, p.st, 'POST', '/stock/v3/import-export', { shopId }, {
			code: `NK${hau}${sl}`, objectId: 0, objectType: 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0,
			note: 'AUTO TEST 14_1 hàng serial', actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: false,
			items: [{ amount: gia * sl, price: gia, productId: u.productId, productName: u.productName, batchCode: null,
				batchProducts: [{ batchCode: lo, quantity: sl, manufactureDate: f(hom), expiryDate: f(new Date(hom.getTime() + 365 * 86400_000)), serials }],
				quantity: sl, serials, totalAmount: gia * sl, unit: u.unit, variantId: u.variantId, variantName: u.variantName, itemId: null, shopId, inventoryId: kho, productUnit: u.unit, convertToMainUnit: 1, productUnitId: u.productUnitId }],
		});
		expect(String(tao?.status?.code), `Tạo phiếu nhập serial lỗi: ${tao?.status?.message}`).toBe('200');
		const xn = await k.goiGhi(p.page, p.st, 'POST', '/stock/v3/import-export/confirm', { shopId, stockInOutId: tao.data.stockInOutId });
		expect(String(xn?.status?.code), `Chốt phiếu nhập serial lỗi: ${xn?.status?.message}`).toBe('200');
		return { lo, serials, productId: u.productId, variantId: u.variantId, ten, stockInOutId: tao.data.stockInOutId };
	} finally {
		await p.dong();
	}
}

module.exports = { nhapHangSerial, datPhienChinh, datPhienSan, msg, dongDauKy, timMa, bamTimKiem, menuXuLy, bamMenu, diToi, moChiTiet, vongDoi, taoPhieuApi, chiTietPhieu, goiDuyet, duyetDu, donPhieu, phieuNhapNhieuLo, O_PHIEU, O_LO, O_SERIAL, hang, fItem, thongBao, ghiPhieuTra, traPhieuNhap, doiNguonSku, traLo, traSerial, themSku, chonLyDo, nhapSl, nutFooter, bam, loCon, phieuDauKy, huyPhieu, k, seed, API, ROUTE, ROUTE_TAO, chanGhi, chuan, cot, dong, khung, moDanhSach, moFormTao };
