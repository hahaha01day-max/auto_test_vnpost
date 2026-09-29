'use strict';

/**
 * 14_2 · 010_010 / 010_011 — gom phiếu ngoài phạm vi (vai `province`). Chỉ gọi API, BE chặn trước khi ghi.
 * Tiền đề 010_010: `tien-de-lan-khac.shop.spec.js` (phiếu Đã duyệt của tỉnh làn khác, cùng pod).
 * Nguồn: BE `ReturnRequestService.consolidate` (phạm vi `orgUnitCode`, "Các phiếu gom phải cùng chuỗi").
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('./tra-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

let pt = null;
test.beforeEach(async ({ page }) => {
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, 'province');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	pt = { page, st };
});

async function phieuMinh() {
	const p = ((await t.doc(pt, '', { status: 'APPROVED', page: 0, size: 100 }))?.data || []).find((x) => !x.isConsolidated && x.parentId == null);
	expect(p, 'Tỉnh không còn phiếu Đã duyệt nào').toBeTruthy();
	return p;
}

test('14_2_010_010 — Cấp tỉnh không gom được phiếu của tỉnh khác', async () => {
	chanNeuTat('14_2_010_010');
	const k = t.seed.doc().duLieu.traNcc14_2?.phieuTinhKhac;
	expect(k, 'Chưa chạy tiền đề `tien de lan khac 14_2` (làn khác)').toBeTruthy();
	const minh = await phieuMinh();
	const b = await t.goi(pt, '/consolidate', { ids: [minh.id, k.id] });
	expect(t.msg(b)).toBe(`Phiếu ${k.code} không thuộc phạm vi tỉnh của bạn`);
	expect((await t.chiTietPhieu(pt.page, pt.st, minh.id)).request.status).toBe('APPROVED');
});

test('14_2_010_011 — Gom phiếu khác chuỗi bị chặn', async () => {
	chanNeuTat('14_2_010_011');
	test.skip(true, 'Không dựng được tiền đề: môi trường chỉ có MỘT chuỗi (626) — đo 24/09/2026 SHOP_STOCK_RETURN_REQUEST của POD_01/02/03 đều 1 chain_id; lập chuỗi mới không thuộc phạm vi auto test. Nhánh "Các phiếu gom phải cùng chuỗi" cũng chỉ tới được sau khi qua chặn phạm vi tỉnh (phiếu chuỗi khác luôn khác tỉnh).');
});
