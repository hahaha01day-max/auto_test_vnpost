'use strict';

/** 24 · Phạm vi vai `gdv`. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan, oTim } = require('./debt-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('24 · Công nợ nhân viên (giao dịch viên)', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
	});

	test('24_010_002 — Ô chọn điểm bán chỉ hiện với cấp trên điểm bán', async ({ page }) => {
		chanNeuTat('24_010_002');

		await moMan(page, 'gdv');
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Công nợ nhân viên',
		);
		await expect(oTim(page), 'Thiếu ô tìm nhân viên').toBeVisible();
		expect(
			await khung(page).locator('.ant-select').filter({ hasText: /điểm bán/i }).count(),
			'Vai điểm bán KHÔNG được thấy ô chọn điểm bán',
		).toBe(0);
	});

	test('24_PQ_001 — Giao dịch viên chỉ thấy công nợ trong phạm vi điểm bán', async ({ page }) => {
		chanNeuTat('24_PQ_001');

		const trangThai = await moMan(page, 'gdv');
		test.info().annotations.push({
			type: 'status các lời gọi get-debt-summary',
			description: trangThai.join(' · ') || '(không gọi lần nào)',
		});

		if (trangThai.length === 0) {
			test.skip(true, 'Vai gdv không phát sinh lời gọi get-debt-summary nào để đo phạm vi.');
		}
		// 🔴 401 ở lời gọi ĐẦU là bình thường (storageState cũ, app tự làm mới token). Nhưng khi
		//    MỌI lời gọi đều 401 thì đây là phát hiện quyền thật, 🚫 không phải lỗi test.
		expect(
			trangThai.some((s) => s === 200),
			`Vai giao dịch viên mở màn Công nợ nhân viên: mọi lời gọi get-debt-summary đều lỗi ` +
				`(${trangThai.join(' · ')}) ⇒ màn hiện nhưng KHÔNG đọc được dữ liệu nào. ` +
				`Chữ trên màn: ${chuan(await khung(page).innerText()).slice(0, 200)}`,
		).toBe(true);
		expect(await dong(page).count(), 'Gọi được API mà bảng vẫn rỗng').toBeGreaterThan(0);
	});
});
