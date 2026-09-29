'use strict';

/**
 * Phân hệ 12_1 — Hồ sơ nhà cung cấp, phần ĐỌC (vai `tct`).
 *
 * 🔴 Viết lại 20/09/2026 thay cho `v2.js` + `vnpost-supplier.playwright.spec.js` (URL production
 * viết cứng, route `/inventory/warehouse-supplier` nay 🚫 không điều hướng được nữa).
 * 🔴 Bỏ chặn ghi toàn file (22/09/2026, user chốt): trước đây `beforeEach` bọc `chanGhi()` nên
 * MỌI request khác GET tới `/…supplier…` bị trả 403 giả ⇒ 🚫 không case nào tạo được dữ liệu.
 * `chanGhi()` giờ chỉ còn dùng CỤC BỘ ở các case lấy "không có request ghi nào" làm PHÉP KIỂM
 * (validate form rỗng, bấm Huỷ) — ở đó nó là assert, 🚫 không phải rào an toàn, đừng bỏ.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { boQua, chanGhi, chuan, cot, dong, khung, moMan, moNhomNCC, oTim, tim } = require('./supplier-page');

const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const khongDau = (s) =>
	chuan(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

test.describe('12_1 — Quản lý nhà cung cấp', () => {
	test.beforeEach(async ({ page }) => {
		await moMan(page, VAI);
	});

	test('12_1_010_001 — Mở màn Quản lý nhà cung cấp', async ({ page }) => {
		chanNeuTat('12_1_010_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý nhà cung cấp',
		);
		for (const nhan of ['Nhập từ Excel', 'Quản lý Nhóm NCC', 'Thêm mới']) {
			await expect(
				khung(page).getByRole('button', { name: nhan }).first(),
				`Thiếu nút "${nhan}"`,
			).toBeVisible();
		}
	});

	test('12_1_010_011 — Kiểm tra hiển thị danh sách nhà cung cấp', async ({ page }) => {
		chanNeuTat('12_1_010_011');

		const ten = (await cot(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		for (const c of ['Trạng thái hoạt động', 'Liên hệ', 'Sản phẩm', 'Công nợ', 'Hành động']) {
			expect(ten, `Bảng thiếu cột "${c}"; đang có: ${ten.join(' · ')}`).toContain(c);
		}
		expect(await dong(page).count(), 'Danh sách NCC rỗng — case sẽ "pass rỗng"').toBeGreaterThan(0);
	});

	test('12_1_010_012 — Kiểm tra tìm kiếm theo tên NCC', async ({ page }) => {
		chanNeuTat('12_1_010_012');

		if ((await dong(page).count()) === 0) boQua(test, 'Chưa có NCC nào để lấy từ khoá.');
		const hang = chuan(await dong(page).first().innerText());
		const tuKhoa = hang.split(' ').filter((t) => t.length > 3)[0];
		if (!tuKhoa) boQua(test, 'Không tách được từ khoá từ dòng đầu.');

		const res = await tim(page, tuKhoa);
		expect(res, `Tìm "${tuKhoa}" mà màn không gọi lại API danh sách`).not.toBeNull();

		const so = await dong(page).count();
		expect(so, `Tìm "${tuKhoa}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			expect(
				khongDau(await dong(page).nth(i).innerText()),
				`Dòng ${i + 1} không chứa từ khoá`,
			).toContain(khongDau(tuKhoa));
		}
	});

	test('12_1_010_013 — Kiểm tra tìm kiếm theo SĐT NCC', async ({ page }) => {
		chanNeuTat('12_1_010_013');

		if ((await dong(page).count()) === 0) boQua(test, 'Chưa có NCC nào để lấy số điện thoại.');
		const hang = chuan(await dong(page).first().innerText());
		const sdt = (hang.match(/0\d{8,10}/) || [])[0];
		if (!sdt) boQua(test, 'Dòng đầu không có số điện thoại để tìm.');

		await tim(page, sdt);
		const so = await dong(page).count();
		expect(so, `Tìm theo SĐT "${sdt}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			expect(chuan(await dong(page).nth(i).innerText())).toContain(sdt);
		}
	});

	test('12_1_010_002 — Tìm kiếm NCC không có kết quả', async ({ page }) => {
		chanNeuTat('12_1_010_002');

		await tim(page, 'zzzkhongtontai999');
		expect(await dong(page).count()).toBe(0);
		await expect(khung(page).locator('.ant-empty')).toBeVisible();
	});

	test('12_1_010_014 — Kiểm tra phân trang', async ({ page }) => {
		chanNeuTat('12_1_010_014');

		const phanTrang = khung(page).locator('.ant-pagination').first();
		const trang2 = phanTrang.locator('.ant-pagination-item[title="2"]');
		if ((await trang2.count()) === 0) boQua(test, 'Danh sách NCC chỉ có một trang.');

		const truoc = await dong(page).allInnerTexts();
		const cho = page.waitForResponse(
			(r) => r.url().includes('/chain-supplier') && r.status() !== 401,
			{ timeout: 60_000 },
		);
		await trang2.click();
		await cho.catch(() => null);
		await page.waitForTimeout(1_500);

		const sau = await dong(page).allInnerTexts();
		expect(sau.some((d) => truoc.includes(d)), 'Trang 2 lặp dòng của trang 1').toBe(false);
	});

	// ── Nhóm NCC ──────────────────────────────────────────────────────────────────────────────────
	test('12_1_070_001 — Mở màn Nhóm Nhà cung cấp', async ({ page }) => {
		chanNeuTat('12_1_070_001');

		const box = await moNhomNCC(page);
		expect(
			chuan(await box.innerText()).length,
			'Bấm "Quản lý Nhóm NCC" mà không mở được màn nào',
		).toBeGreaterThan(20);
	});

	test('12_1_070_006 — Dieu huong tu Quan ly nha cung cap sang Nhom Nha cung cap', async ({
		page,
	}) => {
		chanNeuTat('12_1_070_006');

		const cho = page.waitForResponse(
			(r) => r.url().includes('/chain-supplier-groups') && r.status() !== 401,
			{ timeout: 60_000 },
		);
		const box = await moNhomNCC(page);
		const res = await cho.catch(() => null);
		expect(res, 'Vào màn Nhóm NCC mà không gọi API `/chain-supplier-groups`').not.toBeNull();
		expect(chuan(await box.innerText()).toLowerCase()).toContain('nhóm');
	});

	test('12_1_070_007 — Hien thi danh sach nhom NCC', async ({ page }) => {
		chanNeuTat('12_1_070_007');

		const box = await moNhomNCC(page);
		const soDong = await box.locator('.ant-table-tbody tr.ant-table-row').count();
		if (soDong === 0) boQua(test, 'Hệ thống chưa có nhóm NCC nào để hiển thị.');
		expect(soDong).toBeGreaterThan(0);
	});

	test("12_1_070_002 — Thêm nhóm NCC - mở form và validate rỗng", async ({ page }) => {

			chanNeuTat("12_1_070_002");
			const { daGoi } = await chanGhi(page);

			const box = await moNhomNCC(page);
			const nut = box.getByRole('button', { name: /Thêm|Tạo/ }).first();
			if ((await nut.count()) === 0) boQua(test, 'Màn Nhóm NCC không có nút thêm nhóm.');
			await nut.click({ force: true });
			await page.waitForTimeout(3_000);

			const form = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
			await expect(form, 'Bấm thêm nhóm mà không mở form nào').toBeVisible({ timeout: 20_000 });

			const luu = form.getByRole('button', { name: /Lưu|Xác nhận|Thêm/ }).last();
			await luu.click({ force: true });
			await page.waitForTimeout(2_000);

			const loi = [
				...(await form.locator('.ant-form-item-explain-error').allInnerTexts()),
				...(await page.locator('.ant-message').allInnerTexts()),
			].map(chuan);
			expect(daGoi, '🔴 Form nhóm NCC trống mà vẫn gửi request ghi').toEqual([]);
			expect(loi.join(' | '), 'Lưu nhóm NCC rỗng mà không có thông báo nào').not.toBe('');
	});

	test("12_1_070_008 — Mo drawer Them nhom nha cung cap", async ({ page }) => {

			chanNeuTat("12_1_070_008");
			const { daGoi } = await chanGhi(page);

			const box = await moNhomNCC(page);
			const nut = box.getByRole('button', { name: /Thêm|Tạo/ }).first();
			if ((await nut.count()) === 0) boQua(test, 'Màn Nhóm NCC không có nút thêm nhóm.');
			await nut.click({ force: true });
			await page.waitForTimeout(3_000);

			const form = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
			await expect(form, 'Bấm thêm nhóm mà không mở form nào').toBeVisible({ timeout: 20_000 });

			const luu = form.getByRole('button', { name: /Lưu|Xác nhận|Thêm/ }).last();
			await luu.click({ force: true });
			await page.waitForTimeout(2_000);

			const loi = [
				...(await form.locator('.ant-form-item-explain-error').allInnerTexts()),
				...(await page.locator('.ant-message').allInnerTexts()),
			].map(chuan);
			expect(daGoi, '🔴 Form nhóm NCC trống mà vẫn gửi request ghi').toEqual([]);
			expect(loi.join(' | '), 'Lưu nhóm NCC rỗng mà không có thông báo nào').not.toBe('');
	});

	test("12_1_070_009 — Validate khi them nhom NCC rong", async ({ page }) => {

			chanNeuTat("12_1_070_009");
			const { daGoi } = await chanGhi(page);

			const box = await moNhomNCC(page);
			const nut = box.getByRole('button', { name: /Thêm|Tạo/ }).first();
			if ((await nut.count()) === 0) boQua(test, 'Màn Nhóm NCC không có nút thêm nhóm.');
			await nut.click({ force: true });
			await page.waitForTimeout(3_000);

			const form = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
			await expect(form, 'Bấm thêm nhóm mà không mở form nào').toBeVisible({ timeout: 20_000 });

			const luu = form.getByRole('button', { name: /Lưu|Xác nhận|Thêm/ }).last();
			await luu.click({ force: true });
			await page.waitForTimeout(2_000);

			const loi = [
				...(await form.locator('.ant-form-item-explain-error').allInnerTexts()),
				...(await page.locator('.ant-message').allInnerTexts()),
			].map(chuan);
			expect(daGoi, '🔴 Form nhóm NCC trống mà vẫn gửi request ghi').toEqual([]);
			expect(loi.join(' | '), 'Lưu nhóm NCC rỗng mà không có thông báo nào').not.toBe('');
	});

	test("12_1_070_003 — Tìm kiếm nhóm NCC", async ({ page }) => {

			chanNeuTat("12_1_070_003");

			const box = await moNhomNCC(page);
			const o = box.locator('input[placeholder]').first();
			if ((await o.count()) === 0) boQua(test, 'Màn Nhóm NCC không có ô tìm kiếm.');

			const soTruoc = await box.locator('.ant-table-tbody tr.ant-table-row').count();
			if (soTruoc === 0) boQua(test, 'Chưa có nhóm NCC nào để tìm.');

			const tu =
				null ??
				chuan(await box.locator('.ant-table-tbody tr.ant-table-row').first().innerText())
					.split(' ')
					.filter((t) => t.length > 2)[0];
			await o.fill(tu);
			await o.press('Enter');
			await page.waitForTimeout(2_500);

			const soSau = await box.locator('.ant-table-tbody tr.ant-table-row').count();
			if (null) {
				expect(soSau, `Tìm "${tu}" không tồn tại mà bảng vẫn còn dòng`).toBe(0);
			} else {
				expect(soSau, `Tìm "${tu}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
			}
	});

	test("12_1_070_014 — Tim kiem nhom NCC khong co ket qua", async ({ page }) => {

			chanNeuTat("12_1_070_014");

			const box = await moNhomNCC(page);
			const o = box.locator('input[placeholder]').first();
			if ((await o.count()) === 0) boQua(test, 'Màn Nhóm NCC không có ô tìm kiếm.');

			const soTruoc = await box.locator('.ant-table-tbody tr.ant-table-row').count();
			if (soTruoc === 0) boQua(test, 'Chưa có nhóm NCC nào để tìm.');

			const tu =
				"zzzkhongtontai999" ??
				chuan(await box.locator('.ant-table-tbody tr.ant-table-row').first().innerText())
					.split(' ')
					.filter((t) => t.length > 2)[0];
			await o.fill(tu);
			await o.press('Enter');
			await page.waitForTimeout(2_500);

			const soSau = await box.locator('.ant-table-tbody tr.ant-table-row').count();
			if ("zzzkhongtontai999") {
				expect(soSau, `Tìm "${tu}" không tồn tại mà bảng vẫn còn dòng`).toBe(0);
			} else {
				expect(soSau, `Tìm "${tu}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
			}
	});

	test('12_1_070_015 — Huy popup xoa nhom NCC co san', async ({ page }) => {
		chanNeuTat('12_1_070_015');
		const { daGoi } = await chanGhi(page);

		const box = await moNhomNCC(page);
		const dongNhom = box.locator('.ant-table-tbody tr.ant-table-row');
		if ((await dongNhom.count()) === 0) boQua(test, 'Chưa có nhóm NCC nào để thử xoá.');

		const soTruoc = await dongNhom.count();
		const nutXoa = dongNhom.first().getByRole('button').last();
		await nutXoa.click({ force: true });
		await page.waitForTimeout(2_000);

		const hop = page.locator('.ant-modal-confirm, .ant-popconfirm').last();
		if ((await hop.count()) === 0) {
			boQua(test, 'Bấm nút cuối dòng không mở hộp xác nhận xoá — cần probe lại nút nào là Xoá.');
		}
		await hop.getByRole('button', { name: /Huỷ|Hủy|Không/ }).first().click({ force: true });
		await page.waitForTimeout(1_500);

		expect(daGoi, 'Bấm Huỷ mà vẫn gửi request xoá nhóm NCC').toEqual([]);
		expect(await dongNhom.count(), 'Dòng biến mất dù đã bấm Huỷ').toBe(soTruoc);
	});

	/**
	 * 🔴 070_004 / 070_005: drawer "Danh mục nhà cung cấp" (`CatModalView`) CÓ trong
	 *    `features/supplier/pages/supplier.jsx` nhưng 🚫 không có nút nào mở nó — không chỗ nào gọi
	 *    `setOpenViewSelectCat(true)` (đo 23/09/2026). Giữ NGUYÊN kỳ vọng sheet (có nút "Quản lý danh
	 *    mục") ⇒ ĐỎ = lệch đặc tả / tính năng mất lối vào, 🚫 không sửa cho xanh.
	 */
	const nutDanhMuc = (page) => khung(page).getByRole('button', { name: /Quản lý danh mục|Danh mục/ });

	test("12_1_070_004 — Mở drawer Danh mục nhà cung cấp", async ({ page }) => {
		chanNeuTat("12_1_070_004");
		await moMan(page, VAI);
		expect(
			await nutDanhMuc(page).count(),
			'Màn /supplier/list không có nút "Quản lý danh mục" — drawer Danh mục NCC có trong code nhưng không có lối vào. Lệch đặc tả.',
		).toBeGreaterThan(0);
		await nutDanhMuc(page).first().click();
		await expect(
			page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last().getByText('Danh mục nhà cung cấp').first(),
			'Bấm "Quản lý danh mục" không mở drawer "Danh mục nhà cung cấp"',
		).toBeVisible({ timeout: 20_000 });
	});

	test("12_1_070_005 — Thêm danh mục NCC - mở form và validate rỗng", async ({ page }) => {
		chanNeuTat("12_1_070_005");
		await moMan(page, VAI);
		expect(
			await nutDanhMuc(page).count(),
			'Màn /supplier/list không có nút "Quản lý danh mục" — không vào được màn thêm danh mục NCC. Lệch đặc tả.',
		).toBeGreaterThan(0);
		const { daGoi } = await chanGhi(page);
		await nutDanhMuc(page).first().click();
		const ds = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await ds.getByRole('button', { name: /Thêm mới/ }).first().click();
		const form = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await form.getByRole('button', { name: /Lưu|Xác nhận/ }).first().click();
		await expect(form.locator('.ant-form-item-explain-error').first(), 'Lưu form rỗng mà không báo lỗi trường bắt buộc').toBeVisible({ timeout: 10_000 });
		expect(daGoi, 'Form rỗng mà vẫn gửi request tạo danh mục').toEqual([]);
	});
});
