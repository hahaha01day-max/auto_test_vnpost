'use strict';

/**
 * 18_4_060_006 — đơn đã qua đổi trả không còn nút "Đổi trả hàng".
 * Dùng đơn hoàn trả chung của 18_5 (`18_5/test-output/don-hoan-tra.lane<N>.json`, sinh bởi `18_5/tests/sau-chot.gdv.spec.js`).
 * Chưa có sổ (hoặc sổ ngày cũ) ⇒ tự tạo qua helper 18_5 (bán 1 đơn tiền mặt + hoàn trả hết). 🔴 Ghi thật ở điểm bán seed.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const dt = require('../../18_5_doi_tra_hang/tests/doi-tra');

const GOC = path.join(__dirname, '..');
const SO = path.join(dt.GOC, 'test-output', `don-hoan-tra.lane${process.env.VNPOST_LANE || 'x'}.json`);

async function donDaDoiTra(page) {
	try {
		const c = JSON.parse(fs.readFileSync(SO, 'utf8'));
		if (c.orderId) return c.orderId;
	} catch { /* chưa có */ }
	const d = await dt.banDon(page);
	await dt.moDoiTra(page, d.orderId);
	const { tb } = await dt.hoanTra(page);
	expect(tb, 'Không tạo được đơn hoàn trả làm tiền đề').toContain('Tạo đơn hoàn trả thành công');
	await dt.p.donTab(page).catch(() => null);
	return d.orderId;
}

test('18_4_060_006 — Nút Đổi trả hàng ẩn với đơn đã qua đổi trả', async ({ page }) => {
	const i = loadCaseInput(GOC, '18_4_060_006');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(300_000);
	await dt.p.chanIn(page);
	const orderId = await donDaDoiTra(page);
	await dt.p.moTrang(page, `${dt.BASE()}/order/created-orders/detail/${orderId}/${dt.SHOP()}`, dt.p.VAI);
	await expect(page.getByText('Doanh thu', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(3_000);
	const nut = page.getByRole('button', { name: /Đổi trả hàng/ });
	test.info().annotations.push({ type: 'đơn', description: `orderId ${orderId} · nút "Đổi trả hàng": ${await nut.count()}` });
	await expect(nut, 'Đơn đã hoàn trả hết vẫn còn nút "Đổi trả hàng"').toHaveCount(0);
});
