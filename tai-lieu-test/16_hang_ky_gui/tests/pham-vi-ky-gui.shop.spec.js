'use strict';

/**
 * 16 — case PHẠM VI của vai `shop` (điểm bán): công nợ ký gửi (010_019) · đối soát kỳ (020_014).
 * Nguồn: xem `pham-vi-ky-gui.js`. 🔴 020_014 BẤM thật "Sinh kỳ từ hợp đồng": vai điểm bán phải bị chặn; nếu KHÔNG bị
 *    chặn thì backend sinh kỳ theo hợp đồng của phạm vi điểm bán — đo 24/09 điểm bán làn 7 không có hợp đồng ký gửi.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const { khung, moVaBat, biChan } = require('./pham-vi-ky-gui');

const GOC = path.join(__dirname, '..');
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

test.describe('16 · phạm vi vai điểm bán', () => {
	test('16_010_019 — Vai điểm bán xem được công nợ ký gửi', async ({ page }) => {
		chanNeuTat('16_010_019');
		const res = await moVaBat(page, '/debt-reconciliation/consignment-debt', 'shop');
		const ds = res.filter((r) => r.url.pathname.endsWith('/consignment-debt/obligations'));
		ghi(`obligations: ${ds.map((r) => `${r.status}/${r.body?.status?.code} ${r.url.search} → ${r.body?.data?.length ?? '-'} dòng`).join(' ; ')}`);
		expect(ds.length, 'Màn không gọi API công nợ').toBeGreaterThan(0);
		for (const r of ds) expect(biChan(r), `API công nợ chặn vai điểm bán: ${r.status} ${r.body?.status?.message}`).toBe(false);
		await expect(khung(page).locator('.ant-page-header-heading-title')).toHaveText('Công nợ hàng ký gửi');
		// Điểm bán chỉ có dữ liệu của mình ⇒ FE ẩn bộ lọc đơn vị (`ConsignmentDebtPage.jsx` showSelector = !isShop).
		await expect(khung(page).locator('.ant-select').filter({ hasText: 'Lọc theo tỉnh / xã / điểm bán' })).toHaveCount(0);
		const dong = ds.at(-1).body?.data || [];
		const shopId = seed.doc().duLieu?.diemBan?.shopId;
		test.skip(dong.length === 0, `Màn mở được (API 200), nhưng điểm bán làn ${seed.PREFIX} (shopId ${shopId}) có 0 khoản nghĩa vụ ⇒ vế "chỉ thấy khoản của mình" chưa kiểm được. Cần bán hàng ký gửi tại điểm bán này.`);
		for (const x of dong) expect(x.shopId, `Điểm bán thấy khoản của điểm bán khác (id ${x.id})`).toBe(shopId);
	});

	test('16_020_014 — Vai điểm bán không sinh kỳ được', async ({ page }) => {
		chanNeuTat('16_020_014');
		const res = await moVaBat(page, '/debt-reconciliation/consignment-recon', 'shop');
		const nut = khung(page).getByRole('button', { name: 'Sinh kỳ từ hợp đồng' });
		const dsNcc = res.filter((r) => r.url.pathname.endsWith('/consignment-recon/suppliers'));
		ghi(`suppliers: ${dsNcc.map((r) => `${r.status}/${r.body?.status?.code}`).join(', ')} · nút sinh kỳ: ${await nut.count()}`);
		if ((await nut.count()) === 0) return; // không có nút = đạt (vế 2 của kỳ vọng)
		const cho = page.waitForResponse((r) => r.url().includes('/consignment-recon/periods/generate'), { timeout: 30_000 });
		await nut.click();
		const r = await cho;
		const body = await r.json().catch(() => null);
		ghi(`POST generate → HTTP ${r.status()} · ${JSON.stringify(body?.status)} · data ${JSON.stringify(body?.data)?.slice(0, 200)}`);
		expect(r.status() >= 400 || String(body?.status?.code) !== '200', `Vai điểm bán SINH KỲ ĐƯỢC: ${JSON.stringify(body?.data)?.slice(0, 200)}`).toBe(true);
	});
});
