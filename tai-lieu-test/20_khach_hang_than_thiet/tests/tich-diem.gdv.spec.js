'use strict';

/**
 * 20_050_* / 20_030_010 · Tích điểm khi bán hàng — vai `gdv` (POS làn), cấu hình sửa TẠM bằng phiên phụ `tct`.
 *
 * 🔴 Chương trình tích điểm là của TOÀN CHUỖI (#14). Mỗi case: `suaTich` (bản gốc + tỉnh `AUTO<làn>_T` vào phạm vi + cấu hình
 *    của case) → bán tiền mặt thật cho khách rác → đọc điểm → `khoiPhuc` ở `finally`. Lượt hỏng giữa chừng:
 *    `-g "khoi phuc loyalty 20"` (spec `loyalty-goc.tct`). User cho phép 25/09/2026; phiên làn 8 đồng ý (không case nào dựa điểm).
 * Điểm đọc bằng SELECT `LOYALTY.CHAIN_CUSTOMER_LOYALTY_HISTORY` (chain_customer_id = customerId) — tích điểm đi Kafka
 * `loyalty_add_point`, lỗi chỉ log (`KafkaLoyaltyPointConsumer`) ⇒ poll, 🚫 tin toast.
 * Công thức BE (`CampaignService.calculatePointRes`): 0 nếu ngoài ngày / ngoài phạm vi / không thuộc nhóm / HĐ giảm giá (khi bật) /
 * tổng < tối thiểu; điểm = floor(cơ sở / orderAmountPerPoint).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const seed = require('../../00_seed/seed-state');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');
const n = require('../../19_quan_ly_khach_hang/tests/nhom-ghi');
const c = require('./cau-hinh-loyalty');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const ngay = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/** Tổng điểm khách đã được cộng (SELECT chỉ đọc). */
function diem(customerId) {
	const d = g.selectDb(`SELECT COALESCE(SUM(point),0), COUNT(*) FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY_HISTORY WHERE chain_customer_id=${Number(customerId)} AND point > 0`)[0];
	return d ? { diem: Number(d[0]), dong: Number(d[1]) } : null;
}

async function choDiem(page, customerId, { ms = 60_000, mongDoi = true } = {}) {
	const t0 = Date.now();
	let d = diem(customerId);
	while (Date.now() - t0 < ms) {
		if (d == null) break;
		if (d.dong > 0) return d;
		await page.waitForTimeout(5_000);
		d = diem(customerId);
	}
	if (d == null) test.skip(true, 'Không đọc được DB (all.env/mysql) để đối chiếu điểm.');
	void mongDoi;
	return d;
}

/** Bỏ tick mọi CTKM trong bảng khuyến mại POS ⇒ hoá đơn KHÔNG giảm giá. */
async function boKm(page) {
	const nut = page.getByRole('button', { name: /Chương trình khuyến m[ãạ]i/i }).first();
	if (!(await nut.isVisible().catch(() => false))) return 'không có nút CTKM';
	await nut.click({ force: true });
	const hop = page.getByRole('dialog').last();
	await expect(hop).toBeVisible({ timeout: 15_000 });
	let bo = 0;
	for (const ten of ['Theo đơn hàng', 'Theo sản phẩm', 'Theo danh mục']) {
		const t = hop.getByRole('tab', { name: ten });
		if (!(await t.isVisible().catch(() => false))) continue;
		await t.click();
		await page.waitForTimeout(600);
		const tick = hop.locator('.ant-tabs-tabpane-active .ant-checkbox-checked:not(.ant-checkbox-disabled)');
		for (let i = 0; i < 20 && (await tick.count()); i += 1) {
			await tick.first().click();
			bo += 1;
			await page.waitForTimeout(300);
		}
	}
	const xn = hop.getByRole('button', { name: /Áp dụng|Xác nhận|Đồng ý/ }).last();
	if (await xn.isVisible().catch(() => false)) await xn.click();
	else await page.keyboard.press('Escape');
	await page.waitForTimeout(2_000);
	return `bỏ ${bo} CTKM`;
}

