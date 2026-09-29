'use strict';

/**
 * 09 · 030/040 — XÁC NHẬN phiếu sản xuất bằng vai tỉnh (`province`) trên điểm bán seed.
 *
 * Vì sao vai tỉnh (đo 24/09/2026, xem `sx-ghi.js`): CHT không có nút Tạo/Xác nhận; GDV bị 401 ở cả
 * GET lẫn POST `/production`; chỉ vai tỉnh vừa đọc được danh sách vừa có nút Xác nhận.
 * Vai tỉnh KHÔNG lập được phiếu cho điểm bán POS qua UI (ô "Điểm bán / kho sản xuất" chỉ trả kho ở chế
 * độ HUB ⇒ `inventoryId` rỗng, không hiện ô chọn thành phẩm) ⇒ phiếu Nháp làm tiền đề được lập bằng
 * API `POST /production` với ĐÚNG payload FE gửi (`ProductionCreateDrawer.jsx#handleSubmit`), bằng
 * header phiên của chính vai tỉnh. Phần được kiểm (hộp xác nhận, xác nhận, số liệu sau) đi qua UI.
 *
 * 🔴 Xác nhận sinh phiếu xuất nguyên liệu + phiếu nhập thành phẩm THẬT ở kho seed (không hoàn tác).
 *    Mỗi lượt tiêu 1 × định mức `AUTO8_SP_TC` (tồn ~200, nạp lại bằng phiếu nhập 04_3 khi cạn).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const sx = require('./sx-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

test.describe.configure({ mode: 'serial' });

/** Tra productId/variantId/productUnitId của một sản phẩm theo tên (ô tìm của FE). */
async function traSp(page, st, ten, isComposite) {
	const b = await k.goiApi(page, st, '/chain/products/basic-search-product-unit', { productName: ten, isFull: true, ...(isComposite ? { isComposite: true } : {}), page: 0, size: 20 });
	const x = (b.data || []).find((v) => v.productName === ten);
	expect(x, `Không tra được ${ten}`).toBeTruthy();
	return x;
}

/** Lập phiếu Nháp bằng API với payload y như FE; `soLuong` thành phẩm. */
async function lapNhapApi(page, st, soLuong = 1) {
	const d = sx.duLieu();
	const tp = await traSp(page, st, d.sx.coCongThuc.tenSanPham, true);
	const nl = await traSp(page, st, d.tc.tenSanPham, false);
	const lo = await k.loKhaDung(page, st, d.shopId, nl.productId, nl.variantId);
	const can = d.sx.coCongThuc.dinhMuc * soLuong;
	const lots = [];
	let con = can;
	for (const l of lo) {
		if (con <= 0) break;
		const q = Math.min(con, l.kd);
		if (q > 0) lots.push({ batchCode: l.ma, quantity: q, serials: [] });
		con -= q;
	}
	const kho = (await k.goiApi(page, { h: { ...st.h, shopid: String(d.shopId) } }, `/shops/${d.shopId}/inventory`)).data;
	const inventoryId = (kho.find((x) => x.isDefault) || kho[0]).id;
	const body = {
		inventoryId,
		note: sx.GHI_CHU,
		items: [{
			productId: tp.productId, variantId: tp.variantId, productUnitId: tp.productUnitId, productName: tp.productName, variantName: tp.variantName,
			quantity: soLuong, batchCode: `AUTO09${Date.now().toString().slice(-8)}`, serials: [],
			materials: [{ productId: nl.productId, variantId: nl.variantId, productUnitId: nl.productUnitId, quantity: can, batchCode: lots[0]?.batchCode || null, lots, serials: [] }],
		}],
	};
	const r = await k.goiGhi(page, st, 'POST', '/production', { shopId: d.shopId }, body);
	expect(String(r?.status?.code), `Lập phiếu Nháp (API) lỗi: ${r?.status?.message}`).toBe('200');
	return { phieu: r.data, tp, nl, can, inventoryId };
}

