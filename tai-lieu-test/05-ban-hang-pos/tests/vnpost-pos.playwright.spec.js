// Playwright Test chuẩn cho tài liệu 05 - Bán hàng (POS).
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const ACCOUNT = process.env.VNPOST_ACCOUNT || '84862036990';
const PASSWORD = process.env.VNPOST_PASSWORD || '123456';
const TARGET = 'https://vnpost.sfin.vn/';
const ORDER_LIST_URL = 'https://vnpost.sfin.vn/order/created-orders';
const POS_URL = 'https://vnpost.sfin.vn/order/create-order';
const POS_PRODUCT_NAME = 'Sản phẩm 7 (Vượt Max)';
const POS_PRODUCT_PRICE = '10000';
const POS_CUSTOMER_QUERY = 'Nguyễn';
const POS_CUSTOMER_NAME = 'Nguyễn Bá';
const LOG_SENSITIVE_CURL = process.env.VNPOST_LOG_SENSITIVE !== '0';

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function shouldCaptureRequest(request) {
  const type = request.resourceType();
  if (['image', 'font', 'stylesheet', 'script', 'media'].includes(type)) return false;
  const url = request.url();
  if (/\.(png|jpg|jpeg|svg|webp|css|js|woff2?|map)(\?|$)/i.test(url)) return false;
  return /vnpost|sfin|postpay/i.test(url);
}

function requestToCurl(request) {
  const method = request.method();
  const headers = request.headers();
  const parts = ['curl', '-i', '-X', shellQuote(method), shellQuote(request.url())];

  for (const [name, rawValue] of Object.entries(headers)) {
    const lowerName = name.toLowerCase();
    if (['host', 'content-length'].includes(lowerName)) continue;
    const value = !LOG_SENSITIVE_CURL && ['authorization', 'cookie'].includes(lowerName)
      ? '<redacted: set VNPOST_LOG_SENSITIVE=1 to include>'
      : rawValue;
    parts.push('-H', shellQuote(`${name}: ${value}`));
  }

  const postData = request.postData();
  if (postData) parts.push('--data-raw', shellQuote(postData));
  return parts.join(' \\\n  ');
}

function installBackendCurlLogger(page) {
  const entries = [];
  page.__backendCurlEntries = entries;

  page.on('request', (request) => {
    if (!shouldCaptureRequest(request)) return;
    const url = request.url();
    if (request.method() === 'GET' && !/api|order|payment|invoice|cart|pos|sale|product|confirm/i.test(url)) return;
    entries.push({
      time: new Date().toISOString(),
      type: 'RECENT_REQUEST',
      method: request.method(),
      url,
      curl: requestToCurl(request),
    });
    if (entries.length > 40) entries.splice(0, entries.length - 40);
  });

  page.on('requestfailed', (request) => {
    if (!shouldCaptureRequest(request)) return;
    entries.push({
      time: new Date().toISOString(),
      type: 'REQUEST_FAILED',
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText || '',
      curl: requestToCurl(request),
    });
  });

  page.on('response', async (response) => {
    const request = response.request();
    if (!shouldCaptureRequest(request)) return;
    const status = response.status();
    if (status < 400 && !/order|payment|invoice|cart|pos|sale|product/i.test(request.url())) return;

    let body = '';
    if (status >= 400) {
      body = await response.text().catch(() => '');
      body = body.slice(0, 4000);
    }

    entries.push({
      time: new Date().toISOString(),
      type: status >= 400 ? 'HTTP_ERROR' : 'RECENT_API',
      status,
      method: request.method(),
      url: request.url(),
      body,
      curl: requestToCurl(request),
    });

    if (entries.length > 30) entries.splice(0, entries.length - 30);
  });
}

async function attachBackendCurlDebug(page, testInfo, reason) {
  const entries = page.__backendCurlEntries || [];
  const usefulEntries = entries.slice(-12);

  const content = [
    `Reason: ${reason}`,
    `Sensitive headers: ${LOG_SENSITIVE_CURL ? 'included' : 'redacted (set VNPOST_LOG_SENSITIVE=1 to include)'}`,
    '',
    usefulEntries.length ? '' : 'No backend-like requests were captured before this failure.',
    ...usefulEntries.flatMap((entry, index) => [
      `# ${index + 1}. ${entry.type} ${entry.status || ''} ${entry.method} ${entry.url}`,
      `# time: ${entry.time}`,
      entry.failure ? `# failure: ${entry.failure}` : '',
      entry.body ? `# response body:\n${entry.body}` : '',
      entry.curl,
      '',
    ]),
  ].filter(Boolean).join('\n');

  const debugPath = testInfo.outputPath('be-curl-debug.txt');
  fs.writeFileSync(debugPath, content);
  await testInfo.attach('be-curl-debug.txt', {
    path: debugPath,
    contentType: 'text/plain',
  });
}

