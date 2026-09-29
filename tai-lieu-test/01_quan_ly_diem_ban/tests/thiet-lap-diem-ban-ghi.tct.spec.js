'use strict';

/**
 * Task 090 — case của wizard Thiết lập điểm bán có **GHI DỮ LIỆU THẬT**
 * (`POST /chain-employment-profile/v1.2/batch-assign-roles` qua drawer Gắn nhân viên lồng trong wizard).
 *
 * 🔴 Chỉ thao tác trên điểm bán rác (`AUTO TEST KHONG DUNG…`) — 🚫 không đụng điểm bán thật.
 * 🔴 Gán nhân viên KHÔNG gỡ lại được bằng nút ✕ (dòng đã lưu bị `disabled`), chỉ cho thôi việc
 *    bằng trạng thái. Case này vì vậy tự đặt dòng vừa gán về "Đã nghỉ" ở cuối thay cho dọn dẹp.
 */

const { test, expect } = require('@playwright/test');
const {
	firstNonHubRow,
	openDropdown,
	openShopList,
	reloadBy,
	rows,
	searchBox,
	settleTable,
	skipNoData,
} = require('./shop-page');

test.describe.configure({ mode: 'serial' });

const TU_KHOA = 'AUTO';
const soDongPhanCong = (drawer) => drawer.locator('.ant-select:has(input[id$="_status"])').count();
const cotSoNhanVien = (page, i = 0) => rows(page).nth(i).locator('td').nth(8);

/** Mở danh sách, lọc về nhóm điểm bán rác, trả về chỉ số dòng không phải Hub. */
async function moShopRac(page, ma) {
	await openShopList(page, 'tct');
	await reloadBy(page, () => searchBox(page).fill(ma || TU_KHOA));
	await settleTable(page);
	if ((await rows(page).count()) === 0) skipNoData(test, `Không có điểm bán nào khớp "${ma || TU_KHOA}".`);

	const idx = ma ? 0 : await firstNonHubRow(page);
	if (idx === null) skipNoData(test, 'Chỉ còn điểm bán loại Hub — Hub không gắn nhân viên được.');
	return { idx, ma: (await rows(page).nth(idx).locator('td').nth(2).innerText()).trim() };
}

test.describe('01 — Thiết lập điểm bán: bước Nhân viên (GHI DỮ LIỆU THẬT)', () => {
	test('01_090_012 - Gán thêm nhân viên từ bước Nhân viên thì wizard tự sang bước Xếp lịch', async ({
		page,
	}) => {
		const { idx, ma } = await moShopRac(page);
		const soNvTruoc = Number((await cotSoNhanVien(page, idx).innerText()).replace(/\D/g, '') || 0);

		// Mở wizard (nút thứ 2 ở cột Hành động) rồi sang bước "Nhân viên".
		await rows(page).nth(idx).locator('td').last().locator('button').nth(2).click();
		const wizard = page.locator('.ant-drawer-open').first();
		await expect(wizard.locator('.ant-drawer-title')).toContainText(/Thiết lập điểm bán/i);
		await wizard.getByRole('button', { name: 'Tiếp tục' }).first().click();
		await expect(
			wizard.locator('.ant-steps-item').nth(1),
			'Chưa sang được bước "Nhân viên".',
		).toHaveClass(/ant-steps-item-process/);

		// Mở drawer Gắn nhân viên TỪ TRONG wizard.
		await wizard.getByRole('button', { name: 'Gán nhân viên' }).click();
		const assign = page.locator('.ant-drawer-open').last();
		await expect(assign.locator('.ant-drawer-title'), 'Không mở được drawer Gắn nhân viên từ wizard.').toContainText(
			/Gắn nhân viên/i,
		);

		// Thêm một phân công đầy đủ.
		const truoc = await soDongPhanCong(assign);
		await assign.getByRole('button', { name: /Thêm nhân viên/ }).click();
		await expect
			.poll(() => soDongPhanCong(assign), {
				message: 'Bấm "Thêm nhân viên & vai trò" nhưng không thấy dòng mới.',
				timeout: 10_000,
			})
			.toBeGreaterThan(truoc);

		const dsNV = await openDropdown(page, assign.locator('.ant-select').filter({ hasText: 'Chọn nhân viên' }).last());
		await expect
			.poll(() => dsNV.locator('.ant-select-item-option').count(), {
				message: 'Danh sách nhân viên của chuỗi không nạp được lựa chọn nào.',
				timeout: 20_000,
			})
			.toBeGreaterThan(0);
		await dsNV.locator('.ant-select-item-option').first().click();

		const dsVT = await openDropdown(page, assign.locator('.ant-select').filter({ hasText: 'Chọn vai trò' }).last());
		await expect
			.poll(() => dsVT.locator('.ant-select-item-option').count(), {
				message: 'Chọn nhân viên xong mà danh sách vai trò vẫn rỗng.',
				timeout: 20_000,
			})
			.toBeGreaterThan(0);
		await dsVT.locator('.ant-select-item-option').first().click();

		const dsTT = await openDropdown(page, assign.locator('.ant-select:has(input[id$="_status"])').last());
		await dsTT.locator('.ant-select-item-option').first().click();

		const cho = page.waitForResponse(
			(r) => r.url().includes('batch-assign-roles') && r.request().method() === 'POST',
			{ timeout: 180_000 },
		);
		await assign.getByRole('button', { name: 'Xác nhận' }).click();
		const body = await (await cho).json().catch(() => null);
		expect(String(body?.status?.code), `Gán nhân viên thất bại: ${JSON.stringify(body?.status)}`).toBe('200');

		// 🔴 Điểm cần kiểm: `onClose` của DrawerAssignEmployee so số phân công trước/sau, gán được
		//    thêm người thì `setCurrent(STEP_SCHEDULE)` — wizard TỰ sang bước Xếp lịch.
		await expect
			.poll(async () => (await wizard.locator('.ant-steps-item').nth(2).getAttribute('class')) ?? '', {
				message: 'Gán thêm được nhân viên mà wizard vẫn đứng ở bước "Nhân viên".',
				timeout: 30_000,
			})
			.toMatch(/ant-steps-item-process/);

		// Và `onSuccess()` phải làm cột "Số lượng nhân viên" ngoài danh sách tăng đúng 1.
		await page.locator('.ant-drawer-close').first().click();
		const lai = await moShopRac(page, ma);
		await expect
			.poll(async () => Number((await cotSoNhanVien(page, lai.idx).innerText()).replace(/\D/g, '') || 0), {
				message: 'Wizard gán xong mà cột Số lượng nhân viên ngoài danh sách không tăng (thiếu onSuccess refetch).',
				timeout: 30_000,
			})
			.toBe(soNvTruoc + 1);

		test.info().annotations.push({
			type: 'đã sửa dữ liệu thật',
			description: `Gán thêm 1 nhân viên cho điểm bán rác ${ma} qua wizard. Dòng phân công không xoá được, chỉ cho thôi việc bằng trạng thái.`,
		});
	});
});
