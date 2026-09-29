'use strict';

/**
 * 04_2 — Tồn kho đầu kỳ, các case GHI THẬT (26/09/2026). Vai `seed_shop2` (= Cửa hàng trưởng điểm bán seed).
 *
 * 🔴 Lý do chặn cũ "mỗi điểm bán chỉ khai được MỘT lần" là SAI (memory `opening_balance_nhieu_lan_mot_diem_ban`, user xác nhận 23/09):
 *    BE chỉ chặn SP/biến thể đã có tồn đầu kỳ HOẶC đã có phiếu nhập ở kho đó ⇒ mỗi case dùng SP TẠM mới (`AUTO<làn>_SPT_TDK_*`, MAC hoặc FIFO)
 *    tạo bằng phiên phụ `tct` (`POST /chain/products`, khuôn 08 `sp-ghi.taoSpApi`). SP đã có giao dịch không xoá được — để lại, tên tiền tố rõ.
 * 🔴 File này KHÔNG bọc `chanGhiTon` (khác `ton-dau-ky.seed_shop2.spec.js`): `confirm` là hành vi cần kiểm. Case chỉ dựng bản xem trước thì
 *    huỷ bản xem trước ở finally (`huyXemTruocDangDo`) để lượt sau mở drawer đúng bước 1.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chon } = require('../../shared/db/otp');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');
const { API_UPLOAD, chuan, moMan, khung } = require('./opening-page');
const { moDrawerKhaiBao, taiTepMau, themNhieuDong, huyXemTruocDangDo } = require('./excel-fixture');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_shop2';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 1200) });
const hau = () => Date.now().toString().slice(-7);
const so = (t) => Number(String(t ?? '').replace(/[^\d-]/g, '') || 0);

/** SP tạm bằng API (phiên phụ tct). `stockType` MAC | FIFO. */
async function spTam(browser, stockType = 'MAC') {
	const t = await k.moPhienPhu(browser, 'tct', '/product/list');
	try {
		const h = hau();
		const sku = `${seed.PREFIX_MA}SPTTDK${stockType[0]}${h}`;
		const ten = `${seed.PREFIX}SPT_TDK_${stockType}_${h}`;
		const r = await k.goiGhi(t.page, t.st, 'POST', '/chain/products', {}, {
			productName: ten, sku, barCode: sku, accountingCode: sku, deductibleTaxPercent: 0, unit: 'Cái',
			categoryId: Number(seed.doc().duLieu.sanPham.idDanhMuc), categoryName: 'Sản phẩm', isTopping: false, distributionMethod: 'MUA_BAN',
			goodsMaterialType: 'KHONG_PHAN_LOAI', isLoyalty: true, price: 0, chainId: Number(t.st.h.chainid), type: 0, isSell: 1, attributes: [],
			options: [], variants: [], productUnits: [], images: [], imageUrl: [], description: 'AUTO TEST 04_2 — SP tạm tồn đầu kỳ', requireStock: true,
			quantityWarning: null, stockType, isSerialRequired: false, enableVat: true, vatPercent: 0, directTaxPercent: 0, pitTaxPercent: 0,
			specialProductCategory: null, isIngredient: false, clength: null, cwidth: null, cheight: null, active: true, status: 'KICH_HOAT',
			priceBeforeDiscount: 0, isComposite: false, secondaryBarCodes: [],
		});
		expect(String(r?.status?.code), `Tạo SP tạm lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
		const id = r?.data?.productId;
		const variantId = Number(chon(`select variant_id from CHAIN_PRODUCT_UNIT where product_id=${id} and variant_id is not null limit 1`, 'VNPOST_CORE'));
		return { id, sku, ten, variantId };
	} finally { await t.dong(); }
}

async function napFile(page, dsDong, tenFile) {
	const mau = await taiTepMau(page);
	const { duongDan } = await themNhieuDong(mau, dsDong, tenFile);
	const dr = await moDrawerKhaiBao(page);
	await expect(dr).toBeVisible({ timeout: 20_000 });
	let o = dr.locator('input[type="file"]').first();
	if ((await o.count()) === 0) await huyXemTruocDangDo(page, dr);
	o = dr.locator('input[type="file"]').first();
	const cho = page.waitForResponse((r) => r.url().includes(API_UPLOAD), { timeout: 120_000 });
	await o.setInputFiles(duongDan);
	await cho;
	await expect.poll(async () => oTongHop(dr, 'Tổng dòng'), { timeout: 180_000, message: 'Bản xem trước không xử lý xong' }).toBe(dsDong.length);
	return dr;
}
async function oTongHop(dr, nhan) {
	const o = dr.getByText(nhan, { exact: true }).first();
	if (!(await o.count())) return -1;
	return so(await o.locator('xpath=following-sibling::*[1]').innerText().catch(() => ''));
}
const dongXT = (dr) => dr.locator('.ant-table-tbody tr.ant-table-row');
const dongCua = async (dr, sku) => chuan(await dongXT(dr).filter({ hasText: sku }).first().innerText().catch(() => ''));

async function taoPhieu(page, dr) {
	const tb = new Set();
	const nghe = setInterval(async () => { for (const x of await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])) tb.add(chuan(x)); }, 200);
	await dr.getByRole('button', { name: 'Tạo phiếu nhập kho đầu kỳ' }).click();
	const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận tạo phiếu nhập tồn đầu kỳ?' });
	await expect(hop).toBeVisible({ timeout: 15_000 });
	const cho = page.waitForResponse((r) => /\/confirm(\?|$)/.test(r.url()), { timeout: 120_000 });
	await hop.getByRole('button', { name: /OK|Đồng ý|Xác nhận|Tạo/ }).last().click();
	const b = await (await cho).json().catch(() => null);
	await page.waitForTimeout(3_000);
	clearInterval(nghe);
	return { b, tb: [...tb].join(' | ') };
}
const ton = async (page, st, x) => ((await k.goiGhi(page, st, 'GET', '/stock/v2/batch-product', { shopId: seed.doc().duLieu.diemBan.shopId, productId: x.id, variantId: x.variantId, size: 500 }))?.data || []).map((l) => ({ lo: l.batchCode, ton: Number(l.remainQuantity), gia: Number(l.price) }));

/** Thẻ "Danh sách sản phẩm đã khai báo" là tab của PageContainer (bảng NGOÀI tabpanel); ô tìm theo TÊN SP. Trả chữ dòng của SP. */
async function dongDaKhai(page, ten) {
	await page.getByRole('tab', { name: 'Danh sách sản phẩm đã khai báo' }).first().click();
	await page.waitForTimeout(2_000);
	const o = khung(page).getByPlaceholder('Tìm theo tên sản phẩm / biến thể').first();
	await o.fill(ten);
	await o.press('Enter');
	await page.waitForTimeout(2_500);
	return chuan(await khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ten }).first().innerText().catch(() => ''));
}

test.describe('04_2 — Tồn kho đầu kỳ (GHI)', () => {
	test.describe.configure({ timeout: 420_000 });

	test('04_2_020_022 — Khai SP chưa có tồn kho: tạo phiếu và cộng tồn', async ({ page, browser }) => {
		chanNeuTat('04_2_020_022');
		const x = await spTam(browser, 'MAC');
		const st = k.batHeader(page);
		await moMan(page, VAI);
		const dr = await napFile(page, [{ SKU: x.sku, 'Số lượng': 5, 'Giá vốn': 10_000, 'Đơn vị': 'Cái' }], `tdk-022-${x.sku}.xlsx`);
		const dXt = await dongCua(dr, x.sku);
		const { b, tb } = await taoPhieu(page, dr);
		const tonSau = await ton(page, st, x);
		const dongDs = await dongDaKhai(page, x.ten);
		ghiDo(`${x.sku}: xem trước "${dXt}" · tạo phiếu ${JSON.stringify(b?.status)} · "${tb}" · tồn ${JSON.stringify(tonSau)} · danh sách đã khai "${dongDs}"`);
		expect(tb, 'Không báo "Đã tạo phiếu nhập tồn đầu kỳ thành công"').toContain('Đã tạo phiếu nhập tồn đầu kỳ thành công');
		expect(tonSau.reduce((t, l) => t + l.ton, 0), 'Tồn không tăng đúng 5').toBe(5);
		expect(dongDs, 'SP không có trong "Danh sách sản phẩm đã khai báo"').toContain(x.ten);
		expect(dongDs, 'Danh sách đã khai thiếu SL/giá vốn/tổng giá trị đúng').toMatch(/\b5\b.*10[.,]000.*50[.,]000/);
	});

	test('04_2_020_008 — Ghi nhận lượt khai báo đưa hàng vào danh sách đã khai báo', async ({ page, browser }) => {
		chanNeuTat('04_2_020_008');
		const a = await spTam(browser, 'MAC');
		const b2 = await spTam(browser, 'MAC');
		await moMan(page, VAI);
		const dr = await napFile(page, [
			{ SKU: a.sku, 'Số lượng': 3, 'Giá vốn': 20_000, 'Đơn vị': 'Cái' },
			{ SKU: b2.sku, 'Số lượng': 7, 'Giá vốn': 1_500, 'Đơn vị': 'Cái' },
		], `tdk-008-${a.sku}.xlsx`);
		const { b, tb } = await taoPhieu(page, dr);
		const ngay = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
		const dsd = {};
		for (const x of [a, b2]) dsd[x.sku] = await dongDaKhai(page, x.ten);
		ghiDo(`${a.sku}+${b2.sku}: ${JSON.stringify(b?.status)} "${tb}" · ngày ${ngay} · ${JSON.stringify(dsd)}`);
		expect(String(b?.status?.code)).toBe('200');
		for (const [x, re] of [[a, /\b3\b.*20[.,]000.*60[.,]000/], [b2, /\b7\b.*1[.,]500.*10[.,]500/]]) {
			const d = dsd[x.sku];
			expect(d, `${x.sku} không có / sai số trong danh sách đã khai`).toMatch(re);
			expect(d, `${x.sku} thiếu ngày khai báo hôm nay`).toContain(ngay);
		}
	});

	test('04_2_020_009 — Chặn khai báo lại sản phẩm đã khai tồn đầu kỳ', async ({ page, browser }) => {
		chanNeuTat('04_2_020_009');
		const cu = await spTam(browser, 'MAC');
		const moi = await spTam(browser, 'MAC');
		const st = k.batHeader(page);
		await moMan(page, VAI);
		// Lượt 1: khai SP `cu` thật.
		let dr = await napFile(page, [{ SKU: cu.sku, 'Số lượng': 2, 'Giá vốn': 5_000, 'Đơn vị': 'Cái' }], `tdk-009a-${cu.sku}.xlsx`);
		expect(String((await taoPhieu(page, dr)).b?.status?.code), 'Tiền đề: khai lượt 1 lỗi').toBe('200');
		const tonCu = await ton(page, st, cu);
		// Lượt 2: SP `cu` (đã khai) + SP `moi`.
		await page.reload();
		await moMan(page, VAI);
		dr = await napFile(page, [{ SKU: cu.sku, 'Số lượng': 9, 'Giá vốn': 5_000, 'Đơn vị': 'Cái' }, { SKU: moi.sku, 'Số lượng': 1, 'Giá vốn': 5_000, 'Đơn vị': 'Cái' }], `tdk-009b-${cu.sku}.xlsx`);
		try {
			const dCu = await dongCua(dr, cu.sku);
			const dMoi = await dongCua(dr, moi.sku);
			ghiDo(`dòng SP đã khai: "${dCu}" · dòng SP mới: "${dMoi}" · Lỗi ${await oTongHop(dr, 'Lỗi')} · Hợp lệ ${await oTongHop(dr, 'Hợp lệ')}`);
			expect(dCu, 'Dòng SP đã khai không bị đánh Lỗi').toMatch(/Lỗi/);
			expect(dCu, 'Ghi chú không nêu đã có tồn đầu kỳ / lịch sử nhập kho').toMatch(/tồn đầu kỳ|lịch sử nhập|nhập kho/i);
			expect(dMoi, 'Dòng SP chưa khai không hợp lệ').toMatch(/Hợp lệ/);
			expect(await ton(page, st, cu), 'Tồn SP đã khai bị ghi thêm').toEqual(tonCu);
		} finally { await huyXemTruocDangDo(page, dr).catch(() => null); }
	});

	test('04_2_020_011 — Upload SKU của sản phẩm ĐÃ có tồn kho', async ({ page }) => {
		chanNeuTat('04_2_020_011');
		// SP giá tiêu chuẩn seed: đang có tồn (nhập tay nhiều lần ở 04_3). Kỳ vọng kịch bản: Hợp lệ + CỘNG DỒN; BE (memory) chặn SP đã có phiếu nhập.
		const tc = seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan;
		await moMan(page, VAI);
		const dr = await napFile(page, [{ SKU: tc.sku, 'Số lượng': 1, 'Giá vốn': 60_000, 'Đơn vị': 'Cái', 'Mã lô': `A8TDK${hau()}` }], `tdk-011-${hau()}.xlsx`);
		try {
			const d = await dongCua(dr, tc.sku);
			ghiDo(`${tc.sku} (đang có tồn + phiếu nhập): dòng xem trước "${d}"`);
			expect(d, '🔴 SP đã có tồn kho bị đánh Lỗi — không cộng dồn được như kịch bản').toMatch(/Hợp lệ/);
		} finally { await huyXemTruocDangDo(page, dr).catch(() => null); }
	});

	test('04_2_020_013 — Mã lô theo phương pháp tính giá', async ({ page, browser }) => {
		chanNeuTat('04_2_020_013');
		const fifo = await spTam(browser, 'FIFO');
		const mac = await spTam(browser, 'MAC');
		await moMan(page, VAI);
		const dr = await napFile(page, [
			{ SKU: fifo.sku, 'Số lượng': 1, 'Giá vốn': 1_000, 'Đơn vị': 'Cái' },
			{ SKU: mac.sku, 'Số lượng': 1, 'Giá vốn': 1_000, 'Đơn vị': 'Cái' },
		], `tdk-013-${fifo.sku}.xlsx`);
		try {
			const dF = await dongCua(dr, fifo.sku);
			const dM = await dongCua(dr, mac.sku);
			// Sửa mã lô dòng MAC trong bản xem trước.
			const moiLo = `A8LO${hau()}`;
			let tbSua = '';
			const nutSua = dongXT(dr).filter({ hasText: mac.sku }).first().locator('button:has(.anticon-edit), .anticon-edit').first();
			if (await nutSua.count()) {
				await nutSua.click();
				const md = page.getByRole('dialog').filter({ hasText: /Sửa dòng/ }).last();
				await expect(md).toBeVisible({ timeout: 10_000 });
				await md.getByLabel('Mã lô').fill(moiLo);
				const nghe = page.locator('.ant-message-notice').filter({ hasText: 'Đã cập nhật dòng' }).first().waitFor({ timeout: 15_000 }).then(() => 'Đã cập nhật dòng').catch(() => '');
				await md.getByRole('button', { name: 'Lưu' }).click();
				tbSua = await nghe;
				await page.waitForTimeout(1_500);
			}
			const dM2 = await dongCua(dr, mac.sku);
			ghiDo(`FIFO không lô: "${dF}" · MAC không lô: "${dM}" · sửa mã lô MAC → ${moiLo}: "${tbSua}" · dòng sau "${dM2}" (nút sửa ${await nutSua.count()})`);
			expect(dF, 'FIFO thiếu mã lô mà không bị Lỗi').toMatch(/Lỗi/);
			expect(dM, 'MAC bỏ trống mã lô mà không hợp lệ (phải tự sinh)').toMatch(/Hợp lệ/);
			// MAC bỏ trống mã lô: bản xem trước để trống, mã lô tự sinh LÚC TẠO PHIẾU (04_2_020_022: lô `OB<shop>-<variant>-…`).
			expect(tbSua, 'Sửa mã lô không báo "Đã cập nhật dòng"').toContain('Đã cập nhật dòng');
			expect(dM2).toContain(moiLo);
		} finally { await huyXemTruocDangDo(page, dr).catch(() => null); }
	});

	test('04_2_020_018 — Bộ lọc trạng thái dòng trong bản xem trước', async ({ page, browser }) => {
		chanNeuTat('04_2_020_018');
		const x = await spTam(browser, 'MAC');
		await moMan(page, VAI);
		const dr = await napFile(page, [{ SKU: x.sku, 'Số lượng': 1, 'Giá vốn': 1_000, 'Đơn vị': 'Cái' }, { SKU: 'ZZZ-AUTO-LOC-1', 'Số lượng': 1, 'Giá vốn': 1_000, 'Đơn vị': 'Cái' }], `tdk-018-${x.sku}.xlsx`);
		try {
			// Bộ lọc = antd Select `STATUS_OPTIONS` cạnh ô "Tìm theo SKU / tên / mã lô" (DrawerOpeningBalance.jsx).
			const sel = dr.getByPlaceholder('Tìm theo SKU / tên / mã lô').locator('xpath=ancestor::div[contains(@class,"flex-wrap")][1]').locator('.ant-select').first();
			const kq = {};
			await sel.click();
			const nhan = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(chuan);
			await page.keyboard.press('Escape');
			for (const n of nhan) {
				await sel.click();
				await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${n}$`) }).click();
				await page.waitForTimeout(2_000);
				kq[n] = (await dongXT(dr).allInnerTexts()).map(chuan).filter((d) => !/Không có dữ liệu|No data/.test(d));
			}
			ghiDo(`nhãn lọc ${JSON.stringify(nhan)} · ${JSON.stringify(Object.fromEntries(Object.entries(kq).map(([a, v]) => [a, v.length])))}`);
			expect(nhan).toEqual(['Tất cả', 'Hợp lệ', 'Lỗi', 'Cảnh báo']);
			expect(kq['Hợp lệ'].every((d) => /Hợp lệ/.test(d)) && kq['Hợp lệ'].length === 1, 'Lọc Hợp lệ lẫn dòng khác').toBe(true);
			expect(kq['Lỗi'].every((d) => /Lỗi/.test(d)) && kq['Lỗi'].length === 1, 'Lọc Lỗi lẫn dòng khác').toBe(true);
			expect(kq['Tất cả'].length).toBe(2);
		} finally { await huyXemTruocDangDo(page, dr).catch(() => null); }
	});

	test('04_2_020_023 — File 1.000 dòng không bị cắt', async ({ page }) => {
		chanNeuTat('04_2_020_023');
		// 1.000 dòng SKU không tồn tại (đều Lỗi) ⇒ đo "Tổng dòng" không bị cắt, 🚫 không tạo phiếu (có dòng lỗi thì không tạo được).
		await moMan(page, VAI);
		const ds = Array.from({ length: 1000 }, (_, i) => ({ SKU: `ZZZ-AUTO-1K-${String(i).padStart(4, '0')}`, 'Số lượng': 1, 'Giá vốn': 1_000, 'Đơn vị': 'Cái' }));
		const t0 = Date.now();
		const dr = await napFile(page, ds, 'tdk-023-1000-dong.xlsx');
		try {
			const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])).join(' | '));
			ghiDo(`Tổng dòng ${await oTongHop(dr, 'Tổng dòng')} · Lỗi ${await oTongHop(dr, 'Lỗi')} · xử lý ${Math.round((Date.now() - t0) / 1000)}s · "${tb}" (vế tạo phiếu 1.000 dòng hợp lệ + cộng dồn: cần 1.000 SP chưa khai — không dựng)`);
			expect(await oTongHop(dr, 'Tổng dòng')).toBe(1000);
		} finally { await huyXemTruocDangDo(page, dr).catch(() => null); }
	});
	test('04_2_030_003 — Lượt Chờ xác nhận chưa vào danh sách sản phẩm đã khai', async ({ page, browser }) => {
		chanNeuTat('04_2_030_003');
		const x = await spTam(browser, 'MAC');
		await moMan(page, VAI);
		const tenFile = `tdk-030003-${x.sku}.xlsx`;
		const dr = await napFile(page, [{ SKU: x.sku, 'Số lượng': 4, 'Giá vốn': 2_000, 'Đơn vị': 'Cái' }], tenFile);
		try {
			// Vai tỉnh (phiên phụ): lọc "Chờ xác nhận", tìm lượt; rồi thẻ đã khai tìm SP.
			const { storageStateFor } = require('../../shared/auth/accounts');
			const ctx = await browser.newContext({ storageState: storageStateFor('province') });
			const pv = await ctx.newPage();
			try {
				await moMan(pv, 'province');
				await pv.waitForTimeout(2_000);
				const loc = khung(pv).locator('.ant-select').filter({ hasText: /Tất cả trạng thái/ }).first();
				await loc.click();
				await pv.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /^Chờ xác nhận$/ }).click();
				await pv.waitForTimeout(2_500);
				const sauLoc = (await khung(pv).locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map(chuan);
				// Bảng lượt không hiện tên file ⇒ nhận lượt theo điểm bán seed + SL 4 + giá trị 8.000 đ + trạng thái.
				const luot = sauLoc.filter((d) => d.includes(seed.doc().duLieu.diemBan.tenShop) && /\b4 8[.,]000 đ Chờ xác nhận\b/.test(d));
				const daKhai = await dongDaKhai(pv, x.ten);
				ghiDo(`sau lọc Chờ xác nhận (chưa tìm) ${sauLoc.length} dòng: ${JSON.stringify(sauLoc.slice(0, 3)).slice(0, 400)} · lượt của ${tenFile}: ${JSON.stringify(luot).slice(0, 300)} · thẻ đã khai tìm "${x.ten}": "${daKhai || 'không có'}"`);
				expect(luot.length, 'Vai tỉnh không thấy lượt Chờ xác nhận của điểm bán trực thuộc').toBeGreaterThan(0);
				expect(daKhai, '🔴 SP của lượt CHƯA xác nhận đã xuất hiện ở danh sách đã khai báo').toBe('');
			} finally { await ctx.close(); }
		} finally { await huyXemTruocDangDo(page, dr).catch(() => null); }
	});
});
