'use strict';

/** 18_3 — case CHƯA CHẠY ĐƯỢC (chặn có lý do đo 25/09/2026, làn 8). 🔴 Skip có chủ ý. */

const { test } = require('@playwright/test');

test.describe('18_3 — case chưa chạy được', () => {
	test('18_3_040_001 — Thanh toán bằng mã QR động thành công', async () => {
		test.skip(true, "Hoàn tất cần khách chuyển khoản thật qua ngân hàng tới TK VNPOST — không giả lập được.");
	});
	test('18_3_040_004 — Tra soát giao dịch QR khi lỗi mạng hoặc timeout', async () => {
		test.skip(true, "Cần giao dịch QR treo/timeout thật để tra soát.");
	});
	test('18_3_040_005 — Nút Hoàn tất giao dịch chỉ bật khi giao dịch đã ghi nhận', async () => {
		test.skip(true, "Chọn TK nhận đã gọi POST /spa/orders/draft/v2/gen-qr; chưa dò xong màn mã QR (nút Hoàn tất/Quay lại) — làm lượt sau.");
	});
	test('18_3_040_006 — Quay lại bước chọn tài khoản nhận', async () => {
		test.skip(true, "Như 18_3_040_005 — chưa dò xong màn mã QR.");
	});
	test('18_3_060_001 — Thanh toán đa phương thức đủ số phải thu', async () => {
		test.skip(true, "Đa phương thức đủ số phải thu cần VietQR/Thẻ hoàn tất thật; chỉ tiền mặt + thẻ POS chưa dò cách xác nhận thẻ.");
	});
	test('18_3_060_007 — Chặn khi chưa hoàn tất lần lượt các màn SDK', async () => {
		test.skip(true, "Cần ≥ 2 màn SDK (QR/thẻ) liên tiếp — không giả lập được giao dịch QR.");
	});
	test('18_3_080_003 — Nút Đặt hàng trước không dùng được với đơn online', async () => {
		test.skip(true, "Cần đơn online (kênh bán online) ở điểm bán seed — chưa có.");
	});
});
