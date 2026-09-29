const { chromium } = require('playwright');
require('../tai-lieu-test/shared/config');
const { storageStateFor } = require('../tai-lieu-test/shared/auth/accounts');
const { moTrang } = require('../tai-lieu-test/shared/auth/login');
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ storageState: storageStateFor('tct') });
  const page = await c.newPage();
  const api=[];
  page.on('response', x=>{ if(x.url().includes('/__api/')) api.push(x.status()+' '+x.url().replace(/^https?:\/\/[^/]+/,'').slice(0,120)); });
  await moTrang(page, process.env.VNPOST_BASE_URL + '/role-management/function', 'tct');
  await page.waitForTimeout(7000);
  console.log(api.join('\n'));
  console.log('TREE nodes', await page.locator('main .ant-tree-treenode, main .ant-collapse-item, main tr').count());
  console.log('TEXT', (await page.locator('main').innerText()).replace(/\n+/g,' | ').slice(0,700));
  await b.close();
})();
