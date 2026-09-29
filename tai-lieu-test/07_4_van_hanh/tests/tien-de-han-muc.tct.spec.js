'use strict';

/**
 * 07_4 — TIỀN ĐỀ: dựng lại cấu hình hạn mức "Duyệt phiếu đề xuất đặt hàng" (`STOCK_REQUESTS_APPROVE`, action pod-service
 * `StockRequestServiceImpl.ACTION_STOCK_REQUEST_APPROVE`) khi nó biến mất.
 * 🔴 26/09/2026: `VNPOST_CORE.APPROVAL_LIMIT` = 0 dòng (Update_time 24/09 09:39, auto_increment 2 ⇒ bản gốc id 1 đã bị xoá) ⇒ 13_1_090 và
 * 07_4_050_011–015 không có luồng nào để đo. Dựng đúng mô tả gốc: < 50 triệu 1 bước Giám đốc xã; ≥ 50 triệu xã → Quản lý tỉnh. Để TẮT
 * (trạng thái chuẩn — helper 13_1 `datHanMuc` bật trong case rồi trả lại).
 * Chạy: `VNPOST_LANE=8 VNPOST_TIEN_DE=1 npx playwright test --config tai-lieu-test/07_4_van_hanh/playwright.config.js --project=tct -g "tien de 07_4"`.
 */

const { test, expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);

test('tien de 07_4 — cấu hình hạn mức STOCK_REQUESTS_APPROVE', async ({ page }) => {
	test.skip(!process.env.VNPOST_TIEN_DE, 'Chỉ chạy khi VNPOST_TIEN_DE=1');
	const st = k.batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=approvalLimit`, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const goi = (m, u, q, b) => k.goiGhi(page, st, m, u, q, b);
	const co = ds((await goi('GET', '/approval-limits', { page: 0, size: 5000 }))?.data).find((z) => z.actionCode === 'STOCK_REQUESTS_APPROVE');
	if (co) { test.info().annotations.push({ type: 'đo', description: `đã có id ${co.id}` }); return; }
	const b = (n, loai, role, ten) => ({ stepOrder: n, stepName: ten, orgUnitType: loai, roleCode: role, active: true });
	const r = await goi('POST', '/approval-limits', {}, {
		actionCode: 'STOCK_REQUESTS_APPROVE', actionName: 'Duyệt phiếu đề xuất đặt hàng', active: false,
		flows: [
			{ minAmount: 0, maxAmount: 50_000_000, active: true, steps: [b(1, 'BUU_DIEN_XA', 'WARD_MANAGER', 'Giám đốc xã duyệt')] },
			{ minAmount: 50_000_000, maxAmount: 999_999_999_999, active: true, steps: [b(1, 'BUU_DIEN_XA', 'WARD_MANAGER', 'Giám đốc xã duyệt'), b(2, 'BUU_DIEN_TINH', 'PROVINCE_MANAGER', 'Quản lý tỉnh duyệt')] },
		],
	});
	test.info().annotations.push({ type: 'đo', description: JSON.stringify(r?.status) });
	expect(String(r?.status?.code)).toBe('200');
});
