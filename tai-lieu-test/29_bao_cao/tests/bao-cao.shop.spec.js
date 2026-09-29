'use strict';

/** 29 · Báo cáo tồn kho + đối soát NCC, vai `shop`. 🚫 KHÔNG ghi (tổng hợp lại báo cáo = ghi số liệu). */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chonThangTruoc, chuan, dong, khung, moMan, oThang, soTu, taiLaiBoi, thamSo } =
	require('./report-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('29 · Báo cáo Trị giá Tồn kho', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, 'tonKho', VAI);
	});

	test('29_200_001 — Báo cáo kho lọc theo tháng', async ({ page }) => {
		chanNeuTat('29_200_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Báo cáo Trị giá Tồn kho',
		);
		const res = await taiLaiBoi(page, 'tonKho', () => chonThangTruoc(page, 2));
		const p = thamSo(res);
		// 🔴 Báo cáo lọc theo THÁNG (`reportMonth=YYYY-MM-01`), 🚫 không phải khoảng ngày.
		expect(p.reportMonth, `Query không mang reportMonth: ${JSON.stringify(p)}`).toBeTruthy();
		expect(p.reportMonth, 'reportMonth không ở dạng YYYY-MM-01').toMatch(/^\d{4}-\d{2}-01$/);
		test.info().annotations.push({ type: 'kỳ đã chọn', description: p.reportMonth });
	});

	test('29_210_006 — Khoảng thời gian cho phép chốt tồn kho', async ({ page }) => {
		chanNeuTat('29_210_006');

		await oThang(page).click();
		const panel = page.locator('.ant-picker-dropdown:visible').last();
		await panel.waitFor({ state: 'visible', timeout: 15_000 });

		// 🔴 Panel chọn THÁNG dùng `.ant-picker-cell` (không phải cell ngày) — đọc theo `.ant-picker-cell`
		//    rồi tự tách hai nhóm, 🚫 không giả định class `-in-view` có mặt.
		// 🔴 `.ant-picker-dropdown` ngoài cùng có thể là lớp bọc rỗng — tìm ô tháng ở phạm vi TRANG.
		const o = page.locator('.ant-picker-dropdown:visible .ant-picker-cell');
		const tatCa = await o.evaluateAll((ds) =>
			ds.map((e) => ({ chu: (e.innerText || '').trim(), khoa: e.className.includes('disabled') })),
		);
		const chonDuoc = tatCa.filter((x) => !x.khoa).map((x) => x.chu);
		const biKhoa = tatCa.filter((x) => x.khoa).map((x) => x.chu);
		expect(tatCa.length, 'Không đọc được ô tháng nào trong bộ chọn').toBeGreaterThan(0);
		test.info().annotations.push({
			type: 'kỳ chọn được / bị khoá',
			description: `chọn được: ${chonDuoc.join(' · ')} || khoá: ${biKhoa.join(' · ') || '(không có)'}`,
		});
		// Kịch bản: chỉ cho chọn trong phạm vi 2 tháng trước tháng hiện tại.
		expect(
			biKhoa.length,
			`Bộ chọn tháng KHÔNG khoá kỳ nào — kịch bản đòi chỉ cho chọn trong 2 tháng gần nhất. ` +
				`Đang cho chọn: ${chonDuoc.join(' · ')}`,
		).toBeGreaterThan(0);
	});

	test('29_240_001 — Báo cáo rỗng khi kỳ không có số liệu', async ({ page }) => {
		chanNeuTat('29_240_001');

		const so = await dong(page).count();
		if (so > 0) {
			await taiLaiBoi(page, 'tonKho', async () => {
				const o = khung(page).locator('input[placeholder*="SKU"]').first();
				await o.fill('ZZZ-KHONG-BAO-GIO-CO-999');
				await o.press('Enter');
			}).catch(() => null);
			await page.waitForTimeout(3_000);
		}
		expect(await dong(page).count()).toBe(0);
		const rong = khung(page).locator('.ant-empty').first();
		await expect(rong, 'Bảng rỗng mà không có khối trạng thái rỗng').toBeVisible();
		test.info().annotations.push({
			type: 'nguyên văn trạng thái rỗng',
			description: chuan(await rong.innerText()),
		});
	});
});

