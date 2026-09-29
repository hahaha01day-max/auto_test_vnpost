'use strict';

/**
 * 18_4_100_002 — vai tỉnh mở Quản lý đơn hàng: phải thấy đơn của các điểm bán trực thuộc, không thấy đơn tỉnh khác.
 *
 * Trace vnpost-web f9c5c858 (28/09/2026): `features/order/pages/orderListPage/OrderListPage.jsx:73,128-153` —
 * danh sách gọi `GET /orders/shops/{defaultShopId}/v1.3` với **một** `defaultShopId` (redux `chain.defaultShopId`),
 * `skip: !shopId`. Đo làn 5: vai tỉnh chỉ gọi `/shops/profile/chain?shopType=HUB&orgUnitType=BUU_DIEN_TINH`
 * (tỉnh làn không có HUB) ⇒ KHÔNG gọi API đơn nào, bảng "Trống".
 * Đối chứng: đơn hôm nay của điểm bán trực thuộc (`AUTO<làn>_SHOP`) đọc bằng phiên phụ vai `shop`.
 * 🔴 Assertion giữ theo kịch bản — đỏ là LỆCH ĐẶC TẢ, 🚫 sửa cho khớp màn.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const DS = /\/orders\/shops\/(\d+)\/v1\.3/;
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

test('18_4_100_002 — Vai tỉnh thấy được đơn của các điểm bán thuộc tỉnh', async ({ page, browser }) => {
	const i = loadCaseInput(GOC, '18_4_100_002');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(180_000);
	// Đối chứng: điểm bán trực thuộc tỉnh làn có đơn hôm nay.
	const ps = await k.moPhienPhu(browser, 'shop', '/order/created-orders');
	let donShop = [];
	let shopId = null;
	try {
		shopId = ps.st.h.shopid;
		const d0 = new Date();
		d0.setHours(0, 0, 0, 0);
		const b = await k.goiGhi(ps.page, ps.st, 'GET', `/orders/shops/${shopId}/v1.3`, { page: 0, size: 50, status: -1, orderBy: 'createdDate', startTime: d0.getTime(), endTime: d0.getTime() + 86_400_000 - 1 });
		donShop = (b?.data || []).map((x) => String(x.orderNumber));
	} finally {
		await ps.dong();
	}
	expect(donShop.length, 'Tiền đề: điểm bán trực thuộc tỉnh không có đơn hôm nay').toBeGreaterThan(0);

	const goi = [];
	page.on('response', (r) => { const m = r.url().match(DS); if (m) goi.push({ shop: m[1], r }); });
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/order/created-orders`, 'province');
	await page.waitForTimeout(8_000);
	const dong = page.locator('.ant-pro-page-container .ant-table-tbody tr.ant-table-row');
	const maMan = (await dong.allInnerTexts()).map((t) => (t.match(/\b\d{12}[A-Z0-9]+\b/) || [])[0]).filter(Boolean);
	const shopGoi = [...new Set(goi.map((x) => x.shop))];
	ghiChu('đo', `điểm bán ${shopId} có ${donShop.length} đơn hôm nay · vai tỉnh gọi API đơn của shop ${JSON.stringify(shopGoi)} · bảng ${maMan.length} dòng`);
	// Không thấy đơn của tỉnh khác: mọi shop được gọi phải thuộc tỉnh (ở đây: đúng điểm bán trực thuộc hoặc HUB tỉnh).
	for (const s of shopGoi) expect([String(shopId)], `Vai tỉnh gọi đơn của shop ${s} ngoài phạm vi đối chứng`).toContain(s);
	// Thấy đơn của điểm bán trực thuộc.
	expect(maMan.filter((m) => donShop.includes(m)).length, `Vai tỉnh KHÔNG thấy đơn nào của điểm bán trực thuộc ${shopId} (${donShop.length} đơn hôm nay)`).toBeGreaterThan(0);
});
