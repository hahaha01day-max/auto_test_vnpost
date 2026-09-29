'use strict';

/**
 * 07_3 · 010 — Cấu hình đơn đổi trả của CHUỖI (`/settings?setting=order`), GHI (27/09/2026). Vai `tct`.
 * 🔴 Cấu hình chung cả chuỗi — user cho sửa (memory `auto_test_moi_truong_test_lam_thoai_mai`), đã báo phiên làn 7; KHÔI PHỤC công tắc + số ngày gốc ở finally.
 * Khối "Cấu hình đơn đổi trả": công tắc đầu tiên của nhóm + ô số ngày (`input[aria-valuemin="0"]`) + nút "Lưu" hiện đầu tiên (khuôn `doi-tra-validate`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 1200) });

async function mo(page) {
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=order`, 'tct');
	await page.waitForTimeout(4_000);
	const sw = khung(page).locator('.ant-switch').filter({ visible: true }).first();
	await expect(sw).toBeVisible({ timeout: 30_000 });
	return { sw, // Ô số ngày chỉ render khi công tắc BẬT (OrderSetting.jsx); 🚫 input[aria-valuemin=0] chung — khối "ngưỡng hoàn trả bất thường" cũng có.
		o: () => khung(page).getByText('Giới hạn thời gian trả hàng', { exact: true }).locator('xpath=ancestor::div[contains(@class,"justify-between")][1]').locator('input').first(), nut: () => khung(page).getByRole('button', { name: /Lưu/ }).filter({ visible: true }).first() };
}
const bat = async (sw) => (await sw.getAttribute('aria-checked')) === 'true';
async function thongBaoSau(page, fn) {
	const tb = new Set();
	const nghe = setInterval(async () => { for (const x of await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])) tb.add(chuan(x)); }, 150);
	await fn();
	await page.waitForTimeout(2_500);
	clearInterval(nghe);
	return [...tb].join(' | ');
}
async function luuSo(page, m, v) {
	const o = m.o();
	await o.fill('');
	await o.pressSequentially(String(v));
	await o.blur();
	const hien = await o.inputValue();
	const khoa = await m.nut().isDisabled().catch(() => true);
	let res = null;
	const tb = await thongBaoSau(page, async () => {
		if (khoa) return;
		const cho = page.waitForResponse((r) => r.request().method() !== 'GET' && /config|setting|return/i.test(r.url()), { timeout: 15_000 }).catch(() => null);
		await m.nut().click();
		res = await cho;
	});
	return { v, hien, khoa, gui: res ? res.request().postData()?.slice(0, 160) : null, http: res?.status(), tb, loi: chuan((await khung(page).locator('.ant-form-item-explain-error').allInnerTexts()).join(' | ')) };
}
async function khoiPhuc(page, m, goc) {
	if (goc.bat && !(await bat(m.sw))) await m.sw.click().catch(() => null);
	await page.waitForTimeout(1_500);
	if (goc.bat && goc.so !== null && (await m.o().count())) await luuSo(page, m, goc.so).catch(() => null);
	if (!goc.bat && (await bat(m.sw))) await m.sw.click().catch(() => null);
	await page.waitForTimeout(1_500);
}

test.describe('07_3 · 010 — Cấu hình đơn đổi trả (GHI)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('07_3_010_002 — Bật công tắc đổi trả hiện ô giới hạn thời gian', async ({ page }) => {
		chanNeuTat('07_3_010_002');
		const m = await mo(page);
		const goc = { bat: await bat(m.sw), so: (await m.o().count()) ? await m.o().inputValue() : null };
		try {
			let tbTat = '';
			if (goc.bat) tbTat = await thongBaoSau(page, () => m.sw.click());
			const oKhiTat = await m.o().count();
			const tbBat = await thongBaoSau(page, () => m.sw.click());
			const oKhiBat = await m.o().count();
			const giaTri = oKhiBat ? await m.o().inputValue() : null;
			const donVi = chuan(await khung(page).innerText()).match(/Giới hạn thời gian trả hàng[^A-Za-zÀ-ỹ]*.{0,40}/)?.[0];
			ghiDo(`gốc ${JSON.stringify(goc)} · tắt "${tbTat}" ⇒ ô ${oKhiTat} · bật "${tbBat}" ⇒ ô ${oKhiBat} giá trị ${giaTri} · "${donVi}"`);
			expect(oKhiTat, 'Tắt công tắc mà ô giới hạn vẫn hiện').toBe(0);
			expect(oKhiBat, 'Bật công tắc mà ô giới hạn không hiện').toBe(1);
			expect(giaTri, 'Giá trị ô khi bật không phải mặc định 7 (hoặc giá trị đã lưu)').toMatch(goc.so ? new RegExp(`^(7|${goc.so})$`) : /^7$/);
			expect(chuan(await khung(page).innerText()), 'Không có đơn vị "Ngày"').toMatch(/ngày/i);
		} finally { await khoiPhuc(page, m, goc); }
	});

	test('07_3_010_005 — Tắt rồi bật lại giữ giá trị đã lưu', async ({ page }) => {
		chanNeuTat('07_3_010_005');
		const m = await mo(page);
		const goc = { bat: await bat(m.sw), so: null };
		try {
			if (!goc.bat) { await thongBaoSau(page, () => m.sw.click()); }
			goc.so = await m.o().inputValue();
			const moi = String(Number(goc.so || 0) === 3 ? 4 : 3);
			const luu = await luuSo(page, m, moi);
			await thongBaoSau(page, () => m.sw.click()); // tắt
			const oTat = await m.o().count();
			await thongBaoSau(page, () => m.sw.click()); // bật lại
			const sau = (await m.o().count()) ? await m.o().inputValue() : null;
			ghiDo(`lưu ${moi}: ${JSON.stringify(luu)} · khi tắt ô ${oTat} · bật lại = ${sau}`);
			expect(luu.http ?? 0, 'Lưu số ngày không gửi / lỗi').toBe(200);
			expect(oTat, 'Tắt mà ô vẫn hiện').toBe(0);
			expect(sau, 'Bật lại mà ô về rỗng / mất giá trị đã lưu').toBe(moi);
		} finally { await khoiPhuc(page, m, goc); }
	});

	test('07_3_010_004 — Giá trị biên của Giới hạn thời gian trả hàng', async ({ page }) => {
		chanNeuTat('07_3_010_004');
		const m = await mo(page);
		const goc = { bat: await bat(m.sw), so: null };
		const kq = [];
		try {
			if (!goc.bat) await thongBaoSau(page, () => m.sw.click());
			goc.so = await m.o().inputValue();
			for (const v of ['0', '1', '9999', '-1', '1.5']) kq.push(await luuSo(page, m, v));
			await page.reload();
			await page.waitForTimeout(4_000);
			const cuoi = (await m.o().count()) ? await m.o().inputValue() : null;
			ghiDo(`${JSON.stringify(kq)} · sau F5 = ${cuoi}`);
			const x = Object.fromEntries(kq.map((q) => [q.v, q]));
			expect(x['0'].http, '0 không lưu được').toBe(200);
			expect(x['1'].http, '1 không lưu được').toBe(200);
			expect(x['-1'].hien, 'Số âm vẫn nằm trong ô').not.toMatch(/^-/);
			expect(x['-1'].gui ?? '', 'Số âm vẫn được gửi đi lưu').not.toMatch(/-1/);
			expect(x['1.5'].gui ?? '', 'Số thập phân 1.5 được lưu nguyên').not.toMatch(/1\.5/);
			expect(x['9999'].http, '🔴 (ghi nhận) 9999 ngày bị chặn — có giới hạn trên').toBe(200);
		} finally { await khoiPhuc(page, m, goc); }
	});
});

/** Mở trang "Liên kết thanh toán tích hợp"; trả nội dung + nhãn trạng thái + nút. */
async function trangTichHop(page) {
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=payment`, 'tct');
	await page.waitForTimeout(4_000);
	await khung(page).getByText('Liên kết thanh toán tích hợp', { exact: true }).click();
	await page.waitForTimeout(4_000);
	const vung = khung(page).locator('.ant-card').filter({ hasText: 'Liên kết tài khoản thanh toán tích hợp' }).first();
	const noi = chuan(await vung.innerText());
	return { noi, nhanTT: noi.match(/Đang kết nối|Chưa xác thực|Đã hủy kết nối/g) || [], nut: (await vung.getByRole('button').filter({ visible: true }).allInnerTexts()).map(chuan).filter(Boolean) };
}

// PaymentSetting.jsx: 2 thẻ "Liên kết tài khoản thủ công" / "Liên kết thanh toán tích hợp"; trạng thái kết nối + nút "Liên kết tài khoản mới" ở trang TÍCH HỢP.
// 🚫 Không tự liên kết / huỷ liên kết tài khoản ngân hàng thật ⇒ mỗi case đo theo hiện trạng, trạng thái ngược lại thì skip có lý do.
test('07_3_030_001 — Thẻ tài khoản liên kết hiện đủ thông tin và trạng thái', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '07_3_030_001'));
	test.skip(Boolean(ly), ly ?? '');
	const t = await trangTichHop(page);
	ghiDo(`nhãn trạng thái ${JSON.stringify([...new Set(t.nhanTT)])} (${t.nhanTT.length}) · nút ${JSON.stringify(t.nut)} · ${t.noi.slice(0, 300)}`);
	test.skip(!t.nhanTT.length, 'Chuỗi chưa có tài khoản tích hợp nào — không tự liên kết tài khoản ngân hàng thật');
	expect(t.noi, 'Thiếu tên ngân hàng / số tài khoản / chủ tài khoản').toMatch(/tài khoản|STK|\d{6,}/i);
});

test('07_3_030_002 — Chưa liên kết tài khoản nào thì mời liên kết', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '07_3_030_002'));
	test.skip(Boolean(ly), ly ?? '');
	const t = await trangTichHop(page);
	ghiDo(`nhãn trạng thái ${t.nhanTT.length} · nút ${JSON.stringify(t.nut)}`);
	test.skip(t.nhanTT.length > 0, `Chuỗi đang có ${t.nhanTT.length} tài khoản tích hợp — trạng thái "chưa liên kết" chỉ dựng được bằng huỷ liên kết ngân hàng thật (không làm). Nút "Liên kết tài khoản mới" hiện: ${t.nut.some((n) => /Liên kết tài khoản mới/.test(n))}`);
	expect(t.nut.some((n) => /Liên kết tài khoản mới/.test(n)), 'Chưa có tài khoản mà không có nút "Liên kết tài khoản mới"').toBe(true);
});
