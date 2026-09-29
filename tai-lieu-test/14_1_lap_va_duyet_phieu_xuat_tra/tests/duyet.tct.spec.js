'use strict';

/**
 * 14_1 · 040_010 — vai `tct`: TCT không duyệt được phiếu hàng cấp tỉnh (is_tct = 0).
 * Tiền đề: phiếu Chờ duyệt của điểm bán seed (API, phiên phụ `shop`); dọn: điểm bán huỷ.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const r = require('./return-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

test('14_1_040_010 — TCT không duyệt được phiếu hàng cấp tỉnh', async ({ browser }) => {
	chanNeuTat('14_1_040_010');
	test.setTimeout(240_000);
	const shop = await r.k.moPhienPhu(browser, 'shop', r.ROUTE);
	let id;
	try {
		const p = await r.taoPhieuApi(shop.page, shop.st, { sl: 1 });
		id = p.id;
		expect((await r.chiTietPhieu(shop.page, shop.st, id)).request.isTct).toBe(0);
		const b = await r.goiDuyet(browser, 'tct', id, { extra: { items: [] } });
		expect(r.msg(b)).toBe('TCT chỉ duyệt được phiếu hàng TCT');
	} finally {
		await r.donPhieu(browser, shop, id);
		await shop.dong();
	}
});
