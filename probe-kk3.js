const { chromium } = require("playwright");
require("./tai-lieu-test/shared/config");
const { storageStateFor } = require("./tai-lieu-test/shared/auth/accounts");
const kk = require("./tai-lieu-test/04_4_kiem_kho/tests/kiem-kho-ghi");
const k = require("./tai-lieu-test/04_3_nhap_xuat_chuyen_kho/tests/ghi-kho");
(async()=>{const b=await chromium.launch();const c=await b.newContext({storageState:storageStateFor("shop"),viewport:{width:1440,height:1000}});const page=await c.newPage();
const st=k.batHeader(page);
page.on('framenavigated',f=>{if(f===page.mainFrame())console.log(new Date().toISOString().slice(14,19),'NAV',f.url().slice(40))});
page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,200))});
const sid=await kk.moPhien(page,'shop'); const tid=await kk.themPhieu(page);
await kk.themSp(page,'AUTO8_SP_TC'); await kk.demLo(page,'AUTO8_SP_TC',{'A8L6914817':0});
await page.getByRole('button',{name:'Xác nhận đếm'}).click(); await page.waitForTimeout(4000);
await page.goto(process.env.VNPOST_BASE_URL+`/inventory/inventory-check/session-manage?shopId=68152&sessionId=${sid}`); await page.waitForTimeout(4000);
const rv=await kk.moTongHop(page); await rv.getByRole('button',{name:'Xác nhận chốt phiên'}).click(); await page.waitForTimeout(3000);
const cw=page.locator('.ant-drawer-open').filter({hasText:'Còn lô/serial chưa được kiểm'}).last(); console.log('canh',await cw.isVisible()); await cw.getByRole('button',{name:'Quay lại kiểm tiếp'}).click(); await page.waitForTimeout(2000); await page.goto(process.env.VNPOST_BASE_URL+'/inventory/inventory-check/session-manage?shopId=68152&sessionId='+sid); await page.waitForTimeout(4000);
page.on('response',async r=>{if(/inventory-check/.test(r.url())){console.log('RES',r.request().method(),r.status(),r.url().slice(40,140),(await r.text().catch(()=>'')).slice(0,160))}});
await page.locator('.ant-table-tbody tr.ant-table-row').first().getByRole('button',{name:'Sửa'}).click();
for(let i=0;i<6;i++){await page.waitForTimeout(3000); console.log(new Date().toISOString().slice(14,19),page.url().slice(40), await page.locator('tr[data-row-key]').filter({hasText:'AUTO8_SP_TC'}).count(), await page.locator('.ant-message').allInnerTexts());}
await kk.huyPhien(page,st,68152,sid); await b.close()})();
