'use strict';

/**
 * 07_2_080_001/002/003 — Giá vốn TẠM TÍNH của phần bán âm (vai `shop`; bán bằng phiên phụ `gdv`) — GHI THẬT (28/09/2026).
 *
 * Kỳ vọng user chốt 28/09/2026 (A10, A11): giá vốn phần âm = GIÁ VỐN GẦN NHẤT của sản phẩm tại kho. Đo bằng giá nhập gần nhất
 * (`SHOP_STOCK.last_import_price` ngay trước khi bán — dựng 2 lần nhập giá KHÁC nhau 70.000 → 80.000 để phân biệt với giá lô cũ
 * 60.000), ghi kèm `price_avg`. Giá vốn phần âm đọc ở `SHOP_NEGATIVE_STOCK_BALANCE.temporary_cogs` của phiếu xuất bán (SELECT).
 *
 * Tiền đề dựng trong spec (làn 5 — 🔴 làn 8 đang khoá kỳ 09 tới 01/10):
 * - `shared/ban-am.js › bat` thêm RIÊNG điểm bán làn vào phạm vi bán tồn kho âm; `khoiPhuc` ở afterAll.
 * - SP FIFO của làn (một biến thể): xuất về 0 → nhập 2 @70.000 → [080_002] bán 3 (vượt tồn) → [080_003] bán 1 (đang âm) →
 *   nhập 2 @80.000 (về 0) → [080_001] bán 1 (tồn 0). afterAll nhập/xuất trả về đúng tồn đầu @60.000.
 * 🔴 Nhập bù sau bán âm làm lô dư so với tồn (lỗi B20, memory `nhap_bu_ban_am_lo_khong_tru`) ⇒ xuất theo TỒN, 🚫 theo remain lô.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const ka = require('../../shared/kho-api');
const banAm = require('../../shared/ban-am');
const { banPos } = require('../../shared/ban-pos');

const GOC = path.join(__dirname, '..');
const { d } = ka;
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const tenSp = () => d().sanPham.sanPhamTheoGiaVon.fifo.tenSanPham;

let X = null;
let TON0 = null;
const giaGanNhat = () => {
	const [nhap, bq] = ka.sql(`select coalesce(max(last_import_price),0), coalesce(max(price_avg),0) from SHOP_STOCK where shop_id=${d().diemBan.shopId} and variant_id=${X.variantId} and coalesce(active,1)=1`).split('\t').map(Number);
	return { nhap, bq };
};
const cogsAm = (phieu) => ka.sql(`select coalesce(group_concat(concat(negative_quantity,'@',temporary_cogs)),'') from SHOP_NEGATIVE_STOCK_BALANCE where shop_id=${d().diemBan.shopId} and stock_in_out_id=${phieu}`);

/** Xuất theo TỒN (không theo remain lô) về mức `muc`, lô cũ trước. */
async function xuatVe(g, muc) {
	let con = ka.tonSo(X) - muc;
	for (const l of (await ka.loCua(g, X)).filter((z) => Number(z.remainQuantity) > 0)) {
		if (con <= 0) break;
		const sl = Math.min(con, Number(l.remainQuantity));
		const r = await ka.xuat(g, X, { sl, lo: l.batchCode });
		expect(String(r.xacNhan?.code), `Xuất tồn lỗi: ${JSON.stringify(r.tao)} ${JSON.stringify(r.xacNhan)}`).toBe('200');
		con -= sl;
	}
	await expect.poll(() => ka.tonSo(X), { timeout: 30_000 }).toBe(muc);
}

/** Bán `sl` rồi đọc giá vốn phần âm; trả số đo. */
async function banVaDo(browser, sl) {
	const truoc = ka.tonSo(X);
	const g0 = giaGanNhat();
	const g = await ka.moGdv(browser, 'gdv');
	try {
		const b = await banPos(g, test, tenSp(), sl);
		await expect.poll(() => ka.tonSo(X), { timeout: 60_000, intervals: [3_000] }).toBe(truoc - sl);
		let am = '';
		for (let i = 0; i < 10 && !am; i += 1) { am = cogsAm(b.phieu); if (!am) await g.page.waitForTimeout(2_000); }
		const cogs = am ? am.split(',').map((x) => Number(x.split('@')[1])) : [];
		ghiDo(`tồn ${truoc} → bán ${sl} (đơn ${b.orderNumber}, phiếu ${b.phieu}) ⇒ ${ka.tonSo(X)} · giá nhập gần nhất ${g0.nhap} · price_avg ${g0.bq} · phần âm [SL@giá vốn tạm] ${am || '(không có)'} · dòng phiếu giá ${b.dong[0]} base ${b.dong[5]}`);
		return { truoc, g0, cogs, am };
	} finally { await g.dong(); }
}

