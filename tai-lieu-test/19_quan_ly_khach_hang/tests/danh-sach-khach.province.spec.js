'use strict';

/** 19 · Danh sách khách hàng + xuất Excel, vai `province`. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan, oTim, taiLaiBoi, thamSo, tim, tongSo } =
	require('./customer-page');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('19 · Danh sách khách hàng (cấp tỉnh)', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, VAI);
	});

	test('19_010_001 — Tìm khách tự lọc khi ngừng gõ và quay về trang đầu', async ({ page }) => {
		chanNeuTat('19_010_001');

		if ((await tongSo(page)) === 0) {
			test.skip(
				true,
				'Vai tỉnh đang thấy 0 khách hàng ⇒ 🚫 không phân biệt được "đã lọc" với "vốn rỗng". ' +
					'Xem mục lệch phạm vi trong test-cases.md.',
			);
		}

		// 🔴 KHÔNG bấm Enter: ô tìm tự lọc sau khi ngừng gõ (debounce).
		const res = await tim(page, 'a');
		const p = thamSo(res);
		expect(
			Object.values(p).some((v) => String(v) === 'a'),
			`Gõ từ khoá mà query không mang từ khoá: ${JSON.stringify(p)}`,
		).toBe(true);
		expect(
			Number(p.page ?? 0),
			`Lọc lại mà không quay về trang đầu: ${JSON.stringify(p)}`,
		).toBe(0);
	});

	test('19_010_003 — Tuỳ chỉnh cột hiển thị bật được cột đang tắt', async ({ page }) => {
		chanNeuTat('19_010_003');

		const nut = khung(page).getByRole('button', { name: /Tùy chỉnh cột|Tuỳ chỉnh cột/ });
		expect(
			await nut.count(),
			'Màn KHÔNG có nút "Tùy chỉnh cột hiển thị" — kịch bản đòi bật cột "Nợ cần thu hiện tại" ' +
				`qua nút này. Nút đang có: ${chuan((await khung(page).locator('button').allInnerTexts()).join(' · '))}`,
		).toBeGreaterThan(0);

		await nut.first().click();
		await page.waitForTimeout(1_500);
		const o = page.locator('.ant-dropdown:visible, .ant-popover:visible').last();
		await o.getByText('Nợ cần thu hiện tại').first().click();
		await page.waitForTimeout(1_500);

		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		expect(cot.join(' · '), 'Bật cột rồi mà bảng vẫn không có cột đó').toContain(
			'Nợ cần thu hiện tại',
		);
	});

	test('19_110_001 — Xuất Excel theo bộ lọc hiện tại', async ({ page }) => {
		chanNeuTat('19_110_001');

		const nut = khung(page).getByRole('button', { name: 'Xuất Excel' }).first();
		await expect(nut, 'Không thấy nút Xuất Excel').toBeVisible();
		await nut.click();
		await page.waitForTimeout(2_500);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		expect(
			await hop.count(),
			'Bấm "Xuất Excel" mà không mở hộp thoại xuất nào',
		).toBeGreaterThan(0);
		test.info().annotations.push({
			type: 'nội dung hộp xuất Excel',
			description: chuan(await hop.innerText()).slice(0, 500),
		});
	});

	test('19_110_002 — Chặn xuất khi chưa chọn điểm bán', async ({ page }) => {
		chanNeuTat('19_110_002');

		const { daGoi } = await chanGhi(page);
		await khung(page).getByRole('button', { name: 'Xuất Excel' }).first().click();
		await page.waitForTimeout(2_500);
		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const nutXuat = hop.getByRole('button', { name: /Xuất file excel|Xuất excel/i }).first();
		if ((await nutXuat.count()) === 0) {
			test.skip(true, 'Hộp xuất không có nút "Xuất file excel" — xem 19_110_001.');
		}
		await nutXuat.click();
		await page.waitForTimeout(2_500);

		const canhBao = chuan(
			await page.locator('.ant-message, .ant-notification, .ant-form-item-explain').first()
				.innerText().catch(() => ''),
		);
		expect(
			canhBao,
			`Chưa chọn điểm bán mà không có cảnh báo nào. Yêu cầu nguyên văn: ` +
				'"Vui lòng chọn điểm bán trước khi xuất dữ liệu"',
		).toContain('chọn điểm bán');
		expect(daGoi, `Chưa chọn điểm bán mà vẫn tạo yêu cầu xuất: ${daGoi.join(' ; ')}`).toEqual([]);
	});

	test('19_110_003 — Tệp xuất chỉ lưu trong 7 ngày', async ({ page }) => {
		chanNeuTat('19_110_003');

		await khung(page).getByRole('button', { name: 'Xuất Excel' }).first().click();
		await page.waitForTimeout(2_500);
		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		if ((await hop.count()) === 0) test.skip(true, 'Không mở được hộp xuất Excel — xem 19_110_001.');

		const chu = chuan(await hop.innerText());
		expect(
			/7 ngày/.test(chu),
			`Bảng lịch sử xuất KHÔNG ghi rõ tệp chỉ lưu 7 ngày. Nguyên văn đang có: ${chu.slice(0, 400)}`,
		).toBe(true);
	});

	test('19_120_005 — Tổ hợp nhiều bộ lọc khách hàng', async ({ page }) => {
		chanNeuTat('19_120_005');

		const oLoc = khung(page).locator('.ant-select');
		const so = await oLoc.count();
		// 🔴 Đo 20/09/2026: vai tỉnh KHÔNG có ô lọc nào ngoài ô tìm kiếm — kịch bản đòi bốn ô
		//    Trạng thái / Loại khách hàng / Nhóm khách hàng / Chi nhánh-điểm bán ở cấp trên điểm bán.
		expect(
			so,
			`Vai tỉnh chỉ thấy ${so} ô lọc; kịch bản đòi bốn ô lọc cấp trên điểm bán. ` +
				`Chữ trên màn: ${chuan(await khung(page).innerText()).slice(0, 300)}`,
		).toBeGreaterThan(0);

		const res = await tim(page, 'a');
		const p = thamSo(res);
		expect(Object.values(p).some((v) => String(v) === 'a'), 'Từ khoá không vào query').toBe(true);
	});
});
