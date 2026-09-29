'use strict';

/**
 * 18_5 — nhóm case SAU KHI chốt đơn hoàn trả (vai `gdv`, điểm bán seed làn).
 *
 * 25/09/2026: GDV đã tạo được đơn hoàn trả cho đơn TIỀN MẶT (`POST /orders/return-orders/create-return-exchange`
 * ⇒ "Tạo đơn hoàn trả thành công"; vẫn nổ kèm một thông báo phụ "Không có quyền truy cập") ⇒ gỡ vỏ.
 * Mọi case dùng CHUNG một đơn hoàn trả tạo ở `beforeAll`-lười (lần đầu gọi `dh()`), lưu file để worker restart dùng lại.
 *
 * 🔴 Ghi thật: tạo đơn bán + đơn hoàn trả + nhập lại kho ở điểm bán seed (được phép theo bàn giao).
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { GOC, BASE, SHOP, p, chuan, sp, chanNeuTat, banDon, moDoiTra, hoanTra, damBaoLyDo } = require('./doi-tra');

const SO = path.join(GOC, 'test-output', `don-hoan-tra.lane${process.env.VNPOST_LANE || 'x'}.json`);
const PHI = 5000;

/** Đơn hoàn trả dùng chung: { orderId, orderNumber, returnOrderId, returnOrderCode, ngay }. */
async function dh(page, browser) {
	const homNay = new Date().toISOString().slice(0, 10);
	try {
		const c = JSON.parse(fs.readFileSync(SO, 'utf8'));
		if (c.ngay === homNay && c.returnOrderCode) return c;
	} catch { /* chưa có */ }
	if (browser) await damBaoLyDo(browser);
	const d = await banDon(page);
	const gdvLd = await p.k.goiApi(page, d.st, '/reasons', { feature: 'RETURN_ORDER', size: 200 });
	test.info().annotations.push({ type: 'GET /reasons (vai gdv)', description: `${JSON.stringify(gdvLd?.status)} · ${(gdvLd?.data || []).length} lý do` });
	await moDoiTra(page, d.orderId);
	// Phí > 0 để dòng "Phí hoàn trả" hiện ở chi tiết (FE ẩn khi phí = 0 — OrderDetailOverview.jsx).
	const oPhi = page.getByText('Phí trả hàng', { exact: true }).first().locator('xpath=following::input[1]');
	await oPhi.fill(String(PHI));
	// 🔴 InputCurrency mở hộp gợi ý số tiền (`.suggestions-portal`) sau debounce 150ms và chỉ đóng bằng Escape KHI focus còn ở ô
	//    (hoặc chọn gợi ý) — Tab trước là hộp treo lại, che cây lý do bên dưới.
	await page.waitForTimeout(400);
	await oPhi.press('Escape');
	await oPhi.press('Tab');
	await expect(page.locator('.suggestions-portal li').first()).toBeHidden({ timeout: 5_000 });
	// Lý do trả hàng = TreeSelect nhóm › lý do (OrderNoteField.jsx): bung nhóm đầu, chọn lý do đầu.
	const rq = page.waitForResponse((r) => /\/reasons/.test(r.url()), { timeout: 5_000 }).catch(() => null);
	await page.locator('#return-order-reason').click({ force: true });
	const rr = await rq;
	if (rr) test.info().annotations.push({ type: 'GET reasons (gdv)', description: `${rr.status()} ${rr.url().split('__api')[1]} ${(await rr.text().catch(() => '')).slice(0, 300)}` });
	await page.waitForTimeout(1_500);
	// 🔴 Cây antd có 1 treenode `aria-hidden` (nút đo kích thước virtual list) — chỉ lấy nút thấy được trong dropdown đang mở.
	const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
	const nut = dd.locator('.ant-select-tree-treenode:not([aria-hidden="true"])');
	const la = nut.filter({ has: page.locator('.ant-select-tree-switcher-noop') }).filter({ hasNot: page.locator('textarea') });
	let lyDo = '';
	if (await nut.count()) {
		if (!(await la.count())) {
			await nut.first().click(); // nhóm (selectable=false) ⇒ bung ra
			await page.waitForTimeout(800);
		}
		lyDo = chuan(await la.first().innerText());
		await la.first().click();
		await page.waitForTimeout(800);
	}
	// 🔴 25/09: cây lý do trả hàng của chuỗi TRỐNG ("Trống") ⇒ đơn hoàn trả không có lý do.
	await page.keyboard.press('Escape').catch(() => null);
	const { tb, body, req } = await hoanTra(page);
	test.info().annotations.push({ type: 'đơn hoàn trả chung', description: `lý do chọn "${lyDo}" · req.reason ${JSON.stringify(req?.returnOrder?.reason)} · phí ${req?.returnOrder?.returnFee}` });
	expect(tb, 'Không tạo được đơn hoàn trả để kiểm tiếp').toContain('Tạo đơn hoàn trả thành công');
	const c = { ...d, st: undefined, returnOrderId: body?.data?.returnOrderId, returnOrderCode: body?.data?.returnOrderCode, ngay: homNay, lyDo: req?.returnOrder?.reason || lyDo };
	fs.mkdirSync(path.dirname(SO), { recursive: true });
	fs.writeFileSync(SO, JSON.stringify(c, null, 1));
	await p.donTab(page).catch(() => null);
	return c;
}

