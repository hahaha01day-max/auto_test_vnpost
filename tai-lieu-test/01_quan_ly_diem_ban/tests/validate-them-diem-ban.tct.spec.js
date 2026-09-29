'use strict';

/**
 * Task 020 — validate phía client của form **Thêm điểm bán**. Vai: Tổng công ty.
 *
 * 🔴 Mọi case ở đây đều BẤM "Xác nhận" — đó chính là hành vi cần kiểm. Nhưng `VNPOST_BASE_URL` là
 * FE dev server và `rsbuild.config.js` proxy `/__api` sang **API production**, nên request tạo
 * điểm bán mà lọt ra là ghi thật. Vì vậy file này chặn ghi ở tầng mạng bằng `blockWrites` TRƯỚC
 * khi mở drawer, rồi assert trên danh sách `attempted`:
 *   - `attempted` rỗng   ⇒ sản phẩm chặn được ở client (đúng kỳ vọng của case validate).
 *   - `attempted` có mục ⇒ sản phẩm KHÔNG chặn — đó là phát hiện, không phải lỗi script.
 *
 * Nguồn kỳ vọng: `DrawerCreateShop.jsx` (đọc trực tiếp, không suy từ HDSD):
 *   shopCode  required "Vui lòng nhập mã {Hub|điểm bán}"      · maxLength 50
 *   shopName  required "Vui lòng nhập tên {Hub|điểm bán}"      · maxLength 200
 *   distributionMethod required "Vui lòng chọn loại hình điểm bán"  (ẩn khi Phân loại = Hub)
 *   orgProvinceCode / orgWardCode required "Vui lòng chọn bưu điện xã"
 *   email     required "Vui lòng nhập email" + type email "Email không đúng định dạng"
 *   shopPhone required "Vui lòng nhập số điện thoại" + PHONE_PATTERN "Số điện thoại không hợp lệ"
 *   managerPhone KHÔNG required, chỉ PHONE_PATTERN
 *   address / province / ward KHÔNG required
 *   shopLat  -90..90   "Vĩ độ phải là số từ -90 đến 90"
 *   shopLong -180..180 "Kinh độ phải là số từ -180 đến 180"
 */

const { test, expect } = require('@playwright/test');
const {
	blockWrites,
	openCreateDrawer,
	openDropdown,
	openShopList,
	reloadBy,
	rows,
	searchBox,
	selectByField,
	selectValue,
} = require('./shop-page');

/** Chọn Cấp / Phân loại — antd render bằng radio button, không phải Select. */
async function chon(drawer, nhan) {
	const nut = drawer.getByText(nhan, { exact: true }).first();
	await expect(nut, `Không thấy lựa chọn "${nhan}".`).toBeVisible();
	await nut.click();
}

const nhap = (drawer, placeholder) => drawer.locator(`input[placeholder*="${placeholder}"]`).first();

/** Lỗi validate đang hiện, chuẩn hoá NFC để so với chuỗi gõ tay. */
const loiValidate = async (drawer) =>
	(await drawer.locator('.ant-form-item-explain-error').allInnerTexts()).map((x) =>
		x.trim().normalize('NFC'),
	);

/** Mở drawer Thêm ở cấp Xã / Pos mini — trạng thái nền của gần hết case task 020. */
async function moFormPosMini(page) {
	const drawer = await openCreateDrawer(page);
	await chon(drawer, 'Xã');
	await chon(drawer, 'Pos mini');
	return drawer;
}

/**
 * Điền đủ 7 ô bắt buộc, trừ những ô nêu trong `boTrong`.
 * 🔴 Bưu điện xã chỉ nạp lựa chọn SAU khi đã chọn Bưu điện tỉnh — đừng đảo thứ tự.
 */
