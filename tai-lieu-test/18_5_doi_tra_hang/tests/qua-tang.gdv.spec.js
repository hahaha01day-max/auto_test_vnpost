'use strict';

/**
 * 18_5 — đổi trả đơn có QUÀ TẶNG (vai `gdv`).
 *
 * Tiền đề: CTKM quà tặng của làn (`18_1/tests/ctkm-qua.js`) — BẬT ở beforeAll, DỪNG ở afterAll. Case có quà chạy với CẢ HAI
 * loại (`LOAI`: quà theo đơn · quà theo sản phẩm); 040_001 (đơn KHÔNG quà) chạy một lần ở loại đầu.
 * Trace 26/09/2026: bảng hàng trả `ReturnProductsTable_v2.jsx` — dòng quà có Tag "Quà tặng", ô SL `disabled` + tooltip
 * "Quà tặng bắt buộc hoàn trả nên không được thay đổi số lượng"; bấm "Hoàn trả" với đơn có quà còn hiệu lực ⇒
 * `ModalGiftReturn.jsx` (bảng Quà tặng · Số lượng · Đơn vị · Giá bán; mỗi dòng chọn "Thu hồi quà tặng" /
 * "Khấu trừ giá trị quà tặng"; chân "Bỏ qua" · nút chính).
 * 🔴 Ghi thật: bán đơn + đơn hoàn trả.
 */

const { test, expect } = require('@playwright/test');
const ctkm = require('../../18_1_ban_hang_tai_quay/tests/ctkm-qua');
const { boKm } = require('../../20_khach_hang_than_thiet/tests/pos-km');
const { p, chuan, sp, chanNeuTat, moDoiTra, dongTra, khoiTra, tien, hoanTra, tbSau } = require('./doi-tra');

