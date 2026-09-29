'use strict';

/**
 * Phân hệ 16 · 060 — Báo cáo hàng ký gửi (`/report/consignment`), vai `tct`. Chỉ ĐỌC.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/consignmentReport/ConsignmentReport.jsx` + `components/*`
 * (FilterPanel · NxtTable · SalesTable · TurnoverTable · Dashboard · ShopDrawer · ReconcileCheckPanel · ReportMetaBanner ·
 * priceCells) · `services/consignmentReportApi.js` (report-service, prefix `/report`).
 * 🔴 Vai `tct` thay `province`: đo 25/09/2026 làn 7 — tỉnh / điểm bán ra 0 dòng ở cả 4 thẻ (đúng phạm vi); mọi dữ liệu ký
 *    gửi của chuỗi nằm ở TCT (NXT 81 dòng năm 2026, 36 kỳ). Case phạm vi / validate không cần dữ liệu: `bao-cao.province`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const ROUTE = '/report/consignment';
const API = '/report/consignment-report';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const dmy = (iso) => iso.split('-').reverse().join('/');
const so = (s) => Number(String(s).replace(/\./g, '').replace(',', '.'));

let st = null;
let chainId = null;
test.describe.configure({ timeout: 240_000 });

/** Mở màn, chờ lượt tải NXT mặc định. Trả response NXT đầu tiên. */
async function moMan(page) {
	st = k.batHeader(page);
	const cho = page.waitForResponse((r) => r.url().includes(`${API}/nxt`) && r.request().method() === 'GET', { timeout: 90_000 });
	await moTrang(page, ROUTE, VAI);
	const res = await cho;
	chainId = new URL(res.url()).searchParams.get('chainId');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	await expect(khung(page).getByRole('button', { name: /Xem báo cáo/ })).toBeVisible();
	return res.json();
}
const goi = (u, x = {}) => k.goiGhi(khungPage, st, 'GET', `${API}/${u}`, { chainId, ...x });
let khungPage = null;
test.beforeEach(({ page }) => {
	khungPage = page;
});

