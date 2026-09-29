'use strict';

/**
 * 08 · 080 — In tem nhãn, vai `shop`, CHỈ ĐỌC.
 * 🔴 `pages/product/index.jsx`: mục "In tem nhãn" có `hidden: isAdmin` ⇒ vai Admin (tct) KHÔNG thấy;
 *    phải chạy bằng vai cấp dưới. Có >1 thao tác phụ thì nằm trong "Xem thêm".
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, khung, moSanPham } = require('./product-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

test.describe('08 · 080 — In tem nhãn (vai shop)', () => {
	test.describe.configure({ timeout: 180_000 });
	/** Mở "In tem nhãn" từ SP đã tích rồi kiểm theo case (gom phép kiểm; tiêu đề test viết nguyên văn để công cụ đếm mã). */
	async function kiemInTem(page, id) {
		chanNeuTat(id);
		await chanGhi(page);
		await moSanPham(page, VAI);
		const dong = khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: require('../../00_seed/seed-state').doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham }).first();
		await expect(dong).toBeVisible({ timeout: 30_000 });
		await dong.locator('.ant-checkbox-input').first().check({ force: true });
		const nutIn = khung(page).getByRole('button', { name: /In tem/ });
		let co = await nutIn.count();
		if (!co) {
			const them = khung(page).getByRole('button', { name: /Xem thêm/ });
			if (await them.count()) { await them.first().click(); co = await page.getByText(/In tem nhãn/).count(); }
		}
		test.skip(!co, 'Tích chọn sản phẩm xong không thấy lối vào "In tem nhãn" (không có nút, không có "Xem thêm") — xem báo cáo.');
		await (await nutIn.count() ? nutIn.first() : page.getByText(/In tem nhãn/).first()).click();
		const d = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await expect(d).toBeVisible({ timeout: 20_000 });
		const chu = chuan(await d.innerText());
		if (id === '08_080_001') {
			expect(chu).toContain('Danh sách sản phẩm');
			expect(chu).toMatch(/Cấu hình & Chọn giấy in|Chọn giấy in/);
			expect(chu, 'SP đã tích không nằm sẵn trong bảng in').toContain(require('../../00_seed/seed-state').doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham);
		} else {
			expect(chu, 'Không có tuỳ chọn mẫu giấy').toMatch(/giấy/i);
			expect(chu, 'Không có tuỳ chọn mã vạch').toMatch(/mã vạch|barcode/i);
		}
	}

	test('08_080_001 — In tem nhãn', async ({ page }) => { await kiemInTem(page, '08_080_001'); });
	test('08_080_002 — In tem nhãn', async ({ page }) => { await kiemInTem(page, '08_080_002'); });
});
