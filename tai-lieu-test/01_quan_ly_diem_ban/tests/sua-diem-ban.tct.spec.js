'use strict';

/**
 * Task 030 — Sửa thông tin điểm bán. Chỉ các case KHÔNG lưu thay đổi.
 * Nguồn kỳ vọng: `resource/hdsd/hdsd01_quan_ly_diem_ban/tasks/030_sua_diem_ban.md`.
 *
 * 🔴 Case bấm Xác nhận đều chặn ghi bằng `blockWrites`: proxy trỏ API production, nếu sản phẩm
 * không chặn như kỳ vọng thì bản ghi thật bị sửa.
 */

const { test, expect } = require('@playwright/test');
const {
	blockWrites,
	firstNonHubRow,
	openEditDrawer,
	openShopList,
	rows,
	selectByField,
} = require('./shop-page');

// 🔴 `.normalize('NFC')`: nhãn tiếng Việt do FE render có thể ở dạng NFD (dấu rời), so với
//    chuỗi gõ tay (NFC) sẽ không khớp và test đỏ với lý do vô nghĩa "không thấy nhãn".
const nhanForm = async (drawer) =>
	(await drawer.locator('.ant-form-item-label label').allInnerTexts()).map((x) =>
		x.trim().normalize('NFC'),
	);

/** Lỗi validate đang hiện, chuẩn hoá NFC. 🔴 Dùng kèm `expect.poll` — antd vẽ thông báo trễ một nhịp. */
const loiValidate = async (drawer) =>
	(await drawer.locator('.ant-form-item-explain-error').allInnerTexts()).map((x) =>
		x.trim().normalize('NFC'),
	);

