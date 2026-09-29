'use strict';

/**
 * Danh mục CASE của một module = `test-cases.csv` ĐỐI CHIẾU với `playwright --list`.
 *
 * 🔴 Vì sao phải đối chiếu hai nguồn chứ không tin một nguồn:
 * - chỉ tin CSV  → cho tick những case CHƯA CÓ SCRIPT, bấm chạy ra 0 test mà không ai biết vì sao;
 * - chỉ tin spec → mất tiền điều kiện / bước kiểm thử, và không thấy case tài liệu đã nêu mà chưa ai viết.
 * Đối chiếu mới ra được 4 trạng thái ở `CASE_STATUS`, và đó chính là thứ UI cần hiển thị.
 *
 * ⭐ Điểm tựa: title spec ĐÃ mang mã case — `test('CNDB-ND-001 - ...')`. Không có quy ước này thì
 * phải gắn tag lại toàn bộ spec trước khi làm được gì.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { PROJECT_ROOT } = require('./modules');

const CASE_STATUS = {
  RUNNABLE: 'RUNNABLE', // có trong CSV và có spec khớp mã
  NO_SCRIPT: 'NO_SCRIPT', // có trong CSV, chưa ai viết spec
  ORPHAN: 'ORPHAN', // có spec, không có trong CSV
};

/** Project chỉ để đăng nhập lấy session — phải CHẠY nhưng KHÔNG hiện như case nghiệp vụ. */
const SETUP_PROJECTS = new Set(['setup']);

/**
 * 🔴 Test DỰNG DỮ LIỆU — không phải case, nhưng case khác PHỤ THUỘC vào nó.
 *
 * Module 13 có `test('DỰNG DỮ LIỆU - Lập 2 phiếu nộp tiền rồi bàn giao...')`. Nếu người dùng tick
 * CNDB-CD-006 rồi ta chỉ `--grep "CNDB-CD-006"`, test dựng dữ liệu bị loại, case chạy trên kho dữ
 * liệu rỗng và SKIP hoặc FAIL — 🔴 sai im lặng, trông như lỗi sản phẩm chứ không phải lỗi công cụ.
 * Vì vậy `runner.js` (GĐ 3) PHẢI tự nối các test này vào `--grep` cùng với case được chọn.
 */
const FIXTURE_TITLE = /^\s*(DỰNG DỮ LIỆU|DUNG DU LIEU)\b/i;

/**
 * Mã case ở đầu title spec. Hai lối cùng tồn tại:
 *
 *   - **Mã theo HDSD** (chuẩn mới): `<phân hệ>_<task>_<STT>` — `02_020_001`, `04_3_060_002`.
 *     Phân hệ có thể có mã con (`04_3`), nên phần đầu là `\d\d` hoặc `\d\d_\d`.
 *   - **Mã cũ** còn ở 3 module chưa có HDSD: `CNDB-ND-001`, `Vantai_10`, `GVMD-001`.
 *
 * 🔴 Regex này phải GIỐNG HỆT ở `core/cases.js` và `core/report.js`. Lệch nhau thì màn chọn case
 * nhận ra mã còn báo cáo thì không — cột "Mã" rỗng và việc so với run trước mất khoá đối chiếu.
 * 🔴 Nhánh mã cũ bắt buộc đoạn cuối có chữ số, nếu không "Check-in khách hàng" bị nhận nhầm
 * `Check-in` là mã case.
 */
