'use strict';

/**
 * `03b_060_004` — vai KHÔNG thuộc cấp điểm bán 🚫 không bị phép chặn "phải mở ca mới bán được".
 *
 * 🔴 Chạy bằng chính vai `province`: `checkOrderCreateAccessLoader` chỉ áp cho cấp điểm bán
 * (`isShopLevel(roleAllowedLevel)`), cấp khác `return true` ngay. Chạy bằng vai khác là pass giả.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');
const { chuan } = require('./shift-card');

const GOC = path.join(__dirname, '..');
const VAI = 'province';

test('03b_060_004 — Vai không thuộc cấp điểm bán không bị chặn ca', async ({ page }) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '03b_060_004');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	await moTrang(page, '/order/create-order', VAI);
	await page.waitForTimeout(8_000);

	// Không bị đá đi nơi khác…
	expect(
		page.url(),
		`Vai ${VAI} bị đá khỏi màn tạo đơn: ${page.url()} — trái với \`isShopLevel\` trong routes/helpers.js`,
	).toContain('/order/create-order');

	// …và 🚫 không có hộp thoại đòi mở ca.
	const hopThoai = page.locator('.ant-modal-wrap:visible, .ant-modal-confirm');
	const noi = (await hopThoai.count()) ? chuan(await hopThoai.last().innerText()) : '';
	expect(
		/mở ca|chưa mở ca|ca làm việc/i.test(noi),
		`Hiện hộp thoại yêu cầu mở ca cho vai ${VAI}: "${noi}"`,
	).toBe(false);
});
