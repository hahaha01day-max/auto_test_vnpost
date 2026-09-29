'use strict';

/**
 * TIỀN ĐỀ 19 (chạy riêng: `-g "tien de 19"`) — khách rác CÓ công nợ cho 040_001 · 050_003 · 060_002 · 090_001.
 *
 * GDV (auto<làn>_gdv) mở POS, gắn khách rác, bán 2 × SP giá tiêu chuẩn, bấm F8 "Thanh toán sau" ⇒ đơn nợ.
 * Sổ ghi ở `test-output/tien-de.lane<làn>.json` (🔴 file — worker restart làm mất biến trong bộ nhớ).
 * 🔴 Ghi THẬT: tồn kho điểm bán giảm 2, công nợ khách tăng. Khách này KHÔNG xoá (còn nợ = đúng tiền đề 050_003).
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const g = require('./khach-ghi');

const SO = path.join(__dirname, '..', 'test-output', `tien-de.lane${g.LAN}.json`);
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

test.describe('tien de 19', () => {
	test.skip(!process.env.VNPOST_TIEN_DE, 'Chỉ chạy khi đặt VNPOST_TIEN_DE=1 (ghi dữ liệu thật).');

	test('tien de 19 — khách rác có đơn thanh toán sau', async ({ page }) => {
		test.setTimeout(300_000);
		const st = await p.moBan(page, test);
		const kh = await g.taoKhachApi(page, st, g.khachMoi('NO'));
		ghiChu('khách', `${kh.id} ${kh.ma}`);
		await p.chonKhach(page, kh.ten);
		await p.them(page, p.sp().tc);
		await p.them(page, p.sp().tc);
		await page.waitForTimeout(1_500);
		const cho = page.waitForResponse((r) => /spa-checkout/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
		await page.keyboard.press('F8');
		const r = await cho;
		const b = await r.json().catch(() => ({}));
		ghiChu('F8', `${r.status()} ${JSON.stringify(b?.status)}`);
		expect(String(b?.status?.code), `Tạo đơn thanh toán sau lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
		const orderId = b?.data?.orderId ?? b?.data?.id ?? b?.data;
		await page.waitForTimeout(3_000);
		const don = await p.donTrongDs(page, st, orderId);
		ghiChu('đơn', JSON.stringify(don && { orderId, code: don.orderCode ?? don.code, total: don.totalMoney ?? don.total, status: don.status }));
		const so = fs.existsSync(SO) ? JSON.parse(fs.readFileSync(SO, 'utf8')) : {};
		so.khNo = { id: kh.id, ma: kh.ma, ten: kh.ten, sdt: kh.sdt, orderId, luc: new Date().toISOString() };
		fs.mkdirSync(path.dirname(SO), { recursive: true });
		fs.writeFileSync(SO, JSON.stringify(so, null, 2));
	});
});
