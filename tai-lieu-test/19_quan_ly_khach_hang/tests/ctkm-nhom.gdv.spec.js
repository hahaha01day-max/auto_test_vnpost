'use strict';

/**
 * 19_130_002 · CTKM theo nhóm đối tượng cập nhật realtime trên đơn — vai `gdv` (POS), dữ liệu dựng bằng phiên phụ `tct`.
 *
 * Dựng: khách rác (0 đơn) · nhóm rác điều kiện "Tổng tiền hàng đã mua ∈ (200.000, 400.000]" · CTKM rác theo ĐƠN giảm 10%,
 * `customerGroupId` = nhóm, `applyRealtime: true`, phạm vi CHỈ điểm bán của làn (`DIEM_BAN_CU_THE`).
 * Trace: `campaignManagement/controllers/CampaignManagementControllers.jsx` (payload) · `marketing/campaign/v2/create` ·
 * `v2/change-status {campaignId, action:'STOP'}` · POS `OrderCampaignSelection.jsx:567` (applyRealtime ⇒ nhóm đã chốt + nhóm dự kiến).
 * Kỳ vọng: giỏ 1 × SP (100k) — khách CHƯA đủ nhóm ⇒ CTKM không áp; thêm lên 3 × (300k) ⇒ CTKM áp ngay trên đơn, không tải lại.
 * 🔴 GHI THẬT: CTKM + nhóm rác, dừng/xoá ở `finally`. 🚫 Không thanh toán đơn.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const seed = require('../../00_seed/seed-state');
const g = require('./khach-ghi');
const n = require('./nhom-ghi');

const GOC = path.join(__dirname, '..');
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

async function moBangKm(page) {
	await page.getByRole('button', { name: /Chương trình khuyến m[ãạ]i/i }).first().click({ force: true });
	const hop = page.getByRole('dialog').last();
	await expect(hop).toBeVisible({ timeout: 15_000 });
	const tab = hop.getByRole('tab', { name: 'Theo đơn hàng' });
	if (await tab.isVisible().catch(() => false)) await tab.click();
	await page.waitForTimeout(1_500);
	return hop;
}

test('19_130_002 — Thêm CTKM theo nhóm đối tượng cập nhật realtime trên đơn', async ({ page, browser }) => {
	const i = loadCaseInput(GOC, '19_130_002');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	test.setTimeout(420_000);
	const st = await p.moBan(page, test);
	const kh = await g.taoKhachApi(page, st, g.khachMoi('130_002'));
	const tct = await g.k.moPhienPhu(browser, 'tct', '/promotion/campaign');
	const hauTo = Date.now().toString().slice(-6);
	const tenKm = `${g.TIEN_TO}_KM_130_002_${hauTo}`;
	let groupId = null;
	let campaignId = null;
	try {
		groupId = await n.taoNhomApi(tct.page, tct.st, {
			ten: `${g.TIEN_TO}_NHOM_130_002_${hauTo}`,
			conditions: [
				{ conditionType: 1, operator: 1, valueNumeric: 200_000, valueInt: null, valueDate: null },
				{ conditionType: 1, operator: 4, valueNumeric: 400_000, valueInt: null, valueDate: null },
			],
		});
		const maShop = seed.doc().duLieu.diemBan.maShop;
		const bd = Date.now() - 60_000;
		const km = await g.k.goiGhi(tct.page, tct.st, 'POST', '/marketing/campaign/v2/create', { shopId: tct.st.h.shopid }, {
			promotionName: tenKm, totalBudget: null, allocateBudgetByScope: false, applyOfflinePromotion: false,
			allowCombineWithOtherPromotions: true, promotionPriority: 1, provinceCanReallocateBudget: false,
			promotionScope: 'ORDER', productPromotionType: null, conditionId: null, customerGroupId: groupId,
			description: 'AUTO TEST KHONG DUNG — CTKM rác 19_130_002', startTime: bd, endTime: bd + 86_400_000,
			startTimeFrame: null, endTimeFrame: null, applyScopeLevel: 'DIEM_BAN_CU_THE', savedStatus: 1,
			scopes: [{ id: null, scopeType: 'DIEM_BAN', orgUnitCode: maShop }], budgetScopes: [],
			applyRealtime: true, allowPoint: false, orderDiscountBase: 'TOTAL_AMOUNT', orderDiscountUnit: 'PERCENT',
			orderDiscountValue: 10, applyGift: false, giftItems: null, productPromotions: null,
			birthdayPromotionType: 'NONE', mutualExclusionActionType: 'BLOCK', mutualExclusionCampaignIds: [],
		});
		ghiChu('tạo CTKM', JSON.stringify(km?.status));
		expect(String(km?.status?.code), `Tạo CTKM rác lỗi: ${JSON.stringify(km?.status)}`).toBe('200');
		campaignId = km?.data?.campaignId ?? km?.data?.id ?? km?.data;
		ghiChu('dựng', `nhóm ${groupId} · CTKM ${campaignId} ${tenKm} · điểm bán ${maShop}`);

		// Mở lại POS để nạp danh sách CTKM mới.
		await p.moBan(page, test);
		await p.chonKhach(page, kh.ten);
		await p.them(page, p.sp().tc);
		await page.waitForTimeout(2_000);
		const t1 = await p.tongKet(page);
		let hop = await moBangKm(page);
		const dong1 = hop.locator('.promotion-program-modal__table-row, tr').filter({ hasText: tenKm }).first();
		const truoc = (await dong1.count()) ? p.chuan(await dong1.innerText()) : '(không có dòng)';
		const khoa1 = (await dong1.count()) ? await dong1.locator('.ant-checkbox-disabled').count() : -1;
		ghiChu('1 SP (100k)', `tổng ${JSON.stringify(t1)} · dòng CTKM: ${truoc} · checkbox khoá: ${khoa1}`);
		await page.keyboard.press('Escape');
		await page.waitForTimeout(800);

		await p.them(page, p.sp().tc);
		await p.them(page, p.sp().tc);
		await page.waitForTimeout(3_000);
		const t2 = await p.tongKet(page);
		hop = await moBangKm(page);
		const dong2 = hop.locator('.promotion-program-modal__table-row, tr').filter({ hasText: tenKm }).first();
		await expect(dong2, `Giỏ 300k (đủ nhóm realtime) mà bảng khuyến mại không có CTKM "${tenKm}"`).toBeVisible({ timeout: 15_000 });
		const sau = p.chuan(await dong2.innerText());
		const khoa2 = await dong2.locator('.ant-checkbox-disabled').count();
		const tick = await dong2.locator('.ant-checkbox-checked').count();
		ghiChu('3 SP (300k)', `tổng ${JSON.stringify(t2)} · dòng CTKM: ${sau} · khoá ${khoa2} · đã tick ${tick}`);
		expect(khoa2, 'Đủ điều kiện nhóm realtime mà CTKM vẫn bị khoá').toBe(0);
		if (!tick) await dong2.locator('.ant-checkbox').first().click();
		const xn = hop.getByRole('button', { name: /Áp dụng|Xác nhận|Đồng ý/ }).last();
		if (await xn.isVisible().catch(() => false)) await xn.click();
		await page.waitForTimeout(3_000);
		const t3 = await p.tongKet(page);
		ghiChu('sau áp CTKM', JSON.stringify(t3));
		// Đo bằng MỨC GIẢM trên đơn (điểm bán có thể có CTKM khác đang chạy, vd giảm cố định 5.000đ):
		// giỏ 100k chưa đủ nhóm ⇒ giảm < 10%; giỏ 300k đủ nhóm realtime ⇒ giảm ≥ 10% ngay, không tải lại.
		const giam1 = t1.sauVat - t1.canThanhToan;
		const giam3 = t3.sauVat - t3.canThanhToan;
		ghiChu('mức giảm', `100k: ${giam1} · 300k: ${giam3}`);
		expect(khoa1, `Giỏ 100k (CHƯA đủ nhóm) mà CTKM nhóm không bị khoá: ${truoc}`).toBeGreaterThan(0);
		expect(giam1, 'Giỏ 100k đã được giảm 10% theo CTKM nhóm').toBeLessThan(t1.sauVat * 0.1);
		expect(giam3, 'Giỏ 300k đủ nhóm realtime mà đơn không được giảm 10%').toBeGreaterThanOrEqual(t3.sauVat * 0.1);
	} finally {
		await p.donTab(page).catch(() => null);
		if (campaignId && typeof campaignId !== 'object') {
			const b = await g.k.goiGhi(tct.page, tct.st, 'PUT', '/marketing/campaign/v2/change-status', {}, { campaignId, action: 'STOP' });
			ghiChu('dừng CTKM', JSON.stringify(b?.status));
		}
		if (groupId) ghiChu('xoá nhóm', JSON.stringify((await n.xoaNhomApi(tct.page, tct.st, groupId))?.status));
		await tct.dong();
	}
});
