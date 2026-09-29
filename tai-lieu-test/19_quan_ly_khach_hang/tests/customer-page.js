'use strict';

/**
 * Helper phân hệ 19 — Quản lý khách hàng (phần ĐỌC).
 *
 * Đo từ DOM 20/09/2026:
 *
 * | Vai | API danh sách | Số dòng | Nút ở `extra` |
 * |---|---|--:|---|
 * | `gdv` (điểm bán) | `GET /__api/chain-customer/get-all-in-chain-and-shop/<chainId>?shopId=&pageNum=&pageSize=` | 10.236 khách | chỉ `Xuất Excel` |
 * | `province` (tỉnh) | `GET /__api/chain-customers/get-all-by-chain?pageNum=&pageSize=` | 0 khách | `Xuất Excel` · `Nhập Excel` · `Thêm khách hàng` |
 *
 * 🔴 Hai vai gọi **hai endpoint khác nhau** (`chain-customer` số ít vs `chain-customers` số nhiều).
 * Cột bảng giống nhau: `# · Mã khách hàng · Tên khách hàng · Số điện thoại · Giới tính · Ngày sinh · Địa chỉ`.
 * 🔴 Ô tìm kiếm **tự lọc khi ngừng gõ** (debounce), 🚫 không cần Enter.
 */

const { moTrang } = require('../../shared/auth/login');

const ROUTE = '/customer';
/** Khớp cả hai endpoint của hai cấp. */
const API = /chain-customers?\/get-all/;

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const oTim = (page) =>
	khung(page).locator('input[placeholder="Tên / số điện thoại khách hàng"]').first();

async function moMan(page, vai) {
	const cho = page.waitForResponse((r) => API.test(r.url()) && r.status() !== 401, {
		timeout: 90_000,
	});
	await moTrang(page, ROUTE, vai);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

/** 🔴 Đăng ký chờ TRƯỚC hành động. */
async function taiLaiBoi(page, hanhDong, { timeout = 60_000 } = {}) {
	const cho = page.waitForResponse((r) => API.test(r.url()) && r.status() !== 401, { timeout });
	await hanhDong();
	const res = await cho;
	await page.waitForTimeout(1_000);
	return res;
}

const thamSo = (res) => Object.fromEntries(new URL(res.url()).searchParams.entries());

/** Gõ vào ô tìm rồi chờ debounce tự lọc. */
async function tim(page, tuKhoa) {
	return taiLaiBoi(page, async () => {
		await oTim(page).fill(tuKhoa);
	});
}

/** Tổng số khách đọc từ tiêu đề `Danh sách khách hàng (10,236 khách hàng)`; `0` khi bảng rỗng. */
async function tongSo(page) {
	const t = chuan(await khung(page).innerText());
	const m = t.match(/Danh sách khách hàng\s*\(([\d.,]+)/);
	if (m) return Number(m[1].replace(/[.,]/g, ''));
	return (await dong(page).count()) === 0 ? 0 : null;
}

/** Chặn mọi request GHI của nhóm khách hàng. */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/customer|debt|loyalty/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

module.exports = { API, ROUTE, chanGhi, chuan, dong, khung, moMan, oTim, taiLaiBoi, thamSo, tim, tongSo };
