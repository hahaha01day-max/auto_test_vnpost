'use strict';

/**
 * Bước 15 (API, bổ sung 26/09/2026) — SẢN PHẨM GỘP (combo) bán được ở điểm bán seed, cho 18_5 110_001–004 (trả hàng combo)
 * và 18_4_030_009 (lọc "Phân loại sản phẩm" = Sản phẩm gộp ở khối Sản phẩm đơn gốc).
 *
 * Mỗi combo = 2 request như FE (`productCombo/components/AddOrUpdate/DrawerAddOrUpdateComboProduct.jsx`):
 * `POST /chain/products` (type 10 = combo — comment cột `CHAIN_PRODUCTS.type`; body khuôn 14.1) rồi
 * `POST /chain/products/product-combo` `{ productComboId, productsCombo: [{ productId, variantId, quantity, productUnitId }] }`;
 * khai giá tiêu chuẩn cho đơn vị bán của combo (`PUT /chain/products/standard-declared-prices`, khuôn 4.2 — combo không có
 * `stockType` ⇒ nhận mặc định Tiêu chuẩn của chuỗi); bảng giá RIÊNG chỉ chứa combo (khuôn 5.1, phạm vi xã seed) rồi phê duyệt.
 * 🔴 Bảng giá riêng — 🚫 không sửa `AUTO<làn>_BANGGIA` (mọi case POS đọc giá TC 100.000 từ đó).
 *
 * - `combo` (DÙNG CHO CASE): `AUTO<làn>_SP_COMBO2` = 1 × SP FIFO + 1 × SP BT biến thể Xanh (MAC).
 * - `comboLoiTieuChuan` (BẰNG CHỨNG LỖI): `AUTO<làn>_SP_COMBO` = 1 × SP TC (giá vốn Tiêu chuẩn) + 1 × SP FIFO.
 *   🔴 Đo 26/09: KHÔNG thanh toán được — "Chưa cấu hình giá vốn tiêu chuẩn cho đơn vị sản phẩm": `CheckoutOrder.java` ~1070
 *   tính giá vốn thành phần bằng `productComboEntity.getProductUnitId()` (đơn vị MẶC ĐỊNH của SP thành phần, TC = dòng không
 *   variant, không có mac_price) thay vì `shopProductCombo.getProductUnitId()` (đơn vị khai trong combo, có giá). Ghi báo cáo.
 * Idempotent: SKU/thành phần/giá/bảng giá đã có thì bỏ qua.
 * Chạy: `VNPOST_LANE=8 npx playwright test --config tai-lieu-test/00_seed/playwright.api.config.js -g "seed 15"`
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { ghi, lay, PREFIX, PREFIX_MA } = require('../seed-state');
const { chon } = require('../../shared/db/otp');

test.describe.configure({ mode: 'serial' });
const hai = (n) => String(n).padStart(2, '0');
const GIA = 150_000;
const GIA_VON = 110_000; // giá tiêu chuẩn khai cho combo ≈ tổng giá vốn thành phần
const bulk = async (goi, skus) => (await goi('POST', '/chain/products/bulk-fields', { data: { skus, fields: ['vatPercent'], activeOnly: true } })) || {};
/** Đơn vị bán (có variant) của một SKU (SELECT). */
const donVi = (sku) => {
	const [productUnitId, productId, variantId] = chon(
		`select product_unit_id, product_id, variant_id from CHAIN_PRODUCT_UNIT where sku='${sku}' and variant_id is not null order by product_unit_id limit 1`,
		'VNPOST_CORE',
	).split('\t').map(Number);
	expect(productId, `Không tìm được đơn vị SKU ${sku}`).toBeTruthy();
	return { productUnitId, productId, variantId };
};

