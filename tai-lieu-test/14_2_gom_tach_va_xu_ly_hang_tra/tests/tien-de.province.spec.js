'use strict';

/**
 * 14_2 — TIỀN ĐỀ (không phải case): đưa hàng CÓ NGUỒN NCC về kho điểm bán seed để tách phiếu truy được NCC.
 *
 * 🔴 Hàng tồn đầu kỳ KHÔNG truy được NCC ⇒ tách phiếu tự doanh báo "Không xác định được nhà cung cấp ban đầu".
 *    Nên: tỉnh lập PO NCC tỉnh cho SP tự doanh `TD1` (+ PO NCC seed cho SP TCT `TC`) đặt thẳng về kho điểm bán,
 *    NCC xác nhận, nhập kho. Chạy: `-g "tien de 14_2"`. Kết quả ghi `seed-state.lane<N>.json` → `duLieu.traNcc14_2`.
 */

const { test, expect } = require('@playwright/test');
const seed = require('../../00_seed/seed-state');
const po = require('../../13_3_dat_hang_va_nhap_hang/tests/po-ghi');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const { moTrang } = require('../../shared/auth/login');

const d = () => seed.doc().duLieu;

async function poVeShop(page, { ncc, hd, sp, sl }) {
	await moTrang(page, `${po.BASE()}/inventory/purchase-order/create`, 'province');
	await expect(po.fi(page, 'Kho đặt hàng')).toBeVisible({ timeout: 30_000 });
	const kho = await po.chonKho(page, 'Kho đặt hàng');
	await expect(po.fi(page, 'Kho nhận hàng')).toContainText(kho);
	await po.chonNcc(page, ncc, hd);
	await po.chonNgay(page);
	await po.fi(page, 'Ghi chú').locator('textarea').fill('AUTO TEST 14_2 tiền đề');
	await po.themSp(page, sp, sl);
	const kq = await po.luu(page, 'Gửi nhà cung cấp');
	expect(String(kq.body?.status?.code), `Gửi PO lỗi: ${kq.body?.status?.message} · ${kq.tb}`).toBe('200');
	await po.moChiTiet(page, kq.ma, 'province');
	const xn = await po.nccXacNhan(page);
	test.info().annotations.push({ type: 'đo', description: `${kq.ma} NCC xác nhận: ${xn.tb}` });
	await page.waitForTimeout(3_000);
	await po.moChiTiet(page, kq.ma, 'province');
	const nk = await po.nhapKho(page);
	test.info().annotations.push({ type: 'đo', description: `${kq.ma} nhập kho: ${nk.tb} · ${JSON.stringify(nk.body?.status)}` });
	expect(await po.trangThai(page, kq.ma, 'province')).toMatch(/Hoàn thành|Đã nhập|Đã giao/);
	return kq.ma;
}

/** Bộ chọn kho 3 cột của form chuyển kho — HUB nằm thẳng dưới tỉnh (không có xã). */
async function chonKhoCay(page, dr, o, { tinh, xa, shop }) {
	await dr.locator('.ant-select').filter({ hasText: o }).click();
	const p = page.locator('.ant-drawer-open').filter({ hasText: 'Chọn Điểm bán / Kho' }).last();
	await expect(p).toBeVisible();
	await p.getByPlaceholder('Tìm kiếm').nth(0).fill(tinh);
	// 🔴 Vai tỉnh: hộp mở đã chọn sẵn tỉnh — bấm lại là BỎ chọn. Chỉ bấm khi cột xã còn đòi chọn tỉnh.
	await page.waitForTimeout(1_500);
	if (await p.getByText('Vui lòng chọn Tỉnh/Tổng công ty trước').count()) await p.getByText(tinh, { exact: true }).first().click();
	if (xa) await p.getByText(xa, { exact: true }).first().click();
	const muc = p.getByText(shop, { exact: true }).last();
	for (const loai of ['Pos mini', 'Pos plus', 'Kho']) {
		await p.getByRole('radio', { name: loai }).check().catch(() => {});
		if (await muc.waitFor({ timeout: 4_000 }).then(() => true, () => false)) break;
	}
	await muc.click();
	await p.getByRole('button', { name: 'Xác nhận' }).click();
	await expect(p).toBeHidden();
	await expect(dr).toContainText(shop);
}

