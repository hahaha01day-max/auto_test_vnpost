'use strict';

/**
 * 18_2 nhóm 010 — khách hàng trên màn bán hàng (vai `gdv`, điểm bán seed làn).
 *
 * Đo DOM 25/09/2026 (vnpost-web 8ac2c516): ô chọn khách placeholder "Tìm kiếm khách hàng theo tên hoặc
 * sđt" (API `GET /chain-customer/seach-all-in-chain?keyword=`), nút "plus" mở drawer "Thêm khách hàng"
 * (bắt buộc Tên · Mã · SĐT), dòng gợi ý có tên + SĐT + bút chì; khối khách sau khi gắn: tên + "Tiền phát
 * sinh" + "Tiền còn nợ" (+ "Điểm hiện tại" khi có điểm).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, oKhach } = p;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const dd = (page) => page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
const goiY = (page) => dd(page).locator('.ant-select-item-option');

async function goKhach(page, tu) {
	const cho = page.waitForResponse((r) => r.url().includes('/chain-customer/seach-all-in-chain') && r.url().includes('keyword='), { timeout: 20_000 }).catch(() => null);
	await oKhach(page).click();
	await page.keyboard.type(tu);
	const res = await cho;
	await page.waitForTimeout(1_000);
	return res;
}

/** Khối khách ở cột phải (phần trước "Ghi chú đơn hàng"). */
async function khoiKhach(page) {
	await page.keyboard.press('Escape');
	await page.mouse.move(600, 700);
	const cot = chuan(await page.getByText('Ghi chú đơn hàng', { exact: true }).locator('xpath=ancestor::*[.//*[@aria-label="plus"]][1]').innerText());
	return cot.split('Ghi chú đơn hàng')[0];
}

