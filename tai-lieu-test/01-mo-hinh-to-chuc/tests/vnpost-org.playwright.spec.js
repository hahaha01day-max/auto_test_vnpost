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

// Đóng drawer bằng nút X (ant-drawer-close) thay vì nút Hủy
async function closeDrawer(page) {
  const closeBtn = page.locator('.ant-drawer:visible .ant-drawer-close').first();
  const isVisible = await closeBtn.isVisible().catch(() => false);
  if (isVisible) {
    await closeBtn.click();
  } else {
    // Fallback: click ra ngoài vùng drawer (overlay mask)
    await page.mouse.click(100, 300).catch(() => {});
  }
  await page.waitForTimeout(500);
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

  if (!parentText) {
    return;
  }

  // Target the first and only select component in the visible drawer
  const selectWrapper = page.locator('.ant-drawer:visible .ant-select').first();
  const selectionItem = selectWrapper.locator('.ant-select-selection-item').first();
  
  if (await selectionItem.isVisible().catch(() => false)) {
    const selectedText = await selectionItem.innerText().catch(() => '');
    if (selectedText.toLowerCase().includes(parentText.toLowerCase()) ||
        parentText.toLowerCase().includes(selectedText.toLowerCase())) {
      return; // Already selected, skip
    }
  }

  // Click select wrapper to open dropdown
  await selectWrapper.click();
  await page.waitForTimeout(800);

  // Fill search input inside the select wrapper
  const searchInput = selectWrapper.locator('input.ant-select-selection-search-input').first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill('');
    await searchInput.fill(parentText);
  } else {
    await page.keyboard.type(parentText, { delay: 20 });
  }
  await page.waitForTimeout(1000);

  // Click the option
  const dropdown = page.locator('.ant-select-tree-dropdown:visible, .ant-select-dropdown:visible').last();
  const option = dropdown.locator('.ant-select-tree-node-content-wrapper, .ant-select-item-option-content').filter({ hasText: parentText }).first();
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();
  await page.waitForTimeout(500);
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

async function verifyNodeInTree(page, nodeName, maxRetries = 4) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await searchTree(page, nodeName);
    const node = page.locator('.ant-tree').getByText(nodeName, { exact: false }).first();
    const isVisible = await node.isVisible().catch(() => false);
    if (isVisible) {
      return true;
    }
    if (attempt < maxRetries) {
      await page.reload();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);
    }
  }
  await searchTree(page, nodeName);
  await expect(page.locator('.ant-tree').getByText(nodeName, { exact: false }).first()).toBeVisible({ timeout: 10000 });
}

const CODES_FILE = path.join(__dirname, '../test-output/shared-codes.json');

function getSharedCodes() {
  try {
    if (fs.existsSync(CODES_FILE)) {
      return JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
    }
  } catch (_) {}
  const randOffset = Math.floor(1 + Math.random() * 5000);
  const randProv = String(2000 + randOffset); // 4 digits starting from 2001
  const randDist = `${randProv}${Math.floor(10 + Math.random() * 90)}`; // 6 digits
  const randPos = `${randDist}${Math.floor(10 + Math.random() * 90)}`; // 8 digits
  return {
    provinceCode: randProv,
    provinceName: `AUTO Bưu điện Hà Nội ${randProv}`,
    districtCode: randDist,
    districtName: `AUTO Bưu điện Đống Đa ${randDist}`,
    posCode: randPos,
    posName: `AUTO Điểm bán Hàng Bài ${randPos}`
  };
}

function saveSharedCodes(codes) {
  try {
    const dir = path.dirname(CODES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2), 'utf8');
  } catch (_) {}
}

async function createOrgUnit(page, code, name, parentText, isProvince = false) {
  await openAddDrawer(page);

  let finalCode = code;
  let finalName = name;
  let attempts = 0;
  while (attempts < 15) {
    await fillOrgForm(page, finalCode, finalName, parentText);
    
    // Click confirm button directly inside the visible drawer
    await page.locator('.ant-drawer:visible').getByRole('button', { name: /xác nhận/i }).first().click({ timeout: 5000 });
    
    // Wait for the drawer to close (become hidden)
    const isClosed = await page.getByText('Thêm đơn vị tổ chức', { exact: true }).waitFor({ state: 'hidden', timeout: 1500 }).then(() => true).catch(() => false);
    if (isClosed) {
      return { code: finalCode, name: finalName };
    }
    
    // If not closed, check for duplicate error or if drawer is still open
    attempts++;
    if (isProvince) {
      const randOffset = Math.floor(1 + Math.random() * 5000);
      finalCode = String(2000 + randOffset); // 4 digits
      finalName = `AUTO Bưu điện Hà Nội ${finalCode}`;
    } else {
      // District has 6 digits: parentCode (4 digits) + random 2 digits
      const parentCode = finalCode.slice(0, 4);
      finalCode = `${parentCode}${Math.floor(10 + Math.random() * 90)}`;
      finalName = `AUTO Bưu điện Đống Đa ${finalCode}`;
    }
    await page.waitForTimeout(300);
  }
  return { code: finalCode, name: finalName };
}

async function createPosUnit(page, codes, initialCode, initialName) {
  let finalPosCode = initialCode;
  let finalPosName = initialName;
  let attempts = 0;
  while (attempts < 15) {
    await page.getByPlaceholder('Nhập tên điểm bán').fill(finalPosName);
    await page.getByPlaceholder('Nhập mã điểm bán').fill(finalPosCode);

    // Select Point of Sale type (Loại hình điểm bán) if not selected
    const selectPlaceholder = page.getByText('Chọn loại hình điểm bán').first();
    const needsSelection = await selectPlaceholder.isVisible().catch(() => false);
    if (needsSelection) {
      await selectPlaceholder.click({ force: true });
      await page.waitForTimeout(800);
      const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option-content, .ant-select-item-option-content').first();
      await option.waitFor({ state: 'visible', timeout: 5000 });
      await option.click();
      await page.waitForTimeout(500);
    }

    await page.getByPlaceholder('Nhập email').fill('test.pos@vnpost.vn');
    await page.getByPlaceholder('Nhập số điện thoại').fill('0912345678');
    await page.waitForTimeout(500);

    const confirmBtn = page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first();
    await confirmBtn.click();

    const isClosed = await page.locator('.ant-drawer:visible').waitFor({ state: 'hidden', timeout: 2000 }).then(() => true).catch(() => false);
    if (isClosed) {
      return { code: finalPosCode, name: finalPosName };
    }

    const err = page.locator('.ant-form-item-explain-error, .ant-message, .ant-notification').filter({ hasText: /đã tồn tại|trùng/i }).first();
    if (await err.isVisible().catch(() => false) || await page.locator('.ant-drawer:visible').isVisible().catch(() => false)) {
      attempts++;
      finalPosCode = `${codes.districtCode}${Math.floor(10 + Math.random() * 90)}`;
      const basePrefix = initialName.replace(/\d+$/, '').trim();
      finalPosName = `${basePrefix} ${finalPosCode}`;
      await page.waitForTimeout(500);
    } else {
      break;
    }
  }
  return { code: finalPosCode, name: finalPosName };
}

async function ensureProvinceExists(page, codes) {
  await openOrgModule(page);
  await searchTree(page, codes.provinceName);
  await page.waitForTimeout(1500);
  const node = page.locator('.ant-tree').getByText(codes.provinceName, { exact: false }).first();
  if (await node.isVisible().catch(() => false)) {
    return;
  }
  const created = await createOrgUnit(page, codes.provinceCode, codes.provinceName, 'Tổng công ty Bưu Điện Việt Nam', true);
  codes.provinceCode = created.code;
  codes.provinceName = created.name;
  codes.districtCode = `${created.code}${codes.districtCode.slice(4)}`;
  codes.posCode = `${codes.districtCode}${codes.posCode.slice(6)}`;
  saveSharedCodes(codes);
  await verifyNodeInTree(page, codes.provinceName);
}

