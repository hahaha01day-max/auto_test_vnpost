'use strict';

/**
 * Bước 5 (API) — BẢNG GIÁ BÁN hiệu lực tại điểm bán seed, rồi phê duyệt.
 * Chuỗi request bám `PricingFormPage.jsx:186-225` (POST /chain-price-list/create) và
 * `PricingListPage.jsx:135-142` (PUT /chain-price-list/approve).
 * 🔴 Bắt buộc có: sản phẩm không nằm trong bảng giá hiệu lực tại điểm bán thì 🚫 không vào bill.
 * 🔴 includeTax=1 ⇒ `unitPrice` là giá SAU VAT (đúng số người dùng gõ).
 * 🔴 Phạm vi: FE gộp "chọn điểm bán duy nhất của xã" lên CẤP XÃ — đối chiếu DB 23/09/2026 bảng giá tạo
 *    qua giao diện lưu `scope_type = BUU_DIEN_XA`. Gửi y vậy (xã seed chỉ có đúng điểm bán seed).
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { doc, ghi, kh, lay } = require('../seed-state');

test.describe.configure({ mode: 'serial' });
const hai = (n) => String(n).padStart(2, '0');

test('seed 5.1 — tạo bảng giá bán cho điểm bán seed', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const tenBangGia = kh('bangGiaBan.tenBangGia');
  const tenPhienBan = kh('bangGiaBan.tenPhienBan');
  const DON_GIA = Number(kh('bangGiaBan.donGia'));
  // Ba sản phẩm FIFO / đích danh / tiêu chuẩn — mỗi cái một đơn giá.
  const dong = [['FIFO', 'bangGiaBan.donGia.FIFO'], ['DD', 'bangGiaBan.donGia.DD'], ['TC', 'bangGiaBan.donGia.TC']]
    .map(([hau, khoa]) => ({ sku: kh(`sanPham.${hau}.sku`), gia: Number(kh(khoa)) }));
  // SP chính (bước 4.3): mọi SKU biến thể × đơn vị; `donGia` theo đơn vị gốc, đơn vị quy đổi = × hệ số.
  const bt = lay('sanPham', 'sanPhamBienThe');
  for (const x of bt.skus) dong.push({ sku: x.sku, gia: DON_GIA * x.heSo });
  const d = new Date();
  await goi('POST', '/chain-price-list/create', {
    data: {
      name: tenBangGia, versionName: tenPhienBan,
      startDate: `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`, endDate: null,
      startTime: null, endTime: null, status: 1, includeTax: 1,
      priceListScopeMode: 'REGION', scopeType: 3,
      scopes: [{ scopeType: 'BUU_DIEN_XA', orgUnitCode: lay('toChuc', 'maXa') }],
      items: dong.map((d) => ({ sku: d.sku, unitPrice: d.gia, listedPrice: d.gia, discountRate: 0 })),
    },
  });
  ghi('bangGiaBan', { tenBangGia, tenPhienBan, donGia: DON_GIA, giaTheoSku: Object.fromEntries(dong.map((d) => [d.sku, d.gia])), daPheDuyet: false });
});

test('seed 5.2 — phê duyệt bảng giá', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const tenBangGia = lay('bangGiaBan', 'tenBangGia');
  const ds = await goi('GET', '/chain-price-list/get-all', { params: { page: 0, size: 10, name: tenBangGia } });
  const bg = (ds || []).find((x) => x.name === tenBangGia);
  expect(bg?.priceListId, `Không thấy bảng giá "${tenBangGia}"`).toBeTruthy();
  await goi('PUT', '/chain-price-list/approve', { params: { priceListId: bg.priceListId } });
  ghi('bangGiaBan', { daPheDuyet: true, priceListId: bg.priceListId });
});
