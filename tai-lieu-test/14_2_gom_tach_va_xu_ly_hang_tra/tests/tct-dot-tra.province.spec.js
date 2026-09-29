'use strict';

/**
 * 14_2 · 050 Gửi phiếu lên TCT · 060 Theo dõi đợt trả NCC — vai `province`.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `StockReturnRequestListPage.jsx` (`doSendToTct` — "Gửi phiếu lên Tổng công ty?",
 * "Đã gửi lên TCT" / "Không gửi được"), `SupplierBatchSection.jsx` (8 nhãn đợt, NCC xác nhận / từ chối, cụm quyết định theo
 * `rejectStage === orgLevel`, ẩn "Hoàn về điểm bán" khi đã nhập kho tỉnh), `CreditNoteBatchBlock.jsx`, `statusConfig.js`
 * (vòng đời). BE `sendToTct` · `confirmSupplierBatch` · `rejectSupplierBatch` · `resolveBatchRejection`.
 * Tiền đề: `tien-de.province.spec.js` — TC (hàng TCT có nguồn PO TCT) + TD1 (tự doanh NCC tỉnh) ở điểm bán seed.
 * 🔴 Gửi TCT sinh phiếu ở kho TCT (pod TCT) — không dọn được; xác nhận đợt trả là bước một chiều.
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

let pt = null;
let ps = null;
test.describe.configure({ timeout: 300_000 });
test.beforeEach(async ({ page, browser }) => {
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

const ok = (b, viec) => expect(String(b?.status?.code), `${viec} lỗi: ${b?.status?.message}`).toBe('200');
const dongMa = (page, ma) => t.dong(page).filter({ has: page.locator('td', { hasText: new RegExp(`^${ma}$`) }) }).first();
const ton = async (p, shopId, productId) => ((await t.k.goiApi(p.page, p.st, '/stock/v2/batch-product', { shopId, productId, size: 500 })).data || []).reduce((s, l) => s + Number(l.remainQuantity || 0), 0);
async function trangThai(page, ma) {
	await t.timMa(page, ma);
	return t.chuan(await dongMa(page, ma).locator('.ant-tag').last().innerText());
}
async function menuMa(page, ma) {
	await t.timMa(page, ma);
	return ((await t.menuXuLy(page, dongMa(page, ma))) || []).map((x) => x.nhan);
}
const hopGui = (page) => page.getByRole('dialog').filter({ hasText: 'Gửi phiếu lên Tổng công ty?' }).last();
async function moHopGui(page, ma) {
	await t.timMa(page, ma);
	await t.bamMenu(page, dongMa(page, ma), 'Gửi lên TCT');
	await expect(hopGui(page)).toBeVisible();
	return hopGui(page);
}

/**
 * Phiếu hàng TCT từ lô GDV nhập tay (không gắn PO/NCC ⇒ mất truy xuất đơn vị nhập) đã tách ⇒ "Chưa gửi TCT".
 * 🔴 Đo 24/09: hàng TỒN ĐẦU KỲ vẫn gửi TCT được (BE nhận điểm bán là đơn vị nhập) — không dùng làm tiền đề.
 */
async function phieuTctDauKy(browser) {
	const p = await t.phieuDaDuyet(browser, ps, { loai: ['TC_TAY'], sl: 1 });
	const ds = await t.tach(pt, p.id);
	expect(ds[0]?.status).toBe('TCT_NOT_SENT');
	return p;
}

