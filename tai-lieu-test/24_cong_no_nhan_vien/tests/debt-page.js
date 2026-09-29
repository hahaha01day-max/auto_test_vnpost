'use strict';

/**
 * Helper phân hệ 24 — Công nợ nhân viên.
 *
 * Đo từ DOM 20/09/2026, route `/debt-reconciliation/employee-debt`:
 *
 * | Thứ | Giá trị thật |
 * |---|---|
 * | Tiêu đề | `Công nợ nhân viên` |
 * | Thẻ | `Công nợ theo đơn hàng` · `Công nợ với cửa hàng` |
 * | Cột | `# · Tên nhân viên · Số điện thoại · Tổng tiền khách nợ · Hành động` |
 * | API | `GET /__api/shops/<shopId>/employee/get-debt-summary?page=&size=` |
 * | Bộ lọc | cặp ngày · `Tìm kiếm tên, số điện thoại...` · (chỉ cấp trên điểm bán) `Chọn điểm bán / kho` |
 *
 * 🔴 Cấp tỉnh **chưa chọn điểm bán thì KHÔNG gọi API danh sách** — bảng rỗng là đúng nghiệp vụ,
 * 🚫 không phải lỗi. Ô chọn điểm bán mở **drawer ba cột** (Tỉnh → Xã → Điểm bán), 🚫 không phải dropdown.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const ROUTE = '/debt-reconciliation/employee-debt';
const API = '/employee/get-debt-summary';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const oTim = (page) => khung(page).locator('input[placeholder^="Tìm kiếm"]').first();

/** Mở màn; trả về **mọi** status của lời gọi danh sách (rỗng = chưa gọi lần nào). */
async function moMan(page, vai) {
	const trangThai = [];
	page.on('response', (r) => {
		if (r.url().includes(API)) trangThai.push(r.status());
	});
	await moTrang(page, ROUTE, vai);
	await page.waitForTimeout(6_000);
	return trangThai;
}

/** 🔴 Đăng ký chờ TRƯỚC hành động. Bỏ qua 401 đầu tiên do storageState cũ. */
async function taiLaiBoi(page, hanhDong, { timeout = 60_000 } = {}) {
	const cho = page.waitForResponse((r) => r.url().includes(API) && r.status() !== 401, { timeout });
	await hanhDong();
	const res = await cho;
	await page.waitForTimeout(1_000);
	return res;
}

const thamSo = (res) => Object.fromEntries(new URL(res.url()).searchParams.entries());

/** Đổi thẻ — 🔴 `.click()` trần KHÔNG đổi tab ở antd v6. */
async function moThe(page, nhan) {
	const the = khung(page).locator('.ant-tabs-tab', { hasText: nhan }).first();
	if ((await the.count()) === 0) return false;
	await the.locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await page.waitForTimeout(2_500);
	return true;
}

/**
 * Chọn điểm bán qua **drawer ba cột** (Tỉnh → Xã → Điểm bán).
 *
 * 🔴 Ô trông như `.ant-select` nhưng 🚫 KHÔNG mở `.ant-select-dropdown` — chờ dropdown ở đây là
 * timeout rồi đổ oan cho vai thiếu quyền.
 *
 * @returns {{ten: string|null, lyDo: string|null}|null} tên điểm bán đã chọn, hoặc lý do không chọn được.
 */
async function chonDiemBan(page) {
	const o = khung(page).locator('.ant-select').filter({ hasText: /điểm bán/i }).first();
	if ((await o.count()) === 0) return null;
	await o.click({ force: true });

	const dr = page.locator('.ant-drawer-open').last();
	await dr.waitFor({ state: 'visible', timeout: 20_000 });
	await page.waitForTimeout(2_500);

	const cot = (i) => dr.locator('.sp-column').nth(i);
	const dsShop = cot(2).locator('.ant-radio-wrapper');

	// 🔴 Cột 2 nạp SẴN theo đơn vị của tài khoản — 🚫 KHÔNG bấm vào cột 0: bấm lại chính tỉnh đang
	//    chọn là **bỏ chọn** nó và cột 1 lẫn cột 2 trống sạch. Chỉ đi sâu xuống xã khi cột 2 rỗng.
	if ((await dsShop.count()) === 0) {
		const dsXa = cot(1).locator('.sp-item');
		if ((await dsXa.count()) > 0) {
			await dsXa.first().click();
			await page.waitForTimeout(3_000);
		}
	}

	if ((await dsShop.count()) === 0) {
		const chu = chuan(await dr.innerText());
		await dr.getByRole('button', { name: /Đóng|Huỷ|Hủy/ }).first().click().catch(() => {});
		await page.waitForTimeout(1_000);
		return { ten: null, lyDo: `Drawer chọn điểm bán không liệt kê điểm bán nào. Nội dung: ${chu}` };
	}

	const ten = chuan(await dsShop.first().innerText());
	await dsShop.first().click();
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	await dr.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
	await page.waitForTimeout(3_000);
	return { ten, lyDo: null };
}

/** Chặn mọi request GHI — phân hệ này ghi là **đụng vào công nợ thật**. */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/debt|employee|payment/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

module.exports = {
	API, ROUTE, chanGhi, chonDiemBan, chuan, dong, khung, moMan, moThe, oTim, taiLaiBoi, thamSo,
};
