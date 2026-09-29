'use strict';

/**
 * Nhóm `070` — drawer **tạo đơn vận chuyển** mở từ một phiếu chuyển kho (vai `shop`).
 *
 * 🔴 Nhóm này đến từ sheet QC `quan_ly_kho` (`FUNC_1_*`), mô tả drawer tạo đơn vận chuyển **từ
 * phiếu chuyển kho** — 🚫 không phải từ màn Đơn vị vận tải. Muốn chạy phải có một phiếu chuyển kho
 * đang ở trạng thái cho phép tạo đơn vận chuyển.
 *
 * 🔴 Sáu case `003` `007` `008`–`011` **tạo đơn vận chuyển thật** hoặc **ghi nợ thật** cho đơn vị
 * vận chuyển ⇒ đã đánh `mutates: true, allowMutation: false` (trước đây phân loại nhầm là đọc).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const ROUTE_CHUYEN_KHO = '/inventory/transfer-warehouse';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/stock|delivery|shipping|transfer/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

const THIEU_PHIEU =
	'Điểm bán không có phiếu chuyển kho nào ở trạng thái cho phép tạo đơn vận chuyển. ' +
	'🚫 Không tự lập phiếu chuyển kho để có dữ liệu — đó là chuyển hàng thật giữa hai đơn vị.';

/** Mở phiếu chuyển kho đầu tiên rồi tìm drawer tạo đơn vận chuyển. */
async function moDrawerVanChuyen(page) {
	await moTrang(page, ROUTE_CHUYEN_KHO, VAI);
	await page.waitForTimeout(7_000);
	if ((await dong(page).count()) === 0) test.skip(true, THIEU_PHIEU);

	// 🔴 Nút mở chi tiết ở màn chuyển kho là **nút ICON không có nhãn chữ** ⇒ bám tên "Chi tiết"
	//    là click timeout 15s. Thử lần lượt các nút trong ô Hành động cho tới khi có gì đó mở ra.
	const nutHang = dong(page).first().locator('td').last().getByRole('button');
	const soNut = await nutHang.count();
	if (soNut === 0) test.skip(true, `${THIEU_PHIEU} (Dòng đầu không có nút thao tác nào.)`);

	let box = null;
	for (let i = 0; i < soNut; i += 1) {
		await nutHang.nth(i).click({ force: true }).catch(() => {});
		await page.waitForTimeout(3_000);
		const mo = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		if (await mo.count()) {
			box = mo;
			break;
		}
		if (!page.url().includes('/transfer-warehouse')) {
			box = khung(page);
			break;
		}
	}
	if (!box) test.skip(true, `${THIEU_PHIEU} (Bấm hết ${soNut} nút thao tác mà không mở được gì.)`);
	const nut = box.getByRole('button', { name: /vận chuyển|vận đơn|giao hàng/i }).first();
	if ((await nut.count()) === 0) {
		test.skip(
			true,
			`${THIEU_PHIEU} (Phiếu đầu tiên không có nút tạo đơn vận chuyển — trạng thái hiện tại: ` +
				`"${chuan(await dong(page).first().innerText()).slice(0, 80)}".)`,
		);
	}
	await nut.click({ force: true });
	await page.waitForTimeout(3_000);
	const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	await dr.waitFor({ state: 'visible', timeout: 20_000 });
	return dr;
}

