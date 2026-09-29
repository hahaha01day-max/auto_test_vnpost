const { chromium } = require('playwright');
require('../tai-lieu-test/shared/config');
const { storageStateFor } = require('../tai-lieu-test/shared/auth/accounts');
const { moTrang } = require('../tai-lieu-test/shared/auth/login');
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ storageState: storageStateFor('shop') });
  const page = await c.newPage();
  const api=[];
  page.on('response', r=>{ if(/loyalty/i.test(r.url())) api.push(r.request().method()+' '+r.status()+' '+r.url().slice(0,130)); });
  await moTrang(page, process.env.VNPOST_BASE_URL + '/care/loyalty', 'shop');
  await page.waitForTimeout(7000);
  console.log('URL', page.url());
  console.log('TEXT', (await page.locator('main').innerText()).replace(/\n+/g,' | ').slice(0,1200));
  console.log('BTNS', (await page.locator('main button').allInnerTexts()).join(' | '));
  console.log('LINKS', (await page.locator('main a').allInnerTexts()).join(' | '));
  console.log('API', api.join('\n'));
  // mở form tích điểm
  const l = page.getByRole('button', { name: 'Chỉnh sửa' }).first();
  if (await l.count()) { await l.click(); await page.waitForTimeout(4000);
    const d = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
    console.log('FORM?', await d.count(), 'URL', page.url());
    const root = (await d.count()) ? d : page.locator('main');
    console.log('FORM TEXT', (await root.innerText()).replace(/\n+/g,' | ').slice(0,1500));
    console.log('LABELS', (await root.locator('.ant-form-item-label').allInnerTexts()).join(' · '));
    console.log('INPUTS', await root.locator('input').evaluateAll(l=>l.map(e=>e.placeholder+'#'+e.id+'#'+e.type)));
    console.log('FBTNS', (await root.locator('button').allInnerTexts()).join(' | '));
    console.log('TABS', (await root.locator('.ant-tabs-tab').allInnerTexts()).join(' · '));
  }
  await b.close();
})();
