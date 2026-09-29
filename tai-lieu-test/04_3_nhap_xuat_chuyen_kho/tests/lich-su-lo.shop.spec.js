'use strict';

/**
 * 04_3 · 050_009 — Theo dõi lịch sử lô hàng (26/09/2026). Vai `shop`. Chỉ đọc.
 *
 * 🔴 Rà vnpost-web (không có màn/route "lịch sử lô", "truy vết lô") và report-service (`StockCardController` `/stock-card` không có
 * tham số/cột lô): lịch sử duy nhất là "Thẻ kho" theo (kho, biến thể). Case đo trên giao diện: chọn SP có lô đã NHẬP + XUẤT thật
 * (lô FEFO đầu của SP giá tiêu chuẩn — 04_3_050_005/006 bán + hoàn) ⇒ Thẻ kho có ô lọc lô / cột lô không, mỗi dòng có mã lô không.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chon } = require('../../shared/db/otp');
const k = require('./ghi-kho');
const { moLichSu, moThe, khung, chuan } = require('./warehouse-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

test('04_3_050_009 — Theo dõi lịch sử lô hàng', async ({ page }) => {
	chanNeuTat('04_3_050_009');
	const { shopId, sp } = k.duLieuSeed();
	const [variantId] = chon(`select variant_id from CHAIN_PRODUCT_UNIT where sku='${sp.tieuChuan.sku}' and convert_to_main_unit=1 and variant_id is not null limit 1`, 'VNPOST_CORE').split('\t');
	// Lô có cả nhập lẫn xuất: lô đầu tiên của SP (theo FEFO) — remain < quantity nghĩa là đã xuất.
	const lo = chon(`select batch_code, quantity, remain_quantity from STOCK_BATCH_PRODUCTS where shop_id=${shopId} and variant_id=${variantId} and remain_quantity < quantity and (deleted is null or deleted=0) order by expiry_date, batch_product_id limit 1`, 'VNPOST_POD_02').split('\t');
	expect(lo[0], 'Không có lô nào đã có cả nhập và xuất để làm tiền đề').toBeTruthy();
	await moLichSu(page, 'shop');
	await moThe(page, 'Thẻ kho');
	const o = khung(page).getByRole('textbox', { name: 'Tìm sản phẩm' }).first();
	await o.click();
	await o.pressSequentially(sp.tieuChuan.tenSanPham, { delay: 40 });
	await khung(page).locator('div.cursor-pointer').filter({ hasText: sp.tieuChuan.tenSanPham }).first().click();
	await expect(khung(page).locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 30_000 });
	const pane = khung(page); // bảng + bộ lọc Thẻ kho render ngoài tabpanel
	const cot = (await pane.locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);
	const oLoc = await pane.getByPlaceholder(/lô/i).count() + await pane.locator('.ant-select').filter({ hasText: /lô/i }).count();
	const coMaLo = await pane.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: lo[0] }).count();
	test.info().annotations.push({ type: 'đo', description: `lô ${lo[0]} (nhập ${lo[1]}, còn ${lo[2]}) · cột Thẻ kho: ${cot.join(' · ')} · ô lọc lô: ${oLoc} · dòng mang mã lô: ${coMaLo} · không có route/màn "lịch sử lô" trong vnpost-web, /stock-card không có tham số lô` });
	expect(oLoc + (cot.some((c) => /lô/i.test(c)) ? 1 : 0), '🔴 Không có chỗ xem lịch sử theo LÔ: Thẻ kho không lọc lô, không có cột lô').toBeGreaterThan(0);
	expect(coMaLo, 'Thẻ kho không hiện dòng nào mang mã lô đã có giao dịch').toBeGreaterThan(0);
});
