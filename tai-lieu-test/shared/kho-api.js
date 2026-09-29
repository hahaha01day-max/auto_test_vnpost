'use strict';

/**
 * Helper API kho cấp ĐIỂM BÁN seed của làn (26/09/2026) — nhập / xuất / chuyển / tồn lô / giá bình quân.
 * Ghi bằng phiên phụ `seed_gdv` qua ĐÚNG API form nhập–xuất dùng (`POST /stock/v3/import-export` + `/confirm`; khuôn seed 16.2 và
 * `04_3/tests/kho-shop-ghi.shop.spec.js`). Đọc SELECT pod của điểm bán (tra `CONFIG_ROUTING` qua shopId có trong SHOP_STOCK).
 * 🔴 Nhập kho BẮT BUỘC có lô. Xuất thủ công BẮT BUỘC `reasonCode` (danh mục VNPOST_CORE.STOCK_ISSUE_REASON — dùng INTERNAL_USE).
 */

const { expect } = require('@playwright/test');
const seed = require('../00_seed/seed-state');
const { chon } = require('./db/otp');
const k = require('../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const d = () => seed.doc().duLieu;
const hau = () => Date.now().toString().slice(-6);
const PODS = ['VNPOST_POD_01', 'VNPOST_POD_02', 'VNPOST_POD_03'];
let podCache = null;
/** Pod chứa dữ liệu của điểm bán seed (dò bảng SHOP_STOCK). */
function podShop() {
	if (podCache) return podCache;
	const shopId = d().diemBan.shopId;
	for (const db of PODS) { try { if (Number(chon(`select count(*) from SHOP_STOCK where shop_id=${shopId}`, db)) > 0) { podCache = db; return db; } } catch { /* pod khác */ } }
	podCache = 'VNPOST_POD_02';
	return podCache;
}
const sql = (q) => chon(q, podShop());
const idNcc = (ma = d().nhaCungCap.maNcc) => Number(chon(`select supplier_id from CHAIN_SUPPLIER where code='${ma}'`, 'VNPOST_CORE'));
function donVi(sku) {
	const [productUnitId, productId, variantId, unit] = chon(`select product_unit_id, product_id, variant_id, unit from CHAIN_PRODUCT_UNIT where sku='${sku}' and variant_id is not null and convert_to_main_unit=1 order by product_unit_id limit 1`, 'VNPOST_CORE').split('\t');
	expect(productId, `Không tra được đơn vị SKU ${sku}`).toBeTruthy();
	return { sku, productUnitId: +productUnitId, productId: +productId, variantId: +variantId, unit };
}
const SP = {
	TC: () => d().sanPham.sanPhamTheoGiaVon.tieuChuan.sku,
	FIFO: () => d().sanPham.sanPhamTheoGiaVon.fifo.sku,
	DD: () => d().sanPham.sanPhamTheoGiaVon.dichDanh.sku,
	MAC: () => d().sanPham.sanPhamTheoGiaVon.mac?.sku || d().danhMucB?.ngk?.sku,
};

async function moGdv(browser, vai = 'seed_gdv') {
	const ps = await k.moPhienPhu(browser, vai, '/inventory/import');
	const shopId = Number(ps.st.h.shopid);
	const kho = ((await k.goiGhi(ps.page, ps.st, 'GET', `/shops/${shopId}/inventory`))?.data || []).find((x) => x.isDefault)?.id;
	return { ...ps, shopId, kho, goi: (m, u, q, b) => k.goiGhi(ps.page, ps.st, m, u, q, b) };
}
const loCua = async (g, x) => ((await g.goi('GET', '/stock/v2/batch-product', { shopId: g.shopId, productId: x.productId, variantId: x.variantId, size: 500 }))?.data || []);
const tonVar = async (g, x) => (await loCua(g, x)).reduce((s, l) => s + Number(l.remainQuantity), 0);
const tonSo = (x) => Number(sql(`select coalesce(sum(quantity),0) from SHOP_STOCK where shop_id=${d().diemBan.shopId} and variant_id=${x.variantId} and coalesce(active,1)=1`));
const giaBq = (x) => Number(sql(`select coalesce(max(price_avg),0) from SHOP_STOCK where shop_id=${d().diemBan.shopId} and variant_id=${x.variantId} and coalesce(active,1)=1`)) || 0;

async function nhap(g, x, { sl, gia, lo, ncc = false, maNcc, serials = [], xacNhan = true, ghiChu = 'AUTO TEST kho-api nhập' }) {
	const ngay = new Date().toISOString().slice(0, 10);
	const r = await g.goi('POST', '/stock/v3/import-export', { shopId: g.shopId }, {
		code: `NK${hau()}${ncc ? 'N' : 'L'}`, objectId: ncc ? idNcc(maNcc) : 0, objectType: ncc ? 'SUPPLIER' : 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0,
		note: ghiChu, actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: false,
		items: [{ amount: sl * gia, price: gia, productId: x.productId, productName: x.sku, batchCode: null,
			batchProducts: [{ batchCode: lo ?? `A${process.env.VNPOST_LANE || ''}KA${hau()}`, quantity: sl, manufactureDate: ngay, expiryDate: '2028-12-31', serials }],
			quantity: sl, serials, totalAmount: sl * gia, unit: x.unit, variantId: x.variantId, variantName: null, itemId: null, shopId: g.shopId, inventoryId: g.kho, productUnit: x.unit, convertToMainUnit: 1, productUnitId: x.productUnitId }],
	});
	const id = r?.data?.stockInOutId ?? r?.stockInOutId;
	expect(id, `Tạo phiếu nhập lỗi: ${JSON.stringify(r?.status ?? r).slice(0, 300)}`).toBeTruthy();
	if (xacNhan) { const c = await g.goi('POST', '/stock/v3/import-export/confirm', { shopId: g.shopId, stockInOutId: id }); expect(String(c?.status?.code ?? '200'), `Xác nhận phiếu nhập lỗi: ${JSON.stringify(c?.status)}`).toBe('200'); }
	return id;
}
/** Xuất (lý do INTERNAL_USE) theo lô chỉ định / lô đầu còn tồn; trả { id, tao, xacNhan }. */
async function xuat(g, x, { sl, lo, serials = [] }) {
	const dsLo = await loCua(g, x);
	const l = lo ? dsLo.find((z) => z.batchCode === lo) : dsLo.find((z) => Number(z.remainQuantity) > 0) || dsLo[0];
	const r = await g.goi('POST', '/stock/v3/import-export', { shopId: g.shopId }, {
		code: `XK${hau()}`, objectId: 0, objectType: 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0, note: 'AUTO TEST kho-api xuất',
		actionTime: Date.now(), type: 'EXPORT', subType: 'EXPORT', reasonCode: 'INTERNAL_USE', enableVat: false,
		items: [{ amount: 0, price: Number(l?.price ?? 0), productId: x.productId, productName: x.sku, batchCode: null,
			batchProducts: l ? [{ batchCode: l.batchCode, quantity: sl, batchProductId: l.batchProductId, serials }] : [], quantity: sl, serials, totalAmount: 0, unit: x.unit,
			variantId: x.variantId, variantName: null, itemId: null, shopId: g.shopId, inventoryId: g.kho, productUnit: x.unit, convertToMainUnit: 1, productUnitId: x.productUnitId }],
	});
	const id = r?.data?.stockInOutId ?? r?.stockInOutId;
	const c = id ? await g.goi('POST', '/stock/v3/import-export/confirm', { shopId: g.shopId, stockInOutId: id }) : null;
	return { id, tao: r?.status, xacNhan: c?.status };
}
/** Phiếu chuyển điểm bán seed → điểm bán rác `diemBanNhan` (hoặc điểm bán `den`); trả { id, status, code }. */
async function chuyen(g, x, { sl, lo, den }) {
	const nhan = den ?? d().diemBanNhan;
	const l = lo ? (await loCua(g, x)).find((z) => z.batchCode === lo) : (await loCua(g, x)).find((z) => Number(z.remainQuantity) > 0);
	const code = `A${process.env.VNPOST_LANE || ''}KC${hau()}`;
	const r = await g.goi('POST', '/stock/v2/transfer/v2', { shopId: g.shopId }, {
		fromInventoryId: g.kho, fromShopId: g.shopId, imageIds: [], code, toInventoryId: nhan?.inventoryId, toShopId: nhan?.shopId, note: 'AUTO TEST kho-api chuyển',
		reason: '', discountAmount: 0, actionTime: null, exportImmediately: true,
		items: [{ fromProductId: x.productId, fromVariantId: x.variantId, fromProductUnitId: x.productUnitId, quantity: sl, price: Number(l?.price ?? 0), serials: [], batchProducts: l ? [{ batchCode: l.batchCode, quantity: sl, batchProductId: l.batchProductId }] : [] }],
	});
	return { id: r?.data?.stockTransferId, status: r?.status, code, gia: Number(l?.price ?? 0) };
}
/** Dòng phiếu: [price, quantity, amount, pre, post, base_price, batch_products]. */
const dongPhieu = (id) => sql(`select price, quantity, amount, pre_quantity, post_quantity, coalesce(base_price,0), batch_products from SHOP_STOCK_IN_OUT_ITEM where stock_in_out_id=${id} limit 1`).split('\t');

module.exports = { d, hau, podShop, sql, idNcc, donVi, SP, moGdv, loCua, tonVar, tonSo, giaBq, nhap, xuat, chuyen, dongPhieu, k };
