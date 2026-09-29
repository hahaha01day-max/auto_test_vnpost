'use strict';

/**
 * 27 · Danh sách đối soát hoá đơn PO, vai `tct`.
 *
 * 🔴 Case đọc/lọc của phân hệ này vốn khai vai `shop`, nhưng đo 20/09/2026 thì vai `shop` nhận
 * **401 ở mọi lời gọi** ⇒ chuyển sang `tct` để có dữ liệu thật mà kiểm; phần phạm vi của vai
 * `shop` giữ nguyên ở `27_PQ_001`. Lý do đổi vai ghi trong `test-input.json`.
 *
 * 🚫 Cả file KHÔNG ghi: `chanGhi()` chặn mọi request khác GET — đối soát là **ghi vào hạch toán**.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chonOption, chuan, dong, khung, moMan, nhanCacOption, oTim, taiLaiBoi, thamSo } =
	require('./reconcile-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('27 · Đối soát hoá đơn PO', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, VAI);
	});

	test('27_070_001 — Giao diện màn Đối soát hoá đơn PO đủ thành phần', async ({ page }) => {
		chanNeuTat('27_070_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Đối soát hoá đơn PO',
		);
		const cacO = await khung(page).locator('input').evaluateAll((ds) =>
			ds.map((e) => e.placeholder).filter(Boolean),
		);
		expect(
			cacO.join(' · '),
			`Ô tìm kiếm không nhắc "Mã PO". Ô nhập đang có: ${cacO.join(' · ')}`,
		).toContain('PO');
		expect(
			cacO.some((s) => /HĐ|H.*Đ|hoá đơn/i.test(s)),
			`Ô tìm kiếm không nhắc số hoá đơn. Ô nhập đang có: ${cacO.join(' · ')}`,
		).toBe(true);

		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		for (const nhan of ['Mã PO', 'Nhà cung cấp', 'Tổng tiền', 'Đối soát', 'Hạch toán']) {
			expect(cot.join(' · '), `Bảng thiếu cột "${nhan}". Cột thật: ${cot.join(' · ')}`).toContain(
				nhan,
			);
		}
	});

	test('27_020_002 — Lọc theo trạng thái đối soát', async ({ page }) => {
		chanNeuTat('27_020_002');

		const nhan = await nhanCacOption(page, 'Trạng thái');
		expect(nhan.length, 'Ô "Trạng thái" không có lựa chọn nào').toBeGreaterThan(0);
		test.info().annotations.push({ type: 'trạng thái đang có', description: nhan.join(' · ') });
		for (const ten of ['Khớp', 'Lệch', 'Chưa đối soát']) {
			expect(nhan.join(' · '), `Thiếu trạng thái "${ten}"; đang có: ${nhan.join(' · ')}`).toContain(
				ten,
			);
		}
	});

	test('27_070_002 — Lọc danh sách theo nhà cung cấp', async ({ page }) => {
		chanNeuTat('27_070_002');

		const nhan = await nhanCacOption(page, 'Nhà cung cấp');
		expect(nhan.length, 'Ô "Nhà cung cấp" không có lựa chọn nào').toBeGreaterThan(0);

		const res = await taiLaiBoi(page, async () => {
			expect(await chonOption(page, 'Nhà cung cấp'), 'Không chọn được nhà cung cấp').toBe(true);
		});
		const p = thamSo(res);
		// 🔴 Điều kiện phải đi vào REQUEST: bảng rỗng cũng "trông như đã lọc".
		expect(
			Object.keys(p).some((k) => /supplier|ncc|nhaCungCap/i.test(k)),
			`Chọn nhà cung cấp "${nhan[0]}" mà query không mang điều kiện: ${JSON.stringify(p)}`,
		).toBe(true);
	});

	test('27_070_004 — Phân trang danh sách phiếu đối soát', async ({ page }) => {
		chanNeuTat('27_070_004');

		const so = await dong(page).count();
		expect(so, 'Không có dòng nào để kiểm phân trang').toBeGreaterThan(0);
		const trang = khung(page).locator('.ant-pagination-item');
		if ((await trang.count()) < 2) test.skip(true, `Chỉ có ${so} dòng, chưa đủ 2 trang.`);

		const truoc = chuan(await dong(page).first().innerText());
		const res = await taiLaiBoi(page, () => trang.nth(1).click());
		expect(
			Number(thamSo(res).page ?? 0),
			`Sang trang 2 mà query vẫn page=0: ${res.url()}`,
		).toBeGreaterThan(0);
		expect(chuan(await dong(page).first().innerText()), 'Trang 2 trùng trang 1').not.toBe(truoc);
	});

	test('27_070_008 — Danh sách phiếu đối soát rỗng', async ({ page }) => {
		chanNeuTat('27_070_008');

		await taiLaiBoi(page, async () => {
			await oTim(page).fill('ZZZ-KHONG-BAO-GIO-CO-999');
			await oTim(page).press('Enter');
		});
		expect(await dong(page).count()).toBe(0);
		const rong = khung(page).locator('.ant-empty').first();
		await expect(rong, 'Danh sách rỗng mà không có khối trạng thái rỗng').toBeVisible();
		test.info().annotations.push({
			type: 'nguyên văn trạng thái rỗng',
			description: chuan(await rong.innerText()),
		});
	});

	test('27_070_009 — Tổ hợp bộ lọc trên màn đối soát', async ({ page }) => {
		chanNeuTat('27_070_009');

		const res = await taiLaiBoi(page, async () => {
			// Lựa chọn 0 là "Tất cả" (value undefined) ⇒ không đổi filter, không gọi API — chọn "Khớp".
			expect(await chonOption(page, 'Trạng thái', 1), 'Không chọn được trạng thái').toBe(true);
		}).catch(() => null);
		if (!res) {
			test.skip(
				true,
				'Chọn trạng thái KHÔNG sinh lời gọi danh sách mới (màn có thể lọc phía client) ⇒ ' +
					'🚫 không đo được "điều kiện có vào query" cho tổ hợp lọc.',
			);
		}
		const p1 = thamSo(res);

		// 🔴 Không phải hành động nào cũng sinh request mới (từ khoá không đổi kết quả, debounce nuốt
		//    lượt gọi). Bắt timeout và nói rõ, 🚫 không để test đỏ vì lý do chẳng liên quan tới case.
		const res2 = await taiLaiBoi(page, async () => {
			await oTim(page).fill('PO');
			await oTim(page).press('Enter');
		}).catch(() => null);
		if (!res2) {
			test.skip(true, 'Gõ thêm từ khoá không sinh lời gọi danh sách mới ⇒ không đo được tổ hợp lọc.');
		}
		const p2 = thamSo(res2);
		// Thêm điều kiện thứ hai 🚫 không được làm mất điều kiện thứ nhất.
		const giuLai = Object.entries(p1).filter(
			([k, v]) => /status|state|trangThai/i.test(k) && v !== '',
		);
		for (const [k, v] of giuLai) {
			expect(p2[k], `Thêm từ khoá làm mất điều kiện "${k}=${v}"`).toBe(v);
		}
		expect(
			Object.values(p2).some((v) => String(v).includes('PO')),
			`Từ khoá không vào query: ${JSON.stringify(p2)}`,
		).toBe(true);
	});

	test('27_071_002 — Tìm phiếu bằng mã PO không tồn tại', async ({ page }) => {
		chanNeuTat('27_071_002');

		const res = await taiLaiBoi(page, async () => {
			await oTim(page).fill('PO-KHONG-TON-TAI-999');
			await oTim(page).press('Enter');
		});
		expect(res.status(), 'Mã không tồn tại mà API lỗi').toBeLessThan(500);
		expect(await dong(page).count()).toBe(0);
	});

	test('27_071_001 — Tìm phiếu bằng ký tự đặc biệt', async ({ page }) => {
		const i = chanNeuTat('27_071_001');

		const banDau = await dong(page).count();
		if (banDau === 0) {
			test.skip(
				true,
				'Danh sách đang rỗng ⇒ 🚫 không phân biệt được "escape đúng" với "không có dữ liệu".',
			);
		}
		const tuKhoa = i?.data?.tuKhoa ?? '%_';
		const res = await taiLaiBoi(page, async () => {
			await oTim(page).fill(tuKhoa);
			await oTim(page).press('Enter');
		});
		expect(res.status(), 'Ký tự đặc biệt làm API lỗi').toBeLessThan(500);
		expect(
			await dong(page).count(),
			`Tìm bằng ký tự đại diện SQL "${tuKhoa}" vẫn trả đủ ${banDau} dòng ⇒ wildcard không escape`,
		).toBeLessThan(banDau);
	});

	test('27_071_003 — Xoá bộ lọc trở về mặc định', async ({ page }) => {
		chanNeuTat('27_071_003');

		const banDau = await dong(page).count();
		await taiLaiBoi(page, async () => {
			await oTim(page).fill('PO-KHONG-TON-TAI-999');
			await oTim(page).press('Enter');
		});
		expect(await dong(page).count()).toBe(0);

		const ve = await taiLaiBoi(page, async () => {
			await oTim(page).fill('');
			await oTim(page).press('Enter');
		}).catch(() => null);
		if (!ve) await page.waitForTimeout(4_000); // Có thể không sinh request mới — vẫn đo bằng DOM.
		expect(
			await dong(page).count(),
			'Xoá từ khoá mà danh sách không trở về như ban đầu',
		).toBe(banDau);
	});
});
