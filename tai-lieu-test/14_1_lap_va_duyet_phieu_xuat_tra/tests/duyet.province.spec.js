'use strict';

/**
 * 14_1 · 040 / 050 (+010_043, 030_022) — vai `province` (Quản lý tỉnh của làn): duyệt, từ chối, phạm vi tỉnh.
 * Tiền đề: phiếu do điểm bán seed lập bằng API (phiên phụ `shop`), xã duyệt bằng API (phiên phụ `ward`).
 * 🔴 Tỉnh duyệt ⇒ BE sinh phiếu xuất giữ chỗ tại điểm bán; phiếu Đã duyệt KHÔNG dọn được (xem 050_003) —
 *    chỉ dùng SL nhỏ (1–2) của SP giá tiêu chuẩn.
 * Nguồn FE: `StockReturnRequestListPage.jsx`, `ApproveModal.jsx`, `ReturnRequestDetailDrawer.jsx`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const r = require('./return-page');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const PHIEU_TINH_KHAC = 46; // Chờ duyệt của điểm bán làn 5 (tỉnh AUTO5_T) — tạo 24/09/2026
const sd = () => r.seed.doc().duLieu;

let st;
let shop;
const tao = [];

async function taoP(opt = {}) {
	const p = await r.taoPhieuApi(shop.page, shop.st, { sl: 1, ...opt });
	tao.push(p.id);
	return p;
}
/** Phiếu tới "Xã đã duyệt". */
async function taoXaDuyet(browser, opt) {
	const p = await taoP(opt);
	await r.duyetDu(browser, 'ward', p.id);
	return p;
}
async function dongMa(page, code) {
	await r.timMa(page, code);
	const d = r.dong(page).filter({ hasText: code }).first();
	await expect(d, `Không thấy phiếu ${code}`).toBeVisible({ timeout: 20_000 });
	return d;
}
async function moDuyet(page, code) {
	await r.bamMenu(page, await dongMa(page, code), 'Duyệt');
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Duyệt phiếu xuất trả NCC' }).last();
	await expect(dr.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
	return dr;
}
const nutDr = (dr, ten) => dr.locator('.ant-drawer-footer button').filter({ hasText: new RegExp(`^\\s*${ten}\\s*$`) });
const tonKd = async (it) =>
	(await r.loCon(shop.page, shop.st, sd().diemBan.shopId, it.productId, it.variantId))
		.filter((l) => l.batchCode === it.batchCode)
		.reduce((s, l) => s + Number(l.remainQuantity) - Number(l.reservedQuantity || 0), 0);

test.describe('14_1 · 040/050 — Duyệt / từ chối phiếu trả (cấp tỉnh)', () => {
	test.describe.configure({ timeout: 300_000 });

	test.beforeAll(async ({ browser }) => {
		shop = await r.k.moPhienPhu(browser, 'shop', r.ROUTE);
	});
	test.afterAll(async () => {
		await shop?.dong();
	});
	test.beforeEach(async ({ page }) => {
		tao.length = 0;
		st = r.k.batHeader(page);
		r.datPhienChinh(VAI, page, st);
		await r.moDanhSach(page, VAI);
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	});
	test.afterEach(async ({ browser }) => {
		for (const id of tao) await r.donPhieu(browser, shop, id);
	});

	test('14_1_010_043 — Vai cấp trên điểm bán không thấy nút Tạo phiếu trả', async ({ page }) => {
		chanNeuTat('14_1_010_043');
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Xuất trả nhà cung cấp');
		await expect(r.khung(page).getByRole('button', { name: 'Tạo phiếu trả' })).toHaveCount(0);
	});

	test('14_1_030_022 — Cấp tỉnh thấy phiếu của mọi điểm bán trong tỉnh', async ({ page }) => {
		chanNeuTat('14_1_030_022');
		await taoP();
		const b = await r.k.goiApi(page, st, r.API, { page: 0, size: 500 });
		const cuaShop = await r.k.goiApi(shop.page, shop.st, r.API, { page: 0, size: 500 });
		const khongNhap = cuaShop.data.filter((x) => x.status !== 'DRAFT').length;
		expect(b.page.total_elements, 'Tỉnh thấy ít phiếu hơn điểm bán trong tỉnh').toBeGreaterThanOrEqual(khongNhap);
		for (const x of b.data) expect(x.orgUnitCode, `Phiếu ${x.code} ngoài tỉnh`).toBe(sd().toChuc.maTinh);
		const ten = (await r.dong(page).locator('td:nth-child(6)').allInnerTexts()).map(r.chuan);
		for (const t of ten) expect(t.startsWith(sd().toChuc.tenTinh), `Cột Tỉnh / Xã "${t}"`).toBe(true);
	});

	test('14_1_040_002 — Cấp tỉnh duyệt phiếu Xã đã duyệt', async ({ page, browser }) => {
		chanNeuTat('14_1_040_002');
		const p = await taoXaDuyet(browser);
		const dr = await moDuyet(page, p.code);
		expect(await r.thongBao(page, () => nutDr(dr, 'Duyệt').click())).toContain('Đã duyệt phiếu');
		await expect(r.dong(page).filter({ hasText: p.code }).locator('.ant-tag')).toHaveText('Đã duyệt', { timeout: 20_000 });
	});

	test('14_1_040_004 — Cấp tỉnh không duyệt được phiếu Chờ duyệt khi có cấp xã', async ({ browser }) => {
		chanNeuTat('14_1_040_004');
		const p = await taoP();
		const b = await r.goiDuyet(browser, 'province', p.id);
		expect(r.msg(b)).toBe('Cấp tỉnh chỉ duyệt được phiếu đã được cấp xã duyệt');
	});

	test('14_1_040_008 — Cấp tỉnh không duyệt được phiếu của tỉnh khác', async ({ browser }) => {
		chanNeuTat('14_1_040_008');
		const b = await r.goiDuyet(browser, 'province', PHIEU_TINH_KHAC, { extra: { items: [] } });
		expect(r.msg(b)).toBe('Phiếu không thuộc phạm vi tỉnh của bạn');
	});

	test('14_1_040_018 — Chọn Nhập về kho tỉnh ngay mà bỏ trống Kho nhận bị chặn', async ({ page, browser }) => {
		chanNeuTat('14_1_040_018');
		const p = await taoXaDuyet(browser);
		const dr = await moDuyet(page, p.code);
		await dr.getByText('Nhập về kho tỉnh ngay').click();
		const kho = dr.locator('.ant-select').filter({ hasText: /Chọn kho nhận hàng|mặc định/ }).first();
		await expect(kho).toBeVisible();
		// FE tự điền sẵn kho mặc định của tỉnh — xoá đi để thử "bỏ trống".
		if (!(await kho.textContent()).includes('Chọn kho nhận hàng')) {
			test.info().annotations.push({ type: 'đo', description: `Ô Kho nhận tự điền sẵn "${r.chuan(await kho.textContent())}" và không có nút xoá (allowClear)` });
		}
		const posts = r.ghiPhieuTra(page);
		const tb = await r.thongBao(page, () => nutDr(dr, 'Duyệt').click());
		expect(tb, 'Ô Kho nhận luôn tự điền kho mặc định, không bỏ trống được').toContain('Vui lòng chọn kho nhận hàng');
		expect(posts).toEqual([]);
	});

	test('14_1_040_019 — Chọn Tạm treo nhập kho sau thì hàng chưa vào kho nào', async ({ page, browser }) => {
		chanNeuTat('14_1_040_019');
		const p = await taoXaDuyet(browser);
		const dr = await moDuyet(page, p.code);
		await expect(dr.locator('.ant-radio-wrapper-checked')).toContainText('Tạm treo, nhập kho sau');
		expect(await r.thongBao(page, () => nutDr(dr, 'Duyệt').click())).toContain('Đã duyệt phiếu');
		const d = await dongMa(page, p.code);
		await expect(d.locator('.ant-tag')).toHaveText('Đã duyệt');
		const ct = await r.chiTietPhieu(page, st, p.id);
		expect(ct.request.provinceImportStockInOutId ?? null).toBeNull();
		const m = await r.menuXuLy(page, d);
		expect(m.map((x) => x.nhan)).toContain('Nhập hàng về kho');
		await page.keyboard.press('Escape');
		const ct2 = await r.moChiTiet(page, d);
		const v = await r.vongDoi(ct2);
		expect(v.find((x) => x.ten === 'Chờ nhập kho về tỉnh')?.tt).toBe('wait');
	});

	test('14_1_040_024 — Tỉnh duyệt là lúc hàng bị khoá tồn', async ({ page, browser }) => {
		chanNeuTat('14_1_040_024');
		const p = await taoXaDuyet(browser, { sl: 2 });
		const it = (await r.chiTietPhieu(page, st, p.id)).items[0];
		const truoc = await tonKd(it);
		const dr = await moDuyet(page, p.code);
		expect(await r.thongBao(page, () => nutDr(dr, 'Duyệt').click())).toContain('Đã duyệt phiếu');
		const ct = await r.chiTietPhieu(page, st, p.id);
		expect(ct.request.reserveStockInOutId, 'Tỉnh duyệt mà không sinh phiếu xuất giữ chỗ').toBeTruthy();
		expect(await tonKd(it), `Tồn khả dụng lô ${it.batchCode} không giảm đúng 2 sau khi tỉnh duyệt`).toBe(truoc - 2);
	});

	test('14_1_050_002 — Nhãn mục cuối menu đổi theo cấp người đăng nhập', async ({ page }) => {
		chanNeuTat('14_1_050_002');
		const p = await taoP();
		// Điểm bán: phiên phụ — đọc menu trên giao diện của phiên đó.
		await r.timMa(shop.page, p.code);
		const mShop = await r.menuXuLy(shop.page, r.dong(shop.page).filter({ hasText: p.code }).first());
		await shop.page.keyboard.press('Escape');
		const mTinh = await r.menuXuLy(page, await dongMa(page, p.code));
		expect(mShop.at(-1)?.nhan).toBe('Huỷ phiếu');
		expect(mTinh.at(-1)?.nhan).toBe('Từ chối');
	});

	test('14_1_050_003 — Từ chối phiếu Đã duyệt hoàn hàng về kho điểm bán', async ({ page, browser }) => {
		chanNeuTat('14_1_050_003');
		const p = await taoXaDuyet(browser);
		const it = (await r.chiTietPhieu(page, st, p.id)).items[0];
		const truoc = await tonKd(it);
		await r.duyetDu(browser, 'province', p.id);
		const giu = await tonKd(it);
		const d = await dongMa(page, p.code);
		await r.bamMenu(page, d, 'Từ chối');
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Từ chối phiếu trả này?' });
		await hop.locator('textarea').fill('AUTO TEST 050_003');
		const tb = await r.thongBao(page, () => hop.getByRole('button', { name: 'Từ chối' }).click());
		expect(tb).toContain('Đã từ chối phiếu');
		expect(await tonKd(it), `Tồn khả dụng sau từ chối (trước duyệt ${truoc}, sau duyệt ${giu})`).toBe(truoc);
		const v = await r.vongDoi(await r.moChiTiet(page, await dongMa(page, p.code)));
		expect(v.some((x) => x.tt === 'error')).toBe(true);
	});

	test('14_1_050_004 — Không huỷ được phiếu đã gom', async ({ page, browser }) => {
		chanNeuTat('14_1_050_004');
		const a = await taoXaDuyet(browser);
		const b = await taoXaDuyet(browser);
		await r.duyetDu(browser, 'province', a.id);
		await r.duyetDu(browser, 'province', b.id);
		const g = await r.k.goiGhi(page, st, 'POST', `${r.API}/consolidate`, {}, { ids: [a.id, b.id], note: 'AUTO TEST 050_004' });
		expect(String(g?.status?.code), `Gom phiếu lỗi: ${g?.status?.message}`).toBe('200');
		const x = await r.k.goiGhi(page, st, 'POST', `${r.API}/${a.id}/cancel`, {}, {});
		expect(r.msg(x)).toBe('Không thể hủy phiếu đã xử lý/đã tách/đã gom');
		test.info().annotations.push({ type: 'phạm vi', description: 'Đã tách phiếu / Xử lý một phần: dựng ở luồng 14_2 (tách + trả NCC)' });
	});

	test('14_1_050_006 — Lý do từ chối hiện lại trên màn chi tiết', async ({ page, browser }) => {
		chanNeuTat('14_1_050_006');
		const p = await taoXaDuyet(browser);
		const ly = `AUTO TEST 050_006 ${Date.now()}`;
		const d = await dongMa(page, p.code);
		await r.bamMenu(page, d, 'Từ chối');
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Từ chối phiếu trả này?' });
		await hop.locator('textarea').fill(ly);
		expect(await r.thongBao(page, () => hop.getByRole('button', { name: 'Từ chối' }).click())).toContain('Đã từ chối phiếu');
		await r.timMa(shop.page, p.code);
		const dr = await r.moChiTiet(shop.page, r.dong(shop.page).filter({ hasText: p.code }).first());
		await expect(dr.locator('.ant-descriptions-row').filter({ hasText: 'Lý do từ chối' })).toContainText(ly);
		await dr.locator('.ant-drawer-close').click();
	});

	test('14_1_050_007 — Đóng hộp xác nhận từ chối không đổi gì', async ({ page, browser }) => {
		chanNeuTat('14_1_050_007');
		const p = await taoXaDuyet(browser);
		const posts = r.ghiPhieuTra(page);
		const d = await dongMa(page, p.code);
		await r.bamMenu(page, d, 'Từ chối');
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Từ chối phiếu trả này?' });
		await hop.locator('textarea').fill('không gửi');
		await hop.locator('.ant-modal-confirm-btns button').first().click();
		await expect(hop).toBeHidden();
		expect(posts).toEqual([]);
		expect((await r.chiTietPhieu(page, st, p.id)).request.status).toBe('WARD_APPROVED');
	});
});
