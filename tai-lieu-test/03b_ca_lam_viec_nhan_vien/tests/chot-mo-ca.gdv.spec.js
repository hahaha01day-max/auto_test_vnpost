'use strict';

/**
 * 03b_030_007 · 03b_040_012 · 03b_040_011 — chốt / mở ca GHI THẬT (user cho phép ghi thật 28/09/2026 — mục C1), vai `gdv`.
 * 🔴 Chạy làn 5 (làn 8 đang khoá kỳ 09). Ghi quỹ tiền mặt thật của ca (0 tờ ⇒ 0đ) — không hoàn tác.
 *
 * Trace vnpost-web f9c5c858 `features/timekeeping/pages/WorkShiftPage.jsx`:
 * - Mở ca khi CHÍNH MÌNH còn ca chưa chốt ⇒ BE SHIFT-006/USER_HAS_OPEN_SHIFT ⇒ drawer chốt ca cũ với Alert "Bạn đang có ca chưa chốt,
 *   vui lòng chốt ca trước khi mở ca mới"; chốt xong ⇒ "Đã chốt ca cũ — tiếp tục mở ca mới", drawer mở ca hiện lại giữ số liệu đã nhập.
 * - Chốt ca: "Tạm chốt" (draft-close) → "Xác nhận chốt ca" (finalize, mang idempotencyKey) ⇒ "Đã chốt ca".
 * - 🔴 "Mở lại ca": nút + handler đang bị COMMENT (dòng ~651–658, ~1031–1037) ⇒ 040_011 không có đường thao tác trên giao diện.
 *
 * Tiền đề (dựng trong spec, bằng phiên phụ `shop`): ca rác `AUTO<làn>_CA_TOI1` 23:46–23:58, cho mở sớm 300 phút, xếp cho GDV hôm nay.
 * 🔴 BE chặn xếp 2 ca CHỒNG GIỜ cho cùng nhân viên ("Nhân viên bị trùng lịch tại ca …", đo 28/09) và ca AUTO<làn>_CA_DAI phủ 05:00–23:45
 *    ⇒ ca thứ hai phải nằm sau 23:45 và mở được nhờ khung mở sớm.
 * 🔴 FE ẨN "Mở ca" ở thẻ khác khi mình đang có ca mở hôm nay (đo 28/09) ⇒ luồng SHIFT-006 của 030_007 chỉ tới được khi ca còn treo là
 *    của NGÀY TRƯỚC. Thứ tự: 040_012 chốt ca đang mở (bấm 2 lần) → 040_011 → "tien de 03b ca cu chua chot" mở TOI1 và ĐỂ QUA ĐÊM →
 *    hôm sau 030_007 (chạy TRƯỚC mọi spec POS của làn — `pos-18.bamCa` tự chốt ca cũ).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const ka = require('../../shared/kho-api');
const { chuan, khungMan, moManCaCaNhan } = require('./shift-card');

const GOC = path.join(__dirname, '..');
const VAI = 'gdv';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const TEN = (i) => `${seed.PREFIX}CA_TOI${i}`;
const shopId = () => seed.doc().duLieu.diemBan.shopId;

/** Thẻ ca theo tên (thẻ có nút thao tác). */
const theCa = (page, ten) => khungMan(page).locator('div').filter({ has: page.getByText(ten, { exact: true }) }).filter({ has: page.getByRole('button') }).last();
const toast = async (page) => (await page.locator('.ant-message-notice').allInnerTexts()).map(chuan).join(' | ');

/** Mở ca ở drawer đang mở (chọn quầy nếu trống) → trả response open-shift. */
async function xacNhanMoCa(page, dr) {
	const oQuay = dr.locator('.ant-select:has(#counterId)');
	if ((await oQuay.count()) && /^Chọn quầy thu ngân$|^$/.test(chuan(await oQuay.innerText()))) {
		await dr.locator('#counterId').click();
		await page.locator('.ant-select-dropdown:has(#counterId_list) .ant-select-item-option:not(.ant-select-item-option-disabled)').first().click();
	}
	const cho = page.waitForResponse((r) => /shift-report\/open-shift/.test(r.url()) && r.request().method() === 'POST', { timeout: 60_000 });
	await dr.getByRole('button', { name: 'Mở ca', exact: true }).last().click();
	await page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận mở ca' }).getByRole('button', { name: 'Xác nhận' }).click();
	return cho;
}

