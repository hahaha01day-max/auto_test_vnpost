'use strict';

/**
 * 12_4 — CTKM đặt hàng NCC (060/070/090) + hợp đồng áp vào PO (040_002/003, 080_012/014–017), GHI THẬT, vai `tct` (26/09/2026).
 *
 * CTKM: màn `/supplier/promotions`, API `/supplier-promotions` (+ `/{id}/activate|deactivate|cancel`). Quy tắc (items):
 * rewardType PERCENT_ORDER · AMOUNT_ORDER · AMOUNT_PRODUCT · BUY_X_GET_Y, scope ORDER/PRODUCT/CATEGORY (PromotionFormDrawer.jsx).
 * Áp vào PO đo trên FORM tạo PO (không lưu PO) bằng helper 13_3 `po-ghi.moTaoDayDu` (kho TCT · NCC seed · hợp đồng seed · SP TC —
 * bảng giá mua 60.000 gồm VAT). 🔴 Trong lúc đo, các CTKM ĐANG ÁP DỤNG khác của NCC seed bị tạm ngừng rồi bật lại ở finally
 * (tránh cộng dồn ưu đãi làm sai số). CTKM tạm tên `AUTO<làn>_KMNCC_*` bị HỦY ở finally.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const { batHeader, goiGhi } = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const po = require('../../13_3_dat_hang_va_nhap_hang/tests/po-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const hau = () => Date.now().toString().slice(-6);
const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);
const d = () => seed.doc().duLieu;
const supplierId = () => d().sanPhamNcc.supplierId;
const skuTc = () => d().sanPham.sanPhamTheoGiaVon.tieuChuan.sku;
const f = (t, gio) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${gio}`;

async function phien(page, route = '/supplier/promotions') {
	const st = batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}${route}`, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	await page.waitForTimeout(1_500);
	const goi = (m, u, q, b) => goiGhi(page, st, m, u, q, b);
	const taoRa = [];
	const daNgung = [];
	return {
		st, goi, taoRa,
		/** Tạo CTKM tạm (API) — `items` theo payload PromotionFormDrawer; kích hoạt nếu `bat`. */
		async tao({ ten, items, minOrderAmount = null, minOrderQuantity = null, bat = true }) {
			const name = `${seed.PREFIX}KMNCC_${ten}_${hau()}`;
			const hom = new Date();
			const r = await goi('POST', '/supplier-promotions', {}, { name, supplierId: supplierId(), startDate: f(hom, '00:00:00'), endDate: f(new Date(hom.getTime() + 7 * 86400_000), '23:59:59'), minOrderAmount, minOrderQuantity, note: 'AUTO TEST 12_4', items });
			expect(String(r?.status?.code), `Tạo CTKM NCC lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
			const km = ds((await goi('GET', '/supplier-promotions', { keyword: name, page: 0, size: 20 }))?.data).find((x) => x.name === name);
			expect(km, `Không thấy CTKM ${name}`).toBeTruthy();
			taoRa.push(km.id);
			if (bat) { const a = await goi('POST', `/supplier-promotions/${km.id}/activate`); expect(String(a?.status?.code), `Kích hoạt CTKM lỗi: ${JSON.stringify(a?.status)}`).toBe('200'); }
			return { ...km, name };
		},
		/** Tạm ngừng mọi CTKM ĐANG ÁP DỤNG khác của NCC seed. */
		async ngungKhac() {
			const all = ds((await goi('GET', '/supplier-promotions', { supplierId: supplierId(), status: 'ACTIVE', page: 0, size: 100 }))?.data).filter((x) => x.status === 'ACTIVE' && String(x.supplierId ?? supplierId()) === String(supplierId()) && !taoRa.includes(x.id));
			for (const k of all) { await goi('POST', `/supplier-promotions/${k.id}/deactivate`); daNgung.push(k.id); }
			return all.map((k) => k.name);
		},
		async don() {
			for (const id of taoRa) await goi('POST', `/supplier-promotions/${id}/cancel`).catch(() => null);
			for (const id of daNgung) await goi('POST', `/supplier-promotions/${id}/activate`).catch(() => null);
		},
	};
}

/** Mở form PO (kho TCT, NCC + HĐ seed), đặt `sl` SP TC; trả { dong, tong, coTag }. */
async function doPo(page, sl, hd) {
	await po.moTaoDayDu(page, { sl });
	if (hd) {
		await po.chonOption(page, po.fi(page, 'Hợp đồng NCC'), hd, false);
		await page.waitForTimeout(1_000);
	}
	await page.waitForTimeout(2_500); // CTKM tự áp sau debounce 500ms
	const coTag = await page.locator('.ant-tag').filter({ hasText: 'CTKM' }).first().waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false);
	const dong = (await po.bangSp(page).locator('tbody tr.ant-table-row').allInnerTexts()).map(chuan);
	const tong = chuan(await page.locator('.ant-pro-card').filter({ hasText: 'Tổng giá trị đặt hàng' }).first().innerText().catch(() => ''));
	const canhBao = chuan((await page.locator('.ant-alert, .ant-message-notice, .ant-notification-notice').allInnerTexts()).join(' | '));
	return { dong, tong, coTag, canhBao };
}
const soTien = (t, nhan) => { const m = t.match(new RegExp(`${nhan}[^\\d-]*(-?[\\d.]+)\\s*đ?`)); return m ? Number(m[1].replace(/\./g, '')) : null; };

test.describe('12_4 — CTKM NCC & áp vào PO (GHI)', () => {
	test.describe.configure({ timeout: 360_000 });

	test('12_4_090_011 — Kiểm tra thêm mới CTKM bỏ trống trường thông tin bắt buộc', async ({ page }) => {
		chanNeuTat('12_4_090_011');
		await phien(page);
		await khung(page).getByRole('button', { name: /Thêm mới/ }).first().click();
		const dr = page.locator('.ant-drawer-open').last();
		await expect(dr.getByPlaceholder('Nhập tên chương trình')).toBeVisible({ timeout: 15_000 });
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'POST' && /supplier-promotions/.test(r.url())) daGoi.push(r.url()); });
		await dr.getByRole('button', { name: /^(Lưu|Tạo|Xác nhận|Thêm mới)$/ }).last().click();
		await page.waitForTimeout(1_500);
		const loi = (await dr.locator('.ant-form-item-explain-error').allInnerTexts()).map(chuan);
		ghiDo(`lỗi: ${JSON.stringify(loi)} · request ${daGoi.length}`);
		expect(daGoi).toEqual([]);
		expect(loi.length, 'Bỏ trống không báo lỗi').toBeGreaterThanOrEqual(3);
		expect(loi.join(' | '), 'Câu chữ khác kịch bản "Hãy nhập thông tin cho trường …"').toMatch(/Hãy nhập thông tin cho trường Tên chương trình/);
	});

	test('12_4_060_002 — Lập chương trình khuyến mãi đặt hàng', async ({ page }) => {
		chanNeuTat('12_4_060_002');
		const s = await phien(page);
		try {
			const km = await s.tao({ ten: 'LAP', bat: false, items: [{ rewardType: 'AMOUNT_PRODUCT', scope: 'PRODUCT', sku: skuTc(), tierMinQty: 1, discountAmount: 1_000, giftSku: skuTc() }] });
			await page.reload();
			await page.waitForTimeout(2_500);
			const dongKm = khung(page).locator('tr.ant-table-row').filter({ hasText: km.name }).first();
			const t = chuan(await dongKm.innerText().catch(() => ''));
			ghiDo(`dòng: ${t}`);
			expect(t, 'CTKM mới không ở trạng thái Nháp').toMatch(/Nháp/);
		} finally { await s.don(); }
	});

	test('12_4_060_001 — Chặn lập CTKM khi mặt hàng chưa gán cho nhà cung cấp', async ({ page }) => {
		chanNeuTat('12_4_060_001');
		const s = await phien(page);
		const skuLa = d().danhMucB?.ngk?.sku || d().sanPham.sanPhamTheoGiaVon.fifo.sku; // SP không có trong bảng giá mua của NCC seed
		const hom = new Date();
		const r = await s.goi('POST', '/supplier-promotions', {}, { name: `${seed.PREFIX}KMNCC_SKULA_${hau()}`, supplierId: supplierId(), startDate: f(hom, '00:00:00'), endDate: f(hom, '23:59:59'), note: 'AUTO TEST', items: [{ rewardType: 'AMOUNT_PRODUCT', scope: 'PRODUCT', sku: skuLa, tierMinQty: 1, discountAmount: 1_000, giftSku: skuLa }] });
		if (String(r?.status?.code) === '200') { const km = ds((await s.goi('GET', '/supplier-promotions', { keyword: 'SKULA', page: 0, size: 5 }))?.data)[0]; if (km) s.taoRa.push(km.id); }
		// Form: ô SKU chỉ liệt kê SP đã gán cho NCC (placeholder "Chọn NCC trước" khi chưa chọn NCC).
		ghiDo(`API tạo CTKM với SKU chưa gán (${skuLa}): ${JSON.stringify(r?.status)}`);
		await s.don();
		expect(String(r?.status?.code), '🔴 BE nhận CTKM có mặt hàng chưa gán cho NCC').not.toBe('200');
	});

	test('12_4_070_001 — Nút thao tác CTKM đổi theo trạng thái', async ({ page }) => {
		chanNeuTat('12_4_070_001');
		const s = await phien(page);
		try {
			const nhap = await s.tao({ ten: 'NUT_NHAP', bat: false, items: [{ rewardType: 'AMOUNT_PRODUCT', scope: 'PRODUCT', sku: skuTc(), tierMinQty: 1, discountAmount: 1_000, giftSku: skuTc() }] });
			const dang = await s.tao({ ten: 'NUT_DANG', items: [{ rewardType: 'AMOUNT_PRODUCT', scope: 'PRODUCT', sku: skuTc(), tierMinQty: 99, discountAmount: 1_000, giftSku: skuTc() }] });
			await page.reload();
			await page.waitForTimeout(2_500);
			const nut = async (ten) => chuan(await khung(page).locator('tr.ant-table-row').filter({ hasText: ten }).first().locator('td').last().innerText());
			const a = await nut(nhap.name);
			const b = await nut(dang.name);
			ghiDo(`Nháp: "${a}" · Đang áp dụng: "${b}"`);
			expect(a).toContain('Kích hoạt');
			expect(b).toContain('Ngừng');
			expect(b).not.toContain('Kích hoạt');
		} finally { await s.don(); }
	});

	test('12_4_070_002 — Kích hoạt chương trình khuyến mãi', async ({ page }) => {
		chanNeuTat('12_4_070_002');
		const s = await phien(page);
		try {
			const khac = await s.ngungKhac();
			const km = await s.tao({ ten: 'BAT', bat: false, items: [{ rewardType: 'AMOUNT_PRODUCT', scope: 'PRODUCT', sku: skuTc(), tierMinQty: 1, discountAmount: 2_000, giftSku: skuTc() }] });
			await page.reload();
			await page.waitForTimeout(2_500);
			await khung(page).locator('tr.ant-table-row').filter({ hasText: km.name }).first().getByRole('button', { name: 'Kích hoạt' }).click();
			await page.waitForTimeout(2_000);
			const t = chuan(await khung(page).locator('tr.ant-table-row').filter({ hasText: km.name }).first().innerText());
			const p = await doPo(page, 2);
			ghiDo(`tạm ngừng CTKM khác: ${khac.join(', ') || 'không'} · dòng "${t}" · PO: tag CTKM=${p.coTag} · ${p.dong.join(' | ')}`);
			expect(t).toMatch(/Đang áp dụng/);
			expect(p.coTag, 'Kích hoạt rồi mà PO không tự áp CTKM').toBe(true);
			expect(p.dong[0], 'Dòng PO không giảm 2.000/SP').toMatch(/2\.000/);
		} finally { await s.don(); }
	});

	test('12_4_070_003 — Ngừng chương trình đang áp dụng', async ({ page }) => {
		chanNeuTat('12_4_070_003');
		const s = await phien(page);
		try {
			await s.ngungKhac();
			const km = await s.tao({ ten: 'NGUNG', items: [{ rewardType: 'AMOUNT_PRODUCT', scope: 'PRODUCT', sku: skuTc(), tierMinQty: 1, discountAmount: 2_000, giftSku: skuTc() }] });
			await page.reload();
			await page.waitForTimeout(2_500);
			await khung(page).locator('tr.ant-table-row').filter({ hasText: km.name }).first().getByRole('button', { name: 'Ngừng' }).click();
			await page.waitForTimeout(2_000);
			const t = chuan(await khung(page).locator('tr.ant-table-row').filter({ hasText: km.name }).first().innerText());
			const p = await doPo(page, 2);
			ghiDo(`dòng "${t}" · PO: tag CTKM=${p.coTag}`);
			expect(t).toMatch(/Đang ngừng|Ngừng/);
			expect(p.coTag, 'Đã ngừng mà PO vẫn tự áp CTKM').toBe(false);
		} finally { await s.don(); }
	});

	test('12_4_090_012 — Kiểm tra xem chi tiết thông tin CTKM', async ({ page }) => {
		chanNeuTat('12_4_090_012');
		const s = await phien(page);
		try {
			const km = await s.tao({ ten: 'XEM', bat: false, items: [{ rewardType: 'PERCENT_ORDER', scope: 'ORDER', tierMinAmount: 100_000, discountPercent: 3 }] });
			await page.reload();
			await page.waitForTimeout(2_500);
			await khung(page).locator('tr.ant-table-row').filter({ hasText: km.name }).first().getByRole('button', { name: 'Xem' }).click();
			const ct = page.locator('.ant-drawer-open').last();
			await expect(ct).toContainText(km.name, { timeout: 15_000 });
			const t = chuan(await ct.innerText());
			ghiDo(t.slice(0, 300));
			expect(t).toContain(km.name);
			expect(t).toContain(d().nhaCungCap.tenNcc);
		} finally { await s.don(); }
	});

	test('12_4_090_013 — Kiểm tra sửa thông tin CTKM', async ({ page }) => {
		chanNeuTat('12_4_090_013');
		const s = await phien(page);
		try {
			const km = await s.tao({ ten: 'SUA', bat: false, items: [{ rewardType: 'AMOUNT_PRODUCT', scope: 'PRODUCT', sku: skuTc(), tierMinQty: 1, discountAmount: 1_000, giftSku: skuTc() }] });
			await page.reload();
			await page.waitForTimeout(2_500);
			await khung(page).locator('tr.ant-table-row').filter({ hasText: km.name }).first().getByRole('button', { name: 'Sửa' }).click();
			const dr = page.locator('.ant-drawer-open').last();
			await expect(dr.getByPlaceholder('Nhập tên chương trình')).toHaveValue(km.name, { timeout: 15_000 });
			await dr.getByPlaceholder('Nhập tên chương trình').fill(`${km.name}_S`);
			const tb = page.locator('.ant-message-notice').first().waitFor({ timeout: 10_000 }).then(() => page.locator('.ant-message-notice').allInnerTexts()).catch(() => []);
			await dr.getByRole('button', { name: /^(Lưu|Cập nhật|Xác nhận)$/ }).last().click();
			const t = chuan((await tb).join(' | '));
			ghiDo(`sửa: "${t}" (nhánh "PO đang dùng CTKM không được sửa" cần PO nháp dùng CTKM — xem báo cáo)`);
			expect(t).toContain('Cập nhật chương trình thành công');
		} finally { await s.don(); }
	});

	test('12_4_090_014 — Kiểm tra Huỷ CTKM', async ({ page }) => {
		chanNeuTat('12_4_090_014');
		const s = await phien(page);
		try {
			const km = await s.tao({ ten: 'HUY', bat: false, items: [{ rewardType: 'AMOUNT_PRODUCT', scope: 'PRODUCT', sku: skuTc(), tierMinQty: 1, discountAmount: 1_000, giftSku: skuTc() }] });
			await page.reload();
			await page.waitForTimeout(2_500);
			await khung(page).locator('tr.ant-table-row').filter({ hasText: km.name }).first().getByRole('button', { name: 'Hủy' }).click();
			const h = page.locator('.ant-modal-confirm').filter({ hasText: 'Hủy chương trình khuyến mãi?' }).last();
			await h.locator('.ant-btn-dangerous, .ant-btn-primary').last().click();
			await page.waitForTimeout(2_000);
			const r = khung(page).locator('tr.ant-table-row').filter({ hasText: km.name }).first();
			const t = chuan(await r.innerText());
			const a = await s.goi('POST', `/supplier-promotions/${km.id}/activate`);
			ghiDo(`dòng "${t}" · kích hoạt lại qua API: ${JSON.stringify(a?.status)}`);
			expect(t).toMatch(/Đã hủy|Đã huỷ/);
			expect(t, 'CTKM đã hủy vẫn có nút Kích hoạt').not.toContain('Kích hoạt');
			expect(String(a?.status?.code), '🔴 CTKM đã hủy vẫn kích hoạt lại được').not.toBe('200');
		} finally { await s.don(); }
	});

	// ─── Áp CTKM vào PO ───────────────────────────────────────────────────────────────
	async function kiemApPo(page, khai, sl, kyVong) {
		const s = await phien(page);
		try {
			const khac = await s.ngungKhac();
			await s.tao(khai);
			const p = await doPo(page, sl);
			ghiDo(`tạm ngừng: ${khac.join(', ') || 'không'} · SL ${sl} · tag CTKM=${p.coTag} · dòng ${JSON.stringify(p.dong)} · tổng "${p.tong}"`);
			kyVong(p);
		} finally { await s.don(); }
	}
	test('12_4_090_015 — Kiểm tra chiết khấu % toàn đơn', async ({ page }) => {
		chanNeuTat('12_4_090_015');
		await kiemApPo(page, { ten: 'PT10', items: [{ rewardType: 'PERCENT_ORDER', scope: 'ORDER', tierMinAmount: 1, discountPercent: 10 }] }, 10, (p) => {
			expect(p.coTag, 'CTKM % toàn đơn không áp').toBe(true);
			// Giảm % toàn đơn tính trên TẠM TÍNH TRƯỚC VAT (555.556) ⇒ -55.556 (không phải 10% của tổng gồm VAT 600.000).
			expect(p.tong, 'Tổng PO không có giảm 10% trên tạm tính trước VAT (55.556)').toMatch(/Giảm giá toàn đơn \(KM[^)]*\) -55\.556/);
		});
	});
	test('12_4_090_016 — Kiểm tra chiết khấu giảm tiền toàn đơn', async ({ page }) => {
		chanNeuTat('12_4_090_016');
		await kiemApPo(page, { ten: 'TIEN50K', items: [{ rewardType: 'AMOUNT_ORDER', scope: 'ORDER', tierMinAmount: 1, discountAmount: 50_000 }] }, 10, (p) => {
			expect(p.coTag).toBe(true);
			expect(p.tong, 'Tổng PO không giảm 50.000').toMatch(/50\.000/);
		});
	});
	test('12_4_090_017 — Kiểm tra hình thức Mua X tặng Y', async ({ page }) => {
		chanNeuTat('12_4_090_017');
		await kiemApPo(page, { ten: 'MUA2T1', items: [{ rewardType: 'BUY_X_GET_Y', scope: 'PRODUCT', sku: skuTc(), tierMinQty: 2, buyQuantity: 2, giftSku: skuTc(), giftQuantity: 1 }] }, 4, (p) => {
			expect(p.coTag).toBe(true);
			const tang = p.dong.slice(1).find((x) => x.includes(skuTc()));
			expect(tang, 'Không có dòng tặng đúng SKU').toBeTruthy();
			expect(tang, 'Mua 4 (X=2, Y=1) phải tặng 2').toMatch(/\b2\b/);
		});
	});
	test('12_4_090_018 — Kiểm tra giảm giá tiền theo sản phẩm', async ({ page }) => {
		chanNeuTat('12_4_090_018');
		await kiemApPo(page, { ten: 'SP3K', items: [{ rewardType: 'AMOUNT_PRODUCT', scope: 'PRODUCT', sku: skuTc(), tierMinQty: 1, discountAmount: 3_000, giftSku: skuTc() }] }, 5, (p) => {
			expect(p.coTag).toBe(true);
			expect(p.dong[0], 'Dòng SP không giảm 3.000').toMatch(/3\.000|15\.000/);
		});
	});
	test('12_4_090_019 — Kiểm tra áp dụng CTKM với giá trị đơn tối thiểu', async ({ page }) => {
		chanNeuTat('12_4_090_019');
		const s = await phien(page);
		try {
			await s.ngungKhac();
			await s.tao({ ten: 'MIN1TR', minOrderAmount: 1_000_000, items: [{ rewardType: 'PERCENT_ORDER', scope: 'ORDER', tierMinAmount: 1, discountPercent: 5 }] });
			const duoi = await doPo(page, 10); // 600.000 < 1.000.000
			const tren = await doPo(page, 20); // 1.200.000
			ghiDo(`600k: tag=${duoi.coTag} "${duoi.tong}" · 1,2tr: tag=${tren.coTag} "${tren.tong}"`);
			expect(duoi.coTag, 'Đơn dưới giá trị tối thiểu vẫn áp CTKM').toBe(false);
			expect(tren.coTag, 'Đơn đạt giá trị tối thiểu không áp CTKM').toBe(true);
		} finally { await s.don(); }
	});
	test('12_4_090_020 — Kiểm tra áp dụng CTKM với số lượng đơn tối thiểu', async ({ page }) => {
		chanNeuTat('12_4_090_020');
		const s = await phien(page);
		try {
			await s.ngungKhac();
			await s.tao({ ten: 'MINSL15', minOrderQuantity: 15, items: [{ rewardType: 'PERCENT_ORDER', scope: 'ORDER', tierMinAmount: 1, discountPercent: 5 }] });
			const duoi = await doPo(page, 10);
			const tren = await doPo(page, 15);
			ghiDo(`SL10: tag=${duoi.coTag} · SL15: tag=${tren.coTag} "${tren.tong}"`);
			expect(duoi.coTag, 'SL dưới tối thiểu vẫn áp').toBe(false);
			expect(tren.coTag, 'SL đạt tối thiểu không áp').toBe(true);
		} finally { await s.don(); }
	});

	// ─── Hợp đồng áp vào PO / chi tiết ─────────────────────────────────────────────────
	async function hdTam(s, khaiGoc) {
		const { duyet, ...khai } = khaiGoc;
		const ma = `A${process.env.VNPOST_LANE || ''}HDPO${hau()}`;
		const r = await s.goi('POST', '/chain-supplier-contract', {}, {
			contractCode: ma, supplierId: supplierId(), contractType: 'FRAMEWORK', effectiveFrom: new Date(Date.now() - 86400_000).toISOString(),
			effectiveTo: new Date(Date.now() + 2 * 86400_000).toISOString(), totalValue: null, discountRate: null, creditLimit: null, paymentTermDays: null,
			maxReturnDays: null, isConsignment: false, reconciliationCycle: null, reconciliationAnchorDay: null, note: 'AUTO TEST 12_4', ...khai,
		});
		expect(String(r?.status?.code), `Tạo hợp đồng tạm lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
		const id = r?.data?.id;
		s.hd = (s.hd || []).concat(id);
		if (duyet !== false) await s.goi('POST', `/chain-supplier-contract/${id}/status`, { status: 'ACTIVE' });
		return { id, ma };
	}
	const donHd = async (s) => { for (const id of s.hd || []) { await s.goi('POST', `/chain-supplier-contract/${id}/active`, { active: false, reason: 'AUTO TEST dọn' }).catch(() => null); await s.goi('DELETE', `/chain-supplier-contract/${id}`).catch(() => null); } };

	test('12_4_080_012 — Kiểm tra kích hoạt hợp đồng', async ({ page }) => {
		chanNeuTat('12_4_080_012');
		const s = await phien(page, '/supplier/contracts');
		try {
			// Khoảng hiệu lực tương lai RIÊNG (trùng kỳ với hợp đồng seed thì BE không duyệt).
			const t0 = Date.now() + (500 + Math.floor(Math.random() * 5000)) * 86400_000;
			const hl = await hdTam(s, { effectiveFrom: new Date(t0).toISOString(), effectiveTo: new Date(t0 + 2 * 86400_000).toISOString() });
			const nhap = await hdTam(s, { duyet: false, effectiveFrom: new Date(t0 + 5 * 86400_000).toISOString(), effectiveTo: new Date(t0 + 6 * 86400_000).toISOString() });
			await po.moTaoDayDu(page, { sl: 1 });
			const o = po.fi(page, 'Hợp đồng NCC').locator('.ant-select').first();
			await o.click();
			await page.waitForTimeout(1_500);
			const lua = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(chuan);
			ghiDo(`ô Hợp đồng NCC của PO: ${JSON.stringify(lua)}`);
			expect(lua.some((x) => x.includes(hl.ma)), 'Hợp đồng HIỆU LỰC không có trong PO').toBe(true);
			expect(lua.some((x) => x.includes(nhap.ma)), 'Hợp đồng NHÁP vẫn chọn được trong PO').toBe(false);
		} finally { await donHd(s); }
	});

	/**
	 * 🔴 NCC seed đã có hợp đồng HIỆU LỰC ⇒ BE không duyệt thêm hợp đồng trùng kỳ ⇒ tạm SỬA chính hợp đồng seed (PUT ⇒ về Nháp), duyệt lại,
	 * đo trên PO rồi TRẢ LẠI giá trị gốc + duyệt lại (finally).
	 */
	async function voiHdSeed(s, patch, fn) {
		const hd = ds((await s.goi('GET', '/chain-supplier-contract', { keyword: d().sanPhamNcc.soHopDong, page: 0, size: 5 }))?.data).find((x) => x.contractCode === d().sanPhamNcc.soHopDong);
		expect(hd, 'Không thấy hợp đồng seed').toBeTruthy();
		const goc = (await s.goi('GET', `/chain-supplier-contract/${hd.id}`))?.data;
		// Body đúng các trường FE gửi (SupplierContractFormDrawer.handleSubmit).
		const TRUONG = ['contractCode', 'supplierId', 'contractType', 'effectiveFrom', 'effectiveTo', 'totalValue', 'discountRate', 'creditLimit', 'paymentTermDays', 'maxReturnDays', 'isConsignment', 'reconciliationCycle', 'reconciliationAnchorDay', 'salesBonusPolicy', 'defectReturnPolicy', 'note'];
		const put = (vals) => s.goi('PUT', `/chain-supplier-contract/${hd.id}`, {}, { ...Object.fromEntries(TRUONG.map((t) => [t, goc[t] ?? null])), isConsignment: !!goc.isConsignment, ...vals });
		try {
			const r = await put(patch);
			expect(String(r?.status?.code), `Sửa hợp đồng seed lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
			const dv = await s.goi('POST', `/chain-supplier-contract/${hd.id}/status`, { status: 'ACTIVE' });
			const sau = (await s.goi('GET', `/chain-supplier-contract/${hd.id}`))?.data;
			ghiDo(`hợp đồng seed sau sửa: ${JSON.stringify(Object.fromEntries(Object.keys(patch).map((k2) => [k2, sau?.[k2]])))} · duyệt lại ${JSON.stringify(dv?.status)} · status ${sau?.status}`);
			return await fn(hd);
		} finally {
			await put({ discountRate: goc.discountRate, creditLimit: goc.creditLimit, paymentTermDays: goc.paymentTermDays, maxReturnDays: goc.maxReturnDays });
			await s.goi('POST', `/chain-supplier-contract/${hd.id}/status`, { status: 'ACTIVE' });
		}
	}

	test('12_4_080_014 — Kiểm tra chiết khấu %', async ({ page }) => {
		chanNeuTat('12_4_080_014');
		const s = await phien(page, '/supplier/contracts');
		try {
			await s.ngungKhac();
			await voiHdSeed(s, { discountRate: 5 }, async () => {
				const p = await doPo(page, 10);
				ghiDo(`HĐ seed CK 5% · 10 × 60.000 (tạm tính trước VAT 555.556) · tổng "${p.tong}" · dòng ${p.dong[0]}`);
				expect(`${p.tong} ${p.dong[0]}`, 'PO không giảm 5% theo hợp đồng').toMatch(/27\.778|30\.000|5%/);
			});
		} finally { await s.don(); }
	});

	test('12_4_080_015 — Kiểm tra theo hạn mức công nợ', async ({ page }) => {
		chanNeuTat('12_4_080_015');
		const s = await phien(page, '/supplier/contracts');
		await voiHdSeed(s, { creditLimit: 1_000 }, async () => {
			const p = await doPo(page, 10);
			ghiDo(`HĐ seed hạn mức 1.000đ · cảnh báo: "${p.canhBao}" · tổng "${p.tong}"`);
			expect(p.canhBao, 'Vượt hạn mức công nợ không có cảnh báo').toMatch(/hạn mức|vượt/i);
		});
	});

	test('12_4_080_016 — Kiểm tra hạn thanh toán', async ({ page }) => {
		chanNeuTat('12_4_080_016');
		const s = await phien(page, '/supplier/contracts');
		await voiHdSeed(s, { paymentTermDays: 0 }, async () => {
			const p = await doPo(page, 1);
			ghiDo(`HĐ seed hạn thanh toán 0 ngày (NCC còn nợ cũ) · cảnh báo: "${p.canhBao}"`);
			expect(p.canhBao, 'Không cảnh báo đơn quá hạn thanh toán').toMatch(/quá hạn|hạn thanh toán/i);
		});
	});

	test('12_4_080_017 — Kiểm tra thời hạn được trả hàng', async ({ page }) => {
		chanNeuTat('12_4_080_017');
		const s = await phien(page, '/supplier/contracts');
		try {
			const hd = await hdTam(s, { maxReturnDays: 1 });
			const ct = (await s.goi('GET', `/chain-supplier-contract/${hd.id}`))?.data;
			ghiDo(`HĐ maxReturnDays=${ct?.maxReturnDays} (chặn trả hàng quá hạn đo ở 14_1_010_036 — phiếu nhập NCC > 1 ngày)`);
			expect(ct?.maxReturnDays).toBe(1);
			const r = await s.goi('GET', '/chain-supplier-contract', { keyword: hd.ma, page: 0, size: 5 });
			expect(JSON.stringify(r?.data)).toContain(hd.ma);
		} finally { await donHd(s); }
	});

	test('12_4_040_002 — Hợp đồng ký gửi có nhãn riêng', async ({ page }) => {
		chanNeuTat('12_4_040_002');
		const s = await phien(page, '/supplier/contracts');
		try {
			const hd = await hdTam(s, { isConsignment: true, reconciliationCycle: 'MONTH', reconciliationAnchorDay: 1, maxReturnDays: 30, duyet: false });
			await page.reload();
			await page.waitForTimeout(2_000);
			const o = khung(page).getByPlaceholder('Tìm số HĐ / tên / mã NCC');
			await o.fill(hd.ma);
			await o.press('Enter');
			await page.waitForTimeout(2_000);
			await khung(page).locator('tr.ant-table-row').filter({ hasText: hd.ma }).first().getByRole('button', { name: 'Xem' }).click();
			const ct = page.locator('.ant-drawer-open').last();
			await expect(ct).toBeVisible({ timeout: 15_000 });
			const t = chuan(await ct.innerText());
			ghiDo(t.slice(0, 200));
			expect(t).toContain('Hàng ký gửi');
		} finally { await donHd(s); }
	});

	test('12_4_040_003 — Thẻ Danh sách PO xếp đơn mới nhất trước', async ({ page }) => {
		chanNeuTat('12_4_040_003');
		await phien(page, '/supplier/contracts');
		const o = khung(page).getByPlaceholder('Tìm số HĐ / tên / mã NCC');
		await o.fill(d().sanPhamNcc.soHopDong);
		await o.press('Enter');
		await page.waitForTimeout(2_000);
		await khung(page).locator('tr.ant-table-row').filter({ hasText: d().sanPhamNcc.soHopDong }).first().getByRole('button', { name: 'Xem' }).click();
		const ct = page.locator('.ant-drawer-open').last();
		await expect(ct).toBeVisible({ timeout: 15_000 });
		const tab = ct.getByRole('tab', { name: 'Danh sách PO' });
		if (await tab.count()) await tab.click();
		else { await ct.getByRole('button', { name: /chi tiết|Xem đầy đủ/i }).first().click().catch(() => null); await page.getByRole('tab', { name: 'Danh sách PO' }).click(); }
		await page.waitForTimeout(2_000);
		const bang = page.locator('.ant-tabs-tabpane-active').last();
		const ngay = (await bang.locator('tbody tr.ant-table-row').allInnerTexts()).map((t) => (chuan(t).match(/(\d{2}\/\d{2}\/\d{4})(\s\d{2}:\d{2})?/) || [])[0]).filter(Boolean);
		const ts = ngay.map((x) => { const [dmy, hm = '00:00'] = x.split(' '); const [dd, mm, yy] = dmy.split('/').map(Number); const [h, mi] = hm.split(':').map(Number); return new Date(yy, mm - 1, dd, h, mi).getTime(); });
		ghiDo(`${ngay.length} PO: ${ngay.slice(0, 6).join(', ')}`);
		expect(ngay.length, 'Hợp đồng seed chưa có ≥ 2 PO (chạy 13_3)').toBeGreaterThanOrEqual(2);
		expect(ts, 'Danh sách PO không xếp mới nhất trước').toEqual([...ts].sort((a, b) => b - a));
	});
});
