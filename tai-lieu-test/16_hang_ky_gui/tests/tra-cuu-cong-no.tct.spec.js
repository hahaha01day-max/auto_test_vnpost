'use strict';

/**
 * Phân hệ 16 · 010 — tra cứu Công nợ hàng ký gửi: tìm / lọc / phân trang, vai `tct`.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/consignmentDebt/pages/ConsignmentDebtPage.jsx`,
 * `features/consignmentDebt/services/consignmentDebtApi.js`, `components/selectShopMultiple/SelectShopTree.jsx`.
 * 🔴 Vì sao vai `tct` chứ không phải `province` như kịch bản: đo 24/09/2026 làn 7, tỉnh / xã / điểm bán của làn có
 *    **0** khoản nghĩa vụ (chưa ai bán hàng ký gửi ở đó), TCT thấy 30 khoản của chuỗi (3 tỉnh, 6 điểm bán). Case
 *    lọc / tìm trên bảng rỗng là "pass rỗng" ⇒ dùng vai có dữ liệu; case PHẠM VI (019/020) giữ vai hẹp.
 * Cả file 🚫 GHI: màn chỉ đọc, vẫn bọc `chanGhi`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const ROUTE = '/debt-reconciliation/consignment-debt';
const API = '/consignment-debt/obligations';
const NHAN = { PENDING: 'Tạm tính', RECONCILED: 'Đã đối soát', REVERSED: 'Đã đảo' };
const MAU = { PENDING: 'orange', RECONCILED: 'green', REVERSED: 'default' };

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
/** Ngày theo giờ máy (+7), dạng `YYYY-MM-DD` và `dd/mm/yyyy`. */
const ngay = (ms) => {
	const d = new Date(ms);
	const p = (n) => String(n).padStart(2, '0');
	return { iso: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, vn: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}` };
};

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET' || !/consignment|debt/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	return daGoi;
}

/** Chờ response danh sách thoả `dk(url)` sau hành động `lam` — đăng ký TRƯỚC khi làm. */
async function sauKhi(page, lam, dk = () => true) {
	const cho = page.waitForResponse((r) => r.url().includes(API) && r.request().method() === 'GET' && dk(new URL(r.url())), { timeout: 30_000 });
	await lam();
	const res = await cho;
	expect(res.status(), `API ${API} trả HTTP ${res.status()}`).toBe(200);
	const body = await res.json();
	expect(String(body?.status?.code), `API ${API}: ${body?.status?.message}`).toBe('200');
	await expect(khung(page).locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 15_000 });
	return { url: new URL(res.url()), body, data: body.data || [], total: body.page?.total_elements ?? 0 };
}

/** Mở màn; trả response đầu (không lọc) + toàn bộ khoản (size lớn, gọi API bằng phiên của màn). */
async function moMan(page) {
	await chanGhi(page);
	const st = k.batHeader(page);
	const dau = await sauKhi(page, () => moTrang(page, ROUTE, VAI));
	const tatCa = (await k.goiApi(page, st, API, { page: 0, size: 500 })).data || [];
	expect(tatCa.length, `Vai ${VAI} không thấy khoản nghĩa vụ nào — không có dữ liệu để kiểm lọc/tìm`).toBeGreaterThan(0);
	return { dau, tatCa, st };
}

/** Bảng đang hiện đúng trang đầu KHÔNG lọc. 🔴 Về lại đúng bộ tham số ban đầu thì RTK Query trả từ CACHE,
 *  🚫 không gửi request ⇒ không chờ response được, phải so nội dung bảng. */
async function bangNhuBanDau(page, dau) {
	await expect(khung(page).locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 15_000 });
	await expect(dong(page)).toHaveCount(dau.data.length);
	const cotDon = (await dong(page).locator('td:nth-child(2)').allInnerTexts()).map(chuan);
	expect(cotDon, 'Bảng không trở về trang đầu không lọc').toEqual(dau.data.map((x) => x.invoiceNo || '-'));
}
/** Mọi request danh sách gửi đi từ lúc gọi (để bắt tham số lọc còn sót). */
const theoDoi = (page) => { const ds = []; page.on('request', (r) => { if (r.url().includes(API)) ds.push(new URL(r.url())); }); return ds; };

const oTim = (page) => khung(page).getByPlaceholder('Mã đơn bán');
const timMa = (page, ma) => sauKhi(page, async () => { await oTim(page).fill(ma); await oTim(page).press('Enter'); });

async function chonTrangThai(page, nhan, code) {
	return sauKhi(page, async () => {
		await khung(page).locator('.ant-select').filter({ hasText: /Trạng thái|Tạm tính|Đã đối soát|Đã đảo/ }).first().click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${nhan}$`) }).click();
	}, (u) => u.searchParams.get('status') === code);
}