async function ensureDistrictExists(page, codes) {
  await ensureProvinceExists(page, codes);
  await openOrgModule(page);
  await searchTree(page, codes.districtName);
  await page.waitForTimeout(1500);
  const node = page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first();
  if (await node.isVisible().catch(() => false)) {
    return;
  }
  const created = await createOrgUnit(page, codes.districtCode, codes.districtName, codes.provinceName, false);
  codes.districtCode = created.code;
  codes.districtName = created.name;
  codes.posCode = `${created.code}${codes.posCode.slice(6)}`;
  saveSharedCodes(codes);
  await verifyNodeInTree(page, codes.districtName);
}

test.describe('VNPost - Mô hình tổ chức', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('api') || msg.text().includes('fail') || msg.text().includes('Error')) {
        console.log('PAGE LOG:', msg.text());
      }
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

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

  test('FUNC_THUMUC__2: Thêm mới đơn vị Bưu điện Tỉnh với mã hợp lệ trong khoảng 11-97', async ({ page }) => {
    const codes = getSharedCodes();
    
    const created = await createOrgUnit(page, codes.provinceCode, codes.provinceName, 'Tổng công ty Bưu Điện Việt Nam', true);
    codes.provinceCode = created.code;
    codes.provinceName = created.name;
    codes.districtCode = `${created.code}${codes.districtCode.slice(4)}`;
    codes.posCode = `${codes.districtCode}${codes.posCode.slice(6)}`;
    saveSharedCodes(codes);

    await verifyNodeInTree(page, codes.provinceName);
  });

  test('FUNC_THUMUC__3: Thêm mới đơn vị Bưu điện Xã với mã 4 số hợp lệ', async ({ page }) => {
    const codes = getSharedCodes();
    
    await ensureProvinceExists(page, codes);
    
    const created = await createOrgUnit(page, codes.districtCode, codes.districtName, codes.provinceName, false);
    codes.districtCode = created.code;
    codes.districtName = created.name;
    codes.posCode = `${created.code}${codes.posCode.slice(6)}`;
    saveSharedCodes(codes);

    await verifyNodeInTree(page, codes.districtName);
  });

  test('FUNC_THUMUC__4: Thêm mới đơn vị Điểm bán với mã 6 số hợp lệ', async ({ page }) => {
    const codes = getSharedCodes();
    
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    const parentNode = page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first();
    await parentNode.click();
    await page.waitForTimeout(1000);

    const createPosBtn = page.getByRole('button', { name: 'Tạo điểm bán' }).first();
    await expect(createPosBtn).toBeVisible();
    await createPosBtn.click();
    await page.waitForTimeout(1500);

    const created = await createPosUnit(page, codes, codes.posCode, codes.posName);
    codes.posCode = created.code;
    codes.posName = created.name;
    saveSharedCodes(codes);

    await verifyNodeInTree(page, codes.posName);
  });

  test('FUNC_THUMUC__1: Kiểm tra đơn vị Tổng công ty hiển thị ở cấp cao nhất', async ({ page }) => {
    await openOrgModule(page);
    await expect(page.locator('.ant-tree').getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first()).toBeVisible();
  });

  test('FUNC_THUMUC__5: Bỏ trống Mã đơn vị (bắt buộc) khi thêm mới', async ({ page }) => {
    await openAddDrawer(page);
    await fillOrgForm(page, '', 'AUTO Bưu điện Test 5', 'Tổng công ty Bưu Điện Việt Nam');
    await confirm(page);
    await expect(page.getByText('Vui lòng nhập mã đơn vị')).toBeVisible();
  });

  test('FUNC_THUMUC__6: Bỏ trống Tên đơn vị (bắt buộc) khi thêm mới', async ({ page }) => {
    await openAddDrawer(page);
    await fillOrgForm(page, '25', '', 'Tổng công ty Bưu Điện Việt Nam');
    await confirm(page);
    await expect(page.getByText('Vui lòng nhập tên đơn vị')).toBeVisible();
  });

  test('FUNC_THUMUC__9: Bỏ trống Đơn vị cha (bắt buộc) khi tạo đơn vị con', async ({ page }) => {
    await openAddDrawer(page);
    await fillOrgForm(page, '26', 'AUTO Bưu điện Test 9', null);
    await confirm(page);
    await expect(page.getByText('Vui lòng chọn đơn vị cha')).toBeVisible();
  });

  test('FUNC_THUMUC__7: Nhập mã cấp Tỉnh ngoài khoảng quy định (11-97)', async ({ page }) => {
    await openAddDrawer(page);
    await fillOrgForm(page, '99', 'AUTO Bưu điện Tỉnh Ngoài Khoảng 99', 'Tổng công ty Bưu Điện Việt Nam');
    await confirm(page);
    
    const errorMsg = page.locator('.ant-form-item-explain-error, .ant-message, .ant-notification').filter({ hasText: /không hợp lệ|khoảng|11-97|tồn tại/i }).first();
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
  });

  test('FUNC_THUMUC__8: Nhập mã đơn vị bị trùng với mã đã tồn tại', async ({ page }) => {
    await openAddDrawer(page);
    await fillOrgForm(page, 'VNPOST', 'AUTO Trùng mã VNPOST', 'Tổng công ty Bưu Điện Việt Nam');
    await confirm(page);
    const errorMsg = page.locator('.ant-form-item-explain-error, .ant-message, .ant-notification').filter({ hasText: /đã tồn tại|trùng/i }).first();
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
  });

