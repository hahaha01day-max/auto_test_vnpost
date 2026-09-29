'use strict';

/**
 * Task 060 / 080 — màn Chuyển kho nhìn từ **điểm bán**, và hai case in chứng từ.
 *
 * 🔴 Cả file 🚫 KHÔNG ghi: bọc `chanGhi()`. Case `04_3_060_001` chỉ **mở form và kiểm validate
 * rỗng** — 🚫 không điền, 🚫 không gửi.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { boQua, chanGhi, chuan, dong, khung, moChuyenKho } = require('./warehouse-page');

const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('04_3 · 060/080 — Chuyển kho, vai điểm bán', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moChuyenKho(page, VAI);
	});

	test('04_3_080_001 — Mở màn Chuyển kho', async ({ page }) => {
		chanNeuTat('04_3_080_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Chuyển kho');
		await expect(
			khung(page).locator('.ant-table'),
			'Màn Chuyển kho không có bảng danh sách',
		).toBeVisible();
	});

	test('04_3_060_001 — Tạo phiếu chuyển kho - mở form và validate', async ({ page }) => {
		chanNeuTat('04_3_060_001');
		const { daGoi } = await chanGhi(page);

		const nut = khung(page).getByRole('button', { name: 'Chuyển kho' }).first();
		if ((await nut.count()) === 0) {
			boQua(test, 'Vai điểm bán không có nút lập phiếu chuyển kho — ghi nhận để user chốt quyền.');
		}
		await nut.click({ force: true });
		await page.waitForTimeout(3_000);

		const form = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await expect(form, 'Bấm Chuyển kho mà không mở form nào').toBeVisible({ timeout: 20_000 });

		const luu = form.getByRole('button', { name: /Lưu|Xác nhận|Tạo phiếu/ }).last();
		if ((await luu.count()) === 0) boQua(test, 'Form chuyển kho không có nút lưu để kiểm validate.');
		await luu.click({ force: true });
		await page.waitForTimeout(2_000);

		const loi = [
			...(await form.locator('.ant-form-item-explain-error').allInnerTexts()),
			...(await page.locator('.ant-message').allInnerTexts()),
		].map(chuan);

		// 🔴 Điều kiện CỨNG trước: form trống 🚫 không được gửi request nào.
		expect(daGoi, '🔴 Form trống mà vẫn gửi request lập phiếu chuyển kho').toEqual([]);

		// 🔴 Đo 20/09/2026: bấm **Tạo phiếu** khi còn trống ô bắt buộc `* Kho nhận` và chưa có dòng
		//    sản phẩm nào ⇒ màn KHÔNG báo gì cả: không lỗi dưới ô, không message, không request.
		//    Người dùng bấm mà không hiểu vì sao không có chuyện gì xảy ra. Giữ nguyên kỳ vọng.
		expect(
			loi.join(' | '),
			'Bấm "Tạo phiếu" với form còn trống ô bắt buộc mà KHÔNG có thông báo nào — ' +
				'không lỗi dưới ô, không message, và cũng không gửi request. Màn im lặng hoàn toàn.',
		).not.toBe('');
	});

	test('04_3_060_017 — In phiếu lấy hàng', async ({ page }) => {
		chanNeuTat('04_3_060_017');
		boQua(
			test,
			'Cần một phiếu chuyển kho ở trạng thái cho phép in phiếu lấy hàng tại điểm bán này. ' +
				'Dựng phiếu là chuyển hàng thật giữa hai đơn vị — 🚫 không tự làm.',
		);
	});

	test('04_3_060_018 — In biên bản bàn giao', async ({ page }) => {
		chanNeuTat('04_3_060_018');
		boQua(test, 'Cùng lý do với `04_3_060_017` — thiếu phiếu chuyển kho nền ở điểm bán test.');
	});
});

void dong;
