'use strict';

/**
 * 14_1 — vỏ bổ sung vai `shop`: 030_016 / 030_017 (chi tiết phiếu đã phát sinh đợt trả NCC) · 010_042 (giá gốc lô, không
 * nhập giá tay). Tiền đề dựng bằng helper 14_2 `tra-ghi.js` (phiên phụ tỉnh tách + trả NCC).
 * Nguồn (vnpost-web — xem fe-moc.json): `ReturnRequestDetailDrawer.jsx` (11 cột, tooltip Đã trả/Đã nhập lại/Đã huỷ, `remainOf`),
 * `SupplierBatchSection.jsx`, `StockReturnRequestFormPage.jsx` (bảng tab SKU chỉ có ô SL).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('../../14_2_gom_tach_va_xu_ly_hang_tra/tests/tra-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const ok = (b, viec) => expect(String(b?.status?.code), `${viec} lỗi: ${b?.status?.message}`).toBe('200');
const so = (x) => Number(t.chuan(x).replace(/\./g, '').replace(',', '.'));

let ps = null;
let pt = null;
test.describe.configure({ timeout: 300_000 });
test.beforeEach(async ({ page }) => {
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, 'shop');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh('shop', page, st);
	ps = { page, st };
});
test.beforeAll(async ({ browser }) => {
	pt = await t.k.moPhienPhu(browser, 'province', t.ROUTE);
	t.datPhienSan('province', pt);
});
test.afterAll(async () => {
	t.datPhienSan('province', null);
	await pt?.dong();
});

/** Phiếu con NCC tỉnh (tách thật) đã trả NCC 1 / huỷ 1 — mở chi tiết bằng `?detailId=` ở phiên điểm bán. */
async function phieuCoDot(page, browser) {
	const p = await t.phieuConTinh(browser, ps, pt, { sl: 4 });
	const it = (await t.itemCua(pt, p.id))[0];
	ok(await t.goi(pt, `/${p.id}/return-to-supplier`, { items: [{ itemId: it.id, quantity: 1 }] }), 'Trả NCC 1');
	ok(await t.goi(pt, `/${p.id}/dispose`, { items: [{ itemId: it.id, quantity: 1 }] }), 'Huỷ 1');
	await t.diToi(page, `${t.ROUTE}?detailId=${p.id}`);
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu xuất trả NCC' }).last();
	await expect(dr.locator('.ant-descriptions'), `Điểm bán không mở được chi tiết phiếu ${p.code}`).toBeVisible({ timeout: 30_000 });
	return { p, dr };
}

const COT = ['STT', 'Sản phẩm', 'Lô', 'Serial', 'SL trả', 'SL duyệt', 'Đã trả', 'Đã nhập lại', 'Đã huỷ', 'Còn lại', 'Giá gốc lô'];

test('14_1_030_016 — Chi tiết phiếu đã phát sinh đợt trả NCC', async ({ page, browser }) => {
	chanNeuTat('14_1_030_016');
	const { dr } = await phieuCoDot(page, browser);
	await expect(dr.locator('.rr-lifecycle-steps .ant-steps-item').first()).toBeVisible();
	const cot = (await dr.locator('.ant-table').first().locator('thead th').allInnerTexts()).map(t.chuan).filter(Boolean);
	ghi(`cột: ${cot.join(' | ')}`);
	expect(cot.slice(0, 11), 'Bảng "Danh sách sản phẩm" không đủ 11 cột đúng thứ tự').toEqual(COT);
	await expect(dr.getByText('Các đợt trả nhà cung cấp', { exact: true }), 'Không có khối đợt trả').toBeVisible();
	await expect(dr.locator('.rounded-lg').filter({ hasText: 'Đợt #' }).first()).toContainText('Chờ NCC xác nhận');
});

