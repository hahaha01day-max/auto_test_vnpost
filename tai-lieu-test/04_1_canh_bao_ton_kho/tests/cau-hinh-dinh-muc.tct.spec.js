'use strict';

/**
 * Task 020 — Cài đặt định mức tồn tối thiểu / tối đa.
 * Màn: `features/stockAlert/StockAlertConfigPage.jsx` + `components/StockWarningConfigTab.jsx`.
 * Route: `/inventory/stock-alerts/settings`.
 *
 * Selector lấy từ CODE THẬT và từ kịch bản HDSD đã chạy được
 * (`resource/hdsd/hdsd04_1_canh_bao_ton_kho/video_spec_canh_bao_ton_kho.js`) — không dò mò.
 */

const { test, expect } = require('@playwright/test');
const { blockWrites, openAlerts, settle, skipNoData } = require('./alert-page');

/** Vào màn Cài đặt cảnh báo bằng nút trên màn Cảnh báo tồn kho (điều hướng client-side). */
async function moCaiDat(page) {
	await openAlerts(page, 'tct');
	await page.getByRole('button', { name: 'Cài đặt cảnh báo' }).first().click();
	await expect
		.poll(() => page.url(), { message: 'Không mở được màn Cài đặt cảnh báo.', timeout: 30_000 })
		.toContain('/stock-alerts/settings');
	await settle(page);
}

/**
 * Chọn phạm vi cài đặt (HDSD 020 bước 2).
 *
 * 🔴 Vai từ Bưu điện xã trở lên BẮT BUỘC chọn tổ chức / điểm bán trước, nếu không thân màn
 *    (thẻ Cài đặt nhanh, ô Ngưỡng Min/Max) KHÔNG render. Nhảy thẳng vào thao tác nhập ngưỡng thì
 *    locator chờ hết timeout và case đỏ với lý do vô nghĩa "không thấy ô Ngưỡng Min".
 * 🔴 Ô chọn ở đây cũng là `SelectShopMultiple` — mở drawer ba cột, chọn xong bấm *Xác nhận*.
 */
async function chonPhamVi(page) {
	await page.locator('.ant-select').filter({ hasText: /Chọn tổ chức|đơn vị/i }).first().click();

	const drawer = page.locator('.ant-drawer-open').first();
	await expect(drawer, 'Không mở được drawer chọn tổ chức / đơn vị.').toBeVisible();

	const col = (i) => drawer.locator('.sp-column').nth(i);
	const choCoMuc = async (ds) =>
		expect
			.poll(() => ds.count(), { timeout: 20_000 })
			.toBeGreaterThan(0)
			.then(() => true)
			.catch(() => false);

	if (!(await choCoMuc(col(0).locator('.sp-item')))) return false;
	await col(0).locator('.sp-item').nth(1).click();

	if (await choCoMuc(col(1).locator('.sp-item'))) await col(1).locator('.sp-item').first().click();

	const dsShop = col(2).locator('.ant-radio-wrapper');
	if (await choCoMuc(dsShop)) await dsShop.first().click();

	await drawer.getByRole('button', { name: 'Xác nhận' }).click();
	await expect(drawer, 'Bấm Xác nhận phải đóng drawer chọn phạm vi.').toBeHidden();
	await settle(page);
	return true;
}

test.describe('04_1 — Cài đặt định mức tồn (vai Tổng công ty)', () => {
	test('04_1_020_003 - Chọn "Sản phẩm chưa cài mức Max" thì khoá ô Ngưỡng Min', async ({ page }) => {
		await moCaiDat(page);
		await chonPhamVi(page);

		// Thẻ trong cùng: `bulk` = Cài đặt nhanh (StockWarningConfigTab.jsx:782).
		const theCaiDatNhanh = page.locator('.ant-tabs-tab').filter({ hasText: 'Cài đặt nhanh' }).first();
		await theCaiDatNhanh.locator('.ant-tabs-tab-btn').dispatchEvent('click');
		await settle(page);

		const panel = page.locator('.ant-tabs-tabpane-active').last();
		const oMin = panel.locator('#quantity, input[id$="quantity"]').first();
		const oMax = panel.locator('#maxQuantity, input[id$="maxQuantity"]').first();

		await expect(oMin, 'Chưa chọn gì thì ô Ngưỡng Min phải nhập được.').toBeEnabled();

		// `disabled={scope === "no-max"}` với ô Min — StockWarningConfigTab.jsx:150.
		await panel.getByText('Sản phẩm chưa cài mức Max', { exact: true }).first().click();

		await expect(
			oMin,
			'HDSD 020 — chọn "Sản phẩm chưa cài mức Max" thì ô Ngưỡng Min phải bị khoá.',
		).toBeDisabled();
		await expect(oMax, 'Ô Ngưỡng Max phải vẫn nhập được để khai mức tối đa.').toBeEnabled();
	});
});

