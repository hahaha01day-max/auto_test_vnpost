'use strict';

/**
 * 13_2 · 020 điều kiện gộp · 030 lịch sử gộp / tách — vai `province` (tỉnh seed).
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/purchaseOrder/pages/StockRequestListPage.jsx` (nút "+" chỉ bật
 * khi PENDING / APPROVED, `type=primary` khi đã chọn, "Gộp phiếu (n)"; n < 2 ⇒ "Cần chọn ít nhất 2 phiếu để gộp!"),
 * `StockRequestHistoryDrawer.jsx` (timeline: nhãn Gộp/Tách · thời gian · "Phiếu nguồn" · "Phiếu kết quả").
 * Tiền đề lịch sử dựng trong case bằng helper 13_1 (`gop-tach-ghi.js`): CHT lập → xã duyệt → tỉnh gộp / tách.
 * 🔴 Phiếu KHÔNG xoá được ⇒ phiếu `AUTO TEST 13_1` ở lại.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
const g = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/gop-tach-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const trangThaiDong = async (r) => dx.chuan(await r.locator('.ant-tag').last().innerText().catch(() => ''));

test('13_2_020_001 — Kiểm tra điều kiện gộp phiếu', async ({ page }) => {
	chanNeuTat('13_2_020_001');
	test.setTimeout(180_000);
	await page.addInitScript(() => sessionStorage.removeItem('__sofin_mergeList'));
	await dx.moDs(page, 'province');
	const k = dx.khung(page);
	// Lấy trang 100 dòng để có đủ các trạng thái.
	const cho = page.waitForResponse((r) => /\/stock-requests\?/.test(r.url()) && r.url().includes('size=100'), { timeout: 30_000 });
	await k.locator('.ant-pagination-options .ant-select').click();
	await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: '100' }).click();
	await cho;
	await page.waitForTimeout(800);
	const dongs = dx.dong(page);
	const n = await dongs.count();
	const theoTT = {};
	for (let i = 0; i < n; i++) {
		const r = dongs.nth(i);
		const tt = await trangThaiDong(r);
		const nut = r.locator('button:has(.anticon-plus)');
		(theoTT[tt] ||= []).push({ r, bat: await nut.isEnabled() });
	}
	test.info().annotations.push({ type: 'đo', description: Object.entries(theoTT).map(([t, a]) => `${t}: ${a.length} dòng, bật ${a.filter((x) => x.bat).length}`).join(' · ') });
	const hopLe = [...(theoTT['Chờ duyệt'] || []), ...(theoTT['Đã duyệt'] || [])];
	const khongHopLe = Object.entries(theoTT).filter(([t]) => !['Chờ duyệt', 'Đã duyệt'].includes(t));
	expect(hopLe.length, 'Tỉnh không có phiếu Chờ duyệt / Đã duyệt nào để kiểm').toBeGreaterThan(1);
	expect(khongHopLe.length, 'Không có phiếu trạng thái khác (nháp / huỷ / đã tách / đã gộp) để kiểm nút bị khoá').toBeGreaterThan(0);
	for (const x of hopLe) expect(x.bat, 'Phiếu Chờ duyệt / Đã duyệt mà nút + bị khoá').toBe(true);
	for (const [t, a] of khongHopLe) for (const x of a) expect(x.bat, `Phiếu "${t}" vẫn bấm được nút + gộp`).toBe(false);

	// Chọn 1 phiếu: nút đổi màu, "Gộp phiếu (1)" không mở được màn gộp.
	const n1 = hopLe[0].r.locator('button:has(.anticon-plus)');
	await n1.click();
	await expect(n1, 'Đã chọn mà nút + không đổi màu (primary)').toHaveClass(/ant-btn-primary|ant-btn-color-primary.*solid|ant-btn-variant-solid/);
	const gop1 = page.getByRole('button', { name: /Gộp phiếu \(1\)/ });
	await expect(gop1).toBeVisible();
	const tb = await dx.thongBaoQuanh(page, () => gop1.click());
	expect(tb).toContain('Cần chọn ít nhất 2 phiếu để gộp!');
	await expect(page).not.toHaveURL(/purchase-request\/merge/);
	// Chọn thêm phiếu thứ 2 ⇒ mở được màn gộp.
	await hopLe[1].r.locator('button:has(.anticon-plus)').click();
	await page.getByRole('button', { name: /Gộp phiếu \(2\)/ }).click();
	await expect(page).toHaveURL(/purchase-request\/merge/, { timeout: 20_000 });
	await expect(page.getByText('Gộp phiếu đề xuất nhập hàng').first()).toBeVisible();
	await page.evaluate(() => sessionStorage.removeItem('__sofin_mergeList'));
});

test.describe.serial('13_2 · 030 lịch sử gộp / tách', () => {
	/** { gop: {nguon:[a,b], ketQua}, tach: {goc, con:[...]} } — dựng 1 lần cho cả nhóm. */
	let ls = null;
	async function dung(page, browser) {
		if (ls) return ls;
		const [a, b, c] = await g.phieuDaDuyet(browser, [1, 2, 4]);
		await g.moGop(page, [a, b]);
		const l = await g.luuGop(page);
		expect(l.tb, 'Gộp tiền đề không thành công').toContain('Gộp phiếu thành công!');
		const m = l.body?.data?.code;
		expect(m, 'Response gộp không trả mã phiếu').toMatch(/^DX/);
		await g.moTach(page, c);
		await g.nhapTach(page, [3, 1]);
		const t = await g.guiTach(page, 'Lưu nháp');
		expect(t.tb, 'Tách tiền đề không thành công').toContain('Tách phiếu thành công!');
		ls = { gop: { nguon: [a, b], ketQua: m }, tach: { goc: c, con: t.gui.splitGroups.map((x) => x.code) } };
		test.info().annotations.push({ type: 'tiền đề', description: JSON.stringify(ls) });
		return ls;
	}
	async function moLichSu(page, ma) {
		await dx.moChiTiet(page, ma, 'province');
		await page.getByText('Lịch sử gộp, tách').click();
		const d = page.locator('.ant-drawer-open').filter({ hasText: 'Lịch sử gộp / tách phiếu' }).last();
		await expect(d.locator('.ant-timeline-item').first(), `Lịch sử của ${ma} trống`).toBeVisible({ timeout: 20_000 });
		return d;
	}

	test('13_2_030_001 — Kiểm tra hiển thị màn hình', async ({ page, browser }) => {
		chanNeuTat('13_2_030_001');
		test.setTimeout(480_000);
		const x = await dung(page, browser);
		const d = await moLichSu(page, x.gop.ketQua);
		const noi = dx.chuan(await d.innerText());
		test.info().annotations.push({ type: 'đo', description: noi.slice(0, 500) });
		expect(noi).toContain('Lịch sử gộp / tách phiếu');
		expect(noi, 'Thiếu nhãn hành động').toContain('Gộp phiếu');
		expect(noi, 'Thiếu thời gian thao tác').toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
		expect(noi).toContain('Phiếu nguồn');
		expect(noi).toContain('Phiếu kết quả');
		expect(noi, 'Thiếu trạng thái phiếu trong lịch sử').toMatch(/Đã gộp|Chờ duyệt|Đã duyệt|Nháp/);
	});

	test('13_2_030_002 — Kiểm tra Lịch sử gộp/ tách phiếu', async ({ page, browser }) => {
		chanNeuTat('13_2_030_002');
		test.setTimeout(480_000);
		const x = await dung(page, browser);
		// Gộp: từ phiếu kết quả tra ngược ra đủ phiếu nguồn, và từ phiếu nguồn tra xuôi ra phiếu kết quả.
		let d = await moLichSu(page, x.gop.ketQua);
		let noi = dx.chuan(await d.innerText());
		test.info().annotations.push({ type: 'đo', description: `gộp ${x.gop.ketQua}: ${noi.slice(0, 400)}` });
		for (const m of x.gop.nguon) expect(noi, `Lịch sử phiếu gộp thiếu phiếu nguồn ${m}`).toContain(m);
		expect(noi).toContain(`được gộp thành phiếu ${x.gop.ketQua}`);
		d = await moLichSu(page, x.gop.nguon[0]);
		expect(dx.chuan(await d.innerText()), 'Từ phiếu nguồn không tra ra phiếu gộp').toContain(x.gop.ketQua);
		// Tách: từ phiếu gốc ra đủ phiếu kết quả.
		d = await moLichSu(page, x.tach.goc);
		noi = dx.chuan(await d.innerText());
		test.info().annotations.push({ type: 'đo', description: `tách ${x.tach.goc}: ${noi.slice(0, 400)}` });
		expect(noi).toContain('Tách phiếu');
		for (const m of x.tach.con) expect(noi, `Lịch sử phiếu gốc thiếu phiếu tách ${m}`).toContain(m);
		expect(noi, 'Không hiện trạng thái các phiếu').toMatch(/Đã tách|Nháp/);
	});
});
