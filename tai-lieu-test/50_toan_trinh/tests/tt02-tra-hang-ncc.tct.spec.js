'use strict';

/**
 * 50 · TT02 — TOÀN TRÌNH điểm bán trả hàng NCC (user duyệt trình tự 28/09/2026), 2 nhánh từ MỘT phiếu trả:
 *   010 CHT lập phiếu trả (TD1 hàng tự doanh tỉnh + TC hàng TCT, lô có nguồn NCC) → 020 xã duyệt → 030 tỉnh duyệt
 *   → 040 tỉnh tách theo nguồn NCC ⇒ phiếu con NCC tỉnh + phiếu con hàng TCT
 *   Nhánh NCC tỉnh: 050 tỉnh trả NCC, NCC xác nhận đợt → 060 nạp hoá đơn điều chỉnh giảm, chốt chứng từ
 *   Nhánh TCT:      070 tỉnh gửi TCT → 080 TCT duyệt, tách, trả NCC, NCC xác nhận → 090 nạp hoá đơn, chốt chứng từ
 *   → 100 đối chiếu cuối (tồn điểm bán, công nợ NCC tỉnh + NCC TCT, trạng thái phiếu).
 * Bước dùng helper phân hệ gốc: 14_1 `return-page.js` · 14_2 `tra-ghi.js` · 14_3 `hoa-don.js` (XML khuôn FE
 * `buildPoInvoiceXml`) · tiền đề hàng TD1: 13_3 `po-ghi.js` + 13_2 `dieu-phoi-ghi.js`.
 * Nguồn hàng: TC = lô vừa nhận ở TT01 (phiếu chuyển `maChuyen` trong `tt01.json`); TD1 = tiền đề "tỉnh đủ hàng"
 *   (tỉnh đặt NCC tỉnh về HUB → nhập kho → điểm bán đề xuất → xã duyệt → tỉnh chuyển theo đề xuất → điểm bán nhận).
 * Tiến độ: `test-output/tt02.json`. 🔴 Cần: TT01 đã chạy xong lượt gần nhất · seed 14 (tự doanh tỉnh) · HUB tỉnh.
 * 🔴 14_2 ghi nhận "hàng TC có nguồn PO TCT gửi TCT bị BE chặn" (050_001) — nhánh TCT ở đây dùng lô THẬT, không lách.
 * Chạy: VNPOST_LANE=7 npx playwright test --config tai-lieu-test/50_toan_trinh/playwright.config.js --project=tct tests/tt02
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dp = require('../../13_2_gop_tach_va_dieu_phoi/tests/dieu-phoi-ghi');
const po = require('../../13_3_dat_hang_va_nhap_hang/tests/po-ghi');
const { moTrang } = require('../../shared/auth/login');
const t = require('../../14_2_gom_tach_va_xu_ly_hang_tra/tests/tra-ghi');
const hd = require('../../14_3_hoa_don_hang_tra_lai/tests/hoa-don');
const tt = require('./toan-trinh-ghi');

const GOC = path.join(__dirname, '..');
const TEP = path.join(GOC, 'test-output', 'tt02.json');
const TEP_TT01 = path.join(GOC, 'test-output', 'tt01.json');
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description).slice(0, 900) });
const du = () => seed.doc().duLieu;
const ok = (b, viec) => expect(String(b?.status?.code), `${viec} lỗi: ${b?.status?.message}`).toBe('200');

/** Lô tại điểm bán sinh từ phiếu chuyển `maChuyen` (đọc chi tiết phiếu chuyển bằng phiên điểm bán). */
async function loTuPhieuChuyen(ps, maChuyen, productId) {
	const shopId = du().diemBan.shopId;
	const ds = (await k.goiGhi(ps.page, ps.st, 'GET', '/stock/v2/transfer/v2', { shopIds: shopId, beginTime: Date.now() - 7 * 86400_000, endTime: Date.now() + 86400_000, page: 0, size: 100 })).data || [];
	const p = ds.find((x) => x.code === maChuyen);
	expect(p, `Điểm bán không thấy phiếu chuyển ${maChuyen}`).toBeTruthy();
	const ct = (await k.goiGhi(ps.page, ps.st, 'GET', `/stock/v2/transfer/v2/${p.stockTransferId}`, { shopId })).data;
	const ma = (ct.items || []).filter((i) => Number(i.productId ?? i.toProductId) === Number(productId)).flatMap((i) => (i.batchProducts || []).map((b) => b.batchCode));
	const lo = ((await k.goiApi(ps.page, ps.st, '/stock/v2/batch-product', { shopId, productId, size: 500 })).data || [])
		.filter((l) => !l.deleted && ma.includes(l.batchCode) && Number(l.remainQuantity) - Number(l.reservedQuantity || 0) > 0);
	expect(lo.length, `Không còn lô khả dụng của SP ${productId} từ phiếu chuyển ${maChuyen} (lô ${ma.join(',')})`).toBeGreaterThan(0);
	return lo.sort((a, b) => Number(b.batchProductId ?? b.id) - Number(a.batchProductId ?? a.id))[0];
}

