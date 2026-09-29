#!/usr/bin/env node
'use strict';

/**
 * Nghiệm thu GĐ 1 — chưa có web, chạy bằng tay để nhìn dữ liệu thật.
 *
 *   node tool/bin/inspect.js                 # liệt kê module
 *   node tool/bin/inspect.js <moduleId>      # liệt kê case của một module
 */

const { listModules, getModule } = require('../core/modules');
const { getCases, CASE_STATUS } = require('../core/cases');

const BADGE = {
  [CASE_STATUS.RUNNABLE]: 'CHẠY ĐƯỢC',
  [CASE_STATUS.NO_SCRIPT]: 'CHƯA CÓ SCRIPT',
  [CASE_STATUS.ORPHAN]: 'MỒ CÔI',
};

function showModules() {
  const modules = listModules();
  console.log(`\n${modules.length} module trong tai-lieu-test/\n`);
  console.log('ID'.padEnd(40), 'CSV'.padEnd(5), 'CONFIG'.padEnd(8), 'TÊN');
  console.log('-'.repeat(110));
  for (const mod of modules) {
    console.log(
      mod.id.padEnd(40),
      (mod.hasCsv ? 'có' : '—').padEnd(5),
      (mod.hasConfig ? 'riêng' : 'động').padEnd(8),
      mod.name,
    );
  }
  console.log('\nXem case:  node tool/bin/inspect.js <ID>\n');
}

function showCases(moduleId) {
  const mod = getModule(moduleId);
  if (!mod) {
    console.error(`Không có module "${moduleId}". Chạy không tham số để xem danh sách.`);
    process.exit(1);
  }

  console.log(`\n${mod.name}`);
  console.log(`config: ${mod.hasConfig ? mod.configs[0] : 'playwright.dynamic.config.js (động)'}`);
  console.log(`csv:    ${mod.hasCsv ? 'test-cases.csv' : '— chưa có'}`);
  console.log('\nĐang hỏi playwright --list ...');

  const { cases, stats, projects, error, noIdTests, fixtureTests } = getCases(mod);

  if (error) console.error(`\n⚠️  --list lỗi: ${error}\n`);

  console.log(`\nVai (project): ${projects.join(', ') || '—'}`);
  console.log(
    `Tổng ${stats.total} case — chạy được ${stats.runnable}, chưa có script ${stats.noScript}, ` +
      `mồ côi ${stats.orphan}, ghi dữ liệu ${stats.writesData}`,
  );
  console.log(`Bước đăng nhập (project setup, không phải case): ${stats.setup}`);
  if (stats.fixture > 0) {
    console.log(`🔴 ${stats.fixture} test DỰNG DỮ LIỆU — runner phải tự nối vào --grep, người dùng không tick:`);
    for (const test of fixtureTests) console.log(`     - [${test.project}] ${test.title}`);
  }
  if (stats.untagged > 0) {
    console.log(`⚠️  ${stats.untagged} test có spec nhưng title KHÔNG mở đầu bằng mã case → không chọn riêng được:`);
    for (const test of noIdTests.slice(0, 5)) console.log(`     - [${test.project}] ${test.title}`);
  }

  console.log('');
  console.log('MÃ'.padEnd(16), 'TRẠNG THÁI'.padEnd(16), 'GHI'.padEnd(5), 'VAI'.padEnd(20), 'TÊN');
  console.log('-'.repeat(130));
  for (const c of cases) {
    console.log(
      c.id.padEnd(16),
      BADGE[c.status].padEnd(16),
      (c.writesData ? '⚠️' : '').padEnd(5),
      (c.projects.join(',') || '—').padEnd(20),
      (c.name || '').slice(0, 60),
    );
  }
  console.log('');
}

const [, , moduleId] = process.argv;
if (moduleId) showCases(moduleId);
else showModules();
