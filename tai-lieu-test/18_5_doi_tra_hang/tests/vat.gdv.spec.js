'use strict';

/**
 * 18_5 nhóm 100 — hoàn trả đơn CÓ VAT (vai `gdv`).
 * Tiền đề (26/09/2026): bật VAT của ĐIỂM BÁN làn (`/shops/configs` `{ enableVat: true, vatPercent: 10 }`, cấu hình riêng điểm bán,
 * `18_4/tests/hddt-shop.js › datNhieu`) ở beforeAll, KHÔI PHỤC giá trị gốc ở afterAll. Bỏ CTKM tự áp để số tiền sạch.
 * Tiền hoàn đọc từ RESPONSE `create-return-exchange` (`data.totalRefundAmount`) + khối "Cửa hàng cần thanh toán".
 * 🔴 Ghi thật: đơn bán + đơn hoàn trả.
 */

const { test, expect } = require('@playwright/test');
const hddt = require('../../18_4_quan_ly_don_hang/tests/hddt-shop');
const { boKm } = require('../../20_khach_hang_than_thiet/tests/pos-km');
const { p, sp, chanNeuTat, moDoiTra, dongTra, khoiTra, tien, hoanTra } = require('./doi-tra');

let GOC_VAT = null;

async function banVat(page, ds) {
	await p.moBan(page, test);
	for (const ten of ds) await p.them(page, ten);
	await boKm(page);
	const t = await p.tongKet(page);
	test.skip(!(t.vat > 0), `Bật VAT điểm bán (10%) mà đơn không phát sinh VAT (${JSON.stringify(t)}) — VAT còn phụ thuộc cấu hình SP`);
	const r = await p.thanhToanTienMat(page);
	expect(r.orderId, `Bán đơn VAT lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
	await page.keyboard.press('Escape').catch(() => null);
	return { ...r, t };
}

test.describe('18_5 — Hoàn trả đơn có VAT', () => {
	test.describe.configure({ timeout: 300_000 });
	test.beforeAll(async ({ browser }) => { test.setTimeout(120_000); GOC_VAT = await hddt.datNhieu(browser, { enableVat: true, vatPercent: 10 }); });
	test.afterAll(async ({ browser }) => {
		test.setTimeout(120_000);
		if (GOC_VAT) await hddt.datNhieu(browser, { enableVat: Boolean(GOC_VAT.enableVat), vatPercent: GOC_VAT.vatPercent ?? 0 });
	});
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });
	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_5_100_001 — Hoàn trả toàn bộ đơn có VAT', async ({ page }) => {
		chanNeuTat('18_5_100_001');
		const d = await banVat(page, [sp().tc]);
		await moDoiTra(page, d.orderId);
		const kt = await khoiTra(page);
		const x = await hoanTra(page);
		const refund = Number(x.body?.data?.totalRefundAmount ?? NaN);
		const st = await p.moBan(page, test);
		const don = await p.donTrongDs(page, st, d.orderId);
		test.info().annotations.push({ type: 'đo', description: `gốc VAT ${GOC_VAT && JSON.stringify(GOC_VAT)} · đơn ${d.orderNumber} ${JSON.stringify(d.t)} · khối trả "${kt.slice(0, 250)}" · "${x.tb}" · hoàn ${refund} · trạng thái đơn gốc ${don?.status}` });
		expect(x.tb).toContain('Tạo đơn hoàn trả thành công');
		expect(refund, 'Tiền hoàn ≠ tổng đơn ĐÃ GỒM VAT').toBe(d.t.canThanhToan);
		expect(tien(kt, 'Cửa hàng cần thanh toán'), 'Khối tiền: Cửa hàng cần thanh toán ≠ tổng đơn gồm VAT').toBe(d.t.canThanhToan);
		expect(don?.status, 'Đơn gốc trả hết không về "Đã hủy"').toBe(-2);
	});

	test('18_5_100_002 — Hoàn trả một phần đơn có VAT', async ({ page }) => {
		chanNeuTat('18_5_100_002');
		const d = await banVat(page, [sp().tc, sp().fifo]); // FIFO không biến thể (BT có 2 biến thể màu — mở hộp chọn)
		await moDoiTra(page, d.orderId);
		// Chỉ trả SP TC: bỏ các dòng còn lại khỏi "Hàng khách trả lại".
		const khac = dongTra(page).filter({ hasNotText: sp().tc });
		for (let j = 0; j < 5 && (await khac.count()); j += 1) {
			await khac.first().locator('[aria-label="close"], .anticon-close').first().click();
			await page.waitForTimeout(800);
		}
		await expect(dongTra(page)).toHaveCount(1);
		const dong = p.chuan(await dongTra(page).first().innerText());
		const giaTc = Number((dong.match(/([\d.]+)\s*đ/) || [])[1]?.replace(/\./g, ''));
		const kt = await khoiTra(page);
		const x = await hoanTra(page);
		const refund = Number(x.body?.data?.totalRefundAmount ?? NaN);
		test.info().annotations.push({ type: 'đo', description: `đơn ${d.orderNumber} ${JSON.stringify(d.t)} · dòng TC "${dong}" (giá ${giaTc}) · khối "${kt.slice(0, 250)}" · "${x.tb}" · hoàn ${refund}` });
		expect(x.tb).toContain('Tạo đơn hoàn trả thành công');
		expect(giaTc, 'Không đọc được đơn giá dòng TC').toBeGreaterThan(0);
		expect(refund, 'Tiền hoàn một phần là tiền hàng TRẦN (chưa cộng VAT dòng trả)').toBe(Math.round(giaTc * 1.1));
	});
});
