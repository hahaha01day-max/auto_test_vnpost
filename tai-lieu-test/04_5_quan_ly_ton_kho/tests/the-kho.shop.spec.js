'use strict';

/**
 * 04_5 · 030 — Thẻ kho vai `shop` (26/09/2026). Chỉ đọc.
 * 🔴 Lý do chặn cũ ("Thẻ kho mở ra RỖNG") đã lỗi thời: 26/09 thẻ "Thẻ kho" ở `/inventory/import` có ô "Tìm sản phẩm" (`ProductVariantSearchSelector`,
 * kiểu tìm Tên SP/SKU/Barcode) + khoảng ngày, bảng `GET /report/stock-card` (DW) và 4 ô tổng (extraData.summary: openingQuantity / totalIn /
 * totalOut / closingQuantity). Dòng: sourceType (IMPORT "Nhập kho" xanh · EXPORT "Xuất kho" đỏ · STOCK_CHECKS "Kiểm kho" cam) + sourceSubType,
 * quantityIn / quantityOut / balanceAfter.
 * SP đo: giá tiêu chuẩn seed (có nhập, bán, kiểm kho giảm 26/09) và FIFO seed (kiểm kho TĂNG 26/09 — 07_2_060_006).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const { moLichSu, moThe, khung, chuan } = require('../../04_3_nhap_xuat_chuyen_kho/tests/warehouse-page');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 1200) });
const SP = () => seed.doc().duLieu.sanPham.sanPhamTheoGiaVon;
const so = (v) => Number(v ?? 0);

/** Mở Thẻ kho, chọn SP theo `kieu`/`tu`; trả { st, q (tham số màn), the (response màn), du (toàn bộ dòng) }. */
async function moTheKho(page, ten, { kieu = 'Tên SP', tu = ten } = {}) {
	const st = k.batHeader(page);
	await moLichSu(page, 'shop');
	await moThe(page, 'Thẻ kho');
	let the = null;
	page.on('response', async (r) => { if (/\/report\/stock-card\?/.test(r.url()) && r.request().method() === 'GET') { const b = await r.json().catch(() => null); if (b?.data) the = { url: r.url(), b }; } });
	const o = khung(page).getByRole('textbox', { name: 'Tìm sản phẩm' }).first();
	const cb = o.locator('xpath=ancestor::*[.//*[contains(@class,"ant-select")]][1]').locator('.ant-select').first();
	if (kieu !== 'Tên SP' && (await cb.count())) {
		await cb.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${kieu}$`) }).last().click();
	}
	await o.click();
	await o.pressSequentially(tu, { delay: 40 });
	const opt = khung(page).locator('div.cursor-pointer').filter({ hasText: ten }).first();
	await expect(opt, `Không có gợi ý "${ten}" khi tìm ${kieu} "${tu}"`).toBeVisible({ timeout: 20_000 });
	await opt.click();
	await expect.poll(() => Boolean(the), { timeout: 30_000 }).toBe(true);
	await page.waitForTimeout(1_500);
	const q = Object.fromEntries(new URL(the.url).searchParams.entries());
	// 🔴 API trả tối đa 500 dòng/trang dù xin size lớn ⇒ đi hết các trang.
	const du = await k.goiGhi(page, st, 'GET', '/report/stock-card', { ...q, page: 0, size: 500 });
	const dong = [...(du?.data || [])];
	const tong = du?.page?.total_elements ?? dong.length;
	for (let pg = 1; dong.length < tong && pg < 50; pg += 1) dong.push(...((await k.goiGhi(page, st, 'GET', '/report/stock-card', { ...q, page: pg, size: 500 }))?.data || []));
	return { st, q, the: the.b, du, dong, tong, sum: du?.extraData?.summary || {} };
}

test.describe('04_5 · 030 — Thẻ kho (vai shop, đọc DW)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('04_5_030_006 — Tìm sản phẩm theo barcode ở Thẻ kho', async ({ page }) => {
		chanNeuTat('04_5_030_006');
		const { chon } = require('../../shared/db/otp');
		const tc = SP().tieuChuan;
		const bar = chon(`select bar_code from CHAIN_PRODUCT_UNIT where sku='${tc.sku}' and variant_id is not null limit 1`, 'VNPOST_CORE');
		const r = await moTheKho(page, tc.tenSanPham, { kieu: 'Barcode', tu: bar });
		ghiDo(`barcode "${bar}" (SKU ${tc.sku}${bar === tc.sku ? ' — SP seed có barcode = SKU' : ''}) ⇒ ${r.dong.length} dòng, biến thể ${r.q.variantId}`);
		expect(r.dong.length, 'Chọn SP theo barcode mà thẻ kho không có giao dịch').toBeGreaterThan(0);
		expect(r.dong.every((x) => chuan(x.productName) === tc.tenSanPham), 'Thẻ kho lẫn giao dịch SP khác').toBe(true);
	});

	test('04_5_030_008 — Tồn đầu kỳ bằng tồn ngay trước ngày đầu khoảng', async ({ page }) => {
		chanNeuTat('04_5_030_008');
		const r = await moTheKho(page, SP().tieuChuan.tenSanPham);
		const truoc = new Date(new Date(r.q.fromDate).getTime() - 86400_000).toISOString().slice(0, 10);
		const kyTruoc = await k.goiGhi(page, r.st, 'GET', '/report/stock-card', { ...r.q, fromDate: '2020-01-01', toDate: truoc, page: 0, size: 1 });
		const tonTruoc = so(kyTruoc?.extraData?.summary?.closingQuantity);
		ghiDo(`khoảng ${r.q.fromDate}→${r.q.toDate}: Tồn đầu kỳ ${r.sum.openingQuantity} · tồn cuối tới ${truoc} = ${tonTruoc}`);
		expect(so(r.sum.openingQuantity), '🔴 Tồn đầu kỳ ≠ tồn ngay trước ngày đầu khoảng (gấp đôi ⇒ bẫy tồn đầu kỳ đếm 2 lần ở DW)').toBe(tonTruoc);
	});

	test('04_5_030_009 — Tổng nhập bằng tổng các giao dịch nhập', async ({ page }) => {
		chanNeuTat('04_5_030_009');
		const r = await moTheKho(page, SP().tieuChuan.tenSanPham);
		const cong = r.dong.reduce((t, x) => t + so(x.quantityIn), 0);
		ghiDo(`${r.dong.length}/${r.tong} dòng · Σ quantityIn ${cong} · ô Tổng nhập ${r.sum.totalIn}`);
		expect(cong).toBeCloseTo(so(r.sum.totalIn), 4);
	});

	test('04_5_030_010 — Tổng xuất bằng tổng các giao dịch xuất', async ({ page }) => {
		chanNeuTat('04_5_030_010');
		const r = await moTheKho(page, SP().tieuChuan.tenSanPham);
		const cong = r.dong.reduce((t, x) => t + so(x.quantityOut), 0);
		ghiDo(`${r.dong.length}/${r.tong} dòng · Σ quantityOut ${cong} · ô Tổng xuất ${r.sum.totalOut}`);
		expect(cong).toBeCloseTo(so(r.sum.totalOut), 4);
	});

	test('04_5_030_011 — Tồn cuối kỳ = đầu kỳ + nhập − xuất và khớp tồn thật', async ({ page }) => {
		chanNeuTat('04_5_030_011');
		const tc = SP().tieuChuan;
		const r = await moTheKho(page, tc.tenSanPham);
		const { chon } = require('../../shared/db/otp');
		const pid = Number(chon(`select product_id from CHAIN_PRODUCT_UNIT where sku='${tc.sku}' limit 1`, 'VNPOST_CORE'));
		const tonThat = ((await k.goiGhi(page, r.st, 'GET', '/stock/v2/batch-product', { shopId: seed.doc().duLieu.diemBan.shopId, productId: pid, variantId: r.q.variantId, size: 500 }))?.data || []).reduce((t, l) => t + so(l.remainQuantity), 0);
		const tinh = so(r.sum.openingQuantity) + so(r.sum.totalIn) - so(r.sum.totalOut);
		ghiDo(`đầu ${r.sum.openingQuantity} + nhập ${r.sum.totalIn} − xuất ${r.sum.totalOut} = ${tinh} · ô Tồn cuối ${r.sum.closingQuantity} · tồn thật (Σ lô) ${tonThat} · toDate ${r.q.toDate}`);
		expect(so(r.sum.closingQuantity), 'Tồn cuối kỳ ≠ đầu + nhập − xuất').toBeCloseTo(tinh, 4);
		expect(so(r.sum.closingQuantity), '🔴 Tồn cuối kỳ (DW) ≠ tồn thật hiện tại').toBeCloseTo(tonThat, 4);
	});

	async function dongKiemKho(page, id, ten, huong) {
		chanNeuTat(id);
		const r = await moTheKho(page, SP()[ten].tenSanPham);
		const kk = r.dong.filter((x) => /STOCK_CHECK/.test(`${x.sourceType} ${x.sourceSubType}`) && (huong === 'tăng' ? so(x.quantityIn) > 0 : so(x.quantityOut) > 0));
		const pane = khung(page);
		const dongUi = kk[0] ? pane.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: kk[0].sourceCode }).first() : null;
		const chu = dongUi && (await dongUi.count()) ? chuan(await dongUi.innerText()) : '';
		const mau = dongUi && (await dongUi.count()) ? await dongUi.locator('[class*="text-"]').evaluateAll((a) => a.map((e) => e.className).join(' ')) : '';
		ghiDo(`${kk.length} dòng kiểm kho ${huong} · dòng đầu ${JSON.stringify(kk[0] && { t: kk[0].sourceType, st: kk[0].sourceSubType, in: kk[0].quantityIn, out: kk[0].quantityOut, ma: kk[0].sourceCode })} · UI "${chu.slice(0, 160)}" · lớp màu ${mau.slice(0, 120)}`);
		expect(kk.length, `Thẻ kho không có dòng kiểm kho làm tồn ${huong} (26/09 đã kiểm ${huong} SP này)`).toBeGreaterThan(0);
		expect(chu, 'Dòng không mang nhãn "Kiểm kho"').toContain('Kiểm kho');
		expect(chu, `🔴 Cột ${huong === 'tăng' ? 'Nhập' : 'Xuất'} của dòng kiểm kho không hiện số chênh lệch (API ${huong === 'tăng' ? kk[0]?.quantityIn : kk[0]?.quantityOut})`).toMatch(new RegExp(`\\b${huong === 'tăng' ? so(kk[0]?.quantityIn) : so(kk[0]?.quantityOut)}\\b.*\\b\\d+\\b`));
		expect(chu, `Dòng không mang nhãn "${huong === 'tăng' ? 'Nhập kho' : 'Xuất kho'}"`).toContain(huong === 'tăng' ? 'Nhập kho' : 'Xuất kho');
		expect(mau, 'Màu nhãn không đúng xanh (tăng) / đỏ (giảm)').toMatch(huong === 'tăng' ? /text-green/ : /text-red|text-orange/);
	}

	test('04_5_030_015 — Dòng kiểm kho làm tồn tăng trên Thẻ kho', async ({ page }) => dongKiemKho(page, '04_5_030_015', 'fifo', 'tăng'));
	test('04_5_030_018 — Dòng kiểm kho làm tồn giảm trên Thẻ kho', async ({ page }) => dongKiemKho(page, '04_5_030_018', 'tieuChuan', 'giảm'));
});
