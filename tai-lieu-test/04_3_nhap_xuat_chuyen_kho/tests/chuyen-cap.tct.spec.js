'use strict';

/**
 * 04_3 · 070 — Chuyển kho theo cấp TCT → Tỉnh (HUB) → điểm bán, GHI THẬT (26/09/2026). Vai chính `tct`, phiên phụ `province`, `shop`.
 *
 * API (khuôn 14_2 `tien-de.province.spec.js › chuyenVeShop`): tạo `POST /stock/v2/transfer/v2?shopId=<gửi>` (exportImmediately = cấu
 * hình "Xuất kho ngay" của form, mặc định BẬT), nhận `PUT /stock/v2/transfer/v2/{id}/confirm?shopId=<nhận>` (isMerge = gộp lô), chi tiết
 * `GET …/{id}`. 🔴 Phiếu khác pod: id ở pod gửi ≠ id pod nhận ⇒ bên nhận tìm theo MÃ phiếu. Tồn theo lô: `GET /stock/v2/batch-product`.
 * Công nợ nội bộ: `INTERNAL_DEBT` + `INTERNAL_DEBT_INVOICE` (source_code = mã phiếu chuyển; pair TINH_TCT / DIEM_BAN_TINH) — chỉ SELECT.
 * Kho TCT: kho mặc định của shop phiên `tct`; SP = lô còn khả dụng của SP FIFO seed (12_3 nhập lẻ từ NCC tạo sẵn).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const { chon } = require('../../shared/db/otp');
const k = require('./ghi-kho');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const d = () => seed.doc().duLieu;
const hau = () => Date.now().toString().slice(-7);
const PODS = ['VNPOST_POD_01', 'VNPOST_POD_02', 'VNPOST_POD_03'];
const sqlMoiPod = (q) => PODS.map((db) => { try { return chon(q, db); } catch { return ''; } }).filter(Boolean).join('\n');

async function phienChinh(page) {
	const st = k.batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/transfer-warehouse`, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	return { page, st, shopId: Number(st.h.shopid) };
}
const khoMacDinh = async (ps, shopId) => {
	const r = (await k.goiGhi(ps.page, ps.st, 'GET', `/shops/${shopId}/inventory`))?.data;
	const m = Array.isArray(r) ? r : r?.content || [];
	return (m.find((x) => x.isDefault || x.defaultInventory) || m[0])?.id;
};
const loCua = async (ps, shopId, productId) => ((await k.goiGhi(ps.page, ps.st, 'GET', '/stock/v2/batch-product', { shopId, productId, size: 500 }))?.data || [])
	.map((l) => ({ ...l, kd: Number(l.remainQuantity) - Number(l.reservedQuantity || 0) }));
const tongTon = (lo) => lo.reduce((s, l) => s + Number(l.remainQuantity), 0);

/** Tiền đề: kho gửi chưa có lô SP đủ `sl` ⇒ nhập lẻ 10 cái bằng CHÍNH phiên đó (khuôn seed 16.2, phiếu có lô). */
async function damBaoLo(ps, shopId, kho, productId, sl, { moi = false } = {}) {
	const co = (await loCua(ps, shopId, productId)).some((l) => l.kd >= sl);
	if (co && !moi) return;
	const sku = chon(`select sku from CHAIN_PRODUCT_UNIT where product_id=${productId} and convert_to_main_unit=1 and variant_id is not null limit 1`, 'VNPOST_CORE');
	const [productUnitId, variantId, unit] = chon(`select product_unit_id, variant_id, unit from CHAIN_PRODUCT_UNIT where product_id=${productId} and convert_to_main_unit=1 and variant_id is not null limit 1`, 'VNPOST_CORE').split('\t');
	const ngay = new Date().toISOString().slice(0, 10);
	const r = await k.goiGhi(ps.page, ps.st, 'POST', '/stock/v3/import-export', { shopId }, {
		code: `NK${hau()}CC`, objectId: 0, objectType: 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0, note: 'AUTO TEST 04_3 070 tiền đề',
		actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: false,
		items: [{ amount: 10 * 30_000, price: 30_000, productId, productName: sku, batchCode: null, batchProducts: [{ batchCode: `A${process.env.VNPOST_LANE || ''}CC${hau()}`, quantity: 10, manufactureDate: ngay, expiryDate: '2028-12-31', serials: [] }],
			quantity: 10, serials: [], totalAmount: 10 * 30_000, unit, variantId: +variantId, variantName: null, itemId: null, shopId, inventoryId: kho, productUnit: unit, convertToMainUnit: 1, productUnitId: +productUnitId }],
	});
	const id = r?.data?.stockInOutId ?? r?.stockInOutId;
	expect(id, `Tiền đề nhập lô ở shop ${shopId} lỗi: ${JSON.stringify(r?.status ?? r).slice(0, 200)}`).toBeTruthy();
	await k.goiGhi(ps.page, ps.st, 'POST', '/stock/v3/import-export/confirm', { shopId, stockInOutId: id });
}