/** Mở một thẻ trong màn cài đặt. Xem chú thích `chonNhom` về việc phải dùng `dispatchEvent`. */
async function moThe(page, ten) {
	const the = page.locator('.ant-tabs-tab').filter({ hasText: ten }).first();
	await the.scrollIntoViewIfNeeded().catch(() => {});
	await the.locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await settle(page);
	return page.locator('.ant-tabs-tabpane-active').last();
}

const oMin = (panel) => panel.locator('#quantity, input[id$="quantity"]').first();
const oMax = (panel) => panel.locator('#maxQuantity, input[id$="maxQuantity"]').first();

/** Mở màn cài đặt, chọn phạm vi, vào thẻ Cài đặt nhanh. Trả về panel đang hiển thị. */
async function vaoCaiDatNhanh(page) {
	await moCaiDat(page);
	await chonPhamVi(page);
	return moThe(page, 'Cài đặt nhanh');
}

test.describe('04_1 — Cài đặt định mức tồn: đọc và validate', () => {
	test('04_1_020_001 - Mở màn Cài đặt cảnh báo có đủ ba thẻ', async ({ page }) => {
		await moCaiDat(page);
		await chonPhamVi(page);

		for (const the of ['Cài đặt nhanh', 'Theo từng sản phẩm', 'Đã cài đặt']) {
			await expect(
				page.locator('.ant-tabs-tab').filter({ hasText: the }).first(),
				`Màn cài đặt thiếu thẻ "${the}".`,
			).toHaveCount(1);
		}
	});

	test('04_1_020_002 - Ba thẻ số thống kê hiển thị đủ', async ({ page }) => {
		await moCaiDat(page);
		await chonPhamVi(page);

		for (const nhan of ['Tổng phân loại SP', 'Đã cài ngưỡng', 'Chưa cài ngưỡng']) {
			await expect(
				page.getByText(nhan, { exact: true }).first(),
				`Thiếu thẻ số "${nhan}" ở đầu màn.`,
			).toBeVisible();
		}
	});

	test('04_1_020_004 - Chọn "Sản phẩm chưa cài mức Min" thì khoá ô Ngưỡng Max', async ({ page }) => {
		const panel = await vaoCaiDatNhanh(page);
		// `disabled={scope === "no-min"}` với ô Max — StockWarningConfigTab.jsx:167.
		await panel.getByText('Sản phẩm chưa cài mức Min', { exact: true }).first().click();

		await expect(oMax(panel), 'Chọn "chưa cài mức Min" thì ô Ngưỡng Max phải bị khoá.').toBeDisabled();
		await expect(oMin(panel), 'Ô Ngưỡng Min phải vẫn nhập được.').toBeEnabled();
	});

	test('04_1_020_005 - Nhãn nút áp dụng đổi theo lựa chọn Áp dụng cho', async ({ page }) => {
		const panel = await vaoCaiDatNhanh(page);

		// Bảng nhãn lấy nguyên từ StockWarningConfigTab.jsx:205-209.
		const nhanTheoLuaChon = [
			['Tất cả sản phẩm', 'Áp dụng cho tất cả sản phẩm'],
			['Sản phẩm chưa cài mức Min', 'Áp dụng ngưỡng Min cho SP chưa có'],
			['Sản phẩm chưa cài mức Max', 'Áp dụng ngưỡng Max cho SP chưa có'],
		];
		for (const [luaChon, nhanNut] of nhanTheoLuaChon) {
			await panel.getByText(luaChon, { exact: true }).first().click();
			await expect(
				panel.getByRole('button', { name: nhanNut }).first(),
				`Chọn "${luaChon}" thì nhãn nút phải là "${nhanNut}".`,
			).toBeVisible();
		}
	});

	test('04_1_020_006 - Ngưỡng Min lớn hơn Max thì bị chặn, không gửi request ghi', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const panel = await vaoCaiDatNhanh(page);

		await oMin(panel).fill('100');
		await oMax(panel).fill('10');
		await panel.getByRole('button', { name: /^Áp dụng/ }).first().click();

		// Có thể chặn bằng lỗi validate hoặc thông báo — điều bắt buộc là KHÔNG gửi request ghi.
		await page.waitForTimeout(2_000);
		expect(
			attempted,
			'Min lớn hơn Max mà vẫn gửi request ghi lên server.',
		).toEqual([]);
	});

	test('04_1_020_007 - Ô ngưỡng không nhận giá trị âm', async ({ page }) => {
		const panel = await vaoCaiDatNhanh(page);

		// `min={0}` trên InputNumber — StockWarningConfigTab.jsx:148.
		await oMin(panel).fill('-5');
		await oMin(panel).blur();
		const giaTri = await oMin(panel).inputValue();
		expect(
			Number(giaTri.replace(/[^\d.-]/g, '') || 0),
			`Ô Ngưỡng Min nhận giá trị âm (${giaTri}).`,
		).toBeGreaterThanOrEqual(0);
	});

	test('04_1_020_008 - Áp dụng cho tất cả sản phẩm phải qua màn xác nhận, huỷ thì không ghi', async ({
		page,
	}) => {
		const { attempted } = await blockWrites(page);
		const panel = await vaoCaiDatNhanh(page);

		await panel.getByText('Tất cả sản phẩm', { exact: true }).first().click();
		await oMin(panel).fill('1');
		await panel.getByRole('button', { name: 'Áp dụng cho tất cả sản phẩm' }).first().click();

		// `modal.confirm` với `okText: "Áp dụng"` — StockWarningConfigTab.jsx:105.
		const hopXacNhan = page.locator('.ant-modal-confirm');
		await expect(
			hopXacNhan,
			'HDSD 020 — áp cho TẤT CẢ sản phẩm là việc lớn, phải có bước xác nhận.',
		).toBeVisible();

		await hopXacNhan.getByRole('button', { name: /Huỷ|Hủy|Cancel/ }).first().click();
		await expect(hopXacNhan, 'Bấm Huỷ phải đóng hộp xác nhận.').toBeHidden();
		expect(attempted, 'Bấm Huỷ mà vẫn gửi request ghi.').toEqual([]);
	});

	test('04_1_020_010 - Thẻ Theo từng sản phẩm tìm và thêm được sản phẩm', async ({ page }) => {
		await moCaiDat(page);
		await chonPhamVi(page);
		const panel = await moThe(page, 'Theo từng sản phẩm');

		// 🔴 Placeholder THẬT là "Tìm kiếm sản phẩm" — 🚫 đừng lấy chuỗi `"Tìm SKU, tên sản phẩm..."`
		//    trong `StockWarningConfigTab.jsx:702`: đó là ô của một nhánh khác, không render ở đây.
		//    Đây là `<input>` thường, KHÔNG phải antd Select (đo 17/09: panel có 0 `.ant-select`).
		const oTim = panel.locator('input[placeholder*="Tìm kiếm sản phẩm"]').first();
		await expect(oTim, 'Thẻ Theo từng sản phẩm phải có ô tìm sản phẩm.').toBeVisible();
		await oTim.fill('a');

		const ds = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
		const coSanPham = await expect
			.poll(() => ds.count(), { timeout: 20_000 })
			.toBeGreaterThan(0)
			.then(() => true)
			.catch(() => false);
		if (!coSanPham) skipNoData(test, 'Tìm sản phẩm không trả về kết quả nào để thêm.');

		await ds.first().click();
		await expect(
			panel.locator('.ant-table-tbody tr.ant-table-row').first(),
			'Chọn sản phẩm xong phải có dòng trong bảng để nhập ngưỡng.',
		).toBeVisible();
	});

	test('04_1_020_012 - Thẻ Đã cài đặt liệt kê cấu hình hiện có', async ({ page }) => {
		await moCaiDat(page);
		await chonPhamVi(page);
		const panel = await moThe(page, 'Đã cài đặt');

		const dong = panel.locator('.ant-table-tbody tr.ant-table-row');
		if ((await dong.count()) === 0) {
			skipNoData(test, 'Phạm vi đang chọn chưa có cấu hình định mức nào đã lưu.');
		}
		const cot = (await panel.locator('th').allInnerTexts()).map((x) => x.trim());
		for (const c of ['Ngưỡng Min', 'Ngưỡng Max']) {
			expect(cot.join(' | '), `Thẻ Đã cài đặt thiếu cột "${c}".`).toContain(c);
		}
	});
});