async function taoCombo(goi, headers, { hau, thanhPhan }) {
	const ten = `${PREFIX}SP_${hau}`;
	const sku = `${PREFIX_MA}SKU${hau}`;
	const tp = thanhPhan.map((x) => ({ ...x, ...donVi(x.sku) }));
	let productId = (await bulk(goi, [sku]))[sku]?.productId;
	if (!productId) {
		await goi('POST', '/chain/products', {
			data: {
				productName: ten, sku, barCode: sku, accountingCode: sku, deductibleTaxPercent: 0,
				unit: 'Combo', categoryId: lay('sanPham', 'idDanhMuc'), categoryName: 'Sản phẩm gộp', isTopping: false, distributionMethod: 'MUA_BAN',
				goodsMaterialType: 'KHONG_PHAN_LOAI', isLoyalty: false, price: 0,
				shopId: headers.shopid ? Number(headers.shopid) : undefined, chainId: Number(headers.chainid),
				type: 10, isSell: 1, attributes: [], options: [], variants: [], images: [], imageUrl: [],
				description: 'AUTO TEST — combo seed bước 15', requireStock: true, enableVat: true, vatPercent: 0,
				active: true, status: 'KICH_HOAT', priceBeforeDiscount: 0,
			},
		});
		productId = (await bulk(goi, [sku]))[sku]?.productId;
		expect(productId, `Tạo combo xong mà không tra được SKU ${sku}`).toBeTruthy();
	}
	const soTp = () => Number(chon(`select count(*) from CHAIN_PRODUCT_COMBO where product_combo_id=${Number(productId)} and active=1`, 'VNPOST_CORE'));
	if (soTp() === 0) {
		await goi('POST', '/chain/products/product-combo', {
			data: { productComboId: productId, productsCombo: tp.map((x) => ({ productId: x.productId, variantId: x.variantId, quantity: x.sl, productUnitId: x.productUnitId })) },
		});
	}
	expect(soTp(), `Combo ${sku} không đủ ${tp.length} thành phần trong CHAIN_PRODUCT_COMBO`).toBe(tp.length);
	// Chỉ dòng CÓ variant — dòng variant NULL BE báo "Đơn vị tính không thuộc sản phẩm".
	const dv = donVi(sku);
	if (!(Number(chon(`select coalesce(mac_price,0) from CHAIN_PRODUCT_UNIT where product_unit_id=${dv.productUnitId}`, 'VNPOST_CORE')) > 0)) {
		await goi('PUT', '/chain/products/standard-declared-prices', {
			data: { items: [{ productId, units: [{ productUnitId: dv.productUnitId, macPrice: GIA_VON }] }] },
		});
	}
	return { ten, sku, productId, gia: GIA, giaVon: GIA_VON, productUnitId: dv.productUnitId, variantId: dv.variantId, thanhPhan: tp.map(({ sku: s, ten: t, sl }) => ({ sku: s, ten: t, sl })) };
}

async function bangGia(goi, { ten: tenBangGia, sku }) {
	const tim = async () => ((await goi('GET', '/chain-price-list/get-all', { params: { page: 0, size: 10, name: tenBangGia } })) || []).find((x) => x.name === tenBangGia);
	let bg = await tim();
	let moi = false;
	if (!bg) {
		const d = new Date();
		await goi('POST', '/chain-price-list/create', {
			data: {
				name: tenBangGia, versionName: `${tenBangGia}_PB`,
				startDate: `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`, endDate: null,
				startTime: null, endTime: null, status: 1, includeTax: 1,
				priceListScopeMode: 'REGION', scopeType: 3,
				scopes: [{ scopeType: 'BUU_DIEN_XA', orgUnitCode: lay('toChuc', 'maXa') }],
				items: [{ sku, unitPrice: GIA, listedPrice: GIA, discountRate: 0 }],
			},
		});
		bg = await tim();
		moi = true;
	}
	expect(bg?.priceListId, `Không thấy bảng giá "${tenBangGia}"`).toBeTruthy();
	if (moi) await goi('PUT', '/chain-price-list/approve', { params: { priceListId: bg.priceListId } });
	return { tenBangGia, priceListId: bg.priceListId, daPheDuyet: true };
}

test('seed 15.1 — combo dùng cho case: FIFO + BT Xanh (MAC)', async ({ page }) => {
	const { goi, headers } = await moPhienApi(page, 'tct');
	const sp = lay('sanPham', 'sanPhamTheoGiaVon');
	const btDs = lay('sanPham', 'sanPhamBienThe');
	const bt = btDs.skus.find((x) => x.bienThe === 'Xanh' && x.heSo === 1);
	const c = await taoCombo(goi, headers, { hau: 'COMBO2', thanhPhan: [
		{ sku: sp.fifo.sku, ten: sp.fifo.tenSanPham, sl: 1 },
		{ sku: bt.sku, ten: `${btDs.tenSanPham} (Xanh)`, sl: 1 },
	] });
	ghi('combo', { ...c, ...(await bangGia(goi, { ten: `${PREFIX}BG_COMBO2`, sku: c.sku })) });
});

test('seed 15.2 — combo có thành phần giá vốn TIÊU CHUẨN (bằng chứng lỗi, không dùng cho case)', async ({ page }) => {
	const { goi, headers } = await moPhienApi(page, 'tct');
	const sp = lay('sanPham', 'sanPhamTheoGiaVon');
	const c = await taoCombo(goi, headers, { hau: 'COMBO', thanhPhan: [
		{ sku: sp.tieuChuan.sku, ten: sp.tieuChuan.tenSanPham, sl: 1 },
		{ sku: sp.fifo.sku, ten: sp.fifo.tenSanPham, sl: 1 },
	] });
	ghi('comboLoiTieuChuan', { ...c, ...(await bangGia(goi, { ten: `${PREFIX}BG_COMBO`, sku: c.sku })),
		loi: 'Thanh toán bị chặn "Chưa cấu hình giá vốn tiêu chuẩn cho đơn vị sản phẩm" (CheckoutOrder.java ~1070 dùng đơn vị mặc định của SP thành phần)' });
});
