'use strict';

/** Helper 18_5 — bán đơn, mở đổi trả, bấm Hoàn trả (tách từ doi-tra.gdv.spec.js 25/09). */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const { chuan, sp, so } = p;
const BASE = () => process.env.VNPOST_BASE_URL;
const SHOP = () => seed.doc().duLieu.diemBan.shopId;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const boMa = (s) => chuan(s).replace(/\s*\([A-Za-z0-9]{6}\)/g, '');
async function tbSau(page, fn, cho = 8_000) {
	await fn();
	const n = page.locator('.ant-message-notice');
	await n.first().waitFor({ state: 'visible', timeout: cho }).catch(() => null);
	await page.waitForTimeout(500);
	return boMa((await n.allInnerTexts()).join(' | '));
}

/** Bán 1 đơn (tiền mặt | 'no' thanh toán sau), trả orderId + st. */
async function banDon(page, { loai = 'tra', sl = 1 } = {}) {
	const st = await p.moBan(page, test);
	if (loai === 'no') {
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
	}
	await p.them(page, sp().tc);
	if (sl > 1) {
		const o = p.dongBill(page).first().locator('input').first();
		await o.fill(String(sl));
		await o.press('Enter');
		await page.waitForTimeout(600);
	}
	const r = await p.thanhToanTienMat(page, loai === 'no' ? { truocKhiXacNhan: (m) => m.getByRole('button', { name: 'Thanh toán sau', exact: true }).click() } : {});
	expect(r.orderId, `Bán đơn lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
	return { st, orderId: r.orderId, orderNumber: r.orderNumber };
}

async function moDoiTra(page, orderId) {
	for (let lan = 0; lan < 3; lan += 1) {
		await page.waitForTimeout(2_000);
		await p.moTrang(page, `${BASE()}/order/created-orders/detail/${orderId}/${SHOP()}`, p.VAI).catch(() => null);
		if (/\/detail\//.test(page.url())) break;
	}
	// 🔴 Bấm "Đổi trả hàng" khi chi tiết chưa nạp xong ⇒ tab "Hoàn trả: 0", bảng hàng trả rỗng.
	await expect(page.getByText('Doanh thu', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
	await page.getByText('Sản phẩm đơn gốc').first().scrollIntoViewIfNeeded().catch(() => null);
	await expect(page.getByText(sp().tc, { exact: true }).first()).toBeVisible({ timeout: 30_000 }).catch(() => null);
	await page.waitForTimeout(2_000);
	await page.getByRole('button', { name: /Đổi trả hàng/ }).click();
	await expect(page.getByText('Hàng khách trả lại')).toBeVisible({ timeout: 30_000 });
	await expect(dongTra(page).filter({ hasText: sp().tc }).first(), 'Màn đổi trả không nạp hàng của đơn gốc').toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(1_000);
}

const bangTra = (page) => page.getByText('Hàng khách trả lại').locator('xpath=following::table[.//tr[contains(@class,"ant-table-row")]][1]');
const dongTra = (page) => bangTra(page).locator('tr.ant-table-row');
const khoiTra = async (page) => chuan(await page.getByText('Trả hàng', { exact: true }).last().locator('xpath=ancestor::*[.//*[contains(.,"Cửa hàng cần thanh toán") or contains(.,"Cần thanh toán")]][1]').innerText());
const tien = (t, nhan) => {
	const i = t.indexOf(nhan);
	const m = i < 0 ? null : t.slice(i + nhan.length, i + nhan.length + 30).match(/^\s*:?\s*(-?[\d.]+)\s*đ/);
	return m ? so(m[1]) : null;
};

/** Bấm "Hoàn trả", xử lý hộp thanh toán/SDK nếu có; trả { tb, res }. */
async function hoanTra(page) {
	const ghi = [];
	const loi = [];
	const nghe = (r) => {
		if (r.request().method() !== 'GET' && /return|refund|hoan/i.test(r.url())) ghi.push(r);
		if (r.status() >= 400 || /quyen|permission/i.test(r.statusText())) loi.push(`${r.status()} ${r.request().method()} ${r.url().split('?')[0]}`);
	};
	page.on('response', nghe);
	const tb = await tbSau(page, () => page.getByRole('button', { name: 'Hoàn trả', exact: true }).click(), 15_000);
	await page.waitForTimeout(2_000);
	page.off('response', nghe);
	if (loi.length) test.info().annotations.push({ type: 'HTTP lỗi khi hoàn trả', description: loi.join(' · ') });
	const res = ghi[ghi.length - 1] || null;
	return { tb, res, req: res ? res.request().postDataJSON() : null, url: res?.url(), body: res ? await res.json().catch(() => null) : null };
}

/**
 * Bảo đảm chuỗi có ≥ 1 lý do trả hàng đang hoạt động (feature `RETURN_ORDER`) — 25/09 danh mục TRỐNG.
 * Cấu hình chuỗi dùng chung, môi trường test ⇒ user cho tự khai. API core: `POST /reason-groups` + `POST /reasons`
 * (payload theo vnpost-web `reasonCatalogApi.js`). Gọi bằng phiên phụ vai `tct`. Trả tên lý do.
 */
async function damBaoLyDo(browser) {
	const ps = await p.k.moPhienPhu(browser, 'tct', '/settings');
	try {
		const doc = async () => ((await p.k.goiApi(ps.page, ps.st, '/reasons', { feature: 'RETURN_ORDER', size: 200 }))?.data || []).filter((r) => r.active !== false);
		let ds = await doc();
		if (!ds.length) {
			const g = await p.k.goiGhi(ps.page, ps.st, 'POST', '/reason-groups', {}, { name: 'AUTO Trả hàng', note: 'auto test 18_5', active: true });
			const groupId = g?.data?.groupId ?? g?.data?.id;
			expect(groupId, `Tạo nhóm lý do lỗi: ${JSON.stringify(g?.status)}`).toBeTruthy();
			const r = await p.k.goiGhi(ps.page, ps.st, 'POST', '/reasons', {}, { feature: 'RETURN_ORDER', groupId, name: 'AUTO Khách đổi ý', showNote: false });
			expect(String(r?.status?.code), `Tạo lý do lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
			ds = await doc();
		}
		test.info().annotations.push({ type: 'lý do RETURN_ORDER (vai tct)', description: JSON.stringify(ds).slice(0, 500) });
		return ds[0]?.name ?? ds[0]?.reasonName;
	} finally {
		await ps.dong();
	}
}

module.exports = { damBaoLyDo, GOC, BASE, SHOP, p, chuan, sp, so, chanNeuTat, boMa, tbSau, banDon, moDoiTra, bangTra, dongTra, khoiTra, tien, hoanTra };
