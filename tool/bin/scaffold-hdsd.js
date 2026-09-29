#!/usr/bin/env node
'use strict';

/**
 * Dựng khung thư mục test cho ĐỦ 45 phân hệ HDSD.
 *
 *   node tool/bin/scaffold-hdsd.js --dry
 *   node tool/bin/scaffold-hdsd.js
 *
 * Phân hệ đã có thư mục thì KHÔNG đụng tới. Phân hệ chưa có thì tạo khung rỗng:
 * `playwright.config.js`, `tests/` (rỗng), `test-cases.csv` (chỉ có header), `README.md` liệt kê
 * đủ task lấy từ HDSD.
 *
 * 🔴 CSV để RỖNG, không sinh sẵn dòng cho từng task: một dòng CSV nghĩa là "đã có test case",
 * sinh bừa thì công cụ đếm là case thật, báo cáo độ phủ thành số ảo. Task nằm ở README để biết
 * còn phải viết gì, không nằm ở CSV.
 */

const fs = require('node:fs');
const path = require('node:path');

const { PROJECT_ROOT } = require('../core/modules');

const TEST_ROOT = path.join(PROJECT_ROOT, 'tai-lieu-test');
const HDSD_ROOT = path.join(PROJECT_ROOT, '..', 'resource', 'hdsd');
const DRY = process.argv.includes('--dry');

const CSV_HEADER = 'ID,Ten test case,Tien dieu kien,Buoc kiem thu,Ket qua ky vong';

/** Đọc toàn bộ phân hệ HDSD: mã, slug, tên, danh sách task. */
function readHdsd() {
  return fs
    .readdirSync(HDSD_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('hdsd'))
    .map((e) => {
      const match = e.name.match(/^hdsd(\d+(?:_\d+)?[ab]?)_(.+)$/);
      if (!match) return null;

      const [, code, slug] = match;
      let label = slug.replace(/_/g, ' ');
      try {
        const meta = fs.readFileSync(path.join(HDSD_ROOT, e.name, 'meta.md'), 'utf8');
        label = (meta.match(/ten_phan_he:\s*(.+)/) || [])[1] || label;
      } catch {
        // Không có meta.md thì dùng slug — không đáng để dừng.
      }

      let tasks = [];
      try {
        tasks = fs
          .readdirSync(path.join(HDSD_ROOT, e.name, 'tasks'))
          .filter((f) => f.endsWith('.md'))
          .sort()
          .map((f) => {
            const base = f.replace(/\.md$/, '');
            const taskCode = base.slice(0, base.indexOf('_'));
            let title = base.slice(base.indexOf('_') + 1).replace(/_/g, ' ');
            try {
              const body = fs.readFileSync(path.join(HDSD_ROOT, e.name, 'tasks', f), 'utf8');
              title = (body.match(/tieu_de:\s*(.+)/) || [])[1] || title;
            } catch {
              // giữ tên suy từ file
            }
            return { code: taskCode, title: title.trim(), file: f };
          });
      } catch {
        tasks = [];
      }

      return { code, slug, label: label.trim(), dir: `${code}_${slug}`, hdsdDir: e.name, tasks };
    })
    .filter(Boolean)
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

function configFor(phanHe) {
  return `const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');
const { BASE_URL } = require('../shared/vnpost-config');

const DOC_ROOT = __dirname;

/** ${phanHe.code} — ${phanHe.label}. Mã phân hệ lấy theo \`resource/hdsd/${phanHe.hdsdDir}/\`. */
module.exports = defineConfig({
  testDir: path.join(DOC_ROOT, 'tests'),
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

function readmeFor(phanHe) {
  const rows = phanHe.tasks.map(
    (t) => `| \`${t.code}\` | ${t.title} | \`${phanHe.code}_${t.code}_001\` … | — |`,
  );

  return `# ${phanHe.code} — ${phanHe.label}

Nguồn: \`resource/hdsd/${phanHe.hdsdDir}/\` — ${phanHe.tasks.length} task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
${rows.join('\n')}

## Cách điền

1. Đọc \`resource/hdsd/${phanHe.hdsdDir}/tasks/<mã task>_*.md\` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào \`test-cases.csv\`, mã đặt theo \`${phanHe.code}_<mã task>_<STT>\`.
3. Viết spec trong \`tests/\`, title là \`'<mã> - <tên case>'\`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
`;
}

function main() {
  const hdsd = readHdsd();
  const created = [];
  const existing = [];

  for (const phanHe of hdsd) {
    const full = path.join(TEST_ROOT, phanHe.dir);
    if (fs.existsSync(full)) {
      existing.push(phanHe);
      continue;
    }
    created.push(phanHe);
    if (DRY) continue;

    fs.mkdirSync(path.join(full, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(full, 'playwright.config.js'), configFor(phanHe));
    fs.writeFileSync(path.join(full, 'test-cases.csv'), `${CSV_HEADER}\n`);
    fs.writeFileSync(path.join(full, 'README.md'), readmeFor(phanHe));
    // `tests/` rỗng không được git theo dõi — giữ chỗ để thư mục không biến mất khi commit.
    fs.writeFileSync(path.join(full, 'tests', '.gitkeep'), '');
  }

  console.log(`\nHDSD có ${hdsd.length} phân hệ.`);
  console.log(`  đã có thư mục : ${existing.length}`);
  console.log(`  ${DRY ? 'sẽ tạo' : 'vừa tạo'}       : ${created.length}\n`);

  for (const phanHe of created) {
    console.log(`  ${phanHe.dir.padEnd(40)} ${String(phanHe.tasks.length).padStart(2)} task  ${phanHe.label}`);
  }
  if (DRY) console.log('\n(--dry: không ghi gì)\n');
}

main();
