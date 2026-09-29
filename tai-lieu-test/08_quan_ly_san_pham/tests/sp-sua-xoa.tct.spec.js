'use strict';

/**
 * 08 · 030 — Sửa / xoá sản phẩm (GHI THẬT), vai `tct` (26/09/2026).
 *
 * Đo DOM 26/09: dòng danh sách có nút "Thao tác" ⇒ menu *Xem chi tiết · Cấu hình ngừng kích hoạt · Xóa*. Drawer
 * "Chi tiết sản phẩm" có nút "Sửa thông tin" ⇒ drawer "Cập nhật sản phẩm" (🔴 ô SKU ở Thông tin cơ bản **disabled** khi sửa)
 * ⇒ Xác nhận = `PUT /chain/products/{id}`. Xoá = modal "Xác nhận xóa sản phẩm" ⇒ `DELETE /chain/products/multi`.
 * Tiền đề tự dựng: SP tạm `AUTO<làn>_SPT_*` (API hoặc form), nhập kho bằng `seed_gdv`, bảng giá / combo / CTKM tạm.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const g = require('./sp-ghi');
const { chuan } = require('./product-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const chiTiet = async (m, id) => (await m.goi('GET', `/chain/products/${id}/info`))?.data;
const spMoi = (m, x) => g.taoSpApi(m, { ten: g.TEN(`${x}_${g.hau()}`), sku: g.MA(`${x}${g.hau()}`) });

/** SP có biến thể Màu × giá trị (qua form), trả { id, sku (mã kế toán), ten }. */
async function spBienThe(page, m, x, giaTri, dvqd = []) {
	const h = g.hau();
	const ten = g.TEN(`${x}_${h}`);
	const r = await g.taoQuaForm(page, m, async (dr) => {
		await g.dienCoBan(page, dr, { ten, maKt: g.MA(`${x}${h}`) });
		for (const d of dvqd) await g.themDvqd(page, dr, d);
		await g.themPhanLoai(page, dr, 'Màu', giaTri);
		await g.dienBienThe(page, dr, g.MA(`${x}${h}`));
	});
	return { ...r, ten, goc: g.MA(`${x}${h}`) };
}
const bienTheDb = (id) => g.sql(`select id, name, coalesce(sku,'') from CHAIN_PRODUCT_VARIANTS where product_id=${id} and coalesce(is_deleted,0)=0 order by id`).split('\n').filter(Boolean);
/** Nút xoá dòng cấu hình giá bán (biến thể) — ô "Tên" disabled "Màu: X" cùng dòng. */
const xoaDongBienThe = async (page, dr, nhan) => {
	// Xoá biến thể = bỏ giá trị khỏi ô tag của phân loại (dấu × trên tag), 🚫 bảng giá không có nút xoá dòng.
	const gt = nhan.replace(/^.*:\s*/, '');
	const khoi = dr.locator('.ant-form-item').filter({ hasText: 'Bạn có thể thêm biến thể' }).first();
	const tag = khoi.locator('[title="' + gt + '"], .ant-select-selection-item, .ant-select-content-item').filter({ hasText: new RegExp('^' + gt + '$') }).first();
	await tag.locator('.anticon-close, [aria-label="close"]').first().click();
	await page.waitForTimeout(1_000);
};

