'use strict';

/**
 * 24 · Thẻ "Công nợ với cửa hàng" + drawer chi tiết + nộp tiền — vai `province` (Quản lý tỉnh làn, PROVINCE_MANAGER).
 *
 * Tiền đề: `tien-de.shop.spec.js` (`VNPOST_TIEN_DE=1 … -g "tien de 24"`) ⇒ GDV làn nợ 2 khoản (30.000 ghi trước, 20.000 ghi sau),
 * CHT nợ 10.000 — nguồn EXPORT (phiếu xuất hàng hỏng thật). Sổ `test-output/tien-de.lane<làn>.json`.
 * Trace `features/employeeDebt/tabs/ShopDebtTab.jsx` (ô "Tìm tên/SĐT nhân viên" — chỉ Enter; ô trạng thái Tất cả/Chưa trả/Trả một phần/
 * Đã trả → `payStatus`; `GET /employee-debt?page&size=20&keyword&payStatus&shopId`) · `components/DrawerEmployeeDebtDetail.jsx`
 * (thẻ Tổng nợ/Đã trả/Còn lại, thẻ con "Công nợ chưa thanh toán" · "Lịch sử ghi nợ" · "Lịch sử thanh toán") ·
 * `components/DrawerPayEmployeeDebt.jsx` ("Thanh toán công nợ nhân viên", phân bổ cũ → mới, `POST /employee-debt/payment`).
 * 🔴 GHI THẬT ở 070_002 (nộp 35.000) và 070_008 (nộp 5.000) — trừ công nợ nhân viên rác; các case khác không ghi.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chonDiemBan, chuan, khung, moMan, moThe, thamSo } = require('./debt-page');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const SO = path.join(GOC, 'test-output', `tien-de.lane${g.LAN}.json`);
const API2 = /\/employee-debt(\?|$)/;
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const soTien = (s) => Number(chuan(s).replace(/[^\d]/g, '') || 0);
// 🔴 Thẻ "Công nợ với cửa hàng": tabpanel RỖNG, bộ lọc + bảng render NGOÀI panel ⇒ 🚫 phạm vi .ant-tabs-tabpane-active.
const dong2 = (page) => page.locator('main .ant-table-tbody tr.ant-table-row');

function tienDe() {
	const so = fs.existsSync(SO) ? JSON.parse(fs.readFileSync(SO, 'utf8')) : null;
	test.skip(!so, `Chưa có tiền đề công nợ nhân viên — VNPOST_TIEN_DE=1 VNPOST_LANE=${g.LAN} … -g "tien de 24"`);
	return so;
}
const noDb = (uid) =>
	g.selectDb(`SELECT id, amount, paid_amount, pay_status FROM VNPOST_CORE.EMPLOYEE_DEBT_HISTORY WHERE sys_user_id=${Number(uid)} AND shop_id=${Number(tienDe().shopId)} ORDER BY created_date, id`)
		.map((d) => ({ id: Number(d[0]), amount: Number(d[1]), paid: Number(d[2]), st: d[3] }));

/** Mở thẻ 2 + chọn điểm bán (cấp tỉnh chưa chọn thì FE không gọi API). Trả response đầu tiên. */
async function moThe2(page) {
	await moMan(page, VAI);
	expect(await moThe(page, 'Công nợ với cửa hàng'), 'Không có thẻ "Công nợ với cửa hàng"').toBe(true);
	const cho = page.waitForResponse((r) => API2.test(r.url()) && r.status() !== 401, { timeout: 60_000 }).catch(() => null);
	const kq = await chonDiemBan(page);
	test.skip(Boolean(kq?.lyDo), kq?.lyDo ?? ''); // tên điểm bán có thể rỗng (nhãn radio không chữ) dù đã chọn được
	const r = await cho;
	await page.waitForTimeout(1_500);
	return r;
}

