'use strict';

/**
 * Phân hệ 12_4 — Hợp đồng và khuyến mãi nhà cung cấp, phần ĐỌC (vai `tct`).
 *
 * Trace 20/09/2026:
 *
 * | Màn | Route | API | Tiêu đề |
 * |---|---|---|---|
 * | Hợp đồng NCC | `/supplier/contracts` | `GET /chain-supplier-contract` | *Hợp đồng nhà cung cấp* |
 * | Khuyến mãi đặt hàng NCC | `/supplier/promotions` | — | *Khuyến mãi đặt hàng NCC* |
 *
 * 🔴 Hợp đồng NCC là căn cứ của **chiết khấu và điều khoản thanh toán** khi đặt hàng ⇒ 50/60 case
 * là case ghi, giữ `allowMutation: false`. Cả file 🚫 KHÔNG ghi.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const ROUTE_HD = '/supplier/contracts';
const ROUTE_KM = '/supplier/promotions';
const API_HD = '/chain-supplier-contract';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const cot = (page) => khung(page).locator('.ant-table-thead th');

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
		if (!/contract|supplier|promotion/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

async function moHopDong(page) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API_HD) && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, ROUTE_HD, VAI);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

test.describe('12_4 — Hợp đồng và khuyến mãi NCC', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
	});

	test('12_4_010_001 — Màn Hợp đồng nhà cung cấp mở được', async ({ page }) => {
		chanNeuTat('12_4_010_001');

		const res = await moHopDong(page);
		expect(res, 'Màn hợp đồng không gọi API danh sách').not.toBeNull();
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Hợp đồng nhà cung cấp',
		);
		await expect(
			khung(page).locator('input[placeholder="Tìm số HĐ / tên / mã NCC"]'),
			'Thiếu ô tìm "Tìm số HĐ / tên / mã NCC"',
		).toBeVisible();
		await expect(
			khung(page).locator('.ant-select').filter({ hasText: 'Hiệu lực' }).first(),
			'Thiếu ô lọc Hiệu lực',
		).toBeVisible();
	});

	test('12_4_010_002 — Tìm hợp đồng theo số hợp đồng hoặc mã NCC', async ({ page }) => {
		chanNeuTat('12_4_010_002');

		await moHopDong(page);
		if ((await dong(page).count()) === 0) test.skip(true, 'Chưa có hợp đồng NCC nào để tìm.');

		const soHD = chuan(await dong(page).first().locator('td').first().innerText()).split(' ')[0];
		if (!soHD) test.skip(true, 'Không đọc được số hợp đồng ở dòng đầu.');

		const o = khung(page).locator('input[placeholder="Tìm số HĐ / tên / mã NCC"]');
		const cho = page.waitForResponse(
			(r) => r.url().includes(API_HD) && r.status() !== 401,
			{ timeout: 60_000 },
		);
		await o.fill(soHD);
		await o.press('Enter');
		await cho.catch(() => null);
		await page.waitForTimeout(2_000);

		const so = await dong(page).count();
		expect(so, `Tìm "${soHD}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			expect(chuan(await dong(page).nth(i).innerText())).toContain(soHD);
		}
	});

	test('12_4_010_003 — Lọc theo ba mức hiệu lực', async ({ page }) => {
		chanNeuTat('12_4_010_003');

		await moHopDong(page);
		const o = khung(page).locator('.ant-select').filter({ hasText: 'Hiệu lực' }).first();
		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		await page.keyboard.press('Escape');

		expect(nhan, `Ô Hiệu lực đang có: ${nhan.join(' · ')}`).toEqual([
			'Còn hiệu lực',
			'Sắp hết hạn (30 ngày)',
			'Hết hiệu lực',
		]);
	});

	test('12_4_040_001 — Chi tiết hợp đồng hiện đủ điều khoản', async ({ page }) => {
		chanNeuTat('12_4_040_001');

		await moHopDong(page);
		if ((await dong(page).count()) === 0) test.skip(true, 'Chưa có hợp đồng NCC nào để xem.');

		const nut = dong(page).first().getByRole('button', { name: 'Xem' }).first();
		if ((await nut.count()) === 0) test.skip(true, 'Dòng đầu không có nút Xem.');
		await nut.click({ force: true });
		await page.waitForTimeout(4_000);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const box = (await hop.count()) ? hop : khung(page);
		const noi = chuan(await box.innerText()).toLowerCase();

		// 🔴 Màn dùng "Ngày bắt đầu / Ngày kết thúc", 🚫 không có chữ "thời hạn" — mỗi điều khoản
		//    nhận theo NHIỀU cách viết, đừng bắt đúng một từ khoá của tài liệu.
		const dieuKhoan = [
			['nhà cung cấp', ['nhà cung cấp']],
			['thời hạn hợp đồng', ['thời hạn', 'ngày bắt đầu', 'ngày kết thúc']],
			['giá trị', ['tổng giá trị', 'giá trị']],
			['loại hợp đồng', ['loại hợp đồng']],
		];
		const thieu = dieuKhoan
			.filter(([, tuKhoa]) => !tuKhoa.some((t) => noi.includes(t)))
			.map(([ten]) => ten);
		expect(
			thieu,
			`Chi tiết hợp đồng thiếu: ${thieu.join(', ')}. Nội dung: ${noi.slice(0, 250)}`,
		).toEqual([]);
	});

	test('12_4_050_001 — Màn Khuyến mãi đặt hàng NCC mở được', async ({ page }) => {
		chanNeuTat('12_4_050_001');

		await moTrang(page, ROUTE_KM, VAI);
		await page.waitForTimeout(6_000);

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Khuyến mãi đặt hàng NCC',
		);
		await expect(
			khung(page).locator('input[placeholder="Tìm theo mã / tên chương trình"]'),
			'Thiếu ô "Tìm theo mã / tên chương trình"',
		).toBeVisible();
		await expect(
			khung(page).locator('.ant-select').filter({ hasText: 'Nhà cung cấp' }).first(),
			'Thiếu ô lọc Nhà cung cấp',
		).toBeVisible();
	});

	test('12_4_050_002 — Lọc chương trình theo nhà cung cấp', async ({ page }) => {
		chanNeuTat('12_4_050_002');

		await moTrang(page, ROUTE_KM, VAI);
		await page.waitForTimeout(6_000);

		const o = khung(page).locator('.ant-select').filter({ hasText: 'Nhà cung cấp' }).first();
		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const muc = dd.locator('.ant-select-item-option-content');
		if ((await muc.count()) === 0) {
			await page.keyboard.press('Escape');
			test.skip(true, 'Ô lọc Nhà cung cấp không có lựa chọn nào.');
		}
		const ten = chuan(await muc.first().innerText());
		await muc.first().click();
		await page.waitForTimeout(3_000);

		const cotTen = (await cot(page).allInnerTexts()).map(chuan);
		const k = cotTen.indexOf('Nhà cung cấp');
		const so = await dong(page).count();
		if (so === 0) test.skip(true, `NCC "${ten}" chưa có chương trình khuyến mãi nào.`);
		expect(k, 'Bảng không có cột Nhà cung cấp để đối chiếu').toBeGreaterThanOrEqual(0);
		for (let i = 0; i < so; i += 1) {
			expect(
				chuan(await dong(page).nth(i).locator('td').nth(k).innerText()),
				`Dòng ${i + 1} không thuộc NCC đã lọc`,
			).toContain(ten);
		}
	});
});