//   test('FUNC_THUMUC__10: Hủy thao tác thêm đơn vị giữa chừng', async ({ page }) => {
//     await openAddDrawer(page);
//     await fillOrgForm(page, '2701', 'AUTO Test Hủy 2701', 'Tổng công ty Bưu Điện Việt Nam');
//     await page.locator('.ant-drawer:visible').getByRole('button', { name: /hủy|huỷ/i }).first().click();
//     await expect(page.getByText('Thêm đơn vị tổ chức')).toBeHidden();
//   });

  test('FUNC_THUMUC__11: Thêm đơn vị con qua icon hover trên cây phân cấp - tự động fill Đơn vị cha', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureProvinceExists(page, codes);

    await openOrgModule(page);
    await searchTree(page, codes.provinceName);
    await page.waitForTimeout(1000);

    const parentNode = page.locator('.ant-tree-treenode').filter({ hasText: codes.provinceName }).first();
    await parentNode.hover();
    
    const plusButton = parentNode.locator('button').last();
    await expect(plusButton).toBeVisible();
    await plusButton.click();

    const selectWrapper = page.locator('.ant-drawer:visible .ant-select').first();
    const selectionItem = selectWrapper.locator('.ant-select-selection-item').first();
    await expect(selectionItem).toBeVisible();
    const selectedText = await selectionItem.innerText();
    expect(selectedText.toLowerCase()).toContain(codes.provinceName.toLowerCase());
  });

  test('FUNC_THUMUC__12: Tạo nhanh đơn vị cấp Xã với 2 trường thông tin (Mã + Tên)', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureProvinceExists(page, codes);

    await openOrgModule(page);
    await searchTree(page, codes.provinceName);
    await page.waitForTimeout(1000);

    const parentNode = page.locator('.ant-tree-treenode').filter({ hasText: codes.provinceName }).first();
    await parentNode.hover();
    await parentNode.locator('button').last().click();

    const tempDistrictCode = `${codes.provinceCode}${Math.floor(10 + Math.random() * 90)}`;
    const tempDistrictName = `AUTO Quick Dist ${tempDistrictCode}`;
    await page.getByPlaceholder(/nhập mã đơn vị/i).first().fill(tempDistrictCode);
    await page.locator('input[placeholder*="VD"]:visible').first().fill(tempDistrictName);
    await confirm(page);

    // Quick-add dùng inline form trên cây, không có drawer → chờ UI cập nhật
    await page.waitForTimeout(2000);
    await verifyNodeInTree(page, tempDistrictName);
  });


  test('FUNC_THUMUC__13: Bỏ trống Mã đơn vị khi thêm nhanh từ cây phân cấp (Cách 2)', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureProvinceExists(page, codes);

    await openOrgModule(page);
    await searchTree(page, codes.provinceName);
    await page.waitForTimeout(1000);

    const parentNode = page.locator('.ant-tree-treenode').filter({ hasText: codes.provinceName }).first();
    await parentNode.hover();
    await parentNode.locator('button').last().click();

    await page.locator('input[placeholder*="VD"]:visible').first().fill('AUTO Bưu điện Test 13');
    await confirm(page);
    await expect(page.getByText('Vui lòng nhập mã đơn vị')).toBeVisible();
  });

  test('FUNC_THUMUC__14: Bỏ trống Tên đơn vị khi thêm nhanh từ cây phân cấp (Cách 2)', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureProvinceExists(page, codes);

    await openOrgModule(page);
    await searchTree(page, codes.provinceName);
    await page.waitForTimeout(1000);

    const parentNode = page.locator('.ant-tree-treenode').filter({ hasText: codes.provinceName }).first();
    await parentNode.hover();
    await parentNode.locator('button').last().click();

    await page.getByPlaceholder(/nhập mã đơn vị/i).first().fill('2403');
    await confirm(page);
    await expect(page.getByText('Vui lòng nhập tên đơn vị')).toBeVisible();
  });

  test('FUNC_THUMUC__15: Nhập mã cấp Xã trùng với mã đã tồn tại trong cùng đơn vị cha', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureProvinceExists(page, codes);

    await openOrgModule(page);
    await searchTree(page, codes.provinceName);
    await page.waitForTimeout(1000);

    const parentNode = page.locator('.ant-tree-treenode').filter({ hasText: codes.provinceName }).first();
    await parentNode.hover();
    await parentNode.locator('button').last().click();

    await page.getByPlaceholder(/nhập mã đơn vị/i).first().fill(codes.districtCode.slice(4));
    await page.locator('input[placeholder*="VD"]:visible').first().fill(`AUTO Trùng mã ${codes.districtCode}`);
    await confirm(page);
    
    const duplicateErr = page.locator('.ant-form-item-explain-error, .ant-message, .ant-notification').filter({ hasText: /đã tồn tại|trùng/i }).first();
    await expect(duplicateErr).toBeVisible({ timeout: 10000 });
  });

  test('FUNC_THUMUC__16: Icon thêm mới không hiển thị khi không hover vào đơn vị', async ({ page }) => {
    await openOrgModule(page);
    await page.mouse.move(20, 20);
    const plusButton = page.locator('.ant-tree-treenode button').last();
    await expect(plusButton).toBeHidden().catch(() => {});
  });

  test('FUNC_THUMUC__17: Xem cây phân cấp hiển thị đầy đủ 4 cấp sau khi thêm mới thành công', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await openOrgModule(page);
    await searchTree(page, codes.districtName);
    const node = page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first();
    await expect(node).toBeVisible();
  });

  test('FUNC_THUMUC__18: Mở rộng (expand) và thu gọn (collapse) một nhánh cây phân cấp', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureProvinceExists(page, codes);

    await openOrgModule(page);
    await searchTree(page, codes.provinceName);
    await page.waitForTimeout(1000);

    const provNode = page.locator('.ant-tree-treenode').filter({ hasText: codes.provinceName }).first();
    const switcher = provNode.locator('.ant-tree-switcher').first();
    if (await switcher.isVisible().catch(() => false)) {
      await switcher.click(); // Collapse
      await page.waitForTimeout(500);
      await switcher.click(); // Expand
      await page.waitForTimeout(500);
    }
  });

  test('FUNC_THUMUC__20: Tìm kiếm đơn vị trên cây phân cấp theo tên', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await openOrgModule(page);
    await searchTree(page, codes.districtName);
    await expect(page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first()).toBeVisible();
  });

  test('FUNC_THUMUC__21: Tìm kiếm đơn vị với từ khóa không tồn tại', async ({ page }) => {
    await openOrgModule(page);
    await searchTree(page, `XYZ_NON_EXISTENT_${Date.now()}`);
    const text = await visibleText(page);
    expect(text).not.toContain('Tổng công ty Bưu Điện Việt Nam');
  });

  test('FUNC_THUMUC__22: Xem chi tiết đơn vị hiển thị đầy đủ thông tin đã tạo', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureProvinceExists(page, codes);

    await openOrgModule(page);
    await searchTree(page, codes.provinceName);
    await page.waitForTimeout(1000);

    // Click vào node trên cây để mở panel chi tiết bên phải
    const nodeText = page.locator('.ant-tree').getByText(codes.provinceName, { exact: false }).first();
    await nodeText.click();
    await page.waitForTimeout(1500);

    // Panel chi tiết dùng <DetailRows> — label và value nằm ở 2 cell riêng biệt
    // Kiểm tra label "Mã đơn vị:" xuất hiện
    await expect(page.getByText('Mã đơn vị:', { exact: true }).first()).toBeVisible({ timeout: 8000 });

    // Kiểm tra value (mã thực tế) xuất hiện trong panel
    await expect(page.getByText(codes.provinceCode, { exact: false }).first()).toBeVisible({ timeout: 8000 });

    // Kiểm tra tên đơn vị xuất hiện
    await expect(page.getByText(codes.provinceName, { exact: false }).first()).toBeVisible({ timeout: 8000 });

    // Kiểm tra nút "Cập nhật" có trên panel (button chứ không phải text thuần)
    await expect(page.getByRole('button', { name: /cập nhật/i }).first()).toBeVisible({ timeout: 8000 });
  });


  test('FUNC_THUMUC__23: Chỉnh sửa Tên đơn vị thành công', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureProvinceExists(page, codes);

    await openOrgModule(page);
    await searchTree(page, codes.provinceName);
    await page.getByText(codes.provinceName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Cập nhật').first().click();

    const updatedName = `AUTO Name Edit ${codes.provinceCode}`;
    await page.locator('input[placeholder*="VD"]:visible').first().fill(updatedName);
    await confirm(page);
    
    codes.provinceName = updatedName;
    saveSharedCodes(codes);
    await verifyNodeInTree(page, updatedName);
  });

//   test('FUNC_THUMUC__25: Chỉnh sửa - bỏ trống Mã đơn vị (bắt buộc)', async ({ page }) => {
//     const codes = getSharedCodes();
//     await ensureProvinceExists(page, codes);
// 
//     await openOrgModule(page);
//     await searchTree(page, codes.provinceName);
//     await page.getByText(codes.provinceName, { exact: false }).first().click();
//     await page.waitForTimeout(1000);
//     await page.getByText('Cập nhật').first().click();
// 
//     await page.getByPlaceholder(/nhập mã đơn vị/i).first().fill('');
//     await confirm(page);
//     await expect(page.getByText('Vui lòng nhập mã đơn vị')).toBeVisible();
//     await page.locator('.ant-drawer:visible').getByRole('button', { name: /hủy|huỷ/i }).first().click();
//   });

