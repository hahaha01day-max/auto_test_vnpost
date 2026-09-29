'use strict';

/**
 * Đồng bộ NGƯỢC nội dung case QC đã sửa trên Excel về `tai-lieu-test/<phân hệ>/test-cases.csv`.
 *
 *   node tool/bin/dong-bo-tu-qc.js --file <bản QC tải về>          # dry-run: chỉ ghi báo cáo
 *   node tool/bin/dong-bo-tu-qc.js --file <bản QC tải về> --apply  # ghi vào CSV
 *   node tool/bin/dong-bo-tu-qc.js --file <…> --base <bản gốc>     # mặc định base = test-case-qc/_tong-hop-test-case.xlsx
 *   node tool/bin/dong-bo-tu-qc.js --file <…> 04_4_kiem_kho        # chỉ một phân hệ
 *
 * Chỉ đụng 5 cột: ID · Tình huống · Điều kiện cần có · Các bước thực hiện · Kết quả mong muốn.
 * Các cột còn lại của CSV (Task, Trang thai chay, Ghi chu chay…) giữ nguyên.
 *
 * 🔴 SO BA CHIỀU, không so thẳng Excel với CSV:
 *   base = bản Excel ĐÃ UPLOAD cho QC · qc = bản QC tải về · local = CSV hiện tại.
 *   Sau khi upload, CSV ở máy vẫn tiếp tục được sửa (user chốt kỳ vọng…). So thẳng qc với local sẽ
 *   ghi đè bản mới ở máy bằng bản cũ trên Excel.
 *   - qc == base              → QC không sửa ô này → giữ local
 *   - qc != base, local chưa đổi so với base → ghi qc vào CSV
 *   - qc != base, local cũng đã đổi         → XUNG ĐỘT, không ghi, báo để xử lý tay
 *   So local với base phải qua đúng phép biến đổi của to-qc-csv.js (bản QC tách dòng bước, bỏ link,
 *   cắt ghi chú 🔴…). Khi ghi qc đè vào CSV, ghi chú 🔴 trong ô đó mất — báo cáo liệt kê.
 *
 * Xoá: ID có ở base nhưng qc không còn → cột `Trang thai QC` = `QC_XOA` (không xoá dòng).
 *   Case thêm ở máy sau khi upload (không có trong base) KHÔNG bị coi là QC xoá.
 * Thêm: ID có ở qc, không có ở base lẫn CSV → thêm dòng. QC_XOA xuất hiện lại trên qc → bỏ đánh dấu.
 * to-qc-csv.js bỏ qua case QC_XOA khi sinh lại bản QC.
 *
 * Sau khi --apply: sinh lại bản QC (to-qc-csv.js + qc-csv-to-xlsx.js --gop) và upload lại — bản đó
 * thành base cho lần đồng bộ sau.
 *
 * Báo cáo: tai-lieu-test/test-case-qc/_dong-bo-qc.md — stdout chỉ in số đếm.
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { parseCsv, chuanHoaBuoc, boGhiChuRepo, BO_QUA } = require('./to-qc-csv.js');

const ROOT = path.join(__dirname, '..', '..', 'tai-lieu-test');
const QC_DIR = path.join(ROOT, 'test-case-qc');
const REPORT = path.join(QC_DIR, '_dong-bo-qc.md');
const COT_QC = 'Trang thai QC';
const QC_XOA = 'QC_XOA';

/** Cột Excel (tiêu đề ở dòng header của sheet) → cột CSV, kèm phép biến đổi CSV→QC để so. */
const MAP = [
  { xl: 'Tình huống', csv: 'Ten test case', toQc: (v) => v.trim() },
  { xl: 'Điều kiện cần có', csv: 'Tien dieu kien', toQc: (v) => v.trim() },
  { xl: 'Các bước thực hiện', csv: 'Buoc kiem thu', toQc: (v) => chuanHoaBuoc(v) },
  { xl: 'Kết quả mong muốn', csv: 'Ket qua ky vong', toQc: (v) => boGhiChuRepo(v, { cat: [], ngo: [], trong: [] }) },
];

