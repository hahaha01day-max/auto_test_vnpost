'use strict';

/**
 * Helper 13_3 — dựng chuỗi đơn GIAO THẲNG NCC → tỉnh:
 *   CHT lập → xã duyệt → tỉnh "Gửi lên TCT" (phiếu mới `ĐXTCT-…`) → TCT duyệt → TCT "Tạo phiếu đặt hàng NCC"
 *   (kho đặt = kho TCT, kho nhận = HUB tỉnh, điền sẵn SP của phiếu) → Gửi NCC → (tuỳ chọn) NCC xác nhận.
 * Nguồn (vnpost-web): `StockRequestDetailPage.jsx`, `DrawerSendToTct.jsx`, `PurchaseOrderFormPage.jsx` (`?stockRequestId=`),
 * `PurchaseOrderDetailPage.jsx`.
 */

const { expect } = require('@playwright/test');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
const g = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/gop-tach-ghi');
const t = require('./tct-ghi');
const po = require('./po-ghi');

/** Tỉnh gửi phiếu `sl` lên TCT; trả { maGoc, maTct }. `page` là phiên tỉnh. */
async function phieuTct(browser, page, sl = 2, ten) {
	const [maGoc] = await g.phieuDaDuyet(browser, [sl], { ten });
	const kq = await t.guiLenTct(page, maGoc);
	expect(kq.res?.status?.code == 200, `Tỉnh gửi lên TCT lỗi: ${kq.tb}`).toBe(true);
	return { maGoc, maTct: kq.maTct };
}

/** Ở phiên TCT: (duyệt phiếu TCT rồi) bấm "Tạo phiếu đặt hàng NCC"; dừng ở form, trả nội dung form lúc vừa mở. */
async function moFormTuPhieu(tp, maTct, { duyet = true } = {}) {
	await dx.moChiTiet(tp, maTct, 'tct');
	if (duyet) {
		await tp.getByRole('button', { name: /^Xác nhận$/ }).click();
		const dr = tp.locator('.ant-drawer-open').filter({ hasText: 'Duyệt phiếu đề xuất' }).last();
		expect(await dx.thongBaoQuanh(tp, () => dr.locator('.ant-drawer-footer .ant-btn-primary').last().click()), 'TCT duyệt phiếu không thành công').toContain('Đã duyệt phiếu');
		await tp.reload();
		await tp.getByText('Danh sách sản phẩm').first().waitFor();
	}
	await tp.getByRole('button', { name: /Tạo phiếu đặt hàng NCC/ }).first().click();
	await expect(tp).toHaveURL(/purchase-order\/create\?stockRequestId=/, { timeout: 20_000 });
	await expect(po.fi(tp, 'Kho nhận hàng')).toContainText(t.HUB(), { timeout: 30_000 });
	return dx.chuan((await tp.locator('.ant-form-item').allInnerTexts()).join(' || '));
}

/** Ở phiên TCT: duyệt phiếu TCT rồi tạo PO từ phiếu; trả { maPO, form }. */
async function taoPOTuPhieu(tp, maTct, { nhan = 'Gửi nhà cung cấp', duyet = true } = {}) {
	const form = await moFormTuPhieu(tp, maTct, { duyet });
	await po.chonKho(tp, 'Kho đặt hàng', null, 'Tổng công ty');
	await po.chonNcc(tp);
	await po.chonNgay(tp);
	await expect(po.bangSp(tp).locator('tbody tr.ant-table-row').first(), 'PO từ phiếu đề xuất không có sản phẩm').toBeVisible();
	const l = await po.luu(tp, nhan);
	expect(l.tb, `Tạo PO từ phiếu ${maTct} không thành công`).toContain('Tạo phiếu đặt hàng thành công');
	return { maPO: l.ma, idPO: l.id, form, luu: l };
}

/** Trọn chuỗi đến "NCC xác nhận" (hoặc dừng ở "Đã gửi NCC" nếu `xacNhan=false`). `page` là phiên tỉnh. */
async function donGiaoThang(browser, page, { sl = 2, xacNhan = true, slXacNhan, ten } = {}) {
	const p = await phieuTct(browser, page, sl, ten);
	const tct = await k.moPhienPhu(browser, 'tct', '/inventory/purchase-request');
	try {
		const kq = await taoPOTuPhieu(tct.page, p.maTct);
		if (xacNhan) {
			await po.moChiTiet(tct.page, kq.maPO);
			expect((await po.nccXacNhan(tct.page, slXacNhan)).tb, 'NCC xác nhận không thành công').toContain('Đã xác nhận');
		}
		return { ...p, ...kq };
	} finally {
		await tct.dong();
	}
}

const { moTrang } = require('../../shared/auth/login');
const DS = () => `${process.env.VNPOST_BASE_URL}/inventory/purchase-order/direct-delivery/pending`;

