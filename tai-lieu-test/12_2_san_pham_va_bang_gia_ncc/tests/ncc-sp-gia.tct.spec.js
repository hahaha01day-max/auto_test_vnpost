'use strict';

/**
 * 12_2 — Sản phẩm NCC (mapping, lịch sử giá, nhập Excel) + Bảng giá NCC (nháp/ban hành/huỷ) — vai `tct`.
 * Xem `ncc-ghi.js` về vật thử và phạm vi. Case validate Excel CHẶN request ghi ở mạng, đo payload.
 * 🔴 Worker khởi động lại sau case đỏ ⇒ trạng thái dùng chung ghi ra file.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const ExcelJS = require('exceljs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const n = require('./ncc-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const FILE = path.join(GOC, 'test-output', 'ncc-state.json');
const napTT = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } };
const luuTT = (p) => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify({ ...napTT(), ...p })); };
const TEN = (x) => `${seed.PREFIX}BGN_${x}${n.hau()}`;
const FIFO_RAC = { ten: 'AUTO8_SP_FIFO_55976508', sku: 'AUTO8SKUFIFO55976508' };

async function taoXlsx(dong, header) {
	const w = new ExcelJS.Workbook();
	const s = w.addWorksheet('Sheet1');
	s.addRow(header || ['SKU', 'Giá nhập sau VAT', 'VAT (%)', 'Loại giá (STANDARD/PROMO/BONUS)', 'SL tối thiểu', 'SL tặng (chỉ dùng cho BONUS)', 'Mô tả']);
	for (const d of dong) s.addRow(d);
	const f = path.join(GOC, 'test-output', `ncc-${Date.now()}.xlsx`);
	fs.mkdirSync(path.dirname(f), { recursive: true });
	await w.xlsx.writeFile(f);
	return f;
}

/** Mở modal Excel của drawer Thêm/Cập nhật SP, chọn chế độ, nạp file. */
async function napExcel(page, { cheDo = 'Khai báo sản phẩm và giá', dong, header }) {
	await n.moSanPham(page);
	const dr = await n.moThem(page);
	await dr.getByRole('button', { name: 'Nhập từ Excel' }).click();
	const m = page.locator('.ant-drawer-open').filter({ hasText: 'Nhập sản phẩm NCC từ Excel' }).last();
	await expect(m).toBeVisible();
	await m.getByText(cheDo, { exact: true }).click();
	await m.locator('input[type=file]').first().setInputFiles(await taoXlsx(dong, header));
	await expect(m.getByRole('button', { name: /Xác nhận \(\d+ dòng\)/ })).not.toHaveText('Xác nhận (0 dòng)', { timeout: 20_000 }).catch(() => {});
	await page.waitForTimeout(1_500);
	return m;
}

async function tabDem(m) {
	const t = (await m.getByRole('tab').allInnerTexts()).map(n.chuan);
	const lay = (k) => Number((t.find((x) => x.startsWith(k)) || '').match(/\((\d+)\)/)?.[1] ?? NaN);
	return { tabs: t, daMap: lay('SKU đã mapping'), chuaMap: lay('SKU chưa mapping'), chuaKhai: lay('SKU chưa khai báo') };
}

/** Chặn POST ghi của modal Excel; trả mảng payload bị chặn. */
async function chanGhi(page) {
	const bi = [];
	await page.route('**/__api/**', (route) => {
		const r = route.request();
		// `mapping-status` là POST CHỈ ĐỌC (tra trạng thái SKU) — cho qua, chặn là hỏng phân tab.
		if (r.method() !== 'GET' && /supplier-products|supplier-price-lists/.test(r.url()) && !/mapping-status|consignment-conflicts/.test(r.url())) {
			bi.push(`${r.method()} ${r.url().replace(/.*__api/, '')} ${r.postData()?.slice(0, 400)}`);
			return route.fulfill({ status: 403, contentType: 'application/json', body: '{"status":{"code":"403","message":"Bị auto test chặn"}}' });
		}
		return route.continue();
	});
	return bi;
}

async function xacNhan(page, m) {
	const nut = m.getByRole('button', { name: /Xác nhận \(\d+ dòng\)/ });
	if (await nut.isDisabled()) {
		// FE khoá nút khi có dòng lỗi — trả kèm lỗi hiển thị trong bảng xem trước để phép kiểm đọc được.
		return n.chuan(`(nút Xác nhận bị khoá) ${(await m.locator('.ant-alert, .ant-tag-error, .ant-tag-red, [class*="error"]').allInnerTexts()).join(' | ')}`);
	}
	return n.thongBaoQuanh(page, () => nut.click());
}

