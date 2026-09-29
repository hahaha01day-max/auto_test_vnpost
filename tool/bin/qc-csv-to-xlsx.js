'use strict';

/**
 * Chuyển file CSV mẫu QC ở `tai-lieu-test/test-case-qc/` sang .xlsx.
 *
 * 🔴 CSV mới là bản gốc — .xlsx chỉ là bản xem/giao cho QC. Sửa nội dung thì sửa CSV rồi chạy lại
 * script này, đừng sửa thẳng .xlsx: lần chạy sau ghi đè là mất.
 *
 * Việc script làm mà mở CSV bằng Excel không làm được: đặt font Arial cho toàn sheet, giữ xuống
 * dòng trong ô, bo chữ, cố định hàng tiêu đề, tô đậm khối metadata và các dòng nhóm (dòng có
 * cột ID rỗng).
 *
 *   node tool/bin/qc-csv-to-xlsx.js                    # toàn bộ test-case-qc/*.csv
 *   node tool/bin/qc-csv-to-xlsx.js 13_2_gop_tach_va_dieu_phoi
 *   node tool/bin/qc-csv-to-xlsx.js --gop                # gộp tất cả vào _tong-hop-test-case.xlsx
 *                                                        (mỗi CSV = 1 sheet + sheet "Mục lục")
 *
 * Dùng `exceljs` — đã có sẵn trong deps, không thêm phụ thuộc mới.
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const SRC_DIR = path.join(__dirname, '..', '..', 'tai-lieu-test', 'test-case-qc');

/**
 * Số dòng của khối metadata đầu file — dưới nó là 2 dòng trống rồi tới header.
 * 🔴 Hai hằng này phải khớp `META_LABELS` của `to-qc-csv.js`: đổi số nhãn metadata mà quên sửa ở
 * đây là tô đậm nhầm dòng và cố định nhầm hàng, file vẫn sinh ra bình thường nên rất dễ lọt.
 */
const META_ROWS = 8;
const HEADER_ROW = META_ROWS + 3;

/**
 * Bề rộng cột theo đúng thứ tự 12 cột của mẫu QC.
 * Đã bỏ khỏi mẫu gốc: `Sinh test script`, `Ứng dụng/ màn hình`, `SCRIPT`.
 * `Ưu tiên` giữ lại nhưng để trống — QC tự điền.
 */
const WIDTHS = [18, 46, 40, 52, 12, 52, 34, 10, 16, 12, 14, 3];

/** Font dùng cho toàn bộ sheet — QC yêu cầu Arial. */
const FONT = { name: 'Arial', size: 10 };

/** Đọc CSV theo RFC 4180: ô có dấu `"` bao ngoài được phép chứa `,`, `"` và xuống dòng. */
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
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else { quoted = false; }
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

function buildSheet(wb, rows, sheetName) {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: HEADER_ROW }],
  });
  ws.columns = WIDTHS.map((width) => ({ width }));

  rows.forEach((cells, idx) => {
    const n = idx + 1;
    const row = ws.addRow(cells);
    row.alignment = { vertical: 'top', wrapText: true };
    row.font = { ...FONT };

    if (n <= META_ROWS) {
      row.getCell(2).font = { ...FONT, bold: true };
      return;
    }
    if (n === HEADER_ROW) {
      row.font = { ...FONT, bold: true };
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      row.height = 34;
      row.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        c.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
      });
      return;
    }
    if (n < HEADER_ROW) return;

    // Dòng nhóm: cột ID rỗng nhưng cột Tình huống có chữ.
    const isGroup = !String(cells[0] || '').trim() && String(cells[1] || '').trim();
    if (isGroup) {
      row.font = { ...FONT, bold: true };
      row.eachCell({ includeEmpty: true }, (c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      });
      return;
    }
    row.eachCell({ includeEmpty: true }, (c) => {
      c.border = {
        top: { style: 'hair' }, left: { style: 'hair' },
        bottom: { style: 'hair' }, right: { style: 'hair' },
      };
    });
  });

  return ws;
}

/** Tên sheet hợp lệ: bỏ ký tự Excel cấm, cắt 31 ký tự, thêm hậu tố nếu trùng. */
function sheetName(base, used) {
  let name = base.replace(/[:\\\/?*\[\]]/g, '-').slice(0, 31);
  let n = 2;
  while (used.has(name)) {
    const suffix = `~${n}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    n += 1;
  }
  used.add(name);
  return name;
}

/** Gộp toàn bộ CSV thành 1 workbook: sheet "Mục lục" + mỗi CSV một sheet. */
async function merge(files) {
  const wb = new ExcelJS.Workbook();
  const toc = wb.addWorksheet('Mục lục', { views: [{ state: 'frozen', ySplit: 1 }] });
  toc.columns = [{ width: 6 }, { width: 44 }, { width: 52 }, { width: 10 }];
  const head = toc.addRow(['STT', 'Sheet', 'Phân hệ', 'Số case']);
  head.font = { ...FONT, bold: true };
  head.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  head.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  });

  const used = new Set();
  let total = 0;
  files.forEach((file, i) => {
    const rows = parseCsv(fs.readFileSync(file, 'utf8'));
    const base = path.basename(file, '.csv');
    const name = sheetName(base, used);
    buildSheet(wb, rows, name);
    const cases = rows.slice(HEADER_ROW).filter((r) => String(r[0] || '').trim()).length;
    total += cases;
    // Dòng metadata thứ nhất: cột B là nhãn "Chức năng", cột D mới là tên phân hệ.
    const label = String((rows[0] || [])[3] || '').trim() || base;
    const row = toc.addRow([i + 1, name, label, cases]);
    row.font = { ...FONT };
    row.alignment = { vertical: 'top', wrapText: true };
    const link = row.getCell(2);
    link.value = { text: name, hyperlink: `#'${name}'!A1` };
    link.font = { ...FONT, color: { argb: 'FF0563C1' }, underline: true };
  });

  const sum = toc.addRow(['', '', `Tổng ${files.length} phân hệ`, total]);
  sum.font = { ...FONT, bold: true };

  const out = path.join(SRC_DIR, '_tong-hop-test-case.xlsx');
  await wb.xlsx.writeFile(out);
  console.log(`✅ _tong-hop-test-case.xlsx — ${files.length} sheet, ${total} case`);
}

async function convert(file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const base = path.basename(file, '.csv');
  const wb = new ExcelJS.Workbook();
  buildSheet(wb, rows, base.slice(0, 31));
  const out = path.join(path.dirname(file), `${base}.xlsx`);
  await wb.xlsx.writeFile(out);
  const cases = rows.slice(HEADER_ROW).filter((r) => String(r[0] || '').trim()).length;
  console.log(`✅ ${base}.xlsx — ${rows.length} dòng, ${cases} case`);
}

async function main() {
  const args = process.argv.slice(2);
  const gop = args.includes('--gop');
  const only = args.find((a) => !a.startsWith('--'));
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`🚫 Chưa có thư mục ${SRC_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(SRC_DIR)
    .filter((f) => f.endsWith('.csv'))
    .filter((f) => !only || path.basename(f, '.csv') === only)
    .map((f) => path.join(SRC_DIR, f));

  if (!files.length) {
    console.error(only ? `🚫 Không có test-case-qc/${only}.csv` : '🚫 test-case-qc/ chưa có file CSV nào');
    process.exit(1);
  }
  if (gop) {
    await merge(files);
    return;
  }
  for (const f of files) await convert(f);
}

main().catch((e) => { console.error(e); process.exit(1); });
