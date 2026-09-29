'use strict';

/**
 * Task 030 — tra cứu lượt khai báo tồn đầu kỳ, nhìn từ **cấp Tỉnh** (`province`).
 *
 * 🔴 Chạy bằng chính vai tỉnh: điều cần kiểm là **tỉnh thấy được lượt khai báo của điểm bán trực
 * thuộc**. Chạy bằng vai điểm bán là pass giả (ai cũng thấy lượt của chính mình).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');

const GOC = path.join(__dirname, '..');
const {
	API_PREVIEWS,
	boQua,
	chanMoiGhi,
	chuan,
	dong,
	khung,
	moMan,
	oTim,
} = require('./opening-page');

const VAI = 'province';
const chanNeuTat = (id) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('04_2 · 030 — Tra cứu lượt khai báo, cấp Tỉnh', () => {
	test.beforeEach(async ({ page }) => {
		await chanMoiGhi(page);
		await moMan(page, VAI);
	});

	test('04_2_PQ_001 — Vai Bưu điện Tỉnh xem được lượt khai báo của điểm bán trực thuộc', async ({
		page,
	}) => {
		chanNeuTat('04_2_PQ_001');

		// 🔴 Màn mở được và API trả 200 là điều kiện cần; điều kiện đủ là có dòng để nhìn.
		await expect(page.locator('.ant-page-header-heading-title').first()).toBeVisible();
		const so = await dong(page).count();
		if (so === 0) {
			boQua(
				test,
				'Tỉnh này chưa có điểm bán nào khai báo tồn đầu kỳ ⇒ không đối chiếu được phạm vi. ' +
					'🚫 Không kết luận "tỉnh không xem được" từ bảng rỗng.',
			);
		}
		expect(so).toBeGreaterThan(0);
	});

	test('04_2_030_001 — Lọc danh sách lượt khai báo theo kho hoặc điểm bán', async ({ page }) => {
		chanNeuTat('04_2_030_001');

		const o = khung(page).locator('.ant-select').filter({ hasText: /Lọc theo Kho/ }).first();
		if ((await o.count()) === 0) boQua(test, 'Không thấy ô lọc theo Kho / Điểm bán.');

		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const muc = dd.locator('.ant-select-item-option-content');
		if ((await muc.count()) === 0) {
			await page.keyboard.press('Escape');
			boQua(test, 'Ô lọc không có điểm bán nào để chọn trong phạm vi tỉnh này.');
		}
		const ten = chuan(await muc.first().innerText());

		const cho = page.waitForResponse(
			(r) => r.url().includes(API_PREVIEWS) && r.status() !== 401,
			{ timeout: 45_000 },
		);
		await muc.first().click();
		await cho.catch(() => null);
		await page.waitForTimeout(2_000);

		const so = await dong(page).count();
		if (so === 0) {
			boQua(test, `Điểm bán "${ten}" chưa có lượt khai báo nào — bộ lọc đúng nhưng không đối chiếu được.`);
		}
		for (let i = 0; i < so; i += 1) {
			expect(
				chuan(await dong(page).nth(i).locator('td').first().innerText()),
				`Dòng ${i + 1} không thuộc điểm bán đã lọc`,
			).toContain(ten.split(' ')[0]);
		}
	});

	test('04_2_030_002 — Tìm lượt khai báo theo mã preview hoặc tên file', async ({ page }) => {
		chanNeuTat('04_2_030_002');

		if ((await dong(page).count()) === 0) {
			boQua(test, 'Chưa có lượt khai báo nào để lấy từ khoá tìm kiếm.');
		}
		const mau = chuan(await dong(page).first().locator('td').first().innerText()).split(' ')[0];

		const cho = page.waitForResponse(
			(r) => r.url().includes(API_PREVIEWS) && r.status() !== 401,
			{ timeout: 45_000 },
		);
		await oTim(page).fill(mau);
		await oTim(page).press('Enter');
		await cho.catch(() => null);
		await page.waitForTimeout(2_000);

		const so = await dong(page).count();
		expect(so, `Tìm "${mau}" lấy từ chính danh sách mà không ra dòng nào`).toBeGreaterThan(0);
	});

	test('04_2_030_004 — Mở lại chi tiết một lượt khai báo', async ({ page }) => {
		chanNeuTat('04_2_030_004');

		if ((await dong(page).count()) === 0) boQua(test, 'Chưa có lượt khai báo nào để mở chi tiết.');

		const nut = dong(page).first().locator('td').last().getByRole('button').first();
		if ((await nut.count()) === 0) boQua(test, 'Cột Thao tác không có nút nào ở dòng đầu.');

		const cho = page.waitForResponse(
			(r) => /\/opening-balance\/previews\/[^/]+\/items/.test(r.url()),
			{ timeout: 45_000 },
		);
		await nut.click();
		const res = await cho.catch(() => null);
		expect(res, 'Mở chi tiết mà không gọi API lấy dòng của lượt').not.toBeNull();
		expect(res.status()).toBe(200);
	});

});
