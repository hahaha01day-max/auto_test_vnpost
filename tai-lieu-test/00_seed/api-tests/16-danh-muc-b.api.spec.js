'use strict';

/**
 * Bước 16 (API, bổ sung 26/09/2026) — DANH MỤC THỨ HAI cho CTKM theo danh mục (11_khuyen_mai 100/110/120): danh mục B
 * `AUTO<làn>_DM_B` (con của danh mục cha seed) chứa SP `AUTO<làn>_SP_NGK` ("nước giải khát", MAC, 20.000đ) + combo
 * `AUTO<làn>_SP_COMBO3` (FIFO + BT Xanh, 150.000đ) — để có "danh mục A" (danh mục seed: TC/FIFO/BT/COMBO2) và "danh mục B".
 *
 * - 16.1 (tct): danh mục B (khuôn 4.1 `POST /chain/product-categories/individual`), SP NGK (khuôn 4.2 `POST /chain/products`,
 *   stockType MAC), combo 3 (khuôn 15), bảng giá RIÊNG `AUTO<làn>_BG_DM_B` phạm vi xã seed (khuôn 5.1) rồi phê duyệt.
 * - 16.2 (seed_gdv): nhập 200 × NGK vào kho mặc định điểm bán seed, lô `A<làn>NGK1` (khuôn `14_1/tests/return-page.js ›
 *   nhapHangSerial`: `POST /stock/v3/import-export` → `/confirm`). 🔴 Nhập kho bắt buộc có lô.
 * Idempotent: danh mục/SKU/combo/bảng giá đã có thì bỏ qua; tồn NGK ≥ 50 thì không nhập thêm.
 * Chạy: `VNPOST_LANE=8 npx playwright test --config tai-lieu-test/00_seed/playwright.api.config.js -g "seed 16"`
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { ghi, lay, doc, PREFIX, PREFIX_MA } = require('../seed-state');
const { chon } = require('../../shared/db/otp');

test.describe.configure({ mode: 'serial' });
const hai = (n) => String(n).padStart(2, '0');
const GIA_NGK = 20_000;
const GIA_COMBO = 150_000;
const GIA_VON_COMBO = 110_000;
const dmB = () => doc().duLieu?.danhMucB || {};
const bulk = async (goi, skus) => (await goi('POST', '/chain/products/bulk-fields', { data: { skus, fields: ['vatPercent'], activeOnly: true } })) || {};
const donVi = (sku) => {
	const [productUnitId, productId, variantId, unit] = chon(
		`select product_unit_id, product_id, variant_id, unit from CHAIN_PRODUCT_UNIT where sku='${sku}' and variant_id is not null order by product_unit_id limit 1`, 'VNPOST_CORE',
	).split('\t');
	expect(productId, `Không tìm được đơn vị SKU ${sku}`).toBeTruthy();
	return { productUnitId: Number(productUnitId), productId: Number(productId), variantId: Number(variantId), unit };
};

test('seed 16.1 — danh mục B, SP nước giải khát, combo 3, bảng giá', async ({ page }) => {
	const { goi, headers } = await moPhienApi(page, 'tct');
	// Danh mục B: con của danh mục CHA seed (tra id cha qua danh mục con seed).
	let idDm = dmB().idDanhMuc;
	const tenDm = `${PREFIX}DM_B`;
	if (!idDm) {
		const idCha = Number(chon(`select parent_id from CHAIN_PRODUCT_CATEGORY where id=${Number(lay('sanPham', 'idDanhMuc'))}`, 'VNPOST_CORE'));
		expect(idCha, 'Không tra được danh mục cha seed').toBeGreaterThan(0);
		const r = await goi('POST', '/chain/product-categories/individual', { params: { type: 0 }, data: { catName: tenDm, type: 0, parentId: idCha, code: `${PREFIX_MA}DMB`, imageUrl: '', note: '' } });
		idDm = typeof r === 'object' ? r?.id ?? r?.categoryId : r;
		expect(idDm, 'Tạo danh mục B không trả id').toBeTruthy();
		ghi('danhMucB', { tenDanhMuc: tenDm, idDanhMuc: idDm });
	}
	const base = {
		deductibleTaxPercent: 0, categoryId: idDm, categoryName: tenDm, isTopping: false, distributionMethod: 'MUA_BAN',
		goodsMaterialType: 'KHONG_PHAN_LOAI', price: 0, shopId: headers.shopid ? Number(headers.shopid) : undefined, chainId: Number(headers.chainid),
		isSell: 1, attributes: [], options: [], variants: [], images: [], imageUrl: [], requireStock: true, enableVat: true, vatPercent: 0,
		active: true, status: 'KICH_HOAT', priceBeforeDiscount: 0,
	};
	// SP nước giải khát (MAC).
	const skuNgk = `${PREFIX_MA}SKUNGK`;
	if (!(await bulk(goi, [skuNgk]))[skuNgk]) {
		await goi('POST', '/chain/products', { data: { ...base, productName: `${PREFIX}SP_NGK`, sku: skuNgk, barCode: skuNgk, accountingCode: skuNgk,
			unit: 'Chai', type: 0, isLoyalty: true, productUnits: [], description: 'AUTO TEST — nước giải khát danh mục B (seed 16)',
			quantityWarning: null, stockType: 'MAC', isSerialRequired: false, directTaxPercent: 0, pitTaxPercent: 0, specialProductCategory: null,
			isIngredient: false, clength: null, cwidth: null, cheight: null, isComposite: false, secondaryBarCodes: [] } });
	}
	const ngk = { ten: `${PREFIX}SP_NGK`, sku: skuNgk, ...donVi(skuNgk) };
	// Combo 3 trong danh mục B.
	const skuC3 = `${PREFIX_MA}SKUCOMBO3`;
	let idC3 = (await bulk(goi, [skuC3]))[skuC3]?.productId;
	if (!idC3) {
		await goi('POST', '/chain/products', { data: { ...base, productName: `${PREFIX}SP_COMBO3`, sku: skuC3, barCode: skuC3, accountingCode: skuC3,
			unit: 'Combo', type: 10, isLoyalty: false, description: 'AUTO TEST — combo danh mục B (seed 16)' } });
		idC3 = (await bulk(goi, [skuC3]))[skuC3]?.productId;
		expect(idC3, 'Tạo combo 3 xong mà không tra được').toBeTruthy();
	}
	const sp = lay('sanPham', 'sanPhamTheoGiaVon');
	const bt = lay('sanPham', 'sanPhamBienThe').skus.find((x) => x.bienThe === 'Xanh' && x.heSo === 1);
	if (Number(chon(`select count(*) from CHAIN_PRODUCT_COMBO where product_combo_id=${Number(idC3)} and active=1`, 'VNPOST_CORE')) === 0) {
		const tp = [donVi(sp.fifo.sku), donVi(bt.sku)];
		await goi('POST', '/chain/products/product-combo', { data: { productComboId: idC3, productsCombo: tp.map((x) => ({ productId: x.productId, variantId: x.variantId, quantity: 1, productUnitId: x.productUnitId })) } });
	}
	const c3 = { ten: `${PREFIX}SP_COMBO3`, sku: skuC3, ...donVi(skuC3) };
	if (!(Number(chon(`select coalesce(mac_price,0) from CHAIN_PRODUCT_UNIT where product_unit_id=${c3.productUnitId}`, 'VNPOST_CORE')) > 0)) {
		await goi('PUT', '/chain/products/standard-declared-prices', { data: { items: [{ productId: c3.productId, units: [{ productUnitId: c3.productUnitId, macPrice: GIA_VON_COMBO }] }] } });
	}
	// Bảng giá riêng NGK + combo 3.
	const tenBg = `${PREFIX}BG_DM_B`;
	const tim = async () => ((await goi('GET', '/chain-price-list/get-all', { params: { page: 0, size: 10, name: tenBg } })) || []).find((x) => x.name === tenBg);
	let bg = await tim();
	if (!bg) {
		const d = new Date();
		await goi('POST', '/chain-price-list/create', { data: {
			name: tenBg, versionName: `${tenBg}_PB`, startDate: `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`, endDate: null,
			startTime: null, endTime: null, status: 1, includeTax: 1, priceListScopeMode: 'REGION', scopeType: 3,
			scopes: [{ scopeType: 'BUU_DIEN_XA', orgUnitCode: lay('toChuc', 'maXa') }],
			items: [{ sku: skuNgk, unitPrice: GIA_NGK, listedPrice: GIA_NGK, discountRate: 0 }, { sku: skuC3, unitPrice: GIA_COMBO, listedPrice: GIA_COMBO, discountRate: 0 }],
		} });
		bg = await tim();
		expect(bg?.priceListId, `Không thấy bảng giá ${tenBg}`).toBeTruthy();
		await goi('PUT', '/chain-price-list/approve', { params: { priceListId: bg.priceListId } });
	}
	ghi('danhMucB', { tenDanhMuc: tenDm, idDanhMuc: idDm, ngk: { ...ngk, gia: GIA_NGK }, combo3: { ...c3, gia: GIA_COMBO }, tenBangGia: tenBg, priceListId: bg.priceListId });
});

test('seed 16.2 — nhập kho nước giải khát cho điểm bán seed', async ({ page }) => {
	const d = dmB();
	expect(d.ngk?.sku, 'Chưa có SP NGK (chạy seed 16.1)').toBeTruthy();
	const shopId = lay('diemBan', 'shopId');
	let ton = 0;
	for (const db of ['VNPOST_POD_01', 'VNPOST_POD_02', 'VNPOST_POD_03']) {
		try { ton += Number(chon(`select coalesce(sum(quantity),0) from SHOP_STOCK where shop_id=${shopId} and variant_id=${d.ngk.variantId} and active=1`, db)) || 0; } catch { /* pod khác */ }
	}
	if (ton >= 50) { ghi('danhMucB', { tonNgk: ton }); return; }
	const { goi } = await moPhienApi(page, 'seed_gdv');
	const kho = ((await goi('GET', `/shops/${shopId}/inventory`)) || []).find((x) => x.isDefault)?.id;
	expect(kho, 'Không tìm được kho mặc định điểm bán seed').toBeTruthy();
	const sl = 200;
	const gia = 12_000;
	const hauTo = Date.now().toString().slice(-6);
	const lo = `A${process.env.VNPOST_LANE || ''}NGK${hauTo}`;
	const f = (t) => `${t.getFullYear()}-${hai(t.getMonth() + 1)}-${hai(t.getDate())}`;
	const hom = new Date();
	const tao = await goi('POST', '/stock/v3/import-export', { params: { shopId }, data: {
		code: `NK${hauTo}NGK`, objectId: 0, objectType: 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0,
		note: 'AUTO TEST seed 16 — nước giải khát danh mục B', actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: false,
		items: [{ amount: gia * sl, price: gia, productId: d.ngk.productId, productName: d.ngk.ten, batchCode: null,
			batchProducts: [{ batchCode: lo, quantity: sl, manufactureDate: f(hom), expiryDate: f(new Date(hom.getTime() + 365 * 86400_000)), serials: [] }],
			quantity: sl, serials: [], totalAmount: gia * sl, unit: d.ngk.unit, variantId: d.ngk.variantId, variantName: null, itemId: null, shopId,
			inventoryId: kho, productUnit: d.ngk.unit, convertToMainUnit: 1, productUnitId: d.ngk.productUnitId }],
	} });
	const id = tao?.stockInOutId;
	expect(id, `Tạo phiếu nhập NGK không trả stockInOutId: ${JSON.stringify(tao).slice(0, 300)}`).toBeTruthy();
	await goi('POST', '/stock/v3/import-export/confirm', { params: { shopId, stockInOutId: id } });
	ghi('danhMucB', { tonNgk: ton + sl, loNgk: lo });
});

