'use strict';

/**
 * Phân hệ 14_1 — Lập phiếu xuất trả NCC, phần ĐỌC (vai `shop`).
 *
 * 🔴 Lập / duyệt phiếu trả là **xuất hàng thật khỏi kho** và sinh công nợ NCC ⇒ mọi case ghi giữ
 * `allowMutation: false`. Cả file 🚫 KHÔNG ghi: bọc `chanGhi()`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { traPhieuNhap, ROUTE_TAO, chanGhi, chuan, cot, dong, khung, moDanhSach, moFormTao } = require('./return-page');

const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('14_1 — Lập phiếu xuất trả NCC', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moDanhSach(page, VAI);
	});

	test('14_1_010_001 — Màn Tạo phiếu xuất trả mở đủ trường bắt buộc', async ({ page }) => {
		chanNeuTat('14_1_010_001');

		const box = await moFormTao(page);
		if (!box) test.skip(true, 'Vai điểm bán không thấy nút "Tạo phiếu trả" trên màn.');

		expect(page.url(), `URL sau khi bấm: ${page.url()}`).toContain(ROUTE_TAO);
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Tạo phiếu xuất trả nhà cung cấp',
		);

		const nhan = (await box.locator('.ant-form-item-label label').allInnerTexts()).map(chuan);
		for (const o of ['Mã phiếu nhập / chuyển kho', 'Lý do trả hàng']) {
			expect(nhan, `Form thiếu ô "${o}"; đang có: ${nhan.join(' · ')}`).toContain(o);
		}
	});

	test('14_1_010_002 — Nguồn hàng mặc định là Theo phiếu nhập kho', async ({ page }) => {
		chanNeuTat('14_1_010_002');

		const box = await moFormTao(page);
		if (!box) test.skip(true, 'Vai điểm bán không thấy nút "Tạo phiếu trả" trên màn.');

		const noi = chuan(await box.innerText());
		expect(noi, 'Form không có lựa chọn "Theo phiếu nhập kho"').toContain('Theo phiếu nhập kho');
		expect(noi, 'Form không có lựa chọn "Theo SKU / Mã lô / Serial"').toContain(
			'Theo SKU / Mã lô / Serial',
		);

		// Nguồn mặc định phải là "Theo phiếu nhập kho" ⇒ ô nhập là mã phiếu nhập/chuyển kho.
		await expect(
			box.locator('input[placeholder="Nhập mã phiếu nhập/chuyển kho"]'),
			'Nguồn mặc định KHÔNG phải "Theo phiếu nhập kho" — không thấy ô nhập mã phiếu',
		).toBeVisible();
	});

	test('14_1_010_003 — Đổi nguồn sang Theo SKU / Mã lô / Serial thì đổi bộ ô nhập', async ({
		page,
	}) => {
		chanNeuTat('14_1_010_003');

		const box = await moFormTao(page);
		if (!box) test.skip(true, 'Vai điểm bán không thấy nút "Tạo phiếu trả" trên màn.');

		const truoc = (await box.locator('input[placeholder]').evaluateAll((l) =>
			l.map((e) => e.placeholder),
		)).join(' | ');

		await box.getByText('Theo SKU / Mã lô / Serial', { exact: true }).first().click({ force: true });
		await page.waitForTimeout(2_500);

		const sau = (await box.locator('input[placeholder]').evaluateAll((l) =>
			l.map((e) => e.placeholder),
		)).join(' | ');

		expect(
			sau,
			`Đổi nguồn hàng mà bộ ô nhập KHÔNG đổi. Trước: "${truoc}" — sau: "${sau}"`,
		).not.toBe(truoc);
	});

	test('14_1_010_006 — Tra mã phiếu nhập toàn khoảng trắng không gọi API', async ({ page }) => {
		chanNeuTat('14_1_010_006');
		const { daGoi } = await chanGhi(page);

		const box = await moFormTao(page);
		if (!box) test.skip(true, 'Vai điểm bán không thấy nút "Tạo phiếu trả" trên màn.');

		const goi = [];
		page.on('request', (r) => {
			if (/import|stock\/v2/.test(r.url())) goi.push(r.url());
		});

		const o = box.locator('input[placeholder="Nhập mã phiếu nhập/chuyển kho"]');
		await o.fill('     ');
		await box.getByRole('button', { name: 'Tìm' }).first().click({ force: true });
		await page.waitForTimeout(3_000);

		expect(
			goi.filter((u) => /search|find|import/i.test(u)),
			`Mã phiếu toàn khoảng trắng mà vẫn gọi API tra cứu: ${goi.join(' ; ')}`,
		).toEqual([]);
		expect(daGoi, 'Tra cứu mà đã gửi request ghi').toEqual([]);
	});

	test('14_1_010_005 — Tra mã phiếu nhập không tồn tại bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_005');

		const box = await moFormTao(page);
		if (!box) test.skip(true, 'Vai điểm bán không thấy nút "Tạo phiếu trả" trên màn.');

		// Thông báo antd tự tắt sau 3s ⇒ bắt ngay lúc hiện (`traPhieuNhap` dùng thongBaoQuanh).
		const tb = await traPhieuNhap(page, box, 'ZZZ-KHONG-TON-TAI-999');
		expect(tb, 'Tra mã phiếu KHÔNG tồn tại mà màn không báo gì').toContain(
			'Không tìm thấy phiếu nhập/chuyển kho với mã đã nhập',
		);
		await expect(box.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(0);
	});
});
