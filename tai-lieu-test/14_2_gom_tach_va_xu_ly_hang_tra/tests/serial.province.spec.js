'use strict';

/**
 * 14_2 · 040_013 / 040_014 — serial khi xử lý hàng chờ trả (vai `province`).
 * Nguồn: `ProcessActionDrawer.jsx` (`isSerialItem` = dòng có `serials`; cảnh báo khi số serial ≠ SL), BE `requireRemain`
 * (chặn "Số serial (n) phải bằng số lượng xử lý (m)" với MỌI dòng có gửi serial).
 * 🔴 Điểm bán seed 0 hàng serial có nguồn NCC ⇒ 040_013 giả lập `serials` trong response chi tiết phiếu (chỉ đổi dữ liệu
 *    hiển thị, không ghi); 040_014 gọi thẳng API với dòng không serial — BE kiểm số serial trước khi xét loại hàng.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('./tra-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

let pt = null;
let ps = null;
test.describe.configure({ timeout: 300_000 });
test.beforeEach(async ({ page, browser }) => {
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, 'province');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh('province', page, st);
	pt = { page, st };
});
test.beforeAll(async ({ browser }) => {
	ps = await t.k.moPhienPhu(browser, 'shop', t.ROUTE);
});
test.afterAll(async () => ps?.dong());
const dongMa = (page, ma) => t.dong(page).filter({ has: page.locator('td', { hasText: new RegExp(`^${ma}$`) }) }).first();

test('14_2_040_013 — Hàng serial phải khai đủ serial bằng SL xử lý', async ({ page, browser }) => {
	chanNeuTat('14_2_040_013');
	const p = await t.phieuChuaTra(browser, ps, pt, { sl: 3 });
	await page.route((u) => u.pathname.endsWith(`${t.API}/${p.id}`), async (r) => {
		const res = await r.fetch();
		const b = await res.json();
		if (b?.data?.items?.[0]) b.data.items[0].serials = ['AUTOSR1', 'AUTOSR2', 'AUTOSR3'];
		await r.fulfill({ response: res, body: JSON.stringify(b) });
	});
	const daGoi = [];
	page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/return-to-supplier')) daGoi.push(r.url()); });
	await t.timMa(page, p.code);
	await t.bamMenu(page, dongMa(page, p.code), 'Trả hàng NCC');
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Trả hàng nhà cung cấp' }).last();
	const hang = dr.locator('.ant-table-tbody tr.ant-table-row').first();
	await expect(hang.locator('.ant-select-selection-item')).toHaveCount(3, { timeout: 20_000 });
	await hang.locator('.ant-select-selection-item-remove').last().click();
	await expect(hang.locator('.ant-select-selection-item')).toHaveCount(2);
	const tb = await t.thongBao(page, () => dr.locator('.ant-drawer-footer button').filter({ hasText: 'Trả hàng' }).click(), 5_000);
	expect(tb).toContain(`quản lý serial: số serial phải bằng số lượng (3)`);
	expect(tb).toMatch(/^Sản phẩm ".+" quản lý serial/);
	expect(daGoi).toEqual([]);
	test.info().annotations.push({ type: 'giả lập', description: 'Response chi tiết phiếu được gắn 3 serial giả cho dòng đầu (không ghi dữ liệu).' });
});

test('14_2_040_014 — Gọi API lệch số serial bị chặn ở backend', async ({ browser }) => {
	chanNeuTat('14_2_040_014');
	const p = await t.phieuChuaTra(browser, ps, pt, { sl: 3 });
	const it = (await t.itemCua(pt, p.id))[0];
	const b = await t.goi(pt, `/${p.id}/dispose`, { items: [{ itemId: it.id, quantity: 3, serials: ['AUTOSR1', 'AUTOSR2'] }] });
	expect(t.msg(b)).toMatch(/^Số serial \(2\) phải bằng số lượng xử lý \(3(\.0+)?\)$/);
	expect(Number((await t.itemCua(pt, p.id))[0].damagedQty || 0), 'BE chặn mà vẫn ghi huỷ').toBe(0);
});
