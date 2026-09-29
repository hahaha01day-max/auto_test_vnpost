'use strict';

/** 34 · Phạm vi vai `gdv` trên màn công nợ khách hàng. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan } = require('./debt-page');

const GOC = path.join(__dirname, '..');

test('34_PQ_001 — Giao dịch viên chỉ thấy công nợ trong phạm vi điểm bán', async ({ page }) => {
	const i = loadCaseInput(GOC, '34_PQ_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	await chanGhi(page);
	const trangThai = await moMan(page, 'gdv');
	test.info().annotations.push({
		type: 'status các lời gọi customer-debt',
		description: trangThai.join(' · ') || '(không gọi)',
	});
	if (trangThai.length === 0) test.skip(true, 'Vai gdv không phát sinh lời gọi nào để đo.');

	// 🔴 Mọi lời gọi 401 ⇒ màn hiện đủ thẻ số liệu nhưng tất cả bằng 0, KHÔNG kèm thông báo lỗi.
	//    Người dùng đọc màn sẽ tin là không có khách nào nợ.
	expect(
		trangThai.some((s) => s === 200),
		`Vai giao dịch viên mở màn công nợ khách hàng: mọi lời gọi đều lỗi (${trangThai.join(' · ')}) ` +
			`⇒ màn hiện nhưng KHÔNG đọc được dòng nào. Chữ trên màn: ` +
			chuan(await khung(page).innerText()).slice(0, 200),
	).toBe(true);
});
