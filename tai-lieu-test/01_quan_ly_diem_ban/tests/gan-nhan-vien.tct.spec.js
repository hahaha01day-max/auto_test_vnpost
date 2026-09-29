'use strict';

/**
 * Task 050 + 060 — Gắn / gỡ nhân viên cho điểm bán.
 * Nguồn kỳ vọng: `resource/hdsd/hdsd01_quan_ly_diem_ban/tasks/050_gan_nhan_vien.md` + `060_*`.
 * Component: `features/chain/pages/shopManagement/components/DrawerAssignEmployee.jsx`.
 *
 * File này CHỈ chứa case không ghi dữ liệu. Mọi case bấm Xác nhận đều chặn ghi bằng `blockWrites`
 * (endpoint `POST /chain-employment-profile/v1.2/batch-assign-roles` và `DELETE .../assignment`).
 *
 * 🔴 Hub KHÔNG gắn được nhân viên — luôn lấy dòng qua `firstNonHubRow`.
 */

const { test, expect } = require('@playwright/test');
const {
	blockWrites,
	firstNonHubRow,
	firstRowWithEmployee,
	openAssignDrawer,
	openShopList,
	openDropdown,
	rows,
	selectValue,
	skipNoData,
} = require('./shop-page');

/** Thêm một dòng phân công trống và trả về locator của dòng đó. */
async function themDongPhanCong(drawer) {
	const truoc = await drawer.locator('.ant-select').count();
	await drawer.getByRole('button', { name: /Thêm nhân viên/ }).click();
	// 🔴 Mỗi dòng phân công có ĐÚNG 3 Select (nhân viên · vai trò · trạng thái) — đợi đủ số đó
	//    thay vì `waitForTimeout`, vì dòng render sau một nhịp setState.
	await expect
		.poll(async () => drawer.locator('.ant-select').count(), {
			message: 'Bấm "Thêm nhân viên & vai trò" nhưng không thấy dòng phân công mới.',
			timeout: 10_000,
		})
		.toBeGreaterThan(truoc);
}

/**
 * Ba ô của DÒNG PHÂN CÔNG CUỐI CÙNG, theo thứ tự khai trong `DrawerAssignEmployee.jsx`:
 * nhân viên · vai trò · trạng thái.
 *
 * 🔴 Chỉ ô Trạng thái có id ổn định (`assignments_<n>_status`); hai ô kia là component tự viết
 * nên React sinh id ngẫu nhiên kiểu `_r_5j_`. Đo thực tế: bám `input[id$="_sysUserId"]` là
 * locator rỗng và treo hết timeout. Vì vậy định vị theo VỊ TRÍ trong dòng, không theo id.
 */
function oCuaDongCuoi(drawer) {
	const o = drawer.locator('.ant-select');
	return { nhanVien: o.nth(-3), vaiTro: o.nth(-2), trangThai: o.nth(-1) };
}

