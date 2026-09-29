const { defineConfig, devices } = require('@playwright/test');
const { qcXoaGrepInvert } = require('../shared/qc-xoa');
const path = require('node:path');
const { BASE_URL } = require('../shared/vnpost-config');
const { storageStateFor } = require('../shared/auth/accounts');

const DOC_ROOT = __dirname;

/**
 * Luồng công nợ điểm bán ↔ Tỉnh đi qua NHIỀU VAI, mỗi vai một session riêng.
 *
 * 🔴 Project `setup` đăng nhập từng vai một lần rồi lưu `.auth/<vai>.json`; các project sau
 * `dependencies: ['setup']` nên chạy `--project=province` vẫn tự đăng nhập trước.
 * 🚫 Không gộp nhiều vai vào một project: hai vai dùng chung storageState là vai chạy sau ghi đè
 * vai chạy trước, và pass/fail trở thành ngẫu nhiên theo thứ tự chạy.
 *
 * Quy ước tên file: `<ten>.<vai>.spec.js` — đọc tên file là biết case chạy bằng ai.
 */
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
    {
      name: 'setup',
      testDir: path.join(DOC_ROOT, '..', 'shared', 'auth'),
      testMatch: /roles\.setup\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    // 🔴 `shop` chạy TRƯỚC `province` — 🚫 không đảo lại. Điểm bán phải kịp khai bản nháp của chính
    //    mình TRƯỚC khi Tỉnh ký: ký xong là số nợ đầu kỳ chốt, và mọi bản khai mới cho cùng điểm bán
    //    đều bị chặn (đúng nghiệp vụ, xem CNDB-ND-009). Đảo thứ tự thì CNDB-ND-007 vĩnh viễn không
    //    còn bản nháp nào để kiểm, và nó sẽ SKIP — 🔴 skip lặng lẽ, trông như case vô hại.
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
  ],
});
