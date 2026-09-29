'use strict';

/**
 * Task 060 — màn **Chuyển kho**, phần đọc chạy bằng vai `tct` (thấy nhiều đơn vị nhất).
 *
 * 🔴 Cả file 🚫 KHÔNG ghi: mọi test bọc `chanGhi()`. Lập / xuất / nhận phiếu chuyển kho là chuyển
 * hàng thật giữa hai đơn vị, 🚫 không hoàn tác được bằng giao diện.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const {
	API_CHUYEN_KHO,
	TRANG_THAI_CHUYEN,
	boQua,
	chanGhi,
	chuan,
	cot,
	dong,
	khung,
	moChuyenKho,
	nhanCacOption,
	oTim,
	taiLaiBoi,
	thamSo,
} = require('./warehouse-page');

const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('04_3 · 060 — Màn Chuyển kho', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moChuyenKho(page, VAI);
	});

	test('04_3_060_002 — Giao diện màn Chuyển kho', async ({ page }) => {
		chanNeuTat('04_3_060_002');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Chuyển kho');

		const ten = (await cot(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		for (const c of [
			'Mã HĐ/CT',
			'Chi nhánh chuyển',
			'Ngày chuyển',
			'Chi nhánh nhận',
			'Ngày nhận',
			'Giá trị chuyển',
			'Trạng thái',
			'Hành động',
		]) {
			expect(ten, `Bảng thiếu cột "${c}"; đang có: ${ten.join(' · ')}`).toContain(c);
		}

		// 🔴 Đúng BA trạng thái (`TRANSFER_STATUS`), 🚫 không thêm bớt.
		const nhan = await nhanCacOption(page, 'Lọc theo trạng thái');
		for (const t of TRANG_THAI_CHUYEN) {
			expect(nhan, `Bộ lọc trạng thái thiếu "${t}"; đang có: ${nhan.join(' · ')}`).toContain(t);
		}
	});

	test('04_3_060_003 — Tìm kiếm mã phiếu chuyển kho', async ({ page }) => {
		chanNeuTat('04_3_060_003');

		if ((await dong(page).count()) === 0) boQua(test, 'Chưa có phiếu chuyển kho nào để lấy mã.');
		const ma = chuan(await dong(page).first().locator('td').nth(1).innerText()).split(' ')[0];
		if (!ma) boQua(test, 'Không đọc được mã phiếu ở dòng đầu.');

		await taiLaiBoi(page, API_CHUYEN_KHO, async () => {
			await oTim(page).fill(ma);
			await oTim(page).press('Enter');
		});
		const so = await dong(page).count();
		expect(so, `Tìm "${ma}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			expect(chuan(await dong(page).nth(i).innerText())).toContain(ma);
		}

		await taiLaiBoi(page, API_CHUYEN_KHO, async () => {
			await oTim(page).fill('ZZZ-KHONG-TON-TAI-999');
			await oTim(page).press('Enter');
		});
		expect(await dong(page).count(), 'Mã không tồn tại mà bảng vẫn có dòng').toBe(0);
	});

	test('04_3_060_004 — Bộ lọc khoảng thời gian ở màn Chuyển kho', async ({ page }) => {
		chanNeuTat('04_3_060_004');

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
			(r) => r.url().includes(API_CHUYEN_KHO) && r.status() !== 401,
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
});
