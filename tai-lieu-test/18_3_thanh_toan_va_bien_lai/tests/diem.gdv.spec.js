'use strict';

/**
 * 18_3 nhóm 050 + 060_006 — phương thức "Thanh toán bằng điểm" trong modal thanh toán (vai `gdv`, điểm bán seed làn).
 * Tiền đề + helper: `18_2/tests/diem.js` (khách riêng làn có điểm, phạm vi loyalty gồm tỉnh làn, OTP đọc AUTHEN.OTP_V2).
 * Nguyên văn cảnh báo lấy từ kịch bản (trace FE `OrderCheckoutComponent_v2` / modal thanh toán).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const D = require('../../18_2_khach_hang_va_uu_dai/tests/diem');

const GOC = path.join(__dirname, '..');
const { p, sp, chuan, so, boMa, moTT, khoiDiem, tien, nhapOtp, otpIdCuoi, choOtp } = D;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const thongBao = async (page) => {
	const n = page.locator('.ant-message-notice');
	await n.first().waitFor({ state: 'visible', timeout: 6_000 }).catch(() => null);
	return boMa((await n.allInnerTexts()).join(' | '));
};
/** Mở modal ▸ Thanh toán bằng điểm cho khách có điểm; trả { k, m, x }. */
async function moDiem(page, can = 200) {
	const k = await D.khachCoDiem(page, can);
	await p.them(page, sp().tc);
	await D.boKm(page);
	const m = await moTT(page);
	const x = await khoiDiem(page, m);
	return { k, m, x };
}
async function datDiem(page, x, v) {
	await x.oDiem.fill(String(v));
	await x.oDiem.press('Tab');
	await page.waitForTimeout(700);
}
const xacNhan = (m) => m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();

