'use strict';

/**
 * 14_1_040_017 — vai `ward`: duyệt dòng hàng serial, bỏ 2/5 serial ⇒ SL duyệt tự thành 3 (bám số serial còn lại).
 * Nguồn: `ApproveModal.jsx` (cột "Serial duyệt", placeholder "Bỏ serial không duyệt"; SL = số serial còn chọn).
 * Tiền đề: điểm bán nhập lô serial `AUTO<N>_SP_DD` (API) rồi lập phiếu trả 5 serial (phiên phụ `shop`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const r = require('./return-page');

const GOC = path.join(__dirname, '..');

test('14_1_040_017 — Bỏ serial khi duyệt thì SL duyệt đổi theo', async ({ page, browser }) => {
	const ly = skipReason(loadCaseInput(GOC, '14_1_040_017'));
	test.skip(Boolean(ly), ly ?? '');
	test.setTimeout(300_000);
	const st = r.k.batHeader(page);
	await r.moDanhSach(page, 'ward');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	r.datPhienChinh('ward', page, st);
	const s = await r.nhapHangSerial(browser, { sl: 5 });
	const ps = await r.k.moPhienPhu(browser, 'shop', r.ROUTE);
	let p;
	try {
		const shopId = r.seed.doc().duLieu.diemBan.shopId;
		const lo = (await r.loCon(ps.page, ps.st, shopId, s.productId, s.variantId)).find((l) => l.batchCode === s.lo);
		p = await r.taoPhieuApi(ps.page, ps.st, { note: 'AUTO TEST 14_1 040_017 serial', items: [{
			productId: s.productId, variantId: s.variantId, productName: s.ten, variantName: 'Mặc định', unitId: lo.productUnitId, unitName: lo.unit || 'Cái',
			convertToMainUnit: 1, quantity: 5, batchCode: s.lo, batchProductId: lo.batchProductId, sourceShopId: shopId, inventoryId: lo.inventoryId, serials: s.serials,
		}] });
		await r.timMa(page, p.code);
		await r.bamMenu(page, r.dong(page).filter({ hasText: p.code }).first(), 'Duyệt');
		const m = page.getByRole('dialog').last();
		await expect(m.getByPlaceholder('Bỏ serial không duyệt').or(m.locator('.ant-select').filter({ hasText: s.serials[0] }))).toBeVisible({ timeout: 20_000 });
		const hang = m.locator('.ant-table-tbody tr.ant-table-row').first();
		for (let i = 0; i < 2; i++) await hang.locator('.ant-select-selection-item-remove').last().click();
		await expect(hang.locator('.ant-select-selection-item')).toHaveCount(3);
		const th = (await m.locator('.ant-table-thead th').allInnerTexts()).map(r.chuan);
		const oSl = hang.locator('td').nth(th.findIndex((x) => x.startsWith('SL duyệt')));
		await expect(oSl, 'SL duyệt không tự đổi thành 3 theo số serial còn lại').toHaveText('3');
		expect(await oSl.locator('.ant-input-number-input').count(), 'Dòng serial vẫn cho gõ tay SL duyệt').toBe(0);
		await page.keyboard.press('Escape');
	} finally {
		await r.donPhieu(browser, ps, p?.id);
		await ps.dong();
	}
});
