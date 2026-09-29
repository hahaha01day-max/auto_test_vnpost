'use strict';

/**
 * Phân hệ 16 — Hàng ký gửi, phần ĐỌC (vai `province`).
 *
 * Trace 20/09/2026: route **`/debt-reconciliation/consignment-debt`**, API
 * `GET /consignment-debt/obligations`.
 *
 * 🔴 Công nợ ký gửi là **số tạm tính**, và màn **cố ý không có** chức năng lập khoản công nợ bằng
 * tay lẫn nút chi tiền (`16_010_003` `16_010_004`) — hai case đó kiểm sự VẮNG MẶT, nên phải chắc
 * màn đã nạp xong mới kết luận, 🚫 không assert phủ định trên màn còn trắng.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const ROUTE = '/debt-reconciliation/consignment-debt';
const API = '/consignment-debt/obligations';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');

const chanNeuTat = (id) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
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
		if (!/consignment|debt/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

/** Mở màn và thu TOÀN BỘ mã trạng thái của API công nợ. */
async function moMan(page) {
	const ma = [];
	page.on('response', (r) => {
		if (r.url().includes(API)) ma.push(r.status());
	});
	await moTrang(page, ROUTE, VAI);
	await page.waitForTimeout(8_000);
	return ma;
}

test.describe('16 — Công nợ hàng ký gửi', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
	});

	test('16_010_001 — Màn Công nợ hàng ký gửi mở được và nêu rõ là số tạm tính', async ({ page }) => {
		chanNeuTat('16_010_001');

		const ma = await moMan(page);
		// 🔴 Đo 20/09/2026: API trả **401 ở MỌI lần gọi** cho vai tỉnh ⇒ bảng rỗng im lặng.
		expect(
			ma.length > 0 && ma.some((m) => m !== 401),
			`API công nợ ký gửi trả ${ma.join(', ') || '(không gọi)'} cho vai ${VAI} ở mọi lần gọi ⇒ ` +
				'màn rỗng im lặng, không thông báo nào. Phát hiện phân quyền, 🚫 không phải lỗi script.',
		).toBe(true);

		const noi = chuan(await khung(page).innerText());
		expect(
			/tạm tính/i.test(noi),
			`Màn 🚫 không nêu rõ đây là số TẠM TÍNH. Nội dung: ${noi.slice(0, 200)}`,
		).toBe(true);
	});

	test('16_010_002 — Bảng công nợ hiện đủ mười cột', async ({ page }) => {
		chanNeuTat('16_010_002');

		await moMan(page);
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts())
			.map(chuan)
			.filter((t) => t !== '');
		test.info().annotations.push({ type: 'cột thật', description: cot.join(' · ') });
		expect(cot.length, `Bảng có ${cot.length} cột: ${cot.join(' · ')}`).toBe(10);
	});

	test('16_010_003 — Không có chức năng lập khoản công nợ bằng tay', async ({ page }) => {
		chanNeuTat('16_010_003');

		await moMan(page);
		// 🔴 Assertion PHỦ ĐỊNH ⇒ phải chắc màn đã dựng xong: chờ có bảng rồi mới kết luận.
		await expect(
			khung(page).locator('.ant-table'),
			'Màn chưa dựng xong bảng — 🚫 không kết luận "không có nút" trên màn còn trắng',
		).toBeVisible({ timeout: 25_000 });

		const nut = (await khung(page).getByRole('button').allInnerTexts()).map(chuan);
		const nutThem = nut.filter((n) => /thêm|lập|tạo/i.test(n));
		expect(
			nutThem,
			`Màn công nợ ký gửi có nút lập khoản bằng tay: ${nutThem.join(' / ')} — trái thiết kế ` +
				'(công nợ ký gửi sinh tự động từ bán hàng).',
		).toEqual([]);
	});

	test('16_010_004 — Màn công nợ ký gửi cố ý không có nút chi tiền', async ({ page }) => {
		chanNeuTat('16_010_004');

		await moMan(page);
		await expect(khung(page).locator('.ant-table')).toBeVisible({ timeout: 25_000 });

		const nut = (await khung(page).getByRole('button').allInnerTexts()).map(chuan);
		const nutChi = nut.filter((n) => /chi tiền|thanh toán|trả tiền/i.test(n));
		expect(
			nutChi,
			`Màn có nút chi tiền: ${nutChi.join(' / ')} — trái thiết kế, việc chi nằm ở màn khác.`,
		).toEqual([]);
	});
});
