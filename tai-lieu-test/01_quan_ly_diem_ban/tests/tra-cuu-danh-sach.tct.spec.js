'use strict';

/**
 * Task 010 — các case cần vai Tổng công ty.
 *
 * 🔴 Vì sao phần lớn case tra cứu nằm ở đây chứ không ở vai tỉnh: tài khoản `province` trong `.env`
 * là `qltls01` — quản lý **tỉnh Lý Sơn**, phạm vi chỉ có **3 điểm bán, toàn Hub, toàn Đang hoạt động,
 * không nhân viên**. Mọi case cần phân trang / Pos mini / điểm bán Tạm ngừng / nhân viên đều skip
 * vì thiếu dữ liệu, chứ KHÔNG phải môi trường thiếu dữ liệu: vai `tct` thấy **341 điểm bán**
 * (331 đang hoạt động + 10 tạm ngừng, đủ cả ba phân loại).
 * 🚫 Đừng kết luận "môi trường không đủ dữ liệu" khi chưa đối chiếu phạm vi của từng vai.
 *
 * 🚫 Chỉ đọc, không ghi dữ liệu.
 */

const { test, expect } = require('@playwright/test');
const {
	COLUMNS,
	filterProvince,
	filterStatus,
	filterType,
	filterWard,
	openDropdown,
	openShopList,
	pickOption,
	reloadBy,
	rows,
	searchBox,
	skipNoData,
	totalFromTitle,
} = require('./shop-page');

