'use strict';

/**
 * Nhóm **In hoá đơn bán hàng** (`?setting=printer`) — task 20 khai vai gồm cả `DIEM_BAN`
 * ⇒ chạy bằng vai `shop` mới đúng cái cần kiểm.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/config|setting|printer/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

test('07_3_020_001 — Nhóm In hoá đơn bán hàng mở được', async ({ page }) => {
	chanNeuTat('07_3_020_001');
	await chanGhi(page);

	await moTrang(page, '/settings?setting=printer', VAI);
	await page.waitForTimeout(4_500);

	const noi = chuan(await khung(page).innerText());
	expect(noi, 'Thiếu ô "Tiêu đề hoá đơn"').toContain('Tiêu đề hoá đơn');
	expect(noi, 'Thiếu ô "Nội dung cuối hoá đơn"').toContain('Nội dung cuối hoá đơn');
	expect(
		await khung(page).getByRole('button', { name: 'Lưu' }).count(),
		'Hai ô phải có nút Lưu RIÊNG',
	).toBeGreaterThanOrEqual(2);
	// Danh sách mục thông tin in nằm dưới, mỗi mục một công tắc.
	expect(
		await khung(page).locator('.ant-switch').count(),
		'Không có mục thông tin in nào để bật/tắt',
	).toBeGreaterThan(0);
});

test('07_3_020_002 — Nút Lưu mờ khi nội dung chưa đổi', async ({ page }) => {
	chanNeuTat('07_3_020_002');
	const { daGoi } = await chanGhi(page);

	await moTrang(page, '/settings?setting=printer', VAI);
	await page.waitForTimeout(4_500);

	const nut = khung(page).getByRole('button', { name: 'Lưu' }).first();
	await expect(nut, 'Chưa sửa gì mà nút Lưu đã bật').toBeDisabled();

	// 🔴 Ô ĐẦU TIÊN của màn là ô "Tìm kiếm cấu hình" của menu bên trái, 🚫 không phải ô tiêu đề
	//    hoá đơn. Bám id thật: `#invoiceTitle` / `#invoiceBottomContent`.
	const o = khung(page).locator('#invoiceTitle');
	if ((await o.count()) === 0) test.skip(true, 'Không tìm thấy ô #invoiceTitle để gõ thử.');
	await o.fill(`${await o.inputValue()} X`);
	await page.waitForTimeout(1_000);

	await expect(nut, 'Đã sửa nội dung mà nút Lưu vẫn mờ').toBeEnabled();
	expect(daGoi, 'Chỉ gõ thử mà đã gửi request lưu').toEqual([]);
});

test('07_3_PQ_002 — Vai điểm bán vào được nhóm In hoá đơn bán hàng', async ({ page }) => {
	chanNeuTat('07_3_PQ_002');
	await chanGhi(page);

	await moTrang(page, '/settings?setting=printer', VAI);
	await page.waitForTimeout(4_500);

	expect(
		new URL(page.url()).searchParams.get('setting'),
		`Vai ${VAI} không mở được nhóm "printer" — trái với vai_tro khai trong HDSD task 20.`,
	).toBe('printer');
	expect(chuan(await khung(page).innerText())).toContain('Tiêu đề hoá đơn');
});
