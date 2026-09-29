'use strict';

/**
 * 18_3_050_001 · Thanh toán bằng điểm + OTP ở POS — vai `gdv` (POS làn).
 *
 * Viết lại từ spec cũ `vnpost-loyalty.playwright.spec.js` (không khớp `testMatch`, chưa bao giờ chạy), theo luồng đã chạy
 * xanh ở `20_khach_hang_than_thiet/tests/doi-diem.gdv.spec.js` (20_050_009):
 * - OTP dev mặc định `888888` (user chốt 25/09/2026). 🔴 SMS OTP gửi THẬT ⇒ khách mang SĐT tài khoản CHT của làn (sổ seed),
 *   🚫 SĐT ngẫu nhiên.
 * - 🔴 Cấu hình tích/đổi điểm của TOÀN CHUỖI: sửa tạm (phạm vi = điểm bán làn) + `khoiPhuc` ở `finally`.
 * - Trả HẾT đơn bằng điểm (1 điểm = 1.000đ) ⇒ đơn phải HOÀN TẤT; trả một phần thì đơn còn mở và "Đã thanh toán" là PASS GIẢ.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const seed = require('../../00_seed/seed-state');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');
const c = require('../../20_khach_hang_than_thiet/tests/cau-hinh-loyalty');
const { boKm } = require('../../20_khach_hang_than_thiet/tests/pos-km');

const GOC = path.join(__dirname, '..');
const OTP = '888888';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const du = () => seed.doc().duLieu;
const diemDb = (id) => Number(g.selectDb(`SELECT point FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY WHERE chain_customer_id=${Number(id)}`)[0]?.[0] || 0);
/** Đơn của khách ở mọi pod trên server chính (khách là cấp chuỗi, đơn nằm ở pod của điểm bán). */
const donCua = (id) => ['VNPOST_POD_01', 'VNPOST_POD_02'].flatMap((db) =>
	g.selectDb(`SELECT order_id, status, paid_money, paid_loyalty_amount FROM ${db}.SHOP_ORDER WHERE customer_id=${Number(id)} ORDER BY order_id`));

