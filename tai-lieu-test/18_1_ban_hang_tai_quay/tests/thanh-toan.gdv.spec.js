'use strict';

/**
 * 18_1 — các case bán hàng CÓ THANH TOÁN THẬT (vai `gdv`, điểm bán seed của làn).
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): modal "Thanh toán" (`OrderCheckoutComponent_v2.jsx`) —
 * mặc định "Thanh toán hết" + "Tiền mặt", nút "Xác nhận thanh toán" ⇒ `POST /spa-checkout/v2.1`;
 * kiểm tồn lần cuối lúc thanh toán.
 *
 * 🔴 Ghi thật: sinh đơn + trừ tồn ở điểm bán seed (được phép theo bàn giao). 🚫 Không hoàn đơn.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('./pos-18');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const { chuan, dongBill, sp } = p;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const nav = (page) => page.locator('.ant-tabs-nav').first();
const roi = (page) => page.mouse.move(600, 700);
const tenBill = async (page) => (await dongBill(page).allInnerTexts()).map(chuan).join(' / ');

/** Thanh toán tiền mặt qua SDK (helper chung 18_1). Trả { body } giữ tương thích case cũ. */
async function thanhToan(page) {
	const r = await p.thanhToanTienMat(page);
	return { body: r.orderId ? { status: { code: '200' }, data: { orderId: r.orderId } } : r.draft, r };
}

async function datSl(page, row, v) {
	const o = row.locator('input').first();
	await o.click();
	await o.fill(String(v));
	await o.press('Enter');
	await roi(page);
	await page.waitForTimeout(800);
}

