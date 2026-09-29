'use strict';

/** `10_040_005` — vai Giao dịch viên: màn chi tiết bảng giá là **chỉ đọc**. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');

const GOC = path.join(__dirname, '..');
const { chanGhi, chuan, dong, khung, moMan } = require('./price-page');
const VAI = 'gdv';

test('10_040_005 — Màn chi tiết là chỉ đọc', async ({ page }) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '10_040_005');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	await chanGhi(page);
	await moMan(page, VAI);

	if ((await dong(page).count()) === 0) {
		test.skip(true, 'Vai giao dịch viên không thấy bảng giá nào để mở chi tiết.');
	}
	await dong(page).first().locator('td').last().getByRole('button').first().click({ force: true });
	await page.waitForTimeout(4_000);

	const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	const box = (await hop.count()) ? hop : khung(page);

	const nutSua = await box.getByRole('button', { name: /Sửa|Lưu|Phê duyệt|Xoá|Xóa/ }).count();
	test.info().annotations.push({
		type: 'nút thao tác trong chi tiết (vai gdv)',
		description: `${nutSua} nút · ${chuan(await box.innerText()).slice(0, 150)}`,
	});
	expect(nutSua, `Màn chi tiết còn ${nutSua} nút thao tác — phải là chỉ đọc với vai ${VAI}`).toBe(0);
});
