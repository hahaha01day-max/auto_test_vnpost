const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(PROJECT_ROOT, '.env'));

const BASE_URL = (process.env.VNPOST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_BASE_URL = (process.env.VNPOST_API_BASE_URL || BASE_URL).replace(/\/$/, '');
const AUTH_DIR = path.join(PROJECT_ROOT, '.auth');
const ADMIN_STORAGE_STATE = path.join(AUTH_DIR, 'admin-tct.json');

function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Thiếu biến môi trường bắt buộc: ${missing.join(', ')}. ` +
        'Hãy sao chép .env.example thành .env và điền thông tin.',
    );
  }
}

module.exports = {
  ADMIN_STORAGE_STATE,
  API_BASE_URL,
  AUTH_DIR,
  BASE_URL,
  PROJECT_ROOT,
  requireEnv,
};
