'use strict';

/**
 * Helper phân hệ 18_5 — Đổi trả hàng (phần ĐỌC).
 *
 * 🔴 Tạo đơn hoàn trả = **nhập lại kho + hoàn tiền + sửa đơn gốc**, 🚫 không hoàn tác được bằng
 * giao diện ⇒ mọi spec ở đây bọc `chanGhi()` chặn ở tầng mạng mọi request khác GET tới nhóm đơn.
 *
 * Đo từ DOM 20/09/2026 bằng vai `shop`:
 *
 * | Thứ | Giá trị thật |
 * |---|---|
 * | Route | `/order/return-orders` |
 * | Tiêu đề | `Đơn hàng hoàn trả` |
 * | API danh sách | `GET /__api/orders/return-orders?shopId&type&page&size&startTime&endTime` |
 * | Cột | STT · Mã đơn trả · Mã đơn hàng · Khách hàng · Số tiền hoàn · Trạng thái · Ngày tạo · Hành động |
 * | Bộ lọc | cặp ngày (`Ngày bắt đầu` / `Ngày kết thúc`), ô `Mã đơn`, 2 select `Tất cả` + `Chọn trạng thái` |
 * | Nút | `Xuất Excel` · `Đổi trả hàng` |
 *
 * 🔴 Màn 🚫 KHÔNG có tab trạng thái — trạng thái lọc bằng `.ant-select`.
 */

const { moTrang } = require('../../shared/auth/login');

const ROUTE = '/order/return-orders';
const API = '/orders/return-orders';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const oMaDon = (page) => khung(page).locator('input[placeholder="Mã đơn"]').first();

async function moMan(page, vai) {
	const cho = page.waitForResponse((r) => r.url().includes(API) && r.status() !== 401, {
		timeout: 90_000,
	});
	await moTrang(page, ROUTE, vai);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

/** 🔴 Đăng ký chờ TRƯỚC hành động, nếu không là bỏ lỡ response rồi treo tới hết timeout. */
async function taiLaiBoi(page, hanhDong, { timeout = 60_000 } = {}) {
	const cho = page.waitForResponse((r) => r.url().includes(API) && r.status() !== 401, { timeout });
	await hanhDong();
	const res = await cho;
	await page.waitForTimeout(1_000);
	return res;
}

const thamSo = (res) => Object.fromEntries(new URL(res.url()).searchParams.entries());

/** Chặn ở tầng mạng mọi request GHI của nhóm đơn hàng / hoàn trả. */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/\/(orders|order|return-orders|stock)\b/.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

module.exports = { API, ROUTE, chanGhi, chuan, dong, khung, moMan, oMaDon, taiLaiBoi, thamSo };
