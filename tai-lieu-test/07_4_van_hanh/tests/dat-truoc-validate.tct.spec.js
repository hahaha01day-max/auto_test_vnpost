'use strict';

/**
 * 07_4 · 010 — Validate "Cấu hình nhận đặt hàng trước" (`/settings?setting=bookingReservation`),
 * vai `tct`. KHÔNG GHI — cấu hình CHUỖI dùng chung; mọi request ghi bị chặn ở mạng.
 *
 * Nguồn (vnpost-web af8cda07, `settingContents/ChainBookingReservationPolicySetting.jsx`): form inline
 * `#name` (rule "Vui lòng nhập tên cấu hình"), `#description` (`maxLength=200`, bộ đếm), Phạm vi áp
 * dụng (cây đơn vị; thiếu ⇒ "Vui lòng chọn ít nhất một phạm vi áp dụng").
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

async function moForm(page) {
	const daGui = [];
	await page.route('**/__api/**', async (route) => {
		const r = route.request();
		if (r.method() === 'GET' || /refresh-token|login/.test(r.url())) return route.continue();
		daGui.push(`${r.method()} ${r.url()}`);
		return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=bookingReservation`, 'tct');
	const f = page.locator('.ant-pro-page-container, main').first();
	await expect(f.locator('#name')).toBeVisible({ timeout: 30_000 });
	return { f, daGui };
}

test.describe('07_4 · 010 — Validate cấu hình nhận đặt hàng trước (chặn ghi)', () => {
	test('07_4_010_002 — Chặn lưu khi bỏ trống Tên cấu hình', async ({ page }) => {
		chanNeuTat('07_4_010_002');
		const { f, daGui } = await moForm(page);
		await f.locator('#name').fill('');
		await f.getByRole('button', { name: /Lưu/ }).filter({ visible: true }).last().click();
		await page.waitForTimeout(1_500);
		const loi = [...(await f.locator('.ant-form-item-explain-error').allInnerTexts()), ...(await page.locator('.ant-message-notice').allInnerTexts())].map(chuan).join(' | ');
		expect(loi).toContain('Vui lòng nhập tên cấu hình');
		expect(daGui, 'Bỏ trống tên mà vẫn gửi request lưu').toEqual([]);
	});

	test('07_4_010_004 — Ô Mô tả giới hạn 200 ký tự và có bộ đếm', async ({ page }) => {
		chanNeuTat('07_4_010_004');
		const { f } = await moForm(page);
		const o = f.locator('#description');
		await o.fill('y'.repeat(260));
		expect((await o.inputValue()).length, 'Ô Mô tả nhận quá 200 ký tự').toBe(200);
		await expect(f, 'Bộ đếm không hiện 200 / 200').toContainText('200 / 200');
	});
	test('07_4_010_003 — Chặn lưu khi chưa chọn phạm vi áp dụng', async ({ page }) => {
		chanNeuTat('07_4_010_003');
		const { f, daGui } = await moForm(page);
		await page.waitForTimeout(2_000);
		// Bỏ hết phạm vi đang chọn: gỡ thẻ đã chọn, rồi bỏ tích mọi ô tick còn lại trên cây (chỉ đổi trên form — request lưu bị chặn).
		// RegionSelector: ô tick antd; bấm ô đang tick/mixed (trừ "Hiển thị các đơn vị đã chọn") tới khi bộ đếm "Đã chọn N" về 0.
		const dem = async () => Number((chuan(await f.getByText(/đơn vị\/điểm bán/).first().innerText().catch(() => '')).match(/\d+/) || [0])[0]);
		const truoc = await dem();
		let bo = 0;
		for (let i = 0; i < 80 && (await dem()) > 0; i += 1) {
			const c = f.locator('label.ant-checkbox-wrapper').filter({ has: page.locator('.ant-checkbox-checked, .ant-checkbox-indeterminate') })
				.filter({ hasNotText: 'Hiển thị các đơn vị đã chọn' }).filter({ visible: true }).first();
			if (!(await c.count())) break;
			await c.click(); bo += 1; await page.waitForTimeout(250);
		}
		const sau = await dem();
		const tb = [];
		const nghe = setInterval(async () => { for (const t of await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])) tb.push(chuan(t)); }, 200);
		await f.getByRole('button', { name: /Lưu/ }).filter({ visible: true }).last().click();
		await page.waitForTimeout(2_000);
		clearInterval(nghe);
		const tt = [...new Set(tb)].join(' | ');
		test.info().annotations.push({ type: 'đo', description: `đã chọn ${truoc} → ${sau} sau ${bo} lần bấm · thông báo "${tt}" · request ghi ${JSON.stringify(daGui)}` });
		expect(sau, 'Không bỏ hết được phạm vi trên form').toBe(0);
		expect(tt).toContain(loadCaseInput(GOC, '07_4_010_003').data.thongBao);
		expect(daGui, 'Không có phạm vi mà vẫn gửi request lưu').toEqual([]);
	});
});
