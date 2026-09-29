'use strict';

/**
 * Task 020 — Thêm điểm bán hoặc hub mới. Vai: Tổng công ty (chọn được mọi cấp).
 * Nguồn kỳ vọng: `resource/hdsd/hdsd01_quan_ly_diem_ban/tasks/020_them_diem_ban.md`.
 *
 * 🚫 File này CHỈ chứa case KHÔNG tạo dữ liệu: mở form, kiểm nhãn/trường, validate phía client.
 * Case tạo điểm bán thật nằm riêng và chưa bật — xem README của phân hệ.
 *
 * 🔴 Mọi case bấm **Xác nhận** đều chặn ghi bằng `blockWrites` trước: `VNPOST_BASE_URL` là FE dev
 * server nhưng proxy `/__api` trỏ **API production**, nên nếu sản phẩm không chặn như kỳ vọng thì
 * request tạo điểm bán sẽ đi thẳng lên production.
 */

const { test, expect } = require('@playwright/test');
const {
	blockWrites,
	openCreateDrawer,
	openDropdown,
	openShopList,
	selectByField,
} = require('./shop-page');

/** Chọn Cấp — antd render bằng radio button, không phải Select. */
async function chonCap(drawer, cap) {
	await drawer.getByText(cap, { exact: true }).first().click();
}

/** Ô nhập trong form Thêm nhận theo placeholder — đây là `Input` thật nên có placeholder. */
const nhap = (drawer, placeholder) => drawer.locator(`input[placeholder*="${placeholder}"]`).first();

/** Nhãn của các `Form.Item` đang hiển thị trong drawer. */
async function nhanForm(drawer) {
	// 🔴 `.normalize('NFC')`: nhãn tiếng Việt có thể ở dạng NFD (dấu rời) — so với chuỗi gõ tay
	//    (NFC) sẽ không khớp và test đỏ với lý do vô nghĩa "không thấy nhãn".
	return (await drawer.locator('.ant-form-item-label label').allInnerTexts()).map((x) =>
		x.trim().normalize('NFC'),
	);
}

/** Chờ thân form vẽ xong sau khi chọn Cấp — trước đó `nhanForm` chỉ trả về ['Cấp']. */
async function choThanFormVe(drawer) {
	await expect
		.poll(async () => (await drawer.locator('.ant-form-item-label label').count()), {
			message: 'Chọn Cấp rồi mà thân form vẫn chưa render trường nào.',
			timeout: 15_000,
		})
		.toBeGreaterThan(1);
}

