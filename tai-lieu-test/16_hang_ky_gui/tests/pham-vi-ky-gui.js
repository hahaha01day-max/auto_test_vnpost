'use strict';

/**
 * Helper phạm vi phân hệ 16 (vai hẹp: shop / ward / province) — mở màn, bắt mọi response consignment.
 * Nguồn (vnpost-web): `features/consignmentRecon/pages/ConsignmentReconListPage.jsx` (nút "Sinh kỳ từ hợp đồng"
 * hiện VÔ ĐIỀU KIỆN, route dùng quyền `STOCK_ALERTS` — `features/finance/debtReconciliationRoutes.js:289-296`),
 * `features/consignmentDebt/pages/ConsignmentDebtPage.jsx`.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();

/** Mở `route` bằng `vai`; trả `res` = mảng { url, method, status, body } của mọi response `/consignment`. */
async function moVaBat(page, route, vai) {
	const res = [];
	page.on('response', async (r) => {
		if (!/\/__api\/.*consignment/.test(r.url())) return;
		res.push({ url: new URL(r.url()), method: r.request().method(), status: r.status(), body: await r.json().catch(() => null) });
	});
	await moTrang(page, route, vai);
	await expect(khung(page).locator('.ant-page-header-heading-title')).toBeVisible({ timeout: 30_000 });
	await expect.poll(() => res.length, { timeout: 30_000, message: 'Màn không gọi API consignment nào' }).toBeGreaterThan(0);
	await expect(khung(page).locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 15_000 });
	return res;
}

/** Bị chặn = HTTP ≥ 400 hoặc status.code khác "200". */
const biChan = (r) => r.status >= 400 || String(r.body?.status?.code) !== '200';

module.exports = { chuan, khung, moVaBat, biChan };
