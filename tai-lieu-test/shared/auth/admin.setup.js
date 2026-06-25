const fs = require('node:fs');
const { test: setup, expect } = require('@playwright/test');
const { ADMIN_STORAGE_STATE, AUTH_DIR, requireEnv } = require('../config');

setup('đăng nhập và lưu session Admin', async ({ page }) => {
  requireEnv(['VNPOST_ACCOUNT', 'VNPOST_PASSWORD']);
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const password = page.locator('input[type="password"]').first();
  await expect(password).toBeVisible({ timeout: 25_000 });

  const username = page.locator('input:visible:not([type="password"])').first();
  await username.fill(process.env.VNPOST_ACCOUNT);
  await password.fill(process.env.VNPOST_PASSWORD);
  await page.getByRole('button', { name: /tiếp tục|đăng nhập|login|sign in/i }).click();

  const scopeLabel = process.env.VNPOST_SCOPE_LABEL || 'Admin';
  const scope = page.getByText(scopeLabel, { exact: true }).first();
  await expect(scope).toBeVisible({ timeout: 30_000 });
  await scope.click();

  await expect(page).not.toHaveURL(/\/account(?:\?|$)/, { timeout: 30_000 });
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
