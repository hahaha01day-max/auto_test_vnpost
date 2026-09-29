'use strict';

/**
 * 11_khuyen_mai — CTKM THEO ĐƠN HÀNG trên đơn bán thật (090 · 120_001–005 · 120_013 · 130_001), vai `gdv`.
 *
 * Mỗi case: dựng CTKM mẫu bằng API (`km-tinh.js`, phạm vi chỉ điểm bán làn, dừng ở finally) → giỏ POS → CHỈ tick CTKM của case
 * (bỏ "giảm 5k đơn" của chuỗi) → đọc "Cần thanh toán" → thanh toán tiền mặt → đối chiếu "Doanh thu" ở chi tiết đơn (VAT 0 ⇒
 * doanh thu = số thu). Số tiền giữ đúng QUY TẮC kịch bản; "ĐH 1 giá 100k" = SP TC (100.000đ) nên phần lớn con số trùng nguyên văn.
 * Chỗ đổi giá: combo kịch bản 120k ⇒ combo seed 150k; "ĐH 2 25k × 2 = 50k, giảm 50k" ⇒ TC 100k × 1, giảm 100k (vẫn "đúng bằng
 * giá trị đơn"); "Bánh mỳ 20k × 2, giảm 50k" ⇒ TC 100k × 1, giảm 150k (vẫn "lớn hơn giá trị đơn").
 * 🔴 Ghi thật: CTKM mẫu (tự dừng) + đơn bán.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('./km-tinh');

const { p } = k;
const GOC = path.join(__dirname, '..');
const BASE = () => process.env.VNPOST_BASE_URL;
const SHOP = () => require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
};

/**
 * Chạy 1 case: `dung(ps)` ⇒ danh sách CTKM `[{ten}]`; `gio` giỏ hàng; `ky` = { can, giam? , thanhToan: true|false }.
 * Trả { truoc, sau, r (kết quả thanh toán), doanhThu }.
 */
