'use strict';

/**
 * 18_4 phần 2 — lọc nâng cao, thống kê, excel, chi tiết, ghi nhận thanh toán, hoá đơn, tạm nộp (vai `gdv`).
 * Đo 25/09/2026 (vnpost-web 8ac2c516): `OrderListPage.jsx` (tìm keyword 0 kết quả ⇒ message.error
 * "Không tìm thấy hoá đơn" — dùng CHUNG cho tìm kiếm), `tableData/OrderTableData.jsx` (menu Thao tác:
 * Xem chi tiết · Phát hành hoá đơn · Xem thông tin hoá đơn — ẩn khi shop tắt HĐĐT; nút
 * "Phát hành hoá đơn điện tử (n)" khi đã tick dòng), `pages/orderDetail/OrderDetail.jsx`
 * ("In phiếu giao hàng", "Đổi trả hàng").
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const h = require('./dh');

const GOC = path.join(__dirname, '..');
const { khung, dong, p, chuan, so } = h;
h.datTest(test);

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const tbSau = async (page, fn, cho = 6_000) => {
	await fn();
	const n = page.locator('.ant-message-notice');
	await n.first().waitFor({ state: 'visible', timeout: cho }).catch(() => null);
	await page.waitForTimeout(400);
	return chuan((await n.allInnerTexts()).join(' | ')).replace(/\s*\([A-Za-z0-9]{6}\)/g, '');
};

test.describe('18_4 — phần 2', () => {
	test.describe.configure({ timeout: 300_000 });

	test('18_4_010_012 — Lọc khoảng thời gian có ngày kết thúc trước ngày bắt đầu', async ({ page }) => {
		chanNeuTat('18_4_010_012');
		await h.moDs(page);
		const bd = khung(page).getByPlaceholder('Ngày bắt đầu');
		await bd.click();
		await bd.fill('26/09/2026');
		await bd.press('Enter');
		const kt = khung(page).getByPlaceholder('Ngày kết thúc');
		await kt.fill('20/09/2026');
		await kt.press('Enter');
		await page.waitForTimeout(1_500);
		const v = [await bd.inputValue(), await kt.inputValue()];
		test.info().annotations.push({ type: 'hành vi thật', description: `ô ngày sau khi nhập: ${v.join(' → ')} · ${await dong(page).count()} dòng` });
		expect(v[1] === '20/09/2026' && v[0] === '26/09/2026' && (await dong(page).count()) > 0, 'Khoảng ngày ngược vẫn trả dữ liệu').toBe(false);
	});

	test('18_4_010_020 — Đơn đã tất toán có Số tiền còn nợ bằng 0', async ({ page }) => {
		chanNeuTat('18_4_010_020');
		await h.moDs(page);
		await h.chonLoc(page, null, 'Đã thanh toán');
		const n = await dong(page).count();
		expect(n, 'Hôm nay không có đơn đã thanh toán').toBeGreaterThan(0);
		for (let i = 0; i < n; i += 1) expect(so(await h.oDong(page, i, 'Số tiền còn nợ'))).toBe(0);
	});

	test('18_4_020_002 — Thẻ thống kê đổi theo bộ lọc', async ({ page }) => {
		chanNeuTat('18_4_020_002');
		await h.moDs(page);
		const t0 = chuan(await khung(page).innerText());
		await h.tim(page, 'KHONGCOMADONNAY999');
		const t1 = chuan(await khung(page).innerText());
		const dt = (t) => h.giaTriCt(t, 'Doanh thu');
		test.info().annotations.push({ type: 'đo', description: `Doanh thu ${dt(t0)} → ${dt(t1)} (lọc mã không tồn tại)` });
		expect(dt(t0)).toBeGreaterThan(0);
		expect(dt(t1), 'Thẻ Doanh thu không tính lại theo bộ lọc tìm kiếm').toBe(0);
	});

	// 18_4_020_005 chuyển sang xuat-excel.shop.spec.js (28/09): bản cũ chỉ bắt request KHÁC GET nên luôn đỏ.

	test('18_4_030_005 — Đơn không bật thuế hiển thị VAT là Không', async ({ page }) => {
		chanNeuTat('18_4_030_005');
		const id = await h.taoDon(page, 'tra');
		const t = await h.moCt(page, id, h.SHOP());
		const vat = (t.match(/VAT\s+(\S+(?: đ)?)/) || [])[1];
		test.info().annotations.push({ type: 'ô VAT', description: String(vat) });
		expect(vat).toBe('Không');
	});

	test('18_4_030_010 — Số điện thoại khách hiển thị che một phần', async ({ page }) => {
		chanNeuTat('18_4_030_010');
		const id = await h.taoDon(page, 'no');
		const t = await h.moCt(page, id, h.SHOP());
		const sdt = (t.match(/Số điện thoại\s+(\S+)/) || [])[1];
		test.info().annotations.push({ type: 'SĐT hiển thị', description: String(sdt) });
		expect(sdt, 'Số điện thoại hiện đầy đủ, không che').toMatch(/[*x•]/i);
	});

	test('18_4_030_011 — Khối Thông tin giao hàng chỉ hiện khi đơn có giao vận', async ({ page }) => {
		chanNeuTat('18_4_030_011');
		const id = await h.taoDon(page, 'tra');
		const t = await h.moCt(page, id, h.SHOP());
		expect(t).not.toContain('Thông tin giao hàng');
	});

	test('18_4_040_003 — Chặn ghi nhận thêm tiền vượt số còn nợ', async ({ page }) => {
		chanNeuTat('18_4_040_003');
		const id = await h.taoDon(page, 'no');
		await h.moCt(page, id, h.SHOP());
		await page.getByRole('button', { name: /Cập nhật thanh toán/ }).click();
		const m = page.getByRole('dialog').last();
		await expect(m).toBeVisible({ timeout: 15_000 });
		await m.getByRole('button', { name: 'Trả góp', exact: true }).click();
		await m.getByText('Nhập số tiền trả góp').first().locator('xpath=following::input[1]').fill('500000');
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Xác nhận thanh toán' }).click());
		test.info().annotations.push({ type: 'thông báo thật', description: tb || '(không thông báo)' });
		expect(tb, 'Ghi nhận 500.000 cho đơn nợ 95.000 không bị chặn').toMatch(/nhỏ hơn|vượt|lớn hơn/i);
	});

	test('18_4_040_004 — Bỏ trống số tiền khi ghi nhận thêm', async ({ page }) => {
		chanNeuTat('18_4_040_004');
		const id = await h.taoDon(page, 'no');
		await h.moCt(page, id, h.SHOP());
		await page.getByRole('button', { name: /Cập nhật thanh toán/ }).click();
		const m = page.getByRole('dialog').last();
		await m.getByRole('button', { name: 'Trả góp', exact: true }).click();
		await m.getByText('Nhập số tiền trả góp').first().locator('xpath=following::input[1]').fill('');
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Xác nhận thanh toán' }).click());
		test.info().annotations.push({ type: 'thông báo thật', description: tb });
		expect(tb.length, 'Bỏ trống số tiền không có thông báo chặn').toBeGreaterThan(0);
	});

	test('18_4_040_005 — Huỷ giữa chừng khi ghi nhận thêm tiền', async ({ page }) => {
		chanNeuTat('18_4_040_005');
		const id = await h.taoDon(page, 'no');
		const t0 = await h.moCt(page, id, h.SHOP());
		await page.getByRole('button', { name: /Cập nhật thanh toán/ }).click();
		const m = page.getByRole('dialog').last();
		await m.getByRole('button', { name: 'Huỷ' }).click();
		const t1 = await h.moCt(page, id, h.SHOP());
		expect([h.giaTriCt(t1, 'Đã thanh toán'), h.giaTriCt(t1, 'Còn nợ')]).toEqual([h.giaTriCt(t0, 'Đã thanh toán'), h.giaTriCt(t0, 'Còn nợ')]);
	});

	test('18_4_050_003 — Nút In phiếu giao hàng chỉ hiện với đơn giao vận đã hoàn tất', async ({ page }) => {
		chanNeuTat('18_4_050_003');
		const id = await h.taoDon(page, 'tra');
		await h.moCt(page, id, h.SHOP());
		await expect(page.getByRole('button', { name: /In phiếu giao hàng/ })).toHaveCount(0);
	});

	test('18_4_060_005 — Nút Đổi trả hàng ẩn với đơn nháp và đơn đã huỷ', async ({ page }) => {
		chanNeuTat('18_4_060_005');
		const a = await h.taoDon(page, 'nhap');
		await h.moCt(page, a, h.SHOP());
		await expect(page.getByRole('button', { name: /Đổi trả hàng/ }), 'Đơn nháp có nút Đổi trả hàng').toHaveCount(0);
		const b = await h.taoDon(page, 'tra');
		await h.moCt(page, b, h.SHOP());
		await expect(page.getByRole('button', { name: /Đổi trả hàng/ }), 'Đơn đã thanh toán KHÔNG có nút Đổi trả hàng').toBeVisible();
	});

	test('18_4_070_002 — Nút phát hành hoá đơn chỉ hiện khi đã chọn dòng', async ({ page }) => {
		chanNeuTat('18_4_070_002');
		await h.moDs(page);
		await expect(khung(page).getByRole('button', { name: /Phát hành hoá đơn điện tử/ })).toHaveCount(0);
		await dong(page).first().locator('.ant-checkbox-input').check();
		await expect(khung(page).getByRole('button', { name: /Phát hành hoá đơn điện tử \(1\)/ })).toBeVisible();
	});

	test('18_4_070_005 — Lọc theo trạng thái hoá đơn', async ({ page }) => {
		chanNeuTat('18_4_070_005');
		await h.moDs(page);
		const r = await h.chonLoc(page, 'Trạng thái hoá đơn', 'Chưa tạo hoá đơn');
		expect(r, 'Chọn trạng thái hoá đơn không gọi lại danh sách').toBeTruthy();
		const n = await dong(page).count();
		for (let i = 0; i < n; i += 1) expect(await h.oDong(page, i, 'TT. Hoá đơn')).toMatch(/^-$|Chưa/);
	});

	test('18_4_070_008 — Xem thông tin hoá đơn khi đơn chưa có hoá đơn', async ({ page }) => {
		chanNeuTat('18_4_070_008');
		await h.moDs(page);
		const i = 0;
		expect(await h.oDong(page, i, 'TT. Hoá đơn')).toBe('-');
		await dong(page).nth(i).getByText('Thao tác').click();
		const tb = await tbSau(page, () => page.locator('.ant-dropdown:visible .ant-dropdown-menu-item').filter({ hasText: 'Xem thông tin hoá đơn' }).click());
		expect(tb).toContain('Không tìm thấy hoá đơn');
	});

	test('18_4_080_001 — Lọc theo trạng thái tạm nộp', async ({ page }) => {
		chanNeuTat('18_4_080_001');
		await h.moDs(page);
		const r = await h.chonLoc(page, 'Trạng thái tạm nộp', 'Tạm nộp');
		expect(r, 'Chọn "Tạm nộp" không gọi lại danh sách').toBeTruthy();
		expect(new URL(r.url()).searchParams.get('tempSubmit')).toBe('true');
	});
});
