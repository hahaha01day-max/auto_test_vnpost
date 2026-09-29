'use strict';

/**
 * 32_170_015 · Vai `province` (AUTO7_TINH) mở "Gán nhân viên" ở tỉnh mình: ô "Chọn đơn vị / cửa hàng" KHÔNG được có đơn vị
 * ngoài tỉnh. 🚫 KHÔNG ghi — chặn request batch-assign-roles.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, khungChiTiet, moMan, nutCay, oTim } = require('./org-page');

const GOC = path.join(__dirname, '..');

test('32_170_015 — Gán nhân viên cho đơn vị không có quyền', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '32_170_015'));
	test.skip(Boolean(ly), ly ?? '');
	const chan = await chanGhi(page);
	const n = await moMan(page, 'province');
	const cay = (await nutCay(page).allInnerTexts()).map(chuan);
	// Thử tìm một tỉnh khác trên cây (vd tỉnh làn khác).
	await oTim(page).fill('AUTO8');
	await page.waitForTimeout(2_500);
	const ngoai = (await nutCay(page).allInnerTexts()).map(chuan).filter(Boolean);
	await oTim(page).fill('AUTO7_TINH');
	await page.waitForTimeout(2_500);
	await nutCay(page).filter({ hasText: 'AUTO7_TINH' }).first().locator('.ant-tree-node-content-wrapper').first().click();
	await page.waitForTimeout(2_500);
	const nutCt = (await khungChiTiet(page).getByRole('button').allInnerTexts()).map(chuan).filter(Boolean);
	test.info().annotations.push({ type: 'nút ở chi tiết AUTO7_TINH (vai tỉnh)', description: nutCt.join(' · ') });
	expect(ngoai, 'Vai tỉnh thấy đơn vị của tỉnh khác trên cây').toEqual([]);
	if (!nutCt.some((x) => /Gán nhân viên/.test(x))) {
		// Vai tỉnh không có quyền gán nhân viên ⇒ đơn vị ngoài phạm vi càng không gán được (cây cũng không hiện tỉnh khác).
		test.info().annotations.push({ type: 'kết luận', description: 'Vai tỉnh KHÔNG có nút "Gán nhân viên" (thiếu perm organizational_batch_assign_employee) — không gán được cả trong tỉnh mình.' });
		return;
	}
	await khungChiTiet(page).getByRole('button', { name: /Gán nhân viên/ }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Gắn nhân viên' }).last();
	await expect(dr).toBeVisible({ timeout: 10_000 });
	await dr.getByRole('button', { name: /Thêm nhân viên & vai trò/ }).click();
	await page.waitForTimeout(800);
	await dr.locator('.ant-select').filter({ hasText: /^\s*Chọn đơn vị \/ cửa hàng\s*$/ }).last().click();
	await page.waitForTimeout(1_500);
	const lua = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last().locator('.ant-select-tree-treenode').allInnerTexts()).map(chuan).filter(Boolean);
	test.info().annotations.push({ type: 'hành vi thật', description: `cây ${n} nút (${cay.slice(0, 5).join(' | ')}) · tìm "AUTO8": ${ngoai.join(' | ') || '(không thấy)'} · lựa chọn đơn vị gán: ${lua.join(' | ')} · request ghi ${chan.daGoi.length}` });
	expect(ngoai, 'Vai tỉnh thấy đơn vị của tỉnh khác trên cây').toEqual([]);
	expect(lua.filter((x) => !/AUTO7/.test(x)), 'Ô đơn vị gán có đơn vị ngoài tỉnh AUTO7').toEqual([]);
	expect(lua.length, 'Không có lựa chọn đơn vị nào trong tỉnh mình').toBeGreaterThan(0);
});
