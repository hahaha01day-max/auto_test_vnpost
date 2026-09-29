'use strict';

/**
 * 07_3 · 010_003 — Giới hạn thời gian trả hàng không nhận số âm, vai `tct`. KHÔNG GHI.
 *
 * Đo 24/09/2026: `/settings?setting=order` hiện inline "Cấu hình đơn đổi trả" (công tắc + ô "Giới hạn
 * thời gian trả hàng" InputNumber `aria-valuemin=0`, đơn vị Ngày, nút "Lưu") và "Cấu hình ngưỡng hoàn
 * trả bất thường". 🔴 Cấu hình CHUỖI dùng chung ⇒ request ghi bị chặn ở mạng; "lưu được" = FE đã gửi.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');

test('07_3_010_003 — Giới hạn thời gian trả hàng chỉ nhận số nguyên không âm', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '07_3_010_003'));
	test.skip(Boolean(ly), ly ?? '');
	const daGui = [];
	await page.route('**/__api/**', async (route) => {
		const r = route.request();
		if (r.method() === 'GET' || /refresh-token|login/.test(r.url())) return route.continue();
		daGui.push(r.postData() || '');
		return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=order`, 'tct');
	const khung = page.locator('.ant-pro-page-container, main').first();
	const khoi = khung.locator('.ant-form, .ant-card, div').filter({ hasText: /^Cấu hình đơn đổi trả/ }).last();
	const o = khung.locator('input[aria-valuemin="0"]').first();
	await expect(o).toBeVisible({ timeout: 30_000 });
	const cu = await o.inputValue();
	await o.fill('');
	await o.pressSequentially('-5');
	await o.blur();
	const sau = await o.inputValue();
	// Nút Lưu của đúng khối đổi trả = nút Lưu HIỆN đầu tiên (có nút Lưu ẩn trước nó).
	const nut = khung.getByRole('button', { name: /Lưu/ }).filter({ visible: true }).first();
	await page.waitForTimeout(1_000);
	// Nút Lưu tự KHOÁ khi ô chưa đổi / không hợp lệ — khoá cũng là một cách chặn.
	const khoa = await nut.isDisabled();
	if (!khoa) await nut.click({ timeout: 5_000 }).catch(() => {});
	await page.waitForTimeout(2_000);
	const loi = (await khung.locator('.ant-form-item-explain-error').allInnerTexts()).join(' | ');
	test.info().annotations.push({ type: 'đo', description: JSON.stringify({ cu, sau, loi, daGui, nutLuuKhoa: khoa }) });
	expect(sau, 'Ô vẫn giữ số âm -5').not.toMatch(/^-/);
	expect(daGui.join(' '), 'Giá trị âm vẫn được gửi đi lưu').not.toMatch(/-5/);
	void khoi;
});