/**
 * 16.3 (bổ sung 26/09/2026) — DANH MỤC COMBO B: form combo và hộp "Chọn sản phẩm khuyến mại" của POS chỉ liệt kê combo thuộc
 * danh mục combo (`CHAIN_PRODUCT_CATEGORY.type = 10`); combo 3 nằm trong danh mục SẢN PHẨM B nên CTKM "giảm cho danh mục combo B"
 * (11_110_009) không chọn được. Dựng danh mục combo `AUTO<làn>_DMC_B` + combo `AUTO<làn>_SP_COMBO4` (FIFO + BT Xanh, 150.000đ,
 * bảng giá riêng `AUTO<làn>_BG_DMC_B` phạm vi xã seed). Idempotent.
 */
test('seed 16.3 — danh mục combo B + combo 4', async ({ page }) => {
	const { goi, headers } = await moPhienApi(page, 'tct');
	// 🔴 BE cấm gán SP vào danh mục cấp 1 (PRODUCT_CATEGORY_LEVEL_1_NOT_ALLOWED) ⇒ cha `…DMC_B` (cấp 1) › con `…DMCB_CON`.
	const timTen = (t) => chon(`select id from CHAIN_PRODUCT_CATEGORY where cat_name='${t}' and type=10 order by id limit 1`, 'VNPOST_CORE');
	if (!timTen(`${PREFIX}DMC_B`)) await goi('POST', '/chain/product-categories/individual', { params: { type: 10 }, data: { catName: `${PREFIX}DMC_B`, type: 10, parentId: 0, code: `${PREFIX_MA}DMCB2`, imageUrl: '', note: '' } });
	const tenDm = `${PREFIX}DMCB_CON`;
	if (!timTen(tenDm)) await goi('POST', '/chain/product-categories/individual', { params: { type: 10 }, data: { catName: tenDm, type: 10, parentId: Number(timTen(`${PREFIX}DMC_B`)), code: `${PREFIX_MA}DMCB3`, imageUrl: '', note: '' } });
	const idDm = Number(timTen(tenDm));
	expect(idDm, 'Không tạo được danh mục combo B').toBeGreaterThan(0);
	const sku = `${PREFIX_MA}SKUCOMBO4`;
	let id = (await bulk(goi, [sku]))[sku]?.productId;
	if (!id) {
		await goi('POST', '/chain/products', { data: {
			productName: `${PREFIX}SP_COMBO4`, sku, barCode: sku, accountingCode: sku, deductibleTaxPercent: 0, unit: 'Combo', categoryId: idDm, categoryName: tenDm,
			isTopping: false, distributionMethod: 'MUA_BAN', goodsMaterialType: 'KHONG_PHAN_LOAI', isLoyalty: false, price: 0, chainId: Number(headers.chainid),
			type: 10, isSell: 1, attributes: [], options: [], variants: [], images: [], imageUrl: [], requireStock: true, enableVat: true, vatPercent: 0,
			active: true, status: 'KICH_HOAT', priceBeforeDiscount: 0, description: 'AUTO TEST — combo danh mục combo B (seed 16.3)',
		} });
		id = (await bulk(goi, [sku]))[sku]?.productId;
		expect(id, 'Tạo combo 4 xong mà không tra được').toBeTruthy();
	}
	const sp = lay('sanPham', 'sanPhamTheoGiaVon');
	const bt = lay('sanPham', 'sanPhamBienThe').skus.find((x) => x.bienThe === 'Xanh' && x.heSo === 1);
	if (Number(chon(`select count(*) from CHAIN_PRODUCT_COMBO where product_combo_id=${Number(id)} and active=1`, 'VNPOST_CORE')) === 0) {
		const tp = [donVi(sp.fifo.sku), donVi(bt.sku)];
		await goi('POST', '/chain/products/product-combo', { data: { productComboId: id, productsCombo: tp.map((x) => ({ productId: x.productId, variantId: x.variantId, quantity: 1, productUnitId: x.productUnitId })) } });
	}
	const c4 = { ten: `${PREFIX}SP_COMBO4`, sku, ...donVi(sku) };
	if (!(Number(chon(`select coalesce(mac_price,0) from CHAIN_PRODUCT_UNIT where product_unit_id=${c4.productUnitId}`, 'VNPOST_CORE')) > 0)) {
		await goi('PUT', '/chain/products/standard-declared-prices', { data: { items: [{ productId: c4.productId, units: [{ productUnitId: c4.productUnitId, macPrice: GIA_VON_COMBO }] }] } });
	}
	const tenBg = `${PREFIX}BG_DMC_B`;
	const tim = async () => ((await goi('GET', '/chain-price-list/get-all', { params: { page: 0, size: 10, name: tenBg } })) || []).find((x) => x.name === tenBg);
	let bg = await tim();
	if (!bg) {
		const d = new Date();
		await goi('POST', '/chain-price-list/create', { data: {
			name: tenBg, versionName: `${tenBg}_PB`, startDate: `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`, endDate: null, startTime: null, endTime: null,
			status: 1, includeTax: 1, priceListScopeMode: 'REGION', scopeType: 3, scopes: [{ scopeType: 'BUU_DIEN_XA', orgUnitCode: lay('toChuc', 'maXa') }],
			items: [{ sku, unitPrice: GIA_COMBO, listedPrice: GIA_COMBO, discountRate: 0 }],
		} });
		bg = await tim();
		expect(bg?.priceListId, `Không thấy bảng giá ${tenBg}`).toBeTruthy();
		await goi('PUT', '/chain-price-list/approve', { params: { priceListId: bg.priceListId } });
	}
	ghi('danhMucComboB', { tenDanhMuc: tenDm, idDanhMuc: idDm, combo4: { ...c4, gia: GIA_COMBO }, priceListId: bg.priceListId });
});
