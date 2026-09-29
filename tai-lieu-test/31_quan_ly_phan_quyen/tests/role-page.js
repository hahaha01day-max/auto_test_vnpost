'use strict';

/**
 * Helper phân hệ 31 — Quản lý vai trò & phân quyền.
 *
 * Đo từ DOM 20/09/2026:
 *
 * | Màn | Route | Tiêu đề | Ghi chú |
 * |---|---|---|---|
 * | Vai trò | `/role-management/function` | `Quản lý vai trò` | bảng **gom nhóm theo phạm vi**, 14 vai trò |
 * | Chức năng | `/role-management/permission` | `Quản lý chức năng` | cây nhóm chức năng |
 * | Quyền (API) | `/role-management/assign` | `Quản lý quyền (API)` | — |
 *
 * API danh sách vai trò: `GET /__api/auth/chain-role/get-all?page=0&size=5000&sort=createdDate,desc`.
 * 🔴 `size=5000` ⇒ màn **nạp một lần toàn bộ**, lọc/tìm chạy **phía client**, 🚫 không có phân trang.
 *
 * Cột thật: `Tên Vai trò / Nhóm · Phạm vi · Ghi chú · Thao tác`; mỗi dòng vai trò có nút
 * `Gán chức năng` + `Gán nhân viên`. Thanh công cụ: `Xuất excel · Thêm vai trò · Thu gọn tất cả`.
 */

const { moTrang } = require('../../shared/auth/login');

const ROUTE_VAI_TRO = '/role-management/function';
const ROUTE_CHUC_NANG = '/role-management/permission';
const API = '/auth/chain-role/get-all';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
// 🔴 Màn này 🚫 KHÔNG dùng `.ant-table` — nó là **`.ant-tree`**. Bám `.ant-table-tbody tr` ở đây
//    trả 0 dòng và triệu chứng là "không có vai trò nào", rất dễ tưởng thiếu dữ liệu.
const dong = (page) => khung(page).locator('.ant-tree-treenode');
const oTim = (page) => khung(page).locator('input[placeholder*="m ki"]').first();

/** Node vai trò thật — 🔴 node gom nhóm theo phạm vi KHÔNG có nút thao tác, phải loại ra. */
const dongVaiTro = (page) => dong(page).filter({ hasText: /Gán chức năng/ });

/** Nhãn cột của bảng cây (header tự dựng, 🚫 không phải `.ant-table-thead`). */
async function nhanCot(page) {
	const chu = chuan(await khung(page).innerText());
	const m = chu.match(/Tên Vai trò[^|]*?Thao tác/);
	return m ? m[0] : '';
}

async function moMan(page, route, vai) {
	const trangThai = [];
	page.on('response', (r) => {
		if (r.url().includes(API)) trangThai.push(r.status());
	});
	await moTrang(page, route, vai);
	await page.waitForTimeout(6_000);
	return trangThai;
}

const moVaiTro = (page, vai = 'tct') => moMan(page, ROUTE_VAI_TRO, vai);
const moChucNang = (page, vai = 'tct') => moMan(page, ROUTE_CHUC_NANG, vai);

/** Gõ từ khoá rồi chờ lọc phía client (🚫 không chờ response — màn nạp sẵn 5000 dòng). */
async function tim(page, tuKhoa) {
	await oTim(page).fill(tuKhoa);
	await oTim(page).press('Enter');
	await page.waitForTimeout(2_500);
}

/**
 * 🔴 Chặn MỌI request ghi của nhóm phân quyền.
 *
 * Sửa vai trò/chức năng ở đây là **đổi quyền của người thật trên hệ thống thật** — 🚫 không hoàn
 * tác được bằng giao diện và hậu quả lan ra mọi màn khác.
 */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		// 🔴 🚫 KHÔNG chặn theo `auth` chung chung: đăng nhập và chọn phạm vi cũng đi qua
		//    `/auth/**` bằng POST — chặn cả cụm là hỏng bước mở màn, rồi đổ oan cho locator.
		if (!/chain-role|role-function|\/role\/|permission|\/function/i.test(req.url())) {
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

module.exports = {
	API, ROUTE_CHUC_NANG, ROUTE_VAI_TRO, chanGhi, chuan, dong, dongVaiTro, khung, moChucNang,
	moMan, moVaiTro, nhanCot, oTim, tim,
};
