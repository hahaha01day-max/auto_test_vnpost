'use strict';

/**
 * 18_1 nhóm 040 — modal "Chọn sản phẩm": lô / serial / giảm giá (vai `gdv`).
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): `AddOrEditProductModal.jsx` — bảng thông tin (Tên sản phẩm ·
 * Đơn vị · Tồn kho · Số lượng · công tắc "Chọn theo lô" (ẨN khi mặt hàng không có lô còn tồn, dòng 313) ·
 * VAT · Giá bán gồm VAT · Giảm giá (%) · Ghi chú), bảng lô (Mã lô · Tồn kho · SL chọn · Xóa), ô "+ Thêm lô",
 * "Đã phân bổ: x/y", "Đã chọn tất cả lô", thông báo "Tổng số lượng lô lớn hơn số lượng sản phẩm. Vui lòng
 * kiểm tra lại." / "Số lượng sản phẩm phải lớn hơn hoặc bằng số mã serial"; nút "Cập nhật".
 *
 * Dữ liệu (đo 25/09): TC có lô tồn đầu kỳ (bật được "Chọn theo lô"); FIFO còn tồn nhưng KHÔNG hiện
 * công tắc lô; DD quản lý serial.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('./pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, dongBill, sp } = p;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const roi = (page) => page.mouse.move(600, 700);
const hop = (page) => page.getByRole('dialog').filter({ hasText: 'Chọn sản phẩm' }).last();
const dong = (page, ten) => dongBill(page).filter({ hasText: ten }).first();
const hang = (m, nhan) => m.locator('tr').filter({ has: m.page().locator(`td:text-is("${nhan}")`) }).first();

async function moChon(page, ten) {
	await roi(page);
	await dong(page, ten).getByText(ten, { exact: true }).click();
	await expect(hop(page)).toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(1_000);
	return hop(page);
}

async function datSlModal(m, v) {
	const o = hang(m, 'Số lượng').locator('input').first();
	await o.fill(String(v));
	await o.blur();
	await m.page().waitForTimeout(500);
}

async function batLo(m) {
	const sw = hang(m, 'Chọn theo lô').getByRole('switch');
	await expect(sw, 'Không có công tắc "Chọn theo lô"').toBeVisible();
	if ((await sw.getAttribute('aria-checked')) !== 'true') await sw.click();
	await m.page().waitForTimeout(1_500);
}

/** Dòng lô = dòng có nút "Xóa" (bảng lô lồng trong bảng thông tin của modal). */
const dongLo = (m) => m.locator('tr:not(:has(tr))').filter({ has: m.page().getByRole('button', { name: 'Xóa', exact: true }) });

async function tbSau(page, fn, cho = 5_000) {
	await fn();
	const n = page.locator('.ant-message-notice');
	await n.first().waitFor({ state: 'visible', timeout: cho }).catch(() => null);
	return chuan((await n.allInnerTexts()).join(' | '));
}

/** Số lô còn tồn (dòng trong bảng + lựa chọn trong "+ Thêm lô"). */
async function soLo(page, m) {
	const o = m.locator('.ant-select').filter({ hasText: '+ Thêm lô' });
	let them = 0;
	if (await o.count()) {
		await o.click();
		them = await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').count();
		await page.keyboard.press('Escape');
	}
	return (await dongLo(m).count()) + them;
}

