'use strict';

/**
 * 26 · Phiếu thu TỰ SINH + chặn xoá phiếu hệ thống + phạm vi — vai `gdv` (POS làn) / phiên phụ `shop`.
 *
 * Trace: danh sách `GET /expenses/view_all_receipts` (receipt-page.js) · xoá `PUT /expenses/delete_receipts?orderId&shopId`
 * (`pages/receipt/actions.js:36`). BE (`vnpost-pod-service` deleteReceipts): `orderType == 0` ⇒ POD-0014
 * "Không được xoá phiếu thu tiền bán hàng"; `isSystemCreated` ⇒ "Không được xoá phiếu thu được tạo bởi hệ thống".
 * 🔴 GHI THẬT: 060_001 / 060_002 bán hàng ở điểm bán làn (tiền mặt / nháp). Các lệnh xoá gửi lên phiếu HỆ THỐNG (BE phải từ chối).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const r26 = require('./receipt-page');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const ds = (b) => (Array.isArray(b?.data) ? b.data : (b?.data?.content ?? b?.data?.list ?? []));
// 🔴 `receipt-page.goiApi` ghép VNPOST_API_BASE_URL (làn 7 thiếu tiền tố /__api ⇒ 404) ⇒ dùng goiGhi của 04_3 (/__api).
const K = g.k;
const _dong = [];
const dauNgay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
async function homNay(pg, st, shopId, ngay = 0) {
	const b = await K.goiGhi(pg, st, 'GET', r26.API, { shopId, pageNum: 1, pageSize: 200, page: 0, size: 200, start_date: dauNgay() - ngay * 86_400_000, end_date: dauNgay() + 86_400_000 - 1000, sort: 'createdDate,DESC' });
	expect(String(b?.status?.code), `view_all_receipts lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
	return b;
}
const xoa = (pg, st, orderId, shopId) => K.goiGhi(pg, st, 'PUT', '/expenses/delete_receipts', { orderId, shopId });
const tomTat = (x) => ({ id: x.orderId ?? x.id, code: x.orderCode ?? x.code, cat: x.cateName ?? x.categoryName ?? x.catName, nguon: x.sourceName ?? x.objectType ?? x.receiverType, tien: x.totalMoney ?? x.totalAmount ?? x.money, orderType: x.orderType, he: x.isSystemCreated, ref: x.refOrderCode ?? x.referenceCode ?? x.orderRefCode });

/**
 * GDV mở POS (bán hàng); ĐỌC danh sách phiếu thu bằng phiên phụ CHT — 🔴 GDV nhận SSHOP-401 ở view_all_receipts (đo 25/09/2026).
 * Trả { kho (header CHT), shopId, dong() }.
 */
async function phienGdv(page) {
	const st = await p.moBan(page, test);
	const cht = await K.moPhienPhu(page.context().browser(), 'shop', r26.ROUTE);
	test.info().annotations.push({ type: 'đọc phiếu bằng', description: 'phiên CHT (GDV không có quyền view_all_receipts)' });
	_dong.push(cht.dong);
	return { kho: cht.st, pgDoc: cht.page, shopId: Number(st.h.shopid), st, dong: cht.dong };
}

