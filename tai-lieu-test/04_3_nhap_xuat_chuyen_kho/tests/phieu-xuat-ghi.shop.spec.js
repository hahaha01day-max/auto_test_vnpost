'use strict';

/**
 * 04_3 · 030 / 010 — Phiếu XUẤT kho trên điểm bán seed của làn, vai `shop` (Cửa hàng trưởng — có
 * `CREATE_EXPORT_STOCK`; Giao dịch viên không có nút "Xuất kho").
 *
 * Đo DOM 23/09/2026 (vnpost-web af8cda07):
 * - Form cấp điểm bán: "Mã hoá đơn / chứng từ" (tự sinh `XK…`), "Thời gian tạo phiếu", "Lý do xuất"
 *   cố định "Xuất hàng vỡ, hỏng", "Người xuất". 🔴 KHÔNG có ô "Xuất cho".
 * - Dòng hàng: SP MAC / giá tiêu chuẩn có nút "Chọn lô" (tự phân bổ lô cũ nhất, sửa được);
 *   SP FIFO chỉ có "Xem lô" (read-only) và FE đòi `batchProducts` đủ số lượng — xem 04_3_010_020.
 * - Tạo nháp: "Tạo phiếu nháp"; "Xuất kho" = tạo + duyệt ngay. API `POST /stock/v3/import-export`.
 * - Giá vốn dòng: `items[].basePrice` ở `GET /stock/v2/import-export/detail`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { chanGhi } = require('./warehouse-page');
const k = require('./ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

/** Tồn từng lô (mã → remainQuantity) của một variant. */
async function tonTheoLo(page, st, shopId, productId, variantId) {
	const b = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, productId, variantId, size: 500 });
	return Object.fromEntries((b.data || []).map((l) => [l.batchCode, Number(l.remainQuantity)]));
}

/** Tạo + duyệt phiếu xuất ("Xuất kho"), trả về body của request tạo. */
async function xuatNgay(page, dr) {
	const choDuyet = page.waitForResponse((r) => r.url().includes('/import-export/confirm'), { timeout: 60_000 });
	const { body } = await k.bamVaCho(page, dr.getByRole('button', { name: /^Xuất kho$/ }).last(), '/stock/v3/import-export?');
	expect(String(body?.status?.code), `Tạo phiếu xuất lỗi: ${body?.status?.message}`).toBe('200');
	const duyet = await (await choDuyet).json();
	expect(String(duyet?.status?.code), `Duyệt phiếu xuất lỗi: ${duyet?.status?.message}`).toBe('200');
	return body.data;
}

