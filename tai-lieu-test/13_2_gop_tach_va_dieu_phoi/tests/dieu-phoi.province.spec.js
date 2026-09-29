'use strict';

/**
 * 13_2 · 040 — ĐIỀU PHỐI HÀNG theo phiếu đề xuất (bổ sung 28/09/2026 theo yêu cầu user):
 *   tỉnh tạo phiếu chuyển kho TỪ phiếu đề xuất về điểm bán → không tạo lần hai → điểm bán nhận hàng.
 * Tiền đề (dựng trong spec, đúng quy trình): CHT đề xuất → xã duyệt → tỉnh gửi TCT → TCT PO giao thẳng HUB tỉnh
 *   → NCC xác nhận → tỉnh xác nhận giao thẳng (`dieu-phoi-ghi.dungPhieuCoHangTaiHub`). ~6 phút/lượt, ghi dữ liệu thật.
 * Tiến độ: `test-output/tien-de-13_2-040.json` — chuỗi đã nhận xong thì lượt sau dựng chuỗi mới.
 * 🔴 Cần HUB tỉnh (case 04_5_020_016) + bảng giá mua phạm vi TCT/tỉnh (seed 13).
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dp = require('./dieu-phoi-ghi');

const GOC = path.join(__dirname, '..');
const TEP = path.join(GOC, 'test-output', 'tien-de-13_2-040.json');
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const chan = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
	return loadCaseInput(GOC, id);
};
/** Tồn SP tại điểm bán seed (API, phiên CHT). */
async function tonDiemBan(browser, productId) {
	const ps = await k.moPhienPhu(browser, 'shop', '/inventory/transfer-warehouse');
	try {
		const shopId = seed.doc().duLieu.diemBan.shopId;
		const lo = (await k.goiApi(ps.page, ps.st, '/stock/v2/batch-product', { shopId, productId, size: 500 })).data || [];
		return lo.reduce((s, l) => s + Number(l.remainQuantity || 0), 0);
	} finally { await ps.dong(); }
}

