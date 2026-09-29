'use strict';

/**
 * Helper 11_khuyen_mai nhóm 090–130 — dựng CTKM mẫu bằng API rồi đo chiết khấu trên ĐƠN BÁN THẬT (vai `gdv`, điểm bán seed làn).
 *
 * Payload theo vnpost-web `pages/promotionCampaign/campaignManagement/controllers/CampaignManagementControllers.jsx` (26/09/2026):
 * - ĐƠN HÀNG: promotionScope ORDER, orderDiscountUnit PERCENT|VND, orderDiscountValue, applyGift + giftItems, conditionId (điều kiện
 *   đơn tối thiểu — `POST /marketing/condition/create-condition` `{ conditionName, invoiceValue: { invoiceType: 'ORDER', minimumValue } }`),
 *   customerGroupId. "Giảm sau CT khác" = `promotionPriority` ≥ 2 ("Thứ tự được trừ": tính trên số còn lại sau CTKM ưu tiên cao hơn;
 *   `applyAfterOtherCampaigns` FE đã comment).
 * - SẢN PHẨM / DANH MỤC: promotionScope PRODUCT|CATEGORY + productPromotionType:
 *   DISCOUNT_SALE (giảm chính SP; nhiều mức = nhiều dòng minQuantity) · GIFT_PRODUCT (giftFormType FREE_GIFT_PRODUCT|FREE_GIFT_CATEGORY,
 *   giftItems) · BUY_LOWER_PRICE (mua A giảm B — attachedProducts SP hoặc danh mục, discountUnit/Value, applyByQuantity).
 * Phạm vi CHỈ điểm bán làn (`DIEM_BAN_CU_THE`), tên duy nhất (hậu tố thời gian), `don()` dừng hết CTKM đã tạo. Phiên phụ vai `tct`.
 * SP mẫu của kịch bản ánh xạ vào SP seed (giá bảng giá seed): PROMOTE_1/"ĐH 1" = TC 100.000 · SP "B"/PROMOTE_6 = FIFO · SP chỉ định
 * ("Vở Hồng Hà", quà) = BT Xanh · combo = `duLieu.combo`.
 */

const { expect } = require('@playwright/test');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const seed = require('../../00_seed/seed-state');
const { chon } = require('../../shared/db/otp');

const hau = () => Date.now().toString().slice(-6);

/** Thông tin bán của SP mẫu: TC · FIFO · BT (Xanh) · COMBO. */
function sp(key) {
	const d = seed.doc().duLieu;
	const g = d.sanPham.sanPhamTheoGiaVon;
	const bt = d.sanPham.sanPhamBienThe.skus.find((x) => x.bienThe === 'Xanh' && x.heSo === 1);
	const m = {
		TC: { sku: g.tieuChuan.sku, ten: g.tieuChuan.tenSanPham },
		FIFO: { sku: g.fifo.sku, ten: g.fifo.tenSanPham },
		BT: { sku: bt.sku, ten: d.sanPham.sanPhamBienThe.tenSanPham, bienThe: 'Xanh' },
		COMBO: { sku: d.combo?.sku, ten: d.combo?.ten },
	}[key];
	expect(m?.sku, `Thiếu SP mẫu ${key} trong sổ seed`).toBeTruthy();
	const [productUnitId, productId, variantId, unit] = chon(
		`select product_unit_id, product_id, variant_id, unit from CHAIN_PRODUCT_UNIT where sku='${m.sku}' and variant_id is not null order by product_unit_id limit 1`, 'VNPOST_CORE',
	).split('\t');
	return { ...m, productUnitId: Number(productUnitId), productId: Number(productId), variantId: Number(variantId), unit };
}
const quaSp = (key, sl = 1) => { const x = sp(key); return { id: null, productId: x.productId, productUnitId: x.productUnitId, variantId: x.variantId, categoryId: null, sku: x.sku, unit: x.unit, quantity: sl }; };
const dieuKienSp = (key) => { const x = sp(key); return { productId: x.productId, productUnitId: x.productUnitId, sku: x.sku }; };

