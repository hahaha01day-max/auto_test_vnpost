'use strict';

/**
 * 27 · Phạm vi danh sách nhà cung cấp ở bộ lọc — vai `province` đối chứng với vai `tct`.
 * 🚫 Không ghi. Nguồn NCC của bộ lọc: `GET /chain-supplier` (qua `getSuppliersScoped`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { storageStateFor } = require('../../shared/auth/accounts');
const P = require('./reconcile-page');

const GOC = path.join(__dirname, '..');

async function dsNcc(page, vai) {
	await P.chanGhi(page);
	const cho = page.waitForResponse((r) => /\/(chain-supplier|shops\/\d+\/supplier|supplier)\b[^/]*\?/.test(r.url()) && r.status() !== 401, { timeout: 60_000 });
	await P.moMan(page, vai);
	const res = await cho;
	return (await res.json())?.data ?? [];
}

test('27_070_003 — Phạm vi danh sách nhà cung cấp theo cấp tỉnh và TCT', async ({ page, browser }) => {
	const i = loadCaseInput(GOC, '27_070_003');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	const tinh = await dsNcc(page, 'province');
	const ctx = await browser.newContext({ baseURL: process.env.VNPOST_BASE_URL, storageState: storageStateFor('tct') });
	const tct = await dsNcc(await ctx.newPage(), 'tct');
	await ctx.close();
	test.info().annotations.push({ type: 'số NCC', description: `province ${tinh.length} · tct ${tct.length}` });

	const cuaTinh = tct.filter((s) => s.orgUnitType !== 'TONG_CONG_TY');
	test.skip(cuaTinh.length === 0 && tinh.length === 0,
		'Thiếu dữ liệu: toàn hệ thống không có NCC cấp tỉnh nào (mọi NCC vai tct thấy đều TONG_CONG_TY) và vai province không thấy NCC nào ⇒ không đối chứng được.');
	expect(tinh.length, 'Vai province không thấy NCC nào').toBeGreaterThan(0);
	const ngoai = tinh.filter((s) => !(s.orgUnitType !== 'TONG_CONG_TY' && s.orgUnitCode === i.data.maTinh));
	expect(ngoai.map((s) => `${s.name} (${s.orgUnitType}/${s.orgUnitCode})`),
		`Vai province (tỉnh ${i.data.maTinh}) thấy NCC không thuộc tỉnh mình`).toEqual([]);
	const idTct = new Set(tct.map((s) => s.supplierId));
	expect(tinh.filter((s) => !idTct.has(s.supplierId)).map((s) => s.name), 'Vai tct không thấy NCC mà tỉnh thấy').toEqual([]);
});
