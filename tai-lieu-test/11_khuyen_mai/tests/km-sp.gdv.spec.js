'use strict';

/**
 * 11_khuyen_mai — CTKM THEO SẢN PHẨM / DANH MỤC trên đơn bán thật (100 · 110 · 120_006–015), vai `gdv`.
 *
 * Dựng CTKM bằng API (`km-tinh.js`), bán, đọc "Cần thanh toán", thanh toán, đối chiếu doanh thu — khung `chay()` như `km-don.gdv`.
 * Tiền đề seed: bước 15 (combo `duLieu.combo` — danh mục A) + bước 16 (`duLieu.danhMucB`: SP NGK 20.000đ + combo 3 — danh mục B).
 * Ánh xạ kịch bản → seed (giá bảng giá seed): PROMOTE_1/PROMOTE_7 = TC 100k · PROMOTE_3/4/6, SP "B" = FIFO 100k · SP chỉ định
 * ("Vở Hồng Hà", "Bim bim") = BT Xanh 100k · dM_A_1/dM_KHAC/dM_COMBO_A = danh mục seed (TC/FIFO/BT/COMBO2) · dM_B_1/"nước giải khát"/
 * dM_COMBO_B = danh mục B (NGK, COMBO3). Số tiền giữ QUY TẮC kịch bản, tính lại theo giá seed — công thức ghi ở từng case.
 * Cách khai (CampaignManagementControllers.jsx): DISCOUNT_SALE (giảm chính SP, nhiều mức = nhiều dòng minQuantity) · GIFT_PRODUCT
 * (FREE_GIFT_PRODUCT / FREE_GIFT_CATEGORY) · BUY_LOWER_PRICE (mua A giảm B — attachedProducts SP/danh mục, applyByQuantity).
 * 🔴 Ghi thật: CTKM mẫu (tự dừng) + đơn bán.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const k = require('./km-tinh');

const { p } = k;
const GOC = path.join(__dirname, '..');
const BASE = () => process.env.VNPOST_BASE_URL;
const SHOP = () => seed.doc().duLieu.diemBan.shopId;
const DM_A = () => Number(seed.doc().duLieu.sanPham.idDanhMuc);
const DM_B = () => Number(seed.doc().duLieu.danhMucB?.idDanhMuc);

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
};
const canDmB = () => test.skip(!DM_B(), 'Chưa có danh mục B — chạy seed 16 (`-g "seed 16"`, playwright.api.config.js)');

/** SP danh mục B cho giỏ: NGK / COMBO3. */
function spB(key) {
	const d = seed.doc().duLieu.danhMucB;
	return key === 'NGK' ? d.ngk : d.combo3;
}
async function themB(page, key, sl = 1) {
	const x = spB(key);
	await p.them(page, x.ten);
	if (sl > 1) {
		const o = p.dongBill(page).filter({ hasText: x.ten }).first().locator('input').first();
		await o.fill(String(sl));
		await o.press('Enter');
		await page.waitForTimeout(900);
	}
}
const dkB = (key) => { const x = spB(key); return { productId: x.productId, productUnitId: x.productUnitId, sku: x.sku }; };
const quaB = (key, sl = 1) => { const x = spB(key); return { id: null, productId: x.productId, productUnitId: x.productUnitId, variantId: x.variantId, categoryId: null, sku: x.sku, unit: x.unit, quantity: sl }; };
const quaDm = (categoryId, sl = 1) => ({ id: null, productId: null, categoryId, variantId: null, sku: null, unit: null, quantity: sl });
const dinhKem = (x, unit, value) => ({ id: null, productId: x.productId, productUnitId: x.productUnitId, categoryId: null, variantId: x.variantId, sku: x.sku, unit: x.unit, discountUnit: unit, discountValue: value });
const dinhKemDm = (categoryId, unit, value) => ({ id: null, productId: null, categoryId, variantId: null, sku: null, unit: null, discountUnit: unit, discountValue: value });

/** Chọn quà từ danh mục khi POS yêu cầu (FREE_GIFT_CATEGORY). Trả mô tả đã làm. */
async function chonQuaDanhMuc(page, soLuong) {
	const hop = page.getByRole('dialog').filter({ hasText: /quà|Quà/ }).last();
	if (!(await hop.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false))) {
		const nut = page.getByText(/Chọn quà|chọn quà tặng/i).first();
		if (await nut.isVisible().catch(() => false)) await nut.click();
	}
	if (!(await hop.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false))) return 'không có hộp chọn quà';
	const noi = p.chuan(await hop.innerText()).slice(0, 300);
	const cb = hop.locator('.ant-checkbox:not(.ant-checkbox-disabled), .ant-radio:not(.ant-radio-disabled)');
	for (let i = 0; i < Math.min(soLuong, await cb.count()); i += 1) await cb.nth(i).click();
	const o = hop.locator('.ant-input-number-input');
	if ((await o.count()) === 1 && soLuong > 1) { await o.fill(String(soLuong)); await o.press('Tab'); }
	await hop.getByRole('button', { name: /Xác nhận|Áp dụng|Đồng ý|Chọn/ }).last().click().catch(() => null);
	await page.waitForTimeout(1_500);
	return `hộp: ${noi}`;
}

