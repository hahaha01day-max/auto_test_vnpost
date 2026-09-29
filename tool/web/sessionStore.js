'use strict';

/**
 * Lưu phiên đăng nhập vào SQLite thay cho `MemoryStore` mặc định của express-session.
 *
 * 🔴 `MemoryStore` không dùng được cho bản deploy, vì ba lý do — và lý do thứ ba là cái đau nhất:
 *   1. rò rỉ bộ nhớ (chính express-session cảnh báo);
 *   2. không chia sẻ được nếu sau này chạy nhiều tiến trình;
 *   3. **mất sạch mỗi lần restart** — cả nhóm bị đá ra ngoài mỗi lần deploy hay mỗi lần server
 *      tự khởi động lại, và vì công cụ này còn tự dọn run mồ côi lúc khởi động, người dùng sẽ
 *      thấy "bị đăng xuất ngẫu nhiên" mà không hiểu vì sao.
 *
 * Bảng `sessions` nằm chung `tool.sqlite`, nên không thêm phụ thuộc nào.
 */

const { Store } = require('express-session');

const { getDb } = require('../core/db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  sid        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`;

/** Phiên hết hạn không tự biến mất — dọn định kỳ, nếu không bảng phình mãi. */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

class SqliteSessionStore extends Store {
  constructor(options = {}) {
    super(options);
    this.db = getDb();
    this.db.exec(SCHEMA);
    this.defaultTtlMs = options.ttlMs || 12 * 60 * 60 * 1000;

    this.sweep();
    const timer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    timer.unref();
  }

  expiryOf(session) {
    const cookieExpires = session && session.cookie && session.cookie.expires;
    return cookieExpires ? new Date(cookieExpires).getTime() : Date.now() + this.defaultTtlMs;
  }

  get(sid, callback) {
    try {
      const row = this.db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?').get(sid);
      if (!row) return callback(null, null);
      if (row.expires_at < Date.now()) {
        this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
        return callback(null, null);
      }
      return callback(null, JSON.parse(row.data));
    } catch (err) {
      return callback(err);
    }
  }

  set(sid, session, callback) {
    try {
      this.db
        .prepare(
          `INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)
           ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`,
        )
        .run(sid, JSON.stringify(session), this.expiryOf(session));
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  touch(sid, session, callback) {
    try {
      this.db.prepare('UPDATE sessions SET expires_at = ? WHERE sid = ?').run(this.expiryOf(session), sid);
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  sweep() {
    try {
      this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    } catch {
      // Dọn phiên hỏng không đáng để làm sập server.
    }
  }
}

module.exports = { SqliteSessionStore };