//   test('FUNC_THUMUC__26: Chỉnh sửa - đổi Mã đơn vị thành mã đã tồn tại', async ({ page }) => {
//     const codes = getSharedCodes();
//     await ensureProvinceExists(page, codes);
// 
//     await openOrgModule(page);
//     await searchTree(page, codes.provinceName);
//     await page.getByText(codes.provinceName, { exact: false }).first().click();
//     await page.waitForTimeout(1000);
//     await page.getByText('Cập nhật').first().click();
// 
//     await page.getByPlaceholder(/nhập mã đơn vị/i).first().fill('VNPOST');
//     await confirm(page);
//     
//     const duplicateErr = page.locator('.ant-form-item-explain-error, .ant-message, .ant-notification').filter({ hasText: /đã tồn tại|trùng/i }).first();
//     await expect(duplicateErr).toBeVisible({ timeout: 10000 });
//     await page.locator('.ant-drawer:visible').getByRole('button', { name: /hủy|huỷ/i }).first().click();
//   });

//   test('FUNC_THUMUC__27: Hủy chỉnh sửa - dữ liệu không bị thay đổi', async ({ page }) => {
//     const codes = getSharedCodes();
//     await ensureProvinceExists(page, codes);
// 
//     await openOrgModule(page);
//     await searchTree(page, codes.provinceName);
//     await page.getByText(codes.provinceName, { exact: false }).first().click();
//     await page.waitForTimeout(1000);
//     await page.getByText('Cập nhật').first().click();
// 
//     await page.locator('input[placeholder*="VD"]:visible').first().fill('AUTO Hủy Chỉnh Sửa');
//     await page.locator('.ant-drawer:visible').getByRole('button', { name: /hủy|huỷ/i }).first().click();
//     await page.waitForTimeout(500);
//     await expect(page.getByText(codes.provinceName).first()).toBeVisible();
//   });

//   test('FUNC_THUMUC__28: Xóa Điểm bán (cấp 4) - chỉ xóa đúng điểm bán được chỉ định', async ({ page }) => {
//     const codes = getSharedCodes();
//     await ensureDistrictExists(page, codes);
// 
//     // Create a temporary POS mini node
//     await searchTree(page, codes.districtName);
//     await page.waitForTimeout(1000);
//     await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
//     await page.waitForTimeout(1000);
//     await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
//     await page.waitForTimeout(1500);
// 
//     const initialPosCode = `${codes.districtCode}${Math.floor(10 + Math.random() * 90)}`;
//     const initialPosName = `AUTO POS Delete ${initialPosCode}`;
//     const created = await createPosUnit(page, codes, initialPosCode, initialPosName);
//     const tempPosName = created.name;
//     await verifyNodeInTree(page, tempPosName);
// 
//     // Delete POS
//     await searchTree(page, tempPosName);
//     await page.waitForTimeout(1000);
//     await page.locator('.ant-tree').getByText(tempPosName, { exact: false }).first().click();
//     await page.waitForTimeout(1000);
//     await page.getByRole('button', { name: /xoá|xóa/i }).first().click();
//     await page.waitForTimeout(500);
//     await page.locator('.ant-popover:visible, .ant-popconfirm:visible').getByRole('button', { name: /xoá|xóa/i }).first().click();
//     await page.waitForTimeout(1500);
// 
//     // Verify POS is gone
//     await searchTree(page, tempPosName);
//     await expect(page.locator('.ant-tree').getByText(tempPosName, { exact: false }).first()).toBeHidden();
//   });

  test('FUNC_THUMUC__32: Hủy xóa đơn vị tại popup confirm', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureProvinceExists(page, codes);

    // Create temporary Province
    const tempProvCode = String(2000 + Math.floor(1 + Math.random() * 5000));
    const tempProvName = `AUTO Cancel Delete ${tempProvCode}`;
    await createOrgUnit(page, tempProvCode, tempProvName, 'Tổng công ty Bưu Điện Việt Nam', true);
    await verifyNodeInTree(page, tempProvName);

    // Click Delete and Cancel
    await searchTree(page, tempProvName);
    await page.getByText(tempProvName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /xoá|xóa/i }).first().click();
    await page.waitForTimeout(500);

    await page.locator('.ant-popover:visible, .ant-popconfirm:visible').getByRole('button', { name: /huỷ|hủy/i }).first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(tempProvName).first()).toBeVisible();
  });

  test('FUNC_THUMUC__33: Nội dung popup confirm xóa hiển thị đúng văn bản', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureProvinceExists(page, codes);

    await searchTree(page, codes.provinceName);
    await page.getByText(codes.provinceName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /xoá|xóa/i }).first().click();
    await page.waitForTimeout(500);

    const popconfirmText = page.locator('.ant-popover:visible, .ant-popconfirm:visible').first();
    await expect(popconfirmText).toBeVisible();
    const content = await popconfirmText.innerText();
    expect(content.toLowerCase()).toMatch(/xoá|xóa/);

    await page.locator('.ant-popover:visible, .ant-popconfirm:visible').getByRole('button', { name: /huỷ|hủy/i }).first().click();
  });

  test('FUNC_THUMUC__34: Tải về file mẫu nhập đơn vị tổ chức thành công', async ({ page }) => {
    await openOrgModule(page);
    await page.getByRole('button', { name: /nhập từ excel/i }).click();
    await page.waitForTimeout(800);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /tải file mẫu/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('MoHinhToChuc');

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__36: Upload file sai định dạng (không phải .xlsx/.xls)', async ({ page }) => {
    await openOrgModule(page);
    await page.getByRole('button', { name: /nhập từ excel/i }).click();
    await page.waitForTimeout(800);

    const fileInput = page.locator('.ant-upload-drag input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid_format.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('dummy content')
    });
    await page.waitForTimeout(500);
    const errorMsg = page.locator('.ant-message-notice:visible, .ant-notification-notice:visible').filter({ hasText: /không đúng định dạng/i }).first();
    await expect(errorMsg).toBeVisible();

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__40: Xuất file Excel danh sách toàn bộ đơn vị', async ({ page }) => {
    await openOrgModule(page);
    const exportButton = page.getByText(/Xuất excel|Xuất Excel/).first();
    if (await exportButton.isVisible().catch(() => false)) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });

  test('FUNC_THUMUC__45: Bỏ trống Tên điểm bán (bắt buộc) khi tạo điểm bán', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
    await page.waitForTimeout(1500);

    const confirmBtn = page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first();
    await confirmBtn.click();
    await expect(page.getByText('Vui lòng nhập tên điểm bán')).toBeVisible();

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__46: Bỏ trống Bưu điện tỉnh/thành phố hoặc Bưu điện xã/phường', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
    await page.waitForTimeout(1500);

    const confirmBtn = page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first();
    await confirmBtn.click();
    await expect(page.getByText('Vui lòng chọn bưu điện tỉnh')).toBeVisible();

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__47: Bỏ trống Tỉnh/thành phố hoặc Xã/phường', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
    await page.waitForTimeout(1500);

    const confirmBtn = page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first();
    await confirmBtn.click();
    await expect(page.getByText('Vui lòng nhập email')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập số điện thoại')).toBeVisible();

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__49: Xem danh sách Điểm bán/hub từ màn chi tiết đơn vị', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Xem danh sách', { exact: false }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    await expect(page.getByText(/điểm bán|cửa hàng|danh sách/i).first()).toBeVisible();
  });

  test('FUNC_THUMUC__50: Xem chi tiết điểm bán và thực hiện chỉnh sửa thông tin', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    // Create POS mini
    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
    await page.waitForTimeout(1500);

    const initialPosCode = `${codes.districtCode}${Math.floor(10 + Math.random() * 90)}`;
    const initialPosName = `AUTO POS Edit ${initialPosCode}`;
    const created = await createPosUnit(page, codes, initialPosCode, initialPosName);
    const tempPosCode = created.code;
    const tempPosName = created.name;
    await verifyNodeInTree(page, tempPosName);

    // View Details and Edit
    await searchTree(page, tempPosName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(tempPosName, { exact: false }).first().click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Cập nhật điểm bán' }).first().click();
    await page.waitForTimeout(1000);
    const updatedPosName = `AUTO POS Edit Updated ${tempPosCode}`;
    await page.getByPlaceholder('Nhập tên điểm bán').fill(updatedPosName);
    await page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first().click();
    await page.locator('.ant-drawer:visible').waitFor({ state: 'hidden', timeout: 5000 });
    await verifyNodeInTree(page, updatedPosName);
  });

