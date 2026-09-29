'use strict';

/**
 * 14_1 · nhóm SERIAL (vai `shop`): 010_012 · 010_015 · 010_026 · 010_027 · 010_033 · 010_040.
 * Tiền đề: mỗi test nhập một lô `AUTO<N>_SP_DD` (đích danh, quản lý serial) vào kho điểm bán seed bằng API
 * (`return-page.nhapHangSerial`). Nguồn (vnpost-web — xem fe-moc.json): `StockReturnRequestFormPage.jsx` (tab "Theo SKU / Mã lô /
 * Serial": ô "Quét/nhập serial…", "Serial này đã có trong danh sách", validate "quản lý serial: cần … đang chọn …",
 * hộp "Sản phẩm đã có trong danh sách (đang trả theo serial)"). 🔴 Quét serial gọi `resolve-serial` — 401 với Cửa hàng
 * trưởng (xem 14_1_010_013) ⇒ các case quét sẽ đỏ tới khi gán quyền.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const r = require('./return-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });

test.describe.configure({ timeout: 300_000 });
let box;
let st;
test.beforeEach(async ({ page }) => {
	st = r.k.batHeader(page);
	await r.moDanhSach(page, 'shop');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	r.datPhienChinh('shop', page, st);
});

async function moForm(page) {
	box = await r.moFormTao(page);
	await r.doiNguonSku(page, box);
	return box;
}

test('14_1_010_012 — Quét serial còn tồn thêm đúng dòng', async ({ page, browser }) => {
	chanNeuTat('14_1_010_012');
	const s = await r.nhapHangSerial(browser, { sl: 2 });
	await moForm(page);
	const tb = await r.traSerial(page, box, s.serials[0]);
	ghi(`quét ${s.serials[0]}: "${tb}"`);
	const d = r.hang(box).filter({ hasText: s.ten }).first();
	await expect(d, `Quét serial không thêm dòng (${tb})`).toBeVisible({ timeout: 10_000 });
	await expect(d.locator('.ant-input-number-input').first()).toHaveValue('1');
	await expect(d).toContainText(s.serials[0]);
});

test('14_1_010_015 — Quét trùng serial đã có trong danh sách', async ({ page, browser }) => {
	chanNeuTat('14_1_010_015');
	const s = await r.nhapHangSerial(browser, { sl: 2 });
	await moForm(page);
	await r.traSerial(page, box, s.serials[0]);
	await expect(r.hang(box), 'Quét serial lần đầu không thêm dòng').toHaveCount(1, { timeout: 10_000 });
	const tb = await r.traSerial(page, box, s.serials[0]);
	expect(tb).toContain('Serial này đã có trong danh sách');
	await expect(box.getByPlaceholder(r.O_SERIAL)).toHaveValue('');
	await expect(r.hang(box)).toHaveCount(1);
	await expect(r.hang(box).first().locator('.ant-input-number-input').first()).toHaveValue('1');
});

/** Thêm dòng DD qua ô SKU, đặt SL `sl`, chọn `n` serial trong ô "Chọn serial trả". */
async function dongSerial(page, s, sl, n) {
	await moForm(page);
	const d = await r.themSku(page, box, s.ten);
	// 🔴 `StockReturnRequestFormPage.jsx`: dòng hàng serial hiển thị SL = số serial đã chọn, KHÔNG có ô nhập SL.
	expect(await d.locator('.ant-input-number-input').count(), `🔴 Dòng hàng serial không cho nhập SL trả (SL tự = số serial) ⇒ không dựng được "SL ${sl} mà chọn ${n} serial"; cảnh báo lệch serial không tới được bằng UI`).toBeGreaterThan(0);
	await r.nhapSl(d, sl);
	const o = d.locator('.ant-select').filter({ hasText: /Chọn serial trả/ }).first();
	await o.click();
	for (const x of s.serials.slice(0, n)) {
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: x }).first().click();
	}
	await page.keyboard.press('Escape');
	await expect(d.locator('.ant-select-selection-item')).toHaveCount(n);
	await r.chonLyDo(page, box, 'Hàng bán chậm').catch(() => {});
	return d;
}

