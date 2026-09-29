'use strict';

/**
 * Helper GHI phân hệ 17 — quầy thu ngân + quỹ của điểm bán seed của làn.
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516, pod-service):
 * - Quầy: `GET /cashier-counter/get-all` · `POST /cashier-counter/create {shopId,name,code}` ·
 *   `PUT /cashier-counter/update {counterId,shopId,name?,code?,active?}` ·
 *   `DELETE /cashier-counter/delete?counterId&shopId` (= NGỪNG, 🚫 không xoá cứng).
 * - Tạo quầy ⇒ BE tự tạo "Quỹ tiền mặt - <tên quầy>" (`cashFundId`). Ngừng quầy ⇒ khoá quỹ đó.
 * - Quỹ: `GET /fund/get-all` · `GET /fund/fund-total` (`totalMoneyEndPeriod` = còn lại) ·
 *   `POST /fund/add-history` (cấp quỹ, type GRANT) · `POST /fund/transfer`.
 *
 * 🔴 Quầy KHÔNG xoá cứng được ⇒ mọi quầy test mang tiền tố `A<làn>Q` và được NGỪNG ở `finally`.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
/** Thông báo BE kèm đuôi ` (requestId)` — bỏ đuôi để so nguyên văn. */
const boMa = (s) => chuan(s).replace(/\s*\([A-Za-z0-9]{6}\)$/, '');
const BASE = () => process.env.VNPOST_BASE_URL;
const LAN = process.env.VNPOST_LANE || '0';
const TIEN_TO = `A${LAN}Q`;

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const modal = (page) => page.getByRole('dialog').last();

/** Mã ngắn duy nhất cho mỗi lần gọi. */
let dem = 0;
const maMoi = () => `${TIEN_TO}${Date.now().toString(36).slice(-5)}${(dem += 1)}`.toUpperCase();

/** Mở màn quầy, trả `st` (header phiên) + shopId. */
async function moQuay(page, vai = 'shop', { canShop = true } = {}) {
	const st = k.batHeader(page);
	const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/get-all') && r.status() !== 401, {
		timeout: canShop ? 90_000 : 8_000,
	});
	await moTrang(page, `${BASE()}/finance/cashier-counter`, vai);
	await cho.catch(() => null);
	await expect.poll(() => (canShop ? st.h?.shopid : st.h?.authorization), { timeout: 30_000 }).toBeTruthy();
	await page.waitForTimeout(1_000);
	return { st, shopId: Number(st.h?.shopid) || null };
}

async function dsQuay(page, st, shopId, name) {
	return (await k.goiApi(page, st, '/cashier-counter/get-all', { shopId, page: 0, size: 200, name })).data || [];
}

async function taoQuayApi(page, st, shopId, { ten, ma } = {}) {
	const m = ma ?? maMoi();
	const body = await k.goiGhi(page, st, 'POST', '/cashier-counter/create', {}, { shopId, name: ten ?? `${m} test`, code: m });
	expect(String(body?.status?.code), `Tạo quầy lỗi: ${JSON.stringify(body?.status)}`).toBe('200');
	return body.data;
}

async function ngungQuayApi(page, st, shopId, counterId) {
	if (!counterId) return null;
	return k.goiGhi(page, st, 'DELETE', '/cashier-counter/delete', { shopId, counterId });
}

async function suaQuayApi(page, st, body) {
	return k.goiGhi(page, st, 'PUT', '/cashier-counter/update', {}, body);
}

/** Ngừng mọi quầy test còn hoạt động có id trong danh sách. */
async function donQuay(page, st, shopId, ids) {
	for (const id of ids.filter(Boolean)) {
		await ngungQuayApi(page, st, shopId, id).catch(() => null);
	}
}

/** Tìm trong ô tìm kiếm, chờ response. */
async function tim(page, tuKhoa) {
	const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/get-all') && r.status() !== 401, {
		timeout: 60_000,
	});
	const o = khung(page).locator('input[placeholder="Tìm kiếm"]').first();
	await o.fill(tuKhoa);
	await o.press('Enter');
	const res = await cho.catch(() => null);
	await page.waitForTimeout(1_200);
	return res;
}

/** Tải lại danh sách (tìm theo mã) để dòng quầy vừa tạo hiện ra. */
async function dongQuay(page, ma) {
	await tim(page, ma);
	return dong(page).filter({ hasText: ma }).first();
}

/** Bấm nút OK của modal, gom thông báo antd. */
async function thongBaoSau(page, hanhDong, cho = 6_000) {
	await hanhDong();
	const tb = page.locator('.ant-message-notice');
	await tb.first().waitFor({ state: 'visible', timeout: cho }).catch(() => null);
	return chuan((await tb.allInnerTexts()).join(' | '));
}

