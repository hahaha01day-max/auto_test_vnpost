'use strict';

/**
 * 07_1 — Validate form cấu hình (làm tròn tiền / số lượng / tiền tệ), vai `tct`. KHÔNG GHI.
 *
 * 🔴 Cấu hình ở đây áp cho CẢ CHUỖI (chainId dùng chung mọi làn test và người dùng dev) ⇒ mọi request
 *    ghi cấu hình bị chặn bằng route (`chanGhiBat`); "lưu được" = FE ĐÃ GỬI request (bị chặn ở mạng).
 * Đo 24/09/2026 (vnpost-web af8cda07): drawer "Cấu hình …", ô `#decimal` (InputNumber, làm tròn tiền
 * `-3..3`, làm tròn số lượng `0..3`), `#roundingMethod`, tiền tệ `#configValue`; nút "Lưu cấu hình".
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { NHOM, chuan, moFormSua, moNhom } = require('./settings-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

/** Chặn request ghi cấu hình, GIỮ LẠI body để biết FE định lưu gì. */
async function chanGhiBat(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET' || !/config|setting/i.test(req.url())) return route.continue();
		daGoi.push({ url: req.url(), body: req.postData() || '' });
		await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	return daGoi;
}

async function loiTrenForm(page, dr) {
	await page.waitForTimeout(1_500);
	return [...(await dr.locator('.ant-form-item-explain-error').allInnerTexts()), ...(await page.locator('.ant-message-notice').allInnerTexts())].map(chuan).join(' | ');
}

/** Gõ giá trị vào `#decimal`, rời ô, bấm lưu; trả { oSauBlur, loi, guiDi }. */
async function thuGiaTri(page, dr, daGoi, v) {
	const o = dr.locator('#decimal');
	await o.fill('');
	await o.pressSequentially(String(v));
	await o.blur();
	const oSauBlur = await o.inputValue();
	const truoc = daGoi.length;
	await dr.getByRole('button', { name: 'Lưu cấu hình' }).click({ force: true });
	const loi = await loiTrenForm(page, dr);
	return { oSauBlur, loi, guiDi: daGoi.slice(truoc).map((x) => x.body) };
}

