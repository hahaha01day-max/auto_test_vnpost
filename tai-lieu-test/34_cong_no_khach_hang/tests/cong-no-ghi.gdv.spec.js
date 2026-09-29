'use strict';

/**
 * 34 · Công nợ khách hàng — các case CẦN KHÁCH ĐANG NỢ. Tiền đề (beforeAll, lưu `test-output/tien-de-34.json`, dùng lại 12 giờ):
 *   GDV (spec này) tạo khách RÁC tên CÓ DẤU `A7CN34 Nguyễn Thị Nợ <ts>` rồi bán 2 đơn "Thanh toán sau" (F8), mỗi đơn 1 × SP tiêu chuẩn.
 * Báo cáo: `/debt-reconciliation/customer-debt` (API `/report/customer-debt/{summary,customers,orders}`); thu hồi nợ nằm ở CHI TIẾT KHÁCH
 * (nút "Thao tác" ⇒ tab "Công nợ" ⇒ "Thanh toán" ⇒ drawer "Thanh toán nợ khách hàng", POST `/shops/{id}/customer/create-debt` type PAYMENT,
 * catName "Thu hồi nợ", toast "Thêm thành công"; số tiền 0 ⇒ "Số tiền phải lớn hơn 0") — xem trace 19_quan_ly_khach_hang/cong-no-khach.
 * 🔴 Đo 25/09: vai gdv nhận SSHOP-401 ở `/report/customer-debt/*` ⇒ case kịch bản vai gdv/province kiểm quyền bằng `expect.soft`
 *    rồi kiểm CHỨC NĂNG bằng vai shop (CHT cùng điểm bán) — để lỗi quyền không che mất phần chức năng.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');
const cp = require('../../19_quan_ly_khach_hang/tests/customer-page');
const { moTrang } = require('../../shared/auth/login');
const { API, ROUTE, chuan, dong, khung, soTu } = require('./debt-page');

const GOC = path.join(__dirname, '..');
const TEP = path.join(GOC, 'test-output', 'tien-de-34.json');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const boDau = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const D = { kh: null, don: [], loi: null };

/** Đơn nợ của khách từ DB POD_02 (order_id, order_number, tổng, đã trả). */
const donDb = () => g.selectDb(`SELECT order_id, order_number, total_amount, paid_money FROM VNPOST_POD_02.SHOP_ORDER WHERE order_id IN (${D.don.map(Number).join(',') || 0}) ORDER BY order_id`);

/**
 * SP seed còn bán được ở shop làn: mọi dòng SHOP_STOCK > 0 (dòng âm làm POS báo POD-0005 dù tổng dương).
 * 🔴 Tồn đầu kỳ chặn khai trùng SP ⇒ seed 08 không nạp lại được; SP tiêu chuẩn/FIFO làn 7 đã cạn 27–28/09.
 * Công nợ không phụ thuộc phương pháp giá vốn nên SP nào cũng được.
 */
function spConTon() {
	const ds = p.sp();
	const shopId = Number(require('../../00_seed/seed-state').doc().duLieu?.diemBan?.shopId);
	const conTon = new Set(g.selectDb(`SELECT p.product_name FROM VNPOST_POD_02.SHOP_STOCK s JOIN VNPOST_CORE.CHAIN_PRODUCTS p ON p.product_id=s.product_id WHERE s.shop_id=${shopId} GROUP BY p.product_name HAVING MIN(s.quantity) > 0`).map((d) => d[0]));
	const ten = [ds.tc, ds.fifo, ds.dd, ds.bt].find((t) => t && conTon.has(t));
	if (!ten) throw new Error(`Không SP seed nào còn tồn ở shop ${shopId} — nhập bổ sung tồn trước`);
	return ten;
}