/**
 * CTKM RÁC theo đơn −10%, `allowPoint: true` (🔴 CTKM có sẵn ở điểm bán làn có allowPoint=false ⇒ đơn áp nó LUÔN 0 điểm,
 * dùng nó cho case "HĐ giảm giá không tích" là PASS GIẢ), phạm vi chỉ điểm bán làn. Trả campaignId.
 */
async function taoKmRieng(tct, ten) {
	const bd = Date.now() - 60_000;
	const km = await g.k.goiGhi(tct.page, tct.st, 'POST', '/marketing/campaign/v2/create', { shopId: tct.st.h.shopid }, {
		promotionName: ten, totalBudget: null, allocateBudgetByScope: false, applyOfflinePromotion: false,
		allowCombineWithOtherPromotions: true, promotionPriority: 1, provinceCanReallocateBudget: false,
		promotionScope: 'ORDER', productPromotionType: null, conditionId: null, customerGroupId: null,
		description: 'AUTO TEST KHONG DUNG — CTKM rác 20_050', startTime: bd, endTime: bd + 86_400_000,
		startTimeFrame: null, endTimeFrame: null, applyScopeLevel: 'DIEM_BAN_CU_THE', savedStatus: 1,
		scopes: [{ id: null, scopeType: 'DIEM_BAN', orgUnitCode: seed.doc().duLieu.diemBan.maShop }], budgetScopes: [],
		applyRealtime: false, allowPoint: true, orderDiscountBase: 'TOTAL_AMOUNT', orderDiscountUnit: 'PERCENT',
		orderDiscountValue: 10, applyGift: false, giftItems: null, productPromotions: null,
		birthdayPromotionType: 'NONE', mutualExclusionActionType: 'BLOCK', mutualExclusionCampaignIds: [],
	});
	expect(String(km?.status?.code), `Tạo CTKM rác lỗi: ${JSON.stringify(km?.status)}`).toBe('200');
	return km?.data?.campaignId ?? km?.data?.id ?? km?.data;
}

/**
 * CTKM RÁC theo SẢN PHẨM: giảm 10.000đ mỗi `AUTO<làn>_SP_FIFO`, `allowPoint: false` (dòng bị loại khỏi tiền tính điểm khi
 * bật "Không tích điểm cho sản phẩm giảm giá" — BE chỉ loại dòng allowPoint=false). productUnitId đọc DB (dòng có variant).
 */
async function taoKmSp(tct, ten) {
	const sku = seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.fifo.sku;
	const d = g.selectDb(`SELECT product_unit_id, product_id FROM VNPOST_CORE.CHAIN_PRODUCT_UNIT WHERE sku='${sku}' AND is_deleted=0 ORDER BY variant_id IS NULL, product_unit_id LIMIT 1`)[0];
	expect(d, `Không tra được productUnitId của ${sku}`).toBeTruthy();
	const bd = Date.now() - 60_000;
	const km = await g.k.goiGhi(tct.page, tct.st, 'POST', '/marketing/campaign/v2/create', { shopId: tct.st.h.shopid }, {
		promotionName: ten, totalBudget: null, allocateBudgetByScope: false, applyOfflinePromotion: false,
		allowCombineWithOtherPromotions: true, promotionPriority: 1, provinceCanReallocateBudget: false,
		promotionScope: 'PRODUCT', productPromotionType: 'DISCOUNT_SALE', conditionId: null, customerGroupId: null,
		description: 'AUTO TEST KHONG DUNG — CTKM SP rác 20_050', startTime: bd, endTime: bd + 86_400_000,
		startTimeFrame: null, endTimeFrame: null, applyScopeLevel: 'DIEM_BAN_CU_THE', savedStatus: 1,
		scopes: [{ id: null, scopeType: 'DIEM_BAN', orgUnitCode: seed.doc().duLieu.diemBan.maShop }], budgetScopes: [],
		applyRealtime: false, orderDiscountBase: null, orderDiscountUnit: null, orderDiscountValue: 0, applyGift: null, giftItems: null,
		productPromotions: [{
			id: null, minQuantity: 1, allowPoint: false, applyToClearance: false, discountSaleSubType: 'EACH_PRODUCT',
			discountUnit: 'VND', discountValue: 10_000, applyByQuantity: null, productUnitId: Number(d[0]), productId: Number(d[1]), sku,
		}],
		birthdayPromotionType: 'NONE', mutualExclusionActionType: 'BLOCK', mutualExclusionCampaignIds: [],
	});
	expect(String(km?.status?.code), `Tạo CTKM SP rác lỗi: ${JSON.stringify(km?.status)}`).toBe('200');
	return km?.data?.campaignId ?? km?.data?.id ?? km?.data;
}

