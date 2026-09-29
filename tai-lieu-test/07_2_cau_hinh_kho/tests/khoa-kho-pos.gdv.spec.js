'use strict';

/**
 * 07_2 · 060_001 / 060_007 — Bán hàng tại quầy với SP đang khoá / vừa bỏ khoá, GHI (26/09/2026). Vai `gdv` (POS, 05:00–23:45).
 * Khoá dựng bằng phiên phụ `tct` qua `POST /inventory-config/stock-freeze/bulk` (phạm vi điểm bán seed, SP giá tiêu chuẩn), bỏ khoá ở finally.
 * Bán bằng helper 18_1 `pos-18.js` (moBan → them → thanhToanTienMat). Đo thông báo, đơn có tạo không, tồn Σ lô.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chon } = require('../../shared/db/otp');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const D = () => seed.doc().duLieu;
const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);

async function khoa(browser) {
	const t = await k.moPhienPhu(browser, 'tct', '/settings?setting=stockFreeze');
	const pid = Number(chon(`select product_id from CHAIN_PRODUCT_UNIT where sku='${D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku}' limit 1`, 'VNPOST_CORE'));
	const reason = `AUTO test 07_2 pos ${Date.now().toString().slice(-7)}`;
	const r = await k.goiGhi(t.page, t.st, 'POST', '/inventory-config/stock-freeze/bulk', {}, { scopeType: 'DIEM_BAN', scopes: [{ scopeType: 'DIEM_BAN', orgUnitCode: D().diemBan.maShop }], reason, productIds: [pid] });
	expect(String(r?.status?.code), `Tạo khoá lỗi ${JSON.stringify(r?.status)}`).toBe('200');
	const ids = ds((await k.goiGhi(t.page, t.st, 'GET', '/inventory-config/stock-freeze'))?.data).filter((z) => JSON.stringify(z).includes(reason)).map((z) => z.ruleId ?? z.id);
	return { pid, bo: async () => { for (const id of ids) await k.goiGhi(t.page, t.st, 'DELETE', `/inventory-config/stock-freeze/${id}`).catch(() => null); await t.dong(); } };
}
const ton = async (page, st, pid) => ((await k.goiGhi(page, st, 'GET', '/stock/v2/batch-product', { shopId: D().diemBan.shopId, productId: pid, size: 500 }))?.data || []).reduce((t, l) => t + Number(l.remainQuantity), 0);

test.describe('07_2 · 060 — POS với SP khoá kho (GHI)', () => {
	test.describe.configure({ timeout: 300_000 });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });
	test.afterEach(async ({ page }) => { await page.keyboard.press('Escape').catch(() => null); await p.donTab(page).catch(() => null); });

	test('07_2_060_001 — Bán hàng sản phẩm đang bị khoá kho', async ({ page, browser }) => {
		chanNeuTat('07_2_060_001');
		const kh = await khoa(browser);
		try {
			const st = await p.moBan(page, test);
			const truoc = await ton(page, st, kh.pid);
			const tb = new Set();
			const nghe = setInterval(async () => { for (const x of await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts().catch(() => [])) tb.add(p.chuan(x)); }, 250);
			let r = null;
			let loi = '';
			try { await p.them(page, p.sp().tc); r = await p.thanhToanTienMat(page); } catch (e) { loi = String(e.message).slice(0, 200); }
			await page.waitForTimeout(2_000);
			clearInterval(nghe);
			const sau = await ton(page, st, kh.pid);
			const tt = [...tb].join(' | ');
			test.info().annotations.push({ type: 'đo', description: `thông báo: "${tt}" · đơn ${r?.orderId ?? 'không tạo'} · lỗi bước: ${loi} · tồn ${truoc} ⇒ ${sau}` });
			expect(r?.orderId, '🔴 SP đang khoá vẫn bán được (đơn đã tạo)').toBeFalsy();
			expect(tt, 'Không có thông báo "Không thể xuất kho. Sản phẩm đang bị …"').toMatch(/Không thể xuất kho\. Sản phẩm đang bị/);
			expect(sau, 'Tồn thay đổi dù đơn bị chặn').toBe(truoc);
		} finally { await kh.bo(); }
	});

	test('07_2_060_007 — Bán hàng sản phẩm vừa được bỏ khoá', async ({ page, browser }) => {
		chanNeuTat('07_2_060_007');
		const kh = await khoa(browser);
		await kh.bo();
		const st = await p.moBan(page, test);
		const truoc = await ton(page, st, kh.pid);
		await p.them(page, p.sp().tc);
		const r = await p.thanhToanTienMat(page);
		await page.waitForTimeout(3_000);
		const sau = await ton(page, st, kh.pid);
		test.info().annotations.push({ type: 'đo', description: `đơn ${r?.orderNumber} (${r?.orderId}) · tồn ${truoc} ⇒ ${sau}` });
		expect(r?.orderId, 'SP vừa bỏ khoá không bán được').toBeTruthy();
		expect(sau, 'Tồn không giảm đúng 1').toBe(truoc - 1);
	});
});
