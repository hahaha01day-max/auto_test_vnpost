'use strict';

/**
 * Bước 10 — SẢN PHẨM SẢN XUẤT (sản phẩm chế biến) cho phân hệ 09.
 *
 * Nguồn (vnpost-web af8cda07): `pages/product/index.jsx` — "Sản phẩm sản xuất" nằm trong menu nút
 * "…" cạnh "Thêm mới" (🚫 không phải nút "Thêm mới"); form `AddProductDrawer.jsx` với
 * `isPreparedProduct` hiện khối "Cấu hình nguyên liệu sản xuất" (`TableIngredients.jsx`).
 *
 * Tạo HAI sản phẩm:
 *  - `coCongThuc`: 1 nguyên liệu = sản phẩm giá tiêu chuẩn của bộ seed (`AUTO8_SP_TC`), định mức 2.
 *    Chọn STANDARD vì là loại DUY NHẤT điểm bán nhập kho được (đo ở 04_3) ⇒ nạp lại tồn được.
 *  - `khongCongThuc`: FE KHÔNG cho tạo (bắt buộc nguyên liệu) ⇒ ghi sổ một SP cũ không công thức.
 *
 * 🔴 Chạy lẻ bước này phải `--no-deps` (xem README) — không thì chạy lại bước 1–7.
 */

