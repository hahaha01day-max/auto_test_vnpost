'use strict';

/**
 * 29 · Bổ sung vai `province` (Quản lý tỉnh làn — phạm vi AUTO<làn>_T, chỉ điểm bán rác của làn).
 * Ghi: 010_002 / 110_002 / 120_002 bấm "Tổng hợp…" (chạy lại job tổng hợp — dựng lại bảng báo cáo, không đổi nghiệp vụ);
 * 040_001 / 210_016 / 210_017 bấm "Chốt" với phạm vi TỈNH LÀN (🔴 chốt KHÔNG mở lại được — chỉ đụng điểm bán rác; tháng hiện tại
 * bị FE khoá, điểm bán làn có tồn đầu kỳ từ 09/2026 ⇒ chốt 08/2026 bị BE xếp "Chưa thể chốt").
 * Trace: xem đầu `bo-sung.tct.spec.js` + `features/inventory/nxt/*`, `features/inventory/expiry/*`, `features/poReconciliationReport/*`,
 * `pages/report/pages/employeeReport/index.jsx`, `features/report/pages/DynamicReportsModule.jsx`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { chuan, khung, moMan, soTu } = require('./report-page');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const thongBao = async (page, ms = 10_000) => {
	const tb = page.locator('.ant-message-notice, .ant-notification-notice');
	await tb.first().waitFor({ state: 'visible', timeout: ms }).catch(() => null);
	return chuan((await tb.allInnerTexts()).join(' | '));
};
const chu = async (page) => chuan(await khung(page).innerText());
const layTien = (t, nhan) => soTu((t.match(new RegExp(`${nhan}[^\\d-]*(-?[\\d.,]+)`)) || [])[1]);

async function moRoute(page, route, api) {
	const cho = api ? page.waitForResponse((r) => r.url().includes(api) && r.status() !== 401, { timeout: 60_000 }).catch(() => null) : null;
	await moTrang(page, route, VAI);
	const r = cho ? await cho : null;
	await page.waitForTimeout(3_000);
	return r;
}

/** NXT: bấm thẻ + "Xem báo cáo"; trả response. */
async function nxtThe(page, the, api, vai = 'tct') {
	// Tỉnh làn chưa có biến động tháng trước ⇒ NXT đọc bằng vai TCT (dữ liệu toàn chuỗi, chỉ đọc).
	await moTrang(page, '/report/inventory-nxt', vai);
	await page.waitForTimeout(3_000);
	const t = khung(page).locator('.ant-tabs-tab', { hasText: the }).first();
	if (await t.count()) await t.locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await page.waitForTimeout(1_000);
	const cho = page.waitForResponse((r) => r.url().includes(api) && r.status() !== 401, { timeout: 60_000 });
	await khung(page).getByRole('button', { name: /Xem báo cáo/ }).first().click();
	const r = await cho;
	await page.waitForTimeout(2_000);
	return r;
}

