'use strict';

/** Helper 18_4 — màn Quản lý đơn hàng + tạo đơn nhanh qua POS (trích từ don-hang.gdv.spec.js). */
const { expect } = require('@playwright/test');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const { chuan, sp, so } = p;
const BASE = () => process.env.VNPOST_BASE_URL;
const ROUTE = '/order/created-orders';
let test = { skip: () => {} };
const datTest = (t) => { test = t; };

const khung = (page) => page.locator('.ant-pro-page-container').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const oTim = (page) => khung(page).getByPlaceholder('Tìm kiếm mã đơn hàng, số điện thoại khách hàng');
const choDs = (page) => page.waitForResponse((r) => /\/orders\/shops\/\d+\/v1\.3/.test(r.url()) && r.status() === 200, { timeout: 30_000 });

async function moDs(page) {
	const st = p.k.batHeader(page);
	const cho = choDs(page);
	await p.moTrang(page, `${BASE()}${ROUTE}`, p.VAI);
	const res = await cho;
	await page.waitForTimeout(800);
	return { st, res };
}

async function tim(page, tu) {
	const cho = choDs(page).catch(() => null);
	await oTim(page).fill(tu);
	await oTim(page).press('Enter');
	const r = await cho;
	await page.waitForTimeout(800);
	return r;
}

/** Chọn giá trị Select (bộ lọc) theo nhãn / placeholder ban đầu. */
async function chonLoc(page, hienTai, nhan) {
	const cho = choDs(page).catch(() => null);
	await (hienTai === null ? khung(page).locator('.ant-select').first() : khung(page).locator('.ant-select').filter({ hasText: hienTai }).first()).click();
	await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${nhan}$`) }).first().click();
	const r = await cho.catch(() => null);
	await page.waitForTimeout(1_500);
	await page.waitForTimeout(800);
	return r;
}

const cot = async (page, ten) => {
	const ths = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
	return ths.indexOf(ten);
};
const oDong = async (page, i, ten) => chuan(await dong(page).nth(i).locator('td').nth(await cot(page, ten)).innerText());

/** Tạo nhanh 1 đơn qua POS: 'nhap' (F7) | 'no' (thanh toán sau, có khách) | 'tra' (tiền mặt). Trả orderId. */
async function taoDon(page, loai) {
	const st = await p.moBan(page, test);
	if (loai === 'no') {
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
	}
	await p.them(page, sp().tc);
	if (loai === 'nhap') {
		await page.mouse.move(600, 700);
		await page.evaluate(() => document.activeElement?.blur?.());
		await page.locator('body').click({ position: { x: 600, y: 650 } });
		const cho = page.waitForResponse((r) => /\/spa\/orders\/draft\/v2/.test(r.url()) && r.request().method() !== 'GET', { timeout: 30_000 });
		await page.keyboard.press('F7');
		const b = await (await cho).json();
		return b?.data?.orderId ?? b?.data?.id;
	}
	const r = await p.thanhToanTienMat(page, loai === 'no' ? { truocKhiXacNhan: (m) => m.getByRole('button', { name: 'Thanh toán sau', exact: true }).click() } : {});
	return r.orderId;
}

async function moCt(page, orderId, shopId) {
	// 🔴 Rời màn bán hàng ngay sau lưu nháp/thanh toán: app có lúc tự điều hướng sang /lich-ca-nhan/ca-lam-viec
	//    và cắt ngang page.goto ⇒ thử lại.
	for (let lan = 0; lan < 3; lan += 1) {
		await page.waitForTimeout(2_000);
		const ok = await p.moTrang(page, `${BASE()}${ROUTE}/detail/${orderId}/${shopId}`, p.VAI).then(() => true, () => false);
		if (ok && /\/detail\//.test(page.url())) break;
	}
	await expect(page.getByText('Chi tiết đơn hàng').first()).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(1_500);
	return chuan(await khung(page).innerText());
}
const giaTriCt = (t, nhan) => {
	const i = t.indexOf(nhan);
	const m = i < 0 ? null : t.slice(i + nhan.length, i + nhan.length + 30).match(/^\s*(-?[\d.]+)\s*đ/);
	return m ? so(m[1]) : null;
};


const SHOP = () => require('../../00_seed/seed-state').doc().duLieu.diemBan.shopId;
module.exports = { datTest, khung, dong, oTim, choDs, moDs, tim, chonLoc, cot, oDong, taoDon, moCt, giaTriCt, SHOP, BASE, ROUTE, p, chuan, sp, so };
