const { chromium } = require("playwright");
require("./tai-lieu-test/shared/config");
const { storageStateFor } = require("./tai-lieu-test/shared/auth/accounts");
const kk = require("./tai-lieu-test/04_4_kiem_kho/tests/kiem-kho-ghi");
const k = require("./tai-lieu-test/04_3_nhap_xuat_chuyen_kho/tests/ghi-kho");
(async()=>{const b=await chromium.launch();const c=await b.newContext({storageState:storageStateFor("shop"),viewport:{width:1440,height:1000},acceptDownloads:true});const page=await c.newPage();
const st=k.batHeader(page);
page.on('request',r=>{if(/inventory-check|template/.test(r.url()))console.log('REQ',r.method(),r.url().slice(40,200))});
const sid=await kk.moPhien(page,'shop'); const tid=await kk.themPhieu(page);
await page.getByRole('button',{name:'Tải mẫu'}).click(); await page.waitForTimeout(1500);
console.log(await page.locator('.ant-dropdown:visible, .ant-modal-wrap:visible, .ant-popover:visible').allInnerTexts());
const dl=page.waitForEvent('download',{timeout:15000}).catch(()=>null);
const opt=page.locator('.ant-dropdown:visible li, .ant-modal-wrap:visible button').filter({hasText:/dữ liệu|tồn|sẵn/i}).first(); if(await opt.count()) await opt.click();
const d=await dl; if(d){await d.saveAs('/private/tmp/claude-501/pr/mau.xlsx');console.log('saved',d.suggestedFilename());}
await kk.huyPhien(page,st,68152,sid); await b.close()})();