// ───────────────────────── 050 — Gửi phiếu lên TCT ─────────────────────────
test.describe('14_2 · 050 — Gửi phiếu lên TCT', () => {
	test('14_2_050_001 — Gửi phiếu hàng Tổng công ty lên TCT', async ({ page, browser }) => {
		chanNeuTat('14_2_050_001');
		const p = await t.phieuChuaGuiTct(browser, ps, pt, { sl: 1 });
		const hop = await moHopGui(page, p.code);
		const cho = page.waitForResponse((r) => r.url().includes('/send-to-tct'), { timeout: 60_000 });
		const tb = await t.thongBao(page, () => hop.getByRole('button', { name: /OK|Đồng ý/ }).click(), 8_000);
		const body = await (await cho).json();
		ghi(`gửi ${p.code}: "${tb}" · ${body?.status?.message}`);
		ok(body, 'Gửi lên TCT');
		expect(tb).toContain('Đã gửi lên TCT');
		expect(await trangThai(page, p.code)).toBe('Đã gửi TCT');
		const ct = await t.moChiTiet(page, dongMa(page, p.code));
		const vd = await t.vongDoi(ct);
		ghi(`vòng đời: ${JSON.stringify(vd)}`);
		expect(vd.find((x) => x.ten === 'Gửi lên Tổng công ty')?.tt, 'Mốc "Gửi lên Tổng công ty" chưa xanh').toBe('finish');
	});

	test('14_2_050_002 — Phiếu đã gửi TCT không gửi lại được', async ({ page }) => {
		chanNeuTat('14_2_050_002');
		const p = ((await t.doc(pt, '', { status: 'SEND_TO_TCT', page: 0, size: 20 }))?.data || []).find((x) => x.orgUnitCode === d().toChuc.maTinh);
		expect(p, 'Chưa có phiếu "Đã gửi TCT" — chạy 050_001 trước').toBeTruthy();
		expect(await menuMa(page, p.code)).not.toContain('Gửi lên TCT');
		expect(t.msg(await t.goi(pt, `/${p.id}/send-to-tct`))).toBe('Chỉ gửi TCT được phiếu con hàng TCT (Chưa gửi TCT)');
	});

	test('14_2_050_003 — Phiếu hàng tự doanh không có mục Gửi lên TCT', async ({ page, browser }) => {
		chanNeuTat('14_2_050_003');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 1 });
		const m = await menuMa(page, p.code);
		for (const v of ['Trả hàng NCC', 'Nhập lại kho', 'Huỷ vỡ hỏng']) expect(m).toContain(v);
		expect(m).not.toContain('Gửi lên TCT');
	});

	test('14_2_050_004 — Tỉnh hết quyền thao tác sau khi gửi lên TCT', async ({ page }) => {
		chanNeuTat('14_2_050_004');
		const p = ((await t.doc(pt, '', { status: 'SEND_TO_TCT', page: 0, size: 20 }))?.data || []).find((x) => x.orgUnitCode === d().toChuc.maTinh);
		expect(p, 'Chưa có phiếu "Đã gửi TCT" — chạy 050_001 trước').toBeTruthy();
		await t.timMa(page, p.code);
		const r = dongMa(page, p.code);
		await expect(r.getByRole('button', { name: 'Chi tiết' })).toBeVisible();
		await expect(r.getByRole('button', { name: 'Xử lý' }), 'Đã gửi TCT mà tỉnh còn menu Xử lý').toHaveCount(0);
	});

	test('14_2_050_005 — Gửi lên TCT không làm hàng di chuyển', async ({ browser }) => {
		chanNeuTat('14_2_050_005');
		const p = await t.phieuChuaGuiTct(browser, ps, pt, { sl: 1 });
		const tc = t.nguon().TC;
		const [hub0, shop0] = [await ton(pt, HUB().shopId, tc), await ton(ps, d().diemBan.shopId, tc)];
		ok(await t.goi(pt, `/${p.id}/send-to-tct`), 'Gửi TCT');
		expect([await ton(pt, HUB().shopId, tc), await ton(ps, d().diemBan.shopId, tc)], 'Gửi TCT (hàng chưa nhập kho tỉnh) làm đổi tồn').toEqual([hub0, shop0]);
	});

	test('14_2_050_006 — Hàng đang nằm kho tỉnh thì gửi TCT phải xuất khỏi kho tỉnh', async ({ browser }) => {
		chanNeuTat('14_2_050_006');
		const tc = t.nguon().TC;
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TC'], sl: 2 });
		const hub0 = await ton(pt, HUB().shopId, tc);
		ok(await t.goi(pt, `/${p.id}/receive-to-province`, { receiveShopId: HUB().shopId, targetInventoryId: HUB().inventoryId }), 'Nhập kho tỉnh');
		expect(await ton(pt, HUB().shopId, tc), 'Nhập kho tỉnh không tăng tồn HUB').toBe(hub0 + 2);
		expect((await t.tach(pt, p.id))[0].status).toBe('TCT_NOT_SENT');
		ok(await t.goi(pt, `/${p.id}/send-to-tct`), 'Gửi TCT');
		expect(await ton(pt, HUB().shopId, tc), '🔴 Gửi TCT không xuất hàng khỏi kho tỉnh').toBe(hub0);
	});

	test('14_2_050_007 — Không xác định được đơn vị nhập hàng thì chặn gửi TCT', async ({ browser }) => {
		chanNeuTat('14_2_050_007');
		// Tiền đề "mất truy xuất": lô GDV nhập tay (không PO/NCC). 🔴 Đo 24/09: BE vẫn gửi được (lấy điểm bán làm đơn vị nhập).
		const p = await phieuTctDauKy(browser);
		const b = await t.goi(pt, `/${p.id}/send-to-tct`);
		expect(t.msg(b)).toBe('Không xác định được đơn vị đã nhập lô hàng từ nhà cung cấp (truy xuất nguồn gốc thất bại hoặc các dòng hàng thuộc nhiều đơn vị nhập khác nhau)');
		expect(b?.status?.label).toBe('ERROR_RETURN_ORIGIN_SHOP_NOT_FOUND');
	});

	test('14_2_050_008 — Phiếu không còn hàng thì chặn gửi TCT', async ({ browser }) => {
		chanNeuTat('14_2_050_008');
		// "Chưa gửi TCT" không xử lý được (không phải trạng thái lá) ⇒ dựng phiếu hàng TCT tỉnh duyệt SL 0 rồi tách.
		// Lô nhập tay: BE truy được đơn vị nhập (chính điểm bán) nên đi tới bước kiểm "còn hàng"; lô có nguồn TCT bị chặn trước ở bước truy vết.
		const p = await t.taoPhieuApi(ps.page, ps.st, { items: [t.dongTuLo(await t.loNguon(ps.page, ps.st, t.nguon().TC, 1, { coNguon: false }), 1)], note: 'AUTO TEST 14_2 050_008 SL 0' });
		await t.duyetDu(browser, 'ward', p.id);
		ok(await t.goiDuyet(browser, 'province', p.id, { sl: 0 }), 'Tỉnh duyệt SL 0');
		const tach = await t.goi(pt, `/${p.id}/split`);
		ghi(`tách phiếu SL 0: ${t.msg(tach)} · ${tach?.data?.[0]?.status}`);
		ok(tach, 'Tách phiếu SL 0');
		const b = await t.goi(pt, `/${p.id}/send-to-tct`);
		expect(t.msg(b)).toBe('Phiếu không còn hàng để gửi lên Tổng công ty');
		expect(b?.status?.label).toBe('ERROR_RETURN_NOTHING_TO_SEND');
	});

	test('14_2_050_009 — Không xác định được kho tỉnh đang giữ hàng thì chặn', async () => {
		chanNeuTat('14_2_050_009');
		test.skip(true, 'Không dựng được tiền đề: "mất tham chiếu kho giữ" = phiếu có province_import_stock_in_out_id trỏ tới phiếu nhập không tồn tại — chỉ sinh ra khi sửa/xoá dữ liệu DB, không có luồng giao diện/API nào tạo ra (DB chỉ SELECT).');
	});

	test('14_2_050_010 — Đóng hộp xác nhận gửi TCT không gửi gì', async ({ page, browser }) => {
		chanNeuTat('14_2_050_010');
		const p = await t.phieuChuaGuiTct(browser, ps, pt, { sl: 1 });
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('send-to-tct')) daGoi.push(r.url()); });
		const hop = await moHopGui(page, p.code);
		await hop.getByRole('button', { name: /Cancel|Huỷ|Hủy/ }).click();
		await expect(hop).toBeHidden();
		await page.waitForTimeout(1_000);
		expect(daGoi).toEqual([]);
		expect(await trangThai(page, p.code)).toBe('Chưa gửi TCT');
	});

	test('14_2_050_011 — Gửi TCT thất bại hiện thông báo backend', async ({ page, browser }) => {
		chanNeuTat('14_2_050_011');
		// Lô TC có nguồn PO TCT (qua phiếu chuyển khác pod) ⇒ BE chặn "không xác định được đơn vị nhập" (xem 050_001).
		const p = await t.phieuChuaGuiTct(browser, ps, pt, { sl: 1 });
		let hop = await moHopGui(page, p.code);
		const tb = await t.thongBao(page, () => hop.getByRole('button', { name: /OK|Đồng ý/ }).click(), 8_000);
		expect(tb, 'FE không hiện chuỗi lỗi của BE').toContain('Không xác định được đơn vị đã nhập lô hàng từ nhà cung cấp');
		await page.keyboard.press('Escape');
		// BE không trả chuỗi ⇒ câu dự phòng (giả lập response, không đổi dữ liệu).
		await page.route('**/send-to-tct', (r) => r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ status: { code: '400' } }) }));
		hop = await moHopGui(page, p.code);
		const tb2 = await t.thongBao(page, () => hop.getByRole('button', { name: /OK|Đồng ý/ }).click(), 8_000);
		await page.unroute('**/send-to-tct');
		expect(tb2).toContain('Không gửi được');
	});
});

