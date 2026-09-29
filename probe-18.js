const { chromium } = require('playwright');
require('./tai-lieu-test/shared/config');
const { moTrang } = require('./tai-lieu-test/shared/auth/login');
const route = process.argv[2], vai = process.argv[3] || 'gdv';
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, baseURL: process.env.VNPOST_BASE_URL });
  const page = await c.newPage();
  let loi = null;
  try { await moTrang(page, route, vai); } catch (e) { loi = e.message.slice(0, 90); }
  await page.waitForTimeout(8000);
  const m = page.locator('body');
  console.log('==', route, vai, loi ? 'LỖI: ' + loi : page.url());
  console.log('title:', await page.locator('.ant-page-header-heading-title').allInnerTexts());
  console.log('modal:', await page.locator('.ant-modal-wrap:visible').count(), (await page.locator('.ant-modal-wrap:visible').last().innerText().catch(() => '')).replace(/\n+/g, ' | ').slice(0, 150));
  console.log('buttons:', (await m.getByRole('button').allInnerTexts()).slice(0, 8));
  console.log('inputs:', (await m.locator('input[placeholder]').evaluateAll((l) => l.map((e) => e.placeholder))).slice(0, 8));
  console.log('text:', (await m.innerText()).replace(/\n+/g, ' | ').slice(0, 300));
  await b.close();
})();
