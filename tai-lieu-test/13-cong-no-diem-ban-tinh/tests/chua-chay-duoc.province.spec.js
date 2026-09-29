'use strict';

/**
 * 13 Công nợ điểm bán - tỉnh — các case **CHƯA CHẠY ĐƯỢC** của vai `province`.
 *
 * 🔴 File toàn case skip là chủ ý: báo cáo phải phân biệt *"chưa ai viết script"* với *"đã viết,
 * đang bị chặn"*. Lý do bỏ qua lấy từ `skipReason()` — tức từ `test-input.json`, 🚫 không phải
 * lời giải thích viết tay.
 *
 * 🔴 Đối soát và thu hồi công nợ là TIỀN THẬT; phiếu nộp tiền lọc theo mã đơn vị chụp trên phiếu.
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

test.describe('13 Công nợ điểm bán - tỉnh — case chưa chạy được (vai province)', () => {
	// CNDB-CD-009: có phép kiểm ở `cong-no.province.spec.js` (28/09).
	test('CNDB-CD-010 — Huỷ drawer kiểm đếm giữa chừng thì không tạo bút toán', async () => {
		chanNeuTat('CNDB-CD-010');
	});
	test('CNDB-CD-011 — Sau khi xác nhận nhận tiền, số liệu liên quan đổi đúng', async () => {
		chanNeuTat('CNDB-CD-011');
	});
	test('CNDB-KY-009 — Ky van ky duoc khi con phieu da giao ma Tinh chua xac nhan', async () => {
		chanNeuTat('CNDB-KY-009');
	});
	// CNDB-KY-010: có phép kiểm ở `cong-no.province.spec.js` (28/09).
	// CNDB-ND-010: có phép kiểm ở `cong-no.province.spec.js` (28/09).
	test('CNDB-ND-011 — Huỷ form khai nợ đầu kỳ giữa chừng thì không lưu gì', async () => {
		chanNeuTat('CNDB-ND-011');
	});
	test('CNDB-PQ-002 — Duong xac nhan le tung phieu da bi khoa o may chu', async () => {
		chanNeuTat('CNDB-PQ-002');
	});
});
