'use strict';

/**
 * 16 — case PHẠM VI của vai `ward` (cấp xã): công nợ ký gửi (010_020) · đối soát kỳ (020_015).
 * Nguồn: xem `pham-vi-ky-gui.js`. 🔴 020_015 BẤM thật "Sinh kỳ từ hợp đồng" — xã phải bị chặn.
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

test.describe('16 · phạm vi vai cấp xã', () => {
	test('16_010_020 — Vai cấp xã chỉ thấy khoản trong xã', async ({ page }) => {
		chanNeuTat('16_010_020');
		const maXa = seed.doc().duLieu?.toChuc?.maXa;
		const res = await moVaBat(page, '/debt-reconciliation/consignment-debt', 'ward');
		const ds = res.filter((r) => r.url.pathname.endsWith('/consignment-debt/obligations'));
		ghi(`obligations: ${ds.map((r) => `${r.status}/${r.body?.status?.code} ${r.url.search} → ${r.body?.data?.length ?? '-'} dòng`).join(' ; ')}`);
		expect(ds.length).toBeGreaterThan(0);
		for (const r of ds) expect(biChan(r), `API công nợ chặn vai xã: ${r.status} ${r.body?.status?.message}`).toBe(false);
		// Xã mặc định lọc đúng xã của mình (`ConsignmentDebtPage.jsx` useEffect isXa ⇒ wardCode).
		const cuoi = ds.at(-1);
		expect(cuoi.url.searchParams.get('wardCode'), 'Màn của xã không tự lọc theo xã').toBe(maXa);
		const dong = cuoi.body?.data || [];
		test.skip(dong.length === 0, `Xã ${maXa} có 0 khoản nghĩa vụ ⇒ "không dòng nào thuộc xã khác" chưa kiểm được. Cần bán hàng ký gửi trong xã này.`);
		for (const x of dong) expect(x.orgWardCode, `Xã thấy khoản của xã khác (id ${x.id})`).toBe(maXa);
	});

	test('16_020_015 — Vai cấp xã không sinh kỳ được', async ({ page }) => {
		chanNeuTat('16_020_015');
		const res = await moVaBat(page, '/debt-reconciliation/consignment-recon', 'ward');
		const nut = khung(page).getByRole('button', { name: 'Sinh kỳ từ hợp đồng' });
		ghi(`suppliers: ${res.filter((r) => r.url.pathname.endsWith('/suppliers')).map((r) => `${r.status}/${r.body?.status?.code}`).join(', ')} · nút: ${await nut.count()}`);
		if ((await nut.count()) === 0) return;
		const cho = page.waitForResponse((r) => r.url().includes('/consignment-recon/periods/generate'), { timeout: 30_000 });
		await nut.click();
		const r = await cho;
		const body = await r.json().catch(() => null);
		ghi(`POST generate → HTTP ${r.status()} · ${JSON.stringify(body?.status)} · data ${JSON.stringify(body?.data)?.slice(0, 200)}`);
		expect(r.status() >= 400 || String(body?.status?.code) !== '200', `Vai cấp xã SINH KỲ ĐƯỢC: ${JSON.stringify(body?.data)?.slice(0, 200)}`).toBe(true);
	});
});
