'use strict';

/**
 * `02_010_027` · `02_010_028` — vai **không có** quyền `view_all_employee` / `create_employee`
 * 🚫 không được thấy các nút tương ứng.
 *
 * 🔴 Vì sao lại là vai `province_manager`, 🚫 không phải `province`: đo trên `AUTHEN` ngày
 *    22/09/2026 (`TBL_CHAIN_ROLE` ⋈ `TBL_ROLE_FUNCTION`, chuỗi 626) —
 *
 *      | vai                   | VIEW_ALL_EMPLOYEE | CREATE_EMPLOYEE |
 *      | PROVINCE_MANAGER      | 🚫 không          | 🚫 không        |
 *      | PROVINCE_ACCOUNTANT   | ✅ có             | 🚫 không        |
 *
 *    Vai `province` của bộ test là `PROVINCE_ACCOUNTANT` nên 🚫 KHÔNG dùng được cho case này:
 *    nút sẽ hiện đúng theo quyền và case đỏ vì lý do không liên quan.
 *
 * 🔴 File phải mang đuôi `.province_manager.spec.js` — project `province` trong
 *    `playwright.config.js` đã loại đuôi này bằng lookbehind, đổi tên là chạy sai tài khoản.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'province_manager';

const chanNeuTat = (id) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('02 · 010 — Quyền xem tất cả nhân viên, vai Quản lý tỉnh', () => {
	test('02_010_027 — Vai không có quyền view_all_employee không thấy nút Xuất Excel', async ({
		page,
	}) => {
		chanNeuTat('02_010_027');
		await moTrang(page, '/employee/list', VAI);
		await expect(page.locator('.ant-pro-table, .ant-table').first()).toBeVisible({ timeout: 45_000 });

		// Kỳ vọng: `PermissionButton` **ẩn hẳn**, 🚫 không phải hiện rồi `disabled`.
		await expect(
			page.getByRole('button', { name: 'Xuất Excel' }),
			`Vai "${VAI}" 🚫 không có quyền view_all_employee mà nút "Xuất Excel" vẫn hiển thị`,
		).toHaveCount(0);

		// 🔴 Đối chứng: trang PHẢI đã dựng xong. Thiếu vế này thì trang trắng cũng làm case xanh.
		await expect(
			page.locator('.ant-pro-table-list-toolbar, .ant-table-thead').first(),
			'Trang danh sách nhân viên chưa dựng xong — 🚫 chưa kết luận được gì về quyền',
		).toBeVisible({ timeout: 30_000 });
	});

	/**
	 * `PROVINCE_MANAGER` 🚫 không có `CREATE_EMPLOYEE` (đo cùng bảng trên), nên ba nút dùng chung
	 * `PERMISSION_KEY.create_employee` phải ẩn hết.
	 *
	 * 🔴 Case này 🚫 KHÔNG chạy bằng vai `province`: tài khoản đó **bị 401** ở chính API danh sách
	 *    nhân viên (`02_010_029`) ⇒ token 🚫 không mang quyền nào ⇒ nút nào cũng ẩn ⇒ case xanh
	 *    nhưng chẳng kiểm được gì. Đúng loại "pass giả" mà bộ test này sinh ra để bắt.
	 */
	test('02_010_028 — Vai không có quyền create_employee không thấy Thêm mới / Nhập từ excel / Chức danh', async ({
		page,
	}) => {
		chanNeuTat('02_010_028');
		await moTrang(page, '/employee/list', VAI);
		await expect(page.locator('.ant-pro-table, .ant-table').first()).toBeVisible({ timeout: 45_000 });

		for (const nhan of ['Thêm mới', 'Nhập từ excel', 'Chức danh']) {
			await expect(
				page.getByRole('button', { name: nhan }),
				`Vai "${VAI}" 🚫 không có quyền create_employee mà nút "${nhan}" vẫn hiển thị`,
			).toHaveCount(0);
		}

		await expect(
			page.locator('.ant-pro-table-list-toolbar, .ant-table-thead').first(),
			'Trang danh sách nhân viên chưa dựng xong — 🚫 chưa kết luận được gì về quyền',
		).toBeVisible({ timeout: 30_000 });
	});
});
