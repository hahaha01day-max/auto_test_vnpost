'use strict';

/**
 * 13_1 · Phiếu đề xuất đặt hàng — tạo / danh sách / sửa, vai `shop` (CHT điểm bán seed).
 *
 * Nguồn (vnpost-web af8cda07): `features/purchaseOrder/pages/{StockRequestListPage,StockRequestFormPage}.jsx`.
 * Route: `/inventory/purchase-request` · tạo `/inventory/purchase-request/create`.
 * 🔴 Phiếu đề xuất KHÔNG có chức năng xoá ⇒ phiếu `AUTO TEST 13_1` ở lại (nháp / chờ duyệt) ở điểm bán seed.
 *    Chờ duyệt = đi lên cấp trên (xã/tỉnh) — chỉ SP seed, SL nhỏ.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const { thongBaoQuanh, moDs, moTao, themSp, bam, timMa } = require('./dx-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const BASE = () => process.env.VNPOST_BASE_URL;
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const GHI_CHU = 'AUTO TEST 13_1';
const FILE = path.join(GOC, 'test-output', 'de-xuat-state.json');
const napTT = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } };
const luuTT = (p) => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify({ ...napTT(), ...p })); };
const SP = () => seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan;

test.describe('13_1 · phiếu đề xuất — CHT', () => {
	test('13_1_030_002 — Kiểm tra hiển thị màn hình', async ({ page }) => {
		chanNeuTat('13_1_030_002');
		await moTao(page);
		const noi = chuan(await khung(page).innerText());
		for (const t of ['Thông tin chung', 'Mã phiếu', 'Điểm bán / Kho nhận hàng', 'Ghi chú', 'Danh sách sản phẩm']) expect(noi, `Thiếu "${t}"`).toContain(t);
		for (const b of ['Huỷ', 'Lưu', 'Gửi phê duyệt']) await expect(page.getByRole('button', { name: new RegExp(`${b}$`) }).first()).toBeVisible();
		await expect(page.locator('.anticon-arrow-left').first(), 'Không có nút Quay lại').toBeVisible();
	});

	test('13_1_030_007 — Kiểm tra Mã phiếu tự sinh', async ({ page }) => {
		chanNeuTat('13_1_030_007');
		await moTao(page);
		const ma = await page.locator('#code').inputValue();
		const d = new Date();
		const tien = `DX${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
		test.info().annotations.push({ type: 'đo', description: ma });
		expect(ma.startsWith(tien), `Mã ${ma} không theo DX + yymmdd (${tien})`).toBe(true);
		expect(ma.slice(tien.length), 'Phần STT sau yymmdd không phải số').toMatch(/^\d+$/);
	});

	test('13_1_030_009 — Kiểm tra Chọn điểm bán', async ({ page }) => {
		chanNeuTat('13_1_030_009');
		await moTao(page);
		const o = page.locator('.ant-form-item').filter({ has: page.getByText('Điểm bán / Kho nhận hàng', { exact: true }) }).locator('.ant-select');
		const khoa = await o.evaluate((e) => e.className.includes('disabled'));
		test.info().annotations.push({ type: 'đo', description: `ô Điểm bán / Kho nhận hàng bị khoá với vai CHT: ${khoa}` });
		expect(khoa, '🔴 Vai CHT: ô "Điểm bán / Kho nhận hàng" bị khoá (cố định điểm bán) — không có popup "Chọn điểm bán / kho"').toBe(false);
		await o.click();
		const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ hasText: /Chọn điểm bán \/ kho/i }).last();
		await expect(dr, 'Không mở popup "Chọn điểm bán / kho"').toBeVisible({ timeout: 10_000 });
	});

	test('13_1_030_006 — Kiểm tra Bỏ trống trường bắt buộc', async ({ page }) => {
		chanNeuTat('13_1_030_006');
		const bi = [];
		page.on('request', (r) => { if (/\/stock-requests/.test(r.url()) && r.method() === 'POST') bi.push(r.url()); });
		await moTao(page);
		const kq = await bam(page, 'Lưu');
		test.info().annotations.push({ type: 'đo', description: kq.tb });
		expect(kq.tb).toContain('Vui lòng thêm ít nhất 1 sản phẩm');
		expect(bi).toEqual([]);
	});

	test('13_1_030_005 — Kiểm tra Nút " Huỷ"', async ({ page }) => {
		chanNeuTat('13_1_030_005');
		const bi = [];
		page.on('request', (r) => { if (/\/stock-requests/.test(r.url()) && r.method() === 'POST') bi.push(r.url()); });
		await moTao(page);
		const ma = await page.locator('#code').inputValue();
		await themSp(page);
		await page.getByRole('button', { name: 'Huỷ', exact: true }).click();
		await expect(page).toHaveURL(/purchase-request(\?|$)/, { timeout: 15_000 });
		expect(bi).toEqual([]);
		await expect(await timMa(page, ma)).toHaveCount(0);
	});

	test('13_1_030_008 — Kiểm tra Sửa Mã phiếu tự sinh', async ({ page }) => {
		chanNeuTat('13_1_030_008');
		await moTao(page);
		const ma = `DXAUTO${Date.now().toString().slice(-7)}`;
		await page.locator('#code').fill(ma);
		await page.locator('#note').fill(GHI_CHU);
		await themSp(page);
		const kq = await bam(page, 'Lưu');
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb: kq.tb, code: kq.body?.data?.code }) });
		expect(kq.tb).toContain('Đã tạo phiếu đề xuất thành công');
		expect(kq.body?.data?.code, 'Mã phiếu lưu ≠ mã đã sửa').toBe(ma);
		luuTT({ maSua: ma });
	});

	test('13_1_030_003 — Kiểm tra Tạo phiếu đề xuất đặt hàng nháp', async ({ page }) => {
		chanNeuTat('13_1_030_003');
		await moTao(page);
		const ma = await page.locator('#code').inputValue();
		await page.locator('#note').fill(GHI_CHU);
		await themSp(page);
		const kq = await bam(page, 'Lưu');
		expect(kq.tb).toContain('Đã tạo phiếu đề xuất thành công');
		luuTT({ maNhap: ma });
		const r = (await timMa(page, ma)).first();
		await expect(r).toBeVisible({ timeout: 15_000 });
		await expect(r).toContainText(/nháp/i);
	});

	test('13_1_030_004 — Kiểm tra Tạo phiếu đề xuất đặt hàng', async ({ page }) => {
		chanNeuTat('13_1_030_004');
		await moTao(page);
		const ma = await page.locator('#code').inputValue();
		await page.locator('#note').fill(GHI_CHU);
		await themSp(page, SP().tenSanPham, 2);
		const kq = await bam(page, 'Gửi phê duyệt');
		test.info().annotations.push({ type: 'đo', description: kq.tb });
		expect(kq.tb).toContain('Gửi phê duyệt thành công');
		luuTT({ maCho: ma });
		const r = (await timMa(page, ma)).first();
		await expect(r).toBeVisible({ timeout: 15_000 });
		await expect(r).toContainText(/Chờ duyệt/);
	});

	// ── Danh sách ─────────────────────────────────────────────────────────────────────────
	test('13_1_040_002 — Xem chi tiết phiếu đề xuất khi có dữ liệu', async ({ page }) => {
		chanNeuTat('13_1_040_002');
		await moDs(page);
		const noi = chuan(await khung(page).innerText());
		for (const t of ['Mã phiếu', 'Tất cả trạng thái', 'Khoảng thời gian']) expect(noi, `Thiếu "${t}"`).toContain(t);
		await khung(page).locator('.ant-picker-range').click();
		const moc = (await page.locator('.ant-picker-presets li').allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'đo', description: moc.join(' | ') });
		expect(moc).toEqual(expect.arrayContaining(['Hôm nay', '7 ngày qua', '30 ngày qua']));
	});

	test('13_1_040_003 — Kiểm tra tìm kiếm theo Mã phiếu', async ({ page }) => {
		chanNeuTat('13_1_040_003');
		const ma = napTT().maNhap;
		test.skip(!ma, 'Không có phiếu nháp từ 13_1_030_003.');
		await moDs(page);
		const r = await timMa(page, ma);
		await expect(r).toHaveCount(1);
		expect(await dong(page).count(), 'Tìm theo mã mà còn phiếu khác').toBe(1);
	});

	test('13_1_040_009 — Kiểm tra Tìm kiếm với từ khóa không tồn tại', async ({ page }) => {
		chanNeuTat('13_1_040_009');
		await moDs(page);
		await timMa(page, 'DXKHONGCO999');
		await expect(dong(page)).toHaveCount(0);
		await expect(khung(page).locator('.ant-empty')).toBeVisible();
	});

	test('13_1_040_004 — Kiểm tra lọc theo Trạng thái', async ({ page }) => {
		chanNeuTat('13_1_040_004');
		await moDs(page);
		const o = khung(page).locator('.ant-select').filter({ hasText: 'Tất cả trạng thái' }).first();
		await o.click();
		const opts = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(chuan);
		const chon = opts.find((x) => /Chờ duyệt/.test(x)) || opts[0];
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: chon }).first().click();
		const cho = page.waitForResponse((r) => /\/stock-requests\?/.test(r.url()), { timeout: 20_000 });
		await khung(page).getByRole('button', { name: 'Tìm kiếm' }).click();
		const res = await cho;
		await page.waitForTimeout(1_000);
		const tt = (await dong(page).allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ opts, chon, url: res.url().replace(/.*__api/, ''), n: tt.length }) });
		expect(tt.length, `Không có phiếu "${chon}" để đối chiếu`).toBeGreaterThan(0);
		for (const t of tt) expect(t, 'Dòng không thuộc trạng thái đã lọc').toContain(chon);
	});

	test('13_1_040_005 — Kiểm tra tìm Lọc theo Khoảng thời gian (Từ ngày - Đến ngày)', async ({ page }) => {
		chanNeuTat('13_1_040_005');
		await moDs(page);
		await khung(page).locator('.ant-picker-range').click();
		await page.locator('.ant-picker-presets li').filter({ hasText: 'Hôm nay' }).click();
		const cho = page.waitForResponse((r) => /\/stock-requests\?/.test(r.url()), { timeout: 20_000 });
		await khung(page).getByRole('button', { name: 'Tìm kiếm' }).click();
		const res = await cho;
		await page.waitForTimeout(1_000);
		const d = new Date();
		const hn = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
		const tt = (await dong(page).allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ url: res.url().replace(/.*__api/, ''), n: tt.length }) });
		expect(tt.length, 'Hôm nay có phiếu (13_1_030_*) mà lọc ra rỗng').toBeGreaterThan(0);
		for (const t of tt) expect(t, 'Có phiếu ngoài khoảng Hôm nay').toContain(hn);
	});

	test('13_1_040_008 — Kiểm tra Xoá lọc', async ({ page }) => {
		chanNeuTat('13_1_040_008');
		await moDs(page);
		const tong = await dong(page).count();
		await timMa(page, 'DXKHONGCO999');
		await khung(page).getByRole('button', { name: 'Xóa lọc' }).click();
		await page.waitForTimeout(2_000);
		expect(await khung(page).locator('#keyword').inputValue()).toBe('');
		expect(await dong(page).count(), 'Xoá lọc không hiện lại danh sách').toBe(tong);
	});

	test('13_1_040_010 — Kiểm tra hiển thị tổng số phiếu', async ({ page }) => {
		chanNeuTat('13_1_040_010');
		const res = page.waitForResponse((r) => /\/stock-requests\?/.test(r.url()), { timeout: 60_000 });
		await moDs(page);
		const body = await (await res).json().catch(() => ({}));
		const tong = body?.page?.total_elements;
		await expect(khung(page)).toContainText(`(${tong} phiếu)`, { timeout: 15_000 }).catch(() => {});
		const noi = chuan(await khung(page).innerText());
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tong, trich: noi.match(/\d+\s*phiếu/)?.[0], phanTrang: noi.match(/\d+-\d+ trên \d+/)?.[0] }) });
		expect(noi, 'Con số tổng số phiếu không khớp total_elements').toMatch(new RegExp(`(^|\\D)${tong}(\\D|$)`));
	});

	test('13_1_040_012 — Kiểm tra Nút làm mới', async ({ page }) => {
		chanNeuTat('13_1_040_012');
		await moDs(page);
		const cho = page.waitForResponse((r) => /\/stock-requests\?/.test(r.url()), { timeout: 20_000 });
		await khung(page).locator('.ant-pro-table-list-toolbar-setting-item .anticon-reload').first().click();
		expect((await cho).status()).toBe(200);
	});

	test('13_1_040_014 — Kiểm tra Nút tách, gộp, chỉnh sửa', async ({ page }) => {
		chanNeuTat('13_1_040_014');
		const t = napTT();
		test.skip(!t.maNhap, 'Không có phiếu nháp.');
		await moDs(page);
		const r = (await timMa(page, t.maNhap)).first();
		const nut = await r.locator('td').last().locator('button').evaluateAll((l) => l.map((e) => [e.innerHTML.match(/anticon-([a-z-]+)/)?.[1], e.disabled]));
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(nut) });
		expect(nut.some(([ic, dis]) => ic === 'edit' && !dis), 'Phiếu nháp không có nút sửa bấm được').toBe(true);
	});

	// ── Sửa ──────────────────────────────────────────────────────────────────────────────
	async function moSua(page, ma) {
		await moDs(page);
		const r = (await timMa(page, ma)).first();
		// 🔴 Đo 24/09: với vai CHT cột "Hành động" TRỐNG (3 ô space rỗng) kể cả phiếu nháp của chính mình.
		const nut = r.locator('button:has(.anticon-edit)').first();
		expect(await nut.count(), '🔴 Vai CHT không có nút "Chỉnh sửa phiếu" (cột Hành động trống) — không sửa được phiếu đề xuất').toBeGreaterThan(0);
		await nut.click();
		await expect(page.locator('#code')).toHaveValue(ma, { timeout: 30_000 });
	}

	test('13_1_060_001 — Kiểm tra hiển thị màn hình', async ({ page }) => {
		chanNeuTat('13_1_060_001');
		const ma = napTT().maNhap;
		test.skip(!ma, 'Không có phiếu nháp.');
		await moSua(page, ma);
		const nut = (await page.getByRole('button').allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'đo', description: nut.join(' | ') });
		expect(nut).toEqual(expect.arrayContaining(['Cập nhật', 'Gửi phê duyệt']));
		expect(nut.some((x) => /Hủy|Huỷ/.test(x))).toBe(true);
	});

	test('13_1_060_004 — Kiểm tra Nút " Huỷ"', async ({ page }) => {
		chanNeuTat('13_1_060_004');
		const ma = napTT().maNhap;
		test.skip(!ma, 'Không có phiếu nháp.');
		const bi = [];
		page.on('request', (r) => { if (/\/stock-requests/.test(r.url()) && r.method() === 'PUT') bi.push(r.url()); });
		await moSua(page, ma);
		await page.locator('#note').fill(`${GHI_CHU} SUA_HUY`);
		await page.getByRole('button', { name: /^(Hủy|Huỷ)$/ }).click();
		await expect(page).toHaveURL(/purchase-request(\?|$)/, { timeout: 15_000 });
		expect(bi).toEqual([]);
	});

	test('13_1_060_002 — Kiểm tra Sửa phiếu đề xuất đặt hàng nháp', async ({ page }) => {
		chanNeuTat('13_1_060_002');
		const ma = napTT().maNhap;
		test.skip(!ma, 'Không có phiếu nháp.');
		await moSua(page, ma);
		await page.locator('#note').fill(`${GHI_CHU} DA_SUA`);
		const kq = await bam(page, 'Cập nhật');
		expect(kq.tb).toContain('Cập nhật phiếu thành công');
		const r = (await timMa(page, ma)).first();
		await expect(r).toContainText(/nháp/i);
	});

	test('13_1_060_003 — Kiểm tra Sửa phiếu đề xuất đặt hàng trạng thái chờ duyệt', async ({ page }) => {
		chanNeuTat('13_1_060_003');
		const ma = napTT().maCho;
		test.skip(!ma, 'Không có phiếu chờ duyệt từ 13_1_030_004.');
		await moDs(page);
		const r = (await timMa(page, ma)).first();
		const sua = r.locator('button:has(.anticon-edit)').first();
		const coSua = (await sua.count()) > 0 && !(await sua.isDisabled());
		test.info().annotations.push({ type: 'đo', description: `nút sửa phiếu chờ duyệt bấm được: ${Boolean(coSua)}` });
		expect(Boolean(coSua), 'Phiếu chờ duyệt không sửa được (kịch bản: sửa được, giữ Chờ duyệt)').toBe(true);
		await sua.click();
		await expect(page.locator('#code')).toHaveValue(ma, { timeout: 30_000 });
		await page.locator('#note').fill(`${GHI_CHU} SUA_CHO`);
		const kq = await bam(page, 'Cập nhật');
		expect(kq.tb).toContain('Cập nhật phiếu thành công');
		await expect((await timMa(page, ma)).first()).toContainText(/Chờ duyệt/);
	});

	test('13_1_060_005 — Kiểm tra Bỏ trống trường bắt buộc', async ({ page }) => {
		chanNeuTat('13_1_060_005');
		const ma = napTT().maNhap;
		test.skip(!ma, 'Không có phiếu nháp.');
		const bi = [];
		page.on('request', (r) => { if (/\/stock-requests/.test(r.url()) && r.method() === 'PUT') bi.push(r.url()); });
		await moSua(page, ma);
		for (const x of await page.locator('.ant-table-tbody tr.ant-table-row button:has(.anticon-delete)').all()) await x.click().catch(() => {});
		const kq = await bam(page, 'Cập nhật');
		test.info().annotations.push({ type: 'đo', description: kq.tb });
		expect(kq.tb).toContain('Vui lòng thêm ít nhất 1 sản phẩm');
		expect(bi).toEqual([]);
	});

	test('13_1_060_006 — Kiểm tra Sửa Mã phiếu tự sinh', async ({ page }) => {
		chanNeuTat('13_1_060_006');
		const ma = napTT().maSua;
		test.skip(!ma, 'Không có phiếu từ 13_1_030_008.');
		await moSua(page, ma);
		const oMa = page.locator('#code');
		const khoa = await oMa.isDisabled();
		const moi = `${ma}S`;
		if (!khoa) await oMa.fill(moi);
		const kq = await bam(page, 'Cập nhật');
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ khoa, tb: kq.tb }) });
		expect(khoa, 'Ô Mã phiếu khoá khi sửa (kịch bản: đổi được mã)').toBe(false);
		expect(kq.tb).toContain('Cập nhật phiếu thành công');
		await expect(await timMa(page, moi)).toHaveCount(1);
		luuTT({ maSua: moi });
	});

	test('13_1_060_007 — Kiểm tra Chọn điểm bán', async ({ page }) => {
		chanNeuTat('13_1_060_007');
		const ma = napTT().maNhap;
		test.skip(!ma, 'Không có phiếu nháp.');
		await moSua(page, ma);
		await page.locator('.ant-form-item').filter({ has: page.getByText('Điểm bán / Kho nhận hàng', { exact: true }) }).locator('.ant-select').click();
		const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ hasText: /Chọn điểm bán \/ kho/i }).last();
		await expect(dr, 'Không mở popup "Chọn điểm bán / kho"').toBeVisible({ timeout: 10_000 });
	});
});
