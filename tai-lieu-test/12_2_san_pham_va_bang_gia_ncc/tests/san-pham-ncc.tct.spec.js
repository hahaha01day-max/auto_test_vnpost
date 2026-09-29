'use strict';

/**
 * Phân hệ 12_2 — Sản phẩm và bảng giá nhà cung cấp, phần ĐỌC (vai `tct`).
 *
 * 🔴 Viết lại 20/09/2026 thay hai spec cũ (URL production viết cứng). Cả file 🚫 KHÔNG ghi.
 * 🔴 Giá nhập NCC quyết định **giá vốn hàng nhập** ⇒ 48/50 case là case ghi, giữ
 * `allowMutation: false`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const {
	API_SAN_PHAM,
	boQua,
	chanGhi,
	chuan,
	cot,
	dong,
	moDanhSachNCC,
	moTheoNut,
} = require('./ncc-page');

const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('12_2 — Sản phẩm và bảng giá NCC', () => {
	// 🔴 Bỏ chặn ghi (22/09/2026, user chốt): `chanGhi()` trả 403 giả cho mọi request khác GET
	//    tới `/…supplier…` ⇒ 🚫 không case nào tạo được dữ liệu. Case nào lấy "không gửi request
	//    ghi" làm phép kiểm thì tự gọi `chanGhi()` trong chính case đó.
	test.beforeEach(async ({ page }) => {
		await moDanhSachNCC(page, VAI);
	});

	test('12_2_010_001 — Mở Danh sách sản phẩm theo NCC khi có dữ liệu', async ({ page }) => {
		chanNeuTat('12_2_010_001');

		const { box, res } = await moTheoNut(page, 'Sản phẩm', API_SAN_PHAM);
		expect(res, 'Bấm nút "Sản phẩm" mà không gọi API sản phẩm theo NCC').not.toBeNull();
		expect(res.status()).toBe(200);

		// 🔴 URL đổi sang `/supplier/<id>/products` — ghi lại để lần sau khỏi mò.
		expect(page.url(), `URL sau khi bấm: ${page.url()}`).toMatch(/\/supplier\/\d+\/products/);

		const ten = (await cot(box).allInnerTexts()).map(chuan).filter((t) => t !== '');
		for (const c of ['Tên sản phẩm', 'SKU', 'Đơn vị tính', 'Giá nhập', 'Hành động']) {
			expect(ten, `Bảng thiếu cột "${c}"; đang có: ${ten.join(' · ')}`).toContain(c);
		}
		expect(
			await dong(box).count(),
			'NCC đầu tiên chưa có sản phẩm nào — case sẽ "pass rỗng"',
		).toBeGreaterThan(0);
	});

	test('12_2_040_001 — Mở Bảng giá NCC khi có dữ liệu', async ({ page }) => {
		chanNeuTat('12_2_040_001');

		const { box } = await moTheoNut(page, 'Sản phẩm', API_SAN_PHAM);
		const noi = chuan(await box.innerText());

		// Bảng giá NCC = cột "Giá nhập" của danh sách sản phẩm theo NCC (đo 20/09/2026).
		expect(noi, 'Không thấy cột/giá nhập của NCC').toContain('Giá nhập');
		const so = await dong(box).count();
		if (so === 0) boQua(test, 'NCC đầu tiên chưa có sản phẩm nào để đọc giá nhập.');

		const cotTen = (await cot(box).allInnerTexts()).map(chuan);
		const k = cotTen.indexOf('Giá nhập');
		let coGia = 0;
		for (let i = 0; i < so; i += 1) {
			const gt = chuan(await dong(box).nth(i).locator('td').nth(k).innerText());
			if (/\d/.test(gt)) coGia += 1;
		}
		expect(coGia, `Không dòng nào có giá nhập trong ${so} dòng`).toBeGreaterThan(0);
	});
});
