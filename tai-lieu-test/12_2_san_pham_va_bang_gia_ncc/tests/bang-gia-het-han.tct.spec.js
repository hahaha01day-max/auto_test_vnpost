'use strict';

/**
 * 12_2_040_015 — Kiểm tra hết hạn bảng giá, GHI (26/09/2026). Vai `tct`.
 *
 * FE chỉ cho ngày hiệu lực từ hôm nay ⇒ tiền đề dựng bằng API `POST /supplier-price-lists` (khuôn seed 13) với startDate/endDate TRONG QUÁ KHỨ,
 * giá lạ 11.111đ cho SP seed `po.SP()` (NCC seed), rồi `POST …/{id}/publish`. Mở form đặt hàng NCC (13_3 `po-ghi.moTaoDayDu`) ⇒ đọc giá dòng SP.
 * Kỳ vọng: bảng giá HẾT HẠN không được áp (không ra 11.111). SP này còn bảng giá hiệu lực khác (seed 60.000) nên form hiện giá đó;
 * phần "chỉ có bảng hết hạn ⇒ Chưa có giá" đo thêm ở chính API bảng giá (BE có nhận bảng hết hạn là hiệu lực không). Bảng tạm được huỷ ban hành/xoá ở finally.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const po = require('../../13_3_dat_hang_va_nhap_hang/tests/po-ghi');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);

test('12_2_040_015 — Kiểm tra hết hạn bảng giá', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '12_2_040_015'));
	test.skip(Boolean(ly), ly ?? '');
	test.setTimeout(300_000);
	const d = seed.doc().duLieu;
	const supplierId = Number(d.sanPhamNcc.supplierId);
	const sku = Object.keys(d.sanPhamNcc.giaNhapTheoSku).find((s) => s === po.SP().sku) || po.SP().sku;
	const st = k.batHeader(page);
	await po.moDs(page, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const goi = (m, u, q, b) => k.goiGhi(page, st, m, u, q, b);
	const ten = `AUTO${process.env.VNPOST_LANE || ''}_BG_HETHAN_${Date.now().toString().slice(-6)}`;
	const r = await goi('POST', '/supplier-price-lists', {}, {
		scopes: [{ scopeType: 'TONG_CONG_TY', orgUnitCode: 'VNPOST', shopId: null }], name: ten, supplierId,
		startDate: '2026-09-01 00:00:00', endDate: '2026-09-10 23:59:59', note: 'AUTO TEST 12_2_040_015 bảng giá hết hạn', contractId: d.sanPhamNcc.contractId, fileIds: [],
		items: [{ sku, importPrice: 11_111, vatRate: 0, priceType: 'STANDARD', minQuantity: 1, maxQuantity: null, description: '' }],
	});
	const bg = ds((await goi('GET', '/supplier-price-lists', { supplierId, page: 0, size: 200 }))?.data).find((x) => x.name === ten);
	const id = bg?.id ?? bg?.priceListId;
	try {
		expect(id, `Không tạo được bảng giá hết hạn qua API: ${JSON.stringify(r?.status)}`).toBeTruthy();
		const pub = await goi('POST', `/supplier-price-lists/${id}/publish`);
		const sau = ds((await goi('GET', '/supplier-price-lists', { supplierId, page: 0, size: 200 }))?.data).find((x) => (x.id ?? x.priceListId) === id);
		await po.moTaoDayDu(page, { sl: 1 });
		const dong = po.chuan(await po.bangSp(page).locator('tbody tr.ant-table-row').filter({ hasText: po.SP().tenSanPham }).last().innerText());
		test.info().annotations.push({ type: 'đo', description: `bảng ${ten} (01/09–10/09): tạo ${JSON.stringify(r?.status)} · ban hành ${JSON.stringify(pub?.status)} · trạng thái ${sau?.status} · dòng PO "${dong}"` });
		expect(dong, '🔴 Bảng giá ĐÃ HẾT HẠN vẫn được áp vào đơn đặt hàng (giá 11.111)').not.toMatch(/11[.,]111/);
	} finally {
		if (id) { await goi('POST', `/supplier-price-lists/${id}/unpublish`).catch(() => null); await goi('DELETE', `/supplier-price-lists/${id}`).catch(() => null); }
	}
});
