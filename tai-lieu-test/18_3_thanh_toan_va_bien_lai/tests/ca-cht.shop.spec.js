'use strict';

/**
 * 18_3_100_002 — vai `shop` (Cửa hàng trưởng) thanh toán đơn của chính điểm bán.
 * Tiền đề dựng trong spec (26/09/2026): CHT mở ca (có quầy) ở beforeAll, CHỐT ca ở afterAll — trả lại trạng thái "CHT chưa
 * mở ca" mà 18_1_010_003 dùng. Ca/quầy: `ca-cht.js`. Thanh toán: `18_1/tests/pos-18.js › thanhToanTienMat` (không phụ thuộc vai).
 * 🔴 Ghi thật: ca CHT + đơn bán.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const ca = require('./ca-cht');

const GOC = path.join(__dirname, '..');
let CA = null;

test.describe('18_3 — Cửa hàng trưởng thanh toán', () => {
	test.describe.configure({ timeout: 240_000, mode: 'serial' });
	test.beforeAll(async ({ browser }) => {
		test.setTimeout(120_000);
		const ctx = await browser.newContext({ storageState: require('../../shared/auth/accounts').storageStateFor('shop') });
		const pg = await ctx.newPage();
		try { CA = await ca.moCa(pg, { quay: true }); } finally { await ctx.close(); }
	});
	test.afterAll(async ({ browser }) => {
		test.setTimeout(120_000);
		const ctx = await browser.newContext({ storageState: require('../../shared/auth/accounts').storageStateFor('shop') });
		const pg = await ctx.newPage();
		try { await ca.chotCa(pg); } finally { await ctx.close(); }
	});

	test('18_3_100_002 — Vai quản lý điểm bán thanh toán được đơn của chính điểm bán', async ({ page }) => {
		const i = loadCaseInput(GOC, '18_3_100_002');
		test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
		test.info().annotations.push({ type: 'ca CHT', description: JSON.stringify(CA) });
		expect(CA?.daMo, `CHT không mở được ca: ${JSON.stringify(CA)}`).toBe(true);
		await p.chanIn(page);
		await moTrang(page, `${process.env.VNPOST_BASE_URL}/order/create-order`, 'shop');
		await expect(p.oTim(page), 'CHT đã mở ca mà màn bán hàng vẫn chặn').toBeVisible({ timeout: 30_000 });
		await p.donTab(page);
		await p.them(page, p.sp().tc);
		const r = await p.thanhToanTienMat(page);
		test.info().annotations.push({ type: 'đo', description: `đơn ${r.orderNumber} · ${JSON.stringify(r.draft?.status)}` });
		expect(r.orderId, `CHT thanh toán đơn của điểm bán mình lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		const ct = await p.k.goiApi(page, p.k.batHeader(page), `/orders/shops/${r.draft?.data?.shopId}/${r.orderId}/details`).catch(() => null);
		test.info().annotations.push({ type: 'đơn', description: JSON.stringify({ status: ct?.data?.status, payStatus: ct?.data?.payStatus }).slice(0, 200) });
	});
});
