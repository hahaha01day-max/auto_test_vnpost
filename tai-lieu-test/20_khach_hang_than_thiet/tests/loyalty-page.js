'use strict';

/**
 * Helper phân hệ 20 — Khách hàng thân thiết (Loyalty).
 *
 * Đo từ DOM 20/09/2026 bằng vai `shop`, route `/care/loyalty`:
 *
 * | Thứ | Giá trị thật |
 * |---|---|
 * | Tiêu đề | `Quản lý chiến dịch Loyalty` |
 * | API | `GET /__api/loyalty/campaign/get-campaign` · `GET /__api/loyalty/redeem-campaign/get-campaign` |
 * | Hai ô | `Chương trình tích điểm` (trái) · `Chương trình đổi điểm` (phải), mỗi ô có `Xem chi tiết` + `Chỉnh sửa` |
 *
 * 🔴 **Chuỗi test đã CÓ SẴN cả hai chương trình** ⇒ liên kết *"Thêm chương trình tích điểm"*
 * 🚫 KHÔNG còn trên màn. Mọi case đòi form **Thêm** đều thiếu tiền điều kiện; các phép kiểm
 * validate ở đây chạy trên form **Cập nhật** (cùng form, khác tiêu đề) và 🚫 KHÔNG bao giờ lưu:
 * `chanGhi()` chặn mọi request khác GET tới `/loyalty`.
 */

const { moTrang } = require('../../shared/auth/login');

const ROUTE = '/care/loyalty';
const API = '/loyalty/campaign/get-campaign';
const API_DOI = '/loyalty/redeem-campaign/get-campaign';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const hopForm = (page) => page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();

async function moMan(page, vai) {
	const cho = page.waitForResponse((r) => r.url().includes(API) && r.status() !== 401, {
		timeout: 90_000,
	});
	await moTrang(page, ROUTE, vai);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

/** Mở form Cập nhật: `0` = chương trình tích điểm (ô trái), `1` = chương trình đổi điểm (ô phải). */
async function moFormCapNhat(page, chiSo = 0) {
	const nut = khung(page).getByRole('button', { name: 'Chỉnh sửa' });
	if ((await nut.count()) <= chiSo) return null;
	await nut.nth(chiSo).click();
	const hop = hopForm(page);
	await hop.waitFor({ state: 'visible', timeout: 20_000 });
	await page.waitForTimeout(2_500);
	return hop;
}

/** Đổi thẻ trong form — 🔴 `.click()` trần KHÔNG đổi tab ở antd v6. */
async function moThe(page, nhan) {
	const the = hopForm(page).locator('.ant-tabs-tab', { hasText: nhan }).first();
	if ((await the.count()) === 0) return false;
	await the.locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await page.waitForTimeout(2_000);
	return true;
}

/** Gom mọi thông báo lỗi đang hiện của form (validate antd + message/notification). */
async function loiDangHien(page) {
	const a = (await hopForm(page).locator('.ant-form-item-explain-error').allInnerTexts()).map(chuan);
	const b = (await page.locator('.ant-message, .ant-notification').allInnerTexts()).map(chuan);
	return [...a, ...b].filter(Boolean);
}

/**
 * 🔴 Chặn ở tầng mạng mọi request GHI của Loyalty.
 *
 * Case ở phân hệ này bấm `Xác nhận` để xem validate — nếu validate hỏng thì request lưu sẽ bay đi
 * và **đổi cấu hình tích điểm của toàn chuỗi**. 🚫 Không có cách hoàn tác nào bằng giao diện.
 */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/loyalty|campaign/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

module.exports = { API, API_DOI, ROUTE, chanGhi, chuan, hopForm, khung, loiDangHien, moFormCapNhat, moMan, moThe };
