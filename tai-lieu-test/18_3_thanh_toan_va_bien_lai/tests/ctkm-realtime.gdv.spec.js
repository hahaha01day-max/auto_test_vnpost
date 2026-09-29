'use strict';

/**
 * 18_3_080_002 — "Thanh toán sau / một phần" bị chặn với đơn áp CTKM nhóm khách cập nhật REALTIME (vai `gdv`).
 * Trace 26/09/2026 (`OrderCheckoutComponent_v2.jsx` ~dòng 850–885): trước khi chốt, FE xem trước lại nhóm khách với số tiền
 * THẬT SỰ trả (`previewOrderGroupsForCheckout`, totalAmountOverride = paymentAmount); nhóm realtime biến mất ⇒ cảnh báo
 * `CUSTOMER_GROUP_PROMOTION_WARNING` (`customerGroupPreviewUtils.js:6`). Kịch bản gọi nút này là "Đặt hàng trước" — POS hiện
 * nhãn "Thanh toán sau".
 * Dựng (khuôn 19_130_002, `18_2/tests/ctkm-nhom.js`): khách rác 0 đơn; nhóm ĐIỀU KIỆN "Tổng tiền hàng đã mua ∈ (200.000, 400.000]"
 * (khoảng hẹp — nhóm điều kiện áp toàn chuỗi); CTKM theo đơn 10%, `applyRealtime: true`. Giỏ 3 × SP TC (300k) ⇒ khách vào
 * nhóm dự kiến ⇒ CTKM áp. Dọn: dừng CTKM + xoá nhóm ở `finally`. 🚫 Không thanh toán thật.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const nhom = require('../../18_2_khach_hang_va_uu_dai/tests/ctkm-nhom');

const GOC = path.join(__dirname, '..');

test('18_3_080_002 — Nút Đặt hàng trước bị chặn với đơn áp khuyến mại realtime', async ({ page, browser }) => {
	const i = loadCaseInput(GOC, '18_3_080_002');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(360_000);
	await p.chanIn(page);
	const st = await p.moBan(page, test);
	const kh = await p.taoKhach(page, st);
	const km = await nhom.tao(browser, {
		ten: `AUTO${process.env.VNPOST_LANE || ''}_18_3_080_002_${Date.now().toString().slice(-6)}`,
		realtime: true,
		conditions: [
			{ conditionType: 1, operator: 1, valueNumeric: 200_000, valueInt: null, valueDate: null },
			{ conditionType: 1, operator: 4, valueNumeric: 400_000, valueInt: null, valueDate: null },
		],
	});
	try {
		await p.moBan(page, test);
		await p.chonKhach(page, kh.customerName);
		for (let j = 0; j < 3; j += 1) await p.them(page, p.sp().tc);
		await page.waitForTimeout(3_000);
		const duoc = await nhom.apKm(page, km.tenKm);
		const t = await p.tongKet(page);
		const giam = t.sauVat - t.canThanhToan;
		test.info().annotations.push({ type: 'CTKM realtime', description: `${km.tenKm} · tick được ${duoc} · tổng ${JSON.stringify(t)} · giảm ${giam}` });
		expect(duoc, 'Giỏ 300k (đủ nhóm realtime) mà CTKM bị khoá').toBe(true);
		expect(giam, 'CTKM realtime chưa áp vào đơn (giảm < 10%)').toBeGreaterThanOrEqual(t.sauVat * 0.1);
		const ghi = [];
		page.on('request', (r) => { if (/draft-checkout|checkout/.test(r.url()) && r.method() === 'POST') ghi.push(r.url()); });
		await page.mouse.move(600, 700);
		const n = page.locator('.ant-message-notice');
		await page.getByRole('button', { name: 'Thanh toán sau', exact: true }).click();
		// "Thanh toán sau" có thể mở modal xác nhận trước khi kiểm nhóm — bấm tiếp nếu có.
		const m = page.getByRole('dialog').last();
		if (await m.isVisible({ timeout: 3_000 }).catch(() => false)) {
			const xn = m.getByRole('button', { name: /Xác nhận|Đồng ý|Thanh toán sau/ }).last();
			if (await xn.isVisible().catch(() => false)) await xn.click();
		}
		await n.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null);
		await page.waitForTimeout(800);
		const tb = p.chuan((await n.allInnerTexts()).join(' | '));
		test.info().annotations.push({ type: 'đo', description: `"${tb}" · request chốt: ${ghi.length}` });
		expect(tb).toContain('Thanh toán sau hoặc một phần không thể áp dụng cho chương trình khuyến mại cập nhật realtime');
		expect(ghi.length, 'Bị cảnh báo mà vẫn gửi request chốt đơn').toBe(0);
	} finally {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
		await km.don();
	}
});
