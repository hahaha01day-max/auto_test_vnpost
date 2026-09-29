'use strict';

/**
 * 04_3 · 020 — Sửa / duyệt phiếu nhập NHÁP trên điểm bán seed của làn, vai `shop` (Cửa hàng trưởng).
 *
 * 🔴 Phiếu nháp do `04_3_020_002` (vai `seed_gdv`) tạo, tìm lại theo ghi chú `GHI_CHU_NHAP` — Giao
 * dịch viên không thấy thẻ danh sách phiếu nên không mở lại được phiếu của mình.
 * Không còn phiếu nháp nào ⇒ skip kèm lý do (🚫 không tự tạo bằng vai khác giữa chừng).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('./ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

/** Mở màn lịch sử, tìm phiếu nháp của auto test; trả về { st, phieu } hoặc skip. */
async function moPhieuNhap(page) {
	const { shopId } = k.duLieuSeed();
	const st = k.batHeader(page);
	const cho = page.waitForResponse((r) => r.url().includes('/stock/v2/import-export/find'), { timeout: 60_000 });
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/import`, VAI);
	await cho;
	const ds = await k.goiApi(page, st, '/stock/v2/import-export/find', {
		shopId, type: 'IMPORT', status: 'DRAFT', page: 0, size: 50, sort: 'actionTime,DESC',
	});
	const phieu = (ds.data || []).find((x) => x.status === 'DRAFT' && x.note === k.GHI_CHU_NHAP);
	test.skip(!phieu, `Không còn phiếu nháp "${k.GHI_CHU_NHAP}" — chạy 04_3_020_002 (vai seed_gdv) trước.`);
	const dong = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: phieu.code }).first();
	await expect(dong, `Phiếu ${phieu.code} không hiện ở trang đầu danh sách`).toBeVisible();
	await dong.getByText(phieu.code).click();
	const ct = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu nhập kho' }).last();
	await expect(ct).toContainText('Phiếu nháp');
	return { shopId, st, phieu, ct };
}

test.describe('04_3 · 020 — Sửa rồi duyệt phiếu nhập nháp (điểm bán seed)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('04_3_020_003 — Chỉnh sửa phiếu nhập kho nháp', async ({ page }) => {
		chanNeuTat('04_3_020_003');
		const { shopId, st, phieu, ct } = await moPhieuNhap(page);
		const truoc = await k.chiTietPhieu(page, st, shopId, phieu.stockInOutId);
		expect(truoc.items?.length, 'Phiếu nháp không có dòng nào').toBeGreaterThan(0);
		const it = truoc.items[0];
		const tonTruoc = await k.tonVariant(page, st, shopId, it.productId, it.variantId);
		const slMoi = Number(it.quantity) + 3;

		await ct.getByRole('button', { name: 'Chỉnh sửa' }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thông tin phiếu nhập kho' }).last();
		const dong = dr.locator('tr[data-row-key]').filter({ hasText: it.productName }).first();
		await expect(dong).toBeVisible();
		await dong.locator('input[role="spinbutton"]').first().fill(String(slMoi));
		// Đổi SL dòng thì lô duy nhất được FE tự co giãn theo — vẫn mở drawer lô để chắc tổng khớp.
		const { sp } = k.duLieuSeed();

		// Bước "thêm một dòng mới": ở cấp điểm bán chỉ SP giá tiêu chuẩn nhập tay được (xem ghi-kho.js).
		// Thử thêm SP FIFO của seed — ghi nhận mềm để các bước còn lại vẫn được kiểm.
		const { dong: dongMoi } = await k.themSanPham(page, dr, sp.fifo.tenSanPham);
		const moKhoa = await dongMoi.locator('input[role="spinbutton"]').first().isEnabled();
		expect.soft(moKhoa, `Không thêm được dòng ${sp.fifo.tenSanPham} vào phiếu nháp: ô số lượng bị khoá ("Chưa có bảng giá")`).toBe(true);
		if (!moKhoa) await dongMoi.getByRole('button', { name: 'Xóa' }).click();
		else await k.nhapLo(page, dongMoi, [{ nsx: '01/09/2026', hsd: '01/09/2027' }]);

		const { body } = await k.bamVaCho(page, dr.getByRole('button', { name: /Cập nhật/ }), '/stock/', 'PUT');
		expect(String(body?.status?.code), `Cập nhật nháp lỗi: ${body?.status?.message}`).toBe('200');

		const sau = await k.chiTietPhieu(page, st, shopId, phieu.stockInOutId);
		expect(sau.status, 'Sửa xong phiếu không còn là nháp').toBe('DRAFT');
		const itSau = sau.items.find((x) => x.variantId === it.variantId);
		expect(Number(itSau?.quantity), 'Mở lại phiếu không thấy số lượng mới').toBe(slMoi);
		if (moKhoa) expect(sau.items.length, 'Dòng mới không được lưu').toBe(truoc.items.length + 1);
		expect(await k.tonVariant(page, st, shopId, it.productId, it.variantId), 'Sửa phiếu nháp đã ghi tồn').toBe(tonTruoc);
	});

	test('04_3_020_004 — Duyệt phiếu nháp thành phiếu nhập chính thức', async ({ page }) => {
		chanNeuTat('04_3_020_004');
		const { shopId, st, phieu, ct } = await moPhieuNhap(page);
		const truoc = await k.chiTietPhieu(page, st, shopId, phieu.stockInOutId);
		expect(truoc.items?.length, 'Phiếu nháp không có dòng nào để đối chiếu tồn').toBeGreaterThan(0);
		const ton = {};
		for (const it of truoc.items) {
			ton[it.variantId] = await k.tonVariant(page, st, shopId, it.productId, it.variantId);
		}

		const { body } = await k.bamVaCho(page, ct.getByRole('button', { name: 'Duyệt phiếu' }), '/import-export/confirm');
		expect(String(body?.status?.code), `Duyệt phiếu lỗi: ${body?.status?.message}`).toBe('200');

		const sau = await k.chiTietPhieu(page, st, shopId, phieu.stockInOutId);
		expect(sau.status, 'Duyệt xong phiếu không sang trạng thái chính thức').not.toBe('DRAFT');
		for (const it of truoc.items) {
			const sl = Number(it.quantity) * Number(it.convertToMainUnit || 1);
			expect(
				await k.tonVariant(page, st, shopId, it.productId, it.variantId),
				`Tồn ${it.sku} sau duyệt không tăng đúng ${sl}`,
			).toBe(ton[it.variantId] + sl);
		}
	});
});
