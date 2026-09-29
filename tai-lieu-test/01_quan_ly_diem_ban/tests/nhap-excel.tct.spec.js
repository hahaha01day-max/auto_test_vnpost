'use strict';

/**
 * Task 070 — Nhập điểm bán từ file Excel.
 * Component: `components/importExcelDrawer/DrawerImportBase.jsx` (dùng chung) +
 * `shopManagement/components/DrawerImportExcel.jsx` (bọc, `title="Nhập điểm bán từ file excel"`).
 *
 * File này CHỈ chứa case KHÔNG nhập dữ liệu thật: tải file mẫu, chặn file sai định dạng, chặn khi
 * chưa chọn file, công tắc "Dừng lại khi có lỗi", và thẻ Lịch sử nhập.
 * Case thật sự upload (070_002/003/008/009/010/011/012) để riêng — chúng tạo điểm bán thật.
 *
 * 🔴 Chặn ghi bằng `blockWrites`: `POST /import/api/v1/shops/excel` đã nằm trong `WRITE_ENDPOINTS`.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { blockWrites, openDropdown, openShopList, skipNoData } = require('./shop-page');

/** File rác dùng cho case "sai định dạng" — tạo trong thư mục tạm, không đụng vào repo. */
function fileRac(ten, noiDung = 'khong phai excel') {
	const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vnpost-test-')), ten);
	fs.writeFileSync(p, noiDung);
	return p;
}

async function moDrawerNhap(page) {
	await page.getByRole('button', { name: 'Nhập từ excel' }).first().click();
	const drawer = page.locator('.ant-drawer-open').first();
	await expect(drawer, 'Không mở được drawer Nhập từ excel.').toBeVisible();
	await expect(drawer.locator('.ant-drawer-title')).toContainText(/Nhập điểm bán từ file excel/i);
	return drawer;
}

