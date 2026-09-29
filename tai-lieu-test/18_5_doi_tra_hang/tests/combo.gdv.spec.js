'use strict';

/**
 * 18_5 nhóm 110 — trả hàng COMBO (vai `gdv`).
 *
 * Tiền đề: seed bước 15 (`00_seed/api-tests/15-combo.api.spec.js`) — combo `AUTO<làn>_SP_COMBO2` = 1 × SP FIFO + 1 × SP BT (Xanh),
 * bảng giá riêng 150.000đ. Bán combo xong thì bỏ CTKM tự áp để số tiền sạch (combo 150.000đ).
 * Trace 26/09/2026 (`ReturnProductsTable_v2.jsx`): bảng "Hàng khách trả lại" hiện combo 1 dòng; nút `split-cells`
 * ("Tách combo thành các sản phẩm lẻ") tách ra từng thành phần theo GIÁ LẺ (FIFO 100.000 · BT 100.000); nút `close` bỏ dòng.
 * BE (`ReturnOrderServiceImpl.splitComboChildReturn`): item thành phần (productId/variantId khác dòng combo) ⇒ clawback — tiền hoàn
 * = phần đã thu của combo − GIÁ LẺ phần khách giữ lại; thành phần không có trong combo ⇒ "Khong tim thay component trong combo".
 * Tiền hoàn đọc ở RESPONSE `data.totalRefundAmount`.
 * 🔴 Ghi thật: đơn bán combo + đơn hoàn trả.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const seed = require('../../00_seed/seed-state');
const { boKm } = require('../../20_khach_hang_than_thiet/tests/pos-km');
const { p, chuan, chanNeuTat, dongTra, khoiTra, tien, hoanTra, SHOP, BASE, GOC } = require('./doi-tra');

const cb = () => seed.doc().duLieu?.combo;
const SO = path.join(GOC, 'test-output', `combo-110.lane${process.env.VNPOST_LANE || 'x'}.json`);
const so = (s) => Number(String(s ?? '').replace(/[^\d-]/g, '')) || 0;

/** Bán `sl` combo (bỏ CTKM) ⇒ { orderId, orderNumber, tra }. */
async function banCombo(page, sl = 1) {
	const c = cb();
	test.skip(!c?.sku, 'Chưa có combo — chạy seed 15 (`-g "seed 15"`, playwright.api.config.js)');
	await p.moBan(page, test);
	await p.them(page, c.ten);
	if (sl > 1) {
		const o = p.dongBill(page).filter({ hasText: c.ten }).first().locator('input').first();
		await o.fill(String(sl));
		await o.press('Enter');
		await page.waitForTimeout(800);
	}
	await boKm(page);
	const t = await p.tongKet(page);
	const r = await p.thanhToanTienMat(page);
	expect(r.orderId, `Bán combo lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
	await page.keyboard.press('Escape').catch(() => null);
	return { ...r, tra: t.canThanhToan };
}

async function moDoiTraCombo(page, orderId) {
	await page.waitForTimeout(2_000);
	await p.moTrang(page, `${BASE()}/order/created-orders/detail/${orderId}/${SHOP()}`, p.VAI);
	await expect(page.getByText('Doanh thu', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(2_000);
	await page.getByRole('button', { name: /Đổi trả hàng/ }).click();
	await expect(page.getByText('Hàng khách trả lại')).toBeVisible({ timeout: 30_000 });
	await expect(dongTra(page).first(), 'Màn đổi trả không nạp hàng của đơn gốc').toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(1_000);
}

/** Tách combo (nếu còn gộp) rồi BỎ các dòng có tên trong `bo`. Trả giá lẻ đọc được { ten: giá }. */
async function tachVaBo(page, bo) {
	const tach = dongTra(page).locator('[aria-label="split-cells"]');
	if (await tach.count()) { await tach.first().click(); await page.waitForTimeout(1_200); }
	const gia = {};
	for (const t of (await dongTra(page).allInnerTexts()).map(chuan)) {
		const m = t.match(/^\d+\s+(\S+)\s.*?([\d.]+)\s*đ/);
		if (m) gia[m[1]] = so(m[2]);
	}
	for (const ten of bo) {
		const d = dongTra(page).filter({ hasText: ten }).first();
		await d.locator('[aria-label="close"]').first().click();
		await page.waitForTimeout(800);
	}
	return gia;
}
const btTen = () => cb().thanhPhan[1].ten.replace(/\s*\(.*\)$/, ''); // "AUTO8_SP_BT"
const fifoTen = () => cb().thanhPhan[0].ten;

test.describe('18_5 — Trả hàng combo', () => {
	test.describe.configure({ timeout: 300_000 });
	test.beforeEach(async ({ page }) => { await p.chanIn(page); });
	test.afterEach(async ({ page }) => {
		await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => null);
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_5_110_001 — Trả một sản phẩm trong combo làm phá vỡ combo', async ({ page }) => {
		chanNeuTat('18_5_110_001');
		const d = await banCombo(page);
		await moDoiTraCombo(page, d.orderId);
		const gia = await tachVaBo(page, [btTen()]);
		await expect(dongTra(page)).toHaveCount(1);
		const kt = await khoiTra(page);
		const x = await hoanTra(page);
		const refund = Number(x.body?.data?.totalRefundAmount ?? NaN);
		const giuLai = gia[btTen()];
		test.info().annotations.push({ type: 'đo', description: `đơn ${d.orderNumber} thu ${d.tra} · giá lẻ ${JSON.stringify(gia)} · trả ${fifoTen()}, giữ ${btTen()} · khối "${kt.slice(0, 250)}" · "${x.tb}" · hoàn ${refund}` });
		expect(x.tb).toContain('Tạo đơn hoàn trả thành công');
		fs.mkdirSync(path.dirname(SO), { recursive: true });
		fs.writeFileSync(SO, JSON.stringify({ orderId: d.orderId, orderNumber: d.orderNumber, tra: d.tra, lan1: refund, giaLe: gia }, null, 1));
		expect(giuLai, 'Không đọc được giá lẻ phần giữ lại').toBeGreaterThan(0);
		expect(refund, 'Tiền hoàn không theo clawback (đã thu − giá LẺ phần khách giữ)').toBe(d.tra - giuLai);
	});

	test('18_5_110_002 — Trả nốt sản phẩm còn lại của combo đã phá vỡ', async ({ page }) => {
		chanNeuTat('18_5_110_002');
		let s;
		try { s = JSON.parse(fs.readFileSync(SO, 'utf8')); } catch { /* */ }
		test.skip(!s?.orderId || !Number.isFinite(s.lan1), 'Chưa có đơn combo đã trả một phần (chạy 110_001 trước)');
		await moDoiTraCombo(page, s.orderId);
		const con = (await dongTra(page).allInnerTexts()).map(chuan);
		const x = await hoanTra(page);
		const refund = Number(x.body?.data?.totalRefundAmount ?? NaN);
		test.info().annotations.push({ type: 'đo', description: `đơn ${s.orderNumber} thu ${s.tra} · lần 1 hoàn ${s.lan1} · dòng còn lại ${JSON.stringify(con)} · "${x.tb}" · lần 2 hoàn ${refund} · tổng ${s.lan1 + refund}` });
		expect(x.tb).toContain('Tạo đơn hoàn trả thành công');
		expect(s.lan1 + refund, 'Tổng hai lần hoàn ≠ đúng số đã thu của combo').toBe(s.tra);
	});

	test('18_5_110_003 — Trả combo khi đơn mua từ hai combo cùng loại trở lên', async ({ page }) => {
		chanNeuTat('18_5_110_003');
		const d = await banCombo(page, 2);
		await moDoiTraCombo(page, d.orderId);
		// Tách, bỏ dòng BT, giảm FIFO còn 1 ⇒ chỉ MỘT combo bị phá.
		const gia = await tachVaBo(page, [btTen()]);
		const oFifo = dongTra(page).filter({ hasText: fifoTen() }).first().locator('input').first();
		await oFifo.fill('1');
		await oFifo.press('Tab');
		await page.waitForTimeout(800);
		const kt = await khoiTra(page);
		const x = await hoanTra(page);
		const refund = Number(x.body?.data?.totalRefundAmount ?? NaN);
		const moiCombo = d.tra / 2;
		test.info().annotations.push({ type: 'đo', description: `đơn ${d.orderNumber} 2 combo thu ${d.tra} · giá lẻ ${JSON.stringify(gia)} · trả 1 ${fifoTen()} · khối "${kt.slice(0, 250)}" · "${x.tb}" · hoàn ${refund}` });
		expect(x.tb).toContain('Tạo đơn hoàn trả thành công');
		expect(refund, 'Chỉ combo bị phá được clawback: hoàn = giá 1 combo − giá lẻ phần giữ lại của combo đó').toBe(moiCombo - gia[btTen()]);
	});

	test('18_5_110_004 — Chặn khi không tìm thấy thành phần của combo', async ({ page }) => {
		chanNeuTat('18_5_110_004');
		const d = await banCombo(page);
		await moDoiTraCombo(page, d.orderId);
		// Item trỏ vào SP KHÔNG thuộc combo (SP đích danh của làn) ⇒ BE không tìm thấy component.
		const dd = seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.dichDanh;
		const { chon } = require('../../shared/db/otp');
		const [pid, vid] = chon(`select product_id, variant_id from CHAIN_PRODUCT_UNIT where sku='${dd.sku}' and variant_id is not null limit 1`, 'VNPOST_CORE').split('\t').map(Number);
		await page.route('**/create-return-exchange**', async (route) => {
			const b = route.request().postDataJSON();
			for (const it of b?.returnOrder?.items || []) { it.productId = pid; it.variantId = vid; }
			await route.continue({ postData: JSON.stringify(b) });
		});
		const x = await hoanTra(page);
		const loi = chuan(x.body?.status?.message || x.tb).replace(/\s*\([A-Za-z0-9]{6}\)$/, '');
		test.info().annotations.push({ type: 'đo', description: `đơn ${d.orderNumber} · item → ${dd.tenSanPham} (${pid}/${vid}) · "${x.tb}" · ${JSON.stringify(x.body?.status)}` });
		expect(loi).toBe('Khong tim thay component trong combo');
	});
});