test.describe('01 — Tra cứu danh sách điểm bán (vai Tổng công ty)', () => {
	test.beforeEach(async ({ page }) => {
		await openShopList(page, 'tct');
	});

	test('01_010_007 - Lọc theo Bưu điện tỉnh/thành phố', async ({ page }) => {
		const dropdown = await openDropdown(page, filterProvince(page));
		const option = dropdown.locator('.ant-select-item-option').first();
		if ((await option.count()) === 0) skipNoData(test, 'Bộ lọc Bưu điện Tỉnh không có lựa chọn nào.');

		const provinceName = (await option.innerText()).trim();
		await reloadBy(page, () => option.click());

		const count = await rows(page).count();
		if (count === 0) skipNoData(test, `Tỉnh "${provinceName}" không có điểm bán nào.`);

		for (let i = 0; i < count; i += 1) {
			await expect(
				rows(page).nth(i).locator('td').nth(5),
				'Mọi dòng phải thuộc đúng tỉnh đã lọc.',
			).toContainText(provinceName);
		}
	});

	test('01_010_013 - Bộ lọc Bưu điện xã/phường chỉ liệt kê xã thuộc tỉnh đã chọn', async ({ page }) => {
		const provinceFilter = filterProvince(page);
		const wardFilter = filterWard(page);

		if ((await wardFilter.count()) === 0) skipNoData(test, 'Màn hình không có bộ lọc Bưu điện Xã/Phường.');

		// Chọn tỉnh thứ nhất rồi ghi lại danh sách xã.
		const provinceDropdown = await openDropdown(page, provinceFilter);
		const provinces = provinceDropdown.locator('.ant-select-item-option');
		if ((await provinces.count()) < 2) skipNoData(test, 'Cần ít nhất 2 tỉnh để đối chiếu danh sách xã.');
		await reloadBy(page, () => provinces.nth(0).click());

		const wardsOfFirst = await (await openDropdown(page, wardFilter)).locator('.ant-select-item-option').allInnerTexts();
		await page.keyboard.press('Escape');

		// Đổi sang tỉnh thứ hai rồi mở lại danh sách xã.
		await reloadBy(page, async () => {
			const again = await openDropdown(page, provinceFilter);
			await again.locator('.ant-select-item-option').nth(1).click();
		});

		const wardsOfSecond = await (await openDropdown(page, wardFilter)).locator('.ant-select-item-option').allInnerTexts();

		if (wardsOfFirst.length === 0 && wardsOfSecond.length === 0) {
			skipNoData(test, 'Cả hai tỉnh đều không có xã nào để đối chiếu.');
		}

		const overlap = wardsOfSecond.filter((w) => wardsOfFirst.includes(w));
		expect(
			overlap,
			'Đổi tỉnh mà danh sách xã không đổi nghĩa là bộ lọc xã không lọc theo tỉnh — xem HDSD 010, Mẹo.',
		).toEqual([]);
	});

	test('01_010_010 - Danh sách hiển thị trạng thái rỗng khi không có bản ghi nào khớp', async ({ page }) => {
		// Không thể dựng môi trường "chưa có điểm bán nào" nên kiểm đúng hành vi quan sát được:
		// tổ hợp bộ lọc không có kết quả phải ra khối trạng thái rỗng, không phải bảng trắng.
		await reloadBy(page, () => pickOption(page, filterStatus(page), 'Tạm ngừng'));
		await reloadBy(page, () =>
			page.locator('input[placeholder*="theo t"]').first().fill(`KHONGTONTAI_${Date.now()}`),
		);

		await expect(rows(page)).toHaveCount(0);
		await expect(
			page.locator('.ant-empty, .ant-table-placeholder').first(),
			'Không có bản ghi nào thì phải hiện trạng thái rỗng.',
		).toBeVisible();
	});

	test('01_010_017 - Dòng Hub có biểu tượng Gắn nhân viên mờ và bấm không được', async ({ page }) => {
		// 🔴 Case này PHẢI chạy bằng vai có quyền gắn nhân viên. Đo thực tế: vai province chỉ thấy
		//    3 nút (info/edit/setting) — nút Gắn nhân viên bị `PermissionButton` ẩn hẳn, nên chạy
		//    bằng province là kiểm nhầm thứ: không thấy nút vì THIẾU QUYỀN, chứ không phải vì là Hub.
		await reloadBy(page, () => pickOption(page, filterType(page), 'Hub'));
		if ((await rows(page).count()) === 0) skipNoData(test, 'Phạm vi không có điểm bán phân loại Hub.');

		const actions = rows(page).first().locator('td').last().locator('button');
		const disabled = await actions.evaluateAll((list) => list.filter((b) => b.disabled).length);

		expect(disabled, 'Dòng Hub phải có ít nhất một nút Hành động bị vô hiệu (Gắn nhân viên).').toBeGreaterThan(0);
	});

	test('01_010_002 - Phân trang hoạt động đúng - mặc định 10 bản ghi/trang', async ({ page }) => {
		const total = await totalFromTitle(page);
		if (!total || total <= 10) skipNoData(test, `Chỉ có ${total ?? 0} điểm bán, không đủ để kiểm phân trang.`);

		await expect(rows(page), 'Trang 1 phải hiển thị đúng 10 dòng theo mặc định.').toHaveCount(10);

		const firstCodeBefore = await rows(page).first().locator('td').nth(2).innerText();
		await reloadBy(page, () => page.locator('.ant-pagination-item-2').first().click());

		await expect(page.locator('.ant-pagination-item-active')).toHaveText('2');
		const firstCodeAfter = await rows(page).first().locator('td').nth(2).innerText();
		expect(firstCodeAfter, 'Sang trang 2 phải đổi dữ liệu, không lặp lại trang 1.').not.toBe(firstCodeBefore);
	});

	test('01_010_005 - Lọc theo Phân loại - hiển thị đúng loại được chọn', async ({ page }) => {
		await reloadBy(page, () => pickOption(page, filterType(page), 'Pos mini'));

		const count = await rows(page).count();
		if (count === 0) skipNoData(test, 'Phạm vi không có điểm bán Pos mini nào để đối chiếu.');

		for (let i = 0; i < count; i += 1) {
			await expect(rows(page).nth(i).locator('td').nth(3), 'Cột Phân loại phải đúng loại đã lọc.').toContainText(/Pos mini/i);
		}
	});

	test('01_010_006 - Lọc theo Trạng thái - chỉ hiển thị bản ghi Ngừng hoạt động', async ({ page }) => {
		await reloadBy(page, () => pickOption(page, filterStatus(page), 'Tạm ngừng'));

		const count = await rows(page).count();
		if (count === 0) skipNoData(test, 'Phạm vi không có điểm bán nào đang Tạm ngừng.');

		for (let i = 0; i < count; i += 1) {
			await expect(rows(page).nth(i).locator('td').nth(7), 'Cột Trạng thái phải đúng trạng thái đã lọc.').toContainText(/ngừng/i);
		}
	});

	test('01_010_008 - Lọc kết hợp nhiều điều kiện cùng lúc (Phân loại + Trạng thái)', async ({ page }) => {
		await reloadBy(page, () => pickOption(page, filterType(page), 'Pos mini'));
		const { res } = await reloadBy(page, () => pickOption(page, filterStatus(page), 'Đang hoạt động'));

		// 🔴 Kiểm ở tầng REQUEST, không chỉ nhìn bảng: bảng rỗng có thể là "đúng, không có dữ liệu",
		//    cũng có thể là FE nuốt mất một điều kiện lọc. Nhìn bảng thì hai trường hợp giống hệt nhau.
		const query = new URL(res.url()).searchParams;
		expect(query.get('shopGrade') ?? query.get('shopType'), 'Request thiếu điều kiện Phân loại.').toBeTruthy();
		expect(query.get('status'), 'Request thiếu điều kiện Trạng thái.').toBeTruthy();

		const count = await rows(page).count();
		for (let i = 0; i < count; i += 1) {
			const cells = rows(page).nth(i).locator('td');
			await expect(cells.nth(3)).toContainText(/Pos mini/i);
			await expect(cells.nth(7)).toContainText(/hoạt động/i);
		}
	});

	test('01_010_012 - Đổi số dòng mỗi trang bằng ô chọn cạnh thanh phân trang', async ({ page }) => {
		const total = await totalFromTitle(page);
		if (!total || total <= 10) skipNoData(test, `Chỉ có ${total ?? 0} điểm bán, không đủ để đổi số dòng/trang.`);

		await reloadBy(page, async () => {
			const dropdown = await openDropdown(page, page.locator('.ant-pagination-options .ant-select').first());
			await dropdown.locator('.ant-select-item-option').filter({ hasText: /20/ }).first().click();
		});

		const expected = Math.min(total, 20);
		await expect(rows(page), `Chọn 20 dòng/trang thì bảng phải hiển thị ${expected} dòng.`).toHaveCount(expected);
	});

	test('01_010_015 - Danh sách hiển thị điểm bán ở MỌI trạng thái, kể cả tạm ngừng', async ({ page }) => {
		const { body } = await reloadBy(page, () => pickOption(page, filterStatus(page), 'Tạm ngừng'));
		const suspended = await rows(page).count();
		if (suspended === 0) skipNoData(test, 'Phạm vi không có điểm bán Tạm ngừng để đối chiếu.');

		const code = (await rows(page).first().locator('td').nth(2).innerText()).trim();

		// Bỏ lọc bằng cách mở lại màn — 🔴 nút `.ant-select-clear` của antd chỉ hiện khi hover,
		// bấm thẳng thì không nổ request và `waitForResponse` treo tới hết timeout.
		await openShopList(page, 'tct');
		await reloadBy(page, () => searchBox(page).fill(code));

		await expect(
			rows(page).first().locator('td').nth(2),
			'Không lọc trạng thái thì điểm bán Tạm ngừng vẫn phải hiện trong danh sách.',
		).toHaveText(code);
		expect(body).not.toBeNull();
	});

	test('01_010_018 - Liên kết Xem danh sách ở cột Số lượng nhân viên mở thẳng danh sách nhân viên', async ({ page }) => {
		const count = await rows(page).count();
		if (count === 0) skipNoData(test, 'Phạm vi của tài khoản không có điểm bán nào.');

		const link = page.locator('.ant-table-tbody button', { hasText: /Xem danh sách/i }).first();
		if ((await link.count()) === 0) skipNoData(test, 'Không điểm bán nào trong phạm vi có nhân viên để hiện liên kết Xem danh sách.');

		await link.click();

		// 🔴 antd v6: drawer chỉ mang class `ant-drawer-open`, KHÔNG có `.ant-drawer-content` lồng trong.
		const drawer = page.locator('.ant-drawer-open').first();
		await expect(drawer, 'Bấm Xem danh sách phải mở thẳng danh sách nhân viên.').toBeVisible();

		// Đo thực tế: drawer mở ra là "Gắn nhân viên — <tên điểm bán>" kèm mục "Danh sách nhân viên",
		// và URL KHÔNG đổi — đúng ý HDSD "không cần mở màn hình Chi tiết".
		await expect(drawer, 'Drawer phải là danh sách nhân viên của điểm bán.').toContainText(/Danh sách nhân viên/i);
		expect(page.url(), 'Bấm Xem danh sách không được rời khỏi màn danh sách điểm bán.').toContain('/chain/shop-management');
	});
});
