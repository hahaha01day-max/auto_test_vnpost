'use strict';

/**
 * Bật "Bán tồn kho âm" cho ĐIỂM BÁN seed của làn bằng cách THÊM điểm bán vào phạm vi của cấu hình chuỗi (dùng chung!),
 * rồi KHÔI PHỤC đúng phạm vi gốc. User cho phép 26/09/2026 (memory `auto_test_moi_truong_test_lam_thoai_mai`).
 *
 * Trace 26/09/2026 (vnpost-web `features/chain/services/negativeStockPolicyApi.js`, `NegativeStockPolicySetting.jsx`):
 * `GET /chain-negative-stock-policy` ⇒ { policy{name, description, scopeType, status}, scopes[{scopeType, orgUnitCode}] };
 * `POST /chain-negative-stock-policy/save` body { name, description, autoRecalculateNegativeStock, scopeType, status, scopes }.
 * 🔴 Bản gốc chụp MỘT lần vào `shared/test-output/ban-am-goc.json` (🚫 không ghi đè khi đã có) — lượt hỏng giữa chừng vẫn
 *    khôi phục được: `khoiPhuc(browser)` đọc file này. Chạy bằng phiên phụ vai `tct`.
 */

const fs = require('node:fs');
const path = require('node:path');
const { expect } = require('@playwright/test');
const k = require('../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const SO = path.join(__dirname, 'test-output', 'ban-am-goc.json');
const API = '/chain-negative-stock-policy';

async function phien(browser, fn) {
	const ps = await k.moPhienPhu(browser, 'tct', '/settings?setting=negativeStock');
	try { return await fn(ps); } finally { await ps.dong(); }
}
const body = (g, scopes) => ({
	name: g.policy.name, description: g.policy.description, autoRecalculateNegativeStock: g.policy.autoRecalculateNegativeStock ?? true,
	scopeType: g.policy.scopeType ?? 3, status: g.policy.status ?? 1,
	scopes: scopes.map((s) => ({ scopeType: s.scopeType, orgUnitCode: s.orgUnitCode })),
});

/** Thêm `maShop` (DIEM_BAN) vào phạm vi, bảo đảm status=1. Trả phạm vi sau khi lưu. */
async function bat(browser, maShop) {
	return phien(browser, async (ps) => {
		const g = (await k.goiGhi(ps.page, ps.st, 'GET', API, {}))?.data;
		expect(g?.policy, 'Chuỗi chưa có cấu hình bán tồn kho âm').toBeTruthy();
		if (!fs.existsSync(SO)) {
			fs.mkdirSync(path.dirname(SO), { recursive: true });
			fs.writeFileSync(SO, JSON.stringify(g, null, 1));
		}
		const scopes = (g.scopes || []).filter((s) => Number(s.isActive ?? 1) === 1);
		if (!scopes.some((s) => s.scopeType === 'DIEM_BAN' && s.orgUnitCode === maShop)) scopes.push({ scopeType: 'DIEM_BAN', orgUnitCode: maShop });
		const r = await k.goiGhi(ps.page, ps.st, 'POST', `${API}/save`, {}, { ...body(g, scopes), status: 1 });
		expect(String(r?.status?.code), `Bật bán âm cho ${maShop} lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
		return scopes;
	});
}

/** Khôi phục phạm vi + trạng thái GỐC (từ file chụp), xoá file chụp. */
async function khoiPhuc(browser) {
	if (!fs.existsSync(SO)) return null;
	const g = JSON.parse(fs.readFileSync(SO, 'utf8'));
	return phien(browser, async (ps) => {
		const goc = (g.scopes || []).filter((s) => Number(s.isActive ?? 1) === 1);
		const r = await k.goiGhi(ps.page, ps.st, 'POST', `${API}/save`, {}, body(g, goc));
		expect(String(r?.status?.code), `Khôi phục bán âm lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
		const sau = (await k.goiGhi(ps.page, ps.st, 'GET', API, {}))?.data;
		const ma = (x) => (x || []).filter((s) => Number(s.isActive ?? 1) === 1).map((s) => `${s.scopeType}:${s.orgUnitCode}`).sort().join(',');
		expect(ma(sau?.scopes), 'Phạm vi sau khôi phục khác bản gốc').toBe(ma(g.scopes));
		fs.rmSync(SO);
		return sau;
	});
}

module.exports = { bat, khoiPhuc, SO };
