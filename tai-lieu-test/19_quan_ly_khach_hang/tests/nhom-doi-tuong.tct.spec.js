'use strict';

/**
 * 19_130_001 · Tạo nhóm đối tượng khách hàng theo điều kiện qua giao diện — vai `tct`.
 * 🔴 Kịch bản ghi vai shop, nhưng quyền `customer-group/create` chỉ gán CORP_ADMIN · CORP_FINANCE · TEST_ROLE (CHT không có nút).
 * 🔴 GHI THẬT: nhóm rác `A<làn>KH19_NHOM_130_001_*` với điều kiện KHÔNG ai đạt (Tổng tiền hàng đã mua ≥ 999.999.999.999),
 *    xoá ở `finally`. Nhóm theo điều kiện áp toàn chuỗi ⇒ 🚫 đổi điều kiện sang ngưỡng thấp.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { chuan } = require('./customer-page');
const g = require('./khach-ghi');
const n = require('./nhom-ghi');

const GOC = path.join(__dirname, '..');
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

test('19_130_001 — Tạo nhóm đối tượng khách hàng theo điều kiện', async ({ page }) => {
	const i = loadCaseInput(GOC, '19_130_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	const st = g.k.batHeader(page);
	await moTrang(page, '/promotion/customer-group', 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const ten = `${g.TIEN_TO}_NHOM_130_001_${Date.now().toString().slice(-6)}`;
	let groupId = null;
	try {
		const nut = page.getByRole('button', { name: /Thêm nhóm đối tượng/ });
		await expect(nut, 'Vai tct không có nút "Thêm nhóm đối tượng" (quyền create_object_campaign)').toBeVisible({ timeout: 30_000 });
		await nut.click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm nhóm đối tượng khách hàng áp dụng' }).last();
		await expect(dr).toBeVisible({ timeout: 15_000 });
		await dr.getByPlaceholder('Nhập tên nhóm đối tượng khách hàng').fill(ten);
		await dr.getByPlaceholder('Nhập ghi chú').fill('AUTO TEST KHONG DUNG — nhóm rác, xoá sau case');
		await dr.getByText('Nhóm khách hàng', { exact: true }).click();
		if (!(await dr.locator('.ant-select').filter({ hasText: 'Chọn điều kiện' }).count())) {
			await dr.getByRole('button', { name: /Thêm điều kiện/ }).click();
		}
		const chon = async (placeholder, nhan) => {
			await dr.locator('.ant-select').filter({ hasText: placeholder }).first().click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: nhan }).first().click();
			await page.waitForTimeout(500);
		};
		await chon('Chọn điều kiện', /^Tổng tiền hàng đã mua$/);
		await chon('Chọn toán tử', '>=');
		await dr.getByPlaceholder('Nhập giá trị').first().fill('999999999999');
		const cho = page.waitForResponse((r) => /customer-group\/create/.test(r.url()), { timeout: 30_000 });
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		const r = await cho;
		const b = await r.json().catch(() => ({}));
		ghiChu('payload', JSON.stringify(r.request().postDataJSON()));
		ghiChu('BE', JSON.stringify(b?.status));
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		groupId = (await n.timNhom(page, st, ten))?.groupId;
		const tb = await g.thongBao(page);
		ghiChu('nguyên văn', tb);
		expect(groupId, 'Nhóm vừa tạo không có trong danh sách').toBeTruthy();
		await expect(page.locator('.ant-pro-page-container .ant-table-tbody tr', { hasText: ten }).first(), 'Danh sách chưa hiện nhóm vừa tạo').toBeVisible({ timeout: 15_000 });
		expect(tb, 'Câu thông báo khác kịch bản').toContain('Tạo nhóm đối tượng thành công');
	} finally {
		groupId ??= (await n.timNhom(page, st, ten).catch(() => null))?.groupId;
		if (groupId) ghiChu('xoá nhóm rác', `${groupId} → ${JSON.stringify((await n.xoaNhomApi(page, st, groupId))?.status)}`);
		void chuan;
	}
});