for (const [id, sl, n] of [['14_1_010_026', 3, 2], ['14_1_010_027', 2, 3]]) {
	test(`${id} — Số serial ${n} khác SL trả ${sl} bị chặn`, async ({ page, browser }) => {
		chanNeuTat(id);
		const s = await r.nhapHangSerial(browser, { sl: 4 });
		const ghiRq = r.ghiPhieuTra(page);
		await dongSerial(page, s, sl, n);
		const tb = await r.bam(page, 'Tạo phiếu (chờ duyệt)');
		expect(tb).toMatch(new RegExp(`Sản phẩm ".+" quản lý serial: cần ${sl} serial \\(theo .+\\), đang chọn ${n}`));
		expect(ghiRq, 'Lệch serial mà vẫn gửi request tạo phiếu').toEqual([]);
	});
}

test('14_1_010_033 — Trả một phần lô serial: lô giảm, serial đã trả không quét lại được', async ({ page, browser }) => {
	chanNeuTat('14_1_010_033');
	const s = await r.nhapHangSerial(browser, { sl: 6 });
	const shopId = r.seed.doc().duLieu.diemBan.shopId;
	const lo = (await r.loCon(page, st, shopId, s.productId, s.variantId)).find((l) => l.batchCode === s.lo);
	const it = {
		productId: s.productId, variantId: s.variantId, productName: s.ten, variantName: 'Mặc định', unitId: lo.productUnitId, unitName: lo.unit || 'Cái',
		convertToMainUnit: 1, quantity: 3, batchCode: s.lo, batchProductId: lo.batchProductId, sourceShopId: shopId, inventoryId: lo.inventoryId, serials: s.serials.slice(0, 3),
	};
	const p = await r.taoPhieuApi(page, st, { items: [it], note: 'AUTO TEST 14_1 010_033 serial' });
	await r.duyetDu(browser, 'ward', p.id);
	await r.duyetDu(browser, 'province', p.id);
	const sau = (await r.loCon(page, st, shopId, s.productId, s.variantId)).find((l) => l.batchCode === s.lo);
	expect(Number(sau?.remainQuantity), 'Lô serial không còn đúng 3 sau khi tỉnh duyệt trả 3').toBe(3);
	await moForm(page);
	const tb = await r.traSerial(page, box, s.serials[0]);
	expect(tb).toContain(`Serial "${s.serials[0]}" không tồn tại hoặc đã xuất kho`);
});

test('14_1_010_040 — Tìm lô của mặt hàng đang trả theo serial hỏi 3 lựa chọn', async ({ page, browser }) => {
	chanNeuTat('14_1_010_040');
	const s = await r.nhapHangSerial(browser, { sl: 3 });
	await moForm(page);
	await r.traSerial(page, box, s.serials[0]);
	await expect(r.hang(box), 'Quét serial không thêm dòng').toHaveCount(1, { timeout: 10_000 });
	await box.getByPlaceholder(r.O_LO).fill(s.lo);
	await r.fItem(box, 'Mã lô hàng').getByRole('button', { name: 'Tìm' }).click();
	const hop = page.getByRole('dialog').filter({ hasText: 'Sản phẩm đã có trong danh sách (đang trả theo serial)' }).last();
	await expect(hop).toBeVisible({ timeout: 10_000 });
	for (const n of ['Giữ theo serial hiện tại', 'Áp dụng theo lô', 'Áp dụng cả 2']) await expect(hop.getByRole('button', { name: n })).toBeVisible();
	await hop.getByRole('button', { name: 'Giữ theo serial hiện tại' }).click();
	await expect(hop).toBeHidden();
	await expect(r.hang(box)).toHaveCount(1);
	await expect(r.hang(box).first()).toContainText(s.serials[0]);
	await expect(r.hang(box).first().locator('.ant-input-number-input').first()).toHaveValue('1');
});
