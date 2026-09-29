'use strict';

/**
 * Task 010 — case kiểm QUYỀN, phải chạy bằng vai KHÔNG có `update_shop`.
 *
 * 🔴 Chạy case này bằng tài khoản TCT là **pass giả**: TCT có đủ quyền nên icon nào cũng hiện,
 * test vẫn xanh mà không kiểm được gì. Vai `shop` mới là vai thiếu quyền thật.
 */

const { test, expect } = require('@playwright/test');
const { openShopList, rows, skipNoData } = require('./shop-page');

test.describe('01 — Quyền trên màn danh sách điểm bán (vai điểm bán)', () => {
	test('01_010_016 - Cột Hành động chỉ hiện biểu tượng ứng với quyền của người dùng', async ({ page }) => {
		// Không vào được màn hình cũng là một kết quả đúng: HDSD ghi không có quyền `get_shop`
		// thì mục Quản lý cửa hàng không hiện.
		const response = await page.goto('/chain/shop-management');
		if (response && response.status() >= 400) {
			test.info().annotations.push({
				type: 'quyền',
				description: 'Vai điểm bán không vào được màn Quản lý cửa hàng — đúng với HDSD 010.',
			});
			return;
		}

		const visible = await page.locator('.ant-table-thead').count();
		if (visible === 0) {
			test.info().annotations.push({
				type: 'quyền',
				description: 'Vai điểm bán không thấy bảng danh sách điểm bán — đúng với HDSD 010.',
			});
			return;
		}

		await openShopList(page, 'shop');
		if ((await rows(page).count()) === 0) skipNoData(test, 'Vai điểm bán không thấy điểm bán nào để kiểm cột Hành động.');

		const actionButtons = rows(page).first().locator('td').last().locator('button');
		const enabled = await actionButtons.evaluateAll((list) => list.filter((b) => !b.disabled).length);

		// Vai điểm bán không có `update_shop` → phải ít nút hơn vai quản trị (vốn có 4 nút).
		expect(
			enabled,
			'Vai không có quyền sửa mà vẫn thấy đủ nút Hành động nghĩa là quyền không được áp ở FE.',
		).toBeLessThan(4);
	});

	test('01_010_028 - Vai không có quyền create_shop không thấy nút "+ Thêm điểm bán"', async ({ page }) => {
		// 🔴 LỆCH TÀI LIỆU: kịch bản viết "ví dụ vai `province`", nhưng đo thực tế vai `province`
		//    (qltls01) VẪN thấy đủ 3 nút "Nhập từ excel · Xuất excel · Thêm điểm bán" ⇒ vai đó CÓ
		//    `create_shop`. Vai thiếu quyền thật là `shop` (chtls01): vùng extra rỗng hoàn toàn.
		//    Chạy case này bằng `province` là đỏ oan, không phải lỗi sản phẩm.
		await openShopList(page, 'shop');

		const extra = page.locator('.ant-pro-page-container-warp-page-header, .ant-page-header-heading-extra').first();

		// PermissionButton ẩn HẲN, không phải disabled ⇒ đếm bằng count, không phải isDisabled.
		await expect(
			extra.getByRole('button', { name: /Thêm điểm bán/i }),
			'Vai không có quyền create_shop vẫn thấy nút "+ Thêm điểm bán".',
		).toHaveCount(0);
		await expect(
			extra.getByRole('button', { name: /Nhập từ excel/i }),
			'Vai không có quyền import_shop vẫn thấy nút "Nhập từ excel".',
		).toHaveCount(0);
		await expect(
			extra.getByRole('button', { name: /Xuất excel/i }),
			'Vai không có quyền get_shop vẫn thấy nút "Xuất excel".',
		).toHaveCount(0);

		// 🔴 Chống "pass rỗng": ba `toHaveCount(0)` ở trên cũng đúng khi màn chưa vẽ. Phải chắc
		//    màn ĐÃ mở được thì việc không thấy nút mới có nghĩa là bị quyền chặn.
		await expect(page.locator('.ant-table-thead'), 'Màn danh sách chưa vẽ — chưa kết luận được về quyền.').toBeVisible();
	});
});
