'use strict';

/**
 * 16_010_021 · 16_010_022 — bán hàng ký gửi ở quầy khi hợp đồng hết hiệu lực / SP chưa gán NCC.
 *
 * Tiền đề: seed bước 18 `00_seed/api-tests/18-ky-gui.api.spec.js` (sổ `duLieu.kyGui`):
 *   `SP_KG_HH` — NCC KG2, HĐ ký gửi đã HUỶ, có giá vốn danh mục (bậc 2) · `SP_KG_NONCC` — không gán NCC, có giá danh mục.
 *   Cả hai đã nhập tồn ở điểm bán seed.
 * Chạy vai `gdv` (người bán ở quầy của điểm bán seed) — kịch bản ghi "vai shop" = cấp điểm bán.
 *
 * Trace pod f9c5c858 (28/09/2026): chặn nằm ở `StockOwnershipStamper.assertContractActive` (CONSIGN-005) và
 * `ConsignmentObligationService` (CONSIGN-002) — cả hai chạy lúc LẬP PHIẾU XUẤT KHO của đơn. Đo làn 5: phiếu xuất của
 * đơn bán đi qua outbox `STOCK_EXPORT_REQUEST` (chạy nền) ⇒ `draft-checkout` trả 200, đơn thành "đã thanh toán", còn
 * phiếu xuất kho KHÔNG sinh ra. Assertion giữ theo kịch bản (chặn ngay ở quầy, kèm thông báo) — đỏ là LỆCH/LỖI sản phẩm;
 * case ghi kèm số đo phía sau (có phiếu xuất không) để lập bug.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const GOC = path.join(__dirname, '..');
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const kg = () => seed.doc().duLieu?.kyGui;
const POD = ['VNPOST_POD_01', 'VNPOST_POD_02'];
const phieuXuat = (orderId, shopId) => POD.flatMap((db) =>
	g.selectDb(`SELECT stock_in_out_id, status, ownership_type FROM ${db}.SHOP_STOCK_IN_OUT WHERE shop_id=${Number(shopId)} AND order_id=${Number(orderId)} AND type='EXPORT'`));

/** Bán 1 cái `ten` bằng tiền mặt; trả { draft, orderId, tb, xuat } — `xuat` = phiếu xuất kho sau ~60s. */
async function ban(page, ten) {
	const st = await p.moBan(page, test);
	await p.them(page, ten);
	const r = await p.thanhToanTienMat(page);
	await page.locator('.ant-message-notice, .ant-notification-notice').first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => null);
	const tb = p.chuan((await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts()).join(' | '));
	let xuat = [];
	if (r.orderId) {
		for (let i = 0; i < 12 && !xuat.length; i += 1) {
			await page.waitForTimeout(5_000);
			xuat = phieuXuat(r.orderId, st.h.shopid);
		}
	}
	return { draft: r.draft?.status, orderId: r.orderId, orderNumber: r.orderNumber, tb, xuat };
}

for (const [id, khoa, ma, cau] of [
	['16_010_021', 'hetHieuLuc', 'CONSIGN-005', 'Hàng ký gửi không còn hợp đồng hiệu lực, không được bán'],
	['16_010_022', 'chuaGanNcc', 'CONSIGN-002', 'Sản phẩm ký gửi chưa gán nhà cung cấp, không thể treo công nợ'],
]) {
	test(`${id} — bán hàng ký gửi ${khoa === 'hetHieuLuc' ? 'khi hợp đồng hết hiệu lực bị chặn' : 'chưa gán NCC không treo được công nợ'}`, async ({ page }) => {
		const i = loadCaseInput(GOC, id);
		test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
		test.setTimeout(300_000);
		const sp = kg()?.sanPham?.[khoa];
		test.skip(!kg()?.xong || !sp, 'Chưa chạy seed bước 18 (ky-gui) cho làn này: VNPOST_LANE=<làn> node tool/bin/seed.js --api --buoc=18');
		const kq = await ban(page, sp.ten);
		ghiChu('đo', `SKU ${sp.sku} · draft-checkout ${JSON.stringify(kq.draft)} · đơn ${kq.orderNumber ?? '-'} #${kq.orderId ?? '-'} · thông báo "${kq.tb}" · phiếu xuất kho sau ~60s ${JSON.stringify(kq.xuat)}`);
		// Kỳ vọng kịch bản: bị chặn ngay, thông báo nguyên văn kèm mã lỗi.
		expect(kq.orderId, `Bán ${sp.sku} KHÔNG bị chặn: đơn ${kq.orderNumber} đã thanh toán (phiếu xuất kho: ${kq.xuat.length ? 'có' : 'KHÔNG sinh ra'})`).toBeFalsy();
		expect(String(kq.draft?.code)).toBe(ma);
		expect(kq.tb).toContain(cau);
	});
}
