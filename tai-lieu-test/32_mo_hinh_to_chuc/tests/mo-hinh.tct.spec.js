'use strict';

/** 32 · Mô hình tổ chức — nhóm case huỷ giữa chừng & tìm kiếm, vai `tct`. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chonNut, chuan, khung, khungChiTiet, moMan, nutCay, oTim, tim } =
	require('./org-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Mở hộp thoại đang hiện (drawer/modal) — `null` khi không có. */
const hopDangMo = (page) => page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();

test.describe('32 · Mô hình tổ chức', () => {
	let chan;
	test.beforeEach(async ({ page }) => {
		chan = await chanGhi(page);
		const so = await moMan(page);
		expect(so, 'Cây tổ chức không có nút nào').toBeGreaterThan(0);
	});

	test('32_120_002 — Tìm kiếm đơn vị trên cây phân cấp', async ({ page }) => {
		chanNeuTat('32_120_002');

		const banDau = await nutCay(page).count();
		const ten = chuan(await nutCay(page).last().innerText()).split('\n')[0];
		if (!ten) test.skip(true, 'Không đọc được tên đơn vị nào trên cây.');

		await tim(page, ten);
		const sau = await nutCay(page).count();
		test.info().annotations.push({
			type: 'cây trước/sau khi tìm',
			description: `${banDau} nút → ${sau} nút khi tìm "${ten}"`,
		});
		expect(sau, `Tìm "${ten}" mà cây không thu hẹp (${banDau} → ${sau})`).toBeLessThan(banDau);
		expect(
			chuan(await khung(page).innerText()),
			`Cây đã lọc nhưng không còn thấy đơn vị "${ten}" — đáng lẽ phải bung sẵn tới nút tìm được`,
		).toContain(ten);
	});

	test('32_100_007 — Huỷ thao tác thêm đơn vị giữa chừng', async ({ page }) => {
		chanNeuTat('32_100_007');

		const banDau = await nutCay(page).count();
		await khung(page).getByRole('button', { name: 'Thêm đơn vị' }).first().click();
		await page.waitForTimeout(2_500);

		const hop = hopDangMo(page);
		expect(await hop.count(), 'Bấm "Thêm đơn vị" mà không mở form nào').toBeGreaterThan(0);
		const o = hop.locator('input:not([type="hidden"])').first();
		if ((await o.count()) > 0) await o.fill('AUTO-TEST-KHONG-LUU');

		await hop.getByRole('button', { name: /Huỷ|Hủy|Đóng/ }).first().click();
		await page.waitForTimeout(3_000);

		// 🔴 Quan trọng nhất: 🚫 KHÔNG có request ghi nào lọt xuống server.
		expect(chan.daGoi, `Bấm Huỷ mà vẫn gửi request ghi: ${chan.daGoi.join(' ; ')}`).toEqual([]);
		expect(await nutCay(page).count(), 'Huỷ mà cây vẫn có thêm nút mới').toBe(banDau);
		expect(chuan(await khung(page).innerText()), 'Tên nháp vẫn còn trên cây').not.toContain(
			'AUTO-TEST-KHONG-LUU',
		);
	});

	test('32_130_004 — Huỷ chỉnh sửa đơn vị', async ({ page }) => {
		chanNeuTat('32_130_004');

		const ten = await chonNut(page, 1);
		if (!ten) test.skip(true, 'Không chọn được đơn vị nào trên cây.');

		const nut = khungChiTiet(page).getByRole('button', { name: /Chỉnh sửa|Sửa/ }).first();
		if ((await nut.count()) === 0) {
			test.skip(
				true,
				`Khung chi tiết của "${ten}" không có nút chỉnh sửa. Nút đang có: ` +
					chuan((await khungChiTiet(page).getByRole('button').allInnerTexts()).join(' · ')),
			);
		}
		const truoc = chuan(await khungChiTiet(page).innerText());
		await nut.click();
		await page.waitForTimeout(2_500);

		const hop = hopDangMo(page);
		const o = hop.locator('input:not([type="hidden"])').first();
		if ((await o.count()) > 0) await o.fill('AUTO-TEST-KHONG-LUU');
		await hop.getByRole('button', { name: /Huỷ|Hủy|Đóng/ }).first().click();
		await page.waitForTimeout(3_000);

		expect(chan.daGoi, `Huỷ sửa mà vẫn gửi request ghi: ${chan.daGoi.join(' ; ')}`).toEqual([]);
		expect(
			chuan(await khungChiTiet(page).innerText()),
			'Huỷ sửa mà thông tin đơn vị trên màn đã đổi',
		).toBe(truoc);
	});

	test('32_140_004 — Huỷ xoá đơn vị ở popup xác nhận', async ({ page }) => {
		chanNeuTat('32_140_004');

		const ten = await chonNut(page, 1);
		if (!ten) test.skip(true, 'Không chọn được đơn vị nào trên cây.');

		const nut = khungChiTiet(page).getByRole('button', { name: /Xoá|Xóa/ }).first();
		if ((await nut.count()) === 0) {
			test.skip(
				true,
				`Khung chi tiết của "${ten}" không có nút xoá. Nút đang có: ` +
					chuan((await khungChiTiet(page).getByRole('button').allInnerTexts()).join(' · ')),
			);
		}
		const banDau = await nutCay(page).count();
		await nut.click();
		await page.waitForTimeout(2_000);

		const pop = page.locator('.ant-modal-confirm, .ant-popconfirm, .ant-modal-wrap:visible').last();
		expect(await pop.count(), 'Bấm xoá mà không có popup xác nhận').toBeGreaterThan(0);
		test.info().annotations.push({
			type: 'nguyên văn popup xoá',
			description: chuan(await pop.innerText()),
		});
		await pop.getByRole('button', { name: /Huỷ|Hủy|Không/ }).first().click();
		await page.waitForTimeout(3_000);

		expect(chan.daGoi, `Bấm Huỷ mà vẫn gửi request xoá: ${chan.daGoi.join(' ; ')}`).toEqual([]);
		expect(await nutCay(page).count(), 'Huỷ xoá mà cây vẫn mất nút').toBe(banDau);
	});

	test('32_170_001 — Mở popup Gán nhân viên từ chi tiết đơn vị', async ({ page }) => {
		chanNeuTat('32_170_001');

		const ten = await chonNut(page, 1);
		if (!ten) test.skip(true, 'Không chọn được đơn vị nào trên cây.');

		const nut = khungChiTiet(page).getByRole('button', { name: /Gán nhân viên/ }).first();
		if ((await nut.count()) === 0) {
			test.skip(
				true,
				`Khung chi tiết của "${ten}" không có nút "Gán nhân viên". Nút đang có: ` +
					chuan((await khungChiTiet(page).getByRole('button').allInnerTexts()).join(' · ')),
			);
		}
		await nut.click();
		await page.waitForTimeout(3_000);

		const hop = hopDangMo(page);
		expect(await hop.count(), 'Bấm "Gán nhân viên" mà không mở popup nào').toBeGreaterThan(0);
		const chu = chuan(await hop.innerText());
		test.info().annotations.push({ type: 'nội dung popup', description: chu.slice(0, 400) });
		expect(chu, 'Popup gán nhân viên không nhắc tới nhân viên').toMatch(/nhân viên/i);
	});

	test('32_170_012 — Tìm kiếm nhân viên trong dropdown', async ({ page }) => {
		chanNeuTat('32_170_012');

		const ten = await chonNut(page, 1);
		if (!ten) test.skip(true, 'Không chọn được đơn vị nào trên cây.');
		const nut = khungChiTiet(page).getByRole('button', { name: /Gán nhân viên/ }).first();
		if ((await nut.count()) === 0) test.skip(true, 'Không có nút "Gán nhân viên" — xem 32_170_001.');
		await nut.click();
		await page.waitForTimeout(3_000);

		const hop = hopDangMo(page);
		const o = hop.locator('.ant-select').first();
		if ((await o.count()) === 0) test.skip(true, 'Popup gán nhân viên không có ô chọn nhân viên.');
		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
		const truoc = await dd.locator('.ant-select-item-option').count();
		if (truoc === 0) test.skip(true, 'Dropdown nhân viên rỗng ⇒ 🚫 không kiểm được việc thu hẹp.');

		const mau = chuan(await dd.locator('.ant-select-item-option').first().innerText()).slice(0, 4);
		await page.keyboard.type(mau);
		await page.waitForTimeout(2_500);
		const sau = await dd.locator('.ant-select-item-option').count();
		test.info().annotations.push({
			type: 'dropdown trước/sau',
			description: `${truoc} → ${sau} khi gõ "${mau}"`,
		});
		expect(sau, `Gõ "${mau}" mà dropdown không thu hẹp (${truoc} → ${sau})`).toBeLessThanOrEqual(
			truoc,
		);
		expect(sau, 'Gõ từ khoá lấy từ chính danh sách mà dropdown rỗng').toBeGreaterThan(0);
	});
});
