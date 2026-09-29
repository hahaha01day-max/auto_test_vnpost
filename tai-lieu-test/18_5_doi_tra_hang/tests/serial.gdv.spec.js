'use strict';

/**
 * 18_5 nhóm 140 — chặn BE khi hoàn trả hàng quản lý SERIAL (vai `gdv`, SP đích danh `AUTO<làn>_SP_DD`).
 *
 * Trace 26/09/2026 (`ReturnOrderServiceImpl` ~dòng 6730–6760, `resolveSpecificIdentificationTrace`): serial dùng để truy
 * vết lấy từ DÒNG ĐƠN GỐC (`ShopOrderDetailEntity.serials`), KHÔNG từ request hoàn trả:
 * - SL hoàn lẻ ⇒ "Số lượng hoàn theo serial phải là số nguyên";
 * - số serial của dòng gốc < SL hoàn ⇒ "Không đủ serial để hoàn" — dựng bằng cách BÁN 2 cái nhưng chỉ chọn 1 serial
 *   (POS cho phép SL ≥ số serial, xem 18_1_040_015);
 * - serial gốc không còn trong kho ⇒ "Không tìm thấy serial: <sr>" — request không mang serial nên "nhập serial không
 *   tồn tại" (kịch bản) không đi được qua giao diện; case gửi thêm serial giả vào request để ghi nhận BE có đọc hay không.
 * Request hoàn: `**\/create-return-exchange**` (sửa bằng `page.route`, khuôn 18_5_140_006).
 * 🔴 Ghi thật: đơn bán SP DD (trừ serial) + có thể đơn hoàn trả.
 */

const { test, expect } = require('@playwright/test');
const { p, chuan, sp, chanNeuTat, dongTra, hoanTra } = require('./doi-tra');
const seed = require('../../00_seed/seed-state');

const BASE = () => process.env.VNPOST_BASE_URL;
const SHOP = () => seed.doc().duLieu.diemBan.shopId;
const hopSp = (page) => page.getByRole('dialog').last();
const hang = (m, nhan) => m.locator('tr').filter({ has: m.page().locator(`td:text-is("${nhan}")`) }).first();

