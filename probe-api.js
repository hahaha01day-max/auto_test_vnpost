const { chromium } = require("playwright");
require("./tai-lieu-test/shared/config");
const k = require("./tai-lieu-test/04_3_nhap_xuat_chuyen_kho/tests/ghi-kho");
(async()=>{const b=await chromium.launch();const p=await k.moPhienPhu(b,process.argv[2]);
for(const u of process.argv.slice(3)){const r=await k.goiGhi(p.page,p.st,'GET',u);console.log(u,'\n',JSON.stringify(r).slice(0,3000));}
await b.close()})();
