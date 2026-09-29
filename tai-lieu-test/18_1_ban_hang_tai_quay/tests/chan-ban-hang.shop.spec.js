'use strict';

/**
 * `18_1_010_003` — màn bán hàng **chặn cứng khi chưa mở ca** (vai `shop` = CHT điểm bán seed,
 * tài khoản KHÔNG mở ca; GDV đã có ca mở cho các case bán hàng khác).
 *
 * Đo 20/09 + 25/09/2026: modal "Yêu cầu mở ca trước khi bán hàng" / "Bạn cần mở ca làm việc trước
 * khi thực hiện thao tác bán hàng." + nút "Đã hiểu"; ô tìm sản phẩm không dùng được.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

test('18_1_010_003 — Chưa mở ca thì chặn vào màn bán hàng', async ({ page }) => {
	const i = loadCaseInput(GOC, '18_1_010_003');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(120_000);
	const st = k.batHeader(page);
	const ghi = [];
	page.on('request', (r) => {
		if (r.method() !== 'GET' && /orders|checkout|draft/i.test(r.url())) ghi.push(`${r.method()} ${r.url()}`);
	});
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/order/create-order`, 'shop');
	await expect.poll(() => st.h?.shopid, { timeout: 30_000 }).toBeTruthy();
	const ca = await k.goiGhi(page, st, 'GET', '/timekeeping/shift-report/unclosed', { shopId: st.h.shopid });
	test.skip((ca?.data || []).length > 0, `Tài khoản vai shop đang có ${(ca?.data || []).length} ca chưa chốt — không còn là "chưa mở ca".`);
	const hop = page.getByRole('dialog').filter({ hasText: 'Yêu cầu mở ca trước khi bán hàng' });
	await expect(hop).toBeVisible({ timeout: 30_000 });
	expect(chuan(await hop.innerText())).toContain('Bạn cần mở ca làm việc trước khi thực hiện thao tác bán hàng.');
	await expect(hop.getByRole('button', { name: 'Đã hiểu' })).toBeVisible();
	await expect(page.getByPlaceholder('Tìm kiếm sản phẩm / dịch vụ (F3)')).toHaveCount(0);
	expect(ghi, 'Bị chặn vì chưa mở ca mà vẫn gửi request ghi đơn').toEqual([]);
});
