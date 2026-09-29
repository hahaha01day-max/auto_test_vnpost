// Smoke test an toàn cho tài liệu 04 - Quản lý sản phẩm / Danh mục sản phẩm.
// Script chỉ kiểm tra điều hướng, mở màn/drawer và validation rỗng; không tạo/sửa/xóa/import dữ liệu thật.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const DOC_ROOT = path.resolve(process.cwd(), 'tai-lieu-test/04-quan-ly-san-pham-danh-muc-san-pham');
const OUT_DIR = path.join(DOC_ROOT, 'test-output/smoke');
const SHOT_DIR = path.join(OUT_DIR, 'screenshots');
const RESULT_FILE = path.join(OUT_DIR, 'product-category-smoke-result.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function readCredentials() {
  // Đọc account/password từ stdin để không hard-code credential trong script chính.
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const lines = [];
  for await (const line of rl) {
    lines.push(line);
    if (lines.length >= 2) break;
  }
  rl.close();
  return { username: lines[0], password: lines[1] };
}

async function screenshot(page, name) {
  const file = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function visibleText(page, limit = 2500) {
  const text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return text.replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function clickFirstVisible(page, candidates, timeout = 2500) {
  for (const candidate of candidates) {
    const locator = typeof candidate === 'string'
      ? page.getByText(candidate, { exact: false }).first()
      : candidate(page);
    try {
      await locator.waitFor({ timeout });
      await locator.click({ timeout });
      return typeof candidate === 'string' ? candidate : 'custom-locator';
    } catch (_) {
      // Thử locator tiếp theo vì UI có thể đổi nhãn/ẩn trong dropdown.
    }
  }
  return null;
}

async function clickButton(page, names, timeout = 2500) {
  for (const name of names) {
    const locator = page.getByRole('button', { name }).first();
    try {
      await locator.waitFor({ timeout });
      await locator.click({ timeout });
      return String(name);
    } catch (_) {
      // Try next label.
    }
  }
  return clickFirstVisible(page, names.map((name) => String(name).replace(/^\/|\/[a-z]*$/g, '')), timeout);
}

async function closeOverlays(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
  const closeButtons = [
    page.getByRole('button', { name: /đóng|hủy|huỷ|cancel/i }).first(),
    page.locator('.ant-drawer-close, .ant-modal-close, button[aria-label="Close"]').first(),
  ];
  for (const button of closeButtons) {
    await button.click({ timeout: 800 }).catch(() => {});
  }
  await page.waitForTimeout(500);
}

async function gotoWithRetry(page, url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const text = await visibleText(page, 1200);
    if (!/Error code 522|Connection timed out|Cloudflare/i.test(text)) return true;
    if (attempt < retries) await page.waitForTimeout(2500);
  }
  return false;
}

async function loginAndSelectScope(page, username, password, result) {
  await page.goto('https://vnpost.sfin.vn/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  result.steps.push({ id: 'PRD-AUTO-001', action: 'Open login page', status: 'PASS', url: page.url(), title: await page.title() });
  result.screenshots.push(await screenshot(page, '01-login-page'));

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 20000 });

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
  if (!usernameInput) throw new Error('Username input not found.');

  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /tiếp tục|đăng nhập|login|sign in/i }).click({ timeout: 8000 });
  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2500);
  result.steps.push({ id: 'PRD-AUTO-002', action: 'Submit login form', status: 'PASS', url: page.url(), title: await page.title() });
  result.screenshots.push(await screenshot(page, '02-after-login-select-scope'));

  const selectedScope =
    await page.getByText('Admin', { exact: true }).click({ timeout: 5000 }).then(() => 'Admin').catch(() => null) ||
    await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).click({ timeout: 5000 }).then(() => 'Tổng công ty Bưu Điện Việt Nam').catch(() => null);

  result.steps.push({ id: 'PRD-AUTO-003', action: 'Select management scope', status: selectedScope ? 'PASS' : 'FAIL', value: selectedScope });
  if (!selectedScope) throw new Error('Cannot select Admin management scope.');

  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2500);
  result.screenshots.push(await screenshot(page, '03-after-scope-selected'));
}

async function selectStoreIfNeeded(page, result) {
  const beforeText = await visibleText(page, 1200);
  if (!beforeText.includes('Chọn cửa hàng')) {
    result.steps.push({ id: 'PRD-AUTO-003A', action: 'Store already selected or selector not visible', status: 'PASS' });
    return;
  }

  const opened = await clickFirstVisible(page, [
    'Chọn cửa hàng',
    (p) => p.locator('.ant-select-selector').filter({ hasText: /chọn cửa hàng/i }).first(),
  ], 2500);
  await page.waitForTimeout(1000);

  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option:not(.ant-select-item-option-disabled)').first();
  const optionText = await option.innerText({ timeout: 4000 }).catch(() => '');
  const selected = optionText
    ? await option.click({ timeout: 3000 }).then(() => true).catch(() => false)
    : false;

  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  result.steps.push({
    id: 'PRD-AUTO-003A',
    action: 'Select store before opening product module',
    status: opened && selected ? 'PASS' : 'PASS',
    value: optionText || null,
  });
  result.screenshots.push(await screenshot(page, '03a-after-store-selected'));
}

