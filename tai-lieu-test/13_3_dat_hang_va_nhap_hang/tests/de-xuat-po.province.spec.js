'use strict';

/**
 * 13_3 · 010 — TCT tạo phiếu đặt hàng NCC TỪ phiếu đề xuất (phiếu tỉnh gửi lên). Spec chạy ở project `province`
 * (tỉnh gửi phiếu lên TCT); mọi thao tác của TCT làm trên PHIÊN PHỤ `tct` (`k.moPhienPhu`).
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/purchaseOrder/pages/{StockRequestDetailPage,PurchaseOrderFormPage}.jsx`
 * (`/inventory/purchase-order/create?stockRequestId=` · modal "Một số sản phẩm không thuộc nhà cung cấp mới" ·
 * "Vui lòng thêm ít nhất 1 sản phẩm").
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
const po = require('./po-ghi');
const gt = require('./giao-thang-ghi');

const GOC = path.join(__dirname, '..');
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });

/** Dựng phiếu TCT rồi mở form tạo PO trên phiên phụ tct; `fn(tp, ctx)`. */
async function chayTct(page, browser, id, fn, { sp } = {}) {
	{
		const ly = skipReason(loadCaseInput(GOC, id));
		test.skip(Boolean(ly), ly ?? '');
		test.setTimeout(600_000);
		const p = await gt.phieuTct(browser, page, 2, sp);
		const tct = await k.moPhienPhu(browser, 'tct', '/inventory/purchase-request');
		try {
			await fn(tct.page, { ...p, page, browser });
		} catch (e) {
			// error-context/ảnh mặc định là của trang chính (tỉnh) — đính kèm trạng thái PHIÊN PHỤ tct nơi lỗi xảy ra.
			await test.info().attach('tct-luc-loi.png', { body: await tct.page.screenshot({ fullPage: true }).catch(() => Buffer.from('')), contentType: 'image/png' });
			await test.info().attach('tct-luc-loi.txt', { body: await tct.page.locator('body').ariaSnapshot().catch(() => ''), contentType: 'text/plain' });
			throw e;
		} finally { await tct.dong(); }
	}
}
// SP giá tiêu chuẩn được `handleSupplierChange` miễn kiểm (`!isStandardStock`) ⇒ case đổi NCC dùng SP FIFO.
const SP_FIFO = () => require('../../00_seed/seed-state').doc().duLieu.sanPham.sanPhamTheoGiaVon.fifo.tenSanPham;
const khoa = (tp, nhan) => tp.locator('.ant-pro-footer-bar button').filter({ hasText: new RegExp(`^${nhan}$`) });

