'use strict';

/**
 * Helper phân hệ 12_1 — Hồ sơ nhà cung cấp.
 *
 * 🔴 Route THẬT là **`/supplier/list`** (đo 20/09/2026). 🚫 Không phải
 * `/inventory/warehouse-supplier` như spec cũ viết cứng — đường đó 🚫 không còn điều hướng được.
 *
 * | Thứ | Giá trị |
 * |---|---|
 * | API danh sách NCC | `GET /chain-supplier?orgUnitType=…&page&size&status` |
 * | API nhóm NCC | `GET /chain-supplier-groups` |
 * | Nút trên màn | *Nhập từ Excel · **Quản lý Nhóm NCC** · Thêm mới · Sản phẩm · Công nợ* |
 *
 * 🔴 Màn **Nhóm NCC** 🚫 không có route riêng đi thẳng được — vào bằng nút *"Quản lý Nhóm NCC"*.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE = '/supplier/list';
const API_NCC = '/chain-supplier?';
const API_NHOM = '/chain-supplier-groups';

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const cot = (page) => khung(page).locator('.ant-table-thead th');
const oTim = (page) => khung(page).locator('input[placeholder]').first();

async function moMan(page, vai) {
	const cho = page.waitForResponse(
		(r) => r.url().includes('/chain-supplier') && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, ROUTE, vai);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

/** Vào màn Nhóm NCC bằng nút trên màn danh sách. */
async function moNhomNCC(page) {
	await khung(page)
		.getByRole('button', { name: 'Quản lý Nhóm NCC' })
		.first()
		.click({ force: true });
	await page.waitForTimeout(4_000);
	const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	return (await hop.count()) ? hop : khung(page);
}

/** Tìm kiếm rồi chờ đúng response. */
async function tim(page, tuKhoa) {
	const cho = page.waitForResponse(
		(r) => r.url().includes('/chain-supplier') && r.status() !== 401,
		{ timeout: 60_000 },
	);
	await oTim(page).fill(tuKhoa);
	await oTim(page).press('Enter');
	const res = await cho.catch(() => null);
	await page.waitForTimeout(1_500);
	return res;
}

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/supplier/i.test(req.url())) return route.continue();
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
	API_NCC,
	API_NHOM,
	ROUTE,
	boQua,
	chanGhi,
	chuan,
	cot,
	dong,
	khung,
	moMan,
	moNhomNCC,
	oTim,
	tim,
};
