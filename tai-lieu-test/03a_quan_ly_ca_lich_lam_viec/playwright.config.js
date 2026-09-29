const { defineConfig, devices } = require('@playwright/test');
const { qcXoaGrepInvert } = require('../shared/qc-xoa');
const path = require('node:path');
const { BASE_URL } = require('../shared/vnpost-config');
const { storageStateFor } = require('../shared/auth/accounts');

const DOC_ROOT = __dirname;

/** 03a — Quản lý ca và lịch làm việc. Mã phân hệ lấy theo `resource/hdsd/hdsd03a_quan_ly_ca_lich_lam_viec/`. */
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
    // 🔴 Vai chạy thật là `shop`, KHÔNG phải `ward` như HDSD khai. Lý do đo được 20/09/2026:
    //    `ward` chưa có tài khoản trong `.env`; `province` (qltls01) mở được màn nhưng phạm vi của
    //    nó KHÔNG có ca nào (`/timekeeping/shift-all` trả rỗng) ⇒ mọi case sẽ "pass rỗng".
    //    Vai `shop` (chtls01, shopId 68056) có 2 ca, có lịch và có 3 ca đã chốt.
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
    // Case GHI lịch làm việc chạy trên điểm bán seed (`AUTO_SHOP_62391304`), 🚫 không trên Lý Sơn.
    {
      name: 'seed_shop',
      dependencies: ['setup'],
      testMatch: /.*\.seed_shop\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('seed_shop') },
    },
    {
      name: 'gdv',
      dependencies: ['setup'],
      testMatch: /.*\.gdv\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('gdv') },
    },
  ],
});
