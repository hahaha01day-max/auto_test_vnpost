'use strict';

/**
 * `-g "chup loyalty 20"` — chụp cấu hình gốc hai chương trình của chuỗi (một lần, 🚫 ghi đè).
 * `-g "khoi phuc loyalty 20"` — 🔴 KHÔI PHỤC KHẨN CẤP về bản gốc (chạy sau mọi lượt có sửa tạm, hoặc khi lượt hỏng giữa chừng).
 */

const { test, expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const c = require('./cau-hinh-loyalty');

async function phien(page) {
	const st = c.k.batHeader(page);
	await moTrang(page, '/care/loyalty', 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	return st;
}

test('chup loyalty 20 — chụp cấu hình gốc', async ({ page }) => {
	const st = await phien(page);
	const g = await c.chup(page, st);
	test.info().annotations.push({ type: 'gốc', description: JSON.stringify({ tich: c.bodyTich(g.tich), doi: c.bodyDoi(g.doi) }).slice(0, 1500) });
});

test('khoi phuc loyalty 20 — trả cấu hình gốc', async ({ page }) => {
	const st = await phien(page);
	const kq = await c.khoiPhuc(page, st);
	test.info().annotations.push({ type: 'khôi phục', description: JSON.stringify(kq) });
	const hien = await c.doc(page, st);
	const g = JSON.parse(require('node:fs').readFileSync(c.GOC, 'utf8'));
	for (const k of ['active', 'orderAmountConditional', 'orderAmountPerPoint', 'campaignType', 'noPointForDiscountedInvoice', 'noPointForDiscountedProduct', 'scopeType'])
		expect(hien.tich[k], `Tích điểm: ${k} chưa về gốc`).toEqual(g.tich[k]);
	expect((hien.tich.scopes || []).length, 'Tích điểm: số đơn vị phạm vi chưa về gốc').toBe((g.tich.scopes || []).length);
	for (const k of ['active', 'orderAmountPerPoint', 'orderAmountConditional', 'scopeType']) expect(hien.doi[k], `Đổi điểm: ${k} chưa về gốc`).toEqual(g.doi[k]);
});

test('tham do pham vi 20 — check-scope điểm bán làn trước/sau khi thêm tỉnh làn', async ({ page }) => {
	const seed = require('../../00_seed/seed-state');
	const st = await phien(page);
	const g = await c.chup(page, st);
	const shopId = seed.doc().duLieu.diemBan.shopId;
	const hoi = async () => JSON.stringify((await c.k.goiGhi(page, st, 'GET', '/loyalty/campaign/check-scope', { shopId }))?.data);
	const truoc = await hoi();
	try {
		const pv = c.phamViCoLan(g.tich, seed.doc().duLieu.toChuc.maTinh, seed.doc().duLieu.diemBan.maShop);
		await c.suaTich(page, st, pv);
		const sau = await hoi();
		await c.suaTich(page, st, { scopeType: 'DIEM_BAN', scopes: [...pv.scopes, { scopeType: 'DIEM_BAN', orgUnitCode: seed.doc().duLieu.diemBan.maShop }] });
		const sau2 = await hoi();
		await c.suaTich(page, st, { scopeType: 'DIEM_BAN', scopes: [...pv.scopes, { scopeType: 'DIEM_BAN', orgUnitCode: String(shopId) }] });
		const sau3 = await hoi();
		test.info().annotations.push({ type: 'check-scope', description: `gốc ${truoc} · +tỉnh ${sau} · +mã shop ${sau2} · +shopId ${sau3}` });
	} finally {
		test.info().annotations.push({ type: 'khôi phục', description: JSON.stringify(await c.khoiPhuc(page, st)) });
	}
});
