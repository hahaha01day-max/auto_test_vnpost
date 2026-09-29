'use strict';

/**
 * Task 020 — màn **Cài đặt cảnh báo** (`/inventory/stock-alerts/settings`) nhìn từ **cấp con**.
 *
 * 🔴 Phải chạy bằng vai `province`: cấp `tct` KHÔNG có thẻ con theo cấp và KHÔNG có khối tham khảo
 * "Cấu hình Tổng công ty" (không có cấp trên để tham khảo). Chạy nhóm này bằng `tct` là pass giả.
 *
 * Đo 20/09/2026 với `qltls01`: hai thẻ trên cùng *Cảnh báo tồn kho* / *Cảnh báo hết hạn*; trong đó
 * có khối **Cấu hình Tổng công ty**, hai thẻ con **Sản phẩm của tỉnh** / **Sản phẩm của Tổng công
 * ty**, ba thẻ số **Tổng phân loại SP · Đã cài ngưỡng · Chưa cài ngưỡng**, và ba thẻ trong
 * **Cài đặt nhanh / Theo từng sản phẩm / Đã cài đặt**.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const { ROUTE_SETTINGS, blockWrites, skipNoData } = require('./alert-page');

const VAI = 'province';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const chanNeuTat = (id) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const khung = (page) => page.locator('.ant-pro-page-container').first();

async function moCaiDat(page) {
	await moTrang(page, ROUTE_SETTINGS, VAI);
	await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
		'Cài đặt cảnh báo',
		{ timeout: 30_000 },
	);
	await page.waitForTimeout(4_000);
}

/** Nhãn mọi thẻ (tab) đang có trên màn. */
const nhanThe = async (page) =>
	(await khung(page).locator('.ant-tabs-tab').allInnerTexts()).map((s) => chuan(s.split('\n')[0]));

/** Đổi sang một thẻ theo nhãn — 🔴 `.click()` trần không đổi tab, phải bắn sự kiện lên `-btn`. */
async function moThe(page, nhan) {
	await khung(page)
		.locator('.ant-tabs-tab', { hasText: nhan })
		.first()
		.locator('.ant-tabs-tab-btn')
		.dispatchEvent('click');
	await page.waitForTimeout(2_000);
}

/** Giá trị của một thẻ số (`Đã cài ngưỡng`…): số nằm ngay trên nhãn. */
async function theSo(page, nhan) {
	const o = khung(page).getByText(nhan, { exact: true }).first();
	if ((await o.count()) === 0) return null;
	const text = chuan(await o.locator('xpath=..').innerText());
	const m = text.match(/([\d.,]+)/);
	return m ? Number(m[1].replace(/[.,]/g, '')) : null;
}

