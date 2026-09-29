'use strict';

/**
 * 18_4 — điểm bán TẮT hoá đơn điện tử (vai `gdv`, điểm bán seed làn).
 * Tiền đề: `hddt-shop.js` đặt `enableInvoice=false` cho điểm bán làn ở beforeAll, KHÔI PHỤC giá trị gốc ở afterAll
 * (cấu hình riêng điểm bán, không dùng chung chuỗi).
 * Trace 26/09/2026 (`orderListPage/tableData/OrderTableData.jsx`): cột "TT. Hoá đơn" / "TT. CQT" có `show: enableInvoice`;
 * bộ lọc "Trạng thái hoá đơn" (`filter/OrderFilters.jsx`) KHÔNG có điều kiện nào theo enableInvoice.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { datTest, khung, moDs, chuan } = require('./dh');
const hddt = require('./hddt-shop');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

let GOC_GT = null;
let KHONG_LUU = null;
test.describe('18_4 — Điểm bán tắt hoá đơn điện tử', () => {
	test.describe.configure({ timeout: 180_000, mode: 'serial' });
	test.beforeAll(async ({ browser }) => { test.setTimeout(120_000); const x = await hddt.dat(browser, false); GOC_GT = x?.khongLuu ? x.truoc : x; KHONG_LUU = x?.khongLuu ?? null; });
	test.afterAll(async ({ browser }) => { test.setTimeout(120_000); if (!KHONG_LUU) await hddt.dat(browser, GOC_GT !== false); });
	test.beforeEach(() => datTest(test));

	test('18_4_010_018 — Ẩn cột hoá đơn khi điểm bán tắt hoá đơn điện tử', async ({ page }) => {
		chanNeuTat('18_4_010_018');
		test.skip(Boolean(KHONG_LUU), `Không tắt được HĐĐT điểm bán: ${KHONG_LUU}`);
		await moDs(page);
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);
		test.info().annotations.push({ type: 'đo', description: `enableInvoice gốc ${GOC_GT} → false · cột: ${cot.join(' | ')}` });
		expect(cot, 'Còn cột "TT. Hoá đơn"').not.toContain('TT. Hoá đơn');
		expect(cot, 'Còn cột "TT. CQT"').not.toContain('TT. CQT');
	});

	test('18_4_070_006 — Bộ lọc trạng thái hoá đơn ẩn khi điểm bán tắt hoá đơn', async ({ page }) => {
		chanNeuTat('18_4_070_006');
		test.skip(Boolean(KHONG_LUU), `Không tắt được HĐĐT điểm bán: ${KHONG_LUU}`);
		await moDs(page);
		const loc = khung(page).locator('.ant-select').filter({ hasText: 'Trạng thái hoá đơn' });
		const n = await loc.count();
		test.info().annotations.push({ type: 'đo', description: `bộ lọc "Trạng thái hoá đơn" khi enableInvoice=false: ${n}` });
		expect(n, 'Điểm bán tắt HĐĐT mà bộ lọc "Trạng thái hoá đơn" vẫn hiện').toBe(0);
	});
});
