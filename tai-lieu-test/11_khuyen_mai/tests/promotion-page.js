'use strict';

/**
 * Helper phân hệ 11 — Khuyến mãi.
 *
 * 🔴 Route thật (lấy từ link menu *"Danh sách chương trình"*): **`/promotion/campaign`**.
 * API danh sách: `GET /marketing/campaign/v2/list` (marketing-service). Màn còn gọi
 * `loyalty/api/v1/customer-group/get-list` cho nhóm đối tượng.
 *
 * Đo 20/09/2026: tiêu đề **"Quản lý chương trình khuyến mại"**; ô tìm `Tìm kiếm theo mã, tên`;
 * khoảng ngày `Bắt đầu` / `Kết thúc (để trống = vô thời hạn)`; bảng có *Tên chương trình · Hình
 * thức khuyến mại · Loại khuyến mại · Trạng thái · Đối tượng áp dụng · Thời gian hiệu lực ·
 * Thao tác*; nút **"Thêm mới chương trình"**.
 *
 * 🔴 CTKM đang chạy ảnh hưởng **giá bán thật tại quầy** ⇒ mọi case ghi giữ `allowMutation: false`.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE = '/promotion/campaign';
const API = '/marketing/campaign/v2/list';

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const cot = (page) => khung(page).locator('.ant-table-thead th');
const oTim = (page) => khung(page).locator('input[placeholder="Tìm kiếm theo mã, tên"]').first();

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

/** Mở màn/drawer "Thêm mới chương trình". */
async function moThemMoi(page) {
	await khung(page)
		.getByRole('button', { name: 'Thêm mới chương trình' })
		.first()
		.click({ force: true });
	await page.waitForTimeout(4_000);
	const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	return (await hop.count()) ? hop : khung(page);
}

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/campaign|promotion|marketing|loyalty|condition/i.test(req.url())) return route.continue();
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

module.exports = { API, ROUTE, boQua, chanGhi, chuan, cot, dong, khung, moMan, moThemMoi, oTim };
