'use strict';

/**
 * 14_2 · 030 Nhập hàng về kho tỉnh · 040 Xử lý hàng chờ trả — vai `province`.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `StockReturnRequestListPage.jsx` (`rowActions`), `ReceiveToProvinceModal.jsx`
 * (drawer "Nhập hàng về kho tỉnh", kho mặc định tự chọn, nhãn "(mặc định)"), `ProcessActionDrawer.jsx` (3 việc, ô SL
 * `min 0 / max còn lại`, serial), `ReturnRequestDetailDrawer.jsx` (cột Đã trả / Đã nhập lại / Đã huỷ / Còn lại, vòng đời),
 * `statusConfig.js`. BE `receiveToProvince` · `getLeafForProcessing` · `requireRemain` · `finalizeProcessing`.
 * Tiền đề: `tien-de.province.spec.js`. Phiếu TD1 tách tại chỗ ⇒ "Chưa trả hàng", shopId chuyển sang HUB tỉnh.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('./tra-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const d = () => t.seed.doc().duLieu;
const HUB = () => d().hubTinh;
const VIEC = { RETURN: ['Trả hàng NCC', 'Trả hàng nhà cung cấp', 'Trả hàng'], RESTOCK: ['Nhập lại kho', 'Nhập lại kho', 'Nhập lại kho'], DISPOSE: ['Huỷ vỡ hỏng', 'Huỷ hàng vỡ hỏng', 'Xác nhận huỷ'] };

let pt = null;
let ps = null;
test.describe.configure({ timeout: 300_000 });
test.beforeEach(async ({ page, browser }) => {
	// 030_004: giả lập danh sách kho rỗng PHẢI đặt trước khi mở màn — RTK nạp sẵn và giữ cache kho từ lúc vào trang.
	if (test.info().title.startsWith('14_2_030_004')) {
		await page.route((u) => u.pathname.includes(`/shops/${d().hubTinh.shopId}/inventory`), (r) => (r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: { code: '200' }, data: [] }) }) : r.continue()));
	}
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh(VAI, page, st);
	pt = { page, st };
});
// Phiên phụ mở MỘT lần cho cả file — đăng nhập lại mỗi test (vài chục lần/lượt) làm màn chọn phạm vi chập chờn.
test.beforeAll(async ({ browser }) => {
	ps = await t.k.moPhienPhu(browser, 'shop', t.ROUTE);
});
test.afterAll(async () => {
	await ps?.dong();
});

const dongMa = (page, ma) => t.dong(page).filter({ has: page.locator('td', { hasText: new RegExp(`^${ma}$`) }) }).first();
const tonTd1 = async (p, shopId) => ((await t.k.goiApi(p.page, p.st, '/stock/v2/batch-product', { shopId, productId: t.nguon().TD1, size: 500 })).data || []).reduce((s, l) => s + Number(l.remainQuantity || 0), 0);
const tonHub = () => tonTd1(pt, HUB().shopId);
const tonShop = () => tonTd1(ps, d().diemBan.shopId);
const ok = (b, viec) => expect(String(b?.status?.code), `${viec} lỗi: ${b?.status?.message}`).toBe('200');

async function trangThai(page, ma) {
	await t.timMa(page, ma);
	return t.chuan(await dongMa(page, ma).locator('.ant-tag').last().innerText());
}

async function menuMa(page, ma) {
	await t.timMa(page, ma);
	return ((await t.menuXuLy(page, dongMa(page, ma))) || []).map((x) => x.nhan);
}

/** Mở drawer xử lý `viec` của phiếu `ma` qua menu. */
async function moXuLy(page, ma, viec) {
	await t.timMa(page, ma);
	await t.bamMenu(page, dongMa(page, ma), VIEC[viec][0]);
	const dr = page.locator('.ant-drawer-open').filter({ hasText: VIEC[viec][1] }).last();
	await expect(dr, `Không mở drawer "${VIEC[viec][1]}"`).toBeVisible();
	await expect(dr.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
	return dr;
}

/** Trong drawer xử lý: đặt SL dòng đầu rồi bấm nút chính. Trả thông báo. */
async function bamXuLy(page, dr, viec, sl) {
	const o = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('.ant-input-number-input');
	if (sl !== undefined) {
		await o.fill(String(sl));
		await o.press('Tab');
	}
	return t.thongBao(page, () => dr.locator('.ant-drawer-footer button').filter({ hasText: VIEC[viec][2] }).click(), 6_000);
}

/** Số liệu cột trong bảng dòng hàng của drawer chi tiết (dòng đầu). */
async function cotChiTiet(page, ma) {
	await t.timMa(page, ma);
	const dr = await t.moChiTiet(page, dongMa(page, ma));
	const bang = dr.locator('.ant-table').first();
	const tieuDe = (await bang.locator('thead th').allInnerTexts()).map(t.chuan);
	const o = (await bang.locator('tbody tr.ant-table-row').first().locator('td').allInnerTexts()).map(t.chuan);
	const lay = (ten) => Number((o[tieuDe.findIndex((x) => x.startsWith(ten))] || '').replace(/\./g, '').replace(',', '.'));
	const kq = { daTra: lay('Đã trả'), daNhapLai: lay('Đã nhập lại'), daHuy: lay('Đã huỷ'), conLai: lay('Còn lại'), dr };
	return kq;
}

async function dongChiTiet(dr) {
	await dr.locator('.ant-drawer-close').first().click();
	await expect(dr).toBeHidden();
}

// ───────────────────────── 030 — Nhập hàng về kho tỉnh ─────────────────────────
const drNhap = (page) => page.locator('.ant-drawer-open').filter({ hasText: 'Nhập hàng về kho tỉnh' }).last();
async function moNhapKho(page, ma) {
	await t.timMa(page, ma);
	await t.bamMenu(page, dongMa(page, ma), 'Nhập hàng về kho');
	await expect(drNhap(page)).toBeVisible();
	return drNhap(page);
}

test.describe('14_2 · 030 — Nhập hàng về kho tỉnh', () => {
	test('14_2_030_001 — Nhập hàng tạm treo về kho tỉnh', async ({ page, browser }) => {
		chanNeuTat('14_2_030_001');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 2 });
		const truoc = await tonHub();
		const dr = await moNhapKho(page, p.code);
		await expect(dr.locator('.ant-select')).toContainText('(mặc định)', { timeout: 15_000 });
		const tb = await t.thongBao(page, () => dr.locator('.ant-drawer-footer button').filter({ hasText: 'Nhập kho' }).click(), 6_000);
		expect(tb).toContain('Đã nhập hàng về kho tỉnh');
		expect(await tonHub(), 'Tồn TD1 kho tỉnh (HUB) không tăng đúng 2').toBe(truoc + 2);
		await t.timMa(page, p.code);
		const ct = await t.moChiTiet(page, dongMa(page, p.code));
		const vd = await t.vongDoi(ct);
		ghi(`vòng đời: ${JSON.stringify(vd)}`);
		expect(vd.find((x) => x.ten === 'Đã nhập kho về tỉnh')?.tt, 'Mốc "Đã nhập kho về tỉnh" không xanh').toBe('finish');
	});

	test('14_2_030_002 — Bỏ trống Kho nhận bị chặn', async ({ page, browser }) => {
		chanNeuTat('14_2_030_002');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('receive-to-province')) daGoi.push(r.url()); });
		const dr = await moNhapKho(page, p.code);
		const sel = dr.locator('.ant-select').first();
		await expect(sel).toContainText('(mặc định)', { timeout: 15_000 });
		await sel.hover();
		const xoa = sel.locator('.ant-select-clear');
		expect(await xoa.count(), '🔴 Ô "Kho nhận" tự điền kho mặc định và KHÔNG có nút xoá ⇒ không bỏ trống được, cảnh báo "Vui lòng chọn kho nhận hàng" không tới được bằng UI').toBeGreaterThan(0);
		await xoa.click();
		const tb = await t.thongBao(page, () => dr.locator('.ant-drawer-footer button').filter({ hasText: 'Nhập kho' }).click(), 5_000);
		expect(tb).toContain('Vui lòng chọn kho nhận hàng');
		expect(daGoi).toEqual([]);
	});

	test('14_2_030_003 — Kho mặc định có chữ đánh dấu trong danh sách chọn', async ({ page, browser }) => {
		chanNeuTat('14_2_030_003');
		const ds = (await t.k.goiGhi(pt.page, pt.st, 'GET', `/shops/${HUB().shopId}/inventory`)).data || [];
		ghi(`kho HUB: ${JSON.stringify(ds.map((x) => [x.id, x.name, x.isDefault]))}`);
		expect(ds.length, 'Kho tỉnh (HUB) chỉ có 1 kho — chưa đủ tiền đề ≥ 2 kho (chạy tiền đề 14_2 để thêm kho phụ HUB)').toBeGreaterThanOrEqual(2);
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		const dr = await moNhapKho(page, p.code);
		await dr.locator('.ant-select').first().click();
		const opt = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
		await expect(opt.first()).toBeVisible();
		const nhan = (await opt.allInnerTexts()).map(t.chuan);
		ghi(`option: ${nhan.join(' | ')}`);
		for (const k of ds) {
			const o = nhan.find((x) => x.startsWith(k.name));
			expect(o, `Thiếu kho ${k.name}`).toBeTruthy();
			if (k.isDefault) expect(o).toBe(`${k.name} (mặc định)`);
			else expect(o, `Kho không mặc định ${k.name} lại có chữ "(mặc định)"`).toBe(k.name);
		}
		await page.keyboard.press('Escape');
	});

	test('14_2_030_004 — Đơn vị chưa khai kho nào thì không nhập kho được', async ({ page, browser }) => {
		chanNeuTat('14_2_030_004');
		// 🔴 Không dựng được đơn vị cấp tỉnh 0 kho (HUB luôn có kho sinh sẵn) ⇒ giả lập response danh sách kho rỗng.
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('receive-to-province')) daGoi.push(r.url()); });
		const dr = await moNhapKho(page, p.code);
		await dr.locator('.ant-select').first().click();
		await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toContainText('Đơn vị chưa có kho nào');
		await page.keyboard.press('Escape');
		const tb = await t.thongBao(page, () => dr.locator('.ant-drawer-footer button').filter({ hasText: 'Nhập kho' }).click(), 5_000);
		expect(tb).toContain('Vui lòng chọn kho nhận hàng');
		expect(daGoi).toEqual([]);
		test.info().annotations.push({ type: 'giả lập', description: `GET /shops/${HUB().shopId}/inventory trả [] (không đổi dữ liệu).` });
	});

	test('14_2_030_005 — Nhập kho lần thứ hai cho cùng phiếu bị chặn', async ({ page, browser }) => {
		chanNeuTat('14_2_030_005');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		ok(await t.goi(pt, `/${p.id}/receive-to-province`, { receiveShopId: HUB().shopId, targetInventoryId: HUB().inventoryId }), 'Nhập kho lần 1');
		expect(await menuMa(page, p.code), 'Đã nhập kho mà menu còn "Nhập hàng về kho"').not.toContain('Nhập hàng về kho');
		const b = await t.goi(pt, `/${p.id}/receive-to-province`, { receiveShopId: HUB().shopId, targetInventoryId: HUB().inventoryId });
		expect(t.msg(b)).toBe('Hàng của phiếu này đã được nhập về kho tỉnh');
		expect(b?.status?.label).toBe('ERROR_RETURN_ALREADY_RECEIVED');
	});

	test('14_2_030_006 — Nhập kho phiếu chưa duyệt bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_030_006');
		const p = await t.taoPhieuApi(ps.page, ps.st, { items: [t.dongTuLo(await t.loNguon(ps.page, ps.st, t.nguon().TD1, 1), 1)], note: 'AUTO TEST 14_2 030_006' });
		try {
			const b = await t.goi(pt, `/${p.id}/receive-to-province`, { receiveShopId: HUB().shopId, targetInventoryId: HUB().inventoryId });
			expect(t.msg(b)).toBe('Chỉ nhập kho được phiếu đã duyệt và đang treo hàng');
			expect(b?.status?.label).toBe('ERROR_RETURN_NOT_APPROVED');
		} finally {
			await t.donPhieu(browser, ps, p.id);
		}
	});

	/** Phiếu Đã duyệt mà tỉnh duyệt SL 0 ⇒ không khoá tồn (không có phiếu RSV). */
	async function phieuDuyetSl0(browser) {
		const p = await t.taoPhieuApi(ps.page, ps.st, { items: [t.dongTuLo(await t.loNguon(ps.page, ps.st, t.nguon().TD1, 1), 1)], note: 'AUTO TEST 14_2 SL duyệt 0' });
		await t.duyetDu(browser, 'ward', p.id);
		ok(await t.goiDuyet(browser, 'province', p.id, { sl: 0 }), 'Tỉnh duyệt SL 0');
		const ct = (await t.chiTietPhieu(pt.page, pt.st, p.id)).request;
		ghi(`phiếu SL duyệt 0 ${p.code}: status ${ct.status}, reserveStockInOutId ${ct.reserveStockInOutId}`);
		return { ...p, ct };
	}

	test('14_2_030_007 — Nhập kho phiếu chưa khoá tồn bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_030_007');
		const p = await phieuDuyetSl0(browser);
		expect(p.ct.reserveStockInOutId, 'Duyệt SL 0 mà vẫn sinh phiếu khoá tồn — không dựng được tiền đề reserve = null').toBeNull();
		const b = await t.goi(pt, `/${p.id}/receive-to-province`, { receiveShopId: HUB().shopId, targetInventoryId: HUB().inventoryId });
		expect(t.msg(b)).toBe('Phiếu chưa khoá tồn ở kho điểm bán nên không có hàng đang treo');
		expect(b?.status?.label).toBe('ERROR_RETURN_NOT_RESERVED');
	});

	test('14_2_030_008 — Nhập kho khi không còn hàng treo bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_030_008');
		// Tiền đề HDSD "đã trả hết hàng cho NCC" không xảy ra ở trạng thái Đã duyệt (trả NCC chỉ mở sau khi tách) ⇒
		// dùng phiếu Đã duyệt có dòng SL duyệt 0 (remain 0). Phiếu đó cũng không khoá tồn ⇒ BE có thể chặn ở bước trước.
		const p = await phieuDuyetSl0(browser);
		const b = await t.goi(pt, `/${p.id}/receive-to-province`, { receiveShopId: HUB().shopId, targetInventoryId: HUB().inventoryId });
		ghi(`BE: ${t.msg(b)} (${b?.status?.label})`);
		expect(t.msg(b), '🔴 Nhánh "không còn hàng treo" bị che bởi nhánh "chưa khoá tồn" — không tới được').toBe('Phiếu không còn hàng đang treo để nhập kho');
		expect(b?.status?.label).toBe('ERROR_RETURN_NOTHING_TO_RECEIVE');
	});

	test('14_2_030_009 — Thiếu kho đích trong payload bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_030_009');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		const b = await t.goi(pt, `/${p.id}/receive-to-province`, { receiveShopId: HUB().shopId, targetInventoryId: null });
		expect(t.msg(b)).toBe('Thiếu shop nhận hàng hoặc kho đích');
		expect(b?.status?.label).toBe('ERROR_PROVINCE_INVENTORY_REQUIRED');
	});

	test('14_2_030_010 — Chỉ nhập phần hàng đang treo, không tính phần đã trả hoặc đã huỷ', async ({ browser }) => {
		chanNeuTat('14_2_030_010');
		// Trả NCC / huỷ chỉ mở sau khi tách (Chưa trả hàng), còn nhập kho tỉnh chỉ nhận phiếu Đã duyệt ⇒ dựng đúng chuỗi
		// HDSD: 10 → tách → trả 3, huỷ 2 → nhập kho tỉnh phần còn 5.
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 10 });
		const it = (await t.itemCua(pt, p.id))[0];
		ok(await t.goi(pt, `/${p.id}/return-to-supplier`, { items: [{ itemId: it.id, quantity: 3 }] }), 'Trả NCC 3');
		ok(await t.goi(pt, `/${p.id}/dispose`, { items: [{ itemId: it.id, quantity: 2 }] }), 'Huỷ 2');
		const truoc = await tonHub();
		const b = await t.goi(pt, `/${p.id}/receive-to-province`, { receiveShopId: HUB().shopId, targetInventoryId: HUB().inventoryId });
		ghi(`nhập kho sau khi xử lý một phần: ${t.msg(b)} · tồn HUB ${truoc} → ${await tonHub()}`);
		ok(b, '🔴 Nhập kho tỉnh phần còn treo sau khi đã trả/huỷ một phần');
		expect(await tonHub(), 'Nhập kho không đúng 5 (phần còn lại)').toBe(truoc + 5);
	});

	test('14_2_030_011 — Không cần tách phiếu trước mới nhập kho được', async ({ page, browser }) => {
		chanNeuTat('14_2_030_011');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		expect(await trangThai(page, p.code)).toBe('Đã duyệt');
		expect(await menuMa(page, p.code), 'Phiếu Đã duyệt chưa tách không có "Nhập hàng về kho"').toContain('Nhập hàng về kho');
	});

	test('14_2_030_013 — Đóng màn Nhập hàng về kho giữa chừng', async ({ page, browser }) => {
		chanNeuTat('14_2_030_013');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('receive-to-province')) daGoi.push(r.url()); });
		const dr = await moNhapKho(page, p.code);
		await expect(dr.locator('.ant-select')).toContainText('(mặc định)', { timeout: 15_000 });
		await dr.locator('.ant-drawer-close').first().click();
		await expect(dr).toBeHidden();
		expect(daGoi, 'Đóng bằng X mà vẫn POST receive-to-province').toEqual([]);
		const ct = await t.moChiTiet(page, dongMa(page, p.code));
		const vd = await t.vongDoi(ct);
		expect(vd.find((x) => x.ten === 'Chờ nhập kho về tỉnh')?.tt, 'Mốc "Chờ nhập kho về tỉnh" không còn xám').toBe('wait');
	});
});

