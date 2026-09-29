'use strict';

/**
 * Phân hệ 16 · 060_027 — vai **điểm bán** mở Báo cáo hàng ký gửi. Chỉ ĐỌC.
 * Nguồn: `features/consignmentReport/ConsignmentReport.jsx` (`scope.isShop` ⇒ gửi `shopId`), `services/consignmentReportApi.js`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });

test('16_060_027 — Vai điểm bán xem được báo cáo trong phạm vi mình', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '16_060_027'));
	test.skip(Boolean(ly), ly ?? '');
	test.setTimeout(180_000);
	const st = k.batHeader(page);
	const cho = page.waitForResponse((r) => r.url().includes('/report/consignment-report/nxt'), { timeout: 90_000 });
	await moTrang(page, '/report/consignment', 'shop');
	const res = await cho;
	const url = new URL(res.url());
	const body = await res.json();
	await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Báo cáo hàng ký gửi');
	expect(String(body?.status?.code)).toBe('200');
	const shopId = url.searchParams.get('shopId');
	ghi(`request: ${url.search} · ${body?.page?.total_elements} dòng`);
	expect(shopId, 'Điểm bán không gửi shopId ⇒ BE không giới hạn phạm vi').toBeTruthy();
	for (const r of body.data || []) expect(String(r.shopId), `Dòng của điểm bán khác (${r.shopName})`).toBe(shopId);
	// Vế BE: bỏ shopId khỏi request thì BE có tự khoá theo phạm vi tài khoản không?
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const p = Object.fromEntries(url.searchParams);
	delete p.shopId;
	p.fromDate = '2026-01-01';
	const b2 = await k.goiGhi(page, st, 'GET', '/report/consignment-report/nxt', p);
	const la = (b2.data || []).filter((r) => String(r.shopId) !== shopId);
	ghi(`bỏ shopId: ${b2?.status?.code} · ${b2?.page?.total_elements} dòng · điểm bán khác ${la.length} (${[...new Set(la.map((r) => r.shopName))].slice(0, 3).join(', ')})`);
	expect(la.length, '🔴 Điểm bán bỏ shopId khỏi request là đọc được số của điểm bán khác').toBe(0);
	// Ô chọn kỳ: điểm bán thấy kỳ của đơn vị nào?
	const ky = (await k.goiGhi(page, st, 'GET', '/report/consignment-report/periods', { chainId: url.searchParams.get('chainId') })).data || [];
	ghi(`ô chọn kỳ của điểm bán liệt kê ${ky.length} kỳ, đơn vị: ${[...new Set(ky.map((x) => x.orgUnitType))].join(', ')}`);
});
