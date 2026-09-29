'use strict';

/** 20 · Phạm vi vai `gdv` trên màn Loyalty. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, khung, moMan } = require('./loyalty-page');

const GOC = path.join(__dirname, '..');

test('20_070_003 — Giao dịch viên mở màn Chiến dịch Loyalty', async ({ page }) => {
	const i = loadCaseInput(GOC, '20_070_003');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	const { daGoi } = await chanGhi(page);
	await moMan(page, 'gdv');

	const vao = !/\/403|\/account/.test(page.url());
	const soSua = vao ? await khung(page).getByRole('button', { name: 'Chỉnh sửa' }).count() : 0;
	test.info().annotations.push({
		type: 'hành vi thật của vai gdv',
		description: vao
			? `vào được ${page.url()} · ${soSua} nút "Chỉnh sửa"`
			: `bị chặn, về ${page.url()}`,
	});

	if (!vao) return; // Bị chặn khỏi màn — đúng kỳ vọng phạm vi.

	// 🔴 Cấu hình Loyalty là của **toàn chain**. Vai giao dịch viên vào được mà còn sửa được thì
	//    một điểm bán đổi được tỷ lệ tích điểm của cả chuỗi.
	expect(
		soSua,
		`Vai gdv vào được màn Loyalty và thấy ${soSua} nút "Chỉnh sửa" — sửa được cấu hình TOÀN ` +
			`CHAIN. Nút đang có: ${chuan((await khung(page).locator('button').allInnerTexts()).join(' · '))}`,
	).toBe(0);
	expect(daGoi, `gdv gửi được request ghi: ${daGoi.join(' ; ')}`).toEqual([]);
});