// ───────────────────────── 060 — Theo dõi đợt trả NCC ─────────────────────────
const BATCH = {
	WAIT_CONFIRM: 'Chờ NCC xác nhận', CONFIRMED: 'Chờ đối soát hoá đơn', SETTLED: 'Đã xử lý xong', REJECTED: 'NCC từ chối — chờ xử lý',
	REJECTED_DISPOSED: 'NCC từ chối — đã huỷ hàng', REJECTED_RESTOCKED: 'NCC từ chối — đã nhập lại kho', REJECTED_RETURNED_TO_SHOP: 'NCC từ chối — đã hoàn về điểm bán',
};

/** Phiếu TD1 "Chưa trả hàng" đã trả NCC `tra` đơn vị ⇒ { p, batch }. `nhapKho`: nhập kho tỉnh trước khi tách. */
async function coDot(browser, { sl = 5, tra = sl, nhapKho = false } = {}) {
	let p;
	if (nhapKho) {
		p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl });
		ok(await t.goi(pt, `/${p.id}/receive-to-province`, { receiveShopId: HUB().shopId, targetInventoryId: HUB().inventoryId }), 'Nhập kho tỉnh');
		expect((await t.tach(pt, p.id))[0].status).toBe('PROVINCE_NOT_RETURNED');
	} else p = await t.phieuConTinh(browser, ps, pt, { sl });
	const it = (await t.itemCua(pt, p.id))[0];
	ok(await t.goi(pt, `/${p.id}/return-to-supplier`, { items: [{ itemId: it.id, quantity: tra }] }), 'Trả NCC');
	const ds = (await t.doc(pt, `/${p.id}/supplier-batches`))?.data || [];
	expect(ds.length).toBe(1);
	return { p, batch: ds[0], it };
}
const tuChoi = async (batchId, reason = 'AUTO TEST 14_2') => ok(await t.goi(pt, `/supplier-batches/${batchId}/reject`, { reason }), 'NCC từ chối');

