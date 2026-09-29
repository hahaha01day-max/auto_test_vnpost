'use strict';

/**
 * 20_060_* · Đổi điểm — luật BE qua `POST /loyalty/redeem-campaign/calculate-loyalty-amount`
 * (`RedeemCampaignService.calculateLoyaltyAmountRes`: không hoạt động → chưa bắt đầu → đã kết thúc → ngoài phạm vi →
 * `totalAmount >= orderAmountConditional && điểm khách >= usePoint` ⇒ `loyaltyAmount = min(usePoint × tỷ lệ, totalAmount)`,
 * ngược lại "Điều kiện không hợp lệ để sử dụng điểm thưởng"). 🚫 Không OTP ở nhóm này.
 * 20_050_009 · Thanh toán bằng điểm thật ở POS (OTP dev mặc định 888888 — user chốt 25/09/2026). 🔴 SMS OTP gửi THẬT ⇒
 * chỉ dùng MỘT khách mang SĐT tài khoản CHT của làn (🚫 SĐT ngẫu nhiên).
 * 🔴 Cấu hình đổi/tích điểm của TOÀN CHUỖI: sửa tạm + `khoiPhuc` ở `finally`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const seed = require('../../00_seed/seed-state');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');
const c = require('./cau-hinh-loyalty');
const { boKm } = require('./pos-km');

const GOC = path.join(__dirname, '..');
const OTP = '888888';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const dd = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const cong = (n) => new Date(Date.now() + n * 86_400_000);
const du = () => seed.doc().duLieu;

const fs = require('node:fs');
const { boKm: _bk } = require('./pos-km');
const SO = path.join(GOC, 'test-output', `khach-diem.lane${g.LAN}.json`);

/**
 * Khách CÓ ĐIỂM dùng chung cho 060_* — SĐT tài khoản CHT của làn (🔴 SMS OTP gửi thật, 🚫 SĐT ngẫu nhiên).
 * Chưa có (hoặc hết điểm) ⇒ tạo + bán tiền mặt 3 × SP_TC với tích điểm 1.000đ/điểm ⇒ ~300 điểm. Sổ file (worker restart).
 */
async function khachDiem(page, tct, st) {
	const diemDb = (id) => Number(g.selectDb(`SELECT point FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY WHERE chain_customer_id=${Number(id)}`)[0]?.[0] || 0);
	let kh = fs.existsSync(SO) ? JSON.parse(fs.readFileSync(SO, 'utf8')) : null;
	if (kh && diemDb(kh.id) >= 200) return { ...kh, diem: diemDb(kh.id) };
	const goc = await c.chup(tct.page, tct.st);
	const sdt = du().nhanSu?.soDienThoai;
	test.skip(!sdt, 'Sổ seed không có SĐT tài khoản CHT của làn — 🚫 không dùng SĐT ngẫu nhiên nhận OTP.');
	kh = kh ?? (await g.taoKhachApi(page, st, { ...g.khachMoi('060 KHACH DIEM'), sdt: String(sdt).replace(/^84/, '0') }));
	fs.mkdirSync(path.dirname(SO), { recursive: true });
	fs.writeFileSync(SO, JSON.stringify({ id: kh.id, ma: kh.ma, ten: kh.ten }, null, 2));
	await c.suaTich(tct.page, tct.st, { ...c.phamViCoLan(goc.tich, du().toChuc.maTinh, du().diemBan.maShop), orderAmountConditional: 0, orderAmountPerPoint: 1_000 });
	try {
		await p.chonKhach(page, kh.ten);
		for (let i = 0; i < 3; i += 1) await p.them(page, p.sp().tc);
		await _bk(page);
		const kq = await p.thanhToanTienMat(page);
		expect(kq.orderId, 'Đơn tích điểm tiền đề lỗi').toBeTruthy();
		let d = 0;
		for (let i = 0; i < 18 && d < 200; i += 1) {
			await page.waitForTimeout(5_000);
			d = diemDb(kh.id);
		}
		expect(d, 'Khách tiền đề không được tích điểm').toBeGreaterThanOrEqual(200);
		return { ...kh, diem: d };
	} finally {
		await c.khoiPhuc(tct.page, tct.st);
		await p.moBan(page, test);
	}
}