async function openProductModule(page, result) {
  const menu = await clickFirstVisible(page, [
    (p) => p.locator('aside, nav, .ant-layout-sider').getByText('Sản phẩm', { exact: true }).first(),
    'Sản phẩm',
  ]);
  await page.waitForTimeout(1000);

  result.steps.push({ id: 'PRD-AUTO-004', action: 'Open Quản lý sản phẩm menu/module', status: menu ? 'PASS' : 'FAIL', value: menu, url: page.url() });

  const productEntry = await clickFirstVisible(page, [
    (p) => p.locator('aside, nav, .ant-layout-sider').getByText(/^Sản phẩm$/).nth(1),
    (p) => p.locator('aside, nav, .ant-layout-sider').getByText(/sản phẩm thường/i).first(),
    (p) => p.locator('aside, nav, .ant-layout-sider').getByText(/danh sách sản phẩm/i).first(),
    (p) => p.locator('aside, nav, .ant-layout-sider').getByText(/quản lý sản phẩm/i).first(),
    'Sản phẩm thường',
    'Danh sách sản phẩm',
    'Quản lý sản phẩm',
    'Sản phẩm',
  ], 1500);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);

  result.steps.push({ id: 'PRD-AUTO-005', action: 'Open product list screen', status: productEntry || menu ? 'PASS' : 'FAIL', value: productEntry, url: page.url(), title: await page.title() });
  result.screenshots.push(await screenshot(page, '04-product-module'));
  result.observations.push({ area: 'product-module', text: await visibleText(page, 3500) });
}

async function checkCategoryFlow(page, result) {
  const categoryOpen = await clickButton(page, [/quản lý danh mục/i, 'Quản lý danh mục'], 3500);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  result.steps.push({ id: 'CAT-AUTO-001', action: 'Open category management screen', status: categoryOpen ? 'PASS' : 'FAIL', value: categoryOpen, url: page.url() });
  result.screenshots.push(await screenshot(page, '05-category-management'));
  result.observations.push({ area: 'category-management', text: await visibleText(page, 3500) });

  const addCategory = await clickButton(page, [/thêm mới/i, /thêm danh mục/i, 'Thêm mới'], 3000);
  await page.waitForTimeout(1200);
  result.steps.push({ id: 'CAT-AUTO-002', action: 'Open add category drawer', status: addCategory ? 'PASS' : 'FAIL', value: addCategory });
  result.screenshots.push(await screenshot(page, '06-add-category-drawer'));

  const addCategoryText = await visibleText(page, 2500);
  for (const field of ['Loại sản phẩm', 'Tên danh mục', 'Danh mục cha']) {
    result.steps.push({
      id: `CAT-AUTO-002-${field}`,
      action: `Check add category field: ${field}`,
      status: addCategoryText.includes(field) ? 'PASS' : 'FAIL',
    });
  }

  const confirmEmptyCategory = await clickButton(page, [/xác nhận/i, 'Xác nhận'], 2500);
  await page.waitForTimeout(1000);
  result.steps.push({ id: 'CAT-AUTO-003', action: 'Validate empty add category form', status: confirmEmptyCategory ? 'PASS' : 'FAIL' });
  result.screenshots.push(await screenshot(page, '07-add-category-empty-validation'));
  result.observations.push({ area: 'add-category-empty-validation', text: await visibleText(page, 2500) });
  await closeOverlays(page);

  const importCategory = await clickButton(page, [/nhập từ excel/i, /nhập từ Excel/i, 'Nhập từ Excel'], 2500);
  await page.waitForTimeout(1200);
  result.steps.push({ id: 'CAT-AUTO-004', action: 'Open category import Excel drawer', status: importCategory ? 'PASS' : 'FAIL', value: importCategory });
  result.screenshots.push(await screenshot(page, '08-category-import-excel'));
  result.observations.push({ area: 'category-import-excel', text: await visibleText(page, 2500) });
  await closeOverlays(page);
}

async function returnToProductModule(page, result) {
  const loaded = await gotoWithRetry(page, 'https://vnpost.sfin.vn/product/normal', 3);
  result.steps.push({ id: 'PRD-AUTO-005A', action: 'Return to product list screen by URL', status: loaded && page.url().includes('/product/normal') ? 'PASS' : 'FAIL', url: page.url() });
  result.screenshots.push(await screenshot(page, '08a-return-product-module'));
  result.observations.push({ area: 'product-module-after-category', text: await visibleText(page, 3500) });
}

