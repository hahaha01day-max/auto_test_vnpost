'use strict';

/**
 * Phân hệ 16 · 030 (+ 020_011) — màn Chi tiết kỳ đối soát, phần ĐỌC, vai `tct`.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/consignmentRecon/pages/ConsignmentReconDetailPage.jsx`,
 * `features/consignmentRecon/services/consignmentReconApi.js`.
 * 🔴 Vai `tct` thay `province`: làn 7 tỉnh không có kỳ nào (36/36 kỳ thuộc TCT). Mỗi case CHỌN KỲ theo dữ liệu thật
 *    (đọc `/summary` + `/audit` của mọi kỳ) — 🚫 gắn cứng id kỳ.
 * 🔴 Chốt kỳ là MỘT CHIỀU ⇒ cả file chặn mọi request không phải GET tới consignment (kể cả `POST .../lock`):
 *    case hộp xác nhận (017/027) chỉ mở hộp rồi bấm "Để sau".
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const ROUTE = '/debt-reconciliation/consignment-recon';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const vn = (ms) => new Intl.DateTimeFormat('vi-VN').format(new Date(ms));
const tabs = (page) => khung(page).locator('.ant-tabs-nav .ant-tabs-tab');
const bangTab = (page) => khung(page).locator('.ant-tabs-tabpane-active .ant-table').first();
const dongTab = (page) => khung(page).locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row');
const cotTab = async (page) => (await bangTab(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET' || !/consignment/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${new URL(req.url()).pathname}`);
		await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	return daGoi;
}

/**
 * Mọi kỳ + summary + audit (đọc bằng phiên của màn danh sách). Cache theo worker: 36 kỳ × 2 request.
 */
let _ky = null;
async function khoKy(page) {
	if (_ky) return _ky;
	const st = k.batHeader(page);
	await moTrang(page, ROUTE, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const ds = (await k.goiApi(page, st, '/consignment-recon/periods', { page: 0, size: 500 })).data || [];
	expect(ds.length, 'Vai TCT không thấy kỳ nào').toBeGreaterThan(0);
	for (const p of ds) {
		p.s = (await k.goiApi(page, st, `/consignment-recon/periods/${p.id}/summary`, {})).data || {};
		p.a = (await k.goiApi(page, st, `/consignment-recon/periods/${p.id}/audit`, {})).data || {};
	}
	_ky = ds;
	return ds;
}
const kyCo = async (page, dk, moTa) => {
	const x = (await khoKy(page)).find(dk);
	test.skip(!x, `Chuỗi chưa có kỳ nào ${moTa} (đo 24/09/2026 trên 36 kỳ của TCT).`);
	return x;
};

/** Mở chi tiết kỳ; chờ summary về. `tab` = key thẻ (`?tab=`). */
async function moKy(page, ky, tab) {
	const daGoi = await chanGhi(page);
	const cho = page.waitForResponse((r) => r.url().includes(`/consignment-recon/periods/${ky.id}/summary`), { timeout: 60_000 });
	await moTrang(page, `${ROUTE}/${ky.id}${tab ? `?tab=${tab}` : ''}`, VAI);
	await cho;
	await expect(khung(page).locator('.ant-page-header-heading-title')).toContainText(`Kỳ đối soát ${vn(ky.periodFrom)} — ${vn(ky.periodTo)}`, { timeout: 30_000 });
	await expect(khung(page).locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 20_000 });
	return daGoi;
}
const nutChot = (page) => khung(page).locator('.ant-page-header-heading-extra button').first();