test.describe('01 — Sửa điểm bán / hub (chỉ đọc, không lưu thay đổi)', () => {
	test.beforeEach(async ({ page }) => {
		await openShopList(page, 'tct');
		expect(await rows(page).count(), 'Không có điểm bán nào để mở màn Sửa.').toBeGreaterThan(0);
	});

	test('01_030_006 - Phân loại và Mã điểm bán hiển thị mờ, không sửa được', async ({ page }) => {
		const drawer = await openEditDrawer(page);

		const labels = await nhanForm(drawer);
		const nhanMa = labels.find((x) => /^Mã (điểm bán|Hub)$/.test(x));
		expect(nhanMa, 'Drawer Sửa phải có trường Mã điểm bán / Mã Hub.').toBeTruthy();

		const oMa = drawer.locator('input[placeholder*="Nhập mã"]').first();
		await expect(oMa, 'HDSD 030 — Mã điểm bán phải hiển thị mờ, không sửa được.').toBeDisabled();

		const phanLoai = drawer.locator('.ant-radio-group').first();
		const disabled = await phanLoai.locator('input[type="radio"]').evaluateAll((l) => l.every((e) => e.disabled));
		expect(disabled, 'HDSD 030 — Phân loại phải hiển thị mờ, không sửa được.').toBe(true);
	});

	test('01_030_005 - Đóng drawer Sửa bằng nút X thì dữ liệu không đổi', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const tenTruoc = (await rows(page).first().locator('td').nth(1).innerText()).trim();

		const drawer = await openEditDrawer(page);
		await drawer.locator('input[placeholder*="Nhập tên"]').first().fill('AUTO khong duoc luu');
		await drawer.locator('.ant-drawer-close').first().click();

		await expect(drawer, 'Bấm X phải đóng drawer.').toBeHidden();
		await expect(
			rows(page).first().locator('td').nth(1),
			'Đóng bằng X mà tên trong danh sách đổi nghĩa là đã lưu nhầm.',
		).toHaveText(tenTruoc);
		expect(attempted, 'Đóng drawer bằng X không được gửi request cập nhật.').toEqual([]);
	});

	test('01_030_003 - Chỉnh sửa bỏ trống Tên điểm bán thì bị chặn, không gửi request cập nhật', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await openEditDrawer(page);

		await drawer.locator('input[placeholder*="Nhập tên"]').first().fill('');
		await drawer.getByRole('button', { name: 'Xác nhận' }).click();

		await expect(
			drawer.locator('.ant-form-item-explain-error').first(),
			'Bỏ trống Tên điểm bán phải hiện lỗi validate.',
		).toBeVisible();
		expect(attempted, 'Form thiếu trường bắt buộc mà vẫn gửi request cập nhật lên server.').toEqual([]);
	});

	test('01_030_004 - Chỉnh sửa bỏ trống Bưu điện tỉnh/thành phố thì bị chặn', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await openEditDrawer(page);

		const oTinh = drawer.locator('.ant-select').filter({ hasText: /bưu điện tỉnh/i }).first();
		if ((await oTinh.count()) === 0) {
			test.info().annotations.push({
				type: 'thiếu dữ liệu',
				description: 'Điểm bán đầu tiên không có trường Bưu điện tỉnh/thành phố (thường là Hub cấp TCT).',
			});
			test.skip(true, 'Dòng đầu không có trường Bưu điện tỉnh/thành phố.');
		}

		await oTinh.hover();
		await oTinh.locator('.ant-select-clear').first().click();
		await drawer.getByRole('button', { name: 'Xác nhận' }).click();

		await expect(
			drawer.locator('.ant-form-item-explain-error').first(),
			'Bỏ trống Bưu điện tỉnh/thành phố phải hiện lỗi validate.',
		).toBeVisible();
		expect(attempted, 'Form thiếu trường bắt buộc mà vẫn gửi request cập nhật lên server.').toEqual([]);
	});

	test('01_030_007 - Form Sửa không có ô Cấp và Phân loại bị vô hiệu', async ({ page }) => {
		const drawer = await openEditDrawer(page);

		const labels = await nhanForm(drawer);
		// Trace: `DrawerCreateShop.jsx` chỉ render Form.Item `orgLevel` khi KHÔNG có record.
		expect(labels, 'Drawer Sửa không được có ô "Cấp" — đó là ô của luồng Thêm mới.').not.toContain('Cấp');

		const phanLoai = drawer.locator('.ant-radio-group').first();
		await expect(phanLoai, 'Drawer Sửa vẫn phải HIỂN THỊ Phân loại (chỉ là không sửa được).').toBeVisible();
		const khoaHet = await phanLoai
			.locator('input[type="radio"]')
			.evaluateAll((l) => l.length > 0 && l.every((e) => e.disabled));
		expect(khoaHet, 'Phân loại trong drawer Sửa phải bị vô hiệu toàn bộ.').toBe(true);

		// Bù lại, drawer Sửa có thêm ô Trạng thái với đúng hai lựa chọn.
		expect(labels, 'Drawer Sửa phải có thêm ô "Trạng thái".').toContain('Trạng thái');
		// 🔴 LỆCH TÀI LIỆU: kịch bản viết lựa chọn thứ hai là "Ngừng hoạt động", nhãn THẬT trong
		//    `shopOperatingStatus.js` là "Tạm ngừng" (cùng chuỗi đang dùng ở bộ lọc và cột Trạng
		//    thái). Bám theo code; cần user chốt sửa chữ trong kịch bản.
		for (const nhan of ['Đang hoạt động', 'Tạm ngừng']) {
			await expect(
				drawer.getByText(nhan, { exact: true }).first(),
				`Ô Trạng thái phải có lựa chọn "${nhan}".`,
			).toBeVisible();
		}
	});

	test('01_030_008 - Sửa: xoá trắng Email thì bị chặn', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await openEditDrawer(page);

		const o = drawer.locator('input[placeholder*="Nhập email"]').first();
		expect(await o.inputValue(), 'Điểm bán đang mở không có Email sẵn để xoá.').not.toBe('');
		await o.fill('');
		await drawer.getByRole('button', { name: 'Xác nhận' }).click();

		await expect
			.poll(() => loiValidate(drawer), { message: 'Xoá trắng Email phải bị chặn.', timeout: 10_000 })
			.toContain('Vui lòng nhập email');
		expect(attempted, 'Thiếu Email mà vẫn gửi PUT cập nhật lên server.').toEqual([]);
	});

	test('01_030_009 - Sửa: Số điện thoại sai định dạng thì bị chặn', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await openEditDrawer(page);

		await drawer.locator('input[placeholder*="Nhập số điện thoại"]').first().fill('12ab');
		await drawer.getByRole('button', { name: 'Xác nhận' }).click();

		await expect
			.poll(() => loiValidate(drawer), {
				message: 'Số điện thoại "12ab" phải bị chặn với thông báo "Số điện thoại không hợp lệ".',
				timeout: 10_000,
			})
			.toContain('Số điện thoại không hợp lệ');
		expect(attempted, 'Số điện thoại sai định dạng mà vẫn gửi PUT cập nhật.').toEqual([]);
	});

	test('01_030_010 - Sửa: xoá trắng Loại hình điểm bán thì bị chặn', async ({ page }) => {
		const { attempted } = await blockWrites(page);

		// 🔴 Ô "Loại hình điểm bán" chỉ tồn tại khi Phân loại ≠ Hub ⇒ phải mở một dòng KHÔNG phải Hub.
		const dong = await firstNonHubRow(page);
		if (dong === null) {
			test.info().annotations.push({
				type: 'thiếu dữ liệu',
				description: 'Trang đầu của danh sách toàn Hub — Hub không có ô Loại hình điểm bán.',
			});
			test.skip(true, 'Không có dòng nào khác Hub để mở.');
		}
		const drawer = await openEditDrawer(page, dong);

		const oLoaiHinh = selectByField(drawer, 'distributionMethod');
		await expect(oLoaiHinh, 'Điểm bán không phải Hub phải có ô Loại hình điểm bán.').toHaveCount(1);

		// Select mode="multiple": xoá từng thẻ đã chọn bằng nút ✕ trên thẻ.
		const the = oLoaiHinh.locator('.ant-select-item-remove, .ant-tag-close-icon, .anticon-close');
		const soThe = await the.count();
		expect(soThe, 'Điểm bán đang mở chưa chọn Loại hình nào nên không có gì để xoá.').toBeGreaterThan(0);
		for (let i = 0; i < soThe; i += 1) await the.first().click();

		await drawer.getByRole('button', { name: 'Xác nhận' }).click();
		await expect
			.poll(() => loiValidate(drawer), {
				message: 'Xoá hết Loại hình điểm bán phải bị chặn.',
				timeout: 10_000,
			})
			.toContain('Vui lòng chọn loại hình điểm bán');
		expect(attempted, 'Thiếu Loại hình điểm bán mà vẫn gửi PUT cập nhật.').toEqual([]);
	});
});