test.describe.serial('13_2 · 040 Điều phối hàng theo phiếu đề xuất', () => {
	const D = { kq: null, chuyen: null, tonTruoc: null, pid: null };
	const sp = () => seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan;

	test('tien de 13_2_040 — phiếu đề xuất có hàng tại HUB tỉnh (đề xuất → xã duyệt → TCT giao thẳng)', async ({ browser }) => {
		test.setTimeout(20 * 60_000);
		let kq = {};
		try { kq = JSON.parse(fs.readFileSync(TEP, 'utf8')); } catch { /* chưa có */ }
		if (kq.maChuyen) kq = {}; // chuỗi cũ đã được điều phối ⇒ dựng chuỗi mới
		const luu = (x) => { Object.assign(kq, x); fs.mkdirSync(path.dirname(TEP), { recursive: true }); fs.writeFileSync(TEP, JSON.stringify(kq, null, 2)); };
		const sl = Number(loadCaseInput(GOC, '13_2_040_001').data?.soLuong || 2);
		await dp.dungPhieuCoHangTaiHub(browser, { sps: [sp().tenSanPham], sl, kq, luu });
		ghiChu('chuỗi', `phiếu gốc ${kq.maGoc} · TCT ${kq.maTct} · PO ${kq.maPO}`);
		const tinh = await k.moPhienPhu(browser, 'province', '/inventory/purchase-request');
		try { D.pid = (await dp.chiTietPhieu(tinh, kq.maGoc))?.items?.[0]?.productId; } finally { await tinh.dong(); }
		expect(D.pid, 'Không đọc được productId của phiếu đề xuất').toBeTruthy();
		D.kq = kq;
	});

	test('13_2_040_001 — Tỉnh tạo phiếu chuyển kho về điểm bán theo phiếu đề xuất', async ({ page, browser }) => {
		chan('13_2_040_001');
		test.skip(!D.kq?.hubNhan, 'Tiền đề chưa có hàng tại HUB tỉnh.');
		test.setTimeout(5 * 60_000);
		const st = k.batHeader(page);
		D.tonTruoc = await tonDiemBan(browser, D.pid);
		const c = await dp.taoChuyenTuDeXuat(page, D.kq.maGoc);
		// Ghi mã phiếu chuyển NGAY khi tạo được: case 040_002/003 dựa vào nó, lượt sau cũng không tạo lại trên chuỗi cũ.
		if (/Tạo phiếu chuyển kho thành công/.test(c.tb) && c.body?.code) {
			D.chuyen = c.body.code;
			Object.assign(D.kq, { maChuyen: D.chuyen });
			fs.writeFileSync(TEP, JSON.stringify(D.kq, null, 2));
		}
		const sau = await dp.chiTietPhieu({ page, st }, D.kq.maGoc);
		ghiChu('drawer', `kho chuyển "${c.khoChuyen}" · kho nhận "${c.khoNhan}" · xuất ngay ${c.xuatNgay} · SL ${JSON.stringify(c.soLuong)} · dòng ${JSON.stringify(c.dongSp).slice(0, 300)}`);
		ghiChu('kết quả', `${c.tb} · phiếu ${c.body?.code} · đề xuất sau: ${sau?.status} stockInOutId ${sau?.stockInOutId}`);
		expect.soft(c.dongSp.length, 'Drawer không điền đúng số dòng SP của phiếu đề xuất').toBe(1);
		expect.soft(c.dongSp[0], 'Drawer không điền đúng SP của phiếu').toContain(sp().tenSanPham);
		expect.soft(c.soLuong.map(Number), 'Số lượng chuyển không bằng số lượng đã duyệt').toContain(D.kq.sl);
		expect.soft(c.khoChuyen, 'Kho chuyển không phải HUB tỉnh').toContain(seed.doc().duLieu.hubTinh.tenShop);
		expect.soft(c.khoNhan, 'Kho nhận không phải điểm bán lập phiếu').toContain(seed.doc().duLieu.diemBan.tenShop);
		expect.soft(c.xuatNgay, '"Xuất kho ngay" không bật sẵn').toBe(true);
		expect(c.tb).toContain('Tạo phiếu chuyển kho thành công');
		expect(sau?.stockInOutId, 'Phiếu đề xuất không được gắn với phiếu chuyển kho vừa tạo').toBeTruthy();
	});

	test('13_2_040_002 — Phiếu đề xuất đã có phiếu chuyển kho thì không tạo thêm được', async ({ page }) => {
		chan('13_2_040_002');
		test.skip(!D.chuyen, '040_001 chưa tạo được phiếu chuyển kho.');
		const r = await dp.moLaiKiemTraTon(page, D.kq.maGoc);
		ghiChu('đo', JSON.stringify(r));
		// Đo 28/09: phiếu sang TRANSFERRED ⇒ FE ẨN hẳn nút "Kiểm tra tồn kho" (canCheckInventory) — cũng là chặn.
		//    Nếu nút còn thì "Tạo phiếu chuyển kho" phải khoá kèm lý do.
		if (r.coNutKiemTra) {
			expect(r.nutBat, 'Vẫn bấm được "Tạo phiếu chuyển kho" lần hai').toBe(false);
			expect(r.lyDo).toContain('Phiếu đề xuất này đã có phiếu chuyển kho, không tạo thêm được.');
		}
	});

	test('13_2_040_003 — Điểm bán xác nhận nhận hàng theo phiếu chuyển từ phiếu đề xuất', async ({ browser }) => {
		chan('13_2_040_003');
		test.skip(!D.chuyen, '040_001 chưa tạo được phiếu chuyển kho.');
		test.setTimeout(5 * 60_000);
		const n = await dp.nhanTaiDiemBan(browser, D.chuyen);
		const tonSau = await tonDiemBan(browser, D.pid);
		ghiChu('đo', `nhận ${JSON.stringify(n.res?.status)} · tồn ${D.tonTruoc} → ${tonSau}`);
		expect(String(n.res?.status?.code), `Điểm bán nhận hàng lỗi: ${n.res?.status?.message}`).toBe('200');
		expect(tonSau - D.tonTruoc, 'Tồn điểm bán không tăng đúng số lượng của phiếu').toBe(D.kq.sl);
	});
});
