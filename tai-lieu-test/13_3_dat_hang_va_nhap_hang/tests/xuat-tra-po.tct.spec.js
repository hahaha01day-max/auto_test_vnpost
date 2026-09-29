'use strict';

/**
 * 13_3 · 030_027/028/057/058 — "Đặt hàng NCC › chọn xuất trả hàng NCC" từ PO ĐÃ NHẬP KHO (vai `tct`).
 *
 * 🔴 Đo 24/09/2026 (vnpost-web d7db6594): nút "Xuất trả hàng" ở chi tiết PO bị comment
 *    (`PurchaseOrderDetailPage.jsx`, `canReturn` = PARTIAL_DELIVERED | COMPLETED), route
 *    `/inventory/return-to-supplier/create` đã gỡ, BE chặn "Luồng trả hàng NCC cũ đã ngừng sử dụng" (từ 27/07/2026).
 *    Nghiệp vụ trả NCC đã chuyển sang luồng đa cấp `/inventory/stock-return-request` (phân hệ 14_1).
 *    Case kiểm đúng bước của kịch bản — không còn lối vào ⇒ ĐỎ có lý do, chờ user chốt. 🚫 Không tự đổi màn.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const po = require('./po-ghi');

const GOC = path.join(__dirname, '..');

const CASE = {
	'13_3_030_027': 'Kiểm tra xuất trả hàng toàn phần NCC',
	'13_3_030_028': 'Kiểm tra xuất trả hàng nhiều lần trong 1 đơn PO cho NCC',
	'13_3_030_057': 'Kiểm tra xuất trả hàng toàn phần NCC',
	'13_3_030_058': 'Kiểm tra xuất trả hàng nhiều lần trong 1 đơn PO cho NCC',
};

let maPO;

test.describe('13_3 · 030 — Xuất trả hàng NCC từ PO', () => {
	test.describe.configure({ timeout: 360_000 });
	for (const [id, ten] of Object.entries(CASE)) {
		test(`${id} — ${ten}`, async ({ page }) => {
			const ly = skipReason(loadCaseInput(GOC, id));
			test.skip(Boolean(ly), ly ?? '');
			// PO đã nhập kho đủ: dựng 1 lần cho cả 4 case (Gửi NCC → NCC xác nhận → nhập kho), cùng khuôn 13_3_030_009.
			if (!maPO) {
				const kq = await po.taoPO(page, 'Gửi nhà cung cấp', { sl: 2 });
				await po.moChiTiet(page, kq.ma);
				expect((await po.nccXacNhan(page)).tb).toContain('Đã xác nhận');
				await page.reload();
				await page.getByText('Danh sách sản phẩm').first().waitFor();
				expect((await po.nhapKho(page)).tb).toContain('Nhập kho thành công');
				maPO = kq.ma;
			}
			const hoanThanh = { code: maPO };
			await po.moChiTiet(page, maPO);
			test.info().annotations.push({ type: 'đo', description: `PO ${maPO}: ${await po.trangThai(page, maPO)}` });
			await po.moChiTiet(page, maPO);
			await expect(
				page.getByRole('button', { name: /Xuất trả hàng/ }),
				`PO ${hoanThanh.code} đã nhập kho mà chi tiết không có nút "Xuất trả hàng" — luồng trả theo PO đã ngừng 27/07/2026, nút bị comment`,
			).toBeVisible({ timeout: 10_000 });
		});
	}
});
