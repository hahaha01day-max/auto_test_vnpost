'use strict';

/**
 * 18_1 nhóm 070 — phím tắt màn bán hàng (vai `gdv`).
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): `CreateOrderPage.jsx:1300-1410` (`handleShortcutKeyDown` gắn
 * `document` keydown; F1 tab mới · F2 đóng tab · F3/F4/F6 ô tìm · F7 lưu nháp · F8 thanh toán sau ·
 * F10 CTKM · F11 khách · Home dòng đầu · ↑↓ · +/- · Enter thanh toán — Enter bỏ qua khi con trỏ trong ô
 * nhập hoặc ngay sau chuỗi gõ < 150ms) · `UnifiedScanReceiver` (F9 kết nối cân) · nút bàn phím ở thanh
 * trên mở bảng "Phím tắt".
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('./pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, dongBill, sp } = p;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Rời mọi ô nhập, đặt chuột chỗ trống. */
async function nghi(page) {
	await page.mouse.move(600, 700);
	await page.evaluate(() => document.activeElement?.blur?.());
	await page.locator('body').click({ position: { x: 600, y: 650 } });
	await page.waitForTimeout(300);
}

const hopTT = (page) => page.getByRole('dialog').filter({ hasText: /Thanh toán|Khách cần trả|Tiền khách đưa/ }).last();

test.describe('18_1 — Phím tắt', () => {
	test.describe.configure({ timeout: 180_000 });
	let st;

	test.beforeEach(async ({ page }) => {
		st = await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_1_070_001 — Bảng Phím tắt liệt kê đủ 14 phím', async ({ page }) => {
		chanNeuTat('18_1_070_001');
		await nghi(page);
		// Nút icon bàn phím nằm giữa "Trở về" và nút "swap".
		await page.locator('.ant-tabs-extra-content button.ant-btn-icon-only').first().click();
		// Bảng là POPOVER (🚫 không phải dialog).
		const hop = page.locator('.ant-popover:visible').filter({ hasText: 'Phím tắt' }).last();
		await expect(hop).toBeVisible({ timeout: 10_000 });
		const t = chuan(await hop.innerText());
		test.info().annotations.push({ type: 'bảng phím tắt', description: t.slice(0, 600) });
		for (const k of ['F1', 'F2', 'F3', 'F4', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'Home', 'Enter']) {
			expect(t, `Bảng phím tắt thiếu ${k}`).toMatch(new RegExp(`\\b${k}\\b`));
		}
		expect(t, 'Thiếu phím mũi tên lên/xuống').toMatch(/↑|↓|mũi tên|Arrow/i);
		expect(t, 'Thiếu phím cộng/trừ').toMatch(/\+|cộng/);
	});

	test('18_1_070_002 — Phím F7 lưu đơn nháp', async ({ page }) => {
		chanNeuTat('18_1_070_002');
		await p.them(page, sp().tc);
		await nghi(page);
		const cho = page.waitForResponse((r) => /\/spa\/orders\/draft\/v2|\/orders\/draft\/body\//.test(r.url()) && r.request().method() !== 'GET', { timeout: 30_000 });
		await page.keyboard.press('F7');
		const b = await (await cho).json();
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		const id = b?.data?.orderId ?? b?.data?.id ?? b?.data;
		expect(await p.donTrongDs(page, st, id), `Không thấy đơn nháp ${id} ở danh sách`).toBeTruthy();
	});

	test('18_1_070_003 — Phím F8 tạo đơn thanh toán sau', async ({ page }) => {
		chanNeuTat('18_1_070_003');
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
		await p.them(page, sp().tc);
		await nghi(page);
		const tb = page.locator('.ant-message-notice');
		const cho = page.waitForResponse((r) => /spa-checkout/.test(r.url()) && r.request().method() === 'POST', { timeout: 20_000 });
		await page.keyboard.press('F8');
		const r = await cho;
		await page.waitForTimeout(2_000);
		const msg = chuan((await tb.allInnerTexts()).join(' | '));
		const hop = page.getByRole('dialog');
		test.info().annotations.push({ type: 'F8 (đo)', description: `${r.url().split('__api')[1]} → ${r.status()} · "${msg}" · dialog ${await hop.count()}` });
		expect(msg, 'F8 báo lỗi').not.toMatch(/không thể|lỗi/i);
		expect((await hop.count()) > 0 || /thành công/i.test(msg), 'F8 không mở màn / không tạo đơn thanh toán sau').toBe(true);
	});

	test('18_1_070_004 — Phím F10 mở danh sách khuyến mại', async ({ page }) => {
		chanNeuTat('18_1_070_004');
		await p.them(page, sp().tc);
		await nghi(page);
		await page.keyboard.press('F10');
		const hop = page.getByRole('dialog').last();
		await expect(hop, 'F10 không mở bảng khuyến mại').toBeVisible({ timeout: 15_000 });
		expect(chuan(await hop.innerText())).toMatch(/khuyến mại/i);
	});

	test('18_1_070_005 — Phím Enter mở màn thanh toán', async ({ page }) => {
		chanNeuTat('18_1_070_005');
		await p.them(page, sp().tc);
		await nghi(page);
		await page.waitForTimeout(400);
		await page.keyboard.press('Enter');
		await expect(page.getByRole('dialog').last(), 'Enter không mở màn thanh toán').toBeVisible({ timeout: 15_000 });
	});

	test('18_1_070_006 — Enter KHÔNG mở thanh toán khi con trỏ trong ô nhập', async ({ page }) => {
		chanNeuTat('18_1_070_006');
		await p.them(page, sp().tc);
		await page.keyboard.press('Escape');
		await page.getByPlaceholder('Nhập ghi chú').click();
		await page.waitForTimeout(400);
		await page.keyboard.press('Enter');
		await page.waitForTimeout(2_000);
		await expect(page.getByRole('dialog'), '🔴 Enter trong ô nhập vẫn mở thanh toán').toHaveCount(0);
	});

	test('18_1_070_007 — Phím tắt tạm ngưng khi đang mở cửa sổ', async ({ page }) => {
		chanNeuTat('18_1_070_007');
		await p.them(page, sp().tc);
		await nghi(page);
		await page.keyboard.press('F10');
		await expect(page.getByRole('dialog').last()).toBeVisible({ timeout: 15_000 });
		await page.keyboard.press('F1');
		await page.waitForTimeout(1_000);
		await expect(p.tabs(page), '🔴 F1 vẫn mở tab khi đang có cửa sổ').toHaveCount(1);
	});

	test('18_1_070_008 — Phím tắt chỉ có tác dụng trên màn bán hàng', async ({ page }) => {
		chanNeuTat('18_1_070_008');
		await p.moTrang(page, `${process.env.VNPOST_BASE_URL}/order/created-orders`, p.VAI);
		await page.waitForTimeout(3_000);
		const url = page.url();
		for (const k of ['F1', 'F2', 'F7', 'F10']) {
			await page.locator('body').click({ position: { x: 700, y: 700 } });
			await page.keyboard.press(k);
			await page.waitForTimeout(600);
		}
		expect(page.url()).toBe(url);
		await expect(page.getByRole('dialog')).toHaveCount(0);
	});
});
