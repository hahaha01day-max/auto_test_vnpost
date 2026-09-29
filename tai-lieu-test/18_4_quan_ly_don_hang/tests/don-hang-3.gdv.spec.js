'use strict';

/** 18_4 phần 3 — tổ hợp lọc, sắp xếp, lợi nhuận, in nhiệt, cập nhật đơn nháp (vai `gdv`). */
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

test.describe('18_4 — phần 3', () => {
	test.describe.configure({ timeout: 300_000 });

	test('18_4_010_013 — Tổ hợp nhiều bộ lọc cùng lúc', async ({ page }) => {
		chanNeuTat('18_4_010_013');
		await h.moDs(page);
		await h.chonLoc(page, null, 'Đơn nháp');
		const r = await h.chonLoc(page, 'Trạng thái hoá đơn', 'Chưa tạo hoá đơn');
		expect(r, 'Chọn thêm bộ lọc hoá đơn không gọi lại danh sách').toBeTruthy();
		const q = new URL(r.url()).searchParams;
		test.info().annotations.push({ type: 'tham số', description: q.toString() });
		expect(q.get('status'), 'Bộ lọc trạng thái bị mất khi thêm bộ lọc hoá đơn').toBe('0');
		expect(q.get('invoiceStatus')).not.toBeNull();
		const n = await dong(page).count();
		for (let i = 0; i < n; i += 1) expect(await h.oDong(page, i, 'Trạng thái')).toBe('Đơn nháp');
	});

	test('18_4_010_016 — Sắp xếp danh sách đơn', async ({ page }) => {
		chanNeuTat('18_4_010_016');
		await h.moDs(page);
		const sx = khung(page).locator('.ant-table-thead th.ant-table-column-has-sorters');
		const ten = (await sx.allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'cột sắp xếp được', description: ten.join(' · ') || '(không có)' });
		expect(ten.length, 'Bảng danh sách đơn không có cột nào sắp xếp được').toBeGreaterThan(0);
		const truoc = (await dong(page).allInnerTexts()).map(chuan);
		await sx.first().click();
		await page.waitForTimeout(1_500);
		await sx.first().click();
		await page.waitForTimeout(1_500);
		const sau = (await dong(page).allInnerTexts()).map(chuan);
		expect(sau, 'Bấm sắp xếp 2 lần mà thứ tự không đổi').not.toEqual(truoc);
	});

	test('18_4_030_003 — Lợi nhuận bằng doanh thu trừ giá vốn', async ({ page }) => {
		chanNeuTat('18_4_030_003');
		const id = await h.taoDon(page, 'tra');
		const t = await h.moCt(page, id, h.SHOP());
		const dt = h.giaTriCt(t, 'Doanh thu');
		const gv = h.giaTriCt(t, 'Giá vốn');
		const ln = h.giaTriCt(t, 'Lợi nhuận');
		test.info().annotations.push({ type: 'đo', description: `Doanh thu ${dt} · Giá vốn ${gv} · Lợi nhuận ${ln}` });
		expect(gv, 'Chi tiết đơn không hiện "Giá vốn"').not.toBeNull();
		expect(ln, 'Chi tiết đơn không hiện "Lợi nhuận"').toBe(dt - gv);
	});

	test('18_4_050_001 — In biên lai nhiệt từ chi tiết đơn', async ({ page }) => {
		chanNeuTat('18_4_050_001');
		await page.addInitScript(() => { window.__inGoi = 0; window.print = () => { window.__inGoi += 1; }; });
		const id = await h.taoDon(page, 'tra');
		await h.moCt(page, id, h.SHOP());
		const truoc = await page.evaluate(() => window.__inGoi);
		const frames0 = page.frames().length;
		await page.getByRole('button', { name: /In nhiệt/ }).first().click();
		await page.waitForTimeout(4_000);
		const goi = await page.evaluate(() => window.__inGoi);
		const inFrame = page.frames().slice(frames0).map((f) => f.url());
		test.info().annotations.push({ type: 'đo', description: `print() gọi ${goi - truoc} lần · frame in mới: ${inFrame.join(', ')}` });
		expect(goi - truoc > 0 || inFrame.length > 0, 'Bấm In nhiệt không phát sinh lệnh in').toBe(true);
	});

	test('18_4_060_001 — Cập nhật đơn nháp', async ({ page }) => {
		chanNeuTat('18_4_060_001');
		const id = await h.taoDon(page, 'nhap');
		await h.moCt(page, id, h.SHOP());
		await page.getByRole('button', { name: /^(edit )?Cập nhật$/ }).click();
		await expect(p.oTim(page), 'Bấm Cập nhật đơn nháp không mở lại màn bán hàng').toBeVisible({ timeout: 30_000 });
		await p.them(page, p.sp().fifo);
		await page.mouse.move(600, 700);
		await page.evaluate(() => document.activeElement?.blur?.());
		await page.locator('body').click({ position: { x: 600, y: 650 } });
		const cho = page.waitForResponse((r) => /\/orders\/draft\/body\/|\/spa\/orders\/draft\/v2/.test(r.url()) && r.request().method() !== 'GET', { timeout: 30_000 });
		await page.keyboard.press('F7');
		const b = await (await cho).json();
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		const st = p.k.batHeader(page);
		const t = await h.moCt(page, id, h.SHOP());
		expect(t, 'Đơn nháp sau cập nhật không có SP vừa thêm').toContain(p.sp().fifo);
		expect(t).toContain('Đơn nháp');
		void st;
	});
});
