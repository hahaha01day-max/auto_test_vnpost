'use strict';

/**
 * Phân hệ 12_3 — Công nợ nhà cung cấp, phần ĐỌC (vai `tct`).
 *
 * 🔴 67/68 case là case GHI (trả nợ, đối trừ, điều chỉnh công nợ) — **tiền thật**, giữ
 * `allowMutation: false`. Cả file 🚫 KHÔNG ghi.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { API_CONG_NO, boQua, chanGhi, chuan, cot, dong, moDanhSachNCC, moTheoNut } = require('./ncc-page');

const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test('12_3_010_001 — Mở Công nợ NCC khi có dữ liệu', async ({ page }) => {
	chanNeuTat('12_3_010_001');

	await chanGhi(page);
	await moDanhSachNCC(page, VAI);

	const { box, res } = await moTheoNut(page, 'Công nợ', API_CONG_NO);
	expect(res, 'Bấm nút "Công nợ" mà không gọi API lịch sử công nợ').not.toBeNull();
	expect(res.status()).toBe(200);

	// 🔴 Tham số `historyGroup=DEBT` quyết định đang xem nhóm nào — ghi lại để đối chiếu.
	const p = Object.fromEntries(new URL(res.url()).searchParams.entries());
	test.info().annotations.push({ type: 'tham số API công nợ', description: JSON.stringify(p) });

	const ten = (await cot(box).allInnerTexts()).map(chuan).filter((t) => t !== '');
	for (const c of ['Ngày tạo', 'Mã Phiếu', 'Giá trị', 'Còn nợ']) {
		expect(ten, `Bảng công nợ thiếu cột "${c}"; đang có: ${ten.join(' · ')}`).toContain(c);
	}

	const so = await dong(box).count();
	if (so === 0) boQua(test, 'NCC đầu tiên chưa phát sinh công nợ nào để đối chiếu.');
	expect(so).toBeGreaterThan(0);
});
