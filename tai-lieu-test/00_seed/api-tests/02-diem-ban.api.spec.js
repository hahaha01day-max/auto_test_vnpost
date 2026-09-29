'use strict';

/**
 * Bước 2 (API) — ĐIỂM BÁN dưới xã seed. Kho do backend tự sinh.
 * Chuỗi request bám `DrawerCreateShop.jsx:470-577` + `shopManagement/utils/seedShopDefaults.js:10-90`:
 *   POST /shops/profile → (header shopId = shop mới) 2× POST /timekeeping/shift + POST /cashier-counter/create.
 * 🔴 Ba request phụ là side-effect FE làm SAU khi tạo — thiếu là điểm bán không có ca/quầy như tạo tay.
 * 🔴 `orgUnitCode` LUÔN là mã TCT, xã/tỉnh đi ở `orgWardCode`/`orgProvinceCode`.
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { ghi, kh, lay, runId } = require('../seed-state');

test('seed 2.1 — tạo điểm bán dưới xã seed', async ({ page }) => {
  const maTinh = lay('toChuc', 'maTinh');
  const maXa = lay('toChuc', 'maXa');
  const tenShop = kh('diemBan.tenShop');
  const maShop = kh('diemBan.maShop');
  const sdt = `09${runId()}`;

  const { goi } = await moPhienApi(page, 'tct');
  const tinhHc = (await goi('GET', '/region', { params: { parent_id: 100000 } }))?.[0];
  const xaHc = (await goi('GET', '/region', { params: { parent_id: tinhHc.dictItemId } }))?.[0];
  expect(xaHc?.dictItemId, 'Không lấy được phường/xã hành chính').toBeTruthy();

  const d = await goi('POST', '/shops/profile', {
    params: { appId: 'SSHOP' },
    data: {
      shopCode: maShop, shopName: tenShop,
      email: `${maShop.toLowerCase()}@auto.test`, shopPhone: sdt, managerPhone: sdt,
      address: 'AUTO TEST - khong su dung',
      distributionMethod: ['MUA_BAN'], shopType: 'STORE', shopGrade: 'NORMAL',
      orgUnitCode: 'VNPOST', orgProvinceCode: maTinh, orgWardCode: maXa,
      isSource: false, categories: [], syncFromChain: false,
      provinceId: tinhHc.dictItemId, provinceName: tinhHc.itemName,
      wardId: xaHc.dictItemId, wardName: xaHc.itemName,
      shopLat: null, shopLong: null,
    },
  });
  const shopId = typeof d === 'object' ? d?.shopId : d;
  expect(shopId, `Tạo điểm bán không trả shopId: ${JSON.stringify(d)}`).toBeTruthy();

  const h = { headers: { shopid: String(shopId) } };
  for (const [name, beginTime, endTime] of [['Ca sáng', '07:30', '12:00'], ['Ca chiều', '13:00', '19:00']]) {
    await goi('POST', '/timekeeping/shift', {
      ...h,
      data: {
        id: 0, shopId, name, beginTime, endTime, salaryPerShift: 0,
        checkinAllowableMinutesBefore: 0, checkoutAllowableMinutesAfter: 0, active: true, allowOverlap: false,
      },
    });
  }
  await goi('POST', '/cashier-counter/create', { ...h, data: { shopId, name: 'Quầy 01', code: 'Q01' } });

  // Kho tự sinh là lý do cả bước này tồn tại — 🚫 ghi sổ khi chưa thấy kho.
  const kho = await goi('GET', `/shops/${shopId}/inventory`, h);
  expect(JSON.stringify(kho || '[]'), 'Điểm bán tạo xong mà không có kho tự sinh').not.toBe('[]');

  ghi('diemBan', { maShop, tenShop, maXa, shopId });
});
