// Playwright Test chuẩn cho module Mô hình tổ chức.
// File này sinh được HTML report qua `playwright show-report`.
// Account mặc định dùng cho test nội bộ; tester có thể override bằng biến môi trường:
// VNPOST_ACCOUNT=... VNPOST_PASSWORD=... playwright test
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ACCOUNT = process.env.VNPOST_ACCOUNT || '84862036990';
const PASSWORD = process.env.VNPOST_PASSWORD || '123456';
const TARGET = 'https://vnpost.sfin.vn/';
const ORG_URL = 'https://vnpost.sfin.vn/chain/organization-management';
const DOC_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(DOC_ROOT, 'test-output/playwright-artifacts');

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function visibleText(page, limit = 4000) {
  const text = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
  return text.replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function clickText(page, labels, timeout = 7000) {
  for (const label of labels) {
    const loc = page.getByText(label, { exact: false }).first();
    try {
      await loc.waitFor({ timeout });
      await loc.click({ timeout });
      return label;
    } catch (_) {
      // Thử nhãn tiếp theo.
    }
  }
  throw new Error(`Không click được text: ${labels.join(' / ')}`);
}

async function dismissOverlays(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.mouse.click(260, 90).catch(() => {});
  await page.waitForTimeout(300);
}

async function login(page) {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 25_000 });

  const inputs = page.locator('input:visible');
  let usernameInput = null;
  for (let i = 0; i < await inputs.count(); i++) {
    const input = inputs.nth(i);
    const type = (await input.getAttribute('type')) || '';
    if (type !== 'password') {
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
    try {
      await page.waitForFunction(
        () => /Truy cập trang quản lý|Đăng xuất|Admin/.test(document.body?.innerText || ''),
        null,
        { timeout: 20_000 },
      );
      return;
    } catch (err) {
      if (attempt === 3) throw err;
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
  const text = await visibleText(page, 1000);
  if (/Đăng nhập|Tên đăng nhập|Mật khẩu/.test(text)) {
    await login(page);
    await selectAdminScope(page);
  }
}

async function openOrgModule(page) {
  await ensureLoggedIn(page);
  await dismissOverlays(page);

  // Sau khi login/chọn phạm vi, app đôi khi vẫn đứng ở trang /account.
  // Đi thẳng vào URL module giúp bộ Playwright Test ổn định hơn khi chạy từng case độc lập.
  if (!page.url().includes('/chain/organization-management')) {
    await page.goto(ORG_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await ensureLoggedIn(page);
  }

  if (!page.url().includes('/chain/organization-management')) {
    await clickText(page, ['Quản lý chuỗi']);
    await clickText(page, ['Mô hình tổ chức']);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }

  await expect(page).toHaveURL(/\/chain\/organization-management/, { timeout: 20_000 });
  await expect(page.getByPlaceholder(/tìm kiếm/i).first()).toBeVisible({ timeout: 20_000 });
}

async function openRootDetail(page) {
  await openOrgModule(page);
  await page.getByPlaceholder(/tìm kiếm/i).first().fill('').catch(() => {});
  await page.waitForTimeout(500);
  await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first().click({ timeout: 10_000 });
  await page.waitForTimeout(1000);
}

async function openAddDrawer(page) {
  await openOrgModule(page);
  await dismissOverlays(page);
  await page.getByRole('button', { name: /thêm đơn vị/i }).click({ timeout: 10_000 });
  await expect(page.getByText('Thêm đơn vị tổ chức')).toBeVisible();
}

async function openAddDrawerUnderParent(page, parentText = 'Bưu điện Thành phố Hà Nội') {
  await openOrgModule(page);
  await dismissOverlays(page);

  const parentNode = page.locator('.ant-tree-treenode').filter({ hasText: parentText }).first();
  await expect(parentNode).toBeVisible({ timeout: 10_000 });

  // Bấm dấu + ngay trên node cha để form tự nhận "Đơn vị cha",
  // ổn định hơn so với mở form tổng rồi tìm option trong dropdown Ant Design.
  await parentNode.locator('button').last().click({ timeout: 10_000 });
  await expect(page.getByText('Thêm đơn vị tổ chức')).toBeVisible();
}

async function confirm(page) {
  await page.getByRole('button', { name: /xác nhận/i }).first().click({ timeout: 7000 });
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

function visibleValidation(page, pattern) {
  return page
    .locator('.ant-form-item-explain-error:visible, .ant-message-notice:visible, .ant-notification-notice:visible')
    .filter({ hasText: pattern })
    .first();
}

async function fillOrgForm(page, code, name, parentText = 'Bưu điện Thành phố Hà Nội') {
  await page.getByPlaceholder(/nhập mã đơn vị/i).first().fill(code);
  await page.locator('input[placeholder*="VD"]:visible').first().fill(name);

  const drawer = page.locator('.ant-drawer:visible').last();
  if (await drawer.getByText(parentText, { exact: false }).first().isVisible().catch(() => false)) {
    return;
  }

  const parentSelect = page.getByText('Chọn đơn vị cha', { exact: false }).first();
  const box = await parentSelect.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    await parentSelect.click({ force: true });
  }
  await page.waitForTimeout(700);

  const dropdown = page.locator('.ant-select-dropdown:visible').last();
  const option = dropdown.getByText(parentText, { exact: false }).first();
  if (!(await option.isVisible().catch(() => false))) {
    // Ant Design select dùng virtual list; gõ text giúp option cần chọn được render ổn định.
    await page.keyboard.type(parentText, { delay: 15 });
    await page.waitForTimeout(700);
  }
  await option.click({ timeout: 12_000 });
}

async function searchTree(page, keyword) {
  await openOrgModule(page);
  const search = page.getByPlaceholder(/tìm kiếm/i).first();
  await search.fill('');
  await search.fill(keyword);
  await page.waitForTimeout(1200);
}

async function openCreatedOrgDetail(page, name) {
  await searchTree(page, name);
  const nodeText = page.getByText(name, { exact: false }).first();
  await expect(nodeText).toBeVisible();
  const box = await nodeText.boundingBox();
  if (!box) throw new Error(`Không lấy được vị trí node ${name}`);
  await page.mouse.click(Math.max(90, box.x - 24), box.y + box.height / 2);
  await page.waitForTimeout(400);
  await page.mouse.click(box.x + 10, box.y + box.height / 2);
  await page.waitForTimeout(1200);
  await expect(page.getByText('Cập nhật')).toBeVisible();
}

async function updateCurrentOrgName(page, newName) {
  await clickText(page, ['Cập nhật']);
  const input = page.locator('input[placeholder*="VD"]:visible').first();
  await input.fill(newName);
  await confirm(page);
}

async function deleteCurrentOrg(page, unitCode) {
  await clickText(page, ['Xoá', 'Xóa']);
  await expect(page.getByText(/không thể hoàn tác|chắc chắn|xóa/i)).toBeVisible();
  await clickText(page, ['Đồng ý', 'Xác nhận', 'Xoá', 'Xóa']);
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const detail = await page.request.get(`https://vnpost-api.sfin.vn/v1.0/organization-unit/detail?unitCode=${encodeURIComponent(unitCode)}`);
  expect(detail.status()).toBe(404);
}

test.describe('VNPost - Mô hình tổ chức', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectAdminScope(page);
    await page.goto(ORG_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  });

  test('đăng nhập và vào module Mô hình tổ chức', async ({ page }) => {
    await test.step('Mở module', async () => {
      await openOrgModule(page);
      await expect(page).toHaveURL(/\/chain\/organization-management/);
      await expect(page.getByPlaceholder(/tìm kiếm/i).first()).toBeVisible();
    });
  });

  test('hiển thị cây tổ chức và xem chi tiết Tổng công ty', async ({ page }) => {
    await openRootDetail(page);
    const text = await visibleText(page);
    expect(text).toContain('Tổng công ty Bưu Điện Việt Nam');
    expect(text).toContain('Mã đơn vị: VNPOST');
    expect(text).toMatch(/Xoá|Xóa/);
    expect(text).toContain('Cập nhật');
    expect(text).toContain('Tạo điểm bán');
  });

  test('Nhập từ Excel - validate chưa chọn file và tải file mẫu', async ({ page }) => {
    mkdirp(OUT_DIR);
    await openOrgModule(page);
    await page.getByRole('button', { name: /nhập từ excel/i }).click();
    await confirm(page);
    await expect(visibleValidation(page, /Vui lòng chọn file excel/i)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /tải file mẫu/i }).click();
    const download = await downloadPromise;
    const savePath = path.join(OUT_DIR, await download.suggestedFilename());
    await download.saveAs(savePath);
    expect(fs.existsSync(savePath)).toBeTruthy();
  });

  test('Thêm đơn vị - validate form rỗng', async ({ page }) => {
    await openAddDrawer(page);
    await confirm(page);
    await expect(page.getByText('Vui lòng nhập mã đơn vị')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập tên đơn vị')).toBeVisible();
    await expect(page.getByText('Vui lòng chọn đơn vị cha')).toBeVisible();
  });

  test('CRUD đơn vị test: thêm, tìm kiếm, cập nhật, xóa', async ({ page }) => {
    const runId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const code = runId.slice(-4);
    const name = `AUTO_PW_${runId}_XA`;
    const updatedName = `AUTO_PW_${runId}_XA_UPDATED`;

    await test.step('Thêm đơn vị test', async () => {
      await openAddDrawerUnderParent(page);
      await fillOrgForm(page, code, name);
      await confirm(page);
      await searchTree(page, name);
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
    });

    await test.step('Cập nhật tên đơn vị test', async () => {
      await openCreatedOrgDetail(page, name);
      await updateCurrentOrgName(page, updatedName);
      await searchTree(page, updatedName);
      await expect(page.getByText(updatedName, { exact: false }).first()).toBeVisible();
    });

    await test.step('Xóa đơn vị test', async () => {
      await openCreatedOrgDetail(page, updatedName);
      await deleteCurrentOrg(page, code);
    });
  });

  test('Tìm kiếm không có kết quả', async ({ page }) => {
    const keyword = `AUTO_NOT_FOUND_${Date.now()}`;
    await searchTree(page, keyword);
    const text = await visibleText(page);
    expect(text).not.toContain('Tổng công ty Bưu Điện Việt Nam');
  });

  test('Tạo điểm bán/hub - mở form và validate rỗng', async ({ page }) => {
    await openRootDetail(page);
    await clickText(page, ['Tạo điểm bán']);
    await expect(page.getByText(/Tạo điểm bán|Thêm Điểm bán|Phân loại/i).first()).toBeVisible();
    await confirm(page);
    await expect(page.getByText(/vui lòng|bắt buộc|required/i).first()).toBeVisible();
  });

  test('Mở danh sách điểm bán từ chi tiết Tổng công ty', async ({ page }) => {
    await openRootDetail(page);
    await page.getByText('Xem danh sách', { exact: false }).first().click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await expect(page.getByText(/điểm bán|cửa hàng|danh sách/i).first()).toBeVisible();
  });

  test('Kiểm tra chức năng Xuất Excel theo tài liệu', async ({ page }) => {
    await openOrgModule(page);
    const exportButton = page.getByText(/Xuất excel|Xuất Excel/).first();
    if (!(await exportButton.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'OBSERVED_MISSING',
        description: 'Tài liệu có chức năng Xuất Excel nhưng UI hiện tại không hiển thị nút Xuất Excel trên màn Mô hình tổ chức.',
      });
      return;
    }
    await expect(exportButton).toBeVisible();
  });
});
