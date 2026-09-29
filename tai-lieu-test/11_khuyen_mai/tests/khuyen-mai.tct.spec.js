'use strict';

/**
 * Phân hệ 11 — Khuyến mãi, phần ĐỌC (vai `tct`).
 *
 * 🔴 CTKM đang chạy ảnh hưởng **giá bán thật tại quầy**. Cả file 🚫 KHÔNG ghi: bọc `chanGhi()`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { boQua, chanGhi, chuan, cot, dong, khung, moMan, moThemMoi, oTim } = require('./promotion-page');

const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Mở màn Thêm mới rồi đọc danh sách thẻ/bước. */
async function theCuaManThem(page) {
	const box = await moThemMoi(page);
	const the = (await box.locator('.ant-tabs-tab, .ant-steps-item-title').allInnerTexts()).map(chuan);
	return { box, the };
}

test.describe('11 — Quản lý chương trình khuyến mại', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, VAI);
	});

	test('11_010_001 — Mo danh sach chuong trinh khuyen mai', async ({ page }) => {
		chanNeuTat('11_010_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý chương trình khuyến mại',
		);
		const ten = (await cot(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		for (const c of ['Tên chương trình', 'Trạng thái', 'Thời gian hiệu lực', 'Thao tác']) {
			expect(ten, `Bảng thiếu cột "${c}"; đang có: ${ten.join(' · ')}`).toContain(c);
		}
		expect(await dong(page).count(), 'Danh sách CTKM rỗng — case sẽ "pass rỗng"').toBeGreaterThan(0);
	});

	test('11_010_002 — Kiem tra bo loc danh sach CTKM', async ({ page }) => {
		chanNeuTat('11_010_002');

		await expect(oTim(page), 'Thiếu ô "Tìm kiếm theo mã, tên"').toBeVisible();
		await expect(
			khung(page).locator('input[placeholder="Bắt đầu"]'),
			'Thiếu khoảng thời gian hiệu lực',
		).toBeVisible();
		expect(
			await khung(page).locator('.ant-select').count(),
			'Vùng lọc không có ô chọn nào',
		).toBeGreaterThan(0);
	});

	test('11_030_001 — Mo man Them moi CTKM', async ({ page }) => {
		chanNeuTat('11_030_001');
		const { daGoi } = await chanGhi(page);

		const { box } = await theCuaManThem(page);
		expect(
			chuan(await box.innerText()).length,
			'Bấm "Thêm mới chương trình" mà không mở được màn nào',
		).toBeGreaterThan(20);
		expect(daGoi, 'Chỉ mở màn Thêm mà đã gửi request ghi').toEqual([]);
	});

	test('11_030_002 — Validate khi luu CTKM rong', async ({ page }) => {
		chanNeuTat('11_030_002');
		const { daGoi } = await chanGhi(page);

		const { box } = await theCuaManThem(page);
		const luu = box.getByRole('button', { name: /Lưu|Xác nhận|Tạo|Tiếp tục/ }).last();
		if ((await luu.count()) === 0) boQua(test, 'Màn Thêm mới CTKM không có nút lưu/tiếp tục.');
		await luu.click({ force: true });
		await page.waitForTimeout(2_500);

		const loi = [
			...(await box.locator('.ant-form-item-explain-error').allInnerTexts()),
			...(await page.locator('.ant-message').allInnerTexts()),
		].map(chuan);
		expect(daGoi, '🔴 Form CTKM trống mà vẫn gửi request ghi').toEqual([]);
		expect(loi.join(' | '), 'Lưu CTKM rỗng mà không có thông báo nào').not.toBe('');
	});

	test('11_030_003 — Kiem tra tab Thong tin chung', async ({ page }) => {
		chanNeuTat('11_030_003');
		await chanGhi(page);

		const { box } = await theCuaManThem(page);
		const noi = chuan(await box.innerText()).toLowerCase();
		const thieu = [];
		for (const o of ['tên', 'thời gian', 'mô tả']) if (!noi.includes(o)) thieu.push(o);
		expect(
			thieu,
			`Thẻ Thông tin chung thiếu: ${thieu.join(', ')}. Nội dung: ${noi.slice(0, 250)}`,
		).toEqual([]);
	});

	test('11_050_003 — Kiem tra CTKM khong co action xoa tren UI hien tai', async ({ page }) => {
		chanNeuTat('11_050_003');

		if ((await dong(page).count()) === 0) boQua(test, 'Chưa có CTKM nào để đọc cột Thao tác.');
		const thaoTac = chuan(await dong(page).first().locator('td').last().innerText());
		const nut = await dong(page).first().locator('td').last().getByRole('button').allInnerTexts();

		// 🔴 Kỳ vọng của kịch bản: UI hiện tại KHÔNG có nút xoá CTKM.
		expect(
			/xoá|xóa|delete/i.test(`${thaoTac} ${nut.join(' ')}`),
			`Cột Thao tác đang có: "${thaoTac}" (nút: ${nut.join(' / ')}) — xuất hiện thao tác xoá CTKM.`,
		).toBe(false);
	});

	test('11_050_001 — Mo cap nhat CTKM', async ({ page }) => {
		chanNeuTat('11_050_001');
		const { daGoi } = await chanGhi(page);

		if ((await dong(page).count()) === 0) boQua(test, 'Chưa có CTKM nào để mở cập nhật.');
		const nut = dong(page).first().locator('td').last().getByRole('button').first();
		if ((await nut.count()) === 0) boQua(test, 'Dòng đầu không có nút thao tác nào.');
		await nut.click({ force: true });
		await page.waitForTimeout(4_000);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const box = (await hop.count()) ? hop : khung(page);
		// 🔴 Màn cập nhật phải NẠP SẴN dữ liệu cũ — trắng nghĩa là mất dữ liệu.
		const o = box.locator('input[type="text"], input:not([type])').first();
		if ((await o.count()) === 0) boQua(test, 'Màn cập nhật không có ô nhập nào để kiểm.');
		await expect
			.poll(async () => (await o.inputValue()).length, {
				timeout: 25_000,
				message: 'Màn cập nhật CTKM không nạp lại dữ liệu cũ',
			})
			.toBeGreaterThan(0);
		expect(daGoi, 'Chỉ mở màn cập nhật mà đã gửi request ghi').toEqual([]);
	});

	test("11_070_001 — Kiem tra tab Pham vi ap dung", async ({ page }) => {

			chanNeuTat("11_070_001");
			await chanGhi(page);

			const { box, the } = await theCuaManThem(page);
			const noi = chuan(await box.innerText());
			test.info().annotations.push({
				type: 'thẻ/bước của màn Thêm CTKM',
				description: the.join(' · ') || '(không có thẻ nào)',
			});
			expect(
				/phạm vi|tỉnh|điểm bán/i.test(noi),
				`Màn Thêm CTKM không có phần khớp ${/phạm vi|tỉnh|điểm bán/i}. Nội dung: ${noi.slice(0, 250)}`,
			).toBe(true);
	});

	test("11_080_001 — Mo danh sach dieu kien", async ({ page }) => {

			chanNeuTat("11_080_001");
			await chanGhi(page);

			const { box, the } = await theCuaManThem(page);
			const noi = chuan(await box.innerText());
			test.info().annotations.push({
				type: 'thẻ/bước của màn Thêm CTKM',
				description: the.join(' · ') || '(không có thẻ nào)',
			});
			expect(
				/điều kiện/i.test(noi),
				`Màn Thêm CTKM không có phần khớp ${/điều kiện/i}. Nội dung: ${noi.slice(0, 250)}`,
			).toBe(true);
	});









});
