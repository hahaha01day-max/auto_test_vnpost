'use strict';

/**
 * Task 020 — phần **Cài đặt nhanh** và phạm vi nhiều tỉnh, vai `tct`.
 *
 * 🔴 Ba case ghi (`003` `004` `009`) áp ngưỡng cảnh báo cho **cả một nhóm sản phẩm** của đơn vị
 * thật ⇒ `allowMutation: false`. Hai case đầu chỉ kiểm khoá/mở ô nên vẫn chạy được ở chế độ chặn
 * ghi, nhưng input đang khai `mutates: true` nên chúng skip kèm lý do — 🚫 không tự đổi cờ.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { ROUTE_SETTINGS, blockWrites } = require('./alert-page');
const { moTrang } = require('../../shared/auth/login');

const VAI = 'tct';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const khung = (page) => page.locator('.ant-pro-page-container').first();

test.describe('04_1 · 020 — Cài đặt nhanh và phạm vi nhiều tỉnh', () => {
	test.beforeEach(async ({ page }) => {
		await blockWrites(page);
		await moTrang(page, ROUTE_SETTINGS, VAI);
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Cài đặt cảnh báo',
			{ timeout: 30_000 },
		);
		await page.waitForTimeout(4_000);
	});

	test('04_1_020_019 — Phạm vi Nhiều tỉnh chỉ cấu hình được sản phẩm Tổng công ty', async ({
		page,
	}) => {
		chanNeuTat('04_1_020_019');

		const nhan = (await khung(page).locator('.ant-tabs-tab').allInnerTexts()).map((s) =>
			chuan(s.split('\n')[0]),
		);
		// 🔴 Ở phạm vi nhiều tỉnh KHÔNG có thẻ "Sản phẩm của tỉnh" và ba thẻ số cũng biến mất.
		expect(nhan, `Thẻ đang có: ${nhan.join(' · ')}`).not.toContain('Sản phẩm của tỉnh');
	});

});
