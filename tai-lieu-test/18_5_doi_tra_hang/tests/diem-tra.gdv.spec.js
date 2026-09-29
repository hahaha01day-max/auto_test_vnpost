'use strict';

/**
 * 18_5 nhóm 120 — điểm tích luỹ khi TRẢ HÀNG (vai `gdv`, điểm bán seed làn).
 * Khách + thanh toán bằng điểm dùng helper 18_2 (`18_2/tests/diem.js`): khách riêng làn (sổ `18_2/test-output/khach-diem.lane<N>.json`),
 * phạm vi #14/#5 đã gồm tỉnh làn (tiền đề `tien de loyalty`), bỏ CTKM allowPoint=false trước khi bán.
 * 🔴 Ghi thật: đơn bán + đơn hoàn trả + biến động điểm của khách test.
 */

const { test, expect } = require('@playwright/test');
const D = require('../../18_2_khach_hang_va_uu_dai/tests/diem');
const { p, sp, chanNeuTat, moDoiTra, hoanTra } = require('./doi-tra');

const { ganKhach, diemKhoi, boKm } = D;

/** Điểm đọc thẳng DB (LOYALTY, chỉ SELECT) — 🚫 mở lại POS mỗi lần poll (tải chậm, lỗi "Màn bán hàng vẫn chặn"). */
const { diemKhachDb } = require('../../shared/db/otp');
async function choDiem(id, kyVong, nhan) {
	let d = null;
	await expect.poll(() => (d = diemKhachDb(id)), { timeout: 120_000, intervals: [5_000], message: nhan }).toBe(kyVong);
	return d;
}

test.describe('18_5 — Điểm khi trả hàng', () => {
	test.describe.configure({ timeout: 480_000 });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });
	test.afterEach(async ({ page }) => { await page.keyboard.press('Escape').catch(() => null); await p.donTab(page).catch(() => null); });

	test('18_5_120_001 — Thu hồi điểm đã cộng khi trả hàng', async ({ page }) => {
		chanNeuTat('18_5_120_001');
		const k = await D.khachCoDiem(page, 0);
		const d0 = diemKhachDb(k.id);
		await p.them(page, sp().tc);
		const km = await boKm(page);
		const r = await p.thanhToanTienMat(page);
		expect(r.orderId, `Bán đơn lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		await p.donTab(page).catch(() => null);
		const d1 = await choDiem(k.id, d0 + 100, 'Đơn 100.000đ không tích 100 điểm');
		await moDoiTra(page, r.orderId);
		const { tb } = await hoanTra(page);
		expect(tb).toContain('Tạo đơn hoàn trả thành công');
		await p.donTab(page).catch(() => null);
		let d2 = null;
		try { d2 = await choDiem(k.id, d0, 'Trả hết hàng mà điểm đã cộng không bị thu hồi'); } finally {
			test.info().annotations.push({ type: 'điểm', description: `đơn ${r.orderId} (${km}) · trước ${d0} · sau bán ${d1} · sau trả ${d2 ?? diemKhachDb(k.id)}` });
		}
	});

	test('18_5_120_002 — Hoàn lại điểm khách đã dùng khi trả hàng', async ({ page }) => {
		chanNeuTat('18_5_120_002');
		const k = await D.khachCoDiem(page, 300);
		const d0 = diemKhachDb(k.id);
		await p.them(page, sp().tc);
		await boKm(page);
		const { body, conLai } = await D.thanhToanDiemTienMat(page, k, 200);
		expect(String(body?.status?.code), `Thanh toán điểm + tiền mặt lỗi: ${body?.status?.message}`).toBe('200');
		const orderId = body?.data?.orderId;
		await page.waitForTimeout(3_000);
		await p.donTab(page).catch(() => null);
		// Sau bán: −200 đổi + điểm tích trên đơn (#14 tích cả đơn trả bằng điểm — đo ở 18_2_050_001: +100 cho đơn 100.000đ).
		const d1 = diemKhachDb(k.id);
		await moDoiTra(page, orderId);
		const t = D.chuan(await page.locator('body').innerText());
		const { tb, req } = await hoanTra(page);
		test.info().annotations.push({ type: 'đo', description: `đơn ${orderId} · tiền mặt ${conLai} · điểm trước ${d0} · sau bán ${d1} · "${tb}" · req totalAmount ${req?.returnOrder?.totalAmount} refundMethod ${req?.returnOrder?.refundMethod} · khối "${t.slice(t.indexOf('Trả hàng'), t.indexOf('Trả hàng') + 300)}"` });
		expect(tb).toContain('Tạo đơn hoàn trả thành công');
		expect(Number(req?.returnOrder?.totalAmount), 'Phiếu chi hoàn trả ≠ phần khách trả bằng TIỀN').toBe(conLai);
		await p.donTab(page).catch(() => null);
		// Kỳ vọng: cộng trả 200 điểm đã dùng + thu hồi điểm đã tích trên đơn ⇒ về lại d0.
		let d2 = null;
		try { d2 = await choDiem(k.id, d0, 'Trả hết đơn có trả bằng điểm mà điểm không về như trước khi mua'); } finally {
			test.info().annotations.push({ type: 'điểm', description: `trước ${d0} · sau bán ${d1} · sau trả ${d2 ?? diemKhachDb(k.id)}` });
		}
	});
});
