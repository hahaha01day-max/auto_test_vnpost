const { test, expect } = require('@playwright/test');
const {
  clickFirstVisible,
  login,
  visibleText,
} = require('../../shared/vnpost-helpers');

const ROLE_URLS = [
  'https://vnpost.sfin.vn/role-permission/role',
  'https://vnpost.sfin.vn/role-permission',
  'https://vnpost.sfin.vn/permission/role',
  'https://vnpost.sfin.vn/roles',
  'https://vnpost.sfin.vn/account/role',
  'https://vnpost.sfin.vn/system/role',
  'https://vnpost.sfin.vn/chain/role',
];

const ROLE_CODE = `AUTO_ROLE_${Date.now().toString().slice(-8)}`;
const ROLE_NAME = `AUTO Vai trò ${Date.now().toString().slice(-8)}`;
const ROLE_NAME_UPDATED = `${ROLE_NAME} update`;

async function failWithContext(page, reason) {
  throw new Error(`${reason}\nURL hiện tại: ${page.url()}\nText màn hình: ${await visibleText(page, 2200)}`);
}

async function selectAdminScope(page) {
  const clicked = await clickFirstVisible(page, [
    page.getByText('Admin', { exact: true }).first(),
    page.getByText('Quản trị hệ thống', { exact: true }).first(),
    page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first(),
  ], 7000);
  if (!clicked) await failWithContext(page, 'Không chọn được role/phạm vi Admin để vào phân quyền vai trò.');
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function expectAnyText(page, patterns, reason = 'Không thấy text kỳ vọng') {
  const text = await visibleText(page, 6000);
  const matched = patterns.some((pattern) => pattern.test(text));
  if (!matched) await failWithContext(page, `${reason}. Kỳ vọng: ${patterns.map((p) => p.source).join(' | ')}`);
}

async function openByDirectUrl(page) {
  for (const url of ROLE_URLS) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    const text = await visibleText(page, 3500);
    if (/Quản lý vai trò|Vai trò|Phân quyền chức năng|Mã vai trò|Tên vai trò/i.test(text)
      && !/404|không tồn tại|not found|Error code 522/i.test(text)) {
      return;
    }
  }
}

async function openByMenu(page) {
  await page.goto('https://vnpost.sfin.vn/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await clickFirstVisible(page, [
    page.getByText('Quản lý vai trò', { exact: true }).first(),
    page.getByText('Quản lý vai trò', { exact: false }).first(),
  ], 3000);
  await page.waitForTimeout(600);

  const roleClicked = await clickFirstVisible(page, [
    page.locator('a:visible').filter({ hasText: /^Vai trò$/ }).last(),
    page.getByText('Vai trò', { exact: true }).last(),
    page.getByText(/Danh sách vai trò|Quản lý vai trò/i).last(),
  ], 5000);
  if (!roleClicked) return false;
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const text = await visibleText(page, 3500);
  return /Thêm mới|Tìm kiếm|Mã vai trò|Tên vai trò|Danh sách vai trò|Thao tác/i.test(text);
}

async function openRoleModule(page) {
  await openByMenu(page);
  let text = await visibleText(page, 3500);
  if (!/Thêm mới|Tìm kiếm|Mã vai trò|Tên vai trò|Danh sách vai trò|Thao tác/i.test(text)) {
    await openByDirectUrl(page);
    text = await visibleText(page, 3500);
    const opened = /Thêm mới|Tìm kiếm|Mã vai trò|Tên vai trò|Danh sách vai trò|Thao tác/i.test(text);
    if (!opened) await failWithContext(page, 'Không mở được màn Quản lý vai trò bằng URL hoặc menu.');
  }
  await expectAnyText(page, [/Thêm mới|Tìm kiếm|Mã vai trò|Tên vai trò|Danh sách vai trò|Thao tác/i], 'Mở module nhưng không thấy nội dung Quản lý vai trò');
}

async function clickAction(patterns, page, timeout = 4000) {
  const locators = patterns.flatMap((pattern) => [
    page.getByRole('button', { name: pattern }).first(),
    page.getByText(pattern, { exact: false }).first(),
  ]);
  return clickFirstVisible(page, locators, timeout);
}

async function openAddRoleForm(page) {
  const opened = await clickAction([/Thêm mới/i, /Thêm vai trò/i, /Tạo vai trò/i], page);
  if (!opened) await failWithContext(page, 'Không thấy nút Thêm mới/Thêm vai trò trên màn Quản lý vai trò.');
  await page.waitForTimeout(800);
  const overlay = page.locator('.ant-drawer:visible, .ant-modal:visible').first();
  if (!await overlay.isVisible().catch(() => false)) {
    await failWithContext(page, 'Click Thêm vai trò nhưng không mở drawer/modal thêm vai trò.');
  }
  return overlay;
}