async function chonKhoang(page, tu, den) {
	return sauKhi(page, async () => {
		await khung(page).getByPlaceholder('Từ ngày').click();
		await khung(page).getByPlaceholder('Từ ngày').fill(tu.vn);
		await khung(page).getByPlaceholder('Từ ngày').press('Enter');
		await khung(page).getByPlaceholder('Đến ngày').fill(den.vn);
		await khung(page).getByPlaceholder('Đến ngày').press('Enter');
	}, (u) => u.searchParams.has('fromDate') && u.searchParams.has('toDate'));
}

/** Chọn một tỉnh ở hộp "Lọc theo tỉnh / xã / điểm bán" (cột tỉnh) rồi Xác nhận. */
async function chonTinh(page, tenTinh, maTinh) {
	return sauKhi(page, async () => {
		await khung(page).locator('.ant-select').filter({ hasText: 'Lọc theo tỉnh / xã / điểm bán' }).click();
		const hop = page.getByRole('dialog').filter({ has: page.locator('.sp-column') }).last();
		await expect(hop).toBeVisible();
		await hop.locator('.sp-column').first().getByPlaceholder('Tìm kiếm').fill(tenTinh);
		await hop.locator('.sp-column').first().locator('.sp-item').filter({ hasText: tenTinh }).first().click();
		await hop.locator('button.ant-btn-primary').filter({ hasText: 'Xác nhận' }).click();
		await expect(hop).toBeHidden();
	}, (u) => u.searchParams.get('provinceCode') === maTinh);
}

/** Tỉnh có nhiều khoản nhất trong dữ liệu (để lọc ra tập con thật). */
async function tinhNhieuNhat(page, st, tatCa) {
	const dem = {};
	for (const x of tatCa) if (x.orgProvinceCode) dem[x.orgProvinceCode] = (dem[x.orgProvinceCode] || 0) + 1;
	const ma = Object.entries(dem).sort((a, b) => b[1] - a[1])[0]?.[0];
	expect(ma, 'Không có khoản nào mang mã tỉnh').toBeTruthy();
	const dv = ((await k.goiApi(page, st, '/v1.0/organization-unit/search', { status: 1, keyword: ma })).data || []).find((u) => u.unitCode === ma);
	expect(dv?.unitName, `Không tra được tên đơn vị ${ma}`).toBeTruthy();
	return { ma, ten: dv.unitName, so: dem[ma] };
}

