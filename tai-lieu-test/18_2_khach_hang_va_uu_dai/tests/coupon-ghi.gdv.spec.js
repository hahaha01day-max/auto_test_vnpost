'use strict';

/**
 * 18_2 nhóm 030 — coupon HỢP LỆ (vai `gdv`, điểm bán seed làn). Dùng đợt coupon do `tien-de-coupon.gdv.spec.js` tạo
 * (sổ `test-output/coupon.lane<N>.json`, đợt 83 làn 8: giảm 5.000đ, phạm vi điểm bán AUTO8_T_01_A01, dùng chung CTKM).
 * Mỗi case lấy một mã riêng (chỉ số cố định) để chạy lại không đụng mã đã dùng; 030_015 THANH TOÁN thật ⇒ mã đó thành đã dùng.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, sp } = p;
const SO = path.join(GOC, 'test-output', `coupon.lane${process.env.VNPOST_LANE || 'x'}.json`);
const GIAM = 5000;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const doc = () => { try { return JSON.parse(fs.readFileSync(SO, 'utf8')); } catch { return null; } };
const boMa = (s) => chuan(s).replace(/\s*\([A-Za-z0-9]{6}\)/g, '');
const oMa = (page) => page.getByPlaceholder(/Quét mã vạch hoặc nhập mã/);

/** Mã chưa dùng thứ i trong sổ; 🔴 mã đã dùng (lượt trước) được bỏ qua bằng cách thử validate. */
function ma(i) {
	const d = doc();
	test.skip(!d?.codes?.length, 'Chưa có đợt coupon cho làn — chạy tiền đề `tien de coupon` (tài khoản gốc)');
	const daDung = new Set(d.daDung || []);
	const con = d.codes.filter((c) => !daDung.has(c));
	return con[i % con.length];
}
function danhDauDaDung(c) {
	const d = doc();
	d.daDung = [...new Set([...(d.daDung || []), c])];
	fs.writeFileSync(SO, JSON.stringify(d, null, 1));
}

async function ap(page, code, { enter = false } = {}) {
	const cho = page.waitForResponse((r) => r.url().includes('/coupon/validate'), { timeout: 10_000 }).catch(() => null);
	if (enter) {
		await oMa(page).click();
		await page.keyboard.type(code, { delay: 8 });
		await page.keyboard.press('Enter');
	} else {
		await oMa(page).fill(code);
		await page.getByRole('button', { name: 'Áp dụng' }).click();
	}
	const res = await cho;
	const body = res ? await res.json().catch(() => null) : null;
	const n = page.locator('.ant-message-notice');
	await n.first().waitFor({ state: 'visible', timeout: 4_000 }).catch(() => null);
	await page.waitForTimeout(800);
	const tb = boMa((await n.allInnerTexts()).join(' | '));
	return { res, body, tb };
}
const dongCoupon = async (page) => {
	const t = chuan(await page.locator('body').innerText());
	const m = t.match(/Mã coupon\s*\(([^)]+)\)\s*-?\s*([\d.,]+)\s*đ/);
	return m ? { ma: m[1], tien: Number(m[2].replace(/[.,]/g, '')) } : null;
};

