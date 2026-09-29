'use strict';

/**
 * 13_1 · 050 — hộp "Chọn Điểm bán / Kho" ở màn tạo phiếu đề xuất, vai `province`. Chỉ ĐỌC (không lưu phiếu).
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/purchaseOrder/pages/StockRequestFormPage.jsx` (ô `shopId`
 * dùng `SelectShopMultiple` `shopType="INVENTORY"`), `components/selectShopMultiple/SelectShopMultiple.jsx`.
 * Hộp 3 cột `.sp-column` (Tỉnh · Xã · Điểm bán/Kho), mỗi cột có ô "Tìm kiếm".
 * Đo 24/09: vai tỉnh vào là cột 1 đã chọn sẵn tỉnh của mình; cột 3 gọi `/shops/profile/chain?...&shopType=HUB`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const dx = require('./dx-ghi');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const TINH = () => process.env.VNPOST_SCOPE_LABEL_PROVINCE;
const XA = () => process.env.VNPOST_SCOPE_LABEL_WARD;

async function moHop(page) {
	await moTrang(page, `${dx.BASE()}/inventory/purchase-request/create`, 'province');
	await expect(page.locator('#code')).toHaveValue(/^DX/, { timeout: 30_000 });
	await page.locator('.ant-form-item').filter({ hasText: 'Điểm bán / Kho nhận hàng' }).locator('.ant-select').click();
	const hop = page.getByRole('dialog', { name: 'Chọn Điểm bán / Kho' });
	await expect(hop).toBeVisible({ timeout: 15_000 });
	await expect(hop.locator('.sp-column')).toHaveCount(3);
	return hop;
}
const cot = (hop, i) => hop.locator('.sp-column').nth(i);
const CHUA_TINH = 'Vui lòng chọn Tỉnh/Tổng công ty trước';
/** Mục tỉnh là nút bật/tắt (vai tỉnh vào là đã bật sẵn) ⇒ bấm tới khi cột Xã có dữ liệu. */
async function chonTinh(hop) {
	const c1 = cot(hop, 0);
	await c1.getByText(TINH(), { exact: true }).first().click();
	if (await cot(hop, 1).getByText(CHUA_TINH).isVisible().catch(() => false)) await c1.getByText(TINH(), { exact: true }).first().click();
	await expect(cot(hop, 1).getByText(XA(), { exact: true }).first(), 'Chọn tỉnh mà cột Xã không ra xã tương ứng').toBeVisible();
}

