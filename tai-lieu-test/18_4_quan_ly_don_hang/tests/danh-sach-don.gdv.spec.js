'use strict';

/**
 * Phân hệ 18_4 — Quản lý đơn hàng, phần ĐỌC (vai `gdv`).
 *
 * 🔴 Route **`/order/created-orders`**, tiêu đề *Quản lý đơn hàng*. 🚫 KHÔNG phải `/order/list`
 * (đường đó ra trang 404).
 *
 * Màn này ĐỌC được kể cả khi **chưa mở ca** — khác hẳn màn bán hàng (`/order/create-order`) vốn
 * bị chặn bằng modal *"Yêu cầu mở ca trước khi bán hàng"*.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'gdv';
const ROUTE = '/order/created-orders';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const oTim = (page) =>
	khung(page).locator('input[placeholder*="mã đơn hàng"]').first();

const chanNeuTat = (id) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/order|payment|invoice/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

async function moMan(page) {
	await moTrang(page, ROUTE, VAI);
	await page.waitForTimeout(7_000);
	return khung(page);
}

/** Gõ từ khoá rồi chờ bảng vẽ lại. */
async function tim(page, tuKhoa) {
	await oTim(page).fill(tuKhoa);
	await oTim(page).press('Enter');
	await page.waitForTimeout(3_500);
}

test.describe('18_4 — Quản lý đơn hàng', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page);
	});

	test('18_4_010_003 — Hiển thị đủ 7 tab trạng thái đơn', async ({ page }) => {
		chanNeuTat('18_4_010_003');

		const the = (await khung(page).locator('.ant-tabs-tab').allInnerTexts()).map((s) =>
			chuan(s.split('\n')[0]),
		);
		const oLoc = (await khung(page).locator('.ant-select').allInnerTexts()).map((s) =>
			chuan(s.split('\n')[0]),
		);
		test.info().annotations.push({
			type: 'thứ thật trên màn',
			description: `tab: ${the.join(' · ') || '(không có)'} || ô lọc: ${oLoc.join(' · ')}`,
		});

		// 🔴 Đo 20/09/2026: 5 "tab" trên màn là **thẻ số liệu** (Doanh thu · Đơn nháp · Đã thanh
		//    toán · Chênh lệch tổng tiền · Còn nợ), 🚫 không phải 7 tab trạng thái đơn mà kịch bản
		//    khai ("Tất cả", "Đơn đã hoàn thành", "Đơn đã trả", "Đơn còn nợ"…). Lọc trạng thái
		//    thật nằm ở các ô `Select`. Giữ nguyên kỳ vọng để user chốt lại kịch bản.
		expect(
			the.length,
			`Màn có ${the.length} tab: ${the.join(' · ')} — kịch bản khai 7 tab trạng thái đơn. ` +
				`Ô lọc đang có: ${oLoc.join(' · ')}.`,
		).toBe(7);
	});

	test('18_4_010_007 — Tìm kiếm mã đơn không tồn tại', async ({ page }) => {
		chanNeuTat('18_4_010_007');

		await tim(page, 'ZZZ-KHONG-TON-TAI-999');
		expect(await dong(page).count()).toBe(0);

		const rong = khung(page).locator('.ant-empty');
		await expect(rong, 'Không có trạng thái rỗng nào hiện ra').toBeVisible({ timeout: 15_000 });
		// 🔴 Ghi lại NGUYÊN VĂN dòng chữ trạng thái rỗng — kịch bản yêu cầu đúng điều này.
		test.info().annotations.push({
			type: 'nguyên văn trạng thái rỗng',
			description: chuan(await rong.innerText()),
		});
	});

	test('18_4_010_009 — Tìm kiếm bằng ký tự đặc biệt', async ({ page }) => {
		chanNeuTat('18_4_010_009');

		const banDau = await dong(page).count();
		if (banDau === 0) {
			test.skip(
				true,
				'Tài khoản chưa có đơn hàng nào ⇒ 🚫 không phân biệt được "escape đúng" với "không ' +
					'có dữ liệu" — cả hai đều cho 0 dòng.',
			);
		}
		await tim(page, '%_\'"<>');

		const sau = await dong(page).count();
		// 🔴 `%` và `_` là ký tự đại diện của LIKE — không escape thì trả về TOÀN BỘ đơn.
		expect(
			sau,
			`Tìm bằng ký tự đại diện SQL trả ${sau} dòng, bằng đúng số dòng ban đầu (${banDau}) ⇒ ` +
				'ký tự wildcard lọt xuống backend mà không được escape.',
		).not.toBe(banDau);
	});

	test('18_4_010_010 — Tìm kiếm không phân biệt hoa thường', async ({ page }) => {
		chanNeuTat('18_4_010_010');

		if ((await dong(page).count()) === 0) test.skip(true, 'Chưa có đơn hàng nào để lấy từ khoá.');
		const ma = chuan(await dong(page).first().innerText()).split(' ').filter((t) => t.length > 4)[0];
		if (!ma) test.skip(true, 'Không tách được mã đơn từ dòng đầu.');

		await tim(page, ma.toUpperCase());
		const hoa = await dong(page).count();
		await tim(page, ma.toLowerCase());
		const thuong = await dong(page).count();

		expect(
			thuong,
			`Tìm "${ma.toUpperCase()}" ra ${hoa} dòng nhưng "${ma.toLowerCase()}" ra ${thuong} dòng — ` +
				'tìm kiếm đang phân biệt hoa/thường.',
		).toBe(hoa);
	});

	test('18_4_010_008 — Tìm kiếm bằng chuỗi toàn khoảng trắng', async ({ page }) => {
		chanNeuTat('18_4_010_008');

		const banDau = await dong(page).count();
		await tim(page, '     ');
		const sau = await dong(page).count();

		// Kịch bản chấp nhận HAI hành vi (coi như không lọc, hoặc trả rỗng) — ghi lại cái thật.
		test.info().annotations.push({
			type: 'hành vi với chuỗi toàn khoảng trắng',
			description: `trước: ${banDau} dòng · sau: ${sau} dòng`,
		});
		expect(
			sau === banDau || sau === 0,
			`Chuỗi toàn khoảng trắng cho ${sau} dòng (ban đầu ${banDau}) — không thuộc hai hành vi ` +
				'hợp lệ (giữ nguyên danh sách, hoặc trả rỗng).',
		).toBe(true);
	});

	test('18_4_010_014 — Xoá bộ lọc trở về mặc định', async ({ page }) => {
		chanNeuTat('18_4_010_014');

		const banDau = await dong(page).count();
		await tim(page, 'ZZZ-KHONG-TON-TAI-999');
		expect(await dong(page).count()).toBe(0);

		await oTim(page).fill('');
		await oTim(page).press('Enter');
		await page.waitForTimeout(3_500);

		expect(
			await dong(page).count(),
			'Xoá từ khoá mà danh sách không trở về như ban đầu',
		).toBe(banDau);

		// 🔴 Màn 🚫 không có tab trạng thái "Tất cả" (xem `18_4_010_003`) ⇒ phần kỳ vọng "tab về
		//    Tất cả" của kịch bản không áp dụng được. Ghi lại ô lọc để user chốt lại kịch bản.
		test.info().annotations.push({
			type: 'ô lọc sau khi xoá từ khoá',
			description: (await khung(page).locator('.ant-select').allInnerTexts())
				.map((s) => chuan(s.split('\n')[0]))
				.join(' · '),
		});
	});
});