const norm = (v) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\s+/g, ' ').trim();
const chuanTieuDe = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

function cellText(cell) {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object' && v.richText) return v.richText.map((p) => p.text).join('');
  if (typeof v === 'object' && 'result' in v) return String(v.result ?? '');
  if (typeof v === 'object' && v.text) return String(v.text);
  return String(v);
}

/** Đọc một sheet phân hệ → { mod, cases: Map<ID, {Tình huống,…}>, trung: [ID] } */
function readSheet(ws) {
  let headerRow = 0;
  const colOf = {};
  ws.eachRow((row, r) => {
    if (headerRow) return;
    const texts = [];
    row.eachCell({ includeEmpty: true }, (c, i) => { texts[i] = chuanTieuDe(cellText(c)); });
    if (texts.includes('id') && texts.includes('tình huống')) {
      headerRow = r;
      texts.forEach((t, i) => { if (t) colOf[t] = i; });
    }
  });
  if (!headerRow) return null;
  // Tên phân hệ đầy đủ ở ô cạnh "Mã Testcase" (tên sheet bị cắt 31 ký tự).
  let mod = ws.name;
  ws.eachRow((row, r) => {
    if (r >= headerRow) return;
    row.eachCell((c, i) => {
      if (chuanTieuDe(cellText(c)) === 'mã testcase') {
        for (let j = i + 1; j <= i + 4; j += 1) {
          const t = cellText(row.getCell(j)).trim();
          if (t) { mod = t; break; }
        }
      }
    });
  });
  const idCol = colOf.id;
  const cols = MAP.map((m) => colOf[chuanTieuDe(m.xl)]);
  const thieuCot = MAP.filter((m, i) => !cols[i]).map((m) => m.xl);
  const cases = new Map();
  const trung = [];
  ws.eachRow((row, r) => {
    if (r <= headerRow) return;
    const id = cellText(row.getCell(idCol)).trim();
    if (!id) return; // dòng nhóm
    if (cases.has(id)) { trung.push(id); return; }
    const o = {};
    MAP.forEach((m, i) => { o[m.xl] = cols[i] ? cellText(row.getCell(cols[i])).replace(/\r\n?/g, '\n').trim() : null; });
    cases.set(id, o);
  });
  return { mod, cases, trung, thieuCot };
}

function readCsvFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = parseCsv(text);
  return { rows, head: rows[0].map((h) => h.trim()), endsNl: text.endsWith('\n') };
}

