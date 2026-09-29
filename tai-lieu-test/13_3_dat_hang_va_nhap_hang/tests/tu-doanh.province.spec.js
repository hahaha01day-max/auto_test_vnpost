'use strict';

/**
 * 13_3 · 030 / 040 — TỈNH tự đặt hàng NCC cấp tỉnh cho sản phẩm TỰ DOANH, vai `province`.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/purchaseOrder/pages/{PurchaseOrderFormPage,PurchaseOrderListPage,
 * DirectDeliveryPendingListPage}.jsx`, `components/selectShopMultiple/SelectShopTree.jsx`.
 * Tiền đề: bước seed 14 (`00_seed/api-tests/14-tu-doanh-tinh.api.spec.js`) — NCC tỉnh `<tiền tố>NCC_TINH`, hợp đồng
 * ACTIVE, SP tự doanh `TD1` (có bảng giá mua phạm vi tỉnh) và `TD2` (map NCC, CHƯA có bảng giá).
 * Kịch bản có 2 bộ mã trùng nội dung (sheet NCC 030_023–026 / 040_010, sheet FUNC 030_053–056 / 040_020) ⇒ dùng chung phép kiểm.
 * 🔴 PO KHÔNG xoá được ⇒ một lượt chạy chỉ tạo MỘT PO (dùng chung cho 023/024/040_010), ghi chú `AUTO TEST 13_3`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { storageStateFor } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');
const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
const seed = require('../../00_seed/seed-state');
const po = require('./po-ghi');
const gt = require('./giao-thang-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const td = () => {
	const d = seed.doc().duLieu.tuDoanhTinh;
	if (!d?.priceListId) throw new Error(`Làn ${seed.PREFIX} chưa chạy bước seed 14 (tự doanh tỉnh) — xem 00_seed/api-tests/14-tu-doanh-tinh.api.spec.js`);
	return d;
};
const oTimSp = (page) => page.locator('.ant-pro-card').filter({ hasText: 'Danh sách sản phẩm' }).getByPlaceholder('Tìm kiếm sản phẩm');
const nutFooter = (page, nhan) => page.locator('.ant-pro-footer-bar button').filter({ hasText: new RegExp(`^${nhan}$`) });

/** Form tạo PO của tỉnh: kho HUB tỉnh làn · NCC tỉnh · hợp đồng NCC tỉnh · ngày · ghi chú (chưa thêm SP). */
async function moFormTinh(page) {
	await moTrang(page, `${po.BASE()}/inventory/purchase-order/create`, 'province');
	await expect(po.fi(page, 'Kho đặt hàng')).toBeVisible({ timeout: 30_000 });
	await po.chonKho(page, 'Kho đặt hàng');
	await expect(po.fi(page, 'Kho nhận hàng')).toContainText(po.HUB());
	await po.chonNcc(page, td().tenNcc, td().soHopDong);
	await po.chonNgay(page);
	await po.fi(page, 'Ghi chú').locator('textarea').fill(po.GHI_CHU);
}

let poTinh = null;
/** PO tỉnh gửi NCC tỉnh với SP `TD1` — tạo một lần mỗi lượt chạy. */
async function poTinhDaGui(page) {
	if (poTinh) return poTinh;
	await moFormTinh(page);
	const r = await po.themSp(page, td().sanPham.TD1.ten, 2);
	await expect(r, 'SP tự doanh có bảng giá mà không ra giá nhập').toContainText('50.000');
	const kq = await po.luu(page, 'Gửi nhà cung cấp');
	ghi(`Gửi NCC: "${kq.tb}" · ${kq.ma} · status ${kq.body?.status?.code}`);
	expect(String(kq.body?.status?.code), `Tỉnh gửi PO tự doanh lỗi: ${kq.body?.status?.message}`).toBe('200');
	expect(kq.ma, 'Response tạo PO không trả mã phiếu').toMatch(/^PO/);
	poTinh = kq;
	return kq;
}

