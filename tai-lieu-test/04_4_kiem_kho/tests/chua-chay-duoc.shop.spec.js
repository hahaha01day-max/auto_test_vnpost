'use strict';

/**
 * 04_4 Kiểm kho — các case **CHƯA CHẠY ĐƯỢC** của vai `shop`.
 *
 * 🔴 File này toàn case skip, và đó là chủ ý: báo cáo phải phân biệt *"chưa ai viết script"* với
 * *"đã viết, đang bị chặn"*. Lý do bỏ qua lấy từ `skipReason()` — tức từ `test-input.json`,
 * 🚫 không phải lời giải thích viết tay.
 *
 * 🔴 Áp dụng phiếu kiểm kho ĐIỀU CHỈNH TỒN KHO THẬT, và dòng bỏ trống có thể bị hiểu là "đếm 0" — sai một lần là xoá sạch tồn của mọi sản phẩm chưa kiểm (mục 2 của test-cases.md).
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

test.describe('04_4 Kiểm kho — case chưa chạy được (vai shop)', () => {
	test('04_4_060_003 — Kiểm kho GIẢM khi tồn đang bằng 0', async () => {
		chanNeuTat('04_4_060_003');
	});
	test('04_4_060_004 — Kiểm kho GIẢM khi tồn đang âm', async () => {
		chanNeuTat('04_4_060_004');
	});
	test('04_4_060_005 — Kiểm kho TĂNG khi tồn đang âm', async () => {
		chanNeuTat('04_4_060_005');
	});
	// 04_4_070_001: có phép kiểm ở `ky-ke-toan.shop.spec.js` (28/09).
	test('04_4_070_005 — Nhập kho bù sau khi bán âm', async () => {
		chanNeuTat('04_4_070_005');
	});
});