test.describe('18_2 — Coupon hợp lệ', () => {
	test.describe.configure({ timeout: 240_000 });

	test.beforeEach(async ({ page }) => {
		await p.chanIn(page);
		await p.moBan(page, test);
		await p.them(page, sp().tc);
		await page.mouse.move(600, 700);
	});
	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_2_030_002 — Áp mã coupon hợp lệ', async ({ page }) => {
		chanNeuTat('18_2_030_002');
		const c = ma(0);
		const truoc = await p.tongKet(page);
		const { res, body, tb } = await ap(page, c);
		const sau = await p.tongKet(page);
		const dong = await dongCoupon(page);
		test.info().annotations.push({ type: 'đo', description: `${c} · "${tb}" · ${res?.request().method()} ${JSON.stringify(body?.status)} · trước ${JSON.stringify(truoc)} · sau ${JSON.stringify(sau)} · dòng ${JSON.stringify(dong)}` });
		expect(String(body?.status?.code), `Validate mã hợp lệ lỗi: ${body?.status?.message}`).toBe('200');
		expect(dong, 'Không có dòng "Mã coupon (<mã>)"').toBeTruthy();
		expect(dong.ma).toBe(c);
		expect(dong.tien).toBe(GIAM);
		expect(sau.canThanhToan).toBe(truoc.canThanhToan - GIAM);
		// Kịch bản ghi POST /coupon/validate — thực tế GET (ghi báo cáo, không coi là lỗi chức năng).
		test.info().annotations.push({ type: 'lệch tài liệu', description: `validate gọi bằng ${res?.request().method()}` });
	});

	test('18_2_030_003 — CTKM và coupon không trừ lẫn nhau', async ({ page }) => {
		chanNeuTat('18_2_030_003');
		// Đo 25/09: bảng tổng KHÔNG có dòng "Chiết khấu khuyến mãi" — CTKM "giảm 5k đơn" (tự tích) chỉ thể hiện ở "Cần thanh toán".
		const truoc = await p.tongKet(page);
		const ctkm = truoc.sauVat - truoc.canThanhToan;
		await ap(page, ma(1));
		const sau = await p.tongKet(page);
		const coLabel = await page.getByText(/Chiết khấu khuyến mãi/).count();
		test.info().annotations.push({ type: 'đo', description: `CTKM ${ctkm} · cần TT ${truoc.canThanhToan} → ${sau.canThanhToan} · dòng "Chiết khấu khuyến mãi": ${coLabel}` });
		expect(ctkm, 'Đơn không có CTKM tự áp để kiểm').toBeGreaterThan(0);
		expect(sau.sauVat - sau.canThanhToan, 'CTKM + coupon không cộng thẳng').toBe(ctkm + GIAM);
		expect(coLabel, 'Kịch bản: khối tiền có dòng "Chiết khấu khuyến mãi" riêng').toBeGreaterThan(0);
	});

	test('18_2_030_004 — Quét mã vạch coupon', async ({ page }) => {
		chanNeuTat('18_2_030_004');
		const c = ma(2);
		const { body } = await ap(page, c, { enter: true });
		const dong = await dongCoupon(page);
		test.info().annotations.push({ type: 'đo', description: `${JSON.stringify(body?.status)} · ${JSON.stringify(dong)}` });
		expect(dong?.ma, 'Quét (gõ nhanh + Enter) không áp được mã').toBe(c);
	});

	test('18_2_030_005 — Xoá mã coupon tính lại ngay', async ({ page }) => {
		chanNeuTat('18_2_030_005');
		const truoc = await p.tongKet(page);
		await ap(page, ma(3));
		expect(await dongCoupon(page)).toBeTruthy();
		// Đo DOM: khối nhập mã + dòng "Mã coupon (…)" ở bảng tổng — tìm nút xoá (×) thật.
		const khoi = page.getByRole('heading', { name: 'Mã coupon' }).locator('xpath=..');
		const dongTien = page.getByText(/^Mã coupon \(/).first().locator('xpath=ancestor::tr[1]');
		test.info().annotations.push({ type: 'DOM', description: `khối: ${(await khoi.innerHTML().catch(() => '')).replace(/class="[^"]*"/g, '').slice(0, 700)} || dòng: ${(await dongTien.innerHTML().catch(() => '')).replace(/class="[^"]*"/g, '').slice(0, 500)}` });
		const x = khoi.locator('[aria-label="close"], [aria-label="close-circle"], .anticon-close, .anticon-close-circle').first();
		const x2 = dongTien.locator('[aria-label="close"], [aria-label="close-circle"], [aria-label="delete"]').first();
		if (await x.count()) await x.click({ force: true });
		else if (await x2.count()) await x2.click({ force: true });
		else test.info().annotations.push({ type: 'hành vi thật', description: 'KHÔNG có dấu × nào ở ô mã / dòng coupon' });
		await page.waitForTimeout(500);
		test.info().annotations.push({ type: 'ô mã sau khi bấm ×', description: `"${await oMa(page).inputValue()}"` });
		await page.waitForTimeout(800);
		test.info().annotations.push({ type: 'đo', description: `sau xoá ${JSON.stringify(await p.tongKet(page))} · dòng ${JSON.stringify(await dongCoupon(page))}` });
		expect(await dongCoupon(page), 'Xoá mã mà dòng "Mã coupon" còn').toBeNull();
		expect((await p.tongKet(page)).canThanhToan).toBe(truoc.canThanhToan);
	});

	test('18_2_030_014 — Áp mã coupon thứ hai khi đã có mã', async ({ page }) => {
		chanNeuTat('18_2_030_014');
		const a = ma(4), b = ma(5);
		const truoc = await p.tongKet(page);
		await ap(page, a);
		const { tb } = await ap(page, b);
		const dong = await dongCoupon(page);
		const sau = await p.tongKet(page);
		test.info().annotations.push({ type: 'hành vi thật', description: `A ${a} → B ${b}: "${tb}" · dòng ${JSON.stringify(dong)} · cần TT ${truoc.canThanhToan} → ${sau.canThanhToan}` });
		expect(sau.canThanhToan, 'Hai mã bị CỘNG DỒN').toBeGreaterThanOrEqual(truoc.canThanhToan - GIAM);
	});

	test('18_2_030_015 — Coupon ghi nhận đã dùng khi đơn thanh toán thành công', async ({ page }) => {
		chanNeuTat('18_2_030_015');
		const c = ma(6);
		const { body } = await ap(page, c);
		expect(String(body?.status?.code)).toBe('200');
		// Chưa thanh toán: mã vẫn áp được ở tab khác (chưa bị giữ/đánh dấu).
		const r = await p.thanhToanTienMat(page);
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		danhDauDaDung(c);
		fs.writeFileSync(path.join(GOC, 'test-output', `coupon-da-dung.lane${process.env.VNPOST_LANE || 'x'}.json`), JSON.stringify({ code: c, orderId: r.orderId }));
		await p.moBan(page, test);
		await p.them(page, sp().tc);
		const lai = await ap(page, c);
		test.info().annotations.push({ type: 'đo', description: `đơn ${r.orderId} · áp lại "${lai.tb}" · ${JSON.stringify(lai.body?.status)}` });
		expect(String(lai.body?.status?.code), 'Mã đã thanh toán vẫn áp lại được (chưa ghi nhận đã dùng)').not.toBe('200');
	});

	test('18_2_030_008 — Mã coupon đã dùng rồi bị chặn', async ({ page }) => {
		chanNeuTat('18_2_030_008');
		let u;
		try { u = JSON.parse(fs.readFileSync(path.join(GOC, 'test-output', `coupon-da-dung.lane${process.env.VNPOST_LANE || 'x'}.json`), 'utf8')); } catch { /* */ }
		test.skip(!u?.code, 'Chưa có mã đã dùng (chạy 030_015 trước)');
		const truoc = await p.tongKet(page);
		const { tb, body } = await ap(page, u.code);
		test.info().annotations.push({ type: 'đo', description: `"${tb}" · ${JSON.stringify(body?.status)}` });
		expect(String(body?.status?.code)).not.toBe('200');
		expect(tb).toMatch(/đã (được )?sử dụng|đã dùng/i);
		expect(await dongCoupon(page)).toBeNull();
		expect((await p.tongKet(page)).canThanhToan).toBe(truoc.canThanhToan);
	});

	test('18_2_030_009 — Đơn chưa đạt điều kiện của đợt phát hành bị chặn', async ({ page }) => {
		chanNeuTat('18_2_030_009');
		const c = doc()?.toiThieu?.codes?.[0];
		test.skip(!c, 'Chưa có đợt coupon "tối thiểu 200k" (chạy lại tiền đề `tien de coupon`)');
		const truoc = await p.tongKet(page);
		const { tb, body } = await ap(page, c);
		test.info().annotations.push({ type: 'đo', description: `giỏ ${truoc.sauVat} < 200.000 · "${tb}" · ${JSON.stringify(body?.status)}` });
		// Đo 25/09: validate trả 200 (BE không kiểm ngưỡng), FE tự chặn bằng thông báo — ghi nhận ở báo cáo.
		expect(tb, 'Thông báo không nêu điều kiện đơn tối thiểu').toMatch(/tối thiểu|chưa đủ|điều kiện|200\.000/i);
		expect(await dongCoupon(page)).toBeNull();
		expect((await p.tongKet(page)).canThanhToan).toBe(truoc.canThanhToan);
	});

	test('18_2_030_010 — CTKM không dùng chung với coupon', async ({ page }) => {
		chanNeuTat('18_2_030_010');
		const c = doc()?.khongChung?.codes?.[0];
		test.skip(!c, 'Chưa có đợt coupon "không dùng chung" (chạy lại tiền đề `tien de coupon`)');
		const truoc = await p.tongKet(page);
		const ctkm = truoc.sauVat - truoc.canThanhToan;
		const { tb, body } = await ap(page, c);
		const sau = await p.tongKet(page);
		const dong = await dongCoupon(page);
		test.info().annotations.push({ type: 'đo', description: `CTKM đang áp ${ctkm} · "${tb}" · ${JSON.stringify(body?.status)} · dòng ${JSON.stringify(dong)} · cần TT ${truoc.canThanhToan} → ${sau.canThanhToan}` });
		expect(ctkm, 'Giỏ không có CTKM tự áp để kiểm').toBeGreaterThan(0);
		expect(sau.sauVat - sau.canThanhToan, '🔴 Áp được CẢ CTKM lẫn coupon không dùng chung').toBeLessThan(ctkm + GIAM);
	});
});
