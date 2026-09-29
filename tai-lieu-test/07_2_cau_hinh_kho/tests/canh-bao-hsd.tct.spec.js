'use strict';

/**
 * 07_2 · 050_003 / 050_004 — Danh sách cấu hình cảnh báo hết hạn (`/settings?setting=expiryAlert`, `ExpiryAlertConfigTab.jsx`), vai `tct` (26/09/2026).
 * API: `GET/POST /expiry-alert-policies` (POST = upsert `{ name, orgProvinceCode | orgWardCode | shopId, items:[{targetType, sku, expiryAlertDays, active}] }`),
 * `PATCH|PUT /expiry-alert-policies/{id}`, `DELETE …/{id}`. Cột "Số ngày cảnh báo" là InputNumber sửa tại chỗ (Enter ⇒ blur ⇒ lưu),
 * cột "Kích hoạt" Switch `disabled={record.isDefault}`.
 * 050_004 GHI: cấu hình tạm CẤP CHUỖI (danh sách ở TCT chỉ trả cấu hình đúng phạm vi đang lọc — phạm vi điểm bán không hiện), SKU `AUTO<làn>SKUTD2` (SP tự doanh không giá, không case nào bán) — xoá ở finally.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

async function mo(page) {
	const st = k.batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=expiryAlert`, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	await page.waitForTimeout(2_500);
	return { st, goi: (m, u, q, b) => k.goiGhi(page, st, m, u, q, b) };
}

test.describe('07_2 · 050 — Danh sách cảnh báo hết hạn', () => {
	test('07_2_050_003 — Công tắc Kích hoạt bị vô hiệu với cấu hình mặc định của hệ thống', async ({ page }) => {
		chanNeuTat('07_2_050_003');
		const s = await mo(page);
		const all = ds((await s.goi('GET', '/expiry-alert-policies', { page: 0, size: 1000 }))?.data);
		const mac = all.filter((x) => x.isDefault);
		const dongMac = khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ has: page.locator('.ant-switch-disabled') });
		const soDongKhoa = await dongMac.count();
		test.info().annotations.push({ type: 'đo', description: `API: ${all.length} cấu hình, mặc định ${mac.length} ${JSON.stringify(mac.map((x) => ({ id: x.id, name: x.name, active: x.active })))} · dòng có Switch vô hiệu trên trang: ${soDongKhoa}` });
		expect(mac.length, 'Hệ thống không có cấu hình mặc định nào (isDefault) để kiểm').toBeGreaterThan(0);
		expect(soDongKhoa, 'Dòng cấu hình mặc định có công tắc Kích hoạt vẫn bật/tắt được').toBeGreaterThan(0);
		const sw = dongMac.first().locator('.ant-switch');
		const truoc = await sw.getAttribute('aria-checked');
		await sw.click({ force: true }).catch(() => null);
		await page.waitForTimeout(800);
		expect(await sw.getAttribute('aria-checked'), 'Bấm công tắc của cấu hình mặc định mà trạng thái đổi').toBe(truoc);
	});

	test('07_2_050_004 — Sửa nhanh số ngày cảnh báo ngay trên dòng', async ({ page }) => {
		chanNeuTat('07_2_050_004');
		const s = await mo(page);
		const td2 = seed.doc().duLieu.tuDoanhTinh.sanPham.TD2;
		const ten = `AUTO${process.env.VNPOST_LANE || ''}_HSD_${Date.now().toString().slice(-6)}`;
		const r = await s.goi('POST', '/expiry-alert-policies', {}, { name: ten, items: [{ targetType: 'SKU', sku: td2.sku, expiryAlertDays: 30, active: true }] });
		const tim = async () => ds((await s.goi('GET', '/expiry-alert-policies', { page: 0, size: 1000 }))?.data).filter((x) => x.name === ten || JSON.stringify(x).includes(ten));
		const tam = await tim();
		try {
			expect(tam.length, `Không tạo được cấu hình tạm: ${JSON.stringify(r?.status)}`).toBeGreaterThan(0);
			await page.reload();
			await page.waitForTimeout(3_000);
			const o = khung(page).getByPlaceholder(/Tìm/).first();
			if (await o.count()) { await o.fill(td2.sku); await o.press('Enter'); await page.waitForTimeout(2_000); }
			const dong = khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: td2.sku }).first();
			await expect(dong, `Không thấy dòng cấu hình của ${td2.sku}`).toBeVisible({ timeout: 20_000 });
			const so = dong.locator('.ant-input-number-input').first();
			const luu = page.waitForResponse((x) => /expiry-alert-policies\/\d+/.test(x.url()) && x.request().method() !== 'GET', { timeout: 15_000 }).catch(() => null);
			await so.fill('45');
			await so.press('Enter');
			const res = await luu;
			await page.reload();
			await page.waitForTimeout(3_000);
			if (await o.count()) { await o.fill(td2.sku); await o.press('Enter'); await page.waitForTimeout(2_000); }
			const sau = await khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: td2.sku }).first().locator('.ant-input-number-input').first().inputValue();
			const api = (await tim()).map((x) => x.expiryAlertDays ?? x.items?.[0]?.expiryAlertDays);
			test.info().annotations.push({ type: 'đo', description: `${ten}: lưu ${res ? `${res.request().method()} ${res.status()}` : 'không gửi'} · sau tải lại ô = ${sau} · API ${JSON.stringify(api)}` });
			expect(res, 'Sửa số ngày + Enter không gửi request lưu').toBeTruthy();
			expect(sau, 'Tải lại trang không giữ giá trị 45').toBe('45');
		} finally {
			for (const x of await tim()) await s.goi('DELETE', `/expiry-alert-policies/${x.id}`).catch(() => null);
		}
	});
});
