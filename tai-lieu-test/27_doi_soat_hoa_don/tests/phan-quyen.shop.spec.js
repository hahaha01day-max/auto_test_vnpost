'use strict';

/** 27 · Phạm vi vai `shop` trên màn Đối soát hoá đơn PO. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan } = require('./reconcile-page');

const GOC = path.join(__dirname, '..');

test('27_PQ_001 — Vai không có quyền đối soát thì không vào được', async ({ page }) => {
	const i = loadCaseInput(GOC, '27_PQ_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	const { daGoi } = await chanGhi(page);
	const trangThai = await moMan(page, 'shop');

	const biChan = /\/403|\/account/.test(page.url());
	test.info().annotations.push({
		type: 'hành vi thật của vai shop',
		description: biChan
			? `bị chặn, về ${page.url()}`
			: `vào được màn · status các lời gọi: ${trangThai.join(' · ') || '(không gọi)'} · ` +
				`${await dong(page).count()} dòng`,
	});

	if (biChan) return; // Đúng kỳ vọng: bị chặn khỏi màn.

	// 🔴 Vào được màn mà API 401 là **nửa vời**: người dùng thấy màn trống và tưởng chưa có phiếu,
	//    thay vì được báo thẳng là không có quyền. Giữ đỏ để user quyết cách xử lý.
	expect(
		trangThai.length > 0 && trangThai.every((s) => s === 401),
		`Vai shop KHÔNG bị chặn khỏi màn "Đối soát hoá đơn PO" (URL ${page.url()}), và các lời gọi ` +
			`trả ${trangThai.join(' · ') || '(không gọi)'}. Kịch bản đòi "bị chặn hoặc API trả lỗi ` +
			'phân quyền" — màn trống không kèm thông báo nào là kết cục thứ ba, chưa được đặc tả.',
	).toBe(false);
	expect(daGoi, `Vai shop gửi được request ghi: ${daGoi.join(' ; ')}`).toEqual([]);
});
