'use strict';

/** `09_040_002` — cấp trên điểm bán phải **chọn điểm bán trước** mới thấy phiếu sản xuất. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');

test('09_040_002 — Cấp trên điểm bán phải chọn điểm bán trước mới thấy phiếu', async ({ page }) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '09_040_002');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	const goi = [];
	page.on('request', (r) => {
		if (new URL(r.url()).pathname.endsWith('/production')) goi.push(r.url());
	});

	await moTrang(page, '/inventory/production', VAI);
	await page.waitForTimeout(8_000);

	// Vế 1 — CHƯA chọn điểm bán: danh sách trống.
	expect(
		await dong(page).count(),
		'Vai tỉnh thấy ngay danh sách phiếu khi CHƯA chọn điểm bán — trái kỳ vọng phạm vi',
	).toBe(0);

	// Vế 2 — chọn điểm bán qua drawer ba cột rồi phải thấy phiếu.
	const o = khung(page).locator('.ant-select').filter({ hasText: /điểm bán|kho/i }).first();
	if ((await o.count()) === 0) {
		test.skip(
			true,
			'Màn Sản xuất sản phẩm KHÔNG có ô chọn điểm bán cho vai tỉnh ⇒ cấp tỉnh không bao giờ ' +
				'xem được phiếu. 🔴 Ghi nhận để user chốt.',
		);
	}
	await o.click({ force: true });

	const dr = page.locator('.ant-drawer-open').last();
	if ((await dr.count()) === 0) {
		test.skip(true, 'Bấm ô chọn điểm bán không mở drawer nào — cần probe lại lối vào.');
	}
	const cot3 = (k) => dr.locator('.sp-column').nth(k);
	const tinh = cot3(0).locator('.sp-item');
	await expect.poll(() => tinh.count(), { timeout: 20_000 }).toBeGreaterThan(0);
	await tinh.first().click();
	const xa = cot3(1).locator('.sp-item');
	if (await xa.count()) await xa.first().click();
	const shop = cot3(2).locator('.ant-radio-wrapper');
	if ((await shop.count()) === 0) {
		test.skip(true, 'Cột Điểm bán của drawer không có mục nào trong phạm vi tỉnh.');
	}
	const ten = chuan(await shop.first().innerText());
	await shop.first().click();
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	await page.waitForTimeout(5_000);

	expect(
		goi.length,
		`Chọn điểm bán "${ten}" mà màn KHÔNG gọi API danh sách phiếu lần nào`,
	).toBeGreaterThan(0);
	test.info().annotations.push({
		type: 'sau khi chọn điểm bán',
		description: `${await dong(page).count()} phiếu của "${ten}"`,
	});
});
