'use strict';

/**
 * 14_2 — các case vai `tct`: 020_003 (nội dung hộp tách cấp TCT) · 020_010 (TCT tách phiếu Đã gửi TCT) ·
 * 060_009 (cụm quyết định cấp TCT) · 060_016 (sai cấp không thấy nút) · 060_017 (API quyết định sai cấp).
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `StockReturnRequestListPage.jsx` (`doSplit` nội dung theo `isChain`, `?detailId=`),
 * `ReturnRequestDetailDrawer.jsx` (`rowActions`: TCT chỉ có "Tách phiếu" ở APPROVED), `SupplierBatchSection.jsx`
 * (`REJECT_DECISIONS.TONG_CONG_TY`, `canDecide = rejectStage === orgLevel`). BE `split` (TCT thêm SEND_TO_TCT) ·
 * `sendToTct` (sinh phiếu ở kho TCT, `createFromId` = phiếu tỉnh) · `rejectSupplierBatch` (`rejectStage = orgUnitType` phiếu).
 * Tiền đề: `tien-de.province.spec.js` (TC có nguồn PO TCT ở điểm bán). Phiên phụ `province` + `shop` dựng phiếu.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('./tra-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const ok = (b, viec) => expect(String(b?.status?.code), `${viec} lỗi: ${b?.status?.message}`).toBe('200');

let pc = null; // phiên chính TCT
let pt = null; // phiên phụ tỉnh
let ps = null; // phiên phụ điểm bán
test.describe.configure({ timeout: 360_000 });
test.beforeEach(async ({ page, browser }) => {
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh(VAI, page, st);
	pc = { page, st };
});
// Phiên phụ tỉnh + điểm bán mở một lần; đăng ký cho `goiDuyet` dùng lại (mở thêm phiên tỉnh = xoay token phiên phụ).
test.beforeAll(async ({ browser }) => {
	pt = await t.k.moPhienPhu(browser, 'province', t.ROUTE);
	ps = await t.k.moPhienPhu(browser, 'shop', t.ROUTE);
	t.datPhienSan('province', pt);
});
test.afterAll(async () => {
	t.datPhienSan('province', null);
	await ps?.dong();
	await pt?.dong();
});

/** Tỉnh: phiếu TC "Chưa gửi TCT" → gửi lên TCT. Trả { tinh, tct } — phiếu tỉnh (SEND_TO_TCT) + phiếu sinh ở kho TCT. */
async function guiLenTct(browser) {
	// 🔴 Hàng TC có nguồn PO TCT gửi TCT bị BE chặn (truy vết không qua phiếu chuyển khác pod — xem 050_001) ⇒ dùng lô
	//    nhập tay (BE nhận được) để đi tiếp luồng phía TCT.
	const p = await t.phieuDaDuyet(browser, ps, { loai: ['TC_TAY'], sl: 1 });
	expect((await t.tach(pt, p.id))[0].status).toBe('TCT_NOT_SENT');
	ok(await t.goi(pt, `/${p.id}/send-to-tct`), 'Gửi TCT');
	let tct = null;
	await expect.poll(async () => {
		// Phiếu sinh ở đơn vị nhập lô (lô nhập tay ⇒ chính điểm bán) ⇒ tìm cả ở danh sách TCT lẫn danh sách điểm bán.
		const ds = [...((await t.doc(pc, '', { page: 0, size: 50 }))?.data || []), ...((await t.doc(ps, '', { page: 0, size: 50 }))?.data || [])];
		tct = ds.find((x) => Number(x.createFromId) === Number(p.id)) || null;
		return Boolean(tct);
	}, { timeout: 60_000, message: `TCT không thấy phiếu sinh từ ${p.code}` }).toBe(true);
	ghi(`tỉnh ${p.code} → TCT ${tct.code} (${tct.status}, isTct ${tct.isTct})`);
	return { tinh: p, tct };
}

