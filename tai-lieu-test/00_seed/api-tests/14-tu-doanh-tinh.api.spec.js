'use strict';

/**
 * Bước 14 (API, bổ sung 24/09/2026) — chuỗi TỰ DOANH của tỉnh làn, cho case "tỉnh đặt hàng NCC" (13_3 030_023–026).
 *
 * - 14.1 (tct): 2 SP FIFO `manageType = Tự doanh`, đơn vị quản lý = tỉnh làn. Payload giống 4.2, chỉ thêm
 *   `orgUnitCode/orgUnitType` như `AddProductDrawer.jsx:739-741` (FE gửi `manageType: undefined`).
 * - 14.2 (province): NCC CẤP TỈNH — cùng `POST /chain-supplier` như 6.2 (`AddModal.jsx:258-288`), backend gắn
 *   cấp theo phiên tỉnh.
 * - 14.3 (province): gắn CẢ 2 SP vào NCC tỉnh, hợp đồng ACTIVE, bảng giá mua phạm vi tỉnh CHỈ cho `TD1`.
 *   🔴 `TD2` cố ý KHÔNG có giá: case 030_026 cần SP đã map NCC mà chưa có bảng giá.
 * Chạy: `VNPOST_LANE=8 npx playwright test --config tai-lieu-test/00_seed/playwright.api.config.js -g "seed 14"`
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { doc, ghi, lay, PREFIX, PREFIX_MA, runId } = require('../seed-state');

test.describe.configure({ mode: 'serial' });
const ds = (d) => (Array.isArray(d) ? d : d?.content || d?.items || d?.data || []);
const GIA_NHAP = 50_000;
const SP = [
	{ hau: 'TD1', coGia: true },
	{ hau: 'TD2', coGia: false },
];
const td = () => doc().duLieu?.tuDoanhTinh || {};
const bulk = async (goi, skus) => (await goi('POST', '/chain/products/bulk-fields', { data: { skus, fields: ['vatPercent'], activeOnly: true } })) || {};

test('seed 14.1 — hai sản phẩm tự doanh của tỉnh làn', async ({ page }) => {
	const { goi, headers } = await moPhienApi(page, 'tct');
	const categoryId = lay('sanPham', 'idDanhMuc');
	const maTinh = lay('toChuc', 'maTinh');
	const sanPham = {};
	for (const s of SP) {
		const ten = `${PREFIX}SP_${s.hau}`;
		const sku = `${PREFIX_MA}SKU${s.hau}`;
		if (!(await bulk(goi, [sku]))[sku]) {
			await goi('POST', '/chain/products', {
				data: {
					productName: ten, sku, barCode: sku, accountingCode: sku, deductibleTaxPercent: 0,
					unit: 'Cái', categoryId, categoryName: 'Sản phẩm', isTopping: false, distributionMethod: 'MUA_BAN',
					goodsMaterialType: 'KHONG_PHAN_LOAI', isLoyalty: true, price: 0,
					shopId: headers.shopid ? Number(headers.shopid) : undefined, chainId: Number(headers.chainid),
					type: 0, isSell: 1, attributes: [], options: [], variants: [], productUnits: [], images: [], imageUrl: [],
					description: '', requireStock: true, quantityWarning: null, stockType: 'FIFO', isSerialRequired: false,
					enableVat: true, vatPercent: 0, directTaxPercent: 0, pitTaxPercent: 0, specialProductCategory: null,
					isIngredient: false, clength: null, cwidth: null, cheight: null, active: true, status: 'KICH_HOAT',
					priceBeforeDiscount: 0, isComposite: false, secondaryBarCodes: [],
					manageType: undefined, orgUnitCode: maTinh, orgUnitType: 'BUU_DIEN_TINH',
				},
			});
		}
		const tra = (await bulk(goi, [sku]))[sku];
		expect(tra?.productId, `Tạo xong mà không tra được SKU ${sku}`).toBeTruthy();
		sanPham[s.hau] = { ten, sku, productId: tra.productId, coGia: s.coGia };
	}
	ghi('tuDoanhTinh', { maTinh, sanPham });
});

test('seed 14.2 — nhà cung cấp cấp tỉnh', async ({ page }) => {
	const { goi, headers } = await moPhienApi(page, 'province');
	const ten = `${PREFIX}NCC_TINH`;
	const tim = async () => ds(await goi('GET', '/chain-supplier', { params: { keyword: ten, page: 0, size: 20 } })).find((x) => x.name === ten);
	let ncc = await tim();
	if (!ncc) {
		const tenNhom = lay('nhaCungCap', 'tenNhomNcc');
		const g = ds(await goi('GET', '/chain-supplier-groups', { params: { size: 100 } })).find((x) => x.name === tenNhom);
		const tinh = (await goi('GET', '/region', { params: { parent_id: 100000 } }))?.[0];
		const xa = (await goi('GET', '/region', { params: { parent_id: tinh.dictItemId } }))?.[0];
		const dt = `08${runId()}`;
		await goi('POST', '/chain-supplier', {
			data: {
				name: ten, code: `${PREFIX}NCCT`, companyName: '', taxCode: '', orderOwnerName: ten, phone: dt,
				email: '', address: '', provinceId: tinh.dictItemId, provinceName: tinh.itemName, districtId: 0,
				districtName: '', wardId: xa.dictItemId, wardName: xa.itemName, bankId: null, bankAccount: '',
				bankAccountName: '', categories: [], supplierGroupId: g ? (g.id ?? g.supplierGroupId) : null,
				shopIds: [headers.shopid ? Number(headers.shopid) : null], status: 1, note: '',
				orderPhone: dt, orderEmail: '', minOrderQuantity: 0, tolerance: 0,
				complaintOwnerName: ten, complaintPhone: dt, complaintEmail: '',
			},
		});
		ncc = await tim();
	}
	expect(ncc?.supplierId, `Không thấy NCC tỉnh "${ten}" sau khi tạo`).toBeTruthy();
	// Cấp NCC phải là tỉnh — ra TCT là backend không gắn theo phiên, cả chuỗi 030_02x mất nghĩa.
	expect(String(ncc.orgUnitType ?? ncc.org_unit_type), `NCC "${ten}" không ở cấp tỉnh: ${JSON.stringify(ncc)}`).toBe('BUU_DIEN_TINH');
	ghi('tuDoanhTinh', { tenNcc: ten, supplierId: ncc.supplierId });
});

test('seed 14.3 — gắn SP tự doanh vào NCC tỉnh, hợp đồng, bảng giá mua phạm vi tỉnh', async ({ page }) => {
	const { goi } = await moPhienApi(page, 'province');
	const { supplierId, sanPham, maTinh } = td();
	expect(supplierId && sanPham, 'Chưa chạy 14.1/14.2').toBeTruthy();
	const skus = Object.values(sanPham).map((s) => s.sku);
	const tra = await bulk(goi, skus);
	expect(skus.filter((k) => !tra[k]), 'Vai tỉnh không tra được SKU tự doanh').toEqual([]);

	if (!td().daGanNcc) {
		await goi('POST', '/supplier-products/batch', {
			params: { supplierId },
			data: { items: skus.map((sku) => ({ productId: tra[sku].productId, variantId: tra[sku].variantId, sku, productUnitId: tra[sku].productUnitId, productUnitName: tra[sku].unit, isDefault: false })) },
		});
		ghi('tuDoanhTinh', { daGanNcc: true });
	}

	let contractId = td().contractId;
	if (!contractId) {
		const tu = new Date(); tu.setHours(0, 0, 0, 0);
		const den = new Date(tu); den.setFullYear(den.getFullYear() + 1); den.setHours(23, 59, 59, 999);
		const d = await goi('POST', '/chain-supplier-contract', {
			data: {
				contractCode: `${PREFIX_MA}HDT`, supplierId, contractType: 'LUMP_SUM',
				effectiveFrom: tu.toISOString(), effectiveTo: den.toISOString(),
				totalValue: null, discountRate: null, creditLimit: null, paymentTermDays: null, maxReturnDays: null,
				isConsignment: false, reconciliationCycle: null, reconciliationAnchorDay: null,
				salesBonusPolicy: null, defectReturnPolicy: null, note: null,
			},
		});
		contractId = typeof d === 'object' ? d?.id : d;
		expect(contractId, 'Tạo hợp đồng NCC tỉnh không trả id').toBeTruthy();
		await goi('POST', `/chain-supplier-contract/${contractId}/status`, { params: { status: 'ACTIVE' } });
		ghi('tuDoanhTinh', { soHopDong: `${PREFIX_MA}HDT`, contractId });
	}

	const ten = `${PREFIX}BGMUA_TINH`;
	// 🔴 Vai tỉnh: FE gọi bằng header MẶC ĐỊNH của phiên (`supplierProductApi.js:29-36`) — 🚫 ghi đè
	//    `shopId` như 7.3 (đó là masterShopId của TCT).
	const timBg = async () => ds(await goi('GET', '/supplier-price-lists', { params: { supplierId, page: 0, size: 20 } })).find((x) => x.name === ten);
	let bg = await timBg();
	if (!bg) {
		const hai = (n) => String(n).padStart(2, '0');
		const t = new Date();
		await goi('POST', '/supplier-price-lists', {
			data: {
				scopes: [{ scopeType: 'BUU_DIEN_TINH', orgUnitCode: maTinh, shopId: null }],
				name: ten, supplierId: Number(supplierId),
				startDate: `${t.getFullYear()}-${hai(t.getMonth() + 1)}-${hai(t.getDate())} 00:00:00`, endDate: null,
				note: 'AUTO TEST — tự doanh tỉnh', contractId, fileIds: [],
				items: Object.values(sanPham).filter((s) => s.coGia).map((s) => ({
					sku: s.sku, importPrice: GIA_NHAP, vatRate: Number(tra[s.sku]?.vatPercent || 0),
					priceType: 'STANDARD', minQuantity: 1, maxQuantity: null, description: '',
				})),
			},
		});
		bg = await timBg();
		expect(bg, `Không thấy bảng giá mua "${ten}" sau khi tạo`).toBeTruthy();
	}
	if (!/PUBLISH/i.test(String(bg.status))) await goi('POST', `/supplier-price-lists/${bg.id ?? bg.priceListId}/publish`);
	ghi('tuDoanhTinh', { tenBangGiaMua: ten, priceListId: bg.id ?? bg.priceListId, giaNhap: GIA_NHAP });
});