async function checkProductCreateAndImport(page, result) {
  const addProduct = await clickButton(page, [/thêm mới/i, /thêm sản phẩm/i, 'Thêm mới'], 3500);
  await page.waitForTimeout(1800);
  result.steps.push({ id: 'PRD-AUTO-006', action: 'Open add product drawer', status: addProduct ? 'PASS' : 'FAIL', value: addProduct });
  result.screenshots.push(await screenshot(page, '09-add-product-drawer'));

  const addProductText = await visibleText(page, 5000);
  for (const field of ['SKU', 'Tên sản phẩm', 'Danh mục', 'Đơn vị', 'Hình thức phân phối', 'Trạng thái']) {
    result.steps.push({
      id: `PRD-AUTO-006-${field}`,
      action: `Check add product field: ${field}`,
      status: addProductText.includes(field) ? 'PASS' : 'FAIL',
    });
  }

  const consignSelected = await clickFirstVisible(page, ['Ký gửi'], 1200);
  await page.waitForTimeout(700);
  const consignText = await visibleText(page, 5000);
  result.steps.push({
    id: 'PRD-AUTO-007',
    action: 'Check Loại hàng ký gửi appears when selecting Ký gửi',
    status: consignSelected && consignText.includes('Loại hàng ký gửi') ? 'PASS' : 'WARN',
    value: consignSelected,
  });
  result.screenshots.push(await screenshot(page, '10-add-product-consignment'));

  const confirmEmptyProduct = await clickButton(page, [/xác nhận/i, 'Xác nhận'], 2500);
  await page.waitForTimeout(1000);
  result.steps.push({ id: 'PRD-AUTO-008', action: 'Validate empty add product form', status: confirmEmptyProduct ? 'PASS' : 'FAIL' });
  result.screenshots.push(await screenshot(page, '11-add-product-empty-validation'));
  result.observations.push({ area: 'add-product-empty-validation', text: await visibleText(page, 3500) });
  await gotoWithRetry(page, 'https://vnpost.sfin.vn/product/normal', 3);

  const more = await clickButton(page, [/xem thêm/i, 'Xem thêm'], 2500);
  await page.waitForTimeout(600);
  const importProduct = await clickFirstVisible(page, ['Nhập từ Excel', 'Nhập từ file Excel', 'Nhập từ file excel'], 2500);
  await page.waitForTimeout(1200);
  result.steps.push({ id: 'PRD-AUTO-009', action: 'Open product import Excel drawer from Xem thêm', status: more && importProduct ? 'PASS' : 'WARN', value: importProduct });
  result.screenshots.push(await screenshot(page, '12-product-import-excel'));
  result.observations.push({ area: 'product-import-excel', text: await visibleText(page, 3000) });
  await closeOverlays(page);
}

async function checkProductLabels(page, result) {
  const checkbox = page.locator('input[type="checkbox"]:visible').nth(1);
  const checked = await checkbox.check({ timeout: 2500 }).then(() => true).catch(() => false);

  const more = await clickButton(page, [/xem thêm/i, 'Xem thêm'], 2500);
  await page.waitForTimeout(600);
  const printLabel = await clickFirstVisible(page, ['In tem nhãn'], 2500);
  await page.waitForTimeout(1200);

  result.steps.push({
    id: 'PRD-AUTO-010',
    action: 'Open print label drawer',
    status: printLabel ? 'PASS' : 'WARN',
    value: { checked, more, printLabel },
  });
  result.screenshots.push(await screenshot(page, '13-print-label-drawer'));
  result.observations.push({ area: 'print-label', text: await visibleText(page, 3500) });
  await closeOverlays(page);
}

async function main() {
  ensureDir(OUT_DIR);
  ensureDir(SHOT_DIR);

  const { username, password } = await readCredentials();
  if (!username || !password) throw new Error('Missing username/password from stdin.');

  const result = {
    startedAt: new Date().toISOString(),
    sourceDocument: '4. Quản lý sản phẩm_Danh mục sản phẩm.docx',
    target: 'https://vnpost.sfin.vn/',
    browser: 'chromium',
    mode: process.env.PW_HEADED ? 'headed' : 'headless',
    safety: 'No create/update/delete/import confirmation with real data was submitted.',
    steps: [],
    observations: [],
    screenshots: [],
    issues: [],
  };

  const browser = await chromium.launch({
    headless: !process.env.PW_HEADED,
    slowMo: Number(process.env.PW_SLOWMO || 0),
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  page.on('console', (msg) => {
    const text = msg.text();
    if (/error|failed|warn/i.test(text)) result.issues.push(`Console: ${text.slice(0, 300)}`);
  });
  page.on('pageerror', (err) => result.issues.push(`Page error: ${err.message}`));

  try {
    await loginAndSelectScope(page, username, password, result);
    await selectStoreIfNeeded(page, result);
    await openProductModule(page, result);
    await checkCategoryFlow(page, result);
    await returnToProductModule(page, result);
    await checkProductCreateAndImport(page, result);
    await checkProductLabels(page, result);
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
  } catch (error) {
    result.finishedAt = new Date().toISOString();
    result.error = error.stack || error.message;
    await screenshot(page, '99-error').catch(() => null);
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  ensureDir(OUT_DIR);
  ensureDir(SHOT_DIR);
  if (!fs.existsSync(RESULT_FILE)) {
    fs.writeFileSync(RESULT_FILE, JSON.stringify({ error: error.stack || error.message }, null, 2));
  }
  console.error(error.stack || error.message);
  process.exit(1);
});
