'use strict';

/**
 * Đăng nhập vào CÔNG CỤ (không liên quan tài khoản test của VNPost).
 *
 * 🚫 Đừng lẫn hai loại mật khẩu:
 *   - mật khẩu ở đây  → hash một chiều bằng scrypt, không giải ngược được;
 *   - mật khẩu tài khoản test → mã hoá đối xứng (xem `core/secrets.js`) vì phải đọc lại để đăng nhập hộ.
 */

const { getDb, nowIso } = require('../core/db');
const { hashPassword, verifyPassword } = require('../core/secrets');

function listUsers() {
  return getDb().prepare('SELECT id, username, role, created_at FROM users ORDER BY username').all();
}

function findUser(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim());
}

function createUser({ username, password, role = 'tester' }) {
  const name = String(username || '').trim();
  if (!name) throw new Error('Thiếu tên đăng nhập');
  if (!password || String(password).length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự');

  getDb()
    .prepare('INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)')
    .run(name, hashPassword(password), role, nowIso());

  return findUser(name);
}

function authenticate(username, password) {
  const user = findUser(username);
  if (!user) return null;
  return verifyPassword(password, user.password) ? { id: user.id, username: user.username, role: user.role } : null;
}

/**
 * Tạo tài khoản quản trị đầu tiên từ biến môi trường.
 * 🔴 Không có bước này thì server vừa dựng xong là không ai vào được, và cám dỗ tiếp theo luôn là
 * mở một trang "đăng ký tự do" — trên mạng nội bộ vẫn là cửa mở.
 */
function ensureAdmin() {
  if (getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) return null;

  const username = process.env.TOOL_ADMIN_USER;
  const password = process.env.TOOL_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'Chưa có người dùng nào. Đặt TOOL_ADMIN_USER và TOOL_ADMIN_PASSWORD rồi khởi động lại để tạo tài khoản quản trị đầu tiên.',
    );
  }

  return createUser({ username, password, role: 'admin' });
}

/** Chặn mọi route trừ trang đăng nhập và file tĩnh. */
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();

  if (req.get('HX-Request')) {
    res.set('HX-Redirect', '/login');
    return res.status(401).end();
  }
  return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  return res.status(403).send('Chỉ quản trị viên làm được việc này.');
}

module.exports = { listUsers, createUser, authenticate, ensureAdmin, requireLogin, requireAdmin, findUser };