const tab = (page, ten) => khung(page).locator('.ant-tabs-tab').filter({ hasText: ten });
const bang = (page) => khung(page).locator('.ant-tabs-tabpane-active .ant-table').first();
const dongBang = (page) => bang(page).locator('.ant-table-tbody tr.ant-table-row');
const cot = async (page) => (await bang(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);

/** Bấm "Xem báo cáo" (hoặc hành động `fn`), chờ response của endpoint `duong`. */
async function cho(page, duong, fn) {
	const w = page.waitForResponse((r) => r.url().includes(`${API}/${duong}`) && r.request().method() === 'GET', { timeout: 60_000 });
	await fn();
	const res = await w;
	return { url: new URL(res.url()), body: await res.json() };
}
const xem = (page, duong = 'nxt') => cho(page, duong, () => khung(page).getByRole('button', { name: /Xem báo cáo/ }).click());

/** Đặt khoảng ngày bằng tay (RangePicker, định dạng DD/MM/YYYY). */
async function datKhoang(page, tu, den) {
	const o = khung(page).locator('.ant-picker-range input');
	await o.nth(0).click();
	await o.nth(0).press('ControlOrMeta+a');
	await o.nth(0).fill(tu);
	await o.nth(0).press('Enter');
	await o.nth(1).press('ControlOrMeta+a');
	await o.nth(1).fill(den);
	await o.nth(1).press('Enter');
	await page.locator('.ant-page-header-heading-title').first().click();
}
const khoangHienTai = async (page) => khung(page).locator('.ant-picker-range input').evaluateAll((l) => l.map((e) => e.value));

/** Chọn kỳ ở ô "Theo kỳ đối soát". */
async function chonKy(page, ky) {
	const o = khung(page).locator('.ant-select').first();
	await o.click();
	await o.locator('input').fill(ky.label.slice(0, 20));
	await page.locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${ky.label}"]`).click();
	await expect(o).toContainText(ky.label.slice(0, 15));
}

/** Kỳ + kết quả đối chiếu (API), cache theo worker. */
let _ky = null;
async function khoKy() {
	if (_ky) return _ky;
	const ds = (await goi('periods')).data || [];
	for (const p of ds) {
		const r = (await goi('reconcile-check', { fromDate: p.periodFrom, toDate: p.periodTo, supplierId: p.chainSupplierId })).data || {};
		p.kq = r.unavailableReason ? 'CHUA' : r.matched ? 'KHOP' : 'LECH';
		p.r = r;
	}
	_ky = ds;
	return ds;
}

test('16_060_003 — Báo cáo có đúng bốn thẻ', async ({ page }) => {
	chanNeuTat('16_060_003');
	const b = await moMan(page);
	expect(b?.page?.total_elements, 'TCT không có dòng NXT nào trong tháng hiện tại').toBeGreaterThan(0);
	const t = (await khung(page).locator('.ant-tabs-tab').allInnerTexts()).map(chuan);
	expect(t).toEqual(['Nhập - Xuất - Tồn', 'Sản lượng bán', 'Hiệu suất hàng hoá', 'Tồn theo NCC / đơn vị']);
});

test('16_060_004 — Chọn Theo kỳ đối soát tự đặt đúng biên kỳ', async ({ page }) => {
	chanNeuTat('16_060_004');
	await moMan(page);
	const ky = (await khoKy()).find((p) => !p.periodFrom.endsWith('-01')) || (await khoKy())[0];
	await chonKy(page, ky);
	expect(await khoangHienTai(page)).toEqual([dmy(ky.periodFrom), dmy(ky.periodTo)]);
	const { url } = await xem(page);
	ghi(`kỳ ${ky.id} ${ky.label} ⇒ ${url.search}`);
	expect(url.searchParams.get('fromDate')).toBe(ky.periodFrom);
	expect(url.searchParams.get('toDate')).toBe(ky.periodTo);
	expect(url.searchParams.get('supplierId'), 'Báo cáo không khoá theo NCC của kỳ').toBe(String(ky.chainSupplierId));
});

test('16_060_005 — Sửa khoảng thời gian tay thì bỏ chọn kỳ', async ({ page }) => {
	chanNeuTat('16_060_005');
	await moMan(page);
	const ky = (await khoKy())[0];
	await chonKy(page, ky);
	await expect(khung(page).getByRole('button', { name: 'Đối chiếu với màn Đối soát kỳ' })).toBeVisible();
	await datKhoang(page, '01/09/2026', '20/09/2026');
	await expect(khung(page).getByRole('button', { name: 'Đối chiếu với màn Đối soát kỳ' })).toHaveCount(0);
	await expect(khung(page).locator('.ant-select').first()).toContainText('Tự chọn khoảng ngày');
});

test('16_060_008 — Chọn Bưu điện xã thì chỉ được tối đa một Bưu điện tỉnh', async ({ page }) => {
	chanNeuTat('16_060_008');
	await moMan(page);
	// Tiền đề: chọn được Bưu điện xã + 2 Bưu điện tỉnh ở ô "Phạm vi tổ chức" (SelectShopMultiple mở drawer cây đơn vị).
	await khung(page).locator('.flex.flex-col').filter({ hasText: 'Phạm vi tổ chức' }).locator('.ant-select').first().click();
	const dr = page.locator('.ant-drawer-open').last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	const tieuDe = chuan(await dr.locator('.ant-drawer-title').innerText());
	ghi(`drawer phạm vi: "${tieuDe}"`);
	// 🔴 ConsignmentFilterPanel KHÔNG truyền allowOrgUnitSelect ⇒ drawer "Chọn Điểm bán / Kho", chỉ tick được điểm bán ⇒
	//    provinceCodes / wardCodes không bao giờ có giá trị ⇒ lọc theo tỉnh/xã không dùng được, cảnh báo của case là code chết.
	expect(tieuDe, 'Ô "Phạm vi tổ chức" không cho chọn Bưu điện tỉnh / xã (thiếu allowOrgUnitSelect) — không tạo được tiền đề, và báo cáo không lọc được theo đơn vị').toContain('Đơn vị');
});

test('16_060_010 — Lọc thêm bằng nhóm hàng và mã hàng', async ({ page }) => {
	chanNeuTat('16_060_010');
	const b0 = await moMan(page);
	const mau = (b0.data || [])[0];
	expect(mau, 'Không có dòng NXT để lấy mã hàng').toBeTruthy();
	// Nhóm hàng của mặt hàng mẫu (danh mục chuỗi).
	const info = (await k.goiGhi(page, st, 'GET', `/chain/products/${mau.productId}/info`, {}))?.data || {};
	const cat = { categoryId: info.categoryId ?? info.category?.id ?? info.categoryIds?.[0], categoryName: info.categoryName ?? info.category?.name };
	ghi(`info: ${JSON.stringify(info).match(/"categor[^,]*/gi)}`);
	ghi(`mẫu ${mau.sku} ${mau.productName} · nhóm ${cat?.categoryName} (${cat?.categoryId})`);
	test.skip(!cat?.categoryId, `Không tra được nhóm hàng của ${mau.sku} qua danh mục chuỗi.`);
	await khung(page).getByPlaceholder('Tất cả').fill(mau.sku);
	const tree = khung(page).locator('.flex.flex-col').filter({ hasText: 'Nhóm hàng' }).locator('.ant-select').first();
	// Cây danh mục có nhiều nút TRÙNG TÊN ở các nhánh khác nhau ⇒ thử lần lượt tới khi request mang đúng categoryId.
	let url;
	let body;
	for (let i = 0; i < 6; i++) {
		await tree.click();
		await tree.locator('input').fill(cat.categoryName);
		const nut = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-tree-title').filter({ hasText: new RegExp(`^${cat.categoryName}$`) });
		if (i >= (await nut.count())) break;
		await nut.nth(i).click();
		({ url, body } = await xem(page));
		if (url.searchParams.get('categoryId') === String(cat.categoryId)) break;
	}
	ghi(`${url.search} ⇒ ${body?.page?.total_elements} dòng`);
	expect(url.searchParams.get('keyword')).toBe(mau.sku);
	expect(url.searchParams.get('categoryId')).toBe(String(cat.categoryId));
	expect((body.data || []).length, 'Lọc cả nhóm + mã hàng của chính mặt hàng đó mà ra rỗng').toBeGreaterThan(0);
	for (const r of body.data) expect(`${r.sku} ${r.productName}`).toContain(mau.sku);
});

test('16_060_011 — Thẻ Nhập - Xuất - Tồn tách rõ từng loại nhập xuất', async ({ page }) => {
	chanNeuTat('16_060_011');
	const b = await moMan(page);
	const c = await cot(page);
	for (const n of ['Mua NCC', 'Khách trả', 'Bán (phải trả NCC)', 'Hàng tặng', 'Trả NCC', 'Huỷ/hỏng']) expect(c, `Thiếu cột "${n}"`).toContain(n);
	expect(c.filter((x) => x === 'Điều chuyển').length, 'Phải có "Điều chuyển" ở cả nhập lẫn xuất').toBe(2);
	const khoa = (b.data || []).map((r) => `${r.shopId}|${r.sku}|${r.unitId}`);
	expect(khoa.length).toBeGreaterThan(0);
	expect(new Set(khoa).size, 'Có mặt hàng lặp nhiều dòng trong cùng điểm bán').toBe(khoa.length);
});

test('16_060_012 — Thẻ Sản lượng bán hiện bán thuần', async ({ page }) => {
	chanNeuTat('16_060_012');
	await moMan(page);
	await datKhoang(page, '01/01/2026', '25/09/2026');
	const { body } = await cho(page, 'sales-volume', () => tab(page, 'Sản lượng bán').click());
	const ds = body.data || [];
	expect(ds.length, 'Không có dòng bán nào năm 2026').toBeGreaterThan(0);
	for (const r of ds) expect(Number(r.netSoldQty), `${r.sku}: bán thuần ≠ xuất bán − khách trả`).toBe(Number(r.soldQty) - Number(r.returnedQty));
	const c = await cot(page);
	for (const n of ['Xuất bán', 'Khách trả', 'Bán thuần']) expect(c).toContain(n);
});

test('16_060_013 — Thẻ Hiệu suất hàng hoá hiện vòng quay và xếp loại', async ({ page }) => {
	chanNeuTat('16_060_013');
	await moMan(page);
	const { body } = await cho(page, 'turnover', () => tab(page, 'Hiệu suất hàng hoá').click());
	expect((body.data || []).length).toBeGreaterThan(0);
	const c = await cot(page);
	for (const n of ['Vòng quay', 'Số ngày tồn (DIO)', 'Xếp loại']) expect(c).toContain(n);
	const i = c.indexOf('Xếp loại');
	const nhan = await dongBang(page).evaluateAll((rs, i) => rs.map((r) => (r.children[i]?.textContent || '').trim()), i);
	for (const x of nhan) expect(['Bán chạy', 'Chậm luân chuyển', 'Bình thường', 'Không phát sinh']).toContain(x.normalize('NFC'));
});

test('16_060_014 — Đổi ngưỡng xếp loại đổi kết quả phân nhãn', async ({ page }) => {
	chanNeuTat('16_060_014');
	await moMan(page);
	await datKhoang(page, '01/01/2026', '25/09/2026');
	const a = await cho(page, 'turnover', () => tab(page, 'Hiệu suất hàng hoá').click());
	const o = khung(page).locator('.ant-tabs-tabpane-active .ant-input-number-input');
	await o.nth(0).fill('100');
	await o.nth(1).fill('1');
	await o.nth(1).press('Tab');
	const b = await xem(page, 'turnover');
	ghi(`lượt 2: ${b.url.search}`);
	expect(b.url.searchParams.get('topPercent')).toBe('100');
	expect(b.url.searchParams.get('slowDioDays')).toBe('1');
	const nhan = (x) => Object.fromEntries((x.body.data || []).map((r) => [`${r.shopId}|${r.sku}`, r.performance]));
	const n1 = nhan(a);
	const n2 = nhan(b);
	const doi = Object.keys(n2).filter((kk) => n1[kk] && n1[kk] !== n2[kk]);
	ghi(`đổi nhãn ${doi.length}/${Object.keys(n2).length}: ${doi.slice(0, 5).map((kk) => `${kk} ${n1[kk]}→${n2[kk]}`).join(', ')}`);
	expect(doi.length, 'Đổi ngưỡng (top 100%, DIO ≥ 1) mà không mặt hàng nào đổi xếp loại').toBeGreaterThan(0);
});

test('16_060_015 — Vòng quay hiện gạch ngang khi tồn bình quân bằng 0', async ({ page }) => {
	chanNeuTat('16_060_015');
	await moMan(page);
	await datKhoang(page, '01/01/2026', '25/09/2026');
	const { body } = await cho(page, 'turnover', () => tab(page, 'Hiệu suất hàng hoá').click());
	const i = (body.data || []).findIndex((r) => Number(r.avgInvQty) === 0);
	test.skip(i < 0, 'Trang đầu thẻ Hiệu suất không có mặt hàng tồn bình quân = 0.');
	const c = await cot(page);
	const o = chuan(await dongBang(page).nth(i).locator('td').nth(c.indexOf('Vòng quay')).innerText());
	ghi(`${body.data[i].sku}: avgInvQty=0, turnoverQty=${body.data[i].turnoverQty} ⇒ ô "${o}"`);
	expect(o).toBe('—');
});

test('16_060_016 — Ô tiền trống kèm nhãn nghĩa là chưa khai giá', async ({ page }) => {
	chanNeuTat('16_060_016');
	const b = await moMan(page);
	const i = (b.data || []).findIndex((r) => r.priceCoveragePercent == null || Number(r.priceCoveragePercent) === 0);
	test.skip(i < 0, 'Trang đầu NXT không có mặt hàng chưa định giá.');
	const c = await cot(page);
	const o = chuan(await dongBang(page).nth(i).locator('td').nth(c.indexOf('Giá trị')).innerText());
	ghi(`${b.data[i].sku}: priceCoverage=${b.data[i].priceCoveragePercent}, openVal=${b.data[i].openVal} ⇒ "${o}"`);
	expect(o).toBe('chưa định giá');
	expect(o).not.toMatch(/^0/);
});

test('16_060_017 — Bung tồn theo cây đơn vị tới điểm bán', async ({ page }) => {
	chanNeuTat('16_060_017');
	await moMan(page);
	await tab(page, 'Tồn theo NCC / đơn vị').click();
	const { body } = await cho(page, 'dashboard', () => khung(page).locator('.ant-radio-button-wrapper').filter({ hasText: 'Đơn vị tổ chức' }).click());
	const tinh = (body.data?.items || []).filter((r) => r.groupBy === 'PROVINCE');
	expect(tinh.length, 'Không có dòng cấp tỉnh').toBeGreaterThan(0);
	const t = tinh.find((x) => (x.children || []).length) || tinh[0];
	const tong = (ds, f) => ds.reduce((s, r) => s + Number(r[f] || 0), 0);
	ghi(`tỉnh ${t.provinceCode}: close=${t.closeQty}, Σxã=${tong(t.children || [], 'closeQty')} (${(t.children || []).length} xã)`);
	expect(Number(t.closeQty)).toBe(tong(t.children || [], 'closeQty'));
	// Bung tỉnh, bấm "Xem điểm bán" trên xã đầu tiên.
	await dongBang(page).filter({ hasText: t.provinceName || t.provinceCode }).first().locator('.ant-table-row-expand-icon').click();
	const x = t.children[0];
	const r = await cho(page, 'dashboard', () => dongBang(page).filter({ hasText: x.wardCode }).first().getByRole('button', { name: 'Xem điểm bán' }).click());
	const shop = r.body.data?.items || [];
	ghi(`xã ${x.wardCode}: close=${x.closeQty}, Σđiểm bán=${tong(shop, 'closeQty')} (${shop.length})`);
	expect(r.url.searchParams.get('groupBy')).toBe('SHOP');
	expect(shop.length).toBeGreaterThan(0);
	expect(Number(x.closeQty)).toBe(tong(shop, 'closeQty'));
	await expect(page.locator('.ant-drawer-open .ant-table-tbody tr.ant-table-row').first()).toBeVisible();
});

test('16_060_018 — Cột Tồn quá hạn trả cảnh báo mất quyền trả hàng', async ({ page }) => {
	chanNeuTat('16_060_018');
	await moMan(page);
	const { body } = await cho(page, 'dashboard', () => tab(page, 'Tồn theo NCC / đơn vị').click());
	expect(await cot(page)).toContain('Tồn quá hạn trả');
	const ds = body.data?.items || [];
	const i = ds.findIndex((r) => Number(r.overdueQty) > 0);
	ghi(`overdueQty: ${ds.map((r) => `${r.supplierName}=${r.overdueQty}`).join(', ')}`);
	test.skip(i < 0, 'Cột có, nhưng không NCC nào còn tồn quá hạn trả (hợp đồng làn chưa khai hạn / chưa quá hạn).');
	const o = dongBang(page).nth(i).locator('td').nth((await cot(page)).indexOf('Tồn quá hạn trả'));
	await expect(o.locator('.text-red-500')).toHaveText(Number(ds[i].overdueQty).toLocaleString('vi-VN'));
});

/** Chọn kỳ có kết quả `loai`, bấm Đối chiếu, trả panel. */
async function doiChieu(page, loc, moTa) {
	await moMan(page);
	const ky = (await khoKy()).find(loc);
	test.skip(!ky, `Không kỳ nào ${moTa} (36 kỳ: ${JSON.stringify((await khoKy()).reduce((a, p) => ({ ...a, [p.kq]: (a[p.kq] || 0) + 1 }), {}))}).`);
	await chonKy(page, ky);
	await cho(page, 'reconcile-check', () => khung(page).getByRole('button', { name: 'Đối chiếu với màn Đối soát kỳ' }).click());
	ghi(`kỳ ${ky.id} ${ky.label} (${ky.status}) ⇒ ${ky.kq} ${JSON.stringify(ky.r).slice(0, 300)}`);
	return { ky, alert: khung(page).locator('.ant-alert').filter({ hasText: /Khớp|Lệch|Chưa đối chiếu/ }).first() };
}

test('16_060_019 — Đối chiếu báo cáo với màn Đối soát kỳ khi KHỚP', async ({ page }) => {
	chanNeuTat('16_060_019');
	// Kỳ ĐÃ CHỐT có bán ra — "Khớp" trên kỳ 0/0 không chứng minh gì (pass rỗng).
	const { ky, alert } = await doiChieu(page, (p) => p.status !== 'OPEN' && (Number(p.r.podTotalSoldQty ?? p.r.dwTotalSoldQty ?? 0) > 0 || p.kq === 'LECH'), 'đã chốt có bán ra');
	await expect(alert).toBeVisible();
	expect(ky.kq, `Kỳ đã chốt ${ky.label} đối chiếu ra ${ky.kq}: ${JSON.stringify(ky.r).slice(0, 200)}`).toBe('KHOP');
	await expect(alert).toContainText('Khớp');
});

test('16_060_020 — Đối chiếu ra LỆCH thì liệt kê từng mặt hàng', async ({ page }) => {
	chanNeuTat('16_060_020');
	const { ky, alert } = await doiChieu(page, (p) => p.kq === 'LECH', 'đối chiếu LỆCH');
	await expect(alert).toContainText('Lệch');
	await expect(alert).toContainText('đơn vị giữa báo cáo và màn đối soát');
	const t = khung(page).locator('.ant-table').filter({ has: page.locator('th', { hasText: 'Số báo cáo (DW)' }) }).first();
	expect((await t.locator('thead th').allInnerTexts()).map(chuan)).toEqual(['Mã hàng', 'Tên hàng', 'Số báo cáo (DW)', 'Số đối soát (MySQL)', 'Chênh lệch']);
	expect(await t.locator('tbody tr.ant-table-row').count(), 'Lệch mà không liệt kê mặt hàng nào').toBeGreaterThan(0);
	test.info().annotations.push({ type: '🔴 dữ liệu', description: `Mọi kỳ có bán đều LỆCH: DW = ${ky.r.dwTotalSoldQty}, chênh ${ky.r.diffQty} — kho báo cáo thiếu giao dịch bán ký gửi (xem báo cáo).` });
});

test('16_060_021 — Kết quả Chưa đối chiếu được khác hẳn Khớp', async ({ page }) => {
	chanNeuTat('16_060_021');
	const { alert } = await doiChieu(page, (p) => p.kq === 'CHUA', 'trả "Chưa đối chiếu được"');
	await expect(alert).toContainText('Chưa đối chiếu được');
	await expect(alert).toHaveClass(/ant-alert-warning/);
});

test('16_060_022 — Số báo cáo có độ trễ so với biên bản', async () => {
	chanNeuTat('16_060_022');
	test.skip(true, 'Cần bán một đơn hàng ký gửi rồi mở ngay báo cáo: làn 7 không có điểm bán nào có hàng ký gửi (dữ liệu ký gửi của chuỗi ở điểm bán thật 11265 — cấm bán thử). Muốn phủ ⇒ seed hợp đồng + nhập hàng ký gửi cho điểm bán làn 7.');
});

test('16_060_023 — Xuất Excel chỉ dùng được ở thẻ Nhập - Xuất - Tồn', async ({ page }) => {
	chanNeuTat('16_060_023');
	await moMan(page);
	const nut = khung(page).getByRole('button', { name: /Xuất Excel/ });
	await expect(nut).toBeEnabled();
	for (const t of ['Sản lượng bán', 'Hiệu suất hàng hoá', 'Tồn theo NCC / đơn vị']) {
		await tab(page, t).click();
		await expect(nut, `Nút Xuất Excel vẫn bật ở thẻ "${t}"`).toBeDisabled();
	}
	await tab(page, 'Nhập - Xuất - Tồn').click();
	await expect(nut).toBeEnabled();
});

test('16_060_024 — Xuất Excel tải được tệp khớp số dòng', async ({ page }) => {
	chanNeuTat('16_060_024');
	const b = await moMan(page);
	const tong = b.page.total_elements;
	const dl = page.waitForEvent('download', { timeout: 90_000 });
	await khung(page).getByRole('button', { name: /Xuất Excel/ }).click();
	const f = await (await dl).path();
	const ExcelJS = require('exceljs');
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.readFile(f);
	const ws = wb.worksheets[0];
	// Dòng dữ liệu = dòng có ô mã hàng trùng một SKU trong báo cáo.
	let dong = 0;
	ws.eachRow((r) => {
		if (r.values.some((v) => typeof v === 'string' && /^\S+$/.test(v) && v.length >= 4 && (b.data || []).some((x) => x.sku === v))) dong++;
	});
	ghi(`tệp ${ws.rowCount} dòng Excel, ${ws.actualRowCount} có dữ liệu · khớp SKU trang đầu ${dong} · tổng báo cáo ${tong}`);
	expect(ws.actualRowCount, 'Tệp Excel rỗng').toBeGreaterThan(1);
	expect(ws.actualRowCount, `Số dòng tệp (${ws.actualRowCount}) ít hơn tổng báo cáo (${tong})`).toBeGreaterThanOrEqual(tong);
	expect(ws.actualRowCount, `Tệp có quá nhiều dòng so với ${tong} dòng báo cáo (tối đa 5 dòng tiêu đề/tổng)`).toBeLessThanOrEqual(tong + 5);
});

test('16_060_025 — Xuất Excel thất bại hiện thông báo backend', async ({ page }) => {
	chanNeuTat('16_060_025');
	await moMan(page);
	let lan = 0;
	await page.route(/consignment-report\/nxt\/export/, (r) => {
		lan++;
		const body = lan === 1 ? { status: { code: 'SSHOP-400', message: 'Khoảng thời gian vượt quá 12 tháng' } } : { status: { code: 'SSHOP-500' } };
		return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(body) });
	});
	const tb = async () => {
		await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
		await khung(page).getByRole('button', { name: /Xuất Excel/ }).click();
		await page.locator('.ant-message-notice').first().waitFor({ timeout: 10_000 });
		return chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
	};
	const t1 = await tb();
	const t2 = await tb();
	ghi(`có chuỗi BE: "${t1}" · không chuỗi: "${t2}"`);
	expect(t1, 'FE không hiện chuỗi lỗi của BE (responseHandler blob làm mất JSON lỗi?)').toContain('Khoảng thời gian vượt quá 12 tháng');
	expect(t2).toContain('Không xuất được file Excel');
});

