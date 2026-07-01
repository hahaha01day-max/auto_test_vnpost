/**
 * auto_test_vnpost/tai-lieu-test/shared/vnpost-config.js
 * Single source of truth for test configurations like BASE_URL and environment detection.
 */

// const BASE_URL = 'https://vnpost.sfin.vn';
const BASE_URL = 'https://dev-vnpost.sfin.vn/';
const isLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');

module.exports = {
  BASE_URL,
  isLocal,
};
