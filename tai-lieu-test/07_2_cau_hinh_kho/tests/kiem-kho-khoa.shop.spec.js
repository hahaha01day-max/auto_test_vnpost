'use strict';

/**
 * 07_2 · 060_006 / 060_012 — Kiểm kho với SP đang khoá / vừa bỏ khoá, GHI (26/09/2026). Vai `shop` (điểm bán seed).
 * Luồng kiểm kho theo khuôn 04_4 `kiem-kho-ghi.shop.spec.js › 04_4_040_004` (mở phiên → thêm phiếu → đếm TOÀN KHO bằng Excel với số ghi đè →
 * "Xác nhận đếm" → "Chốt phiên"). Khoá dựng bằng phiên phụ `tct` (`POST /inventory-config/stock-freeze/bulk`), bỏ ở finally; phiên kiểm treo huỷ ở finally.
 * 060_006: khoá TC + FIFO; lô TC nhỏ nhất −1 (chênh GIẢM), lô FIFO +1 (chênh TĂNG) ⇒ đo chốt phiên bị chặn thế nào, chặn SP nào.
 * 060_012: bỏ khoá; lô TC nhỏ nhất −1 ⇒ chốt thành công, tồn lô = số đếm.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { chon } = require('../../shared/db/otp');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const kk = require('../../04_4_kiem_kho/tests/kiem-kho-ghi');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const BASE = () => process.env.VNPOST_BASE_URL;
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const D = () => seed.doc().duLieu;
const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);
const spId = (sku) => Number(chon(`select product_id from CHAIN_PRODUCT_UNIT where sku='${sku}' limit 1`, 'VNPOST_CORE'));

async function khoa(browser, productIds) {
	const t = await k.moPhienPhu(browser, 'tct', '/settings?setting=stockFreeze');
	const reason = `AUTO test 07_2 kiem kho ${Date.now().toString().slice(-7)}`;
	const r = await k.goiGhi(t.page, t.st, 'POST', '/inventory-config/stock-freeze/bulk', {}, { scopeType: 'DIEM_BAN', scopes: [{ scopeType: 'DIEM_BAN', orgUnitCode: D().diemBan.maShop }], reason, productIds });
	expect(String(r?.status?.code), `Tạo khoá lỗi ${JSON.stringify(r?.status)}`).toBe('200');
	const ids = ds((await k.goiGhi(t.page, t.st, 'GET', '/inventory-config/stock-freeze'))?.data).filter((z) => JSON.stringify(z).includes(reason)).map((z) => z.ruleId ?? z.id);
	return async () => { for (const id of ids) await k.goiGhi(t.page, t.st, 'DELETE', `/inventory-config/stock-freeze/${id}`).catch(() => null); await t.dong(); };
}
const loCua = async (page, st, pid) => Object.fromEntries(((await k.goiApi(page, st, '/stock/v2/batch-product', { shopId: D().diemBan.shopId, productId: pid, size: 500 })).data || []).map((l) => [l.batchCode, Number(l.remainQuantity)]));
const nhoNhat = (lo) => Object.entries(lo).filter(([, v]) => v > 0).sort((a, b) => a[1] - b[1])[0];

/** Mở phiên, đếm toàn kho với `ghiDe`, xác nhận đếm, bấm chốt; trả { sessionId, body }. */
async function kiemVaChot(page, st, ghiDe, tenLyDo) {
	const shopId = D().diemBan.shopId;
	const mo = await kk.phienMo(page, st, shopId).catch(() => null);
	if (mo?.sessionId) await kk.huyPhien(page, st, shopId, mo.sessionId);
	const sessionId = await kk.moPhien(page, 'shop');
	await kk.themPhieu(page);
	await kk.demToanKhoExcel(page, st, shopId, ghiDe, test.info().outputPath('toan-kho.xlsx'));
	for (const t of tenLyDo) await kk.chonLyDo(page, t).catch(() => {});
	await page.getByRole('button', { name: 'Xác nhận đếm' }).click();
	await expect(page.locator('.ant-message-notice').filter({ hasText: 'Đã xác nhận đếm' }).first()).toBeAttached({ timeout: 30_000 });
	await moTrang(page, `${BASE()}/inventory/inventory-check/session-manage?shopId=${shopId}&sessionId=${sessionId}`, 'shop');
	const rv = await kk.moTongHop(page);
	const cho = page.waitForResponse((r) => /sessions\/\d+\/close/.test(r.url()), { timeout: 60_000 });
	await rv.getByRole('button', { name: 'Xác nhận chốt phiên' }).click();
	const body = await (await cho).json().catch(() => null);
	return { sessionId, body };
}

