'use strict';

/**
 * 24_040_* · Phiếu thu tiền khách trả từ trang chi tiết nhân viên (thẻ "Công nợ nhân viên") — vai `shop`.
 * Trace `pages/employee/employeeDebt/DrawerPaymentEmployeeDebt.jsx`: tổng rỗng/0 ⇒ `message.warning("Số tiền phải lớn hơn 0")`;
 * ô "Số tiền thanh toán" từng dòng có max = `totalDebt` (cột Còn nợ); Lưu ⇒ `POST /shops/{id}/customer/create-debt` type PAYMENT,
 * toast "Thêm thành công". 🔴 040_003 GHI THẬT (thu đủ 1 phiếu nợ của khách rác) — quyền CREATE_CUSTOMER_DEBT không gán
 * SHOP_MANAGER (xem 19_090_001) ⇒ dự kiến 401.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chuan, dong, moMan } = require('./debt-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const soTien = (s) => Number(chuan(s).replace(/[^\d]/g, '') || 0);

async function moPhieuThu(page) {
	await moMan(page, 'shop');
	test.skip((await dong(page).count()) === 0, 'Không có nhân viên nào có công nợ theo đơn hàng.');
	await dong(page).first().getByText('Chi tiết').click();
	await expect(page).toHaveURL(/\/employee\/detail\//, { timeout: 20_000 });
	await page.waitForTimeout(2_000);
	const cho = page.waitForResponse((r) => /employee\/get-debt-detail/.test(r.url()), { timeout: 20_000 }).catch(() => null);
	await page.locator('.ant-tabs-tab', { hasText: 'Công nợ nhân viên' }).first().locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await cho;
	await page.waitForTimeout(2_000);
	const hang = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: 'Còn nợ' });
	test.skip((await hang.count()) === 0, 'Nhân viên không có phiếu khách còn nợ.');
	const td = (await hang.first().locator('td').allInnerTexts()).map(chuan);
	const conNo = soTien(td[td.length - 3]);
	await hang.first().getByRole('button', { name: 'Thanh toán' }).click();
	const dr = page.locator('.ant-drawer-open').last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(1_500);
	return { dr, conNo, ma: td[2] };
}

test('24_040_001 — Chặn lưu phiếu thu khi chưa nhập số tiền', async ({ page }) => {
	chanNeuTat('24_040_001');
	const ghi = [];
	page.on('request', (r) => { if (/customer\/create-debt/.test(r.url())) ghi.push(r.url()); });
	const { dr } = await moPhieuThu(page);
	const o = dr.getByPlaceholder('Số tiền thanh toán');
	await o.fill('');
	for (const x of await dr.locator('.ant-table-tbody input').all()) await x.fill('0').catch(() => null);
	await dr.getByRole('button', { name: 'Lưu', exact: true }).click();
	await page.waitForTimeout(1_500);
	const tb = chuan((await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts()).join(' | '));
	ghiChu('thông báo', tb);
	expect(tb).toContain('Số tiền phải lớn hơn 0');
	expect(ghi, 'Chưa nhập tiền mà vẫn gửi request').toEqual([]);
});

test('24_040_002 — Số tiền thu từng phiếu không vượt quá Còn nợ', async ({ page }) => {
	chanNeuTat('24_040_002');
	const { dr, conNo, ma } = await moPhieuThu(page);
	const dongPhieu = dr.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ma }).first();
	const o = dongPhieu.locator('input').last();
	await o.fill(String(conNo + 100_000));
	await o.press('Tab');
	await page.waitForTimeout(800);
	const v = soTien(await o.inputValue());
	ghiChu('kẹp', `còn nợ ${conNo} · gõ ${conNo + 100_000} ⇒ ${v}`);
	expect(v, 'Ô số tiền dòng nhận số vượt Còn nợ').toBe(conNo);
	await dr.getByRole('button', { name: /Hủy|Huỷ/ }).first().click();
});

test('24_040_003 — Ghi nhận tiền khách trả và cập nhật trạng thái phiếu', async ({ page }) => {
	chanNeuTat('24_040_003');
	const { dr, conNo, ma } = await moPhieuThu(page);
	const dongPhieu = dr.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ma }).first();
	if (!(await dongPhieu.locator('.ant-checkbox-checked').count())) await dongPhieu.locator('.ant-checkbox').first().click().catch(() => null);
	await dongPhieu.locator('input').last().fill(String(conNo));
	const nv = dr.locator('.ant-form-item').filter({ hasText: 'Nhân viên tạo phiếu' }).locator('.ant-select').first();
	if (!/\S/.test(chuan(await nv.locator('.ant-select-selection-item').innerText().catch(() => '')))) {
		await nv.click();
		const opt = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
		await opt.first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => null);
		expect(await opt.count(), 'Ô "Nhân viên tạo phiếu" (bắt buộc) không có lựa chọn nào — không lưu được phiếu thu').toBeGreaterThan(0);
		await opt.first().click();
	}
	const cho = page.waitForResponse((r) => /customer\/create-debt/.test(r.url()), { timeout: 30_000 });
	await dr.getByRole('button', { name: 'Lưu', exact: true }).click();
	const r = await cho;
	const b = await r.json().catch(() => ({}));
	ghiChu('BE', `${r.status()} ${JSON.stringify(b?.status)} · payload ${JSON.stringify(r.request().postDataJSON()).slice(0, 300)}`);
	expect(String(b?.status?.code), `Ghi phiếu thu lỗi (quyền CREATE_CUSTOMER_DEBT không gán SHOP_MANAGER?): ${JSON.stringify(b?.status)}`).toBe('200');
	const tb = chuan((await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts()).join(' | '));
	expect(tb).toContain('Thêm thành công');
	await page.waitForTimeout(3_000);
	await expect(page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ma }).first(), `Phiếu ${ma} chưa chuyển "Đã thanh toán"`).toContainText('Đã thanh toán', { timeout: 15_000 });
});
