'use strict';

/**
 * 07_1 Cấu hình chung — case **CHƯA CHẠY ĐƯỢC** của vai `tct`.
 *
 * 🔴 Cấu hình ở phân hệ này áp cho TOÀN HỆ THỐNG: đổi đơn vị làm tròn hay VAT mặc định là đổi
 * cách tính tiền của mọi điểm bán ngay lập tức ⇒ mọi case ghi giữ `allowMutation: false`.
 * Lý do bỏ qua lấy từ `skipReason()`, 🚫 không viết tay.
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
	// Lý do chặn ĐO ĐƯỢC ghi ở `_blocked` của test-input.json — nêu kèm để báo cáo đọc được ngay.
	const chan = require('../test-input.json').cases[id]?._blocked;
	test.skip(
		Boolean(ly) || true,
		[ly, chan].filter(Boolean).join(' — ') || `Case ${id} đủ điều kiện chạy nhưng CHƯA viết phép kiểm — cần probe màn rồi viết assert.`,
	);
	return i;
};

test.describe('07_1 — case chưa chạy được (vai tct)', () => {
	test('07_1_060_002 — Làm tròn tiền và Làm tròn tiền phần kho đặt khác nhau', async () => {
		chanNeuTat('07_1_060_002');
	});
});
