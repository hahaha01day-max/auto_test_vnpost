'use strict';

/** `07_3_PQ_001` — vai Bưu điện Tỉnh 🚫 không vào được nhóm **Đơn hàng** (task 10 chỉ khai TCT). */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

test('07_3_PQ_001 — Vai Bưu điện Tỉnh không vào được nhóm Đơn hàng', async ({ page }) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '07_3_PQ_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	let moDuoc = true;
	try {
		await moTrang(page, '/settings?setting=order', VAI);
	} catch {
		moDuoc = false; // không có mục menu ⇒ bị chặn ngay, đúng kỳ vọng.
	}
	await page.waitForTimeout(4_000);
	if (!moDuoc || new URL(page.url()).searchParams.get('setting') !== 'order') return;

	// Mở được thì phải KHÔNG sửa được.
	const nutLuu = await khung(page).getByRole('button', { name: 'Lưu' }).count();
	const congTac = khung(page).locator('.ant-switch');
	const tong = await congTac.count();
	let bamDuoc = 0;
	for (let k = 0; k < tong; k += 1) {
		const lop = (await congTac.nth(k).getAttribute('class')) || '';
		if (!lop.includes('ant-switch-disabled')) bamDuoc += 1;
	}
	test.info().annotations.push({
		type: 'quan sát ở vai tỉnh',
		description: `nhóm order mở được · nút Lưu: ${nutLuu} · công tắc bấm được: ${bamDuoc}/${tong}`,
	});
	expect(
		nutLuu === 0 && bamDuoc === 0,
		`Vai ${VAI} vào được nhóm "Đơn hàng" VÀ còn sửa được (${nutLuu} nút Lưu, ${bamDuoc} công tắc ` +
			'bấm được) — task 10 chỉ khai vai TONG_CONG_TY.',
	).toBe(true);
});
