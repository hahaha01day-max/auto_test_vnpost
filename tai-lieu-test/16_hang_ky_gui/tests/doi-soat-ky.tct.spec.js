'use strict';

/**
 * Phân hệ 16 · 020 — màn Đối soát hàng ký gửi (danh sách NCC, khối kỳ bung sẵn, Drawer "Xem tất cả các kỳ"), vai `tct`.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/consignmentRecon/pages/ConsignmentReconListPage.jsx`,
 * `features/consignmentRecon/services/consignmentReconApi.js`.
 * 🔴 Vai `tct` thay `province`: đo 24/09/2026 làn 7, tỉnh làn có 0 NCC có kỳ; TCT thấy 5 NCC · 36 kỳ (OPEN 33 · LOCKED 2 ·
 *    INVOICED 1; có kỳ tất toán + kỳ đầu cắt cụt). Case phạm vi (014–016) nằm ở spec vai hẹp.
 * Cả file 🚫 GHI (chặn mọi request không phải GET tới consignment).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const ROUTE = '/debt-reconciliation/consignment-recon';
const TRANG_THAI = { OPEN: 'Đang gom số', LOCKED: 'Đã chốt kỳ', INVOICED: 'Đã ghi nợ' };
const CHU_KY = { WEEK: 'Tuần', MONTH: 'Tháng', QUARTER: 'Quý' };
const DA_CHOT = ['LOCKED', 'INVOICED'];

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();
const dongNcc = (page) => khung(page).locator('.ant-table-tbody > tr.ant-table-row');
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const vn = (ms) => new Intl.DateTimeFormat('vi-VN').format(new Date(ms));
const khoang = (ky) => `${vn(ky.periodFrom)} — ${vn(ky.periodTo)}`;
const soNgay = (ky) => Math.round((ky.periodTo - ky.periodFrom) / 86_400_000) + 1;
/** Tên NCC như FE hiện: thiếu tên thì lùi về `NCC #<id>` (`ConsignmentReconListPage.jsx:373-376`). */
const tenNcc = (n) => n.chainSupplierName || `NCC #${n.chainSupplierId}`;
const loaiKy = (ky) => (ky.settlement ? 'Kỳ tất toán' : ky.partial ? 'Kỳ đầu (cắt cụt)' : 'Kỳ thường');

async function chanGhi(page) {
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET' || !/consignment/i.test(req.url())) return route.continue();
		await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
}

/** Mở màn; trả danh sách NCC đúng như màn nhận (response đầu) + phiên để gọi API đọc. */
async function moMan(page) {
	await chanGhi(page);
	const st = k.batHeader(page);
	const cho = page.waitForResponse((r) => r.url().includes('/consignment-recon/suppliers') && r.request().method() === 'GET', { timeout: 60_000 });
	await moTrang(page, ROUTE, VAI);
	const res = await cho;
	const body = await res.json();
	expect(String(body?.status?.code), `/consignment-recon/suppliers: ${body?.status?.message}`).toBe('200');
	const ncc = body.data || [];
	expect(ncc.length, `Vai ${VAI} không thấy NCC nào có kỳ đối soát`).toBeGreaterThan(0);
	await expect(dongNcc(page)).toHaveCount(ncc.length, { timeout: 20_000 });
	return { ncc, st };
}