/**
 * Tỉnh chuyển `sl` SP `productId` từ HUB → điểm bán seed (xuất ngay) bằng API — 🔴 bộ chọn kho của form chuyển
 * KHÔNG liệt kê HUB cho vai tỉnh (đo 24/09/2026). Payload theo `DrawerAddTransfer.jsx`. Điểm bán nhận bằng API.
 */
async function chuyenVeShop(page, browser, productId, sl, { vai = 'province', hub = d().hubTinh } = {}) {
	const shopId = d().diemBan.shopId;
	const st = k.batHeader(page);
	await moTrang(page, `${po.BASE()}/inventory/transfer-warehouse`, vai);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const ps = await k.moPhienPhu(browser, 'shop', '/inventory/transfer-warehouse');
	try {
		// 🔴 Phiếu chuyển khác pod: id ở pod gửi ≠ id ở pod nhận ⇒ tìm theo danh sách của điểm bán. Lượt trước
		//    tạo rồi hỏng ở bước nhận thì phiếu còn đi đường — nhận tiếp, 🚫 không tạo phiếu mới.
		const choNhan = async () => {
			const ds = (await k.goiGhi(ps.page, ps.st, 'GET', '/stock/v2/transfer/v2', { shopIds: shopId, beginTime: Date.now() - 3 * 86400_000, endTime: Date.now() + 86400_000, sort: 'createdTime,DESC', page: 0, size: 50 })).data || [];
			return ds.find((x) => x.toShopId === shopId && x.fromShopId === hub.shopId && /IN_TRANSIT|PENDING/.test(x.status) && (x.note || '').includes('AUTO TEST 14_2 tiền đề'));
		};
		let phieu = await choNhan();
		if (phieu && process.env.VNPOST_TIEN_DE_HUY_TREO) {
			// Phiếu treo nhận không được (lô trùng mã) ⇒ bên gửi từ chối + nhập lại kho nguồn rồi tạo phiếu mới.
			const ds = (await k.goiGhi(page, st, 'GET', '/stock/v2/transfer/v2', { shopIds: hub.shopId, beginTime: Date.now() - 3 * 86400_000, endTime: Date.now() + 86400_000, page: 0, size: 50 })).data || [];
			const goc = ds.find((x) => x.code === phieu.code);
			if (goc) await k.donPhieuChuyen(page, st, hub.shopId, goc.stockTransferId);
			phieu = null;
		}
		if (!phieu) {
			const lo = ((await k.goiApi(page, st, '/stock/v2/batch-product', { shopId: hub.shopId, productId, size: 500 })).data || [])
				.filter((l) => Number(l.remainQuantity) - Number(l.reservedQuantity || 0) >= sl);
			expect(lo.length, `Kho nguồn chưa có lô SP ${productId} đủ ${sl}`).toBeGreaterThan(0);
			// Lô MỚI nhất (PO vừa nhập) — lô cũ có thể trùng mã với lô đã chuyển xuống điểm bán lượt trước.
			const l = lo.sort((a, b) => Number(b.batchProductId) - Number(a.batchProductId))[0];
			const dsKho = (await k.goiGhi(ps.page, ps.st, 'GET', `/shops/${shopId}/inventory`)).data;
			const mangKho = Array.isArray(dsKho) ? dsKho : dsKho?.content || [];
			const khoShop = (mangKho.find((x) => x.isDefault || x.defaultInventory || x.isDefaultInventory) || mangKho.find((x) => x.id !== d().khoPhu?.id))?.id;
			expect(khoShop, 'Không xác định được kho mặc định của điểm bán').toBeTruthy();
			const tao = await k.goiGhi(page, st, 'POST', '/stock/v2/transfer/v2', { shopId: hub.shopId }, {
				fromInventoryId: hub.inventoryId, fromShopId: hub.shopId, imageIds: [], code: `AUTO142${Date.now().toString().slice(-7)}`,
				toInventoryId: khoShop, toShopId: shopId, note: 'AUTO TEST 14_2 tiền đề', reason: '', discountAmount: 0, actionTime: null,
				exportImmediately: true,
				items: [{ fromProductId: productId, fromVariantId: l.variantId, fromProductUnitId: l.productUnitId ?? null, quantity: sl, price: Number(l.price) || 0, serials: [],
					batchProducts: [{ batchCode: l.batchCode, quantity: sl, batchProductId: l.batchProductId }] }],
			});
			expect(String(tao?.status?.code), `Tạo phiếu chuyển lỗi: ${tao?.status?.message}`).toBe('200');
			await expect.poll(async () => Boolean((phieu = await choNhan())), { timeout: 60_000 }).toBe(true);
		}
		const id = phieu.stockTransferId;
		const ct = (await k.goiGhi(ps.page, ps.st, 'GET', `/stock/v2/transfer/v2/${id}`, { shopId })).data;
		test.info().annotations.push({ type: 'đo', description: `phiếu chuyển ${ct?.code} ${ct?.status} ${JSON.stringify(ct?.items?.[0] || {}).slice(0, 700)}` });
		const items = (ct.items || []).map((i) => ({
			stockTransferItemId: i.stockTransferItemId, quantity: i.quantity, price: i.editPrice,
			batchProducts: (i.batchProducts || []).map((b) => ({ batchCode: b.batchCode, quantity: b.quantity })),
		}));
		const nhan = (them = {}) => k.goiGhi(ps.page, ps.st, 'PUT', `/stock/v2/transfer/v2/${id}/confirm`, { shopId }, { code: ct.code, actionTime: Date.now(), imageIds: null, note: 'AUTO TEST 14_2', items, ...them });
		// 🔴 Lô cùng mã đã có ở điểm bán (lượt trước) ⇒ BE báo trùng lô (có lúc ra SSHOP-500) — gộp vào lô hiện có như FE đề nghị.
		let x = await nhan();
		if (String(x?.status?.code) !== '200') x = await nhan({ isMerge: true });
		expect(String(x?.status?.code), `Điểm bán nhận hàng lỗi: ${x?.status?.message}`).toBe('200');
		return ct.code;
	} finally {
		await ps.dong();
	}
}