/** Mở drawer chi tiết phiếu `id` bằng `?detailId=` (🚫 page.goto). */
async function moChiTietId(page, id) {
	await t.diToi(page, `${t.ROUTE}?detailId=${id}`);
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu xuất trả NCC' }).last();
	await expect(dr.locator('.ant-descriptions')).toBeVisible({ timeout: 30_000 });
	return dr;
}

async function khungDot(page, id, batchId) {
	const dr = await moChiTietId(page, id);
	const k = dr.locator('.rounded-lg').filter({ hasText: `Đợt #${batchId}` }).first();
	await expect(k, `Không thấy khung Đợt #${batchId}`).toBeVisible({ timeout: 20_000 });
	return { dr, k };
}

/** TCT: phiếu ở kho TCT → duyệt → tách → trả NCC 1 → NCC từ chối ⇒ đợt có rejectStage TONG_CONG_TY. */
async function dotTuChoiTct(browser) {
	const { tct } = await guiLenTct(browser);
	const d = await t.goiDuyet(browser, 'tct', tct.id);
	ok(d, 'TCT duyệt');
	const c = await t.tach(pc, tct.id);
	ghi(`TCT tách ${tct.code}: ${c.map((x) => `${x.code}/${x.status}/${x.supplierName}`).join(', ')}`);
	const la = c[0];
	const it = (await t.itemCua(pc, la.id))[0];
	ok(await t.goi(pc, `/${la.id}/return-to-supplier`, { items: [{ itemId: it.id, quantity: 1 }] }), 'TCT trả NCC');
	const b = ((await t.doc(pc, `/${la.id}/supplier-batches`))?.data || [])[0];
	ok(await t.goi(pc, `/supplier-batches/${b.id}/reject`, { reason: 'AUTO TEST 14_2 TCT' }), 'NCC từ chối');
	const b2 = ((await t.doc(pc, `/${la.id}/supplier-batches`))?.data || [])[0];
	expect(b2.rejectStage).toBe('TONG_CONG_TY');
	return { id: la.id, batch: b2 };
}

/** Tỉnh: đợt trả phiếu TD1 bị NCC từ chối ⇒ rejectStage BUU_DIEN_TINH. */
async function dotTuChoiTinh(browser) {
	const p = await t.phieuConTinh(browser, ps, pt, { sl: 1 });
	const it = (await t.itemCua(pt, p.id))[0];
	ok(await t.goi(pt, `/${p.id}/return-to-supplier`, { items: [{ itemId: it.id, quantity: 1 }] }), 'Tỉnh trả NCC');
	const b = ((await t.doc(pt, `/${p.id}/supplier-batches`))?.data || [])[0];
	ok(await t.goi(pt, `/supplier-batches/${b.id}/reject`, { reason: 'AUTO TEST 14_2' }), 'NCC từ chối');
	return { id: p.id, batch: { ...b, rejectStage: 'BUU_DIEN_TINH' } };
}

