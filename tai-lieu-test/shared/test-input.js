const fs = require('node:fs');
const path = require('node:path');

require('./config');

const INPUT_FILE_NAME = 'test-input.json';

function envKey(caseId, key) {
  const normalize = (value) =>
    String(value)
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^0-9a-zA-Z]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  return `VNPOST_CASE_${normalize(caseId)}_${normalize(key)}`;
}

/**
 * Ép giá trị đè (luôn là CHUỖI vì đi qua biến môi trường) về đúng kiểu của giá trị trong file.
 *
 * 🔴 Không có bước này thì `openingAmount: 1000000` trong `test-input.json` khi bị đè sẽ thành
 * chuỗi `"1000000"`. Spec nào cộng/so sánh số sẽ ra kết quả khác mà KHÔNG có lỗi nào phát ra —
 * `"1000000" + 1` là `"10000001"`. Bẫy này chỉ lộ khi có người đè thật, nên nó nằm im cho tới
 * lúc web công cụ (M5) bắt đầu bơm `VNPOST_CASE_*`.
 */
function coerce(raw, sample) {
  if (typeof sample === 'number') {
    const num = Number(raw);
    return Number.isFinite(num) ? num : raw;
  }
  if (typeof sample === 'boolean') return raw === 'true';
  return raw;
}

function readInputFile(moduleDir) {
  const filePath = path.join(moduleDir, INPUT_FILE_NAME);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Thiếu file input: ${filePath}. ` +
        'Hãy tạo test-input.json cho phân hệ này (mẫu: tai-lieu-test/shared/test-input.example.json).',
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`File input không phải JSON hợp lệ: ${filePath}. ${error.message}`);
  }

  if (!parsed || typeof parsed.cases !== 'object' || parsed.cases === null) {
    throw new Error(`File input thiếu object "cases": ${filePath}`);
  }

  return parsed;
}

/**
 * Đọc input của đúng một case, đã áp override từ biến môi trường.
 *
 * Thứ tự ưu tiên: biến môi trường > test-input.json.
 * Override một field: VNPOST_CASE_<CASE_ID>_<FIELD>, ví dụ
 * case "NCC-C1-005" field "groupName" -> VNPOST_CASE_NCC_C1_005_GROUP_NAME.
 */
function loadCaseInput(moduleDir, caseId) {
  const file = readInputFile(moduleDir);
  const entry = file.cases[caseId];

  if (entry === undefined) {
    throw new Error(
      `Case "${caseId}" chưa được khai báo trong ${path.join(moduleDir, INPUT_FILE_NAME)}.`,
    );
  }

  const data = { ...(entry.data || {}) };
  for (const key of Object.keys(data)) {
    const override = process.env[envKey(caseId, key)];
    if (override !== undefined && override !== '') {
      data[key] = coerce(override, data[key]);
    }
  }

  const allowOverride = process.env[envKey(caseId, 'allowMutation')];
  const allowMutation =
    allowOverride !== undefined && allowOverride !== ''
      ? allowOverride === 'true'
      : entry.allowMutation === true;

  const enabledOverride = process.env[envKey(caseId, 'enabled')];
  const enabled =
    enabledOverride !== undefined && enabledOverride !== ''
      ? enabledOverride === 'true'
      : entry.enabled !== false;

  return {
    caseId,
    enabled,
    allowMutation,
    mutates: entry.mutates === true,
    data,
    required: Array.isArray(entry.required) ? entry.required : [],
  };
}

/**
 * Trả về lý do phải bỏ qua case, hoặc null nếu đủ điều kiện chạy.
 * Spec dùng: test.skip(Boolean(reason), reason ?? '')
 * Không tự gọi test.skip để loader dùng được cả ngoài Playwright.
 */
function skipReason(input) {
  if (!input.enabled) {
    // Nói cả hai nguồn: từ khi web công cụ (M5) bơm `VNPOST_CASE_*`, case có thể bị tắt ở lớp đè
    // chứ không phải trong file. Chỉ nhắc mỗi file là người đọc log đi mở file, thấy
    // `enabled: true` và kết luận công cụ hỏng.
    return `Case ${input.caseId} đang tắt — trong ${INPUT_FILE_NAME} hoặc ở ${envKey(input.caseId, 'enabled')}.`;
  }

  const missing = input.required.filter((key) => {
    const value = input.data[key];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    return (
      `Case ${input.caseId} thiếu input bắt buộc: ${missing.join(', ')}. ` +
      `Điền vào ${INPUT_FILE_NAME} hoặc đặt ${missing
        .map((key) => envKey(input.caseId, key))
        .join(', ')}.`
    );
  }

  if (input.mutates && !input.allowMutation) {
    return (
      `Case ${input.caseId} có thay đổi dữ liệu nhưng allowMutation=false. ` +
      `Bật trong ${INPUT_FILE_NAME} hoặc đặt ${envKey(input.caseId, 'allowMutation')}=true.`
    );
  }

  return null;
}

module.exports = {
  INPUT_FILE_NAME,
  envKey,
  loadCaseInput,
  skipReason,
};