test.describe('18_3_050 · Thanh toán bằng điểm ở POS (OTP 888888)', () => {
	test('18_3_050_001 — Thanh toán bằng điểm và xác thực OTP thành công', async ({ page, browser }) => {
		chanNeuTat('18_3_050_001');
		test.setTimeout(480_000);
		const sdt = du().nhanSu?.soDienThoai;
		test.skip(!sdt, 'Sổ seed không có SĐT tài khoản CHT của làn — 🚫 không dùng SĐT ngẫu nhiên nhận OTP.');
		const tct = await g.k.moPhienPhu(browser, 'tct', '/care/loyalty');
		try {
			const goc = await c.chup(tct.page, tct.st);
			const pvT = c.phamViCoLan(goc.tich, du().toChuc.maTinh, du().diemBan.maShop);
			const pvD = c.phamViCoLan(goc.doi, du().toChuc.maTinh, du().diemBan.maShop);
			const st = await p.moBan(page, test);
			const kh = await g.taoKhachApi(page, st, { ...g.khachMoi('18_3_050_001'), sdt: String(sdt).replace(/^84/, '0') });
			// Tiền đề: khách có điểm khả dụng > 0 — đơn tiền mặt tích 1 điểm / 1.000đ; chương trình đổi điểm đang bật.
			await c.suaTich(tct.page, tct.st, { ...pvT, orderAmountConditional: 0, orderAmountPerPoint: 1_000 });
			await c.suaDoi(tct.page, tct.st, { ...pvD, active: true, orderAmountConditional: 0, orderAmountPerPoint: 1_000 });
			await p.chonKhach(page, kh.ten);
			await p.them(page, p.sp().tc);
			ghiChu('CTKM đơn tiền đề', await boKm(page));
			const kq1 = await p.thanhToanTienMat(page);
			expect(kq1.orderId, 'Đơn tích điểm tiền đề lỗi').toBeTruthy();
			let diem1 = 0;
			for (let i = 0; i < 18 && !diem1; i += 1) {
				await page.waitForTimeout(5_000);
				diem1 = diemDb(kh.id);
			}
			expect(diem1, 'Tiền đề: khách không được tích điểm sau đơn tiền mặt').toBeGreaterThan(0);

			// Đơn mới: B1 chọn Thanh toán bằng điểm · B2 nhập số điểm (trả hết đơn) · B3 xác nhận · B4 OTP đúng.
			await p.moBan(page, test);
			await p.chonKhach(page, kh.ten);
			await p.them(page, p.sp().tc);
			ghiChu('CTKM đơn điểm', await boKm(page));
			await page.mouse.move(600, 700);
			await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
			const m = page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last();
			await expect(m).toBeVisible({ timeout: 20_000 });
			await page.waitForTimeout(2_000); // modal nạp cấu hình đổi điểm bất đồng bộ
			const nut = m.getByRole('button', { name: /Thanh toán bằng điểm/ }).first();
			const oDiem = m.getByText(/Số điểm sử dụng/).locator('xpath=following::input[1]');
			// 🔴 Bấm sớm lúc modal còn nạp thì không chuyển phương thức ⇒ bấm lại tới khi ô "Số điểm sử dụng" hiện.
			for (let lan = 0; lan < 3 && !(await oDiem.isVisible().catch(() => false)); lan += 1) {
				await nut.click().catch(() => null);
				await oDiem.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => null);
			}
			await expect(oDiem, 'Không có ô "Số điểm sử dụng" trong modal thanh toán').toBeVisible({ timeout: 15_000 });
			await oDiem.fill(String(diem1));
			await oDiem.press('Tab');
			await page.waitForTimeout(1_000);
			ghiChu('modal', p.chuan(await m.innerText()).slice(0, 400));
			await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
			const otp = page.getByRole('dialog').filter({ hasText: 'Xác thực OTP thanh toán điểm' });
			await expect(otp, 'Không hiện hộp OTP').toBeVisible({ timeout: 30_000 });
			await otp.locator('input').first().fill(OTP);
			await otp.getByRole('button', { name: /Xác nhận|Xác thực/ }).last().click();
			const gom = new Set();
			for (let i = 0; i < 30; i += 1) {
				for (const t of await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts().catch(() => [])) gom.add(p.chuan(t));
				await page.waitForTimeout(300);
			}
			ghiChu('thông báo sau OTP', [...gom].filter(Boolean).join(' | '));

			let diem2 = diem1;
			for (let i = 0; i < 18 && diem2 === diem1; i += 1) {
				await page.waitForTimeout(5_000);
				diem2 = diemDb(kh.id);
			}
			const don = donCua(kh.id);
			const lichSu = g.selectDb(`SELECT point, point_action, business_type FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY_HISTORY WHERE chain_customer_id=${Number(kh.id)} ORDER BY id`);
			ghiChu('đo', `điểm ${diem1} → ${diem2} · đơn ${JSON.stringify(don)} · lịch sử ${JSON.stringify(lichSu)}`);
			expect(don.length, 'Không thấy đơn thanh toán bằng điểm').toBeGreaterThanOrEqual(2);
			const cuoi = don[don.length - 1];
			// "Đã thanh toán" = SHOP_ORDER.status 2 (hoàn tất), như 20_050_009.
			expect(cuoi[1], `Đơn trả bằng điểm chưa ở trạng thái Đã thanh toán (status ${cuoi[1]})`).toBe('2');
			expect(Number(cuoi[3]), 'Đơn không ghi nhận số tiền trả bằng điểm').toBeGreaterThan(0);
			// Đơn điểm có thể được tích thêm điểm (loại trừ đang tắt) ⇒ đo phần TRỪ trong lịch sử, không lấy hiệu diem1 − diem2.
			const tru = lichSu.filter((d) => Number(d[0]) < 0).reduce((s, d) => s + Number(d[0]), 0);
			expect(-tru, 'Điểm khả dụng không giảm đúng số điểm đã dùng').toBe(diem1);
		} finally {
			ghiChu('khôi phục', JSON.stringify(await c.khoiPhuc(tct.page, tct.st)));
			await tct.dong();
		}
	});
});
