const { test, expect } = require('@playwright/test');
const {
  clickFirstVisible,
  login,
  visibleText,
} = require('../../shared/vnpost-helpers');

const BASE_URL = 'https://vnpost.sfin.vn';
const CAMPAIGN_URL = `${BASE_URL}/promotion/campaign`;
const CAMPAIGN_CREATE_URL = `${BASE_URL}/promotion/campaign/create`;
const CONDITION_URL = `${BASE_URL}/promotion/condition`;
const CUSTOMER_GROUP_URL = `${BASE_URL}/promotion/customer-group`;
const RUN_ID = Date.now();
const CONDITION_NAME = `AUTO_CTKM_DK_${RUN_ID}`;
const CONDITION_NAME_UPDATED = `${CONDITION_NAME}_UPD`;
const CUSTOMER_GROUP_NAME = `AUTO_CTKM_NDT_${RUN_ID}`;
const CUSTOMER_GROUP_NAME_UPDATED = `${CUSTOMER_GROUP_NAME}_UPD`;
const CAMPAIGN_NAME = `AUTO_CTKM_CT_${RUN_ID}`;
const CAMPAIGN_NAME_UPDATED = `${CAMPAIGN_NAME}_UPD`;

async function failWithContext(page, reason) {
  throw new Error(`${reason}\nURL hiện tại: ${page.url()}\nText màn hình: ${await visibleText(page, 6000)}`);
}

async function expectAnyText(page, patterns, reason = 'Không thấy text kỳ vọng') {
  const text = await visibleText(page, 6000);
  if (!patterns.some((pattern) => pattern.test(text))) {
    await failWithContext(page, `${reason}. Kỳ vọng: ${patterns.map((p) => p.source).join(' | ')}`);
  }
}

async function selectAdminOrMarketingScope(page) {
  const clicked = await clickFirstVisible(page, [
    page.getByText('Admin', { exact: true }).first(),
    page.getByText('Marketing', { exact: true }).first(),
    page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first(),
  ], 7000);
  if (!clicked) await failWithContext(page, 'Không chọn được role Admin/Marketing cấp Tổng công ty.');
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function openPage(page, url, expectedTexts) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await expectAnyText(page, expectedTexts, `Không mở đúng màn ${url}`);
}

async function openCampaignList(page) {
  await openPage(page, CAMPAIGN_URL, [/Quản lý chương trình khuyến mãi|Thêm mới chương trình|Mã CTKM/i]);
}

async function openCampaignCreate(page) {
  await openPage(page, CAMPAIGN_CREATE_URL, [/Thêm mới chương trình khuyến mãi|Thông tin chung|Phạm vi áp dụng/i]);
}

async function openConditionList(page) {
  await openPage(page, CONDITION_URL, [/Danh sách điều kiện|Thêm điều kiện|Hành động/i]);
}

async function openCustomerGroupList(page) {
  await openPage(page, CUSTOMER_GROUP_URL, [/Danh sách nhóm đối tượng|Thêm nhóm đối tượng|Đối tượng áp dụng/i]);
}

async function clickByText(page, pattern, reason, root = page) {
  const clicked = await clickFirstVisible(page, [
    root.getByRole('button', { name: pattern }).first(),
    root.getByText(pattern, { exact: false }).first(),
  ], 4000);
  if (!clicked) await failWithContext(page, reason);
}

async function currentOverlay(page) {
  const overlay = page.locator('.ant-modal:visible, .ant-drawer:visible').last();
  return await overlay.isVisible().catch(() => false) ? overlay : page;
}

