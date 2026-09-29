'use strict';

/**
 * 34 · Quản lý công nợ khách hàng, vai `shop`. 🚫 KHÔNG ghi.
 *
 * 🔴 Nhóm case tìm kiếm/phân trang vốn khai vai `gdv`, nhưng `gdv` nhận **401** ở cả hai API ⇒
 * chuyển sang `shop` (API 200). Lý do ghi trong `test-input.json`; phạm vi của `gdv` ở `34_PQ_001`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan, oTim, soTu, taiLaiBoi, thamSo, theSoLieu } =
	require('./debt-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('34 · Công nợ khách hàng', () => {
	let trangThai;
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		trangThai = await moMan(page, 'shop');
	});

	/** Dừng case khi điểm bán chưa có công nợ nào — 🚫 không kết luận gì từ bảng rỗng. */
	async function canDuLieu(page) {
		const so = await dong(page).count();
		if (so === 0) {
			test.skip(
				true,
				`Điểm bán chưa có dòng công nợ nào (status API: ${trangThai.join(' · ') || 'không gọi'}) ` +
					'⇒ 🚫 không phân biệt được "lọc đúng" với "không có dữ liệu".',
			);
		}
		return so;
	}

	test('34_050_004 — Tìm theo tên khách không có công nợ hoặc không tồn tại', async ({ page }) => {
		chanNeuTat('34_050_004');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý công nợ khách hàng',
		);
		const res = await taiLaiBoi(page, async () => {
			await oTim(page).fill('ZZZ-KHONG-BAO-GIO-CO-999');
			await oTim(page).press('Enter');
		}).catch(() => null);
		if (res) expect(res.status(), 'Tìm tên không tồn tại mà API lỗi').toBeLessThan(500);
		await page.waitForTimeout(2_000);

		expect(await dong(page).count()).toBe(0);
		const rong = khung(page).locator('.ant-empty').first();
		await expect(rong, 'Bảng rỗng mà không có khối trạng thái rỗng').toBeVisible();
		test.info().annotations.push({
			type: 'nguyên văn trạng thái rỗng',
			description: chuan(await rong.innerText()),
		});
	});

	test('34_050_001 — Nhập khoảng trắng vào ô tìm kiếm công nợ', async ({ page }) => {
		chanNeuTat('34_050_001');

		const banDau = await dong(page).count();
		await oTim(page).fill('   ');
		await oTim(page).press('Enter');
		await page.waitForTimeout(3_500);

		test.info().annotations.push({
			type: 'hành vi thật',
			description: `${banDau} dòng → ${await dong(page).count()} dòng khi gõ toàn khoảng trắng`,
		});
		expect(
			await dong(page).count(),
			'Gõ toàn khoảng trắng mà danh sách đổi — đáng lẽ coi như chưa lọc',
		).toBe(banDau);
	});

	test('34_050_011 — Tìm công nợ bằng ký tự đặc biệt', async ({ page }) => {
		const i = chanNeuTat('34_050_011');

		const banDau = await canDuLieu(page);
		const tuKhoa = i?.data?.tuKhoa ?? '%_';
		const res = await taiLaiBoi(page, async () => {
			await oTim(page).fill(tuKhoa);
			await oTim(page).press('Enter');
		}).catch(() => null);
		if (res) expect(res.status(), 'Ký tự đặc biệt làm API lỗi').toBeLessThan(500);
		await page.waitForTimeout(2_000);
		expect(
			await dong(page).count(),
			`Tìm bằng ký tự đại diện SQL "${tuKhoa}" vẫn trả đủ ${banDau} dòng ⇒ wildcard không escape`,
		).toBeLessThan(banDau);
	});

	test('34_050_013 — Tìm công nợ không phân biệt hoa thường', async ({ page }) => {
		chanNeuTat('34_050_013');

		await canDuLieu(page);
		const ten = chuan(await dong(page).first().locator('td').nth(1).innerText()).split(' ')[0];
		if (!ten) test.skip(true, 'Không đọc được tên khách ở dòng đầu.');

		await oTim(page).fill(ten.toLowerCase());
		await oTim(page).press('Enter');
		await page.waitForTimeout(3_000);
		const thuong = await dong(page).count();

		await oTim(page).fill(ten.toUpperCase());
		await oTim(page).press('Enter');
		await page.waitForTimeout(3_000);
		const hoa = await dong(page).count();

		expect(thuong, `Tìm "${ten}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		expect(hoa, `Chữ thường ra ${thuong} dòng, chữ hoa ra ${hoa} dòng`).toBe(thuong);
	});

	test('34_060_002 — Phân trang danh sách công nợ', async ({ page }) => {
		chanNeuTat('34_060_002');

		const so = await canDuLieu(page);
		const trang = khung(page).locator('.ant-pagination-item');
		if ((await trang.count()) < 2) test.skip(true, `Chỉ có ${so} dòng công nợ, chưa đủ 2 trang.`);

		const truoc = chuan(await dong(page).first().innerText());
		const res = await taiLaiBoi(page, () => trang.nth(1).click());
		expect(Number(thamSo(res).page ?? 0), 'Sang trang 2 mà query vẫn page=0').toBeGreaterThan(0);
		expect(chuan(await dong(page).first().innerText()), 'Trang 2 trùng trang 1').not.toBe(truoc);
	});

	test('34_060_004 — Tổng công nợ bằng tổng các dòng chi tiết', async ({ page }) => {
		chanNeuTat('34_060_004');

		const so = await canDuLieu(page);
		const trang = khung(page).locator('.ant-pagination-item');
		if ((await trang.count()) > 1) {
			test.skip(
				true,
				`Danh sách có ${await trang.count()} trang — 🚫 không cộng được toàn bộ dòng chi tiết ` +
					'từ một trang để đối chiếu với thẻ tổng.',
			);
		}

		let tong = 0;
		for (let i = 0; i < so; i += 1) {
			tong += soTu(await dong(page).nth(i).locator('td').nth(6).innerText());
		}
		const the = await theSoLieu(page, 'TỔNG CÒN NỢ');
		if (the === null) test.skip(true, 'Không đọc được thẻ "TỔNG CÒN NỢ" để đối chiếu.');
		test.info().annotations.push({
			type: 'đối chiếu tổng',
			description: `thẻ=${the} · cộng ${so} dòng=${tong}`,
		});
		expect(the, `Thẻ TỔNG CÒN NỢ (${the}) khác tổng ${so} dòng chi tiết (${tong})`).toBe(tong);
	});

	test('34_060_005 — Chọn khoảng thời gian có ngày kết thúc trước ngày bắt đầu', async ({ page }) => {
		chanNeuTat('34_060_005');

		const tu = khung(page).locator('input[placeholder*="u"]').first();
		const den = khung(page).locator('input[placeholder*="c"]').first();
		if ((await tu.count()) === 0 || (await den.count()) === 0) {
			test.skip(true, 'Không thấy đủ cặp ô ngày trên màn.');
		}
		const homNay = new Date();
		const homQua = new Date(homNay.getTime() - 86400_000);
		const dd = (d) =>
			`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

		// 🔴 RangePicker chỉ bắn sự kiện SAU khi chọn đủ hai đầu ngày.
		await tu.click();
		await tu.fill(dd(homNay));
		await page.keyboard.press('Enter');
		await den.fill(dd(homQua));
		await page.keyboard.press('Enter');
		await page.waitForTimeout(3_000);

		const loi = chuan(
			await page.locator('.ant-message, .ant-notification, .ant-form-item-explain-error')
				.first().innerText().catch(() => ''),
		);
		test.info().annotations.push({
			type: 'hành vi thật',
			description: `${loi || '(không có thông báo)'} · ô đến = "${await den.inputValue()}" · ` +
				`${await dong(page).count()} dòng`,
		});
		expect(
			loi !== '' || (await den.inputValue()) !== dd(homQua) || (await dong(page).count()) === 0,
			'Chọn ngày kết thúc TRƯỚC ngày bắt đầu mà hệ thống vẫn trả dữ liệu, không chặn, không báo',
		).toBe(true);
	});
});
