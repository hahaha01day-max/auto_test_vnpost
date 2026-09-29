'use strict';

/**
 * Bước CẤU HÌNH cho 18_5_130_001 (`danh-sach-hoan-tra.shop`): đặt / khôi phục `ABNORMAL_REFUND_AMOUNT` (ngưỡng tiền hoàn
 * bất thường) của chuỗi — khuôn `han-hoan-tra.gdv.spec.js`. Màn `/order/return-orders` chỉ có lựa chọn
 * "Tiền trả bất thường (>= Xđ)" (type CRE) khi cấu hình này BẬT (`OrderReturnPage.jsx`).
 * 🔴 Chỉ `CORP_ADMIN` có `PUT /api/v1/admin/configs` (GET admin không vai nào có — đọc qua `/api/v1/internal/configs`)
 * ⇒ chạy bằng TÀI KHOẢN GỐC `.env` (vai `tct` = admin chuỗi), KHÔNG đặt VNPOST_LANE:
 *   VNPOST_NGUONG=50000 VNPOST_SETUP_ROLES=tct npx playwright test --config tai-lieu-test/18_5_doi_tra_hang/playwright.config.js nguong-bat-thuong
 *   VNPOST_NGUONG=goc  … (khôi phục giá trị lưu ở test-output/nguong-bat-thuong-goc.json)
 * Không đặt VNPOST_NGUONG ⇒ skip (chạy cả thư mục không đụng cấu hình).
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { GOC, p } = require('./doi-tra');

const KEY = 'ABNORMAL_REFUND_AMOUNT';
const SO = path.join(GOC, 'test-output', 'nguong-bat-thuong-goc.json');

async function docCh(page, st) {
	const ds = (await p.k.goiApi(page, st, '/api/v1/internal/configs'))?.data || [];
	return (Array.isArray(ds) ? ds : ds.content || []).find((c) => c.configKey === KEY) || null;
}

test('cấu hình 18_5 — đặt/khôi phục ABNORMAL_REFUND_AMOUNT', async ({ browser }) => {
	const muon = process.env.VNPOST_NGUONG;
	test.skip(!muon, 'Không đặt VNPOST_NGUONG');
	test.skip(Boolean(process.env.VNPOST_LANE), 'Chạy bằng tài khoản gốc (bỏ VNPOST_LANE) — chỉ CORP_ADMIN sửa được cấu hình chuỗi');
	const ps = await p.k.moPhienPhu(browser, 'tct', '/settings');
	try {
		const cu = await docCh(ps.page, ps.st);
		test.info().annotations.push({ type: 'trước', description: JSON.stringify(cu) });
		let body;
		if (muon === 'goc') {
			const g = JSON.parse(fs.readFileSync(SO, 'utf8'));
			body = { configValue: String(g.configValue), dataType: g.dataType || 'DOUBLE', description: g.description || 'Ngưỡng cảnh báo số tiền hoàn trả bất thường', isActive: g.isActive ?? g.active ?? false };
		} else {
			if (!fs.existsSync(SO)) fs.writeFileSync(SO, JSON.stringify(cu || { configValue: '0', isActive: false }, null, 1));
			body = { configValue: String(muon), dataType: cu?.dataType || 'DOUBLE', description: cu?.description || 'Ngưỡng cảnh báo số tiền hoàn trả bất thường', isActive: true };
		}
		const r = await p.k.goiGhi(ps.page, ps.st, 'PUT', '/api/v1/admin/configs', { configKey: KEY }, body);
		expect(String(r?.status?.code), `Sửa ${KEY} lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
		const sau = await docCh(ps.page, ps.st);
		test.info().annotations.push({ type: 'sau', description: JSON.stringify(sau) });
		expect(Number(sau?.configValue)).toBe(Number(body.configValue));
		if (muon === 'goc') fs.rmSync(SO);
	} finally {
		await ps.dong();
	}
});
