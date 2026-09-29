'use strict';

/** Nhóm chi tiết bảng giá nhìn từ **điểm bán** — xem được nhưng 🚫 không sửa/phê duyệt được. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { boQua, chanGhi, chuan, dong, khung, moMan } = require('./price-page');

const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Mở chi tiết bảng giá đầu tiên. */
async function moChiTiet(page) {
	if ((await dong(page).count()) === 0) {
		boQua(test, 'Vai điểm bán không thấy bảng giá nào để mở chi tiết.');
	}
	await dong(page).first().locator('td').last().getByRole('button').first().click({ force: true });
	await page.waitForTimeout(4_000);
	const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	return (await hop.count()) ? hop : khung(page);
}

test.describe('10 — Chi tiết bảng giá, vai điểm bán', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, VAI);
	});

	test('10_040_001 — Chi tiết bảng giá mở ở thẻ Thông tin chung', async ({ page }) => {
		chanNeuTat('10_040_001');

		const box = await moChiTiet(page);
		const noi = chuan(await box.innerText());
		expect(
			/thông tin chung/i.test(noi),
			`Chi tiết không mở ở thẻ Thông tin chung. Nội dung: ${noi.slice(0, 250)}`,
		).toBe(true);
		for (const nhan of ['hiệu lực', 'trạng thái']) {
			expect(noi.toLowerCase(), `Chi tiết thiếu "${nhan}"`).toContain(nhan);
		}
	});

	test('10_040_002 — Thẻ Sản phẩm lọc được theo mã tên và danh mục', async ({ page }) => {
		chanNeuTat('10_040_002');

		const box = await moChiTiet(page);
		const the = box.locator('.ant-tabs-tab', { hasText: 'Sản phẩm' }).first();
		if ((await the.count()) === 0) boQua(test, 'Chi tiết bảng giá không có thẻ Sản phẩm.');
		await the.locator('.ant-tabs-tab-btn').dispatchEvent('click');
		await page.waitForTimeout(3_000);

		const pane = page.locator('.ant-tabs-tabpane-active').last();
		const o = pane.locator('input[placeholder]').first();
		if ((await o.count()) === 0) boQua(test, 'Thẻ Sản phẩm không có ô lọc nào.');

		const soTruoc = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
		if (soTruoc === 0) boQua(test, 'Bảng giá này chưa có sản phẩm nào để lọc.');

		await o.fill('zzzkhongtontai999');
		await page.waitForTimeout(2_500);
		expect(
			await pane.locator('.ant-table-tbody tr.ant-table-row').count(),
			'Lọc bằng từ khoá không tồn tại mà bảng vẫn còn dòng',
		).toBe(0);
	});

	test('10_PQ_001 — Vai điểm bán xem được bảng giá nhưng không phê duyệt được', async ({ page }) => {
		chanNeuTat('10_PQ_001');

		// 🔴 Vế 1 — xem được (quyền `view_price_product`). Đo bằng MÃ TRẠNG THÁI, 🚫 không chỉ đếm
		//    dòng: bảng rỗng vì "không có bảng giá nào áp cho điểm bán" và vì "API từ chối" là hai
		//    chuyện khác hẳn nhau.
		const ma = [];
		page.on('response', (r) => {
			if (r.url().includes('/chain-price-list/get-all')) ma.push(r.status());
		});
		await page.reload();
		await page.waitForTimeout(8_000);

		expect(
			ma.length > 0 && ma.every((m) => m !== 401),
			`API danh sách bảng giá trả ${ma.join(', ') || '(không gọi)'} cho vai điểm bán ở MỌI lần ` +
				'gọi ⇒ màn rỗng im lặng, không nút nào, không thông báo nào. Trái quyền ' +
				'`view_price_product` — phát hiện phân quyền, 🚫 không phải lỗi script.',
		).toBe(true);

		expect(
			await dong(page).count(),
			'Vai điểm bán KHÔNG thấy bảng giá nào dù API trả 200',
		).toBeGreaterThan(0);

		// Vế 2 — 🚫 không có nút phê duyệt (thiếu `approved_price_product`).
		const noi = chuan(await khung(page).innerText()).toLowerCase();
		const nutDuyet = await khung(page)
			.getByRole('button', { name: /phê duyệt|duyệt/i })
			.count();
		test.info().annotations.push({
			type: 'quan sát ở vai điểm bán',
			description: `${await dong(page).count()} bảng giá · nút phê duyệt: ${nutDuyet}`,
		});
		expect(
			nutDuyet === 0,
			`Vai điểm bán vẫn thấy ${nutDuyet} nút phê duyệt bảng giá. Nội dung màn: ${noi.slice(0, 200)}`,
		).toBe(true);
	});
});
