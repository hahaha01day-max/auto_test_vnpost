'use strict';

/** 19 · Danh sách khách hàng, vai `gdv` (cấp điểm bán). 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan, oTim, taiLaiBoi, thamSo, tim, tongSo } =
	require('./customer-page');

const GOC = path.join(__dirname, '..');
const VAI = 'gdv';
const BON_O_LOC = ['Trạng thái', 'Loại khách hàng', 'Nhóm khách hàng', 'Chi nhánh'];
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('19 · Danh sách khách hàng (điểm bán)', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, VAI);
	});

	test('19_010_002 — Bốn ô lọc chỉ hiện với cấp trên điểm bán', async ({ page }) => {
		chanNeuTat('19_010_002');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý khách hàng',
		);
		await expect(oTim(page), 'Không thấy ô tìm kiếm').toBeVisible();

		const chu = chuan(await khung(page).innerText());
		for (const nhan of BON_O_LOC) {
			expect(chu, `Vai điểm bán KHÔNG được thấy ô lọc "${nhan}"`).not.toContain(nhan);
		}
	});

	test('19_PQ_001 — Giao dịch viên chỉ thấy khách trong phạm vi điểm bán', async ({ page }) => {
		chanNeuTat('19_PQ_001');

		const res = await taiLaiBoi(page, () => page.reload());
		const p = thamSo(res);
		const tong = await tongSo(page);
		test.info().annotations.push({
			type: 'phạm vi thật của gdv',
			description: `${tong} khách · ${res.url().replace(/^https?:\/\/[^/]+/, '')}`,
		});

		// 🔴 Điều kiện phạm vi phải nằm trong REQUEST. Bảng "trông đúng" 🚫 không chứng minh được gì:
		//    danh sách có thể đang là toàn chuỗi mà người xem không nhận ra.
		expect(
			p.shopId,
			`Request danh sách của vai điểm bán KHÔNG mang shopId: ${JSON.stringify(p)}`,
		).toBeTruthy();
		// 🔴 Đo 20/09/2026: endpoint tên là `get-all-in-chain-and-shop` và trả **10.236 khách** cho
		//    một điểm bán, trong khi vai tỉnh (`get-all-by-chain`) trả 0. Con số này 🚫 KHÔNG chứng
		//    minh phạm vi đúng — ghi lại để user đối chiếu với dữ liệu thật của điểm bán.
		expect(res.url(), 'Endpoint danh sách của điểm bán').toContain('in-chain-and-shop');
	});

	test('19_010_005 — Danh sách khách hàng khi chưa có khách nào', async ({ page }) => {
		chanNeuTat('19_010_005');

		await tim(page, 'ZZZ-KHONG-BAO-GIO-CO-999');
		expect(await dong(page).count()).toBe(0);
		const rong = khung(page).locator('.ant-empty').first();
		await expect(rong, 'Bảng rỗng mà không có khối trạng thái rỗng').toBeVisible();
		test.info().annotations.push({
			type: 'nguyên văn trạng thái rỗng',
			description: chuan(await rong.innerText()),
		});
	});

	test('19_010_007 — Bấm tên khách trong danh sách mở màn chi tiết', async ({ page }) => {
		chanNeuTat('19_010_007');

		if ((await dong(page).count()) === 0) test.skip(true, 'Không có khách nào để bấm.');
		const ten = chuan(await dong(page).first().locator('td').nth(2).innerText());
		// 🔴 Tên khách là <a href="/customer/detail/:id"> NẰM TRONG ô — bấm vào ô (td) 🚫 không điều hướng.
		await dong(page).first().locator('td').nth(2).locator('a').click();
		await page.waitForTimeout(3_000);

		expect(
			page.url(),
			`Bấm tên khách "${ten}" mà URL không về màn chi tiết: ${page.url()}`,
		).toMatch(/\/customer\/detail\/\d+/);
	});

	test('19_120_001 — Phân trang danh sách khách hàng', async ({ page }) => {
		chanNeuTat('19_120_001');

		const so = await dong(page).count();
		expect(so, 'Không có dòng nào để kiểm phân trang').toBeGreaterThan(0);
		const trang1 = chuan(await dong(page).first().innerText());

		const nutTrang = khung(page).locator('.ant-pagination-item');
		if ((await nutTrang.count()) < 2) test.skip(true, `Chỉ có ${so} khách, chưa đủ 2 trang.`);

		const res2 = await taiLaiBoi(page, () => nutTrang.nth(1).click());
		const p2 = thamSo(res2);
		expect(
			Number(p2.page ?? p2.pageNum ?? 0),
			`Sang trang 2 mà query không đổi trang: ${JSON.stringify(p2)}`,
		).toBeGreaterThan(0);
		expect(
			chuan(await dong(page).first().innerText()),
			'Dữ liệu trang 2 trùng y hệt trang 1',
		).not.toBe(trang1);
	});

	test('19_120_002 — Tìm khách bằng ký tự đặc biệt', async ({ page }) => {
		const i = chanNeuTat('19_120_002');

		const banDau = await tongSo(page);
		expect(banDau, 'Không đọc được tổng số khách ban đầu').toBeGreaterThan(0);

		const tuKhoa = i?.data?.tuKhoa ?? '%_';
		const res = await tim(page, tuKhoa);
		expect(res.status(), 'Tìm bằng ký tự đặc biệt mà API lỗi').toBeLessThan(500);
		expect(
			await tongSo(page),
			`Tìm bằng ký tự đại diện SQL "${tuKhoa}" trả về đúng tổng ban đầu (${banDau}) ⇒ wildcard ` +
				'lọt xuống backend mà không được escape.',
		).toBeLessThan(banDau);
	});

	test('19_120_003 — Tìm khách không dấu ra khách có dấu', async ({ page }) => {
		chanNeuTat('19_120_003');

		const ten = chuan(await dong(page).first().locator('td').nth(2).innerText());
		const khongDau = ten.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd');
		if (khongDau === ten) {
			test.skip(true, `Khách ở dòng đầu ("${ten}") vốn đã không dấu ⇒ không kiểm được.`);
		}

		await tim(page, khongDau);
		const thay = chuan(await khung(page).innerText()).includes(ten);
		test.info().annotations.push({
			type: 'hành vi thật',
			description: `gõ "${khongDau}" ${thay ? 'CÓ' : 'KHÔNG'} tìm ra "${ten}"`,
		});
		expect(
			thay,
			`Gõ tên không dấu "${khongDau}" 🚫 KHÔNG tìm ra khách "${ten}" — người dùng gõ nhanh ` +
				'không dấu sẽ tưởng khách chưa có rồi tạo trùng.',
		).toBe(true);
	});

	test('19_120_004 — Tìm khách bằng chuỗi toàn khoảng trắng', async ({ page }) => {
		const i = chanNeuTat('19_120_004');

		const banDau = await tongSo(page);
		const res = await taiLaiBoi(page, async () => {
			await oTim(page).fill(i?.data?.tuKhoa ?? '   ');
		}).catch(() => null);

		expect(
			res === null || res.status() < 500,
			'Gõ toàn khoảng trắng mà API lỗi 5xx',
		).toBe(true);
		test.info().annotations.push({
			type: 'hành vi thật',
			description: res
				? `có gọi lại API, tổng ${await tongSo(page)} (ban đầu ${banDau})`
				: 'không gọi lại API — coi như không lọc',
		});
	});
});
