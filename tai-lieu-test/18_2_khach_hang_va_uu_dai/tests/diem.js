'use strict';

/** Helper 18_2 — khách có điểm, thanh toán bằng điểm, OTP (tách từ diem-ghi.gdv.spec.js 25/09; 18_5 nhóm 120 dùng lại). */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const { otpIdCuoi, choOtp } = require('../../shared/db/otp');

const GOC = path.join(__dirname, '..');
const { chuan, sp } = p;
const SO = path.join(GOC, 'test-output', `khach-diem.lane${process.env.VNPOST_LANE || 'x'}.json`);
const doc = () => { try { return JSON.parse(fs.readFileSync(SO, 'utf8')); } catch { return null; } };
const so = (s) => Number(String(s ?? '').replace(/[^\d-]/g, '')) || 0;
const boMa = (s) => chuan(s).replace(/\s*\([A-Za-z0-9]{6}\)/g, '');

async function datSl(page, sl) {
	const o = p.dongBill(page).first().locator('input').first();
	await o.fill(String(sl));
	await o.press('Enter');
	await page.waitForTimeout(800);
}

/** Điểm hiện tại của khách đang gắn (khối khách, "Điểm hiện tại n"). */
async function diemKhoi(page) {
	await page.mouse.move(600, 700);
	const t = chuan(await page.locator('body').innerText());
	const m = t.match(/Điểm hiện tại\s*(-?[\d.,]+)/);
	return m ? so(m[1]) : 0;
}

/** Hộp "Xác thực OTP thanh toán điểm": 1 ô hoặc 6 ô một chữ số. */
async function nhapOtp(hop, otp) {
	const o = hop.locator('input');
	if ((await o.count()) > 1) { for (let i = 0; i < otp.length; i += 1) await o.nth(i).fill(otp[i]); } else await o.first().fill(otp);
	await hop.getByRole('button', { name: 'Xác nhận', exact: true }).click();
}

async function moTT(page) {
	await page.mouse.move(600, 700);
	await page.evaluate(() => document.activeElement?.blur?.());
	await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
	const m = page.getByRole('dialog').filter({ hasText: 'Phương thức thanh toán' }).last();
	await expect(m).toBeVisible({ timeout: 20_000 });
	return m;
}
const tien = (t, nhan) => { const i = t.indexOf(nhan); const mm = i < 0 ? null : t.slice(i + nhan.length, i + nhan.length + 30).match(/^\s*:?\s*(-?[\d.]+)\s*đ/); return mm ? so(mm[1]) : null; };

async function khoiDiem(page, m) {
	await m.getByRole('button', { name: 'Thanh toán bằng điểm', exact: true }).click();
	await page.waitForTimeout(1_200);
	const t = chuan(await m.innerText());
	const oDiem = m.getByText('Số điểm sử dụng').locator('xpath=following::input[1]');
	return {
		t, oDiem,
		khaDung: so((t.match(/Điểm khả dụng:\s*([\d.,]+)/) || [])[1]),
		tyLe: so((t.match(/1 điểm =\s*([\d.,]+)\s*đ/) || [])[1]),
		canTT: tien(t, 'Tổng tiền cần thanh toán'),
		tongCan: tien(t, 'Tổng cần thanh toán:') ?? tien(t, 'Tổng cần thanh toán'),
		tongDon: tien(t, 'Tổng tiền đơn hàng'),
	};
}

/**
 * Khách riêng của làn có ≥ `can` điểm (tạo + bán đơn tiền mặt lớn nếu thiếu). 🔴 Bẫy (phiên làn 7 chỉ ra 25/09):
 * CTKM "giảm 5k đơn" tự áp ở điểm bán seed có allowPoint=false ⇒ đơn luôn 0 điểm dù phạm vi khớp ⇒ BỎ CTKM
 * (`20/tests/pos-km.js › boKm`) trước khi bán đơn tích điểm. Điểm ghi bất đồng bộ (poll ≤ 120s).
 */
