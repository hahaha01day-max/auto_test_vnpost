'use strict';

/**
 * 04_3 · 050_005 / 050_006 — Nhập kho từ đơn hoàn trả (1 lô / nhiều lô), GHI THẬT (26/09/2026). Vai `gdv` (POS).
 *
 * Dựng bằng helper 18_5 `doi-tra.js` (bán POS tiền mặt → mở đổi trả → "Hoàn trả" toàn bộ). Đo tồn từng LÔ của SP giá tiêu chuẩn seed
 * ở điểm bán (`GET /stock/v2/batch-product`) trước bán / sau bán / sau hoàn ⇒ lô bị trừ khi bán, lô được cộng khi hoàn, giá vốn từng lô.
 * Phiếu nhập hoàn: `SHOP_STOCK_IN_OUT` sub_type `RETURN_TO_CUSTOMER` của điểm bán (chỉ SELECT).
 * 🔴 POS chỉ mở ca 05:00–23:45.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chon } = require('../../shared/db/otp');
const dt = require('../../18_5_doi_tra_hang/tests/doi-tra');
const k = require('./ghi-kho');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 1200) });

const spTc = () => {
	const sku = seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan.sku;
	const [productId, variantId] = chon(`select product_id, variant_id from CHAIN_PRODUCT_UNIT where sku='${sku}' and convert_to_main_unit=1 and variant_id is not null limit 1`, 'VNPOST_CORE').split('\t');
	return { productId: +productId, variantId: +variantId };
};
/** { mã lô: { ton, gia } } của mọi lô còn tồn. */
async function anhLo(page, st, shopId, x) {
	const b = await k.goiGhi(page, st, 'GET', '/stock/v2/batch-product', { shopId, productId: x.productId, variantId: x.variantId, size: 500 });
	return Object.fromEntries((b?.data || []).map((l) => [l.batchCode, { ton: Number(l.remainQuantity), gia: Number(l.price), tao: l.createdTime }]));
}
const lech = (a, b) => {
	const kq = {};
	for (const m of new Set([...Object.keys(a), ...Object.keys(b)])) {
		const d = (b[m]?.ton ?? 0) - (a[m]?.ton ?? 0);
		if (Math.abs(d) > 1e-9) kq[m] = d;
	}
	return kq;
};

async function banVaHoan(page, sl) {
	const shopId = dt.SHOP();
	const x = spTc();
	const d = await dt.banDon(page, { sl: sl ?? 1 });
	const st = d.st?.h ? d.st : k.batHeader(page);
	return { d, st, shopId, x };
}

async function chay(page, slFn) {
	const shopId = dt.SHOP();
	const x = spTc();
	// Mở POS trước để có header phiên; ảnh lô trước bán.
	const st0 = k.batHeader(page);
	await dt.p.moBan(page, test);
	await expect.poll(() => Boolean(st0.h), { timeout: 30_000 }).toBe(true);
	const truoc = await anhLo(page, st0, shopId, x);
	const sl = slFn ? slFn(truoc) : 1;
	expect(sl, 'SL tiền đề quá lớn (>300)').toBeLessThanOrEqual(300);
	const d = await dt.banDon(page, { sl });
	await page.waitForTimeout(3_000);
	const sauBan = await anhLo(page, st0, shopId, x);
	const tu = new Date(Date.now() - 60_000).toISOString().slice(0, 19).replace('T', ' ');
	await dt.moDoiTra(page, d.orderId);
	const h = await dt.hoanTra(page);
	await page.waitForTimeout(5_000);
	const sauHoan = await anhLo(page, st0, shopId, x);
	const pn = chon(`select stock_in_out_id, code, status, total_amount, substr(note,1,80) from SHOP_STOCK_IN_OUT where shop_id=${shopId} and type='IMPORT' and sub_type='RETURN_TO_CUSTOMER' order by stock_in_out_id desc limit 1`, 'VNPOST_POD_02');
	const ban = lech(truoc, sauBan);
	const hoan = lech(sauBan, sauHoan);
	return { d, h, sl, truoc, sauBan, sauHoan, ban, hoan, pn, tu };
}