test.describe('18_1 — Chọn lô / serial', () => {
	test.describe.configure({ timeout: 180_000 });

	test.beforeEach(async ({ page }) => {
		await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		const cb = page.getByRole('checkbox', { name: 'Tự động mở chọn lô' });
		if (await cb.isChecked().catch(() => false)) await cb.uncheck().catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_1_040_001 — Bật Tự động mở chọn lô', async ({ page }) => {
		chanNeuTat('18_1_040_001');
		await page.getByRole('checkbox', { name: 'Tự động mở chọn lô' }).check();
		await p.oTim(page).fill(sp().tc);
		const dd = page.locator('.order-search-product:not(.ant-select-dropdown-hidden)').last();
		await dd.locator('.ant-select-item-option').filter({ hasText: sp().tc }).first().click();
		await expect(hop(page), 'Thêm hàng có lô mà không tự mở "Chọn sản phẩm"').toBeVisible({ timeout: 15_000 });
	});

	test('18_1_040_002 — Màn Chọn sản phẩm có đủ trường', async ({ page }) => {
		chanNeuTat('18_1_040_002');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		for (const n of ['Tên sản phẩm', 'Đơn vị', 'Tồn kho', 'Số lượng', 'Chọn theo lô']) await expect(hang(m, n), `Thiếu "${n}"`).toBeVisible();
		await batLo(m);
		const t = chuan(await m.innerText());
		for (const n of ['Mã lô', 'Tồn kho', 'SL chọn', 'Xóa', 'Đã phân bổ']) expect(t, `Thiếu "${n}"`).toContain(n);
		expect(t, 'Thiếu "+ Thêm lô" (hoặc thông báo hết lô)').toMatch(/\+ Thêm lô|Đã chọn tất cả lô/);
		await expect(m.getByRole('button', { name: 'Cập nhật' })).toBeVisible();
	});

	test('18_1_040_003 — Hết lô thì bảng lô hiện Không có lô nào', async ({ page }) => {
		chanNeuTat('18_1_040_003');
		// FIFO: còn tồn nhưng không còn lô ⇒ đo được "Chọn theo lô" có hiện không.
		await p.them(page, sp().fifo);
		const m = await moChon(page, sp().fifo);
		const coSw = await hang(m, 'Chọn theo lô').count();
		test.info().annotations.push({ type: 'hành vi thật', description: `FIFO: công tắc "Chọn theo lô" ${coSw ? 'có' : 'KHÔNG'} hiện` });
		if (coSw) await batLo(m);
		await expect(m.getByText('Không có lô nào'), 'Mặt hàng hết lô mà không hiện "Không có lô nào" (công tắc lô bị ẩn hẳn)').toBeVisible();
	});

	test('18_1_040_004 — Đổi đơn vị thì tồn kho và giá bán tính lại', async ({ page }) => {
		chanNeuTat('18_1_040_004');
		await p.oTim(page).fill(sp().bt);
		const dd = page.locator('.order-search-product:not(.ant-select-dropdown-hidden)').last();
		await dd.locator('.ant-select-item-option').filter({ hasText: 'Đỏ - Cái' }).first().click();
		const m = await moChon(page, sp().bt);
		const truoc = { ton: chuan(await hang(m, 'Tồn kho').innerText()), gia: chuan(await hang(m, 'Giá bán gồm VAT').innerText()) };
		await hang(m, 'Đơn vị').locator('.ant-select').click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: 'Hộp' }).first().click();
		await page.waitForTimeout(1_000);
		const sau = { ton: chuan(await hang(m, 'Tồn kho').innerText()), gia: chuan(await hang(m, 'Giá bán gồm VAT').innerText()) };
		test.info().annotations.push({ type: 'đo', description: `${JSON.stringify(truoc)} → ${JSON.stringify(sau)}` });
		expect(sau.ton).toContain('Hộp');
		expect(sau.ton).not.toBe(truoc.ton);
		expect(sau.gia).not.toBe(truoc.gia);
	});

	test('18_1_040_005 — Phân bổ đủ số lượng qua nhiều lô', async ({ page }) => {
		chanNeuTat('18_1_040_005');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		await batLo(m);
		const n = await soLo(page, m);
		test.skip(n < 2, `TC ở điểm bán seed chỉ có ${n} lô còn tồn — cần ≥ 2 lô.`);
		// Lô thứ 2 có thể chỉ còn ít (đo 25/09: 5) ⇒ phân bổ 1 + 5 = 6.
		await datSlModal(m, 6);
		await dongLo(m).first().locator('input').fill('1');
		await m.locator('.ant-select').filter({ hasText: '+ Thêm lô' }).click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
		await dongLo(m).nth(1).locator('input').fill('5');
		await page.keyboard.press('Tab');
		await expect(m.getByText(/Đã phân bổ: 6(\.0+)?\/6/)).toBeVisible();
		await m.getByRole('button', { name: 'Cập nhật' }).click();
		await expect(m).toBeHidden({ timeout: 10_000 });
	});

	test('18_1_040_006 — Phân bổ vượt số lượng bán bị chặn', async ({ page }) => {
		chanNeuTat('18_1_040_006');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		await datSlModal(m, 2);
		await batLo(m);
		await dongLo(m).first().locator('input').fill('5');
		await dongLo(m).first().locator('input').blur();
		test.info().annotations.push({ type: 'ô SL lô sau khi gõ 5 (SL bán 2)', description: await dongLo(m).first().locator('input').inputValue() });
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Cập nhật' }).click());
		expect(tb).toContain('Tổng số lượng lô lớn hơn số lượng sản phẩm. Vui lòng kiểm tra lại');
		await expect(m).toBeVisible();
	});

	test('18_1_040_007 — Phân bổ THIẾU so với số lượng bán bị chặn', async ({ page }) => {
		chanNeuTat('18_1_040_007');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		await datSlModal(m, 5);
		await batLo(m);
		await dongLo(m).first().locator('input').fill('3');
		await m.page().waitForTimeout(500);
		await expect(m.getByText(/Đã phân bổ: 3\/5/)).toBeVisible();
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Cập nhật' }).click());
		test.info().annotations.push({ type: 'thông báo thật', description: tb || '(không thông báo)' });
		await expect(m, '🔴 Phân bổ thiếu 3/5 vẫn Cập nhật được').toBeVisible();
	});

	test('18_1_040_008 — Bỏ trống Số lượng thì tự phân bổ TOÀN BỘ tồn kho', async ({ page }) => {
		chanNeuTat('18_1_040_008');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		await hang(m, 'Số lượng').locator('input').first().fill('');
		await batLo(m);
		const t = chuan(await m.innerText());
		test.info().annotations.push({ type: 'hành vi thật', description: t.slice(0, 400) });
		expect(t).toContain('Đã chọn tất cả lô');
	});

	test('18_1_040_009 — Số lượng phải lớn hơn 0', async ({ page }) => {
		chanNeuTat('18_1_040_009');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		await datSlModal(m, 0);
		const hien = await hang(m, 'Số lượng').locator('input').first().inputValue();
		const tb = await tbSau(page, () => m.getByRole('button', { name: 'Cập nhật' }).click());
		test.info().annotations.push({ type: 'hành vi thật', description: `ô "${hien}" · "${tb}"` });
		const vanMo = await m.isVisible();
		const sl = vanMo ? null : await dong(page, sp().tc).locator('input').first().inputValue();
		expect(vanMo || Number(sl) > 0, `SL 0 được cập nhật vào đơn (dòng SL ${sl})`).toBe(true);
	});

	test('18_1_040_010 — Hàng cân nhận số lượng lẻ', async ({ page }) => {
		chanNeuTat('18_1_040_010');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		await datSlModal(m, '1.5');
		expect(await hang(m, 'Số lượng').locator('input').first().inputValue()).toMatch(/^1[.,]50?$/);
	});

	test('18_1_040_011 — Giảm giá (%) chỉ nhận 0 đến 100', async ({ page }) => {
		chanNeuTat('18_1_040_011');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		let o = hang(m, 'Giảm giá (%)').locator('input').first();
		if (await o.isDisabled()) {
			// CTKM "giảm … đơn" của chuỗi tự áp khoá ô giảm giá dòng ⇒ bỏ CTKM rồi mở lại.
			await m.getByRole('button', { name: 'Đóng' }).click();
			const km = page.locator('.ant-checkbox-wrapper').filter({ hasText: /giảm .* đơn/i }).first();
			if (await km.locator('input').isChecked().catch(() => false)) await km.click();
			await page.waitForTimeout(1_000);
			await moChon(page, sp().tc);
			o = hang(hop(page), 'Giảm giá (%)').locator('input').first();
		}
		await expect(o, 'Ô Giảm giá (%) vẫn bị khoá sau khi bỏ CTKM đơn').toBeEnabled();
		const kq = {};
		for (const v of ['0', '50', '100', '-1', '101']) {
			await o.fill(v);
			await o.blur();
			await page.waitForTimeout(400);
			kq[v] = { o: await o.inputValue(), sau: chuan(await hang(m, 'Giá bán sau giảm (gồm VAT)').innerText()) };
		}
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
		expect(kq['50'].sau).toContain('50.000');
		expect(kq['100'].sau).toMatch(/\b0 đ/);
		expect(Number(String(kq['-1'].o).replace(/[^\d.-]/g, '')), '-1 được nhận').toBeGreaterThanOrEqual(0);
		expect(Number(String(kq['101'].o).replace(/[^\d.-]/g, '')), '101 được nhận').toBeLessThanOrEqual(100);
	});

	test('18_1_040_012 — Xoá một lô khỏi bảng phân bổ', async ({ page }) => {
		chanNeuTat('18_1_040_012');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		await batLo(m);
		const n = await soLo(page, m);
		test.skip(n < 2, `TC ở điểm bán seed chỉ có ${n} lô còn tồn — cần 2 lô để xoá 1.`);
		await datSlModal(m, 2);
		await m.locator('.ant-select').filter({ hasText: '+ Thêm lô' }).click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
		await expect(dongLo(m)).toHaveCount(2);
		await dongLo(m).nth(1).getByRole('button', { name: 'Xóa' }).click();
		await expect(dongLo(m)).toHaveCount(1);
	});

	test('18_1_040_013 — Ô + Thêm lô chỉ hiện khi còn lô chưa dùng', async ({ page }) => {
		chanNeuTat('18_1_040_013');
		await p.them(page, sp().tc);
		const m = await moChon(page, sp().tc);
		await batLo(m);
		const them = m.locator('.ant-select').filter({ hasText: '+ Thêm lô' });
		for (let i = 0; i < 10 && (await them.count()); i += 1) {
			await them.click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
			await page.waitForTimeout(400);
		}
		await expect(them, 'Đã thêm hết lô mà "+ Thêm lô" vẫn hiện').toHaveCount(0);
	});

	test('18_1_040_014 — Hàng quản lý serial BẮT BUỘC chọn serial', async ({ page }) => {
		chanNeuTat('18_1_040_014');
		await p.oTim(page).fill(sp().dd);
		const dd = page.locator('.order-search-product:not(.ant-select-dropdown-hidden)').last();
		await dd.locator('.ant-select-item-option').filter({ hasText: sp().dd }).first().click();
		const m = page.getByRole('dialog').last();
		await expect(m, 'Thêm hàng serial mà không mở màn chọn serial').toBeVisible({ timeout: 15_000 });
		const t = chuan(await m.innerText());
		test.info().annotations.push({ type: 'màn serial', description: t.slice(0, 300) });
		expect(t).toMatch(/Serial/i);
		await page.keyboard.press('Escape');
		await page.waitForTimeout(800);
		await expect(dongBill(page).filter({ hasText: sp().dd }), '🔴 Bỏ qua chọn serial mà hàng vẫn vào giỏ').toHaveCount(0);
	});

	test('18_1_040_015 — Số lượng bán phải ≥ số serial đã chọn', async ({ page }) => {
		chanNeuTat('18_1_040_015');
		// Tiền đề 26/09: điểm bán làn có serial SP đích danh (nhập bằng `14_1/tests/return-page.js › nhapHangSerial`).
		await p.oTim(page).fill(sp().dd);
		const dd = page.locator('.order-search-product:not(.ant-select-dropdown-hidden)').last();
		await dd.locator('.ant-select-item-option').filter({ hasText: sp().dd }).first().click();
		const m = page.getByRole('dialog').last();
		await expect(m, 'Thêm hàng serial mà không mở màn chọn').toBeVisible({ timeout: 15_000 });
		await page.waitForTimeout(1_000);
		await datSlModal(m, 5);
		const oSerial = m.locator('.ant-select-multiple').first(); // 🔴 chọn xong mất placeholder "Chọn Serial" ⇒ không lọc theo chữ
		await oSerial.click();
		const ds = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
		await expect(ds.first(), 'Không có serial nào còn tồn để chọn').toBeVisible({ timeout: 15_000 });
		const co = await ds.count();
		test.skip(co < 5, `Điểm bán chỉ còn ${co} serial — cần ≥ 5 (chạy nhapHangSerial)`);
		for (let i = 0; i < 5; i += 1) await ds.nth(i).click();
		await page.keyboard.press('Escape');
		const daChon = await oSerial.locator('.ant-select-selection-item').count();
		expect(daChon, 'Không chọn được 5 serial').toBe(5);
		const tb = await tbSau(page, () => datSlModal(m, 3));
		const sl = await hang(m, 'Số lượng').locator('input').first().inputValue();
		test.info().annotations.push({ type: 'đo', description: `chọn ${daChon} serial · sửa SL 5 → 3 ⇒ "${tb}" · ô SL còn ${sl}` });
		expect(tb).toContain('Số lượng sản phẩm phải lớn hơn hoặc bằng số mã serial');
		expect(Number(sl), 'Ô số lượng nhận 3 < số serial đã chọn').toBeGreaterThanOrEqual(5);
		await page.keyboard.press('Escape').catch(() => null);
	});

	test('18_1_040_018 — Đóng màn Chọn sản phẩm giữa chừng', async ({ page }) => {
		chanNeuTat('18_1_040_018');
		await p.them(page, sp().tc);
		const truoc = chuan(await dong(page, sp().tc).innerText());
		const m = await moChon(page, sp().tc);
		await datSlModal(m, 7);
		await batLo(m);
		await m.getByRole('button', { name: 'Đóng' }).click();
		await expect(m).toBeHidden();
		expect(chuan(await dong(page, sp().tc).innerText())).toBe(truoc);
	});
});
