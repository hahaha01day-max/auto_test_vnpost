'use strict';

/**
 * Helper phân hệ 33 — Lịch sử thao tác người dùng.
 *
 * Đo từ DOM 20/09/2026, route `/chain/user-action-history`:
 *
 * | Thứ | Giá trị thật |
 * |---|---|
 * | Tiêu đề | `Lịch sử thao tác người dùng` |
 * | Cột | `STT · Nhóm nghiệp vụ · Hành động · Người thao tác · Vai trò · Đơn vị · IP · Thời gian · Hành động` |
 * | Bộ lọc | ô `Tìm theo tên người thao tác` · `Từ ngày`/`Đến ngày` · select `Nhóm nghiệp vụ` · select `Hành động` |
 * | Dữ liệu | vai `tct` thấy 20 dòng/trang; vai `gdv` **vào được màn nhưng 0 dòng** |
 *
 * 🔴 Màn **chỉ đọc** — không có nút ghi nào. Vẫn bọc `chanGhi()` cho chắc.
 * 🔴 Nhãn tiếng Việt trong DOM ở dạng NFD ⇒ tìm ô lọc bằng `timOLoc()` (bỏ dấu cả hai vế).
 */

const { moTrang } = require('../../shared/auth/login');

const ROUTE = '/chain/user-action-history';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const boDau = (s) =>
	chuan(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const khung = (page) => page.locator('.ant-pro-layout-content').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const oTim = (page) => khung(page).locator('input[placeholder*="o t"]').first();

async function moMan(page, vai) {
	await moTrang(page, ROUTE, vai);
	await page.waitForTimeout(6_000);
	return dong(page).count();
}

/** 🔴 Tìm ô `.ant-select` bằng chữ ĐÃ BỎ DẤU — `hasText` NFC không khớp DOM NFD. */
async function timOLoc(page, chuTrongO) {
	const can = boDau(chuTrongO);
	const ds = khung(page).locator('.ant-select');
	const n = await ds.count();
	for (let i = 0; i < n; i += 1) {
		if (boDau(await ds.nth(i).innerText().catch(() => '')).includes(can)) return ds.nth(i);
	}
	return null;
}

/** Mở một ô lọc, đọc nhãn các lựa chọn rồi đóng lại. */
async function nhanCacOption(page, chuTrongO) {
	const o = await timOLoc(page, chuTrongO);
	if (!o) return [];
	await o.click();
	const dd = page.locator('.ant-select-dropdown:visible').last();
	await dd.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
	const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
	await page.keyboard.press('Escape');
	await page.waitForTimeout(500);
	return nhan;
}

/** Gõ vào ô tìm rồi chờ màn tự lọc (🔴 ô này tự lọc khi ngừng gõ, 🚫 không cần Enter). */
async function tim(page, tuKhoa) {
	await oTim(page).fill(tuKhoa);
	await page.waitForTimeout(3_500);
}

/** Đọc mốc thời gian ở cột `Thời gian` (`dd/MM/yyyy HH:mm:ss`) của một dòng. */
async function thoiGian(page, i) {
	const chu = chuan(await dong(page).nth(i).innerText());
	const m = chu.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
	if (!m) return null;
	return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime();
}

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/action-history|audit|history/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

module.exports = { ROUTE, boDau, chanGhi, chuan, dong, khung, moMan, nhanCacOption, oTim, thoiGian, tim, timOLoc };