/**
 * Mở modal thanh toán, chọn "Thanh toán bằng điểm", nhập `diem`. `xacNhan` ⇒ bấm Xác nhận, OTP 888888 nếu hỏi.
 * Trả { modal, tb, otp, coOtp, huy }.
 */
async function thuDiem(page, diem, { xacNhan = true } = {}) {
	await page.mouse.move(600, 700);
	await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
	const m = page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last();
	await expect(m).toBeVisible({ timeout: 20_000 });
	await page.waitForTimeout(2_000); // modal nạp cấu hình đổi điểm bất đồng bộ
	const nut = m.getByRole('button', { name: /Thanh toán bằng điểm/ }).first();
	const coNut = (await nut.count()) > 0;
	const nutKhoa = coNut ? await nut.isDisabled().catch(() => null) : null;
	const kq = { coNut, nutKhoa, tb: '', coOtp: false };
	const oDiem = m.getByText(/Số điểm sử dụng/).locator('xpath=following::input[1]');
	// 🔴 Bấm sớm lúc modal còn nạp thì không chuyển phương thức ⇒ bấm lại tới khi ô "Số điểm sử dụng" hiện.
	for (let lan = 0; coNut && lan < 3 && !(await oDiem.isVisible().catch(() => false)); lan += 1) {
		await nut.click().catch(() => null);
		await oDiem.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => null);
	}
	if (await oDiem.isVisible().catch(() => false)) {
		await oDiem.fill(String(diem));
		await oDiem.press('Tab');
		await page.waitForTimeout(1_000);
		kq.oDiem = await oDiem.inputValue();
	}
	kq.modal = p.chuan(await m.innerText());
	if (xacNhan) {
		const tb = page.locator('.ant-message-notice, .ant-notification-notice');
		await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
		const otp = page.getByRole('dialog').filter({ hasText: 'Xác thực OTP thanh toán điểm' });
		kq.coOtp = await otp.waitFor({ state: 'visible', timeout: 12_000 }).then(() => true, () => false);
		kq.tb = p.chuan((await tb.allInnerTexts()).join(' | '));
		if (kq.coOtp) {
			await otp.locator('input').first().fill(OTP);
			await otp.getByRole('button', { name: /Xác nhận|Xác thực/ }).last().click();
			// Toast tắt nhanh ⇒ gom liên tục 9s.
			const gom = new Set();
			for (let i = 0; i < 30; i += 1) {
				for (const t of await tb.allInnerTexts().catch(() => [])) gom.add(p.chuan(t));
				await page.waitForTimeout(300);
			}
			kq.tbSauOtp = [...gom].filter(Boolean).join(' | ');
		}
	}
	if (await m.isVisible().catch(() => false)) await m.getByRole('button', { name: /Hu[ỷy]/ }).last().click().catch(() => null);
	await page.waitForTimeout(800);
	return kq;
}

