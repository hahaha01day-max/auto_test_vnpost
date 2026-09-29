#!/usr/bin/env node
'use strict';

/**
 * Xoá STUB RỖNG của những mã case ĐÃ có phép kiểm thật ở file spec khác trong cùng phân hệ.
 *
 *   node tool/bin/xoa-stub-trung.js <thu-muc-phan-he>            # chỉ liệt kê
 *   node tool/bin/xoa-stub-trung.js <thu-muc-phan-he> --ap-dung  # xoá thật
 *
 * 🔴 Vì sao phải xoá: stub chỉ có `chanNeuTat(id)`. Khi case được BẬT, stub chạy **xanh mà không
 *    kiểm gì**, và trạng thái gộp theo mã (`cap-nhat-trang-thai.js`) bị stub "Đạt" che mất kết quả
 *    thật (vd. case thật skip vì trạng thái đã tiêu thụ, stub lại báo Đạt).
 * Chỉ xoá khối `test('<mã> …', async () => { chanNeuTat('<mã>'); [chú thích] });` — thân không có
 * `expect` và mã đó có phép kiểm thật ở nơi khác (theo `quetSpec`).
 */

const fs = require('node:fs');
const path = require('node:path');
const { quetSpec } = require('../core/specs');

const [, , thuMuc, co] = process.argv;
const goc = path.join(__dirname, '..', '..', 'tai-lieu-test', thuMuc);
const { that } = quetSpec(goc);
const dir = path.join(goc, 'tests');
let tong = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.spec.js'))) {
  const file = path.join(dir, f);
  let src = fs.readFileSync(file, 'utf8');
  const re = /\n?([ \t]*)test\(\s*'(\S+?) [^\n]*',\s*async\s*\(\s*\)\s*=>\s*\{\s*\n\s*chanNeuTat\('\2'\);\s*(?:\n\s*\/\/[^\n]*)*\s*\n\s*\}\);[ \t]*/g;
  const bo = [];
  src = src.replace(re, (m, _ind, id) => {
    if (!that.has(id)) return m;
    bo.push(id);
    return '';
  });
  if (!bo.length) continue;
  tong += bo.length;
  console.log(`${f}: ${bo.join(', ')}`);
  if (co === '--ap-dung') fs.writeFileSync(file, src);
}
console.log(`${thuMuc}: ${tong} stub trùng mã${co === '--ap-dung' ? ' — đã xoá' : ' (chưa xoá, thêm --ap-dung)'}`);
