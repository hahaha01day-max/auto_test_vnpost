'use strict';

/**
 * Bước CẤU HÌNH cho `qua-han.gdv.spec.js`: đặt / khôi phục `RETURN_POLICY_DAYS` của chuỗi.
 * 🔴 Chỉ `CORP_ADMIN` có `PUT /api/v1/admin/configs` (GET admin không vai nào có — đọc qua `/api/v1/internal/configs`)
 * ⇒ chạy bằng TÀI KHOẢN GỐC `.env` (vai `tct` = admin chuỗi), KHÔNG đặt VNPOST_LANE:
 *   VNPOST_HAN_HOAN=1    VNPOST_SETUP_ROLES=tct npx playwright test --config tai-lieu-test/18_5_doi_tra_hang/playwright.config.js han-hoan-tra
 *   VNPOST_HAN_HOAN=goc  … (khôi phục giá trị lưu ở test-output/han-hoan-tra-goc.json)
 * Không đặt VNPOST_HAN_HOAN ⇒ skip (chạy cả thư mục không đụng cấu hình).
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { GOC, p } = require('./doi-tra');

const KEY = 'RETURN_POLICY_DAYS';
const SO = path.join(GOC, 'test-output', 'han-hoan-tra-goc.json');

async function docHan(page, st) {
	const ds = (await p.k.goiApi(page, st, '/api/v1/internal/configs'))?.data || [];
	return (Array.isArray(ds) ? ds : ds.content || []).find((c) => c.configKey === KEY) || null;
}

test('cấu hình 18_5 — đặt/khôi phục RETURN_POLICY_DAYS', async ({ browser }) => {
	const muon = process.env.VNPOST_HAN_HOAN;
	test.skip(!muon, 'Không đặt VNPOST_HAN_HOAN');
	test.skip(Boolean(process.env.VNPOST_LANE), 'Chạy bằng tài khoản gốc (bỏ VNPOST_LANE) — chỉ CORP_ADMIN sửa được cấu hình chuỗi');
	const ps = await p.k.moPhienPhu(browser, 'tct', '/settings');
	try {
		const cu = await docHan(ps.page, ps.st);
		test.info().annotations.push({ type: 'trước', description: JSON.stringify(cu) });
		let body;
		if (muon === 'goc') {
			const g = JSON.parse(fs.readFileSync(SO, 'utf8'));
			body = { configValue: String(g.configValue), dataType: g.dataType || 'INTEGER', description: g.description || 'Giới hạn thời gian trả hàng', isActive: g.isActive ?? g.active ?? true };
		} else {
			if (!fs.existsSync(SO)) fs.writeFileSync(SO, JSON.stringify(cu || { configValue: '7', isActive: false }, null, 1));
			body = { configValue: String(muon), dataType: cu?.dataType || 'INTEGER', description: cu?.description || 'Giới hạn thời gian trả hàng', isActive: true };
		}
		const r = await p.k.goiGhi(ps.page, ps.st, 'PUT', '/api/v1/admin/configs', { configKey: KEY }, body);
		expect(String(r?.status?.code), `Sửa ${KEY} lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
		const sau = await docHan(ps.page, ps.st);
		test.info().annotations.push({ type: 'sau', description: JSON.stringify(sau) });
		expect(String(sau?.configValue)).toBe(String(body.configValue));
		if (muon === 'goc') fs.rmSync(SO);
	} finally {
		await ps.dong();
	}
});
