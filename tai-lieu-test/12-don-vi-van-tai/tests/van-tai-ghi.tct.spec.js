'use strict';

/**
 * 12 — Đơn vị vận tải: truy cập theo vai, đơn vận chuyển, bồi thường, thanh toán / thu hồi, nhân viên vận chuyển — GHI THẬT (26/09/2026).
 *
 * Nguồn vnpost-web `features/delivery/{pages,components,services}`:
 * - Đơn vị `GET/POST/PUT /delivery-units`, nhân viên `…/delivery-staffs` (DELETE được), đơn `…/delivery-orders` (+ `/{id}/delivery-status`),
 *   bồi thường `POST /delivery-orders/deductions` {deliveryUnitId, deliveryOrderId, deliveryOrderCode, transferId, transferCode, amount, reason},
 *   thanh toán nợ `POST /delivery-orders/debts/pay` {deliveryUnitId, totalAmount, paymentMethod, items[{deliveryOrderId, amount}]},
 *   thu hồi `POST /delivery-orders/debts/recover`, lịch sử `GET /delivery-orders/debts/history`.
 * - Đơn vận chuyển tạo từ chi tiết phiếu chuyển kho (DrawerDeliveryOrderCreate: sourceType STOCK_TRANSFER, deliveryStatus WAITING).
 * Tiền đề tự dựng: đơn vị vận chuyển `AUTO<làn>_DVVC_*` (không xoá được — BE không có API xoá, để lại rác có tiền tố), phiếu chuyển kho
 * điểm bán seed → điểm bán rác `diemBanNhan` (vai tct), đơn vận chuyển gắn phiếu đó. Phiếu chuyển dọn bằng từ chối + nhập lại kho.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const { chon } = require('../../shared/db/otp');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const hau = () => Date.now().toString().slice(-7);
const d = () => seed.doc().duLieu;
const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);
const BASE = () => process.env.VNPOST_BASE_URL;

async function phien(page, route = '/delivery/units', vai = 'tct') {
	const st = k.batHeader(page);
	await moTrang(page, `${BASE()}${route}`, vai);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	await page.waitForTimeout(2_000);
	return { st, goi: (m, u, q, b) => k.goiGhi(page, st, m, u, q, b), shopId: Number(st.h.shopid) };
}
async function taoDonVi(m, ten = 'DVVC') {
	const code = `A${process.env.VNPOST_LANE || ''}VC${hau()}`;
	const r = await m.goi('POST', '/delivery-units', {}, { name: `${seed.PREFIX}${ten}_${hau()}`, code, type: 'EXTERNAL', status: 'ACTIVE' });
	expect(String(r?.status?.code), `Tạo đơn vị vận chuyển lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
	return r.data;
}
/** Phiếu chuyển kho điểm bán seed → điểm bán rác (1 SP TC), vai tct; trả { id, code }. */
async function taoPhieuChuyen(page, m) {
	const tu = d().diemBan.shopId;
	const den = d().diemBanNhan;
	const tc = d().sanPham.sanPhamTheoGiaVon.tieuChuan;
	const [productUnitId, productId, variantId] = chon(`select product_unit_id, product_id, variant_id from CHAIN_PRODUCT_UNIT where sku='${tc.sku}' and variant_id is not null and convert_to_main_unit=1 limit 1`, 'VNPOST_CORE').split('\t').map(Number);
	const lo = (await k.loKhaDung(page, m.st, tu, productId, variantId))[0];
	expect(lo, 'Điểm bán seed không còn lô TC khả dụng').toBeTruthy();
	const khoTu = ((await m.goi('GET', `/shops/${tu}/inventory`))?.data || []).find((x) => x.isDefault)?.id;
	const code = `A${process.env.VNPOST_LANE || ''}VT${hau()}`;
	const r = await m.goi('POST', '/stock/v2/transfer/v2', { shopId: tu }, {
		fromInventoryId: khoTu, fromShopId: tu, imageIds: [], code, toInventoryId: den.inventoryId, toShopId: den.shopId, note: 'AUTO TEST 12 vận tải', reason: '',
		discountAmount: 0, actionTime: null, exportImmediately: false,
		items: [{ fromProductId: productId, fromVariantId: variantId, fromProductUnitId: productUnitId, quantity: 1, price: lo.gia, serials: [], batchProducts: [{ batchCode: lo.ma, quantity: 1 }] }],
	});
	expect(String(r?.status?.code), `Tạo phiếu chuyển lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
	return { id: r?.data?.stockTransferId, code, tu, den: den.shopId };
}
async function taoDon(m, dv, pc, amount = 50_000) {
	const code = `A${process.env.VNPOST_LANE || ''}VD${hau()}`;
	const r = await m.goi('POST', '/delivery-orders', {}, { code, transferCode: pc.code, transferId: pc.id, deliveryUnitId: dv.id, amount, vehiclePlate: '29A-00000', sourceType: 'STOCK_TRANSFER', deliveryStatus: 'WAITING', fromShopId: pc.tu, toShopId: pc.den });
	expect(String(r?.status?.code), `Tạo đơn vận chuyển lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
	return { ...(r.data || {}), code };
}
async function donPhieu(page, m, pc) { if (pc?.id) await k.donPhieuChuyen(page, m.st, pc.tu, pc.id).catch(() => null); }
const donTheoMa = async (m, code) => ds((await m.goi('GET', '/delivery-orders', { keyword: code, page: 0, size: 20 }))?.data).find((x) => x.code === code);
const noDv = async (m, dv) => ds((await m.goi('GET', '/delivery-units', { keyword: dv.code, page: 0, size: 5 }))?.data).find((x) => x.id === dv.id);
const lichSu = async (m, dv, loai) => ds((await m.goi('GET', '/delivery-orders/debts/history', { deliveryUnitId: dv.id, type: loai, page: 0, size: 50 }))?.data);

test.describe('12 — Đơn vị vận tải (GHI)', () => {
	test.describe.configure({ timeout: 300_000 });

	// ─── Truy cập theo vai ─────────────────────────────────────────────────────────────
	async function kiemTruyCap(page, vai, route, api) {
		const cho = page.waitForResponse((r) => r.url().includes(api) && r.request().method() === 'GET', { timeout: 60_000 }).catch(() => null);
		await moTrang(page, `${BASE()}${route}`, vai);
		const r = await cho;
		const body = r ? await r.json().catch(() => null) : null;
		await page.waitForTimeout(2_000);
		const n = await khung(page).locator('.ant-table-tbody tr.ant-table-row').count();
		ghiDo(`${vai} ${route}: API ${r?.status()} ${body?.status?.code} · ${ds(body?.data).length} bản ghi · ${n} dòng`);
		expect(r?.status(), `Vai ${vai} không gọi được ${api}`).toBe(200);
		expect(String(body?.status?.code)).toBe('200');
	}
	test('Vantai_1 — Kiểm tra truy cập đơn vị vận chuyển role cấp tổng công ty', async ({ page }) => { chanNeuTat('Vantai_1'); await kiemTruyCap(page, 'tct', '/delivery/units', '/delivery-units'); });
	test('Vantai_2 — Kiểm tra truy cập đơn vận chuyển role cấp tổng công ty', async ({ page }) => { chanNeuTat('Vantai_2'); await kiemTruyCap(page, 'tct', '/delivery/orders', '/delivery-orders'); });
	test('Vantai_3 — Kiểm tra truy cập nhân viên vận chuyển role cấp tổng công ty', async ({ page }) => { chanNeuTat('Vantai_3'); await kiemTruyCap(page, 'tct', '/delivery/staffs', '/delivery-staffs'); });
	test('Vantai_4 — Kiểm tra truy cập đơn vị vận chuyển role cấp tỉnh', async ({ page }) => { chanNeuTat('Vantai_4'); await kiemTruyCap(page, 'province', '/delivery/units', '/delivery-units'); });
	test('Vantai_5 — Kiểm tra truy cập đơn vận chuyển role cấp tỉnh', async ({ page }) => { chanNeuTat('Vantai_5'); await kiemTruyCap(page, 'province', '/delivery/orders', '/delivery-orders'); });
	test('Vantai_6 — Kiểm tra truy cập nhân viên vận chuyển role cấp tỉnh', async ({ page }) => { chanNeuTat('Vantai_6'); await kiemTruyCap(page, 'province', '/delivery/staffs', '/delivery-staffs'); });
	test('Vantai_7 — Kiểm tra truy cập đơn vị vận chuyển role cấp điểm bán/kho', async ({ page }) => { chanNeuTat('Vantai_7'); await kiemTruyCap(page, 'shop', '/delivery/units', '/delivery-units'); });
	test('Vantai_8 — Kiểm tra truy cập đơn vận chuyển role cấp điểm bán/kho', async ({ page }) => { chanNeuTat('Vantai_8'); await kiemTruyCap(page, 'shop', '/delivery/orders', '/delivery-orders'); });
	test('Vantai_9 — Kiểm tra truy cập nhân viên vận chuyển role cấp điểm bán/kho', async ({ page }) => { chanNeuTat('Vantai_9'); await kiemTruyCap(page, 'shop', '/delivery/staffs', '/delivery-staffs'); });

	test('Vantai_70 — Kiểm tra các thao tác trên ở role quản lý tỉnh', async ({ page }) => {
		chanNeuTat('Vantai_70');
		await moTrang(page, `${BASE()}/delivery/units`, 'province');
		await page.waitForTimeout(3_000);
		const nut = (await khung(page).getByRole('button').allInnerTexts()).map(chuan).filter(Boolean);
		ghiDo(`vai tỉnh — nút trên màn Đơn vị vận chuyển: ${nut.join(' | ')}`);
		expect(nut.some((t) => /Thêm mới/.test(t)), 'Vai tỉnh không có thao tác Thêm mới đơn vị vận chuyển').toBe(true);
	});

	// ─── Đơn vận chuyển ────────────────────────────────────────────────────────────────
	async function kiemSinhDon(page, id) {
		const m = await phien(page, '/delivery/orders');
		let pc = null;
		try {
			pc = await taoPhieuChuyen(page, m);
			await page.waitForTimeout(5_000);
			const sinh = ds((await m.goi('GET', '/delivery-orders', { keyword: pc.code, page: 0, size: 20 }))?.data).filter((x) => x.transferCode === pc.code || x.transferId === pc.id);
			ghiDo(`phiếu chuyển ${pc.code}: đơn vận chuyển tự sinh ${sinh.length} (đơn vận chuyển tạo TAY từ chi tiết phiếu — DrawerDeliveryOrderCreate) · case ${id}`);
			expect(sinh.length, '🔴 Lập/xuất phiếu chuyển kho không tự sinh đơn vận chuyển').toBeGreaterThan(0);
		} finally { await donPhieu(page, m, pc); }
	}
	test('Vantai_21 — Kiểm tra sinh đơn vận chuyển khi TCT chuyển kho xuống tỉnh', async ({ page }) => { chanNeuTat('Vantai_21'); await kiemSinhDon(page, 'Vantai_21'); });
	test('Vantai_22 — Kiểm tra sinh đơn vận chuyển khi tỉnh chuyển kho xuống điểm bán', async ({ page }) => { chanNeuTat('Vantai_22'); await kiemSinhDon(page, 'Vantai_22'); });

	test('Vantai_26 — Kiểm tra tìm kiếm đơn vận chuyển theo mã vận đơn', async ({ page }) => {
		chanNeuTat('Vantai_26');
		const m = await phien(page, '/delivery/orders');
		let pc = null;
		try {
			const dv = await taoDonVi(m);
			pc = await taoPhieuChuyen(page, m);
			const don = await taoDon(m, dv, pc);
			await page.reload();
			await page.waitForTimeout(2_500);
			const o = khung(page).getByPlaceholder(/Tìm|mã vận đơn/i).first();
			await o.fill(don.code);
			await o.press('Enter');
			await page.waitForTimeout(2_500);
			const dong = (await khung(page).locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map(chuan);
			ghiDo(`tìm ${don.code}: ${JSON.stringify(dong)}`);
			expect(dong.length).toBe(1);
			expect(dong[0]).toContain(don.code);
		} finally { await donPhieu(page, m, pc); }
	});

	async function kiemLoc(page, nhanLoc, giaTri) {
		await phien(page, '/delivery/orders');
		const o = khung(page).locator('.ant-select').filter({ hasText: nhanLoc }).first();
		await o.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: giaTri }).first().click();
		await page.waitForTimeout(3_000);
		const dong = (await khung(page).locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map(chuan);
		ghiDo(`lọc ${nhanLoc}=${giaTri}: ${dong.length} dòng · ${dong.slice(0, 3).join(' | ')}`);
		expect(dong.every((x) => x.includes(giaTri)), `Còn dòng không mang "${giaTri}"`).toBe(true);
	}
	test('Vantai_27 — Kiểm tra lọc theo trạng thái vận chuyển', async ({ page }) => { chanNeuTat('Vantai_27'); await kiemLoc(page, /Trạng thái vận chuyển|Trạng thái giao/, 'Đang chờ'); });
	test('Vantai_28 — Kiểm tra lọc theo trạng thái thanh toán', async ({ page }) => { chanNeuTat('Vantai_28'); await kiemLoc(page, /thanh toán/i, 'Chưa thanh toán'); });

	test('12-don-vi-van-tai_070_012 — Kiểm tra chuyển trạng thái của đơn vận chuyển', async ({ page }) => {
		chanNeuTat('12-don-vi-van-tai_070_012');
		const m = await phien(page, '/delivery/orders');
		let pc = null;
		try {
			const dv = await taoDonVi(m);
			pc = await taoPhieuChuyen(page, m);
			const don = await taoDon(m, dv, pc);
			const r1 = await m.goi('PUT', `/delivery-orders/${don.id}/delivery-status`, { deliveryStatus: 'SHIPPING' }, { deliveryStatus: 'SHIPPING' });
			const s1 = (await donTheoMa(m, don.code))?.deliveryStatus;
			const r2 = await m.goi('PUT', `/delivery-orders/${don.id}/delivery-status`, { deliveryStatus: 'DELIVERED' }, { deliveryStatus: 'DELIVERED' });
			const s2 = (await donTheoMa(m, don.code))?.deliveryStatus;
			ghiDo(`WAITING → SHIPPING ${JSON.stringify(r1?.status)} ⇒ ${s1} · → DELIVERED ${JSON.stringify(r2?.status)} ⇒ ${s2}`);
			expect(s1).toBe('SHIPPING');
			expect(s2).toBe('DELIVERED');
		} finally { await donPhieu(page, m, pc); }
	});

	// ─── Bồi thường / thanh toán / thu hồi ────────────────────────────────────────────
	async function dungDonCoNo(page, amount = 50_000) {
		const m = await phien(page, '/delivery/units');
		const dv = await taoDonVi(m);
		const pc = await taoPhieuChuyen(page, m);
		const don = await taoDon(m, dv, pc, amount);
		return { m, dv, pc, don };
	}
	const boiThuong = (m, don, amount, reason = 'AUTO TEST bồi thường') => m.goi('POST', '/delivery-orders/deductions', {}, { deliveryUnitId: don.deliveryUnitId, deliveryOrderId: don.id, deliveryOrderCode: don.code, transferId: don.transferId, transferCode: don.transferCode, amount, reason });
	const traNo = (m, dv, don, amount, paymentMethod = 'CASH') => m.goi('POST', '/delivery-orders/debts/pay', {}, { deliveryUnitId: dv.id, totalAmount: amount, paymentMethod, note: 'AUTO TEST', items: [{ deliveryOrderId: don.id, amount }] });

	test('Vantai_17 — Kiểm tra không cho thanh toán vượt quá công nợ vận chuyển', async ({ page }) => {
		chanNeuTat('Vantai_17');
		const x = await dungDonCoNo(page, 10_000);
		try {
			const r = await traNo(x.m, x.dv, x.don, 25_000);
			const sau = await donTheoMa(x.m, x.don.code);
			ghiDo(`trả 25.000 cho đơn 10.000: ${JSON.stringify(r?.status)} · còn nợ đơn ${sau?.remainAmount}`);
			expect(String(r?.status?.code), '🔴 Trả vượt công nợ vận chuyển vẫn được').not.toBe('200');
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_18 — Kiểm tra số tiền bồi thường không làm thay đổi số tiền đơn vận chuyển', async ({ page }) => {
		chanNeuTat('Vantai_18');
		const x = await dungDonCoNo(page, 50_000);
		try {
			const r = await boiThuong(x.m, x.don, 100_000);
			const sau = await donTheoMa(x.m, x.don.code);
			ghiDo(`bồi thường 100.000: ${JSON.stringify(r?.status)} · tiền đơn ${sau?.amount}`);
			expect(String(r?.status?.code)).toBe('200');
			expect(Number(sau?.amount)).toBe(50_000);
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_19 — Kiểm tra số tiền bồi thường không ảnh hưởng công nợ vận chuyển', async ({ page }) => {
		chanNeuTat('Vantai_19');
		const x = await dungDonCoNo(page, 50_000);
		try {
			const truoc = await donTheoMa(x.m, x.don.code);
			await boiThuong(x.m, x.don, 30_000);
			const sau = await donTheoMa(x.m, x.don.code);
			ghiDo(`còn nợ đơn trước ${truoc?.remainAmount} ⇒ sau bồi thường ${sau?.remainAmount}`);
			expect(Number(sau?.remainAmount)).toBe(Number(truoc?.remainAmount));
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_20 — Kiểm tra số tiền thanh toán chỉ ghi nhận cho phí ship', async ({ page }) => {
		chanNeuTat('Vantai_20');
		const x = await dungDonCoNo(page, 50_000);
		try {
			await boiThuong(x.m, x.don, 20_000);
			const bt = ds((await x.m.goi('GET', '/delivery-orders/debts/units/' + x.dv.id + '/unrecovered-deductions'))?.data);
			const r = await traNo(x.m, x.dv, x.don, 50_000);
			const bt2 = ds((await x.m.goi('GET', '/delivery-orders/debts/units/' + x.dv.id + '/unrecovered-deductions'))?.data);
			const sau = await donTheoMa(x.m, x.don.code);
			const tongBt = (a) => a.reduce((s, z) => s + Number(z.remainAmount ?? z.amount ?? 0), 0);
			ghiDo(`trả 50.000: ${JSON.stringify(r?.status)} · nợ đơn còn ${sau?.remainAmount} · bồi thường chưa thu ${tongBt(bt)} ⇒ ${tongBt(bt2)}`);
			expect(Number(sau?.remainAmount)).toBe(0);
			expect(tongBt(bt2), 'Thanh toán phí ship làm giảm tiền bồi thường').toBe(tongBt(bt));
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_23 — Kiểm tra ghi nhận bồi thường khi điểm nhận xác nhận thiếu hàng', async ({ page }) => {
		chanNeuTat('Vantai_23');
		const x = await dungDonCoNo(page);
		try {
			const r = await boiThuong(x.m, x.don, 15_000, 'Nhận thiếu hàng');
			ghiDo(`ghi nhận bồi thường: ${JSON.stringify(r?.status)}`);
			expect(String(r?.status?.code)).toBe('200');
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_24 — Kiểm tra ghi nhận bồi thường khi nhận đủ hàng', async ({ page }) => {
		chanNeuTat('Vantai_24');
		const x = await dungDonCoNo(page);
		try {
			const r = await boiThuong(x.m, x.don, 5_000, 'Hàng hỏng khi kiểm tra lại');
			ghiDo(`bồi thường hàng hỏng (nhận đủ SL): ${JSON.stringify(r?.status)}`);
			expect(String(r?.status?.code)).toBe('200');
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_30 — Kiểm tra ghi nhận tổng số tiền bồi thường', async ({ page }) => {
		chanNeuTat('Vantai_30');
		const x = await dungDonCoNo(page);
		try {
			await boiThuong(x.m, x.don, 10_000, 'lần 1');
			await boiThuong(x.m, x.don, 7_000, 'lần 2');
			const ls = await lichSu(x.m, x.dv, 'DEDUCTION');
			ghiDo(`lịch sử bồi thường: ${JSON.stringify(ls.map((z) => z.amount ?? z.totalAmount))}`);
			expect(ls.length, 'Không đủ 2 phiếu bồi thường trong lịch sử').toBeGreaterThanOrEqual(2);
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_25 — Kiểm tra lịch sử thanh toán đơn vận chuyển', async ({ page }) => {
		chanNeuTat('Vantai_25');
		const x = await dungDonCoNo(page, 30_000);
		try {
			await traNo(x.m, x.dv, x.don, 10_000);
			await traNo(x.m, x.dv, x.don, 5_000);
			const sau = await donTheoMa(x.m, x.don.code);
			ghiDo(`đơn 30.000 trả 10.000 + 5.000 ⇒ đã trả ${sau?.paidAmount} còn ${sau?.remainAmount}`);
			expect(Number(sau?.paidAmount)).toBe(15_000);
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_29 — Kiểm tra chọn phương thức thanh toán', async ({ page }) => {
		chanNeuTat('Vantai_29');
		const x = await dungDonCoNo(page, 30_000);
		try {
			const a = await traNo(x.m, x.dv, x.don, 10_000, 'CASH');
			const b = await traNo(x.m, x.dv, x.don, 10_000, 'TRANSFER');
			const ls = await lichSu(x.m, x.dv, 'PAYMENT');
			ghiDo(`CASH ${JSON.stringify(a?.status)} · TRANSFER ${JSON.stringify(b?.status)} · lịch sử ${JSON.stringify(ls.map((z) => z.paymentMethod))}`);
			expect(ls.map((z) => z.paymentMethod)).toEqual(expect.arrayContaining(['CASH', 'TRANSFER']));
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_60 — Thanh toán nợ thành công', async ({ page }) => {
		chanNeuTat('Vantai_60');
		const x = await dungDonCoNo(page, 40_000);
		try {
			const r = await traNo(x.m, x.dv, x.don, 40_000);
			const ls = await lichSu(x.m, x.dv, 'PAYMENT');
			ghiDo(`${JSON.stringify(r?.status)} · lịch sử thanh toán ${ls.length}`);
			expect(String(r?.status?.code)).toBe('200');
			expect(ls.length).toBeGreaterThan(0);
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_68 — Thu hồi bồi thường thành công', async ({ page }) => {
		chanNeuTat('Vantai_68');
		const x = await dungDonCoNo(page);
		try {
			await boiThuong(x.m, x.don, 12_000);
			const bt = ds((await x.m.goi('GET', `/delivery-orders/debts/units/${x.dv.id}/unrecovered-deductions`))?.data);
			const r = await x.m.goi('POST', '/delivery-orders/debts/recover', {}, { deliveryUnitId: x.dv.id, totalAmount: 12_000, paymentMethod: 'CASH', note: 'AUTO TEST thu hồi', items: bt.map((z) => ({ deductionId: z.id, amount: Number(z.remainAmount ?? z.amount) })) });
			ghiDo(`thu hồi: ${JSON.stringify(r?.status)} · bồi thường chưa thu còn ${ds((await x.m.goi('GET', `/delivery-orders/debts/units/${x.dv.id}/unrecovered-deductions`))?.data).length}`);
			expect(String(r?.status?.code)).toBe('200');
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_69 — Kiểm tra tách biệt nghiệp vụ Thanh toán nợ và Thu hồi bồi thường', async ({ page }) => {
		chanNeuTat('Vantai_69');
		const x = await dungDonCoNo(page, 20_000);
		try {
			await boiThuong(x.m, x.don, 8_000);
			const btTruoc = ds((await x.m.goi('GET', `/delivery-orders/debts/units/${x.dv.id}/unrecovered-deductions`))?.data).length;
			await traNo(x.m, x.dv, x.don, 20_000);
			const btSau = ds((await x.m.goi('GET', `/delivery-orders/debts/units/${x.dv.id}/unrecovered-deductions`))?.data).length;
			const noSau = (await donTheoMa(x.m, x.don.code))?.remainAmount;
			ghiDo(`bồi thường chưa thu: ${btTruoc} ⇒ sau trả nợ ${btSau} · nợ đơn còn ${noSau}`);
			expect(btSau, 'Trả nợ làm đổi bồi thường').toBe(btTruoc);
			expect(Number(noSau)).toBe(0);
		} finally { await donPhieu(page, x.m, x.pc); }
	});
	test('Vantai_51 — Kiểm tra hiển thị giao diện màn hình Lịch sử ghi nợ', async ({ page }) => {
		chanNeuTat('Vantai_51');
		const x = await dungDonCoNo(page);
		try {
			await page.reload();
			await page.waitForTimeout(2_500);
			const o = khung(page).getByPlaceholder(/Tìm/).first();
			await o.fill(x.dv.code);
			await o.press('Enter');
			await page.waitForTimeout(2_500);
			const r = khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: x.dv.code }).first();
			await r.getByRole('button', { name: /Công nợ|Lịch sử/ }).first().click();
			const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
			await expect(dr).toBeVisible({ timeout: 15_000 });
			const t = chuan(await dr.innerText());
			ghiDo(t.slice(0, 300));
			for (const s of ['Tổng tiền giao hàng', 'Đã thanh toán', 'Tổng bồi thường', 'Tổng thu hồi']) expect(t, `Thiếu khối "${s}"`).toContain(s);
		} finally { await donPhieu(page, x.m, x.pc); }
	});

	// ─── Nhân viên vận chuyển ─────────────────────────────────────────────────────────
	async function moStaff(page) { return phien(page, '/delivery/staffs'); }
	async function moThemStaff(page) {
		await khung(page).getByRole('button', { name: /Thêm mới/ }).first().click();
		const dr = page.locator('.ant-drawer-open').last();
		await expect(dr).toBeVisible({ timeout: 15_000 });
		return dr;
	}
	const oStaff = (dr, ph) => dr.getByPlaceholder(ph).first();
	async function dienStaff(page, dr, { ten, sdt, email, chucVu }, dv) {
		if (ten != null) await dr.locator('input').first().fill(ten);
		if (sdt != null) await dr.getByPlaceholder(/SĐT|Số điện thoại/).first().fill(sdt);
		if (email != null) await dr.getByPlaceholder(/Email/i).first().fill(email);
		if (chucVu != null) await dr.getByPlaceholder(/Chức vụ/).first().fill(chucVu).catch(() => null);
		if (dv) { const o = dr.locator('.ant-select').first(); await o.click(); await page.keyboard.type(dv.name.slice(0, 12)); await page.waitForTimeout(1_200); await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click(); }
	}
	async function luuStaff(page, dr) {
		let rs = null;
		const cho = page.waitForResponse((r) => /delivery-staffs/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), { timeout: 12_000 }).then((r) => { rs = r; }).catch(() => null);
		await dr.getByRole('button', { name: /^Lưu$/ }).last().click();
		const tbs = new Set();
		for (let i = 0; i < 20 && !rs; i += 1) { for (const t of await page.locator('.ant-message-notice').allInnerTexts()) tbs.add(chuan(t)); await page.waitForTimeout(300); }
		await cho;
		await page.waitForTimeout(800);
		for (const t of await page.locator('.ant-message-notice').allInnerTexts()) tbs.add(chuan(t));
		return { body: rs ? await rs.json().catch(() => null) : null, tb: [...tbs].join(' | '), loi: chuan((await dr.locator('.ant-form-item-explain-error').allInnerTexts()).join(' | ')) };
	}
	const sdtMoi = () => `09${Date.now().toString().slice(-8)}`;

	test('Vantai_83 — Thêm mới thành công', async ({ page }) => {
		chanNeuTat('Vantai_83');
		const m = await moStaff(page);
		const dv = await taoDonVi(m);
		const dr = await moThemStaff(page);
		await dienStaff(page, dr, { ten: `${seed.PREFIX}NVVC_${hau()}`, sdt: sdtMoi(), email: `auto${hau()}@test.vn`, chucVu: 'Tài xế' }, dv);
		const kq = await luuStaff(page, dr);
		ghiDo(`${kq.body?.status?.code} "${kq.tb}" ${kq.loi}`);
		expect(String(kq.body?.status?.code)).toBe('200');
		if (kq.body?.data?.id) await m.goi('DELETE', `/delivery-staffs/${kq.body.data.id}`).catch(() => null);
	});
	test('Vantai_85 — Nhập SĐT sai định dạng', async ({ page }) => {
		chanNeuTat('Vantai_85');
		await moStaff(page);
		const dr = await moThemStaff(page);
		await dienStaff(page, dr, { ten: 'AUTO SDT', sdt: '12ab' });
		const kq = await luuStaff(page, dr);
		ghiDo(`${kq.body?.status?.code ?? 'FE chặn'} "${kq.loi || kq.tb}"`);
		expect(kq.body, '🔴 SĐT sai định dạng vẫn gửi lưu').toBeNull();
	});
	test('Vantai_86 — Nhập SĐT đã tồn tại', async ({ page }) => {
		chanNeuTat('Vantai_86');
		const m = await moStaff(page);
		const dv = await taoDonVi(m);
		const sdt = sdtMoi();
		const a = await m.goi('POST', '/delivery-staffs', {}, { name: `${seed.PREFIX}NVA_${hau()}`, phone: sdt, deliveryUnitId: dv.id });
		const dr = await moThemStaff(page);
		await dienStaff(page, dr, { ten: `${seed.PREFIX}NVB_${hau()}`, sdt }, dv);
		const kq = await luuStaff(page, dr);
		ghiDo(`SĐT trùng: ${kq.body?.status?.code} "${kq.body?.status?.message ?? kq.tb}"`);
		for (const x of [a?.data?.id, kq.body?.data?.id]) if (x) await m.goi('DELETE', `/delivery-staffs/${x}`).catch(() => null);
		expect(String(kq.body?.status?.code), '🔴 Trùng SĐT nhân viên vận chuyển vẫn lưu').not.toBe('200');
	});
	test('Vantai_87 — Nhập email sai định dạng', async ({ page }) => {
		chanNeuTat('Vantai_87');
		await moStaff(page);
		const dr = await moThemStaff(page);
		await dienStaff(page, dr, { ten: 'AUTO EMAIL', sdt: sdtMoi(), email: 'abc@gmail' });
		const kq = await luuStaff(page, dr);
		ghiDo(`${kq.body?.status?.code ?? 'FE chặn'} "${kq.loi || kq.tb}"`);
		expect(kq.body, '🔴 Email sai định dạng vẫn gửi lưu').toBeNull();
	});
	test('Vantai_88 — Nhập chức vụ', async ({ page }) => {
		chanNeuTat('Vantai_88');
		const m = await moStaff(page);
		const dv = await taoDonVi(m);
		const dr = await moThemStaff(page);
		await dienStaff(page, dr, { ten: `${seed.PREFIX}NVCV_${hau()}`, sdt: sdtMoi(), chucVu: 'Trưởng xe' }, dv);
		const kq = await luuStaff(page, dr);
		const id = kq.body?.data?.id;
		const ct = id ? (await m.goi('GET', `/delivery-staffs/${id}`))?.data : null;
		ghiDo(`lưu ${kq.body?.status?.code} · chức vụ ${ct?.position ?? ct?.jobTitle}`);
		if (id) await m.goi('DELETE', `/delivery-staffs/${id}`).catch(() => null);
		expect(ct?.position ?? ct?.jobTitle).toBe('Trưởng xe');
	});
	async function suaStaff(page, sua) {
		const m = await moStaff(page);
		const dv = await taoDonVi(m);
		const a = await m.goi('POST', '/delivery-staffs', {}, { name: `${seed.PREFIX}NVS_${hau()}`, phone: sdtMoi(), email: `a${hau()}@test.vn`, deliveryUnitId: dv.id });
		const id = a?.data?.id;
		try {
			await page.reload();
			await page.waitForTimeout(2_500);
			const r = khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: a.data.name }).first();
			await r.getByRole('button', { name: /Sửa|edit/ }).first().click();
			const dr = page.locator('.ant-drawer-open').last();
			await expect(dr).toBeVisible({ timeout: 15_000 });
			await sua(dr);
			const kq = await luuStaff(page, dr);
			return { kq, ct: (await m.goi('GET', `/delivery-staffs/${id}`))?.data };
		} finally { if (id) await m.goi('DELETE', `/delivery-staffs/${id}`).catch(() => null); }
	}
	test('Vantai_90 — Chỉnh sửa tên', async ({ page }) => {
		chanNeuTat('Vantai_90');
		const ten = `${seed.PREFIX}NVMOI_${hau()}`;
		const { kq, ct } = await suaStaff(page, async (dr) => dr.locator('input').first().fill(ten));
		ghiDo(`${kq.body?.status?.code} · tên ${ct?.name}`);
		expect(ct?.name).toBe(ten);
	});
	test('Vantai_91 — Chỉnh sửa SĐT hợp lệ', async ({ page }) => {
		chanNeuTat('Vantai_91');
		const sdt = sdtMoi();
		const { kq, ct } = await suaStaff(page, async (dr) => dr.getByPlaceholder(/SĐT|Số điện thoại/).first().fill(sdt));
		ghiDo(`${kq.body?.status?.code} · SĐT ${ct?.phone}`);
		expect(String(ct?.phone).replace(/^84/, '0')).toBe(sdt);
	});
	test('Vantai_92 — Chỉnh sửa email hợp lệ', async ({ page }) => {
		chanNeuTat('Vantai_92');
		const email = `sua${hau()}@test.vn`;
		const { kq, ct } = await suaStaff(page, async (dr) => dr.getByPlaceholder(/Email/i).first().fill(email));
		ghiDo(`${kq.body?.status?.code} · email ${ct?.email}`);
		expect(ct?.email).toBe(email);
	});
	test('Vantai_94 — Nhập email sai định dạng', async ({ page }) => {
		chanNeuTat('Vantai_94');
		const { kq } = await suaStaff(page, async (dr) => dr.getByPlaceholder(/Email/i).first().fill('sai@email'));
		ghiDo(`${kq.body?.status?.code ?? 'FE chặn'} "${kq.loi || kq.tb}"`);
		expect(kq.body, '🔴 Sửa email sai định dạng vẫn lưu').toBeNull();
	});
	test('Vantai_95 — Xác nhận xóa', async ({ page }) => {
		chanNeuTat('Vantai_95');
		const m = await moStaff(page);
		const dv = await taoDonVi(m);
		const a = await m.goi('POST', '/delivery-staffs', {}, { name: `${seed.PREFIX}NVX_${hau()}`, phone: sdtMoi(), deliveryUnitId: dv.id });
		await page.reload();
		await page.waitForTimeout(2_500);
		const r = khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: a.data.name }).first();
		await r.getByRole('button', { name: /Xóa|Xoá|delete/ }).first().click();
		const xn = page.locator('.ant-popover:visible, .ant-modal-confirm').last();
		const cho = page.waitForResponse((x) => /delivery-staffs/.test(x.url()) && x.request().method() === 'DELETE', { timeout: 15_000 }).catch(() => null);
		await xn.locator('.ant-btn-primary, .ant-btn-dangerous').last().click();
		const res = await cho;
		await page.waitForTimeout(2_000);
		const con = await khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: a.data.name }).count();
		ghiDo(`xoá ${res?.status()} · còn trên DS ${con}`);
		expect(con).toBe(0);
	});
	test('Vantai_73 — Chuyển trang', async ({ page }) => {
		chanNeuTat('Vantai_73');
		await moStaff(page);
		const p2 = khung(page).locator('.ant-pagination-item-2');
		test.skip(!(await p2.count()), 'Danh sách nhân viên vận chuyển chưa đủ 2 trang');
		const truoc = chuan(await khung(page).locator('.ant-table-tbody tr.ant-table-row').first().innerText());
		await p2.click();
		await page.waitForTimeout(2_000);
		expect(chuan(await khung(page).locator('.ant-table-tbody tr.ant-table-row').first().innerText())).not.toBe(truoc);
	});
});
