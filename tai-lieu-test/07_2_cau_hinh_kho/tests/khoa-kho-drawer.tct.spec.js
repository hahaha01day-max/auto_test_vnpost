'use strict';

/**
 * 07_2 · 010_005 / 010_009 / 010_010 — Drawer "Thêm cấu hình khoá kho", thẻ "Danh mục / SKU" (26/09/2026). Vai `tct`. KHÔNG GHI (chặn request ghi).
 * Nguồn `StockFreezeDrawer.jsx`: Radio "Theo danh mục" (Select loại hàng hoá Sản phẩm/Combo + Tree checkable) / "Theo SKU"
 * (`ProductUnitSearchSelector` — kiểu tìm Tên SP / SKU / Barcode, gợi ý là div `cursor-pointer`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

async function moTheSku(page) {
	await page.route('**/__api/**', (r) => (r.request().method() === 'GET' || /refresh-token|login|freeze-check|search/.test(r.request().url()) ? r.continue() : r.fulfill({ status: 403, body: '{"status":{"code":"403","message":"auto test chặn"}}' })));
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=stockFreeze`, 'tct');
	await khung(page).getByRole('button', { name: 'Thêm cấu hình khoá kho' }).click();
	const d = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm cấu hình khoá kho' }).last();
	await expect(d).toBeVisible();
	await d.locator('.ant-tabs-tab').filter({ hasText: 'Danh mục / SKU' }).locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await page.waitForTimeout(800);
	return d;
}

async function timSku(page, d, sku, ten) {
	await d.locator('.ant-radio-wrapper').filter({ hasText: 'Theo SKU' }).click();
	const o = d.getByPlaceholder('Tìm mã SKU hoặc tên sản phẩm');
	const cb = o.locator('xpath=ancestor::*[.//*[contains(@class,"ant-select")]][1]').locator('.ant-select').first();
	if (await cb.count()) {
		await cb.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /^SKU$/ }).last().click();
	}
	await o.fill('');
	await o.pressSequentially(sku, { delay: 30 });
	await page.waitForTimeout(3_000);
	return page.locator('div.cursor-pointer').filter({ hasText: ten }).filter({ visible: true }).count();
}

test.describe('07_2 — Drawer khoá kho: danh mục / SKU (chặn ghi)', () => {
	test('07_2_010_005 — Đổi Loại hàng hoá xoá sạch danh mục đã tích', async ({ page }) => {
		chanNeuTat('07_2_010_005');
		const d = await moTheSku(page);
		await d.locator('.ant-radio-wrapper').filter({ hasText: 'Theo danh mục' }).click();
		const tree = d.locator('.ant-tree');
		await expect(tree.locator('.ant-tree-checkbox').first()).toBeVisible({ timeout: 20_000 });
		for (const i of [0, 1]) await tree.locator('.ant-tree-treenode .ant-tree-checkbox').nth(i).click();
		const truoc = await tree.locator('.ant-tree-checkbox-checked').count();
		const loai = d.locator('.ant-select').filter({ hasText: /^Sản phẩm$/ }).first();
		await loai.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /^Combo$/ }).click();
		await page.waitForTimeout(1_500);
		const sau = await d.locator('.ant-tree-checkbox-checked').count();
		test.info().annotations.push({ type: 'đo', description: `đã tích ${truoc} ⇒ sau đổi sang Combo ${sau}` });
		expect(truoc, 'Tiền đề: không tích được danh mục').toBeGreaterThan(0);
		expect(sau, 'Đổi Loại hàng hoá mà danh mục đã tích vẫn còn').toBe(0);
	});

	test('07_2_010_009 — Tìm SKU sản phẩm tự doanh khi khoá theo SKU', async ({ page }) => {
		chanNeuTat('07_2_010_009');
		const td = seed.doc().duLieu.tuDoanhTinh.sanPham.TD1;
		const d = await moTheSku(page);
		const n = await timSku(page, d, td.sku, td.ten);
		test.info().annotations.push({ type: 'đo', description: `SKU tự doanh ${td.sku} (${td.ten}): ${n} gợi ý` });
		expect(n, '🔴 Không tìm được SP tự doanh (của tỉnh) theo SKU ở màn khoá kho').toBeGreaterThan(0);
	});

	test('07_2_010_010 — Tìm SKU sản phẩm Tổng công ty khi khoá theo SKU', async ({ page }) => {
		chanNeuTat('07_2_010_010');
		const tc = seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan;
		const td = seed.doc().duLieu.tuDoanhTinh.sanPham.TD1;
		const d = await moTheSku(page);
		const n = await timSku(page, d, tc.sku, tc.tenSanPham);
		const nTd = await timSku(page, d, td.sku, td.ten);
		test.info().annotations.push({ type: 'đo', description: `SKU TCT ${tc.sku}: ${n} gợi ý · SKU tự doanh ${td.sku}: ${nTd}` });
		expect(n, 'Không tìm được SP Tổng công ty theo SKU').toBeGreaterThan(0);
		expect(nTd, 'Hai nhóm SP không cùng tìm được (nhóm tự doanh bị bỏ)').toBeGreaterThan(0);
	});
});
