'use strict';

/**
 * Helper màn BÁN HÀNG (`/order/create-order`) cho nhóm 10_130 — vai `seed_gdv` (GDV điểm bán seed).
 *
 * 🔴 Tiền đề: 00_seed bước 11 đã xếp lịch ca `AUTO8_CA_DAI` (05:00–23:45) cho GDV ⇒ `moCa` mở ca nếu
 *    chưa mở (Quầy 01, 0 tờ tiền, 2 lần xác nhận "Mở ca" → "Xác nhận mở ca"). Ca để MỞ sau khi test
 *    (chốt ca là nghiệp vụ tiền mặt riêng). Ngoài 05:00–23:45 không mở ca được ⇒ skip có lý do.
 * 🔴 Chỉ THÊM vào bill rồi "Xoá tất cả" — 🚫 không thanh toán: không sinh đơn, không trừ kho.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const BASE = () => process.env.VNPOST_BASE_URL;
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const so = (t) => Number(String(t ?? '').replace(/[^\d-]/g, '')) || 0;

async function moCa(page, test) {
	const gio = new Date().getHours() * 60 + new Date().getMinutes();
	test.skip(gio < 5 * 60 || gio > 23 * 60 + 45, 'Ngoài giờ ca AUTO8_CA_DAI (05:00–23:45) — không mở ca được qua FE.');
	await moTrang(page, `${BASE()}/lich-ca-nhan/ca-lam-viec`, 'seed_gdv');
	const nut = page.getByRole('button', { name: 'Mở ca' });
	const chot = page.getByRole('button', { name: /Chốt ca/ });
	await expect(nut.or(chot).first(), 'Màn Ca làm việc không có nút Mở ca / Chốt ca — GDV chưa có lịch ca (00_seed bước 11)').toBeVisible({ timeout: 30_000 });
	if (await nut.count()) {
		await nut.first().click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Mở ca làm việc' }).last();
		await expect(dr).toBeVisible();
		// "Quầy thu ngân" bắt buộc (đo 28/09/2026) — tự chọn khi điểm bán chỉ có một quầy, còn không thì chọn quầy đầu.
		const oQuay = dr.locator('#counterId');
		// 🔴 antd v6 không có `.ant-select-selection-item`: chưa chọn thì chữ của Select chỉ là placeholder "Chọn quầy thu ngân".
		const chuQuay = (await oQuay.count()) ? chuan(await dr.locator('.ant-select:has(#counterId)').innerText()) : 'x';
		if (!chuQuay || /^Chọn quầy thu ngân$/.test(chuQuay)) {
			await oQuay.click();
			const dd = page.locator('.ant-select-dropdown:has(#counterId_list)').last();
			await dd.waitFor({ state: 'visible', timeout: 20_000 });
			const ds = dd.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)');
			expect(await ds.count(), 'Điểm bán chưa có quầy thu ngân nào — phải tạo quầy trước thì mới mở ca được').toBeGreaterThan(0);
			await ds.first().click();
		}
		const cho = page.waitForResponse((r) => /shift-report\/open-shift/.test(r.url()), { timeout: 30_000 });
		await dr.getByRole('button', { name: 'Mở ca' }).last().click();
		await page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận mở ca' }).getByRole('button', { name: 'Xác nhận' }).click();
		const r = await cho;
		const b = await r.json().catch(() => ({}));
		// SHIFT-003 "Ca làm việc đã được mở": ca đã mở từ trước (màn vẫn hiện nút "Mở ca") — tiền đề đạt.
		if (String(b?.status?.code) !== 'SHIFT-003') expect(String(b?.status?.code), `Mở ca lỗi: ${b?.status?.message}`).toBe('200');
		await page.keyboard.press('Escape').catch(() => {});
	}
}

async function moPos(page) {
	await moTrang(page, `${BASE()}/order/create-order`, 'seed_gdv');
	const o = page.getByPlaceholder('Tìm kiếm sản phẩm / dịch vụ (F3)');
	await expect(o, 'Màn bán hàng không mở (còn chặn "Yêu cầu mở ca"?)').toBeVisible({ timeout: 30_000 });
	await xoaHet(page);
	return o;
}

const dongBill = (page) => page.locator('.ant-table-tbody tr.ant-table-row');

async function xoaHet(page) {
	if (!(await dongBill(page).count())) return;
	await page.locator('thead').getByText('Xoá tất cả', { exact: true }).first().click();
	const hop = page.locator('.ant-popover:visible, .ant-modal-confirm').last();
	if (await hop.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false)) {
		await hop.locator('.ant-btn-primary').first().click();
	}
	await expect(dongBill(page)).toHaveCount(0);
}

/** Gõ tìm; trả { goiY: text gợi ý của đúng SP, gia } — chưa thêm. */
async function timSp(page, ten) {
	const o = page.getByPlaceholder('Tìm kiếm sản phẩm / dịch vụ (F3)');
	await o.click();
	await o.fill(ten);
	const muc = page.getByText(ten, { exact: true }).last();
	await expect(muc, `Ô tìm bán hàng không ra "${ten}"`).toBeVisible({ timeout: 20_000 });
	const khoi = muc.locator('xpath=ancestor::*[contains(., "Giá:")][1]');
	const goiY = chuan(await khoi.innerText().catch(() => ''));
	const m = goiY.match(/Giá:\s*([\d.,]+)\s*đ/);
	return { muc, goiY, gia: m ? so(m[1]) : null };
}

/** Thêm SP vào bill; trả { thongBao, dong: text dòng bill | null, tong }. */
async function them(page, ten) {
	const { muc, goiY, gia } = await timSp(page, ten);
	await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 8_000 }).catch(() => {});
	const tb = page.locator('.ant-message-notice, .ant-notification-notice').first().waitFor({ timeout: 6_000 }).then(() => page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts()).catch(() => []);
	await muc.click();
	const thongBao = chuan((await tb).join(' | '));
	const d = dongBill(page).filter({ hasText: ten }).first();
	const co = await d.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false);
	return { goiY, giaGoiY: gia, thongBao, dong: co ? chuan(await d.innerText()) : null, tong: co ? await tongKet(page) : null };
}

async function tongKet(page) {
	const t = chuan(await page.locator('body').innerText());
	const lay = (nhan) => { const m = t.match(new RegExp(`${nhan.replace(/[()]/g, '\\$&')}\\s*([\\d.,]+)\\s*đ`)); return m ? so(m[1]) : null; };
	return { truocVat: lay('Tổng tiền (trước VAT)'), vat: lay('VAT'), sauVat: lay('Tổng tiền (sau VAT)'), canThanhToan: lay('Cần thanh toán') };
}

module.exports = { moCa, moPos, xoaHet, timSp, them, tongKet, dongBill, so, chuan };
