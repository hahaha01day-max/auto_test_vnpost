/**
 * auto_test_vnpost/tai-lieu-test/05-Kiem_tra_chuc_nang_thanh_toan/tests/helpers/pos-helpers.js
 * CommonJS version of shared helper functions
 */

const { expect } = require('@playwright/test');

const CREDENTIALS = { phone: '0988774326', password: '123456' };
const SHOP_NAME = 'An Giang';

// ============================================================
// API ERROR TRACKING
// ============================================================

function setupApiErrorTracking(page, apiErrors) {
  page.on('response', async (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && url.includes('vnpost-api.sfin.vn')) {
      const request = response.request();
      const method = request.method();
      const headers = request.headers();
      const postData = request.postData() || '';

      let curl = `curl -X ${method} "${url}"`;
      for (const [key, val] of Object.entries(headers)) {
        if (key.startsWith(':')) continue;
        curl += ` \\\n  -H "${key}: ${val.replace(/"/g, '\\"')}"`;
      }
      if (postData) {
        curl += ` \\\n  --data-raw '${postData.replace(/'/g, "'\\''")}'`;
      }
      const msg = `[${status}] ${method} ${url}`;
      apiErrors.push(msg);
      console.log(`\n=== FAILED API REQUEST cURL (Status ${status}) ===\n${curl}\n==================================================\n`);
    }
  });
}

// ============================================================
// NAVIGATION
// ============================================================

async function loginAndGoToSales(page) {
  await page.goto('/account');
  await page.waitForLoadState('networkidle');

  const phoneInput = page
    .getByPlaceholder(/số điện thoại|tên đăng nhập|phone/i)
    .or(page.locator('input[type="tel"]'))
    .or(page.locator('input').first())
    .first();
  await phoneInput.click();
  await phoneInput.fill(CREDENTIALS.phone);

  const passInput = page
    .getByPlaceholder(/mật khẩu|password/i)
    .or(page.locator('input[type="password"]'))
    .first();
  await passInput.fill(CREDENTIALS.password);

  await page.getByRole('button', { name: /tiếp tục|đăng nhập/i }).first().click();
  await page.waitForTimeout(4000);

  try {
    const shopItem = page.getByText(SHOP_NAME, { exact: false }).first();
    const isVisible = await shopItem.isVisible({ timeout: 4000 });
    if (isVisible) {
      await shopItem.click();
      await page.waitForTimeout(1000);
      const confirmShopBtn = page.getByRole('button', { name: /tiếp tục|đồng ý|xác nhận/i }).first();
      if (await confirmShopBtn.isVisible()) await confirmShopBtn.click();
    }
  } catch (_) {}

  await page.goto('/order/create-order');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

async function createNewOrder(page) {
  await page.locator('.ant-tabs-nav-add').first().click();
  await page.waitForTimeout(800);
}

// ============================================================
// CART OPERATIONS
// ============================================================

async function clearAllPromotions(page) {
  const promoBtn = page.getByRole('button', { name: /Chương trình khuyến mãi/i }).first();
  if (await promoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await promoBtn.click();
    await page.waitForTimeout(1000);

    const allTabs = ['Theo đơn hàng', 'Theo sản phẩm', 'Theo danh mục'];
    for (const tabName of allTabs) {
      const tabBtn = page.getByRole('tab', { name: tabName });
      if (await tabBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(500);

        // Header checkbox
        const headerCb = page.locator('.promotion-program-modal__table-header .ant-checkbox, .ant-table-header .ant-checkbox').first();
        if (await headerCb.isVisible({ timeout: 1000 }).catch(() => false)) {
          const isChecked = await headerCb.evaluate(el => el.classList.contains('ant-checkbox-checked'));
          const isIndet   = await headerCb.evaluate(el => el.classList.contains('ant-checkbox-indeterminate'));
          if (isIndet) {
            await headerCb.click(); await page.waitForTimeout(400);
            await headerCb.click(); await page.waitForTimeout(400);
          } else if (isChecked) {
            await headerCb.click(); await page.waitForTimeout(400);
          }
        }

        // Row checkboxes
        const checkedBoxes = page.locator('.ant-tabs-tabpane-active .ant-checkbox-checked:not(.ant-checkbox-disabled)');
        let checkedCount = await checkedBoxes.count();
        let safetyCount = 0;
        while (checkedCount > 0 && safetyCount < 20) {
          await checkedBoxes.first().click();
          await page.waitForTimeout(300);
          checkedCount = await checkedBoxes.count();
          safetyCount++;
        }
      }
    }

    const applyBtn = page.getByRole('button', { name: /Áp dụng/i }).first();
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
      await page.waitForTimeout(1000);
    }
  }
}

async function addProduct(page, productName, quantity = 1) {
  const searchInput = page.getByPlaceholder(/tìm kiếm sản phẩm/i).first();
  await searchInput.click();
  await page.waitForTimeout(200);
  await searchInput.fill(productName);
  await page.waitForTimeout(700);

  const dropdownItem = page
    .locator('.rc-virtual-list-holder-inner .ant-select-item, .ant-select-dropdown .ant-select-item-option')
    .filter({ hasText: productName })
    .first();
  await dropdownItem.waitFor({ state: 'visible', timeout: 5000 });
  await dropdownItem.click();
  await page.waitForTimeout(600);

  if (quantity > 1) {
    await setProductQty(page, productName, quantity);
  }

  // Bỏ chọn tất cả chương trình khuyến mãi tự động kích hoạt
  await clearAllPromotions(page);
}

async function setProductQty(page, productName, quantity) {
  const allRows = page.locator('table tbody tr').filter({ hasText: productName });
  const count = await allRows.count();

  let targetRow = allRows.first();
  for (let i = 0; i < count; i++) {
    const row = allRows.nth(i);
    const rowText = await row.textContent();
    const isGift = rowText.includes('Quà tặng') || rowText.includes('Gift') || rowText.includes('Free');
    if (!isGift) { targetRow = row; break; }
  }

  const qtyInput = targetRow.locator('input:not([readonly])').first();
  await qtyInput.click({ clickCount: 3 });
  await qtyInput.fill(String(quantity));
  await qtyInput.press('Enter');
  await page.waitForTimeout(800);
}

// ============================================================
// VALUE READERS
// ============================================================

function parseCurrency(valStr) {
  if (!valStr) return 0;
  return Number(valStr.replace(/[^\d]/g, '') || 0);
}

async function getSummaryValue(page, label) {
  const lastTableRows = page.locator('table').last().locator('tr').filter({ hasText: label });
  if (await lastTableRows.count() > 0) {
    const text = await lastTableRows.first().textContent();
    const val = parseCurrency(text);
    if (val > 0) return val;
  }

  const itemLocator = page.locator('.ant-descriptions-row .ant-descriptions-item').filter({
    has: page.locator('.ant-descriptions-item-label', { hasText: label })
  }).first();
  
  const contentLocator = itemLocator.locator('.ant-descriptions-item-content');
  if (await contentLocator.count() > 0 && await contentLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
    const text = await contentLocator.textContent();
    return parseCurrency(text);
  }
  
  return 0;
}

async function verifySummaryValue(page, label, expectedNum) {
  const actualNum = await getSummaryValue(page, label);
  expect(Math.abs(actualNum - expectedNum)).toBeLessThanOrEqual(5);
}

module.exports = {
  CREDENTIALS,
  SHOP_NAME,
  setupApiErrorTracking,
  loginAndGoToSales,
  createNewOrder,
  addProduct,
  setProductQty,
  parseCurrency,
  getSummaryValue,
  verifySummaryValue,
};
