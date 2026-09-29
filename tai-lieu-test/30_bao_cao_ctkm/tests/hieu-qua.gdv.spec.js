'use strict';

/**
 * 30 · Báo cáo hiệu quả CTKM — các case CẦN PHÁT SINH. Tiền đề dựng 1 lần (beforeAll):
 *   1. vai `tct` tạo CTKM RÁC theo đơn −10% chỉ ở điểm bán làn, tên CÓ DẤU (cho 050_006), ngân sách ≈ 110% tiền giảm của 1 đơn
 *      (⇒ sau 1 đơn đã dùng ~91% ngân sách — 010_002);
 *   2. vai `gdv` (spec này) bán 1 đơn tiền mặt tại POS, CHỈ giữ tick CTKM rác.
 * Rồi đọc báo cáo qua phiên phụ đúng vai của từng case (`shop` / `province`). Tiền đề lưu `test-output/tien-de-30.json`, dùng lại 12 giờ;
 * CTKM rác KHÔNG dừng (dừng thì hết phát sinh cho lượt chạy lại) — tự hết hạn sau 24 giờ, phạm vi chỉ điểm bán làn.
 * Số đối chứng lấy từ DB POD_02 `SHOP_ORDER_CAMPAIGN` (SELECT) — nguồn BE ghi lúc chốt đơn.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');
const c = require('./ctkm-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const boDau = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

const D = { ten: null, campaignId: null, orderId: null, orderNumber: null, db: null, loi: null };
const TEP = path.join(GOC, 'test-output', 'tien-de-30.json');

/** Mở báo cáo ở phiên phụ vai `vai`, lọc theo tên CTKM rác. Trả { ps, kq, r }. */
async function moBc(browser, vai, keyword = D.ten) {
	const ps = await c.k.moPhienPhu(browser, vai, '/dashboard');
	await c.chanGhi(ps.page);
	const kq = await c.moMan(ps.page, vai);
	const r = keyword ? await c.loc(ps.page, { keyword }) : null;
	return { ps, kq, r };
}
const canTienDe = () => test.skip(!D.campaignId || !D.orderId, `Tiền đề 30 không dựng được: ${D.loi}`);
const dongCua = (list) => (list?.data ?? []).find((x) => String(x.campaignId) === String(D.campaignId));

