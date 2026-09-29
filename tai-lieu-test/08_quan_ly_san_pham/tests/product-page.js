'use strict';

/**
 * Helper phân hệ 08 — Quản lý sản phẩm.
 *
 * Trace 20/09/2026:
 *
 * | Màn | Route | API |
 * |---|---|---|
 * | Quản lý sản phẩm | `/product/normal` | `GET /chain/products/get-all` |
 * | Quản lý danh mục | `/product/category?type=0` | `GET /chain/product-categories?type=0` |
 *
 * Màn sản phẩm có **3 thẻ**: *Sản phẩm · Sản phẩm sản xuất · Sản phẩm tự doanh*; bảng 9 cột
 * *SKU · Tên sản phẩm · Hình thức phân phối · Đơn vị · Giá bán · Danh mục · Thương hiệu ·
 * Trạng thái · Hành động*; nút *Thêm mới · Quản lý danh mục · Quản lý thương hiệu · Nhập từ Excel ·
 * Xuất Excel*.
 *
 * 🔴 Quy tắc 1 của repo: sản phẩm và đơn vị tính phải đọc `CHAIN_PRODUCTS` / `CHAIN_PRODUCT_UNIT`,
 * 🚫 cấm `SHOP_PRODUCTS`. Case nào đối chiếu đơn vị/giá phải ghi rõ nguồn.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE_SAN_PHAM = '/product/normal';
const ROUTE_DANH_MUC = '/product/category?type=0';
const API_SAN_PHAM = '/chain/products/get-all';
const API_DANH_MUC = '/chain/product-categories';

// 🔴 Cột ĐẦU TIÊN là `#` (số thứ tự), 🚫 đừng bỏ quên khi so khít danh sách cột.
const COT_SAN_PHAM = [
	'#',
	'SKU',
	'Tên sản phẩm',
	'Hình thức phân phối',
	'Đơn vị',
	'Giá bán',
	'Danh mục',
	'Thương hiệu',
	'Trạng thái',
	'Hành động',
];

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');

/**
 * Chỉ các dòng SẢN PHẨM thật.
 *
 * 🔴 Bảng sản phẩm **gộp nhóm theo danh mục**: dòng đầu mỗi nhóm là một dòng tiêu đề chỉ có **2 ô**
 * (`''` và `Thời trang > Quần`). Lấy `.ant-table-row` trần là trúng ngay dòng nhóm đó, rồi
 * `td.nth(9)` không tồn tại và test đỏ với `locator.innerText: Timeout` — lý do đọc như lỗi mạng.
 */
const dongSanPham = (page) =>
	dong(page).filter({ has: page.locator('td:nth-child(9)') });
const cot = (page) => khung(page).locator('.ant-table-thead th');
const oTim = (page) => khung(page).locator('input[placeholder]').first();

async function moMan(page, route, vai, apiPhan) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(apiPhan) && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, route, vai);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

const moSanPham = (page, vai) => moMan(page, ROUTE_SAN_PHAM, vai, API_SAN_PHAM);
const moDanhMuc = (page, vai) => moMan(page, ROUTE_DANH_MUC, vai, API_DANH_MUC);

/** Tìm kiếm ở màn sản phẩm rồi chờ đúng response. */
async function tim(page, tuKhoa, apiPhan = API_SAN_PHAM) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(apiPhan) && r.status() !== 401,
		{ timeout: 60_000 },
	);
	await oTim(page).fill(tuKhoa);
	await oTim(page).press('Enter');
	const res = await cho.catch(() => null);
	await page.waitForTimeout(1_500);
	return res;
}

/** 🔴 Chặn mọi request ghi sản phẩm / danh mục. */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/product|categor|brand/i.test(req.url())) return route.continue();
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
	API_DANH_MUC,
	API_SAN_PHAM,
	COT_SAN_PHAM,
	ROUTE_DANH_MUC,
	ROUTE_SAN_PHAM,
	boQua,
	chanGhi,
	chuan,
	cot,
	dong,
	dongSanPham,
	khung,
	moDanhMuc,
	moMan,
	moSanPham,
	oTim,
	tim,
};
