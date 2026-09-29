'use strict';

/**
 * BÙ NỘI DUNG cho các case rỗng `Tien dieu kien` / `Buoc kiem thu` / `Ket qua ky vong`
 * trong `tai-lieu-test/<phân hệ>/test-cases.csv`, bằng cách chép NGUYÊN VĂN từ sheet QC gốc
 * ở `test-case-goc/`, tra theo cột `Ma goc`.
 *
 * 🔴 Chỉ bù case **rỗng cả ba cột**. 🚫 Không đụng vào case đã có nội dung — nhiều case đã được
 * biên tập lại có chủ đích (thêm dòng 🔴 nhắc bẫy của repo), ghi đè là mất.
 *
 * 🔴 Mã gốc CHỈ duy nhất TRONG một file: `FUNC_1` xuất hiện ở cả `uat_vnpost_quan_ly_kho.csv` lẫn
 * `uat_vnpost_bao_cao_cong_no_khach_hang.csv`. Vì vậy tra theo `fileCuaModule(<phân hệ>)` chứ
 * 🚫 không tra mã trần trên toàn bộ 19 sheet — tra mã trần là chép nhầm nội dung của phân hệ khác.
 *
 *   node tool/bin/bu-case-rong.js --check    # chỉ liệt kê, không ghi
 *   node tool/bin/bu-case-rong.js            # ghi vào test-cases.csv
 *   node tool/bin/bu-case-rong.js 32_mo_hinh_to_chuc
 *
 * 🔴 Một case có thể gộp NHIỀU case gốc: `Ma goc` khi đó là `SANPHAM_35;SANPHAM_38;SANPHAM_41`.
 * Tra nguyên chuỗi là trượt hết — phải tách theo `;` rồi ghép nội dung các case nguồn lại.
 *
 * 🔴 4 sheet BỎ TRỐNG cột ID (`ban_ton_kho_am`, `bao_cao_cong_no_khach_hang`, `danh_muc_san_pham`,
 * `loyalty`) — case của chúng được trỏ bằng SỐ DÒNG, ghi là `dong17`. Tra như mã thường là trượt.
 *
 * Chạy xong nhớ sinh lại bản QC: `node tool/bin/to-qc-csv.js && node tool/bin/qc-csv-to-xlsx.js`.
 */

const fs = require('fs');
const path = require('path');

const goc = require('../core/goc');
const { fileCuaModule } = require('../core/goc-mapping');

const ROOT = path.join(__dirname, '..', '..', 'tai-lieu-test');
const BO_QUA = new Set(['shared', 'test-case-goc', 'test-case-qc']);
const COT = { dieuKien: 'Tien dieu kien', buoc: 'Buoc kiem thu', kyVong: 'Ket qua ky vong' };

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(cell); cell = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function toCsv(rows) {
  const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return `${rows.map((r) => r.map(esc).join(',')).join('\n')}\n`;
}

/**
 * Gom case của mọi sheet mà phân hệ này ánh xạ tới.
 * Khoá tra: mã gốc (`FUNC_1_263`) và số dòng (`dong17`) cho 4 sheet không có cột ID.
 */
function nguonCuaModule(mod) {
  const theoMa = new Map();
  for (const f of fileCuaModule(mod) || []) {
    const kq = goc.docCaFile(f);
    for (const c of kq.cases || []) {
      if (c.ma && !theoMa.has(c.ma)) theoMa.set(c.ma, c);
      const dong = `dong${c.dong}`;
      if (!theoMa.has(dong)) theoMa.set(dong, c);
    }
  }
  return theoMa;
}

function xuLy(mod, { check }) {
  const file = path.join(ROOT, mod, 'test-cases.csv');
  if (!fs.existsSync(file)) return null;

  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const head = rows[0].map((h) => h.trim());
  const iId = head.indexOf('ID');
  const iMaGoc = head.indexOf('Ma goc');
  const idx = Object.fromEntries(Object.entries(COT).map(([k, ten]) => [k, head.indexOf(ten)]));
  if (iId < 0 || iMaGoc < 0 || Object.values(idx).some((i) => i < 0)) return null;

  /** Ghép nội dung nhiều case gốc: bỏ trùng, bỏ rỗng, nối bằng một dòng trắng. */
  const ghep = (dsSrc, truong) => {
    const ds = [...new Set(dsSrc.map((c) => (c[truong] || '').trim()).filter(Boolean))];
    return ds.join('\n\n');
  };

  const rong = [];
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    if (!(row[iId] || '').trim()) continue;
    if (Object.values(idx).some((i) => (row[i] || '').trim())) continue;
    rong.push(r);
  }
  if (!rong.length) return null;

  let nguon = null;
  const buDuoc = [];
  const khongTra = [];
  for (const r of rong) {
    const raw = (rows[r][iMaGoc] || '').trim();
    if (!raw) { khongTra.push([rows[r][iId], 'không có Ma goc']); continue; }
    if (!nguon) nguon = nguonCuaModule(mod);

    const dsMa = raw.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
    const dsSrc = dsMa.map((m) => nguon.get(m)).filter(Boolean);
    const thieu = dsMa.filter((m) => !nguon.get(m));
    if (!dsSrc.length) {
      khongTra.push([rows[r][iId], `không thấy ${thieu.join(';')} trong sheet`]);
      continue;
    }
    if (!check) {
      rows[r][idx.dieuKien] = ghep(dsSrc, 'dieuKien');
      rows[r][idx.buoc] = ghep(dsSrc, 'buoc');
      rows[r][idx.kyVong] = ghep(dsSrc, 'kyVong');
    }
    buDuoc.push(rows[r][iId] + (thieu.length ? ` (thiếu ${thieu.join(';')})` : ''));
  }

  if (!check && buDuoc.length) fs.writeFileSync(file, toCsv(rows), 'utf8');
  return { mod, rong: rong.length, bu: buDuoc.length, khongTra };
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const only = args.find((a) => !a.startsWith('--'));

  const mods = fs.readdirSync(ROOT)
    .filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory() && !BO_QUA.has(d))
    .filter((d) => !only || d === only)
    .sort();

  let tongRong = 0;
  let tongBu = 0;
  const conLai = [];
  for (const mod of mods) {
    const r = xuLy(mod, { check });
    if (!r) continue;
    tongRong += r.rong;
    tongBu += r.bu;
    console.log(`${check ? '🔍' : '✅'} ${mod.padEnd(34)} rỗng ${String(r.rong).padStart(2)} · ` +
      `bù ${String(r.bu).padStart(2)}` + (r.khongTra.length ? ` · 🔴 còn ${r.khongTra.length}` : ''));
    for (const [id, vi] of r.khongTra) conLai.push(`${mod}/${id}: ${vi}`);
  }

  console.log(`\n${tongBu}/${tongRong} case bù được từ sheet QC` +
    (check ? ' · --check: không ghi file' : ''));
  if (conLai.length) {
    console.log(`\n🔴 ${conLai.length} case sheet QC không phủ — phải soạn từ HDSD:`);
    for (const l of conLai) console.log(`   ${l}`);
  }
}

main();
