'use strict';

/**
 * 18_2 nhóm 040 — form "Thông tin xuất hoá đơn" trên màn bán hàng (vai `gdv`, điểm bán seed làn).
 *
 * Đo DOM 25/09/2026 (vnpost-web 8ac2c516): tích ô "Xuất hoá đơn điện tử" ⇒ liên kết "Thông tin xuất HĐ";
 * bấm mở DRAWER "Thông tin xuất hoá đơn" (radio "Cá nhân" / "Doanh nghiệp / Tổ chức"; chân: Huỷ ·
 * Xoá thông tin · Xác nhận). 🔴 Liên kết "Thông tin xuất HĐ" bị nhãn form-item ĐÈ (Playwright báo
 * "intercepts pointer events") ⇒ bấm bằng `force` và ghi nhận ở 040_001.
 *
 * Helper POS dùng lại của 18_1 (`18_1_ban_hang_tai_quay/tests/pos-18.js`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const GOC = path.join(__dirname, '..');
const { chuan } = p;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const cb = (page) => page.getByRole('checkbox', { name: 'Xuất hoá đơn điện tử' });
const lienKet = (page) => page.getByText('Thông tin xuất HĐ', { exact: true });
const drw = (page) => page.locator('.ant-drawer-open').filter({ hasText: 'Thông tin xuất hoá đơn' }).last();
const item = (dr, nhan) => dr.locator('.ant-form-item').filter({ has: dr.page().locator(`.ant-form-item-label label:text-is("${nhan}")`) }).first();
const oNhap = (dr, nhan) => item(dr, nhan).locator('input, textarea').last();
const loi = (dr, nhan) => item(dr, nhan).locator('.ant-form-item-explain-error');
const batBuoc = async (dr, nhan) => (await item(dr, nhan).locator('label.ant-form-item-required').count()) > 0;
const nhan = async (dr) => (await dr.locator('.ant-form-item-label label').allInnerTexts()).map(chuan).filter(Boolean);

async function moForm(page) {
	await page.mouse.move(600, 700);
	if (!(await cb(page).isChecked())) await cb(page).check();
	await expect(lienKet(page)).toBeVisible();
	for (let lan = 0; lan < 4 && !(await drw(page).isVisible()); lan += 1) {
		await page.waitForTimeout(600);
		await lienKet(page).dispatchEvent('click');
		await drw(page).waitFor({ state: 'visible', timeout: 4_000 }).catch(() => null);
	}
	await expect(drw(page)).toBeVisible({ timeout: 10_000 });
	return drw(page);
}

async function chonDoiTuong(dr, ten) {
	await dr.locator('.ant-radio-wrapper').filter({ hasText: ten }).click();
	await dr.page().waitForTimeout(400);
}

const xacNhan = (dr) => dr.getByRole('button', { name: 'Xác nhận' }).click();

test.describe('18_2 — Thông tin xuất hoá đơn điện tử', () => {
	test.describe.configure({ timeout: 180_000 });
	let st;

	test.beforeEach(async ({ page }) => {
		st = await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		if (await cb(page).isChecked().catch(() => false)) await cb(page).uncheck().catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_2_040_001 — Tích ô Xuất hoá đơn điện tử hiện liên kết Thông tin xuất HĐ', async ({ page }) => {
		chanNeuTat('18_2_040_001');
		await expect(lienKet(page)).toHaveCount(0);
		await cb(page).check();
		await expect(lienKet(page)).toBeVisible();
		// Người dùng bấm được liên kết không (không bị phần tử khác đè)?
		const bamDuoc = await lienKet(page).click({ trial: true, timeout: 3_000 }).then(() => true, () => false);
		test.info().annotations.push({ type: 'đo', description: `liên kết bấm thường được: ${bamDuoc}` });
		expect(bamDuoc, '🔴 Liên kết "Thông tin xuất HĐ" bị nhãn form-item đè — bấm chuột không tới').toBe(true);
	});

	test('18_2_040_002 — Màn Thông tin xuất hoá đơn mở đủ trường', async ({ page }) => {
		chanNeuTat('18_2_040_002');
		const dr = await moForm(page);
		expect(await nhan(dr)).toContain('Đối tượng mua hàng');
		for (const b of ['Huỷ', 'Xoá thông tin', 'Xác nhận']) await expect(dr.getByRole('button', { name: b })).toBeVisible();
	});

	test('18_2_040_003 — Chọn Cá nhân thì hiện đúng bộ trường', async ({ page }) => {
		chanNeuTat('18_2_040_003');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Cá nhân');
		const ds = await nhan(dr);
		for (const n of ['Họ và tên người mua', 'CMND/CCCD', 'Số điện thoại', 'Email nhận hoá đơn', 'Địa chỉ']) expect(ds, `Thiếu "${n}"`).toContain(n);
		for (const n of ['Tên đơn vị', 'Mã số thuế']) expect(ds).not.toContain(n);
		expect(await batBuoc(dr, 'Họ và tên người mua')).toBe(true);
		expect(await batBuoc(dr, 'Email nhận hoá đơn')).toBe(true);
		expect(await batBuoc(dr, 'Địa chỉ')).toBe(false);
		test.info().annotations.push({ type: 'đo', description: `CMND/CCCD bắt buộc: ${await batBuoc(dr, 'CMND/CCCD')}` });
		expect(await batBuoc(dr, 'CMND/CCCD'), 'CMND/CCCD đang là trường BẮT BUỘC — kịch bản không ghi bắt buộc').toBe(false);
	});

	test('18_2_040_004 — Chọn Doanh nghiệp / Tổ chức thì đổi bộ trường', async ({ page }) => {
		chanNeuTat('18_2_040_004');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Doanh nghiệp / Tổ chức');
		const ds = await nhan(dr);
		test.info().annotations.push({ type: 'nhãn', description: ds.join(' · ') });
		for (const n of ['Tên đơn vị', 'Mã số thuế', 'Người mua hàng', 'Địa chỉ đơn vị']) expect(ds, `Thiếu "${n}"`).toContain(n);
		expect(ds).not.toContain('CMND/CCCD');
		expect(await batBuoc(dr, 'Tên đơn vị')).toBe(true);
		expect(await batBuoc(dr, 'Mã số thuế')).toBe(true);
		expect(await batBuoc(dr, 'Địa chỉ đơn vị')).toBe(true);
		expect(await batBuoc(dr, 'Người mua hàng')).toBe(false);
	});

	test('18_2_040_005 — Đổi đối tượng giữa chừng làm mất ô đang nhập', async ({ page }) => {
		chanNeuTat('18_2_040_005');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Cá nhân');
		await oNhap(dr, 'CMND/CCCD').fill('012345678');
		await chonDoiTuong(dr, 'Doanh nghiệp / Tổ chức');
		await expect(item(dr, 'CMND/CCCD')).toHaveCount(0);
	});

	test('18_2_040_006 — Hệ thống điền sẵn thông tin khách đã gắn vào đơn', async ({ page }) => {
		chanNeuTat('18_2_040_006');
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Cá nhân');
		expect(await oNhap(dr, 'Họ và tên người mua').inputValue(), 'Tên khách không được điền sẵn').toBe(kh.customerName);
	});

	test('18_2_040_007 — Bỏ trống Tên đơn vị với khách doanh nghiệp bị chặn', async ({ page }) => {
		chanNeuTat('18_2_040_007');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Doanh nghiệp / Tổ chức');
		await xacNhan(dr);
		await expect(loi(dr, 'Tên đơn vị')).toBeVisible();
		await expect(dr).toBeVisible();
	});

	test('18_2_040_008 — Bỏ trống Mã số thuế với khách doanh nghiệp bị chặn', async ({ page }) => {
		chanNeuTat('18_2_040_008');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Doanh nghiệp / Tổ chức');
		await xacNhan(dr);
		await expect(loi(dr, 'Mã số thuế')).toBeVisible();
	});

	test('18_2_040_009 — Bỏ trống Địa chỉ đơn vị bị chặn', async ({ page }) => {
		chanNeuTat('18_2_040_009');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Doanh nghiệp / Tổ chức');
		await xacNhan(dr);
		await expect(loi(dr, 'Địa chỉ đơn vị')).toBeVisible();
	});

	test('18_2_040_010 — Bỏ trống Họ và tên người mua với khách cá nhân bị chặn', async ({ page }) => {
		chanNeuTat('18_2_040_010');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Cá nhân');
		await xacNhan(dr);
		await expect(loi(dr, 'Họ và tên người mua')).toBeVisible();
	});

	test('18_2_040_011 — Bỏ trống Email nhận hoá đơn bị chặn ở CẢ HAI đối tượng', async ({ page }) => {
		chanNeuTat('18_2_040_011');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Cá nhân');
		await xacNhan(dr);
		await expect(loi(dr, 'Email nhận hoá đơn')).toBeVisible();
		await chonDoiTuong(dr, 'Doanh nghiệp / Tổ chức');
		await xacNhan(dr);
		await expect(loi(dr, 'Email nhận hoá đơn')).toBeVisible();
	});

	/** Điền đủ ô bắt buộc Cá nhân (trừ `bo`). */
	async function dienCaNhan(dr, bo = []) {
		await chonDoiTuong(dr, 'Cá nhân');
		if (!bo.includes('ten')) await oNhap(dr, 'Họ và tên người mua').fill('Nguyễn Văn Auto');
		if (!bo.includes('cccd')) await oNhap(dr, 'CMND/CCCD').fill('012345678901');
		if (!bo.includes('email')) await oNhap(dr, 'Email nhận hoá đơn').fill('auto8@example.vn');
	}

	test('18_2_040_012 — Địa chỉ KHÔNG bắt buộc với khách cá nhân', async ({ page }) => {
		chanNeuTat('18_2_040_012');
		const dr = await moForm(page);
		await dienCaNhan(dr);
		await xacNhan(dr);
		await expect(dr, `Để trống Địa chỉ mà không xác nhận được: ${(await dr.locator('.ant-form-item-explain-error').allInnerTexts()).join(' | ')}`).toBeHidden({ timeout: 8_000 });
	});

	test('18_2_040_013 — Mã số thuế phải đủ 10 chữ số', async ({ page }) => {
		chanNeuTat('18_2_040_013');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Doanh nghiệp / Tổ chức');
		const kq = {};
		for (const v of ['010068620', '0100686209', '01006862099', 'abcdefghij']) {
			await oNhap(dr, 'Mã số thuế').fill(v);
			await oNhap(dr, 'Mã số thuế').blur();
			await page.waitForTimeout(400);
			kq[v] = (await loi(dr, 'Mã số thuế').count()) > 0;
		}
		test.info().annotations.push({ type: 'có lỗi', description: JSON.stringify(kq) });
		expect(kq).toEqual({ '010068620': true, '0100686209': false, '01006862099': true, abcdefghij: true });
	});

	test('18_2_040_014 — CMND/CCCD chỉ nhận 9 hoặc 12 chữ số', async ({ page }) => {
		chanNeuTat('18_2_040_014');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Cá nhân');
		const kq = {};
		for (const n of [8, 9, 10, 12, 13]) {
			const v = '0123456789012'.slice(0, n);
			await oNhap(dr, 'CMND/CCCD').fill(v);
			await oNhap(dr, 'CMND/CCCD').blur();
			await page.waitForTimeout(400);
			kq[n] = (await loi(dr, 'CMND/CCCD').count()) > 0;
		}
		test.info().annotations.push({ type: 'có lỗi', description: JSON.stringify(kq) });
		expect(kq).toEqual({ 8: true, 9: false, 10: true, 12: false, 13: true });
	});

	test('18_2_040_015 — Email sai định dạng bị chặn', async ({ page }) => {
		chanNeuTat('18_2_040_015');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Cá nhân');
		const kq = {};
		for (const v of ['abc', 'abc@', 'abc@def', 'a b@c.vn', 'abc@def.vn']) {
			await oNhap(dr, 'Email nhận hoá đơn').fill(v);
			await oNhap(dr, 'Email nhận hoá đơn').blur();
			await page.waitForTimeout(400);
			kq[v] = (await loi(dr, 'Email nhận hoá đơn').count()) > 0;
		}
		test.info().annotations.push({ type: 'có lỗi', description: JSON.stringify(kq) });
		expect(kq).toEqual({ abc: true, 'abc@': true, 'abc@def': true, 'a b@c.vn': true, 'abc@def.vn': false });
	});

	test('18_2_040_016 — Các ô bắt buộc toàn khoảng trắng bị coi là rỗng', async ({ page }) => {
		chanNeuTat('18_2_040_016');
		const dr = await moForm(page);
		await chonDoiTuong(dr, 'Doanh nghiệp / Tổ chức');
		for (const n of ['Tên đơn vị', 'Mã số thuế', 'Địa chỉ đơn vị', 'Email nhận hoá đơn']) await oNhap(dr, n).fill('     ');
		await xacNhan(dr);
		const kq = {};
		for (const n of ['Tên đơn vị', 'Mã số thuế', 'Địa chỉ đơn vị', 'Email nhận hoá đơn']) kq[n] = (await loi(dr, n).count()) > 0;
		test.info().annotations.push({ type: 'có lỗi', description: JSON.stringify(kq) });
		expect(Object.entries(kq).filter(([, v]) => !v).map(([k]) => k), 'Ô toàn khoảng trắng KHÔNG bị chặn (không trim)').toEqual([]);
	});

	test('18_2_040_017 — Nút Xoá thông tin làm trắng form', async ({ page }) => {
		chanNeuTat('18_2_040_017');
		const dr = await moForm(page);
		await dienCaNhan(dr);
		await dr.getByRole('button', { name: 'Xoá thông tin' }).click();
		await page.waitForTimeout(600);
		test.info().annotations.push({ type: 'sau Xoá thông tin', description: `drawer mở: ${await dr.isVisible()} · nhãn: ${(await nhan(dr)).join(' · ')}` });
		// "Xoá thông tin" có thể đóng drawer — mở lại để đọc trạng thái form.
		const dr2 = (await dr.isVisible()) ? dr : await moForm(page);
		await chonDoiTuong(dr2, 'Cá nhân');
		for (const n of ['Họ và tên người mua', 'CMND/CCCD', 'Email nhận hoá đơn']) expect(await oNhap(dr2, n).inputValue(), `"${n}" chưa bị xoá`).toBe('');
	});

	test('18_2_040_018 — Xác nhận ghi thông tin vào đơn', async ({ page }) => {
		chanNeuTat('18_2_040_018');
		const dr = await moForm(page);
		await dienCaNhan(dr);
		await xacNhan(dr);
		await expect(dr).toBeHidden({ timeout: 8_000 });
		await expect(cb(page)).toBeChecked();
		const dr2 = await moForm(page);
		expect(await oNhap(dr2, 'Họ và tên người mua').inputValue()).toBe('Nguyễn Văn Auto');
		expect(await oNhap(dr2, 'Email nhận hoá đơn').inputValue()).toBe('auto8@example.vn');
	});

	test('18_2_040_019 — Bấm Huỷ không ghi gì vào đơn', async ({ page }) => {
		chanNeuTat('18_2_040_019');
		const dr = await moForm(page);
		await dienCaNhan(dr);
		await dr.getByRole('button', { name: 'Huỷ' }).click();
		await expect(dr).toBeHidden();
		const dr2 = await moForm(page);
		expect(await oNhap(dr2, 'Họ và tên người mua').inputValue(), 'Huỷ mà thông tin vẫn được lưu').toBe('');
	});
});
