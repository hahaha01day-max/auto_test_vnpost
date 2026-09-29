'use strict';

/** 29 · Phạm vi vai `gdv` trên các màn báo cáo. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan, thamSo } = require('./report-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test('29_030_004 — Vai điểm bán không vào được báo cáo lãi lỗ', async ({ page }) => {
	chanNeuTat('29_030_004');

	await chanGhi(page);
	const trangThai = await moMan(page, 'laiLo', 'gdv');
	const biChan = /\/403|\/account/.test(page.url());
	test.info().annotations.push({
		type: 'hành vi thật',
		description: biChan
			? `bị chặn, về ${page.url()}`
			: `vào được ${page.url()} · status: ${trangThai.join(' · ') || '(không gọi)'}`,
	});

	// 🔴 Task 030 chỉ khai TONG_CONG_TY · BUU_DIEN_TINH · BUU_DIEN_XA ⇒ cấp điểm bán phải bị chặn.
	expect(
		biChan,
		`Vai điểm bán KHÔNG bị chặn khỏi báo cáo Lãi/Lỗ: vào được ${page.url()}, ` +
			`status các lời gọi: ${trangThai.join(' · ') || '(không gọi)'}. ` +
			`Tiêu đề đang hiện: ${chuan(
				await page.locator('.ant-page-header-heading-title').first().innerText().catch(() => ''),
			)}`,
	).toBe(true);
});

test('29_PQ_001 — Vai điểm bán chỉ thấy số liệu trong phạm vi của mình', async ({ page }) => {
	chanNeuTat('29_PQ_001');

	await chanGhi(page);
	const trangThai = await moMan(page, 'tonKho', 'gdv');
	if (trangThai.length === 0) {
		test.skip(true, 'Vai gdv không phát sinh lời gọi báo cáo tồn kho nào để đo phạm vi.');
	}
	expect(
		trangThai.some((s) => s === 200),
		`Vai gdv không đọc được báo cáo tồn kho (status: ${trangThai.join(' · ')})`,
	).toBe(true);

	// 🔴 Phạm vi phải nằm trong REQUEST: bảng "trông đúng" 🚫 không chứng minh được gì.
	const res = await page
		.waitForResponse((r) => r.url().includes('/report/inventory/monthly-summary') && r.status() === 200, {
			timeout: 60_000,
		})
		.catch(() => null);
	if (!res) {
		await page.reload();
		await page.waitForTimeout(6_000);
	}
	const url = res ? res.url() : '';
	test.info().annotations.push({ type: 'request báo cáo', description: url.slice(0, 200) });
	expect(
		/shopId=\d+/.test(url),
		`Request báo cáo của vai điểm bán KHÔNG mang shopId: ${url || '(không bắt được request)'}`,
	).toBe(true);
});