function writeCsvFile(file, { rows, endsNl }) {
  const esc = (v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  fs.writeFileSync(file, rows.map((r) => r.map((c) => esc(c ?? '')).join(',')).join('\n') + (endsNl ? '\n' : ''), 'utf8');
}

const coGhiChuRepo = (v) => /[🔴🚫]|https?:\/\//.test(v || '');
const catNgan = (v, n = 160) => { const s = norm(v); return s.length > n ? `${s.slice(0, n)}…` : s; };
const md = (v) => catNgan(v).replace(/\|/g, '\\|');

async function readBook(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheets = new Map();
  const loi = [];
  for (const ws of wb.worksheets) {
    const s = readSheet(ws);
    if (!s) continue; // Mục lục, sheet phụ
    if (s.thieuCot.length) loi.push(`\`${path.basename(file)}\` sheet \`${ws.name}\`: thiếu cột ${s.thieuCot.join(', ')}`);
    sheets.set(s.mod, s);
  }
  return { sheets, loi };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const val = (k) => { const i = args.indexOf(k); return i >= 0 ? path.resolve(args[i + 1]) : null; };
  const xlsx = val('--file');
  const basePath = val('--base') || path.join(QC_DIR, '_tong-hop-test-case.xlsx');
  const only = args.find((a, i) => !a.startsWith('--') && !['--file', '--base'].includes(args[i - 1]));
  if (!xlsx) { console.error('🚫 Thiếu --file <bản QC tải về>'); process.exit(1); }
  if (xlsx === basePath) { console.error('🚫 --file trùng --base: tải bản QC về tên khác, giữ nguyên bản đã upload làm base'); process.exit(1); }

  const QC = await readBook(xlsx);
  const BASE = await readBook(basePath);
  const loiSheet = [...QC.loi, ...BASE.loi];

  const mods = fs.readdirSync(ROOT)
    .filter((d) => !BO_QUA.has(d) && fs.existsSync(path.join(ROOT, d, 'test-cases.csv')))
    .filter((d) => !only || d === only)
    .sort();

  const R = { them: [], sua: [], xungDot: [], xoa: [], hoiSinh: [], matGhiChu: [], khongSheet: [], trung: [], sheetLa: [] };
  for (const name of QC.sheets.keys()) {
    if (!mods.includes(name) && (!only || name === only)) R.sheetLa.push(name);
  }

  for (const mod of mods) {
    const sheet = QC.sheets.get(mod);
    if (!sheet) { R.khongSheet.push(mod); continue; }
    const base = BASE.sheets.get(mod) || { cases: new Map() };
    for (const id of sheet.trung) R.trung.push([mod, id]);

    const file = path.join(ROOT, mod, 'test-cases.csv');
    const csv = readCsvFile(file);
    const { rows, head } = csv;
    const ix = (h) => head.indexOf(h);
    const iId = ix('ID');
    let iQc = ix(COT_QC);
    const needQcCol = () => {
      if (iQc >= 0) return;
      head.push(COT_QC); rows[0].push(COT_QC); iQc = head.length - 1;
    };
    let changed = false;

    const seen = new Set();
    for (let r = 1; r < rows.length; r += 1) {
      const row = rows[r];
      const id = (row[iId] || '').trim();
      if (!id) continue;
      seen.add(id);
      const qc = sheet.cases.get(id);
      const bs = base.cases.get(id);
      const daXoa = iQc >= 0 && (row[iQc] || '').trim() === QC_XOA;
      if (!qc) {
        // Chỉ coi là QC xoá khi case CÓ trong bản đã upload.
        if (bs && !daXoa) { needQcCol(); row[iQc] = QC_XOA; changed = true; R.xoa.push([mod, id, row[ix('Ten test case')]]); }
        continue;
      }
      if (daXoa) { row[iQc] = ''; changed = true; R.hoiSinh.push([mod, id]); }
      for (const m of MAP) {
        const ci = ix(m.csv);
        const xl = qc[m.xl];
        if (ci < 0 || xl == null) continue;
        const cur = row[ci] || '';
        const goc = bs ? bs[m.xl] : null;
        if (goc != null && norm(goc) === norm(xl)) continue;           // QC không sửa ô này
        if (norm(m.toQc(cur)) === norm(xl)) continue;                  // đã giống
        if (goc != null && norm(m.toQc(cur)) !== norm(goc)) {          // máy cũng đã sửa
          R.xungDot.push([mod, id, m.xl, goc, cur, xl]);
          continue;
        }
        R.sua.push([mod, id, m.xl, cur, xl]);
        if (coGhiChuRepo(cur)) R.matGhiChu.push([mod, id, m.xl]);
        row[ci] = xl; changed = true;
      }
    }

    for (const [id, qc] of sheet.cases) {
      if (seen.has(id)) continue;
      const row = head.map(() => '');
      row[iId] = id;
      for (const m of MAP) { const ci = ix(m.csv); if (ci >= 0) row[ci] = qc[m.xl] || ''; }
      rows.push(row); changed = true;
      R.them.push([mod, id, qc['Tình huống']]);
    }

    if (changed && apply) writeCsvFile(file, csv);
  }

  const ds = (arr, f) => (arr.length ? arr.map(f).join('\n') : '_(không có)_');
  const out = [
    `# Đồng bộ từ file QC → test-cases.csv ${apply ? '(ĐÃ GHI)' : '(DRY-RUN — chưa ghi CSV)'}`,
    '',
    `> 🤖 Sinh bởi \`tool/bin/dong-bo-tu-qc.js\` lúc ${new Date().toISOString()} · QC \`${path.relative(ROOT, xlsx)}\` · base \`${path.relative(ROOT, basePath)}\``,
    '',
    `**Thêm ${R.them.length} · Sửa ${R.sua.length} ô · 🔴 Xung đột ${R.xungDot.length} ô · Đánh dấu QC_XOA ${R.xoa.length} · Bỏ QC_XOA ${R.hoiSinh.length}**`,
    '',
    `## Thêm (${R.them.length})`, '', '| Phân hệ | ID | Tình huống |', '|---|---|---|',
    ds(R.them, ([m, id, t]) => `| ${m} | \`${id}\` | ${md(t)} |`), '',
    `## Sửa (${R.sua.length} ô)`, '', '| Phân hệ | ID | Cột | CSV cũ | QC mới |', '|---|---|---|---|---|',
    ds(R.sua, ([m, id, c, a, b]) => `| ${m} | \`${id}\` | ${c} | ${md(a)} | ${md(b)} |`), '',
    `## 🔴 Xung đột — QC và máy cùng sửa, KHÔNG ghi (${R.xungDot.length} ô)`, '',
    '| Phân hệ | ID | Cột | Bản đã upload | CSV hiện tại | QC mới |', '|---|---|---|---|---|---|',
    ds(R.xungDot, ([m, id, c, g, a, b]) => `| ${m} | \`${id}\` | ${c} | ${md(g)} | ${md(a)} | ${md(b)} |`), '',
    `## 🔴 Ô bị ghi đè đã mất ghi chú 🔴/link của repo (${R.matGhiChu.length}) — soát lại`, '',
    ds(R.matGhiChu, ([m, id, c]) => `- ${m} · \`${id}\` · ${c}`), '',
    `## Đánh dấu QC_XOA (${R.xoa.length})`, '', '| Phân hệ | ID | Tình huống |', '|---|---|---|',
    ds(R.xoa, ([m, id, t]) => `| ${m} | \`${id}\` | ${md(t)} |`), '',
    `## Bỏ đánh dấu QC_XOA — QC thêm lại (${R.hoiSinh.length})`, '',
    ds(R.hoiSinh, ([m, id]) => `- ${m} · \`${id}\``), '',
    '## Cảnh báo', '',
    ds([
      ...R.khongSheet.map((m) => `- Phân hệ \`${m}\` không có sheet trong Excel — bỏ qua, KHÔNG đánh dấu xoá`),
      ...R.sheetLa.map((m) => `- Sheet \`${m}\` không khớp thư mục phân hệ nào — bỏ qua`),
      ...R.trung.map(([m, id]) => `- \`${m}\`: ID \`${id}\` trùng trong Excel — chỉ lấy dòng đầu`),
      ...loiSheet.map((s) => `- ${s}`),
    ], (x) => x), '',
  ].join('\n');
  fs.writeFileSync(REPORT, out, 'utf8');

  console.log(`${apply ? '✅ ĐÃ GHI' : '🔍 DRY-RUN'} · thêm ${R.them.length} · sửa ${R.sua.length} ô · xung đột ${R.xungDot.length} · QC_XOA ${R.xoa.length} · ` +
    `bỏ QC_XOA ${R.hoiSinh.length} · mất ghi chú ${R.matGhiChu.length} · cảnh báo ${R.khongSheet.length + R.sheetLa.length + R.trung.length + loiSheet.length}`);
  console.log(`→ ${path.relative(process.cwd(), REPORT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
