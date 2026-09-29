'use strict';

/**
 * `03a_PQ_001` — vai **Giao dịch viên** 🚫 không được quản lý ca của điểm bán.
 *
 * 🔴 Case này bắt buộc chạy bằng chính vai `gdv`. Chạy bằng vai khác là pass giả.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');
const { chuan, ROUTE } = require('./shift-page');

const GOC = path.join(__dirname, '..');
const VAI = 'gdv';

test('03a_PQ_001 — Vai giao dịch viên không vào được màn quản lý ca của điểm bán', async ({
	page,
}) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '03a_PQ_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	const maTrangThai = [];
	page.on('response', (r) => {
		if (r.url().includes('/timekeeping/shift-all')) maTrangThai.push(r.status());
	});

	await moTrang(page, ROUTE.ca, VAI);
	await page.waitForTimeout(8_000);

	const bịChan =
		!page.url().includes(ROUTE.ca) ||
		maTrangThai.every((m) => m !== 200) ||
		(await page.locator('.ant-table-tbody tr.ant-table-row').count()) === 0;

	expect(
		bịChan,
		`Vai ${VAI} vào được màn quản lý ca và thấy danh sách ca của điểm bán ` +
			`(mã trạng thái API: ${maTrangThai.join(', ') || 'không gọi'}). ` +
			'Đây là lỗ hổng phân quyền, 🚫 không phải lỗi script.',
	).toBe(true);

	// Ghi lại hình thức chặn để báo cáo nói được CÁCH hệ thống chặn, không chỉ "bị chặn".
	test.info().annotations.push({
		type: 'hình thức chặn',
		description: `URL sau khi mở: ${page.url()} · API shift-all: ${maTrangThai.join(', ') || 'không gọi'} · nút trên màn: ${chuan(
			(await page.getByRole('button').allInnerTexts()).join(' / '),
		)}`,
	});
});