async function visibleText(page, limit = 4000) {
  const text = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
  return text.replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function failWithPageContext(page, reason) {
  const text = await visibleText(page, 1600);
  const entries = page.__backendCurlEntries || [];
  const lastImportantApi = [...entries].reverse().find((entry) => (
    entry.type === 'HTTP_ERROR'
    || entry.type === 'REQUEST_FAILED'
    || /order|payment|invoice|cart|pos|sale|product|confirm/i.test(entry.url || '')
  ));
  const apiSummary = lastImportantApi
    ? `${lastImportantApi.type} ${lastImportantApi.status || ''} ${lastImportantApi.method} ${lastImportantApi.url}${lastImportantApi.failure ? ` (${lastImportantApi.failure})` : ''}`
    : 'Không bắt được API lỗi/gần liên quan. Xem be-curl-debug.txt trong report để kiểm tra request gần nhất.';
  throw new Error([
    reason,
    `URL hiện tại: ${page.url()}`,
    `API gần nhất/liên quan: ${apiSummary}`,
    `Text màn hình: ${text}`,
  ].join('\n'));
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

async function clickOrderSummaryButton(page, labelPattern) {
  await page.keyboard.press('Escape').catch(() => {});
  const button = page.locator('button:visible').filter({ hasText: labelPattern }).last();
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded();
  await button.click();
}

async function openBestProductList(page) {
  if (!await page.getByText(POS_PRODUCT_NAME, { exact: false }).first().isVisible().catch(() => false)) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.getByRole('button', { name: /Sản phẩm bán chạy/i }).click();
  }
  await expect(page.getByText(POS_PRODUCT_NAME, { exact: false }).first()).toBeVisible();
}

async function expectProductInCart(page, productName = POS_PRODUCT_NAME) {
  await expect(page.locator('.ant-table-row').filter({ hasText: productName }).first()).toBeVisible();
  await expect(page.getByText('Chưa thêm sản phẩm / dịch vụ nào', { exact: false }).first()).toBeHidden();
}

async function addProductFromVisibleList(page, productName = POS_PRODUCT_NAME) {
  const product = page.getByText(productName, { exact: false }).first();
  await expect(product).toBeVisible();
  await product.click();
  await expectProductInCart(page, productName);
}

async function addProductFromSearch(page, productName = POS_PRODUCT_NAME) {
  const productSearch = page.locator('#product-search');
  await expect(productSearch).toBeVisible();
  await productSearch.fill(productName);
  await page.waitForTimeout(1000);
  await addProductFromVisibleList(page, productName);
  await page.keyboard.press('Escape').catch(() => {});
}

async function setFirstCartPrice(page, price = POS_PRODUCT_PRICE) {
  const firstPriceInput = page.locator('.ant-table-row input:visible').first();
  await expect(firstPriceInput).toBeVisible();
  await firstPriceInput.fill(price);
  await expect(page.getByText('Tổng tiền', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/10,000 đ|10000 đ/i).first()).toBeVisible();
}

async function selectExistingCustomer(page) {
  const customer = page.locator('#customer-selection');
  await expect(customer).toBeVisible();
  await customer.fill(POS_CUSTOMER_QUERY);
  await page.waitForTimeout(1000);
  const option = page.getByText(new RegExp(`${POS_CUSTOMER_NAME}|84876687857|84888888888`)).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.getByText(POS_CUSTOMER_NAME, { exact: false }).first()).toBeVisible();
  await page.keyboard.press('Escape').catch(() => {});
}

async function applyDiscount(page, value = '1') {
  const discount = page.locator('#order-info-discount');
  await expect(discount).toBeVisible();
  await discount.fill(value);
  await expect(discount).toHaveValue(value);
}

async function openPaymentDrawer(page) {
  await clickOrderSummaryButton(page, /^Thanh toán$/);
  if (!await page.getByText('Hình thức thanh toán', { exact: false }).first().isVisible({ timeout: 10_000 }).catch(() => false)) {
    await failWithPageContext(page, 'Không mở được drawer thanh toán sau khi click nút Thanh toán.');
  }
  await expect(page.getByText('Phương thức thanh toán', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Tiền mặt/i })).toBeVisible();
}

