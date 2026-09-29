const { defineConfig, devices } = require('@playwright/test');
const { qcXoaGrepInvert } = require('../shared/qc-xoa');
const path = require('node:path');
const { BASE_URL } = require('../shared/vnpost-config');
const { storageStateFor } = require('../shared/auth/accounts');

const DOC_ROOT = __dirname;

/** 02 — Quản lý nhân viên — mã phân hệ lấy theo `resource/hdsd/`. */
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
    // 🔴 `video: 'on'` quay cả case xanh — tốn thời gian và đầy đĩa. Chỉ giữ video case đỏ.
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    // 🔴 Mỗi vai một project + một storageState riêng. Chạy cả phân hệ bằng một tài khoản là
    //    PASS GIẢ: `tct` thấy toàn mạng lưới nên case phạm vi dữ liệu luôn xanh mà không kiểm
    //    được gì. Quy ước tên file: `<ten>.<vai>.spec.js`.
    {
      name: 'setup',
      testDir: path.join(DOC_ROOT, '..', 'shared', 'auth'),
      testMatch: /roles\.setup\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'tct',
      dependencies: ['setup'],
      testMatch: /.*\.tct\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('tct') },
    },
    {
      name: 'province',
      dependencies: ['setup'],
      // 🔴 Phải loại `*.province_manager.spec.js`, nếu không project này nuốt luôn file của vai kia
      //    (regex `.province.` khớp cả hai) và case chạy bằng SAI tài khoản mà vẫn xanh.
      testMatch: /(?<!_manager)\.province\.spec\.js$/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('province') },
    },
    {
      // Vai `PROVINCE_MANAGER` — đo trên AUTHEN 22/09/2026: **không có** `VIEW_ALL_EMPLOYEE`.
      // Đây là vai duy nhất trong bộ tài khoản sẵn có thiếu quyền đó, nên case `02_010_027`
      // bắt buộc chạy ở đây, 🚫 không chạy bằng `province` (vai đó CÓ quyền).
      name: 'province_manager',
      dependencies: ['setup'],
      testMatch: /.*\.province_manager\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('province_manager') },
    },
  ],
});