test('14_1_030_017 — Còn lại tính đúng và tooltip các cột xử lý', async ({ page, browser }) => {
	chanNeuTat('14_1_030_017');
	const { p, dr } = await phieuCoDot(page, browser);
	const bang = dr.locator('.ant-table').first();
	const th = (await bang.locator('thead th').allInnerTexts()).map(t.chuan);
	const hang = bang.locator('tbody tr.ant-table-row');
	expect(await hang.count()).toBeGreaterThan(0);
	const items = await t.itemCua(pt, p.id);
	for (let i = 0; i < (await hang.count()); i++) {
		const o = (await hang.nth(i).locator('td').allInnerTexts()).map(t.chuan);
		const v = (ten) => so(o[th.findIndex((x) => x.startsWith(ten))]);
		expect(o[th.findIndex((x) => x.startsWith('SL duyệt'))], `🔴 Dòng ${i + 1}: cột "SL duyệt" của phiếu con (tỉnh tách) hiện "--" — tách sinh dòng mới với approvedQuantity = null`).not.toBe('--');
		expect(v('Còn lại'), `Dòng ${i + 1}: Còn lại ≠ SL duyệt − Đã trả − Đã nhập lại − Đã huỷ`).toBe(v('SL duyệt') - v('Đã trả') - v('Đã nhập lại') - v('Đã huỷ'));
		const it = items[i];
		expect(v('Giá gốc lô'), `Dòng ${i + 1}: "Giá gốc lô" khác giá lô trên phiếu`).toBe(Number(it.price));
	}
	for (const [ten, goi] of [['Đã trả', 'Số lượng đã trả cho nhà cung cấp'], ['Đã nhập lại', 'Số lượng đã nhập lại về kho gốc'], ['Đã huỷ', 'Số lượng đã huỷ (hàng vỡ hỏng)']]) {
		await bang.locator('thead th').filter({ hasText: ten }).first().locator('span, .anticon').last().hover();
		await expect(page.locator('.ant-tooltip:visible').last(), `Cột "${ten}" không có tooltip`).toContainText(goi, { timeout: 5_000 });
		await page.mouse.move(5, 5);
	}
	// Giá gốc lô giữ nguyên qua cấp: phiếu con (tỉnh tách) mang đúng giá dòng phiếu gốc điểm bán.
	const cha = await t.itemCua(ps, p.cha.id);
	expect(items.map((x) => Number(x.price)), 'Giá gốc lô đổi khi tách sang phiếu con').toEqual(cha.filter((x) => x.productId === items[0].productId).map((x) => Number(x.price)));
});

test('14_1_010_042 — Giá gốc lô lấy theo từng lô, không nhập tay', async ({ page }) => {
	chanNeuTat('14_1_010_042');
	const tc = t.nguon().TC;
	const ds = ((await t.k.goiApi(ps.page, ps.st, '/stock/v2/batch-product', { shopId: t.seed.doc().duLieu.diemBan.shopId, productId: tc, size: 200 })).data || [])
		.filter((l) => Number(l.remainQuantity) - Number(l.reservedQuantity || 0) >= 1 && l.inventoryId !== t.seed.doc().duLieu.khoPhu?.id);
	const hai = [];
	for (const l of ds) if (!hai.find((x) => Number(x.price) === Number(l.price))) hai.push(l);
	expect(hai.length, 'SP TC không có 2 lô giá nhập khác nhau').toBeGreaterThanOrEqual(2);
	const [a, b] = hai;
	ghi(`lô ${a.batchCode} giá ${a.price} · lô ${b.batchCode} giá ${b.price}`);
	// Form tạo: bảng dòng SKU chỉ có ô số lượng — không có ô giá.
	const box = await t.moFormTao(page);
	await t.doiNguonSku(page, box);
	const r = await t.themSku(page, box, t.seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham);
	const th = (await t.hang(box).first().locator('xpath=ancestor::table').locator('thead th').allInnerTexts()).map(t.chuan).join(' | ');
	ghi(`cột form: ${th}`);
	expect(await r.locator('.ant-input-number-input').count(), 'Dòng SKU có hơn một ô số (có ô nhập giá?)').toBe(1);
	expect(th, 'Form có cột nhập giá').not.toMatch(/Đơn giá|Giá nhập|Nhập giá/);
	const p = await t.taoPhieuApi(ps.page, ps.st, { items: [t.dongTuLo(a, 1), t.dongTuLo(b, 1)], note: 'AUTO TEST 14_1 010_042 hai lô khác giá' });
	try {
		const it = await t.itemCua(ps, p.id);
		expect(it.map((x) => Number(x.price)).sort(), 'Giá gốc lô trên phiếu ≠ giá nhập từng lô').toEqual([Number(a.price), Number(b.price)].sort());
		await t.diToi(page, `${t.ROUTE}?detailId=${p.id}`);
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu xuất trả NCC' }).last();
		await expect(dr.locator('.ant-descriptions')).toBeVisible({ timeout: 30_000 });
		const bang = dr.locator('.ant-table').first();
		const cot = (await bang.locator('thead th').allInnerTexts()).map(t.chuan);
		const iGia = cot.findIndex((x) => x.startsWith('Giá gốc lô'));
		const gia = [];
		for (let i = 0; i < (await bang.locator('tbody tr.ant-table-row').count()); i++) gia.push(so((await bang.locator('tbody tr.ant-table-row').nth(i).locator('td').allInnerTexts())[iGia]));
		expect(gia.sort(), 'Màn chi tiết không hiện đúng giá gốc từng lô').toEqual([Number(a.price), Number(b.price)].sort());
	} finally {
		await t.donPhieu(null, ps, p.id);
	}
});
