'use strict';

/**
 * 14_1 · 060 — Xuất trả NCC THEO PO (màn cũ `/inventory/return-to-supplier`), vai `shop`.
 *
 * 🔴 Đo 24/09/2026 (vnpost-web d7db6594): luồng này ĐÃ NGỪNG từ 27/07/2026 —
 *   - `ReturnToSupplierListPage.jsx`: `extra={null}` kèm chú thích "chỉ còn để TRA CỨU lịch sử";
 *   - route `/inventory/return-to-supplier/create` đã gỡ khỏi `inventoryRoutes.js`; nút "Xuất trả hàng" ở chi
 *     tiết PO bị comment (`PurchaseOrderDetailPage.jsx`);
 *   - BE `ReturnToSupplierController` ném "Luồng trả hàng NCC cũ đã ngừng sử dụng — vui lòng dùng chức năng
 *     Đề nghị trả hàng NCC" cho tạo / sửa / hoàn tất.
 * ⇒ Case TRA CỨU (001/003/004) chạy thật. Case TẠO PHIẾU kiểm đúng tiền đề của kịch bản (màn có lối tạo phiếu,
 *   BE nhận phiếu) — tiền đề không còn ⇒ ĐỎ có lý do, chờ user chốt bỏ case hay chuyển sang luồng đa cấp.
 *   🚫 Không tự đổi kỳ vọng sang màn khác.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const r = require('./return-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ROUTE_PO = '/inventory/return-to-supplier';
const API_PO = '/stock/v2/return-to-supplier';
const sd = () => r.seed.doc().duLieu;

let st;

async function moDs(page) {
	st = r.k.batHeader(page);
	const cho = page.waitForResponse((x) => x.url().includes('/import-export/find') && x.url().includes('RETURN_TO_SUPPLIER'), { timeout: 60_000 });
	await r.moDanhSach(page, 'shop');
	await r.diToi(page, ROUTE_PO);
	const res = await cho;
	await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Xuất trả nhà cung cấp');
	return res;
}

/**
 * Tiền đề chung của mọi case TẠO phiếu theo PO: có lối vào màn tạo + BE nhận tạo phiếu.
 * Trả thông điệp đo được để case ghi vào báo cáo.
 */
async function tienDeTaoPhieu(page) {
	const nut = r.khung(page).getByRole('button', { name: /Tạo|Xuất trả|Thêm/ });
	const n = await nut.count();
	const b = await r.k.goiGhi(page, st, 'POST', API_PO, {}, {
		shopId: sd().diemBan.shopId, supplierId: sd().sanPhamNcc.supplierId, note: 'AUTO TEST 14_1 060 — thử tiền đề', items: [],
	});
	const tb = `nút tạo phiếu trên màn: ${n}; POST ${API_PO}: ${r.msg(b)}`;
	test.info().annotations.push({ type: 'tiền đề', description: tb });
	expect(n, `Màn xuất trả theo PO không còn lối tạo phiếu (luồng cũ ngừng 27/07/2026) — ${tb}`).toBeGreaterThan(0);
	expect(r.msg(b), `BE chặn tạo phiếu theo PO — ${tb}`).not.toContain('đã ngừng sử dụng');
}

