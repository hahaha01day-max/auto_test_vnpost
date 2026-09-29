'use strict';

/** 19 · Chi tiết khách hàng + form thêm/sửa, vai `gdv`. 🚫 KHÔNG ghi (bọc `chanGhi()`). */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan } = require('./customer-page');

const GOC = path.join(__dirname, '..');
const VAI = 'gdv';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Mở chi tiết khách ở dòng đầu; trả `null` khi không có khách nào. */
async function moChiTietDongDau(page) {
	if ((await dong(page).count()) === 0) return null;
	const ten = chuan(await dong(page).first().locator('td').nth(2).innerText());
	// 🔴 Tên khách là <a href="/customer/detail/:id"> NẰM TRONG ô — bấm vào ô (td) 🚫 không điều hướng.
		await dong(page).first().locator('td').nth(2).locator('a').click();
	await page.waitForTimeout(4_000);
	return ten;
}

test.describe('19 · Chi tiết khách hàng (điểm bán)', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, VAI);
	});

	test('19_020_006 — Huỷ thao tác thêm khách hàng giữa chừng', async ({ page }) => {
		const i = chanNeuTat('19_020_006');

		const nut = khung(page).getByRole('button', { name: 'Thêm khách hàng' });
		// 🔴 Đo 20/09/2026: vai `gdv` KHÔNG có nút "Thêm khách hàng" trên màn (chỉ `Xuất Excel`),
		//    trong khi vai tỉnh có đủ `Xuất Excel · Nhập Excel · Thêm khách hàng`. Kịch bản khai
		//    case này cho vai gdv ⇒ giữ nguyên kỳ vọng để user chốt: gdv được phép thêm khách không?
		expect(
			await nut.count(),
			'Vai điểm bán KHÔNG thấy nút "Thêm khách hàng". Nút đang có: ' +
				chuan((await khung(page).locator('button').allInnerTexts()).join(' · ')),
		).toBeGreaterThan(0);

		const truoc = chuan(await khung(page).innerText());
		await nut.first().click();
		await page.waitForTimeout(2_500);
		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await hop.getByRole('button', { name: /Huỷ|Hủy|Đóng/ }).first().click();
		await page.waitForTimeout(2_500);

		expect(chuan(await khung(page).innerText()), 'Huỷ mà danh sách vẫn đổi').toBe(truoc);
	});

	test('19_030_003 — Huỷ chỉnh sửa khách hàng giữa chừng', async ({ page }) => {
		chanNeuTat('19_030_003');

		const ten = await moChiTietDongDau(page);
		if (!ten) test.skip(true, 'Không có khách nào để mở chi tiết.');

		const nut = khung(page).getByRole('button', { name: /Chỉnh sửa|Sửa/ }).first();
		if ((await nut.count()) === 0) {
			test.skip(true, `Vai gdv không thấy nút chỉnh sửa ở chi tiết khách "${ten}".`);
		}
		await nut.click();
		await page.waitForTimeout(2_500);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const oTen = hop.locator('input').first();
		await oTen.fill('TEN-AUTO-TEST-KHONG-LUU');
		await hop.getByRole('button', { name: /Huỷ|Hủy|Đóng/ }).first().click();
		await page.waitForTimeout(3_000);

		expect(
			chuan(await khung(page).innerText()),
			'Huỷ sửa mà tên nháp vẫn hiện trên chi tiết khách',
		).not.toContain('TEN-AUTO-TEST-KHONG-LUU');
	});

	test('19_050_005 — Vai điểm bán không ngừng hoạt động khách được', async ({ page }) => {
		chanNeuTat('19_050_005');

		const ten = await moChiTietDongDau(page);
		if (!ten) test.skip(true, 'Không có khách nào để mở chi tiết.');

		const nut = khung(page).getByRole('button', { name: /Ngừng hoạt động|Ngưng hoạt động/ });
		const so = await nut.count();
		test.info().annotations.push({
			type: 'nút trên chi tiết khách (gdv)',
			description: chuan((await khung(page).locator('button').allInnerTexts()).join(' · ')),
		});
		expect(so, `Vai điểm bán thấy ${so} nút "Ngừng hoạt động" trên chi tiết khách "${ten}"`).toBe(0);
	});

	test('19_060_003 — Tab Đơn hàng khi khách chưa có đơn nào', async ({ page }) => {
		chanNeuTat('19_060_003');

		const ten = await moChiTietDongDau(page);
		if (!ten) test.skip(true, 'Không có khách nào để mở chi tiết.');

		const the = khung(page).locator('.ant-tabs-tab', { hasText: 'Đơn hàng' }).first();
		if ((await the.count()) === 0) {
			test.skip(
				true,
				'Chi tiết khách không có tab "Đơn hàng". Tab đang có: ' +
					chuan((await khung(page).locator('.ant-tabs-tab').allInnerTexts()).join(' · ')),
			);
		}
		// 🔴 `.click()` trần KHÔNG đổi tab ở antd v6.
		await the.locator('.ant-tabs-tab-btn').dispatchEvent('click');
		await page.waitForTimeout(3_000);

		const soDong = await khung(page).locator('.ant-table-tbody tr.ant-table-row').count();
		if (soDong > 0) {
			test.skip(true, `Khách "${ten}" đã có ${soDong} đơn ⇒ không kiểm được trạng thái rỗng.`);
		}
		const rong = khung(page).locator('.ant-empty, .ant-table-placeholder').first();
		await expect(rong, 'Tab Đơn hàng rỗng mà không có khối trạng thái rỗng').toBeVisible();
		test.info().annotations.push({
			type: 'nguyên văn trạng thái rỗng tab Đơn hàng',
			description: chuan(await rong.innerText()),
		});
	});
});
