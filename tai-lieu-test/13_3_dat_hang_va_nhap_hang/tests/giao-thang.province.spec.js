'use strict';

/**
 * `13_3_040_001` — màn **Phiếu nhập hàng từ NCC thuộc Tổng công ty** (đơn giao thẳng).
 *
 * 🔴 Lối vào: `/inventory/purchase-order` (tiêu đề *Đặt hàng nhà cung cấp*) → nút
 * **"Phiếu nhập hàng từ NCC thuộc TCT"**. 🚫 Không có route đi thẳng.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

test('13_3_040_001 — Kiểm tra giao diện', async ({ page }) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '13_3_040_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	// 🔴 Chặn ghi: màn này xác nhận đơn giao thẳng — xác nhận là nhập kho thật.
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/stock|purchase|order|po\b/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});

	await moTrang(page, '/inventory/purchase-order', VAI);
	await page.waitForTimeout(7_000);

	const nut = khung(page).getByRole('button', { name: /Phiếu nhập hàng từ NCC/ }).first();
	if ((await nut.count()) === 0) {
		test.skip(true, 'Vai tỉnh không thấy nút "Phiếu nhập hàng từ NCC thuộc TCT" trên màn đặt hàng.');
	}
	await nut.click({ force: true });
	await page.waitForTimeout(5_000);

	const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	const box = (await hop.count()) ? hop : khung(page);
	const noi = chuan(await box.innerText());

	// Kỳ vọng của kịch bản: tiêu đề "Đơn giao thẳng cần xác nhận" + ô tìm "Tìm theo mã PO"
	// + trạng thái *Xác nhận* / *Chờ xác nhận*.
	const thieu = [];
	if (!/giao thẳng/i.test(noi)) thieu.push('tiêu đề "Đơn giao thẳng cần xác nhận"');
	if ((await box.locator('input[placeholder*="PO"]').count()) === 0) thieu.push('ô "Tìm theo mã PO"');
	if (!/chờ xác nhận/i.test(noi)) thieu.push('trạng thái "Chờ xác nhận"');

	expect(
		thieu,
		`Màn thiếu: ${thieu.join('; ')}. Nội dung thật: ${noi.slice(0, 300)}`,
	).toEqual([]);
	expect(daGoi, 'Chỉ mở màn mà đã gửi request ghi').toEqual([]);
});