// 🔴 Nhánh đầu phải nhận cả mã phân hệ có CHỮ đi kèm (`03a_010_001`, `03b_060_002`) và cả mã
//    task chữ (`03a_PQ_001`). Thiếu `[a-z]?` thì hai phân hệ 03a/03b bị đếm là "0 case có script"
//    dù spec đã viết đủ — lỗi này từng làm checklist báo sai.
// 🔴 Nhánh đầu phải nhận cả ba kiểu mã phân hệ đang dùng:
//    `02_020_007` · `04_3_060_001` · `03a_PQ_001` (chữ sau số) ·
//    `12-don-vi-van-tai_070_001` (tên thư mục có gạch nối nằm ngay trong mã case).
//    Thiếu nhánh gạch nối thì cả phân hệ `12-don-vi-van-tai` bị đếm sai VÀ bộ sinh stub tạo
//    trùng một bản skip cho mọi case đã có script.
const CASE_ID_IN_TITLE = /^\s*(\d\d[a-z]?(?:-[a-z]+)*(?:_\d)?_(?:\d{3}|[A-Z]{2,}\d*)_\d{3}|[A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)*[-_][A-Za-z]*\d+)/;

/**
 * 🔴 Case GHI DỮ LIỆU THẬT — chạy nhầm môi trường là hỏng dữ liệu, không undo được.
 *
 * Đây là PHỎNG ĐOÁN theo từ khoá, không phải sự thật. Nó tồn tại để cảnh báo, không để quyết định.
 * Cách nhận: có động từ ghi, TRỪ KHI tên case mở đầu bằng dấu hiệu case đọc / case bị chặn —
 * "Chặn tạo bản khai khi bỏ trống số tiền" là case ÂM, hệ thống chặn nên KHÔNG có gì được ghi.
 * Không lọc bước này thì 25/31 case của module 13 đều bị gắn cờ, và cái cờ trở thành vô nghĩa.
 *
 * Về lâu dài nên thêm hẳn một cột trong `test-cases.csv` để tài liệu tự khai, thay cho đoán mò.
 */
const WRITE_VERBS = [
  'tao', 'them moi', 'luu', 'sua', 'xoa', 'duyet', 'ky ', 'nop', 'huy', 'cap nhat',
  'phat hanh', 'nhap kho', 'xuat kho', 'thanh toan', 'xac nhan', 'chot', 'ban giao',
  'gui', 'lap phieu', 'dung du lieu',
];

/** Mở đầu bằng những cụm này = case ĐỌC hoặc case bị chặn → không ghi gì. */
const READ_ONLY_PREFIXES = [
  'chan', 'khong', 'canh bao', 'man ', 'mo man', 'mo duoc', 'hien thi', 'hien ',
  'loc theo', 'tong ', 'cong thuc', 'drawer', 'bang ', 'vai ', 'duong ', 'so du',
];

/** Bỏ dấu tiếng Việt để so từ khoá — CSV trong repo trộn cả có dấu lẫn không dấu. */
function deaccent(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Parser CSV đúng chuẩn RFC4180.
 * 🚫 KHÔNG dùng `split(',')`: ô trong `13-cong-no-diem-ban-tinh/test-cases.csv` có cả dấu phẩy,
 * ngoặc kép lồng (`""200""`) và xuống dòng bên trong ô — split sẽ vỡ hàng mà không báo lỗi.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const content = text.replace(/^﻿/, '');

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);

  return rows;
}

/**
 * Bản đồ cột → khoá chuẩn.
 * 🔴 Repo đang tồn tại HAI bộ header khác nhau; thiếu cột thì để rỗng chứ không được vỡ:
 *   - `ID,Ten test case,Tien dieu kien,Buoc kiem thu,Ket qua ky vong`  (08,09,10,13,14)
 *   - `ID,Nhom,Test case,Ky vong`                                      (02,05)
 */
const HEADER_MAP = {
  id: ['id', 'ma', 'ma case'],
  name: ['ten test case', 'test case', 'ten case', 'ten'],
  group: ['nhom', 'nhom chuc nang'],
  precondition: ['tien dieu kien', 'dieu kien'],
  steps: ['buoc kiem thu', 'cac buoc', 'buoc'],
  expected: ['ket qua ky vong', 'ky vong', 'ket qua'],
};

