'use strict';

/**
 * 12_3 — Công nợ NCC, nhóm TIỀN (020 + bản sheet Tài chính 030), vai `tct`, GHI THẬT (26/09/2026).
 *
 * 🔴 Tiền đề nợ: phiếu nhập LẺ từ NCC (objectType SUPPLIER, không gắn PO) sinh dòng nợ IMPORT ngay khi checkout
 *    (`SupplierDebtLedgerService.writeImportDebtForStandaloneReceipt`); phiếu thuộc PO chỉ ghi nợ khi kế toán HẠCH TOÁN PO
 *    (`PoInvoiceReconcileServiceImpl`) ⇒ nợ từ PO 13_3 = 0 là đúng thiết kế. Mỗi case tự nhập kho TC từ `AUTO<làn>_NCC` ở kho TCT
 *    (`/stock/v3/import-export` + `/confirm`), số tiền theo kịch bản (10 triệu …).
 * 🔴 Chi tiết công nợ CHỈ có nút "Thanh toán" (ModalDebt.jsx) — "Gạch nợ" / "Ghi nợ" không có lối vào ⇒ các case đó kiểm lối vào (đỏ có lý do).
 * Phiếu chi đọc qua `GET /expenses/view_all_expenses` (màn `/finance/expenditure-management`), phiếu thu qua `view_all_receipts`.
 * Nguồn: vnpost-web `features/supplierDebt/pages/{ShopDebtSupplierPage,ModalDebt,ModalCreateDebt}.jsx`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const { chon } = require('../../shared/db/otp');
const { batHeader, goiGhi } = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const so = (t) => Number(String(t ?? '').replace(/[^\d-]/g, '')) || 0;
const khung = (page) => page.locator('.ant-pro-page-container').first();
const NCC = () => seed.doc().duLieu.nhaCungCap;
const idNcc = () => Number(chon(`select supplier_id from CHAIN_SUPPLIER where code='${NCC().maNcc}' limit 1`, 'VNPOST_CORE'));
const hau = () => Date.now().toString().slice(-6);
const TRIEU = 1_000_000;

async function moMan(page) {
	const st = batHeader(page);
	const cho = page.waitForResponse((r) => r.url().includes('/shops/supplier-debt/list'), { timeout: 60_000 }).catch(() => null);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/debt-reconciliation/supplier-debt`, 'tct');
	await cho;
	await expect(khung(page)).toContainText('Công nợ NCC', { timeout: 30_000 });
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	return { st, goi: (m, u, q, b) => goiGhi(page, st, m, u, q, b), shopId: Number(st.h.shopid) };
}

/** Nhập kho LẺ từ NCC ở kho TCT: `sl` × SP TC giá `gia` (+VAT%, chiết khấu tổng, dòng quà giá 0). Trả { id, tien }. */
async function nhapNcc(m, { sl = 10, gia = TRIEU, vat = 0, giam = 0, qua = 0, sp = null } = {}) {
	// 🔴 SP FIFO (🚫 SP giá tiêu chuẩn: đo 26/09 BE ghi đơn giá phiếu nhập = GIÁ TIÊU CHUẨN, bỏ giá NCC ⇒ nợ NCC sai — xem báo cáo).
	const tc = sp ? { sku: sp.sku, tenSanPham: sp.ten } : seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.fifo;
	const [productUnitId, productId, variantId, unit] = chon(`select product_unit_id, product_id, variant_id, unit from CHAIN_PRODUCT_UNIT where sku='${tc.sku}' and variant_id is not null and convert_to_main_unit=1 limit 1`, 'VNPOST_CORE').split('\t');
	const kho = ((await m.goi('GET', `/shops/${m.shopId}/inventory`))?.data || []).find((k) => k.isDefault)?.id;
	expect(kho, 'Không có kho mặc định của TCT').toBeTruthy();
	const h = hau();
	const dong = (soLuong, donGia, laQua) => {
		const tien = soLuong * donGia;
		const tienVat = laQua ? 0 : Math.round(tien * vat / 100);
		return {
			amount: tien, price: donGia, productId: Number(productId), productName: tc.tenSanPham, batchCode: null,
			batchProducts: [{ batchCode: `A${process.env.VNPOST_LANE || ''}CN${h}${laQua ? 'Q' : ''}`, quantity: soLuong, manufactureDate: new Date().toISOString().slice(0, 10), expiryDate: '2028-12-31', serials: [] }],
			quantity: soLuong, serials: [], totalAmount: tien + tienVat, unit, variantId: Number(variantId), variantName: null, itemId: null, shopId: m.shopId,
			inventoryId: kho, productUnit: unit, convertToMainUnit: 1, productUnitId: Number(productUnitId), enableVat: vat > 0, vatPercent: vat, vat: tienVat,
		};
	};
	const items = [dong(sl, gia, false)];
	if (qua) items.push(dong(qua, 0, true));
	const tien = items.reduce((s, x) => s + x.totalAmount, 0) - giam;
	const tao = await m.goi('POST', '/stock/v3/import-export', { shopId: m.shopId }, {
		code: `NK${h}CN`, objectId: idNcc(), objectType: 'SUPPLIER', discountAmount: giam, discountPercentage: '0.00', imageIds: [], paidAmount: 0,
		note: 'AUTO TEST 12_3 — nhập lẻ từ NCC tạo công nợ', actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: vat > 0, items,
	});
	const id = tao?.data?.stockInOutId ?? tao?.stockInOutId;
	expect(id, `Tạo phiếu nhập NCC lỗi: ${JSON.stringify(tao?.status ?? tao).slice(0, 300)}`).toBeTruthy();
	const xn = await m.goi('POST', '/stock/v3/import-export/confirm', { shopId: m.shopId, stockInOutId: id });
	expect(String(xn?.status?.code ?? '200'), `Xác nhận phiếu nhập lỗi: ${JSON.stringify(xn?.status)}`).toBe('200');
	const ghiNo = Number(chon(`select coalesce(sum(total_amount),0) from SUPPLIER_DEBT_HISTORY where source_type='IMPORT' and source_id=${id}`, podDb()));
	return { id, tien, ghiNo };
}
/** Pod của TCT (lane 8: POD_01 — CONFIG_ROUTING). */
const podDb = () => process.env.VNPOST_POD_TCT || 'VNPOST_POD_01';

