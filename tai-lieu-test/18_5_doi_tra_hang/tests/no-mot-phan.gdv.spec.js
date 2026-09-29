'use strict';

/**
 * 18_5_090_002 — hoàn trả đơn NỢ MỘT PHẦN (vai `gdv`).
 * Dựng (26/09/2026): khách riêng của làn, 1 × SP TC; modal thanh toán ▸ "Trả góp" (`PaymentMethodModal.jsx`,
 * PAYMENT_OPTION.PART) ▸ nhập 30.000đ ▸ Tiền mặt ▸ xác nhận trong iframe SDK (`18_1/tests/pos-18.js › thanhToanTienMat`).
 * Rồi đổi trả ▸ trả toàn bộ ▸ Hoàn trả. Phiếu chi đọc bằng SELECT `SPA_EXPENSES.return_order_id` (pod của điểm bán).
 * 🔴 Ghi thật: khách + đơn nợ + đơn hoàn trả.
 */

const { test, expect } = require('@playwright/test');
const { chon } = require('../../shared/db/otp');
const { boKm } = require('../../20_khach_hang_than_thiet/tests/pos-km');
const { p, sp, chanNeuTat, moDoiTra, khoiTra, hoanTra, SHOP } = require('./doi-tra');

const TRA_TRUOC = 30_000;
const phieuChi = (returnOrderId) => {
	for (const db of ['VNPOST_POD_01', 'VNPOST_POD_02', 'VNPOST_POD_03']) {
		try {
			const r = chon(`select count(*), coalesce(sum(money),0) from SPA_EXPENSES where shop_id=${SHOP()} and return_order_id=${Number(returnOrderId)}`, db);
			const [n, tong] = r.split('\t').map(Number);
			if (n > 0 || db === 'VNPOST_POD_02') return { n, tong, db };
		} catch { /* pod khác */ }
	}
	return null;
};

test('18_5_090_002 — Hoàn trả đơn nợ một phần (trả góp)', async ({ page }) => {
	chanNeuTat('18_5_090_002');
	test.setTimeout(300_000);
	await p.chanIn(page);
	const st = await p.moBan(page, test);
	const kh = await p.taoKhach(page, st);
	await p.chonKhach(page, kh.customerName);
	await p.them(page, sp().tc);
	await boKm(page);
	const tong = (await p.tongKet(page)).canThanhToan;
	const r = await p.thanhToanTienMat(page, {
		truocKhiXacNhan: async (m) => {
			await m.getByRole('button', { name: /Trả góp/ }).click();
			await page.waitForTimeout(800);
			// Đo 26/09: ô "Nhập số tiền trả góp (*)" (khác ô "Nhập số tiền khách đưa" của bảng tính nhanh).
			const oTien = m.getByText('Nhập số tiền trả góp').locator('xpath=following::input[1]');
			await expect(oTien, 'Chọn "Trả góp" mà không hiện ô "Nhập số tiền trả góp"').toBeVisible({ timeout: 5_000 });
			await oTien.fill(String(TRA_TRUOC));
			await oTien.press('Tab');
			await page.waitForTimeout(600);
		},
	});
	test.info().annotations.push({ type: 'đơn trả góp', description: `tổng ${tong} · trả trước ${TRA_TRUOC} · ${JSON.stringify(r.draft?.status)} · đơn ${r.orderNumber}` });
	expect(r.orderId, `Bán đơn trả góp lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
	await page.keyboard.press('Escape').catch(() => null);
	await moDoiTra(page, r.orderId);
	const kt = await khoiTra(page);
	const x = await hoanTra(page);
	const roId = x.body?.data?.returnOrderId;
	const chi = roId ? phieuChi(roId) : null;
	const st2 = await p.moBan(page, test);
	const don = await p.donTrongDs(page, st2, r.orderId);
	test.info().annotations.push({ type: 'đo', description: `khối "${kt.slice(0, 250)}" · "${x.tb}" · phiếu trả ${x.body?.data?.returnOrderCode} · phiếu chi ${JSON.stringify(chi)} · đơn gốc status ${don?.status}` });
	expect(x.tb).toContain('Tạo đơn hoàn trả thành công');
	expect(chi?.n, `Đơn còn nợ mà vẫn phát sinh phiếu chi (${chi?.tong}đ)`).toBe(0);
});
