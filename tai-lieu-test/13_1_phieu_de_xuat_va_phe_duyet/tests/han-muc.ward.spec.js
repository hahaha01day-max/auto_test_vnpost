'use strict';

/**
 * 13_1 · 090_006–008 — duyệt phiếu đề xuất theo HẠN MỨC (vai `ward` — Giám đốc xã; bước 2 vai `province_manager`).
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/purchaseOrder/components/ApprovalProgressBlock.jsx` (thẻ
 * "Tiến trình phê duyệt" · "Đã duyệt x/y"), `pages/StockRequestDetailPage.jsx`, `pages/ApprovalPendingList.jsx`,
 * `features/shop/pages/settingPage/settingContents/ApprovalLimitSetting.jsx`.
 * Cấu hình có sẵn (đo 24/09/2026): < 50 triệu → 1 bước Giám đốc xã; ≥ 50 triệu → 2 bước xã → Quản lý tỉnh.
 * SP seed giá tiêu chuẩn 60.000 ⇒ SL 2 = 120.000 đ (1 bước), SL 900 = 54.000.000 đ (2 bước).
 * 🔴 Cấu hình CHUNG cả chuỗi: bật đầu case, TRẢ VỀ trạng thái cũ trong `finally` (user cho phép 24/09/2026).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dx = require('./dx-ghi');
const hm = require('./han-muc');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

async function phieuMoi(browser, sl) {
	const p = await k.moPhienPhu(browser, 'shop', '/inventory/purchase-request');
	try { return await dx.lapChoDuyet(p.page, sl); } finally { await p.dong(); }
}
const khoi = (page) => page.locator('.ant-pro-card').filter({ hasText: 'Tiến trình phê duyệt' }).first();
async function tienTrinh(page) {
	await expect(khoi(page), 'Chi tiết phiếu không có thẻ Tiến trình phê duyệt').toBeVisible({ timeout: 20_000 });
	return dx.chuan(await khoi(page).innerText());
}
async function xacNhan(page) {
	await page.getByRole('button', { name: /^Xác nhận$/ }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Duyệt phiếu đề xuất' }).last();
	await expect(dr).toBeVisible();
	return dx.thongBaoQuanh(page, () => dr.locator('.ant-drawer-footer .ant-btn-primary').last().click());
}
/** Vai tỉnh có thấy phiếu không: tab thường HOẶC tab "vượt hạn mức chờ duyệt". Trả chuỗi dòng hoặc null. */
async function tinhThay(page, ma, vai) {
	// 🔴 Màn nhớ tab đang mở (sessionStorage) ⇒ lần mở sau có thể rơi vào tab "vượt hạn mức", ô #keyword bị ẩn.
	await page.evaluate(() => sessionStorage.removeItem('__sofin_sr_active_tab')).catch(() => {});
	await dx.moDs(page, vai);
	const r = (await dx.timMa(page, ma)).first();
	if (await r.count()) return dx.chuan(await r.innerText());
	const tab = page.locator('.ant-tabs-tab').filter({ hasText: 'vượt hạn mức' });
	if (await tab.count()) {
		await tab.click();
		const r2 = page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').filter({ hasText: ma }).first();
		if (await r2.waitFor({ timeout: 15_000 }).then(() => true).catch(() => false)) return `[tab vượt hạn mức] ${dx.chuan(await r2.innerText())}`;
	}
	return null;
}

async function voiHanMuc(browser, fn) {
	const truoc = await hm.datHanMuc(browser, true);
	try { await fn(); } finally { await hm.datHanMuc(browser, truoc); }
}

