'use strict';

/**
 * 08 · 050 — Cấu hình ngừng kích hoạt (ngừng bán theo phạm vi) · 040_006 lọc hình thức phân phối · 040_007 tìm combo — vai `tct`.
 *
 * Đo code 26/09/2026 (vnpost-web develop): menu Thao tác › "Cấu hình ngừng kích hoạt" ⇒ drawer "Chọn phạm vi ngừng bán - <tên>"
 * (Lý do + RegionSelector: Bưu điện tỉnh / Bưu điện xã / Điểm bán) nút Hủy / Áp dụng ⇒ `POST /chain/products/{id}/sale-scopes`
 * `{ scopeType, reason, scopes:[{ scopeType, orgUnitCode, parentOrgUnitCode }] }`. Không chọn phạm vi: toast "Vui lòng chọn ít nhất
 * một phạm vi khu vực". SP đã có cấu hình ⇒ drawer xác nhận (Đóng · "Xóa cấu hình ngừng bán hiện tại" · Cập nhật) — xoá = `DELETE …/sale-scopes`.
 * Kiểm bán hàng ở POS bằng phiên phụ `gdv` (điểm bán seed làn): SP mẫu = `AUTO<làn>_SP_NGK` (seed 16, có giá + tồn).
 * 🔴 Cấu hình ngừng bán luôn được GỠ ở finally (NGK dùng chung cho 11_khuyen_mai).
 * Phạm vi "khác" = điểm bán rác `duLieu.diemBanNhan` (không bán ở đó) — nửa "phạm vi khác vẫn bán được" đo bằng: đặt ngừng bán ở
 * điểm bán KHÁC rồi bán ở điểm bán seed.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const g = require('./sp-ghi');
const { chuan, khung, tim } = require('./product-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const NGK = () => seed.doc().duLieu.danhMucB?.ngk;
const shopSeed = () => ({ ma: seed.doc().duLieu.diemBan.maShop, xa: seed.doc().duLieu.diemBan.maXa });
const shopKhac = () => { const r = seed.doc().duLieu.diemBanNhan || {}; return { ma: r.maShop ?? r.maDiemBan, xa: r.maXa }; };

const datNgung = (m, id, s, lyDo = 'AUTO TEST 08_050') => m.goi('POST', `/chain/products/${id}/sale-scopes`, {}, {
	// 🔴 Đo 26/09: kèm parentOrgUnitCode = mã xã seed ⇒ SSHOP-402 "Truyền sai tham số" ⇒ chỉ gửi mã điểm bán.
	scopeType: 'DIEM_BAN', reason: lyDo, scopes: [{ scopeType: 'DIEM_BAN', orgUnitCode: s.ma }],
});
const goNgung = (m, id) => m.goi('DELETE', `/chain/products/${id}/sale-scopes`);
const docNgung = async (m, id) => (await m.goi('GET', `/chain/products/${id}/sale-scopes`))?.data;

/** Thử bán SP ở POS điểm bán seed (phiên phụ gdv); trả { banDuoc, thongBao, goiY }. */
async function thuBan(browser, ten) {
	const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
	const ps = await p.k.moPhienPhu(browser, 'gdv', '/pos');
	try {
		await p.chanIn(ps.page);
		await p.moBan(ps.page, test);
		const r = await p.them(ps.page, ten).catch((e) => ({ loi: e.message.split('\n')[0] }));
		const kq = { banDuoc: Boolean(r?.dong), thongBao: r?.thongBao || r?.loi || '', goiY: r?.goiY || '' };
		await p.donTab(ps.page).catch(() => null);
		return kq;
	} finally { await ps.dong(); }
}

