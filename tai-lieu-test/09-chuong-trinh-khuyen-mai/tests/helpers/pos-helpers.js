/**
 * auto_test_vnpost/tai-lieu-test/09-chuong-trinh-khuyen-mai/tests/helpers/pos-helpers.js
 * Shared helper functions dùng chung cho tất cả test suite POS / Bán hàng
 */

import { expect } from '@playwright/test';

export const CREDENTIALS = { phone: '0988774326', password: '123456' };
export const SHOP_NAME = 'An Giang';

// ============================================================
// API ERROR TRACKING
// ============================================================

/**
 * Gọi trong beforeEach để reset và bắt lỗi API >= 400.
 * Trả về mảng apiErrors để test có thể assert sau.
 */
export function setupApiErrorTracking(page, apiErrors) {
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

export async function loginAndGoToSales(page) {
  // Tester chuyển màn trong SPA nên Redux vẫn giữ cấu hình chuỗi. Bắt config từ
  // đầu luồng đăng nhập và chỉ mở màn bán hàng sau khi dữ liệu đã tải xong.
  const activeChainConfigsPromise = page.waitForResponse(
    response =>
      response.url().includes('/api/v1/internal/configs') &&
      response.request().method() === 'GET' &&
      response.ok(),
    { timeout: 45000 }
  );

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

  const activeChainConfigsResponse = await activeChainConfigsPromise;
  await activeChainConfigsResponse.finished();
  // Chờ RTK Query parse response và dispatch activeCoreChainConfigs vào Redux
  // trước khi OrderCheckoutComponent đọc config để tính số tiền thanh toán.
  await page.waitForTimeout(300);

  const navigatedInApp = await page.evaluate(() => {
    if (typeof window.navigatePages?.ORDER_ADD !== 'function') return false;
    window.navigatePages.ORDER_ADD();
    return true;
  });
  if (!navigatedInApp) {
    throw new Error('Không tìm thấy điều hướng ORDER_ADD của ứng dụng.');
  }
  await page.waitForURL(/\/order\/create-order/);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

export async function createNewOrder(page) {
  await page.locator('.ant-tabs-nav-add').first().click();
  await page.waitForTimeout(800);
}

// ============================================================
// CART OPERATIONS
// ============================================================

export async function addProduct(page, productName, quantity = 1) {
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
}

export async function setProductQty(page, productName, quantity) {
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
// PROMOTION MODAL (dùng cho CTKM theo đơn hàng)
// ============================================================

/**
 * Mở modal CTKM, clear tick ở TẤT CẢ 3 tab, chuyển sang đúng tab,
 * search và tick từng promotion, rồi apply.
 *
 * @param {Page} page
 * @param {string[]} promotionNames - Tên các promotion cần chọn
 * @param {string} tab - Tab cần vào: 'Theo đơn hàng' | 'Theo sản phẩm' | 'Theo danh mục'
 */
export async function applyPromotions(page, promotionNames = [], tab = 'Theo đơn hàng', giftSelections = null) {
  const promoBtn = page.getByRole('button', { name: /Chương trình khuyến mãi/i }).first();
  await promoBtn.click({ force: true });
  await page.waitForTimeout(1000);

  // ── Bước 1: Clear tick ở CẢ 3 TAB ──────────────────────────
  const allTabs = ['Theo đơn hàng', 'Theo sản phẩm', 'Theo danh mục'];
  for (const tabName of allTabs) {
    const tabBtn = page.getByRole('tab', { name: tabName });
    if (await tabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabBtn.click();
      await page.waitForTimeout(500);

      // Thử dùng header checkbox trước
      const headerCb = page.locator('.promotion-program-modal__table-header .ant-checkbox').first();
      if (await headerCb.isVisible({ timeout: 1500 }).catch(() => false)) {
        const isChecked = await headerCb.evaluate(el => el.classList.contains('ant-checkbox-checked'));
        const isIndet   = await headerCb.evaluate(el => el.classList.contains('ant-checkbox-indeterminate'));
        if (isIndet) {
          await headerCb.click(); await page.waitForTimeout(400);
          await headerCb.click(); await page.waitForTimeout(400);
        } else if (isChecked) {
          await headerCb.click(); await page.waitForTimeout(400);
        }
      }

      // Quét thêm và bỏ chọn trực tiếp trên từng dòng nếu còn sót (do bảng custom flexbox không kích hoạt indeterminate)
      const checkedBoxes = page.locator('.ant-tabs-tabpane-active .promotion-program-modal__table-row .ant-checkbox-checked:not(.ant-checkbox-disabled)');
      let checkedCount = await checkedBoxes.count();
      // Giới hạn vòng lặp tối đa 20 lần tránh vô hạn
      let safetyCount = 0;
      while (checkedCount > 0 && safetyCount < 20) {
        await checkedBoxes.first().click();
        await page.waitForTimeout(300);
        checkedCount = await checkedBoxes.count();
        safetyCount++;
      }
    }
  }

  // ── Bước 2: Chuyển sang đúng tab cần dùng ───────────────────
  const targetTab = page.getByRole('tab', { name: tab });
  await targetTab.click();
  await page.waitForTimeout(500);

  // Mỗi tab có placeholder khác nhau — phải dùng đúng để tránh
  // resolve nhầm sang ô search của tab đang ẩn trong DOM
  const TAB_PLACEHOLDERS = {
    'Theo đơn hàng' : /tìm kiếm theo tên chiến dịch/i,
    'Theo sản phẩm' : /tìm kiếm theo tên sản phẩm/i,
    'Theo danh mục' : /tìm kiếm theo tên danh mục|tìm kiếm/i,
  };
  const searchPlaceholder = TAB_PLACEHOLDERS[tab] ?? /tìm kiếm/i;

  // ── Bước 3: Search + tick từng promotion ────────────────────
  for (const promoName of promotionNames) {
    const searchBox = page.locator('.ant-tabs-tabpane-active').getByPlaceholder(searchPlaceholder).first();
    await searchBox.click({ clickCount: 3, force: true });
    await searchBox.fill(promoName);
    await page.waitForTimeout(700);

    // Tìm dòng có tên chương trình khớp chính xác (dòng đầu tiên của text)
    const rows = page.locator('.promotion-program-modal__table-row');
    const count = await rows.count();
    let targetRow = null;
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const text = await row.innerText();
      const firstLine = text.split('\n')[0].trim();
      if (firstLine === promoName) {
        targetRow = row;
        break;
      }
    }

    if (!targetRow) {
      // Fallback nếu không tìm thấy exact match thì dùng filter
      targetRow = rows.filter({ hasText: promoName }).first();
    }

    const checkbox = targetRow.locator('input[type="checkbox"]').first();
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      if (await checkbox.isDisabled()) {
        throw new Error(`Promotion "${promoName}" is disabled and cannot be checked.`);
      }
      await checkbox.check();
    }
    await page.waitForTimeout(400);

    // Xử lý chọn quà tặng từ danh mục nếu có cấu hình
    if (giftSelections) {
      const matchingKey = Object.keys(giftSelections).find(key => 
        promoName.includes(key) || key.includes(promoName)
      );
      if (matchingKey) {
        const { giftName, quantity, isCombo, giftCategory } = giftSelections[matchingKey];
        
        // Chờ xem sub-modal có tự động hiển thị khi check checkbox không
        const subModal = page.locator('.ant-modal').filter({ hasText: 'Chọn sản phẩm khuyến mại' }).first();
        let isOpen = await subModal.isVisible({ timeout: 1500 }).catch(() => false);
        
        if (!isOpen) {
          // Nếu không tự mở, thử click vào link "Chọn sản phẩm trong danh mục"
          const selectLink = targetRow.getByText('Chọn sản phẩm trong danh mục').first();
          if (await selectLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            await selectLink.click({ force: true });
            isOpen = await subModal.isVisible({ timeout: 3000 }).catch(() => false);
          }
        }

        if (isOpen) {
          if (isCombo || giftName.toLowerCase().includes('combo')) {
            const typeSelect = subModal.locator('.ant-select').first();
            await typeSelect.click();
            await page.waitForTimeout(500);
            await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Danh mục combo' }).first().click();
            await page.waitForTimeout(1000);
          }

          if (giftCategory) {
            const catTree = subModal.locator('.ant-select').nth(1);
            await catTree.click();
            await page.waitForTimeout(500);
            await page.keyboard.type(giftCategory);
            await page.waitForTimeout(1000);
            const cbNode = page.locator('.ant-select-tree-treenode').filter({ hasText: giftCategory }).first();
            const checkbox = cbNode.locator('.ant-select-tree-checkbox').first();
            const isChecked = await checkbox.evaluate(el => el.classList.contains('ant-select-tree-checkbox-checked'));
            if (!isChecked) {
              await checkbox.click();
              await page.waitForTimeout(500);
            }
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1500);
          }

          const giftRow = subModal.locator('table tbody tr').filter({ hasText: giftName }).first();
          const qtyInput = giftRow.locator('input').first();
          await qtyInput.click({ clickCount: 3 });
          await qtyInput.fill(String(quantity));
          await qtyInput.press('Enter');
          await page.waitForTimeout(500);

          const applySubBtn = subModal.locator('button').filter({ hasText: 'Áp dụng' }).first();
          await applySubBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }


    // Clear search để tìm promotion tiếp theo
    await searchBox.click({ clickCount: 3, force: true });
    await searchBox.fill('');
    await page.waitForTimeout(500);
  }

  // ── Bước 4: Apply ───────────────────────────────────────────
  const applyBtn = page
    .locator('.promotion-program-modal__header .promotion-program-modal__actions button')
    .filter({ hasText: 'Áp dụng' })
    .first();
  await applyBtn.click();
  await page.waitForTimeout(1000);
}

// ============================================================
// VALUE READERS
// ============================================================

export function parseCurrency(valStr) {
  if (!valStr) return 0;
  return Number(valStr.replace(/[^\d]/g, '') || 0);
}

export async function getSummaryValue(page, label) {
  // Thử tìm trong table cuối cùng (thường là table tổng tiền bên phải)
  const lastTableRows = page.locator('table').last().locator('tr').filter({ hasText: label });
  if (await lastTableRows.count() > 0) {
    const text = await lastTableRows.first().textContent();
    const val = parseCurrency(text);
    if (val > 0) return val;
  }

  // Thử tìm theo cách cũ (ant-descriptions)
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

export async function verifySummaryValue(page, label, expectedNum) {
  const actualNum = await getSummaryValue(page, label);
  expect(Math.abs(actualNum - expectedNum)).toBeLessThanOrEqual(5);
}

export async function getProductUnitPrice(page, productName) {
  const allRows = page.locator('table tbody tr').filter({ hasText: productName });
  const count = await allRows.count();
  for (let i = 0; i < count; i++) {
    const row = allRows.nth(i);
    const rowText = await row.textContent();
    const isGift = rowText.includes('Quà tặng') || rowText.includes('Gift') || rowText.includes('Free');
    if (!isGift) {
      // Cột Giá bán là td thứ 3 (index 2): # | Tên | Giá bán | Số lượng | ...
      const priceCell = row.locator('td').nth(2);
      const input = priceCell.locator('input').first();
      if (await input.count() > 0) {
        return parseCurrency(await input.inputValue());
      }
      const cellText  = await priceCell.textContent();

      // Khi không có promotion: cell = "200000" -> spinbutton input
      // Khi có promotion:        cell = "198,000 đ 200,000 đ" (giảm + gốc gạch chân)
      // -> lấy số đầu tiên (≥ 4 chữ số) là giá đã giảm
      const nums = cellText.replace(/[.,]/g, '').match(/\d{4,}/g);
      if (nums && nums.length > 0) return Number(nums[0]);
    }
  }
  return 0;
}

export async function getProductOriginalPrice(page, productName) {
  const allRows = page.locator('table tbody tr').filter({ hasText: productName });
  const count = await allRows.count();
  for (let i = 0; i < count; i++) {
    const row = allRows.nth(i);
    const rowText = await row.textContent();
    const isGift = rowText.includes('Quà tặng') || rowText.includes('Gift') || rowText.includes('Free');
    if (!isGift) {
      const priceCell = row.locator('td').nth(2);
      const input = priceCell.locator('input').first();
      if (await input.count() > 0) {
        return parseCurrency(await input.inputValue());
      }
      const cellText  = await priceCell.textContent();
      const nums = cellText.replace(/[.,]/g, '').match(/\d{4,}/g);
      if (nums && nums.length > 0) {
        return nums.length > 1 ? Number(nums[1]) : Number(nums[0]);
      }
    }
  }
  return 0;
}

export async function getProductRowDiscount(page, productName) {
  const allRows = page.locator('table tbody tr').filter({ hasText: productName });
  const count = await allRows.count();
  for (let i = 0; i < count; i++) {
    const row = allRows.nth(i);
    const rowText = await row.textContent();
    const isGift = rowText.includes('Quà tặng') || rowText.includes('Gift') || rowText.includes('Free');
    if (!isGift) {
      const priceCell = row.locator('td').nth(2);
      const input = priceCell.locator('input').first();
      let originalPrice = 0;
      if (await input.count() > 0) {
        originalPrice = parseCurrency(await input.inputValue());
      } else {
        const cellText  = await priceCell.textContent();
        const nums = cellText.replace(/[.,]/g, '').match(/\d{4,}/g);
        if (nums && nums.length > 0) {
          originalPrice = nums.length > 1 ? Number(nums[1]) : Number(nums[0]);
        }
      }

      const qtyInput = row.locator('input:not([readonly])').first();
      const qty = Number(await qtyInput.inputValue());

      const totalCell = row.locator('td').nth(5);
      const rowTotal = parseCurrency(await totalCell.textContent());

      return originalPrice * qty - rowTotal;
    }
  }
  return 0;
}

export async function getProductRowTotal(page, productName) {
  const allRows = page.locator('table tbody tr').filter({ hasText: productName });
  const count = await allRows.count();
  for (let i = 0; i < count; i++) {
    const row = allRows.nth(i);
    const rowText = await row.textContent();
    const isGift = rowText.includes('Quà tặng') || rowText.includes('Gift') || rowText.includes('Free');
    if (!isGift) {
      // Cột Tổng tiền là td thứ 6 (index 5): # | Tên | Giá bán | Số lượng | Đơn vị | Tổng tiền | Xóa
      const totalCell = row.locator('td').nth(5);
      return parseCurrency(await totalCell.textContent());
    }
  }
  return 0;
}

export async function verifyGiftInCart(page, giftProductName) {
  const giftRow = page.locator('table tbody tr')
    .filter({ hasText: giftProductName })
    .filter({ hasText: 'Quà tặng' })
    .first();
  await expect(giftRow).toBeVisible({ timeout: 5000 });
}

// ============================================================
// CHECKOUT
// ============================================================

export async function checkoutAndPay(page, apiErrors) {
  const context = page.context();
  const popupPromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);

  await page.getByRole('button', { name: 'Thanh toán', exact: true }).first().click();
  await page.waitForTimeout(1500);

  if (apiErrors && apiErrors.length > 0) {
    throw new Error(`API trả lỗi trước khi thanh toán:\n${apiErrors.join('\n')}`);
  }

  const popup = await popupPromise;
  if (popup) {
    await popup.waitForLoadState('domcontentloaded');
    await popup.waitForTimeout(1000);
    const confirmBtn = popup.getByRole('button', { name: /xác nhận thanh toán/i }).first();
    await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
    await confirmBtn.click();
    await popup.waitForTimeout(2000);
  } else {
    const confirmBtn = page.getByRole('button', { name: /xác nhận thanh toán/i }).first();
    await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
    await confirmBtn.click();
    await page.waitForTimeout(2000);
  }

  if (apiErrors && apiErrors.length > 0) {
    throw new Error(`API trả lỗi trong quá trình thanh toán:\n${apiErrors.join('\n')}`);
  }
}

export async function addComboProduct(page, categoryName, productName, quantity = 1) {
  // Click "Sản phẩm bán chạy" button to show products panel if it's hidden
  const topProductBtn = page.getByRole('button', { name: /Sản phẩm bán chạy/i }).first();
  if (await topProductBtn.isVisible().catch(() => false)) {
    await topProductBtn.click();
    await page.waitForTimeout(600);
  }

  // Click "Sản phẩm gộp" segmented item
  const comboSegment = page.locator('#product-filter-types .ant-segmented-item').filter({ hasText: 'Sản phẩm gộp' }).first();
  await comboSegment.waitFor({ state: 'visible', timeout: 5000 });
  await comboSegment.click();
  await page.waitForTimeout(500);

  // Click category tree select wrapper
  const catTreeSelect = page.locator('#product-sub-category').first();
  await catTreeSelect.click();
  await page.waitForTimeout(500);

  // Clear any existing selected category first if there's a clear button
  const clearBtn = page.locator('#product-sub-category .ant-select-clear').first();
  if (await clearBtn.isVisible().catch(() => false)) {
    await clearBtn.click();
    await page.waitForTimeout(300);
    // Re-click to open dropdown
    await catTreeSelect.click();
    await page.waitForTimeout(500);
  }

  // Type categoryName
  await page.keyboard.type(categoryName);
  await page.waitForTimeout(800);

  // Click checkbox
  const node = page.locator('.ant-select-tree-treenode').filter({ hasText: categoryName }).first();
  await node.locator('.ant-select-tree-checkbox').click();
  await page.waitForTimeout(500);

  // Close dropdown
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);

  // Click product card to add it to the cart
  const card = page.locator('.order-card-content').filter({ hasText: productName }).first();
  await card.waitFor({ state: 'visible', timeout: 5000 });
  await card.click();
  await page.waitForTimeout(800);

  // If quantity > 1, update it
  if (quantity > 1) {
    await setProductQty(page, productName, quantity);
  }
}
