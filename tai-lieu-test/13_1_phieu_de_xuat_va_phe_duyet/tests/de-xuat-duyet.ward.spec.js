'use strict';

/**
 * 13_1 · 090 — Duyệt / từ chối phiếu đề xuất ở cấp XÃ (vai `ward` — Giám đốc xã của xã seed), rồi cấp tỉnh.
 * Phiếu chờ duyệt dựng bằng phiên phụ CHT (`shop`) ngay trong case. Duyệt/từ chối qua trang chi tiết
 * (`StockRequestDetailPage.jsx`: nút "Xác nhận" → drawer "Duyệt phiếu đề xuất"; "Từ chối" → modal lý do).
 * 🔴 Phiếu KHÔNG xoá được ⇒ các phiếu `AUTO TEST 13_1` ở lại (đã duyệt / từ chối).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dx = require('./dx-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

async function phieuMoi(browser, sl = 4) {
	const p = await k.moPhienPhu(browser, 'shop', '/inventory/purchase-request');
	try {
		return await dx.lapChoDuyet(p.page, sl);
	} finally {
		await p.dong();
	}
}

async function trangThai(page, ma, vai) {
	await dx.moDs(page, vai);
	const r = (await dx.timMa(page, ma)).first();
	return (await r.count()) ? dx.chuan(await r.innerText()) : null;
}

test.describe('13_1 · 090 — duyệt phiếu đề xuất cấp xã', () => {
	test('13_1_090_001 — Kiểm tra vai trò Giám đốc xã duyệt tất cả số lượng trong phiếu đề xuất', async ({ page, browser }) => {
		chanNeuTat('13_1_090_001');
		test.setTimeout(240_000);
		const ma = await phieuMoi(browser, 4);
		await dx.moChiTiet(page, ma, 'ward');
		await page.getByRole('button', { name: /^Xác nhận$/ }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Duyệt phiếu đề xuất' }).last();
		await expect(dr).toBeVisible();
		const tb = await dx.thongBaoQuanh(page, () => dr.locator('.ant-drawer-footer .ant-btn-primary').last().click());
		expect(tb).toContain('Đã duyệt phiếu');
		const tt = await trangThai(page, ma, 'ward');
		test.info().annotations.push({ type: 'đo', description: tt });
		expect(tt).toMatch(/Đã duyệt|Chờ duyệt cấp|Tỉnh/);
		const p = await k.moPhienPhu(browser, 'province', '/inventory/purchase-request');
		try {
			const tinh = await trangThai(p.page, ma, 'province');
			test.info().annotations.push({ type: 'đo', description: `cấp tỉnh: ${tinh}` });
			expect(tinh, 'Phiếu xã đã duyệt không hiện lên cấp tỉnh').not.toBeNull();
		} finally {
			await p.dong();
		}
	});

	test('13_1_090_002 — Kiểm tra vai trò Giám đốc xã duyệt một phần số lượng trong phiếu đề xuất', async ({ page, browser }) => {
		chanNeuTat('13_1_090_002');
		test.setTimeout(240_000);
		const ma = await phieuMoi(browser, 5);
		await dx.moChiTiet(page, ma, 'ward');
		await page.getByRole('button', { name: /^Xác nhận$/ }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Duyệt phiếu đề xuất' }).last();
		const o = dr.locator('.ant-table-tbody .ant-input-number-input').first();
		await o.fill('2');
		await o.press('Tab');
		const cho = page.waitForResponse((r) => /stock-requests\/.+\/approve/.test(r.url()), { timeout: 30_000 });
		const tb = await dx.thongBaoQuanh(page, () => dr.locator('.ant-drawer-footer .ant-btn-primary').last().click());
		const res = await cho;
		test.info().annotations.push({ type: 'đo', description: `${tb} · ${res.request().postData()?.slice(0, 300)}` });
		expect(tb).toContain('Đã duyệt phiếu');
		await page.reload();
		await expect(page.getByText('Danh sách sản phẩm').first()).toBeVisible({ timeout: 30_000 });
		const noi = dx.chuan(await page.locator('.ant-pro-page-container').innerText());
		expect(noi, 'Chi tiết không ghi nhận SL duyệt = 2').toMatch(/\b2\b/);
	});

	test('13_1_090_004 — Kiểm tra vai trò Giám đốc xã huỷ phiếu bỏ trống trường lí do', async ({ page, browser }) => {
		chanNeuTat('13_1_090_004');
		test.setTimeout(240_000);
		const ma = await phieuMoi(browser, 1);
		await dx.moChiTiet(page, ma, 'ward');
		const bi = [];
		page.on('request', (r) => { if (/stock-requests\/.+\/approve/.test(r.url())) bi.push(r.postData()); });
		await page.getByRole('button', { name: /^Từ chối$/ }).click();
		const m = page.locator('.ant-modal-wrap:visible').filter({ hasText: 'Từ chối phiếu đề xuất' }).last();
		const tb = await dx.thongBaoQuanh(page, () => m.getByRole('button', { name: 'Xác nhận từ chối' }).click(), 6_000);
		const loi = dx.chuan(await m.locator('.ant-form-item-explain-error').allInnerTexts().then((x) => x.join(' | ')).catch(() => ''));
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, loi, daGui: bi }) });
		expect(`${tb} ${loi}`, 'Bỏ trống lý do không báo "Vui lòng nhập lí do"').toMatch(/Vui lòng nhập l[ýí] do/i);
		expect(bi, '🔴 Bỏ trống lý do mà vẫn gửi từ chối').toEqual([]);
		test.info().annotations.push({ type: 'phiếu', description: ma });
	});

	test('13_1_090_003 — Kiểm tra vai trò Giám đốc xã huỷ phiếu', async ({ page, browser }) => {
		chanNeuTat('13_1_090_003');
		test.setTimeout(240_000);
		const ma = await phieuMoi(browser, 1);
		await dx.moChiTiet(page, ma, 'ward');
		await page.getByRole('button', { name: /^Từ chối$/ }).click();
		const m = page.locator('.ant-modal-wrap:visible').filter({ hasText: 'Từ chối phiếu đề xuất' }).last();
		await m.getByPlaceholder('Nhập lý do từ chối...').fill('AUTO TEST 13_1 tu choi');
		const tb = await dx.thongBaoQuanh(page, () => m.getByRole('button', { name: 'Xác nhận từ chối' }).click());
		expect(tb).toContain('Đã từ chối phiếu');
		expect(await trangThai(page, ma, 'ward')).toMatch(/Từ chối/);
	});
});