async function moChiTiet(page) {
	const o = khung(page).getByPlaceholder(/Tìm/).first();
	const cho = page.waitForResponse((r) => r.url().includes('/shops/supplier-debt/list'), { timeout: 20_000 }).catch(() => null);
	await o.fill(NCC().tenNcc);
	await o.press('Enter');
	await cho;
	await page.waitForTimeout(1_000);
	const r = khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: NCC().tenNcc }).first();
	await expect(r).toBeVisible({ timeout: 20_000 });
	await r.getByRole('button', { name: 'Chi tiết' }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: `Lịch sử ghi nợ và thanh toán - ${NCC().tenNcc}` }).last();
	await expect(dr).toBeVisible({ timeout: 20_000 });
	await page.waitForTimeout(1_500);
	return dr;
}
const tongConNo = async (dr) => so((chuan(await dr.innerText()).match(/Tổng còn nợ:\s*(-?[\d.,]+)/) || [])[1]);
async function dongDrawer(page) { for (let i = 0; i < 3 && (await page.locator('.ant-drawer-open').count()); i += 1) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); } }

/** Thanh toán qua giao diện (mặc định "Thanh toán nợ cũ nhất"); trả { tb, noHienTai }. */
async function thanhToan(page, soTien) {
	const dr = await moChiTiet(page);
	await dr.getByRole('button', { name: 'Thanh toán' }).click();
	const mo = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').filter({ hasText: 'Thanh toán nợ nhà cung cấp' }).last();
	await expect(mo).toBeVisible({ timeout: 15_000 });
	const noHienTai = so(await mo.locator('#allDebt').inputValue().catch(() => '0'));
	const o = mo.getByPlaceholder('Số tiền thanh toán');
	await o.fill(String(soTien));
	await o.press('Tab');
	const tbs = new Set();
	const cho = page.waitForResponse((r) => /supplier-debt|shop-debt|debt/.test(r.url()) && r.request().method() === 'POST', { timeout: 20_000 }).catch(() => null);
	await mo.getByRole('button', { name: 'Xác nhận' }).click();
	for (let i = 0; i < 20; i += 1) { for (const t of await page.locator('.ant-message-notice').allInnerTexts()) tbs.add(chuan(t)); if (tbs.size) break; await page.waitForTimeout(300); }
	const res = await cho;
	await page.waitForTimeout(1_500);
	await dongDrawer(page);
	return { tb: [...tbs].join(' | '), noHienTai, body: res ? await res.json().catch(() => null) : null };
}