test.describe('26 · Phiếu thu tự sinh (vai gdv)', () => {
	test.describe.configure({ timeout: 300_000 });
	test.afterEach(async () => { for (const d of _dong.splice(0)) await d().catch(() => null); });

	test('26_060_001 — Bán hàng thanh toán sinh phiếu thu tự động', async ({ page }) => {
		chanNeuTat('26_060_001');
		const { kho, shopId, pgDoc } = await phienGdv(page);
		const idTruoc = new Set(ds(await homNay(pgDoc, kho, shopId)).map((x) => String(x.orderId ?? x.id)));
		const truoc = idTruoc.size;
		await p.them(page, p.sp().tc);
		const t = await p.tongKet(page);
		const kq = await p.thanhToanTienMat(page);
		expect(kq.orderId, `Thanh toán lỗi: ${JSON.stringify(kq.draft?.status)}`).toBeTruthy();
		let moi = [];
		for (let i = 0; i < 12 && !moi.length; i += 1) {
			await page.waitForTimeout(5_000);
			// Phiếu KHÔNG mang mã đơn ⇒ lấy phiếu MỚI xuất hiện sau khi thanh toán, cùng số tiền.
			moi = ds(await homNay(pgDoc, kho, shopId)).filter((x) => !idTruoc.has(String(x.orderId ?? x.id)) && Number(tomTat(x).tien) === Number(t.canThanhToan));
		}
		ghiChu('đơn', `${kq.orderId} ${kq.orderNumber} · cần thanh toán ${t.canThanhToan} · phiếu hôm nay ${truoc} → +${moi.length}`);
		ghiChu('phiếu', JSON.stringify(moi.map(tomTat)));
		if (moi[0]) ghiChu('phiếu (đủ trường)', JSON.stringify(moi[0]).slice(0, 1500));
		expect(moi.length, `Không có phiếu thu nào gắn đơn ${kq.orderNumber}`).toBeGreaterThan(0);
		const x = tomTat(moi[0]);
		expect(String(x.cat)).toContain('Thanh toán đơn hàng');
		ghiChu('nguồn thu', `${x.nguon} (đơn khách lẻ)`);
		expect(JSON.stringify(moi[0]), 'Nguồn thu không phải khách hàng').toMatch(/Khách hàng|CUSTOMER|ANONYMOUS/);
		expect(Number(x.tien)).toBe(Number(t.canThanhToan));
	});

	test('26_060_002 — Đơn nháp hoặc chưa thanh toán không sinh phiếu thu', async ({ page }) => {
		chanNeuTat('26_060_002');
		const { kho, shopId, pgDoc } = await phienGdv(page);
		const truoc = ds(await homNay(pgDoc, kho, shopId)).map((x) => String(x.orderId ?? x.id));
		await p.them(page, p.sp().tc);
		const cho = page.waitForResponse((r) => /spa-checkout|draft/.test(r.url()) && r.request().method() === 'POST', { timeout: 20_000 });
		await page.keyboard.press('F7');
		const b = await (await cho).json().catch(() => ({}));
		expect(String(b?.status?.code), `Lưu nháp lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
		const idNhap = b?.data?.orderId ?? b?.data?.id ?? b?.data;
		await page.waitForTimeout(15_000);
		const sau = ds(await homNay(pgDoc, kho, shopId));
		const moi = sau.filter((x) => !truoc.includes(String(x.orderId ?? x.id)));
		ghiChu('đo', `đơn nháp ${idNhap} · phiếu mới ${JSON.stringify(moi.map(tomTat))}`);
		expect(moi.filter((x) => JSON.stringify(x).includes(String(idNhap))), 'Đơn NHÁP sinh phiếu thu').toHaveLength(0);
	});

	test('26_040_004 — Phiếu thu tiền bán hàng có thông báo riêng khi xoá', async ({ page }) => {
		chanNeuTat('26_040_004');
		const { kho, shopId, pgDoc } = await phienGdv(page);
		const ban = ds(await homNay(pgDoc, kho, shopId)).find((x) => Number(x.orderType) === 0);
		test.skip(!ban, 'Hôm nay điểm bán chưa có phiếu thu tiền bán hàng (chạy 26_060_001 trước).');
		const r = await xoa(pgDoc, kho, ban.orderId ?? ban.id, shopId);
		ghiChu('xoá', `${JSON.stringify(tomTat(ban))} → ${JSON.stringify(r?.status)}`);
		expect(r?.status?.message).toContain('Không được xoá phiếu thu tiền bán hàng');
		const con = ds(await homNay(pgDoc, kho, shopId)).some((x) => String(x.orderId ?? x.id) === String(ban.orderId ?? ban.id));
		expect(con, '🔴 Phiếu thu tiền bán hàng ĐÃ BỊ XOÁ').toBe(true);
	});

	test('26_040_003 — Phiếu do hệ thống tự sinh không xoá được', async ({ page, browser }) => {
		chanNeuTat('26_040_003');
		// Phiếu hệ thống (isSystemCreated, không phải tiền bán hàng) — vd "Thu hồi nợ" nhân viên của 24_070 ở điểm bán làn.
		const cht = await g.k.moPhienPhu(browser, 'shop', r26.ROUTE);
		try {
			const kho = cht.st;
			const shopId = Number(cht.st.h.shopid);
			const tat = ds(await homNay(cht.page, kho, shopId, 90));
			const he = tat.find((x) => x.isSystemCreated === true && Number(x.orderType) !== 0);
			ghiChu('phiếu hôm nay', JSON.stringify(tat.slice(0, 8).map(tomTat)));
			test.skip(!he, '90 ngày qua điểm bán làn không có phiếu thu hệ thống nào ngoài tiền bán hàng (orderType 0 bị chặn bằng câu riêng — 26_040_004).');
			await r26.moTrang(cht.page, r26.ROUTE, 'shop');
			await cht.page.waitForTimeout(3_000);
			const dongHe = r26.dong(cht.page).filter({ hasText: String(he.orderCode ?? he.code ?? '') }).first();
			const bieuTuong = dongHe.locator('.anticon-close, [aria-label*="close"], button').last();
			const mo = (await bieuTuong.count()) ? await bieuTuong.evaluate((e) => getComputedStyle(e).opacity + ' ' + (e.disabled || e.getAttribute('aria-disabled') || e.className)) : '(không thấy)';
			ghiChu('biểu tượng xoá', mo);
			const r = await xoa(cht.page, kho, he.orderId ?? he.id, shopId);
			ghiChu('xoá', `${JSON.stringify(tomTat(he))} → ${JSON.stringify(r?.status)}`);
			expect(r?.status?.message).toContain('Không được xoá phiếu thu được tạo bởi hệ thống');
			expect(mo, 'Biểu tượng xoá không mờ').toMatch(/disabled|0\.\d|true/);
		} finally {
			await cht.dong();
		}
	});

	test('26_060_005 — Thu hồi nợ nhân viên từ kho sinh phiếu thu tự động', async ({ page, browser }) => {
		chanNeuTat('26_060_005');
		const nop = g.selectDb("SELECT id, total_amount FROM VNPOST_CORE.SHOP_EMPLOYEE_DEBT_PAYMENT WHERE shop_id=68151 ORDER BY id DESC LIMIT 1")[0];
		test.skip(!nop, 'Điểm bán làn chưa có lần nhân viên nộp tiền trả nợ (chạy 24_070_002).');
		const cht = await g.k.moPhienPhu(browser, 'shop', r26.ROUTE);
		try {
			const tat = ds(await homNay(cht.page, cht.st, Number(cht.st.h.shopid)));
			const thu = tat.filter((x) => /Thu hồi nợ/.test(JSON.stringify(x)));
			ghiChu('phiếu "Thu hồi nợ" hôm nay', JSON.stringify(thu.map(tomTat)));
			ghiChu('lần nộp tiền NV gần nhất', JSON.stringify(nop));
			const khop = thu.find((x) => Number(tomTat(x).tien) === Number(nop[1]) && /Nhân viên|EMPLOYEE/i.test(JSON.stringify(x)));
			expect(khop, `Nhân viên nộp ${nop[1]}đ mà không sinh phiếu thu "Thu hồi nợ" đối tượng Nhân viên`).toBeTruthy();
		} finally {
			await cht.dong();
		}
		void page;
	});

	test('26_070_002 — Cấp dưới không xem được phiếu của cấp trên', async ({ page }) => {
		chanNeuTat('26_070_002');
		const kho = K.batHeader(page);
		await r26.moMan(page, 'gdv');
		await expect.poll(() => Boolean(kho.h), { timeout: 30_000 }).toBe(true);
		const shopId = Number(kho.h.shopid);
		const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
		const bb = await K.goiGhi(page, kho, 'GET', r26.API, { shopId, pageNum: 1, pageSize: 200, start_date: d.getTime() - 60 * 86_400_000, end_date: Date.now() });
		const b = { body: bb };
		const tat = ds(b.body);
		const la = tat.filter((x) => x.shopId != null && Number(x.shopId) !== shopId);
		ghiChu('đo', `${tat.length} phiếu · lạ ${JSON.stringify(la.slice(0, 5).map((x) => ({ ...tomTat(x), shopId: x.shopId })))}`);
		expect(la, 'GDV thấy phiếu của đơn vị khác (cấp trên)').toEqual([]);
		// Kỳ vọng vế sau "chỉ thấy phiếu do chính cấp mình tạo" ⇒ GDV phải XEM được danh sách của mình.
		expect(String(b.body?.status?.code), `GDV không xem được phiếu thu của chính điểm bán (quyền view_all_receipts): ${JSON.stringify(b.body?.status)}`).toBe('200');
		// Thử xin phiếu của cấp trên bằng shopId của tỉnh ⇒ không được trả dữ liệu.
		const tb = await K.goiGhi(page, kho, 'GET', r26.API, { shopId: 0, pageNum: 1, pageSize: 20, start_date: d.getTime(), end_date: Date.now() });
		const tinh = { body: tb };
		ghiChu('xin shopId=0', `${JSON.stringify(tinh.body?.status)} · ${ds(tinh.body).length} dòng`);
		expect(ds(tinh.body).filter((x) => Number(x.shopId) !== shopId), 'GDV đổi shopId mà lấy được phiếu cấp trên').toEqual([]);
	});

	// ───── Đổi / trả hàng (helper 18_5) ─────
	for (const [id, ten, lam, mong] of [
		['26_060_003', 'Đổi hàng thu chênh lệch sinh phiếu thu tự động', async (page, dt) => {
			for (let i = 0; i < 2; i += 1) {
				const o = page.getByPlaceholder('Tìm kiếm sản phẩm đổi');
				await o.click();
				await o.fill(dt.sp().fifo);
				await page.locator('.order-search-product:not(.ant-select-dropdown-hidden)').last().locator('.ant-select-item-option').filter({ hasText: dt.sp().fifo }).first().click();
				await page.waitForTimeout(800);
			}
		}, (t, dt) => dt.tien(t, 'Cần thanh toán (Khách trả)') ?? dt.tien(t, 'Khách cần thanh toán')],
		['26_060_004', 'Trả hàng thu chi phí trả hàng sinh phiếu thu tự động', async (page) => {
			const o = page.getByText('Phí trả hàng', { exact: true }).first().locator('xpath=following::input[1]');
			await o.fill('10000');
			await o.blur();
			await page.waitForTimeout(800);
		}, () => 10_000],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			const dt = require('../../18_5_doi_tra_hang/tests/doi-tra');
			const d = await dt.banDon(page);
			const cht = await K.moPhienPhu(page.context().browser(), 'shop', r26.ROUTE);
			_dong.push(cht.dong);
			const shopId = Number(d.st.h.shopid);
			const idTruoc = new Set(ds(await homNay(cht.page, cht.st, shopId)).map((x) => String(x.orderId ?? x.id)));
			await dt.moDoiTra(page, d.orderId);
			await lam(page, dt);
			await page.waitForTimeout(1_000);
			const t = dt.p.chuan(await page.locator('body').innerText());
			const tienThu = mong(t, dt);
			ghiChu('khối tiền', t.slice(t.indexOf('Trả hàng'), t.indexOf('Trả hàng') + 300));
			const kq = await dt.hoanTra(page);
			ghiChu('hoàn trả', `"${kq.tb}" · ${JSON.stringify(kq.body?.status)}`);
			// Đổi hàng khách trả thêm ⇒ mở modal "Thanh toán" (như bán hàng) ⇒ Xác nhận + SDK tiền mặt.
			const mTT = page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last();
			if (await mTT.isVisible().catch(() => false)) {
				const chu = dt.p.chuan(await mTT.innerText());
				ghiChu('modal thanh toán đổi hàng', (chu.match(/Tổng tiền cần thanh toán\s*[\d.,]+\s*đ/) || [chu.slice(0, 120)])[0]);
				await mTT.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
			}
			const fr = page.frameLocator('iframe[src*="confirm"]');
			if (await fr.getByText(/xác nhận giao dịch/i).waitFor({ timeout: 15_000 }).then(() => true, () => false)) {
				await fr.getByText('Xác nhận thanh toán', { exact: true }).click().catch(() => null);
				await page.waitForTimeout(5_000);
			}
			let moi = [];
			for (let i = 0; i < 12 && !moi.length; i += 1) {
				await page.waitForTimeout(5_000);
				moi = ds(await homNay(cht.page, cht.st, shopId)).filter((x) => !idTruoc.has(String(x.orderId ?? x.id)));
			}
			ghiChu('phiếu mới', `${JSON.stringify(moi.map(tomTat))} · kỳ vọng ${tienThu}`);
			expect(tienThu, 'Không đọc được số tiền khách trả thêm / phí trả hàng').toBeGreaterThan(0);
			expect(moi.some((x) => Number(tomTat(x).tien) === Number(tienThu)), `Không sinh phiếu thu ${tienThu}đ cho ${ten.toLowerCase()}`).toBe(true);
		});
	}
});