/** Trong drawer chốt: Tạm chốt (nếu có) → trả drawer sẵn sàng bấm "Xác nhận chốt ca". */
async function tamChot(page, dr) {
	const nut = dr.getByRole('button', { name: 'Tạm chốt', exact: true });
	if (await nut.isVisible().catch(() => false)) {
		const cho = page.waitForResponse((r) => /shift-report\/draft-close/.test(r.url()), { timeout: 60_000 });
		await nut.click();
		await page.locator('.ant-modal-confirm').last().getByRole('button', { name: 'Xác nhận' }).click();
		const b = await (await cho).json().catch(() => ({}));
		expect(String(b?.status?.code), `Tạm chốt lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
		await page.waitForTimeout(1_500);
	}
	const lyDo = dr.locator('textarea').last();
	if (await lyDo.isVisible().catch(() => false)) await lyDo.fill('Auto test 03b — chốt ca thử (0 tờ)');
}

test.describe('03b — Chốt / mở ca (ghi thật)', () => {
	test.describe.configure({ mode: 'serial', timeout: 300_000 });
	let empId = null;

	test.beforeAll(async ({ browser }) => {
		test.setTimeout(180_000);
		const gio = new Date().getHours();
		test.skip(gio < 19 || gio >= 23, 'Cần chạy trong 19:00–23:00 (khung mở sớm 300 phút của ca 23:46)');
		// Tìm employeeId của GDV: lịch cá nhân của phiên gdv.
		const g = await k.moPhienPhu(browser, VAI, '/lich-ca-nhan/ca-lam-viec');
		try {
			const lich = await k.goiGhi(g.page, g.st, 'GET', '/timekeeping/schedule', { shopId: shopId() });
			const ds = [].concat(lich?.data?.content || lich?.data || []);
			empId = ds.map((x) => x?.employeeId ?? x?.sysUserId).find(Boolean) ?? Number(ka.sql(`select user_id from SHOP_SHIFT_REPORT where shop_id=${shopId()} and work_date>=curdate() order by id desc limit 1`));
		} finally { await g.dong(); }
		expect(empId, 'Không xác định được employeeId của GDV').toBeTruthy();
		// Tạo 2 ca rác chứa giờ chạy + xếp cho GDV hôm nay (bằng phiên CHT).
		const s = await k.moPhienPhu(browser, 'shop', '/employee/shift');
		try {
			for (const i of [1]) {
				let id = Number(ka.sql(`select coalesce(max(id),0) from SHOP_TIMEKEEPING_SHIFT where shop_id=${shopId()} and name='${TEN(i)}' and active=1 and coalesce(deleted,0)=0`));
				const ca = { id: id || 0, name: TEN(i), beginTime: '23:46', endTime: '23:58', salaryPerShift: 0, checkinAllowableMinutesBefore: 300, checkoutAllowableMinutesAfter: 0, shopId: shopId(), active: true, allowOverlap: true };
				const gioCu = id ? ka.sql(`select begin_time, end_time from SHOP_TIMEKEEPING_SHIFT where id=${id}`).replace('\t', '-') : '';
				if (!id || gioCu !== '23:46-23:58') {
					const r = await k.goiGhi(s.page, s.st, id ? 'PUT' : 'POST', '/timekeeping/shift', {}, ca);
					expect(String(r?.status?.code), `${id ? 'Sửa' : 'Tạo'} ca ${TEN(i)} lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
					id = id || Number(ka.sql(`select max(id) from SHOP_TIMEKEEPING_SHIFT where shop_id=${shopId()} and name='${TEN(i)}'`));
				}
				const co = Number(ka.sql(`select count(*) from EMPLOYEE_SCHEDULE where shop_id=${shopId()} and employee_id=${empId} and shift_id=${id} and date=curdate()`));
				if (!co) {
					const r = await k.goiGhi(s.page, s.st, 'POST', '/timekeeping/schedule', {}, { shopId: shopId(), employeeIds: [empId], shiftId: id, targetDate: new Date(new Date().toDateString()).getTime() });
					expect(String(r?.status?.code), `Xếp ${TEN(i)} cho GDV lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
				}
			}
		} finally { await s.dong(); }
	});

	test('03b_040_012 — Bấm chốt ca hai lần liên tiếp không tạo hai lần chốt', async ({ page }) => {
		chanNeuTat('03b_040_012');
		const [id, tenCa] = ka.sql(`select r.id, s.name from SHOP_SHIFT_REPORT r join SHOP_TIMEKEEPING_SHIFT s on s.id=r.shift_id where r.shop_id=${shopId()} and r.user_id=${empId} and r.status='OPEN' and r.work_date>=curdate() order by r.id desc limit 1`).split('\t');
		test.skip(!id, 'Tiền đề: GDV không có ca nào đang mở hôm nay');
		await moManCaCaNhan(page, VAI);
		await theCa(page, tenCa).getByRole('button', { name: /^(Chốt ca|Tiếp tục chốt)$/ }).click();
		const dr = page.locator('.ant-drawer-open').last();
		await expect(dr).toBeVisible({ timeout: 20_000 });
		await tamChot(page, dr);
		const fin = [];
		page.on('response', (r) => { if (/shift-report\/finalize/.test(r.url())) fin.push(r); });
		const nut = dr.getByRole('button', { name: 'Xác nhận chốt ca' });
		await nut.click();
		await nut.click({ timeout: 2_000, force: true }).catch(() => null);
		await page.waitForTimeout(5_000);
		const bs = await Promise.all(fin.map((r) => r.json().catch(() => null)));
		const keys = fin.map((r) => r.request().postDataJSON()?.idempotencyKey ?? '-');
		const tb = await toast(page);
		const [st, dong] = ka.sql(`select status, (select count(*) from SHOP_SHIFT_REPORT x where x.shop_id=r.shop_id and x.user_id=r.user_id and x.shift_id=r.shift_id and x.work_date=r.work_date) from SHOP_SHIFT_REPORT r where id=${id}`).split('\t');
		ghiDo(`ca #${id} (${tenCa}) · finalize gửi ${fin.length} lần ${JSON.stringify(bs.map((b) => b?.status?.code))} · idempotencyKey ${JSON.stringify(keys)} · thông báo "${tb}" · DB: trạng thái ${st}, số dòng báo cáo ca ${dong}`);
		expect(st, 'Ca không ở trạng thái đã chốt').toBe('CLOSED');
		expect(Number(dong), '🔴 Bấm hai lần sinh hai dòng báo cáo ca').toBe(1);
		expect((tb.match(/Đã chốt ca/g) || []).length, 'Hiện nhiều hơn một thông báo "Đã chốt ca"').toBeLessThanOrEqual(1);
		if (fin.length > 1) expect(new Set(keys).size, '🔴 Hai lần chốt mang idempotencyKey KHÁC nhau').toBe(1);
	});

	test('03b_040_011 — Mở lại ca đã chốt', async ({ page }) => {
		chanNeuTat('03b_040_011');
		const [id, tenCa] = ka.sql(`select r.id, s.name from SHOP_SHIFT_REPORT r join SHOP_TIMEKEEPING_SHIFT s on s.id=r.shift_id where r.shop_id=${shopId()} and r.user_id=${empId} and r.status='CLOSED' and r.work_date>=curdate() order by r.closed_at desc limit 1`).split('\t');
		test.skip(!id, 'Tiền đề: GDV chưa có ca nào chốt hôm nay (chạy 040_012 trước)');
		await moManCaCaNhan(page, VAI);
		const the = theCa(page, tenCa);
		const nut = the.getByRole('button', { name: 'Mở lại ca' });
		const co = await nut.count();
		ghiDo(`ca #${id} đã chốt · nút "Mở lại ca" trên thẻ: ${co} · nút trên thẻ ${JSON.stringify((await the.getByRole('button').allInnerTexts()).map(chuan))}`);
		expect(co, '🔴 Không có nút "Mở lại ca" — nút + handler đang bị comment ở WorkShiftPage.jsx').toBeGreaterThan(0);
		await nut.click();
		await page.waitForTimeout(2_000);
		expect(await toast(page)).toContain('Đã mở lại ca');
		await expect(the.getByRole('button', { name: 'Chốt ca' })).toBeVisible();
	});

	test('tien de 03b ca cu chua chot — mở ca TOI1 và để qua đêm', async ({ page }) => {
		const dangMo = Number(ka.sql(`select count(*) from SHOP_SHIFT_REPORT where shop_id=${shopId()} and user_id=${empId} and status='OPEN'`));
		test.skip(dangMo > 0, 'GDV đang có ca mở — tiền đề đã có (hoặc chạy 040_012 trước để chốt)');
		await moManCaCaNhan(page, VAI);
		const the = theCa(page, TEN(1));
		await expect(the.getByRole('button', { name: 'Mở ca' }), `Thẻ ${TEN(1)} không có nút Mở ca`).toBeVisible({ timeout: 20_000 });
		await the.getByRole('button', { name: 'Mở ca' }).click();
		const dr = page.locator('.ant-drawer-open').last();
		await expect(dr.locator('.ant-drawer-title')).toHaveText('Mở ca làm việc', { timeout: 20_000 });
		const b = await (await xacNhanMoCa(page, dr)).json().catch(() => null);
		ghiDo(`mở ${TEN(1)} (23:46–23:58, mở sớm 300') ⇒ ${JSON.stringify(b?.status)} — ĐỂ NGUYÊN qua đêm làm tiền đề 030_007`);
		expect(String(b?.status?.code), `Mở ${TEN(1)} lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
	});

	test('03b_030_007 — Chính mình còn ca chưa chốt thì hệ thống tự chốt ca cũ rồi mở ca mới', async ({ page }) => {
		chanNeuTat('03b_030_007');
		const cu = Number(ka.sql(`select count(*) from SHOP_SHIFT_REPORT where shop_id=${shopId()} and user_id=${empId} and status='OPEN' and work_date < curdate()`));
		test.skip(!cu, 'Tiền đề: GDV cần một ca NGÀY TRƯỚC còn mở — chạy test "tien de 03b ca cu chua chot" hôm trước rồi chạy case này hôm sau, TRƯỚC mọi spec POS của làn');
		await moManCaCaNhan(page, VAI);
		const nutMo = khungMan(page).getByRole('button', { name: 'Mở ca', exact: true }).first();
		await expect(nutMo, 'Hôm nay không có thẻ ca nào hiện nút Mở ca').toBeVisible({ timeout: 20_000 });
		await nutMo.click();
		let dr = page.locator('.ant-drawer-open').last();
		await expect(dr.locator('.ant-drawer-title')).toHaveText('Mở ca làm việc', { timeout: 20_000 });
		const tien = dr.getByRole('spinbutton').first();
		await tien.fill('1'); // số tờ mệnh giá đầu — dữ liệu "đã nhập" để đo có giữ nguyên không
		const res1 = await xacNhanMoCa(page, dr);
		const b1 = await res1.json().catch(() => null);
		// Drawer chốt ca cũ + Alert.
		dr = page.locator('.ant-drawer-open').last();
		const alert = dr.locator('.ant-alert').filter({ hasText: 'Bạn đang có ca chưa chốt' });
		const coAlert = await alert.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false);
		const chuAlert = coAlert ? chuan(await alert.innerText()) : '';
		await tamChot(page, dr);
		const choF = page.waitForResponse((r) => /shift-report\/finalize/.test(r.url()), { timeout: 60_000 });
		await dr.getByRole('button', { name: 'Xác nhận chốt ca' }).click();
		const bF = await (await choF).json().catch(() => null);
		await page.waitForTimeout(1_500);
		const tb = await toast(page);
		const drMo = page.locator('.ant-drawer-open').filter({ hasText: 'Mở ca làm việc' }).last();
		const moLai = await drMo.isVisible().catch(() => false);
		const giuSo = moLai ? await drMo.getByRole('spinbutton').first().inputValue() : null;
		let bMo = null;
		if (moLai) bMo = await (await xacNhanMoCa(page, drMo)).json().catch(() => null);
		ghiDo(`mở ca hôm nay khi còn ca ngày trước ⇒ ${JSON.stringify(b1?.status)} · Alert: "${chuAlert}" · chốt ca cũ ${JSON.stringify(bF?.status)} · thông báo "${tb}" · drawer mở ca hiện lại: ${moLai}, ô tờ đầu "${giuSo}" · mở ca mới ${JSON.stringify(bMo?.status)}`);
		expect(coAlert, 'Không hiện Alert "Bạn đang có ca chưa chốt…"').toBe(true);
		expect(chuAlert).toContain('Chốt xong hệ thống sẽ tự mở lại màn hình mở ca, giữ nguyên thông tin bạn đã nhập.');
		expect(tb).toContain('Đã chốt ca cũ — tiếp tục mở ca mới');
		expect(moLai, 'Chốt xong không tự mở lại drawer mở ca').toBe(true);
		expect(giuSo, 'Drawer mở ca hiện lại KHÔNG giữ số liệu đã nhập').toBe('1');
		expect(String(bMo?.status?.code), `Mở ca mới lỗi: ${JSON.stringify(bMo?.status)}`).toBe('200');
	});

});
