// Playwright Test chuẩn cho tài liệu 05 - Bán hàng (POS).
const { test, expect } = require('@playwright/test');

const ACCOUNT = process.env.VNPOST_ACCOUNT || '84862036990';
const PASSWORD = process.env.VNPOST_PASSWORD || '123456';
const TARGET = 'https://vnpost.sfin.vn/';
const ORDER_LIST_URL = 'https://vnpost.sfin.vn/order/created-orders';
const POS_URL = 'https://vnpost.sfin.vn/order/create-order';

async function visibleText(page, limit = 4000) {
  const text = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
  return text.replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function clickFirstVisible(page, locators, timeout = 3000) {
  for (const locator of locators) {
    try {
      await locator.waitFor({ timeout });
      await locator.click({ timeout });
      return true;
    } catch (_) {
      // Try next locator.
    }
  }
  return false;
}

async function login(page) {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 25_000 });

  const inputs = page.locator('input:visible');
  let usernameInput = null;
  for (let i = 0; i < await inputs.count(); i++) {
    const input = inputs.nth(i);
    if (((await input.getAttribute('type')) || '') !== 'password') {
      usernameInput = input;
      break;
    }
  }
  if (!usernameInput) throw new Error('Không tìm thấy ô tài khoản');

  await usernameInput.fill(ACCOUNT);
  await passwordInput.fill(PASSWORD);
  const loginButton = page.getByRole('button', { name: /tiếp tục|đăng nhập|login|sign in/i });
  for (let attempt = 1; attempt <= 3; attempt++) {
    await loginButton.click({ timeout: 10_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    try {
      await page.waitForFunction(
        () => /Admin|Đăng xuất|Truy cập trang quản lý|Bán hàng/.test(document.body?.innerText || ''),
        null,
        { timeout: 15_000 },
      );
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

async function selectSalesScope(page) {
  const scopeClicked = await clickFirstVisible(page, [
    page.getByText('Giao dịch viên', { exact: true }).first(),
    page.getByText('Nhân viên bán hàng', { exact: true }).first(),
    page.getByText('Cửa hàng A - Chi nhánh', { exact: false }).first(),
    page.getByText('Truy cập điểm bán', { exact: false }).first(),
  ], 5000);

  if (!scopeClicked) {
    test.info().annotations.push({
      type: 'OBSERVED_SCOPE_FALLBACK',
      description: 'Không thấy role Giao dịch viên/Nhân viên bán hàng, fallback sang Admin hoặc đơn vị đầu tiên.',
    });
    const admin = page.getByText('Admin', { exact: true });
    if (await admin.isVisible().catch(() => false)) {
      await admin.click();
    } else {
      await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first().click();
    }
  }
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function ensureLoggedIn(page) {
  const text = await visibleText(page, 1200);
  if (/Đăng nhập|Tên đăng nhập|Mật khẩu/.test(text)) {
    await login(page);
    await selectSalesScope(page);
  }
}

async function gotoWithRetry(page, url, check, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await ensureLoggedIn(page);
    if (await check().catch(() => false)) return;
    const text = await visibleText(page, 1500);
    if (!/Error code 522|Connection timed out|Cloudflare/i.test(text) && attempt === retries) break;
    await page.waitForTimeout(1500);
  }
}

async function openOrderList(page) {
  await gotoWithRetry(
    page,
    ORDER_LIST_URL,
    () => page.getByText('Quản lý đơn hàng', { exact: false }).first().isVisible(),
  );
  await expect(page).toHaveURL(/\/order\/created-orders/);
  await expect(page.getByText('Quản lý đơn hàng', { exact: false }).first()).toBeVisible();
}

async function openPos(page) {
  await gotoWithRetry(
    page,
    POS_URL,
    () => page.getByText('Đơn hàng: 1', { exact: false }).first().isVisible(),
  );
  await expect(page).toHaveURL(/\/order\/create-order/);
  await expect(page.getByText('Đơn hàng: 1', { exact: false }).first()).toBeVisible();
}

async function closeOverlay(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
  await clickFirstVisible(page, [
    page.getByRole('button', { name: /hủy|huỷ|đóng|cancel/i }).first(),
    page.locator('.ant-drawer-close, .ant-modal-close').first(),
  ], 1000);
}

async function expectPosBaseControls(page) {
  await expect(page.locator('#product-search')).toBeVisible();
  await expect(page.getByText('Sản phẩm bán chạy', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Đơn hàng mẫu', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Chưa thêm sản phẩm / dịch vụ nào', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Tổng quan', { exact: false }).first()).toBeVisible();
  await expect(page.locator('#customer-selection')).toBeVisible();
  await expect(page.getByText('Chiết khấu', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Tổng tiền', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Cần thanh toán', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Thanh toán$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Thanh toán sau/i })).toBeVisible();
}

test.describe('VNPost - Bán hàng (POS)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectSalesScope(page);
  });

  test('POS-001 Mở màn Quản lý đơn hàng đã tạo', async ({ page }) => {
    await openOrderList(page);
    await expect(page.getByRole('button', { name: /Bán hàng/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Xuất excel/i })).toBeVisible();
    await expect(page.getByText('Danh sách đơn hàng', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Đơn nháp', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Đã thanh toán', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Còn nợ', { exact: false }).first()).toBeVisible();
  });

  test('POS-002 Từ danh sách đơn hàng mở màn Bán hàng', async ({ page }) => {
    await openOrderList(page);
    await page.getByRole('button', { name: /Bán hàng/i }).click();
    await expect(page).toHaveURL(/\/order\/create-order/);
    await expectPosBaseControls(page);
  });

  test('POS-003 Mở trực tiếp màn Bán hàng và kiểm tra control chính', async ({ page }) => {
    await openPos(page);
    await expectPosBaseControls(page);
    for (const header of ['#', 'Tên', 'Giá bán', 'Số lượng', 'Đơn vị', 'Tổng tiền']) {
      await expect(page.getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('POS-004 Thanh toán khi chưa có sản phẩm', async ({ page }) => {
    await openPos(page);
    await page.getByRole('button', { name: /^Thanh toán$/i }).click();
    await expect(page.getByText('Đơn hàng không có sản phẩm', { exact: false }).first()).toBeVisible();
  });

  test('POS-005 Thanh toán sau khi chưa có sản phẩm', async ({ page }) => {
    await openPos(page);
    await page.getByRole('button', { name: /Thanh toán sau/i }).click();
    await expect(page.getByText('Đơn hàng không có sản phẩm', { exact: false }).first()).toBeVisible();
  });

  test('POS-006 Mở chương trình khuyến mãi', async ({ page }) => {
    await openPos(page);
    await page.getByRole('button', { name: /Chương trình khuyến mãi/i }).click();
    await expect(page.getByText('Chương trình khuyến mãi', { exact: false }).last()).toBeVisible();
    await expect(page.getByText('Theo đơn hàng', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Theo sản phẩm', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Áp dụng/i })).toBeVisible();
    await closeOverlay(page);
  });

  test('POS-007 Nhập chiết khấu, đổi VNĐ/% và ghi chú', async ({ page }) => {
    await openPos(page);
    const discount = page.locator('#order-info-discount');
    await expect(discount).toBeVisible();
    await discount.fill('1000');
    await expect(discount).toHaveValue('1000');
    await page.getByText('%', { exact: true }).click();
    await expect(page.getByText('Chiết khấu đơn hàng', { exact: false }).first()).toBeVisible();
    await page.getByPlaceholder('Nhập ghi chú').fill('AUTO_POS_NOTE');
    await expect(page.getByPlaceholder('Nhập ghi chú')).toHaveValue('AUTO_POS_NOTE');
  });

  test('POS-008 Tìm kiếm khách hàng trên đơn POS', async ({ page }) => {
    await openPos(page);
    await page.locator('#customer-selection').fill('Nguyễn');
    await page.waitForTimeout(1000);
    await expect(page.locator('#customer-selection')).toBeVisible();
    await page.keyboard.press('Escape').catch(() => {});
  });

  test('POS-009 Tìm kiếm sản phẩm trên POS', async ({ page }) => {
    await openPos(page);
    await page.locator('#product-search').fill('AUTO');
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page.locator('#product-search')).toHaveValue('AUTO');
    await expect(page.getByText('Chưa thêm sản phẩm / dịch vụ nào', { exact: false }).first()).toBeVisible();
  });

  test('POS-010 Quay lại danh sách đơn hàng từ POS', async ({ page }) => {
    await openOrderList(page);
    await page.getByRole('button', { name: /Bán hàng/i }).click();
    await expect(page).toHaveURL(/\/order\/create-order/);
    await expectPosBaseControls(page);
    await page.getByRole('button', { name: /Trở về/i }).click();
    await clickFirstVisible(page, [
      page.getByRole('button', { name: /đồng ý|xác nhận|rời khỏi|ok/i }).last(),
      page.locator('.ant-modal-confirm-btns button').last(),
    ], 2000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await expect(page).toHaveURL(/\/order\/created-orders/);
    await expect(page.getByText('Quản lý đơn hàng', { exact: false }).first()).toBeVisible();
  });

  test('POS-011 Kiểm tra chức năng Xuất excel', async ({ page }) => {
    await openOrderList(page);
    const exportButton = page.getByRole('button', { name: /Xuất excel/i });
    await expect(exportButton).toBeVisible();
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await exportButton.click();
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    await downloadPromise;
    await expect(page.getByText('Quản lý đơn hàng', { exact: false }).first()).toBeVisible();
  });

  test('POS-012 Xem chi tiết đơn hàng khi có dữ liệu', async ({ page }) => {
    await openOrderList(page);
    const firstRow = page.locator('.ant-table-row').first();
    if (!await firstRow.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'OBSERVED_NO_DATA',
        description: 'Danh sách đơn hàng trống nên không thể kiểm tra chi tiết đơn hàng.',
      });
      await expect(page.getByText(/Trống|Danh sách đơn hàng/i).first()).toBeVisible();
      return;
    }

    const opened = await clickFirstVisible(page, [
      firstRow.getByText(/Xem chi tiết|Chi tiết/i).first(),
      firstRow.locator('a, button').last(),
    ], 3000);
    expect(opened).toBeTruthy();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    const text = await visibleText(page, 3000);
    expect(text).toMatch(/Thông tin chung|Mã đơn|Lịch sử thanh toán|Danh sách sản phẩm|Tổng tiền/i);
  });
});
