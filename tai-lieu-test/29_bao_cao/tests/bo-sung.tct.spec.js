'use strict';

/**
 * 29 · Bổ sung vai `tct` — dữ liệu THẬT toàn chuỗi (chỉ ĐỌC), trừ 140_001 (tạo rồi XOÁ cấu hình báo cáo tuỳ chỉnh rác).
 * Trace 25/09/2026 (vnpost-web): doanh thu `features/revenueReport/pages/RevenueReportPage.jsx` (breadcrumb antd "Tổng công ty / tỉnh / xã",
 * bảng "Chi tiết bưu điện các tỉnh/TP" → xã → "Điểm bán thuộc …", ô "Tìm theo tên tỉnh/TP|xã|điểm bán", bảng drill `pagination={false}`) ·
 * báo cáo kho `features/inventory/report/InventoryValueReport.jsx` (drawer "Chọn phạm vi báo cáo", ô "Tìm theo tên/mã đơn vị" →
 * `GET /report/inventory/monthly-summary/org-units?keyword`) · modal chốt `features/inventory/overview/components/ModalCloseInventory.jsx`
 * (🚫 KHÔNG bấm "Chốt" ở vai TCT: phạm vi toàn chuỗi, KHÔNG có endpoint mở chốt) · cấu hình `features/report/components/ReportConfigDrawer.jsx`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { boDau, chuan, khung, moMan, soTu } = require('./report-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const bangDrill = (page) => khung(page).locator('.ant-table').filter({ has: page.locator('th', { hasText: /Tên (bưu điện tỉnh|bưu điện xã|điểm bán)/ }) }).first();
const dongDrill = (page) => bangDrill(page).locator('.ant-table-tbody tr.ant-table-row');
const crumb = async (page) => chuan(await khung(page).locator('.ant-breadcrumb').first().innerText().catch(() => '')).replace(/\s*\/\s*/g, '/');

/** Bấm dòng đầu có doanh thu > 0 của bảng drill; trả tên đơn vị. */
async function diSau(page) {
	const n = await dongDrill(page).count();
	for (let i = 0; i < n; i += 1) {
		const td = (await dongDrill(page).nth(i).locator('td').allInnerTexts()).map(chuan);
		if (soTu(td[1] ?? td[2]) > 0 || i === n - 1) {
			const ten = td[0] || td[1];
			const cho = page.waitForResponse((r) => /report\/revenue\/v1\/monthly\/(summary|province-summary)/.test(r.url()) && r.status() === 200, { timeout: 30_000 }).catch(() => null);
			await dongDrill(page).nth(i).locator('td').first().click();
			await cho;
			await page.waitForTimeout(2_500);
			return ten;
		}
	}
	return null;
}

