const { chromium } = require('playwright');
require('./tai-lieu-test/shared/config');
const { storageStateFor } = require('./tai-lieu-test/shared/auth/accounts');
const { moTrang } = require('./tai-lieu-test/shared/auth/login');
const { batHeader } = require('./tai-lieu-test/04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const vai = process.argv[2]||'shop';
(async () => {
const b = await chromium.launch();
const c = await b.newContext({ storageState: storageStateFor(vai) });
const page = await c.newPage();
const st = batHeader(page);
await moTrang(page, process.env.VNPOST_BASE_URL + (process.argv[4]||'/inventory/import'), vai);
await page.waitForTimeout(4000);
const B=process.env.VNPOST_BASE_URL;
const get=async(u,p)=> (await page.request.get(B+'/__api'+u,{headers:st.h,params:p})).json();
const code = require('fs').readFileSync(process.argv[3],'utf8');
try { await eval('(async()=>{'+code+'})()'); } catch(e){ console.log('ERR',e.message.slice(0,500)); await page.screenshot({path:'/private/tmp/claude-501/pr/err.png'}); }
await b.close();
})();
