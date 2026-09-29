const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');
const { BASE_URL } = require('../shared/vnpost-config');

/**
 * 00_seed — bản API (`api-tests/`). Mỗi spec tự đăng nhập bằng `moPhienApi` ⇒ 🚫 KHÔNG có project
 * setup (setup đăng nhập MỌI vai trong VNPOST_SETUP_ROLES — lọt tài khoản chung là giẫm phiên khác).
 * Nối tiếp, 1 worker, retries 0 — như bản giao diện.
 */
// 🔴 Hậu tố làn cho thư mục output: seed nhiều làn SONG SONG mà dùng chung một outputDir thì Playwright
//    xoá outputDir lúc khởi động ⇒ làn này xoá trace đang ghi của làn kia (ENOENT .playwright-artifacts).
const LAN = process.env.VNPOST_LANE ? `-lane${process.env.VNPOST_LANE}` : '';

module.exports = defineConfig({
  testDir: path.join(__dirname, 'api-tests'),
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: path.join(__dirname, `test-output/api-results${LAN}`),
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], baseURL: BASE_URL, trace: 'retain-on-failure' },
});
