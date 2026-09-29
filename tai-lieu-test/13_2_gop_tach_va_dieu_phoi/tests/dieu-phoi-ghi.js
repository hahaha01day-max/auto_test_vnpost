'use strict';

/**
 * Helper 13_2 — ĐIỀU PHỐI HÀNG theo phiếu đề xuất: tỉnh tạo phiếu chuyển kho TỪ phiếu đề xuất về điểm bán,
 * điểm bán xác nhận nhận hàng. Dùng chung cho case `13_2_040_*` và tiền đề nạp tồn `00_seed/tests/17-…`.
 *
 * Nguồn (vnpost-web): `features/purchaseOrder/pages/StockRequestDetailPage.jsx` (nút "Kiểm tra tồn kho",
 * `canCreateTransfer`: vai TINH/TCT, phiếu APPROVED | TCT_TRANSFERRED, chưa có `stockInOutId`/`purchaseOrderId`),
 * `DrawerCheckInventory.jsx` (thẻ "Kho đủ số lượng hàng" + nút "Tạo phiếu chuyển kho" theo từng kho),
 * `DrawerCreateTransfer.jsx` (điền sẵn SP của phiếu, "Xuất kho ngay" mặc định bật, nút "Xác nhận tạo",
 * `actionTransferProductFromStockV2`).
 * 🔴 Nút "Tạo phiếu chuyển kho" ở đầu trang đang `hideIf` (TẠM ẨN) ⇒ chỉ đi được qua drawer "Kiểm tra tồn kho".
 */

const { expect } = require('@playwright/test');
const seed = require('../../00_seed/seed-state');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');

const d = () => seed.doc().duLieu;

/** Chi tiết phiếu đề xuất (API) bằng phiên `ps` — trả `data`. */
async function chiTietPhieu(ps, ma) {
	const ds = await k.goiGhi(ps.page, ps.st, 'GET', '/stock-requests', { keyword: ma, page: 0, size: 5 });
	const p = (ds?.data || []).find((x) => x.code === ma);
	if (!p) return null;
	return (await k.goiGhi(ps.page, ps.st, 'GET', `/stock-requests/${p.id}`)).data || p;
}

/**
 * Ở phiên tỉnh `page`: mở phiếu đề xuất gốc `ma` → "Kiểm tra tồn kho" → kho `tenKho` (mặc định HUB tỉnh)
 * → "Tạo phiếu chuyển kho" → "Xác nhận tạo". Trả { tb, body, res, trangThaiTruoc, xuatNgay, lyDo }.
 */
