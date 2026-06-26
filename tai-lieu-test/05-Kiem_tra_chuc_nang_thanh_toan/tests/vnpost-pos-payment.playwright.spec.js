const { test, expect } = require('@playwright/test');
const {
  loginAndGoToSales,
  createNewOrder,
  addProduct,
  setProductQty,
  getSummaryValue,
  verifySummaryValue,
  setupApiErrorTracking,
} = require('./helpers/pos-helpers.js');

// ============================================================
// CONFIGURATION & CONSTANTS
// ============================================================
const CUSTOMER_PHONE = '0988774326'; // Nguyễn Bá
const CUSTOMER_NAME = 'Nguyễn Bá';
const PRODUCT_NAME = 'SP_A1';

async function selectCustomer(page, phone = CUSTOMER_PHONE, name = CUSTOMER_NAME) {
  const customerInput = page.locator('#customer-selection').first();
  await customerInput.click();
  await customerInput.fill(phone);
  await page.waitForTimeout(1000);
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: name }).first();
  if (await option.isVisible()) {
    await option.click();
    await page.waitForTimeout(1000);
  }
}

async function clickSdkConfirmButton(page) {
  await page.waitForTimeout(1500);
  const sdkContainer = page.locator('div').filter({ hasText: 'XÁC NHẬN GIAO DỊCH' }).last();
  if (await sdkContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
    const sdkConfirmBtn = sdkContainer.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).first();
    if (await sdkConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sdkConfirmBtn.click();
      await page.waitForTimeout(1000);
    }
  }
}

async function verifyOrderSuccessAndGetCode(page) {
  const modal = page.locator('.ant-modal').filter({ hasText: /thành công/i }).first();
  await expect(modal).toBeVisible({ timeout: 15000 });
  const text = await modal.innerText();
  const orderCode = text.match(/chi tiết đơn hàng:\s*([a-z0-9]+)/i)?.[1] || 
                    text.match(/chi tiết đơn nháp:\s*([a-z0-9]+)/i)?.[1];
  return orderCode;
}