test.describe('04_1 · 020 — Cài đặt cảnh báo, cấp Tỉnh', () => {
	test.beforeEach(async ({ page }) => {
		await blockWrites(page);
		await moCaiDat(page);
	});

	test('04_1_020_013 — Hai thẻ con theo cấp đơn vị ở màn Cài đặt cảnh báo', async ({ page }) => {
		chanNeuTat('04_1_020_013');

		const nhan = await nhanThe(page);
		// 🔴 Nhãn thẻ con đổi theo CẤP (`ownLabel`): tỉnh ⇒ "Sản phẩm của tỉnh"; xã ⇒ "của xã".
		expect(nhan, `Thẻ đang có: ${nhan.join(' · ')}`).toContain('Sản phẩm của tỉnh');
		expect(nhan).toContain('Sản phẩm của Tổng công ty');
	});

	test('04_1_020_014 — Khối tham khảo Cấu hình Tổng công ty', async ({ page }) => {
		chanNeuTat('04_1_020_014');

		const noi = chuan(await khung(page).innerText());
		expect(
			noi,
			'Cấp con phải có khối tham khảo "Cấu hình Tổng công ty" — 🚫 không phải chỉ cấp tct mới có',
		).toContain('Cấu hình Tổng công ty');
	});

	test('04_1_020_015 — Tìm kiếm trong khối Cấu hình Tổng công ty', async ({ page }) => {
		const i = chanNeuTat('04_1_020_015');

		// 🔴 Màn có NHIỀU ô cùng placeholder "Tìm SKU, tên sản phẩm..." ⇒ phải bó phạm vi vào đúng
		//    khối, 🚫 không bám placeholder trần.
		const khoi = khung(page)
			.locator('div')
			.filter({ hasText: /^Cấu hình Tổng công ty/ })
			.last();
		const o = khoi.locator('input[placeholder="Tìm SKU, tên sản phẩm..."]').first();
		if ((await o.count()) === 0) {
			skipNoData(test, 'Khối "Cấu hình Tổng công ty" không có ô tìm kiếm — TCT chưa cài SKU nào.');
		}

		const truoc = chuan(await khoi.innerText());
		await o.fill(i.data.sku || 'zzzkhongtontai999');
		await page.waitForTimeout(2_000);
		const sau = chuan(await khoi.innerText());
		expect(sau, 'Gõ vào ô tìm kiếm của khối mà nội dung khối không đổi').not.toBe(truoc);
	});

	test('04_1_020_017 — Ba thẻ số liệu tổng hợp ngưỡng cảnh báo', async ({ page }) => {
		chanNeuTat('04_1_020_017');

		const tong = await theSo(page, 'Tổng phân loại SP');
		const daCai = await theSo(page, 'Đã cài ngưỡng');
		const chuaCai = await theSo(page, 'Chưa cài ngưỡng');

		expect(tong, 'Không đọc được thẻ "Tổng phân loại SP"').not.toBeNull();
		expect(daCai, 'Không đọc được thẻ "Đã cài ngưỡng"').not.toBeNull();
		expect(chuaCai, 'Không đọc được thẻ "Chưa cài ngưỡng"').not.toBeNull();
		expect(
			daCai + chuaCai,
			`Tổng ${tong} ≠ Đã cài ${daCai} + Chưa cài ${chuaCai} — ba thẻ số không khớp nhau`,
		).toBe(tong);
	});

	test('04_1_020_023 — Huỷ hộp thoại xoá cấu hình thì không xoá gì', async ({ page }) => {
		chanNeuTat('04_1_020_023');
		const { attempted } = await blockWrites(page);

		await moThe(page, 'Đã cài đặt');
		const dong = khung(page).locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row');
		if ((await dong.count()) === 0) {
			skipNoData(test, 'Thẻ "Đã cài đặt" chưa có sản phẩm nào để thử xoá.');
		}

		const soTruoc = await dong.count();
		const daCaiTruoc = await theSo(page, 'Đã cài ngưỡng');

		await dong.first().getByRole('button').last().click();
		const hop = page.locator('.ant-modal-confirm, .ant-popconfirm').last();
		await expect(hop, 'Bấm xoá mà không hiện hộp thoại xác nhận').toBeVisible({ timeout: 15_000 });
		expect(chuan(await hop.innerText())).toContain('Xác nhận xoá cấu hình');

		await hop.getByRole('button', { name: /Huỷ|Hủy/ }).click();
		await page.waitForTimeout(1_500);

		expect(attempted, 'Bấm Huỷ mà vẫn gửi request xoá').toEqual([]);
		expect(await dong.count(), 'Dòng biến mất dù đã bấm Huỷ').toBe(soTruoc);
		expect(await theSo(page, 'Đã cài ngưỡng')).toBe(daCaiTruoc);
	});

	// ── Case GHI dữ liệu / đang tắt ───────────────────────────────────────────────────────────────
	// Thẻ con "Theo từng sản phẩm" (`StockWarningConfigTab › PerProductSection`): ô `SelectStockRequestProduct` ("Tìm kiếm sản phẩm",
	// gọi `/chain/products/basic-search-product-unit?keyword=`), danh sách gợi ý là các div tự dựng; dòng đã chọn có InputNumber Min/Max.
	const theoSp = async (page) => {
		// SP seed / SP áo thun là SP của CHUỖI ⇒ thẻ "Sản phẩm của Tổng công ty" (thẻ "Sản phẩm của tỉnh" chỉ có SP tự doanh tỉnh).
		await moThe(page, 'Sản phẩm của Tổng công ty');
		const t = khung(page).locator('.ant-tabs-tab', { hasText: 'Theo từng sản phẩm' }).filter({ visible: true }).first();
		await expect(t, 'Không có thẻ con "Theo từng sản phẩm"').toBeVisible({ timeout: 20_000 });
		await t.locator('.ant-tabs-tab-btn').dispatchEvent('click');
		await page.waitForTimeout(1_500);
		const o = khung(page).getByPlaceholder(/^Tìm (kiếm )?sản phẩm$/).filter({ visible: true }).first();
		await expect(o).toBeVisible({ timeout: 15_000 });
		return o;
	};
	/** Chọn kiểu tìm (`ProductUnitSearchSelector`: Tên SP / SKU / Barcode), gõ `tu`, đếm gợi ý chứa `ten`. */
	const timThay = async (page, o, tu, ten = seedSp().tenSanPham, kieu = 'Tên SP') => {
		const cb = o.locator('xpath=ancestor::*[.//*[contains(@class,"ant-select")]][1]').locator('.ant-select').first();
		await cb.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${kieu}$`) }).last().click();
		await o.fill('');
		await page.waitForTimeout(800);
		await o.pressSequentially(tu, { delay: 30 });
		await page.waitForTimeout(3_000);
		return { kieu, soGoiY: await khung(page).locator('div.cursor-pointer').filter({ hasText: ten }).filter({ visible: true }).count() };
	};
	const seedSp = () => require('../../00_seed/seed-state').doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan;

	test('04_1_020_016 — Tìm kiếm ở thẻ Theo từng sản phẩm', async ({ page }) => {
		chanNeuTat('04_1_020_016');
		// SP có barcode KHÁC hẳn SKU/tên (SP seed AUTO8 có barcode = SKU nên không phân biệt được) — đo 26/09 trong CHAIN_PRODUCT_UNIT chuỗi 626.
		const sp = { sku: 'SP-TSHIRT-2-RED-S', ten: 'Áo thun 1 cotton basic', bar: '8932200000061' };
		const o = await theoSp(page);
		const kq = {};
		for (const [nhan, tu, kieu] of [['SKU', sp.sku, 'SKU'], ['tên', sp.ten, 'Tên SP'], ['barcode', sp.bar, 'Barcode']]) kq[nhan] = await timThay(page, o, tu, sp.ten, kieu);
		test.info().annotations.push({ type: 'đo', description: `SP ${sp.ten} / ${sp.sku} / barcode ${sp.bar}: ${JSON.stringify(kq)}` });
		expect(kq.SKU?.soGoiY, 'Tìm theo SKU không ra sản phẩm').toBeGreaterThan(0);
		expect(kq['tên']?.soGoiY, 'Tìm theo tên không ra sản phẩm').toBeGreaterThan(0);
		expect(kq.barcode.soGoiY, '🔴 Sheet QC FUNC_1_202: tìm theo BARCODE không ra sản phẩm').toBeGreaterThan(0);
	});

	test('04_1_020_020 — Nhập chữ vào ô Min / Max — phơi hành vi thật', async ({ page }) => {
		chanNeuTat('04_1_020_020');
		const sp = seedSp();
		const o = await theoSp(page);
		await timThay(page, o, sp.sku, sp.tenSanPham, 'SKU');
		await khung(page).locator('div.cursor-pointer').filter({ hasText: sp.tenSanPham }).filter({ visible: true }).last().click();
		await page.keyboard.press('Escape');
		const dong = khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: sp.tenSanPham }).filter({ visible: true }).first();
		await expect(dong, 'Chọn SP mà không thêm dòng cấu hình').toBeVisible({ timeout: 15_000 });
		const oNum = dong.locator('.ant-input-number-input');
		const kq = [];
		for (const i of [0, 1]) {
			const x = oNum.nth(i);
			await x.fill('');
			await x.pressSequentially('abc', { delay: 30 });
			const khiGo = await x.inputValue();
			await x.press('Tab');
			await page.waitForTimeout(300);
			kq.push({ o: i ? 'Max' : 'Min', khiGo, sauBlur: await x.inputValue() });
		}
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
		for (const q of kq) expect(q.khiGo, `Ô ${q.o} nhận ký tự chữ`).not.toMatch(/[a-z]/i);
		for (const q of kq) expect(q.sauBlur, `🔴 Sheet QC FUNC_1_208: ô ${q.o} không tự về 0 khi nhập chữ`).toBe('0');
	});
	/**
	 * 🔴 Lý do chặn cũ của case này **SAI**: nó ghi "code KHÔNG có phép kiểm Min ≤ Max". Đo
	 *    22/09/2026 thì **CẢ HAI** đường lưu đều có kiểm:
	 *      · `StockWarningConfigTab.handleSubmit` → `Ngưỡng Min phải nhỏ hơn Max (<tên SP>)`
	 *      · `EditShopPolicyModal.handleOk`       → `Ngưỡng Min phải nhỏ hơn Max`
	 *    Vì FE chặn ngay tại chỗ nên case 🚫 KHÔNG ghi gì ⇒ chạy dưới `chanGhi()`, 🚫 không cần
	 *    `allowMutation`. Ràng buộc là **Min < Max** (dùng `>=`), nên Min = Max cũng bị chặn.
	 */
	test('04_1_020_022 — Min lớn hơn Max bị chặn ngay ở FE', async ({ page }) => {
		chanNeuTat('04_1_020_022');
		const { attempted } = await blockWrites(page);

		await moThe(page, 'Đã cài đặt');
		const dong = khung(page).locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row');
		if ((await dong.count()) === 0) {
			skipNoData(test, 'Thẻ "Đã cài đặt" chưa có sản phẩm nào để sửa ngưỡng.');
		}

		// Nút sửa chỉ có icon — 🔴 `getByRole('button').first()` là nút khác, bám theo lớp icon.
		const nutSua = dong.first().locator('button:has(.anticon-edit), button:has(.anticon-form)');
		if ((await nutSua.count()) === 0) {
			skipNoData(test, 'Dòng cấu hình không có nút sửa dạng icon — cần probe lại màn.');
		}
		await nutSua.first().click();

		const modal = page.locator('.ant-modal-wrap:visible').last();
		await expect(modal, 'Bấm sửa mà không mở modal cấu hình').toBeVisible({ timeout: 20_000 });
		await expect(modal.locator('.ant-modal-title')).toContainText('Sửa cấu hình');

		await modal.locator('#quantity').fill('100');
		await modal.locator('#maxQuantity').fill('10');
		await modal.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_500);

		// Kỳ vọng: chặn bằng thông báo NGUYÊN VĂN, và 🚫 KHÔNG gửi request nào.
		const bao = (await page.locator('.ant-message').allInnerTexts()).map(chuan).join(' | ');
		expect(bao, 'Min = 100 > Max = 10 mà FE không chặn').toContain('Ngưỡng Min phải nhỏ hơn Max');
		expect(attempted, 'Min > Max mà vẫn gửi request lưu ngưỡng').toEqual([]);

		// Modal phải còn mở — 🚫 chặn rồi mà đóng modal là mất dữ liệu người dùng vừa nhập.
		await expect(modal, 'Bị chặn nhưng modal vẫn đóng, người dùng mất dữ liệu đang nhập').toBeVisible();
	});
});
