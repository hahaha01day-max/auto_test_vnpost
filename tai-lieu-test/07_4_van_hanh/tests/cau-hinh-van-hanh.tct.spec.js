'use strict';

/**
 * Phân hệ 07_4 — Cấu hình vận hành, phần ĐỌC (vai `tct`).
 *
 * Trace 20/09/2026 — `/settings?setting=<key>`:
 * `bookingReservation` (Nhận đặt hàng trước) · `approvalLimit` (Hạn mức duyệt) ·
 * `notificationConfig` (Cấu hình thông báo) · `mailInbox` (Hòm mail nhận hoá đơn NCC) ·
 * `orderApprovalFlow` (Luồng phê duyệt đặt hàng — nhóm `050`, toàn case ghi).
 *
 * 🔴 Cấu hình luồng phê duyệt và hạn mức duyệt quyết định **phiếu của cả mạng lưới đi qua ai** —
 * sửa nhầm là phiếu treo không ai duyệt được. Mọi case ghi giữ `allowMutation: false`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

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
		if (!/config|setting|approval|mail|notification/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

async function moNhom(page, key) {
	await moTrang(page, `/settings?setting=${key}`, VAI);
	await page.waitForTimeout(4_500);
	return khung(page);
}

test.describe('07_4 — Cấu hình vận hành', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
	});

	test('07_4_010_001 — Nhóm Nhận đặt hàng trước mở được trên một biểu mẫu', async ({ page }) => {
		chanNeuTat('07_4_010_001');

		await moNhom(page, 'bookingReservation');
		const noi = chuan(await khung(page).innerText());
		// Toàn bộ cấu hình nằm trên MỘT biểu mẫu: tên · mô tả · phạm vi · công tắc.
		expect(
			/tên cấu hình/i.test(noi),
			`Không thấy ô "Tên cấu hình". Nội dung: ${noi.slice(0, 250)}`,
		).toBe(true);
		expect(/phạm vi/i.test(noi), 'Không thấy phần "Phạm vi áp dụng"').toBe(true);
		expect(
			await khung(page).locator('.ant-switch').count(),
			'Biểu mẫu không có công tắc kích hoạt',
		).toBeGreaterThan(0);
	});

	test('07_4_020_001 — Bảng Cấu hình hạn mức duyệt hiện đủ cột', async ({ page }) => {
		chanNeuTat('07_4_020_001');

		await moNhom(page, 'approvalLimit');
		const ten = (await khung(page).locator('.ant-table-thead th').allInnerTexts())
			.map(chuan)
			.filter((t) => t !== '');
		for (const c of ['STT', 'Tên cấu hình', 'Số khoảng tiền']) {
			expect(ten, `Bảng thiếu cột "${c}"; đang có: ${ten.join(' · ')}`).toContain(c);
		}
	});

	test('07_4_030_001 — Tìm loại thông báo theo tính năng', async ({ page }) => {
		chanNeuTat('07_4_030_001');

		await moNhom(page, 'notificationConfig');
		// 🔴 Ô `input[placeholder]` ĐẦU TIÊN của màn là ô "Tìm kiếm cấu hình" của menu bên trái.
		//    Ô của nhóm là "Tìm kiếm loại thông báo, theo tính năng" — bám đúng placeholder đó.
		const o = khung(page).locator('input[placeholder^="Tìm kiếm loại thông báo"]').first();
		if ((await o.count()) === 0) test.skip(true, 'Nhóm Cấu hình thông báo không có ô tìm kiếm.');

		const truoc = await khung(page).locator('.ant-table-tbody tr.ant-table-row').count();
		if (truoc === 0) test.skip(true, 'Chưa có loại thông báo nào để lọc.');

		const tuKhoa = chuan(
			await khung(page).locator('.ant-table-tbody tr.ant-table-row').first().locator('td').nth(1).innerText(),
		).split(' ')[0];
		await o.fill(tuKhoa);
		await page.waitForTimeout(2_500);

		const sau = await khung(page).locator('.ant-table-tbody tr.ant-table-row').count();
		expect(sau, `Lọc theo "${tuKhoa}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		expect(sau, 'Lọc xong số dòng không giảm — bộ lọc có thể không có tác dụng').toBeLessThanOrEqual(truoc);
	});

	test('07_4_030_002 — Không tìm thấy thì báo đúng thông điệp', async ({ page }) => {
		chanNeuTat('07_4_030_002');

		await moNhom(page, 'notificationConfig');
		const o = khung(page).locator('input[placeholder^="Tìm kiếm loại thông báo"]').first();
		if ((await o.count()) === 0) test.skip(true, 'Nhóm Cấu hình thông báo không có ô tìm kiếm.');

		await o.fill('zzzkhongtontai999');
		await page.waitForTimeout(2_500);

		expect(chuan(await khung(page).innerText())).toContain('Không tìm thấy loại thông báo');
	});

	test('07_4_040_001 — Bảng Hòm mail nhận hoá đơn NCC hiện đủ cột', async ({ page }) => {
		chanNeuTat('07_4_040_001');

		await moNhom(page, 'mailInbox');
		const ten = (await khung(page).locator('.ant-table-thead th').allInnerTexts())
			.map(chuan)
			.filter((t) => t !== '');
		for (const c of ['Đơn vị', 'Email', 'Máy chủ']) {
			expect(
				ten.some((t) => t.includes(c)),
				`Bảng thiếu cột "${c}"; đang có: ${ten.join(' · ')}`,
			).toBe(true);
		}
	});

	test('07_4_030_003 — Mã loại thông báo không sửa được khi xem loại đã có', async ({ page }) => {
		chanNeuTat('07_4_030_003');
		const { daGoi } = await chanGhi(page);

		await moNhom(page, 'notificationConfig');
		const dongDau = khung(page).locator('.ant-table-tbody tr.ant-table-row').first();
		if ((await dongDau.count()) === 0) test.skip(true, 'Chưa có loại thông báo nào để mở.');

		const nut = dongDau.getByRole('button', { name: /Chi tiết|Sửa|Xem/ }).first();
		if ((await nut.count()) === 0) test.skip(true, 'Dòng đầu không có nút mở chi tiết.');
		await nut.click({ force: true });
		await page.waitForTimeout(3_000);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const box = (await hop.count()) ? hop : khung(page);
		const oMa = box
			.locator('.ant-form-item')
			.filter({ hasText: /Mã loại/i })
			.locator('input')
			.first();
		if ((await oMa.count()) === 0) {
			test.skip(true, 'Không tìm thấy ô "Mã loại thông báo" trong form chi tiết.');
		}
		await expect(oMa, 'Ô Mã loại thông báo vẫn sửa được ở loại đã có').toBeDisabled();
		expect(daGoi, 'Chỉ mở xem mà đã gửi request ghi').toEqual([]);
	});
});
