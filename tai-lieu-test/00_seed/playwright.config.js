const { defineConfig, devices } = require('@playwright/test');
const { qcXoaGrepInvert } = require('../shared/qc-xoa');
const path = require('node:path');
const { BASE_URL } = require('../shared/vnpost-config');
const { storageStateFor } = require('../shared/auth/accounts');

const DOC_ROOT = __dirname;

/**
 * 00_seed — SINH DỮ LIỆU NỀN qua giao diện FE.
 *
 * 🔴 Chạy NỐI TIẾP, 1 worker, 🚫 không song song: bước sau đọc bản ghi bước trước vừa tạo
 * (xã cần tỉnh, điểm bán cần xã, bảng giá cần sản phẩm). Song song là đọc sổ rỗng.
 * 🔴 `retries: 0` — chạy lại một bước tạo là đẻ thêm bản ghi trùng, không phải chữa lỗi.
 */
// 🔴 Hậu tố làn cho output/report: seed nhiều làn song song dùng chung thư mục là xoá artifact của nhau.
const LAN = process.env.VNPOST_LANE ? `-lane${process.env.VNPOST_LANE}` : '';

module.exports = defineConfig({
  testDir: path.join(DOC_ROOT, 'tests'),
  // Case QC đã xoá (cột `Trang thai QC` = QC_XOA) — loại khỏi lượt chạy, spec giữ nguyên.
  grepInvert: qcXoaGrepInvert(DOC_ROOT),
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: path.join(DOC_ROOT, `test-output/playwright-results${LAN}`),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(DOC_ROOT, `test-output/playwright-report${LAN}`), open: 'never' }],
    ['json', { outputFile: path.join(DOC_ROOT, `test-output/playwright-results${LAN}/results.json`) }],
  ],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
      name: 'tct',
      dependencies: ['setup'],
      testMatch: /.*\.tct\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('tct') },
    },
    {
      // 🔴 Vai NHÂN VIÊN SEED — 🚫 KHÔNG dùng `storageState`: tài khoản này sinh ra trong chính
      //    lượt seed, không có file session, và phải đăng nhập trong context của chính nó.
      // 🔴 🚫 KHÔNG khai `dependencies`: Playwright chạy **toàn bộ** spec của project phụ thuộc,
      //    KHÔNG lọc theo `--grep`. Đã đo 22/09/2026: chạy `--grep "probe nk"` mà bộ seed 1→7 chạy
      //    lại từ đầu, đẻ thêm một bộ dữ liệu `AUTO_` mới (runId 62391304) và GHI ĐÈ sổ — mà điểm
      //    bán, nhân viên, đơn vị tổ chức thì KHÔNG XOÁ ĐƯỢC. Vai này tự đăng nhập nên không cần
      //    session của vai nào cả.
      name: 'seedshop',
      testMatch: /.*\.seed\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'shop',
      dependencies: ['tct'],
      testMatch: /.*\.shop\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('shop') },
    },
  ],
});
