'use strict';

/**
 * Helper 13_3 — tỉnh gửi phiếu đề xuất lên TCT (`DrawerSendToTct.jsx`).
 * Kho nhận hàng: hộp cây `shopType=HUB`, bỏ cột xã ⇒ chọn tỉnh → mục HUB ở cột cuối.
 */

const { expect } = require('@playwright/test');
const seed = require('../../00_seed/seed-state');
const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');

const HUB = () => seed.doc().duLieu.hubTinh.tenShop;
const TINH = () => seed.doc().duLieu.toChuc.tenTinh;

async function moDrawerGui(page, ma) {
	await dx.moChiTiet(page, ma, 'province');
	await page.getByRole('button', { name: /Gửi lên Tổng công ty$/ }).last().click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Gửi lên tổng công ty' }).last();
	await expect(dr).toBeVisible();
	return dr;
}

async function moHopKho(page, dr) {
	await dr.locator('.ant-form-item').filter({ hasText: 'Kho nhận hàng' }).locator('.ant-select').click();
	const hop = page.getByRole('dialog').filter({ has: page.locator('.sp-column') }).last();
	await expect(hop).toBeVisible();
	const c1 = hop.locator('.sp-column').first();
	const tinh = c1.getByText(TINH(), { exact: true }).first();
	// Mục tỉnh là nút bật/tắt; vai tỉnh vào có thể đã bật sẵn ⇒ chỉ bấm khi cột kho còn trống.
	const muc = hop.locator('.sp-column').last().locator('.sp-item').first();
	for (let lan = 0; lan < 3 && !(await muc.isVisible().catch(() => false)); lan++) {
		await tinh.click();
		await muc.waitFor({ timeout: 4_000 }).catch(() => {});
	}
	await expect(muc, 'Cột kho không có HUB nào').toBeVisible({ timeout: 10_000 });
	return hop;
}

/** Gửi phiếu `ma` lên TCT; trả { tb, gui, res, maTct }. `maTrong` ⇒ xoá mã tự sinh trước khi gửi. */
async function guiLenTct(page, ma, { maTrong = false } = {}) {
	const dr = await moDrawerGui(page, ma);
	const maTct = await dr.locator('#code').inputValue();
	if (maTrong) await dr.locator('#code').fill('');
	const hop = await moHopKho(page, dr);
	await hop.locator('.sp-column').last().locator('.sp-item').filter({ hasText: HUB() }).first().click();
	await hop.locator('button.ant-btn-primary').filter({ hasText: 'Xác nhận' }).click();
	await expect(hop).toBeHidden();
	const cho = page.waitForResponse((r) => /tct/i.test(r.url()) && r.request().method() !== 'GET', { timeout: 30_000 }).catch(() => null);
	const tb = await dx.thongBaoQuanh(page, () => dr.getByRole('button', { name: 'Xác nhận gửi' }).click());
	const r = await cho;
	return {
		tb,
		gui: r ? JSON.parse(r.request().postData() || '{}') : null,
		res: r ? await r.json().catch(() => null) : null,
		maTct: maTrong ? null : maTct,
	};
}

module.exports = { HUB, TINH, moDrawerGui, moHopKho, guiLenTct };
