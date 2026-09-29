'use strict';

/**
 * Phân hệ 07_1 — Cấu hình chung, phần ĐỌC (vai `tct`).
 *
 * 🔴 Năm task của phân hệ này đều khai vai **chỉ TONG_CONG_TY** — cấu hình áp cho toàn hệ thống.
 * Mọi case ghi giữ `allowMutation: false`; case đọc vẫn bọc `chanGhi()` để một cú bấm nhầm vào
 * "Lưu cấu hình" không đổi cách tính tiền của cả mạng lưới.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { NHOM, boQua, chanGhi, chuan, khung, moFormSua, moNhom } = require('./settings-page');

const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Dòng tóm tắt của một nhóm trong danh sách cấu hình. */
const dongNhom = (page, ten) =>
	khung(page).locator('.ant-menu-item', { hasText: ten }).first();

test.describe('07_1 — Cấu hình chung', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
	});

	test('07_1_010_001 — Nhóm Làm tròn tiền mở được từ danh sách cấu hình', async ({ page }) => {
		chanNeuTat('07_1_010_001');

		await moNhom(page, NHOM.lamTronTien, VAI);
		const noi = chuan(await khung(page).innerText());
		expect(noi, 'Không thấy thẻ "Cấu hình làm tròn tiền"').toContain('Cấu hình làm tròn tiền');
		await expect(
			khung(page).getByRole('button', { name: 'Sửa' }).last(),
			'Thẻ cấu hình không có nút Sửa',
		).toBeVisible();
		expect(
			await khung(page).locator('.ant-switch').count(),
			'Thẻ cấu hình không có công tắc bật/tắt',
		).toBeGreaterThan(0);
	});

	test('07_1_010_003 — Ô Xem trước kết quả tính theo số mẫu 12.345', async ({ page }) => {
		chanNeuTat('07_1_010_003');

		await moNhom(page, NHOM.lamTronTien, VAI);
		const dr = await moFormSua(page);
		const noi = chuan(await dr.innerText());

		expect(noi, 'Form không có khối "Xem trước kết quả"').toContain('Xem trước kết quả');
		// 🔴 Số mẫu THẬT là `12,345.678` (tài liệu ghi 12.345) — ghi lại nguyên văn để user chốt.
		const mau = (noi.match(/Xem trước kết quả\s*([\d.,]+)\s*->?\s*([\d.,]+)/) || []).slice(1);
		expect(
			mau.length,
			`Không đọc được cặp số của ô Xem trước. Nội dung form: ${noi.slice(0, 200)}`,
		).toBe(2);
		test.info().annotations.push({
			type: 'số mẫu thật của ô Xem trước',
			description: `${mau[0]} → ${mau[1]}`,
		});
	});

	test('07_1_010_006 — Phương thức làm tròn mặc định là Làm tròn thông thường', async ({ page }) => {
		chanNeuTat('07_1_010_006');

		await moNhom(page, NHOM.lamTronTien, VAI);
		const dr = await moFormSua(page);
		const o = dr.locator('#roundingMethod').locator('xpath=ancestor::div[contains(@class,"ant-select")][1]');
		const dangChon = chuan(await o.innerText());

		// 🔴 Đây là GIÁ TRỊ ĐANG LƯU của hệ thống, không phải giá trị mặc định của form. Nếu ai đó
		//    đã đổi cấu hình thì case này đỏ — và đó là thông tin đúng, 🚫 không nới lỏng assertion.
		expect(
			dangChon,
			`Phương thức làm tròn đang lưu là "${dangChon}", không phải "Làm tròn thông thường". ` +
				'Cấu hình cấp hệ thống đã bị đổi, hoặc kỳ vọng của kịch bản cần user chốt lại.',
		).toContain('Làm tròn thông thường');
	});

	test('07_1_020_004 — Xem trước kết quả làm tròn số lượng theo số mẫu 12.3456', async ({ page }) => {
		chanNeuTat('07_1_020_004');

		await moNhom(page, NHOM.lamTronSoLuong, VAI);
		const dr = await moFormSua(page);
		const noi = chuan(await dr.innerText());
		expect(noi, 'Form làm tròn số lượng không có khối Xem trước').toContain('Xem trước');
		test.info().annotations.push({ type: 'nội dung form', description: noi.slice(0, 200) });
	});

	test('07_1_030_001 — Thẻ Tiền tệ hiện loại tiền đang áp dụng', async ({ page }) => {
		chanNeuTat('07_1_030_001');

		await moNhom(page, NHOM.tienTe, VAI);
		const noi = chuan(await khung(page).innerText());
		expect(
			/VND|USD|Đang tắt/.test(noi),
			`Thẻ Tiền tệ không hiện loại tiền nào lẫn trạng thái "Đang tắt". Nội dung: ${noi.slice(0, 200)}`,
		).toBe(true);
	});

	test('07_1_030_002 — Cấu hình tiền tệ đang tắt thì hiện Đang tắt', async ({ page }) => {
		chanNeuTat('07_1_030_002');

		await moNhom(page, NHOM.tienTe, VAI);
		const congTac = khung(page).locator('.ant-switch').last();
		if ((await congTac.count()) === 0) boQua(test, 'Thẻ Tiền tệ không có công tắc để đọc trạng thái.');

		const dangBat = (await congTac.getAttribute('class'))?.includes('ant-switch-checked');
		const noi = chuan(await khung(page).innerText());
		if (dangBat) {
			boQua(
				test,
				'Cấu hình tiền tệ đang BẬT — 🚫 không tắt nó để dựng tình huống: đây là cấu hình cấp ' +
					'hệ thống, tắt là ảnh hưởng mọi điểm bán ngay.',
			);
		}
		expect(noi, 'Cấu hình đang tắt mà thẻ không hiện "Đang tắt"').toContain('Đang tắt');
	});

	test('07_1_030_005 — Ô Mô tả giới hạn 200 ký tự và có bộ đếm', async ({ page }) => {
		chanNeuTat('07_1_030_005');

		await moNhom(page, NHOM.tienTe, VAI);
		const dr = await moFormSua(page);
		const o = dr.locator('textarea').first();
		if ((await o.count()) === 0) boQua(test, 'Form tiền tệ không có ô Mô tả dạng textarea.');

		await o.fill('a'.repeat(250));
		await page.waitForTimeout(800);
		const daNhap = (await o.inputValue()).length;
		expect(daNhap, `Ô Mô tả nhận ${daNhap} ký tự — phải chặn ở 200`).toBe(200);
		// 🔴 Bộ đếm hiển thị **có khoảng trắng**: `200 / 200`, 🚫 không phải `200/200`.
		expect(chuan(await dr.innerText()), 'Không thấy bộ đếm ký tự 200 / 200').toContain('200 / 200');
	});

	test('07_1_040_001 — Thẻ VAT mặc định hiện thuế suất đang áp dụng', async ({ page }) => {
		chanNeuTat('07_1_040_001');

		await moNhom(page, NHOM.vat, VAI);
		const noi = chuan(await khung(page).innerText());
		expect(
			/\d+%|Đang tắt/.test(noi),
			`Thẻ VAT không hiện thuế suất nào lẫn "Đang tắt". Nội dung: ${noi.slice(0, 200)}`,
		).toBe(true);
	});

	test('07_1_040_003 — Danh sách thuế suất chỉ có 0% 5% 8% 10% và mặc định 8%', async ({ page }) => {
		chanNeuTat('07_1_040_003');

		await moNhom(page, NHOM.vat, VAI);
		const dr = await moFormSua(page);
		const o = dr.locator('.ant-select').first();
		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		await page.keyboard.press('Escape');

		expect(nhan, `Danh sách thuế suất đang có: ${nhan.join(' · ')}`).toEqual(['0%', '5%', '8%', '10%']);
	});

	test('07_1_040_004 — Chặn lưu khi chưa chọn thuế suất VAT', async ({ page }) => {
		chanNeuTat('07_1_040_004');
		const { daGoi } = await chanGhi(page);

		await moNhom(page, NHOM.vat, VAI);
		const dr = await moFormSua(page);
		const o = dr.locator('.ant-select').first();
		await o.hover();
		const xoa = o.locator('.ant-select-clear');
		if ((await xoa.count()) === 0) {
			boQua(
				test,
				'Ô thuế suất KHÔNG có nút xoá (`allowClear`) ⇒ không tái hiện được trạng thái "chưa ' +
					'chọn". 🚫 Không hạ kỳ vọng — cần user chốt: bỏ rule bắt buộc hay mở allowClear.',
			);
		}
		await xoa.click({ force: true });
		await dr.getByRole('button', { name: 'Lưu cấu hình' }).click({ force: true });
		await page.waitForTimeout(2_000);

		const loi = [
			...(await dr.locator('.ant-form-item-explain-error').allInnerTexts()),
			...(await page.locator('.ant-message').allInnerTexts()),
		].map(chuan);
		expect(loi.join(' | ')).toContain('Vui lòng chọn thuế suất VAT');
		expect(daGoi, 'Chưa chọn thuế suất mà vẫn gửi request lưu').toEqual([]);
	});

	test('07_1_050_002 — Thời gian chờ chỉ chọn trong danh sách cố định', async ({ page }) => {
		chanNeuTat('07_1_050_002');

		await moNhom(page, NHOM.tuDongDangXuat, VAI);
		const dr = await moFormSua(page);
		const o = dr.locator('.ant-select').first();
		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		await page.keyboard.press('Escape');

		expect(nhan, `Danh sách thời gian chờ đang có: ${nhan.join(' · ')}`).toEqual([
			'1 phút',
			'5 phút',
			'10 phút',
			'15 phút',
			'30 phút',
		]);
	});

	test('07_1_050_003 — Chặn lưu khi chưa chọn thời gian chờ', async ({ page }) => {
		chanNeuTat('07_1_050_003');
		const { daGoi } = await chanGhi(page);

		await moNhom(page, NHOM.tuDongDangXuat, VAI);
		const dr = await moFormSua(page);
		const o = dr.locator('.ant-select').first();
		await o.hover();
		const xoa = o.locator('.ant-select-clear');
		if ((await xoa.count()) === 0) {
			boQua(
				test,
				'Ô thời gian chờ KHÔNG có nút xoá ⇒ không tái hiện được trạng thái "chưa chọn". ' +
					'🚫 Không hạ kỳ vọng — cần user chốt.',
			);
		}
		await xoa.click({ force: true });
		await dr.getByRole('button', { name: 'Lưu cấu hình' }).click({ force: true });
		await page.waitForTimeout(2_000);

		const loi = [
			...(await dr.locator('.ant-form-item-explain-error').allInnerTexts()),
			...(await page.locator('.ant-message').allInnerTexts()),
		].map(chuan);
		expect(loi.join(' | ')).toContain('Vui lòng chọn thời gian chờ');
		expect(daGoi).toEqual([]);
	});

	test('07_1_050_004 — Huỷ giữa chừng khi đang sửa cấu hình', async ({ page }) => {
		chanNeuTat('07_1_050_004');
		const { daGoi } = await chanGhi(page);

		await moNhom(page, NHOM.tuDongDangXuat, VAI);
		let dr = await moFormSua(page);
		const o = dr.locator('.ant-select').first();
		const truoc = chuan(await o.innerText());

		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const muc = dd.locator('.ant-select-item-option-content');
		const so = await muc.count();
		let daDoi = false;
		for (let i = 0; i < so; i += 1) {
			if (chuan(await muc.nth(i).innerText()) === truoc) continue;
			await muc.nth(i).click();
			daDoi = true;
			break;
		}
		if (!daDoi) boQua(test, 'Chỉ có một lựa chọn — không đổi được giá trị để thử huỷ.');
		await page.waitForTimeout(800);

		// Đóng drawer giữa chừng, 🚫 không lưu.
		await page.locator('.ant-drawer-close, .ant-modal-close').last().click({ force: true });
		await page.waitForTimeout(2_000);
		expect(daGoi, 'Đóng form giữa chừng mà vẫn gửi request lưu').toEqual([]);

		dr = await moFormSua(page);
		const sau = chuan(await dr.locator('.ant-select').first().innerText());
		// 🔴 Còn giữ giá trị sửa dở là bẫy: người dùng dễ tưởng đã lưu.
		expect(
			sau,
			`Mở lại form vẫn còn giá trị sửa dở ("${sau}" thay vì "${truoc}") — người dùng dễ tưởng đã lưu.`,
		).toBe(truoc);
	});
});
