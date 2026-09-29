'use strict';

/**
 * Đọc `results.json` của Playwright → báo cáo chuẩn hoá cho UI, và dọn artifact thừa.
 */

const fs = require('node:fs');
const path = require('node:path');

const { runDir } = require('./db');

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
const CASE_ID_IN_TITLE = /^\s*(\d\d(?:_\d)?_\d{3}_\d{3}|[A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)*[-_][A-Za-z]*\d+)/;

/** Bước đăng nhập / dựng dữ liệu — không phải case nghiệp vụ. */
const NON_CASE_TITLE = /^\s*(DỰNG DỮ LIỆU|DUNG DU LIEU)\b/i;

/** Mã màu ANSI trong thông báo lỗi — bóc đi trước khi đưa ra HTML. */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/** Trạng thái Playwright → nhãn tiếng Việt cho UI. */
const RUN_STATUS_LABEL = {
  QUEUED: 'Đang chờ',
  RUNNING: 'Đang chạy',
  PASSED: 'Đạt',
  FAILED: 'Có case lỗi',
  SETUP_FAILED: 'Không đăng nhập được',
  STOPPED: 'Đã dừng',
  ERROR: 'Không chạy được',
};

const STATUS_LABEL = {
  passed: 'Đạt',
  failed: 'Lỗi',
  timedOut: 'Quá giờ',
  skipped: 'Bỏ qua',
  interrupted: 'Bị ngắt',
};

function flattenTests(parsed) {
  const out = [];

  const walk = (suite) => {
    for (const child of suite.suites || []) walk(child);
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const last = (test.results || [])[test.results.length - 1] || {};
        out.push({
          caseId: (spec.title.match(CASE_ID_IN_TITLE) || [])[1] || null,
          title: spec.title,
          file: spec.file,
          line: spec.line,
          project: test.projectName || '',
          status: last.status || test.status || 'unknown',
          durationMs: last.duration || 0,
          error: last.error ? String(last.error.message || '').replace(ANSI, '').trim() : '',
          attachments: (last.attachments || []).map((a) => ({
            name: a.name,
            contentType: a.contentType,
            path: a.path,
          })),
        });
      }
    }
  };

  for (const suite of parsed.suites || []) walk(suite);
  return out;
}

function emptyStats() {
  return { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, setupTotal: 0, setupFailed: 0, passRate: 0 };
}

/**
 * @returns {{tests:Array, setupTests:Array, stats:object, ok:boolean}|null} null khi chưa có results.json
 */
function readResults(runId) {
  const file = path.join(runDir(runId), 'results.json');
  if (!fs.existsSync(file)) return null;

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return { tests: [], setupTests: [], stats: emptyStats(), ok: false, error: `results.json hỏng: ${err.message}` };
  }

  const all = flattenTests(parsed);
  // 🔴 Bước đăng nhập và bước dựng dữ liệu KHÔNG tính vào tỉ lệ đạt — chúng không phải case.
  // Nhưng nếu chúng hỏng thì phải nói rõ: mọi case chạy sau đó đều vô nghĩa.
  const setupTests = all.filter((t) => t.project === 'setup' || NON_CASE_TITLE.test(t.title));
  const tests = all.filter((t) => !setupTests.includes(t));

  const isFail = (t) => t.status === 'failed' || t.status === 'timedOut';

  const stats = {
    total: tests.length,
    passed: tests.filter((t) => t.status === 'passed').length,
    failed: tests.filter(isFail).length,
    skipped: tests.filter((t) => t.status === 'skipped').length,
    durationMs: all.reduce((sum, t) => sum + t.durationMs, 0),
    setupTotal: setupTests.length,
    setupFailed: setupTests.filter(isFail).length,
  };
  stats.passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

  return { tests, setupTests, stats, ok: stats.failed === 0 && stats.setupFailed === 0 };
}

/**
 * So với run TRƯỚC của cùng module → tách "lỗi mới" khỏi "lỗi cũ".
 *
 * 🔴 Đây là thứ quyết định báo cáo có dùng được không: 12 case đỏ mà 11 cái đã đỏ từ tuần trước
 * là tình huống hoàn toàn khác với 12 case đỏ mới toanh.
 */
function compare(current, previous) {
  if (!previous) return { newFailures: [], fixed: [], stillFailing: [], hasPrevious: false };

  const prevStatus = new Map(previous.tests.map((t) => [`${t.project}::${t.caseId || t.title}`, t.status]));
  const isFail = (status) => status === 'failed' || status === 'timedOut';

  const newFailures = [];
  const stillFailing = [];
  const fixed = [];

  for (const test of current.tests) {
    const before = prevStatus.get(`${test.project}::${test.caseId || test.title}`);
    if (isFail(test.status)) {
      (isFail(before) ? stillFailing : newFailures).push(test);
    } else if (test.status === 'passed' && isFail(before)) {
      fixed.push(test);
    }
  }

  return { newFailures, fixed, stillFailing, hasPrevious: true };
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

/**
 * Dọn artifact của case ĐẠT.
 *
 * 🔴 Mọi module đang để `video: 'on'` — quay cả test đạt. Trên server dùng chung, mỗi run vài chục
 * video là đầy đĩa trong vài tuần. Playwright không có cờ CLI đổi `video`, nên cách rẻ nhất là xoá
 * sau khi chạy: video của case ĐẠT không ai xem, case LỖI thì giữ nguyên.
 */
function pruneArtifacts(runId, results) {
  if (!results) return { removed: 0, freedBytes: 0 };

  const artifactsRoot = path.join(runDir(runId), 'artifacts');
  if (!fs.existsSync(artifactsRoot)) return { removed: 0, freedBytes: 0 };

  const keep = new Set();
  for (const test of [...results.tests, ...(results.setupTests || [])]) {
    // Chỉ giữ artifact của case LỖI. Case đạt không ai xem; case BỎ QUA thì chẳng có gì để xem.
    if (test.status !== 'failed' && test.status !== 'timedOut') continue;
    for (const attachment of test.attachments) {
      if (attachment.path) keep.add(path.dirname(attachment.path));
    }
  }

  let removed = 0;
  let freedBytes = 0;

  for (const entry of fs.readdirSync(artifactsRoot, { withFileTypes: true })) {
    const full = path.join(artifactsRoot, entry.name);
    if (!entry.isDirectory() || keep.has(full)) continue;

    freedBytes += dirSize(full);
    fs.rmSync(full, { recursive: true, force: true });
    removed += 1;
  }

  return { removed, freedBytes };
}

module.exports = { readResults, compare, pruneArtifacts, STATUS_LABEL, RUN_STATUS_LABEL, emptyStats };