async function moDs(page) {
	await p.moTrang(page, `${BASE()}/order/return-orders`, p.VAI);
	await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 60_000 });
}
const dongDs = (page, ma) => page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ma }).first();

async function moChiTiet(page, c) {
	await moDs(page);
	await dongDs(page, c.returnOrderCode).getByText(c.returnOrderCode, { exact: true }).click();
	await page.waitForTimeout(4_000);
	return chuan(await page.locator('body').innerText());
}

/** Phiên API của GDV (header thật của app) — lấy từ màn bán hàng. */
async function phien(page) {
	return p.moBan(page, test);
}

test.describe('18_5 — Sau khi chốt đơn hoàn trả', () => {
	test.describe.configure({ timeout: 300_000 });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });

	test('18_5_050_002 — Đơn hoàn trả đã chốt thì không sửa được', async ({ page }) => {
		chanNeuTat('18_5_050_002');
		const c = await dh(page);
		await moChiTiet(page, c);
		const nut = page.getByRole('button', { name: /Sửa|Chỉnh sửa|Cập nhật/ });
		test.info().annotations.push({ type: 'nút sửa', description: String(await nut.count()) });
		await expect(nut).toHaveCount(0);
	});

	test('18_5_060_003 — Mã đơn hàng và mã đơn trả mở hai màn khác nhau', async ({ page }) => {
		chanNeuTat('18_5_060_003');
		const c = await dh(page);
		await moDs(page);
		const dong = dongDs(page, c.returnOrderCode);
		await expect(dong, `Danh sách không có ${c.returnOrderCode}`).toBeVisible();
		const o = dong.locator('td');
		const txt = (await o.allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'dòng', description: txt.join(' · ') });
		await dong.getByText(c.returnOrderCode, { exact: true }).click();
		await page.waitForTimeout(3_000);
		const u1 = page.url();
		await moDs(page);
		const maDon = txt[2];
		await dongDs(page, c.returnOrderCode).locator('td').nth(2).locator('a, span').first().click();
		await page.waitForTimeout(3_000);
		const u2 = page.url();
		test.info().annotations.push({ type: 'URL', description: `mã trả → ${u1} · mã đơn (${maDon}) → ${u2}` });
		expect(u1).not.toBe(u2);
		expect(u2, 'Mã đơn hàng không mở đơn gốc').toContain(String(c.orderId));
	});

	test('18_5_080_001 — Chi tiết đơn trả hàng hiện đủ chỉ tiêu tiền', async ({ page }) => {
		chanNeuTat('18_5_080_001');
		const c = await dh(page);
		const t = await moChiTiet(page, c);
		test.info().annotations.push({ type: 'màn', description: t.slice(0, 600) });
		expect(t).toContain('Chi tiết đơn trả hàng');
		expect(t).toContain('Số tiền hoàn trả');
		expect(t).toContain('Phí hoàn trả');
		expect(t, 'Phí hoàn trả không hiện đúng số').toMatch(/Phí hoàn trả\s*5\.000/);
	});

	test('18_5_080_002 — Khối Sản phẩm trả hàng hiện đủ cột', async ({ page }) => {
		chanNeuTat('18_5_080_002');
		const c = await dh(page);
		await moChiTiet(page, c);
		const th = (await page.locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);
		test.info().annotations.push({ type: 'cột', description: th.join(' · ') });
		for (const cot of ['Tên sản phẩm', 'SL trả', 'Đơn giá', 'Tiền hoàn', 'Lý do']) expect(th, `Thiếu cột "${cot}"`).toContain(cot);
	});

	test('18_5_130_002 — Lý do trả hàng hiển thị ở phiếu và chi tiết', async ({ page, browser }) => {
		chanNeuTat('18_5_130_002');
		const c = await dh(page, browser);
		expect(c.lyDo, '🔴 Cây "Lý do trả hàng" ở POS trống: vai GDV gọi GET /reasons bị 401 (chuỗi CÓ lý do) — SQL gán quyền: .claude/sql/update_product/2026-09-25_role_permission_ly_do_tra_hang_pos.sql').toBeTruthy();
		const t = await moChiTiet(page, c);
		expect(t, 'Chi tiết đơn trả không hiện lý do trả hàng').toContain(chuan(c.lyDo));
		const st = await phien(page);
		const x = await p.donTrongDs(page, st, c.orderId);
		test.info().annotations.push({ type: 'đơn gốc', description: JSON.stringify(x && { status: x.status }) });
		expect(x?.status, 'Đơn gốc trả hết không về "Đã hủy"').toBe(-2);
	});

	test('18_5_140_006 — Chặn khi biến thể hoàn không khớp dòng đơn gốc', async ({ page }) => {
		chanNeuTat('18_5_140_006');
		const d = await banDon(page);
		await moDoiTra(page, d.orderId);
		// Chặn request thật, sửa variantId rồi gửi đi.
		await page.route('**/create-return-exchange**', async (route) => {
			const b = route.request().postDataJSON();
			for (const it of b?.returnOrder?.items || []) it.variantId = Number(it.variantId) + 1;
			await route.continue({ postData: JSON.stringify(b) });
		});
		const { tb, body } = await hoanTra(page);
		test.info().annotations.push({ type: 'phản hồi', description: `"${tb}" · ${JSON.stringify(body?.status)}` });
		expect(chuan(body?.status?.message || tb)).toContain('Bien the hoan khong khop voi dong don hang hien tai');
	});

	test('18_5_140_009 — Chặn duyệt đơn hoàn không thuộc điểm bán hiện tại', async ({ page }) => {
		chanNeuTat('18_5_140_009');
		const c = await dh(page);
		const st = await phien(page);
		const khac = require('../../00_seed/seed-state').doc().duLieu.diemBanNhan?.shopId;
		expect(khac, 'Sổ seed thiếu diemBanNhan').toBeTruthy();
		const r = await p.k.goiGhi(page, st, 'POST', `/orders/return-orders/${c.returnOrderId}/approval-step/approve`, { shopId: khac }, {});
		test.info().annotations.push({ type: 'phản hồi', description: JSON.stringify(r?.status) });
		expect(chuan(r?.status?.message)).toContain('Đơn hoàn không thuộc shop hiện tại');
	});

	test('18_5_140_010 — Chặn duyệt đơn hoàn không ở trạng thái chờ duyệt', async ({ page }) => {
		chanNeuTat('18_5_140_010');
		const c = await dh(page);
		const st = await phien(page);
		const r = await p.k.goiGhi(page, st, 'POST', `/orders/return-orders/${c.returnOrderId}/approval-step/approve`, { shopId: SHOP() }, {});
		test.info().annotations.push({ type: 'phản hồi', description: JSON.stringify(r?.status) });
		expect(chuan(r?.status?.message)).toContain('Đơn hoàn không ở trạng thái chờ duyệt');
	});
});

