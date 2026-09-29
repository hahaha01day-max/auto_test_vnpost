'use strict';

/**
 * Tiền đề 18_5_130_001 (`danh-sach-hoan-tra.shop`): một đơn hoàn trả có tiền hoàn ≥ ngưỡng bất thường của chuỗi
 * (`ABNORMAL_REFUND_AMOUNT`, đo 26/09/2026: BẬT, 500.000đ) trong 7 ngày gần nhất — bán 6 × SP TC rồi hoàn trả toàn bộ.
 * Idempotent: đã có đơn hoàn ≥ ngưỡng trong 7 ngày (SELECT RETURN_ORDER) thì bỏ qua.
 *   VNPOST_LANE=8 npx playwright test --config tai-lieu-test/18_5_doi_tra_hang/playwright.config.js -g "tien de bat thuong"
 * 🔴 Ghi thật: đơn bán + đơn hoàn trả.
 */

const { test, expect } = require('@playwright/test');
const { chon } = require('../../shared/db/otp');
const { p, banDon, moDoiTra, hoanTra, SHOP } = require('./doi-tra');

const NGUONG = 500_000;
const coDon = () => {
	for (const db of ['VNPOST_POD_01', 'VNPOST_POD_02', 'VNPOST_POD_03']) {
		let r = '';
		try { r = chon(`select count(*) from RETURN_ORDER where shop_id=${SHOP()} and total_refund_amount >= ${NGUONG} and created_date > now() - interval 6 day`, db); } catch { /* pod khác */ }
		if (Number(r) > 0) return true;
	}
	return false;
};

test('tien de bat thuong 18_5 — đơn hoàn trả ≥ ngưỡng bất thường', async ({ page }) => {
	test.setTimeout(300_000);
	if (coDon()) { test.info().annotations.push({ type: 'dùng lại', description: `đã có đơn hoàn ≥ ${NGUONG}` }); return; }
	await p.chanIn(page);
	const d = await banDon(page, { sl: 6 });
	await moDoiTra(page, d.orderId);
	const { tb, body, req } = await hoanTra(page);
	test.info().annotations.push({ type: 'đơn hoàn', description: `đơn ${d.orderNumber} · "${tb}" · ${body?.data?.returnOrderCode} · tiền hoàn ${body?.data?.totalRefundAmount}` });
	expect(tb).toContain('Tạo đơn hoàn trả thành công');
	await p.donTab(page).catch(() => null);
	expect(coDon(), `Tạo xong mà không thấy đơn hoàn ≥ ${NGUONG}`).toBe(true);
});
