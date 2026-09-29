const { chromium } = require('playwright');
require('../tai-lieu-test/shared/config');
const { storageStateFor } = require('../tai-lieu-test/shared/auth/accounts');
const { moTrang } = require('../tai-lieu-test/shared/auth/login');
(async () => {
  const b = await chromium.launch();
  for (const vai of ['province','gdv']) {
    const c = await b.newContext({ storageState: storageStateFor(vai) });
    const page = await c.newPage();
    await moTrang(page, process.env.VNPOST_BASE_URL + '/customer', vai);
    await page.waitForTimeout(7000);
    console.log('====', vai);
    console.log('BTN+aria', await page.locator('main button').evaluateAll(l=>l.map(e=>(e.innerText||'')+'/'+(e.getAttribute('aria-label')||'')+'/'+e.className.slice(0,40))));
    console.log('TEXT', (await page.locator('main').innerText()).replace(/\n+/g,' | ').slice(0,900));
    await c.close();
  }
  await b.close();
})();
