'use strict';

/**
 * 07_2_010_012 — Chỉ `tct` và `province` cài đặt được khoá kho; `ward` / `shop` bị chặn (26/09/2026). Chỉ đọc.
 * Mỗi vai một phiên phụ (`ghi-kho.moPhienPhu`) mở `/settings?setting=stockFreeze`, đo: vào được nhóm không · nút "Thêm cấu hình khoá kho".
 * Đối chiếu `07_2_PQ_001` (vai tỉnh vào được) — hai case phải nhất quán.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');

test('07_2_010_012 — Chỉ TCT và Tỉnh cài đặt được khoá kho', async ({ browser }) => {
	const ly = skipReason(loadCaseInput(GOC, '07_2_010_012'));
	test.skip(Boolean(ly), ly ?? '');
	test.setTimeout(300_000);
	const kq = {};
	for (const vai of ['tct', 'province', 'ward', 'shop']) {
		const p = await k.moPhienPhu(browser, vai, '/settings?setting=stockFreeze');
		try {
			await p.page.waitForTimeout(4_000);
			const nut = await p.page.getByRole('button', { name: 'Thêm cấu hình khoá kho' }).filter({ visible: true }).count();
			const nhom = /stockFreeze/.test(p.page.url()) && (await p.page.getByText('Khoá kho', { exact: false }).filter({ visible: true }).count()) > 0;
			kq[vai] = { url: p.page.url().replace(process.env.VNPOST_BASE_URL, ''), vaoNhom: nhom, nutThem: nut };
		} finally { await p.dong(); }
	}
	test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
	expect(kq.tct.nutThem, 'TCT không có nút thêm cấu hình khoá kho').toBeGreaterThan(0);
	expect(kq.province.nutThem, 'Tỉnh không có nút thêm cấu hình khoá kho (mâu thuẫn 07_2_PQ_001)').toBeGreaterThan(0);
	expect(kq.ward.nutThem, '🔴 Vai xã vẫn thêm được cấu hình khoá kho').toBe(0);
	expect(kq.shop.nutThem, '🔴 Vai điểm bán vẫn thêm được cấu hình khoá kho').toBe(0);
});
