'use strict';

/**
 * 14_1 — vỏ bổ sung vai `province` (dựng tiền đề bằng helper 14_2 `tra-ghi.js`, hàng có nguồn NCC ở điểm bán seed):
 * 030_019 · 030_020 (vòng đời phiếu đã trả NCC) · 030_027 (bảng "Lịch sử xử lý" của phiếu đã tách) ·
 * 040_003 (điểm bán trực thuộc tỉnh — HUB tỉnh không qua xã — tỉnh duyệt thẳng) · 040_009 (phiếu đã chuyển TCT).
 * Nguồn (vnpost-web — xem fe-moc.json): `ReturnRequestDetailDrawer.jsx` (`historyColumns`, "Xem lịch sử"), `statusConfig.js`
 * (`rrLifecycle`), BE `ReturnRequestService.approve` (điểm bán không có `orgWardCode` ⇒ tỉnh duyệt từ PENDING).
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
const dongMa = (page, ma) => t.dong(page).filter({ has: page.locator('td', { hasText: new RegExp(`^${ma}$`) }) }).first();

let pt = null;
let ps = null;
test.describe.configure({ timeout: 300_000 });
test.beforeEach(async ({ page }) => {
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, 'province');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh('province', page, st);
	pt = { page, st };
});
test.beforeAll(async ({ browser }) => {
	ps = await t.k.moPhienPhu(browser, 'shop', t.ROUTE);
});
test.afterAll(async () => ps?.dong());

async function chiTiet(page, ma) {
	await t.timMa(page, ma);
	return t.moChiTiet(page, dongMa(page, ma));
}

test('14_1_030_019 — Mốc nhập kho tỉnh độc lập với mốc xử lý', async ({ page, browser }) => {
	chanNeuTat('14_1_030_019');
	const p = await t.phieuConTinh(browser, ps, pt, { sl: 2 });
	const it = (await t.itemCua(pt, p.id))[0];
	ok(await t.goi(pt, `/${p.id}/return-to-supplier`, { items: [{ itemId: it.id, quantity: 1 }] }), 'Trả NCC 1');
	const ct = (await t.chiTietPhieu(pt.page, pt.st, p.id)).request;
	ghi(`${p.code}: status ${ct.status}, provinceImportStockInOutId ${ct.provinceImportStockInOutId}`);
	const vd = await t.vongDoi(await chiTiet(page, p.code));
	ghi(`vòng đời: ${JSON.stringify(vd)}`);
	const nhap = vd.find((x) => /nhập kho về tỉnh/.test(x.ten));
	// 🔴 Trả NCC lần đầu ở đơn vị khác đơn vị giữ hàng ⇒ BE tự ghi vế nhập bàn giao ⇒ mốc có thể thành "Đã nhập kho về tỉnh".
	expect(nhap?.ten, '🔴 Mốc nhập kho tỉnh đổi thành "Đã nhập kho về tỉnh" dù người dùng chưa nhập kho (BE tự ghi vế nhập bàn giao khi trả NCC)').toBe('Chờ nhập kho về tỉnh');
	expect(nhap.tt).toBe('wait');
	expect(vd.find((x) => x.ten === 'Chờ xử lý tại tỉnh')?.tt, 'Phiếu đã trả một phần mà mốc trước "Trả hàng / Xử lý" chưa xanh').toBe('finish');
});

test('14_1_030_020 — Phiếu Đã xử lý xong mà đợt trả còn chờ NCC', async ({ page, browser }) => {
	chanNeuTat('14_1_030_020');
	const p = await t.phieuConTinh(browser, ps, pt, { sl: 1 });
	const it = (await t.itemCua(pt, p.id))[0];
	ok(await t.goi(pt, `/${p.id}/return-to-supplier`, { items: [{ itemId: it.id, quantity: 1 }] }), 'Trả NCC đủ');
	expect(((await t.doc(pt, `/${p.id}/supplier-batches`))?.data || [])[0]?.status).toBe('WAIT_CONFIRM');
	await t.timMa(page, p.code);
	expect(t.chuan(await dongMa(page, p.code).locator('.ant-tag').last().innerText())).toBe('Đã xử lý xong');
	const vd = await t.vongDoi(await t.moChiTiet(page, dongMa(page, p.code)));
	ghi(`vòng đời: ${JSON.stringify(vd)}`);
	expect(vd.find((x) => x.ten === 'Trả hàng / Xử lý')?.tt, 'Đợt còn chờ NCC mà mốc "Trả hàng / Xử lý" đã xanh').toBe('wait');
	expect(vd.find((x) => x.ten === 'Hoàn tất')?.tt).toBe('wait');
});

test('14_1_030_027 — Bảng phiếu con của phiếu đã tách đủ cột', async ({ page, browser }) => {
	chanNeuTat('14_1_030_027');
	const p = await t.phieuConTinh(browser, ps, pt, { sl: 1 });
	const dr = await chiTiet(page, p.cha.code);
	await dr.getByRole('button', { name: 'Xem lịch sử' }).click();
	const ls = page.locator('.ant-drawer-open').filter({ hasText: 'Lịch sử xử lý' }).last();
	await expect(ls.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
	const cot = (await ls.locator('.ant-table-thead th').allInnerTexts()).map(t.chuan).filter(Boolean);
	ghi(`cột: ${cot.join(' | ')}`);
	expect(cot, 'Bảng lịch sử/phiếu con không đúng 6 cột kịch bản').toEqual(['Cấp', 'Mã phiếu', 'Trạng thái', 'NCC', 'SL duyệt', 'Cập nhật']);
});

test('14_1_040_003 — Điểm bán trực thuộc tỉnh được tỉnh duyệt thẳng', async ({ page }) => {
	chanNeuTat('14_1_040_003');
	// HUB tỉnh là điểm bán/kho trực thuộc tỉnh, không qua xã (bộ chọn kho hiện HUB ngay dưới tỉnh). Tỉnh có quyền lập phiếu.
	const hub = t.seed.doc().duLieu.hubTinh;
	const lo = ((await t.k.goiApi(pt.page, pt.st, '/stock/v2/batch-product', { shopId: hub.shopId, productId: t.nguon().TD1, size: 200 })).data || [])
		.filter((l) => Number(l.remainQuantity) - Number(l.reservedQuantity || 0) >= 1 && l.inventoryId === hub.inventoryId);
	expect(lo.length, 'HUB tỉnh không còn lô TD1 khả dụng').toBeGreaterThan(0);
	const l = lo[0];
	const tao = await t.k.goiGhi(pt.page, pt.st, 'POST', t.API, {}, {
		shopId: hub.shopId, sourceType: 'BY_SKU', note: 'AUTO TEST 14_1 040_003 điểm bán trực thuộc tỉnh', draft: false,
		items: [{ productId: l.productId, variantId: l.variantId, productName: l.productName, variantName: l.variantName, unitId: l.productUnitId, unitName: l.unit || 'Cái', convertToMainUnit: 1, quantity: 1, batchCode: l.batchCode, batchProductId: l.batchProductId, sourceShopId: hub.shopId, inventoryId: l.inventoryId }],
	});
	ok(tao, 'Tỉnh lập phiếu trả ở HUB');
	const id = tao.data.id;
	const ct0 = (await t.chiTietPhieu(pt.page, pt.st, id)).request;
	ghi(`${ct0.code}: status ${ct0.status}, orgWardCode ${ct0.orgWardCode}`);
	expect(ct0.orgWardCode ?? null, 'Phiếu HUB mang mã xã — không phải điểm bán trực thuộc tỉnh').toBeNull();
	await t.timMa(page, ct0.code);
	const m = ((await t.menuXuLy(page, dongMa(page, ct0.code))) || []).map((x) => x.nhan);
	expect(m, 'Tỉnh không có "Duyệt" cho phiếu Chờ duyệt của điểm bán trực thuộc').toContain('Duyệt');
	ok(await t.goiDuyet(null, 'province', id), 'Tỉnh duyệt thẳng');
	const ct = (await t.chiTietPhieu(pt.page, pt.st, id)).request;
	expect(ct.status, 'Không sang thẳng "Đã duyệt"').toBe('APPROVED');
	expect(ct.wardApprovedBy ?? null, 'Phiếu đi qua mốc Xã đã duyệt').toBeNull();
	// 🔴 Lọc lại đúng mã cũ thì RTK trả cache (vẫn Chờ duyệt) ⇒ lọc bằng phần đuôi mã để buộc gửi request mới.
	await t.timMa(page, ct0.code.slice(4));
	await expect(dongMa(page, ct0.code).locator('.ant-tag').last()).toHaveText('Đã duyệt');
});

test('14_1_040_009 — Tỉnh không duyệt được phiếu đã chuyển TCT', async ({ browser }) => {
	chanNeuTat('14_1_040_009');
	// Phiếu is_tct = 1 do "Gửi lên TCT" sinh ra (lô TC nhập tay ⇒ BE tạo phiếu TCT ngay tại điểm bán, cùng pod — xem 14_2_050_007).
	const p = await t.phieuDaDuyet(browser, ps, { loai: ['TC_TAY'], sl: 1 });
	expect((await t.tach(pt, p.id))[0].status).toBe('TCT_NOT_SENT');
	ok(await t.goi(pt, `/${p.id}/send-to-tct`), 'Gửi TCT');
	let con = null;
	await expect.poll(async () => {
		con = ((await t.doc(ps, '', { page: 0, size: 50 }))?.data || []).find((x) => Number(x.createFromId) === Number(p.id)) || null;
		return Boolean(con);
	}, { timeout: 60_000 }).toBe(true);
	expect(con.isTct).toBe(1);
	const b = await t.goiDuyet(null, 'province', con.id);
	expect(t.msg(b)).toBe('Phiếu đã chuyển Tổng công ty — chỉ TCT được duyệt');
});
