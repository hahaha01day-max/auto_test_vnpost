'use strict';

/**
 * 14_1 · 040 (+010_044, 030_023) — vai `ward` (Giám đốc xã của làn): duyệt / từ chối phiếu xuất trả.
 * Tiền đề: phiếu Chờ duyệt do điểm bán seed lập bằng API qua phiên phụ `shop`.
 * Dọn: `donPhieu` — Chờ duyệt ⇒ điểm bán huỷ; Xã đã duyệt ⇒ tỉnh từ chối. 🚫 Không để phiếu tới "Đã duyệt".
 * Nguồn FE: `StockReturnRequestListPage.jsx`, `ApproveModal.jsx` (Drawer "Duyệt phiếu xuất trả NCC").
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const r = require('./return-page');

const GOC = path.join(__dirname, '..');
const VAI = 'ward';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const PHIEU_XA_KHAC = 46; // Chờ duyệt của điểm bán làn 5 (xã AUTO5_T_01) — tạo 24/09/2026

let st;
let shop; // phiên phụ điểm bán
const tao = [];

async function taoP(opt) {
	const p = await r.taoPhieuApi(shop.page, shop.st, opt);
	tao.push(p.id);
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

test.describe('14_1 · 040 — Duyệt phiếu trả (cấp xã)', () => {
	test.describe.configure({ timeout: 240_000 });

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

	test('14_1_010_044 — Vai cấp xã không thấy nút Tạo phiếu trả', async ({ page }) => {
		chanNeuTat('14_1_010_044');
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Xuất trả nhà cung cấp');
		await expect(r.khung(page).getByRole('button', { name: 'Tạo phiếu trả' })).toHaveCount(0);
	});

	test('14_1_030_023 — Cấp xã không thấy phiếu của xã khác', async ({ page }) => {
		chanNeuTat('14_1_030_023');
		await taoP({});
		const xa = r.seed.doc().duLieu.toChuc;
		const b = await r.k.goiApi(page, st, r.API, { page: 0, size: 200 });
		expect(b.data.length).toBeGreaterThan(0);
		for (const x of b.data) expect(x.orgWardCode, `Phiếu ${x.code} thuộc xã khác`).toBe(xa.maXa);
		const ten = (await r.dong(page).locator('td:nth-child(5)').allInnerTexts()).map(r.chuan);
		for (const t of ten) expect(t).toContain(xa.tenXa);
	});

	test('14_1_040_001 — Cấp xã duyệt phiếu Chờ duyệt', async ({ page }) => {
		chanNeuTat('14_1_040_001');
		const p = await taoP({});
		const dr = await moDuyet(page, p.code);
		const tb = await r.thongBao(page, () => nutDr(dr, 'Duyệt').click());
		expect(tb).toContain('Đã duyệt phiếu');
		await expect(r.dong(page).filter({ hasText: p.code }).locator('.ant-tag')).toHaveText('Xã đã duyệt', { timeout: 20_000 });
	});

	test('14_1_040_005 — Cấp xã không duyệt được phiếu ngoài trạng thái Chờ duyệt', async ({ browser }) => {
		chanNeuTat('14_1_040_005');
		const p = await taoP({});
		await r.duyetDu(browser, 'ward', p.id);
		const b = await r.goiDuyet(browser, 'ward', p.id);
		expect(r.msg(b)).toBe('Cấp xã chỉ duyệt được phiếu đang Chờ duyệt');
	});

	test('14_1_040_007 — Cấp xã không duyệt được phiếu của xã khác', async ({ browser }) => {
		chanNeuTat('14_1_040_007');
		const b = await r.goiDuyet(browser, 'ward', PHIEU_XA_KHAC, { extra: { items: [] } });
		expect(r.msg(b)).toBe('Phiếu không thuộc phạm vi xã của bạn');
	});

	test('14_1_040_011 — SL duyệt điền sẵn bằng SL đề nghị', async ({ page }) => {
		chanNeuTat('14_1_040_011');
		const p = await taoP({ soDong: 3, sl: 2 });
		const dr = await moDuyet(page, p.code);
		const hang = dr.locator('.ant-table-tbody tr.ant-table-row');
		await expect(hang).toHaveCount(3);
		for (const h of await hang.all()) {
			const deNghi = Number(r.chuan(await h.locator('td').nth(3).innerText()));
			expect(Number(await h.locator('td').nth(4).locator('input').inputValue())).toBe(deNghi);
		}
	});

	test('14_1_040_012 — Hạ SL duyệt thì phần cắt hoàn về kho điểm bán', async ({ page }) => {
		chanNeuTat('14_1_040_012');
		const p = await taoP({ sl: 10 });
		const it = (await r.chiTietPhieu(shop.page, shop.st, p.id)).items[0];
		const ton = async () => (await r.loCon(shop.page, shop.st, r.seed.doc().duLieu.diemBan.shopId, it.productId, it.variantId)).reduce((s, l) => s + Number(l.remainQuantity) - Number(l.reservedQuantity || 0), 0);
		const truoc = await ton();
		const dr = await moDuyet(page, p.code);
		const o = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('td').nth(4).locator('input');
		await o.fill('6');
		await o.press('Tab');
		expect(await r.thongBao(page, () => nutDr(dr, 'Duyệt').click())).toContain('Đã duyệt phiếu');
		expect(Number((await r.chiTietPhieu(shop.page, shop.st, p.id)).items[0].approvedQuantity)).toBe(6);
		expect(await ton(), 'Tồn khả dụng điểm bán bị giảm sau khi xã hạ SL duyệt').toBe(truoc);
	});

	for (const [id, sl] of [['14_1_040_013', 11], ['14_1_040_014', -1]]) {
		test(`${id} — SL duyệt ${sl > 0 ? 'lớn hơn SL đề nghị' : 'âm'} bị chặn`, async ({ browser }) => {
			chanNeuTat(id);
			const p = await taoP({ sl: 10 });
			const b = await r.goiDuyet(browser, 'ward', p.id, { sl });
			expect(r.msg(b)).toMatch(/^Số lượng duyệt phải trong khoảng \[0, 10(\.0+)?\]$/);
			expect((await r.chiTietPhieu(shop.page, shop.st, p.id)).request.status).toBe('PENDING');
		});
	}

	test('14_1_040_015 — SL duyệt bằng 0 thì hoàn trọn dòng về kho', async ({ page }) => {
		chanNeuTat('14_1_040_015');
		const p = await taoP({ sl: 10 });
		const dr = await moDuyet(page, p.code);
		const o = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('td').nth(4).locator('input');
		await o.fill('0');
		await o.press('Tab');
		expect(await r.thongBao(page, () => nutDr(dr, 'Duyệt').click())).toContain('Đã duyệt phiếu');
		const it = (await r.chiTietPhieu(shop.page, shop.st, p.id)).items[0];
		expect(Number(it.approvedQuantity)).toBe(0);
		const conLai = Number(it.approvedQuantity) - Number(it.returnedQty || 0) - Number(it.restockedQty || 0) - Number(it.damagedQty || 0);
		expect(conLai).toBe(0);
	});

	test('14_1_040_016 — SL duyệt bằng đúng SL đề nghị được chấp nhận', async ({ browser }) => {
		chanNeuTat('14_1_040_016');
		const p = await taoP({ sl: 10 });
		const b = await r.goiDuyet(browser, 'ward', p.id, { sl: 10 });
		expect(String(b?.status?.code), b?.status?.message).toBe('200');
	});

	test('14_1_040_020 — Ô chọn cách nhập kho chỉ hiện ở bước tỉnh duyệt', async ({ page }) => {
		chanNeuTat('14_1_040_020');
		const p = await taoP({});
		const dr = await moDuyet(page, p.code);
		await expect(dr.getByText('Sau khi duyệt, hàng sẽ:')).toHaveCount(0);
		await expect(dr.getByText('Tạm treo, nhập kho sau')).toHaveCount(0);
		await expect(dr.getByText('Nhập về kho tỉnh ngay')).toHaveCount(0);
	});

	test('14_1_040_021 — Ghi chú khi duyệt là tuỳ chọn', async ({ page }) => {
		chanNeuTat('14_1_040_021');
		const p = await taoP({});
		const dr = await moDuyet(page, p.code);
		await expect(dr.locator('textarea')).toHaveAttribute('placeholder', 'Ghi chú khi duyệt (tuỳ chọn) / Lý do khi từ chối (bắt buộc)');
		expect(await r.thongBao(page, () => nutDr(dr, 'Duyệt').click())).toContain('Đã duyệt phiếu');
	});

	for (const [id, go] of [['14_1_040_022', ''], ['14_1_040_023', '     ']]) {
		test(`${id} — Từ chối mà ${go ? 'lý do toàn khoảng trắng' : 'bỏ trống lý do'} bị chặn`, async ({ page }) => {
			chanNeuTat(id);
			const p = await taoP({});
			const dr = await moDuyet(page, p.code);
			const posts = r.ghiPhieuTra(page);
			if (go) await dr.locator('textarea').fill(go);
			expect(await r.thongBao(page, () => nutDr(dr, 'Từ chối').click())).toContain('Vui lòng nhập lý do từ chối');
			expect(posts).toEqual([]);
		});
	}

	test('14_1_040_025 — Đóng màn duyệt giữa chừng không ghi gì', async ({ page }) => {
		chanNeuTat('14_1_040_025');
		const p = await taoP({ sl: 3 });
		let dr = await moDuyet(page, p.code);
		const o = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('td').nth(4).locator('input');
		await o.fill('1');
		await dr.locator('.ant-drawer-close').click();
		await expect(dr).toBeHidden();
		dr = await moDuyet(page, p.code);
		expect(Number(await dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('td').nth(4).locator('input').inputValue())).toBe(3);
		expect((await r.chiTietPhieu(shop.page, shop.st, p.id)).request.status).toBe('PENDING');
	});

	test('14_1_040_026 — Ma trận trạng thái phiếu và việc Duyệt', async ({ page, browser }) => {
		chanNeuTat('14_1_040_026');
		const cho = await taoP({});
		const xa = await taoP({});
		await r.duyetDu(browser, 'ward', xa.id);
		const dd = await taoP({});
		await r.duyetDu(browser, 'ward', dd.id);
		await r.duyetDu(browser, 'province', dd.id);
		const tc = await taoP({});
		await r.goiDuyet(browser, 'ward', tc.id, { approved: false, description: 'AUTO TEST 040_026' });
		const huy = await taoP({});
		await r.huyPhieu(shop.page, shop.st, huy.id);
		const kq = {};
		for (const [ten, p] of Object.entries({ 'Chờ duyệt': cho, 'Xã đã duyệt': xa, 'Đã duyệt': dd, 'Từ chối': tc, 'Đã huỷ': huy })) {
			const m = await r.menuXuLy(page, await dongMa(page, p.code));
			kq[ten] = (m || []).some((x) => x.nhan === 'Duyệt');
		}
		expect(kq).toEqual({ 'Chờ duyệt': true, 'Xã đã duyệt': false, 'Đã duyệt': false, 'Từ chối': false, 'Đã huỷ': false });
		const nhap = await taoP({ draft: true });
		const b = await r.k.goiApi(page, st, r.API, { page: 0, size: 50, keyword: nhap.code });
		expect(b.data, 'Cấp xã thấy phiếu Nháp của điểm bán').toEqual([]);
		test.info().annotations.push({ type: 'phạm vi', description: 'Chưa phủ Đã gom / Đã tách / Chưa gửi TCT / Đã xử lý xong ở vai xã — dựng ở luồng 14_2' });
	});
});
