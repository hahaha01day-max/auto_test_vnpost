'use strict';

/**
 * Quét danh mục MODULE test từ `tai-lieu-test/`.
 *
 * 🔴 Lớp `core/` là HÀM THUẦN — không biết gì về Express, không chạm req/res.
 * Nhờ vậy lớp web đổi được (Express hôm nay, Electron/React mai sau) mà không phải viết lại.
 *
 * Logic nhận diện module bê từ `run-test-tool.sh:15-22`: một thư mục là module khi nó có
 * `playwright.config.js` HOẶC có file spec bên trong.
 */

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const TEST_ROOT = path.join(PROJECT_ROOT, 'tai-lieu-test');

/** Thư mục dùng chung, không phải module nghiệp vụ. */
const NOT_A_MODULE = new Set(['shared', 'node_modules']);

const SPEC_PATTERN = /\.(spec|playwright)\.js$/;

function hasSpecFiles(dir, depth = 2) {
  if (depth < 0 || !fs.existsSync(dir)) return false;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'test-output') continue;
    const full = path.join(dir, entry.name);
    if (entry.isFile() && SPEC_PATTERN.test(entry.name)) return true;
    if (entry.isDirectory() && hasSpecFiles(full, depth - 1)) return true;
  }
  return false;
}

/** Tên hiển thị: ưu tiên tiêu đề H1 của README, không có thì làm đẹp tên thư mục. */
function displayName(dir, dirName) {
  const readme = path.join(dir, 'README.md');
  if (fs.existsSync(readme)) {
    const heading = fs
      .readFileSync(readme, 'utf8')
      .split(/\r?\n/)
      .find((line) => line.startsWith('#'));
    if (heading) return heading.replace(/^#+\s*/, '').trim();
  }
  return dirName.replace(/^\d+-/, '').replace(/-/g, ' ');
}

function listConfigs(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => /^playwright.*\.config\.js$/.test(f))
    .sort((a, b) => (a === 'playwright.config.js' ? -1 : b === 'playwright.config.js' ? 1 : a.localeCompare(b)));
}

/**
 * @returns {Array<{id,dirName,name,dir,relDir,configs,defaultConfig,csvPath,hasCsv,hasConfig}>}
 */
function listModules() {
  if (!fs.existsSync(TEST_ROOT)) return [];

  const modules = [];

  for (const entry of fs.readdirSync(TEST_ROOT, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || NOT_A_MODULE.has(entry.name)) continue;

    const dir = path.join(TEST_ROOT, entry.name);
    const configs = listConfigs(dir);
    if (configs.length === 0 && !hasSpecFiles(dir)) continue;

    const csvPath = path.join(dir, 'test-cases.csv');
    const hasCsv = fs.existsSync(csvPath);
    // Có khuôn input hay chưa (M5). Chỉ là sự tồn tại của file — nội dung do `core/inputs.js` đọc.
    const hasInputTemplate = fs.existsSync(path.join(dir, 'test-input.json'));

    modules.push({
      id: entry.name,
      dirName: entry.name,
      name: displayName(dir, entry.name),
      dir,
      relDir: path.relative(PROJECT_ROOT, dir),
      configs,
      // 🔴 Module không có config riêng (vd `quan-ly-nhan-vien`) phải rơi về config động,
      //    nếu không thì `--list` chạy sai testDir và ra 0 case mà không báo lỗi.
      defaultConfig: configs.length > 0 ? path.join(dir, configs[0]) : path.join(PROJECT_ROOT, 'playwright.dynamic.config.js'),
      hasConfig: configs.length > 0,
      csvPath: hasCsv ? csvPath : null,
      hasCsv,
      hasInputTemplate,
    });
  }

  return modules;
}

function getModule(id) {
  return listModules().find((m) => m.id === id) || null;
}

module.exports = { PROJECT_ROOT, TEST_ROOT, listModules, getModule };
