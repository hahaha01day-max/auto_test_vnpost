'use strict';

/** 33 · Phạm vi vai `gdv` trên màn lịch sử thao tác. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan } = require('./history-page');

const GOC = path.join(__dirname, '..');

test('33_PQ_001 — Vai điểm bán không vào được lịch sử thao tác', async ({ page }) => {
	const i = loadCaseInput(GOC, '33_PQ_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	await chanGhi(page);
	const so = await moMan(page, 'gdv');
	const biChan = /\/403|\/account/.test(page.url());
	test.info().annotations.push({
		type: 'hành vi thật',
		description: biChan ? `bị chặn, về ${page.url()}` : `vào được ${page.url()} · ${so} dòng`,
	});

	// 🔴 Cả 5 task chỉ khai TONG_CONG_TY · BUU_DIEN_TINH · BUU_DIEN_XA ⇒ cấp điểm bán phải bị chặn.
	expect(
		biChan,
		`Vai điểm bán KHÔNG bị chặn khỏi màn "Lịch sử thao tác người dùng": vào được ${page.url()}, ` +
			`bảng hiện ${so} dòng. Tiêu đề đang hiện: ${chuan(
				await page.locator('.ant-page-header-heading-title').first().innerText().catch(() => ''),
			)}`,
	).toBe(true);
});
