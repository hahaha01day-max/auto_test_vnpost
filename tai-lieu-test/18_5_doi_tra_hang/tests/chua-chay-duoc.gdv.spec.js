'use strict';

/** 18_5 — case CHƯA CHẠY ĐƯỢC (đo 25/09/2026, làn 8). 🔴 Skip có chủ ý — 🚫 không pass rỗng. */

const { test } = require('@playwright/test');

test.describe('18_5 — case chưa chạy được', () => {
	test('18_5_140_007 — Chặn khi không xác định được thời gian tạo đơn gốc', async () => {
		test.skip(true, "Cần đơn gốc không có thời gian tạo — không dựng được qua giao diện/API (chỉ sửa DB, cấm).");
	});
});
