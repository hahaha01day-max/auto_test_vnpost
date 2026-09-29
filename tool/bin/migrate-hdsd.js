#!/usr/bin/env node
'use strict';

/**
 * Chuyển `tai-lieu-test/` sang cây thư mục theo mã HDSD.
 *
 *   node tool/bin/migrate-hdsd.js --dry    # chỉ in ra sẽ làm gì
 *   node tool/bin/migrate-hdsd.js          # làm thật
 *
 * 🔴 Script này CẮT FILE SPEC. Nó dựa vào quy ước định dạng hiện có của repo
 * (`test.describe(...)` bọc ngoài, mỗi `test(` bắt đầu ở đầu dòng). Sau khi chạy PHẢI đối chiếu
 * số test trước/sau bằng `--list` — script tự làm việc này và báo lệch.
 */

const fs = require('node:fs');
const path = require('node:path');

const { PROJECT_ROOT, listModules, getModule } = require('../core/modules');
const { getCases, readCsvCases } = require('../core/cases');
const { findTestBlocks, keepOnly } = require('./spec-slicer');
const { MODULES, CASE_TO_TASK, TITLE_TO_TASK, EXCLUDE_FROM_RUN, PROMOTION_POS_TASK, DEFERRED } = require('./hdsd-mapping');

const TEST_ROOT = path.join(PROJECT_ROOT, 'tai-lieu-test');
const HDSD_ROOT = path.join(PROJECT_ROOT, '..', 'resource', 'hdsd');
const DRY = process.argv.includes('--dry');

const CASE_ID_IN_TITLE = /^\s*([A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)*[-_][A-Za-z]*\d+)/;

/** Module cũ được chuyển đợt này (3 module trong DEFERRED bị bỏ qua). */
function sourceModules() {
  return listModules().filter((m) => !DEFERRED.includes(m.id) && !/^\d\d_/.test(m.id));
}

// ── Cắt file spec ────────────────────────────────────────────────────────────

function caseIdOf(title) {
  return (String(title).match(CASE_ID_IN_TITLE) || [])[1] || null;
}

/** Bỏ mã cũ khỏi title, giữ lại phần tên thật. */
function nameOf(title) {
  return title.replace(CASE_ID_IN_TITLE, '').replace(/^\s*[-–—/\d]+\s*/, '').trim();
}


// ── Sinh file ────────────────────────────────────────────────────────────────

function configTemplate(label, excludedFiles = []) {
  const exclude =
    excludedFiles.length > 0
      ? `\n  // 🔴 Giữ nguyên trạng thái trước khi chuyển: ${excludedFiles.join(', ')} vốn bị\n` +
        `  //    \`testMatch\` của module cũ loại ra, KHÔNG chạy. Bật lên là đổi hành vi, phải do người quyết định.\n` +
        `  testIgnore: [${excludedFiles.map((f) => `'${f}'`).join(', ')}],`
      : '';
  return rawConfig(label, exclude);
}

function rawConfig(label, exclude) {
  return `const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');
const { BASE_URL } = require('../shared/vnpost-config');

const DOC_ROOT = __dirname;

/** ${label} — mã phân hệ lấy theo \`resource/hdsd/\`. */
module.exports = defineConfig({
  testDir: path.join(DOC_ROOT, 'tests'),${exclude}
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  outputDir: path.join(DOC_ROOT, 'test-output/playwright-results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(DOC_ROOT, 'test-output/playwright-report'), open: 'never' }],
    ['json', { outputFile: path.join(DOC_ROOT, 'test-output/playwright-results/results.json') }],
  ],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
    video: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
`;
}

/** Chép mọi thứ KHÔNG phải spec nằm cạnh spec (helpers/, fixture, dữ liệu mẫu…). */
function copySiblings(fromDir, toDir) {
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    if (/\.(spec|playwright)\.js$/.test(entry.name)) continue;
    const src = path.join(fromDir, entry.name);
    const dst = path.join(toDir, entry.name);
    if (fs.existsSync(dst)) continue;
    fs.cpSync(src, dst, { recursive: true });
  }
}

