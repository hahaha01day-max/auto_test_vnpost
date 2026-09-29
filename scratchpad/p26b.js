const { chromium } = require('playwright');
require('../tai-lieu-test/shared/config');
const { storageStateFor } = require('../tai-lieu-test/shared/auth/accounts');
const { moTrang } = require('../tai-lieu-test/shared/auth/login');
(async () => {
  const b = await chromium.launch();
  for (const vai of ['gdv','shop']) {
    const c = await b.newContext({ storageState: storageStateFor(vai) });
    const page = await c.newPage();
    await moTrang(page, process.env.VNPOST_BASE_URL + '/finance/receipt-management', vai);
    await page.waitForTimeout(6000);
    const o = page.locator('main .ant-select').filter({ hasText: 'Chọn nguồn thu' }).first();
    console.log('==',vai,'select count', await o.count(), 'disabled?', await o.evaluate(e=>e.className).catch(()=>''));
    await o.click({force:true}); await page.waitForTimeout(3000);
    const dd = page.locator('.ant-select-dropdown').last();
    console.log('dd count', await page.locator('.ant-select-dropdown').count(), 'items', await dd.locator('.ant-select-item').count());
    console.log('dd text', (await dd.innerText().catch(()=>'(none)')).replace(/\n+/g,' | ').slice(0,300));
    await c.close();
  }
  await b.close();
})();