// ============================================================
// MAIN TEST SUITE
// ============================================================
test.describe('Kiểm thử Phương thức thanh toán POS', () => {
  let apiErrors = [];

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    page.setDefaultTimeout(45000);
    apiErrors = [];
    setupApiErrorTracking(page, apiErrors);
    await loginAndGoToSales(page);
    await createNewOrder(page);
  });

  test('POS-016: Kiểm tra thanh toán bằng phương thức Tiền mặt', async ({ page }) => {
    await addProduct(page, PRODUCT_NAME, 5); // 500,000 đ
    
    // Mở drawer thanh toán
    await page.getByRole('button', { name: /^Thanh toán$/i }).first().click();
    await page.waitForTimeout(1000);

    // Chọn phương thức Tiền mặt
    await page.getByRole('button', { name: 'Tiền mặt', exact: true }).first().click();
    await page.waitForTimeout(500);

    // Nhập số tiền khách đưa
    const moneyInput = page.locator('#money-customer-send').first();
    await moneyInput.click({ clickCount: 3 });
    await moneyInput.fill('500000');
    await moneyInput.press('Enter');
    await page.waitForTimeout(800);

    // Click Xác nhận thanh toán
    await page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).first().click();
    await clickSdkConfirmButton(page);
    
    const orderCode = await verifyOrderSuccessAndGetCode(page);
    expect(orderCode).toBeDefined();
  });

  test('POS-017: Kiểm tra thanh toán bằng phương thức Quẹt thẻ', async ({ page }) => {
    await addProduct(page, PRODUCT_NAME, 2); // 200,000 đ
    
    await page.getByRole('button', { name: /^Thanh toán$/i }).first().click();
    await page.waitForTimeout(1000);

    // Chọn phương thức Thẻ/POS
    await page.getByRole('button', { name: 'Thẻ VISA', exact: true }).first().click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).first().click();
    await clickSdkConfirmButton(page);
    
    const orderCode = await verifyOrderSuccessAndGetCode(page);
    expect(orderCode).toBeDefined();
  });

  test('POS-018: Kiểm tra thanh toán bằng phương thức Chuyển khoản', async ({ page }) => {
    await addProduct(page, PRODUCT_NAME, 2);
    
    await page.getByRole('button', { name: /^Thanh toán$/i }).first().click();
    await page.waitForTimeout(1000);

    // Chọn phương thức Chuyển khoản
    await page.getByRole('button', { name: 'Chuyển khoản', exact: true }).first().click();
    await page.waitForTimeout(1000);

    // Chọn thẻ ngân hàng nhận nếu hiển thị danh sách
    const firstBankCard = page.locator('.ant-pro-checkcard').first();
    if (await firstBankCard.isVisible()) {
      await firstBankCard.click();
      await page.waitForTimeout(500);
    }

    await page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).first().click();
    await clickSdkConfirmButton(page);
    
    const orderCode = await verifyOrderSuccessAndGetCode(page);
    expect(orderCode).toBeDefined();
  });

  test('POS-019: Kiểm tra thanh toán bằng mã QR động thành công', async ({ page }) => {
    await addProduct(page, PRODUCT_NAME, 2);
    
    await page.getByRole('button', { name: /^Thanh toán$/i }).first().click();
    await page.waitForTimeout(1000);

    // Chọn phương thức QR
    await page.getByRole('button', { name: 'Quét QR', exact: true }).first().click();
    await page.waitForTimeout(1000);

    // Click Hoàn tất giao dịch để xác nhận bill giả lập
    const completeBtn = page.getByRole('button', { name: 'Hoàn tất giao dịch', exact: true }).first();
    await completeBtn.waitFor({ state: 'visible', timeout: 8000 });
    await completeBtn.click();
    
    const orderCode = await verifyOrderSuccessAndGetCode(page);
    expect(orderCode).toBeDefined();
  });

  test('POS-020: Kiểm tra chức năng Tra soát khi gặp lỗi mạng/Timeout giao dịch QR', async ({ page }) => {
    await addProduct(page, PRODUCT_NAME, 2);
    
    await page.getByRole('button', { name: /^Thanh toán$/i }).first().click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Quét QR', exact: true }).first().click();
    await page.waitForTimeout(1000);

    // Click Kiểm tra giao dịch
    const checkBtn = page.getByRole('button', { name: 'Kiểm tra giao dịch', exact: true }).first();
    await checkBtn.waitFor({ state: 'visible', timeout: 8000 });
    await checkBtn.click();
    
    // Kỳ vọng hiển thị thông báo chưa thành công hoặc trạng thái giao dịch
    await expect(page.locator('.ant-message-custom-content').first()).toBeVisible({ timeout: 10000 });
  });

  test('POS-021: Kiểm tra thanh toán bằng điểm Loyalty và xác thực OTP thành công', async ({ page }) => {
    await selectCustomer(page);
    await addProduct(page, PRODUCT_NAME, 1);
    
    await page.getByRole('button', { name: /^Thanh toán$/i }).first().click();
    await page.waitForTimeout(1000);

    // Chọn phương thức bằng điểm
    await page.getByRole('button', { name: 'Thanh toán bằng điểm', exact: true }).first().click();
    await page.waitForTimeout(1000);

    // Click Xác nhận thanh toán để mở modal OTP
    await page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).first().click();
    
    const otpModal = page.locator('.ant-modal').filter({ hasText: 'Xác thực OTP' }).first();
    await expect(otpModal).toBeVisible({ timeout: 8000 });

    // Nhập OTP thành công (888888)
    const firstInput = otpModal.locator('input').first();
    await firstInput.click();
    await firstInput.fill('888888');
    await page.waitForTimeout(500);

    // Bấm Xác nhận trong modal OTP
    await otpModal.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    
    const orderCode = await verifyOrderSuccessAndGetCode(page);
    expect(orderCode).toBeDefined();
  });

  test('POS-022: Kiểm tra chặn thanh toán bằng điểm khi nhập sai mã OTP', async ({ page }) => {
    await selectCustomer(page);
    await addProduct(page, PRODUCT_NAME, 1);
    
    await page.getByRole('button', { name: /^Thanh toán$/i }).first().click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Thanh toán bằng điểm', exact: true }).first().click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).first().click();
    
    const otpModal = page.locator('.ant-modal').filter({ hasText: 'Xác thực OTP' }).first();
    await expect(otpModal).toBeVisible({ timeout: 8000 });

    // Nhập OTP sai (ví dụ: 999999)
    const firstInput = otpModal.locator('input').first();
    await firstInput.click();
    await firstInput.fill('999999');
    await page.waitForTimeout(500);

    await otpModal.getByRole('button', { name: 'Xác nhận', exact: true }).click();

    // Chặn và hiển thị lỗi trên form OTP
    await expect(otpModal.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 8000 });
  });

  test('POS-023: Kiểm tra thanh toán đa phương thức', async ({ page }) => {
    await selectCustomer(page);
    await addProduct(page, PRODUCT_NAME, 4); // 400,000 đ
    
    await page.getByRole('button', { name: /^Thanh toán$/i }).first().click();
    await page.waitForTimeout(1000);

    // Chọn Đa phương thức
    await page.getByRole('button', { name: 'Đa phương thức', exact: true }).first().click();
    await page.waitForTimeout(1000);

    // Click nút Thanh toán
    await page.getByRole('button', { name: 'Thanh toán', exact: true }).first().click();
    await clickSdkConfirmButton(page);

    const orderCode = await verifyOrderSuccessAndGetCode(page);
    expect(orderCode).toBeDefined();
  });

  test('POS-024: Kiểm tra chặn hình thức "Thanh toán sau" đối với Khách lẻ', async ({ page }) => {
    await addProduct(page, PRODUCT_NAME, 1);
    
    // Click Thanh toán sau ngay trên màn hình POS khi chưa chọn khách
    await page.getByRole('button', { name: /Thanh toán sau/i }).first().click();
    
    // Xuất hiện cảnh báo
    await expect(page.getByText('Thanh toán sau hoặc một phần không thể áp dụng cho khách vãng lai', { exact: false }).first()).toBeVisible({ timeout: 8000 });
  });

  test('POS-025: Kiểm tra chặn "Thanh toán 1 phần" đối với Khách lẻ', async ({ page }) => {
    await addProduct(page, PRODUCT_NAME, 2);
    
    await page.getByRole('button', { name: /^Thanh toán$/i }).first().click();
    await page.waitForTimeout(1000);

    // Chọn Trả góp (Thanh toán một phần)
    const splitSegment = page.locator('.ant-segmented-item').filter({ hasText: 'Trả góp' }).first();
    if (await splitSegment.isVisible()) {
      await splitSegment.click();
      await page.waitForTimeout(500);
    }

    // Nhập số tiền ít hơn tổng bill
    const customizeInput = page.locator('.payment-method-modal input').first();
    if (await customizeInput.isVisible()) {
      await customizeInput.click({ clickCount: 3 });
      await customizeInput.fill('100000');
      await page.waitForTimeout(500);
    }

    await page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).first().click();

    // Xuất hiện cảnh báo
    await expect(page.getByText('Thanh toán sau hoặc một phần không thể áp dụng cho khách vãng lai', { exact: false }).first()).toBeVisible({ timeout: 8000 });
  });

  test('POS-026: Kiểm tra hình thức "Thanh toán sau" đối với khách đã có trên hệ thống', async ({ page }) => {
    await selectCustomer(page);
    await addProduct(page, PRODUCT_NAME, 2);

    await page.getByRole('button', { name: /Thanh toán sau/i }).first().click();

    const orderCode = await verifyOrderSuccessAndGetCode(page);
    expect(orderCode).toBeDefined();
  });

  test('POS-027: Kiểm tra hình thức "Thanh toán 1 phần" đối với khách đã có trên hệ thống', async ({ page }) => {
    await selectCustomer(page);
    await addProduct(page, PRODUCT_NAME, 2);

    await page.getByRole('button', { name: /^Thanh toán$/i }).first().click();
    await page.waitForTimeout(1000);

    // Chọn Trả góp
    const splitSegment = page.locator('.ant-segmented-item').filter({ hasText: 'Trả góp' }).first();
    if (await splitSegment.isVisible()) {
      await splitSegment.click();
      await page.waitForTimeout(500);
    }

    // Nhập số tiền 1 phần
    const customizeInput = page.locator('.payment-method-modal input').first();
    if (await customizeInput.isVisible()) {
      await customizeInput.click({ clickCount: 3 });
      await customizeInput.fill('100000');
      await page.waitForTimeout(500);
    }

    await page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).first().click();
    await clickSdkConfirmButton(page);

    const orderCode = await verifyOrderSuccessAndGetCode(page);
    expect(orderCode).toBeDefined();
  });

  test('POS-028: Kiểm tra chức năng Cập nhật thanh toán trên đơn hàng còn nợ', async ({ page }) => {
    await page.goto('/order/created-orders');
    await page.waitForLoadState('networkidle');

    // Filter Còn nợ
    await page.getByText('Còn nợ', { exact: true }).first().click();
    await page.waitForTimeout(1500);

    // Click vào đơn hàng đầu tiên trong danh sách nợ
    const firstRow = page.locator('.ant-table-row').first();
    await expect(firstRow).toBeVisible();
    
    const detailLink = firstRow.locator('a[href*="/order/created-orders/detail/"]').first();
    await detailLink.click();
    await page.waitForLoadState('networkidle');

    // Click Cập nhật thanh toán
    const updateBtn = page.getByRole('button', { name: 'Cập nhật thanh toán', exact: true }).first();
    await expect(updateBtn).toBeVisible();
    await updateBtn.click();
    await page.waitForTimeout(1000);

    // Xác nhận đóng nợ/thanh toán nợ
    await page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).first().click();
    await clickSdkConfirmButton(page);
    await page.waitForTimeout(2000);

    await expect(page.getByText('Thành công', { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });

  test('POS-029: Kiểm tra ẩn nút "Cập nhật thanh toán" trên đơn hàng đã thu đủ tiền', async ({ page }) => {
    await page.goto('/order/created-orders');
    await page.waitForLoadState('networkidle');

    // Filter Đã thanh toán
    await page.getByText('Đã thanh toán', { exact: true }).first().click();
    await page.waitForTimeout(1500);

    const firstRow = page.locator('.ant-table-row').first();
    await expect(firstRow).toBeVisible();
    
    const detailLink = firstRow.locator('a[href*="/order/created-orders/detail/"]').first();
    await detailLink.click();
    await page.waitForLoadState('networkidle');

    // Nút Cập nhật thanh toán phải bị ẩn
    const updateBtn = page.getByRole('button', { name: 'Cập nhật thanh toán', exact: true }).first();
    await expect(updateBtn).not.toBeVisible();
  });

  test('POS-030: Kiểm tra hủy giao dịch QR động khi đang chờ khách quét mã', async ({ page }) => {
    await addProduct(page, PRODUCT_NAME, 2);
    
    await page.getByRole('button', { name: /^Thanh toán$/i }).first().click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Quét QR', exact: true }).first().click();
    await page.waitForTimeout(1500);

    // Hủy giao dịch QR trong drawer
    const cancelBtn = page.locator('.payment-method-modal button').filter({ hasText: /hủy|huỷ/i }).first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(1000);
    }

    // Drawer quay về tab Tiền mặt
    await expect(page.getByRole('button', { name: 'Tiền mặt', exact: true }).first()).toBeVisible();
  });
});