test.describe('30 · Hiệu quả CTKM có phát sinh (tiền đề gdv bán 1 đơn)', () => {
	test.describe.configure({ timeout: 300_000 });

	test.beforeAll(async ({ browser }) => {
		test.setTimeout(420_000);
		// Worker mới (sau 1 test fail) chạy lại beforeAll ⇒ dùng lại tiền đề đã dựng trong 12 giờ (CTKM rác hết hạn sau 24 giờ).
		try {
			const cu = JSON.parse(fs.readFileSync(TEP, 'utf8'));
			if (cu.orderId && cu.db && Date.now() - cu.luc < 12 * 3_600_000) { Object.assign(D, cu); return; }
		} catch { /* chưa có */ }
		const ctx = await browser.newContext({ storageState: require('../../shared/auth/accounts').storageStateFor('gdv'), viewport: { width: 1440, height: 1000 } });
		const page = await ctx.newPage();
		const tct = await c.k.moPhienPhu(browser, 'tct', '/promotion/campaign');
		try {
			D.ten = `${g.TIEN_TO}_KM_30 Giảm giá hè ${Date.now().toString().slice(-6)}`;
			// 🔴 Tạo CTKM TRƯỚC khi mở POS — POS nạp danh sách CTKM lúc mở màn (tạo sau thì hộp CTKM không có nó).
			const sku = c.seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan.sku;
			const gia = Number(g.selectDb(`SELECT price FROM VNPOST_CORE.CHAIN_PRODUCT_UNIT WHERE sku='${sku}' AND is_deleted=0 ORDER BY price DESC LIMIT 1`)[0]?.[0] ?? 0);
			D.nganSach = Math.ceil((gia * 0.1 * 1.1) / 100) * 100 || 20_000;
			D.campaignId = await c.taoKm(tct, D.ten, { nganSach: D.nganSach });
			await p.moBan(page, test);
			await p.them(page, p.sp().tc);
			await page.waitForTimeout(1_500);
			await c.chiGiuKm(page, D.ten);
			D.gio = await p.tongKet(page);
			const kq = await p.thanhToanTienMat(page);
			D.orderId = kq.orderId;
			D.orderNumber = kq.orderNumber;
			if (!D.orderId) throw new Error(`Thanh toán lỗi: ${JSON.stringify(kq.draft?.status)}`);
			await page.waitForTimeout(8_000);
			D.db = g.selectDb(`SELECT order_number,total_discount_amount,applied_discount_amount FROM VNPOST_POD_02.SHOP_ORDER_CAMPAIGN WHERE campaign_id=${Number(D.campaignId)} AND order_id=${Number(D.orderId)}`)[0] ?? null;
			D.ctDon = g.selectDb(`SELECT order_number,total_amount FROM VNPOST_POD_02.SHOP_ORDER WHERE order_id=${Number(D.orderId)}`)[0] ?? null;
			D.luc = Date.now();
			fs.writeFileSync(TEP, JSON.stringify(D, null, 2));
		} catch (e) {
			D.loi = String(e?.message ?? e).slice(0, 300);
			await c.dungKm(tct, D.campaignId).catch(() => null);
		} finally {
			await ctx.close();
			await tct.dong();
		}
	});

	test('30 don rac — dừng các CTKM rác 30 cũ (trừ tiền đề đang dùng)', async ({ browser }) => {
		const tct = await c.k.moPhienPhu(browser, 'tct', '/promotion/campaign');
		try {
			const l = await c.k.goiGhi(tct.page, tct.st, 'GET', '/marketing/campaign/v2/list', { shopId: tct.st.h.shopid, keyword: `${g.TIEN_TO}_KM_30`, page: 0, size: 100 });
			const cu = (l?.data?.content ?? l?.data ?? []).filter((x) => String(x.campaignId) !== String(D.campaignId) && !/EXPIRED|STOP/.test(String(x.campaignStatus ?? x.status)));
			const kq = [];
			for (const x of cu) kq.push(await c.dungKm(tct, x.campaignId));
			ghiChu('đã dừng', kq.join(' · ') || '(không có)');
		} finally { await tct.dong(); }
	});

	test('30 tien de — CTKM rác đã được áp vào đơn (DB)', async () => {
		ghiChu('tiền đề', JSON.stringify(D));
		canTienDe();
		expect(D.db, `Đơn ${D.orderId} KHÔNG ghi SHOP_ORDER_CAMPAIGN cho CTKM ${D.campaignId} (POS không áp CTKM rác)`).toBeTruthy();
	});

	// ───────── Vai shop ─────────

	test('30_030_003 — Bảng đơn hàng đã áp dụng chương trình đủ cột', async ({ browser }) => {
		chanNeuTat('30_030_003');
		canTienDe();
		const { ps } = await moBc(browser, 'shop');
		try {
			expect(await c.dong(ps.page).filter({ hasText: D.ten }).count(), 'Vai shop không thấy CTKM rác trong bảng').toBeGreaterThan(0);
			const dr = await c.moChiTiet(ps.page, D.ten);
			await dr.getByRole('tab', { name: 'Đơn hàng đã áp dụng chương trình' }).click();
			await ps.page.waitForTimeout(2_500);
			const cot = (await dr.locator('.ant-tabs-tabpane-active .ant-table-thead th').allInnerTexts()).map(c.chuan).filter(Boolean);
			const hang = (await dr.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').allInnerTexts()).map(c.chuan);
			ghiChu('cột thật', cot.join(' · '));
			ghiChu('dòng', hang.join(' | ').slice(0, 500));
			for (const nhan of ['STT', 'Mã đơn hàng', 'Thời gian', 'Tỉnh', 'Điểm bán', 'Giá trị đơn', 'Tiền giảm', 'Đã thanh toán', 'Còn nợ']) expect(cot, `Thiếu cột "${nhan}"`).toContain(nhan);
			expect(hang.join(' '), `Bảng đơn không có đơn ${D.db?.[0] ?? D.orderNumber} vừa bán`).toContain(String(D.db?.[0] ?? D.orderNumber));
		} finally { await ps.dong(); }
	});

	test('30_030_004 — Doanh thu thuần nhỏ hơn hoặc bằng doanh thu', async ({ browser }) => {
		chanNeuTat('30_030_004');
		// Đo ở hai phạm vi: vai shop (điểm bán làn) + vai tct (có đơn trả hàng thật ⇒ refundAmount > 0).
		const sai = [];
		const dem = {};
		for (const vai of ['shop', 'tct']) {
			const ps = await c.k.moPhienPhu(browser, vai, '/dashboard');
			try {
				const ds = [];
				for (let pg = 0; pg < 20; pg += 1) {
					const b = await c.k.goiGhi(ps.page, ps.st, 'GET', c.API, { ...c.kyMacDinh(), page: pg, size: 100 });
					expect(String(b?.status?.code), `API lỗi vai ${vai}`).toBe('200');
					ds.push(...(b.data ?? []));
					if ((b.data ?? []).length < 100) break;
				}
				dem[vai] = { n: ds.length, coHoan: ds.filter((x) => Number(x.refundAmount) > 0).length };
				for (const x of ds) {
					if (x.revenue == null) continue;
					const lech = Number(x.revenue) - Number(x.netRevenue);
					if (Number(x.netRevenue) > Number(x.revenue) + 0.5 || Math.abs(lech - Number(x.refundAmount ?? 0)) > 1) sai.push(`${vai} #${x.campaignId} ${x.campaignName}: DT ${x.revenue} · thuần ${x.netRevenue} · hoàn ${x.refundAmount}`);
				}
			} finally { await ps.dong(); }
		}
		ghiChu('đo', JSON.stringify(dem));
		expect(sai, 'Doanh thu thuần > doanh thu, hoặc chênh ≠ tiền hoàn').toEqual([]);
	});

	test('30_030_005 — Tổng tiền giảm của các đơn bằng tiền giảm giá của chương trình', async ({ browser }) => {
		chanNeuTat('30_030_005');
		canTienDe();
		const { ps, r } = await moBc(browser, 'shop');
		try {
			const d = dongCua(r.list);
			const don = await c.k.goiGhi(ps.page, ps.st, 'GET', '/report/campaign/v2/applied-orders', { campaignId: D.campaignId, page: 0, size: 100 });
			const cong = (don?.data ?? []).reduce((a, x) => a + Number(x.totalDiscountAmount ?? 0), 0);
			ghiChu('đo', `bảng: ${JSON.stringify(d && { n: d.orderCount, giam: d.discountAmount })} · ${don?.data?.length} đơn cộng giảm ${cong} · DB ${JSON.stringify(D.db)}`);
			expect(d, 'Báo cáo vai shop không có dòng CTKM rác').toBeTruthy();
			expect(Number(d.orderCount), `Số hoá đơn áp dụng: báo cáo ${d.orderCount}, DB có 1 đơn ${D.db?.[0]}`).toBe(1);
			expect(cong, 'Cộng "Tiền giảm" các đơn ≠ đơn thật (DB)').toBe(Number(D.db?.[1]));
			expect(Number(d.discountAmount), 'Tiền giảm giá của chương trình ≠ cộng tay các đơn').toBe(cong);
		} finally { await ps.dong(); }
	});

	test('30_050_006 — Tìm chương trình không dấu', async ({ browser }) => {
		chanNeuTat('30_050_006');
		canTienDe();
		const kd = boDau(D.ten);
		const { ps, r } = await moBc(browser, 'shop', kd);
		try {
			const thay = Boolean(dongCua(r.list));
			const co = await c.loc(ps.page, { keyword: D.ten });
			ghiChu('hành vi thật', `"${kd}" ⇒ ${thay ? 'CÓ' : 'KHÔNG'} tìm ra "${D.ten}" (${r.list?.page?.total_elements} kết quả) · gõ có dấu ⇒ ${co.list?.page?.total_elements} kết quả`);
			expect(Boolean(dongCua(co.list)), 'Gõ ĐÚNG tên có dấu mà không tìm ra (đối chứng)').toBe(true);
			expect(thay, `Tìm "${kd}" (không dấu) KHÔNG ra chương trình "${D.ten}"`).toBe(true);
		} finally { await ps.dong(); }
	});

	// ───────── Vai province ─────────

	test('30_010_001 — Báo cáo hiệu quả CTKM mở được và hiện thẻ tổng hợp', async ({ browser }) => {
		chanNeuTat('30_010_001');
		canTienDe();
		const { ps, kq } = await moBc(browser, 'province', null);
		try {
			const t = await c.the(ps.page);
			const n = await c.dong(ps.page).count();
			ghiChu('đo', `${c.tomTat(kq)} · thẻ ${JSON.stringify(t)} · ${n} dòng`);
			expect(c.okHet(kq), `API lỗi: ${c.tomTat(kq)}`).toBe(true);
			expect(Object.keys(t).length, 'Không có thẻ tổng hợp').toBeGreaterThanOrEqual(6);
			expect(n, `Vai tỉnh: bảng RỖNG trong kỳ dù điểm bán trực thuộc có CTKM "${D.ten}" phát sinh đơn ${D.db?.[0]}`).toBeGreaterThan(0);
			expect(t['Số chương trình'], 'Thẻ "Số chương trình" = 0').not.toMatch(/^0?$/);
		} finally { await ps.dong(); }
	});

	test('30_010_002 — Nhận ra chương trình đang tiêu gần hết ngân sách', async ({ browser }) => {
		chanNeuTat('30_010_002');
		canTienDe();
		const { ps, r } = await moBc(browser, 'province');
		try {
			const d = dongCua(r.list);
			const o = c.chuan(await c.dong(ps.page).filter({ hasText: D.ten }).first().innerText().catch(() => ''));
			ghiChu('đo', `ngân sách ${D.nganSach} · dòng API ${JSON.stringify(d && { dung: d.usedBudget, tong: d.totalBudget })} · dòng màn "${o}"`);
			expect(d, 'Vai tỉnh không thấy CTKM rác của điểm bán trực thuộc').toBeTruthy();
			expect(Number(d.totalBudget)).toBe(D.nganSach);
			expect(Number(d.usedBudget) / Number(d.totalBudget), 'Tỷ lệ ngân sách đã dùng không phản ánh đơn đã bán').toBeGreaterThan(0.8);
			expect(o, 'Dòng không hiện "đã dùng / tổng"').toMatch(/\/\s*[\d.]+/);
		} finally { await ps.dong(); }
	});

	test('30_020_001 — Lọc theo tiêu chí thu hẹp bảng và cập nhật thẻ tổng hợp', async ({ browser }) => {
		chanNeuTat('30_020_001');
		canTienDe();
		const { ps, r } = await moBc(browser, 'province');
		try {
			const t = await c.the(ps.page);
			const tieuDe = c.chuan(await c.bang(ps.page).locator('.ant-pro-table-list-toolbar-title').innerText().catch(() => ''));
			const n = await c.dong(ps.page).count();
			ghiChu('đo', `${n} dòng · tiêu đề "${tieuDe}" · thẻ ${JSON.stringify(t)} · summary ${JSON.stringify(r.summary?.data)}`);
			expect(n, 'Lọc theo tên CTKM rác (điểm bán trực thuộc) mà vai tỉnh không ra dòng nào').toBe(1);
			expect(tieuDe).toMatch(/\b1\b/);
			expect(c.soTu(t['Số chương trình'])).toBe(1);
			expect(c.soTu(t['Số hoá đơn áp dụng'])).toBe(1);
		} finally { await ps.dong(); }
	});

	test('30_020_002 — Nhiều tiêu chí cùng lúc là điều kiện AND', async ({ browser }) => {
		chanNeuTat('30_020_002');
		canTienDe();
		const { ps, r } = await moBc(browser, 'province');
		try {
			const coA = Boolean(dongCua(r.list));
			const ab = await c.loc(ps.page, { keyword: D.ten, trangThai: 'Đã kết thúc' });
			const q = Object.fromEntries(new URL(ab.url).searchParams);
			ghiChu('đo', `chỉ A (tên): ${coA ? 'có' : 'không'} · A+B (tên + Đã kết thúc): ${ab.list?.page?.total_elements} · q ${JSON.stringify(q)}`);
			expect(coA, 'Vai tỉnh lọc theo tên (chỉ A) không ra CTKM rác — không kiểm được AND').toBe(true);
			expect(q.campaignStatus).toBe('RAN');
			expect(Boolean(dongCua(ab.list)), 'CTKM đang chạy vẫn hiện khi lọc thêm "Đã kết thúc" (không phải AND)').toBe(false);
		} finally { await ps.dong(); }
	});

	test('30_030_001 — Chi tiết chương trình hiện mười chỉ số hiệu quả', async ({ browser }) => {
		chanNeuTat('30_030_001');
		canTienDe();
		const { ps } = await moBc(browser, 'province');
		try {
			expect(await c.dong(ps.page).filter({ hasText: D.ten }).count(), 'Vai tỉnh không thấy CTKM rác').toBeGreaterThan(0);
			const dr = await c.moChiTiet(ps.page, D.ten);
			const info = await c.moTa(dr);
			await dr.getByRole('tab', { name: 'Chỉ số hiệu quả' }).click();
			await ps.page.waitForTimeout(1_000);
			const cs = await c.moTa(dr);
			await dr.getByRole('tab', { name: 'Đơn hàng đã áp dụng chương trình' }).click();
			await ps.page.waitForTimeout(2_500);
			const nDon = await dr.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').count();
			ghiChu('đo', `cấu hình ${JSON.stringify(info)} · chỉ số ${JSON.stringify(cs)} · ${nDon} đơn`);
			expect(info['Tên chương trình']).toBe(D.ten);
			expect(Object.keys(cs)).toHaveLength(10);
			expect(nDon).toBeGreaterThan(0);
		} finally { await ps.dong(); }
	});

	test('30_030_002 — Truy được từ chỉ số xuống hoá đơn tạo ra nó', async ({ browser }) => {
		chanNeuTat('30_030_002');
		canTienDe();
		const { ps } = await moBc(browser, 'province');
		try {
			expect(await c.dong(ps.page).filter({ hasText: D.ten }).count(), 'Vai tỉnh không thấy CTKM rác').toBeGreaterThan(0);
			const dr = await c.moChiTiet(ps.page, D.ten);
			await dr.getByRole('tab', { name: 'Chỉ số hiệu quả' }).click();
			const cs = await c.moTa(dr);
			await dr.getByRole('tab', { name: 'Đơn hàng đã áp dụng chương trình' }).click();
			await ps.page.waitForTimeout(2_500);
			const cot = (await dr.locator('.ant-tabs-tabpane-active .ant-table-thead th').allInnerTexts()).map(c.chuan);
			const hang = dr.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row');
			const iGiam = cot.indexOf('Tiền giảm');
			const iGt = cot.indexOf('Giá trị đơn');
			let giam = 0; let gt = 0;
			for (let i = 0; i < (await hang.count()); i += 1) {
				const td = await hang.nth(i).locator('td').allInnerTexts();
				giam += c.soTu(td[iGiam]); gt += c.soTu(td[iGt]);
			}
			ghiChu('đo', `chỉ số ${JSON.stringify(cs)} · ${await hang.count()} đơn · cộng giảm ${giam} · cộng giá trị ${gt}`);
			expect(await hang.count(), 'Số dòng đơn ≠ "Số hoá đơn áp dụng"').toBe(c.soTu(cs['Số hoá đơn áp dụng']));
			expect(giam, 'Cộng "Tiền giảm" ≠ chỉ số "Tiền giảm giá"').toBe(c.soTu(cs['Tiền giảm giá']));
		} finally { await ps.dong(); }
	});

	test('30_040_001 — Xuất báo cáo hiệu quả ra Excel giữ nguyên thứ tự cột', async ({ browser }) => {
		chanNeuTat('30_040_001');
		const { ps } = await moBc(browser, 'province', null);
		try {
			const cotMan = (await c.bang(ps.page).locator('.ant-table-thead th').allInnerTexts()).map(c.chuan).filter(Boolean);
			const tai = ps.page.waitForEvent('download', { timeout: 60_000 }).catch(() => null);
			const tb = ps.page.waitForResponse((r) => r.url().includes(`${c.API}/export`), { timeout: 60_000 }).catch(() => null);
			await c.khung(ps.page).getByRole('button', { name: /Xuất Excel/ }).click();
			const [d, rs] = await Promise.all([tai, tb]);
			const loi = c.chuan(await ps.page.locator('.ant-message-notice').allInnerTexts().then((x) => x.join(' | ')));
			ghiChu('xuất', `${rs?.status()} · tệp ${d?.suggestedFilename()} · ${loi}`);
			expect(d, `Không tải được tệp (${rs?.status()} ${loi})`).toBeTruthy();
			expect(d.suggestedFilename()).toMatch(/^bao_cao_hieu_qua_ctkm_\d{8}_\d{6}\.xlsx$/);
			const wb = new ExcelJS.Workbook();
			await wb.xlsx.readFile(await d.path());
			const ws = wb.worksheets[0];
			let hdr = [];
			ws.eachRow((row, i) => { if (!hdr.length && i < 10) { const v = row.values.slice(1).map((x) => c.chuan(String(x ?? ''))); if (v.includes('STT') || v.some((x) => /chương trình/i.test(x))) hdr = v.filter(Boolean); } });
			ghiChu('cột màn vs tệp', `${cotMan.join(' · ')}  ||  ${hdr.join(' · ')}`);
			expect(hdr, 'Thứ tự/tên cột tệp khác màn hình').toEqual(cotMan);
		} finally { await ps.dong(); }
	});

	test('30_060_001 — Vai tỉnh thấy số liệu CTKM của các điểm bán trực thuộc', async ({ browser }) => {
		chanNeuTat('30_060_001');
		canTienDe();
		const { ps, r } = await moBc(browser, 'province');
		try {
			const d = dongCua(r.list);
			const don = await c.k.goiGhi(ps.page, ps.st, 'GET', '/report/campaign/v2/applied-orders', { campaignId: D.campaignId, page: 0, size: 100 });
			const tinh = [...new Set((don?.data ?? []).map((x) => x.provinceCode ?? x.provinceName))];
			// Đối chứng phạm vi: API không lọc ⇒ đơn thuộc tỉnh khác không được lọt.
			const all = await c.k.goiGhi(ps.page, ps.st, 'GET', c.API, { ...c.kyMacDinh(), page: 0, size: 100 });
			ghiChu('đo', `CTKM rác: ${d ? 'thấy' : 'KHÔNG thấy'} · đơn tỉnh ${JSON.stringify(tinh)} (${don?.status?.code}) · tổng CTKM thấy được ${all?.page?.total_elements}`);
			expect(d, `Vai tỉnh ${c.seed.doc().duLieu.toChuc.maTinh} KHÔNG thấy CTKM của điểm bán trực thuộc (đơn ${D.db?.[0]})`).toBeTruthy();
			expect(tinh.every((x) => String(x).includes(c.seed.doc().duLieu.toChuc.maTinh) || /AUTO7/.test(String(x))), `Có đơn tỉnh khác: ${tinh}`).toBe(true);
		} finally { await ps.dong(); }
	});
});
