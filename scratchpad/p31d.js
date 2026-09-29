const { chromium } = require('playwright');
require('../tai-lieu-test/shared/config');
const { storageStateFor } = require('../tai-lieu-test/shared/auth/accounts');
const { moTrang } = require('../tai-lieu-test/shared/auth/login');
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ storageState: storageStateFor('tct') });
  const page = await c.newPage();
  await moTrang(page, process.env.VNPOST_BASE_URL + '/role-management/function', 'tct');
  await page.waitForTimeout(7000);
  const m = page.locator('main');
  console.log('MAIN classes', await m.locator('div').evaluateAll(l=>[...new Set(l.map(e=>typeof e.className==='string'?e.className:'').filter(c=>c&&c.includes('ant-')))].slice(0,20)));
  console.log('tables', await m.locator('.ant-table').count(), 'rows', await m.locator('.ant-table-tbody tr').count(), 'ant-table-row', await m.locator('.ant-table-tbody tr.ant-table-row').count());
  console.log('classes rows', await m.locator('.ant-table-tbody tr').evaluateAll(l=>l.slice(0,6).map(e=>e.className)));
  console.log('row0', (await m.locator('.ant-table-tbody tr').first().innerHTML().catch(()=>'')).slice(0,400));
  console.log('rowHasBtn', await m.locator('.ant-table-tbody tr').evaluateAll(l=>l.slice(0,8).map(e=>({t:(e.innerText||'').slice(0,40).replace(/\n/g,'|'), b:e.querySelectorAll('button').length}))));
  await b.close();
})();
