'use strict';

/**
 * `04_3_060_005` — bộ lọc điểm bán / kho ở màn Chuyển kho, nhìn từ **cấp Tỉnh**.
 *
 * 🔴 Chạy bằng vai `province`: vai điểm bán chỉ thấy đơn vị của mình nên bộ lọc không nói lên gì.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');

const GOC = path.join(__dirname, '..');
const {
	API_CHUYEN_KHO,
	boQua,
	chanGhi,
	chonDiemBanQuaDrawer,
	chuan,
	dong,
	moChuyenKho,
} = require('./warehouse-page');

const VAI = 'province';

test('04_3_060_005 — Bộ lọc chọn điểm bán / kho ở màn Chuyển kho', async ({ page }) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '04_3_060_005');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	await chanGhi(page);
	await moChuyenKho(page, VAI);

	// 🔴 Ô này mở DRAWER ba cột "Chọn Điểm bán / Kho", 🚫 không phải dropdown.
	// 🔴 🚫 Đừng đăng ký `waitForResponse` TRƯỚC bước có thể `skip`: test kết thúc giữa chừng để lại
	//    promise treo, Playwright báo "page.waitForResponse: Test ended" và case hiện là ĐỎ trong
	//    khi nó chỉ nên là SKIP. Chọn xong rồi mới chờ, kèm `catch`.
	const cho = page
		.waitForResponse((r) => r.url().includes(API_CHUYEN_KHO) && r.status() !== 401, {
			timeout: 60_000,
		})
		.catch(() => null);
	const ten = await chonDiemBanQuaDrawer(page, 'Lọc theo điểm bán');
	if (!ten) {
		await cho;
		boQua(test, 'Drawer chọn điểm bán không có mục nào ở cột Điểm bán trong phạm vi tỉnh.');
	}
	const res = await cho;
	expect(res, `Chọn "${ten}" mà màn không gọi lại API danh sách phiếu chuyển kho`).not.toBeNull();
	expect(res.status()).toBe(200);
	const nhan = [ten];

	const so = await dong(page).count();
	if (so === 0) {
		boQua(test, `Đơn vị "${nhan[0]}" chưa có phiếu chuyển kho nào — bộ lọc chạy nhưng không đối chiếu được.`);
	}

	// 🔴 Ghi rõ bộ lọc áp cho nơi CHUYỂN, nơi NHẬN hay cả hai — con số đếm phụ thuộc điều này.
	let chiChuyen = 0;
	let chiNhan = 0;
	for (let k = 0; k < so; k += 1) {
		const o = dong(page).nth(k).locator('td');
		const chuyen = chuan(await o.nth(2).innerText());
		const nhanDv = chuan(await o.nth(4).innerText());
		if (chuyen.includes(nhan[0])) chiChuyen += 1;
		if (nhanDv.includes(nhan[0])) chiNhan += 1;
		expect(
			chuyen.includes(nhan[0]) || nhanDv.includes(nhan[0]),
			`Dòng ${k + 1} không liên quan đơn vị đã lọc: chuyển "${chuyen}" · nhận "${nhanDv}"`,
		).toBe(true);
	}
	test.info().annotations.push({
		type: 'phạm vi bộ lọc',
		description: `${so} dòng — khớp nơi chuyển: ${chiChuyen}, khớp nơi nhận: ${chiNhan}`,
	});
});
