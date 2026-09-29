'use strict';

/**
 * 07_2 · 070 / 020_005 / 060_010–011 — Khoá kho theo PHẠM VI (tỉnh / xã / điểm bán / nhiều cấp / danh mục), GHI (26/09/2026). Vai `tct`.
 *
 * Khoá dựng bằng đúng API FE (`StockFreezeDrawer.handleApply` → `POST /inventory-config/stock-freeze/bulk`
 * `{ scopeType, scopes:[{scopeType, orgUnitCode, parentOrgUnitCode}], reason, productIds | categoryIds }`), bỏ khoá `DELETE …/{ruleId}` ở finally.
 * Hành vi chặn đo bằng đúng API FE gọi khi chọn SP vào chứng từ (`ProductUnitSearchSelector.checkNotFrozen` → `POST /stock/v2/freeze-check
 * {shopId, productIds, op}`); BE `StockFreezeService.assertNotFrozen` tính theo hồ sơ điểm bán ở core ⇒ gọi bằng phiên TCT cho mọi điểm bán được.
 * Điểm bán đo: seed `AUTO8_SHOP` (tỉnh AUTO8_T / xã AUTO8_T_01) · HUB tỉnh (cùng tỉnh, ngoài xã) · điểm bán rác `AUTO8_SHOP_55976508` (tỉnh khác).
 * 🔴 Chỉ khoá SP seed giá tiêu chuẩn / danh mục của nó, lý do mang hậu tố thời gian để dọn đúng dòng.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { chon } = require('../../shared/db/otp');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 1500) });
const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);
const D = () => seed.doc().duLieu;
const spId = (sku) => Number(chon(`select product_id from CHAIN_PRODUCT_UNIT where sku='${sku}' limit 1`, 'VNPOST_CORE'));
const NOI = () => ({
	shop: { id: D().diemBan.shopId, ten: 'AUTO8_SHOP (xã AUTO8_T_01)' },
	hub: { id: D().hubTinh.shopId, ten: 'HUB (cùng tỉnh, ngoài xã)' },
	khac: { id: D().diemBanNhan.shopId, ten: 'điểm bán tỉnh khác' },
});

async function phien(page) {
	const st = k.batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=stockFreeze`, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const goi = (m, u, q, b) => k.goiGhi(page, st, m, u, q, b);
	const tam = [];
	const dsRule = async () => ds((await goi('GET', '/inventory-config/stock-freeze'))?.data);
	return {
		goi, tam,
		/** Tạo 1 cấu hình khoá; trả ruleId (tìm lại theo lý do duy nhất). */
		async khoa(scopes, loai) {
			const reason = `AUTO test 07_2 pham vi ${Date.now().toString().slice(-7)}`;
			const r = await goi('POST', '/inventory-config/stock-freeze/bulk', {}, { scopeType: scopes[0].scopeType, scopes, reason, ...loai });
			expect(String(r?.status?.code), `Tạo khoá lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
			const x = (await dsRule()).filter((z) => JSON.stringify(z).includes(reason));
			const ids = x.map((z) => z.ruleId ?? z.id).filter(Boolean);
			expect(ids.length, `Không thấy cấu hình vừa tạo (lý do ${reason})`).toBeGreaterThan(0);
			tam.push(...ids);
			return { ids, reason };
		},
		async boKhoa(ids) { for (const id of ids) { await goi('DELETE', `/inventory-config/stock-freeze/${id}`).catch(() => null); const i = tam.indexOf(id); if (i >= 0) tam.splice(i, 1); } },
		/** Mã + thông báo freeze-check (op EXPORT) ở một điểm bán. */
		async chan(shopId, productId, op = 'EXPORT') {
			const r = await goi('POST', '/stock/v2/freeze-check', {}, { shopId, productIds: [productId], op });
			return { bi: String(r?.status?.code) !== '200', tb: r?.status?.message ?? '' };
		},
		dsRule,
		don: async () => { for (const id of [...tam]) await goi('DELETE', `/inventory-config/stock-freeze/${id}`).catch(() => null); },
	};
}
const tinh = () => ({ scopeType: 'BUU_DIEN_TINH', orgUnitCode: D().toChuc.maTinh });
const xa = () => ({ scopeType: 'BUU_DIEN_XA', orgUnitCode: D().toChuc.maXa });
const diemBan = () => ({ scopeType: 'DIEM_BAN', orgUnitCode: D().diemBan.maShop });
const tinhKhac = () => ({ scopeType: 'BUU_DIEN_TINH', orgUnitCode: 'S55976508' });

async function doCacNoi(s, pid) {
	const n = NOI();
	const kq = {};
	for (const [k2, v] of Object.entries(n)) kq[k2] = { ...(await s.chan(v.id, pid)), noi: v.ten };
	return kq;
}

test.describe('07_2 — Khoá kho theo phạm vi (GHI)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('07_2_070_001 — Khoá cấp tỉnh chặn điểm bán trong tỉnh, không chặn tỉnh khác', async ({ page }) => {
		chanNeuTat('07_2_070_001');
		const s = await phien(page);
		const pid = spId(D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		try {
			await s.khoa([tinh()], { productIds: [pid] });
			const kq = await doCacNoi(s, pid);
			ghiDo(`khoá tỉnh ${D().toChuc.maTinh}: ${JSON.stringify(kq)}`);
			expect(kq.shop.bi, 'Điểm bán trong tỉnh KHÔNG bị chặn').toBe(true);
			expect(kq.shop.tb).toMatch(/Không thể xuất kho|khoá|khóa/i);
			expect(kq.khac.bi, '🔴 Khoá tỉnh chặn cả điểm bán tỉnh khác (phạm vi nở)').toBe(false);
		} finally { await s.don(); }
	});

	test('07_2_070_002 — Khoá cấp xã chặn điểm bán trong xã, không chặn ngoài xã', async ({ page }) => {
		chanNeuTat('07_2_070_002');
		const s = await phien(page);
		const pid = spId(D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		try {
			await s.khoa([xa()], { productIds: [pid] });
			const kq = await doCacNoi(s, pid);
			ghiDo(`khoá xã ${D().toChuc.maXa}: ${JSON.stringify(kq)} (tỉnh seed chỉ có 1 xã ⇒ "ngoài xã cùng tỉnh" = HUB tỉnh)`);
			expect(kq.shop.bi, 'Điểm bán trong xã KHÔNG bị chặn').toBe(true);
			expect(kq.hub.bi, 'Khoá xã chặn cả HUB tỉnh (ngoài xã)').toBe(false);
			expect(kq.khac.bi, 'Khoá xã chặn cả điểm bán tỉnh khác').toBe(false);
		} finally { await s.don(); }
	});

	test('07_2_070_003 — Khoá một điểm bán chỉ chặn đúng điểm bán đó', async ({ page }) => {
		chanNeuTat('07_2_070_003');
		const s = await phien(page);
		const pid = spId(D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		try {
			await s.khoa([diemBan()], { productIds: [pid] });
			const kq = await doCacNoi(s, pid);
			ghiDo(`khoá điểm bán ${D().diemBan.maShop}: ${JSON.stringify(kq)}`);
			expect(kq.shop.bi, 'Điểm bán đã chọn KHÔNG bị chặn').toBe(true);
			expect(kq.hub.bi || kq.khac.bi, '🔴 Khoá 1 điểm bán chặn cả nơi khác').toBe(false);
		} finally { await s.don(); }
	});

	test('07_2_070_004 — Một cấu hình chọn nhiều cấp cùng lúc', async ({ page }) => {
		chanNeuTat('07_2_070_004');
		const s = await phien(page);
		const pid = spId(D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		try {
			// Một tỉnh (tỉnh khác) + một xã (xã seed, thuộc tỉnh khác với tỉnh vừa chọn) ⇒ nơi không chọn: HUB tỉnh seed.
			await s.khoa([tinhKhac(), xa()], { productIds: [pid] });
			const kq = await doCacNoi(s, pid);
			ghiDo(`khoá [tỉnh S55976508 + xã ${D().toChuc.maXa}]: ${JSON.stringify(kq)}`);
			expect(kq.khac.bi, 'Điểm bán thuộc TỈNH đã chọn không bị chặn').toBe(true);
			expect(kq.shop.bi, 'Điểm bán thuộc XÃ đã chọn không bị chặn').toBe(true);
			expect(kq.hub.bi, 'Nơi KHÔNG chọn (HUB tỉnh seed) vẫn bị chặn').toBe(false);
		} finally { await s.don(); }
	});

	test('07_2_020_005 — SKU bị hai cấu hình khoá: bỏ một vẫn còn chặn', async ({ page }) => {
		chanNeuTat('07_2_020_005');
		const s = await phien(page);
		const pid = spId(D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		try {
			const a = await s.khoa([diemBan()], { productIds: [pid] });
			const b = await s.khoa([xa()], { productIds: [pid] });
			await s.boKhoa(a.ids);
			const sau = await s.chan(NOI().shop.id, pid);
			const conB = (await s.dsRule()).some((z) => b.ids.includes(z.ruleId ?? z.id));
			ghiDo(`bỏ cấu hình 1 (${a.ids}) · còn cấu hình 2 (${b.ids}) trong bảng: ${conB} · điểm bán: ${JSON.stringify(sau)}`);
			expect(sau.bi, 'Bỏ một cấu hình mà SKU hết bị chặn dù còn cấu hình thứ hai').toBe(true);
			expect(conB, 'Cấu hình thứ hai biến mất khỏi danh sách').toBe(true);
		} finally { await s.don(); }
	});

	test('07_2_070_005 — Khoá theo danh mục chặn SP thuộc danh mục, không chặn SP ngoài', async ({ page }) => {
		chanNeuTat('07_2_070_005');
		const s = await phien(page);
		const tc = spId(D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		const cat = Number(chon(`select category_id from CHAIN_PRODUCTS where product_id=${tc}`, 'VNPOST_CORE'));
		const ngoai = Number(chon(`select product_id from CHAIN_PRODUCTS where chain_id=626 and category_id is not null and category_id<>${cat} and status='KICH_HOAT' order by product_id desc limit 1`, 'VNPOST_CORE'));
		try {
			await s.khoa([diemBan()], { categoryIds: [cat] });
			const trong = await s.chan(NOI().shop.id, tc);
			const ngoaiKq = await s.chan(NOI().shop.id, ngoai);
			ghiDo(`danh mục ${cat}: SP thuộc (${tc}) ${JSON.stringify(trong)} · SP ngoài (${ngoai}) ${JSON.stringify(ngoaiKq)} · (SP thêm vào danh mục SAU khi khoá: BE tính lúc kiểm theo category hiện tại — chưa đo đổi danh mục thật)`);
			expect(trong.bi, 'SP thuộc danh mục bị khoá không bị chặn').toBe(true);
			expect(ngoai, 'Không tìm được SP ngoài danh mục để đối chứng').toBeGreaterThan(0);
			expect(ngoaiKq.bi, 'SP ngoài danh mục bị chặn').toBe(false);
		} finally { await s.don(); }
	});

	// 🔴 26/09: phiếu do vai ĐIỂM BÁN lập (shop → HUB) bị lưu to_shop_id = chính điểm bán gửi, to_inventory_id = kho HUB (phiếu A8KK9190926,
	//    POD_02 id 152, LOCAL) ⇒ HUB không thấy phiếu. Đổi luồng: khoá/bỏ khoá ở HUB, tỉnh chuyển HUB → điểm bán seed, điểm bán nhận.
	const hubScope = () => ({ scopeType: 'DIEM_BAN', orgUnitCode: D().hubTinh.maShop });
	test('07_2_060_010 — Chuyển kho SP vừa bỏ khoá', async ({ page, browser }) => {
		chanNeuTat('07_2_060_010');
		const s = await phien(page);
		const pid = spId(D().sanPham.sanPhamTheoGiaVon.fifo.sku);
		const hub = D().hubTinh;
		const a = await s.khoa([hubScope()], { productIds: [pid] });
		const dangKhoa = await s.chan(hub.shopId, pid, 'TRANSFER');
		await s.boKhoa(a.ids);
		const boKhoa = await s.chan(hub.shopId, pid, 'TRANSFER');
		const pv = await k.moPhienPhu(browser, 'province', '/inventory/transfer-warehouse');
		try {
			const lo = ((await k.goiGhi(pv.page, pv.st, 'GET', '/stock/v2/batch-product', { shopId: hub.shopId, productId: pid, size: 500 }))?.data || []).find((l) => Number(l.remainQuantity) - Number(l.reservedQuantity || 0) >= 1);
			expect(lo, 'HUB không còn lô SP FIFO khả dụng').toBeTruthy();
			const kho = (await k.goiGhi(pv.page, pv.st, 'GET', `/shops/${D().diemBan.shopId}/inventory`))?.data;
			const khoShop = ((Array.isArray(kho) ? kho : kho?.content || []).find((x) => x.isDefault || x.defaultInventory) || (Array.isArray(kho) ? kho : kho?.content || [])[0])?.id;
			const ma = `A8KK${Date.now().toString().slice(-7)}`;
			const r = await k.goiGhi(pv.page, pv.st, 'POST', '/stock/v2/transfer/v2', { shopId: hub.shopId }, {
				fromInventoryId: hub.inventoryId, fromShopId: hub.shopId, imageIds: [], code: ma, toInventoryId: khoShop, toShopId: D().diemBan.shopId, note: 'AUTO TEST 07_2_060_010',
				reason: '', discountAmount: 0, actionTime: null, exportImmediately: true,
				items: [{ fromProductId: pid, fromVariantId: lo.variantId, fromProductUnitId: lo.productUnitId ?? null, quantity: 1, price: Number(lo.price) || 0, serials: [], batchProducts: [{ batchCode: lo.batchCode, quantity: 1, batchProductId: lo.batchProductId }] }],
			});
			const ct = (await k.goiGhi(pv.page, pv.st, 'GET', `/stock/v2/transfer/v2/${r?.data?.stockTransferId ?? r?.data?.id}`, { shopId: hub.shopId }))?.data;
			require('fs').writeFileSync(path.join(GOC, 'test-output', 'phieu-060_010.lane8.json'), JSON.stringify({ ma, pid }));
			ghiDo(`đang khoá (HUB): ${JSON.stringify(dangKhoa)} · sau bỏ khoá: ${JSON.stringify(boKhoa)} · phiếu ${ma}: ${JSON.stringify(r?.status)} trạng thái ${ct?.status}`);
			expect(dangKhoa.bi, 'Tiền đề: đang khoá mà không chặn chuyển kho').toBe(true);
			expect(boKhoa.bi, 'Đã bỏ khoá mà vẫn chặn').toBe(false);
			expect(String(r?.status?.code), `Chuyển kho SP vừa bỏ khoá lỗi: ${r?.status?.message}`).toBe('200');
			expect(ct?.status, 'Phiếu không ở Chờ xác nhận / Đang đi đường').toMatch(/PENDING|IN_TRANSIT/);
		} finally { await pv.dong(); await s.don(); }
	});

	test('07_2_060_011 — Bên nhận xác nhận phiếu chuyển SP vừa bỏ khoá', async ({ browser }) => {
		chanNeuTat('07_2_060_011');
		const f = path.join(GOC, 'test-output', 'phieu-060_010.lane8.json');
		const { ma, pid } = JSON.parse(require('fs').existsSync(f) ? require('fs').readFileSync(f, 'utf8') : '{}');
		expect(ma, 'Chưa có phiếu của 07_2_060_010 (chạy 060_010 trước)').toBeTruthy();
		const shopId = D().diemBan.shopId;
		const sh = await k.moPhienPhu(browser, 'shop', '/inventory/transfer-warehouse');
		try {
			const ton = async () => ((await k.goiGhi(sh.page, sh.st, 'GET', '/stock/v2/batch-product', { shopId, productId: pid, size: 500 }))?.data || []).reduce((t, l) => t + Number(l.remainQuantity), 0);
			const truoc = await ton();
			let p = null;
			await expect.poll(async () => {
				p = ((await k.goiGhi(sh.page, sh.st, 'GET', '/stock/v2/transfer/v2', { shopIds: shopId, beginTime: Date.now() - 2 * 86400_000, endTime: Date.now() + 86400_000, page: 0, size: 1000 }))?.data || []).find((x) => x.code === ma);
				return Boolean(p);
			}, { timeout: 60_000 }).toBe(true);
			const ct = (await k.goiGhi(sh.page, sh.st, 'GET', `/stock/v2/transfer/v2/${p.stockTransferId}`, { shopId }))?.data;
			const items = ct.items.map((i) => ({ stockTransferItemId: i.stockTransferItemId, quantity: i.quantity, price: i.editPrice, batchProducts: (i.batchProducts || []).map((b) => ({ batchCode: b.batchCode, quantity: b.quantity })) }));
			const kq = await k.goiGhi(sh.page, sh.st, 'PUT', `/stock/v2/transfer/v2/${p.stockTransferId}/confirm`, { shopId }, { code: ct.code, actionTime: Date.now(), imageIds: null, note: 'AUTO TEST 07_2_060_011', items, isMerge: true });
			await sh.page.waitForTimeout(3_000);
			const sau = (await k.goiGhi(sh.page, sh.st, 'GET', `/stock/v2/transfer/v2/${p.stockTransferId}`, { shopId }))?.data;
			const tSau = await ton();
			ghiDo(`${ma}: nhận ${JSON.stringify(kq?.status)} · trạng thái ${sau?.status} · tồn điểm bán ${truoc} ⇒ ${tSau}`);
			expect(String(kq?.status?.code), `Điểm bán nhận lỗi: ${kq?.status?.message}`).toBe('200');
			expect(sau?.status).toMatch(/APPROVED|COMPLETED|RECEIVED/);
			expect(tSau).toBe(truoc + 1);
		} finally { await sh.dong(); }
	});
	test('07_2_060_005 — Bên nhận xác nhận phiếu chuyển lập trước khi khoá', async ({ page, browser }) => {
		chanNeuTat('07_2_060_005');
		const s = await phien(page);
		const pid = spId(D().sanPham.sanPhamTheoGiaVon.fifo.sku);
		const hub = D().hubTinh;
		const shopId = D().diemBan.shopId;
		const pv = await k.moPhienPhu(browser, 'province', '/inventory/transfer-warehouse');
		const sh = await k.moPhienPhu(browser, 'shop', '/inventory/transfer-warehouse');
		try {
			// 1) Tỉnh lập phiếu HUB → điểm bán seed (xuất ngay) KHI CHƯA khoá.
			const lo = ((await k.goiGhi(pv.page, pv.st, 'GET', '/stock/v2/batch-product', { shopId: hub.shopId, productId: pid, size: 500 }))?.data || []).find((l) => Number(l.remainQuantity) - Number(l.reservedQuantity || 0) >= 1);
			expect(lo, 'HUB không còn lô SP FIFO khả dụng').toBeTruthy();
			const kho = (await k.goiGhi(pv.page, pv.st, 'GET', `/shops/${shopId}/inventory`))?.data;
			const khoShop = ((Array.isArray(kho) ? kho : kho?.content || []).find((x) => x.isDefault || x.defaultInventory) || (Array.isArray(kho) ? kho : kho?.content || [])[0])?.id;
			const ma = `A8KK${Date.now().toString().slice(-7)}`;
			const r = await k.goiGhi(pv.page, pv.st, 'POST', '/stock/v2/transfer/v2', { shopId: hub.shopId }, {
				fromInventoryId: hub.inventoryId, fromShopId: hub.shopId, imageIds: [], code: ma, toInventoryId: khoShop, toShopId: shopId, note: 'AUTO TEST 07_2_060_005',
				reason: '', discountAmount: 0, actionTime: null, exportImmediately: true,
				items: [{ fromProductId: pid, fromVariantId: lo.variantId, fromProductUnitId: lo.productUnitId ?? null, quantity: 1, price: Number(lo.price) || 0, serials: [], batchProducts: [{ batchCode: lo.batchCode, quantity: 1, batchProductId: lo.batchProductId }] }],
			});
			expect(String(r?.status?.code), `Lập phiếu tiền đề lỗi: ${r?.status?.message}`).toBe('200');
			const idGui = r?.data?.stockTransferId ?? r?.data?.id;
			// 2) Khoá SP ở điểm bán NHẬN.
			await s.khoa([diemBan()], { productIds: [pid] });
			// 3) Điểm bán xác nhận nhận hàng.
			let p = null;
			await expect.poll(async () => {
				p = ((await k.goiGhi(sh.page, sh.st, 'GET', '/stock/v2/transfer/v2', { shopIds: shopId, beginTime: Date.now() - 2 * 86400_000, endTime: Date.now() + 86400_000, page: 0, size: 1000 }))?.data || []).find((x) => x.code === ma);
				return Boolean(p);
			}, { timeout: 60_000 }).toBe(true);
			const ct = (await k.goiGhi(sh.page, sh.st, 'GET', `/stock/v2/transfer/v2/${p.stockTransferId}`, { shopId }))?.data;
			const items = ct.items.map((i) => ({ stockTransferItemId: i.stockTransferItemId, quantity: i.quantity, price: i.editPrice, batchProducts: (i.batchProducts || []).map((b) => ({ batchCode: b.batchCode, quantity: b.quantity })) }));
			const kq = await k.goiGhi(sh.page, sh.st, 'PUT', `/stock/v2/transfer/v2/${p.stockTransferId}/confirm`, { shopId }, { code: ct.code, actionTime: Date.now(), imageIds: null, note: 'AUTO TEST 07_2_060_005', items, isMerge: true });
			const sau = (await k.goiGhi(sh.page, sh.st, 'GET', `/stock/v2/transfer/v2/${p.stockTransferId}`, { shopId }))?.data;
			ghiDo(`phiếu ${ma} lập trước khoá (xuất ngay, ${ct?.status}) · nhận khi đang khoá: ${JSON.stringify(kq?.status)} · trạng thái sau ${sau?.status} (hàng đã rời HUB)`);
			// 4) Dọn: bỏ khoá rồi cho nhận (không để hàng treo giữa đường).
			await s.don();
			if (String(kq?.status?.code) !== '200') {
				const lai = await k.goiGhi(sh.page, sh.st, 'PUT', `/stock/v2/transfer/v2/${p.stockTransferId}/confirm`, { shopId }, { code: ct.code, actionTime: Date.now(), imageIds: null, note: 'AUTO TEST 07_2_060_005 dọn', items, isMerge: true });
				ghiDo(`dọn: bỏ khoá rồi nhận lại ${JSON.stringify(lai?.status)}`);
			}
			void idGui;
			expect(String(kq?.status?.code), 'Đang khoá mà bên nhận vẫn xác nhận được').not.toBe('200');
			expect(kq?.status?.message ?? '', 'Thông báo không nêu SP đang bị khoá').toMatch(/đang bị khoá|khóa/i);
		} finally { await pv.dong(); await sh.dong(); await s.don(); }
	});
});
