'use strict';

/**
 * Bước 6 (API) — NHÓM NCC + NHÀ CUNG CẤP cấp chuỗi.
 * Chuỗi request bám `SupplierGroupPage.jsx:112-132` (POST /chain-supplier-groups) và
 * `features/supplier/pages/AddModal.jsx:258-288` (POST /chain-supplier).
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { ghi, kh, lay } = require('../seed-state');

test.describe.configure({ mode: 'serial' });

test('seed 6.1 — nhóm nhà cung cấp', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const tenNhom = kh('nhaCungCap.tenNhomNcc');
  await goi('POST', '/chain-supplier-groups', { data: { name: tenNhom, description: '', status: 1 } });
  ghi('nhaCungCap', { tenNhomNcc: tenNhom });
});

test('seed 6.2 — nhà cung cấp', async ({ page }) => {
  const { goi, headers } = await moPhienApi(page, 'tct');
  const tenNhom = lay('nhaCungCap', 'tenNhomNcc');
  const nhom = JSON.stringify(await goi('GET', '/chain-supplier-groups', { params: { size: 100 } }));
  const dsNhom = JSON.parse(nhom);
  const g = (Array.isArray(dsNhom) ? dsNhom : dsNhom?.content || dsNhom?.items || []).find((x) => x.name === tenNhom);
  expect(g, `Không thấy nhóm NCC "${tenNhom}"`).toBeTruthy();

  const tinh = (await goi('GET', '/region', { params: { parent_id: 100000 } }))?.[0];
  const xa = (await goi('GET', '/region', { params: { parent_id: tinh.dictItemId } }))?.[0];
  const maNcc = kh('nhaCungCap.maNcc');
  const tenNcc = kh('nhaCungCap.tenNcc');
  const dienThoai = String(kh('nhaCungCap.dienThoaiNcc'));
  await goi('POST', '/chain-supplier', {
    data: {
      name: tenNcc, code: maNcc, companyName: '', taxCode: '', orderOwnerName: tenNcc, phone: dienThoai,
      email: '', address: '', provinceId: tinh.dictItemId, provinceName: tinh.itemName, districtId: 0,
      districtName: '', wardId: xa.dictItemId, wardName: xa.itemName, bankId: null, bankAccount: '',
      bankAccountName: '', categories: [], supplierGroupId: g.id ?? g.supplierGroupId,
      shopIds: [headers.shopid ? Number(headers.shopid) : null], status: 1, note: '',
      orderPhone: dienThoai, orderEmail: '', minOrderQuantity: 0, tolerance: 0,
      complaintOwnerName: tenNcc, complaintPhone: dienThoai, complaintEmail: '',
    },
  });
  ghi('nhaCungCap', { maNcc, tenNcc, dienThoaiNcc: dienThoai });
});