const { boKm } = require('../../20_khach_hang_than_thiet/tests/pos-km');
async function ganKhach(page, sdt) {
	await p.oKhach(page).click();
	await page.keyboard.type(sdt);
	const muc = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first();
	await expect(muc, `Không tìm được khách ${sdt}`).toBeVisible({ timeout: 20_000 });
	await muc.click();
	await page.waitForTimeout(2_500);
	await page.keyboard.press('Escape');
}
async function khachCoDiem(page, can = 1000) {
	let k = doc();
	let st = await p.moBan(page, test);
	if (!k?.sdt) {
		const kh = await p.taoKhach(page, st);
		k = { ten: kh.customerName, sdt: kh.customerPhone, id: kh.customerId };
		fs.mkdirSync(path.dirname(SO), { recursive: true });
		fs.writeFileSync(SO, JSON.stringify(k, null, 1));
	}
	await ganKhach(page, k.sdt);
	let d = await diemKhoi(page);
	if (d < can) {
		await p.them(page, sp().tc);
		await datSl(page, Math.ceil((can - d) / 100) + 1);
		const km = await boKm(page);
		const r = await p.thanhToanTienMat(page);
		expect(r.orderId, `Bán đơn tích điểm lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		test.info().annotations.push({ type: 'đơn tích điểm', description: `${r.orderId} · ${km}` });
		await p.donTab(page).catch(() => null);
		await expect.poll(async () => {
			st = await p.moBan(page, test);
			await ganKhach(page, k.sdt);
			return (d = await diemKhoi(page));
		}, { timeout: 120_000, intervals: [8_000] }).toBeGreaterThanOrEqual(can);
	}
	test.info().annotations.push({ type: 'khách điểm', description: `${k.sdt} · ${d} điểm` });
	return { ...k, diem: d, st };
}

/**
 * Thanh toán đơn đang mở bằng ĐA PHƯƠNG THỨC: `diem` điểm + phần còn lại tiền mặt (đo 25/09: bước 1 SDK confirm-cash,
 * bước 2 OTP điểm, rồi draft-checkout). Trả { body, tong, tienDiem, conLai }.
 */
async function thanhToanDiemTienMat(page, k, DIEM) {
	const m = await moTT(page);
	const tong = tien(chuan(await m.innerText()), 'Tổng tiền cần thanh toán');
	await m.getByRole('button', { name: 'Đa phương thức', exact: true }).click();
	await page.waitForTimeout(1_200);
	// Đo 25/09: khối "Thanh toán đa phương thức" — Tiền mặt · Thẻ/POS ngân hàng · Số điểm sử dụng (Điểm khả dụng: n) ·
	// Thanh toán bằng điểm (đ) · VietQR (mặc định = toàn bộ). Ô tìm theo nhãn đứng trước.
	const o = (nhan) => m.getByText(nhan, { exact: false }).first().locator('xpath=following::input[1]');
	await o('Số điểm sử dụng').fill(String(DIEM));
	await o('Số điểm sử dụng').press('Tab');
	await page.waitForTimeout(800);
	// Tóm tắt cuối khối: "Thanh toán bằng điểm: 20.000 đ (200 điểm)" — 🚫 đọc ô theo nhãn (trùng nút phương thức).
	const tom = async () => chuan(await m.innerText());
	const tienDiem = so(((await tom()).match(/Thanh toán bằng điểm:\s*([\d.]+)\s*đ/) || [])[1]);
	const conLai = tong - tienDiem;
	await o('Tiền mặt').fill(String(conLai));
	await o('Tiền mặt').press('Tab');
	await page.waitForTimeout(800);
	const tt = await tom();
	test.info().annotations.push({ type: 'đa phương thức', description: `tổng ${tong} · điểm ${DIEM} = ${tienDiem}đ · tiền mặt ${conLai} · "${tt.slice(tt.indexOf('Thanh toán đa phương thức'), tt.indexOf('Thanh toán đa phương thức') + 400)}"` });
	expect(tienDiem, 'Tiền quy đổi điểm sai').toBe(DIEM * 100);
	// Đo 25/09: "Thanh toán" ⇒ "Thanh toán đa phương thức - bước 1/2 · Thứ tự: 1. Tiền mặt → 2. Thanh toán bằng điểm":
	// bước 1 qua iframe SDK confirm-cash, bước 2 hộp OTP (đọc AUTHEN.OTP_V2), rồi mới draft-checkout.
	const moc = otpIdCuoi(k.sdt);
	const choDraft = page.waitForResponse((r) => /draft-checkout/.test(r.url()) && r.request().method() === 'POST', { timeout: 120_000 }).catch(() => null);
	await m.getByRole('button', { name: /^Thanh toán$|Xác nhận thanh toán/ }).last().click();
	const fr = page.frameLocator('iframe[src*="confirm-cash"]');
	const hop = page.getByRole('dialog').filter({ hasText: 'Xác thực OTP' }).last();
	const buoc = [];
	for (let i = 0; i < 30; i += 1) {
		if (await fr.getByText(/xác nhận giao dịch/i).isVisible({ timeout: 1_000 }).catch(() => false)) {
			await fr.getByText('Xác nhận thanh toán', { exact: true }).click();
			buoc.push('SDK tiền mặt');
			await page.waitForTimeout(3_000);
		}
		if (await hop.isVisible().catch(() => false)) {
			const otp = await choOtp(k.sdt, moc);
			expect(otp, 'Không thấy OTP').toBeTruthy();
			await nhapOtp(hop, otp);
			buoc.push(`OTP điểm ${otp}`);
			break;
		}
		const tiep = m.getByRole('button', { name: /Tiếp tục|Thanh toán bước|Bước tiếp/ });
		if (await tiep.isVisible().catch(() => false)) { await tiep.click(); buoc.push('tiếp'); }
		await page.waitForTimeout(1_500);
	}
	test.info().annotations.push({ type: 'các bước', description: buoc.join(' → ') + ' · ' + chuan(await page.getByRole('dialog').last().innerText().catch(() => '')).slice(0, 300) });
	const res = await choDraft;
	const body = res ? await res.json().catch(() => null) : null;
	const req = res?.request().postDataJSON();
	if (!res) test.info().annotations.push({ type: 'không có draft-checkout', description: `"${boMa((await page.locator('.ant-message-notice, .ant-form-item-explain-error').allInnerTexts()).join(' | '))}" · hộp: ${chuan(await page.getByRole('dialog').last().innerText().catch(() => '')).slice(0, 400)}` });
	test.info().annotations.push({ type: 'checkout', description: `${JSON.stringify(body?.status)} · thanh toán: ${JSON.stringify(req?.offlineDraftOrderRequest?.orders?.[0]?.payments ?? req?.payments ?? req?.offlineDraftOrderRequest?.payments ?? '').slice(0, 500)}` });
	expect(String(body?.status?.code), `Thanh toán đa phương thức lỗi: ${body?.status?.message}`).toBe('200');
	return { body, tong, tienDiem, conLai };
}

module.exports = { thanhToanDiemTienMat, GOC, SO, doc, so, boMa, datSl, diemKhoi, nhapOtp, moTT, tien, khoiDiem, boKm, ganKhach, khachCoDiem, otpIdCuoi, choOtp, p, chuan, sp };