test.describe('20_060 · Đổi điểm ở POS (sửa tạm cấu hình đổi điểm, OTP 888888)', () => {
	test.describe.configure({ timeout: 480_000 });
	let tct;
	test.beforeEach(async ({ browser }) => {
		tct = await g.k.moPhienPhu(browser, 'tct', '/care/loyalty');
		await c.chup(tct.page, tct.st);
	});
	test.afterEach(async () => {
		ghiChu('khôi phục', JSON.stringify(await c.khoiPhuc(tct.page, tct.st)));
		await tct.dong();
	});

	/** Dựng: khách có điểm, giỏ `sl` × SP_TC (bỏ CTKM), cấu hình đổi điểm tạm. */
	async function dung(page, sl, cfgDoi, { phamVi = true } = {}) {
		const st = await p.moBan(page, test);
		const kh = await khachDiem(page, tct, st);
		const goc = await c.chup(tct.page, tct.st);
		const pv = phamVi ? c.phamViCoLan(goc.doi, du().toChuc.maTinh, du().diemBan.maShop) : {};
		await c.suaDoi(tct.page, tct.st, { ...pv, active: true, orderAmountConditional: 0, orderAmountPerPoint: 1_000, startTime: dd(cong(-1)), endTime: null, ...cfgDoi });
		await p.moBan(page, test); // nạp lại cấu hình đổi điểm cho POS
		await p.chonKhach(page, kh.ten);
		for (let i = 0; i < sl; i += 1) await p.them(page, p.sp().tc);
		await _bk(page);
		const truoc = Number(g.selectDb(`SELECT point FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY WHERE chain_customer_id=${Number(kh.id)}`)[0]?.[0] || 0);
		const redeem0 = Number(g.selectDb(`SELECT COUNT(*) FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY_HISTORY WHERE chain_customer_id=${Number(kh.id)} AND point_action='REDEEM'`)[0]?.[0] || 0);
		ghiChu('dựng', `khách ${kh.ma} có ${truoc} điểm (${redeem0} lần đổi) · giỏ ${sl} × 100k · đổi điểm ${JSON.stringify(cfgDoi)}`);
		return { kh, truoc, redeem0 };
	}
	const diemSau = (kh) => Number(g.selectDb(`SELECT point FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY WHERE chain_customer_id=${Number(kh.id)}`)[0]?.[0] || 0);
	// 🔴 Đo bằng SỐ DÒNG REDEEM, 🚫 số dư: BE cộng lại điểm trên phần trả bằng điểm (EARN cùng giây) ⇒ số dư có thể không đổi dù đã đổi điểm.
	const soRedeem = (kh) => Number(g.selectDb(`SELECT COUNT(*) FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY_HISTORY WHERE chain_customer_id=${Number(kh.id)} AND point_action='REDEEM'`)[0]?.[0] || 0);

	/** Kiểm case CHẶN: không bị trừ điểm; có thông báo (FE hoặc sau OTP). */
	async function phaiChan(page, r, kq, mong) {
		await page.waitForTimeout(8_000);
		const sau = diemSau(r.kh);
		const rd = soRedeem(r.kh);
		const chu = [kq.tb, kq.tbSauOtp].filter(Boolean).join(' | ');
		ghiChu('đo', JSON.stringify({ ...kq, modal: kq.modal?.slice(0, 250), diem: `${r.truoc} → ${sau}`, redeem: `${r.redeem0} → ${rd}` }));
		expect(rd, `🔴 KHÔNG bị chặn: đã ĐỔI điểm (dòng REDEEM ${r.redeem0} → ${rd}; số điểm nhập ${kq.oDiem})`).toBe(r.redeem0);
		if (!kq.coNut) {
			// FE ẨN hẳn phương thức "Thanh toán bằng điểm" (chặn im lặng) — lệch kỳ vọng câu lỗi API, ghi báo cáo.
			ghiChu('cách chặn', `FE ẩn phương thức "Thanh toán bằng điểm" — không có thông báo${mong ? ` "${mong}"` : ''}`);
			return;
		}
		expect(chu, 'Bị chặn mà không có thông báo lý do').not.toBe('');
		if (mong) expect(chu).toContain(mong);
	}

	test('20_060_001 — Đơn dưới điều kiện tối thiểu không được dùng điểm', async ({ page }) => {
		chanNeuTat('20_060_001');
		const r = await dung(page, 1, { orderAmountConditional: 300_000 });
		await phaiChan(page, r, await thuDiem(page, 10), 'Điều kiện không hợp lệ để sử dụng điểm thưởng');
	});

	test('20_060_002 — Đơn đạt điều kiện tối thiểu được dùng điểm và giảm đúng tỷ lệ', async ({ page }) => {
		chanNeuTat('20_060_002');
		await dung(page, 4, { orderAmountConditional: 300_000 });
		const kq = await thuDiem(page, 50, { xacNhan: false });
		ghiChu('modal', kq.modal.slice(0, 400));
		expect(kq.modal, 'Số tiền quy đổi ≠ 50 × 1.000').toMatch(/50[.,]000\s*đ/);
		expect(kq.modal, 'Tiền phải trả ≠ 350.000').toMatch(/Tổng tiền cần thanh toán\s*350[.,]000/);
	});

	test('20_060_003 — Khách không đủ điểm vẫn cố dùng điểm', async ({ page }) => {
		chanNeuTat('20_060_003');
		const r = await dung(page, 4, {});
		await phaiChan(page, r, await thuDiem(page, r.truoc + 50));
	});

	test('20_060_004 — Số tiền đổi điểm lớn hơn giá trị đơn', async ({ page }) => {
		chanNeuTat('20_060_004');
		const r = await dung(page, 1, {});
		const kq = await thuDiem(page, r.truoc, { xacNhan: false });
		ghiChu('modal', `${kq.oDiem} điểm · ${kq.modal.slice(0, 400)}`);
		expect(Number(String(kq.oDiem).replace(/\D/g, '')), 'Ô điểm không bị kẹp theo giá trị đơn (100k / 1.000 = 100)').toBeLessThanOrEqual(100);
		expect(kq.modal).toMatch(/Tổng tiền cần thanh toán\s*0\s*đ/);
	});

	for (const [id, ten, cfg, mong] of [
		['20_060_005', 'Dùng điểm khi chương trình đổi điểm chưa tới ngày bắt đầu', { startTime: dd(cong(1)) }, 'Chiến dịch chưa bắt đầu'],
		['20_060_006', 'Dùng điểm khi chương trình đổi điểm đã kết thúc', { startTime: dd(cong(-10)), endTime: dd(cong(-1)) }, 'Chiến dịch đã kết thúc'],
		['20_060_007', 'Dùng điểm khi không có chương trình đổi điểm nào hoạt động', { active: false }, null],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			const r = await dung(page, 1, cfg);
			const kq = await thuDiem(page, 10);
			await phaiChan(page, r, kq, mong);
		});
	}

	test('20_060_008 — Dùng điểm ở điểm bán ngoài phạm vi áp dụng', async ({ page }) => {
		chanNeuTat('20_060_008');
		const r = await dung(page, 1, {}, { phamVi: false });
		await phaiChan(page, r, await thuDiem(page, 10), 'Cửa hàng không thuộc phạm vi áp dụng của chương trình đổi điểm');
	});
});

