'use strict';

/**
 * 04_3 · 020_007 / 050_002 — Nhập kho từ phiếu (đơn) đặt hàng NCC, GHI (26/09/2026). Vai `tct`.
 *
 * 🔴 Kịch bản ghi vai `shop`, nhưng ở hệ thống thật điểm bán KHÔNG có đơn đặt hàng NCC: form nhập cấp điểm bán không có ô "Nhập từ"
 * (NCC bị lọc — đo ở 04_3_020_001), điểm bán chỉ lập "Phiếu đề xuất đặt hàng". PO NCC nằm ở TCT (kho TCT) / tỉnh (giao thẳng HUB).
 * ⇒ chạy đúng luồng ở vai có chức năng (`tct`, như 16 dùng `_vai`), khuôn 13_3 `po-ghi` (taoPO → nccXacNhan → nhapKho). Lệch vai ghi báo cáo.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const po = require('../../13_3_dat_hang_va_nhap_hang/tests/po-ghi');
const k = require('./ghi-kho');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 900) });
/** 🔴 `po.nhapKho` trả về ngay sau `import-export`; `POST /purchase-orders/{id}/receive` đến SAU — rời trang sớm là huỷ request (PO không cập nhật). */
const nhapVaCho = async (page, opt) => {
	const rc = page.waitForResponse((r) => /purchase-orders\/\d+\/receive/.test(r.url()), { timeout: 90_000 }).then(async (r) => ({ http: r.status(), b: await r.json().catch(() => null) })).catch(() => null);
	const nk = await po.nhapKho(page, opt);
	return { ...nk, rc: await rc };
};
const dongSp = async (page) => po.chuan(await page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: po.SP().tenSanPham }).first().innerText());

test.describe('04_3 — Nhập kho từ đơn đặt hàng NCC (GHI, vai tct)', () => {
	test.describe.configure({ timeout: 360_000 });

	test('04_3_020_007 — Nhập kho từ mã phiếu đặt hàng', async ({ page }) => {
		chanNeuTat('04_3_020_007');
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp', { sl: 3 });
		await po.moChiTiet(page, kq.ma);
		expect((await po.nccXacNhan(page)).tb).toContain('Đã xác nhận');
		await page.reload();
		await page.getByText('Danh sách sản phẩm').first().waitFor();
		// Mở form nhập từ PO: đọc dòng kéo về trước khi sửa (SP / SL / giá).
		await po.po_nutNhapKho(page).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Phiếu nhập kho' }).last();
		await expect(dr.locator('tr[data-row-key]').first()).toBeVisible({ timeout: 20_000 });
		const keo = po.chuan(await dr.locator('tr[data-row-key]').first().innerText());
		const slKeo = await dr.locator('tr[data-row-key]').first().locator('.ant-input-number-input').first().inputValue();
		await page.keyboard.press('Escape');
		await page.waitForTimeout(1_000);
		// Nhận thực tế 2/3 ("Để sau" phần thiếu) rồi đọc lại PO.
		const nk = await nhapVaCho(page, { sl: 2, thieu: 'desau' });
		await po.moChiTiet(page, kq.ma);
		const r = await dongSp(page);
		ghiDo(`${kq.ma} · dòng kéo về: "${keo}" (SL ô nhập ${slKeo}) · nhập 2: ${nk.tb} · receive ${JSON.stringify(nk.rc?.b?.status ?? nk.rc)} · giá trị ${nk.body?.data?.totalAmount} · dòng PO sau: "${r}" · trạng thái ${await po.trangThai(page, kq.ma)}`);
		expect(keo, 'Dòng kéo về không có SP của PO').toContain(po.SP().tenSanPham);
		expect(Number(slKeo), 'SL kéo về ≠ SL NCC xác nhận (3)').toBe(3);
		expect(String(nk.rc?.b?.status?.code), 'PO receive lỗi').toBe('200');
		expect(Number(nk.body?.data?.totalAmount), 'Giá trị nhập 2 cái ≠ 2 × 60.000 (giá kéo từ PO)').toBe(120000);
		expect(r, 'PO không cập nhật "Đã nhập kho" = 2').toMatch(/Cái 3 3 2\b/);
	});

	test('04_3_050_002 — Nhập kho từ đơn đặt hàng nhà cung cấp', async ({ page }) => {
		chanNeuTat('04_3_050_002');
		const st = k.batHeader(page);
		const supplierId = seed.doc().duLieu.sanPhamNcc.supplierId;
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp', { sl: 3 });
		await po.moChiTiet(page, kq.ma);
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
		const lichSu = async () => { const b = await k.goiGhi(page, st, 'GET', '/shops/supplier-debt/history', { supplierId, historyGroup: 'DEBT', page: 0, size: 1000 }); return Array.isArray(b?.data) ? b.data : b?.data?.content || []; };
		const truoc = await lichSu();
		expect((await po.nccXacNhan(page)).tb).toContain('Đã xác nhận');
		await page.reload();
		await page.getByText('Danh sách sản phẩm').first().waitFor();
		const nk = await nhapVaCho(page);
		const maNk = nk.body?.data?.code || nk.body?.data?.orderCode;
		const idNk = nk.body?.data?.stockInOutId;
		await po.moChiTiet(page, kq.ma);
		ghiDo(`${kq.ma} · receive ${JSON.stringify(nk.rc?.b?.status ?? nk.rc)} · NK ${maNk}/${idNk} ${nk.body?.data?.totalAmount} · dòng PO "${await dongSp(page)}" · trạng thái ${await po.trangThai(page, kq.ma)} (công nợ NCC của phiếu từ PO: thiết kế 16/07 chỉ ghi sau đối soát HĐ + hạch toán PO — xem báo cáo)`);
		expect(String(nk.rc?.b?.status?.code), 'PO receive lỗi').toBe('200');
		expect(await dongSp(page), 'Đơn không cập nhật số đã nhận = 3').toMatch(/Cái 3 3 3\b/);
		// 🔴 Đo theo DÒNG của chính phiếu nhập (🚫 đếm độ dài — lịch sử phân trang, đủ trang thì độ dài đứng yên).
		const cu = new Set(truoc.map((x) => JSON.stringify(x)));
		const cuaPhieu = (ds) => ds.filter((x) => !cu.has(JSON.stringify(x))).find((x) => JSON.stringify(x).includes(String(idNk)) || (maNk && JSON.stringify(x).includes(maNk)));
		let khop = null;
		await expect.poll(async () => { khop = cuaPhieu(await lichSu()); return Boolean(khop); }, { message: `Công nợ NCC không ghi nhận phiếu nhập ${maNk}`, timeout: 90_000 }).toBe(true);
		const moi = [khop];
		await po.moChiTiet(page, kq.ma);
		const r = await dongSp(page);
		ghiDo(`${kq.ma} · receive ${JSON.stringify(nk.rc?.b?.status ?? nk.rc)} · NK ${maNk}/${idNk} ${nk.body?.data?.totalAmount} · dòng PO "${r}" · trạng thái ${await po.trangThai(page, kq.ma)} · công nợ mới ${JSON.stringify(moi).slice(0, 400)}`);
		expect(String(nk.rc?.b?.status?.code), 'PO receive lỗi').toBe('200');
		expect(r, 'Đơn không cập nhật số đã nhận = 3').toMatch(/Cái 3 3 3\b/);
		expect(JSON.stringify(khop), 'Công nợ NCC tăng ≠ tổng tiền nhập 180.000').toMatch(/\b180000(\.0+)?\b/);
	});
});