async function dienDayDu(page, drawer, { boTrong = [], ghiDe = {} } = {}) {
	const dau = Date.now().toString().slice(-6);
	const bo = (ten) => boTrong.includes(ten);

	if (!bo('shopCode')) await nhap(drawer, 'Nhập mã').fill(ghiDe.shopCode ?? `AUTOVLD${dau}`);
	if (!bo('shopName')) await nhap(drawer, 'Nhập tên').fill(ghiDe.shopName ?? `AUTO TEST VALIDATE ${dau}`);
	if (!bo('email')) await nhap(drawer, 'Nhập email').fill(ghiDe.email ?? `autotest${dau}@example.com`);
	if (!bo('shopPhone')) await nhap(drawer, 'Nhập số điện thoại').fill(ghiDe.shopPhone ?? '0900000000');
	if (ghiDe.managerPhone) await nhap(drawer, 'Nhập SĐT quản lý').fill(ghiDe.managerPhone);

	if (!bo('distributionMethod')) {
		const loaiHinh = drawer.locator('.ant-select').filter({ hasText: 'Chọn loại hình' }).first();
		if (await loaiHinh.count()) {
			await (await openDropdown(page, loaiHinh)).locator('.ant-select-item-option').first().click();
			await page.keyboard.press('Escape');
		}
	}
	if (!bo('orgProvinceCode')) {
		const ds = await openDropdown(page, selectByField(drawer, 'orgProvinceCode'));
		await ds.locator('.ant-select-item-option').first().click();
	}
	if (!bo('orgWardCode')) {
		const chonXa = selectByField(drawer, 'orgWardCode');
		const ds = await openDropdown(page, chonXa);
		await expect
			.poll(() => ds.locator('.ant-select-item-option').count(), {
				message: 'Dropdown Bưu điện xã/phường không nạp được lựa chọn nào.',
				timeout: 20_000,
			})
			.toBeGreaterThan(0);
		await ds.locator('.ant-select-item-option').first().click();
	}
	return dau;
}

const xacNhan = (drawer) => drawer.getByRole('button', { name: 'Xác nhận' }).first().click();

