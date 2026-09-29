'use strict';

/**
 * Phân hệ 04_5 — hai case PHẠM VI chạy bằng vai **Bưu điện Tỉnh**.
 *
 * 🔴 Chạy bằng vai điểm bán là pass giả: điểm bán chỉ có một kho nên ô chọn điểm bán không nói
 * lên điều gì.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');

const GOC = path.join(__dirname, '..');
const { boQua, chanGhi, chuan, dong, khung, moTheKho, moTongQuan } = require('./stock-page');

const VAI = 'province';
const chanNeuTat = (id) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test('04_5_010_004 — Chọn điểm bán ở Tổng quan kho theo vai', async ({ page }) => {
	chanNeuTat('04_5_010_004');
	await chanGhi(page);
	await moTongQuan(page, VAI);

	// 🔴 Ô chọn điểm bán ở nhóm màn kho mở **drawer ba cột**, 🚫 không phải dropdown.
	const o = khung(page).locator('.ant-select').filter({ hasText: /điểm bán|kho/i }).first();
	if ((await o.count()) === 0) {
		boQua(
			test,
			'Vai tỉnh KHÔNG có ô chọn điểm bán ở màn Tổng quan kho — ghi nhận để user chốt: ' +
				'hoặc màn không hỗ trợ, hoặc vai này thiếu quyền.',
		);
	}
	await o.click({ force: true });
	const dr = page.locator('.ant-drawer-open').last();
	await expect(
		dr,
		'Bấm ô chọn điểm bán mà không mở drawer "Chọn Điểm bán / Kho" nào',
	).toBeVisible({ timeout: 20_000 });
	// 🔴 Tiêu đề drawer KHÔNG thống nhất giữa các màn: ở Tổng quan kho là **"Chọn Kho / Điểm bán"**,
	//    ở màn Chuyển kho là **"Chọn Điểm bán / Kho"** — hai thứ tự ngược nhau. Khớp cả hai.
	expect(chuan(await dr.locator('.ant-drawer-title').innerText())).toMatch(
		/Chọn (Điểm bán \/ Kho|Kho \/ Điểm bán)/i,
	);
	expect(await dr.locator('.sp-column').count(), 'Drawer chọn điểm bán không đủ ba cột').toBe(3);
});

test('04_5_030_003 — Bộ lọc Điểm bán / Kho ở Thẻ kho', async ({ page }) => {
	chanNeuTat('04_5_030_003');
	await chanGhi(page);

	const pane = await moTheKho(page, VAI);
	const noi = chuan(await pane.innerText());
	if (noi === '') {
		boQua(
			test,
			'🔴 Thẻ "Thẻ kho" mở ra rỗng hoàn toàn — xem `04_5_030_002`. 🚫 Không kiểm được bộ lọc.',
		);
	}

	const o = pane.locator('.ant-select').filter({ hasText: /điểm bán|kho/i }).first();
	expect(await o.count(), 'Thẻ kho không có ô lọc Điểm bán / Kho cho vai tỉnh').toBeGreaterThan(0);
	void dong;
});
