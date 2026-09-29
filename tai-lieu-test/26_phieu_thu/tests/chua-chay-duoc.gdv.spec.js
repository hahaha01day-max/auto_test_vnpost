'use strict';

/**
 * Các case **CHƯA CHẠY ĐƯỢC** của vai `gdv` — skip KÈM LÝ DO THẬT (đã đối chiếu dữ liệu lane + DB).
 *
 * Đo 23/09/2026: điểm bán lane (AUTO<lane>_SHOP) có 0 đơn bán, 0 phiếu thu hệ thống sinh
 * (`SHOP_ORDER_2` rỗng ở cả 3 pod). Mọi tiền đề dưới đây chỉ sinh ra từ giao dịch bán / đổi trả /
 * thu hồi nợ — ghi sổ kho + doanh thu + quỹ, 🚫 không dọn được bằng chính chuỗi case.
 */

const { test } = require('@playwright/test');

const KHONG_DON =
	'tiền đề là giao dịch bán/đổi trả thật (xuất kho + doanh thu + phiếu thu tự sinh) — ' +
	'bút toán không dọn được trong chuỗi case';

test.describe('Case chưa chạy được (vai gdv)', () => {
});
