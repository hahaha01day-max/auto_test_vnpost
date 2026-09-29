'use strict';

/**
 * Phân hệ 13_1 — ba case **mở màn** viết lại từ spec cũ (URL production viết cứng, dò 6 route
 * ứng viên cho mỗi màn). Route thật đo 20/09/2026: **`/inventory/purchase-request`**
 * (*Phiếu đề xuất đặt hàng*).
 *
 * 🔴 52/55 case còn lại là case GHI: duyệt phiếu, gửi PO cho NCC — 🚫 không hoàn tác được.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const ROUTE = '/inventory/purchase-request';
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
		if (!/stock-request|purchase|stock\b/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

test('13_1_030_001 — Mở màn Phiếu đề xuất đặt hàng', async ({ page }) => {
	chanNeuTat('13_1_030_001');
	await chanGhi(page);

	await moTrang(page, ROUTE, VAI);
	await page.waitForTimeout(7_000);

	expect(page.url(), `URL sau khi mở: ${page.url()}`).toContain('purchase-request');
	await expect(
		khung(page).locator('.ant-table'),
		'Màn phiếu đề xuất không có bảng danh sách',
	).toBeVisible({ timeout: 20_000 });
});

test('13_1_040_001 — Mở màn phê duyệt phiếu đề xuất', async ({ page }) => {
	chanNeuTat('13_1_040_001');
	await chanGhi(page);

	await moTrang(page, ROUTE, VAI);
	await page.waitForTimeout(7_000);

	const noi = chuan(await khung(page).innerText());
	// Vai điểm bán LẬP phiếu, 🚫 không duyệt — ghi lại những gì màn cho làm.
	const nut = (await khung(page).getByRole('button').allInnerTexts()).map(chuan).filter(Boolean);
	test.info().annotations.push({ type: 'nút trên màn (vai điểm bán)', description: nut.join(' / ') });
	expect(noi.length, 'Màn phiếu đề xuất không có nội dung gì').toBeGreaterThan(20);
});

test('13_1_040_002 — Bảng phiếu đề xuất hiện đủ cột chính', async ({ page }) => {
	chanNeuTat('13_1_040_002');
	await chanGhi(page);

	await moTrang(page, ROUTE, VAI);
	await page.waitForTimeout(7_000);

	const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts())
		.map(chuan)
		.filter((t) => t !== '');
	expect(cot.length, 'Bảng phiếu đề xuất không có cột nào').toBeGreaterThan(3);
	test.info().annotations.push({ type: 'cột thật của bảng', description: cot.join(' · ') });
	expect(
		cot.some((c) => /trạng thái/i.test(c)),
		`Bảng thiếu cột Trạng thái; đang có: ${cot.join(' · ')}`,
	).toBe(true);
});
