'use strict';

/**
 * Các case **CHƯA CHẠY ĐƯỢC** gốc vai `shop`. Case đọc được đã chuyển sang vai `tct`
 * (vai shop 401 mọi lời gọi — xem `27_PQ_001`): 070_006, 070_007, 071_004, 071_005.
 * 🔴 Mọi test ở đây skip KÈM LÝ DO THẬT, 🚫 không pass rỗng.
 */

const { test } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');

