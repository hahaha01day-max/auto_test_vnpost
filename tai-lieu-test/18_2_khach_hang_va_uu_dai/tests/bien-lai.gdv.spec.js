'use strict';

/**
 * 18_2 — biên lai sau thanh toán + huỷ đơn có coupon (vai `gdv`, điểm bán seed làn).
 *
 * Đọc biên lai (vnpost-web 26/09/2026): nút in (`ButtonOrderPrint`) giữ sẵn bản biên lai ẨN `.print-component`
 * (PrintComponent → InvoiceContent_v2) — đọc ở CHI TIẾT ĐƠN: modal in sau thanh toán (`.modal-navigate-in-order`) bị
 * đóng ngay khi POS dọn tab. `textContent` của bản ẩn = đúng nội dung sẽ in; QR = `canvas`/`svg` bên trong.
 * `window.print` chặn bằng `chanIn`.
 * Coupon lấy từ sổ `test-output/coupon.lane<N>.json` (tiền đề `tien de coupon`), bỏ mã đã dùng.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, sp } = p;
const SO = path.join(GOC, 'test-output', `coupon.lane${process.env.VNPOST_LANE || 'x'}.json`);

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const doc = () => { try { return JSON.parse(fs.readFileSync(SO, 'utf8')); } catch { return null; } };
function maMoi(i) {
	const d = doc();
	test.skip(!d?.codes?.length, 'Chưa có đợt coupon cho làn — chạy tiền đề `tien de coupon` (tài khoản gốc)');
	const daDung = new Set(d.daDung || []);
	const con = d.codes.filter((c) => !daDung.has(c));
	test.skip(!con.length, 'Đợt coupon đã dùng hết mã — chạy lại tiền đề `tien de coupon`');
	return con[(con.length - 1 - i + con.length) % con.length]; // lấy từ CUỐI sổ, tránh đụng chỉ số của coupon-ghi
}
function danhDauDaDung(c) {
	const d = doc();
	d.daDung = [...new Set([...(d.daDung || []), c])];
	fs.writeFileSync(SO, JSON.stringify(d, null, 1));
}
async function apMa(page, code) {
	const cho = page.waitForResponse((r) => r.url().includes('/coupon/validate'), { timeout: 15_000 });
	await page.getByPlaceholder(/Quét mã vạch hoặc nhập mã/).fill(code);
	await page.getByRole('button', { name: 'Áp dụng' }).click();
	return (await (await cho).json().catch(() => null));
}

/**
 * Nội dung biên lai của đơn: bản ẩn `.print-component` của nút in lại ở CHI TIẾT ĐƠN (`OrderDetail.jsx › ButtonOrderPrint`).
 * 🔴 Đo 26/09: modal in sau thanh toán (`.modal-navigate-in-order`) bị đóng ngay khi POS dọn tab ⇒ không đọc được ở POS.
 */
async function bienLai(page, orderId) {
	const shopId = require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId;
	await page.keyboard.press('Escape').catch(() => null);
	await page.waitForTimeout(2_000);
	await p.moTrang(page, `${process.env.VNPOST_BASE_URL}/order/created-orders/detail/${orderId}/${shopId}`, p.VAI);
	const bl = page.locator('.print-component').first();
	await expect(bl, 'Chi tiết đơn không có bản biên lai (nút in)').toBeAttached({ timeout: 30_000 });
	await expect.poll(async () => chuan(await bl.textContent()).length, { timeout: 30_000 }).toBeGreaterThan(50);
	await page.waitForTimeout(2_000); // QR hoá đơn dựng bất đồng bộ
	return {
		text: chuan(await bl.textContent()),
		qr: await bl.locator('canvas, svg, .ant-qrcode').count(),
	};
}