/** Kho TCT đã nhận PO (shopId + inventoryId) — đọc từ chi tiết PO bằng phiên tct. */
async function khoCuaPo(page, st, ma) {
	const ds = (await k.goiGhi(page, st, 'GET', '/purchase-orders', { keyword: ma, page: 0, size: 5 })).data;
	const p = (Array.isArray(ds) ? ds : ds?.content || []).find((x) => x.code === ma);
	test.info().annotations.push({ type: 'đo', description: `PO ${ma}: ${JSON.stringify(p).slice(0, 600)}` });
	return { shopId: p.shopId, inventoryId: p.inventoryId };
}

test('tien de 14_2 — hàng tự doanh TD1 + hàng TCT (có nguồn NCC) về kho điểm bán', async ({ page, browser }) => {
	test.setTimeout(900_000);
	const td = d().tuDoanhTinh;
	const kq = { ...(d().traNcc14_2 || {}) };
	// Lượt bổ sung hàng: VNPOST_TIEN_DE_LUOT=2,3… ⇒ PO + chuyển mới với khoá mang hậu tố lượt (lượt 1 giữ khoá cũ).
	const L = process.env.VNPOST_TIEN_DE_LUOT ? `_${process.env.VNPOST_TIEN_DE_LUOT}` : '';
	const SL = Number(process.env.VNPOST_TIEN_DE_SL || 60);
	if (!kq[`poTd1${L}`]) { kq[`poTd1${L}`] = await poVeShop(page, { ncc: td.tenNcc, hd: td.soHopDong, sp: td.sanPham.TD1.ten, sl: SL }); seed.ghi('traNcc14_2', kq); }
	if (!kq[`chuyen${L}`]) { kq[`chuyen${L}`] = await chuyenVeShop(page, browser, td.sanPham.TD1.productId, SL); seed.ghi('traNcc14_2', kq); }
	// Kho phụ (không mặc định) cho HUB tỉnh — 030_003 cần đơn vị nhận có ≥ 2 kho. Payload theo `ShopInventoryPage.jsx`.
	if (!kq.khoPhuHub) {
		const hub = d().hubTinh;
		const st = k.batHeader(page);
		await moTrang(page, `${po.BASE()}/inventory/transfer-warehouse`, 'province');
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
		const ten = `${seed.PREFIX}HUB_KHO2`;
		let ds = (await k.goiGhi(page, st, 'GET', `/shops/${hub.shopId}/inventory`)).data || [];
		if (!ds.find((x) => x.name === ten)) {
			const x = await k.goiGhi(page, st, 'POST', `/shops/${hub.shopId}/inventory`, {}, { name: ten, phone: '', address: '', provinceId: null, provinceName: '', wardId: null, wardName: '', isDefault: false });
			expect(String(x?.status?.code), `Tạo kho phụ HUB lỗi: ${x?.status?.message}`).toBe('200');
			ds = (await k.goiGhi(page, st, 'GET', `/shops/${hub.shopId}/inventory`)).data || [];
		}
		kq.khoPhuHub = ds.find((x) => x.name === ten)?.id;
		seed.ghi('traNcc14_2', kq);
	}
	// Hàng TCT: TCT đặt PO về KHO TCT (13_3 po-ghi) → nhập kho → chuyển xuống điểm bán.
	const t = await k.moPhienPhu(browser, 'tct', '/inventory/purchase-order');
	try {
		if (!kq[`poTc${L}`]) {
			const x = await po.taoPO(t.page, 'Gửi nhà cung cấp', { sl: SL, ghiChu: 'AUTO TEST 14_2 tiền đề' });
			kq[`poTc${L}`] = x.ma; seed.ghi('traNcc14_2', kq);
			await po.moChiTiet(t.page, x.ma, 'tct');
			await po.nccXacNhan(t.page);
			await t.page.waitForTimeout(3_000);
			await po.moChiTiet(t.page, x.ma, 'tct');
			const nk = await po.nhapKho(t.page);
			test.info().annotations.push({ type: 'đo', description: `${x.ma} nhập kho TCT: ${nk.tb}` });
			expect(await po.trangThai(t.page, x.ma, 'tct')).toMatch(/Hoàn thành|Đã nhập|Đã giao/);
		}
		if (!kq[`chuyenTc${L}`]) {
			const st = k.batHeader(t.page);
			await moTrang(t.page, `${po.BASE()}/inventory/transfer-warehouse`, 'tct');
			await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
			const kho = await khoCuaPo(t.page, st, kq[`poTc${L}`]);
			const tc = d().sanPham.sanPhamTheoGiaVon.tieuChuan;
			const pid = kq.tcProductId || (await k.goiApi(t.page, st, '/stock/v2/batch-product', { shopId: kho.shopId, size: 500 })).data?.find((l) => l.productName === tc.tenSanPham)?.productId;
			kq.khoTct = kho; kq.tcProductId = pid;
			kq[`chuyenTc${L}`] = await chuyenVeShop(t.page, browser, pid, SL, { vai: 'tct', hub: kho });
			seed.ghi('traNcc14_2', kq);
		}
	} finally {
		await t.dong();
	}
	test.info().annotations.push({ type: 'kq', description: JSON.stringify(kq) });
});