test.describe('18_5 — Màn "Chọn đơn hàng đổi trả" (từ danh sách hoàn trả)', () => {
	test.describe.configure({ timeout: 240_000 });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });
	test.afterEach(async ({ page }) => { await page.keyboard.press('Escape').catch(() => null); await p.donTab(page).catch(() => null); });

	/** /order/return-orders ▸ "Đổi trả hàng" ⇒ modal "Chọn đơn hàng đổi trả" (ModalSelectOrderForReturn.jsx). */
	async function moChon(page) {
		await p.moBan(page, test);
		await moDs(page);
		await page.getByRole('button', { name: /Đổi trả hàng/ }).first().click();
		const m = page.getByRole('dialog').filter({ hasText: 'Chọn đơn hàng đổi trả' });
		await expect(m, 'Không mở modal "Chọn đơn hàng đổi trả"').toBeVisible({ timeout: 30_000 });
		return m;
	}

	test('18_5_010_002 — Chặn hoàn trả khi chưa chọn đơn gốc', async ({ page }) => {
		chanNeuTat('18_5_010_002');
		const m = await moChon(page);
		await m.getByRole('button', { name: /Đóng|Hủy|Huỷ/ }).first().click().catch(() => page.keyboard.press('Escape'));
		await expect(m).toBeHidden({ timeout: 10_000 }).catch(() => null);
		const ghi = [];
		page.on('request', (r) => { if (/create-return-exchange/.test(r.url())) ghi.push(r.url()); });
		const nut = page.getByRole('button', { name: 'Hoàn trả', exact: true });
		test.info().annotations.push({ type: 'màn sau khi đóng', description: `${page.url()} · nút Hoàn trả: ${await nut.count()}` });
		await expect(nut, 'Đóng modal mà không còn nút "Hoàn trả" để bấm').toBeVisible({ timeout: 15_000 });
		const n = page.locator('.ant-message-notice');
		await nut.click();
		await expect(n.filter({ hasText: 'Vui lòng chọn đơn hàng đổi trả' })).toBeVisible({ timeout: 8_000 });
		expect(ghi, 'Chưa chọn đơn gốc mà vẫn gửi tạo đơn hoàn trả').toHaveLength(0);
	});

	test('18_5_010_004 — Hoàn trả khi mã đơn gốc không tồn tại trong hệ thống', async ({ page }) => {
		chanNeuTat('18_5_010_004');
		const m = await moChon(page);
		const o = m.getByPlaceholder('Tìm kiếm theo mã đơn, khách hàng...');
		await o.fill('KHONGTONTAI999999');
		await o.press('Enter');
		await page.waitForTimeout(3_000);
		const dem = await m.locator('.ant-table-tbody tr.ant-table-row').count();
		const t = chuan(await m.innerText());
		test.info().annotations.push({ type: 'hành vi', description: `${dem} dòng · "${t.slice(0, 200)}"` });
		expect(dem).toBe(0);
		await expect(m, 'Modal bị đóng sau khi tìm mã không có').toBeVisible();
		expect(t).not.toMatch(/Đã xảy ra lỗi|500|Internal/);
	});
});

test('18_5_PQ_002 — Vai bưu điện xã không xem được đơn hoàn trả của điểm bán', async ({ page }) => {
	chanNeuTat('18_5_PQ_002');
	test.setTimeout(120_000);
	const res = [];
	page.on('response', (r) => { if (r.url().includes('/orders/return-orders')) res.push(r); });
	await p.moTrang(page, `${BASE()}/order/return-orders`, 'ward');
	await page.waitForTimeout(6_000);
	const t = chuan(await page.locator('body').innerText()).slice(0, 300);
	const dem = await page.locator('.ant-table-tbody tr.ant-table-row').count();
	test.info().annotations.push({ type: 'hành vi thật', description: `URL ${page.url()} · ${dem} dòng · API ${res.map((r) => `${r.status()} ${r.url().split('__api')[1]?.split('?')[0]}`).join(', ')} · "${t}"` });
	expect(t).not.toMatch(/Đã xảy ra lỗi|Maximum update depth/);
	expect(dem, 'Vai xã thấy đơn hoàn trả của điểm bán').toBe(0);
});
