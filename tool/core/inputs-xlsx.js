'use strict';

/**
 * XUẤT KHUÔN / NẠP LẠI dữ liệu đầu vào bằng Excel (M5-b).
 *
 * 🔴 Nút XUẤT KHUÔN quan trọng hơn nút NẠP. Không có khuôn thì tester phải tự gõ `case_id` và
 * `field` cho đúng; gõ sai một ký tự là dòng đó rơi vào hư không — biến `VNPOST_CASE_*` sinh ra
 * chẳng spec nào đọc, run vẫn xanh và người điền đinh ninh đã đổi được input.
 * Vì vậy nạp xong KHÔNG ghi thẳng: trả về bảng đối chiếu để người dùng nhìn rồi mới xác nhận.
 *
 * Dùng `exceljs` — đã có sẵn trong deps cho phần xuất báo cáo, không thêm phụ thuộc mới.
 */

const ExcelJS = require('exceljs');

const inputs = require('./inputs');

const SHEET_NAME = 'Input';
const HEADER = ['case_id', 'field', 'value', 'mặc định trong file', 'bắt buộc', 'ghi chú'];

/** Sổ Excel gồm mọi case × mọi field của module, đã điền sẵn giá trị đang hiệu lực. */
async function buildTemplate(mod, profileId, cases = null) {
  const described = inputs.describe(mod, profileId, cases);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(SHEET_NAME);

  ws.addRow([`Module: ${mod.name} (${mod.id})`]);
  ws.addRow(['Điền cột "value" rồi nạp lại file này. Để TRỐNG = dùng giá trị mặc định trong test-input.json.']);
  ws.addRow(['KHÔNG đặt tài khoản/mật khẩu ở đây — secret nằm trong hồ sơ môi trường.']);
  ws.addRow([]);

  const header = ws.addRow(HEADER);
  header.font = { bold: true };

  for (const item of described.items) {
    for (const field of item.fields) {
      ws.addRow([
        item.caseId,
        field.key,
        field.overridden ? field.value : '',
        field.defaultText,
        field.required ? 'x' : '',
        item.name,
      ]);
    }
    for (const flag of item.flags) {
      ws.addRow([
        item.caseId,
        flag.key,
        flag.overridden ? String(flag.value) : '',
        String(flag.defaultValue),
        '',
        flag.key === 'allowMutation' && item.mutates ? 'CASE GHI DỮ LIỆU — true là ghi thật' : 'true / false',
      ]);
    }
  }

  ws.columns = [{ width: 18 }, { width: 22 }, { width: 28 }, { width: 24 }, { width: 10 }, { width: 52 }];
  return wb;
}

function cellText(cell) {
  if (cell === undefined || cell === null) return '';
  const value = cell.value;
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    if (value.text !== undefined) return String(value.text);
    if (value.result !== undefined) return String(value.result);
    if (value.richText) return value.richText.map((r) => r.text).join('');
    return '';
  }
  return String(value);
}

/**
 * Đọc file người dùng nạp lên → bảng đối chiếu. KHÔNG ghi gì vào DB.
 *
 * @returns {{rows: Array, counts: object}} mỗi row có `action`:
 *   `set` (đè mới/đổi giá trị) · `clear` (bỏ đè, về mặc định) · `same` (không đổi) ·
 *   `unknown-case` / `unknown-field` (không khớp khuôn — 🔴 phải hiện ra, không được nuốt)
 */
async function parseUpload(buffer, mod, profileId, cases = null) {
  const described = inputs.describe(mod, profileId, cases);

  const known = new Map();
  for (const item of described.items) {
    const fields = new Map();
    for (const field of item.fields) {
      fields.set(field.key, { current: String(field.value ?? ''), kind: field.kind, overridden: field.overridden });
    }
    for (const flag of item.flags) {
      fields.set(flag.key, { current: String(flag.value), kind: 'boolean', overridden: flag.overridden });
    }
    known.set(item.caseId, fields);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.getWorksheet(SHEET_NAME) || wb.worksheets[0];
  if (!ws) throw new Error('File Excel không có sheet nào.');

  // Tìm dòng tiêu đề thay vì tin vào số dòng cố định — người dùng hay chèn thêm dòng ghi chú
  // ở đầu file, cố định dòng 5 là lệch toàn bộ mà không báo lỗi.
  let headerRow = 0;
  ws.eachRow((row, rowNumber) => {
    if (headerRow) return;
    const a = cellText(row.getCell(1)).trim().toLowerCase();
    const b = cellText(row.getCell(2)).trim().toLowerCase();
    if (a === 'case_id' && b === 'field') headerRow = rowNumber;
  });
  if (!headerRow) throw new Error('Không tìm thấy dòng tiêu đề "case_id | field | value". Hãy tải khuôn Excel rồi điền vào đó.');

  const rows = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;

    const caseId = cellText(row.getCell(1)).trim();
    const field = cellText(row.getCell(2)).trim();
    if (!caseId && !field) return;

    const value = cellText(row.getCell(3)).trim();
    const entry = { rowNumber, caseId, field, value };

    const fields = known.get(caseId);
    if (!fields) return rows.push({ ...entry, action: 'unknown-case', note: 'Case không có trong test-input.json của module' });

    const meta = fields.get(field);
    if (!meta) return rows.push({ ...entry, action: 'unknown-field', note: 'Field không có trong khuôn của case này' });

    if (meta.kind === 'boolean' && value !== '' && value !== 'true' && value !== 'false') {
      return rows.push({ ...entry, action: 'unknown-field', note: 'Cờ này chỉ nhận true hoặc false' });
    }
    if (meta.kind === 'number' && value !== '' && !Number.isFinite(Number(value))) {
      return rows.push({ ...entry, action: 'unknown-field', note: 'Field này là số, giá trị không phải số' });
    }

    // 🔴 Ô trống mà vốn KHÔNG có lớp đè thì là "không đổi", không phải "về mặc định". Gộp hai thứ
    // này thì mỗi lần nạp lại khuôn là bảng đối chiếu hiện hàng chục dòng "về mặc định" giả —
    // người dùng quen mắt bấm qua, và cái ngày họ xoá nhầm một ô thật thì nó lẫn trong đám đó.
    if (value === '') {
      return meta.overridden
        ? rows.push({ ...entry, action: 'clear', current: meta.current, note: 'Bỏ lớp đè, về giá trị trong file' })
        : rows.push({ ...entry, action: 'same', current: meta.current, note: '' });
    }
    if (value === meta.current) return rows.push({ ...entry, action: 'same', current: meta.current, note: '' });

    rows.push({ ...entry, action: 'set', current: meta.current, note: '' });
  });

  const counts = {
    set: rows.filter((r) => r.action === 'set').length,
    clear: rows.filter((r) => r.action === 'clear').length,
    same: rows.filter((r) => r.action === 'same').length,
    unknown: rows.filter((r) => r.action.startsWith('unknown')).length,
  };

  return { rows, counts };
}

/** Chỉ ghi dòng `set` và `clear`; dòng không khớp khuôn bị BỎ QUA có chủ đích. */
function applyRows(mod, profileId, rows, updatedBy) {
  const entries = rows
    .filter((r) => r.action === 'set' || r.action === 'clear')
    .map((r) => ({ caseId: r.caseId, field: r.field, value: r.action === 'clear' ? '' : r.value }));

  return inputs.setOverrides(profileId, mod.id, inputs.normalizeAgainstTemplate(mod, entries), updatedBy);
}

module.exports = { SHEET_NAME, buildTemplate, parseUpload, applyRows };
