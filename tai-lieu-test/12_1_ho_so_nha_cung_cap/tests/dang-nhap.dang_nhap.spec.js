'use strict';

/**
 * 12_1_040_001 — Đăng nhập bằng tài khoản nghiệp vụ, về màn Ca làm việc.
 *
 * Case gốc `NCC_1` (nhóm trống trong sheet) là ĐĂNG NHẬP thuần, không riêng gì NCC. Dùng tài khoản GDV
 * điểm bán seed của làn (`VNPOST_ACCOUNT_SEED_GDV` — một phạm vi, vào thẳng), 🚫 số/mật khẩu mẫu của sheet.
 * Context TRẮNG (không storageState) — đi đúng đường người dùng: `/account` → điền → Đăng nhập.
 * Luồng điền form dùng chung `dangNhapVai` (shared/auth/login.js).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { dangNhapVai } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');

test('12_1_040_001 — Đăng nhập vào hệ thống bằng tài khoản nghiệp vụ NCC', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '12_1_040_001'));
	test.skip(Boolean(ly), ly ?? '');
	const thieu = missingRoleReason('seed_gdv');
	test.skip(Boolean(thieu), thieu ?? '');
	await page.goto(`${process.env.VNPOST_BASE_URL}/account`);
	await dangNhapVai(page, 'seed_gdv');
	await expect(page, 'Đăng nhập xong không về màn Ca làm việc').toHaveURL(/\/lich-ca-nhan\/ca-lam-viec/, { timeout: 30_000 });
	await expect(page.getByText('Thông tin ca làm việc hôm nay')).toBeVisible({ timeout: 20_000 });
});
