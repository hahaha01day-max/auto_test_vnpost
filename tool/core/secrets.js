'use strict';

/**
 * Mã hoá mật khẩu tài khoản test khi lưu xuống DB.
 *
 * 🔴 Đây KHÔNG phải hash — công cụ phải đọc lại được mật khẩu gốc để truyền cho Playwright đăng nhập.
 * Nên nó là mã hoá đối xứng, và khoá nằm ở biến môi trường `TOOL_SECRET_KEY` của server,
 * KHÔNG nằm trong DB. Ai lấy được file `tool.sqlite` mà không có khoá thì không đọc được mật khẩu.
 *
 * 🚫 Khác hẳn mật khẩu ĐĂNG NHẬP CÔNG CỤ (bảng `users`) — cái đó hash một chiều bằng scrypt,
 * không bao giờ giải ngược. Đừng lẫn hai thứ.
 */

const crypto = require('node:crypto');

const ALGO = 'aes-256-gcm';

let cachedKey = null;

function getKey() {
  if (cachedKey) return cachedKey;

  const secret = process.env.TOOL_SECRET_KEY;
  if (!secret) {
    throw new Error(
      'Thiếu biến môi trường TOOL_SECRET_KEY. Đây là khoá mã hoá mật khẩu tài khoản test; ' +
        'sinh một chuỗi ngẫu nhiên đủ dài và đặt cố định cho server — đổi khoá là mọi mật khẩu đã lưu đọc không ra.',
    );
  }
  // Salt cố định: khoá đến từ env chứ không từ mật khẩu người dùng, không cần salt ngẫu nhiên.
  cachedKey = crypto.scryptSync(secret, 'vnpost-test-tool', 32);
  return cachedKey;
}

function encrypt(plain) {
  if (!plain) return '';

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}

function decrypt(stored) {
  if (!stored) return '';

  const [ivB64, tagB64, dataB64] = String(stored).split('.');
  if (!ivB64 || !tagB64 || !dataB64) return '';

  try {
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    // Sai khoá hoặc dữ liệu hỏng. Trả rỗng để màn hình hiện "chưa cấu hình" thay vì sập cả trang.
    return '';
  }
}

/** Mật khẩu ĐĂNG NHẬP CÔNG CỤ — hash một chiều. */
function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(plain), salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(plain, stored) {
  const [saltHex, hashHex] = String(stored || '').split(':');
  if (!saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(plain), Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

module.exports = { encrypt, decrypt, hashPassword, verifyPassword };
