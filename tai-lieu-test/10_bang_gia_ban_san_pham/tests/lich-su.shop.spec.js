'use strict';

/**
 * 10 · 040_003/004 — Thẻ "Lịch sử cập nhật" của chi tiết bảng giá, vai `shop` (CHT điểm bán seed).
 * Bảng giá dùng: `AUTO8_BANGGIA` của sổ seed — đã tạo + phê duyệt (tức có ≥ 2 thao tác). Chỉ đọc.
 * Nguồn (vnpost-web af8cda07): `components/tabs/TabAuditLogView.jsx`,
 * `components/tabs/components/DrawerPriceListAuditLogDetail.jsx`, `pages/PricingDetailPage.jsx`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const pp = require('./price-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const COT = ['STT', 'Hành động', 'Người thao tác', 'Vai trò', 'Đơn vị', 'IP', 'Thời gian', 'Hành động'];

async function moLichSu(page) {
	const ten = seed.doc().duLieu.bangGiaBan.tenBangGia;
	await pp.chanGhi(page);
	await pp.moMan(page, 'shop');
	await pp.taiLaiBoi(page, () => pp.oTim(page).fill(ten));
	const d = pp.dong(page).filter({ hasText: ten }).first();
	await expect(d, `🔴 Vai CHT không thấy bảng giá ${ten} dù nó áp cho chính điểm bán này (đo 24/09: get-all trả 0 bảng giá cho vai điểm bán)`).toBeVisible({ timeout: 20_000 });
	await d.getByRole('button', { name: ten }).first().click();
	const cho = page.waitForResponse((r) => r.url().includes('/chain-price-list/audit-log'), { timeout: 30_000 });
	await page.getByRole('tab', { name: 'Lịch sử cập nhật' }).click();
	const res = await cho;
	expect(res.status()).toBe(200);
	const pane = page.locator('.ant-tabs-tabpane-active');
	await expect(pane.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
	return { pane, body: await res.json() };
}

test('10_040_003 — Thẻ Lịch sử cập nhật ghi đủ dấu vết thao tác', async ({ page }) => {
	chanNeuTat('10_040_003');
	const { pane, body } = await moLichSu(page);
	const th = (await pane.locator('.ant-table-thead th').allInnerTexts()).map(pp.chuan);
	expect(th).toEqual(COT);
	const rows = pane.locator('.ant-table-tbody tr.ant-table-row');
	const n = await rows.count();
	expect(n, 'Bảng giá đã tạo + duyệt mà lịch sử < 2 dòng').toBeGreaterThanOrEqual(2);
	const trong = [];
	for (let i = 0; i < n; i++) {
		const td = (await rows.nth(i).locator('td').allInnerTexts()).map(pp.chuan);
		// Cột 1..6: hành động, người, vai trò, đơn vị, IP, thời gian — phải có giá trị.
		td.slice(1, 7).forEach((v, j) => { if (!v || v === '-') trong.push(`dòng ${i + 1} cột "${COT[j + 1]}"`); });
	}
	test.info().annotations.push({ type: 'đo', description: JSON.stringify((body.data || []).slice(0, 3)).slice(0, 700) });
	expect(trong, `Lịch sử thiếu dấu vết: ${trong.join(', ')}`).toEqual([]);
});

test('10_040_004 — Xem được nội dung đã thay đổi của một lần thao tác', async ({ page }) => {
	chanNeuTat('10_040_004');
	const { pane } = await moLichSu(page);
	await pane.locator('.ant-table-tbody tr.ant-table-row').first().locator('button:has(.anticon-info-circle)').click();
	const dr = page.locator('.ant-drawer-open').last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	const noi = pp.chuan(await dr.innerText());
	test.info().annotations.push({ type: 'đo', description: noi.slice(0, 600) });
	expect(noi.length, 'Drawer chi tiết thao tác rỗng').toBeGreaterThan(40);
});
