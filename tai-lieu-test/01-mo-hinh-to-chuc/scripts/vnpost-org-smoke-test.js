// Smoke test an toàn cho phân hệ Mô hình tổ chức.
// Script này chỉ kiểm tra các luồng chính/read-only và validation rỗng,
// không tạo/sửa/xóa/import dữ liệu thật. Dùng để kiểm tra nhanh trước khi chạy full E2E.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

// Output của smoke test: JSON kết quả và ảnh từng bước.
const DOC_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(DOC_ROOT, 'test-output/smoke');
const SHOT_DIR = path.join(OUT_DIR, 'screenshots');
const RESULT_FILE = path.join(OUT_DIR, 'vnpost-org-smoke-result.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function readCredentials() {
  // Đọc account/password từ stdin, tránh lưu credential trong code.
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
  // Smoke test lưu ảnh các bước để làm bằng chứng thao tác.
  const file = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function clickText(page, labels, timeout = 4000) {
  // Click một trong nhiều nhãn text có thể xuất hiện trên UI.
  for (const label of labels) {
    const target = page.getByText(label, { exact: false }).first();
    try {
      await target.waitFor({ timeout });
      await target.click({ timeout });
      return label;
    } catch (_) {
      // Try next label.
    }
  }
  return null;
}

async function visibleText(page, limit = 1500) {
  // Lấy text trang hiện tại để ghi nhận trạng thái UI.
  const text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return text.replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function closeDrawer(page) {
  // Đóng drawer/modal nếu đang mở.
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
  const closeIcon = page.locator('svg, button').filter({ hasText: /^$/ }).first();
  await closeIcon.click({ timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function main() {
  // Luồng chính: login, chọn scope, vào module, mở chi tiết, import, thêm đơn vị, validate rỗng.
  ensureDir(OUT_DIR);
  ensureDir(SHOT_DIR);

  const { username, password } = await readCredentials();
  if (!username || !password) throw new Error('Missing username/password from stdin.');

  const result = {
    startedAt: new Date().toISOString(),
    target: 'https://vnpost.sfin.vn/',
    browser: 'chromium',
    mode: 'headless',
    safety: 'No create/update/delete/import confirmation was submitted.',
    steps: [],
    observations: [],
    screenshots: [],
    issues: [],
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  page.on('console', msg => {
    const text = msg.text();
    if (/error|failed|warn/i.test(text)) result.issues.push(`Console: ${text.slice(0, 300)}`);
  });
  page.on('pageerror', err => result.issues.push(`Page error: ${err.message}`));

  try {
    await page.goto(result.target, { waitUntil: 'domcontentloaded', timeout: 60000 });
    result.steps.push({ id: 'AUTO-01', action: 'Open login page', status: 'PASS', url: page.url(), title: await page.title() });
    result.screenshots.push(await screenshot(page, '01-login-page'));

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ timeout: 20000 });
    const inputs = page.locator('input:visible');
    const inputCount = await inputs.count();
    let usernameInput = null;
    for (let i = 0; i < inputCount; i++) {
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
    result.steps.push({ id: 'AUTO-02', action: 'Submit login form', status: 'PASS', url: page.url(), title: await page.title() });

    const accountText = await visibleText(page);
    result.observations.push({ area: 'after-login', text: accountText });
    result.screenshots.push(await screenshot(page, '02-after-login-select-scope'));

    const selectedScope =
      await page.getByText('Admin', { exact: true }).click({ timeout: 5000 }).then(() => 'Admin').catch(() => null) ||
      await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).click({ timeout: 5000 }).then(() => 'Tổng công ty Bưu Điện Việt Nam').catch(() => null);
    result.steps.push({ id: 'AUTO-03', action: 'Select management scope', status: selectedScope ? 'PASS' : 'FAIL', value: selectedScope });
    if (!selectedScope) throw new Error('Cannot select Admin management scope.');

    await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2500);
    result.screenshots.push(await screenshot(page, '03-after-scope-selected'));

    const chainMenu = await clickText(page, ['Quản lý chuỗi']);
    result.steps.push({ id: 'AUTO-04', action: 'Open Quản lý chuỗi menu', status: chainMenu ? 'PASS' : 'FAIL', value: chainMenu });

    const orgMenu = await clickText(page, ['Mô hình tổ chức']);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    result.steps.push({ id: 'AUTO-05', action: 'Open Mô hình tổ chức module', status: orgMenu ? 'PASS' : 'FAIL', value: orgMenu, url: page.url(), title: await page.title() });
    result.screenshots.push(await screenshot(page, '04-organization-module'));

    const orgText = await visibleText(page, 2500);
    result.observations.push({ area: 'organization-module', text: orgText });

    const rootClick = await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first().click({ timeout: 5000 }).then(() => 'Tổng công ty Bưu Điện Việt Nam').catch(() => null);
    await page.waitForTimeout(1500);
    result.steps.push({ id: 'AUTO-06', action: 'Open root organization detail', status: rootClick ? 'PASS' : 'FAIL', value: rootClick });
    result.screenshots.push(await screenshot(page, '05-root-organization-detail'));
    result.observations.push({ area: 'root-detail', text: await visibleText(page, 2500) });

    const importOpen = await clickText(page, ['Nhập từ excel', 'Nhập từ Excel']);
    await page.waitForTimeout(1500);
    result.steps.push({ id: 'AUTO-07', action: 'Open import Excel drawer', status: importOpen ? 'PASS' : 'FAIL', value: importOpen });
    result.screenshots.push(await screenshot(page, '06-import-excel-drawer'));
    result.observations.push({ area: 'import-excel', text: await visibleText(page, 1800) });
    await page.goto('https://vnpost.sfin.vn/chain/organization-management', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const addOpen = await clickText(page, ['Thêm đơn vị']);
    await page.waitForTimeout(1500);
    result.steps.push({ id: 'AUTO-08', action: 'Open add organization drawer', status: addOpen ? 'PASS' : 'FAIL', value: addOpen });
    result.screenshots.push(await screenshot(page, '07-add-organization-drawer'));
    result.observations.push({ area: 'add-organization', text: await visibleText(page, 1800) });

    const requiredFields = ['Mã đơn vị', 'Tên đơn vị', 'Đơn vị cha'];
    const addDrawerText = await visibleText(page, 2000);
    for (const field of requiredFields) {
      result.steps.push({
        id: `AUTO-08-${field}`,
        action: `Check required field: ${field}`,
        status: addDrawerText.includes(field) ? 'PASS' : 'FAIL',
      });
    }

    const confirm = await page.getByRole('button', { name: /xác nhận/i }).click({ timeout: 5000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(1000);
    result.steps.push({ id: 'AUTO-09', action: 'Click empty add form confirm to verify validation only', status: confirm ? 'PASS' : 'FAIL' });
    result.screenshots.push(await screenshot(page, '08-add-empty-validation'));
    result.observations.push({ area: 'add-empty-validation', text: await visibleText(page, 1800) });

    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  ensureDir(OUT_DIR);
  fs.writeFileSync(RESULT_FILE, JSON.stringify({ error: err.stack || err.message }, null, 2));
  console.error(err.stack || err.message);
  process.exit(1);
});
