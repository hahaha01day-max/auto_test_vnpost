'use strict';

/**
 * 19 · Ngừng hoạt động / kích hoạt lại / xoá khách — vai `province`. 🔴 GHI THẬT trên khách rác tự tạo.
 *
 * Trace `customerInfoTab/CustomerInfoTab.jsx`: "Ngừng hoạt động" (Popconfirm "Xác nhận ngừng hoạt động khách
 * hàng này?") = `PUT …/update` kèm `businessStatus`; "Kích hoạt lại" tương tự; "Xóa" (quyền `delete_customer`,
 * Popconfirm "Hành động này sẽ không thể hoàn tác, bạn có chắc chắn muốn xóa?") = `DELETE …/delete`.
 * Vai tỉnh thấy 0 khách ở danh sách ⇒ mở chi tiết bằng URL `/customer/detail/:id`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { chuan, khung, moMan } = require('./customer-page');
const g = require('./khach-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

let st;
const rac = [];

async function moChiTietId(page, id) {
	const cho = page.waitForResponse((r) => /chain-customers?\/.*detail/.test(r.url()) && r.status() !== 401, { timeout: 60_000 }).catch(() => null);
	await moTrang(page, `/customer/detail/${id}`, VAI);
	const res = await cho;
	await page.waitForTimeout(2_500);
	return res;
}

async function bamXacNhan(page, nut, cauHoi) {
	// 🔴 Nút mang icon ⇒ tên truy cập là "<icon> Kích hoạt lại" — 🚫 `exact: true`.
	await khung(page).getByRole('button', { name: new RegExp(`${nut}$`) }).click();
	const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').filter({ hasText: cauHoi }).last();
	await expect(pop, `Không thấy hộp "${cauHoi}"`).toBeVisible({ timeout: 10_000 });
	return pop;
}

test.describe('19 · Trạng thái / xoá khách (vai province, GHI THẬT)', () => {
	test.beforeEach(async ({ page }) => {
		st = g.k.batHeader(page);
		await moMan(page, VAI);
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	});

	test.afterEach(async ({ page, browser }) => {
		let phu = null;
		while (rac.length) {
			const id = rac.pop();
			let b = await g.xoaKhachApi(page, st, id).catch((e) => ({ status: { message: e.message } }));
			// Vai tỉnh không có quyền xoá ⇒ dọn bằng phiên phụ TCT. 🔴 KHÔNG dùng CHT: xoá cấp điểm bán trả 200
			//    nhưng khách tạo ở cấp chuỗi vẫn sống (CHAIN_CUSTOMER.status = 1).
			if (String(b?.status?.code) !== '200') {
				phu ??= await g.k.moPhienPhu(browser, 'tct', '/customer');
				b = await g.xoaKhachApi(phu.page, phu.st, id);
			}
			ghiChu('dọn khách', `${id} → ${JSON.stringify(b?.status)}`);
		}
		await phu?.dong();
	});

	test('19_050_001 — Ngừng hoạt động khách hàng', async ({ page }) => {
		chanNeuTat('19_050_001');
		const a = await g.taoKhachApi(page, st, g.khachMoi('050_001'));
		rac.push(a.id);
		await moChiTietId(page, a.id);
		const pop = await bamXacNhan(page, 'Ngừng hoạt động', 'Xác nhận ngừng hoạt động khách hàng này?');
		const cho = page.waitForResponse((r) => /chain-customers?\/update/.test(r.url()), { timeout: 30_000 });
		await pop.getByRole('button', { name: 'Đồng ý' }).click();
		const b = await (await cho).json();
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		expect(await g.thongBao(page)).toContain('Ngừng hoạt động khách hàng thành công');
		const nhan = khung(page).locator('.ant-tag').filter({ hasText: 'Ngừng hoạt động' }).first();
		await expect(nhan, 'Không có nhãn trạng thái "Ngừng hoạt động"').toBeVisible({ timeout: 15_000 });
		const mau = await nhan.evaluate((e) => `${e.className} ${getComputedStyle(e).color}`);
		ghiChu('nhãn', mau);
		const [r, gr] = (mau.match(/rgb\((\d+), (\d+)/) || []).slice(1).map(Number);
		expect(/red|error/.test(mau) || (r > 150 && gr < 100), `Nhãn Ngừng hoạt động không màu đỏ (${mau})`).toBe(true);
		// Hồ sơ vẫn tra cứu được.
		expect((await g.chiTietApi(page, st, a.id))?.data?.businessStatus).toBe('NGUNG_HOAT_DONG');
	});

	test('19_050_002 — Kích hoạt lại khách đã ngừng', async ({ page }) => {
		chanNeuTat('19_050_002');
		const a = await g.taoKhachApi(page, st, g.khachMoi('050_002'));
		rac.push(a.id);
		await moChiTietId(page, a.id);
		let pop = await bamXacNhan(page, 'Ngừng hoạt động', 'Xác nhận ngừng hoạt động khách hàng này?');
		await pop.getByRole('button', { name: 'Đồng ý' }).click();
		await expect(khung(page).getByRole('button', { name: /Kích hoạt lại$/ })).toBeVisible({ timeout: 15_000 });
		pop = await bamXacNhan(page, 'Kích hoạt lại', 'Xác nhận kích hoạt lại khách hàng này?');
		const cho = page.waitForResponse((r) => /chain-customers?\/update/.test(r.url()), { timeout: 30_000 });
		await pop.getByRole('button', { name: 'Đồng ý' }).click();
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		expect(await g.thongBao(page)).toContain('Kích hoạt lại khách hàng thành công');
		await expect(khung(page).getByRole('button', { name: /Ngừng hoạt động$/ })).toBeVisible({ timeout: 15_000 });
		expect((await g.chiTietApi(page, st, a.id))?.data?.businessStatus).toBe('HOAT_DONG');
	});

	test('19_050_004 — Xoá khách hàng không hoàn tác được', async ({ page }) => {
		chanNeuTat('19_050_004');
		const a = await g.taoKhachApi(page, st, g.khachMoi('050_004'));
		rac.push(a.id);
		expect(await g.timApi(page, st, a.ma), 'Đối chứng: API tìm không ra khách vừa tạo').toHaveLength(1);
		await moChiTietId(page, a.id);
		const nutXoa = khung(page).getByRole('button', { name: /X[oó][aá]$/ });
		expect(
			await nutXoa.count(),
			'Vai tỉnh KHÔNG có nút "Xóa" ở chi tiết khách (thiếu quyền delete_customer; API xoá trả SSHOP-401). Nút đang có: ' +
				chuan((await khung(page).locator('button').allInnerTexts()).join(' · ')),
		).toBeGreaterThan(0);
		await nutXoa.first().click();
		const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').last();
		await expect(pop).toBeVisible({ timeout: 10_000 });
		const chu = chuan(await pop.innerText());
		ghiChu('nguyên văn popup', chu);
		expect(chu).toContain('Hành động này sẽ không thể hoàn tác, bạn có chắc chắn muốn xóa?');
		const cho = page.waitForResponse((r) => /chain-customers?\/delete/.test(r.url()), { timeout: 30_000 });
		await pop.getByRole('button', { name: 'Đồng ý' }).click();
		const b = await (await cho).json();
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		rac.pop();
		expect(await g.thongBao(page)).toMatch(/Xo[áa] khách hàng thành công/);
		expect((await g.timApi(page, st, a.ma)).filter((x) => String(x.customerCode) === a.ma), 'Khách đã xoá vẫn còn trong danh sách').toHaveLength(0);
	});

	test('19_010_008 — Truy cập link chi tiết của khách đã bị xoá', async ({ page, browser }) => {
		chanNeuTat('19_010_008');
		const a = await g.taoKhachApi(page, st, g.khachMoi('010_008'));
		const phu = await g.k.moPhienPhu(browser, 'tct', '/customer');
		const x = await g.xoaKhachApi(phu.page, phu.st, a.id);
		await phu.dong();
		expect(String(x?.status?.code), `Không xoá được khách tiền đề: ${JSON.stringify(x?.status)}`).toBe('200');
		// 🔴 `moTrang` coi việc FE tự quay về /customer (khách không tồn tại) là điều hướng hỏng ⇒ goto thẳng
		//    trong context ĐÃ đăng nhập (beforeEach), đúng như người dùng dán link.
		const cho = page.waitForResponse((r) => /chain-customers?\/.*detail/.test(r.url()) && r.status() !== 401, { timeout: 60_000 }).catch(() => null);
		const tbCho = page.locator('.ant-message-notice, .ant-notification-notice').first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => null);
		await page.goto(`/customer/detail/${a.id}`);
		const res = await cho;
		await tbCho;
		ghiChu('API chi tiết', res ? `${res.status()} ${JSON.stringify((await res.json().catch(() => ({})))?.status)}` : '(không gọi)');
		const tb = await g.thongBao(page, { cho: 8_000 });
		ghiChu('nguyên văn', tb || '(không có thông báo)');
		expect(tb).toContain('Khách hàng không tồn tại');
	});
});
