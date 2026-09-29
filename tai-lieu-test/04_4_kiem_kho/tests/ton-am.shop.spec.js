'use strict';

/**
 * 04_4 — Kiểm kho / bán hàng khi tồn ÂM (FUNC_1_455/458/459/461), điểm bán seed của làn — GHI THẬT (28/09/2026).
 *
 * Tiền đề dựng ngay trong spec (tầng "dùng một lần, dọn được"):
 * - `shared/ban-am.js › bat` THÊM riêng điểm bán làn vào phạm vi "Bán tồn kho âm" (phạm vi theo điểm bán — không bật cho cả chuỗi),
 *   `khoiPhuc` trả phạm vi gốc ở afterAll.
 * - Hàng dùng: SP GIÁ TIÊU CHUẨN của làn (`AUTO<làn>_SP_TC`) — nhập tay được ở cấp điểm bán (SP khác "Chưa có bảng giá").
 *   Đầu lượt xuất hết tồn về 0 (lý do INTERNAL_USE), cuối lượt nhập/xuất trả về đúng tồn đầu (afterAll).
 * - Bán bằng POS vai `gdv` (phiên phụ, `18_1/tests/pos-18.js`); kiểm kho bằng vai `shop` (helper `kiem-kho-ghi.js`).
 *
 * 060_004/060_005 theo kỳ vọng MỚI (B21, user chốt 28/09): KHÔNG cho kiểm SP đang tồn âm — xem `thuKiemSpAm`.
 * (Cũ) Trace vnpost-web f9c5c858 `InventoryCheckSessionPage.jsx`: dòng SP KHÔNG còn lô (tồn âm) không có nút "Kiểm lô" — ô "SL cập nhật"
 * là `InputNumber min={0}` nhập tay, mặc định = tồn hệ thống (đo 28/09 làn 8: SP SX tồn -2 ⇒ ô hiện -2).
 *
 * Thứ tự (serial — case sau dùng tồn case trước để lại):
 *   070_002 (tồn 0 → bán 1 = -1) · 070_003 (bán thêm 3 = -4) · 060_004 (khai giảm thêm ⇒ bị chặn) · 070_005 (nhập bù 4 ⇒ 0) ·
 *   060_005 (bán 2 = -2 rồi kiểm = 3 ⇒ tồn 3).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const ka = require('../../shared/kho-api');
const banAm = require('../../shared/ban-am');
const kk = require('./kiem-kho-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const { d } = ka;
const tenTc = () => d().sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham;

/** Bán POS `sl` cái bằng phiên gdv; trả { orderNumber, phieu, dong } (dòng phiếu xuất bán: [price, qty, amount, pre, post, base, batch]). */
async function banPos(g, ten, sl) {
	const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
	await p.chanIn(g.page);
	await p.moBan(g.page, test);
	const r = await p.them(g.page, ten);
	expect(r?.dong, `POS không thêm được ${ten}: ${r?.thongBao}`).toBeTruthy();
	if (sl > 1) {
		const o = p.dongBill(g.page).filter({ hasText: ten }).first().locator('input').first();
		await o.fill(String(sl));
		await o.press('Enter');
		await g.page.waitForTimeout(1_200);
	}
	const kq = await p.thanhToanTienMat(g.page);
	expect(kq.orderId, `Thanh toán lỗi (bán âm đã bật cho điểm bán): ${JSON.stringify(kq.draft?.status)}`).toBeTruthy();
	let phieu = '';
	for (let i = 0; i < 15 && !phieu; i += 1) {
		phieu = ka.sql(`select stock_in_out_id from SHOP_STOCK_IN_OUT where shop_id=${d().diemBan.shopId} and type='EXPORT' and (order_id=${kq.orderId} or order_code='${kq.orderNumber}') order by 1 desc limit 1`);
		if (!phieu) await g.page.waitForTimeout(3_000); // xuất kho bán qua outbox Kafka
	}
	expect(phieu, `Không thấy phiếu xuất bán của đơn ${kq.orderNumber}`).toBeTruthy();
	return { orderNumber: kq.orderNumber, phieu: Number(phieu), dong: ka.dongPhieu(phieu) };
}

/** Dòng SP trong phiếu kiểm (thêm nếu chưa có). */
async function dongTc(page, ten = tenTc()) {
	const d0 = page.locator('tr[data-row-key]').filter({ hasText: ten }).first();
	if (!(await d0.count())) {
		await page.getByPlaceholder(/Tìm sản phẩm|Tên SP|Tìm kiếm sản phẩm/).first().fill(ten);
		await page.getByText(ten, { exact: true }).last().click();
	}
	await expect(d0).toBeVisible({ timeout: 20_000 });
	return d0;
}

/** Σ tồn còn lại các lô của SP (SELECT). */
const tonLo = () => Number(ka.sql(`select coalesce(sum(remain_quantity),0) from STOCK_BATCH_PRODUCTS where shop_id=${d().diemBan.shopId} and variant_id=${X.variantId} and coalesce(deleted,0)=0`));