async function saveForm(page) {
  const scope = page.locator('.ant-drawer:visible, .ant-modal:visible').last();
  const root = await scope.isVisible().catch(() => false) ? scope : page;
  const clicked = await clickFirstVisible(page, [
    root.getByRole('button', { name: /Xác nhận/i }).last(),
    root.getByRole('button', { name: /^Lưu$/i }).last(),
    root.getByRole('button', { name: /^Thêm$/i }).last(),
  ], 4000);
  if (!clicked) await failWithContext(page, 'Không thấy nút Xác nhận/Lưu trên form vai trò.');
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function fillFirstVisibleInputByHints(page, hints, value, fallbackIndex = 0, root = page) {
  const fields = root.locator('input:visible:not([readonly]):not([disabled]), textarea:visible:not([readonly]):not([disabled])');
  for (let i = 0; i < await fields.count(); i++) {
    const field = fields.nth(i);
    const placeholder = (await field.getAttribute('placeholder').catch(() => '')) || '';
    const id = (await field.getAttribute('id').catch(() => '')) || '';
    const aria = (await field.getAttribute('aria-label').catch(() => '')) || '';
    const haystack = `${placeholder} ${id} ${aria}`.toLowerCase();
    if (hints.some((hint) => haystack.includes(String(hint).toLowerCase()))) {
      await field.fill(value);
      return;
    }
  }
  if (await fields.nth(fallbackIndex).isVisible().catch(() => false)) {
    await fields.nth(fallbackIndex).fill(value);
    return;
  }
  await failWithContext(page, `Không tìm thấy input để nhập giá trị ${value}.`);
}

async function chooseFirstSelectOption(page, root = page) {
  const select = root.locator('.ant-select:visible').first();
  if (!await select.isVisible().catch(() => false)) return;
  await select.click({ force: true });
  await page.waitForTimeout(500);
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option-content').first();
  if (await option.isVisible().catch(() => false)) await option.click();
  await page.keyboard.press('Escape').catch(() => {});
}

async function fillRoleForm(page, code, name) {
  const overlay = page.locator('.ant-drawer:visible, .ant-modal:visible').last();
  const root = await overlay.isVisible().catch(() => false) ? overlay : page;
  await fillFirstVisibleInputByHints(page, ['Mã vai trò', 'mã vai trò', 'nhập mã'], code, 0, root);
  await fillFirstVisibleInputByHints(page, ['Tên vai trò', 'tên vai trò', 'nhập tên'], name, 1, root);
  await chooseFirstSelectOption(page, root);
  const textarea = root.locator('textarea:visible').last();
  if (await textarea.isVisible().catch(() => false)) {
    await textarea.fill(`Mô tả tự động ${code}`);
  }
}

async function searchRole(page, keyword) {
  const search = page.locator('input:visible').filter({ hasText: /./ }).first();
  const inputs = page.locator('input:visible');
  let target = null;
  for (let i = 0; i < await inputs.count(); i++) {
    const input = inputs.nth(i);
    const placeholder = await input.getAttribute('placeholder').catch(() => '');
    if (/Tìm kiếm|tìm kiếm|Mã|Tên|vai trò/i.test(placeholder || '')) {
      target = input;
      break;
    }
  }
  if (!target) target = search;
  await expect(target).toBeVisible();
  await target.fill(keyword);
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function firstRoleRow(page, keyword = ROLE_CODE) {
  await searchRole(page, keyword);
  const row = page.locator('tr, .ant-table-row, [role="row"]').filter({ hasText: keyword }).first();
  if (await row.isVisible().catch(() => false)) return row;
  return page.locator('tr, .ant-table-row, [role="row"]').first();
}

async function expectRoleInList(page, keyword) {
  await searchRole(page, keyword);
  const text = await visibleText(page, 6000);
  if (!text.includes(keyword)) {
    await failWithContext(page, `Không thấy vai trò ${keyword} trong danh sách sau thao tác.`);
  }
}

async function roleExists(page, keyword) {
  await searchRole(page, keyword);
  const text = await visibleText(page, 6000);
  return text.includes(keyword);
}

async function ensureRoleExists(page) {
  if (await roleExists(page, ROLE_CODE)) return;
  await openAddRoleForm(page);
  await fillRoleForm(page, ROLE_CODE, ROLE_NAME);
  await saveForm(page);
  await expectRoleInList(page, ROLE_CODE);
}

async function ensureRoleUpdatedExists(page) {
  if (await roleExists(page, ROLE_NAME_UPDATED)) return;
  await ensureRoleExists(page);
  const row = await firstRoleRow(page, ROLE_CODE);
  await openRowAction(page, row, [/Chỉnh sửa|Cập nhật|Sửa/i]);
  const overlay = page.locator('.ant-drawer:visible, .ant-modal:visible').last();
  const root = await overlay.isVisible().catch(() => false) ? overlay : page;
  await fillFirstVisibleInputByHints(page, ['Tên vai trò', 'tên vai trò', 'nhập tên'], ROLE_NAME_UPDATED, 1, root);
  await chooseFirstSelectOption(page, root);
  await saveForm(page);
  await expectRoleInList(page, ROLE_NAME_UPDATED);
}

async function clickVisibleIcon(page, root, selectors) {
  for (const selector of selectors) {
    const icon = root.locator(selector).filter({ visible: true }).first();
    if (await icon.isVisible().catch(() => false)) {
      await icon.click({ force: true });
      await page.waitForTimeout(800);
      return true;
    }
  }
  return false;
}

async function openRowAction(page, row, patterns) {
  const patternText = patterns.map((p) => p.source || String(p)).join(' ');
  const iconButtons = row.locator('button, a, .anticon, svg').filter({ visible: true });
  if (/Chỉnh sửa|Cập nhật|Sửa/i.test(patternText)) {
    if (await clickVisibleIcon(page, row, ['[aria-label="edit"]', '.anticon-edit', 'svg[data-icon="edit"]'])) return;
    if (await clickVisibleIcon(page, page, ['[aria-label="edit"]', '.anticon-edit', 'svg[data-icon="edit"]'])) return;
    if (await iconButtons.nth(0).isVisible().catch(() => false)) {
      await iconButtons.nth(0).click({ force: true });
      await page.waitForTimeout(800);
      return;
    }
  }
  if (/Gán quyền|Phân quyền|Quyền/i.test(patternText)) {
    const linkSelectors = ['[aria-label="link"]', '.anticon-link', 'svg[data-icon="link"]', '[aria-label="paper-clip"]', '.anticon-paper-clip', 'svg[data-icon="paper-clip"]'];
    if (await clickVisibleIcon(page, row, linkSelectors)) return;
    if (await clickVisibleIcon(page, page, linkSelectors)) return;
    if (await iconButtons.nth(1).isVisible().catch(() => false)) {
      await iconButtons.nth(1).click({ force: true });
      await page.waitForTimeout(800);
      return;
    }
  }
  if (/Xóa|Xoá/i.test(patternText)) {
    const deleteSelectors = ['[aria-label="delete"]', '.anticon-delete', 'svg[data-icon="delete"]', '[aria-label="close"]', '.anticon-close', 'svg[data-icon="close"]'];
    if (await clickVisibleIcon(page, row, deleteSelectors)) return;
    if (await clickVisibleIcon(page, page, deleteSelectors)) return;
    if (await iconButtons.nth(2).isVisible().catch(() => false)) {
      await iconButtons.nth(2).click({ force: true });
      await page.waitForTimeout(800);
      return;
    }
  }

  const opened = await clickFirstVisible(page, [
    ...patterns.map((pattern) => row.getByText(pattern, { exact: false }).first()),
    ...patterns.map((pattern) => row.getByRole('button', { name: pattern }).first()),
    row.locator('button').last(),
  ], 4000);
  if (!opened) await failWithContext(page, `Không mở được thao tác dòng: ${patterns.map((p) => p.source).join(' / ')}`);
  await page.waitForTimeout(800);
}

test.describe('VNPost - Phân quyền vai trò', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectAdminScope(page);
  });

  test('PVT-001 Mở màn Quản lý vai trò', async ({ page }) => {
    await openRoleModule(page);
    await expectAnyText(page, [/Thêm mới|Tìm kiếm|Mã vai trò|Tên vai trò|Danh sách vai trò|Thao tác/i]);
  });

  test('PVT-002 Kiểm tra control chính trên danh sách vai trò', async ({ page }) => {
    await openRoleModule(page);
    await expectAnyText(page, [/Thêm mới|Thêm vai trò|Tìm kiếm|Mã vai trò|Tên vai trò|Thao tác/i]);
  });

  test('PVT-003 Mở form Thêm vai trò và kiểm tra trường bắt buộc', async ({ page }) => {
    await openRoleModule(page);
    await openAddRoleForm(page);
    await expectAnyText(page, [/Mã vai trò|Tên vai trò|Phạm vi|Mô tả|Xác nhận|Hủy/i]);
  });

  test('PVT-004 Thêm vai trò - validate form rỗng', async ({ page }) => {
    await openRoleModule(page);
    await openAddRoleForm(page);
    await saveForm(page);
    await expectAnyText(page, [/Vui lòng|không được để trống|bắt buộc|required/i], 'Không thấy validation khi lưu form rỗng');
  });

  test('PVT-005 Thêm vai trò hợp lệ', async ({ page }) => {
    await openRoleModule(page);
    await openAddRoleForm(page);
    await fillRoleForm(page, ROLE_CODE, ROLE_NAME);
    await saveForm(page);
    await expectAnyText(page, [/thành công|tạo mới|Thêm vai trò|Vai trò/i]);
    await expectRoleInList(page, ROLE_CODE);
  });

  test('PVT-006 Tìm kiếm vai trò theo mã/tên', async ({ page }) => {
    await openRoleModule(page);
    await ensureRoleExists(page);
    await expectRoleInList(page, ROLE_CODE);
  });

  test('PVT-007 Cập nhật tên/phạm vi vai trò', async ({ page }) => {
    await openRoleModule(page);
    await ensureRoleExists(page);
    const row = await firstRoleRow(page, ROLE_CODE);
    await openRowAction(page, row, [/Chỉnh sửa|Cập nhật|Sửa/i]);
    const overlay = page.locator('.ant-drawer:visible, .ant-modal:visible').last();
    const root = await overlay.isVisible().catch(() => false) ? overlay : page;
    await fillFirstVisibleInputByHints(page, ['Tên vai trò', 'tên vai trò', 'Nhập tên'], ROLE_NAME_UPDATED, 1, root);
    await chooseFirstSelectOption(page, root);
    await saveForm(page);
    await expectRoleInList(page, ROLE_NAME_UPDATED);
  });

  test('PVT-008 Mở màn gán quyền chức năng cho vai trò', async ({ page }) => {
    await openRoleModule(page);
    await ensureRoleUpdatedExists(page);
    const row = await firstRoleRow(page, ROLE_NAME_UPDATED);
    await openRowAction(page, row, [/Gán quyền|Phân quyền|Quyền/i]);
    await expectAnyText(page, [/Phân quyền chức năng|Danh sách chức năng|Chức năng|Xác nhận|Hủy/i]);
  });

  test('PVT-009 Tick quyền chức năng và hủy', async ({ page }) => {
    await openRoleModule(page);
    await ensureRoleUpdatedExists(page);
    const row = await firstRoleRow(page, ROLE_NAME_UPDATED);
    await openRowAction(page, row, [/Gán quyền|Phân quyền|Quyền/i]);
    const checkbox = page.locator('.ant-checkbox-input:visible').first();
    await expect(checkbox).toBeVisible();
    await checkbox.click({ force: true });
    const canceled = await clickFirstVisible(page, [
      page.getByRole('button', { name: /Hủy|Huỷ/i }).last(),
      page.locator('.ant-drawer-close, .ant-modal-close').last(),
    ], 4000);
    if (!canceled) await failWithContext(page, 'Không hủy được màn gán quyền chức năng.');
    await expectAnyText(page, [/Quản lý vai trò|Vai trò|Danh sách/i]);
  });

  test('PVT-010 Tick quyền chức năng và xác nhận', async ({ page }) => {
    await openRoleModule(page);
    await ensureRoleUpdatedExists(page);
    const row = await firstRoleRow(page, ROLE_NAME_UPDATED);
    await openRowAction(page, row, [/Gán quyền|Phân quyền|Quyền/i]);
    const checkbox = page.locator('.ant-checkbox-input:visible').first();
    await expect(checkbox).toBeVisible();
    await checkbox.click({ force: true });
    await saveForm(page);
    await expectAnyText(page, [/thành công|đã lưu|Phân quyền|Vai trò/i]);
  });

  test('PVT-011 Hủy thao tác xóa vai trò', async ({ page }) => {
    await openRoleModule(page);
    await ensureRoleUpdatedExists(page);
    const row = await firstRoleRow(page, ROLE_NAME_UPDATED);
    await openRowAction(page, row, [/Xóa|Xoá/i]);
    await expectAnyText(page, [/Bạn có muốn xóa vai trò này không|Đồng ý|Hủy|Xác nhận/i]);
    await clickFirstVisible(page, [
      page.getByRole('button', { name: /Hủy|Huỷ/i }).last(),
      page.locator('.ant-modal-confirm-btns button').first(),
    ], 4000);
    await expectRoleInList(page, ROLE_NAME_UPDATED);
  });

  test('PVT-012 Xóa vai trò vừa tạo', async ({ page }) => {
    await openRoleModule(page);
    await ensureRoleUpdatedExists(page);
    const row = await firstRoleRow(page, ROLE_NAME_UPDATED);
    await openRowAction(page, row, [/Xóa|Xoá/i]);
    await clickFirstVisible(page, [
      page.getByRole('button', { name: /Đồng ý|Xác nhận|OK/i }).last(),
      page.locator('.ant-modal-confirm-btns button').last(),
    ], 4000);
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await searchRole(page, ROLE_NAME_UPDATED);
    const text = await visibleText(page, 6000);
    if (text.includes(ROLE_NAME_UPDATED)) {
      await failWithContext(page, `Đã xác nhận xóa nhưng vai trò ${ROLE_NAME_UPDATED} vẫn còn trong danh sách.`);
    }
  });
});
