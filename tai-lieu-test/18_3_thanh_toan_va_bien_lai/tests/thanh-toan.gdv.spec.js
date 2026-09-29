'use strict';

/**
 * 18_3 — modal Thanh toán (vai `gdv`, điểm bán seed làn).
 *
 * Đo DOM 25/09/2026 (vnpost-web 8ac2c516, `OrderCheckoutComponent_v2.jsx`): Hình thức "Thanh toán hết" ·
 * "Trả góp" · "Thanh toán sau"; Phương thức "Tiền mặt" · "Chuyển khoản" · "Quét QR" · "Đa phương thức"
 * (🔴 KHÔNG có "Thẻ VISA" / "Thanh toán bằng điểm"). Tiền mặt: "Nhập số tiền khách đưa", "Tiền trả lại
 * khách", dãy mệnh giá nhanh. Chuyển khoản: "Bạn không có bất kì tài khoản thanh toán nào…". Quét QR:
 * VietQR/PostPay + "Chọn ngân hàng nhận VietQR" (4 TK VNPOST). Trả góp: "Nhập số tiền trả góp(*)",
 * "Nợ sau thanh toán". Thanh toán sau: "Ghi vào công nợ khách hàng số tiền cần thanh toán …".
 * Hoàn tất tiền mặt qua iframe SDK — helper `18_1/tests/pos-18.js › thanhToanTienMat`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, sp, so } = p;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const boMa = (s) => chuan(s).replace(/\s*\([A-Za-z0-9]{6}\)/g, '');
const hop = (page) => page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last();

async function moTT(page) {
	await page.mouse.move(600, 700);
	await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
	await expect(hop(page)).toBeVisible({ timeout: 20_000 });
	return hop(page);
}
const chon = (m, t) => m.getByRole('button', { name: t, exact: true }).click();
/** Ô nhập tiền nằm sau nhãn `nhan` (InputNumber). */
const oSau = (m, nhan) => m.getByText(nhan, { exact: false }).first().locator('xpath=following::input[1]');
async function tbSau(page, fn, cho = 6_000) {
	await fn();
	const n = page.locator('.ant-message-notice');
	await n.first().waitFor({ state: 'visible', timeout: cho }).catch(() => null);
	await page.waitForTimeout(500);
	return boMa((await n.allInnerTexts()).join(' | '));
}
/** Nghe draft-checkout (không có ⇒ không tạo đơn). */
function ngheDraft(page) {
	const ds = [];
	page.on('request', (r) => { if (/draft-checkout|spa-checkout\/(v2\.1|multi)/.test(r.url()) && r.method() === 'POST') ds.push(r.url()); });
	return ds;
}
/** Số tiền ngay sau nhãn trong chữ của modal ("<nhãn> 95.000 đ"); không có số ⇒ 0. */
const giaTri = async (m, nhan) => {
	const t = chuan(await m.innerText());
	const i = t.indexOf(nhan);
	const mm = i < 0 ? null : t.slice(i + nhan.length, i + nhan.length + 40).match(/^\s*:?\s*(-?[\d.]+)\s*đ/);
	return mm ? so(mm[1]) : 0;
};

/** "Tiền trả lại khách" là ô (input readOnly) — đọc giá trị ô; không có ô thì đọc chữ. */
async function traLaiKhach(m) {
	const o = m.getByText('Tiền trả lại khách', { exact: true }).first().locator('xpath=following::input[1]');
	if (await o.count()) return so(await o.inputValue());
	return giaTri(m, 'Tiền trả lại khách');
}

