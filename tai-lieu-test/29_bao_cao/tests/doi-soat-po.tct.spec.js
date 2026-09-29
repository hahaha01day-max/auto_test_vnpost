'use strict';

/**
 * 29_220_003 – 220_014 · Báo cáo đối soát HĐ mua hàng & công nợ NCC — vai `tct` (kịch bản ghi shop: điểm bán làn KHÔNG có PO nào;
 * dữ liệu PO thật nằm ở cấp TCT — cùng lý do phân hệ 27 chạy tct). Chỉ ĐỌC + xuất file.
 * Trace `features/poReconciliationReport/pages/PoReconciliationReportPage.jsx`: thẻ "Tổng nợ phải trả NCC" · "PO khớp đối soát" ·
 * "PO lệch đối soát" …; bảng "Danh sách công nợ từng nhà cung cấp" (Đối soát PO "N khớp / N lệch / N chưa", "Đối soát chi tiết");
 * drawer `Đối soát hóa đơn mua hàng — <NCC>` (ô "Tìm theo mã PO", "Tất cả đối soát", "Tất cả thanh toán"); drawer "Chi tiết đối soát PO"
 * (khối PO · Phiếu nhập kho · XML; bảng "Phiếu nhập kho", "Hóa đơn XML", "Dòng sản phẩm"). Xuất `suppliers/export` ⇒ `cong-no-ncc-YYYYMM.xlsx`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const { chuan, khung, moMan, soTu } = require('./report-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const dongNcc = (page) => khung(page).locator('.ant-table').filter({ has: page.locator('th', { hasText: 'Tên nhà cung cấp' }) }).first().locator('.ant-table-tbody tr.ant-table-row');
const layThe = (t, nhan) => soTu((t.match(new RegExp(`${nhan}[^\\d-]{0,40}(-?[\\d.,]+)`)) || [])[1]);

/** Mở màn, lùi tháng tới khi bảng NCC có dòng (tối đa 4 tháng). Trả { st, q }. */
async function moCoDuLieu(page) {
	const st = k.batHeader(page);
	await moMan(page, 'doiSoat', VAI);
	for (let lui = 0; lui < 4 && (await dongNcc(page).count()) === 0; lui += 1) {
		const o = khung(page).locator('.ant-picker').first();
		await o.click();
		const panel = page.locator('.ant-picker-dropdown:visible').last();
		const cho = page.waitForResponse((r) => /po-reconciliation\/suppliers/.test(r.url()), { timeout: 30_000 }).catch(() => null);
		await panel.locator('.ant-picker-cell-in-view').nth(Math.max(0, new Date().getMonth() - 1 - lui)).click();
		await cho;
		await page.waitForTimeout(2_000);
	}
	test.skip((await dongNcc(page).count()) === 0, 'Không tháng nào (4 tháng gần nhất) có công nợ NCC ở cấp TCT.');
	return { st };
}

async function moNcc(page) {
	await dongNcc(page).first().getByText('Đối soát chi tiết').click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: /Đối soát h[oó]a đơn mua hàng/ }).last();
	await expect(dr, 'Không mở drawer đối soát của NCC').toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(2_000);
	return dr;
}

async function moPo(page, dr) {
	const hang = dr.locator('.ant-table-tbody tr.ant-table-row');
	test.skip((await hang.count()) === 0, 'NCC đầu tiên không có PO nào trong tháng.');
	await hang.first().locator('a, [class*=link]').first().click().catch(() => hang.first().locator('td').first().click());
	const po = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết đối soát PO' }).last();
	await expect(po, 'Không mở drawer "Chi tiết đối soát PO"').toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(2_000);
	return po;
}

