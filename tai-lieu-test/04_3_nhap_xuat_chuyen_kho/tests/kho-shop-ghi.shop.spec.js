'use strict';

/**
 * 04_3 — Nhập/xuất ở ĐIỂM BÁN seed: NCC, giá vốn MAC/FIFO/đích danh, serial, tồn âm, sửa/huỷ phiếu, thanh toán phiếu nhập (26/09/2026).
 * Vai chính `shop` (CHT — đọc giao diện, thanh toán); ghi phiếu bằng phiên phụ `seed_gdv` qua ĐÚNG API form dùng
 * (`POST /stock/v3/import-export` + `/confirm`) vì: (1) CHT bị tắt CREATE_IMPORT_STOCK, (2) form nhập cấp điểm bán KHÔNG có ô "Nhập từ NCC"
 * và khoá ô SL của SP MAC/FIFO/đích danh ("Chưa có bảng giá", isPriceMissing) — hai chỗ này ghi ở báo cáo.
 * Sửa phiếu đã ghi sổ = `POST /stock/v2/import-export/{id}/adjustments` {type QUANTITY|LOCATION} (DrawerAdjustImportReceipt — KHÔNG có sửa giá);
 * huỷ = `POST …/{id}/adjustment` {reason}; kiểm cho phép = `GET …/{id}/adjustable`.
 * Tồn âm: `shared/ban-am.js` thêm điểm bán làn vào phạm vi bán âm (chụp gốc, trả lại ở finally).
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
const hau = () => Date.now().toString().slice(-6);
const POD = () => process.env.VNPOST_POD_SHOP || 'VNPOST_POD_02';
const sql = (q) => chon(q, POD());
const idNcc = () => Number(chon(`select supplier_id from CHAIN_SUPPLIER where code='${d().nhaCungCap.maNcc}'`, 'VNPOST_CORE'));
const donVi = (sku) => { const [productUnitId, productId, variantId, unit] = chon(`select product_unit_id, product_id, variant_id, unit from CHAIN_PRODUCT_UNIT where sku='${sku}' and variant_id is not null and convert_to_main_unit=1 order by product_unit_id limit 1`, 'VNPOST_CORE').split('\t'); return { sku, productUnitId: +productUnitId, productId: +productId, variantId: +variantId, unit }; };
const SP = { MAC: () => d().danhMucB.ngk.sku, FIFO: () => d().sanPham.sanPhamTheoGiaVon.fifo.sku, DD: () => d().sanPham.sanPhamTheoGiaVon.dichDanh.sku, TC: () => d().sanPham.sanPhamTheoGiaVon.tieuChuan.sku };

async function moGdv(browser) {
	const ps = await k.moPhienPhu(browser, 'seed_gdv', '/inventory/import');
	const shopId = Number(ps.st.h.shopid);
	const kho = ((await k.goiGhi(ps.page, ps.st, 'GET', `/shops/${shopId}/inventory`))?.data || []).find((x) => x.isDefault)?.id;
	return { ...ps, shopId, kho, goi: (m, u, q, b) => k.goiGhi(ps.page, ps.st, m, u, q, b) };
}
const loCua = async (g, x) => ((await g.goi('GET', '/stock/v2/batch-product', { shopId: g.shopId, productId: x.productId, variantId: x.variantId, size: 500 }))?.data || []);
const tonVar = async (g, x) => (await loCua(g, x)).reduce((s, l) => s + Number(l.remainQuantity), 0);
// Giá bình quân = SHOP_STOCK.price_avg (kho mặc định điểm bán seed).
const giaMac = (x) => Number(sql(`select coalesce(max(price_avg),0) from SHOP_STOCK where shop_id=${d().diemBan.shopId} and variant_id=${x.variantId} and coalesce(active,1)=1`)) || 0;

/** Nhập kho (ncc: từ NCC seed; khác: nhập lẻ) — trả id phiếu. */
async function nhap(g, x, { sl, gia, lo, ncc = false, serials = [], xacNhan = true }) {
	const ngay = new Date().toISOString().slice(0, 10);
	const r = await g.goi('POST', '/stock/v3/import-export', { shopId: g.shopId }, {
		code: `NK${hau()}${ncc ? 'N' : 'L'}`, objectId: ncc ? idNcc() : 0, objectType: ncc ? 'SUPPLIER' : 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0,
		note: 'AUTO TEST 04_3 kho-shop', actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: false,
		items: [{ amount: sl * gia, price: gia, productId: x.productId, productName: x.sku, batchCode: null,
			batchProducts: [{ batchCode: lo ?? `A${process.env.VNPOST_LANE || ''}KS${hau()}`, quantity: sl, manufactureDate: ngay, expiryDate: '2028-12-31', serials }],
			quantity: sl, serials, totalAmount: sl * gia, unit: x.unit, variantId: x.variantId, variantName: null, itemId: null, shopId: g.shopId, inventoryId: g.kho, productUnit: x.unit, convertToMainUnit: 1, productUnitId: x.productUnitId }],
	});
	const id = r?.data?.stockInOutId ?? r?.stockInOutId;
	expect(id, `Tạo phiếu nhập lỗi: ${JSON.stringify(r?.status ?? r).slice(0, 300)}`).toBeTruthy();
	if (xacNhan) { const c = await g.goi('POST', '/stock/v3/import-export/confirm', { shopId: g.shopId, stockInOutId: id }); expect(String(c?.status?.code ?? '200'), `Xác nhận phiếu nhập lỗi: ${JSON.stringify(c?.status)}`).toBe('200'); }
	return id;
}
/** Xuất kho (lý do "Xuất dùng nội bộ") theo lô chỉ định hoặc lô đầu; trả { id, kq }. */
async function xuat(g, x, { sl, lo, serials = [] }) {
	const dsLo = await loCua(g, x);
	const l = lo ? dsLo.find((z) => z.batchCode === lo) : dsLo.find((z) => Number(z.remainQuantity) > 0) || dsLo[0];
	const r = await g.goi('POST', '/stock/v3/import-export', { shopId: g.shopId }, {
		code: `XK${hau()}`, objectId: 0, objectType: 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0, note: 'AUTO TEST 04_3 kho-shop xuất',
		actionTime: Date.now(), type: 'EXPORT', subType: 'EXPORT', reasonCode: 'INTERNAL_USE', enableVat: false,
		items: [{ amount: 0, price: Number(l?.price ?? 0), productId: x.productId, productName: x.sku, batchCode: null,
			batchProducts: l ? [{ batchCode: l.batchCode, quantity: sl, batchProductId: l.batchProductId, serials }] : [], quantity: sl, serials, totalAmount: 0, unit: x.unit,
			variantId: x.variantId, variantName: null, itemId: null, shopId: g.shopId, inventoryId: g.kho, productUnit: x.unit, convertToMainUnit: 1, productUnitId: x.productUnitId }],
	});
	const id = r?.data?.stockInOutId ?? r?.stockInOutId;
	const c = id ? await g.goi('POST', '/stock/v3/import-export/confirm', { shopId: g.shopId, stockInOutId: id }) : null;
	return { id, tao: r?.status, xacNhan: c?.status };
}
const dongPhieu = (id) => sql(`select price, quantity, amount, pre_quantity, post_quantity, coalesce(base_price,0), batch_products from SHOP_STOCK_IN_OUT_ITEM where stock_in_out_id=${id} limit 1`).split('\t');
const noNcc = () => Number(sql(`select coalesce(sum(total_amount),0) from SUPPLIER_DEBT_HISTORY where supplier_id=${idNcc()} and shop_id=${d().diemBan.shopId} and coalesce(is_deleted,0)=0`));

