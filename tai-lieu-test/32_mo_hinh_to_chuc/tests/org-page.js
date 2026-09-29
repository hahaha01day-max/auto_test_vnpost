'use strict';

/**
 * Helper phân hệ 32 — Mô hình tổ chức.
 *
 * Đo từ DOM 20/09/2026, route `/chain/organization-management`:
 *
 * | Thứ | Giá trị thật |
 * |---|---|
 * | Tiêu đề | `Mô hình tổ chức` |
 * | Cây | `.ant-tree-treenode` (16 nút lúc mở màn), 🚫 KHÔNG phải bảng |
 * | Bộ lọc | ô `Tìm kiếm` · select `Lọc theo vùng` · select `Trạng thái` |
 * | Nút | `Nhập từ excel` · `Xuất excel` · `Thêm đơn vị` |
 * | Khung phải | `Vui lòng chọn một đơn vị để xem chi tiết` khi chưa chọn nút nào |
 *
 * 🔴 Trang có **2 thẻ `<main>`** (layout ngoài + khung chi tiết) ⇒ `page.locator('main')` vi phạm
 * strict mode. Luôn dùng `khung()`/`khungChiTiet()` ở đây.
 */

const { moTrang } = require('../../shared/auth/login');

const ROUTE = '/chain/organization-management';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const khung = (page) => page.locator('.ant-pro-layout-content').first();
const khungChiTiet = (page) => page.locator('main').last();
const nutCay = (page) => khung(page).locator('.ant-tree-treenode');
const oTim = (page) => khung(page).locator('input[placeholder*="m ki"]').first();

async function moMan(page, vai = 'tct') {
	await moTrang(page, ROUTE, vai);
	await page.waitForTimeout(6_000);
	return nutCay(page).count();
}

/** Chọn một nút trên cây (mặc định nút đầu có chữ), trả về nhãn đã chọn. */
async function chonNut(page, viTri = 0) {
	const n = await nutCay(page).count();
	if (n <= viTri) return null;
	const nut = nutCay(page).nth(viTri);
	const ten = chuan(await nut.innerText());
	await nut.locator('.ant-tree-node-content-wrapper').first().click();
	await page.waitForTimeout(3_000);
	return ten;
}

/** Gõ từ khoá vào ô tìm trên cây rồi chờ cây lọc lại (lọc phía client). */
async function tim(page, tuKhoa) {
	await oTim(page).fill(tuKhoa);
	await oTim(page).press('Enter');
	await page.waitForTimeout(2_500);
}

/**
 * 🔴 Chặn mọi request GHI của mô hình tổ chức.
 *
 * Thêm/sửa/xoá đơn vị ở đây **đổi cây tổ chức thật của toàn mạng lưới** — mọi phân hệ khác lọc
 * theo cây này. 🚫 Không hoàn tác được bằng giao diện.
 *
 * 🔴 🚫 KHÔNG lọc theo `auth`/`shops` chung chung: đăng nhập và chọn phạm vi cũng POST qua đó.
 */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/org-unit|organization|chain-org|hub|employee-assign/i.test(req.url())) {
			return route.continue();
		}
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

module.exports = { ROUTE, chanGhi, chonNut, chuan, khung, khungChiTiet, moMan, nutCay, oTim, tim };
