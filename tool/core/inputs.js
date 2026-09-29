'use strict';

/**
 * DỮ LIỆU ĐẦU VÀO CỦA CASE (M5) — xem `plan_web_auto_test.md` mục 4 / M5.
 *
 * Ba mặt tiền (form trên web · nạp Excel · Google Sheet ở GĐ 9) đổ vào CÙNG một chỗ:
 * bảng `case_inputs` trong SQLite, rồi runner dịch ra biến `VNPOST_CASE_<CASE_ID>_<FIELD>`
 * bơm qua `spawn`. Không sửa spec, không sinh file JSON tạm.
 *
 * 🔴 TUYỆT ĐỐI KHÔNG GHI ĐÈ `tai-lieu-test/<module>/test-input.json`. File đó nằm trong git và
 * công cụ chạy trên server DÙNG CHUNG: người này sửa input là run của người kia đổi dữ liệu theo,
 * test VẪN XANH — chỉ là xanh trên input của người khác, không có lỗi nào để mà bắt. Đúng cái bẫy
 * mà `core/profiles.js` đã tránh với `.env`. File JSON là KHUÔN + giá trị mặc định; DB là lớp đè.
 *
 * ⭐ Điểm tựa: `shared/test-input.js` đã có sẵn thứ tự ưu tiên `env > file`, và `envKey()` ở đó là
 * NGUỒN SỰ THẬT DUY NHẤT cho cách đặt tên biến. Import lại chứ không chép — chép là hai bên lệch
 * nhau lúc nào không biết, và biến ta bơm sẽ rơi vào hư không mà test vẫn chạy bình thường.
 */

const fs = require('node:fs');
const path = require('node:path');

const { envKey, INPUT_FILE_NAME } = require('../../tai-lieu-test/shared/test-input');
const { getDb, nowIso } = require('./db');

/**
 * Hai cờ điều khiển, không phải dữ liệu nghiệp vụ — `shared/test-input.js` đọc chúng bằng đúng
 * cơ chế envKey nên ở đây coi như "field ảo" để dùng chung một đường lưu/đè.
 */
const FLAG_FIELDS = ['enabled', 'allowMutation'];

/** Khuôn của một module = `test-input.json` trong thư mục module. Không có file → khuôn rỗng. */
function readTemplate(mod) {
  const filePath = path.join(mod.dir, INPUT_FILE_NAME);
  if (!fs.existsSync(filePath)) {
    return { exists: false, filePath, cases: new Map(), error: null };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return { exists: true, filePath, cases: new Map(), error: `File input không phải JSON hợp lệ: ${err.message}` };
  }

  if (!parsed || typeof parsed.cases !== 'object' || parsed.cases === null) {
    return { exists: true, filePath, cases: new Map(), error: 'File input thiếu object "cases".' };
  }

  const cases = new Map();
  for (const [caseId, entry] of Object.entries(parsed.cases)) {
    const data = entry && typeof entry.data === 'object' && entry.data !== null ? entry.data : {};
    const required = Array.isArray(entry.required) ? entry.required : [];

    cases.set(caseId, {
      caseId,
      enabled: entry.enabled !== false,
      mutates: entry.mutates === true,
      allowMutation: entry.allowMutation === true,
      required,
      blocked: typeof entry._blocked === 'string' ? entry._blocked : '',
      role: typeof entry.role === 'string' ? entry.role : '',
      // Field nào `required` mà file để trống vẫn phải hiện ra form, nếu không người dùng
      // không có ô nào để điền và case cứ skip mãi mà không hiểu vì sao.
      fields: [...new Set([...Object.keys(data), ...required])].map((key) => ({
        key,
        defaultValue: data[key] === undefined ? '' : data[key],
        required: required.includes(key),
      })),
    });
  }

  return { exists: true, filePath, cases, error: null };
}

// ─── Lớp đè trong DB ──────────────────────────────────────────────────────────

function getOverrides(profileId, moduleId) {
  const rows = getDb()
    .prepare('SELECT case_id, field, value FROM case_inputs WHERE profile_id = ? AND module_id = ?')
    .all(profileId, moduleId);

  const byCase = new Map();
  for (const row of rows) {
    if (!byCase.has(row.case_id)) byCase.set(row.case_id, {});
    byCase.get(row.case_id)[row.field] = row.value;
  }
  return byCase;
}