test.describe('04_1 — Cài đặt định mức tồn: GHI DỮ LIỆU THẬT', () => {
	/**
	 * 🔴 Hai case dưới đây ghi cấu hình THẬT. `chonPhamVi` luôn chọn điểm bán đầu tiên của xã đầu
	 *    tiên — trên môi trường này đó là nhóm điểm bán rác `AUTO TEST KHONG DUNG…`, nên không
	 *    đụng dữ liệu ai. 🚫 Nếu môi trường đổi, kiểm lại phạm vi trước khi chạy.
	 * 🔴 Cấu hình định mức KHÔNG có hoàn tác: nạp sai phải sửa lại bằng tay hoặc bằng tệp mới.
	 */
	test('04_1_020_009 - Cài đặt nhanh cho nhóm "Sản phẩm chưa cài ngưỡng" thành công', async ({
		page,
	}) => {
		const panel = await vaoCaiDatNhanh(page);

		await panel.getByText('Sản phẩm chưa cài ngưỡng', { exact: false }).first().click();
		await oMin(panel).fill('1');
		await oMax(panel).fill('999');

		const cho = page
			.waitForResponse(
				// 🔴 Thẻ Cài đặt nhanh / Theo từng sản phẩm ở cấp ĐIỂM BÁN ghi qua
				//    `POST /shops/{shopId}/stock/warnings`
				//    (`inventory/overview/.../stockQuantityWarningServices.js:18`), KHÔNG phải
				//    `/stock-warning-policies` — endpoint kia là của cấu hình cấp tổ chức.
				//    Chờ nhầm endpoint thì case báo "không gửi request ghi" dù dữ liệu đã lưu.
				(r) => /\/shops\/\d+\/stock\/warnings/.test(r.url()) && r.request().method() === 'POST',
				{ timeout: 180_000 },
			)
			.catch(() => null);
		await panel.getByRole('button', { name: /^Áp dụng/ }).first().click();

		// Nhánh "tất cả sản phẩm" mới có hộp xác nhận; nhóm này thì không — nhưng nếu có thì đồng ý.
		const hopXacNhan = page.locator('.ant-modal-confirm');
		if (await hopXacNhan.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await hopXacNhan.getByRole('button', { name: /Áp dụng|OK/ }).first().click();
		}

		const res = await cho;
		if (!res) {
			const loi = await panel.locator('.ant-form-item-explain-error').allInnerTexts();
			throw new Error(
				`Bấm Áp dụng nhưng KHÔNG gửi request ghi. Lỗi validate: ${loi.join(' · ') || '(không có)'}`,
			);
		}
		expect(res.status(), 'Lưu cấu hình nhanh thất bại.').toBeLessThan(400);
	});

	test('04_1_020_011 - Lưu ngưỡng riêng cho một sản phẩm', async ({ page }) => {
		await moCaiDat(page);
		await chonPhamVi(page);
		const panel = await moThe(page, 'Theo từng sản phẩm');

		const oTim = panel.locator('input[placeholder*="Tìm kiếm sản phẩm"]').first();
		await oTim.fill('a');

		const ds = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
		const coSanPham = await expect
			.poll(() => ds.count(), { timeout: 20_000 })
			.toBeGreaterThan(0)
			.then(() => true)
			.catch(() => false);
		if (!coSanPham) skipNoData(test, 'Tìm sản phẩm không trả về kết quả nào để cài ngưỡng.');
		await ds.first().click();

		const dong = panel.locator('.ant-table-tbody tr.ant-table-row').first();
		await expect(dong, 'Chọn sản phẩm xong phải có dòng để nhập ngưỡng.').toBeVisible();
		await dong.locator('.ant-input-number-input').nth(0).fill('1');
		await dong.locator('.ant-input-number-input').nth(1).fill('999');

		const cho = page
			.waitForResponse(
				// 🔴 Thẻ Cài đặt nhanh / Theo từng sản phẩm ở cấp ĐIỂM BÁN ghi qua
				//    `POST /shops/{shopId}/stock/warnings`
				//    (`inventory/overview/.../stockQuantityWarningServices.js:18`), KHÔNG phải
				//    `/stock-warning-policies` — endpoint kia là của cấu hình cấp tổ chức.
				//    Chờ nhầm endpoint thì case báo "không gửi request ghi" dù dữ liệu đã lưu.
				(r) => /\/shops\/\d+\/stock\/warnings/.test(r.url()) && r.request().method() === 'POST',
				{ timeout: 180_000 },
			)
			.catch(() => null);
		await panel.getByRole('button', { name: /Lưu cài đặt/ }).first().click();
		const res = await cho;

		if (!res) {
			const loi = await panel.locator('.ant-form-item-explain-error').allInnerTexts();
			throw new Error(
				`Bấm Lưu cài đặt nhưng KHÔNG gửi request ghi. Lỗi validate: ${
					loi.join(' · ') || '(không có)'
				}`,
			);
		}
		expect(res.status(), 'Lưu ngưỡng riêng cho sản phẩm thất bại.').toBeLessThan(400);
	});
});
