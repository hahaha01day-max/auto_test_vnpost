'use strict';

/**
 * 02_040_004 — Thẻ "Công nợ nhân viên" ở chi tiết nhân viên hiển thị phiếu nợ phát sinh trong ca (vai `tct`).
 *
 * Trace vnpost-web f9c5c858 (28/09/2026): `pages/employee/employeeDetail/index.jsx:163` (thẻ key `debt`) →
 * `pages/employee/employeeDebt/EmployeeDebt.jsx` (`useGetEmployeeDebtQuery` = `GET …/employee/get-debt-detail`; cột Ngày tạo ·
 * Mã phiếu · Khách hàng · Phân loại (ORDER_DEBT = "Phiếu nợ đơn hàng") · Tổng tiền phát sinh · Đã thanh toán · Còn nợ · Trạng thái).
 * Tiền đề TỰ DỰNG: phiên phụ `gdv` (GDV điểm bán làn) bán 1 đơn "Thanh toán sau" có gắn khách mới
 * (khuôn `18_4/tests/dh.js taoDon('no')`). 🔴 Chỉ kiểm thẻ hiển thị đúng dữ liệu của nhân viên đang xem;
 * công thức nợ thuộc `24_cong_no_nhan_vien`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { storageStateFor } = require('../../shared/auth/accounts');
const seed = require('../../00_seed/seed-state');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const { chuan, moChiTiet, moDanhSach, moThe } = require('./employee-page');

const GOC = path.join(__dirname, '..');
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const so = (s) => Number(chuan(String(s ?? '')).replace(/[^\d]/g, '') || 0);

test('02_040_004 — Thẻ Công nợ nhân viên hiển thị phiếu nợ phát sinh trong ca', async ({ page, browser }) => {
	const i = loadCaseInput(GOC, '02_040_004');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(300_000);
	const maNv = `${seed.PREFIX}GDV`;

	// Tiền đề: GDV bán một đơn ghi nợ khách.
	const ctx = await browser.newContext({ storageState: storageStateFor('gdv'), viewport: { width: 1440, height: 1000 } });
	const g = await ctx.newPage();
	let don;
	try {
		const st = await p.moBan(g, test);
		const kh = await p.taoKhach(g, st);
		await p.chonKhach(g, kh.customerName);
		await p.them(g, p.sp().tc);
		const r = await p.thanhToanTienMat(g, { truocKhiXacNhan: (m) => m.getByRole('button', { name: 'Thanh toán sau', exact: true }).click() });
		expect(r.orderId, `Tiền đề: bán ghi nợ lỗi ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		const ct = await p.donTrongDs(g, st, r.orderId);
		don = { orderId: r.orderId, ma: r.orderNumber, khach: kh.customerName, tong: Number(ct?.totalAmount ?? ct?.totalPrice ?? 0), no: Number(ct?.debtAmount ?? ct?.remainAmount ?? 0) };
	} finally { await ctx.close(); }
	ghiChu('tiền đề', `NV ${maNv} bán ghi nợ đơn ${don.ma} #${don.orderId} · khách ${don.khach} · tổng ${don.tong} · nợ ${don.no}`);

	// Bước 1: TCT mở chi tiết nhân viên → thẻ "Công nợ nhân viên".
	await moDanhSach(page, 'tct');
	expect(await moChiTiet(page, maNv), `Không tìm thấy nhân viên ${maNv} trong danh sách`).toBeTruthy();
	await expect(page.locator('.ant-tabs-tab', { hasText: 'Công nợ nhân viên' })).toBeVisible({ timeout: 30_000 });
	const cho = page.waitForResponse((r) => /employee\/get-debt-detail/.test(r.url()), { timeout: 30_000 }).catch(() => null);
	const pane = await moThe(page, 'Công nợ nhân viên');
	const res = await cho;
	await page.waitForTimeout(2_000);
	ghiChu('API', `${res ? res.url().split('__api')[1] : '(không có request get-debt-detail)'} → ${res ? JSON.stringify((await res.json().catch(() => null))?.status) : ''}`);

	// Bước 2: danh sách có phiếu nợ của đơn vừa bán, đủ mã, khách, số tiền nợ.
	// 🔴 Giữ cả ô tiêu đề TRỐNG (cột mở rộng dòng) — lọc đi là lệch chỉ số với ô dữ liệu.
	const cot = (await pane.locator('.ant-table-thead tr').last().locator('th').allInnerTexts()).map(chuan);
	const dong = pane.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: don.khach });
	await expect(dong.first(), `Thẻ Công nợ nhân viên không có dòng nợ của khách ${don.khach} (đơn ${don.ma})`).toBeVisible({ timeout: 20_000 });
	const o = (await dong.first().locator('td').allInnerTexts()).map(chuan);
	const lay = (ten) => o[cot.indexOf(ten)];
	ghiChu('đo', `cột ${JSON.stringify(cot)} · dòng ${JSON.stringify(o)}`);
	for (const c of ['Mã phiếu', 'Khách hàng', 'Còn nợ']) expect(cot, `Thẻ thiếu cột "${c}"`).toContain(c);
	expect(lay('Mã phiếu'), 'Mã phiếu nợ không phải mã đơn vừa bán').toBe(don.ma);
	expect(lay('Khách hàng')).toBe(chuan(don.khach));
	expect(lay('Phân loại'), 'Dòng không phải phiếu nợ đơn hàng').toBe('Phiếu nợ đơn hàng');
	expect(so(lay('Còn nợ')), 'Số tiền nợ trên thẻ không khớp số tiền đơn còn nợ').toBe(don.no || don.tong);
});