/** Tất cả kỳ (mọi NCC) qua API danh sách kỳ. */
const tatCaKy = async (page, st) => (await k.goiApi(page, st, '/consignment-recon/periods', { page: 0, size: 500 })).data || [];
/** Dòng NCC theo tên. */
const dongCua = (page, ten) => dongNcc(page).filter({ has: page.locator('td').filter({ hasText: ten }) }).first();
/** Bung khối kỳ dưới dòng NCC (nút bung đầu dòng); trả locator khối. */
async function bung(page, ten) {
	const r = dongCua(page, ten);
	const khoi = r.locator('xpath=following-sibling::tr[1][contains(@class,"ant-table-expanded-row")]');
	if (!(await khoi.isVisible().catch(() => false))) await r.locator('.ant-table-row-expand-icon').click();
	await expect(khoi).toBeVisible();
	return khoi;
}
/** Mở Drawer "Xem tất cả các kỳ" của NCC; trả { dr, ds } (ds = response kỳ của NCC). */
async function moDrawerKy(page, n) {
	const cho = page.waitForResponse((r) => r.url().includes('/consignment-recon/periods') && new URL(r.url()).searchParams.get('chainSupplierId') === String(n.chainSupplierId), { timeout: 30_000 });
	await dongCua(page, tenNcc(n)).getByRole('button', { name: 'Xem tất cả các kỳ' }).click();
	const ds = await (await cho).json();
	const dr = page.locator('.ant-drawer-open').last();
	await expect(dr).toBeVisible();
	await expect(dr.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(Math.min((ds.data || []).length, 20), { timeout: 20_000 });
	return { dr, ds: ds.data || [], total: ds.page?.total_elements ?? 0 };
}

test.describe('16 · 020 màn Đối soát hàng ký gửi (vai tct)', () => {
	test('16_020_001 — Màn Đối soát hàng ký gửi mở được', async ({ page }) => {
		chanNeuTat('16_020_001');
		const { ncc } = await moMan(page);
		await expect(khung(page).locator('.ant-page-header-heading-title')).toHaveText('Đối soát hàng ký gửi');
		for (const n of ncc) await expect(dongCua(page, tenNcc(n)), `Bảng thiếu NCC "${tenNcc(n)}"`).toBeVisible();
		ghi(`${ncc.length} NCC: ${ncc.map(tenNcc).join(', ')}`);
	});

	test('16_020_002 — Bảng nhà cung cấp hiện đủ năm cột', async ({ page }) => {
		chanNeuTat('16_020_002');
		const { ncc } = await moMan(page);
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);
		expect(cot).toEqual(['Nhà cung cấp', 'Tổng số kỳ', 'Kỳ đang gom số', 'Kỳ đã chốt', 'Kỳ gần nhất']);
		// Cột nút không tiêu đề: mọi dòng NCC có "Xem tất cả các kỳ".
		await expect(dongNcc(page).getByRole('button', { name: 'Xem tất cả các kỳ' })).toHaveCount(ncc.length);
		// Số trong 3 cột đếm khớp API.
		for (const n of ncc) {
			const o = (await dongCua(page, tenNcc(n)).locator('td').allInnerTexts()).map(chuan);
			const i = o.findIndex((x) => x.includes(tenNcc(n)));
			expect(i, `Không thấy ô tên "${tenNcc(n)}"`).toBeGreaterThanOrEqual(0);
			expect([o[i + 1], o[i + 2], o[i + 3]], `Số kỳ của "${tenNcc(n)}"`).toEqual([String(n.soKy ?? 0), String(n.soKyCanXuLy ?? 0), String(n.soKyDaChot ?? 0)]);
		}
	});

	test('16_020_007 — Cột Kỳ đang gom số chỉ đếm kỳ đã tới ngày bắt đầu', async ({ page }) => {
		chanNeuTat('16_020_007');
		const { ncc, st } = await moMan(page);
		const ky = await tatCaKy(page, st);
		const homNay = Date.now();
		const n = ncc.find((x) => (x.soKyDangMo ?? 0) > (x.soKyCanXuLy ?? 0));
		test.skip(!n, 'Không NCC nào có kỳ mở CHƯA tới ngày bắt đầu (soKyDangMo = soKyCanXuLy ở mọi NCC).');
		const moCuaNcc = ky.filter((x) => x.chainSupplierId === n.chainSupplierId && x.status === 'OPEN');
		const daToi = moCuaNcc.filter((x) => x.periodFrom <= homNay).length;
		const chuaToi = moCuaNcc.length - daToi;
		ghi(`${n.chainSupplierName}: kỳ mở ${moCuaNcc.length} = đã tới ${daToi} + chưa tới ${chuaToi} · cột hiện ${n.soKyCanXuLy} · soKyDangMo ${n.soKyDangMo}`);
		expect(chuaToi, 'NCC được chọn phải có kỳ mở chưa tới ngày').toBeGreaterThan(0);
		expect(n.soKyCanXuLy, 'Cột "Kỳ đang gom số" đếm cả kỳ chưa tới ngày bắt đầu').toBe(daToi);
		const o = dongCua(page, tenNcc(n)).locator('td').nth(3);
		await expect(o).toHaveText(String(n.soKyCanXuLy));
		await o.locator('.ant-tag, span').first().hover();
		await expect(page.locator('.ant-tooltip:not(.ant-tooltip-hidden)').last()).toHaveText(`Còn ${n.soKyDangMo - n.soKyCanXuLy} kỳ chưa tới ngày bắt đầu`);
	});

	test('16_020_008 — Khối kỳ bung sẵn dưới nhà cung cấp còn việc', async ({ page }) => {
		chanNeuTat('16_020_008');
		const { ncc } = await moMan(page);
		const n = ncc.find((x) => (x.kyDangGomSo || []).length > 0);
		expect(n, 'Không NCC nào còn kỳ phải xử lý').toBeTruthy();
		const khoi = await bung(page, tenNcc(n));
		const dongKy = khoi.locator('.divide-y > div');
		await expect(dongKy).toHaveCount(n.kyDangGomSo.length);
		for (let i = 0; i < n.kyDangGomSo.length; i++) {
			const ky = n.kyDangGomSo[i];
			const t = chuan(await dongKy.nth(i).innerText());
			for (const phan of [khoang(ky), `${CHU_KY[ky.cycleType] || ky.cycleType} · ${soNgay(ky)} ngày`, loaiKy(ky), ky.orgUnitCode, TRANG_THAI[ky.status] || ky.status]) {
				expect(t, `Dòng kỳ ${ky.id} thiếu "${phan}"`).toContain(phan);
			}
		}
		ghi(`${n.chainSupplierName}: ${n.kyDangGomSo.length} kỳ bung sẵn`);
	});

	test('16_020_009 — Xem tất cả các kỳ của một nhà cung cấp', async ({ page }) => {
		chanNeuTat('16_020_009');
		const { ncc } = await moMan(page);
		const n = ncc.filter((x) => (x.soKy ?? 0) >= 3).sort((a, b) => b.soKy - a.soKy)[0];
		expect(n, 'Không NCC nào có ≥ 3 kỳ').toBeTruthy();
		const { dr, ds, total } = await moDrawerKy(page, n);
		expect(total, `Drawer không liệt kê đủ ${n.soKy} kỳ của NCC`).toBe(n.soKy);
		await expect(dr).toContainText(tenNcc(n));
		const cot = (await dr.locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		expect(cot.filter(Boolean)).toEqual(['Kỳ', 'Chu kỳ', 'Loại kỳ', 'Đơn vị', 'Trạng thái', 'Chốt lúc']);
		expect(cot.length, 'Thiếu cột nút (không tiêu đề)').toBe(7);
		for (const ky of ds.slice(0, 20)) expect(ky.chainSupplierId, `Drawer lẫn kỳ của NCC khác (kỳ ${ky.id})`).toBe(n.chainSupplierId);
		ghi(`${n.chainSupplierName}: ${total} kỳ`);
	});

	test('16_020_010 — Cột Loại kỳ phân biệt đúng ba loại', async ({ page }) => {
		chanNeuTat('16_020_010');
		const { ncc, st } = await moMan(page);
		const ky = await tatCaKy(page, st);
		const theoNcc = (id) => new Set(ky.filter((x) => x.chainSupplierId === id).map(loaiKy));
		const n = ncc.find((x) => theoNcc(x.chainSupplierId).size === 3) || ncc.sort((a, b) => theoNcc(b.chainSupplierId).size - theoNcc(a.chainSupplierId).size)[0];
		const loai = theoNcc(n.chainSupplierId);
		ghi(`${n.chainSupplierName}: ${[...loai].join(', ')} · toàn chuỗi: ${[...new Set(ky.map(loaiKy))].join(', ')}`);
		test.skip(new Set(ky.map(loaiKy)).size < 3, 'Chuỗi chưa có đủ ba loại kỳ (thường / đầu cắt cụt / tất toán).');
		const { dr, ds } = await moDrawerKy(page, n);
		const nhan = (await dr.locator('.ant-table-tbody tr.ant-table-row td:nth-child(3)').allInnerTexts()).map(chuan);
		expect(nhan).toEqual(ds.slice(0, 20).map(loaiKy));
		for (const x of nhan) expect(['Kỳ thường', 'Kỳ đầu (cắt cụt)', 'Kỳ tất toán']).toContain(x);
	});

	test('16_020_012 — Cột Chu kỳ của kỳ tất toán chép từ hợp đồng nên gây nhầm', async ({ page }) => {
		chanNeuTat('16_020_012');
		const { ncc, st } = await moMan(page);
		const DANH_NGHIA = { WEEK: [7, 7], MONTH: [28, 31], QUARTER: [89, 92] };
		const lech = (x) => { const d = soNgay(x); const r = DANH_NGHIA[x.cycleType]; return r && (d < r[0] || d > r[1]); };
		const ky = (await tatCaKy(page, st)).filter((x) => x.settlement);
		expect(ky.length, 'Chuỗi chưa có kỳ tất toán').toBeGreaterThan(0);
		ghi(`Kỳ tất toán: ${ky.map((x) => `${x.id}:${x.cycleType}/${soNgay(x)} ngày`).join(', ')}`);
		const tt = ky.find(lech);
		test.skip(!tt, 'Mọi kỳ tất toán đều dài đúng như chu kỳ hợp đồng — không có kỳ nào để thấy chỗ gây nhầm.');
		const n = ncc.find((x) => x.chainSupplierId === tt.chainSupplierId);
		const { dr, ds } = await moDrawerKy(page, n);
		const i = ds.findIndex((x) => x.id === tt.id);
		test.skip(i < 0 || i >= 20, `Kỳ tất toán ${tt.id} không nằm ở trang đầu Drawer`);
		const r = dr.locator('.ant-table-tbody tr.ant-table-row').nth(i);
		await expect(r.locator('td').nth(1)).toHaveText(CHU_KY[tt.cycleType]);
		await expect(r.locator('td').nth(2)).toHaveText('Kỳ tất toán');
		const dai = soNgay(tt);
		ghi(`Kỳ tất toán ${tt.id}: Chu kỳ "${CHU_KY[tt.cycleType]}" nhưng dài ${dai} ngày (${khoang(tt)})`);
		// Số ngày thật chỉ đọc được ở khối bung (Drawer không có) — kỳ tất toán phải hiện ở đó nếu NCC còn việc.
		await page.keyboard.press('Escape');
		await expect(dr).toBeHidden();
		if ((n.kyDangGomSo || []).some((x) => x.id === tt.id)) {
			const khoi = await bung(page, tenNcc(n));
			const d = khoi.locator('.divide-y > div').filter({ hasText: khoang(tt) });
			await expect(d).toContainText(`${CHU_KY[tt.cycleType]} · ${dai} ngày`);
			await expect(d).toContainText('Kỳ tất toán');
		}
	});

	test('16_020_013 — Nút Hoá đơn NCC chỉ hiện trên kỳ đã chốt hoặc đã ghi nợ', async ({ page }) => {
		chanNeuTat('16_020_013');
		const { ncc } = await moMan(page);
		const n = ncc.find((x) => (x.kyDangGomSo || []).some((y) => DA_CHOT.includes(y.status)) && (x.kyDangGomSo || []).some((y) => y.status === 'OPEN'));
		expect(n, 'Không NCC nào có cả kỳ Đang gom số lẫn kỳ đã chốt trong khối bung').toBeTruthy();
		const khoi = await bung(page, tenNcc(n));
		const dongKy = khoi.locator('.divide-y > div');
		for (let i = 0; i < n.kyDangGomSo.length; i++) {
			const ky = n.kyDangGomSo[i];
			const nut = (await dongKy.nth(i).getByRole('button').allInnerTexts()).map(chuan);
			expect(nut, `Kỳ ${ky.id} (${ky.status})`).toEqual(DA_CHOT.includes(ky.status) ? ['Hoá đơn NCC', 'Chi tiết'] : ['Chi tiết']);
		}
		// Bấm "Hoá đơn NCC" mở thẳng thẻ hoá đơn của kỳ.
		const iChot = n.kyDangGomSo.findIndex((y) => DA_CHOT.includes(y.status));
		await dongKy.nth(iChot).getByRole('button', { name: 'Hoá đơn NCC' }).click();
		await expect(page).toHaveURL(new RegExp(`${ROUTE}/${n.kyDangGomSo[iChot].id}\\?tab=invoice`));
		await expect(page.locator('.ant-tabs-tab-active')).toContainText('Hoá đơn NCC', { timeout: 30_000 });
	});
});