test.describe('01 — Gắn / gỡ nhân viên (chỉ đọc, không lưu thay đổi)', () => {
	let dong = null;

	test.beforeEach(async ({ page }) => {
		await openShopList(page, 'tct');
		dong = await firstNonHubRow(page);
		if (dong === null) {
			skipNoData(test, 'Bảng không có điểm bán nào khác Hub — Hub không gắn được nhân viên.');
		}
	});

	test('01_050_003 - Bỏ trống Nhân viên trên dòng mới thì bị chặn, không gửi request gán', async ({
		page,
	}) => {
		const { attempted } = await blockWrites(page);
		const drawer = await openAssignDrawer(page, dong);
		await themDongPhanCong(drawer);

		await drawer.getByRole('button', { name: 'Xác nhận' }).click();

		await expect(
			drawer.locator('.ant-form-item-explain-error').filter({ hasText: 'Chọn nhân viên' }).first(),
			'Bỏ trống Nhân viên phải hiện lỗi "Chọn nhân viên".',
		).toBeVisible();
		await expect(drawer, 'Form lỗi thì drawer phải còn mở.').toBeVisible();
		expect(attempted, 'Form thiếu Nhân viên mà vẫn gửi request gán lên server.').toEqual([]);
	});

	test('01_050_004 - Bỏ trống Vai trò trên dòng mới thì bị chặn', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await openAssignDrawer(page, dong);
		await themDongPhanCong(drawer);

		await drawer.getByRole('button', { name: 'Xác nhận' }).click();

		// 🔴 Vai trò và Trạng thái đều `disabled` cho tới khi chọn xong Nhân viên
		//    (`disabled={!currentUserId}` trong DrawerAssignEmployee.jsx) ⇒ khi chưa chọn nhân viên,
		//    antd chỉ báo lỗi ở ô Nhân viên. Kỳ vọng đúng là DRAWER KHÔNG ĐÓNG và KHÔNG gửi request,
		//    chứ không phải "phải thấy đủ 3 thông báo lỗi".
		await expect(
			drawer.locator('.ant-form-item-explain-error').first(),
			'Dòng phân công trống mà bấm Xác nhận phải hiện lỗi validate.',
		).toBeVisible();
		await expect(drawer, 'Form lỗi thì drawer phải còn mở.').toBeVisible();
		expect(attempted, 'Form thiếu Vai trò mà vẫn gửi request gán lên server.').toEqual([]);
	});

	test('01_050_005 - Bấm Hủy thì không lưu gì', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await openAssignDrawer(page, dong);
		await themDongPhanCong(drawer);

		await drawer.getByRole('button', { name: 'Hủy' }).click();

		await expect(drawer, 'Bấm Hủy phải đóng drawer.').toBeHidden();
		expect(attempted, 'Bấm Hủy không được gửi request gán nhân viên.').toEqual([]);
	});

	test('01_050_006 - Trạng thái và Vai trò khoá cho tới khi chọn Nhân viên', async ({ page }) => {
		const drawer = await openAssignDrawer(page, dong);
		await themDongPhanCong(drawer);

		// Ô Trạng thái là Select duy nhất có id ổn định: `assignments_<n>_status`.
		const oTrangThai = drawer.locator('.ant-select:has(input[id$="_status"])').last();
		await expect(
			oTrangThai,
			'HDSD 050 — chưa chọn nhân viên thì ô Trạng thái phải bị khoá.',
		).toHaveClass(/ant-select-disabled/);
	});

	test('01_060_003 - Dòng phân công đã lưu trước đó không xoá được bằng nút ✕', async ({ page }) => {
		const drawer = await openAssignDrawer(page, dong);

		const nutXoa = drawer.getByRole('button', { name: '✕' });
		const soDong = await nutXoa.count();
		if (soDong === 0) {
			skipNoData(test, `Điểm bán ở dòng ${dong} chưa có phân công nào đã lưu để kiểm.`);
		}

		// 🔴 `disabled={!assignments[name]?.isNew}` — nút ✕ chỉ bật cho dòng VỪA thêm, dòng đã lưu
		//    phải cho thôi việc bằng Trạng thái chứ không xoá hẳn (case 01_060_002).
		await expect(
			nutXoa.first(),
			'HDSD 060 — dòng phân công đã lưu không được xoá hẳn bằng nút ✕.',
		).toBeDisabled();
	});

	test('01_050_008 - Gán trùng vai trò cho cùng một nhân viên bị chặn tại chỗ', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await openAssignDrawer(page, dong);

		// Dòng 1: chọn nhân viên A + một vai trò bất kỳ.
		await themDongPhanCong(drawer);
		const dong1 = oCuaDongCuoi(drawer);
		const dsNv = await openDropdown(page, dong1.nhanVien);
		// 🔴 Danh sách nhân viên nạp bằng API riêng SAU khi dropdown mở. Đếm ngay là đếm lúc còn
		//    rỗng ⇒ case skip với lý do sai "môi trường không có nhân viên" (đo thực tế: chờ thêm
		//    ~2s là có 10 lựa chọn).
		const coNhanVien = await dsNv
			.locator('.ant-select-item-option')
			.first()
			.waitFor({ timeout: 15_000 })
			.then(() => true)
			.catch(() => false);
		if (!coNhanVien) skipNoData(test, 'Không có nhân viên nào trong danh sách để gán.');
		const tenNv = (await dsNv.locator('.ant-select-item-option').first().innerText()).trim();
		await dsNv.locator('.ant-select-item-option').first().click();

		const dsVt = await openDropdown(page, dong1.vaiTro);
		const coVaiTro = await dsVt
			.locator('.ant-select-item-option')
			.first()
			.waitFor({ timeout: 15_000 })
			.then(() => true)
			.catch(() => false);
		if (!coVaiTro) skipNoData(test, 'Không có vai trò nào để gán.');
		const tenVt = (await dsVt.locator('.ant-select-item-option').first().innerText()).trim();
		await dsVt.locator('.ant-select-item-option').first().click();

		// Dòng 2: CÙNG nhân viên, CÙNG vai trò ⇒ phải bị chặn ngay tại chỗ.
		await themDongPhanCong(drawer);
		const dong2 = oCuaDongCuoi(drawer);
		await (await openDropdown(page, dong2.nhanVien))
			.locator('.ant-select-item-option')
			.filter({ hasText: tenNv })
			.first()
			.click();
		await (await openDropdown(page, dong2.vaiTro))
			.locator('.ant-select-item-option')
			.filter({ hasText: tenVt })
			.first()
			.click();

		// Trace: `DrawerAssignEmployee.jsx` — `message.warning(...)` rồi `form.setFieldValue` trả
		// ô về giá trị cũ (rỗng). Cảnh báo là toast của antd, nằm NGOÀI drawer.
		await expect(
			page.locator('.ant-message').filter({ hasText: 'Vai trò này đã được gán cho nhân viên' }).first(),
			`Gán lại vai trò "${tenVt}" cho "${tenNv}" phải hiện cảnh báo nguyên văn.`,
		).toBeVisible({ timeout: 10_000 });
		await expect(
			selectValue(oCuaDongCuoi(drawer).vaiTro),
			'Ô Vai trò của dòng trùng phải được trả về rỗng, không giữ giá trị vừa chọn.',
		).toHaveCount(0);
		expect(attempted, 'Bị chặn trùng vai trò mà vẫn gửi request gán lên server.').toEqual([]);
	});

	test('01_050_010 - Phân trang danh sách phân công trong drawer Gắn nhân viên', async ({ page }) => {
		const dongCoNv = await firstRowWithEmployee(page);
		if (dongCoNv === null) skipNoData(test, 'Trang đầu không có điểm bán nào đã gán nhân viên.');
		const drawer = await openAssignDrawer(page, dongCoNv);

		// Trace: `DrawerAssignEmployee.jsx` dùng `<Pagination>` của antd, KHÔNG phải Table.
		// 🔴 Chờ danh sách phân công nạp xong trước khi kết luận "không có phân trang" — xem
		//    chú thích ở case 01_060_004.
		await drawer
			.getByRole('button', { name: '✕' })
			.first()
			.waitFor({ timeout: 20_000 })
			.catch(() => {});
		const phanTrang = drawer.locator('.ant-pagination').first();
		if ((await phanTrang.count()) === 0) {
			skipNoData(test, `Điểm bán ở dòng ${dongCoNv} không có thanh phân trang (ít phân công).`);
		}

		const soTrang = await phanTrang.locator('.ant-pagination-item').count();
		if (soTrang < 2) {
			skipNoData(test, `Điểm bán ở dòng ${dongCoNv} chỉ có 1 trang phân công, không kiểm được phân trang.`);
		}

		const docDanhSach = () =>
			drawer.locator('.ant-select-content-has-value').evaluateAll((l) =>
				l.map((e) => (e.getAttribute('title') || e.textContent || '').trim()),
			);
		const nvTrang1 = await docDanhSach();
		expect(nvTrang1.length, 'Trang 1 phải có dòng phân công để đối chiếu.').toBeGreaterThan(0);

		await phanTrang.locator('.ant-pagination-item-2').first().click();
		await expect(phanTrang.locator('.ant-pagination-item-active'), 'Chưa sang được trang 2.').toHaveText('2');
		await expect
			.poll(async () => (await docDanhSach()).join('|'), {
				message: 'Sang trang 2 mà danh sách phân công không đổi — đang lặp lại dòng của trang 1.',
				timeout: 15_000,
			})
			.not.toBe(nvTrang1.join('|'));
	});

	test('01_060_004 - Nút X của dòng phân công đã lưu ở trạng thái vô hiệu', async ({ page }) => {
		const dongCoNv = await firstRowWithEmployee(page);
		if (dongCoNv === null) skipNoData(test, 'Trang đầu không có điểm bán nào đã gán nhân viên.');
		const drawer = await openAssignDrawer(page, dongCoNv);

		const nutXoa = drawer.getByRole('button', { name: '✕' });
		// 🔴 `openAssignDrawer` trả về ngay khi TIÊU ĐỀ drawer khớp; danh sách phân công đã lưu
		//    nạp bằng API riêng và tới muộn hơn. Đếm ngay là đếm 0 ⇒ skip sai lý do, dù điểm bán
		//    này có nhân viên (đã chọn đúng dòng bằng `firstRowWithEmployee`).
		const soDaLuu = await nutXoa
			.first()
			.waitFor({ timeout: 20_000 })
			.then(() => nutXoa.count())
			.catch(() => 0);
		if (soDaLuu === 0) {
			skipNoData(test, `Điểm bán ở dòng ${dongCoNv} chưa có phân công nào đã lưu để so sánh.`);
		}

		// Trace: `disabled={!assignments[name]?.isNew}` — dòng đã lưu không có `isNew`.
		const daLuuKhoaHet = await nutXoa.evaluateAll((l) => l.every((b) => b.disabled));
		expect(daLuuKhoaHet, 'Mọi nút ✕ của dòng ĐÃ LƯU phải bị vô hiệu.').toBe(true);

		// Dòng vừa thêm trong phiên thì phải bấm được — đây là vế đối chứng, thiếu nó thì
		// assertion trên cũng đúng khi nút ✕ bị khoá do lý do khác.
		await themDongPhanCong(drawer);
		await expect(
			drawer.getByRole('button', { name: '✕' }).last(),
			'Nút ✕ của dòng vừa thêm trong phiên phải bấm được.',
		).toBeEnabled();
	});
});