/** Mở chi tiết phiếu ⇒ khung đợt `batchId`. */
async function khungDot(page, ma, batchId) {
	await t.timMa(page, ma);
	const dr = await t.moChiTiet(page, dongMa(page, ma));
	const khoi = dr.locator('div.mt-4').filter({ has: page.getByText('Các đợt trả nhà cung cấp', { exact: true }) }).last();
	await expect(khoi, 'Không có khối "Các đợt trả nhà cung cấp"').toBeVisible({ timeout: 20_000 });
	const k = khoi.locator('.rounded-lg').filter({ hasText: `Đợt #${batchId}` }).first();
	await expect(k).toBeVisible();
	return { dr, khoi, k };
}

/**
 * Công nợ NCC tỉnh theo sổ SUPPLIER_DEBT_HISTORY — API tab "Công nợ theo kỳ" (`ShopDebtSupplierPage.jsx`,
 * `GET /shops/supplier-debt/period`, extraData = { openingDebt, newDebt, returnAmount, paidAmount, closingDebt }).
 */
async function congNo() {
	const b = await t.k.goiGhi(pt.page, pt.st, 'GET', '/shops/supplier-debt/period', {
		begin: new Date(2026, 0, 1).getTime(), end: Date.now() + 86400_000, supplierId: d().tuDoanhTinh.supplierId, pageNum: 0, pageSize: 20,
	});
	const x = b?.extraData || b?.data?.extraData;
	return x ? JSON.stringify({ returnAmount: x.returnAmount, closingDebt: x.closingDebt }) : `không có dòng (status ${b?.status?.code} ${b?.status?.message})`;
}

