'use strict';

/**
 * 18_5 — đổi trả hàng từ đơn đã thanh toán (vai `gdv`, điểm bán seed làn).
 *
 * Đo DOM 25/09/2026 (vnpost-web 8ac2c516): chi tiết đơn → "Đổi trả hàng" ⇒ màn bán hàng mở tab
 * "Hoàn trả: <mã đơn gốc>" gồm bảng "Hàng khách trả lại" (Tên sản phẩm · Giá bán · Số lượng "x / đã bán" ·
 * Đơn vị · Tổng tiền · Thao tác), bảng hàng đổi (giỏ thường), khối "Trả hàng": Tổng tiền hàng gốc ·
 * Chiết khấu khuyến mãi · Tổng tiền hàng trả lại · Phí trả hàng · Lý do trả hàng · Xuất hóa đơn điều
 * chỉnh · In hóa đơn hoàn trả · Tổng tiền trả · Cửa hàng cần thanh toán · Phương thức hoàn trả
 * (Tiền mặt/Chuyển khoản) · nút "Hoàn trả". Danh sách đơn hoàn trả `/order/return-orders`.
 *
 * 🔴 Ghi thật: tạo đơn + đơn hoàn trả + nhập lại kho ở điểm bán seed (được phép theo bàn giao).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { GOC, BASE, SHOP, p, chuan, sp, so, chanNeuTat, boMa, tbSau, banDon, moDoiTra, bangTra, dongTra, khoiTra, tien, hoanTra } = require('./doi-tra');

test.describe('18_5 — Đổi trả hàng', () => {
	test.describe.configure({ timeout: 300_000 });

	test.beforeEach(async ({ page }) => {
		await p.chanIn(page);
	});

	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_5_010_001 — Mở đổi trả từ chi tiết đơn gốc nạp sẵn đơn', async ({ page }) => {
		chanNeuTat('18_5_010_001');
		const d = await banDon(page);
		await moDoiTra(page, d.orderId);
		await expect(p.tabs(page).filter({ hasText: /^Hoàn trả:/ })).toHaveCount(1);
		const tab = chuan(await p.tabs(page).filter({ hasText: /^Hoàn trả:/ }).innerText());
		test.info().annotations.push({ type: 'tab', description: tab });
		if (d.orderNumber) expect(tab).toContain(d.orderNumber);
		await expect(dongTra(page).filter({ hasText: sp().tc })).toHaveCount(1);
	});

	test('18_5_020_001 — Số lượng trả không vượt số đã bán trên đơn gốc', async ({ page }) => {
		chanNeuTat('18_5_020_001');
		const d = await banDon(page, { sl: 2 });
		await moDoiTra(page, d.orderId);
		const o = dongTra(page).first().locator('input').first();
		await o.fill('5');
		await o.press('Enter');
		await page.waitForTimeout(800);
		expect(Number(await o.inputValue()), 'Số lượng trả vượt số đã bán (2)').toBeLessThanOrEqual(2);
	});

	test('18_5_020_002 — Chặn hoàn trả khi bỏ hết hàng khỏi bảng', async ({ page }) => {
		chanNeuTat('18_5_020_002');
		const d = await banDon(page);
		await moDoiTra(page, d.orderId);
		await dongTra(page).first().locator('button, [aria-label="delete"], [aria-label="close"]').last().click();
		await page.locator('.ant-modal-confirm .ant-btn-primary, .ant-popover:visible .ant-btn-primary').first().click({ timeout: 3_000 }).catch(() => null);
		// Dòng bỏ ra chuyển sang bảng "Hàng khách giữ lại"; bảng trả về rỗng ⇒ Tổng tiền hàng trả lại 0 đ.
		await expect(page.getByText(/Tổng tiền hàng trả lại\s*:?\s*0 đ/)).toBeVisible();
		const { tb } = await hoanTra(page);
		expect(tb).toContain('Đơn trả hàng cần có ít nhất một sản phẩm trả');
	});

	test('18_5_020_003 — Chỉ thêm được mặt hàng có trong đơn gốc', async ({ page }) => {
		chanNeuTat('18_5_020_003');
		const d = await banDon(page);
		await moDoiTra(page, d.orderId);
		const o = page.getByPlaceholder('Tìm kiếm sản phẩm trả');
		await expect(o, 'Không có ô "Tìm kiếm sản phẩm trả"').toBeVisible({ timeout: 10_000 });
		await o.fill(sp().fifo);
		const dd = page.locator('.order-search-product:not(.ant-select-dropdown-hidden)').last();
		const muc = dd.locator('.ant-select-item-option').filter({ hasText: sp().fifo }).first();
		const tb = await tbSau(page, async () => { if (await muc.isVisible({ timeout: 8_000 }).catch(() => false)) await muc.click(); });
		test.info().annotations.push({ type: 'thông báo thật', description: tb || '(gợi ý không có SP ngoài đơn)' });
		await expect(dongTra(page).filter({ hasText: sp().fifo }), 'SP ngoài đơn gốc vào bảng hàng trả').toHaveCount(0);
		if (tb) expect(tb).toContain('Chỉ có thể thêm sản phẩm có trong đơn hàng gốc');
	});

	test('18_5_030_001 — Đổi sang hàng đắt hơn thì chiều tiền là Khách trả', async ({ page }) => {
		chanNeuTat('18_5_030_001');
		const d = await banDon(page);
		await moDoiTra(page, d.orderId);
		// Hàng trả 95.000 (sau CK) — hàng đổi 2 × FIFO 100.000.
		// Ô tìm ở màn đổi trả là "Tìm kiếm sản phẩm đổi" (không phải F3 thường).
		for (let i = 0; i < 2; i += 1) {
			const o = page.getByPlaceholder('Tìm kiếm sản phẩm đổi');
			await o.click();
			await o.fill(sp().fifo);
			const dd = page.locator('.order-search-product:not(.ant-select-dropdown-hidden)').last();
			await dd.locator('.ant-select-item-option').filter({ hasText: sp().fifo }).first().click();
			await page.waitForTimeout(800);
		}
		await page.waitForTimeout(1_000);
		const t = chuan(await page.locator('body').innerText());
		test.info().annotations.push({ type: 'khối tiền', description: t.slice(t.indexOf('Trả hàng'), t.indexOf('Trả hàng') + 400) });
		expect(t).toMatch(/Cần thanh toán \(Khách trả\)|Khách cần thanh toán/);
	});

	test('18_5_030_002 — Tiền hoàn nhỏ hơn giá niêm yết khi đơn gốc có chiết khấu', async ({ page }) => {
		chanNeuTat('18_5_030_002');
		const d = await banDon(page);
		await moDoiTra(page, d.orderId);
		const t = await khoiTra(page).catch(async () => chuan(await page.locator('body').innerText()));
		const tra = tien(t, 'Tổng tiền hàng trả lại');
		test.info().annotations.push({ type: 'đo', description: `Tổng tiền hàng trả lại ${tra} (niêm yết 100.000, CK đơn 5.000)` });
		expect(tra).toBe(95000);
	});

	test('18_5_030_003 — Phí trả hàng trừ thẳng vào tiền hoàn', async ({ page }) => {
		chanNeuTat('18_5_030_003');
		const d = await banDon(page);
		await moDoiTra(page, d.orderId);
		const t0 = chuan(await page.locator('body').innerText());
		const o = page.getByText('Phí trả hàng', { exact: true }).first().locator('xpath=following::input[1]');
		await o.fill('10000');
		await o.blur();
		await page.waitForTimeout(800);
		const t1 = chuan(await page.locator('body').innerText());
		expect(tien(t1, 'Cửa hàng cần thanh toán')).toBe(tien(t0, 'Cửa hàng cần thanh toán') - 10000);
	});

	test('18_5_050_001 — Chốt đơn hoàn trả thành công', async ({ page }) => {
		chanNeuTat('18_5_050_001');
		const d = await banDon(page);
		await moDoiTra(page, d.orderId);
		const { tb, body, req, url } = await hoanTra(page);
		test.info().annotations.push({ type: 'kết quả', description: `"${tb}" · ${JSON.stringify(body?.status)}` });
		require('node:fs').writeFileSync(path.join(GOC, 'test-output', 'hoan-tra-mau.json'), JSON.stringify({ url, req, body }, null, 1));
		expect(tb).toContain('Tạo đơn hoàn trả thành công');
		const d0 = new Date(); d0.setHours(0, 0, 0, 0);
		const ds = await p.k.goiGhi(page, d.st, 'GET', '/orders/return-orders', { shopId: SHOP(), page: 0, size: 20, startTime: d0.getTime(), endTime: d0.getTime() + 86400_000 - 1 });
		const txt = JSON.stringify(ds?.data || []);
		test.info().annotations.push({ type: 'danh sách hoàn trả', description: `${(ds?.data || []).length} đơn · ${JSON.stringify(ds?.status)}` });
		expect(txt, 'Đơn hoàn trả không có ở /order/return-orders').toContain(String(d.orderNumber || d.orderId));
	});

	test('18_5_090_001 — Hoàn trả đơn nợ toàn bộ (thanh toán sau)', async ({ page }) => {
		chanNeuTat('18_5_090_001');
		const d = await banDon(page, { loai: 'no' });
		await moDoiTra(page, d.orderId);
		const { tb } = await hoanTra(page);
		expect(tb).toContain('Tạo đơn hoàn trả thành công');
		const x = await p.donTrongDs(page, d.st, d.orderId);
		test.info().annotations.push({ type: 'đơn gốc sau trả', description: JSON.stringify(x && { status: x.status, debt: x.debtAmount ?? x.totalDebt }) });
		expect(x?.status, 'Đơn gốc nợ toàn bộ sau khi trả hết không chuyển "Đã hủy"').toBe(-2);
	});

	test('18_5_090_003 — Đơn nháp không cho phép trả hàng', async ({ page }) => {
		chanNeuTat('18_5_090_003');
		await p.moBan(page, test);
		await p.them(page, sp().tc);
		await page.mouse.move(600, 700);
		await page.evaluate(() => document.activeElement?.blur?.());
		await page.locator('body').click({ position: { x: 600, y: 650 } });
		const cho = page.waitForResponse((r) => /\/spa\/orders\/draft\/v2/.test(r.url()) && r.request().method() !== 'GET', { timeout: 30_000 });
		await page.keyboard.press('F7');
		const id = (await (await cho).json())?.data?.orderId;
		await page.waitForTimeout(2_000);
		await p.moTrang(page, `${BASE()}/order/created-orders/detail/${id}/${SHOP()}`, p.VAI).catch(() => null);
		await page.waitForTimeout(2_000);
		await expect(page.getByRole('button', { name: /Đổi trả hàng/ })).toHaveCount(0);
	});

	test('18_5_150_001 — Phí trả hàng nhận giá trị âm', async ({ page }) => {
		chanNeuTat('18_5_150_001');
		const d = await banDon(page);
		await moDoiTra(page, d.orderId);
		const t0 = chuan(await page.locator('body').innerText());
		const o = page.getByText('Phí trả hàng', { exact: true }).first().locator('xpath=following::input[1]');
		await o.fill('-10000');
		await o.blur();
		await page.waitForTimeout(800);
		const t1 = chuan(await page.locator('body').innerText());
		test.info().annotations.push({ type: 'hành vi thật', description: `ô "${await o.inputValue()}" · cần thanh toán ${tien(t0, 'Cửa hàng cần thanh toán')} → ${tien(t1, 'Cửa hàng cần thanh toán')}` });
		expect(tien(t1, 'Cửa hàng cần thanh toán'), '🔴 Phí âm làm tăng tiền hoàn cho khách').toBeLessThanOrEqual(tien(t0, 'Cửa hàng cần thanh toán'));
	});

	test('18_5_150_002 — Phí trả hàng lớn hơn tiền hoàn', async ({ page }) => {
		chanNeuTat('18_5_150_002');
		const d = await banDon(page);
		await moDoiTra(page, d.orderId);
		const o = page.getByText('Phí trả hàng', { exact: true }).first().locator('xpath=following::input[1]');
		await o.fill('500000');
		await o.blur();
		await page.waitForTimeout(800);
		const t1 = chuan(await page.locator('body').innerText());
		const can = tien(t1, 'Cửa hàng cần thanh toán');
		test.info().annotations.push({ type: 'hành vi thật', description: `ô "${await o.inputValue()}" · cửa hàng cần thanh toán ${can} · "${t1.slice(t1.indexOf('Tổng tiền trả'), t1.indexOf('Tổng tiền trả') + 200)}"` });
		expect(can === null || can >= 0, 'Tiền hoàn thành số ÂM').toBe(true);
	});

	test('18_5_150_003 — Số lượng trả bằng 0', async ({ page }) => {
		chanNeuTat('18_5_150_003');
		const d = await banDon(page);
		await moDoiTra(page, d.orderId);
		const o = dongTra(page).first().locator('input').first();
		await o.fill('0');
		// SL 0 ⇒ dòng rời bảng "Hàng khách trả lại" sang "Hàng khách giữ lại" — locator cũ mất, bấm Enter qua bàn phím.
		await page.keyboard.press('Enter');
		await page.waitForTimeout(800);
		const { tb, body } = await hoanTra(page);
		test.info().annotations.push({ type: 'thông báo thật', description: `ô "${await o.inputValue().catch(() => '?')}" · "${tb}" · ${JSON.stringify(body?.status)}` });
		expect(tb, 'SL trả 0 vẫn tạo đơn hoàn trả').not.toContain('Tạo đơn hoàn trả thành công');
	});
});
