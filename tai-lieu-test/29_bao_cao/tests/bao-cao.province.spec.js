'use strict';

/** 29 · Báo cáo doanh thu · lãi/lỗ · tuỳ chỉnh, vai `province`. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan } = require('./report-page');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test('29_010_001 — Báo cáo doanh thu mở được và hiện đủ khối', async ({ page }) => {
	chanNeuTat('29_010_001');

	await chanGhi(page);
	const trangThai = await moMan(page, 'doanhThu', VAI);
	expect(
		trangThai.some((s) => s === 200),
		`Không đọc được số liệu doanh thu (status: ${trangThai.join(' · ') || 'không gọi'})`,
	).toBe(true);

	const chu = chuan(await khung(page).innerText());
	// Bốn khối của màn: thẻ chỉ tiêu · bảng phân cấp đơn vị · đồ thị · bảng Top SKU.
	expect(
		await khung(page).locator('.ant-statistic, .ant-card').count(),
		'Không thấy khối thẻ chỉ tiêu nào',
	).toBeGreaterThan(0);
	expect(
		await khung(page).locator('.ant-table').count(),
		'Không thấy bảng nào trên màn báo cáo doanh thu',
	).toBeGreaterThan(0);
	expect(
		await khung(page).locator('canvas, svg.recharts-surface, .recharts-wrapper').count(),
		`Không thấy đồ thị nào. Chữ trên màn: ${chu.slice(0, 300)}`,
	).toBeGreaterThan(0);
	expect(chu, 'Màn không có bảng "Top SKU"').toMatch(/Top\s*SKU/i);
});

test('29_030_003 — Làm mới số liệu lãi lỗ báo đúng thông điệp', async ({ page }) => {
	chanNeuTat('29_030_003');

	const { daGoi } = await chanGhi(page);
	await moMan(page, 'laiLo', VAI);
	await expect(page.locator('.ant-page-header-heading-title').first()).toContainText('Lãi/Lỗ');

	const nut = khung(page).getByRole('button', { name: 'Làm mới' }).first();
	await expect(nut, 'Màn lãi/lỗ không có nút "Làm mới"').toBeVisible();
	await nut.click();
	await page.waitForTimeout(4_000);

	const bao = chuan(
		await page.locator('.ant-message, .ant-notification').first().innerText().catch(() => ''),
	);
	test.info().annotations.push({ type: 'nguyên văn thông báo', description: bao || '(không có)' });
	// 🔴 Nếu nút "Làm mới" gọi một request GHI thì `chanGhi()` đã chặn ⇒ thông báo trên màn là
	//    thông báo LỖI, 🚫 không đo được nguyên văn thông điệp thành công. Skip có lý do.
	if (daGoi.length > 0) {
		test.skip(
			true,
			`Nút "Làm mới" gửi request ghi (${daGoi.join(' ; ')}) — đã bị chặn để không tổng hợp lại ` +
				'số liệu thật, nên 🚫 không đo được thông điệp thành công.',
		);
	}
	expect(
		bao,
		'Bấm "Làm mới" mà không có thông báo nào. Kỳ vọng nguyên văn: "Đã tải lại số liệu Lãi/Lỗ."',
	).toContain('Lãi/Lỗ');
});

test('29_130_001 — Báo cáo tuỳ chỉnh dựng thanh báo cáo và tự chọn báo cáo', async ({ page }) => {
	chanNeuTat('29_130_001');

	await chanGhi(page);
	const trangThai = await moMan(page, 'tuyChinh', VAI);
	expect(
		trangThai.some((s) => s === 200),
		`Không đọc được danh mục báo cáo (status: ${trangThai.join(' · ') || 'không gọi'})`,
	).toBe(true);

	const chu = chuan(await khung(page).innerText());
	const muc = await khung(page).locator('.ant-tabs-tab, .ant-menu-item, .ant-segmented-item').count();
	test.info().annotations.push({
		type: 'thanh báo cáo',
		description: `${muc} mục · chữ trên màn: ${chu.slice(0, 250)}`,
	});
	expect(
		muc,
		`Màn báo cáo tuỳ chỉnh KHÔNG dựng thanh báo cáo nào. Chữ trên màn: ${chu.slice(0, 300)}`,
	).toBeGreaterThan(0);
	// Kịch bản: hệ thống TỰ CHỌN báo cáo đầu tiên.
	expect(
		await khung(page)
			.locator('.ant-tabs-tab-active, .ant-menu-item-selected, .ant-segmented-item-selected')
			.count(),
		'Thanh báo cáo dựng ra nhưng không mục nào được tự chọn',
	).toBeGreaterThan(0);
});

test('29_140_002 — Vai Bưu điện Tỉnh không cấu hình được danh mục báo cáo', async ({ page }) => {
	chanNeuTat('29_140_002');

	const { daGoi } = await chanGhi(page);
	await moMan(page, 'tuyChinh', VAI);

	const nut = khung(page).getByRole('button', { name: /Cấu hình báo cáo/ });
	const so = await nut.count();
	test.info().annotations.push({
		type: 'nút trên màn (vai tỉnh)',
		description: chuan((await khung(page).locator('button').allInnerTexts()).join(' · ')),
	});
	// 🔴 Task 140 chỉ khai vai TONG_CONG_TY ⇒ cấp tỉnh 🚫 không được thấy nút cấu hình.
	expect(
		so,
		`Vai Bưu điện Tỉnh thấy ${so} nút "Cấu hình báo cáo" — task 140 chỉ khai cho TONG_CONG_TY`,
	).toBe(0);
	expect(daGoi, `Vai tỉnh gửi được request ghi: ${daGoi.join(' ; ')}`).toEqual([]);
});
