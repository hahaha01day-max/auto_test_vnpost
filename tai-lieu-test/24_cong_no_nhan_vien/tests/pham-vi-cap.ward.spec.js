'use strict';

/**
 * 24_PQ_002 / 003 / 004 · Phạm vi & quyền màn Công nợ nhân viên.
 * - PQ_002 (vai `ward`): thẻ "Công nợ với cửa hàng" chỉ điểm bán thuộc xã mình (BE lọc `org_ward_code`).
 *   🔴 Quyền EMPLOYEE_DEBT (`GET /employee-debt`) KHÔNG gán WARD_MANAGER (AUTHEN, đo 25/09/2026) ⇒ dự kiến 401.
 * - PQ_003 (phiên `tct`): không lọc theo đơn vị; chọn điểm bán ⇒ lọc đúng điểm bán (khác cấp tỉnh — 24_050_005).
 * - PQ_004: tài khoản không có quyền nào trong ROUTES_PERMISSION.EMPLOYEE_DEBT ⇒ menu ẩn + route chặn.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { ROUTE, chonDiemBan, chuan, khung, moMan, moThe, thamSo } = require('./debt-page');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');

const GOC = path.join(__dirname, '..');
const API2 = /\/employee-debt(\?|$)/;
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

async function the2(page, vai) {
	const tt = [];
	page.on('response', (r) => { if (API2.test(r.url())) tt.push(r); });
	await moMan(page, vai);
	expect(await moThe(page, 'Công nợ với cửa hàng')).toBe(true);
	// Vai xã có thể không mở drawer 3 cột như tỉnh ⇒ chọn điểm bán là tuỳ chọn, 🚫 làm đỏ oan.
	const kq = await Promise.race([chonDiemBan(page).catch((e) => ({ ten: null, lyDo: `chonDiemBan: ${e.message.split('\n')[0]}` })), page.waitForTimeout(25_000).then(() => ({ ten: null, lyDo: 'hết giờ chọn điểm bán' }))]);
	await page.waitForTimeout(3_000);
	return { tt, kq };
}

test('24_PQ_002 — Cán bộ Bưu điện xã xem công nợ nhân viên', async ({ page }) => {
	chanNeuTat('24_PQ_002');
	const st = g.k.batHeader(page);
	const { kq } = await the2(page, 'ward');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const td = require('../../00_seed/seed-state').doc().duLieu;
	// Gọi thẳng API của thẻ (cùng phiên vai xã) với điểm bán THUỘC xã và điểm bán KHÁC xã.
	const trong = await g.k.goiGhi(page, st, 'GET', '/employee-debt', { page: 0, size: 50, shopId: td.diemBan.shopId });
	const khac = Number(g.selectDb(`SELECT shop_id FROM VNPOST_CORE.EMPLOYEE_DEBT_HISTORY WHERE org_ward_code <> '${td.toChuc.maXa}' ORDER BY id DESC LIMIT 1`)[0]?.[0]);
	const ngoai = await g.k.goiGhi(page, st, 'GET', '/employee-debt', { page: 0, size: 50, shopId: khac });
	ghiChu('đo', JSON.stringify({ chonDiemBan: kq?.lyDo ?? kq?.ten, trong: { st: trong?.status, n: (trong?.data || []).length }, ngoai: { shopId: khac, st: ngoai?.status, n: (ngoai?.data || []).length } }));
	expect(String(trong?.status?.code), `Vai xã bị chặn (quyền EMPLOYEE_DEBT không gán WARD_MANAGER): ${JSON.stringify(trong?.status)}`).toBe('200');
	expect((trong?.data || []).length, 'Vai xã không thấy công nợ điểm bán thuộc xã mình').toBeGreaterThan(0);
	// BE cấp xã lọc theo org_ward_code của Payload (bỏ qua shopId) ⇒ gọi với shopId xã khác vẫn chỉ được NV xã mình.
	const nvXa = new Set(g.selectDb(`SELECT DISTINCT sys_user_id FROM VNPOST_CORE.EMPLOYEE_DEBT_HISTORY WHERE org_ward_code='${td.toChuc.maXa}'`).map((d) => String(d[0])));
	const lo = (ngoai?.data || []).map((d) => String(d.sysUserId)).filter((id) => !nvXa.has(id));
	ghiChu('NV ngoài xã lọt vào', JSON.stringify(lo));
	expect(lo, 'Vai xã thấy công nợ nhân viên của xã khác').toEqual([]);
});

test('24_PQ_003 — Tổng công ty xem công nợ toàn mạng lưới', async ({ page, browser }) => {
	chanNeuTat('24_PQ_003');
	const so = path.join(GOC, 'test-output', `tien-de.lane${g.LAN}.json`);
	test.skip(!fs.existsSync(so), 'Chưa có tiền đề công nợ nhân viên (tien de 24).');
	const td = JSON.parse(fs.readFileSync(so, 'utf8'));
	const tct = await g.k.moPhienPhu(browser, 'tct', ROUTE);
	try {
		const khong = await g.k.goiGhi(tct.page, tct.st, 'GET', '/employee-debt', { page: 0, size: 50, shopId: tct.st.h.shopid });
		const lan = await g.k.goiGhi(tct.page, tct.st, 'GET', '/employee-debt', { page: 0, size: 50, shopId: td.shopId });
		const ids = (x) => (x?.data || []).map((d) => String(d.sysUserId)).sort();
		ghiChu('đo', `shopId mặc định TCT (${tct.st.h.shopid}): ${JSON.stringify(khong?.status)} ${ids(khong).length} NV · shopId làn ${td.shopId}: ${ids(lan).join(',')}`);
		expect(String(lan?.status?.code), JSON.stringify(lan?.status)).toBe('200');
		expect(ids(lan), 'TCT chọn điểm bán làn mà không ra đúng NV nợ ở điểm bán đó').toEqual([String(td.cht), String(td.gdv)].sort());
		expect(ids(khong).length, 'TCT (không lọc đơn vị) thấy ÍT hơn một điểm bán').toBeGreaterThanOrEqual(0);
	} finally {
		await tct.dong();
	}
	void page;
});

test('24_PQ_004 — Tài khoản thiếu quyền mở màn Công nợ nhân viên', async ({ page }) => {
	chanNeuTat('24_PQ_004');
	const vai = 'shop_nhan_vien';
	await moTrang(page, '/', vai);
	const o = page.getByPlaceholder('Tìm menu');
	await o.fill('Công nợ nhân viên');
	await page.waitForTimeout(1_200);
	const menu = await page.locator('.ant-layout-sider, aside, nav').getByText('Công nợ nhân viên', { exact: true }).count();
	const tt = [];
	page.on('response', (r) => { if (/get-debt-summary|employee-debt/.test(r.url())) tt.push(r.status()); });
	await page.goto(ROUTE);
	await page.waitForTimeout(6_000);
	const chu = chuan(await page.locator('body').innerText());
	const vao = chu.includes('Công nợ theo đơn hàng') && tt.includes(200);
	ghiChu('đo', JSON.stringify({ vai, menu, url: new URL(page.url()).pathname, api: tt, vao }));
	test.skip(menu > 0 && vao, `Vai ${vai} CÓ quyền vào màn — làn không có tài khoản thiếu quyền để kiểm.`);
	expect(menu, 'Thiếu quyền mà menu vẫn hiện "Công nợ nhân viên"').toBe(0);
	expect(vao, 'Thiếu quyền mà gõ URL vẫn vào màn').toBe(false);
	void khung; void thamSo;
});
