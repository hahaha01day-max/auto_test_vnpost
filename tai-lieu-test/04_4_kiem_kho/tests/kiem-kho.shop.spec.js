'use strict';

/**
 * Phân hệ 04_4 — Kiểm kho, phần ĐỌC (vai `shop`).
 *
 * 🔴 Đo 20/09/2026: route `/inventory/inventory-check` có tiêu đề **"Kiểm kho"** và liệt kê
 * **PHIÊN kiểm kho** (cột *Mã phiên · Người mở phiên · Thuộc phiên · Số phiếu · Trạng thái*),
 * còn `/inventory/inventory-check/session-manage` tiêu đề **"Phiên kiểm kho"** mới liệt kê
 * **PHIẾU** (cột *Mã phiếu · Nhân viên kiểm · Số dòng*). Tài liệu gọi chung là "màn Phiếu kiểm
 * kho" — 🚫 đừng lẫn hai màn, tên màn và nội dung bảng **đảo nhau**.
 *
 * 🔴 Cả file 🚫 KHÔNG ghi: bọc `chanGhi()`. Áp dụng một phiếu kiểm kho là **điều chỉnh tồn kho
 * thật**, và dòng bỏ trống có thể bị hiểu là "đếm 0" (xem mục 2 của `test-cases.md`) — sai một
 * lần là xoá sạch tồn của mọi sản phẩm chưa kiểm.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';

const ROUTE = '/inventory/inventory-check';
const API_PHIEN = '/stock/v3/inventory-check/sessions';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const oTim = (page) => khung(page).locator('input[placeholder^="Tìm kiếm"]').first();

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/\/stock|\/shops\b/.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

async function moMan(page) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API_PHIEN) && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, ROUTE, VAI);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

const KHONG_CO_DU_LIEU =
	'Điểm bán chưa có phiên / phiếu kiểm kho nào. 🚫 Không tự mở phiên để có dữ liệu: mở phiên ' +
	'khoá kho và áp dụng phiếu là điều chỉnh tồn kho thật.';

test.describe('04_4 · 050 — Danh sách và chi tiết phiếu kiểm kho', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page);
	});

	test('04_4_050_001 — Mở màn Phiếu kiểm kho', async ({ page }) => {
		chanNeuTat('04_4_050_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Kiểm kho');
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		for (const c of ['Mã phiên', 'Trạng thái', 'Hành động']) {
			expect(cot, `Bảng thiếu cột "${c}"; đang có: ${cot.join(' · ')}`).toContain(c);
		}
		await expect(oTim(page)).toBeVisible();
	});

	test('04_4_050_002 — Tìm kiếm theo mã phiếu kiểm kho đúng', async ({ page }) => {
		chanNeuTat('04_4_050_002');

		if ((await dong(page).count()) === 0) test.skip(true, KHONG_CO_DU_LIEU);
		const ma = chuan(await dong(page).first().locator('td').nth(1).innerText()).split(' ')[0];

		const cho = page.waitForResponse(
			(r) => r.url().includes(API_PHIEN) && r.status() !== 401,
			{ timeout: 45_000 },
		);
		await oTim(page).fill(ma);
		await oTim(page).press('Enter');
		await cho.catch(() => null);
		await page.waitForTimeout(1_500);

		const so = await dong(page).count();
		expect(so, `Tìm mã "${ma}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			expect(chuan(await dong(page).nth(i).innerText())).toContain(ma);
		}
	});

	test('04_4_050_003 — Tìm kiếm mã phiếu không tồn tại', async ({ page }) => {
		chanNeuTat('04_4_050_003');

		const cho = page.waitForResponse(
			(r) => r.url().includes(API_PHIEN) && r.status() !== 401,
			{ timeout: 45_000 },
		);
		await oTim(page).fill('ZZZ-KHONG-TON-TAI-999');
		await oTim(page).press('Enter');
		await cho.catch(() => null);
		await page.waitForTimeout(1_500);

		expect(await dong(page).count()).toBe(0);
		await expect(khung(page).locator('.ant-empty')).toBeVisible();
	});

	test('04_4_050_005 — Bộ lọc khoảng thời gian', async ({ page }) => {
		chanNeuTat('04_4_050_005');

		// 🔴 Đây là **RangePicker**: chọn ô "Ngày bắt đầu" xong, tiêu điểm tự nhảy sang "Ngày kết
		//    thúc" và panel vẫn mở. Danh sách chỉ nạp lại SAU KHI chọn đủ CẢ HAI mốc. Chọn một
		//    mốc rồi chờ request là treo hết timeout — và rất dễ kết luận nhầm thành "bộ lọc thời
		//    gian không có tác dụng" (đã mắc đúng lỗi này ngày 20/09 ở cả hai màn).
		const oNgay = khung(page).locator('input[placeholder="Ngày bắt đầu"]').first();
		await expect(oNgay, 'Không thấy ô Ngày bắt đầu').toBeVisible();

		await oNgay.click();
		const panel = page.locator('.ant-picker-dropdown').last();
		await panel.waitFor({ state: 'visible', timeout: 15_000 });
		const o = panel.locator('.ant-picker-cell-in-view');
		expect(await o.count(), 'Lịch không có ô ngày nào').toBeGreaterThan(2);

		await o.nth(2).click();
		await page.waitForTimeout(800);

		const cho = page.waitForResponse(
			(r) => r.url().includes(API_PHIEN) && r.status() !== 401,
			{ timeout: 45_000 },
		);
		const oSau = page.locator('.ant-picker-dropdown').last().locator('.ant-picker-cell-in-view');
		await oSau.nth(10).click();
		const res = await cho.catch(() => null);

		expect(
			res,
			'Chọn đủ cả hai mốc ngày mà màn KHÔNG gọi lại API danh sách — bộ lọc thời gian hỏng.',
		).not.toBeNull();

		// 🔴 DATETIME naive +7: mốc thời gian phải đi vào request, 🚫 không suy từ bảng.
		const p = Object.fromEntries(new URL(res.url()).searchParams.entries());
		expect(
			Object.keys(p).some((k) => /date|time/i.test(k)),
			`Query không mang mốc thời gian nào: ${JSON.stringify(p)}`,
		).toBe(true);
	});

	test('04_4_050_006 — Chi tiết phiếu kiểm kho hiện đủ các phần', async ({ page }) => {
		chanNeuTat('04_4_050_006');

		if ((await dong(page).count()) === 0) test.skip(true, KHONG_CO_DU_LIEU);

		await dong(page).first().locator('td').last().getByRole('button').first().click();
		await page.waitForTimeout(4_000);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const box = (await hop.count()) ? hop : khung(page);
		const noi = chuan(await box.innerText());

		for (const phan of ['Thông tin phiếu', 'Bảng tính chi phí']) {
			expect(noi, `Chi tiết thiếu phần "${phan}"`).toContain(phan);
		}
		for (const the of ['Tất cả', 'Tồn kho khớp', 'Tồn kho tăng', 'Tồn kho giảm']) {
			expect(noi, `Chi tiết thiếu thẻ "${the}"`).toContain(the);
		}
	});

	test('04_4_050_004 — Bộ lọc trạng thái phiếu kiểm kho', async () => {
		chanNeuTat('04_4_050_004');
	});
});
