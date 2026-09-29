'use strict';

/**
 * 18_4 — Quản lý đơn hàng (vai `gdv`, điểm bán seed làn).
 *
 * Trace/đo 25/09/2026 (vnpost-web 8ac2c516): `OrderListPage.jsx` (`GET /orders/shops/{shop}/v1.3`
 * page/size/keyword/orderBy/startTime/endTime/status, status ALL = -1) · `filter/OrderFilters.jsx`
 * (ô "Tìm kiếm mã đơn hàng, số điện thoại khách hàng"; Select trạng thái 8 lựa chọn; Select
 * "Trạng thái hoá đơn"; Select "Trạng thái tạm nộp") · `OrderStatistics` (Doanh thu · Đơn nháp ·
 * Đã thanh toán · Chênh lệch tổng tiền · Còn nợ) · chi tiết `/order/created-orders/detail/:orderId/:shopId`
 * (nút Cập nhật · In nhiệt · Xóa (nháp) · Cập nhật thanh toán · Kiểm tra giao dịch; khối Thông tin
 * chung, Lịch sử thanh toán, Nhật ký giao dịch, Sản phẩm đơn gốc).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, sp, so } = p;
const BASE = () => process.env.VNPOST_BASE_URL;
const ROUTE = '/order/created-orders';

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const khung = (page) => page.locator('.ant-pro-page-container').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const oTim = (page) => khung(page).getByPlaceholder('Tìm kiếm mã đơn hàng, số điện thoại khách hàng');
const choDs = (page) => page.waitForResponse((r) => /\/orders\/shops\/\d+\/v1\.3/.test(r.url()) && r.status() === 200, { timeout: 30_000 });

async function moDs(page) {
	const st = p.k.batHeader(page);
	const cho = choDs(page);
	await p.moTrang(page, `${BASE()}${ROUTE}`, p.VAI);
	const res = await cho;
	await page.waitForTimeout(800);
	return { st, res };
}

async function tim(page, tu) {
	const cho = choDs(page).catch(() => null);
	await oTim(page).fill(tu);
	await oTim(page).press('Enter');
	const r = await cho;
	await page.waitForTimeout(800);
	return r;
}

/** Chọn giá trị Select (bộ lọc) theo nhãn / placeholder ban đầu. */
async function chonLoc(page, hienTai, nhan) {
	const cho = choDs(page).catch(() => null);
	await (hienTai === null ? khung(page).locator('.ant-select').first() : khung(page).locator('.ant-select').filter({ hasText: hienTai }).first()).click();
	await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${nhan}$`) }).first().click();
	const r = await cho.catch(() => null);
	await page.waitForTimeout(1_500);
	await page.waitForTimeout(800);
	return r;
}

const cot = async (page, ten) => {
	const ths = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
	return ths.indexOf(ten);
};
const oDong = async (page, i, ten) => chuan(await dong(page).nth(i).locator('td').nth(await cot(page, ten)).innerText());

/** Tạo nhanh 1 đơn qua POS: 'nhap' (F7) | 'no' (thanh toán sau, có khách) | 'tra' (tiền mặt). Trả orderId. */
async function taoDon(page, loai) {
	const st = await p.moBan(page, test);
	if (loai === 'no') {
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
	}
	await p.them(page, sp().tc);
	if (loai === 'nhap') {
		await page.mouse.move(600, 700);
		await page.evaluate(() => document.activeElement?.blur?.());
		await page.locator('body').click({ position: { x: 600, y: 650 } });
		const cho = page.waitForResponse((r) => /\/spa\/orders\/draft\/v2/.test(r.url()) && r.request().method() !== 'GET', { timeout: 30_000 });
		await page.keyboard.press('F7');
		const b = await (await cho).json();
		return b?.data?.orderId ?? b?.data?.id;
	}
	const r = await p.thanhToanTienMat(page, loai === 'no' ? { truocKhiXacNhan: (m) => m.getByRole('button', { name: 'Thanh toán sau', exact: true }).click() } : {});
	return r.orderId;
}

async function moCt(page, orderId, shopId) {
	// 🔴 Rời màn bán hàng ngay sau lưu nháp/thanh toán: app có lúc tự điều hướng sang /lich-ca-nhan/ca-lam-viec
	//    và cắt ngang page.goto ⇒ thử lại.
	for (let lan = 0; lan < 3; lan += 1) {
		await page.waitForTimeout(2_000);
		const ok = await p.moTrang(page, `${BASE()}${ROUTE}/detail/${orderId}/${shopId}`, p.VAI).then(() => true, () => false);
		if (ok && /\/detail\//.test(page.url())) break;
	}
	await expect(page.getByText('Chi tiết đơn hàng').first()).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(1_500);
	return chuan(await khung(page).innerText());
}
const giaTriCt = (t, nhan) => {
	const i = t.indexOf(nhan);
	const m = i < 0 ? null : t.slice(i + nhan.length, i + nhan.length + 30).match(/^\s*(-?[\d.]+)\s*đ/);
	return m ? so(m[1]) : null;
};

test.describe('18_4 — Danh sách đơn hàng', () => {
	test.describe.configure({ timeout: 240_000 });

	test('18_4_010_001 — Mở màn Quản lý đơn hàng hiển thị đủ thành phần', async ({ page }) => {
		chanNeuTat('18_4_010_001');
		await moDs(page);
		await expect(khung(page).getByText(/Danh sách đơn hàng \(\d+ đơn hàng\)/)).toBeVisible();
		await expect(khung(page).getByRole('button', { name: /Xuất excel/ })).toBeVisible();
		for (const t of ['Doanh thu', 'Đơn nháp', 'Đã thanh toán', 'Còn nợ']) await expect(khung(page).getByText(t, { exact: true }).first()).toBeVisible();
	});

	test('18_4_010_002 — Mặc định bộ lọc khi mở màn', async ({ page }) => {
		chanNeuTat('18_4_010_002');
		const { res } = await moDs(page);
		const u = new URL(res.url());
		expect(u.searchParams.get('status')).toBe('-1');
		const d0 = new Date(); d0.setHours(0, 0, 0, 0);
		expect(Number(u.searchParams.get('startTime'))).toBe(d0.getTime());
		await expect(khung(page).locator('.ant-select').filter({ hasText: 'Tất cả' }).first()).toBeVisible();
	});

	test('18_4_010_004 — Lọc theo từng trạng thái đơn', async ({ page }) => {
		chanNeuTat('18_4_010_004');
		await moDs(page);
		const kq = {};
		const hienTai = null; // Select trạng thái là Select ĐẦU TIÊN của khung lọc
		for (const [nhan, mau] of [['Đơn nháp', /Đơn nháp/], ['Đơn còn nợ', /./]]) {
			const r = await chonLoc(page, hienTai, nhan);
			expect(r, `Chọn "${nhan}" không gọi lại danh sách`).toBeTruthy();
			const n = await dong(page).count();
			const tt = [];
			for (let i = 0; i < n; i += 1) tt.push(await oDong(page, i, 'Trạng thái'));
			kq[nhan] = { status: r ? new URL(r.url()).searchParams.get('status') : '(không request mới)', n, tt: [...new Set(tt)] };
			if (nhan === 'Đơn nháp') expect(tt.every((x) => mau.test(x)), `Lọc "Đơn nháp" ra trạng thái khác: ${tt.join(', ')}`).toBe(true);
			if (nhan === 'Đơn còn nợ') {
				for (let i = 0; i < n; i += 1) expect(so(await oDong(page, i, 'Số tiền còn nợ')), 'Đơn còn nợ mà Số tiền còn nợ = 0').toBeGreaterThan(0);
			}
		}
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
	});

	test('18_4_010_005 — Tìm kiếm theo mã đơn khớp chính xác', async ({ page }) => {
		chanNeuTat('18_4_010_005');
		await moDs(page);
		const ma = await oDong(page, 0, 'Mã đơn');
		await tim(page, ma);
		await page.waitForTimeout(2_500);
		const moCtThang = /\/detail\//.test(page.url());
		test.info().annotations.push({ type: 'hành vi', description: `tìm ${ma}: ${moCtThang ? 'mở thẳng chi tiết' : `${await dong(page).count()} dòng`}` });
		if (!moCtThang) {
			await expect(dong(page)).toHaveCount(1);
			expect(await oDong(page, 0, 'Mã đơn')).toBe(ma);
		}
	});

	test('18_4_010_006 — Tìm kiếm theo số điện thoại khách', async ({ page }) => {
		chanNeuTat('18_4_010_006');
		// Khách "Anh Trần" 84923333477 không có đơn ở điểm bán seed ⇒ dùng khách của 1 đơn thanh toán sau mới tạo.
		await taoDon(page, 'no');
		const { st } = await moDs(page);
		const ds = (await p.k.goiApi(page, st, `/orders/shops/${st.h.shopid}/v1.3`, { page: 0, size: 5, status: -1, orderBy: 'createdDate' })).data;
		const x = ds.find((o) => o.customer?.customerPhone || o.customerPhone);
		expect(x, 'Không có đơn nào gắn khách có SĐT').toBeTruthy();
		const sdt = String(x.customer?.customerPhone || x.customerPhone);
		await tim(page, sdt);
		const n = await dong(page).count();
		expect(n).toBeGreaterThan(0);
		for (let i = 0; i < n; i += 1) expect(await oDong(page, i, 'Tên khách hàng')).toBe(chuan(x.customer?.customerName || x.customerName));
	});

	test('18_4_010_011 — Lọc theo khoảng thời gian', async ({ page }) => {
		chanNeuTat('18_4_010_011');
		await moDs(page);
		const n = await dong(page).count();
		expect(n, 'Hôm nay không có đơn nào để đối chiếu').toBeGreaterThan(0);
		const hom = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
		for (let i = 0; i < n; i += 1) expect(await oDong(page, i, 'Thời gian')).toContain(hom);
	});

	test('18_4_010_015 — Phân trang danh sách đơn', async ({ page }) => {
		chanNeuTat('18_4_010_015');
		const { res } = await moDs(page);
		const tong = (await res.json())?.page?.total_elements;
		test.skip(tong <= 10, `Hôm nay chỉ có ${tong} đơn — cần > 10.`);
		const t1 = (await dong(page).allInnerTexts()).map(chuan);
		expect(t1.length).toBe(10);
		const cho = choDs(page);
		await khung(page).locator('.ant-pagination-item-2').click();
		await cho;
		await page.waitForTimeout(800);
		const t2 = (await dong(page).allInnerTexts()).map(chuan);
		expect(t2.filter((t) => t1.includes(t))).toEqual([]);
	});

	test('18_4_010_017 — Bảng danh sách hiển thị đủ 15 cột', async ({ page }) => {
		chanNeuTat('18_4_010_017');
		await moDs(page);
		const ths = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);
		test.info().annotations.push({ type: 'cột', description: `${ths.length}: ${ths.join(' · ')}` });
		for (const c of ['STT', 'Mã đơn', 'Tên khách hàng', 'Thời gian', 'Trạng thái', 'TT.Thanh toán', 'TT. Hoá đơn', 'TT. CQT']) expect(ths).toContain(c);
		expect(ths.length, 'Bảng không đủ 15 cột').toBe(15);
	});

	test('18_4_010_019 — Đơn không gắn khách hiển thị Khách vãng lai', async ({ page }) => {
		chanNeuTat('18_4_010_019');
		const { st } = await moDs(page);
		const ds = (await p.k.goiApi(page, st, `/orders/shops/${st.h.shopid}/v1.3`, { page: 0, size: 10, status: -1, orderBy: 'createdDate' })).data;
		const i = ds.findIndex((o) => !(o.customer?.customerId || o.customerId));
		expect(i, 'Trang 1 không có đơn khách lẻ').toBeGreaterThanOrEqual(0);
		expect(await oDong(page, i, 'Tên khách hàng')).toBe('Khách vãng lai');
	});

	test('18_4_010_021 — Quay lại danh sách đơn hàng từ màn bán hàng', async ({ page }) => {
		chanNeuTat('18_4_010_021');
		await p.moBan(page, test);
		await moDs(page);
		await khung(page).getByRole('button', { name: 'Bán hàng' }).click();
		await expect(p.oTim(page)).toBeVisible({ timeout: 30_000 });
		await page.getByRole('button', { name: /Trở về/ }).click();
		await expect(page).toHaveURL(/\/order\/created-orders/, { timeout: 20_000 });
	});

	test('18_4_020_001 — Thẻ thống kê hiển thị đủ chỉ tiêu', async ({ page }) => {
		chanNeuTat('18_4_020_001');
		await moDs(page);
		for (const t of ['Doanh thu', 'Đơn nháp', 'Đã thanh toán', 'Chênh lệch tổng tiền', 'Còn nợ']) await expect(khung(page).getByText(t, { exact: true }).first(), `Thiếu thẻ "${t}"`).toBeVisible();
	});

	test('18_4_020_003 — Doanh thu bằng tổng tiền các đơn khớp bộ lọc', async ({ page }) => {
		chanNeuTat('18_4_020_003');
		const { st, res } = await moDs(page);
		const tong = (await res.json())?.page?.total_elements;
		const ds = [];
		for (let pg = 0; pg * 50 < tong; pg += 1) ds.push(...((await p.k.goiApi(page, st, `/orders/shops/${st.h.shopid}/v1.3`, { ...Object.fromEntries(new URL(res.url()).searchParams), page: pg, size: 50 })).data || []));
		const t = chuan(await khung(page).innerText());
		const dt = giaTriCt(t, 'Doanh thu');
		const sum = ds.filter((o) => o.status !== 0 && o.status !== -2).reduce((a, o) => a + Number(o.totalPrice ?? o.totalAmount ?? 0), 0);
		const sumAll = ds.reduce((a, o) => a + Number(o.totalPrice ?? o.totalAmount ?? 0), 0);
		test.info().annotations.push({ type: 'đo', description: `thẻ Doanh thu ${dt} · Σ đơn (bỏ nháp/huỷ) ${sum} · Σ tất cả ${sumAll} · ${ds.length} đơn` });
		expect([sum, sumAll], 'Thẻ Doanh thu không khớp tổng tiền đơn').toContain(dt);
	});
});

test.describe('18_4 — Chi tiết & thao tác đơn', () => {
	test.describe.configure({ timeout: 300_000 });

	test('18_4_030_001 — Mở chi tiết đơn từ mã đơn', async ({ page }) => {
		chanNeuTat('18_4_030_001');
		await moDs(page);
		await dong(page).first().locator('td').nth(await cot(page, 'Mã đơn')).locator('a, button, span').first().click();
		await expect(page).toHaveURL(/\/order\/created-orders\/detail\/\d+\/\d+/, { timeout: 20_000 });
		for (const k of ['Thông tin chung', 'Lịch sử thanh toán', 'Sản phẩm đơn gốc']) await expect(page.getByText(k, { exact: true }).first()).toBeVisible();
	});

	test('18_4_030_002 — Chi tiết đơn hiển thị đủ chỉ tiêu tiền', async ({ page }) => {
		chanNeuTat('18_4_030_002');
		const id = await taoDon(page, 'tra');
		const t = await moCt(page, id, require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId);
		const thieu = ['Tổng tiền', 'VAT', 'Chiết khấu', 'Tổng tiền cần thanh toán', 'Đã thanh toán', 'Doanh thu', 'Giá vốn', 'Lợi nhuận'].filter((n) => !t.includes(n));
		test.info().annotations.push({ type: 'thiếu', description: thieu.join(', ') || '(đủ)' });
		expect(thieu, 'Chi tiết đơn thiếu chỉ tiêu').toEqual([]);
	});

	test('18_4_030_004 — Đơn nháp hiển thị nhãn Giá vốn dự kiến', async ({ page }) => {
		chanNeuTat('18_4_030_004');
		const id = await taoDon(page, 'nhap');
		const t = await moCt(page, id, require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId);
		expect(t, 'Đơn nháp không có nhãn "Giá vốn dự kiến"').toContain('Giá vốn dự kiến');
	});

	test('18_4_030_006 — Ô Còn nợ chỉ hiện khi đơn còn nợ', async ({ page }) => {
		chanNeuTat('18_4_030_006');
		const shop = require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId;
		const a = await taoDon(page, 'tra');
		const tA = await moCt(page, a, shop);
		const b = await taoDon(page, 'no');
		const tB = await moCt(page, b, shop);
		test.info().annotations.push({ type: 'đo', description: `đã tất toán: Còn nợ ${giaTriCt(tA, 'Còn nợ')} · còn nợ: ${giaTriCt(tB, 'Còn nợ')}` });
		expect(tA.includes('Còn nợ'), 'Đơn đã tất toán vẫn hiện ô "Còn nợ"').toBe(false);
		expect(giaTriCt(tB, 'Còn nợ')).toBeGreaterThan(0);
	});

	test('18_4_030_007 — Lịch sử thanh toán hiển thị Trống khi chưa thu', async ({ page }) => {
		chanNeuTat('18_4_030_007');
		const id = await taoDon(page, 'nhap');
		const t = await moCt(page, id, require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId);
		const khoi = t.slice(t.indexOf('Lịch sử thanh toán'), t.indexOf('Sản phẩm đơn gốc'));
		test.info().annotations.push({ type: 'khối', description: khoi.slice(0, 200) });
		expect(khoi).toContain('Trống');
	});

	test('18_4_030_008 — Lịch sử thanh toán đủ cột', async ({ page }) => {
		chanNeuTat('18_4_030_008');
		const id = await taoDon(page, 'tra');
		const t = await moCt(page, id, require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId);
		const khoi = t.slice(t.indexOf('Lịch sử thanh toán'), t.indexOf('Sản phẩm đơn gốc'));
		for (const c of ['Thời gian', 'Phương thức', 'Tổng tiền', 'Trạng thái']) expect(khoi).toContain(c);
	});

	test('18_4_040_001 — Ghi nhận thêm tiền cho đơn còn nợ', async ({ page }) => {
		chanNeuTat('18_4_040_001');
		const shop = require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId;
		const id = await taoDon(page, 'no');
		const t0 = await moCt(page, id, shop);
		await page.getByRole('button', { name: 'Cập nhật thanh toán' }).click();
		const m = page.getByRole('dialog').last();
		await expect(m).toBeVisible({ timeout: 15_000 });
		test.info().annotations.push({ type: 'modal cập nhật thanh toán', description: chuan(await m.innerText()).slice(0, 400) });
		await m.getByRole('button', { name: 'Trả góp', exact: true }).click();
		await m.getByText('Nhập số tiền trả góp').first().locator('xpath=following::input[1]').fill('20000');
		await m.getByText('Nhập số tiền khách đưa').first().locator('xpath=following::input[1]').fill('20000').catch(() => null);
		await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
		const fr = page.frameLocator('iframe[src*="confirm-cash"]');
		if (await fr.getByText(/xác nhận giao dịch/i).waitFor({ timeout: 30_000 }).then(() => true, () => false)) {
			await fr.getByText('Xác nhận thanh toán', { exact: true }).click();
		}
		await page.waitForTimeout(5_000);
		const t1 = await moCt(page, id, shop);
		expect(giaTriCt(t1, 'Đã thanh toán')).toBe((giaTriCt(t0, 'Đã thanh toán') || 0) + 20000);
		expect(giaTriCt(t1, 'Còn nợ')).toBe(giaTriCt(t0, 'Còn nợ') - 20000);
	});

	test('18_4_040_002 — Nút Cập nhật thanh toán ẩn khi đơn đã tất toán', async ({ page }) => {
		chanNeuTat('18_4_040_002');
		const id = await taoDon(page, 'tra');
		await moCt(page, id, require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId);
		await expect(page.getByRole('button', { name: 'Cập nhật thanh toán' })).toHaveCount(0);
	});

	test('18_4_060_002 — Nút Cập nhật và Xoá chỉ hiện với đơn nháp', async ({ page }) => {
		chanNeuTat('18_4_060_002');
		const shop = require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId;
		const a = await taoDon(page, 'nhap');
		await moCt(page, a, shop);
		await expect(page.getByRole('button', { name: /^(close )?Xóa$/ })).toBeVisible();
		await expect(page.getByRole('button', { name: /^(edit )?Cập nhật$/ })).toBeVisible();
		const b = await taoDon(page, 'tra');
		await moCt(page, b, shop);
		await expect(page.getByRole('button', { name: /^(close )?Xóa$/ })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /^(edit )?Cập nhật$/ })).toHaveCount(0);
	});

	test('18_4_060_003 — Xoá đơn nháp', async ({ page }) => {
		chanNeuTat('18_4_060_003');
		const shop = require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId;
		const id = await taoDon(page, 'nhap');
		await moCt(page, id, shop);
		const st = p.k.batHeader(page);
		await page.getByRole('button', { name: /^(close )?Xóa$/ }).click();
		const hop = page.locator('.ant-modal-confirm, .ant-popover:visible').last();
		await hop.locator('.ant-btn-primary, .ant-btn-dangerous').last().click();
		await page.waitForTimeout(3_000);
		await p.moTrang(page, `${BASE()}${ROUTE}`, p.VAI);
		await page.waitForTimeout(2_000);
		expect(await p.donTrongDs(page, st, id), 'Đơn nháp đã xoá vẫn còn trong danh sách').toBeNull();
	});

	test('18_4_060_004 — Huỷ hộp thoại xác nhận xoá đơn nháp', async ({ page }) => {
		chanNeuTat('18_4_060_004');
		const shop = require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId;
		const id = await taoDon(page, 'nhap');
		await moCt(page, id, shop);
		const st = p.k.batHeader(page);
		await page.getByRole('button', { name: /^(close )?Xóa$/ }).click();
		const hop = page.locator('.ant-modal-confirm, .ant-popover:visible').last();
		await hop.locator('.ant-btn:not(.ant-btn-primary):not(.ant-btn-dangerous)').first().click();
		await page.waitForTimeout(1_000);
		await p.moTrang(page, `${BASE()}${ROUTE}`, p.VAI);
		await page.waitForTimeout(2_000);
		expect(await p.donTrongDs(page, st, id), 'Huỷ xoá mà đơn nháp mất').toBeTruthy();
	});

	test('18_4_050_002 — Chọn kiểu in qua mũi tên cạnh nút In nhiệt', async ({ page }) => {
		chanNeuTat('18_4_050_002');
		await p.chanIn(page);
		const id = await taoDon(page, 'tra');
		await moCt(page, id, require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId);
		await khung(page).getByRole('button', { name: 'In nhiệt' }).locator('xpath=following-sibling::button[1]').click();
		const dd = page.locator('.ant-dropdown:visible').last();
		await expect(dd).toBeVisible({ timeout: 8_000 });
		const t = (await dd.locator('.ant-dropdown-menu-item').allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'kiểu in', description: t.join(' · ') });
		expect(t.length).toBeGreaterThan(0);
	});
});
