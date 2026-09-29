'use strict';

/**
 * 04_3 · 020 — Phiếu nhập kho: case GHI trên điểm bán seed của làn, vai `seed_gdv`.
 *
 * 🔴 Ghi tồn thật của điểm bán seed. Đối chiếu tồn bằng `GET /stock/v2/batch-product` (Σ
 * remainQuantity các lô), gọi bằng chính header phiên của vai.
 * 🔴 Giao dịch viên TẠO được phiếu nhưng KHÔNG thấy thẻ danh sách phiếu (thiếu quyền xem) ⇒ sửa /
 *    duyệt nháp (020_003/004) chạy ở `phieu-nhap-ghi.shop.spec.js`, tìm phiếu theo ghi chú `GHI_CHU_NHAP`.
 * 🔴 Chỉ SP giá tiêu chuẩn (`STANDARD`) nhập tay được ở cấp điểm bán — xem đầu `ghi-kho.js`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('./ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_gdv';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const NSX = '01/09/2026';
const HSD = '01/09/2027';

test.describe('04_3 · 020 — Tạo phiếu nhập nháp (điểm bán seed)', () => {
	test.describe.configure({ timeout: 240_000 });

	let phieu = null;

	test('04_3_020_002 — Tạo phiếu nhập kho nháp', async ({ page }) => {
		chanNeuTat('04_3_020_002');
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const dr = await k.moFormNhap(page, VAI);
		const { sp: tc, dong } = await k.themSanPham(page, dr, sp.tieuChuan.tenSanPham);
		const tonTruoc = await k.tonVariant(page, st, shopId, tc.productId, tc.variantId);

		await dong.locator('input[role="spinbutton"]').first().fill('2');
		await k.nhapLo(page, dong, [{ nsx: NSX, hsd: HSD }]);
		await dr.locator('#supplierNote').fill(k.GHI_CHU_NHAP);
		const { body } = await k.bamVaCho(page, dr.getByRole('button', { name: 'Tạo phiếu nháp' }), '/stock/v3/import-export?');

		expect(String(body?.status?.code), `Tạo nháp lỗi: ${body?.status?.message}`).toBe('200');
		expect(body.data.status, 'Phiếu vừa lưu không ở trạng thái nháp').toBe('DRAFT');
		phieu = { id: body.data.stockInOutId, code: body.data.code, sp: tc, tonTruoc };

		// Phiếu có trong danh sách phiếu nhập, trạng thái nháp.
		const ds = await k.goiApi(page, st, '/stock/v2/import-export/find', {
			shopId, type: 'IMPORT', page: 0, size: 20, sort: 'actionTime,DESC', code: phieu.code,
		});
		const trongDs = (ds.data || []).find((x) => x.stockInOutId === phieu.id);
		expect(trongDs, `Phiếu ${phieu.code} không có trong danh sách phiếu nhập`).toBeTruthy();
		expect(trongDs.status).toBe('DRAFT');

		// 🔴 Nháp KHÔNG ghi tồn.
		expect(await k.tonVariant(page, st, shopId, tc.productId, tc.variantId), 'Phiếu nháp đã ghi tồn kho').toBe(tonTruoc);
	});

});
