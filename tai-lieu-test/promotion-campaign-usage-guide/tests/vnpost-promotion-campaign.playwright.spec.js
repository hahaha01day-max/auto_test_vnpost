const { test, expect } = require('@playwright/test');
const {
  clickFirstVisible,
  login,
  visibleText,
} = require('../../shared/vnpost-helpers');

const POS_URL = 'https://vnpost.sfin.vn/order/create-order';
const POS_PRODUCT_NAME = process.env.VNPOST_PROMO_PRODUCT || process.env.VNPOST_POS_PRODUCT || 'Sản phẩm 13 (Sắp hết - 30 ngày)';
const POS_PRODUCT_PRICE = process.env.VNPOST_PROMO_PRICE || process.env.VNPOST_POS_PRICE || '300000';
const POS_CUSTOMER_QUERY = process.env.VNPOST_PROMO_CUSTOMER_QUERY || process.env.VNPOST_POS_CUSTOMER_QUERY || 'Khách hàng Test 9433';
const POS_CUSTOMER_NAME = process.env.VNPOST_PROMO_CUSTOMER_NAME || process.env.VNPOST_POS_CUSTOMER_NAME || 'Khách hàng Test 9433';
const ORDER_CAMPAIGN_NAME = /Chiến dịch giảm giá đơn hàng updated/i;
const PRODUCT_PROMO_PRODUCT_NAME = process.env.VNPOST_PRODUCT_PROMO_PRODUCT || 'Sản phẩm 1 (Dưới Min)';
const PRODUCT_PROMO_PRICE = process.env.VNPOST_PRODUCT_PROMO_PRICE || '20000';
const PRODUCT_PROMO_QTY = process.env.VNPOST_PRODUCT_PROMO_QTY || '2';
const PRODUCT_CAMPAIGN_NAME = /Mua 2 giảm 10k mỗi sản phẩm/i;

async function failWithContext(page, reason) {
  throw new Error(`${reason}\nURL hiện tại: ${page.url()}\nText màn hình: ${await visibleText(page, 6000)}`);
}

async function expectAnyText(page, patterns, reason = 'Không thấy text kỳ vọng') {
  const text = await visibleText(page, 6000);
  if (!patterns.some((pattern) => pattern.test(text))) {
    await failWithContext(page, `${reason}. Kỳ vọng: ${patterns.map((p) => p.source).join(' | ')}`);
  }
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
      description: 'Không thấy role Giao dịch viên/Nhân viên bán hàng, fallback sang đơn vị đầu tiên có thể click.',
    });
    await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first().click();
  }

  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function openPos(page) {
  await page.goto(POS_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await expect(page.getByText('Đơn hàng: 1', { exact: false }).first()).toBeVisible();
  await expect(page.locator('#product-search')).toBeVisible();
  await expect(page.getByText(/Chương trình khuyến mãi/i).first()).toBeVisible();
}

async function addProductFromSearch(page, productName = POS_PRODUCT_NAME, options = {}) {
  const priceValue = options.price ?? POS_PRODUCT_PRICE;
  const quantityValue = options.quantity;
  const productSearch = page.locator('#product-search');
  await expect(productSearch).toBeVisible();
  await productSearch.fill(productName);
  await page.waitForTimeout(1000);
  const product = page.getByText(productName, { exact: false }).filter({ visible: true }).first();
  await expect(product).toBeVisible();
  await product.click();
  const row = page.locator('.ant-table-row').filter({ hasText: productName }).first();
  await expect(row).toBeVisible();
  const inputs = row.locator('input:visible');
  const price = inputs.first();
  if (await price.isVisible().catch(() => false)) await price.fill(priceValue);
  if (quantityValue !== undefined && await inputs.nth(1).isVisible().catch(() => false)) {
    await inputs.nth(1).fill(String(quantityValue));
  }
  await page.keyboard.press('Escape').catch(() => {});
}

async function selectExistingCustomer(page) {
  const customer = page.locator('#customer-selection');
  await expect(customer).toBeVisible();
  await customer.fill(POS_CUSTOMER_QUERY);
  await page.waitForTimeout(1000);
  const option = page.getByText(new RegExp(`${POS_CUSTOMER_NAME}|9433`, 'i')).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.getByText(POS_CUSTOMER_NAME, { exact: false }).first()).toBeVisible();
  await page.keyboard.press('Escape').catch(() => {});
}

