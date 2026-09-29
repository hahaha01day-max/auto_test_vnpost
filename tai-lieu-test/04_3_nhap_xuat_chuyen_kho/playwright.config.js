const { defineConfig, devices } = require('@playwright/test');
const { qcXoaGrepInvert } = require('../shared/qc-xoa');
const path = require('node:path');
const { BASE_URL } = require('../shared/vnpost-config');
const { storageStateFor } = require('../shared/auth/accounts');

const DOC_ROOT = __dirname;

/** 04_3 — Nhập kho, xuất kho và chuyển kho — mã phân hệ lấy theo `resource/hdsd/`. */
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
    // 🔴 Ba vai, ba phạm vi khác hẳn nhau: `shop` chỉ thấy kho của mình, `province` có ô lọc điểm
    //    bán, `tct` thấy toàn mạng lưới. Gộp một project là mất hết ý nghĩa của case phạm vi.
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
      // Nhân viên thứ hai (Giao dịch viên) của điểm bán seed — có `CREATE_IMPORT_STOCK`
      // (Cửa hàng trưởng bị tắt quyền này). Mọi case ghi kho chạy ở đây, 🚫 không trên Lý Sơn.
      name: 'seed_gdv',
      dependencies: ['setup'],
      testMatch: /.*\.seed_gdv\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('seed_gdv') },
    },
    {
      // Giao dịch viên POS (bán + hoàn trả) — 050_005/006 dựng đơn hoàn trả thật (helper 18_5 `doi-tra.js`).
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
