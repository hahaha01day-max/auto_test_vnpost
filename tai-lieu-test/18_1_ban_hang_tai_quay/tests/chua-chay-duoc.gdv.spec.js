'use strict';

/**
 * 18_1 — case CHƯA CHẠY ĐƯỢC (chặn có lý do đo được 25/09/2026, làn 8). 🔴 Skip có chủ ý — 🚫 không pass rỗng.
 */

const { test } = require('@playwright/test');

test.describe('18_1 — case chưa chạy được (vai gdv)', () => {
	// 18_1_020_020: có phép kiểm ở `quet-ma.gdv.spec.js` (28/09, B8).
	test('18_1_030_011 — Quét barcode khi mất kết nối máy quét', async () => {
		test.skip(true, "Phần cứng: rút máy quét USB — máy quét là thiết bị bàn phím, trình duyệt không nhận biết cắm/rút; không giả lập được.");
	});
	test('18_1_040_017 — Đổi lô được ghi vào nhật ký thao tác', async () => {
		test.skip(true, "Chưa xác định được màn/nhật ký chứa nhóm nghiệp vụ \"Thay đổi lô khi bán hàng\": grep nhãn này trong vnpost-web/pod/core không thấy (25/09) — cần user chỉ màn nhật ký (33) và mã nhóm nghiệp vụ.");
	});
	test('18_1_060_022 — Mất kết nối cân sau khi quét barcode', async () => {
		test.skip(true, "Luồng kết nối/mất kết nối cân không đi qua cầu nối giả lập (xem 18_1_060_001) — cần cân thật hoặc app Electron.");
	});
});