async function promotionModal(page) {
  return page.locator('.promotion-program-modal:visible, .ant-modal:visible, .ant-drawer:visible')
    .filter({ hasText: /Chương trình khuyến mãi/i })
    .last();
}

async function openPromotionModal(page, { allowToastOnly = false } = {}) {
  await page.keyboard.press('Escape').catch(() => {});
  const opened = await clickFirstVisible(page, [
    page.getByText(/Chương trình khuyến mãi\s*\(\d+\)/i).first(),
    page.getByText(/Chương trình khuyến mãi/i).first(),
  ], 5000);
  if (!opened) await failWithContext(page, 'Không thấy nút/link Chương trình khuyến mãi ở tổng quan đơn hàng.');

  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const modal = await promotionModal(page);
  if (await modal.isVisible().catch(() => false)) return modal;

  const text = await visibleText(page, 4000);
  if (allowToastOnly && /không có sản phẩm|chưa có sản phẩm|không đủ điều kiện|vui lòng thêm sản phẩm/i.test(text)) {
    test.info().annotations.push({
      type: 'OBSERVED_PROMO_TOAST',
      description: 'Không mở modal CTKM khi đơn chưa có sản phẩm; hệ thống trả thông báo điều kiện.',
    });
    return null;
  }

  await failWithContext(page, 'Click Chương trình khuyến mãi nhưng không thấy modal CTKM hoặc thông báo điều kiện rõ ràng.');
}

async function clickPromotionTab(page, namePattern) {
  const modal = await promotionModal(page);
  await expect(modal).toBeVisible();
  const clicked = await clickFirstVisible(page, [
    modal.getByRole('tab', { name: namePattern }).first(),
    modal.getByText(namePattern, { exact: false }).first(),
  ], 3000);
  if (!clicked) await failWithContext(page, `Không bấm được tab CTKM: ${namePattern}`);
  await page.waitForTimeout(700);
  return modal;
}

async function activePromotionModalText(page) {
  const modal = await promotionModal(page);
  await expect(modal).toBeVisible();
  return (await modal.innerText({ timeout: 10_000 })).replace(/\s+/g, ' ').trim();
}

async function campaignRows(page) {
  const modal = await promotionModal(page);
  return modal.locator('.promotion-program-modal__table-row, .ant-table-tbody .ant-table-row, tbody tr')
    .filter({ hasText: /Giảm giá|Tặng|Hóa đơn|Mua|khuyến mãi|Chiến dịch/i });
}

async function campaignRowCheckbox(row) {
  return row.locator('.ant-checkbox-input:visible, input[type="checkbox"]:visible').first();
}

async function applySelectedPromotion(page) {
  const modal = await promotionModal(page);
  const clicked = await clickFirstVisible(page, [
    modal.getByRole('button', { name: /Áp dụng/i }).last(),
    modal.getByText(/Áp dụng/i).last(),
  ], 4000);
  if (!clicked) await failWithContext(page, 'Đã tick CTKM nhưng không thấy nút Áp dụng.');
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function selectFirstEligibleCampaign(page, tabPattern, reason) {
  await clickPromotionTab(page, tabPattern);
  const rows = await campaignRows(page);
  const rowCount = await rows.count();
  if (rowCount === 0) {
    await failWithContext(page, `${reason}: không có dòng CTKM trong tab ${tabPattern}.`);
  }

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const checkbox = await campaignRowCheckbox(row);
    if (!await checkbox.isVisible().catch(() => false)) continue;
    if (await checkbox.isEnabled().catch(() => false)) {
      await checkbox.click({ force: true });
      return row;
    }
  }

  await failWithContext(page, `${reason}: có CTKM nhưng checkbox dòng chương trình đang disabled, nghĩa là điều kiện áp dụng chưa thỏa.`);
}

