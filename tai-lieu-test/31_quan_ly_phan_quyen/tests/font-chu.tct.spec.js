'use strict';

/**
 * 31_030_009 — Font chữ và khoảng cách dòng đúng thiết kế (26/09/2026). Vai `tct`. Chỉ đọc.
 *
 * Chuẩn đối chiếu: app KHÔNG ghi đè font (`layout/LayoutProvider.jsx` token chỉ có màu; không có fontFamily/fontSize ở CSS toàn cục)
 * ⇒ thiết kế đang áp là token mặc định antd v6: chữ nội dung 14px, line-height 22px (1.5714), một font-family thống nhất (token antd — khác font `body` của Tailwind, toàn app như vậy).
 * Đo bằng `getComputedStyle` trên ô bảng, nhãn form, nút ở màn `/role-management/assign`; so thêm với màn chuẩn `/role-management/function`
 * (cùng phân hệ) để bắt màn lệch kiểu riêng. Có Figma riêng cho màn này thì thay chuẩn ở `CHUAN`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const CHUAN = { fontSize: '14px', lineHeight: '22px' };

async function doFont(page, route) {
	await moTrang(page, `${process.env.VNPOST_BASE_URL}${route}`, 'tct');
	await expect(page.locator('.ant-pro-page-container, main').first()).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(3_000);
	return page.evaluate(() => {
		const body = getComputedStyle(document.body).fontFamily;
		const sel = { 'ô bảng': '.ant-table-tbody td', 'tiêu đề cột': '.ant-table-thead th', 'nhãn form': '.ant-form-item-label label', 'nút': '.ant-btn span', 'ô nhập': '.ant-input, .ant-select-selection-item, .ant-select-selection-placeholder' };
		const kq = {};
		for (const [ten, s] of Object.entries(sel)) {
			const els = [...document.querySelectorAll(`main ${s}, .ant-pro-page-container ${s}`)].filter((e) => e.offsetParent && (e.textContent || e.value || e.placeholder || '').trim()).slice(0, 30);
			if (!els.length) continue;
			const dem = {};
			for (const e of els) { const c = getComputedStyle(e); const k = `${c.fontSize}/${c.lineHeight}/${c.fontFamily === body ? 'body' : c.fontFamily}`; dem[k] = (dem[k] || 0) + 1; }
			kq[ten] = dem;
		}
		return { body, kq };
	});
}

test('31_030_009 — Font chữ và khoảng cách dòng đúng thiết kế', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '31_030_009'));
	test.skip(Boolean(ly), ly ?? '');
	const a = await doFont(page, '/role-management/assign');
	const b = await doFont(page, '/role-management/function');
	test.info().annotations.push({ type: 'đo', description: `assign: ${JSON.stringify(a)} · function (đối chiếu): ${JSON.stringify(b.kq)}` });
	expect(Object.keys(a.kq).length, 'Màn không có phần tử chữ nào để đo').toBeGreaterThan(0);
	for (const [ten, dem] of Object.entries(a.kq)) {
		for (const k of Object.keys(dem)) {
			const [fs, lh, ff] = k.split('/');
			if (ten !== 'tiêu đề cột' && ten !== 'nút') {
				expect(fs, `${ten}: cỡ chữ ${fs} ≠ ${CHUAN.fontSize}`).toBe(CHUAN.fontSize);
				expect(lh, `${ten}: line-height ${lh} ≠ ${CHUAN.lineHeight}`).toBe(CHUAN.lineHeight);
			}
		}
	}
	// font-family: body là font Tailwind preflight, antd dùng token riêng ⇒ chuẩn = MỘT font thống nhất cho mọi phần tử antd trên màn.
	const ffs = new Set(Object.values(a.kq).flatMap((dem) => Object.keys(dem).map((k) => k.split('/').slice(2).join('/'))));
	expect([...ffs].length, `Màn dùng nhiều font khác nhau: ${[...ffs].join(' || ')}`).toBe(1);
	for (const ten of Object.keys(a.kq)) if (b.kq[ten]) expect(Object.keys(a.kq[ten]).sort(), `${ten}: kiểu chữ lệch màn đối chiếu /role-management/function`).toEqual(Object.keys(b.kq[ten]).sort());
});