/** Khung chạy 1 case — `gio(page)` tự thêm hàng; ky = { can, quaCo?: [tên], soQua? }. */
async function chay(page, browser, { dung, gio, ky, sauKhiAp, khongTick }) {
	const ps = await k.moPhien(browser);
	try {
		const km = await dung(ps);
		await page.waitForTimeout(5_000); // CTKM mới tạo cần đồng bộ sang pod (xem km-don.gdv)
		await p.chanIn(page);
		await p.moBan(page, test);
		await gio(page);
		const truoc = await k.doc(page);
		const ap = khongTick ? { co: [], khoa: [], chon: [] } : await k.chiApKm(page, km.map((x) => x.ten), ky.chonDm);
		if (ap.chon?.length) test.info().annotations.push({ type: 'chọn SP danh mục', description: ap.chon.join(' · ') });
		if (ky.chonDm) expect(ap.chon?.join(' · ') || '(không mở được hộp chọn SP trong danh mục)', 'Chưa chọn được SP khuyến mại từ danh mục').toMatch(/(^| · )chọn \d+ × /);
		if (sauKhiAp) test.info().annotations.push({ type: 'sau áp', description: String(await sauKhiAp()) });
		// Đổi SL trong sauKhiAp làm POS tự tick lại CTKM chuỗi ("giảm 5k đơn") ⇒ chỉ áp lại đúng CTKM của case.
		if (ky.apLai) { await page.keyboard.press('Escape').catch(() => null); await page.mouse.click(700, 120); await page.waitForTimeout(2_000); await k.chiApKm(page, km.map((x) => x.ten), ky.chonDm).catch((e) => test.info().annotations.push({ type: 'áp lại', description: e.message.split('\n')[0] })); }
		const sau = await k.doc(page);
		test.info().annotations.push({ type: 'CTKM', description: `${km.map((x) => `${x.ten}#${x.campaignId}`).join(', ')} · khoá ${JSON.stringify(ap.khoa)}` });
		test.info().annotations.push({ type: 'tiền', description: `trước ${JSON.stringify({ sauVat: truoc.sauVat, can: truoc.canThanhToan })} · sau ${JSON.stringify({ truocVat: sau.truocVat, sauVat: sau.sauVat, can: sau.canThanhToan })} · dòng ${JSON.stringify(sau.dong)} · quà ${JSON.stringify(sau.qua)}` });
		expect(sau.canThanhToan, 'Cần thanh toán sau khi áp CTKM sai').toBe(ky.can);
		// Quà chọn từ danh mục hiện là DÒNG GIỎ "… KM - n Chai Quà tặng" (không phải tr.promotion-product-row) ⇒ tìm cả hai.
		for (const t of ky.quaCo || []) expect([...sau.qua, ...sau.dong.filter((x) => /Quà tặng/.test(x))].join(' | '), `Không có dòng quà "${t}"`).toContain(t);
		if (ky.soQua != null) expect(new Set([...sau.qua, ...sau.dong.filter((x) => /Quà tặng/.test(x))]).size, 'Số dòng quà sai').toBe(ky.soQua);
		const r = await p.thanhToanTienMat(page);
		test.info().annotations.push({ type: 'thanh toán', description: `${JSON.stringify(r.draft?.status)} · đơn ${r.orderNumber}` });
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		await page.keyboard.press('Escape').catch(() => null);
		await page.waitForTimeout(2_000);
		await p.moTrang(page, `${BASE()}/order/created-orders/detail/${r.orderId}/${SHOP()}`, p.VAI);
		await expect(page.getByText('Doanh thu', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
		await page.waitForTimeout(1_500);
		const t = p.chuan(await page.locator('body').innerText());
		const doanhThu = Number((t.match(/Doanh thu\s*(-?[\d.]+)\s*đ/) || [])[1]?.replace(/\./g, '') ?? NaN);
		test.info().annotations.push({ type: 'doanh thu', description: String(doanhThu) });
		expect(doanhThu, 'Doanh thu (VAT 0) ≠ số tiền cần thanh toán').toBe(ky.can);
	} finally {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
		await ps.don();
	}
}
const gioSp = (dong) => (page) => k.themGio(page, dong);
const GIAM = (min, unit, value, dich) => ({ minQuantity: min, discountSaleSubType: 'EACH_PRODUCT', discountUnit: unit, discountValue: value, applyByQuantity: null, ...dich });
const TANG = (min, byQty, dich, qua, form = 'FREE_GIFT_PRODUCT') => ({ minQuantity: min, giftFormType: form, applyByQuantity: byQty, ...dich, giftItems: qua });
const MUA_GIAM = (min, byQty, dich, dinh) => ({ minQuantity: min, applyByQuantity: byQty, ...dich, attachedProducts: dinh });

test.describe('11 — CTKM theo sản phẩm / danh mục', () => {
	test.describe.configure({ timeout: 420_000 });

	// ───────────── 100: theo SẢN PHẨM ─────────────
	test('11_100_001 — Kiểm tra tự động áp dụng CTKM Giảm giá bán sản phẩm theo số tiền cố định', async ({ page, browser }) => {
		chanNeuTat('11_100_001');
		// TC 100k giảm 2k/SP × 2 = 196k (nguyên văn kịch bản).
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'PRO1_GIAM2K', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'VND', 2_000, k.dieuKienSp('TC'))] })], gio: gioSp([{ key: 'TC', sl: 2 }]), ky: { can: 196_000 } });
	});

	test('11_100_002 — Kiểm tra tự động áp dụng CTKM Giảm giá bán sản phẩm theo %', async ({ page, browser }) => {
		chanNeuTat('11_100_002');
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'PRO1_GIAM10PT', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'PERCENT', 10, k.dieuKienSp('TC'))] })], gio: gioSp([{ key: 'TC', sl: 3 }]), ky: { can: 270_000 } });
	});

	test('11_100_003 — Kiểm tra tự động áp dụng CTKM Giảm giá bán combo theo số tiền cố định', async ({ page, browser }) => {
		chanNeuTat('11_100_003');
		// Kịch bản combo 110k giảm 10k ⇒ 100k × 3. Seed: combo 150k giảm 10k ⇒ 140k × 3 = 420k.
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'COMBO_GIAM10K', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'VND', 10_000, k.dieuKienSp('COMBO'))] })], gio: gioSp([{ key: 'COMBO', sl: 3 }]), ky: { can: 420_000 } });
	});

	test('11_100_004 — Kiểm tra tự động áp dụng CTKM Giảm giá bán combo theo %', async ({ page, browser }) => {
		chanNeuTat('11_100_004');
		// Kịch bản để trống số (chỉ "129,6k trước CK") ⇒ dùng 10%: 150k → 135k × 3 = 405k.
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'COMBO_GIAM10PT', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'PERCENT', 10, k.dieuKienSp('COMBO'))] })], gio: gioSp([{ key: 'COMBO', sl: 3 }]), ky: { can: 405_000 } });
	});

	test('11_100_005 — Kiểm tra tự động áp dụng mức điều kiện số lượng lớn hơn trong cùng 1 sản phẩm của 1 CTKM', async ({ page, browser }) => {
		chanNeuTat('11_100_005');
		// Hai mức cùng SP TC: từ 5 giảm 10k, từ 10 giảm 25k (kịch bản gốc 165k). SL 5 ⇒ 90k × 5 = 450k; tăng 10 ⇒ 75k × 10 = 750k.
		let can5 = null;
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'PRO7_2MUC', cach: 'DISCOUNT_SALE', dong: [GIAM(5, 'VND', 10_000, k.dieuKienSp('TC')), GIAM(10, 'VND', 25_000, k.dieuKienSp('TC'))] })],
			gio: gioSp([{ key: 'TC', sl: 5 }]),
			sauKhiAp: async () => {
				can5 = (await k.doc(page)).canThanhToan;
				const o = p.dongBill(page).filter({ hasText: k.sp('TC').ten }).first().locator('input').first();
				await o.fill('10');
				await o.press('Enter');
				await page.waitForTimeout(2_500);
				expect(can5, 'SL 5: mức "từ 5" chưa áp (cần trả ≠ 450.000)').toBe(450_000);
				return `SL 5 cần trả ${can5}`;
			},
			ky: { can: 750_000, apLai: true },
		});
	});

	test('11_100_006 — Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm khác (Mua A tặng A)', async ({ page, browser }) => {
		chanNeuTat('11_100_006');
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'PRO3_MUA2TANG1', cach: 'GIFT_PRODUCT', dong: [TANG(2, false, k.dieuKienSp('TC'), [k.quaSp('TC')])] })], gio: gioSp([{ key: 'TC', sl: 2 }]), ky: { can: 200_000, quaCo: [k.sp('TC').ten] } });
	});

	test('11_100_007 — Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm trong danh mục khác theo số lượng', async ({ page, browser }) => {
		chanNeuTat('11_100_007');
		canDmB();
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'PRO3_TANG_DMB', cach: 'GIFT_PRODUCT', dong: [TANG(5, false, k.dieuKienSp('TC'), [quaDm(DM_B(), 1)], 'FREE_GIFT_CATEGORY')] })],
			gio: gioSp([{ key: 'TC', sl: 5 }]), ky: { chonDm: { ten: spB('NGK').ten, sl: 1 },  can: 500_000, quaCo: [spB('NGK').ten] },
		});
	});

	test('11_100_008 — Kiểm tra tự động áp dụng CTKM Mua sản phẩm A được giảm giá cho sản phẩm B', async ({ page, browser }) => {
		chanNeuTat('11_100_008');
		// Mua 4 TC ⇒ FIFO giảm 60k: 4 × 100k + (100k − 60k) = 440k.
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'PRO4_MUA4_GIAM_B', cach: 'BUY_LOWER_PRICE', dong: [MUA_GIAM(4, false, k.dieuKienSp('TC'), [dinhKem(k.sp('FIFO'), 'VND', 60_000)])] })], gio: gioSp([{ key: 'TC', sl: 4 }, { key: 'FIFO', sl: 1 }]), ky: { can: 440_000 } });
	});

	test('11_100_009 — Kiểm tra tự động áp dụng CTKM Giảm giá sản phẩm trong danh mục khác theo số lần đạt điều kiện', async ({ page, browser }) => {
		chanNeuTat('11_100_009');
		canDmB();
		// Mua 9 TC (đạt 1 lần) ⇒ 1 NGK giảm 10k: 9 × 100k + (20k − 10k) = 910k.
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'PRO5_MUA9_GIAM_DMB', cach: 'BUY_LOWER_PRICE', dong: [MUA_GIAM(9, true, k.dieuKienSp('TC'), [dinhKemDm(DM_B(), 'VND', 10_000)])] })],
			gio: async (page) => { await k.themGio(page, [{ key: 'TC', sl: 9 }]); }, ky: { can: 910_000, chonDm: { ten: spB('NGK').ten, sl: 1 } },
		});
	});

	test('11_100_010 — Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm danh mục khác (PROMOTE_4)', async ({ page, browser }) => {
		chanNeuTat('11_100_010');
		canDmB();
		// Mua 2 FIFO ⇒ chọn 1 quà từ danh mục (kịch bản dM_A_1; ở đây danh mục B để quà tách khỏi SP mua): 2 × 100k.
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'PRO3_FIFO_TANG_DM', cach: 'GIFT_PRODUCT', dong: [TANG(2, false, k.dieuKienSp('FIFO'), [quaDm(DM_B(), 1)], 'FREE_GIFT_CATEGORY')] })],
			gio: gioSp([{ key: 'FIFO', sl: 2 }]), ky: { chonDm: { ten: spB('NGK').ten, sl: 1 },  can: 200_000, quaCo: [spB('NGK').ten] },
		});
	});

	test('11_100_011 — Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm chỉ định theo số lượng (PROMOTE_3)', async ({ page, browser }) => {
		chanNeuTat('11_100_011');
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'PRO3_FIFO_TANG_BT', cach: 'GIFT_PRODUCT', dong: [TANG(2, false, k.dieuKienSp('FIFO'), [k.quaSp('BT')])] })], gio: gioSp([{ key: 'FIFO', sl: 2 }]), ky: { can: 200_000, quaCo: [k.sp('BT').ten] } });
	});

	test('11_100_012 — Kiểm tra tự động áp dụng CTKM Giảm giá sản phẩm thuộc danh mục khác (PROMOTE_3)', async ({ page, browser }) => {
		chanNeuTat('11_100_012');
		canDmB();
		// Mua 5 FIFO ⇒ NGK (danh mục B) giảm 30k — NGK chỉ 20k ⇒ giảm tối đa bằng giá (còn 0): 5 × 100k + 0 = 500k.
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'PRO5_FIFO_GIAM_DMB', cach: 'BUY_LOWER_PRICE', dong: [MUA_GIAM(5, false, k.dieuKienSp('FIFO'), [dinhKemDm(DM_B(), 'VND', 30_000)])] })],
			gio: async (page) => { await k.themGio(page, [{ key: 'FIFO', sl: 5 }]); }, ky: { can: 500_000, chonDm: { ten: spB('NGK').ten, sl: 1 } },
		});
	});

	test('11_100_013 — Kiểm tra tự động áp dụng CTKM Giảm giá cho sản phẩm khác chỉ định theo số lượng (PROMOTE_6)', async ({ page, browser }) => {
		chanNeuTat('11_100_013');
		// Mua 7 FIFO ⇒ BT giảm 80k: 7 × 100k + (100k − 80k) = 720k.
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'PRO4_FIFO7_GIAM_BT', cach: 'BUY_LOWER_PRICE', dong: [MUA_GIAM(7, false, k.dieuKienSp('FIFO'), [dinhKem(k.sp('BT'), 'VND', 80_000)])] })], gio: gioSp([{ key: 'FIFO', sl: 7 }, { key: 'BT', sl: 1 }]), ky: { can: 720_000 } });
	});

	// ───────────── 110: theo DANH MỤC ─────────────
	test('11_110_001 — Kiểm tra tự động áp dụng CTKM Giảm giá bán sản phẩm theo số tiền cho mỗi sản phẩm trong danh mục dM_A_1', async ({ page, browser }) => {
		chanNeuTat('11_110_001');
		// 2 SP danh mục A (TC + FIFO) giảm 2k mỗi SP: 200k − 4k = 196k.
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'DM', ten: 'DMA_GIAM2K', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'VND', 2_000, { categoryIds: [DM_A()] })] })], gio: gioSp([{ key: 'TC', sl: 2 }]), ky: { can: 196_000 } });
	});

	test('11_110_002 — Kiểm tra tự động áp dụng CTKM Giảm giá theo % (hoặc theo cấu hình trên UI) cho mỗi sản phẩm trong danh mục dM_A_1', async ({ page, browser }) => {
		chanNeuTat('11_110_002');
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'DM', ten: 'DMA_GIAM10PT', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'PERCENT', 10, { categoryIds: [DM_A()] })] })], gio: gioSp([{ key: 'TC', sl: 3 }]), ky: { can: 270_000 } });
	});

	test('11_110_003 — Kiểm tra tự động áp dụng CTKM Mua sản phẩm danh mục A giảm giá sản phẩm trong danh mục B', async ({ page, browser }) => {
		chanNeuTat('11_110_003');
		canDmB();
		// 5 SP danh mục A ⇒ NGK (B) giảm 2k: 500k + 18k = 518k.
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'DM', ten: 'DMA5_GIAM_DMB2K', cach: 'BUY_LOWER_PRICE', dong: [MUA_GIAM(5, false, { categoryIds: [DM_A()] }, [dinhKemDm(DM_B(), 'VND', 2_000)])] })],
			gio: async (page) => { await k.themGio(page, [{ key: 'TC', sl: 5 }]); }, ky: { can: 518_000, chonDm: { ten: spB('NGK').ten, sl: 1 } },
		});
	});

	test('11_110_004 — Kiểm tra tự động áp dụng CTKM Mua sản phẩm danh mục A giảm giá sản phẩm trong danh mục B theo số lượng', async ({ page, browser }) => {
		chanNeuTat('11_110_004');
		canDmB();
		// 6 SP A ⇒ NGK giảm 4k: 600k + 16k = 616k.
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'DM', ten: 'DMA6_GIAM_DMB4K', cach: 'BUY_LOWER_PRICE', dong: [MUA_GIAM(6, false, { categoryIds: [DM_A()] }, [dinhKemDm(DM_B(), 'VND', 4_000)])] })],
			gio: async (page) => { await k.themGio(page, [{ key: 'TC', sl: 6 }]); }, ky: { can: 616_000, chonDm: { ten: spB('NGK').ten, sl: 1 } },
		});
	});

	test('11_110_005 — Kiểm tra áp dụng CTKM danh mục A giảm giá sản phẩm danh mục B nhân theo số lần đạt điều kiện', async ({ page, browser }) => {
		chanNeuTat('11_110_005');
		canDmB();
		// Ngưỡng 6 SP A, nhân theo số lần: 12 SP A (2 lần) ⇒ 2 NGK mỗi chai giảm 10k (kịch bản 40k/SP; NGK chỉ 20k): 1.200k + 2 × 10k = 1.220k.
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'DM', ten: 'DMA6_NHAN_GIAM_DMB', cach: 'BUY_LOWER_PRICE', dong: [MUA_GIAM(6, true, { categoryIds: [DM_A()] }, [dinhKemDm(DM_B(), 'VND', 10_000)])] })],
			gio: async (page) => { await k.themGio(page, [{ key: 'TC', sl: 12 }]); }, ky: { can: 1_220_000, chonDm: { ten: spB('NGK').ten, sl: 2 } },
		});
	});

	test('11_110_006 — Kiểm tra áp dụng CTKM Mua sản phẩm danh mục A được tặng sản phẩm danh mục B', async ({ page, browser }) => {
		chanNeuTat('11_110_006');
		canDmB();
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'DM', ten: 'DMA10_TANG3_DMB', cach: 'GIFT_PRODUCT', dong: [TANG(10, false, { categoryIds: [DM_A()] }, [quaDm(DM_B(), 3)], 'FREE_GIFT_CATEGORY')] })],
			gio: gioSp([{ key: 'TC', sl: 10 }]), ky: { chonDm: { ten: spB('NGK').ten, sl: 3 },  can: 1_000_000, quaCo: [spB('NGK').ten] },
		});
	});

	test('11_110_007 — Kiểm tra áp dụng CTKM Mua sản phẩm danh mục A tặng sản phẩm chỉ định', async ({ page, browser }) => {
		chanNeuTat('11_110_007');
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'DM', ten: 'DMA7_TANG2_BT', cach: 'GIFT_PRODUCT', dong: [TANG(7, false, { categoryIds: [DM_A()] }, [k.quaSp('BT', 2)])] })], gio: gioSp([{ key: 'TC', sl: 7 }]), ky: { can: 700_000, quaCo: [k.sp('BT').ten] } });
	});

	test('11_110_008 — Kiểm tra áp dụng CTKM Giảm giá cho mỗi combo cùng danh mục', async ({ page, browser }) => {
		chanNeuTat('11_110_008');
		// Danh mục A chứa COMBO2: 2 combo giảm 4k mỗi combo: (150k − 4k) × 2 = 292k.
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'DM', ten: 'DMCOMBOA_GIAM4K', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'VND', 4_000, { categoryIds: [DM_A()] })] })], gio: gioSp([{ key: 'COMBO', sl: 2 }]), ky: { can: 292_000 } });
	});

	test('11_110_009 — Kiểm tra áp dụng CTKM Mua danh mục combo A được giảm giá danh mục combo B', async ({ page, browser }) => {
		chanNeuTat('11_110_009');
		canDmB();
		// 4 COMBO2 (danh mục A) ⇒ COMBO4 (DANH MỤC COMBO B, type 10 — seed 16.3) giảm 20k: 600k + 130k = 730k.
		// 🔴 Hộp chọn SP khuyến mại của POS chỉ liệt kê combo thuộc danh mục combo (type 10), 🚫 combo nằm trong danh mục sản phẩm.
		const dmcB = seed.doc().duLieu.danhMucComboB;
		test.skip(!dmcB, 'Chưa có danh mục combo B — chạy seed 16.3');
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'DM', ten: 'DMCOMBOA4_GIAM_B', cach: 'BUY_LOWER_PRICE', dong: [MUA_GIAM(4, false, { categoryIds: [DM_A()] }, [dinhKemDm(Number(dmcB.idDanhMuc), 'VND', 20_000)])] })],
			gio: async (page) => { await k.themGio(page, [{ key: 'COMBO', sl: 4 }]); }, ky: { can: 730_000, chonDm: { ten: dmcB.combo4.ten, sl: 1 } },
		});
	});

	test('11_110_010 — Kiểm tra áp dụng CTKM Mua danh mục A tặng quà danh mục B nhân theo số lượng', async ({ page, browser }) => {
		chanNeuTat('11_110_010');
		canDmB();
		// Ngưỡng 2, nhân theo số lượng: 4 SP A ⇒ 2 quà từ danh mục B (kịch bản quà từ dM_A_1). Cần trả = 4 × 100k.
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'DM', ten: 'DMA2_NHAN_TANG_DMB', cach: 'GIFT_PRODUCT', dong: [TANG(2, true, { categoryIds: [DM_A()] }, [quaDm(DM_B(), 1)], 'FREE_GIFT_CATEGORY')] })],
			gio: gioSp([{ key: 'TC', sl: 4 }]), ky: { chonDm: { ten: spB('NGK').ten, sl: 2 },  can: 400_000, quaCo: [spB('NGK').ten] },
		});
	});

	test('11_110_011 — Kiểm tra áp dụng CTKM Mua danh mục A tặng quà chỉ định nhân theo số lượng', async ({ page, browser }) => {
		chanNeuTat('11_110_011');
		// Ngưỡng 4, nhân theo số lượng: 8 SP A ⇒ tự thêm 2 BT ("Bim bim") 0đ. Cần trả 800k.
		await chay(page, browser, { dung: async (ps) => [await ps.tao({ loai: 'DM', ten: 'DMA4_NHAN_TANG_BT', cach: 'GIFT_PRODUCT', dong: [TANG(4, true, { categoryIds: [DM_A()] }, [k.quaSp('BT', 1)])] })], gio: gioSp([{ key: 'TC', sl: 8 }]), ky: { can: 800_000, quaCo: [k.sp('BT').ten] } });
	});

	// ───────────── 120_006–015: kết hợp ─────────────
	test('11_120_006 — Kiểm tra áp dụng song song KM Sản phẩm và KM Đơn hàng độc lập', async ({ page, browser }) => {
		chanNeuTat('11_120_006');
		// 2 TC giảm 10k/SP ⇒ 180k ⇒ KM đơn 5% = 9k ⇒ 171k (nguyên văn).
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao({ loai: 'SP', ten: 'SP_GIAM10K', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'VND', 10_000, k.dieuKienSp('TC'))] }), await ps.tao({ loai: 'DON', ten: 'DON_5PT', unit: 'PERCENT', value: 5 })],
			gio: gioSp([{ key: 'TC', sl: 2 }]), ky: { can: 171_000 },
		});
	});

	test('11_120_007 — Kiểm tra KM Sản phẩm làm giảm tổng tiền đơn hàng xuống dưới ngưỡng tối thiểu của KM Đơn hàng', async ({ page, browser }) => {
		chanNeuTat('11_120_007');
		// Từ 2 TC giảm 30k/SP ⇒ 140k < ngưỡng 150k ⇒ KHÔNG áp KM đơn 10% ⇒ 140k (nguyên văn).
		await chay(page, browser, {
			dung: async (ps) => { const dk = await ps.dieuKien(150_000); return [await ps.tao({ loai: 'SP', ten: 'PRO1_MUA2_GIAM30K', cach: 'DISCOUNT_SALE', dong: [GIAM(2, 'VND', 30_000, k.dieuKienSp('TC'))] }), await ps.tao({ loai: 'DON', ten: 'DON150K_10PT', unit: 'PERCENT', value: 10, conditionId: dk })]; },
			gio: gioSp([{ key: 'TC', sl: 2 }]), ky: { can: 140_000 },
		});
	});

	test('11_120_008 — Kiểm tra áp dụng song song KM Danh mục và KM Đơn hàng độc lập', async ({ page, browser }) => {
		chanNeuTat('11_120_008');
		// 2 SP A (200k) giảm 5k/SP ⇒ 190k ≥ ngưỡng 180k ⇒ KM đơn giảm 10k ⇒ 180k.
		await chay(page, browser, {
			dung: async (ps) => { const dk = await ps.dieuKien(180_000); return [await ps.tao({ loai: 'DM', ten: 'DMA_GIAM5K', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'VND', 5_000, { categoryIds: [DM_A()] })] }), await ps.tao({ loai: 'DON', ten: 'DON180K_GIAM10K', unit: 'VND', value: 10_000, conditionId: dk })]; },
			gio: gioSp([{ key: 'TC', sl: 2 }]), ky: { can: 180_000 },
		});
	});

	test('11_120_009 — Kiểm tra KM Danh mục làm giảm tổng tiền đơn hàng xuống dưới ngưỡng tối thiểu của KM Đơn hàng', async ({ page, browser }) => {
		chanNeuTat('11_120_009');
		// 2 SP A giảm 15k/SP ⇒ 170k < ngưỡng 180k ⇒ không áp KM đơn ⇒ 170k.
		await chay(page, browser, {
			dung: async (ps) => { const dk = await ps.dieuKien(180_000); return [await ps.tao({ loai: 'DM', ten: 'DMA_GIAM15K', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'VND', 15_000, { categoryIds: [DM_A()] })] }), await ps.tao({ loai: 'DON', ten: 'DON180K_GIAM10K', unit: 'VND', value: 10_000, conditionId: dk })]; },
			gio: gioSp([{ key: 'TC', sl: 2 }]), ky: { can: 170_000 },
		});
	});

	test('11_120_010 — Kiểm tra áp dụng đồng thời cả 3 loại: KM Sản phẩm, KM Danh mục và KM Đơn hàng trên cùng một đơn', async ({ page, browser }) => {
		chanNeuTat('11_120_010');
		canDmB();
		// 2 TC giảm 10k/SP (−20k) + 2 NGK danh mục B giảm 5k/SP (−10k): 240k → 210k ≥ ngưỡng 200k ⇒ đơn 10% = 21k ⇒ 189k.
		await chay(page, browser, {
			dung: async (ps) => { const dk = await ps.dieuKien(200_000); return [
				await ps.tao({ loai: 'SP', ten: 'SPA_GIAM10K', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'VND', 10_000, k.dieuKienSp('TC'))] }),
				await ps.tao({ loai: 'DM', ten: 'DMB_GIAM5K', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'VND', 5_000, { categoryIds: [DM_B()] })] }),
				await ps.tao({ loai: 'DON', ten: 'DON200K_10PT', unit: 'PERCENT', value: 10, conditionId: dk }),
			]; },
			gio: async (page) => { await k.themGio(page, [{ key: 'TC', sl: 2 }]); await themB(page, 'NGK', 2); }, ky: { can: 189_000 },
		});
	});

	test('11_120_011 — Kiểm tra đồng thời nhận nhiều quà tặng từ KM Sản phẩm, KM Danh mục và KM Đơn hàng', async ({ page, browser }) => {
		chanNeuTat('11_120_011');
		canDmB();
		// Quà: mua 2 TC tặng 1 TC (KM SP) · mua 2 NGK tặng 1 quà danh mục B (KM DM) · KM đơn tặng 1 FIFO. Cần trả 2 × 100k + 2 × 20k = 240k.
		await chay(page, browser, {
			dung: async (ps) => [
				await ps.tao({ loai: 'SP', ten: 'SP_MUA2TC_TANG_TC', cach: 'GIFT_PRODUCT', dong: [TANG(2, false, k.dieuKienSp('TC'), [k.quaSp('TC')])] }),
				await ps.tao({ loai: 'DM', ten: 'DMB_MUA2_TANG_DMB', cach: 'GIFT_PRODUCT', dong: [TANG(2, false, { categoryIds: [DM_B()] }, [quaDm(DM_B(), 1)], 'FREE_GIFT_CATEGORY')] }),
				await ps.tao({ loai: 'DON', ten: 'DON_TANG_FIFO', unit: 'VND', value: 0, qua: [k.quaSp('FIFO')] }),
			],
			gio: async (page) => { await k.themGio(page, [{ key: 'TC', sl: 2 }]); await themB(page, 'NGK', 2); },
			ky: { chonDm: { ten: spB('NGK').ten, sl: 1 },  can: 240_000, soQua: 3 },
		});
	});

	test('11_120_012 — Kiểm tra mua sản phẩm A giảm giá sản phẩm B kết hợp mua danh mục C giảm giá danh mục D', async ({ page, browser }) => {
		chanNeuTat('11_120_012');
		canDmB();
		// CTKM 1: mua TC ⇒ FIFO giảm 20k. CTKM 2: mua NGK (danh mục B) ⇒ COMBO2 (danh mục A) giảm 5k.
		// Giỏ TC + FIFO + NGK + COMBO2 = 100 + 100 + 20 + 150 = 370k ⇒ 370 − 20 − 5 = 345k.
		await chay(page, browser, {
			dung: async (ps) => [
				await ps.tao({ loai: 'SP', ten: 'MUA_TC_GIAM_FIFO', cach: 'BUY_LOWER_PRICE', dong: [MUA_GIAM(1, false, k.dieuKienSp('TC'), [dinhKem(k.sp('FIFO'), 'VND', 20_000)])] }),
				await ps.tao({ loai: 'DM', ten: 'MUA_DMB_GIAM_COMBO', cach: 'BUY_LOWER_PRICE', dong: [MUA_GIAM(1, false, { categoryIds: [DM_B()] }, [dinhKem(k.sp('COMBO'), 'VND', 5_000)])] }),
			],
			gio: async (page) => { await k.themGio(page, [{ key: 'TC', sl: 1 }, { key: 'FIFO', sl: 1 }]); await themB(page, 'NGK', 1); await k.themGio(page, [{ key: 'COMBO', sl: 1 }]); },
			ky: { can: 345_000 },
		});
	});

	test('11_120_014 — Kiểm tra khách hàng thuộc nhóm VIP được hưởng KM VIP + mua sản phẩm đang có KM Sản phẩm cho mọi đối tượng', async ({ page, browser }) => {
		chanNeuTat('11_120_014');
		// Khách thuộc nhóm VIP (nhóm tuỳ chỉnh chỉ gồm khách này). TC giảm 10k ⇒ 90k ⇒ KM VIP 5% = 4.500 ⇒ 85.500 (nguyên văn).
		const n = require('../../19_quan_ly_khach_hang/tests/nhom-ghi');
		await p.chanIn(page);
		const st = await p.moBan(page, test);
		const kh = await p.taoKhach(page, st).catch(() => null);
		test.skip(!kh, 'Không tạo được khách VIP');
		await chay(page, browser, {
			// 🔴 Nhóm VIP tạo bằng CHÍNH phiên phụ của chay() (🚫 mở thêm phiên tct: 3 phiên cùng tài khoản xoay token ⇒ SSHOP-405).
			dung: async (ps) => {
				const gid = await n.taoNhomApi(ps.page, ps.st, { ten: `A${process.env.VNPOST_LANE || ''}_VIP_${Date.now().toString().slice(-6)}`, memberIds: [kh.customerId], targetType: 3 });
				return [await ps.tao({ loai: 'SP', ten: 'SP_GIAM10K_MOI_KH', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'VND', 10_000, k.dieuKienSp('TC'))] }), await ps.tao({ loai: 'DON', ten: 'DON_VIP_5PT', unit: 'PERCENT', value: 5, customerGroupId: gid })];
			},
			gio: async (page) => { await p.chonKhach(page, kh.customerName); await k.themGio(page, [{ key: 'TC', sl: 1 }]); },
			ky: { can: 85_500 },
		});
	});

	test('11_120_015 — Kiểm tra KM Đơn hàng có điều kiện quà tặng (mua sản phẩm X) kết hợp bản thân sản phẩm X đang tham gia KM Sản phẩm', async ({ page, browser }) => {
		chanNeuTat('11_120_015');
		// X = TC giảm 5k (KM SP) · KM đơn điều kiện "mua TC" tặng Y = FIFO. Cần trả 95k, có dòng quà FIFO.
		await chay(page, browser, {
			dung: async (ps) => {
				const x = k.sp('TC');
				const r = await ps.goi('POST', '/marketing/condition/create-condition', { chainId: ps.chainId() }, {
					conditionId: null, conditionName: `A${process.env.VNPOST_LANE || ''}_DK_MUA_TC_${Date.now().toString().slice(-6)}`,
					invoiceValue: { invoiceType: 'PRODUCT', minimumValue: null },
					productValues: [{ detailId: null, productId: x.productId, productType: 0, quantity: 1, variantId: x.variantId, productUnitId: x.productUnitId, active: 1 }],
				});
				expect(String(r?.status?.code), `Tạo điều kiện "mua TC" lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
				const dk = r?.data?.conditionId ?? r?.data?.id ?? r?.data;
				return [await ps.tao({ loai: 'SP', ten: 'X_GIAM5K', cach: 'DISCOUNT_SALE', dong: [GIAM(1, 'VND', 5_000, k.dieuKienSp('TC'))] }), await ps.tao({ loai: 'DON', ten: 'DON_MUA_X_TANG_Y', unit: 'VND', value: 0, qua: [k.quaSp('FIFO')], conditionId: dk })];
			},
			gio: gioSp([{ key: 'TC', sl: 1 }]), ky: { can: 95_000, quaCo: [k.sp('FIFO').ten] },
		});
	});
});