/** Tạo phiếu chuyển `sl` từ (ps, shop gửi) sang shop nhận; trả { ma, id, lo }. */
async function taoChuyen(ps, { tuShop, tuKho, denShop, denKho, productId, sl, loChon }) {
	const lo = loChon ?? (await loCua(ps, tuShop, productId)).filter((l) => l.kd >= sl).sort((a, b) => Number(b.batchProductId) - Number(a.batchProductId))[0];
	expect(lo, `Kho gửi (shop ${tuShop}) không có lô SP ${productId} đủ ${sl}`).toBeTruthy();
	const ma = `A${process.env.VNPOST_LANE || ''}CC${hau()}`;
	const r = await k.goiGhi(ps.page, ps.st, 'POST', '/stock/v2/transfer/v2', { shopId: tuShop }, {
		fromInventoryId: tuKho, fromShopId: tuShop, imageIds: [], code: ma, toInventoryId: denKho, toShopId: denShop, note: 'AUTO TEST 04_3 070',
		reason: '', discountAmount: 0, actionTime: null, exportImmediately: true,
		items: [{ fromProductId: productId, fromVariantId: lo.variantId, fromProductUnitId: lo.productUnitId ?? null, quantity: sl, price: Number(lo.price) || 0, serials: [],
			batchProducts: [{ batchCode: lo.batchCode, quantity: sl, batchProductId: lo.batchProductId }] }],
	});
	expect(String(r?.status?.code), `Tạo phiếu chuyển lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
	return { ma, id: r?.data?.stockTransferId ?? r?.data?.id, lo, gia: Number(lo.price) || 0 };
}
/** Bên nhận tìm phiếu theo mã (pod khác ⇒ id khác) rồi xác nhận; trả { ct, kq }. */
async function nhan(ps, shopId, ma, them = {}) {
	let p = null;
	await expect.poll(async () => {
		const ds = (await k.goiGhi(ps.page, ps.st, 'GET', '/stock/v2/transfer/v2', { shopIds: shopId, beginTime: Date.now() - 86400_000, endTime: Date.now() + 86400_000, page: 0, size: 500 }))?.data || []; // 🔴 danh sách CŨ TRƯỚC — size nhỏ thì phiếu mới rơi trang sau
		p = ds.find((x) => x.code === ma);
		return Boolean(p);
	}, { timeout: 60_000 }).toBe(true);
	const ct = (await k.goiGhi(ps.page, ps.st, 'GET', `/stock/v2/transfer/v2/${p.stockTransferId}`, { shopId }))?.data;
	const items = (ct.items || []).map((i) => ({ stockTransferItemId: i.stockTransferItemId, quantity: i.quantity, price: i.editPrice, batchProducts: (i.batchProducts || []).map((b) => ({ batchCode: them.maLoMoi ?? b.batchCode, quantity: b.quantity })),
		// SP serial: FE (DrawerConfirmTransfer) gửi `receivedSerials` = các serial bên nhận tick (mặc định đủ).
		...(Array.isArray(i.serials) && i.serials.length ? { receivedSerials: them.serialNhan ?? [...i.serials] } : {}) }));
	const kq = await k.goiGhi(ps.page, ps.st, 'PUT', `/stock/v2/transfer/v2/${p.stockTransferId}/confirm`, { shopId }, { code: ct.code, actionTime: Date.now(), imageIds: null, note: 'AUTO TEST 04_3 070', items, ...(them.isMerge != null ? { isMerge: them.isMerge } : {}) });
	const sau = (await k.goiGhi(ps.page, ps.st, 'GET', `/stock/v2/transfer/v2/${p.stockTransferId}`, { shopId }))?.data;
	return { ct, kq, sau, id: p.stockTransferId };
}
const noNoiBo = (ma) => sqlMoiPod(`select d.pair_kind, d.debtor_shop_id, d.creditor_shop_id, i.total_amount, i.source_code from INTERNAL_DEBT_INVOICE i join INTERNAL_DEBT d on d.id=i.debt_id where i.source_code='${ma}'`);
const phieuNhap = (shopId, ma) => sqlMoiPod(`select s.stock_in_out_id, s.type, s.sub_type, s.status, s.code, s.note, s.total_amount from SHOP_STOCK_IN_OUT s where s.shop_id=${shopId} and s.type='IMPORT' and (s.code like '%${ma}%' or s.note like '%${ma}%' or s.stock_in_out_id in (select stock_in_id from SHOP_STOCK_TRANSFER where code='${ma}'))`);

/** Dựng TCT → HUB, trả số đo trước/sau (dùng chung cho 070_001–006). */
async function tctXuongTinh(page, browser, sl = 2, { nhanNgay = true } = {}) {
	const m = await phienChinh(page);
	const sp = d().sanPham.sanPhamTheoGiaVon.fifo;
	const productId = Number(chon(`select product_id from CHAIN_PRODUCT_UNIT where sku='${sp.sku}' limit 1`, 'VNPOST_CORE'));
	const hub = d().hubTinh;
	const khoTct = await khoMacDinh(m, m.shopId);
	const pv = await k.moPhienPhu(browser, 'province', '/inventory/transfer-warehouse');
	try {
		// 🔴 BE tự FIFO lô (bỏ qua lô gửi lên) ⇒ lô thật đọc từ chi tiết phiếu (`loThat`). Lô đó từng về tồn 0 ở HUB thì tỉnh nhận lỗi
		// (500 khi gộp / "Mã lô đã tồn tại" khi không gộp) — lỗi sản phẩm, báo cáo 04_3 "bổ sung 26/09 tối".
		await damBaoLo(m, m.shopId, khoTct, productId, sl);
		const tonTctTruoc = tongTon(await loCua(m, m.shopId, productId));
		const tonHubTruoc = tongTon(await loCua(pv, hub.shopId, productId));
		const c = await taoChuyen(m, { tuShop: m.shopId, tuKho: khoTct, denShop: hub.shopId, denKho: hub.inventoryId, productId, sl });
		const ctGui = (await k.goiGhi(page, m.st, 'GET', `/stock/v2/transfer/v2/${c.id}`, { shopId: m.shopId }))?.data;
		const tonTctSau = tongTon(await loCua(m, m.shopId, productId));
		c.loThat = ctGui?.items?.[0]?.batchProducts?.[0]?.batchCode ?? c.lo.batchCode;
		// 🔴 Mỗi case chuyển lại cùng lô TCT ⇒ từ lần 2 HUB đã có mã lô, BE chặn "Mã lô … đã tồn tại ở kho nhận. Vui lòng gộp lô" ⇒ luôn gộp.
		if (!nhanNgay) return { m, pv, sl, productId, c, ctGui, tonTctTruoc, tonTctSau, hub };
		const n = await nhan(pv, hub.shopId, c.ma, { isMerge: true });
		await page.waitForTimeout(3_000);
		const loHub = await loCua(pv, hub.shopId, productId);
		return { m, pv, sl, productId, c, ctGui, tonTctTruoc, tonTctSau, tonHubTruoc, tonHubSau: tongTon(loHub), loHub, n, hub };
	} catch (e) { await pv.dong(); throw e; }
}

/** Dựng HUB → điểm bán seed (vai province gửi, shop nhận). */
async function tinhXuongShop(browser, sl = 1, { loChon, them } = {}) {
	const sp = d().sanPham.sanPhamTheoGiaVon.fifo;
	const productId = Number(chon(`select product_id from CHAIN_PRODUCT_UNIT where sku='${sp.sku}' limit 1`, 'VNPOST_CORE'));
	const hub = d().hubTinh;
	const shopId = d().diemBan.shopId;
	const pv = await k.moPhienPhu(browser, 'province', '/inventory/transfer-warehouse');
	const sh = await k.moPhienPhu(browser, 'shop', '/inventory/transfer-warehouse');
	try {
		const khoShop = await khoMacDinh(sh, shopId);
		if (!loChon) await damBaoLo(pv, hub.shopId, hub.inventoryId, productId, sl);
		const tonHubTruoc = tongTon(await loCua(pv, hub.shopId, productId));
		const tonShopTruoc = await loCua(sh, shopId, productId);
		const c = await taoChuyen(pv, { tuShop: hub.shopId, tuKho: hub.inventoryId, denShop: shopId, denKho: khoShop, productId, sl, loChon });
		const tonHubSau = tongTon(await loCua(pv, hub.shopId, productId));
		const n = await nhan(sh, shopId, c.ma, them ?? { isMerge: true });
		const tonShopSau = await loCua(sh, shopId, productId);
		return { pv, sh, sl, productId, c, tonHubTruoc, tonHubSau, tonShopTruoc, tonShopSau, n, shopId, hub };
	} catch (e) { await pv.dong(); await sh.dong(); throw e; }
}

test.describe('04_3 · 070 — Chuyển kho theo cấp (GHI)', () => {
	test.describe.configure({ timeout: 360_000 });

	test('04_3_070_001 — Lập phiếu chuyển kho TCT xuống Tỉnh', async ({ page, browser }) => {
		chanNeuTat('04_3_070_001');
		const x = await tctXuongTinh(page, browser);
		try {
			ghiDo(`phiếu ${x.c.ma}: trạng thái sau lập ${x.ctGui?.status} · từ ${x.ctGui?.fromShopId} → ${x.ctGui?.toShopId}`);
			expect(x.ctGui?.status, 'Phiếu mới không ở Chờ xác nhận / Đang đi đường').toMatch(/PENDING|IN_TRANSIT/);
			expect(Number(x.ctGui?.fromShopId)).toBe(x.m.shopId);
			expect(Number(x.ctGui?.toShopId)).toBe(Number(x.hub.shopId));
		} finally { await x.pv.dong(); }
	});

	test('04_3_070_002 — Tồn kho TCT sau khi lập phiếu chuyển', async ({ page, browser }) => {
		chanNeuTat('04_3_070_002');
		const x = await tctXuongTinh(page, browser);
		try {
			ghiDo(`xuất ngay = BẬT (mặc định form) · tồn TCT ${x.tonTctTruoc} ⇒ ${x.tonTctSau} (chuyển ${x.sl})`);
			expect(x.tonTctSau, 'Xuất ngay bật mà tồn TCT không giảm đúng số chuyển').toBe(x.tonTctTruoc - x.sl);
		} finally { await x.pv.dong(); }
	});

	test('04_3_070_003 — Tỉnh xác nhận nhận hàng từ TCT', async ({ page, browser }) => {
		chanNeuTat('04_3_070_003');
		const x = await tctXuongTinh(page, browser);
		try {
			ghiDo(`xác nhận ${JSON.stringify(x.n.kq?.status)} · trạng thái ${x.n.sau?.status} · mốc nhận ${x.n.sau?.receivedTime ?? x.n.sau?.confirmedTime ?? x.n.sau?.modifiedTime}`);
			expect(String(x.n.kq?.status?.code), `Tỉnh nhận hàng lỗi (callback TCT→tỉnh so pod?): ${x.n.kq?.status?.message}`).toBe('200');
			expect(x.n.sau?.status, 'Phiếu không chuyển sang Đã nhận').toMatch(/APPROVED|COMPLETED|RECEIVED|DONE/);
		} finally { await x.pv.dong(); }
	});

	test('04_3_070_004 — Tồn kho Tỉnh sau khi xác nhận', async ({ page, browser }) => {
		chanNeuTat('04_3_070_004');
		const x = await tctXuongTinh(page, browser);
		try {
			const lo = x.loHub.find((l) => l.batchCode === x.c.loThat);
			ghiDo(`tồn HUB ${x.tonHubTruoc} ⇒ ${x.tonHubSau} · lô thực xuất ${x.c.loThat} (script chọn ${x.c.lo.batchCode}): ${JSON.stringify(lo && { ton: lo.remainQuantity, gia: lo.price, hsd: lo.expiryDate })} · giá phiếu ${x.c.gia}`);
			expect(x.tonHubSau).toBe(x.tonHubTruoc + x.sl);
			expect(lo, 'Tỉnh không có lô cùng mã lô gửi').toBeTruthy();
			expect(Number(lo.price), 'Giá vốn lô ở tỉnh ≠ giá trên phiếu chuyển').toBe(x.c.gia);
		} finally { await x.pv.dong(); }
	});

	test('04_3_070_005 — Phiếu nhập kho được sinh ở Tỉnh', async ({ page, browser }) => {
		chanNeuTat('04_3_070_005');
		const x = await tctXuongTinh(page, browser);
		try {
			const pn = phieuNhap(x.hub.shopId, x.c.ma);
			ghiDo(`phiếu nhập ở HUB cho ${x.c.ma}: ${pn.replace(/\n/g, ' ; ') || 'KHÔNG CÓ'}`);
			expect(pn, '🔴 Không sinh phiếu IMPORT ở tỉnh khi nhận chuyển kho').not.toBe('');
		} finally { await x.pv.dong(); }
	});

	test('04_3_070_006 — Công nợ giữa Tỉnh và TCT sau chuyển kho', async ({ page, browser }) => {
		chanNeuTat('04_3_070_006');
		const x = await tctXuongTinh(page, browser);
		try {
			await page.waitForTimeout(5_000);
			const no = noNoiBo(x.c.ma);
			ghiDo(`công nợ nội bộ theo mã ${x.c.ma}: ${no.replace(/\n/g, ' ; ') || 'KHÔNG CÓ'} · giá trị chuyển ${x.sl * x.c.gia}`);
			expect(no, 'Không ghi công nợ Tỉnh–TCT cho phiếu chuyển').not.toBe('');
			const dong = no.split('\n').map((l) => l.split('\t'));
			expect(dong.some((c) => c[0] === 'TINH_TCT' && Math.round(Number(c[3])) === Math.round(x.sl * x.c.gia)), 'Công nợ không đúng cặp TINH_TCT / giá trị').toBe(true);
		} finally { await x.pv.dong(); }
	});

	test('04_3_070_007 — Lập phiếu chuyển kho Tỉnh xuống điểm bán / kho', async ({ browser }) => {
		chanNeuTat('04_3_070_007');
		const x = await tinhXuongShop(browser);
		try {
			ghiDo(`phiếu ${x.c.ma} ${x.n.ct?.status} (lúc bên nhận đọc) · nhận tại shop ${x.n.ct?.toShopId}`);
			expect(x.n.ct?.status).toMatch(/PENDING|IN_TRANSIT/);
			expect(Number(x.n.ct?.toShopId)).toBe(x.shopId);
		} finally { await x.pv.dong(); await x.sh.dong(); }
	});

	test('04_3_070_008 — Tồn kho Tỉnh sau khi chuyển xuống điểm bán', async ({ browser }) => {
		chanNeuTat('04_3_070_008');
		const x = await tinhXuongShop(browser);
		try {
			ghiDo(`tồn HUB ${x.tonHubTruoc} ⇒ ${x.tonHubSau} (xuất ngay BẬT, chuyển ${x.sl})`);
			expect(x.tonHubSau).toBe(x.tonHubTruoc - x.sl);
		} finally { await x.pv.dong(); await x.sh.dong(); }
	});

	test('04_3_070_009 — Điểm bán xác nhận nhận hàng từ Tỉnh', async ({ browser }) => {
		chanNeuTat('04_3_070_009');
		const x = await tinhXuongShop(browser);
		try {
			ghiDo(`xác nhận ${JSON.stringify(x.n.kq?.status)} · trạng thái ${x.n.sau?.status}`);
			expect(String(x.n.kq?.status?.code), `Điểm bán nhận hàng lỗi: ${x.n.kq?.status?.message}`).toBe('200');
			expect(x.n.sau?.status).toMatch(/APPROVED|COMPLETED|RECEIVED|DONE/);
		} finally { await x.pv.dong(); await x.sh.dong(); }
	});

	test('04_3_070_010 — Tồn kho điểm bán sau khi xác nhận', async ({ browser }) => {
		chanNeuTat('04_3_070_010');
		const x = await tinhXuongShop(browser);
		try {
			const truoc = tongTon(x.tonShopTruoc);
			const sau = tongTon(x.tonShopSau);
			const lo = x.tonShopSau.find((l) => l.batchCode === x.c.lo.batchCode);
			ghiDo(`tồn điểm bán ${truoc} ⇒ ${sau} · lô ${x.c.lo.batchCode} giá ${lo?.price} (phiếu ${x.c.gia}) · lô ở điểm bán sau: ${JSON.stringify(x.tonShopSau.map((l) => `${l.batchCode}:${l.remainQuantity}`))} · lô nhận trên phiếu: ${JSON.stringify((x.n.sau?.items || []).flatMap((i) => (i.batchProducts || []).map((b) => b.batchCode)))}`);
			expect(sau).toBe(truoc + x.sl);
			expect(lo, 'Điểm bán không có lô cùng mã').toBeTruthy();
		} finally { await x.pv.dong(); await x.sh.dong(); }
	});

	test('04_3_070_011 — Phiếu nhập kho được sinh ở điểm bán', async ({ browser }) => {
		chanNeuTat('04_3_070_011');
		const x = await tinhXuongShop(browser);
		try {
			const pn = phieuNhap(x.shopId, x.c.ma);
			ghiDo(`phiếu nhập ở điểm bán cho ${x.c.ma}: ${pn.replace(/\n/g, ' ; ') || 'KHÔNG CÓ'}`);
			expect(pn, 'Không sinh phiếu nhập ở điểm bán').not.toBe('');
		} finally { await x.pv.dong(); await x.sh.dong(); }
	});

	test('04_3_070_012 — Công nợ khi Tỉnh chuyển kho về điểm bán', async ({ browser, page }) => {
		chanNeuTat('04_3_070_012');
		const x = await tinhXuongShop(browser);
		try {
			await page.waitForTimeout(5_000);
			const no = noNoiBo(x.c.ma);
			ghiDo(`công nợ nội bộ theo ${x.c.ma}: ${no.replace(/\n/g, ' ; ') || 'KHÔNG CÓ'} · giá trị ${x.sl * x.c.gia}`);
			expect(no, 'Không ghi công nợ điểm bán – tỉnh cho phiếu chuyển').not.toBe('');
		} finally { await x.pv.dong(); await x.sh.dong(); }
	});

	test('04_3_070_013 — Chuyển kho lần 2 cùng lô, cùng điểm nhận — CÓ gộp lô', async ({ browser }) => {
		chanNeuTat('04_3_070_013');
		const a = await tinhXuongShop(browser, 1);
		await a.pv.dong(); await a.sh.dong();
		const b = await tinhXuongShop(browser, 1, { loChon: a.c.lo, them: { isMerge: true } });
		try {
			const dongLo = b.tonShopSau.filter((l) => l.batchCode === a.c.lo.batchCode);
			ghiDo(`lô ${a.c.lo.batchCode} ở điểm bán sau lần 2 (gộp): ${JSON.stringify(dongLo.map((l) => ({ ton: l.remainQuantity, gia: l.price })))} · nhận ${JSON.stringify(b.n.kq?.status)}`);
			expect(String(b.n.kq?.status?.code)).toBe('200');
			expect(dongLo.length, 'Gộp lô mà vẫn sinh 2 dòng lô').toBe(1);
		} finally { await b.pv.dong(); await b.sh.dong(); }
	});

	test('04_3_070_014 — Chuyển kho lần 2 cùng lô, cùng điểm nhận — KHÔNG gộp lô', async ({ browser }) => {
		chanNeuTat('04_3_070_014');
		const a = await tinhXuongShop(browser, 1);
		await a.pv.dong(); await a.sh.dong();
		const maMoi = `${a.c.lo.batchCode}K${hau().slice(-3)}`;
		const b = await tinhXuongShop(browser, 1, { loChon: a.c.lo, them: { isMerge: false, maLoMoi: maMoi } });
		try {
			const cu = b.tonShopSau.filter((l) => l.batchCode === a.c.lo.batchCode);
			const moi = b.tonShopSau.filter((l) => l.batchCode === maMoi);
			ghiDo(`nhận lần 2 KHÔNG gộp (đổi mã lô ${maMoi}): ${JSON.stringify(b.n.kq?.status)} · lô cũ ${cu.length} dòng · lô mới ${JSON.stringify(moi.map((l) => ({ ton: l.remainQuantity, gia: l.price })))}`);
			expect(String(b.n.kq?.status?.code), `Nhận không gộp (đổi mã lô) lỗi: ${b.n.kq?.status?.message}`).toBe('200');
			expect(moi.length, 'Không có dòng lô riêng cho lần 2').toBe(1);
		} finally { await b.pv.dong(); await b.sh.dong(); }
	});
	/** Mở chi tiết phiếu chuyển trên màn `/inventory/transfer-warehouse` (vai tct) rồi bấm nút in; đọc template in (ẩn trong DOM). */
	async function docBanIn(page, ma, nut, dau) {
		await page.reload();
		await page.waitForTimeout(3_000);
		const o = page.locator('.ant-pro-page-container').first().getByPlaceholder(/Tìm|mã phiếu/i).first();
		if (await o.count()) { await o.fill(ma); await o.press('Enter'); await page.waitForTimeout(2_500); }
		const dong = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ma }).first();
		await expect(dong, `Không thấy phiếu ${ma} trên màn chuyển kho`).toBeVisible({ timeout: 20_000 });
		await dong.getByText('Chi tiết', { exact: true }).last().click();
		const dr = page.locator('.ant-drawer-open').last();
		await expect(dr.getByRole('button', { name: nut })).toBeVisible({ timeout: 20_000 });
		await dr.getByRole('button', { name: nut }).click();
		const md = page.locator('.ant-modal-wrap:visible').last();
		if (await md.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) await md.locator('.ant-btn-primary').last().click();
		await page.waitForTimeout(2_000);
		return page.evaluate((d) => {
			// Khối NHỎ NHẤT chứa tiêu đề + bảng: các template in (phiếu chuyển / lấy hàng / biên bản) nằm cạnh nhau trong một khối cha.
			const el = [...document.querySelectorAll('div')].filter((x) => (x.textContent || '').includes(d) && x.querySelector('table'))
				.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
			return (el?.textContent || '').replace(/\s+/g, ' ').trim();
		}, dau);
	}

	test('04_3_060_017 — In phiếu lấy hàng', async ({ page, browser }) => {
		chanNeuTat('04_3_060_017');
		// FE ẩn nút in khi phiếu APPROVED (DrawerDetailTransfer) ⇒ in lúc còn IN_TRANSIT, nhận ở finally để không treo hàng.
		const x = await tctXuongTinh(page, browser, 1, { nhanNgay: false });
		try {
			const t = await docBanIn(page, x.c.ma, 'In phiếu lấy hàng', 'PHIẾU LẤY HÀNG');
			ghiDo(`bản in: ${t.slice(0, 500)}`);
			expect(t, 'Không dựng được bản in phiếu lấy hàng').toContain('PHIẾU LẤY HÀNG');
			expect(t, 'Bản in thiếu mã phiếu').toContain(x.c.ma);
			expect(t, 'Bản in thiếu mã lô cần lấy').toContain(x.c.loThat);
			expect(t, 'Phiếu lấy hàng có giá vốn (chứng từ kho không được có tiền)').not.toMatch(/Giá vốn|Đơn giá|Thành tiền/);
		} finally { await nhan(x.pv, x.hub.shopId, x.c.ma, { isMerge: true }).catch(() => null); await x.pv.dong(); }
	});

	test('04_3_060_018 — In biên bản bàn giao', async ({ page, browser }) => {
		chanNeuTat('04_3_060_018');
		const x = await tctXuongTinh(page, browser, 1, { nhanNgay: false });
		try {
			const t = await docBanIn(page, x.c.ma, 'In biên bản bàn giao', 'BÊN GIAO');
			ghiDo(`biên bản: ${t.slice(0, 500)}`);
			expect(t).toContain('BÊN GIAO');
			expect(t).toContain('BÊN NHẬN');
			expect(t, 'Thiếu chỗ ký hai bên').toMatch(/ĐẠI DIỆN BÊN GIAO.*ĐẠI DIỆN BÊN NHẬN/);
		} finally { await nhan(x.pv, x.hub.shopId, x.c.ma, { isMerge: true }).catch(() => null); await x.pv.dong(); }
	});
	test('04_3_060_013 — Chuyển kho theo mã serial', async ({ page, browser }) => {
		chanNeuTat('04_3_060_013');
		const m = await phienChinh(page);
		const hub = d().hubTinh;
		const sku = d().sanPham.sanPhamTheoGiaVon.dichDanh.sku;
		const [productId, productUnitId, variantId, unit] = chon(`select product_id, product_unit_id, variant_id, unit from CHAIN_PRODUCT_UNIT where sku='${sku}' and convert_to_main_unit=1 and variant_id is not null limit 1`, 'VNPOST_CORE').split('\t');
		const khoTct = await khoMacDinh(m, m.shopId);
		const h = hau();
		const sr = [`A8SC${h}1`, `A8SC${h}2`, `A8SC${h}3`];
		const lo = `A8SC${h}`;
		const ngay = new Date().toISOString().slice(0, 10);
		// Tiền đề: TCT nhập tay 3 serial (kho TCT không có tồn SP đích danh).
		const r = await k.goiGhi(page, m.st, 'POST', '/stock/v3/import-export', { shopId: m.shopId }, {
			code: `NK${h}SC`, objectId: 0, objectType: 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0, note: 'AUTO TEST 04_3_060_013 tiền đề serial',
			actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: false,
			items: [{ amount: 3 * 50_000, price: 50_000, productId: +productId, productName: sku, batchCode: null, batchProducts: [{ batchCode: lo, quantity: 3, manufactureDate: ngay, expiryDate: '2028-12-31', serials: sr }],
				quantity: 3, serials: sr, totalAmount: 3 * 50_000, unit, variantId: +variantId, variantName: null, itemId: null, shopId: m.shopId, inventoryId: khoTct, productUnit: unit, convertToMainUnit: 1, productUnitId: +productUnitId }],
		});
		const idNk = r?.data?.stockInOutId ?? r?.stockInOutId;
		expect(idNk, `Tiền đề nhập serial ở TCT lỗi: ${JSON.stringify(r?.status ?? r).slice(0, 200)}`).toBeTruthy();
		await k.goiGhi(page, m.st, 'POST', '/stock/v3/import-export/confirm', { shopId: m.shopId, stockInOutId: idNk });
		let maGui = null;
		const tao = (serials, sl) => k.goiGhi(page, m.st, 'POST', '/stock/v2/transfer/v2', { shopId: m.shopId }, {
			fromInventoryId: khoTct, fromShopId: m.shopId, imageIds: [], code: (maGui = `A8SC${hau()}`), toInventoryId: hub.inventoryId, toShopId: hub.shopId, note: 'AUTO TEST 04_3_060_013',
			reason: '', discountAmount: 0, actionTime: null, exportImmediately: true,
			items: [{ fromProductId: +productId, fromVariantId: +variantId, fromProductUnitId: +productUnitId, quantity: sl, price: 50_000, serials }],
		});
		// Số serial phải bằng SL chuyển: 1 serial cho SL 2 phải bị chặn.
		const sai = await tao([sr[0]], 2);
		if (String(sai?.status?.code) === '200') { const id = sai?.data?.stockTransferId ?? sai?.data?.id; if (id) await k.donPhieuChuyen(page, m.st, m.shopId, id); }
		const ok = await tao([sr[0], sr[1]], 2);
		expect(String(ok?.status?.code), `Tạo phiếu chuyển 2 serial lỗi: ${JSON.stringify(ok?.status)}`).toBe('200');
		const pv = await k.moPhienPhu(browser, 'province', '/inventory/transfer-warehouse');
		try {
			const n = await nhan(pv, hub.shopId, maGui, { isMerge: true });
			await page.waitForTimeout(3_000);
			const trangThai = (db) => chon(`select serial_number, shop_id, cast(status as unsigned), coalesce(exported_date,'') from SHOP_STOCK_SERIAL where serial_number in ('${sr.join("','")}') order by serial_number, shop_id`, db).replace(/\n/g, ' ; ');
			const p1 = trangThai('VNPOST_POD_01');
			const p2 = trangThai('VNPOST_POD_02');
			ghiDo(`SL 2 + 1 serial: ${JSON.stringify(sai?.status)} · phiếu ${maGui} 2 serial: nhận ${JSON.stringify(n.kq?.status)} ${n.sau?.status} · serial POD_01 (TCT): ${p1 || 'không có'} · POD_02 (HUB): ${p2 || 'không có'}`);
			expect(String(sai?.status?.code), '🔴 Tạo được phiếu chuyển SL 2 chỉ với 1 serial').not.toBe('200');
			expect(String(n.kq?.status?.code), `HUB nhận phiếu serial lỗi: ${n.kq?.status?.message}`).toBe('200');
			const hubCo = (s) => p2.split(' ; ').some((x) => x.startsWith(`${s}\t${hub.shopId}\t`));
			expect(hubCo(sr[0]) && hubCo(sr[1]), 'Hai serial đã chuyển không thuộc kho nhận (HUB)').toBe(true);
			expect(hubCo(sr[2]), 'Serial KHÔNG chuyển lại xuất hiện ở HUB').toBe(false);
			const tctCon = (s) => p1.split(' ; ').find((x) => x.startsWith(`${s}\t${m.shopId}\t`));
			expect(tctCon(sr[2]), 'Serial còn lại không còn ở TCT').toBeTruthy();
			// status (bit) ở TCT: serial chưa chuyển = trạng thái của sr[2]; hai serial đã chuyển phải KHÁC trạng thái đó (hoặc không còn dòng ở TCT).
			const tt = (x) => (x ?? '').split('\t')[2];
			for (const s of [sr[0], sr[1]]) expect(tctCon(s) && tt(tctCon(s)) === tt(tctCon(sr[2])), `Serial ${s} vẫn còn tồn ở kho xuất (TCT)`).toBeFalsy();
		} finally { await pv.dong(); }
	});
});
