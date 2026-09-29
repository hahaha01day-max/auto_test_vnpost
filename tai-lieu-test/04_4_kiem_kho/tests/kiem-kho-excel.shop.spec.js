'use strict';

/**
 * 04_4 · 020 — File mẫu Excel và nhập số đếm từ Excel, vai `shop`, điểm bán seed của làn.
 *
 * Nguồn (vnpost-web af8cda07): nút "Tải mẫu" ở trang phiếu kiểm gọi
 * `GET /stock/v3/inventory-check/template?shopId&inventoryId=&includeStock=true|false` (sheet
 * `inventory_check`); "Nhập từ Excel" mở drawer "Nhập số đếm từ Excel" → "Nhập dữ liệu", drawer
 * trả "Đã nhập a/b dòng" + bảng "Dòng · SKU · Mã lô · Lý do bỏ qua".
 * Import chỉ ghi SỐ ĐẾM vào phiếu (không đổi tồn) — cuối file HUỶ phiên (phiên mở là khoá kho).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const kk = require('./kiem-kho-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

test.describe('04_4 · 020 — Mẫu Excel và nhập số đếm (điểm bán seed)', () => {
	test.describe.configure({ timeout: 240_000, mode: 'default' });
	const { shopId, sp } = (() => { try { return k.duLieuSeed(); } catch { return {}; } })();
	const ctx = {};

	test.afterAll(async ({ browser }) => {
		const p = await k.moPhienPhu(browser, VAI, '/inventory/inventory-check');
		const mo = await kk.phienMo(p.page, p.st, shopId);
		if (mo?.sessionId) await kk.huyPhien(p.page, p.st, shopId, mo.sessionId);
		await p.dong();
	});

	test('04_4_020_001 — Tải file mẫu Excel TRỐNG', async ({ page }) => {
		chanNeuTat('04_4_020_001');
		const st = k.batHeader(page);
		await require('../../shared/auth/login').moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/inventory-check`, VAI);
		const m = await kk.taiMau(page, st, shopId, false);
		expect(m.status).toBe(200);
		expect(m.dong[0], 'Hàng tiêu đề file mẫu khác bộ cột').toEqual(kk.COT_MAU);
		expect(m.dong.length - 1, 'File mẫu trống mà có dòng dữ liệu').toBe(0);
	});

	test('04_4_020_002 — Tải file mẫu Excel CÓ dữ liệu sẵn', async ({ page }) => {
		chanNeuTat('04_4_020_002');
		const st = k.batHeader(page);
		await require('../../shared/auth/login').moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/inventory-check`, VAI);
		const m = await kk.taiMau(page, st, shopId, true);
		expect(m.dong[0], 'Bộ cột khác file trống').toEqual(kk.COT_MAU);
		// Đối chiếu: số dòng = số (SP, biến thể) còn tồn; tồn từng dòng = Σ tồn các lô.
		const b = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, size: 500 });
		const ton = {};
		for (const l of (b.data || []).filter((x) => Number(x.remainQuantity) > 0)) {
			const khoa = `${l.productName}|${l.variantName}`;
			ton[khoa] = (ton[khoa] || 0) + Number(l.remainQuantity);
		}
		const file = Object.fromEntries(m.dong.slice(1).map((d) => [`${d[1]}|${String(d[2]).replace(/^Màu: /, '')}`, Number(d[6])]));
		const api = Object.fromEntries(Object.entries(ton).map(([kh, v]) => [kh.replace('|Màu: ', '|'), v]));
		test.info().annotations.push({ type: 'đo', description: `file: ${JSON.stringify(file)} · lô: ${JSON.stringify(api)}` });
		expect(m.dong.length - 1, 'Số dòng file mẫu ≠ số sản phẩm có tồn').toBe(Object.keys(api).length);
		expect(file, 'Tồn trên file mẫu ≠ tồn thật').toEqual(api);
	});

	test('04_4_020_003 — Upload SKU hoặc tên sản phẩm có trong hệ thống', async ({ page }, ti) => {
		chanNeuTat('04_4_020_003');
		Object.assign(ctx, await kk.vaoPhieuCuaToi(page, VAI));
		const f = sp.fifo;
		const kq = await kk.nhapExcel(page, [
			[f.sku, f.tenSanPham, 'Mặc định', 'Cái', 'Nhập trước xuất trước', 'AUTO8_LO_FIFO'.replace('AUTO8_', require('../../00_seed/seed-state').PREFIX), 100, 100, '', ''],
			['', sp.tieuChuan.tenSanPham, 'Mặc định', 'Cái', 'Giá tiêu chuẩn', '', 0, 1, '', ''],
		], ti.outputPath('sku-ten.xlsx'));
		test.info().annotations.push({ type: 'đo', description: kq });
		await expect(kk.dongSp(page, f.tenSanPham), 'Dòng khai theo SKU không được nhận').toBeVisible();
		// Kịch bản: khai theo TÊN (không SKU) cũng phải nhận diện được.
		expect(kq, 'Dòng khai theo TÊN sản phẩm bị bỏ qua').toContain('Đã nhập 2/2 dòng');
	});

	test('04_4_020_004 — Upload SKU và tên sản phẩm KHÔNG có trong hệ thống', async ({ page }, ti) => {
		chanNeuTat('04_4_020_004');
		await kk.vaoPhieuCuaToi(page, VAI);
		const kq = await kk.nhapExcel(page, [['AUTO_KHONG_CO_SKU_X', 'AUTO_KHONG_CO_SP_X', 'Mặc định', 'Cái', '', '', 0, 5, '', '']], ti.outputPath('khong-co.xlsx'));
		test.info().annotations.push({ type: 'đo', description: kq });
		expect(kq, 'Dòng SKU không tồn tại được tính là hợp lệ').toContain('Đã nhập 0/1 dòng');
		expect(kq, 'Lý do không nêu không tìm thấy sản phẩm').toMatch(/Không tìm thấy sản phẩm/);
	});

	test('04_4_020_005 — Bỏ trống mã lô với sản phẩm FIFO', async ({ page }, ti) => {
		chanNeuTat('04_4_020_005');
		await kk.vaoPhieuCuaToi(page, VAI);
		const f = sp.fifo;
		const kq = await kk.nhapExcel(page, [[f.sku, f.tenSanPham, 'Mặc định', 'Cái', 'Nhập trước xuất trước', '', 100, 100, '', '']], ti.outputPath('fifo-trong-lo.xlsx'));
		test.info().annotations.push({ type: 'đo', description: kq });
		expect(kq, 'Dòng FIFO bỏ trống mã lô được tính là hợp lệ').toContain('Đã nhập 0/1 dòng');
		expect(kq, 'Lý do lỗi khác nguyên văn kịch bản').toContain('Sản phẩm FIFO/LIFO bắt buộc có mã lô');
	});

	for (const [id, go, ten] of [['04_4_030_004', '-5', 'Nhập tồn kho thực tế ÂM'], ['04_4_030_005', 'abc', 'Nhập chữ vào cột số lượng thực tế']]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			await kk.vaoPhieuCuaToi(page, VAI);
			const f = sp.fifo;
			const lo = 'AUTO8_LO_FIFO'.replace('AUTO8_', require('../../00_seed/seed-state').PREFIX);
			await kk.themSp(page, f.tenSanPham);
			await kk.dongSp(page, f.tenSanPham).getByRole('button', { name: /lô/ }).first().click();
			const dl = page.locator('.ant-drawer-open').filter({ hasText: 'Kiểm kho theo lô' }).last();
			const o = dl.locator('tr').filter({ hasText: lo }).getByPlaceholder('Chưa đếm');
			await o.fill('');
			await o.pressSequentially(go);
			await o.blur();
			const giaTri = await o.inputValue();
			const tomTat = k.chuan(await dl.innerText()).match(/Thực đếm: ?\S+ \| Chênh lệch: ?\S+/)?.[0] ?? '';
			test.info().annotations.push({ type: 'đo', description: `gõ "${go}" → ô "${giaTri}"; ${tomTat}` });
			if (go === 'abc') {
				// 🔴 Chữ bị bỏ ⇒ ô RỖNG = CHƯA ĐẾM, 🚫 không được thành "đếm 0".
				expect(giaTri, 'Gõ chữ mà ô nhận ký tự').not.toMatch(/[a-z]/i);
				expect(giaTri === '' || Number(giaTri) !== 0, `Gõ chữ mà ô thành số 0 — bị coi là ĐẾM 0 (${tomTat})`).toBe(true);
			} else {
				// Kỳ vọng chưa chốt (sheet QC chỉ ghi "Check lại"): ít nhất ô không được giữ số âm.
				expect(Number(giaTri || 0), `Ô số đếm nhận số âm ${giaTri}`).toBeGreaterThanOrEqual(0);
			}
			await dl.getByRole('button', { name: 'Hủy' }).click();
		});
	}
});
