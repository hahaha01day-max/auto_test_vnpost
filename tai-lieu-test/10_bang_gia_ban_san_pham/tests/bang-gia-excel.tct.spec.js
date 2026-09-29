'use strict';

/**
 * 10 · 090_009/010 — Thêm sản phẩm vào bảng giá từ file Excel (vai `tct`).
 *
 * Nguồn (vnpost-web af8cda07): `components/DrawerImportPriceListExcel.jsx`, `pages/PricingFormPage.jsx`
 * (`handleOpenImportExcel`). 🔴 Luồng Excel hiện tại KHÁC kịch bản: không có popup "Cảnh báo hình thức
 * phân phối", và file KHÔNG đổ vào bảng "Sản phẩm thêm mới" — nút "Tạo từ Excel" TẠO LUÔN bảng giá
 * (thông tin chung + phạm vi lấy từ form đang nhập). Giữ kỳ vọng kịch bản, đo hành vi thật.
 * Bảng giá tạo ra áp cho điểm bán RÁC, tên `AUTO8_BGT_X*`, xoá ngay trong `finally`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const ExcelJS = require('exceljs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const bg = require('./bg-ghi');
const pp = require('./price-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

async function taoFile(dong) {
	const w = new ExcelJS.Workbook();
	const s = w.addWorksheet('Import Sản Phẩm');
	s.addRow(['SKU *', 'Tên sản phẩm', 'Loại sản phẩm', 'Danh mục', 'Đơn vị', 'Giá bán *']);
	for (const d of dong) s.addRow(d);
	const f = path.join(GOC, 'test-output', `bg-excel-${Date.now()}.xlsx`);
	fs.mkdirSync(path.dirname(f), { recursive: true });
	await w.xlsx.writeFile(f);
	return f;
}

async function kyGui(page, st) {
	// `productName` KHÔNG lọc gì ở basic-search (trả cả chuỗi); lọc bằng `distributionMethod`.
	const b = await k.goiApi(page, st, '/chain/products/basic-search', { distributionMethod: 'KY_GUI', page: 0, size: 50 });
	const x = (b.data || []).find((v) => v.distributionMethod === 'KY_GUI' && v.status === 'KICH_HOAT' && v.variants?.[0]?.sku && !/\s/.test(v.variants[0].sku));
	return x ? { ten: x.productName, sku: x.variants[0].sku } : null;
}

/** Mở form, khai chung + phạm vi rác, mở drawer Excel, nạp file, bấm Tạo. Trả { popup, tb, ten }. */
async function napExcel(page, file) {
	const ten = bg.TEN(`X${bg.hau()}`);
	await bg.moTao(page);
	await bg.dienChung(page, { ten, pb: 'PB' });
	await bg.chonPhamViRac(page);
	await bg.the(page, 'Sản phẩm').click();
	await page.getByRole('button', { name: 'Nhập từ Excel' }).click();
	const popupCanhBao = await page.locator('.ant-modal-confirm, .ant-modal-wrap:visible').filter({ hasText: 'Cảnh báo hình thức phân phối' }).count();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Tạo bảng giá từ Excel' }).last();
	await expect(dr, 'Không mở drawer "Tạo bảng giá từ Excel"').toBeVisible({ timeout: 15_000 });
	await dr.locator('input[type=file]').setInputFiles(file);
	const cho = page.waitForResponse((r) => /chain-price-list/.test(r.url()) && r.request().method() !== 'GET', { timeout: 60_000 }).catch(() => null);
	const tb = await bg.thongBaoQuanh(page, () => dr.getByRole('button', { name: 'Tạo từ Excel' }).click(), 60_000);
	const res = await cho;
	return { ten, popupCanhBao, tb, http: res?.status(), body: res ? await res.json().catch(() => null) : null };
}

async function don(page, st, ten) {
	await pp.moMan(page, 'tct');
	const x = await bg.chiTietTheoTen(page, st, ten).catch(() => null);
	if (x) await k.goiGhi(page, st, 'DELETE', '/chain-price-list/delete', { priceListId: x.priceListId });
	return x;
}

test.describe('10 · thêm sản phẩm từ Excel', () => {
	test('10_090_009 — Thêm sản phẩm Mua bán từ file Excel', async ({ page }) => {
		chanNeuTat('10_090_009');
		test.setTimeout(180_000);
		const { sp } = bg.duLieu();
		const st = k.batHeader(page);
		const file = await taoFile([[sp.tieuChuan.sku, sp.tieuChuan.tenSanPham, 'Sản phẩm', '', 'Cái', 77000], [sp.fifo.sku, sp.fifo.tenSanPham, 'Sản phẩm', '', 'Cái', 88000]]);
		const kq = await napExcel(page, file);
		let x = null;
		try {
			await pp.moMan(page, 'tct');
			x = await bg.chiTietTheoTen(page, st, kq.ten);
			const items = x ? await bg.sanPhamCua(page, st, x.priceListId) : [];
			test.info().annotations.push({ type: 'đo', description: JSON.stringify({ popupCanhBao: kq.popupCanhBao, tb: kq.tb, http: kq.http, taoLuonBangGia: Boolean(x), items: items.map((i) => [i.sku, i.price ?? i.unitPrice]) }) });
			expect(x, `Nạp Excel không tạo được bảng giá: ${kq.tb}`).toBeTruthy();
			expect(items.map((i) => i.sku).sort(), 'SKU hợp lệ trong file không vào bảng giá').toEqual([sp.fifo.sku, sp.tieuChuan.sku].sort());
			expect(kq.popupCanhBao, '🔴 Không có popup "Cảnh báo hình thức phân phối" như kịch bản (luồng Excel đã đổi: tạo thẳng bảng giá)').toBeGreaterThan(0);
		} finally {
			await don(page, st, kq.ten);
		}
	});

	test('10_090_010 — File Excel chứa SKU KÝ GỬI trong bảng giá Mua bán', async ({ page }) => {
		chanNeuTat('10_090_010');
		test.setTimeout(180_000);
		const { sp } = bg.duLieu();
		const st = k.batHeader(page);
		await pp.moMan(page, 'tct');
		const kg = await kyGui(page, st);
		test.skip(!kg, 'Chuỗi không có sản phẩm KÝ GỬI đang kích hoạt để đưa vào file.');
		const file = await taoFile([[sp.tieuChuan.sku, sp.tieuChuan.tenSanPham, 'Sản phẩm', '', 'Cái', 77000], [kg.sku, kg.ten, 'Sản phẩm', '', 'Cái', 99000]]);
		const kq = await napExcel(page, file);
		try {
			await pp.moMan(page, 'tct');
			const x = await bg.chiTietTheoTen(page, st, kq.ten);
			const items = x ? await bg.sanPhamCua(page, st, x.priceListId) : [];
			test.info().annotations.push({ type: 'đo', description: JSON.stringify({ kyGui: kg, tb: kq.tb, http: kq.http, loi: kq.body?.data?.errors ?? kq.body?.status?.message, taoBangGia: Boolean(x), items: items.map((i) => i.sku) }) });
			expect(kq.tb, 'Không báo lỗi cho dòng SKU ký gửi').toMatch(/^Sản phẩ/);
			expect(items.map((i) => i.sku), 'SKU ký gửi vẫn vào bảng giá mua bán').not.toContain(kg.sku);
			expect(items.map((i) => i.sku), 'Dòng mua bán hợp lệ bị loại theo (từ chối cả file)').toContain(sp.tieuChuan.sku);
		} finally {
			await don(page, st, kq.ten);
		}
	});
});
