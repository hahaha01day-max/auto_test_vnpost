'use strict';

/** 33_070_001 · Vai `ward` (bưu điện xã) mở Lịch sử thao tác — phải bị chặn hoặc không có mục menu. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, moMan } = require('./history-page');

const GOC = path.join(__dirname, '..');

test('33_070_001 — Vai bưu điện xã không vào được lịch sử thao tác', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '33_070_001'));
	test.skip(Boolean(ly), ly ?? '');
	await chanGhi(page);
	const api = [];
	page.on('response', async (r) => { if (r.url().includes('/operation-history?')) api.push(`${r.status()}/${(await r.json().catch(() => ({})))?.status?.code}`); });
	await moMan(page, 'ward');
	const menu = await page.locator('.ant-menu, .ant-pro-sider').getByText(/Lịch sử thao tác/).count();
	const n = await dong(page).count();
	test.info().annotations.push({ type: 'hành vi thật', description: `url ${page.url()} · menu ${menu} · ${n} dòng · API ${api.join(' ')} · ${chuan(await page.locator('body').innerText()).slice(0, 160)}` });
	expect(menu, 'Menu vai xã vẫn có mục Lịch sử thao tác').toBe(0);
	expect(n, 'Vai xã vào thẳng URL vẫn XEM được lịch sử').toBe(0);
});
