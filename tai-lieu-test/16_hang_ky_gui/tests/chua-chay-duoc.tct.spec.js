'use strict';

/**
 * 16_hang_ky_gui — các case **CHƯA CHẠY ĐƯỢC** của vai `tct`.
 *
 * 🔴 File toàn case skip là chủ ý: báo cáo phải phân biệt *"chưa ai viết script"* với *"đã viết,
 * đang bị chặn"*. Lý do bỏ qua lấy từ `skipReason()` — tức từ `test-input.json`, 🚫 không phải
 * lời giải thích viết tay.
 *
 * 🔴 Nhóm này chạm tiền thật (công nợ ký gửi) hoặc chặn thu ngân đang bán (ngừng quầy).
 *
 */

const { test } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
/**
 * 🔴 Case ở file này CHƯA có phép kiểm nào. Nếu `skipReason()` không trả lý do (case đủ điều
 * kiện chạy) thì vẫn phải **skip kèm lý do "chưa viết"** — 🚫 tuyệt đối không để test rỗng chạy
 * xong rồi XANH: đó là "pass rỗng", báo cáo sẽ nói đã kiểm trong khi chưa ai kiểm gì.
 */
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(
		Boolean(ly) || true,
		ly ?? `Case ${id} đủ điều kiện chạy nhưng CHƯA viết phép kiểm — cần probe màn rồi viết assert.`,
	);
	return i;
};

test.describe('16_hang_ky_gui — case chưa chạy được (vai tct)', () => {
	test('16_070_001 — 🔴 Ghi nợ nội bộ TCT ↔ Bưu điện tỉnh sau khi ghi nợ NCC', async () => {
		chanNeuTat('16_070_001');
		test.skip(true, 'Ghi nợ nội bộ TCT ↔ BĐT sinh công nợ nội bộ thật, không hoàn tác; kỳ INVOICED duy nhất (id 2) là dữ liệu thật của chuỗi. Chờ user cho phép.');
	});
	test('16_070_004 — 🔴 TCT không ăn chênh trên hàng ký gửi', async () => {
		chanNeuTat('16_070_004');
		test.skip(true, 'Cần kỳ đã ghi nợ nội bộ (070_001) — chờ user cho phép ghi nợ nội bộ.');
	});
});
