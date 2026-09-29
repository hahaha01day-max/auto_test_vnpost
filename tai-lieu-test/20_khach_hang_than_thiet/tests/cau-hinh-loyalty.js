'use strict';

/**
 * Chụp / sửa tạm / KHÔI PHỤC chương trình tích điểm + đổi điểm của CHUỖI (dùng chung toàn chuỗi!).
 *
 * Trace 25/09/2026 (`features/loyalty/**`, `vnpost-loyalty-service`):
 * - Tích điểm: `GET /loyalty/campaign/get-campaign[/{id}]` · `PUT /loyalty/campaign/edit-campaign/{id}` body
 *   `{active, campaignType(0 đơn|1 SP), orderAmountConditional, orderAmountPerPoint, startTime 'DD/MM/YYYY', endTime|null,
 *   noPointForDiscountedInvoice, noPointForPointPaymentInvoice, noPointForDiscountedProduct, pointByCategory, categoryIds,
 *   isAppliedAll, customerGroupIds, scopeType, scopes[{scopeType, orgUnitCode}]}`.
 * - Đổi điểm: `GET /loyalty/redeem-campaign/get-campaign` · `PUT /loyalty/redeem-campaign/edit-campaign/{id}`
 *   `{active, orderAmountPerPoint(đ/1 điểm), startTime, endTime, orderAmountConditional, scopeType, scopes}`.
 * 🔴 `orderAmountConditional: null` ở chương trình tích điểm ⇒ BE NPE (`CampaignService.java:463`) ⇒ mọi đơn 0 điểm ⇒ gửi 0.
 * 🔴 Bản GỐC chụp MỘT lần vào `test-output/loyalty-goc.json` (🚫 không ghi đè khi đã có) — lượt hỏng giữa chừng vẫn khôi
 *    phục được bằng `-g "khoi phuc loyalty 20"`.
 */

const fs = require('node:fs');
const path = require('node:path');
const { expect } = require('@playwright/test');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..', 'test-output', 'loyalty-goc.json');

const ngay = (v) => {
	if (v == null) return null;
	if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(v))) return v;
	const d = new Date(typeof v === 'number' || /^\d+$/.test(String(v)) ? Number(v) : v);
	return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

async function doc(page, st) {
	const a = await k.goiGhi(page, st, 'GET', '/loyalty/campaign/get-campaign');
	const id = a?.data?.campaignId;
	const ct = id ? (await k.goiGhi(page, st, 'GET', `/loyalty/campaign/get-campaign/${id}`))?.data : null;
	const b = await k.goiGhi(page, st, 'GET', '/loyalty/redeem-campaign/get-campaign');
	return { tich: ct ?? a?.data, doi: b?.data };
}

const bodyTich = (c) => ({
	active: c.active, campaignType: c.campaignType ?? 0,
	orderAmountConditional: c.orderAmountConditional ?? 0, orderAmountPerPoint: c.orderAmountPerPoint,
	startTime: ngay(c.startTime), endTime: ngay(c.endTime),
	noPointForDiscountedInvoice: !!c.noPointForDiscountedInvoice, noPointForPointPaymentInvoice: !!c.noPointForPointPaymentInvoice,
	noPointForDiscountedProduct: !!c.noPointForDiscountedProduct, pointByCategory: !!c.pointByCategory,
	categoryIds: c.categoryIds?.length ? c.categoryIds : null, isAppliedAll: c.isAppliedAll !== false,
	customerGroupIds: c.customerGroupIds ?? [], scopeType: c.scopeType,
	scopes: (c.scopes || []).map((s) => ({ scopeType: s.scopeType, orgUnitCode: s.orgUnitCode })),
});
const bodyDoi = (c) => ({
	active: c.active, orderAmountPerPoint: c.orderAmountPerPoint, startTime: ngay(c.startTime), endTime: ngay(c.endTime),
	orderAmountConditional: c.orderAmountConditional ?? null, scopeType: c.scopeType,
	scopes: (c.scopes || []).map((s) => ({ scopeType: s.scopeType, orgUnitCode: s.orgUnitCode })),
});

/** Chụp bản gốc (một lần). Trả bản gốc. */
async function chup(page, st) {
	if (fs.existsSync(GOC)) return JSON.parse(fs.readFileSync(GOC, 'utf8'));
	const g = await doc(page, st);
	expect(g.tich?.campaignId, 'Chuỗi không có chương trình tích điểm để chụp').toBeTruthy();
	fs.mkdirSync(path.dirname(GOC), { recursive: true });
	fs.writeFileSync(GOC, JSON.stringify({ luc: new Date().toISOString(), ...g }, null, 2));
	return g;
}

async function suaTich(page, st, doi) {
	const g = await chup(page, st);
	const body = { ...bodyTich(g.tich), ...doi };
	const b = await k.goiGhi(page, st, 'PUT', `/loyalty/campaign/edit-campaign/${g.tich.campaignId}`, {}, body);
	expect(String(b?.status?.code), `Sửa tạm chương trình tích điểm lỗi: ${JSON.stringify(b?.status)} · ${JSON.stringify(doi)}`).toBe('200');
	return b;
}

async function suaDoi(page, st, doi) {
	const g = await chup(page, st);
	const body = { ...bodyDoi(g.doi), ...doi };
	const b = await k.goiGhi(page, st, 'PUT', `/loyalty/redeem-campaign/edit-campaign/${g.doi.campaignId}`, {}, body);
	expect(String(b?.status?.code), `Sửa tạm chương trình đổi điểm lỗi: ${JSON.stringify(b?.status)} · ${JSON.stringify(doi)}`).toBe('200');
	return b;
}

/** Khôi phục ĐÚNG bản gốc cho cả hai chương trình; trả [status tích, status đổi]. */
async function khoiPhuc(page, st) {
	if (!fs.existsSync(GOC)) return ['(chưa chụp)', '(chưa chụp)'];
	const g = JSON.parse(fs.readFileSync(GOC, 'utf8'));
	const a = await k.goiGhi(page, st, 'PUT', `/loyalty/campaign/edit-campaign/${g.tich.campaignId}`, {}, { ...bodyTich(g.tich), orderAmountConditional: g.tich.orderAmountConditional });
	const b = g.doi?.campaignId ? await k.goiGhi(page, st, 'PUT', `/loyalty/redeem-campaign/edit-campaign/${g.doi.campaignId}`, {}, bodyDoi(g.doi)) : null;
	return [a?.status, b?.status];
}

/** Phạm vi = bản gốc + tỉnh của làn (giữ cùng cấp scopeType với bản gốc). */
function phamViCoLan(goc, maTinhLan, maShopLan) {
	const scopes = (goc.scopes || []).map((s) => ({ scopeType: s.scopeType, orgUnitCode: s.orgUnitCode }));
	if (!goc.scopeType || goc.scopeType === 'TONG_CONG_TY') return { scopeType: goc.scopeType, scopes };
	const ma = goc.scopeType === 'DIEM_BAN' ? maShopLan : goc.scopeType === 'BUU_DIEN_TINH' ? maTinhLan : null;
	if (ma && !scopes.some((s) => s.orgUnitCode === ma)) scopes.push({ scopeType: goc.scopeType, orgUnitCode: ma });
	return { scopeType: goc.scopeType, scopes };
}

module.exports = { GOC, doc, chup, suaTich, suaDoi, khoiPhuc, phamViCoLan, bodyTich, bodyDoi, ngay, k };
