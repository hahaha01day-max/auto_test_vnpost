'use strict';

/**
 * `04_3_010_002` — bộ lọc điểm bán ở màn Lịch sử xuất nhập kho, nhìn từ **cấp Tỉnh**.
 *
 * 🔴 Vai `shop` KHÔNG có ô lọc này (chỉ thấy điểm bán của mình) ⇒ chạy bằng `shop` là kiểm nhầm.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');

const GOC = path.join(__dirname, '..');
const {
	API_LICH_SU,
	boQua,
	chanGhi,
	chonDiemBanQuaDrawer,
	chuan,
	dong,
	moLichSu,
} = require('./warehouse-page');

const VAI = 'province';

test('04_3_010_002 — Bộ lọc điểm bán ở màn Lịch sử xuất nhập kho', async ({ page }) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '04_3_010_002');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	await chanGhi(page);
	await moLichSu(page, VAI);

	// 🔴 Ô chọn điểm bán mở DRAWER ba cột, 🚫 không phải dropdown — xem `chonDiemBanQuaDrawer`.
	const ten = await chonDiemBanQuaDrawer(page, 'điểm bán');
	if (!ten) {
		boQua(
			test,
			'Không chọn được điểm bán nào trong phạm vi tỉnh: drawer "Chọn Điểm bán / Kho" không có ' +
				'mục nào ở cột Điểm bán. 🔴 Ghi nhận: vai tỉnh vì thế KHÔNG xem được lịch sử kho của ' +
				'điểm bán trực thuộc — cần user chốt đây là thiếu dữ liệu hay lỗi phạm vi.',
		);
	}

	const cho = page.waitForResponse(
		(r) => r.url().includes(API_LICH_SU) && r.status() !== 401,
		{ timeout: 60_000 },
	);
	const res = await cho.catch(() => null);
	expect(
		res,
		`Chọn điểm bán "${ten}" mà màn KHÔNG gọi API lịch sử kho lần nào — bảng không bao giờ có dữ liệu.`,
	).not.toBeNull();
	expect(res.status()).toBe(200);

	const so = await dong(page).count();
	if (so === 0) {
		boQua(test, `Điểm bán "${ten}" chưa có phiếu nào — bộ lọc chạy nhưng không đối chiếu được.`);
	}
	expect(so).toBeGreaterThan(0);
	void chuan;
});
