'use strict';

/**
 * Helper GHI 12_2 — sản phẩm NCC + bảng giá NCC trên NCC seed `AUTO8_NCC` (vai `tct`).
 *
 * Nguồn (vnpost-web af8cda07): `features/supplierProduct/pages/{SupplierProductPage,BatchAddDrawer,
 * ImportExcelModal,PriceHistoryDrawer,SupplierPriceListPage,PriceListFormDrawer,PriceListDetailDrawer}.jsx`,
 * `services/supplierProductApi.js`, `constants.js`.
 *
 * 🔴 Vật thử: SP rác `AUTO8_SP_TC_55976508` (sản phẩm thường, CHƯA mapping NCC — lượt seed chạy nhầm
 *    23/09 đẻ ra). SP sản xuất KHÔNG dùng được: ô chọn khai `excludeComposite` (BatchAddDrawer.jsx).
 *    🚫 Không đụng 7 SKU seed đã có bảng giá `AUTO8_BGMUA` (60.000) mà 13_* đọc.
 * 🔴 Bảng giá NCC tạm tên `AUTO8_BGN_*`, phạm vi = điểm bán RÁC; luật chọn giá "hẹp thắng rộng" ⇒ không
 *    ảnh hưởng điểm bán seed.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const { chonPhamViDiemBan } = require('../../00_seed/helpers');

const BASE = () => process.env.VNPOST_BASE_URL;
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const hau = () => Date.now().toString().slice(-6);

function duLieu() {
	const d = seed.doc().duLieu;
	return { vatThu: { ten: 'AUTO8_SP_TC_55976508', sku: 'AUTO8SKUTC55976508' }, nccId: d.sanPhamNcc.supplierId, tenNcc: d.nhaCungCap.tenNcc, sx: d.sanPhamSanXuat.coCongThuc, tc: d.sanPham.sanPhamTheoGiaVon.tieuChuan, rac: d.diemBanNhan, bangGiaSeed: d.sanPhamNcc.tenBangGiaMua };
}

const khung = (page) => page.locator('.ant-pro-page-container').first();
const dongBang = (box) => box.locator('.ant-table-tbody tr.ant-table-row');

async function thongBaoQuanh(page, fn, timeout = 15_000) {
	await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
	const tb = page.locator('.ant-message-notice').first().waitFor({ timeout }).then(() => page.locator('.ant-message-notice').allInnerTexts()).catch(() => []);
	await fn();
	return chuan((await tb).join(' | '));
}

async function moSanPham(page) {
	const { nccId } = duLieu();
	const cho = page.waitForResponse((r) => r.url().includes('/supplier-products/by-supplier'), { timeout: 60_000 }).catch(() => null);
	await moTrang(page, `${BASE()}/supplier/${nccId}/products`, 'tct');
	await cho;
	await expect(khung(page).getByRole('button', { name: /Thêm mới \/ Cập nhật SP/ })).toBeVisible({ timeout: 30_000 });
}

async function timSp(page, tu) {
	const o = khung(page).getByPlaceholder('Tìm theo SKU / tên sản phẩm');
	const cho = page.waitForResponse((r) => r.url().includes('/supplier-products/by-supplier'), { timeout: 20_000 }).catch(() => null);
	await o.fill(tu);
	await o.press('Enter');
	await cho;
	await page.waitForTimeout(1_000);
	return dongBang(khung(page)).filter({ hasText: tu });
}

/** Mở drawer "Thêm / Cập nhật sản phẩm NCC". */
async function moThem(page) {
	await khung(page).getByRole('button', { name: /Thêm mới \/ Cập nhật SP/ }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm / Cập nhật sản phẩm NCC' }).last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	return dr;
}

/** Ô "Tìm và thêm sản phẩm" (ProductUnitSearchSelector — danh sách tick): gõ tên, tick đúng SP. */
async function tickSp(page, dr, ten) {
	const o = dr.getByPlaceholder('Tìm và thêm sản phẩm');
	await o.click();
	await o.fill(ten);
	const muc = page.getByText(ten, { exact: true }).last();
	await expect(muc, `Ô tìm không ra "${ten}"`).toBeVisible({ timeout: 20_000 });
	await muc.click();
	await dr.locator('.ant-drawer-title').click();
}

/** Map vật thử vào NCC seed (drawer → tick → Xác nhận). Trả thông báo. */
async function mapVatThu(page) {
	const { vatThu } = duLieu();
	const dr = await moThem(page);
	await tickSp(page, dr, vatThu.ten);
	await expect(dongBang(dr).filter({ hasText: vatThu.ten }).first()).toBeVisible({ timeout: 15_000 });
	return thongBaoQuanh(page, () => dr.getByRole('button', { name: 'Xác nhận' }).click());
}

async function xoaMap(page, sku) {
	const d = (await timSp(page, sku)).first();
	if (!(await d.count())) return 'khong-co';
	await d.getByRole('button', { name: 'Xoá' }).click();
	const pop = page.locator('.ant-popover:visible').filter({ hasText: 'Xác nhận xoá?' }).last();
	return thongBaoQuanh(page, () => pop.locator('.ant-btn-primary').click());
}

// ── Bảng giá NCC ─────────────────────────────────────────────────────────────────────────
async function moBangGia(page) {
	const { nccId } = duLieu();
	const cho = page.waitForResponse((r) => r.url().includes('/supplier-price-lists') && r.request().method() === 'GET', { timeout: 60_000 }).catch(() => null);
	await moTrang(page, `${BASE()}/supplier/${nccId}/price-lists`, 'tct');
	await cho;
	await page.waitForTimeout(1_500);
}

async function moTaoBangGia(page) {
	await khung(page).getByRole('button', { name: /Tạo bảng giá/ }).first().click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Tạo bảng giá mới' }).last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	return dr;
}

/** Khai thẻ thông tin + 1 dòng SKU + phạm vi điểm bán RÁC. */
async function dienBangGia(page, dr, { ten, sku, gia = 12_345, vat, loai } = {}) {
	const { rac } = duLieu();
	await dr.locator('#name').fill(ten);
	const ngay = dr.locator('.ant-picker-range input').first();
	await ngay.click();
	const d = new Date();
	await ngay.fill(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
	await ngay.press('Enter');
	await dr.locator('.ant-drawer-title').click();
	if (sku) {
		await dr.getByRole('button', { name: 'Thêm dòng' }).click();
		const r = dongBang(dr).last();
		await r.getByPlaceholder('Nhập SKU').fill(sku);
		await r.getByPlaceholder('Nhập SKU').press('Tab');
		if (loai) {
			await r.locator('.ant-select').first().click();
			await page.locator('.ant-select-item-option').filter({ hasText: new RegExp(`^${loai}$`), visible: true }).first().click();
		}
		const so = r.locator('.ant-input-number-input');
		await so.first().fill(String(gia));
		if (vat != null) await so.nth(1).fill(String(vat));
		await so.first().press('Tab');
	}
	await dr.getByRole('tab', { name: /Phạm vi áp dụng/ }).click();
	await chonPhamViDiemBan(page, dr.locator('.sp-body').first(), { tenTinh: rac.tenTinh, tenXa: rac.tenXa, tenShop: rac.tenShop });
	await dr.getByRole('tab', { name: 'Thông tin bảng giá' }).click();
}

async function luuBangGia(page, dr) {
	const cho = page.waitForResponse((r) => /supplier-price-lists/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), { timeout: 30_000 }).catch(() => null);
	const tb = await thongBaoQuanh(page, () => dr.locator('.ant-drawer-footer').getByRole('button').last().click());
	const res = await cho;
	return { tb, res, body: res ? await res.json().catch(() => null) : null };
}

const dongBangGia = (page, ten) => dongBang(khung(page)).filter({ hasText: ten }).first();

module.exports = { duLieu, khung, dongBang, thongBaoQuanh, moSanPham, timSp, moThem, tickSp, mapVatThu, xoaMap, moBangGia, moTaoBangGia, dienBangGia, luuBangGia, dongBangGia, chuan, hau };
