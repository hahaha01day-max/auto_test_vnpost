'use strict';

/**
 * 18_1 nhóm 020 — tìm & thêm hàng vào giỏ (vai `gdv`, điểm bán seed của làn).
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): `SearchProduct.jsx` (AutoComplete `#product-search`, tiêu chí
 * Tên/SKU/Barcode, API `GET /products/{shopId}/spa-products/-1/v1.2?productName=`, rỗng ⇒ "Không tìm
 * thấy kết quả nào phù hợp") · `CreateOrderPage.jsx:1080-1140` (cảnh báo hết hàng / vượt tồn CHỈ cảnh
 * báo, vẫn thêm; khách lẻ + dịch vụ nhiều buổi / combo liệu trình bị chặn) · F7 lưu nháp
 * (`POST /spa/orders/draft/v2`).
 *
 * Dữ liệu seed (đo 25/09): TC tồn ~485 · FIFO ~100 · BT Đỏ-Hộp tồn 8 · TD2 hết hàng, không giá.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('./pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, dongBill, sp } = p;
const TD2 = `${require('../../00_seed/seed-state').PREFIX}SP_TD2`;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const goiY = (page) => page.locator('.order-search-product:not(.ant-select-dropdown-hidden)').last();
const roi = (page) => page.mouse.move(600, 700);

/** Gõ vào ô tìm (tiêu chí hiện tại), chờ response spa-products. */
async function go(page, tu) {
	const cho = page.waitForResponse((r) => r.url().includes('/spa-products/') && r.request().method() === 'GET', { timeout: 20_000 }).catch(() => null);
	await p.oTim(page).click();
	await p.oTim(page).fill(tu);
	const res = await cho;
	await page.waitForTimeout(1_200);
	return res;
}

/** Thông báo antd xuất hiện sau hành động. */
async function tbSau(page, fn, cho = 5_000) {
	await fn();
	const n = page.locator('.ant-message-notice');
	await n.first().waitFor({ state: 'visible', timeout: cho }).catch(() => null);
	return chuan((await n.allInnerTexts()).join(' | '));
}

const oSl = (row) => row.locator('input').first();

async function datSl(page, row, sl) {
	const o = oSl(row);
	await o.click();
	await o.fill(String(sl));
	await o.press('Tab');
	await page.waitForTimeout(800);
}

/** Chọn dòng gợi ý có đủ các chuỗi `can` (tên + biến thể/ĐVT). */
async function chonGoiY(page, ...can) {
	let muc = goiY(page).locator('.ant-select-item-option');
	for (const c of can) muc = muc.filter({ hasText: c });
	await expect(muc.first(), `Không có gợi ý khớp ${can.join(' + ')}`).toBeVisible({ timeout: 15_000 });
	await muc.first().click();
}

