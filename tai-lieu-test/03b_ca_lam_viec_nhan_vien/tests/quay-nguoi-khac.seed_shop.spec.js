'use strict';

/**
 * 03b_030_006 — Quầy đang có ca chưa chốt của NGƯỜI KHÁC thì không mở được (điểm bán seed làn).
 *
 * Tiền đề (tầng "dùng lại được", dựng trong spec): GDV của làn (`gdv`, cùng điểm bán) giữ một ca OPEN hôm nay ở quầy đang hoạt động
 * — POS tự mở qua `18_1/tests/pos-18.js › bamCa` (quầy "Quầy 01", đo 28/09 làn 8). Chưa có thì spec mở giùm bằng phiên phụ `gdv`.
 * Người thử mở ca = CHT của điểm bán (`seed_shop`, người KHÁC gdv), chọn đúng quầy đó.
 *
 * Trace vnpost-web f9c5c858 `features/timekeeping/pages/WorkShiftPage.jsx › handleOpenShiftError`: BE trả `COUNTER_HAS_OPEN_SHIFT`
 * (COUNTER-003) / `SHOP_HAS_OPEN_SHIFT` (SHIFT-005) ⇒ `modal.info` "Quầy đang có ca chưa chốt" (Descriptions: Nhân viên · Ca làm việc ·
 * Quầy thu ngân · Thời gian mở · Tiền mở ca), nút duy nhất "Đã hiểu".
 * 🔴 Nếu KHÔNG bị chặn thì CHT mở ca thật trên quầy của gdv (đó chính là lỗi cần báo).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const ka = require('../../shared/kho-api');
const { chuan, khungMan, moManCaCaNhan } = require('./shift-card');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_shop';

/** Ca OPEN hôm nay của NGƯỜI KHÁC ở điểm bán làn: { id, userId, counterId, quay } | null. */
function caNguoiKhac() {
	const r = ka.sql(`select r.id, r.user_id, r.counter_id, c.name from SHOP_SHIFT_REPORT r join SHOP_CASHIER_COUNTER c on c.counter_id=r.counter_id
		where r.shop_id=${ka.d().diemBan.shopId} and r.status='OPEN' and c.active=1 and r.work_date >= curdate()
		order by r.id desc limit 1`);
	if (!r) return null;
	const [id, userId, counterId, quay] = r.split('\t');
	return { id: Number(id), userId: Number(userId), counterId: Number(counterId), quay };
}

test.describe('03b — Quầy bị người khác giữ ca', () => {
	test.describe.configure({ timeout: 240_000 });

	test('03b_030_006 — Quầy đang có ca chưa chốt của người khác thì không mở được', async ({ page, browser }) => {
		const ly = skipReason(loadCaseInput(GOC, '03b_030_006'));
		test.skip(Boolean(ly), ly ?? '');
		// Tiền đề: gdv giữ ca mở hôm nay (mở giùm nếu chưa có).
		let giu = caNguoiKhac();
		if (!giu) {
			const pos10 = require('../../10_bang_gia_ban_san_pham/tests/pos-10');
			const ctx = await browser.newContext({ storageState: require('../../shared/auth/accounts').storageStateFor('gdv') });
			try { await pos10.moCa(await ctx.newPage(), test); } finally { await ctx.close(); }
			giu = caNguoiKhac();
		}
		expect(giu, 'Không dựng được ca OPEN của gdv hôm nay').toBeTruthy();

		await moManCaCaNhan(page, VAI);
		const nutMo = khungMan(page).getByRole('button', { name: 'Mở ca' }).first();
		test.skip(!(await nutMo.count()), `CHT (${VAI}) không có nút "Mở ca" hôm nay — không có ca, ca đã mở, hoặc ngoài khung giờ`);
		const caCuaToiTruoc = Number(ka.sql(`select count(*) from SHOP_SHIFT_REPORT where shop_id=${ka.d().diemBan.shopId} and status='OPEN' and counter_id=${giu.counterId} and user_id<>${giu.userId}`));
		expect(caCuaToiTruoc, 'Quầy đã có ca OPEN của người thứ ba — tiền đề bẩn').toBe(0);

		await nutMo.click();
		const dr = page.locator('.ant-drawer-open').last();
		await expect(dr.locator('.ant-drawer-title')).toHaveText('Mở ca làm việc', { timeout: 20_000 });
		// Chọn ĐÚNG quầy gdv đang giữ. 🔴 antd v6: không có `.ant-select-selection-item` — đọc chữ của cả Select.
		const oQuay = dr.locator('.ant-select:has(#counterId)');
		if (!chuan(await oQuay.innerText()).includes(chuan(giu.quay))) {
			await dr.locator('#counterId').click();
			const dd = page.locator('.ant-select-dropdown:has(#counterId_list)').last();
			await dd.waitFor({ state: 'visible', timeout: 20_000 });
			await dd.locator('.ant-select-item-option').filter({ hasText: giu.quay }).first().click();
		}
		await expect(oQuay).toContainText(giu.quay);
		const choMo = page.waitForResponse((r) => /shift-report\/open-shift/.test(r.url()) && r.request().method() === 'POST', { timeout: 60_000 });
		await dr.getByRole('button', { name: 'Mở ca', exact: true }).last().click();
		await page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận mở ca' }).getByRole('button', { name: 'Xác nhận' }).click();
		const res = await choMo;
		const b = await res.json().catch(() => null);

		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Quầy đang có ca chưa chốt' }).last();
		const coHop = await hop.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false);
		const chu = coHop ? chuan(await hop.innerText()) : '';
		const nut = coHop ? (await hop.getByRole('button').allInnerTexts()).map(chuan) : [];
		const moMoi = Number(ka.sql(`select count(*) from SHOP_SHIFT_REPORT where shop_id=${ka.d().diemBan.shopId} and status='OPEN' and counter_id=${giu.counterId} and user_id<>${giu.userId}`));
		test.info().annotations.push({ type: 'đo', description: `quầy "${giu.quay}" đang giữ bởi user ${giu.userId} (ca ${giu.id}) · open-shift ${res.status()} ${JSON.stringify(b?.status)} · hộp: "${chu.slice(0, 300)}" · nút ${JSON.stringify(nut)} · ca OPEN mới của người khác trên quầy: ${moMoi}` });
		if (coHop) await hop.getByRole('button', { name: 'Đã hiểu' }).click().catch(() => null);

		expect(moMoi, '🔴 Mở được ca trên quầy đang có ca chưa chốt của người khác').toBe(0);
		expect(coHop, `Không hiện hộp "Quầy đang có ca chưa chốt" (API: ${JSON.stringify(b?.status)})`).toBe(true);
		for (const nhan of ['Nhân viên', 'Ca làm việc', 'Quầy thu ngân']) expect(chu, `Hộp thiếu dòng "${nhan}"`).toContain(nhan);
		expect(chu, 'Hộp không ghi tên quầy đang bị chiếm').toContain(chuan(giu.quay));
		expect(nut, 'Hộp phải chỉ có một nút "Đã hiểu"').toEqual(['Đã hiểu']);
	});
});
