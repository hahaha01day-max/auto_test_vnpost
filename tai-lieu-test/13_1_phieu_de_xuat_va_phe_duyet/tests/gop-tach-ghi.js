'use strict';

/**
 * Helper 13_1 / 13_2 — dựng phiếu "Đã duyệt" (CHT lập → xã duyệt) và thao tác màn gộp / tách của vai tỉnh.
 * Nguồn (vnpost-web af8cda07): `features/purchaseOrder/pages/{StockRequestListPage,StockRequestMergePage,
 * StockRequestSplitPage}.jsx`.
 */

const { expect } = require('@playwright/test');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dx = require('./dx-ghi');

/** Lập n phiếu (CHT) rồi xã duyệt hết; trả mảng mã. */
async function phieuDaDuyet(browser, sls, { ten } = {}) {
	const p = await k.moPhienPhu(browser, 'shop', '/inventory/purchase-request');
	const ma = [];
	try { for (const sl of sls) ma.push(await dx.lapChoDuyet(p.page, sl, ten)); } finally { await p.dong(); }
	const w = await k.moPhienPhu(browser, 'ward', '/inventory/purchase-request');
	try {
		for (const m of ma) {
			await dx.moChiTiet(w.page, m, 'ward');
			await w.page.getByRole('button', { name: /^Xác nhận$/ }).click();
			const dr = w.page.locator('.ant-drawer-open').filter({ hasText: 'Duyệt phiếu đề xuất' }).last();
			const tb = await dx.thongBaoQuanh(w.page, () => dr.locator('.ant-drawer-footer .ant-btn-primary').last().click());
			expect(tb, `Xã duyệt ${m} không thành công`).toContain('Đã duyệt phiếu');
		}
	} finally { await w.dong(); }
	return ma;
}

async function moGop(page, ma) {
	await dx.moDs(page, 'province');
	for (const m of ma) {
		const r = (await dx.timMa(page, m)).first();
		await r.locator('button:has(.anticon-plus)').click();
	}
	await dx.timMa(page, '');
	await page.getByRole('button', { name: new RegExp(`Gộp phiếu \\(${ma.length}\\)`) }).click();
	await expect(page).toHaveURL(/purchase-request\/merge/, { timeout: 20_000 });
	await expect(page.getByText('Danh sách sản phẩm sau khi gộp')).toBeVisible({ timeout: 20_000 });
}

async function moTach(page, ma) {
	await dx.moDs(page, 'province');
	const r = (await dx.timMa(page, ma)).first();
	await r.locator('button:has(.anticon-split-cells)').click();
	await expect(page).toHaveURL(/purchase-request\/split\//, { timeout: 20_000 });
	await expect(page.getByText('Tách sản phẩm')).toBeVisible({ timeout: 20_000 });
}

const bangTach = (page) => page.locator('.ant-table').filter({ has: page.getByText('Tổng đề xuất') }).last();

const bangGop = (page) => page.locator('.ant-table').filter({ has: page.getByText('Danh sách sản phẩm sau khi gộp') }).last();
/** Số lượng (ô readOnly) của dòng sản phẩm đầu tiên trong bảng sau gộp. */
const slGop = async (page) => Number(await page.locator('.ant-pro-card').filter({ hasText: 'Danh sách sản phẩm sau khi gộp' }).last().locator('.ant-table-tbody tr.ant-table-row').first().locator('.ant-input-number-input').first().inputValue());

/** Bấm Lưu ở màn gộp; trả { tb, body } — body là response POST merge. */
async function luuGop(page) {
	// 🔴 Đo 24/09: ô "Điểm bán" (bắt buộc) chỉ tự điền theo cửa hàng chọn ở header — vai tỉnh để trống ⇒ chọn kho tỉnh.
	const o = page.locator('.ant-form-item').filter({ hasText: 'Điểm bán' }).filter({ has: page.locator('#shopId, .ant-select') }).first();
	if (await o.getByText('Chọn điểm bán').isVisible().catch(() => false)) {
		await o.locator('.ant-select').click();
		const hop = page.getByRole('dialog').filter({ has: page.locator('.sp-column') }).last();
		await expect(hop).toBeVisible();
		// Cột 3 ở màn gộp có bộ lọc loại (Pos mini / Pos plus / Kho) — radio là bộ lọc, mục chọn nằm trong `.sp-column__list`.
		const c3 = hop.locator('.sp-column').nth(2);
		await c3.locator('.ant-radio-button-wrapper').filter({ hasText: /^Kho$/ }).click();
		const muc = c3.locator('.sp-column__list .sp-item').first();
		await expect(muc, 'Tỉnh không có kho nào để nhận phiếu gộp').toBeVisible({ timeout: 15_000 });
		await muc.click();
		await hop.locator('button.ant-btn-primary').filter({ hasText: 'Xác nhận' }).click();
		await expect(o.getByText('Chọn điểm bán')).toHaveCount(0);
	}
	const cho = page.waitForResponse((r) => /stock-requests\/merge/.test(r.url()) && r.request().method() !== 'GET', { timeout: 30_000 }).catch(() => null);
	const tb = await dx.thongBaoQuanh(page, () => page.getByRole('button', { name: /^Lưu$/ }).click());
	const res = await cho;
	return { tb, body: res ? await res.json().catch(() => null) : null };
}

/** Ô số lượng của dòng SP đầu ở bảng tách, theo thứ tự phiếu. */
const oTach = (page) => bangTach(page).locator('.ant-table-tbody tr.ant-table-row').first().locator('.ant-input-number-input');
async function nhapTach(page, sls) {
	const o = oTach(page);
	for (let i = 0; i < sls.length; i++) { await o.nth(i).fill(String(sls[i])); await o.nth(i).press('Tab'); }
	// cascade tự điền có thể ghi đè ô sau ⇒ nhập lại lượt 2 cho chắc giá trị cuối
	for (let i = 0; i < sls.length; i++) { await o.nth(i).fill(String(sls[i])); await o.nth(i).press('Tab'); }
	for (let i = 0; i < sls.length; i++) await expect(o.nth(i)).toHaveValue(String(sls[i]));
}
const theTach = (page) => page.locator('.ant-pro-card').filter({ hasText: 'Danh sách phiếu tách' }).last().locator('div.border.rounded-lg');

/** Bấm nút footer màn tách; trả { tb, gui } — gui là payload đã gửi. */
async function guiTach(page, nhan) {
	const cho = page.waitForResponse((r) => /split/.test(r.url()) && r.request().method() !== 'GET', { timeout: 30_000 }).catch(() => null);
	const tb = await dx.thongBaoQuanh(page, () => page.getByRole('button', { name: new RegExp(`${nhan}$`) }).click());
	const res = await cho;
	return { tb, gui: res ? JSON.parse(res.request().postData() || '{}') : {} };
}

module.exports = { phieuDaDuyet, moGop, moTach, bangTach, bangGop, slGop, luuGop, oTach, nhapTach, theTach, guiTach };