test.describe('07_2 — Giá vốn tạm tính khi bán âm', () => {
	test.describe.configure({ timeout: 300_000 });

	test.beforeAll(async ({ browser }) => {
		test.setTimeout(240_000);
		X = ka.donVi(ka.SP.FIFO());
		TON0 = ka.tonSo(X);
		await banAm.bat(browser, d().diemBan.maShop);
		const g = await ka.moGdv(browser, 'gdv');
		try {
			await xuatVe(g, 0);
			await ka.nhap(g, X, { sl: 2, gia: 70_000, ghiChu: 'AUTO test 07_2_080 nhap 70k' });
			await expect.poll(() => ka.tonSo(X), { timeout: 30_000 }).toBe(2);
		} finally { await g.dong(); }
	});

	test.afterAll(async ({ browser }) => {
		test.setTimeout(240_000);
		try {
			const g = await ka.moGdv(browser, 'gdv');
			try {
				const ton = ka.tonSo(X);
				if (ton < TON0) await ka.nhap(g, X, { sl: TON0 - ton, gia: 60_000, ghiChu: 'AUTO test 07_2_080 tra ton' });
				else if (ton > TON0) await xuatVe(g, TON0);
			} finally { await g.dong(); }
		} finally { await banAm.khoiPhuc(browser); }
	});

	test('07_2_080_002 — Giá vốn tạm tính khi tồn > 0 rồi bán vượt thành âm', async ({ browser }) => {
		chanNeuTat('07_2_080_002');
		test.skip(ka.tonSo(X) !== 2, `Tiền đề hỏng: tồn ${ka.tonSo(X)} ≠ 2`);
		const r = await banVaDo(browser, 3);
		expect(r.cogs.length, 'Bán vượt tồn mà không sinh dòng phần âm (SHOP_NEGATIVE_STOCK_BALANCE)').toBeGreaterThan(0);
		for (const c of r.cogs) expect(c, `🔴 Giá vốn phần âm ${c} ≠ giá vốn gần nhất ${r.g0.nhap}`).toBe(r.g0.nhap);
	});

	test('07_2_080_003 — Giá vốn tạm tính khi tồn đang âm rồi bán tiếp', async ({ browser }) => {
		chanNeuTat('07_2_080_003');
		test.skip(!(ka.tonSo(X) < 0), `Tiền đề hỏng: tồn ${ka.tonSo(X)} không âm`);
		const r = await banVaDo(browser, 1);
		expect(r.cogs.length, 'Bán khi đang âm mà không sinh dòng phần âm').toBeGreaterThan(0);
		for (const c of r.cogs) expect(c, `🔴 Giá vốn phần âm ${c} ≠ giá vốn gần nhất ${r.g0.nhap}`).toBe(r.g0.nhap);
	});

	test('07_2_080_001 — Giá vốn tạm tính khi tồn = 0 và bán âm', async ({ browser }) => {
		chanNeuTat('07_2_080_001');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const t = ka.tonSo(X);
			if (t < 0) await ka.nhap(g, X, { sl: -t, gia: 80_000, ghiChu: 'AUTO test 07_2_080_001 nhap 80k ve 0' });
			else if (t > 0) await xuatVe(g, 0);
			await expect.poll(() => ka.tonSo(X), { timeout: 30_000 }).toBe(0);
		} finally { await g.dong(); }
		const r = await banVaDo(browser, 1);
		expect(r.cogs.length, 'Bán khi tồn 0 mà không sinh dòng phần âm').toBeGreaterThan(0);
		for (const c of r.cogs) expect(c, `🔴 Giá vốn phần âm ${c} ≠ giá vốn gần nhất ${r.g0.nhap}`).toBe(r.g0.nhap);
	});
});
