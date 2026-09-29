'use strict';

/**
 * Bước 1 — CÂY TỔ CHỨC: tạo Bưu điện Tỉnh rồi Bưu điện Xã trực thuộc.
 *
 * 🔴 Mọi phân hệ khác lọc dữ liệu theo cây này. Đây phải là bước đầu tiên.
 * 🔴 Mã đơn vị con PHẢI bắt đầu bằng mã đơn vị cha — backend chặn bằng
 *    `SSHOP-402 "Mã điểm bán phải bắt đầu bằng mã đơn vị cha"`, và FE validate trước nên
 *    POST còn không được gửi. 🚫 Đừng đặt mã tuỳ ý.
 */

const { test, expect } = require('@playwright/test');
const { OrganizationPage } = require('../../shared/pages/organization.page');
const { ghi, PREFIX, runId } = require('../seed-state');

test.describe.configure({ mode: 'serial' });

/** Mã đơn vị chỉ nhận chữ/số/gạch — 🚫 không dùng tiền tố `AUTO_` có gạch dưới cho MÃ. */
const MA_TINH = `S${runId()}`.slice(0, 10);
const MA_XA = `${MA_TINH}01`;

test('seed 1.1 — tạo Bưu điện Tỉnh', async ({ page }) => {
  const man = new OrganizationPage(page);
  await man.goto();

  const res = await man.create({
    unitCode: MA_TINH,
    unitName: `${PREFIX}TINH_${runId()}`,
    parentCode: process.env.VNPOST_ORG_PARENT_CODE || undefined,
  });
  expect(res.status(), await res.text()).toBeLessThan(400);

  ghi('toChuc', { maTinh: MA_TINH, tenTinh: `${PREFIX}TINH_${runId()}` });
});

test('seed 1.2 — tạo Bưu điện Xã trực thuộc tỉnh vừa tạo', async ({ page }) => {
  const man = new OrganizationPage(page);
  await man.goto();

  const res = await man.create({
    unitCode: MA_XA,
    unitName: `${PREFIX}XA_${runId()}`,
    parentCode: MA_TINH,
  });
  expect(res.status(), await res.text()).toBeLessThan(400);

  ghi('toChuc', { maXa: MA_XA, tenXa: `${PREFIX}XA_${runId()}` });
});
