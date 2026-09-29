'use strict';

/**
 * 18_2_040_022 — điểm bán CHƯA bật HĐĐT thì không có ô "Xuất hoá đơn điện tử" (vai `gdv`).
 * Tiền đề: `18_4/tests/hddt-shop.js` đặt `enableInvoice=false` cho điểm bán làn ở beforeAll, khôi phục gốc ở afterAll.
 * Trace 26/09/2026 (`overviewInfo/OrderOverviewInfo.jsx` ~dòng 330): Checkbox "Xuất hoá đơn điện tử" vẽ KHÔNG điều kiện.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const hddt = require('../../18_4_quan_ly_don_hang/tests/hddt-shop');

const GOC = path.join(__dirname, '..');
let GOC_GT = null;
let KHONG_LUU = null;

test.describe('18_2 — Điểm bán tắt HĐĐT', () => {
	test.describe.configure({ timeout: 180_000, mode: 'serial' });
	test.beforeAll(async ({ browser }) => { test.setTimeout(120_000); const x = await hddt.dat(browser, false); GOC_GT = x?.khongLuu ? x.truoc : x; KHONG_LUU = x?.khongLuu ?? null; });
	test.afterAll(async ({ browser }) => { test.setTimeout(120_000); if (!KHONG_LUU) await hddt.dat(browser, GOC_GT !== false); });

	test('18_2_040_022 — Điểm bán chưa bật HĐĐT thì không có ô này', async ({ page }) => {
		const i = loadCaseInput(GOC, '18_2_040_022');
		test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
		test.skip(Boolean(KHONG_LUU), `Không tắt được HĐĐT điểm bán: ${KHONG_LUU}`);
		await p.moBan(page, test);
		await p.them(page, p.sp().tc);
		const n = await page.getByRole('checkbox', { name: 'Xuất hoá đơn điện tử' }).count();
		test.info().annotations.push({ type: 'đo', description: `enableInvoice gốc ${GOC_GT} → false · ô "Xuất hoá đơn điện tử": ${n}` });
		await p.donTab(page).catch(() => null);
		expect(n, 'Điểm bán tắt HĐĐT mà ô "Xuất hoá đơn điện tử" vẫn hiện').toBe(0);
	});
});