test.describe('18_2 — Biên lai & huỷ đơn có coupon', () => {
	test.describe.configure({ timeout: 300_000 });

	test.beforeEach(async ({ page }) => {
		await p.chanIn(page);
		await p.moBan(page, test);
		await p.them(page, sp().tc);
		await page.mouse.move(600, 700);
	});
	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_2_030_017 — Coupon in riêng một dòng trên biên lai', async ({ page }) => {
		chanNeuTat('18_2_030_017');
		const c = maMoi(0);
		const v = await apMa(page, c);
		expect(String(v?.status?.code), `Validate coupon lỗi: ${JSON.stringify(v?.status)}`).toBe('200');
		const r = await p.thanhToanTienMat(page);
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		danhDauDaDung(c);
		const { text } = await bienLai(page, r.orderId);
		test.info().annotations.push({ type: 'biên lai', description: `đơn ${r.orderNumber} · ${text.slice(0, 900)}` });
		expect(text, 'Biên lai không có dòng coupon kèm mã').toContain(c);
		expect(text).toMatch(/Mã coupon/i);
	});

	test('18_2_040_020 — 🔴 Tích ô xuất HĐĐT mà không nhập thông tin thì biên lai in kèm mã QR', async ({ page }) => {
		chanNeuTat('18_2_040_020');
		const cb = page.getByRole('checkbox', { name: 'Xuất hoá đơn điện tử' });
		test.skip(!(await cb.count()), 'Điểm bán không có ô "Xuất hoá đơn điện tử" (chưa bật HĐĐT)');
		if (!(await cb.isChecked())) await cb.check();
		// Đo 26/09: tích ô ⇒ drawer "Thông tin xuất hoá đơn" tự mở, che nút Thanh toán. Đóng bằng X, KHÔNG nhập gì.
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thông tin xuất hoá đơn' }).last();
		if (await dr.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await dr.locator('.ant-drawer-close').click();
			await expect(dr).toBeHidden({ timeout: 10_000 });
		}
		const conTich = await cb.isChecked();
		test.info().annotations.push({ type: 'ô HĐĐT sau khi đóng form trống', description: `còn tích: ${conTich}` });
		expect(conTich, 'Đóng form thông tin HĐĐT (bỏ trống) thì ô "Xuất hoá đơn điện tử" tự bỏ tích — không dựng được trạng thái "tích mà không nhập"').toBe(true);
		const cho = page.waitForResponse((r) => /draft-checkout/.test(r.url()) && r.request().method() === 'POST', { timeout: 60_000 });
		const r = await p.thanhToanTienMat(page);
		const req = (await cho.catch(() => null))?.request().postDataJSON?.() ?? null;
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		const { text, qr } = await bienLai(page, r.orderId);
		test.info().annotations.push({ type: 'đo', description: `đơn ${r.orderNumber} · QR ${qr} · customerTakeInvoice req=${JSON.stringify(req?.customerTakeInvoice)} · ${text.slice(0, 600)}` });
		expect(qr, '🔴 Biên lai KHÔNG có mã QR để khách tự điền thông tin HĐĐT').toBeGreaterThan(0);
	});

	test('18_2_030_016 — 🔴 Huỷ đơn sau khi đã dùng coupon', async ({ page }) => {
		chanNeuTat('18_2_030_016');
		const c = maMoi(1);
		const v = await apMa(page, c);
		expect(String(v?.status?.code), `Validate coupon lỗi: ${JSON.stringify(v?.status)}`).toBe('200');
		const r = await p.thanhToanTienMat(page);
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		danhDauDaDung(c);
		await page.keyboard.press('Escape').catch(() => null);
		const shopId = require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId;
		await page.waitForTimeout(2_000);
		await p.moTrang(page, `${process.env.VNPOST_BASE_URL}/order/created-orders/detail/${r.orderId}/${shopId}`, p.VAI);
		await expect(page.getByText('Doanh thu', { exact: true }).first(), 'Chi tiết đơn không mở').toBeVisible({ timeout: 30_000 });
		const nut = page.getByRole('button', { name: /Hủy đơn|Huỷ đơn/ });
		const co = await nut.count();
		test.info().annotations.push({ type: 'hành vi thật', description: `đơn ${r.orderNumber} (coupon ${c}) · nút huỷ đơn ở chi tiết: ${co}` });
		// Đo 26/09: nút "Hủy đơn hàng" ở chi tiết đơn TẠM ẨN theo yêu cầu nghiệp vụ (OrderDetail.jsx) — cùng chặn với 18_5_090_004.
		expect(co, 'Không có nút "Hủy đơn hàng" ở chi tiết đơn đã thanh toán ⇒ không huỷ được đơn có coupon qua giao diện').toBeGreaterThan(0);
		await nut.first().click();
		const dlg = page.getByRole('dialog').last();
		await dlg.locator('textarea').fill('Auto test 18_2_030_016').catch(() => null);
		await dlg.getByRole('button', { name: /Xác nhận|Đồng ý|OK/ }).click();
		await page.waitForTimeout(2_000);
		await p.moBan(page, test);
		await p.them(page, sp().tc);
		const lai = await apMa(page, c);
		test.info().annotations.push({ type: 'ghi nhận', description: `áp lại mã sau huỷ: ${JSON.stringify(lai?.status)}` });
	});
});
