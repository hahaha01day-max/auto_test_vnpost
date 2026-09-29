'use strict';

/**
 * Task 020 — case về PHẠM VI CẤP, phải chạy bằng vai cấp Tỉnh.
 *
 * 🔴 Chạy bằng `tct` là pass giả: TCT chọn được mọi cấp nên không kiểm được ràng buộc
 * "chỉ chọn được từ cấp của mình trở xuống".
 * 🚫 Chỉ đọc, không tạo dữ liệu.
 */

const { test, expect } = require('@playwright/test');
const { openCreateDrawer, openShopList } = require('./shop-page');

test.describe('01 — Thêm điểm bán: phạm vi cấp (vai Bưu điện Tỉnh)', () => {
	test('01_020_012 - Cấp chỉ chọn được từ cấp của người dùng trở xuống', async ({ page }) => {
		await openShopList(page, 'province');
		const drawer = await openCreateDrawer(page);

		await expect(
			drawer.getByText('TCT', { exact: true }),
			'Vai cấp Tỉnh không được chọn cấp TCT — HDSD 020 bước 3.',
		).toHaveCount(0);

		await expect(drawer.getByText('Tỉnh', { exact: true }).first(), 'Vai Tỉnh phải chọn được cấp Tỉnh.').toBeVisible();
		await expect(drawer.getByText('Xã', { exact: true }).first(), 'Vai Tỉnh phải chọn được cấp Xã.').toBeVisible();
	});
});