const { test, expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const { doc, ghi, lay, PREFIX, PREFIX_MA, runId } = require('../seed-state');
const { chon } = require('../helpers');

test.describe.configure({ mode: 'serial' });

/**
 * 🔴 Ô "Nguyên liệu sản xuất" chỉ liệt kê sản phẩm có `is_ingredient = 1` (`SelectShopProduct.jsx` gửi
 *    `isIngredient: true`). Sản phẩm seed bước 4 KHÔNG tick ⇒ ô tìm rỗng, không báo gì. Tick
 *    "Là nguyên liệu sản xuất" ở form Cập nhật sản phẩm (danh sách → tên SP → "Sửa thông tin").
 */
async function danhDauNguyenLieu(page, tenSanPham) {
	await moTrang(page, '/product/normal', 'tct');
	const o = page.getByPlaceholder('Tìm kiếm theo tên sản phẩm');
	await o.fill(tenSanPham);
	await o.press('Enter');
	const nut = page.locator('.ant-table-tbody tr.ant-table-row').getByRole('button', { name: tenSanPham, exact: true }).first();
	await expect(nut, `Không thấy sản phẩm ${tenSanPham}`).toBeVisible({ timeout: 30_000 });
	await nut.click();
	const ct = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết sản phẩm' }).last();
	await ct.getByRole('button', { name: 'Sửa thông tin' }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Cập nhật sản phẩm' }).last();
	const cb = dr.getByRole('checkbox', { name: 'Là nguyên liệu sản xuất' });
	await expect(cb).toBeVisible({ timeout: 30_000 });
	if (await cb.isChecked()) return 'da-co';
	await cb.check();
	const cho = page.waitForResponse((r) => /product/i.test(r.url()) && ['PUT', 'POST'].includes(r.request().method()) && /isIngredient/.test(r.request().postData() || ''), { timeout: 45_000 });
	await dr.getByRole('button', { name: /^(Xác nhận|Cập nhật|Lưu)$/ }).last().click();
	const res = await cho;
	const body = await res.json().catch(() => ({}));
	expect(String(body?.status?.code), `Cập nhật ${tenSanPham} lỗi: ${body?.status?.message}`).toBe('200');
	expect(res.request().postData(), 'Payload không mang isIngredient=true').toContain('"isIngredient":true');
	return 'da-tick';
}

/**
 * Đặt "VAT (bán hàng)" cho một sản phẩm qua form Cập nhật (danh sách → tên SP → "Sửa thông tin").
 * 🔴 Bước tạo chọn mục VAT ĐẦU TIÊN = 0% ⇒ bảng giá "trước VAT" và "sau VAT" cho ra cùng một số, case
 *    10_130_001/002 không phân biệt được. SP sản xuất là vật thử của nhóm POS 10_130 ⇒ đặt 8%.
 */
async function datVat(page, tenSanPham, nhan) {
	await moTrang(page, '/product/normal', 'tct');
	const o = page.getByPlaceholder('Tìm kiếm theo tên sản phẩm');
	await o.fill(tenSanPham);
	await o.press('Enter');
	await page.getByRole('tab', { name: 'Sản phẩm sản xuất' }).click().catch(() => {});
	const nut = page.locator('.ant-table-tbody tr.ant-table-row').getByRole('button', { name: tenSanPham, exact: true }).first();
	await expect(nut, `Không thấy sản phẩm ${tenSanPham}`).toBeVisible({ timeout: 30_000 });
	await nut.click();
	const ct = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết sản phẩm' }).last();
	await ct.getByRole('button', { name: 'Sửa thông tin' }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Cập nhật sản phẩm' }).last();
	await expect(dr.getByPlaceholder('Tên sản phẩm', { exact: true })).toHaveValue(tenSanPham, { timeout: 30_000 });
	// Ô VAT là Select KHÔNG showSearch (input readonly) ⇒ 🚫 `chon()` (nó gõ để lọc); bấm thẳng mục.
	await dr.getByRole('combobox', { name: /VAT \(bán hàng\)/ }).click();
	await page.locator('.ant-select-item-option').filter({ hasText: new RegExp(`^${nhan}$`), visible: true }).first().click();
	const cho = page.waitForResponse((r) => /product/i.test(r.url()) && ['PUT', 'POST'].includes(r.request().method()) && /vatPercent|vat/i.test(r.request().postData() || ''), { timeout: 45_000 });
	await dr.getByRole('button', { name: /^(Xác nhận|Cập nhật|Lưu)$/ }).last().click();
	const res = await cho;
	const body = await res.json().catch(() => ({}));
	void body;
	expect(res.status(), `Cập nhật VAT ${tenSanPham} lỗi: ${body?.status?.message}`).toBeLessThan(400);
	return res.request().postData();
}

async function taoSanPhamSanXuat(page, { tenSanPham, sku, nguyenLieu, dinhMuc, serial }) {
	await moTrang(page, '/product/normal', 'tct');
	await page
		.locator('.ant-space-compact')
		.filter({ has: page.getByRole('button', { name: 'Thêm mới' }) })
		.locator('button')
		.last()
		.hover();
	await page.locator('.ant-dropdown:visible').getByText('Sản phẩm sản xuất', { exact: true }).click();

	const dr = page.locator('.ant-drawer-open').last();
	const oTen = dr.getByPlaceholder('Tên sản phẩm', { exact: true });
	await expect(oTen, 'Không mở được form Sản phẩm sản xuất').toBeVisible({ timeout: 30_000 });
	await oTen.fill(tenSanPham);
	// 🔴 Gõ tên trần "AUTO8_DANHMUC" thì khớp cả node CHA "…DANHMUCCHA" (khoá) đứng trước ⇒ ô rỗng. Gõ đủ "mã - tên".
	await chon(page, dr, /Danh mục/, `${lay('sanPham', 'maDanhMuc')} - ${lay('sanPham', 'tenDanhMuc')}`);
	await dr.getByPlaceholder('Nhập SKU').first().fill(sku);
	await dr.getByPlaceholder('Nhập mã barcode').first().fill(sku);
	await dr.getByPlaceholder('Nhập mã kế toán').first().fill(sku);
	await chon(page, dr, /VAT \(bán hàng\)/);
	await chon(page, dr, /^\*? ?Loại đơn vị quản lý/);
	const oDonViQuanLy = dr.locator('#form_orgUnitCode');
	if (await oDonViQuanLy.isEnabled().catch(() => false)) await chon(page, dr, /^\*? ?Đơn vị quản lý/);
	await dr.getByRole('textbox', { name: /^\*? ?Đơn vị$/ }).first().fill('Cái');

	if (serial) {
		// Cùng cách bước 4: ô giá vốn không có accessible name — đi từ nhãn sang ant-select kế tiếp.
		const oGiaVon = dr.locator('xpath=//*[normalize-space(text())="Phương pháp tính giá vốn"]/following::div[contains(@class,"ant-select")][1]').first();
		await oGiaVon.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last().locator('.ant-select-item-option').filter({ hasText: /^Thực tế đích danh$/ }).first().click();
		const oSerial = dr.getByRole('checkbox', { name: /serial/i }).first();
		await expect(oSerial, 'Chọn "Thực tế đích danh" mà không hiện ô tick serial').toBeVisible({ timeout: 15_000 });
		await oSerial.check();
	}
	const khoi = dr.locator('.ant-card').filter({ hasText: 'Cấu hình nguyên liệu sản xuất' });
	await expect(khoi, 'Form sản phẩm sản xuất không có khối "Cấu hình nguyên liệu sản xuất"').toBeVisible();
	if (nguyenLieu) {
		const o = khoi.getByRole('combobox').first();
		await o.click();
		await o.fill(nguyenLieu);
		const muc = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last()
			.locator('.ant-select-item-option').filter({ hasText: nguyenLieu }).first();
		await expect(muc, `Ô "Nguyên liệu sản xuất" không tìm ra ${nguyenLieu}`).toBeVisible({ timeout: 20_000 });
		await muc.click();
		const dong = khoi.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: nguyenLieu }).first();
		await expect(dong, 'Chọn nguyên liệu xong mà bảng không có dòng').toBeVisible({ timeout: 15_000 });
		const sl = dong.locator('input.ant-input-number-input').first();
		await sl.fill(String(dinhMuc));
		await sl.press('Tab');
	}

	const cho = page.waitForResponse((r) => /product/i.test(r.url()) && r.request().method() === 'POST' && /isComposite/.test(r.request().postData() || ''), { timeout: 45_000 });
	await dr.getByRole('button', { name: 'Xác nhận', exact: true }).click();
	const res = await cho.catch(async (e) => {
		const loi = await dr.locator('.ant-form-item-explain-error').allInnerTexts();
		const tb = await page.locator('.ant-message-notice').allInnerTexts();
		throw new Error(`${e.message}\nÔ bị chặn: ${loi.join(' | ') || '(không)'} · Thông báo: ${tb.join(' | ')}`);
	});
	const body = await res.json().catch(() => ({}));
	expect(String(body?.status?.code), `Tạo sản phẩm sản xuất lỗi: ${body?.status?.message}`).toBe('200');
	const gui = res.request().postData() || '';
	expect(gui, 'Payload không mang isComposite=true').toContain('"isComposite":true');
	if (serial) expect(gui, 'Payload không mang stockType SPECIFIC_IDENTIFICATION').toContain('"stockType":"SPECIFIC_IDENTIFICATION"');
	return { gui, data: body.data };
}

test('seed 10 — tạo sản phẩm sản xuất có / không có công thức nguyên liệu', async ({ page }) => {
	test.setTimeout(240_000);
	const cu = doc().duLieu?.sanPhamSanXuat;
	test.skip(Boolean(cu?.coCongThuc?.vatPercent && cu?.khongCongThuc && cu?.coSerial), 'Sổ seed đã có sản phẩm sản xuất — 🚫 không tạo lại.');
	const nl = lay('sanPham', 'sanPhamTheoGiaVon').tieuChuan;

	if (!cu?.coCongThuc) {
		if (!doc().duLieu?.sanPhamSanXuat?.nguyenLieuDaTick) {
			await danhDauNguyenLieu(page, nl.tenSanPham);
			ghi('sanPhamSanXuat', { nguyenLieuDaTick: nl.tenSanPham });
		}
		const tenSanPham = `${PREFIX}SP_SX_${runId()}`;
		const sku = `${PREFIX_MA}SKUSX${runId()}`;
		const { gui } = await taoSanPhamSanXuat(page, { tenSanPham, sku, nguyenLieu: nl.tenSanPham, dinhMuc: 2 });
		// 🔴 Đo 24/09: gõ 2 nhưng CHAIN_PRODUCTS_INGREDIENTS lưu 1.0000 — sổ ghi số THẬT đã lưu (1), đừng tin số gõ.
		expect(gui, 'Payload không mang nguyên liệu').toMatch(/ngredient/i);
		ghi('sanPhamSanXuat', { coCongThuc: { tenSanPham, sku, nguyenLieu: nl.tenSanPham, skuNguyenLieu: nl.sku, dinhMuc: 1 } });
	}
	// VAT 8% cho SP sản xuất có công thức (vật thử giá POS nhóm 10_130).
	if (doc().duLieu?.sanPhamSanXuat?.coCongThuc && !doc().duLieu.sanPhamSanXuat.coCongThuc.vatPercent) {
		const gui = await datVat(page, doc().duLieu.sanPhamSanXuat.coCongThuc.tenSanPham, '8%');
		// 🔴 Ô "VAT (bán hàng)" gắn vào field `deductibleTaxPercent` (id form_deductibleTaxPercent); payload
		//    vẫn kèm `vatPercent: 0` nhưng DB lưu `CHAIN_PRODUCTS.vat_percent = 8` (đo 24/09).
		expect(gui, 'Payload không mang VAT bán hàng 8').toMatch(/"deductibleTaxPercent":8\b/);
		ghi('sanPhamSanXuat', { coCongThuc: { ...doc().duLieu.sanPhamSanXuat.coCongThuc, vatPercent: 8 } });
	}
	// Thành phẩm quản lý SERIAL (đích danh) — tiền điều kiện 09_020_003.
	if (!doc().duLieu?.sanPhamSanXuat?.coSerial) {
		const tenSanPham = `${PREFIX}SP_SXS_${runId()}`;
		const sku = `${PREFIX_MA}SKUSXS${runId()}`;
		await taoSanPhamSanXuat(page, { tenSanPham, sku, nguyenLieu: nl.tenSanPham, dinhMuc: 1, serial: true });
		ghi('sanPhamSanXuat', { coSerial: { tenSanPham, sku, nguyenLieu: nl.tenSanPham, dinhMuc: 1 } });
	}
	// 🔴 Sản phẩm sản xuất KHÔNG công thức: FE CHẶN tạo — "Vui lòng thêm nguyên liệu cho sản phẩm sản
	//    xuất" (`AddProductDrawer.jsx`, `isInvalidProductIngredients`). Tiền điều kiện của 09_010_002 chỉ
	//    có ở dữ liệu cũ: SELECT 24/09 giao danh sách ô tìm chế biến (`basic-search-product-unit
	//    isComposite=true`) với 0 dòng CHAIN_PRODUCTS_INGREDIENTS ⇒ `Combo 2309` (id 1171332). SP `21`
	//    (1169369) cũng 0 công thức nhưng KHÔNG lên ô tìm. Ghi vào sổ để case dùng; 🚫 không tạo bằng SQL.
	if (!doc().duLieu?.sanPhamSanXuat?.khongCongThuc) {
		ghi('sanPhamSanXuat', { khongCongThuc: { tenSanPham: 'Combo 2309', productId: 1171332, nguon: 'dữ liệu cũ — FE không tạo được SP sản xuất thiếu công thức' } });
	}
});
