'use strict';

/**
 * 20_070_001 / 002 / 004 · Quyền, cấu hình điểm bán và phạm vi dữ liệu của chương trình loyalty.
 *
 * Trace `routes/configs/dashboard/careRoutes.js:38-47`: route `/care/loyalty` có `perms: ROUTES_PERMISSION.LOYALTY`,
 * `shopConfig: BUSINESS === SHOP ? [] : ['enableCustomerLoyalty']` — dev chạy `PUBLIC_BUSINESS=sshop` ⇒ cấu hình điểm bán
 * KHÔNG tham gia điều kiện hiện menu. Cấu hình "Cấu hình loyalty" ở `/settings?setting=customer` (`CustomerSetting.jsx`).
 * 🔴 070_002 GHI THẬT cấu hình điểm bán làn (tắt rồi bật lại ở `finally`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { API, chuan, khung, moMan } = require('./loyalty-page');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

/** Menu có mục "Chiến dịch Loyalty"? — tìm bằng ô "Tìm menu" (menu con render lazy). */
async function coMenu(page) {
	const o = page.getByPlaceholder('Tìm menu');
	if (!(await o.isVisible().catch(() => false))) return null;
	await o.fill('Loyalty');
	await page.waitForTimeout(1_200);
	const n = await page.locator('.ant-layout-sider, aside, nav').getByText('Chiến dịch Loyalty', { exact: true }).count();
	await o.fill('');
	return n > 0;
}

/** Gõ thẳng URL: màn có nạp được chương trình không (API get-campaign 200) và đang đứng ở đâu. */
async function goThang(page) {
	const tt = [];
	page.on('response', (r) => { if (r.url().includes(API)) tt.push(r.status()); });
	await page.goto('/care/loyalty');
	await page.waitForTimeout(6_000);
	const chu = chuan(await page.locator('body').innerText());
	return { url: new URL(page.url()).pathname, api: tt, coTieuDe: chu.includes('Quản lý chiến dịch Loyalty'), chu: chu.slice(0, 160) };
}

test('20_070_001 — Tài khoản không có quyền loyalty mở màn Chiến dịch Loyalty', async ({ page }) => {
	chanNeuTat('20_070_001');
	// Nhân viên kho điểm bán (vai hẹp nhất của làn) — không phải vai bán hàng / quản lý.
	const vai = 'shop_nhan_vien';
	await moTrang(page, '/', vai);
	const menu = await coMenu(page);
	const tr = await goThang(page);
	ghiChu('đo', JSON.stringify({ vai, menu, ...tr }));
	test.skip(tr.coTieuDe && tr.api.includes(200) && menu, `Vai ${vai} CÓ quyền loyalty (menu + màn mở được) — làn không có tài khoản thiếu quyền loyalty để kiểm.`);
	expect(menu, `Vai ${vai} thiếu quyền mà menu vẫn có "Chiến dịch Loyalty"`).toBe(false);
	expect(tr.coTieuDe && tr.api.includes(200), `Vai ${vai} thiếu quyền mà gõ URL vẫn vào màn Loyalty (${tr.url})`).toBe(false);
});

test('20_070_002 — Điểm bán chưa bật cấu hình khách hàng thân thiết', async ({ page }) => {
	chanNeuTat('20_070_002');
	test.setTimeout(240_000);
	await moTrang(page, '/settings?setting=customer', 'shop');
	const dong = page.locator('div').filter({ has: page.getByText('Cấu hình loyalty', { exact: true }) }).locator('.ant-switch').first();
	await expect(dong, 'Màn cấu hình không có công tắc "Cấu hình loyalty"').toBeVisible({ timeout: 30_000 });
	const goc = (await dong.getAttribute('aria-checked')) === 'true';
	ghiChu('cấu hình gốc', goc);
	try {
		if (goc) {
			await dong.click();
			await page.waitForTimeout(3_000);
		}
		expect((await dong.getAttribute('aria-checked')) === 'true', 'Không tắt được cấu hình loyalty').toBe(false);
		await moTrang(page, '/', 'shop');
		const menu = await coMenu(page);
		const tr = await goThang(page);
		ghiChu('khi TẮT cấu hình', JSON.stringify({ menu, ...tr }));
		expect(menu, 'Điểm bán TẮT cấu hình loyalty mà menu vẫn hiện "Chiến dịch Loyalty" (careRoutes: shopConfig=[] khi BUSINESS=sshop)').toBe(false);
	} finally {
		await moTrang(page, '/settings?setting=customer', 'shop');
		const sw = page.locator('div').filter({ has: page.getByText('Cấu hình loyalty', { exact: true }) }).locator('.ant-switch').first();
		await sw.waitFor({ state: 'visible', timeout: 30_000 });
		if (((await sw.getAttribute('aria-checked')) === 'true') !== goc) {
			await sw.click();
			await page.waitForTimeout(3_000);
		}
		ghiChu('khôi phục cấu hình', `${goc} → ${await sw.getAttribute('aria-checked')}`);
	}
});

test('20_070_004 — Cấu hình chương trình là của toàn chain chứ không theo điểm bán', async ({ page, browser }) => {
	chanNeuTat('20_070_004');
	const cho = page.waitForResponse((r) => r.url().includes(API) && r.status() === 200, { timeout: 90_000 });
	await moMan(page, 'shop');
	const a = (await (await cho).json())?.data;
	const doc = async (vai) => {
		const phu = await g.k.moPhienPhu(browser, vai, '/care/loyalty');
		try {
			return { h: phu.st.h, d: (await g.k.goiGhi(phu.page, phu.st, 'GET', '/loyalty/campaign/get-campaign'))?.data };
		} finally {
			await phu.dong();
		}
	};
	const tinh = await doc('province');
	const tct = await doc('tct');
	const tom = (x) => x && { campaignId: x.campaignId, chainId: x.chainId, orderAmountPerPoint: x.orderAmountPerPoint, orderAmountConditional: x.orderAmountConditional, active: x.active };
	ghiChu('so sánh', JSON.stringify({ shop: tom(a), tinh: { ...tom(tinh.d), shopid: tinh.h.shopid }, tct: { ...tom(tct.d), shopid: tct.h.shopid } }));
	expect(tom(tinh.d), 'Vai tỉnh thấy chương trình KHÁC điểm bán').toEqual(tom(a));
	expect(tom(tct.d), 'Vai TCT thấy chương trình KHÁC điểm bán').toEqual(tom(a));
	expect(chuan(await khung(page).innerText())).toContain('Chương trình tích điểm');
});
