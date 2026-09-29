'use strict';

/** 32_110_006 · Vai `gdv`: icon "+" thêm đơn vị con trên cây KHÔNG hiện (perm ORGANIZATIONAL_UNIT_CREATE). 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, khung, moMan, nutCay } = require('./org-page');

const GOC = path.join(__dirname, '..');

test('32_110_006 — Icon thêm mới không hiện khi không đủ quyền', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '32_110_006'));
	test.skip(Boolean(ly), ly ?? '');
	await chanGhi(page);
	const n = await moMan(page, 'gdv');
	const dem = [];
	const nThat = await nutCay(page).and(page.locator(':not([aria-hidden="true"])')).count();
	for (let i = 0; i < Math.min(nThat, 5); i += 1) {
		const nut = nutCay(page).and(page.locator(':not([aria-hidden="true"])')).nth(i);
		await nut.hover();
		await page.waitForTimeout(400);
		const cong = nut.locator('button:has(.anticon-plus)');
		dem.push(`${chuan(await nut.innerText()).slice(0, 30)}: ${(await cong.count()) && (await cong.first().isVisible()) ? 'CÓ +' : 'không'}`);
	}
	const nutThem = await khung(page).getByRole('button', { name: 'Thêm đơn vị' }).count();
	test.info().annotations.push({ type: 'hành vi thật', description: `${n} nút cây · ${dem.join(' · ') || '(cây rỗng)'} · nút "Thêm đơn vị" ${nutThem} · url ${page.url()}` });
	expect(dem.filter((x) => x.endsWith('CÓ +')), 'Vai gdv vẫn thấy icon "+" thêm đơn vị con').toEqual([]);
	expect(nutThem, 'Vai gdv vẫn thấy nút "Thêm đơn vị"').toBe(0);
});
