'use strict';

/**
 * 18_1 — bán hàng TỒN ÂM (vai `gdv`, điểm bán seed làn).
 *
 * Tiền đề (dựng trong spec, 26/09/2026):
 * - `shared/ban-am.js › bat` THÊM điểm bán làn vào phạm vi "Bán tồn kho âm" của chuỗi (beforeAll), `khoiPhuc` trả phạm vi gốc (afterAll).
 * - Hàng tồn âm = SP sản xuất của làn `AUTO<làn>_SP_SX_*` (không spec nào khác dùng — đo 26/09 tồn 4). Còn tồn ≥ 0 thì bán
 *   (tồn + 1) cái để về âm. Tồn đọc bằng SELECT `SHOP_STOCK` (pod của điểm bán).
 * Hàng tồn 0 = `AUTO<làn>_SP_TD2` (dùng chung với 030_003 / 060_007 — 🚫 KHÔNG bán TD2, chỉ thêm vào giỏ).
 * 🔴 Ghi thật: đơn bán vượt tồn (tồn SX âm vĩnh viễn — chủ đích, làm tiền đề cho cả 14_1_010_035).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chon } = require('../../shared/db/otp');
const banAm = require('../../shared/ban-am');
const seed = require('../../00_seed/seed-state');
const p = require('./pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, dongBill } = p;
const PF = seed.PREFIX; // "AUTO8_"

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** SP sản xuất của làn tại điểm bán: { ten, maVach, variantId, ton } (SELECT). */
function hangSx() {
	const shopId = seed.doc().duLieu.diemBan.shopId;
	for (const db of ['VNPOST_POD_01', 'VNPOST_POD_02', 'VNPOST_POD_03']) {
		let r = '';
		try { r = chon(`select s.product_name, u.bar_code, s.variant_id, sum(s.quantity) from ${db}.SHOP_STOCK s join VNPOST_CORE.CHAIN_PRODUCT_UNIT u on u.product_unit_id = s.product_unit_id where s.shop_id=${shopId} and s.active=1 and s.product_name like '${PF}SP_SX_%' group by s.product_name, u.bar_code, s.variant_id limit 1`, db); } catch { /* pod khác */ }
		if (r) { const [ten, maVach, variantId, ton] = r.split('\t'); return { ten, maVach, variantId, ton: Number(ton) }; }
	}
	return null;
}

async function quet(page, ma) {
	await page.mouse.move(600, 700);
	await page.evaluate(() => document.activeElement?.blur?.());
	await page.locator('body').click({ position: { x: 600, y: 650 } });
	await page.keyboard.type(ma, { delay: 5 });
	await page.keyboard.press('Enter');
}
async function tbSau(page, fn, cho = 6_000) {
	await fn();
	const n = page.locator('.ant-message-notice');
	await n.first().waitFor({ state: 'visible', timeout: cho }).catch(() => null);
	await page.waitForTimeout(800);
	return chuan((await n.allInnerTexts()).join(' | '));
}
async function gaCan(page) {
	await page.addInitScript(() => {
		const subs = [];
		window.__canPush = (text) => subs.forEach((cb) => cb({ text }));
		window.serialBridge = {
			connect: async () => ({ state: { status: 'connected' } }),
			disconnect: async () => ({ state: { status: 'idle' } }),
			onData: (cb) => { subs.push(cb); return () => subs.splice(subs.indexOf(cb), 1); },
			onStatus: () => () => {},
		};
	});
}
const slDong = async (page, ten) => Number(String(await dongBill(page).filter({ hasText: ten }).first().locator('input').first().inputValue()).replace(',', '.'));