test.describe('01 — Nhập điểm bán từ Excel (không nhập dữ liệu thật)', () => {
	test.beforeEach(async ({ page }) => {
		await openShopList(page, 'tct');
	});

	test('01_070_001 - Tải về file mẫu thành công', async ({ page }) => {
		const drawer = await moDrawerNhap(page);

		const cho = page.waitForEvent('download', { timeout: 30_000 });
		await drawer.getByRole('button', { name: /Tải về file mẫu/ }).click();
		const tai = await cho;

		// `downloadUrl="/files/DiemBan_Import.xlsx"` trong DrawerImportExcel.jsx.
		expect(
			await tai.suggestedFilename(),
			'File mẫu phải là file Excel (.xls/.xlsx).',
		).toMatch(/\.xlsx?$/i);
	});

	test('01_070_004 - File không phải Excel bị chặn ngay, không gửi lên server', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await moDrawerNhap(page);

		// 🔴 `beforeUpload` trả `Upload.LIST_IGNORE` nên file KHÔNG vào danh sách — kỳ vọng đúng là
		//    "không có file nào được nhận", chứ không phải "file hiện rồi báo lỗi".
		//    Thông báo thật là `<tên file> không đúng định dạng file` (DrawerImportBase.jsx:71),
		//    KHÔNG phải "Vui lòng chọn file excel" như Sheet QC mô tả — xem §4 handoff.
		await drawer.locator('input[type="file"]').setInputFiles(fileRac('khong-hop-le.pdf'));

		await expect(
			page.locator('.ant-message').filter({ hasText: 'không đúng định dạng file' }).first(),
			'File .pdf phải bị từ chối kèm thông báo sai định dạng.',
		).toBeVisible();
		// `beforeUpload` trả `Upload.LIST_IGNORE` ⇒ vùng kéo thả vẫn ở trạng thái "chưa chọn file".
		await expect(
			drawer.locator('.ant-upload-text'),
			'File sai định dạng không được nhận vào vùng kéo thả.',
		).toContainText('Kéo thả hoặc bấm để chọn file');
		expect(attempted, 'File sai định dạng mà vẫn gửi lên server.').toEqual([]);
	});

	test('01_070_005 - Bấm Xác nhận nhập khi chưa chọn file thì bị chặn', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await moDrawerNhap(page);

		await drawer.getByRole('button', { name: 'Xác nhận nhập' }).click();

		await expect(
			page.locator('.ant-message').filter({ hasText: 'Vui lòng chọn file excel' }).first(),
			'Chưa chọn file mà bấm Xác nhận phải báo "Vui lòng chọn file excel".',
		).toBeVisible();
		expect(attempted, 'Chưa chọn file mà vẫn gửi request nhập lên server.').toEqual([]);
	});

	test('01_070_007 - Lọc Lịch sử nhập theo Trạng thái', async ({ page }) => {
		const drawer = await moDrawerNhap(page);

		// Lần gọi KHÔNG lọc — dùng làm mốc để tách bạch "API hỏng sẵn" với "hỏng vì tham số status".
		const choMoc = page.waitForResponse(
			(r) => r.url().includes('/import/api/v1/shops/history') && r.request().method() === 'GET',
			{ timeout: 30_000 },
		);
		await drawer.getByRole('tab', { name: 'Lịch sử nhập' }).click();
		const moc = await choMoc;
		// 🔴 Thẻ Lịch sử nhập do **import-service (cổng 8083)** phục vụ, không phải core. Service đó
		//    tắt thì gateway trả 500 và case này đỏ vì MÔI TRƯỜNG, không phải vì sản phẩm sai.
		//    Kiểm nhanh: `lsof -nP -iTCP:8083 -sTCP:LISTEN`. Đo ngày 17/09: service KHÔNG chạy.
		if (moc.status() !== 200) {
			skipNoData(
				test,
				`API lịch sử nhập trả HTTP ${moc.status()} ngay khi chưa lọc gì — nhiều khả năng ` +
					'import-service (8083) không chạy. Bật service rồi chạy lại case này.',
			);
		}

		// Select Trạng thái của thẻ Lịch sử (placeholder "Trạng thái", DrawerImportBase.jsx:501).
		const loc = drawer.locator('.ant-select').filter({ hasText: 'Trạng thái' }).first();
		await expect(loc, 'Thẻ Lịch sử nhập phải có bộ lọc Trạng thái.').toBeVisible();

		// 🔴 URL thật là `/import/api/v1/shops/history` (shopApi.js:205) — prefix `/import` là
		//    context-path của import-service, đừng khớp lỏng bằng /import|history/ vì nó bắt trúng
		//    cả response khác và test đỏ với lý do sai.
		const cho = page.waitForResponse(
			(r) => r.url().includes('/import/api/v1/shops/history') && r.request().method() === 'GET',
			{ timeout: 30_000 },
		);
		const ds = await openDropdown(page, loc);
		await ds.locator('.ant-select-item-option').filter({ hasText: 'Thành công' }).first().click();
		const res = await cho;

		expect(
			res.status(),
			`Lịch sử nhập trả 200 khi KHÔNG lọc, nhưng thêm status=SUCCESS thì server trả ` +
				`${res.status()} — lỗi ở tham số status. URL: ${res.url()}`,
		).toBe(200);

		// 🔴 Bảng có thể rỗng — không có vòng lặp đối chiếu nào được chạy 0 lần rồi tự xanh.
		const dong = drawer.locator('.ant-table-tbody tr.ant-table-row');
		const so = await dong.count();
		if (so === 0) {
			skipNoData(test, 'Chưa có lần nhập nào ở trạng thái Thành công để đối chiếu.');
		}
		// 🔴 Cột Trạng thái hiển thị **trạng thái SUY RA**, không phải trạng thái job:
		//    `getImportDisplayStatus` đổi `SUCCESS` thành `FAILED` khi `totalFailed > 0`
		//    (`importStatus.js:5`). Nên lọc `status=SUCCESS` vẫn hiện ra dòng nhãn "Thất bại" —
		//    đúng sản phẩm, 🚫 đừng assert mọi dòng phải mang nhãn "Thành công".
		//    Thứ kiểm được ở đây: request mang đúng bộ lọc, và không lọt dòng nào ở trạng thái
		//    thực sự khác (Chờ xử lý / Đang xử lý).
		expect(
			new URL(res.url()).searchParams.get('status'),
			'Chọn Trạng thái = Thành công mà request không mang status=SUCCESS.',
		).toBe('SUCCESS');
		for (let i = 0; i < so; i++) {
			await expect(
				dong.nth(i),
				'Lọc Trạng thái = Thành công mà danh sách lọt dòng Chờ xử lý / Đang xử lý.',
			).not.toContainText(/Chờ xử lý|Đang xử lý|Khởi tạo/i);
		}
	});

	test('01_070_009 - Công tắc "Dừng lại khi có lỗi" bật/tắt được và mặc định TẮT', async ({
		page,
	}) => {
		const drawer = await moDrawerNhap(page);

		const oTick = drawer.locator('.ant-checkbox-input').first();
		await expect(oTick, 'Drawer nhập phải có ô "Dừng lại khi có lỗi".').toBeVisible();
		// `useState(false)` trong DrawerImportExcel.jsx ⇒ mặc định TẮT (nhập tiếp khi gặp dòng lỗi).
		await expect(oTick, 'Mặc định của "Dừng lại khi có lỗi" phải là TẮT.').not.toBeChecked();

		await oTick.check();
		await expect(oTick, 'Bật công tắc "Dừng lại khi có lỗi" không ăn.').toBeChecked();
	});

	/**
	 * Mở thẻ Lịch sử nhập và chờ lần gọi API đầu tiên.
	 * 🔴 Thẻ này do **import-service (cổng 8083)** phục vụ. Service tắt ⇒ gateway trả 500 và case
	 * đỏ vì MÔI TRƯỜNG chứ không phải vì sản phẩm. Kiểm nhanh: `lsof -nP -iTCP:8083 -sTCP:LISTEN`.
	 */
	async function moLichSu(page, drawer) {
		const cho = page.waitForResponse(
			(r) => r.url().includes('/import/api/v1/shops/history') && r.request().method() === 'GET',
			{ timeout: 30_000 },
		);
		await drawer.getByRole('tab', { name: 'Lịch sử nhập' }).click();
		const res = await cho;
		if (res.status() !== 200) {
			skipNoData(
				test,
				`API lịch sử nhập trả HTTP ${res.status()} ngay khi chưa lọc gì — nhiều khả năng ` +
					'import-service (8083) không chạy. Bật service rồi chạy lại case này.',
			);
		}
		return res;
	}

	/** Đặt khoảng thời gian cho PresetRangePicker (format DD/MM/YYYY) và chờ API lịch sử. */
	async function datKhoangThoiGian(page, drawer, tuNgay, denNgay) {
		const cho = page.waitForResponse(
			(r) => r.url().includes('/import/api/v1/shops/history') && r.request().method() === 'GET',
			{ timeout: 30_000 },
		);
		const o = drawer.locator('.ant-picker-range input');
		await o.nth(0).click();
		await o.nth(0).fill(tuNgay);
		await page.keyboard.press('Enter');
		await o.nth(1).fill(denNgay);
		await page.keyboard.press('Enter');
		return cho;
	}

	test('01_070_013 - Lọc Lịch sử nhập kết hợp khoảng thời gian và Trạng thái', async ({ page }) => {
		const drawer = await moDrawerNhap(page);
		await moLichSu(page, drawer);

		// Khoảng thời gian rộng để chắc chắn phủ mọi lần nhập đã có.
		const resNgay = await datKhoangThoiGian(page, drawer, '01/01/2020', '31/12/2030');
		expect(resNgay.status(), 'Lọc theo khoảng thời gian làm API lịch sử hỏng.').toBe(200);

		const queryNgay = new URL(resNgay.url()).searchParams;
		const startTime = queryNgay.get('startTime');
		const endTime = queryNgay.get('endTime');
		expect(startTime, 'Đặt khoảng thời gian mà request không mang startTime.').toBeTruthy();
		expect(endTime, 'Đặt khoảng thời gian mà request không mang endTime.').toBeTruthy();

		// Thêm điều kiện Trạng thái = Thất bại — 🔴 hai điều kiện phải áp ĐỒNG THỜI (AND),
		// không được thay thế nhau: giữ nguyên startTime/endTime trong request mới.
		const cho = page.waitForResponse(
			(r) => r.url().includes('/import/api/v1/shops/history') && r.request().method() === 'GET',
			{ timeout: 30_000 },
		);
		const loc = drawer.locator('.ant-select').filter({ hasText: 'Trạng thái' }).first();
		const ds = await openDropdown(page, loc);
		await ds.locator('.ant-select-item-option').filter({ hasText: 'Thất bại' }).first().click();
		const res = await cho;

		const query = new URL(res.url()).searchParams;
		expect(res.status(), 'Kết hợp hai điều kiện lọc làm API lịch sử hỏng.').toBe(200);
		expect(query.get('status'), 'Chọn Trạng thái = Thất bại mà request không mang status.').toBeTruthy();
		expect(
			query.get('startTime'),
			'Thêm điều kiện Trạng thái làm MẤT điều kiện khoảng thời gian — hai bộ lọc đang thay thế nhau thay vì AND.',
		).toBe(startTime);
		expect(query.get('endTime'), 'Thêm điều kiện Trạng thái làm mất endTime.').toBe(endTime);

		// 🔴 Cột Trạng thái hiển thị trạng thái SUY RA (`getImportDisplayStatus`), nên không assert
		//    "mọi dòng mang nhãn Thất bại". Thứ kiểm được: không lọt dòng đang xử lý.
		const dong = drawer.locator('.ant-table-tbody tr.ant-table-row');
		const so = await dong.count();
		for (let i = 0; i < so; i++) {
			await expect(
				dong.nth(i),
				'Lọc Trạng thái = Thất bại mà danh sách lọt dòng Chờ xử lý / Đang xử lý.',
			).not.toContainText(/Chờ xử lý|Đang xử lý|Khởi tạo/i);
		}
	});

	test('01_070_014 - Lịch sử nhập ở trạng thái rỗng', async ({ page }) => {
		const drawer = await moDrawerNhap(page);
		await moLichSu(page, drawer);

		// Khoảng thời gian chắc chắn chưa có lần nhập nào.
		const res = await datKhoangThoiGian(page, drawer, '01/01/2020', '02/01/2020');
		expect(res.status(), 'Khoảng thời gian rỗng không được làm API lịch sử hỏng.').toBe(200);

		const dong = drawer.locator('.ant-table-tbody tr.ant-table-row');
		await expect(dong, 'Khoảng 01/01/2020–02/01/2020 phải không có lần nhập nào.').toHaveCount(0);
		await expect(
			drawer.locator('.ant-empty, .ant-table-placeholder').first(),
			'Không có dữ liệu thì phải hiện trạng thái rỗng, không phải bảng trắng.',
		).toBeVisible();
		await expect(page.locator('.ant-message-error'), 'Trạng thái rỗng không được kèm lỗi đỏ.').toHaveCount(0);
	});
});