/** Trong bảng CTKM: chỉ giữ tick CTKM tên `ten`. */
async function chiGiuKm(page, ten) {
	const nut = page.getByRole('button', { name: /Chương trình khuyến m[ãạ]i/i }).first();
	await nut.click({ force: true });
	const hop = page.getByRole('dialog').last();
	await expect(hop).toBeVisible({ timeout: 15_000 });
	for (const t of ['Theo đơn hàng', 'Theo sản phẩm', 'Theo danh mục']) {
		const tab = hop.getByRole('tab', { name: t });
		if (!(await tab.isVisible().catch(() => false))) continue;
		await tab.click();
		await page.waitForTimeout(600);
		const hang = hop.locator('.ant-tabs-tabpane-active .promotion-program-modal__table-row, .ant-tabs-tabpane-active tr');
		for (let i = 0; i < (await hang.count()); i += 1) {
			const h = hang.nth(i);
			const la = p.chuan(await h.innerText()).includes(ten);
			const dangTick = (await h.locator('.ant-checkbox-checked').count()) > 0;
			const khoa = (await h.locator('.ant-checkbox-disabled').count()) > 0;
			if (!khoa && la !== dangTick && (await h.locator('.ant-checkbox').count())) {
				await h.locator('.ant-checkbox').first().click();
				await page.waitForTimeout(300);
			}
		}
	}
	const xn = hop.getByRole('button', { name: /Áp dụng|Xác nhận|Đồng ý/ }).last();
	if (await xn.isVisible().catch(() => false)) await xn.click();
	else await page.keyboard.press('Escape');
	await page.waitForTimeout(2_000);
}

/**
 * Một case tích điểm. `cauHinh(tongTruocTT)` trả phần đè cấu hình (gọi SAU khi đã có giỏ, để khớp số tiền thật).
 * Trả { diem, tong, kh }.
 */