async function verifyOrderCanBePaidAndRecorded(page) {
  await openPaymentDrawer(page);
  const payLaterOption = page.locator('.ant-drawer').getByRole('button', { name: /^Thanh toán sau$/i });
  if (!await payLaterOption.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await failWithPageContext(page, 'Không thấy option Thanh toán sau trong drawer thanh toán.');
  }
  await payLaterOption.click();

  const confirmButton = page.getByRole('button', { name: /Xác nhận thanh toán/i });
  if (!await confirmButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await failWithPageContext(page, 'Không thấy nút Xác nhận thanh toán sau khi chọn Thanh toán sau.');
  }
  await confirmButton.click();

  if (!await page.getByText(/Tạo đơn hàng thành công|Chi tiết đơn hàng|Danh sách đơn hàng/i).first().isVisible({ timeout: 15_000 }).catch(() => false)) {
    await failWithPageContext(
      page,
      'Sau khi bấm Xác nhận thanh toán, hệ thống không hiển thị modal Tạo đơn hàng thành công.',
    );
  }

  const successText = await visibleText(page, 6000);
  const orderCode = successText.match(/Chi tiết đơn hàng:\s*([A-Z0-9]+)/i)?.[1];
  if (!orderCode) {
    await failWithPageContext(page, `Đã thấy modal thành công nhưng không lấy được mã đơn hàng. Text thực tế: ${successText}`);
  }

  await openOrderList(page);
  const listText = await visibleText(page, 4000);
  if (!listText.includes(orderCode)) {
    await failWithPageContext(page, `Tạo đơn thành công mã ${orderCode}, nhưng không thấy mã này trong danh sách đơn hàng.`);
  }
  if (!/Nguyễn Bá|10,000 đ|9,900 đ/i.test(listText)) {
    await failWithPageContext(page, `Đơn ${orderCode} có trong danh sách nhưng thiếu khách hàng hoặc số tiền kỳ vọng.`);
  }
}

async function saveDraftOrderAndVerifyInList(page, expectedCustomerPattern = /Khách lẻ|Nguyễn Bá/i) {
  await page.getByRole('button', { name: /Lưu nháp/i }).click();
  if (!await page.getByText('Tạo đơn nháp thành công', { exact: false }).isVisible({ timeout: 15_000 }).catch(() => false)) {
    await failWithPageContext(page, 'Click Lưu nháp nhưng không thấy modal/toast Tạo đơn nháp thành công.');
  }
  const successText = await visibleText(page, 4000);
  const orderCode = successText.match(/Chi tiết đơn nháp:\s*([A-Z0-9]+)/i)?.[1];
  if (!orderCode) {
    await failWithPageContext(page, `Không lấy được mã đơn nháp từ popup thành công. Text thực tế: ${successText}`);
  }

  await openOrderList(page);
  const listText = await visibleText(page, 6000);
  if (!listText.includes(orderCode)) {
    await failWithPageContext(page, `Đã tạo đơn nháp ${orderCode} nhưng không thấy mã đơn trong danh sách đơn hàng.`);
  }
  if (!expectedCustomerPattern.test(listText)) {
    await failWithPageContext(page, `Đã tạo đơn nháp ${orderCode} nhưng danh sách không hiển thị khách hàng đúng kỳ vọng.`);
  }
  if (!/Đơn nháp|10,000 đ/i.test(listText)) {
    await failWithPageContext(page, `Đơn ${orderCode} có trong danh sách nhưng thiếu trạng thái Đơn nháp hoặc tổng tiền 10,000 đ.`);
  }
  return orderCode;
}

async function findFirstAvailableProductName(page) {
  const text = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
  const match = text.match(/([^\n]+)\nGiá:\s*[\d,.]+ đ\nKho:\s*\d+/i);
  return match ? match[1].trim() : null;
}

async function chooseCategoryWithAvailableProduct(page) {
  await openBestProductList(page);
  const categoryInput = page.locator('#product-sub-category');
  await expect(categoryInput).toBeVisible();
  await categoryInput.click();
  await page.waitForTimeout(800);

  const optionTexts = await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option-content, [role="option"]:visible')
    .evaluateAll((options) => options.map((option) => option.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));

  if (!optionTexts.length) {
    await failWithPageContext(page, 'Dropdown Lọc theo danh mục không có option danh mục nào.');
  }

  for (let optionIndex = 0; optionIndex < Math.min(optionTexts.length, 12); optionIndex++) {
    const optionText = optionTexts[optionIndex];
    await categoryInput.click({ force: true });
    await page.waitForTimeout(300);
    const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option-content, [role="option"]:visible').nth(optionIndex);
    if (!await option.isVisible().catch(() => false)) continue;
    await option.click({ force: true });
    await page.waitForTimeout(1000);

    const productName = await findFirstAvailableProductName(page);
    if (productName) {
      return { categoryName: optionText, productName };
    }
  }

  await failWithPageContext(page, `Đã thử ${Math.min(optionTexts.length, 12)} danh mục (${optionTexts.slice(0, 12).join(', ')}) nhưng không danh mục nào có sản phẩm còn tồn để chọn.`);
}