function csvEscape(value) {
  const text = String(value == null ? '' : value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function taskListOf(moduleCode) {
  const dir = fs
    .readdirSync(HDSD_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith(`hdsd${moduleCode}_`))
    .map((e) => e.name)[0];
  if (!dir) return [];
  try {
    return fs.readdirSync(path.join(HDSD_ROOT, dir, 'tasks')).filter((f) => f.endsWith('.md')).sort();
  } catch {
    return [];
  }
}

function readmeFor(moduleCode, label, rows) {
  const tasks = taskListOf(moduleCode);
  const byTask = new Map();
  for (const row of rows) {
    if (!byTask.has(row.task)) byTask.set(row.task, []);
    byTask.get(row.task).push(row);
  }

  const lines = [
    `# ${moduleCode} — ${label}`,
    '',
    `Mã phân hệ lấy theo \`resource/hdsd/hdsd${moduleCode}_*\`.`,
    '',
    `Mã test case: \`<mã phân hệ>_<mã task>_<STT>\` — ví dụ \`${rows[0] ? rows[0].newId : ''}\`.`,
    '',
    '## Task và case',
    '',
    '| Mã task | Task (theo HDSD) | Số case |',
    '|---|---|--:|',
  ];

  for (const [task, list] of [...byTask.entries()].sort()) {
    const file = tasks.find((t) => t.startsWith(`${task}_`)) || '';
    lines.push(`| ${task} | ${file.replace(/\.md$/, '').replace(/^\d+_/, '')} | ${list.length} |`);
  }

  lines.push('', '## Nguồn', '', ...[...new Set(rows.map((r) => `- chuyển từ \`${r.fromModule}\``))], '');
  return lines.join('\n');
}

// ── Chạy ─────────────────────────────────────────────────────────────────────

function main() {
  const plan = new Map(); // dir đích → { code, label, files: Map<tênFile, {header,footer,blocks[]}>, rows[] }
  const counters = new Map(); // "<mod>/<task>" → STT
  const unmapped = [];
  let totalBefore = 0;

  for (const mod of sourceModules()) {
    const csvByIds = new Map(readCsvCases(mod).map((c) => [c.id, c]));
    const specFiles = [];

    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'test-output' || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(spec|playwright)\.js$/.test(entry.name)) specFiles.push(full);
      }
    };
    walk(mod.dir);

    // Chỉ lấy spec nằm trong testDir thực sự được chạy (tests/ hoặc test/).
    const active = specFiles.filter((f) => /\/tests?\//.test(f));

    for (const file of active) {
      const source = fs.readFileSync(file, 'utf8');
      const found = findTestBlocks(source);
      if (found.length === 0) continue;

      totalBefore += found.length;
      const fileName = path.basename(file);

      for (const { title } of found) {
        const oldId = caseIdOf(title);
        const key =
          (oldId && CASE_TO_TASK[oldId]) ||
          (oldId && oldId.startsWith('CTKM-POS') ? PROMOTION_POS_TASK : null) ||
          TITLE_TO_TASK[title.trim()] ||
          null;

        if (!key) {
          unmapped.push({ module: mod.id, file: fileName, title });
          continue;
        }

        const [code, task] = key.split('/');
        const target = MODULES[code];
        if (!target) throw new Error(`Chưa khai phân hệ ${code} trong hdsd-mapping.js`);

        const counterKey = `${code}/${task}`;
        const seq = (counters.get(counterKey) || 0) + 1;
        counters.set(counterKey, seq);
        const newId = `${code}_${task}_${String(seq).padStart(3, '0')}`;

        if (!plan.has(target.dir)) plan.set(target.dir, { code, label: target.label, files: new Map(), rows: [] });
        const entry = plan.get(target.dir);

        // 🔴 Lưu ĐƯỜNG DẪN file gốc + bảng title→mã mới. File đích sinh bằng cách XOÁ các test
        //    không thuộc đích khỏi bản gốc, chứ không ghép mảnh — xem `spec-slicer.js`.
        if (!entry.files.has(fileName)) entry.files.set(fileName, { source: file, titles: new Map() });
        entry.files.get(fileName).titles.set(title, `${newId} - ${nameOf(title)}`);

        const csv = csvByIds.get(oldId) || {};
        entry.rows.push({
          newId,
          oldId: oldId || title.slice(0, 40),
          task,
          name: nameOf(title),
          precondition: csv.precondition || '',
          steps: csv.steps || '',
          expected: csv.expected || '',
          fromModule: mod.id,
          hasScript: true,
        });
      }
    }

    // Case chỉ có trong CSV (chưa ai viết script) — vẫn phải mang sang, đổi mã.
    for (const [oldId, csv] of csvByIds) {
      const key = CASE_TO_TASK[oldId];
      if (!key) {
        unmapped.push({ module: mod.id, file: 'test-cases.csv', title: `${oldId} ${csv.name}` });
        continue;
      }
      const [code, task] = key.split('/');
      const already = [...plan.values()].some((e) => e.rows.some((r) => r.oldId === oldId));
      if (already) continue;

      const target = MODULES[code];
      const counterKey = `${code}/${task}`;
      const seq = (counters.get(counterKey) || 0) + 1;
      counters.set(counterKey, seq);

      if (!plan.has(target.dir)) plan.set(target.dir, { code, label: target.label, files: new Map(), rows: [] });
      plan.get(target.dir).rows.push({
        newId: `${code}_${task}_${String(seq).padStart(3, '0')}`,
        oldId,
        task,
        name: csv.name,
        precondition: csv.precondition || '',
        steps: csv.steps || '',
        expected: csv.expected || '',
        fromModule: mod.id,
        hasScript: false,
      });
    }
  }

  // ── Báo cáo kế hoạch ──
  console.log(`\nNguồn: ${sourceModules().length} module cũ, ${totalBefore} test trong spec.`);
  console.log(`Đích : ${plan.size} thư mục theo mã HDSD.\n`);

  let totalAfter = 0;
  for (const [dir, entry] of [...plan.entries()].sort()) {
    const withScript = entry.rows.filter((r) => r.hasScript).length;
    totalAfter += withScript;
    console.log(
      `  ${dir.padEnd(38)} ${String(entry.rows.length).padStart(3)} case ` +
        `(${withScript} có script) — ${entry.files.size} file spec`,
    );
  }

  console.log(`\nTổng test có script sau khi chuyển: ${totalAfter} / ${totalBefore}`);
  if (unmapped.length > 0) {
    console.log(`\n🔴 ${unmapped.length} mục CHƯA CÓ trong bản đồ — sẽ bị bỏ lại:`);
    for (const u of unmapped.slice(0, 20)) console.log(`   [${u.module}] ${u.file}: ${u.title.slice(0, 70)}`);
  }

  if (DRY) {
    console.log('\n(--dry: không ghi gì)\n');
    return;
  }

  // ── Ghi file ──
  for (const [dir, entry] of plan) {
    const full = path.join(TEST_ROOT, dir);
    fs.mkdirSync(path.join(full, 'tests'), { recursive: true });

    for (const [fileName, spec] of entry.files) {
      // 🔴 Spec không đứng một mình: `09` có `tests/helpers/pos-helpers.js`, `10` có `tests/v2.js`.
      //    Chỉ chép file spec là Playwright báo `Cannot find module` rồi ra `0 tests in 0 files` —
      //    và output mặc định KHÔNG hiện lỗi đó, chỉ thấy module rỗng.
      copySiblings(path.dirname(spec.source), path.join(full, 'tests'));

      const source = fs.readFileSync(spec.source, 'utf8');
      const sliced = keepOnly(source, (title) => spec.titles.get(title) || null);
      if (!sliced) throw new Error(`Cắt ${fileName} cho ${dir} ra rỗng — dừng để không ghi file hỏng.`);
      fs.writeFileSync(path.join(full, 'tests', fileName), sliced);
    }

    const excluded = [...entry.files.keys()].filter((f) => EXCLUDE_FROM_RUN.has(f));
    fs.writeFileSync(
      path.join(full, 'playwright.config.js'),
      configTemplate(`${entry.code} — ${entry.label}`, excluded),
    );

    const header = 'ID,Ten test case,Tien dieu kien,Buoc kiem thu,Ket qua ky vong';
    const rows = entry.rows
      .sort((a, b) => a.newId.localeCompare(b.newId))
      .map((r) => [r.newId, r.name, r.precondition, r.steps, r.expected].map(csvEscape).join(','));
    fs.writeFileSync(path.join(full, 'test-cases.csv'), `${header}\n${rows.join('\n')}\n`);

    fs.writeFileSync(path.join(full, 'README.md'), readmeFor(entry.code, entry.label, entry.rows));
  }

  // Bản đồ mã cũ → mã mới, để tra ngược.
  const mapRows = [];
  for (const [dir, entry] of [...plan.entries()].sort()) {
    for (const r of entry.rows.sort((a, b) => a.newId.localeCompare(b.newId))) {
      mapRows.push(`| ${r.oldId} | ${r.newId} | ${dir} | ${r.fromModule} |`);
    }
  }
  fs.writeFileSync(
    path.join(TEST_ROOT, '_MA_CU_SANG_MA_MOI.md'),
    ['# Tra cứu: mã case cũ → mã mới', '', '| Mã cũ | Mã mới | Thư mục | Module cũ |', '|---|---|---|---|', ...mapRows, ''].join('\n'),
  );

  console.log('\nĐã ghi xong. Thư mục cũ CHƯA xoá — kiểm tra rồi xoá tay.\n');
}

main();
