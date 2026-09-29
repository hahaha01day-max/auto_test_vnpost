'use strict';

/**
 * 18_2 nhóm 030 — mã coupon trên màn bán hàng (vai `gdv`, điểm bán seed làn).
 *
 * Đo 25/09/2026: ô "Quét mã vạch hoặc nhập mã giảm giá..." + nút "Áp dụng" ⇒ `GET /coupon/validate?code=&shopId=`.
 * Dữ liệu (`COUPON_BATCH`/`COUPON_CODE`, chuỗi 626): đợt 76 hết hạn 10/09 (mã UNUSED, phạm vi TCT) ·
 * đợt 78 còn hạn nhưng trả "Cửa hàng không thuộc phạm vi áp dụng…" cho điểm bán seed ⇒ KHÔNG có mã
 * coupon HỢP LỆ cho điểm bán seed (case áp thành công chặn có lý do).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, sp } = p;
const HET_HAN = 'ACC5M8329'; // đợt 76 "mừng nghỉ lễ", end 2026-09-10, UNUSED

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const oMa = (page) => page.getByPlaceholder(/Quét mã vạch hoặc nhập mã/);
const boMa = (s) => chuan(s).replace(/\s*\([A-Za-z0-9]{6}\)/g, '');

/** Nhập mã + Áp dụng; trả { res, body, tb }. */
async function ap(page, ma) {
	await oMa(page).fill(ma);
	const cho = page.waitForResponse((r) => r.url().includes('/coupon/validate'), { timeout: 10_000 }).catch(() => null);
	await page.getByRole('button', { name: 'Áp dụng' }).click();
	const res = await cho;
	const body = res ? await res.json().catch(() => null) : null;
	const n = page.locator('.ant-message-notice');
	await n.first().waitFor({ state: 'visible', timeout: 4_000 }).catch(() => null);
	const tb = boMa((await n.allInnerTexts()).join(' | '));
	return { res, body, tb };
}

test.describe('18_2 — Mã coupon', () => {
	test.describe.configure({ timeout: 180_000 });

	test.beforeEach(async ({ page }) => {
		await p.moBan(page, test);
		await p.them(page, sp().tc);
		await page.mouse.move(600, 700);
	});

	test.afterEach(async ({ page }) => {
		await p.donTab(page).catch(() => null);
	});

	test('18_2_030_001 — Ô Mã coupon có placeholder đúng', async ({ page }) => {
		chanNeuTat('18_2_030_001');
		await expect(page.getByRole('heading', { name: 'Mã coupon' })).toBeVisible();
		await expect(oMa(page)).toHaveAttribute('placeholder', 'Quét mã vạch hoặc nhập mã giảm giá...');
		await expect(page.getByRole('button', { name: 'Áp dụng' })).toBeVisible();
	});

	test('18_2_030_006 — Mã coupon không tồn tại bị chặn', async ({ page }) => {
		chanNeuTat('18_2_030_006');
		const truoc = await p.tongKet(page);
		const { tb, body } = await ap(page, 'KHONGCO999');
		expect(boMa(body?.status?.message)).toBe('Mã coupon không tồn tại');
		expect(tb).toContain('Mã coupon không tồn tại');
		expect(await p.tongKet(page)).toEqual(truoc);
	});

	test('18_2_030_007 — Mã coupon hết hiệu lực bị chặn', async ({ page }) => {
		chanNeuTat('18_2_030_007');
		const truoc = await p.tongKet(page);
		const { tb } = await ap(page, HET_HAN);
		expect(tb).toContain('Mã coupon đã hết hạn');
		expect(await p.tongKet(page)).toEqual(truoc);
	});

	test('18_2_030_011 — Áp mã coupon rỗng', async ({ page }) => {
		chanNeuTat('18_2_030_011');
		const { res, tb } = await ap(page, '');
		test.info().annotations.push({ type: 'hành vi thật', description: `request: ${res ? res.url().split('__api')[1] : 'không gửi'} · "${tb}"` });
		expect(res, 'Mã rỗng vẫn gọi API validate').toBeNull();
		await expect(page.locator('.ant-message-error')).toHaveCount(0);
	});

	test('18_2_030_012 — Mã coupon toàn khoảng trắng', async ({ page }) => {
		chanNeuTat('18_2_030_012');
		const { res, tb } = await ap(page, '     ');
		test.info().annotations.push({ type: 'hành vi thật', description: `request: ${res ? res.url().split('__api')[1] : 'không gửi'} · "${tb}"` });
		expect(res, 'Mã toàn khoảng trắng vẫn gọi API validate (không trim)').toBeNull();
	});

	test('18_2_030_013 — Mã coupon khác hoa thường', async ({ page }) => {
		chanNeuTat('18_2_030_013');
		const hoa = await ap(page, HET_HAN);
		const thuong = await ap(page, HET_HAN.toLowerCase());
		test.info().annotations.push({ type: 'hành vi thật', description: `HOA "${hoa.tb}" · thường "${thuong.tb}"` });
		expect(boMa(thuong.body?.status?.message), 'Mã chữ thường bị coi là mã KHÁC (phân biệt hoa thường)').toBe(boMa(hoa.body?.status?.message));
	});
});