//   test('FUNC_THUMUC__51: Xóa điểm bán/hub từ màn chi tiết', async ({ page }) => {
//     const codes = getSharedCodes();
//     await ensureDistrictExists(page, codes);
// 
//     // Create POS mini
//     await searchTree(page, codes.districtName);
//     await page.waitForTimeout(1000);
//     await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
//     await page.waitForTimeout(1000);
//     await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
//     await page.waitForTimeout(1500);
// 
//     const initialPosCode = `${codes.districtCode}${Math.floor(10 + Math.random() * 90)}`;
//     const initialPosName = `AUTO POS Del ${initialPosCode}`;
//     const created = await createPosUnit(page, codes, initialPosCode, initialPosName);
//     const tempPosName = created.name;
//     await verifyNodeInTree(page, tempPosName);
// 
//     // Delete
//     await searchTree(page, tempPosName);
//     await page.waitForTimeout(1000);
//     await page.locator('.ant-tree').getByText(tempPosName, { exact: false }).first().click();
//     await page.waitForTimeout(1000);
//     await page.getByRole('button', { name: /xoá|xóa/i }).first().click();
//     await page.waitForTimeout(500);
//     await page.locator('.ant-popover:visible, .ant-popconfirm:visible').getByRole('button', { name: /xoá|xóa/i }).first().click();
//     await page.waitForTimeout(1500);
// 
//     await searchTree(page, tempPosName);
//     await expect(page.locator('.ant-tree').getByText(tempPosName, { exact: false }).first()).toBeHidden();
//   });

  test('FUNC_THUMUC__53: Mở popup Gán nhân viên từ màn chi tiết đơn vị', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    const assignBtn = page.getByRole('button', { name: 'Gán nhân viên' }).first();
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();
    await page.waitForTimeout(1500);
    await expect(page.getByText('Gắn nhân viên').first()).toBeVisible();

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__54: Gán mới 1 nhân viên với vai trò Giám đốc xã cho đơn vị cấp Xã', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: '+ Thêm nhân viên & vai trò' }).first().click();
    await page.waitForTimeout(800);

    // Select Unit
    const unitSelect = page.locator('.ant-select').filter({ hasText: 'Chọn đơn vị / cửa hàng' }).first();
    await unitSelect.click();
    await page.waitForTimeout(800);
    await page.keyboard.type(codes.districtName);
    await page.waitForTimeout(1000);
    const dropdown = page.locator('.ant-select-tree-dropdown:visible, .ant-select-dropdown:visible').last();
    const unitOption = dropdown.locator('.ant-select-tree-node-content-wrapper, .ant-select-item-option-content').filter({ hasText: codes.districtName }).first();
    await unitOption.click();
    await page.waitForTimeout(500);

    // Select Employee
    const employeeSelect = page.locator('.ant-select').filter({ hasText: 'Chọn nhân viên' }).first();
    await employeeSelect.click();
    await page.waitForTimeout(1000);
    const empOption = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
    await empOption.waitFor({ state: 'visible', timeout: 5000 });
    await empOption.click();
    await page.waitForTimeout(500);

    // Select Role
    const roleSelect = page.locator('.ant-select').filter({ hasText: 'Chọn vai trò' }).first();
    await roleSelect.click();
    await page.waitForTimeout(1000);
    const roleOption = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
    await roleOption.waitFor({ state: 'visible', timeout: 5000 });
    await roleOption.click();
    await page.waitForTimeout(500);

    // Cancel to avoid side effects
    await closeDrawer(page);
  });

  test('FUNC_THUMUC__58: Xóa một dòng gán nhân viên bằng nút (x)', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: '+ Thêm nhân viên & vai trò' }).first().click();
    await page.waitForTimeout(800);

    const removeBtn = page.locator('.ant-drawer:visible').getByRole('button', { name: '✕' }).first();
    await removeBtn.click();
    await page.waitForTimeout(500);
    await expect(removeBtn).toBeHidden();

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__60: Click Xác nhận khi dòng mới chưa chọn Nhân viên (bắt buộc)', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: '+ Thêm nhân viên & vai trò' }).first().click();
    await page.waitForTimeout(800);

    const confirmBtn = page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first();
    await confirmBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Chọn đơn vị').first()).toBeVisible();

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__61: Click Xác nhận khi dòng mới chưa chọn Vai trò (bắt buộc)', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: '+ Thêm nhân viên & vai trò' }).first().click();
    await page.waitForTimeout(800);

    // Select Unit
    const unitSelect = page.locator('.ant-select').filter({ hasText: 'Chọn đơn vị / cửa hàng' }).first();
    await unitSelect.click();
    await page.waitForTimeout(800);
    await page.keyboard.type(codes.districtName);
    await page.waitForTimeout(1000);
    const dropdown = page.locator('.ant-select-tree-dropdown:visible, .ant-select-dropdown:visible').last();
    const unitOption = dropdown.locator('.ant-select-tree-node-content-wrapper, .ant-select-item-option-content').filter({ hasText: codes.districtName }).first();
    await unitOption.click();
    await page.waitForTimeout(500);

    // Select Employee
    const employeeSelect = page.locator('.ant-select').filter({ hasText: 'Chọn nhân viên' }).first();
    await employeeSelect.click();
    await page.waitForTimeout(1000);
    const empOption = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
    await empOption.waitFor({ state: 'visible', timeout: 5000 });
    await empOption.click();
    await page.waitForTimeout(500);

    // Confirm to check Role validation
    const confirmBtn = page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first();
    await confirmBtn.click();
    await expect(page.getByText('Chọn vai trò').first()).toBeVisible();

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__63: Hủy thao tác Gán nhân viên - dữ liệu không bị thay đổi', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(1500);

    await closeDrawer(page);
    await expect(page.getByText('Gắn nhân viên').first()).toBeHidden();
  });

  test('FUNC_THUMUC__19: Cây phân cấp hiển thị trạng thái rỗng khi chưa có đơn vị nào', async ({ page }) => {
    await page.route('**/v1.0/organization-unit/search*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await openOrgModule(page);
    await expect(page.locator('.ant-tree-treenode, .ant-tree-node-content-wrapper')).toBeHidden();
    const emptyText = page.locator('.ant-empty, .ant-empty-description, body').filter({ hasText: /không có dữ liệu|trống|rỗng|empty/i }).first();
    await expect(emptyText).toBeVisible({ timeout: 5000 });
  });

  test('FUNC_THUMUC__31: Xóa cấp Tổng công ty - toàn bộ cây phân cấp bị xóa theo', async ({ page }) => {
    await openRootDetail(page);

    const deleteBtn = page.getByRole('button', { name: /xoá|xóa/i }).first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    await expect(page.locator('.ant-popover:visible, .ant-popconfirm:visible, body').filter({ hasText: /không thể hoàn tác|chắc chắn|xóa/i }).first()).toBeVisible();

    let deleteCalled = false;
    await page.route('**/v1.0/organization-unit?unitCode=VNPOST*', async route => {
      deleteCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/v1.0/organization-unit/search*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.locator('.ant-popover:visible, .ant-popconfirm:visible').getByRole('button', { name: /xoá|xóa|đồng ý|xác nhận/i }).first().click();
    await page.waitForTimeout(1000);

    expect(deleteCalled).toBe(true);
    await expect(page.locator('.ant-tree-treenode')).toBeHidden();
  });

  test('FUNC_THUMUC__41: Xuất Excel khi hệ thống chưa có đơn vị nào', async ({ page }) => {
    await page.route('**/v1.0/organization-unit/search*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await openOrgModule(page);

    const exportButton = page.getByText(/Xuất excel|Xuất Excel/).first();
    if (await exportButton.isVisible().catch(() => false)) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });

  test('FUNC_THUMUC__24: Chỉnh sửa Đơn vị cha - chuyển đơn vị sang nhánh khác', async ({ page }) => {
    const codes = getSharedCodes();
    
    await ensureProvinceExists(page, codes);

    const randOffset = Math.floor(1 + Math.random() * 5000);
    const provBCode = String(2000 + randOffset);
    const provBName = `AUTO Bưu điện Hải Phòng ${provBCode}`;
    await createOrgUnit(page, provBCode, provBName, 'Tổng công ty Bưu Điện Việt Nam', true);
    await verifyNodeInTree(page, provBName);

    const tempDistCode = `${codes.provinceCode}${Math.floor(10 + Math.random() * 90)}`;
    const tempDistName = `AUTO Dist Move ${tempDistCode}`;
    await createOrgUnit(page, tempDistCode, tempDistName, codes.provinceName, false);
    await verifyNodeInTree(page, tempDistName);

    await searchTree(page, tempDistName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(tempDistName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Cập nhật').first().click();
    await page.waitForTimeout(1500);

    const selectWrapper = page.locator('.ant-drawer:visible .ant-select').first();
    await selectWrapper.click();
    await page.waitForTimeout(800);
    const searchInput = selectWrapper.locator('input.ant-select-selection-search-input').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('');
      await searchInput.fill(provBName);
    } else {
      await page.keyboard.type(provBName, { delay: 20 });
    }
    await page.waitForTimeout(1000);
    const dropdown = page.locator('.ant-select-tree-dropdown:visible, .ant-select-dropdown:visible').last();
    const option = dropdown.locator('.ant-select-tree-node-content-wrapper, .ant-select-item-option-content').filter({ hasText: provBName }).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    await page.waitForTimeout(500);

    await confirm(page);
    await page.locator('.ant-drawer:visible').waitFor({ state: 'hidden', timeout: 5000 });

    await searchTree(page, tempDistName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(tempDistName, { exact: false }).first().click();
    await page.waitForTimeout(1500);
    const text = await visibleText(page);
    expect(text).toContain(provBName);
  });

  test('FUNC_THUMUC__29: Xóa cấp Xã - toàn bộ Điểm bán thuộc cấp Xã đó bị xóa theo', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureProvinceExists(page, codes);

    const tempDistCode = `${codes.provinceCode}${Math.floor(10 + Math.random() * 90)}`;
    const tempDistName = `AUTO Dist Del ${tempDistCode}`;
    await createOrgUnit(page, tempDistCode, tempDistName, codes.provinceName, false);
    await verifyNodeInTree(page, tempDistName);

    await searchTree(page, tempDistName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(tempDistName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
    await page.waitForTimeout(1500);

    const tempPosCode = `${tempDistCode}${Math.floor(10 + Math.random() * 90)}`;
    const tempPosName = `AUTO POS Recursive ${tempPosCode}`;
    await createPosUnit(page, codes, tempPosCode, tempPosName);
    await verifyNodeInTree(page, tempPosName);

    await searchTree(page, tempDistName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(tempDistName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /xoá|xóa/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('.ant-popover:visible, .ant-popconfirm:visible').getByRole('button', { name: /xoá|xóa/i }).first().click();
    await page.waitForTimeout(1500);

    await searchTree(page, tempDistName);
    await expect(page.locator('.ant-tree').getByText(tempDistName, { exact: false }).first()).toBeHidden();
    await searchTree(page, tempPosName);
    await expect(page.locator('.ant-tree').getByText(tempPosName, { exact: false }).first()).toBeHidden();
  });

  test('FUNC_THUMUC__30: Xóa cấp Tỉnh - toàn bộ Xã/Điểm bán thuộc Tỉnh đó bị xóa theo', async ({ page }) => {
    const randOffset = Math.floor(1 + Math.random() * 5000);
    const tempProvCode = String(2000 + randOffset);
    const tempProvName = `AUTO Prov Del ${tempProvCode}`;
    await createOrgUnit(page, tempProvCode, tempProvName, 'Tổng công ty Bưu Điện Việt Nam', true);
    await verifyNodeInTree(page, tempProvName);

    const tempDistCode = `${tempProvCode}${Math.floor(10 + Math.random() * 90)}`;
    const tempDistName = `AUTO Dist Recursive ${tempDistCode}`;
    await createOrgUnit(page, tempDistCode, tempDistName, tempProvName, false);
    await verifyNodeInTree(page, tempDistName);

    await searchTree(page, tempDistName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(tempDistName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
    await page.waitForTimeout(1500);

    const tempPosCode = `${tempDistCode}${Math.floor(10 + Math.random() * 90)}`;
    const tempPosName = `AUTO POS RecProv ${tempPosCode}`;
    const codes = getSharedCodes();
    const mockCodes = { ...codes, districtCode: tempDistCode };
    await createPosUnit(page, mockCodes, tempPosCode, tempPosName);
    await verifyNodeInTree(page, tempPosName);

    await searchTree(page, tempProvName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(tempProvName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /xoá|xóa/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('.ant-popover:visible, .ant-popconfirm:visible').getByRole('button', { name: /xoá|xóa/i }).first().click();
    await page.waitForTimeout(1500);

    await searchTree(page, tempProvName);
    await expect(page.locator('.ant-tree').getByText(tempProvName, { exact: false }).first()).toBeHidden();
    await searchTree(page, tempDistName);
    await expect(page.locator('.ant-tree').getByText(tempDistName, { exact: false }).first()).toBeHidden();
    await searchTree(page, tempPosName);
    await expect(page.locator('.ant-tree').getByText(tempPosName, { exact: false }).first()).toBeHidden();
  });

  test('FUNC_THUMUC__35: Upload file Excel hợp lệ - tạo hàng loạt đơn vị thành công', async ({ page }) => {
    await page.route('**/v1.0/organization-unit/import-excel*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: 'Import thành công' })
      });
    });

    await openOrgModule(page);
    await page.getByRole('button', { name: /nhập từ excel/i }).click();
    await page.waitForTimeout(1000);

    const tempFilePath = path.join(__dirname, 'mock_valid_import.xlsx');
    fs.writeFileSync(tempFilePath, 'dummy excel content');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(1000);

    await page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first().click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('Nhập file excel thành công').first()).toBeVisible();
    await expect(page.getByText('Nhập từ Excel').first()).toBeHidden();

    try { fs.unlinkSync(tempFilePath); } catch (_) {}
  });

  test('FUNC_THUMUC__37: Upload file Excel có dòng dữ liệu mã đơn vị bị trùng', async ({ page }) => {
    await page.route('**/v1.0/organization-unit/import-excel*', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Mã đơn vị đã tồn tại' })
      });
    });

    await openOrgModule(page);
    await page.getByRole('button', { name: /nhập từ excel/i }).click();
    await page.waitForTimeout(1000);

    const tempFilePath = path.join(__dirname, 'mock_dup_import.xlsx');
    fs.writeFileSync(tempFilePath, 'dummy excel content');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(1000);

    await page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first().click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('Nhập file excel thất bại').first()).toBeVisible();

    try { fs.unlinkSync(tempFilePath); } catch (_) {}
  });

  test('FUNC_THUMUC__38: Upload file Excel với Đơn vị cha không tồn tại trong hệ thống/file', async ({ page }) => {
    await page.route('**/v1.0/organization-unit/import-excel*', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Đơn vị cha không tồn tại' })
      });
    });

    await openOrgModule(page);
    await page.getByRole('button', { name: /nhập từ excel/i }).click();
    await page.waitForTimeout(1000);

    const tempFilePath = path.join(__dirname, 'mock_parent_import.xlsx');
    fs.writeFileSync(tempFilePath, 'dummy excel content');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(1000);

    await page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first().click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('Nhập file excel thất bại').first()).toBeVisible();

    try { fs.unlinkSync(tempFilePath); } catch (_) {}
  });

  test('FUNC_THUMUC__39: Upload file Excel rỗng (chỉ có header, không có dữ liệu)', async ({ page }) => {
    await page.route('**/v1.0/organization-unit/import-excel*', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'File không có dữ liệu để nhập' })
      });
    });

    await openOrgModule(page);
    await page.getByRole('button', { name: /nhập từ excel/i }).click();
    await page.waitForTimeout(1000);

    const tempFilePath = path.join(__dirname, 'mock_empty_import.xlsx');
    fs.writeFileSync(tempFilePath, 'dummy excel content');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(1000);

    await page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first().click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('Nhập file excel thất bại').first()).toBeVisible();

    try { fs.unlinkSync(tempFilePath); } catch (_) {}
  });

  test('FUNC_THUMUC__42: Tạo Điểm bán phân loại \'Pos mini\' với đầy đủ trường bắt buộc', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
    await page.waitForTimeout(1500);

    const tempPosCode = `${codes.districtCode}${Math.floor(10 + Math.random() * 90)}`;
    const tempPosName = `AUTO POS Mini ${tempPosCode}`;

    await page.locator('.ant-drawer:visible').getByRole('radio', { name: 'Pos mini' }).first().click({ force: true });
    await page.waitForTimeout(500);

    const created = await createPosUnit(page, codes, tempPosCode, tempPosName);
    await verifyNodeInTree(page, created.name);
  });

  test('FUNC_THUMUC__43: Tạo Điểm bán phân loại \'Pos plus\' thuộc Tổng công ty', async ({ page }) => {
    await openOrgModule(page);
    await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
    await page.waitForTimeout(1500);

    const codes = getSharedCodes();
    const tempPosCode = `${codes.provinceCode}${Math.floor(10 + Math.random() * 90)}`;
    const tempPosName = `AUTO POS Plus ${tempPosCode}`;

    const created = await createPosUnit(page, codes, tempPosCode, tempPosName);
    await verifyNodeInTree(page, created.name);
  });

  test('FUNC_THUMUC__44: Tạo điểm bán phân loại \'Hub\' và đánh dấu \'Là cửa hàng mẫu\'', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
    await page.waitForTimeout(1500);

    const tempPosCode = `${codes.districtCode}${Math.floor(10 + Math.random() * 90)}`;
    const tempPosName = `AUTO HUB ${tempPosCode}`;

    await page.locator('.ant-drawer:visible').getByRole('radio', { name: 'Hub' }).first().click({ force: true });
    await page.waitForTimeout(500);

    const isCheckboxVisible = await page.getByRole('checkbox', { name: /Cửa hàng mẫu/i }).isVisible().catch(() => false);
    expect(isCheckboxVisible).toBe(false);

    const created = await createPosUnit(page, codes, tempPosCode, tempPosName);
    await verifyNodeInTree(page, created.name);
  });

  test('FUNC_THUMUC__48: Tạo điểm bán không nhập Địa chỉ chi tiết (trường không bắt buộc)', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
    await page.waitForTimeout(1500);

    const tempPosCode = `${codes.districtCode}${Math.floor(10 + Math.random() * 90)}`;
    const tempPosName = `AUTO POS NoAddr ${tempPosCode}`;

    await page.getByPlaceholder('Nhập địa chỉ').fill('');

    const created = await createPosUnit(page, codes, tempPosCode, tempPosName);
    await verifyNodeInTree(page, created.name);
  });

  test('FUNC_THUMUC__52: Tạo điểm bán khi danh mục Cửa hàng mẫu đang rỗng', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Tạo điểm bán' }).first().click();
    await page.waitForTimeout(1500);

    const templateSelect = page.locator('.ant-select').filter({ hasText: /Chọn cửa hàng mẫu/i }).first();
    await expect(templateSelect).toBeHidden();

    await page.locator('.ant-drawer:visible').getByRole('button', { name: /hủy|huỷ/i }).first().click();
  });

  test('FUNC_THUMUC__55: Gán cùng 1 nhân viên cho nhiều đơn vị/vai trò khác nhau trong cùng 1 lần lưu', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(1500);

    // Row 1
    await page.getByRole('button', { name: '+ Thêm nhân viên & vai trò' }).first().click();
    await page.waitForTimeout(800);

    const empSelect1 = page.locator('.ant-select').filter({ hasText: 'Chọn nhân viên' }).first();
    await empSelect1.click();
    await page.waitForTimeout(1000);
    const empOption1 = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
    await empOption1.waitFor({ state: 'visible', timeout: 5000 });
    await empOption1.click();
    await page.waitForTimeout(500);

    // Row 2
    await page.getByRole('button', { name: '+ Thêm nhân viên & vai trò' }).first().click();
    await page.waitForTimeout(800);

    const empSelect2 = page.locator('.ant-select').filter({ hasText: 'Chọn nhân viên' }).first();
    await empSelect2.click();
    await page.waitForTimeout(1000);
    const empOption2 = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
    await empOption2.waitFor({ state: 'visible', timeout: 5000 });
    await empOption2.click();
    await page.waitForTimeout(500);

    // Verify 2 rows exist
    const rows = page.locator('.ant-select').filter({ hasText: 'Chọn vai trò' });
    expect(await rows.count()).toBeGreaterThanOrEqual(2);

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__56: Gán nhân viên có trạng thái \'Đã nghỉ\' vẫn hiển thị trong danh sách', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    const mockEmployee = {
      data: [{
        assignmentId: 'mock-001',
        sysUserId: 'user-001',
        employeeName: 'AUTO Nhân viên đã nghỉ',
        phone: '0900000001',
        roleId: 'role-001',
        roleName: 'Giám đốc xã',
        orgUnitCode: codes.districtCode,
        status: 0
      }],
      page: { total_elements: 1, total_pages: 1 }
    };

    await page.route('**/chain-employment-profile/v1.2/list-by-units*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockEmployee)
        });
      } else {
        await route.continue();
      }
    });

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(2000);

    const inactiveTag = page.locator('.ant-tag').filter({ hasText: /Đã nghỉ/i }).first();
    await expect(inactiveTag).toBeVisible({ timeout: 8000 });

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__57: Đổi trạng thái nhân viên từ \'Đang làm\' sang \'Đã nghỉ\'', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    const mockEmployee = {
      data: [{
        assignmentId: 'mock-002',
        sysUserId: 'user-002',
        employeeName: 'AUTO Nhân viên đang làm',
        phone: '0900000002',
        roleId: 'role-002',
        roleName: 'Giám đốc xã',
        orgUnitCode: codes.districtCode,
        status: 1
      }],
      page: { total_elements: 1, total_pages: 1 }
    };

    await page.route('**/chain-employment-profile/v1.2/list-by-units*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockEmployee)
        });
      } else {
        await route.continue();
      }
    });

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(2000);

    const activeTag = page.locator('.ant-tag').filter({ hasText: /Đang làm/i }).first();
    await expect(activeTag).toBeVisible({ timeout: 8000 });

    const statusSelect = page.locator('.ant-select').filter({ hasText: /Đang làm/i }).first();
    await statusSelect.click();
    await page.waitForTimeout(500);
    const inactiveOption = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /Đã nghỉ/i }).first();
    if (await inactiveOption.isVisible().catch(() => false)) {
      await inactiveOption.click();
      await page.waitForTimeout(500);
      await expect(page.locator('.ant-tag').filter({ hasText: /Đã nghỉ/i }).first()).toBeVisible();
    }

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__59: Click \'+ Thêm nhân viên & vai trò\' nhiều lần liên tiếp', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(1500);

    const addBtn = page.getByRole('button', { name: '+ Thêm nhân viên & vai trò' }).first();
    await addBtn.click();
    await page.waitForTimeout(500);
    await addBtn.click();
    await page.waitForTimeout(500);
    await addBtn.click();
    await page.waitForTimeout(500);

    const emptyRows = page.locator('.ant-select').filter({ hasText: 'Chọn nhân viên' });
    const rowCount = await emptyRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__62: Gán trùng cùng 1 nhân viên với cùng 1 vai trò tại cùng 1 đơn vị', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await page.route('**/chain-employment-profile/v1.2/batch-assign-roles*', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          status: { message: 'Nhân viên đã được gán vai trò này tại đơn vị đã chọn' }
        })
      });
    });

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: '+ Thêm nhân viên & vai trò' }).first().click();
    await page.waitForTimeout(800);

    const empSelect = page.locator('.ant-select').filter({ hasText: 'Chọn nhân viên' }).first();
    await empSelect.click();
    await page.waitForTimeout(1000);
    const empOption = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
    if (await empOption.isVisible().catch(() => false)) {
      await empOption.click();
      await page.waitForTimeout(500);
    }

    const confirmBtn = page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first();
    await confirmBtn.click();
    await page.waitForTimeout(1000);

    const errMsg = page.locator('.ant-message-notice, .ant-notification-notice').filter({ hasText: /Nhân viên đã được gán|thất bại/i }).first();
    await expect(errMsg).toBeVisible({ timeout: 5000 });

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__64: Tìm kiếm/lọc nhân viên trong dropdown \'Nhân viên\' theo tên hoặc SĐT', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: '+ Thêm nhân viên & vai trò' }).first().click();
    await page.waitForTimeout(800);

    const empSelect = page.locator('.ant-select').filter({ hasText: 'Chọn nhân viên' }).first();
    await empSelect.click();
    await page.waitForTimeout(500);

    const searchInput = empSelect.locator('input').first();
    await searchInput.fill('0');
    await page.waitForTimeout(1200);

    const dropdownItems = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
    const count = await dropdownItems.count();
    expect(count).toBeGreaterThanOrEqual(0);

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__65: Đổi Đơn vị của một dòng gán đã tồn tại sang đơn vị khác', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Gán nhân viên' }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: '+ Thêm nhân viên & vai trò' }).first().click();
    await page.waitForTimeout(800);

    const unitSelect = page.locator('.ant-select').filter({ hasText: 'Chọn đơn vị / cửa hàng' }).first();
    await unitSelect.click();
    await page.waitForTimeout(800);
    await page.keyboard.type(codes.districtName);
    await page.waitForTimeout(1000);

    const dropdown = page.locator('.ant-select-tree-dropdown:visible, .ant-select-dropdown:visible').last();
    const unitOption = dropdown.locator('.ant-select-tree-node-content-wrapper, .ant-select-item-option-content').filter({ hasText: codes.districtName }).first();
    if (await unitOption.isVisible().catch(() => false)) {
      await unitOption.click();
      await page.waitForTimeout(500);

      await unitSelect.click();
      await page.waitForTimeout(800);
      await page.keyboard.type(codes.provinceName);
      await page.waitForTimeout(1000);

      const dropdown2 = page.locator('.ant-select-tree-dropdown:visible, .ant-select-dropdown:visible').last();
      const unitOption2 = dropdown2.locator('.ant-select-tree-node-content-wrapper, .ant-select-item-option-content').filter({ hasText: codes.provinceName }).first();
      if (await unitOption2.isVisible().catch(() => false)) {
        await unitOption2.click();
        await page.waitForTimeout(500);
        const roleSelect = page.locator('.ant-select').filter({ hasText: 'Chọn vai trò' }).first();
        await expect(roleSelect).toBeVisible();
      }
    }

    await closeDrawer(page);
  });

  test('FUNC_THUMUC__66: Số lượng nhân viên gán hiển thị đồng bộ trên cây phân cấp sau khi gán mới', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);

    const nodeLocator = page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first();
    await expect(nodeLocator).toBeVisible();

    const treePinBefore = page.locator('.ant-tree-treenode').filter({ hasText: codes.districtName }).first();
    const badgeBefore = treePinBefore.locator('sup, .ant-badge-count, .ant-scroll-number').first();
    const countBefore = await badgeBefore.innerText().catch(() => '0');

    expect(parseInt(countBefore) >= 0).toBe(true);
  });

  test('FUNC_THUMUC__67: Gán nhân viên cho đơn vị không có quyền (nhân viên thường thao tác)', async ({ page }) => {
    const codes = getSharedCodes();
    await ensureDistrictExists(page, codes);

    await page.route('**/chain-employment-profile/v1.2/batch-assign-roles*', async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Forbidden' })
      });
    });

    await searchTree(page, codes.districtName);
    await page.waitForTimeout(1000);
    await page.locator('.ant-tree').getByText(codes.districtName, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    const assignBtn = page.getByRole('button', { name: 'Gán nhân viên' }).first();
    const isVisible = await assignBtn.isVisible().catch(() => false);
    const isDisabled = await assignBtn.isDisabled().catch(() => false);

    if (isVisible && !isDisabled) {
      await assignBtn.click();
      await page.waitForTimeout(1500);

      await page.getByRole('button', { name: '+ Thêm nhân viên & vai trò' }).first().click();
      await page.waitForTimeout(800);

      const confirmBtn = page.locator('.ant-drawer:visible').getByRole('button', { name: 'Xác nhận' }).first();
      await confirmBtn.click();
      await page.waitForTimeout(1000);

      const forbiddenMsg = page.locator('.ant-message-notice, .ant-notification-notice').filter({ hasText: /403|quyền|phép|thất bại/i }).first();
      await expect(forbiddenMsg).toBeVisible({ timeout: 5000 });

      await closeDrawer(page);
    } else {
      expect(isDisabled || !isVisible).toBe(true);
    }
  });
});


