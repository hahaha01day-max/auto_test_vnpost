'use strict';

/**
 * Helper phân hệ 07_1 — Cấu hình chung (`/settings?setting=<key>`).
 *
 * 🔴 Đo 20/09/2026:
 *   - Màn có **menu dọc 32 nhóm cấu hình** bên trái; mở đúng nhóm bằng `?setting=<key>`
 *     (hàm `moKhungCon` trong `shared/auth/login.js` đã xử lý cơ chế này).
 *   - Mỗi nhóm hiện một thẻ tóm tắt + nút **"Sửa"**; bấm Sửa mở **drawer** tiêu đề
 *     `Cấu hình <tên nhóm>`, nút lưu tên **"Lưu cấu hình"** (🚫 không phải "Lưu").
 *   - Ô của nhóm làm tròn tiền: `#decimal` (Đơn vị làm tròn *) · `#roundingMethod` (Phương thức)
 *     + khối **Xem trước kết quả** dạng `12,345.678 → 12,400`.
 *
 * 🔴 Cấu hình ở đây áp cho **toàn hệ thống**: đổi đơn vị làm tròn hay VAT mặc định là đổi cách
 * tính tiền của mọi điểm bán ngay lập tức ⇒ mọi case ghi giữ `allowMutation: false`, và case đọc
 * vẫn bọc `chanGhi()`.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const NHOM = {
	lamTronTien: 'roundingAmount',
	lamTronTienKho: 'roundingAmountStock',
	lamTronSoLuong: 'roundingQuantity',
	tienTe: 'currency',
	vat: 'vatDefault',
	tuDongDangXuat: 'autoLock',
};

const khung = (page) => page.locator('.ant-pro-page-container, main').first();

/** Mở màn cấu hình ở đúng nhóm. */
async function moNhom(page, key, vai) {
	await moTrang(page, `/settings?setting=${key}`, vai);
	await page.waitForTimeout(4_000);
	return khung(page);
}

/** Bấm "Sửa" của nhóm đang mở và trả về drawer. */
async function moFormSua(page) {
	await khung(page).getByRole('button', { name: 'Sửa' }).last().click({ force: true });
	const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	await dr.waitFor({ state: 'visible', timeout: 20_000 });
	await page.waitForTimeout(1_500);
	return dr;
}

/** 🔴 Chặn mọi request ghi cấu hình. */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/config|setting/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

function boQua(test, lyDo) {
	test.skip(true, lyDo);
}

module.exports = { NHOM, boQua, chanGhi, chuan, khung, moFormSua, moNhom };