/** Phiên dựng CTKM: `tao(khai)` ⇒ { campaignId, ten }, `dieuKien(min)` ⇒ conditionId, `don()`. */
async function moPhien(browser) {
	const ps = await p.k.moPhienPhu(browser, 'tct', '/promotion/campaign');
	const daTao = [];
	const goi = (m, u, q, b) => p.k.goiGhi(ps.page, ps.st, m, u, q, b);
	const maShop = seed.doc().duLieu.diemBan.maShop;
	async function tao(khai) {
		const ten = `A${process.env.VNPOST_LANE || ''}_${khai.ten}_${hau()}`;
		const bd = Date.now() - 60_000;
		const body = {
			promotionName: ten, totalBudget: null, allocateBudgetByScope: false, applyOfflinePromotion: false,
			allowCombineWithOtherPromotions: true, promotionPriority: khai.uuTien ?? 1, provinceCanReallocateBudget: false,
			conditionId: khai.conditionId ?? null, customerGroupId: khai.customerGroupId ?? null,
			description: 'AUTO TEST KHONG DUNG — CTKM mẫu 11_khuyen_mai (tự dừng)', startTime: bd, endTime: bd + 86_400_000,
			startTimeFrame: null, endTimeFrame: null, applyScopeLevel: 'DIEM_BAN_CU_THE', savedStatus: 1,
			scopes: [{ id: null, scopeType: 'DIEM_BAN', orgUnitCode: maShop }], budgetScopes: [], applyRealtime: false,
			birthdayPromotionType: 'NONE', mutualExclusionActionType: 'BLOCK', mutualExclusionCampaignIds: khai.loaiTru ?? [],
		};
		if (khai.loai === 'DON') {
			Object.assign(body, {
				promotionScope: 'ORDER', productPromotionType: null, allowPoint: false, orderDiscountBase: 'TOTAL_AMOUNT',
				orderDiscountUnit: khai.unit ?? 'VND', orderDiscountValue: khai.value ?? 0,
				applyGift: Boolean(khai.qua?.length), giftItems: khai.qua?.length ? khai.qua : null, productPromotions: null,
			});
		} else {
			Object.assign(body, {
				promotionScope: khai.loai === 'DM' ? 'CATEGORY' : 'PRODUCT', productPromotionType: khai.cach,
				orderDiscountBase: null, orderDiscountUnit: null, orderDiscountValue: 0, applyGift: null, giftItems: null,
				productPromotions: khai.dong.map((d) => ({ id: null, allowPoint: false, applyToClearance: false, ...d })),
			});
		}
		const r = await goi('POST', '/marketing/campaign/v2/create', { shopId: ps.st.h.shopid }, body);
		expect(String(r?.status?.code), `Tạo CTKM ${ten} lỗi: ${JSON.stringify(r?.status)} · ${JSON.stringify(body).slice(0, 600)}`).toBe('200');
		const campaignId = r?.data?.campaignId ?? r?.data?.id ?? r?.data;
		daTao.push(campaignId);
		return { campaignId, ten };
	}
	async function dieuKien(minimumValue) {
		const ten = `A${process.env.VNPOST_LANE || ''}_DK_${minimumValue}_${hau()}`;
		const r = await goi('POST', '/marketing/condition/create-condition', { chainId: ps.st.h.chainid }, {
			conditionId: null, conditionName: ten, invoiceValue: { invoiceType: 'ORDER', minimumValue }, productValues: [],
		});
		expect(String(r?.status?.code), `Tạo điều kiện đơn ≥ ${minimumValue} lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
		const id = r?.data?.conditionId ?? r?.data?.id ?? (typeof r?.data === 'number' ? r.data : null);
		if (id) return id;
		const ds = await goi('GET', '/marketing/condition/view-all-condition', { chainId: ps.st.h.chainid, page: 0, size: 50, keyword: ten });
		const x = (ds?.data?.content ?? ds?.data ?? []).find((c) => c.conditionName === ten);
		expect(x?.conditionId, `Không tra được điều kiện ${ten}`).toBeTruthy();
		return x.conditionId;
	}
	async function don() {
		for (const id of daTao) if (id && typeof id !== 'object') await goi('PUT', '/marketing/campaign/v2/change-status', {}, { campaignId: id, action: 'STOP' }).catch(() => null);
		await ps.dong();
	}
	return { tao, dieuKien, don, goi, chainId: () => ps.st.h.chainid, page: ps.page, st: ps.st };
}

/** Thêm các dòng `[{ key, sl }]` vào giỏ POS. */
async function themGio(page, dong) {
	for (const d of dong) {
		const x = sp(d.key);
		await p.them(page, x.ten);
		if ((d.sl ?? 1) > 1) {
			const o = p.dongBill(page).filter({ hasText: x.ten }).first().locator('input').first();
			await o.fill(String(d.sl));
			await o.press('Enter');
			await page.waitForTimeout(900);
		}
	}
	await page.waitForTimeout(1_500);
}

/**
 * Chỉ để đúng các CTKM tên `giu` được tick trong bảng khuyến mại POS (mọi tab), bỏ tick phần còn lại (vd "giảm 5k đơn" của chuỗi).
 * Trả { co: tên đang hiện trong bảng, khoa: tên bị khoá }.
 */
/**
 * Hộp "Chọn sản phẩm khuyến mại" (ModalSelectProductsFromCategory) — CTKM tặng/giảm theo DANH MỤC mở hộp này ngay khi tick.
 * Nhập SL cho SP `ten` (đổi loại "Sản phẩm"/"Combo" nếu không thấy), bấm Áp dụng. Trả mô tả đã làm (hoặc '' nếu không có hộp).
 */
async function chonSpDanhMuc(page, chon) {
	const hop = page.getByRole('dialog').filter({ hasText: 'Chọn sản phẩm khuyến mại' }).last();
	if (!(await hop.waitFor({ state: 'visible', timeout: 4_000 }).then(() => true, () => false))) return '';
	await page.waitForTimeout(1_500);
	let dong = hop.locator('tr.ant-table-row').filter({ hasText: chon.ten }).first();
	if (!(await dong.isVisible().catch(() => false))) {
		// Đổi Select loại danh mục (Sản phẩm ⇄ Combo).
		const sel = hop.locator('.ant-select').first();
		const idList = await sel.locator('input').first().getAttribute('aria-controls').catch(() => null);
		await sel.click();
		const dd = idList ? page.locator('.ant-select-dropdown').filter({ has: page.locator(`[id="${idList}"]`) }) : page.locator('.ant-select-dropdown').last();
		await dd.locator('.ant-select-item-option:not(.ant-select-item-option-selected)').first().click().catch(() => null);
		await page.waitForTimeout(2_000);
		dong = hop.locator('tr.ant-table-row').filter({ hasText: chon.ten }).first();
	}
	const noi = p.chuan(await hop.innerText()).slice(0, 250);
	if (!(await dong.isVisible().catch(() => false))) {
		await page.keyboard.press('Escape').catch(() => null);
		await hop.getByRole('button', { name: 'Hủy' }).click().catch(() => null);
		await hop.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => null);
		return `hộp chọn SP không có "${chon.ten}": ${noi}`;
	}
	const o = dong.locator('.ant-input-number-input');
	await o.fill(String(chon.sl ?? 1));
	await o.press('Tab');
	await page.waitForTimeout(500);
	await hop.getByRole('button', { name: 'Áp dụng' }).click();
	await page.waitForTimeout(1_500);
	const conHop = await hop.isVisible().catch(() => false);
	const tb = p.chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
	return `chọn ${chon.sl ?? 1} × ${chon.ten}${conHop ? ` (hộp vẫn mở: "${tb}")` : ''}`;
}

async function chiApKm(page, giu, chonDm) {
	const nut = page.getByRole('button', { name: /Chương trình khuyến m[ãạ]i/i }).first();
	await nut.click({ force: true });
	const hop = page.getByRole('dialog').last();
	await expect(hop).toBeVisible({ timeout: 15_000 });
	const co = [];
	const khoa = [];
	const chon = [];
	const tabs = hop.getByRole('tab');
	const n = Math.max(1, await tabs.count());
	for (let i = 0; i < n; i += 1) {
		if (await tabs.count()) { await tabs.nth(i).click(); await page.waitForTimeout(700); }
		const dong = hop.locator('.ant-tabs-tabpane-active tr, .promotion-program-modal__table-row').filter({ has: page.locator('.ant-checkbox') });
		// 🔴 Tick CTKM có loại trừ làm bảng render lại (dòng bị loại trừ khoá/mất) ⇒ đếm lại mỗi lượt, không chốt số dòng từ đầu.
		for (let j = 0; j < (await dong.count()); j += 1) {
			const d = dong.nth(j);
			const txt = p.chuan(await d.innerText());
			const muon = giu.some((t) => txt.includes(t));
			const cb = d.locator('.ant-checkbox').first();
			const dangTick = (await cb.locator('xpath=self::*[contains(@class,"ant-checkbox-checked")]').count()) > 0;
			const biKhoa = (await cb.locator('xpath=self::*[contains(@class,"ant-checkbox-disabled")]').count()) > 0;
			if (muon) co.push(txt);
			if (muon && biKhoa) khoa.push(txt);
			if (!biKhoa && muon !== dangTick) {
				await cb.click({ timeout: 5_000 }).catch(() => khoa.push(`(không bấm được) ${txt}`));
				await page.waitForTimeout(400);
				if (muon && chonDm) { const r = await chonSpDanhMuc(page, chonDm); if (r) chon.push(r); }
			} else if (muon && dangTick && chonDm) {
				// Đã tự tick (auto select) ⇒ hộp chọn không tự mở; dòng có link "Chọn sản phẩm trong danh mục".
				const link = d.getByRole('button', { name: 'Chọn sản phẩm trong danh mục' });
				if (await link.isVisible().catch(() => false)) { await link.click(); const r = await chonSpDanhMuc(page, chonDm); if (r) chon.push(r); }
				else chon.push(`(đã tick, không có link chọn SP) ${txt.slice(0, 40)}`);
			}
		}
	}
	const xn = hop.getByRole('button', { name: /Áp dụng|Xác nhận|Đồng ý/ }).last();
	if (await xn.isVisible().catch(() => false)) await xn.click();
	else await page.keyboard.press('Escape');
	await page.waitForTimeout(2_500);
	return { co, khoa, chon };
}

/** Chụp số tiền + các dòng bill hiện tại. */
async function doc(page) {
	const t = await p.tongKet(page);
	const dong = (await p.dongBill(page).allInnerTexts()).map(p.chuan);
	const qua = (await page.locator('tr.promotion-product-row').allInnerTexts()).map(p.chuan);
	return { ...t, giam: (t.sauVat ?? 0) - (t.canThanhToan ?? 0), dong, qua };
}

/**
 * SP "hết hàng" có giá: `AUTO<làn>SPHET` trong danh mục seed, bảng giá riêng `AUTO<làn>_BG_SPHET` (phạm vi xã seed, 50.000đ), KHÔNG nhập kho.
 * Idempotent (tra SKU trước). Trả { ten, sku, productId, productUnitId, variantId, unit }.
 */
async function spHetHang(ps) {
	const d = seed.doc().duLieu;
	const lane = process.env.VNPOST_LANE || '';
	const sku = `AUTO${lane}SPHET`;
	const ten = `AUTO${lane}_SP_HET`;
	const co = ((await ps.goi('POST', '/chain/products/bulk-fields', {}, { skus: [sku], fields: ['vatPercent'], activeOnly: true }))?.data || {})[sku];
	if (!co) {
		const r = await ps.goi('POST', '/chain/products', {}, {
			productName: ten, sku, barCode: sku, accountingCode: sku, deductibleTaxPercent: 0, unit: 'Cái', categoryId: Number(d.sanPham.idDanhMuc),
			categoryName: 'Sản phẩm', isTopping: false, distributionMethod: 'MUA_BAN', goodsMaterialType: 'KHONG_PHAN_LOAI', isLoyalty: true, price: 0,
			chainId: Number(ps.chainId()), type: 0, isSell: 1, attributes: [], options: [], variants: [], productUnits: [], images: [], imageUrl: [],
			description: 'AUTO TEST 11_090_009 — SP có giá, không tồn', requireStock: true, quantityWarning: null, stockType: 'MAC', isSerialRequired: false,
			enableVat: true, vatPercent: 0, directTaxPercent: 0, pitTaxPercent: 0, specialProductCategory: null, isIngredient: false, active: true,
			status: 'KICH_HOAT', priceBeforeDiscount: 0, isComposite: false, secondaryBarCodes: [],
		});
		expect(String(r?.status?.code), `Tạo SP hết hàng lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
		const hai = (n) => String(n).padStart(2, '0');
		const t = new Date();
		const tenBg = `AUTO${lane}_BG_SPHET`;
		await ps.goi('POST', '/chain-price-list/create', {}, {
			name: tenBg, versionName: `${tenBg}_PB`, startDate: `${hai(t.getDate())}/${hai(t.getMonth() + 1)}/${t.getFullYear()}`, endDate: null,
			startTime: null, endTime: null, status: 1, includeTax: 1, priceListScopeMode: 'REGION', scopeType: 3,
			scopes: [{ scopeType: 'BUU_DIEN_XA', orgUnitCode: d.diemBan.maXa }], items: [{ sku, unitPrice: 50_000, listedPrice: 50_000, discountRate: 0 }],
		});
		const bg = ((await ps.goi('GET', '/chain-price-list/get-all', { page: 0, size: 10, name: tenBg }))?.data || []).find((x) => x.name === tenBg);
		expect(bg?.priceListId, 'Không tạo được bảng giá SP hết hàng').toBeTruthy();
		await ps.goi('PUT', '/chain-price-list/approve', { priceListId: bg.priceListId });
	}
	const [productUnitId, productId, variantId, unit] = chon(`select product_unit_id, product_id, variant_id, unit from CHAIN_PRODUCT_UNIT where sku='${sku}' and variant_id is not null order by product_unit_id limit 1`, 'VNPOST_CORE').split('\t');
	return { ten, sku, productUnitId: Number(productUnitId), productId: Number(productId), variantId: Number(variantId), unit };
}

module.exports = { spHetHang, chonSpDanhMuc, sp, quaSp, dieuKienSp, moPhien, themGio, chiApKm, doc, p };
