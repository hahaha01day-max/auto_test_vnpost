'use strict';

/** 33 · Lịch sử thao tác người dùng, vai `tct`. Màn chỉ đọc; vẫn bọc `chanGhi()`. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan, nhanCacOption, oTim, thoiGian, tim, timOLoc } =
	require('./history-page');

const GOC = path.join(__dirname, '..');
const CHIN_COT = [
	'STT',
	'Nhóm nghiệp vụ',
	'Hành động',
	'Người thao tác',
	'Vai trò',
	'Đơn vị',
	'IP',
	'Thời gian',
];
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('33 · Lịch sử thao tác người dùng', () => {
	let so;
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		so = await moMan(page, 'tct');
	});

	test('33_010_002 — Bảng lịch sử hiển thị đủ chín cột', async ({ page }) => {
		chanNeuTat('33_010_002');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Lịch sử thao tác người dùng',
		);
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'cột thật', description: cot.join(' · ') });
		for (const nhan of CHIN_COT) {
			expect(cot.join(' · '), `Bảng thiếu cột "${nhan}". Cột thật: ${cot.join(' · ')}`).toContain(
				nhan,
			);
		}
		expect(cot.length, `Bảng có ${cot.length} cột, kịch bản khai 9`).toBe(9);
	});

	test('33_010_003 — Cột hành động ghim bên phải khi cuộn ngang', async ({ page }) => {
		chanNeuTat('33_010_003');

		const ghim = khung(page).locator('.ant-table-thead th.ant-table-cell-fix-right');
		const soGhim = await ghim.count();
		test.info().annotations.push({
			type: 'cột ghim phải',
			description: soGhim > 0 ? chuan((await ghim.allInnerTexts()).join(' · ')) : '(không có)',
		});
		expect(
			soGhim,
			'Cột "Hành động" cuối bảng KHÔNG được ghim bên phải — cuộn ngang là mất nút thao tác',
		).toBeGreaterThan(0);
	});

	test('33_020_003 — Ô lọc Nhóm nghiệp vụ có đủ 15 giá trị', async ({ page }) => {
		chanNeuTat('33_020_003');

		const nhan = await nhanCacOption(page, 'Nhóm nghiệp vụ');
		test.info().annotations.push({
			type: 'nguyên văn các nhóm nghiệp vụ',
			description: `${nhan.length} giá trị: ${nhan.join(' · ')}`,
		});
		expect(nhan.length, 'Ô "Nhóm nghiệp vụ" không có lựa chọn nào').toBeGreaterThan(0);
		expect(
			nhan.length,
			`Ô Nhóm nghiệp vụ có ${nhan.length} giá trị, HDSD khai 15: ${nhan.join(' · ')}`,
		).toBe(15);
	});

	test('33_020_004 — Ô lọc Hành động có đủ 9 giá trị', async ({ page }) => {
		chanNeuTat('33_020_004');

		const nhan = await nhanCacOption(page, 'Hành động');
		test.info().annotations.push({
			type: 'nguyên văn các hành động',
			description: `${nhan.length} giá trị: ${nhan.join(' · ')}`,
		});
		expect(nhan.length, 'Ô "Hành động" không có lựa chọn nào').toBeGreaterThan(0);
		expect(
			nhan.length,
			`Ô Hành động có ${nhan.length} giá trị, HDSD khai 9: ${nhan.join(' · ')}`,
		).toBe(9);
	});

	test('33_020_005 — Tìm người thao tác khớp một phần không phân biệt hoa thường', async ({ page }) => {
		chanNeuTat('33_020_005');

		expect(so, 'Không có bản ghi nào để lấy tên người thao tác').toBeGreaterThan(0);
		const ten = chuan(await dong(page).first().locator('td').nth(3).innerText()).split(' ')[0];
		if (!ten) test.skip(true, 'Không đọc được tên người thao tác ở dòng đầu.');

		await tim(page, ten.toLowerCase());
		const thuong = await dong(page).count();
		await tim(page, ten.toUpperCase());
		const hoa = await dong(page).count();
		test.info().annotations.push({
			type: 'kết quả hai lần tìm',
			description: `thường=${thuong} · hoa=${hoa} (từ khoá "${ten}")`,
		});
		expect(thuong, `Tìm "${ten}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		expect(hoa, 'Chữ hoa và chữ thường cho kết quả khác nhau').toBe(thuong);
	});

	test('33_020_006 — Nút xoá nhanh ô tìm người thao tác', async ({ page }) => {
		chanNeuTat('33_020_006');

		await tim(page, 'ZZZ-KHONG-TON-TAI-999');
		expect(await dong(page).count()).toBe(0);

		const xoa = khung(page).locator('.ant-input-clear-icon:visible').first();
		if ((await xoa.count()) === 0) {
			test.skip(true, 'Ô tìm không có nút xoá nhanh (clear icon) khi đang có từ khoá.');
		}
		await xoa.click();
		await page.waitForTimeout(3_500);
		expect(await oTim(page).inputValue(), 'Bấm xoá nhanh mà ô vẫn còn chữ').toBe('');
		expect(
			await dong(page).count(),
			'Xoá từ khoá mà danh sách không trở lại như chưa lọc',
		).toBe(so);
	});

	test('33_020_008 — Tìm người thao tác bằng ký tự đặc biệt', async ({ page }) => {
		const i = chanNeuTat('33_020_008');

		expect(so, 'Không có bản ghi nào để đối chiếu').toBeGreaterThan(0);
		const tuKhoa = i?.data?.tuKhoa ?? '%_';
		await tim(page, tuKhoa);
		const sau = await dong(page).count();
		test.info().annotations.push({
			type: 'hành vi thật',
			description: `${so} dòng → ${sau} dòng khi tìm "${tuKhoa}"`,
		});
		expect(
			sau,
			`Tìm bằng ký tự đại diện SQL "${tuKhoa}" vẫn trả đủ ${so} dòng ⇒ wildcard không escape`,
		).toBeLessThan(so);
	});

	test('33_020_009 — Tìm người thao tác không dấu', async ({ page }) => {
		chanNeuTat('33_020_009');

		expect(so, 'Không có bản ghi nào').toBeGreaterThan(0);
		const ten = chuan(await dong(page).first().locator('td').nth(3).innerText()).split('\n')[0];
		const khongDau = ten.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd');
		if (khongDau === ten) test.skip(true, `Tên "${ten}" vốn đã không dấu ⇒ không kiểm được.`);

		await tim(page, khongDau);
		const thay = chuan(await khung(page).innerText()).includes(ten);
		test.info().annotations.push({
			type: 'hành vi thật',
			description: `gõ "${khongDau}" ${thay ? 'CÓ' : 'KHÔNG'} tìm ra "${ten}"`,
		});
		expect(
			thay,
			`Gõ tên không dấu "${khongDau}" 🚫 KHÔNG tìm ra người "${ten}" — người dùng gõ nhanh ` +
				'không dấu sẽ tưởng không có bản ghi nào.',
		).toBe(true);
	});

	test('33_060_003 — Sắp xếp mặc định mới nhất lên đầu', async ({ page }) => {
		chanNeuTat('33_060_003');

		expect(so, 'Không có bản ghi nào để kiểm thứ tự').toBeGreaterThan(1);
		const moc = [];
		for (let i = 0; i < Math.min(so, 10); i += 1) moc.push(await thoiGian(page, i));
		if (moc.some((m) => m === null)) {
			test.skip(true, 'Không đọc được cột Thời gian ở một số dòng để so thứ tự.');
		}
		const giam = [...moc].sort((a, b) => b - a);
		expect(
			moc.map((m) => new Date(m).toISOString()),
			'Danh sách KHÔNG xếp mới nhất lên đầu',
		).toEqual(giam.map((m) => new Date(m).toISOString()));
	});

	test('33_060_002 — Phân trang danh sách lịch sử', async ({ page }) => {
		chanNeuTat('33_060_002');

		expect(so, 'Không có bản ghi nào để kiểm phân trang').toBeGreaterThan(0);
		const trang = khung(page).locator('.ant-pagination-item');
		if ((await trang.count()) < 2) test.skip(true, `Chỉ có ${so} bản ghi, chưa đủ 2 trang.`);

		const truoc = chuan(await dong(page).first().innerText());
		await trang.nth(1).click();
		await page.waitForTimeout(4_000);
		expect(chuan(await dong(page).first().innerText()), 'Trang 2 trùng y hệt trang 1').not.toBe(
			truoc,
		);
	});
});
