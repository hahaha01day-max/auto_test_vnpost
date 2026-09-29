'use strict';

/** 18_4 — case CHƯA CHẠY ĐƯỢC (chặn có lý do đo 25/09/2026, làn 8). 🔴 Skip có chủ ý. */

const { test } = require('@playwright/test');

test.describe('18_4 — case chưa chạy được', () => {
	test('18_4_020_004 — Thẻ thẻ trả trước chỉ hiện khi có phát sinh', async () => {
		test.skip(true, "Cần kỳ có phát sinh thanh toán thẻ trả trước — điểm bán seed không có thẻ trả trước.");
	});
	test('18_4_080_002 — Phê duyệt đơn hàng tạm nộp', async () => {
		test.skip(true, "Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng.");
	});
	test('18_4_080_003 — Từ chối đơn hàng tạm nộp có lý do', async () => {
		test.skip(true, "Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng.");
	});
	test('18_4_080_004 — Chặn từ chối khi bỏ trống lý do', async () => {
		test.skip(true, "Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng.");
	});
	test('18_4_080_005 — Chặn đối soát khi bỏ trống số tiền', async () => {
		test.skip(true, "Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng.");
	});
	test('18_4_080_006 — Chặn đối soát khi chưa chọn lý do lệch', async () => {
		test.skip(true, "Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng.");
	});
	test('18_4_080_007 — Chặn đối soát khi chọn lý do nhưng bỏ trống ghi chú', async () => {
		test.skip(true, "Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng.");
	});
	test('18_4_080_008 — Ghi nhận đối soát thành công', async () => {
		test.skip(true, "Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng.");
	});
});
