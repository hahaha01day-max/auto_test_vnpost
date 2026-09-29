'use strict';

/**
 * 04_1 · 020 — thẻ "Theo từng sản phẩm" và "Đã cài đặt" của màn Cài đặt cảnh báo, GHI THẬT trên
 * **điểm bán seed** `AUTO_SHOP_62391304` (vai `tct`, chọn phạm vi qua drawer ba cột).
 *
 * 🔴 Vì sao không chạy bằng `province` như kịch bản: tỉnh Lý Sơn có 0 sản phẩm và dưới xã chỉ có Hub
 *    (đo 23/09/2026). Hai case chỉ kiểm ô nhập và nút xoá, 🚫 không kiểm phạm vi ⇒ đổi vai là hợp lệ.
 * 🔴 Ô "Tìm kiếm sản phẩm" (`SelectStockRequestProduct`) gọi `basic-search-product-unit?productName=`
 *    — lọc theo **TÊN**, 🚫 không theo SKU. Gõ SKU là ra "Không tìm thấy sản phẩm". Kết quả nằm trong
 *    một popup `div` tự vẽ, 🚫 không phải `.ant-select-dropdown`.
 * 🔴 Chuỗi serial: `020_021` lưu ngưỡng cho một sản phẩm seed CHƯA cài, `020_018` xoá đúng cấu hình
 *    đó ⇒ dữ liệu trở về nguyên trạng. `020_021` đỏ giữa chừng thì `020_018` vẫn chạy để dọn.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { doc: soSeed } = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

const seed = soSeed().duLieu ?? {};
const TINH = seed.donVi?.tenTinh || 'AUTO_TINH_62391304';
const XA = seed.donVi?.tenXa || 'AUTO_XA_62391304';
const SHOP = seed.diemBan?.tenShop || 'AUTO_SHOP_62391304';
const UNG_VIEN = Object.values(seed.sanPham?.sanPhamTheoGiaVon ?? {}).map((x) => ({ ten: x.tenSanPham, sku: x.sku }));

const khung = (page) => page.locator('.ant-pro-page-container').first();

async function moCaiDatDiemBanSeed(page) {
	await moTrang(page, '/inventory/stock-alerts/settings', VAI);
	await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Cài đặt cảnh báo', { timeout: 30_000 });
	await khung(page).locator('.ant-select').filter({ hasText: /Chọn tổ chức|đơn vị/i }).first().click();
	const dr = page.locator('.ant-drawer-open').first();
	await expect(dr.locator('.ant-drawer-title')).toContainText('Chọn tổ chức');
	const col = (i) => dr.locator('.sp-column').nth(i);
	// 🔴 Mỗi cột có ô tìm RIÊNG; cột sau chỉ nạp sau khi cột trước có lựa chọn.
	await col(0).locator('input').first().fill(TINH);
	await col(0).locator('.sp-item', { hasText: TINH }).first().click();
	await col(1).locator('.sp-item', { hasText: XA }).first().click();
	await col(2).getByText(SHOP, { exact: true }).first().click();
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	await expect(dr).toBeHidden();
	await expect(khung(page).locator('.ant-select').first()).toContainText(SHOP, { timeout: 20_000 });
}

async function moThe(page, nhan) {
	await khung(page).locator('.ant-tabs-tab', { hasText: nhan }).first().locator('.ant-tabs-tab-btn').dispatchEvent('click');
	const p = khung(page).locator('.ant-tabs-tabpane-active').last();
	await page.waitForTimeout(1_500);
	return p;
}

async function theSo(page, nhan) {
	const o = khung(page).getByText(nhan, { exact: true }).first();
	const m = chuan(await o.locator('xpath=..').innerText()).match(/([\d.,]+)/);
	return m ? Number(m[1].replace(/[.,]/g, '')) : null;
}

/** Dòng ở thẻ "Đã cài đặt" của một SKU (tìm bằng ô tìm của thẻ). */
async function dongDaCai(page, sku) {
	const p = await moThe(page, 'Đã cài đặt');
	const cho = page.waitForResponse((r) => /stock\/warnings/.test(r.url()) && r.request().method() === 'GET', { timeout: 30_000 }).catch(() => null);
	await p.locator('input[placeholder="Tìm SKU, tên sản phẩm..."]').fill(sku);
	await p.locator('input[placeholder="Tìm SKU, tên sản phẩm..."]').press('Enter');
	await cho;
	await page.waitForTimeout(1_500);
	return p.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: sku });
}

let DA_CHON = null; // { ten, sku } do 020_021 cài — 020_018 xoá đúng nó

