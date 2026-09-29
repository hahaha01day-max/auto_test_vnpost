'use strict';

/**
 * Helper màn BÁN HÀNG 18_1 (`/order/create-order`) — vai `gdv` (= GDV điểm bán seed của làn).
 *
 * Tiền đề ca (đo 25/09/2026, làn 8):
 * - Màn bán hàng chặn "Yêu cầu mở ca trước khi bán hàng" khi hôm nay chưa mở ca.
 * - Mở ca hôm nay bị `SHIFT-006` nếu còn ca NGÀY TRƯỚC chưa chốt ⇒ `bamCa` chốt ca cũ trước
 *   (banner "Bạn còn N ca trước chưa chốt" → "Chốt ca"/"Kết ca" → Tạm chốt 0 tờ → "Xác nhận chốt ca"
 *   kèm lý do chênh lệch), rồi mở ca hôm nay bằng `pos-10.moCa`.
 * - `printShiftReport` gọi `window.print` ⇒ chặn bằng `addInitScript`.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const pos10 = require('../../10_bang_gia_ban_san_pham/tests/pos-10');

const BASE = () => process.env.VNPOST_BASE_URL;
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const VAI = 'gdv';

async function chanIn(page) {
	await page.addInitScript(() => {
		window.print = () => {};
	});
}

/** Chốt mọi ca ngày trước còn treo của GDV (banner cảnh báo ở màn Ca làm việc). */
async function chotCaCu(page) {
	await chanIn(page);
	await moTrang(page, `${BASE()}/lich-ca-nhan/ca-lam-viec`, VAI);
	const banner = page.locator('.ant-alert').filter({ hasText: /ca trước chưa chốt/ });
	await page.waitForTimeout(3_000);
	for (let lan = 0; lan < 3 && (await banner.count()); lan += 1) {
		await banner.getByRole('button', { name: /^(Chốt ca|Kết ca)$/ }).first().click();
		const dr = page.locator('.ant-drawer-open').last();
		await expect(dr).toBeVisible({ timeout: 20_000 });
		const tamChot = dr.getByRole('button', { name: 'Tạm chốt', exact: true });
		if (await tamChot.isVisible().catch(() => false)) {
			const cho = page.waitForResponse((r) => /shift-report\/draft-close/.test(r.url()), { timeout: 60_000 });
			await tamChot.click();
			await page.locator('.ant-modal-confirm').last().getByRole('button', { name: 'Xác nhận' }).click();
			const b = await (await cho).json().catch(() => ({}));
			expect(String(b?.status?.code), `Tạm chốt ca cũ lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
		}
		const lyDo = dr.locator('textarea').last();
		if (await lyDo.isVisible().catch(() => false)) await lyDo.fill('Auto test: chốt ca treo từ ngày trước để mở ca mới');
		const cho2 = page.waitForResponse((r) => /shift-report\/finalize/.test(r.url()), { timeout: 60_000 });
		await dr.getByRole('button', { name: 'Xác nhận chốt ca' }).click();
		const b2 = await (await cho2).json().catch(() => ({}));
		expect(String(b2?.status?.code), `Chốt ca cũ lỗi: ${JSON.stringify(b2?.status)}`).toBe('200');
		await page.waitForTimeout(2_000);
		await moTrang(page, `${BASE()}/lich-ca-nhan/ca-lam-viec`, VAI);
		await page.waitForTimeout(3_000);
	}
}

/** Bảo đảm GDV có ca mở hôm nay (chốt ca cũ nếu cần). */
async function bamCa(page, test) {
	await chotCaCu(page);
	await pos10.moCa(page, test);
}

const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');

/** Sản phẩm seed của làn (tên hiển thị trên POS). */
function sp() {
	const d = seed.doc().duLieu?.sanPham?.sanPhamTheoGiaVon || {};
	return { tc: d.tieuChuan?.tenSanPham, fifo: d.fifo?.tenSanPham, dd: d.dichDanh?.tenSanPham, bt: d.mac?.tenSanPham };
}

const oTim = (page) => page.getByPlaceholder('Tìm kiếm sản phẩm / dịch vụ (F3)');
const tabs = (page) => page.locator('.ant-tabs-nav').first().getByRole('tab');
/** Ô chọn khách: `.ant-select` đứng cạnh nút "plus" (Thêm khách hàng) ở cột phải. */
const oKhach = (page) =>
	page.getByRole('button', { name: 'plus', exact: true }).first()
		.locator('xpath=ancestor::*[.//div[contains(@class,"ant-select ")]][1]').locator('.ant-select').first();

/**
 * Mở màn bán hàng sạch (1 tab rỗng). Chưa có ca ⇒ `bamCa` rồi mở lại. Trả `st` (header phiên).
 */
async function moBan(page, test) {
	await chanIn(page);
	const st = k.batHeader(page);
	await moTrang(page, `${BASE()}/order/create-order`, VAI);
	await dongTabHoanTra(page);
	const coO = await oTim(page).waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false);
	if (!coO) {
		await bamCa(page, test);
		await moTrang(page, `${BASE()}/order/create-order`, VAI);
		await expect(oTim(page), 'Màn bán hàng vẫn chặn sau khi mở ca').toBeVisible({ timeout: 30_000 });
	}
	await donTab(page);
	return st;
}

/**
 * 🔴 Tab "Hoàn trả: <mã>" treo lại từ lượt trước (trạng thái tab POS được lưu) che ô tìm SP thường ⇒ `moBan` tưởng chưa mở ca.
 * Đóng hết tab hoàn trả trước khi kiểm ca.
 */
async function dongTabHoanTra(page) {
	const nav = page.locator('.ant-tabs-nav').first();
	await nav.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null);
	for (let lan = 0; lan < 5; lan += 1) {
		const t = nav.locator('.ant-tabs-tab').filter({ hasText: /^Hoàn trả:/ }).first();
		if (!(await t.count())) break;
		// Tab hoàn trả đơn có quà tự mở `ModalGiftReturn` ⇒ đóng modal trước rồi mới đóng tab.
		await page.keyboard.press('Escape').catch(() => null);
		await page.waitForTimeout(300);
		await t.getByRole('button', { name: 'remove' }).click({ force: true });
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận đóng' });
		if (await hop.waitFor({ state: 'visible', timeout: 1_500 }).then(() => true, () => false)) {
			await hop.getByRole('button', { name: 'Đóng tab' }).click();
		}
		await page.waitForTimeout(500);
	}
}

/** Đóng mọi tab thừa, xoá giỏ tab còn lại ⇒ đúng 1 tab rỗng. */
async function donTab(page) {
	for (let lan = 0; lan < 10 && (await tabs(page).count()) > 1; lan += 1) {
		await page.locator('.ant-tabs-nav').first().getByRole('button', { name: 'remove' }).last().click();
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận đóng' });
		if (await hop.waitFor({ state: 'visible', timeout: 1_500 }).then(() => true, () => false)) {
			await hop.getByRole('button', { name: 'Đóng tab' }).click();
		}
		await page.waitForTimeout(400);
	}
	await pos10.xoaHet(page);
	await boKhach(page);
}

/** Bỏ khách đang gắn ở tab hiện tại (nút xoá của ô chọn khách). */
async function boKhach(page) {
	const o = oKhach(page);
	if (!(await o.count())) return;
	if (/Tìm kiếm khách hàng/.test(await o.innerText())) return;
	await o.hover();
	await o.locator('.ant-select-clear').click().catch(() => null);
}

/** Tạo khách hàng qua API (cùng body FE `POST /chain-customer/create`). */
async function taoKhach(page, st, ten) {
	const ma = `A${process.env.VNPOST_LANE || 0}KH${Date.now().toString(36).slice(-5).toUpperCase()}`;
	const ph = `849${String(Date.now()).slice(-8)}`;
	const b = await k.goiGhi(page, st, 'POST', '/chain-customer/create', {}, {
		customerName: ten ?? `${ma} Khach test`, customerCode: ma, customerPhone: ph, chainId: Number(st.h.chainid),
		status: 1, groupIds: [], customerRank: 0, customerSource: 1, shopId: Number(st.h.shopid),
	});
	expect(String(b?.status?.code), `Tạo khách lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
	return b.data;
}

/** Gõ tìm khách rồi chọn đúng dòng có `ten`. */
async function chonKhach(page, ten) {
	const o = oKhach(page);
	await o.click();
	await page.keyboard.type(ten);
	const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
	const muc = dd.locator('.ant-select-item-option').filter({ hasText: ten }).first();
	await expect(muc, `Ô tìm khách không ra "${ten}"`).toBeVisible({ timeout: 20_000 });
	await muc.click();
	await expect(o).toContainText(ten, { timeout: 10_000 });
}

/** Đơn `orderId` có trong danh sách đơn của điểm bán (hôm nay, mọi trạng thái)? Trả dòng hoặc null. */
async function donTrongDs(page, st, orderId) {
	const d0 = new Date();
	d0.setHours(0, 0, 0, 0);
	for (let pg = 0; pg < 5; pg += 1) {
		const b = await k.goiGhi(page, st, 'GET', `/orders/shops/${st.h.shopid}/v1.3`, {
			page: pg, size: 50, status: -1, orderBy: 'createdDate', startTime: d0.getTime(), endTime: d0.getTime() + 86400_000 - 1,
		});
		const x = (b?.data || []).find((o) => String(o.orderId) === String(orderId));
		if (x) return x;
		if (!(b?.data || []).length) break;
	}
	return null;
}

/**
 * Thanh toán TIỀN MẶT đơn đang mở (đo 25/09/2026):
 * "Thanh toán" → modal (mặc định Thanh toán hết + Tiền mặt) → "Xác nhận thanh toán" ⇒ `draft-checkout`
 * + `paygate/.../auth` ⇒ iframe SDK `vnpostpayment-dev.postpay.vn/confirm-cash` ("Xác nhận giao dịch")
 * ⇒ bấm `div.btn-submit` "Xác nhận thanh toán" TRONG IFRAME ⇒ `POST api-bdvn-dev.postpay.vn/.../payment`
 * ⇒ app nạp `GET /orders/shops/{shop}/{orderId}/details` và reset tab.
 * 🔴 Nút trong iframe KHÁC ORIGIN, không phải <button>: 🚫 `getByRole('button')`, 🚫 tìm ở frame chính.
 * Trả { orderId, orderNumber, draft } — `draft` = body draft-checkout (đọc lỗi chặn nếu có).
 */
async function thanhToanTienMat(page, { truocKhiXacNhan } = {}) {
	await page.mouse.move(600, 700);
	await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
	const m = page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last();
	await expect(m).toBeVisible({ timeout: 20_000 });
	if (truocKhiXacNhan) await truocKhiXacNhan(m);
	const choDraft = page.waitForResponse((r) => /draft-checkout/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
	await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
	const draft = await (await choDraft).json().catch(() => null);
	if (String(draft?.status?.code) !== '200') return { orderId: null, draft };
	const orderId = draft?.data?.orderId;
	const fr = page.frameLocator('iframe[src*="confirm-cash"]');
	const choCt = page.waitForResponse((r) => r.url().includes(`/orders/shops/${draft?.data?.shopId}/${orderId}/details`), { timeout: 60_000 });
	// "Thanh toán sau" (ghi nợ toàn bộ) KHÔNG qua iframe SDK — app nạp chi tiết đơn ngay.
	const coSdk = await Promise.race([
		fr.getByText(/xác nhận giao dịch/i).waitFor({ timeout: 40_000 }).then(() => true),
		choCt.then(() => false),
	]).catch(() => false);
	if (coSdk) await fr.getByText('Xác nhận thanh toán', { exact: true }).click();
	await choCt;
	await page.waitForTimeout(1_500);
	return { orderId, orderNumber: draft?.data?.orderNumber, draft };
}

module.exports = { thanhToanTienMat, donTrongDs, moTrang, bamCa, chotCaCu, chanIn, chuan, VAI, sp, oTim, tabs, oKhach, moBan, donTab, boKhach, taoKhach, chonKhach, k, ...pos10 };