async function ban(page, browser, id, { sl = 1, cauHinh = () => ({}), khongKm = true, kmRieng = false, kmSp = false, spThem = [], sua = null, phamVi = true, khach = null } = {}) {
	const tct = await g.k.moPhienPhu(browser, 'tct', '/care/loyalty');
	let campaignId = null;
	try {
		const goc = await c.chup(tct.page, tct.st);
		const tenKm = `${g.TIEN_TO}_KM_${id}_${Date.now().toString().slice(-6)}`;
		if (kmRieng || kmSp) {
			campaignId = await (kmSp ? taoKmSp(tct, tenKm) : taoKmRieng(tct, tenKm));
			ghiChu('CTKM rác', `${campaignId} ${tenKm}`);
		}
		const st = await p.moBan(page, test);
		const kh = khach ?? (await g.taoKhachApi(page, st, g.khachMoi(id)));
		await p.chonKhach(page, kh.ten);
		for (let i = 0; i < sl; i += 1) await p.them(page, p.sp().tc);
		for (const k of spThem) await p.them(page, p.sp()[k]);
		await page.waitForTimeout(1_500);
		if (sua) await sua(page);
		if (kmRieng || kmSp) await chiGiuKm(page, tenKm);
		else if (khongKm) ghiChu('CTKM', await boKm(page));
		const t = await p.tongKet(page);
		const tong = t.canThanhToan ?? t.sauVat;
		const pv = phamVi ? c.phamViCoLan(goc.tich, seed.doc().duLieu.toChuc.maTinh, seed.doc().duLieu.diemBan.maShop) : {};
		const doi = { ...pv, ...cauHinh(tong, t) };
		await c.suaTich(tct.page, tct.st, doi);
		ghiChu('cấu hình tạm', JSON.stringify({ ...doi, scopes: doi.scopes ? `${doi.scopes.length} đơn vị` : undefined }));
		ghiChu('giỏ', JSON.stringify(t));
		const kq = await p.thanhToanTienMat(page);
		expect(kq.orderId, `Thanh toán tiền mặt lỗi: ${JSON.stringify(kq.draft?.status)}`).toBeTruthy();
		ghiChu('đơn', kq.orderId);
		return { tong, t, kh, tct, orderId: kq.orderId, campaignId };
	} catch (e) {
		ghiChu('khôi phục (lỗi)', JSON.stringify(await c.khoiPhuc(tct.page, tct.st)));
		await dungKm(tct, campaignId);
		await tct.dong();
		throw e;
	}
}

async function dungKm(tct, campaignId) {
	if (!campaignId || typeof campaignId === 'object') return;
	const b = await g.k.goiGhi(tct.page, tct.st, 'PUT', '/marketing/campaign/v2/change-status', {}, { campaignId, action: 'STOP' });
	ghiChu('dừng CTKM rác', `${campaignId} → ${JSON.stringify(b?.status)}`);
}

async function xong(r) {
	if (!r?.tct) return;
	ghiChu('khôi phục', JSON.stringify(await c.khoiPhuc(r.tct.page, r.tct.st)));
	await dungKm(r.tct, r.campaignId);
	await r.tct.dong();
}

/** Kỳ vọng có điểm = floor(co / rate) hoặc 0. */
async function kiem(page, r, soDiem) {
	const d = await choDiem(page, r.kh.id, { ms: soDiem > 0 ? 90_000 : 45_000 });
	ghiChu('điểm', `${JSON.stringify(d)} · kỳ vọng ${soDiem}`);
	expect(d.diem, soDiem > 0 ? `Khách không được cộng đúng ${soDiem} điểm` : 'Khách KHÔNG được tích mà vẫn có điểm').toBe(soDiem);
}

