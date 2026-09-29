'use strict';

/**
 * Tiền đề 18_2 nhóm 050 / 18_5 nhóm 120 — thêm tỉnh của làn vào phạm vi chương trình TÍCH điểm và ĐỔI điểm của chuỗi
 * (25/09: phạm vi #14 không gồm AUTO8_T ⇒ đơn AUTO8 không tích/đổi điểm). Sửa trên cấu hình HIỆN TẠI (không đè bằng bản chụp),
 * chỉ THÊM mã tỉnh nếu chưa có; không đổi gì khác. Helper payload: `20_khach_hang_than_thiet/tests/cau-hinh-loyalty.js`.
 *   VNPOST_LANE=8 VNPOST_SETUP_ROLES=gdv,tct npx playwright test --config tai-lieu-test/18_2_khach_hang_va_uu_dai/playwright.config.js -g "tien de loyalty"
 */

const { test, expect } = require('@playwright/test');
const L = require('../../20_khach_hang_than_thiet/tests/cau-hinh-loyalty');
const seed = require('../../00_seed/seed-state');

test('tien de loyalty 18_2 — tỉnh của làn nằm trong phạm vi tích + đổi điểm', async ({ browser }) => {
	test.setTimeout(180_000);
	const tinh = seed.doc().duLieu.toChuc?.maTinh || `AUTO${process.env.VNPOST_LANE}_T`;
	const ps = await L.k.moPhienPhu(browser, 'tct', '/loyalty');
	try {
		const g = await L.doc(ps.page, ps.st);
		const kq = {};
		for (const [ten, c, body, url] of [
			['tich', g.tich, L.bodyTich, `/loyalty/campaign/edit-campaign/${g.tich?.campaignId}`],
			['doi', g.doi, L.bodyDoi, `/loyalty/redeem-campaign/edit-campaign/${g.doi?.campaignId}`],
		]) {
			if (!c?.campaignId) { kq[ten] = 'không có chương trình'; continue; }
			const b = body(c);
			if (ten === 'tich') b.orderAmountConditional = c.orderAmountConditional ?? 0;
			const ma = (b.scopes || []).map((s) => s.orgUnitCode);
			if (!b.scopeType || b.scopeType === 'TONG_CONG_TY' || ma.includes(tinh)) { kq[ten] = `đã gồm (${b.scopeType}, active ${c.active})`; continue; }
			b.scopes.push({ scopeType: 'BUU_DIEN_TINH', orgUnitCode: tinh });
			const r = await L.k.goiGhi(ps.page, ps.st, 'PUT', url, {}, b);
			kq[ten] = `thêm ${tinh}: ${JSON.stringify(r?.status)} · active ${c.active}`;
			expect(String(r?.status?.code), `Sửa phạm vi ${ten} lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
		}
		test.info().annotations.push({ type: 'kết quả', description: JSON.stringify(kq) });
		test.info().annotations.push({ type: 'đổi điểm hiện tại', description: JSON.stringify(g.doi).slice(0, 400) });
	} finally {
		await ps.dong();
	}
});