test.describe('14_2 · 060 — Theo dõi đợt trả nhà cung cấp', () => {
	test('14_2_060_001 — Khối Các đợt trả nhà cung cấp hiện đủ thông tin mỗi đợt', async ({ page, browser }) => {
		chanNeuTat('14_2_060_001');
		const { p, batch } = await coDot(browser, { sl: 2 });
		const { k } = await khungDot(page, p.code, batch.id);
		await expect(k.locator('.ant-tag').first()).toHaveText('Chờ NCC xác nhận');
		await expect(k).toContainText('Giá trị');
		await expect(k).toContainText(Number(batch.amount).toLocaleString('vi-VN'));
		await expect(k).toContainText(/Ngày tạo\s*\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
	});

	test('14_2_060_002 — Phiếu chưa có đợt trả hiện trạng thái rỗng', async ({ page, browser }) => {
		chanNeuTat('14_2_060_002');
		const p = await t.phieuChuaTra(browser, ps, pt, { sl: 1 });
		await t.timMa(page, p.code);
		const dr = await t.moChiTiet(page, dongMa(page, p.code));
		await page.waitForTimeout(2_000);
		await expect(dr.getByText('Các đợt trả nhà cung cấp', { exact: true }), '🔴 Phiếu chưa có đợt trả thì khối "Các đợt trả nhà cung cấp" bị ẩn hẳn (SupplierBatchSection trả null) — không có dòng "Chưa có đợt trả"').toBeVisible();
		await expect(dr).toContainText('Chưa có đợt trả');
	});

	test('14_2_060_003 — Ghi nhận nhà cung cấp đã nhận hàng', async ({ page, browser }) => {
		chanNeuTat('14_2_060_003');
		const { p, batch } = await coDot(browser, { sl: 1 });
		const { k } = await khungDot(page, p.code, batch.id);
		await k.getByRole('button', { name: 'NCC xác nhận' }).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Xác nhận NCC đã nhận hàng đợt này?' }).last();
		await expect(hop).toBeVisible();
		const tb = await t.thongBao(page, () => hop.getByRole('button', { name: /OK|Đồng ý/ }).click(), 6_000);
		expect(tb).toContain('Đã xác nhận đợt trả');
		await expect(k.locator('.ant-tag').first()).toHaveText('Chờ đối soát hoá đơn', { timeout: 15_000 });
		await expect(k.locator('.ant-tag').first()).toHaveClass(/ant-tag-orange/);
	});

	test('14_2_060_004 — Công nợ NCC chưa đổi khi đợt còn Chờ NCC xác nhận', async ({ browser }) => {
		chanNeuTat('14_2_060_004');
		const truoc = await congNo();
		const { batch } = await coDot(browser, { sl: 1 });
		expect(batch.status).toBe('WAIT_CONFIRM');
		const sau = await congNo();
		ghi(`công nợ NCC tỉnh: ${truoc} → ${sau}`);
		expect(truoc, 'Không đọc được công nợ NCC tỉnh').not.toMatch(/^không có dòng/);
		expect(sau, '🔴 Bấm Trả hàng mà công nợ NCC đã đổi').toBe(truoc);
	});

	test('14_2_060_005 — Nhãn Chờ đối soát hoá đơn nghĩa là công nợ chưa ghi giảm', async ({ page, browser }) => {
		chanNeuTat('14_2_060_005');
		const { p, batch } = await coDot(browser, { sl: 1 });
		const truoc = await congNo();
		ok(await t.goi(pt, `/supplier-batches/${batch.id}/confirm`), 'NCC xác nhận');
		const sau = await congNo();
		ghi(`công nợ NCC tỉnh: ${truoc} → ${sau}`);
		expect(truoc, 'Không đọc được công nợ NCC tỉnh').not.toMatch(/^không có dòng/);
		expect(sau, '🔴 NCC xác nhận mà công nợ đã ghi giảm (phải chờ chốt hoá đơn điều chỉnh)').toBe(truoc);
		const { k } = await khungDot(page, p.code, batch.id);
		await expect(k.locator('.ant-tag').first()).toHaveText('Chờ đối soát hoá đơn');
		await expect(k.locator('.ant-tag').first()).toHaveClass(/ant-tag-orange/);
	});

	for (const [id, ten, lyDo] of [['14_2_060_006', 'Ghi nhận nhà cung cấp từ chối đợt trả', 'AUTO TEST 14_2 hàng lỗi bao bì'], ['14_2_060_007', 'Lý do từ chối đợt trả là TUỲ CHỌN', '']]) {
		test(`${id} — ${ten}`, async ({ page, browser }) => {
			chanNeuTat(id);
			const { p, batch } = await coDot(browser, { sl: 1 });
			const { k } = await khungDot(page, p.code, batch.id);
			await k.getByRole('button', { name: 'NCC từ chối' }).click();
			const hop = page.getByRole('dialog').filter({ hasText: 'NCC từ chối đợt trả này?' }).last();
			await expect(hop.getByPlaceholder('Lý do từ chối (tuỳ chọn)')).toBeVisible();
			if (lyDo) await hop.getByPlaceholder('Lý do từ chối (tuỳ chọn)').fill(lyDo);
			const tb = await t.thongBao(page, () => hop.getByRole('button', { name: /OK|Đồng ý/ }).click(), 6_000);
			expect(tb).toContain('Đã ghi nhận NCC từ chối — chờ quyết định xử lý');
			await expect(k.locator('.ant-tag').first()).toHaveText('NCC từ chối — chờ xử lý', { timeout: 15_000 });
			await expect(k.locator('.ant-tag').first()).toHaveClass(/ant-tag-orange/);
			if (lyDo) await expect(k).toContainText(`Lý do từ chối: ${lyDo}`);
		});
	}

	test('14_2_060_008 — Cụm nút quyết định ở cấp tỉnh có ba lựa chọn', async ({ page, browser }) => {
		chanNeuTat('14_2_060_008');
		const { p, batch } = await coDot(browser, { sl: 1 });
		await tuChoi(batch.id);
		const { k } = await khungDot(page, p.code, batch.id);
		await expect(k).toContainText('Cấp Tỉnh xử lý');
		const nut = k.locator('button');
		expect((await nut.allInnerTexts()).map(t.chuan)).toEqual(['Huỷ hàng', 'Nhập kho tỉnh', 'Hoàn về điểm bán']);
		await expect(nut.filter({ hasText: 'Huỷ hàng' })).toHaveClass(/ant-btn-dangerous/);
		await expect(nut.filter({ hasText: 'Hoàn về điểm bán' })).toHaveClass(/ant-btn-primary/);
	});

	test('14_2_060_010 — Nút Hoàn về điểm bán biến mất khi hàng đã nhập kho tỉnh', async ({ page, browser }) => {
		chanNeuTat('14_2_060_010');
		const { p, batch } = await coDot(browser, { sl: 1, nhapKho: true });
		await tuChoi(batch.id);
		const { k } = await khungDot(page, p.code, batch.id);
		expect((await k.locator('button').allInnerTexts()).map(t.chuan)).toEqual(['Huỷ hàng', 'Nhập kho tỉnh']);
	});

	test('14_2_060_011 — Gọi API Hoàn về điểm bán khi hàng đã ở kho tỉnh bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_060_011');
		const { batch } = await coDot(browser, { sl: 1, nhapKho: true });
		await tuChoi(batch.id);
		const b = await t.goi(pt, `/supplier-batches/${batch.id}/resolve-rejection`, { decision: 'RETURN_TO_SHOP' });
		expect(t.msg(b)).toBe('Hàng đã nhập về kho tỉnh nên không hoàn về điểm bán được — chọn Nhập lại kho hoặc Huỷ vỡ hỏng');
		expect(b?.status?.label).toBe('ERROR_RETURN_ALREADY_IN_PROVINCE');
	});

	test('14_2_060_012 — Mỗi quyết định có hộp xác nhận riêng', async ({ page, browser }) => {
		chanNeuTat('14_2_060_012');
		const { p, batch } = await coDot(browser, { sl: 1 });
		await tuChoi(batch.id);
		const { k } = await khungDot(page, p.code, batch.id);
		for (const [nut, cau] of [['Huỷ hàng', 'Huỷ hàng bị NCC từ chối (không phát sinh công nợ)?'], ['Nhập kho tỉnh', 'Nhập lại số hàng này vào kho của cấp bạn?'], ['Hoàn về điểm bán', 'Hoàn số hàng này về kho điểm bán gốc?']]) {
			await k.getByRole('button', { name: nut }).click();
			const hop = page.locator('.ant-modal-confirm').filter({ hasText: cau }).last();
			await expect(hop, `Nút "${nut}" không hỏi "${cau}"`).toBeVisible();
			await hop.getByRole('button', { name: /Cancel|Huỷ|Hủy/ }).last().click();
			await expect(hop).toBeHidden();
		}
		expect(((await t.doc(pt, `/${p.id}/supplier-batches`))?.data || [])[0]?.status).toBe('REJECTED');
	});

	test('14_2_060_013 — Quyết định Hoàn về điểm bán trả hàng ngược về kho điểm bán', async ({ page, browser }) => {
		chanNeuTat('14_2_060_013');
		const td1 = t.nguon().TD1;
		const { p, batch } = await coDot(browser, { sl: 5 });
		await tuChoi(batch.id);
		const shop0 = await ton(ps, d().diemBan.shopId, td1);
		const { k, dr } = await khungDot(page, p.code, batch.id);
		await k.getByRole('button', { name: 'Hoàn về điểm bán' }).click();
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Hoàn số hàng này về kho điểm bán gốc?' }).last();
		const tb = await t.thongBao(page, () => hop.getByRole('button', { name: /OK|Đồng ý/ }).click(), 6_000);
		expect(tb).toContain('Đã xử lý');
		expect(await ton(ps, d().diemBan.shopId, td1), 'Tồn điểm bán không tăng đúng 5').toBe(shop0 + 5);
		await expect(k.locator('.ant-tag').first()).toHaveText('NCC từ chối — đã hoàn về điểm bán', { timeout: 15_000 });
		await dr.locator('.ant-drawer-close').first().click();
		const it = (await t.itemCua(pt, p.id))[0];
		ghi(`sau hoàn: returnedQty ${it.returnedQty}, restockedQty ${it.restockedQty}`);
		expect([Number(it.returnedQty), Number(it.restockedQty)], 'Đã trả không giảm 5 / Đã nhập lại không tăng 5').toEqual([0, 5]);
	});

	test('14_2_060_014 — Quyết định Huỷ hàng không phát sinh công nợ', async ({ page, browser }) => {
		chanNeuTat('14_2_060_014');
		const td1 = t.nguon().TD1;
		const { p, batch } = await coDot(browser, { sl: 1 });
		await tuChoi(batch.id);
		const [no0, hub0, shop0] = [await congNo(), await ton(pt, HUB().shopId, td1), await ton(ps, d().diemBan.shopId, td1)];
		const { k } = await khungDot(page, p.code, batch.id);
		await k.getByRole('button', { name: 'Huỷ hàng' }).click();
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Huỷ hàng bị NCC từ chối' }).last();
		expect(await t.thongBao(page, () => hop.getByRole('button', { name: /OK|Đồng ý/ }).click(), 6_000)).toContain('Đã xử lý');
		await expect(k.locator('.ant-tag').first()).toHaveText('NCC từ chối — đã huỷ hàng', { timeout: 15_000 });
		expect(await congNo(), 'Huỷ hàng làm đổi công nợ NCC').toBe(no0);
		expect([await ton(pt, HUB().shopId, td1), await ton(ps, d().diemBan.shopId, td1)], 'Huỷ hàng làm tăng tồn').toEqual([hub0, shop0]);
	});

	test('14_2_060_015 — Quyết định Nhập kho tỉnh đưa hàng vào kho của cấp xử lý', async ({ page, browser }) => {
		chanNeuTat('14_2_060_015');
		const td1 = t.nguon().TD1;
		const { p, batch } = await coDot(browser, { sl: 5 });
		await tuChoi(batch.id);
		const [hub0, shop0] = [await ton(pt, HUB().shopId, td1), await ton(ps, d().diemBan.shopId, td1)];
		const { k } = await khungDot(page, p.code, batch.id);
		await k.getByRole('button', { name: 'Nhập kho tỉnh' }).click();
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Nhập lại số hàng này vào kho của cấp bạn?' }).last();
		expect(await t.thongBao(page, () => hop.getByRole('button', { name: /OK|Đồng ý/ }).click(), 6_000)).toContain('Đã xử lý');
		await expect(k.locator('.ant-tag').first()).toHaveText('NCC từ chối — đã nhập lại kho', { timeout: 15_000 });
		expect(await ton(pt, HUB().shopId, td1), 'Tồn kho tỉnh không tăng đúng 5').toBe(hub0 + 5);
		expect(await ton(ps, d().diemBan.shopId, td1), 'Tồn điểm bán bị đổi').toBe(shop0);
	});

	test('14_2_060_018 — Quyết định trên đợt không ở trạng thái chờ xử lý bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_060_018');
		const { batch } = await coDot(browser, { sl: 1 });
		ok(await t.goi(pt, `/supplier-batches/${batch.id}/confirm`), 'NCC xác nhận');
		expect(t.msg(await t.goi(pt, `/supplier-batches/${batch.id}/resolve-rejection`, { decision: 'DISPOSE' }))).toBe('Đợt trả không ở trạng thái chờ xử lý');
	});

	test('14_2_060_019 — Gửi quyết định không hợp lệ bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_060_019');
		const { batch } = await coDot(browser, { sl: 1 });
		await tuChoi(batch.id);
		expect(t.msg(await t.goi(pt, `/supplier-batches/${batch.id}/resolve-rejection`, { decision: 'XYZ' }))).toBe('Quyết định không hợp lệ');
		expect(((await t.doc(pt, `/${batch.returnRequestId}/supplier-batches`))?.data || [])[0]?.status).toBe('REJECTED');
	});

	test('14_2_060_020 — Xác nhận lại đợt đã xử lý bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_060_020');
		const { batch } = await coDot(browser, { sl: 1 });
		ok(await t.goi(pt, `/supplier-batches/${batch.id}/confirm`), 'NCC xác nhận lần 1');
		expect(t.msg(await t.goi(pt, `/supplier-batches/${batch.id}/confirm`))).toBe('Đợt trả đã được xử lý (xác nhận/từ chối)');
	});

	test('14_2_060_021 — Thao tác trên đợt trả không tồn tại bị chặn', async () => {
		chanNeuTat('14_2_060_021');
		expect(t.msg(await t.goi(pt, '/supplier-batches/999999999/confirm'))).toBe('Không tìm thấy đợt trả');
	});

	test('14_2_060_022 — Khối hoá đơn điều chỉnh chỉ hiện với đợt còn hiệu lực', async ({ page, browser }) => {
		chanNeuTat('14_2_060_022');
		const a = await coDot(browser, { sl: 1 });
		const b = await coDot(browser, { sl: 1 });
		await tuChoi(b.batch.id);
		ok(await t.goi(pt, `/supplier-batches/${b.batch.id}/resolve-rejection`, { decision: 'DISPOSE' }), 'Huỷ hàng');
		const ka = (await khungDot(page, a.p.code, a.batch.id));
		await expect(ka.k, 'Đợt "Chờ NCC xác nhận" không có khối hoá đơn điều chỉnh').toContainText('Hoá đơn điều chỉnh giảm');
		await ka.dr.locator('.ant-drawer-close').first().click();
		const kb = await khungDot(page, b.p.code, b.batch.id);
		await expect(kb.k.locator('.ant-tag').first()).toHaveText('NCC từ chối — đã huỷ hàng');
		await expect(kb.k, 'Đợt đã huỷ hàng vẫn có khối hoá đơn điều chỉnh').not.toContainText('Hoá đơn điều chỉnh giảm');
	});

	test('14_2_060_023 — Đóng hộp xác nhận quyết định không xử lý gì', async ({ page, browser }) => {
		chanNeuTat('14_2_060_023');
		const { p, batch } = await coDot(browser, { sl: 1 });
		await tuChoi(batch.id);
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('resolve-rejection')) daGoi.push(r.url()); });
		const { k } = await khungDot(page, p.code, batch.id);
		await k.getByRole('button', { name: 'Huỷ hàng' }).click();
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Huỷ hàng bị NCC từ chối' }).last();
		await hop.getByRole('button', { name: /Cancel|Huỷ|Hủy/ }).last().click();
		await expect(hop).toBeHidden();
		await page.waitForTimeout(1_000);
		expect(daGoi).toEqual([]);
		await expect(k.locator('.ant-tag').first()).toHaveText('NCC từ chối — chờ xử lý');
	});

	test('14_2_060_024 — Tám trạng thái đợt trả hiển thị đúng nhãn', async ({ page, browser }) => {
		chanNeuTat('14_2_060_024');
		// Dựng đủ đợt ở các trạng thái đi được bằng API (SETTLED cần chốt hoá đơn điều chỉnh — không dựng).
		const ds = [];
		const w = await coDot(browser, { sl: 1 }); ds.push(w);
		const c = await coDot(browser, { sl: 1 }); ok(await t.goi(pt, `/supplier-batches/${c.batch.id}/confirm`), 'confirm'); ds.push(c);
		const r = await coDot(browser, { sl: 1 }); await tuChoi(r.batch.id); ds.push(r);
		for (const dec of ['DISPOSE', 'RESTOCK_HERE', 'RETURN_TO_SHOP']) {
			const x = await coDot(browser, { sl: 1 });
			await tuChoi(x.batch.id);
			ok(await t.goi(pt, `/supplier-batches/${x.batch.id}/resolve-rejection`, { decision: dec }), dec);
			ds.push(x);
		}
		const gap = [];
		for (const x of ds) {
			const tt = ((await t.doc(pt, `/${x.p.id}/supplier-batches`))?.data || [])[0]?.status;
			const { k, dr } = await khungDot(page, x.p.code, x.batch.id);
			const nhan = t.chuan(await k.locator('.ant-tag').first().innerText());
			gap.push(`${tt}=${nhan}`);
			expect(nhan, `Đợt ${tt} sai nhãn`).toBe(BATCH[tt] || tt);
			await dr.locator('.ant-drawer-close').first().click();
		}
		ghi(gap.join(' · '));
		test.info().annotations.push({ type: 'chưa phủ', description: 'SETTLED ("Đã xử lý xong") cần chốt hoá đơn điều chỉnh giảm — không dựng trong case này.' });
	});

	test('14_2_060_025 — Phiếu Đã xử lý xong mà đợt còn chờ NCC thì việc trả chưa khép', async ({ page, browser }) => {
		chanNeuTat('14_2_060_025');
		const { p, batch } = await coDot(browser, { sl: 2, tra: 2 });
		await t.timMa(page, p.code);
		expect(t.chuan(await dongMa(page, p.code).locator('.ant-tag').last().innerText())).toBe('Đã xử lý xong');
		const { dr, k } = await khungDot(page, p.code, batch.id);
		await expect(k.locator('.ant-tag').first()).toHaveText('Chờ NCC xác nhận');
		const vd = await t.vongDoi(dr);
		ghi(`vòng đời: ${JSON.stringify(vd)}`);
		expect(vd.find((x) => x.ten === 'Trả hàng / Xử lý')?.tt, 'Mốc "Trả hàng / Xử lý" đã xanh dù đợt còn chờ NCC').toBe('wait');
		expect(vd.find((x) => x.ten === 'Hoàn tất')?.tt).toBe('wait');
	});
});
