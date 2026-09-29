'use strict';

/**
 * Phân hệ 08 — Quản lý sản phẩm, phần ĐỌC (vai `tct`).
 *
 * 🔴 Viết lại 20/09/2026 thay cho `vnpost-product-category.playwright.spec.js` (đăng nhập bằng URL
 * production viết cứng, không đi qua `moTrang`). Cả file 🚫 KHÔNG ghi: bọc `chanGhi()`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const {
	API_SAN_PHAM,
	COT_SAN_PHAM,
	boQua,
	chanGhi,
	chuan,
	cot,
	dong,
	dongSanPham,
	khung,
	moSanPham,
	oTim,
	tim,
} = require('./product-page');

const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Bỏ dấu + thường hoá, dùng khi so khớp từ khoá tìm kiếm. */
const khongDau = (s) =>
	chuan(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

test.describe('08 — Quản lý sản phẩm', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moSanPham(page, VAI);
	});

	test('08_010_001 — Mở màn danh sách sản phẩm', async ({ page }) => {
		chanNeuTat('08_010_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý sản phẩm',
		);
		const the = (await khung(page).locator('.ant-tabs-tab').allInnerTexts()).map((s) =>
			chuan(s.split('\n')[0]),
		);
		expect(the, `Thẻ đang có: ${the.join(' · ')}`).toEqual([
			'Sản phẩm',
			'Sản phẩm sản xuất',
			'Sản phẩm tự doanh',
		]);
		expect(await dongSanPham(page).count(), 'Danh sách sản phẩm rỗng — case sẽ "pass rỗng"').toBeGreaterThan(0);
	});

	test('08_010_002 — Danh sách sản phẩm - hiển thị bộ lọc tìm kiếm và trạng thái', async ({
		page,
	}) => {
		chanNeuTat('08_010_002');

		await expect(oTim(page), 'Không thấy ô tìm kiếm').toBeVisible();
		const ten = (await cot(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		expect(ten, `Cột đang có: ${ten.join(' · ')}`).toEqual(COT_SAN_PHAM);

		for (const nhan of ['Thêm mới', 'Quản lý danh mục', 'Nhập từ Excel', 'Xuất Excel']) {
			await expect(
				khung(page).getByRole('button', { name: nhan }).first(),
				`Thiếu nút "${nhan}"`,
			).toBeVisible();
		}
	});

	test('08_040_001 — Tìm sản phẩm theo tên tương đối', async ({ page }) => {
		chanNeuTat('08_040_001');

		if ((await dongSanPham(page).count()) === 0) boQua(test, 'Không có sản phẩm nào để lấy từ khoá.');
		const ten = chuan(await dongSanPham(page).first().locator('td').nth(2).innerText());
		const tuKhoa = ten.split(' ').slice(0, 2).join(' ');

		const res = await tim(page, tuKhoa);
		expect(res, `Tìm "${tuKhoa}" mà màn không gọi lại API danh sách`).not.toBeNull();

		const so = await dongSanPham(page).count();
		expect(so, `Tìm "${tuKhoa}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		// 🔴 Backend tìm theo TỪ, 🚫 không theo chuỗi con ⇒ chỉ assert có ít nhất một từ khớp.
		const tu = khongDau(tuKhoa).split(' ').filter(Boolean);
		for (let i = 0; i < so; i += 1) {
			const hang = khongDau(await dongSanPham(page).nth(i).innerText());
			expect(
				tu.some((t) => hang.includes(t)),
				`Dòng ${i + 1} không chứa từ nào của từ khoá "${tuKhoa}"`,
			).toBe(true);
		}
	});

	test('08_040_002 — Tìm sản phẩm theo tên không tồn tại', async ({ page }) => {
		chanNeuTat('08_040_002');

		await tim(page, 'zzzkhongtontai999');
		expect(await dongSanPham(page).count()).toBe(0);
		await expect(khung(page).locator('.ant-empty')).toBeVisible();
	});

	test('08_040_003 — Tìm sản phẩm theo SKU tương đối', async ({ page }) => {
		chanNeuTat('08_040_003');

		if ((await dongSanPham(page).count()) === 0) boQua(test, 'Không có sản phẩm nào để lấy SKU.');
		const sku = chuan(await dongSanPham(page).first().locator('td').nth(1).innerText()).split(' ')[0];
		if (!sku) boQua(test, 'Không đọc được SKU ở dòng đầu.');

		await tim(page, sku);
		const so = await dongSanPham(page).count();
		expect(so, `Tìm SKU "${sku}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			expect(chuan(await dongSanPham(page).nth(i).innerText())).toContain(sku);
		}
	});

	test('08_040_004 — Tìm sản phẩm theo SKU không tồn tại', async ({ page }) => {
		chanNeuTat('08_040_004');

		await tim(page, 'ZZZ-SKU-KHONG-TON-TAI-999');
		expect(await dongSanPham(page).count()).toBe(0);
		await expect(khung(page).locator('.ant-empty')).toBeVisible();
	});

	test('08_040_005 — Lọc sản phẩm theo trạng thái', async ({ page }) => {
		chanNeuTat('08_040_005');

		const o = khung(page).locator('.ant-select').filter({ hasText: /trạng thái/i }).first();
		if ((await o.count()) === 0) boQua(test, 'Màn sản phẩm không có ô lọc trạng thái.');

		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		expect(nhan.length, 'Ô lọc trạng thái không có lựa chọn nào').toBeGreaterThan(1);

		const cho = page.waitForResponse(
			(r) => r.url().includes(API_SAN_PHAM) && r.status() !== 401,
			{ timeout: 60_000 },
		);
		await dd.locator('.ant-select-item-option-content').first().click();
		const res = await cho.catch(() => null);
		expect(res, `Chọn trạng thái "${nhan[0]}" mà màn không gọi lại API`).not.toBeNull();
		await page.waitForTimeout(1_500);

		const so = await dongSanPham(page).count();
		if (so === 0) {
			boQua(test, `Không có sản phẩm nào ở trạng thái "${nhan[0]}" để đối chiếu.`);
		}
		for (let i = 0; i < so; i += 1) {
			expect(
				chuan(await dongSanPham(page).nth(i).locator('td').nth(9).innerText()),
				`Dòng ${i + 1} không thuộc trạng thái đã lọc`,
			).toContain(nhan[0]);
		}
	});

	test('08_030_002 — Xem chi tiết sản phẩm', async ({ page }) => {
		chanNeuTat('08_030_002');

		if ((await dongSanPham(page).count()) === 0) boQua(test, 'Không có sản phẩm nào để mở chi tiết.');
		const nut = dongSanPham(page).first().locator('td').last().getByRole('button').first();
		if ((await nut.count()) === 0) boQua(test, 'Dòng đầu không có nút thao tác nào.');
		await nut.click({ force: true });
		await page.waitForTimeout(3_500);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const box = (await hop.count()) ? hop : khung(page);
		const noi = chuan(await box.innerText());

		// Kịch bản đòi đủ các nhóm; ghi lại nhóm nào thiếu để user chốt.
		const thieu = [];
		for (const nhom of ['đơn vị', 'giá', 'kho']) {
			if (!noi.toLowerCase().includes(nhom)) thieu.push(nhom);
		}
		expect(
			thieu,
			`Chi tiết sản phẩm thiếu nhóm: ${thieu.join(', ')}. Nội dung: ${noi.slice(0, 250)}`,
		).toEqual([]);
	});

	test('08_030_003 — Đóng pop-up / drawer chi tiết sản phẩm', async ({ page }) => {
		chanNeuTat('08_030_003');
		const { daGoi } = await chanGhi(page);

		if ((await dongSanPham(page).count()) === 0) boQua(test, 'Không có sản phẩm nào để mở chi tiết.');
		const nut = dongSanPham(page).first().locator('td').last().getByRole('button').first();
		await nut.click({ force: true });
		await page.waitForTimeout(3_000);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		if ((await hop.count()) === 0) boQua(test, 'Nút thao tác đầu tiên không mở drawer/modal nào.');

		// Cách 1: nút đóng.
		await page.locator('.ant-drawer-close, .ant-modal-close').last().click({ force: true });
		await page.waitForTimeout(1_500);
		expect(await page.locator('.ant-drawer-open, .ant-modal-wrap:visible').count()).toBe(0);

		// Cách 2: phím Esc. 🔴 Sau khi drawer đóng, antd còn mask đang tan — chờ hẳn rồi mới bấm lại.
		await page.waitForTimeout(1_500);
		await dongSanPham(page).first().locator('td').last().getByRole('button').first().click({ force: true });
		await page.waitForTimeout(2_500);
		await page.keyboard.press('Escape');
		await page.waitForTimeout(1_500);
		expect(
			await page.locator('.ant-drawer-open, .ant-modal-wrap:visible').count(),
			'Nhấn Esc không đóng được chi tiết sản phẩm',
		).toBe(0);

		expect(daGoi, 'Chỉ mở rồi đóng mà đã gửi request ghi').toEqual([]);
	});

	test('08_020_001 — Thêm sản phẩm - kiểm tra nhóm thông tin cơ bản', async ({ page }) => {
		chanNeuTat('08_020_001');
		const { daGoi } = await chanGhi(page);

		await khung(page).getByRole('button', { name: 'Thêm mới' }).first().click({ force: true });
		await page.waitForTimeout(4_000);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const box = (await hop.count()) ? hop : khung(page);
		const noi = chuan(await box.innerText());

		for (const o of ['Tên sản phẩm', 'Danh mục']) {
			expect(noi, `Form thêm sản phẩm thiếu ô "${o}". Nội dung: ${noi.slice(0, 200)}`).toContain(o);
		}
		expect(daGoi, 'Chỉ mở form mà đã gửi request ghi').toEqual([]);
	});

});
