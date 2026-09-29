'use strict';

/**
 * 04_4 · 050_004 — Bộ lọc trạng thái ở màn Kiểm kho, vai `shop`, điểm bán seed của làn (chỉ đọc).
 *
 * Nguồn (vnpost-web af8cda07, `InventoryCheck.jsx`): ô "Trạng thái" có đúng 2 lựa chọn
 * `DRAFT` "Nháp" · `COMPLETED` "Đã áp dụng", gửi `status=` vào `GET /stock/v3/inventory-check/sessions`.
 * 🔴 Bảng ở cấp điểm bán lại là danh sách PHIÊN, nhãn trạng thái "Đang mở" (OPEN) · "Đã chốt"
 * (CLOSED) · "Đã hủy" (CANCELLED) — hai bộ trạng thái không cùng miền.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');

test('04_4_050_004 — Bộ lọc trạng thái phiếu kiểm kho', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '04_4_050_004'));
	test.skip(Boolean(ly), ly ?? '');
	test.setTimeout(180_000);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/inventory-check`, 'shop');
	const khung = page.locator('.ant-pro-page-container, main').first();
	await expect(khung.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 60_000 });
	// Sau khi chọn, ô hiện nhãn đã chọn thay vì placeholder ⇒ khớp cả ba chữ.
	const o = khung.locator('.ant-select').filter({ hasText: /Trạng thái|Nháp|Đã áp dụng/ }).first();
	await o.click();
	const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
	const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(k.chuan);
	expect(nhan, 'Danh sách trạng thái khác code').toEqual(['Nháp', 'Đã áp dụng']);
	await page.keyboard.press('Escape');
	await expect(dd).toBeHidden();
	const ketQua = {};
	// Nháp ↔ phiên "Đang mở"; Đã áp dụng ↔ phiên "Đã chốt" (phiên đã chốt là phiếu đã áp dụng).
	for (const [chon, tag] of [['Đã áp dụng', 'Đã chốt'], ['Nháp', 'Đang mở']]) {
		await o.click();
		// 🔴 Bấm option theo `title` trong dropdown ĐANG MỞ — dropdown vừa đóng vẫn còn trong DOM.
		const opt = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: chon }).last();
		await expect(opt).toBeVisible();
		const cho = page.waitForResponse((r) => r.url().includes('/inventory-check/sessions?'), { timeout: 15_000 }).catch(() => null);
		await opt.click();
		const res = await cho;
		const b = res ? await res.json() : null;
		await page.waitForTimeout(1_000);
		const tt = (await khung.locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map((t) => k.chuan(t));
		ketQua[chon] = { goiLai: Boolean(res), url: res?.url().split('?')[1] ?? null, tongApi: b?.page?.total_elements, dong: tt.length, sai: tt.filter((t) => !t.includes(tag)).length };
	}
	test.info().annotations.push({ type: 'đo', description: JSON.stringify(ketQua) });
	// Đã có phiên đã chốt trong kỳ (04_4_040_004 / 060_002 chốt) ⇒ lọc "Đã áp dụng" phải ra > 0 dòng, toàn "Đã chốt".
	expect(ketQua['Đã áp dụng'].goiLai, `Chọn trạng thái mà danh sách không tải lại: ${JSON.stringify(ketQua)}`).toBe(true);
	expect(ketQua['Đã áp dụng'].dong, `Lọc "Đã áp dụng" ra rỗng dù có phiên đã chốt: ${JSON.stringify(ketQua)}`).toBeGreaterThan(0);
	expect(ketQua['Đã áp dụng'].sai, 'Lọc "Đã áp dụng" còn phiên khác trạng thái').toBe(0);
	expect(ketQua['Nháp'].sai, 'Lọc "Nháp" còn phiên khác trạng thái').toBe(0);
});
