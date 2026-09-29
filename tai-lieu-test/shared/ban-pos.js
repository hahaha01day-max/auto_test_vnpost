'use strict';

/**
 * Bán POS `sl` cái một SP bằng phiên phụ `gdv` (`kho-api.moGdv`), đọc phiếu xuất bán + dòng phiếu (SELECT pod điểm bán seed).
 * Tách từ `04_4/tests/ton-am.shop.spec.js` (28/09/2026). Trả { orderId, orderNumber, phieu, dong } —
 * `dong` = [price, quantity, amount, pre, post, base_price, batch_products] (`kho-api.dongPhieu`).
 * 🔴 Xuất kho bán đi qua outbox Kafka ⇒ phiếu xuất có thể trễ vài giây — poll tối đa ~45 giây.
 */

const { expect } = require('@playwright/test');
const ka = require('./kho-api');

async function banPos(g, test, ten, sl) {
	const p = require('../18_1_ban_hang_tai_quay/tests/pos-18');
	await p.chanIn(g.page);
	await p.moBan(g.page, test);
	const r = await p.them(g.page, ten);
	expect(r?.dong, `POS không thêm được ${ten}: ${r?.thongBao}`).toBeTruthy();
	if (sl > 1) {
		const o = p.dongBill(g.page).filter({ hasText: ten }).first().locator('input').first();
		await o.fill(String(sl));
		await o.press('Enter');
		await g.page.waitForTimeout(1_200);
	}
	const kq = await p.thanhToanTienMat(g.page);
	expect(kq.orderId, `Thanh toán lỗi: ${JSON.stringify(kq.draft?.status)}`).toBeTruthy();
	let phieu = '';
	for (let i = 0; i < 15 && !phieu; i += 1) {
		phieu = ka.sql(`select stock_in_out_id from SHOP_STOCK_IN_OUT where shop_id=${ka.d().diemBan.shopId} and type='EXPORT' and (order_id=${kq.orderId} or order_code='${kq.orderNumber}') order by 1 desc limit 1`);
		if (!phieu) await g.page.waitForTimeout(3_000);
	}
	expect(phieu, `Không thấy phiếu xuất bán của đơn ${kq.orderNumber}`).toBeTruthy();
	return { orderId: kq.orderId, orderNumber: kq.orderNumber, phieu: Number(phieu), dong: ka.dongPhieu(phieu) };
}

module.exports = { banPos };
