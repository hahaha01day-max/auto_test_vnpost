'use strict';

/** 24 · Công nợ nhân viên, vai `province`. 🚫 KHÔNG ghi — phân hệ này ghi là đụng vào công nợ thật. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { API, chanGhi, chonDiemBan, chuan, dong, khung, moMan, moThe, oTim, taiLaiBoi, thamSo } =
	require('./debt-page');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Cấp tỉnh phải chọn điểm bán trước, nếu không API danh sách 🚫 không được gọi (đúng nghiệp vụ). */
async function coDuLieu(page) {
	const kq = await chonDiemBan(page);
	if (!kq) return null;
	if (!kq.ten) return { ten: null, lyDo: kq.lyDo, so: 0 };
	return { ten: kq.ten, lyDo: null, so: await dong(page).count() };
}

/** Đọc số tiền từ chuỗi kiểu `1.234.567 đ`. */
const soTien = (s) => Number(chuan(s).replace(/[^\d]/g, '') || 0);

test.describe('24 · Công nợ nhân viên (cấp tỉnh)', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, VAI);
	});

	test('24_010_001 — Màn Công nợ nhân viên mở được ở thẻ Công nợ theo đơn hàng', async ({ page }) => {
		chanNeuTat('24_010_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Công nợ nhân viên',
		);
		const the = (await khung(page).locator('.ant-tabs-tab').allInnerTexts()).map((s) =>
			chuan(s.split('\n')[0]),
		);
		expect(the, `Thẻ đang có: ${the.join(' · ')}`).toEqual([
			'Công nợ theo đơn hàng',
			'Công nợ với cửa hàng',
		]);
		await expect(oTim(page), 'Thiếu ô tìm nhân viên').toBeVisible();
		await expect(
			khung(page).locator('input[placeholder="Ngày bắt đầu"]'),
			'Thiếu ô khoảng ngày',
		).toBeVisible();
		expect(
			await khung(page).locator('.ant-select').filter({ hasText: /điểm bán/i }).count(),
			'Cấp tỉnh phải có ô chọn điểm bán',
		).toBeGreaterThan(0);
	});

	test('24_010_016 — Cấp tỉnh chưa chọn điểm bán', async ({ page }) => {
		chanNeuTat('24_010_016');

		// 🔴 Đây là hoạt động BÌNH THƯỜNG: thiếu shopId thì query bị skip. 🚫 Không kết luận mất dữ liệu.
		const goi = [];
		page.on('request', (r) => {
			if (r.url().includes(API)) goi.push(r.url());
		});
		await page.waitForTimeout(3_000);

		expect(await dong(page).count(), 'Chưa chọn điểm bán mà bảng đã có dòng').toBe(0);
		expect(
			goi,
			`Chưa chọn điểm bán mà vẫn gọi get-debt-summary: ${goi.join(' ; ')}`,
		).toEqual([]);
	});

	test('24_010_004 — Danh sách sắp sẵn theo số tiền giảm dần', async ({ page }) => {
		chanNeuTat('24_010_004');

		const d = await coDuLieu(page);
		if (!d) test.skip(true, 'Màn không có ô chọn điểm bán.');
		if (!d.ten) test.skip(true, d.lyDo);
		if (d.so < 2) test.skip(true, `Điểm bán "${d.ten}" chỉ có ${d.so} dòng công nợ, không đủ để so thứ tự.`);

		const tien = [];
		for (let i = 0; i < d.so; i += 1) {
			tien.push(soTien(await dong(page).nth(i).locator('td').nth(3).innerText()));
		}
		const giam = [...tien].sort((a, b) => b - a);
		expect(tien, `Thứ tự tiền đang là: ${tien.join(' · ')}`).toEqual(giam);
	});

	test('24_010_003 — Tổng công nợ là tổng của toàn bộ danh sách đang lọc', async ({ page }) => {
		chanNeuTat('24_010_003');

		const d = await coDuLieu(page);
		if (!d) test.skip(true, 'Màn không có ô chọn điểm bán.');
		if (!d.ten) test.skip(true, d.lyDo);
		if (d.so === 0) test.skip(true, `Điểm bán "${d.ten}" không có công nợ nào để đối chiếu.`);

		let tongTrang = 0;
		for (let i = 0; i < d.so; i += 1) {
			tongTrang += soTien(await dong(page).nth(i).locator('td').nth(3).innerText());
		}
		const chu = chuan(await khung(page).innerText());
		const m = chu.match(/Tổng (?:công nợ|tiền)[^\d]*([\d.,]+)/i);
		if (!m) {
			test.skip(
				true,
				`Màn không có dòng "Tổng công nợ" để đối chiếu. Chữ trên màn: ${chu.slice(0, 300)}`,
			);
		}
		const tong = soTien(m[1]);
		test.info().annotations.push({
			type: 'đối chiếu tổng',
			description: `tổng trên màn ${tong} · tổng trang đang xem ${tongTrang} (${d.so} dòng)`,
		});
		expect(
			tong,
			`Tổng công nợ (${tong}) nhỏ hơn tổng của riêng trang đang xem (${tongTrang})`,
		).toBeGreaterThanOrEqual(tongTrang);
	});

	test('24_010_005 — Tìm nhân viên bằng tên ở thẻ Công nợ theo đơn hàng', async ({ page }) => {
		chanNeuTat('24_010_005');

		const d = await coDuLieu(page);
		if (!d) test.skip(true, 'Màn không có ô chọn điểm bán.');
		if (!d.ten) test.skip(true, d.lyDo);
		if (d.so === 0) test.skip(true, `Điểm bán "${d.ten}" chưa có dòng công nợ nào.`);

		const ten = chuan(await dong(page).first().locator('td').nth(1).innerText());
		const res = await taiLaiBoi(page, async () => {
			await oTim(page).fill(ten);
		});
		expect(res.status()).toBe(200);
		const so = await dong(page).count();
		expect(so, `Tìm tên "${ten}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			expect(chuan(await dong(page).nth(i).innerText())).toContain(ten);
		}
	});

	test('24_010_007 — Tìm với từ khoá không tồn tại', async ({ page }) => {
		chanNeuTat('24_010_007');

		const d = await coDuLieu(page);
		if (!d) test.skip(true, 'Màn không có ô chọn điểm bán.');
		if (!d.ten) test.skip(true, d.lyDo);

		await taiLaiBoi(page, async () => {
			await oTim(page).fill('ZZZ-KHONG-TON-TAI-999');
		});
		expect(await dong(page).count()).toBe(0);
		await expect(khung(page).locator('.ant-empty').first()).toBeVisible();
	});

	test('24_010_008 — Tìm với ký tự đặc biệt', async ({ page }) => {
		const i = chanNeuTat('24_010_008');

		const d = await coDuLieu(page);
		if (!d) test.skip(true, 'Màn không có ô chọn điểm bán.');
		if (!d.ten) test.skip(true, d.lyDo);
		if (d.so === 0) {
			test.skip(
				true,
				'Điểm bán không có dòng nào ⇒ 🚫 không phân biệt được "escape đúng" với "không có dữ liệu".',
			);
		}

		const tuKhoa = i?.data?.tuKhoa ?? "%_'\"<>";
		const res = await taiLaiBoi(page, async () => {
			await oTim(page).fill(tuKhoa);
		});
		expect(res.status(), 'Ký tự đặc biệt làm API lỗi').toBeLessThan(500);
		expect(
			await dong(page).count(),
			`Tìm bằng ký tự đại diện SQL "${tuKhoa}" vẫn trả đủ ${d.so} dòng ⇒ wildcard không được escape`,
		).toBeLessThan(d.so);
	});

	test('24_010_013 — Ô tìm kiếm chỉ gọi API một lần sau khi ngừng gõ', async ({ page }) => {
		chanNeuTat('24_010_013');

		const d = await coDuLieu(page);
		if (!d) test.skip(true, 'Màn không có ô chọn điểm bán.');
		if (!d.ten) test.skip(true, d.lyDo);

		const goi = [];
		page.on('request', (r) => {
			if (r.url().includes(API)) goi.push(r.url());
		});
		// Gõ từng ký tự để ép debounce làm việc.
		await oTim(page).click();
		await oTim(page).type('nguyen', { delay: 80 });
		await page.waitForTimeout(4_000);

		test.info().annotations.push({
			type: 'số request thật',
			description: `${goi.length} request cho 6 ký tự`,
		});
		expect(
			goi.length,
			`Gõ 6 ký tự sinh ${goi.length} request — debounce 500ms không ăn:\n${goi.join('\n')}`,
		).toBeLessThanOrEqual(2);
	});

	test('24_010_014 — Phân trang danh sách công nợ theo đơn hàng', async ({ page }) => {
		chanNeuTat('24_010_014');

		const d = await coDuLieu(page);
		if (!d) test.skip(true, 'Màn không có ô chọn điểm bán.');
		if (!d.ten) test.skip(true, d.lyDo);
		if (d.so === 0) test.skip(true, `Điểm bán "${d.ten}" chưa có dòng công nợ nào.`);

		const trang = khung(page).locator('.ant-pagination-item');
		if ((await trang.count()) < 2) test.skip(true, `Chỉ có ${d.so} dòng, chưa đủ 2 trang.`);

		const res = await taiLaiBoi(page, () => trang.nth(1).click());
		expect(Number(thamSo(res).page ?? 0), 'Sang trang 2 mà query vẫn page=0').toBeGreaterThan(0);
	});

	test('24_050_001 — Thẻ Công nợ với cửa hàng hiện đủ chỉ tiêu', async ({ page }) => {
		chanNeuTat('24_050_001');

		expect(await moThe(page, 'Công nợ với cửa hàng'), 'Không có thẻ "Công nợ với cửa hàng"').toBe(
			true,
		);
		const d = await coDuLieu(page);
		if (!d) test.skip(true, 'Màn không có ô chọn điểm bán.');
		if (!d.ten) test.skip(true, d.lyDo);

		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		for (const nhan of ['Tổng nợ', 'Đã trả', 'Còn lại']) {
			expect(
				cot.join(' · '),
				`Thẻ Công nợ với cửa hàng thiếu cột "${nhan}". Cột thật: ${cot.join(' · ')}`,
			).toContain(nhan);
		}
	});

	test('24_050_003 — Hai thẻ công nợ là hai loại tiền khác nhau', async ({ page }) => {
		chanNeuTat('24_050_003');

		const cotDon = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		expect(await moThe(page, 'Công nợ với cửa hàng')).toBe(true);
		const cotCua = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);

		test.info().annotations.push({
			type: 'cột hai thẻ',
			description: `đơn hàng: ${cotDon.join(' · ')} || cửa hàng: ${cotCua.join(' · ')}`,
		});
		// 🔴 Hai con số độc lập: một là tiền KHÁCH nợ, một là tiền NHÂN VIÊN nợ cửa hàng.
		expect(
			cotDon.join(' · '),
			'Hai thẻ có cột giống hệt nhau — không phân biệt được hai loại tiền',
		).not.toBe(cotCua.join(' · '));
		expect(cotDon.join(' · '), 'Thẻ theo đơn hàng phải là tiền KHÁCH nợ').toContain(
			'Tổng tiền khách nợ',
		);
	});
});