test.describe('29 · Báo cáo — vai province', () => {
	test.describe.configure({ timeout: 240_000 });

	// ───── Doanh thu ─────
	test('29_010_002 — Tổng hợp lại báo cáo cập nhật mốc thời gian', async ({ page }) => {
		chanNeuTat('29_010_002');
		await moMan(page, 'doanhThu', VAI);
		const moc0 = (await chu(page)).match(/Thời gian tổng hợp báo cáo lần cuối:\s*([\d/]+\s*-?\s*[\d:]+|Chưa có dữ liệu)/)?.[1];
		const cho = page.waitForResponse((r) => /monthly\/rebuild/.test(r.url()), { timeout: 60_000 });
		await khung(page).getByRole('button', { name: 'Tổng hợp báo cáo tháng' }).click();
		const b = await (await cho).json().catch(() => ({}));
		const tb = await thongBao(page, 60_000);
		await page.waitForTimeout(5_000);
		const moc1 = (await chu(page)).match(/Thời gian tổng hợp báo cáo lần cuối:\s*([\d/]+\s*-?\s*[\d:]+|Chưa có dữ liệu)/)?.[1];
		ghiChu('đo', `${JSON.stringify(b?.status)} · "${tb}" · mốc ${moc0} → ${moc1}`);
		expect(tb).toContain('Tổng hợp báo cáo doanh thu thành công');
		expect(moc1, 'Mốc tổng hợp không đổi').not.toBe(moc0);
	});

	test('29_010_003 — Đổi kỳ thì mọi khối cùng đổi theo', async ({ page }) => {
		chanNeuTat('29_010_003');
		await moMan(page, 'doanhThu', VAI);
		const goi = [];
		page.on('request', (r) => { const m = r.url().match(/monthly\/(kpi|summary|province-summary|category-tree|trend|category-share|top-skus)/); if (m) goi.push(`${m[1]}:${new URL(r.url()).searchParams.get('reportMonth')}`); });
		await khung(page).locator('.ant-picker').first().click();
		const panel = page.locator('.ant-picker-dropdown:visible').last();
		await panel.locator('.ant-picker-cell-in-view').nth(Math.max(0, new Date().getMonth() - 1)).click();
		await page.waitForTimeout(6_000);
		const thang = [...new Set(goi.map((x) => x.split(':')[1]))];
		const khoi = [...new Set(goi.map((x) => x.split(':')[0]))];
		ghiChu('đo', `khối gọi lại: ${khoi.join(',')} · tháng ${thang.join(',')}`);
		expect(thang.length, 'Các khối gọi với tháng khác nhau').toBe(1);
		for (const k of ['kpi', 'category-tree', 'top-skus']) expect(khoi, `Khối "${k}" không nạp lại theo kỳ mới`).toContain(k);
	});

	test('29_020_001 — Xuất dữ liệu doanh thu ra Excel', async ({ page }) => {
		chanNeuTat('29_020_001');
		await moMan(page, 'doanhThu', VAI);
		const thang = new URL((await page.waitForResponse((r) => /monthly\/kpi/.test(r.url()), { timeout: 5_000 }).catch(() => null))?.url() ?? 'http://x/?reportMonth=').searchParams.get('reportMonth');
		// 3 nút "Xuất excel" (dropdown dữ liệu + 2 nút xuất khối ngành hàng / Top SKU) ⇒ nút dropdown.
		await khung(page).locator('button.ant-dropdown-trigger').filter({ hasText: /Xuất excel/i }).first().click();
		const tai = page.waitForEvent('download', { timeout: 60_000 });
		await page.locator('.ant-dropdown:visible').getByText('Xuất dữ liệu đang hiển thị hiện tại').click();
		const d = await tai;
		ghiChu('tệp', `${d.suggestedFilename()} (reportMonth ${thang})`);
		expect(d.suggestedFilename()).toMatch(/^bao-cao-doanh-thu-\d{2}-\d{4}\.xlsx$/);
	});

	// ───── Lãi lỗ ─────
	for (const [id, ten] of [['29_030_001', 'Bảng lãi lỗ cân từ trên xuống'], ['29_030_002', 'Kỳ không có phiếu chi thì lợi nhuận ròng bằng lợi nhuận gộp']]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			await moMan(page, 'laiLo', VAI);
			await page.waitForTimeout(3_000);
			// Đọc cột "Số tiền" của đúng dòng chỉ tiêu (🚫 regex trên chữ gộp: nhãn chứa số "(03 = 01 - 02)").
			const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
			const iTien = cot.indexOf('Số tiền');
			const tien = async (bd) => soTu((await khung(page).locator('.ant-table-tbody tr').filter({ hasText: bd }).first().locator('td').allInnerTexts())[iTien]);
			const v = {
				dt: await tien('I. TỔNG DOANH THU BÁN HÀNG'), gt: await tien('Các khoản giảm trừ doanh thu'),
				thuan: await tien('II. DOANH THU THUẦN'), gv: await tien('III. GIÁ VỐN HÀNG BÁN'),
				gop: await tien('IV. LỢI NHUẬN GỘP'), cp: await tien('V. CHI PHÍ HOẠT ĐỘNG PHÂN BỔ'), rong: await tien('VI. LỢI NHUẬN RÒNG'),
			};
			ghiChu('bảng', JSON.stringify(v));
			if (id === '29_030_001') {
				expect(v.thuan).toBe(v.dt - v.gt);
				expect(v.gop).toBe(v.thuan - v.gv);
				expect(v.rong).toBe(v.gop - v.cp);
			} else {
				test.skip(v.cp !== 0, `Kỳ đang xem CÓ chi phí (${v.cp}) — tỉnh làn không có kỳ nào không phiếu chi để đối chứng.`);
				expect(v.rong).toBe(v.gop);
			}
		});
	}

	// ───── Trị giá tồn kho + chốt ─────
	test('29_050_001 — Mỗi dòng trị giá tồn kho tự kiểm chứng được', async ({ page }) => {
		chanNeuTat('29_050_001');
		// Tỉnh làn chưa có trị giá tồn tháng trước ⇒ đọc bằng vai TCT (dữ liệu toàn chuỗi, chỉ đọc).
		await moMan(page, 'tonKho', 'tct');
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		const i = (re) => cot.findIndex((c) => re.test(c));
		const [iSl, iGia, iTong] = [i(/SL ON-HAND/i), i(/ĐƠN GIÁ VỐN BQGQ/i), i(/TỔNG GIÁ TRỊ KHO/i)];
		const dongs = khung(page).locator('.ant-table-tbody tr.ant-table-row');
		test.skip((await dongs.count()) === 0, 'Tỉnh làn chưa có dòng trị giá tồn kho ở tháng mặc định (tháng trước).');
		const loi = [];
		for (let k = 0; k < Math.min(10, await dongs.count()); k += 1) {
			const td = (await dongs.nth(k).locator('td').allInnerTexts()).map(chuan);
			// Đơn giá hiển thị đã làm tròn tới đồng ⇒ sai số cho phép ≤ |SL| × 0,5 + 1.
			const sl = Number(String(td[iSl]).replace(/\./g, '').replace(',', '.'));
			if (Math.abs(sl * soTu(td[iGia]) - soTu(td[iTong])) > Math.abs(sl) * 0.5 + 1) loi.push(td.join(' | '));
		}
		ghiChu('cột', `${cot.join(' · ')} · lệch: ${loi.length}`);
		expect(loi, 'SL × Đơn giá vốn BQGQ ≠ Tổng giá trị kho').toEqual([]);
	});

	test('29_050_002 — Đối soát trị giá tồn kho với sổ cái', async ({ page }) => {
		chanNeuTat('29_050_002');
		await moMan(page, 'tonKho', 'tct'); // có dữ liệu (tỉnh làn = 0 đ)
		const t = await chu(page);
		const tong = layTien(t, 'TỔNG TRỊ GIÁ TỒN KHO \\(HỆ THỐNG KHO\\)');
		const tk156 = layTien(t, 'SỐ DƯ TK 156');
		const lech = layTien(t, 'CHÊNH LỆCH ĐỐI SOÁT');
		ghiChu('đo', `tổng ${tong} · TK156 ${tk156} · chênh lệch ${lech}`);
		expect(t).toMatch(/TỔNG TRỊ GIÁ TỒN KHO/);
		expect(tong, 'Không có trị giá tồn kho để đối soát').toBeGreaterThan(0);
		// 🔴 Code FE gán TK156 = tổng hệ thống (dữ liệu giả, cột sổ cái bị comment) ⇒ chênh lệch luôn 0 — phải lấy từ sổ cái thật.
		expect(tk156 === tong && lech === 0, 'Số dư TK 156 chính là tổng hệ thống (không đọc sổ cái) ⇒ chênh lệch luôn 0').toBe(false);
	});

	for (const [id, ten, cach] of [
		['29_040_001', 'Chốt trị giá tồn kho theo tháng đổi trạng thái đơn vị', 'tonKho'],
		['29_210_016', 'Chốt kho với Toàn bộ phạm vi gồm cấp dưới', 'Toàn bộ phạm vi (gồm cấp dưới)'],
		['29_210_017', 'Chốt kho chỉ với đơn vị trực thuộc trực tiếp', 'Chỉ shop trực thuộc TRỰC TIẾP'],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			const ghi = [];
			page.on('response', async (r) => { if (/period-closing\/close/.test(r.url())) ghi.push(await r.json().catch(() => ({}))); });
			if (cach === 'tonKho') {
				await moMan(page, 'tonKho', VAI);
				// 🔴 User chốt 28/09/2026: "Chốt tồn kho" trên Báo cáo Trị giá Tồn kho CHỈ Cửa hàng trưởng được thấy
				//    ⇒ vai tỉnh KHÔNG có nút là ĐÚNG. Case kiểm nút phải vắng, không bấm chốt.
				const nut = khung(page).getByRole('button', { name: /Chốt tồn kho/ });
				ghiChu('nút đang có', chuan((await khung(page).locator('button').allInnerTexts()).join(' · ')));
				expect(await nut.count(), 'Vai tỉnh vẫn thấy nút "Chốt tồn kho" (chỉ Cửa hàng trưởng được thấy)').toBe(0);
				return;
			} else {
				await moRoute(page, '/inventory/overview');
				await khung(page).getByRole('button', { name: /Chốt tồn kho/ }).first().click();
				const m = page.getByRole('dialog').filter({ hasText: 'Chốt tồn kho theo tháng' }).last();
				await expect(m).toBeVisible({ timeout: 15_000 });
				await m.locator('.ant-radio-wrapper').filter({ hasText: cach }).click();
				ghiChu('tháng mặc định', await m.locator('.ant-picker input').first().inputValue());
				await m.getByRole('button', { name: /^Chốt$/ }).click();
			}
			const kq = page.getByRole('dialog').filter({ hasText: /tồn kho kỳ tháng|Không có điểm bán nào để chốt|Đang chốt tồn kho/ }).last();
			await kq.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => null);
			await page.waitForTimeout(5_000);
			const kqChu = chuan(await page.locator('.ant-modal:visible').last().innerText().catch(() => ''));
			const tb = await thongBao(page, 3_000);
			ghiChu('kết quả chốt', `${kqChu.slice(0, 500)} · ${tb} · BE ${JSON.stringify(ghi[0]?.status ?? ghi[0])?.slice(0, 200)}`);
			expect(kqChu, `Chốt không thành công (${kqChu.slice(0, 160)})`).toMatch(/Đã chốt tồn kho kỳ tháng|Đã chốt thành công/);
			expect(kqChu, 'Có đơn vị "Chưa thể chốt"').not.toMatch(/Chưa thể chốt/);
		});
	}

	test('29_040_002 — Tổng hợp báo cáo tồn kho chạy nền và báo khi xong', async ({ page }) => {
		chanNeuTat('29_040_002');
		await moMan(page, 'tonKho', VAI);
		const t = await chu(page);
		const dang = /Đang tổng hợp báo cáo tồn kho trên hệ thống báo cáo/.test(t);
		const xong = /Báo cáo tồn kho đã sẵn sàng/.test(t);
		ghiChu('banner', `đang tổng hợp: ${dang} · sẵn sàng: ${xong} · ${t.slice(0, 200)}`);
		test.skip(!dang && !xong, 'Không có lượt chốt tồn kho nào vừa chạy ở phạm vi tỉnh làn (chốt đều bị "Chưa thể chốt" — 29_040_001) ⇒ không có banner tổng hợp.');
		expect(dang || xong).toBe(true);
	});

	test('29_210_002 — Cảnh báo số đơn vị chưa chốt trong phạm vi', async ({ page }) => {
		chanNeuTat('29_210_002');
		const cho = page.waitForResponse((r) => /monthly-summary\/closing-stats/.test(r.url()) && r.status() === 200, { timeout: 90_000 }).catch(() => null);
		await moMan(page, 'tonKho', VAI);
		const r = await cho;
		const b = r ? await r.json() : null;
		const t = await chu(page);
		const canh = t.match(/((Tỉnh|Xã|Shop) chưa chốt:\s*\d+\s*·?\s*)+|Tất cả phạm vi đã chốt/)?.[0];
		ghiChu('đo', `${canh} · closing-stats ${JSON.stringify(b?.data)?.slice(0, 300)}`);
		expect(canh, 'Không có dòng cảnh báo số đơn vị chưa chốt').toBeTruthy();
		const d = b?.data ?? {};
		const d0 = Array.isArray(d) ? d[0] ?? {} : d;
		const shopChua = Number(d0.notClosedShopCount ?? NaN);
		if (!Number.isNaN(Number(d0.notClosedWardCount))) expect(canh).toContain(`Xã chưa chốt: ${d0.notClosedWardCount}`);
		if (!Number.isNaN(shopChua)) expect(canh).toContain(`Shop chưa chốt: ${shopChua}`);
	});

	test('29_210_008 — Phạm vi chốt kho của vai cấp tỉnh', async ({ page }) => {
		chanNeuTat('29_210_008');
		const ghi = [];
		page.on('request', (r) => { if (/period-closing\/close/.test(r.url())) ghi.push(r.url()); });
		await moRoute(page, '/inventory/overview');
		await khung(page).getByRole('button', { name: /Chốt tồn kho/ }).first().click();
		const m = page.getByRole('dialog').filter({ hasText: 'Chốt tồn kho theo tháng' }).last();
		await expect(m).toBeVisible({ timeout: 15_000 });
		const lc = (await m.locator('.ant-radio-wrapper').allInnerTexts()).map(chuan);
		ghiChu('lựa chọn', lc.join(' · '));
		await page.keyboard.press('Escape');
		expect(lc.join(' · ')).toContain('Toàn bộ phạm vi (gồm cấp dưới)');
		expect(lc.join(' · ')).toContain('Chỉ shop trực thuộc TRỰC TIẾP');
		expect(ghi).toEqual([]);
	});

	// ───── NXT & hiệu suất ─────
	test('29_060_001 — Báo cáo nhập xuất tồn theo đúng khoảng tháng và phạm vi', async ({ page }) => {
		chanNeuTat('29_060_001');
		const r = await nxtThe(page, 'Nhập - Xuất - Tồn', '/report/inventory/nxt');
		const q = Object.fromEntries(new URL(r.url()).searchParams);
		const b = await r.json();
		const ds = b?.data?.content ?? b?.data ?? [];
		ghiChu('đo', `${JSON.stringify(q)} · ${ds.length} dòng · ${JSON.stringify(ds[0] ?? {}).slice(0, 250)}`);
		expect(String(b?.status?.code)).toBe('200');
		expect(q.fromMonth && q.toMonth, 'Không gửi khoảng tháng').toBeTruthy();
		for (const x of ds) {
			const th = String(x.reportMonth ?? x.month ?? '').slice(0, 7);
			if (th) expect(th >= String(q.fromMonth).slice(0, 7) && th <= String(q.toMonth).slice(0, 7), `Dòng tháng ${th} ngoài khoảng`).toBe(true);
			void x;
		}
	});

	test('29_060_002 — Xuất NXT đặt tên tệp đúng quy ước', async ({ page }) => {
		chanNeuTat('29_060_002');
		await nxtThe(page, 'Nhập - Xuất - Tồn', '/report/inventory/nxt');
		const cho = page.waitForResponse((r) => /export\/task\/inventory-nxt/.test(r.url()), { timeout: 30_000 });
		await khung(page).locator('button').filter({ hasText: /Xuất Excel/i }).first().click();
		await page.locator('.ant-dropdown:visible').getByText('Xuất dữ liệu đang hiển thị hiện tại').click();
		const r = await cho;
		const b = await r.json().catch(() => ({}));
		const tb = await thongBao(page);
		ghiChu('đo', `${r.status()} ${JSON.stringify(b?.status)} · ${JSON.stringify(b?.data)?.slice(0, 200)} · "${tb}"`);
		const ten = JSON.stringify(b?.data ?? '');
		expect(ten, 'Tên tệp xuất NXT không theo quy ước "bao-cao-nhap-xuat-ton…"').toMatch(/bao-cao-nhap-xuat-ton/);
	});

	for (const [id, ten, the, api, kiem] of [
		['29_070_001', 'Sản lượng bán hiện ngày phát sinh bán gần nhất', 'Sản lượng bán', '/report/inventory/sales-volume', (x) => x.lastSaleDate ?? x.lastSoldDate ?? x.lastSaleAt],
		['29_080_001', 'Vòng quay và số ngày tồn kho tính theo đúng kỳ đã lọc', 'Hiệu suất hàng hoá', '/report/inventory/turnover', (x) => Object.keys(x).some((k2) => /turnover|dio|day/i.test(k2) && x[k2] != null) || undefined],
		['29_090_001', 'Lọc theo nhãn hàng bán chạy chậm luân chuyển hàng chết', 'Bán chạy / Chậm luân chuyển', '/report/inventory/movement-analysis?', (x) => x.movementClass],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			const r = await nxtThe(page, the, api);
			const b = await r.json();
			const ds = b?.data?.content ?? b?.data ?? [];
			ghiChu('đo', `${new URL(r.url()).search} · ${ds.length} dòng · ${JSON.stringify(ds[0] ?? {}).slice(0, 300)}`);
			expect(String(b?.status?.code)).toBe('200');
			test.skip(!ds.length, `Tỉnh làn không có dòng "${the}" trong khoảng tháng mặc định.`);
			ghiChu('trường của dòng', Object.keys(ds[0]).join(','));
			for (const x of ds) expect(kiem(x), `Dòng thiếu trường cần kiểm (${ten})`).toBeTruthy();
			if (id === '29_090_001') {
				const nhan = [...new Set(ds.map((x) => kiem(x)))];
				ghiChu('nhãn', nhan.join(','));
				for (const n of nhan) expect(['FAST', 'NORMAL', 'SLOW', 'DEAD']).toContain(String(n));
			}
		});
	}

	test('29_100_001 — Tồn theo hạn sử dụng xếp theo mức cấp bách', async ({ page }) => {
		chanNeuTat('29_100_001');
		const r = await moRoute(page, '/report/expiry-stock', '/report/inventory/expiry-stock');
		const b = r ? await r.json() : null;
		const ds = b?.data?.content ?? b?.data ?? [];
		ghiChu('đo', `${ds.length} lô · ${JSON.stringify(ds.slice(0, 3).map((x) => ({ hsd: x.expiryDate ?? x.expiredDate, con: x.daysLeft ?? x.remainingDays })))}`);
		expect(String(b?.status?.code)).toBe('200');
		test.skip(!ds.length, 'Tỉnh làn không có lô nào có hạn sử dụng.');
		const hsd = ds.map((x) => new Date(x.expiryDate ?? x.expiredDate ?? 0).getTime()).filter((x) => x > 0);
		expect([...hsd].sort((a, c) => a - c), 'Danh sách lô KHÔNG xếp theo HSD gần nhất trước').toEqual(hsd);
		for (const x of ds) expect(x.quantity ?? x.stockQty ?? x.qty, 'Lô thiếu số lượng').not.toBeUndefined();
	});

	// ───── Đối soát PO / nhân viên ─────
	test('29_110_001 — Báo cáo đối soát hiện công nợ từng NCC trong tháng', async ({ page }) => {
		chanNeuTat('29_110_001');
		const r = await moRoute(page, '/report/po-reconciliation', '/report/po-reconciliation/suppliers');
		const b = r ? await r.json() : null;
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan).join(' · ');
		ghiChu('đo', `${cot} · ${(b?.data?.content ?? b?.data ?? []).length} NCC`);
		expect(String(b?.status?.code)).toBe('200');
		for (const k of ['Tên nhà cung cấp', 'Nợ cuối kỳ', 'Đối soát PO']) expect(cot).toContain(k);
	});

	for (const [id, ten, route, nut, mong, api] of [
		['29_110_002', 'Tổng hợp lại báo cáo đối soát báo đúng thông điệp', '/report/po-reconciliation', 'Tổng hợp lại báo cáo', 'Tổng hợp báo cáo thành công', /po-reconciliation\/rebuild/],
		['29_120_002', 'Tổng hợp báo cáo nhân viên báo đúng thông điệp', '/report/employee-report', 'Tổng hợp báo cáo nhân viên', 'Tổng hợp báo cáo nhân viên thành công', /report\/employee\/aggregate/],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			await moRoute(page, route);
			const cho = page.waitForResponse((r) => api.test(r.url()), { timeout: 120_000 });
			await khung(page).getByRole('button', { name: nut }).first().click();
			const r = await cho;
			const b = await r.json().catch(() => ({}));
			const tb = await thongBao(page, 30_000);
			ghiChu('đo', `${r.status()} ${JSON.stringify(b?.status)} · "${tb}"`);
			expect(tb).toContain(mong);
		});
	}

	test('29_120_001 — Báo cáo nhân viên xếp hạng theo ba chỉ tiêu', async ({ page }) => {
		chanNeuTat('29_120_001');
		const r = await moRoute(page, '/report/employee-report', '/report/employee/list');
		const t = await chu(page);
		ghiChu('đo', t.slice(0, 300));
		for (const k of ['Tổng doanh số', 'Tổng đơn hàng', 'Tổng sản phẩm']) expect(t).toContain(k);
		const dongs = khung(page).locator('.ant-table-tbody tr.ant-table-row');
		test.skip((await dongs.count()) === 0, 'Không có nhân viên nào có doanh số trong khoảng mặc định.');
		await dongs.first().locator('a, [class*=link], td').nth(1).click();
		const dr = page.locator('.ant-drawer-open').last();
		await expect(dr).toBeVisible({ timeout: 15_000 });
		for (const k of ['Thống kê theo ca làm', 'Đơn hàng đã bán', 'Hàng hóa đã bán']) await expect(dr.locator('.ant-tabs-tab', { hasText: k }), `Drawer thiếu thẻ "${k}"`).toBeVisible();
		void r;
	});

	// ───── Báo cáo tuỳ chỉnh ─────
	test('29_130_002 — Chuyển báo cáo trên thanh nạp lại khung nội dung', async ({ page }) => {
		chanNeuTat('29_130_002');
		const r = await moRoute(page, '/report/dynamic', '/report/reports/menu');
		const menu = r ? (await r.json())?.data ?? [] : [];
		ghiChu('menu', JSON.stringify(menu.map((x) => x.name ?? x.menuName)).slice(0, 300));
		test.skip(menu.length < 2, `Danh mục báo cáo tuỳ chỉnh chỉ có ${menu.length} báo cáo.`);
		const cho = page.waitForResponse((x) => /report\/reports\/guest-token\//.test(x.url()), { timeout: 30_000 });
		await khung(page).locator('.ant-menu-item').nth(1).click();
		const g = await cho;
		ghiChu('guest-token', `${g.url().split('/').pop()} → ${g.status()}`);
		expect(g.status()).toBeLessThan(400);
		await expect(khung(page).locator('iframe').first(), 'Khung nội dung không nạp lại').toBeVisible({ timeout: 20_000 });
	});

	test('29_130_003 — Danh mục rỗng báo đúng thông điệp và không phải lỗi quyền', async ({ page }) => {
		chanNeuTat('29_130_003');
		// Danh mục dùng chung toàn chuỗi ⇒ giả response menu RỖNG ở tầng mạng (🚫 xoá báo cáo thật).
		await page.route(/\/report\/reports\/menu/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: { code: '200' }, data: [] }) }));
		await moRoute(page, '/report/dynamic');
		const t = await chu(page);
		ghiChu('đo', t.slice(0, 200));
		expect(t).toContain('Chưa có báo cáo');
		expect(t, 'Danh mục rỗng mà báo lỗi quyền').not.toMatch(/quyền|403|401/i);
	});

	// ───── Bộ chọn phạm vi (báo cáo kho) ─────
	for (const [id, ten, loai] of [
		['29_200_004', 'Báo cáo kho phạm vi Xã', 'xa'],
		['29_200_005', 'Báo cáo kho phạm vi Điểm bán', 'shop'],
		['29_200_007', 'Tìm kiếm Bưu điện Xã trong bộ chọn phạm vi', 'timXa'],
		['29_200_008', 'Tìm kiếm Điểm bán hoặc kho trong bộ chọn phạm vi', 'timShop'],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			const td = require('../../00_seed/seed-state').doc().duLieu;
			await moMan(page, 'tonKho', VAI);
			await khung(page).getByText('Chọn phạm vi').first().click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chọn phạm vi báo cáo' }).last();
			await expect(dr).toBeVisible({ timeout: 15_000 });
			await page.waitForTimeout(2_500);
			const dsDong = dr.locator('.ant-table-tbody tr.ant-table-row');
			const tenDong = async () => (await dsDong.locator('td:first-child').allInnerTexts()).map(chuan).filter(Boolean);
			const tim = async (x) => {
				const cho = page.waitForResponse((r) => /monthly-summary\/org-units/.test(r.url()), { timeout: 15_000 }).catch(() => null);
				await dr.getByPlaceholder('Tìm theo tên/mã đơn vị').fill(x);
				await cho;
				await page.waitForTimeout(1_500);
				return tenDong();
			};
			const cap0 = await tenDong();
			ghiChu('cấp đầu', cap0.join(' | '));
			if (loai === 'timXa' || loai === 'timShop') {
				const tu = loai === 'timXa' ? td.toChuc.tenXa : td.diemBan.tenShop;
				const kq = await tim(tu);
				ghiChu('tìm', `"${tu}" → ${kq.join(' | ')}`);
				expect(kq.some((x) => x.includes(tu)), `Tìm "${tu}" không ra đơn vị`).toBe(true);
				return;
			}
			const xa = dsDong.filter({ hasText: td.toChuc.tenXa }).first();
			await expect(xa, `Cấp đầu vai tỉnh không có xã ${td.toChuc.tenXa}`).toBeVisible({ timeout: 10_000 });
			if (loai === 'shop') {
				await xa.locator('td').first().click();
				await page.waitForTimeout(2_000);
			}
			const muc = loai === 'shop' ? dsDong.filter({ hasText: td.diemBan.tenShop }).first() : xa;
			const cho = page.waitForResponse((r) => /report\/inventory\/monthly-summary(\?|\/rollup)/.test(r.url()) && r.status() === 200, { timeout: 30_000 });
			await muc.locator('input[type=radio], .ant-radio, .ant-checkbox').first().click().catch(() => muc.click());
			await dr.getByRole('button', { name: /Xem báo cáo/ }).click();
			const r = await cho;
			const q = Object.fromEntries(new URL(r.url()).searchParams);
			ghiChu('tham số', JSON.stringify(q));
			if (loai === 'xa') expect(q.wardCode ?? q.orgCode, 'Không lọc theo mã xã').toBe(td.toChuc.maXa);
			else expect(String(q.shopId ?? q.orgCode), 'Không lọc theo điểm bán').toMatch(new RegExp(`${td.diemBan.shopId}|${td.diemBan.maShop}`));
		});
	}
});
