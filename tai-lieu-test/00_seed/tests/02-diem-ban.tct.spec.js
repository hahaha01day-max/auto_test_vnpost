'use strict';

/**
 * Bước 2 — ĐIỂM BÁN, đặt dưới đúng xã đã seed ở bước 1.
 *
 * 🔴 Tạo điểm bán là **hệ thống tự tạo kho** cho nó ⇒ 🚫 không có bước tạo kho riêng.
 *
 * 🔴 MÃ ĐIỂM BÁN phải mở đầu bằng **mã đơn vị cha thấp nhất** (bưu điện xã), không phải mã tỉnh —
 *    backend trả `SSHOP-402 "Mã điểm bán phải bắt đầu bằng mã đơn vị cha"`, và FE validate trước
 *    nên POST còn không được gửi (triệu chứng: bấm Xác nhận xong không có request nào).
 *
 * 🔴 Dùng cấp **Xã + Pos mini**: cấp Tỉnh + phân loại Hub bị backend trả SSHOP-500 (đo 17/09/2026,
 *    xem `01_quan_ly_diem_ban/tests/tao-va-tam-ngung.tct.spec.js`).
 *
 * 🚫 Màn `/chain/shop-management` KHÔNG có chức năng xoá ⇒ bản ghi ở lại vĩnh viễn.
 *    Mỗi lượt seed tạo ĐÚNG MỘT điểm bán.
 */

const { test, expect } = require('@playwright/test');
const {
  openDropdown,
  openShopList,
  selectByField,
} = require('../../01_quan_ly_diem_ban/tests/shop-page');
const { ghi, lay, PREFIX, runId } = require('../seed-state');

test.describe.configure({ mode: 'serial' });

test('seed 2.1 — tạo điểm bán dưới xã đã seed', async ({ page }) => {
  const maXa = lay('toChuc', 'maXa');
  const tenXa = lay('toChuc', 'tenXa');
  const tenTinh = lay('toChuc', 'tenTinh');
  const tenShop = `${PREFIX}SHOP_${runId()}`;
  const maShop = `${maXa}A${runId().slice(-4)}`;

  await openShopList(page, 'tct');
  await page.getByRole('button', { name: 'Thêm điểm bán' }).first().click();

  const drawer = page.locator('.ant-drawer-open').first();
  await expect(drawer).toBeVisible();

  await drawer.getByText('Xã', { exact: true }).first().click();
  const posMini = drawer.getByText('Pos mini', { exact: true }).first();
  await expect(posMini).toBeVisible();
  await posMini.click();

  await drawer.locator('input[placeholder*="Nhập tên"]').first().fill(tenShop);
  await drawer.locator('input[placeholder*="Nhập email"]').first().fill(`auto${runId()}@example.com`);
  await drawer.locator('input[placeholder*="Nhập số điện thoại"]').first().fill('0900000000');
  await drawer.locator('input[placeholder*="Nhập SĐT quản lý"]').first().fill('0900000001');
  await drawer.locator('input[placeholder*="Số nhà"]').first().fill('AUTO TEST - khong su dung');

  const loaiHinh = drawer.locator('.ant-select').filter({ hasText: 'Chọn loại hình' }).first();
  if (await loaiHinh.count()) {
    await (await openDropdown(page, loaiHinh)).locator('.ant-select-item-option').first().click();
  }

  // 🔴 Chọn ĐÚNG tỉnh/xã đã seed, 🚫 không lấy mục đầu danh sách: lấy bừa là điểm bán rơi vào
  //    nhánh cây của người khác, và mọi bước seed sau (sản phẩm, tồn, bảng giá) đo sai phạm vi.
  // 🔴 Danh sách tỉnh dài và cuộn ảo ⇒ phải GÕ để lọc, 🚫 không cuộn tìm: mục chưa render thì
  //    locator không thấy và test treo hết timeout dù dữ liệu có thật.
  const oTinh = selectByField(drawer, 'orgProvinceCode');
  const dsTinh = await openDropdown(page, oTinh);
  await oTinh.locator('input').first().fill(tenTinh);
  const mucTinh = dsTinh.locator('.ant-select-item-option').filter({ hasText: tenTinh });
  await expect(mucTinh.first(), `Không thấy tỉnh "${tenTinh}" trong danh sách.`).toBeVisible();
  await mucTinh.first().click();

  const oXa = selectByField(drawer, 'orgWardCode');
  const dsXa = await openDropdown(page, oXa);
  await expect
    .poll(async () => dsXa.locator('.ant-select-item-option').count(), {
      message: 'Dropdown Bưu điện xã/phường không nạp được lựa chọn nào.',
      timeout: 20_000,
    })
    .toBeGreaterThan(0);
  await oXa.locator('input').first().fill(tenXa);
  const mucXa = dsXa.locator('.ant-select-item-option').filter({ hasText: tenXa });
  await expect(mucXa.first(), `Không thấy bưu điện xã "${tenXa}" trong danh sách.`).toBeVisible();
  await mucXa.first().click();

  await drawer.locator('input[placeholder*="Nhập mã"]').first().fill(maShop);

  // Tỉnh/TP và Xã/Phường hành chính: FE không đánh dấu bắt buộc nhưng bỏ trống thì backend trả
  // SSHOP-500 (đo 17/09/2026) ⇒ điền đủ để lỗi còn lại là lỗi thật.
  const chonTinhTP = drawer.locator('.ant-select').filter({ hasText: 'Chọn tỉnh/thành phố' }).first();
  if (await chonTinhTP.count()) {
    await (await openDropdown(page, chonTinhTP)).locator('.ant-select-item-option').first().click();
    const dsPhuong = await openDropdown(page, drawer.locator('.ant-select').filter({ hasText: 'Chọn xã/phường' }).first());
    if (await dsPhuong.locator('.ant-select-item-option').count()) {
      await dsPhuong.locator('.ant-select-item-option').first().click();
    } else {
      await page.keyboard.press('Escape');
    }
  }

  const cho = page.waitForResponse(
    (r) => r.url().includes('/shops/profile') && r.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await drawer.getByRole('button', { name: /Xác nhận|Lưu/ }).first().click();
  const res = await cho;
  expect(res.status(), await res.text()).toBeLessThan(400);

  ghi('diemBan', { maShop, tenShop, maXa });
});
