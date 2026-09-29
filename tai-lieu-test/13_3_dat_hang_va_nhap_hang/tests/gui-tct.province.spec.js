'use strict';

/**
 * 13_3 · 050 — tỉnh gửi phiếu đề xuất lên Tổng công ty (drawer "Gửi lên tổng công ty"), vai `province`.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/purchaseOrder/pages/StockRequestDetailPage.jsx` (nút "Gửi lên
 * Tổng công ty"), `pages/DrawerSendToTct.jsx` (mã TCT tự sinh · Kho nhận hàng `shopType=HUB` · Mô tả).
 * Phiếu "Đã duyệt" tiền đề dựng bằng helper 13_1 (CHT lập → xã duyệt).
 * 🔴 Gửi xong phiếu gốc thành "Đã gửi Tổng công ty" và sinh PHIẾU MỚI mang mã TCT — tìm ở TCT phải theo mã mới.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
const g = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/gop-tach-ghi');
const t = require('./tct-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 600) });

test.describe('13_3 · 050 gửi phiếu đề xuất lên TCT (tỉnh)', () => {
	test('13_3_050_001 — Kiểm tra hiển thị màn hình', async ({ page, browser }) => {
		chanNeuTat('13_3_050_001');
		test.setTimeout(300_000);
		const [ma] = await g.phieuDaDuyet(browser, [2]);
		const dr = await t.moDrawerGui(page, ma);
		const noi = dx.chuan(await dr.innerText());
		ghi(noi);
		await expect(dr.getByRole('button', { name: 'Xác nhận gửi' })).toBeVisible();
		await expect(dr.getByRole('button', { name: /^Hu[ỷy]$/ })).toBeVisible();
		await expect(dr.locator('.ant-drawer-close')).toBeVisible();
		expect(noi).toContain('Chuyển trạng thái phiếu hiện tại');
		expect(noi).toContain('"Đã gửi Tổng công ty"');
		expect(noi).toContain('Tạo phiếu mới để gửi lên Tổng công ty');
		await expect(dr.locator('#code'), 'Mã đề xuất TCT không tự sinh').not.toHaveValue('');
		expect(noi).toContain('Mô tả');
		expect.soft(noi, 'QC: dropdown "Điểm bán nhận hàng" — sản phẩm đặt nhãn "Kho nhận hàng"').toContain('Điểm bán nhận hàng');
	});

	test('13_3_050_002 — Kiểm tra Tạo phiếu Gửi lên tổng công ty', async ({ page, browser }) => {
		chanNeuTat('13_3_050_002');
		test.setTimeout(300_000);
		const [ma] = await g.phieuDaDuyet(browser, [2]);
		const kq = await t.guiLenTct(page, ma);
		ghi(JSON.stringify(kq));
		expect(kq.res?.status?.code == 200, `Gửi lên TCT lỗi: ${kq.tb}`).toBe(true);
		expect.soft(kq.tb, 'QC: thông báo "Gửi thành công!"').toContain('Gửi thành công!');
		await dx.moDs(page, 'province');
		await expect((await dx.timMa(page, ma)).first(), 'Phiếu gốc không chuyển "Đã gửi Tổng công ty"').toContainText(/Đã gửi Tổng công ty|Đã gửi TCT/);
		const p = await k.moPhienPhu(browser, 'tct', '/inventory/purchase-request');
		try {
			await dx.moDs(p.page, 'tct');
			const r = (await dx.timMa(p.page, kq.maTct)).first();
			await expect(r, `TCT không thấy phiếu mới ${kq.maTct}`).toBeVisible({ timeout: 20_000 });
			ghi(`TCT: ${dx.chuan(await r.innerText())}`);
		} finally { await p.dong(); }
	});

	test('13_3_050_003 — Kiểm tra để trống điểm bán nhận hàng', async ({ page, browser }) => {
		chanNeuTat('13_3_050_003');
		test.setTimeout(300_000);
		const [ma] = await g.phieuDaDuyet(browser, [1]);
		const dr = await t.moDrawerGui(page, ma);
		const bi = [];
		page.on('request', (r) => { if (/send-to-tct|sendToTct|to-tct/i.test(r.url()) && r.method() !== 'GET') bi.push(r.url()); });
		await dr.getByRole('button', { name: 'Xác nhận gửi' }).click();
		await expect(dr.locator('.ant-form-item-explain-error').first(), 'Bỏ trống kho mà không báo lỗi').toBeVisible();
		const loi = dx.chuan((await dr.locator('.ant-form-item-explain-error').allInnerTexts()).join(' | '));
		ghi(loi);
		expect(bi, 'Bỏ trống kho mà vẫn gửi').toEqual([]);
		expect(loi, 'QC: báo "Vui lòng chọn điểm bán"').toContain('Vui lòng chọn điểm bán');
	});

	test('13_3_050_004 — Kiểm tra danh sách điểm bán nhận hàng', async ({ page, browser }) => {
		chanNeuTat('13_3_050_004');
		test.setTimeout(300_000);
		const [ma] = await g.phieuDaDuyet(browser, [1]);
		const dr = await t.moDrawerGui(page, ma);
		const hop = await t.moHopKho(page, dr);
		const c1 = dx.chuan(await hop.locator('.sp-column').first().innerText());
		const c3 = await hop.locator('.sp-column').last().locator('.sp-item').allInnerTexts();
		ghi(`cột tỉnh: ${c1} | kho: ${c3.join(', ')}`);
		expect(c1, 'Danh sách có đơn vị ngoài tỉnh đang truy cập').not.toMatch(/Tổng công ty|Bưu điện Hà Nội/);
		expect(c3.length, 'Không có HUB nào của tỉnh').toBeGreaterThan(0);
		expect(c3.map(dx.chuan), 'Thiếu HUB seed của tỉnh').toContain(t.HUB());
	});

	test('13_3_050_005 — Kiểm tra để trống mã phiếu đề xuất TCT', async ({ page, browser }) => {
		chanNeuTat('13_3_050_005');
		test.setTimeout(300_000);
		const [ma] = await g.phieuDaDuyet(browser, [1]);
		const kq = await t.guiLenTct(page, ma, { maTrong: true });
		ghi(JSON.stringify(kq));
		expect(kq.gui?.code ?? '', 'Payload không để trống mã như đã xoá').toBe('');
		expect(kq.res?.status?.code == 200, `Để trống mã mà gửi lỗi: ${kq.tb}`).toBe(true);
		const maMoi = kq.res?.data?.code || kq.res?.data?.newCode;
		expect(maMoi, 'BE không sinh mã cho phiếu TCT khi để trống').toMatch(/^DX/);
	});

	test('13_3_050_006 — Kiểm tra nút Huỷ', async ({ page, browser }) => {
		chanNeuTat('13_3_050_006');
		test.setTimeout(300_000);
		const [ma] = await g.phieuDaDuyet(browser, [1]);
		const dr = await t.moDrawerGui(page, ma);
		const bi = [];
		page.on('request', (r) => { if (/to-tct|sendToTct/i.test(r.url()) && r.method() !== 'GET') bi.push(r.url()); });
		await dr.getByRole('button', { name: /^Hu[ỷy]$/ }).click();
		await expect(dr).toBeHidden();
		expect(bi).toEqual([]);
		await dx.moDs(page, 'province');
		await expect((await dx.timMa(page, ma)).first()).toContainText('Đã duyệt');
	});

	test('13_3_050_007 — Kiểm tra Xem chi tiết phiếu đề xuất', async ({ page, browser }) => {
		chanNeuTat('13_3_050_007');
		test.setTimeout(300_000);
		const [ma] = await g.phieuDaDuyet(browser, [3]);
		await dx.moChiTiet(page, ma, 'province');
		const noi = dx.chuan(await page.locator('.ant-pro-page-container').innerText());
		ghi(noi);
		for (const x of ['Thông tin chung', 'Danh sách sản phẩm', ma, dx.SP().tenSanPham]) expect(noi, `Chi tiết thiếu "${x}"`).toContain(x);
		const cot = (await page.locator('.ant-pro-page-container .ant-table-thead th').allInnerTexts()).map(dx.chuan).join(' · ');
		ghi(`cột: ${cot}`);
		for (const c of [/đề xuất/i, /xác nhận|duyệt/i, /nhập kho/i]) expect(cot, `Bảng sản phẩm thiếu cột số lượng ${c}`).toMatch(c);
	});
});
