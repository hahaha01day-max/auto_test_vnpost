'use strict';

/**
 * Các case **CHƯA CHẠY ĐƯỢC** của vai `tct`.
 *
 * 🔴 Mọi test ở đây skip KÈM LÝ DO: báo cáo phải phân biệt *"đã kiểm và đạt"* với
 * *"chưa ai kiểm"*. 🚫 Tuyệt đối không để test rỗng chạy xong rồi XANH.
 */

const { test } = require('@playwright/test');

test.describe('Case chưa chạy được (vai tct)', () => {
	test("GVMD-011 — GVMD-011", async () => {
		test.skip(true, "Case GVMD-011 GHI dữ liệu thật (mutates) — chỉ chạy khi user bật allowMutation.");
	});
	test("BC-01 — BC-01", async () => {
		test.skip(true, "Case BC-01: chưa có phép kiểm tự động — cần thao tác/dữ liệu chưa dựng được an toàn.");
	});
});
