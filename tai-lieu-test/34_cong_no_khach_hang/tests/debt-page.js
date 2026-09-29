'use strict';

/**
 * Helper phân hệ 34 — Quản lý công nợ khách hàng.
 *
 * 🔴 Route trong kịch bản (`/finance/customer-debt`) **KHÔNG tồn tại** — route thật là
 * `/debt-reconciliation/customer-debt` (xem `config.jsx: CUSTOMER_DEBT`).
 *
 * Đo từ DOM 20/09/2026:
 *
 * | Thứ | Giá trị thật |
 * |---|---|
 * | Tiêu đề | `Quản lý công nợ khách hàng` |
 * | Thẻ số liệu | `KHÁCH NỢ · SỐ ĐƠN CÒN NỢ · TỔNG PHẢI THU · TỔNG ĐÃ THU · TỔNG CÒN NỢ` |
 * | Cột | `# · Tên khách hàng · Số điện thoại · Tổng số đơn · Tổng phải thu · Tổng đã trả · Tổng còn nợ · Lần ghi nợ cuối · Thao tác` |
 * | API | `GET /__api/report/customer-debt/{summary,customers}?fromDate=&toDate=&shopId=&page=&size=` |
 * | Bộ lọc | ô `Nhập tên hoặc số điện thoại khách hàng` · cặp ngày · select `Điểm bán (<id>)` |
 *
 * 🔴 Vai `gdv` nhận **401** ở cả hai API ⇒ mọi con số về 0 mà **không có thông báo lỗi nào**.
 */

const { moTrang } = require('../../shared/auth/login');

const ROUTE = '/debt-reconciliation/customer-debt';
const API = '/report/customer-debt/customers';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const soTu = (s) => Number(chuan(s).replace(/[^\d-]/g, '') || 0);

const khung = (page) => page.locator('.ant-pro-layout-content').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const oTim = (page) => khung(page).locator('input[placeholder*="p t"]').first();

/** Mở màn; trả về mọi status của API danh sách (rỗng = chưa gọi lần nào). */
async function moMan(page, vai) {
	const trangThai = [];
	page.on('response', (r) => {
		if (r.url().includes(API)) trangThai.push(r.status());
	});
	await moTrang(page, ROUTE, vai);
	await page.waitForTimeout(6_000);
	return trangThai;
}

/** 🔴 Đăng ký chờ TRƯỚC hành động; bỏ qua 401 do storageState cũ. */
async function taiLaiBoi(page, hanhDong, { timeout = 60_000 } = {}) {
	const cho = page.waitForResponse((r) => r.url().includes(API) && r.status() !== 401, { timeout });
	await hanhDong();
	const res = await cho;
	await page.waitForTimeout(1_000);
	return res;
}

const thamSo = (res) => Object.fromEntries(new URL(res.url()).searchParams.entries());

/** Đọc một thẻ số liệu theo nhãn (`TỔNG CÒN NỢ`…); `null` khi không thấy. */
async function theSoLieu(page, nhan) {
	const chu = chuan(await khung(page).innerText());
	const m = chu.match(new RegExp(`${nhan}\\s*([\\d.,]+)`, 'i'));
	return m ? soTu(m[1]) : null;
}

/** 🔴 Chặn mọi request GHI — thu nợ / ghi nợ là **đụng vào công nợ thật của khách**. */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/customer-debt|debt|payment/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

module.exports = { API, ROUTE, chanGhi, chuan, dong, khung, moMan, oTim, soTu, taiLaiBoi, thamSo, theSoLieu };
