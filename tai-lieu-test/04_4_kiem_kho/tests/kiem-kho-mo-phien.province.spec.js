'use strict';

/**
 * 04_4 · 010_001 — Mở phiên kiểm kho ở vai cấp trên điểm bán (Tỉnh), chỉ ĐỌC (🚫 không bấm mở phiên).
 *
 * Đo 24/09/2026 (vnpost-web af8cda07): vai `province` vào `/inventory/inventory-check` thấy thẻ
 * "Phiên kiểm kho" / "Phiếu kiểm kho", ô "Chọn Kho / Điểm bán" và nút "Mở phiên kiểm kho" HIỆN SẴN
 * (nút này ở cấp trên mở đợt kiểm theo phạm vi — `StockCheckCampaignDrawer`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');

test('04_4_010_001 — Thêm phiếu kiểm kho - mở form và validate', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '04_4_010_001'));
	test.skip(Boolean(ly), ly ?? '');
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/inventory-check`, 'province');
	const khung = page.locator('.ant-pro-page-container, main').first();
	await expect(khung.getByText('Chọn Kho / Điểm bán').first(), 'Vai cấp trên không có ô Chọn Kho / Điểm bán').toBeVisible({ timeout: 60_000 });
	// Kịch bản: vai cấp trên CHƯA chọn điểm bán thì nút mở phiên KHÔNG hiện.
	await expect(khung.getByRole('button', { name: /Mở phiên kiểm kho/ }), 'Chưa chọn điểm bán mà nút "Mở phiên kiểm kho" đã hiện').toHaveCount(0);
});