test.describe('20_050_009 · Thanh toán bằng điểm ở POS (OTP 888888)', () => {
	test('20_050_009 — Hóa đơn thanh toán bằng điểm thưởng khi bật loại trừ tương ứng', async ({ page, browser }) => {
		chanNeuTat('20_050_009');
		test.setTimeout(480_000);
		const tct = await g.k.moPhienPhu(browser, 'tct', '/care/loyalty');
		try {
			const goc = await c.chup(tct.page, tct.st);
			const pvT = c.phamViCoLan(goc.tich, du().toChuc.maTinh, du().diemBan.maShop);
			const pvD = c.phamViCoLan(goc.doi, du().toChuc.maTinh, du().diemBan.maShop);
			// SĐT DUY NHẤT được phép nhận SMS OTP: SĐT tài khoản CHT của làn (sổ seed).
			const sdt = du().nhanSu?.soDienThoai;
			test.skip(!sdt, 'Sổ seed không có SĐT tài khoản CHT của làn — 🚫 không dùng SĐT ngẫu nhiên nhận OTP.');
			const st = await p.moBan(page, test);
			const kh = await g.taoKhachApi(page, st, { ...g.khachMoi('050_009'), sdt: String(sdt).replace(/^84/, '0') });
			// B1: tích điểm (tiền mặt, bỏ CTKM allowPoint=false) để khách có điểm.
			await c.suaTich(tct.page, tct.st, { ...pvT, orderAmountConditional: 0, orderAmountPerPoint: 1_000, noPointForPointPaymentInvoice: true });
			// 1 điểm = 1.000đ ⇒ 100 điểm (đơn tiền mặt 100k) trả HẾT đơn thứ hai 100k — đơn phải HOÀN TẤT (status 2),
			// 🔴 trả một phần bằng điểm thì đơn còn mở (status 1) ⇒ "không cộng điểm" là PASS GIẢ.
			await c.suaDoi(tct.page, tct.st, { ...pvD, active: true, orderAmountConditional: 0, orderAmountPerPoint: 1_000 });
			await p.chonKhach(page, kh.ten);
			await p.them(page, p.sp().tc);
			ghiChu('CTKM', await boKm(page)); // CTKM có sẵn allowPoint=false ⇒ đơn 0 điểm
			const kq1 = await p.thanhToanTienMat(page);
			expect(kq1.orderId, 'Đơn tích điểm tiền đề lỗi').toBeTruthy();
			let diem1 = 0;
			for (let i = 0; i < 18 && !diem1; i += 1) {
				await page.waitForTimeout(5_000);
				diem1 = Number(g.selectDb(`SELECT point FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY WHERE chain_customer_id=${Number(kh.id)}`)[0]?.[0] || 0);
			}
			ghiChu('điểm sau đơn tiền mặt', diem1);
			test.skip(!diem1, 'Đơn tiền mặt không tích được điểm (CTKM allowPoint=false đang áp?) — không có điểm để thanh toán.');
			// B2: đơn mới thanh toán BẰNG ĐIỂM (toàn bộ điểm) + OTP 888888.
			await p.moBan(page, test);
			await p.chonKhach(page, kh.ten);
			await p.them(page, p.sp().tc);
			// 🔴 Bỏ CTKM allowPoint=false, nếu không đơn này 0 điểm vì CTKM ⇒ "không cộng điểm" PASS GIẢ.
			ghiChu('CTKM đơn 2', await boKm(page));
			await page.mouse.move(600, 700);
			await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
			const m = page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last();
			await expect(m).toBeVisible({ timeout: 20_000 });
			await m.getByRole('button', { name: /Đa phương thức|Thanh toán bằng điểm|Điểm/ }).first().click();
			await page.waitForTimeout(1_000);
			const oDiem = m.getByText(/Số điểm sử dụng/).locator('xpath=following::input[1]');
			await expect(oDiem, 'Không có ô "Số điểm sử dụng" trong modal thanh toán').toBeVisible({ timeout: 15_000 });
			await oDiem.fill(String(diem1));
			ghiChu('modal', p.chuan(await m.innerText()).slice(0, 400));
			await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
			const otp = page.getByRole('dialog').filter({ hasText: 'Xác thực OTP thanh toán điểm' });
			await expect(otp, 'Không hiện hộp OTP').toBeVisible({ timeout: 30_000 });
			await otp.locator('input').first().fill(OTP);
			await otp.getByRole('button', { name: /Xác nhận|Xác thực/ }).last().click();
			await page.waitForTimeout(8_000);
			const tb = p.chuan((await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts()).join(' | '));
			ghiChu('sau OTP', tb);
			let diem2 = diem1;
			for (let i = 0; i < 18; i += 1) {
				await page.waitForTimeout(5_000);
				diem2 = Number(g.selectDb(`SELECT point FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY WHERE chain_customer_id=${Number(kh.id)}`)[0]?.[0] || 0);
				if (diem2 !== diem1) break;
			}
			const don = g.selectDb(`SELECT order_id, status, paid_money, paid_loyalty_amount FROM VNPOST_POD_02.SHOP_ORDER WHERE customer_id=${Number(kh.id)} ORDER BY order_id`);
			ghiChu('đơn (POD_02)', JSON.stringify(don));
			expect(don.length, 'Không thấy đơn thanh toán bằng điểm').toBeGreaterThanOrEqual(2);
			expect(don[don.length - 1][1], `Đơn trả bằng điểm chưa hoàn tất (status ${don[don.length - 1][1]}) — kiểm "không cộng điểm" không có nghĩa`).toBe('2');
			const lichSu = g.selectDb(`SELECT point, point_action, business_type FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY_HISTORY WHERE chain_customer_id=${Number(kh.id)} ORDER BY id`);
			ghiChu('điểm', `${diem1} → ${diem2} · lịch sử ${JSON.stringify(lichSu)}`);
			expect(lichSu.some((d) => Number(d[0]) < 0), 'Không có dòng TRỪ điểm — thanh toán bằng điểm không thành').toBe(true);
			// Kỳ vọng nghiệp vụ: bật "Không tích điểm cho HĐ thanh toán bằng điểm" ⇒ đơn trả bằng điểm KHÔNG được cộng điểm.
			const cong2 = lichSu.filter((d) => Number(d[0]) > 0).length;
			expect(cong2, '🔴 HĐ thanh toán bằng điểm VẪN được cộng điểm dù đã bật loại trừ').toBe(1);
		} finally {
			ghiChu('khôi phục', JSON.stringify(await c.khoiPhuc(tct.page, tct.st)));
			await tct.dong();
		}
	});
});
