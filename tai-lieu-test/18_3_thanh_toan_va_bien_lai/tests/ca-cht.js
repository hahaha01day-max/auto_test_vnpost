'use strict';

/**
 * Ca làm việc của vai `shop` (Cửa hàng trưởng) — mở / chốt qua màn `/lich-ca-nhan/ca-lam-viec`.
 *
 * Đo 26/09/2026 (làn 8): CHT có lịch ca AUTO8_CA_DAI (05:00–23:45). Drawer "Mở ca làm việc": ô "Quầy thu ngân" (điền sẵn
 * Quầy 01), bảng mệnh giá, "Tổng tiền mặt thực tế", Ghi chú; nút "Mở ca" ⇒ hộp "Xác nhận mở ca" ⇒ `POST shift-report/open-shift`.
 * Chốt: nút "Chốt ca"/"Kết ca" ⇒ drawer ⇒ "Tạm chốt" (+ Xác nhận) ⇒ lý do chênh lệch ⇒ "Xác nhận chốt ca" (`shift-report/finalize`)
 * — khuôn `18_1/tests/pos-18.js › chotCaCu`.
 * 🔴 CHT KHÔNG mở ca là tiền đề của 18_1_010_003 / 18_3 (màn bán hàng chặn "Yêu cầu mở ca") ⇒ spec mở ca CHT phải chốt ca ở afterAll.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');

const BASE = () => process.env.VNPOST_BASE_URL;
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const MAN = () => `${BASE()}/lich-ca-nhan/ca-lam-viec`;

/**
 * Mở ca CHT hôm nay. `quay=false` ⇒ xoá ô "Quầy thu ngân" trước khi mở. Trả { ma: status.code, thongDiep, quay (nhãn ô quầy lúc mở), daMo }.
 * Ca đã mở sẵn (không còn nút "Mở ca") ⇒ { daMo: true, coSan: true }.
 */
async function moCa(page, { quay = true } = {}) {
	const st = k.batHeader(page);
	await moTrang(page, MAN(), 'shop');
	// 🔴 Đo 26/09: Q01 luôn bị ca GDV làn giữ ("Quầy đang có ca chưa chốt" COUNTER-003) ⇒ CHT dùng quầy riêng `A<làn>CHT` (tạo nếu chưa có).
	let quayRieng = null;
	if (quay) {
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
		const shopId = seed.doc().duLieu.diemBan.shopId;
		const ma = `A${process.env.VNPOST_LANE || ''}CHT`;
		const ds = (await k.goiApi(page, st, '/cashier-counter/get-all', { shopId, page: 0, size: 200, name: ma })).data || [];
		quayRieng = ds.find((q) => q.code === ma && q.active !== false && q.status !== 0);
		if (!quayRieng) {
			const b = await k.goiGhi(page, st, 'POST', '/cashier-counter/create', {}, { shopId, name: `${ma} quầy CHT auto test`, code: ma });
			expect(String(b?.status?.code), `Tạo quầy CHT lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
			quayRieng = b.data;
		}
		await moTrang(page, MAN(), 'shop');
	}
	const nut = page.getByRole('button', { name: 'Mở ca' });
	const chot = page.getByRole('button', { name: /Chốt ca|Kết ca/ });
	await expect(nut.or(chot).first(), 'CHT không có nút Mở ca / Chốt ca (chưa có lịch ca?)').toBeVisible({ timeout: 30_000 });
	if (!(await nut.count())) return { daMo: true, coSan: true };
	await nut.first().click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Mở ca làm việc' }).last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	const oQuay = dr.locator('.ant-form-item').filter({ hasText: 'Quầy thu ngân' }).locator('.ant-select').first();
	let xoaDuoc = null;
	if (quayRieng) {
		await oQuay.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: quayRieng.code }).first().click();
	}
	if (!quay) {
		await oQuay.hover();
		const x = oQuay.locator('.ant-select-clear');
		xoaDuoc = (await x.count()) > 0;
		if (xoaDuoc) await x.click();
	}
	const nhanQuay = chuan(await oQuay.innerText().catch(() => ''));
	const cho = page.waitForResponse((r) => /shift-report\/open-shift/.test(r.url()), { timeout: 20_000 }).catch(() => null);
	await dr.getByRole('button', { name: 'Mở ca' }).last().click();
	const xn = page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận mở ca' });
	if (await xn.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) await xn.getByRole('button', { name: 'Xác nhận' }).click();
	const r = await cho;
	const b = r ? await r.json().catch(() => ({})) : null;
	const loiForm = chuan((await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).join(' | '));
	await page.keyboard.press('Escape').catch(() => null);
	return { daMo: String(b?.status?.code) === '200' || String(b?.status?.code) === 'SHIFT-003', ma: b?.status?.code ?? null, thongDiep: b?.status?.message ?? loiForm, quay: nhanQuay, xoaDuoc, req: r?.request().postDataJSON() ?? null };
}

/** Chốt ca CHT đang mở (nếu có). Trả mô tả kết quả. */
async function chotCa(page) {
	await moTrang(page, MAN(), 'shop');
	await page.waitForTimeout(3_000);
	const nut = page.getByRole('button', { name: /^(Chốt ca|Kết ca)$/ }).first();
	if (!(await nut.isVisible().catch(() => false))) return 'không có ca mở';
	await nut.click();
	const dr = page.locator('.ant-drawer-open').last();
	await expect(dr).toBeVisible({ timeout: 20_000 });
	const tamChot = dr.getByRole('button', { name: 'Tạm chốt', exact: true });
	if (await tamChot.isVisible().catch(() => false)) {
		const cho = page.waitForResponse((r) => /shift-report\/draft-close/.test(r.url()), { timeout: 60_000 });
		await tamChot.click();
		await page.locator('.ant-modal-confirm').last().getByRole('button', { name: 'Xác nhận' }).click();
		await cho;
	}
	const lyDo = dr.locator('textarea').last();
	if (await lyDo.isVisible().catch(() => false)) await lyDo.fill('Auto test: chốt ca CHT sau case 18_3_100_002 / 18_5_140_001');
	const cho2 = page.waitForResponse((r) => /shift-report\/finalize/.test(r.url()), { timeout: 60_000 });
	await dr.getByRole('button', { name: 'Xác nhận chốt ca' }).click();
	const b = await (await cho2).json().catch(() => ({}));
	expect(String(b?.status?.code), `Chốt ca CHT lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
	return 'đã chốt';
}

module.exports = { moCa, chotCa, MAN };
