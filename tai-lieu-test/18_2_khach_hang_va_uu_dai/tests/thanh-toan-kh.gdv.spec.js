'use strict';

/**
 * 18_2 — case cần ĐƠN ĐÃ THANH TOÁN (vai `gdv`, điểm bán seed làn). Thanh toán tiền mặt qua helper chung
 * `18_1/tests/pos-18.js › thanhToanTienMat` (iframe SDK `confirm-cash`). Đọc kết quả bằng
 * `GET /orders/shops/{shop}/{orderId}/details` (cùng API app gọi sau khi thanh toán).
 *
 * 🔴 Ghi thật: sinh đơn + trừ tồn ở điểm bán seed (được phép theo bàn giao).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, sp } = p;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

async function chiTiet(page, st, orderId) {
	return (await p.k.goiApi(page, st, `/orders/shops/${st.h.shopid}/${orderId}/details`)).data;
}

/** Điểm hiện tại của khách đang gắn (đọc khối khách; không có dòng ⇒ 0). */
async function diemKhoi(page) {
	await page.keyboard.press('Escape');
	await page.mouse.move(600, 700);
	const t = chuan(await page.getByText('Ghi chú đơn hàng', { exact: true }).locator('xpath=ancestor::*[.//*[@aria-label="plus"]][1]').innerText());
	const m = t.match(/Điểm hiện tại\s*(-?[\d.]+)/);
	return m ? Number(m[1].replace(/\./g, '')) : 0;
}

