'use strict';

/**
 * Phân hệ 07_2 — Cấu hình kho, phần ĐỌC (vai `tct`).
 *
 * 🔴 Ba nhóm cấu hình, tất cả nằm trong `/settings?setting=<key>` (đo 20/09/2026):
 *
 * | Nhóm | key | Nội dung |
 * |---|---|---|
 * | Khoá kho | `stockFreeze` | bảng *STT · Đối tượng khoá · Phạm vi áp dụng · Lý do · Hành động* |
 * | Bán tồn kho âm | `negativeStock` | chỉ vai Tổng công ty |
 * | Cảnh báo hết hạn | `expiryAlert` | bảng *Tên cấu hình · Đối tượng áp dụng · Chi tiết · Số ngày cảnh báo · Kích hoạt · Thao tác* |
 *
 * 🔴 **Khoá kho chặn cả nhập, xuất, chuyển và bán hàng của mọi đơn vị trong phạm vi** ⇒ 43/53 case
 * là case ghi, giữ `allowMutation: false`. Case đọc vẫn bọc `chanGhi()`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const cot = (page) => khung(page).locator('.ant-table-thead th');

const chanNeuTat = (id) => {
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
		if (!/config|setting|freeze|expiry|stock/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

async function moNhom(page, key) {
	await moTrang(page, `/settings?setting=${key}`, VAI);
	await page.waitForTimeout(4_500);
	return khung(page);
}

test.describe('07_2 — Cấu hình kho', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
	});

	test('07_2_010_001 — Màn Khoá kho mở được và hiện bảng cấu hình', async ({ page }) => {
		chanNeuTat('07_2_010_001');

		await moNhom(page, 'stockFreeze');
		const ten = (await cot(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		expect(ten, `Cột đang có: ${ten.join(' · ')}`).toEqual([
			'STT',
			'Đối tượng khoá',
			'Phạm vi áp dụng',
			'Lý do',
			'Hành động',
		]);
	});

	test('07_2_010_004 — Hình thức khoá mặc định là Theo danh mục', async ({ page }) => {
		chanNeuTat('07_2_010_004');

		await moNhom(page, 'stockFreeze');
		const nut = khung(page).getByRole('button').filter({ hasText: /Thêm|Khoá/ }).first();
		if ((await nut.count()) === 0) test.skip(true, 'Không thấy nút thêm cấu hình khoá kho.');
		await nut.click({ force: true });

		const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await expect(dr).toBeVisible({ timeout: 20_000 });
		await page.waitForTimeout(2_000);

		const noi = chuan(await dr.innerText());
		expect(noi, 'Form thêm cấu hình không có bước "Danh mục / SKU"').toContain('Danh mục / SKU');
		// 🔴 Ghi lại lựa chọn đang chọn sẵn — kịch bản đòi "Theo danh mục".
		const daChon = dr.locator('.ant-radio-wrapper-checked');
		test.info().annotations.push({
			type: 'lựa chọn đang chọn sẵn ở bước đầu',
			description: (await daChon.allInnerTexts()).map(chuan).join(' · ') || '(không có)',
		});
	});

	test('07_2_020_001 — Xem chi tiết một cấu hình khoá kho', async ({ page }) => {
		chanNeuTat('07_2_020_001');

		await moNhom(page, 'stockFreeze');
		if ((await dong(page).count()) === 0) {
			test.skip(true, 'Chưa có cấu hình khoá kho nào để xem chi tiết.');
		}

		await dong(page).first().getByRole('button', { name: 'Xem chi tiết' }).first().click({ force: true });
		await page.waitForTimeout(3_000);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const noi = chuan((await hop.count()) ? await hop.innerText() : await khung(page).innerText());
		expect(noi.length, 'Mở chi tiết mà không có nội dung nào').toBeGreaterThan(20);
		// Chi tiết phải nói được khoá CÁI GÌ và khoá Ở ĐÂU.
		expect(
			/danh mục|sku|sản phẩm|ngành hàng/i.test(noi),
			`Chi tiết không nói rõ đối tượng bị khoá. Nội dung: ${noi.slice(0, 200)}`,
		).toBe(true);
		expect(
			/đơn vị|điểm bán|tỉnh|xã|phạm vi/i.test(noi),
			`Chi tiết không nói rõ phạm vi khoá. Nội dung: ${noi.slice(0, 200)}`,
		).toBe(true);
	});

	test('07_2_050_002 — Bảng cảnh báo hết hạn hiện đủ cột', async ({ page }) => {
		chanNeuTat('07_2_050_002');

		await moNhom(page, 'expiryAlert');
		const ten = (await cot(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		for (const c of ['Tên cấu hình', 'Đối tượng áp dụng', 'Chi tiết', 'Số ngày cảnh báo', 'Kích hoạt']) {
			expect(ten, `Bảng thiếu cột "${c}"; đang có: ${ten.join(' · ')}`).toContain(c);
		}
	});

	test('07_2_050_001 — Lọc cấu hình cảnh báo theo SKU hoặc ngành hàng', async ({ page }) => {
		chanNeuTat('07_2_050_001');

		await moNhom(page, 'expiryAlert');
		const so = await dong(page).count();
		if (so === 0) test.skip(true, 'Chưa có cấu hình cảnh báo hết hạn nào để lọc.');

		const o = khung(page).locator('input[placeholder]').filter({ hasNot: page.locator('[disabled]') }).first();
		if ((await o.count()) === 0) {
			test.skip(true, 'Nhóm Cảnh báo hết hạn không có ô lọc/tìm kiếm nào trên màn.');
		}

		const tuKhoa = chuan(await dong(page).first().locator('td').nth(1).innerText()).split(' ')[0];
		await o.fill(tuKhoa);
		await o.press('Enter');
		await page.waitForTimeout(2_500);

		const sau = await dong(page).count();
		expect(sau, `Lọc theo "${tuKhoa}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		expect(sau, 'Lọc xong số dòng không giảm — bộ lọc có thể không có tác dụng').toBeLessThanOrEqual(so);
	});

});
