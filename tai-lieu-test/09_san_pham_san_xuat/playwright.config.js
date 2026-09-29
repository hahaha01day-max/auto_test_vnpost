const { defineConfig, devices } = require('@playwright/test');
const { qcXoaGrepInvert } = require('../shared/qc-xoa');
const path = require('node:path');
const { BASE_URL } = require('../shared/vnpost-config');
const { storageStateFor } = require('../shared/auth/accounts');

const DOC_ROOT = __dirname;

/** 09 — Sản xuất sản phẩm. Mã phân hệ lấy theo `resource/hdsd/hdsd09_san_pham_san_xuat/`. */
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
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    // 🔴 Mỗi vai một project + storageState riêng: gộp một project là mất ý nghĩa của case phạm vi.
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
      name: 'province',
      dependencies: ['setup'],
      testMatch: /.*\.province\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('province') },
    },
    {
      // GDV của điểm bán seed — có `CREATE_IMPORT_STOCK`, là quyền nút "Tạo phiếu sản xuất" và
      // "Xác nhận" (`ProductionListPage.jsx`). Cửa hàng trưởng bị tắt quyền này.
      name: 'seed_gdv',
      dependencies: ['setup'],
      testMatch: /.*\.seed_gdv\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('seed_gdv') },
    },
    {
      name: 'gdv',
      dependencies: ['setup'],
      testMatch: /.*\.gdv\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('gdv') },
    },
  ],
});
