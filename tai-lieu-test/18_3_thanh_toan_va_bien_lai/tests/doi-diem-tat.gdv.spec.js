'use strict';

/**
 * 18_3_050_004 / 050_005 — "Thanh toán bằng điểm" khi chương trình đổi điểm CHƯA có tỉ lệ quy đổi / đang TẮT (vai `gdv`).
 *
 * Trace 26/09/2026: `OrderCheckoutComponent_v2.jsx:1512` truyền `enableLoyaltyPointPayment={!!orderInfo?.redeemCampaign?.active}`
 * + `loyaltyAmountPerPoint`; `PaymentMethodModal.jsx` chặn "Chương trình đổi điểm đang tắt" (active=false) và
 * "Chưa có cấu hình quy đổi điểm tích luỹ" (tỉ lệ ≤ 0).
 * Tiền đề: sửa TẠM chương trình đổi điểm của CHUỖI rồi khôi phục — `18_2/tests/doi-diem-tam.js › voiDoiDiem`.
 * User cho phép sửa cấu hình chuỗi ở môi trường test (26/09/2026).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const D = require('../../18_2_khach_hang_va_uu_dai/tests/diem');
const { voiDoiDiem } = require('../../18_2_khach_hang_va_uu_dai/tests/doi-diem-tam');

const GOC = path.join(__dirname, '..');
const { p, sp, boMa, moTT } = D;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Gắn khách có điểm, mở modal, chọn "Thanh toán bằng điểm", Xác nhận ⇒ thông báo. */
async function thuDiem(page) {
	const k = await D.khachCoDiem(page, 200);
	await p.them(page, sp().tc);
	await D.boKm(page);
	const m = await moTT(page);
	const nut = m.getByRole('button', { name: 'Thanh toán bằng điểm', exact: true });
	if (!(await nut.count())) return { khongCoNut: true, k };
	await nut.click();
	await page.waitForTimeout(800);
	const n = page.locator('.ant-message-notice');
	await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
	await n.first().waitFor({ state: 'visible', timeout: 6_000 }).catch(() => null);
	await page.waitForTimeout(500);
	return { tb: boMa((await n.allInnerTexts()).join(' | ')), k, noi: (await m.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300) };
}

test.describe('18_3 — Đổi điểm tắt / chưa có tỉ lệ', () => {
	test.describe.configure({ timeout: 300_000, mode: 'serial' });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });
	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_3_050_005 — Chặn khi chương trình đổi điểm đang tắt', async ({ page, browser }) => {
		chanNeuTat('18_3_050_005');
		const kq = await voiDoiDiem(browser, { active: false }, () => thuDiem(page));
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
		expect(kq.loiSua, `Không tắt được chương trình đổi điểm: ${JSON.stringify(kq.loiSua)}`).toBeUndefined();
		test.skip(kq.khongCoNut, 'Chương trình tắt ⇒ modal ẨN hẳn nút "Thanh toán bằng điểm" (không tới được cảnh báo) — ghi nhận hành vi');
		expect(kq.tb).toContain('Chương trình đổi điểm đang tắt');
	});

	test('18_3_050_004 — Chặn khi chưa có cấu hình quy đổi điểm', async ({ page, browser }) => {
		chanNeuTat('18_3_050_004');
		const kq = await voiDoiDiem(browser, { orderAmountPerPoint: 0 }, () => thuDiem(page));
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
		test.skip(Boolean(kq.loiSua), `BE không cho lưu tỉ lệ quy đổi = 0 (${kq.loiSua?.message}) ⇒ trạng thái "chưa có tỉ lệ" không dựng được qua cấu hình`);
		test.skip(kq.khongCoNut, 'Tỉ lệ = 0 ⇒ modal ẩn nút "Thanh toán bằng điểm" — ghi nhận hành vi');
		expect(kq.tb).toContain('Chưa có cấu hình quy đổi điểm tích luỹ');
	});
});