test.describe('18_2 — Khách hàng trên đơn', () => {
	test.describe.configure({ timeout: 180_000 });
	let st;

	test.beforeEach(async ({ page }) => {
		st = await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_2_010_004 — Ô tìm khách hàng có placeholder đúng', async ({ page }) => {
		chanNeuTat('18_2_010_004');
		await expect(oKhach(page)).toContainText('Tìm kiếm khách hàng theo tên hoặc sđt');
		await page.mouse.move(600, 700);
		await page.locator('body').click({ position: { x: 600, y: 650 } });
		await page.keyboard.press('F11');
		expect(chuan(await page.evaluate(() => document.activeElement?.closest('.ant-select')?.innerText || ''))).toContain('Tìm kiếm khách hàng');
	});

	test('18_2_010_005 — Gợi ý khách hàng hiện kèm số điện thoại để phân biệt trùng tên', async ({ page }) => {
		chanNeuTat('18_2_010_005');
		const ten = `A${process.env.VNPOST_LANE || 0}KH Trung ${Date.now().toString(36).slice(-4)}`;
		const a = await p.taoKhach(page, st, ten);
		const b = await p.taoKhach(page, st, ten);
		await goKhach(page, ten);
		const ds = (await goiY(page).allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'gợi ý', description: ds.join(' / ') });
		expect(ds.length).toBeGreaterThanOrEqual(2);
		for (const kh of [a, b]) expect(ds.some((t) => t.includes(String(kh.customerPhone))), `Gợi ý không có SĐT ${kh.customerPhone}`).toBe(true);
	});

	test('18_2_010_006 — Thêm khách mới ngay trên đơn bằng dấu cộng vàng', async ({ page }) => {
		chanNeuTat('18_2_010_006');
		await page.getByRole('button', { name: 'plus', exact: true }).first().click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm khách hàng' }).last();
		const ma = `A${process.env.VNPOST_LANE || 0}KH${Date.now().toString(36).slice(-5).toUpperCase()}`;
		await dr.getByLabel('Tên khách hàng').fill(`${ma} Khach test`);
		await dr.getByLabel('Mã khách hàng').fill(ma);
		await dr.locator('#customerPhone').fill(`09${String(Date.now()).slice(-8)}`);
		const cho = page.waitForResponse((r) => r.url().includes('/chain-customer/create'));
		await dr.getByRole('button', { name: 'Lưu' }).click();
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		await expect(oKhach(page)).toContainText(`${ma} Khach test`);
		await expect(page).toHaveURL(/\/order\/create-order/);
	});

	test('18_2_010_007 — Sửa số điện thoại hoặc địa chỉ khách từ gợi ý', async ({ page }) => {
		chanNeuTat('18_2_010_007');
		const kh = await p.taoKhach(page, st);
		await goKhach(page, kh.customerCode);
		const muc = goiY(page).filter({ hasText: kh.customerName }).first();
		await expect(muc).toBeVisible();
		await muc.locator('[aria-label="edit"], .anticon-edit').first().click();
		const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await expect(dr).toBeVisible({ timeout: 10_000 });
		const moi = `09${String(Date.now()).slice(-8)}`;
		await dr.locator('#customerPhone').fill(moi);
		const cho = page.waitForResponse((r) => /chain-customer\/(update|edit)/.test(r.url()) && r.request().method() !== 'GET', { timeout: 20_000 });
		await dr.getByRole('button', { name: /Lưu|Cập nhật/ }).last().click();
		const b = await (await cho).json();
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		await p.chonKhach(page, kh.customerName);
		await expect(oKhach(page)).toContainText(kh.customerName);
	});

	test('18_2_010_008 — Khối khách hàng hiện đủ ba số sau khi gắn khách', async ({ page }) => {
		chanNeuTat('18_2_010_008');
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
		const k = await khoiKhach(page);
		test.info().annotations.push({ type: 'khối khách', description: k });
		expect(k).toContain('Tiền phát sinh');
		expect(k).toContain('Tiền còn nợ');
		await expect(p.tabs(page).first()).toHaveText(`Đơn hàng: ${kh.customerName}`);
	});

	test('18_2_010_015 — Tìm khách bằng chuỗi toàn khoảng trắng', async ({ page }) => {
		chanNeuTat('18_2_010_015');
		const res = await goKhach(page, '     ');
		if (res) expect(res.status()).toBeLessThan(500);
		await expect(page.locator('.ant-message-error')).toHaveCount(0);
	});

	test('18_2_010_016 — Tìm khách bằng số điện thoại một phần', async ({ page }) => {
		chanNeuTat('18_2_010_016');
		const kh = await p.taoKhach(page, st);
		const phan = String(kh.customerPhone).slice(-6, -2);
		await goKhach(page, phan);
		const ds = (await goiY(page).allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'hành vi thật', description: `"${phan}" → ${ds.length} gợi ý` });
		expect(ds.some((t) => t.includes(kh.customerName)), `Gõ một phần SĐT "${phan}" không ra khách (chỉ khớp từ đầu?)`).toBe(true);
	});

	test('18_2_010_017 — Tìm khách không dấu', async ({ page }) => {
		chanNeuTat('18_2_010_017');
		const kh = await p.taoKhach(page, st, `A${process.env.VNPOST_LANE || 0}KH Nguyễn Thị Hồng ${Date.now().toString(36).slice(-4)}`);
		const khong = kh.customerName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
		await goKhach(page, khong);
		const ds = (await goiY(page).allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'hành vi thật', description: `"${khong}" → ${ds.length} gợi ý` });
		expect(ds.some((t) => t.includes(kh.customerName.normalize('NFC'))), 'Gõ không dấu không ra khách tên có dấu').toBe(true);
	});

	test('18_2_010_018 — Bỏ khách đã gắn khỏi đơn', async ({ page }) => {
		chanNeuTat('18_2_010_018');
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
		await page.keyboard.press('Escape');
		await oKhach(page).hover();
		await oKhach(page).locator('.ant-select-clear').click();
		await expect(oKhach(page)).toContainText('Tìm kiếm khách hàng');
		await expect(p.tabs(page).first()).toHaveText('Đơn hàng: 1');
	});
});