async function taoChuyenTuDeXuat(page, ma, { tenKho = d().hubTinh?.tenShop, ghiChu = 'AUTO TEST 13_2 điều phối' } = {}) {
	await dx.moChiTiet(page, ma, 'province');
	await page.getByRole('button', { name: /Kiểm tra tồn kho/ }).first().click();
	const kt = page.locator('.ant-drawer-open').filter({ hasText: /Kho đủ số lượng hàng|tồn kho/ }).last();
	await expect(kt, 'Không mở được drawer Kiểm tra tồn kho').toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(3_000);
	const lyDo = dx.chuan(await kt.locator('.ant-alert').allInnerTexts().then((x) => x.join(' | ')).catch(() => ''));
	const oKho = kt.locator('div.flex.items-center.gap-2').filter({ hasText: tenKho }).first();
	await expect(oKho, `Kho "${tenKho}" không nằm trong "Kho đủ số lượng hàng" (${lyDo})`).toBeVisible({ timeout: 30_000 });
	const nut = oKho.getByRole('button', { name: /Tạo phiếu chuyển kho/ });
	await expect(nut, `Nút "Tạo phiếu chuyển kho" bị khoá: ${lyDo}`).toBeEnabled();
	// 🔴 Bảng hiện SP của phiếu NGAY (seedItems) nhưng đơn vị tính chỉ gắn sau khi enrich
	//    (`/chain/products/bulk-fields` + tồn theo biến thể). Bấm "Xác nhận tạo" sớm ⇒ FE báo
	//    "Thiếu đơn vị tính cho sản phẩm …" (đo 28/09 làn 7) ⇒ chờ enrich xong.
	const enrich = page.waitForResponse((r) => /bulk-fields/.test(r.url()), { timeout: 60_000 }).catch(() => null);
	await nut.click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Xác nhận tạo' }).last();
	await expect(dr, 'Không mở được drawer Tạo phiếu chuyển kho').toBeVisible({ timeout: 30_000 });
	await expect(dr.locator('.ant-table-tbody tr.ant-table-row').first(), 'Drawer chuyển kho không điền sẵn SP của phiếu').toBeVisible({ timeout: 30_000 });
	await enrich;
	await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
	await page.waitForTimeout(2_000);
	const xuat = dr.locator('.ant-checkbox-wrapper, .ant-switch').filter({ hasText: /Xuất kho ngay/ }).first();
	const xuatNgay = (await xuat.count()) ? await xuat.locator('input').first().isChecked().catch(() => null) : null;
	// Nội dung drawer lúc mở (case 13_2_040_001 kiểm): các dòng SP, kho chuyển, kho nhận.
	const dongSp = (await dr.locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map(dx.chuan);
	const soLuong = await dr.locator('.ant-table-tbody tr.ant-table-row .ant-input-number-input').evaluateAll((xs) => xs.map((x) => x.value));
	// Khối "Kho nhận" là Input disabled (đọc value); "Kho chuyển" là SelectShopMultiple (đọc chữ, bỏ nhãn).
	const khoiNhan = dr.locator('div.flex-1').filter({ has: page.locator('div.text-sm', { hasText: /^Kho nhận$/ }) }).first();
	const khoNhan = dx.chuan(await khoiNhan.locator('input').first().inputValue().catch(() => ''));
	const khoiChuyen = dr.locator('div.flex-1').filter({ has: page.locator('div.text-sm', { hasText: 'Kho chuyển' }) }).first();
	const khoChuyen = dx.chuan((await khoiChuyen.innerText().catch(() => '')).replace(/^\*?\s*Kho chuyển/, ''));
	const note = dr.getByPlaceholder('Nhập ghi chú (không bắt buộc)');
	if (await note.count()) await note.fill(ghiChu);
	const cho = page.waitForResponse((r) => /\/stock\/v2\/transfer/.test(r.url()) && r.request().method() === 'POST', { timeout: 60_000 }).catch(() => null);
	const tb = await dx.thongBaoQuanh(page, () => dr.getByRole('button', { name: 'Xác nhận tạo' }).click(), 60_000);
	const res = await cho;
	return { tb, lyDo, xuatNgay, dongSp, soLuong, khoNhan, khoChuyen, body: res ? JSON.parse(res.request().postData() || '{}') : null, res: res ? await res.json().catch(() => null) : null };
}

/**
 * Điểm bán (CHT) xác nhận nhận phiếu chuyển có mã `ma` (API như FE `/stock/v2/transfer/v2/{id}/confirm`).
 * 🔴 Phiếu chuyển khác pod: id ở pod gửi ≠ id ở pod nhận ⇒ tìm theo danh sách của điểm bán.
 */
async function nhanTaiDiemBan(browser, ma) {
	const shopId = d().diemBan.shopId;
	const ps = await k.moPhienPhu(browser, 'shop', '/inventory/transfer-warehouse');
	try {
		let phieu;
		await expect.poll(async () => {
			const ds = (await k.goiGhi(ps.page, ps.st, 'GET', '/stock/v2/transfer/v2', { shopIds: shopId, beginTime: Date.now() - 3 * 86400_000, endTime: Date.now() + 86400_000, sort: 'createdTime,DESC', page: 0, size: 50 })).data || [];
			phieu = ds.find((x) => x.code === ma);
			return phieu?.status ?? null;
		}, { timeout: 90_000, intervals: [5_000] }).toMatch(/IN_TRANSIT|PENDING/);
		const id = phieu.stockTransferId;
		const ct = (await k.goiGhi(ps.page, ps.st, 'GET', `/stock/v2/transfer/v2/${id}`, { shopId })).data;
		const items = (ct.items || []).map((i) => ({
			stockTransferItemId: i.stockTransferItemId, quantity: i.quantity, price: i.editPrice,
			batchProducts: (i.batchProducts || []).map((b) => ({ batchCode: b.batchCode, quantity: b.quantity })),
		}));
		const nhan = (them = {}) => k.goiGhi(ps.page, ps.st, 'PUT', `/stock/v2/transfer/v2/${id}/confirm`, { shopId }, { code: ct.code, actionTime: Date.now(), imageIds: null, note: 'AUTO TEST 13_2 điều phối', items, ...them });
		// 🔴 Lô cùng mã đã có ở điểm bán ⇒ BE báo trùng lô — gộp vào lô hiện có như FE đề nghị.
		let x = await nhan();
		if (String(x?.status?.code) !== '200') x = await nhan({ isMerge: true });
		return { res: x, ct };
	} finally {
		await ps.dong();
	}
}

/**
 * Dựng phiếu đề xuất CÓ HÀNG TẠI HUB tỉnh (tiền đề của bước điều phối), đi đúng quy trình:
 *   CHT lập (nhiều SP) → xã duyệt → tỉnh "Gửi lên TCT" → TCT duyệt + PO NCC giao thẳng về HUB → NCC xác nhận
 *   → tỉnh xác nhận đơn giao thẳng. Phiếu gốc về `TCT_TRANSFERRED`.
 * `kq` = tiến độ (đọc/ghi qua `luu`) ⇒ lượt hỏng giữa chừng đi tiếp đúng bước, 🚫 không lập phiếu mới.
 * 🔴 Cần: HUB tỉnh (`hubTinh`, case 04_5_020_016) + bảng giá mua phạm vi TCT/tỉnh (seed 13).
 */
async function dungPhieuCoHangTaiHub(browser, { sps, sl, ghiChu = 'AUTO TEST 13_2 điều phối', kq = {}, luu = (x) => Object.assign(kq, x), den = 'hubNhan' }) {
	// `den`: dừng sau bước — 'maGoc' (CHT gửi duyệt) · 'xaDuyet' · 'maTct' · 'nccXacNhan' · 'hubNhan' (mặc định: trọn chuỗi).
	const xong = (b) => b === den;
	const t = require('../../13_3_dat_hang_va_nhap_hang/tests/tct-ghi');
	const po = require('../../13_3_dat_hang_va_nhap_hang/tests/po-ghi');
	const gt = require('../../13_3_dat_hang_va_nhap_hang/tests/giao-thang-ghi');
	expect(d().hubTinh?.shopId, 'Tỉnh làn chưa có HUB (sổ seed hubTinh) — chạy case 04_5_020_016 trước').toBeTruthy();
	if (!kq.maGoc) {
		const s = await k.moPhienPhu(browser, 'shop', '/inventory/purchase-request');
		try {
			await dx.moTao(s.page);
			const ma = await s.page.locator('#code').inputValue();
			await s.page.locator('#note').fill(ghiChu);
			for (const ten of sps) await dx.themSp(s.page, ten, sl);
			const l = await dx.bam(s.page, 'Gửi phê duyệt');
			expect(l.tb, 'CHT gửi phê duyệt không thành công').toContain('Gửi phê duyệt thành công');
			luu({ maGoc: ma, sps, sl, luc: Date.now() });
		} finally { await s.dong(); }
	}
	if (xong('maGoc')) return kq;
	if (!kq.xaDuyet) {
		const w = await k.moPhienPhu(browser, 'ward', '/inventory/purchase-request');
		try {
			await dx.moChiTiet(w.page, kq.maGoc, 'ward');
			await w.page.getByRole('button', { name: /^Xác nhận$/ }).click();
			const dr = w.page.locator('.ant-drawer-open').filter({ hasText: 'Duyệt phiếu đề xuất' }).last();
			expect(await dx.thongBaoQuanh(w.page, () => dr.locator('.ant-drawer-footer .ant-btn-primary').last().click()), 'Xã duyệt không thành công').toContain('Đã duyệt phiếu');
			luu({ xaDuyet: true });
		} finally { await w.dong(); }
	}
	if (xong('xaDuyet')) return kq;
	const tinh = await k.moPhienPhu(browser, 'province', '/inventory/purchase-request');
	try {
		if (!kq.maTct) {
			const g = await t.guiLenTct(tinh.page, kq.maGoc);
			expect(g.res?.status?.code == 200, `Tỉnh gửi lên TCT lỗi: ${g.tb}`).toBe(true);
			luu({ maTct: g.maTct });
		}
		if (xong('maTct')) return kq;
		if (!kq.maPO || !kq.nccXacNhan) {
			const tct = await k.moPhienPhu(browser, 'tct', '/inventory/purchase-request');
			try {
				if (!kq.maPO) {
					// Lượt trước có thể đã duyệt phiếu TCT rồi hỏng ở form PO ⇒ chỉ duyệt khi còn nút "Xác nhận".
					await dx.moChiTiet(tct.page, kq.maTct, 'tct');
					const conDuyet = await tct.page.getByRole('button', { name: /^Xác nhận$/ }).isVisible().catch(() => false);
					const p = await gt.taoPOTuPhieu(tct.page, kq.maTct, { duyet: conDuyet });
					luu({ maPO: p.maPO, idPO: p.idPO });
				}
				await po.moChiTiet(tct.page, kq.maPO);
				expect((await po.nccXacNhan(tct.page)).tb, 'NCC xác nhận không thành công').toContain('Đã xác nhận');
				luu({ nccXacNhan: true });
			} finally { await tct.dong(); }
		}
		if (xong('nccXacNhan')) return kq;
		if (!kq.hubNhan) {
			await gt.moChiTietGiaoThang(tinh.page, kq.maPO);
			const x = await gt.xacNhanGiaoThang(tinh.page);
			expect(String(x.res?.status?.code), `Tỉnh xác nhận giao thẳng lỗi: ${x.tb}`).toBe('200');
			luu({ hubNhan: true });
		}
	} finally { await tinh.dong(); }
	return kq;
}

/** Ở phiên tỉnh: mở lại "Kiểm tra tồn kho" của phiếu `ma`; trả { lyDo, nutBat } (nút "Tạo phiếu chuyển kho" có bấm được không). */
async function moLaiKiemTraTon(page, ma) {
	await dx.moChiTiet(page, ma, 'province');
	const nutKt = page.getByRole('button', { name: /Kiểm tra tồn kho/ }).first();
	if (!(await nutKt.isVisible().catch(() => false))) return { coNutKiemTra: false };
	await nutKt.click();
	const kt = page.locator('.ant-drawer-open').filter({ hasText: /Kho đủ số lượng hàng|tồn kho/ }).last();
	await expect(kt).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(3_000);
	const lyDo = dx.chuan(await kt.locator('.ant-alert').allInnerTexts().then((x) => x.join(' | ')).catch(() => ''));
	const nut = kt.getByRole('button', { name: /Tạo phiếu chuyển kho/ });
	const n = await nut.count();
	const nutBat = n ? await nut.first().isEnabled() : false;
	return { coNutKiemTra: true, lyDo, soNut: n, nutBat };
}

module.exports = { chiTietPhieu, taoChuyenTuDeXuat, nhanTaiDiemBan, dungPhieuCoHangTaiHub, moLaiKiemTraTon };