async function chay(page, browser, { dung, gio, ky, sauKhiAp }) {
	const ps = await k.moPhien(browser);
	try {
		const km = await dung(ps);
		// Đo 26/09: thanh toán NGAY sau khi tạo CTKM có lần SSHOP-500 chung (lần chạy lại thì qua) ⇒ chờ CTKM đồng bộ sang pod.
		await page.waitForTimeout(5_000);
		await p.chanIn(page);
		await p.moBan(page, test);
		await k.themGio(page, gio);
		const truoc = await k.doc(page);
		const ap = await k.chiApKm(page, km.map((x) => x.ten));
		const sau = await k.doc(page);
		test.info().annotations.push({ type: 'CTKM', description: `${km.map((x) => `${x.ten}#${x.campaignId}`).join(', ')} · hiện trong bảng ${ap.co.length} · khoá ${JSON.stringify(ap.khoa)}` });
		test.info().annotations.push({ type: 'tiền', description: `trước áp ${JSON.stringify({ sauVat: truoc.sauVat, can: truoc.canThanhToan })} · sau áp ${JSON.stringify({ truocVat: sau.truocVat, sauVat: sau.sauVat, can: sau.canThanhToan, giam: sau.giam })} · quà ${JSON.stringify(sau.qua)}` });
		if (sauKhiAp) await sauKhiAp(sau);
		expect(sau.canThanhToan, 'Cần thanh toán sau khi áp CTKM sai').toBe(ky.can);
		if (ky.giam != null) expect(sau.giam, 'Tiền chiết khấu khuyến mại sai').toBe(ky.giam);
		if (ky.thanhToan === false) return { truoc, sau };
		const r = await p.thanhToanTienMat(page);
		test.info().annotations.push({ type: 'thanh toán', description: `${JSON.stringify(r.draft?.status)} · đơn ${r.orderNumber}` });
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		await page.keyboard.press('Escape').catch(() => null);
		await page.waitForTimeout(2_000);
		await p.moTrang(page, `${BASE()}/order/created-orders/detail/${r.orderId}/${SHOP()}`, p.VAI);
		await expect(page.getByText('Doanh thu', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
		await page.waitForTimeout(1_500);
		const t = p.chuan(await page.locator('body').innerText());
		const m = t.match(/Doanh thu\s*(-?[\d.]+)\s*đ/);
		const doanhThu = m ? Number(m[1].replace(/\./g, '')) : null;
		test.info().annotations.push({ type: 'doanh thu (chi tiết đơn)', description: String(doanhThu) });
		expect(doanhThu, 'Doanh thu (VAT 0) ≠ số tiền cần thanh toán sau CTKM').toBe(ky.can);
		return { truoc, sau, r, doanhThu };
	} finally {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
		await ps.don();
	}
}
const DON = (ten, unit, value, them = {}) => ({ loai: 'DON', ten, unit, value, ...them });

test.describe('11 — CTKM theo đơn hàng', () => {
	test.describe.configure({ timeout: 360_000 });

	test('11_090_001 — Kiểm tra mua sản phẩm áp dụng CT Giảm theo %', async ({ page, browser }) => {
		chanNeuTat('11_090_001');
		await chay(page, browser, { dung: async (ps) => [await ps.tao(DON('GIAM10PT', 'PERCENT', 10))], gio: [{ key: 'TC', sl: 5 }], ky: { can: 450_000, giam: 50_000 } });
	});

	test('11_090_002 — Kiểm tra mua combo áp dụng CT Giảm theo %', async ({ page, browser }) => {
		chanNeuTat('11_090_002');
		// Combo seed 150k × 2 = 300k ⇒ giảm 10% = 30k (kịch bản 240k ⇒ 24k).
		await chay(page, browser, { dung: async (ps) => [await ps.tao(DON('GIAM10PT', 'PERCENT', 10))], gio: [{ key: 'COMBO', sl: 2 }], ky: { can: 270_000, giam: 30_000 } });
	});

	test('11_090_003 — Kiểm tra mua sản phẩm áp dụng CT Giảm theo tiền cố định', async ({ page, browser }) => {
		chanNeuTat('11_090_003');
		await chay(page, browser, { dung: async (ps) => [await ps.tao(DON('GIAM50K', 'VND', 50_000))], gio: [{ key: 'TC', sl: 5 }], ky: { can: 450_000, giam: 50_000 } });
	});

	test('11_090_004 — Kiểm tra mua combo áp dụng CT Giảm theo tiền cố định', async ({ page, browser }) => {
		chanNeuTat('11_090_004');
		await chay(page, browser, { dung: async (ps) => [await ps.tao(DON('GIAM50K', 'VND', 50_000))], gio: [{ key: 'COMBO', sl: 2 }], ky: { can: 250_000, giam: 50_000 } });
	});

	test('11_090_005 — Kiểm tra Áp dụng CT Giảm theo tiền cố định đúng bằng giá trị đơn', async ({ page, browser }) => {
		chanNeuTat('11_090_005');
		await chay(page, browser, { dung: async (ps) => [await ps.tao(DON('GIAM100K', 'VND', 100_000))], gio: [{ key: 'TC', sl: 1 }], ky: { can: 0, giam: 100_000 } });
	});

	test('11_090_006 — Kiểm tra Áp dụng CT Giảm theo tiền cố định lớn hơn giá trị đơn', async ({ page, browser }) => {
		chanNeuTat('11_090_006');
		await chay(page, browser, { dung: async (ps) => [await ps.tao(DON('GIAM150K', 'VND', 150_000))], gio: [{ key: 'TC', sl: 1 }], ky: { can: 0, giam: 100_000 } });
	});

	test('11_090_007 — Case gốc dong103 — sheet TRỐNG cột tình huống', async ({ page, browser }) => {
		chanNeuTat('11_090_007');
		// "Giảm 5% sau CT khác" = thứ tự được trừ 2; đứng một mình vẫn tính trên toàn đơn: 500k × 5% = 25k.
		await chay(page, browser, { dung: async (ps) => [await ps.tao(DON('GIAM5PT_SAU', 'PERCENT', 5, { uuTien: 2 }))], gio: [{ key: 'TC', sl: 5 }], ky: { can: 475_000, giam: 25_000 } });
	});

	test('11_090_008 — Kiểm tra Áp dụng CT giảm giá kèm quà tặng', async ({ page, browser }) => {
		chanNeuTat('11_090_008');
		let ten;
		await chay(page, browser, {
			dung: async (ps) => { const x = await ps.tao(DON('GIAM1PT_TANG', 'PERCENT', 1, { qua: [k.quaSp('FIFO')] })); ten = x.ten; return [x]; },
			gio: [{ key: 'TC', sl: 1 }],
			ky: { can: 99_000, giam: 1_000 },
			sauKhiAp: async () => {
				const khoi = page.locator('.order-gift-block');
				await expect(khoi, 'Không có khối "Quà tặng đơn hàng"').toBeVisible({ timeout: 10_000 });
				const t = p.chuan(await khoi.innerText());
				test.info().annotations.push({ type: 'khối quà', description: t });
				expect(t).toContain(k.sp('FIFO').ten);
				expect(t).toContain('Quà tặng');
				expect(t, 'Phía trên dòng quà không có tên CTKM').toContain(ten);
			},
		});
	});

	test('11_090_009 — Kiểm tra Áp dụng CT giảm giá kèm quà tặng hết hàng', async ({ page, browser }) => {
		chanNeuTat('11_090_009');
		// Quà = SP CÓ bảng giá hiệu lực ở điểm bán seed nhưng TỒN 0: SP `AUTO<làn>SPHET` (tự dựng lần đầu — khuôn seed 4.2 + bảng giá 16.1,
		// không nhập kho). 🔴 TD1/TD2 không dùng được: BE chặn "Sản phẩm chưa nằm trong bảng giá có hiệu lực" trước bước kiểm tồn.
		const ps0 = await k.moPhien(browser);
		const td2 = await k.spHetHang(ps0);
		await ps0.don();
		const pu = td2.productUnitId; const pid = td2.productId; const vid = td2.variantId; const unit = td2.unit;
		const ps = await k.moPhien(browser);
		try {
			const km = await ps.tao(DON('GIAM1K_TANG_HET', 'VND', 1_000, { qua: [{ id: null, productId: Number(pid), productUnitId: Number(pu), variantId: Number(vid), categoryId: null, sku: td2.sku, unit, quantity: 1 }] }));
			await p.chanIn(page);
			await p.moBan(page, test);
			await k.themGio(page, [{ key: 'TC', sl: 1 }]);
			await k.chiApKm(page, [km.ten]);
			const khoi = page.locator('.order-gift-block');
			const coKhoi = await khoi.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false);
			const tKhoi = coKhoi ? p.chuan(await khoi.innerText()) : '';
			await page.mouse.move(600, 700);
			const n = page.locator('.ant-message-notice');
			const ghi = [];
			page.on('response', (r) => { if (/draft-checkout|checkout/.test(r.url()) && r.request().method() === 'POST') ghi.push(r); });
			await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
			const m = page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last();
			if (await m.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false)) await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
			await n.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null);
			await page.waitForTimeout(2_000);
			const tb = p.chuan((await n.allInnerTexts()).join(' | '));
			const popup = p.chuan(await page.getByRole('dialog').filter({ hasText: /không đủ/i }).last().innerText().catch(() => ''));
			const body = ghi.length ? await ghi[ghi.length - 1].json().catch(() => null) : null;
			test.info().annotations.push({ type: 'đo', description: `khối quà "${tKhoi}" · "${tb}" · popup "${popup.slice(0, 300)}" · checkout ${JSON.stringify(body?.status)} · orderId ${body?.data?.orderId}` });
			expect(coKhoi, 'Không hiện khối quà tặng đơn hàng').toBe(true);
			expect(tKhoi).toContain(td2.ten);
			expect(`${tb} ${popup}`, 'Không báo "Số lượng trong kho không đủ"').toMatch(/Số lượng trong kho không đủ/i);
			expect(String(body?.status?.code ?? ''), 'Quà hết hàng mà đơn vẫn lưu thành công').not.toBe('200');
		} finally {
			await page.keyboard.press('Escape').catch(() => null);
			await p.donTab(page).catch(() => null);
			await ps.don();
		}
	});

	test('11_120_001 — Kiểm tra Áp dụng cùng lúc nhiều CTKM giảm %', async ({ page, browser }) => {
		chanNeuTat('11_120_001');
		await chay(page, browser, { dung: async (ps) => [await ps.tao(DON('GIAM10PT', 'PERCENT', 10)), await ps.tao(DON('GIAM3PT', 'PERCENT', 3))], gio: [{ key: 'TC', sl: 5 }], ky: { can: 435_000, giam: 65_000 } });
	});

	test('11_120_002 — Kiểm tra Áp dụng cùng lúc nhiều CTKM giảm theo số tiền cố định', async ({ page, browser }) => {
		chanNeuTat('11_120_002');
		await chay(page, browser, { dung: async (ps) => [await ps.tao(DON('GIAM50K', 'VND', 50_000)), await ps.tao(DON('GIAM15K', 'VND', 15_000))], gio: [{ key: 'TC', sl: 5 }], ky: { can: 435_000, giam: 65_000 } });
	});

	test('11_120_003 — Kiểm tra Áp dụng cùng lúc nhiều CTKM giảm theo số tiền cố định và theo %', async ({ page, browser }) => {
		chanNeuTat('11_120_003');
		await chay(page, browser, {
			dung: async (ps) => [await ps.tao(DON('GIAM10PT', 'PERCENT', 10)), await ps.tao(DON('GIAM3PT', 'PERCENT', 3)), await ps.tao(DON('GIAM50K', 'VND', 50_000)), await ps.tao(DON('GIAM15K', 'VND', 15_000))],
			gio: [{ key: 'TC', sl: 5 }], ky: { can: 370_000, giam: 130_000 },
		});
	});

	test('11_120_004 — Kiểm tra Áp dụng cùng lúc CT giảm toàn đơn và CT giảm sau CT khác', async ({ page, browser }) => {
		chanNeuTat('11_120_004');
		// 130k (4 CT thứ tự 1) ⇒ còn 370k ⇒ 370k × (5% + 2%) = 25.900 ⇒ tổng 155.900, cần trả 344.100.
		await chay(page, browser, {
			dung: async (ps) => [
				await ps.tao(DON('GIAM10PT', 'PERCENT', 10)), await ps.tao(DON('GIAM3PT', 'PERCENT', 3)), await ps.tao(DON('GIAM50K', 'VND', 50_000)), await ps.tao(DON('GIAM15K', 'VND', 15_000)),
				await ps.tao(DON('GIAM5PT_SAU', 'PERCENT', 5, { uuTien: 2 })), await ps.tao(DON('GIAM2PT_SAU', 'PERCENT', 2, { uuTien: 2 })),
			],
			gio: [{ key: 'TC', sl: 5 }], ky: { can: 344_100, giam: 155_900 },
		});
	});

	test('11_120_005 — Kiểm tra Áp dụng cùng lúc nhiều CT giảm sau CT khác', async ({ page, browser }) => {
		chanNeuTat('11_120_005');
		await chay(page, browser, { dung: async (ps) => [await ps.tao(DON('GIAM5PT_SAU', 'PERCENT', 5, { uuTien: 2 })), await ps.tao(DON('GIAM2PT_SAU', 'PERCENT', 2, { uuTien: 2 }))], gio: [{ key: 'TC', sl: 5 }], ky: { can: 465_000, giam: 35_000 } });
	});

	test('11_120_013 — Kiểm tra giới hạn áp dụng: Đơn hàng thỏa mãn đồng thời 2 CTKM Đơn hàng nhưng chỉ áp dụng CTKM tốt nhất', async ({ page, browser }) => {
		chanNeuTat('11_120_013');
		// Đơn 300k (TC × 3) thoả cả CT1 (giảm 10k) và CT2 (giảm 20k, LOẠI TRỪ CT1) ⇒ chỉ áp CT tốt nhất: giảm 20k, cần trả 280k.
		await chay(page, browser, {
			dung: async (ps) => { const a = await ps.tao(DON('DON_GIAM10K', 'VND', 10_000)); const b = await ps.tao(DON('DON_GIAM20K', 'VND', 20_000, { loaiTru: [a.campaignId] })); return [a, b]; },
			gio: [{ key: 'TC', sl: 3 }], ky: { can: 280_000, giam: 20_000 },
		});
	});

	test('11_130_001 — Kiểm tra CTKM giảm giá theo DM sản phẩm loại trừ CTKM theo đơn hàng', async ({ page, browser }) => {
		chanNeuTat('11_130_001');
		// CTKM danh mục (danh mục của SP TC, giảm 5.000/SP) LOẠI TRỪ 2 CTKM đơn 10% + 3%. Kịch bản: đơn chỉ nhận 2 CTKM đơn ⇒ giảm 65k.
		const idDm = require('../../00_seed/seed-state').doc().duLieu.sanPham.idDanhMuc;
		await chay(page, browser, {
			dung: async (ps) => {
				const a = await ps.tao(DON('GIAM10PT', 'PERCENT', 10));
				const b = await ps.tao(DON('GIAM3PT', 'PERCENT', 3));
				const c = await ps.tao({ loai: 'DM', ten: 'DM_GIAM5K_LOAITRU', cach: 'DISCOUNT_SALE', loaiTru: [a.campaignId, b.campaignId],
					dong: [{ minQuantity: 1, discountSaleSubType: 'EACH_PRODUCT', discountUnit: 'VND', discountValue: 5_000, applyByQuantity: null, categoryIds: [Number(idDm)] }] });
				return [a, b, c];
			},
			gio: [{ key: 'TC', sl: 5 }], ky: { can: 435_000, giam: 65_000 },
		});
	});
});