test.describe('13_1 · 090 duyệt theo hạn mức', () => {
	test('13_1_090_006 — Kiểm tra cấu hình hạn mức một bước duyệt', async ({ page, browser }) => {
		chanNeuTat('13_1_090_006');
		test.setTimeout(480_000);
		await voiHanMuc(browser, async () => {
			const ma = await phieuMoi(browser, 2);
			await dx.moChiTiet(page, ma, 'ward');
			const t0 = await tienTrinh(page);
			test.info().annotations.push({ type: 'đo', description: `${ma} trước duyệt: ${t0}` });
			expect(t0).toContain('Đã duyệt 0/1');
			expect(t0).toContain('120.000');
			expect(await xacNhan(page)).toContain('Đã duyệt phiếu');
			await page.reload();
			const t1 = await tienTrinh(page);
			test.info().annotations.push({ type: 'đo', description: `sau duyệt: ${t1}` });
			expect(t1, 'Duyệt 1 bước mà không hiện 1/1').toContain('Đã duyệt 1/1');
			const p = await k.moPhienPhu(browser, 'province', '/inventory/purchase-request');
			try {
				const thay = await tinhThay(p.page, ma, 'province');
				test.info().annotations.push({ type: 'đo', description: `tỉnh: ${thay}` });
				expect(thay, 'Phiếu duyệt đủ 1/1 không hiện ở cấp tỉnh').not.toBeNull();
			} finally { await p.dong(); }
		});
	});

	test('13_1_090_007 — Kiểm tra cấu hình hạn mức nhiều bước duyệt, bước 1 đồng ý phiếu', async ({ page, browser }) => {
		chanNeuTat('13_1_090_007');
		test.setTimeout(480_000);
		await voiHanMuc(browser, async () => {
			const ma = await phieuMoi(browser, 900);
			const p = await k.moPhienPhu(browser, 'province_manager', '/inventory/purchase-request');
			try {
				expect(await tinhThay(p.page, ma, 'province_manager'), 'Xã chưa duyệt bước 1/2 mà tỉnh đã thấy phiếu').toBeNull();
				await dx.moChiTiet(page, ma, 'ward');
				expect(await tienTrinh(page)).toContain('Đã duyệt 0/2');
				expect(await xacNhan(page)).toContain('Đã duyệt phiếu');
				await page.reload();
				const tx = await tienTrinh(page);
				test.info().annotations.push({ type: 'đo', description: `xã sau duyệt: ${tx}` });
				expect(tx, 'Ở vai Giám đốc xã không hiện 1/2').toContain('Đã duyệt 1/2');
				const thay = await tinhThay(p.page, ma, 'province_manager');
				test.info().annotations.push({ type: 'đo', description: `tỉnh: ${thay}` });
				expect(thay, 'Xã duyệt bước 1/2 mà tỉnh không thấy phiếu').not.toBeNull();
				// Bước 2 — Quản lý tỉnh duyệt.
				expect(thay, 'Tab chờ tỉnh duyệt không hiện Bước 2/2').toContain('Bước 2/2');
				await p.page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').filter({ hasText: ma }).first().getByText('Xem').click();
				await expect(p.page.getByText('Danh sách sản phẩm').first()).toBeVisible({ timeout: 30_000 });
				const tb = await xacNhan(p.page);
				test.info().annotations.push({ type: 'đo', description: `tỉnh duyệt: ${tb}` });
				expect(tb).toMatch(/Đã duyệt|phê duyệt/);
				await p.page.reload();
				const tt = await tienTrinh(p.page);
				test.info().annotations.push({ type: 'đo', description: `tỉnh sau duyệt: ${tt}` });
				expect(tt, 'Ở vai Quản lý tỉnh không hiện 2/2').toContain('Đã duyệt 2/2');
			} finally { await p.dong(); }
		});
	});

	test('13_1_090_008 — Kiểm tra cấu hình hạn mức nhiều bước duyệt, bước 1 từ chối phiếu', async ({ page, browser }) => {
		chanNeuTat('13_1_090_008');
		test.setTimeout(480_000);
		await voiHanMuc(browser, async () => {
			const ma = await phieuMoi(browser, 900);
			await dx.moChiTiet(page, ma, 'ward');
			expect(await tienTrinh(page)).toContain('Đã duyệt 0/2');
			await page.getByRole('button', { name: /^Từ chối$/ }).click();
			const m = page.locator('.ant-modal-wrap:visible').filter({ hasText: 'Từ chối phiếu đề xuất' }).last();
			await m.getByPlaceholder('Nhập lý do từ chối...').fill('AUTO TEST 13_1 tu choi han muc');
			expect(await dx.thongBaoQuanh(page, () => m.getByRole('button', { name: 'Xác nhận từ chối' }).click())).toContain('Đã từ chối phiếu');
			await page.reload();
			const tx = await tienTrinh(page).catch(() => dx.chuan(page.locator('.ant-pro-page-container').innerText()));
			test.info().annotations.push({ type: 'đo', description: `xã sau từ chối: ${tx}` });
			// QC: "ở role giám đốc xã là 1/2" — tiến trình dừng ở bước 1 trên tổng 2 bước.
			expect(tx, 'Tiến trình sau từ chối không còn tổng 2 bước').toMatch(/\/2\b/);
			expect(tx).toMatch(/Từ chối/);
			const p = await k.moPhienPhu(browser, 'province_manager', '/inventory/purchase-request');
			try {
				const thay = await tinhThay(p.page, ma, 'province_manager');
				test.info().annotations.push({ type: 'đo', description: `tỉnh: ${thay}` });
				expect(thay, 'Xã từ chối bước 1 mà phiếu vẫn lên cấp tỉnh').toBeNull();
			} finally { await p.dong(); }
		});
	});
});
