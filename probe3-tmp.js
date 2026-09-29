const { chromium } = require('playwright');
process.env.VNPOST_LANE='8';
require('./tai-lieu-test/shared/config');
const k = require('./tai-lieu-test/04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
(async()=>{
const b = await chromium.launch();
const p = await k.moPhienPhu(b, 'shop', '/debt-reconciliation/supplier-debt');
const r = await k.goiGhi(p.page,{h:{...p.st.h, shopid:'68152'}},'PUT','/shops/supplier-debt/adjustment/477/reject',{shopId:68152, reason:'AUTO TEST lap sai'});
console.log(JSON.stringify(r).slice(0,300));
await p.dong(); await b.close();})();