test.describe('12-don-vi-van-tai · 070 — Đơn vận chuyển từ phiếu chuyển kho', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
	});

	test('12-don-vi-van-tai_070_001 — Kiểm tra hiển thị drawer', async ({ page }) => {
		chanNeuTat('12-don-vi-van-tai_070_001');

		const dr = await moDrawerVanChuyen(page);
		const noi = chuan(await dr.innerText()).toLowerCase();
		const thieu = [];
		for (const o of ['mã vận đơn', 'đơn vị vận chuyển', 'nhân viên', 'số tiền']) {
			if (!noi.includes(o)) thieu.push(o);
		}
		expect(thieu, `Drawer thiếu: ${thieu.join(', ')}. Nội dung: ${noi.slice(0, 250)}`).toEqual([]);
		expect(
			await dr.getByRole('button', { name: /Lưu|Huỷ|Hủy/ }).count(),
			'Drawer không có nút Lưu/Huỷ',
		).toBeGreaterThan(0);
	});

	test('12-don-vi-van-tai_070_002 — Kiểm tra bỏ trống các trường bắt buộc', async ({ page }) => {
		chanNeuTat('12-don-vi-van-tai_070_002');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerVanChuyen(page);
		await dr.getByRole('button', { name: /Lưu|Xác nhận/ }).last().click({ force: true });
		await page.waitForTimeout(2_500);

		const loi = [
			...(await dr.locator('.ant-form-item-explain-error').allInnerTexts()),
			...(await page.locator('.ant-message').allInnerTexts()),
		].map(chuan);
		expect(daGoi, '🔴 Form trống mà vẫn gửi request tạo đơn vận chuyển').toEqual([]);
		expect(loi.join(' | '), 'Lưu form trống mà không có thông báo nào').not.toBe('');
	});

	test('12-don-vi-van-tai_070_004 — Kiểm tra chọn đơn vị vận chuyển', async ({ page }) => {
		chanNeuTat('12-don-vi-van-tai_070_004');

		const dr = await moDrawerVanChuyen(page);
		const o = dr.locator('.ant-select').filter({ hasText: /đơn vị/i }).first();
		if ((await o.count()) === 0) test.skip(true, 'Drawer không có ô chọn đơn vị vận chuyển.');
		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		await page.keyboard.press('Escape');

		expect(nhan.length, 'Danh sách đơn vị vận chuyển rỗng').toBeGreaterThan(0);
	});

	test('12-don-vi-van-tai_070_005 — Kiểm tra chọn nhân viên', async ({ page }) => {
		chanNeuTat('12-don-vi-van-tai_070_005');

		const dr = await moDrawerVanChuyen(page);
		const oDonVi = dr.locator('.ant-select').filter({ hasText: /đơn vị/i }).first();
		const oNhanVien = dr.locator('.ant-select').filter({ hasText: /nhân viên/i }).first();
		if ((await oDonVi.count()) === 0 || (await oNhanVien.count()) === 0) {
			test.skip(true, 'Drawer không đủ hai ô đơn vị / nhân viên vận chuyển.');
		}

		// 🔴 Danh sách nhân viên phụ thuộc đơn vị vận chuyển đã chọn ⇒ phải chọn đơn vị TRƯỚC.
		await oDonVi.click();
		const dd1 = page.locator('.ant-select-dropdown').last();
		await dd1.waitFor({ state: 'visible', timeout: 15_000 });
		const dv = dd1.locator('.ant-select-item-option-content');
		if ((await dv.count()) === 0) {
			await page.keyboard.press('Escape');
			test.skip(true, 'Không có đơn vị vận chuyển nào để chọn.');
		}
		await dv.first().click();
		await page.waitForTimeout(2_000);

		await oNhanVien.click();
		const dd2 = page.locator('.ant-select-dropdown').last();
		await dd2.waitFor({ state: 'visible', timeout: 15_000 });
		const nv = (await dd2.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		await page.keyboard.press('Escape');

		expect(nv.length, 'Chọn đơn vị rồi mà danh sách nhân viên vẫn rỗng').toBeGreaterThan(0);
	});

	test('12-don-vi-van-tai_070_006 — Kiểm tra nhập số tiền âm', async ({ page }) => {
		chanNeuTat('12-don-vi-van-tai_070_006');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerVanChuyen(page);
		const oTien = dr
			.locator('.ant-form-item')
			.filter({ hasText: /số tiền/i })
			.locator('input')
			.first();
		if ((await oTien.count()) === 0) test.skip(true, 'Drawer không có ô Số tiền.');

		await oTien.fill('-100000');
		await page.waitForTimeout(1_000);
		const gt = chuan(await oTien.inputValue());

		// Kỳ vọng của kịch bản: số tiền về **0**, 🚫 không nhận số âm.
		expect(
			gt.replace(/[^\d-]/g, ''),
			`Ô Số tiền nhận giá trị "${gt}" khi gõ số âm — kỳ vọng là 0.`,
		).not.toContain('-');
		expect(daGoi, 'Chỉ gõ thử mà đã gửi request ghi').toEqual([]);
	});
});
