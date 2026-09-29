'use strict';

/**
 * 04_5 · 020_016 — Thêm kho cho tỉnh CHƯA có HUB, vai `province` của tỉnh seed `AUTO8_TINH`.
 *
 * Nguồn (vnpost-web af8cda07, `ShopInventoryPage.jsx`): cấp trên điểm bán chưa có HUB mặc định thì
 * màn `/inventory/warehouses` hiện "Chưa chọn đơn vị / điểm bán" + nút "Khởi tạo Hub" → drawer
 * "Khởi tạo Hub và kho hàng" (Tên Hub, Mã Hub, Email, Số điện thoại bắt buộc; Tỉnh/TP, Xã/Phường,
 * Địa chỉ) → `POST /shops/profile` với `shopType: "HUB"`, `orgProvinceCode` của tỉnh.
 *
 * 🔴 Tạo HUB là bản ghi KHÔNG XOÁ ĐƯỢC. Chỉ chạy khi tỉnh CHƯA có HUB (đúng tiền điều kiện kịch bản);
 *    đã có thì skip. HUB tạo ra được ghi vào sổ seed (`hubTinh`) — dùng cho nhóm 04_3 · 070.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');

test('04_5_020_016 — Thêm kho cho tỉnh CHƯA có HUB trực thuộc', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '04_5_020_016'));
	test.skip(Boolean(ly), ly ?? '');
	test.setTimeout(180_000);
	const d = seed.doc().duLieu;
	test.skip(Boolean(d.hubTinh?.shopId), `Tỉnh ${d.toChuc?.tenTinh} đã có HUB ${d.hubTinh?.tenShop} (sổ seed) — tiền điều kiện "chưa có HUB" không còn.`);
	const st = k.batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/warehouses`, 'province');
	const nut = page.getByRole('button', { name: /Khởi tạo Hub/ });
	const coNut = await nut.waitFor({ state: 'visible', timeout: 30_000 }).then(() => true, () => false);
	test.skip(!coNut, 'Màn không có nút "Khởi tạo Hub" — tỉnh đã có HUB mặc định.');
	await expect(page.locator('.ant-pro-page-container')).toContainText('Chưa chọn đơn vị / điểm bán');

	await nut.click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Khởi tạo Hub và kho hàng' }).last();
	await expect(dr).toBeVisible();
	const ten = `${seed.PREFIX}HUB`;
	const ma = `${d.toChuc.maTinh}_HUB`;
	await dr.locator('#shopName').fill(ten);
	await dr.locator('#shopCode').fill(ma);
	await dr.locator('#email').fill(`${ma.toLowerCase()}@auto.test`);
	await dr.locator('#shopPhone').fill(`09${seed.runId()}`.slice(0, 10));
	await dr.locator('#address').fill('AUTO TEST - khong su dung');
	const cho = page.waitForResponse((r) => r.url().includes('/shops/profile') && r.request().method() === 'POST', { timeout: 60_000 });
	await dr.getByRole('button', { name: 'Khởi tạo' }).click();
	const b = await (await cho).json();
	expect(String(b?.status?.code), `Khởi tạo Hub lỗi: ${b?.status?.message}`).toBe('200');
	await expect(page.locator('.ant-message-notice').filter({ hasText: 'Khởi tạo thành công' }).first()).toBeAttached();
	const hub = b.data || {};
	const shopId = hub.shopId || hub.id;
	expect(shopId, 'Tạo Hub không trả shopId').toBeTruthy();
	expect(hub.shopType, 'Kho mới không phải HUB').toBe('HUB');
	expect(hub.orgProvinceCode, 'HUB không trực thuộc đúng tỉnh').toBe(d.toChuc.maTinh);
	seed.ghi('hubTinh', { shopId, maShop: ma, tenShop: ten, tenTinh: d.toChuc.tenTinh });

	// Có kho tự sinh cho HUB.
	const kho = await k.goiGhi(page, { h: { ...st.h, shopid: String(shopId) } }, 'GET', `/shops/${shopId}/inventory`);
	test.info().annotations.push({ type: 'đo', description: `HUB ${shopId}: kho ${JSON.stringify((kho?.data || []).map((x) => [x.id, x.name, x.isDefault]))}` });
	expect((kho?.data || []).length, 'HUB tạo xong mà không có kho').toBeGreaterThan(0);
	seed.ghi('hubTinh', { inventoryId: (kho.data.find((x) => x.isDefault) || kho.data[0]).id });
});
