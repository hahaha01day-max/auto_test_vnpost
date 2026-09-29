'use strict';

/**
 * Dựng CTKM theo NHÓM KHÁCH cho điểm bán seed của làn (dùng cho 18_2_010_012, 18_3_080_002). Khuôn 19_130_002:
 * nhóm qua `19/tests/nhom-ghi.js › taoNhomApi` (targetType 1 điều kiện · 3 tuỳ chỉnh memberIds), CTKM `marketing/campaign/v2/create`
 * theo ĐƠN giảm %, `customerGroupId`, phạm vi CHỈ điểm bán làn. Chạy bằng phiên phụ `tct`. `don()` dừng CTKM + xoá nhóm.
 * 🔴 Nhóm theo điều kiện áp TOÀN CHUỖI ⇒ khoanh bằng khoảng tiền hẹp để chỉ khách rác vừa tạo lọt vào (xem nhom-ghi.js).
 */

const { expect } = require('@playwright/test');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const seed = require('../../00_seed/seed-state');
const n = require('../../19_quan_ly_khach_hang/tests/nhom-ghi');

/**
 * @param {{ ten: string, memberIds?: number[], conditions?: object[], realtime?: boolean, phanTram?: number }} o
 * ⇒ { groupId, campaignId, tenKm, don() }
 */
async function tao(browser, { ten, memberIds = null, conditions = null, realtime = false, phanTram = 10 }) {
	const ps = await p.k.moPhienPhu(browser, 'tct', '/promotion/campaign');
	let groupId = null;
	let campaignId = null;
	const don = async () => {
		if (campaignId && typeof campaignId !== 'object') await p.k.goiGhi(ps.page, ps.st, 'PUT', '/marketing/campaign/v2/change-status', {}, { campaignId, action: 'STOP' });
		if (groupId) await n.xoaNhomApi(ps.page, ps.st, groupId);
		await ps.dong();
	};
	try {
		groupId = await n.taoNhomApi(ps.page, ps.st, { ten: `${ten}_NHOM`, memberIds, conditions, targetType: memberIds ? 3 : 1 });
		const bd = Date.now() - 60_000;
		const tenKm = `${ten}_KM`;
		const km = await p.k.goiGhi(ps.page, ps.st, 'POST', '/marketing/campaign/v2/create', { shopId: ps.st.h.shopid }, {
			promotionName: tenKm, totalBudget: null, allocateBudgetByScope: false, applyOfflinePromotion: false,
			allowCombineWithOtherPromotions: true, promotionPriority: 1, provinceCanReallocateBudget: false,
			promotionScope: 'ORDER', productPromotionType: null, conditionId: null, customerGroupId: groupId,
			description: 'AUTO TEST KHONG DUNG — CTKM nhóm khách 18_x (tự dừng)', startTime: bd, endTime: bd + 86_400_000,
			startTimeFrame: null, endTimeFrame: null, applyScopeLevel: 'DIEM_BAN_CU_THE', savedStatus: 1,
			scopes: [{ id: null, scopeType: 'DIEM_BAN', orgUnitCode: seed.doc().duLieu.diemBan.maShop }], budgetScopes: [],
			applyRealtime: realtime, allowPoint: false, orderDiscountBase: 'TOTAL_AMOUNT', orderDiscountUnit: 'PERCENT',
			orderDiscountValue: phanTram, applyGift: false, giftItems: null, productPromotions: null,
			birthdayPromotionType: 'NONE', mutualExclusionActionType: 'BLOCK', mutualExclusionCampaignIds: [],
		});
		expect(String(km?.status?.code), `Tạo CTKM nhóm lỗi: ${JSON.stringify(km?.status)}`).toBe('200');
		campaignId = km?.data?.campaignId ?? km?.data?.id ?? km?.data;
		return { groupId, campaignId, tenKm, don };
	} catch (e) {
		await don().catch(() => null);
		throw e;
	}
}

/** Mở bảng CTKM trên POS, tab "Theo đơn hàng" ⇒ { hop, dong(tenKm) }. */
async function moBangKm(page) {
	await page.getByRole('button', { name: /Chương trình khuyến m[ãạ]i/i }).first().click({ force: true });
	const hop = page.getByRole('dialog').last();
	await expect(hop).toBeVisible({ timeout: 15_000 });
	const tab = hop.getByRole('tab', { name: 'Theo đơn hàng' });
	if (await tab.isVisible().catch(() => false)) await tab.click();
	await page.waitForTimeout(1_500);
	return { hop, dong: (ten) => hop.locator('.promotion-program-modal__table-row, tr').filter({ hasText: ten }).first() };
}

/** Tick CTKM `ten` (nếu chưa) và áp dụng. Trả true nếu tick được (không bị khoá). */
async function apKm(page, ten) {
	const { hop, dong } = await moBangKm(page);
	const d = dong(ten);
	await expect(d, `Bảng khuyến mại không có CTKM "${ten}"`).toBeVisible({ timeout: 15_000 });
	const khoa = await d.locator('.ant-checkbox-disabled').count();
	if (!khoa && !(await d.locator('.ant-checkbox-checked').count())) await d.locator('.ant-checkbox').first().click();
	const xn = hop.getByRole('button', { name: /Áp dụng|Xác nhận|Đồng ý/ }).last();
	if (await xn.isVisible().catch(() => false)) await xn.click();
	else await page.keyboard.press('Escape');
	await page.waitForTimeout(2_500);
	return !khoa;
}

module.exports = { tao, moBangKm, apKm };
