'use strict';

/**
 * Phân hệ 14_2 — Gom / tách phiếu trả, phần ĐỌC (vai `province`).
 *
 * 🔴 Gom phiếu là **điều phối hàng thật giữa các đơn vị** và 🚫 không tách ngược lại được
 * (`14_2_010_017`) ⇒ mọi case ghi giữ `allowMutation: false`. Cả file bọc `chanGhi()`.
 *
 * Đo 20/09/2026: vai tỉnh thấy nút **"Gom phiếu (N)"** và một cột ô chọn; vai điểm bán thì thấy
 * nút *"Tạo phiếu trả"* — 🚫 hai vai KHÔNG giống nhau.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');

const GOC = path.join(__dirname, '..');
const { chanGhi, chuan, dong, khung, moDanhSach } = require('./return-page');

const VAI = 'province';
const chanNeuTat = (id) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const KHONG_CO_PHIEU =
	'Phạm vi tỉnh chưa có phiếu xuất trả nào. 🚫 Không tự lập phiếu để có dữ liệu — lập phiếu là ' +
	'xuất hàng thật khỏi kho điểm bán.';

/** Chỉ số các dòng mang trạng thái `nhan`. */
async function dongTheoTrangThai(page, nhan) {
	const ra = [];
	const so = await dong(page).count();
	for (let i = 0; i < so; i += 1) {
		if (chuan(await dong(page).nth(i).innerText()).includes(nhan)) ra.push(i);
	}
	return ra;
}

test.describe('14_2 — Gom phiếu trả', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moDanhSach(page, VAI);
	});

	test('14_2_010_001 — Ô chọn gom chỉ bật với phiếu Đã duyệt', async ({ page }) => {
		chanNeuTat('14_2_010_001');

		const so = await dong(page).count();
		if (so === 0) test.skip(true, KHONG_CO_PHIEU);

		let daKiem = 0;
		for (let i = 0; i < so; i += 1) {
			const o = dong(page).nth(i).locator('input[type="checkbox"]').first();
			if ((await o.count()) === 0) continue;
			const daDuyet = chuan(await dong(page).nth(i).innerText()).includes('Đã duyệt');
			const batDuoc = await o.isEnabled();
			daKiem += 1;
			expect(
				batDuoc,
				`Dòng ${i + 1} (${daDuyet ? 'Đã duyệt' : 'KHÔNG phải Đã duyệt'}) có ô chọn ` +
					`${batDuoc ? 'BẬT' : 'TẮT'} — trái luật getCheckboxProps (chặn theo status !== APPROVED)`,
			).toBe(daDuyet);
		}
		expect(daKiem, 'Không dòng nào có ô chọn để kiểm').toBeGreaterThan(0);
	});

	test('14_2_010_003 — Chọn ít hơn 2 phiếu thì nút Gom phiếu bị khoá', async ({ page }) => {
		chanNeuTat('14_2_010_003');

		const daDuyet = await dongTheoTrangThai(page, 'Đã duyệt');
		if (daDuyet.length === 0) test.skip(true, `${KHONG_CO_PHIEU} (Không có phiếu "Đã duyệt".)`);

		const nutGom = () => khung(page).getByRole('button', { name: /Gom phiếu/ }).first();
		await expect(nutGom(), 'Chưa chọn phiếu nào mà nút Gom phiếu đã bật').toBeDisabled();

		await dong(page).nth(daDuyet[0]).locator('input[type="checkbox"]').first().check();
		await page.waitForTimeout(1_500);
		expect(
			chuan(await nutGom().innerText()),
			'Chọn 1 phiếu mà nhãn nút không đổi thành "Gom phiếu (1)"',
		).toContain('(1)');
		await expect(nutGom(), 'Chọn 1 phiếu mà nút Gom phiếu đã bật — phải cần tối thiểu 2').toBeDisabled();
	});

	test('14_2_010_002 — Nút Gom phiếu hiện đúng số phiếu đang chọn', async ({ page }) => {
		chanNeuTat('14_2_010_002');

		const daDuyet = await dongTheoTrangThai(page, 'Đã duyệt');
		if (daDuyet.length < 2) {
			test.skip(true, `${KHONG_CO_PHIEU} (Cần ít nhất 2 phiếu "Đã duyệt", đang có ${daDuyet.length}.)`);
		}

		const nutGom = () => khung(page).getByRole('button', { name: /Gom phiếu/ }).first();
		await dong(page).nth(daDuyet[0]).locator('input[type="checkbox"]').first().check();
		await dong(page).nth(daDuyet[1]).locator('input[type="checkbox"]').first().check();
		await page.waitForTimeout(1_500);

		expect(chuan(await nutGom().innerText()), 'Chọn 2 phiếu mà nhãn nút không phải "(2)"').toContain(
			'(2)',
		);
		await expect(nutGom(), 'Chọn đủ 2 phiếu mà nút Gom vẫn khoá').toBeEnabled();

		if (daDuyet.length >= 3) {
			await dong(page).nth(daDuyet[2]).locator('input[type="checkbox"]').first().check();
			await page.waitForTimeout(1_500);
			expect(chuan(await nutGom().innerText()), 'Tích thêm phiếu mà nhãn nút không lên "(3)"').toContain(
				'(3)',
			);
		}
	});

	test('14_2_010_015 — Đóng hộp xác nhận gom không gom gì', async ({ page }) => {
		const { daGoi } = await chanGhi(page);
		chanNeuTat('14_2_010_015');

		const daDuyet = await dongTheoTrangThai(page, 'Đã duyệt');
		if (daDuyet.length < 2) {
			test.skip(true, `${KHONG_CO_PHIEU} (Cần ít nhất 2 phiếu "Đã duyệt", đang có ${daDuyet.length}.)`);
		}

		await dong(page).nth(daDuyet[0]).locator('input[type="checkbox"]').first().check();
		await dong(page).nth(daDuyet[1]).locator('input[type="checkbox"]').first().check();
		await page.waitForTimeout(1_000);
		await khung(page).getByRole('button', { name: /Gom phiếu/ }).first().click({ force: true });
		await page.waitForTimeout(2_500);

		const hop = page.locator('.ant-modal-wrap:visible, .ant-modal-confirm').last();
		await expect(hop, 'Bấm Gom phiếu mà không hiện hộp xác nhận').toBeVisible({ timeout: 15_000 });
		await hop.getByRole('button', { name: /Huỷ|Hủy|Đóng/ }).first().click({ force: true });
		await page.waitForTimeout(2_000);

		expect(daGoi, '🔴 Đóng hộp xác nhận mà vẫn gửi request gom phiếu').toEqual([]);
		// Ô tích phải còn nguyên.
		expect(
			await dong(page).nth(daDuyet[0]).locator('input[type="checkbox"]').first().isChecked(),
			'Đóng hộp xác nhận xong ô tích bị bỏ — người dùng phải chọn lại từ đầu',
		).toBe(true);
	});
});