test.describe('14_2 — vai TCT', () => {
	test('14_2_020_003 — Nội dung hộp xác nhận tách đổi theo cấp', async ({ page, browser }) => {
		chanNeuTat('14_2_020_003');
		// Cấp tỉnh — trên list của tỉnh (phiên phụ không thao tác UI ⇒ đo ở spec tỉnh 020_003); ở đây kiểm cấp TCT.
		const { tct } = await guiLenTct(browser);
		ok(await t.goiDuyet(browser, 'tct', tct.id), 'TCT duyệt');
		const dr = await moChiTietId(page, tct.id);
		await dr.locator('.ant-drawer-footer button').filter({ hasText: 'Tách phiếu' }).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Tách phiếu theo nhà cung cấp?' }).last();
		await expect(hop).toBeVisible();
		await expect(hop).toContainText('Hệ thống sẽ tách các sản phẩm theo đúng nhà cung cấp ban đầu');
		await expect(hop).not.toContainText('tự doanh theo NCC cấp tỉnh');
		await hop.getByRole('button', { name: /Cancel|Huỷ|Hủy/ }).click();
	});

	test('14_2_020_010 — TCT tách được phiếu ở trạng thái Đã gửi TCT', async ({ page, browser }) => {
		chanNeuTat('14_2_020_010');
		const { tinh } = await guiLenTct(browser);
		expect((await t.chiTietPhieu(pc.page, pc.st, tinh.id)).request.status).toBe('SEND_TO_TCT');
		const dr = await moChiTietId(page, tinh.id);
		const nut = (await dr.locator('.ant-drawer-footer button').allInnerTexts()).map(t.chuan);
		ghi(`nút drawer TCT (phiếu Đã gửi TCT): ${nut.join(', ')}`);
		const b = await t.goi(pc, `/${tinh.id}/split`);
		ghi(`API split: ${t.msg(b)} · ${JSON.stringify((b?.data || []).map((x) => [x.code, x.status, x.supplierName]))}`);
		ok(b, 'TCT tách phiếu Đã gửi TCT');
		const kq = b.data;
		// Chỉ 1 NCC cấp TCT (AUTO<N>_NCC) ⇒ BE gán tại chỗ; phiếu nhiều NCC mới sang "TCT đã tách".
		if (kq.some((x) => x.parentId != null)) expect((await t.chiTietPhieu(pc.page, pc.st, tinh.id)).request.status).toBe('TCT_SPLIT');
		else test.info().annotations.push({ type: 'chưa phủ', description: 'Làn chỉ có 1 NCC cấp TCT ⇒ nhánh sinh phiếu con "TCT đã tách" chưa kiểm được; đã kiểm BE cho phép TCT tách phiếu SEND_TO_TCT.' });
		expect(nut, '🔴 Drawer chi tiết không có nút "Tách phiếu" cho phiếu Đã gửi TCT (rowActions chỉ mở ở APPROVED) — TCT không tách được bằng giao diện').toContain('Tách phiếu');
	});

	test('14_2_060_009 — Cụm nút quyết định ở cấp TCT khác cấp tỉnh', async ({ page, browser }) => {
		chanNeuTat('14_2_060_009');
		const { id, batch } = await dotTuChoiTct(browser);
		const { k } = await khungDot(page, id, batch.id);
		await expect(k).toContainText('Cấp TCT xử lý');
		const nut = k.locator('button');
		expect((await nut.allInnerTexts()).map(t.chuan)).toEqual(['Huỷ hàng', 'Nhập kho TCT', 'Hoàn về tỉnh']);
		await expect(nut.filter({ hasText: 'Huỷ hàng' })).toHaveClass(/ant-btn-dangerous/);
		await expect(nut.filter({ hasText: 'Hoàn về tỉnh' })).toHaveClass(/ant-btn-primary/);
		await expect(k.getByRole('button', { name: 'Hoàn về điểm bán' })).toHaveCount(0);
	});

	test('14_2_060_016 — Chỉ đúng cấp đang giữ hàng mới thấy cụm nút quyết định', async ({ page, browser }) => {
		chanNeuTat('14_2_060_016');
		const { id, batch } = await dotTuChoiTinh(browser);
		const { k } = await khungDot(page, id, batch.id);
		await expect(k.locator('.ant-tag')).toHaveText('NCC từ chối — chờ xử lý');
		expect(await k.locator('button').count(), 'TCT thấy nút quyết định trên đợt cấp tỉnh giữ hàng').toBe(0);
	});

	test('14_2_060_017 — Gọi API quyết định sai cấp bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_060_017');
		const { batch } = await dotTuChoiTinh(browser);
		expect(t.msg(await t.goi(pc, `/supplier-batches/${batch.id}/resolve-rejection`, { decision: 'DISPOSE' }))).toBe('Không đúng cấp xử lý hàng bị từ chối');
	});
});