test.describe('04_1 · 020 — Ngưỡng theo từng sản phẩm (ghi thật, điểm bán seed)', () => {
	test.describe.configure({ mode: 'serial', timeout: 300_000 });

	test('04_1_020_021 — Biên giá trị Min / Max và ô số ngày', async ({ page }) => {
		chanNeuTat('04_1_020_021');
		test.skip(UNG_VIEN.length === 0, 'Sổ seed chưa có `sanPham.sanPhamTheoGiaVon`.');
		await moCaiDatDiemBanSeed(page);

		// Chọn sản phẩm seed CHƯA có cấu hình — 🚫 không ghi đè ngưỡng đang có.
		for (const u of UNG_VIEN) {
			if ((await (await dongDaCai(page, u.sku)).count()) === 0) {
				DA_CHON = u;
				break;
			}
		}
		test.skip(!DA_CHON, 'Cả 4 sản phẩm seed đều đã có ngưỡng — 🚫 không ghi đè cấu hình có sẵn.');

		const p = await moThe(page, 'Theo từng sản phẩm');
		const oTim = p.locator('input[placeholder="Tìm kiếm sản phẩm"]').first();
		await oTim.click();
		await oTim.fill(DA_CHON.ten);
		const pop = page.locator('div.absolute.shadow-2xl');
		await pop.locator('.cursor-pointer').filter({ hasText: DA_CHON.ten }).first().click({ timeout: 20_000 });
		await page.mouse.click(5, 5);
		const dong = p.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: DA_CHON.ten });
		await expect(dong, 'Chọn sản phẩm xong không có dòng để nhập ngưỡng').toHaveCount(1, { timeout: 15_000 });
		const o = dong.locator('.ant-input-number-input');
		const go = async (i, v) => {
			await o.nth(i).fill(v);
			await o.nth(i).blur();
			await page.waitForTimeout(300);
			return o.nth(i).inputValue();
		};

		// Min/Max: âm bị chặn (min=0), thập phân làm tròn 2 chữ số (precision=2).
		const am = await go(0, '-1');
		expect(Number(am || 0), `Ô Min nhận số âm: "${am}"`).toBeGreaterThanOrEqual(0);
		const le = await go(0, '10.555');
		expect(le, `Ô Min không làm tròn 2 chữ số thập phân: "${le}"`).toMatch(/^10\.5[56]$/);
		// Ô số ngày: 0–365, số nguyên (precision=0).
		expect(await go(2, '366'), 'Ô Chu kỳ đặt nhận 366 ngày').toBe('365');
		const ngayLe = await go(2, '10.5');
		expect(Number.isInteger(Number(ngayLe)), `Ô Chu kỳ đặt nhận số thập phân: "${ngayLe}"`).toBe(true);

		// Min = 0 lưu được.
		await go(0, '0');
		await go(1, '10');
		await go(2, '30');
		const cho = page.waitForResponse((r) => /\/shops\/\d+\/stock\/warnings/.test(r.url()) && r.request().method() === 'POST', { timeout: 60_000 });
		await p.getByRole('button', { name: /Lưu cài đặt/ }).click();
		const body = await (await cho).json().catch(() => null);
		expect(String(body?.status?.code), `Lưu ngưỡng thất bại: ${JSON.stringify(body?.status)}`).toBe('200');
		const d = await dongDaCai(page, DA_CHON.sku);
		await expect(d, 'Lưu xong không thấy dòng ở thẻ Đã cài đặt').toHaveCount(1);
		expect(chuan(await d.innerText()), 'Ngưỡng Min 0 không được lưu').toMatch(/\b0\b/);
	});

	test('04_1_020_018 — Xoá sản phẩm khỏi danh sách đã cài ngưỡng', async ({ page }) => {
		chanNeuTat('04_1_020_018');
		test.skip(!DA_CHON, 'Không có cấu hình do `04_1_020_021` tạo để xoá — 🚫 không xoá cấu hình có sẵn.');
		await moCaiDatDiemBanSeed(page);
		// 🔴 Thẻ số nạp SAU khi đổi phạm vi — đọc ngay là ra 0. Biết chắc có ≥1 cấu hình (do 021 tạo)
		//    ⇒ chờ thẻ "Đã cài ngưỡng" > 0; vẫn 0 sau 30s là thẻ số không phản ánh phạm vi điểm bán.
		await expect
			.poll(() => theSo(page, 'Đã cài ngưỡng'), {
				timeout: 30_000,
				message: `Điểm bán đang có cấu hình của ${DA_CHON.sku} mà thẻ "Đã cài ngưỡng" vẫn 0`,
			})
			.toBeGreaterThan(0);
		const daCai = await theSo(page, 'Đã cài ngưỡng');
		const chuaCai = await theSo(page, 'Chưa cài ngưỡng');
		const d = await dongDaCai(page, DA_CHON.sku);
		await expect(d, `Không thấy cấu hình của ${DA_CHON.sku} để xoá`).toHaveCount(1);

		await d.locator('button').last().click();
		const hop = page.locator('.ant-modal-confirm').last();
		await expect(hop).toContainText('Xác nhận xoá cấu hình?', { timeout: 15_000 });
		await expect(hop).toContainText(`Xoá ngưỡng cảnh báo của SKU ${DA_CHON.sku} - ${DA_CHON.ten}.`);
		const nutXoa = hop.getByRole('button', { name: 'Xoá' });
		await expect(nutXoa, 'Nút Xoá không có màu đỏ (danger)').toHaveClass(/dangerous|danger/);
		await expect(hop.getByRole('button', { name: 'Huỷ' })).toBeVisible();

		const cho = page.waitForResponse((r) => r.request().method() === 'DELETE' && /stock\/warnings/.test(r.url()), { timeout: 60_000 });
		await nutXoa.click();
		expect((await cho).status()).toBeLessThan(400);
		await expect.poll(async () => chuan((await page.locator('.ant-message').allInnerTexts()).join(' ')), { timeout: 15_000 }).toContain('Xoá cấu hình thành công');
		await expect(await dongDaCai(page, DA_CHON.sku), 'Dòng đã xoá vẫn còn').toHaveCount(0);
		DA_CHON = null;

		await moCaiDatDiemBanSeed(page);
		await expect.poll(() => theSo(page, 'Đã cài ngưỡng'), { timeout: 30_000, message: '"Đã cài ngưỡng" không giảm 1' }).toBe(daCai - 1);
		await expect.poll(() => theSo(page, 'Chưa cài ngưỡng'), { timeout: 30_000, message: '"Chưa cài ngưỡng" không tăng 1' }).toBe(chuaCai + 1);
	});
});
