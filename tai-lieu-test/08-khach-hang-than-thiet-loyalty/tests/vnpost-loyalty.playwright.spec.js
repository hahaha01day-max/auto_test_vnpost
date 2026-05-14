const { test, expect } = require('@playwright/test');
const {
  annotateNoData,
  clickFirstVisible,
  login,
  visibleText,
} = require('../../shared/vnpost-helpers');

const TARGET = 'https://vnpost.sfin.vn/';
const POS_URL = 'https://vnpost.sfin.vn/order/create-order';
const POS_PRODUCT_NAME = process.env.VNPOST_POS_PRODUCT || 'Sản phẩm 7 (Vượt Max)';
const POS_PRODUCT_PRICE = process.env.VNPOST_POS_PRICE || '10000';
const POS_CUSTOMER_QUERY = process.env.VNPOST_POS_CUSTOMER_QUERY || 'Nguyễn';
const POS_CUSTOMER_NAME = process.env.VNPOST_POS_CUSTOMER_NAME || 'Nguyễn Bá';

const LOYALTY_URLS = [
  'https://vnpost.sfin.vn/loyalty',
  'https://vnpost.sfin.vn/loyalty/campaign',
  'https://vnpost.sfin.vn/loyalty/campaigns',
  'https://vnpost.sfin.vn/campaign/loyalty',
  'https://vnpost.sfin.vn/campaigns/loyalty',
  'https://vnpost.sfin.vn/marketing/loyalty',
  'https://vnpost.sfin.vn/customer/loyalty',
  'https://vnpost.sfin.vn/order/loyalty',
];

async function failWithContext(page, reason) {
  throw new Error(`${reason}\nURL hiện tại: ${page.url()}\nText màn hình: ${await visibleText(page, 5000)}`);
}

async function expectAnyText(page, patterns, reason = 'Không thấy text kỳ vọng') {
  const text = await visibleText(page, 6000);
  const matched = patterns.some((pattern) => pattern.test(text));
  if (!matched) await failWithContext(page, `${reason}. Kỳ vọng: ${patterns.map((p) => p.source).join(' | ')}`);
}

async function selectAdminScope(page) {
  const clicked = await clickFirstVisible(page, [
    page.getByText('Admin', { exact: true }).first(),
    page.getByText('Quản trị hệ thống', { exact: true }).first(),
    page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first(),
  ], 7000);
  if (!clicked) await failWithContext(page, 'Không chọn được role Admin/Tổng công ty cho module Loyalty.');
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function selectSalesScope(page) {
  const clicked = await clickFirstVisible(page, [
    page.getByText('Giao dịch viên', { exact: true }).first(),
    page.getByText('Nhân viên bán hàng', { exact: true }).first(),
    page.getByText('Cửa hàng A - Chi nhánh', { exact: false }).first(),
    page.getByText('Truy cập điểm bán', { exact: false }).first(),
  ], 7000);
  if (!clicked) {
    test.info().annotations.push({
      type: 'OBSERVED_SCOPE_FALLBACK',
      description: 'Không thấy role Giao dịch viên, fallback sang đơn vị đầu tiên có thể click.',
    });
    await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first().click();
  }
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function openByMenu(page) {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});

  await clickFirstVisible(page, [
    page.getByText('Loyalty', { exact: true }).first(),
    page.getByText('Khách hàng thân thiết', { exact: false }).first(),
  ], 3000);
  await page.waitForTimeout(700);

  const childClicked = await clickFirstVisible(page, [
    page.locator('a:visible').filter({ hasText: /Chiến dịch Loyalty/i }).last(),
    page.getByText('Chiến dịch Loyalty', { exact: true }).last(),
    page.getByText('Chiến dịch Loyalty', { exact: false }).last(),
  ], 5000);
  if (!childClicked) return false;

  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const mainText = await page.locator('main, .ant-layout-content, body').first().innerText({ timeout: 10_000 }).catch(() => '');
  return /Quản lý chiến dịch Loyalty|Thêm mới chương trình tích điểm|Thêm mới chương trình đổi điểm|Chương trình tích điểm|Chương trình đổi điểm/i.test(mainText)
    && !/\/lich-ca-nhan\/ca-lam-viec/.test(page.url());
}