test.describe('12_2 · sản phẩm & bảng giá NCC (tct)', () => {
	// ── Màn sản phẩm NCC ─────────────────────────────────────────────────────────────────
	test('12_2_020_001 — Kiểm tra hiển thị màn hình', async ({ page }) => {
		chanNeuTat('12_2_020_001');
		await n.moSanPham(page);
		for (const b of ['Bảng giá', 'Thêm mới / Cập nhật SP']) await expect(n.khung(page).getByRole('button', { name: b })).toBeVisible();
		const dr = await n.moThem(page);
		const th = (await dr.locator('.ant-table-thead th').allInnerTexts()).map(n.chuan).filter(Boolean);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ th, nut: await dr.getByRole('button').allInnerTexts() }) });
		expect(th).toEqual(expect.arrayContaining(['Sản phẩm', 'SKU', 'Đơn vị tính', 'Mặc định']));
		await expect(dr.getByRole('button', { name: 'Nhập từ Excel' })).toBeVisible();
		await expect(dr.locator('.ant-drawer-close')).toBeVisible();
	});

	for (const [id, cheDo, tu] of [['12_2_020_003', 'Tên SP', 'AUTO8_SP_TC_55976508'], ['12_2_020_004', 'SKU', 'AUTO8SKUTC55976508'], ['12_2_020_005', 'Barcode', 'AUTO8SKUTC55976508']]) {
		test(`${id} — Tìm kiếm sản phẩm bằng ${cheDo}`, async ({ page }) => {
			chanNeuTat(id);
			await n.moSanPham(page);
			const dr = await n.moThem(page);
			const oCheDo = dr.locator('.ant-select').filter({ hasText: /Tên SP|SKU|Barcode|Mã vạch/ }).first();
			await oCheDo.click();
			const opts = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(n.chuan);
			test.info().annotations.push({ type: 'đo', description: `chế độ tìm: ${opts.join(' | ')}` });
			const muc = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(cheDo === 'Barcode' ? 'Barcode|Mã vạch' : `^${cheDo}$`, 'i') });
			expect(await muc.count(), `Ô tìm không có chế độ "${cheDo}" (đang có: ${opts.join(', ')})`).toBeGreaterThan(0);
			await muc.first().click();
			const o = dr.getByPlaceholder('Tìm và thêm sản phẩm');
			await o.click();
			await o.fill(tu);
			await expect(page.getByText('AUTO8_SP_TC_55976508', { exact: true }).last(), `Tìm theo ${cheDo} "${tu}" không ra sản phẩm`).toBeVisible({ timeout: 20_000 });
		});
	}

	test('12_2_020_002 — Kiểm tra Thêm / Cập nhật sản phẩm NCC', async ({ page }) => {
		chanNeuTat('12_2_020_002');
		const { vatThu } = n.duLieu();
		await n.moSanPham(page);
		if (await (await n.timSp(page, vatThu.sku)).count()) await n.xoaMap(page, vatThu.sku);
		const tb = await n.mapVatThu(page);
		expect(tb).toContain('Cập nhật sản phẩm thành công');
		luuTT({ daMap: true });
		await expect((await n.timSp(page, vatThu.sku)).first(), 'SP vừa thêm không hiện ở danh sách').toBeVisible({ timeout: 15_000 });
	});

	test('12_2_010_002 — Kiểm tra xem lịch sử giá của sản phẩm', async ({ page }) => {
		chanNeuTat('12_2_010_002');
		const { tc } = n.duLieu();
		await n.moSanPham(page);
		const d = (await n.timSp(page, tc.sku)).first();
		await d.getByRole('button', { name: 'Lịch sử giá' }).click();
		const dr = page.locator('.ant-drawer-open').last();
		// Lịch sử hiển thị dạng Timeline (`PriceHistoryDrawer.jsx`), rỗng thì "Chưa có lịch sử giá".
		await expect(dr.locator('.ant-timeline-item').first(), 'Lịch sử giá SKU seed (đã có bảng giá ban hành) rỗng').toBeVisible({ timeout: 20_000 });
		const noi = n.chuan(await dr.innerText());
		test.info().annotations.push({ type: 'đo', description: noi.slice(0, 500) });
		expect(noi).toContain('60.000');
	});

	test('12_2_010_005 — Kiểm tra huỷ xoá sản phẩm', async ({ page }) => {
		chanNeuTat('12_2_010_005');
		const { vatThu } = n.duLieu();
		test.skip(!napTT().daMap, 'Chưa map vật thử (12_2_020_002).');
		await n.moSanPham(page);
		const d = (await n.timSp(page, vatThu.sku)).first();
		await d.getByRole('button', { name: 'Xoá' }).click();
		const pop = page.locator('.ant-popover:visible').filter({ hasText: 'Xác nhận xoá?' }).last();
		await pop.getByRole('button').first().click();
		await expect(pop).toBeHidden();
		await expect((await n.timSp(page, vatThu.sku)).first(), 'Huỷ xoá mà sản phẩm mất khỏi danh sách').toBeVisible();
	});

	// ── Bảng giá NCC ─────────────────────────────────────────────────────────────────────
	test('12_2_040_002 — Kiểm tra hiển thị màn hình', async ({ page }) => {
		chanNeuTat('12_2_040_002');
		await n.moBangGia(page);
		const k = n.khung(page);
		await expect(k).toContainText('Bảng giá nhà cung cấp');
		await expect(k.getByRole('button', { name: /Tạo bảng giá/ })).toBeVisible();
		await expect(k.locator('.ant-select').filter({ hasText: 'Lọc theo bưu điện tỉnh' })).toBeVisible();
		const th = (await k.locator('.ant-table-thead th').allInnerTexts()).map(n.chuan).filter(Boolean);
		test.info().annotations.push({ type: 'đo', description: th.join(' · ') });
		expect(th).toEqual(expect.arrayContaining(['Mã', 'Tên bảng giá', 'Trạng thái', 'Hiệu lực từ', 'Đến', 'Hành động']));
	});

	test('12_2_040_003 — Kiểm tra hiển thị màn hình Tạo bảng giá mới', async ({ page }) => {
		chanNeuTat('12_2_040_003');
		await n.moBangGia(page);
		const dr = await n.moTaoBangGia(page);
		const noi = n.chuan(await dr.innerText());
		test.info().annotations.push({ type: 'đo', description: noi.slice(0, 600) });
		for (const t of ['Tên bảng giá', 'Thời gian hiệu lực', 'Ghi chú', 'Hợp đồng nhà cung cấp', 'Phạm vi áp dụng']) expect(noi, `Thiếu "${t}"`).toContain(t);
	});

	for (const [id, loai, coSl] of [['12_2_040_009', 'Giá gốc', false], ['12_2_040_010', 'Khuyến mại', true]]) {
		test(`${id} — Kiểm tra thêm sản phẩm loại ${loai}`, async ({ page }) => {
			chanNeuTat(id);
			const { vatThu } = n.duLieu();
			await n.moBangGia(page);
			const dr = await n.moTaoBangGia(page);
			await dr.getByRole('button', { name: 'Thêm dòng' }).click();
			const r = n.dongBang(dr).last();
			await r.getByPlaceholder('Nhập SKU').fill(vatThu.sku);
			await r.locator('.ant-select').first().click();
			await page.locator('.ant-select-item-option').filter({ hasText: new RegExp(`^${loai}$`), visible: true }).first().click();
			const oSl = await r.getByPlaceholder('SL ≥').count();
			const th = (await dr.locator('.ant-table-thead th').allInnerTexts()).map(n.chuan);
			test.info().annotations.push({ type: 'đo', description: JSON.stringify({ oSlToiThieu: oSl, cot: th }) });
			expect(th.some((x) => /SL tặng/.test(x)), 'Có cột "SL tặng" (kịch bản: loại này không hiện SL tặng)').toBe(false);
			expect(oSl > 0, coSl ? 'Loại Khuyến mại không có ô SL áp dụng (tối thiểu)' : 'Loại Giá gốc vẫn hiện ô SL tối thiểu').toBe(coSl);
		});
	}

	test('12_2_040_011 — Kiểm tra thêm sản phẩm loại giá tặng hàng', async ({ page }) => {
		chanNeuTat('12_2_040_011');
		await n.moBangGia(page);
		const dr = await n.moTaoBangGia(page);
		await dr.getByRole('button', { name: 'Thêm dòng' }).click();
		await n.dongBang(dr).last().locator('.ant-select').first().click();
		const opts = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(n.chuan);
		test.info().annotations.push({ type: 'đo', description: `Loại giá: ${opts.join(' | ')}` });
		expect(opts, '🔴 Form bảng giá không có loại "Tặng hàng" (chỉ Giá gốc/Khuyến mại) — mẫu Excel vẫn nhắc BONUS').toEqual(expect.arrayContaining([expect.stringMatching(/Tặng/)]));
	});

	test('12_2_040_005 — Kiểm tra Tạo bảng giá nháp', async ({ page }) => {
		chanNeuTat('12_2_040_005');
		test.setTimeout(180_000);
		test.skip(!napTT().daMap, 'Chưa map vật thử (12_2_020_002) — SKU chưa phân bổ cho NCC.');
		const { vatThu } = n.duLieu();
		const ten = TEN('A');
		await n.moBangGia(page);
		const dr = await n.moTaoBangGia(page);
		await n.dienBangGia(page, dr, { ten, sku: vatThu.sku, gia: 11_111 });
		const kq = await n.luuBangGia(page, dr);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb: kq.tb, http: kq.res?.status() }) });
		expect(kq.res?.status(), kq.tb).toBeLessThan(400);
		luuTT({ bgA: ten });
		await n.moBangGia(page);
		await expect(n.dongBangGia(page, ten)).toContainText('Nháp', { timeout: 20_000 });
	});

	test('12_2_040_004 — Kiểm tra danh sách bảng giá tổng công ty', async ({ page }) => {
		chanNeuTat('12_2_040_004');
		const { bangGiaSeed } = n.duLieu();
		const t = napTT();
		test.skip(!t.bgA, 'Không có bảng giá nháp từ 12_2_040_005.');
		await n.moBangGia(page);
		const nhap = (await n.dongBangGia(page, t.bgA).getByRole('button').allInnerTexts()).map(n.chuan).filter(Boolean);
		const banHanh = (await n.dongBangGia(page, bangGiaSeed).getByRole('button').allInnerTexts()).map(n.chuan).filter(Boolean);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ nhap, banHanh }) });
		expect(nhap).toEqual(expect.arrayContaining(['Xem', 'Sửa', 'Ban hành']));
		expect(banHanh).toEqual(expect.arrayContaining(['Xem', 'Hủy']));
		expect(banHanh, 'Bảng đã ban hành vẫn có nút Sửa/Ban hành').not.toEqual(expect.arrayContaining(['Ban hành']));
	});

	test('12_2_040_006 — Kiểm tra Ban hành bảng giá nháp', async ({ page }) => {
		chanNeuTat('12_2_040_006');
		const t = napTT();
		test.skip(!t.bgA, 'Không có bảng giá nháp từ 12_2_040_005.');
		await n.moBangGia(page);
		const d = n.dongBangGia(page, t.bgA);
		await d.getByRole('button', { name: 'Ban hành' }).click();
		const pop = page.locator('.ant-popover:visible').filter({ hasText: 'Xác nhận ban hành bảng giá?' }).last();
		const tb = await n.thongBaoQuanh(page, () => pop.locator('.ant-btn-primary').click());
		expect(tb).toContain('Ban hành bảng giá thành công');
		await expect(n.dongBangGia(page, t.bgA)).toContainText('Đã ban hành', { timeout: 20_000 });
		luuTT({ bgADaBanHanh: true });
	});

	test('12_2_010_003 — Kiểm tra ghi nhận lịch sử giá của sản phẩm', async ({ page }) => {
		chanNeuTat('12_2_010_003');
		test.setTimeout(240_000);
		const t = napTT();
		test.skip(!t.bgADaBanHanh, 'Bảng giá A (11.111) chưa ban hành (12_2_040_006).');
		const { vatThu } = n.duLieu();
		// Bảng giá thứ hai giá khác ⇒ lịch sử phải có THÊM dòng, giữ dòng cũ.
		const ten = TEN('B');
		await n.moBangGia(page);
		const dr = await n.moTaoBangGia(page);
		await n.dienBangGia(page, dr, { ten, sku: vatThu.sku, gia: 22_222 });
		await n.luuBangGia(page, dr);
		luuTT({ bgB: ten });
		await n.moBangGia(page);
		await n.dongBangGia(page, ten).getByRole('button', { name: 'Ban hành' }).click();
		await n.thongBaoQuanh(page, () => page.locator('.ant-popover:visible').filter({ hasText: 'Xác nhận ban hành bảng giá?' }).last().locator('.ant-btn-primary').click());
		await n.moSanPham(page);
		await (await n.timSp(page, vatThu.sku)).first().getByRole('button', { name: 'Lịch sử giá' }).click();
		const ls = page.locator('.ant-drawer-open').last();
		await expect(ls.locator('.ant-timeline-item').first()).toBeVisible({ timeout: 20_000 });
		const noi = n.chuan(await ls.innerText());
		test.info().annotations.push({ type: 'đo', description: noi.slice(0, 700) });
		expect(noi, 'Lịch sử không có giá mới 22.222').toContain('22.222');
		expect(noi, '🔴 Lịch sử mất dòng giá cũ 11.111 (ghi đè thay vì sinh dòng mới)').toContain('11.111');
	});

	test('12_2_040_013 — Kiểm tra Xem chi tiết bảng giá', async ({ page }) => {
		chanNeuTat('12_2_040_013');
		const t = napTT();
		test.skip(!t.bgA, 'Không có bảng giá A.');
		await n.moBangGia(page);
		await n.dongBangGia(page, t.bgA).getByRole('button', { name: 'Xem' }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết bảng giá' }).last();
		await expect(dr.locator('.ant-descriptions').first()).toBeVisible({ timeout: 20_000 });
		const noi = n.chuan(await dr.innerText());
		test.info().annotations.push({ type: 'đo', description: noi.slice(0, 700) });
		for (const k of ['Mã', 'Tên', 'Hiệu lực', 'Ngày tạo']) expect(noi, `Chi tiết thiếu "${k}"`).toContain(k);
		expect(noi, 'Chi tiết thiếu tên NCC').toContain(n.duLieu().tenNcc);
		expect(noi, 'Chi tiết thiếu ngày ban hành').toMatch(/ban hành/i);
		await expect(n.dongBang(dr).filter({ hasText: n.duLieu().vatThu.sku })).toHaveCount(1);
	});

	test('12_2_040_014 — Kiểm tra Lọc bảng giá', async ({ page }) => {
		chanNeuTat('12_2_040_014');
		const { rac } = n.duLieu();
		await n.moBangGia(page);
		const o = n.khung(page).locator('.ant-select').filter({ hasText: 'Lọc theo bưu điện tỉnh' }).first();
		await o.click();
		await page.keyboard.type(rac.tenTinh);
		const cho = page.waitForResponse((r) => r.url().includes('/supplier-price-lists') && r.request().method() === 'GET', { timeout: 20_000 });
		await page.locator('.ant-select-item-option').filter({ hasText: rac.tenTinh, visible: true }).first().click();
		const res = await cho;
		await page.waitForTimeout(1_500);
		const ten = (await n.dongBang(n.khung(page)).allInnerTexts()).map(n.chuan);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ url: res.url().replace(/.*__api/, ''), ten }) });
		const t = napTT();
		if (t.bgA) expect(ten.some((x) => x.includes(t.bgA)), 'Lọc theo tỉnh rác mà không thấy bảng giá áp cho điểm bán của tỉnh đó').toBe(true);
		expect(ten.some((x) => x.includes(n.duLieu().bangGiaSeed)), 'Lọc tỉnh rác mà vẫn hiện bảng giá chỉ áp cho điểm bán seed').toBe(false);
	});

	test('12_2_040_012 — Kiểm tra Huỷ bảng giá', async ({ page }) => {
		chanNeuTat('12_2_040_012');
		const t = napTT();
		test.skip(!t.bgB, 'Không có bảng giá B (12_2_010_003).');
		await n.moBangGia(page);
		await n.dongBangGia(page, t.bgB).getByRole('button', { name: 'Hủy' }).click();
		const tb = await n.thongBaoQuanh(page, () => page.locator('.ant-popover:visible').filter({ hasText: 'Xác nhận hủy bảng giá?' }).last().locator('.ant-btn-primary').click());
		expect(tb).toContain('Hủy bảng giá thành công');
		await expect(n.dongBangGia(page, t.bgB)).toContainText('Đã hủy', { timeout: 20_000 });
	});

	// ── Nhập Excel sản phẩm NCC (chặn ghi, đo) ───────────────────────────────────────────
	test('12_2_020_008 — Kiểm tra tải về file excel mẫu', async ({ page }) => {
		chanNeuTat('12_2_020_008');
		await n.moSanPham(page);
		const dr = await n.moThem(page);
		await dr.getByRole('button', { name: 'Nhập từ Excel' }).click();
		const m = page.locator('.ant-drawer-open').filter({ hasText: 'Nhập sản phẩm NCC từ Excel' }).last();
		const kq = {};
		for (const cd of ['Chỉ khai báo sản phẩm', 'Khai báo sản phẩm và giá']) {
			await m.getByText(cd, { exact: true }).click();
			const cho = page.waitForEvent('download');
			await m.getByRole('button', { name: 'Tải file mẫu' }).click();
			const dl = await cho;
			const f = path.join(GOC, 'test-output', dl.suggestedFilename());
			await dl.saveAs(f);
			const w = new ExcelJS.Workbook();
			await w.xlsx.readFile(f);
			kq[cd] = w.worksheets[0].getRow(1).values.filter(Boolean).map(String);
		}
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
		expect(kq['Khai báo sản phẩm và giá'], '🔴 Mẫu không theo kịch bản (SKU · Giá nhập · Mặc định)').toEqual(['SKU', 'Giá nhập', 'Mặc định']);
	});

	test('12_2_020_009 — Upload file chứa SKU đã mapping / chưa mapping / chưa khai báo (tab)', async ({ page }) => {
		for (const id of ['12_2_020_009']) chanNeuTat(id);
		const { tc } = n.duLieu();
		const m = await napExcel(page, { cheDo: 'Chỉ khai báo sản phẩm', header: ['SKU', 'Đơn vị tính'], dong: [[tc.sku, 'Cái'], [FIFO_RAC.sku, 'Cái'], ['KHONGCO_SKU_12_2', 'Cái']] });
		const d = await tabDem(m);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(d) });
		expect(d.daMap, `${tc.sku} (đã map) không vào tab "SKU đã mapping"`).toBe(1);
	});

	test('12_2_020_010 — Upload file chứa SKU chưa mapping', async ({ page }) => {
		chanNeuTat('12_2_020_010');
		const m = await napExcel(page, { cheDo: 'Chỉ khai báo sản phẩm', header: ['SKU', 'Đơn vị tính'], dong: [[FIFO_RAC.sku, 'Cái']] });
		const d = await tabDem(m);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(d) });
		expect(d.chuaMap, `${FIFO_RAC.sku} (chưa map NCC này) không vào tab "SKU chưa mapping"`).toBe(1);
	});

	test('12_2_020_011 — Upload file chứa SKU chưa khai báo', async ({ page }) => {
		chanNeuTat('12_2_020_011');
		const m = await napExcel(page, { cheDo: 'Chỉ khai báo sản phẩm', header: ['SKU', 'Đơn vị tính'], dong: [['KHONGCO_SKU_12_2', 'Cái']] });
		const d = await tabDem(m);
		expect(d.chuaKhai, 'SKU không tồn tại không vào tab "SKU chưa khai báo"').toBe(1);
	});

	test('12_2_020_013 — Xác nhận khi không có dữ liệu hợp lệ', async ({ page }) => {
		chanNeuTat('12_2_020_013');
		const bi = await chanGhi(page);
		const m = await napExcel(page, { cheDo: 'Chỉ khai báo sản phẩm', header: ['SKU', 'Đơn vị tính'], dong: [['KHONGCO_SKU_12_2', 'Cái']] });
		const tb = await xacNhan(page, m);
		test.info().annotations.push({ type: 'đo', description: tb });
		expect(tb).toContain('Không có SKU đã khai báo để import');
		expect(bi).toEqual([]);
	});

	test('12_2_020_014 — Upload file chứa SKU có mã trùng nhau', async ({ page }) => {
		chanNeuTat('12_2_020_014');
		const bi = await chanGhi(page);
		const m = await napExcel(page, { dong: [[FIFO_RAC.sku, 10000, 8, 'STANDARD', 1, '', ''], [FIFO_RAC.sku, 12000, 8, 'STANDARD', 1, '', '']] });
		const noi = n.chuan(await m.innerText());
		const tb = await xacNhan(page, m);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, canhBao: noi.match(/trùng[^.]*/i)?.[0], daGui: bi }) });
		expect(`${tb} ${noi}`, 'SKU trùng trong file không có cảnh báo').toMatch(/trùng/i);
		expect(bi, 'SKU trùng mà vẫn gửi request ghi').toEqual([]);
	});

	for (const [id, dong, ky, mo] of [
		['12_2_020_019', [FIFO_RAC.sku, 0, 8, 'STANDARD', 1, '', ''], /Giá nhập/, 'giá nhập = 0 phải cảnh báo'],
		['12_2_020_020', [FIFO_RAC.sku, -5000, 8, 'STANDARD', 1, '', ''], /Giá nhập không được nhỏ hơn 0|Giá < 0/, 'giá âm phải báo lỗi'],
		['12_2_020_023', [FIFO_RAC.sku, 5000, -8, 'STANDARD', 1, '', ''], /VAT không được nhỏ hơn 0|VAT < 0/, 'VAT âm phải báo lỗi'],
		['12_2_020_027', [FIFO_RAC.sku, 5000, 8, 'PROMO', -3, '', ''], /SL|số lượng/i, 'SL tối thiểu âm phải báo lỗi'],
		['12_2_020_028', [FIFO_RAC.sku, 0, 0, 'BONUS', 10, -1, ''], /SL|số lượng|tặng/i, 'SL tặng âm phải báo lỗi'],
	]) {
		test(`${id} — ${mo}`, async ({ page }) => {
			chanNeuTat(id);
			const bi = await chanGhi(page);
			const m = await napExcel(page, { dong: [dong] });
			const tb = await xacNhan(page, m);
			test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, daGui: bi }) });
			expect(tb, `🔴 ${mo} — thông báo: "${tb}"`).toMatch(ky);
			expect(bi, `${mo} — vẫn gửi request ghi`).toEqual([]);
		});
	}

	for (const [id, dong, mo] of [
		['12_2_020_021', [FIFO_RAC.sku, 5000, 0, 'STANDARD', 1, '', ''], 'VAT = 0% được nhận'],
		['12_2_020_022', [FIFO_RAC.sku, 5000, 100, 'STANDARD', 1, '', ''], 'VAT = 100%'],
		['12_2_020_024', [FIFO_RAC.sku, 12345.67, 8, 'STANDARD', 1, '', ''], 'giá nhập số lẻ'],
		['12_2_020_025', [FIFO_RAC.sku, 5000, 8, 'STANDARD', 1, '', ''], 'loại giá "Giá gốc"'],
		['12_2_020_026', [FIFO_RAC.sku, 5000, 8, 'PROMO', 0, '', ''], 'SL tối thiểu = 0'],
	]) {
		test(`${id} — ${mo}`, async ({ page }) => {
			chanNeuTat(id);
			const bi = await chanGhi(page);
			const m = await napExcel(page, { dong: [dong] });
			await m.getByRole('tab', { name: /SKU chưa mapping/ }).click();
			const hang = n.chuan(await n.dongBang(m.locator('.ant-tabs-tabpane-active')).first().innerText().catch(() => ''));
			const tb = await xacNhan(page, m);
			test.info().annotations.push({ type: 'đo', description: JSON.stringify({ hangXemTruoc: hang, tb, daGui: bi }) });
			expect(hang, 'Bảng xem trước không có dòng').not.toBe('');
			if (id === '12_2_020_024') expect(hang, 'Giá số lẻ không hiện đúng định dạng').toMatch(/12[.,]345([.,]67)?/);
			if (id === '12_2_020_025') expect(hang, 'Loại giá STANDARD không hiện nhãn "Giá gốc"').toContain('Giá gốc');
			if (id === '12_2_020_021') expect(bi.length, 'VAT 0% bị chặn ở FE, không gửi đi').toBeGreaterThan(0);
			if (id === '12_2_020_022') expect(tb, 'VAT 100% không có cảnh báo nào (rule hệ thống chưa chốt)').not.toBe('');
			if (id === '12_2_020_026') expect(bi.join(' '), 'SL tối thiểu 0 bị đổi âm thầm thành 1').not.toMatch(/"minQuantity":1\b/);
		});
	}

	test('12_2_020_012 — Xác nhận import khi có SKU hợp lệ', async ({ page }) => {
		chanNeuTat('12_2_020_012');
		// Chế độ "Chỉ khai báo sản phẩm" ⇒ chỉ tạo MAPPING cho SP rác FIFO; xoá ngay sau.
		const m = await napExcel(page, { cheDo: 'Chỉ khai báo sản phẩm', header: ['SKU', 'Đơn vị tính'], dong: [[FIFO_RAC.sku, 'Cái']] });
		const tb = await xacNhan(page, m);
		test.info().annotations.push({ type: 'đo', description: tb });
		try {
			expect(tb).toMatch(/Đã khai báo 1 sản phẩm/);
			await n.moSanPham(page);
			await expect((await n.timSp(page, FIFO_RAC.sku)).first(), 'SKU import xong không có trong danh sách').toBeVisible();
		} finally {
			await n.moSanPham(page);
			await n.xoaMap(page, FIFO_RAC.sku).catch(() => {});
		}
	});


	for (const id of ['12_2_020_006', '12_2_020_016']) {
		test(`${id} — Kiểm tra ghi nhận thông tin từ file excel tải lên`, async ({ page }) => {
			chanNeuTat(id);
			const m = await napExcel(page, { dong: [[FIFO_RAC.sku, 5000, 8, 'STANDARD', 1, '', 'AUTO']] });
			await m.getByRole('tab', { name: /SKU chưa mapping/ }).click();
			const th = (await m.locator('.ant-tabs-tabpane-active .ant-table-thead th').allInnerTexts()).map(n.chuan).filter(Boolean);
			test.info().annotations.push({ type: 'đo', description: th.join(' · ') });
			expect(th[0]).toBe('SKU');
			expect(th, 'Không có cột trạng thái tìm thấy / mapping').toEqual(expect.arrayContaining([expect.stringMatching(/Trạng thái/)]));
			expect(th, '🔴 Bảng xem trước không theo kịch bản (cột A SKU · B Giá nhập · C Mặc định)').toEqual(expect.arrayContaining(['Giá nhập', 'Mặc định']));
		});
	}

	for (const [id, cheDo] of [['12_2_020_017', 'chưa'], ['12_2_020_018', 'đã']]) {
		test(`${id} — Mapping đúng SKU ${cheDo} liên kết NCC`, async ({ page }) => {
			chanNeuTat(id);
			const sku = cheDo === 'đã' ? n.duLieu().tc.sku : FIFO_RAC.sku;
			const m = await napExcel(page, { cheDo: 'Chỉ khai báo sản phẩm', header: ['SKU', 'Đơn vị tính'], dong: [[sku, 'Cái']] });
			const d = await tabDem(m);
			test.info().annotations.push({ type: 'đo', description: JSON.stringify(d) });
			expect(cheDo === 'đã' ? d.daMap : d.chuaMap, `SKU ${sku} không vào tab SKU ${cheDo} mapping`).toBe(1);
		});
	}

	test('12_2_020_030 — Xác nhận khi tồn tại dòng lỗi', async ({ page }) => {
		chanNeuTat('12_2_020_030');
		const bi = await chanGhi(page);
		const m = await napExcel(page, { dong: [[n.duLieu().tc.sku, 5000, 8, 'STANDARD', 1, '', ''], [FIFO_RAC.sku, -1, 8, 'STANDARD', 1, '', '']] });
		const tb = await xacNhan(page, m);
		test.info().annotations.push({ type: 'đo', description: tb });
		expect(tb, 'Có dòng lỗi mà vẫn cho import').toMatch(/bị khoá|< 0|nhỏ hơn 0/);
		expect(bi).toEqual([]);
	});

	test('12_2_020_015 — Kiểm tra xoá sản phẩm trong danh sách', async ({ page }) => {
		chanNeuTat('12_2_020_015');
		const { vatThu } = n.duLieu();
		await n.moSanPham(page);
		const dr = await n.moThem(page);
		await n.tickSp(page, dr, vatThu.ten);
		const r = n.dongBang(dr).filter({ hasText: vatThu.ten });
		await expect(r).toHaveCount(1);
		const tb = await n.thongBaoQuanh(page, () => r.first().getByRole('button').last().click(), 4_000);
		test.info().annotations.push({ type: 'đo', description: `thông báo: "${tb}"` });
		await expect(r, 'Bấm xoá dòng mà dòng vẫn còn').toHaveCount(0);
		expect(tb, 'Xoá dòng không hiện thông báo thành công (kịch bản yêu cầu)').not.toBe('');
	});

	test('12_2_020_007 — Kiểm tra thêm sản phầm từ file excel', async ({ page }) => {
		chanNeuTat('12_2_020_007');
		const m = await napExcel(page, { cheDo: 'Chỉ khai báo sản phẩm', header: ['SKU', 'Đơn vị tính'], dong: [[FIFO_RAC.sku, 'Cái'], ['KHONGCO_SKU_12_2', 'Cái']] });
		const tb = await xacNhan(page, m);
		test.info().annotations.push({ type: 'đo', description: tb });
		try {
			expect(tb).toMatch(/Đã khai báo 1 sản phẩm/);
			await n.moSanPham(page);
			await expect((await n.timSp(page, FIFO_RAC.sku)).first()).toBeVisible();
		} finally {
			await n.moSanPham(page);
			await n.xoaMap(page, FIFO_RAC.sku).catch(() => {});
		}
	});

	test('12_2_020_029 — Xác nhận import thành công', async ({ page }) => {
		chanNeuTat('12_2_020_029');
		test.setTimeout(180_000);
		const tbl = [];
		page.on('response', async (r) => { if (/supplier-price-lists/.test(r.url()) && r.request().method() === 'POST') tbl.push(await r.json().catch(() => null)); });
		const m = await napExcel(page, { dong: [[FIFO_RAC.sku, 7777, 8, 'STANDARD', 1, '', 'AUTO 12_2']] });
		const tb = await xacNhan(page, m);
		const pl = tbl.find(Boolean)?.data;
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, bangGia: pl && { id: pl.id, code: pl.code, status: pl.status, scopes: pl.scopes } }).slice(0, 600) });
		try {
			expect(tb).toMatch(/Đã khai báo 1 sản phẩm và bảng giá/);
			await n.moBangGia(page);
			expect(pl?.code, 'Không tạo bảng giá').toBeTruthy();
			await expect(n.dongBangGia(page, pl.code)).toBeVisible({ timeout: 15_000 });
		} finally {
			await n.moBangGia(page);
			if (pl?.code) {
				const d = n.dongBangGia(page, pl.code);
				if (await d.getByRole('button', { name: 'Hủy' }).count()) {
					await d.getByRole('button', { name: 'Hủy' }).click();
					await n.thongBaoQuanh(page, () => page.locator('.ant-popover:visible').filter({ hasText: 'Xác nhận hủy bảng giá?' }).last().locator('.ant-btn-primary').click());
				}
			}
			await n.moSanPham(page);
			await n.xoaMap(page, FIFO_RAC.sku).catch(() => {});
		}
	});

	for (const id of ['12_2_040_007', '12_2_040_008']) {
		test(`${id} — Import Excel sản phẩm khi tạo bảng giá`, async ({ page }) => {
			chanNeuTat(id);
			const bi = await chanGhi(page);
			const { tc } = n.duLieu();
			await n.moBangGia(page);
			const dr = await n.moTaoBangGia(page);
			await dr.locator('input[type=file]').first().setInputFiles(await taoXlsx([[tc.sku, 50000, 8, 'STANDARD', 1, '', '']]));
			await page.waitForTimeout(2_500);
			const noi = n.chuan(await dr.innerText());
			await n.dienBangGia(page, dr, { ten: TEN('X') });
			const kq = await n.luuBangGia(page, dr);
			test.info().annotations.push({ type: 'đo', description: JSON.stringify({ file: noi.match(/ncc-\d+\.xlsx/)?.[0], tb: kq.tb, daGui: bi.map((x) => x.slice(0, 160)) }) });
			expect(noi, 'Chọn file Excel mà drawer không ghi nhận file').toMatch(/ncc-\d+\.xlsx|Đổi file Excel/);
			expect(bi.join(' '), 'Lưu nháp không gửi file Excel lên (import-excel)').toMatch(/import-excel|supplier-price-lists/);
		});
	}

	// ── Dọn: huỷ bảng giá A, gỡ mapping vật thử (= 12_2_010_004) ─────────────────────────
	test('12_2_010_004 — Kiểm tra xác nhận xoá sản phẩm', async ({ page }) => {
		chanNeuTat('12_2_010_004');
		const t = napTT();
		const { vatThu } = n.duLieu();
		await n.moBangGia(page);
		for (const ten of [t.bgA, t.bgB].filter(Boolean)) {
			const d = n.dongBangGia(page, ten);
			if (await d.getByRole('button', { name: 'Hủy' }).count()) {
				await d.getByRole('button', { name: 'Hủy' }).click();
				await n.thongBaoQuanh(page, () => page.locator('.ant-popover:visible').filter({ hasText: 'Xác nhận hủy bảng giá?' }).last().locator('.ant-btn-primary').click());
			}
		}
		test.skip(!t.daMap, 'Chưa map vật thử.');
		await n.moSanPham(page);
		const tb = await n.xoaMap(page, vatThu.sku);
		test.info().annotations.push({ type: 'đo', description: tb });
		expect(tb).toContain('Xoá thành công');
		luuTT({ daMap: false });
		await expect(await n.timSp(page, vatThu.sku), 'Xoá xong vẫn còn trong danh sách').toHaveCount(0);
	});
});
