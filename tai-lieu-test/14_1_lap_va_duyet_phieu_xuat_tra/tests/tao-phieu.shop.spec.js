'use strict';

/**
 * 14_1 · 010 — Màn TẠO phiếu xuất trả NCC (vai `shop`, điểm bán seed của làn), phần KHÔNG ghi:
 * tra nguồn hàng, kiểm hợp lệ phía FE. Cả file bọc `chanGhi()` — mọi POST/PUT luồng kho bị chặn 403
 * và case nào cần "không phát sinh POST" thì đếm request thật bằng `ghiPhieuTra()`.
 *
 * Nguồn: `vnpost-web/src/features/returnToSupplier/pages/StockReturnRequestFormPage.jsx` (xem fe-moc.json).
 * Dữ liệu: phiếu tồn đầu kỳ đã chốt của điểm bán seed (4 SP, mỗi SP đúng 1 lô) + SP giá tiêu chuẩn
 * `AUTO<N>_SP_TC` có nhiều lô (tab SKU) + SP biến thể có quy đổi `Hộp=10`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const r = require('./return-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const sd = () => r.seed.doc().duLieu;
const shopId = () => sd().diemBan.shopId;
const SP = () => sd().sanPham.sanPhamTheoGiaVon;
const so = (s) => Number(r.chuan(s).replace(/\./g, '').replace(',', '.').split(' ')[0]);

let st;
let box;
let posts;

test.describe('14_1 · 010 — Tạo phiếu xuất trả: tra nguồn và kiểm hợp lệ', () => {
	test.describe.configure({ timeout: 180_000 });

	test.beforeEach(async ({ page }) => {
		await r.chanGhi(page);
		st = r.k.batHeader(page);
		posts = r.ghiPhieuTra(page);
		await r.moDanhSach(page, VAI);
		box = await r.moFormTao(page);
		expect(box, 'Vai điểm bán không thấy nút "Tạo phiếu trả"').toBeTruthy();
		await expect(box.getByPlaceholder(r.O_PHIEU)).toBeVisible({ timeout: 20_000 });
	});

	/** Tra phiếu tồn đầu kỳ → trả { phieu, dongs }. */
	async function napPhieu(page, ma) {
		const phieu = await r.phieuDauKy(page, st, shopId());
		await r.traPhieuNhap(page, box, ma ?? phieu.code);
		await expect(r.hang(box)).toHaveCount(phieu.items.length, { timeout: 20_000 });
		return phieu;
	}
	const dongSp = (ten) => r.hang(box).filter({ hasText: ten }).first();

	test('14_1_010_004 — Tra mã phiếu nhập hợp lệ nạp đủ sản phẩm và lô còn tồn', async ({ page }) => {
		chanNeuTat('14_1_010_004');
		const phieu = await napPhieu(page);
		expect(phieu.items.length, 'Phiếu nguồn không có SP').toBeGreaterThan(1);
		const th = (await box.locator('.ant-table-thead th').allInnerTexts()).map(r.chuan).filter(Boolean);
		expect(th).toEqual(['STT', 'Sản phẩm', 'SL phiếu', 'SL khả dụng', 'ĐVT trả', 'SL trả', 'Lô', 'Serial']);
		for (const it of phieu.items) {
			const d = r.hang(box).filter({ hasText: it.sku }).first();
			await expect(d, `Bảng thiếu dòng ${it.sku}`).toBeVisible();
			const o = (await d.locator('td').allInnerTexts()).map(r.chuan);
			expect(so(o[2]), `SL phiếu của ${it.sku}`).toBe(Number(it.quantity));
			const lo = (it.batchProducts || []).map((b) => b.batchCode);
			for (const ma of lo) expect(o[6], `Cột Lô của ${it.sku} thiếu lô ${ma} của phiếu`).toContain(ma);
		}
	});

	test('14_1_010_007 — Tra mã phiếu nhập viết thường vẫn tìm được', async ({ page }) => {
		chanNeuTat('14_1_010_007');
		const phieu = await r.phieuDauKy(page, st, shopId());
		expect(phieu.code, 'Mã phiếu nguồn không có chữ cái để thử chữ thường').toMatch(/[A-Z]/);
		const tb = await r.traPhieuNhap(page, box, phieu.code.toLowerCase());
		expect(tb, 'Gõ mã chữ thường bị báo lỗi — mã phiếu phân biệt hoa thường').toBe('');
		await expect(r.hang(box)).toHaveCount(phieu.items.length, { timeout: 20_000 });
	});

	test('14_1_010_008 — Tra mã lô còn tồn thêm được sản phẩm của lô', async ({ page }) => {
		chanNeuTat('14_1_010_008');
		const fifo = await r.phieuDauKy(page, st, shopId()).then((p) => p.items.find((x) => x.sku === SP().fifo.sku));
		const lo = (await r.loCon(page, st, shopId(), fifo.productId, fifo.variantId))[0];
		expect(lo, `SP ${SP().fifo.sku} không có lô còn tồn`).toBeTruthy();
		await r.doiNguonSku(page, box);
		const tb = await r.traLo(page, box, lo.batchCode);
		expect(tb, 'Tra lô còn tồn mà có thông báo').toBe('');
		const d = dongSp(SP().fifo.tenSanPham);
		await expect(d).toBeVisible();
		const o = (await d.locator('td').allInnerTexts()).map(r.chuan);
		// Tab SKU: STT · Sản phẩm · SL khả dụng · ĐVT trả · SL trả · Lô · Serial · (xoá)
		expect(o[5], 'Cột Lô không phải mã lô vừa tra').toBe(lo.batchCode);
		expect(so(o[2]), 'SL khả dụng ≠ tồn còn lại của lô').toBe(Number(lo.remainQuantity));
	});

	test('14_1_010_009 — Tra mã lô không còn tồn bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_009');
		await r.doiNguonSku(page, box);
		const tb = await r.traLo(page, box, 'LO_KHONG_CO');
		expect(tb).toContain('Không tìm thấy lô "LO_KHONG_CO" còn tồn trong kho');
		await expect(r.hang(box)).toHaveCount(0);
	});

	test('14_1_010_010 — Bấm Tìm khi ô mã lô rỗng bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_010');
		await r.doiNguonSku(page, box);
		const tb = await r.traLo(page, box, '');
		expect(tb).toContain('Vui lòng nhập mã lô');
	});

	test('14_1_010_011 — Tra lại lô đã có trong danh sách không nhân đôi dòng', async ({ page }) => {
		chanNeuTat('14_1_010_011');
		const fifo = await r.phieuDauKy(page, st, shopId()).then((p) => p.items.find((x) => x.sku === SP().fifo.sku));
		const lo = (await r.loCon(page, st, shopId(), fifo.productId, fifo.variantId))[0];
		await r.doiNguonSku(page, box);
		await r.traLo(page, box, lo.batchCode);
		await expect(r.hang(box)).toHaveCount(1);
		const tb = await r.traLo(page, box, lo.batchCode);
		expect(tb).toContain('Sản phẩm của lô này đã có trong danh sách');
		await expect(r.hang(box), 'Tra lại lô làm nhân đôi dòng').toHaveCount(1);
	});

	test('14_1_010_013 — Quét serial không tồn tại bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_013');
		await r.doiNguonSku(page, box);
		const tb = await r.traSerial(page, box, 'SERIALKHONGCO');
		expect(tb).toContain('Serial "SERIALKHONGCO" không tồn tại hoặc đã xuất kho');
		await expect(r.hang(box)).toHaveCount(0);
	});

	test('14_1_010_014 — Bấm Tìm khi ô serial rỗng bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_014');
		await r.doiNguonSku(page, box);
		const tb = await r.traSerial(page, box, '');
		expect(tb).toContain('Vui lòng nhập serial');
	});

	test('14_1_010_016 — Bỏ trống Lý do trả hàng bị chặn khi tạo phiếu', async ({ page }) => {
		chanNeuTat('14_1_010_016');
		await napPhieu(page);
		await r.nhapSl(dongSp(SP().fifo.tenSanPham), 1);
		await r.bam(page, 'Tạo phiếu (chờ duyệt)');
		const o = r.fItem(box, 'Lý do trả hàng');
		await expect(o.locator('.ant-form-item-explain-error')).toHaveText('Chọn lý do trả hàng');
		await expect(o.locator('.ant-select-status-error')).toHaveCount(1);
		expect(posts, 'Thiếu lý do mà vẫn gửi request ghi').toEqual([]);
	});

	test('14_1_010_017 — Chọn Lý do khác mà bỏ trống Nội dung lý do bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_017');
		await napPhieu(page);
		await r.nhapSl(dongSp(SP().fifo.tenSanPham), 1);
		await r.chonLyDo(page, box, 'Lý do khác');
		await r.bam(page, 'Tạo phiếu (chờ duyệt)');
		await expect(r.fItem(box, 'Nội dung lý do').locator('.ant-form-item-explain-error')).toHaveText('Nhập lý do trả hàng');
		expect(posts).toEqual([]);
	});

	test('14_1_010_018 — Nội dung lý do toàn khoảng trắng bị coi là bỏ trống', async ({ page }) => {
		chanNeuTat('14_1_010_018');
		await napPhieu(page);
		await r.nhapSl(dongSp(SP().fifo.tenSanPham), 1);
		await r.chonLyDo(page, box, 'Lý do khác');
		await r.fItem(box, 'Nội dung lý do').locator('textarea').fill('     ');
		await r.bam(page, 'Tạo phiếu (chờ duyệt)');
		await expect(r.fItem(box, 'Nội dung lý do').locator('.ant-form-item-explain-error')).toHaveText('Nhập lý do trả hàng');
		expect(posts).toEqual([]);
	});

	test('14_1_010_019 — Tạo phiếu khi chưa nhập SL trả cho dòng nào bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_019');
		await napPhieu(page);
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		const tb = await r.bam(page, 'Tạo phiếu (chờ duyệt)');
		expect(tb).toContain('Nhập số lượng trả cho ít nhất 1 sản phẩm');
		expect(posts).toEqual([]);
	});

	test('14_1_010_020 — Tạo phiếu nguồn phiếu nhập mà chưa tra mã hợp lệ bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_020');
		const phieu = await r.phieuDauKy(page, st, shopId());
		await box.getByPlaceholder(r.O_PHIEU).fill(phieu.code);
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		const tb = await r.bam(page, 'Tạo phiếu (chờ duyệt)');
		expect(tb).toContain('Vui lòng nhập mã phiếu nhập/chuyển kho hợp lệ');
		expect(posts).toEqual([]);
	});

	test('14_1_010_021 — Còn dòng chưa nhập SL thì hỏi lại trước khi tạo phiếu', async ({ page }) => {
		chanNeuTat('14_1_010_021');
		const phieu = await napPhieu(page);
		await r.nhapSl(dongSp(SP().fifo.tenSanPham), 1);
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		await r.nutFooter(page, 'Tạo phiếu (chờ duyệt)').click();
		const m = page.locator('.ant-modal-confirm').filter({ hasText: 'Có sản phẩm chưa nhập số lượng trả' });
		await expect(m).toBeVisible();
		await expect(m.locator('.ant-modal-confirm-content')).toHaveText(
			`${phieu.items.length - 1} sản phẩm chưa nhập số lượng sẽ KHÔNG được đưa vào phiếu. Bạn vẫn muốn tiếp tục?`,
		);
		await expect(m.getByRole('button', { name: 'Tiếp tục tạo phiếu' })).toBeVisible();
		await m.getByRole('button', { name: 'Ở lại nhập tiếp' }).click();
		await expect(m).toBeHidden();
		await page.waitForTimeout(1_500);
		expect(posts, 'Bấm "Ở lại nhập tiếp" mà vẫn gửi phiếu').toEqual([]);
	});

	test('14_1_010_022 — SL trả vượt SL khả dụng bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_022');
		await napPhieu(page);
		const d = dongSp(SP().fifo.tenSanPham);
		const kd = so((await d.locator('td').allInnerTexts())[3]);
		expect(kd, 'SL khả dụng không đọc được').toBeGreaterThan(0);
		const o = await r.nhapSl(d, kd + 1);
		const giu = Number(await o.inputValue());
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		// Bỏ hộp hỏi "còn dòng chưa nhập SL" để tới được bước kiểm SL khả dụng.
		const tb = await r.thongBao(page, async () => {
			await r.nutFooter(page, 'Tạo phiếu (chờ duyệt)').click();
			const m = page.locator('.ant-modal-confirm').filter({ hasText: 'Có sản phẩm chưa nhập số lượng trả' });
			if (await m.waitFor({ timeout: 4_000 }).then(() => true).catch(() => false)) {
				await m.getByRole('button', { name: 'Tiếp tục tạo phiếu' }).click();
			}
			await page.waitForTimeout(2_000);
		}, 8_000);
		// 🔴 Đo 24/09: ô SL trả là InputNumber max = SL khả dụng ⇒ gõ kd+1 rồi rời ô là tự hạ về kd,
		//    cảnh báo "vượt SL khả dụng" của kịch bản không bao giờ hiện. Giữ kỳ vọng của kịch bản.
		expect(
			tb,
			`Gõ ${kd + 1} (khả dụng ${kd}) — ô SL tự giữ ${giu}; không hiện cảnh báo vượt SL khả dụng`,
		).toContain(`SL trả (${kd + 1} Cái) vượt SL khả dụng (${kd} Cái)`);
	});

	test('14_1_010_024 — SL trả âm không nhập được', async ({ page }) => {
		chanNeuTat('14_1_010_024');
		await napPhieu(page);
		const o = await r.nhapSl(dongSp(SP().fifo.tenSanPham), -5);
		expect(Number(await o.inputValue()), 'Ô SL trả nhận giá trị âm').toBe(0);
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		const tb = await r.bam(page, 'Tạo phiếu (chờ duyệt)');
		expect(tb, 'Dòng SL âm vẫn được đưa vào phiếu').toContain('Nhập số lượng trả cho ít nhất 1 sản phẩm');
		expect(posts).toEqual([]);
	});

	test('14_1_010_025 — SL trả thập phân theo đơn vị quy đổi', async ({ page }) => {
		chanNeuTat('14_1_010_025');
		await napPhieu(page);
		const bt = sd().sanPham.sanPhamBienThe;
		const lon = bt.skus.find((x) => x.heSo > 1);
		expect(lon, 'SP biến thể seed không có đơn vị quy đổi').toBeTruthy();
		const d = r.hang(box).filter({ hasText: bt.skus[0].sku }).first();
		await d.locator('td').nth(4).locator('.ant-select').click();
		await page.locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${lon.donVi}"]`).click();
		await expect(d.locator('td').nth(4)).toContainText(lon.donVi);
		const o = await r.nhapSl(d, 1.5);
		const giu = Number(String(await o.inputValue()).replace(',', '.'));
		test.info().annotations.push({ type: 'đo', description: `Gõ 1,5 ${lon.donVi} ⇒ ô giữ ${giu}; ô phụ: ${r.chuan(await d.locator('td').nth(5).innerText())}` });
		expect(giu, `Ô SL trả không nhận số thập phân theo ${lon.donVi}`).toBe(1.5);
		await expect(d.locator('td').nth(5), 'Không quy đổi 1,5 đơn vị lớn về đơn vị chính').toContainText(`= ${1.5 * lon.heSo} ${bt.donViGoc}`);
	});

	test('14_1_010_028 — Hàng nhiều lô mà không nhập SL cho lô nào bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_028');
		await r.doiNguonSku(page, box);
		const d = await r.themSku(page, box, SP().tieuChuan.tenSanPham);
		const lo = d.locator('td').nth(5).locator('.ant-select');
		await lo.click();
		const opt = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
		expect(await opt.count(), 'SP không có ≥ 2 lô còn tồn').toBeGreaterThanOrEqual(2);
		await opt.nth(0).click();
		await opt.nth(1).click();
		await page.keyboard.press('Escape');
		await expect(d.locator('td').nth(5).locator('.ant-input-number-input')).toHaveCount(2);
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		const tb = await r.bam(page, 'Tạo phiếu (chờ duyệt)');
		expect(tb).toContain(`Sản phẩm "${SP().tieuChuan.tenSanPham}": nhập SL trả cho từng lô`);
		expect(posts).toEqual([]);
	});

	test('14_1_010_029 — SL trả của một lô vượt tồn của chính lô đó bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_029');
		await r.doiNguonSku(page, box);
		const d = await r.themSku(page, box, SP().tieuChuan.tenSanPham);
		await d.locator('td').nth(5).locator('.ant-select').click();
		const opt = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
		await opt.nth(0).click();
		await opt.nth(1).click();
		await page.keyboard.press('Escape');
		const dongLo = d.locator('td').nth(5).locator('.flex.items-center.gap-2').first();
		const ma = r.chuan(await dongLo.locator('span').first().innerText());
		const ton = so((await dongLo.locator('span').last().innerText()).replace('/', ''));
		const o = dongLo.locator('.ant-input-number-input');
		await o.fill(String(ton + 1));
		await o.press('Tab');
		const giu = Number(await o.inputValue());
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		const tb = await r.bam(page, 'Tạo phiếu (chờ duyệt)');
		// 🔴 Ô SL từng lô có max = tồn lô ⇒ antd tự hạ về tồn khi rời ô (đo 24/09). Giữ kỳ vọng kịch bản.
		expect(tb, `Gõ ${ton + 1} cho lô ${ma} (tồn ${ton}) — ô tự giữ ${giu}`).toContain(
			`lô ${ma}: SL trả vượt tồn của lô (${ton} Cái)`,
		);
	});

	test('14_1_010_039 — Rời màn tạo phiếu không lưu lại gì', async ({ page }) => {
		chanNeuTat('14_1_010_039');
		await napPhieu(page);
		await r.nhapSl(dongSp(SP().fifo.tenSanPham), 1);
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		const tong = async () => (await r.k.goiApi(page, st, r.API, { page: 0, size: 1 })).page?.total_elements ?? 0;
		const truoc = await tong();
		await page.locator('.ant-page-header-heading-title button').first().click();
		await expect(page).toHaveURL(new RegExp(`${r.ROUTE}$`));
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Xuất trả nhà cung cấp');
		// Danh sách dùng cache RTK (keepUnusedDataFor 30s) ⇒ không chờ GET, đếm lại bằng API.
		expect(await tong(), 'Rời màn mà số phiếu trả thay đổi').toBe(truoc);
		expect(posts, 'Rời màn mà đã gửi phiếu').toEqual([]);
	});
});
