'use strict';
/**
 * Đếm case CÓ phép kiểm (khối test(...) chứa expect) và case VỎ RỖNG (chỉ skip/boQua) của mọi phân hệ.
 * Chạy: node tool/bin/dem-vo-rong.js  (từ auto_test_vnpost). 🔴 Đừng tin số "có script" trong test-cases.md.
 */
process.chdir(require('node:path').join(__dirname, '..', '..', 'tai-lieu-test'));
const ROOT = process.cwd();
const fs = require('fs'), path = require('path');
const out = [];
for (const d of fs.readdirSync(ROOT)) {
  const csv = path.join(ROOT, d, 'test-cases.csv'); if (!fs.existsSync(csv)) continue;
  const ids = [...fs.readFileSync(csv, 'utf8').matchAll(/^([0-9]+[_a-z0-9]*_\d{3}_\d{3}),/gm)].map((m) => m[1]);
  const td = path.join(ROOT, d, 'tests'); const files = fs.existsSync(td) ? fs.readdirSync(td).filter((f) => f.endsWith('.js')) : [];
  const that = new Set(), rong = new Set();
  let po = 0;
  for (const f of files) {
    const s = fs.readFileSync(path.join(td, f), 'utf8');
    if (/-page\.js$|page\.js$/.test(f)) po++;
    // tách từng test(...) theo vị trí
    const re = /\btest\(\s*[`'"]([^`'"]*?(\d+[_a-z0-9]*_\d{3}_\d{3})[^`'"]*)[`'"]/g; const pos = [];
    let m; while ((m = re.exec(s))) pos.push({ id: m[2], i: m.index });
    pos.forEach((p, k) => {
      const body = s.slice(p.i, k + 1 < pos.length ? pos[k + 1].i : s.length);
      (/\bexpect\s*[.(]/.test(body) ? that : rong).add(p.id);
    });
  }
  const inp = path.join(ROOT, d, 'test-input.json'); let ghi = 0;
  if (fs.existsSync(inp)) { try { const j = JSON.parse(fs.readFileSync(inp, 'utf8')); const c = j.cases || j; ghi = ids.filter((i) => c[i]?.mutates).length; } catch {} }
  const thatCase = ids.filter((i) => that.has(i)).length;
  const rongCase = ids.filter((i) => !that.has(i) && rong.has(i)).length;
  const khong = ids.length - thatCase - rongCase;
  out.push({ d, case: ids.length, that: thatCase, rong: rongCase, khongCo: khong, ghi, po, files: files.length });
}
out.sort((a, b) => (b.rong + b.khongCo) - (a.rong + a.khongCo));
console.log('phan_he | case | co_phep_kiem | vo_rong | chua_co_test | case_ghi | page_obj');
for (const o of out) console.log([o.d, o.case, o.that, o.rong, o.khongCo, o.ghi, o.po].join(' | '));
