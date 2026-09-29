'use strict';

/**
 * Helper phân hệ 10 — Bảng giá bán sản phẩm.
 *
 * 🔴 Route THẬT là **`/product/pricing`** (đo 20/09/2026, lấy từ chính link menu "Bảng giá").
 * 🚫 Không phải `/product/price` hay `/settings/price-policy` — hai đường đó mở ra trang trắng.
 * Màn còn một người anh em `/product/standard-pricing` ("Bảng giá tiêu chuẩn") — 🚫 đừng lẫn.
 *
 * | Thứ | Giá trị |
 * |---|---|
 * | API danh sách | `GET /chain-price-list/get-all` |
 * | Ô tìm | `Nhập tên bảng giá` — **tự lọc khi ngừng gõ**, 🚫 không có nút tìm |
 * | Bộ lọc | Trạng thái · Trạng thái phê duyệt · Trạng thái áp dụng · Phân loại bảng giá · Phạm vi khu vực · khoảng ngày (`Bắt đầu` / `Kết thúc (để trống = vô thời hạn)`) |
 * | Cột | STT · Tên bảng giá · Phân loại bảng giá · Thời gian hiệu lực · Giá gồm thuế · Trạng thái · Trạng thái áp dụng · Trạng thái phê duyệt · Thời gian tạo · Thao tác |
 *
 * 🔴 Bảng giá quyết định **giá bán của cả mạng lưới**; phê duyệt / xoá là thao tác không lùi được
 * ⇒ mọi case ghi giữ `allowMutation: false`, case đọc bọc `chanGhi()`.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE = '/product/pricing';
const API = '/chain-price-list/get-all';

const COT = [
	'STT',
	'Tên bảng giá',
	'Phân loại bảng giá',
	'Thời gian hiệu lực',
	'Giá gồm thuế',
	'Trạng thái',
	'Trạng thái áp dụng',
	'Trạng thái phê duyệt',
	'Thời gian tạo',
	'Thao tác',
];

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const cot = (page) => khung(page).locator('.ant-table-thead th');
const oTim = (page) => khung(page).locator('input[placeholder="Nhập tên bảng giá"]').first();
const oLoc = (page, nhan) =>
	khung(page).locator('.ant-select').filter({ hasText: nhan }).first();

async function moMan(page, vai) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API) && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, ROUTE, vai);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

/** Chờ đúng response danh sách kế tiếp quanh một hành động. */
async function taiLaiBoi(page, hanhDong, { timeout = 60_000 } = {}) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API) && r.status() !== 401,
		{ timeout },
	);
	await hanhDong();
	const res = await cho.catch(() => null);
	await page.waitForTimeout(1_500);
	return res;
}

/** Chọn một option theo nhãn trong ô lọc. */
async function chonLoc(page, nhanO, nhanOption) {
	const o = oLoc(page, nhanO);
	await o.click();
	const dd = page.locator('.ant-select-dropdown').last();
	await dd.waitFor({ state: 'visible', timeout: 15_000 });
	await dd.locator('.ant-select-item-option-content', { hasText: nhanOption }).first().click();
	await page.waitForTimeout(500);
}

/** Danh sách nhãn option của một ô lọc. */
async function nhanCacOption(page, nhanO) {
	const o = oLoc(page, nhanO);
	await o.click();
	const dd = page.locator('.ant-select-dropdown').last();
	await dd.waitFor({ state: 'visible', timeout: 15_000 });
	const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
	await page.keyboard.press('Escape');
	await page.waitForTimeout(400);
	return nhan;
}

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/price|product/i.test(req.url())) return route.continue();
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

module.exports = {
	API,
	COT,
	ROUTE,
	boQua,
	chanGhi,
	chonLoc,
	chuan,
	cot,
	dong,
	khung,
	moMan,
	nhanCacOption,
	oLoc,
	oTim,
	taiLaiBoi,
};
