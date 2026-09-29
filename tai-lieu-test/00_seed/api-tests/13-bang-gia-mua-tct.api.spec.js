'use strict';

/**
 * Bước 13 (API, bổ sung 24/09/2026) — BẢNG GIÁ MUA của NCC làn phủ **Tổng công ty + tỉnh làn**.
 *
 * 🔴 Vì sao cần: bảng giá mua bước 7.3 chỉ phủ `BUU_DIEN_XA` = xã làn. PO đặt về kho TCT / HUB tỉnh tra giá
 *    theo phạm vi kho ⇒ SP MAC/FIFO/biến thể hiện "Chưa cài đặt" và nút gửi bị khoá (SP giá tiêu chuẩn vẫn
 *    ra giá vì lấy giá tiêu chuẩn). DB 24/09: 265 phạm vi bảng giá mua của chuỗi là `TONG_CONG_TY/VNPOST`.
 * Chuỗi request giống 7.3 (`PriceListFormDrawer.jsx`), chỉ khác `scopes` + tên.
 * Chạy: `VNPOST_LANE=8 npx playwright test --config tai-lieu-test/00_seed/playwright.api.config.js -g "seed 13"`
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { ghi, lay } = require('../seed-state');

const ds = (d) => (Array.isArray(d) ? d : d?.content || d?.items || d?.data || []);

test('seed 13.1 — bảng giá mua phạm vi TCT + tỉnh, ban hành', async ({ page }) => {
	const { goi, headers } = await moPhienApi(page, 'tct');
	const supplierId = lay('sanPhamNcc', 'supplierId');
	const contractId = lay('sanPhamNcc', 'contractId');
	const giaTheoSku = lay('sanPhamNcc', 'giaNhapTheoSku');
	const maTinh = lay('toChuc', 'maTinh');
	const ten = `${lay('sanPhamNcc', 'tenBangGiaMua')}_TCT`;
	expect(Object.keys(giaTheoSku || {}).length, 'Sổ seed chưa có giá nhập theo SKU (bước 7.3)').toBeGreaterThan(0);

	const master = { headers: { shopid: String(headers.shopid) } };
	let bg = ds(await goi('GET', '/supplier-price-lists', { ...master, params: { supplierId, page: 0, size: 50 } })).find((x) => x.name === ten);
	if (!bg) {
		const skus = Object.keys(giaTheoSku);
		const tra = (await goi('POST', '/chain/products/bulk-fields', { data: { skus, fields: ['vatPercent'], activeOnly: true } })) || {};
		const hai = (n) => String(n).padStart(2, '0');
		const t = new Date();
		await goi('POST', '/supplier-price-lists', {
			data: {
				scopes: [
					{ scopeType: 'TONG_CONG_TY', orgUnitCode: 'VNPOST', shopId: null },
					{ scopeType: 'BUU_DIEN_TINH', orgUnitCode: maTinh, shopId: null },
				],
				name: ten, supplierId: Number(supplierId),
				startDate: `${t.getFullYear()}-${hai(t.getMonth() + 1)}-${hai(t.getDate())} 00:00:00`, endDate: null,
				note: 'AUTO TEST — phạm vi TCT + tỉnh', contractId, fileIds: [],
				items: skus.map((sku) => ({
					sku, importPrice: Number(giaTheoSku[sku]), vatRate: Number(tra[sku]?.vatPercent || 0),
					priceType: 'STANDARD', minQuantity: 1, maxQuantity: null, description: '',
				})),
			},
		});
		bg = ds(await goi('GET', '/supplier-price-lists', { ...master, params: { supplierId, page: 0, size: 50 } })).find((x) => x.name === ten);
		expect(bg, `Không thấy bảng giá mua "${ten}" sau khi tạo`).toBeTruthy();
	}
	if (!/PUBLISH/i.test(String(bg.status))) await goi('POST', `/supplier-price-lists/${bg.id ?? bg.priceListId}/publish`);
	ghi('bangGiaMuaTct', { ten, priceListId: bg.id ?? bg.priceListId, phamVi: ['TONG_CONG_TY/VNPOST', `BUU_DIEN_TINH/${maTinh}`], daBanHanh: true });
});
