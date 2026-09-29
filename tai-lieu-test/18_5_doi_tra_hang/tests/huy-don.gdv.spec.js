'use strict';

/**
 * 18_5 · 090_004 / 090_005 — Huỷ đơn / hoàn trả đơn đã huỷ, GHI (26/09/2026). Vai `gdv`, làn 8.
 *
 * 🔴 Nút "Hủy đơn hàng" ở chi tiết đơn đang TẠM ẨN (`OrderDetail.jsx` ~1085) nhưng code + API còn: `DrawerCancelOrder.handleCancelOrder` gọi
 * `POST /order-cancel?shopId=` (pages/order/actions.js). Môi trường test ⇒ dựng bằng ĐÚNG body FE gửi (kể cả `inventoryId: 100` cứng trong FE).
 * Đo: trạng thái đơn (`GET /orders/shops/{shop}/{orderId}/details`), phiếu chi (`RECEIPT_EXPENSES` refer/bill theo đơn — SELECT), tồn SP (Σ lô).
 */

const { test, expect } = require('@playwright/test');
const { GOC, SHOP, p, banDon, moDoiTra, hoanTra, chanNeuTat } = require('./doi-tra');
const { chon } = require('../../shared/db/otp');
const seed = require('../../00_seed/seed-state');

void GOC;
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 1200) });
const spTc = () => {
	const sku = seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan.sku;
	const [productId, variantId] = chon(`select product_id, variant_id from CHAIN_PRODUCT_UNIT where sku='${sku}' and convert_to_main_unit=1 and variant_id is not null limit 1`, 'VNPOST_CORE').split('\t');
	return { productId: +productId, variantId: +variantId };
};
const ton = async (page, st) => {
	const x = spTc();
	const b = await p.k.goiGhi(page, st, 'GET', '/stock/v2/batch-product', { shopId: SHOP(), productId: x.productId, variantId: x.variantId, size: 500 });
	return (b?.data || []).reduce((s, l) => s + Number(l.remainQuantity), 0);
};
const chiTiet = async (page, st, orderId) => (await p.k.goiGhi(page, st, 'GET', `/orders/shops/${SHOP()}/${orderId}/details`))?.data;
const phieuChi = (orderId, code) => chon(`select receipt_expenses_code, type, sub_type, amount, reason from RECEIPT_EXPENSES where shop_id=${SHOP()} and (bill_id=${orderId} or refer_id=${orderId} or reason like '%${code}%') order by receipt_expenses_id`, 'VNPOST_POD_02');

async function huy(page, st, orderId) {
	const ct = await chiTiet(page, st, orderId);
	const body = { oldItems: ct.items, inventoryId: 100, cancelReason: 1, isRollbackLoyalty: true, cancelFee: 0, cancelComment: 'AUTO TEST 18_5 hủy đơn hàng', orderId, createExpense: true };
	const r = await p.k.goiGhi(page, st, 'POST', '/order-cancel', { shopId: SHOP() }, body);
	return { ct, r };
}

test.describe('18_5 · 090 — Huỷ đơn (GHI, API FE)', () => {
	test.describe.configure({ timeout: 300_000 });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });
	test.afterEach(async ({ page }) => { await page.keyboard.press('Escape').catch(() => null); await p.donTab(page).catch(() => null); });

	test('18_5_090_005 — Huỷ đơn hàng sinh phiếu chi và nhập lại kho', async ({ page }) => {
		chanNeuTat('18_5_090_005');
		const d = await banDon(page);
		const st = d.st?.h ? d.st : p.k.batHeader(page);
		await page.waitForTimeout(2_000);
		const tonTruoc = await ton(page, st);
		const { ct, r } = await huy(page, st, d.orderId);
		await page.waitForTimeout(4_000);
		const sau = await chiTiet(page, st, d.orderId);
		const tonSau = await ton(page, st);
		const pc = phieuChi(d.orderId, d.orderNumber);
		ghiDo(`đơn ${d.orderNumber} (${ct?.totalMoney ?? ct?.totalPayment}) · huỷ: ${JSON.stringify(r?.status)} · trạng thái sau ${sau?.status}/${sau?.statusName ?? ''} · tồn ${tonTruoc} ⇒ ${tonSau} · phiếu thu/chi: ${pc.replace(/\n/g, ' ; ') || 'KHÔNG CÓ'}`);
		expect(String(r?.status?.code), `🔴 Huỷ đơn không làm được: POST /order-cancel ${JSON.stringify(r?.status ?? r)} (BE OrderCancelController @PostMapping bị comment; nút FE ẩn)`).toBe('200');
		expect(String(sau?.status), 'Đơn không chuyển "Đã hủy"').toMatch(/CANCEL|-1|4|HUY/i);
		expect(tonSau, 'Huỷ đơn mà tồn không nhập lại đúng 1').toBe(tonTruoc + 1);
		expect(pc.split('\n').some((l) => /EXPENSE|CHI|2\b/i.test(l)), 'Huỷ đơn tiền mặt không sinh phiếu chi').toBe(true);
	});

	test('18_5_090_004 — Hoàn trả đơn đã ở trạng thái Đơn hủy', async ({ page }) => {
		chanNeuTat('18_5_090_004');
		const d = await banDon(page);
		const st = d.st?.h ? d.st : p.k.batHeader(page);
		const { r } = await huy(page, st, d.orderId);
		ghiDo(`huỷ đơn tiền đề: HTTP ${JSON.stringify(r?.status ?? r)} — BE OrderCancelController @PostMapping bị comment, nút FE ẩn; POD_02 không có đơn huỷ sẵn nào`);
		expect(String(r?.status?.code), '🔴 Không dựng được đơn Đã hủy: chức năng huỷ đơn bị tắt (API /order-cancel 404, nút ẩn)').toBe('200');
		await page.waitForTimeout(3_000);
		const tonTruoc = await ton(page, st);
		let mo = null;
		let h = null;
		try { await moDoiTra(page, d.orderId); mo = 'mở được'; h = await hoanTra(page); } catch (e) { mo = `không mở được đổi trả: ${String(e.message).slice(0, 160)}`; }
		await page.waitForTimeout(3_000);
		const sau = await chiTiet(page, st, d.orderId);
		const tonSau = await ton(page, st);
		ghiDo(`đơn ${d.orderNumber} đã huỷ · đổi trả: ${mo} · hoàn: ${h?.tb ?? '-'} ${JSON.stringify(h?.body?.status ?? '')} · trạng thái ${sau?.status} · tồn ${tonTruoc} ⇒ ${tonSau} · phiếu: ${phieuChi(d.orderId, d.orderNumber).replace(/\n/g, ' ; ')}`);
		// Kỳ vọng kịch bản: hoàn trả trên đơn đã huỷ vẫn giữ "Đã hủy", sinh phiếu chi + nhập kho. Đơn huỷ ĐÃ nhập lại kho ⇒ hoàn trả thêm là nhập 2 lần.
		expect(String(sau?.status), 'Trạng thái đơn không còn "Đã hủy"').toMatch(/CANCEL|-1|4|HUY/i);
		expect(tonSau - tonTruoc, '🔴 Hoàn trả đơn đã huỷ nhập kho THÊM lần nữa (huỷ đã nhập lại)').toBe(0);
	});
});
