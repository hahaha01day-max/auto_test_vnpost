/**
 * auto_test_vnpost/tai-lieu-test/shared/vnpost-config.js
 * Single source of truth for test configurations like BASE_URL and environment detection.
 */

// Chạy mặc định trên đúng frontend local như manual test để dùng cùng code đọc
// cấu hình làm tròn; khi cần test môi trường deploy thì truyền VNPOST_BASE_URL.
const BASE_URL = process.env.VNPOST_BASE_URL || 'http://localhost:3000';
const isLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');

module.exports = {
  BASE_URL,
  isLocal,
};
