'use strict';

/**
 * Bước 7 (API) — gắn MỌI SẢN PHẨM seed vào NCC, HỢP ĐỒNG (duyệt ACTIVE), BẢNG GIÁ MUA (ban hành).
 * Chuỗi request bám `BatchAddDrawer.jsx:156-169`, `SupplierContractFormDrawer.jsx:138-163`,
 * `PriceListFormDrawer.jsx:734-824`, `PriceListDetailDrawer.jsx:305`.
 * 🔴 Danh sách bảng giá mua đọc bằng header `shopId = masterShopId` (FE ghi đè) — thiếu là rỗng.
 * 🔴 Hiệu lực hợp đồng: FE gửi ISO UTC của đầu/cuối ngày giờ máy (+7).
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { ghi, kh, lay } = require('../seed-state');

test.describe.configure({ mode: 'serial' });
const ds = (d) => (Array.isArray(d) ? d : d?.content || d?.items || d?.data || []);

/**
 * Mọi SKU cần giá nhập: FIFO / đích danh / tiêu chuẩn + mọi SKU biến thể × đơn vị của SP chính.
 * Giá SP chính theo đơn vị gốc; đơn vị quy đổi = × hệ số (như bảng giá bán bước 5).
 */
function dongGiaNhap() {
  const theoGiaVon = lay('sanPham', 'sanPhamTheoGiaVon');
  const dong = [['fifo', 'FIFO'], ['dichDanh', 'DD'], ['tieuChuan', 'TC']]
    .map(([khoa, hau]) => ({ sku: theoGiaVon[khoa].sku, gia: Number(kh(`sanPhamNcc.giaNhap.${hau}`)) }));
  for (const x of lay('sanPham', 'sanPhamBienThe').skus) dong.push({ sku: x.sku, gia: Number(kh('sanPhamNcc.giaNhap')) * x.heSo });
  return dong;
}

/** Tra id + đơn vị + VAT theo SKU bằng `bulk-fields` — một lần cho mọi SKU. */
async function traSku(goi, skus) {
  return (await goi('POST', '/chain/products/bulk-fields', { data: { skus, fields: ['vatPercent'], activeOnly: true } })) || {};
}

test('seed 7.1 — gắn sản phẩm seed vào nhà cung cấp', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const tenNcc = lay('nhaCungCap', 'tenNcc');
  const ncc = ds(await goi('GET', '/chain-supplier', { params: { orgUnitType: 'TONG_CONG_TY', keyword: tenNcc, page: 0, size: 20 } }))
    .find((x) => x.name === tenNcc);
  expect(ncc?.supplierId, `Không thấy NCC "${tenNcc}"`).toBeTruthy();

  const skus = dongGiaNhap().map((d) => d.sku);
  const tra = await traSku(goi, skus);
  expect(skus.filter((k) => !tra[k]), 'SKU chưa có trong hệ thống — chạy lại bước 4').toEqual([]);

  await goi('POST', '/supplier-products/batch', {
    params: { supplierId: ncc.supplierId },
    data: {
      items: skus.map((sku) => ({
        productId: tra[sku].productId, variantId: tra[sku].variantId, sku,
        productUnitId: tra[sku].productUnitId, productUnitName: tra[sku].unit, isDefault: false,
      })),
    },
  });
  ghi('sanPhamNcc', { supplierId: ncc.supplierId, skuNcc: lay('sanPham', 'sku'), skusNcc: skus });
});

test('seed 7.2 — hợp đồng NCC, duyệt hiệu lực', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const supplierId = lay('sanPhamNcc', 'supplierId');
  const soHopDong = kh('sanPhamNcc.soHopDong');
  const tu = new Date(); tu.setHours(0, 0, 0, 0);
  const den = new Date(tu); den.setFullYear(den.getFullYear() + 1); den.setHours(23, 59, 59, 999);
  const d = await goi('POST', '/chain-supplier-contract', {
    data: {
      contractCode: soHopDong, supplierId, contractType: 'LUMP_SUM',
      effectiveFrom: tu.toISOString(), effectiveTo: den.toISOString(),
      totalValue: null, discountRate: null, creditLimit: null, paymentTermDays: null, maxReturnDays: null,
      isConsignment: false, reconciliationCycle: null, reconciliationAnchorDay: null,
      salesBonusPolicy: null, defectReturnPolicy: null, note: null,
    },
  });
  const id = typeof d === 'object' ? d?.id : d;
  expect(id, 'Tạo hợp đồng không trả id').toBeTruthy();
  await goi('POST', `/chain-supplier-contract/${id}/status`, { params: { status: 'ACTIVE' } });
  ghi('sanPhamNcc', { soHopDong, contractId: id });
});

test('seed 7.3 — bảng giá mua, ban hành', async ({ page }) => {
  const { goi, headers } = await moPhienApi(page, 'tct');
  const supplierId = lay('sanPhamNcc', 'supplierId');
  const contractId = lay('sanPhamNcc', 'contractId');
  const tenBangGiaMua = kh('sanPhamNcc.tenBangGiaMua');
  const GIA_NHAP = Number(kh('sanPhamNcc.giaNhap'));
  const hai = (n) => String(n).padStart(2, '0');
  const t = new Date();
  const dong = dongGiaNhap();
  const tra = await traSku(goi, dong.map((d) => d.sku));

  await goi('POST', '/supplier-price-lists', {
    data: {
      // Giống FE (DB 23/09: bản qua giao diện lưu BUU_DIEN_XA, shop_id NULL).
      scopes: [{ scopeType: 'BUU_DIEN_XA', orgUnitCode: lay('toChuc', 'maXa'), shopId: null }],
      name: tenBangGiaMua, supplierId: Number(supplierId),
      startDate: `${t.getFullYear()}-${hai(t.getMonth() + 1)}-${hai(t.getDate())} 00:00:00`, endDate: null,
      note: 'AUTO TEST', contractId, fileIds: [],
      items: dong.map((d) => ({
        sku: d.sku, importPrice: d.gia, vatRate: Number(tra[d.sku]?.vatPercent || 0),
        priceType: 'STANDARD', minQuantity: 1, maxQuantity: null, description: '',
      })),
    },
  });

  const master = { headers: { shopid: String(headers.shopid) } };
  const bg = ds(await goi('GET', '/supplier-price-lists', { ...master, params: { supplierId, page: 0, size: 20 } }))
    .find((x) => x.name === tenBangGiaMua);
  expect(bg, `Không thấy bảng giá mua "${tenBangGiaMua}"`).toBeTruthy();
  await goi('POST', `/supplier-price-lists/${bg.id ?? bg.priceListId}/publish`);
  ghi('sanPhamNcc', { tenBangGiaMua, giaNhap: GIA_NHAP, giaNhapTheoSku: Object.fromEntries(dong.map((d) => [d.sku, d.gia])), daBanHanh: true });
});
