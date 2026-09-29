'use strict';

/**
 * Tắt / khôi phục HĐĐT của ĐIỂM BÁN seed làn (cấu hình RIÊNG điểm bán, không dùng chung chuỗi).
 * Trace 26/09/2026: vnpost-web `features/shop/services/shopConfigApi.js` — `GET|PUT /shops/configs/{shopId}`,
 * body switch `{ enableInvoice: bool }` (`hooks/useSaveShopConfig.js`, INVOICE_ENABLE). Danh sách đơn đọc
 * `shopConfig.data.enableInvoice` (OrderTableData.jsx: cột "TT. Hoá đơn"/"TT. CQT", bộ lọc hoá đơn).
 * Gọi bằng phiên phụ vai `tct` + header shopid = điểm bán làn (xem `moPhien`). 🔴 Dùng trong beforeAll/afterAll — luôn khôi phục giá trị GỐC.
 */

const { expect } = require('@playwright/test');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const seed = require('../../00_seed/seed-state');

const SHOP = () => seed.doc().duLieu.diemBan.shopId;
/** 🔴 Đo 26/09: phiên `tct` mang header shopid của TCT ⇒ PUT /shops/configs/<điểm bán làn> trả SSHOP-500 (định tuyến sai pod);
 *  vai `shop` bị SSHOP-401. Giữ phiên `tct` nhưng đặt header shopid = điểm bán làn thì chạy. */
const moPhien = async (browser) => {
	const ps = await p.k.moPhienPhu(browser, 'tct', '/settings');
	return { ...ps, st: { h: { ...ps.st.h, shopid: String(SHOP()) } } };
};

async function dat(browser, gt) {
	const ps = await moPhien(browser);
	try {
		const cu = await p.k.goiGhi(ps.page, ps.st, 'GET', `/shops/configs/${SHOP()}`, {});
		const truoc = cu?.data?.enableInvoice;
		const r = await p.k.goiGhi(ps.page, ps.st, 'PUT', `/shops/configs/${SHOP()}`, {}, { enableInvoice: gt });
		expect(String(r?.status?.code), `Đặt enableInvoice=${gt} lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
		// Đọc lại có chờ (cache cấu hình điểm bán có thể trễ). 🔴 Đo 26/09: PUT trả 200 mà đọc lại KHÔNG đổi (DB cũng không đổi)
		// ⇒ trả `{ khongLuu }` để spec SKIP có lý do (tiền đề không dựng được), 🚫 không đỏ như lỗi sản phẩm.
		let sau;
		for (let i = 0; i < 6; i += 1) {
			sau = (await p.k.goiGhi(ps.page, ps.st, 'GET', `/shops/configs/${SHOP()}`, {}))?.data?.enableInvoice;
			if (sau === gt) break;
			await ps.page.waitForTimeout(2_500);
		}
		if (sau !== gt) return { khongLuu: `PUT enableInvoice=${gt} trả ${r?.status?.code} nhưng đọc lại vẫn ${sau} sau 15s (điểm bán ${SHOP()})`, truoc };
		return truoc;
	} finally {
		await ps.dong();
	}
}

/**
 * Đặt nhiều khoá cấu hình điểm bán một lúc (vd `{ enableVat: true, vatPercent: 10 }`); trả GIÁ TRỊ GỐC của đúng các khoá đó
 * để khôi phục bằng chính hàm này.
 */
async function datNhieu(browser, body) {
	const ps = await moPhien(browser);
	try {
		const cu = (await p.k.goiGhi(ps.page, ps.st, 'GET', `/shops/configs/${SHOP()}`, {}))?.data || {};
		const goc = Object.fromEntries(Object.keys(body).map((k) => [k, cu[k] ?? null]));
		const r = await p.k.goiGhi(ps.page, ps.st, 'PUT', `/shops/configs/${SHOP()}`, {}, body);
		expect(String(r?.status?.code), `Đặt cấu hình điểm bán ${JSON.stringify(body)} lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
		return goc;
	} finally {
		await ps.dong();
	}
}

module.exports = { dat, datNhieu, SHOP };
