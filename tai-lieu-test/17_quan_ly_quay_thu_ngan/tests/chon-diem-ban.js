'use strict';

/**
 * Chọn điểm bán qua drawer ba cột "Chọn Điểm bán" (`SelectShopMultiple`, dùng ở màn quầy/quỹ cho
 * cấp xã/tỉnh/TCT). Đo 25/09/2026:
 * - Ô trông như `.ant-select` nhưng mở DRAWER; đóng drawer xong ô vẫn giữ focus ⇒ click lại không mở.
 * - Tỉnh và xã GIỮ lựa chọn giữa các lần mở; bấm lại mục đang chọn là BỎ chọn.
 */

const { expect } = require('@playwright/test');
const { chuan, khung } = require('./quay-ghi');

/** Mở drawer chọn điểm bán, chọn xã thứ `xa`; trả drawer + radio điểm bán + số xã. */
async function moDrawer(page, xa = 0, tinh = null) {
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chọn Điểm bán' }).last();
	// 🔴 Đóng drawer xong ô vẫn giữ focus ⇒ click lần sau KHÔNG mở lại. Bỏ focus rồi bấm, thử lại vài lần.
	for (let lan = 0; lan < 4 && !(await dr.isVisible()); lan += 1) {
		await page.locator('.ant-page-header-heading-title').first().click();
		await khung(page).locator('.ant-pro-card-body .ant-select').first().click({ force: true });
		await dr.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => null);
	}
	await expect(dr).toBeVisible({ timeout: 10_000 });
	const cot = (i) => dr.locator('.sp-column').nth(i);
	await expect.poll(() => cot(0).locator('.sp-item').count(), { timeout: 20_000 }).toBeGreaterThan(0);
	// 🔴 Tỉnh của vai được CHỌN SẴN; bấm lại là BỎ chọn (cột xã về "Vui lòng chọn Tỉnh…").
	await page.waitForTimeout(1_500);
	if (tinh) {
		const o = cot(0).getByRole('textbox', { name: 'Tìm kiếm' });
		await o.fill(tinh);
		await page.waitForTimeout(1_200);
		const muc = cot(0).locator('.sp-item').filter({ hasText: new RegExp(`^${tinh}\\b`) }).first();
		await muc.click();
		if ((await cot(1).locator('.sp-item').count().catch(() => 0)) === 0) {
			await page.waitForTimeout(1_500);
			if ((await cot(1).locator('.sp-item').count()) === 0) await muc.click();
		}
	} else if ((await cot(1).locator('.sp-item').count()) === 0) await cot(0).locator('.sp-item').first().click();
	await expect.poll(() => cot(1).locator('.sp-item').count(), { timeout: 20_000 }).toBeGreaterThan(0);
	const soXa = await cot(1).locator('.sp-item').count();
	const ds = cot(2).locator('.ant-radio-wrapper');
	// 🔴 Xã cũng giữ lựa chọn giữa các lần mở; bấm lại mục đang chọn là BỎ chọn ⇒ bấm, chưa có
	// điểm bán thì bấm lần nữa.
	await cot(1).locator('.sp-item').nth(xa).click();
	for (let lan = 0; lan < 2; lan += 1) {
		const co = await expect.poll(() => ds.count(), { timeout: 5_000 }).toBeGreaterThan(0).then(() => true).catch(() => false);
		if (co) break;
		await cot(1).locator('.sp-item').nth(xa).click();
	}
	return { dr, ds, soXa };
}

async function dong_(dr) {
	await dr.locator('.ant-drawer-footer').getByRole('button', { name: 'Đóng' }).click();
	await expect(dr).toBeHidden({ timeout: 10_000 });
}

/** Mọi cặp (xã, điểm bán) mà vai thấy trong drawer. */
async function moiShop(page, tinh = null) {
	const kq = [];
	const { dr, soXa } = await moDrawer(page, 0, tinh);
	await dong_(dr);
	for (let x = 0; x < soXa; x += 1) {
		const { dr: d2, ds } = await moDrawer(page, x, tinh);
		const n = await ds.count();
		for (let i = 0; i < n; i += 1) kq.push({ tinh, xa: x, i, ten: chuan(await ds.nth(i).innerText()) });
		await dong_(d2);
	}
	return kq;
}

/** Chọn điểm bán `o` ({xa,i}), chờ API `api` mang shopId; trả { ten, shopId, res }. */
async function chonShop(page, o, api) {
	const { dr, ds } = await moDrawer(page, o.xa, o.tinh);
	const ten = chuan(await ds.nth(o.i).innerText());
	await ds.nth(o.i).click();
	const cho = page.waitForResponse((r) => r.url().includes(api) && /shopId=\d+/.test(r.url()), { timeout: 30_000 });
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	const res = await cho;
	await page.waitForTimeout(1_000);
	return { ten, shopId: Number(new URL(res.url()).searchParams.get('shopId')), res };
}

module.exports = { moDrawer, moiShop, chonShop, dong_ };

/**
 * Chọn đúng điểm bán theo TÊN (tỉnh → xã → điểm bán), cho vai thấy nhiều tỉnh (TCT). Chờ API `api`
 * mang shopId; trả { ten, shopId, res }.
 */
async function chonTheoTen(page, { tinh, xa, shop }, api) {
	const { dr } = await moDrawer(page, 0, tinh);
	const cot = (i) => dr.locator('.sp-column').nth(i);
	const mucXa = cot(1).locator('.sp-item').filter({ hasText: xa }).first();
	await mucXa.click();
	const radio = cot(2).getByRole('button', { name: shop, exact: true }).first();
	if (!(await radio.isVisible().catch(() => false))) {
		await radio.waitFor({ state: 'visible', timeout: 6_000 }).catch(() => null);
		if (!(await radio.isVisible())) await mucXa.click();
	}
	await radio.click();
	const cho = page.waitForResponse((r) => r.url().includes(api) && /shopId=\d+/.test(r.url()), { timeout: 30_000 });
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	const res = await cho;
	await page.waitForTimeout(1_000);
	return { ten: shop, shopId: Number(new URL(res.url()).searchParams.get('shopId')), res };
}
module.exports.chonTheoTen = chonTheoTen;
