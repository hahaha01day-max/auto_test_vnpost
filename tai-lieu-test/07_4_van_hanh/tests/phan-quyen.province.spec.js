'use strict';

/**
 * `07_4_PQ_001` — vai Bưu điện Tỉnh **vào được Hòm mail** nhưng **không vào được Hạn mức duyệt**.
 *
 * 🔴 Một case, hai vế ngược nhau — phải chạy cùng vai mới có nghĩa.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

async function thuMoNhom(page, key) {
	try {
		await moTrang(page, `/settings?setting=${key}`, VAI);
	} catch {
		return false;
	}
	await page.waitForTimeout(4_000);
	return new URL(page.url()).searchParams.get('setting') === key;
}

test('07_4_PQ_001 — Vai Bưu điện Tỉnh vào được Hòm mail nhưng không vào được Hạn mức duyệt', async ({
	page,
}) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '07_4_PQ_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	const moMail = await thuMoNhom(page, 'mailInbox');
	expect(
		moMail,
		`Vai ${VAI} KHÔNG mở được "Hòm mail nhận hoá đơn" — trái vai_tro khai ở HDSD task 40 ` +
			`(có BUU_DIEN_TINH). URL: ${page.url()}`,
	).toBe(true);

	const moHanMuc = await thuMoNhom(page, 'approvalLimit');
	if (!moHanMuc) return; // bị chặn ngay ở menu — đúng kỳ vọng.

	const nut = await khung(page)
		.getByRole('button', { name: /Sửa|Thêm|Lưu/ })
		.count();
	test.info().annotations.push({
		type: 'quan sát ở vai tỉnh',
		description: `nhóm approvalLimit mở được · nút sửa/thêm/lưu: ${nut}`,
	});
	expect(
		nut === 0,
		`Vai ${VAI} vào được "Hạn mức duyệt" VÀ còn ${nut} nút sửa/thêm/lưu — task 20 chỉ khai ` +
			`TONG_CONG_TY. Nội dung màn: ${chuan(await khung(page).innerText()).slice(0, 200)}`,
	).toBe(true);
});