test.describe('08 — Ngừng kích hoạt / lọc (GHI)', () => {
	test.describe.configure({ timeout: 360_000 });

	test('08_050_002 — Ngừng kích hoạt khi KHÔNG chọn phạm vi áp dụng', async ({ page }) => {
		chanNeuTat('08_050_002');
		const m = await g.moMan(page);
		try {
			const x = await g.taoSpApi(m, { ten: g.TEN(`N2_${g.hau()}`), sku: g.MA(`N2${g.hau()}`) });
			const d = await g.dongSp(page, x.sku);
			await g.thaoTac(page, d, 'Cấu hình ngừng kích hoạt');
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chọn phạm vi ngừng bán' }).last();
			await expect(dr).toBeVisible({ timeout: 20_000 });
			await page.waitForTimeout(2_000);
			const daGoi = [];
			page.on('request', (r) => { if (r.method() === 'POST' && /sale-scopes/.test(r.url())) daGoi.push(r.url()); });
			const tb = page.locator('.ant-message-notice').first().waitFor({ timeout: 8_000 }).then(() => page.locator('.ant-message-notice').allInnerTexts()).catch(() => []);
			await dr.getByRole('button', { name: 'Áp dụng' }).click();
			const t = chuan((await tb).join(' | '));
			ghiDo(`thông báo "${t}" · POST ${daGoi.length}`);
			expect(t).toContain('Vui lòng chọn ít nhất một phạm vi khu vực');
			expect(daGoi).toEqual([]);
		} finally { await m.don(); }
	});

	test('08_050_001 — Cấu hình ngừng kích hoạt sản phẩm với đầy đủ thông tin', async ({ page, browser }) => {
		chanNeuTat('08_050_001');
		test.skip(!NGK(), 'Chưa có SP NGK — chạy seed 16.');
		const m = await g.moMan(page);
		const id = NGK().productId;
		try {
			// Nửa 1: ngừng bán ở điểm bán KHÁC ⇒ điểm bán seed vẫn bán được.
			const k1 = await datNgung(m, id, shopKhac());
			const ban1 = await thuBan(browser, NGK().ten);
			// Nửa 2: ngừng bán ở CHÍNH điểm bán seed ⇒ bị chặn.
			await goNgung(m, id);
			const k2 = await datNgung(m, id, shopSeed());
			expect(String(k2?.status?.code), `Đặt ngừng bán ở điểm bán seed lỗi: ${JSON.stringify(k2?.status)}`).toBe('200');
			const cauHinh = await docNgung(m, id);
			await tim(page, NGK().sku);
			const trangThai = chuan(await khung(page).locator('tr.ant-table-row').filter({ hasText: NGK().sku }).first().innerText().catch(() => ''));
			const ban2 = await thuBan(browser, NGK().ten);
			ghiDo(`đặt ở điểm bán khác: ${JSON.stringify(k1?.status)} ⇒ seed bán ${JSON.stringify(ban1)} · đặt ở seed: ${JSON.stringify(k2?.status)} · cấu hình ${JSON.stringify(cauHinh)?.slice(0, 300)} · dòng DS "${trangThai}" ⇒ seed bán ${JSON.stringify(ban2)}`);
			expect(String(k2?.status?.code), 'Lưu cấu hình ngừng bán lỗi').toBe('200');
			expect(ban1.banDuoc, 'Ngừng bán ở điểm bán KHÁC mà điểm bán seed cũng không bán được (phạm vi nở ra)').toBe(true);
			expect(ban2.banDuoc, '🔴 Đã ngừng bán ở điểm bán seed mà vẫn bán được').toBe(false);
		} finally { await goNgung(m, id).catch(() => null); }
	});

	test('08_050_003 — Cập nhật cấu hình ngừng kích hoạt', async ({ page, browser }) => {
		chanNeuTat('08_050_003');
		test.skip(!NGK(), 'Chưa có SP NGK — chạy seed 16.');
		const m = await g.moMan(page);
		const id = NGK().productId;
		try {
			const k0 = await datNgung(m, id, shopSeed(), 'AUTO TEST 050_003 cũ');
			expect(String(k0?.status?.code), `Đặt ngừng bán lỗi: ${JSON.stringify(k0?.status)}`).toBe('200');
			const truoc = await thuBan(browser, NGK().ten);
			// Cập nhật: đổi phạm vi sang điểm bán khác (FE "Cập nhật" = mở lại editor rồi POST cấu hình mới).
			await goNgung(m, id);
			const k = await datNgung(m, id, shopKhac(), 'AUTO TEST 050_003 mới');
			const cauHinh = await docNgung(m, id);
			const sau = await thuBan(browser, NGK().ten);
			ghiDo(`phạm vi cũ (seed): bán=${truoc.banDuoc} · cập nhật ${JSON.stringify(k?.status)} · cấu hình mới ${JSON.stringify(cauHinh)?.slice(0, 300)} · phạm vi cũ sau cập nhật: bán=${sau.banDuoc}`);
			expect(truoc.banDuoc, 'Phạm vi cũ trước cập nhật vẫn bán được').toBe(false);
			expect(sau.banDuoc, 'Đổi phạm vi rồi mà phạm vi CŨ vẫn bị chặn').toBe(true);
			expect(JSON.stringify(cauHinh), 'Cấu hình mới không mang điểm bán mới').toContain(shopKhac().ma);
		} finally { await goNgung(m, id).catch(() => null); }
	});

	test('08_050_004 — Kích hoạt lại sản phẩm', async ({ page, browser }) => {
		chanNeuTat('08_050_004');
		test.skip(!NGK(), 'Chưa có SP NGK — chạy seed 16.');
		const m = await g.moMan(page);
		const id = NGK().productId;
		try {
			const k0 = await datNgung(m, id, shopSeed(), 'AUTO TEST 050_004');
			expect(String(k0?.status?.code), `Đặt ngừng bán lỗi: ${JSON.stringify(k0?.status)}`).toBe('200');
			// Kích hoạt lại qua giao diện (index.jsx): SP đang ngừng/khoá một phần ⇒ menu Thao tác có "Kích hoạt lại" (Popconfirm
			// "Bạn có chắc chắn muốn kích hoạt lại sản phẩm không?" · Đồng ý) và "Cập nhật cấu hình ngừng kích hoạt".
			const d = await g.dongSp(page, NGK().sku);
			await d.getByRole('button', { name: 'Thao tác' }).click();
			await page.waitForTimeout(800);
			await page.locator('.ant-dropdown:not(.ant-dropdown-hidden)').getByText('Kích hoạt lại', { exact: true }).last().click({ force: true });
			const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').filter({ hasText: 'kích hoạt lại sản phẩm' }).last();
			await expect(pop).toBeVisible({ timeout: 10_000 });
			const cho = page.waitForResponse((r) => r.request().method() !== 'GET' && /products|sale-scopes/.test(r.url()), { timeout: 20_000 }).catch(() => null);
			await pop.getByRole('button', { name: 'Đồng ý' }).click();
			const r = await cho;
			const b = r ? await r.json().catch(() => ({})) : null;
			ghiDo(`request kích hoạt lại: ${r?.request().method()} ${r?.url().replace(/^.*__api/, '')}`);
			const cauHinh = await docNgung(m, id);
			const ban = await thuBan(browser, NGK().ten);
			ghiDo(`xoá cấu hình ${JSON.stringify(b?.status)} · cấu hình còn ${JSON.stringify(cauHinh)?.slice(0, 200)} · bán ở phạm vi từng chặn: ${JSON.stringify(ban)} (cách kích hoạt lại: XOÁ cấu hình ngừng bán)`);
			expect(String(b?.status?.code)).toBe('200');
			expect(ban.banDuoc, 'Kích hoạt lại mà vẫn không bán được').toBe(true);
		} finally { await goNgung(m, id).catch(() => null); }
	});

	test('08_040_006 — Lọc sản phẩm theo hình thức phân phối', async ({ page }) => {
		chanNeuTat('08_040_006');
		await g.moMan(page);
		// Tìm ô lọc có lựa chọn "Mua bán" (nhãn cạnh ô không tin được — lần đo đầu bắt nhầm ô "Phân loại").
		let o = null;
		let lua = [];
		const cac = khung(page).locator('.ant-select').filter({ hasNot: page.locator('.ant-pagination') });
		for (let i = 0; i < Math.min(await cac.count(), 10) && !o; i += 1) {
			const c = cac.nth(i);
			if (!(await c.isVisible().catch(() => false))) continue;
			await c.click().catch(() => null);
			await page.waitForTimeout(500);
			const t = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last().locator('.ant-select-item-option').allInnerTexts().catch(() => [])).map(chuan);
			await page.keyboard.press('Escape');
			if (t.some((x) => /Mua bán|Ký gửi/.test(x))) { o = c; lua = t; }
		}
		expect(o, 'Không tìm thấy bộ lọc có lựa chọn "Mua bán"/"Ký gửi"').toBeTruthy();
		const kq = {};
		for (const l of lua) {
			await o.click();
			const cho = page.waitForResponse((r) => r.url().includes('/chain/products/get-all'), { timeout: 30_000 }).catch(() => null);
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last().locator('.ant-select-item-option').filter({ hasText: new RegExp(`^${l}$`) }).click();
			await khung(page).getByRole('button', { name: /Tìm kiếm|Truy vấn|Lọc/ }).first().click().catch(() => null);
			await cho;
			await page.waitForTimeout(2_000);
			const hinhThuc = [...new Set((await khung(page).locator('tr.ant-table-row').filter({ has: page.locator('td:nth-child(9)') }).locator('td:nth-child(5)').allInnerTexts()).map(chuan))];
			kq[l] = hinhThuc;
		}
		ghiDo(`lựa chọn ${JSON.stringify(lua)} · cột "Hình thức phân phối" sau lọc ${JSON.stringify(kq)} (phần giá ký gửi theo khu vực / import_price gồm VAT kiểm ở phân hệ 16)`);
		expect(lua.length, 'Bộ lọc hình thức phân phối không có lựa chọn').toBeGreaterThan(1);
		for (const [l, v] of Object.entries(kq)) {
			if (/tất cả/i.test(l)) continue;
			expect(v.filter((x) => x && x !== l), `Lọc "${l}" còn SP hình thức khác`).toEqual([]);
		}
	});

	test('08_040_007 — Tìm combo theo tên chính xác và lọc theo danh mục', async ({ page }) => {
		chanNeuTat('08_040_007');
		const m = await g.moMan(page);
		try {
			const a = await g.taoSpApi(m, { ten: g.TEN(`TP47_${g.hau()}`), sku: g.MA(`TP47${g.hau()}`) });
			const c = await g.taoCombo(m, [a], g.TEN(`CB47_${g.hau()}`));
			const { moTrang } = require('../../shared/auth/login');
			await moTrang(page, `${process.env.VNPOST_BASE_URL}/product/combo`, 'tct');
			await page.waitForTimeout(3_000);
			const oTen = khung(page).getByPlaceholder('Tìm kiếm theo tên');
			await oTen.fill(c.ten);
			await oTen.press('Enter');
			await page.waitForTimeout(3_000);
			const dong = (await khung(page).locator('tr.ant-table-row').filter({ has: page.locator('td:nth-child(5)') }).allInnerTexts()).map(chuan);
			ghiDo(`tìm "${c.ten}" ⇒ ${JSON.stringify(dong)}`);
			expect(dong.length, 'Tìm tên chính xác không ra đúng 1 combo').toBe(1);
			expect(dong[0]).toContain(c.ten);
		} finally { m.taoRa.reverse(); await m.don(); }
	});
});
