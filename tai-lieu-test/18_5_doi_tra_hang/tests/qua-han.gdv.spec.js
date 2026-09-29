'use strict';

/**
 * 18_5 — đơn hoàn trả QUÁ HẠN chính sách (010_003, 050_003, 070_001–003).
 *
 * Tiền đề: chính sách tính theo NGÀY (`ReturnOrderServiceImpl.validateReturnPolicy`: createdDate + N ngày < now ⇒ quá hạn
 * ⇒ đơn hoàn trả vào "Chờ duyệt"). Không có đơn cũ ⇒ tạm đặt `RETURN_POLICY_DAYS = 1` (cấu hình CHUỖI, môi trường test —
 * user cho phép 25/09) bằng `han-hoan-tra.gdv.spec.js` (tài khoản gốc CORP_ADMIN) rồi hoàn trả đơn bán HÔM QUA của GDV; khôi phục bằng VNPOST_HAN_HOAN=goc.
 * Duyệt/từ chối cần quyền `approve_reject_return_order` ⇒ phiên phụ vai `shop` (CHT).
 *
 * 🔴 Ghi thật: đơn hoàn trả + nhập lại kho ở điểm bán seed; tạm sửa cấu hình chuỗi.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { GOC, BASE, SHOP, p, chuan, sp, chanNeuTat, moDoiTra, hoanTra } = require('./doi-tra');

const LANE = process.env.VNPOST_LANE || 'x';
const SO = path.join(GOC, 'test-output', `qua-han.lane${LANE}.json`);
const KEY = 'RETURN_POLICY_DAYS';
const doc = () => { try { return JSON.parse(fs.readFileSync(SO, 'utf8')); } catch { return {}; } };
const ghi = (x) => { fs.mkdirSync(path.dirname(SO), { recursive: true }); fs.writeFileSync(SO, JSON.stringify({ ...doc(), ...x }, null, 1)); };

/** Hạn hiện hành (đọc `/api/v1/internal/configs` — cấu hình đang hiệu lực). */
async function hanHienTai(page, st) {
	const ds = (await p.k.goiApi(page, st, '/api/v1/internal/configs'))?.data || [];
	const c = (Array.isArray(ds) ? ds : ds.content || []).find((x) => x.configKey === KEY);
	return c && (c.isActive ?? c.active) !== false ? Number(c.configValue) : null;
}

/** Đơn bán HÔM QUA (hoặc cũ hơn, ≤ 7 ngày) còn hàng `sp().tc`, chưa có đơn hoàn trả nào. */
async function donCu(page, st, boQua = []) {
	const d0 = new Date(); d0.setHours(0, 0, 0, 0);
	const dem = [];
	try {
	for (let lui = 1; lui <= 7; lui += 1) {
		const b = await p.k.goiGhi(page, st, 'GET', `/orders/shops/${st.h.shopid}/v1.3`, {
			page: 0, size: 50, status: -1, orderBy: 'createdDate', startTime: d0.getTime() - lui * 86400_000, endTime: d0.getTime() - (lui - 1) * 86400_000 - 1,
		});
		const n = { lui, don: (b?.data || []).length, daTra: 0, khongSp: 0, huy: 0, st: JSON.stringify(b?.status?.code) };
		dem.push(n);
		for (const o of b?.data || []) {
			if (boQua.includes(o.orderId)) continue;
			const tra = await p.k.goiGhi(page, st, 'GET', '/orders/return-orders/get-all-by-order', { orderId: o.orderId });
			if ((tra?.data || []).length) { n.daTra += 1; continue; }
			const ct = (await p.k.goiApi(page, st, `/orders/shops/${st.h.shopid}/${o.orderId}/details`).catch(() => null))?.data;
			if (!JSON.stringify(ct || {}).includes(sp().tc)) { n.khongSp += 1; continue; }
			if (ct?.status != null && Number(ct.status) < 0) { n.huy += 1; continue; }
			return o.orderId;
		}
	}
	return null;
	} finally { test.info().annotations.push({ type: 'dò đơn cũ', description: JSON.stringify(dem) }); }
}