test.describe('13_3 · tỉnh đặt hàng NCC tự doanh', () => {
	const kiem_023 = async (page) => {
		const kq = await poTinhDaGui(page);
		expect(kq.tb, 'Không có thông báo tạo PO thành công').toContain('Tạo phiếu đặt hàng thành công');
		expect(await po.trangThai(page, kq.ma, 'province')).toBe('Đã gửi NCC');
		// Phiếu mang đúng NCC tỉnh + kho HUB tỉnh — 🚫 chỉ tin mỗi thông báo.
		await po.moChiTiet(page, kq.ma, 'province');
		for (const t of [kq.ma, 'Đã gửi NCC', td().tenNcc, po.HUB(), td().sanPham.TD1.ten]) await expect(page.locator('main').first(), `Chi tiết PO thiếu "${t}"`).toContainText(t);
	};
	test('13_3_030_023 — Tạo phiếu đặt hàng NCC tại cấp Tỉnh', async ({ page }) => {
		chanNeuTat('13_3_030_023');
		test.setTimeout(300_000);
		await kiem_023(page);
	});
	test('13_3_030_053 — Tạo phiếu đặt hàng NCC tại cấp Tỉnh', async ({ page }) => {
		chanNeuTat('13_3_030_053');
		test.setTimeout(300_000);
		await kiem_023(page);
	});

	const kiem_024 = async (page, browser) => {
		const kq = await poTinhDaGui(page);
		// Tỉnh THẤY phiếu của mình (đối chứng) — thiếu bước này thì "TCT không thấy" có thể chỉ là tìm sai mã.
		await po.moDs(page, 'province');
		expect((await po.tim(page, kq.ma)).body?.data?.length, `Tỉnh không tìm thấy chính PO ${kq.ma}`).toBeGreaterThan(0);
		const ctx = await browser.newContext({ storageState: storageStateFor('tct') });
		try {
			const p = await ctx.newPage();
			await po.moDs(p, 'tct');
			const { body, url } = await po.tim(p, kq.ma);
			ghi(`TCT tìm ${kq.ma}: ${url.search} → ${body?.data?.length} dòng`);
			expect(String(body?.status?.code)).toBe('200');
			expect(body?.data || [], `TCT thấy PO tự doanh ${kq.ma} của tỉnh`).toEqual([]);
			await expect(po.dong(p).filter({ hasText: kq.ma })).toHaveCount(0);
		} finally { await ctx.close(); }
	};
	test('13_3_030_024 — Phiếu đặt hàng sản phẩm tự doanh của tỉnh không hiển thị ở TCT', async ({ page, browser }) => {
		chanNeuTat('13_3_030_024');
		test.setTimeout(300_000);
		await kiem_024(page, browser);
	});
	test('13_3_030_054 — Phiếu đặt hàng sản phẩm tự doanh của tỉnh không hiển thị ở TCT', async ({ page, browser }) => {
		chanNeuTat('13_3_030_054');
		test.setTimeout(300_000);
		await kiem_024(page, browser);
	});

	const kiem_025 = async (page) => {
		await moFormTinh(page);
		const timSp = async (kw) => {
			const cho = page.waitForResponse((r) => /\/supplier-products\/by-supplier/.test(r.url()) && new URL(r.url()).searchParams.get('keyword') === kw, { timeout: 20_000 });
			await oTimSp(page).click();
			await oTimSp(page).fill(kw);
			const b = await (await cho).json();
			await page.keyboard.press('Escape');
			return (b.data || []).map((x) => x.productName);
		};
		const tuDoanh = Object.values(td().sanPham).map((s) => s.ten);
		const tatCa = await timSp(seed.PREFIX);
		ghi(`Tìm "${seed.PREFIX}": ${tatCa.join(', ')}`);
		expect(tatCa.length, 'Ô tìm SP không ra sản phẩm nào').toBeGreaterThan(0);
		for (const t of tatCa) expect(tuDoanh, `Ô tìm SP của tỉnh ra SP không tự doanh "${t}"`).toContain(t);
		// SP tập trung của TCT (đã map NCC TCT, có bảng giá) 🚫 được hiện.
		const tct = po.SP().tenSanPham;
		expect(await timSp(tct), `Tỉnh đặt được SP tập trung "${tct}"`).toEqual([]);
	};
	test('13_3_030_025 — Kiểm tra cấp tỉnh chỉ được đặt hàng sản phẩm tự doanh', async ({ page }) => {
		chanNeuTat('13_3_030_025');
		test.setTimeout(300_000);
		await kiem_025(page);
	});
	test('13_3_030_055 — Kiểm tra cấp tỉnh chỉ được đặt hàng sản phẩm tự doanh', async ({ page }) => {
		chanNeuTat('13_3_030_055');
		test.setTimeout(300_000);
		await kiem_025(page);
	});

	const kiem_026 = async (page) => {
		await moFormTinh(page);
		const r = await po.themSp(page, td().sanPham.TD2.ten);
		ghi(`Dòng TD2: ${dx.chuan(await r.innerText())}`);
		await expect(r).toContainText('Chưa cài đặt');
		await expect(nutFooter(page, 'Gửi nhà cung cấp')).toBeDisabled();
		await expect(nutFooter(page, 'Lưu')).toBeDisabled();
		// Đối chứng: bỏ SP chưa có giá, thêm SP có giá ⇒ nút mở lại (khoá là do bảng giá, 🚫 do form thiếu trường).
		await r.locator('button').last().click();
		await expect(po.bangSp(page).locator('tbody tr.ant-table-row').filter({ hasText: td().sanPham.TD2.ten })).toHaveCount(0);
		await po.themSp(page, td().sanPham.TD1.ten);
		await expect(nutFooter(page, 'Gửi nhà cung cấp')).toBeEnabled();
	};
	test('13_3_030_026 — Kiểm tra không cho đặt hàng khi sản phẩm chưa có bảng giá map với NCC', async ({ page }) => {
		chanNeuTat('13_3_030_026');
		test.setTimeout(300_000);
		await kiem_026(page);
	});
	test('13_3_030_056 — Kiểm tra không cho đặt hàng khi sản phẩm chưa có bảng giá map với NCC', async ({ page }) => {
		chanNeuTat('13_3_030_056');
		test.setTimeout(300_000);
		await kiem_026(page);
	});

	const kiem_040_010 = async (page) => {
		const kq = await poTinhDaGui(page);
		await gt.moDsGiaoThang(page);
		const o = page.getByPlaceholder('Tìm theo mã PO...');
		const cho = page.waitForResponse((r) => /direct-deliver/i.test(r.url()) && r.url().includes(kq.ma), { timeout: 20_000 });
		await o.fill(kq.ma);
		await o.press('Enter');
		const b = await (await cho).json();
		ghi(`Giao thẳng tìm ${kq.ma}: ${JSON.stringify(b?.data)?.slice(0, 200)}`);
		expect(String(b?.status?.code)).toBe('200');
		expect(b?.data || [], `PO tỉnh tự đặt ${kq.ma} hiện ở "Phiếu nhập hàng từ NCC thuộc TCT"`).toEqual([]);
		await expect(page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: kq.ma })).toHaveCount(0);
	};
	test('13_3_040_010 — Kiểm tra không hiển thị phiếu tỉnh tự đặt hàng NCC', async ({ page }) => {
		chanNeuTat('13_3_040_010');
		test.setTimeout(300_000);
		await kiem_040_010(page);
	});
	test('13_3_040_020 — Kiểm tra không hiển thị phiếu tỉnh tự đặt hàng NCC', async ({ page }) => {
		chanNeuTat('13_3_040_020');
		test.setTimeout(300_000);
		await kiem_040_010(page);
	});
});