test.describe('29 · Báo cáo — vai tct (dữ liệu toàn chuỗi)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('29_230_001 — Báo cáo doanh thu xem theo các tỉnh', async ({ page }) => {
		chanNeuTat('29_230_001');
		await moMan(page, 'doanhThu', VAI);
		const bc = await crumb(page);
		const ds = (await dongDrill(page).allInnerTexts()).map(chuan);
		ghiChu('đo', `breadcrumb "${bc}" · ${ds.length} tỉnh · ${ds.slice(0, 3).join(' | ')}`);
		expect(bc).toBe('Tổng công ty');
		expect(ds.length, 'Bảng không liệt kê tỉnh nào').toBeGreaterThan(0);
	});

	test('29_230_002 — Báo cáo doanh thu xem theo các xã', async ({ page }) => {
		chanNeuTat('29_230_002');
		await moMan(page, 'doanhThu', VAI);
		const tinh = await diSau(page);
		const bc = await crumb(page);
		const cot = chuan(await bangDrill(page).locator('thead').innerText());
		ghiChu('đo', `tỉnh "${tinh}" · breadcrumb "${bc}" · cột ${cot}`);
		expect(bc).toBe(`Tổng công ty/${tinh}`);
		expect(cot).toContain('Tên bưu điện xã');
	});

	test('29_230_003 — Báo cáo doanh thu xem theo các điểm bán', async ({ page }) => {
		chanNeuTat('29_230_003');
		await moMan(page, 'doanhThu', VAI);
		const tinh = await diSau(page);
		const xa = await diSau(page);
		const bc = await crumb(page);
		const cot = chuan(await bangDrill(page).locator('thead').innerText().catch(() => ''));
		ghiChu('đo', `"${tinh}" › "${xa}" · breadcrumb "${bc}" · cột ${cot}`);
		expect(bc).toBe(`Tổng công ty/${tinh}/${xa}`);
		expect(cot).toContain('Tên điểm bán');
	});

	test('29_230_004 — Lọc bảng Doanh thu Lợi nhuận gộp Biên LN theo tháng', async ({ page }) => {
		chanNeuTat('29_230_004');
		await moMan(page, 'doanhThu', VAI);
		const a = (await dongDrill(page).allInnerTexts()).map(chuan).join(' | ');
		const o = khung(page).locator('.ant-picker').first();
		const cho = page.waitForResponse((r) => /monthly\/province-summary|monthly\/summary/.test(r.url()) && r.status() === 200, { timeout: 30_000 });
		await o.click();
		const panel = page.locator('.ant-picker-dropdown:visible').last();
		await panel.locator('.ant-picker-cell-in-view').nth(Math.max(0, new Date().getMonth() - 2)).click();
		const r = await cho;
		await page.waitForTimeout(2_500);
		const b = (await dongDrill(page).allInnerTexts()).map(chuan).join(' | ');
		ghiChu('đo', `reportMonth=${new URL(r.url()).searchParams.get('reportMonth')} · trước ${a.slice(0, 150)} · sau ${b.slice(0, 150)}`);
		expect(new URL(r.url()).searchParams.get('reportMonth'), 'Đổi tháng mà không gửi reportMonth mới').toMatch(/^\d{4}-\d{2}-01$/);
		expect(b, 'Đổi tháng mà số liệu bảng giữ nguyên').not.toBe(a);
	});

	test('29_230_005 — Lọc bảng Doanh thu theo tên Tỉnh Xã Điểm bán', async ({ page }) => {
		chanNeuTat('29_230_005');
		await moMan(page, 'doanhThu', VAI);
		const ds = (await dongDrill(page).locator('td:first-child').allInnerTexts()).map(chuan).filter(Boolean);
		test.skip(ds.length < 2, 'Bảng tỉnh có < 2 dòng — không kiểm được thu hẹp.');
		const ten = ds[0];
		await khung(page).getByPlaceholder(/Tìm theo tên tỉnh/).fill(ten);
		await page.waitForTimeout(1_200);
		const con = (await dongDrill(page).locator('td:first-child').allInnerTexts()).map(chuan).filter(Boolean);
		ghiChu('đo', `"${ten}": ${ds.length} → ${con.length}`);
		expect(con.length).toBeLessThan(ds.length);
		for (const x of con) expect(x).toContain(ten);
	});

	test('29_240_002 — Phân trang bảng báo cáo', async ({ page }) => {
		chanNeuTat('29_240_002');
		await moMan(page, 'doanhThu', VAI);
		const phanTrang = await bangDrill(page).locator('xpath=ancestor::*[contains(@class,"ant-table-wrapper")][1]').locator('.ant-pagination').count();
		const n = await dongDrill(page).count();
		ghiChu('đo', `bảng tỉnh ${n} dòng · thanh phân trang: ${phanTrang}`);
		expect(phanTrang, `Bảng báo cáo ${n} dòng KHÔNG có phân trang (pagination={false})`).toBeGreaterThan(0);
	});

	test('29_200_002 — Báo cáo kho phạm vi Tổng công ty', async ({ page }) => {
		chanNeuTat('29_200_002');
		const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
		const st = k.batHeader(page);
		const cho = page.waitForResponse((r) => /report\/inventory\/monthly-summary\/rollup/.test(r.url()) && r.status() === 200, { timeout: 90_000 }).catch(() => null);
		await moMan(page, 'tonKho', VAI);
		const r = await cho;
		expect(r, 'Không gọi rollup phạm vi TCT').toBeTruthy();
		const q = Object.fromEntries(new URL(r.url()).searchParams);
		const tct = ((await r.json())?.data?.items ?? (await r.json())?.data?.content ?? (await r.json())?.data ?? [])[0] ?? {};
		// Cộng các tỉnh: cùng API rollup, level BUU_DIEN_TINH (cùng tháng, preview).
		const t = await k.goiGhi(page, st, 'GET', '/report/inventory/monthly-summary/rollup', { ...q, level: 'BUU_DIEN_TINH', page: 0, size: 500 });
		const ds = t?.data?.items ?? t?.data?.content ?? t?.data ?? [];
		const cong = (ds || []).reduce((a, x) => a + Number(x.closingVal ?? x.closingValue ?? 0), 0);
		ghiChu('đo', `TCT closingVal ${tct.closingVal ?? tct.closingValue} · ${ds.length} tỉnh cộng ${cong} · tháng ${q.reportMonth}`);
		expect(ds.length, `rollup cấp tỉnh không trả dòng nào: ${JSON.stringify(t?.status)}`).toBeGreaterThan(0);
		expect(Math.abs(cong - Number(tct.closingVal ?? tct.closingValue)), 'Tổng TCT ≠ tổng các tỉnh cộng lại').toBeLessThan(1);
	});

	for (const [id, ten, tu] of [
		['29_200_003', 'Báo cáo kho phạm vi Tỉnh', null],
		['29_200_006', 'Tìm kiếm Tỉnh trong bộ chọn phạm vi', 'tim'],
		['29_240_003', 'Tìm phạm vi bằng ký tự đặc biệt', '%_'],
		['29_240_004', 'Tìm phạm vi không dấu', 'khongdau'],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			await moMan(page, 'tonKho', VAI);
			await khung(page).getByText('Chọn phạm vi').first().click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chọn phạm vi báo cáo' }).last();
			await expect(dr).toBeVisible({ timeout: 15_000 });
			await page.waitForTimeout(2_500);
			const dsDong = dr.locator('.ant-table-tbody tr.ant-table-row');
			const tat = (await dsDong.locator('td:first-child').allInnerTexts()).map(chuan).filter(Boolean);
			const tinhCoDau = tat.find((t) => /[à-ỹđ]/i.test(t)) ?? tat[0];
			const o = dr.getByPlaceholder('Tìm theo tên/mã đơn vị');
			const go = async (x) => {
				const cho = page.waitForResponse((r) => /monthly-summary\/org-units/.test(r.url()), { timeout: 15_000 }).catch(() => null);
				await o.fill(x);
				const r = await cho;
				await page.waitForTimeout(1_500);
				return { st: r?.status(), ds: (await dsDong.locator('td:first-child').allInnerTexts()).map(chuan).filter(Boolean) };
			};
			if (!tu) {
				// Đi sâu 1 tỉnh ⇒ bảng chỉ còn xã/shop của tỉnh đó.
				await dsDong.first().locator('td').first().click();
				await page.waitForTimeout(2_500);
				const tieuDe = chuan(await dr.innerText()).match(/Các xã\/shop thuộc tỉnh [^\n]+/)?.[0];
				ghiChu('đo', `tỉnh "${tat[0]}" · ${tieuDe}`);
				expect(tieuDe, 'Đi vào tỉnh mà không lọc theo tỉnh').toContain(tat[0]);
				return;
			}
			if (tu === 'tim') {
				const kq = await go(tinhCoDau);
				ghiChu('đo', `"${tinhCoDau}" → ${kq.st} · ${kq.ds.join(' | ')}`);
				expect(kq.ds).toContain(tinhCoDau);
				return;
			}
			const x = tu === 'khongdau' ? boDau(tinhCoDau) : tu;
			const kq = await go(x);
			ghiChu('hành vi thật', `"${x}" → HTTP ${kq.st} · ${kq.ds.length}/${tat.length} dòng · ${kq.ds.slice(0, 5).join(' | ')}`);
			expect(kq.st, 'Tìm phạm vi trả lỗi 5xx').toBeLessThan(500);
			if (tu === '%_') expect(kq.ds.length, 'Ký tự đại diện SQL trả về TOÀN BỘ đơn vị').toBeLessThan(tat.length || 1);
			else ghiChu('không dấu', kq.ds.includes(tinhCoDau) ? 'CÓ ra đơn vị tên có dấu' : 'KHÔNG ra đơn vị tên có dấu');
		});
	}

	test('29_210_009 — Phạm vi chốt kho của vai cấp TCT', async ({ page }) => {
		chanNeuTat('29_210_009');
		const ghi = [];
		page.on('request', (r) => { if (/period-closing\/close/.test(r.url())) ghi.push(r.url()); });
		await moTrang(page, '/inventory/overview', VAI);
		await page.waitForTimeout(3_000);
		await khung(page).getByRole('button', { name: /Chốt tồn kho/ }).first().click();
		const m = page.getByRole('dialog').filter({ hasText: 'Chốt tồn kho theo tháng' }).last();
		await expect(m).toBeVisible({ timeout: 15_000 });
		const lc = (await m.locator('.ant-radio-wrapper').allInnerTexts()).map(chuan);
		ghiChu('lựa chọn phạm vi', lc.join(' · '));
		await page.keyboard.press('Escape'); // 🚫 KHÔNG chốt ở vai TCT (phạm vi toàn chuỗi, không mở chốt được)
		await expect(m).toBeHidden({ timeout: 10_000 });
		expect(lc.join(' · ')).toContain('Toàn bộ phạm vi (gồm cấp dưới)');
		expect(lc.join(' · ')).toMatch(/Chỉ shop trực thuộc TRỰC TIẾP/);
		expect(ghi, 'Vai TCT lỡ gửi lệnh chốt').toEqual([]);
	});

	test('29_140_001 — Cấu hình danh mục báo cáo tuỳ chỉnh cập nhật thanh báo cáo ngay', async ({ page }) => {
		chanNeuTat('29_140_001');
		const ten = `AUTOTEST_BC_${Date.now().toString().slice(-6)}`;
		await moMan(page, 'tuyChinh', VAI);
		let id = null;
		try {
			await khung(page).getByRole('button', { name: /Cấu hình báo cáo/ }).click();
			const cfg = page.locator('.ant-drawer-open').filter({ hasText: 'Cấu hình báo cáo' }).last();
			await expect(cfg).toBeVisible({ timeout: 15_000 });
			await cfg.getByRole('button', { name: /Thêm mới/ }).click();
			const f = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm báo cáo' }).last();
			await expect(f).toBeVisible({ timeout: 10_000 });
			await f.getByPlaceholder('VD: Báo cáo doanh thu').fill(ten);
			await f.locator('.ant-form-item').filter({ hasText: 'Superset UUID' }).locator('input').first().fill('00000000-0000-0000-0000-000000000000');
			const cho = page.waitForResponse((r) => /report\/reports\/admin(\?|$)/.test(r.url()) && r.request().method() === 'POST', { timeout: 20_000 });
			const choMenu = page.waitForResponse((r) => /report\/reports\/menu/.test(r.url()), { timeout: 20_000 }).catch(() => null);
			await f.getByRole('button', { name: 'Lưu' }).click();
			const b = await (await cho).json();
			id = b?.data?.id ?? b?.data;
			const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
			const menu = await choMenu;
			ghiChu('đo', `${JSON.stringify(b?.status)} · id ${id} · "${tb}" · menu nạp lại: ${Boolean(menu)}`);
			expect(tb).toContain('Tạo báo cáo thành công');
			await expect(cfg.locator('.ant-table-tbody'), 'Danh sách cấu hình không có báo cáo vừa tạo').toContainText(ten, { timeout: 10_000 });
			expect(menu, 'Thanh báo cáo không nạp lại ngay').toBeTruthy();
			expect(JSON.stringify(await menu.json()), 'Thanh báo cáo (menu) chưa có báo cáo mới').toContain(ten);
		} finally {
			const kq = await require('./don-rac.tct.spec.js').donBaoCaoRac(page);
			ghiChu('xoá cấu hình rác', kq.kq.join(' ; ') || '(không có)');
		}
	});
});