/** Ghi lại mọi request ghi tới nhóm API quầy/quỹ. */
function demGhi(page, mau = /cashier-counter|\/fund\//) {
	const ds = [];
	page.on('request', (r) => {
		if (r.method() !== 'GET' && mau.test(r.url())) ds.push(`${r.method()} ${r.url()}`);
	});
	return ds;
}

/** Lỗi form antd nằm dưới đúng Form.Item có nhãn `nhan`. */
function loiO(box, nhan) {
	return box
		.locator('.ant-form-item')
		.filter({ has: box.page().locator(`label:text-is("${nhan}")`) })
		.locator('.ant-form-item-explain-error');
}

// ---------------- Quỹ ----------------

async function dsQuy(page, st, shopId) {
	return (await k.goiApi(page, st, '/fund/get-all', { shopId, page: 0, size: 200 })).data || [];
}

async function soDu(page, st, shopId, fundId) {
	const b = await k.goiApi(page, st, '/fund/fund-total', {
		shopId,
		fundId,
		beginTime: Date.now() - 5 * 365 * 86400_000,
		endTime: Date.now() + 86400_000,
	});
	return Number(b.data?.totalMoneyEndPeriod ?? 0);
}

async function capQuyApi(page, st, shopId, fundId, money) {
	const body = await k.goiGhi(page, st, 'POST', '/fund/add-history', {}, {
		shopId,
		fundId,
		money,
		content: `${TIEN_TO} auto test cấp quỹ`,
		type: 'GRANT',
		provideTime: Date.now(),
		moneyType: 'CASH',
	});
	expect(String(body?.status?.code), `Cấp quỹ lỗi: ${JSON.stringify(body?.status)}`).toBe('200');
	return body.data;
}

async function chuyenQuyApi(page, st, shopId, sourceFundId, distFundId, money) {
	return k.goiGhi(page, st, 'POST', '/fund/transfer', {}, {
		shopId,
		sourceFundId,
		distFundId,
		money,
		sourceMoneyType: 'CASH',
		distMoneyType: 'CASH',
	});
}

/** Hai quầy test mới ⇒ hai quỹ tiền mặt rỗng. Trả { quay: [q1,q2], quy: [f1,f2] }. */
async function haiQuyMoi(page, st, shopId) {
	const q1 = await taoQuayApi(page, st, shopId);
	const q2 = await taoQuayApi(page, st, shopId);
	const quy = await dsQuy(page, st, shopId);
	const f1 = quy.find((f) => f.counterId === q1.counterId);
	const f2 = quy.find((f) => f.counterId === q2.counterId);
	expect(f1 && f2, 'Tạo quầy xong mà 🚫 không thấy quỹ tiền mặt tương ứng').toBeTruthy();
	return { quay: [q1, q2], quy: [f1, f2] };
}

async function moQuy(page, vai = 'shop', { canShop = true } = {}) {
	const st = k.batHeader(page);
	const cho = page.waitForResponse((r) => r.url().includes('/fund/get-all') && r.status() !== 401, {
		timeout: canShop ? 90_000 : 8_000,
	});
	await moTrang(page, `${BASE()}/finance/fund`, vai);
	await cho.catch(() => null);
	await expect.poll(() => (canShop ? st.h?.shopid : st.h?.authorization), { timeout: 30_000 }).toBeTruthy();
	await page.waitForTimeout(1_000);
	return { st, shopId: Number(st.h?.shopid) || null };
}

async function moChuyenQuy(page) {
	await khung(page).getByRole('button', { name: /Chuyển quỹ/ }).click();
	const box = page.getByRole('dialog').filter({ hasText: 'Chuyển quỹ' }).last();
	await expect(box).toBeVisible({ timeout: 15_000 });
	return box;
}

/** Chọn quỹ theo tên trong ô Select dưới nhãn `nhan`. */
async function chonQuy(page, box, nhan, tenQuy) {
	const item = box.locator('.ant-form-item').filter({ has: page.locator(`label:text-is("${nhan}")`) });
	await item.locator('.ant-select').click();
	const o = item.locator('input').first();
	await o.fill(tenQuy).catch(() => null);
	const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
	await dd.locator('.ant-select-item-option').filter({ hasText: tenQuy }).first().click();
	await expect(dd).toBeHidden({ timeout: 5_000 }).catch(() => null);
}

module.exports = {
	chuan,
	boMa,
	TIEN_TO,
	khung,
	dong,
	modal,
	maMoi,
	moQuay,
	dsQuay,
	taoQuayApi,
	ngungQuayApi,
	suaQuayApi,
	donQuay,
	tim,
	dongQuay,
	thongBaoSau,
	demGhi,
	loiO,
	dsQuy,
	soDu,
	capQuyApi,
	chuyenQuyApi,
	haiQuyMoi,
	moQuy,
	moChuyenQuy,
	chonQuy,
	k,
};
