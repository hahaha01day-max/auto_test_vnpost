#!/usr/bin/env node
'use strict';

/**
 * Rót giá trị từ **sổ seed** (`tai-lieu-test/00_seed/seed-state.json`) vào các ô `data` đang TRỐNG
 * của `test-input.json` ở 48 phân hệ.
 *
 * 🔴 Vì sao cần: `skipReason()` xét `required` TRƯỚC khi xét gì khác — một khoá bắt buộc để chuỗi
 *    rỗng là case skip sạch, dù dữ liệu nền đã có thật trong hệ thống. Đo 23/09/2026: **540 khoá
 *    trống** trên 490 case, trong đó `maNCC` (220) và `sku` (128) chiếm hai phần ba — cả hai đều
 *    đã nằm sẵn trong sổ seed.
 *
 * 🔴 🚫 KHÔNG rót theo kiểu "khoá nào trống thì điền đại". Chỉ rót những khoá mà **ngữ nghĩa khớp
 *    chắc chắn** với một mục trong sổ. Khoá mơ hồ (`tenCTKM`, `maPhieuDeXuat`, `maLo`, `maPhieu`…)
 *    🚫 để nguyên: điền bừa là biến "case skip vì thiếu nền" thành "case đỏ vì dữ liệu sai", tức
 *    là đổi một vấn đề nhìn thấy được lấy một vấn đề phải đi dò.
 *
 * 🔴 Giá trị cũ khác rỗng thì **giữ nguyên** — người viết case có thể đã cố ý chọn một bản ghi cụ
 *    thể. Script này chỉ lấp chỗ trống.
 *
 *   node tool/bin/seed-fill-input.js            # chạy thử, chỉ in ra
 *   node tool/bin/seed-fill-input.js --ap-dung  # ghi vào test-input.json
 */

const fs = require('node:fs');
const path = require('node:path');

const { TEST_ROOT } = require('../core/modules');
const { doc: docSo } = require('../../tai-lieu-test/00_seed/seed-state');

const { BAN_DO, BO_QUA_THU_MUC, CAN_NGUOI, NGOAI_LE, layTheoChi } = require('../core/seed-rot');

function main() {
  const apDung = process.argv.includes('--ap-dung');
  const duLieu = docSo().duLieu || {};

  const banDo = BAN_DO.filter((b) => {
    if (CAN_NGUOI[b.khoa]) return false;
    const v = layTheoChi(duLieu, b.chi);
    if (v === undefined || v === null || v === '') {
      console.log(`⏭️  bỏ "${b.khoa}": sổ seed chưa có \`${b.chi}\``);
      return false;
    }
    return true;
  });

  const tong = {};
  let tongO = 0;

  for (const mod of fs.readdirSync(TEST_ROOT).sort()) {
    if (BO_QUA_THU_MUC.has(mod)) continue;
    const f = path.join(TEST_ROOT, mod, 'test-input.json');
    if (!fs.existsSync(f)) continue;

    const json = JSON.parse(fs.readFileSync(f, 'utf8'));
    let doi = 0;

    for (const c of Object.values(json.cases || {})) {
      if (!c.data) continue;
      // 🔴 CHỈ rót khoá nằm trong `required`. Ô trống ngoài `required` có thể là **cố ý**: case
      //    "SKU không tồn tại", "mã lô chưa có", "tên bảng giá chưa dùng"… đều khai ô rỗng rồi tự
      //    sinh giá trị sai trong spec. Rót giá trị THẬT vào đó là lặng lẽ đổi ý nghĩa của case —
      //    nó vẫn xanh, nhưng xanh vì kiểm nhầm thứ khác.
      const batBuoc = new Set(c.required || []);
      for (const b of banDo) {
        if (!batBuoc.has(b.khoa)) continue;
        if (NGOAI_LE[mod]?.has(b.khoa)) continue;
        if (!(b.khoa in c.data)) continue;
        const cu = c.data[b.khoa];
        if (cu !== '' && cu !== null && cu !== undefined) continue;
        c.data[b.khoa] = layTheoChi(duLieu, b.chi);
        tong[b.khoa] = (tong[b.khoa] || 0) + 1;
        doi += 1;
      }
    }

    if (doi) {
      tongO += doi;
      console.log(`${apDung ? 'ĐÃ RÓT' : 'sẽ rót'} ${String(doi).padStart(3)} ô · ${mod}`);
      if (apDung) fs.writeFileSync(f, `${JSON.stringify(json, null, 2)}\n`);
    }
  }

  console.log('\n--- theo khoá ---');
  for (const [k, n] of Object.entries(tong).sort((a, b) => b[1] - a[1])) {
    const b = BAN_DO.find((x) => x.khoa === k);
    console.log(`${String(n).padStart(4)} ${k.padEnd(20)} ← ${b.chi}  (${b.vi})`);
  }
  console.log(`\n${apDung ? 'Đã rót' : 'Sẽ rót'} tổng ${tongO} ô.`);

  console.log('\n🔴 KHÔNG tự rót (cần người quyết định):');
  for (const [k, ly] of Object.entries(CAN_NGUOI)) console.log(`  - ${k}: ${ly}`);

  if (!apDung) console.log('\nChạy lại kèm `--ap-dung` để ghi vào test-input.json.');
  else console.log('\nChạy `node tool/bin/thieu-input.js` để đo lại số case còn thiếu input.');
}

main();
