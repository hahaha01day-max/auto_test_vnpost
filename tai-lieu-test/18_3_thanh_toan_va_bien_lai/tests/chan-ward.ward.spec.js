'use strict';

/** 18_3_100_001 — vai bưu điện xã mở màn bán hàng của điểm bán. */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

test('18_3_100_001 — Vai bưu điện xã không mở được màn bán hàng của điểm bán', async ({ page }) => {
	const i = loadCaseInput(GOC, '18_3_100_001');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(120_000);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/order/create-order`, 'ward');
	await page.waitForTimeout(6_000);
	const o = page.getByPlaceholder('Tìm kiếm sản phẩm / dịch vụ (F3)');
	const t = chuan(await page.locator('body').innerText()).slice(0, 300);
	test.info().annotations.push({ type: 'hành vi thật', description: `URL ${page.url()} · "${t}"` });
	expect(t, '🔴 Màn bán hàng của vai xã VỠ (lỗi React) thay vì chặn có thông báo').not.toMatch(/Đã xảy ra lỗi|Maximum update depth/);
	expect(await o.isVisible().catch(() => false), 'Vai xã vào được màn bán hàng và dùng được ô tìm sản phẩm').toBe(false);
});