test.describe('04_3 — Kho điểm bán (GHI)', () => {
	test.describe.configure({ timeout: 360_000 });

	// ─── Nhập từ NCC · công nợ · thanh toán · huỷ / sửa ─────────────────────────────────
	test('04_3_020_006 — Nhập kho từ nhà cung cấp', async ({ page, browser }) => {
		chanNeuTat('04_3_020_006');
		await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/import`, 'shop');
		const nhapForm = await page.getByRole('button', { name: /Nhập kho|Tạo phiếu nhập|Thêm mới/ }).first().isVisible().catch(() => false);
		const g = await moGdv(browser);
		try {
			const x = donVi(SP.MAC());
			const tonTruoc = await tonVar(g, x);
			const noTruoc = noNcc();
			const id = await nhap(g, x, { sl: 3, gia: 15_000, ncc: true });
			const [objT, objId] = sql(`select object_type, object_id from SHOP_STOCK_IN_OUT where stock_in_out_id=${id}`).split('\t');
			const tonSau = await tonVar(g, x);
			const noSau = noNcc();
			ghiDo(`(CHT thấy nút lập phiếu nhập: ${nhapForm}; form cấp điểm bán không có ô "Nhập từ NCC" — lập qua API form) phiếu ${id}: ${objT}/${objId} · tồn ${tonTruoc} ⇒ ${tonSau} · nợ NCC ${noTruoc} ⇒ ${noSau}`);
			expect(`${objT}/${objId}`).toBe(`SUPPLIER/${idNcc()}`);
			expect(tonSau).toBe(tonTruoc + 3);
			expect(noSau - noTruoc, 'Công nợ NCC không tăng đúng tổng tiền phiếu').toBe(45_000);
		} finally { await g.dong(); }
	});

	async function thanhToanUi(page, g, id, soTien) {
		const code = sql(`select code from SHOP_STOCK_IN_OUT where stock_in_out_id=${id}`);
		await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/import`, 'shop');
		await page.waitForTimeout(3_000);
		const o = page.locator('.ant-pro-page-container').first().getByPlaceholder(/Tìm|mã phiếu/i).first();
		if (await o.count()) { await o.fill(code); await o.press('Enter'); await page.waitForTimeout(2_500); }
		const dong = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: code }).first();
		await expect(dong, `Không thấy phiếu ${code}`).toBeVisible({ timeout: 20_000 });
		await dong.getByText(code).first().click();
		const dr = page.locator('.ant-drawer-open').last();
		await dr.getByRole('button', { name: 'Thanh toán', exact: true }).click();
		const tt = page.locator('.ant-drawer-open').last();
		const oTien = tt.locator('.ant-input-number-input').first();
		await oTien.fill(String(soTien));
		await oTien.press('Tab');
		const tb = page.locator('.ant-message-notice').first().waitFor({ timeout: 15_000 }).then(() => page.locator('.ant-message-notice').allInnerTexts()).catch(() => []);
		await tt.getByRole('button', { name: /Xác nhận|Thanh toán|Lưu/ }).last().click();
		return (await tb).join(' | ');
	}
	test('04_3_020_011 — Thanh toán một phần phiếu nhập kho', async ({ page, browser }) => {
		chanNeuTat('04_3_020_011');
		const g = await moGdv(browser);
		try {
			const id = await nhap(g, donVi(SP.MAC()), { sl: 4, gia: 10_000, ncc: true });
			const noTruoc = noNcc();
			const tb = await thanhToanUi(page, g, id, 15_000);
			await page.waitForTimeout(2_000);
			const [paid, tong] = sql(`select coalesce(paid_amount,0), total_amount from SHOP_STOCK_IN_OUT where stock_in_out_id=${id}`).split('\t').map(Number);
			ghiDo(`thanh toán 15.000/40.000: "${tb}" · phiếu đã trả ${paid}/${tong} · nợ NCC ${noTruoc} ⇒ ${noNcc()}`);
			expect(noTruoc - noNcc(), 'Công nợ NCC không giảm đúng số đã trả').toBe(15_000);
			expect(paid, 'Phiếu không ghi số đã trả 15.000').toBe(15_000);
		} finally { await g.dong(); }
	});
	test('04_3_020_012 — Thanh toán toàn bộ phiếu nhập kho', async ({ page, browser }) => {
		chanNeuTat('04_3_020_012');
		const g = await moGdv(browser);
		try {
			const id = await nhap(g, donVi(SP.MAC()), { sl: 2, gia: 10_000, ncc: true });
			const noTruoc = noNcc();
			const tb = await thanhToanUi(page, g, id, 20_000);
			await page.waitForTimeout(2_000);
			const [paid, tong] = sql(`select coalesce(paid_amount,0), total_amount from SHOP_STOCK_IN_OUT where stock_in_out_id=${id}`).split('\t').map(Number);
			ghiDo(`thanh toán đủ: "${tb}" · phiếu ${paid}/${tong} · nợ NCC ${noTruoc} ⇒ ${noNcc()}`);
			expect(paid).toBe(tong);
			expect(noTruoc - noNcc()).toBe(20_000);
		} finally { await g.dong(); }
	});

	test('04_3_040_005 — Công nợ NCC sau khi huỷ phiếu nhập', async ({ browser }) => {
		chanNeuTat('04_3_040_005');
		const g = await moGdv(browser);
		try {
			const truoc = noNcc();
			const id = await nhap(g, donVi(SP.MAC()), { sl: 2, gia: 11_000, ncc: true });
			const coPhieu = noNcc();
			const dongTruoc = Number(sql(`select count(*) from SUPPLIER_DEBT_HISTORY where supplier_id=${idNcc()} and shop_id=${d().diemBan.shopId}`));
			const a = await g.goi('GET', `/stock/v2/import-export/${id}/adjustable`, { shopId: g.shopId });
			const h = await g.goi('POST', `/stock/v2/import-export/${id}/adjustment`, { shopId: g.shopId }, { reason: 'AUTO TEST 04_3_040_005 huỷ phiếu NCC' });
			const sau = noNcc();
			const dongSau = Number(sql(`select count(*) from SUPPLIER_DEBT_HISTORY where supplier_id=${idNcc()} and shop_id=${d().diemBan.shopId}`));
			ghiDo(`adjustable ${JSON.stringify(a?.data)} · huỷ ${JSON.stringify(h?.status)} · nợ ${truoc} ⇒ ${coPhieu} ⇒ ${sau} · dòng sổ ${dongTruoc} ⇒ ${dongSau}`);
			expect(String(h?.status?.code), `Huỷ phiếu nhập NCC lỗi: ${h?.status?.message}`).toBe('200');
			expect(sau, 'Huỷ phiếu mà công nợ không về mức trước').toBe(truoc);
			expect(dongSau, 'Huỷ phải thêm DÒNG cấn trừ, không sửa dòng cũ').toBe(dongTruoc + 1);
		} finally { await g.dong(); }
	});

	async function suaSl(g, id, slMoi) {
		const a = await g.goi('GET', `/stock/v2/import-export/${id}/adjustable`, { shopId: g.shopId });
		const it = (a?.data?.currentItems || [])[0];
		const r = await g.goi('POST', `/stock/v2/import-export/${id}/adjustments`, { shopId: g.shopId }, { type: 'QUANTITY', reason: 'AUTO TEST 04_3 sửa SL', items: [{ itemId: it?.itemId, quantity: slMoi }] });
		return { a: a?.data, r: r?.status };
	}
	test('04_3_020_009 — Sửa phiếu nhập khi sản phẩm CHƯA phát sinh xuất kho', async ({ browser }) => {
		chanNeuTat('04_3_020_009');
		const g = await moGdv(browser);
		try {
			const x = donVi(SP.FIFO());
			const lo = `A8S9${hau()}`;
			const id = await nhap(g, x, { sl: 5, gia: 20_000, lo, ncc: true });
			const s = await suaSl(g, id, 3);
			const l = (await loCua(g, x)).find((z) => z.batchCode === lo);
			const dc = sql(`select stock_in_out_id, type, sub_type from SHOP_STOCK_IN_OUT where shop_id=${d().diemBan.shopId} and stock_in_out_id>${id} and note like '%sửa SL%' order by 1 desc limit 2`);
			ghiDo(`sửa SL 5→3: ${JSON.stringify(s.r)} (blockers ${JSON.stringify(s.a?.blockers)}) · lô ${lo} còn ${l?.remainQuantity} · chứng từ điều chỉnh ${dc.replace(/\n/g, ' ; ') || '-'} · 🔴 form KHÔNG cho sửa giá (chỉ QUANTITY/LOCATION)`);
			expect(String(s.r?.code), `Sửa SL phiếu nhập lỗi: ${s.r?.message}`).toBe('200');
			expect(Number(l?.remainQuantity)).toBe(3);
		} finally { await g.dong(); }
	});
	test('04_3_050_007 — Sửa phiếu nhập của lô CHƯA phát sinh xuất', async ({ browser }) => {
		chanNeuTat('04_3_050_007');
		const g = await moGdv(browser);
		try {
			const x = donVi(SP.FIFO());
			const lo = `A8S7${hau()}`;
			const id = await nhap(g, x, { sl: 4, gia: 21_000, lo, ncc: true });
			const s = await suaSl(g, id, 6);
			const l = (await loCua(g, x)).find((z) => z.batchCode === lo);
			ghiDo(`sửa SL 4→6: ${JSON.stringify(s.r)} · lô còn ${l?.remainQuantity} giá ${l?.price}`);
			expect(String(s.r?.code)).toBe('200');
			expect(Number(l?.remainQuantity)).toBe(6);
			expect(Number(l?.price)).toBe(21_000);
		} finally { await g.dong(); }
	});
	async function suaDaXuat(browser) {
		const g = await moGdv(browser);
		try {
			const x = donVi(SP.FIFO());
			const lo = `A8SX${hau()}`;
			const id = await nhap(g, x, { sl: 5, gia: 22_000, lo, ncc: true });
			await xuat(g, x, { sl: 3, lo });
			const s = await suaSl(g, id, 2); // dưới số đã xuất
			const l = (await loCua(g, x)).find((z) => z.batchCode === lo);
			ghiDo(`đã xuất 3/5, sửa SL xuống 2: ${JSON.stringify(s.r)} · blockers ${JSON.stringify(s.a?.blockers)} · lô còn ${l?.remainQuantity} · sửa giá: không có chức năng`);
			expect(String(s.r?.code), '🔴 Cho giảm SL phiếu nhập xuống dưới số đã xuất (tồn âm)').not.toBe('200');
			expect(Number(l?.remainQuantity)).toBeGreaterThanOrEqual(0);
		} finally { await g.dong(); }
	}
	test('04_3_020_010 — Sửa phiếu nhập khi sản phẩm ĐÃ phát sinh xuất kho', async ({ browser }) => { chanNeuTat('04_3_020_010'); await suaDaXuat(browser); });
	test('04_3_050_008 — Sửa phiếu nhập của lô ĐÃ phát sinh xuất', async ({ browser }) => { chanNeuTat('04_3_050_008'); await suaDaXuat(browser); });

	// ─── Giá vốn theo phương pháp ────────────────────────────────────────────────────
	test('04_3_020_013 — Giá vốn sau nhập kho sản phẩm MAC', async ({ browser }) => {
		chanNeuTat('04_3_020_013');
		const g = await moGdv(browser);
		try {
			const x = donVi(SP.MAC());
			const q0 = await tonVar(g, x);
			const p0 = giaMac(x);
			await nhap(g, x, { sl: 10, gia: 30_000 });
			const q1 = await tonVar(g, x);
			const p1 = giaMac(x);
			const kyVong = (q0 * p0 + 10 * 30_000) / (q0 + 10);
			ghiDo(`Q0 ${q0} P0 ${p0} · nhập 10 × 30.000 ⇒ Q ${q1} P ${p1} · tính tay ${kyVong.toFixed(6)} · (ô SL form điểm bán KHOÁ với SP MAC — "Chưa có bảng giá")`);
			expect(q1).toBe(q0 + 10);
			expect(Math.abs(p1 - kyVong), 'Giá bình quân mới lệch công thức').toBeLessThan(0.01);
		} finally { await g.dong(); }
	});
	test('04_3_020_014 — Giá vốn sau nhập kho sản phẩm FIFO', async ({ browser }) => {
		chanNeuTat('04_3_020_014');
		const g = await moGdv(browser);
		try {
			const x = donVi(SP.FIFO());
			const truoc = await loCua(g, x);
			const lo = `A8F${hau()}`;
			await nhap(g, x, { sl: 3, gia: 77_000, lo });
			const sau = await loCua(g, x);
			const moi = sau.find((z) => z.batchCode === lo);
			const doi = truoc.filter((a) => { const b = sau.find((z) => z.batchCode === a.batchCode); return !b || Number(b.price) !== Number(a.price) || Number(b.remainQuantity) !== Number(a.remainQuantity); });
			ghiDo(`lô mới ${lo}: ${moi?.remainQuantity} × ${moi?.price} · lô cũ bị đổi: ${doi.map((z) => z.batchCode).join(',') || 'không'}`);
			expect(Number(moi?.price)).toBe(77_000);
			expect(doi, 'Nhập lô mới làm đổi giá/tồn lô cũ (bình quân nhầm)').toEqual([]);
		} finally { await g.dong(); }
	});
	test('04_3_020_015 — Giá vốn sau nhập kho sản phẩm thực tế đích danh', async ({ browser }) => {
		chanNeuTat('04_3_020_015');
		const g = await moGdv(browser);
		try {
			const x = donVi(SP.DD());
			const lo = `A8D${hau()}`;
			const serials = [`A8SR${hau()}1`, `A8SR${hau()}2`];
			const id = await nhap(g, x, { sl: 2, gia: 88_000, lo, serials });
			const l = (await loCua(g, x)).find((z) => z.batchCode === lo);
			ghiDo(`lô ${lo} ${l?.remainQuantity} × ${l?.price} · serial ${serials.join(',')} · dòng phiếu ${dongPhieu(id).slice(0, 2).join('/')}`);
			expect(Number(l?.price)).toBe(88_000);
			expect(Number(l?.remainQuantity)).toBe(2);
		} finally { await g.dong(); }
	});
	test('04_3_010_019 — Giá vốn khi xuất kho sản phẩm BQGQ (MAC)', async ({ browser }) => {
		chanNeuTat('04_3_010_019');
		const g = await moGdv(browser);
		try {
			const x = donVi(SP.MAC());
			await nhap(g, x, { sl: 5, gia: 25_000 });
			const pTruoc = giaMac(x);
			const r = await xuat(g, x, { sl: 2 });
			const [gia] = dongPhieu(r.id);
			const pSau = giaMac(x);
			ghiDo(`giá BQ trước ${pTruoc} · dòng xuất ${gia} · giá BQ sau ${pSau} · ${JSON.stringify(r.xacNhan)}`);
			expect(Math.abs(Number(gia) - pTruoc), 'Giá vốn dòng xuất ≠ giá bình quân lúc xuất').toBeLessThan(0.01);
			expect(Math.abs(pSau - pTruoc), 'Xuất kho làm đổi giá bình quân').toBeLessThan(0.01);
		} finally { await g.dong(); }
	});
	test('04_3_010_021 — Thông tin lô của sản phẩm thực tế đích danh', async ({ browser }) => {
		chanNeuTat('04_3_010_021');
		const g = await moGdv(browser);
		try {
			const x = donVi(SP.DD());
			const lo = `A8DX${hau()}`;
			const serials = [`A8SX${hau()}1`];
			await nhap(g, x, { sl: 1, gia: 99_000, lo, serials });
			const r = await xuat(g, x, { sl: 1, lo, serials });
			const dp = dongPhieu(r.id);
			ghiDo(`xuất ${JSON.stringify(r.xacNhan)} · giá dòng ${dp[0]} · batch_products ${String(dp[6]).slice(0, 250)}`);
			expect(String(dp[6])).toContain(lo);
			expect(String(dp[6])).toContain(serials[0]);
			expect(Number(dp[0])).toBe(99_000);
		} finally { await g.dong(); }
	});

	// ─── Serial ───────────────────────────────────────────────────────────────────────
	test('04_3_030_010 — Xuất kho chọn mã serial', async ({ browser }) => {
		chanNeuTat('04_3_030_010');
		const g = await moGdv(browser);
		try {
			const x = donVi(SP.DD());
			const lo = `A8SE${hau()}`;
			const s = [1, 2, 3].map((i) => `A8SE${hau()}${i}`);
			await nhap(g, x, { sl: 3, gia: 50_000, lo, serials: s });
			const thieu = await xuat(g, x, { sl: 2, lo, serials: [s[0]] });
			const du = await xuat(g, x, { sl: 2, lo, serials: [s[0], s[1]] });
			const tt = sql(`select serial_number, status from SHOP_STOCK_SERIAL where serial_number in ('${s.join("','")}')`).replace(/\n/g, ' ; ');
			ghiDo(`chọn thiếu (2 SL, 1 serial): ${JSON.stringify(thieu.tao)} / ${JSON.stringify(thieu.xacNhan)} · đủ: ${JSON.stringify(du.xacNhan)} · serial: ${tt}`);
			expect(String(thieu.xacNhan?.code ?? thieu.tao?.code), 'Chọn thiếu serial so với SL vẫn xuất được').not.toBe('200');
			expect(String(du.xacNhan?.code)).toBe('200');
		} finally { await g.dong(); }
	});

	// ─── Tồn 0 / tồn âm ───────────────────────────────────────────────────────────────
	test('04_3_030_008 — Xuất kho khi tồn bằng 0', async ({ browser }) => {
		chanNeuTat('04_3_030_008');
		const g = await moGdv(browser);
		try {
			const x = donVi(SP.FIFO());
			const lo = `A8Z${hau()}`;
			await nhap(g, x, { sl: 1, gia: 10_000, lo });
			await xuat(g, x, { sl: 1, lo }); // lô về 0
			const r = await xuat(g, x, { sl: 1, lo });
			ghiDo(`xuất 1 từ lô tồn 0: tạo ${JSON.stringify(r.tao)} · xác nhận ${JSON.stringify(r.xacNhan)} (chính sách bán âm điểm bán: mặc định TẮT)`);
			expect(String(r.xacNhan?.code ?? r.tao?.code), 'Tồn 0 mà vẫn xuất được khi chưa bật bán âm').not.toBe('200');
		} finally { await g.dong(); }
	});

	/** Bật bán âm cho điểm bán seed (shared/ban-am.js › bat/khoiPhuc — chụp gốc, trả lại ở finally). */
	async function voiBanAm(browser, fn) {
		const banAm = require('../../shared/ban-am');
		await banAm.bat(browser, d().diemBan.maShop);
		try { return await fn(); } finally { await banAm.khoiPhuc(browser); }
	}
	test('04_3_030_009 — Xuất kho khi tồn đang ÂM', async ({ browser }) => {
		chanNeuTat('04_3_030_009');
		const g = await moGdv(browser);
		try {
			await voiBanAm(browser, async () => {
				const x = donVi(SP.FIFO());
				const lo = `A8AM${hau()}`;
				await nhap(g, x, { sl: 1, gia: 12_000, lo });
				const a = await xuat(g, x, { sl: 2, lo });
				const b = await xuat(g, x, { sl: 1, lo });
				const l = (await loCua(g, x)).find((z) => z.batchCode === lo);
				ghiDo(`xuất vượt (âm): ${JSON.stringify(a.xacNhan)} · xuất tiếp khi âm: ${JSON.stringify(b.xacNhan)} · tồn lô ${l?.remainQuantity} giá ${l?.price} · giá dòng xuất ${dongPhieu(b.id ?? a.id)[0]}`);
				expect(a.xacNhan || a.tao, 'Không lập được phiếu xuất').toBeTruthy();
			});
		} finally { await g.dong(); }
	});
	test('04_3_050_010 — Nhập kho khi tồn đang ÂM', async ({ browser }) => {
		chanNeuTat('04_3_050_010');
		const g = await moGdv(browser);
		try {
			await voiBanAm(browser, async () => {
				const x = donVi(SP.MAC());
				const q0 = await tonVar(g, x);
				const a = await xuat(g, x, { sl: q0 + 2 }); // đẩy âm 2
				const qAm = await tonVar(g, x);
				const pAm = giaMac(x);
				await nhap(g, x, { sl: 10, gia: 40_000 });
				const q1 = await tonVar(g, x);
				ghiDo(`xuất vượt ${JSON.stringify(a.xacNhan)} · tồn âm ${qAm} (giá ${pAm}) · nhập 10 × 40.000 ⇒ tồn ${q1} giá ${giaMac(x)}`);
				expect(q1).toBe(qAm + 10);
			});
		} finally { await g.dong(); }
	});
	test('04_3_060_011 — Chuyển kho khi tồn ÂM', async ({ browser }) => {
		chanNeuTat('04_3_060_011');
		const g = await moGdv(browser);
		try {
			await voiBanAm(browser, async () => {
				const x = donVi(SP.FIFO());
				const lo = `A8CT${hau()}`;
				await nhap(g, x, { sl: 1, gia: 9_000, lo });
				await xuat(g, x, { sl: 2, lo });
				const nhanShop = d().diemBanNhan;
				const r = await g.goi('POST', '/stock/v2/transfer/v2', { shopId: g.shopId }, {
					fromInventoryId: g.kho, fromShopId: g.shopId, imageIds: [], code: `A8CA${hau()}`, toInventoryId: nhanShop.inventoryId, toShopId: nhanShop.shopId, note: 'AUTO TEST 04_3_060_011',
					reason: '', discountAmount: 0, actionTime: null, exportImmediately: true,
					items: [{ fromProductId: x.productId, fromVariantId: x.variantId, fromProductUnitId: x.productUnitId, quantity: 1, price: 9_000, serials: [], batchProducts: [{ batchCode: lo, quantity: 1 }] }],
				});
				ghiDo(`chuyển 1 từ lô đang âm: ${JSON.stringify(r?.status)}`);
				expect(r?.status, 'Không nhận được phản hồi').toBeTruthy();
				if (String(r?.status?.code) === '200') await k.donPhieuChuyen(g.page, g.st, g.shopId, r?.data?.stockTransferId);
			});
		} finally { await g.dong(); }
	});
});
