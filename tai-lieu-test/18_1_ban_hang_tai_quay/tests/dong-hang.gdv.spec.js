'use strict';

/**
 * 18_1 nhóm 050 — sửa dòng hàng trong giỏ (vai `gdv`).
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): `SelectedProductsTable_v2.jsx` (cột Giá bán `TableInputCurrency`
 * **readOnly** trên dòng — sửa giá phải mở "Chọn sản phẩm"; cột Số lượng `QuantityControl`
 * (commit khi blur/Enter); nút xoá dòng; "Xoá tất cả" → `modal.confirm` "Xác nhận xoá tất cả sản phẩm
 * trong đơn hàng này?") · `AddOrEditProductModal.jsx` (modal "Chọn sản phẩm", nút "Cập nhật") ·
 * phím Home / ↑↓ / + − (`CreateOrderPage.jsx:1380-1400`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('./pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, dongBill, sp, so } = p;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const oSl = (row) => row.locator('input').first();
const dong = (page, ten) => dongBill(page).filter({ hasText: ten }).first();
/** Cột "Tổng tiền" của dòng (ô thứ 6). */
const tienDong = async (row) => so(await row.locator('td').nth(5).innerText());

async function datSl(page, row, v) {
	const o = oSl(row);
	await o.click();
	await o.fill(String(v));
	await o.press('Enter');
	await page.mouse.move(600, 700);
	await page.waitForTimeout(800);
}

async function nghi(page) {
	await page.mouse.move(600, 700);
	await page.evaluate(() => document.activeElement?.blur?.());
	await page.locator('body').click({ position: { x: 600, y: 650 } });
}

/** Mở modal "Chọn sản phẩm" bằng cách bấm tên hàng trên dòng. */
async function moChon(page, ten) {
	await dong(page, ten).getByText(ten, { exact: true }).click();
	const m = page.getByRole('dialog').filter({ hasText: 'Chọn sản phẩm' }).last();
	await expect(m).toBeVisible({ timeout: 15_000 });
	return m;
}

