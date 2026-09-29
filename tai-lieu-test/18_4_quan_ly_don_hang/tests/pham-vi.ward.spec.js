'use strict';

/** 18_4_100_001 — vai bưu điện xã mở Quản lý đơn hàng. */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const GOC = path.join(__dirname, '..');
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

test('18_4_100_001 — Vai bưu điện xã không xem được đơn của điểm bán', async ({ page }) => {
	const i = loadCaseInput(GOC, '18_4_100_001');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(120_000);
	const res = [];
	page.on('response', (r) => { if (/\/orders\/shops\/\d+\/v1\.3/.test(r.url())) res.push(r); });
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/order/created-orders`, 'ward');
	await page.waitForTimeout(6_000);
	const t = chuan(await page.locator('body').innerText()).slice(0, 300);
	const dem = await page.locator('.ant-table-tbody tr.ant-table-row').count();
	test.info().annotations.push({ type: 'hành vi thật', description: `URL ${page.url()} · ${dem} dòng · API ${res.map((r) => r.url().split('__api')[1]?.split('?')[0]).join(', ')} · "${t}"` });
	expect(t).not.toMatch(/Đã xảy ra lỗi|Maximum update depth/);
	expect(dem, 'Vai xã thấy đơn của điểm bán').toBe(0);
});
