'use strict';

/**
 * 18_1 nhóm 010 — tab đơn tạm + khách hàng trên màn bán hàng (vai `gdv`, điểm bán seed của làn).
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): `CreateOrderPage.jsx` (tab antd `editable-card`, nút
 * "Add tab" / "remove", hộp "Xác nhận đóng <tab>?" + "Đóng tab"/"Huỷ", phím F1 mở · F2 đóng · F11
 * focus khách) · ô khách hàng (`/chain-customer/seach-all-in-chain`) + drawer "Thêm khách hàng"
 * (`POST /chain-customer/create`, bắt buộc Tên · Mã · SĐT).
 *
 * 🔴 Chỉ thêm hàng vào giỏ rồi dọn — 🚫 không thanh toán ở file này (thanh toán ở `thanh-toan.gdv`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('./pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, tabs, oKhach, dongBill, sp } = p;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const nav = (page) => page.locator('.ant-tabs-nav').first();
const tabDangMo = (page) => nav(page).locator('.ant-tabs-tab-active');
/** 🔴 Tooltip "Hiển thị top sản phẩm bán chạy" (hover ô tìm) đè lên dãy tab ⇒ rời chuột trước khi bấm. */
const roi = (page) => page.mouse.move(600, 700);
const themTab = async (page) => {
	await roi(page);
	await nav(page).getByRole('button', { name: 'Add tab' }).first().click();
};
const xTab = (page, i) => ({
	click: async () => {
		await roi(page);
		await nav(page).locator('.ant-tabs-tab').nth(i).getByRole('button', { name: 'remove' }).click();
	},
});
const veTab = async (page, i) => {
	await roi(page);
	await tabs(page).nth(i).click();
};
const hopDong = (page) => page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận đóng' });
const tenBill = async (page) => (await dongBill(page).allInnerTexts()).map(chuan);

