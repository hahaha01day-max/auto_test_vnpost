'use strict';

/**
 * 12 Đơn vị vận tải — các case **CHƯA CHẠY ĐƯỢC** của vai `shop`.
 *
 * 🔴 File toàn case skip là chủ ý: báo cáo phải phân biệt *"chưa ai viết script"* với *"đã viết,
 * đang bị chặn"*. Lý do bỏ qua lấy từ `skipReason()` — tức từ `test-input.json`, 🚫 không phải
 * lời giải thích viết tay.
 *
 * 🔴 Công nợ đơn vị vận chuyển là tiền thật; tạo đơn vận chuyển ghi vào phiếu chuyển kho thật.
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

test.describe('12 Đơn vị vận tải — case chưa chạy được (vai shop)', () => {
	test('12-don-vi-van-tai_070_003 — Kiểm tra nhập đầy đủ thông tin các trường', async () => {
		chanNeuTat('12-don-vi-van-tai_070_003');
	});
	test('12-don-vi-van-tai_070_007 — Kiểm tra nhập số tiền bằng 0', async () => {
		chanNeuTat('12-don-vi-van-tai_070_007');
	});
	test('12-don-vi-van-tai_070_008 — Kiểm tra nhận kho ghi nhận bồi thường', async () => {
		chanNeuTat('12-don-vi-van-tai_070_008');
	});
	test('12-don-vi-van-tai_070_009 — Kiểm tra chỉnh sửa số tiền ghi nợ', async () => {
		chanNeuTat('12-don-vi-van-tai_070_009');
	});
	test('12-don-vi-van-tai_070_010 — Kiểm tra ghi nợ lần 2', async () => {
		chanNeuTat('12-don-vi-van-tai_070_010');
	});
	test('12-don-vi-van-tai_070_011 — Kiểm tra kho chuyển thiếu, cộng lại tồn kho chuyển', async () => {
		chanNeuTat('12-don-vi-van-tai_070_011');
	});
});