test.describe('13_3 · 010 TCT tạo PO từ phiếu đề xuất', () => {
	test('13_3_010_002 — Hiển thị màn hình tạo phiếu đặt hàng từ phiếu đề xuất', async ({ page, browser }) => chayTct(page, browser, '13_3_010_002', async (tp, c) => {
		const form = await gt.moFormTuPhieu(tp, c.maTct);
		const noi = dx.chuan(await tp.locator('.ant-pro-page-container').innerText());
		ghi(`form: ${form} | nút: ${(await tp.locator('.ant-pro-footer-bar button').allInnerTexts()).join(', ')}`);
		for (const b of ['Huỷ', 'Lưu nháp', 'Lưu', 'Gửi nhà cung cấp']) await expect(khoa(tp, b), `Thiếu nút "${b}"`).toBeVisible();
		await expect(tp.locator('.anticon-arrow-left').first(), 'Thiếu nút Quay lại').toBeVisible();
		for (const x of ['Thông tin chung', 'Tổng giá trị đặt hàng']) expect(noi, `Thiếu khu vực "${x}"`).toContain(x);
		// QC: mở form là thấy "Danh sách hàng hoá" — sản phẩm chỉ hiện khu vực này sau khi chọn Kho đặt hàng.
		expect.soft(noi, 'Khu vực "Danh sách sản phẩm" không hiện khi vừa mở form (chỉ hiện sau khi chọn Kho đặt hàng)').toContain('Danh sách sản phẩm');
		for (const f of ['Mã phiếu', 'Nhà cung cấp', 'Ghi chú', 'Ngày nhập dự kiến', 'Phiếu đề xuất nhập hàng']) expect(form, `Thiếu trường "${f}"`).toContain(f);
		expect.soft(form, 'QC: trường "Điểm bán" — sản phẩm là "Kho đặt hàng" / "Kho nhận hàng"').toContain('Điểm bán');
		const lienKet = await po.fi(tp, 'Phiếu đề xuất nhập hàng').locator('input').inputValue();
		ghi(`Phiếu đề xuất nhập hàng = "${lienKet}"`);
		expect(lienKet, 'Trường "Phiếu đề xuất nhập hàng" không mang mã phiếu nguồn').toContain(c.maTct);
		await po.chonKho(tp, 'Kho đặt hàng', null, 'Tổng công ty');
		await expect(po.bangSp(tp).locator('tbody tr.ant-table-row').filter({ hasText: dx.SP().tenSanPham }), 'Danh sách hàng hoá không điền sẵn SP của phiếu').toHaveCount(1);
	}));

	test('13_3_010_003 — Tạo phiếu đặt hàng NCC (Gửi nhà cung cấp)', async ({ page, browser }) => chayTct(page, browser, '13_3_010_003', async (tp, c) => {
		const kq = await gt.taoPOTuPhieu(tp, c.maTct);
		ghi(`${kq.maPO} · ${kq.luu.tb} · requestCode ${kq.luu.body?.data?.requestCode}`);
		expect(kq.luu.tb).toContain('Tạo phiếu đặt hàng thành công');
		expect.soft(kq.luu.tb, 'QC: thông báo có dấu "!"').toContain('Tạo phiếu đặt hàng thành công!');
		expect(await po.trangThai(tp, kq.maPO)).toBe('Đã gửi NCC');
	}));

	test('13_3_010_004 — Để trống danh sách sản phẩm', async ({ page, browser }) => chayTct(page, browser, '13_3_010_004', async (tp, c) => {
		await gt.moFormTuPhieu(tp, c.maTct);
		await po.chonKho(tp, 'Kho đặt hàng', null, 'Tổng công ty');
		await po.chonNcc(tp);
		await po.chonNgay(tp);
		const rows = po.bangSp(tp).locator('tbody tr.ant-table-row');
		while (await rows.count()) await rows.first().locator('button:has(.anticon-delete)').click();
		const bi = [];
		tp.on('request', (r) => { if (/purchase-orders$/.test(new URL(r.url()).pathname) && r.method() === 'POST') bi.push(r.url()); });
		const l = await po.luu(tp, 'Gửi nhà cung cấp');
		ghi(l.tb);
		expect(l.tb).toContain('Vui lòng thêm ít nhất 1 sản phẩm');
		expect(bi, 'Không có SP mà vẫn gửi tạo PO').toEqual([]);
	}));

	test('13_3_010_005 — Chọn NCC không cung cấp sản phẩm trong danh sách', async ({ page, browser }) => chayTct(page, browser, '13_3_010_005', async (tp, c) => {
		await gt.moFormTuPhieu(tp, c.maTct);
		await po.chonKho(tp, 'Kho đặt hàng', null, 'Tổng công ty');
		await po.chonNcc(tp);
		await expect(po.bangSp(tp).locator('tbody tr.ant-table-row').first()).toBeVisible();
		const khac = await nccKhac(tp);
		const m = tp.locator('.ant-modal-confirm').filter({ hasText: 'Một số sản phẩm không thuộc nhà cung cấp mới' }).last();
		await expect(m, `Đổi sang NCC "${khac}" (không map SP) mà không cảnh báo`).toBeVisible();
		ghi(`${khac}: ${dx.chuan(await m.innerText())}`);
		expect(dx.chuan(await m.innerText())).toContain(SP_FIFO());
	}, { sp: require('../../00_seed/seed-state').doc().duLieu.sanPham.sanPhamTheoGiaVon.fifo.tenSanPham }));

	test('13_3_010_006 — Loại bỏ sản phẩm không thuộc nhà cung cấp', async ({ page, browser }) => chayTct(page, browser, '13_3_010_006', async (tp, c) => {
		await gt.moFormTuPhieu(tp, c.maTct);
		await po.chonKho(tp, 'Kho đặt hàng', null, 'Tổng công ty');
		await po.chonNcc(tp);
		const rows = po.bangSp(tp).locator('tbody tr.ant-table-row').filter({ hasText: SP_FIFO() });
		await expect(rows).toHaveCount(1);
		await nccKhac(tp);
		const m = tp.locator('.ant-modal-confirm').filter({ hasText: 'Một số sản phẩm không thuộc nhà cung cấp mới' }).last();
		await m.getByRole('button', { name: 'Loại bỏ & tiếp tục' }).click();
		await expect(rows, 'Bấm Loại bỏ mà SP không thuộc NCC mới vẫn còn').toHaveCount(0);
	}, { sp: require('../../00_seed/seed-state').doc().duLieu.sanPham.sanPhamTheoGiaVon.fifo.tenSanPham }));

	test('13_3_010_007 — Bỏ trống trường bắt buộc', async ({ page, browser }) => chayTct(page, browser, '13_3_010_007', async (tp, c) => {
		await gt.moFormTuPhieu(tp, c.maTct);
		await po.fi(tp, 'Mã phiếu').locator('input').fill('');
		await khoa(tp, 'Lưu nháp').click();
		await expect(tp.locator('.ant-form-item-explain-error').first()).toBeVisible();
		const loi = (await tp.locator('.ant-form-item-explain-error').allInnerTexts()).map(dx.chuan);
		ghi(loi.join(' | '));
		for (const x of ['Nhập mã phiếu', 'Vui lòng chọn nhà cung cấp', 'Vui lòng chọn ngày nhập dự kiến']) expect(loi, `Thiếu báo lỗi "${x}"`).toContain(x);
		expect.soft(loi, 'QC: "Chọn điểm bán" — sản phẩm báo "Chọn kho đặt hàng"').toContain('Chọn điểm bán');
	}));

	test('13_3_010_008 — Chỉnh sửa thông tin phiếu đề xuất đã duyệt', async ({ page, browser }) => chayTct(page, browser, '13_3_010_008', async (tp, c) => {
		await dx.moChiTiet(tp, c.maTct, 'tct');
		await tp.getByRole('button', { name: /^Xác nhận$/ }).click();
		const dr = tp.locator('.ant-drawer-open').filter({ hasText: 'Duyệt phiếu đề xuất' }).last();
		expect(await dx.thongBaoQuanh(tp, () => dr.locator('.ant-drawer-footer .ant-btn-primary').last().click())).toContain('Đã duyệt phiếu');
		await tp.reload();
		await tp.getByRole('button', { name: 'Sửa phiếu' }).click();
		await expect(tp.locator('#note')).toBeVisible({ timeout: 30_000 });
		// 🔴 Form nạp chi tiết bất đồng bộ rồi setFieldsValue ⇒ điền sớm là bị ghi đè. Chờ dòng SP của phiếu hiện.
		await expect(tp.locator('#code'), 'Form sửa chưa nạp dữ liệu phiếu').toHaveValue(c.maTct, { timeout: 30_000 });
		await tp.waitForTimeout(800);
		const moi = `AUTO TEST 13_3 sửa phiếu TCT ${Date.now() % 100000}`;
		await tp.locator('#note').fill(moi);
		await expect(tp.locator('#note')).toHaveValue(moi);
		const cho = tp.waitForResponse((r) => /stock-requests/.test(r.url()) && ['PUT', 'POST'].includes(r.request().method()), { timeout: 30_000 }).catch(() => null);
		const tb = await dx.thongBaoQuanh(tp, () => tp.locator('.ant-pro-footer-bar button').filter({ hasText: /^(Lưu|Cập nhật)$/ }).click());
		const res = await cho;
		ghi(`${tb} · ${res?.request().method()} ${res?.status()} ${(await res?.text().catch(() => ''))?.slice(0, 200)}`);
		expect(tb).toMatch(/thành công/i);
		await dx.moChiTiet(tp, c.maTct, 'tct');
		const noi = dx.chuan(await tp.locator('.ant-pro-page-container').innerText());
		expect(noi).toContain(moi);
		expect(noi, 'Sửa phiếu đã duyệt mà trạng thái không còn Đã duyệt').toContain('Đã duyệt');
	}));

	test('13_3_010_009 — Lưu nháp phiếu đặt hàng', async ({ page, browser }) => chayTct(page, browser, '13_3_010_009', async (tp, c) => {
		const kq = await gt.taoPOTuPhieu(tp, c.maTct, { nhan: 'Lưu nháp' });
		ghi(kq.maPO);
		expect(await po.trangThai(tp, kq.maPO)).toBe('Bản nháp');
	}));

	test('13_3_010_010 — Nút huỷ', async ({ page, browser }) => chayTct(page, browser, '13_3_010_010', async (tp, c) => {
		await gt.moFormTuPhieu(tp, c.maTct);
		const bi = [];
		tp.on('request', (r) => { if (/purchase-orders$/.test(new URL(r.url()).pathname) && r.method() === 'POST') bi.push(r.url()); });
		await khoa(tp, 'Huỷ').click();
		await expect(tp).not.toHaveURL(/purchase-order\/create/, { timeout: 15_000 });
		expect(bi).toEqual([]);
		await dx.moDs(tp, 'tct');
		await expect((await dx.timMa(tp, c.maTct)).first(), 'Huỷ tạo PO mà phiếu đề xuất đổi trạng thái').toContainText('Đã duyệt');
	}));

	test('13_3_010_011 — Lưu phiếu (Đã duyệt)', async ({ page, browser }) => chayTct(page, browser, '13_3_010_011', async (tp, c) => {
		const kq = await gt.taoPOTuPhieu(tp, c.maTct, { nhan: 'Lưu' });
		ghi(kq.maPO);
		expect(await po.trangThai(tp, kq.maPO)).toBe('Đã duyệt');
	}));

	test('13_3_010_012 — Danh sách phiếu đề xuất sau tạo đơn', async ({ page, browser }) => chayTct(page, browser, '13_3_010_012', async (tp, c) => {
		const kq = await gt.taoPOTuPhieu(tp, c.maTct);
		await dx.moDs(tp, 'tct');
		const r = (await dx.timMa(tp, c.maTct)).first();
		const noi = dx.chuan(await r.innerText());
		ghi(`${c.maTct}: ${noi}`);
		expect(noi, 'Phiếu đề xuất không chuyển "Đã đặt hàng"').toContain('Đã đặt hàng');
		expect(noi, 'Dòng phiếu không hiện mã PO vừa sinh').toContain(kq.maPO);
		expect(await po.trangThai(tp, kq.maPO), 'Không sinh phiếu ở Đặt hàng nhà cung cấp').not.toBeNull();
	}));
});

/** Đổi NCC sang một NCC khác AUTO NCC seed (mục đầu tiên không phải NCC làn); trả tên. */
async function nccKhac(tp) {
	await po.fi(tp, 'Nhà cung cấp').locator('.ant-select').click();
	const ds = tp.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
	await ds.first().waitFor();
	await tp.waitForTimeout(500);
	const muc = ds.filter({ hasNotText: po.NCC() }).first();
	const ten = dx.chuan(await muc.innerText());
	await muc.click({ force: true });
	return ten;
}
