'use strict';

/**
 * 14_3 · 040_020 — vai **TCT** mở màn phát hành cho đợt trả cấp TCT.
 *
 * 🔴 Nhánh B không tới được trên giao diện thật (BE không trả `returnInvoiceIssuer`, không NCC nào khai VNPOST — xem
 * `phat-hanh.province.spec.js`) ⇒ chèn cờ VNPOST vào response chi tiết phiếu; bản nháp lấy thật. `POST /issue` bị chặn.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('./hoa-don');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });

test.describe.configure({ timeout: 240_000 });

test('14_3_040_020 — Vai TCT phát hành được hoá đơn cho đợt của mình', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '14_3_040_020'));
	test.skip(Boolean(ly), ly ?? '');
	const daChan = await t.chanGhiHd(page, /return-credit-note\/issue(\?|$)/);
	await page.route(/\/stock\/v2\/stock-return-request\/\d+(\?|$)/, async (route) => {
		if (route.request().method() !== 'GET') return route.continue();
		const res = await route.fetch();
		const b = await res.json();
		if (b?.data?.request) b.data.request.returnInvoiceIssuer = 'VNPOST';
		return route.fulfill({ response: res, json: b });
	});
	test.info().annotations.push({ type: 'giả lập', description: 'Chèn returnInvoiceIssuer=VNPOST vào GET chi tiết phiếu trả (BE không trả trường này).' });
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const p = { page, st };
	let d;
	try {
		d = await t.dotRanh(p, { trangThai: 'WAIT_CONFIRM', giuLai: false });
	} catch (_) {
		d = await t.dotRanh(p, { trangThai: 'CONFIRMED', giuLai: false });
	}
	const { khoi } = await t.moKhoi(page, d);
	await khoi.getByRole('button', { name: 'Phát hành hoá đơn' }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Phát hành hoá đơn xuất trả hàng' }).last();
	await expect(dr).toBeVisible({ timeout: 20_000 });
	await expect(dr.locator('.ant-skeleton')).toHaveCount(0, { timeout: 20_000 });
	const ban = t.chuan(await t.oMoTa(dr, 'Người bán').innerText());
	const nhap = (await t.goi(p, 'GET', `${t.CN}/issue-draft`, { batchId: d.id }))?.data;
	ghi(`đợt #${d.id} (${d.phieu.code}): Người bán = "${ban}" · draft seller=${nhap?.sellerName} MST=${nhap?.sellerTaxCode}`);
	expect(ban, 'Người bán không phải đơn vị TCT').toMatch(/Tổng công ty|Tong cong ty|VNPOST|Bưu điện Việt Nam/i);
	expect(nhap?.sellerTaxCode, 'Người bán thiếu mã số thuế').toBeTruthy();
	expect(ban).toContain(`MST ${nhap.sellerTaxCode}`);
	expect(daChan).toEqual([]);
});
