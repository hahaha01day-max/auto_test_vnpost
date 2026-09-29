'use strict';

/**
 * 18_1 — dòng QUÀ TẶNG khuyến mại trên màn bán hàng (vai `gdv`). Mỗi case chạy với CẢ HAI loại quà (`ctkm-qua.js › LOAI`):
 * quà theo ĐƠN (khối "Quà tặng đơn hàng") và quà theo SẢN PHẨM (dòng con dưới SP mua). Loại nào đỏ thì báo riêng.
 *
 * Tiền đề: `ctkm-qua.js` BẬT CTKM loại tương ứng ở beforeAll, DỪNG ở afterAll (phiên phụ `tct`, phạm vi chỉ điểm bán làn).
 * Trace 26/09/2026 (`SelectedProductsTable.jsx`): dòng quà = `tr.promotion-product-row` (record.promotionLoyalty) —
 * quà đơn ở `.order-gift-block`, quà SP là dòng con của SP điều kiện. Cân (`CreateOrderPage.handleScaleData`) bỏ dòng quà.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('./pos-18');
const ctkm = require('./ctkm-qua');

const GOC = path.join(__dirname, '..');
const { chuan, sp } = p;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Dòng quà của CTKM `k` trên đơn đang mở (tick CTKM trong bảng khuyến mại nếu chưa tự áp). */
async function dongQua(page, k) {
	expect(k?.campaignId, 'Không bật được CTKM quà tặng').toBeTruthy();
	const d = page.locator('tr.promotion-product-row').filter({ hasText: k.qua.ten }).first();
	if (await d.isVisible({ timeout: 8_000 }).catch(() => false)) return d;
	await page.getByRole('button', { name: /Chương trình khuyến m[ãạ]i/i }).first().click({ force: true });
	const hop = page.getByRole('dialog').last();
	await expect(hop).toBeVisible({ timeout: 15_000 });
	const tab = hop.getByRole('tab', { name: k.loai === 'SP' ? 'Theo sản phẩm' : 'Theo đơn hàng' });
	if (await tab.isVisible().catch(() => false)) await tab.click();
	const dong = hop.locator('tr').filter({ hasText: k.ten }).first();
	await expect(dong, `Bảng khuyến mại không có CTKM "${k.ten}"`).toBeVisible({ timeout: 15_000 });
	if (!(await dong.locator('.ant-checkbox-checked').count())) await dong.locator('.ant-checkbox').first().click();
	const xn = hop.getByRole('button', { name: /Áp dụng|Xác nhận|Đồng ý/ }).last();
	if (await xn.isVisible().catch(() => false)) await xn.click();
	await expect(d, `Áp CTKM ${k.ten} mà không có dòng quà "${k.qua.ten}"`).toBeVisible({ timeout: 15_000 });
	return d;
}

async function gaCan(page) {
	await page.addInitScript(() => {
		const subs = [];
		window.__canPush = (text) => subs.forEach((cb) => cb({ text }));
		window.serialBridge = {
			connect: async () => ({ state: { status: 'connected' } }),
			disconnect: async () => ({ state: { status: 'idle' } }),
			onData: (cb) => { subs.push(cb); return () => subs.splice(subs.indexOf(cb), 1); },
			onStatus: () => () => {},
		};
	});
}

for (const L of ctkm.LOAI) {
	test.describe(`18_1 — Dòng quà tặng khuyến mại (${L.nhan})`, () => {
		let KM = null;
		test.describe.configure({ timeout: 180_000 });
		test.beforeAll(async ({ browser }) => { test.setTimeout(120_000); KM = await ctkm.bat(browser, L.ma); });
		test.afterAll(async ({ browser }) => { test.setTimeout(120_000); await ctkm.tat(browser, KM?.campaignId); });
		test.afterEach(async ({ page }) => {
			await page.keyboard.press('Escape').catch(() => null);
			await p.donTab(page).catch(() => null);
		});

		test(`18_1_050_011 — 🔴 Dòng quà tặng khuyến mại không sửa được số lượng [${L.ma}]`, async ({ page }) => {
			chanNeuTat('18_1_050_011');
			await p.moBan(page, test);
			await p.them(page, sp().tc);
			const dong = await dongQua(page, KM);
			const text0 = chuan(await dong.innerText());
			const o = dong.locator('input:not([type="checkbox"]):not([type="radio"])').first();
			const coO = await o.count();
			let sau = null, khoa = null;
			if (coO) {
				khoa = (await o.isDisabled()) || (await o.getAttribute('readonly')) !== null;
				if (!khoa) { await o.fill('5').catch(() => null); await o.press('Enter').catch(() => null); await page.waitForTimeout(1_000); }
				sau = await o.inputValue().catch(() => null);
			}
			test.info().annotations.push({ type: 'đo', description: `${L.nhan} · dòng quà "${text0}" · ô SL: ${coO ? `có, khoá=${khoa}, sau khi gõ 5 = ${sau}` : 'KHÔNG có ô (chỉ hiện chữ)'}` });
			if (coO) expect(Number(sau), `🔴 Sửa được số lượng dòng quà tặng (${L.nhan})`).toBe(1);
			expect(chuan(await dong.innerText())).toContain('Quà tặng');
		});

		test(`18_1_060_014 — Dòng quà tặng khuyến mại không nhận số cân [${L.ma}]`, async ({ page }) => {
			chanNeuTat('18_1_060_014');
			await gaCan(page);
			await p.moBan(page, test);
			await p.them(page, sp().tc);
			const dong = await dongQua(page, KM);
			await page.mouse.move(600, 700);
			await page.evaluate(() => document.activeElement?.blur?.());
			await page.keyboard.press('F9'); // kết nối cân
			await page.waitForTimeout(1_000);
			await dong.click({ position: { x: 20, y: 10 } });
			const truoc = chuan(await dong.innerText());
			await page.evaluate(() => window.__canPush('WT: 1.5kg\r\n'));
			await page.waitForTimeout(1_200);
			const sau = chuan(await dong.innerText());
			test.info().annotations.push({ type: 'đo', description: `${L.nhan} · quà trước "${truoc}" · sau cân 1.5kg "${sau}"` });
			expect(sau, `Dòng quà tặng nhận số cân (${L.nhan})`).toBe(truoc);
		});
	});
}
