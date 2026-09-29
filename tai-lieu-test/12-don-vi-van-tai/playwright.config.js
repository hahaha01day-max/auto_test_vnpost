const { defineConfig, devices } = require('@playwright/test');
const { qcXoaGrepInvert } = require('../shared/qc-xoa');
const path = require('node:path');
const { BASE_URL } = require('../shared/config');
const { storageStateFor } = require('../shared/auth/accounts');

const DOC_ROOT = __dirname;

module.exports = defineConfig({
  testDir: path.join(DOC_ROOT, 'tests'),
  // Case QC đã xoá (cột `Trang thai QC` = QC_XOA) — loại khỏi lượt chạy, spec giữ nguyên.
  grepInvert: qcXoaGrepInvert(DOC_ROOT),
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  outputDir: path.join(DOC_ROOT, 'test-output/playwright-results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(DOC_ROOT, 'test-output/playwright-report'), open: 'never' }],
    // Reporter json — `tool/bin/cap-nhat-trang-thai.js` đọc file này để ghi cột `Trang thai chay`.
    ['json', { outputFile: path.join(DOC_ROOT, 'test-output/playwright-results/results.json') }],
  ],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testDir: path.join(DOC_ROOT, '..', 'shared', 'auth'),
      testMatch: /roles\.setup\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Spec gốc của phân hệ — giữ nguyên tên project `chromium` để lịch sử chạy cũ còn đọc được.
      name: 'chromium',
      dependencies: ['setup'],
      testMatch: /delivery-unit\.standard\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Spec ghi bổ sung 26/09/2026 (van-tai-ghi.tct) — vai TCT, storageState riêng.
      name: 'tct',
      dependencies: ['setup'],
      testMatch: /.*\.tct\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('tct') },
    },
    {
      // 🔴 Nhóm `070` (đơn vận chuyển mở từ phiếu chuyển kho) chạy bằng vai điểm bán.
      name: 'shop',
      dependencies: ['setup'],
      testMatch: /.*\.shop\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('shop') },
    },
  ],
});
