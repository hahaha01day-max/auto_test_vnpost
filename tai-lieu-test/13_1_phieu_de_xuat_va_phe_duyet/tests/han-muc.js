'use strict';

/**
 * Helper 13_1 · 090 hạn mức — bật / tắt cấu hình hạn mức "Duyệt phiếu đề xuất đặt hàng" bằng vai `tct`.
 * Nguồn: `features/shop/pages/settingPage/settingContents/ApprovalLimitSetting.jsx` (Switch cột Trạng thái →
 * `useUpdateApprovalLimitStatusMutation`).
 * 🔴 Cấu hình CHUNG cả chuỗi — user cho phép bật trong lúc test (24/09/2026) với điều kiện TẮT LẠI ngay:
 *    luôn gọi `datHanMuc(false)` trong `finally` của chính case (🚫 afterAll — worker đổi khi case đỏ).
 */

const { expect } = require('@playwright/test');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dx = require('./dx-ghi');

const TEN = 'Duyệt phiếu đề xuất đặt hàng';

/** Bật (`bat=true`) / tắt cấu hình; trả trạng thái TRƯỚC khi đổi. */
async function datHanMuc(browser, bat) {
	const p = await k.moPhienPhu(browser, 'tct', '/settings?setting=approvalLimit');
	try {
		const r = p.page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: TEN }).first();
		await expect(r, `Không có cấu hình hạn mức "${TEN}"`).toBeVisible({ timeout: 30_000 });
		const sw = r.locator('.ant-switch');
		const truoc = (await sw.getAttribute('aria-checked')) === 'true';
		if (truoc !== bat) {
			const tb = await dx.thongBaoQuanh(p.page, () => sw.click());
			expect(tb, `Đổi trạng thái hạn mức sang ${bat} không thành công`).toContain('Cập nhật trạng thái thành công');
			await expect(sw).toHaveAttribute('aria-checked', String(bat));
		}
		return truoc;
	} finally {
		await p.dong();
	}
}

module.exports = { datHanMuc, TEN };