let SX = null;
test.describe('18_1 — Bán hàng tồn âm', () => {
	test.describe.configure({ timeout: 240_000 });
	test.beforeAll(async ({ browser }) => {
		test.setTimeout(120_000);
		await banAm.bat(browser, seed.doc().duLieu.diemBan.maShop);
	});
	test.afterAll(async ({ browser }) => { test.setTimeout(120_000); await banAm.khoiPhuc(browser); });
	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('tien de ton am 18_1 — đưa SP sản xuất về tồn âm', async ({ page, browser }) => {
		test.setTimeout(420_000);
		SX = hangSx();
		expect(SX, `Không thấy SP ${PF}SP_SX_* ở điểm bán làn`).toBeTruthy();
		if (SX.ton < 0) return;
		await p.moBan(page, test);
		await p.them(page, SX.ten);
		// 🔴 Đo 26/09: SP sản xuất "Chưa có bảng giá" ở điểm bán seed ⇒ không thanh toán được. Tạo bảng giá CHỈ chứa SP này
		//    (phạm vi điểm bán seed, khuôn `10/tests/bg-ghi.js › taoTam + duyet`) — không đụng giá SP TC của các case POS khác.
		if (await dongBill(page).filter({ hasText: SX.ten }).getByText('Chưa có bảng giá').count()) {
			const bg = require('../../10_bang_gia_ban_san_pham/tests/bg-ghi');
			const ctx = await browser.newContext({ storageState: require('../../shared/auth/accounts').storageStateFor('tct') });
			const tp = await ctx.newPage();
			try {
				const { ten } = await bg.taoTam(tp, { ten: `${PF}BG_SX_TON_AM`, sku: SX.maVach, gia: 10_000, phamVi: 'seed' });
				await bg.duyet(tp, ten);
				test.info().annotations.push({ type: 'bảng giá SX', description: `${ten} · ${SX.maVach} = 10.000đ (điểm bán seed, giữ lại)` });
			} finally { await ctx.close(); }
			await p.moBan(page, test);
			await p.them(page, SX.ten);
			await expect(dongBill(page).filter({ hasText: SX.ten }).getByText('Chưa có bảng giá'), 'Đã duyệt bảng giá mà SP sản xuất vẫn "Chưa có bảng giá"').toHaveCount(0);
		}
		const o = dongBill(page).filter({ hasText: SX.ten }).first().locator('input').first();
		await o.fill(String(SX.ton + 1));
		await o.press('Enter');
		await page.waitForTimeout(800);
		const r = await p.thanhToanTienMat(page);
		test.info().annotations.push({ type: 'bán vượt tồn', description: `${SX.ten} tồn ${SX.ton} · bán ${SX.ton + 1} · ${JSON.stringify(r.draft?.status)} · đơn ${r.orderNumber}` });
		expect(r.orderId, `Bật bán âm mà vẫn không bán vượt tồn được: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		await expect.poll(() => hangSx()?.ton, { timeout: 60_000, intervals: [5_000] }).toBeLessThan(0);
		SX = hangSx();
	});

	test('18_1_030_004 — Quét barcode sản phẩm tồn ÂM vẫn thêm được', async ({ page }) => {
		chanNeuTat('18_1_030_004');
		SX = SX || hangSx();
		test.skip(!(SX?.ton < 0), `Chưa dựng được tồn âm (tồn ${SX?.ton})`);
		await p.moBan(page, test);
		const tb = await tbSau(page, () => quet(page, SX.maVach));
		test.info().annotations.push({ type: 'đo', description: `${SX.ten} tồn ${SX.ton} · quét ${SX.maVach} · "${tb}"` });
		await expect(dongBill(page).filter({ hasText: SX.ten }), `🔴 Tồn âm mà quét KHÔNG thêm vào đơn ("${tb}")`).toHaveCount(1);
	});

	test('18_1_060_008 — Cân sản phẩm tồn âm vẫn cho bán', async ({ page }) => {
		chanNeuTat('18_1_060_008');
		SX = SX || hangSx();
		test.skip(!(SX?.ton < 0), `Chưa dựng được tồn âm (tồn ${SX?.ton})`);
		await gaCan(page);
		await p.moBan(page, test);
		await p.them(page, SX.ten);
		await page.mouse.move(600, 700);
		await page.evaluate(() => document.activeElement?.blur?.());
		await page.keyboard.press('F9');
		await page.waitForTimeout(1_000);
		await page.evaluate(() => window.__canPush('WT: 0.5kg\r\n'));
		await page.waitForTimeout(1_200);
		const sl = await slDong(page, SX.ten);
		const r = await p.thanhToanTienMat(page);
		test.info().annotations.push({ type: 'đo', description: `${SX.ten} tồn ${SX.ton} · SL sau cân ${sl} · thanh toán ${JSON.stringify(r.draft?.status)} · đơn ${r.orderNumber}` });
		expect(sl, 'Số cân không vào dòng hàng tồn âm').toBe(0.5);
		expect(r.orderId, `Hàng tồn âm (đã bật bán âm) không bán được: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
	});

	test('18_1_060_020 — Quét barcode hàng cân ký khi tồn = 0 hoặc âm', async ({ page }) => {
		chanNeuTat('18_1_060_020');
		SX = SX || hangSx();
		test.skip(!(SX?.ton < 0), `Chưa dựng được tồn âm (tồn ${SX?.ton})`);
		await gaCan(page);
		await p.moBan(page, test);
		const maTd2 = `${PF.replace(/_/g, '')}SKUTD2`; // TD2 seed: hết hàng (xem 18_1_030_003)
		const tb0 = await tbSau(page, () => quet(page, maTd2));
		const tbAm = await tbSau(page, () => quet(page, SX.maVach));
		const co0 = await dongBill(page).filter({ hasText: `${PF}SP_TD2` }).count();
		const coAm = await dongBill(page).filter({ hasText: SX.ten }).count();
		test.info().annotations.push({ type: 'đo', description: `tồn 0 (${maTd2}): "${tb0}" · ${co0} dòng || tồn âm (${SX.maVach}, tồn ${SX.ton}): "${tbAm}" · ${coAm} dòng` });
		expect(co0, 'Hàng tồn 0 quét không vào đơn').toBe(1);
		expect(coAm, 'Hàng tồn âm quét không vào đơn').toBe(1);
		// "Cho bán": thanh toán thật chỉ trên dòng tồn âm — 🚫 bán TD2 (sẽ làm TD2 âm, hỏng tiền đề tồn 0 của 030_003/060_007).
		await dongBill(page).filter({ hasText: `${PF}SP_TD2` }).first().locator('[aria-label="close"], .anticon-close, .anticon-delete').first().click().catch(() => null);
		await page.waitForTimeout(800);
		test.skip(await dongBill(page).filter({ hasText: `${PF}SP_TD2` }).count() > 0, 'Không bỏ được dòng TD2 khỏi giỏ để chỉ bán dòng tồn âm');
		const r = await p.thanhToanTienMat(page);
		test.info().annotations.push({ type: 'bán dòng tồn âm', description: `${JSON.stringify(r.draft?.status)} · đơn ${r.orderNumber} · vế tồn 0 chỉ kiểm thêm vào đơn (bán thật đo ở 060_007 bằng cân)` });
		expect(r.orderId, `Hàng tồn âm không bán được: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
	});
});
