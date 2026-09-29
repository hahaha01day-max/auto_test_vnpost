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

// 🔴 LÀN (lane) — cho nhiều phiên viết/chạy auto test CÙNG LÚC mà không giẫm nhau.
//    `VNPOST_LANE=2` ⇒ nạp `.env.lane2` TRƯỚC `.env` (giá trị nạp trước thắng, nên tài khoản của làn
//    đè tài khoản chung), session ở `.auth-lane2/`, sổ seed `00_seed/seed-state.lane2.json`, tiền tố
//    seed `AUTO2_`. Không đặt biến ⇒ hành vi giữ nguyên như cũ. Xem `tai-lieu-test/LANE.md`.
const LANE = (process.env.VNPOST_LANE || '').trim();
if (LANE) loadEnvFile(path.join(PROJECT_ROOT, `.env.lane${LANE}`));
loadEnvFile(path.join(PROJECT_ROOT, '.env'));

const BASE_URL = (process.env.VNPOST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_BASE_URL = (process.env.VNPOST_API_BASE_URL || BASE_URL).replace(/\/$/, '');
// 🔴 Cho phép ghi đè thư mục session. Web công cụ chạy NHIỀU RUN trên một máy; nếu mọi run dùng
// chung `.auth/` thì run sau đăng nhập đè session của run đang chạy — hai môi trường/tài khoản
// khác nhau lẫn vào nhau, test vẫn xanh nhưng xanh nhầm phiên. Chạy tay không đặt biến này thì
// hành vi giữ nguyên như cũ.
const AUTH_DIR = process.env.VNPOST_AUTH_DIR
  ? path.resolve(process.env.VNPOST_AUTH_DIR)
  : path.join(PROJECT_ROOT, LANE ? `.auth-lane${LANE}` : '.auth');
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
  LANE,
  PROJECT_ROOT,
  requireEnv,
};
