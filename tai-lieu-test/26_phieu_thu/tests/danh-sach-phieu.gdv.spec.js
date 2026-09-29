'use strict';

/** 26 · Danh sách phiếu thu, vai `gdv`. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { tenGdv, moTrang, chanGhi, chonOption, chuan, dong, khung, moMan, nhanCacOption, oTim, taiLaiBoi, thamSo } =
	require('./receipt-page');

const GOC = path.join(__dirname, '..');
const VAI = 'gdv';
const CAC_THE = ['Tất cả', 'Tiền mặt', 'Chuyển khoản', 'Thẻ VISA'];
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Dừng case khi vai không đọc được dữ liệu: 🔴 mọi lời gọi đều 401 là phát hiện quyền, đo riêng. */
function doDuocDuLieu(trangThai) {
	return trangThai.some((s) => s === 200);
}

test.describe('26 · Danh sách phiếu thu (giao dịch viên)', () => {
	let trangThai;
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		trangThai = await moMan(page, VAI);
	});

	test('26_010_005 — Giao diện màn Quản lý phiếu thu đủ thành phần', async ({ page }) => {
		chanNeuTat('26_010_005');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý phiếu thu',
		);
		// 🔴 Liệt kê placeholder thật vào thông báo: "không thấy ô tìm kiếm" mà không nói màn đang
		//    có ô nào thì người đọc không biết là lỗi script hay lỗi sản phẩm.
		const cacO = await khung(page).locator('input').evaluateAll((ds) =>
			ds.map((e) => e.placeholder).filter(Boolean),
		);
		expect(
			await oTim(page).count(),
			`Không thấy ô tìm kiếm theo mã phiếu. Ô nhập đang có: ${cacO.join(' · ') || '(không có)'}`,
		).toBeGreaterThan(0);
		await expect(
			khung(page).locator('input[placeholder="Ngày bắt đầu"]'),
			'Thiếu bộ lọc khoảng thời gian',
		).toBeVisible();
		const nguon = await nhanCacOption(page, 'Chọn nguồn thu');
		expect(nguon.length, 'Ô "Chọn nguồn thu" không có lựa chọn nào').toBeGreaterThan(0);
		test.info().annotations.push({ type: 'nguồn thu đang có', description: nguon.join(' · ') });

		const the = (await khung(page).locator('.ant-tabs-tab').allInnerTexts()).map((s) =>
			chuan(s.split('\n')[0]),
		);
		expect(the, `Thẻ đang có: ${the.join(' · ')}`).toEqual(CAC_THE);
	});

	test('26_010_002 — Chọn nguồn thu thì hiện thêm ô chọn đối tượng cụ thể', async ({ page }) => {
		chanNeuTat('26_010_002');

		const nhan = await nhanCacOption(page, 'Chọn nguồn thu');
		if (nhan.length === 0) test.skip(true, 'Ô "Chọn nguồn thu" không có lựa chọn nào.');

		const truoc = await khung(page).locator('.ant-select').count();
		expect(await chonOption(page, 'Chọn nguồn thu'), 'Không chọn được nguồn thu nào').toBe(true);
		await page.waitForTimeout(2_500);

		const sau = await khung(page).locator('.ant-select').count();
		expect(
			sau,
			`Chọn nguồn thu "${nhan[0]}" mà không hiện thêm ô chọn đối tượng cụ thể ` +
				`(${truoc} ô trước, ${sau} ô sau)`,
		).toBeGreaterThan(truoc);
	});

	test('26_PQ_001 — Thiếu quyền tạo thì không lập được phiếu thu', async ({ page }) => {
		chanNeuTat('26_PQ_001');
		// 🔴 Vai gdv (SHOP_SALE) KHÔNG được gán CREATE_EXPENSES_V2 (API FE dùng để lập phiếu) ⇒ đúng tiền đề
		//    "không có quyền tạo". Đo DB AUTHEN.TBL_ROLE_PERMISSION 23/09/2026.
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Quản lý phiếu thu');
		const nut = await khung(page).locator('button').allInnerTexts();
		test.info().annotations.push({ type: 'nút trên màn (vai gdv)', description: nut.map(chuan).join(' · ') });
		await expect(khung(page).getByRole('button', { name: 'Thêm phiếu thu' }), 'Vai thiếu quyền vẫn thấy nút "Thêm phiếu thu"')
			.toHaveCount(0);
		// Đường vòng: mở thẳng ?create=true (index.jsx đọc query.create) — FE KHÔNG chặn, form vẫn mở.
		// Khi đó điều kiện còn lại của kỳ vọng là API phải từ chối vì phân quyền.
		await moTrang(page, '/finance/receipt-management?create=true', VAI);
		const d = page.getByRole('dialog', { name: 'Phiếu thu tiền' });
		await d.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
		if ((await d.count()) === 0) return;
		test.info().annotations.push({ type: 'phát hiện', description: 'Vai thiếu quyền mở được form lập phiếu qua ?create=true' });
		await page.unroute('**/*'); // bỏ chặn ghi: cần phản hồi THẬT của server
		await d.getByRole('combobox', { name: 'Danh mục phiếu' }).click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
		const oNv = d.locator('.ant-form-item').filter({ has: page.locator('label', { hasText: /^Nhân viên$/ }) })
			.getByRole('combobox');
		await oNv.click();
		// 🔴 Lọc theo chữ: dropdown Danh mục vừa đóng vẫn khớp `:not(-hidden)` một nhịp.
		await page.locator('.ant-select-dropdown .ant-select-item-option').filter({ hasText: new RegExp(`^${tenGdv()}$`) }).click();
		await d.getByRole('spinbutton', { name: 'Số tiền cần thu' }).fill('1000');
		await d.getByRole('textbox', { name: 'Ghi chú' }).fill('AUTOTEST_26_PQ');
		const cho = page.waitForResponse((r) => r.url().includes('/expenses/v2/create'));
		await d.getByRole('button', { name: 'Hoàn thành' }).click();
		const res = await cho;
		const body = await res.json().catch(() => null);
		test.info().annotations.push({ type: 'phản hồi lập phiếu', description: `${res.status()} ${JSON.stringify(body?.status)}` });
		// 🔴 Nếu server NHẬN, phiếu AUTOTEST_26_PQ được test 26_DON (vai shop) dọn trong ngày.
		expect(String(body?.status?.code), 'Vai thiếu quyền lập được phiếu thu thật qua API').not.toBe('200');
		expect(String(body?.status?.code)).toMatch(/401|403/);
	});
});
