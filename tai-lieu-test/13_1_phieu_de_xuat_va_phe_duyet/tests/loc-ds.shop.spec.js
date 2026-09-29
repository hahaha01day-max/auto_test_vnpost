'use strict';

/**
 * 13_1 · 040 — lọc kết hợp, sắp xếp, phóng to màn danh sách phiếu đề xuất (vai `shop`). Chỉ ĐỌC.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/purchaseOrder/pages/StockRequestListPage.jsx`,
 * `components/appProTable/AppProTable.jsx`. Danh sách gửi cố định `sort=modifiedDate,desc`, cột không có sorter;
 * toolbar AppProTable có reload · setting · fullscreen.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const dx = require('./dx-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

/** Mở danh sách và lấy response trang đầu. */
async function moVaLay(page) {
	const cho = page.waitForResponse((r) => /\/stock-requests\?/.test(r.url()), { timeout: 60_000 });
	await dx.moDs(page, 'shop');
	const res = await cho;
	return { url: res.url(), body: await res.json() };
}

test.describe('13_1 · 040 lọc / sắp xếp / phóng to (shop)', () => {
	test('13_1_040_007 — Kiểm tra Kết hợp nhiều bộ lọc cùng lúc', async ({ page }) => {
		chanNeuTat('13_1_040_007');
		await moVaLay(page);
		await dx.timMa(page, '');
		const r0 = dx.dong(page).first();
		await expect(r0, 'Điểm bán không có phiếu nào để lọc').toBeVisible({ timeout: 20_000 });
		const ma = dx.chuan(await r0.locator('td').nth(1).innerText()).split(' ')[0];
		const tt = dx.chuan(await r0.locator('.ant-tag').last().innerText());
		const ngay = dx.chuan(await r0.innerText()).match(/(\d{2}\/\d{2}\/\d{4}) \d{2}:\d{2}/)?.[1];
		expect(ngay, 'Dòng đầu không có Ngày yêu cầu').toBeTruthy();

		const k = dx.khung(page);
		await k.locator('#keyword').fill(ma);
		await k.locator('.ant-form-item').filter({ hasText: 'Trạng thái' }).locator('.ant-select').click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${tt}$`) }).first().click();
		// RangePicker antd: gõ phím đôi khi không chốt khoảng (đo 24/09: Đến ngày hiện đúng mà fromDate rỗng) ⇒ bấm ô ngày trên lịch 2 lần.
		const iso0 = ngay.split('/').reverse().join('-');
		await k.getByPlaceholder('Từ ngày').click();
		const o = page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) td[title="' + iso0 + '"]').first();
		await o.click();
		await o.click();
		await expect(k.getByPlaceholder('Từ ngày')).toHaveValue(ngay);
		await expect(k.getByPlaceholder('Đến ngày')).toHaveValue(ngay);
		const cho = page.waitForResponse((r) => /\/stock-requests\?/.test(r.url()) && r.url().includes('status='), { timeout: 20_000 });
		await k.getByRole('button', { name: 'Tìm kiếm' }).click();
		const res = await cho;
		const u = new URL(res.url());
		const iso = ngay.split('/').reverse().join('-');
		test.info().annotations.push({ type: 'đo', description: `${ma} · ${tt} · ${ngay} → ${u.search}` });
		expect(u.searchParams.get('keyword')).toBe(ma);
		expect(u.searchParams.get('fromDate')).toBe(iso);
		expect(u.searchParams.get('toDate')).toBe(iso);
		expect(u.searchParams.get('status'), 'Không gửi tham số trạng thái').toBeTruthy();
		const body = await res.json();
		const ds = body?.data || [];
		expect(ds.length, 'Lọc kết hợp đúng dữ kiện của một phiếu có thật mà không ra phiếu nào').toBeGreaterThan(0);
		for (const p of ds) {
			expect(p.code).toContain(ma);
			expect(p.status).toBe(u.searchParams.get('status'));
		}
		await expect(dx.dong(page).filter({ hasText: ma }).first()).toBeVisible();
	});

	test('13_1_040_011 — Kiểm tra sắp xếp (nếu có click tiêu đề cột)', async ({ page }) => {
		chanNeuTat('13_1_040_011');
		const { url, body } = await moVaLay(page);
		expect(new URL(url).searchParams.get('sort'), 'Danh sách không gửi tham số sắp xếp').toBeTruthy();
		const ds = body?.data || [];
		expect(ds.length, 'Cần ≥2 phiếu để kiểm thứ tự').toBeGreaterThan(1);
		// Bước QC: Cài đặt → chọn / ghim cột.
		await dx.khung(page).locator('.ant-pro-table-list-toolbar [aria-label="setting"]').click();
		await expect(page.locator('.ant-popover:visible').getByText('Ngày yêu cầu').first(), 'Cài đặt cột không có "Ngày yêu cầu"').toBeVisible();
		await page.keyboard.press('Escape');
		// Kỳ vọng QC: sắp theo Ngày tạo (createdDate) giảm dần — đo trên dữ liệu API trả về.
		const t = ds.map((p) => new Date(p.createdDate).getTime());
		const lech = t.findIndex((v, i) => i > 0 && v > t[i - 1]);
		test.info().annotations.push({ type: 'đo', description: `sort=${new URL(url).searchParams.get('sort')} · createdDate: ${ds.map((p) => p.createdDate).join(', ')}` });
		expect(lech, `Danh sách không sắp giảm dần theo Ngày tạo (vị trí ${lech}: ${ds[lech]?.createdDate} > ${ds[lech - 1]?.createdDate})`).toBe(-1);
	});

	test('13_1_040_013 — Kiểm tra Nút Phóng to/ Thu nhỏ màn hình', async ({ page }) => {
		chanNeuTat('13_1_040_013');
		await moVaLay(page);
		const nut = dx.khung(page).locator('.ant-pro-table-list-toolbar [aria-label="fullscreen"]');
		await expect(nut, 'Không có nút Phóng to').toBeVisible();
		await nut.click();
		await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement)), { message: 'Bấm Phóng to mà không vào toàn màn hình' }).toBe(true);
		const thu = page.locator('[aria-label="fullscreen-exit"]').first();
		await expect(thu, 'Đang toàn màn hình mà không có nút Thu nhỏ').toBeVisible();
		await thu.click();
		await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement)), { message: 'Bấm Thu nhỏ mà không thoát toàn màn hình' }).toBe(false);
	});
});
