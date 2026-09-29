'use strict';

/**
 * 04_4 — Kiểm kho GHI theo phiên, điểm bán seed của làn, vai `shop` (Cửa hàng trưởng).
 *
 * SP dùng: `AUTO8_SP_FIFO` — 1 lô `AUTO8_LO_FIFO`, tồn 100 (khớp số liệu kịch bản 120 / 20 / 100).
 * `AUTO8_SP_TC` (nhiều lô) cho case "chưa đếm ≠ đếm 0".
 * 🔴 Phiên mở là KHOÁ KHO ⇒ `afterAll` luôn huỷ phiên còn mở. Chạy tuần tự (serial): các case dùng
 *    chung một phiên / một phiếu.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const kk = require('./kiem-kho-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const BASE = () => process.env.VNPOST_BASE_URL;

async function loCua(page, st, shopId, sp) {
	const b = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, productId: sp.productId, variantId: sp.variantId, size: 500 });
	return Object.fromEntries((b.data || []).map((l) => [l.batchCode, { ton: Number(l.remainQuantity), gia: Number(l.price) }]));
}

/** Tra productId/variantId của SP theo tên (API tìm kiếm của chính app). */
async function timSp(page, st, ten) {
	const b = await k.goiApi(page, st, '/chain/products/basic-search-product-unit', { page: 0, size: 20, productName: ten });
	const sp = (b.data || []).find((x) => x.productName === ten);
	expect(sp, `Không tìm thấy SP ${ten}`).toBeTruthy();
	return sp;
}