/** Hoàn trả 1 đơn cũ ⇒ { orderId, returnOrderId, returnOrderCode, canhBao }. */
async function traDonCu(page, boQua) {
	const st = await p.moBan(page, test);
	const orderId = await donCu(page, st, boQua);
	// ⏳ 25/09/2026: điểm bán seed chưa có đơn bán nào trước hôm nay (thanh toán POS mới thông chiều 25/09); hạn nhỏ nhất = 1 ngày
	//    (0 = tắt kiểm tra) ⇒ sớm nhất chạy được từ chiều 26/09/2026.
	test.skip(!orderId, 'Chờ thời gian: chưa có đơn bán ≥ 1 ngày (RETURN_POLICY_DAYS = 1) chưa hoàn trả ở điểm bán seed — sớm nhất chiều 26/09/2026');
	await moDoiTra(page, orderId);
	const canhBao = chuan(await page.locator('.ant-alert, .ant-message-notice, .ant-notification-notice').allInnerTexts().then((x) => x.join(' | ')).catch(() => ''));
	const { tb, body } = await hoanTra(page);
	await p.donTab(page).catch(() => null);
	return { orderId, tb, returnOrderId: body?.data?.returnOrderId, returnOrderCode: body?.data?.returnOrderCode, canhBao, status: body?.data?.status };
}