test.describe('01 — Thêm điểm bán: validate phía client (không ghi dữ liệu)', () => {
	/** @type {{attempted: string[]}} */
	let ghi;

	test.beforeEach(async ({ page }) => {
		// 🔴 Chặn ghi TRƯỚC khi mở màn: đăng ký muộn là có cửa sổ request lọt ra production.
		ghi = await blockWrites(page);
		await openShopList(page, 'tct');
	});

	test('01_020_016 - Chưa chọn Cấp thì form không hiện ô nhập nào', async ({ page }) => {
		const drawer = await openCreateDrawer(page);

		// Trace: `DrawerCreateShop.jsx` bọc toàn bộ thân form trong `{!!orgLevel && ...}`.
		await expect(
			drawer.locator('input[placeholder*="Nhập mã"]'),
			'Chưa chọn Cấp mà đã hiện ô nhập.',
		).toHaveCount(0);
		await expect(drawer, 'Phải có dòng hướng dẫn chọn cấp.').toContainText(/Chọn cấp để nhập thông tin/i);

		await xacNhan(drawer);
		// 🔴 `allInnerTexts()` KHÔNG chờ: đọc ngay sau click là đọc lúc antd chưa vẽ xong thông báo
		//    ⇒ mảng rỗng và case đỏ với lý do sai. Phải poll.
		await expect
			.poll(() => loiValidate(drawer), {
				message: 'Bỏ trống Cấp phải báo đúng "Vui lòng chọn cấp".',
				timeout: 10_000,
			})
			.toContain('Vui lòng chọn cấp');
		expect(ghi.attempted, 'Chưa chọn Cấp mà vẫn gửi request tạo lên server.').toEqual([]);
	});

	test('01_020_017 - Bỏ trống Mã điểm bán', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer, { boTrong: ['shopCode'] });
		await xacNhan(drawer);

		expect(await loiValidate(drawer), 'Bỏ trống Mã điểm bán phải báo đúng nguyên văn.').toContain('Vui lòng nhập mã điểm bán');
		expect(ghi.attempted, 'Thiếu Mã điểm bán mà vẫn gửi request tạo.').toEqual([]);

		// Đổi sang Hub thì nhãn và thông báo phải đổi theo (cùng một Form.Item, message động).
		await page.locator('.ant-drawer-close').first().click();
		const drawerHub = await openCreateDrawer(page);
		await chon(drawerHub, 'Tỉnh'); // cấp Tỉnh chỉ có phân loại Hub
		await xacNhan(drawerHub);
		expect(
			await loiValidate(drawerHub),
			'Phân loại Hub thì thông báo phải đổi thành "Vui lòng nhập mã Hub".',
		).toContain('Vui lòng nhập mã Hub');
	});

	test('01_020_018 - Bỏ trống Loại hình điểm bán', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer, { boTrong: ['distributionMethod'] });
		await xacNhan(drawer);

		expect(await loiValidate(drawer), 'Bỏ trống Loại hình điểm bán phải báo đúng nguyên văn.').toContain('Vui lòng chọn loại hình điểm bán');
		expect(ghi.attempted, 'Thiếu Loại hình điểm bán mà vẫn gửi request tạo.').toEqual([]);
	});

	test('01_020_019 - Bỏ trống Bưu điện xã/phường', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer, { boTrong: ['orgWardCode'] });
		await xacNhan(drawer);

		expect(await loiValidate(drawer), 'Bỏ trống Bưu điện xã/phường phải báo đúng nguyên văn.').toContain('Vui lòng chọn bưu điện xã');
		expect(ghi.attempted, 'Thiếu Bưu điện xã mà vẫn gửi request tạo.').toEqual([]);
	});

	test('01_020_020 - Bỏ trống Email', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer, { boTrong: ['email'] });
		await xacNhan(drawer);

		// 🔴 LỖ HỔNG ĐẶC TẢ: HDSD 020 không khai Email là bắt buộc, code thì required. Giữ nguyên
		//    kỳ vọng theo CODE và báo lệch, 🚫 không tự sửa tài liệu.
		expect(await loiValidate(drawer), 'Bỏ trống Email phải báo đúng nguyên văn.').toContain('Vui lòng nhập email');
		expect(ghi.attempted, 'Thiếu Email mà vẫn gửi request tạo.').toEqual([]);
	});

	test('01_020_021 - Bỏ trống Số điện thoại', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer, { boTrong: ['shopPhone'] });
		await xacNhan(drawer);

		expect(await loiValidate(drawer), 'Bỏ trống Số điện thoại phải báo đúng nguyên văn.').toContain('Vui lòng nhập số điện thoại');
		expect(ghi.attempted, 'Thiếu Số điện thoại mà vẫn gửi request tạo.').toEqual([]);
	});

	test('01_020_022 - Bấm Xác nhận khi bỏ trống TẤT CẢ ô bắt buộc', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await xacNhan(drawer);

		const loi = await loiValidate(drawer);
		for (const nguyenVan of [
			'Vui lòng nhập mã điểm bán',
			'Vui lòng nhập tên điểm bán',
			'Vui lòng chọn loại hình điểm bán',
			'Vui lòng chọn bưu điện xã',
			'Vui lòng nhập email',
			'Vui lòng nhập số điện thoại',
		]) {
			expect(loi, `Thiếu thông báo "${nguyenVan}" khi bỏ trống toàn bộ form.`).toContain(nguyenVan);
		}
		// Bưu điện tỉnh cũng bắt buộc; thông báo do `DrawerCreateShop.jsx` sinh động theo cấp.
		expect(loi.length, 'Bỏ trống cả form phải hiện lỗi ở 7 ô bắt buộc.').toBeGreaterThanOrEqual(7);
		expect(ghi.attempted, 'Form trống trơn mà vẫn gửi request tạo.').toEqual([]);
	});

	test('01_020_023 - Tên điểm bán nhập toàn khoảng trắng', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer, { ghiDe: { shopName: ' '.repeat(10) } });
		await xacNhan(drawer);

		// 🔴 Case PHƠI HÀNH VI. Rule chỉ có `required: true` (không `whitespace`), nên antd coi
		//    chuỗi khoảng trắng là ĐÃ nhập ⇒ request được gửi. `blockWrites` giữ nó lại ở tầng
		//    mạng nên production không bị ghi, và `attempted` chính là bằng chứng.
		const loi = await loiValidate(drawer);
		test.info().annotations.push({
			type: 'đo được',
			description: `Tên = 10 dấu cách ⇒ lỗi client: ${loi.join(' · ') || '(không có)'} · request đã gửi: ${ghi.attempted.join(', ') || '(không có)'}.`,
		});

		expect(
			loi.length > 0 || ghi.attempted.length > 0,
			'Nhập tên toàn khoảng trắng mà form không báo lỗi cũng không gửi request — không đo được hành vi nào.',
		).toBe(true);
		if (loi.length === 0) {
			test.info().annotations.push({
				type: 'lệch kỳ vọng nghiệp vụ',
				description:
					'FE KHÔNG chặn tên toàn khoảng trắng (rule thiếu `whitespace: true`) — điểm bán không tên phụ thuộc hoàn toàn vào backend. Cần user quyết có ghi phiếu không.',
			});
		}
	});

	test('01_020_024 - Mã điểm bán nhập toàn khoảng trắng', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer, { ghiDe: { shopCode: ' '.repeat(5) } });
		await xacNhan(drawer);

		const loi = await loiValidate(drawer);
		test.info().annotations.push({
			type: 'đo được',
			description: `Mã = 5 dấu cách ⇒ lỗi client: ${loi.join(' · ') || '(không có)'} · request đã gửi: ${ghi.attempted.join(', ') || '(không có)'}.`,
		});

		expect(
			loi.length > 0 || ghi.attempted.length > 0,
			'Nhập mã toàn khoảng trắng mà form không báo lỗi cũng không gửi request — không đo được hành vi nào.',
		).toBe(true);
		if (loi.length === 0) {
			test.info().annotations.push({
				type: 'lệch kỳ vọng nghiệp vụ',
				description:
					'Mã điểm bán là khoá nghiệp vụ nhưng FE nhận chuỗi toàn khoảng trắng (rule thiếu `whitespace: true`). Chặn thật nằm ở backend — cần đo riêng trên môi trường được phép ghi.',
			});
		}
	});

	test('01_020_025 - Mã điểm bán tại biên 50 ký tự và vượt 50', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		const o = nhap(drawer, 'Nhập mã');

		// Trace: `Input maxLength={50}` ⇒ cắt im lặng, KHÔNG báo lỗi.
		const doDai = {};
		for (const n of [49, 50, 51]) {
			await o.fill('A'.repeat(n));
			doDai[n] = (await o.inputValue()).length;
		}
		test.info().annotations.push({
			type: 'đo được',
			description: `Dán 49 ⇒ nhận ${doDai[49]} · dán 50 ⇒ nhận ${doDai[50]} · dán 51 ⇒ nhận ${doDai[51]}.`,
		});

		expect(doDai[49], 'Chuỗi 49 ký tự phải được nhận nguyên văn.').toBe(49);
		expect(doDai[50], 'Chuỗi 50 ký tự (biên) phải được nhận nguyên văn.').toBe(50);
		expect(doDai[51], 'Chuỗi 51 ký tự phải bị cắt còn đúng 50 theo maxLength.').toBe(50);
		expect(await loiValidate(drawer), 'maxLength cắt im lặng, không được kèm thông báo lỗi.').toEqual([]);
	});

	test('01_020_026 - Email sai định dạng', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer);

		for (const xau of ['abc', 'abc@', 'abc@xyz', 'a b@c.vn']) {
			await nhap(drawer, 'Nhập email').fill(xau);
			await xacNhan(drawer);
			expect(
				await loiValidate(drawer),
				`Email "${xau}" phải bị chặn với thông báo "Email không đúng định dạng".`,
			).toContain('Email không đúng định dạng');
		}
		expect(ghi.attempted, 'Email sai định dạng mà vẫn gửi request tạo.').toEqual([]);
	});

	test('01_020_027 - Số điện thoại sai định dạng', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer);

		const ketQua = {};
		for (const xau of ['abcdefgh', '123', '0912-345-678', '+84 912 345 678']) {
			await nhap(drawer, 'Nhập số điện thoại').fill(xau);
			await xacNhan(drawer);
			const loi = await loiValidate(drawer);
			ketQua[xau] = loi.includes('Số điện thoại không hợp lệ') ? 'chặn' : `KHÔNG chặn (lỗi khác: ${loi.join(' · ') || 'không có'})`;
		}
		test.info().annotations.push({
			type: 'đo được',
			description: Object.entries(ketQua).map(([k, v]) => `"${k}" ⇒ ${v}`).join(' · '),
		});

		for (const xau of ['abcdefgh', '123']) {
			expect(ketQua[xau], `"${xau}" chắc chắn không phải số điện thoại hợp lệ, phải bị chặn.`).toBe('chặn');
		}
		expect(ghi.attempted, 'Số điện thoại sai định dạng mà vẫn gửi request tạo.').toEqual([]);
	});

	test('01_020_028 - SĐT người quản lý: bỏ trống được, nhưng sai định dạng thì bị chặn', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer); // bỏ trống managerPhone
		await xacNhan(drawer);

		// Phần 1: ô này KHÔNG bắt buộc ⇒ form qua được validate và GỬI request.
		// 🔴 `blockWrites` giữ request lại nên môi trường không bị ghi; `attempted` là bằng chứng
		//    "form đã qua validate", thay cho việc thật sự tạo một điểm bán rác.
		await expect
			.poll(() => ghi.attempted.length, {
				message: 'Bỏ trống SĐT người quản lý mà form vẫn không qua được validate ⇒ ô này đang bị coi là bắt buộc.',
				timeout: 20_000,
			})
			.toBeGreaterThan(0);

		// Phần 2: nhập sai định dạng thì bị chặn.
		const truoc = ghi.attempted.length;
		await nhap(drawer, 'Nhập SĐT quản lý').fill('abc123');
		await xacNhan(drawer);
		expect(await loiValidate(drawer), 'SĐT người quản lý sai định dạng phải bị chặn.').toContain('Số điện thoại không hợp lệ');
		expect(ghi.attempted.length, 'SĐT người quản lý sai định dạng mà vẫn gửi thêm request.').toBe(truoc);
	});

	test('01_020_029 - Vĩ độ ngoài khoảng cho phép', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer);
		const o = drawer.locator('input[placeholder="21.028511"]').first();

		for (const hopLe of ['-90', '90']) {
			await o.fill(hopLe);
			await xacNhan(drawer);
			expect(
				await loiValidate(drawer),
				`Vĩ độ ${hopLe} nằm ở biên đóng, phải được chấp nhận.`,
			).not.toContain('Vĩ độ phải là số từ -90 đến 90');
		}
		for (const sai of ['90.1', '-91']) {
			await o.fill(sai);
			await xacNhan(drawer);
			expect(await loiValidate(drawer), `Vĩ độ ${sai} phải bị chặn.`).toContain('Vĩ độ phải là số từ -90 đến 90');
		}
	});

	test('01_020_030 - Kinh độ ngoài khoảng cho phép', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer);
		const o = drawer.locator('input[placeholder="105.804817"]').first();

		for (const hopLe of ['-180', '180']) {
			await o.fill(hopLe);
			await xacNhan(drawer);
			expect(
				await loiValidate(drawer),
				`Kinh độ ${hopLe} nằm ở biên đóng, phải được chấp nhận.`,
			).not.toContain('Kinh độ phải là số từ -180 đến 180');
		}
		for (const sai of ['180.5', '-181']) {
			await o.fill(sai);
			await xacNhan(drawer);
			expect(await loiValidate(drawer), `Kinh độ ${sai} phải bị chặn.`).toContain('Kinh độ phải là số từ -180 đến 180');
		}
	});

	test('01_020_031 - Vĩ độ / Kinh độ nhập chữ', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer);

		// Trace: validator dùng `Number(value)` ⇒ chuỗi chữ ra NaN ⇒ reject.
		await drawer.locator('input[placeholder="21.028511"]').first().fill('hai mốt phẩy không');
		await xacNhan(drawer);
		expect(await loiValidate(drawer), 'Vĩ độ nhập chữ phải bị chặn.').toContain('Vĩ độ phải là số từ -90 đến 90');

		await drawer.locator('input[placeholder="21.028511"]').first().fill('21.02');
		await drawer.locator('input[placeholder="105.804817"]').first().fill('một trăm linh năm');
		await xacNhan(drawer);
		expect(await loiValidate(drawer), 'Kinh độ nhập chữ phải bị chặn.').toContain('Kinh độ phải là số từ -180 đến 180');
		expect(ghi.attempted, 'Toạ độ không phải số mà vẫn gửi request tạo.').toEqual([]);
	});

	test('01_020_034 - Đổi Tỉnh/TP thì ô Xã/Phường bị xoá giá trị cũ', async ({ page }) => {
		const drawer = await moFormPosMini(page);

		// 🔴 Đây là Tỉnh/TP **hành chính** (`province` / `ward`), khác nhóm Bưu điện tỉnh/xã.
		const tinh = selectByField(drawer, 'province');
		const xa = selectByField(drawer, 'ward');

		const dsTinh = await openDropdown(page, tinh);
		expect(await dsTinh.locator('.ant-select-item-option').count(), 'Cần ít nhất 2 tỉnh/TP để đối chiếu.').toBeGreaterThan(1);
		await dsTinh.locator('.ant-select-item-option').nth(0).click();

		const dsXa = await openDropdown(page, xa);
		await expect
			.poll(() => dsXa.locator('.ant-select-item-option').count(), {
				message: 'Tỉnh đầu tiên không có xã/phường nào để chọn.',
				timeout: 20_000,
			})
			.toBeGreaterThan(0);
		const xaCu = (await dsXa.locator('.ant-select-item-option').first().innerText()).trim();
		await dsXa.locator('.ant-select-item-option').first().click();
		await expect(selectValue(xa), 'Chưa chọn được xã ở tỉnh thứ nhất.').toHaveText(xaCu);

		// Đổi sang tỉnh thứ hai — trace: `onSelect` gọi `form.setFieldValue("ward", null)`.
		// 🔴 Danh sách xã nạp bằng `GET /region?parent_id=<tỉnh>` (chainApi.js `getLocationList`).
		//    Mở dropdown ngay sau khi đổi tỉnh là đọc trúng danh sách CŨ còn trong cache — phải
		//    chờ đúng response của tỉnh mới, nếu không case đỏ oan và đổ lỗi nhầm cho sản phẩm.
		const choXaMoi = page.waitForResponse(
			(r) => r.url().includes('/region') && r.request().method() === 'GET',
			{ timeout: 30_000 },
		);
		await (await openDropdown(page, tinh)).locator('.ant-select-item-option').nth(1).click();
		await choXaMoi;
		await expect(
			selectValue(xa),
			`Đổi Tỉnh/TP mà ô Xã/Phường vẫn giữ "${xaCu}" của tỉnh cũ.`,
		).toHaveCount(0);

		const dsXa2 = await openDropdown(page, xa);
		const xaMoi = await dsXa2.locator('.ant-select-item-option').allInnerTexts();
		if (xaMoi.length > 0) {
			expect(xaMoi.map((x) => x.trim()), 'Dropdown Xã/Phường vẫn liệt kê xã của tỉnh cũ.').not.toContain(xaCu);
		}
	});

	test('01_020_035 - Bấm Hủy giữa chừng thì không tạo bản ghi', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		const dau = await dienDayDu(page, drawer);

		await drawer.getByRole('button', { name: 'Hủy' }).first().click();
		await expect(drawer, 'Bấm Hủy phải đóng drawer.').toBeHidden();
		expect(ghi.attempted, 'Bấm Hủy mà vẫn gửi request tạo lên server.').toEqual([]);

		// Và danh sách không được mọc thêm mã vừa nhập.
		await reloadBy(page, () => searchBox(page).fill(`AUTOVLD${dau}`));
		await expect(rows(page), 'Bấm Hủy mà mã vừa nhập vẫn xuất hiện trong danh sách.').toHaveCount(0);
	});

	test('01_020_036 - Đóng drawer bằng X rồi mở lại thì form trắng', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await nhap(drawer, 'Nhập tên').fill('AUTO TEST KHONG DUOC GIU LAI');
		await nhap(drawer, 'Nhập mã').fill('AUTOKHONGGIU');

		await drawer.locator('.ant-drawer-close').first().click();
		await expect(drawer, 'Bấm X phải đóng drawer.').toBeHidden();

		// Trace: Drawer có `destroyOnHidden` ⇒ mở lại là form mới hoàn toàn.
		const lai = await openCreateDrawer(page);
		await expect(
			lai.locator('input[placeholder*="Nhập mã"]'),
			'Mở lại phải về trạng thái chưa chọn Cấp (chưa có ô nhập nào).',
		).toHaveCount(0);
		await expect(lai, 'Mở lại phải hiện dòng hướng dẫn chọn cấp.').toContainText(/Chọn cấp để nhập thông tin/i);

		await chon(lai, 'Xã');
		await chon(lai, 'Pos mini');
		expect(await nhap(lai, 'Nhập tên').inputValue(), 'Form mở lại vẫn giữ Tên của lần trước.').toBe('');
		expect(await nhap(lai, 'Nhập mã').inputValue(), 'Form mở lại vẫn giữ Mã của lần trước.').toBe('');
	});

	test('01_020_038 - Bỏ trống Tỉnh/TP và Xã/Phường (địa chỉ hành chính) vẫn qua được validate', async ({ page }) => {
		const drawer = await moFormPosMini(page);
		await dienDayDu(page, drawer); // không chạm Địa chỉ chi tiết / Tỉnh/TP / Xã/Phường
		await xacNhan(drawer);

		// 🔴 Ba ô này KHÔNG có rule required trong `DrawerCreateShop.jsx` — khác hẳn nhóm
		//    "Bưu điện tỉnh/xã". Bằng chứng là form qua validate và GỬI request (bị `blockWrites`
		//    giữ lại), 🚫 không cần tạo một điểm bán rác để chứng minh.
		await expect
			.poll(() => ghi.attempted.length, {
				message: 'Bỏ trống Địa chỉ / Tỉnh/TP / Xã/Phường mà form không qua được validate ⇒ ba ô này đang bị coi là bắt buộc.',
				timeout: 20_000,
			})
			.toBeGreaterThan(0);
		expect(await loiValidate(drawer), 'Không được có lỗi validate nào khi ba ô không bắt buộc bị bỏ trống.').toEqual([]);
	});
});