test.describe('01 — Thêm điểm bán / hub (chỉ đọc, không tạo dữ liệu)', () => {
	test.beforeEach(async ({ page }) => {
		await openShopList(page, 'tct');
	});

	test('01_020_007 - Drawer mới mở chỉ có mục Cấp, chưa hiện trường nào khác', async ({ page }) => {
		const drawer = await openCreateDrawer(page);

		// HDSD 020 bước 3: "ban đầu chỉ có mục Cấp". Các trường còn lại chỉ hiện sau khi chọn cấp.
		const labels = await nhanForm(drawer);
		expect(labels, 'Drawer mới mở phải chỉ có mục Cấp.').toEqual(['Cấp']);

		for (const cap of ['TCT', 'Tỉnh', 'Xã']) {
			await expect(
				drawer.getByText(cap, { exact: true }).first(),
				`Mục Cấp phải có lựa chọn "${cap}".`,
			).toBeVisible();
		}
	});

	test('01_020_003 - Chọn cấp Xã hiện đủ nhóm trường của điểm bán', async ({ page }) => {
		const drawer = await openCreateDrawer(page);
		await chonCap(drawer, 'Xã');

		// 🔴 Thân form chỉ render sau khi `orgLevel` vào state (`{!!orgLevel && ...}`). Đọc nhãn ngay
		//    sau cú click là đọc lúc form còn mỗi ô "Cấp" ⇒ đỏ với lý do sai "thiếu trường".
		await choThanFormVe(drawer);
		const labels = await nhanForm(drawer);
		for (const nhan of [
			'Phân loại',
			'Mã điểm bán',
			'Tên điểm bán',
			'Bưu điện tỉnh/thành phố',
			'Bưu điện xã/phường',
			'Tỉnh/TP',
			'Xã/Phường',
		]) {
			expect(labels, `Chọn cấp Xã phải hiện trường "${nhan}".`).toContain(nhan);
		}
	});

	test('01_020_013 - Phân loại phụ thuộc Cấp — chọn cấp Tỉnh thì chỉ còn Hub', async ({ page }) => {
		const drawer = await openCreateDrawer(page);
		await chonCap(drawer, 'Tỉnh');

		// HDSD 020: bảng cấp ↔ phân loại — cấp Tỉnh chỉ tạo được Hub.
		await expect(drawer.getByText('Hub', { exact: true }).first(), 'Cấp Tỉnh phải có phân loại Hub.').toBeVisible();
		await expect(
			drawer.getByText('Pos mini', { exact: true }),
			'Cấp Tỉnh không được có phân loại Pos mini.',
		).toHaveCount(0);
		await expect(
			drawer.getByText('Pos plus', { exact: true }),
			'Cấp Tỉnh không được có phân loại Pos plus.',
		).toHaveCount(0);
	});

	test('01_020_015 - Chọn phân loại Hub thì không có trường Loại hình điểm bán', async ({ page }) => {
		const drawer = await openCreateDrawer(page);
		await chonCap(drawer, 'Tỉnh'); // cấp Tỉnh chỉ có Hub

		// 🔴 Không có bước chờ này thì `nhanForm` trả về ['Cấp'] và `.not.toContain(...)` XANH GIẢ:
		//    đúng cả khi form chưa vẽ gì. Phải chắc thân form đã render rồi mới khẳng định "không có".
		await choThanFormVe(drawer);
		const labels = await nhanForm(drawer);
		expect(
			labels,
			'HDSD 020 bước 6: chọn Hub thì không có trường Loại hình điểm bán.',
		).not.toContain('Loại hình điểm bán');
	});

	test('01_020_005 - Chọn Hub thì nhãn đổi thành Mã Hub / Tên Hub', async ({ page }) => {
		const drawer = await openCreateDrawer(page);
		await chonCap(drawer, 'Tỉnh');

		await choThanFormVe(drawer);
		const labels = await nhanForm(drawer);
		expect(labels, 'Phân loại Hub phải đổi nhãn thành "Mã Hub".').toContain('Mã Hub');
		expect(labels, 'Phân loại Hub phải đổi nhãn thành "Tên Hub".').toContain('Tên Hub');
	});

	test('01_020_011 - Dropdown Bưu điện xã/phường tự lọc theo Bưu điện tỉnh đã chọn', async ({ page }) => {
		const drawer = await openCreateDrawer(page);
		await chonCap(drawer, 'Xã');

		// 🔴 Bám theo NAME của Form.Item, không theo placeholder: placeholder biến mất ngay khi
		//    Select có giá trị, nên lần mở dropdown thứ hai locator sẽ rỗng và treo hết timeout.
		const tinh = selectByField(drawer, 'orgProvinceCode');
		const xa = selectByField(drawer, 'orgWardCode');

		const dsTinh = await openDropdown(page, tinh);
		const tinhOptions = dsTinh.locator('.ant-select-item-option');
		expect(await tinhOptions.count(), 'Cần ít nhất 2 bưu điện tỉnh để đối chiếu.').toBeGreaterThan(1);
		await tinhOptions.nth(0).click();

		const xaLan1 = await (await openDropdown(page, xa)).locator('.ant-select-item-option').allInnerTexts();
		await page.keyboard.press('Escape');

		await (await openDropdown(page, tinh)).locator('.ant-select-item-option').nth(1).click();
		const xaLan2 = await (await openDropdown(page, xa)).locator('.ant-select-item-option').allInnerTexts();

		expect(
			xaLan1.length + xaLan2.length,
			'Cả hai tỉnh đều không có bưu điện xã nào để đối chiếu.',
		).toBeGreaterThan(0);
		expect(
			xaLan2.filter((x) => xaLan1.includes(x)),
			'Đổi bưu điện tỉnh mà danh sách xã không đổi nghĩa là dropdown xã không lọc theo tỉnh.',
		).toEqual([]);
	});

	test('01_020_008 - Bỏ trống Tên điểm bán thì bị chặn, không gửi request tạo', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await openCreateDrawer(page);
		await chonCap(drawer, 'Xã');

		await nhap(drawer, 'Nhập mã điểm bán').fill(`AUTO${Date.now().toString().slice(-6)}`);
		// cố tình bỏ trống Tên điểm bán
		await drawer.getByRole('button', { name: 'Xác nhận' }).click();

		await expect(
			drawer.locator('.ant-form-item-explain-error').first(),
			'Bỏ trống trường bắt buộc phải hiện lỗi validate.',
		).toBeVisible();
		await expect(drawer, 'Form lỗi thì drawer phải còn mở.').toBeVisible();
		expect(attempted, 'Form thiếu trường bắt buộc mà vẫn gửi request tạo lên server.').toEqual([]);
	});

	test('01_020_009 - Bỏ trống Bưu điện tỉnh/thành phố thì bị chặn, không gửi request tạo', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await openCreateDrawer(page);
		await chonCap(drawer, 'Xã');

		await nhap(drawer, 'Nhập mã điểm bán').fill(`AUTO${Date.now().toString().slice(-6)}`);
		await nhap(drawer, 'Nhập tên điểm bán').fill('AUTO kiem tra validate');
		// cố tình bỏ trống Bưu điện tỉnh/thành phố
		await drawer.getByRole('button', { name: 'Xác nhận' }).click();

		await expect(
			drawer.locator('.ant-form-item-explain-error').first(),
			'Bỏ trống Bưu điện tỉnh/thành phố phải hiện lỗi validate.',
		).toBeVisible();
		expect(attempted, 'Form thiếu trường bắt buộc mà vẫn gửi request tạo lên server.').toEqual([]);
	});

	test('01_020_010 - Tên điểm bán bị giới hạn độ dài theo UI', async ({ page }) => {
		const drawer = await openCreateDrawer(page);
		await chonCap(drawer, 'Xã');

		const o = nhap(drawer, 'Nhập tên điểm bán');
		await o.fill('A'.repeat(250));
		const value = await o.inputValue();

		// Kịch bản nêu giới hạn 200. Không đoán con số: chỉ khẳng định UI CÓ chặn, và ghi lại số thật.
		test.info().annotations.push({ type: 'đo được', description: `Độ dài tối đa nhận vào: ${value.length}` });
		expect(value.length, 'Ô Tên điểm bán không giới hạn độ dài — nhập 250 ký tự vẫn nhận đủ.').toBeLessThan(250);
	});
});
