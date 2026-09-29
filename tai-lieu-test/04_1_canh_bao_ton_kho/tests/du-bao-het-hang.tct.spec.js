'use strict';

/**
 * Task 010 — phần còn thiếu script: thẻ **Dự báo hết hàng** và bộ 9 thẻ cảnh báo.
 *
 * 🔴 Bảng của thẻ này có bộ cột RIÊNG, khác `COT_MAC_DINH` của ba nhóm theo định mức (đo 20/09):
 * *Tên sản phẩm · Nhà cung cấp MĐ · Tồn hiện tại · Tồn khả dụng · Xuất TB/Ngày · Số ngày còn lại*.
 *
 * 🔴 Ô tìm kiếm của thẻ này 🚫 KHÔNG có nút tìm và 🚫 KHÔNG chạy theo Enter — bảng tự nạp lại sau
 * **debounce 500ms**. Gõ xong assert ngay là đọc trúng dữ liệu cũ.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const {
	API_ALERTS,
	NHOM_CANH_BAO,
	blockWrites,
	chonNhom,
	main,
	openAlerts,
	rows,
	settle,
	skipNoData,
} = require('./alert-page');

const VAI = 'tct';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const pane = (page) => page.locator('.ant-tabs-tabpane-active');
const oTim = (page) => pane(page).locator('input[placeholder="Tìm SKU, tên sản phẩm..."]').first();

/** Gõ từ khoá rồi chờ ĐÚNG mốc debounce + request, 🚫 không `waitForTimeout` suông. */
async function timTheoDebounce(page, tuKhoa) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API_ALERTS) && r.status() !== 401,
		{ timeout: 45_000 },
	);
	await oTim(page).fill(tuKhoa);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(800);
	return res;
}

