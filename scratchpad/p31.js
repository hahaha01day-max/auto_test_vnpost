const { chromium } = require('playwright');
require('../tai-lieu-test/shared/config');
const { storageStateFor } = require('../tai-lieu-test/shared/auth/accounts');
const { moTrang } = require('../tai-lieu-test/shared/auth/login');
const ROUTES = [['tct','/role-management'],['tct','/role']];
(async () => {
  const b = await chromium.launch();
  for (const [vai, r] of ROUTES) {
    const c = await b.newContext({ storageState: storageStateFor(vai) });
    const page = await c.newPage();
    const api=[];
    page.on('response', x=>{ if(/__api\/report|__api\/.*report/i.test(x.url())) api.push(x.request().method()+' '+x.status()+' '+x.url().replace(/^https?:\/\/[^/]+/,'').slice(0,110)); });
    await moTrang(page, process.env.VNPOST_BASE_URL + r, vai);
    await page.waitForTimeout(7000);
    console.log('====', vai, r, '->', page.url().replace(/^https?:\/\/[^/]+/,''));
    console.log('TITLE', (await page.locator('.ant-page-header-heading-title').allInnerTexts()).join(' | '));
    console.log('TABS', (await page.locator('main .ant-tabs-tab').allInnerTexts()).join(' · '));
    console.log('COLS', (await page.locator('main .ant-table-thead th').allInnerTexts()).join(' · ').slice(0,200));
    console.log('ROWS', await page.locator('main .ant-table-tbody tr.ant-table-row').count());
    console.log('INPUTS', await page.locator('main input').evaluateAll(l=>l.map(e=>e.placeholder).filter(Boolean)));
    console.log('SELECTS', (await page.locator('main .ant-select').allInnerTexts()).join(' | ').slice(0,200));
    console.log('BTNS', (await page.locator('main button').allInnerTexts()).join(' | ').slice(0,200));
    console.log('API', api.slice(0,6).join('\n'));
    await c.close();
  }
  await b.close();
})();