test.describe('18_3 — Thanh toán bằng điểm', () => {
	test.describe.configure({ timeout: 300_000 });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });
	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_3_050_003 — Chặn thanh toán bằng điểm khi đơn chưa gắn khách hàng', async ({ page }) => {
		chanNeuTat('18_3_050_003');
		await p.moBan(page, test);
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const nut = m.getByRole('button', { name: 'Thanh toán bằng điểm', exact: true });
		const coNut = await nut.count();
		test.info().annotations.push({ type: 'hành vi thật', description: `đơn khách lẻ: nút "Thanh toán bằng điểm" ${coNut ? 'CÓ' : 'KHÔNG hiện'}` });
		expect(coNut, 'Đơn khách lẻ ẨN hẳn phương thức "Thanh toán bằng điểm" — không tới được cảnh báo nguyên văn của kịch bản').toBeGreaterThan(0);
		await nut.click();
		await page.waitForTimeout(800);
		const tb1 = await thongBao(page);
		if (!tb1) await xacNhan(m);
		const tb = tb1 || (await thongBao(page));
		test.info().annotations.push({ type: 'thông báo', description: tb });
		expect(tb).toContain('Vui lòng chọn khách hàng để thanh toán bằng điểm');
	});

	test('18_3_050_006 — Bỏ trống số điểm sử dụng', async ({ page }) => {
		chanNeuTat('18_3_050_006');
		const { m, x } = await moDiem(page);
		await x.oDiem.fill('');
		await x.oDiem.press('Tab');
		await xacNhan(m);
		const tb = await thongBao(page);
		test.info().annotations.push({ type: 'thông báo', description: `ô "${await x.oDiem.inputValue()}" · "${tb}"` });
		expect(tb).toContain('Vui lòng nhập số điểm thanh toán');
	});

	test('18_3_050_007 — Nhập số điểm vượt điểm khả dụng', async ({ page }) => {
		chanNeuTat('18_3_050_007');
		const { m, x } = await moDiem(page);
		await datDiem(page, x, x.khaDung + 1);
		const v = so(await x.oDiem.inputValue());
		await xacNhan(m);
		const tb = await thongBao(page);
		test.info().annotations.push({ type: 'hành vi thật', description: `khả dụng ${x.khaDung} · gõ ${x.khaDung + 1} ⇒ ô ${v} · "${tb}"` });
		// Ô kẹp về mức tối đa (đo 18_2_050_008) ⇒ không bao giờ tới được cảnh báo nguyên văn của kịch bản.
		expect(tb, 'Kịch bản: cảnh báo "Số điểm thanh toán vượt quá điểm khả dụng"').toContain('Số điểm thanh toán vượt quá điểm khả dụng');
	});

	test('18_3_050_009 — Nhập số điểm bằng 0', async ({ page }) => {
		chanNeuTat('18_3_050_009');
		const { m, x } = await moDiem(page);
		await datDiem(page, x, 0);
		const cho = page.waitForResponse((r) => /otp\/v2\/send|draft-checkout/.test(r.url()), { timeout: 6_000 }).catch(() => null);
		await xacNhan(m);
		const r = await cho;
		const tb = await thongBao(page);
		test.info().annotations.push({ type: 'hành vi thật', description: `"${tb}" · request ${r ? r.url().split('__api')[1] : 'không'}` });
		expect(r, 'Số điểm 0 vẫn gửi OTP / thanh toán').toBeNull();
		expect(tb, 'Không có thông báo chặn').not.toBe('');
	});

	test('18_3_050_010 — Số điểm quy đổi lớn hơn số phải thu', async ({ page }) => {
		chanNeuTat('18_3_050_010');
		const { x } = await moDiem(page, 1100);
		const tran = Math.ceil((x.tongDon || 0) / (x.tyLe || 100));
		await datDiem(page, x, tran + 50);
		const v = so(await x.oDiem.inputValue());
		const tb = await thongBao(page);
		test.info().annotations.push({ type: 'hành vi thật', description: `phải thu ${x.tongDon} ⇒ tối đa ${tran} điểm · gõ ${tran + 50} ⇒ ô ${v} · "${tb}"` });
		expect(v, 'Nhận số điểm quy đổi vượt số phải thu').toBeLessThanOrEqual(tran);
	});

	test('18_3_050_011 — Số tiền quy đổi = số điểm × tỉ lệ, ô khoá', async ({ page }) => {
		chanNeuTat('18_3_050_011');
		const { m, x } = await moDiem(page);
		await datDiem(page, x, 37);
		const oTien = m.getByText('Số tiền quy đổi').locator('xpath=following::input[1]');
		const giaTri = so(await oTien.inputValue());
		const khoa = (await oTien.isDisabled()) || (await oTien.getAttribute('readonly')) !== null;
		test.info().annotations.push({ type: 'đo', description: `37 điểm × ${x.tyLe} ⇒ ô ${giaTri} · khoá ${khoa}` });
		expect(giaTri).toBe(37 * x.tyLe);
		expect(khoa, 'Ô "Số tiền quy đổi" sửa được').toBe(true);
	});

	test('18_3_050_008 — Nhập đúng bằng điểm khả dụng', async ({ page }) => {
		chanNeuTat('18_3_050_008');
		// Cần N điểm mà N × tỉ lệ ≤ số phải thu ⇒ khách có ≤ 1000 điểm cho đơn 100.000đ: dùng khách hiện tại, đặt đúng khả dụng nếu vừa.
		const k = await D.khachCoDiem(page, 200);
		await p.them(page, sp().tc);
		await D.datSl(page, Math.max(1, Math.ceil((k.diem * 100) / 100000)));
		await D.boKm(page);
		const m = await moTT(page);
		const x = await khoiDiem(page, m);
		const tran = Math.floor((x.tongDon || 0) / (x.tyLe || 100));
		test.skip(x.khaDung > tran, `Khách có ${x.khaDung} điểm > trần ${tran} của đơn — không dựng được "đúng bằng khả dụng" với đơn 1 SP`);
		await datDiem(page, x, x.khaDung);
		await xacNhan(m);
		const tb = await thongBao(page);
		test.info().annotations.push({ type: 'đo', description: `khả dụng ${x.khaDung} · "${tb}"` });
		expect(tb).not.toContain('vượt quá');
		await expect(page.getByRole('dialog').filter({ hasText: 'Xác thực OTP' }).last(), 'Không sang bước OTP').toBeVisible({ timeout: 15_000 });
	});

	test('18_3_050_002 — Chặn thanh toán bằng điểm khi nhập sai OTP', async ({ page }) => {
		chanNeuTat('18_3_050_002');
		const { k, m, x } = await moDiem(page);
		await datDiem(page, x, 50);
		const d0 = require('../../shared/db/otp').diemKhachDb(k.id);
		const ghi = [];
		page.on('response', (r) => { if (/draft-checkout|otp\/v2\/verify/.test(r.url())) ghi.push(r); });
		await xacNhan(m);
		const hop = page.getByRole('dialog').filter({ hasText: 'Xác thực OTP' }).last();
		await expect(hop).toBeVisible({ timeout: 20_000 });
		await nhapOtp(hop, '000000');
		await page.waitForTimeout(3_000);
		const tb = await thongBao(page);
		const v = ghi.find((r) => /verify/.test(r.url()));
		test.info().annotations.push({ type: 'hành vi thật', description: `"${tb}" · verify ${v ? `${v.status()} ${(await v.text().catch(() => '')).slice(0, 200)}` : 'không gọi'} · checkout ${ghi.some((r) => /draft-checkout/.test(r.url()))}` });
		expect(ghi.some((r) => /draft-checkout/.test(r.url())), 'OTP sai vẫn thanh toán').toBe(false);
		await expect(hop, 'Hộp OTP bị đóng sau khi nhập sai').toBeVisible();
		expect(require('../../shared/db/otp').diemKhachDb(k.id), 'Điểm bị trừ dù OTP sai').toBe(d0);
	});

	test('18_3_060_006 — Ô Số điểm sử dụng chỉ hiện với đơn có khách', async ({ page }) => {
		chanNeuTat('18_3_060_006');
		await p.moBan(page, test);
		await p.them(page, sp().tc);
		let m = await moTT(page);
		await m.getByRole('button', { name: 'Đa phương thức', exact: true }).click();
		await page.waitForTimeout(1_000);
		const le = await m.getByText('Số điểm sử dụng').count();
		await page.keyboard.press('Escape');
		await p.donTab(page).catch(() => null);
		await D.khachCoDiem(page, 1);
		await p.them(page, sp().tc);
		m = await moTT(page);
		await m.getByRole('button', { name: 'Đa phương thức', exact: true }).click();
		await page.waitForTimeout(1_000);
		const co = await m.getByText('Số điểm sử dụng').count();
		test.info().annotations.push({ type: 'đo', description: `khách lẻ ${le} · có khách ${co}` });
		expect(le, 'Đơn khách lẻ vẫn hiện ô "Số điểm sử dụng"').toBe(0);
		expect(co).toBeGreaterThan(0);
	});
});