test.describe('29_220 · Báo cáo đối soát PO (vai tct, chỉ đọc)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('29_220_003 — Xuất Excel báo cáo đối soát', async ({ page }) => {
		chanNeuTat('29_220_003');
		await moCoDuLieu(page);
		const tai = page.waitForEvent('download', { timeout: 60_000 });
		await khung(page).getByRole('button', { name: /Xuất dữ liệu/ }).click();
		const d = await tai;
		ghiChu('tệp', d.suggestedFilename());
		expect(d.suggestedFilename()).toMatch(/^cong-no-ncc-\d{6}\.xlsx$/);
	});

	test('29_220_004 — Tổng nợ phải trả nhà cung cấp', async ({ page }) => {
		chanNeuTat('29_220_004');
		await moCoDuLieu(page);
		const t = chuan(await khung(page).innerText());
		const tong = layThe(t, 'Tổng nợ phải trả NCC');
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		const iNo = cot.indexOf('Nợ cuối kỳ');
		let cong = 0;
		for (let i = 0; i < (await dongNcc(page).count()); i += 1) cong += soTu((await dongNcc(page).nth(i).locator('td').allInnerTexts())[iNo]);
		const tongTrang = chuan(await khung(page).locator('.ant-pagination').first().innerText().catch(() => ''));
		ghiChu('đo', `thẻ ${tong} · cộng ${await dongNcc(page).count()} NCC trang này ${cong} · phân trang "${tongTrang}"`);
		test.skip(/2/.test(tongTrang) && (await khung(page).locator('.ant-pagination-item').count()) > 1, 'Danh sách NCC nhiều trang — cộng tay trang 1 không đủ.');
		expect(cong).toBe(tong);
	});

	for (const [id, ten, nhan, re] of [
		['29_220_005', 'Số lượng PO khớp đối soát', 'PO khớp đối soát', /(\d+) khớp/],
		['29_220_006', 'Số lượng PO lệch đối soát', 'PO lệch đối soát', /(\d+) lệch/],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			await moCoDuLieu(page);
			const t = chuan(await khung(page).innerText());
			const the = layThe(t, nhan);
			let dem = 0;
			for (const d of (await dongNcc(page).allInnerTexts()).map(chuan)) dem += Number((d.match(re) || [])[1] || 0);
			ghiChu('đo', `thẻ "${nhan}" ${the} · đếm cột Đối soát PO ${dem}`);
			expect(dem).toBe(the);
		});
	}

	test('29_220_008 — Mở chi tiết đối soát của một nhà cung cấp', async ({ page }) => {
		chanNeuTat('29_220_008');
		await moCoDuLieu(page);
		const ncc = chuan(await dongNcc(page).first().locator('td').first().innerText());
		const cho = page.waitForResponse((r) => /po-reconciliation\/purchase-orders\?/.test(r.url()), { timeout: 30_000 });
		const dr = await moNcc(page);
		const q = Object.fromEntries(new URL((await cho).url()).searchParams);
		ghiChu('đo', `NCC "${ncc}" · ${JSON.stringify(q)}`);
		await expect(dr).toContainText(ncc);
		expect(q.supplierId, 'Mở chi tiết không lọc theo NCC').toBeTruthy();
	});

	test('29_220_009 — Giao diện popup Đối soát hoá đơn mua hàng', async ({ page }) => {
		chanNeuTat('29_220_009');
		await moCoDuLieu(page);
		const dr = await moNcc(page);
		const tieuDe = chuan(await dr.locator('.ant-drawer-title').innerText());
		ghiChu('nguyên văn tiêu đề', tieuDe);
		expect(tieuDe.startsWith('Đối soát hoá đơn mua hàng'), `Tiêu đề thật: "${tieuDe}" (chữ "hóa" / Drawer kèm tên NCC)`).toBe(true);
	});

	test('29_220_010 — Nội dung chi tiết đối soát khớp với lúc thực hiện', async ({ page }) => {
		chanNeuTat('29_220_010');
		const d = loadCaseInput(GOC, '29_220_010').data ?? {};
		const po27 = require('../../27_doi_soat_hoa_don/test-input.json').cases['27_050_001'].data;
		const { st } = await moCoDuLieu(page);
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
		const rp = await k.goiGhi(page, st, 'GET', `/report/po-reconciliation/purchase-orders/${po27.poId}`, { reportMonth: '2026-09-01', orgLevel: 'TONG_CONG_TY' });
		const nguon = await k.goiGhi(page, st, 'GET', `/po-invoice-reconcile/purchase-orders/${po27.poId}`);
		const tomTat = (x) => JSON.stringify(x?.data ?? {}).slice(0, 300);
		ghiChu('báo cáo vs phân hệ 27', `${JSON.stringify(rp?.status)} ${tomTat(rp)} · 27: ${tomTat(nguon)}`);
		void d;
		expect(String(rp?.status?.code), 'Báo cáo không mở được PO đã đối soát ở phân hệ 27').toBe('200');
		const hd27 = (nguon?.data?.invoices ?? []).map((x) => String(x.invoiceNo));
		expect(JSON.stringify(rp.data), 'Chi tiết báo cáo thiếu hoá đơn đã ghi nhận lúc đối soát').toContain(hd27[0] ?? po27.invoiceNo);
	});

	test('29_220_012 — Bộ lọc trạng thái thanh toán', async ({ page }) => {
		chanNeuTat('29_220_012');
		await moCoDuLieu(page);
		const dr = await moNcc(page);
		const ds = (await dr.locator('.ant-select').allInnerTexts()).map(chuan);
		ghiChu('ô chọn trong drawer', ds.join(' · '));
		const o = dr.locator('.ant-select').filter({ hasText: /thanh toán/i }).first();
		expect(await o.count(), `Drawer không có bộ lọc trạng thái thanh toán (ô chọn: ${ds.join(' · ')})`).toBeGreaterThan(0);
		const kq = {};
		for (const [nhan, ma] of [['Chưa thanh toán', 'UNPAID'], ['Thanh toán một phần', 'PARTIAL_PAID'], ['Đã thanh toán toàn bộ', 'FULL_PAID']]) {
			const cho = page.waitForResponse((r) => /po-reconciliation\/purchase-orders\?/.test(r.url()), { timeout: 20_000 });
			await o.click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${nhan}$`) }).click();
			const r = await cho;
			const b = await r.json();
			const sai = (b?.data?.content ?? b?.data ?? []).filter((x) => x.paymentStatus && x.paymentStatus !== ma);
			kq[ma] = { q: new URL(r.url()).searchParams.get('paymentStatus'), n: (b?.data?.content ?? b?.data ?? []).length, sai: sai.length };
			expect(kq[ma].q).toBe(ma);
			expect(sai, `Lọc ${nhan} mà có PO trạng thái khác`).toEqual([]);
		}
		ghiChu('đo', JSON.stringify(kq));
	});

	for (const [id, ten] of [['29_220_013', 'Giao diện drawer Chi tiết đối soát PO'], ['29_220_014', 'Nội dung Chi tiết đối soát PO']]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			await moCoDuLieu(page);
			const dr = await moNcc(page);
			const po = await moPo(page, dr);
			const t = chuan(await po.innerText());
			ghiChu('nguyên văn khối', t.slice(0, 400));
			for (const k2 of ['Phiếu nhập kho', 'XML']) expect(t, `Drawer thiếu khối "${k2}"`).toContain(k2);
			if (id === '29_220_014') {
				expect(t, 'Không có bảng "Dòng sản phẩm" so PO / Nhập kho / XML').toMatch(/Dòng sản phẩm/);
				expect(t, 'Không thể hiện khớp/lệch').toMatch(/Khớp|Lệch|Chưa đối soát/);
			}
		});
	}
});