test.describe('18_2 — Thanh toán có khách / ghi chú / HĐĐT', () => {
	test.describe.configure({ timeout: 240_000 });
	let st;

	test.beforeEach(async ({ page }) => {
		await p.chanIn(page);
		st = await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_2_010_010 — Ghi chú đơn hàng lưu được', async ({ page }) => {
		chanNeuTat('18_2_010_010');
		const ghi = `Auto test ghi chú ${Date.now().toString(36)}`;
		await p.them(page, sp().tc);
		await page.getByPlaceholder('Nhập ghi chú').fill(ghi);
		const r = await p.thanhToanTienMat(page);
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		const d = await chiTiet(page, st, r.orderId);
		expect(JSON.stringify(d), `Chi tiết đơn ${r.orderId} không có ghi chú "${ghi}"`).toContain(ghi);
	});

	test('18_2_010_011 — Để trống khách là bán cho khách vãng lai', async ({ page }) => {
		chanNeuTat('18_2_010_011');
		await p.them(page, sp().tc);
		// Không ghi nợ được: F8 (thanh toán sau) với khách lẻ bị chặn.
		await page.mouse.move(600, 700);
		await page.evaluate(() => document.activeElement?.blur?.());
		await page.locator('body').click({ position: { x: 600, y: 650 } });
		await page.keyboard.press('F8');
		const n = page.locator('.ant-message-notice');
		await n.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null);
		const tb = chuan((await n.allInnerTexts()).join(' | '));
		expect(tb).toContain('không thể áp dụng cho khách vãng lai');
		const r = await p.thanhToanTienMat(page);
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		const d = await chiTiet(page, st, r.orderId);
		const kh = d?.customer?.customerId ?? d?.customerId ?? 0;
		test.info().annotations.push({ type: 'đơn', description: `orderId ${r.orderId} · customerId ${kh} · điểm ${JSON.stringify(d?.loyaltyPoint ?? d?.point ?? null)}` });
		expect(Number(kh) || 0, 'Đơn khách lẻ lại mang customerId').toBe(0);
	});

	test('18_2_050_004 — Đơn không tick đổi điểm vẫn tích luỹ điểm bình thường', async ({ page }) => {
		chanNeuTat('18_2_050_004');
		const kh = await p.taoKhach(page, st);
		await p.chonKhach(page, kh.customerName);
		const truoc = await diemKhoi(page);
		await p.them(page, sp().tc);
		const r = await p.thanhToanTienMat(page);
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		// Điểm tích qua Kafka (loyalty) ⇒ chờ tối đa ~60s.
		let sau = truoc;
		for (let lan = 0; lan < 6 && sau <= truoc; lan += 1) {
			await page.waitForTimeout(10_000);
			await p.donTab(page);
			await p.chonKhach(page, kh.customerName);
			sau = await diemKhoi(page);
		}
		test.info().annotations.push({ type: 'điểm', description: `trước ${truoc} → sau ${sau} (đơn ${r.orderId}, 100.000đ)` });
		expect(sau, 'Điểm khách không tăng sau đơn 100.000đ').toBeGreaterThan(truoc);
	});

	test('18_2_040_021 — Đơn xuất HĐĐT được đánh dấu chờ phát hành sau thanh toán', async ({ page }) => {
		chanNeuTat('18_2_040_021');
		await p.them(page, sp().tc);
		const cb = page.getByRole('checkbox', { name: 'Xuất hoá đơn điện tử' });
		await cb.check();
		const lk = page.getByText('Thông tin xuất HĐ', { exact: true });
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thông tin xuất hoá đơn' }).last();
		for (let lan = 0; lan < 4 && !(await dr.isVisible()); lan += 1) {
			await lk.dispatchEvent('click');
			await dr.waitFor({ state: 'visible', timeout: 4_000 }).catch(() => null);
		}
		const o = (n) => dr.locator('.ant-form-item').filter({ has: page.locator(`.ant-form-item-label label:text-is("${n}")`) }).locator('input').last();
		await o('Họ và tên người mua').fill('Nguyễn Văn Auto');
		await o('CMND/CCCD').fill('012345678901');
		await o('Email nhận hoá đơn').fill('auto8@example.vn');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await expect(dr).toBeHidden({ timeout: 8_000 });
		const r = await p.thanhToanTienMat(page);
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		const d = await chiTiet(page, st, r.orderId);
		const inv = Object.fromEntries(Object.entries(d || {}).filter(([k2]) => /invoice|einvoice|hddt/i.test(k2)));
		test.info().annotations.push({ type: 'trường hoá đơn của đơn', description: JSON.stringify(inv).slice(0, 400) });
		expect(JSON.stringify(d), 'Thông tin người mua (email) không được lưu vào đơn').toContain('auto8@example.vn');
		expect(d?.enableInvoice, '🔴 Đơn tích "Xuất hoá đơn điện tử" + nhập đủ thông tin mà enableInvoice=false (không chờ phát hành)').toBe(true);
	});

	test('18_2_010_013 — 🔴 Gắn khách sau khi đã thu tiền là không sửa được', async ({ page }) => {
		chanNeuTat('18_2_010_013');
		await p.them(page, sp().tc);
		const r = await p.thanhToanTienMat(page);
		expect(r.orderId, `Thanh toán lỗi: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		await p.moTrang(page, `${process.env.VNPOST_BASE_URL}/order/created-orders/detail/${r.orderId}/${st.h.shopid}`, p.VAI);
		await expect(page.getByText('Doanh thu', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
		await page.waitForTimeout(2_000);
		// Mọi điều khiển gắn/đổi khách có thể có ở chi tiết đơn: nút có chữ "khách", ô tìm khách, nút "Sửa đơn".
		const nutKhach = page.getByRole('button', { name: /khách/i });
		const oKhach = page.getByPlaceholder(/khách hàng|số điện thoại/i);
		const nutSua = page.getByRole('button', { name: /^(Sửa|Chỉnh sửa|Cập nhật)( đơn)?/ });
		const dem = { nutKhach: await nutKhach.count(), oKhach: await oKhach.count(), nutSua: await nutSua.count() };
		test.info().annotations.push({ type: 'điều khiển ở chi tiết đơn', description: `${JSON.stringify(dem)} · nút: ${(await page.getByRole('button').allInnerTexts()).map(chuan).filter(Boolean).join(' · ').slice(0, 400)}` });
		expect(dem.nutKhach + dem.oKhach + dem.nutSua, 'Đơn đã thu tiền vẫn có chỗ gắn/sửa khách').toBe(0);
		const d = await chiTiet(page, st, r.orderId);
		expect(d?.customer?.customerId ?? d?.customerId ?? 0, 'Đơn không gắn khách mà lại có khách').toBeFalsy();
	});
});
