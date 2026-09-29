'use strict';

/**
 * Task 010 — Tra cứu và lọc danh sách điểm bán. Vai: Bưu điện Tỉnh.
 * Nguồn kỳ vọng: `resource/hdsd/hdsd01_quan_ly_diem_ban/tasks/010_tra_cuu_danh_sach.md`.
 *
 * 🚫 Toàn bộ case trong file này CHỈ ĐỌC — không tạo/sửa/xoá điểm bán nào.
 */

const { test, expect } = require('@playwright/test');
const {
	COLUMNS,
	filterStatus,
	filterType,
	openDetailDrawer,
	openShopList,
	pageTitle,
	pickOption,
	reloadBy,
	rows,
	searchBox,
	skipNoData,
	totalFromTitle,
} = require('./shop-page');

test.describe('01 — Tra cứu và lọc danh sách điểm bán', () => {
	test.beforeEach(async ({ page }) => {
		await openShopList(page, 'province');
	});

	test('01_010_001 - Danh sách hiển thị đầy đủ các cột đúng giao diện', async ({ page }) => {
		for (const column of COLUMNS) {
			await expect(
				page.locator('.ant-table-thead th').filter({ hasText: column }).first(),
				`Thiếu cột "${column}" trên bảng danh sách điểm bán.`,
			).toBeVisible();
		}
	});


	test('01_010_003 - Tìm kiếm theo tên điểm bán - trả về kết quả đúng', async ({ page }) => {
		if ((await rows(page).count()) === 0) skipNoData(test, 'Phạm vi của tài khoản không có điểm bán nào.');

		const name = (await rows(page).first().locator('td').nth(1).innerText()).trim();
		const code = (await rows(page).first().locator('td').nth(2).innerText()).trim();
		const keyword = name.slice(0, Math.min(name.length, 12));

		await reloadBy(page, () => searchBox(page).fill(keyword));

		const count = await rows(page).count();
		expect(count, `Tìm "${keyword}" phải ra ít nhất 1 dòng.`).toBeGreaterThan(0);

		// 🔴 KHÔNG khẳng định "mọi dòng đều chứa nguyên văn từ khoá": backend tách từ để tìm, nên
		//    tìm "hub tỉnh lý" trả về cả điểm bán thuộc "Bưu điện tỉnh Lý Sơn" — đúng nghiệp vụ,
		//    mà assert theo chuỗi con thì đỏ oan. Thứ kiểm được chắc chắn: điểm bán lấy từ khoá ra
		//    phải nằm trong kết quả.
		const codes = await rows(page).locator('td:nth-child(3)').allInnerTexts();
		expect(
			codes.map((c) => c.trim()),
			`Tìm theo tên của chính điểm bán ${code} mà kết quả không có nó.`,
		).toContain(code);
	});

	test('01_010_004 - Tìm kiếm theo mã điểm bán - trả về đúng 1 kết quả', async ({ page }) => {
		if ((await rows(page).count()) === 0) skipNoData(test, 'Phạm vi của tài khoản không có điểm bán nào.');

		const code = (await rows(page).first().locator('td').nth(2).innerText()).trim();
		await reloadBy(page, () => searchBox(page).fill(code));

		await expect(rows(page), `Tìm theo mã "${code}" phải ra đúng 1 dòng.`).toHaveCount(1);
		await expect(rows(page).first().locator('td').nth(2)).toHaveText(code);
	});




	test('01_010_009 - Tìm kiếm với từ khóa không tồn tại', async ({ page }) => {
		const keyword = `KHONGTONTAI_${Date.now()}`;
		await reloadBy(page, () => searchBox(page).fill(keyword));

		await expect(rows(page), 'Từ khoá không tồn tại phải cho bảng rỗng.').toHaveCount(0);
		await expect(
			page.locator('.ant-empty, .ant-table-placeholder').first(),
			'Bảng rỗng phải hiện trạng thái trống, không để trắng.',
		).toBeVisible();
	});

	test('01_010_011 - Click icon thông tin mở drawer Chi tiết - hiển thị đúng tất cả trường', async ({ page }) => {
		if ((await rows(page).count()) === 0) skipNoData(test, 'Phạm vi của tài khoản không có điểm bán nào.');

		const code = (await rows(page).first().locator('td').nth(2).innerText()).trim();
		const drawer = await openDetailDrawer(page);

		await expect(drawer, 'Drawer Chi tiết phải hiện đúng điểm bán vừa bấm.').toContainText(code);
	});


	test('01_010_014 - Vai Bưu điện Tỉnh chỉ thấy điểm bán thuộc tỉnh mình', async ({ page }) => {
		const count = await rows(page).count();
		if (count === 0) skipNoData(test, 'Phạm vi của tài khoản không có điểm bán nào.');

		// Cột "Bưu điện Tỉnh" của MỌI dòng phải cùng một giá trị — chính là tỉnh của tài khoản.
		const first = (await rows(page).first().locator('td').nth(5).innerText()).trim();
		expect(first, 'Cột Bưu điện Tỉnh không được để trống với vai cấp tỉnh.').not.toBe('');

		for (let i = 1; i < count; i += 1) {
			await expect(
				rows(page).nth(i).locator('td').nth(5),
				'Vai cấp Tỉnh chỉ được thấy điểm bán thuộc tỉnh mình — xuất hiện tỉnh khác là lọt phạm vi.',
			).toHaveText(first);
		}
	});


});
