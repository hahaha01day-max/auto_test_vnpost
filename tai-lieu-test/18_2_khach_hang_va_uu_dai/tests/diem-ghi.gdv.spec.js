'use strict';

/**
 * 18_2 nhóm 050 — THANH TOÁN BẰNG ĐIỂM (vai `gdv`, điểm bán seed làn).
 *
 * Tiền đề: `tien-de-loyalty.gdv.spec.js` đã thêm tỉnh của làn vào phạm vi tích (#14) + đổi điểm (#5).
 * Đo 25/09/2026: modal thanh toán có "Thanh toán bằng điểm" ⇒ khối "Thanh toán bằng điểm tích luỹ": ô "Số điểm sử dụng"
 * (mặc định = điểm khả dụng), ô "Số tiền quy đổi" (khoá), "Điểm khả dụng: n", "Quy đổi: 1 điểm = 100 đ", "Tổng cần thanh toán".
 * Khách có điểm: tạo MỘT khách riêng cho làn rồi bán đơn tiền mặt lớn cho khách đó để tích điểm (#14: 1 điểm / 1.000đ,
 * đơn ≥ 30.000đ). Sổ: `test-output/khach-diem.lane<N>.json`.
 * 🔴 Ghi thật: đơn bán + tích/trừ điểm của khách test.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const { GOC, doc, so, boMa, datSl, diemKhoi, nhapOtp, moTT, tien, khoiDiem, boKm, ganKhach, khachCoDiem, otpIdCuoi, choOtp, thanhToanDiemTienMat, chuan, sp } = require('./diem');

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('18_2 — Thanh toán bằng điểm', () => {
	test.describe.configure({ timeout: 300_000 });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });
	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_2_050_003 — Đổi điểm làm giảm đúng Cần thanh toán', async ({ page }) => {
		chanNeuTat('18_2_050_003');
		await khachCoDiem(page);
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const truoc = tien(chuan(await m.innerText()), 'Tổng tiền cần thanh toán');
		let x = await khoiDiem(page, m);
		// Dùng MỘT PHẦN điểm (81 — số lẻ, không tròn nghìn) để lộ lệch làm tròn giữa hai dòng tổng (đo 25/09: 77.000 vs 76.900).
		await x.oDiem.fill('81');
		await x.oDiem.press('Tab');
		await page.waitForTimeout(800);
		const t2 = chuan(await m.innerText());
		x = { ...x, canTT: tien(t2, 'Tổng tiền cần thanh toán'), tongCan: tien(t2, 'Tổng cần thanh toán:') ?? tien(t2, 'Tổng cần thanh toán') };
		const dung = so(await x.oDiem.inputValue());
		test.info().annotations.push({ type: 'đo', description: `trước ${truoc} · dùng ${dung} điểm × ${x.tyLe} · "Tổng tiền cần thanh toán" ${x.canTT} · "Tổng cần thanh toán" ${x.tongCan}` });
		expect(x.tyLe, 'Không đọc được tỷ lệ quy đổi').toBeGreaterThan(0);
		expect(x.tongCan, '"Tổng cần thanh toán" ≠ trước − điểm × tỷ lệ').toBe(truoc - dung * x.tyLe);
		expect(x.canTT, '🔴 Hai dòng tổng trong cùng modal lệch nhau').toBe(x.tongCan);
	});

	test('18_2_050_001 — Thanh toán đơn hàng bằng điểm thưởng', async ({ page }) => {
		chanNeuTat('18_2_050_001');
		// Đơn rẻ nhất = 1 × AUTO SP TC (100.000đ, sau CTKM ~85.000đ) ⇒ trả trọn bằng điểm cần ≥ 850 điểm (1 điểm = 100đ).
		const k = await khachCoDiem(page, 1000);
		await p.them(page, sp().tc);
		// 🔴 Đo 25/09: có CTKM "giảm 5k đơn" + trả bằng điểm ⇒ draft-checkout 400 "Chiến dịch: 'giảm 5k đơn' không hợp lệ"
		//    (ghi báo cáo). Case này kiểm luồng ĐIỂM ⇒ bỏ CTKM khỏi giỏ.
		test.info().annotations.push({ type: 'CTKM', description: await boKm(page) });
		const m = await moTT(page);
		const x = await khoiDiem(page, m);
		const dung = so(await x.oDiem.inputValue());
		const ghi = [];
		page.on('response', (r) => { if (r.request().method() !== 'GET' && r.url().includes('__api')) ghi.push(r); });
		// Đo 25/09: "Xác nhận thanh toán" ⇒ POST /auth/otp/v2/send ⇒ hộp "Xác thực OTP thanh toán điểm" (OTP gửi SĐT khách).
		// SĐT khách test là số giả ⇒ đọc OTP ở AUTHEN.OTP_V2 (chỉ SELECT, `shared/db/otp.js`).
		const moc = otpIdCuoi(k.sdt);
		await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Xác thực OTP' }).last();
		await expect(hop, 'Không hiện hộp xác thực OTP').toBeVisible({ timeout: 20_000 });
		const otp = await choOtp(k.sdt, moc);
		expect(otp, 'Không thấy OTP mới trong AUTHEN.OTP_V2').toBeTruthy();
		await nhapOtp(hop, otp);
		await page.waitForTimeout(8_000);
		test.info().annotations.push({ type: 'request sau OTP', description: ghi.map((r) => `${r.status()} ${r.request().method()} ${r.url().split('__api')[1]?.split('?')[0]}`).join(' · ') });
		const res = ghi.filter((r) => /checkout/.test(r.url())).pop() || null;
		const body = res ? await res.json().catch(() => null) : null;
		await page.waitForTimeout(3_000);
		const n = boMa((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
		test.info().annotations.push({ type: 'đo', description: `dùng ${dung} · tổng cần ${x.tongCan} · "${n}" · ${res?.url().split('__api')[1]} ${JSON.stringify(body?.status)} · req ${JSON.stringify(res?.request().postDataJSON() ?? {}).slice(0, 300)}` });
		expect(String(body?.status?.code), `Thanh toán bằng điểm lỗi: ${n}`).toBe('200');
		await p.donTab(page).catch(() => null);
		// #14 đang noPointForPointPaymentInvoice=false ⇒ đơn trả bằng điểm VẪN tích điểm trên tổng đơn (1 điểm / 1.000đ).
		const tich = Math.floor((x.tongDon || 0) / 1000);
		let sau = null;
		await expect.poll(async () => {
			await p.moBan(page, test);
			await ganKhach(page, k.sdt);
			return (sau = await diemKhoi(page));
		}, { timeout: 90_000, intervals: [6_000] }).toBeLessThanOrEqual(k.diem - dung + tich);
		test.info().annotations.push({ type: 'điểm', description: `${k.diem} − ${dung} đổi + ${tich} tích (đơn ${x.tongDon}) ⇒ kỳ vọng ${k.diem - dung + tich} · thực ${sau}` });
		expect([k.diem - dung, k.diem - dung + tich], 'Điểm sau thanh toán không khớp').toContain(sau);
		if (sau === k.diem - dung + tich) test.info().annotations.push({ type: 'ghi nhận', description: 'Đơn trả trọn bằng điểm vẫn được CỘNG điểm tích luỹ (theo cấu hình noPointForPointPaymentInvoice=false)' });
	});

	test('18_2_050_008 — Đổi điểm vượt số điểm khách có', async ({ page }) => {
		chanNeuTat('18_2_050_008');
		await khachCoDiem(page);
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const x = await khoiDiem(page, m);
		await x.oDiem.fill(String(x.khaDung + 500));
		await x.oDiem.press('Tab');
		await page.waitForTimeout(800);
		const v = so(await x.oDiem.inputValue());
		const tb = boMa((await page.locator('.ant-message-notice, .ant-form-item-explain-error').allInnerTexts()).join(' | '));
		test.info().annotations.push({ type: 'hành vi thật', description: `khả dụng ${x.khaDung} · gõ ${x.khaDung + 500} ⇒ ô ${v} · "${tb}"` });
		expect(v, 'Ô nhận số điểm vượt điểm khả dụng').toBeLessThanOrEqual(x.khaDung);
	});

	test('18_2_050_010 — Khách 0 điểm không đổi điểm được', async ({ page }) => {
		chanNeuTat('18_2_050_010');
		const st = await p.moBan(page, test);
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
		const d = await diemKhoi(page);
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const nut = m.getByRole('button', { name: 'Thanh toán bằng điểm', exact: true });
		let mo = 'không có nút';
		if (await nut.count()) {
			await nut.click();
			await page.waitForTimeout(1_000);
			mo = boMa((await page.locator('.ant-message-notice').allInnerTexts()).join(' | ')) || chuan(await m.innerText()).slice(0, 300);
		}
		test.info().annotations.push({ type: 'hành vi thật', description: `điểm khối khách ${d} · ${mo}` });
		expect(d).toBe(0);
		const khoi = await m.getByText('Điểm khả dụng: 0').count();
		expect(khoi === 1 || mo === 'không có nút' || /không đủ|0 điểm|chưa có điểm/i.test(mo), 'Khách 0 điểm vẫn cho đổi điểm').toBe(true);
	});

	test('18_2_050_011 — Số điểm đổi bằng 0 hoặc âm', async ({ page }) => {
		chanNeuTat('18_2_050_011');
		await khachCoDiem(page);
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const x = await khoiDiem(page, m);
		const kq = {};
		for (const v of ['0', '-10']) {
			await x.oDiem.fill(v);
			await x.oDiem.press('Tab');
			await page.waitForTimeout(600);
			kq[v] = { o: await x.oDiem.inputValue(), tong: tien(chuan(await m.innerText()), 'Tổng cần thanh toán:') };
		}
		test.info().annotations.push({ type: 'hành vi thật', description: JSON.stringify(kq) });
		expect(so(kq['-10'].o), 'Ô nhận số điểm âm').toBeGreaterThanOrEqual(0);
		expect(kq['-10'].tong ?? 0, 'Điểm âm làm TĂNG tiền phải thu').toBeLessThanOrEqual(x.tongDon);
	});

	test('18_2_050_005 — Điểm không đủ trả hết: phần còn lại bằng tiền mặt', async ({ page }) => {
		chanNeuTat('18_2_050_005');
		const k = await khachCoDiem(page, 200);
		await p.them(page, sp().tc);
		test.info().annotations.push({ type: 'CTKM', description: await boKm(page) });
		const { body } = await thanhToanDiemTienMat(page, k, 200);
		await page.waitForTimeout(4_000);
		const ct = (await p.k.goiApi(page, k.st, `/orders/shops/${k.st.h.shopid}/${body?.data?.orderId}/details`).catch(() => null))?.data;
		const j = JSON.stringify(ct || {});
		test.info().annotations.push({ type: 'đơn', description: j.slice(0, 700) });
		expect(j, 'Đơn không ghi riêng khoản điểm').toMatch(/usePoint"?:\s*200|point/i);
	});

	test('18_2_050_012 — Đổi đúng số điểm khách đang có', async ({ page }) => {
		chanNeuTat('18_2_050_012');
		const k = await khachCoDiem(page, 200);
		// Giỏ phải lớn hơn giá trị quy đổi toàn bộ điểm (1 điểm = 100đ, SP TC 100.000đ) để còn phần tiền mặt.
		await p.them(page, sp().tc);
		await datSl(page, Math.ceil((k.diem * 100) / 100_000) + 1);
		test.info().annotations.push({ type: 'CTKM', description: await boKm(page) });
		const { body, tong } = await thanhToanDiemTienMat(page, k, k.diem);
		await p.donTab(page).catch(() => null);
		// #14 noPointForPointPaymentInvoice=false ⇒ đơn vẫn tích 1 điểm / 1.000đ trên tổng đơn (xem 050_001).
		const tich = Math.floor((tong || 0) / 1000);
		let sau = null;
		await expect.poll(async () => {
			await p.moBan(page, test);
			await ganKhach(page, k.sdt);
			return (sau = await diemKhoi(page));
		}, { timeout: 90_000, intervals: [6_000] }).toBeLessThanOrEqual(tich);
		test.info().annotations.push({ type: 'điểm', description: `đơn ${body?.data?.orderId} · có ${k.diem} · đổi ${k.diem} · tích ${tich} (tổng ${tong}) · còn ${sau}` });
		expect([0, tich], 'Đổi hết điểm mà điểm còn lại không về 0 (cộng phần tích của chính đơn)').toContain(sau);
	});
	test('18_2_050_009 — Giá trị đơn hàng không đạt tối thiểu để đổi điểm', async ({ page, browser }) => {
		chanNeuTat('18_2_050_009');
		// Tiền đề: đặt TẠM `orderAmountConditional` = 200.000đ cho chương trình đổi điểm (`doi-diem-tam.js`), khôi phục finally.
		// Trace 26/09: modal thanh toán (PaymentMethodModal.jsx) KHÔNG kiểm ngưỡng đơn tối thiểu ⇒ nếu có chặn thì ở BE (draft-checkout).
		const { voiDoiDiem } = require('./doi-diem-tam');
		const kq = await voiDoiDiem(browser, { orderAmountConditional: 200_000 }, async () => {
			const k = await khachCoDiem(page, 100);
			await p.them(page, sp().tc);
			test.info().annotations.push({ type: 'CTKM', description: await boKm(page) });
			const m = await moTT(page);
			const x = await khoiDiem(page, m);
			await x.oDiem.fill('50');
			await x.oDiem.press('Tab');
			await page.waitForTimeout(700);
			const n = page.locator('.ant-message-notice');
			const moc = otpIdCuoi(k.sdt);
			const choDraft = page.waitForResponse((r) => /draft-checkout/.test(r.url()) && r.request().method() === 'POST', { timeout: 40_000 }).catch(() => null);
			await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
			const hop = page.getByRole('dialog').filter({ hasText: 'Xác thực OTP' }).last();
			let otp = null;
			if (await hop.isVisible({ timeout: 8_000 }).catch(() => false)) {
				otp = await choOtp(k.sdt, moc);
				if (otp) await nhapOtp(hop, otp);
			}
			const res = await choDraft;
			const body = res ? await res.json().catch(() => null) : null;
			await n.first().waitFor({ state: 'visible', timeout: 6_000 }).catch(() => null);
			return { tongDon: x.tongDon, otp: Boolean(otp), draft: body?.status ?? null, tb: boMa((await n.allInnerTexts()).join(' | ')) };
		});
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
		expect(kq.loiSua, `Không đặt được ngưỡng đổi điểm tối thiểu: ${JSON.stringify(kq.loiSua)}`).toBeUndefined();
		expect(String(kq.draft?.code ?? ''), `🔴 Đơn ${kq.tongDon}đ < ngưỡng 200.000đ mà đổi điểm vẫn thanh toán thành công ("${kq.tb}")`).not.toBe('200');
		expect(`${kq.tb} ${kq.draft?.message ?? ''}`, 'Chặn nhưng thông báo KHÔNG nêu ngưỡng tối thiểu (kịch bản yêu cầu nêu ngưỡng)').toMatch(/tối thiểu|200\.000|200,000/i); // kịch bản: "chặn và NÊU NGƯỠNG tối thiểu" — 🚫 không nhận câu chung chung
	});
});
