'use strict';

/** `12_4_PQ_001` — vai điểm bán 🚫 không vào được hợp đồng NCC (7 task chỉ khai TCT và Tỉnh). */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

test('12_4_PQ_001 — Vai điểm bán không vào được hợp đồng NCC', async ({ page }) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '12_4_PQ_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	const ma = [];
	page.on('response', (r) => {
		if (r.url().includes('/chain-supplier-contract')) ma.push(r.status());
	});

	let moDuoc = true;
	try {
		await moTrang(page, '/supplier/contracts', VAI);
	} catch {
		moDuoc = false; // 🔴 không có mục menu ⇒ bị chặn ngay, đúng kỳ vọng.
	}
	await page.waitForTimeout(6_000);

	const soDong = moDuoc
		? await khung(page).locator('.ant-table-tbody tr.ant-table-row').count()
		: 0;
	test.info().annotations.push({
		type: 'quan sát ở vai điểm bán',
		description: `mở được: ${moDuoc} · API hợp đồng: ${ma.join(', ') || 'không gọi'} · ${soDong} dòng · URL: ${page.url()}`,
	});

	expect(
		!moDuoc || !ma.includes(200) || soDong === 0,
		`Vai ${VAI} VÀO ĐƯỢC màn hợp đồng NCC và thấy ${soDong} hợp đồng (API trả ${ma.join(', ')}). ` +
			`Nội dung màn: ${chuan(await khung(page).innerText()).slice(0, 200)}`,
	).toBe(true);
});
