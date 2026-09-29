'use strict';

/**
 * Helper 13_1 — tạo / tìm phiếu đề xuất (dùng chung cho spec CHT và spec duyệt).
 * Nguồn (vnpost-web af8cda07): `features/purchaseOrder/pages/{StockRequestListPage,StockRequestFormPage,StockRequestDetailPage}.jsx`.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');

const BASE = () => process.env.VNPOST_BASE_URL;
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const GHI_CHU = 'AUTO TEST 13_1';
const SP = () => seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan;

async function thongBaoQuanh(page, fn, timeout = 15_000) {
	await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
	const tb = page.locator('.ant-message-notice').first().waitFor({ timeout }).then(() => page.locator('.ant-message-notice').allInnerTexts()).catch(() => []);
	await fn();
	return chuan((await tb).join(' | '));
}

async function moDs(page, vai = 'shop') {
	const cho = page.waitForResponse((r) => /\/stock-requests\?/.test(r.url()), { timeout: 60_000 }).catch(() => null);
	await moTrang(page, `${BASE()}/inventory/purchase-request`, vai);
	await cho;
	await expect(khung(page).locator('#keyword')).toBeVisible({ timeout: 30_000 });
}

async function moTao(page) {
	await moDs(page);
	await khung(page).getByRole('button', { name: 'Tạo phiếu đề xuất' }).click();
	await expect(page.locator('#code')).toHaveValue(/^DX/, { timeout: 30_000 });
}

async function themSp(page, ten = SP().tenSanPham, sl = 3) {
	const o = page.getByPlaceholder('Tìm sản phẩm');
	await o.click();
	await o.fill(ten);
	const muc = page.getByText(ten, { exact: true }).last();
	await expect(muc, `Ô tìm không ra ${ten}`).toBeVisible({ timeout: 20_000 });
	const rows = page.locator('.ant-table-tbody tr.ant-table-row');
	const truoc = await rows.count();
	await muc.click();
	await page.locator('#note').click();
	// 🔴 Đo 24/09: cột "Sản phẩm" của dòng chỉ hiện tên biến thể ("Mặc định"), KHÔNG có tên SP ⇒ lấy dòng mới thêm.
	await expect(rows).toHaveCount(truoc + 1, { timeout: 15_000 });
	const r = rows.last();
	const so = r.locator('.ant-input-number-input').last();
	await so.fill(String(sl));
	await so.press('Tab');
	return r;
}

async function bam(page, nhan) {
	const cho = page.waitForResponse((r) => /\/stock-requests/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), { timeout: 20_000 }).catch(() => null);
	// Nút có icon ("Gửi phê duyệt") ⇒ tên truy cập kèm icon — khớp regex neo cuối.
	const tb = await thongBaoQuanh(page, () => page.getByRole('button', { name: new RegExp(`${nhan}$`) }).click());
	const res = await cho;
	return { tb, res, body: res ? await res.json().catch(() => null) : null };
}

async function timMa(page, ma) {
	const o = khung(page).locator('#keyword');
	await o.fill(ma);
	const cho = page.waitForResponse((r) => /\/stock-requests\?/.test(r.url()), { timeout: 20_000 }).catch(() => null);
	await khung(page).getByRole('button', { name: 'Tìm kiếm' }).click();
	await cho;
	await page.waitForTimeout(1_000);
	return dong(page).filter({ hasText: ma });
}


/** Mở chi tiết phiếu (bấm dòng — `onRow` của danh sách). */
async function moChiTiet(page, ma, vai) {
	await moDs(page, vai);
	const r = (await timMa(page, ma)).first();
	await expect(r, `Vai ${vai} không thấy phiếu ${ma}`).toBeVisible({ timeout: 20_000 });
	await r.locator('td').nth(1).click();
	await expect(page).toHaveURL(/purchase-request\/.+/, { timeout: 20_000 });
	await expect(page.getByText('Danh sách sản phẩm').first()).toBeVisible({ timeout: 30_000 });
}

/** CHT lập 1 phiếu gửi phê duyệt; trả mã. */
async function lapChoDuyet(page, sl = 2, ten = SP().tenSanPham) {
	await moTao(page);
	const ma = await page.locator('#code').inputValue();
	await page.locator('#note').fill(GHI_CHU);
	await themSp(page, ten, sl);
	const kq = await bam(page, 'Gửi phê duyệt');
	expect(kq.tb, 'Lập phiếu chờ duyệt không thành công').toContain('Gửi phê duyệt thành công');
	return ma;
}

module.exports = { BASE, chuan, khung, dong, GHI_CHU, SP, thongBaoQuanh, moDs, moTao, themSp, bam, timMa, moChiTiet, lapChoDuyet };