test.describe('08 — Sửa / xoá sản phẩm (GHI)', () => {
	test.describe.configure({ timeout: 360_000 });

	test('08_030_001 — CRUD sản phẩm - thêm, sửa tên, xóa thật', async ({ page }) => {
		chanNeuTat('08_030_001');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const ten = g.TEN(`CRUD_${h}`);
			const sku = g.MA(`CR${h}`);
			const { id } = await g.taoQuaForm(page, m, async (dr) => {
				await g.dienCoBan(page, dr, { ten, sku, bc: `${sku}B`, maKt: `KT${h}` });
				await dr.getByRole('radio', { name: 'Hàng hóa' }).check();
			});
			const d = await g.dongSp(page, sku);
			const hang = chuan(await d.innerText());
			ghiDo(`dòng mới: ${hang}`);
			expect(hang).toContain('Kích hoạt');
			// Sửa tên.
			const dr = await g.moSua(page, sku);
			await dr.getByPlaceholder('Tên sản phẩm', { exact: true }).fill(`${ten}_SUA`);
			const kq = await g.luu(page, dr, { method: 'PUT' });
			ghiDo(`sửa: ${kq.body?.status?.code} · "${kq.tb}"`);
			expect(kq.tb, 'Không có toast "Cập nhật thành công"').toContain('Cập nhật thành công');
			expect((await chiTiet(m, id))?.productName).toBe(`${ten}_SUA`);
			// Xoá.
			const x = await g.xoaUi(page, sku);
			ghiDo(`xoá: ${x.code} · toast "${x.tb}" · còn trên DS ${x.conTrenDs}`);
			expect(String(x.code)).toBe('200');
			expect(x.tb, 'Toast xoá khác nguyên văn "Xóa sản phẩm thành công"').toContain('Xóa sản phẩm thành công');
			expect(x.conTrenDs, 'Xoá xong vẫn còn trên danh sách').toBe(0);
		} finally { await m.don(); }
	});

	test('08_030_004 — Sửa sản phẩm khi xoá các ô bắt buộc', async ({ page }) => {
		chanNeuTat('08_030_004');
		const m = await g.moMan(page);
		try {
			const x = await spMoi(m, 'S4');
			const dr = await g.moSua(page, x.sku);
			const daGoi = [];
			page.on('request', (r) => { if (r.method() === 'PUT' && /\/chain\/products\/\d+/.test(r.url())) daGoi.push(r.url()); });
			const kq = {};
			for (const [nhan, o] of [['Tên sản phẩm', dr.getByPlaceholder('Tên sản phẩm', { exact: true })], ['Mã kế toán', dr.getByPlaceholder('Nhập mã kế toán')], ['Đơn vị', dr.getByPlaceholder('VD: ml, hộp, chai, thùng')]]) {
				const cu = await o.inputValue();
				await o.fill('');
				await dr.getByRole('button', { name: 'Cập nhật', exact: true }).click();
				await page.waitForTimeout(1_500);
				kq[nhan] = chuan((await dr.locator('.ant-form-item-explain-error').allInnerTexts()).join(' | '));
				await o.fill(cu);
			}
			ghiDo(`${JSON.stringify(kq)} · PUT đã gửi ${daGoi.length}`);
			for (const [nhan, loi] of Object.entries(kq)) expect(loi, `Xoá trắng "${nhan}" không báo lỗi riêng`).not.toBe('');
			expect(daGoi, 'Ô bắt buộc rỗng mà vẫn gửi PUT').toEqual([]);
			expect((await chiTiet(m, x.id))?.productName).toBe(x.ten);
		} finally { await m.don(); }
	});

	test('08_030_005 — Sửa SKU trùng với SKU đã có trên hệ thống', async ({ page }) => {
		chanNeuTat('08_030_005');
		const m = await g.moMan(page);
		try {
			const x = await spMoi(m, 'S5');
			const dr = await g.moSua(page, x.sku);
			const khoa = await g.oSku(dr).isDisabled();
			ghiDo(`ô SKU khi sửa: disabled=${khoa}`);
			if (khoa) {
				// Đo 26/09: form "Cập nhật sản phẩm" KHOÁ ô SKU ⇒ không đổi được SKU qua giao diện, trùng SKU không thể phát sinh khi sửa.
				expect(await chiTiet(m, x.id).then((c) => c?.productName)).toBe(x.ten);
				return;
			}
			await g.oSku(dr).fill(seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
			const kq = await g.luu(page, dr, { method: 'PUT' });
			expect(String(kq.body?.status?.code)).not.toBe('200');
		} finally { await m.don(); }
	});

	test('08_030_006 — Sửa Barcode trùng với Barcode đã có trên hệ thống', async ({ page }) => {
		chanNeuTat('08_030_006');
		const m = await g.moMan(page);
		try {
			const x = await spMoi(m, 'S6');
			const bcKhac = seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan.sku; // seed đặt barcode = SKU
			const dr = await g.moSua(page, x.sku);
			const khoa = await g.oBc(dr).isDisabled();
			let kq = null;
			if (!khoa) {
				await g.oBc(dr).fill(bcKhac);
				kq = await g.luu(page, dr, { method: 'PUT' });
			}
			const bcSau = g.sql(`select coalesce(bar_code,'') from CHAIN_PRODUCT_UNIT where product_id=${x.id} and variant_id is not null and convert_to_main_unit=1 limit 1`);
			ghiDo(`ô barcode disabled=${khoa} · lưu ${kq?.body?.status?.code ?? '-'} "${kq?.body?.status?.message ?? kq?.tb ?? ''}" · barcode DB sau: ${bcSau}`);
			expect(bcSau, '🔴 Barcode trùng SP khác vẫn lưu được (không ràng buộc duy nhất)').not.toBe(bcKhac);
			if (kq) expect(`${kq.body?.status?.message} ${kq.tb}`, 'Không báo barcode đã tồn tại').toMatch(/barcode|mã vạch|tồn tại|đăng ký/i);
		} finally { await m.don(); }
	});

	test('08_030_007 — Xoá MỘT VÀI biến thể CHƯA phát sinh giao dịch', async ({ page }) => {
		chanNeuTat('08_030_007');
		const m = await g.moMan(page);
		try {
			const x = await spBienThe(page, m, 'S7', ['Do', 'Vang', 'Xanh']);
			const truoc = bienTheDb(x.id);
			const dr = await g.moSua(page, x.goc);
			await xoaDongBienThe(page, dr, 'Màu: Vang');
			const kq = await g.luu(page, dr, { method: 'PUT' });
			const sau = bienTheDb(x.id);
			ghiDo(`trước ${JSON.stringify(truoc)} · lưu ${kq.body?.status?.code} "${kq.tb}" · sau ${JSON.stringify(sau)}`);
			expect(sau.length, 'Số biến thể sau khi xoá 1').toBe(2);
			expect(sau.some((v) => v.includes('Vang'))).toBe(false);
			for (const v of sau) expect(truoc, 'Biến thể còn lại bị đổi SKU/id').toContain(v);
		} finally { await m.don(); }
	});

	test('08_030_008 — Xoá TẤT CẢ biến thể CHƯA phát sinh giao dịch', async ({ page }) => {
		chanNeuTat('08_030_008');
		const m = await g.moMan(page);
		try {
			const x = await spBienThe(page, m, 'S8', ['Do', 'Vang']);
			const dr = await g.moSua(page, x.goc);
			await g.xoaPhanLoai(page, dr);
			const hien = { sku: await g.oSku(dr).isEnabled(), giaTri: await g.oSku(dr).inputValue() };
			if (!hien.giaTri) await g.oSku(dr).fill(`${x.goc}X`).catch(() => null);
			if (await g.oBc(dr).isEnabled() && !(await g.oBc(dr).inputValue())) await g.oBc(dr).fill(`${x.goc}XB`);
			const kq = await g.luu(page, dr, { method: 'PUT' });
			const ds = g.donViDb(x.id);
			ghiDo(`sau xoá hết biến thể: ô SKU mở=${hien.sku} giá trị "${hien.giaTri}" · lưu ${kq.body?.status?.code} "${kq.body?.status?.message ?? kq.tb}" · biến thể DB ${JSON.stringify(bienTheDb(x.id))} · unit ${JSON.stringify(ds)}`);
			expect(hien.sku, 'Xoá hết biến thể mà ô SKU cơ bản không hiện lại').toBe(true);
			expect(String(kq.body?.status?.code), 'Lưu SP sau khi xoá hết biến thể lỗi').toBe('200');
			expect(g.kiemBatBien(ds)).toEqual([]);
		} finally { await m.don(); }
	});

	test('08_030_009 — Xoá biến thể ĐÃ phát sinh giao dịch', async ({ page, browser }) => {
		chanNeuTat('08_030_009');
		const m = await g.moMan(page);
		try {
			const x = await spBienThe(page, m, 'S9', ['Do', 'Vang']);
			const v = g.sql(`select u.variant_id, u.product_unit_id from CHAIN_PRODUCT_UNIT u join CHAIN_PRODUCT_VARIANTS v on v.id=u.variant_id where u.product_id=${x.id} and v.name like '%Vang' and u.convert_to_main_unit=1 limit 1`).split('\t');
			await g.nhapKho(browser, { id: x.id, ten: x.ten, variantId: Number(v[0]), productUnitId: Number(v[1]), unit: 'Cái' });
			const dr = await g.moSua(page, x.goc);
			await xoaDongBienThe(page, dr, 'Màu: Vang');
			const kq = await g.luu(page, dr, { method: 'PUT' });
			const sau = bienTheDb(x.id);
			ghiDo(`lưu ${kq.body?.status?.code} "${kq.body?.status?.message ?? kq.tb}" · biến thể sau ${JSON.stringify(sau)} (case gốc dong45 chưa có kỳ vọng — ghi hành vi)`);
			expect(sau.some((b) => b.includes('Vang')), '🔴 Xoá được biến thể đã nhập kho (mất lịch sử kho)').toBe(true);
		} finally { await m.don(); }
	});

	test('08_030_010 — Xoá MỘT VÀI đơn vị quy đổi CHƯA phát sinh giao dịch', async ({ page }) => {
		chanNeuTat('08_030_010');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const { id } = await g.taoQuaForm(page, m, async (dr) => {
				await g.dienCoBan(page, dr, { ten: g.TEN(`S10_${h}`), sku: g.MA(`S10${h}`), bc: g.MA(`S10${h}B`) });
				await g.themDvqd(page, dr, { ten: 'Hop', sl: 10, sku: g.MA(`S10${h}H`) });
				await g.themDvqd(page, dr, { ten: 'Thung', sl: 50, sku: g.MA(`S10${h}T`) });
				await g.themDvqd(page, dr, { ten: 'Loc', sl: 4, sku: g.MA(`S10${h}L`) });
			});
			const dr = await g.moSua(page, g.MA(`S10${h}`));
			await g.dongDvqd(dr).filter({ has: page.locator('input[value="Loc"]') }).getByRole('button', { name: 'close' }).click();
			await page.waitForTimeout(800);
			const kq = await g.luu(page, dr, { method: 'PUT' });
			const ds = g.donViDb(id).filter((d) => d.variant);
			ghiDo(`lưu ${kq.body?.status?.code} · còn ${JSON.stringify(ds.map((d) => `${d.unit}:${d.convert}`))} · nút xoá dòng gốc: đơn vị gốc KHÔNG nằm trong bảng quy đổi (ô "Đơn vị" riêng) ⇒ không xoá được qua bảng`);
			expect(ds.map((d) => `${d.unit}:${d.convert}`).sort()).toEqual(['Cái:1', 'Hop:10', 'Thung:50']);
		} finally { await m.don(); }
	});

	test('08_030_011 — Xoá TẤT CẢ đơn vị quy đổi CHƯA phát sinh giao dịch', async ({ page }) => {
		chanNeuTat('08_030_011');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const { id } = await g.taoQuaForm(page, m, async (dr) => {
				await g.dienCoBan(page, dr, { ten: g.TEN(`S11_${h}`), sku: g.MA(`S11${h}`), bc: g.MA(`S11${h}B`) });
				await g.themDvqd(page, dr, { ten: 'Hop', sl: 10, sku: g.MA(`S11${h}H`) });
				await g.themDvqd(page, dr, { ten: 'Thung', sl: 50, sku: g.MA(`S11${h}T`) });
			});
			const dr = await g.moSua(page, g.MA(`S11${h}`));
			while (await g.dongDvqd(dr).count()) { await g.dongDvqd(dr).first().getByRole('button', { name: 'close' }).click(); await page.waitForTimeout(600); }
			// Thử luôn xoá trắng ô "Đơn vị" gốc.
			await dr.getByPlaceholder('VD: ml, hộp, chai, thùng').fill('');
			const kqRong = await g.luu(page, dr, { method: 'PUT' });
			await dr.getByPlaceholder('VD: ml, hộp, chai, thùng').fill('Cái');
			const kq = await g.luu(page, dr, { method: 'PUT' });
			const ds = g.donViDb(id).filter((d) => d.variant);
			ghiDo(`đơn vị gốc rỗng: ${kqRong.res ? kqRong.body?.status?.code : 'FE chặn'} "${kqRong.loi || kqRong.tb}" · xoá hết quy đổi: ${kq.body?.status?.code} · còn ${JSON.stringify(ds)}`);
			expect(kqRong.res, 'Đơn vị gốc rỗng mà vẫn gửi lưu').toBeNull();
			expect(ds.filter((d) => String(d.convert) === '1').length, 'Mất đơn vị gốc').toBe(1);
			expect(ds.length, 'Còn đơn vị quy đổi sau khi xoá hết').toBe(1);
		} finally { await m.don(); }
	});

	test('08_030_012 — Xoá đơn vị quy đổi ĐÃ phát sinh giao dịch', async ({ page, browser }) => {
		chanNeuTat('08_030_012');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const { id } = await g.taoQuaForm(page, m, async (dr) => {
				await g.dienCoBan(page, dr, { ten: g.TEN(`S12_${h}`), sku: g.MA(`S12${h}`), bc: g.MA(`S12${h}B`) });
				await g.themDvqd(page, dr, { ten: 'Hop', sl: 10, sku: g.MA(`S12${h}H`) });
			});
			const u = g.donViDb(id).find((d) => d.variant && d.unit === 'Hop');
			await g.nhapKho(browser, { id, ten: g.TEN(`S12_${h}`), variantId: u.variant, productUnitId: u.id, unit: 'Hop' }, 1);
			const dr = await g.moSua(page, g.MA(`S12${h}`));
			await g.dongDvqd(dr).first().getByRole('button', { name: 'close' }).click();
			const kq = await g.luu(page, dr, { method: 'PUT' });
			const con = g.donViDb(id).some((d) => d.variant && d.unit === 'Hop');
			ghiDo(`lưu ${kq.body?.status?.code} "${kq.body?.status?.message ?? kq.tb}" · đơn vị Hop còn=${con} (case gốc dong48 chưa có kỳ vọng — ghi hành vi)`);
			expect(con, '🔴 Xoá được đơn vị quy đổi đã dùng trong phiếu kho').toBe(true);
		} finally { await m.don(); }
	});

	test('08_030_013 — Huỷ chỉnh sửa sản phẩm', async ({ page }) => {
		chanNeuTat('08_030_013');
		const m = await g.moMan(page);
		try {
			const x = await spMoi(m, 'S13');
			const dr = await g.moSua(page, x.sku);
			const daGoi = [];
			page.on('request', (r) => { if (r.method() === 'PUT' && /\/chain\/products\/\d+/.test(r.url())) daGoi.push(r.url()); });
			await dr.getByPlaceholder('Tên sản phẩm', { exact: true }).fill(`${x.ten}_KHONGLUU`);
			await dr.getByPlaceholder('Nhập mã kế toán').fill('KT_KHONGLUU');
			await dr.getByRole('button', { name: 'Hủy', exact: true }).click();
			await page.waitForTimeout(1_000);
			const xn = page.locator('.ant-modal-confirm, .ant-popconfirm').last();
			if (await xn.isVisible().catch(() => false)) await xn.getByRole('button', { name: /Đồng ý|OK|Xác nhận|Có/ }).last().click();
			const ct = await chiTiet(m, x.id);
			ghiDo(`PUT ${daGoi.length} · tên ${ct?.productName} · mã KT ${ct?.accountingCode}`);
			expect(daGoi).toEqual([]);
			expect(ct?.productName).toBe(x.ten);
			expect(ct?.accountingCode).toBe(x.sku);
		} finally { await m.don(); }
	});

	test('08_030_014 — Xoá sản phẩm ĐÃ phát sinh giao dịch', async ({ page, browser }) => {
		chanNeuTat('08_030_014');
		const m = await g.moMan(page);
		try {
			const x = await spMoi(m, 'S14');
			await g.nhapKho(browser, x);
			const kq = await g.xoaUi(page, x.sku);
			ghiDo(JSON.stringify(kq));
			expect(kq.conTrenDs, '🔴 Xoá được SP đã nhập kho').toBe(1);
			expect(`${kq.msg} ${kq.tb}`, 'Không nêu lý do đã phát sinh giao dịch').toMatch(/giao dịch|phát sinh|tồn kho|phiếu/i);
		} finally { await m.don(); }
	});

	test('08_030_017 — Xoá sản phẩm đang nằm trong CTKM', async ({ page, browser }) => {
		chanNeuTat('08_030_017');
		const m = await g.moMan(page);
		// CTKM tạo bằng CHÍNH phiên tct (🚫 km-tinh.moPhien = phiên phụ cùng tài khoản ⇒ xoay token). Khuôn body: 11/km-tinh.js.
		let idKm = null;
		try {
			const x = await spMoi(m, 'S17');
			const bd = Date.now() - 60_000;
			const r = await m.goi('POST', '/marketing/campaign/v2/create', { shopId: m.st.h.shopid }, {
				promotionName: g.TEN(`XOA_SP_CTKM_${g.hau()}`), totalBudget: null, allocateBudgetByScope: false, applyOfflinePromotion: false,
				allowCombineWithOtherPromotions: true, promotionPriority: 1, provinceCanReallocateBudget: false, conditionId: null, customerGroupId: null,
				description: 'AUTO TEST 08_030_017 (tự dừng)', startTime: bd, endTime: bd + 86_400_000, startTimeFrame: null, endTimeFrame: null,
				applyScopeLevel: 'DIEM_BAN_CU_THE', savedStatus: 1, scopes: [{ id: null, scopeType: 'DIEM_BAN', orgUnitCode: seed.doc().duLieu.diemBan.maShop }],
				budgetScopes: [], applyRealtime: false, birthdayPromotionType: 'NONE', mutualExclusionActionType: 'BLOCK', mutualExclusionCampaignIds: [],
				promotionScope: 'PRODUCT', productPromotionType: 'DISCOUNT_SALE', orderDiscountBase: null, orderDiscountUnit: null, orderDiscountValue: 0,
				applyGift: null, giftItems: null,
				productPromotions: [{ id: null, allowPoint: false, applyToClearance: false, minQuantity: 1, discountSaleSubType: 'EACH_PRODUCT', discountUnit: 'VND', discountValue: 1_000, applyByQuantity: null, productId: x.id, productUnitId: x.productUnitId, sku: x.sku }],
			});
			expect(String(r?.status?.code), `Tạo CTKM tiền đề lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
			idKm = r?.data?.campaignId ?? r?.data?.id ?? r?.data;
			const kq = await g.xoaUi(page, x.sku);
			ghiDo(JSON.stringify(kq));
			expect(kq.conTrenDs, '🔴 Xoá được SP đang nằm trong CTKM').toBe(1);
			// Đo 26/09: thông báo lộ tên bảng nội bộ "PRODUCT_PROMOTION_ITEM" (ghi báo cáo) — vẫn tính là chặn đúng.
			expect(`${kq.msg} ${kq.tb}`).toMatch(/CTKM|khuyến m|PROMOTION/i);
		} finally {
			if (idKm && typeof idKm !== 'object') await m.goi('PUT', '/marketing/campaign/v2/change-status', {}, { campaignId: idKm, action: 'STOP' }).catch(() => null);
			await m.don();
		}
	});

	test('08_030_018 — Xoá sản phẩm đang nằm trong COMBO', async ({ page }) => {
		chanNeuTat('08_030_018');
		const m = await g.moMan(page);
		try {
			const x = await spMoi(m, 'S18');
			const c = await g.taoCombo(m, [x]);
			const kq = await g.xoaUi(page, x.sku);
			const tp = g.sql(`select count(*) from CHAIN_PRODUCT_COMBO where product_combo_id=${c.id} and active=1`);
			ghiDo(`${JSON.stringify(kq)} · combo còn ${tp} thành phần`);
			expect(kq.conTrenDs, '🔴 Xoá được SP là thành phần combo').toBe(1);
			expect(`${kq.msg} ${kq.tb}`).toMatch(/combo|gộp/i);
			expect(Number(tp)).toBe(1);
		} finally { m.taoRa.reverse(); await m.don(); }
	});

	test('08_030_019 — Xoá sản phẩm đang nằm trong BẢNG GIÁ', async ({ page }) => {
		chanNeuTat('08_030_019');
		const m = await g.moMan(page);
		try {
			const x = await spMoi(m, 'S19');
			await g.bangGia(m, x);
			const kq = await g.xoaUi(page, x.sku);
			ghiDo(JSON.stringify(kq));
			expect(kq.conTrenDs, '🔴 Xoá được SP đang có trong bảng giá').toBe(1);
			expect(`${kq.msg} ${kq.tb}`).toMatch(/bảng giá/i);
		} finally { await m.don(); }
	});
	/** SP KHÔNG quản lý tồn (bán không cần nhập kho) + bảng giá xã seed ⇒ POS gdv thêm vào giỏ rồi F7 "Lưu nháp". Trả { x, idBg, don, ps }. */
	async function spTrongDonNhap(page, browser, m, ma) {
		const x = await g.taoSpApi(m, { ten: g.TEN(`${ma}_${g.hau()}`), sku: g.MA(`${ma}${g.hau()}`), requireStock: false });
		const idBg = await g.bangGia(m, x);
		await m.goi('PUT', '/chain-price-list/approve', { priceListId: idBg });
		await page.waitForTimeout(5_000); // bảng giá mới cần đồng bộ sang pod
		const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
		const ps = await p.k.moPhienPhu(browser, 'gdv', '/pos');
		await p.chanIn(ps.page);
		await p.moBan(ps.page, test);
		const r = await p.them(ps.page, x.ten);
		expect(r?.dong, `POS không thêm được SP tạm: ${r?.thongBao}`).toBeTruthy();
		const cho = ps.page.waitForResponse((q) => /spa-checkout|draft/.test(q.url()) && q.request().method() === 'POST', { timeout: 20_000 });
		await ps.page.keyboard.press('F7');
		const b = await (await cho).json().catch(() => ({}));
		expect(String(b?.status?.code), `Lưu nháp lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
		const don = b?.data?.orderId ?? b?.data?.id ?? b?.data;
		return { x, idBg, don, ps, shopId: Number(ps.st.h.shopid) };
	}

	test('08_030_015 — Xoá sản phẩm đang nằm trong ĐƠN NHÁP, chưa phát sinh phiếu kho', async ({ page, browser }) => {
		chanNeuTat('08_030_015');
		const m = await g.moMan(page);
		let t = null;
		try {
			t = await spTrongDonNhap(page, browser, m, 'S15');
			const kq = await g.xoaUi(page, t.x.sku);
			ghiDo(`đơn nháp ${t.don} · xoá SP: ${JSON.stringify(kq)}`);
			expect(kq.conTrenDs, '🔴 Xoá được SP đang nằm trong đơn nháp').toBe(1);
			expect(`${kq.msg} ${kq.tb}`, 'Thông báo không nêu đơn nháp').toMatch(/đơn nháp|đơn hàng|nháp/i);
		} finally {
			if (t?.don) await g.goiGhi(t.ps.page, t.ps.st, 'DELETE', `/orders/shops/${t.shopId}/${t.don}`, { shopId: t.shopId, orderId: t.don }).catch(() => null);
			await t?.ps.dong().catch(() => null);
			if (t?.idBg) await m.goi('DELETE', '/chain-price-list/delete', { priceListId: t.idBg }).catch(() => null);
			await m.don();
		}
	});

	test('08_030_016 — Xoá sản phẩm sau khi đã xoá đơn nháp chứa nó', async ({ page, browser }) => {
		chanNeuTat('08_030_016');
		const m = await g.moMan(page);
		let t = null;
		try {
			t = await spTrongDonNhap(page, browser, m, 'S16');
			// Xoá đơn nháp — đúng API màn chi tiết đơn gọi (OrderDetail.jsx › actionDeleteOrder).
			const xd = await g.goiGhi(t.ps.page, t.ps.st, 'DELETE', `/orders/shops/${t.shopId}/${t.don}`, { shopId: t.shopId, orderId: t.don });
			// SP có trong bảng giá thì luôn bị chặn xoá (08_030_019) ⇒ gỡ bảng giá tạm trước.
			const xb = await m.goi('DELETE', '/chain-price-list/delete', { priceListId: t.idBg });
			const kq = await g.xoaUi(page, t.x.sku);
			ghiDo(`xoá đơn nháp ${t.don}: ${JSON.stringify(xd?.status)} · xoá bảng giá: ${JSON.stringify(xb?.status)} · xoá SP: ${JSON.stringify(kq)}`);
			expect(String(xd?.status?.code), 'Xoá đơn nháp lỗi').toBe('200');
			expect(kq.conTrenDs, 'Đơn nháp đã xoá mà SP vẫn không xoá được').toBe(0);
			t.idBg = String(xb?.status?.code) === '200' ? null : t.idBg;
		} finally {
			await t?.ps.dong().catch(() => null);
			if (t?.idBg) await m.goi('DELETE', '/chain-price-list/delete', { priceListId: t.idBg }).catch(() => null);
			await m.don();
		}
	});
});