test.describe('07_1 — Validate form cấu hình (chặn ghi)', () => {
	test('07_1_010_004 — Chặn lưu khi bỏ trống Đơn vị làm tròn', async ({ page }) => {
		chanNeuTat('07_1_010_004');
		const daGoi = await chanGhiBat(page);
		await moNhom(page, NHOM.lamTronTien, VAI);
		const dr = await moFormSua(page);
		await dr.locator('#decimal').fill('');
		await dr.getByRole('button', { name: 'Lưu cấu hình' }).click({ force: true });
		const loi = await loiTrenForm(page, dr);
		expect(loi).toContain('Vui lòng nhập số chữ số làm tròn');
		expect(daGoi, 'Bỏ trống mà vẫn gửi request lưu').toEqual([]);
	});

	test('07_1_010_005 — Đơn vị làm tròn chỉ nhận số nguyên từ -3 đến 3', async ({ page }) => {
		chanNeuTat('07_1_010_005');
		const daGoi = await chanGhiBat(page);
		await moNhom(page, NHOM.lamTronTien, VAI);
		const dr = await moFormSua(page);
		const kq = await thuGiaTri(page, dr, daGoi, 4);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
		// Chặn = ô không giữ 4 (kẹp / báo lỗi) VÀ không gửi giá trị 4 lên server.
		expect(kq.oSauBlur, 'Ô vẫn giữ giá trị 4 ngoài khoảng').not.toBe('4');
		expect(kq.guiDi.join(' '), 'Giá trị 4 vẫn được gửi đi lưu').not.toMatch(/"(decimal|configValue)"\s*:\s*"?4"?/);
	});

	test('07_1_010_007 — Đơn vị làm tròn tiền tại biên -3 và 3', async ({ page }) => {
		chanNeuTat('07_1_010_007');
		const daGoi = await chanGhiBat(page);
		await moNhom(page, NHOM.lamTronTien, VAI);
		const kq = {};
		for (const v of [-3, 3, -4, 4, 1.5]) {
			const dr = await moFormSua(page);
			kq[v] = await thuGiaTri(page, dr, daGoi, v);
			await page.keyboard.press('Escape');
			await page.waitForTimeout(800);
		}
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
		for (const v of [-3, 3]) expect(kq[v].guiDi.length, `Biên ${v} hợp lệ mà không lưu được: ${kq[v].loi}`).toBeGreaterThan(0);
		for (const v of [-4, 4]) expect(kq[v].oSauBlur, `Ngoài biên ${v} mà ô vẫn giữ nguyên`).not.toBe(String(v));
		expect(['1', '2', ''].includes(kq[1.5].oSauBlur) || kq[1.5].guiDi.length === 0, `1.5: ô "${kq[1.5].oSauBlur}", lỗi "${kq[1.5].loi}"`).toBe(true);
	});

	test('07_1_020_002 — Chặn lưu khi bỏ trống Đơn vị làm tròn số lượng', async ({ page }) => {
		chanNeuTat('07_1_020_002');
		const daGoi = await chanGhiBat(page);
		await moNhom(page, NHOM.lamTronSoLuong, VAI);
		const dr = await moFormSua(page);
		await dr.locator('#decimal').fill('');
		await dr.getByRole('button', { name: 'Lưu cấu hình' }).click({ force: true });
		expect(await loiTrenForm(page, dr)).toContain('Vui lòng nhập đơn vị làm tròn');
		expect(daGoi, 'Bỏ trống mà vẫn gửi request lưu').toEqual([]);
	});

	test('07_1_020_003 — Đơn vị làm tròn số lượng mặc định là 2 và chỉ nhận 0 đến 3', async ({ page }) => {
		chanNeuTat('07_1_020_003');
		const daGoi = await chanGhiBat(page);
		await moNhom(page, NHOM.lamTronSoLuong, VAI);
		const dr = await moFormSua(page);
		// 🔴 Đây là GIÁ TRỊ ĐANG LƯU của chuỗi — ai đó đổi thì case đỏ, 🚫 không nới.
		await expect(dr.locator('#decimal'), 'Giá trị đang áp dụng khác mặc định 2').toHaveValue('2');
		const kq = await thuGiaTri(page, dr, daGoi, 5);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
		expect(kq.oSauBlur, 'Ô vẫn giữ 5 ngoài khoảng 0..3').not.toBe('5');
		expect(kq.guiDi.join(' '), 'Giá trị 5 vẫn được gửi đi lưu').not.toMatch(/"(decimal|configValue)"\s*:\s*"?5"?/);
	});

	test('07_1_030_004 — Chặn lưu khi chưa chọn loại tiền tệ', async ({ page }) => {
		chanNeuTat('07_1_030_004');
		const daGoi = await chanGhiBat(page);
		await moNhom(page, NHOM.tienTe, VAI);
		const dr = await moFormSua(page);
		const o = dr.locator('.ant-select').first();
		await o.hover();
		const xoa = o.locator('.ant-select-clear');
		test.skip((await xoa.count()) === 0, 'Ô Chọn loại tiền tệ KHÔNG có nút xoá (allowClear) ⇒ không tái hiện được "chưa chọn". Cần user chốt: bỏ rule bắt buộc hay mở allowClear.');
		await xoa.click({ force: true });
		await dr.getByRole('button', { name: 'Lưu cấu hình' }).click({ force: true });
		expect(await loiTrenForm(page, dr)).toContain('Vui lòng chọn tiền tệ');
		expect(daGoi, 'Chưa chọn tiền tệ mà vẫn gửi request lưu').toEqual([]);
	});

	test('07_1_060_001 — Nhóm "Làm tròn tiền phần kho" — nhóm cấu hình CHƯA có case nào', async ({ page }) => {
		chanNeuTat('07_1_060_001');
		await chanGhiBat(page);
		const docForm = async (key) => {
			await moNhom(page, key, VAI);
			const dr = await moFormSua(page);
			const nhan = (await dr.locator('.ant-form-item-label').allInnerTexts()).map(chuan);
			const o = dr.locator('#decimal');
			const r = { nhan, min: await o.getAttribute('aria-valuemin'), max: await o.getAttribute('aria-valuemax'), xemTruoc: chuan(await dr.innerText()).match(/Xem trước kết quả (.+?) Lưu/)?.[1] };
			await page.keyboard.press('Escape');
			return r;
		};
		const kho = await docForm(NHOM.lamTronTienKho);
		const tien = await docForm(NHOM.lamTronTien);
		test.info().annotations.push({ type: 'đo', description: `phần kho: ${JSON.stringify(kho)} · tiền: ${JSON.stringify(tien)}` });
		// Đo được: cùng bộ ô và cùng khoảng -3..3 với "Làm tròn tiền"; khác ở giá trị đang lưu. Việc nó
		// áp cho con số NÀO (giá vốn? thành tiền phiếu kho?) không đọc được từ form — xem 07_1_060_002.
		expect(kho.nhan, 'Nhóm phần kho khác bộ ô của nhóm Làm tròn tiền').toEqual(tien.nhan);
		expect([kho.min, kho.max], 'Khoảng Đơn vị làm tròn phần kho khác -3..3').toEqual(['-3', '3']);
	});
});
