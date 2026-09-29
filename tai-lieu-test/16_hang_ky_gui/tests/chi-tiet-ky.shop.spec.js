'use strict';

/**
 * Phân hệ 16 · 050_020 — vai **điểm bán** mở Chi tiết kỳ đối soát. Chặn mọi request ghi tới consignment.
 * Nguồn: `features/consignmentRecon/pages/ConsignmentReconDetailPage.jsx`, `features/consignmentInvoice/pages/ConsignmentInvoiceTab.jsx`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });

test('16_050_020 — Vai điểm bán không ghi nợ được', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '16_050_020'));
	test.skip(Boolean(ly), ly ?? '');
	test.setTimeout(180_000);
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const r = route.request();
		if (r.method() === 'GET' || !/consignment/i.test(r.url())) return route.continue();
		daGoi.push(`${r.method()} ${new URL(r.url()).pathname}`);
		await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	// Kỳ đã chốt có hoá đơn khớp (INVOICED id 2 ở TCT) — điểm bán mở thẳng bằng URL.
	const st = k.batHeader(page);
	const cho = page.waitForResponse((r) => /\/consignment-recon\/periods\/\d+\/summary/.test(r.url()), { timeout: 60_000 }).catch(() => null);
	await moTrang(page, '/debt-reconciliation/consignment-recon/2?tab=invoice', 'shop');
	const res = await cho;
	const b = res ? await res.json().catch(() => null) : null;
	await page.waitForTimeout(4_000);
	const nut = page.getByRole('button', { name: /Ghi nợ chính thức/ });
	const soNut = await nut.count();
	const bat = soNut ? await nut.first().isEnabled() : false;
	ghi(`summary: HTTP ${res?.status()} ${b?.status?.code} ${b?.status?.message ?? ''} · nút ghi nợ: ${soNut} (bật: ${bat}) · url ${page.url()}`);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const api = await k.goiGhi(page, st, 'GET', '/consignment-recon/periods/2/debt-shops');
	ghi(`điểm bán gọi debt-shops kỳ 2: ${api?.status?.code} ${api?.status?.message ?? ''} ${JSON.stringify(api?.data)?.slice(0, 160)}`);
	const vaoDuoc = String(b?.status?.code) === '200';
	expect(vaoDuoc && bat, 'Điểm bán vào được chi tiết kỳ VÀ có nút "Ghi nợ chính thức" bấm được').toBe(false);
	expect(daGoi).toEqual([]);
});