/** Bán 1 × SP TC; `k` = CTKM quà (null ⇒ bỏ mọi CTKM trước khi thanh toán — đơn không quà). */
async function banDon(page, k) {
	await p.moBan(page, test);
	await p.them(page, sp().tc);
	if (k) await expect(page.locator('tr.promotion-product-row').filter({ hasText: k.qua.ten }).first(), `Đơn không có dòng quà "${k.qua.ten}" (${k.loai})`).toBeVisible({ timeout: 15_000 });
	else test.info().annotations.push({ type: 'CTKM', description: await boKm(page) });
	const r = await p.thanhToanTienMat(page);
	expect(r.orderId, `Bán đơn lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
	await page.keyboard.press('Escape').catch(() => null);
	return r;
}
const hopQua = (page) => page.getByRole('dialog').filter({ hasText: 'Thu hồi quà tặng' }).last();

for (const L of ctkm.LOAI) test.describe(`18_5 — Đổi trả đơn có quà tặng (${L.nhan})`, () => {
	let KM = null;
	test.describe.configure({ timeout: 300_000 });
	test.beforeAll(async ({ browser }) => { test.setTimeout(120_000); KM = await ctkm.bat(browser, L.ma); });
	test.afterAll(async ({ browser }) => { test.setTimeout(120_000); await ctkm.tat(browser, KM?.campaignId); });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });
	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test(`18_5_020_004 — Quà tặng bắt buộc hoàn trả không sửa được số lượng [${L.ma}]`, async ({ page }) => {
		chanNeuTat('18_5_020_004');
		const r = await banDon(page, KM);
		await moDoiTra(page, r.orderId);
		// Màn xử lý quà tự mở khi vào đổi trả ⇒ đóng (Escape) để thao tác bảng hàng trả bên dưới.
		const hq = hopQua(page);
		if (await hq.isVisible({ timeout: 5_000 }).catch(() => false)) { await page.keyboard.press('Escape'); await expect(hq).toBeHidden({ timeout: 5_000 }).catch(() => null); }
		const dq = dongTra(page).filter({ hasText: 'Quà tặng' }).first();
		await expect(dq, 'Bảng "Hàng khách trả lại" không có dòng quà tặng').toBeVisible({ timeout: 20_000 });
		const o = dq.locator('.return-quantity-input input, input').first();
		const khoa = await o.isDisabled();
		await dq.locator('.return-quantity-input').first().hover({ force: true });
		const tip = page.locator('.ant-tooltip:not(.ant-tooltip-hidden)').last();
		await tip.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => null);
		const tb = chuan(await tip.innerText().catch(() => ''));
		test.info().annotations.push({ type: 'đo', description: `${L.nhan} · đơn ${r.orderNumber} · dòng quà "${chuan(await dq.innerText())}" · ô SL disabled=${khoa} · tooltip "${tb}"` });
		expect(khoa, 'Ô số lượng quà tặng sửa được').toBe(true);
		expect(tb).toBe('Quà tặng bắt buộc hoàn trả nên không được thay đổi số lượng');
	});

	test(`18_5_040_001 — Màn xử lý quà tặng chỉ mở khi cần [${L.ma}]`, async ({ page }) => {
		chanNeuTat('18_5_040_001');
		test.skip(L !== ctkm.LOAI[0], 'Đơn KHÔNG quà — không phụ thuộc loại quà, đã chạy ở loại đầu');
		const r = await banDon(page, null);
		await moDoiTra(page, r.orderId);
		const { tb } = await hoanTra(page);
		const moHop = await hopQua(page).isVisible().catch(() => false);
		test.info().annotations.push({ type: 'đo', description: `đơn không quà ${r.orderNumber} · hộp quà tặng mở: ${moHop} · "${tb}"` });
		expect(moHop, 'Đơn không có quà mà vẫn mở màn xử lý quà tặng').toBe(false);
		expect(tb).toContain('Tạo đơn hoàn trả thành công');
	});

	test(`18_5_040_002 — Hai cách xử lý quà tặng cho kết quả tiền khác nhau [${L.ma}]`, async ({ page }) => {
		chanNeuTat('18_5_040_002');
		// Đo 26/09: đơn có quà ⇒ `ModalGiftReturn` TỰ MỞ khi vào đổi trả; "Xác nhận" trong hộp chỉ CHỐT lựa chọn rồi đóng —
		// vẫn phải bấm "Hoàn trả". Mỗi cách xử lý chạy trên MỘT đơn riêng.
		const soTien = async () => {
			const t = await khoiTra(page).catch(async () => p.chuan(await page.locator('body').innerText()));
			return { t, chTra: tien(t, 'Cửa hàng cần thanh toán'), khTra: tien(t, 'Khách cần thanh toán'), khauTru: tien(t, 'Khấu trừ quà tặng'), tongTra: tien(t, 'Tổng tiền trả') };
		};
		const chon = async (nhan) => {
			const hop = hopQua(page);
			if (!(await hop.isVisible({ timeout: 5_000 }).catch(() => false))) await page.getByRole('button', { name: 'Hoàn trả', exact: true }).click();
			await expect(hop, 'Đơn có quà còn hiệu lực mà không mở màn xử lý quà tặng').toBeVisible({ timeout: 20_000 });
			await hop.getByText(nhan, { exact: true }).last().click();
			await hop.getByRole('button', { name: 'Xác nhận', exact: true }).click();
			await expect(hop).toBeHidden({ timeout: 10_000 });
			await page.waitForTimeout(1_000);
			return soTien();
		};

		// (1) THU HỒI quà: tiền hoàn giữ nguyên = tiền hàng trả.
		const r1 = await banDon(page, KM);
		await moDoiTra(page, r1.orderId);
		const a = await chon('Thu hồi quà tặng');
		const x = await hoanTra(page);
		const refund = Number(x.body?.data?.totalRefundAmount ?? NaN);
		test.info().annotations.push({ type: 'thu hồi', description: `${L.nhan} · đơn ${r1.orderNumber} · khối ${JSON.stringify({ ...a, t: a.t.slice(0, 250) })} · "${x.tb}" · hoàn (req) ${refund}` });
		expect(x.tb, `Chốt thu hồi quà không tạo được đơn hoàn: ${x.tb}`).toContain('Tạo đơn hoàn trả thành công');
		expect(refund, 'Thu hồi quà: tiền hoàn không giữ nguyên bằng tiền hàng trả').toBe(a.tongTra);
		expect(a.khauTru ?? 0, 'Thu hồi quà mà khối tiền vẫn có "Khấu trừ quà tặng"').toBe(0);
		await p.donTab(page).catch(() => null);

		// (2) KHẤU TRỪ giá trị quà: khối tiền giảm đúng giá quà (âm ⇒ đảo chiều sang "Khách cần thanh toán").
		const r2 = await banDon(page, KM);
		await moDoiTra(page, r2.orderId);
		const b = await chon('Khấu trừ giá trị quà tặng');
		const net = b.chTra ?? (b.khTra != null ? -b.khTra : null);
		test.info().annotations.push({ type: 'khấu trừ', description: `${L.nhan} · đơn ${r2.orderNumber} · khối ${JSON.stringify({ ...b, t: b.t.slice(0, 300) })} · net ${net}` });
		expect(b.khauTru, 'Khấu trừ quà: khối tiền không hiện "Khấu trừ quà tặng"').toBeGreaterThan(0);
		expect(net, 'Khấu trừ quà: số tiền còn lại ≠ tiền trả − giá quà').toBe(b.tongTra - b.khauTru);
		expect(net, 'Hai cách xử lý cho CÙNG một kết quả tiền').not.toBe(refund);
	});
});
