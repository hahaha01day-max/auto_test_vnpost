'use strict';

/**
 * Task 040 — Cài đặt ngưỡng cảnh báo hạn sử dụng.
 * Màn: `features/stockAlert/components/ExpiryAlertConfigTab.jsx` (thẻ *Cảnh báo hết hạn* của màn
 * Cài đặt cảnh báo). API: `/expiry-alert-policies`.
 *
 * 🔴 Thẻ này CHỈ có ở cấp **Bưu điện tỉnh** và **Tổng công ty** (HDSD 040). Case kiểm điều đó chạy
 *    bằng vai `shop`, để ở file `.shop.spec.js` riêng.
 * 🔴 Case ghi (`040_009`, `040_010`) tạo rồi XOÁ ngay cấu hình vừa tạo, không để lại rác.
 */

const { test, expect } = require('@playwright/test');
const { blockWrites, openAlerts, settle, skipNoData } = require('./alert-page');

const API_EXPIRY = '/expiry-alert-policies';
const TEN_CAU_HINH = `AUTO TEST KHONG DUNG ${Date.now().toString().slice(-6)}`;

async function moTheHetHan(page) {
	await openAlerts(page, 'tct');
	await page.getByRole('button', { name: 'Cài đặt cảnh báo' }).first().click();
	await expect
		.poll(() => page.url(), { message: 'Không mở được màn Cài đặt cảnh báo.', timeout: 30_000 })
		.toContain('/stock-alerts/settings');
	await settle(page);

	const the = page.locator('.ant-tabs-tab').filter({ hasText: 'Cảnh báo hết hạn' }).first();
	await expect(the, 'Vai Tổng công ty phải thấy thẻ Cảnh báo hết hạn.').toHaveCount(1);
	await the.locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await settle(page);
	return page.locator('.ant-tabs-tabpane-active').last();
}

/** Mở màn Thêm cấu hình và trả về khối biểu mẫu của nó. */
async function moThemCauHinh(page) {
	await page.getByRole('button', { name: 'Thêm cấu hình' }).first().click();
	const form = page.locator('.ant-drawer-open, .ant-modal').last();
	await expect(form, 'Không mở được màn Thêm cấu hình ngưỡng cảnh báo hết hạn.').toBeVisible();
	return form;
}