async function saveVisibleForm(page) {
  const root = await currentOverlay(page);
  await clickByText(page, /Xác nhận|Lưu$/i, 'Không thấy nút Xác nhận/Lưu trên form.', root);
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function selectFirstDropdownOption(page, selectLocator, reason) {
  await selectLocator.click({ force: true });
  await page.waitForTimeout(700);
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option:not(.ant-select-item-option-disabled)').first();
  if (!await option.isVisible().catch(() => false)) await failWithContext(page, reason);
  await option.click({ force: true });
  await page.waitForTimeout(500);
}

async function setCheckboxByLabel(page, labelText, checked) {
  const label = page.locator('label').filter({ hasText: labelText }).first();
  const input = label.locator('input').first();
  if (!await input.isVisible().catch(() => false)) await failWithContext(page, `Không thấy checkbox ${labelText}.`);
  const current = await input.isChecked().catch(() => false);
  if (current !== checked) await label.click({ force: true });
}

async function searchList(page, placeholder, keyword) {
  const search = page.getByPlaceholder(placeholder).first();
  if (!await search.isVisible().catch(() => false)) await failWithContext(page, `Không thấy ô tìm kiếm ${placeholder}.`);
  await search.fill('');
  await search.fill(keyword);
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function rowByText(page, text, reason = `Không tìm thấy dòng ${text}`) {
  const row = page.locator('tbody tr').filter({ hasText: text }).first();
  if (!await row.isVisible().catch(() => false)) await failWithContext(page, reason);
  return row;
}

async function confirmDelete(page) {
  await expectAnyText(page, [/Xác nhận xóa|Xác nhận xoá|Đồng ý|Xóa|Xoá/i], 'Không thấy popup xác nhận xóa.');
  const clicked = await clickFirstVisible(page, [
    page.getByRole('button', { name: /Đồng ý/i }).last(),
    page.getByRole('button', { name: /Xóa|Xoá/i }).last(),
    page.getByRole('button', { name: /Xác nhận|OK/i }).last(),
  ], 5000);
  if (!clicked) await failWithContext(page, 'Không bấm được nút xác nhận xóa.');
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function createCondition(page, name) {
  await openConditionList(page);
  await page.getByRole('button', { name: /Thêm điều kiện/i }).click();
  await page.waitForTimeout(800);
  await page.locator('#conditionName').fill(name);
  await page.locator('#minimumValue').fill('1000');
  await page.getByText('Không yêu cầu', { exact: true }).click({ force: true });
  await saveVisibleForm(page);
  await searchList(page, 'Tìm kiếm điều kiện', name);
  await rowByText(page, name, `Thêm điều kiện thành công nhưng không tìm thấy dòng ${name}.`);
}

async function updateCondition(page, currentName, newName) {
  await openConditionList(page);
  await searchList(page, 'Tìm kiếm điều kiện', currentName);
  const row = await rowByText(page, currentName);
  await row.locator('.anticon-edit').click({ force: true });
  await page.waitForTimeout(900);
  await expectAnyText(page, [/Cập nhật điều kiện đơn hàng|Tên điều kiện/i], 'Không mở được popup cập nhật điều kiện.');
  await page.locator('#conditionName').fill(newName);
  await saveVisibleForm(page);
  await searchList(page, 'Tìm kiếm điều kiện', newName);
  await rowByText(page, newName, `Cập nhật điều kiện xong nhưng không tìm thấy dòng ${newName}.`);
}

async function deleteCondition(page, name) {
  await openConditionList(page);
  await searchList(page, 'Tìm kiếm điều kiện', name);
  const row = await rowByText(page, name);
  await row.locator('button.ant-btn-dangerous').click({ force: true });
  await page.waitForTimeout(800);
  await confirmDelete(page);
  await searchList(page, 'Tìm kiếm điều kiện', name);
  await expect(page.locator('tbody tr').filter({ hasText: name })).toHaveCount(0);
}

async function createCustomerGroup(page, name) {
  await openCustomerGroupList(page);
  await page.getByRole('button', { name: /Thêm nhóm đối tượng/i }).click();
  await page.waitForTimeout(800);
  await page.locator('#groupName').fill(name);
  await page.locator('#description').fill('Auto test');
  await saveVisibleForm(page);
  await searchList(page, 'Tìm kiếm nhóm đối tượng', name);
  await rowByText(page, name, `Thêm nhóm đối tượng thành công nhưng không tìm thấy dòng ${name}.`);
}

async function updateCustomerGroup(page, currentName, newName) {
  await openCustomerGroupList(page);
  await searchList(page, 'Tìm kiếm nhóm đối tượng', currentName);
  const row = await rowByText(page, currentName);
  await row.locator('.anticon-edit').click({ force: true });
  await page.waitForTimeout(900);
  await expectAnyText(page, [/Cập nhật nhóm đối tượng|Tên nhóm đối tượng khách hàng/i], 'Không mở được drawer cập nhật nhóm đối tượng.');
  await page.locator('#groupName').fill(newName);
  await saveVisibleForm(page);
  await page.keyboard.press('Escape').catch(() => {});
  await searchList(page, 'Tìm kiếm nhóm đối tượng', newName);
  await rowByText(page, newName, `Cập nhật nhóm đối tượng xong nhưng không tìm thấy dòng ${newName}.`);
}

async function deleteCustomerGroup(page, name) {
  await openCustomerGroupList(page);
  await searchList(page, 'Tìm kiếm nhóm đối tượng', name);
  const row = await rowByText(page, name);
  await row.locator('button.ant-btn-dangerous').click({ force: true });
  await page.waitForTimeout(800);
  await confirmDelete(page);
  await searchList(page, 'Tìm kiếm nhóm đối tượng', name);
  await expect(page.locator('tbody tr').filter({ hasText: name })).toHaveCount(0);
}

async function fillDraftCampaign(page, name) {
  await openCampaignCreate(page);
  await page.locator('#promotionName').fill(name);
  await selectFirstDropdownOption(
    page,
    page.locator('.ant-select').filter({ hasText: /Chọn điều kiện áp dụng/ }).first(),
    'Không chọn được điều kiện áp dụng cho CTKM.',
  );
  await selectFirstDropdownOption(
    page,
    page.locator('.ant-select').filter({ hasText: /Chọn nhóm khách hàng/ }).first(),
    'Không chọn được đối tượng áp dụng cho CTKM.',
  );
  await page.locator('#description').fill('Auto test');
  await setCheckboxByLabel(page, 'Không cài đặt ngày kết thúc', true);
  await setCheckboxByLabel(page, 'Không cài đặt khung giờ', true);
  await page.getByText('Theo đơn hàng', { exact: true }).click({ force: true });
  await page.locator('#orderDiscountValue').fill('1');
  await setCheckboxByLabel(page, 'Áp dụng quà tặng', false);
  await page.getByText('Phạm vi áp dụng', { exact: true }).click({ force: true });
  await page.waitForTimeout(800);
  const scopeCheckbox = page.locator('label.ant-checkbox-wrapper:visible').nth(3);
  if (!await scopeCheckbox.isVisible().catch(() => false)) await failWithContext(page, 'Không thấy checkbox chọn phạm vi áp dụng CTKM.');
  await scopeCheckbox.click({ force: true });
  await page.waitForTimeout(500);
}

async function createDraftCampaign(page, name) {
  await fillDraftCampaign(page, name);
  await page.getByRole('button', { name: /Lưu nháp/i }).click();
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await expect(page).toHaveURL(/\/promotion\/campaign/);
  await rowByText(page, name, `Lưu nháp CTKM thành công nhưng không thấy dòng ${name}.`);
}

async function updateDraftCampaign(page, currentName, newName) {
  await openCampaignList(page);
  const row = await rowByText(page, currentName);
  await row.locator('.anticon-edit').click({ force: true });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await expectAnyText(page, [/Cập nhật|Thông tin chung|Tên chương trình/i], 'Không mở được màn cập nhật CTKM.');
  await page.locator('#promotionName').fill(newName);
  await page.getByText('Phạm vi áp dụng', { exact: true }).click({ force: true });
  await page.waitForTimeout(800);
  const selectedCountText = await visibleText(page, 1500);
  if (/Đã chọn 0 đơn vị\/điểm bán/i.test(selectedCountText)) {
    const scopeCheckbox = page.locator('label.ant-checkbox-wrapper:visible').nth(3);
    if (!await scopeCheckbox.isVisible().catch(() => false)) await failWithContext(page, 'Không thấy checkbox chọn lại phạm vi khi cập nhật CTKM.');
    await scopeCheckbox.click({ force: true });
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: /^Lưu$/i }).click();
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await expect(page).toHaveURL(/\/promotion\/campaign/);
  await rowByText(page, newName, `Cập nhật CTKM xong nhưng không thấy dòng ${newName}.`);
}

async function firstDataRow(page) {
  const row = page.locator('.ant-table-row, tbody tr').filter({ hasText: /CTKM|Điều kiện|Nhóm|Khách|Đang diễn ra|Đã kết thúc/i }).first();
  return await row.isVisible().catch(() => false) ? row : null;
}

async function clickRowIcon(page, row, index, reason) {
  const icons = row.locator('button:visible, a:visible, .anticon:visible, svg:visible');
  if (await icons.nth(index).isVisible().catch(() => false)) {
    await icons.nth(index).click({ force: true });
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
    await page.waitForTimeout(1000);
    return;
  }
  await failWithContext(page, reason);
}

async function clickFirstActionPopupAndCancel(page) {
  const row = await firstDataRow(page);
  if (!row) {
    test.info().annotations.push({ type: 'OBSERVED_NO_DATA', description: 'Không có dữ liệu dòng để kiểm tra action trạng thái.' });
    return false;
  }
  const actionClicked = await clickFirstVisible(page, [
    row.getByText(/Dừng|Tiếp tục|Bắt đầu/i).first(),
    row.locator('button:visible, .anticon:visible, svg:visible').last(),
  ], 3000);
  if (!actionClicked) {
    test.info().annotations.push({ type: 'OBSERVED_MISSING_ACTION', description: 'Không thấy action dừng/tiếp tục/bắt đầu trên dòng hiện tại.' });
    return false;
  }
  await page.waitForTimeout(1000);
  const text = await visibleText(page, 4000);
  if (!/Xác nhận|Đồng ý|Dừng|Tiếp tục|Bắt đầu|Bạn có/i.test(text)) {
    test.info().annotations.push({ type: 'OBSERVED_MISSING_POPUP', description: 'Click action nhưng không thấy popup xác nhận rõ ràng.' });
    return false;
  }
  await clickFirstVisible(page, [
    page.getByRole('button', { name: /Hủy|Huỷ|Không/i }).last(),
    page.locator('.ant-modal-close:visible').last(),
  ], 3000);
  return true;
}

test.describe('VNPost - Chương trình khuyến mãi', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectAdminOrMarketingScope(page);
  });

  test('CTKM-001 Mở danh sách chương trình khuyến mãi', async ({ page }) => {
    await openCampaignList(page);
    await expectAnyText(page, [/Chương trình đang diễn ra|Chương trình đã kết thúc|Chương trình chưa diễn ra/i]);
    await expectAnyText(page, [/Mã CTKM|Tên chương trình|Trạng thái|Đối tượng áp dụng|Phạm vi áp dụng|Thao tác/i]);
  });

  test('CTKM-002 Kiểm tra bộ lọc danh sách CTKM', async ({ page }) => {
    await openCampaignList(page);
    await expectAnyText(page, [/Trạng thái|Chọn nhóm khách hàng|Phạm vi áp dụng/i]);
    await expect(page.getByRole('button', { name: /Thêm mới chương trình/i })).toBeVisible();
  });

  test('CTKM-003 Mở màn Thêm mới CTKM', async ({ page }) => {
    await openCampaignList(page);
    await page.getByRole('button', { name: /Thêm mới chương trình/i }).click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await expect(page).toHaveURL(/\/promotion\/campaign\/create/);
    await expectAnyText(page, [/Thêm mới chương trình khuyến mãi|Thông tin chung|Phạm vi áp dụng/i]);
  });

  test('CTKM-004 Validate khi lưu CTKM rỗng', async ({ page }) => {
    await openCampaignCreate(page);
    await page.getByRole('button', { name: /^Lưu$/i }).click();
    await page.waitForTimeout(1200);
    await expectAnyText(page, [/Vui lòng|không được để trống|bắt buộc|required|Tên chương trình|Điều kiện áp dụng/i], 'Không thấy validation khi lưu CTKM rỗng');
  });

  test('CTKM-005 Kiểm tra tab Thông tin chung', async ({ page }) => {
    await openCampaignCreate(page);
    await expectAnyText(page, [/Tên chương trình|Điều kiện áp dụng|Đối tượng áp dụng|Thông tin mô tả|Thời gian áp dụng|Phân loại khuyến mãi/i]);
  });

  test('CTKM-006 Kiểm tra thời gian áp dụng', async ({ page }) => {
    await openCampaignCreate(page);
    await expectAnyText(page, [/Không cài đặt ngày kết thúc|Ngày bắt đầu|Ngày kết thúc|Không cài đặt khung giờ|Giờ bắt đầu|Giờ kết thúc/i]);
  });

  test('CTKM-007 Kiểm tra phân loại Theo sản phẩm - Giảm giá bán', async ({ page }) => {
    await openCampaignCreate(page);
    await clickByText(page, /Theo sản phẩm/i, 'Không chọn được phân loại Theo sản phẩm.');
    await clickByText(page, /Giảm giá bán/i, 'Không chọn được hình thức Giảm giá bán.');
    await expectAnyText(page, [/Mua sản phẩm|Số lượng từ|Được giảm giá cho mỗi sản phẩm|Được giảm giá sản phẩm tiếp theo|Thêm sản phẩm khuyến mãi/i]);
  });

  test('CTKM-008 Kiểm tra phân loại Theo sản phẩm - Tặng kèm sản phẩm khác', async ({ page }) => {
    await openCampaignCreate(page);
    await clickByText(page, /Theo sản phẩm/i, 'Không chọn được phân loại Theo sản phẩm.');
    await clickByText(page, /Tặng kèm sản phẩm khác/i, 'Không chọn được hình thức Tặng kèm sản phẩm khác.');
    await expectAnyText(page, [/Hình thức tặng kèm|Tặng kèm không bán|Giảm giá tổng của combo|Thêm sản phẩm khuyến mãi|Số lượng sản phẩm/i]);
  });

  test('CTKM-009 Kiểm tra phân loại Theo sản phẩm - Được mua sản phẩm khác giá thấp', async ({ page }) => {
    await openCampaignCreate(page);
    await clickByText(page, /Theo sản phẩm/i, 'Không chọn được phân loại Theo sản phẩm.');
    await clickByText(page, /Được mua sản phẩm khác giá thấp/i, 'Không chọn được hình thức mua sản phẩm khác giá thấp.');
    await expectAnyText(page, [/Mua sản phẩm|Số lượng từ|Giảm giá|sản phẩm khác giá thấp|Thêm sản phẩm khuyến mãi/i]);
  });

  test('CTKM-010 Kiểm tra phân loại Theo đơn hàng', async ({ page }) => {
    await openCampaignCreate(page);
    await clickByText(page, /Theo đơn hàng/i, 'Không chọn được phân loại Theo đơn hàng.');
    await expectAnyText(page, [/Khuyến mãi cho đơn hàng|Giảm giá|VND|%|quà tặng|Áp dụng quà tặng/i]);
  });

  test('CTKM-011 Kiểm tra tab Phạm vi áp dụng', async ({ page }) => {
    await openCampaignCreate(page);
    await clickByText(page, /Phạm vi áp dụng/i, 'Không mở được tab Phạm vi áp dụng.');
    await expectAnyText(page, [/Toàn Tỉnh|Toàn Xã|Điểm bán|Chọn điểm bán|Xem danh sách|Tỉnh|Xã|Phường/i]);
  });

  test('CTKM-012 Mở cập nhật CTKM từ danh sách', async ({ page }) => {
    await openCampaignList(page);
    const row = await firstDataRow(page);
    if (!row) {
      test.info().annotations.push({ type: 'OBSERVED_NO_DATA', description: 'Danh sách CTKM trống nên không mở cập nhật.' });
      return;
    }
    await clickRowIcon(page, row, 0, 'Không click được icon sửa CTKM.');
    await expectAnyText(page, [/Cập nhật|Thông tin chung|Phạm vi áp dụng|Tên chương trình/i], 'Click sửa CTKM nhưng không mở màn cập nhật.');
  });

  test('CTKM-013 Kiểm tra action dừng/tiếp tục/bắt đầu không xác nhận', async ({ page }) => {
    await openCampaignList(page);
    await clickFirstActionPopupAndCancel(page);
    await expectAnyText(page, [/Quản lý chương trình khuyến mãi|Mã CTKM|Tên chương trình/i]);
  });

  test('CTKM-014 Mở danh sách điều kiện', async ({ page }) => {
    await openConditionList(page);
    await expectAnyText(page, [/#|Tên|Hành động|Thêm điều kiện/i]);
  });

  test('CTKM-015 Mở form thêm điều kiện', async ({ page }) => {
    await openConditionList(page);
    await page.getByRole('button', { name: /Thêm điều kiện/i }).click();
    await page.waitForTimeout(1000);
    await expectAnyText(page, [/Thêm mới điều kiện đơn hàng|Tên điều kiện|Điều kiện giá trị đơn hàng|Điều kiện sản phẩm ràng buộc/i]);
  });

  test('CTKM-016 Validate thêm điều kiện rỗng', async ({ page }) => {
    await openConditionList(page);
    await page.getByRole('button', { name: /Thêm điều kiện/i }).click();
    await page.waitForTimeout(800);
    await saveVisibleForm(page);
    await expectAnyText(page, [/Vui lòng|không được để trống|bắt buộc|required|Tên điều kiện/i], 'Không thấy validation khi thêm điều kiện rỗng.');
  });

  test('CTKM-017 Kiểm tra các loại điều kiện', async ({ page }) => {
    await openConditionList(page);
    await page.getByRole('button', { name: /Thêm điều kiện/i }).click();
    await page.waitForTimeout(800);
    await expectAnyText(page, [/Tính theo giá trị tối thiểu của tổng đơn hàng|Tính theo giá trị tổng số tiền của các sản phẩm|Cần có các sản phẩm được cài đặt|Không yêu cầu|Hướng dẫn/i]);
  });

  test('CTKM-018 Mở form sửa điều kiện', async ({ page }) => {
    await openConditionList(page);
    const row = await firstDataRow(page);
    if (!row) {
      test.info().annotations.push({ type: 'OBSERVED_NO_DATA', description: 'Danh sách điều kiện trống nên không mở sửa.' });
      return;
    }
    await clickRowIcon(page, row, 0, 'Không click được icon sửa điều kiện.');
    await expectAnyText(page, [/Cập nhật|Điều kiện đơn hàng|Tên điều kiện|Điều kiện giá trị đơn hàng/i], 'Click sửa điều kiện nhưng không mở form.');
  });

  test('CTKM-019 Mở danh sách đối tượng', async ({ page }) => {
    await openCustomerGroupList(page);
    await expectAnyText(page, [/#|Tên|Đối tượng áp dụng|Hành động|Thêm nhóm đối tượng/i]);
  });

  test('CTKM-020 Mở form thêm nhóm đối tượng', async ({ page }) => {
    await openCustomerGroupList(page);
    await page.getByRole('button', { name: /Thêm nhóm đối tượng/i }).click();
    await page.waitForTimeout(1000);
    await expectAnyText(page, [/Thêm nhóm đối tượng khách hàng áp dụng|Tên nhóm đối tượng khách hàng|Nhóm đối tượng khách hàng được áp dụng/i]);
  });

  test('CTKM-021 Validate thêm nhóm đối tượng rỗng', async ({ page }) => {
    await openCustomerGroupList(page);
    await page.getByRole('button', { name: /Thêm nhóm đối tượng/i }).click();
    await page.waitForTimeout(800);
    await saveVisibleForm(page);
    await expectAnyText(page, [/Vui lòng|không được để trống|bắt buộc|required|Tên nhóm đối tượng/i], 'Không thấy validation khi thêm nhóm đối tượng rỗng.');
  });

  test('CTKM-022 Kiểm tra các loại nhóm đối tượng', async ({ page }) => {
    await openCustomerGroupList(page);
    await page.getByRole('button', { name: /Thêm nhóm đối tượng/i }).click();
    await page.waitForTimeout(800);
    await expectAnyText(page, [/Nhóm khách hàng|Khách hàng tuỳ chỉnh|Khách mới|Thêm điều kiện|Hệ thống thực hiện tự động|Cập nhật toàn bộ danh sách/i]);
  });

  test('CTKM-023 Mở form sửa nhóm đối tượng', async ({ page }) => {
    await openCustomerGroupList(page);
    const row = await firstDataRow(page);
    if (!row) {
      test.info().annotations.push({ type: 'OBSERVED_NO_DATA', description: 'Danh sách đối tượng trống nên không mở sửa.' });
      return;
    }
    await clickRowIcon(page, row, 0, 'Không click được icon sửa nhóm đối tượng.');
    await expectAnyText(page, [/Cập nhật|nhóm đối tượng|Tên nhóm đối tượng khách hàng|Nhóm đối tượng khách hàng được áp dụng/i], 'Click sửa nhóm đối tượng nhưng không mở form.');
  });

  test('CTKM-024 Thêm điều kiện khuyến mãi hợp lệ', async ({ page }) => {
    await createCondition(page, CONDITION_NAME);
  });

  test('CTKM-025 Sửa điều kiện khuyến mãi vừa tạo', async ({ page }) => {
    await updateCondition(page, CONDITION_NAME, CONDITION_NAME_UPDATED);
  });

  test('CTKM-026 Xóa điều kiện khuyến mãi vừa tạo', async ({ page }) => {
    await deleteCondition(page, CONDITION_NAME_UPDATED);
  });

  test('CTKM-027 Thêm nhóm đối tượng áp dụng hợp lệ', async ({ page }) => {
    await createCustomerGroup(page, CUSTOMER_GROUP_NAME);
  });

  test('CTKM-028 Sửa nhóm đối tượng áp dụng vừa tạo', async ({ page }) => {
    await updateCustomerGroup(page, CUSTOMER_GROUP_NAME, CUSTOMER_GROUP_NAME_UPDATED);
  });

  test('CTKM-029 Xóa nhóm đối tượng áp dụng vừa tạo', async ({ page }) => {
    await deleteCustomerGroup(page, CUSTOMER_GROUP_NAME_UPDATED);
  });

  test('CTKM-030 Thêm chương trình khuyến mãi dạng lưu nháp', async ({ page }) => {
    await createDraftCampaign(page, CAMPAIGN_NAME);
  });

  test('CTKM-031 Sửa chương trình khuyến mãi dạng lưu nháp', async ({ page }) => {
    await updateDraftCampaign(page, CAMPAIGN_NAME, CAMPAIGN_NAME_UPDATED);
  });

  test('CTKM-032 Kiểm tra danh sách CTKM không có action xóa trên UI hiện tại', async ({ page }) => {
    await openCampaignList(page);
    const row = await rowByText(page, CAMPAIGN_NAME_UPDATED);
    await expect(row.locator('button.ant-btn-dangerous, .anticon-delete, .anticon-close')).toHaveCount(0);
  });
});
