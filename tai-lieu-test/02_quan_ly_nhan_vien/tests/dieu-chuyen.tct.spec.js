'use strict';

/**
 * 02_030_006 — Điều chuyển nhân viên sang đơn vị mới (vai `tct`) — GHI THẬT (28/09/2026).
 *
 * Tiền đề (tầng "riêng phân hệ, dùng lại được"): MỘT nhân viên CÓ TÀI KHOẢN của làn, mã `AUTO<làn>_DC<runId>`, vai
 * "Giao dịch viên", ghi sổ `test-output/nv-dieu-chuyen.lane<N>.json`. Lượt đầu tạo qua drawer Thêm nhân viên (khuôn
 * `00_seed/tests/03-tai-khoan-lan.tct.spec.js`); lượt sau DÙNG LẠI và điều chuyển qua lại giữa hai điểm bán seed của làn
 * (điểm bán chính ↔ `diemBanNhan`). 🚫 Không xoá được nhân viên ⇒ mỗi làn chỉ đẻ đúng một người.
 * Mật khẩu: tài khoản mới nhận mật khẩu mặc định của hệ thống — đo 28/09 cả 15 tài khoản làn 8 cùng một mật khẩu, lấy
 * `VNPOST_PASSWORD_GDV` (🚫 không in ra log).
 *
 * Trace vnpost-web f9c5c858 `pages/employee/employeeWorkingBranch/TransferEmployeeDrawer.jsx`: drawer "Điều chuyển nhân viên",
 * "Đơn vị hiện tại" / "Vai trò hiện tại" là Input `disabled`; "Đơn vị chuyển đến" (OrganizationTreeSelect) + "Vai trò mới" (lọc
 * theo cấp đơn vị); nút "Điều chuyển" ⇒ `actionTransferEmployee` ⇒ "Điều chuyển nhân viên thành công".
 * Vế "nhân viên ở A không truy cập được nữa": đăng nhập bằng CHÍNH tài khoản đó, đọc danh sách phạm vi.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chonDonVi, chonOption, chuan, dienDongVaiTro, moChiTiet, moDanhSach, moDrawerThem, moThe, themDongVaiTro, timKiem } = require('./employee-page');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const VAI_TRO = 'Giao dịch viên';
// 🔴 Nhãn trạng thái thật ở thẻ Lịch sử làm việc là "Đang hoạt động" (đo 28/09) — kịch bản QC ghi "Đang làm" / "Đã nghỉ".
const DANG = /Đang làm|Đang hoạt động/;
/** Tên đơn vị của một dòng phân công ("<STT> <mã> - <tên> …"). */
const donViDong = (x) => x.match(/^\d+\s+\S+\s+-\s+(\S+)/)?.[1];
const NGHI = /Đã nghỉ|Ngừng hoạt động|Không hoạt động|Đã điều chuyển/;
const SO = path.join(GOC, 'test-output', `nv-dieu-chuyen.lane${process.env.VNPOST_LANE || 0}.json`);
const BASE = () => process.env.VNPOST_BASE_URL;

const doc = () => (fs.existsSync(SO) ? JSON.parse(fs.readFileSync(SO, 'utf8')) : null);
const ghiSo = (x) => { fs.mkdirSync(path.dirname(SO), { recursive: true }); fs.writeFileSync(SO, JSON.stringify(x, null, 1)); };
const haiDiemBan = () => {
	const d = seed.doc().duLieu;
	return [d.diemBan.tenShop, d.diemBanNhan.tenShop];
};
const shopIdCua = (ten) => {
	const d = seed.doc().duLieu;
	return String(ten === d.diemBan.tenShop ? d.diemBan.shopId : d.diemBanNhan.shopId);
};

/**
 * Đăng nhập bằng tài khoản động trong context mới. Trả tên đơn vị có trên màn chọn phạm vi (`co`) + các `shopid` app gửi
 * trong header API sau khi vào (`shopIds`) — tài khoản MỘT phạm vi được app vào thẳng, màn GDV không in tên điểm bán (đo 28/09).
 */
