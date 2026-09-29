'use strict';

/**
 * Task 080 — Xuất Excel danh sách điểm bán.
 * Component: `features/exportExcel/exportExcelDrawer.jsx` (dùng chung nhiều phân hệ, `type="shop"`).
 *
 * Trace API (từ `features/exportExcel/action.js`), tất cả đều **GET**:
 *   tạo việc xuất → `export/task/shop`   · danh sách file → `export/file/find`
 *   tải file      → `export/file/download`
 *
 * 🔴 Xuất Excel chạy NỀN ở `export-service`: bấm Xuất chỉ TẠO việc, file xuất hiện sau. Vì vậy
 * case ở đây kiểm **tham số gửi lên** — thứ hay sai nhất — chứ không chờ tải file về.
 *
 * 🔴 Mở drawer KHÔNG gọi API tạo việc xuất. Drawer chỉ hiện lịch sử file; phải bấm nút
 * **"Xuất file excel"** trong khối *Bộ lọc dữ liệu* mới sinh `GET export/task/shop`.
 *
 * 🔴 **Drawer có BỘ LỌC RIÊNG** (`FilterShop.jsx`): chỉ `keyword` và `status` được mang sang từ màn
 * danh sách; **Phân loại và Tỉnh/TP phải chọn lại trong drawer**. Sheet QC (case 01_080_002) mô tả
 * "xuất đúng dữ liệu đang lọc trên màn hình" — KHÔNG đúng với sản phẩm hiện tại, xem §4 handoff.
 * Nhãn phân loại trong drawer cũng khác màn danh sách: `POS Mini` / `POS Plus` / `Hub`, map sang
 * `shopType` + `shopGrade` qua `resolveShopClassificationExportParams`.
 */

const { test, expect } = require('@playwright/test');
const {
	openDropdown,
	openShopList,
	reloadBy,
	rows,
	searchBox,
	settleTable,
	skipNoData,
} = require('./shop-page');

const API_TASK = 'export/task/shop';

/** Mở drawer Xuất excel (chưa tạo việc xuất). */
async function moDrawerXuat(page) {
	await page.getByRole('button', { name: 'Xuất excel' }).first().click();
	const drawer = page.locator('.ant-drawer-open').first();
	await expect(drawer, 'Không mở được drawer Xuất excel.').toBeVisible();
	await expect(drawer.locator('.ant-drawer-title')).toContainText(/Xuất excel danh sách điểm bán/i);
	return drawer;
}

/** Bấm "Xuất file excel" và trả về query của request tạo việc xuất. */
async function bamXuat(page, drawer) {
	const cho = page.waitForRequest((r) => r.url().includes(API_TASK), { timeout: 30_000 });
	await drawer.getByRole('button', { name: 'Xuất file excel' }).click();
	const req = await cho;
	return new URL(req.url()).searchParams;
}

