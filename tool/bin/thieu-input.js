'use strict';

/**
 * LIỆT KÊ case chưa chạy được vì thiếu DỮ LIỆU ĐẦU VÀO, theo đúng thứ tự `skipReason()` của
 * `tai-lieu-test/shared/test-input.js` — 🚫 đừng tự nghĩ luật khác, lệch một bậc là ra danh sách
 * khác hẳn với lúc chạy thật.
 *
 * Thứ tự xét (dừng ở điều kiện đầu tiên đúng):
 *   1. `enabled: false`            → case bị tắt
 *   2. thiếu khoá trong `required` → CẦN ĐIỀN DỮ LIỆU  ← trọng tâm của checklist này
 *   3. `mutates && !allowMutation` → case ghi dữ liệu thật, khoá có chủ ý
 *
 * 🔴 Case tắt ở bậc 1 vẫn có thể thiếu input ở bậc 2; script ghi cả hai để người điền biết bật lên
 * rồi còn thiếu gì nữa.
 *
 *   node tool/bin/thieu-input.js            # ghi tai-lieu-test/_THIEU_INPUT.md
 *   node tool/bin/thieu-input.js --check    # chỉ in thống kê
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', 'tai-lieu-test');
const OUT = path.join(ROOT, '_THIEU_INPUT.md');
const BO_QUA = new Set(['shared', 'test-case-goc', 'test-case-qc']);

function docCsv(file) {
  if (!fs.existsSync(file)) return {};
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i += 1; } else q = false; } else cell += c;
      continue;
    }
    if (c === '"') { q = true; continue; }
    if (c === ',') { row.push(cell); cell = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift().map((h) => h.trim());
  const iId = head.indexOf('ID');
  const iTen = head.indexOf('Ten test case');
  const out = {};
  for (const r of rows) if ((r[iId] || '').trim()) out[r[iId].trim()] = (r[iTen] || '').trim();
  return out;
}

function main() {
  const check = process.argv.includes('--check');
  const phanHe = [];

  for (const mod of fs.readdirSync(ROOT).sort()) {
    if (BO_QUA.has(mod) || !fs.statSync(path.join(ROOT, mod)).isDirectory()) continue;
    const f = path.join(ROOT, mod, 'test-input.json');
    if (!fs.existsSync(f)) continue;

    const { cases = {} } = JSON.parse(fs.readFileSync(f, 'utf8'));
    const ten = docCsv(path.join(ROOT, mod, 'test-cases.csv'));
    const thieu = [];
    let batVaDu = 0;
    let ghiDuLieu = 0;
    let tat = 0;

    for (const [id, c] of Object.entries(cases)) {
      const data = c.data || {};
      const required = Array.isArray(c.required) ? c.required : [];
      const khuyet = required.filter((k) => data[k] === undefined || data[k] === null || data[k] === '');
      const enabled = c.enabled !== false;

      if (khuyet.length) {
        thieu.push({
          id,
          ten: ten[id] || '',
          khuyet,
          enabled,
          mutates: Boolean(c.mutates),
          lyDo: c._blocked || c._note || '',
        });
      }
      if (!enabled) tat += 1;
      else if (c.mutates && !c.allowMutation) ghiDuLieu += 1;
      else if (!khuyet.length) batVaDu += 1;
    }

    if (thieu.length || tat || ghiDuLieu) {
      phanHe.push({ mod, tong: Object.keys(cases).length, thieu, tat, ghiDuLieu, batVaDu });
    }
  }

  const tongThieu = phanHe.reduce((s, p) => s + p.thieu.length, 0);
  const tongKhoa = new Set();
  for (const p of phanHe) for (const t of p.thieu) for (const k of t.khuyet) tongKhoa.add(k);

  for (const p of phanHe) {
    console.log(`${p.mod.padEnd(34)} khai ${String(p.tong).padStart(3)} · thiếu input ${String(p.thieu.length).padStart(3)}` +
      ` · tắt ${String(p.tat).padStart(3)} · ghi dữ liệu ${String(p.ghiDuLieu).padStart(3)} · chạy được ${p.batVaDu}`);
  }
  console.log(`\n${phanHe.length} phân hệ · ${tongThieu} case thiếu input · ${tongKhoa.size} loại khoá dữ liệu`);

  if (check) return;

  const esc = (s) => String(s).replace(/\|/g, '\\|');
  let md = '# Checklist dữ liệu test đầu vào còn thiếu\n\n'
    + '> 🤖 Sinh tự động bởi `tool/bin/thieu-input.js` — 🚫 đừng sửa tay, chạy lại là mất.\n'
    + '> Điền giá trị vào `<phân hệ>/test-input.json` (khoá `data`), hoặc đặt biến môi trường\n'
    + '> `VNPOST_CASE_<MÃ_CASE>_<KHOÁ>` khi chạy. Điền xong chạy lại script này để soát.\n\n'
    + `**${tongThieu} case** thiếu dữ liệu đầu vào ở **${phanHe.filter((p) => p.thieu.length).length} phân hệ**.\n\n`
    + '## Cách đọc\n\n'
    + '| Cột | Nghĩa |\n|---|---|\n'
    + '| `Khoá còn trống` | tên trường trong `data` đang rỗng mà `required` đòi |\n'
    + '| `Đang bật` | `enabled` của case. Tắt thì điền xong vẫn phải bật mới chạy |\n'
    + '| `Ghi dữ liệu` | case sửa dữ liệu thật — cần `allowMutation: true` và môi trường dựng riêng |\n\n'
    + '## Tổng quan\n\n'
    + '| Phân hệ | Case khai | Thiếu input | Tắt | Ghi dữ liệu | Chạy được |\n|---|--:|--:|--:|--:|--:|\n';
  for (const p of phanHe) {
    md += `| \`${p.mod}\` | ${p.tong} | ${p.thieu.length || ''} | ${p.tat || ''} | ${p.ghiDuLieu || ''} | ${p.batVaDu || ''} |\n`;
  }

  md += '\n## Chi tiết theo phân hệ\n';
  for (const p of phanHe) {
    if (!p.thieu.length) continue;
    md += `\n### \`${p.mod}\` — ${p.thieu.length} case\n\n`;
    md += '| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |\n';
    md += '|---|---|---|---|---|---|---|\n';
    for (const t of p.thieu) {
      md += `| ☐ | \`${t.id}\` | ${esc(t.ten).slice(0, 60)} | ${t.khuyet.map((k) => `\`${k}\``).join(' · ')} `
        + `| ${t.enabled ? '✅' : '🚫 tắt'} | ${t.mutates ? '🔴 có' : ''} | ${esc(t.lyDo).replace(/\n/g, ' ').slice(0, 110)} |\n`;
    }
  }

  md += '\n## Khoá dữ liệu cần chuẩn bị\n\n';
  const theoKhoa = new Map();
  for (const p of phanHe) {
    for (const t of p.thieu) for (const k of t.khuyet) {
      if (!theoKhoa.has(k)) theoKhoa.set(k, []);
      theoKhoa.get(k).push(`${p.mod}/${t.id}`);
    }
  }
  md += '| Khoá | Số case cần | Phân hệ dùng |\n|---|--:|---|\n';
  for (const [k, ds] of [...theoKhoa].sort((a, b) => b[1].length - a[1].length)) {
    const mods = [...new Set(ds.map((x) => x.split('/')[0]))];
    md += `| \`${k}\` | ${ds.length} | ${mods.slice(0, 6).map((m) => `\`${m}\``).join(' · ')}${mods.length > 6 ? ` +${mods.length - 6}` : ''} |\n`;
  }

  fs.writeFileSync(OUT, md, 'utf8');
  console.log(`→ ${path.relative(process.cwd(), OUT)}`);
}

main();
