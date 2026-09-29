'use strict';

/**
 * Helper phân hệ 04_5 — Quản lý tồn kho.
 *
 * Trace 20/09/2026:
 *
 * | Màn | Route | API |
 * |---|---|---|
 * | Tổng quan kho | `/inventory/overview` | `GET /shops/{shopId}/stock/v3/overview` |
 * | Quản lý kho hàng | `/inventory/warehouses` | `GET /shops/{shopId}/inventory` |
 * | Thẻ kho | thẻ **"Thẻ kho"** trong `/inventory/import` | — |
 *
 * 🔴 Thẻ kho 🚫 KHÔNG phải một route riêng: nó là thẻ thứ ba của màn Lịch sử xuất nhập kho.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE_TONG_QUAN = '/inventory/overview';
const ROUTE_KHO = '/inventory/warehouses';
const ROUTE_LICH_SU = '/inventory/import';

const API_TONG_QUAN = '/stock/v3/overview';
const API_KHO = '/inventory';
const API_LICH_SU = '/stock/v2/import-export/find';

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const cot = (page) => khung(page).locator('.ant-table-thead th');

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

const moTongQuan = (page, vai) => moMan(page, ROUTE_TONG_QUAN, vai, API_TONG_QUAN);
const moQuanLyKho = (page, vai) => moMan(page, ROUTE_KHO, vai, API_KHO);

/** Mở thẻ "Thẻ kho" trong màn Lịch sử xuất nhập kho. */
async function moTheKho(page, vai) {
	await moMan(page, ROUTE_LICH_SU, vai, API_LICH_SU);
	// 🔴 `.click()` trần KHÔNG đổi tab ở antd v6.
	await khung(page)
		.locator('.ant-tabs-tab', { hasText: 'Thẻ kho' })
		.first()
		.locator('.ant-tabs-tab-btn')
		.dispatchEvent('click');
	await page.waitForTimeout(6_000);
	return page.locator('.ant-tabs-tabpane-active');
}

/** 🔴 Chặn mọi request ghi của nhóm kho. */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/\/stock|\/shops\b|\/inventor/.test(req.url())) return route.continue();
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
	API_KHO,
	API_LICH_SU,
	API_TONG_QUAN,
	ROUTE_KHO,
	ROUTE_LICH_SU,
	ROUTE_TONG_QUAN,
	boQua,
	chanGhi,
	chuan,
	cot,
	dong,
	khung,
	moMan,
	moQuanLyKho,
	moTheKho,
	moTongQuan,
};
