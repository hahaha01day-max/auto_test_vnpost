const { chromium } = require('playwright');
require('../tai-lieu-test/shared/config');
const { storageStateFor } = require('../tai-lieu-test/shared/auth/accounts');
const { moTrang } = require('../tai-lieu-test/shared/auth/login');
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ storageState: storageStateFor('province') });
  const page = await c.newPage();
  await moTrang(page, process.env.VNPOST_BASE_URL + '/debt-reconciliation/employee-debt', 'province');
  await page.waitForTimeout(6000);
  const o = page.locator('main .ant-select').filter({ hasText: /điểm bán/i }).first();
  console.log('count select', await o.count());
  await o.click({force:true});
  await page.waitForTimeout(4000);
  console.log('drawer', await page.locator('.ant-drawer-open').count(), 'dropdown', await page.locator('.ant-select-dropdown').count());
  const dr = page.locator('.ant-drawer-open').last();
  if (await dr.count()) {
    console.log('TITLE', await dr.locator('.ant-drawer-title').innerText().catch(()=>''));
    console.log('CLASSES', await dr.locator('div').evaluateAll(l=>[...new Set(l.map(e=>e.className).filter(c=>typeof c==='string'&&c&&!c.includes('ant-')))].slice(0,25)));
    console.log('TEXT', (await dr.innerText()).replace(/\n+/g,' | ').slice(0,700));
    const cot=(i)=>dr.locator('.sp-column').nth(i);
    console.log('COT0', await cot(0).locator('.sp-item').allInnerTexts());

    console.log('KHONG bam tinh -> COT1', await cot(1).locator('.sp-item').allInnerTexts(), 'COT2 radio', await cot(2).locator('.ant-radio-wrapper').count(), 'COT2 item', await cot(2).locator('.sp-item').allInnerTexts());
    await cot(1).locator('.sp-item').first().click(); await page.waitForTimeout(3000);
    console.log('sau chon xa -> COT2 radio', await cot(2).locator('.ant-radio-wrapper').count(), 'items', await cot(2).locator('.sp-item').allInnerTexts(), 'TEXT2', (await cot(2).innerText()).replace(/\n+/g,' | '));
  } else {
    const dd = page.locator('.ant-select-dropdown').last();
    console.log('DD TEXT', (await dd.innerText().catch(()=>'')).slice(0,400));
  }
  await b.close();
})();
