'use strict';

/**
 * 18_2_010_012 — đổi khách SAU khi đã áp CTKM dành riêng nhóm khách ⇒ tính lại ưu đãi (vai `gdv`).
 * Dựng (26/09/2026, `ctkm-nhom.js`): khách A + khách B (khách rác của làn), nhóm TUỲ CHỈNH chỉ gồm A (targetType 3, memberIds),
 * CTKM theo đơn giảm 10% cho nhóm đó, phạm vi chỉ điểm bán làn. Dừng CTKM + xoá nhóm ở `finally`. 🚫 Không thanh toán.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const nhom = require('./ctkm-nhom');

const GOC = path.join(__dirname, '..');

test('18_2_010_012 — 🔴 Đổi khách SAU khi đã áp CTKM thì tính lại toàn bộ ưu đãi', async ({ page, browser }) => {
	const i = loadCaseInput(GOC, '18_2_010_012');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(360_000);
	await p.chanIn(page);
	const st = await p.moBan(page, test);
	const a = await p.taoKhach(page, st);
	const b = await p.taoKhach(page, st);
	const km = await nhom.tao(browser, { ten: `AUTO${process.env.VNPOST_LANE || ''}_18_2_010_012_${Date.now().toString().slice(-6)}`, memberIds: [a.customerId] });
	try {
		await p.moBan(page, test);
		await p.chonKhach(page, a.customerName);
		await p.them(page, p.sp().tc);
		const t0 = await p.tongKet(page);
		const duoc = await nhom.apKm(page, km.tenKm);
		const tA = await p.tongKet(page);
		expect(duoc, `Khách A (thuộc nhóm) mà CTKM nhóm "${km.tenKm}" bị khoá`).toBe(true);
		const giamA = tA.sauVat - tA.canThanhToan;
		expect(giamA, 'Áp CTKM nhóm 10% mà đơn không được giảm đủ 10%').toBeGreaterThanOrEqual(tA.sauVat * 0.1);
		// 🔴 Popover thông tin khách A che ô chọn khách ⇒ đóng popover, bỏ khách A rồi mới chọn B.
		await page.keyboard.press('Escape').catch(() => null);
		await page.mouse.move(600, 700);
		await p.boKhach(page);
		await p.chonKhach(page, b.customerName);
		await page.waitForTimeout(3_000);
		const tB = await p.tongKet(page);
		const giamB = tB.sauVat - tB.canThanhToan;
		const { hop, dong } = await nhom.moBangKm(page);
		const d = dong(km.tenKm);
		const conTick = (await d.count()) ? await d.locator('.ant-checkbox-checked').count() : 0;
		const khoa = (await d.count()) ? await d.locator('.ant-checkbox-disabled').count() : -1;
		await page.keyboard.press('Escape');
		test.info().annotations.push({ type: 'đo', description: `chưa áp ${JSON.stringify(t0)} · khách A: giảm ${giamA} · đổi sang B: giảm ${giamB} · CTKM nhóm với B: tick ${conTick}, khoá ${khoa}` });
		expect(conTick, '🔴 Đổi sang khách B (ngoài nhóm) mà CTKM nhóm A vẫn tick trên đơn').toBe(0);
		expect(giamB, '🔴 Đổi sang khách B mà tiền giảm của CTKM nhóm A vẫn giữ').toBeLessThan(giamA);
		void hop;
	} finally {
		await p.donTab(page).catch(() => null);
		await km.don();
	}
});
