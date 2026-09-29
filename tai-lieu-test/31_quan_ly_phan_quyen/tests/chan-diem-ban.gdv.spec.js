'use strict';

/** 31_090_001 · Vai `gdv` (điểm bán) mở màn Quản lý vai trò — phải bị chặn hoặc không có mục menu. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dongVaiTro, khung, moVaiTro } = require('./role-page');

const GOC = path.join(__dirname, '..');

test('31_090_001 — Vai điểm bán không vào được màn quản lý vai trò', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '31_090_001'));
	test.skip(Boolean(ly), ly ?? '');
	await chanGhi(page);
	const api = [];
	page.on('response', async (r) => { if (r.url().includes('/auth/chain-role/get-all')) api.push(`${r.status()}/${(await r.json().catch(() => ({})))?.status?.code}`); });
	await moVaiTro(page, 'gdv');
	const menu = await page.locator('.ant-menu, .ant-pro-sider').getByText(/Quản lý vai trò|Phân quyền/).count();
	const tieuDe = chuan(await page.locator('.ant-page-header-heading-title').first().innerText().catch(() => ''));
	const soDong = await dongVaiTro(page).count();
	const nutThem = await khung(page).getByRole('button', { name: 'Thêm vai trò' }).count();
	const chu = chuan(await page.locator('body').innerText()).slice(0, 200);
	test.info().annotations.push({ type: 'hành vi thật', description: `url ${page.url()} · menu ${menu} · tiêu đề "${tieuDe}" · ${soDong} vai trò · nút Thêm ${nutThem} · API ${api.join(' ')} · chữ: ${chu}` });
	expect(menu, 'Menu vai điểm bán vẫn có mục Quản lý vai trò / Phân quyền').toBe(0);
	expect(soDong, 'Vai điểm bán vào thẳng URL vẫn XEM được danh sách vai trò').toBe(0);
	expect(nutThem, 'Vai điểm bán vẫn thấy nút "Thêm vai trò"').toBe(0);
});