test.describe('07_2 · 060 — Kiểm kho với SP khoá kho (GHI)', () => {
	test.describe.configure({ timeout: 420_000 });

	test('07_2_060_006 — Kiểm kho có chênh lệch với sản phẩm đang bị khoá', async ({ page, browser }) => {
		chanNeuTat('07_2_060_006');
		const tc = spId(D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		const fifo = spId(D().sanPham.sanPhamTheoGiaVon.fifo.sku);
		const bo = await khoa(browser, [tc, fifo]);
		const st = k.batHeader(page);
		let sessionId = null;
		try {
			await moTrang(page, `${BASE()}/inventory/inventory-check`, 'shop');
			await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
			const [loTc, tonTc] = nhoNhat(await loCua(page, st, tc));
			const [loFi, tonFi] = nhoNhat(await loCua(page, st, fifo));
			const kq = await kiemVaChot(page, st, { [loTc]: tonTc - 1, [loFi]: tonFi + 1 }, [D().sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham, D().sanPham.sanPhamTheoGiaVon.fifo.tenSanPham]).catch((e) => ({ loi: String(e.message).slice(0, 300) }));
			sessionId = kq.sessionId;
			const sauTc = await loCua(page, st, tc);
			const sauFi = await loCua(page, st, fifo);
			test.info().annotations.push({ type: 'đo', description: `khoá TC+FIFO · đếm ${loTc} ${tonTc}→${tonTc - 1} (giảm), ${loFi} ${tonFi}→${tonFi + 1} (tăng) · chốt: ${JSON.stringify(kq.body?.status ?? kq.loi)} · tồn sau ${loTc}=${sauTc[loTc]}, ${loFi}=${sauFi[loFi]}` });
			expect(String(kq.body?.status?.code ?? ''), 'SP đang khoá mà kiểm kho có chênh lệch vẫn chốt được').not.toBe('200');
			expect(kq.body?.status?.message ?? kq.loi ?? '', 'Thông báo không nêu SP đang bị khoá').toMatch(/đang bị khoá|khóa/i);
			expect(sauTc[loTc], 'Tồn lô TC đổi dù bị chặn').toBe(tonTc);
		} finally {
			const mo = await kk.phienMo(page, st, D().diemBan.shopId).catch(() => null);
			if (mo?.sessionId || sessionId) await kk.huyPhien(page, st, D().diemBan.shopId, mo?.sessionId ?? sessionId);
			await bo();
		}
	});

	test('07_2_060_012 — Kiểm kho có chênh lệch với sản phẩm vừa bỏ khoá', async ({ page, browser }) => {
		chanNeuTat('07_2_060_012');
		const tc = spId(D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		const bo = await khoa(browser, [tc]);
		await bo();
		const st = k.batHeader(page);
		try {
			await moTrang(page, `${BASE()}/inventory/inventory-check`, 'shop');
			await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
			const [loTc, tonTc] = nhoNhat(await loCua(page, st, tc));
			const kq = await kiemVaChot(page, st, { [loTc]: tonTc - 1 }, [D().sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham]);
			const sau = await loCua(page, st, tc);
			test.info().annotations.push({ type: 'đo', description: `bỏ khoá · đếm ${loTc} ${tonTc}→${tonTc - 1} · chốt ${JSON.stringify(kq.body?.status)} · tồn sau ${sau[loTc] ?? 0}` });
			expect(String(kq.body?.status?.code), `Chốt phiên lỗi: ${kq.body?.status?.message}`).toBe('200');
			expect(sau[loTc] ?? 0, 'Tồn lô không cập nhật theo số đếm').toBe(tonTc - 1);
		} finally {
			const mo = await kk.phienMo(page, st, D().diemBan.shopId).catch(() => null);
			if (mo?.sessionId) await kk.huyPhien(page, st, D().diemBan.shopId, mo.sessionId);
		}
	});
});
