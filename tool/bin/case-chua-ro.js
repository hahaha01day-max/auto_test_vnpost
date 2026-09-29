#!/usr/bin/env node
/**
 * Quét mọi `test-cases.csv` tìm case có KỲ VỌNG CHƯA CHỐT, rồi:
 *   1. ghi phụ lục vào cuối từng `<phân hệ>/test-cases.md` (sau dòng <!-- PHU-LUC-CHUA-RO -->)
 *   2. ghi bản tổng hợp `tai-lieu-test/_CASE_CHUA_RO.md`
 *
 * 🔴 Vì sao cần: case có kỳ vọng dạng "ghi lại hành vi thật" / "chưa chốt được" là case
 * KHÔNG so được pass/fail. Trộn lẫn chúng vào bảng chung làm độ phủ nhìn đẹp hơn sự thật.
 *
 * 🚫 Đừng sửa tay phần trên marker — chạy lại `node tool/bin/case-chua-ro.js` là ghi đè.
 * ⭐ Chữ viết tay đặt TRƯỚC marker thì được giữ.
 */
const fs = require('node:fs');
const path = require('node:path');
const { parseCsv } = require('../core/cases');
const { listModules, TEST_ROOT } = require('../core/modules');

const MARKER = '<!-- PHU-LUC-CHUA-RO -->';
const MAU = [
  [/CHƯA CHỐT ĐƯỢC|CHƯA ĐO ĐƯỢC|chưa chốt được|chưa đo được/, 'Chưa đo được'],
  [/[Cc]ần user quyết|[Cc]ần user xác nhận|cần hỏi user|báo user/, 'Chờ user quyết'],
  [/Ghi lại hành vi thật|Ghi lại xem|Ghi lại nếu|Ghi lại số lượng thật|Ghi lại giá trị thực tế|thì ghi nhận/, 'Chờ chạy để lấy hành vi thật'],
  [/Ghi lại nguyên văn|ghi lại nguyên văn/, 'Thiếu nguyên văn thông báo'],
  [/để chốt với QC|chốt lại với QC|chốt với QC/, 'Chờ chốt với QC'],
  [/Nếu KHÔNG|Nếu không |Nếu bị chặn thì|Nếu cho phép|Nếu mất thì|Nếu bị reset|Nếu phát hành được/, 'Điều kiện chưa xác định'],
  [/CHƯA RÕ|chưa rõ/, 'Chưa rõ'],
];
const esc = (s) => String(s || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const rutgon = (s, n = 220) => (esc(s).length > n ? esc(s).slice(0, n) + '…' : esc(s));

function quet(mod) {
  const csvPath = path.join(mod.dir, 'test-cases.csv');
  if (!fs.existsSync(csvPath)) return null;
  // parseCsv trả MẢNG các mảng, dòng đầu là tiêu đề — 🚫 không phải mảng object.
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  if (!rows.length) return null;
  const hdr = rows[0];
  const iId = hdr.indexOf('ID');
  const iTen = hdr.indexOf('Ten test case');
  const iKv = hdr.indexOf('Ket qua ky vong');
  // CSV 5 cột của bản cũ không có cột kỳ vọng ở đúng vị trí ⇒ bỏ qua, không đoán.
  if (iId === -1 || iKv === -1) return null;
  const body = rows.slice(1).filter((r) => r.length > iKv && r[iId]);
  const found = [];
  for (const r of body) {
    const kv = r[iKv] || '';
    const tags = [...new Set(MAU.filter(([rx]) => rx.test(kv)).map(([, lab]) => lab))].sort();
    if (tags.length) found.push({ id: r[iId], ten: r[iTen] || '', tags, kv });
  }
  return { tong: body.length, found };
}

function ghiPhuLuc(mod, kq) {
  const mdPath = path.join(mod.dir, 'test-cases.md');
  if (!fs.existsSync(mdPath)) return false;
  let s = fs.readFileSync(mdPath, 'utf8');
  const i = s.indexOf(MARKER);
  if (i !== -1) s = `${s.slice(0, i).trimEnd()}\n`;
  if (!kq.found.length) { fs.writeFileSync(mdPath, s); return false; }
  const out = [
    '', MARKER, '',
    '## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng', '',
    '> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`',
    '> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,',
    '> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.',
    '> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,',
    '> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.', '',
    '| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |',
    '|---|---|---|---|',
    ...kq.found.map((f) => `| \`${f.id}\` | ${esc(f.ten)} | ${f.tags.join(' · ')} | ${rutgon(f.kv)} |`),
    '', `**${kq.found.length}/${kq.tong} case** của phân hệ này chưa chốt được kỳ vọng.`, '',
  ];
  fs.writeFileSync(mdPath, s + out.join('\n'));
  return true;
}

const mods = listModules();
const all = [];
let daGhi = 0;
for (const mod of mods) {
  const kq = quet(mod);
  if (!kq) continue;
  if (kq.found.length) all.push({ mod: mod.dirName, ...kq });
  if (ghiPhuLuc(mod, kq)) daGhi++;
}
all.sort((a, b) => b.found.length - a.found.length);
const tongCase = all.reduce((s, m) => s + m.found.length, 0);
const theoTag = {};
for (const m of all) for (const f of m.found) for (const t of f.tags) theoTag[t] = (theoTag[t] || 0) + 1;

const md = [
  '# Case CHƯA CHỐT kỳ vọng — toàn bộ kho', '',
  '> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`',
  `> Cập nhật: ${new Date().toLocaleDateString('vi-VN')}`, '',
  '🔴 **Vì sao có file này.** Một case mà kỳ vọng còn là *"ghi lại hành vi thật"* thì 🚫 **không so',
  'được pass/fail** — chạy nó chỉ để quan sát. Trộn lẫn những case đó vào bảng độ phủ chung làm con số',
  'nhìn đẹp hơn sự thật. Đây là danh sách việc còn nợ, tách riêng ra để đếm được.', '',
  '## 1. Tổng hợp', '',
  '| Chỉ tiêu | Số |', '|---|--:|',
  `| Case chưa chốt kỳ vọng | **${tongCase}** |`,
  `| Phân hệ có case chưa chốt | **${all.length}** |`, '',
  '### Theo loại vướng', '', '| Vướng gì | Số case |', '|---|--:|',
  ...Object.entries(theoTag).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`), '',
  '### Theo phân hệ', '', '| Phân hệ | Chưa chốt | Tổng case | Tỷ lệ |', '|---|--:|--:|--:|',
  ...all.map((m) => `| \`${m.mod}\` | ${m.found.length} | ${m.tong} | ${((m.found.length / m.tong) * 100).toFixed(1)}% |`), '',
  '## 2. Chi tiết từng case', '',
];
for (const m of all) {
  md.push(`### \`${m.mod}\` — ${m.found.length} case`, '');
  md.push('| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |', '|---|---|---|---|');
  for (const f of m.found) md.push(`| \`${f.id}\` | ${esc(f.ten)} | ${f.tags.join(' · ')} | ${rutgon(f.kv, 180)} |`);
  md.push('');
}
fs.writeFileSync(path.join(TEST_ROOT, '_CASE_CHUA_RO.md'), md.join('\n'));
console.log(`Đã ghi ${daGhi} phụ lục + tai-lieu-test/_CASE_CHUA_RO.md`);
console.log(`  ${tongCase} case chưa chốt kỳ vọng ở ${all.length}/${mods.length} phân hệ`);
