'use strict';

/**
 * 14_1 · 060_028 — vai `province`: màn xuất trả theo PO (luồng cũ, chỉ còn tra cứu — xem tra-theo-po.shop.spec.js)
 * chỉ liệt kê phiếu của điểm bán trong tỉnh.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const r = require('./return-page');

const GOC = path.join(__dirname, '..');

test('14_1_060_028 — Vai cấp tỉnh xem được màn xuất trả theo PO ở phạm vi tỉnh', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '14_1_060_028'));
	test.skip(Boolean(ly), ly ?? '');
	const cho = page.waitForResponse((x) => x.url().includes('/import-export/find') && x.url().includes('RETURN_TO_SUPPLIER'), { timeout: 60_000 });
	await r.moDanhSach(page, 'province');
	await r.diToi(page, '/inventory/return-to-supplier');
	const body = await (await cho).json();
	expect(String(body?.status?.code), r.msg(body)).toBe('200');
	await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Xuất trả nhà cung cấp');
	const tinh = r.seed.doc().duLieu.toChuc.maTinh;
	for (const x of body.data || []) expect(x.orgProvinceCode, `Phiếu ${x.code} ngoài tỉnh`).toBe(tinh);
	test.info().annotations.push({ type: 'đo', description: `Tỉnh thấy ${body.page?.total_elements ?? 0} phiếu xuất trả theo PO` });
	expect((body.data || []).length, 'Không có phiếu nào để đối chiếu phạm vi tỉnh — luồng cũ ngừng, không dựng được tiền đề').toBeGreaterThan(0);
});
