'use strict';

/**
 * 16 · 020 — mở chi tiết kỳ bằng URL, vai `province`: kỳ của đơn vị khác (016) · kỳ không tồn tại (017).
 * Nguồn (vnpost-web): `features/consignmentRecon/pages/ConsignmentReconDetailPage.jsx`; BE
 * `ReconPeriodQueryService.getById` — phạm vi kỳ CÓ tổ tiên ⇒ tỉnh mở được kỳ của TCT là đúng thiết kế,
 * "đơn vị khác" phải là kỳ của MỘT TỈNH KHÁC.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');
const { moVaBat } = require('./pham-vi-ky-gui');

const GOC = path.join(__dirname, '..');
const ROUTE = '/debt-reconciliation/consignment-recon';
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const thongBao = (page) => page.locator('.ant-message-notice, .ant-notification-notice');

test.describe('16 · 020 mở kỳ bằng URL (vai tỉnh)', () => {
	test('16_020_016 — Mở kỳ của đơn vị khác bị chặn', async ({ page, browser }) => {
		chanNeuTat('16_020_016');
		const maTinh = seed.doc().duLieu?.toChuc?.maTinh;
		// Kỳ của tỉnh KHÁC: đọc bằng phiên TCT (thấy toàn chuỗi).
		const p = await k.moPhienPhu(browser, 'tct', ROUTE);
		let ky;
		try {
			ky = ((await k.goiApi(p.page, p.st, '/consignment-recon/periods', { page: 0, size: 500 })).data || [])
				.find((x) => x.orgUnitType === 'BUU_DIEN_TINH' && x.orgUnitCode !== maTinh);
		} finally { await p.dong(); }
		test.skip(!ky, `Chuỗi chưa có kỳ đối soát nào của một tỉnh khác ${maTinh} (đo 24/09/2026: 36/36 kỳ thuộc TONG_CONG_TY/VNPOST). Cần hợp đồng ký gửi ký ở cấp tỉnh rồi sinh kỳ.`);
		const res = await moVaBat(page, `${ROUTE}/${ky.id}`, 'province');
		const loi = res.filter((r) => r.url.pathname.includes(`/periods/${ky.id}`));
		ghi(`Kỳ ${ky.id} (${ky.orgUnitCode}): ${loi.map((r) => `${r.url.pathname} ${r.status}/${r.body?.status?.message}`).join(' ; ')}`);
		expect(loi.length).toBeGreaterThan(0);
		for (const r of loi) {
			expect(r.status >= 400 || String(r.body?.status?.code) !== '200', `Tỉnh ${maTinh} đọc được ${r.url.pathname} của tỉnh ${ky.orgUnitCode}`).toBe(true);
			expect(r.body?.status?.message).toContain('Kỳ đối soát này thuộc đơn vị khác, bạn không có quyền xem');
		}
		await expect(thongBao(page).filter({ hasText: 'Kỳ đối soát này thuộc đơn vị khác, bạn không có quyền xem' }).first()).toBeVisible();
	});

	test('16_020_017 — Mở kỳ không tồn tại', async ({ page }) => {
		chanNeuTat('16_020_017');
		const id = 999999999;
		const res = await moVaBat(page, `${ROUTE}/${id}`, 'province');
		const loi = res.filter((r) => r.url.pathname.includes(`/periods/${id}`));
		ghi(loi.map((r) => `${r.url.pathname} ${r.status}/${r.body?.status?.code} ${r.body?.status?.message}`).join(' ; '));
		expect(loi.length, 'Màn chi tiết không gọi API nào của kỳ').toBeGreaterThan(0);
		for (const r of loi) {
			expect(r.status, `${r.url.pathname} trả lỗi server thay vì lỗi nghiệp vụ`).toBeLessThan(500);
			expect(r.body?.status?.message).toContain(`Không tìm thấy kỳ đối soát id=${id}`);
		}
		await expect(thongBao(page).filter({ hasText: `Không tìm thấy kỳ đối soát id=${id}` }).first()).toBeVisible();
	});
});
