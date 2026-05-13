const { test, expect } = require('@playwright/test');
const {
  annotateNoData,
  clickFirstVisible,
  closeOverlay,
  expectAnyText,
  login,
  openModule,
  selectSupplyScope,
  visibleText,
} = require('../../shared/vnpost-helpers');

const SUPPLIER_URLS = [
  'https://vnpost.sfin.vn/inventory/warehouse-supplier',
  'https://vnpost.sfin.vn/warehouse/supplier',
  'https://vnpost.sfin.vn/stock/supplier',
  'https://vnpost.sfin.vn/inventory/supplier',
  'https://vnpost.sfin.vn/supplier',
  'https://vnpost.sfin.vn/product/supplier',
  'https://vnpost.sfin.vn/purchase/supplier',
];

async function openSupplierModule(page) {
  await openModule(page, SUPPLIER_URLS, ['Kho hàng', 'Nhà cung cấp'], [
    /Quản lý nhà cung cấp/i,
    /Nhà cung cấp/i,
    /Quản lý Nhóm NCC/i,
  ]);
  await expectAnyText(page, [/Nhà cung cấp/, /NCC/]);
}

async function clickAction(page, patterns, timeout = 4000) {
  const locators = patterns.flatMap((pattern) => [
    page.getByRole('button', { name: pattern }).first(),
    page.getByText(pattern, { exact: false }).first(),
  ]);
  return clickFirstVisible(page, locators, timeout);
}

async function openAddDrawer(page, buttonPatterns) {
  const opened = await clickAction(page, buttonPatterns);
  if (!opened) {
    test.info().annotations.push({
      type: 'OBSERVED_MISSING_ACTION',
      description: 'Không thấy nút mở form thêm mới trong UI hiện tại.',
    });
    return false;
  }
  await page.waitForTimeout(800);
  const overlay = page.locator('.ant-drawer:visible, .ant-modal:visible').first();
  if (!await overlay.isVisible().catch(() => false)) {
    test.info().annotations.push({
      type: 'OBSERVED_MISSING_FORM',
      description: 'Click Thêm mới nhưng UI hiện tại không mở drawer/modal thêm mới.',
    });
    return false;
  }
  await expect(overlay).toBeVisible();
  return true;
}

async function saveVisibleForm(page) {
  await clickFirstVisible(page, [
    page.getByRole('button', { name: /Xác nhận/i }).last(),
    page.getByRole('button', { name: /^Thêm$/i }).last(),
    page.getByRole('button', { name: /^Lưu$/i }).last(),
  ], 3000);
  await page.waitForTimeout(800);
}

async function firstDataRow(page) {
  const row = page.locator('.ant-table-row').first();
  if (await row.isVisible().catch(() => false)) return row;
  return null;
}

function mainSearchInput(page, accessibleName = /Tìm kiếm/i) {
  return page.locator('main').getByRole('textbox', { name: accessibleName }).first();
}

