'use strict';

/**
 * 14_2 — Phạm vi: vai CẤP XÃ không gom phiếu (vai `ward`).
 * Nguồn: `StockReturnRequestListPage.jsx` (`canSplitConsolidate`), BE `consolidate` chặn cấp đầu tiên (không ghi).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('./tra-ghi');

const GOC = path.join(__dirname, '..');

test('14_2_010_014 — Vai cấp xã không gom phiếu được', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '14_2_010_014'));
	test.skip(Boolean(ly), ly ?? '');
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, 'ward');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	await expect(t.khung(page).getByRole('button', { name: /Gom phiếu/ }), 'Cấp xã thấy nút Gom phiếu').toHaveCount(0);
	expect(await t.dong(page).count(), 'Cấp xã không thấy phiếu nào — không kiểm được cột ô chọn').toBeGreaterThan(0);
	expect(await t.khung(page).locator('.ant-table-selection-column').count(), 'Cấp xã có cột ô chọn').toBe(0);
	const ds = (await t.k.goiGhi(page, st, 'GET', t.API, { status: 'APPROVED', page: 0, size: 5 }))?.data || [];
	const ids = ds.length >= 2 ? [ds[0].id, ds[1].id] : [1, 2];
	const b = await t.k.goiGhi(page, st, 'POST', `${t.API}/consolidate`, {}, { ids });
	expect(t.msg(b)).toBe('Chỉ cấp tỉnh/TCT được gom phiếu trả');
});
