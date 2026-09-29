'use strict';

/**
 * Task 040 — phần kiểm PHẠM VI VAI: cấp điểm bán không có thẻ *Cảnh báo hết hạn*.
 * 🔴 Phải chạy bằng vai `shop` thật, 🚫 không "giả lập" bằng cách ẩn thẻ hay bỏ qua case:
 *    đây chính là điều HDSD 040 khẳng định ("cấp điểm bán và cấp xã không có thẻ này").
 */

const { test, expect } = require('@playwright/test');
const { openAlerts, settle } = require('./alert-page');

test('04_1_040_001 - Vai cấp điểm bán không thấy thẻ Cảnh báo hết hạn', async ({ page }) => {
	await openAlerts(page, 'shop');
	await page.getByRole('button', { name: 'Cài đặt cảnh báo' }).first().click();
	await expect
		.poll(() => page.url(), { message: 'Không mở được màn Cài đặt cảnh báo.', timeout: 30_000 })
		.toContain('/stock-alerts/settings');
	await settle(page);

	await expect(
		page.locator('.ant-tabs-tab').filter({ hasText: 'Cảnh báo hết hạn' }),
		'HDSD 040 — cấp điểm bán KHÔNG được có thẻ Cảnh báo hết hạn.',
	).toHaveCount(0);
});