/** Bán `sl` × SP DD, chọn `soSerial` serial ⇒ { orderId, orderNumber, serials[] }. */
async function banDd(page, { sl, soSerial }) {
	await p.moBan(page, test);
	await p.oTim(page).fill(sp().dd);
	const dd = page.locator('.order-search-product:not(.ant-select-dropdown-hidden)').last();
	await dd.locator('.ant-select-item-option').filter({ hasText: sp().dd }).first().click();
	const m = hopSp(page);
	await expect(m, 'Thêm SP serial mà không mở màn chọn').toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(1_000);
	const oSl = hang(m, 'Số lượng').locator('input').first();
	await oSl.fill(String(sl));
	await oSl.blur();
	const oSerial = m.locator('.ant-select-multiple').first(); // 🔴 chọn xong mất placeholder "Chọn Serial" ⇒ không lọc theo chữ
	await oSerial.click();
	const ds = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
	await expect(ds.first(), 'Không còn serial DD để bán').toBeVisible({ timeout: 15_000 });
	const serials = [];
	for (let i = 0; i < soSerial; i += 1) { serials.push(chuan(await ds.nth(i).innerText())); await ds.nth(i).click(); }
	await page.keyboard.press('Escape');
	const n = page.locator('.ant-message-notice');
	await m.getByRole('button', { name: /Thêm vào đơn hàng|Cập nhật/ }).click();
	const vao = await p.dongBill(page).filter({ hasText: sp().dd }).first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false);
	if (!vao) {
		const tb = chuan((await n.allInnerTexts()).join(' | '));
		const loi = chuan((await m.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).join(' | '));
		test.info().annotations.push({ type: 'không thêm được dòng DD', description: `SL ${sl} · ${soSerial} serial · "${tb}" · ${loi}` });
		test.skip(true, `POS không cho thêm ${sl} × SP serial với ${soSerial} serial ("${tb || loi}") ⇒ không dựng được đơn gốc thiếu serial qua giao diện`);
	}
	const r = await p.thanhToanTienMat(page);
	expect(r.orderId, `Bán SP DD lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
	await page.keyboard.press('Escape').catch(() => null);
	return { ...r, serials };
}

/** Mở màn đổi trả đơn DD (khuôn `doi-tra.js › moDoiTra`, chờ dòng DD thay vì TC). */
async function moDoiTraDd(page, orderId) {
	await page.waitForTimeout(2_000);
	await p.moTrang(page, `${BASE()}/order/created-orders/detail/${orderId}/${SHOP()}`, p.VAI);
	await expect(page.getByText('Doanh thu', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
	await expect(page.getByText(sp().dd, { exact: true }).first()).toBeVisible({ timeout: 30_000 }).catch(() => null);
	await page.waitForTimeout(2_000);
	await page.getByRole('button', { name: /Đổi trả hàng/ }).click();
	await expect(page.getByText('Hàng khách trả lại')).toBeVisible({ timeout: 30_000 });
	await expect(dongTra(page).filter({ hasText: sp().dd }).first(), 'Màn đổi trả không nạp dòng DD').toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(1_000);
}

/** Sửa request hoàn trả (item DD) trước khi gửi. */
async function suaRequest(page, sua) {
	await page.route('**/create-return-exchange**', async (route) => {
		const b = route.request().postDataJSON();
		for (const it of b?.returnOrder?.items || []) sua(it);
		await route.continue({ postData: JSON.stringify(b) });
	});
}
const loiBe = (x) => chuan(x.body?.status?.message || x.tb).replace(/\s*\([A-Za-z0-9]{6}\)$/, '');

test.describe('18_5 — Chặn BE khi hoàn trả hàng serial', () => {
	test.describe.configure({ timeout: 300_000 });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });
	test.afterEach(async ({ page }) => {
		await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => null);
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_5_140_003 — Chặn khi không đủ serial để hoàn', async ({ page }) => {
		chanNeuTat('18_5_140_003');
		const d = await banDd(page, { sl: 2, soSerial: 1 });
		await moDoiTraDd(page, d.orderId);
		const x = await hoanTra(page); // trả đủ 2 cái của dòng gốc chỉ mang 1 serial
		test.info().annotations.push({ type: 'đo', description: `đơn ${d.orderNumber} (2 cái, serial ${d.serials.join(',')}) · SL hoàn ${JSON.stringify((x.req?.returnOrder?.items || []).map((i) => i.quantity))} · "${x.tb}" · ${JSON.stringify(x.body?.status)}` });
		expect(loiBe(x), 'Dòng gốc 1 serial mà hoàn được 2 cái').toBe('Không đủ serial để hoàn');
	});

	test('18_5_140_004 — Chặn số lượng hoàn theo serial không phải số nguyên', async ({ page }) => {
		chanNeuTat('18_5_140_004');
		const d = await banDd(page, { sl: 1, soSerial: 1 });
		await moDoiTraDd(page, d.orderId);
		await suaRequest(page, (it) => { it.quantity = 0.5; });
		const x = await hoanTra(page);
		test.info().annotations.push({ type: 'đo', description: `đơn ${d.orderNumber} · request SL 0.5 · "${x.tb}" · ${JSON.stringify(x.body?.status)}` });
		expect(loiBe(x)).toBe('Số lượng hoàn theo serial phải là số nguyên');
	});

	test('18_5_140_005 — Chặn khi serial nhập không tồn tại', async ({ page }) => {
		chanNeuTat('18_5_140_005');
		const d = await banDd(page, { sl: 1, soSerial: 1 });
		await moDoiTraDd(page, d.orderId);
		const gia = `KHONGTONTAI${Date.now().toString().slice(-5)}`;
		await suaRequest(page, (it) => { it.serials = [gia]; it.serial = gia; });
		const x = await hoanTra(page);
		test.info().annotations.push({ type: 'hành vi thật', description: `đơn ${d.orderNumber} (serial gốc ${d.serials}) · gửi serial giả ${gia} · "${x.tb}" · ${JSON.stringify(x.body?.status)} · item ${JSON.stringify(x.req?.returnOrder?.items?.[0] || {}).slice(0, 400)}` });
		expect(loiBe(x), 'BE bỏ qua serial nhập trong request (truy vết serial từ đơn gốc) — không chặn serial không tồn tại').toBe(`Không tìm thấy serial: ${gia}`);
	});
});
