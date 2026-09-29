'use strict';

/**
 * Helper phân hệ 04_2 — Tồn kho đầu kỳ (`/inventory/opening-balance`).
 *
 * Trace từ `@service/openingBalanceService.js` (BASE = `/opening-balance`, đi CORE qua gateway):
 *
 * | Việc | Method + URL |
 * |---|---|
 * | Danh sách lượt khai báo | `GET /opening-balance/previews` |
 * | Tệp mẫu | `GET /opening-balance/template` |
 * | Nạp file | `POST /opening-balance/uploads` |
 * | Dòng của một lượt | `GET /opening-balance/previews/{id}/items` |
 * | Sửa / xoá một dòng | `PUT` · `DELETE …/items/{itemId}` |
 * | Huỷ bản xem trước | `DELETE /opening-balance/previews/{id}` |
 * | 🔴 Tạo phiếu (GHI TỒN) | `POST /opening-balance/previews/{id}/confirm` |
 *
 * 🔴 Ranh giới an toàn của phân hệ này: **`confirm` là điểm không quay lại được** — khai báo tồn
 * đầu kỳ **CỘNG DỒN vào tồn hiện có** và kéo theo giá vốn bình quân. Mỗi sản phẩm/biến thể chỉ khai
 * được **một lần tại một kho** (điểm bán thì khai nhiều lần được, miễn không trùng sản phẩm đã khai
 * hoặc đã có phiếu nhập) ⇒ confirm xong là sản phẩm đó hết dùng lại được. Vì vậy `chanGhiTon()` chặn riêng `confirm` (và các thao tác ghi khác), còn
 * `chanMoiGhi()` chặn tất cả.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE = '/inventory/opening-balance';
const API_PREVIEWS = '/opening-balance/previews';
const API_UPLOAD = '/opening-balance/uploads';
const API_TEMPLATE = '/opening-balance/template';

/** Sáu nhãn của bộ lọc trạng thái lượt khai báo, đúng thứ tự trong code. */
const TRANG_THAI_LUOT = [
	'Tất cả trạng thái',
	'Chờ xử lý',
	'Đang xử lý',
	'Chờ xác nhận',
	'Đã xác nhận',
	'Thất bại',
];

/** 11 cột của bảng danh sách lượt khai báo. */
const COT_DANH_SACH = [
	'Điểm bán / kho',
	'Tỉnh',
	'Xã',
	'Tổng dòng',
	'Hợp lệ',
	'Lỗi',
	'Tổng SL',
	'Tổng giá trị',
	'Trạng thái',
	'Ngày tạo',
	'Thao tác',
];

async function moMan(page, vai) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API_PREVIEWS) && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, ROUTE, vai);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const cot = (page) => khung(page).locator('.ant-table-thead th');
const oTim = (page) =>
	khung(page).locator('input[placeholder="Tìm theo mã preview / tên file / ghi chú"]').first();
const oLocDiemBan = (page) =>
	khung(page).locator('.ant-select').filter({ hasText: /Lọc theo Kho|Điểm bán/ }).first();

/**
 * 🔴 Chặn TOÀN BỘ request ghi của phân hệ tồn đầu kỳ, kể cả `uploads`.
 * Dùng cho case chỉ kiểm giao diện / phân quyền.
 */
async function chanMoiGhi(page) {
	const daGoi = [];
	await page.route('**/opening-balance/**', async (route) => {
		if (route.request().method() === 'GET') return route.continue();
		daGoi.push(`${route.request().method()} ${route.request().url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

/**
 * Chặn đúng những thao tác **ghi vào tồn kho**, vẫn cho nạp file để dựng bản xem trước.
 *
 * 🔴 `confirm` là thứ phải chặn bằng mọi giá: nó cộng hàng vào tồn thật. `DELETE previews/{id}`
 * cũng chặn để bản xem trước của người khác không bị xoá nhầm.
 */
async function chanGhiTon(page) {
	const daGoi = [];
	await page.route('**/opening-balance/**', async (route) => {
		const req = route.request();
		const url = req.url();
		const nguyHiem =
			/\/confirm(\?|$)/.test(url) ||
			(req.method() === 'DELETE' && /\/previews\/[^/]+(\?|$)/.test(url));
		if (!nguyHiem) return route.continue();
		daGoi.push(`${req.method()} ${url}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

/** Bỏ qua kèm lý do — 🚫 không bao giờ để case thiếu dữ liệu nền tự pass. */
function boQua(test, lyDo) {
	test.skip(true, lyDo);
}

module.exports = {
	API_PREVIEWS,
	API_TEMPLATE,
	API_UPLOAD,
	COT_DANH_SACH,
	ROUTE,
	TRANG_THAI_LUOT,
	boQua,
	chanGhiTon,
	chanMoiGhi,
	chuan,
	cot,
	dong,
	khung,
	moMan,
	oLocDiemBan,
	oTim,
};