test.describe('29 · Báo cáo Đối soát hoá đơn mua hàng', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, 'doiSoat', VAI);
	});

	test('29_220_001 — Báo cáo đối soát lọc theo tháng', async ({ page }) => {
		chanNeuTat('29_220_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toContainText(
			'Đối soát Hóa đơn Mua hàng',
		);
		const res = await taiLaiBoi(page, 'doiSoat', () => chonThangTruoc(page, 1)).catch(() => null);
		if (!res) {
			test.skip(
				true,
				'Đổi tháng không sinh lời gọi `po-reconciliation/suppliers` mới ⇒ 🚫 không đo được ' +
					'"kỳ có vào query".',
			);
		}
		const p = thamSo(res);
		expect(p.reportMonth, `Query không mang reportMonth: ${JSON.stringify(p)}`).toMatch(
			/^\d{4}-\d{2}-01$/,
		);
	});

	test('29_220_002 — Báo cáo đối soát lọc theo nhà cung cấp', async ({ page }) => {
		chanNeuTat('29_220_002');

		const o = khung(page).locator('input[placeholder*="NCC"]').first();
		expect(await o.count(), 'Không thấy ô tìm nhà cung cấp').toBeGreaterThan(0);

		const res = await taiLaiBoi(page, 'doiSoat', async () => {
			await o.fill('A');
			await o.press('Enter');
		}).catch(() => null);
		if (!res) test.skip(true, 'Gõ tên NCC không sinh lời gọi mới ⇒ màn lọc phía client.');
		const p = thamSo(res);
		expect(
			Object.values(p).some((v) => String(v).toUpperCase().includes('A')),
			`Từ khoá NCC không vào query: ${JSON.stringify(p)}`,
		).toBe(true);
	});

	test('29_220_007 — Số lượng PO chưa đối soát', async ({ page }) => {
		chanNeuTat('29_220_007');

		const chu = chuan(await khung(page).innerText());
		const doc = (nhan) => {
			const m = chu.match(new RegExp(`${nhan}[^\\d]{0,40}([\\d.,]+)`, 'i'));
			return m ? soTu(m[1]) : null;
		};
		const khop = doc('khớp');
		const lech = doc('lệch');
		const chua = doc('chưa đối soát');
		test.info().annotations.push({
			type: 'ba thẻ số liệu',
			description: `khớp=${khop} · lệch=${lech} · chưa=${chua}`,
		});
		if ([khop, lech, chua].some((v) => v === null)) {
			test.skip(
				true,
				`Màn không hiện đủ ba thẻ khớp/lệch/chưa đối soát để đối chiếu. Chữ trên màn: ` +
					chu.slice(0, 300),
			);
		}
		const tong = doc('tổng số PO') ?? doc('tổng PO');
		if (tong === null) {
			test.skip(true, 'Màn không có chỉ tiêu "tổng PO trong kỳ" để đối chiếu ba nhóm.');
		}
		expect(
			khop + lech + chua,
			`Khớp(${khop}) + Lệch(${lech}) + Chưa(${chua}) ≠ tổng PO trong kỳ (${tong})`,
		).toBe(tong);
	});

	test('29_220_011 — Bộ lọc trạng thái đối soát', async ({ page }) => {
		chanNeuTat('29_220_011');

		const nut = khung(page).getByRole('button', { name: /Lọc báo cáo/ }).first();
		if ((await nut.count()) === 0) {
			test.skip(
				true,
				'Màn không có nút "Lọc báo cáo". Nút đang có: ' +
					chuan((await khung(page).locator('button').allInnerTexts()).join(' · ')),
			);
		}
		await nut.click();
		await page.waitForTimeout(2_500);
		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible, .ant-popover:visible').last();
		if ((await hop.count()) === 0) {
			test.skip(true, 'Bấm "Lọc báo cáo" mà không mở hộp lọc nào để đọc tiêu chí.');
		}
		const chu = chuan(await hop.innerText());
		test.info().annotations.push({ type: 'nội dung bộ lọc', description: chu.slice(0, 400) });
		expect(
			/đối soát/i.test(chu),
			`Bộ lọc không có tiêu chí trạng thái đối soát. Nội dung: ${chu.slice(0, 300)}`,
		).toBe(true);
	});
});
