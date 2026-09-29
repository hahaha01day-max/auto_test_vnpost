'use strict';

/**
 * Phân hệ 17 — phạm vi cấp trên điểm bán (vai `province`).
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): `CashierCounterPage.jsx` / `FundPage.jsx` — cấp xã/tỉnh/TCT
 * phải chọn điểm bán qua `SelectShopMultiple` (ô "Chọn điểm bán" mở **drawer ba cột**, 🚫 không phải
 * dropdown); chưa chọn thì nút "Thêm quầy" / "Chuyển quỹ" `disabled`. `ModalTransferFund` lấy quỹ
 * theo `shopId` đã chọn (`SelectFund shopId={effectiveShopId}`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const q = require('./quay-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const { chuan, khung, dong } = q;
const { moDrawer, moiShop, chonShop, dong_ } = require('./chon-diem-ban');

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('17 — Quầy / quỹ: vai cấp tỉnh', () => {
	test.describe.configure({ timeout: 180_000 });

	test('17_010_002 — Cấp trên điểm bán phải chọn điểm bán trước mới thêm quầy được', async ({ page }) => {
		chanNeuTat('17_010_002');
		await q.moQuay(page, VAI, { canShop: false });
		const nut = khung(page).getByRole('button', { name: /Thêm quầy/ });
		await expect(nut).toBeDisabled();
		await chonShop(page, { xa: 0, i: 0 }, '/cashier-counter/get-all');
		await expect(nut).toBeEnabled();
	});

});
