'use strict';

/**
 * 12_3 — Công nợ NCC (`/debt-reconciliation/supplier-debt`) trên `AUTO8_NCC`, vai `tct`.
 *
 * Tiền đề: 00_seed bước 12 — điều chỉnh TĂNG 1.000.000 đ phải trả `AUTO8_NCC` tại đơn vị "DC TỔNG CÔNG TY" (đã duyệt).
 * 🔴 Đo 24/09/2026: danh sách ghi Còn nợ 1.000.000 đ nhưng drawer chi tiết "Tổng còn nợ: 0 đ", ba tab lịch sử trống,
 *    form Thanh toán "Nợ hiện tại" = 0 (max ô số tiền = nợ hiện tại) ⇒ KHÔNG thanh toán được khoản điều chỉnh.
 *    Nhóm case thanh toán/gạch nợ THÀNH CÔNG cần nợ sinh từ PO nhập hàng thật (13_3) ⇒ `_blocked`.
 * 🔴 Chỉ có nút "Thanh toán" — "Gạch nợ" / "Ghi nợ" không có lối vào trên UI (ModalDebt.jsx) ⇒ case của hai loại
 *    này kiểm sự có mặt, đỏ kèm lý do. Xuất Excel bị comment-out.
 * Nguồn (vnpost-web af8cda07): `features/supplierDebt/pages/{ShopDebtSupplierPage,ModalDebt,ModalCreateDebt}.jsx`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const so = (t) => Number(String(t ?? '').replace(/[^\d-]/g, '')) || 0;
const khung = (page) => page.locator('.ant-pro-page-container').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const NCC = () => seed.doc().duLieu.nhaCungCap.tenNcc;

async function moMan(page) {
	const cho = page.waitForResponse((r) => r.url().includes('/shops/supplier-debt/list'), { timeout: 60_000 }).catch(() => null);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/debt-reconciliation/supplier-debt`, 'tct');
	await cho;
	await expect(khung(page)).toContainText('Công nợ NCC', { timeout: 30_000 });
}

async function tim(page, tu) {
	const o = khung(page).getByPlaceholder(/Tìm/).first();
	const cho = page.waitForResponse((r) => r.url().includes('/shops/supplier-debt/list'), { timeout: 20_000 }).catch(() => null);
	await o.fill(tu);
	await o.press('Enter');
	await cho;
	await page.waitForTimeout(1_000);
	return dong(page).filter({ hasText: tu });
}

async function moChiTiet(page) {
	await moMan(page);
	const r = (await tim(page, NCC())).first();
	await expect(r, `Danh sách không có ${NCC()} (00_seed bước 12)`).toBeVisible({ timeout: 20_000 });
	const conNo = so((await r.locator('td').allInnerTexts()).slice(-2)[0]);
	await r.getByRole('button', { name: 'Chi tiết' }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: `Lịch sử ghi nợ và thanh toán - ${NCC()}` }).last();
	await expect(dr).toBeVisible({ timeout: 20_000 });
	await page.waitForTimeout(1_500);
	return { dr, conNo };
}

async function moThanhToan(page, dr) {
	await dr.getByRole('button', { name: 'Thanh toán' }).click();
	const m = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').filter({ hasText: 'Thanh toán nợ nhà cung cấp' }).last();
	await expect(m).toBeVisible();
	return m;
}

async function thongBaoQuanh(page, fn) {
	const tb = page.locator('.ant-message-notice').first().waitFor({ timeout: 8_000 }).then(() => page.locator('.ant-message-notice').allInnerTexts()).catch(() => []);
	await fn();
	return chuan((await tb).join(' | '));
}

async function chanGhi(page) {
	const bi = [];
	await page.route('**/__api/**', (route) => {
		const r = route.request();
		if (r.method() !== 'GET' && /supplier|debt/.test(r.url())) { bi.push(`${r.method()} ${r.url().replace(/.*__api/, '')}`); return route.fulfill({ status: 403, contentType: 'application/json', body: '{"status":{"code":"403","message":"Bị auto test chặn"}}' }); }
		return route.continue();
	});
	return bi;
}

test.describe('12_3 · công nợ NCC (tct)', () => {
	test('12_3_030_001 — Kiểm tra giao diện', async ({ page }) => {
		chanNeuTat('12_3_030_001');
		await moMan(page);
		const th = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);
		test.info().annotations.push({ type: 'đo', description: th.join(' · ') });
		await expect(khung(page).getByPlaceholder(/Tìm/).first()).toBeVisible();
		expect(th).toEqual(expect.arrayContaining(['Nhà cung cấp', 'Đã thanh toán', 'Còn nợ', 'Thao tác']));
	});

	test('12_3_030_002 — Kiểm tra tìm kiếm tên NCC', async ({ page }) => {
		chanNeuTat('12_3_030_002');
		await moMan(page);
		const r = await tim(page, NCC());
		await expect(r).toHaveCount(await dong(page).count());
		expect(await r.count(), `Tìm "${NCC()}" không ra dòng nào`).toBeGreaterThan(0);
	});

	test('12_3_030_003 — Kiểm tra phân trang', async ({ page }) => {
		chanNeuTat('12_3_030_003');
		await moMan(page);
		const truoc = (await dong(page).allInnerTexts()).map(chuan);
		const cho = page.waitForResponse((r) => r.url().includes('/shops/supplier-debt/list'), { timeout: 20_000 });
		await khung(page).locator('.ant-pagination-item-2').click();
		const res = await cho;
		await page.waitForTimeout(1_000);
		const sau = (await dong(page).allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'đo', description: res.url().replace(/.*__api/, '') });
		expect(sau.length).toBeGreaterThan(0);
		expect(sau[0], 'Sang trang 2 mà dữ liệu y trang 1').not.toBe(truoc[0]);
	});

	async function kiemTabCt(page, id, tab) {
		chanNeuTat(id);
		const { dr } = await moChiTiet(page);
		const cho = page.waitForResponse((r) => r.url().includes('/shops/supplier-debt/history'), { timeout: 20_000 }).catch(() => null);
		await dr.getByRole('tab', { name: tab }).click();
		const res = await cho;
		test.info().annotations.push({ type: 'đo', description: `${res?.url().replace(/.*__api/, '')} → ${(await dr.locator('.ant-table-tbody tr.ant-table-row').count())} dòng` });
		// "Lịch sử ghi nợ" là tab MẶC ĐỊNH — bấm lại không gọi API, chỉ kiểm khi có request.
		if (res) expect(res.status()).toBe(200);
		await expect(dr.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
		if (tab === 'Lịch sử ghi nợ') expect(await dr.locator('.ant-table-tbody tr.ant-table-row').count(), '🔴 Khoản điều chỉnh tăng nợ 1.000.000 đã duyệt không hiện trong "Lịch sử ghi nợ"').toBeGreaterThan(0);
	}
	test('12_3_020_018 — Kiểm tra tab Lịch sử thanh toán', async ({ page }) => { await kiemTabCt(page, '12_3_020_018', 'Lịch sử thanh toán'); });
	test('12_3_020_019 — Kiểm tra tab Lịch sử ghi nợ', async ({ page }) => { await kiemTabCt(page, '12_3_020_019', 'Lịch sử ghi nợ'); });
	test('12_3_020_020 — Kiểm tra tab Lịch sử trả hàng NCC', async ({ page }) => { await kiemTabCt(page, '12_3_020_020', 'Lịch sử trả hàng NCC'); });

	test('12_3_020_021 — Đối chiếu tổng còn nợ', async ({ page }) => {
		chanNeuTat('12_3_020_021');
		const { dr, conNo } = await moChiTiet(page);
		const tong = so((chuan(await dr.innerText()).match(/Tổng còn nợ:\s*([\d.,]+)/) || [])[1]);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ conNoDanhSach: conNo, tongConNoChiTiet: tong }) });
		expect(conNo, 'Danh sách không có nợ để đối chiếu').toBeGreaterThan(0);
		expect(tong, '🔴 "Tổng còn nợ" ở chi tiết ≠ "Còn nợ" ở danh sách (khoản điều chỉnh không vào chi tiết)').toBe(conNo);
	});

	test('12_3_020_004 — Thanh toán lớn hơn số nợ', async ({ page }) => {
		chanNeuTat('12_3_020_004');
		const bi = await chanGhi(page);
		const { dr, conNo } = await moChiTiet(page);
		const m = await moThanhToan(page, dr);
		const noHienTai = so(await m.locator('#allDebt').inputValue());
		const o = m.getByPlaceholder('Số tiền thanh toán');
		await o.fill(String(conNo + 500_000));
		await o.press('Tab');
		const sauNhap = so(await o.inputValue());
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ conNoDanhSach: conNo, noHienTai, sauNhap, daGui: bi }) });
		expect(sauNhap, 'Nhập vượt số nợ mà không tự về số nợ hiện tại').toBe(noHienTai);
		expect(noHienTai, '🔴 "Nợ hiện tại" của form Thanh toán ≠ Còn nợ ở danh sách').toBe(conNo);
	});

	test('12_3_020_016 — Ghi nợ số tiền bằng 0', async ({ page }) => {
		chanNeuTat('12_3_020_016');
		const { dr } = await moChiTiet(page);
		const nut = await dr.getByRole('button', { name: /Ghi nợ/ }).count();
		test.info().annotations.push({ type: 'đo', description: `nút Ghi nợ: ${nut}; nút có: ${(await dr.getByRole('button').allInnerTexts()).join(' | ')}` });
		expect(nut, '🔴 Không còn nút "Ghi nợ" trên chi tiết công nợ (chỉ có Thanh toán) — ModalCreateDebt vẫn có luồng DEBT nhưng không có lối vào').toBeGreaterThan(0);
	});

	async function kiemNut(page, id, nhan) {
		chanNeuTat(id);
		const { dr } = await moChiTiet(page);
		const nut = await dr.getByRole('button', { name: new RegExp(nhan) }).count();
		test.info().annotations.push({ type: 'đo', description: `nút có: ${(await dr.getByRole('button').allInnerTexts()).join(' | ')}` });
		expect(nut, `🔴 Không có nút "${nhan}" trên chi tiết công nợ NCC`).toBeGreaterThan(0);
	}
	test('12_3_020_009 — Gạch nợ (lối vào)', async ({ page }) => { await kiemNut(page, '12_3_020_009', 'Gạch nợ'); });
	test('12_3_020_013 — Ghi nợ (lối vào)', async ({ page }) => { await kiemNut(page, '12_3_020_013', 'Ghi nợ'); });
	test('12_3_020_015 — Ghi nợ (lối vào)', async ({ page }) => { await kiemNut(page, '12_3_020_015', 'Ghi nợ'); });

	test('12_3_020_027 — Xuất Excel lịch sử công nợ', async ({ page }) => {
		chanNeuTat('12_3_020_027');
		const { dr } = await moChiTiet(page);
		const nut = await dr.getByRole('button', { name: /Xuất excel/i }).count();
		expect(nut, '🔴 Nút "Xuất excel" lịch sử công nợ đã bị comment-out (ModalDebt.jsx)').toBeGreaterThan(0);
	});
});
