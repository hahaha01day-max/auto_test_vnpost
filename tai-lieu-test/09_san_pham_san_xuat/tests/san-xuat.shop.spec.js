'use strict';

/**
 * Phân hệ 09 — Sản phẩm sản xuất (`/inventory/production`), phần ĐỌC (vai `shop`).
 *
 * 🔴 Xác nhận một phiếu sản xuất sinh **hai chứng từ kho thật** (xuất nguyên liệu + nhập thành
 * phẩm) và ghi giá vốn thành phẩm ⇒ mọi case ghi giữ `allowMutation: false`. Cả file bọc
 * `chanGhi()`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const ROUTE = '/inventory/production';
const API = '/production';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');

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
		if (!/production|stock/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

/** Mở màn và thu **toàn bộ** mã trạng thái của API danh sách phiếu. */
async function moMan(page) {
	const ma = [];
	page.on('response', (r) => {
		if (new URL(r.url()).pathname.endsWith(API)) ma.push(r.status());
	});
	await moTrang(page, ROUTE, VAI);
	await page.waitForTimeout(8_000);
	return ma;
}

const KHONG_CO_PHIEU =
	'Điểm bán chưa có phiếu sản xuất nào. 🚫 Không tự lập phiếu để có dữ liệu: xác nhận phiếu sinh ' +
	'hai chứng từ kho thật và ghi giá vốn thành phẩm.';

