'use strict';

/**
 * CTKM QUÀ TẶNG theo đơn cho điểm bán seed của làn — BẬT trong beforeAll, DỪNG trong afterAll của spec cần quà
 * (18_1 qua-tang, 18_5 qua-tang). 🔴 Không để CTKM chạy thường trực: nó tự áp vào MỌI đơn của điểm bán ⇒ các spec
 * 18_x khác (bán đơn, đổi trả, tổng tiền) lệch theo.
 * Payload theo vnpost-web `campaignManagement/controllers/CampaignManagementControllers.jsx` (giftItems khi ORDER)
 * + khuôn 19_130_002 (`marketing/campaign/v2/create`, `v2/change-status STOP`), phạm vi CHỈ điểm bán làn.
 * Quà = 1 × SP FIFO của làn (khác SP TC bán ra, để dòng quà tách bạch). Chạy bằng phiên phụ vai `tct`.
 * Hai LOẠI quà (vẽ ở hai nhánh khác nhau của `SelectedProductsTable.jsx`, đều là `tr.promotion-product-row`):
 * - `DON`: quà theo ĐƠN (promotionScope ORDER, applyGift + giftItems) ⇒ khối riêng "Quà tặng đơn hàng".
 * - `SP` : quà theo SẢN PHẨM (promotionScope PRODUCT, productPromotionType GIFT_PRODUCT, productPromotions[
 *          { giftFormType FREE_GIFT_PRODUCT, sản phẩm điều kiện = SP TC, minQuantity 1, giftItems }]) ⇒ dòng con dưới SP TC.
 */

const { expect } = require('@playwright/test');
const p = require('./pos-18');
const seed = require('../../00_seed/seed-state');
const { chon } = require('../../shared/db/otp');

const TEN = (loai = 'DON') => `AUTO${process.env.VNPOST_LANE || 'x'}_KM_QUA_${loai}_18_${Date.now().toString().slice(-6)}`; // tên CTKM phải duy nhất (BE "Tên chiến dịch đã tồn tại")
const donVi = (sku) => {
	const [productUnitId, productId, variantId, unit] = chon(
		`select product_unit_id, product_id, variant_id, unit from CHAIN_PRODUCT_UNIT where sku='${sku}' and variant_id is not null limit 1`,
		'VNPOST_CORE',
	).split('\t');
	expect(productId, `Không tìm được đơn vị SP ${sku}`).toBeTruthy();
	return { productUnitId: Number(productUnitId), productId: Number(productId), variantId: Number(variantId), unit };
};

/** Tạo CTKM quà loại `DON` | `SP` (hiệu lực 1 ngày) ⇒ { campaignId, loai, ten, qua: { sku, ten } }. */
async function bat(browser, loai = 'DON') {
	const d = seed.doc().duLieu;
	const fifo = d.sanPham.sanPhamTheoGiaVon.fifo;
	const tc = d.sanPham.sanPhamTheoGiaVon.tieuChuan;
	const q = donVi(fifo.sku);
	const qua = [{ id: null, productId: q.productId, variantId: q.variantId, productUnitId: q.productUnitId, categoryId: null, sku: fifo.sku, unit: q.unit, quantity: 1 }];
	const theoSp = loai === 'SP';
	const dk = theoSp ? donVi(tc.sku) : null;
	const ten = TEN(loai);
	const ps = await p.k.moPhienPhu(browser, 'tct', '/promotion/campaign');
	try {
		const bd = Date.now() - 60_000;
		const km = await p.k.goiGhi(ps.page, ps.st, 'POST', '/marketing/campaign/v2/create', { shopId: ps.st.h.shopid }, {
			promotionName: ten, totalBudget: null, allocateBudgetByScope: false, applyOfflinePromotion: false,
			allowCombineWithOtherPromotions: true, promotionPriority: 1, provinceCanReallocateBudget: false,
			promotionScope: theoSp ? 'PRODUCT' : 'ORDER', productPromotionType: theoSp ? 'GIFT_PRODUCT' : null, conditionId: null, customerGroupId: null,
			description: 'AUTO TEST KHONG DUNG — CTKM quà tặng 18_x (tự dừng sau spec)', startTime: bd, endTime: bd + 86_400_000,
			startTimeFrame: null, endTimeFrame: null, applyScopeLevel: 'DIEM_BAN_CU_THE', savedStatus: 1,
			scopes: [{ id: null, scopeType: 'DIEM_BAN', orgUnitCode: d.diemBan.maShop }], budgetScopes: [],
			applyRealtime: false, allowPoint: true,
			...(theoSp
				? {
					orderDiscountBase: null, orderDiscountUnit: null, orderDiscountValue: null, applyGift: false, giftItems: null,
					productPromotions: [{
						id: null, minQuantity: 1, giftFormType: 'FREE_GIFT_PRODUCT', applyByQuantity: false, allowPoint: false, applyToClearance: false,
						productId: dk.productId, productUnitId: dk.productUnitId, sku: tc.sku, giftItems: qua,
					}],
				}
				: { orderDiscountBase: 'TOTAL_AMOUNT', orderDiscountUnit: 'VND', orderDiscountValue: 0, applyGift: true, giftItems: qua, productPromotions: null }),
			birthdayPromotionType: 'NONE', mutualExclusionActionType: 'BLOCK', mutualExclusionCampaignIds: [],
		});
		expect(String(km?.status?.code), `Tạo CTKM quà tặng (${loai}) lỗi: ${JSON.stringify(km?.status)}`).toBe('200');
		const campaignId = km?.data?.campaignId ?? km?.data?.id ?? km?.data;
		return { campaignId, loai, ten, qua: { sku: fifo.sku, ten: fifo.tenSanPham } };
	} finally {
		await ps.dong();
	}
}

async function tat(browser, campaignId) {
	if (!campaignId || typeof campaignId === 'object') return null;
	const ps = await p.k.moPhienPhu(browser, 'tct', '/promotion/campaign');
	try {
		return (await p.k.goiGhi(ps.page, ps.st, 'PUT', '/marketing/campaign/v2/change-status', {}, { campaignId, action: 'STOP' }))?.status;
	} finally {
		await ps.dong();
	}
}

/** Hai loại quà để chạy lặp các case (`for (const L of LOAI) test.describe(...)`). */
const LOAI = [
	{ ma: 'DON', nhan: 'quà theo đơn' },
	{ ma: 'SP', nhan: 'quà theo sản phẩm' },
];

module.exports = { bat, tat, TEN, LOAI };