function mapHeaders(headerRow) {
  const normalized = headerRow.map((h) => deaccent(h).trim());
  const index = {};

  for (const [key, aliases] of Object.entries(HEADER_MAP)) {
    const found = normalized.findIndex((h) => aliases.includes(h));
    if (found >= 0) index[key] = found;
  }
  return index;
}

/** Đọc case khai trong tài liệu. Module chưa có CSV → trả mảng rỗng, KHÔNG ném lỗi. */
function readCsvCases(mod) {
  if (!mod.csvPath || !fs.existsSync(mod.csvPath)) return [];

  const rows = parseCsv(fs.readFileSync(mod.csvPath, 'utf8'));
  if (rows.length < 2) return [];

  const index = mapHeaders(rows[0]);
  if (index.id === undefined) return [];

  // Case QC đã xoá (cột `Trang thai QC` = QC_XOA, ghi bởi bin/dong-bo-tu-qc.js) — không liệt kê,
  // không cho chọn chạy. Spec vẫn giữ; playwright.config.js cũng loại nó qua `grepInvert`.
  const iQc = rows[0].map((h) => h.trim()).indexOf('Trang thai QC');
  const cases = [];
  for (const row of rows.slice(1)) {
    const id = (row[index.id] || '').trim();
    if (!id) continue;
    if (iQc >= 0 && (row[iQc] || '').trim() === 'QC_XOA') continue;

    const pick = (key) => (index[key] !== undefined ? (row[index[key]] || '').trim() : '');

    cases.push({
      id,
      name: pick('name'),
      group: pick('group'),
      precondition: pick('precondition'),
      steps: pick('steps'),
      expected: pick('expected'),
    });
  }
  return cases;
}

/**
 * Hỏi Playwright xem module này thực sự có những test nào.
 *
 * 🔴 Ghi JSON ra FILE qua `PLAYWRIGHT_JSON_OUTPUT_NAME` chứ không đọc stdout: stdout còn lẫn
 * dòng của reporter khác và của chính npx, parse là hỏng.
 */
function listPlaywrightTests(mod) {
  const outFile = path.join(os.tmpdir(), `vnpost-list-${mod.id}-${process.pid}.json`);

  const env = {
    ...process.env,
    PLAYWRIGHT_JSON_OUTPUT_NAME: outFile,
    FORCE_COLOR: '0',
  };
  // Module không có config riêng → config động cần biết thư mục tài liệu.
  if (!mod.hasConfig) env.DOC_TEST_DIR = mod.dir;

  const result = spawnSync(
    'npx',
    ['playwright', 'test', '--config', mod.defaultConfig, '--list', '--reporter=json'],
    { cwd: PROJECT_ROOT, env, encoding: 'utf8', timeout: 120_000 },
  );

  if (!fs.existsSync(outFile)) {
    return {
      tests: [],
      error: (result.stderr || result.stdout || 'Không chạy được `playwright --list`').trim().slice(0, 2000),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  } catch (err) {
    return { tests: [], error: `Không đọc được kết quả --list: ${err.message}` };
  } finally {
    fs.rmSync(outFile, { force: true });
  }

  const tests = [];
  const walk = (suite) => {
    for (const child of suite.suites || []) walk(child);
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        tests.push({
          title: spec.title,
          file: spec.file,
          line: spec.line,
          project: test.projectName || '',
          caseId: (spec.title.match(CASE_ID_IN_TITLE) || [])[1] || null,
        });
      }
    }
  };
  for (const suite of parsed.suites || []) walk(suite);

  return { tests, error: null };
}

function looksLikeWrite(name, ...extra) {
  const title = deaccent(name || '').trim();
  if (READ_ONLY_PREFIXES.some((prefix) => title.startsWith(prefix))) return false;

  const haystack = deaccent([name, ...extra].filter(Boolean).join(' '));
  return WRITE_VERBS.some((verb) => haystack.includes(verb));
}