/**
 * Xuất hết TỒN (SHOP_STOCK) về 0, lô cũ trước. 🔴 Lấy theo tồn tổng, 🚫 theo remain lô: sau bù âm lô có thể DƯ so với tồn
 * (đo 28/09 — xem 070_005) và BE chặn "Tổng số lượng xuất từ các lô … không khớp với số lượng trong phiếu".
 */
async function xuatVe0(g, muc = 0) {
	let con = ka.tonSo(X) - muc;
	for (const l of (await ka.loCua(g, X)).filter((z) => Number(z.remainQuantity) > 0)) {
		if (con <= 0) break;
		const sl = Math.min(con, Number(l.remainQuantity));
		const r = await ka.xuat(g, X, { sl, lo: l.batchCode });
		expect(String(r.xacNhan?.code), `Xuất tồn lỗi: ${JSON.stringify(r.tao)} ${JSON.stringify(r.xacNhan)}`).toBe('200');
		con -= sl;
	}
	await expect.poll(() => ka.tonSo(X), { timeout: 30_000 }).toBe(muc);
}

/**
 * B21 (user chốt 28/09/2026): KHÔNG cho kiểm SP đang tồn âm. Trace vnpost-pod-service (bản sửa 28/09, CHƯA commit lúc viết)
 * `StockV2Service › assertInventoryCheckNotNegative` + `StockCheckNegativeStockGuard`: thêm dòng vào phiếu kiểm ⇒
 * "Sản phẩm đang tồn âm, vui lòng nhập bù trước khi kiểm kho: <tên> (<SL>)". Thử thêm `ten` vào phiếu kiểm của tôi, đo request
 * items + thông báo + dòng có vào phiếu không; huỷ phiên ở finally (🚫 chốt).
 */
async function thuKiemSpAm(page, ten, sx) {
	const st = ka.k.batHeader(page);
	const { sessionId } = await kk.vaoPhieuCuaToi(page, 'shop');
	const truoc = ka.tonSo(sx);
	const gui = [];
	const nghe = (r) => { if (/inventory-check\/\d+\/items/.test(r.url()) && r.request().method() !== 'GET') gui.push(r); };
	page.on('response', nghe);
	try {
		await page.getByPlaceholder(/Tìm sản phẩm|Tên SP|Tìm kiếm sản phẩm/).first().fill(ten);
		await page.getByText(ten, { exact: true }).last().click();
		await page.waitForTimeout(3_000);
		const tb = (await page.locator('.ant-message-notice, .ant-notification-notice, .ant-modal-confirm').allInnerTexts()).map((x) => x.normalize('NFC').replace(/\s+/g, ' ').trim()).join(' | ');
		const bodies = await Promise.all(gui.map((r) => r.json().catch(() => null)));
		const vaoPhieu = await page.locator('tr[data-row-key]').filter({ hasText: ten }).count();
		return { truoc, sau: ka.tonSo(sx), tb, bodies: bodies.map((b) => b?.status), vaoPhieu };
	} finally {
		page.off('response', nghe);
		await kk.huyPhien(page, st, d().diemBan.shopId, sessionId);
	}
}
function kiemChan(r, ten) {
	test.info().annotations.push({ type: 'đo', description: `${ten} tồn ${r.truoc} · thêm vào phiếu kiểm ⇒ request items ${JSON.stringify(r.bodies)} · thông báo "${r.tb}" · dòng vào phiếu ${r.vaoPhieu} · tồn sau ${r.sau}` });
	const chu = [r.tb, ...r.bodies.map((b) => b?.message || '')].join(' | ');
	expect(chu, '🔴 Thêm SP đang tồn âm vào phiếu kiểm KHÔNG bị chặn bằng thông báo "đang tồn âm, vui lòng nhập bù"').toMatch(/đang tồn âm, vui lòng nhập bù trước khi kiểm kho/);
	expect(r.vaoPhieu, '🔴 SP tồn âm vẫn vào phiếu kiểm').toBe(0);
	expect(r.sau, 'Tồn đổi dù bị chặn').toBe(r.truoc);
}

let X = null;
let TON0 = null;

