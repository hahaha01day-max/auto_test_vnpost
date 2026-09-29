'use strict';

/**
 * Hai case PHÂN QUYỀN của phân hệ 07_2, chạy bằng vai **Bưu điện Tỉnh**.
 *
 * 🔴 Hai case này đối nghịch nhau và phải chạy cùng một vai mới có nghĩa:
 *   - `PQ_001`: tỉnh **vào được** Khoá kho và Cảnh báo hết hạn (task 10/20/40/50 khai `BUU_DIEN_TINH`).
 *   - `PQ_002`: tỉnh **không vào được** Bán tồn kho âm (task 30 chỉ khai `TONG_CONG_TY`).
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

const chanNeuTat = (id) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Mở một nhóm cấu hình; trả về `false` khi hệ thống KHÔNG mở được nhóm đó cho vai hiện tại. */
async function thuMoNhom(page, key) {
	try {
		await moTrang(page, `/settings?setting=${key}`, VAI);
	} catch {
		// 🔴 `moKhungCon` ném lỗi khi không tìm thấy mục menu — đúng dấu hiệu "vai này không có nhóm đó".
		return false;
	}
	await page.waitForTimeout(4_000);
	return new URL(page.url()).searchParams.get('setting') === key;
}

test('07_2_PQ_001 — Vai Bưu điện Tỉnh vào được Khoá kho và Cảnh báo hết hạn', async ({ page }) => {
	chanNeuTat('07_2_PQ_001');

	for (const key of ['stockFreeze', 'expiryAlert']) {
		const moDuoc = await thuMoNhom(page, key);
		expect(
			moDuoc,
			`Vai ${VAI} KHÔNG mở được nhóm cấu hình "${key}" — trái với vai_tro khai trong HDSD ` +
				`(task 10/20/40/50 gồm BUU_DIEN_TINH). URL hiện tại: ${page.url()}`,
		).toBe(true);
		expect(
			chuan(await khung(page).innerText()).length,
			`Nhóm "${key}" mở được nhưng không có nội dung gì`,
		).toBeGreaterThan(20);
	}
});

test('07_2_PQ_002 — Vai Bưu điện Tỉnh KHÔNG vào được Bán tồn kho âm', async ({ page }) => {
	chanNeuTat('07_2_PQ_002');

	const moDuoc = await thuMoNhom(page, 'negativeStock');
	if (!moDuoc) return; // bị chặn ngay ở menu — đúng kỳ vọng.

	// Mở được thì phải KHÔNG sửa được: không nút Sửa, không công tắc bấm được.
	const nutSua = await khung(page).getByRole('button', { name: 'Sửa' }).count();
	const congTac = khung(page).locator('.ant-switch');
	const tong = await congTac.count();
	let bamDuoc = 0;
	for (let i = 0; i < tong; i += 1) {
		const lop = (await congTac.nth(i).getAttribute('class')) || '';
		const tat = (await congTac.nth(i).getAttribute('disabled')) !== null;
		if (!lop.includes('ant-switch-disabled') && !tat) bamDuoc += 1;
	}

	test.info().annotations.push({
		type: 'quan sát ở vai tỉnh',
		description: `nhóm negativeStock mở được · nút Sửa: ${nutSua} · công tắc bấm được: ${bamDuoc}/${tong}`,
	});
	expect(
		nutSua === 0 && bamDuoc === 0,
		`Vai ${VAI} vào được nhóm "Bán tồn kho âm" VÀ còn sửa được (${nutSua} nút Sửa, ` +
			`${bamDuoc} công tắc bấm được) — task 30 chỉ khai vai TONG_CONG_TY.`,
	).toBe(true);
});
