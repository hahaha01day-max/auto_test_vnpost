'use strict';

/**
 * 13_1_040_006 — lọc danh sách phiếu đề xuất theo Điểm bán / kho. Chạy ở vai `province`.
 *
 * 🔴 Vì sao không phải vai `shop` như CSV ghi: `StockRequestListPage.jsx` chỉ hiện ô "Điểm bán / kho" khi
 * `!scope.isShop && shopOptions.length > 1` — vai điểm bán theo thiết kế chỉ xem phiếu của chính mình.
 * `shopOptions` lấy từ `state.chain.shopList` = các PHÂN CÔNG cấp điểm bán của chính tài khoản
 * (`routes/helpers.js`), KHÔNG phải các điểm bán thuộc tỉnh ⇒ đo 24/09 cả tỉnh lẫn TCT đều không thấy ô lọc.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const dx = require('./dx-ghi');

const GOC = path.join(__dirname, '..');

test('13_1_040_006 — Kiểm tra Lọc theo Điểm bán / kho cụ thể', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '13_1_040_006'));
	test.skip(Boolean(ly), ly ?? '');
	await dx.moDs(page, 'province');
	const nhan = await dx.khung(page).locator('.ant-form-item-label').allInnerTexts();
	test.info().annotations.push({ type: 'đo', description: `Ô lọc vai tỉnh: ${nhan.join(' · ')}` });
	const o = dx.khung(page).locator('.ant-form-item').filter({ hasText: 'Điểm bán / kho' });
	await expect(o, 'Vai tỉnh không có ô lọc "Điểm bán / kho" trên danh sách phiếu đề xuất').toBeVisible();
	await o.locator('.ant-select').click();
	const muc = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option, .ant-popover:visible .ant-radio-wrapper').first();
	await expect(muc, 'Ô lọc không có điểm bán nào để chọn').toBeVisible();
	const ten = dx.chuan(await muc.innerText());
	await muc.click();
	const xn = page.getByRole('button', { name: /^Xác nhận$/ });
	if (await xn.isVisible().catch(() => false)) await xn.click();
	const cho = page.waitForResponse((r) => /\/stock-requests\?/.test(r.url()) && r.url().includes('shopIds='), { timeout: 20_000 });
	await dx.khung(page).getByRole('button', { name: 'Tìm kiếm' }).click();
	const res = await cho;
	const sid = new URL(res.url()).searchParams.get('shopIds');
	const ds = (await res.json())?.data || [];
	test.info().annotations.push({ type: 'đo', description: `${ten} → shopIds=${sid}, ${ds.length} phiếu` });
	for (const p of ds) expect(String(p.shopId)).toBe(sid);
});
