'use strict';

/**
 * 18_2 — điểm thưởng trên màn bán hàng (vai `gdv`).
 *
 * Đo 25/09/2026: gắn khách có điểm ⇒ khối khách hiện "Điểm hiện tại <n>" (+ "Nhóm khách hàng (n)"),
 * hover số điểm ⇒ tooltip. Khách mẫu có điểm của chuỗi: "Anh Trần" SĐT 84923333477
 * (`LOYALTY.CHAIN_CUSTOMER_LOYALTY.point` = 81 lúc đo). Modal thanh toán KHÔNG có tuỳ chọn đổi điểm
 * (chuỗi chưa có chương trình đổi điểm hiệu lực cho điểm bán seed).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, sp } = p;
const SDT_CO_DIEM = '84923333477';

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Gắn khách có điểm; trả { khoi, diemApi } — điểm lấy từ response loyalty FE gọi. */
async function ganKhachCoDiem(page) {
	const diem = [];
	page.on('response', async (r) => {
		if (!/loyalty|point/i.test(r.url()) || r.request().method() !== 'GET') return;
		const t = await r.text().catch(() => '');
		const m = t.match(/"(?:point|currentPoint|points)"\s*:\s*(-?\d+)/);
		if (m) diem.push(Number(m[1]));
	});
	await p.oKhach(page).click();
	await page.keyboard.type(SDT_CO_DIEM);
	const muc = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first();
	await expect(muc, `Không tìm được khách có điểm (SĐT ${SDT_CO_DIEM})`).toBeVisible({ timeout: 20_000 });
	await muc.click();
	await page.waitForTimeout(2_500);
	await page.keyboard.press('Escape');
	await page.mouse.move(600, 700);
	const cot = chuan(await page.getByText('Ghi chú đơn hàng', { exact: true }).locator('xpath=ancestor::*[.//*[@aria-label="plus"]][1]').innerText());
	return { khoi: cot.split('Ghi chú đơn hàng')[0], diemApi: diem };
}

test.describe('18_2 — Điểm thưởng', () => {
	test.describe.configure({ timeout: 180_000 });

	test.beforeEach(async ({ page }) => {
		await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});


	test('18_2_010_003 — Khối khách hàng hiện điểm hiện tại', async ({ page }) => {
		chanNeuTat('18_2_010_003');
		const { khoi, diemApi } = await ganKhachCoDiem(page);
		test.info().annotations.push({ type: 'đo', description: `${khoi} · điểm API ${diemApi.join(',')}` });
		for (const n of ['Điểm hiện tại', 'Tiền phát sinh', 'Tiền còn nợ']) expect(khoi).toContain(n);
		const so = Number((khoi.match(/Điểm hiện tại\s*(-?[\d.]+)/) || [])[1]?.replace(/\./g, ''));
		expect(Number.isFinite(so)).toBe(true);
		if (diemApi.length) expect(diemApi, 'Số điểm trên màn khác điểm API trả').toContain(so);
	});

	test('18_2_050_002 — POS hiển thị thông tin điểm sau khi chọn khách', async ({ page }) => {
		chanNeuTat('18_2_050_002');
		const { khoi } = await ganKhachCoDiem(page);
		expect(khoi).toMatch(/Điểm hiện tại\s*-?\d+/);
	});

	test('18_2_010_009 — Tooltip điểm hiện tại xem được chi tiết tích luỹ', async ({ page }) => {
		chanNeuTat('18_2_010_009');
		await ganKhachCoDiem(page);
		await page.getByText('Điểm hiện tại').locator('xpath=following::*[1]').hover();
		const tip = page.locator('.ant-tooltip:visible, .ant-popover:visible').last();
		await expect(tip).toBeVisible({ timeout: 8_000 });
		const t = chuan(await tip.innerText());
		test.info().annotations.push({ type: 'tooltip', description: t });
		expect(t, 'Tooltip không có chi tiết tích luỹ (chỉ tiêu đề)').toMatch(/\d/);
	});

	test('18_2_050_006 — Không chọn khách hàng thì KHÔNG hiện tuỳ chọn đổi điểm', async ({ page }) => {
		chanNeuTat('18_2_050_006');
		await p.them(page, sp().tc);
		await page.mouse.move(600, 700);
		await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
		const m = page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last();
		await expect(m).toBeVisible({ timeout: 20_000 });
		expect(chuan(await m.innerText())).not.toMatch(/đổi điểm|dùng điểm|điểm thưởng/i);
	});

	test('18_2_050_007 — Không có chương trình đổi điểm nào đang hiệu lực', async ({ page }) => {
		chanNeuTat('18_2_050_007');
		await p.them(page, sp().tc);
		await ganKhachCoDiem(page);
		await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
		const m = page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last();
		await expect(m).toBeVisible({ timeout: 20_000 });
		const t = chuan(await m.innerText());
		test.info().annotations.push({ type: 'modal thanh toán', description: t.slice(0, 400) });
		expect(t, 'Không có dòng nào nêu rõ "không có chương trình đổi điểm"').toMatch(/không có chương trình đổi điểm|chưa có chương trình/i);
	});
});