test.describe('13_1 · 050 chọn điểm bán / kho (tỉnh)', () => {
	test('13_1_050_001 — Kiểm tra hiển thị màn hình', async ({ page }) => {
		chanNeuTat('13_1_050_001');
		const hop = await moHop(page);
		const noi = dx.chuan(await hop.innerText());
		test.info().annotations.push({ type: 'đo', description: noi.slice(0, 600) });
		expect(noi).toMatch(/Đã chọn 0 điểm bán/);
		await hop.getByText('Xem danh sách').click();
		await expect(hop.getByText('Ẩn danh sách'), 'Nút Xem danh sách không đổi thành Ẩn danh sách').toBeVisible();
		await hop.getByText('Ẩn danh sách').click();
		await expect(hop.getByText('Xem danh sách')).toBeVisible();

		const c1 = cot(hop, 0);
		expect(dx.chuan(await c1.locator('.sp-column__title').innerText())).toMatch(/CẤP TỔNG CÔNG TY \/ CẤP TỈNH/i);
		await expect(c1.getByPlaceholder('Tìm kiếm')).toBeVisible();
		await expect(c1.getByText(TINH(), { exact: true }).first(), 'Cột 1 không có tỉnh của vai').toBeVisible();
		await expect(c1.getByText('▶').first(), 'Cột 1 thiếu mũi tên xuống cấp nhỏ').toBeVisible();

		const c2 = cot(hop, 1);
		expect(dx.chuan(await c2.locator('.sp-column__title').innerText())).toMatch(/CẤP XÃ/i);
		// Bỏ chọn tỉnh (đang bật sẵn) ⇒ đo trạng thái mặc định của cột 2, cột 3.
		await c1.getByText(TINH(), { exact: true }).first().click();
		await expect(c2.getByText(CHUA_TINH), `Chưa chọn tỉnh mà cột Xã không hiện "${CHUA_TINH}"`).toBeVisible();
		await expect(cot(hop, 2).getByText('Vui lòng chọn Xã / Phường trước')).toBeVisible();
		await chonTinh(hop);

		const c3 = cot(hop, 2);
		await c2.getByText(XA(), { exact: true }).first().click();
		await expect(c3.locator('.sp-column__title')).toContainText(XA());
		// QC: sau khi chọn Xã, cột 3 có thanh lọc Tất cả / Điểm bán / Kho và danh sách cửa hàng kèm radio.
		const loc = dx.chuan(await c3.innerText());
		test.info().annotations.push({ type: 'đo', description: `Cột 3 sau khi chọn xã: ${loc}` });
		for (const t of ['Tất cả', 'Điểm bán', 'Kho']) {
			expect.soft(c3.getByText(t, { exact: true }), `Cột 3 thiếu bộ lọc "${t}"`).toHaveCount(1);
		}
		expect.soft(await c3.locator('input[type=radio]').count(), `Cột 3 không có cửa hàng nào kèm radio (xã ${XA()} có điểm bán seed)`).toBeGreaterThan(0);

		for (const b of ['Đóng', 'Xác nhận']) await expect(hop.locator('button.ant-btn').filter({ hasText: new RegExp(`^${b}$`) })).toBeVisible();
	});

	test('13_1_050_002 — Kiểm tra Tìm kiếm Tỉnh, Xã, Kho/ Điểm bán', async ({ page }) => {
		chanNeuTat('13_1_050_002');
		const hop = await moHop(page);
		const c1 = cot(hop, 0);
		const c2 = cot(hop, 1);
		const c3 = cot(hop, 2);
		// Tỉnh
		await c1.getByPlaceholder('Tìm kiếm').fill(TINH().slice(-4));
		await expect(c1.getByText(TINH(), { exact: true }).first(), 'Tìm tỉnh theo một phần tên không ra').toBeVisible();
		await c1.getByPlaceholder('Tìm kiếm').fill('ZZ_KHONG_CO_TINH');
		await expect(c1.getByText(TINH(), { exact: true })).toHaveCount(0);
		await c1.getByPlaceholder('Tìm kiếm').fill('');
		// Xã
		await chonTinh(hop);
		await c2.getByPlaceholder('Tìm kiếm').fill(XA().slice(-3));
		await expect(c2.getByText(XA(), { exact: true }).first(), 'Tìm xã theo một phần tên không ra').toBeVisible();
		await c2.getByPlaceholder('Tìm kiếm').fill('ZZ_KHONG_CO_XA');
		await expect(c2.getByText(XA(), { exact: true })).toHaveCount(0);
		await c2.getByPlaceholder('Tìm kiếm').fill('');
		// Kho / điểm bán — cột 3 khi đang ở cấp tỉnh (kho tỉnh). Lấy tên mục đầu tiên có thật rồi tìm lại.
		await chonTinh(hop);
		const muc = c3.locator('.sp-column__list label, .sp-column__list [class*=item]').first();
		await expect(muc, 'Cột Điểm bán / Kho của tỉnh không có mục nào để tìm').toBeVisible({ timeout: 15_000 });
		const ten = dx.chuan(await muc.innerText()).split(' ')[0];
		await c3.getByPlaceholder('Tìm kiếm').fill(ten.slice(-3));
		await expect(c3.getByText(ten, { exact: true }).first(), `Tìm "${ten.slice(-3)}" ở cột Kho không ra ${ten}`).toBeVisible();
		await c3.getByPlaceholder('Tìm kiếm').fill('ZZ_KHONG_CO_KHO');
		await expect(c3.getByText(ten, { exact: true })).toHaveCount(0);
		test.info().annotations.push({ type: 'đo', description: `tỉnh ${TINH()} · xã ${XA()} · kho ${ten}` });
	});
});