test.describe('04_4 — Tồn âm', () => {
	test.describe.configure({ timeout: 300_000 }); // 🚫 serial: 070_005 đỏ (lỗi SP) không được chặn 060_005

	test.beforeAll(async ({ browser }) => {
		test.setTimeout(180_000);
		X = ka.donVi(ka.SP.TC());
		TON0 = ka.tonSo(X);
		await banAm.bat(browser, d().diemBan.maShop);
	});

	test.afterAll(async ({ browser }) => {
		test.setTimeout(240_000);
		try {
			const g = await ka.moGdv(browser, 'gdv');
			try {
				const ton = ka.tonSo(X);
				if (ton < TON0) await ka.nhap(g, X, { sl: TON0 - ton, gia: 60_000, ghiChu: 'AUTO test 04_4 ton am tra ton' });
				else if (ton > TON0) await xuatVe0(g, TON0);
			} finally { await g.dong(); }
		} finally { await banAm.khoiPhuc(browser); }
	});

	test('04_4_070_002 — Bán hàng khi tồn kho bằng 0', async ({ browser }) => {
		chanNeuTat('04_4_070_002');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			await xuatVe0(g);
			await expect.poll(() => ka.tonSo(X), { timeout: 30_000 }).toBe(0);
			const b = await banPos(g, tenTc(), 1);
			await expect.poll(() => ka.tonSo(X), { timeout: 60_000, intervals: [3_000] }).toBe(-1);
			ghiDo(`cấu hình: bán âm BẬT cho điểm bán ${d().diemBan.maShop} · tồn 0 → bán 1 (đơn ${b.orderNumber}) ⇒ tồn ${ka.tonSo(X)} · dòng phiếu xuất: giá ${b.dong[0]} base ${b.dong[5]} pre ${b.dong[3]} post ${b.dong[4]}`);
		} finally { await g.dong(); }
	});

	test('04_4_070_003 — Bán hàng khi tồn kho đang âm', async ({ browser }) => {
		chanNeuTat('04_4_070_003');
		const truoc = ka.tonSo(X);
		test.skip(!(truoc < 0), `Tiền đề hỏng: tồn ${truoc} không âm (070_002 chưa chạy/đạt)`);
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const b = await banPos(g, tenTc(), 3);
			await expect.poll(() => ka.tonSo(X), { timeout: 60_000, intervals: [3_000] }).toBe(truoc - 3);
			ghiDo(`tồn ${truoc} → bán 3 (đơn ${b.orderNumber}) ⇒ tồn ${ka.tonSo(X)} · 🔴 giá vốn ghi trên phiếu xuất khi không còn lô: price ${b.dong[0]} · base_price ${b.dong[5]} · giá TC ${d().sanPham.sanPhamTheoGiaVon.tieuChuan.giaTieuChuan} · batch ${b.dong[6]}`);
		} finally { await g.dong(); }
	});

	test('04_4_060_004 — Kiểm kho GIẢM khi tồn đang âm', async ({ page }) => {
		chanNeuTat('04_4_060_004');
		const truoc = ka.tonSo(X);
		test.skip(!(truoc < 0), `Tiền đề hỏng: tồn ${truoc} không âm`);
		kiemChan(await thuKiemSpAm(page, tenTc(), X), tenTc());
	});

	test('04_4_070_005 — Nhập kho bù sau khi bán âm', async ({ browser }) => {
		chanNeuTat('04_4_070_005');
		const truoc = ka.tonSo(X);
		test.skip(!(truoc < 0), `Tiền đề hỏng: tồn ${truoc} không âm`);
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const p0 = ka.giaBq(X);
			const id = await ka.nhap(g, X, { sl: -truoc, gia: 60_000, ghiChu: 'AUTO test 04_4_070_005 nhap bu' });
			await expect.poll(() => ka.tonSo(X), { timeout: 30_000 }).toBe(0);
			const lo = tonLo();
			const dn = ka.dongPhieu(id);
			const bu = ka.sql(`select count(*), coalesce(sum(remain_quantity),0), group_concat(status) from SHOP_NEGATIVE_STOCK_BALANCE where shop_id=${d().diemBan.shopId} and variant_id=${X.variantId}`);
			ghiDo(`tồn ${truoc} → nhập ${-truoc} (phiếu ${id}, giá 60.000) ⇒ tồn ${ka.tonSo(X)} · giá BQ ${p0} → ${ka.giaBq(X)} · dòng nhập pre ${dn[3]} post ${dn[4]} · SHOP_NEGATIVE_STOCK_BALANCE [số dòng, còn âm, trạng thái] = ${bu} · Σ tồn lô ${lo} · 🔴 giá vốn sau bù âm: đối chiếu tay`);
			// "Bù âm trước, phần dư mới thành tồn dương" ⇒ lô vừa nhập cũng phải bị trừ phần bù (tồn lô = tồn = 0).
			expect.soft(lo, `🔴 Nhập bù ${-truoc} khi tồn ${truoc}: tồn về 0 nhưng Σ tồn lô = ${lo} — lô KHÔNG bị trừ phần bù âm, lô dư so với tồn`).toBe(0);
		} finally { await g.dong(); }
	});

	test('04_4_060_005 — Kiểm kho TĂNG khi tồn đang âm', async ({ page, browser }) => {
		chanNeuTat('04_4_060_005');
		// Kỳ vọng mới (B21): kể cả khai TĂNG cũng bị chặn — SP tồn âm không được đưa vào phiếu kiểm. Đưa SP TC về âm (-2) bằng bán POS.
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const t = ka.tonSo(X);
			if (t >= 0) await banPos(g, tenTc(), t + 2);
			await expect.poll(() => ka.tonSo(X), { timeout: 60_000, intervals: [3_000] }).toBeLessThan(0);
		} finally { await g.dong(); }
		kiemChan(await thuKiemSpAm(page, tenTc(), X), tenTc());
	});
});