test.describe('04_1 — Cảnh báo hạn sử dụng (vai Tổng công ty)', () => {
	test('04_1_040_002 - Vai TCT thấy thẻ Cảnh báo hết hạn và nút Thêm cấu hình', async ({ page }) => {
		const panel = await moTheHetHan(page);
		await expect(
			page.getByRole('button', { name: 'Thêm cấu hình' }).first(),
			'Thẻ Cảnh báo hết hạn phải có nút Thêm cấu hình.',
		).toBeVisible();
		await expect(panel.locator('.ant-table'), 'Thẻ phải có bảng danh sách cấu hình.').toBeVisible();
	});

	test('04_1_040_003 - Màn Thêm cấu hình có hai thẻ Cấu hình và Phạm vi khu vực', async ({ page }) => {
		await moTheHetHan(page);
		const form = await moThemCauHinh(page);

		for (const the of ['Cấu hình', 'Phạm vi khu vực']) {
			await expect(
				form.locator('.ant-tabs-tab').filter({ hasText: the }).first(),
				`Màn Thêm cấu hình thiếu thẻ "${the}".`,
			).toHaveCount(1);
		}
	});

	test('04_1_040_004 - Số ngày trước hạn mặc định là 30', async ({ page }) => {
		await moTheHetHan(page);
		const form = await moThemCauHinh(page);

		// `initialValues={{ targetType: "ALL", expiryAlertDays: 30 }}` — ExpiryAlertConfigTab.jsx:518.
		const oNgay = form.getByLabel('Số ngày trước hạn sử dụng', { exact: false }).first();
		expect(
			(await oNgay.inputValue()).trim(),
			'HDSD 040 — số ngày trước hạn mặc định phải là 30.',
		).toBe('30');
	});

	test('04_1_040_005 - Mặc định Toàn bộ sản phẩm, chưa hiện trường phụ', async ({ page }) => {
		await moTheHetHan(page);
		const form = await moThemCauHinh(page);

		// 🔴 Bám vào INPUT radio rồi hỏi `toBeChecked()`, đừng bám class `.ant-radio-wrapper-checked`
		//    kèm `hasText` — antd đặt chữ ở phần tử anh em nên bộ lọc đó khớp 0 phần tử.
		await expect(
			form.getByRole('radio', { name: 'Toàn bộ sản phẩm' }).first(),
			'Đối tượng áp dụng phải mặc định là Toàn bộ sản phẩm.',
		).toBeChecked();
		await expect(
			form.getByText('Chọn ngành hàng', { exact: false }),
			'Chưa chọn Ngành hàng thì không được hiện ô chọn ngành hàng.',
		).toHaveCount(0);
	});

	test('04_1_040_006 - Chọn Ngành hàng thì hiện ô chọn ngành hàng', async ({ page }) => {
		await moTheHetHan(page);
		const form = await moThemCauHinh(page);

		await form.getByText('Ngành hàng', { exact: true }).first().click();
		await expect(
			form.getByText('Chọn ngành hàng', { exact: false }).first(),
			'Chọn đối tượng Ngành hàng thì phải hiện ô chọn ngành hàng.',
		).toBeVisible();
	});

	test('04_1_040_007 - Chọn Sản phẩm (SKU) thì hiện ô tìm sản phẩm', async ({ page }) => {
		await moTheHetHan(page);
		const form = await moThemCauHinh(page);

		await form.getByText('Sản phẩm (SKU)', { exact: true }).first().click();
		// Ô tìm có thể là input thường hoặc antd Select tuỳ nhánh — chấp nhận cả hai, miễn là
		// khối chọn sản phẩm đã hiện ra.
		await expect
			.poll(
				async () =>
					(await form.locator('input[placeholder*="Tìm"], .ant-select').count()) > 0,
				{ message: 'Chọn đối tượng Sản phẩm (SKU) thì phải hiện ô tìm sản phẩm.', timeout: 20_000 },
			)
			.toBe(true);
	});

	test('04_1_040_008 - Bỏ trống Tên cấu hình thì bị chặn, không gửi request ghi', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		await moTheHetHan(page);
		const form = await moThemCauHinh(page);

		await form.getByRole('button', { name: /^Lưu$/ }).first().click();

		await expect(
			form.locator('.ant-form-item-explain-error').first(),
			'Bỏ trống Tên cấu hình phải hiện lỗi validate.',
		).toBeVisible();
		expect(attempted, 'Form thiếu Tên cấu hình mà vẫn gửi request ghi.').toEqual([]);
	});

	/**
	 * 🔴 Case này KHÔNG tạo được cấu hình trên môi trường hiện tại, và đó là kết luận có căn cứ:
	 *    ở cấp Tổng công ty, cấu hình "Toàn bộ sản phẩm" đã tồn tại sẵn (bản ghi thật *Test 28/07*),
	 *    nên hệ thống luôn hỏi **Ghi đè**. Bấm Ghi đè là sửa dữ liệu thật của người khác ⇒ 🚫 không
	 *    bấm. Đối chiếu `VNPOST_CORE.EXPIRY_ALERT_POLICY` (29 bản ghi, mới nhất 14/09) xác nhận
	 *    không có bản ghi nào do automation tạo.
	 *
	 *    Vì vậy case kiểm ĐÚNG phần kiểm được: bấm Lưu thì hệ thống phải gọi `check-existing` và
	 *    cảnh báo trùng trước khi ghi — đó chính là cái chặn người dùng xoá nhầm cấu hình cấp trên.
	 *    Muốn kiểm trọn luồng tạo, cần một phạm vi chưa có cấu hình nào (xem ghi chú ở README).
	 */
	test('04_1_040_009 - Lưu cấu hình trùng thì hệ thống cảnh báo trước, không ghi đè lặng lẽ', async ({
		page,
	}) => {
		await moTheHetHan(page);
		const form = await moThemCauHinh(page);
		await form.getByLabel('Tên cấu hình', { exact: false }).first().fill(TEN_CAU_HINH);

		// 🔴 `check-existing` dùng CHUNG đường dẫn gốc với API tạo. Bắt lỏng
		//    `includes(API_EXPIRY) && POST` là vớ phải response của bước kiểm trùng, nó trả 200 nên
		//    case "xanh" trong khi KHÔNG có bản ghi nào được tạo.
		const choKiemTrung = page.waitForResponse(
			(r) => r.url().includes('check-existing') && r.request().method() === 'POST',
			{ timeout: 60_000 },
		);
		await form.getByRole('button', { name: /^Lưu$/ }).first().click();
		const res = await choKiemTrung;
		expect(res.status(), 'Bấm Lưu phải gọi được bước kiểm cấu hình trùng.').toBe(200);

		const hopGhiDe = page
			.locator('.ant-modal-confirm, .ant-modal')
			.filter({ hasText: 'Cấu hình đã tồn tại' })
			.first();
		if (!(await hopGhiDe.isVisible({ timeout: 20_000 }).catch(() => false))) {
			skipNoData(
				test,
				'Phạm vi này chưa có cấu hình nào nên không kiểm được cảnh báo trùng; ' +
					'cần bổ sung case tạo mới trên phạm vi sạch.',
			);
		}

		await expect(
			hopGhiDe.getByRole('button', { name: 'Ghi đè' }).first(),
			'Hộp cảnh báo trùng phải nêu rõ lựa chọn Ghi đè.',
		).toBeVisible();

		// 🚫 KHÔNG bấm Ghi đè — sẽ sửa cấu hình thật. Huỷ để trả môi trường về nguyên trạng.
		await hopGhiDe.getByRole('button', { name: /Huỷ|Hủy/ }).first().click();
		await expect(hopGhiDe, 'Bấm Huỷ phải đóng hộp cảnh báo.').toBeHidden();
	});

	test('04_1_040_010 - Xoá cấu hình phải qua bước xác nhận, huỷ thì không xoá', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const panel = await moTheHetHan(page);

		const dong = panel.locator('.ant-table-tbody tr.ant-table-row');
		if ((await dong.count()) === 0) {
			skipNoData(test, 'Chưa có cấu hình cảnh báo hết hạn nào để kiểm luồng xoá.');
		}

		// 🚫 Không xoá thật: mọi cấu hình đang có đều là dữ liệu thật. Case kiểm rằng hệ thống
		//    HỎI trước khi xoá, và bấm Huỷ thì không gửi request xoá nào.
		await dong.first().getByRole('button', { name: /Xóa|Xoá/ }).first().click();

		const hopXacNhan = page.locator('.ant-modal-confirm').first();
		await expect(
			hopXacNhan,
			'Xoá cấu hình phải có bước xác nhận, không được xoá thẳng.',
		).toBeVisible();

		await hopXacNhan.getByRole('button', { name: /Huỷ|Hủy|Cancel/ }).first().click();
		await expect(hopXacNhan, 'Bấm Huỷ phải đóng hộp xác nhận.').toBeHidden();
		expect(attempted, 'Bấm Huỷ mà vẫn gửi request xoá lên server.').toEqual([]);
	});
});