async function phamViDangNhap(browser, tenDangNhap, ten) {
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	const shopIds = new Set();
	page.on('request', (r) => { const h = r.headers(); if (r.url().includes('/__api/') && h.shopid) shopIds.add(String(h.shopid)); });
	try {
		await page.goto(`${BASE()}/`, { waitUntil: 'domcontentloaded' });
		const u = page.getByRole('textbox', { name: /tên đăng nhập|username/i });
		await expect(u).toBeVisible({ timeout: 25_000 });
		await u.fill(tenDangNhap);
		await page.getByRole('textbox', { name: /mật khẩu|password/i }).fill(process.env.VNPOST_PASSWORD_GDV);
		await page.getByRole('button', { name: /tiếp tục|đăng nhập|login|sign in/i }).and(page.locator('button[type="submit"]')).click();
		await Promise.race([
			page.getByText(/Truy cập trang quản lý|Truy cập điểm bán/).first().waitFor({ state: 'visible', timeout: 25_000 }),
			page.waitForURL((x) => x.pathname !== '/' && !/\/login|\/account/.test(x.pathname), { timeout: 25_000 }),
		]).catch(() => null);
		await page.waitForTimeout(3_000);
		const loi = (await page.locator('.ant-message-notice, .ant-form-item-explain-error, .ant-alert-error').allInnerTexts()).map(chuan).filter(Boolean);
		const co = {};
		for (const t of ten) co[t] = await page.getByText(t, { exact: true }).count();
		return { url: new URL(page.url()).pathname, co, shopIds: [...shopIds], loi };
	} finally { await ctx.close(); }
}

