'use strict';

/** `09_PQ_001` — vai Giao dịch viên 🚫 không tạo được phiếu sản xuất (cần `create_import_stock`). */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'gdv';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

test('09_PQ_001 — Vai giao dịch viên không tạo được phiếu sản xuất', async ({ page }) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '09_PQ_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	const ma = [];
	page.on('response', (r) => {
		if (new URL(r.url()).pathname.endsWith('/production')) ma.push(r.status());
	});
	await moTrang(page, '/inventory/production', VAI);
	await page.waitForTimeout(8_000);

	const nut = await khung(page)
		.getByRole('button', { name: /Tạo phiếu|Lập phiếu|Thêm/ })
		.count();
	test.info().annotations.push({
		type: 'quan sát ở vai giao dịch viên',
		description: `nút tạo phiếu: ${nut} · API /production: ${ma.join(', ') || 'không gọi'} · URL: ${page.url()}`,
	});

	expect(
		nut === 0 || !ma.includes(200),
		`Vai ${VAI} vẫn thấy ${nut} nút tạo phiếu sản xuất và API trả ${ma.join(', ')}. ` +
			`Nội dung màn: ${chuan(await khung(page).innerText()).slice(0, 200)}`,
	).toBe(true);
});
