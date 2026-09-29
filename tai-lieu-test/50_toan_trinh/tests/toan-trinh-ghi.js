'use strict';

/**
 * Helper 50 — ĐO SỐ cho case toàn trình (tồn kho từng kho, công nợ NCC). Chỉ đọc qua API như FE.
 * Bước nghiệp vụ dùng lại helper của phân hệ gốc (13_1, 13_2 `dieu-phoi-ghi.js`, 13_3, 14_x), 🚫 không viết lại.
 */

const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

/**
 * Tồn (Σ remainQuantity các lô) của SP `productId` ở shop `shopId`, đọc bằng phiên `vai`.
 * 🔴 `phien` (tuỳ chọn): phiên sẵn có { page, st } — spec đang giữ phiên cùng tài khoản thì PHẢI truyền vào,
 *    mở phiên mới là xoay refresh token ⇒ phiên đang giữ trả SSHOP-405 (đo 28/09 TT02).
 */
async function tonKho(browser, vai, shopId, productId, phien) {
	const ps = phien ? { ...phien, dong: async () => {} } : await k.moPhienPhu(browser, vai, '/inventory/transfer-warehouse');
	try {
		const lo = (await k.goiApi(ps.page, ps.st, '/stock/v2/batch-product', { shopId, productId, size: 500 })).data || [];
		return lo.reduce((s, l) => s + Number(l.remainQuantity || 0), 0);
	} finally { await ps.dong(); }
}

/**
 * Công nợ NCC `supplierId` theo từng kho, từ màn "Công nợ NCC" của vai `vai` (mặc định TCT; NCC tỉnh ⇒ 'province') (`/shops/supplier-debt/list`, duyệt đủ trang).
 * Trả { [shopId]: { totalAmount, totalPaidAmount, totalReturn, totalDebt } } — kho chưa có dòng thì không có khoá.
 */
async function congNoNcc(browser, supplierId, vai = 'tct', phien) {
	const ps = phien ? { ...phien, dong: async () => {} } : await k.moPhienPhu(browser, vai, '/debt-reconciliation/supplier-debt');
	try {
		const kq = {};
		for (let trang = 0; trang < 50; trang++) {
			const b = await k.goiGhi(ps.page, ps.st, 'GET', '/shops/supplier-debt/list', { page: trang, size: 20 });
			for (const r of b?.data || []) {
				if (Number(r.supplierId) !== Number(supplierId)) continue;
				kq[r.shopId] = { totalAmount: Number(r.totalAmount || 0), totalPaidAmount: Number(r.totalPaidAmount || 0), totalReturn: Number(r.totalReturn || 0), totalDebt: Number(r.totalDebt || 0), shopName: r.shopName };
			}
			if (!b?.page?.has_next) break;
		}
		return kq;
	} finally { await ps.dong(); }
}

module.exports = { tonKho, congNoNcc };
