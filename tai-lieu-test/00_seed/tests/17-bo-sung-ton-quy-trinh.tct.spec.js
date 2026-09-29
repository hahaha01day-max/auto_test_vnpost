'use strict';

/**
 * Bước 17 — BỔ SUNG TỒN cho điểm bán seed ĐÚNG QUY TRÌNH NGHIỆP VỤ (user chốt 28/09/2026), 🚫 không nhập tay:
 *   1. CHT lập phiếu đề xuất (SP tiêu chuẩn + FIFO, mỗi loại SL) → 2. xã duyệt
 *   3. tỉnh "Gửi lên TCT" (HUB tỉnh không đủ hàng) → 4. TCT duyệt, tạo PO NCC giao thẳng về HUB tỉnh, NCC xác nhận
 *   5. tỉnh xác nhận đơn giao thẳng (nhập lô) → 6. tỉnh mở phiếu đề xuất GỐC → "Tạo phiếu chuyển kho" về điểm bán
 *   7. điểm bán xác nhận nhận hàng.
 * Bước 1–5 + 6–7 dùng chung helper `13_2/tests/dieu-phoi-ghi.js` với case `13_2_040_*`.
 *
 * Dùng khi tồn SP seed ở điểm bán cạn (tiền đề bán hàng POS skip "Số lượng trong kho không đủ").
 * 🔴 Tồn đầu kỳ chặn khai lại cùng SP ⇒ bước 08 không nạp lại được — đây là đường nạp duy nhất.
 * 🔴 Cần HUB tỉnh (`hubTinh` trong sổ seed) — tạo bằng case `04_5_020_016` (không xoá được).
 * 🔴 Cần bảng giá mua phạm vi TCT + tỉnh (seed 13, `playwright.api.config.js -g "seed 13"`) — thiếu thì SP FIFO
 *    "Chưa cài đặt" giá, form PO khoá cả Lưu nháp / Lưu / Gửi NCC (`isSubmitDisabled`, đo 28/09 làn 7).
 * 🚫 Không nạp SP đích danh (phải nhập serial từng cái khi nhận) và MAC (làn 7 có dòng tồn âm).
 * Tiến độ ghi sổ seed `boSungTon.dangLam` ⇒ lượt hỏng giữa chừng chạy lại đi tiếp đúng bước; xong dồn vào `lichSu`.
 *
 * Chạy (lẻ, 🔴 bắt buộc `--no-deps`), ~8 phút:
 *   VNPOST_LANE=7 npx playwright test --config tai-lieu-test/00_seed/playwright.config.js --project=tct --no-deps tests/17-bo-sung-ton
 *   VNPOST_BO_SUNG_SL=50 (mặc định) · VNPOST_BO_SUNG_MOI=1 ⇒ bỏ tiến độ cũ, lập chuỗi mới.
 */

const { test, expect } = require('@playwright/test');
const seed = require('../seed-state');
const dp = require('../../13_2_gop_tach_va_dieu_phoi/tests/dieu-phoi-ghi');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const SL = Number(process.env.VNPOST_BO_SUNG_SL || 50);
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

test('17 bo sung ton — đề xuất → xã duyệt → TCT giao thẳng HUB tỉnh → tỉnh chuyển kho theo đề xuất → điểm bán nhận', async ({ browser }) => {
	test.setTimeout(30 * 60_000);
	const du = seed.doc().duLieu;
	const gv = du.sanPham.sanPhamTheoGiaVon;
	// 🔴 Helper giữ tham chiếu `kq` ⇒ `luu` phải SỬA TẠI CHỖ (Object.assign), 🚫 không gán object mới.
	const kq = process.env.VNPOST_BO_SUNG_MOI ? {} : { ...(du.boSungTon?.dangLam || {}) };
	const luu = (them) => { Object.assign(kq, them); seed.ghi('boSungTon', { dangLam: { ...kq } }); };

	await dp.dungPhieuCoHangTaiHub(browser, { sps: [gv.tieuChuan.tenSanPham, gv.fifo.tenSanPham], sl: SL, ghiChu: 'AUTO TEST 00_seed bổ sung tồn', kq, luu });
	ghiChu('chuỗi', `phiếu gốc ${kq.maGoc} · TCT ${kq.maTct} · PO ${kq.maPO}`);

	if (!kq.maChuyen) {
		const tinh = await k.moPhienPhu(browser, 'province', '/inventory/purchase-request');
		try {
			const c = await dp.taoChuyenTuDeXuat(tinh.page, kq.maGoc);
			ghiChu('tạo phiếu chuyển', `${c.tb} · xuất ngay ${c.xuatNgay}`);
			expect(c.tb, `Tạo phiếu chuyển kho từ phiếu đề xuất không thành công (${c.lyDo})`).toContain('Tạo phiếu chuyển kho thành công');
			luu({ maChuyen: c.body?.code });
		} finally { await tinh.dong(); }
	}
	ghiChu('phiếu chuyển', kq.maChuyen);

	if (!kq.shopNhan) {
		const n = await dp.nhanTaiDiemBan(browser, kq.maChuyen);
		expect(String(n.res?.status?.code), `Điểm bán nhận hàng lỗi: ${n.res?.status?.message}`).toBe('200');
		luu({ shopNhan: true });
	}
	const ls = [...(seed.doc().duLieu.boSungTon?.lichSu || []), { ...kq, xong: Date.now() }];
	seed.ghi('boSungTon', { dangLam: null, lichSu: ls });
});
