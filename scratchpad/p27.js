const { chromium } = require('playwright');
require('../tai-lieu-test/shared/config');
const { storageStateFor } = require('../tai-lieu-test/shared/auth/accounts');
const { moTrang } = require('../tai-lieu-test/shared/auth/login');
(async () => {
  const b = await chromium.launch();
  for (const vai of ['shop', 'tct']) {
    const c = await b.newContext({ storageState: storageStateFor(vai) });
    const page = await c.newPage();
    const api = [];
    page.on('response', (r) => { if (/reconcile|invoice|supplier/i.test(r.url())) api.push(r.request().method()+' '+r.status()+' '+r.url().slice(0,170)); });
    await moTrang(page, process.env.VNPOST_BASE_URL + '/supplier/invoice-reconcile', vai);
    await page.waitForTimeout(7000);
    console.log('==== ', vai, page.url());
    console.log('TITLE', await page.locator('.ant-page-header-heading-title').allInnerTexts());
    console.log('COLS', (await page.locator('.ant-table-thead th').allInnerTexts()).join(' · '));
    console.log('ROWS', await page.locator('.ant-table-tbody tr.ant-table-row').count());
    console.log('INPUTS', await page.locator('main input').evaluateAll(l=>l.map(e=>e.placeholder)));
    console.log('TABS', (await page.locator('.ant-tabs-tab').allInnerTexts()).join(' · '));
    console.log('SELECTS', (await page.locator('main .ant-select').allInnerTexts()).join(' | '));
    console.log('BTNS', (await page.locator('main button').allInnerTexts()).join(' | '));
    console.log('API', api.join('\n'));
    await c.close();
  }
  await b.close();
})();
