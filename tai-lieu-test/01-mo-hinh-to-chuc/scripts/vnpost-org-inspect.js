// Script inspect/debug UI và network cho module Mô hình tổ chức.
// Mục đích: mở module, mở form Thêm đơn vị, lưu text màn hình, network log và screenshot.
// Dùng khi cần dò selector/API trước khi viết hoặc sửa E2E test.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const DOC_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(DOC_ROOT, 'test-output/inspect');

async function readCredentials() {
  // Đọc account/password từ stdin, không ghi credential vào file.
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const lines = [];
  for await (const line of rl) {
    lines.push(line);
    if (lines.length >= 2) break;
  }
  rl.close();
  return { username: lines[0], password: lines[1] };
}

async function main() {
  const { username, password } = await readCredentials();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const logs = [];

  // Ghi lại request liên quan organization/import/export để dò endpoint.
  page.on('request', req => {
    const url = req.url();
    if (/api|organization|chain|store|shop|excel|import|export/i.test(url)) {
      logs.push({ type: 'request', method: req.method(), url, postData: req.postData() });
    }
  });

  // Ghi lại response liên quan organization/import/export, cắt body để log không quá lớn.
  page.on('response', async res => {
    const url = res.url();
    if (/api|organization|chain|store|shop|excel|import|export/i.test(url)) {
      let body = '';
      try {
        const ct = res.headers()['content-type'] || '';
        if (/json|text/.test(ct)) body = (await res.text()).slice(0, 1000);
      } catch (_) {}
      logs.push({ type: 'response', status: res.status(), url, body });
    }
  });

  // Login và vào module Mô hình tổ chức.
  await page.goto('https://vnpost.sfin.vn/', { waitUntil: 'domcontentloaded' });
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 20000 });
  const inputs = page.locator('input:visible');
  const count = await inputs.count();
  let usernameInput = null;
  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    const type = (await input.getAttribute('type')) || '';
    if (type !== 'password') {
      usernameInput = input;
      break;
    }
  }
  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /tiếp tục/i }).click();
  await page.waitForTimeout(2500);
  await page.getByText('Admin', { exact: true }).click();
  await page.waitForTimeout(2500);
  await page.getByText('Quản lý chuỗi').click();
  await page.getByText('Mô hình tổ chức').click();
  await page.waitForTimeout(3000);

  // Mở chi tiết root và form Thêm đơn vị để inspect DOM/text/network.
  await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first().click();
  await page.waitForTimeout(1000);
  await page.getByText('Thêm đơn vị', { exact: false }).first().click();
  await page.waitForTimeout(1000);
  const html = await page.locator('body').innerText();
  // Output phục vụ debug thủ công.
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'inspect-text.txt'), html);
  fs.writeFileSync(path.join(OUT_DIR, 'inspect-network.json'), JSON.stringify(logs, null, 2));
  await page.screenshot({ path: path.join(OUT_DIR, 'inspect-add-form.png'), fullPage: true });
  await browser.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
