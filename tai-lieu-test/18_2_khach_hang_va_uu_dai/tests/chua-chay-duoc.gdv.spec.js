'use strict';

/**
 * 18_2 — case CHƯA CHẠY ĐƯỢC (chặn có lý do đo được 25/09/2026, làn 8). 🔴 Skip có chủ ý — 🚫 không pass rỗng.
 */

const { test } = require('@playwright/test');

test.describe('18_2 — case chưa chạy được (vai gdv)', () => {
	test('18_2_010_014 — Đơn giao qua đơn vị vận chuyển bắt buộc có khách', async () => {
		test.skip(true, "Đơn giao qua đơn vị vận chuyển: màn bán hàng biến thể shop không có lựa chọn hình thức giao hàng ở cột phải (đo 25/09) — cần xác nhận lối vào.");
	});
});