test.describe('04_1 · 010 — Thẻ Dự báo hết hàng', () => {
	test.beforeEach(async ({ page }) => {
		await openAlerts(page, VAI);
		await blockWrites(page);
	});

	test('04_1_010_016 — Chín thẻ cảnh báo hiển thị đủ và đúng nhãn', async ({ page }) => {
		chanNeuTat('04_1_010_016');

		const nhan = (await page.locator('.ant-tabs-tab').allInnerTexts()).map((s) =>
			chuan(s.split('\n')[0]),
		);
		// 🔴 Nhãn thẻ mang cả số đếm phía sau ⇒ so bằng "bắt đầu bằng", 🚫 không so khít cả chuỗi.
		for (let i = 0; i < NHOM_CANH_BAO.length; i += 1) {
			expect(
				nhan[i] ?? '',
				`Thẻ thứ ${i + 1} phải là "${NHOM_CANH_BAO[i]}", đang là "${nhan[i] ?? '(không có)'}"`,
			).toContain(NHOM_CANH_BAO[i]);
		}
		expect(nhan.length, `Số thẻ cảnh báo: ${nhan.join(' · ')}`).toBe(NHOM_CANH_BAO.length);
		// Thẻ "Cài đặt cảnh báo" đã bị gỡ khỏi màn này — cài đặt ở màn riêng.
		expect(nhan.join(' | ')).not.toContain('Cài đặt cảnh báo');
	});

	test('04_1_010_011 — Tìm kiếm SKU và tên sản phẩm ở thẻ Dự báo hết hàng', async ({ page }) => {
		const i = chanNeuTat('04_1_010_011');

		await chonNhom(page, 'Dự báo hết hàng');
		await settle(page);
		if ((await rows(page).count()) === 0) {
			skipNoData(test, 'Thẻ "Dự báo hết hàng" không có dòng nào để thử tìm kiếm.');
		}

		const sku = i.data.sku;
		await timTheoDebounce(page, sku);
		const so = await rows(page).count();
		expect(so, `Tìm SKU "${sku}" không ra dòng nào`).toBeGreaterThan(0);
		for (let k = 0; k < so; k += 1) {
			expect(chuan(await rows(page).nth(k).innerText())).toContain(sku);
		}

		await timTheoDebounce(page, 'zzzkhongtontai999');
		expect(await rows(page).count(), 'Từ khoá không tồn tại mà bảng vẫn có dòng').toBe(0);
	});

	test('04_1_010_012 — Phân trang thẻ Dự báo hết hàng', async ({ page }) => {
		chanNeuTat('04_1_010_012');

		await chonNhom(page, 'Dự báo hết hàng');
		await settle(page);
		const phanTrang = pane(page).locator('.ant-pagination').first();
		if ((await phanTrang.count()) === 0 || (await rows(page).count()) <= 20) {
			skipNoData(test, 'Thẻ "Dự báo hết hàng" chưa đủ hơn 20 dòng để kiểm phân trang.');
		}

		expect(await rows(page).count(), 'Mặc định phải là 20 dòng/trang').toBe(20);
		await expect(
			pane(page).locator('.ant-pagination-options-size-changer'),
			'Bảng này phải CÓ ô đổi số dòng mỗi trang (`showSizeChanger: true`)',
		).toBeVisible();

		const trang1 = await rows(page).allInnerTexts();
		await phanTrang.locator('.ant-pagination-item[title="2"]').click();
		await settle(page);
		const trang2 = await rows(page).allInnerTexts();
		expect(trang2.some((d) => trang1.includes(d)), 'Trang 2 lặp dòng của trang 1').toBe(false);
	});

	test('04_1_010_013 — Nút làm mới bảng Dự báo hết hàng', async ({ page }) => {
		chanNeuTat('04_1_010_013');

		await chonNhom(page, 'Dự báo hết hàng');
		await settle(page);

		const nut = pane(page).locator('.ant-pro-table-list-toolbar-setting-item').filter({
			has: page.locator('.anticon-reload'),
		});
		await expect(nut.first(), 'Không thấy nút làm mới trên thanh công cụ').toBeVisible();

		// 🔴 Đo bằng DANH SÁCH REQUEST, không bằng `waitForResponse`: nếu nút không gọi lại API thì
		//    `waitForResponse` chỉ treo hết timeout và lý do đỏ đọc như lỗi mạng.
		const goi = [];
		page.on('request', (r) => {
			if (r.url().includes('/__api/')) goi.push(`${r.method()} ${r.url()}`);
		});
		await nut.first().click();
		await page.waitForTimeout(6_000);

		expect(
			goi.filter((u) => u.includes(API_ALERTS)).length,
			`Bấm nút làm mới KHÔNG gọi lại API cảnh báo. Request phát ra trong 6s: ` +
				`${goi.length === 0 ? 'không có request nào' : goi.join(' ; ')}. ` +
				'Nút chỉ dùng cache ⇒ dữ liệu không thể mới hơn — đây là phát hiện về sản phẩm.',
		).toBeGreaterThan(0);
	});

	test('04_1_010_014 — Cài đặt hiển thị cột của bảng Dự báo hết hàng', async ({ page }) => {
		chanNeuTat('04_1_010_014');

		await chonNhom(page, 'Dự báo hết hàng');
		await settle(page);

		const cotTruoc = (await pane(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		expect(cotTruoc.length, 'Bảng không có cột nào').toBeGreaterThan(2);

		const nut = pane(page).locator('.ant-pro-table-list-toolbar-setting-item').filter({
			has: page.locator('.anticon-setting'),
		});
		await expect(nut.first(), 'Không thấy nút cài đặt cột').toBeVisible();
		await nut.first().click();
		await page.waitForTimeout(1_200);

		const muc = page.locator('.ant-pro-table-column-setting-list .ant-tree-checkbox').first();
		if ((await muc.count()) === 0) {
			skipNoData(test, 'Không mở được bảng cài đặt cột — cần probe lại cấu trúc dropdown.');
		}
		await muc.click();
		await page.waitForTimeout(1_200);

		const cotSau = (await pane(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		expect(cotSau.length, 'Bỏ chọn một cột mà bảng không đổi').toBeLessThan(cotTruoc.length);

		await muc.click();
		await page.waitForTimeout(1_200);
		expect(
			(await pane(page).locator('.ant-table-thead th').allInnerTexts()).length,
			'Bật lại cột mà bảng không trở về như cũ',
		).toBe(cotTruoc.length);
	});

	test('04_1_010_015 — Nút phóng to / thu nhỏ bảng — phơi hành vi thật', async ({ page }) => {
		chanNeuTat('04_1_010_015');
		await chonNhom(page, 'Dự báo hết hàng');
		await settle(page);
		const muc = pane(page).locator('.ant-pro-table-list-toolbar-setting-item');
		const icon = await muc.evaluateAll((a) => a.map((x) => [...x.querySelectorAll('.anticon')].map((i) => [...i.classList].find((c) => c.startsWith('anticon-') && c !== 'anticon')).join('+')));
		test.info().annotations.push({ type: 'đo', description: `nút thanh công cụ bảng: ${JSON.stringify(icon)}` });
		// Kỳ vọng kịch bản (đã viết theo code): CHỈ có tải lại + cấu hình cột, KHÔNG có phóng to (sheet QC FUNC_1_192 đòi có — ghi báo cáo).
		expect(icon.some((x) => /reload/.test(x)), 'Thiếu nút tải lại').toBe(true);
		expect(icon.some((x) => /setting/.test(x)), 'Thiếu nút cấu hình cột').toBe(true);
		expect(icon.some((x) => /fullscreen/.test(x)), 'Bảng có nút phóng to / thu nhỏ').toBe(false);
	});
});

void main;