async function tonHai(page, st, ctx) {
	const { shopId } = sx.duLieu();
	return {
		nl: await k.tonVariant(page, st, shopId, ctx.nl.productId, ctx.nl.variantId),
		tp: await k.tonVariant(page, st, shopId, ctx.tp.productId, ctx.tp.variantId),
	};
}

const hopXacNhan = (page) => page.locator('.ant-popover:visible, .ant-popconfirm:visible').filter({ hasText: 'Xác nhận sản xuất?' }).last();

let ctx; // phiếu Nháp dùng chung cho 030_002 → 030_005, 040_006

test.describe('09 · xác nhận phiếu sản xuất (vai tỉnh)', () => {
	test('09_030_002 — Hộp xác nhận sản xuất hỏi đúng nguyên văn', async ({ page }) => {
		chanNeuTat('09_030_002');
		const st = k.batHeader(page);
		await sx.moDanhSachTinh(page);
		ctx = await lapNhapApi(page, st, 1);
		await sx.moDanhSachTinh(page);
		const r = sx.dongPhieu(page, ctx.phieu.code);
		await expect(r, `Danh sách không có phiếu ${ctx.phieu.code}`).toBeVisible({ timeout: 20_000 });
		await r.getByRole('button', { name: /Xác nhận/ }).click();
		const hop = hopXacNhan(page);
		await expect(hop).toBeVisible();
		expect(sx.chuan(await hop.locator('.ant-popconfirm-title, .ant-popover-title').first().innerText())).toBe('Xác nhận sản xuất? Hệ thống sẽ xuất nguyên liệu và nhập thành phẩm.');
		await expect(hop.getByRole('button', { name: 'Xác nhận' })).toBeVisible();
		await expect(hop.getByRole('button', { name: /^Hủy$/ })).toBeVisible();
	});

	test('09_030_003 — Huỷ ở hộp xác nhận thì phiếu giữ nguyên trạng thái Nháp', async ({ page }) => {
		chanNeuTat('09_030_003');
		test.skip(!ctx, 'Không có phiếu Nháp từ 09_030_002.');
		const goi = [];
		page.on('request', (q) => { if (/\/production\/\d+\/confirm/.test(q.url())) goi.push(q.url()); });
		await sx.moDanhSachTinh(page);
		const r = sx.dongPhieu(page, ctx.phieu.code);
		await r.getByRole('button', { name: /Xác nhận/ }).click();
		const hop = hopXacNhan(page);
		await hop.getByRole('button', { name: /^Hủy$/ }).click();
		await expect(hop).toBeHidden();
		await page.waitForTimeout(1_500);
		expect(goi, 'Bấm Hủy mà vẫn gửi request xác nhận').toEqual([]);
		await expect(r).toContainText('Nháp');
		await expect(r.getByRole('button', { name: /Xác nhận/ })).toBeVisible();
	});

	test('09_030_004 — Xác nhận sản xuất trừ nguyên liệu và nhập thành phẩm', async ({ page }) => {
		chanNeuTat('09_030_004');
		test.skip(!ctx, 'Không có phiếu Nháp từ 09_030_002.');
		const st = k.batHeader(page);
		await sx.moDanhSachTinh(page);
		const truoc = await tonHai(page, st, ctx);
		const r = sx.dongPhieu(page, ctx.phieu.code);
		await r.getByRole('button', { name: /Xác nhận/ }).click();
		const cho = page.waitForResponse((x) => /\/production\/\d+\/confirm/.test(x.url()), { timeout: 60_000 });
		const tb = page.locator('.ant-message-notice').first().waitFor({ timeout: 60_000 }).then(() => page.locator('.ant-message-notice').allInnerTexts()).catch(() => []);
		await hopXacNhan(page).getByRole('button', { name: 'Xác nhận' }).click();
		const res = await cho;
		const body = await res.json().catch(() => ({}));
		const thongBao = sx.chuan((await tb).join(' | '));
		ctx.xacNhan = { body, luc: Date.now() };
		expect(String(body?.status?.code), `Xác nhận lỗi: ${body?.status?.message}`).toBe('200');
		expect(thongBao).toContain('Xác nhận sản xuất thành công');
		await expect(r).toContainText('Hoàn thành', { timeout: 20_000 });
		await expect(r.getByRole('button', { name: /Xác nhận/ }), 'Phiếu Hoàn thành vẫn còn nút Xác nhận').toHaveCount(0);
		const sau = await tonHai(page, st, ctx);
		ctx.ton = { truoc, sau };
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ phieu: ctx.phieu.code, truoc, sau, can: ctx.can }) });
		expect(sau.nl, 'Tồn nguyên liệu không giảm đúng lượng tiêu hao').toBeCloseTo(truoc.nl - ctx.can, 4);
		expect(sau.tp, 'Tồn thành phẩm không tăng đúng số lượng sản xuất').toBeCloseTo(truoc.tp + 1, 4);
	});

	test('09_030_005 — Giá vốn thành phẩm bằng tổng chi phí nguyên liệu chia số lượng', async ({ page }) => {
		chanNeuTat('09_030_005');
		test.skip(!ctx?.xacNhan, 'Không có phiếu vừa xác nhận từ 09_030_004.');
		const st = k.batHeader(page);
		await sx.moDanhSachTinh(page);
		const r = sx.dongPhieu(page, ctx.phieu.code);
		await r.getByRole('button', { name: /Xem/ }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu sản xuất' }).last();
		await expect(dr).toContainText('Hoàn thành', { timeout: 20_000 });
		const ct = await sx.chiTiet(page, st, ctx.phieu.id);
		ctx.chiTiet = ct;
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(ct).slice(0, 1500) });
		// Chi tiết trả { order, items, materials } — materials ở cấp gốc, không lồng trong item.
		const it = ct.items?.[0] || {};
		const tongNl = (ct.materials || []).reduce((t, m) => t + Number(m.amount ?? Number(m.unitCost || 0) * Number(m.quantity || 0)), 0);
		expect(tongNl, 'Chi tiết phiếu không có chi phí nguyên liệu').toBeGreaterThan(0);
		expect(Number(it.unitCost), 'Giá vốn thành phẩm ≠ tổng chi phí nguyên liệu / số lượng').toBeCloseTo(tongNl / Number(it.quantity), 2);
		expect(Number(ct.order?.totalCost), 'Tổng giá vốn phiếu ≠ tổng chi phí nguyên liệu').toBeCloseTo(tongNl, 2);
		// Drawer hiển thị cùng con số.
		const oTong = dr.locator('.ant-descriptions-item-content').nth(2);
		expect((await oTong.innerText()).replace(/\D/g, ''), 'Drawer hiện "Tổng giá vốn" khác API').toBe(String(Math.round(tongNl)));
	});

	test('09_040_006 — Sau khi xác nhận sản xuất, số liệu liên quan đổi đúng', async ({ page }) => {
		chanNeuTat('09_040_006');
		test.skip(!ctx?.xacNhan, 'Không có phiếu vừa xác nhận từ 09_030_004.');
		const { shopId } = sx.duLieu();
		const st = k.batHeader(page);
		await sx.moDanhSachTinh(page);
		const it = ctx.chiTiet?.items?.[0] || (await sx.chiTiet(page, st, ctx.phieu.id)).items[0];
		expect(it.stockInOutExportId && it.stockInOutImportId, 'Phiếu sản xuất không trỏ tới phiếu xuất/nhập kho').toBeTruthy();
		const xuat = await k.chiTietPhieu(page, st, shopId, it.stockInOutExportId);
		const nhap = await k.chiTietPhieu(page, st, shopId, it.stockInOutImportId);
		const dx = xuat.items?.[0] || {};
		const dn = nhap.items?.[0] || {};
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ xuat: [xuat.code, xuat.type, xuat.subType, xuat.status, dx.quantity, dx.preQuantity, dx.postQuantity, dx.price], nhap: [nhap.code, nhap.type, nhap.subType, nhap.status, dn.quantity, dn.preQuantity, dn.postQuantity, dn.price, dn.basePrice] }) });
		// Nhãn FE: EXPORT_TYPE.PRODUCTION = "Xuất kho nguyên liệu sản xuất", IMPORT_TYPE.PRODUCTION = "Nhập kho sản phẩm sản xuất".
		expect([xuat.type, xuat.subType]).toEqual(['EXPORT', 'PRODUCTION']);
		expect([nhap.type, nhap.subType]).toEqual(['IMPORT', 'PRODUCTION']);
		expect(dx.productName).toBe(ctx.nl.productName);
		expect(Number(dx.postQuantity), 'Phiếu xuất: tồn sau ≠ tồn trước − lượng tiêu hao').toBeCloseTo(Number(dx.preQuantity) - ctx.can, 4);
		expect(dn.productName).toBe(ctx.tp.productName);
		expect(Number(dn.postQuantity), 'Phiếu nhập: tồn sau ≠ tồn trước + SL sản xuất').toBeCloseTo(Number(dn.preQuantity) + 1, 4);
		if (ctx.ton) {
			expect(Number(dx.preQuantity), 'Tồn trước trên phiếu xuất ≠ tồn đo trước khi xác nhận').toBeCloseTo(ctx.ton.truoc.nl, 4);
		}
		// 🔴 Giá vốn ghi vào phiếu nhập thành phẩm = giá vốn/đơn vị của phiếu sản xuất (từng bị bóc VAT sai).
		expect(Number(dn.price), '🔴 Giá phiếu nhập thành phẩm ≠ giá vốn thành phẩm (nghi bóc VAT)').toBeCloseTo(Number(it.unitCost), 2);
		expect(Number(dn.basePrice), '🔴 basePrice phiếu nhập thành phẩm ≠ giá vốn thành phẩm').toBeCloseTo(Number(it.unitCost), 2);
		expect(Number(nhap.totalAmount), 'Tổng tiền phiếu nhập ≠ tổng giá vốn phiếu sản xuất').toBeCloseTo(Number(ctx.chiTiet?.order?.totalCost ?? it.amount), 2);
	});

	test('09_030_006 — Chặn xác nhận khi nguyên liệu không còn đủ tồn tại thời điểm xác nhận', async ({ page }) => {
		chanNeuTat('09_030_006');
		test.setTimeout(180_000);
		const st = k.batHeader(page);
		await sx.moDanhSachTinh(page);
		// BE KHÔNG kiểm tồn lúc lập Nháp (đo 24/09: HUB tồn 0 vẫn tạo được) ⇒ lập thẳng phiếu cần vượt
		// tồn hiện có 1 định mức. Tương đương "nguyên liệu đã bị rút sau khi lập" ở bước xác nhận, mà
		// 🚫 không phải rút thật ~½ tồn bằng một phiếu khác (không hoàn tác được).
		const d = sx.duLieu();
		const nl = await traSp(page, st, d.tc.tenSanPham, false);
		const ton = await k.tonVariant(page, st, d.shopId, nl.productId, nl.variantId);
		const sl = Math.floor(ton / d.sx.coCongThuc.dinhMuc) + 1;
		const b = await lapNhapApi(page, st, sl);
		await sx.moDanhSachTinh(page);
		const r = sx.dongPhieu(page, b.phieu.code);
		await r.getByRole('button', { name: /Xác nhận/ }).click();
		const cho = page.waitForResponse((x) => /\/production\/\d+\/confirm/.test(x.url()), { timeout: 60_000 });
		await hopXacNhan(page).getByRole('button', { name: 'Xác nhận' }).click();
		const body = await (await cho).json().catch(() => ({}));
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ ton, sl, b: b.phieu.code, kq: body?.status }) });
		expect(String(body?.status?.code), '🔴 Nguyên liệu không đủ mà vẫn xác nhận sản xuất được').not.toBe('200');
		await sx.moDanhSachTinh(page);
		await expect(sx.dongPhieu(page, b.phieu.code), 'Phiếu B không còn ở trạng thái Nháp').toContainText('Nháp');
	});
});
