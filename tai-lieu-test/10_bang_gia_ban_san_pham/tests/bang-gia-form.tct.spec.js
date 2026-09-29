'use strict';

/**
 * 10 · Form Thêm bảng giá — các case KHÔNG lưu (validate, thêm sản phẩm, tính giá, phạm vi).
 * Mọi request ghi `chain-price-list/*` bị chặn ở mạng khi bấm Lưu (`luu({ chan: true })`).
 *
 * 🔴 Đo 24/09/2026 (vnpost-web af8cda07): ba nhóm ô kịch bản nhắc tới đã bị GỠ khỏi FE —
 *    "Hình thức phân phối" (Mua bán/Ký gửi, `TabProducts.jsx` comment-out, `distributionMethod` cố định
 *    MUA_BAN), "Giá niêm yết" và "Tỷ lệ chiết khấu" (`ProductPriceTable.jsx` comment-out). Case dựa vào
 *    chúng giữ nguyên kỳ vọng: kiểm SỰ CÓ MẶT của ô ⇒ đỏ kèm lý do, chờ user chốt bỏ case hay khôi phục ô.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const bg = require('./bg-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

const loiO = async (page, nhan) => bg.chuan(await page.locator('.ant-form-item').filter({ has: page.locator(`label[title="${nhan}"]`) }).locator('.ant-form-item-explain-error').allInnerTexts().then((x) => x.join(' | ')));

async function comboMuaBan(page, st) {
	// SKU combo nằm ở `variants[].sku`; lấy combo KICH_HOAT, hình thức MUA_BAN.
	const b = await k.goiApi(page, st, '/chain/products/basic-search', { type: 10, page: 0, size: 100 });
	const c = (b.data || []).find((x) => x.status === 'KICH_HOAT' && x.distributionMethod === 'MUA_BAN' && x.variants?.[0]?.sku);
	expect(c, 'Chuỗi không có combo MUA_BAN nào đang KICH_HOAT để thêm vào bảng giá').toBeTruthy();
	return { ...c, sku: c.variants[0].sku };
}

/** Ô bị gỡ khỏi FE: kiểm sự có mặt — đỏ kèm lý do. */
async function canCoO(page, loc, moTa) {
	const co = await loc.count();
	test.info().annotations.push({ type: 'đo', description: `${moTa}: ${co} phần tử` });
	expect(co, `🔴 ${moTa} KHÔNG còn trên form (FE đã comment-out) — kịch bản chưa cập nhật hoặc tính năng bị gỡ nhầm`).toBeGreaterThan(0);
}

