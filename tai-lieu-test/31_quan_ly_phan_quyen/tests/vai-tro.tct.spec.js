'use strict';

/** 31 · Màn Quản lý vai trò, vai `tct`. 🚫 KHÔNG ghi — sửa quyền là đổi quyền người thật. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, dongVaiTro, khung, moChucNang, moVaiTro, nhanCot, oTim, tim } =
	require('./role-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('31 · Quản lý vai trò', () => {
	let chan;
	test.beforeEach(async ({ page }) => {
		chan = await chanGhi(page);
		await moVaiTro(page);
	});

	test('31_030_001 — Bảng danh sách vai trò hiển thị đủ dữ liệu', async ({ page }) => {
		chanNeuTat('31_030_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý vai trò',
		);
		const cot = await nhanCot(page);
		test.info().annotations.push({ type: 'cột thật', description: cot || '(không đọc được)' });

		const so = await dongVaiTro(page).count();
		expect(so, 'Không có dòng vai trò nào để đối chiếu').toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			const chu = chuan(await dongVaiTro(page).nth(i).innerText());
			expect(chu, `Dòng vai trò thứ ${i + 1} rỗng`).not.toBe('');
			expect(chu, `Dòng vai trò thứ ${i + 1} thiếu phạm vi`).toMatch(
				/TỔNG CÔNG TY|BƯU ĐIỆN TỈNH|BƯU ĐIỆN XÃ|ĐIỂM BÁN/,
			);
		}
		// 🔴 Kịch bản đòi mỗi dòng có **mã vai trò**. Đo 20/09/2026: bảng chỉ có
		//    `Tên Vai trò / Nhóm · Phạm vi · Ghi chú · Thao tác`.
		expect(cot, `Bảng KHÔNG có cột mã vai trò. Cột thật: ${cot}`).toMatch(/Mã/);
	});

	test('31_030_002 — Ô tìm kiếm vai trò hiển thị đầy đủ', async ({ page }) => {
		chanNeuTat('31_030_002');

		await expect(oTim(page), 'Không thấy ô tìm kiếm vai trò').toBeVisible();
		const ph = await oTim(page).getAttribute('placeholder');
		test.info().annotations.push({ type: 'nguyên văn placeholder', description: chuan(ph) });
		expect(chuan(ph), 'Ô tìm kiếm không có placeholder gợi ý').not.toBe('');
	});

	test('31_030_003 — Nút Thêm vai trò hiển thị đúng', async ({ page }) => {
		chanNeuTat('31_030_003');

		const nut = khung(page).getByRole('button', { name: 'Thêm vai trò' }).first();
		await expect(nut, 'Không thấy nút Thêm vai trò').toBeVisible();
		await expect(nut, 'Nút Thêm vai trò bị vô hiệu hoá').toBeEnabled();
		test.info().annotations.push({
			type: 'nhãn nút thật',
			description: chuan(await nut.innerText()),
		});
	});

	test('31_030_004 — Nút thu gọn tất cả hoạt động đúng', async ({ page }) => {
		chanNeuTat('31_030_004');

		const truoc = await dongVaiTro(page).count();
		expect(truoc, 'Chưa có dòng vai trò nào đang mở để thu gọn').toBeGreaterThan(0);

		await khung(page).getByRole('button', { name: /Thu gọn tất cả/ }).first().click();
		await page.waitForTimeout(2_000);
		const sau = await dongVaiTro(page).count();
		expect(sau, `Bấm "Thu gọn tất cả" mà số dòng không giảm (${truoc} → ${sau})`).toBeLessThan(
			truoc,
		);
	});

	test('31_030_005 — Mỗi dòng vai trò có nút Chỉnh sửa', async ({ page }) => {
		chanNeuTat('31_030_005');

		const so = await dongVaiTro(page).count();
		expect(so, 'Không có dòng vai trò nào').toBeGreaterThan(0);
		const thieu = [];
		for (let i = 0; i < so; i += 1) {
			const d = dongVaiTro(page).nth(i);
			const co = await d.getByRole('button', { name: /Chỉnh sửa|Sửa|edit/i }).count();
			if (co === 0) thieu.push(chuan(await d.innerText()).slice(0, 40) || `#${i + 1}`);
		}
		test.info().annotations.push({
			type: 'nút trên một dòng',
			description: chuan((await dongVaiTro(page).first().getByRole('button').allInnerTexts()).join(' · ')),
		});
		expect(thieu, `Các dòng KHÔNG có nút Chỉnh sửa: ${thieu.join(' · ')}`).toEqual([]);
	});

	test('31_030_007 — Mỗi dòng vai trò có nút Phân quyền chức năng', async ({ page }) => {
		chanNeuTat('31_030_007');

		const so = await dongVaiTro(page).count();
		expect(so, 'Không có dòng vai trò nào').toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			await expect(
				dongVaiTro(page).nth(i).getByRole('button', { name: /Gán chức năng|Phân quyền/ }).first(),
				`Dòng vai trò thứ ${i + 1} không có nút phân quyền chức năng`,
			).toBeEnabled();
		}
	});

	test('31_040_001 — Tìm vai trò với từ khoá không tồn tại', async ({ page }) => {
		chanNeuTat('31_040_001');

		await tim(page, 'ZZZ-KHONG-BAO-GIO-CO-999');
		expect(await dongVaiTro(page).count()).toBe(0);

		const rong = khung(page).locator('.ant-empty').first();
		const chu = chuan(await khung(page).innerText());
		test.info().annotations.push({ type: 'chữ trên màn sau khi tìm', description: chu.slice(0, 300) });
		// 🔴 In cả chữ thật trên màn: "không có trạng thái rỗng" mà không kèm chữ đang hiện thì
		//    người đọc báo cáo không phân biệt được lỗi script với lỗi sản phẩm.
		expect(
			(await rong.count()) > 0 || /Không có|Trống|No data/i.test(chu),
			`Tìm không ra vai trò nào mà màn KHÔNG có dòng chữ trạng thái rỗng nào. ` +
				`Chữ trên màn: ${chu.slice(0, 250)}`,
		).toBe(true);
	});

	test('31_040_002 — Tìm vai trò với ký tự đặc biệt', async ({ page }) => {
		const i = chanNeuTat('31_040_002');

		const banDau = await dongVaiTro(page).count();
		expect(banDau, 'Không có vai trò nào để đối chiếu').toBeGreaterThan(0);

		await tim(page, i?.data?.tuKhoa ?? '%_');
		const sau = await dongVaiTro(page).count();
		test.info().annotations.push({
			type: 'hành vi thật',
			description: `${banDau} vai trò → ${sau} sau khi tìm "%_"`,
		});
		expect(
			sau,
			`Tìm bằng ký tự đại diện SQL vẫn trả đủ ${banDau} vai trò ⇒ wildcard không được xử lý`,
		).toBeLessThan(banDau);
	});

	test('31_040_003 — Tìm vai trò với từ khoá có khoảng trắng đầu cuối', async ({ page }) => {
		chanNeuTat('31_040_003');

		const so = await dongVaiTro(page).count();
		expect(so, 'Không có vai trò nào để lấy từ khoá').toBeGreaterThan(0);
		const ten = chuan(await dongVaiTro(page).first().innerText()).split(' ')[0];
		if (!ten) test.skip(true, 'Không đọc được tên vai trò ở dòng đầu.');

		await tim(page, `   ${ten}   `);
		expect(
			chuan(await khung(page).innerText()),
			`Tìm "${ten}" kèm khoảng trắng đầu/cuối mà không ra vai trò đó`,
		).toContain(ten);
	});

	test('31_040_004 — Tìm vai trò không phân biệt hoa thường', async ({ page }) => {
		chanNeuTat('31_040_004');

		const so = await dongVaiTro(page).count();
		expect(so, 'Không có vai trò nào để lấy từ khoá').toBeGreaterThan(0);
		const ten = chuan(await dongVaiTro(page).first().innerText()).split(' ')[0];
		if (!ten) test.skip(true, 'Không đọc được tên vai trò ở dòng đầu.');

		await tim(page, ten.toLowerCase());
		const thuong = await dongVaiTro(page).count();
		await tim(page, ten.toUpperCase());
		const hoa = await dongVaiTro(page).count();
		expect(hoa, `Chữ thường ra ${thuong} dòng, chữ hoa ra ${hoa} dòng`).toBe(thuong);
	});

	test('31_040_005 — Tìm vai trò khi để trống ô tìm kiếm', async ({ page }) => {
		chanNeuTat('31_040_005');

		const banDau = await dongVaiTro(page).count();
		await tim(page, 'ZZZ-KHONG-TON-TAI');
		expect(await dongVaiTro(page).count()).toBe(0);
		await tim(page, '');
		expect(
			await dongVaiTro(page).count(),
			'Xoá từ khoá mà danh sách không trở về đủ như ban đầu',
		).toBe(banDau);
	});

	test('31_070_001 — Nội dung popup xác nhận xoá vai trò', async ({ page }) => {
		chanNeuTat('31_070_001');

		const so = await dongVaiTro(page).count();
		expect(so, 'Không có vai trò nào').toBeGreaterThan(0);

		const nut = dongVaiTro(page).first().getByRole('button', { name: /Xoá|Xóa|delete/i }).first();
		if ((await nut.count()) === 0) {
			test.skip(
				true,
				'Dòng vai trò không có nút xoá. Nút đang có: ' +
					chuan((await dongVaiTro(page).first().getByRole('button').allInnerTexts()).join(' · ')),
			);
		}
		await nut.click();
		await page.waitForTimeout(2_000);

		const pop = page.locator('.ant-modal-confirm, .ant-popconfirm, .ant-modal-wrap:visible').last();
		expect(await pop.count(), 'Bấm xoá mà không có popup xác nhận nào').toBeGreaterThan(0);
		const chu = chuan(await pop.innerText());
		test.info().annotations.push({ type: 'nguyên văn popup xoá', description: chu });
		expect(chu, 'Popup xác nhận không nhắc tới vai trò').toMatch(/vai trò/i);
		// 🔴 Chỉ ĐỌC popup — 🚫 không bấm xác nhận. `chanGhi()` là lớp bảo vệ thứ hai.
		expect(chan.daGoi, `Mở popup xoá mà đã có request ghi: ${chan.daGoi.join(' ; ')}`).toEqual([]);
	});
});
