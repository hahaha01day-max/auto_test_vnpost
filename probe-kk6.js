const { chromium } = require("playwright");
require("./tai-lieu-test/shared/config");
const k = require("./tai-lieu-test/04_3_nhap_xuat_chuyen_kho/tests/ghi-kho");
const ExcelJS=require('exceljs');
(async()=>{const b=await chromium.launch();const p=await k.moPhienPhu(b,'shop');
for (const inc of ['true','false']){
const r=await p.page.request.get(process.env.VNPOST_BASE_URL+`/__api/stock/v3/inventory-check/template?shopId=68152&inventoryId=&includeStock=${inc}`,{headers:p.st.h});
const buf=await r.body(); console.log(inc,r.status(),r.headers()['content-type'],buf.length);
try{const wb=new ExcelJS.Workbook(); await wb.xlsx.load(buf); for(const ws of wb.worksheets){console.log('SHEET',ws.name,ws.rowCount); ws.eachRow((row,i)=>{if(i<=20)console.log(i,JSON.stringify(row.values))});}}catch(e){console.log(buf.toString().slice(0,300))}}
await b.close()})();
