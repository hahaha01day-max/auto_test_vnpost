'use strict';

/**
 * 16_hang_ky_gui — các case **CHƯA CHẠY ĐƯỢC** của vai `province`.
 *
 * 🔴 File toàn case skip là chủ ý: báo cáo phải phân biệt *"chưa ai viết script"* với *"đã viết,
 * đang bị chặn"*. Lý do bỏ qua lấy từ `skipReason()` — tức từ `test-input.json`, 🚫 không phải
 * lời giải thích viết tay.
 *
 * 🔴 Nhóm này chạm tiền thật (công nợ ký gửi) hoặc chặn thu ngân đang bán (ngừng quầy).
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
	test.skip(
		Boolean(ly) || true,
		ly ?? `Case ${id} đủ điều kiện chạy nhưng CHƯA viết phép kiểm — cần probe màn rồi viết assert.`,
	);
	return i;
};

test.describe('16_hang_ky_gui — case chưa chạy được (vai province)', () => {
	test('16_010_018 — Lập lệnh chi bị chặn khi NCC còn khoản Tạm tính', async () => {
		chanNeuTat('16_010_018');
		test.skip(true, 'Lập lệnh chi cho NCC còn khoản Tạm tính: nếu BE không chặn thì sinh lệnh chi thật cho NCC của chuỗi. Cần user cho phép + chỉ định NCC thử.');
	});
	test('16_030_018 — 🔴 Cảnh báo rà soát KHÔNG chặn chốt kỳ', async () => {
		chanNeuTat('16_030_018');
		test.skip(true, 'Case kiểm "vẫn CHỐT ĐƯỢC" ⇒ chốt kỳ thật. Chốt kỳ là MỘT CHIỀU (không mở lại được) trên kỳ THẬT của chuỗi (36 kỳ đều thuộc TCT, NCC dùng chung — không phải dữ liệu làn test) — chờ user cho phép rõ (bàn giao 24/09).');
	});
	test('16_030_019 — Chốt kỳ khi còn mặt hàng chưa đóng dấu giá bị chặn', async () => {
		chanNeuTat('16_030_019');
		test.skip(true, 'Làn 7 không kỳ nào còn dòng chưa đóng dấu giá (030_006 đo 25/09) ⇒ bấm chốt sẽ CHỐT THẬT thay vì bị chặn. Chốt kỳ là MỘT CHIỀU (không mở lại được) trên kỳ THẬT của chuỗi (36 kỳ đều thuộc TCT, NCC dùng chung — không phải dữ liệu làn test) — chờ user cho phép rõ (bàn giao 24/09).');
	});
	test('16_030_020 — 🔴 Chốt kỳ bị chặn khi Thẻ kho đã bị dọn theo tiering', async () => {
		chanNeuTat('16_030_020');
		test.skip(true, 'Không kỳ nào có Thẻ kho trước ngày bắt đầu kỳ đã bị dọn theo tiering (kỳ cũ nhất 2026). Bấm chốt thử là chốt thật. Chốt kỳ là MỘT CHIỀU (không mở lại được) trên kỳ THẬT của chuỗi (36 kỳ đều thuộc TCT, NCC dùng chung — không phải dữ liệu làn test) — chờ user cho phép rõ (bàn giao 24/09).');
	});
	test('16_030_021 — Khoản nghĩa vụ đã thuộc kỳ khác chặn chốt', async () => {
		chanNeuTat('16_030_021');
		test.skip(true, 'Không dựng được khoản nghĩa vụ gắn sai kỳ qua hệ thống; bấm chốt thử là chốt thật. Chốt kỳ là MỘT CHIỀU (không mở lại được) trên kỳ THẬT của chuỗi (36 kỳ đều thuộc TCT, NCC dùng chung — không phải dữ liệu làn test) — chờ user cho phép rõ (bàn giao 24/09).');
	});
	test('16_030_025 — Sửa ngày chứng từ về kỳ đã chốt bị chặn', async () => {
		chanNeuTat('16_030_025');
		test.skip(true, 'Cần kỳ đã chốt có phiếu sửa được ngày chứng từ — phiếu ký gửi của 2 kỳ LOCKED nằm ở điểm bán thật (không phải làn test); sửa ngày chứng từ thật là ghi dữ liệu nghiệp vụ. Chờ user chỉ định phiếu thử.');
	});
	test('16_030_026 — Bật lọc đơn vị lúc chốt không ảnh hưởng biên bản', async () => {
		chanNeuTat('16_030_026');
		test.skip(true, 'Case chốt kỳ (khi đang bật lọc đơn vị) rồi đọc biên bản. Chốt kỳ là MỘT CHIỀU (không mở lại được) trên kỳ THẬT của chuỗi (36 kỳ đều thuộc TCT, NCC dùng chung — không phải dữ liệu làn test) — chờ user cho phép rõ (bàn giao 24/09).');
	});
});
