'use strict';

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { chanGhi } = require('./shift-card');
const { moVaDocTheCa, trongKhungChamCong, trangThaiPhien } = require('./the-ca-doc');

const GOC = path.join(__dirname, '..');
const { moTrang } = require('../../shared/auth/login');
const VAI = 'seed_shop2';

const chanNeuTat = (id) => {
	const thieu = missingRoleReason(VAI);
	test.skip(Boolean(thieu), thieu ?? '');
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

/**
 * Tài khoản cấp điểm bán (Cửa hàng trưởng `AUTO_SHOP_52295376`) KHÔNG được xếp ca hôm nay.
 * 🔴 Tiền đề đo bằng chính API lịch cá nhân — có lịch thì skip, 🚫 không tự huỷ lịch.
 */
test.describe('03b · 010/060 — tài khoản không có ca hôm nay (chỉ đọc)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('03b_010_004 — Ngày không có ca thì báo đúng thông điệp', async ({ page }) => {
		chanNeuTat('03b_010_004');
		await chanGhi(page);
		const { the, coLich, khongCoCa } = await moVaDocTheCa(page, VAI);
		test.skip(coLich, 'Tài khoản này đang CÓ lịch hôm nay — tiền đề "không có ca" không còn đúng.');
		expect(khongCoCa, 'Không có lịch mà màn không báo "Chưa có ca làm việc hôm nay"').toBe(true);
		expect(the.length, 'Không có lịch mà vẫn hiện thẻ ca').toBe(0);
	});

	test('03b_060_001 — Chưa được xếp lịch làm việc thì không vào được màn tạo đơn', async ({ page }) => {
		chanNeuTat('03b_060_001');
		await chanGhi(page);
		const { coLich } = await moVaDocTheCa(page, VAI);
		test.skip(coLich, 'Tài khoản này đang CÓ lịch hôm nay — tiền đề "chưa xếp lịch" không còn đúng.');

		await moTrang(page, '/order/create-order', VAI);
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Yêu cầu mở ca trước khi bán hàng' }).first();
		await expect(hop, 'Chưa xếp lịch mà vào màn tạo đơn không thấy hộp thoại "Yêu cầu mở ca trước khi bán hàng"').toBeVisible({ timeout: 30_000 });
		await expect(hop).toContainText('Bạn cần mở ca làm việc trước khi thực hiện thao tác bán hàng.');
		const nut = hop.getByRole('button');
		expect((await nut.allInnerTexts()).map((s) => s.trim()), 'Hộp thoại phải có đúng một nút "Đã hiểu"').toEqual(['Đã hiểu']);
		await nut.click();
		await expect(page, 'Bấm Đã hiểu mà không về màn Ca làm việc').toHaveURL(/\/lich-ca-nhan\/ca-lam-viec/, { timeout: 30_000 });
	});
});
