'use strict';

/**
 * SQLite cho web công cụ. Dùng `better-sqlite3` (đồng bộ, không callback).
 *
 * 🔴 Vì sao SQLite chứ không phải file JSON: công cụ này chạy trên server DÙNG CHUNG.
 * Hai người cùng bấm lưu vào một file JSON là ghi đè nhau và mất dữ liệu mà không báo lỗi.
 *
 * Toàn bộ dữ liệu nằm trong `tool-data/` — thư mục này là VOLUME khi deploy; mất nó là mất
 * hồ sơ môi trường và toàn bộ lịch sử chạy.
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const { PROJECT_ROOT } = require('./modules');

const DATA_DIR = process.env.TOOL_DATA_DIR
  ? path.resolve(process.env.TOOL_DATA_DIR)
  : path.join(PROJECT_ROOT, 'tool-data');

const RUNS_DIR = path.join(DATA_DIR, 'runs');
const AUTH_RUNS_DIR = path.join(DATA_DIR, 'auth-runs');
const DB_FILE = path.join(DATA_DIR, 'tool.sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,           -- scrypt: <salt hex>:<hash hex>
  role        TEXT NOT NULL DEFAULT 'tester',  -- tester | admin
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL UNIQUE,
  base_url     TEXT NOT NULL,
  api_base_url TEXT NOT NULL DEFAULT '',
  note         TEXT NOT NULL DEFAULT '',
  is_prod      INTEGER NOT NULL DEFAULT 0,  -- 1 = chặn mặc định case ghi dữ liệu
  created_by   TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- Tài khoản test theo vai. Mật khẩu MÃ HOÁ at-rest, không bao giờ trả ra HTML.
CREATE TABLE IF NOT EXISTS profile_accounts (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_key    TEXT NOT NULL,
  account     TEXT NOT NULL DEFAULT '',
  password    TEXT NOT NULL DEFAULT '',  -- aes-256-gcm
  scope_label TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (profile_id, role_key)
);

CREATE TABLE IF NOT EXISTS runs (
  id            TEXT PRIMARY KEY,
  profile_id    INTEGER REFERENCES profiles(id),
  profile_name  TEXT NOT NULL DEFAULT '',
  module_id     TEXT NOT NULL,
  module_name   TEXT NOT NULL DEFAULT '',
  case_ids      TEXT NOT NULL DEFAULT '[]',
  whole_module  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL,           -- QUEUED RUNNING PASSED FAILED STOPPED ERROR
  created_by    TEXT NOT NULL DEFAULT '',
  queued_at     TEXT NOT NULL,
  started_at    TEXT,
  finished_at   TEXT,
  exit_code     INTEGER,
  pid           INTEGER,                 -- PID tiến trình playwright, để nhận ra run mồ côi
  summary       TEXT NOT NULL DEFAULT '{}',
  env_snapshot  TEXT NOT NULL DEFAULT '{}',  -- 🚫 KHÔNG chứa mật khẩu
  error         TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_runs_queued ON runs(queued_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);

-- M5: dữ liệu đầu vào của case, ĐÈ lên test-input.json của module.
-- (Không dùng dấu backtick trong khối này: cả SCHEMA là một template literal của JS.)
-- 🔴 Khoá có profile_id: input gắn với MÔI TRƯỜNG. Cùng một case chạy UAT và chạy dev cần mã
-- phiếu / mã kỳ khác nhau; để chung một bộ thì đổi môi trường là chạy bằng dữ liệu của môi
-- trường kia — test vẫn xanh, chỉ là xanh nhầm chỗ.
-- 🚫 KHÔNG cất secret ở đây: tài khoản/mật khẩu nằm ở profile_accounts (đã mã hoá).
CREATE TABLE IF NOT EXISTS case_inputs (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id   TEXT NOT NULL,
  case_id     TEXT NOT NULL,
  field       TEXT NOT NULL,
  value       TEXT NOT NULL,
  updated_by  TEXT NOT NULL DEFAULT '',
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (profile_id, module_id, case_id, field)
);

CREATE INDEX IF NOT EXISTS idx_case_inputs_module ON case_inputs(profile_id, module_id);

-- Bộ chạy đã lưu: tập case đặt tên để dùng lại.
CREATE TABLE IF NOT EXISTS suites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  module_id  TEXT NOT NULL,
  case_ids   TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (name, module_id)
);
`;

let instance = null;

function ensureDirs() {
  for (const dir of [DATA_DIR, RUNS_DIR, AUTH_RUNS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDb() {
  if (instance) return instance;

  ensureDirs();
  instance = new Database(DB_FILE);
  // WAL cho phép đọc trong khi đang ghi — nhiều tester mở trang lịch sử cùng lúc.
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  instance.exec(SCHEMA);
  return instance;
}

function nowIso() {
  return new Date().toISOString();
}

function runDir(runId) {
  return path.join(RUNS_DIR, runId);
}

function authDirFor(runId) {
  return path.join(AUTH_RUNS_DIR, runId);
}

module.exports = { DATA_DIR, RUNS_DIR, AUTH_RUNS_DIR, DB_FILE, getDb, nowIso, runDir, authDirFor, ensureDirs };