test.describe('16 · 010 tra cứu công nợ hàng ký gửi (vai tct)', () => {
	test('16_010_005 — Lọc theo phạm vi tỉnh / xã / điểm bán', async ({ page }) => {
		chanNeuTat('16_010_005');
		const { dau, tatCa, st } = await moMan(page);
		const t = await tinhNhieuNhat(page, st, tatCa);
		const kq = await chonTinh(page, t.ten, t.ma);
		ghi(`Tỉnh ${t.ma} (${t.ten}): ${kq.total} khoản / tổng ${dau.total}`);
		expect(kq.total, 'Lọc tỉnh ra 0 khoản dù dữ liệu có').toBeGreaterThan(0);
		expect(kq.total, 'Lọc tỉnh mà tổng không đổi — bộ lọc không tác dụng').toBeLessThan(dau.total);
		expect(kq.total).toBe(t.so);
		for (const x of kq.data) expect(x.orgProvinceCode, `Khoản ${x.id} không thuộc tỉnh ${t.ma}`).toBe(t.ma);
	});

	test('16_010_006 — Tìm theo mã đơn bán', async ({ page }) => {
		chanNeuTat('16_010_006');
		const { tatCa } = await moMan(page);
		const ma = tatCa.find((x) => x.invoiceNo)?.invoiceNo;
		expect(ma, 'Không có khoản nào mang mã đơn bán').toBeTruthy();
		const kq = await timMa(page, ma);
		ghi(`Tìm "${ma}" → ${kq.total} khoản`);
		expect(kq.url.searchParams.get('orderCode')).toBe(ma);
		expect(kq.total).toBeGreaterThan(0);
		expect(kq.total).toBe(tatCa.filter((x) => x.invoiceNo === ma).length);
		for (const x of kq.data) expect(x.invoiceNo, `Khoản ${x.id} không thuộc đơn ${ma}`).toBe(ma);
		await expect(dong(page)).toHaveCount(kq.data.length);
		for (const t of await dong(page).allInnerTexts()) expect(chuan(t)).toContain(ma);
	});

	test('16_010_007 — Tìm mã đơn bán không tồn tại', async ({ page }) => {
		chanNeuTat('16_010_007');
		await moMan(page);
		const kq = await timMa(page, 'DONKHONGCO999');
		expect(kq.data).toEqual([]);
		await expect(dong(page)).toHaveCount(0);
		await expect(page.locator('.ant-message-error, .ant-notification-notice-error')).toHaveCount(0);
	});

	test('16_010_008 — Tìm mã đơn bán toàn khoảng trắng', async ({ page }) => {
		chanNeuTat('16_010_008');
		const { dau } = await moMan(page);
		// Lọc trước một thứ khác để việc gửi lại request quan sát được, rồi tìm bằng khoảng trắng.
		await timMa(page, 'DONKHONGCO999');
		const gui = theoDoi(page);
		await oTim(page).fill('     ');
		await oTim(page).press('Enter');
		await bangNhuBanDau(page, dau);
		ghi(`"     " → request: ${gui.map((u) => u.search).join(' ; ') || 'không (cache — trùng tham số ban đầu)'}`);
		expect(gui.filter((u) => u.searchParams.has('orderCode')), 'Chuỗi khoảng trắng không được trim — vẫn gửi orderCode').toEqual([]);
		await expect(page.locator('.ant-message-error, .ant-notification-notice-error')).toHaveCount(0);
	});

	test('16_010_009 — Tìm mã đơn bán bằng ký tự đặc biệt', async ({ page }) => {
		chanNeuTat('16_010_009');
		const { dau } = await moMan(page);
		const kq = await timMa(page, "' OR 1=1 --");
		ghi(`Ký tự đặc biệt → ${kq.total} khoản (không lọc: ${dau.total})`);
		expect(kq.data, 'Chuỗi SQL injection trả về dữ liệu').toEqual([]);
		await expect(dong(page)).toHaveCount(0);
		await expect(page.locator('.ant-message-error, .ant-notification-notice-error')).toHaveCount(0);
		await expect(khung(page)).not.toContainText(/SQL|Exception|syntax/i);
	});

	test('16_010_010 — Lọc theo ba trạng thái khoản nghĩa vụ', async ({ page }) => {
		chanNeuTat('16_010_010');
		const { tatCa } = await moMan(page);
		await khung(page).locator('.ant-select').filter({ hasText: 'Trạng thái' }).first().click();
		const opt = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(chuan);
		await page.keyboard.press('Escape');
		expect(opt, 'Ô Trạng thái phải đúng ba nhãn').toEqual(Object.values(NHAN));
		const ngoai = [...new Set(tatCa.map((x) => x.status).filter((s) => !NHAN[s]))];
		if (ngoai.length) ghi(`🔴 Dữ liệu có trạng thái ngoài bộ ba nhãn: ${ngoai.join(', ')} — FE không có nhãn cho trạng thái này.`);
		for (const [code, nhan] of Object.entries(NHAN)) {
			const kq = await chonTrangThai(page, nhan, code);
			ghi(`${nhan}: ${kq.total} khoản`);
			expect(kq.total).toBe(tatCa.filter((x) => x.status === code).length);
			for (const x of kq.data) expect(x.status).toBe(code);
			const the = dong(page).locator('td:last-child .ant-tag');
			await expect(the).toHaveCount(kq.data.length);
			for (let i = 0; i < kq.data.length; i++) {
				await expect(the.nth(i)).toHaveText(nhan);
				if (MAU[code] !== 'default') await expect(the.nth(i)).toHaveClass(new RegExp(`ant-tag-${MAU[code]}`));
			}
		}
	});

	test('16_010_011 — Lọc theo khoảng ngày giao dịch', async ({ page }) => {
		chanNeuTat('16_010_011');
		const { dau, tatCa } = await moMan(page);
		const d = ngay(tatCa[0].transactionDate);
		const kq = await chonKhoang(page, d, d);
		ghi(`Ngày ${d.vn}: ${kq.total} khoản / ${dau.total}`);
		expect(kq.url.searchParams.get('fromDate')).toBe(d.iso);
		expect(kq.url.searchParams.get('toDate')).toBe(d.iso);
		expect(kq.total).toBeGreaterThan(0);
		expect(kq.total).toBe(tatCa.filter((x) => ngay(x.transactionDate).iso === d.iso).length);
		for (const x of kq.data) expect(ngay(x.transactionDate).iso, `Khoản ${x.id} ngoài khoảng`).toBe(d.iso);
		for (const t of await dong(page).locator('td:first-child').allInnerTexts()) expect(chuan(t)).toBe(d.vn);
	});

	test('16_010_012 — Chọn Từ ngày lớn hơn Đến ngày', async ({ page }) => {
		chanNeuTat('16_010_012');
		const { st } = await moMan(page);
		const tu = { vn: '20/08/2026', iso: '2026-08-20' };
		const den = { vn: '10/08/2026', iso: '2026-08-10' };
		// Trên giao diện: gõ ngược ⇒ RangePicker không để đi request có from > to.
		const gui = [];
		page.on('request', (r) => { if (r.url().includes(API)) gui.push(new URL(r.url())); });
		await khung(page).getByPlaceholder('Từ ngày').click();
		await khung(page).getByPlaceholder('Từ ngày').fill(tu.vn);
		await khung(page).getByPlaceholder('Từ ngày').press('Enter');
		await khung(page).getByPlaceholder('Đến ngày').fill(den.vn);
		await khung(page).getByPlaceholder('Đến ngày').press('Enter');
		await page.keyboard.press('Escape');
		await expect(khung(page).locator('.ant-spin-spinning')).toHaveCount(0);
		const nguoc = gui.filter((u) => u.searchParams.get('fromDate') > u.searchParams.get('toDate'));
		ghi(`Gõ ngược: đã gửi ${gui.map((u) => `${u.searchParams.get('fromDate')}→${u.searchParams.get('toDate')}`).join(', ') || 'không request nào'}`);
		expect(nguoc, 'RangePicker gửi request với Từ ngày > Đến ngày').toEqual([]);
		// Ép qua API ⇒ rỗng, 🚫 500.
		const r = await page.request.get(`${process.env.VNPOST_BASE_URL}/__api${API}`, { headers: st.h, params: { page: 0, size: 10, fromDate: tu.iso, toDate: den.iso } });
		expect(r.status(), 'Ép ngày ngược qua API trả lỗi server').toBeLessThan(500);
		const b = await r.json();
		expect(String(b?.status?.code)).toBe('200');
		expect(b.data || []).toEqual([]);
	});

	test('16_010_013 — Tổ hợp bốn bộ lọc cùng lúc', async ({ page }) => {
		chanNeuTat('16_010_013');
		const { tatCa, st } = await moMan(page);
		const t = await tinhNhieuNhat(page, st, tatCa);
		const x = tatCa.find((y) => y.orgProvinceCode === t.ma && y.invoiceNo && NHAN[y.status]);
		expect(x, `Không có khoản ở tỉnh ${t.ma} đủ mã đơn + trạng thái để tổ hợp`).toBeTruthy();
		const d = ngay(x.transactionDate);
		// 🔴 Khoảng HAI ngày [d, d+1]: backend coi "Đến ngày" là mốc KHÔNG bao gồm (lỗi riêng, xem 16_010_011) —
		//    chọn một ngày là luôn rỗng, case này kiểm phép AND nên 🚫 để lỗi đó che mất.
		const d2 = ngay(x.transactionDate + 86_400_000);
		await chonTinh(page, t.ten, t.ma);
		await timMa(page, x.invoiceNo);
		await chonTrangThai(page, NHAN[x.status], x.status);
		const kq = await chonKhoang(page, d, d2);
		for (const [kk, v] of [['provinceCode', t.ma], ['orderCode', x.invoiceNo], ['status', x.status], ['fromDate', d.iso], ['toDate', d2.iso]]) expect(kq.url.searchParams.get(kk), `Request thiếu điều kiện ${kk}`).toBe(v);
		const mong = tatCa.filter((y) => y.orgProvinceCode === t.ma && y.invoiceNo === x.invoiceNo && y.status === x.status && ngay(y.transactionDate).iso === d.iso);
		ghi(`Tổ hợp ${t.ma}+${x.invoiceNo}+${x.status}+${d.iso}..${d2.iso}: ${kq.total} (kỳ vọng ${mong.length})`);
		expect(kq.total).toBeGreaterThan(0);
		expect(kq.total).toBe(mong.length);
		for (const y of kq.data) {
			expect(y.orgProvinceCode).toBe(t.ma);
			expect(y.invoiceNo).toBe(x.invoiceNo);
			expect(y.status).toBe(x.status);
			expect([d.iso, d2.iso]).toContain(ngay(y.transactionDate).iso);
		}
	});

	test('16_010_014 — Xoá lọc trả về danh sách đầy đủ', async ({ page }) => {
		chanNeuTat('16_010_014');
		const { dau, tatCa, st } = await moMan(page);
		const t = await tinhNhieuNhat(page, st, tatCa);
		const x = tatCa.find((y) => y.orgProvinceCode === t.ma && y.invoiceNo && NHAN[y.status]);
		const d = ngay(x.transactionDate);
		await chonTinh(page, t.ten, t.ma);
		await timMa(page, x.invoiceNo);
		await chonTrangThai(page, NHAN[x.status], x.status);
		const loc = await chonKhoang(page, d, d);
		expect(loc.total).toBeLessThan(dau.total);
		// Xoá lần lượt bằng nút allowClear của từng ô.
		const gui = theoDoi(page);
		const xoa = async (o) => {
			await o.hover();
			await o.locator('.ant-select-clear, .ant-picker-clear, .ant-input-clear-icon').first().click();
			await expect(khung(page).locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 15_000 });
		};
		await xoa(khung(page).locator('.ant-picker-range'));
		await xoa(khung(page).locator('.ant-select').filter({ hasText: NHAN[x.status] }).first());
		await xoa(oTim(page).locator('xpath=..'));
		await xoa(khung(page).locator('.ant-select').filter({ hasText: t.ten }).first());
		for (const o of [khung(page).getByPlaceholder('Từ ngày'), oTim(page)]) await expect(o).toHaveValue('');
		await expect(khung(page).locator('.ant-select').filter({ hasText: 'Trạng thái' })).toBeVisible();
		await expect(khung(page).locator('.ant-select').filter({ hasText: 'Lọc theo tỉnh / xã / điểm bán' })).toBeVisible();
		await bangNhuBanDau(page, dau);
		const cuoi = gui.at(-1);
		ghi(`Xoá 4 ô: ${gui.length} request, cuối: ${cuoi?.search ?? '—'}`);
		// Request cuối (nếu có — trùng tham số ban đầu thì lấy cache) không được còn điều kiện lọc nào.
		if (gui.length === 4 && cuoi) for (const kk of ['provinceCode', 'orderCode', 'status', 'fromDate', 'toDate']) expect(cuoi.searchParams.has(kk), `Còn sót điều kiện ${kk}`).toBe(false);
	});

	test('16_010_015 — Phân trang hoạt động đúng', async ({ page }) => {
		chanNeuTat('16_010_015');
		const { dau } = await moMan(page);
		const size = Number(dau.url.searchParams.get('size'));
		expect(dau.total, `Cần hơn ${size} khoản để có nhiều trang`).toBeGreaterThan(size);
		const pag = khung(page).locator('.ant-pagination');
		// Đổi số dòng mỗi trang: đang ở trang 2 ⇒ đổi xong phải về trang 1.
		await sauKhi(page, () => pag.locator('.ant-pagination-item-2').click(), (u) => u.searchParams.get('page') === '1');
		const doi = await sauKhi(page, async () => {
			await pag.locator('.ant-select').click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /^20/ }).click();
		}, (u) => u.searchParams.get('size') === '20');
		expect(doi.url.searchParams.get('page'), 'Đổi số dòng mà không về trang 1').toBe('0');
		await expect(pag.locator('.ant-pagination-item-active')).toHaveText('1');
		// Sang trang cuối: phần dư = tổng − các trang trước.
		const soTrang = Math.ceil(dau.total / 20);
		const cuoi = await sauKhi(page, () => pag.locator(`.ant-pagination-item-${soTrang}`).click(), (u) => u.searchParams.get('page') === String(soTrang - 1));
		const du = dau.total - 20 * (soTrang - 1);
		ghi(`Tổng ${dau.total}, size 20 ⇒ ${soTrang} trang, trang cuối ${cuoi.data.length} dòng`);
		expect(cuoi.data.length).toBe(du);
		await expect(dong(page)).toHaveCount(du);
	});

	test('16_010_016 — Nguồn giá Danh mục sản phẩm cảnh báo thiếu bảng giá', async ({ page }) => {
		chanNeuTat('16_010_016');
		const { tatCa } = await moMan(page);
		const x = tatCa.find((y) => y.priceSource === 'SKU_MASTER');
		test.skip(!x, `Chuỗi chưa có khoản nào lấy giá từ danh mục (priceSource=SKU_MASTER) — đo 24/09: ${[...new Set(tatCa.map((y) => y.priceSource))].join(', ')}. Cần một lần bán hàng ký gửi SKU không có trong bảng giá NCC.`);
		const kq = await timMa(page, x.invoiceNo);
		const r = dong(page).filter({ hasText: x.sku }).first();
		const the = r.locator('.ant-tag').filter({ hasText: 'Danh mục sản phẩm' });
		await expect(the).toBeVisible();
		await expect(the).toHaveClass(/ant-tag-gold/);
		ghi(`Khoản ${x.id} (${x.sku}) đơn ${x.invoiceNo} — ${kq.total} dòng`);
	});

	test('16_010_017 — Cột Đơn bán là mã đơn tại quầy, không phải số hoá đơn', async ({ page }) => {
		chanNeuTat('16_010_017');
		const { tatCa, st } = await moMan(page);
		const coKy = tatCa.filter((y) => y.reconciliationPeriodId && y.invoiceNo);
		expect(coKy.length, 'Không có khoản nào đã gắn kỳ đối soát để so với hoá đơn NCC của kỳ').toBeGreaterThan(0);
		const soHd = new Set();
		for (const id of new Set(coKy.map((y) => y.reconciliationPeriodId))) {
			for (const h of (await k.goiApi(page, st, '/consignment-invoices', { periodId: id })).data || []) {
				for (const v of [h.invoiceNo, h.invoiceNumber, h.soHoaDon, `${h.invoiceSeries ?? ''}${h.invoiceNo ?? ''}`]) if (v) soHd.add(String(v));
			}
		}
		test.skip(soHd.size === 0, `Các kỳ ${[...new Set(coKy.map((y) => y.reconciliationPeriodId))].join(', ')} chưa có hoá đơn NCC nào để đối chiếu.`);
		ghi(`Mã đơn bán: ${[...new Set(coKy.map((y) => y.invoiceNo))].join(', ')} · số hoá đơn NCC: ${[...soHd].join(', ')}`);
		for (const y of coKy) expect(soHd.has(String(y.invoiceNo)), `Cột Đơn bán "${y.invoiceNo}" trùng số hoá đơn NCC`).toBe(false);
	});
});