async function dsShop(browser, loc = 'Chờ duyệt') {
	const ps = await p.k.moPhienPhu(browser, 'shop', '/order/return-orders');
	const pg = ps.page;
	await expect(pg.locator('.ant-table-tbody').first()).toBeVisible({ timeout: 60_000 });
	if (loc) {
		const cho = pg.waitForResponse((r) => r.url().includes('/orders/return-orders') && r.request().method() === 'GET', { timeout: 30_000 }).catch(() => null);
		await pg.locator('.ant-select').filter({ hasText: 'Chọn trạng thái' }).first().click();
		await pg.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${loc}$`) }).first().click();
		await cho;
		await pg.waitForTimeout(1_500);
	}
	return ps;
}

test.describe.serial('18_5 — Đơn hoàn trả quá hạn', () => {
	test.describe.configure({ timeout: 300_000 });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });

	test.beforeAll(async ({ browser }) => {
		const ps = await p.k.moPhienPhu(browser, 'gdv', '/order/return-orders');
		try {
			const han = await hanHienTai(ps.page, ps.st);
			ghi({ han });
			test.skip(han !== 1, `RETURN_POLICY_DAYS đang là ${han} — chạy trước bước cấu hình (tài khoản gốc): VNPOST_HAN_HOAN=1 … han-hoan-tra; xong: VNPOST_HAN_HOAN=goc`);
		} finally { await ps.dong(); }
	});

	test('18_5_050_003 — Đơn gốc quá hạn thì đơn hoàn trả nằm ở Chờ duyệt', async ({ page, browser }) => {
		chanNeuTat('18_5_050_003');
		const a = await traDonCu(page, []);
		test.info().annotations.push({ type: 'đơn A', description: JSON.stringify(a) });
		ghi({ a, canhBao: a.canhBao });
		expect(a.returnOrderCode, `Không tạo được đơn hoàn trả: "${a.tb}"`).toBeTruthy();
		const b = await traDonCu(page, [a.orderId]);
		test.info().annotations.push({ type: 'đơn B', description: JSON.stringify(b) });
		ghi({ b });
		const ps = await dsShop(browser);
		try {
			const t = chuan(await ps.page.locator('.ant-table-tbody').first().innerText());
			expect(t, 'Đơn hoàn trả của đơn quá hạn không nằm ở "Chờ duyệt"').toContain(a.returnOrderCode);
		} finally { await ps.dong(); }
	});

	test('18_5_010_003 — Cảnh báo khi đơn gốc quá thời hạn trả hàng', async () => {
		chanNeuTat('18_5_010_003');
		const { a, canhBao } = doc();
		test.skip(!a, 'Chưa có đơn quá hạn (050_003 chưa chạy)');
		test.info().annotations.push({ type: 'cảnh báo đo được', description: `mở đổi trả: "${canhBao}" · bấm Hoàn trả: "${a.tb}"` });
		expect(`${canhBao} ${a.tb}`, 'Đơn gốc quá hạn mà không có cảnh báo nào').toMatch(/quá hạn|hết hạn|thời hạn|chờ duyệt|phê duyệt/i);
	});

	test('18_5_140_008 — Chặn đổi hàng khi đơn hoàn trả đang chờ duyệt', async ({ page }) => {
		chanNeuTat('18_5_140_008');
		// BE `createReturnExchangeOrder` (mode REFUND_EXCHANGE): tạo phiếu trả (đơn quá hạn ⇒ PENDING) rồi `createPartialExchange`
		// chặn "Đơn hoàn trả đang chờ duyệt, chưa được phép đổi hàng" (cả giao dịch rollback — không để lại phiếu).
		// Đổi mode của request hoàn trả thật sang REFUND_EXCHANGE + exchangeOrder tối thiểu (validate chỉ cần khác null).
		const { a, b } = doc();
		const st = await p.moBan(page, test);
		const orderId = await donCu(page, st, [a?.orderId, b?.orderId].filter(Boolean));
		test.skip(!orderId, 'Chờ thời gian: chưa có đơn bán ≥ 1 ngày chưa hoàn trả (thứ 3) ở điểm bán seed');
		await moDoiTra(page, orderId);
		await page.route('**/create-return-exchange**', async (route) => {
			const body = route.request().postDataJSON();
			body.mode = 'REFUND_EXCHANGE';
			body.exchangeOrder = body.exchangeOrder || { items: [] };
			await route.continue({ postData: JSON.stringify(body) });
		});
		const x = await hoanTra(page);
		await page.unrouteAll({ behavior: 'ignoreErrors' });
		await p.donTab(page).catch(() => null);
		const loi = chuan(x.body?.status?.message || x.tb).replace(/\s*\([A-Za-z0-9]{6}\)$/, '');
		test.info().annotations.push({ type: 'đo', description: `đơn ${orderId} · "${x.tb}" · ${JSON.stringify(x.body?.status)}` });
		expect(loi).toBe('Đơn hoàn trả đang chờ duyệt, chưa được phép đổi hàng');
	});

	test('18_5_070_001 — Lọc đơn Chờ duyệt và ba biểu tượng hành động', async ({ browser }) => {
		chanNeuTat('18_5_070_001');
		const { a } = doc();
		test.skip(!a?.returnOrderCode, 'Chưa có đơn quá hạn (050_003)');
		const ps = await dsShop(browser);
		try {
			const dong = ps.page.locator('.ant-table-tbody tr.ant-table-row');
			const tt = (await dong.allInnerTexts()).map(chuan);
			test.info().annotations.push({ type: 'dòng', description: tt.join(' || ').slice(0, 600) });
			for (const x of tt) expect(x, 'Lọc Chờ duyệt lẫn trạng thái khác').toContain('Chờ duyệt');
			const d = dong.filter({ hasText: a.returnOrderCode }).first();
			await expect(d.locator('button')).toHaveCount(3);
			await expect(d.locator('[aria-label="check"]')).toHaveCount(1);
			await expect(d.locator('[aria-label="info-circle"]')).toHaveCount(1);
			await expect(d.locator('[aria-label="close"]')).toHaveCount(1);
		} finally { await ps.dong(); }
	});

	for (const [id, key, nut, tb, sau] of [
		['18_5_070_002', 'a', 'check', 'Phê duyệt đơn hoàn trả thành công', /Hoàn thành/],
		['18_5_070_003', 'b', 'close', 'Từ chối đơn hoàn trả thành công', /Từ chối/],
	]) {
		test(`${id} — ${key === 'a' ? 'Phê duyệt' : 'Từ chối'} đơn hoàn trả quá hạn`, async ({ browser }) => {
			chanNeuTat(id);
			const x = doc()[key];
			test.skip(!x?.returnOrderCode, `Chưa có đơn quá hạn ${key.toUpperCase()} (050_003)`);
			const ps = await dsShop(browser);
			try {
				const pg = ps.page;
				const d = pg.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: x.returnOrderCode }).first();
				await d.locator(`[aria-label="${nut}"]`).click();
				await pg.locator('.ant-popconfirm').last().getByRole('button', { name: 'Đồng ý' }).click();
				const n = pg.locator('.ant-message-notice');
				await n.first().waitFor({ state: 'visible', timeout: 20_000 });
				const t = chuan((await n.allInnerTexts()).join(' | '));
				test.info().annotations.push({ type: 'thông báo', description: t });
				expect(t).toContain(tb);
			} finally { await ps.dong(); }
			const ps2 = await dsShop(browser, null);
			try {
				const t = chuan(await ps2.page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: x.returnOrderCode }).first().innerText());
				test.info().annotations.push({ type: 'trạng thái sau', description: t });
				expect(t).toMatch(sau);
			} finally { await ps2.dong(); }
		});
	}
});