test.describe('18_3 — Thanh toán', () => {
	test.describe.configure({ timeout: 240_000 });
	let st;

	test.beforeEach(async ({ page }) => {
		await p.chanIn(page);
		st = await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_3_010_001 — Mở màn thanh toán khi đơn chưa có sản phẩm', async ({ page }) => {
		chanNeuTat('18_3_010_001');
		const tb = await tbSau(page, async () => {
			await page.mouse.move(600, 700);
			await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
		});
		expect(tb).toContain('Đơn hàng không có sản phẩm, vui lòng thêm sản phẩm');
		await expect(hop(page)).toHaveCount(0);
	});

	test('18_3_010_002 — Mặc định hình thức và phương thức khi mở màn thanh toán', async ({ page }) => {
		chanNeuTat('18_3_010_002');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const chonSan = async (t) => /ant-btn-primary|active|selected/.test(await m.getByRole('button', { name: t, exact: true }).getAttribute('class'));
		expect(await chonSan('Thanh toán hết'), '"Thanh toán hết" không được chọn sẵn').toBe(true);
		expect(await chonSan('Tiền mặt'), '"Tiền mặt" không được chọn sẵn').toBe(true);
	});

	test('18_3_010_003 — Hiển thị đủ 3 hình thức thanh toán', async ({ page }) => {
		chanNeuTat('18_3_010_003');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		for (const t of ['Thanh toán hết', 'Trả góp', 'Thanh toán sau']) await expect(m.getByRole('button', { name: t, exact: true })).toBeVisible();
	});

	test('18_3_010_004 — Hiển thị đủ 6 phương thức thanh toán', async ({ page }) => {
		chanNeuTat('18_3_010_004');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const co = [];
		for (const t of ['Tiền mặt', 'Chuyển khoản', 'Quét QR', 'Thẻ VISA', 'Thanh toán bằng điểm', 'Đa phương thức']) {
			if (await m.getByRole('button', { name: t, exact: true }).count()) co.push(t);
		}
		test.info().annotations.push({ type: 'phương thức có', description: co.join(' · ') });
		expect(co).toEqual(['Tiền mặt', 'Chuyển khoản', 'Quét QR', 'Thẻ VISA', 'Thanh toán bằng điểm', 'Đa phương thức']);
	});

	test('18_3_010_005 — Huỷ modal thanh toán không được lưu gì', async ({ page }) => {
		chanNeuTat('18_3_010_005');
		await p.them(page, sp().tc);
		const ds = ngheDraft(page);
		const m = await moTT(page);
		await oSau(m, 'Nhập số tiền khách đưa').fill('200000');
		await m.getByRole('button', { name: 'Huỷ' }).click();
		await expect(m).toBeHidden();
		expect(ds, 'Huỷ mà vẫn gửi checkout').toEqual([]);
		await expect(p.dongBill(page)).toHaveCount(1);
	});

	test('18_3_020_001 — Thanh toán đủ bằng tiền mặt', async ({ page }) => {
		chanNeuTat('18_3_020_001');
		await p.them(page, sp().tc);
		let traLai = null;
		const r = await p.thanhToanTienMat(page, { truocKhiXacNhan: async (m) => { traLai = String(await giaTri(m, 'Tiền trả lại khách')); } });
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		const x = await p.donTrongDs(page, st, r.orderId);
		test.info().annotations.push({ type: 'đơn', description: `orderId ${r.orderId} · status ${x?.status} · tiền trả lại "${traLai}"` });
		expect(x, 'Không thấy đơn đã thanh toán ở danh sách').toBeTruthy();
		expect(so(traLai || '0')).toBe(0);
	});

	test('18_3_020_002 — Tính tiền thừa khi khách đưa dư', async ({ page }) => {
		chanNeuTat('18_3_020_002');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const phai = await giaTri(m, 'Tổng tiền cần thanh toán');
		await oSau(m, 'Nhập số tiền khách đưa').fill('200000');
		await oSau(m, 'Nhập số tiền khách đưa').blur();
		await page.waitForTimeout(500);
		const tra = await traLaiKhach(m);
		expect(tra).toBe(200000 - phai);
	});

	test('18_3_020_003 — Chặn tiền khách đưa nhỏ hơn số phải thu khi Thanh toán hết', async ({ page }) => {
		chanNeuTat('18_3_020_003');
		await p.them(page, sp().tc);
		const ds = ngheDraft(page);
		const m = await moTT(page);
		await oSau(m, 'Nhập số tiền khách đưa').fill('10000');
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Xác nhận thanh toán' }).click());
		test.info().annotations.push({ type: 'thông báo thật', description: tb || '(không thông báo)' });
		expect(ds, 'Khách đưa thiếu mà vẫn gửi checkout').toEqual([]);
	});

	test('18_3_020_004 — Bỏ trống số tiền khách đưa', async ({ page }) => {
		chanNeuTat('18_3_020_004');
		await p.them(page, sp().tc);
		const ds = ngheDraft(page);
		const m = await moTT(page);
		await oSau(m, 'Nhập số tiền khách đưa').fill('');
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Xác nhận thanh toán' }).click());
		expect(tb).toContain('Cần nhập số tiền thanh toán');
		expect(ds).toEqual([]);
	});

	test('18_3_020_005 — Nhập số tiền khách đưa bằng 0', async ({ page }) => {
		chanNeuTat('18_3_020_005');
		await p.them(page, sp().tc);
		const ds = ngheDraft(page);
		const m = await moTT(page);
		await oSau(m, 'Nhập số tiền khách đưa').fill('0');
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Xác nhận thanh toán' }).click());
		test.info().annotations.push({ type: 'thông báo thật', description: tb || '(không thông báo)' });
		expect(ds, 'Khách đưa 0 mà vẫn gửi checkout').toEqual([]);
	});

	test('18_3_020_006 — Nhập số tiền khách đưa âm', async ({ page }) => {
		chanNeuTat('18_3_020_006');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const o = oSau(m, 'Nhập số tiền khách đưa');
		await o.fill('-50000');
		await o.blur();
		const v = await o.inputValue();
		test.info().annotations.push({ type: 'hành vi thật', description: `ô hiện "${v}"` });
		expect(v.startsWith('-'), 'Ô nhận số âm').toBe(false);
	});

	test('18_3_020_007 — Nhập chữ vào ô số tiền khách đưa', async ({ page }) => {
		chanNeuTat('18_3_020_007');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const o = oSau(m, 'Nhập số tiền khách đưa');
		await o.fill('');
		await o.pressSequentially('abc');
		expect(await o.inputValue()).not.toMatch(/[a-z]/i);
	});

	test('18_3_020_008 — Chọn nhanh mệnh giá tiền khách đưa', async ({ page }) => {
		chanNeuTat('18_3_020_008');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const phai = await giaTri(m, 'Tổng tiền cần thanh toán');
		await m.getByRole('button', { name: '200.000 đ', exact: true }).click();
		await page.waitForTimeout(500);
		expect(so(await oSau(m, 'Nhập số tiền khách đưa').inputValue())).toBe(200000);
		expect(await traLaiKhach(m)).toBe(200000 - phai);
	});

	test('18_3_030_001 — Thanh toán bằng chuyển khoản', async ({ page }) => {
		chanNeuTat('18_3_030_001');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		await chon(m, 'Chuyển khoản');
		await page.waitForTimeout(800);
		const t = chuan(await m.innerText());
		test.skip(/không có bất kì tài khoản thanh toán nào/i.test(t), 'Điểm bán seed chưa khai tài khoản thanh toán chuyển khoản: "Bạn không có bất kì tài khoản thanh toán nào vui lòng thêm trong cài đặt…" (đo 25/09).');
	});

	test('18_3_030_002 — Thanh toán bằng Thẻ VISA', async ({ page }) => {
		chanNeuTat('18_3_030_002');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		await expect(m.getByRole('button', { name: 'Thẻ VISA', exact: true }), 'Không có phương thức "Thẻ VISA" trong modal').toBeVisible({ timeout: 5_000 });
	});

	test('18_3_040_002 — Chặn tạo mã QR khi chưa chọn tài khoản nhận', async ({ page }) => {
		chanNeuTat('18_3_040_002');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		await chon(m, 'Quét QR');
		await page.waitForTimeout(800);
		const t = chuan(await m.innerText());
		expect(t).toContain('Vui lòng chọn tài khoản nhận QR');
		await expect(m.getByRole('button', { name: /Tạo mã|Xác nhận thanh toán/ }), 'Chưa chọn TK nhận mà vẫn có nút tạo mã/xác nhận').toHaveCount(0);
	});

	test('18_3_040_003 — Tự chọn tài khoản nhận khi điểm bán chỉ có một', async ({ page }) => {
		chanNeuTat('18_3_040_003');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		await chon(m, 'Quét QR');
		await page.waitForTimeout(800);
		const soTk = (chuan(await m.innerText()).match(/VNPOST - \d+/g) || []).length;
		test.skip(soTk !== 1, `Điểm bán seed có ${soTk} tài khoản nhận QR (cần đúng 1 để kiểm tự chọn).`);
	});

	test('18_3_060_002 — Chặn khi tổng các phương thức khác số phải thu', async ({ page }) => {
		chanNeuTat('18_3_060_002');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		await chon(m, 'Đa phương thức');
		await page.waitForTimeout(800);
		const oTM = m.getByText('Tiền mặt', { exact: true }).last().locator('xpath=following::input[1]');
		const oThe = m.getByText('Thẻ/POS ngân hàng', { exact: true }).locator('xpath=following::input[1]');
		await oTM.fill('10000');
		await oThe.fill('10000');
		const oQr = m.getByText('VietQR', { exact: true }).first().locator('xpath=following::input[1]');
		await oQr.fill('0').catch(() => null);
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Thanh toán', exact: true }).click());
		test.info().annotations.push({ type: 'thông báo thật', description: tb });
		expect(tb).toContain('Tổng các phương thức phải bằng số tiền thanh toán lần này');
	});

	test('18_3_060_003 — Chặn khi không nhập phương thức nào', async ({ page }) => {
		chanNeuTat('18_3_060_003');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		await chon(m, 'Đa phương thức');
		await page.waitForTimeout(800);
		for (const o of await m.locator('.ant-input-number input').all()) await o.fill('').catch(() => null);
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Thanh toán', exact: true }).click());
		expect(tb).toContain('Vui lòng nhập ít nhất một phương thức thanh toán');
	});

	test('18_3_060_004 — Chặn khi dùng VietQR mà chưa chọn tài khoản nhận', async ({ page }) => {
		chanNeuTat('18_3_060_004');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		await chon(m, 'Đa phương thức');
		await page.waitForTimeout(800);
		// Mặc định toàn bộ số phải thu dồn vào VietQR ("VietQR: 95.000 đ"), chưa chọn TK nhận.
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Thanh toán', exact: true }).click());
		expect(tb).toContain('Vui lòng chọn tài khoản nhận QR');
	});

	test('18_3_060_005 — Ô phương thức còn lại tự điền phần thiếu', async ({ page }) => {
		chanNeuTat('18_3_060_005');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const phai = await giaTri(m, 'Tổng tiền cần thanh toán');
		await chon(m, 'Đa phương thức');
		await page.waitForTimeout(800);
		const oTM = m.getByText('Tiền mặt', { exact: true }).last().locator('xpath=following::input[1]');
		await oTM.fill('30000');
		await oTM.blur();
		await page.waitForTimeout(800);
		const t = chuan(await m.innerText());
		test.info().annotations.push({ type: 'khối đa phương thức', description: t.slice(t.indexOf('Thanh toán đa phương thức'), t.indexOf('Thanh toán đa phương thức') + 300) });
		expect(t, `Phần còn lại ${phai - 30000} không được tự điền`).toContain(`${(phai - 30000).toLocaleString('vi-VN')} đ`);
	});

	test('18_3_070_002 — Chặn Trả góp đối với khách lẻ', async ({ page }) => {
		chanNeuTat('18_3_070_002');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		await chon(m, 'Trả góp');
		await oSau(m, 'Nhập số tiền trả góp').fill('50000');
		await oSau(m, 'Nhập số tiền khách đưa').fill('50000').catch(() => null);
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Xác nhận thanh toán' }).click(), 10_000);
		expect(tb).toContain('Thanh toán sau hoặc một phần không thể áp dụng cho khách vãng lai');
	});

	test('18_3_070_003 — Bỏ trống số tiền trả góp', async ({ page }) => {
		chanNeuTat('18_3_070_003');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		await chon(m, 'Trả góp');
		await oSau(m, 'Nhập số tiền trả góp').fill('');
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Xác nhận thanh toán' }).click());
		expect(tb).toContain('Nhập số tiền trả góp');
	});

	test('18_3_070_004 — Chặn số tiền trả góp bằng hoặc lớn hơn số phải thu', async ({ page }) => {
		chanNeuTat('18_3_070_004');
		await p.them(page, sp().tc);
		const m = await moTT(page);
		const phai = await giaTri(m, 'Tổng tiền cần thanh toán');
		await chon(m, 'Trả góp');
		await oSau(m, 'Nhập số tiền trả góp').fill(String(phai));
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Xác nhận thanh toán' }).click());
		expect(tb).toContain('Số tiền trả một phần phải nhỏ hơn tổng tiền cần thanh toán');
	});

	test('18_3_070_001 — Thu một phần và ghi nợ phần còn lại', async ({ page }) => {
		chanNeuTat('18_3_070_001');
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
		await p.them(page, sp().tc);
		const r = await p.thanhToanTienMat(page, {
			truocKhiXacNhan: async (m) => {
				await chon(m, 'Trả góp');
				await oSau(m, 'Nhập số tiền trả góp').fill('30000');
				await oSau(m, 'Nhập số tiền trả góp').blur();
				await page.waitForTimeout(500);
				test.info().annotations.push({ type: 'nợ sau thanh toán', description: chuan(await m.getByText('Nợ sau thanh toán').locator('xpath=following::*[normalize-space()][1]').innerText()) });
				await oSau(m, 'Nhập số tiền khách đưa').fill('30000').catch(() => null);
			},
		});
		expect(r.orderId, `Trả góp lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		await p.donTab(page);
		await p.chonKhach(page, kh.customerName);
		await page.keyboard.press('Escape');
		const k = chuan(await page.getByText('Ghi chú đơn hàng', { exact: true }).locator('xpath=ancestor::*[.//*[@aria-label="plus"]][1]').innerText());
		const no = so((k.match(/Tiền còn nợ\s*([\d.]+)/) || [])[1]);
		test.info().annotations.push({ type: 'khối khách sau', description: k.slice(0, 200) });
		expect(no, 'Công nợ khách không tăng đúng phần còn lại').toBe(95000 - 30000);
	});

	test('18_3_090_001 — Thanh toán sau ghi nợ toàn bộ', async ({ page }) => {
		chanNeuTat('18_3_090_001');
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
		await p.them(page, sp().tc);
		const phaiThu = (await p.tongKet(page)).canThanhToan;
		const r = await p.thanhToanTienMat(page, { truocKhiXacNhan: (m) => chon(m, 'Thanh toán sau') });
		test.info().annotations.push({ type: 'kết quả', description: `orderId ${r.orderId} · draft ${JSON.stringify(r.draft?.status)}` });
		expect(r.orderId, `Thanh toán sau lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		await p.donTab(page);
		await p.chonKhach(page, kh.customerName);
		await page.keyboard.press('Escape');
		const k = chuan(await page.getByText('Ghi chú đơn hàng', { exact: true }).locator('xpath=ancestor::*[.//*[@aria-label="plus"]][1]').innerText());
		expect(so((k.match(/Tiền còn nợ\s*([\d.]+)/) || [])[1]), 'Công nợ khách ≠ toàn bộ số phải thu').toBe(phaiThu);
	});

	test('18_3_090_002 — Chặn Thanh toán sau đối với khách lẻ', async ({ page }) => {
		chanNeuTat('18_3_090_002');
		await p.them(page, sp().tc);
		await page.mouse.move(600, 700);
		const tb = await tbSau(page, () => page.getByRole('button', { name: 'Thanh toán sau' }).click(), 10_000);
		expect(tb).toContain('Thanh toán sau hoặc một phần không thể áp dụng cho khách vãng lai');
	});

	test('18_3_090_003 — Thanh toán sau khi đơn chưa có sản phẩm', async ({ page }) => {
		chanNeuTat('18_3_090_003');
		await page.mouse.move(600, 700);
		const tb = await tbSau(page, () => page.getByRole('button', { name: 'Thanh toán sau' }).click());
		expect(tb).toContain('Đơn hàng không có sản phẩm, vui lòng thêm sản phẩm');
	});

	test('18_3_090_004 — Chặn thanh toán đơn không còn ở trạng thái nháp', async ({ page }) => {
		chanNeuTat('18_3_090_004');
		await p.them(page, sp().tc);
		let body = null;
		page.on('request', (r) => { if (/draft-checkout/.test(r.url()) && r.method() === 'POST') body = r.postDataJSON(); });
		const r = await p.thanhToanTienMat(page);
		expect(r.orderId && body, 'Không bắt được đơn đã thanh toán + body checkout').toBeTruthy();
		const b = await p.k.goiGhi(page, st, 'POST', '/spa-checkout/v2.1/draft-checkout', { shopId: st.h.shopid }, { ...body, orderId: r.orderId });
		test.info().annotations.push({ type: 'BE', description: JSON.stringify(b?.status) });
		expect(boMa(b?.status?.message)).toBe('Chỉ có thể thanh toán các đơn nháp');
	});

	test('18_3_070_005 — Chặn số tiền thanh toán lớn hơn tổng tiền đơn hàng', async ({ page }) => {
		chanNeuTat('18_3_070_005');
		await p.them(page, sp().tc);
		let body = null;
		await page.route('**/spa-checkout/v2.1/draft-checkout**', async (route) => {
			body = route.request().postDataJSON();
			await route.abort();
		});
		const m = await moTT(page);
		await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
		await expect.poll(() => body, { timeout: 15_000 }).toBeTruthy();
		await page.unroute('**/spa-checkout/v2.1/draft-checkout**');
		const tien = JSON.stringify(body).match(/"(money|amount|paymentAmount|totalPayment)"\s*:\s*\d+/g);
		test.info().annotations.push({ type: 'trường tiền trong body', description: String(tien) });
		const sua = JSON.parse(JSON.stringify(body).replace(/("(?:money|amount|paymentAmount|totalPayment)"\s*:\s*)(\d+)/g, (_, a, v) => `${a}${Number(v) * 10}`));
		const b = await p.k.goiGhi(page, st, 'POST', '/spa-checkout/v2.1/draft-checkout', { shopId: st.h.shopid }, sua);
		test.info().annotations.push({ type: 'BE', description: JSON.stringify(b?.status) });
		expect(boMa(b?.status?.message)).toBe('Số tiền thanh toán lớn hơn tổng số tiền của đơn hàng.');
	});

	test('18_3_080_001 — Lưu đơn nháp bằng nút Đặt hàng trước', async ({ page }) => {
		chanNeuTat('18_3_080_001');
		await p.them(page, sp().tc);
		await page.mouse.move(600, 700);
		const nut = page.getByRole('button', { name: 'Đặt hàng trước' });
		test.info().annotations.push({ type: 'đo', description: `nút "Đặt hàng trước": ${await nut.count()}` });
		// F7 vẫn lưu nháp (đã kiểm ở 18_1_070_002); case này đòi NÚT.
		await expect(nut, 'Màn bán hàng không có nút "Đặt hàng trước" (chỉ còn phím F7)').toBeVisible({ timeout: 5_000 });
	});

	test('18_3_010_006 — Tổng tiền cần thanh toán trừ cả coupon', async ({ page }) => {
		chanNeuTat('18_3_010_006');
		// Mã từ đợt coupon tiền đề 18_2 (`18_2/test-output/coupon.lane<N>.json`); lấy mã cuối để không đụng mã các case 18_2.
		let so18;
		try { so18 = JSON.parse(require('node:fs').readFileSync(path.join(GOC, '..', '18_2_khach_hang_va_uu_dai', 'test-output', `coupon.lane${process.env.VNPOST_LANE || 'x'}.json`), 'utf8')); } catch { /* */ }
		test.skip(!so18?.codes?.length, 'Chưa có đợt coupon (chạy tiền đề 18_2 `tien de coupon`)');
		const ma = so18.codes.filter((c) => !(so18.daDung || []).includes(c)).slice(-1)[0];
		await p.them(page, sp().tc);
		const truoc = await p.tongKet(page);
		await page.getByPlaceholder(/Quét mã vạch hoặc nhập mã/).fill(ma);
		await page.getByRole('button', { name: 'Áp dụng' }).click();
		await page.waitForTimeout(1_500);
		const sau = await p.tongKet(page);
		const m = await moTT(page);
		const can = await giaTri(m, 'Tổng tiền cần thanh toán');
		// Chỉ input nằm TRONG dòng của nhãn (cha gần nhất chứa cả số tiền) — 🚫 following::input bắt nhầm ô "Tiền khách đưa".
		const o = m.getByText('Tổng tiền cần thanh toán').first().locator('xpath=ancestor::*[.//*[contains(text(),"đ")] or .//input][1]//input');
		const suaDuoc = (await o.count()) ? !(await o.isDisabled()) && (await o.getAttribute('readonly')) === null : false;
		test.info().annotations.push({ type: 'đo', description: `${ma} · tổng hàng ${truoc.sauVat} · cần TT trước coupon ${truoc.canThanhToan} · sau ${sau.canThanhToan} · modal ${can} · ô sửa được: ${suaDuoc}` });
		expect(sau.canThanhToan, 'Coupon không trừ vào đơn').toBe(truoc.canThanhToan - 5000);
		expect(can).toBe(sau.canThanhToan);
		expect(suaDuoc, 'Ô "Tổng tiền cần thanh toán" sửa được').toBe(false);
	});
});
