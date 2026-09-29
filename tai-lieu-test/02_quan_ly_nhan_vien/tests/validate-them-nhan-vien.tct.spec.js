'use strict';

/**
 * Task 020 — phần KHÔNG ghi dữ liệu: validate phía client của drawer "Thêm nhân viên".
 *
 * 🔴 Mọi case ở đây bọc `chanGhi(page)` — chặn ở TẦNG MẠNG mọi request khác GET tới
 * `/chain-employment-profile/**`. Bấm *Lưu* là hành vi cần kiểm, nhưng 🚫 không được để một
 * request tạo nào chạm dữ liệu thật. Assert `daGoi` rỗng chính là phép kiểm *"không gửi request"*
 * mà kịch bản đòi: nếu sản phẩm vẫn gửi khi form thiếu trường bắt buộc thì đó là lỗi cần bắt.
 *
 * 🔴 Tài liệu gọi là *modal*; DOM thật là `.ant-drawer` tiêu đề **"Thêm nhân viên"**.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

/** 🔴 `test-input.json` nằm ở GỐC phân hệ, không phải trong `tests/`. */
const GOC = path.join(__dirname, '..');
const {
	chanGhi,
	chonDonVi,
	chonOption,
	chuan,
	dienDongVaiTro,
	loiValidate,
	moDanhSach,
	moDrawerThem,
	nhanCacOption,
	oDonViVaiTro,
	themDongVaiTro,
	timKiem,
	tongSo,
} = require('./employee-page');

const VAI = 'tct';

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Sinh giá trị hợp lệ, KHÔNG trùng dữ liệu thật — chỉ dùng cho form, không bao giờ được lưu. */
const stt = () => Date.now().toString().slice(-8);
const soDienThoaiHopLe = () => `09${stt()}`;

/** Điền 4 ô bắt buộc, bỏ qua ô nào được liệt kê trong `bo`. */
async function dienThongTinBatBuoc(dr, { bo = [], deTen } = {}) {
	const n = stt();
	if (!bo.includes('employeeCode')) await dr.locator('#employeeCode').fill(`NVAUTO${n}`);
	if (!bo.includes('username')) await dr.locator('#username').fill(`nvauto${n}`);
	if (!bo.includes('name')) await dr.locator('#name').fill(deTen ?? `Nhân viên auto test ${n}`);
	if (!bo.includes('phone')) await dr.locator('#phone').fill(soDienThoaiHopLe());
}

