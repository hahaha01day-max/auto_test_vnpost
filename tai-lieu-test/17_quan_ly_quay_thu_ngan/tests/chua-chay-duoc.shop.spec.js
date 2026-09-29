'use strict';

/**
 * 17_quan_ly_quay_thu_ngan — case **CHƯA CHẠY ĐƯỢC** của vai `shop` (chặn có lý do cụ thể).
 *
 * 🔴 Skip có chủ ý — 🚫 không pass rỗng. Các case khác của phân hệ đã có script ở
 *    `quay-ghi.shop` · `quy-ghi.shop` · `quay-pham-vi.{province,tct,gdv}` (25/09/2026).
 */

const { test } = require('@playwright/test');

test.describe('17_quan_ly_quay_thu_ngan — case chưa chạy được (vai shop)', () => {
	test('17_030_008 — Ngừng quầy không tìm thấy quỹ tiền mặt', async () => {
		test.skip(
			true,
			'Không dựng được tiền đề: tạo quầy (UI lẫn API POST /cashier-counter/create) LUÔN tự tạo "Quỹ tiền mặt - <quầy>", ' +
				'kích hoạt lại cũng tự mở lại quỹ; không có API/màn nào xoá quỹ của quầy. Cần dữ liệu cũ (quầy tạo trước khi có ' +
				'quỹ theo quầy) hoặc user cho phép chuẩn bị bằng SQL.',
		);
	});
});
