#!/usr/bin/env node
'use strict';
/** In song song case đã dựng và case gốc của một phân hệ, để khớp tay. */
const fs = require('node:fs');
const { getModule } = require('../core/modules');
const { parseCsv } = require('../core/cases');
const goc = require('../core/goc');
const { phanHeCho } = require('../core/goc-mapping');

const id = process.argv[2];
const mod = getModule(id);
const rows = parseCsv(fs.readFileSync(mod.csvPath, 'utf8'));
const h = rows[0];
console.log('### ĐÃ DỰNG (' + (rows.length - 1) + ')');
for (const r of rows.slice(1)) if ((r[0] || '').trim()) console.log('  ' + r[0] + ' | ' + r[1]);

const gocCases = [];
for (const f of goc.danhSachFile()) for (const c of goc.docCaFile(f).cases) {
  if (phanHeCho(f, c.nhom).module === id) gocCases.push(c);
}
console.log('\n### GỐC (' + gocCases.length + ')');
let nhom = '';
for (const c of gocCases) {
  if (c.nhom !== nhom) { nhom = c.nhom; console.log('  -- ' + nhom); }
  console.log('  ' + c.maKhoa + ' | ' + c.ten);
}
