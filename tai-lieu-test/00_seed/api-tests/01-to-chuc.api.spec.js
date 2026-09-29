'use strict';

/**
 * Bước 1 (API) — CÂY TỔ CHỨC: Bưu điện Tỉnh → Bưu điện Xã.
 * Chuỗi request bám `DrawerCreateOrUpdateOrganization.jsx:149-190` · `organizationApi.js:42-49`.
 * 🔴 `taxCode` FE tự chép từ đơn vị cha (`services/organizationTaxCode.js`) — phải làm y vậy.
 * 🔴 Mã con phải bắt đầu bằng mã cha (backend chặn `SSHOP-402`).
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { ghi, kh, lay } = require('../seed-state');

test.describe.configure({ mode: 'serial' });

const MA_GOC = process.env.VNPOST_ORG_PARENT_CODE || 'VNPOST';

async function taxCodeCua(goi, maCha) {
  const ct = await goi('GET', '/v1.0/organization-unit/detail', { params: { unitCode: maCha } });
  return ct?.taxCode ?? null;
}

async function taoDonVi(goi, { unitCode, unitName, unitType, parentCode }) {
  await goi('POST', '/v1.0/organization-unit', {
    data: {
      unitCode, unitName, unitType, parentCode,
      regionCodes: [], status: true, effectiveDate: null,
      taxCode: await taxCodeCua(goi, parentCode),
    },
  });
  const ct = await goi('GET', '/v1.0/organization-unit/detail', { params: { unitCode } });
  expect(ct?.unitCode, `Tạo xong mà không đọc lại được đơn vị ${unitCode}`).toBe(unitCode);
}

test('seed 1.1 — tạo Bưu điện Tỉnh', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const MA_TINH = kh('toChuc.maTinh');
  const tenTinh = kh('toChuc.tenTinh');
  await taoDonVi(goi, { unitCode: MA_TINH, unitName: tenTinh, unitType: 'BUU_DIEN_TINH', parentCode: MA_GOC });
  ghi('toChuc', { maTinh: MA_TINH, tenTinh });
});

test('seed 1.2 — tạo Bưu điện Xã trực thuộc tỉnh vừa tạo', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const MA_XA = kh('toChuc.maXa');
  const tenXa = kh('toChuc.tenXa');
  await taoDonVi(goi, { unitCode: MA_XA, unitName: tenXa, unitType: 'BUU_DIEN_XA', parentCode: lay('toChuc', 'maTinh') });
  ghi('toChuc', { maXa: MA_XA, tenXa });
});