test.describe('18_1 — Sửa dòng hàng', () => {
	test.describe.configure({ timeout: 180_000 });

	test.beforeEach(async ({ page }) => {
		await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_1_050_001 — Sửa số lượng ngay trên dòng hàng', async ({ page }) => {
		chanNeuTat('18_1_050_001');
		await p.them(page, sp().tc);
		const row = dong(page, sp().tc);
		await datSl(page, row, 3);
		expect(await tienDong(row)).toBe(300000);
		expect((await p.tongKet(page)).truocVat).toBe(300000);
	});

	test('18_1_050_002 — Cột Đơn vị trên bảng hàng chỉ để xem', async ({ page }) => {
		chanNeuTat('18_1_050_002');
		await p.them(page, sp().tc);
		const o = dong(page, sp().tc).locator('td').nth(4);
		await expect(o.locator('input, .ant-select'), 'Cột Đơn vị có ô sửa trực tiếp').toHaveCount(0);
		const m = await moChon(page, sp().tc);
		await expect(m.getByText('Đơn vị', { exact: true }).first(), 'Modal "Chọn sản phẩm" không có ô Đơn vị').toBeVisible();
	});

	test('18_1_050_003 — Sửa giá bán của dòng hàng', async ({ page }) => {
		chanNeuTat('18_1_050_003');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		const txt = chuan(await m.innerText());
		test.info().annotations.push({ type: 'modal Chọn sản phẩm', description: txt.slice(0, 400) });
		const o = m.getByRole('spinbutton').filter({ hasNot: page.locator('[disabled]') });
		// Ô giá: ô số đầu tiên sau nhãn "Giá bán".
		const oGia = m.locator('tr, .ant-form-item, div').filter({ has: page.getByText(/^Giá bán/) }).locator('input').first();
		await expect(oGia, 'Modal không có ô Giá bán sửa được').toBeEditable({ timeout: 10_000 });
		await oGia.fill('90000');
		await m.getByRole('button', { name: 'Cập nhật' }).click();
		await expect(m).toBeHidden({ timeout: 10_000 });
		expect(await tienDong(dong(page, sp().tc))).toBe(90000);
		void o;
	});

	test('18_1_050_004 — Giá bán âm hoặc bằng 0', async ({ page }) => {
		chanNeuTat('18_1_050_004');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		// Modal "Chọn sản phẩm" hiện "Giá bán gồm VAT" dạng CHỮ (đo 25/09) — chỉ ô "Giảm giá (%)" sửa được.
		const txt = chuan(await m.innerText());
		const oGia = m.locator('tr').filter({ hasText: /^Giá bán gồm VAT/ }).locator('input:not([readonly])');
		test.info().annotations.push({ type: 'hành vi thật', description: `ô giá sửa được: ${await oGia.count()} · ${txt.slice(0, 200)}` });
		expect(await oGia.count(), 'Không có ô giá bán sửa được ⇒ giá âm/0 không nhập được').toBe(0);
		await m.getByRole('button', { name: 'Cập nhật' }).click();
		expect((await p.tongKet(page)).truocVat).toBeGreaterThan(0);
	});

	test('18_1_050_005 — Số lượng bằng 0 hoặc âm trên dòng hàng', async ({ page }) => {
		chanNeuTat('18_1_050_005');
		await p.them(page, sp().tc);
		const row = dong(page, sp().tc);
		await datSl(page, row, 0);
		const sau0 = (await dongBill(page).count()) ? await oSl(dong(page, sp().tc)).inputValue().catch(() => '(mất dòng)') : '(mất dòng)';
		await datSl(page, dong(page, sp().tc), -3).catch(() => null);
		const sauAm = (await dongBill(page).count()) ? await oSl(dong(page, sp().tc)).inputValue().catch(() => '(mất dòng)') : '(mất dòng)';
		const tong = (await p.tongKet(page)).truocVat;
		test.info().annotations.push({ type: 'hành vi thật', description: `SL 0 → "${sau0}" · SL -3 → "${sauAm}" · tổng ${tong}` });
		expect(tong, 'Tổng tiền âm').toBeGreaterThanOrEqual(0);
		expect(Number(sauAm) || 1, 'Số lượng âm được nhận').toBeGreaterThan(0);
	});

	test('18_1_050_006 — Số lượng rất lớn', async ({ page }) => {
		chanNeuTat('18_1_050_006');
		await p.them(page, sp().tc);
		await datSl(page, dong(page, sp().tc), 99999999);
		const t = chuan(await page.locator('body').innerText());
		expect(t, 'Khối tiền hiện NaN/Infinity').not.toMatch(/NaN|Infinity/);
		const tong = await p.tongKet(page);
		test.info().annotations.push({ type: 'hành vi thật', description: `SL ${await oSl(dong(page, sp().tc)).inputValue()} · ${JSON.stringify(tong)}` });
		expect(Number.isFinite(tong.truocVat)).toBe(true);
	});

	test('18_1_050_007 — Nhập chiết khấu, đổi VNĐ/% và ghi chú đơn', async ({ page }) => {
		chanNeuTat('18_1_050_007');
		await p.them(page, sp().tc);
		await page.getByPlaceholder('Nhập ghi chú').fill('Auto test ghi chú đơn');
		await expect(page.getByPlaceholder('Nhập ghi chú')).toHaveValue('Auto test ghi chú đơn');
		const nhan = page.getByText(/Chiết khấu đơn hàng/).first();
		await expect(nhan, 'Không có dòng Chiết khấu đơn hàng').toBeVisible();
		await nhan.click();
		const pop = page.locator('.ant-popover:visible, .ant-modal-wrap:visible').last();
		await expect(pop, 'Bấm "Chiết khấu đơn hàng" không mở ô nhập chiết khấu').toBeVisible({ timeout: 8_000 });
		const truoc = (await p.tongKet(page)).canThanhToan;
		const o = pop.locator('input').first();
		await o.fill('10000');
		await o.press('Enter');
		await page.waitForTimeout(1_000);
		const sauVnd = (await p.tongKet(page)).canThanhToan;
		const seg = pop.locator('.ant-segmented-item, .ant-radio-button-wrapper').filter({ hasText: '%' }).first();
		test.info().annotations.push({ type: 'đo', description: `Cần thanh toán ${truoc} → ${sauVnd} sau CK 10.000đ; ô %: ${await seg.count()}` });
		expect(sauVnd).toBeLessThan(truoc);
		expect(await seg.count(), 'Không có lựa chọn % cho chiết khấu').toBeGreaterThan(0);
	});

	test('18_1_050_008 — Xoá một dòng hàng khỏi đơn', async ({ page }) => {
		chanNeuTat('18_1_050_008');
		await p.them(page, sp().tc);
		await p.them(page, sp().fifo);
		const truoc = (await p.tongKet(page)).truocVat;
		await dong(page, sp().fifo).locator('td').last().locator('button, .anticon').first().click();
		await expect(dongBill(page).filter({ hasText: sp().fifo })).toHaveCount(0);
		await expect(dongBill(page)).toHaveCount(1);
		expect((await p.tongKet(page)).truocVat).toBe(truoc - 100000);
	});

	test('18_1_050_009 — Xoá tất cả sản phẩm trong đơn', async ({ page }) => {
		chanNeuTat('18_1_050_009');
		await p.them(page, sp().tc);
		await p.them(page, sp().fifo);
		await page.locator('thead').getByText('Xoá tất cả', { exact: true }).click();
		const hop = page.locator('.ant-modal-confirm').last();
		await expect(hop).toBeVisible();
		expect(chuan(await hop.innerText())).toContain('Xác nhận xoá tất cả sản phẩm trong đơn hàng này?');
		await hop.locator('.ant-btn-primary').click();
		await expect(dongBill(page)).toHaveCount(0);
	});

	test('18_1_050_010 — Từ chối hộp xác nhận Xoá tất cả', async ({ page }) => {
		chanNeuTat('18_1_050_010');
		await p.them(page, sp().tc);
		await p.them(page, sp().fifo);
		await page.locator('thead').getByText('Xoá tất cả', { exact: true }).click();
		const hop = page.locator('.ant-modal-confirm').last();
		await hop.locator('.ant-btn:not(.ant-btn-primary)').first().click();
		await expect(hop).toBeHidden();
		await expect(dongBill(page)).toHaveCount(2);
	});

	test('18_1_050_012 — Phím Home và mũi tên điều khiển dòng hàng', async ({ page }) => {
		chanNeuTat('18_1_050_012');
		await p.them(page, sp().tc);
		await p.them(page, sp().fifo);
		await p.them(page, `${sp().bt}`);
		await expect(dongBill(page)).toHaveCount(3);
		await nghi(page);
		await page.keyboard.press('Home');
		const idx = () => page.evaluate(() => {
			const rows = [...document.querySelectorAll('.ant-table-tbody tr.ant-table-row')];
			return rows.findIndex((r) => r.contains(document.activeElement));
		});
		await expect.poll(idx, { timeout: 5_000 }).toBe(0);
		await page.keyboard.press('ArrowDown');
		await expect.poll(idx).toBe(1);
		const row = dongBill(page).nth(1);
		const truoc = Number(await oSl(row).inputValue());
		await page.keyboard.press('+');
		await page.keyboard.press('+');
		await page.waitForTimeout(800);
		expect(Number(await oSl(row).inputValue())).toBe(truoc + 2);
		await page.keyboard.press('ArrowUp');
		await expect.poll(idx).toBe(0);
	});
});