test('16_060_026 — Báo cáo gọi đúng service prefix /report', async ({ page }) => {
	chanNeuTat('16_060_026');
	await moMan(page);
	await datKhoang(page, '01/08/2026', '31/08/2026');
	const { url, body } = await xem(page);
	ghi(`${url.pathname}${url.search} ⇒ ${body?.status?.code} · ${body?.page?.total_elements} dòng`);
	expect(url.pathname).toMatch(/\/report\/consignment-report\/nxt$/);
	expect(String(body?.status?.code)).toBe('200');
	expect(url.searchParams.get('fromDate')).toBe('2026-08-01');
	expect(url.searchParams.get('toDate')).toBe('2026-08-31');
	expect(await khoangHienTai(page)).toEqual(['01/08/2026', '31/08/2026']);
});

test('16_060_028 — Kỳ không trùng đầu tháng nên gõ tay dễ lệch biên kỳ', async ({ page }) => {
	chanNeuTat('16_060_028');
	await moMan(page);
	const ds = await khoKy();
	// Kỳ lệch biên tháng + có phát sinh để hai tổng có thể khác nhau.
	const cands = ds.filter((p) => !p.periodFrom.endsWith('-01'));
	test.skip(!cands.length, 'Mọi kỳ đều bắt đầu ngày 01.');
	const tongBan = async (tu, den, sup) => ((await goi('nxt', { fromDate: tu, toDate: den, supplierId: sup, page: 0, size: 500 })).data || []).reduce((s, r) => s + Number(r.outSaleQty || 0) + Number(r.inQty || 0), 0);
	let chon = null;
	const da = [];
	for (const p of cands) {
		const [y, m] = p.periodTo.split('-');
		const cuoi = new Date(Number(y), Number(m), 0).getDate();
		const a = await tongBan(p.periodFrom, p.periodTo, p.chainSupplierId);
		const b = await tongBan(`${y}-${m}-01`, `${y}-${m}-${cuoi}`, p.chainSupplierId);
		da.push(`${p.id}:${a}/${b}`);
		if (a !== b) {
			chon = { p, a, b, thang: `${y}-${m}` };
			break;
		}
	}
	ghi(`đã so (kỳ:tổng theo kỳ/tổng theo tháng): ${da.join(', ')}`);
	if (chon) ghi(`kỳ ${chon.p.label}: tổng theo kỳ ${chon.a} · gõ tay tháng ${chon.thang} ${chon.b}`);
	test.skip(!chon, `Mọi kỳ lệch biên tháng đều cho cùng tổng khi gõ tay theo tháng (${da.length} kỳ) — ngày biên chưa có phát sinh nên chưa phơi được hệ quả.`);
	// Giao diện: chọn kỳ ⇒ khoảng ngày đúng biên kỳ, KHÁC khoảng gõ tay theo tháng.
	await chonKy(page, chon.p);
	expect(await khoangHienTai(page)).toEqual([dmy(chon.p.periodFrom), dmy(chon.p.periodTo)]);
});