/** 🔴 RTK Query dùng cache khi tham số trùng lần trước ⇒ có thể không có request; trả null khi dùng cache. */
async function taiLai2(page, hanhDong, { batBuoc = false } = {}) {
	const cho = page.waitForResponse((r) => API2.test(r.url()) && r.status() !== 401, { timeout: batBuoc ? 30_000 : 8_000 });
	await hanhDong();
	const r = batBuoc ? await cho : await cho.catch(() => null);
	await page.waitForTimeout(1_200);
	return r;
}

async function chonTrangThai(page, nhan) {
	const o = page.locator('main .ant-select').filter({ hasText: /^(Tất cả|Chưa trả|Trả một phần|Đã trả)$/ }).first();
	return taiLai2(page, async () => {
		await o.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${nhan}$`) }).click();
	});
}

/** Dòng nhân viên theo tên (GDV làn). */
const dongNv = (page, ten) => dong2(page).filter({ hasText: ten }).first();

async function moChiTietNv(page, ten) {
	await dongNv(page, ten).getByRole('button', { name: 'Chi tiết' }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết công nợ nhân viên' }).last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(2_000);
	return dr;
}

const the3 = async (dr) => {
	const t = chuan(await dr.innerText());
	const lay = (n) => soTien((t.match(new RegExp(`${n}\\s*:?\\s*([\\d.,]+)`)) || [])[1]);
	return { tong: lay('Tổng nợ'), daTra: lay('Đã trả'), conLai: lay('Còn lại') };
};

async function moThanhToan(page, dr) {
	await dr.getByRole('button', { name: /^Thanh toán$/ }).first().click();
	const pay = page.locator('.ant-drawer-open').filter({ hasText: 'Thanh toán công nợ nhân viên' }).last();
	await expect(pay).toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(1_000);
	return pay;
}
const oTong = (pay) => pay.getByPlaceholder('Nhập tổng tiền, hệ thống tự phân bổ vào các phiếu');
async function nhapTong(pay, v) {
	const o = oTong(pay);
	// 🔴 Xoá trắng thì InputNumber tự điền "0" ⇒ gõ tiếp thành "310000" (vượt tổng nợ, bị kẹp) ⇒ fill thay nguyên giá trị.
	await o.fill(String(v));
	const dangGo = await o.inputValue();
	await o.press('Tab');
	await pay.page().waitForTimeout(800);
	ghiChu(`ô tổng (gõ ${v})`, `khi gõ "${dangGo}" · sau Tab "${await o.inputValue()}"`);
}
/** Cột "Số tiền trả" từng dòng khoản nợ (theo thứ tự hiển thị). */
async function soTienTra(pay) {
	const h = pay.locator('.ant-table-tbody tr.ant-table-row');
	const kq = [];
	for (let i = 0; i < (await h.count()); i += 1) {
		const ins = h.nth(i).locator('input');
		kq.push({ dong: chuan(await h.nth(i).innerText()), tra: soTien(await ins.last().inputValue().catch(() => '0')) });
	}
	return kq;
}

// 🚫 Không serial: case đỏ không được kéo theo skip các case sau (mỗi case tự kiểm tiền đề).

test.describe('24 · Công nợ với cửa hàng (vai province)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('24_050_002 — Lọc theo trạng thái trả nợ', async ({ page }) => {
		chanNeuTat('24_050_002');
		await moThe2(page);
		const o = page.locator('main .ant-select').filter({ hasText: /^Tất cả$/ }).first();
		await o.click();
		const ds = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(chuan);
		ghiChu('lựa chọn', ds.join(' · '));
		expect(ds).toEqual(['Tất cả', 'Chưa trả', 'Trả một phần', 'Đã trả']);
	});

	test('24_050_004 — Tìm nhân viên ở thẻ Công nợ với cửa hàng', async ({ page }) => {
		chanNeuTat('24_050_004');
		tienDe();
		await moThe2(page);
		const o = khung(page).getByPlaceholder('Tìm tên/SĐT nhân viên');
		await o.fill('AUTO7_GDV'.replace('7', g.LAN));
		const r = await taiLai2(page, () => o.press('Enter'));
		ghiChu('tham số', JSON.stringify(thamSo(r)));
		expect(thamSo(r).keyword).toBe(`AUTO${g.LAN}_GDV`);
		const ds = (await dong2(page).allInnerTexts()).map(chuan);
		expect(ds.length).toBeGreaterThan(0);
		for (const d of ds) expect(d).toContain(`AUTO${g.LAN}_GDV`);
	});

	test('24_050_005 — Cấp tỉnh chọn điểm bán ở thẻ Công nợ với cửa hàng', async ({ page }) => {
		chanNeuTat('24_050_005');
		const so = tienDe();
		const st = g.k.batHeader(page);
		const r = await moThe2(page);
		const q = thamSo(r);
		const nv = (await dong2(page).allInnerTexts()).map(chuan);
		// Đối chứng: cùng phiên, gọi với shopId của điểm bán KHÔNG thuộc tỉnh (điểm bán làn 8 / bất kỳ ≠ làn).
		const khac = Number(g.selectDb(`SELECT shop_id FROM VNPOST_CORE.CONFIG_ROUTING WHERE shop_id <> ${Number(so.shopId)} ORDER BY shop_id DESC LIMIT 1`)[0]?.[0]);
		const b = await g.k.goiGhi(page, st, 'GET', '/employee-debt', { page: 0, size: 20, shopId: khac });
		const b0 = await g.k.goiGhi(page, st, 'GET', '/employee-debt', { page: 0, size: 20, shopId: q.shopId });
		const ten = (x) => (x?.data || []).map((d) => d.employeeName ?? d.fullName ?? d.sysUserId).sort();
		ghiChu('so sánh', `shopId ${q.shopId}: ${JSON.stringify(ten(b0))} · shopId khác ${khac}: ${JSON.stringify(ten(b))} · màn: ${nv.length} dòng`);
		// Kỳ vọng kịch bản (đã chốt theo code): cấp tỉnh BỎ QUA shopId ⇒ hai lần gọi ra CÙNG danh sách.
		expect(ten(b), 'Cấp tỉnh gọi với shopId khác mà danh sách đổi (kịch bản: backend bỏ qua shopId ở cấp tỉnh)').toEqual(ten(b0));
	});

	test('24_050_006 — Lọc trạng thái Tất cả tương đương không lọc', async ({ page }) => {
		chanNeuTat('24_050_006');
		await moThe2(page);
		const truoc = (await dong2(page).allInnerTexts()).map(chuan);
		await chonTrangThai(page, 'Chưa trả');
		const r = await chonTrangThai(page, 'Tất cả');
		// Không có request = RTK dùng lại cache của lần gọi đầu (tham số giống hệt ⇒ payStatus cũng không gửi).
		ghiChu('payStatus khi Tất cả', r ? JSON.stringify(thamSo(r).payStatus ?? null) : '(cache — cùng tham số lần đầu)');
		if (r) expect(thamSo(r).payStatus ?? null).toBeNull();
		expect((await dong2(page).allInnerTexts()).map(chuan)).toEqual(truoc);
	});

	test('24_050_007 — Trạng thái từng dòng khớp bộ lọc đã chọn', async ({ page }) => {
		chanNeuTat('24_050_007');
		await moThe2(page);
		const cot = (await page.locator('main .ant-table-thead th').allInnerTexts()).map(chuan);
		const i = (n) => cot.indexOf(n);
		const kq = {};
		for (const nhan of ['Chưa trả', 'Trả một phần', 'Đã trả']) {
			await chonTrangThai(page, nhan);
			const ds = [];
			for (let k = 0; k < (await dong2(page).count()); k += 1) {
				const td = (await dong2(page).nth(k).locator('td').allInnerTexts()).map(chuan);
				ds.push({ tong: soTien(td[i('Tổng nợ')]), tra: soTien(td[i('Đã trả')]), con: soTien(td[i('Còn lại')]), chua: soTien(td[i('Khoản chưa thanh toán')]) });
			}
			kq[nhan] = ds;
			for (const d of ds) {
				if (nhan === 'Chưa trả') expect(d.tra, `Chưa trả mà Đã trả = ${d.tra}`).toBe(0);
				if (nhan === 'Trả một phần') expect(d.tra > 0 && d.tra < d.tong, `Trả một phần sai: ${JSON.stringify(d)}`).toBe(true);
				if (nhan === 'Đã trả') expect(d.con === 0 && d.chua === 0, `Đã trả sai: ${JSON.stringify(d)}`).toBe(true);
			}
		}
		ghiChu('theo trạng thái', JSON.stringify(kq));
	});

	test('24_050_008 — Phân trang thẻ Công nợ với cửa hàng', async ({ page }) => {
		chanNeuTat('24_050_008');
		const r0 = await moThe2(page);
		const q0 = thamSo(r0);
		const b0 = await r0.json();
		ghiChu('trang đầu', JSON.stringify({ q: q0, page: b0?.page }));
		expect(q0.page).toBe('0');
		expect(q0.size).toBe('20');
		const ids = (b0?.data || []).map((d) => String(d.sysUserId));
		expect(new Set(ids).size, 'Một nhân viên xuất hiện nhiều dòng (không GROUP BY sys_user_id)').toBe(ids.length);
		const tong = b0?.page?.total_elements ?? b0?.page?.total_element;
		test.skip(!(tong > 10), `Chỉ ${tong} nhân viên — không có trang 2 với size 10.`);
	});

	test('24_060_001 — Ba thẻ số liệu là số cộng dồn không giới hạn thời gian', async ({ page }) => {
		chanNeuTat('24_060_001');
		const so = tienDe();
		await moThe2(page);
		const dr = await moChiTietNv(page, `AUTO${g.LAN}_GDV`);
		const t = await the3(dr);
		const db = noDb(so.gdv);
		const mong = { tong: db.reduce((a, d) => a + d.amount, 0), daTra: db.reduce((a, d) => a + d.paid, 0) };
		ghiChu('thẻ vs DB', `${JSON.stringify(t)} · DB ${JSON.stringify(mong)}`);
		expect(t.tong).toBe(mong.tong);
		expect(t.daTra).toBe(mong.daTra);
		expect(t.conLai).toBe(mong.tong - mong.daTra);
		expect(await dr.locator('.ant-picker').count(), 'Drawer chi tiết có ô thời gian (thẻ không còn là số cộng dồn)').toBe(0);
	});

	test('24_060_002 — Cột Loại phiếu cho biết nguồn khoản nợ', async ({ page }) => {
		chanNeuTat('24_060_002');
		tienDe();
		await moThe2(page);
		const dr = await moChiTietNv(page, `AUTO${g.LAN}_GDV`);
		const cot = (await dr.locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		const i = cot.indexOf('Loại phiếu');
		expect(i, `Thiếu cột "Loại phiếu". Cột: ${cot.join(' · ')}`).toBeGreaterThanOrEqual(0);
		const loai = (await dr.locator(`.ant-table-tbody tr.ant-table-row td:nth-child(${i + 1})`).allInnerTexts()).map(chuan);
		const chu = chuan(await dr.locator('.ant-table-tbody').first().innerText());
		ghiChu('loại phiếu', `${loai.join(' · ')} · ${chu.slice(0, 200)}`);
		expect(loai.length).toBeGreaterThan(0);
		for (const l of loai) expect(l, 'Khoản nợ từ phiếu xuất hỏng không hiện "Phiếu xuất kho"').toBe('Phiếu xuất kho');
		expect(chu, 'Không thấy ghi chú lý do').toMatch(/AUTO test tien de 24/);
	});

	test('24_060_003 — Ba thẻ lịch sử tách bạch nhau', async ({ page }) => {
		chanNeuTat('24_060_003');
		tienDe();
		await moThe2(page);
		const dr = await moChiTietNv(page, `AUTO${g.LAN}_GDV`);
		const doc = async (nhan, re) => {
			const cho = re ? page.waitForResponse((r) => re.test(r.url()), { timeout: 15_000 }).catch(() => null) : null;
			await dr.locator('.ant-tabs-tab', { hasText: nhan }).locator('.ant-tabs-tab-btn').dispatchEvent('click');
			if (cho) await cho;
			await page.waitForTimeout(1_500);
			return (await dr.locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map(chuan);
		};
		const chua = await doc('Công nợ chưa thanh toán');
		const ghi = await doc('Lịch sử ghi nợ', /employee-debt\/\d+\/history/);
		const tt = await doc('Lịch sử thanh toán', /employee-debt\/payment/);
		ghiChu('ba thẻ', JSON.stringify({ chua: chua.length, ghi: ghi.length, tt: tt.length }));
		expect(ghi.length, 'Lịch sử ghi nợ phải có mọi khoản (≥ khoản chưa thanh toán)').toBeGreaterThanOrEqual(chua.length);
		for (const d of chua) expect(d, 'Thẻ "chưa thanh toán" có khoản đã trả xong').not.toMatch(/Đã thanh toán/);
		for (const d of tt) expect(d, 'Dòng lịch sử thanh toán thiếu phương thức').toMatch(/Tiền mặt|Chuyển khoản/);
	});

	test('24_070_001 — Hệ thống tự chia tiền ưu tiên khoản ghi nợ sớm nhất', async ({ page }) => {
		chanNeuTat('24_070_001');
		const so = tienDe();
		const db = noDb(so.gdv).filter((d) => d.amount > d.paid);
		test.skip(db.length < 2, `GDV chỉ còn ${db.length} khoản chưa trả — chạy lại tiền đề 24.`);
		await moThe2(page);
		const dr = await moChiTietNv(page, `AUTO${g.LAN}_GDV`);
		const pay = await moThanhToan(page, dr);
		const conDau = db[0].amount - db[0].paid;
		await nhapTong(pay, conDau + 1_000);
		const tra = await soTienTra(pay);
		ghiChu('phân bổ', JSON.stringify(tra));
		const cu = tra.find((x) => x.tra > 0 && x.dong.includes(String(conDau).replace(/\B(?=(\d{3})+(?!\d))/g, '.')));
		expect(cu, `Khoản cũ nhất (${conDau}) không được trả đủ trước`).toBeTruthy();
		expect(tra.reduce((a, x) => a + x.tra, 0)).toBe(conDau + 1_000);
		await pay.getByRole('button', { name: /Hủy|Huỷ|Đóng/ }).first().click();
	});

	for (const [id, ten, v, mong] of [
		['24_070_003', 'Bỏ trống tổng số tiền khi nhân viên nộp tiền', '', 'Vui lòng nhập số tiền thanh toán'],
		['24_070_004', 'Nhập số tiền bằng 0 hoặc số âm khi nộp tiền', '0', 'Vui lòng nhập số tiền thanh toán'],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			tienDe();
			const daGoi = [];
			page.on('request', (r) => { if (/employee-debt\/payment/.test(r.url()) && r.method() === 'POST') daGoi.push(r.url()); });
			await moThe2(page);
			const dr = await moChiTietNv(page, `AUTO${g.LAN}_GDV`);
			const pay = await moThanhToan(page, dr);
			await nhapTong(pay, v);
			// Xoá luôn số ở từng dòng (form tự điền theo tổng).
			const ins = pay.locator('.ant-table-tbody input');
			for (let i = 0; i < (await ins.count()); i += 1) await ins.nth(i).fill('0');
			if (id === '24_070_004') {
				await oTong(pay).fill('-100000');
				await oTong(pay).press('Tab'); // min=0 chỉ kẹp khi rời ô
				await page.waitForTimeout(500);
				ghiChu('ô sau khi gõ -100000 + Tab', await oTong(pay).inputValue());
				expect(await oTong(pay).inputValue(), 'Ô số nhận giá trị âm').not.toMatch(/^-/);
				await nhapTong(pay, '0');
				for (let i = 0; i < (await ins.count()); i += 1) await ins.nth(i).fill('0');
			}
			await pay.getByRole('button', { name: /^Thanh toán$/ }).last().click();
			await page.waitForTimeout(2_000);
			const tb = chuan((await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts()).join(' | '));
			ghiChu('thông báo', tb);
			expect(tb).toContain(mong);
			expect(daGoi, 'Bị chặn mà vẫn POST /employee-debt/payment').toEqual([]);
		});
	}

	test('24_070_005 — Nộp nhiều hơn tổng nợ còn lại', async ({ page }) => {
		chanNeuTat('24_070_005');
		const so = tienDe();
		const con = noDb(so.gdv).reduce((a, d) => a + d.amount - d.paid, 0);
		await moThe2(page);
		const dr = await moChiTietNv(page, `AUTO${g.LAN}_GDV`);
		const pay = await moThanhToan(page, dr);
		await nhapTong(pay, con + 50_000);
		const o = soTien(await oTong(pay).inputValue());
		const tra = await soTienTra(pay);
		ghiChu('hành vi thật', `còn nợ ${con} · gõ ${con + 50_000} ⇒ ô ${o} · phân bổ ${JSON.stringify(tra.map((x) => x.tra))}`);
		expect(o, 'Ô tổng nhận số vượt tổng nợ còn lại').toBeLessThanOrEqual(con);
		expect(tra.reduce((a, x) => a + x.tra, 0)).toBeLessThanOrEqual(con);
		await pay.getByRole('button', { name: /Hủy|Huỷ|Đóng/ }).first().click();
	});

	test('24_070_006 — API thanh toán trả lỗi', async ({ page }) => {
		chanNeuTat('24_070_006');
		const so = tienDe();
		const truoc = noDb(so.gdv);
		await page.route(/employee-debt\/payment/, (r) => (r.request().method() === 'POST'
			? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: { code: '500', message: '' } }) })
			: r.continue()));
		await moThe2(page);
		const dr = await moChiTietNv(page, `AUTO${g.LAN}_GDV`);
		const t0 = await the3(dr);
		const pay = await moThanhToan(page, dr);
		await nhapTong(pay, 1_000);
		await pay.getByRole('button', { name: /^Thanh toán$/ }).last().click();
		await page.waitForTimeout(2_500);
		const tb = chuan((await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts()).join(' | '));
		ghiChu('thông báo', tb);
		expect(tb).toContain('Thanh toán công nợ thất bại');
		expect(await the3(dr), 'API lỗi mà số trên drawer đổi').toEqual(t0);
		expect(noDb(so.gdv), 'API (giả) lỗi mà DB đổi').toEqual(truoc);
	});

	test('24_070_007 — Đóng form thanh toán giữa chừng', async ({ page }) => {
		chanNeuTat('24_070_007');
		tienDe();
		const daGoi = [];
		page.on('request', (r) => { if (/employee-debt\/payment/.test(r.url()) && r.method() === 'POST') daGoi.push(r.url()); });
		await moThe2(page);
		const dr = await moChiTietNv(page, `AUTO${g.LAN}_GDV`);
		let pay = await moThanhToan(page, dr);
		const macDinh = await oTong(pay).inputValue();
		await nhapTong(pay, 1_000);
		await pay.locator('textarea').first().fill('AUTO test 24_070_007 — đóng giữa chừng');
		await pay.getByRole('button', { name: /Hủy|Huỷ|Đóng/ }).first().click();
		await expect(pay).toBeHidden();
		pay = await moThanhToan(page, dr);
		ghiChu('mở lại', `tổng "${await oTong(pay).inputValue()}" (mặc định "${macDinh}") · ghi chú "${await pay.locator('textarea').first().inputValue()}"`);
		expect(await oTong(pay).inputValue(), 'Mở lại mà ô tổng giữ số đã gõ').toBe(macDinh);
		expect(await pay.locator('textarea').first().inputValue()).toBe('');
		expect(daGoi).toEqual([]);
	});

	test('24_070_002 — Ghi nhận nhân viên nộp tiền trả nợ', async ({ page }) => {
		chanNeuTat('24_070_002');
		const so = tienDe();
		const db0 = noDb(so.gdv).filter((d) => d.amount > d.paid);
		test.skip(db0.length < 2, `GDV chỉ còn ${db0.length} khoản chưa trả — chạy lại tiền đề 24.`);
		const nop = db0[0].amount - db0[0].paid + 5_000; // trả đủ khoản cũ + 5.000 vào khoản sau
		await moThe2(page);
		const dr = await moChiTietNv(page, `AUTO${g.LAN}_GDV`);
		const pay = await moThanhToan(page, dr);
		await nhapTong(pay, nop);
		await pay.locator('textarea').first().fill('AUTO test 24_070_002 — nhân viên nộp tiền');
		const cho = page.waitForResponse((r) => /employee-debt\/payment/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
		await pay.getByRole('button', { name: /^Thanh toán$/ }).last().click();
		const r = await cho;
		const b = await r.json();
		ghiChu('payload', JSON.stringify(r.request().postDataJSON()));
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		const tb = chuan((await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts()).join(' | '));
		expect(tb).toContain('Thanh toán công nợ thành công');
		await page.waitForTimeout(2_000);
		const db1 = noDb(so.gdv);
		ghiChu('DB', `${JSON.stringify(db0)} → ${JSON.stringify(db1)}`);
		expect(db1.find((d) => d.id === db0[0].id).st).toBe('PAY_COMPLETED');
		expect(db1.find((d) => d.id === db0[1].id).st).toBe('PAY_PARTIAL');
		expect(db1.find((d) => d.id === db0[1].id).paid).toBe(db0[1].paid + 5_000);
	});

	test('24_070_008 — Số liệu liên quan cập nhật sau khi nộp tiền', async ({ page }) => {
		chanNeuTat('24_070_008');
		const so = tienDe();
		test.skip(noDb(so.gdv).every((d) => d.amount <= d.paid), 'GDV đã trả hết nợ — chạy lại tiền đề 24.');
		await moThe2(page);
		const tim = (await dongNv(page, `AUTO${g.LAN}_GDV`).locator('td').allInnerTexts()).map(chuan);
		const dr = await moChiTietNv(page, `AUTO${g.LAN}_GDV`);
		const t0 = await the3(dr);
		const pay = await moThanhToan(page, dr);
		await nhapTong(pay, 4_000);
		const cho = page.waitForResponse((r) => /employee-debt\/payment/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
		await pay.getByRole('button', { name: /^Thanh toán$/ }).last().click();
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		await page.waitForTimeout(3_000);
		const t1 = await the3(dr);
		ghiChu('bốn số', `dòng trước ${tim.join(' | ')} · thẻ ${JSON.stringify(t0)} → ${JSON.stringify(t1)}`);
		expect(t1.tong, 'Tổng nợ đổi sau khi nộp').toBe(t0.tong);
		expect(t1.daTra).toBe(t0.daTra + 4_000);
		expect(t1.conLai).toBe(t0.conLai - 4_000);
		await dr.locator('.ant-tabs-tab', { hasText: 'Lịch sử thanh toán' }).locator('.ant-tabs-tab-btn').dispatchEvent('click');
		await page.waitForTimeout(2_000);
		expect(chuan(await dr.innerText()), 'Lần nộp 4.000 không có trong Lịch sử thanh toán').toMatch(/4[.,]000/);
	});
});
