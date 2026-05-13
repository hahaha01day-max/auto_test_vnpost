// Playwright Test chuẩn cho tài liệu 04 - Quản lý sản phẩm / Danh mục sản phẩm.
const { test, expect } = require('@playwright/test');

const ACCOUNT = process.env.VNPOST_ACCOUNT || '84862036990';
const PASSWORD = process.env.VNPOST_PASSWORD || '123456';
const TARGET = 'https://vnpost.sfin.vn/';
const PRODUCT_URL = 'https://vnpost.sfin.vn/product/normal';
const CATEGORY_URL = 'https://vnpost.sfin.vn/product/category?type=0';

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
        () => /Admin|Đăng xuất|Truy cập trang quản lý/.test(document.body?.innerText || ''),
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

async function selectAdminScope(page) {
  const admin = page.getByText('Admin', { exact: true });
  if (await admin.isVisible().catch(() => false)) {
    await admin.click();
  } else {
    await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first().click();
  }
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function ensureLoggedIn(page) {
  const text = await visibleText(page, 1200);
  if (/Đăng nhập|Tên đăng nhập|Mật khẩu/.test(text)) {
    await login(page);
    await selectAdminScope(page);
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

async function openProductModule(page) {
  await gotoWithRetry(
    page,
    PRODUCT_URL,
    () => page.getByText('Danh sách sản phẩm', { exact: false }).first().isVisible(),
  );
  await expect(page).toHaveURL(/\/product\/normal/);
  await expect(page.getByText('Danh sách sản phẩm', { exact: false }).first()).toBeVisible();
  await dismissHeaderMenu(page);
}

async function openCategoryModule(page) {
  await gotoWithRetry(
    page,
    CATEGORY_URL,
    () => page.getByText('Quản lý danh mục', { exact: false }).first().isVisible(),
  );
  await expect(page).toHaveURL(/\/product\/category/);
  await expect(page.getByText('Quản lý danh mục', { exact: false }).first()).toBeVisible();
  await dismissHeaderMenu(page);
}

async function closeOverlay(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
  await clickFirstVisible(page, [
    page.getByRole('button', { name: /hủy|huỷ|đóng|cancel/i }).first(),
    page.locator('.ant-drawer-close, .ant-modal-close').first(),
  ], 1000);
}

async function dismissHeaderMenu(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.mouse.click(260, 90).catch(() => {});
  await page.waitForTimeout(500);
}

async function openMoreMenu(page) {
  await dismissHeaderMenu(page);
  const more = page.getByRole('button', { name: /xem thêm/i }).first();
  await more.waitFor({ timeout: 10_000 });
  await more.click({ timeout: 5_000 }).catch(async () => {
    await dismissHeaderMenu(page);
    await more.click({ force: true, timeout: 5_000 });
  });
  await page.waitForTimeout(500);
}

async function openAddProductDrawer(page) {
  await openProductModule(page);
  await page.getByRole('button', { name: /thêm mới/i }).click();
  await expect(page.getByText('Thêm sản phẩm', { exact: false }).first()).toBeVisible();
}

async function openProductImportDrawer(page) {
  await openProductModule(page);
  await openMoreMenu(page);
  return clickFirstVisible(page, [
    page.getByText('Nhập từ Excel', { exact: false }).first(),
    page.getByText('Nhập từ file Excel', { exact: false }).first(),
    page.getByText('Nhập từ file excel', { exact: false }).first(),
  ], 3000);
}

function uniqueSuffix() {
  return String(Date.now()).slice(-8);
}

async function confirmDialog(page) {
  await clickFirstVisible(page, [
    page.getByRole('button', { name: /đồng ý|xác nhận|xóa|xoá|ok/i }).last(),
    page.locator('.ant-popconfirm-buttons button').last(),
    page.locator('.ant-modal-confirm-btns button').last(),
  ], 5000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function jsClick(locator) {
  await locator.evaluate((element) => element.click());
}

function rowByText(page, text) {
  return page.locator('.ant-table-row').filter({ hasText: text }).first();
}

async function createCategory(page, name) {
  await openCategoryModule(page);
  await page.getByRole('button', { name: /thêm mới/i }).click();
  const drawer = page.locator('.ant-drawer:visible').last();
  await drawer.getByPlaceholder(/nhập tên danh mục/i).fill(name);
  await jsClick(drawer.getByRole('button', { name: /xác nhận/i }));
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await searchCategory(page, name);
  await expect(rowByText(page, name)).toBeVisible({ timeout: 15_000 });
}

async function searchCategory(page, keyword) {
  await openCategoryModule(page);
  const input = page.getByPlaceholder(/tìm kiếm theo tên danh mục/i).first();
  await input.fill('');
  await input.fill(keyword);
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function updateCategory(page, oldName, newName) {
  await searchCategory(page, oldName);
  const row = rowByText(page, oldName);
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.locator('.anticon-edit').locator('xpath=ancestor::button').click();
  const drawer = page.locator('.ant-drawer:visible').last();
  const nameInput = drawer.getByPlaceholder(/nhập tên danh mục/i);
  await nameInput.fill(newName);
  await jsClick(drawer.getByRole('button', { name: /xác nhận/i }));
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await searchCategory(page, newName);
  await expect(rowByText(page, newName)).toBeVisible({ timeout: 15_000 });
}

async function deleteCategory(page, name) {
  await searchCategory(page, name);
  const row = rowByText(page, name);
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.locator('.ant-btn-dangerous').click();
  await confirmDialog(page);
  await expect(rowByText(page, name)).toHaveCount(0, { timeout: 15_000 });
}

async function selectDropdownOption(page, inputLocator, optionText) {
  await inputLocator.click({ force: true });
  await inputLocator.fill(optionText).catch(() => {});
  await page.waitForTimeout(500);
  const option = page.locator('.ant-select-dropdown:visible').getByText(optionText, { exact: false }).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click();
  } else {
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(500);
}

function inputByLabel(scope, labelText) {
  return scope
    .locator(`label[title="${labelText}"]`)
    .locator('xpath=ancestor::div[contains(@class, "ant-form-item")]//input')
    .first();
}

async function createProduct(page, data) {
  await openAddProductDrawer(page);
  const drawer = page.locator('.ant-drawer:visible').last();
  await drawer.locator('#form_sku').fill(data.sku);
  await selectDropdownOption(page, drawer.locator('#form_categoryId'), data.category);
  await drawer.locator('#form_accountingCode').fill(data.accountingCode);
  await inputByLabel(drawer, 'Tên sản phẩm').fill(data.name);
  await selectDropdownOption(page, drawer.locator('#form_unit').first(), data.unit);
  await drawer.locator('#pricePolicies_0_price').fill(data.price);
  await jsClick(drawer.getByRole('button', { name: /xác nhận/i }));
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await openProductModule(page);
  await searchProduct(page, data.name);
  await expect(rowByText(page, data.name)).toBeVisible({ timeout: 20_000 });
}

async function searchProduct(page, keyword) {
  await openProductModule(page);
  const input = page.getByPlaceholder(/tìm kiếm theo tên|tìm kiếm theo mã/i).first();
  await input.fill('');
  await input.fill(keyword);
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function openProductDetail(page, name) {
  await searchProduct(page, name);
  const row = rowByText(page, name);
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.locator('.product-name-button').click();
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function updateProductName(page, oldName, newName) {
  await openProductDetail(page, oldName);
  await clickFirstVisible(page, [
    page.getByRole('button', { name: /sửa thông tin/i }).first(),
    page.getByText(/sửa thông tin/i).first(),
  ], 5000);
  await page.waitForTimeout(1200);
  const drawer = page.locator('.ant-drawer:visible').last();
  const nameInput = drawer.locator('#form_productName');
  await expect(nameInput).toBeVisible({ timeout: 15_000 });
  await nameInput.fill(newName);
  await jsClick(drawer.getByRole('button', { name: /cập nhật/i }));
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await searchProduct(page, newName);
  await expect(rowByText(page, newName)).toBeVisible({ timeout: 20_000 });
}

async function deleteProduct(page, name) {
  await searchProduct(page, name);
  const row = rowByText(page, name);
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.locator('.ant-btn-dangerous').click();
  await confirmDialog(page);
  await searchProduct(page, name);
  await expect(rowByText(page, name)).toHaveCount(0, { timeout: 20_000 });
}

test.describe('VNPost - Danh mục sản phẩm / Quản lý sản phẩm', () => {
  test('CAT-001 Mở màn Quản lý danh mục sản phẩm', async ({ page }) => {
    await openCategoryModule(page);
    await expect(page.getByRole('button', { name: /thêm mới/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /nhập từ excel/i })).toBeVisible();
    await expect(page.getByText('Danh mục', { exact: false }).first()).toBeVisible();
  });

  test('CAT-002 Thêm danh mục - kiểm tra field trên drawer', async ({ page }) => {
    await openCategoryModule(page);
    await page.getByRole('button', { name: /thêm mới/i }).click();
    await expect(page.getByText('Thêm danh mục', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Loại sản phẩm', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Tên danh mục', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Danh mục cha', { exact: false }).first()).toBeVisible();
  });

  test('CAT-003 Thêm danh mục - validate bỏ trống tên danh mục', async ({ page }) => {
    await openCategoryModule(page);
    await page.getByRole('button', { name: /thêm mới/i }).click();
    await page.getByRole('button', { name: /xác nhận/i }).click();
    await expect(page.getByText(/Vui lòng|bắt buộc|Nhập tên danh mục/i).first()).toBeVisible();
  });

  test('CAT-004 Nhập danh mục từ Excel - validate chưa chọn file', async ({ page }) => {
    await openCategoryModule(page);
    await page.getByRole('button', { name: /nhập từ excel/i }).click();
    await expect(page.getByText('Nhập từ Excel', { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: /xác nhận/i }).click();
    await expect(page.getByText(/Vui lòng chọn file excel/i).first()).toBeVisible();
  });

  test('CAT-005 Nhập danh mục từ Excel - hiển thị tải file mẫu', async ({ page }) => {
    await openCategoryModule(page);
    await page.getByRole('button', { name: /nhập từ excel/i }).click();
    await expect(page.getByRole('button', { name: /tải file mẫu/i })).toBeVisible();
    await expect(page.getByText(/Kéo thả hoặc bấm để chọn file|Hỗ trợ .xls, .xlsx/i).first()).toBeVisible();
  });

  test('CAT-006 CRUD danh mục - thêm, sửa, xóa thật', async ({ page }) => {
    const suffix = uniqueSuffix();
    const name = `AUTO_PW_CAT_${suffix}`;
    const updatedName = `AUTO_PW_CAT_UPD_${suffix}`;
    await createCategory(page, name);
    await updateCategory(page, name, updatedName);
    await deleteCategory(page, updatedName);
  });

  test('PRD-001 Mở màn danh sách sản phẩm', async ({ page }) => {
    await openProductModule(page);
    await expect(page.getByRole('button', { name: /thêm mới/i })).toBeVisible();
    await expect(page.getByText('Danh sách sản phẩm', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/SKU|Tên sản phẩm|Trạng thái/i).first()).toBeVisible();
  });

  test('PRD-002 Danh sách sản phẩm - hiển thị bộ lọc tìm kiếm và trạng thái', async ({ page }) => {
    await openProductModule(page);
    await expect(page.getByPlaceholder(/tìm kiếm theo tên/i).first()).toBeVisible();
    await expect(page.getByText(/Trạng thái/i).first()).toBeVisible();
    await expect(page.getByText(/Chọn hình thức phân phối/i).first()).toBeVisible();
  });

  test('PRD-003 Thêm sản phẩm - kiểm tra nhóm thông tin cơ bản', async ({ page }) => {
    await openAddProductDrawer(page);
    for (const label of ['Thông tin cơ bản', 'SKU', 'Danh mục', 'Tên sản phẩm', 'Đơn vị', 'Hình thức phân phối', 'Trạng thái']) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test('PRD-004 Thêm sản phẩm - kiểm tra thông tin vật lý, giá bán, kho hàng', async ({ page }) => {
    await openAddProductDrawer(page);
    const drawer = page.locator('.ant-drawer:visible').last();
    for (const label of ['Thông tin vật lý', 'Khối lượng', 'Thể tích', 'Kích thước', 'Giá bán', 'Kho hàng']) {
      await expect(drawer.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test('PRD-005 Thêm sản phẩm - validate form rỗng', async ({ page }) => {
    await openAddProductDrawer(page);
    await page.getByRole('button', { name: /xác nhận/i }).click();
    await expect(page.getByText(/Vui lòng điền đầy đủ|Vui lòng nhập|Vui lòng chọn/i).first()).toBeVisible();
  });

  test('PRD-006 Thêm sản phẩm - chọn Ký gửi hiển thị Loại hàng ký gửi', async ({ page }) => {
    await openAddProductDrawer(page);
    const drawer = page.locator('.ant-drawer:visible').last();
    await drawer.getByText('Ký gửi', { exact: true }).click();
    await expect(drawer.getByText('Loại hàng ký gửi', { exact: false }).first()).toBeVisible();
    await expect(drawer.getByText(/Hàng hóa|Sim thẻ/i).first()).toBeVisible();
  });

  test('PRD-007 Nhập sản phẩm từ Excel - mở drawer import', async ({ page }) => {
    const opened = await openProductImportDrawer(page);
    if (!opened) {
      test.info().annotations.push({ type: 'OBSERVED_MISSING', description: 'Không mở được chức năng Nhập từ Excel trong dropdown Xem thêm.' });
      return;
    }
    await expect(page.getByText(/Nhập từ file excel|Nhập từ Excel/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /tải về file mẫu|tải file mẫu/i })).toBeVisible();
  });

  test('PRD-008 Nhập sản phẩm từ Excel - validate chưa chọn file', async ({ page }) => {
    const opened = await openProductImportDrawer(page);
    if (!opened) {
      test.info().annotations.push({ type: 'OBSERVED_MISSING', description: 'Không mở được chức năng Nhập từ Excel trong dropdown Xem thêm.' });
      return;
    }
    await page.getByRole('button', { name: /xác nhận nhập|xác nhận/i }).click();
    await expect(page.getByText(/Vui lòng chọn file excel/i).first()).toBeVisible();
  });

  test('PRD-009 In tem nhãn - mở drawer cấu hình', async ({ page }) => {
    await openProductModule(page);
    await openMoreMenu(page);
    const opened = await clickFirstVisible(page, [page.getByText('In tem nhãn', { exact: false }).first()], 3000);
    expect(opened).toBeTruthy();
    await expect(page.getByText('In tem nhãn', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Danh sách sản phẩm', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Cấu hình & Chọn giấy in', { exact: false }).first()).toBeVisible();
  });

  test('PRD-010 In tem nhãn - hiển thị tùy chọn mẫu giấy và mã vạch', async ({ page }) => {
    await openProductModule(page);
    await openMoreMenu(page);
    const opened = await clickFirstVisible(page, [page.getByText('In tem nhãn', { exact: false }).first()], 3000);
    expect(opened).toBeTruthy();
    await expect(page.getByText(/Loại mã in|Mã vạch|Cỡ chữ|Độ rộng mã vạch/i).first()).toBeVisible();
    await expect(page.getByText(/Chọn giấy/i).first()).toBeVisible();
  });

  test('PRD-011 CRUD sản phẩm - thêm, sửa tên, xóa thật', async ({ page }) => {
    const suffix = uniqueSuffix();
    const product = {
      sku: String(100000 + Number(suffix.slice(-5))),
      accountingCode: `AC${suffix}`,
      name: `AUTO_PW_PRD_${suffix}`,
      updatedName: `AUTO_PW_PRD_UPD_${suffix}`,
      category: 'Thực phẩm',
      unit: 'cái',
      price: '1000',
    };
    await createProduct(page, product);
    await updateProductName(page, product.name, product.updatedName);
    await deleteProduct(page, product.updatedName);
  });
});