/**
 * Danh mục case đã đối chiếu, sẵn sàng đổ ra UI.
 *
 * @returns {{cases: Array, setupTests: Array, projects: string[], error: string|null, stats: object}}
 */
function getCases(mod) {
  const csvCases = readCsvCases(mod);
  const { tests, error } = listPlaywrightTests(mod);

  const setupTests = tests.filter((t) => SETUP_PROJECTS.has(t.project));
  const fixtureTests = tests.filter((t) => !SETUP_PROJECTS.has(t.project) && FIXTURE_TITLE.test(t.title));
  const realTests = tests.filter((t) => !SETUP_PROJECTS.has(t.project) && !FIXTURE_TITLE.test(t.title));

  // Một mã case có thể chạy ở nhiều project (nhiều vai) → gom lại.
  const byCaseId = new Map();
  const noIdTests = [];
  for (const test of realTests) {
    if (!test.caseId) {
      noIdTests.push(test);
      continue;
    }
    if (!byCaseId.has(test.caseId)) byCaseId.set(test.caseId, []);
    byCaseId.get(test.caseId).push(test);
  }

  const cases = [];

  for (const csvCase of csvCases) {
    const matched = byCaseId.get(csvCase.id) || [];
    byCaseId.delete(csvCase.id);

    cases.push({
      ...csvCase,
      status: matched.length > 0 ? CASE_STATUS.RUNNABLE : CASE_STATUS.NO_SCRIPT,
      projects: [...new Set(matched.map((t) => t.project))],
      titles: matched.map((t) => t.title),
      files: [...new Set(matched.map((t) => t.file))],
      writesData: looksLikeWrite(csvCase.name, csvCase.steps),
      selectable: matched.length > 0,
    });
  }

  // Còn lại trong `byCaseId` = có spec nhưng tài liệu chưa khai → mồ côi, vẫn chạy được.
  for (const [caseId, matched] of byCaseId) {
    // 🔴 Phải bóc mã case khỏi title TRƯỚC khi đoán ghi/đọc: để nguyên "KHO-028 Mở màn ..."
    //    thì tên bắt đầu bằng "kho-028", mọi dấu hiệu case-đọc ở đầu câu đều trượt.
    const name = matched[0].title.replace(CASE_ID_IN_TITLE, '').replace(/^\s*[-–—/\d]+\s*/, '').trim();

    cases.push({
      id: caseId,
      name,
      group: '',
      precondition: '',
      steps: '',
      expected: '',
      status: CASE_STATUS.ORPHAN,
      projects: [...new Set(matched.map((t) => t.project))],
      titles: matched.map((t) => t.title),
      files: [...new Set(matched.map((t) => t.file))],
      writesData: looksLikeWrite(name),
      selectable: true,
    });
  }

  const stats = {
    total: cases.length,
    runnable: cases.filter((c) => c.status === CASE_STATUS.RUNNABLE).length,
    noScript: cases.filter((c) => c.status === CASE_STATUS.NO_SCRIPT).length,
    orphan: cases.filter((c) => c.status === CASE_STATUS.ORPHAN).length,
    writesData: cases.filter((c) => c.writesData).length,
    // Test có spec nhưng title không mở đầu bằng mã case → KHÔNG chọn riêng lẻ được.
    untagged: noIdTests.length,
    setup: setupTests.length,
    fixture: fixtureTests.length,
  };

  return {
    cases,
    setupTests,
    fixtureTests,
    noIdTests,
    projects: [...new Set(realTests.map((t) => t.project))],
    error,
    stats,
  };
}

// 🔴 Xuất CASE_ID_IN_TITLE để `bin/checklist.js` dùng CHUNG, 🚫 đừng chép thành bản thứ ba:
// ba bản regex lệch nhau thì màn chọn case, báo cáo và checklist đếm ra ba con số khác nhau.
module.exports = { CASE_STATUS, CASE_ID_IN_TITLE, parseCsv, readCsvCases, listPlaywrightTests, getCases, deaccent };
