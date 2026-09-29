'use strict';

/**
 * 50 · TT01 — TOÀN TRÌNH điểm bán đề xuất đặt hàng (nhánh tỉnh KHÔNG đủ hàng → TCT đặt NCC giao thẳng HUB tỉnh).
 *   010 CHT lập phiếu đề xuất → 020 xã duyệt → 030 tỉnh gửi TCT → 040 TCT tạo PO giao thẳng, NCC xác nhận
 *   → 050 tỉnh xác nhận giao thẳng (HUB nhận) → 060 tỉnh tạo phiếu chuyển kho theo phiếu đề xuất
 *   → 070 điểm bán nhận hàng → 080 đối chiếu cuối (tồn từng kho, công nợ NCC, trạng thái phiếu gốc).
 * Mỗi bước là một case, chạy tuần tự; bước dùng helper phân hệ gốc (`13_2/tests/dieu-phoi-ghi.js` → 13_1, 13_3).
 * Tiến độ: `test-output/tt01.json` — hỏng giữa chừng thì lượt sau đi tiếp; chuỗi đã xong thì lượt sau dựng chuỗi mới.
 * 🔴 Tiền đề làn: HUB tỉnh (case 04_5_020_016) + bảng giá mua phạm vi TCT/tỉnh (seed 13). Giá mua seed 60.000 đ/SP.
 * Chạy: VNPOST_LANE=7 npx playwright test --config tai-lieu-test/50_toan_trinh/playwright.config.js --project=tct tests/tt01
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dp = require('../../13_2_gop_tach_va_dieu_phoi/tests/dieu-phoi-ghi');
const tt = require('./toan-trinh-ghi');

const GOC = path.join(__dirname, '..');
const TEP = path.join(GOC, 'test-output', 'tt01.json');
const GIA_MUA = 60_000; // bảng giá mua seed (00_seed bước 7.3 / 13) — mọi SKU seed
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const du = () => seed.doc().duLieu;

test.describe('50 · TT01 Toàn trình điểm bán đề xuất đặt hàng', () => {
	// 🚫 KHÔNG describe.serial: một expect.soft đỏ là serial bỏ qua mọi bước sau. Bước sau tự chặn qua `chan(id, can)` theo tiến độ.
	test.describe.configure({ mode: 'default' });
	/** Trạng thái chạy + số đo trước/sau, ghi file sau mỗi bước. */
	let kq = {};
	const luu = (x) => { Object.assign(kq, x); fs.mkdirSync(path.dirname(TEP), { recursive: true }); fs.writeFileSync(TEP, JSON.stringify(kq, null, 2)); };
	const tham = () => {
		const i = loadCaseInput(GOC, '50_TT01_010');
		const gv = du().sanPham.sanPhamTheoGiaVon;
		return { sps: [gv.tieuChuan.tenSanPham, gv.fifo.tenSanPham], sl: Number(i.data?.soLuong || 2) };
	};
	const chan = (id, can) => {
		const ly = skipReason(loadCaseInput(GOC, id));
		test.skip(Boolean(ly), ly ?? '');
		if (can) test.skip(!kq[can], `Bước trước chưa xong (thiếu ${can}).`);
	};
	/** Chi tiết phiếu gốc (API, phiên ĐIỂM BÁN — chủ phiếu luôn thấy; tỉnh không thấy phiếu còn chờ xã duyệt). */
	const phieuGoc = async (browser) => {
		const ps = await k.moPhienPhu(browser, 'shop', '/inventory/purchase-request');
		try { return await dp.chiTietPhieu(ps, kq.maGoc); } finally { await ps.dong(); }
	};
	/** Tồn từng SP của phiếu ở shop `shopId` (vai `vai`) ⇒ { productId: tồn }. */
	const tonCacSp = async (browser, vai, shopId) => {
		const r = {};
		for (const pid of kq.pids) r[pid] = await tt.tonKho(browser, vai, shopId, pid);
		return r;
	};

	test.beforeAll(() => {
		try { kq = JSON.parse(fs.readFileSync(TEP, 'utf8')); } catch { kq = {}; }
		if (kq.shopNhan) kq = {}; // chuỗi cũ đã đi hết ⇒ dựng chuỗi mới
	});

	test('50_TT01_010 — Điểm bán lập phiếu đề xuất đặt hàng gửi phê duyệt', async ({ browser }) => {
		chan('50_TT01_010');
		const { sps, sl } = tham();
		if (!kq.congNoTruoc) luu({ congNoTruoc: await tt.congNoNcc(browser, du().sanPhamNcc.supplierId) });
		await dp.dungPhieuCoHangTaiHub(browser, { sps, sl, ghiChu: 'AUTO TEST 50 TT01', kq, luu, den: 'maGoc' });
		const p = await phieuGoc(browser);
		luu({ pids: (p?.items || []).map((i) => i.productId) });
		ghiChu('đo', `${kq.maGoc} · ${p?.status} · ${(p?.items || []).map((i) => `${i.productName}×${i.requestedQuantity}`).join(', ')}`);
		expect(p?.items?.length, 'Phiếu không đủ dòng SP đã thêm').toBe(sps.length);
		expect((p?.items || []).every((i) => Number(i.requestedQuantity) === sl), 'Số lượng đề xuất sai').toBe(true);
	});

	test('50_TT01_020 — Xã duyệt phiếu đề xuất', async ({ browser }) => {
		chan('50_TT01_020', 'maGoc');
		await dp.dungPhieuCoHangTaiHub(browser, { ...tham(), kq, luu, den: 'xaDuyet' });
		const p = await phieuGoc(browser);
		ghiChu('đo', `trạng thái ${p?.status}`);
		expect(p?.status, 'Xã duyệt xong phiếu không sang Đã duyệt').toBe('APPROVED');
	});

	test('50_TT01_030 — Tỉnh gửi phiếu lên Tổng công ty (tỉnh không đủ hàng)', async ({ browser }) => {
		chan('50_TT01_030', 'xaDuyet');
		if (!kq.hubTruoc) luu({ hubTruoc: await tonCacSp(browser, 'province', du().hubTinh.shopId) });
		await dp.dungPhieuCoHangTaiHub(browser, { ...tham(), kq, luu, den: 'maTct' });
		const p = await phieuGoc(browser);
		ghiChu('đo', `phiếu TCT ${kq.maTct} · phiếu gốc ${p?.status}`);
		expect(kq.maTct, 'Không sinh phiếu đề xuất cấp TCT').toBeTruthy();
		expect(p?.status, 'Phiếu gốc không sang Đã gửi TCT').toBe('SEND_TO_TCT');
	});

	test('50_TT01_040 — TCT duyệt, đặt NCC giao thẳng về HUB tỉnh, NCC xác nhận', async ({ browser }) => {
		chan('50_TT01_040', 'maTct');
		await dp.dungPhieuCoHangTaiHub(browser, { ...tham(), kq, luu, den: 'nccXacNhan' });
		ghiChu('đo', `PO ${kq.maPO} (id ${kq.idPO})`);
		expect(kq.maPO, 'Không tạo được PO từ phiếu TCT').toBeTruthy();
		expect(kq.nccXacNhan).toBe(true);
	});

	test('50_TT01_050 — Tỉnh xác nhận đơn giao thẳng, hàng vào kho HUB', async ({ browser }) => {
		chan('50_TT01_050', 'nccXacNhan');
		const { sl } = tham();
		await dp.dungPhieuCoHangTaiHub(browser, { ...tham(), kq, luu, den: 'hubNhan' });
		const hub = await tonCacSp(browser, 'province', du().hubTinh.shopId);
		luu({ hubSauNhan: hub });
		const p = await phieuGoc(browser);
		ghiChu('đo', `HUB trước ${JSON.stringify(kq.hubTruoc)} → sau ${JSON.stringify(hub)} · phiếu gốc ${p?.status}`);
		for (const pid of kq.pids) expect.soft(hub[pid] - (kq.hubTruoc?.[pid] || 0), `Tồn HUB SP ${pid} không tăng đúng ${sl}`).toBe(sl);
		expect(p?.status, 'Phiếu gốc không sang TCT đã giao').toBe('TCT_TRANSFERRED');
	});

	test('50_TT01_060 — Tỉnh tạo phiếu chuyển kho về điểm bán theo phiếu đề xuất', async ({ browser }) => {
		chan('50_TT01_060', 'hubNhan');
		if (!kq.shopTruoc) luu({ shopTruoc: await tonCacSp(browser, 'shop', du().diemBan.shopId) });
		if (!kq.maChuyen) {
			const ps = await k.moPhienPhu(browser, 'province', '/inventory/purchase-request');
			try {
				const c = await dp.taoChuyenTuDeXuat(ps.page, kq.maGoc, { ghiChu: 'AUTO TEST 50 TT01' });
				ghiChu('tạo phiếu chuyển', `${c.tb} · ${c.khoChuyen} → ${c.khoNhan} · xuất ngay ${c.xuatNgay}`);
				expect(c.tb).toContain('Tạo phiếu chuyển kho thành công');
				luu({ maChuyen: c.body?.code });
			} finally { await ps.dong(); }
		}
		const hub = await tonCacSp(browser, 'province', du().hubTinh.shopId);
		const p = await phieuGoc(browser);
		ghiChu('đo', `phiếu ${kq.maChuyen} · HUB ${JSON.stringify(kq.hubSauNhan)} → ${JSON.stringify(hub)} · phiếu gốc ${p?.status} stockInOutId ${p?.stockInOutId}`);
		for (const pid of kq.pids) expect.soft(hub[pid], `Xuất kho ngay mà tồn HUB SP ${pid} không về lại như trước khi nhận`).toBe(kq.hubTruoc?.[pid] || 0);
		expect(p?.status, 'Phiếu gốc không sang Đã chuyển kho').toBe('TRANSFERRED');
		expect(p?.stockInOutId, 'Phiếu gốc không gắn phiếu chuyển kho').toBeTruthy();
	});

	test('50_TT01_070 — Điểm bán xác nhận nhận hàng', async ({ browser }) => {
		chan('50_TT01_070', 'maChuyen');
		const { sl } = tham();
		if (!kq.shopNhan) {
			const n = await dp.nhanTaiDiemBan(browser, kq.maChuyen);
			expect(String(n.res?.status?.code), `Điểm bán nhận hàng lỗi: ${n.res?.status?.message}`).toBe('200');
			luu({ shopNhanLuc: Date.now() });
		}
		const shop = await tonCacSp(browser, 'shop', du().diemBan.shopId);
		ghiChu('đo', `tồn điểm bán ${JSON.stringify(kq.shopTruoc)} → ${JSON.stringify(shop)}`);
		for (const pid of kq.pids) expect.soft(shop[pid] - (kq.shopTruoc?.[pid] || 0), `Tồn điểm bán SP ${pid} không tăng đúng ${sl}`).toBe(sl);
		luu({ shopSau: shop, shopNhan: true });
	});

	test('50_TT01_080 — Đối chiếu cuối: công nợ NCC và trạng thái phiếu đề xuất', async ({ browser }) => {
		chan('50_TT01_080', 'shopNhan');
		const { sps, sl } = tham();
		const sau = await tt.congNoNcc(browser, du().sanPhamNcc.supplierId);
		const tong = (m) => Object.values(m || {}).reduce((s, r) => s + r.totalAmount, 0);
		const tang = tong(sau) - tong(kq.congNoTruoc);
		const kyVong = sps.length * sl * GIA_MUA;
		const p = await phieuGoc(browser);
		ghiChu('công nợ NCC', `Σ phát sinh ${tong(kq.congNoTruoc)} → ${tong(sau)} (tăng ${tang}, kỳ vọng ${kyVong}) · theo kho ${JSON.stringify(sau)}`);
		// Trạng thái phiếu gốc sau khi điểm bán nhận: CHƯA có đặc tả ⇒ chỉ ghi nhận, chờ user chốt.
		ghiChu('phiếu gốc cuối (chờ chốt kỳ vọng)', `${p?.status}`);
		expect(tang, `PO giao thẳng ${kq.maPO} hoàn tất mà công nợ NCC không tăng đúng giá trị hàng`).toBe(kyVong);
	});
});