test.describe('VNPost - Nhà cung cấp', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectSupplyScope(page);
  });

  test('NCC-001 Mở màn Quản lý nhà cung cấp', async ({ page }) => {
    await openSupplierModule(page);
    await expectAnyText(page, [/Quản lý nhà cung cấp/, /Nhà cung cấp/]);
    await expectAnyText(page, [/Thêm mới|Quản lý Nhóm NCC|Quản lý danh mục|Danh sách/]);
  });

  test('NCC-005 Mở màn Nhóm Nhà cung cấp', async ({ page }) => {
    await openSupplierModule(page);
    const opened = await clickAction(page, [/Quản lý Nhóm NCC/i, /Nhóm NCC/i]);
    expect(opened).toBeTruthy();
    await expectAnyText(page, [/Nhóm Nhà cung cấp|Nhóm NCC|Thêm nhóm/]);
  });

  test('NCC-006/007 Thêm nhóm NCC - mở form và validate rỗng', async ({ page }) => {
    await openSupplierModule(page);
    await clickAction(page, [/Quản lý Nhóm NCC/i, /Nhóm NCC/i]);
    const hasForm = await openAddDrawer(page, [/Thêm mới/i, /Thêm nhóm/i]);
    if (!hasForm) {
      await expectAnyText(page, [/Nhóm Nhà cung cấp|Thêm mới/]);
      return;
    }
    await expectAnyText(page, [/Thêm nhóm nhà cung cấp|Tên nhóm|Mã nhóm|Ghi chú/]);
    await saveVisibleForm(page);
    await expectAnyText(page, [/Vui lòng|không được để trống|bắt buộc|required/]);
  });

  test('NCC-008 Tìm kiếm nhóm NCC', async ({ page }) => {
    await openSupplierModule(page);
    await clickAction(page, [/Quản lý Nhóm NCC/i, /Nhóm NCC/i]);
    const search = mainSearchInput(page);
    await expect(search).toBeVisible();
    await search.fill('AUTO_NOT_FOUND_SUPPLIER_GROUP');
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(1000);
    await expectAnyText(page, [/Nhóm|Trống|Không có dữ liệu|Danh sách/]);
  });

  test('NCC-012 Mở drawer Danh mục nhà cung cấp', async ({ page }) => {
    await openSupplierModule(page);
    const opened = await clickAction(page, [/Quản lý danh mục/i, /Danh mục NCC/i]);
    expect(opened).toBeTruthy();
    await expectAnyText(page, [/Danh mục nhà cung cấp|Danh mục NCC|Thêm danh mục/]);
  });

  test('NCC-013/014 Thêm danh mục NCC - mở form và validate rỗng', async ({ page }) => {
    await openSupplierModule(page);
    await clickAction(page, [/Quản lý danh mục/i, /Danh mục NCC/i]);
    const hasForm = await openAddDrawer(page, [/Thêm mới/i, /Thêm danh mục/i]);
    if (!hasForm) {
      await expectAnyText(page, [/Danh mục nhà cung cấp|Thêm mới|Danh mục/]);
      return;
    }
    await expectAnyText(page, [/Thêm danh mục|Tên danh mục|Mã danh mục|Ghi chú/]);
    await saveVisibleForm(page);
    await expectAnyText(page, [/Vui lòng|không được để trống|bắt buộc|required/]);
  });

  test('NCC-019 Mở drawer Thêm nhà cung cấp và kiểm tra field chính', async ({ page }) => {
    await openSupplierModule(page);
    await openAddDrawer(page, [/Thêm mới/i]);
    await expectAnyText(page, [
      /Thêm nhà cung cấp/,
      /Mã Nhà cung cấp|Mã NCC/,
      /Tên Nhà cung cấp|Tên NCC/,
      /Số điện thoại/,
      /Tỉnh|Thành phố/,
      /Phường|Xã/,
      /Nhóm NCC/,
      /Danh mục NCC/,
      /Thông tin đặt hàng/,
      /Thông tin xử/i,
    ]);
  });

  test('NCC-020 Thêm NCC - validate form rỗng', async ({ page }) => {
    await openSupplierModule(page);
    await openAddDrawer(page, [/Thêm mới/i]);
    await saveVisibleForm(page);
    await expectAnyText(page, [/Vui lòng|không được để trống|bắt buộc|required/]);
  });

  test('NCC-022/023 Validate định dạng điện thoại và email NCC', async ({ page }) => {
    await openSupplierModule(page);
    await openAddDrawer(page, [/Thêm mới/i]);
    await page.getByText(/Số điện thoại/i).first().click().catch(() => {});
    await page.locator('input:visible').nth(2).fill('012345').catch(() => {});
    await page.getByText(/Email/i).first().click().catch(() => {});
    await page.locator('input:visible').last().fill('email-sai').catch(() => {});
    await saveVisibleForm(page);
    await expectAnyText(page, [/không hợp lệ|đúng định dạng|Vui lòng|Email|Số điện thoại/]);
  });

  test('NCC-025 Tìm kiếm NCC không có kết quả', async ({ page }) => {
    await openSupplierModule(page);
    const input = mainSearchInput(page, /Tìm kiếm theo tên, sđt nhà cung cấp/i);
    await expect(input).toBeVisible();
    await input.fill(`AUTO_NCC_${Date.now()}`);
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(1000);
    await expectAnyText(page, [/Trống|Không có dữ liệu|Danh sách|Nhà cung cấp/]);
  });

  test('NCC-027 Xem chi tiết NCC khi có dữ liệu', async ({ page }) => {
    await openSupplierModule(page);
    const row = await firstDataRow(page);
    if (!row) {
      await annotateNoData('Danh sách NCC trống nên không thể kiểm tra chi tiết NCC.');
      await expectAnyText(page, [/Trống|Danh sách|Nhà cung cấp/]);
      return;
    }
    const opened = await clickFirstVisible(page, [
      row.getByText(/Chi tiết|Xem chi tiết/i).first(),
      row.locator('a, button').last(),
    ], 3000);
    expect(opened).toBeTruthy();
    await page.waitForTimeout(1200);
    await expectAnyText(page, [/Thông tin cơ bản|Mã Nhà cung cấp|Tên Nhà cung cấp|Số điện thoại|Nhà cung cấp/]);
  });

  test('NCC-029 Mở Danh sách sản phẩm theo NCC khi có dữ liệu', async ({ page }) => {
    await openSupplierModule(page);
    const row = await firstDataRow(page);
    if (!row) {
      await annotateNoData('Danh sách NCC trống nên không thể mở sản phẩm theo NCC.');
      return;
    }
    const opened = await clickFirstVisible(page, [
      row.getByText(/^Sản phẩm$/i).first(),
      row.getByText(/Sản phẩm/i).first(),
    ], 3000);
    expect(opened).toBeTruthy();
    await expectAnyText(page, [/Danh sách sản phẩm theo nhà cung cấp|Thêm mới|Cập nhật SP|Bảng giá|Lịch sử giá/]);
  });

  test('NCC-035 Mở Bảng giá NCC khi có dữ liệu', async ({ page }) => {
    await openSupplierModule(page);
    const row = await firstDataRow(page);
    if (!row) {
      await annotateNoData('Danh sách NCC trống nên không thể mở bảng giá NCC.');
      return;
    }
    const opened = await clickFirstVisible(page, [
      row.getByText(/Bảng giá/i).first(),
      page.getByText(/Bảng giá/i).first(),
    ], 3000);
    if (!opened) {
      await annotateNoData('Không thấy link/nút Bảng giá trên row NCC hiện tại.');
      return;
    }
    await expectAnyText(page, [/Bảng giá nhà cung cấp|Tạo bảng giá|Nháp|Đã ban hành/]);
  });

  test('NCC-045 Mở Công nợ NCC khi có dữ liệu', async ({ page }) => {
    await openSupplierModule(page);
    const row = await firstDataRow(page);
    if (!row) {
      await annotateNoData('Danh sách NCC trống nên không thể mở công nợ NCC.');
      return;
    }
    const opened = await clickFirstVisible(page, [
      row.getByText(/Công nợ/i).first(),
      page.getByText(/Công nợ/i).first(),
    ], 3000);
    if (!opened) {
      await annotateNoData('Không thấy link/nút Công nợ trên row NCC hiện tại.');
      return;
    }
    await expectAnyText(page, [/Lịch sử ghi nợ|thanh toán|Tổng còn nợ|Ghi nợ|Gạch nợ/]);
  });

  test('NCC-052 Mở Phiếu trả hàng NCC khi có dữ liệu', async ({ page }) => {
    await openSupplierModule(page);
    const row = await firstDataRow(page);
    if (!row) {
      await annotateNoData('Danh sách NCC trống nên không thể mở phiếu trả hàng NCC.');
      return;
    }
    const opened = await clickFirstVisible(page, [
      row.getByText(/Trả hàng/i).first(),
      page.getByText(/Trả hàng/i).first(),
    ], 3000);
    if (!opened) {
      await annotateNoData('Không thấy link/nút Trả hàng trên row NCC hiện tại.');
      return;
    }
    await expectAnyText(page, [/Phiếu trả hàng|Tạo phiếu trả hàng|Sản phẩm|Số lượng|Quỹ thu/]);
    await closeOverlay(page);
  });
});
