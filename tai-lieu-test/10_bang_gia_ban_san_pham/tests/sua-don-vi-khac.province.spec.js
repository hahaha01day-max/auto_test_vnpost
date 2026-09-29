'use strict';

/**
 * 10 · 030_002 — Vai tỉnh (`province`) KHÔNG sửa được bảng giá do đơn vị KHÁC (TCT) lập.
 * Dùng bảng giá seed `AUTO8_BANGGIA` (TCT tạo, áp cho điểm bán seed thuộc tỉnh này). Chỉ đọc —
 * 🚫 không bấm Lưu: sửa bảng giá seed là đưa nó về Chờ phê duyệt ⇒ POS mất giá bán.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const pp = require('./price-page');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');

test('10_030_002 — Không sửa được bảng giá của đơn vị khác', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '10_030_002'));
	test.skip(Boolean(ly), ly ?? '');
	const ten = seed.doc().duLieu.bangGiaBan.tenBangGia;
	await pp.chanGhi(page);
	await pp.moMan(page, 'province');
	await pp.taiLaiBoi(page, () => pp.oTim(page).fill(ten));
	const d = pp.dong(page).filter({ hasText: ten }).first();
	const thay = await d.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false);
	let coNut = 0;
	let tatNut = null;
	if (thay) {
		const nutSua = d.locator('button:has(.anticon-edit)');
		coNut = await nutSua.count();
		tatNut = coNut ? await nutSua.first().isDisabled() : null;
	}
	// Mở THẲNG URL sửa (không bấm Lưu): BE còn trả chi tiết + FE còn nút Lưu thì vẫn sửa được.
	const id = seed.doc().duLieu.bangGiaBan.priceListId;
	const cho = page.waitForResponse((r) => r.url().includes('/chain-price-list/detail'), { timeout: 30_000 }).catch(() => null);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/product/pricing/edit/${id}`, 'province');
	const res = await cho;
	const body = res ? await res.json().catch(() => null) : null;
	const nutLuu = await page.getByRole('button', { name: 'Lưu', exact: true }).count();
	const tenTrenForm = await page.getByPlaceholder('Nhập tên bảng giá').inputValue().catch(() => '');
	test.info().annotations.push({ type: 'đo', description: JSON.stringify({ thayTrongDanhSach: thay, coNutSua: coNut, disabled: tatNut, urlSua: { http: res?.status(), code: body?.status?.code, tenTrenForm, nutLuu } }) });
	expect(coNut === 0 || tatNut === true, '🔴 Vai tỉnh thấy (và bấm được) nút SỬA bảng giá do TCT lập').toBe(true);
	expect(tenTrenForm === ten && nutLuu > 0, '🔴 Vai tỉnh mở thẳng URL sửa vẫn nạp được bảng giá TCT và có nút Lưu').toBe(false);
});
