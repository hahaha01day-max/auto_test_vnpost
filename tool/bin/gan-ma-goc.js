#!/usr/bin/env node
'use strict';

/**
 * Điền hai cột `Ma goc` + `Nguon` vào `test-cases.csv` của một phân hệ.
 *
 *   node tool/bin/gan-ma-goc.js <ma-phan-he> <file-ban-do.json>
 *
 * Bản đồ JSON: `{ "<ma case da dung>": "<ma goc>" , ... }`. Case không có trong bản đồ để trống
 * `Ma goc` và `Nguon` tự suy ra "HDSD <task>" theo mã case.
 *
 * 🔴 Chỉ THÊM cột, 🚫 không đụng 5 cột đầu. Chạy lại nhiều lần cho cùng kết quả (idempotent):
 * phân hệ đã có 2 cột thì ghi đè đúng 2 cột đó.
 * 🔴 Kiểm mã gốc có THẬT trong sheet đã ánh xạ cho phân hệ — gõ nhầm mã là nối vào hư không, báo cáo
 * vẫn ghi "đã dựng" mà chẳng khớp case nào.
 */

const fs = require('node:fs');
const { getModule } = require('../core/modules');
const { parseCsv } = require('../core/cases');
const goc = require('../core/goc');
const { phanHeCho } = require('../core/goc-mapping');

function oCsv(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main() {
  const [, , moduleId, banDoFile] = process.argv;
  if (!moduleId || !banDoFile) {
    console.error('Dùng: node tool/bin/gan-ma-goc.js <ma-phan-he> <file-ban-do.json>');
    process.exit(1);
  }
  const mod = getModule(moduleId);
  if (!mod) { console.error(`Không có phân hệ "${moduleId}"`); process.exit(1); }

  const banDo = JSON.parse(fs.readFileSync(banDoFile, 'utf8'));

  // Tập mã gốc của phân hệ này, và tập mã gốc của TOÀN BỘ sheet.
  // 🔴 Phân biệt hai mức: mã không tồn tại ở đâu cả = gõ sai ⇒ DỪNG. Mã có thật nhưng bảng ánh xạ
  //    xếp sang phân hệ khác = chuyện bình thường (nghiệp vụ nằm ở ranh giới hai phân hệ) ⇒ chỉ
  //    CẢNH BÁO, và đó là tín hiệu nên sửa `goc-mapping.js`.
  const hopLe = new Set();
  const moiNoi = new Map();
  for (const f of goc.danhSachFile()) {
    for (const c of goc.docCaFile(f).cases) {
      const pm = phanHeCho(f, c.nhom).module;
      moiNoi.set(c.maKhoa, pm);
      if (pm === moduleId) hopLe.add(c.maKhoa);
    }
  }

  const rows = parseCsv(fs.readFileSync(mod.csvPath, 'utf8'));
  const header = rows[0];
  const coSan = header.indexOf('Ma goc') >= 0;
  const base = coSan ? header.slice(0, header.indexOf('Ma goc')) : header;

  // 🔴 Giữ nguyên các cột đứng SAU `Nguon` (vd. `Trang thai chay` do cap-nhat-trang-thai.js ghi).
  const iNguon = header.indexOf('Nguon');
  const duoi = coSan && iNguon >= 0 ? header.slice(iNguon + 1) : [];
  const out = [[...base, 'Ma goc', 'Nguon', ...duoi]];
  const laNgoai = [];
  const canhBao = [];
  let ganDuoc = 0;

  for (const r of rows.slice(1)) {
    const id = (r[0] || '').trim();
    if (!id) continue;
    const ma = (banDo[id] || '').trim();
    // Nhiều mã gốc ngăn bằng `;` — kiểm từng mã.
    for (const x of ma.split(';').map((v) => v.trim()).filter(Boolean)) {
      if (!moiNoi.has(x)) laNgoai.push(`${id} -> ${x} (KHÔNG có mã này trong sheet nào)`);
      else if (!hopLe.has(x)) canhBao.push(`${id} -> ${x} (ánh xạ đang xếp về "${moiNoi.get(x)}")`);
    }
    if (ma) ganDuoc += 1;

    const task = (id.match(/_(\d{3})_\d{3}$/) || [])[1];
    const nguon = ma ? 'Sheet QC' : task ? `HDSD ${task}` : 'HDSD';
    out.push([...base.map((_, i) => r[i] ?? ''), ma, nguon, ...duoi.map((_, k) => r[iNguon + 1 + k] ?? '')]);
  }

  if (laNgoai.length) {
    console.error('🔴 Mã gốc KHÔNG có trong sheet đã ánh xạ cho phân hệ này — dừng, chưa ghi gì:');
    laNgoai.forEach((x) => console.error('   ' + x));
    process.exit(1);
  }

  if (canhBao.length) {
    console.warn('⚠️  Mã gốc thuộc phân hệ khác theo bảng ánh xạ — vẫn ghi, nhưng nên soát lại goc-mapping.js:');
    canhBao.forEach((x) => console.warn('   ' + x));
  }
  fs.writeFileSync(mod.csvPath, out.map((r) => r.map(oCsv).join(',')).join('\n') + '\n');
  console.log(`${moduleId}: ${out.length - 1} case, gán được ${ganDuoc} mã gốc`);
}

main();