test.describe('18_1 — Bán hàng có thanh toán', () => {
	test.describe.configure({ timeout: 240_000 });
	let st;

	test.beforeEach(async ({ page }) => {
		await p.chanIn(page);
		st = await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_1_010_012 — Thanh toán một tab thì tab đó reset', async ({ page }) => {
		chanNeuTat('18_1_010_012');
		await p.them(page, sp().tc);
		await roi(page);
		await nav(page).getByRole('button', { name: 'Add tab' }).first().click();
		await p.them(page, sp().fifo);
		await roi(page);
		await p.tabs(page).first().click();
		const { body } = await thanhToan(page);
		expect(String(body?.status?.code), `Thanh toán lỗi: ${JSON.stringify(body?.status)}`).toBe('200');
		// Tab vừa thanh toán về trống; tab kia giữ nguyên.
		await expect(page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' })).toHaveCount(0, { timeout: 15_000 }).catch(() => null);
		await page.keyboard.press('Escape').catch(() => null);
		const conFifo = [];
		for (let i = 0; i < (await p.tabs(page).count()); i += 1) {
			await roi(page);
			await p.tabs(page).nth(i).click();
			conFifo.push(await tenBill(page));
		}
		test.info().annotations.push({ type: 'giỏ các tab sau thanh toán', description: conFifo.join(' || ') });
		expect(conFifo.some((t) => t.includes(sp().fifo)), 'Tab còn lại bị mất giỏ').toBe(true);
		expect(conFifo.some((t) => t.includes(sp().tc)), 'Tab đã thanh toán không reset').toBe(false);
	});

	test('18_1_010_013 — Tạo và thanh toán đơn mới khi đang treo đơn cũ', async ({ page }) => {
		chanNeuTat('18_1_010_013');
		await p.them(page, sp().tc);
		const treo = await tenBill(page);
		await roi(page);
		await nav(page).getByRole('button', { name: 'Add tab' }).first().click();
		await p.them(page, sp().fifo);
		const { body } = await thanhToan(page);
		expect(String(body?.status?.code), `Thanh toán lỗi: ${JSON.stringify(body?.status)}`).toBe('200');
		await page.keyboard.press('Escape').catch(() => null);
		await roi(page);
		await p.tabs(page).first().click();
		expect(await tenBill(page)).toBe(treo);
	});

	test('18_1_020_003 — Tạo đơn bằng cách lọc sản phẩm theo danh mục', async ({ page }) => {
		chanNeuTat('18_1_020_003');
		const ten = seed.doc().duLieu.sanPham.tenDanhMuc;
		await roi(page);
		const nut = page.getByRole('button', { name: 'Sản phẩm bán chạy' });
		if (await nut.isVisible().catch(() => false)) await nut.click();
		await page.locator('#product-sub-category').click();
		await page.locator('#product-sub-category').fill(ten);
		await page.locator('.ant-select-tree-title, .ant-select-tree-node-content-wrapper').filter({ hasText: new RegExp(`^${ten}$`) }).first().click();
		await page.keyboard.press('Escape');
		const the = page.getByText(sp().tc, { exact: true }).first();
		await expect(the, `Lọc danh mục "${ten}" không ra "${sp().tc}"`).toBeVisible({ timeout: 20_000 });
		await the.click();
		await expect(dongBill(page).filter({ hasText: sp().tc })).toHaveCount(1);
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
		const { body } = await thanhToan(page);
		expect(String(body?.status?.code), `Thanh toán lỗi: ${JSON.stringify(body?.status)}`).toBe('200');
		const id = body?.data?.orderId ?? body?.data?.id;
		expect(await p.donTrongDs(page, st, id), `Không thấy đơn ${id} ở danh sách`).toBeTruthy();
	});

	test('18_1_020_015 — Kết hợp quét mã vạch và chọn thủ công trong cùng đơn', async ({ page }) => {
		chanNeuTat('18_1_020_015');
		await roi(page);
		await page.evaluate(() => document.activeElement?.blur?.());
		await page.locator('body').click({ position: { x: 600, y: 650 } });
		await page.keyboard.type(`${seed.PREFIX}SKU_TC`, { delay: 5 });
		await page.keyboard.press('Enter');
		await expect(dongBill(page).filter({ hasText: sp().tc })).toHaveCount(1, { timeout: 20_000 });
		await p.them(page, sp().fifo);
		await expect(dongBill(page)).toHaveCount(2);
		expect((await p.tongKet(page)).truocVat).toBe(200000);
	});

	test('18_1_020_019 — Thanh toán mới thật sự chặn khi không đủ hàng', async ({ page }) => {
		chanNeuTat('18_1_020_019');
		await p.oTim(page).fill(sp().bt);
		const dd = page.locator('.order-search-product:not(.ant-select-dropdown-hidden)').last();
		const muc = dd.locator('.ant-select-item-option').filter({ hasText: 'Đỏ - Hộp' }).first();
		await expect(muc).toBeVisible({ timeout: 15_000 });
		const ton = Number((chuan(await muc.innerText()).match(/Kho: (\d+)/) || [])[1]);
		expect(ton, 'Không đọc được tồn BT Đỏ - Hộp').toBeGreaterThan(0);
		await muc.click();
		await datSl(page, dongBill(page).filter({ hasText: sp().bt }).first(), ton + 5);
		await roi(page);
		const cho = page.waitForResponse((r) => /draft-checkout/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
		await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
		const m = page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last();
		await expect(m).toBeVisible({ timeout: 20_000 });
		await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
		const r = await cho;
		const body = await r.json().catch(() => null);
		await page.waitForTimeout(3_000);
		const sdk = await page.getByText(/xác nhận giao dịch/i).isVisible().catch(() => false);
		const msg = chuan((await page.locator('.ant-message-notice, .ant-modal-confirm').allInnerTexts()).join(' | '));
		test.info().annotations.push({ type: 'hành vi thật', description: `draft-checkout ${JSON.stringify(body?.status)} · SDK hiện: ${sdk} · "${msg.slice(0, 300)}"` });
		expect(sdk, `🔴 Bán vượt tồn (${ton + 5} > ${ton}) vẫn qua kiểm tồn, tới bước xác nhận giao dịch`).toBe(false);
		expect(String(body?.status?.code), 'draft-checkout không chặn vượt tồn').not.toBe('200');
	});
});