test.describe('16 · 030 chi tiết kỳ đối soát (vai tct)', () => {
	test('16_030_001 — Màn chi tiết kỳ có đủ sáu thẻ', async ({ page }) => {
		chanNeuTat('16_030_001');
		const ky = await kyCo(page, (x) => x.status === 'OPEN' && (x.s.nhap || []).length && (x.s.xuat || []).length, 'Đang gom số có cả nhập lẫn xuất');
		await moKy(page, ky);
		const n = (x) => (x || []).length;
		const rs = n(ky.a.lechDoiChieu) + n(ky.a.skuChuaGanNcc);
		ghi(`Kỳ ${ky.id}: nhập ${n(ky.s.nhap)} · xuất ${n(ky.s.xuat)} · kiểm kê ${n(ky.s.kiemKe)} · rà soát ${rs}`);
		expect((await tabs(page).allInnerTexts()).map(chuan)).toEqual([
			'Nhập xuất tồn', `Nhập trong kỳ (${n(ky.s.nhap)})`, `Xuất trong kỳ (${n(ky.s.xuat)})`,
			`Chênh lệch kiểm kê (${n(ky.s.kiemKe)})`, 'Hoá đơn NCC', `Cần rà soát (${rs})`,
		]);
	});

	test('16_030_002 — Tiêu đề màn nêu khoảng kỳ, tên NCC và trạng thái', async ({ page }) => {
		chanNeuTat('16_030_002');
		for (const [tt, nhan] of [['OPEN', null], ['LOCKED', 'Đã chốt'], ['INVOICED', 'Đã ghi nợ']]) {
			const ky = await kyCo(page, (x) => x.status === tt && x.chainSupplierName, `trạng thái ${tt} có tên NCC`);
			await moKy(page, ky);
			const tieuDe = khung(page).locator('.ant-page-header-heading-title');
			await expect(tieuDe).toContainText(`Kỳ đối soát ${vn(ky.periodFrom)} — ${vn(ky.periodTo)} · ${ky.chainSupplierName}`);
			if (nhan) await expect(tieuDe.locator('.ant-tag').filter({ hasText: nhan })).toBeVisible();
			// Kỳ đang gom số: nhãn trạng thái nằm ở nút + alert "Kỳ đang gom số…" (FE không gắn tag).
			else await expect(khung(page).locator('.ant-alert').first()).toContainText('Kỳ đang gom số — số liệu còn thay đổi cho tới khi chốt kỳ');
			ghi(`${tt} · kỳ ${ky.id}: ${chuan(await tieuDe.innerText())}`);
		}
	});

	test('16_030_004 — Thẻ Nhập xuất tồn đối chiếu được năm cột số lượng', async ({ page }) => {
		chanNeuTat('16_030_004');
		const ky = await kyCo(page, (x) => (x.s.nxt || []).some((r) => r.nhap || r.xuatBan), 'có mặt hàng phát sinh nhập/xuất bán');
		await moKy(page, ky);
		const cot = await cotTab(page);
		for (const c of ['Tồn đầu', 'Nhập', 'Xuất bán', 'Tồn cuối', 'SL phải trả']) expect(cot, `Thẻ NXT thiếu cột "${c}"`).toContain(c);
		const r = ky.s.nxt.find((x) => x.nhap || x.xuatBan);
		const d = dongTab(page).filter({ hasText: r.sku }).first();
		const o = (await d.locator('td').allInnerTexts()).map(chuan);
		const so = (c) => o[cot.indexOf(c)].replace(/\./g, '').replace(/,/g, '.');
		ghi(`${r.sku}: ${cot.map((c, i) => `${c}=${o[i]}`).join(' · ')}`);
		for (const [c, f] of [['Tồn đầu', 'tonDau'], ['Nhập', 'nhap'], ['Xuất bán', 'xuatBan'], ['Tồn cuối', 'tonCuoi'], ['SL phải trả', 'slPhaiTra']]) {
			expect(Number(so(c)), `Cột "${c}" của ${r.sku}`).toBe(Number(r[f] ?? 0));
		}
		// Cân tồn: tồn cuối = tồn đầu + nhập − xuất kho (mọi thứ rời kho) + chênh lệch kiểm kê.
		for (const x of ky.s.nxt) expect(x.tonCuoi, `Tồn cuối ${x.sku} không cân`).toBeCloseTo(x.tonDau + x.nhap - x.xuat + x.chenhLechKiemKe, 6);
	});

	test('16_030_005 — Cột Xuất tặng và Trả hàng KHÔNG tính vào số phải trả', async ({ page }) => {
		chanNeuTat('16_030_005');
		const ky = await kyCo(page, (x) => (x.s.nxt || []).some((r) => r.traHang > 0 || r.xuatTang > 0), 'có hàng trả NCC hoặc xuất tặng');
		await moKy(page, ky);
		const dong = ky.s.nxt.filter((r) => r.traHang > 0 || r.xuatTang > 0);
		for (const r of dong) {
			ghi(`${r.sku}: xuất ${r.xuat} · bán ${r.xuatBan} · tặng ${r.xuatTang} · trả ${r.traHang} · KK ${r.chenhLechKiemKe} · phải trả ${r.slPhaiTra}`);
			// Số phải trả ≤ phần rời kho KHÔNG gồm tặng / trả NCC (+ kiểm kê thiếu).
			expect(r.slPhaiTra, `${r.sku}: SL phải trả cộng cả hàng tặng / trả NCC`).toBeLessThanOrEqual(r.xuat - r.traHang - r.xuatTang + Math.max(0, -r.chenhLechKiemKe) + 1e-9);
			if (r.traHang > 0) expect(r.slPhaiTra, `${r.sku}: SL phải trả = bán + trả hàng`).not.toBe(r.xuatBan + r.traHang);
		}
		const cot = await cotTab(page);
		for (const c of ['Xuất tặng', 'Trả hàng', 'SL phải trả']) expect(cot).toContain(c);
		// Tooltip cột nói rõ không tính vào số phải thanh toán.
		for (const [c, y] of [['Xuất tặng', 'Không tính vào số phải thanh toán'], ['Trả hàng', 'Không tính vào số phải thanh toán']]) {
			await bangTab(page).locator('.ant-table-thead th').filter({ hasText: c }).locator('.anticon').hover();
			await expect(page.locator('.ant-tooltip:not(.ant-tooltip-hidden)').last()).toContainText(y);
			await page.mouse.move(0, 0);
		}
	});

	test('16_030_008 — Thẻ Nhập trong kỳ hiện đủ cột chứng từ', async ({ page }) => {
		chanNeuTat('16_030_008');
		const ky = await kyCo(page, (x) => (x.s.nhap || []).length > 0, 'có chứng từ nhập');
		await moKy(page, ky, 'import');
		await expect(tabs(page).filter({ hasText: 'Nhập trong kỳ' })).toHaveClass(/ant-tabs-tab-active/);
		const cot = await cotTab(page);
		ghi(`Kỳ ${ky.id}: ${cot.join(' | ')}`);
		for (const c of ['Sản phẩm', 'Nghiệp vụ', 'Đơn vị', 'Kho / Điểm bán', 'Đơn giá', 'Nguồn giá', 'Thuế', 'Thành tiền trước thuế', 'Thành tiền sau thuế', 'Số dòng']) {
			expect(cot, `Thẻ Nhập thiếu cột "${c}"`).toContain(c);
		}
		await expect(dongTab(page)).toHaveCount(ky.s.nhap.length);
	});

	test('16_030_011 — Thẻ Xuất trong kỳ hiện đủ loại nghiệp vụ', async ({ page }) => {
		chanNeuTat('16_030_011');
		const ky = await kyCo(page, (x) => (x.s.xuat || []).length > 0 && (x.s.nxt || []).some((r) => r.traHang > 0), 'có xuất bán lẫn trả NCC');
		await moKy(page, ky, 'export');
		await expect(dongTab(page)).toHaveCount(ky.s.xuat.length);
		const cot = await cotTab(page);
		const i = cot.indexOf('Nghiệp vụ');
		const nv = [...new Set((await dongTab(page).locator(`td:nth-child(${i + 1})`).allInnerTexts()).map(chuan))];
		ghi(`Kỳ ${ky.id}: nghiệp vụ ${nv.join(', ')}`);
		expect(nv.some((x) => /bán/i.test(x)), 'Thẻ Xuất không có dòng bán ra').toBe(true);
		expect(nv.some((x) => /trả/i.test(x)), 'NXT có trả hàng mà thẻ Xuất không có dòng trả NCC').toBe(true);
		const thieu = [['xuất huỷ', /huỷ|hủy/i], ['điều chuyển', /chuyển/i]].filter(([, re]) => !nv.some((x) => re.test(x))).map(([t]) => t);
		test.skip(thieu.length > 0, `Bán ra + trả NCC đạt; kỳ ${ky.id} chưa có dòng ${thieu.join(' / ')} để kiểm (chuỗi chưa phát sinh nghiệp vụ đó với hàng ký gửi).`);
	});

	test('16_030_012 — Thiếu hụt kiểm kê tính là hàng phải thanh toán', async ({ page }) => {
		chanNeuTat('16_030_012');
		const ky = await kyCo(page, (x) => (x.s.nxt || []).some((r) => r.chenhLechKiemKe < 0), 'có chênh lệch kiểm kê âm');
		await moKy(page, ky, 'stockCheck');
		await expect(khung(page).locator('.ant-tabs-tabpane-active .ant-alert')).toContainText('Thiếu hụt hàng ký gửi tính là xuất kho phải thanh toán');
		await expect(dongTab(page)).toHaveCount(ky.s.kiemKe.length);
		for (const r of ky.s.nxt.filter((x) => x.chenhLechKiemKe < 0)) {
			ghi(`${r.sku}: KK ${r.chenhLechKiemKe} · bán ${r.xuatBan} · phải trả ${r.slPhaiTra}`);
			// Phần thiếu phải NẰM TRONG số phải trả.
			expect(r.slPhaiTra, `${r.sku}: kiểm kê thiếu không cộng vào SL phải trả`).toBeGreaterThanOrEqual(r.xuatBan + -r.chenhLechKiemKe - 1e-9);
		}
		// Ô số âm tô đỏ ở thẻ NXT.
		await khung(page).locator('.ant-tabs-tab').filter({ hasText: 'Nhập xuất tồn' }).click();
		const r = ky.s.nxt.find((x) => x.chenhLechKiemKe < 0);
		await expect(dongTab(page).filter({ hasText: r.sku }).first().locator('.text-red-600')).toBeVisible();
	});

	test('16_030_014 — Thẻ Cần rà soát có đúng hai bảng cảnh báo', async ({ page }) => {
		chanNeuTat('16_030_014');
		const ky = (await khoKy(page)).find((x) => (x.a.lechDoiChieu || []).length + (x.a.skuChuaGanNcc || []).length > 0) || (await khoKy(page)).find((x) => (x.s.xuat || []).length);
		await moKy(page, ky, 'audit');
		const pane = khung(page).locator('.ant-tabs-tabpane-active');
		const bangs = pane.locator('.ant-table');
		await expect(bangs).toHaveCount(2);
		await expect(pane).toContainText('Đơn bán lệch giữa thẻ kho và sổ công nợ');
		const tong = (ky.a.lechDoiChieu || []).length + (ky.a.skuChuaGanNcc || []).length;
		await expect(tabs(page).filter({ hasText: 'Cần rà soát' })).toHaveText(`Cần rà soát (${tong})`);
		const soDong = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
		expect(soDong, 'Số trên nhãn thẻ ≠ tổng dòng hai bảng').toBe(tong);
		ghi(`Kỳ ${ky.id}: lệch ${(ky.a.lechDoiChieu || []).length} · chưa gán ${(ky.a.skuChuaGanNcc || []).length}`);
		test.skip(tong === 0, 'Hai bảng + nhãn thẻ khớp, nhưng cả 36 kỳ đều 0 cảnh báo ⇒ chưa kiểm được bảng có dữ liệu.');
	});

	test('16_030_017 — Hộp xác nhận chốt kỳ nêu rõ số cảnh báo còn tồn', async ({ page }) => {
		chanNeuTat('16_030_017');
		const ky = await kyCo(page, (x) => x.status === 'OPEN' && (x.s.nxt || []).length, 'Đang gom số');
		const daGoi = await moKy(page, ky);
		await expect(nutChot(page)).toHaveText('Chốt kỳ');
		await nutChot(page).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Chốt kỳ đối soát?' });
		await expect(hop).toBeVisible();
		await expect(hop).toContainText('không mở lại được');
		await expect(hop.getByRole('button', { name: 'Chốt kỳ' })).toBeVisible();
		await expect(hop.getByRole('button', { name: 'Để sau' })).toBeVisible();
		const lech = (ky.a.lechDoiChieu || []).length;
		const chua = (ky.a.skuChuaGanNcc || []).length;
		const dongDo = hop.locator('.text-red-600');
		if (lech + chua > 0) await expect(dongDo).toHaveText(`Đang còn ${lech} đơn lệch đối chiếu và ${chua} dòng chưa gán nhà cung cấp. Nên xử lý trước khi chốt.`);
		else await expect(dongDo, 'Không có cảnh báo mà hộp vẫn hiện dòng đỏ').toHaveCount(0);
		await hop.getByRole('button', { name: 'Để sau' }).click();
		await expect(hop).toBeHidden();
		expect(daGoi, 'Mở hộp chốt kỳ đã gửi request ghi').toEqual([]);
		test.skip(lech + chua === 0, `Hộp đạt (tiêu đề, một chiều, 2 nút); kỳ ${ky.id} không còn cảnh báo nên dòng đỏ đếm số chưa kiểm được — 36/36 kỳ đều 0 cảnh báo.`);
	});

	test('16_030_023 — Chốt kỳ là thao tác một chiều', async ({ page }) => {
		chanNeuTat('16_030_023');
		const ky = await kyCo(page, (x) => x.status === 'LOCKED', 'Đã chốt');
		await moKy(page, ky);
		const nut = (await khung(page).getByRole('button').allInnerTexts()).map(chuan).filter(Boolean);
		ghi(`Kỳ ${ky.id} (LOCKED): nút ${nut.join(' | ')}`);
		for (const n of nut) expect(n, `Kỳ đã chốt có nút "${n}" — nghi mở lại / xoá biên bản`).not.toMatch(/mở lại|mở khoá|huỷ chốt|hủy chốt|xoá biên bản|xóa biên bản/i);
		await expect(nutChot(page)).toHaveText('Kỳ đã chốt');
		await expect(nutChot(page)).toBeDisabled();
	});

	test('16_030_024 — Kỳ đã chốt không còn nút chốt', async ({ page }) => {
		chanNeuTat('16_030_024');
		for (const [tt, nhan, bat] of [['OPEN', 'Chốt kỳ', true], ['LOCKED', 'Kỳ đã chốt', false], ['INVOICED', 'Đã ghi nợ', false]]) {
			const ky = await kyCo(page, (x) => x.status === tt, `trạng thái ${tt}`);
			await moKy(page, ky);
			await expect(nutChot(page)).toHaveText(nhan);
			if (bat) await expect(nutChot(page)).toBeEnabled();
			else await expect(nutChot(page)).toBeDisabled();
			ghi(`${tt} (kỳ ${ky.id}): "${nhan}" ${bat ? 'bật' : 'khoá'}`);
		}
	});

	test('16_030_027 — Đóng hộp xác nhận chốt kỳ không chốt gì', async ({ page }) => {
		chanNeuTat('16_030_027');
		const ky = await kyCo(page, (x) => x.status === 'OPEN' && (x.s.nxt || []).length, 'Đang gom số');
		const daGoi = await moKy(page, ky);
		await nutChot(page).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Chốt kỳ đối soát?' });
		await expect(hop).toBeVisible();
		await hop.getByRole('button', { name: 'Để sau' }).click();
		await expect(hop).toBeHidden();
		expect(daGoi.filter((x) => /\/lock$/.test(x)), 'Bấm "Để sau" mà vẫn gửi POST .../lock').toEqual([]);
		await expect(nutChot(page)).toHaveText('Chốt kỳ');
		await expect(nutChot(page)).toBeEnabled();
		// Trạng thái thật ở backend không đổi. 🚫 page.reload(): mất token RAM ⇒ header bắt lại là token cũ ⇒ 401.
		const st = k.batHeader(page);
		await moTrang(page, `${ROUTE}/${ky.id}`, VAI);
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
		expect((await k.goiApi(page, st, `/consignment-recon/periods/${ky.id}`, {})).data?.status).toBe('OPEN');
	});

	test('16_020_011 — Kỳ tất toán không có giao dịch bán nên cột tiền trống', async ({ page }) => {
		chanNeuTat('16_020_011');
		const ky = await kyCo(page, (x) => x.settlement && (x.s.nxt || []).length, 'tất toán có dòng NXT');
		await moKy(page, ky);
		await expect(khung(page).locator('.ant-page-header-heading-title .ant-tag').filter({ hasText: 'Kỳ tất toán' })).toBeVisible();
		await expect(khung(page).locator('.ant-tabs-tabpane-active .ant-alert').first()).toHaveText('Kỳ tất toán không có giao dịch bán — các cột tiền để trống là đúng thiết kế.');
		const cot = await cotTab(page);
		const iTien = ['Thành tiền trước thuế', 'Thành tiền sau thuế'].map((c) => cot.indexOf(c));
		for (const i of iTien) expect(i, 'Thẻ NXT thiếu cột thành tiền').toBeGreaterThanOrEqual(0);
		for (const r of ky.s.nxt) {
			expect(r.xuatBan ?? 0, `Kỳ tất toán có xuất bán (${r.sku})`).toBe(0);
			const o = (await dongTab(page).filter({ hasText: r.sku }).first().locator('td').allInnerTexts()).map(chuan);
			for (const i of iTien) expect(['—', '-', ''], `Ô tiền ${cot[i]} của ${r.sku} = "${o[i]}"`).toContain(o[i]);
		}
		ghi(`Kỳ tất toán ${ky.id}: ${ky.s.nxt.length} dòng, cột tiền trống`);
	});

	// ───────── Bổ sung 25/09/2026 (phiên làn 7 nối tiếp) — 030 phần ĐỌC ─────────
	/** Dòng chứng từ (nhập + xuất) của mọi kỳ thoả `dk` ⇒ { ky, tab, r } đầu tiên. */
	const dongChungTu = async (page, dk) => {
		for (const ky of await khoKy(page)) {
			for (const [tab, ds] of [['export', ky.s.xuat || []], ['import', ky.s.nhap || []]]) {
				const r = ds.find(dk);
				if (r) return { ky, tab, r };
			}
		}
		return null;
	};
	const oCot = async (page, row, ten) => {
		const c = await cotTab(page);
		const i = c.indexOf(ten);
		expect(i, `Bảng thiếu cột "${ten}" (${c.join(' | ')})`).toBeGreaterThanOrEqual(0);
		return row.locator('td').nth(i);
	};

	test('16_030_006 — Ô tiền để trống khác hẳn số 0', async ({ page }) => {
		chanNeuTat('16_030_006');
		const x = await dongChungTu(page, (r) => r.unitPrice == null);
		test.skip(!x, 'Không kỳ nào có dòng chứng từ chưa đóng dấu giá (36 kỳ TCT).');
		await moKy(page, x.ky, x.tab);
		const row = dongTab(page).filter({ hasText: x.r.sku }).first();
		const gia = chuan(await (await oCot(page, row, 'Đơn giá')).innerText());
		const tien = chuan(await (await oCot(page, row, 'Thành tiền trước thuế')).innerText());
		ghi(`kỳ ${x.ky.id} ${x.tab} ${x.r.sku}: Đơn giá "${gia}" · Thành tiền "${tien}"`);
		expect(gia).toBe('Chưa có giá');
		expect(tien).toBe('—');
	});

	// 16_030_007 chuyển sang nguon-gia.tct.spec.js (28/09): cần CHỐT THẬT hai kỳ riêng của làn (seed 18) — file này chặn mọi request ghi.


	test('16_030_009 — Cột Số dòng là số dòng chứng từ đã gộp, không phải số đơn hàng', async ({ page }) => {
		chanNeuTat('16_030_009');
		const x = await dongChungTu(page, () => true);
		test.skip(!x, 'Không kỳ nào có dòng chứng từ.');
		await moKy(page, x.ky, 'export');
		const th = bangTab(page).locator('.ant-table-thead th').filter({ hasText: 'Số dòng' }).first();
		await th.locator('.anticon-info-circle').hover();
		const tip = page.locator('.ant-tooltip:not(.ant-tooltip-hidden)').last();
		await expect(tip).toContainText('Số dòng trên Thẻ kho đã gộp vào dòng này.');
		await expect(tip).toContainText('cùng đơn giá và nguồn giá');
		await expect(tip).toContainText('Không phải số đơn hàng');
	});

	test('16_030_010 — Nhãn nhiều mức thuế cảnh báo phải tách dòng', async ({ page }) => {
		chanNeuTat('16_030_010');
		const x = await dongChungTu(page, (r) => (r.soVatPhanBiet ?? 0) > 1);
		test.skip(!x, 'Không mặt hàng nào phát sinh nhiều mức thuế suất trong một kỳ (36 kỳ TCT).');
		await moKy(page, x.ky, x.tab);
		const o = await oCot(page, dongTab(page).filter({ hasText: x.r.sku }).first(), 'Thuế');
		await expect(o.locator('.ant-tag')).toContainText('(nhiều mức)');
		await o.locator('.ant-tag').hover();
		await expect(page.locator('.ant-tooltip:not(.ant-tooltip-hidden)').last()).toContainText(`Mặt hàng này phát sinh ${x.r.soVatPhanBiet} mức thuế suất khác nhau trong kỳ`);
	});

	test('16_030_013 — Thừa kiểm kê chỉ điều chỉnh số lượng, không phát sinh tiền', async ({ page }) => {
		chanNeuTat('16_030_013');
		let x = null;
		for (const ky of await khoKy(page)) {
			const r = (ky.s.kiemKe || []).find((d) => Number(d.quantity) > 0);
			if (r) {
				x = { ky, r };
				break;
			}
		}
		test.skip(!x, 'Không kỳ nào có chênh lệch kiểm kê DƯƠNG (thừa) — chỉ có kiểm kê thiếu.');
		await moKy(page, x.ky, 'stockCheck');
		await expect(khung(page).locator('.ant-tabs-tabpane-active .ant-alert').first()).toContainText('Số dương là thừa, chỉ điều chỉnh số lượng, không phát sinh tiền.');
		const n = (x.ky.s.nxt || []).find((d) => d.sku === x.r.sku);
		ghi(`kỳ ${x.ky.id} ${x.r.sku}: kiểm kê +${x.r.quantity}, tiền dòng ${x.r.amountAfterVat} · NXT slPhaiTra=${n?.slPhaiTra} xuatBan=${n?.xuatBan} chenh=${n?.chenhLechKiemKe}`);
		expect(Number(x.r.amountAfterVat ?? 0), 'Dòng thừa kiểm kê phát sinh tiền').toBe(0);
	});

	test('16_030_015 — Bung số liệu một mặt hàng theo cây đơn vị', async ({ page }) => {
		chanNeuTat('16_030_015');
		const ky = await kyCo(page, (x) => (x.s.nxt || []).some((r) => r.xuatBan || r.nhap), 'có mặt hàng phát sinh');
		await moKy(page, ky);
		const r = ky.s.nxt.find((d) => d.xuatBan || d.nhap);
		const row = dongTab(page).filter({ hasText: r.sku }).first();
		const nut = row.getByRole('button', { name: /^Xem theo / });
		await expect(nut).toBeVisible();
		const cho = page.waitForResponse((x) => /\/consignment-recon\/periods\/\d+\/summary(-v2)?\/by-org|by-org/.test(x.url()), { timeout: 60_000 });
		await nut.click();
		const b = await (await cho).json();
		const ds = b?.data || [];
		const dr = page.locator('.ant-drawer-open').filter({ hasText: `Nhập xuất tồn theo` }).last();
		await expect(dr).toBeVisible();
		const tong = (a, f) => a.reduce((s, d) => s + Number(d[f] || 0), 0);
		ghi(`${r.sku}: NXT tồn cuối ${r.tonCuoi} · by-org ${ds.length} dòng Σtồn cuối ${tong(ds, 'tonCuoi')} · ${JSON.stringify(ds[0] || {}).slice(0, 200)}`);
		expect(ds.length, 'Bung theo đơn vị ra rỗng').toBeGreaterThan(0);
		// Tổng cấp đơn vị = số của dòng mặt hàng ở bảng NXT (so tồn đầu / nhập / xuất bán / tồn cuối).
		for (const f of ['tonDau', 'nhap', 'xuatBan', 'tonCuoi']) expect(tong(ds, f), `Σ ${f} theo đơn vị ≠ dòng NXT`).toBe(Number(r[f] || 0));
		const nutDb = dr.getByRole('button', { name: 'Xem điểm bán' });
		ghi(`đơn vị: ${ds.map((d) => `${d.tenDonVi || d.maDonVi || d.nhom || '?'}(${d.maDonVi ?? d.nhom ?? '-'})`).join(', ')} · nút Xem điểm bán: ${await nutDb.count()}`);
		test.skip((await nutDb.count()) === 0, `Tổng cấp đơn vị khớp dòng NXT; không bung tiếp được xuống điểm bán vì dòng đơn vị không có mã/nhóm (${JSON.stringify(ds.map((d) => ({ ten: d.tenDonVi, ma: d.maDonVi, nhom: d.nhom })))}).`);
		const cho2 = page.waitForResponse((x) => /by-org|nxt-by-shop|consignment-report\/.*shop/.test(x.url()) && x.request().method() === 'GET', { timeout: 60_000 });
		await nutDb.first().click();
		const res2 = await cho2;
		const ds2 = (await res2.json())?.data || [];
		const dr2 = page.locator('.ant-drawer-open').filter({ hasText: 'Nhập xuất tồn theo điểm bán' }).last();
		await expect(dr2).toBeVisible();
		const u2 = new URL(res2.url());
		ghi(`điểm bán: ${u2.pathname}${u2.search} ⇒ ${ds2.length} dòng Σtồn cuối ${tong(ds2, 'tonCuoi')} (đơn vị ${tong(ds, 'tonCuoi')})`);
		expect(ds2.length, `Bung "${ds[0]?.tenDonVi}" (tồn cuối ${tong(ds, 'tonCuoi')}) xuống điểm bán ra RỖNG`).toBeGreaterThan(0);
		expect(tong(ds2, 'tonCuoi'), 'Σ tồn cuối theo điểm bán ≠ cấp đơn vị').toBe(tong(ds, 'tonCuoi'));
	});

	test('16_030_016 — Dữ liệu bung tới điểm bán chỉ lưu 2 năm', async ({ page }) => {
		chanNeuTat('16_030_016');
		const moc = Date.now() - 2 * 365 * 86400_000;
		const ky = (await khoKy(page)).find((x) => x.status !== 'OPEN' && Number(new Date(x.periodTo)) < moc);
		test.skip(!ky, 'Chuỗi chưa có kỳ đã chốt nào cũ hơn 2 năm (kỳ cũ nhất bắt đầu 2026).');
	});

	test('16_030_028 — Chốt kỳ thất bại hiện thông báo backend', async ({ page }) => {
		chanNeuTat('16_030_028');
		// moKy chặn MỌI request ghi (POST .../lock trả 403 kèm chuỗi) ⇒ không kỳ nào bị chốt thật.
		const ky = await kyCo(page, (x) => x.status === 'OPEN', 'Đang gom số');
		const daGoi = await moKy(page, ky);
		const chot = async () => {
			await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
			await nutChot(page).click();
			const hop = page.getByRole('dialog').filter({ hasText: 'Chốt kỳ đối soát?' });
			await hop.getByRole('button', { name: 'Chốt kỳ' }).click();
			await page.locator('.ant-message-notice').first().waitFor({ timeout: 10_000 });
			return chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
		};
		const t1 = await chot();
		// Lượt 2: BE lỗi không kèm chuỗi.
		await page.route(/consignment-recon\/periods\/\d+\/lock/, (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: { code: 'SSHOP-500' } }) }));
		const t2 = await chot();
		ghi(`có chuỗi: "${t1}" · không chuỗi: "${t2}" · request bị chặn: ${daGoi.join(', ')}`);
		expect(t1).toContain('Bị auto test chặn');
		expect(t2).toContain('Không chốt được kỳ đối soát');
		expect(daGoi.some((x) => /\/lock$/.test(x)), 'Không bấm tới được POST lock').toBe(true);
	});

	test('16_030_003 — Lọc đơn vị áp cho cả bảng số liệu lẫn khối cảnh báo', async ({ page }) => {
		chanNeuTat('16_030_003');
		// Kỳ có số liệu ở ≥ 2 đơn vị (đo bằng by-org của mặt hàng đầu tiên).
		let chon = null;
		const st0 = k.batHeader(page);
		for (const ky of (await khoKy(page)).filter((x) => x.status === 'OPEN' && (x.s.nxt || []).length)) {
			await expect.poll(() => Boolean(st0.h), { timeout: 30_000 }).toBe(true);
			const dv = (await k.goiApi(page, st0, `/consignment-recon/periods/${ky.id}/summary/by-org`, { sku: ky.s.nxt[0].sku })).data || [];
			const coMa = dv.filter((d) => d.maDonVi);
			if (dv.length >= 2 && coMa.length) {
				chon = { ky, dv, don: coMa[0] };
				break;
			}
		}
		test.skip(!chon, 'Không kỳ Đang gom số nào có số liệu ở ≥ 2 đơn vị (mọi phát sinh ký gửi dồn ở nhóm Tổng công ty).');
		await moKy(page, chon.ky);
		const reqs = [];
		page.on('request', (r) => /\/consignment-recon\/periods\/\d+\/(summary|audit)/.test(r.url()) && reqs.push(r.url()));
		await khung(page).locator('.ant-select').first().click();
		const dr = page.locator('.ant-drawer-open').last();
		await dr.getByText(chon.don.tenDonVi, { exact: true }).first().click();
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await expect(khung(page).getByRole('button', { name: 'Bỏ lọc' })).toBeVisible({ timeout: 20_000 });
		await page.waitForTimeout(3_000);
		const loc = reqs.filter((u) => u.includes(chon.don.maDonVi));
		ghi(`kỳ ${chon.ky.id} lọc ${chon.don.tenDonVi} (${chon.don.maDonVi}) · request: ${reqs.map((u) => new URL(u).pathname.split('/').pop() + new URL(u).search).join(' | ')}`);
		expect(loc.some((u) => /\/summary/.test(u)), 'Bảng số liệu không lọc theo đơn vị').toBe(true);
		expect(loc.some((u) => /\/audit/.test(u)), 'Khối cảnh báo (audit) KHÔNG lọc theo đơn vị — hai khối nói về hai tập dữ liệu khác nhau').toBe(true);
	});
});