/**
 * Ghi lớp đè. `value` rỗng = XOÁ lớp đè (quay về giá trị trong file), không phải "đè bằng chuỗi rỗng".
 *
 * 🔴 Một transaction cho cả lô: ghi nửa chừng rồi lỗi thì case này dùng input mới, case kia input cũ —
 * run ra kết quả trộn hai bộ dữ liệu mà báo cáo không hề nói gì.
 *
 * @param {Array<{caseId:string, field:string, value:any}>} entries
 */
function setOverrides(profileId, moduleId, entries, updatedBy = '') {
  const db = getDb();
  const del = db.prepare('DELETE FROM case_inputs WHERE profile_id = ? AND module_id = ? AND case_id = ? AND field = ?');
  const put = db.prepare(
    `INSERT INTO case_inputs (profile_id, module_id, case_id, field, value, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(profile_id, module_id, case_id, field)
     DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
  );

  let written = 0;
  let cleared = 0;

  db.transaction(() => {
    for (const entry of entries) {
      const value = entry.value === undefined || entry.value === null ? '' : String(entry.value).trim();
      if (value === '') {
        const info = del.run(profileId, moduleId, entry.caseId, entry.field);
        cleared += info.changes;
      } else {
        put.run(profileId, moduleId, entry.caseId, entry.field, value, updatedBy, nowIso());
        written += 1;
      }
    }
  })();

  return { written, cleared };
}

/**
 * Bỏ những mục trùng y hệt giá trị mặc định trong file, trước khi ghi.
 *
 * 🔴 Không có bước này thì mỗi lần bấm Lưu, mọi checkbox đang đúng mặc định đều thành "đang đè".
 * Nhãn "đang đè" mất nghĩa, và tệ hơn: sau này ai sửa `test-input.json` thì các case đó vẫn chạy
 * bằng giá trị đông cứng từ lần bấm Lưu năm ngoái — file đổi mà test không đổi, không ai ngờ.
 */
function normalizeAgainstTemplate(mod, entries) {
  const template = readTemplate(mod);

  return entries.map((entry) => {
    const tpl = template.cases.get(entry.caseId);
    if (!tpl) return entry;

    const value = entry.value === undefined || entry.value === null ? '' : String(entry.value).trim();

    if (FLAG_FIELDS.includes(entry.field)) {
      return { ...entry, value: value === String(tpl[entry.field]) ? '' : value };
    }

    const field = tpl.fields.find((f) => f.key === entry.field);
    if (!field) return { ...entry, value };
    return { ...entry, value: value === displayValue(field.defaultValue) ? '' : value };
  });
}

function clearModule(profileId, moduleId) {
  return getDb()
    .prepare('DELETE FROM case_inputs WHERE profile_id = ? AND module_id = ?')
    .run(profileId, moduleId).changes;
}

// ─── Hợp nhất khuôn + lớp đè, để đổ ra UI ─────────────────────────────────────

function displayValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Khuôn + lớp đè + trạng thái sẵn sàng của từng case.
 *
 * `blockingReason` lặp lại đúng logic `skipReason()` của `shared/test-input.js` NHƯNG chạy TRƯỚC
 * khi bấm chạy — để người dùng thấy "thiếu field X" ngay trên form, thay vì chạy xong mới thấy
 * case bị skip và phải đi đọc log mới biết vì sao.
 *
 * @param {{id:string, dir:string}} mod
 * @param {number|null} profileId
 * @param {Array<{id:string, name:string, selectable:boolean, writesData:boolean}>} [cases] danh mục case từ `core/cases.js`
 */
function describe(mod, profileId, cases = null) {
  const template = readTemplate(mod);
  const overrides = profileId ? getOverrides(profileId, mod.id) : new Map();
  const caseName = new Map((cases || []).map((c) => [c.id, c.name]));

  const items = [];

  for (const entry of template.cases.values()) {
    const over = overrides.get(entry.caseId) || {};

    const fields = entry.fields.map((field) => {
      const overridden = Object.prototype.hasOwnProperty.call(over, field.key);
      return {
        ...field,
        defaultText: displayValue(field.defaultValue),
        value: overridden ? over[field.key] : displayValue(field.defaultValue),
        overridden,
        envKey: envKey(entry.caseId, field.key),
        // Kiểu của giá trị trong file quyết định cách ép kiểu lúc chạy — xem `coerce()` ở
        // `shared/test-input.js`. Hiện ra để người điền biết ô này đang được hiểu là số hay chữ.
        kind: typeof field.defaultValue === 'number' ? 'number' : typeof field.defaultValue === 'boolean' ? 'boolean' : 'text',
      };
    });

    const flags = FLAG_FIELDS.map((key) => {
      const overridden = Object.prototype.hasOwnProperty.call(over, key);
      return {
        key,
        defaultValue: entry[key],
        value: overridden ? over[key] === 'true' : entry[key],
        overridden,
        envKey: envKey(entry.caseId, key),
      };
    });

    const effectiveEnabled = flags.find((f) => f.key === 'enabled').value;
    const effectiveAllow = flags.find((f) => f.key === 'allowMutation').value;

    const missing = fields.filter((f) => f.required && String(f.value).trim() === '').map((f) => f.key);

    let blockingReason = '';
    if (!effectiveEnabled) blockingReason = `Case đang tắt (enabled=false) trong ${INPUT_FILE_NAME} hoặc trên form.`;
    else if (missing.length > 0) blockingReason = `Thiếu input bắt buộc: ${missing.join(', ')}.`;
    else if (entry.mutates && !effectiveAllow) blockingReason = 'Case ghi dữ liệu nhưng allowMutation=false.';

    items.push({
      caseId: entry.caseId,
      name: caseName.get(entry.caseId) || '',
      role: entry.role,
      mutates: entry.mutates,
      blocked: entry.blocked,
      fields,
      flags,
      missing,
      blockingReason,
      hasOverride: Object.keys(over).length > 0,
    });
  }

  // Case có trong lớp đè nhưng khuôn không còn khai → nói thẳng, đừng im lặng bỏ qua:
  // biến vẫn được bơm nhưng chẳng spec nào đọc, người dùng tưởng đã đổi input mà thật ra không.
  const stale = [];
  for (const [caseId, fieldsOfCase] of overrides) {
    if (template.cases.has(caseId)) continue;
    stale.push({ caseId, fields: Object.keys(fieldsOfCase) });
  }

  return {
    moduleId: mod.id,
    template,
    items,
    stale,
    stats: {
      total: items.length,
      withOverride: items.filter((i) => i.hasOverride).length,
      blocked: items.filter((i) => i.blockingReason).length,
      mutates: items.filter((i) => i.mutates).length,
    },
  };
}

// ─── Đổ ra env cho runner ─────────────────────────────────────────────────────

/**
 * Biến `VNPOST_CASE_*` cho một run.
 *
 * 🔴 CHỈ bơm field người dùng THẬT SỰ đã đè. Bơm cả giá trị mặc định thì mọi số trong
 * `test-input.json` đi qua env thành chuỗi — `openingAmount: 1000000` biến thành `"1000000"` —
 * và spec nào so sánh kiểu sẽ sai mà không có lỗi nào phát ra.
 */
function buildCaseEnv(profileId, moduleId) {
  if (!profileId) return {};

  const env = {};
  for (const [caseId, fieldsOfCase] of getOverrides(profileId, moduleId)) {
    for (const [field, value] of Object.entries(fieldsOfCase)) {
      env[envKey(caseId, field)] = String(value);
    }
  }
  return env;
}

/** Tóm tắt (KHÔNG kèm giá trị) để ghi vào log run — biết đã đè những gì mà không lộ dữ liệu. */
function overrideSummary(profileId, moduleId) {
  const parts = [];
  for (const [caseId, fieldsOfCase] of getOverrides(profileId, moduleId)) {
    parts.push(`${caseId}: ${Object.keys(fieldsOfCase).join(', ')}`);
  }
  return parts;
}

module.exports = {
  FLAG_FIELDS,
  normalizeAgainstTemplate,
  INPUT_FILE_NAME,
  readTemplate,
  getOverrides,
  setOverrides,
  clearModule,
  describe,
  buildCaseEnv,
  overrideSummary,
  envKey,
};