test.describe('10 · form Thêm bảng giá (không lưu)', () => {
	test('10_020_004 — Không nhập các ô bắt buộc ở thẻ Thông tin chung', async ({ page }) => {
		chanNeuTat('10_020_004');
		await bg.moTao(page);
		const kq = await bg.luu(page, { chan: true, timeout: 8_000 });
		test.info().annotations.push({ type: 'đo', description: kq.thongBao });
		expect(kq.thongBao).toBe('Vui lòng nhập đầy đủ thông tin chung bắt buộc');
		expect(kq.bi, 'Form trống mà vẫn gửi request tạo').toEqual([]);
		await expect(bg.the(page, 'Thông tin chung')).toHaveAttribute('aria-selected', 'true');
	});

	test('10_020_005 — Ngày kết thúc trước ngày bắt đầu', async ({ page }) => {
		chanNeuTat('10_020_005');
		await bg.moTao(page);
		await bg.dienChung(page, { ten: bg.TEN('X'), pb: 'PB', batDau: '10/03/2026', ketThuc: '01/03/2026' });
		const kq = await bg.luu(page, { chan: true, timeout: 8_000 });
		const loi = { bd: await loiO(page, 'Ngày bắt đầu'), kt: await loiO(page, 'Ngày kết thúc') };
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ ...loi, tb: kq.thongBao }) });
		expect(kq.bi).toEqual([]);
		expect(loi.bd, 'Ô Ngày bắt đầu không báo lỗi').toContain('Ngày bắt đầu không thể sau ngày kết thúc');
		expect(loi.kt, 'Ô Ngày kết thúc không báo lỗi').toContain('Ngày bắt đầu không thể sau ngày kết thúc');
	});

	test('10_020_006 — Giờ kết thúc trước giờ bắt đầu trong cùng ngày', async ({ page }) => {
		chanNeuTat('10_020_006');
		await bg.moTao(page);
		await bg.dienChung(page, { ten: bg.TEN('X'), pb: 'PB', batDau: bg.homNay(), ketThuc: bg.homNay() });
		await page.getByRole('checkbox', { name: 'Không cài đặt khung giờ' }).uncheck();
		for (const [ph, v] of [['Chọn giờ bắt đầu', '14:00'], ['Chọn giờ kết thúc', '09:00']]) {
			const o = page.getByPlaceholder(ph);
			await o.click();
			await o.fill(v);
			await o.press('Enter');
		}
		const kq = await bg.luu(page, { chan: true, timeout: 8_000 });
		const loi = { bd: await loiO(page, 'Giờ bắt đầu'), kt: await loiO(page, 'Giờ kết thúc') };
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ ...loi, tb: kq.thongBao }) });
		expect(kq.bi).toEqual([]);
		expect(loi.bd, 'Ô Giờ bắt đầu không báo lỗi').not.toBe('');
		expect(loi.kt, 'Ô Giờ kết thúc không báo lỗi').not.toBe('');
	});

	test('10_020_009 — Bấm Huỷ khi đang nhập thông tin bảng giá', async ({ page }) => {
		chanNeuTat('10_020_009');
		const ten = bg.TEN(`HUY${bg.hau()}`);
		const goi = [];
		page.on('request', (r) => { if (/chain-price-list\/create/.test(r.url())) goi.push(r.url()); });
		await bg.moTao(page);
		await bg.dienChung(page, { ten, pb: 'PB' });
		await page.getByRole('button', { name: 'Huỷ' }).click();
		// Danh sách cũng có ô tìm cùng placeholder "Nhập tên bảng giá" ⇒ kiểm URL rời màn tạo.
		await expect(page).not.toHaveURL(/pricing\/create/, { timeout: 15_000 });
		const d = await bg.timDong(page, ten);
		expect(goi, 'Bấm Huỷ mà vẫn gửi request tạo').toEqual([]);
		await expect(d, 'Bấm Huỷ mà danh sách có bảng giá mới').toHaveCount(0);
	});

	test('10_070_002 — Tích cấp Tỉnh thì tự chọn hết Xã/Phường và Điểm bán bên dưới', async ({ page }) => {
		chanNeuTat('10_070_002');
		const { rac } = bg.duLieu();
		await bg.moTao(page);
		await bg.the(page, 'Phạm vi khu vực').click();
		const body = page.locator('.sp-body').first();
		const cot = (i) => body.locator('.sp-column').nth(i);
		await cot(0).locator('.sp-column__search input').fill(rac.tenTinh);
		const tinh = cot(0).locator('.sp-item').filter({ hasText: rac.tenTinh }).first();
		await tinh.locator('input[type="checkbox"]').check();
		await tinh.locator('.sp-item__label').click();
		await expect.poll(() => cot(1).locator('.sp-item').count(), { timeout: 20_000 }).toBeGreaterThan(0);
		const xa = cot(1).locator('.sp-item');
		const nXa = await xa.count();
		const xaTick = await cot(1).locator('.sp-item input[type="checkbox"]:checked').count();
		await xa.filter({ hasText: rac.tenXa }).first().locator('.sp-item__label').click();
		await expect.poll(() => cot(2).locator('.sp-item').count(), { timeout: 20_000 }).toBeGreaterThan(0);
		const nShop = await cot(2).locator('.sp-item').count();
		const shopTick = await cot(2).locator('.sp-item input[type="checkbox"]:checked').count();
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ nXa, xaTick, nShop, shopTick }) });
		expect(xaTick, 'Tích tỉnh mà không phải mọi xã được tích').toBe(nXa);
		expect(shopTick, 'Tích tỉnh mà không phải mọi điểm bán của xã được tích').toBe(nShop);
	});

	test('10_070_005 — Không chọn đơn vị nào ở thẻ Phạm vi', async ({ page }) => {
		chanNeuTat('10_070_005');
		const { sp } = bg.duLieu();
		await bg.moTao(page);
		await bg.dienChung(page, { ten: bg.TEN('X'), pb: 'PB' });
		await bg.themSku(page, sp.tieuChuan.sku);
		await bg.datGia(page, sp.tieuChuan.sku, 1000);
		const kq = await bg.luu(page, { chan: true, timeout: 8_000 });
		test.info().annotations.push({ type: 'đo', description: kq.thongBao });
		expect(kq.thongBao).toBe('Vui lòng chọn khu vực áp dụng');
		expect(kq.bi).toEqual([]);
		await expect(bg.the(page, 'Phạm vi khu vực')).toHaveAttribute('aria-selected', 'true');
	});

	test('10_070_006 — Danh sách "đơn vị đã chọn" chỉ hiện đơn vị đã tích', async ({ page }) => {
		chanNeuTat('10_070_006');
		const { rac } = bg.duLieu();
		await bg.moTao(page);
		await bg.chonPhamViRac(page);
		// "Hiển thị các đơn vị đã chọn" (`RegionSelector.jsx` ScopeStatusBar) lọc các cột về đơn vị đã tích.
		const pane = page.locator('.ant-tabs-tabpane-active');
		const cot3 = pane.locator('.sp-column').nth(2);
		const nTruoc = await cot3.locator('.sp-item').count();
		await pane.getByRole('checkbox', { name: 'Hiển thị các đơn vị đã chọn' }).check();
		await expect(cot3.locator('.sp-item')).toHaveCount(1);
		await expect(cot3.locator('.sp-item').first()).toContainText(rac.tenShop);
		const demTruoc = bg.chuan(await pane.locator('.sp-wrapper').first().innerText()).slice(0, 80);
		await cot3.locator('.sp-item').first().locator('.sp-item__checkbox').click();
		await expect(cot3.locator('.sp-item'), 'Bỏ tích mà danh sách "đã chọn" vẫn còn điểm bán').toHaveCount(0);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ nTruoc, demTruoc, demSau: bg.chuan(await pane.locator('.sp-wrapper').first().innerText()).slice(0, 80) }) });
	});

	test('10_080_008 — Đổi phương thức VAT khi bảng đã có combo', async ({ page }) => {
		chanNeuTat('10_080_008');
		const st = k.batHeader(page);
		await bg.moTao(page);
		const c = await comboMuaBan(page, st);
		const tb = await bg.themSku(page, c.sku, { loai: 'Combo sản phẩm' });
		expect(tb, `Không thêm được combo ${c.sku}`).toContain('Đã thêm');
		const truoc = await bg.dongSp(page, c.sku).count();
		const tatCa = await page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').allInnerTexts();
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ combo: [c.productName, c.sku], truoc, tatCa: tatCa.map(bg.chuan) }) });
		expect(truoc, 'Thêm combo xong mà bảng không có dòng combo').toBe(1);
		await bg.the(page, 'Thông tin chung').click();
		await page.getByText('Đơn giá chưa bao gồm VAT (Giá trước thuế)', { exact: true }).click();
		const md = page.locator('.ant-modal-confirm').last();
		const coPopup = await md.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false);
		if (!coPopup) {
			await bg.the(page, 'Sản phẩm').click();
			const conCombo = await bg.dongSp(page, c.sku).count();
			const tbLuu = (await bg.luu(page, { chan: true, timeout: 8_000 })).thongBao;
			test.info().annotations.push({ type: 'đo', description: JSON.stringify({ coPopup, conCombo, tbLuu }) });
		}
		expect(coPopup, '🔴 Đổi VAT sang "chưa bao gồm" khi bảng ĐÃ có combo mà KHÔNG hiện popup cảnh báo (hasCombo() không nhận combo vừa thêm?)').toBe(true);
		const tieuDe = bg.chuan(await md.locator('.ant-modal-confirm-title').innerText());
		const nd = bg.chuan(await md.locator('.ant-modal-confirm-content').innerText());
		await md.getByRole('button', { name: 'Xác nhận' }).click();
		await bg.the(page, 'Sản phẩm').click();
		const conDong = await bg.dongSp(page, c.sku).count();
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tieuDe, nd, conDong }) });
		// Kịch bản ghi hoa "VAT" chữ thường "thuế": FE là "Thay đổi phương thức tính thuế VAT".
		expect(tieuDe.toLowerCase()).toBe('thay đổi phương thức tính thuế vat');
		expect(nd).toContain('sẽ xóa toàn bộ combo sản phẩm đã thêm');
		expect(conDong, 'Xác nhận đổi VAT mà combo vẫn còn trong bảng').toBe(0);
	});

	test('10_090_002 — Thêm sản phẩm Mua bán theo SKU', async ({ page }) => {
		chanNeuTat('10_090_002');
		const { sp } = bg.duLieu();
		await bg.moTao(page);
		const tb = await bg.themSku(page, sp.tieuChuan.sku);
		expect(tb).toBe('Đã thêm 1 sản phẩm mới.');
		await expect(bg.dongSp(page, sp.tieuChuan.sku)).toBeVisible();
	});

	test('10_090_001 — Thêm sản phẩm Mua bán theo danh mục', async ({ page }) => {
		chanNeuTat('10_090_001');
		const { danhMuc } = bg.duLieu();
		await bg.moTao(page);
		await bg.the(page, 'Sản phẩm').click();
		const pane = page.locator('.ant-tabs-tabpane-active');
		await page.locator('.ant-radio-button-wrapper').filter({ hasText: /^Danh mục$/ }).first().click();
		// Ô "Chọn danh mục" mở Popover chứa Tree checkable (`PanelLeft.jsx`); bấm tên = tích.
		await pane.getByText('Chọn danh mục...', { exact: true }).click();
		const pop = page.locator('.ant-popover:visible').last();
		await pop.getByPlaceholder('Tìm kiếm danh mục...').fill(danhMuc.ten);
		const nut = pop.locator('.ant-tree-treenode').filter({ hasText: new RegExp(`(^|\\W)${danhMuc.ten}$`) }).first();
		await expect(nut, `Cây danh mục không có "${danhMuc.ten}"`).toBeVisible({ timeout: 20_000 });
		await nut.locator('.ant-tree-checkbox').click();
		await pane.getByText('Thêm theo', { exact: true }).click();
		const tb = await bg.thongBaoQuanh(page, () => page.getByRole('button', { name: 'Thêm vào danh sách' }).click());
		const n = await page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').count();
		const tong = bg.chuan(await page.locator('.ant-tabs-tabpane-active .ant-pagination-total-text, .ant-tabs-tabpane-active .ant-table-footer').allInnerTexts().then((x) => x.join(' ')));
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, n, tong }) });
		const m = tb.match(/Đã thêm (\d+) sản phẩm mới/);
		expect(m, `Toast không theo khuôn "Đã thêm x sản phẩm mới": ${tb}`).toBeTruthy();
		expect(Number(m[1]), 'Số trong toast ≠ số dòng hiện trên bảng (trang 1)').toBeGreaterThanOrEqual(n);
		expect(Number(m[1])).toBeGreaterThan(0);
	});

	test('10_090_005 — Thêm Combo Mua bán theo SKU', async ({ page }) => {
		chanNeuTat('10_090_005');
		const st = k.batHeader(page);
		await bg.moTao(page);
		const c = await comboMuaBan(page, st);
		const tb = await bg.themSku(page, c.sku, { loai: 'Combo sản phẩm' });
		expect(tb).toBe('Đã thêm 1 sản phẩm mới.');
		await expect(bg.dongSp(page, c.sku)).toBeVisible();
	});

	test('10_090_007 — Thêm lại sản phẩm ĐÃ tồn tại trong bảng', async ({ page }) => {
		chanNeuTat('10_090_007');
		const { sp } = bg.duLieu();
		await bg.moTao(page);
		await bg.themSku(page, sp.tieuChuan.sku);
		const tb = await bg.themSku(page, sp.tieuChuan.sku);
		const n = await page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').filter({ hasText: sp.tieuChuan.sku }).count();
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, n }) });
		expect(tb).toBe('Tất cả sản phẩm vừa chọn đã tồn tại trên bảng.');
		expect(n, 'Sản phẩm bị thêm lần hai').toBe(1);
	});

	test('10_090_008 — Thêm sản phẩm theo danh mục hoặc SKU nhưng không tồn tại', async ({ page }) => {
		chanNeuTat('10_090_008');
		await bg.moTao(page);
		const tb = await bg.themSku(page, `KHONGCO${bg.hau()}`);
		const n = await page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').count();
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, n, veDanhMucRong: 'chưa dựng danh mục rỗng — chỉ đo vế SKU' }) });
		expect(tb).toBe('Không tìm thấy sản phẩm nào');
		expect(n).toBe(0);
	});

	test('10_090_011 — Tạo bảng giá khi KHÔNG thêm sản phẩm nào', async ({ page }) => {
		chanNeuTat('10_090_011');
		await bg.moTao(page);
		await bg.dienChung(page, { ten: bg.TEN('X'), pb: 'PB' });
		await bg.chonPhamViRac(page);
		const kq = await bg.luu(page, { chan: true, timeout: 8_000 });
		test.info().annotations.push({ type: 'đo', description: kq.thongBao });
		expect(kq.thongBao).toBe('Vui lòng chọn sản phẩm');
		expect(kq.bi).toEqual([]);
	});

	test('10_100_005 — Nhập số ÂM cho các ô cần nhập số', async ({ page }) => {
		chanNeuTat('10_100_005');
		const { sp } = bg.duLieu();
		await bg.moTao(page);
		await bg.themSku(page, sp.tieuChuan.sku);
		const v = await bg.datGia(page, sp.tieuChuan.sku, -1000);
		const oKhac = await bg.dongSp(page, sp.tieuChuan.sku).locator('.ant-input-number-input').count();
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ donGia: v, soONhapSo: oKhac }) });
		expect(v.replace(/\D/g, '') || '0', 'Đơn giá âm không tự về 0').toBe('0');
		// Vế "Giá niêm yết / Tỷ lệ chiết khấu" không làm được: hai ô đã bị gỡ — đo ở 10_100_001..004.
	});

	test('10_120_001 — Xoá hàng loạt sản phẩm khỏi bảng giá', async ({ page }) => {
		chanNeuTat('10_120_001');
		const { sp } = bg.duLieu();
		await bg.moTao(page);
		for (const s of [sp.tieuChuan.sku, sp.fifo.sku, sp.dichDanh.sku]) await bg.themSku(page, s);
		const rows = page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row');
		await expect(rows).toHaveCount(3);
		for (const s of [sp.tieuChuan.sku, sp.fifo.sku]) await bg.dongSp(page, s).locator('input.ant-checkbox-input').check();
		// Nút "Xóa hàng loạt" chỉ hiện khi có dòng được tích (`ProductPriceTable.jsx`); nút "Xóa" ở toolbar là XOÁ TOÀN BỘ.
		await page.locator('.ant-tabs-tabpane-active').getByRole('button', { name: 'Xóa hàng loạt' }).click();
		const md = page.locator('.ant-popover:visible').filter({ hasText: 'Bạn có chắc chắn muốn xóa các sản phẩm này?' }).last();
		await md.getByRole('button', { name: /OK|Đồng ý|Xác nhận/ }).first().click();
		await expect(rows).toHaveCount(1);
		await expect(bg.dongSp(page, sp.dichDanh.sku), 'Dòng KHÔNG chọn bị xoá theo').toBeVisible();
	});

	test('10_090_004 — Thêm Combo Mua bán theo danh mục', async ({ page }) => {
		chanNeuTat('10_090_004');
		const st = k.batHeader(page);
		await bg.moTao(page);
		const c = await comboMuaBan(page, st);
		// Số combo MUA_BAN đang KICH_HOAT trong đúng danh mục đó (tính tay qua API).
		const ds = ((await k.goiApi(page, st, '/chain/products/basic-search', { type: 10, categoryId: c.categoryId, page: 0, size: 500 })).data || []);
		await bg.the(page, 'Sản phẩm').click();
		const pane = page.locator('.ant-tabs-tabpane-active');
		await bg.chonLoaiSp(page, 'Combo sản phẩm');
		await page.locator('.ant-radio-button-wrapper').filter({ hasText: /^Danh mục$/ }).first().click();
		await pane.getByText('Chọn danh mục...', { exact: true }).click();
		const pop = page.locator('.ant-popover:visible').last();
		await pop.getByPlaceholder('Tìm kiếm danh mục...').fill(c.categoryName.trim());
		const nut = pop.locator('.ant-tree-treenode').filter({ hasText: c.categoryName.trim() }).first();
		await expect(nut, `Cây danh mục combo không có "${c.categoryName}"`).toBeVisible({ timeout: 20_000 });
		await nut.locator('.ant-tree-checkbox').click();
		await pane.getByText('Thêm theo', { exact: true }).click();
		const tb = await bg.thongBaoQuanh(page, () => page.getByRole('button', { name: 'Thêm vào danh sách' }).click());
		const m = tb.match(/Đã thêm (\d+) sản phẩm mới/);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ danhMuc: c.categoryName, tb, apiTong: ds.length, apiKichHoatMuaBan: ds.filter((x) => x.status === 'KICH_HOAT' && x.distributionMethod === 'MUA_BAN').length }) });
		expect(m, `Toast không theo khuôn "Đã thêm x sản phẩm mới": ${tb}`).toBeTruthy();
		expect(Number(m[1]), 'Số combo thêm vào = 0').toBeGreaterThan(0);
		await expect(bg.dongSp(page, c.sku), `Combo ${c.sku} của danh mục không vào bảng`).toBeVisible();
	});

	// ── Ô đã bị gỡ khỏi FE ──────────────────────────────────────────────────────────────────
	for (const [id, ten] of [
		['10_080_003', 'Giao diện thẻ Sản phẩm khi hình thức là Ký gửi'],
		['10_090_003', 'Nhập SKU sản phẩm KÝ GỬI vào bảng giá Mua bán'],
		['10_090_006', 'Nhập SKU combo KÝ GỬI vào bảng giá Mua bán'],
		['10_100_006', 'Nhập Giá bán và Tỷ lệ chiết khấu thủ công cho sản phẩm Ký gửi'],
		['10_110_001', 'Thêm sản phẩm Ký gửi theo danh mục'],
		['10_110_002', 'Thêm sản phẩm Ký gửi theo SKU'],
		['10_110_003', 'Nhập SKU sản phẩm MUA BÁN vào bảng giá Ký gửi'],
		['10_110_004', 'Thêm Combo Ký gửi theo danh mục'],
		['10_110_005', 'Thêm Combo Ký gửi theo SKU'],
		['10_110_006', 'Thêm sản phẩm Ký gửi từ file Excel'],
		['10_110_007', 'Tạo bảng giá Ký gửi thành công với khai báo hợp lệ'],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			await bg.moTao(page);
			await bg.the(page, 'Sản phẩm').click();
			await canCoO(page, page.locator('.ant-tabs-tabpane-active, .ant-tabs-tabpane').getByText('Ký gửi', { exact: true }), 'Lựa chọn hình thức "Ký gửi" (thẻ Thông tin chung / Sản phẩm)');
		});
	}
	for (const [id, ten] of [
		['10_100_001', 'Nhập giá bán LỚN HƠN giá niêm yết'],
		['10_100_002', 'Nhập giá niêm yết NHỎ HƠN giá bán'],
		['10_100_003', 'Tỷ lệ chiết khấu tự tính từ giá niêm yết và giá bán'],
		['10_100_004', 'Nhập tỷ lệ chiết khấu lớn hơn 100'],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			const { sp } = bg.duLieu();
			await bg.moTao(page);
			await bg.themSku(page, sp.tieuChuan.sku);
			const th = page.locator('.ant-tabs-tabpane-active .ant-table-thead th');
			await canCoO(page, th.filter({ hasText: /Giá niêm yết|Tỷ lệ chiết khấu/ }), 'Cột "Giá niêm yết" / "Tỷ lệ chiết khấu" của bảng sản phẩm');
		});
	}
});
