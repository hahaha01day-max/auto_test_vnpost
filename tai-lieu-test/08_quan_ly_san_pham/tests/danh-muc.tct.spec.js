'use strict';

/**
 * Phân hệ 08 — nhóm **Quản lý danh mục sản phẩm** (`/product/category?type=0`), phần ĐỌC.
 *
 * 🔴 Danh mục là khoá phân loại của toàn bộ sản phẩm; xoá/sửa nhầm ảnh hưởng mọi báo cáo theo
 * danh mục ⇒ case CRUD giữ `allowMutation: false`. Cả file bọc `chanGhi()`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { boQua, chanGhi, chuan, dong, khung, moDanhMuc } = require('./product-page');

const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Mở drawer/modal "Thêm mới" danh mục. */
async function moFormThem(page) {
	await khung(page).getByRole('button', { name: 'Thêm mới' }).first().click({ force: true });
	const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	await hop.waitFor({ state: 'visible', timeout: 20_000 });
	await page.waitForTimeout(1_500);
	return hop;
}

test.describe('08 · 060 — Quản lý danh mục sản phẩm', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moDanhMuc(page, VAI);
	});

	test('08_060_001 — Mở màn Quản lý danh mục sản phẩm', async ({ page }) => {
		chanNeuTat('08_060_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý danh mục',
		);
		for (const nhan of ['Thêm mới', 'Nhập từ Excel', 'Xuất Excel']) {
			await expect(
				khung(page).getByRole('button', { name: nhan }).first(),
				`Thiếu nút "${nhan}"`,
			).toBeVisible();
		}
		expect(await dong(page).count(), 'Danh sách danh mục rỗng').toBeGreaterThan(0);
	});

	test('08_060_002 — Thêm danh mục - kiểm tra field trên drawer', async ({ page }) => {
		chanNeuTat('08_060_002');
		const { daGoi } = await chanGhi(page);

		const hop = await moFormThem(page);
		const noi = chuan(await hop.innerText());
		expect(
			/tên danh mục|tên/i.test(noi),
			`Form thêm danh mục không có ô tên. Nội dung: ${noi.slice(0, 200)}`,
		).toBe(true);
		expect(daGoi, 'Chỉ mở form mà đã gửi request ghi').toEqual([]);

		test.info().annotations.push({
			type: 'ô trong form thêm danh mục',
			description: (await hop.locator('.ant-form-item-label label').allInnerTexts())
				.map(chuan)
				.join(' · '),
		});
	});

	test('08_060_003 — Thêm danh mục - validate bỏ trống tên danh mục', async ({ page }) => {
		chanNeuTat('08_060_003');
		const { daGoi } = await chanGhi(page);

		const hop = await moFormThem(page);
		const luu = hop.getByRole('button', { name: /Lưu|Xác nhận|Thêm/ }).last();
		await luu.click({ force: true });
		await page.waitForTimeout(2_000);

		const loi = [
			...(await hop.locator('.ant-form-item-explain-error').allInnerTexts()),
			...(await page.locator('.ant-message').allInnerTexts()),
		].map(chuan);
		expect(
			loi.join(' | '),
			'Bấm lưu với tên danh mục TRỐNG mà không có thông báo nào',
		).not.toBe('');
		expect(daGoi, '🔴 Tên danh mục trống mà vẫn gửi request tạo').toEqual([]);
	});

	test('08_060_004 — Nhập danh mục từ Excel - validate chưa chọn file', async ({ page }) => {
		chanNeuTat('08_060_004');
		const { daGoi } = await chanGhi(page);

		await khung(page).getByRole('button', { name: 'Nhập từ Excel' }).first().click({ force: true });
		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await hop.waitFor({ state: 'visible', timeout: 20_000 });
		await page.waitForTimeout(1_500);

		const nut = hop.getByRole('button', { name: /Xác nhận|Nhập|Tải lên/ }).last();
		if ((await nut.count()) === 0) boQua(test, 'Drawer nhập Excel không có nút xác nhận.');
		await nut.click({ force: true });
		await page.waitForTimeout(2_000);

		const thongBao = [
			...(await page.locator('.ant-message').allInnerTexts()),
			...(await hop.locator('.ant-form-item-explain-error').allInnerTexts()),
		].map(chuan);
		expect(
			thongBao.join(' | '),
			'Bấm xác nhận khi CHƯA chọn tệp mà không có thông báo nào',
		).not.toBe('');
		expect(daGoi, 'Chưa chọn tệp mà vẫn gửi request nhập').toEqual([]);
	});

	test('08_060_005 — Nhập danh mục từ Excel - hiển thị tải file mẫu', async ({ page }) => {
		chanNeuTat('08_060_005');

		await khung(page).getByRole('button', { name: 'Nhập từ Excel' }).first().click({ force: true });
		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await hop.waitFor({ state: 'visible', timeout: 20_000 });
		await page.waitForTimeout(1_500);

		const noi = chuan(await hop.innerText());
		expect(
			/tải.*mẫu|file mẫu|tệp mẫu/i.test(noi),
			`Drawer nhập Excel không có chỗ tải tệp mẫu. Nội dung: ${noi.slice(0, 250)}`,
		).toBe(true);
	});

	test('08_060_026 — Giao diện màn Sửa danh mục', async ({ page }) => {
		chanNeuTat('08_060_026');
		const { daGoi } = await chanGhi(page);

		if ((await dong(page).count()) === 0) boQua(test, 'Chưa có danh mục nào để mở màn Sửa.');
		const nut = dong(page).first().locator('td').last().getByRole('button').first();
		if ((await nut.count()) === 0) boQua(test, 'Dòng đầu không có nút thao tác.');
		await nut.click({ force: true });
		await page.waitForTimeout(3_000);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		if ((await hop.count()) === 0) boQua(test, 'Nút thao tác đầu không mở form sửa nào.');

		// 🔴 Các ô phải NẠP SẴN giá trị hiện tại — form trắng nghĩa là mất dữ liệu cũ.
		const o = hop.locator('input[type="text"], input:not([type])').first();
		await expect
			.poll(async () => (await o.inputValue()).length, {
				timeout: 20_000,
				message: 'Form Sửa danh mục không nạp lại giá trị hiện tại',
			})
			.toBeGreaterThan(0);

		const oKhoa = [];
		const dsO = hop.locator('input');
		for (let i = 0; i < (await dsO.count()); i += 1) {
			if (await dsO.nth(i).isDisabled()) oKhoa.push((await dsO.nth(i).getAttribute('id')) || `#${i}`);
		}
		test.info().annotations.push({
			type: 'ô bị khoá ở màn Sửa danh mục',
			description: oKhoa.join(' · ') || '(không ô nào bị khoá)',
		});
		expect(daGoi, 'Chỉ mở form Sửa mà đã gửi request ghi').toEqual([]);
	});
});
