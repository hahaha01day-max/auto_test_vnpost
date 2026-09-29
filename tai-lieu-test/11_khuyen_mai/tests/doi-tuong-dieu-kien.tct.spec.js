'use strict';

/**
 * 11 · 070_002–006 / 080_002–005 — màn Nhóm đối tượng (`/promotion/customer-group`) và Điều kiện (`/promotion/condition`),
 * CHỈ ĐỌC (chặn mọi request ghi bằng `promotion-page.chanGhi`), vai `tct`. Khuôn đo: `km-ghi.tct.spec.js` (26/09/2026).
 * - Nhóm: nút "Thêm nhóm đối tượng" ⇒ drawer "Thêm nhóm đối tượng khách hàng áp dụng" (`#groupName`, `#description`, loại nhóm);
 *   dòng có nút sửa (`.anticon-edit`) ⇒ drawer có `#groupName`.
 * - Điều kiện: nút "Thêm điều kiện" ⇒ popup "Thêm mới điều kiện đơn hàng" (`#conditionName`, "Tính theo giá trị tối thiểu của tổng
 *   đơn hàng", "Không yêu cầu" …); sửa ⇒ "Cập nhật điều kiện đơn hàng".
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const pm = require('./promotion-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const MAN = {
	nh: { route: '/promotion/customer-group', them: 'Thêm nhóm đối tượng', hop: 'Thêm nhóm đối tượng khách hàng áp dụng' },
	dk: { route: '/promotion/condition', them: 'Thêm điều kiện', hop: 'Thêm mới điều kiện đơn hàng' },
};

async function moBang(page, loai) {
	const daGoi = (await pm.chanGhi(page)).daGoi;
	await moTrang(page, `${process.env.VNPOST_BASE_URL}${MAN[loai].route}`, 'tct');
	await expect(pm.khung(page).getByRole('button', { name: MAN[loai].them })).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(2_000);
	return daGoi;
}
const dongBang = (page) => pm.khung(page).locator('.ant-table-tbody tr.ant-table-row');
async function moThem(page, loai) {
	await pm.khung(page).getByRole('button', { name: MAN[loai].them }).click();
	const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ hasText: MAN[loai].hop }).last();
	await expect(hop).toBeVisible({ timeout: 20_000 });
	await page.waitForTimeout(800);
	return hop;
}

test.describe('11 — Nhóm đối tượng & Điều kiện (chỉ đọc)', () => {
	test('11_070_002 — Mo danh sach doi tuong', async ({ page }) => {
		chanNeuTat('11_070_002');
		await moBang(page, 'nh');
		const cot = (await pm.cot(page).allInnerTexts()).map(pm.chuan).filter(Boolean);
		const n = await dongBang(page).count();
		ghiDo(`cột: ${cot.join(' · ')} · ${n} dòng`);
		expect(n, 'Danh sách nhóm đối tượng rỗng').toBeGreaterThan(0);
		expect(cot, 'Bảng thiếu cột Tên').toContain('Tên');
	});

	test('11_070_003 — Mo form them nhom doi tuong', async ({ page }) => {
		chanNeuTat('11_070_003');
		await moBang(page, 'nh');
		const hop = await moThem(page, 'nh');
		await expect(hop.locator('#groupName')).toBeVisible();
		await expect(hop.getByRole('button', { name: 'Xác nhận' })).toBeVisible();
	});

	test('11_070_004 — Validate them nhom doi tuong rong', async ({ page }) => {
		chanNeuTat('11_070_004');
		const daGoi = await moBang(page, 'nh');
		const hop = await moThem(page, 'nh');
		await hop.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);
		const loi = pm.chuan((await hop.locator('.ant-form-item-explain-error').allInnerTexts()).join(' | '));
		const tb = pm.chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
		ghiDo(`lỗi ô: "${loi}" · thông báo "${tb}" · request ghi ${daGoi.length}`);
		expect(`${loi} ${tb}`.trim(), 'Bấm Xác nhận form rỗng không báo gì').not.toBe('');
		expect(daGoi, 'Form rỗng mà vẫn gửi request').toEqual([]);
	});

	test('11_070_005 — Kiem tra cac loai nhom doi tuong', async ({ page }) => {
		chanNeuTat('11_070_005');
		await moBang(page, 'nh');
		const hop = await moThem(page, 'nh');
		const chu = pm.chuan(await hop.innerText());
		ghiDo(chu.slice(0, 400));
		const c = chu.normalize('NFC').toLowerCase();
		expect(c, 'Thiếu loại "Nhóm khách hàng"').toContain('nhóm khách hàng');
		expect(c, 'Thiếu loại "Khách tuỳ chỉnh"').toMatch(/khách (hàng )?(tùy|tuỳ) chỉnh/);
		expect(c, 'Thiếu loại "Khách mới"').toContain('khách mới');
	});

	test('11_070_006 — Mo form sua nhom doi tuong', async ({ page }) => {
		chanNeuTat('11_070_006');
		await moBang(page, 'nh');
		const d = dongBang(page).first();
		const ten = pm.chuan(await d.locator('td').nth(1).innerText());
		await d.locator('button:has(.anticon-edit)').first().click();
		const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ has: page.locator('#groupName') }).last();
		await expect(dr.locator('#groupName')).toBeVisible({ timeout: 15_000 });
		// Dữ liệu sửa nạp bất đồng bộ ⇒ chờ tối đa 10s.
		await expect.poll(() => dr.locator('#groupName').inputValue(), { timeout: 10_000 }).not.toBe('').catch(() => null);
		const v = await dr.locator('#groupName').inputValue();
		const tieuDe = pm.chuan(await dr.locator('.ant-drawer-title, .ant-modal-title').first().innerText().catch(() => ''));
		ghiDo(`dòng đầu "${ten}" · tiêu đề "${tieuDe}" · #groupName="${v}"`);
		expect(v, 'Form sửa không nạp tên nhóm').not.toBe('');
		expect(tieuDe).toMatch(/Cập nhật|Sửa|Chỉnh sửa/i);
	});

	test('11_080_002 — Mo form them dieu kien', async ({ page }) => {
		chanNeuTat('11_080_002');
		await moBang(page, 'dk');
		const hop = await moThem(page, 'dk');
		await expect(hop.locator('#conditionName')).toBeVisible();
	});

	test('11_080_003 — Validate them dieu kien rong', async ({ page }) => {
		chanNeuTat('11_080_003');
		const daGoi = await moBang(page, 'dk');
		const hop = await moThem(page, 'dk');
		await hop.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);
		const loi = pm.chuan((await hop.locator('.ant-form-item-explain-error').allInnerTexts()).join(' | '));
		const tb = pm.chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
		ghiDo(`lỗi ô: "${loi}" · thông báo "${tb}" · request ghi ${daGoi.length}`);
		expect(`${loi} ${tb}`.trim(), 'Bấm Xác nhận form rỗng không báo gì').not.toBe('');
		expect(daGoi).toEqual([]);
	});

	test('11_080_004 — Kiem tra cac loai dieu kien', async ({ page }) => {
		chanNeuTat('11_080_004');
		await moBang(page, 'dk');
		const hop = await moThem(page, 'dk');
		const chu = pm.chuan(await hop.innerText());
		ghiDo(chu.slice(0, 400));
		expect(chu, 'Thiếu điều kiện tổng đơn').toContain('Tính theo giá trị tối thiểu của tổng đơn hàng');
		expect(chu, 'Thiếu điều kiện sản phẩm ràng buộc').toMatch(/sản phẩm/i);
	});

	test('11_080_005 — Mo form sua dieu kien', async ({ page }) => {
		chanNeuTat('11_080_005');
		await moBang(page, 'dk');
		await dongBang(page).first().locator('button:has(.anticon-edit)').first().click();
		const m = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').filter({ hasText: 'Cập nhật điều kiện đơn hàng' }).last();
		await expect(m.locator('#conditionName')).toBeVisible({ timeout: 15_000 });
		expect(await m.locator('#conditionName').inputValue(), 'Popup sửa không nạp tên điều kiện').not.toBe('');
	});
});
