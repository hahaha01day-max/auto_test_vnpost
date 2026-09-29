'use strict';

/**
 * Helper nhóm **xuất trả nhà cung cấp** (phân hệ 14_1 lập phiếu · 14_2 gom/tách).
 *
 * Trace 20/09/2026:
 *
 * | Thứ | Giá trị |
 * |---|---|
 * | Route danh sách | `/inventory/stock-return-request` — tiêu đề *Xuất trả nhà cung cấp* |
 * | Route tạo phiếu | `/inventory/stock-return-request/create` — *Tạo phiếu xuất trả nhà cung cấp* |
 * | API danh sách | `GET /stock/v2/stock-return-request` |
 *
 * 🔴 Nút trên màn **đổi theo vai**: `shop` thấy **"Tạo phiếu trả"**; `province` thấy
 * **"Gom phiếu (N)"** kèm cột ô chọn. Đo trực tiếp, 🚫 đừng giả định vai nào cũng như nhau.
 *
 * 🔴 Form tạo phiếu có hai nguồn hàng: **"Theo phiếu nhập kho"** (mặc định) và
 * **"Theo SKU / Mã lô / Serial"**.
 */

const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE = '/inventory/stock-return-request';
const ROUTE_TAO = '/inventory/stock-return-request/create';
const API = '/stock/v2/stock-return-request';

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const cot = (page) => khung(page).locator('.ant-table-thead th');

async function moDanhSach(page, vai) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API) && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, ROUTE, vai);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

/** Mở form tạo phiếu trả (chỉ vai điểm bán có nút này). */
async function moFormTao(page) {
	const nut = khung(page).getByRole('button', { name: 'Tạo phiếu trả' }).first();
	if ((await nut.count()) === 0) return null;
	await nut.click({ force: true });
	await page.waitForTimeout(5_000);
	return khung(page);
}

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/stock|return|invoice/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

module.exports = { API, ROUTE, ROUTE_TAO, chanGhi, chuan, cot, dong, khung, moDanhSach, moFormTao };
