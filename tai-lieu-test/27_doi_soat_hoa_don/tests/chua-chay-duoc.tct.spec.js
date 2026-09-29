'use strict';

/**
 * Các case **CHƯA CHẠY ĐƯỢC** của vai `tct` — skip KÈM LÝ DO THẬT (`_blocked` trong
 * `test-input.json`). 🚫 Không để test rỗng chạy xong rồi XANH: bỏ skip mà chưa viết là đỏ ngay.
 */

const { test } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');

for (const [id, ten] of [
]) {
	test(`${id} — ${ten}`, async () => {
		const raw = require('../test-input.json').cases[id];
		const i = loadCaseInput(GOC, id);
		test.skip(!i.enabled, raw._blocked ?? 'đang tắt');
		throw new Error(`${id} đã bật nhưng chưa có script`);
	});
}