/** Phiếu chi (SPA_EXPENSES, nguồn SUPPLIER = NCC làn) / phiếu thu (RECEIPT_EXPENSES) hôm nay của shop phiên — đọc DB (chỉ SELECT). */
async function soPhieu(m, loai) {
	const q = loai === 'chi'
		? `select id, money from SPA_EXPENSES where shop_id=${m.shopId} and source_type='SUPPLIER' and source_id=${idNcc()} and coalesce(deleted,0)=0 and date(created_date)=curdate()`
		: `select id, money from RECEIPT_EXPENSES where shop_id=${m.shopId} and date(created_date)=curdate()`;
	const t = chon(q, podDb());
	return t ? t.split('\n').map((l) => { const [id, money] = l.split('\t'); return { id: +id, money: +money }; }) : [];
}
const tienPhieu = (p) => Math.abs(Number(p?.totalMoney ?? p?.money ?? p?.amount ?? p?.totalAmount ?? 0));

/** Case có số liệu: dựng nợ `goc`, thanh toán từng khoản, đo sau mỗi lần. */
async function chuoiThanhToan(page, goc, cacLan) {
	const m = await moMan(page);
	const n = await nhapNcc(m, { sl: 10, gia: goc / 10 });
	await page.reload();
	await page.waitForTimeout(3_000);
	let dr = await moChiTiet(page);
	const dau = await tongConNo(dr);
	await dongDrawer(page);
	const chiTruoc = (await soPhieu(m, 'chi')).length;
	const lan = [];
	for (const t of cacLan) {
		const kq = await thanhToan(page, t);
		dr = await moChiTiet(page);
		lan.push({ tra: t, tb: kq.tb, conNo: await tongConNo(dr) });
		await dongDrawer(page);
	}
	const chi = await soPhieu(m, 'chi');
	dr = await moChiTiet(page);
	const cho = page.waitForResponse((r) => r.url().includes('/shops/supplier-debt/history'), { timeout: 20_000 }).catch(() => null);
	await dr.getByRole('tab', { name: 'Lịch sử thanh toán' }).click();
	await cho;
	await page.waitForTimeout(1_500);
	const lichSu = (await dr.locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map(chuan);
	await dongDrawer(page);
	ghiDo(`phiếu nhập ${n.id} ghi nợ ${n.ghiNo} (kỳ vọng ${n.tien}) · còn nợ trước ${dau} · ${JSON.stringify(lan)} · phiếu chi hôm nay ${chiTruoc} ⇒ ${chi.length} · lịch sử thanh toán ${lichSu.length} dòng: ${JSON.stringify(lichSu.slice(0, 4))}`);
	return { m, n, dau, lan, chiTruoc, chi, lichSu };
}

test.describe('12_3 — Công nợ NCC: tiền (GHI THẬT)', () => {
	test.describe.configure({ timeout: 420_000 });

	// ─── Thanh toán ───────────────────────────────────────────────────────────────────────
	async function kiemThanhToanMotPhan(page, soTra) {
		const { n, dau, lan } = await chuoiThanhToan(page, 10 * TRIEU, [soTra]);
		expect(n.ghiNo, 'Phiếu nhập lẻ từ NCC không sinh nợ').toBe(n.tien);
		expect(lan[0].tb).toContain('Thêm thành công');
		expect(lan[0].conNo, 'Công nợ không giảm đúng số tiền thanh toán').toBe(dau - soTra);
	}
	test('12_3_020_002 — Thanh toán công nợ thành công', async ({ page }) => { chanNeuTat('12_3_020_002'); await kiemThanhToanMotPhan(page, 2 * TRIEU); });
	test('12_3_030_004 — Thanh toán công nợ thành công', async ({ page }) => { chanNeuTat('12_3_030_004'); await kiemThanhToanMotPhan(page, 2 * TRIEU); });
	test('12_3_020_022 — Thanh toán một phần PO', async ({ page }) => { chanNeuTat('12_3_020_022'); await kiemThanhToanMotPhan(page, 3 * TRIEU); });
	test('12_3_030_024 — Thanh toán một phần PO', async ({ page }) => { chanNeuTat('12_3_030_024'); await kiemThanhToanMotPhan(page, 3 * TRIEU); });

	async function kiemSinhPhieuChi(page) {
		const { chiTruoc, chi, lan } = await chuoiThanhToan(page, 10 * TRIEU, [1_234_000]);
		expect(lan[0].tb).toContain('Thêm thành công');
		expect(chi.length, 'Thanh toán NCC không sinh phiếu chi').toBe(chiTruoc + 1);
		expect(chi.some((p) => tienPhieu(p) === 1_234_000), 'Không có phiếu chi đúng số tiền 1.234.000').toBe(true);
	}
	test('12_3_020_003 — Thanh toán sinh phiếu thu', async ({ page }) => { chanNeuTat('12_3_020_003'); await kiemSinhPhieuChi(page); });
	test('12_3_030_005 — Thanh toán sinh phiếu thu', async ({ page }) => { chanNeuTat('12_3_030_005'); await kiemSinhPhieuChi(page); });

	async function kiemTraDu(page) {
		// Trả đúng TOÀN BỘ còn nợ hiện tại của NCC (không chỉ khoản mới) ⇒ về 0 và sinh phiếu chi.
		const m = await moMan(page);
		await nhapNcc(m, { sl: 10, gia: TRIEU });
		await page.reload();
		await page.waitForTimeout(3_000);
		let dr = await moChiTiet(page);
		const dau = await tongConNo(dr);
		await dongDrawer(page);
		const chiTruoc = (await soPhieu(m, 'chi')).length;
		const kq = await thanhToan(page, dau);
		dr = await moChiTiet(page);
		const sau = await tongConNo(dr);
		const chi = await soPhieu(m, 'chi');
		ghiDo(`còn nợ ${dau} · trả hết: "${kq.tb}" · nợ hiện tại trên form ${kq.noHienTai} · còn nợ sau ${sau} · phiếu chi ${chiTruoc} ⇒ ${chi.length}`);
		expect(sau, 'Trả đúng số nợ mà công nợ không về 0').toBe(0);
		expect(chi.length, 'Không sinh phiếu chi').toBe(chiTruoc + 1);
	}
	test('12_3_020_005 — Thanh toán bằng đúng số nợ', async ({ page }) => { chanNeuTat('12_3_020_005'); await kiemTraDu(page); });
	test('12_3_030_007 — Thanh toán bằng đúng số nợ', async ({ page }) => { chanNeuTat('12_3_030_007'); await kiemTraDu(page); });

	async function kiemNhieuLan(page, cacLan, ketHet) {
		const { dau, lan, lichSu } = await chuoiThanhToan(page, 10 * TRIEU, cacLan);
		let con = dau;
		for (const l of lan) { con -= l.tra; expect(l.conNo, `Sau khi trả ${l.tra} công nợ lệch`).toBe(con); }
		expect(lichSu.length, 'Lịch sử thanh toán không đủ từng lần').toBeGreaterThanOrEqual(cacLan.length);
		if (ketHet) expect(lan.at(-1).conNo).toBe(dau - cacLan.reduce((a, b) => a + b, 0));
	}
	test('12_3_020_006 — Thanh toán nhiều lần cho 1 PO', async ({ page }) => { chanNeuTat('12_3_020_006'); await kiemNhieuLan(page, [1 * TRIEU, 2 * TRIEU, 3 * TRIEU]); });
	test('12_3_030_008 — Thanh toán nhiều lần cho 1 PO', async ({ page }) => { chanNeuTat('12_3_030_008'); await kiemNhieuLan(page, [1 * TRIEU, 2 * TRIEU, 3 * TRIEU]); });
	test('12_3_020_007 — Lưu lịch sử từng lần thanh toán', async ({ page }) => { chanNeuTat('12_3_020_007'); await kiemNhieuLan(page, [500_000, 700_000]); });
	test('12_3_030_009 — Lưu lịch sử từng lần thanh toán', async ({ page }) => { chanNeuTat('12_3_030_009'); await kiemNhieuLan(page, [500_000, 700_000]); });
	test('12_3_020_008 — Kiểm tra tổng công nợ sau nhiều lần thanh toán', async ({ page }) => { chanNeuTat('12_3_020_008'); await kiemNhieuLan(page, [1 * TRIEU, 1 * TRIEU], true); });
	test('12_3_030_010 — Kiểm tra tổng công nợ sau nhiều lần thanh toán', async ({ page }) => { chanNeuTat('12_3_030_010'); await kiemNhieuLan(page, [1 * TRIEU, 1 * TRIEU], true); });
	test('12_3_020_023 — Thanh toán nhiều lần đến hết nợ', async ({ page }) => { chanNeuTat('12_3_020_023'); await kiemNhieuLan(page, [3 * TRIEU, 2 * TRIEU, 5 * TRIEU], true); });
	test('12_3_030_025 — Thanh toán nhiều lần đến hết nợ', async ({ page }) => { chanNeuTat('12_3_030_025'); await kiemNhieuLan(page, [3 * TRIEU, 2 * TRIEU, 5 * TRIEU], true); });
	test('12_3_020_024 — Kiểm tra lịch sử khi thanh toán nhiều lần', async ({ page }) => { chanNeuTat('12_3_020_024'); await kiemNhieuLan(page, [300_000, 200_000, 500_000]); });
	test('12_3_030_026 — Kiểm tra lịch sử khi thanh toán nhiều lần', async ({ page }) => { chanNeuTat('12_3_030_026'); await kiemNhieuLan(page, [300_000, 200_000, 500_000]); });

	async function kiemVuotNo(page) {
		const m = await moMan(page);
		await nhapNcc(m, { sl: 10, gia: TRIEU });
		await page.reload();
		await page.waitForTimeout(3_000);
		const dr = await moChiTiet(page);
		const conNo = await tongConNo(dr);
		await dr.getByRole('button', { name: 'Thanh toán' }).click();
		const mo = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').filter({ hasText: 'Thanh toán nợ nhà cung cấp' }).last();
		const o = mo.getByPlaceholder('Số tiền thanh toán');
		await o.fill(String(conNo + 2 * TRIEU));
		await o.press('Tab');
		const sau = so(await o.inputValue());
		ghiDo(`còn nợ ${conNo} · nhập ${conNo + 2 * TRIEU} ⇒ ô còn ${sau}`);
		expect(sau, 'Nhập vượt số nợ mà ô không tự về số nợ hiện tại').toBe(conNo);
	}
	test('12_3_030_006 — Thanh toán lớn hơn số nợ', async ({ page }) => { chanNeuTat('12_3_030_006'); await kiemVuotNo(page); });

	// ─── Gạch nợ / Ghi nợ: không có lối vào UI ───────────────────────────────────────────
	async function kiemLoiVao(page, nhan) {
		await moMan(page);
		const dr = await moChiTiet(page);
		const nut = (await dr.getByRole('button').allInnerTexts()).map(chuan);
		ghiDo(`nút trên chi tiết công nợ: ${nut.join(' | ')}`);
		expect(nut.some((t) => t.includes(nhan)), `🔴 Không có nút "${nhan}" trên chi tiết công nợ NCC (ModalCreateDebt còn luồng ${nhan === 'Gạch nợ' ? 'WRITE_OFF' : 'DEBT'} nhưng không có lối vào)`).toBe(true);
	}
	test('12_3_020_010 — Gạch nợ không sinh phiếu thu', async ({ page }) => { chanNeuTat('12_3_020_010'); await kiemLoiVao(page, 'Gạch nợ'); });
	test('12_3_020_011 — Gạch nợ vượt số nợ', async ({ page }) => { chanNeuTat('12_3_020_011'); await kiemLoiVao(page, 'Gạch nợ'); });
	test('12_3_020_012 — Lưu lịch sử gạch nợ', async ({ page }) => { chanNeuTat('12_3_020_012'); await kiemLoiVao(page, 'Gạch nợ'); });
	test('12_3_020_025 — Gạch nợ một phần công nợ', async ({ page }) => { chanNeuTat('12_3_020_025'); await kiemLoiVao(page, 'Gạch nợ'); });
	test('12_3_030_011 — Gạch nợ thành công', async ({ page }) => { chanNeuTat('12_3_030_011'); await kiemLoiVao(page, 'Gạch nợ'); });
	test('12_3_030_012 — Gạch nợ không sinh phiếu thu', async ({ page }) => { chanNeuTat('12_3_030_012'); await kiemLoiVao(page, 'Gạch nợ'); });
	test('12_3_030_013 — Gạch nợ vượt số nợ', async ({ page }) => { chanNeuTat('12_3_030_013'); await kiemLoiVao(page, 'Gạch nợ'); });
	test('12_3_030_014 — Lưu lịch sử gạch nợ', async ({ page }) => { chanNeuTat('12_3_030_014'); await kiemLoiVao(page, 'Gạch nợ'); });
	test('12_3_030_027 — Gạch nợ một phần công nợ', async ({ page }) => { chanNeuTat('12_3_030_027'); await kiemLoiVao(page, 'Gạch nợ'); });
	test('12_3_020_014 — Ghi nợ không sinh phiếu chi', async ({ page }) => { chanNeuTat('12_3_020_014'); await kiemLoiVao(page, 'Ghi nợ'); });
	test('12_3_020_017 — Lưu lịch sử ghi nợ', async ({ page }) => { chanNeuTat('12_3_020_017'); await kiemLoiVao(page, 'Ghi nợ'); });
	test('12_3_020_026 — Ghi nợ bổ sung sau khi đã thanh toán', async ({ page }) => { chanNeuTat('12_3_020_026'); await kiemLoiVao(page, 'Ghi nợ'); });
	test('12_3_030_015 — Ghi nợ thành công', async ({ page }) => { chanNeuTat('12_3_030_015'); await kiemLoiVao(page, 'Ghi nợ'); });
	test('12_3_030_016 — Ghi nợ không sinh phiếu chi', async ({ page }) => { chanNeuTat('12_3_030_016'); await kiemLoiVao(page, 'Ghi nợ'); });
	test('12_3_030_017 — Ghi nợ số tiền âm', async ({ page }) => { chanNeuTat('12_3_030_017'); await kiemLoiVao(page, 'Ghi nợ'); });
	test('12_3_030_018 — Ghi nợ số tiền bằng 0', async ({ page }) => { chanNeuTat('12_3_030_018'); await kiemLoiVao(page, 'Ghi nợ'); });
	test('12_3_030_019 — Lưu lịch sử ghi nợ', async ({ page }) => { chanNeuTat('12_3_030_019'); await kiemLoiVao(page, 'Ghi nợ'); });
	test('12_3_030_028 — Ghi nợ bổ sung sau khi đã thanh toán', async ({ page }) => { chanNeuTat('12_3_030_028'); await kiemLoiVao(page, 'Ghi nợ'); });

	// ─── Tab / đối chiếu / xuất Excel (bản sheet Tài chính) ─────────────────────────────
	async function kiemTab(page, tab) {
		const m = await moMan(page);
		if (tab !== 'Lịch sử trả hàng NCC') { await nhapNcc(m, { sl: 1, gia: 100_000 }); await page.reload(); await page.waitForTimeout(3_000); }
		if (tab === 'Lịch sử thanh toán') await thanhToan(page, 50_000);
		const dr = await moChiTiet(page);
		const cho = page.waitForResponse((r) => r.url().includes('/shops/supplier-debt/history'), { timeout: 15_000 }).catch(() => null);
		await dr.getByRole('tab', { name: tab }).click();
		await cho;
		await page.waitForTimeout(1_500);
		const n = await dr.locator('.ant-table-tbody tr.ant-table-row').count();
		ghiDo(`${tab}: ${n} dòng`);
		await expect(dr.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
		if (tab !== 'Lịch sử trả hàng NCC') expect(n, `Tab "${tab}" không hiện giao dịch vừa phát sinh`).toBeGreaterThan(0);
	}
	test('12_3_030_020 — Kiểm tra tab Lịch sử thanh toán', async ({ page }) => { chanNeuTat('12_3_030_020'); await kiemTab(page, 'Lịch sử thanh toán'); });
	test('12_3_030_021 — Kiểm tra tab Lịch sử ghi nợ', async ({ page }) => { chanNeuTat('12_3_030_021'); await kiemTab(page, 'Lịch sử ghi nợ'); });
	test('12_3_030_022 — Kiểm tra tab Lịch sử trả hàng NCC', async ({ page }) => { chanNeuTat('12_3_030_022'); await kiemTab(page, 'Lịch sử trả hàng NCC'); });

	test('12_3_030_023 — Đối chiếu tổng còn nợ', async ({ page }) => {
		chanNeuTat('12_3_030_023');
		const m = await moMan(page);
		const dr = await moChiTiet(page);
		const tong = await tongConNo(dr);
		const db = chon(`select coalesce(sum(case when type in ('IMPORT','DEBT') then total_amount else 0 end),0), coalesce(sum(case when type='PAYMENT' then total_amount else 0 end),0), coalesce(sum(case when type in ('WRITE_OFF','RETURN','PAYMENT_DISCOUNT','ADJUSTMENT','RECONCILE_ADJUSTMENT') then total_amount else 0 end),0) from SUPPLIER_DEBT_HISTORY where supplier_id=${idNcc()} and shop_id=${m.shopId} and coalesce(is_deleted,0)=0 and coalesce(approval_status,'APPROVED')='APPROVED'`, podDb()).split('\t').map(Number);
		ghiDo(`Tổng còn nợ UI ${tong} · DB ghi nợ ${db[0]} · thanh toán ${db[1]} · khác ${db[2]} ⇒ ${db[0] + db[1] + db[2]}`);
		expect(tong, 'Tổng còn nợ ≠ ghi nợ − thanh toán − gạch/khác').toBe(Math.round(db[0] + db[1] + db[2]));
	});

	test('12_3_030_029 — Xuất Excel lịch sử công nợ', async ({ page }) => {
		chanNeuTat('12_3_030_029');
		await moMan(page);
		const dr = await moChiTiet(page);
		expect(await dr.getByRole('button', { name: /Xuất excel/i }).count(), '🔴 Nút "Xuất excel" lịch sử công nợ đã bị comment-out (ModalDebt.jsx)').toBeGreaterThan(0);
	});

	// ─── Ghi nhận nợ theo nguồn ─────────────────────────────────────────────────────────
	async function kiemVat(page) {
		// VAT phiếu nhập lẻ = cấu hình thuế SP (StockInOutManage.setVatInfoForItem), đơn giá ĐÃ GỒM VAT (vat = tổng × %/(100+%)).
		// ⇒ dựng SP tạm VAT đầu vào 10% (khuôn 08/sp-ghi.taoSpApi), nhập 2 × 550.000 ⇒ nợ 1.100.000, trong đó VAT 100.000.
		const m = await moMan(page);
		const g = require('../../08_quan_ly_san_pham/tests/sp-ghi');
		const mm = { ...m, taoRa: [] };
		const sp = await g.taoSpApi(mm, { ten: `${seed.PREFIX}SP_VAT10_${hau()}`, sku: `${seed.PREFIX_MA}SPV${hau()}`, vat: 10 });
		const n = await nhapNcc(m, { sl: 2, gia: 550_000, sp });
		const [vatPt, vat] = chon(`select vat_percent, vat from SHOP_STOCK_IN_OUT_ITEM where stock_in_out_id=${n.id} limit 1`, podDb()).split('\t').map(Number);
		ghiDo(`SP VAT 10%: 2 × 550.000 (giá gồm VAT) ⇒ dòng nợ ${n.ghiNo} · VAT dòng ${vatPt}% = ${vat}`);
		expect(vatPt, 'Phiếu nhập không nhận VAT 10% của SP').toBe(10);
		expect(n.ghiNo, 'Công nợ NCC không gồm VAT').toBe(1_100_000);
	}
	test('12_3_020_032 — Kiểm tra ghi nhận công nợ NCC với sản phẩm có VAT', async ({ page }) => { chanNeuTat('12_3_020_032'); await kiemVat(page); });
	test('12_3_030_034 — Kiểm tra ghi nhận công nợ NCC với sản phẩm có VAT', async ({ page }) => { chanNeuTat('12_3_030_034'); await kiemVat(page); });

	async function kiemKmQua(page) {
		const m = await moMan(page);
		const n = await nhapNcc(m, { sl: 2, gia: 500_000, giam: 100_000, qua: 1 });
		ghiDo(`2 × 500.000 − chiết khấu 100.000 + 1 quà giá 0 ⇒ kỳ vọng ${n.tien} · dòng nợ ${n.ghiNo}`);
		expect(n.ghiNo, 'Công nợ NCC không trừ khuyến mãi / tính cả hàng tặng').toBe(n.tien);
	}
	test('12_3_020_033 — Kiểm tra ghi nhận công nợ NCC với sản phẩm có khuyến mãi, quà tặng', async ({ page }) => { chanNeuTat('12_3_020_033'); await kiemKmQua(page); });
	test('12_3_030_035 — Kiểm tra ghi nhận công nợ NCC với sản phẩm có khuyến mãi, quà tặng', async ({ page }) => { chanNeuTat('12_3_030_035'); await kiemKmQua(page); });

	/** PO (TCT giao thẳng tỉnh / tỉnh tự đặt / nhận một phần): phiếu nhập thuộc PO chỉ ghi nợ khi HẠCH TOÁN PO. */
	async function kiemNoTheoPo(page, loai) {
		const m = await moMan(page);
		const db = loai === 'tinh' ? 'VNPOST_POD_02' : podDb();
		const ncc = loai === 'tinh' ? Number(chon(`select supplier_id from CHAIN_SUPPLIER where code like '${seed.PREFIX_MA}NCCT%' limit 1`, 'VNPOST_CORE')) : idNcc();
		const soPhieuPo = Number(chon(`select count(distinct i.stock_in_out_id) from SHOP_STOCK_IN_OUT_ITEM i join SHOP_STOCK_IN_OUT s on s.stock_in_out_id=i.stock_in_out_id where s.object_type='SUPPLIER' and s.object_id=${ncc} and s.type='IMPORT' and i.purchase_order_item_id is not null`, db));
		const soNo = Number(chon(`select count(*) from SUPPLIER_DEBT_HISTORY h where h.supplier_id=${ncc} and h.type='IMPORT' and h.source_type='IMPORT' and h.source_id in (select distinct i.stock_in_out_id from SHOP_STOCK_IN_OUT_ITEM i where i.purchase_order_item_id is not null)`, db));
		ghiDo(`${loai}: NCC ${ncc} có ${soPhieuPo} phiếu nhập thuộc PO, ${soNo} dòng nợ IMPORT từ các phiếu đó (nợ PO chỉ ghi khi kế toán hạch toán PO — PoInvoiceReconcileServiceImpl) · shop phiên ${m.shopId}`);
		expect(soPhieuPo, 'Chưa có phiếu nhập thuộc PO để đối chiếu (chạy 13_3)').toBeGreaterThan(0);
		expect(soNo, '🔴 Phiếu nhập theo PO chưa sinh công nợ NCC (chờ hạch toán PO — chưa có luồng hạch toán trên môi trường test)').toBeGreaterThan(0);
	}
	test('12_3_020_028 — Kiểm tra ghi nhận công nợ khi TCT đặt hàng thẳng về tỉnh', async ({ page }) => { chanNeuTat('12_3_020_028'); await kiemNoTheoPo(page, 'tct'); });
	test('12_3_030_030 — Kiểm tra ghi nhận công nợ khi TCT đặt hàng thẳng về tỉnh', async ({ page }) => { chanNeuTat('12_3_030_030'); await kiemNoTheoPo(page, 'tct'); });
	test('12_3_020_030 — Kiểm tra ghi nhận công nợ NCC của tỉnh', async ({ page }) => { chanNeuTat('12_3_020_030'); await kiemNoTheoPo(page, 'tinh'); });
	test('12_3_030_032 — Kiểm tra ghi nhận công nợ NCC của tỉnh', async ({ page }) => { chanNeuTat('12_3_030_032'); await kiemNoTheoPo(page, 'tinh'); });
	test('12_3_020_031 — Kiểm tra ghi nhận công nợ NCC khi nhận giao 1 phần', async ({ page }) => { chanNeuTat('12_3_020_031'); await kiemNoTheoPo(page, 'tct'); });
	test('12_3_030_033 — Kiểm tra ghi nhận công nợ NCC khi nhận giao 1 phần', async ({ page }) => { chanNeuTat('12_3_030_033'); await kiemNoTheoPo(page, 'tct'); });

	async function kiemTraHang(page) {
		// Trả hàng NCC (14_2, HUB tỉnh làn) ghi dòng RETURN trừ nợ — đối chiếu công thức trên sổ của NCC tỉnh.
		await moMan(page);
		const ncc = Number(chon(`select supplier_id from CHAIN_SUPPLIER where code like '${seed.PREFIX_MA}NCCT%' limit 1`, 'VNPOST_CORE'));
		const r = chon(`select h.shop_id, coalesce(sum(case when h.type in ('IMPORT','DEBT') then h.total_amount else 0 end),0), coalesce(sum(case when h.type='RETURN' then h.total_amount else 0 end),0), coalesce(sum(h.total_amount),0), (select coalesce(d.total_amount,0)-coalesce(d.paid_money,0)-coalesce(d.return_money,0)-coalesce(d.discount_money,0)-coalesce(d.adjust_money,0) from SHOP_SUPPLIER_DEBT d where d.shop_id=h.shop_id and d.supplier_id=h.supplier_id limit 1) from SUPPLIER_DEBT_HISTORY h where h.supplier_id=${ncc} and coalesce(h.is_deleted,0)=0 group by h.shop_id`, 'VNPOST_POD_02');
		ghiDo(`NCC tỉnh ${ncc}: shop · ghi nợ · trả hàng · Σ sổ · còn nợ bảng tổng = ${r.replace(/\n/g, ' ; ')}`);
		const [, ghiNo, tra, tong, conNo] = r.split('\n')[0].split('\t').map(Number);
		expect(tra, 'Chưa có dòng trả hàng NCC để đối chiếu (chạy 14_2)').toBeLessThan(0);
		expect(Math.round(conNo), 'Còn nợ (bảng tổng) ≠ Nợ gốc − Tổng đã trả hàng').toBe(Math.round(ghiNo + tra));
		void tong;
	}
	test('12_3_020_029 — Kiểm tra trừ nợ khi xuất trả hàng NCC', async ({ page }) => { chanNeuTat('12_3_020_029'); await kiemTraHang(page); });
	test('12_3_030_031 — Kiểm tra trừ nợ khi xuất trả hàng NCC', async ({ page }) => { chanNeuTat('12_3_030_031'); await kiemTraHang(page); });
});