test.describe('04_3 · 050 — Nhập kho từ đơn hoàn trả (GHI, POS)', () => {
	test.describe.configure({ timeout: 480_000 });

	test('04_3_050_005 — Nhập kho sản phẩm có 1 lô từ đơn hoàn trả', async ({ page }) => {
		chanNeuTat('04_3_050_005');
		const r = await chay(page);
		const loBan = Object.keys(r.ban);
		const loHoan = Object.keys(r.hoan);
		ghiDo(`đơn ${r.d.orderNumber} SL ${r.sl} · hoàn: ${r.h.tb} · lô trừ khi bán ${JSON.stringify(r.ban)} (giá ${JSON.stringify(loBan.map((m) => r.truoc[m]?.gia))}) · lô cộng khi hoàn ${JSON.stringify(r.hoan)} (giá ${JSON.stringify(loHoan.map((m) => r.sauHoan[m]?.gia))}) · phiếu nhập hoàn ${r.pn.replace(/\t/g, ' ')}`);
		expect(loBan.length, 'Bán 1 cái mà không trừ đúng 1 lô').toBe(1);
		expect(loHoan.length, 'Hoàn trả không cộng lại tồn lô nào').toBeGreaterThan(0);
		expect(loHoan, '🔴 Hàng trả không về đúng lô đã xuất ban đầu').toEqual(loBan);
		expect(r.hoan[loBan[0]]).toBe(r.sl);
		expect(r.sauHoan[loBan[0]].gia, 'Giá vốn lô sau hoàn ≠ giá vốn lúc xuất').toBe(r.truoc[loBan[0]].gia);
	});

	test('04_3_050_006 — Nhập kho sản phẩm có nhiều lô từ đơn hoàn trả', async ({ page }) => {
		chanNeuTat('04_3_050_006');
		// POS xuất theo HẠN DÙNG (FEFO: expiry_date rồi batch_product_id — đo 26/09) ⇒ SL = tồn khả dụng lô FEFO đầu + 1 buộc lấy ≥ 2 lô.
		const r = await chay(page, () => {
			const x = spTc();
			const dau = chon(`select remain_quantity - coalesce(reserved_quantity,0) from STOCK_BATCH_PRODUCTS where shop_id=${dt.SHOP()} and variant_id=${x.variantId} and remain_quantity > coalesce(reserved_quantity,0) and (deleted is null or deleted=0) order by expiry_date, batch_product_id limit 1`, 'VNPOST_POD_02');
			return Math.round(Number(dau)) + 1;
		});
		const loBan = Object.keys(r.ban).sort();
		const loHoan = Object.keys(r.hoan).sort();
		ghiDo(`đơn ${r.d.orderNumber} SL ${r.sl} · hoàn: ${r.h.tb} · lô trừ khi bán ${JSON.stringify(r.ban)} · lô cộng khi hoàn ${JSON.stringify(r.hoan)} · giá lô bán ${JSON.stringify(Object.fromEntries(loBan.map((m) => [m, r.truoc[m]?.gia])))} · giá lô hoàn ${JSON.stringify(Object.fromEntries(loHoan.map((m) => [m, r.sauHoan[m]?.gia])))} · phiếu ${r.pn.replace(/\t/g, ' ')}`);
		expect(loBan.length, `Đơn SL ${r.sl} không lấy từ nhiều lô — không dựng được tiền đề`).toBeGreaterThan(1);
		expect(loHoan, '🔴 Hàng trả không phân bổ về đúng các lô đã xuất').toEqual(loBan);
		for (const m of loBan) expect(r.hoan[m], `Lô ${m}: SL hoàn ≠ SL đã bán từ lô`).toBe(-r.ban[m]);
		for (const m of loBan) expect(r.sauHoan[m].gia, `Lô ${m}: giá vốn đổi sau hoàn`).toBe(r.truoc[m].gia);
	});
});