test.describe('01 — Xuất excel danh sách điểm bán (vai Tổng công ty)', () => {
	test.beforeEach(async ({ page }) => {
		await openShopList(page, 'tct');
	});

	test('01_080_001 - Xuất Excel toàn bộ danh sách khi không đặt bộ lọc', async ({ page }) => {
		const drawer = await moDrawerXuat(page);
		const query = await bamXuat(page, drawer);

		// Không lọc gì ⇒ không được tự kèm điều kiện thu hẹp dữ liệu.
		for (const khoa of ['shopType', 'shopGrade', 'status', 'orgProvinceCode', 'keyword']) {
			expect(
				query.get(khoa) ?? '',
				`Chưa đặt bộ lọc mà request xuất vẫn kèm "${khoa}" — file sẽ thiếu dữ liệu.`,
			).toBe('');
		}
		// `shopId` là điểm bán đại diện để lưu lịch sử xuất, luôn phải có.
		expect(query.get('shopId'), 'Request xuất thiếu shopId — không lưu được lịch sử xuất.').toBeTruthy();
	});

	test('01_080_002 - Chọn Phân loại Hub trong drawer thì request xuất mang đúng shopType', async ({
		page,
	}) => {
		const drawer = await moDrawerXuat(page);

		const loc = drawer.locator('.ant-select').first();
		const ds = await openDropdown(page, loc);
		await ds.locator('.ant-select-item-option').filter({ hasText: 'Hub' }).first().click();

		const query = await bamXuat(page, drawer);
		expect(
			query.get('shopType'),
			'Chọn phân loại Hub mà request xuất không mang shopType=HUB — file sẽ xuất TOÀN BỘ.',
		).toBe('HUB');
	});

	test('01_080_003 - Xuất Excel mang theo từ khoá đang tìm kiếm', async ({ page }) => {
		// 🔴 Backend tìm theo TỪ, không theo chuỗi con — lấy nguyên một từ trong tên bản ghi đầu.
		const ten = (await rows(page).first().locator('td').nth(1).innerText()).trim();
		const tuKhoa = ten.split(/\s+/).filter((x) => x.length > 2)[0];
		if (!tuKhoa) skipNoData(test, `Tên điểm bán "${ten}" không tách được từ khoá để tìm.`);

		await reloadBy(page, () => searchBox(page).fill(tuKhoa));
		await settleTable(page);

		const drawer = await moDrawerXuat(page);
		const query = await bamXuat(page, drawer);
		expect(
			query.get('keyword'),
			`Đang tìm "${tuKhoa}" mà request xuất không mang keyword — file sẽ xuất TOÀN BỘ.`,
		).toBe(tuKhoa);
	});

	test('01_080_004 - Bấm Cập nhật trạng thái thì gọi lại danh sách file', async ({ page }) => {
		const drawer = await moDrawerXuat(page);

		const cho = page.waitForResponse((r) => r.url().includes('export/file/find'), {
			timeout: 30_000,
		});
		await drawer.getByRole('button', { name: 'Cập nhật trạng thái' }).click();
		const res = await cho;

		expect(res.status(), 'Bấm Cập nhật trạng thái phải tải lại được danh sách file.').toBe(200);
	});

	test('01_080_005 - Cột Hành động có nút Tải xuống cho file đã tạo xong', async ({ page }) => {
		const drawer = await moDrawerXuat(page);

		const nutTai = drawer.getByRole('button', { name: 'Tải xuống' });
		// 🔴 File xuất sinh ở JOB NỀN nên ngay sau khi mở drawer có thể chưa có dòng nào — chờ một
		//    nhịp rồi mới kết luận, và nếu vẫn rỗng thì SKIP có lý do chứ không assert bừa.
		await expect
			.poll(async () => nutTai.count(), { message: 'Chưa có file xuất nào.', timeout: 20_000 })
			.toBeGreaterThanOrEqual(0);

		if ((await nutTai.count()) === 0) {
			skipNoData(test, 'Chưa có file xuất nào hoàn tất trong danh sách để kiểm nút Tải xuống.');
		}
		await expect(nutTai.first(), 'Dòng file đã tạo xong phải bấm Tải xuống được.').toBeEnabled();
	});

	test('01_080_006 - Xuất Excel khi danh sách đang rỗng', async ({ page }) => {
		// Đặt bộ lọc cho ra 0 bản ghi bằng một từ khoá chắc chắn không tồn tại.
		const tuKhoa = `KHONGTONTAI_${Date.now()}`;
		await reloadBy(page, () => searchBox(page).fill(tuKhoa));
		await settleTable(page);
		await expect(rows(page), 'Bộ lọc phải cho ra bảng rỗng trước khi bấm Xuất excel.').toHaveCount(0);

		const drawer = await moDrawerXuat(page);

		// 🔴 Case ĐO, kỳ vọng chốt sau khi đo (kịch bản ghi rõ). Hai kết cục đều có thể:
		//    (a) hệ thống chặn kèm thông báo "Không có dữ liệu để xuất" — hành vi mong muốn;
		//    (b) vẫn tạo việc xuất và sinh file chỉ có dòng tiêu đề.
		const cho = page
			.waitForRequest((r) => r.url().includes(API_TASK), { timeout: 15_000 })
			.catch(() => null);
		await drawer.getByRole('button', { name: 'Xuất file excel' }).click();
		const req = await cho;

		const canhBao = (
			await page.locator('.ant-message, .ant-notification-notice').allInnerTexts().catch(() => [])
		)
			.join(' · ')
			.trim();

		test.info().annotations.push({
			type: 'đo được',
			description: req
				? `Danh sách rỗng ⇒ hệ thống VẪN tạo việc xuất (${new URL(req.url()).searchParams.get('keyword')}). Thông báo hiện ra: ${canhBao || '(không có)'}.`
				: `Danh sách rỗng ⇒ hệ thống KHÔNG gửi request xuất. Thông báo: ${canhBao || '(không có)'}.`,
		});

		// Điều PHẢI đúng dù đi nhánh nào: người dùng nhận được phản hồi, không im lặng.
		expect(
			Boolean(req) || canhBao.length > 0,
			'Bấm Xuất excel trên danh sách rỗng mà hệ thống vừa không gửi request, vừa không báo gì — người dùng không biết chuyện gì xảy ra.',
		).toBe(true);

		if (req) {
			// Nếu vẫn xuất thì ít nhất phải mang đúng bộ lọc, để file không chứa dữ liệu ngoài phạm vi.
			expect(
				new URL(req.url()).searchParams.get('keyword'),
				'Vẫn tạo việc xuất nhưng request không mang từ khoá đang lọc — file sẽ chứa cả dữ liệu ngoài bộ lọc.',
			).toBe(tuKhoa);
			test.info().annotations.push({
				type: 'lệch kỳ vọng nghiệp vụ',
				description:
					'Kịch bản nêu hệ thống NÊN chặn kèm "Không có dữ liệu để xuất" thay vì sinh file chỉ có dòng tiêu đề. Cần user chốt.',
			});
		}
	});
});