test.describe.serial('04_4 — Kiểm kho theo phiên (điểm bán seed)', () => {
	test.describe.configure({ timeout: 300_000 });
	const ctx = { sessionId: null, phieu: null };
	const { shopId, sp } = (() => { try { return k.duLieuSeed(); } catch { return {}; } })();
	const FIFO = sp?.fifo?.tenSanPham;
	const TC = sp?.tieuChuan?.tenSanPham;
	const LO = 'AUTO8_LO_FIFO'.replace('AUTO8_', `${require('../../00_seed/seed-state').PREFIX}`);

	const moPhieu = async (page) => {
		await moTrang(page, `${BASE()}/inventory/inventory-check/session?shopId=${shopId}&stockInOutId=${ctx.phieu}&sessionId=${ctx.sessionId}`, VAI);
		await expect(page.getByRole('button', { name: 'Xác nhận đếm' })).toBeVisible({ timeout: 30_000 });
	};

	test.beforeAll(async ({ browser }) => {
		// Dọn phiên treo từ lượt trước (khoá kho).
		const p = await k.moPhienPhu(browser, VAI, '/inventory/inventory-check');
		const mo = await kk.phienMo(p.page, p.st, shopId);
		if (mo?.sessionId) await kk.huyPhien(p.page, p.st, shopId, mo.sessionId);
		await p.dong();
	});
	test.afterAll(async ({ browser }) => {
		const p = await k.moPhienPhu(browser, VAI, '/inventory/inventory-check');
		const mo = await kk.phienMo(p.page, p.st, shopId);
		if (mo?.sessionId) await kk.huyPhien(p.page, p.st, shopId, mo.sessionId);
		await p.dong();
	});

	test('04_4_040_001 — Tạo phiếu kiểm kho nháp', async ({ page }) => {
		chanNeuTat('04_4_040_001');
		const st = k.batHeader(page);
		ctx.sessionId = await kk.moPhien(page, VAI);
		ctx.phieu = await kk.themPhieu(page);
		const fifo = await timSp(page, st, FIFO);
		const truoc = await loCua(page, st, shopId, fifo);
		expect(truoc[LO]?.ton, `Lô ${LO} không còn tồn 100 như tiền điều kiện`).toBe(100);
		await kk.themSp(page, FIFO);
		await kk.demLo(page, FIFO, { [LO]: 120 });
		const cho = page.waitForResponse((r) => r.url().includes(`/inventory-check/${ctx.phieu}`) && r.request().method() === 'PUT');
		await page.getByRole('button', { name: 'Lưu thông tin' }).click();
		const b = await (await cho).json();
		expect(String(b?.status?.code), `Lưu nháp lỗi: ${b?.status?.message}`).toBe('200');
		const ph = await kk.chiTietPhien(page, st, shopId, ctx.sessionId);
		const t = (ph.tickets || []).find((x) => x.stockInOutId === ctx.phieu);
		expect(t?.status, 'Phiếu kiểm vừa lưu không ở trạng thái nháp').toBe('DRAFT');
		expect(await loCua(page, st, shopId, fifo), '🔴 Phiếu kiểm nháp đã đổi tồn kho').toEqual(truoc);
	});

	for (const [id, sl, lech] of [['04_4_030_001', 120, '+20'], ['04_4_030_002', 20, '-80'], ['04_4_030_003', 100, '0']]) {
		test(`${id} — Số lượng thực tế ${sl} so với tồn 100`, async ({ page }) => {
			chanNeuTat(id);
			test.skip(!ctx.phieu, 'Case 04_4_040_001 không tạo được phiếu kiểm.');
			await moPhieu(page);
			const d = await kk.demLo(page, FIFO, { [LO]: sl });
			const o = (await d.locator('td').allInnerTexts()).map(k.chuan);
			test.info().annotations.push({ type: 'đo', description: `dòng: ${o.join(' | ')}` });
			expect(o, `Cột chênh lệch không ra ${lech}`).toContain(lech);
		});
	}

	test('04_4_040_002 — Chỉnh sửa phiếu kiểm kho nháp', async ({ page }) => {
		chanNeuTat('04_4_040_002');
		test.skip(!ctx.phieu, 'Chưa có phiếu kiểm nháp.');
		const st = k.batHeader(page);
		await moPhieu(page);
		const fifo = await timSp(page, st, FIFO);
		const truoc = await loCua(page, st, shopId, fifo);
		await kk.demLo(page, FIFO, { [LO]: 97 });
		await kk.themSp(page, TC);
		await page.reload();
		await expect(page.getByRole('button', { name: 'Xác nhận đếm' })).toBeVisible({ timeout: 30_000 });
		await expect(kk.dongSp(page, FIFO), 'Mở lại không thấy số mới (chênh lệch -3)').toContainText('-3');
		await kk.dongSp(page, FIFO).getByRole('button', { name: 'Kiểm lô' }).click();
		const dl = page.locator('.ant-drawer-open').filter({ hasText: 'Kiểm kho theo lô' }).last();
		await expect(dl.locator('tr').filter({ hasText: LO }).getByPlaceholder('Chưa đếm')).toHaveValue('97');
		await dl.getByRole('button', { name: 'Hủy' }).click();
		expect(await loCua(page, st, shopId, fifo), 'Sửa phiếu nháp đã đổi tồn').toEqual(truoc);
	});

	test('04_4_040_003 — Tạo phiếu kiểm kho mới khi còn phiếu nháp', async ({ page }) => {
		chanNeuTat('04_4_040_003');
		test.skip(!ctx.sessionId, 'Chưa có phiên.');
		await moTrang(page, `${BASE()}/inventory/inventory-check/session-manage?shopId=${shopId}&sessionId=${ctx.sessionId}`, VAI);
		await page.getByRole('button', { name: /Thêm phiếu kiểm của tôi/ }).click();
		const md = page.locator('.ant-modal-confirm').filter({ hasText: 'Không thể mở phiếu mới' });
		await expect(md, 'Không có thông báo chặn mở phiếu thứ hai').toBeVisible({ timeout: 20_000 });
		test.info().annotations.push({ type: 'đo', description: k.chuan(await md.innerText()) });
		await expect(page, 'Vẫn sang được form phiếu mới').not.toHaveURL(/stockInOutId=(?!${ctx.phieu})\d+/);
	});

	test('04_4_030_006 — Dòng CHƯA ĐẾM khác dòng ĐẾM 0', async ({ page }) => {
		chanNeuTat('04_4_030_006');
		test.skip(!ctx.phieu, 'Chưa có phiếu kiểm.');
		const st = k.batHeader(page);
		await moPhieu(page);
		const tc = await timSp(page, st, TC);
		const lo = await loCua(page, st, shopId, tc);
		const nho = Object.keys(lo).filter((m) => lo[m].ton > 0).sort((a, b) => lo[a].ton - lo[b].ton)[0];
		// Dòng B: đếm 0 một lô; các lô còn lại của SP (dòng A) để trống.
		await kk.themSp(page, TC);
		await kk.demLo(page, TC, { [nho]: 0 });
		await kk.chonLyDo(page, TC).catch(() => {});
		await kk.chonLyDo(page, FIFO).catch(() => {});
		await page.getByRole('button', { name: 'Xác nhận đếm' }).click();
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Đã xác nhận đếm' }).first()).toBeAttached({ timeout: 30_000 });
		await moTrang(page, `${BASE()}/inventory/inventory-check/session-manage?shopId=${shopId}&sessionId=${ctx.sessionId}`, VAI);
		await expect(page).toHaveURL(/session-manage/);
		const rv = await kk.moTongHop(page);
		const choDong = page.waitForResponse((r) => /sessions\/\d+\/close/.test(r.url()), { timeout: 60_000 }).catch(() => null);
		await rv.getByRole('button', { name: 'Xác nhận chốt phiên' }).click();
		const rDong = await choDong;
		expect(rDong, `Bấm "Xác nhận chốt phiên" không gửi request chốt. URL: ${page.url()}; hộp thoại: ${k.chuan((await page.locator('.ant-modal-confirm, .ant-drawer-open .ant-drawer-title').allInnerTexts()).join(' | '))}`).toBeTruthy();
		const kq = await rDong.json();
		test.info().annotations.push({ type: 'đo', description: `close → ${kq?.status?.label}: ${kq?.status?.message}` });
		// 🔴 Kỳ vọng: lô chưa đếm KHÔNG bị coi là 0 một cách im lặng.
		expect(kq?.status?.label, `Chốt phiên không cảnh báo lô chưa đếm: ${kq?.status?.message}`).toBe('UNCOUNTED_LOTS_WARNING');
		const canh = page.locator('.ant-drawer-open').filter({ hasText: 'Còn lô/serial chưa được kiểm' }).last();
		await expect(canh, 'Chốt phiên mà không cảnh báo lô chưa đếm').toBeVisible({ timeout: 30_000 });
		const chu = k.chuan(await canh.innerText());
		test.info().annotations.push({ type: 'đo', description: chu.slice(0, 400) });
		const conLai = Object.keys(lo).filter((m) => m !== nho && lo[m].ton > 0);
		for (const m of conLai) expect(chu, `Lô chưa đếm ${m} không nằm trong cảnh báo`).toContain(m);
		expect(chu, 'Lô đã đếm 0 bị liệt kê như chưa đếm').not.toContain(nho);
		await canh.getByRole('button', { name: 'Quay lại kiểm tiếp' }).click();
		expect(await loCua(page, st, shopId, tc), 'Tồn đã đổi dù chưa chốt').toEqual(lo);
		ctx.tc = { sp: tc, lo, nho };
		// Dọn: huỷ phiên này (không áp lô chưa đếm về 0). 040_004 mở phiên mới.
		await kk.huyPhien(page, st, shopId, ctx.sessionId);
	});

	test('04_4_040_004 — Tồn kho sau khi áp dụng phiếu kiểm kho', async ({ page }) => {
		chanNeuTat('04_4_040_004');
		test.skip(!ctx.tc, 'Case 04_4_030_006 chưa dựng xong phiếu.');
		const st = k.batHeader(page);
		// Phiên MỚI: FIFO = 97 (thiếu 3); TC: lô nhỏ nhất = 0, mọi lô khác đếm đúng tồn (không đổi).
		ctx.sessionId = await kk.moPhien(page, VAI);
		ctx.phieu = await kk.themPhieu(page);
		ctx.tc.lo = await loCua(page, st, shopId, ctx.tc.sp);
		// Phiên cấp điểm bán là TOÀN KHO ⇒ đếm mọi lô; chỉ 2 lô bị đổi số.
		const truocToanKho = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, size: 500 });
		await kk.demToanKhoExcel(page, st, shopId, { [LO]: 97, [ctx.tc.nho]: 0 }, test.info().outputPath('toan-kho.xlsx'));
		await kk.chonLyDo(page, FIFO).catch(() => {});
		await kk.chonLyDo(page, TC).catch(() => {});
		await page.getByRole('button', { name: 'Xác nhận đếm' }).click();
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Đã xác nhận đếm' }).first()).toBeAttached({ timeout: 30_000 });
		const fifo = await timSp(page, st, FIFO);
		await moTrang(page, `${BASE()}/inventory/inventory-check/session-manage?shopId=${shopId}&sessionId=${ctx.sessionId}`, VAI);
		const rv = await kk.moTongHop(page);
		const cho = page.waitForResponse((r) => /sessions\/\d+\/close/.test(r.url()), { timeout: 60_000 });
		await rv.getByRole('button', { name: 'Xác nhận chốt phiên' }).click();
		const b = await (await cho).json();
		expect(String(b?.status?.code), `Chốt phiên lỗi: ${b?.status?.message}`).toBe('200');
		ctx.daChot = true;
		const sauFifo = await loCua(page, st, shopId, fifo);
		expect(sauFifo[LO]?.ton, 'Tồn lô FIFO ≠ số thực tế đã kiểm (97)').toBe(97);
		const sauTc = await loCua(page, st, shopId, ctx.tc.sp);
		expect(sauTc[ctx.tc.nho]?.ton ?? 0, `Lô đếm 0 ${ctx.tc.nho} không về 0`).toBe(0);
		for (const [m, v] of Object.entries(ctx.tc.lo).filter(([mm, vv]) => mm !== ctx.tc.nho && vv.ton > 0)) {
			expect(sauTc[m]?.ton, `Lô ${m} đếm đúng tồn mà tồn đổi`).toBe(v.ton);
		}
		// Mọi lô khác của kho (đếm đúng tồn) không đổi.
		const sauToanKho = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, size: 500 });
		const tonMap = (d) => Object.fromEntries((d.data || []).filter((l) => ![LO, ctx.tc.nho].includes(l.batchCode)).map((l) => [l.batchCode, Number(l.remainQuantity)]));
		expect(tonMap(sauToanKho), 'Lô không bị kiểm lệch mà tồn đổi sau áp dụng').toEqual(tonMap(truocToanKho));
	});

	test('04_4_060_001 — Kiểm kê THIẾU hàng của một lô', async ({ page }) => {
		chanNeuTat('04_4_060_001');
		test.skip(!ctx.daChot, 'Case 04_4_040_004 chưa chốt phiên.');
		const st = k.batHeader(page);
		await moTrang(page, `${BASE()}/inventory/inventory-check`, VAI);
		const fifo = await timSp(page, st, FIFO);
		const lo = await loCua(page, st, shopId, fifo);
		// Phiên 040_004 đã khai lô FIFO = 97 từ tồn 100 ⇒ thiếu 3, và SP chỉ có đúng 1 lô.
		expect(lo[LO]?.ton, 'Tồn lô sau kiểm thiếu sai').toBe(97);
		expect(Object.keys(lo).filter((m) => lo[m].ton > 0), 'Kiểm thiếu một lô làm phát sinh / mất lô khác').toEqual([LO]);
	});

	test('04_4_040_005 — Không sửa được phiếu kiểm kho đã áp dụng', async ({ page }) => {
		chanNeuTat('04_4_040_005');
		test.skip(!ctx.daChot, 'Chưa có phiếu đã áp dụng.');
		await moPhieu(page).catch(() => {});
		await page.waitForTimeout(3_000);
		for (const ten of ['Sửa phiếu', 'Xác nhận đếm', 'Lưu thông tin']) {
			await expect(page.getByRole('button', { name: ten }), `Phiếu đã áp dụng vẫn còn nút "${ten}"`).toHaveCount(0);
		}
	});

	test('04_4_060_002 — Kiểm kê THỪA hàng của một lô', async ({ page }) => {
		chanNeuTat('04_4_060_002');
		test.skip(!ctx.daChot, 'Cần lô FIFO = 97 từ case trước.');
		const st = k.batHeader(page);
		ctx.sessionId = await kk.moPhien(page, VAI);
		ctx.phieu = await kk.themPhieu(page);
		const fifo = await timSp(page, st, FIFO);
		const truoc = await loCua(page, st, shopId, fifo);
		await kk.demToanKhoExcel(page, st, shopId, { [LO]: truoc[LO].ton + 3 }, test.info().outputPath('toan-kho.xlsx')); // về lại 100, lô khác đếm đúng tồn
		await kk.chonLyDo(page, FIFO).catch(() => {});
		await page.getByRole('button', { name: 'Xác nhận đếm' }).click();
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Đã xác nhận đếm' }).first()).toBeAttached({ timeout: 30_000 });
		await moTrang(page, `${BASE()}/inventory/inventory-check/session-manage?shopId=${shopId}&sessionId=${ctx.sessionId}`, VAI);
		const rv = await kk.moTongHop(page);
		const cho = page.waitForResponse((r) => /sessions\/\d+\/close/.test(r.url()), { timeout: 60_000 });
		await rv.getByRole('button', { name: 'Xác nhận chốt phiên' }).click();
		const b = await (await cho).json();
		expect(String(b?.status?.code), `Chốt phiên lỗi: ${b?.status?.message}`).toBe('200');
		const sau = await loCua(page, st, shopId, fifo);
		test.info().annotations.push({ type: 'đo', description: `giá vốn lô trước ${truoc[LO].gia}, sau ${sau[LO]?.gia}` });
		expect(sau[LO]?.ton, 'Tồn lô sau kiểm thừa ≠ số thực tế').toBe(truoc[LO].ton + 3);
	});
});
