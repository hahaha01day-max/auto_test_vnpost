'use strict';

/**
 * 18_1_040_016 — 🔴 Không trộn lô xả kho với lô thường trong cùng dòng hàng (vai `gdv`).
 *
 * Trace vnpost-web f9c5c858 (28/09/2026): `AddOrEditProductModal.jsx:824-839` `handleAddBatch` — lô mới có cờ
 * `clearanceLot` khác lô đã chọn ⇒ `message.error("Không thể chọn chung lô xả kho và lô thường trong cùng 1 dòng sản
 * phẩm. Vui lòng tách sản phẩm này thành 2 dòng riêng: …")` và KHÔNG thêm lô. BE chặn cả đơn bằng POD-0052.
 * Cờ `clearanceLot` = lô có dòng trong `SHOP_CLEARANCE_ITEM` (pod `ClearanceServiceImpl.getBatchCodeOfProduct`,
 * `StockV2Service:4937`), trả qua `GET /products/get-batch-active`.
 *
 * Tiền đề tự dựng (điểm bán seed có đúng 1 lô SP tiêu chuẩn, đo 28/09):
 *  1. phiên phụ `seed_gdv` nhập 2 cái SP TC với lô mới `A<làn>XK…` (`POST /stock/v3/import-export` + confirm — khuôn
 *     04_3_010_016). Tồn tăng 2, không dọn (nhập kho là chứng từ thật của làn).
 *  2. phiên phụ `shop` đẩy lô mới sang Hàng xả kho (`POST /stock/clearance-items`) — XOÁ ở `finally`
 *     (`DELETE /stock/clearance-items/{id}`, xoá mềm).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chon } = require('../../shared/db/otp');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const p = require('./pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, dongBill, sp } = p;
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const hau = () => Date.now().toString(36).slice(-5).toUpperCase();

const hop = (page) => page.getByRole('dialog').filter({ hasText: 'Chọn sản phẩm' }).last();
const hang = (m, nhan) => m.locator('tr').filter({ has: m.page().locator(`td:text-is("${nhan}")`) }).first();
const dongLo = (m) => m.locator('tr:not(:has(tr))').filter({ has: m.page().getByRole('button', { name: 'Xóa', exact: true }) });

test('18_1_040_016 — 🔴 Không trộn lô xả kho với lô thường trong cùng dòng hàng', async ({ page, browser }) => {
	const i = loadCaseInput(GOC, '18_1_040_016');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(300_000);
	const { sp: spSeed } = k.duLieuSeed();
	const tc = spSeed.tieuChuan;
	const [productId, productUnitId, variantId, unit, gia] = chon(`select product_id, product_unit_id, variant_id, unit, mac_price from CHAIN_PRODUCT_UNIT where sku='${tc.sku}' and convert_to_main_unit=1 and variant_id is not null limit 1`, 'VNPOST_CORE').split('\t');
	const loXk = `A${process.env.VNPOST_LANE || ''}XK${hau()}`;

	// 1. Nhập lô mới.
	const g = await k.moPhienPhu(browser, 'seed_gdv', '/inventory/import');
	let shopId;
	try {
		shopId = Number(g.st.h.shopid);
		const kho = (await k.goiGhi(g.page, g.st, 'GET', `/shops/${shopId}/inventory`))?.data;
		const ds = Array.isArray(kho) ? kho : kho?.content || [];
		const khoId = (ds.find((x) => x.isDefault || x.defaultInventory) || ds[0])?.id;
		const ngay = new Date().toISOString().slice(0, 10);
		const r = await k.goiGhi(g.page, g.st, 'POST', '/stock/v3/import-export', { shopId }, {
			code: `NK${hau()}XK`, objectId: 0, objectType: 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0,
			note: 'AUTO TEST 18_1_040_016 lô xả kho', actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: false,
			items: [{ amount: +gia, price: +gia, productId: +productId, productName: tc.tenSanPham, batchCode: null,
				batchProducts: [{ batchCode: loXk, quantity: 2, manufactureDate: ngay, expiryDate: '2028-12-31', serials: [] }],
				quantity: 2, serials: [], totalAmount: +gia * 2, unit, variantId: +variantId, variantName: null, itemId: null, shopId, inventoryId: khoId, productUnit: unit, convertToMainUnit: 1, productUnitId: +productUnitId }],
		});
		const id = r?.data?.stockInOutId ?? r?.stockInOutId;
		expect(id, `Tiền đề: nhập lô mới lỗi ${JSON.stringify(r?.status ?? r).slice(0, 300)}`).toBeTruthy();
		const xn = await k.goiGhi(g.page, g.st, 'POST', '/stock/v3/import-export/confirm', { shopId, stockInOutId: id });
		expect(String(xn?.status?.code), `Tiền đề: xác nhận phiếu nhập lỗi ${JSON.stringify(xn?.status)}`).toBe('200');
	} finally { await g.dong(); }

	// 2. Đẩy lô mới sang Hàng xả kho.
	const s = await k.moPhienPhu(browser, 'shop', '/inventory/clearance');
	let xkId = null;
	try {
		const r = await k.goiGhi(s.page, s.st, 'POST', '/stock/clearance-items', {}, {
			shopId, items: [{ productId: +productId, variantId: +variantId, productUnitId: +productUnitId, productName: tc.tenSanPham, variantSku: tc.sku,
				productUnitName: unit, batchCode: loXk, expiryDate: '2028-12-31', quantity: 2, currentStockSnapshot: 2, note: 'AUTO TEST 18_1_040_016' }],
		});
		expect(String(r?.status?.code), `Tiền đề: đẩy lô sang Hàng xả kho lỗi ${JSON.stringify(r?.status)}`).toBe('200');
		const ds = await k.goiGhi(s.page, s.st, 'GET', '/stock/clearance-items', { page: 0, size: 50, shopId, keyword: tc.sku });
		xkId = (ds?.data || []).find((x) => x.batchCode === loXk)?.id ?? null;
		ghiChu('tiền đề', `lô xả kho ${loXk} · clearance item #${xkId}`);

		// 3. POS: xác nhận có đủ hai loại lô.
		await p.moBan(page, test);
		const cho = page.waitForResponse((res) => /products\/get-batch-active/.test(res.url()), { timeout: 30_000 });
		await p.them(page, sp().tc);
		await page.mouse.move(600, 700);
		await dongBill(page).filter({ hasText: sp().tc }).first().getByText(sp().tc, { exact: true }).click();
		const m = hop(page);
		await expect(m).toBeVisible({ timeout: 15_000 });
		const o = hang(m, 'Số lượng').locator('input').first();
		await o.fill('2');
		await o.blur();
		const sw = hang(m, 'Chọn theo lô').getByRole('switch');
		await expect(sw, 'Không có công tắc "Chọn theo lô"').toBeVisible();
		if ((await sw.getAttribute('aria-checked')) !== 'true') await sw.click();
		const lo = ((await (await cho).json())?.data || []).filter((b) => Number(b.availableQuantity) > 0);
		const xk = lo.filter((b) => b.clearanceLot).map((b) => b.batchCode);
		const thuong = lo.filter((b) => !b.clearanceLot).map((b) => b.batchCode);
		ghiChu('lô khả dụng', `xả kho ${JSON.stringify(xk)} · thường ${JSON.stringify(thuong)}`);
		expect(xk, 'Tiền đề: POS không thấy lô xả kho vừa đẩy').toContain(loXk);
		expect(thuong.length, 'Tiền đề: không có lô thường').toBeGreaterThan(0);
		await page.waitForTimeout(1_500);

		// Bước 1: lô đang được phân bổ sẵn là một loại ⇒ thêm lô loại còn lại vào cùng dòng.
		const daChon = chuan(await dongLo(m).allInnerTexts().then((a) => a.join(' ')));
		const dangXk = daChon.includes(loXk);
		const loKia = dangXk ? thuong[0] : loXk;
		const them = m.locator('.ant-select').filter({ hasText: '+ Thêm lô' });
		await expect(them, 'Không có ô "+ Thêm lô" để phân bổ lô thứ hai').toBeVisible();
		await them.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: loKia }).first().click();
		await page.locator('.ant-message-notice').first().waitFor({ state: 'visible', timeout: 6_000 }).catch(() => null);
		const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
		const sau = chuan(await dongLo(m).allInnerTexts().then((a) => a.join(' ')));
		ghiChu('đo', `đang chọn "${daChon}" · thêm ${loKia} · thông báo "${tb}" · lô trên dòng sau đó "${sau}"`);
		// Kỳ vọng: hệ thống yêu cầu tách hai dòng; lô thứ hai KHÔNG vào cùng dòng.
		expect(tb, 'Không có thông báo yêu cầu tách dòng').toContain('Không thể chọn chung lô xả kho và lô thường trong cùng 1 dòng sản phẩm');
		expect(tb).toContain('tách sản phẩm này thành 2 dòng riêng');
		expect(sau.includes(loXk) && thuong.some((c) => sau.includes(c)), 'Lô xả kho và lô thường VẪN nằm chung một dòng').toBe(false);
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	} finally {
		if (xkId) ghiChu('dọn', JSON.stringify((await k.goiGhi(s.page, s.st, 'DELETE', `/stock/clearance-items/${xkId}`).catch((e) => ({ status: e.message })))?.status));
		await s.dong();
	}
});
