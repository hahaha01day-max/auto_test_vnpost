'use strict';

/**
 * 18_5_140_001 — chặn hoàn trả khi ca hiện tại chưa gắn quầy thu ngân (BE `ReturnOrderServiceImpl`,
 * "Ca hien tai chua gan quay thu ngan").
 * Tiền đề (26/09/2026): ca GDV làn 8 gắn quầy Q01 và đang dùng cho 17/18_x ⇒ dựng bằng ca của vai `shop` (CHT):
 * mở ca với ô "Quầy thu ngân" XOÁ TRỐNG (`18_3/tests/ca-cht.js › moCa({ quay: false })`), bán 1 đơn, hoàn trả; CHỐT ca ở
 * afterAll (trả tiền đề "CHT chưa mở ca" cho 18_1_010_003). Kịch bản ghi vai gdv — điều kiện kiểm là ca không quầy, không phải vai.
 * 🔴 Ghi thật: ca CHT + đơn bán (+ đơn hoàn nếu BE không chặn).
 */

const { test, expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const { storageStateFor } = require('../../shared/auth/accounts');
const ca = require('../../18_3_thanh_toan_va_bien_lai/tests/ca-cht');
const { p, chanNeuTat, dongTra, hoanTra, sp, chuan, SHOP, BASE } = require('./doi-tra');

let CA = null;
const moiTrang = async (browser, fn) => {
	const ctx = await browser.newContext({ storageState: storageStateFor('shop') });
	const pg = await ctx.newPage();
	try { return await fn(pg); } finally { await ctx.close(); }
};

test.describe('18_5 — Hoàn trả trong ca không gắn quầy', () => {
	test.describe.configure({ timeout: 300_000, mode: 'serial' });
	test.beforeAll(async ({ browser }) => { test.setTimeout(120_000); CA = await moiTrang(browser, (pg) => ca.moCa(pg, { quay: false })); });
	test.afterAll(async ({ browser }) => { test.setTimeout(120_000); await moiTrang(browser, (pg) => ca.chotCa(pg)); });

	test('18_5_140_001 — Chặn hoàn trả khi ca hiện tại chưa gắn quầy thu ngân', async ({ page }) => {
		chanNeuTat('18_5_140_001');
		test.info().annotations.push({ type: 'mở ca không quầy', description: JSON.stringify(CA) });
		test.skip(CA?.coSan, 'CHT đã có ca mở sẵn (có quầy?) — chốt ca CHT rồi chạy lại');
		test.skip(CA?.xoaDuoc === false, 'Ô "Quầy thu ngân" khi mở ca KHÔNG xoá được (không allowClear) ⇒ không mở được ca thiếu quầy qua giao diện');
		test.skip(!CA?.daMo, `Mở ca không quầy bị chặn: ${CA?.ma} "${CA?.thongDiep}" ⇒ tình huống "ca chưa gắn quầy" không phát sinh qua giao diện`);
		await p.chanIn(page);
		await moTrang(page, `${BASE()}/order/create-order`, 'shop');
		await expect(p.oTim(page), 'CHT đã mở ca mà màn bán hàng vẫn chặn').toBeVisible({ timeout: 30_000 });
		await p.donTab(page);
		await p.them(page, sp().tc);
		const r = await p.thanhToanTienMat(page);
		test.skip(!r.orderId, `Ca không quầy: bán hàng cũng bị chặn (${JSON.stringify(r.draft?.status)}) — không tới được bước hoàn trả`);
		await page.keyboard.press('Escape').catch(() => null);
		await page.waitForTimeout(2_000);
		await moTrang(page, `${BASE()}/order/created-orders/detail/${r.orderId}/${SHOP()}`, 'shop');
		await expect(page.getByText('Doanh thu', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
		await page.waitForTimeout(2_000);
		await page.getByRole('button', { name: /Đổi trả hàng/ }).click();
		await expect(dongTra(page).filter({ hasText: sp().tc }).first()).toBeVisible({ timeout: 30_000 });
		const x = await hoanTra(page);
		const loi = chuan(x.body?.status?.message || x.tb).replace(/\s*\([A-Za-z0-9]{6}\)$/, '');
		test.info().annotations.push({ type: 'đo', description: `đơn ${r.orderNumber} · "${x.tb}" · ${JSON.stringify(x.body?.status)}` });
		expect(loi).toBe('Ca hien tai chua gan quay thu ngan');
	});
});