async function selectNamedCampaign(page, campaignPattern, reason) {
  const modal = await promotionModal(page);
  const row = modal.locator('.promotion-program-modal__table-row, .ant-table-tbody .ant-table-row, tbody tr')
    .filter({ hasText: campaignPattern })
    .first();
  if (!await row.isVisible().catch(() => false)) {
    await failWithContext(page, `${reason}: không thấy dòng CTKM ${campaignPattern} trong modal.`);
  }
  const rowText = (await row.innerText()).replace(/\s+/g, ' ').trim();
  if (!/Hóa đơn từ 300\.?000|300,000|300\.000|Mua 1 Sản phẩm 13|VIP - Tổng mua 10tr v2026/i.test(rowText)) {
    await failWithContext(page, `${reason}: dòng CTKM không hiển thị đủ điều kiện hóa đơn/sản phẩm/nhóm khách. Row=${rowText}`);
  }

  const checkbox = await campaignRowCheckbox(row);
  if (!await checkbox.isVisible().catch(() => false)) {
    await failWithContext(page, `${reason}: dòng CTKM không có checkbox để chọn.`);
  }
  if (!await checkbox.isEnabled().catch(() => false)) {
    await failWithContext(page, `${reason}: checkbox dòng CTKM đang disabled dù đã thêm ${POS_PRODUCT_NAME}, giá ${POS_PRODUCT_PRICE} và chọn khách ${POS_CUSTOMER_NAME}. Khả năng khách không thuộc nhóm VIP hoặc hệ thống đánh giá điều kiện chưa thỏa.`);
  }
  await checkbox.click({ force: true });
  return row;
}

async function selectNamedProductCampaign(page, campaignPattern, reason) {
  const modal = await promotionModal(page);
  const row = modal.locator('.promotion-program-modal__table-row, .ant-table-tbody .ant-table-row, tbody tr')
    .filter({ hasText: campaignPattern })
    .first();
  if (!await row.isVisible().catch(() => false)) {
    await failWithContext(page, `${reason}: không thấy dòng CTKM theo sản phẩm ${campaignPattern} trong modal.`);
  }

  const rowText = (await row.innerText()).replace(/\s+/g, ' ').trim();
  if (!/Giảm giá 10\.000đ sản phẩm Sản phẩm 1|Tất cả khách hàng/i.test(rowText)) {
    await failWithContext(page, `${reason}: dòng CTKM theo sản phẩm không đúng cấu hình kỳ vọng. Row=${rowText}`);
  }

  const checkbox = await campaignRowCheckbox(row);
  if (!await checkbox.isVisible().catch(() => false)) {
    await failWithContext(page, `${reason}: dòng CTKM theo sản phẩm không có checkbox để chọn.`);
  }
  if (!await checkbox.isEnabled().catch(() => false)) {
    await failWithContext(page, `${reason}: checkbox dòng CTKM theo sản phẩm đang disabled dù đã thêm ${PRODUCT_PROMO_PRODUCT_NAME}, số lượng ${PRODUCT_PROMO_QTY}.`);
  }
  await checkbox.click({ force: true });
  return row;
}

async function applyAndExpectPromotionEffect(page, reason) {
  await applySelectedPromotion(page);
  await expectPromotionEffectOrReason(page, reason);
}

async function expectPromotionEffectOrReason(page, effectReason) {
  const text = await visibleText(page, 6000);
  if (/KM|Chiết khấu khuyến mãi|Quà tặng đơn hàng|Tặng \d+ sản phẩm|50,000 đ|50\.000đ/i.test(text)) return;
  if (/không đủ điều kiện|chưa thỏa|Thất bại|Lỗi/i.test(text)) {
    await failWithContext(page, `${effectReason}: hệ thống trả thông báo không đủ điều kiện/lỗi.`);
  }
  await failWithContext(page, `${effectReason}: không thấy tag KM, quà tặng hoặc chiết khấu khuyến mãi sau khi áp dụng.`);
}

async function fillManualDiscount(page, value = '1') {
  const discount = page.locator('#order-info-discount');
  await expect(discount).toBeVisible();
  await discount.fill(value);
  await expect(discount).toHaveValue(value);
}

