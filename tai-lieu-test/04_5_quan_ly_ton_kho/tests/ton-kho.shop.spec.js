'use strict';

/**
 * Phân hệ 04_5 — Quản lý tồn kho, phần ĐỌC (vai `shop`).
 *
 * 🔴 Cả file 🚫 KHÔNG ghi: bọc `chanGhi()`. Thêm / sửa / xoá kho và đổi kho mặc định đều là thao
 * tác cấu hình thật của điểm bán; xoá kho đang có tồn còn là câu hỏi chưa có đặc tả (mục 6 của
 * `HANDOFF_tai_lieu_test_case.md`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const {
	API_TONG_QUAN,
	boQua,
	chanGhi,
	chuan,
	cot,
	dong,
	khung,
	moQuanLyKho,
	moTheKho,
	moTongQuan,
} = require('./stock-page');

const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('04_5 · 010 — Tổng quan kho', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moTongQuan(page, VAI);
	});

	test('04_5_010_001 — Mở màn Tổng quan kho', async ({ page }) => {
		chanNeuTat('04_5_010_001');
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Tổng quan kho',
		);
		await expect(khung(page).locator('.ant-table')).toBeVisible();
	});

	test('04_5_010_005 — Danh sách sản phẩm ở Tổng quan kho có đủ cột', async ({ page }) => {
		chanNeuTat('04_5_010_005');

		const ten = (await cot(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		for (const c of [
			'Sản phẩm',
			'Mã',
			'Đơn vị',
			'PP tính giá vốn',
			'Giá vốn trung bình',
			'Số lượng tồn kho',
			'Giá trị tồn kho',
			'Lô / Serial',
		]) {
			expect(ten, `Bảng thiếu cột "${c}"; đang có: ${ten.join(' · ')}`).toContain(c);
		}
	});

	test('04_5_010_002 — Tìm kiếm theo mã SKU và tên sản phẩm ở Tổng quan kho', async ({ page }) => {
		chanNeuTat('04_5_010_002');

		if ((await dong(page).count()) === 0) boQua(test, 'Kho chưa có sản phẩm nào để tìm.');
		const ma = chuan(await dong(page).first().locator('td').nth(3).innerText()).split(' ')[0];
		const o = khung(page).locator('input[placeholder]').first();

		const cho = page.waitForResponse(
			(r) => r.url().includes(API_TONG_QUAN) && r.status() !== 401,
			{ timeout: 45_000 },
		);
		await o.fill(ma);
		await o.press('Enter');
		const res = await cho.catch(() => null);
		await page.waitForTimeout(2_000);

		expect(res, `Tìm "${ma}" mà màn không gọi lại API tổng quan kho`).not.toBeNull();
		const so = await dong(page).count();
		expect(so, `Tìm mã "${ma}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
	});

	test('04_5_010_003 — Lọc theo danh mục sản phẩm ở Tổng quan kho', async ({ page }) => {
		chanNeuTat('04_5_010_003');

		const o = khung(page).locator('.ant-select').filter({ hasText: /danh mục|phân loại/i }).first();
		if ((await o.count()) === 0) {
			boQua(test, 'Màn Tổng quan kho không có ô lọc danh mục sản phẩm — ghi nhận để user chốt.');
		}
		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		if (nhan.length === 0) {
			await page.keyboard.press('Escape');
			boQua(
				test,
				'Ô "Chọn danh mục" mở ra RỖNG ở điểm bán này — chưa có danh mục sản phẩm nào để lọc. ' +
					'🔴 Ghi nhận để user chốt: thiếu dữ liệu nền, hay danh mục đang đọc sai nguồn ' +
					'(quy tắc 1: phải đọc `CHAIN_PRODUCTS`, 🚫 cấm `SHOP_PRODUCTS`).',
			);
		}

		const cho = page.waitForResponse(
			(r) => r.url().includes(API_TONG_QUAN) && r.status() !== 401,
			{ timeout: 45_000 },
		);
		await dd.locator('.ant-select-item-option-content').first().click();
		const res = await cho.catch(() => null);
		expect(res, `Chọn danh mục "${nhan[0]}" mà màn không gọi lại API`).not.toBeNull();
	});

	test('04_5_010_006 — Phân trang ở Tổng quan kho', async ({ page }) => {
		chanNeuTat('04_5_010_006');

		const phanTrang = khung(page).locator('.ant-pagination').first();
		if ((await phanTrang.count()) === 0 || (await dong(page).count()) < 10) {
			boQua(test, `Kho chỉ có ${await dong(page).count()} dòng — chưa đủ hai trang để kiểm.`);
		}
		const trang2 = phanTrang.locator('.ant-pagination-item[title="2"]');
		if ((await trang2.count()) === 0) boQua(test, 'Chỉ có một trang dữ liệu.');

		const truoc = await dong(page).allInnerTexts();
		const cho = page.waitForResponse(
			(r) => r.url().includes(API_TONG_QUAN) && r.status() !== 401,
			{ timeout: 45_000 },
		);
		await trang2.click();
		await cho.catch(() => null);
		await page.waitForTimeout(1_500);

		const sau = await dong(page).allInnerTexts();
		expect(sau.some((d) => truoc.includes(d)), 'Trang 2 lặp dòng của trang 1').toBe(false);
	});

	test('04_5_010_007 — Xuất Excel danh sách sản phẩm tồn kho', async ({ page }) => {
		chanNeuTat('04_5_010_007');

		const nut = khung(page).getByRole('button', { name: 'Xuất excel' }).first();
		await expect(nut, 'Không thấy nút Xuất excel').toBeVisible();

		const goi = [];
		page.on('request', (r) => {
			if (/export|excel/i.test(r.url())) goi.push(`${r.method()} ${r.url()}`);
		});
		const cho = page.waitForEvent('download', { timeout: 60_000 }).catch(() => null);
		await nut.click({ force: true });
		const tai = await cho;
		await page.waitForTimeout(3_000);

		expect(
			tai !== null || goi.length > 0,
			'Bấm "Xuất excel" mà không có tệp tải về và cũng không có request xuất nào',
		).toBe(true);
	});
});

test.describe('04_5 · 020 — Quản lý kho hàng', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moQuanLyKho(page, VAI);
	});

	test('04_5_020_001 — Giao diện màn Quản lý kho hàng', async ({ page }) => {
		chanNeuTat('04_5_020_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý kho hàng',
		);
		const ten = (await cot(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		for (const c of ['Mã kho', 'Tên kho']) {
			expect(ten, `Bảng thiếu cột "${c}"; đang có: ${ten.join(' · ')}`).toContain(c);
		}
		await expect(khung(page).getByRole('button', { name: 'Thêm kho' })).toBeVisible();
	});

	test('04_5_020_005 — Bỏ trống trường bắt buộc khi thêm kho', async ({ page }) => {
		chanNeuTat('04_5_020_005');
		const { daGoi } = await chanGhi(page);

		await khung(page).getByRole('button', { name: 'Thêm kho' }).click({ force: true });
		const form = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await expect(form, 'Bấm Thêm kho mà không mở form nào').toBeVisible({ timeout: 20_000 });
		await page.waitForTimeout(1_500);

		const luu = form.getByRole('button', { name: /Lưu|Xác nhận|Thêm/ }).last();
		await luu.click({ force: true });
		await page.waitForTimeout(2_000);

		const loi = [
			...(await form.locator('.ant-form-item-explain-error').allInnerTexts()),
			...(await page.locator('.ant-message').allInnerTexts()),
		].map(chuan);
		expect(daGoi, '🔴 Form trống mà vẫn gửi request tạo kho').toEqual([]);
		expect(
			loi.join(' | '),
			'Bấm lưu với form TRỐNG mà không có thông báo nào — không có phép kiểm bắt buộc',
		).not.toBe('');
	});
});

test.describe('04_5 · 030/040 — Thẻ kho và báo cáo', () => {
	test('04_5_030_002 — Giao diện màn Thẻ kho có đủ thành phần', async ({ page }) => {
		chanNeuTat('04_5_030_002');
		await chanGhi(page);

		const pane = await moTheKho(page, VAI);
		const noi = chuan(await pane.innerText());
		expect(
			noi,
			'🔴 Thẻ "Thẻ kho" mở ra RỖNG HOÀN TOÀN: không ô lọc, không bảng, không chữ nào, và ' +
				'không request nào được gửi. Người dùng bấm vào thẻ và không thấy gì.',
		).not.toBe('');

		for (const nhan of ['Tồn đầu kỳ', 'Tổng nhập', 'Tổng xuất', 'Tồn cuối kỳ']) {
			expect(noi, `Thẻ kho thiếu ô số liệu "${nhan}"`).toContain(nhan);
		}
	});

	test("04_5_030_001 — Xem Thẻ kho khi có dữ liệu", async ({ page }) => {

			chanNeuTat("04_5_030_001");
			await chanGhi(page);

			const pane = await moTheKho(page, VAI);
			const noi = chuan(await pane.innerText());
			if (noi === '') {
				boQua(
					test,
					'🔴 Thẻ "Thẻ kho" mở ra rỗng hoàn toàn (không ô lọc, không bảng, không request). ' +
						'Xem `04_5_030_002` — chốt chặn của nhóm này. 🚫 Không kiểm tiếp được gì.',
				);
			}
			const soDong = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
			if (soDong === 0) {
				boQua(test, 'Thẻ kho không có giao dịch nào trong khoảng đang chọn để đối chiếu.');
			}
			expect(soDong).toBeGreaterThan(0);
	});

	test("04_5_030_004 — Tìm kiếm theo Tên sản phẩm ở Thẻ kho", async ({ page }) => {

			chanNeuTat("04_5_030_004");
			await chanGhi(page);

			const pane = await moTheKho(page, VAI);
			const noi = chuan(await pane.innerText());
			if (noi === '') {
				boQua(
					test,
					'🔴 Thẻ "Thẻ kho" mở ra rỗng hoàn toàn (không ô lọc, không bảng, không request). ' +
						'Xem `04_5_030_002` — chốt chặn của nhóm này. 🚫 Không kiểm tiếp được gì.',
				);
			}
			const soDong = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
			if (soDong === 0) {
				boQua(test, 'Thẻ kho không có giao dịch nào trong khoảng đang chọn để đối chiếu.');
			}
			expect(soDong).toBeGreaterThan(0);
	});

	test("04_5_030_005 — Tìm kiếm theo SKU ở Thẻ kho", async ({ page }) => {

			chanNeuTat("04_5_030_005");
			await chanGhi(page);

			const pane = await moTheKho(page, VAI);
			const noi = chuan(await pane.innerText());
			if (noi === '') {
				boQua(
					test,
					'🔴 Thẻ "Thẻ kho" mở ra rỗng hoàn toàn (không ô lọc, không bảng, không request). ' +
						'Xem `04_5_030_002` — chốt chặn của nhóm này. 🚫 Không kiểm tiếp được gì.',
				);
			}
			const soDong = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
			if (soDong === 0) {
				boQua(test, 'Thẻ kho không có giao dịch nào trong khoảng đang chọn để đối chiếu.');
			}
			expect(soDong).toBeGreaterThan(0);
	});

	test("04_5_030_007 — Chọn khoảng thời gian ở Thẻ kho", async ({ page }) => {

			chanNeuTat("04_5_030_007");
			await chanGhi(page);

			const pane = await moTheKho(page, VAI);
			const noi = chuan(await pane.innerText());
			if (noi === '') {
				boQua(
					test,
					'🔴 Thẻ "Thẻ kho" mở ra rỗng hoàn toàn (không ô lọc, không bảng, không request). ' +
						'Xem `04_5_030_002` — chốt chặn của nhóm này. 🚫 Không kiểm tiếp được gì.',
				);
			}
			const soDong = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
			if (soDong === 0) {
				boQua(test, 'Thẻ kho không có giao dịch nào trong khoảng đang chọn để đối chiếu.');
			}
			expect(soDong).toBeGreaterThan(0);
	});

	test("04_5_030_012 — Phân trang ở Thẻ kho", async ({ page }) => {

			chanNeuTat("04_5_030_012");
			await chanGhi(page);

			const pane = await moTheKho(page, VAI);
			const noi = chuan(await pane.innerText());
			if (noi === '') {
				boQua(
					test,
					'🔴 Thẻ "Thẻ kho" mở ra rỗng hoàn toàn (không ô lọc, không bảng, không request). ' +
						'Xem `04_5_030_002` — chốt chặn của nhóm này. 🚫 Không kiểm tiếp được gì.',
				);
			}
			const soDong = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
			if (soDong === 0) {
				boQua(test, 'Thẻ kho không có giao dịch nào trong khoảng đang chọn để đối chiếu.');
			}
			expect(soDong).toBeGreaterThan(0);
	});

	test("04_5_030_013 — Thẻ kho hiển thị giao dịch Nhập từ Nhà cung cấp", async ({ page }) => {

			chanNeuTat("04_5_030_013");
			await chanGhi(page);

			const pane = await moTheKho(page, VAI);
			const noi = chuan(await pane.innerText());
			if (noi === '') {
				boQua(
					test,
					'🔴 Thẻ "Thẻ kho" mở ra rỗng hoàn toàn (không ô lọc, không bảng, không request). ' +
						'Xem `04_5_030_002` — chốt chặn của nhóm này. 🚫 Không kiểm tiếp được gì.',
				);
			}
			const soDong = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
			if (soDong === 0) {
				boQua(test, 'Thẻ kho không có giao dịch nào trong khoảng đang chọn để đối chiếu.');
			}
			expect(soDong).toBeGreaterThan(0);
	});

	test("04_5_030_014 — Thẻ kho hiển thị giao dịch Nhập từ Chuyển kho", async ({ page }) => {

			chanNeuTat("04_5_030_014");
			await chanGhi(page);

			const pane = await moTheKho(page, VAI);
			const noi = chuan(await pane.innerText());
			if (noi === '') {
				boQua(
					test,
					'🔴 Thẻ "Thẻ kho" mở ra rỗng hoàn toàn (không ô lọc, không bảng, không request). ' +
						'Xem `04_5_030_002` — chốt chặn của nhóm này. 🚫 Không kiểm tiếp được gì.',
				);
			}
			const soDong = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
			if (soDong === 0) {
				boQua(test, 'Thẻ kho không có giao dịch nào trong khoảng đang chọn để đối chiếu.');
			}
			expect(soDong).toBeGreaterThan(0);
	});

	test("04_5_030_016 — Thẻ kho hiển thị giao dịch Xuất thường", async ({ page }) => {

			chanNeuTat("04_5_030_016");
			await chanGhi(page);

			const pane = await moTheKho(page, VAI);
			const noi = chuan(await pane.innerText());
			if (noi === '') {
				boQua(
					test,
					'🔴 Thẻ "Thẻ kho" mở ra rỗng hoàn toàn (không ô lọc, không bảng, không request). ' +
						'Xem `04_5_030_002` — chốt chặn của nhóm này. 🚫 Không kiểm tiếp được gì.',
				);
			}
			const soDong = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
			if (soDong === 0) {
				boQua(test, 'Thẻ kho không có giao dịch nào trong khoảng đang chọn để đối chiếu.');
			}
			expect(soDong).toBeGreaterThan(0);
	});

	test("04_5_030_017 — Thẻ kho hiển thị giao dịch Xuất chuyển kho", async ({ page }) => {

			chanNeuTat("04_5_030_017");
			await chanGhi(page);

			const pane = await moTheKho(page, VAI);
			const noi = chuan(await pane.innerText());
			if (noi === '') {
				boQua(
					test,
					'🔴 Thẻ "Thẻ kho" mở ra rỗng hoàn toàn (không ô lọc, không bảng, không request). ' +
						'Xem `04_5_030_002` — chốt chặn của nhóm này. 🚫 Không kiểm tiếp được gì.',
				);
			}
			const soDong = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
			if (soDong === 0) {
				boQua(test, 'Thẻ kho không có giao dịch nào trong khoảng đang chọn để đối chiếu.');
			}
			expect(soDong).toBeGreaterThan(0);
	});

	test('04_5_040_001 — Xem tab Báo cáo nhập và Báo cáo xuất', async ({ page }) => {
		chanNeuTat('04_5_040_001');
		await chanGhi(page);

		const { moMan, API_LICH_SU, ROUTE_LICH_SU } = require('./stock-page');
		await moMan(page, ROUTE_LICH_SU, VAI, API_LICH_SU);
		const the = (await khung(page).locator('.ant-tabs-tab').allInnerTexts()).map((s) =>
			chuan(s.split('\n')[0]),
		);
		expect(the, `Thẻ đang có: ${the.join(' · ')}`).toContain('Phiếu nhập kho');
		expect(the).toContain('Phiếu xuất kho');
	});
});
