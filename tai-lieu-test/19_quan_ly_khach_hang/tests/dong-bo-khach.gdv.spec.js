'use strict';

/** 19 · Đồng bộ toàn chuỗi nhìn từ GDV điểm bán A — khách do điểm bán B tạo. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chuan, dong, moMan, tim } = require('./customer-page');
const g = require('./khach-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test('19_010_006 — Danh sách hiện khách được tạo từ điểm bán khác', async ({ page }) => {
	chanNeuTat('19_010_006');
	const st = g.k.batHeader(page);
	await moMan(page, 'gdv');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const cuaToi = String(st.h.shopid);
	// Khách "điểm bán B" = khách mới nhất của chuỗi do điểm bán KHÁC tạo (SELECT chỉ đọc — API danh sách
	// không trả originShopId). 🚫 Không tạo khách ở điểm bán khác: làn chỉ có một điểm bán.
	const d0 = g.selectDb(
		`SELECT customer_code, customer_name, origin_shop_id FROM VNPOST_CORE.CHAIN_CUSTOMER WHERE chain_id=${Number(st.h.chainid)} ` +
			`AND status=1 AND customer_name IS NOT NULL AND customer_code REGEXP '^[A-Za-z0-9_]+$' AND origin_shop_id NOT IN (0, ${Number(cuaToi)}) ` +
			'ORDER BY created_date DESC LIMIT 1',
	)[0];
	const khac = d0 && { customerCode: d0[0], customerName: d0[1], goc: d0[2] };
	test.skip(!khac, 'Không đọc được DB (thiếu all.env/mysql) hoặc chuỗi không có khách nào do điểm bán khác tạo.');
	test.info().annotations.push({ type: 'khách điểm bán B', description: `${khac.customerCode} · originShopId ${khac.goc} (GDV ở ${cuaToi})` });
	await tim(page, khac.customerCode);
	const d = dong(page).filter({ hasText: khac.customerCode });
	await expect(d, `GDV điểm bán ${cuaToi} không thấy khách ${khac.customerCode} của điểm bán ${khac.goc}`).toHaveCount(1, { timeout: 20_000 });
	expect(chuan(await d.innerText())).toContain(chuan(khac.customerName));
});