/** Mở màn "Đơn giao thẳng cần xác nhận" (vai tỉnh); trả body response list đầu. */
async function moDsGiaoThang(page, vai = 'province') {
	const cho = page.waitForResponse((r) => /direct-deliver/i.test(r.url()) && r.request().method() === 'GET' && !/[?&]size=1(&|$)/.test(r.url()), { timeout: 60_000 }).catch(() => null);
	await moTrang(page, DS(), vai);
	const res = await cho;
	await expect(page.getByPlaceholder('Tìm theo mã PO...')).toBeVisible({ timeout: 30_000 });
	return res ? res.json().catch(() => null) : null;
}

async function moChiTietGiaoThang(page, maPO, vai = 'province') {
	await moDsGiaoThang(page, vai);
	const r = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: maPO }).first();
	await expect(r, `Tỉnh không thấy đơn giao thẳng ${maPO}`).toBeVisible({ timeout: 20_000 });
	await r.locator('td').nth(1).click();
	await expect(page.getByText('Chi tiết đơn giao thẳng')).toBeVisible({ timeout: 30_000 });
	await expect(page.getByText('Danh sách sản phẩm').first()).toBeVisible({ timeout: 30_000 });
}

/**
 * Ở chi tiết đơn giao thẳng: (tuỳ chọn) sửa SL nhận dòng đầu, nhập lô mọi dòng, bấm Xác nhận + OK.
 * Trả { tb, gui, res }.
 */
async function xacNhanGiaoThang(page, { slNhan } = {}) {
	const bang = page.locator('.ant-table-tbody tr.ant-table-row').filter({ has: page.getByRole('button', { name: /Cần nhập|Đã nhập/ }) });
	await expect(bang.first(), 'Chi tiết đơn giao thẳng không có dòng sản phẩm').toBeVisible({ timeout: 20_000 });
	const n = await bang.count();
	const hom = new Date();
	const hsd = new Date(hom.getTime() + 365 * 86400_000);
	for (let i = 0; i < n; i++) {
		const r = bang.nth(i);
		if (i === 0 && slNhan !== undefined) {
			const o = r.locator('.ant-input-number-input').first();
			await o.fill(String(slNhan));
			await o.press('Tab');
		}
		const nut = r.getByRole('button', { name: /Cần nhập|Đã nhập/ });
		if (!(await nut.count())) continue;
		if (/Đã nhập/.test(await nut.innerText())) continue;
		const slDong = await r.locator('.ant-input-number-input').first().inputValue();
		await nut.click();
		const dl = page.locator('.ant-drawer-open').last();
		await expect(dl.getByRole('button', { name: 'Xong' })).toBeVisible();
		const ma = dl.getByPlaceholder(/tạo mã lô|Mã lô tự động/).first();
		if (!(await ma.inputValue())) await ma.fill(`AT13_3_${Date.now() % 1_000_000}`);
		// 🔴 Gõ phím + Enter không chốt được DatePicker ở drawer này (BE báo thiếu NSX/HSD dù drawer cho "Xong").
		//    NSX = bấm ô hôm nay; HSD = sang năm sau bằng nút "»" rồi bấm cùng ngày.
		const ngay = dl.locator('.ant-picker input');
		await ngay.nth(0).click();
		await page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) td.ant-picker-cell-today').first().click();
		await expect(ngay.nth(0)).toHaveValue(po.dmy(hom));
		await ngay.nth(1).click();
		const dd = page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)').last();
		await dd.locator('.ant-picker-header-super-next-btn').click();
		const iso = `${hsd.getFullYear()}-${String(hsd.getMonth() + 1).padStart(2, '0')}-${String(hsd.getDate()).padStart(2, '0')}`;
		await dd.locator(`td[title="${iso}"]`).click();
		await expect(ngay.nth(1)).toHaveValue(po.dmy(hsd));
		// SL lô mặc định theo SL gốc — phải khớp SL nhận của dòng, lệch là dòng vẫn "Cần nhập".
		const slLo = dl.locator('.ant-input-number-input').last();
		await slLo.fill(slDong);
		await slLo.press('Tab');
		await dl.getByRole('button', { name: 'Xong' }).click();
		await expect(dl).toBeHidden();
		await expect(r.getByRole('button', { name: 'Đã nhập' }), 'Nhập lô xong mà dòng vẫn "Cần nhập"').toBeVisible();
	}
	const cho = page.waitForResponse((r) => /direct/i.test(r.url()) && r.request().method() !== 'GET', { timeout: 60_000 }).catch(() => null);
	const tb = await dx.thongBaoQuanh(page, async () => {
		await page.locator('.ant-pro-footer-bar button, .ant-pro-page-container button').filter({ hasText: /^\s*Xác nhận\s*$/ }).last().click();
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận đơn giao thẳng?' }).last();
		if (await hop.waitFor({ timeout: 5_000 }).then(() => true).catch(() => false)) await hop.getByRole('button', { name: 'Xác nhận' }).click();
	}, 30_000);
	const res = await cho;
	return { tb, gui: res ? JSON.parse(res.request().postData() || '{}') : null, res: res ? await res.json().catch(() => null) : null };
}

module.exports = { phieuTct, moFormTuPhieu, taoPOTuPhieu, donGiaoThang, moDsGiaoThang, moChiTietGiaoThang, xacNhanGiaoThang };
