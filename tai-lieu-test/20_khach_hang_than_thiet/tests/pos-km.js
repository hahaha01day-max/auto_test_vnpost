'use strict';

/** POS: thao tác bảng CTKM (dùng chung tich-diem / doi-diem). */

const { expect } = require('@playwright/test');

/** Bỏ tick mọi CTKM trong bảng khuyến mại POS ⇒ hoá đơn KHÔNG giảm giá. */
async function boKm(page) {
	const nut = page.getByRole('button', { name: /Chương trình khuyến m[ãạ]i/i }).first();
	if (!(await nut.isVisible().catch(() => false))) return 'không có nút CTKM';
	await nut.click({ force: true });
	const hop = page.getByRole('dialog').last();
	await expect(hop).toBeVisible({ timeout: 15_000 });
	let bo = 0;
	for (const ten of ['Theo đơn hàng', 'Theo sản phẩm', 'Theo danh mục']) {
		const t = hop.getByRole('tab', { name: ten });
		if (!(await t.isVisible().catch(() => false))) continue;
		await t.click();
		await page.waitForTimeout(600);
		const tick = hop.locator('.ant-tabs-tabpane-active .ant-checkbox-checked:not(.ant-checkbox-disabled)');
		for (let i = 0; i < 20 && (await tick.count()); i += 1) {
			await tick.first().click();
			bo += 1;
			await page.waitForTimeout(300);
		}
	}
	const xn = hop.getByRole('button', { name: /Áp dụng|Xác nhận|Đồng ý/ }).last();
	if (await xn.isVisible().catch(() => false)) await xn.click();
	else await page.keyboard.press('Escape');
	await page.waitForTimeout(2_000);
	return `bỏ ${bo} CTKM`;
}


module.exports = { boKm };