test.describe('04_3 · 030 — Phiếu xuất kho (điểm bán seed)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('04_3_030_001 — Mở Phiếu xuất kho và validate rỗng', async ({ page }) => {
		chanNeuTat('04_3_030_001');
		const { daGoi } = await chanGhi(page);
		const dr = await k.moFormXuat(page, VAI);
		await expect(dr).toContainText('Thông tin sản phẩm');

		await dr.locator('#code').fill('');
		await dr.locator('#importDate').hover();
		await dr.locator('.ant-picker-clear').first().click().catch(() => {});
		await expect(dr.locator('#importDate')).toHaveValue('');
		await dr.getByRole('button', { name: /^Xuất kho$/ }).last().click();
		await expect(dr.locator('.ant-form-item-explain-error').first()).toBeVisible();
		const loi = (await dr.locator('.ant-form-item-explain-error').allInnerTexts()).map(k.chuan);
		const nhan = (await dr.locator('.ant-form-item-label').allInnerTexts()).map(k.chuan);

		expect(loi, `Bỏ trống Mã hoá đơn mà không báo lỗi. Lỗi: ${loi.join(' · ')}`).toContain('Nhập mã hoá đơn / chứng từ');
		expect(loi.length, `Bỏ trống Thời gian tạo phiếu mà chỉ có ${loi.length} lỗi: ${loi.join(' · ')}`).toBeGreaterThanOrEqual(2);
		expect(daGoi, 'Form rỗng mà vẫn gửi request tạo phiếu').toEqual([]);
		// Kịch bản đòi "Xuất cho" bắt buộc — ghi hành vi thật, 🚫 không hạ kỳ vọng.
		expect(nhan, `Form cấp điểm bán không có ô "Xuất cho". Các ô đang có: ${nhan.join(' · ')}`).toContain('Xuất cho');
	});

	test('04_3_030_002 — Tạo phiếu xuất kho nháp', async ({ page }) => {
		chanNeuTat('04_3_030_002');
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const dr = await k.moFormXuat(page, VAI);
		const { sp: tc } = await k.themSanPhamXuat(page, dr, sp.tieuChuan.tenSanPham);
		const tonTruoc = await k.tonVariant(page, st, shopId, tc.productId, tc.variantId);
		await dr.locator('#supplierNote').fill(k.GHI_CHU_XUAT);
		const { body } = await k.bamVaCho(page, dr.getByRole('button', { name: 'Tạo phiếu nháp' }), '/stock/v3/import-export?');
		expect(String(body?.status?.code), `Tạo nháp lỗi: ${body?.status?.message}`).toBe('200');
		expect(body.data.status).toBe('DRAFT');
		expect(body.data.type).toBe('EXPORT');
		// 🔴 Nháp KHÔNG trừ tồn.
		expect(await k.tonVariant(page, st, shopId, tc.productId, tc.variantId), 'Phiếu xuất nháp đã trừ tồn').toBe(tonTruoc);
	});

	test('04_3_030_003 — Sửa số lượng trên phiếu xuất', async ({ page }) => {
		chanNeuTat('04_3_030_003');
		const { shopId } = k.duLieuSeed();
		const st = k.batHeader(page);
		await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/import`, VAI);
		const ds = await (async () => {
			await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 60_000 });
			return k.goiApi(page, st, '/stock/v2/import-export/find', {
				shopId, type: 'EXPORT', page: 0, size: 50, sort: 'actionTime,DESC',
			});
		})();
		const phieu = (ds.data || []).find((x) => x.status === 'DRAFT' && x.note === k.GHI_CHU_XUAT);
		test.skip(!phieu, `Không còn phiếu xuất nháp "${k.GHI_CHU_XUAT}" — chạy 04_3_030_002 trước.`);
		const truoc = await k.chiTietPhieu(page, st, shopId, phieu.stockInOutId);
		const it = truoc.items[0];
		const slMoi = Number(it.quantity) + 1;

		await page.locator('.ant-tabs-tab', { hasText: 'Phiếu xuất kho' }).first().locator('.ant-tabs-tab-btn').dispatchEvent('click');
		const dong = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: phieu.code }).first();
		await expect(dong, `Phiếu ${phieu.code} không ở trang đầu thẻ Phiếu xuất kho`).toBeVisible({ timeout: 30_000 });
		await dong.getByText(phieu.code).click();
		const ct = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu xuất kho' }).last();
		await expect(ct).toBeVisible();
		await ct.getByRole('button', { name: 'Chỉnh sửa' }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thông tin phiếu xuất kho' }).last();
		const d = dr.locator('tr[data-row-key]').filter({ hasText: it.productName }).first();
		await expect(d).toBeVisible();
		await d.locator('input[role="spinbutton"]').first().fill(String(slMoi));
		// Đổi SL thì phân bổ lô cũ KHÔNG tự co giãn ("Lưu" bị khoá) ⇒ dồn cả SL mới vào lô đủ tồn đầu tiên.
		await k.chonLoXuat(page, d, (lo) => ({ [lo.find((x) => x.ton >= slMoi).ma]: slMoi }));
		const { body } = await k.bamVaCho(page, dr.getByRole('button', { name: /Cập nhật/ }), '/stock/', 'PUT');
		expect(String(body?.status?.code), `Cập nhật phiếu xuất lỗi: ${body?.status?.message}`).toBe('200');

		const sau = await k.chiTietPhieu(page, st, shopId, phieu.stockInOutId);
		const itSau = sau.items.find((x) => x.variantId === it.variantId);
		expect(Number(itSau.quantity), 'Số lượng không đổi theo').toBe(slMoi);
		expect(Number(itSau.totalAmount), 'Thành tiền dòng không tính lại').toBe(slMoi * Number(itSau.price));
		const tong = sau.items.reduce((s, x) => s + Number(x.totalAmount), 0) - Number(sau.discountAmount || 0);
		expect(Number(sau.totalAmount), 'Tổng phiếu không tính lại đúng').toBe(tong);
	});

	test('04_3_030_004 — Xuất kho từ một lô hàng xác định', async ({ page }) => {
		chanNeuTat('04_3_030_004');
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const dr = await k.moFormXuat(page, VAI);
		const { sp: tc, dong } = await k.themSanPhamXuat(page, dr, sp.tieuChuan.tenSanPham);
		const ton = await tonTheoLo(page, st, shopId, tc.productId, tc.variantId);
		const ma = Object.keys(ton).filter((m) => ton[m] >= 2);
		test.skip(ma.length < 2, `SP ${tc.productName} chỉ có ${ma.length} lô tồn ≥ 2 — case cần nhiều lô (chạy 04_3_020_004).`);
		const chon = ma[ma.length - 1]; // lô mới nhất, KHÁC lô FE tự phân bổ (lô cũ nhất)
		const lo = await k.chonLoXuat(page, dong, { [chon]: 1 });
		const giaLo = lo.find((x) => x.ma === chon).gia;
		await dr.locator('#supplierNote').fill('AUTO test 04_3_030_004');
		const p = await xuatNgay(page, dr);

		const sau = await tonTheoLo(page, st, shopId, tc.productId, tc.variantId);
		expect(sau[chon], `Lô ${chon} không giảm đúng 1`).toBe(ton[chon] - 1);
		for (const m of Object.keys(ton).filter((x) => x !== chon)) {
			expect(sau[m], `Lô ${m} không được chọn mà tồn đổi`).toBe(ton[m]);
		}
		const ct = await k.chiTietPhieu(page, st, shopId, p.stockInOutId);
		expect(Number(ct.items[0].basePrice), 'Giá vốn dòng khác giá lô đã chọn').toBe(giaLo);
	});

	test('04_3_030_005 — Xuất kho từ nhiều lô khác nhau', async ({ page }) => {
		chanNeuTat('04_3_030_005');
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const dr = await k.moFormXuat(page, VAI);
		const { sp: tc, dong } = await k.themSanPhamXuat(page, dr, sp.tieuChuan.tenSanPham);
		const ton = await tonTheoLo(page, st, shopId, tc.productId, tc.variantId);
		const ma = Object.keys(ton).filter((m) => ton[m] >= 2);
		test.skip(ma.length < 2, `SP ${tc.productName} chỉ có ${ma.length} lô tồn ≥ 2 — case cần ≥ 2 lô.`);
		const [a, b] = [ma[0], ma[ma.length - 1]];
		await dong.locator('input[role="spinbutton"]').first().fill('3');
		const lo = await k.chonLoXuat(page, dong, { [a]: 2, [b]: 1 });
		const gia = Object.fromEntries(lo.map((x) => [x.ma, x.gia]));
		await dr.locator('#supplierNote').fill('AUTO test 04_3_030_005');
		const p = await xuatNgay(page, dr);

		const sau = await tonTheoLo(page, st, shopId, tc.productId, tc.variantId);
		expect(sau[a], `Lô ${a} không giảm đúng 2`).toBe(ton[a] - 2);
		expect(sau[b], `Lô ${b} không giảm đúng 1`).toBe(ton[b] - 1);
		const ct = await k.chiTietPhieu(page, st, shopId, p.stockInOutId);
		const lai = ct.items[0].batchProducts || [];
		expect(Object.fromEntries(lai.map((x) => [x.batchCode, Number(x.quantity)])), 'Phiếu không ghi rõ SL theo từng lô').toEqual({ [a]: 2, [b]: 1 });
		expect(Number(ct.items[0].basePrice) * 3, 'Tổng giá vốn ≠ Σ(SL lô × giá lô)').toBe(2 * gia[a] + gia[b]);
	});

	test('04_3_030_006 — Xuất toàn bộ số lượng của một lô', async ({ page }) => {
		chanNeuTat('04_3_030_006');
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const dr = await k.moFormXuat(page, VAI);
		const { sp: tc, dong } = await k.themSanPhamXuat(page, dr, sp.tieuChuan.tenSanPham);
		const ton = await tonTheoLo(page, st, shopId, tc.productId, tc.variantId);
		// Lô nhỏ nhất còn tồn (để không xả sạch lô tồn đầu kỳ dùng chung).
		const ma = Object.keys(ton).filter((m) => ton[m] > 0 && ton[m] <= 10).sort((x, y) => ton[x] - ton[y])[0];
		test.skip(!ma, `SP ${tc.productName} không có lô tồn nhỏ (≤ 10) để xuất hết — chạy 04_3_020_017 để có lô mới.`);
		const n = ton[ma];
		await dong.locator('input[role="spinbutton"]').first().fill(String(n));
		await k.chonLoXuat(page, dong, { [ma]: n });
		await dr.locator('#supplierNote').fill('AUTO test 04_3_030_006');
		await xuatNgay(page, dr);

		const b = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, productId: tc.productId, variantId: tc.variantId, size: 500 });
		const lo = (b.data || []).find((l) => l.batchCode === ma);
		// Ghi rõ cách hiển thị: lô còn trong danh sách với tồn 0, hay bị ẩn.
		test.info().annotations.push({ type: 'đo', description: lo ? `Lô ${ma} vẫn trả về, remainQuantity=${lo.remainQuantity}, areInStock=${lo.areInStock}` : `Lô ${ma} không còn trong danh sách lô` });
		expect(lo ? Number(lo.remainQuantity) : 0, `Tồn lô ${ma} sau khi xuất hết không về 0`).toBe(0);
		for (const m of Object.keys(ton).filter((x) => x !== ma)) {
			const l = (b.data || []).find((x) => x.batchCode === m);
			expect(Number(l?.remainQuantity), `Lô ${m} không liên quan mà đổi tồn`).toBe(ton[m]);
		}
	});

	test('04_3_030_007 — Xuất vượt tồn kho của lô', async ({ page }) => {
		chanNeuTat('04_3_030_007');
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const { daGoi } = await chanGhi(page);
		const dr = await k.moFormXuat(page, VAI);
		const { sp: tc, dong } = await k.themSanPhamXuat(page, dr, sp.tieuChuan.tenSanPham);
		const ton = await tonTheoLo(page, st, shopId, tc.productId, tc.variantId);
		const nho = Object.keys(ton).filter((m) => ton[m] > 0).sort((x, y) => ton[x] - ton[y])[0];
		expect(nho, 'SP không có lô còn tồn').toBeTruthy();
		const vuot = ton[nho] + 1;
		await dong.locator('input[role="spinbutton"]').first().fill(String(vuot));
		// Dồn toàn bộ SL vào MỘT lô có tồn nhỏ hơn số đó.
		await dong.getByRole('button', { name: 'Chọn lô' }).click();
		const dl = page.locator('.ant-drawer-open').filter({ hasText: 'Số lượng cần phân bổ' }).last();
		const hang = dl.locator('tr[data-row-key]');
		await expect(hang.first()).toBeVisible();
		for (const h of await hang.all()) await h.locator('input[role="spinbutton"]').fill('0');
		const o = hang.filter({ hasText: nho }).locator('input[role="spinbutton"]');
		await o.fill(String(vuot));
		await o.blur();
		// Đo 23/09/2026: ô lô không nhận quá tồn lô, nút "Lưu" khoá, drawer nhắc "Cần phân bổ đủ N".
		const nhan = Number((await o.inputValue()).replace(/\D/g, '') || 0);
		expect(nhan, `Ô SL lô ${nho} (tồn ${ton[nho]}) nhận ${nhan} > tồn`).toBeLessThanOrEqual(ton[nho]);
		await expect(dl.getByRole('button', { name: 'Lưu' }), 'Phân bổ vượt tồn lô mà vẫn Lưu được').toBeDisabled();
		await expect(hang.filter({ hasText: nho }), `Drawer không hiện tồn khả dụng ${ton[nho]} của lô`).toContainText(String(ton[nho]));
		await dl.getByRole('button', { name: 'Hủy' }).click();
		expect(daGoi, 'Xuất vượt tồn lô mà vẫn gửi request tạo phiếu').toEqual([]);
		expect(await tonTheoLo(page, st, shopId, tc.productId, tc.variantId)).toEqual(ton);
	});
});

test.describe('04_3 · 010 — Giá vốn khi xuất kho (điểm bán seed)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('04_3_010_022 — Giá vốn khi xuất kho sản phẩm giá tiêu chuẩn', async ({ page }) => {
		chanNeuTat('04_3_010_022');
		const { shopId, sp } = k.duLieuSeed();
		const giaChuan = Number(sp.tieuChuan.giaTieuChuan);
		expect(giaChuan, 'Sổ seed không ghi đơn giá tiêu chuẩn').toBeGreaterThan(0);
		const st = k.batHeader(page);
		const dr = await k.moFormXuat(page, VAI);
		await k.themSanPhamXuat(page, dr, sp.tieuChuan.tenSanPham);
		await dr.locator('#supplierNote').fill('AUTO test 04_3_010_022');
		const p = await xuatNgay(page, dr);
		const ct = await k.chiTietPhieu(page, st, shopId, p.stockInOutId);
		expect(Number(ct.items[0].basePrice), 'Giá vốn dòng xuất ≠ đơn giá tiêu chuẩn đã khai').toBe(giaChuan);
	});

	test('04_3_010_020 — Giá vốn khi xuất kho sản phẩm FIFO', async ({ page }) => {
		chanNeuTat('04_3_010_020');
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const dr = await k.moFormXuat(page, VAI);
		const { sp: fifo } = await k.themSanPhamXuat(page, dr, sp.fifo.tenSanPham);
		const b = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, productId: fifo.productId, variantId: fifo.variantId, size: 500 });
		const lo = (b.data || []).filter((l) => Number(l.remainQuantity) > 0).sort((x, y) => x.createdTime - y.createdTime);
		test.skip(lo.length < 2 || Number(lo[0].price) === Number(lo[1].price), `SP ${fifo.productName} chưa có 2 lô giá khác nhau (đang có ${lo.length} lô) — cần nhập thêm lô FIFO giá khác.`);
		// Lần 1: xuất ít hơn tồn lô cũ.
		await dr.locator('#supplierNote').fill('AUTO test 04_3_010_020');
		const p = await xuatNgay(page, dr);
		const ct = await k.chiTietPhieu(page, st, shopId, p.stockInOutId);
		expect(Number(ct.items[0].basePrice), 'FIFO: giá vốn ≠ giá lô cũ nhất').toBe(Number(lo[0].price));
	});
});
