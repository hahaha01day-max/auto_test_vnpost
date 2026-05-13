const { expect, test } = require('@playwright/test');

const ACCOUNT = process.env.VNPOST_ACCOUNT || '84862036990';
const PASSWORD = process.env.VNPOST_PASSWORD || '123456';
const TARGET = 'https://vnpost.sfin.vn/';

async function visibleText(page, limit = 4000) {
  const text = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
  return text.replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function clickFirstVisible(page, locators, timeout = 3000) {
  for (const locator of locators) {
    try {
      await locator.waitFor({ timeout });
      await locator.click({ timeout });
      return true;
    } catch (_) {
      // Try next locator.
    }
  }
  return false;
}

async function login(page) {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 25_000 });

  const inputs = page.locator('input:visible');
  let usernameInput = null;
  for (let i = 0; i < await inputs.count(); i++) {
    const input = inputs.nth(i);
    if (((await input.getAttribute('type')) || '') !== 'password') {
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
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    try {
      await page.waitForFunction(
        () => /Admin|Quản lý cung ứng|Quản lý Tỉnh|Đăng xuất|Truy cập trang quản lý|Kho hàng/.test(document.body?.innerText || ''),
        null,
        { timeout: 15_000 },
      );
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

async function selectSupplyScope(page) {
  const clicked = await clickFirstVisible(page, [
    page.getByText('Quản lý cung ứng', { exact: true }).first(),
    page.getByText('Admin', { exact: true }).first(),
    page.getByText('Quản lý Tỉnh', { exact: true }).first(),
    page.getByText('Cửa hàng trưởng', { exact: true }).first(),
  ], 6000);

  if (!clicked) {
    test.info().annotations.push({
      type: 'OBSERVED_SCOPE_FALLBACK',
      description: 'Không thấy role cung ứng/Admin, fallback sang đơn vị đầu tiên có thể click.',
    });
    await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first().click();
  }

  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function ensureLoggedIn(page) {
  const text = await visibleText(page, 1200);
  if (/Đăng nhập|Tên đăng nhập|Mật khẩu/.test(text)) {
    await login(page);
    await selectSupplyScope(page);
  }
}

async function gotoWithFallback(page, urls, expectedTexts) {
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await ensureLoggedIn(page);
    const text = await visibleText(page, 2500);
    if (!/404|Trang bạn truy cập không tồn tại|Error code 522|Connection timed out/i.test(text)) {
      if (expectedTexts.some((pattern) => pattern.test(text))) return true;
    }
  }
  return false;
}

async function openByMenu(page, labels, expectedTexts = []) {
  await page.keyboard.press('Escape').catch(() => {});
  for (const label of labels) {
    await clickFirstVisible(page, [page.getByText(label, { exact: false }).first()], 2000);
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  if (expectedTexts.length === 0) return true;
  const text = await visibleText(page, 2500);
  return expectedTexts.some((pattern) => pattern.test(text));
}

async function openModule(page, urls, menuLabels, expectedTexts) {
  if (await gotoWithFallback(page, urls, expectedTexts)) return;
  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await ensureLoggedIn(page);
  if (await openByMenu(page, menuLabels, expectedTexts)) return;
  const text = await visibleText(page, 2500);
  throw new Error(`Không mở được module. URL=${page.url()} TEXT=${text}`);
}

async function closeOverlay(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
  await clickFirstVisible(page, [
    page.getByRole('button', { name: /hủy|huỷ|đóng|cancel/i }).first(),
    page.locator('.ant-drawer-close, .ant-modal-close').first(),
  ], 1000);
}

async function expectAnyText(page, patterns) {
  const text = await visibleText(page, 5000);
  expect(text).toMatch(new RegExp(patterns.map((p) => p.source || p).join('|'), 'i'));
}

async function annotateNoData(description) {
  test.info().annotations.push({ type: 'OBSERVED_NO_DATA', description });
}

module.exports = {
  ACCOUNT,
  PASSWORD,
  TARGET,
  annotateNoData,
  clickFirstVisible,
  closeOverlay,
  ensureLoggedIn,
  expectAnyText,
  login,
  openModule,
  selectSupplyScope,
  visibleText,
};