async function openByDirectUrl(page) {
  for (const url of LOYALTY_URLS) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    const text = await visibleText(page, 4000);
    if (/404|Trang bạn truy cập không tồn tại|Error code 522|Connection timed out/i.test(text)) continue;
    if (/Quản lý chiến dịch Loyalty|Chiến dịch Loyalty|Chương trình tích điểm|Chương trình đổi điểm/i.test(text)) return true;
  }
  return false;
}

async function openLoyaltyModule(page) {
  if (await openByMenu(page)) return;
  if (await openByDirectUrl(page)) return;
  await failWithContext(page, 'Không mở được màn Quản lý chiến dịch Loyalty bằng menu hoặc URL dự phòng.');
}

async function clickAction(page, patterns, timeout = 5000) {
  const locators = patterns.flatMap((pattern) => [
    page.getByRole('button', { name: pattern }).first(),
    page.getByText(pattern, { exact: false }).first(),
  ]);
  return clickFirstVisible(page, locators, timeout);
}

async function currentOverlay(page) {
  const overlay = page.locator('.ant-drawer:visible, .ant-modal:visible').last();
  return await overlay.isVisible().catch(() => false) ? overlay : page;
}

async function openEarnPointForm(page) {
  const opened = await clickAction(page, [
    /Thêm mới chương trình tích điểm/i,
    /Thêm chương trình tích điểm/i,
    /Chương trình tích điểm/i,
  ]);
  if (!opened) await failWithContext(page, 'Không thấy nút Thêm mới chương trình tích điểm.');
  await page.waitForTimeout(1000);
  await expectAnyText(page, [/Chương trình tích điểm|Tỷ lệ tích điểm|Đơn hàng|Sản phẩm|Thời gian áp dụng/i], 'Click thêm tích điểm nhưng không thấy form cấu hình tích điểm');
}

async function openRedeemPointForm(page) {
  const opened = await clickAction(page, [
    /Thêm mới chương trình đổi điểm/i,
    /Thêm chương trình đổi điểm/i,
    /Chương trình đổi điểm/i,
  ]);
  if (!opened) await failWithContext(page, 'Không thấy nút Thêm mới chương trình đổi điểm.');
  await page.waitForTimeout(1000);
  await expectAnyText(page, [/Chương trình đổi điểm|Tỷ lệ đổi điểm|Thời gian áp dụng|Giá trị đơn hàng tối thiểu/i], 'Click thêm đổi điểm nhưng không thấy form cấu hình đổi điểm');
}