async function chonTieuChi(page, ten) {
	await roi(page);
	await page.locator('.ant-tabs-nav .ant-select').first().click();
	await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${ten}$`) }).click();
}

/** Lưu nháp bằng F7; trả body response. */
async function luuNhap(page) {
	await roi(page);
	await page.locator('body').click({ position: { x: 600, y: 650 } });
	const cho = page.waitForResponse((r) => /\/spa\/orders\/draft\/v2|\/orders\/draft\/body\//.test(r.url()) && r.request().method() !== 'GET', { timeout: 30_000 });
	await page.keyboard.press('F7');
	return (await cho).json();
}

/** Mở khối "Sản phẩm bán chạy" (danh sách thẻ sản phẩm + lọc danh mục). */
async function moKhoi(page) {
	await roi(page);
	const nut = page.getByRole('button', { name: 'Sản phẩm bán chạy' });
	if (await nut.isVisible().catch(() => false)) await nut.click();
	await expect(page.locator('#product-sub-category')).toBeVisible({ timeout: 15_000 });
}
/** Lọc khối theo danh mục seed của làn. */
async function locDm(page) {
	const ten = require('../../00_seed/seed-state').doc().duLieu.sanPham.tenDanhMuc;
	const cho = page.waitForResponse((r) => /spa-products|product/.test(r.url()) && r.request().method() === 'GET', { timeout: 20_000 }).catch(() => null);
	await page.locator('#product-sub-category').click();
	await page.locator('#product-sub-category').fill(ten);
	await page.locator('.ant-select-tree-title, .ant-select-tree-node-content-wrapper').filter({ hasText: new RegExp(`^${ten}$`) }).first().click();
	await page.keyboard.press('Escape');
	await cho;
	await page.waitForTimeout(1_500);
	return ten;
}
/** Thẻ sản phẩm trong khối (vùng phía trên bảng hàng). */
const theSp = (page, ten) => page.getByText(ten, { exact: true }).filter({ hasNot: page.locator('td') }).first();

test.describe('18_1 — Tìm & thêm hàng', () => {
	test.describe.configure({ timeout: 180_000 });
	let st;

	test.beforeEach(async ({ page }) => {
		st = await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await p.donTab(page).catch(() => null);
	});

	test('18_1_020_001 — Tạo đơn bằng cách tìm sản phẩm ở ô tìm kiếm', async ({ page }) => {
		chanNeuTat('18_1_020_001');
		const r = await p.them(page, sp().tc);
		expect(r.dong, 'Không thêm được vào giỏ').toBeTruthy();
		const row = dongBill(page).filter({ hasText: sp().tc }).first();
		await expect(oSl(row)).toHaveValue('1');
		const b = await luuNhap(page);
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		const id = b?.data?.orderId ?? b?.data?.id ?? b?.data;
		expect(id, `Lưu nháp không trả mã đơn: ${JSON.stringify(b?.data).slice(0, 200)}`).toBeTruthy();
		const x = await p.donTrongDs(page, st, id);
		test.info().annotations.push({ type: 'đơn nháp', description: `orderId ${id} · ${JSON.stringify(x && { code: x.orderCode, status: x.status })}` });
		expect(x, `Không thấy đơn nháp ${id} ở danh sách đơn hôm nay`).toBeTruthy();
	});

	test('18_1_020_002 — Tạo đơn bằng cách chọn trong danh sách sản phẩm', async ({ page }) => {
		chanNeuTat('18_1_020_002');
		await moKhoi(page);
		await locDm(page);
		const the = theSp(page, sp().tc);
		await expect(the, `Danh sách sản phẩm không có thẻ "${sp().tc}"`).toBeVisible({ timeout: 20_000 });
		await the.click();
		await expect(dongBill(page).filter({ hasText: sp().tc })).toHaveCount(1);
		const b = await luuNhap(page);
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
	});

	test('18_1_020_004 — Ba tiêu chí tìm kiếm chuyển đổi được', async ({ page }) => {
		chanNeuTat('18_1_020_004');
		await roi(page);
		await page.locator('.ant-tabs-nav .ant-select').first().click();
		const ds = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(chuan);
		expect(ds).toEqual(['Tên', 'SKU', 'Barcode']);
		await page.keyboard.press('Escape');
		await expect(page.locator('.ant-tabs-nav .ant-select').first()).toHaveText('Tên');
	});

	test('18_1_020_005 — Đổi tiêu chí tìm thì xoá từ khoá và kết quả cũ', async ({ page }) => {
		chanNeuTat('18_1_020_005');
		await go(page, 'AUTO');
		await expect(goiY(page)).toBeVisible();
		await chonTieuChi(page, 'SKU');
		await expect(page.getByPlaceholder('Tìm kiếm theo SKU (F4)')).toHaveValue('');
		await expect(goiY(page).locator('.ant-select-item-option')).toHaveCount(0);
	});

	test('18_1_020_006 — Tìm sản phẩm tồn tại trong danh sách', async ({ page }) => {
		chanNeuTat('18_1_020_006');
		await go(page, sp().tc);
		const ds = goiY(page).locator('.ant-select-item-option');
		await expect(ds.first()).toBeVisible();
		const txt = (await ds.allInnerTexts()).map(chuan);
		expect(txt.some((t) => t.startsWith(sp().tc)), txt.join(' / ')).toBe(true);
		for (const t of txt) expect(t, 'Dòng gợi ý thiếu biến thể - đơn vị').toMatch(/ - \S+/);
	});

	test('18_1_020_007 — Tìm sản phẩm không tồn tại trong danh sách', async ({ page }) => {
		chanNeuTat('18_1_020_007');
		const res = await go(page, 'SANPHAMKHONGCO999');
		expect(res?.status()).toBe(200);
		await expect(goiY(page).locator('.ant-select-item-option')).toHaveCount(0);
		await expect(goiY(page)).toContainText('Không tìm thấy kết quả nào phù hợp');
	});

	test('18_1_020_008 — Tìm sản phẩm bằng một phần tên', async ({ page }) => {
		chanNeuTat('18_1_020_008');
		const giua = sp().tc.slice(3, 6); // "8_S"
		await go(page, giua);
		const txt = (await goiY(page).locator('.ant-select-item-option').allInnerTexts()).map(chuan);
		expect(txt.length, `Gõ "${giua}" không ra gợi ý`).toBeGreaterThan(0);
		for (const t of txt) expect(t.toLowerCase(), `Gợi ý không chứa "${giua}"`).toContain(giua.toLowerCase());
	});

	test('18_1_020_009 — Tìm sản phẩm không dấu', async ({ page }) => {
		chanNeuTat('18_1_020_009');
		// Tên có dấu có sẵn trong chuỗi (đo 25/09): "Bắp cải thảo kg".
		await go(page, 'bap cai');
		const txt = (await goiY(page).locator('.ant-select-item-option').allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'hành vi thật', description: `"bap cai" → ${txt.length} gợi ý: ${txt.slice(0, 3).join(' / ')}` });
		expect(txt.some((t) => /Bắp cải/i.test(t)), 'Gõ không dấu "bap cai" không ra "Bắp cải…"').toBe(true);
	});

	test('18_1_020_010 — Tìm sản phẩm bằng chuỗi toàn khoảng trắng', async ({ page }) => {
		chanNeuTat('18_1_020_010');
		const loi = [];
		page.on('response', (r) => { if (r.url().includes('/spa-products/') && r.status() >= 500) loi.push(r.status()); });
		await go(page, '     ');
		expect(loi).toEqual([]);
		await expect(page.locator('.ant-message-error')).toHaveCount(0);
	});

	test('18_1_020_011 — Tìm sản phẩm bằng ký tự đặc biệt', async ({ page }) => {
		chanNeuTat('18_1_020_011');
		const res = await go(page, "' OR 1=1 --");
		expect(res?.status(), 'Tìm ký tự đặc biệt trả lỗi server').toBeLessThan(500);
		await expect(goiY(page).locator('.ant-select-item-option')).toHaveCount(0);
		await expect(page.locator('body')).not.toContainText(/SQL|Exception|syntax/i);
	});

	test('18_1_020_012 — Thêm sản phẩm thủ công bằng click một lần', async ({ page }) => {
		chanNeuTat('18_1_020_012');
		await go(page, sp().fifo);
		await chonGoiY(page, sp().fifo);
		const row = dongBill(page).filter({ hasText: sp().fifo });
		await expect(row).toHaveCount(1);
		await expect(oSl(row.first())).toHaveValue('1');
	});

	test('18_1_020_013 — Click chọn cùng sản phẩm nhiều lần thì cộng dồn số lượng', async ({ page }) => {
		chanNeuTat('18_1_020_013');
		for (let i = 0; i < 3; i += 1) {
			await go(page, sp().fifo);
			await chonGoiY(page, sp().fifo);
		}
		const row = dongBill(page).filter({ hasText: sp().fifo });
		await expect(row).toHaveCount(1);
		await expect(oSl(row.first())).toHaveValue('3');
	});

	test('18_1_020_014 — Thêm sản phẩm từ khối Sản phẩm bán chạy', async ({ page }) => {
		chanNeuTat('18_1_020_014');
		await moKhoi(page);
		await locDm(page);
		const ten = sp().fifo;
		const mau = theSp(page, ten).locator('xpath=ancestor::*[contains(., "Giá:")][1]');
		await expect(mau).toBeVisible({ timeout: 20_000 });
		const txt = chuan(await mau.innerText());
		expect(txt, 'Thẻ sản phẩm thiếu giá').toMatch(/Giá: [\d.]+ đ/);
		expect(txt, 'Thẻ sản phẩm thiếu tồn kho theo đơn vị').toMatch(/Kho: \d+/);
		const truoc = await dongBill(page).count();
		await mau.click();
		await expect.poll(() => dongBill(page).count()).toBe(truoc + 1);
	});

	test('18_1_020_016 — Ẩn hiện khối Sản phẩm bán chạy', async ({ page }) => {
		chanNeuTat('18_1_020_016');
		const khoi = page.locator('#product-sub-category');
		await roi(page);
		const hien = await khoi.isVisible();
		if (!hien) await moKhoi(page);
		// Khi khối đang hiện, nút bật/tắt là icon ở cuối thanh (sau phân trang).
		const thanh = page.locator('div').filter({ has: page.getByText('Sản phẩm gộp') }).filter({ has: khoi }).last();
		await thanh.getByRole('button').last().click();
		await expect(khoi).toBeHidden();
		await expect(page.getByRole('button', { name: 'Sản phẩm bán chạy' })).toBeVisible();
		await moKhoi(page);
		await expect(khoi).toBeVisible();
	});

	test('18_1_020_017 — Hàng hết tồn chỉ CẢNH BÁO chứ không chặn thêm vào giỏ', async ({ page }) => {
		chanNeuTat('18_1_020_017');
		// TD2 seed: hết hàng (đo 25/09).
		await go(page, TD2);
		const muc = goiY(page).locator('.ant-select-item-option').filter({ hasText: 'Hết hàng' });
		await expect(muc.first()).toBeVisible();
		const ten = TD2;
		const tb = await tbSau(page, () => muc.first().click());
		expect(tb).toContain('Chú ý: Sản phẩm này đã hết hàng');
		await expect(dongBill(page).filter({ hasText: ten }), `🔴 Hết hàng mà KHÔNG thêm vào giỏ ("${tb}")`).toHaveCount(1);
	});

	test('18_1_020_018 — Số lượng vượt tồn kho chỉ CẢNH BÁO', async ({ page }) => {
		chanNeuTat('18_1_020_018');
		// BT Đỏ - Cái: tồn đo từ gợi ý (Hộp xem 030_006).
		await go(page, sp().bt);
		const muc = goiY(page).locator('.ant-select-item-option').filter({ hasText: 'Đỏ - Cái' }).first();
		const ton = Number((chuan(await muc.innerText()).match(/Kho: (\d+)/) || [])[1]);
		expect(ton, 'Không đọc được tồn BT Đỏ - Cái').toBeGreaterThan(0);
		await muc.click();
		const row = dongBill(page).filter({ hasText: sp().bt }).first();
		const tb = await tbSau(page, () => datSl(page, row, ton + 1));
		// Cảnh báo có thể chỉ hiện khi thêm bằng click (quickMode) — thử thêm tiếp 1 lần nếu chưa thấy.
		let tong = tb;
		if (!/vượt quá số lượng tồn kho/.test(tb)) {
			await go(page, sp().bt);
			tong += ` | ${await tbSau(page, () => goiY(page).locator('.ant-select-item-option').filter({ hasText: 'Đỏ - Cái' }).first().click())}`;
		}
		expect(tong).toContain('Chú ý: Số lượng đang vượt quá số lượng tồn kho');
		expect(Number(await oSl(row).inputValue()), 'Vượt tồn mà số lượng bị kẹp lại').toBeGreaterThan(ton);
	});

	test('18_1_020_025 — Khối tiền cập nhật ngay theo từng lần thêm hàng', async ({ page }) => {
		chanNeuTat('18_1_020_025');
		const t0 = await p.tongKet(page);
		expect(t0.truocVat).toBe(0);
		await expect(page.getByRole('button', { name: 'Thanh toán', exact: true })).toBeDisabled();
		await p.them(page, sp().tc);
		const t1 = await p.tongKet(page);
		await p.them(page, sp().fifo);
		const t2 = await p.tongKet(page);
		expect(t1.truocVat).toBe(100000);
		expect(t2.truocVat).toBe(200000);
		expect(t2.canThanhToan).toBeGreaterThan(t1.canThanhToan);
		await expect(page.getByRole('button', { name: 'Thanh toán', exact: true })).toBeEnabled();
		await expect(page.getByRole('button', { name: 'Thanh toán sau' })).toBeEnabled();
	});

	test('18_1_020_026 — Phím F3 F4 F6 đưa con trỏ vào ô tìm theo từng tiêu chí', async ({ page }) => {
		chanNeuTat('18_1_020_026');
		for (const [phim, nhan] of [['F4', 'SKU'], ['F6', 'Barcode'], ['F3', 'Tên']]) {
			await roi(page);
			await page.locator('body').click({ position: { x: 600, y: 650 } });
			await page.keyboard.press(phim);
			await expect(page.locator('.ant-tabs-nav .ant-select').first(), `${phim} không đổi tiêu chí`).toHaveText(nhan);
			expect(await page.evaluate(() => document.activeElement?.id), `${phim} không đưa con trỏ vào ô tìm`).toBe('product-search');
		}
	});

	test('18_1_020_021 — Hàng không nằm trong bảng giá nào KHÔNG thêm được', async ({ page }) => {
		chanNeuTat('18_1_020_021');
		// SP ngoài bảng giá điểm bán: hiện "Giá: 0 đ" trong gợi ý (TD2 của seed — không bảng giá).
		await go(page, TD2);
		const muc = goiY(page).locator('.ant-select-item-option').filter({ hasText: 'Giá: 0 đ' }).first();
		await expect(muc).toBeVisible();
		const tb = await tbSau(page, () => muc.click());
		test.info().annotations.push({ type: 'thông báo thật', description: tb || '(không thông báo)' });
		expect(tb).toContain('Sản phẩm không nằm trong bảng giá nào đang có hiệu lực tại điểm bán');
		await expect(dongBill(page).filter({ hasText: TD2 }), '🔴 SP ngoài bảng giá vẫn vào giỏ').toHaveCount(0);
	});

	/** Thêm SP theo tên qua gợi ý (dòng đầu khớp). */
	async function themTen(page, ten) {
		await go(page, ten);
		const muc = goiY(page).locator('.ant-select-item-option').filter({ hasText: ten }).first();
		await expect(muc, `Không có gợi ý "${ten}"`).toBeVisible({ timeout: 15_000 });
		return tbSau(page, () => muc.click());
	}

	test('18_1_020_022 — Không bán dịch vụ nhiều buổi cho khách lẻ', async ({ page }) => {
		chanNeuTat('18_1_020_022');
		test.skip(true, "Dịch vụ (CHAIN_PRODUCTS.type=1, vd \"VỆ SĨ\") KHÔNG hiện ở ô tìm màn bán hàng biến thể shop (đo 25/09) ⇒ không thêm được dịch vụ vào đơn để kiểm luật khách lẻ.");
		// "VỆ SĨ" — CHAIN_PRODUCTS.type = 1 (THERAPY = dịch vụ), KICH_HOAT (đo 25/09).
		await themTen(page, 'VỆ SĨ');
		const tb = await themTen(page, 'VỆ SĨ');
		expect(tb).toContain('Không thể bán dịch vụ nhiều buổi cho khách lẻ');
		const row = dongBill(page).filter({ hasText: 'VỆ SĨ' }).first();
		expect(Number(await oSl(row).inputValue())).toBe(1);
	});

	test('18_1_020_023 — Không bán combo liệu trình cho khách lẻ', async ({ page }) => {
		chanNeuTat('18_1_020_023');
		// "Combo test" — type = 10 (COMBO_PRODUCT). 🔴 `isProductService` chỉ coi combo là dịch vụ khi
		// BUSINESS ≠ SHOP ⇒ ở biến thể shop có thể KHÔNG chặn.
		const tb = await themTen(page, 'Combo test');
		test.info().annotations.push({ type: 'thông báo thật', description: tb || '(không thông báo)' });
		expect(tb).toContain('Không thể bán combo liệu trình cho khách lẻ');
	});

	test('18_1_020_024 — Gắn khách rồi thì bán được dịch vụ nhiều buổi', async ({ page }) => {
		chanNeuTat('18_1_020_024');
		test.skip(true, "Dịch vụ (CHAIN_PRODUCTS.type=1, vd \"VỆ SĨ\") KHÔNG hiện ở ô tìm màn bán hàng biến thể shop (đo 25/09) ⇒ không thêm được dịch vụ vào đơn để kiểm luật khách lẻ.");
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
		await themTen(page, 'VỆ SĨ');
		const tb = await themTen(page, 'VỆ SĨ');
		expect(tb).not.toContain('khách lẻ');
		const row = dongBill(page).filter({ hasText: 'VỆ SĨ' }).first();
		expect(Number(await oSl(row).inputValue())).toBe(2);
	});
});