test.describe('14_1 · 060 — Xuất trả NCC theo PO (màn cũ)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('14_1_060_001 — Màn danh sách Xuất trả nhà cung cấp theo PO', async ({ page }) => {
		chanNeuTat('14_1_060_001');
		const res = await moDs(page);
		const th = (await r.cot(page).allInnerTexts()).map(r.chuan).filter(Boolean);
		expect(th).toEqual(['STT', 'Mã phiếu', 'Nhà cung cấp', 'Tổng tiền', 'Trạng thái', 'Ngày tạo', 'Hành động']);
		await expect(r.khung(page).locator('.ant-select').filter({ hasText: 'Nhà cung cấp' })).toBeVisible();
		await expect(r.khung(page).getByPlaceholder('Tìm theo mã phiếu')).toBeVisible();
		const n = (await res.json()).page?.total_elements ?? 0;
		test.info().annotations.push({ type: 'đo', description: `Điểm bán seed có ${n} phiếu xuất trả theo PO (luồng cũ)` });
		expect(n, 'Tiền đề "có ít nhất 1 phiếu xuất trả theo PO" không có — luồng cũ đã ngừng, không tạo mới được').toBeGreaterThan(0);
	});

	test('14_1_060_003 — Lọc danh sách phiếu trả theo nhà cung cấp', async ({ page }) => {
		chanNeuTat('14_1_060_003');
		await moDs(page);
		const o = r.khung(page).locator('form .ant-form-item').first().getByRole('combobox');
		await o.click({ force: true });
		const opt = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
		const co = await opt.first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
		expect(co, 'Ô "Nhà cung cấp" của màn không có lựa chọn nào (danh sách NCC theo điểm bán rỗng)').toBe(true);
		const ncc = r.chuan(await opt.first().getAttribute('title'));
		const cho = page.waitForResponse((x) => x.url().includes('/import-export/find') && x.url().includes('objectId='), { timeout: 30_000 });
		await opt.first().click();
		const u = new URL((await cho).url());
		expect(u.searchParams.get('objectType')).toBe('SUPPLIER');
		expect(Number(u.searchParams.get('objectId'))).toBeGreaterThan(0);
		const ten = (await r.dong(page).locator('td:nth-child(3)').allInnerTexts()).map(r.chuan);
		for (const t of ten) expect(t).toBe(ncc);
		expect(ten.length, 'Không có phiếu nào của NCC để đối chiếu — tiền đề "phiếu trả của ≥ 2 NCC" không dựng được (luồng cũ ngừng)').toBeGreaterThan(0);
	});

	test('14_1_060_004 — Tìm phiếu trả theo mã phiếu', async ({ page }) => {
		chanNeuTat('14_1_060_004');
		await moDs(page);
		const cho = page.waitForResponse((x) => x.url().includes('/import-export/find') && x.url().includes('code='), { timeout: 30_000 });
		await r.khung(page).getByPlaceholder('Tìm theo mã phiếu').fill('RTS');
		await r.khung(page).getByRole('button', { name: 'Tìm kiếm' }).click();
		const u = new URL((await cho).url());
		expect([u.searchParams.get('code'), u.searchParams.get('type'), u.searchParams.get('subType')]).toEqual(['RTS', 'EXPORT', 'RETURN_TO_SUPPLIER']);
		const ma = (await r.dong(page).locator('td:nth-child(2)').allInnerTexts()).map(r.chuan);
		expect(ma.length, 'Không có phiếu nào mang mã để đối chiếu — tiền đề "biết mã phiếu trả có thật" không có').toBeGreaterThan(0);
		for (const m of ma) expect(m).toContain('RTS');
	});

	// Tên case lấy nguyên văn từ test-cases.csv; mọi case tạo phiếu dùng chung tiền đề `tienDeTaoPhieu`.
	test('14_1_060_002 — Màn tạo phiếu xuất trả theo PO có đủ ba trường', async ({ page }) => {
		chanNeuTat('14_1_060_002');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_005 — Một phiếu PO trả hàng được nhiều lần', async ({ page }) => {
		chanNeuTat('14_1_060_005');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_006 — PO trạng thái Nháp không trả hàng được', async ({ page }) => {
		chanNeuTat('14_1_060_006');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_007 — PO trạng thái Đã duyệt không trả hàng được', async ({ page }) => {
		chanNeuTat('14_1_060_007');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_008 — PO trạng thái Đã gửi NCC không trả hàng được', async ({ page }) => {
		chanNeuTat('14_1_060_008');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_009 — PO trạng thái NCC xác nhận không trả hàng được', async ({ page }) => {
		chanNeuTat('14_1_060_009');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_010 — PO đã giao và đã nhập kho thì trả hàng được', async ({ page }) => {
		chanNeuTat('14_1_060_010');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_011 — PO giao một phần hiện đúng số lượng nhận thực tế', async ({ page }) => {
		chanNeuTat('14_1_060_011');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_012 — Tạo phiếu trả cho PO giao một phần', async ({ page }) => {
		chanNeuTat('14_1_060_012');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_013 — Không nhập được SL trả vượt số đã nhập', async ({ page }) => {
		chanNeuTat('14_1_060_013');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_014 — Công nợ nhà cung cấp giảm đúng sau khi trả hàng', async ({ page }) => {
		chanNeuTat('14_1_060_014');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_015 — Lịch sử công nợ ghi nhận giao dịch trả hàng', async ({ page }) => {
		chanNeuTat('14_1_060_015');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_016 — Trả hàng nhiều lần đến đúng số lượng tối đa', async ({ page }) => {
		chanNeuTat('14_1_060_016');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_017 — Không trả vượt tổng số lượng PO sau nhiều lần trả', async ({ page }) => {
		chanNeuTat('14_1_060_017');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_018 — Cột Còn lại cập nhật sau mỗi lần trả', async ({ page }) => {
		chanNeuTat('14_1_060_018');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_019 — PO đã trả hết hàng không còn sản phẩm để trả', async ({ page }) => {
		chanNeuTat('14_1_060_019');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_020 — Ghi chú phiếu trả được lưu và hiện lại ở chi tiết', async ({ page }) => {
		chanNeuTat('14_1_060_020');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_021 — Bấm Tìm PO khi chưa chọn nhà cung cấp bị chặn', async ({ page }) => {
		chanNeuTat('14_1_060_021');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_022 — Tra mã PO không tồn tại bị chặn', async ({ page }) => {
		chanNeuTat('14_1_060_022');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_023 — Hoàn tất khi chưa chọn nhà cung cấp bị chặn', async ({ page }) => {
		chanNeuTat('14_1_060_023');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_024 — Hoàn tất khi chưa nhập SL trả bị chặn', async ({ page }) => {
		chanNeuTat('14_1_060_024');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_025 — Lưu nháp phiếu trả theo PO', async ({ page }) => {
		chanNeuTat('14_1_060_025');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_026 — Hoàn tất phiếu trả theo PO', async ({ page }) => {
		chanNeuTat('14_1_060_026');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
	test('14_1_060_027 — SL trả âm không nhập được ở màn theo PO', async ({ page }) => {
		chanNeuTat('14_1_060_027');
		await moDs(page);
		await tienDeTaoPhieu(page);
	});
});