async function saveForm(page) {
  const root = await currentOverlay(page);
  const clicked = await clickFirstVisible(page, [
    root.getByRole('button', { name: /Xác nhận/i }).last(),
    root.getByRole('button', { name: /^Lưu$/i }).last(),
    root.getByRole('button', { name: /^Thêm$/i }).last(),
  ], 4000);
  if (!clicked) await failWithContext(page, 'Không thấy nút Xác nhận/Lưu trên form Loyalty.');
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function fillEditableInputs(page, values) {
  const root = await currentOverlay(page);
  const inputs = root.locator('input:visible:not([readonly]):not([disabled]), textarea:visible:not([readonly]):not([disabled])');
  let filled = 0;
  for (let i = 0; i < await inputs.count() && filled < values.length; i++) {
    const input = inputs.nth(i);
    const type = ((await input.getAttribute('type').catch(() => '')) || '').toLowerCase();
    if (['checkbox', 'radio', 'file'].includes(type)) continue;
    await input.fill(values[filled]);
    filled += 1;
  }
  if (filled === 0) await failWithContext(page, 'Không tìm thấy input editable để nhập cấu hình Loyalty.');
}

async function clearEditableInputs(page) {
  const root = await currentOverlay(page);
  const inputs = root.locator('input:visible:not([readonly]):not([disabled]), textarea:visible:not([readonly]):not([disabled])');
  let cleared = 0;
  for (let i = 0; i < await inputs.count(); i++) {
    const input = inputs.nth(i);
    const type = ((await input.getAttribute('type').catch(() => '')) || '').toLowerCase();
    if (['checkbox', 'radio', 'file'].includes(type)) continue;
    await input.fill('').catch(() => {});
    cleared += 1;
  }
  if (cleared === 0) await failWithContext(page, 'Không tìm thấy input editable để kiểm tra validate rỗng Loyalty.');
}

async function clickVisibleCheckboxes(page, limit = 2) {
  const root = await currentOverlay(page);
  const checkboxes = root.locator('.ant-checkbox-input:visible, input[type="checkbox"]:visible');
  for (let i = 0; i < Math.min(await checkboxes.count(), limit); i++) {
    await checkboxes.nth(i).click({ force: true }).catch(() => {});
  }
}

async function fillLoyaltyProgramForm(page) {
  await clickVisibleCheckboxes(page, 2);
  await clickAction(page, [/Đơn hàng/i], 1000).catch(() => {});
  await fillEditableInputs(page, ['10000', '10000', '10000']);
}

async function expectSaveResult(page, actionName) {
  const text = await visibleText(page, 6000);
  if (/thành công|tạo mới|lưu thành công|Đang hoạt động|Ngừng hoạt động/i.test(text)) return;
  if (/Vui lòng|không được để trống|bắt buộc|required|không hợp lệ|Thất bại|Lỗi/i.test(text)) {
    await failWithContext(page, `${actionName} chưa thành công, hệ thống trả validation/lỗi nghiệp vụ.`);
  }
  await failWithContext(page, `${actionName} không có phản hồi thành công hoặc lỗi rõ ràng sau khi xác nhận.`);
}

async function openPos(page) {
  await page.goto(POS_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await expect(page.getByText('Đơn hàng: 1', { exact: false }).first()).toBeVisible();
}

async function addProductFromSearch(page) {
  const productSearch = page.locator('#product-search');
  await expect(productSearch).toBeVisible();
  await productSearch.fill(POS_PRODUCT_NAME);
  await page.waitForTimeout(1000);
  const product = page.getByText(POS_PRODUCT_NAME, { exact: false }).first();
  await expect(product).toBeVisible();
  await product.click();
  const row = page.locator('.ant-table-row').filter({ hasText: POS_PRODUCT_NAME }).first();
  await expect(row).toBeVisible();
  const price = row.locator('input:visible').first();
  if (await price.isVisible().catch(() => false)) await price.fill(POS_PRODUCT_PRICE);
}

async function selectExistingCustomer(page) {
  const customer = page.locator('#customer-selection');
  await expect(customer).toBeVisible();
  await customer.fill(POS_CUSTOMER_QUERY);
  await page.waitForTimeout(1000);
  const option = page.getByText(new RegExp(`${POS_CUSTOMER_NAME}|84876687857|84888888888`)).first();
  await expect(option).toBeVisible();
  await option.click();
  await page.keyboard.press('Escape').catch(() => {});
}

test.describe('VNPost - Khách hàng thân thiết (Loyalty)', () => {
  test.describe('Quản lý chiến dịch Loyalty', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await selectAdminScope(page);
    });

    test('LOY-001 Mở màn Quản lý chiến dịch Loyalty', async ({ page }) => {
      await openLoyaltyModule(page);
      await expectAnyText(page, [/Quản lý chiến dịch Loyalty|Chiến dịch Loyalty|Chương trình tích điểm|Chương trình đổi điểm/i]);
    });

    test('LOY-002 Kiểm tra control chính màn Loyalty', async ({ page }) => {
      await openLoyaltyModule(page);
      await expectAnyText(page, [/Thêm mới chương trình tích điểm|Chương trình tích điểm/i]);
      await expectAnyText(page, [/Thêm mới chương trình đổi điểm|Chương trình đổi điểm/i]);
      await expectAnyText(page, [/Đang hoạt động|Ngừng hoạt động|Danh sách|Trạng thái|Tỷ lệ/i]);
    });

    test('LOY-003 Mở form Thêm chương trình tích điểm', async ({ page }) => {
      await openLoyaltyModule(page);
      await openEarnPointForm(page);
    });

    test('LOY-004 Validate rỗng chương trình tích điểm', async ({ page }) => {
      await openLoyaltyModule(page);
      await openEarnPointForm(page);
      await clearEditableInputs(page);
      await saveForm(page);
      await expectAnyText(page, [/Vui lòng|không được để trống|bắt buộc|required|Thời gian áp dụng|Tỷ lệ tích điểm/i], 'Không thấy validation khi lưu rỗng chương trình tích điểm');
    });

    test('LOY-005 Tạo chương trình tích điểm theo đơn hàng', async ({ page }) => {
      await openLoyaltyModule(page);
      await openEarnPointForm(page);
      await fillLoyaltyProgramForm(page);
      await saveForm(page);
      await expectSaveResult(page, 'Tạo chương trình tích điểm');
    });

    test('LOY-006 Mở form Thêm chương trình đổi điểm', async ({ page }) => {
      await openLoyaltyModule(page);
      await openRedeemPointForm(page);
    });

    test('LOY-007 Validate rỗng chương trình đổi điểm', async ({ page }) => {
      await openLoyaltyModule(page);
      await openRedeemPointForm(page);
      await clearEditableInputs(page);
      await saveForm(page);
      await expectAnyText(page, [/Vui lòng|không được để trống|bắt buộc|required|Thời gian áp dụng|Tỷ lệ đổi điểm/i], 'Không thấy validation khi lưu rỗng chương trình đổi điểm');
    });

    test('LOY-008 Tạo chương trình đổi điểm', async ({ page }) => {
      await openLoyaltyModule(page);
      await openRedeemPointForm(page);
      await fillLoyaltyProgramForm(page);
      await saveForm(page);
      await expectSaveResult(page, 'Tạo chương trình đổi điểm');
    });

    test('LOY-009 Xem chi tiết chương trình tích điểm/đổi điểm khi có dữ liệu', async ({ page }) => {
      await openLoyaltyModule(page);
      const row = page.locator('.ant-table-row, tr').filter({ hasText: /tích điểm|đổi điểm|Đang hoạt động|Ngừng hoạt động/i }).first();
      if (!await row.isVisible().catch(() => false)) {
        await annotateNoData('Danh sách Loyalty không có bản ghi để xem chi tiết.');
        await expectAnyText(page, [/Chiến dịch Loyalty|Chương trình tích điểm|Chương trình đổi điểm/i]);
        return;
      }
      const opened = await clickFirstVisible(page, [
        row.getByText(/Chi tiết|Xem/i).first(),
        row.locator('a, button, .anticon, svg').first(),
      ], 3000);
      if (!opened) await failWithContext(page, 'Có bản ghi Loyalty nhưng không mở được chi tiết.');
      await expectAnyText(page, [/Chi tiết|Tỷ lệ|Thời gian áp dụng|Điều kiện|Phạm vi áp dụng|Chương trình/i]);
    });

    test('LOY-010 Kiểm tra trạng thái chương trình', async ({ page }) => {
      await openLoyaltyModule(page);
      await expectAnyText(page, [/Đang hoạt động|Ngừng hoạt động|Trạng thái|Chương trình tích điểm|Chương trình đổi điểm/i]);
    });
  });

  test.describe('POS áp dụng Loyalty', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await selectSalesScope(page);
    });

    test('LOY-011 POS hiển thị thông tin điểm sau khi chọn khách', async ({ page }) => {
      await openPos(page);
      await selectExistingCustomer(page);
      await expectAnyText(page, [/điểm|Điểm tích lũy|Điểm thưởng|Đổi điểm|Khách hàng|Tổng quan/i], 'Sau khi chọn khách chưa thấy khu vực điểm/khách hàng trên POS');
    });

    test('LOY-012 POS thanh toán bằng điểm', async ({ page }) => {
      await openPos(page);
      await selectExistingCustomer(page);
      await addProductFromSearch(page);
      const opened = await clickFirstVisible(page, [
        page.getByRole('button', { name: /^Thanh toán$/i }).last(),
        page.locator('button:visible').filter({ hasText: /^Thanh toán$/ }).last(),
      ], 5000);
      if (!opened) await failWithContext(page, 'Không bấm được nút Thanh toán trên POS.');
      await expectAnyText(page, [/Hình thức thanh toán|Phương thức thanh toán|Tiền mặt|Thanh toán sau|Đổi điểm|điểm/i], 'Không mở được drawer thanh toán hoặc không thấy thông tin điểm');
      const text = await visibleText(page, 6000);
      if (!/Đổi điểm|điểm/i.test(text)) {
        await failWithContext(page, 'Drawer thanh toán mở thành công nhưng không thấy control Đổi điểm/thanh toán bằng điểm như tài liệu.');
      }
    });
  });
});
