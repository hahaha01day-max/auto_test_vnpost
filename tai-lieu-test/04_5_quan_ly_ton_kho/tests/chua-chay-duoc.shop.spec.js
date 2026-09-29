'use strict';

/**
 * 04_5 Quản lý tồn kho — các case **CHƯA CHẠY ĐƯỢC** của vai `shop`.
 *
 * 🔴 File toàn case skip là chủ ý: báo cáo phải phân biệt *"chưa ai viết script"* với *"đã viết,
 * đang bị chặn"*. Lý do bỏ qua lấy từ `skipReason()` — tức từ `test-input.json`, 🚫 không phải
 * lời giải thích viết tay.
 *
 * 🔴 Thêm/sửa/xoá kho và đổi kho mặc định là cấu hình thật của điểm bán.
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
	// Lý do chặn ĐO ĐƯỢC ghi ở `_blocked` của test-input.json — nêu kèm để báo cáo đọc được ngay.
	const chan = require('../test-input.json').cases[id]?._blocked;
	test.skip(
		Boolean(ly) || true,
		[ly, chan].filter(Boolean).join(' — ') || `Case ${id} đủ điều kiện chạy nhưng CHƯA viết phép kiểm — cần probe màn rồi viết assert.`,
	);
	return i;
};

test.describe('04_5 Quản lý tồn kho — case chưa chạy được (vai shop)', () => {
	test('04_5_020_008 — Dùng kho đã bị tắt trong nghiệp vụ', async () => {
		chanNeuTat('04_5_020_008');
	});
	test('04_5_020_011 — Chuyển kho với kho vật lý', async () => {
		chanNeuTat('04_5_020_011');
	});
	test('04_5_020_012 — Kiểm kho với kho vật lý', async () => {
		chanNeuTat('04_5_020_012');
	});
	test('04_5_020_013 — Xuất kho với kho vật lý', async () => {
		chanNeuTat('04_5_020_013');
	});
	test('04_5_020_014 — Nhập kho với kho vật lý', async () => {
		chanNeuTat('04_5_020_014');
	});
	test('04_5_020_015 — Chuyển kho giữa các kho trong CÙNG một đơn vị', async () => {
		chanNeuTat('04_5_020_015');
	});
	test('04_5_050_004 — Vai cửa hàng trưởng cấp điểm bán / kho đăng nhập', async () => {
		chanNeuTat('04_5_050_004');
	});
});
