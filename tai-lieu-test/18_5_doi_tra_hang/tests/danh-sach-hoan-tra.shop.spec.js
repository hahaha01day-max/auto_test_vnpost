'use strict';

/** 18_5 · Task 060 + 160 — Tra cứu danh sách đơn hoàn trả, vai `shop`. Cả file 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan, oMaDon, taiLaiBoi, thamSo } = require('./return-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('18_5 · Danh sách đơn hoàn trả', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, VAI);
	});

	test('18_5_060_001 — Tra cứu đơn hoàn trả theo khoảng thời gian và mã đơn', async ({ page }) => {
		chanNeuTat('18_5_060_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Đơn hàng hoàn trả',
		);
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		expect(cot, `Cột đang có: ${cot.join(' · ')}`).toEqual([
			'STT',
			'Mã đơn trả',
			'Mã đơn hàng',
			'Khách hàng',
			'Số tiền hoàn',
			'Trạng thái',
			'Ngày tạo',
			'Hành động',
		]);

		const res = await taiLaiBoi(page, async () => {
			await oMaDon(page).fill('HT-KHONG-TON-TAI-999');
			await oMaDon(page).press('Enter');
		});
		expect(res.status()).toBe(200);
		// 🔴 Điều kiện phải đi vào REQUEST: bảng rỗng cũng "trông như đã lọc".
		const p = thamSo(res);
		expect(
			Object.values(p).some((v) => String(v).includes('HT-KHONG-TON-TAI-999')),
			`Gõ mã đơn mà query KHÔNG mang từ khoá: ${JSON.stringify(p)}`,
		).toBe(true);
		expect(p.startTime, 'Query thiếu startTime').toBeTruthy();
		expect(p.endTime, 'Query thiếu endTime').toBeTruthy();
		expect(await dong(page).count()).toBe(0);
	});

	test('18_5_060_002 — Xuất Excel danh sách hoàn trả theo bộ lọc hiện tại', async ({ page }) => {
		chanNeuTat('18_5_060_002');

		const nut = khung(page).getByRole('button', { name: 'Xuất Excel' }).first();
		await expect(nut, 'Không thấy nút Xuất Excel').toBeVisible();

		const goi = [];
		page.on('request', (r) => {
			if (/export|excel/i.test(r.url())) goi.push(`${r.method()} ${r.url()}`);
		});
		const cho = page.waitForEvent('download', { timeout: 60_000 }).catch(() => null);
		await nut.click({ force: true });
		const tai = await cho;
		await page.waitForTimeout(3_000);

		const loi = chuan(await page.locator('.ant-message-error, .ant-notification').innerText().catch(() => ''));
		expect(
			tai !== null || goi.length > 0,
			`Bấm "Xuất Excel" mà KHÔNG có tệp tải về và cũng KHÔNG có request xuất nào. ` +
				`Thông báo trên màn: ${loi || '(không có)'}`,
		).toBe(true);
		test.info().annotations.push({
			type: 'cách xuất Excel',
			description: tai ? `tải thẳng: ${tai.suggestedFilename()}` : `qua API: ${goi.join(' ; ')}`,
		});
	});

	test('18_5_160_001 — Phân trang danh sách đơn hoàn trả', async ({ page }) => {
		chanNeuTat('18_5_160_001');

		const so = await dong(page).count();
		if (so === 0) {
			test.skip(true, 'Điểm bán chưa có đơn hoàn trả nào ⇒ 🚫 không kiểm được phân trang.');
		}
		const trang = khung(page).locator('.ant-pagination-item');
		if ((await trang.count()) < 2) {
			test.skip(true, `Chỉ có ${so} đơn hoàn trả, chưa đủ 2 trang.`);
		}
		const res = await taiLaiBoi(page, () => trang.nth(1).click());
		expect(Number(thamSo(res).page), 'Sang trang 2 mà query vẫn page=0').toBe(1);
	});

	test('18_5_160_002 — Danh sách đơn hoàn trả rỗng', async ({ page }) => {
		chanNeuTat('18_5_160_002');

		await taiLaiBoi(page, async () => {
			await oMaDon(page).fill('ZZZ-KHONG-BAO-GIO-CO-999');
			await oMaDon(page).press('Enter');
		});
		expect(await dong(page).count()).toBe(0);
		const rong = khung(page).locator('.ant-empty');
		await expect(rong, 'Danh sách rỗng mà không có khối trạng thái rỗng').toBeVisible();
		test.info().annotations.push({
			type: 'nguyên văn trạng thái rỗng',
			description: chuan(await rong.innerText()),
		});
	});

	test('18_5_160_003 — Tổ hợp bộ lọc trên danh sách đơn hoàn trả', async ({ page }) => {
		chanNeuTat('18_5_160_003');

		const o = khung(page).locator('.ant-select').filter({ hasText: 'Chọn trạng thái' }).first();
		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		expect(nhan.length, 'Ô "Chọn trạng thái" không có lựa chọn nào').toBeGreaterThan(0);

		const res = await taiLaiBoi(page, async () => {
			await dd.locator('.ant-select-item-option-content').first().click();
		});
		const p = thamSo(res);
		expect(
			Object.entries(p).some(([k, v]) => /status|state|type/i.test(k) && String(v).length > 0),
			`Chọn trạng thái "${nhan[0]}" mà query KHÔNG mang điều kiện trạng thái: ${JSON.stringify(p)}`,
		).toBe(true);
		expect(p.startTime, 'Chọn thêm trạng thái mà mất điều kiện thời gian').toBeTruthy();
		test.info().annotations.push({ type: 'trạng thái đang có', description: nhan.join(' · ') });
	});

	test('18_5_160_004 — Tìm kiếm đơn hoàn trả bằng ký tự đặc biệt', async ({ page }) => {
		const i = chanNeuTat('18_5_160_004');

		const banDau = await dong(page).count();
		if (banDau === 0) {
			test.skip(
				true,
				'Điểm bán chưa có đơn hoàn trả nào ⇒ 🚫 không phân biệt được "escape đúng" với ' +
					'"không có dữ liệu" — cả hai đều cho 0 dòng.',
			);
		}
		const tuKhoa = i?.data?.tuKhoa ?? '%_';
		const res = await taiLaiBoi(page, async () => {
			await oMaDon(page).fill(tuKhoa);
			await oMaDon(page).press('Enter');
		});
		expect(res.status(), 'Tìm bằng ký tự đặc biệt mà API lỗi').toBeLessThan(500);
		expect(
			await dong(page).count(),
			`Tìm bằng ký tự đại diện SQL "${tuKhoa}" trả về đúng số dòng ban đầu (${banDau}) ⇒ ký tự ` +
				'wildcard lọt xuống backend mà không được escape.',
		).toBeLessThan(banDau);
	});

	test('18_5_130_001 — Lọc đơn hoàn trả đạt ngưỡng tiền bất thường', async ({ page }) => {
		chanNeuTat('18_5_130_001');
		// Tiền đề: ngưỡng ABNORMAL_REFUND_AMOUNT BẬT (bước `nguong-bat-thuong.gdv`, tài khoản gốc). Lựa chọn lọc
		// "Tiền trả bất thường (>= Xđ)" chỉ hiện khi cấu hình bật (`OrderReturnPage.jsx`), gửi `type=CRE`.
		const oLoai = khung(page).locator('.ant-select').filter({ hasText: 'Tất cả' }).first();
		await oLoai.click();
		const muc = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: 'Tiền trả bất thường' });
		const co = await muc.count();
		test.skip(!co, 'Ngưỡng tiền hoàn bất thường đang TẮT — chạy `VNPOST_NGUONG=<số> … nguong-bat-thuong` (tài khoản gốc)');
		const nhan = chuan(await muc.first().innerText());
		const nguong = Number((nhan.match(/>=\s*([\d.,]+)/) || [])[1]?.replace(/[.,]/g, ''));
		const tatCa = await dong(page).count();
		const res = await taiLaiBoi(page, () => muc.first().click());
		const ts = thamSo(res);
		const tien = (await dong(page).evaluateAll((rows) => rows.map((r) => r.innerText))).map((t) => {
			const m = chuan(t).match(/([\d.]+)\s*đ/);
			return m ? Number(m[1].replace(/\./g, '')) : NaN;
		});
		test.info().annotations.push({ type: 'đo', description: `"${nhan}" · ngưỡng ${nguong} · type=${ts.type} · Tất cả ${tatCa} dòng · lọc ${tien.length} dòng: ${tien.join(', ')}` });
		expect(ts.type, 'Chọn lọc bất thường mà request không mang type=CRE').toBe('CRE');
		expect(nguong, 'Không đọc được ngưỡng trên nhãn lọc').toBeGreaterThan(0);
		expect(tien.length, 'Không có đơn nào đạt ngưỡng trong 7 ngày để đối chiếu').toBeGreaterThan(0);
		for (const t of tien) expect(t, `Đơn tiền hoàn ${t} < ngưỡng ${nguong} vẫn hiện`).toBeGreaterThanOrEqual(nguong);
	});
});
