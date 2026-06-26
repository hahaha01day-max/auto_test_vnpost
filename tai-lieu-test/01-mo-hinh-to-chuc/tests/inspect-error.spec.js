const { test, expect } = require('@playwright/test');
const ACCOUNT = process.env.VNPOST_ACCOUNT || '84862036990';
const PASSWORD = process.env.VNPOST_PASSWORD || '123456';

test('Inspect tree contents', async ({ page }) => {
  await page.goto('https://vnpost.sfin.vn/', { waitUntil: 'domcontentloaded' });
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
  await usernameInput.fill(ACCOUNT);
  await passwordInput.fill(PASSWORD);
  await page.getByRole('button', { name: /tiếp tục|đăng nhập/i }).click();
  await page.waitForTimeout(3000);

  const admin = page.getByText('Admin', { exact: true }).first();
  if (await admin.isVisible()) {
    await admin.click();
  } else {
    await page.getByText('Tổng công ty Bưu Điện Việt Nam').first().click();
  }
  await page.waitForLoadState('networkidle');

  await page.goto('https://vnpost.sfin.vn/chain/organization-management');
  await page.waitForLoadState('networkidle');

  // Print all node texts in the tree
  const treeText = await page.locator('.ant-tree').innerText().catch(() => '');
  console.log('--- ALL TREE NODES ---');
  console.log(treeText);

  // Search for "Hàng Bài"
  const search = page.getByPlaceholder(/tìm kiếm/i).first();
  await search.fill('Hàng Bài');
  await page.waitForTimeout(3000);

  const treeTextAfterSearch = await page.locator('.ant-tree').innerText().catch(() => '');
  console.log('--- TREE NODES AFTER SEARCH FOR "Hàng Bài" ---');
  console.log(treeTextAfterSearch);
});