// ───────────────────────── 040 — Xử lý hàng chờ trả ─────────────────────────
test.describe('14_2 · 040 — Xử lý hàng chờ trả', () => {
	test('14_2_040_001 — Menu Xử lý hiện đúng ba việc xử lý hàng', async ({ page, browser }) => {
		chanNeuTat('14_2_040_001');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 2 });
		const m = await menuMa(page, p.code);
		for (const v of ['Trả hàng NCC', 'Nhập lại kho', 'Huỷ vỡ hỏng']) expect(m, `Menu thiếu "${v}"`).toContain(v);
		ok(await t.goi(pt, `/${p.id}/return-to-supplier`, { items: [{ itemId: (await t.itemCua(pt, p.id))[0].id, quantity: 1 }] }), 'Trả 1');
		const m2 = await menuMa(page, p.code);
		ghi(`Xử lý một phần: ${m2.join(', ')}`);
		for (const v of ['Trả hàng NCC', 'Nhập lại kho', 'Huỷ vỡ hỏng']) expect(m2, `Xử lý một phần mà menu thiếu "${v}"`).toContain(v);
	});

	test('14_2_040_002 — Ba việc dùng chung bố cục, khác tiêu đề và nút chính', async ({ page, browser }) => {
		chanNeuTat('14_2_040_002');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 1 });
		for (const v of ['RETURN', 'RESTOCK', 'DISPOSE']) {
			const dr = await moXuLy(page, p.code, v);
			await expect(dr.locator('.ant-drawer-title')).toHaveText(VIEC[v][1]);
			await expect(dr.locator('.ant-drawer-footer button').last()).toHaveText(VIEC[v][2]);
			const cot = (await dr.locator('.ant-table thead th').allInnerTexts()).map(t.chuan).filter(Boolean);
			expect(cot, `${VIEC[v][1]}: bộ cột sai`).toEqual(['STT', 'Sản phẩm', 'Còn lại', 'SL xử lý', 'Serial']);
			await dr.locator('.ant-drawer-close').first().click();
			await expect(dr).toBeHidden();
		}
	});

	test('14_2_040_003 — Trả hàng cho nhà cung cấp tạo một đợt trả', async ({ page, browser }) => {
		chanNeuTat('14_2_040_003');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 3 });
		const dr = await moXuLy(page, p.code, 'RETURN');
		expect(await bamXuLy(page, dr, 'RETURN', 2)).toContain('Xử lý thành công');
		const c = await cotChiTiet(page, p.code);
		expect([c.daTra, c.conLai], 'Đã trả / Còn lại sai').toEqual([2, 1]);
		const khoi = c.dr.getByText('Các đợt trả nhà cung cấp').locator('..');
		await expect(khoi, 'Không có khối "Các đợt trả nhà cung cấp"').toBeVisible();
		await expect(khoi.locator('.rounded-lg')).toHaveCount(1);
		await expect(khoi.locator('.rounded-lg').first()).toContainText('Chờ NCC xác nhận');
	});

	test('14_2_040_004 — Nhập lại kho giữ hàng ở kho cấp đang xử lý', async ({ page, browser }) => {
		chanNeuTat('14_2_040_004');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 2 });
		const [hub0, shop0] = [await tonHub(), await tonShop()];
		const dr = await moXuLy(page, p.code, 'RESTOCK');
		await expect(dr).toContainText('Hàng sẽ nhập lại vào kho mặc định của cấp đang xử lý');
		expect(await bamXuLy(page, dr, 'RESTOCK', 2)).toContain('Xử lý thành công');
		expect(await tonHub(), 'Tồn kho tỉnh không tăng đúng 2').toBe(hub0 + 2);
		expect(await tonShop(), '🔴 Tồn điểm bán bị đổi khi Nhập lại kho').toBe(shop0);
		const c = await cotChiTiet(page, p.code);
		expect(c.daNhapLai).toBe(2);
	});

	test('14_2_040_005 — Huỷ vỡ hỏng không nhập lại tồn kho', async ({ page, browser }) => {
		chanNeuTat('14_2_040_005');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 2 });
		const [hub0, shop0] = [await tonHub(), await tonShop()];
		const dr = await moXuLy(page, p.code, 'DISPOSE');
		await expect(dr).toContainText('Ghi nhận huỷ vỡ hỏng — không phát sinh công nợ nhà cung cấp.');
		expect(await bamXuLy(page, dr, 'DISPOSE', 1)).toContain('Xử lý thành công');
		expect([await tonHub(), await tonShop()], '🔴 Huỷ vỡ hỏng làm tăng tồn kho').toEqual([hub0, shop0]);
		const c = await cotChiTiet(page, p.code);
		expect([c.daHuy, c.conLai]).toEqual([1, 1]);
		const b = (await t.doc(pt, `/${p.id}/supplier-batches`))?.data || [];
		expect(b.length, 'Huỷ vỡ hỏng mà sinh đợt trả NCC').toBe(0);
	});

	test('14_2_040_006 — Ba việc đều không trừ tồn kho lần nữa', async ({ browser }) => {
		chanNeuTat('14_2_040_006');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 3 });
		const shop0 = await tonShop();
		const it = (await t.itemCua(pt, p.id))[0];
		for (const v of ['return-to-supplier', 'restock', 'dispose']) ok(await t.goi(pt, `/${p.id}/${v}`, { items: [{ itemId: it.id, quantity: 1 }] }), v);
		expect(await tonShop(), '🔴 Tồn điểm bán đổi sau ba việc xử lý').toBe(shop0);
	});

	test('14_2_040_007 — Chia một phiếu cho cả ba việc', async ({ page, browser }) => {
		chanNeuTat('14_2_040_007');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 10 });
		const it = (await t.itemCua(pt, p.id))[0];
		ok(await t.goi(pt, `/${p.id}/return-to-supplier`, { items: [{ itemId: it.id, quantity: 7 }] }), 'Trả 7');
		expect(await trangThai(page, p.code)).toBe('Xử lý một phần');
		ok(await t.goi(pt, `/${p.id}/dispose`, { items: [{ itemId: it.id, quantity: 2 }] }), 'Huỷ 2');
		expect(await trangThai(page, p.code)).toBe('Xử lý một phần');
		ok(await t.goi(pt, `/${p.id}/restock`, { items: [{ itemId: it.id, quantity: 1 }] }), 'Nhập lại 1');
		const c = await cotChiTiet(page, p.code);
		expect([c.daTra, c.daHuy, c.daNhapLai, c.conLai]).toEqual([7, 2, 1, 0]);
		await dongChiTiet(c.dr);
		expect(await trangThai(page, p.code)).toBe('Đã xử lý xong');
	});

	test('14_2_040_008 — Không nhập số lượng dòng nào bị chặn', async ({ page, browser }) => {
		chanNeuTat('14_2_040_008');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 1 });
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'POST' && /return-to-supplier|restock|dispose/.test(r.url())) daGoi.push(r.url()); });
		const dr = await moXuLy(page, p.code, 'RESTOCK');
		expect(await bamXuLy(page, dr, 'RESTOCK', 0)).toContain('Vui lòng nhập số lượng xử lý cho ít nhất 1 sản phẩm');
		expect(daGoi).toEqual([]);
	});

	test('14_2_040_009 — SL xử lý vượt Còn lại không nhập được', async ({ page, browser }) => {
		chanNeuTat('14_2_040_009');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 5 });
		const dr = await moXuLy(page, p.code, 'RETURN');
		const o = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('.ant-input-number-input');
		await o.fill('6');
		await o.press('Tab');
		await expect(o, 'Ô SL xử lý không tự chặn ở 5').toHaveValue('5');
	});

	test('14_2_040_010 — Gọi API với SL xử lý vượt Còn lại bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_040_010');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 5 });
		const it = (await t.itemCua(pt, p.id))[0];
		const b = await t.goi(pt, `/${p.id}/return-to-supplier`, { items: [{ itemId: it.id, quantity: 6 }] });
		expect(t.msg(b)).toMatch(/^Vượt số lượng còn lại: yêu cầu 6(\.0+)?, còn 5(\.0+)?$/);
		ghi(`BE: ${t.msg(b)}`);
	});

	test('14_2_040_011 — SL xử lý bằng đúng Còn lại được chấp nhận', async ({ page, browser }) => {
		chanNeuTat('14_2_040_011');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 5 });
		const dr = await moXuLy(page, p.code, 'RETURN');
		expect(await bamXuLy(page, dr, 'RETURN', 5)).toContain('Xử lý thành công');
		const c = await cotChiTiet(page, p.code);
		expect(c.conLai).toBe(0);
	});

	test('14_2_040_012 — SL xử lý âm không nhập được', async ({ page, browser }) => {
		chanNeuTat('14_2_040_012');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 1 });
		const dr = await moXuLy(page, p.code, 'DISPOSE');
		const o = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('.ant-input-number-input');
		await o.fill('-1');
		await o.press('Tab');
		await expect(o, 'Ô SL xử lý nhận số âm').toHaveValue('0');
	});

	test('14_2_040_015 — Dòng không có serial hiện dấu gạch ngang', async ({ page, browser }) => {
		chanNeuTat('14_2_040_015');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 1 });
		const dr = await moXuLy(page, p.code, 'RETURN');
		const td = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('td').last();
		await expect(td).toHaveText('--');
		await expect(td.locator('.ant-select'), 'Dòng không serial vẫn có ô nhập serial').toHaveCount(0);
	});

	test('14_2_040_016 — Xử lý một phần chuyển phiếu sang trạng thái tương ứng', async ({ page, browser }) => {
		chanNeuTat('14_2_040_016');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 10 });
		const dr = await moXuLy(page, p.code, 'RETURN');
		expect(await bamXuLy(page, dr, 'RETURN', 4)).toContain('Xử lý thành công');
		expect(await trangThai(page, p.code)).toBe('Xử lý một phần');
		expect((await cotChiTiet(page, p.code)).conLai).toBe(6);
	});

	test('14_2_040_017 — Xử lý hết số lượng chuyển phiếu sang Đã xử lý xong', async ({ page, browser }) => {
		chanNeuTat('14_2_040_017');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 6 });
		const dr = await moXuLy(page, p.code, 'RETURN');
		expect(await bamXuLy(page, dr, 'RETURN', 6)).toContain('Xử lý thành công');
		expect(await trangThai(page, p.code)).toBe('Đã xử lý xong');
		const m = await menuMa(page, p.code);
		for (const v of ['Trả hàng NCC', 'Nhập lại kho', 'Huỷ vỡ hỏng']) expect(m, `Đã xử lý xong mà còn "${v}"`).not.toContain(v);
	});

	test('14_2_040_018 — Xử lý phiếu con chưa gắn nhà cung cấp bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_040_018');
		// Phiếu ở trạng thái xử lý được (Chưa trả hàng / Xử lý một phần) chỉ sinh ra từ tách phiếu, và mọi nhánh tách đó
		// đều gán NCC (tỉnh: nhóm NCC tỉnh · TCT: nhóm NCC gốc). Đo trên toàn phạm vi tỉnh rồi mới kết luận.
		const ds = [];
		for (const s of ['PROVINCE_NOT_RETURNED', 'PARTIAL_PROCESSED']) ds.push(...((await t.doc(pt, '', { status: s, page: 0, size: 200 }))?.data || []));
		const thieu = ds.filter((x) => x.supplierId == null);
		ghi(`${ds.length} phiếu xử lý được, ${thieu.length} phiếu thiếu NCC`);
		test.skip(thieu.length === 0, `Không dựng được tiền đề: ${ds.length}/${ds.length} phiếu "Chưa trả hàng"/"Xử lý một phần" trong phạm vi đều đã gắn NCC — mọi nhánh tách của BE đều gán NCC, chặn "Phiếu con chưa gắn nhà cung cấp" chỉ là phòng thủ.`);
		const it = (await t.itemCua(pt, thieu[0].id))[0];
		const b = await t.goi(pt, `/${thieu[0].id}/return-to-supplier`, { items: [{ itemId: it.id, quantity: 1 }] });
		expect(t.msg(b)).toBe('Phiếu con chưa gắn nhà cung cấp');
	});

	test('14_2_040_019 — Xử lý phiếu chưa ở trạng thái cho phép bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_040_019');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		const it = (await t.itemCua(pt, p.id))[0];
		const b = await t.goi(pt, `/${p.id}/return-to-supplier`, { items: [{ itemId: it.id, quantity: 1 }] });
		expect(t.msg(b)).toBe('Phiếu con chưa ở trạng thái xử lý được');
	});

	test('14_2_040_020 — Gửi danh sách item rỗng bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_040_020');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 1 });
		expect(t.msg(await t.goi(pt, `/${p.id}/restock`, { items: [] }))).toBe('Thiếu danh sách item xử lý');
	});

	test('14_2_040_021 — Gửi itemId không thuộc phiếu bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_040_021');
		const a = await t.phieuChuaTra(browser, ps, pt, { sl: 1 });
		const b = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		const itKhac = (await t.itemCua(pt, b.id))[0];
		expect(t.msg(await t.goi(pt, `/${a.id}/dispose`, { items: [{ itemId: itKhac.id, quantity: 1 }] }))).toBe('Item không thuộc phiếu');
	});

	test('14_2_040_022 — Gửi item thiếu số lượng bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_040_022');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 1 });
		const it = (await t.itemCua(pt, p.id))[0];
		expect(t.msg(await t.goi(pt, `/${p.id}/restock`, { items: [{ itemId: it.id }] }))).toBe('Item xử lý không hợp lệ');
	});

	test('14_2_040_024 — Đóng màn xử lý giữa chừng không ghi gì', async ({ page, browser }) => {
		chanNeuTat('14_2_040_024');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 2 });
		const dr = await moXuLy(page, p.code, 'RETURN');
		const o = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('.ant-input-number-input');
		await o.fill('1');
		await dr.locator('.ant-drawer-close').first().click();
		await expect(dr).toBeHidden();
		const c = await cotChiTiet(page, p.code);
		expect([c.daTra, c.conLai]).toEqual([0, 2]);
		expect(((await t.doc(pt, `/${p.id}/supplier-batches`))?.data || []).length, 'Đóng màn mà vẫn sinh đợt trả').toBe(0);
	});

	test('14_2_040_025 — Ma trận trạng thái phiếu và ba việc xử lý', async ({ page }) => {
		chanNeuTat('14_2_040_025');
		const BA = ['Trả hàng NCC', 'Nhập lại kho', 'Huỷ vỡ hỏng'];
		const coPhep = ['PROVINCE_NOT_RETURNED', 'PARTIAL_PROCESSED'];
		const daKiem = [];
		for (const s of ['APPROVED', 'CONSOLIDATED', 'SPLIT', 'PROVINCE_NOT_RETURNED', 'PARTIAL_PROCESSED', 'TCT_NOT_SENT', 'SEND_TO_TCT', 'RETURNED', 'REJECTED', 'CANCELLED']) {
			const p = ((await t.doc(pt, '', { status: s, page: 0, size: 5 }))?.data || [])[0];
			if (!p) continue;
			const m = await menuMa(page, p.code);
			daKiem.push(`${s}:${m.join('/') || '(không menu)'}`);
			for (const v of BA) {
				if (coPhep.includes(s)) expect(m, `${s} thiếu "${v}"`).toContain(v);
				else expect(m, `${s} lại có "${v}"`).not.toContain(v);
			}
		}
		ghi(daKiem.join(' · '));
		expect(daKiem.length, 'Phạm vi tỉnh có quá ít trạng thái để đối chiếu').toBeGreaterThanOrEqual(6);
	});
});