test.describe('02 · 020 — Validate drawer Thêm nhân viên', () => {
	test.beforeEach(async ({ page }) => {
		await moDanhSach(page, VAI);
	});

	test('02_020_002 — Bỏ trống các trường bắt buộc', async ({ page }) => {
		chanNeuTat('02_020_002');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThem(page);
		await themDongVaiTro(dr);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_500);

		const loi = await loiValidate(dr);
		for (const nguyenVan of [
			'Vui lòng nhập mã nhân viên',
			'Vui lòng nhập tên đăng nhập',
			'Vui lòng nhập tên nhân viên',
			'Số điện thoại / email không được để trống!',
			'Chọn đơn vị',
			'Vui lòng chọn vai trò nhân viên',
		]) {
			expect(loi, `Thiếu thông báo nguyên văn "${nguyenVan}"`).toContain(nguyenVan);
		}
		expect(daGoi, 'Form thiếu trường bắt buộc mà vẫn gửi request ghi').toEqual([]);
	});

	test('02_020_004 — Nhập sai định dạng số điện thoại', async ({ page }) => {
		chanNeuTat('02_020_004');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThem(page);
		await dienThongTinBatBuoc(dr, { bo: ['phone'] });
		await dr.locator('#phone').fill('012345');
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, {
			donVi: 'Tong cong ty',
			vaiTro: 'Kế toán',
		});
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_500);

		expect(await loiValidate(dr)).toContain('Số điện thoại không hợp lệ');
		expect(daGoi, 'Số điện thoại sai định dạng mà vẫn gửi request ghi').toEqual([]);
	});

	test('02_020_005 — Mở drawer Thêm nhân viên hiển thị đúng', async ({ page }) => {
		chanNeuTat('02_020_005');

		const dr = await moDrawerThem(page);
		const nhan = (await dr.locator('.ant-form-item-label label').allInnerTexts()).map(chuan);

		// 4 ô bắt buộc của phần thông tin.
		for (const o of ['Mã nhân viên', 'Tên đăng nhập', 'Tên nhân viên', 'Số điện thoại']) {
			expect(nhan, `Thiếu ô "${o}"`).toContain(o);
		}
		// 🔴 Các ô đã bị comment out trong code — 🚫 không được xuất hiện trở lại.
		for (const o of ['Cửa hàng', 'Email', 'Mật khẩu', 'Xác nhận mật khẩu', 'Số tài khoản', 'Mã hợp đồng']) {
			expect(nhan, `Ô "${o}" đã bị gỡ khỏi code nhưng vẫn hiện trên form`).not.toContain(o);
		}

		await expect(
			dr.getByRole('button', { name: '+ Thêm vai trò và đơn vị quản lý' }),
		).toBeVisible();
		await themDongVaiTro(dr);
		await expect(dr.locator('#roles_0_roleId')).toBeDisabled();
		await expect(dr.locator('#roles_0_status')).toBeDisabled();
	});

	/**
	 * Bỏ trống đúng MỘT ô bắt buộc rồi Lưu — dùng chung cho 4 case.
	 *
	 * 🔴 Tên test viết NGUYÊN VĂN ở từng `test()`, 🚫 không sinh bằng vòng lặp: công cụ đối chiếu
	 * (`tool/bin/checklist.js`) tìm mã case trong tiêu đề `test()`, tiêu đề dựng bằng biến thì case
	 * bị đếm là "chưa có script".
	 */
	async function boTrongMotO(page, id, bo, nguyenVan) {
		chanNeuTat(id);
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThem(page);
		await dienThongTinBatBuoc(dr, { bo: [bo] });
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: 'Tong cong ty', vaiTro: 'Kế toán' });
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_500);

		expect(await loiValidate(dr)).toContain(nguyenVan);
		expect(daGoi, `Bỏ trống ${bo} mà vẫn gửi request ghi`).toEqual([]);
	}

	test('02_020_007 — Bỏ trống Mã nhân viên', async ({ page }) => {
		await boTrongMotO(page, '02_020_007', 'employeeCode', 'Vui lòng nhập mã nhân viên');
	});

	test('02_020_008 — Bỏ trống Tên đăng nhập', async ({ page }) => {
		await boTrongMotO(page, '02_020_008', 'username', 'Vui lòng nhập tên đăng nhập');
	});

	test('02_020_013 — Bỏ trống Tên nhân viên', async ({ page }) => {
		await boTrongMotO(page, '02_020_013', 'name', 'Vui lòng nhập tên nhân viên');
	});

	test('02_020_016 — Bỏ trống Số điện thoại', async ({ page }) => {
		await boTrongMotO(page, '02_020_016', 'phone', 'Số điện thoại / email không được để trống!');
	});

	test('02_020_009 — Tên đăng nhập ngắn hơn 6 ký tự', async ({ page }) => {
		chanNeuTat('02_020_009');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThem(page);
		await dienThongTinBatBuoc(dr, { bo: ['username'] });
		await dr.locator('#username').fill('abc12');
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_200);
		expect(await loiValidate(dr)).toContain('Độ dài tên đăng nhập từ 6 ký tự');
		expect(daGoi).toEqual([]);

		// Biên 6 ký tự phải hợp lệ — lỗi độ dài biến mất.
		await dr.locator('#username').fill('abc123');
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_200);
		expect(
			await loiValidate(dr),
			'6 ký tự vẫn báo lỗi độ dài — biên dưới đang bị tính sai',
		).not.toContain('Độ dài tên đăng nhập từ 6 ký tự');
	});

	test('02_020_010 — Tên đăng nhập chứa ký tự không cho phép', async ({ page }) => {
		chanNeuTat('02_020_010');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThem(page);
		await dienThongTinBatBuoc(dr, { bo: ['username'] });

		for (const giaTri of ['nhanvien@01', 'nv#01']) {
			await dr.locator('#username').fill(giaTri);
			await dr.getByRole('button', { name: 'Lưu' }).click();
			await page.waitForTimeout(1_200);
			expect(await loiValidate(dr), `Giá trị "${giaTri}" lọt qua validate`).toContain(
				'Tên đăng nhập chỉ gồm chữ, số và các ký tự . _ -',
			);
		}

		await dr.locator('#username').fill('nhan.vien_01-a');
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_200);
		expect(
			await loiValidate(dr),
			'Giá trị hợp lệ "nhan.vien_01-a" bị chặn oan',
		).not.toContain('Tên đăng nhập chỉ gồm chữ, số và các ký tự . _ -');
		expect(daGoi).toEqual([]);
	});

	test('02_020_011 — Tên đăng nhập chứa khoảng trắng', async ({ page }) => {
		chanNeuTat('02_020_011');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThem(page);
		await dienThongTinBatBuoc(dr, { bo: ['username'] });
		await dr.locator('#username').fill('nhan vien01');
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_200);

		// 🔴 Validator riêng, thông báo KHÁC lỗi pattern ở 02_020_010.
		expect(await loiValidate(dr)).toContain('Tên đăng nhập không được chứa khoảng trắng');
		expect(daGoi).toEqual([]);
	});

	test('02_020_012 — Tên đăng nhập tại biên 50 và vượt 50 ký tự', async ({ page }) => {
		chanNeuTat('02_020_012');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThem(page);
		await dienThongTinBatBuoc(dr, { bo: ['username'] });

		await dr.locator('#username').fill('a'.repeat(50));
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_200);
		expect(await loiValidate(dr), '50 ký tự bị chặn oan').not.toContain(
			'Độ dài tên đăng nhập từ 6 ký tự',
		);

		await dr.locator('#username').fill('a'.repeat(51));
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_200);
		// 🔴 `min:6, max:50` dùng CHUNG một message nên 51 ký tự vẫn báo câu về 6 ký tự — đáng báo,
		//    nhưng kỳ vọng ở đây là theo code hiện tại.
		expect(await loiValidate(dr)).toContain('Độ dài tên đăng nhập từ 6 ký tự');
		expect(daGoi).toEqual([]);
	});

	test('02_020_017 — Xoá hết dòng vai trò rồi Lưu', async ({ page }) => {
		chanNeuTat('02_020_017');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThem(page);
		await dienThongTinBatBuoc(dr);
		await themDongVaiTro(dr);
		await dr.getByRole('button', { name: 'Xóa' }).first().click();
		await page.waitForTimeout(500);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_500);

		const loi = [
			...(await loiValidate(dr)),
			...(await dr.locator('.ant-form-item-explain').allInnerTexts()).map(chuan),
		];
		expect(loi.join(' | ')).toContain('Vui lòng chọn vai trò nhân viên');
		expect(daGoi, 'Không có dòng vai trò nào mà vẫn gửi request ghi').toEqual([]);
	});

	test('02_020_018 — Dòng vai trò: bỏ trống Đơn vị', async ({ page }) => {
		chanNeuTat('02_020_018');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThem(page);
		await dienThongTinBatBuoc(dr);
		await themDongVaiTro(dr);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_500);

		expect(await loiValidate(dr)).toContain('Chọn đơn vị');
		expect(daGoi).toEqual([]);
	});

	test('02_020_019 — Dòng vai trò: bỏ trống Vai trò', async ({ page }) => {
		chanNeuTat('02_020_019');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThem(page);
		await dienThongTinBatBuoc(dr);
		await themDongVaiTro(dr);
		await chonDonVi(page, oDonViVaiTro(dr, 0), 'Tong cong ty');
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_500);

		expect(await loiValidate(dr)).toContain('Vui lòng chọn vai trò nhân viên');
		expect(daGoi).toEqual([]);
	});

	test('02_020_020 — Dòng vai trò: bỏ trống Trạng thái', async ({ page }) => {
		chanNeuTat('02_020_020');
		// 🔴 Case đang TẮT vì KHÔNG tái hiện được qua giao diện, không phải vì thiếu dữ liệu:
		//    chọn Đơn vị xong code tự đặt `status = 1`, và Select trạng thái 🚫 KHÔNG khai
		//    `allowClear` ⇒ không có nút xoá, người dùng không cách nào để trống ô này.
		//    ⇒ rule `required: "Chọn trạng thái"` là luật KHÔNG BAO GIỜ chạm tới được.
		//    🚫 Không hạ kỳ vọng thành "ô luôn có giá trị" — cần user chốt: bỏ rule, hay mở allowClear.
	});

	test('02_020_021 — Ô Vai trò và Trạng thái bị vô hiệu khi chưa chọn Đơn vị', async ({ page }) => {
		chanNeuTat('02_020_021');

		const dr = await moDrawerThem(page);
		await themDongVaiTro(dr);

		// 🔴 Bám thuộc tính `disabled` của chính `<input>`, 🚫 đừng dò class của thẻ bọc: tổ tiên
		//    gần nhất có chữ `ant-select` lại là `.ant-select-content`, nên phép so class trượt
		//    trong khi ô thực sự đang bị vô hiệu.
		await expect(dr.locator('#roles_0_roleId')).toBeDisabled();
		await expect(dr.locator('#roles_0_status')).toBeDisabled();

		await chonDonVi(page, oDonViVaiTro(dr, 0), 'Tong cong ty');
		await expect(dr.locator('#roles_0_roleId')).toBeEnabled();
		await expect(dr.locator('#roles_0_status')).toBeEnabled();

		const vaiTro = await nhanCacOption(page, dr.locator('#roles_0_roleId'));
		expect(vaiTro.length, 'Chọn đơn vị rồi mà không có vai trò nào để chọn').toBeGreaterThan(0);
	});

	test('02_020_022 — Đổi Đơn vị thì Vai trò của dòng đó bị xoá', async ({ page }) => {
		chanNeuTat('02_020_022');

		const dr = await moDrawerThem(page);
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: 'Tong cong ty', vaiTro: 'Kế toán' });

		const oVaiTro = dr
			.locator('#roles_0_roleId')
			.locator('xpath=ancestor::div[contains(@class,"ant-select")][1]');
		expect(chuan(await oVaiTro.innerText())).toBe('Kế toán');

		// Đổi sang đơn vị khác — lấy nút thứ hai của cây nếu có, không có thì chọn lại nút gốc.
		await oDonViVaiTro(dr, 0).click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nut = dd.locator('.ant-select-tree-node-content-wrapper');
		const soNut = await nut.count();
		if (soNut < 2) {
			await page.keyboard.press('Escape');
			test.skip(
				true,
				`Cây tổ chức của vai ${VAI} chỉ có ${soNut} nút — không có đơn vị B để đổi sang.`,
			);
		}
		await nut.nth(1).click();
		await page.waitForTimeout(1_000);

		expect(
			chuan(await oVaiTro.innerText()),
			'Đổi đơn vị mà vai trò của đơn vị cũ vẫn còn',
		).not.toBe('Kế toán');
	});

	test('02_020_027 — Số điện thoại đúng đầu số nhưng sai độ dài', async ({ page }) => {
		chanNeuTat('02_020_027');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThem(page);
		await dienThongTinBatBuoc(dr, { bo: ['phone'] });
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: 'Tong cong ty', vaiTro: 'Kế toán' });

		for (const so of ['091234567', '09123456789']) {
			await dr.locator('#phone').fill(so);
			await dr.getByRole('button', { name: 'Lưu' }).click();
			await page.waitForTimeout(1_200);
			expect(await loiValidate(dr), `Số "${so}" (${so.length} chữ số) lọt qua validate`).toContain(
				'Số điện thoại không hợp lệ',
			);
		}
		expect(daGoi, 'Số điện thoại sai độ dài mà vẫn gửi request ghi').toEqual([]);

		// 10 chữ số phải qua được validate: lỗi biến mất và FE thực sự gọi API tạo (đã bị chặn).
		await dr.locator('#phone').fill('0912345678');
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(2_000);
		expect(await loiValidate(dr), 'Số 10 chữ số bị chặn oan').not.toContain(
			'Số điện thoại không hợp lệ',
		);
		expect(
			daGoi.length,
			'Form hợp lệ mà FE không gọi API tạo — không kiểm được biên độ dài hợp lệ',
		).toBeGreaterThan(0);
	});

	test('02_020_029 — Đóng drawer giữa chừng thì không lưu gì', async ({ page }) => {
		chanNeuTat('02_020_029');
		const { daGoi } = await chanGhi(page);

		const tongTruoc = await tongSo(page);
		const ma = `NVAUTO${stt()}`;

		let dr = await moDrawerThem(page);
		await dr.locator('#employeeCode').fill(ma);
		await dienThongTinBatBuoc(dr, { bo: ['employeeCode'] });
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: 'Tong cong ty', vaiTro: 'Kế toán' });

		await dr.locator('.ant-drawer-close').click();
		await page.waitForTimeout(1_000);
		expect(daGoi, 'Đóng drawer mà vẫn gửi request tạo').toEqual([]);

		await timKiem(page, ma);
		expect(await tongSo(page), `Mã "${ma}" đã được lưu dù chỉ đóng drawer`).toBe(0);

		await timKiem(page, '');
		expect(await tongSo(page)).toBe(tongTruoc);

		dr = await moDrawerThem(page);
		expect(await dr.locator('#employeeCode').inputValue(), 'Drawer mở lại còn dữ liệu cũ').toBe('');
	});

	test('02_020_031 — Tên đăng nhập không sửa được ở chế độ Sửa', async ({ page }) => {
		const i = chanNeuTat('02_020_031');
		const ma = i.data.employeeCode || '';
		if (!ma) {
			// Không khai mã cụ thể thì lấy nhân viên đầu tiên của danh sách — case chỉ ĐỌC.
		}

		const { moChiTiet } = require('./employee-page');
		const maNhanVien = ma || chuan(await page.locator('.ant-table-tbody td').nth(2).innerText());
		const tim = await moChiTiet(page, maNhanVien);
		if (!tim) test.skip(true, `Không tìm thấy nhân viên "${maNhanVien}" để mở drawer Sửa.`);

		await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
		const dr = page.locator('.ant-drawer-open').last();
		await expect(dr.locator('.ant-drawer-title')).toHaveText('Chỉnh sửa nhân viên', {
			timeout: 20_000,
		});
		await dr.locator('#username').waitFor({ state: 'visible', timeout: 20_000 });

		await expect(dr.locator('#username')).toBeDisabled();
		await expect(dr.locator('#employeeCode')).toBeDisabled();
	});
});