test.describe('VNPost - Chương trình khuyến mãi trong POS', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectSalesScope(page);
  });

  test('PROMO-001 Mở modal Chương trình khuyến mãi từ POS', async ({ page }) => {
    await openPos(page);
    await expect(page.getByText(/Chương trình khuyến mãi\s*\(\d+\)/i).first()).toBeVisible();
    await expect(page.getByText(/Chiết khấu/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Thanh toán$/i }).last()).toBeVisible();
    await addProductFromSearch(page);
    const modal = await openPromotionModal(page);
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/Theo đơn hàng/i).first()).toBeVisible();
    await expect(modal.getByText(/Theo sản phẩm/i).first()).toBeVisible();
  });

  test('PROMO-002 Mở modal CTKM khi đơn chưa có sản phẩm', async ({ page }) => {
    await openPos(page);
    const modal = await openPromotionModal(page, { allowToastOnly: true });
    if (modal) {
      await expect(modal).toBeVisible();
      await expect(modal.getByText(/Theo đơn hàng/i).first()).toBeVisible();
      await expect(modal.getByText(/Theo sản phẩm/i).first()).toBeVisible();
    }
  });

  test('PROMO-003 Mở modal CTKM sau khi thêm sản phẩm', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page);
    const modal = await openPromotionModal(page);
    await expect(modal.getByText(/Theo đơn hàng/i).first()).toBeVisible();
    await expect(modal.getByText(/Theo sản phẩm/i).first()).toBeVisible();
  });

  test('PROMO-004 Kiểm tra tab Theo đơn hàng', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page);
    await selectExistingCustomer(page);
    await openPromotionModal(page);
    await clickPromotionTab(page, /Theo đơn hàng/i);
    const modalText = await activePromotionModalText(page);
    expect(modalText).toMatch(/Theo đơn hàng/);
    expect(modalText).toMatch(/Hóa đơn từ 300\.?000|300,000|300\.000|Đối tượng áp dụng|VIP - Tổng mua 10tr v2026/i);
  });

  test('PROMO-005 Kiểm tra tab Theo sản phẩm', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page);
    await openPromotionModal(page);
    await clickPromotionTab(page, /Theo sản phẩm/i);
    const modalText = await activePromotionModalText(page);
    expect(modalText).toMatch(/Theo sản phẩm/);
    expect(modalText).toMatch(/Sản phẩm|Tìm kiếm|Không có chương trình|Chương trình khuyến mãi/i);
  });

  test('PROMO-006 Kiểm tra trạng thái điều kiện CTKM', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page);
    await selectExistingCustomer(page);
    await openPromotionModal(page);
    const text = await activePromotionModalText(page);
    if (!/Hóa đơn từ 300\.?000|300,000|300\.000/i.test(text) || !/Mua 1 Sản phẩm 13/i.test(text) || !/VIP - Tổng mua 10tr v2026/i.test(text)) {
      await failWithContext(page, 'Modal CTKM mở nhưng không thấy đủ điều kiện hóa đơn 300.000đ, sản phẩm 13 và nhóm VIP như tài liệu.');
    }
  });

  test('PROMO-007 Áp dụng CTKM theo đơn hàng nếu đủ điều kiện', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page);
    await selectExistingCustomer(page);
    await openPromotionModal(page);
    await clickPromotionTab(page, /Theo đơn hàng/i);
    await selectNamedCampaign(page, ORDER_CAMPAIGN_NAME, 'Áp dụng CTKM theo đơn hàng');
    await applyAndExpectPromotionEffect(page, 'Áp dụng CTKM theo đơn hàng');
  });

  test('PROMO-008 Áp dụng CTKM theo sản phẩm nếu đủ điều kiện', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page, PRODUCT_PROMO_PRODUCT_NAME, {
      price: PRODUCT_PROMO_PRICE,
      quantity: PRODUCT_PROMO_QTY,
    });
    await selectExistingCustomer(page);
    await openPromotionModal(page);
    await clickPromotionTab(page, /Theo sản phẩm/i);
    await selectNamedProductCampaign(page, PRODUCT_CAMPAIGN_NAME, 'Áp dụng CTKM theo sản phẩm');
    await applyAndExpectPromotionEffect(page, 'Áp dụng CTKM theo sản phẩm');
  });

  test('PROMO-009 Không tự động tick CTKM theo sản phẩm', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page);
    await openPromotionModal(page);
    await clickPromotionTab(page, /Theo sản phẩm/i);
    const modal = await promotionModal(page);
    const checked = await modal.locator('.ant-checkbox-input:checked, input[type="checkbox"]:checked').count();
    if (checked > 0) {
      await failWithContext(page, 'Tab Theo sản phẩm đang tự tick CTKM, trái với tài liệu: người dùng phải tự tick chương trình muốn áp dụng.');
    }
  });

  test('PROMO-010 Tách chiết khấu nhập tay và chiết khấu khuyến mãi', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page);
    await selectExistingCustomer(page);
    await openPromotionModal(page);
    await clickPromotionTab(page, /Theo đơn hàng/i);
    await selectNamedCampaign(page, ORDER_CAMPAIGN_NAME, 'Tách chiết khấu nhập tay và chiết khấu khuyến mãi');
    await applyAndExpectPromotionEffect(page, 'Tách chiết khấu nhập tay và chiết khấu khuyến mãi');
    await fillManualDiscount(page, '1');
    const text = await visibleText(page, 5000);
    if (!/Chiết khấu|Chiết khấu đơn hàng/i.test(text)) {
      await failWithContext(page, 'Không thấy khu vực chiết khấu đơn hàng sau khi nhập chiết khấu tay.');
    }
    if (!/Chiết khấu khuyến mãi/i.test(text)) {
      await failWithContext(page, 'Không thấy khu vực CTKM/chiết khấu khuyến mãi tách riêng trong tổng quan đơn hàng.');
    }
  });

  test('PROMO-011 Gỡ CTKM khi đơn hàng không còn đủ điều kiện', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page);
    await selectExistingCustomer(page);
    await openPromotionModal(page);
    await clickPromotionTab(page, /Theo đơn hàng/i);
    await selectNamedCampaign(page, ORDER_CAMPAIGN_NAME, 'Gỡ CTKM khi đơn hàng không còn đủ điều kiện');
    await applyAndExpectPromotionEffect(page, 'Gỡ CTKM khi đơn hàng không còn đủ điều kiện');
    await page.locator('.ant-table-row').first().locator('button, .anticon, svg').last().click({ force: true }).catch(async () => {
      await clickFirstVisible(page, [
        page.getByText(/Xóa tất cả|Xoá tất cả/i).first(),
        page.getByText(/Xóa|Xoá/i).last(),
      ], 3000);
    });
    await page.waitForTimeout(1200);
    const text = await visibleText(page, 5000);
    if (/KM|Quà tặng đơn hàng/.test(text) && !/Chưa thêm sản phẩm|Chương trình khuyến mãi\s*\(0\)/i.test(text)) {
      await failWithContext(page, 'Sau khi gỡ sản phẩm điều kiện, vẫn còn tag KM/quà tặng CTKM trong đơn.');
    }
  });

  test('PROMO-012 Mở thanh toán sau khi áp dụng/kiểm tra CTKM', async ({ page }) => {
    await openPos(page);
    await addProductFromSearch(page);
    await selectExistingCustomer(page);
    await openPromotionModal(page);
    await clickPromotionTab(page, /Theo đơn hàng/i);
    await selectNamedCampaign(page, ORDER_CAMPAIGN_NAME, 'Mở thanh toán sau khi áp dụng/kiểm tra CTKM');
    await applyAndExpectPromotionEffect(page, 'Mở thanh toán sau khi áp dụng/kiểm tra CTKM');
    await fillManualDiscount(page, '1');
    const orderSummaryText = await visibleText(page, 6000);
    if (!/Chiết khấu khuyến mãi/i.test(orderSummaryText) || !/Chiết khấu đơn hàng/i.test(orderSummaryText)) {
      await failWithContext(page, 'Trước khi mở thanh toán chưa thấy đủ chiết khấu đơn hàng và chiết khấu khuyến mãi trong tổng quan.');
    }
    const opened = await clickFirstVisible(page, [
      page.getByRole('button', { name: /^Thanh toán$/i }).last(),
      page.locator('button:visible').filter({ hasText: /^Thanh toán$/ }).last(),
    ], 5000);
    if (!opened) await failWithContext(page, 'Không bấm được nút Thanh toán trên POS.');
    await expectAnyText(page, [/Hình thức thanh toán|Phương thức thanh toán|Tiền mặt|Thanh toán sau|Tổng tiền|Cần thanh toán/i], 'Không mở được drawer thanh toán để kiểm tra tổng giảm giá.');
    const paymentText = await visibleText(page, 6000);
    if (!/Cần thanh toán|Tổng tiền|Chiết khấu|350,000|347,000|250,000|247,000/i.test(paymentText)) {
      await failWithContext(page, 'Drawer thanh toán mở nhưng không thấy tổng tiền/cần thanh toán phản ánh CTKM và chiết khấu tay.');
    }
  });
});
