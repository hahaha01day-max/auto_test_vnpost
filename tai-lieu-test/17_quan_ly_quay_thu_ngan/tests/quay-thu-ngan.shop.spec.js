'use strict';

/**
 * Phân hệ 17 — Quản lý quầy thu ngân, phần ĐỌC (vai `shop`).
 *
 * Trace 20/09/2026: route **`/finance/cashier-counter`**, API `GET /cashier-counter/get-all`
 * (pod-service, 🚫 không có prefix service). Bảng 5 cột *STT · Mã quầy · Tên quầy · Trạng thái ·
 * Hành động*; nút **"Thêm quầy"**, mỗi dòng có *Sửa* · *Ngừng*.
 *
 * 🔴 Ngừng một quầy đang mở ca là chặn thu ngân đang bán ⇒ case ghi giữ `allowMutation: false`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const ROUTE = '/finance/cashier-counter';
const API = '/cashier-counter/get-all';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const oTim = (page) => khung(page).locator('input[placeholder="Tìm kiếm"]').first();

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
		if (!/cashier|counter|fund/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

async function moMan(page) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API) && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, ROUTE, VAI);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_000);
	return res;
}

/** Tìm rồi chờ đúng response. */
async function tim(page, tuKhoa) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API) && r.status() !== 401,
		{ timeout: 60_000 },
	);
	await oTim(page).fill(tuKhoa);
	await oTim(page).press('Enter');
	const res = await cho.catch(() => null);
	await page.waitForTimeout(1_500);
	return res;
}

test.describe('17 — Quản lý quầy thu ngân', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page);
	});

	test('17_010_001 — Màn Quản lý quầy thu ngân mở được', async ({ page }) => {
		chanNeuTat('17_010_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý quầy thu ngân',
		);
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts())
			.map(chuan)
			.filter((t) => t !== '');
		expect(cot, `Cột đang có: ${cot.join(' · ')}`).toEqual([
			'STT',
			'Mã quầy',
			'Tên quầy',
			'Trạng thái',
			'Hành động',
		]);
		await expect(khung(page).getByRole('button', { name: 'Thêm quầy' })).toBeVisible();
	});

	test('17_020_001 — Tìm quầy theo tên', async ({ page }) => {
		chanNeuTat('17_020_001');

		if ((await dong(page).count()) === 0) test.skip(true, 'Điểm bán chưa có quầy thu ngân nào.');
		const ten = chuan(await dong(page).first().locator('td').nth(2).innerText());
		const tuKhoa = ten.split(' ').filter((t) => t.length > 1)[0];
		if (!tuKhoa) test.skip(true, 'Không tách được từ khoá từ tên quầy.');

		await tim(page, tuKhoa);
		const so = await dong(page).count();
		expect(so, `Tìm "${tuKhoa}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			expect(chuan(await dong(page).nth(i).innerText()).toLowerCase()).toContain(
				tuKhoa.toLowerCase(),
			);
		}
	});

	test('17_020_008 — Tìm quầy theo mã chính xác', async ({ page }) => {
		chanNeuTat('17_020_008');

		if ((await dong(page).count()) === 0) test.skip(true, 'Điểm bán chưa có quầy thu ngân nào.');
		const ma = chuan(await dong(page).first().locator('td').nth(1).innerText());
		if (!ma) test.skip(true, 'Không đọc được mã quầy ở dòng đầu.');

		await tim(page, ma);
		const so = await dong(page).count();
		expect(so, `Tìm mã "${ma}" mà ra 0 dòng`).toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			expect(chuan(await dong(page).nth(i).locator('td').nth(1).innerText())).toContain(ma);
		}
	});

	test('17_020_009 — Tìm quầy theo một phần mã', async ({ page }) => {
		chanNeuTat('17_020_009');

		if ((await dong(page).count()) === 0) test.skip(true, 'Điểm bán chưa có quầy thu ngân nào.');
		const ma = chuan(await dong(page).first().locator('td').nth(1).innerText());
		if (ma.length < 3) test.skip(true, `Mã quầy "${ma}" quá ngắn để cắt một phần.`);

		const motPhan = ma.slice(0, Math.max(2, ma.length - 1));
		await tim(page, motPhan);
		expect(
			await dong(page).count(),
			`Tìm một phần mã "${motPhan}" mà ra 0 dòng — backend có thể chỉ khớp chính xác`,
		).toBeGreaterThan(0);
	});

	test('17_020_010 — Tìm quầy không tồn tại trả kết quả rỗng', async ({ page }) => {
		chanNeuTat('17_020_010');

		await tim(page, 'zzzkhongtontai999');
		expect(await dong(page).count()).toBe(0);
		await expect(khung(page).locator('.ant-empty')).toBeVisible();
	});
});