test.describe('18_1 — Tab đơn & khách hàng', () => {
	test.describe.configure({ timeout: 180_000 });
	let st;

	test.beforeEach(async ({ page }) => {
		st = await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await p.donTab(page).catch(() => null);
	});

	test('18_1_010_001 — Từ danh sách đơn hàng mở màn Bán hàng', async ({ page }) => {
		chanNeuTat('18_1_010_001');
		await p.moTrang(page, `${process.env.VNPOST_BASE_URL}/order/created-orders`, p.VAI).catch(() => null);
		const nut = page.getByRole('button', { name: 'Bán hàng' }).first();
		await expect(nut).toBeVisible({ timeout: 30_000 });
		await nut.click();
		await expect(page).toHaveURL(/\/order\/create-order/);
		await expect(p.oTim(page)).toBeVisible({ timeout: 30_000 });
		await expect(tabs(page).first()).toHaveText('Đơn hàng: 1');
		await expect(page.getByText('Chưa thêm sản phẩm / dịch vụ nào')).toBeVisible();
	});

	test('18_1_010_002 — Màn Bán hàng có đủ control chính', async ({ page }) => {
		chanNeuTat('18_1_010_002');
		await expect(p.oTim(page)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Sản phẩm bán chạy' })).toBeVisible();
		await expect(page.getByRole('columnheader', { name: 'Tên' })).toBeVisible();
		await expect(oKhach(page)).toBeVisible();
		for (const n of ['Tổng tiền', 'VAT', 'Cần thanh toán']) {
			await expect(page.getByText(new RegExp(`^${n}`)).first(), `Thiếu dòng tiền "${n}"`).toBeVisible();
		}
		await expect(page.getByRole('button', { name: 'Thanh toán sau' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Thanh toán', exact: true })).toBeVisible();
	});

	test('18_1_010_004 — Thêm tab đơn mới', async ({ page }) => {
		chanNeuTat('18_1_010_004');
		await p.them(page, sp().tc);
		await themTab(page);
		await expect(tabs(page)).toHaveCount(2);
		await expect(tabDangMo(page)).toContainText('Đơn hàng: 2');
		await expect(dongBill(page)).toHaveCount(0);
		await veTab(page, 0);
		await expect(dongBill(page).filter({ hasText: sp().tc })).toHaveCount(1);
	});

	test('18_1_010_005 — Phím F1 mở tab đơn mới', async ({ page }) => {
		chanNeuTat('18_1_010_005');
		await page.locator('body').click({ position: { x: 700, y: 600 } });
		await page.keyboard.press('F1');
		await expect(tabs(page)).toHaveCount(2);
		await expect(tabDangMo(page)).toContainText('Đơn hàng: 2');
	});

	test('18_1_010_006 — Đóng tab đơn khi chỉ có duy nhất 1 tab', async ({ page }) => {
		chanNeuTat('18_1_010_006');
		await xTab(page, 0).click();
		await expect(hopDong(page)).toHaveCount(0);
		await expect(tabs(page), 'Đóng tab duy nhất để lại màn trống').toHaveCount(1);
		await expect(p.oTim(page)).toBeVisible();
		// Tab có hàng: phải hỏi xác nhận.
		await p.them(page, sp().tc);
		await xTab(page, 0).click();
		await expect(hopDong(page)).toBeVisible();
		await hopDong(page).getByRole('button', { name: 'Huỷ' }).click();
	});

	test('18_1_010_007 — Đóng 1 tab khi đang có nhiều hơn 1 tab', async ({ page }) => {
		chanNeuTat('18_1_010_007');
		await p.them(page, sp().tc);
		await themTab(page);
		await xTab(page, 1).click();
		await expect(tabs(page)).toHaveCount(1);
		await expect(dongBill(page).filter({ hasText: sp().tc })).toHaveCount(1);
	});

	test('18_1_010_008 — Phím F2 đóng tab đang mở', async ({ page }) => {
		chanNeuTat('18_1_010_008');
		await themTab(page);
		await expect(tabs(page)).toHaveCount(2);
		await page.locator('body').click({ position: { x: 700, y: 600 } });
		await page.keyboard.press('F2');
		await expect(tabs(page)).toHaveCount(1);
	});

	test('18_1_010_009 — Đóng tab ĐANG CÓ HÀNG thì hỏi xác nhận và mất sạch giỏ', async ({ page }) => {
		chanNeuTat('18_1_010_009');
		await themTab(page);
		await p.them(page, sp().tc);
		await xTab(page, 1).click();
		await expect(hopDong(page)).toBeVisible();
		expect(chuan(await hopDong(page).innerText())).toContain(
			'Đơn hàng đang có sản phẩm, dữ liệu sẽ không được lưu lại. Bạn có chắc chắn muốn đóng?',
		);
		await hopDong(page).getByRole('button', { name: 'Đóng tab' }).click();
		await expect(tabs(page)).toHaveCount(1);
		await expect(dongBill(page)).toHaveCount(0);
	});

	test('18_1_010_010 — Chuyển qua lại giữa các tab không lẫn dữ liệu', async ({ page }) => {
		chanNeuTat('18_1_010_010');
		await p.them(page, sp().tc);
		await themTab(page);
		await p.them(page, sp().fifo);
		await veTab(page, 0);
		expect((await tenBill(page)).join(' ')).toContain(sp().tc);
		expect((await tenBill(page)).join(' ')).not.toContain(sp().fifo);
		await veTab(page, 1);
		expect((await tenBill(page)).join(' ')).toContain(sp().fifo);
		expect((await tenBill(page)).join(' ')).not.toContain(sp().tc);
	});

	test('18_1_010_011 — Chọn khách hàng khác nhau cho từng tab', async ({ page }) => {
		chanNeuTat('18_1_010_011');
		const a = await p.taoKhach(page, st);
		const b = await p.taoKhach(page, st);
		await p.chonKhach(page, a.customerName);
		await themTab(page);
		await p.chonKhach(page, b.customerName);
		await expect(tabs(page).first()).toHaveText(`Đơn hàng: ${a.customerName}`);
		await expect(tabs(page).nth(1)).toHaveText(`Đơn hàng: ${b.customerName}`);
		await veTab(page, 0);
		await expect(oKhach(page)).toContainText(a.customerName);
		await veTab(page, 1);
		await expect(oKhach(page)).toContainText(b.customerName);
	});

	test('18_1_010_014 — Quay lại xử lý đơn đang treo', async ({ page }) => {
		chanNeuTat('18_1_010_014');
		const a = await p.taoKhach(page, st);
		await p.chonKhach(page, a.customerName);
		await p.them(page, sp().tc);
		await p.them(page, sp().fifo);
		const truoc = { bill: await tenBill(page), tien: await p.tongKet(page) };
		await themTab(page);
		await veTab(page, 0);
		expect(await tenBill(page)).toEqual(truoc.bill);
		expect(await p.tongKet(page)).toEqual(truoc.tien);
		await expect(oKhach(page)).toContainText(a.customerName);
	});

	test('18_1_010_015 — Tải lại trang F5 khi đang có tab treo', async ({ page }) => {
		chanNeuTat('18_1_010_015');
		await p.them(page, sp().tc);
		await themTab(page);
		await p.them(page, sp().fifo);
		await page.reload();
		await expect(p.oTim(page)).toBeVisible({ timeout: 60_000 });
		await expect(tabs(page), '🔴 F5 làm mất tab treo').toHaveCount(2);
		await veTab(page, 0);
		expect((await tenBill(page)).join(' ')).toContain(sp().tc);
		await veTab(page, 1);
		expect((await tenBill(page)).join(' ')).toContain(sp().fifo);
	});

	test('18_1_010_016 — Mở đồng thời nhiều tab treo cho CÙNG một khách hàng', async ({ page }) => {
		chanNeuTat('18_1_010_016');
		const a = await p.taoKhach(page, st);
		await p.chonKhach(page, a.customerName);
		await p.them(page, sp().tc);
		await themTab(page);
		await p.chonKhach(page, a.customerName);
		await p.them(page, sp().fifo);
		await expect(tabs(page)).toHaveCount(2);
		await expect(tabs(page).nth(0)).toHaveText(`Đơn hàng: ${a.customerName}`);
		await expect(tabs(page).nth(1)).toHaveText(`Đơn hàng: ${a.customerName}`);
		await veTab(page, 0);
		expect((await tenBill(page)).join(' ')).not.toContain(sp().fifo);
	});

	test('18_1_010_017 — Chọn khách hàng đã có trong danh sách', async ({ page }) => {
		chanNeuTat('18_1_010_017');
		const a = await p.taoKhach(page, st);
		await page.locator('body').click({ position: { x: 700, y: 600 } });
		await page.keyboard.press('F11');
		await page.keyboard.type(a.customerName);
		const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
		await dd.locator('.ant-select-item-option').filter({ hasText: a.customerName }).first().click();
		await page.keyboard.press('Escape');
		await roi(page);
		const cot = chuan(await page.getByText('Ghi chú đơn hàng', { exact: true }).locator('xpath=ancestor::*[.//*[@aria-label="plus"]][1]').innerText());
		const khoi = cot.split('Ghi chú đơn hàng')[0];
		expect(khoi).toContain(a.customerName);
		expect(khoi, 'Khối khách không hiện số điện thoại').toContain(String(a.customerPhone).slice(-8));
		expect(khoi, 'Khối khách không hiện hạng khách').toMatch(/[Hh]ạng/);
	});

	test('18_1_010_018 — Tìm kiếm khách hàng đã có trong danh sách', async ({ page }) => {
		chanNeuTat('18_1_010_018');
		const a = await p.taoKhach(page, st);
		const cho = page.waitForResponse((r) => r.url().includes('/chain-customer/seach-all-in-chain') && r.url().includes('keyword='));
		await oKhach(page).click();
		await page.keyboard.type(a.customerCode);
		await cho;
		const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
		await expect(dd.locator('.ant-select-item-option').filter({ hasText: a.customerName })).toHaveCount(1, { timeout: 15_000 });
	});

	test('18_1_010_019 — Tìm kiếm khách hàng chưa có trong danh sách', async ({ page }) => {
		chanNeuTat('18_1_010_019');
		await oKhach(page).click();
		await page.keyboard.type('0999000111');
		const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
		await expect(dd).toContainText('Không tìm thấy khách hàng phù hợp', { timeout: 15_000 });
		test.info().annotations.push({ type: 'thông báo thật', description: chuan(await dd.innerText()) });
		await expect(page.getByRole('button', { name: 'plus', exact: true }).first(), 'Không có lối thêm khách mới').toBeVisible();
	});

	test('18_1_010_020 — Thêm khách hàng mới ngay từ màn bán hàng', async ({ page }) => {
		chanNeuTat('18_1_010_020');
		await page.getByRole('button', { name: 'plus', exact: true }).first().click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm khách hàng' }).last();
		await expect(dr).toBeVisible();
		const ma = `A${process.env.VNPOST_LANE || 0}KH${Date.now().toString(36).slice(-5).toUpperCase()}`;
		await dr.getByLabel('Tên khách hàng').fill(`${ma} Khach test`);
		await dr.getByLabel('Mã khách hàng').fill(ma);
		await dr.locator('#customerPhone').fill(`09${String(Date.now()).slice(-8)}`);
		const cho = page.waitForResponse((r) => r.url().includes('/chain-customer/create'));
		await dr.getByRole('button', { name: 'Lưu' }).click();
		const tb = page.locator('.ant-message-notice').first().waitFor({ timeout: 8_000 }).then(() => page.locator('.ant-message-notice').allInnerTexts(), () => []);
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		expect(chuan((await tb).join(' | '))).toContain('Thêm khách hàng thành công');
		await expect(oKhach(page)).toContainText(`${ma} Khach test`);
	});

	test('18_1_010_021 — Phím F11 đưa con trỏ vào ô tìm khách hàng', async ({ page }) => {
		chanNeuTat('18_1_010_021');
		await page.locator('body').click({ position: { x: 700, y: 600 } });
		await page.keyboard.press('F11');
		const focus = await page.evaluate(() => document.activeElement?.closest('.ant-select')?.innerText || '');
		expect(chuan(focus)).toContain('Tìm kiếm khách hàng');
	});

	test('18_1_010_022 — Đóng tab đơn RỖNG không hỏi xác nhận', async ({ page }) => {
		chanNeuTat('18_1_010_022');
		await themTab(page);
		await xTab(page, 1).click();
		await expect(hopDong(page)).toHaveCount(0);
		await expect(tabs(page)).toHaveCount(1);
	});

	test('18_1_010_023 — Từ chối hộp xác nhận đóng tab thì giữ nguyên giỏ', async ({ page }) => {
		chanNeuTat('18_1_010_023');
		await p.them(page, sp().tc);
		await p.them(page, sp().fifo);
		await xTab(page, 0).click();
		await hopDong(page).getByRole('button', { name: 'Huỷ' }).click();
		await expect(hopDong(page)).toBeHidden();
		await expect(dongBill(page)).toHaveCount(2);
	});
});