test.describe('20 · Tích điểm khi bán (vai gdv, SỬA TẠM cấu hình chuỗi)', () => {
	test.describe.configure({ timeout: 420_000 });

	test('20_050_001 — Đơn nhỏ hơn giá trị đơn hàng tối thiểu thì không tích điểm', async ({ page, browser }) => {
		chanNeuTat('20_050_001');
		let r;
		try {
			r = await ban(page, browser, '050_001', { cauHinh: (tong) => ({ orderAmountConditional: tong + 1_000 }) });
			await kiem(page, r, 0);
		} finally { await xong(r); }
	});

	test('20_050_002 — Đơn bằng đúng giá trị đơn hàng tối thiểu thì tích điểm', async ({ page, browser }) => {
		chanNeuTat('20_050_002');
		let r;
		try {
			r = await ban(page, browser, '050_002', { cauHinh: (tong) => ({ orderAmountConditional: tong, orderAmountPerPoint: 1_000 }) });
			await kiem(page, r, Math.floor(r.tong / 1_000));
		} finally { await xong(r); }
	});

	test('20_050_003 — Đơn lớn hơn giá trị đơn hàng tối thiểu thì tích điểm', async ({ page, browser }) => {
		chanNeuTat('20_050_003');
		let r;
		try {
			r = await ban(page, browser, '050_003', { cauHinh: (tong) => ({ orderAmountConditional: tong - 1_000, orderAmountPerPoint: 1_000 }) });
			await kiem(page, r, Math.floor(r.tong / 1_000));
		} finally { await xong(r); }
	});

	for (const [id, ten, cfg, km, dat, co] of [
		['20_050_004', 'SP không giảm giá vẫn tích khi bật loại trừ SP giảm giá', { noPointForDiscountedProduct: true }, true, true, true],
		['20_050_007', 'HĐ có giảm giá không tích khi bật loại trừ HĐ giảm giá', { noPointForDiscountedInvoice: true }, false, true, false],
		['20_050_008', 'HĐ không giảm giá tích bình thường', { noPointForDiscountedInvoice: true }, true, true, true],
		['20_050_010', 'Đơn không thanh toán bằng điểm thì tích điểm', { noPointForPointPaymentInvoice: true }, true, true, true],
		['20_050_011', 'Đạt tối thiểu và không có SP giảm giá', { noPointForDiscountedProduct: true }, true, true, true],
		['20_050_012', 'Không có SP giảm giá nhưng chưa đạt tối thiểu', { noPointForDiscountedProduct: true }, true, false, false],
		['20_050_015', 'Đạt tối thiểu và HĐ không giảm giá', { noPointForDiscountedInvoice: true }, true, true, true],
		['20_050_016', 'HĐ không giảm giá nhưng chưa đạt tối thiểu', { noPointForDiscountedInvoice: true }, true, false, false],
		['20_050_017', 'Đạt tối thiểu nhưng HĐ có giảm giá', { noPointForDiscountedInvoice: true }, false, true, false],
		['20_050_018', 'Không đạt tối thiểu và HĐ có giảm giá', { noPointForDiscountedInvoice: true }, false, false, false],
	]) {
		test(`${id} — ${ten}`, async ({ page, browser }) => {
			chanNeuTat(id);
			let r;
			try {
				// km = true ⇒ HĐ KHÔNG giảm (bỏ mọi CTKM); false ⇒ HĐ giảm bằng CTKM rác allowPoint=true.
				r = await ban(page, browser, id, {
					khongKm: km,
					kmRieng: !km,
					cauHinh: (tong) => ({ ...cfg, orderAmountPerPoint: 1_000, orderAmountConditional: dat ? tong - 1_000 : tong + 1_000 }),
				});
				const giam = (r.t.sauVat ?? r.t.truocVat) - r.tong;
				ghiChu('giảm trên HĐ', giam);
				expect(km ? giam === 0 : giam > 0, km ? 'Bỏ hết CTKM mà HĐ vẫn giảm' : 'CTKM rác không áp lên HĐ').toBe(true);
				await kiem(page, r, co ? Math.floor(r.tong / 1_000) : 0);
			} finally { await xong(r); }
		});
	}

	test('20_050_019 — Chương trình giới hạn nhóm khách hàng chỉ tích cho khách trong nhóm', async ({ page, browser }) => {
		chanNeuTat('20_050_019');
		let r;
		let r2;
		let groupId;
		const tctN = await g.k.moPhienPhu(browser, 'tct', '/promotion/customer-group');
		try {
			const st = await p.moBan(page, test);
			const trong = await g.taoKhachApi(page, st, g.khachMoi('050_019 TRONG'));
			const ngoai = await g.taoKhachApi(page, st, g.khachMoi('050_019 NGOAI'));
			groupId = await n.taoNhomApi(tctN.page, tctN.st, { ten: `${g.TIEN_TO}_NHOM_20_050_019_${Date.now().toString().slice(-6)}`, targetType: 3, memberIds: [Number(trong.id)] });
			ghiChu('nhóm tuỳ chỉnh', `${groupId} — thành viên ${trong.ma}`);
			const cfg = (tong) => ({ isAppliedAll: false, customerGroupIds: [groupId], orderAmountPerPoint: 1_000, orderAmountConditional: tong - 1_000 });
			r = await ban(page, browser, '050_019', { khach: trong, cauHinh: cfg });
			await kiem(page, r, Math.floor(r.tong / 1_000));
			await xong(r);
			r = null;
			r2 = await ban(page, browser, '050_019', { khach: ngoai, cauHinh: cfg });
			await kiem(page, r2, 0);
		} finally {
			await xong(r);
			await xong(r2);
			if (groupId) ghiChu('xoá nhóm', JSON.stringify((await n.xoaNhomApi(tctN.page, tctN.st, groupId))?.status));
			await tctN.dong();
		}
	});

	test('20_050_020 — Tích điểm theo ngành hàng chỉ tính sản phẩm thuộc danh mục đã chọn', async ({ page, browser }) => {
		chanNeuTat('20_050_020');
		let r;
		const dm = Number(seed.doc().duLieu.sanPham.idDanhMuc);
		try {
			r = await ban(page, browser, '050_020', {
				cauHinh: (tong) => ({ campaignType: 1, pointByCategory: true, categoryIds: [dm], orderAmountPerPoint: 1_000, orderAmountConditional: tong - 1_000 }),
			});
			// SP_TC thuộc danh mục seed ⇒ tích theo giá trị dòng SP (cơ sở theo SP có isLoyalty).
			const d = await choDiem(page, r.kh.id, { ms: 90_000 });
			ghiChu('điểm', `${JSON.stringify(d)} · danh mục ${dm} · kỳ vọng ≈ floor(${r.tong}/1000)`);
			expect(d.diem, 'SP thuộc danh mục đã chọn mà không tích điểm').toBeGreaterThan(0);
			expect(d.diem).toBeLessThanOrEqual(Math.floor((r.t.sauVat ?? r.tong) / 1_000));
		} finally { await xong(r); }
	});

	test('20_050_021 — Tỷ lệ tích điểm bằng 0 làm đơn không tích điểm mà không báo gì', async ({ page, browser }) => {
		chanNeuTat('20_050_021');
		let r;
		try {
			r = await ban(page, browser, '050_021', { cauHinh: (tong) => ({ orderAmountPerPoint: 0, orderAmountConditional: tong - 1_000 }) });
			ghiChu('thông báo sau thanh toán', p.chuan((await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts()).join(' | ')) || '(không)');
			await kiem(page, r, 0);
		} finally { await xong(r); }
	});

	test('20_050_022 — Điểm tích được làm tròn xuống', async ({ page, browser }) => {
		chanNeuTat('20_050_022');
		let r;
		try {
			// Tỷ lệ 3.000đ/điểm để tổng đơn không chia hết.
			r = await ban(page, browser, '050_022', { cauHinh: (tong) => ({ orderAmountPerPoint: 3_000, orderAmountConditional: tong - 1_000 }) });
			ghiChu('phép chia', `${r.tong} / 3000 = ${(r.tong / 3_000).toFixed(3)}`);
			await kiem(page, r, Math.floor(r.tong / 3_000));
		} finally { await xong(r); }
	});

	test('20_050_023 — Chương trình chưa tới ngày bắt đầu hoặc đã hết hạn thì không tích điểm', async ({ page, browser }) => {
		chanNeuTat('20_050_023');
		let r;
		try {
			r = await ban(page, browser, '050_023', {
				cauHinh: (tong) => ({ startTime: ngay(new Date(Date.now() - 5 * 86_400_000)), endTime: ngay(new Date(Date.now() - 86_400_000)), orderAmountPerPoint: 1_000, orderAmountConditional: tong - 1_000 }),
			});
			await kiem(page, r, 0);
		} finally { await xong(r); }
	});

	test('20_030_010 — Điểm bán ngoài phạm vi áp dụng khi bán hàng', async ({ page, browser }) => {
		chanNeuTat('20_030_010');
		let r;
		try {
			// Giữ NGUYÊN phạm vi gốc (không có tỉnh làn) + điều kiện dễ đạt ⇒ điểm bán làn ngoài phạm vi ⇒ 0 điểm.
			r = await ban(page, browser, '030_010', { phamVi: false, cauHinh: (tong) => ({ orderAmountPerPoint: 1_000, orderAmountConditional: tong - 1_000 }) });
			await kiem(page, r, 0);
		} finally { await xong(r); }
	});

	// ───── Dòng SP giảm giá (CTKM SP rác allowPoint=false trên SP_FIFO) ─────
	for (const [id, ten, minF, mong] of [
		['20_050_005', 'Sản phẩm giảm giá bị loại khỏi tiền tính điểm', () => 0, (co) => Math.floor(co / 1_000)],
		['20_050_013', 'Đạt mức tối thiểu nhưng có sản phẩm giảm giá', (tong, co) => co + 1_000, () => 0],
		['20_050_014', 'Không đạt mức tối thiểu và có sản phẩm giảm giá', (tong) => tong + 1_000, () => 0],
	]) {
		test(`${id} — ${ten}`, async ({ page, browser }) => {
			chanNeuTat(id);
			let r;
			let coSo = 0;
			try {
				r = await ban(page, browser, id, {
					kmSp: true, spThem: ['fifo'],
					cauHinh: (tong, t) => {
						// Cơ sở tính điểm = các dòng KHÔNG bị loại = 1 × SP_TC (giá bán 100.000).
						coSo = 100_000;
						return { noPointForDiscountedProduct: true, orderAmountPerPoint: 1_000, orderAmountConditional: minF(tong, coSo) };
					},
				});
				// Giảm theo SP nằm SẴN trong giá dòng (tổng trước VAT) — 🚫 đo bằng sauVat − cần thanh toán (= 0).
				const giam = 200_000 - r.t.truocVat;
				ghiChu('giảm dòng SP_FIFO', giam);
				expect(giam, 'CTKM SP rác không áp lên dòng SP_FIFO').toBeGreaterThan(0);
				await kiem(page, r, mong(coSo));
			} finally { await xong(r); }
		});
	}

	test('20_050_006 — Sản phẩm sửa giá tăng lên vẫn tích điểm', async ({ page, browser }) => {
		chanNeuTat('20_050_006');
		let r;
		try {
			r = await ban(page, browser, '050_006', {
				sua: async (pg) => {
					const oGia = p.dongBill(pg).first().locator('input');
					const ds = [];
					let sua = -1;
					for (let i = 0; i < (await oGia.count()); i += 1) {
						const v = await oGia.nth(i).inputValue();
						const mo = await oGia.nth(i).isEditable();
						ds.push(`${v}${mo ? '' : '(khoá)'}`);
						if (sua < 0 && mo && /100[.,]?000/.test(v)) sua = i;
					}
					ghiChu('ô trên dòng hàng', ds.join(' · ') || '(không có ô)');
					expect(sua, 'POS không cho sửa đơn giá trên dòng hàng (ô giá khoá / không có) — không dựng được "SP sửa giá tăng"').toBeGreaterThanOrEqual(0);
					await oGia.nth(sua).fill('120000');
					await oGia.nth(sua).press('Tab');
					await pg.waitForTimeout(1_500);
				},
				cauHinh: () => ({ noPointForDiscountedProduct: true, orderAmountPerPoint: 1_000, orderAmountConditional: 0 }),
			});
			ghiChu('giỏ sau sửa giá', JSON.stringify(r.t));
			expect(r.tong, 'Sửa giá tăng mà tổng đơn không tăng').toBeGreaterThan(100_000);
			await kiem(page, r, Math.floor(r.tong / 1_000));
		} finally { await xong(r); }
	});
});
