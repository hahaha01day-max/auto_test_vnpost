'use strict';

/** 18_5 · PQ — Phạm vi của vai `gdv` trên màn đơn hoàn trả. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan } = require('./return-page');

const GOC = path.join(__dirname, '..');

test('18_5_PQ_001 — Vai giao dịch viên không duyệt được đơn hoàn trả quá hạn', async ({ page }) => {
	const i = loadCaseInput(GOC, '18_5_PQ_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	const { daGoi } = await chanGhi(page);
	const res = await moMan(page, 'gdv');

	// 🔴 Ba kết cục đều hợp lệ về nghiệp vụ — ghi lại kết cục THẬT thay vì ép một kết cục.
	const vao = !/\/403|\/account/.test(page.url());
	test.info().annotations.push({
		type: 'kết cục vai gdv',
		description: vao
			? `vào được màn, API trả ${res ? res.status() : '(không gọi)'}`
			: `bị đá về ${page.url()}`,
	});

	if (!vao) return; // Bị chặn khỏi màn — đúng kỳ vọng phạm vi.

	const nutDuyet = khung(page).getByRole('button', { name: /Duyệt|Từ chối|Phê duyệt/ });
	const soDuyet = await nutDuyet.count();
	if ((await dong(page).count()) === 0 && soDuyet === 0) {
		test.skip(
			true,
			'Điểm bán của gdv chưa có đơn hoàn trả nào ở trạng thái Chờ duyệt ⇒ 🚫 không phân biệt ' +
				'được "bị cấm duyệt" với "không có gì để duyệt".',
		);
	}
	expect(
		soDuyet,
		`Vai gdv thấy ${soDuyet} nút duyệt/từ chối trên màn đơn hoàn trả: ` +
			`${chuan((await nutDuyet.allInnerTexts()).join(' · '))}`,
	).toBe(0);
	expect(daGoi, `gdv gửi được request ghi: ${daGoi.join(' ; ')}`).toEqual([]);
});
