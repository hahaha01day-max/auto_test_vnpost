// Script cleanup/debug bằng API cho đơn vị tổ chức.
// Dùng khi cần kiểm tra hoặc thử xóa một unitCode cụ thể sau các lượt E2E.
// Lưu ý: đây là script hỗ trợ, full E2E hiện đã tự xóa dữ liệu test do nó tạo.
const { chromium } = require('playwright');
const readline = require('node:readline');

async function readCredentials() {
  // Đọc account/password từ stdin, không lưu credential trong source.
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
  // Login và chọn phạm vi Admin để request API có session hợp lệ.
  await page.goto('https://vnpost.sfin.vn/', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="password"]').first().waitFor();
  const inputs = page.locator('input:visible');
  const count = await inputs.count();
  let userInput;
  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    if (((await input.getAttribute('type')) || '') !== 'password') {
      userInput = input;
      break;
    }
  }
  await userInput.fill(username);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /tiếp tục/i }).click();
  await page.waitForTimeout(2500);
  await page.getByText('Admin', { exact: true }).click();
  await page.waitForTimeout(2500);
}

async function main() {
  // Tham số dòng lệnh là unitCode cần kiểm tra/xóa.
  // Ví dụ: node scripts/vnpost-org-api-cleanup.js 4308
  const code = process.argv[2];
  if (!code) throw new Error('Usage: node scripts/vnpost-org-api-cleanup.js <unitCode>');
  const { username, password } = await readCredentials();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await login(page, username, password);
  // Kiểm tra trạng thái trước khi xóa.
  const before = await page.request.get(`https://vnpost-api.sfin.vn/v1.0/organization-unit/detail?unitCode=${encodeURIComponent(code)}`);
  console.log('GET before', before.status(), await before.text().catch(() => ''));
  // Thử các endpoint DELETE đã dò được. Endpoint nào không đúng sẽ trả 404.
  for (const url of [
    `https://vnpost-api.sfin.vn/v1.0/organization-unit?unitCode=${encodeURIComponent(code)}`,
    `https://vnpost-api.sfin.vn/v1.0/organization-unit/${encodeURIComponent(code)}`,
  ]) {
    const res = await page.request.delete(url);
    console.log(res.status(), url, await res.text().catch(() => ''));
  }
  // Kiểm tra lại sau khi gọi DELETE.
  const after = await page.request.get(`https://vnpost-api.sfin.vn/v1.0/organization-unit/detail?unitCode=${encodeURIComponent(code)}`);
  console.log('GET after', after.status(), await after.text().catch(() => ''));
  await browser.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
