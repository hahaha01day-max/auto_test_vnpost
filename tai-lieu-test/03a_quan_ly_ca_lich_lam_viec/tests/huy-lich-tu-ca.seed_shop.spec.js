'use strict';

/**
 * Case CHỈ ĐỌC của task 050 cần một lịch CHƯA chấm công trên lưới tuần hiện tại — Lý Sơn (vai
 * `shop`) thường không có, điểm bán seed thì có (bộ dựng nền 03b xếp ca hôm nay). Mọi request ghi
 * bị `chanGhi` chặn ở tầng mạng.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, moHuyTuChip, moManLich } = require('./shift-page');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('03a · 050 — Huỷ lịch từ một ca cụ thể (chỉ đọc, điểm bán seed)', () => {
	test.beforeEach(async ({ page }) => {
		await moManLich(page, VAI);
	});

	test('03a_050_003 — Hộp thoại huỷ lịch có đủ ba phạm vi', async ({ page }) => {
		chanNeuTat('03a_050_003');
		await chanGhi(page);

		// 🔴 Kịch bản đòi mở hộp thoại TỪ MỘT CA CỤ THỂ — "Chỉ ca này" chỉ có ở lối đó.
		const vao = await moHuyTuChip(page);
		if (!vao) test.skip(true, 'Lưới tuần hiện tại không có lịch nào CHƯA chấm công để mở hộp thoại từ một ca.');
		const { hop, ngay } = vao;
		const nhan = (await hop.locator('.ant-radio-wrapper').allInnerTexts()).map(chuan);

		expect(nhan.length, `Phạm vi huỷ hiện có: ${nhan.join(' · ')}`).toBe(3);
		expect(nhan[0], 'Lựa chọn đầu không phải "Chỉ ca này — <tên ca> ngày <dd/mm/yyyy>"').toMatch(
			new RegExp(`^Chỉ ca này — .+ ngày ${ngay.replace(/\//g, '\\/')}$`),
		);
		expect(nhan.slice(1)).toEqual(['Từ một ngày trở đi', 'Tất cả các lịch']);

		await hop.getByText('Từ một ngày trở đi', { exact: true }).click();
		await page.waitForTimeout(800);
		expect(chuan(await hop.innerText())).toContain('Huỷ từ ngày');
	});

	test('03a_050_007 — Vào từ một ca cụ thể thì ô Nhân viên bị vô hiệu', async ({ page }) => {
		chanNeuTat('03a_050_007');
		await chanGhi(page);

		const vao = await moHuyTuChip(page);
		if (!vao) test.skip(true, 'Lưới tuần hiện tại không có lịch nào CHƯA chấm công để mở hộp thoại từ một ca.');
		const { hop } = vao;

		const oNhanVien = hop.locator('.ant-select').first();
		expect(
			chuan(await oNhanVien.innerText()),
			'Ô Nhân viên không điền sẵn người của ca đã chọn',
		).not.toBe('Chọn nhân viên cần huỷ lịch');
		await expect(
			oNhanVien,
			'Ô Nhân viên không bị vô hiệu — có thể huỷ nhầm sang người khác',
		).toHaveClass(/ant-select-disabled/);
	});
});
