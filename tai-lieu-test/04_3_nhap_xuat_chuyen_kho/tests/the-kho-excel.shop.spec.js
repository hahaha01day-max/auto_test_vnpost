'use strict';

/**
 * 04_3 · 010_005 — Xuất Excel ở Thẻ kho (26/09/2026). Vai `shop`. Không ghi dữ liệu nghiệp vụ (chỉ tạo job export).
 *
 * Nguồn vnpost-web `pages/warehouse/import/{import,Filter,StockCardTab}.jsx` + `features/exportExcel/{action,exportExcelDrawer,FilterCurrentView}.jsx`:
 * thẻ "Thẻ kho" cần kho + "Tìm sản phẩm" (biến thể) + khoảng ngày (mặc định 30 ngày) ⇒ `GET /report/stock-card` (DW). Nút "Xuất excel" mở drawer
 * export ⇒ "Xuất file excel" = `GET export/task/stock-card` (job nền export-service) ⇒ bảng file, dòng SUCCESS có "Tải xuống"
 * (`export/file/download`, tải blob .xlsx).
 * 🔴 Kỳ vọng case: FILE khớp PHẦN ĐANG LỌC TRÊN MÀN ⇒ so file với chính response màn (cùng DW), 🚫 không đối chiếu lại DW/MySQL ở đây
 * (đúng/sai số DW thuộc phân hệ báo cáo — memory post−pre / FINAL).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('./ghi-kho');
const { moLichSu, moThe, khung, chuan } = require('./warehouse-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const so = (v) => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;

test('04_3_010_005 — Xuất Excel ở Thẻ kho', async ({ page }) => {
	chanNeuTat('04_3_010_005');
	test.setTimeout(360_000);
	const { sp } = k.duLieuSeed();
	const st = k.batHeader(page);
	await moLichSu(page, 'shop');
	await moThe(page, 'Thẻ kho');
	let the = null;
	page.on('response', async (r) => { if (/\/report\/stock-card\?/.test(r.url()) && r.request().method() === 'GET') { const b = await r.json().catch(() => null); if (b?.data) the = { url: r.url(), b }; } });
	// `ProductVariantSearchSelector`: Input tự dựng + danh sách `div.cursor-pointer` (không phải antd Select).
	const o = khung(page).getByRole('textbox', { name: 'Tìm sản phẩm' }).first();
	await o.click();
	await o.pressSequentially(sp.tieuChuan.tenSanPham, { delay: 40 });
	const opt = khung(page).locator('div.cursor-pointer').filter({ hasText: sp.tieuChuan.tenSanPham }).first();
	await expect(opt, `Không có gợi ý sản phẩm ${sp.tieuChuan.tenSanPham}`).toBeVisible({ timeout: 20_000 });
	await opt.click();
	await expect.poll(() => Boolean(the), { timeout: 30_000 }).toBe(true);
	await page.waitForTimeout(1_500);
	// Toàn bộ phần đang lọc (màn phân trang 50) — gọi lại đúng API màn với size lớn bằng chính phiên.
	const u = new URL(the.url);
	const q = Object.fromEntries(u.searchParams.entries());
	// 🔴 API trả tối đa 500 dòng/trang dù xin size lớn ⇒ đi hết các trang (26/09: 514 dòng).
	const du = await k.goiGhi(page, st, 'GET', '/report/stock-card', { ...q, page: 0, size: 500 });
	const dongMan = [...(du?.data || [])];
	const tong = du?.page?.total_elements ?? dongMan.length;
	for (let pg = 1; dongMan.length < tong && pg < 50; pg += 1) dongMan.push(...((await k.goiGhi(page, st, 'GET', '/report/stock-card', { ...q, page: pg, size: 500 }))?.data || []));
	const sum = du?.extraData?.summary || {};
	expect(tong, 'Thẻ kho SP tiêu chuẩn 30 ngày không có phát sinh nào để đối chiếu').toBeGreaterThan(0);

	await khung(page).getByRole('button', { name: /Xuất excel/ }).filter({ visible: true }).first().click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Xuất excel thẻ kho' }).last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	let task = null;
	page.on('response', async (r) => { if (/export\/task\/stock-card/.test(r.url())) task = { url: r.url(), b: await r.json().catch(() => null) }; });
	const truoc = await dr.locator('.ant-table-tbody tr.ant-table-row').count();
	await dr.getByRole('button', { name: /Xuất file excel/ }).click();
	await expect.poll(() => Boolean(task), { timeout: 30_000 }).toBe(true);
	expect(String(task.b?.status?.code), `Tạo job xuất thẻ kho lỗi: ${JSON.stringify(task.b?.status)}`).toBe('200');
	// Chờ job xong: đóng/mở lại drawer để nạp lại danh sách file (FE chỉ nạp khi mở / setReload).
	const nutTai = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('button.ant-btn-link'); // 🔴 nhãn "Tải xuống" có thể là NFD — bắt theo lớp nút link
	let trangThai = '';
	for (let i = 0; i < 40; i += 1) {
		await page.waitForTimeout(3_000);
		trangThai = chuan(await dr.locator('.ant-table-tbody tr.ant-table-row').first().innerText().catch(() => ''));
		if (/Tải xuống|Thất bại/.test(trangThai)) break;
		await page.keyboard.press('Escape');
		await page.waitForTimeout(500);
		await khung(page).getByRole('button', { name: /Xuất excel/ }).filter({ visible: true }).first().click();
		await expect(dr).toBeVisible({ timeout: 15_000 });
	}
	expect(trangThai, `Job xuất thẻ kho THẤT BẠI (task ${task.url})`).not.toMatch(/Thất bại/);
	expect(await nutTai.count(), `Job chưa xong sau ~2 phút (dòng đầu "${trangThai}", trước đó ${truoc} file)`).toBeGreaterThan(0);
	const [tai] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), nutTai.click()]);
	const f = test.info().outputPath(tai.suggestedFilename());
	await tai.saveAs(f);
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.readFile(f);
	const ws = wb.worksheets[0];
	const hang = [];
	ws.eachRow((r) => hang.push(r.values.slice(1).map((v) => (v && typeof v === 'object' ? v.result ?? v.text ?? String(v) : v))));
	const iMa = hang.findIndex((h) => h.some((c) => /Mã phiếu/i.test(String(c ?? ''))));
	expect(iMa, `File không có dòng tiêu đề "Mã phiếu": ${JSON.stringify(hang.slice(0, 5))}`).toBeGreaterThanOrEqual(0);
	const tieuDe = hang[iMa].map((c) => chuan(String(c ?? '')));
	const cMa = tieuDe.findIndex((t) => /Mã phiếu/i.test(t));
	const cNhap = tieuDe.findIndex((t) => /^Nhập/i.test(t));
	const cXuat = tieuDe.findIndex((t) => /^Xuất/i.test(t));
	const dongFile = hang.slice(iMa + 1).filter((h) => String(h[cMa] ?? '').trim() !== '');
	const maFile = dongFile.map((h) => String(h[cMa]).trim()).sort();
	const maMan = dongMan.map((x) => String(x.sourceCode ?? '').trim()).sort();
	const nhapFile = dongFile.reduce((s, h) => s + so(h[cNhap]), 0);
	const xuatFile = dongFile.reduce((s, h) => s + so(h[cXuat]), 0);
	test.info().annotations.push({ type: 'đo', description: `lọc ${q.fromDate}→${q.toDate} biến thể ${q.variantId}: màn ${tong} dòng (tổng nhập ${sum.totalIn} / xuất ${sum.totalOut}) · file "${tai.suggestedFilename()}" ${dongFile.length} dòng, cột ${JSON.stringify(tieuDe)} · Σnhập ${nhapFile} Σxuất ${xuatFile}` });
	expect(dongFile.length, 'Số dòng file ≠ số dòng đang lọc trên màn').toBe(tong);
	expect(maFile, 'Mã phiếu trong file khác mã phiếu trên màn').toEqual(maMan);
	if (cNhap >= 0) expect(nhapFile, 'Tổng nhập trong file ≠ "Tổng nhập" trên màn').toBeCloseTo(Number(sum.totalIn || 0), 3);
	if (cXuat >= 0) expect(xuatFile, 'Tổng xuất trong file ≠ "Tổng xuất" trên màn').toBeCloseTo(Number(sum.totalOut || 0), 3);
});