test.describe('02 · 030 — Điều chuyển nhân viên', () => {
	test.describe.configure({ timeout: 300_000 });

	test('tien de 02 nv dieu chuyen — nhân viên có tài khoản của làn', async ({ page }) => {
		if (doc()) return;
		const [A] = haiDiemBan();
		const id = seed.runId();
		const maNv = `${seed.PREFIX_MA}DC${id}`;
		const tenDangNhap = maNv.toLowerCase();
		const sdt = `08${String(id).padStart(8, '0').slice(-8)}`;
		await moDanhSach(page, VAI);
		const dr = await moDrawerThem(page);
		await dr.locator('#employeeCode').fill(maNv);
		await dr.locator('#username').fill(tenDangNhap);
		await dr.locator('#name').fill(`${seed.PREFIX}DC_${id}`);
		await dr.locator('#phone').fill(sdt);
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: A, vaiTro: VAI_TRO, dong: 0 });
		const cho = page.waitForResponse((r) => r.url().includes('chain-employment-profile') && r.request().method() === 'POST', { timeout: 30_000 });
		await dr.getByRole('button', { name: 'Lưu' }).click();
		const b = await (await cho).json();
		expect(String(b?.status?.code), `Tạo nhân viên điều chuyển lỗi: ${b?.status?.message}`).toBe('200');
		ghiSo({ maNv, tenDangNhap, donVi: A, taoLuc: new Date().toISOString() });
		await timKiem(page, maNv);
	});

	test('02_030_006 — Điều chuyển nhân viên sang đơn vị mới', async ({ page, browser }) => {
		const ly = skipReason(loadCaseInput(GOC, '02_030_006'));
		test.skip(Boolean(ly), ly ?? '');
		const so = doc();
		test.skip(!so, 'Chưa dựng tiền đề — chạy test "tien de 02 nv dieu chuyen" trước');
		const [A0, B0] = haiDiemBan();
		const tu = so.donVi;
		const den = tu === A0 ? B0 : A0;

		const truoc = await phamViDangNhap(browser, so.tenDangNhap, [tu, den]);
		test.info().annotations.push({ type: 'đăng nhập TRƯỚC', description: `${so.tenDangNhap}: ${JSON.stringify(truoc)}` });
		const thay = (x, t) => x.co[t] > 0 || x.shopIds.includes(shopIdCua(t));
		expect(thay(truoc, tu), `Trước điều chuyển tài khoản không vào được đơn vị "${tu}" (${JSON.stringify(truoc)})`).toBe(true);

		await moDanhSach(page, VAI);
		expect(await moChiTiet(page, so.maNv), `Không tìm thấy nhân viên ${so.maNv}`).toBeTruthy();
		let pane = await moThe(page, 'Lịch sử làm việc');
		// 🔴 Chọn dòng theo innerText cột đơn vị, 🚫 `filter({ hasText })`: textContent dính liền các thẻ ("AUTO8_SHOPDIEM BAN") và
		//    "AUTO8_SHOP" là chuỗi con của "AUTO8_SHOP_55976508".
		const hang = pane.locator('tr.ant-table-row');
		await expect(hang.first()).toBeVisible({ timeout: 20_000 });
		let dongTu = null;
		for (let i = 0; i < (await hang.count()); i += 1) {
			const t = chuan(await hang.nth(i).innerText());
			if (donViDong(t) === tu && DANG.test(t)) { dongTu = hang.nth(i); break; }
		}
		expect(dongTu, `Không có phân công đang hoạt động ở "${tu}"`).toBeTruthy();
		await dongTu.getByRole('button', { name: 'Điều chuyển' }).click();
		const dr = page.locator('.ant-drawer-open').last();
		await expect(dr.locator('.ant-drawer-title')).toHaveText('Điều chuyển nhân viên', { timeout: 20_000 });

		const oHienTai = dr.locator('.ant-form-item').filter({ hasText: 'Đơn vị hiện tại' }).locator('input');
		const oVaiTro = dr.locator('.ant-form-item').filter({ hasText: 'Vai trò hiện tại' }).locator('input');
		await expect(oHienTai, 'Ô "Đơn vị hiện tại" sửa được').toBeDisabled();
		await expect(oVaiTro, 'Ô "Vai trò hiện tại" sửa được').toBeDisabled();
		const hienTai = [await oHienTai.inputValue(), await oVaiTro.inputValue()];
		expect(hienTai[0]).toContain(tu);
		expect(hienTai[1]).toBe(VAI_TRO);

		await chonDonVi(page, dr.locator('.ant-form-item').filter({ hasText: 'Đơn vị chuyển đến' }).locator('.ant-select').first(), den);
		await chonOption(page, dr.locator('.ant-form-item').filter({ hasText: 'Vai trò mới' }).locator('.ant-select').first(), VAI_TRO);
		const choGhi = page.waitForResponse((r) => r.request().method() !== 'GET' && /transfer/i.test(r.url()), { timeout: 30_000 });
		await dr.getByRole('button', { name: 'Điều chuyển', exact: true }).click();
		const res = await choGhi;
		const b = await res.json().catch(() => null);
		const tb = page.locator('.ant-message-notice');
		await tb.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null);
		const thongBao = chuan((await tb.allInnerTexts()).join(' | '));
		if (String(b?.status?.code) === '200') ghiSo({ ...so, donVi: den, dieuChuyenLuc: new Date().toISOString() });
		expect(String(b?.status?.code), `Điều chuyển lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
		expect(thongBao).toContain('Điều chuyển nhân viên thành công');

		await page.reload({ waitUntil: 'domcontentloaded' });
		await page.locator('.ant-tabs-tab').first().waitFor({ state: 'visible', timeout: 30_000 });
		pane = await moThe(page, 'Lịch sử làm việc');
		await expect(pane.locator('tr.ant-table-row').filter({ hasText: den }).first()).toBeVisible({ timeout: 20_000 });
		const dong = (await pane.locator('tr.ant-table-row').allInnerTexts()).map(chuan);
		const sau = await phamViDangNhap(browser, so.tenDangNhap, [tu, den]);
		test.info().annotations.push({ type: 'đo', description: `${so.maNv}: "${tu}" → "${den}" · ô hiện tại ${JSON.stringify(hienTai)} (disabled) · "${thongBao}" · phân công sau: ${JSON.stringify(dong)} · đăng nhập SAU: ${JSON.stringify(sau)}` });
		// 🔴 Lọc theo CỘT đơn vị ("<STT> <mã> - <tên> …"), 🚫 `includes`: "AUTO8_SHOP" là chuỗi con của "AUTO8_SHOP_55976508", và dòng cũ
		//    còn mang tên đơn vị mới ở cột "Điều chuyển đến".
		const dTu = dong.filter((x) => donViDong(x) === tu);
		const dDen = dong.filter((x) => donViDong(x) === den);
		expect(dTu.some((x) => NGHI.test(x)), `Phân công ở "${tu}" không chuyển sang trạng thái nghỉ: ${JSON.stringify(dTu)}`).toBe(true);
		expect(dTu.some((x) => DANG.test(x)), `Vẫn còn phân công đang hoạt động ở "${tu}"`).toBe(false);
		expect(dDen.some((x) => x.includes(VAI_TRO) && DANG.test(x)), `Không có phân công mới "${den}" – ${VAI_TRO} đang hoạt động`).toBe(true);
		expect(thay(sau, tu), `🔴 Sau điều chuyển tài khoản VẪN vào được đơn vị cũ "${tu}" (${JSON.stringify(sau)})`).toBe(false);
		expect(thay(sau, den), `Sau điều chuyển tài khoản không vào được đơn vị mới "${den}" (${JSON.stringify(sau)})`).toBe(true);
	});
});