test.describe('VNPost - Bán hàng (POS)', () => {
  test.beforeEach(async ({ page }) => {
    installBackendCurlLogger(page);
    await login(page);
    await selectSalesScope(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    const hasFailureToast = await page.getByText('Thất bại', { exact: false }).first().isVisible().catch(() => false);
    if (testInfo.status !== testInfo.expectedStatus || hasFailureToast) {
      await attachBackendCurlDebug(
        page,
        testInfo,
        hasFailureToast ? 'UI hiển thị toast Thất bại' : `Test status ${testInfo.status}`,
      );
    }
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
    await clickOrderSummaryButton(page, /^Thanh toán$/);
    await expect(page.getByText('Đơn hàng không có sản phẩm, vui lòng thêm sản phẩm', { exact: false }).first()).toBeVisible();
    await page.waitForTimeout(2000);
  });

  test('POS-005 Thanh toán sau khi chưa có sản phẩm', async ({ page }) => {
    await openPos(page);
    await clickOrderSummaryButton(page, /^Thanh toán sau$/);
    await expect(page.getByText('Đơn hàng không có sản phẩm, vui lòng thêm sản phẩm', { exact: false }).first()).toBeVisible();
    await page.waitForTimeout(2000);
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

  test('POS-008 Tạo đơn hàng từ tìm kiếm sau đó chọn khách', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page);
    await setFirstCartPrice(page);
    await selectExistingCustomer(page);
    await expectProductInCart(page);
    await verifyOrderCanBePaidAndRecorded(page);
  });

  test('POS-009 Tạo đơn hàng từ Chọn sản phẩm từ phần tìm kiếm', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page);
    await setFirstCartPrice(page);
    await expectProductInCart(page);
    await saveDraftOrderAndVerifyInList(page);
  });

  test('POS-013 Tạo đơn hàng từ Chọn sản phẩm trong danh sách sản phẩm', async ({ page }) => {
    await openPos(page);
    await openBestProductList(page);
    await addProductFromVisibleList(page);
    await setFirstCartPrice(page);
    await expectProductInCart(page);
    await saveDraftOrderAndVerifyInList(page);
  });

  test('POS-014 Tạo đơn hàng từ Chọn sản phẩm, chọn khách hàng, nhập giảm giá, thanh toán thành công, ghi nhận ở danh sách đơn hàng', async ({ page }) => {
    await openPos(page);
    await openBestProductList(page);
    await addProductFromVisibleList(page);
    await setFirstCartPrice(page);
    await selectExistingCustomer(page);
    await applyDiscount(page);
    await verifyOrderCanBePaidAndRecorded(page);
  });

  test('POS-015 Tạo đơn hàng từ chọn sản phẩm từ Lọc sản phẩm theo danh mục', async ({ page }) => {
    await openPos(page);
    const categoryProduct = await chooseCategoryWithAvailableProduct(page);

    await addProductFromVisibleList(page, categoryProduct.productName);
    await setFirstCartPrice(page);
    await expectProductInCart(page, categoryProduct.productName);
    await selectExistingCustomer(page);
    await verifyOrderCanBePaidAndRecorded(page);
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
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
    await exportButton.click();
    const download = await downloadPromise;
    if (!download) {
      await failWithPageContext(page, 'Click Xuất excel nhưng không có file download trong 15 giây.');
    }
    if (!/\.(xlsx|xls|csv)$/i.test(download.suggestedFilename())) {
      await failWithPageContext(page, `File Xuất excel tải xuống sai định dạng: ${download.suggestedFilename()}`);
    }
  });

  test('POS-012 Xem chi tiết đơn hàng khi có dữ liệu', async ({ page }) => {
    await openOrderList(page);
    const firstRow = page.locator('.ant-table-row').first();
    await expect(firstRow, 'Danh sách đơn hàng phải có ít nhất một dòng để mở chi tiết.').toBeVisible();
    const orderCodeLink = firstRow.locator('a[href*="/order/created-orders/detail/"]').first();
    await expect(orderCodeLink, 'Dòng đơn hàng phải có link mã đơn để đi vào chi tiết.').toBeVisible();
    const orderCode = (await orderCodeLink.innerText()).replace(/\s+/g, ' ').trim();
    await orderCodeLink.click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await expect(page, 'Click mã đơn phải điều hướng vào màn chi tiết đơn hàng.').toHaveURL(/\/order\/created-orders\/detail\//);
    await expect(page.getByText('Thông tin chung', { exact: false }).first()).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => visibleText(page, 8000), {
      message: 'Trang chi tiết phải load đủ thông tin mã đơn sau khi vào detail.',
      timeout: 15_000,
    }).toContain(orderCode);
    const text = await visibleText(page, 8000);
    expect(text).toContain(orderCode);
    expect(text).toMatch(/Thông tin chung|Mã đơn|Lịch sử thanh toán|Danh sách sản phẩm|Tổng tiền/i);
  });
});
