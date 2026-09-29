'use strict';

/**
 * 18_4_030_009 — lọc "Phân loại sản phẩm" trong khối "Sản phẩm đơn gốc" ở chi tiết đơn (vai `gdv`).
 * Tiền đề: combo seed bước 15 (`duLieu.combo`, loại "Sản phẩm gộp") + SP TC (loại "Sản phẩm") trong CÙNG một đơn.
 * Trace 26/09/2026 (`orderDetail/components/TableOrderProduct.jsx`): Select placeholder "Phân loại sản phẩm", options
 * `getProductTypesByAppId` (Sản phẩm · Dịch vụ (ẩn khi tắt) · Sản phẩm gộp · …), lọc `item.type === selectedType`.
 * 🔴 Ghi thật: 1 đơn bán.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const { datTest, khung, moCt, SHOP, p, chuan, sp } = require('./dh');

const GOC = path.join(__dirname, '..');

test('18_4_030_009 — Lọc phân loại sản phẩm trong khối Sản phẩm đơn gốc', async ({ page }) => {
	const i = loadCaseInput(GOC, '18_4_030_009');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(240_000);
	datTest(test);
	const c = seed.doc().duLieu?.combo;
	test.skip(!c?.ten, 'Chưa có combo — chạy seed 15');
	await p.chanIn(page);
	await p.moBan(page, test);
	await p.them(page, c.ten);
	await p.them(page, sp().tc);
	const r = await p.thanhToanTienMat(page);
	expect(r.orderId, `Bán đơn combo + SP lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
	await page.keyboard.press('Escape').catch(() => null);
	await moCt(page, r.orderId, SHOP());
	// Khối = tổ tiên gần nhất của tiêu đề "Sản phẩm đơn gốc" có chứa cả ô lọc lẫn bảng.
	const khoi = khung(page).getByText('Sản phẩm đơn gốc').first().locator('xpath=ancestor::*[.//table and .//*[contains(@class,"ant-select")]][1]');
	const dong = khoi.locator('tbody tr.ant-table-row');
	const tenDong = async () => (await dong.allInnerTexts()).map(chuan);
	const tatCa = await tenDong();
	// 🔴 Chọn xong mất placeholder "Phân loại sản phẩm" ⇒ không lọc theo chữ; ô lọc là .ant-select ĐẦU TIÊN của khối (sau nó là ô kích thước trang).
	const loc = khoi.locator('.ant-select').first();
	const chonLoai = async (nhan) => {
		await loc.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${nhan}$`) }).first().click();
		await page.waitForTimeout(800);
		return tenDong();
	};
	const gop = await chonLoai('Sản phẩm gộp');
	const le = await chonLoai('Sản phẩm');
	test.info().annotations.push({ type: 'đo', description: `đơn ${r.orderNumber} · tất cả ${JSON.stringify(tatCa)} · "Sản phẩm gộp" ${JSON.stringify(gop)} · "Sản phẩm" ${JSON.stringify(le)}` });
	expect(tatCa.length, 'Khối Sản phẩm đơn gốc không có đủ 2 dòng (combo + SP)').toBeGreaterThanOrEqual(2);
	expect(gop.length, 'Lọc "Sản phẩm gộp" không ra dòng nào').toBeGreaterThan(0);
	for (const t of gop) expect(t, 'Lọc "Sản phẩm gộp" lẫn dòng khác loại').toContain(c.ten);
	expect(le.length, 'Lọc "Sản phẩm" không ra dòng nào').toBeGreaterThan(0);
	for (const t of le) expect(t, 'Lọc "Sản phẩm" vẫn còn dòng combo').not.toContain(c.ten);
});