async function taoDon(page, st, tenKh) {
	await p.chonKhach(page, tenKh);
	await p.them(page, spConTon());
	await page.waitForTimeout(1_500);
	const cho = page.waitForResponse((r) => /spa-checkout/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
	await page.keyboard.press('F8');
	const b = await (await cho).json().catch(() => ({}));
	if (String(b?.status?.code) !== '200') throw new Error(`F8 thanh toán sau lỗi: ${JSON.stringify(b?.status)}`);
	await page.waitForTimeout(3_000);
	void st;
	return b?.data?.orderId ?? b?.data?.id ?? b?.data;
}

/** Vai `vai` có đọc được báo cáo công nợ không (soft). */
async function kiemVai(browser, vai) {
	const ps = await g.k.moPhienPhu(browser, vai, ROUTE);
	try {
		// 🔴 fromDate/toDate là @NotNull ở CustomerDebtReportRequest — thiếu là SSHOP-500 (không phải 400),
		//    từng bị đọc nhầm thành lỗi backend/quyền (27–28/09). Gửi đúng như FE: năm hiện tại.
		const nam = new Date().getFullYear();
		const b = await g.k.goiGhi(ps.page, ps.st, 'GET', API, { fromDate: `${nam}-01-01`, toDate: `${nam}-12-31`, page: 0, size: 5 });
		ghiChu(`vai ${vai}`, `API ${b?.status?.code} ${b?.status?.message ?? ''} · ${b?.page?.total_elements ?? '-'} khách`);
		expect.soft(String(b?.status?.code), `Vai ${vai} KHÔNG đọc được báo cáo công nợ khách (${b?.status?.code})`).toBe('200');
	} finally { await ps.dong(); }
}
/** Mở báo cáo bằng phiên phụ `vai` (mặc định shop) + bắt các response danh sách. */
async function moBc(browser, vai = 'shop') {
	const ps = await g.k.moPhienPhu(browser, vai, '/dashboard');
	const bat = [];
	ps.page.on('response', async (r) => { if (r.url().includes(`${API}?`)) bat.push({ url: r.url(), b: await r.json().catch(() => null) }); });
	await moTrang(ps.page, ROUTE, vai);
	await ps.page.waitForTimeout(5_000);
	return { ...ps, bat };
}
async function tim(ps, tu) {
	const o = khung(ps.page).getByPlaceholder('Nhập tên hoặc số điện thoại khách hàng');
	const n = ps.bat.length;
	await o.fill(tu);
	await o.press('Enter');
	await expect.poll(() => ps.bat.length, { timeout: 15_000 }).toBeGreaterThan(n).catch(() => null);
	await ps.page.waitForTimeout(1_200);
	return ps.bat[ps.bat.length - 1];
}
const coKh = (res) => (res?.b?.data ?? []).some((x) => String(x.customerId ?? x.id) === String(D.kh?.id) || chuan(x.customerName ?? x.name).includes(D.kh?.ma ?? '~'));

async function moThe(page, nhan) {
	const the = khung(page).locator('.ant-tabs-tab', { hasText: nhan }).first();
	await expect(the, `Chi tiết khách không có tab "${nhan}"`).toBeVisible({ timeout: 15_000 });
	await the.locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await page.waitForTimeout(3_000);
}
async function giaTri(page, nhan) {
	const m = chuan(await khung(page).innerText()).match(new RegExp(`${nhan}\\s*:?\\s*(-?[\\d.,]+)\\s*đ`));
	return m ? soTu(m[1]) : null;
}
/** Mở chi tiết khách rác từ màn Danh sách khách hàng (vai gdv).
 *  🔴 `page` của test chưa ở màn nào — gọi thẳng `g.moChiTiet` là đợi ô tìm trên trang trắng tới timeout. */
async function moKhach(page) {
	await cp.moMan(page, 'gdv');
	await g.moChiTiet(page, D.kh.ten);
}
async function moThanhToan(page) {
	await moKhach(page);
	await moThe(page, 'Công nợ');
	const nut = khung(page).getByRole('button', { name: /^Thanh toán$/ });
	await expect(nut, 'Tab Công nợ không có nút "Thanh toán"').toBeEnabled({ timeout: 15_000 });
	await nut.click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thanh toán nợ khách hàng' }).last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(1_500);
	const oNv = dr.locator('.ant-form-item').filter({ hasText: 'Nhân viên tạo phiếu' }).locator('.ant-select').first();
	if ((await oNv.count()) && !/\S/.test(chuan(await oNv.innerText().catch(() => '')).replace(/Chọn.*/, ''))) {
		await oNv.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click().catch(() => null);
	}
	return dr;
}

test.describe('34 · Công nợ khách hàng có tiền đề (khách rác nợ 2 đơn)', () => {
	test.describe.configure({ timeout: 300_000 });

	test.beforeAll(async ({ browser }) => {
		test.setTimeout(420_000);
		try {
			const cu = JSON.parse(fs.readFileSync(TEP, 'utf8'));
			if (cu.kh && cu.don?.length === 2 && Date.now() - cu.luc < 12 * 3_600_000) { Object.assign(D, cu); return; }
		} catch { /* chưa có */ }
		const ctx = await browser.newContext({ storageState: require('../../shared/auth/accounts').storageStateFor('gdv'), viewport: { width: 1440, height: 1000 } });
		const page = await ctx.newPage();
		try {
			const st = await p.moBan(page, test);
			const ts = String(Date.now()).slice(-6);
			const m = g.khachMoi(`CN34${ts}`);
			m.ten = `A7CN34 Nguyễn Thị Nợ ${ts}`;
			D.kh = await g.taoKhachApi(page, st, m);
			for (let i = 0; i < 2; i += 1) D.don.push(await taoDon(page, st, D.kh.ten));
			D.luc = Date.now();
			fs.mkdirSync(path.dirname(TEP), { recursive: true });
			fs.writeFileSync(TEP, JSON.stringify(D, null, 2));
		} catch (e) {
			D.loi = String(e?.message ?? e).slice(0, 300);
		} finally { await ctx.close(); }
	});
	const canTienDe = () => test.skip(!D.kh || D.don.length < 2, `Tiền đề 34 không dựng được: ${D.loi ?? JSON.stringify(D)}`);

	test('34 tien de — khách rác có 2 đơn nợ (DB)', async () => {
		canTienDe();
		const r = donDb();
		ghiChu('tiền đề', `${JSON.stringify(D.kh)} · đơn ${JSON.stringify(r)}`);
		expect(r).toHaveLength(2);
	});

	// ───────── Vai province (kịch bản) ─────────

	test('34_010_001 — Màn Công nợ khách hàng hiện tổng quy mô theo kỳ', async ({ browser }) => {
		chanNeuTat('34_010_001');
		canTienDe();
		await kiemVai(browser, 'province');
		const ps = await moBc(browser);
		try {
			const r = await tim(ps, D.kh.ten);
			const d = (r?.b?.data ?? [])[0];
			const tong = donDb().reduce((a, x) => a + Number(x[2]) - Number(x[3] ?? 0), 0);
			const the = chuan(await khung(ps.page).innerText()).slice(0, 300);
			ghiChu('đo', `dòng ${JSON.stringify(d)} · DB còn nợ ${tong} · thẻ: ${the}`);
			expect(coKh(r), 'Báo cáo không có khách rác đang nợ').toBe(true);
			expect(Number(d.totalRemaining ?? d.totalDebt ?? d.remainingAmount ?? soTu(await dong(ps.page).first().locator('td').nth(6).innerText())), 'Tổng còn nợ của khách ≠ DB').toBe(tong);
			expect(the).toMatch(/TỔNG CÒN NỢ/i);
		} finally { await ps.dong(); }
	});

	test('34_010_002 — Đổi kỳ thì tổng công nợ đổi theo', async ({ browser }) => {
		chanNeuTat('34_010_002');
		canTienDe();
		await kiemVai(browser, 'province');
		const ps = await moBc(browser);
		try {
			const docThe = async () => soTu((chuan(await khung(ps.page).innerText()).match(/TỔNG CÒN NỢ\s*([\d.,]+)/i) || [])[1]);
			const a = await docThe();
			const rp = khung(ps.page).locator('.ant-picker-range').first();
			const ins = rp.locator('input');
			const n = ps.bat.length;
			await ins.nth(0).click();
			await ins.nth(0).fill('01/01/2020');
			await ins.nth(0).press('Enter');
			await ins.nth(1).fill('31/01/2020');
			await ins.nth(1).press('Enter');
			await ps.page.locator('body').click({ position: { x: 5, y: 5 } });
			await expect.poll(() => ps.bat.length, { timeout: 15_000 }).toBeGreaterThan(n).catch(() => null);
			await ps.page.waitForTimeout(2_000);
			const b = await docThe();
			const q = ps.bat.length > n ? Object.fromEntries(new URL(ps.bat[ps.bat.length - 1].url).searchParams) : null;
			ghiChu('đo', `kỳ mặc định ${a} · kỳ 01/2020 ${b} · ô ${await ins.nth(0).inputValue()}→${await ins.nth(1).inputValue()} · q ${JSON.stringify(q)}`);
			expect(q, 'Đổi kỳ mà màn không gọi lại').toBeTruthy();
			expect(a).toBeGreaterThan(0);
			expect(b, 'Đổi sang kỳ không có nợ mà tổng vẫn giữ số kỳ trước').not.toBe(a);
		} finally { await ps.dong(); }
	});

	test('34_020_001 — Công nợ chi tiết của một khách hiện từng khoản', async ({ browser }) => {
		chanNeuTat('34_020_001');
		canTienDe();
		await kiemVai(browser, 'province');
		const ps = await moBc(browser);
		try {
			await tim(ps, D.kh.ten);
			await dong(ps.page).first().getByRole('button').last().click();
			await ps.page.waitForTimeout(4_000);
			await moThe(ps.page, 'Công nợ');
			const chu = chuan(await khung(ps.page).innerText());
			const db = donDb();
			ghiChu('đo', `url ${ps.page.url()} · ${chu.slice(0, 400)}`);
			for (const [, so] of db) expect(chu, `Chi tiết công nợ thiếu đơn ${so}`).toContain(so);
			expect(chu, 'Không hiện phần đã thu của từng khoản').toMatch(/Đã (thanh toán|thu|trả)/);
		} finally { await ps.dong(); }
	});

	test('34_030_001 — Chi tiết phiếu công nợ cho biết nguồn gốc khoản nợ', async ({ browser }) => {
		chanNeuTat('34_030_001');
		canTienDe();
		await kiemVai(browser, 'province');
		const ps = await moBc(browser);
		try {
			// 🔴 Route `/customer-debt/:customerId/:shopId` (config.jsx CUSTOMER_DEBT_DETAIL) KHÔNG được gắn
			//    vào router nào ⇒ 404. Nút "Chi tiết" của báo cáo đi CUSTOMER_MANAGEMENT_DETAIL ?tab=CUSTOMER-DEBT
			//    (CustomerDebtTab.jsx) ⇒ đi đúng đường người dùng: danh sách khách → chi tiết → thẻ Công nợ.
			await cp.moMan(ps.page, 'shop');
			await g.moChiTiet(ps.page, D.kh.ten);
			await moThe(ps.page, 'Công nợ');
			await ps.page.waitForTimeout(3_000);
			const cot = (await khung(ps.page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
			const chu = chuan(await khung(ps.page).innerText());
			ghiChu('đo', `cột ${cot.join(' · ')} · ${chu.slice(0, 300)}`);
			expect(chu, 'Không thấy đơn nguồn của khoản nợ').toContain(donDb()[0][1]);
			expect(cot.join(' · '), 'Phiếu công nợ không cho biết AI chịu trách nhiệm (người tạo / nhân viên bán)').toMatch(/Nhân viên|Người tạo|Người bán|Thu ngân/);
		} finally { await ps.dong(); }
	});

	test('34_040_002 — Chỉ vai điểm bán mới thu hồi nợ được', async ({ browser }) => {
		chanNeuTat('34_040_002');
		canTienDe();
		const ps = await g.k.moPhienPhu(browser, 'province', '/customer');
		try {
			await g.moChiTiet(ps.page, D.kh.ma).catch((e) => ghiChu('mở chi tiết', String(e).slice(0, 120)));
			const the = await khung(ps.page).locator('.ant-tabs-tab', { hasText: 'Công nợ' }).count();
			if (the) await moThe(ps.page, 'Công nợ');
			const nut = await khung(ps.page).getByRole('button', { name: /^Thanh toán$/ }).count();
			const bat = nut ? await khung(ps.page).getByRole('button', { name: /^Thanh toán$/ }).isEnabled() : false;
			ghiChu('đo', `vai tỉnh: tab Công nợ ${the} · nút Thanh toán ${nut} (bật ${bat})`);
			expect(bat, 'Vai TỈNH vẫn lập được phiếu thu hồi nợ (task 040 chỉ khai DIEM_BAN)').toBe(false);
		} finally { await ps.dong(); }
	});

	// ───────── Vai gdv (kịch bản) — tìm kiếm ─────────

	for (const [id, ten, tu, mong] of [
		['34_050_002', 'Tìm theo tên khách hàng khớp chính xác', () => D.kh.ten, 'co'],
		['34_050_003', 'Tìm theo một phần tên khách hàng', () => 'Nguyễn Thị Nợ', 'co'],
		['34_050_005', 'Tìm theo số điện thoại khách khớp chính xác', () => D.kh.sdt, 'co'],
		['34_050_006', 'Tìm theo một phần số điện thoại khách', () => D.kh.sdt.slice(-6), 'co'],
		['34_050_007', 'Tìm theo số điện thoại không có công nợ hoặc không tồn tại', () => '0999999001', 'rong'],
		['34_050_008', 'Tìm theo mã đơn hàng còn nợ khớp chính xác', () => donDb()[0][1], 'co'],
		['34_050_009', 'Tìm theo một phần mã đơn hàng còn nợ', () => donDb()[0][1].slice(-8), 'co'],
		['34_050_010', 'Tìm theo mã đơn hàng đã hết nợ hoặc không tồn tại', () => 'ZZZ9999999999', 'rong'],
		['34_050_012', 'Tìm công nợ theo tên khách không dấu', () => boDau(D.kh.ten), 'ghiNhan'],
	]) {
		test(`${id} — ${ten}`, async ({ browser }) => {
			chanNeuTat(id);
			canTienDe();
			await kiemVai(browser, 'gdv');
			const ps = await moBc(browser);
			try {
				const k = tu();
				const r = await tim(ps, k);
				const ds = (r?.b?.data ?? []).map((x) => x.customerName ?? x.name);
				ghiChu('đo', `"${k}" ⇒ ${r?.b?.status?.code} · ${r?.b?.page?.total_elements} dòng · ${ds.slice(0, 5).join(' | ')} · q ${r?.url.split('?')[1]}`);
				expect(String(r?.b?.status?.code)).toBe('200');
				if (mong === 'co') {
					expect(coKh(r), `Tìm "${k}" KHÔNG ra khách đang nợ ${D.kh.ten}`).toBe(true);
					if (id === '34_050_002' || id === '34_050_005' || id === '34_050_008') expect(ds, 'Khớp chính xác mà ra nhiều khách').toHaveLength(1);
				} else if (mong === 'rong') {
					expect(await dong(ps.page).count()).toBe(0);
					await expect(khung(ps.page).locator('.ant-empty').first()).toBeVisible();
				} else {
					ghiChu('hành vi thật', coKh(r) ? 'Tìm KHÔNG DẤU RA được khách tên có dấu' : 'Tìm không dấu KHÔNG ra khách tên có dấu');
					expect(r?.b?.data, 'Không đo được').toBeDefined();
				}
			} finally { await ps.dong(); }
		});
	}

	test('34_060_001 — Danh sách công nợ rỗng', async ({ browser }) => {
		chanNeuTat('34_060_001');
		await kiemVai(browser, 'gdv');
		const ps = await moBc(browser);
		try {
			const rp = khung(ps.page).locator('.ant-picker-range').first();
			const ins = rp.locator('input');
			const n = ps.bat.length;
			await ins.nth(0).click();
			await ins.nth(0).fill('01/01/2020');
			await ins.nth(0).press('Enter');
			await ins.nth(1).fill('02/01/2020');
			await ins.nth(1).press('Enter');
			await ps.page.locator('body').click({ position: { x: 5, y: 5 } });
			await expect.poll(() => ps.bat.length, { timeout: 15_000 }).toBeGreaterThan(n).catch(() => null);
			await ps.page.waitForTimeout(1_500);
			const r = ps.bat[ps.bat.length - 1];
			ghiChu('đo', `${r?.url.split('?')[1]} · ${r?.b?.status?.code} · ${r?.b?.page?.total_elements}`);
			expect(ps.bat.length, 'Đổi kỳ mà không gọi lại').toBeGreaterThan(n);
			expect(await dong(ps.page).count()).toBe(0);
			const rong = khung(ps.page).locator('.ant-empty').first();
			await expect(rong).toBeVisible();
			ghiChu('nguyên văn trạng thái rỗng', chuan(await rong.innerText()));
		} finally { await ps.dong(); }
	});

	// ───────── Vai gdv — form thu hồi nợ (GDV thao tác thật trên khách rác) ─────────

	test('34_060_006 — Huỷ giữa chừng khi thu hồi nợ', async ({ page }) => {
		chanNeuTat('34_060_006');
		canTienDe();
		const gui = [];
		page.on('request', (r) => { if (/customer\/create-debt/.test(r.url())) gui.push(r.method()); });
		await moKhach(page);
		await moThe(page, 'Công nợ');
		const truoc = await giaTri(page, 'Tiền còn nợ');
		const dr = await moThanhToan(page);
		await dr.getByPlaceholder('Số tiền thanh toán').fill('10000');
		await dr.locator('.ant-drawer-close').click();
		await page.waitForTimeout(2_000);
		await page.reload(); await page.waitForTimeout(4_000);
		await moThe(page, 'Công nợ');
		const sau = await giaTri(page, 'Tiền còn nợ');
		ghiChu('đo', `còn nợ ${truoc} → ${sau} · request ${gui.length}`);
		expect(gui).toEqual([]);
		expect(sau).toBe(truoc);
	});

	for (const [id, ten, soTien, mong] of [
		['34_060_007', 'Thu hồi nợ với số tiền bằng 0', () => 0, /lớn hơn 0/],
		['34_060_008', 'Thu hồi nợ vượt số tiền còn nợ', (n) => n + 100_000, /vượt|lớn hơn số (tiền )?còn nợ|không được lớn hơn|tối đa/i],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			canTienDe();
			await moKhach(page);
			await moThe(page, 'Công nợ');
			const truoc = await giaTri(page, 'Tiền còn nợ');
			const gui = [];
			await page.route((u) => /customer\/create-debt/.test(u.pathname), async (route) => {
				gui.push(route.request().postDataJSON());
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
			});
			const dr = await moThanhToan(page);
			const o = dr.getByPlaceholder('Số tiền thanh toán');
			await o.fill(String(soTien(truoc)));
			await page.waitForTimeout(800);
			const gt = await o.inputValue();
			await dr.getByRole('button', { name: 'Lưu', exact: true }).click();
			await page.waitForTimeout(1_500);
			const tb = await g.thongBao(page);
			const loi = (await dr.locator('.ant-form-item-explain-error').allInnerTexts()).map(chuan);
			ghiChu('nguyên văn', `nợ ${truoc} · gõ ${soTien(truoc)} ⇒ ô "${gt}" · tb "${tb}" · lỗi ô ${loi.join(' | ')} · FE ${gui.length ? `GỬI (${JSON.stringify(gui[0]?.totalAmount)})` : 'không gửi'} (request bị chặn)`);
			expect(gui.length === 0 || soTu(gt) <= truoc, 'Số tiền không hợp lệ vẫn được gửi đi').toBe(true);
			if (gui.length === 0) expect(`${tb} ${loi.join(' ')}`).toMatch(mong);
		});
	}

	test('34_040_001 — Thu hồi nợ khách hàng sinh phiếu thu', async ({ page, browser }) => {
		chanNeuTat('34_040_001');
		canTienDe();
		const THU = 10_000;
		await moKhach(page);
		await moThe(page, 'Công nợ');
		const truoc = await giaTri(page, 'Tiền còn nợ');
		test.skip(!truoc || truoc < THU, `Khách rác không còn đủ nợ (${truoc}) — xoá test-output/tien-de-34.json để dựng lại.`);
		const t0 = Date.now();
		const dr = await moThanhToan(page);
		await dr.getByPlaceholder('Số tiền thanh toán').fill(String(THU));
		await page.waitForTimeout(800);
		const cho = page.waitForResponse((r) => /customer\/create-debt/.test(r.url()), { timeout: 30_000 });
		await dr.getByRole('button', { name: 'Lưu', exact: true }).click();
		const r = await cho;
		const body = r.request().postDataJSON();
		const b = await r.json().catch(() => null);
		const tb = await g.thongBao(page);
		await page.waitForTimeout(3_000);
		const sau = await giaTri(page, 'Tiền còn nợ');
		// Tách "màn không tự làm mới" khỏi "nợ không giảm": mở lại chi tiết khách, chờ tối đa 60s.
		let moLai = null;
		const tMoLai = Date.now();
		while (Date.now() - tMoLai < 60_000) {
			await moKhach(page);
			await moThe(page, 'Công nợ');
			moLai = await giaTri(page, 'Tiền còn nợ');
			if (moLai === truoc - THU) break;
			await page.waitForTimeout(10_000);
		}
		ghiChu('mở lại chi tiết', `sau ${Math.round((Date.now() - tMoLai) / 1000)}s: Tiền còn nợ ${moLai}`);
		// Phiếu thu: đọc bằng phiên phụ CHT (GDV nhận 401 ở view_all_receipts — xem 26).
		const cht = await g.k.moPhienPhu(browser, 'shop', '/receipt');
		let phieu = [];
		try {
			const d0 = new Date(); d0.setHours(0, 0, 0, 0);
			const ds = await g.k.goiGhi(cht.page, cht.st, 'GET', '/expenses/view_all_receipts', { shopId: cht.st.h.shopid, pageNum: 1, pageSize: 100, page: 0, size: 100, start_date: d0.getTime(), end_date: d0.getTime() + 86_400_000 - 1000, sort: 'createdDate,DESC' });
			phieu = (ds?.data?.content ?? ds?.data ?? []).filter((x) => Number(x.totalMoney ?? x.totalAmount ?? x.money) === THU && new Date(x.createdDate ?? x.createdAt ?? 0).getTime() >= t0 - 60_000).map((x) => ({ code: x.orderCode ?? x.code, cat: x.cateName ?? x.categoryName, tien: x.totalMoney ?? x.totalAmount, pttt: x.paymentMethod ?? x.paymentType, quy: x.fundName ?? x.fundId }));
		} finally { await cht.dong(); }
		ghiChu('đo', `body ${JSON.stringify({ type: body.type, totalAmount: body.totalAmount, catName: body.catName, createdBy: body.createdBy ?? null, fundId: body.fundId ?? null, paymentMethod: body.paymentMethod, orders: body.orders })} · ${b?.status?.code} · tb "${tb}" · nợ ${truoc} → ${sau} · phiếu thu ${JSON.stringify(phieu)}`);
		expect(tb).toContain('Thêm thành công');
		expect(moLai, 'Mở lại chi tiết khách mà "Tiền còn nợ" vẫn chưa giảm').toBe(truoc - THU);
		expect.soft(sau, 'Lưu xong, thẻ Công nợ không tự làm mới "Tiền còn nợ" (phải mở lại màn mới thấy)').toBe(truoc - THU);
		expect(phieu.length, 'Không sinh phiếu thu tương ứng').toBeGreaterThan(0);
		expect(phieu[0].cat, 'Phiếu thu không mang nội dung "Thu hồi nợ"').toMatch(/Thu hồi nợ/);
	});

	// ───────── Vai shop ─────────

	test('34_060_003 — Đổi bộ lọc thì quay về trang đầu', async ({ browser }) => {
		chanNeuTat('34_060_003');
		const ps = await moBc(browser);
		try {
			const pg = khung(ps.page).locator('.ant-pagination').last();
			test.skip((await pg.locator('.ant-pagination-item').count()) < 2, 'Danh sách công nợ chỉ có 1 trang ở vai shop.');
			const n1 = ps.bat.length;
			await pg.locator('.ant-pagination-item-2').click();
			await expect.poll(() => ps.bat.length, { timeout: 15_000 }).toBeGreaterThan(n1);
			const q1 = Object.fromEntries(new URL(ps.bat[ps.bat.length - 1].url).searchParams);
			const r = await tim(ps, 'A7');
			const q2 = Object.fromEntries(new URL(r.url).searchParams);
			const act = chuan(await pg.locator('.ant-pagination-item-active').innerText().catch(() => '1'));
			ghiChu('đo', `trang 2 ${JSON.stringify(q1)} · đổi lọc ${JSON.stringify(q2)} · trang đang chọn ${act}`);
			expect(q1.page).toBe('1');
			expect(q2.page).toBe('0');
			expect(act).toBe('1');
		} finally { await ps.dong(); }
	});
});
