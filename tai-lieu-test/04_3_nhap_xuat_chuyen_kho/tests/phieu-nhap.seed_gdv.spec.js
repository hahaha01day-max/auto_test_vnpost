'use strict';

/**
 * 04_3 · 020 — Phiếu nhập kho trên **điểm bán seed** `AUTO_SHOP_62391304`, vai `seed_gdv`
 * (Giao dịch viên — có `CREATE_IMPORT_STOCK`; Cửa hàng trưởng bị tắt quyền này).
 *
 * Đo DOM 23/09/2026: nút **"Nhập kho"** (tên trợ năng `import Nhập kho`) ở màn `/inventory/import`
 * mở MODAL "Phiếu nhập kho", 🚫 không chuyển trang. Ô `#code` (tự sinh `NK…`), `#importDate`
 * (tự điền giờ hiện tại), "Người nhập" (tự điền tên người đăng nhập), `#purchaseOrderCode`,
 * `#supplierNote`, ô "Tìm kiếm sản phẩm" (popup tự vẽ, lọc theo TÊN). Chân modal: "Tạo phiếu
 * nháp" · "Nhập kho". 🔴 Ở cấp điểm bán form **không có ô "Nhập từ"**.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { chanGhi } = require('./warehouse-page');
const k = require('./ghi-kho');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_gdv';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

/** 🔴 Từ 23/09/2026 form là DRAWER (trước là Modal) — dùng chung helper `ghi-kho.js`. */
const moPhieuNhap = (page) => k.moFormNhap(page, VAI);

test.describe('04_3 · 020 — Phiếu nhập kho (chỉ đọc / validate, điểm bán seed)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('04_3_020_001 — Mở Phiếu nhập kho và validate rỗng', async ({ page }) => {
		chanNeuTat('04_3_020_001');
		const { daGoi } = await chanGhi(page);
		const md = await moPhieuNhap(page);

		// Xoá sạch hai ô tự điền để form thật sự rỗng.
		await md.locator('#code').fill('');
		const oNgay = md.locator('#importDate');
		await oNgay.hover();
		await md.locator('.ant-picker-clear').first().click().catch(() => {});
		await expect(oNgay, 'Không xoá được ô Thời gian tạo phiếu').toHaveValue('');

		await md.getByRole('button', { name: /^(import )?Nhập kho$/ }).last().click();
		await page.waitForTimeout(1_500);
		const loi = (await md.locator('.ant-form-item-explain-error').allInnerTexts()).map(chuan);
		const nhan = (await md.locator('.ant-form-item-label').allInnerTexts()).map(chuan);

		expect(loi, `Bỏ trống Mã hoá đơn mà không báo lỗi. Lỗi đang có: ${loi.join(' · ')}`).toContain('Nhập mã hoá đơn / chứng từ');
		expect(loi.length, `Bỏ trống Thời gian tạo phiếu mà chỉ có ${loi.length} lỗi: ${loi.join(' · ')}`).toBeGreaterThanOrEqual(2);
		// Kịch bản đòi thêm "Nhập từ" bắt buộc — ghi lại hành vi thật, 🚫 không hạ kỳ vọng.
		expect(nhan, `Form cấp điểm bán không có ô "Nhập từ". Các ô đang có: ${nhan.join(' · ')}`).toContain('Nhập từ');
		expect(daGoi, 'Form rỗng mà vẫn gửi request tạo phiếu').toEqual([]);
	});

	test('04_3_020_005 — Thông tin tự điền khi mở form tạo phiếu nhập', async ({ page }) => {
		chanNeuTat('04_3_020_005');
		await chanGhi(page);
		const md = await moPhieuNhap(page);

		// Danh sách ô tự điền lấy từ code `import_receipt.jsx`: mã chứng từ, thời gian, người nhập.
		const ma = await md.locator('#code').inputValue();
		expect(ma, 'Mã hoá đơn / chứng từ không tự sinh').toMatch(/^NK\w+/);
		const vn = new Date(Date.now() + 7 * 3600 * 1000);
		const p = (x) => String(x).padStart(2, '0');
		const homNay = `${p(vn.getUTCDate())}/${p(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()}`;
		expect(await md.locator('#importDate').inputValue(), 'Thời gian tạo phiếu không phải hôm nay').toContain(homNay);
		const nguoiNhap = chuan(await md.locator('.ant-form-item').filter({ hasText: 'Người nhập' }).first().innerText());
		expect(nguoiNhap, 'Người nhập không tự điền đúng người đang đăng nhập').toContain(seed.doc().duLieu.taiKhoanLan?.gdv?.maNhanVien ?? 'AUTO_NV_64359388');
	});
});