test.describe('09 — Sản phẩm sản xuất', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
	});

	test('09_010_001 — Màn Sản xuất sản phẩm mở được và hiện danh sách phiếu', async ({ page }) => {
		chanNeuTat('09_010_001');

		const ma = await moMan(page);
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		for (const c of ['Mã phiếu', 'Trạng thái', 'Thao tác']) {
			expect(cot, `Bảng thiếu cột "${c}"; đang có: ${cot.join(' · ')}`).toContain(c);
		}

		// 🔴 Đo 20/09/2026: API `/production` trả **401** cho vai điểm bán và 🚫 KHÔNG gọi lại lần
		//    nào ⇒ bảng vĩnh viễn rỗng, màn 🚫 không báo gì. Giữ nguyên kỳ vọng.
		expect(
			ma.includes(200),
			`API danh sách phiếu sản xuất trả ${ma.join(', ') || '(không gọi lần nào)'} cho vai ${VAI}. ` +
				'Bảng rỗng im lặng, không thông báo nào cho người dùng — phát hiện phân quyền, ' +
				'🚫 không phải lỗi script (mọi API khác của cùng phiên đều 200).',
		).toBe(true);
	});

	test('09_010_004 — Bỏ trống từng ô bắt buộc khi lập phiếu sản xuất', async ({ page }) => {
		chanNeuTat('09_010_004');
		const { daGoi } = await chanGhi(page);

		await moMan(page);
		const nut = khung(page).getByRole('button', { name: /Tạo phiếu|Thêm|Lập phiếu/ }).first();
		if ((await nut.count()) === 0) {
			test.skip(true, 'Vai điểm bán không thấy nút lập phiếu sản xuất trên màn.');
		}
		await nut.click({ force: true });
		await page.waitForTimeout(3_500);

		const form = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const box = (await form.count()) ? form : khung(page);
		const luu = box.getByRole('button', { name: /Lưu|Xác nhận|Tạo phiếu/ }).last();
		if ((await luu.count()) === 0) test.skip(true, 'Form lập phiếu không có nút lưu.');
		await luu.click({ force: true });
		await page.waitForTimeout(2_500);

		const loi = [
			...(await box.locator('.ant-form-item-explain-error').allInnerTexts()),
			...(await page.locator('.ant-message').allInnerTexts()),
		].map(chuan);
		expect(daGoi, '🔴 Form trống mà vẫn gửi request tạo phiếu sản xuất').toEqual([]);
		expect(
			loi.join(' | '),
			'Bấm lưu với form TRỐNG mà không có thông báo nào — không có phép kiểm bắt buộc',
		).not.toBe('');
	});

	test('09_030_001 — Nút Xác nhận chỉ hiện với phiếu Nháp', async ({ page }) => {
		chanNeuTat('09_030_001');

		await moMan(page);
		if ((await dong(page).count()) === 0) test.skip(true, KHONG_CO_PHIEU);

		// Tìm cột theo TIÊU ĐỀ — 🚫 chỉ số cứng: cột 3 là "Tổng giá vốn", không phải "Trạng thái".
		const tieuDe = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		const cotTt = tieuDe.indexOf('Trạng thái');
		expect(cotTt, `Bảng không có cột Trạng thái: ${tieuDe.join(' · ')}`).toBeGreaterThan(-1);
		let daKiem = 0;
		for (let i = 0; i < (await dong(page).count()); i += 1) {
			const o = dong(page).nth(i).locator('td');
			const trangThai = chuan(await o.nth(cotTt).innerText());
			const nut = chuan(await o.last().innerText());
			if (trangThai.includes('Nháp')) {
				expect(nut, `Phiếu Nháp dòng ${i + 1} thiếu nút Xác nhận`).toContain('Xác nhận');
				daKiem += 1;
			} else if (trangThai.includes('Hoàn thành')) {
				expect(nut, `Phiếu Hoàn thành dòng ${i + 1} vẫn có nút Xác nhận`).not.toContain('Xác nhận');
				daKiem += 1;
			}
		}
		expect(daKiem, 'Không có phiếu Nháp lẫn Hoàn thành nào để đối chiếu').toBeGreaterThan(0);
	});

	test('09_040_001 — Lọc phiếu theo trạng thái', async ({ page }) => {
		chanNeuTat('09_040_001');

		await moMan(page);
		const o = khung(page).locator('.ant-select').filter({ hasText: /trạng thái/i }).first();
		if ((await o.count()) === 0) test.skip(true, 'Màn không có ô lọc trạng thái.');

		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		await page.keyboard.press('Escape');

		expect(nhan, `Ô Trạng thái đang có: ${nhan.join(' · ')}`).toEqual([
			'Nháp',
			'Hoàn thành',
			'Đã hủy',
		]);
	});

	test('09_040_003 — Chi tiết phiếu sản xuất mở được', async ({ page }) => {
		chanNeuTat('09_040_003');

		await moMan(page);
		if ((await dong(page).count()) === 0) test.skip(true, KHONG_CO_PHIEU);

		await dong(page).first().locator('td').last().getByRole('button').first().click({ force: true });
		await page.waitForTimeout(4_000);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const noi = chuan((await hop.count()) ? await hop.innerText() : await khung(page).innerText());
		for (const phan of ['thành phẩm', 'nguyên liệu', 'giá vốn']) {
			expect(
				noi.toLowerCase(),
				`Chi tiết phiếu thiếu phần "${phan}". Nội dung: ${noi.slice(0, 250)}`,
			).toContain(phan);
		}
	});

	test('09_040_004 — Huỷ form lập phiếu giữa chừng thì không lưu gì', async ({ page }) => {
		chanNeuTat('09_040_004');
		const { daGoi } = await chanGhi(page);

		await moMan(page);
		const soTruoc = await dong(page).count();
		const nut = khung(page).getByRole('button', { name: /Tạo phiếu|Thêm|Lập phiếu/ }).first();
		if ((await nut.count()) === 0) test.skip(true, 'Không thấy nút lập phiếu sản xuất.');

		await nut.click({ force: true });
		await page.waitForTimeout(3_000);
		await page.keyboard.press('Escape');
		await page.waitForTimeout(2_000);

		expect(daGoi, 'Huỷ form mà vẫn gửi request tạo phiếu').toEqual([]);
		expect(await dong(page).count(), 'Danh sách có thêm phiếu dù đã huỷ').toBe(soTruoc);
	});

	test('09_040_005 — Phân trang và trạng thái rỗng của danh sách phiếu', async ({ page }) => {
		chanNeuTat('09_040_005');

		await moMan(page);
		if ((await dong(page).count()) === 0) {
			await expect(
				khung(page).locator('.ant-empty'),
				'Danh sách rỗng mà không hiện trạng thái rỗng',
			).toBeVisible();
			test.skip(true, `${KHONG_CO_PHIEU} (Đã kiểm được vế "trạng thái rỗng".)`);
		}

		const phanTrang = khung(page).locator('.ant-pagination').first();
		if ((await phanTrang.count()) === 0) test.skip(true, 'Chỉ có một trang phiếu.');
		const trang2 = phanTrang.locator('.ant-pagination-item[title="2"]');
		if ((await trang2.count()) === 0) test.skip(true, 'Chỉ có một trang phiếu.');

		const truoc = await dong(page).allInnerTexts();
		await trang2.click();
		await page.waitForTimeout(2_500);
		const sau = await dong(page).allInnerTexts();
		expect(sau.some((d) => truoc.includes(d)), 'Trang 2 lặp dòng của trang 1').toBe(false);
	});
});
