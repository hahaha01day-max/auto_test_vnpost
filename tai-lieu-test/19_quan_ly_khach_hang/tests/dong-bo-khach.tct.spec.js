'use strict';

/**
 * 19 · Đồng bộ khách hàng toàn chuỗi — vai `tct` + phiên phụ `gdv` / `shop` (chỉ gọi API đọc/dọn).
 * 🔴 GHI THẬT: khách rác `A<làn>KH19…`, xoá ở `finally`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { khung, moMan, tim, dong, chuan } = require('./customer-page');
const g = require('./khach-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

let st;
const rac = [];

test.describe('19 · Đồng bộ khách toàn chuỗi (vai tct, GHI THẬT)', () => {
	test.beforeEach(async ({ page }) => {
		st = g.k.batHeader(page);
		await moMan(page, VAI);
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	});

	test.afterEach(async ({ page }) => {
		while (rac.length) {
			const id = rac.pop();
			const b = await g.xoaKhachApi(page, st, id).catch((e) => ({ status: { message: e.message } }));
			ghiChu('dọn khách', `${id} → ${JSON.stringify(b?.status)}`);
		}
	});

	test('19_020_004 — Tạo khách hàng tại cấp Tổng công ty đồng bộ xuống mọi điểm bán', async ({ page, browser }) => {
		chanNeuTat('19_020_004');
		const kh = g.khachMoi('020_004');
		const hop = await g.moFormThem(page);
		await g.dienForm(hop, kh);
		const b = await (await g.bamLuu(page, hop)).json();
		const id = b?.data?.customerId ?? b?.data?.id;
		if (id) rac.push(id);
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		const gdv = await g.k.moPhienPhu(browser, 'gdv', '/customer');
		try {
			await expect
				.poll(async () => (await g.timApi(gdv.page, gdv.st, kh.ma)).length, { timeout: 60_000, message: `GDV điểm bán không thấy khách ${kh.ma} do TCT tạo` })
				.toBe(1);
		} finally {
			await gdv.dong();
		}
	});

	test('19_020_005 — Tạo khách hàng tại điểm bán đồng bộ ngược lên TCT', async ({ page, browser }) => {
		chanNeuTat('19_020_005');
		// GDV không có quyền tạo khách (19_020_006) ⇒ điểm bán tạo bằng phiên CHT cùng điểm bán.
		const shop = await g.k.moPhienPhu(browser, 'shop', '/customer');
		let kh;
		try {
			kh = await g.taoKhachApi(shop.page, shop.st, g.khachMoi('020_005'));
		} finally {
			await shop.dong();
		}
		rac.push(kh.id);
		await tim(page, kh.ma);
		await expect(dong(page).filter({ hasText: kh.ma }), `Danh sách cấp TCT không có khách ${kh.ma} do điểm bán tạo`).toHaveCount(1, { timeout: 30_000 });
		// …và ở điểm bán khác cùng chuỗi: đối chiếu qua API cấp chuỗi (không lọc điểm bán).
		expect(await g.timApi(page, st, kh.ma)).toHaveLength(1);
	});

	test('19_050_008 — Xoá khách hàng tạo từ TCT đồng bộ xoá toàn chuỗi', async ({ page, browser }) => {
		chanNeuTat('19_050_008');
		const a = await g.taoKhachApi(page, st, g.khachMoi('050_008'));
		rac.push(a.id);
		const gdv = await g.k.moPhienPhu(browser, 'gdv', '/customer');
		try {
			await expect.poll(async () => (await g.timApi(gdv.page, gdv.st, a.ma)).length, { timeout: 60_000, message: 'Tiền đề: GDV chưa thấy khách TCT vừa tạo' }).toBe(1);
			await tim(page, a.ma);
			await dong(page).filter({ hasText: a.ma }).first().locator('a').first().click();
			await expect(page).toHaveURL(/\/customer\/detail\//, { timeout: 20_000 });
			const nut = khung(page).getByRole('button', { name: /X[oó][aá]$/ });
			await expect(nut, 'Vai TCT không có nút Xóa').toBeVisible({ timeout: 20_000 });
			await nut.click();
			const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').last();
			const cho = page.waitForResponse((r) => /chain-customers?\/delete/.test(r.url()), { timeout: 30_000 });
			await pop.getByRole('button', { name: 'Đồng ý' }).click();
			const b = await (await cho).json();
			expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
			rac.pop();
			ghiChu('thông báo', await g.thongBao(page));
			await expect.poll(async () => (await g.timApi(gdv.page, gdv.st, a.ma)).length, { timeout: 60_000, message: 'Khách TCT đã xoá vẫn còn ở danh sách điểm bán' }).toBe(0);
		} finally {
			await gdv.dong();
		}
	});
});