/** Đợt trả đầu tiên của phiếu `id` + dòng hàng để dựng XML khớp (khuôn `hoa-don.dotRanh`). */
async function dotCua(p, id) {
	const b = ((await t.doc(p, `/${id}/supplier-batches`))?.data || [])[0];
	if (!b) return null;
	const ct = await t.chiTietPhieu(p.page, p.st, id);
	const items = new Map((ct?.items || []).map((it) => [it.id, it]));
	let bi = [];
	try { bi = JSON.parse(b.batchItems || '[]'); } catch { bi = []; }
	const dong = bi.map((x) => {
		const it = items.get(x.itemId) || {};
		return { itemId: x.itemId, ten: it.productName, dvt: it.unitName || 'Cái', sl: Number(x.quantity), tien: Math.round(Number(it.price) * Number(x.quantity)) };
	});
	return { id: b.id, amount: Number(b.amount), status: b.status, batch: b, dong };
}

test.describe('50 · TT02 Toàn trình điểm bán trả hàng NCC', () => {
	// 🚫 KHÔNG describe.serial: một expect.soft đỏ là serial bỏ qua mọi bước sau. Bước sau tự chặn qua `chan(id, can)` theo tiến độ.
	test.describe.configure({ mode: 'default' });
	let kq = {};
	const luu = (x) => { Object.assign(kq, x); fs.mkdirSync(path.dirname(TEP), { recursive: true }); fs.writeFileSync(TEP, JSON.stringify(kq, null, 2)); };
	const SL = () => Number(loadCaseInput(GOC, '50_TT02_010').data?.soLuong || 1);
	const chan = (id, can) => {
		const ly = skipReason(loadCaseInput(GOC, id));
		test.skip(Boolean(ly), ly ?? '');
		if (can) test.skip(!kq[can], `Bước trước chưa xong (thiếu ${can}).`);
	};
	const td = () => du().tuDoanhTinh;
	let ps; let pt; let pc; // phiên phụ điểm bán / tỉnh / TCT — mở SAU tiền đề (helper tiền đề tự mở-đóng phiên, xoay token)

	test.beforeAll(() => {
		try { kq = JSON.parse(fs.readFileSync(TEP, 'utf8')); } catch { kq = {}; }
		if (kq.xong) kq = {};
	});
	test.afterAll(async () => { t.datPhienSan('province', null); t.datPhienSan('tct', null); await ps?.dong(); await pt?.dong(); await pc?.dong(); });
	const moPhien = async (browser) => {
		if (ps) return;
		ps = await k.moPhienPhu(browser, 'shop', t.ROUTE);
		pt = await k.moPhienPhu(browser, 'province', t.ROUTE);
		pc = await k.moPhienPhu(browser, 'tct', t.ROUTE);
		t.datPhienSan('province', pt);
		t.datPhienSan('tct', pc);
	};

	test('tien de TT02 — hàng TD1 (NCC tỉnh) về điểm bán qua nhánh tỉnh đủ hàng + lô TC từ TT01', async ({ page, browser }) => {
		test.setTimeout(25 * 60_000);
		expect(td()?.priceListId, 'Làn chưa chạy seed 14 (tự doanh tỉnh)').toBeTruthy();
		let tt01 = {};
		try { tt01 = JSON.parse(fs.readFileSync(TEP_TT01, 'utf8')); } catch { /* chưa chạy */ }
		if (!kq.maChuyenTc) {
			expect(tt01.shopNhan, 'TT01 chưa chạy xong lượt gần nhất — chạy tests/tt01 trước').toBe(true);
			luu({ maChuyenTc: tt01.maChuyen, pidTc: (tt01.pids || [])[0] ?? null, tt01Goc: tt01.maGoc });
		}
		const sl = SL();
		// (a) Tỉnh đặt NCC tỉnh TD1 về HUB → NCC xác nhận → nhập kho HUB.
		if (!kq.poTd1Nhap) {
			const tinh = await k.moPhienPhu(browser, 'province', '/inventory/purchase-order');
			try {
				if (!kq.poTd1) {
					await moTrang(tinh.page, `${po.BASE()}/inventory/purchase-order/create`, 'province');
					await expect(po.fi(tinh.page, 'Kho đặt hàng')).toBeVisible({ timeout: 30_000 });
					await po.chonKho(tinh.page, 'Kho đặt hàng');
					await po.chonNcc(tinh.page, td().tenNcc, td().soHopDong);
					await po.chonNgay(tinh.page);
					await po.fi(tinh.page, 'Ghi chú').locator('textarea').fill('AUTO TEST 50 TT02 tiền đề');
					await po.themSp(tinh.page, td().sanPham.TD1.ten, sl);
					const l = await po.luu(tinh.page, 'Gửi nhà cung cấp');
					expect(l.tb, 'Tỉnh gửi PO NCC tỉnh không thành công').toContain('Tạo phiếu đặt hàng thành công');
					luu({ poTd1: l.ma });
				}
				await po.moChiTiet(tinh.page, kq.poTd1, 'province');
				if (!kq.poTd1XacNhan) {
					expect((await po.nccXacNhan(tinh.page)).tb, 'NCC tỉnh xác nhận không thành công').toContain('Đã xác nhận');
					luu({ poTd1XacNhan: true });
					await po.moChiTiet(tinh.page, kq.poTd1, 'province');
				}
				const n = await po.nhapKho(tinh.page);
				ghiChu('nhập kho HUB', `${kq.poTd1} · ${n.tb}`);
				expect(n.tb, 'Nhập kho HUB theo PO tỉnh không thành công').toMatch(/thành công/i);
				luu({ poTd1Nhap: true });
			} finally { await tinh.dong(); }
		}
		// (b) Điểm bán đề xuất TD1 → xã duyệt (tỉnh đủ hàng ⇒ không gửi TCT) → (c) tỉnh chuyển theo đề xuất → điểm bán nhận.
		const dx1 = kq.dxTd1 || {};
		const luuDx = (x) => { Object.assign(dx1, x); luu({ dxTd1: dx1 }); };
		await dp.dungPhieuCoHangTaiHub(browser, { sps: [td().sanPham.TD1.ten], sl, ghiChu: 'AUTO TEST 50 TT02 tiền đề', kq: dx1, luu: luuDx, den: 'xaDuyet' });
		if (!dx1.maChuyen) {
			const tinh = await k.moPhienPhu(browser, 'province', '/inventory/purchase-request');
			try {
				const c = await dp.taoChuyenTuDeXuat(tinh.page, dx1.maGoc, { ghiChu: 'AUTO TEST 50 TT02 tiền đề' });
				expect(c.tb, `Tỉnh chuyển TD1 theo đề xuất lỗi (${c.lyDo})`).toContain('Tạo phiếu chuyển kho thành công');
				luuDx({ maChuyen: c.body?.code });
			} finally { await tinh.dong(); }
		}
		if (!dx1.shopNhan) {
			const n = await dp.nhanTaiDiemBan(browser, dx1.maChuyen);
			ok(n.res, 'Điểm bán nhận TD1');
			luuDx({ shopNhan: true });
		}
		ghiChu('nguồn hàng', `TD1: PO ${kq.poTd1} → đề xuất ${dx1.maGoc} → chuyển ${dx1.maChuyen} · TC: TT01 ${kq.tt01Goc} → chuyển ${kq.maChuyenTc}`);
		void page;
	});

	test('50_TT02_010 — Điểm bán lập phiếu trả hàng NCC (hàng tự doanh tỉnh + hàng TCT)', async ({ browser }) => {
		chan('50_TT02_010', 'maChuyenTc');
		await moPhien(browser);
		const sl = SL();
		const pidTd = td().sanPham.TD1.productId;
		if (!kq.phieu) {
			const loTd = await loTuPhieuChuyen(ps, kq.dxTd1.maChuyen, pidTd);
			const loTc = await loTuPhieuChuyen(ps, kq.maChuyenTc, kq.pidTc);
			luu({ pidTd, tonTruoc: { [pidTd]: await tt.tonKho(browser, 'shop', du().diemBan.shopId, pidTd, ps), [kq.pidTc]: await tt.tonKho(browser, 'shop', du().diemBan.shopId, kq.pidTc, ps) },
				congNoTruoc: { tinh: await tt.congNoNcc(browser, td().supplierId, 'province', pt), tct: await tt.congNoNcc(browser, du().sanPhamNcc.supplierId, 'tct', pc) } });
			const p = await t.taoPhieuApi(ps.page, ps.st, { items: [t.dongTuLo(loTd, sl), t.dongTuLo(loTc, sl)], note: 'AUTO TEST 50 TT02' });
			luu({ phieu: { id: p.id, code: p.code }, lo: { td: loTd.batchCode, tc: loTc.batchCode } });
		}
		const ton = { [pidTd]: await tt.tonKho(browser, 'shop', du().diemBan.shopId, pidTd, ps), [kq.pidTc]: await tt.tonKho(browser, 'shop', du().diemBan.shopId, kq.pidTc, ps) };
		ghiChu('đo', `phiếu ${kq.phieu.code} · lô TD1 ${kq.lo.td} / TC ${kq.lo.tc} · tồn ${JSON.stringify(kq.tonTruoc)} → ${JSON.stringify(ton)}`);
		// Đo 28/09: phiếu PENDING chưa sinh phiếu giữ hàng (reserve_stock_in_out_id NULL), tồn chưa đổi ⇒ chỉ ghi nhận
		//    thời điểm trừ tồn qua từng bước (020/030), kiểm tồn cuối ở 100.
		luu({ tonSau010: ton });
	});

	test('50_TT02_020 — Xã duyệt phiếu trả', async ({ browser }) => {
		chan('50_TT02_020', 'phieu');
		await moPhien(browser);
		if (!kq.xaDuyet) { await t.duyetDu(browser, 'ward', kq.phieu.id); luu({ xaDuyet: true }); }
		const ct = await t.chiTietPhieu(ps.page, ps.st, kq.phieu.id);
		const ton = { [kq.pidTd]: await tt.tonKho(browser, 'shop', du().diemBan.shopId, kq.pidTd, ps), [kq.pidTc]: await tt.tonKho(browser, 'shop', du().diemBan.shopId, kq.pidTc, ps) };
		ghiChu('đo', `trạng thái ${ct?.request?.status} · tồn điểm bán ${JSON.stringify(ton)} (trước lập phiếu ${JSON.stringify(kq.tonTruoc)})`);
		expect(ct?.request?.status, 'Xã duyệt xong phiếu không sang Xã đã duyệt').toBe('WARD_APPROVED');
	});

	test('50_TT02_030 — Tỉnh duyệt phiếu trả', async ({ browser }) => {
		chan('50_TT02_030', 'xaDuyet');
		await moPhien(browser);
		if (!kq.tinhDuyet) { await t.duyetDu(browser, 'province', kq.phieu.id); luu({ tinhDuyet: true }); }
		const ct = await t.chiTietPhieu(ps.page, ps.st, kq.phieu.id);
		const ton = { [kq.pidTd]: await tt.tonKho(browser, 'shop', du().diemBan.shopId, kq.pidTd, ps), [kq.pidTc]: await tt.tonKho(browser, 'shop', du().diemBan.shopId, kq.pidTc, ps) };
		ghiChu('đo', `trạng thái ${ct?.request?.status} · giữ hàng ${ct?.request?.reserveStockInOutId ?? '-'} · tồn điểm bán ${JSON.stringify(ton)} (trước lập phiếu ${JSON.stringify(kq.tonTruoc)})`);
		expect(ct?.request?.status).toBe('APPROVED');
	});

	test('50_TT02_040 — Tỉnh tách phiếu theo nguồn NCC', async ({ browser }) => {
		chan('50_TT02_040', 'tinhDuyet');
		await moPhien(browser);
		if (!kq.conTinh) {
			const con = await t.tach(pt, kq.phieu.id);
			ghiChu('tách', con.map((c) => `${c.code}/${c.status}/${c.supplierLevel}/${c.supplierName}`).join(' · '));
			const ct = con.find((c) => c.supplierLevel === 'TINH');
			const cc = con.find((c) => c.status === 'TCT_NOT_SENT');
			luu({ conTinh: ct ? { id: ct.id, code: ct.code } : null, conTct: cc ? { id: cc.id, code: cc.code } : null });
		}
		expect(kq.conTinh, 'Không ra phiếu con NCC tỉnh (Chưa trả hàng)').toBeTruthy();
		expect(kq.conTct, 'Không ra phiếu con hàng TCT (Chưa gửi TCT)').toBeTruthy();
	});

	test('50_TT02_050 — Nhánh NCC tỉnh: tỉnh trả NCC, NCC xác nhận đợt trả', async ({ browser }) => {
		chan('50_TT02_050', 'conTinh');
		await moPhien(browser);
		if (!kq.dotTinh) {
			ok(await t.xuLy(pt, kq.conTinh.id, 'RETURN', SL()), 'Tỉnh trả NCC');
			const d = await dotCua(pt, kq.conTinh.id);
			expect(d?.status, 'Trả NCC xong không sinh đợt chờ NCC xác nhận').toBe('WAIT_CONFIRM');
			ok(await t.goi(pt, `/supplier-batches/${d.id}/confirm`), 'NCC tỉnh xác nhận');
			luu({ dotTinh: d.id });
		}
		const d = await dotCua(pt, kq.conTinh.id);
		ghiChu('đo', `đợt #${d?.id} ${d?.status} · ${d?.amount} đ · ${JSON.stringify(d?.dong)}`);
		expect(d?.status).toBe('CONFIRMED');
	});

	test('50_TT02_060 — Nhánh NCC tỉnh: nạp hoá đơn điều chỉnh giảm, chốt chứng từ', async ({ browser }) => {
		chan('50_TT02_060', 'dotTinh');
		await moPhien(browser);
		if (!kq.hdTinh) {
			const d = await dotCua(pt, kq.conTinh.id);
			const h = await hd.nap(pt, d.id, hd.xmlHd({ lines: hd.dongKhop(d) }));
			ghiChu('đối soát', `${h.reconcileStatus}`);
			expect(h.reconcileStatus, 'Hoá đơn dựng khớp đợt mà đối soát không KHỚP').toBe('KHOP');
			ok(await hd.goi(pt, 'POST', `${hd.CN}/${h.id}/settle`), 'Chốt chứng từ NCC tỉnh');
			luu({ hdTinh: h.id });
		}
		const h = await hd.chiTiet(pt, kq.hdTinh);
		ghiChu('đo', `hoá đơn #${kq.hdTinh} ${h?.settleStatus} ${h?.reconcileStatus}`);
		expect(h?.settleStatus).toBe('SETTLED');
	});

	test('50_TT02_070 — Nhánh TCT: tỉnh gửi phiếu con hàng TCT lên Tổng công ty', async ({ browser }) => {
		chan('50_TT02_070', 'conTct');
		await moPhien(browser);
		if (!kq.phieuTct) {
			const b = await t.goi(pt, `/${kq.conTct.id}/send-to-tct`);
			ghiChu('gửi TCT', `${b?.status?.code} ${b?.status?.message}`);
			ok(b, 'Tỉnh gửi TCT (lô TC có nguồn PO TCT — 14_2 050_001 từng bị BE chặn)');
			let p = null;
			await expect.poll(async () => {
				const ds = [...((await t.doc(pc, '', { page: 0, size: 50 }))?.data || []), ...((await t.doc(ps, '', { page: 0, size: 50 }))?.data || [])];
				p = ds.find((x) => Number(x.createFromId) === Number(kq.conTct.id)) || null;
				return Boolean(p);
			}, { timeout: 90_000, message: 'TCT không thấy phiếu sinh từ phiếu con hàng TCT' }).toBe(true);
			luu({ phieuTct: { id: p.id, code: p.code } });
		}
		ghiChu('đo', `phiếu TCT ${kq.phieuTct.code}`);
	});

	test('50_TT02_080 — Nhánh TCT: TCT duyệt, tách, trả NCC, NCC xác nhận', async ({ browser }) => {
		chan('50_TT02_080', 'phieuTct');
		await moPhien(browser);
		if (!kq.laTct) {
			ok(await t.goiDuyet(browser, 'tct', kq.phieuTct.id), 'TCT duyệt');
			const c = await t.tach(pc, kq.phieuTct.id);
			ghiChu('TCT tách', c.map((x) => `${x.code}/${x.status}/${x.supplierName}`).join(' · '));
			luu({ laTct: { id: c[0].id, code: c[0].code } });
		}
		if (!kq.dotTct) {
			ok(await t.xuLy(pc, kq.laTct.id, 'RETURN', SL()), 'TCT trả NCC');
			const d = await dotCua(pc, kq.laTct.id);
			expect(d?.status, 'TCT trả NCC xong không sinh đợt chờ NCC xác nhận').toBe('WAIT_CONFIRM');
			ok(await t.goi(pc, `/supplier-batches/${d.id}/confirm`), 'NCC TCT xác nhận');
			luu({ dotTct: d.id });
		}
		const d = await dotCua(pc, kq.laTct.id);
		ghiChu('đo', `đợt #${d?.id} ${d?.status} · ${d?.amount} đ`);
		expect(d?.status).toBe('CONFIRMED');
	});

	test('50_TT02_090 — Nhánh TCT: nạp hoá đơn điều chỉnh giảm, chốt chứng từ', async ({ browser }) => {
		chan('50_TT02_090', 'dotTct');
		await moPhien(browser);
		if (!kq.hdTct) {
			const d = await dotCua(pc, kq.laTct.id);
			const h = await hd.nap(pc, d.id, hd.xmlHd({ lines: hd.dongKhop(d) }));
			ghiChu('đối soát', `${h.reconcileStatus}`);
			expect(h.reconcileStatus).toBe('KHOP');
			ok(await hd.goi(pc, 'POST', `${hd.CN}/${h.id}/settle`), 'Chốt chứng từ NCC TCT');
			luu({ hdTct: h.id });
		}
		const h = await hd.chiTiet(pc, kq.hdTct);
		ghiChu('đo', `hoá đơn #${kq.hdTct} ${h?.settleStatus}`);
		expect(h?.settleStatus).toBe('SETTLED');
	});

	test('50_TT02_100 — Đối chiếu cuối: tồn điểm bán, công nợ NCC, trạng thái phiếu', async ({ browser }) => {
		chan('50_TT02_100', 'hdTinh');
		await moPhien(browser);
		const sl = SL();
		const ton = { [kq.pidTd]: await tt.tonKho(browser, 'shop', du().diemBan.shopId, kq.pidTd, ps), [kq.pidTc]: await tt.tonKho(browser, 'shop', du().diemBan.shopId, kq.pidTc, ps) };
		const sau = { tinh: await tt.congNoNcc(browser, td().supplierId, 'province', pt), tct: await tt.congNoNcc(browser, du().sanPhamNcc.supplierId, 'tct', pc) };
		const tra = (m) => Object.values(m || {}).reduce((s, r) => s + r.totalReturn, 0);
		const trangThai = async (p, x) => (x ? (await t.chiTietPhieu(p.page, p.st, x.id))?.request?.status : null);
		ghiChu('tồn điểm bán', `${JSON.stringify(kq.tonTruoc)} → ${JSON.stringify(ton)}`);
		ghiChu('công nợ NCC — trả hàng', `NCC tỉnh ${tra(kq.congNoTruoc?.tinh)} → ${tra(sau.tinh)} · NCC TCT ${tra(kq.congNoTruoc?.tct)} → ${tra(sau.tct)}`);
		ghiChu('trạng thái (chờ chốt kỳ vọng)', `gốc ${await trangThai(ps, kq.phieu)} · con tỉnh ${await trangThai(pt, kq.conTinh)} · con TCT ${await trangThai(pt, kq.conTct)} · TCT ${await trangThai(pc, kq.laTct)}`);
		for (const pid of [kq.pidTd, kq.pidTc]) expect.soft(kq.tonTruoc[pid] - ton[pid], `Tồn điểm bán SP ${pid} không giảm đúng ${sl} sau khi trả`).toBe(sl);
		expect.soft(tra(sau.tinh) - tra(kq.congNoTruoc?.tinh), 'Chốt chứng từ NCC tỉnh mà công nợ không ghi nhận trả hàng').toBeGreaterThan(0);
		if (kq.hdTct) expect.soft(tra(sau.tct) - tra(kq.congNoTruoc?.tct), 'Chốt chứng từ NCC TCT mà công nợ không ghi nhận trả hàng').toBeGreaterThan(0);
		luu({ xong: Boolean(kq.hdTct) });
	});
});
