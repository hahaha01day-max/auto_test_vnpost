const { defineConfig, devices } = require('@playwright/test');
const { qcXoaGrepInvert } = require('../shared/qc-xoa');
const path = require('node:path');
const { storageStateFor } = require('../shared/auth/accounts');
const { BASE_URL } = require('../shared/vnpost-config');

const DOC_ROOT = __dirname;

/** 20 — Khách hàng thân thiết — mã phân hệ lấy theo `resource/hdsd/`. */
module.exports = defineConfig({
  testDir: path.join(DOC_ROOT, 'tests'),
  // Case QC đã xoá (cột `Trang thai QC` = QC_XOA) — loại khỏi lượt chạy, spec giữ nguyên.
  grepInvert: qcXoaGrepInvert(DOC_ROOT),
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  outputDir: path.join(DOC_ROOT, 'test-output/playwright-results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(DOC_ROOT, 'test-output/playwright-report'), open: 'never' }],
    ['json', { outputFile: path.join(DOC_ROOT, 'test-output/playwright-results/results.json') }],
  ],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
    video: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    // 🔴 Mỗi vai một project + storageState riêng.
    {
      name: 'setup',
      testDir: path.join(DOC_ROOT, '..', 'shared', 'auth'),
      testMatch: /roles\.setup\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'shop',
      dependencies: ['setup'],
      testMatch: /.*\.shop\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('shop') },
    },
    {
      name: 'gdv',
      dependencies: ['setup'],
      testMatch: /.*\.gdv\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('gdv') },
    },
    {
      name: 'province',
      dependencies: ['setup'],
      testMatch: /.*\.province\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('province') },
    },
    {
      name: 'tct',
      dependencies: ['setup'],
      testMatch: /.*\.tct\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('tct') },
    },
  ],
});
