// Script debug danh sách file JavaScript đang được website load.
// Dùng khi cần dò bundle frontend để tìm endpoint/API hoặc logic UI.
// Output: tai-lieu-test/01-mo-hinh-to-chuc/test-output/full/loaded-scripts.txt
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const DOC_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(DOC_ROOT, 'test-output/full');

async function readCredentials() {
  // Đọc account/password từ stdin để không hard-code credential.
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const lines = [];
  for await (const line of rl) {
    lines.push(line);
    if (lines.length >= 2) break;
  }
  rl.close();
  return { username: lines[0], password: lines[1] };
}

async function login(page, username, password) {
  // Login tối thiểu để frontend load đủ bundle sau khi vào module.
  await page.goto('https://vnpost.sfin.vn/', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="password"]').first().waitFor();

  const inputs = page.locator('input:visible');
  let usernameInput;
  for (let i = 0; i < await inputs.count(); i++) {
    const input = inputs.nth(i);
    if (((await input.getAttribute('type')) || '') !== 'password') {
      usernameInput = input;
      break;
    }
  }

  await usernameInput.fill(username);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /tiếp tục/i }).click();
  await page.waitForTimeout(2500);
  await page.getByText('Admin', { exact: true }).click();
  await page.waitForTimeout(2000);
}

async function main() {
  const { username, password } = await readCredentials();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await login(page, username, password);
  await page.goto('https://vnpost.sfin.vn/chain/organization-management', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  // Lấy toàn bộ script src hiện có trong document.
  const srcs = await page.evaluate(() => Array.from(document.scripts).map((script) => script.src).filter(Boolean));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'loaded-scripts.txt'), srcs.join('\n'));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
