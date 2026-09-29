const { chromium } = require('playwright');
require('../tai-lieu-test/shared/config');
const { storageStateFor } = require('../tai-lieu-test/shared/auth/accounts');
const { moTrang } = require('../tai-lieu-test/shared/auth/login');
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ storageState: storageStateFor('gdv') });
  const page = await c.newPage();
  await moTrang(page, process.env.VNPOST_BASE_URL + '/customer', 'gdv');
  await page.waitForTimeout(7000);
  const cell = page.locator('.ant-table-tbody tr.ant-table-row').first().locator('td').nth(2);
  console.log('CELL HTML', (await cell.innerHTML()).slice(0,300));
  const row = page.locator('.ant-table-tbody tr.ant-table-row').first();
  console.log('ROW HTML', (await row.innerHTML()).slice(0,600));
  // thử bấm mã khách hàng (cột 1)
  await row.locator('td').nth(1).click(); await page.waitForTimeout(3000);
  console.log('URL sau bấm mã', page.url());
  await b.close();
})();
