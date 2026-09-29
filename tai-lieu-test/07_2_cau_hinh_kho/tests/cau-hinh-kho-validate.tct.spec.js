'use strict';

/**
 * 07_2 · 030 / 040 — Validate form "Bán tồn kho âm" và "Thêm cấu hình ngưỡng cảnh báo hết hạn",
 * vai `tct`. KHÔNG GHI: mọi request ghi (không phải GET) tới API cấu hình bị chặn ở mạng.
 *
 * Nguồn (vnpost-web af8cda07):
 * - `features/stockAlert/components/ExpiryAlertConfigTab.jsx` — drawer "Thêm cấu hình ngưỡng cảnh báo
 *   hết hạn": `#name` ("Nhập tên cấu hình"), `#expiryAlertDays` ("Nhập số ngày"), Đối tượng áp dụng
 *   (Toàn bộ sản phẩm / Ngành hàng — "Chọn ngành hàng" / Sản phẩm (SKU) — "Vui lòng thêm ít nhất 1 SKU").
 * - `/settings?setting=negativeStock` — MỘT form cho cả chuỗi: `#name`, `#description` (bộ đếm /200),
 *   Phạm vi áp dụng (cây đơn vị) + "Lưu cấu hình".
 * 🔴 Cả hai là cấu hình CHUỖI dùng chung ⇒ chỉ kiểm validate, 🚫 không lưu.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/__api/**', async (route) => {
		const r = route.request();
		if (r.method() === 'GET' || /refresh-token|login/.test(r.url())) return route.continue();
		if (/freeze-check|cost-preview/.test(r.url())) return route.continue();
		daGoi.push(`${r.method()} ${r.url()}`);
		return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	return daGoi;
}

const chuan = (x) => (x ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
async function loi(page, vung) {
	await page.waitForTimeout(1_500);
	return [...(await vung.locator('.ant-form-item-explain-error').allInnerTexts()), ...(await page.locator('.ant-message-notice').allInnerTexts())].map(k.chuan).join(' | ');
}

async function moFormHetHan(page) {
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=expiryAlert`, VAI);
	await khung(page).getByRole('button', { name: /Thêm cấu hình/ }).first().click();
	const d = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ hasText: 'Thêm cấu hình ngưỡng cảnh báo hết hạn' }).last();
	await expect(d).toBeVisible({ timeout: 30_000 });
	return d;
}
// Đối tượng áp dụng là Radio.Button (`.ant-radio-button-wrapper`), 🚫 không phải `.ant-radio-wrapper`.
const doiTuong = (d, nhan) => d.locator('.ant-radio-button-wrapper, .ant-radio-wrapper').filter({ hasText: nhan }).first().click();

test.describe('07_2 · 030/040 — Validate cấu hình kho (chặn ghi)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('07_2_040_001 — Chặn thêm cấu hình cảnh báo hết hạn khi bỏ trống Tên cấu hình', async ({ page }) => {
		chanNeuTat('07_2_040_001');
		const daGoi = await chanGhi(page);
		const d = await moFormHetHan(page);
		await d.locator('#expiryAlertDays').fill('30');
		await d.getByRole('button', { name: 'Lưu' }).click();
		expect(await loi(page, d)).toContain('Nhập tên cấu hình');
		expect(daGoi, 'Bỏ trống tên mà vẫn gửi request').toEqual([]);
	});

	test('07_2_040_002 — Chặn khi bỏ trống Số ngày trước hạn sử dụng', async ({ page }) => {
		chanNeuTat('07_2_040_002');
		const daGoi = await chanGhi(page);
		const d = await moFormHetHan(page);
		await d.locator('#name').fill('AUTO test het han');
		await d.locator('#expiryAlertDays').fill('');
		await d.getByRole('button', { name: 'Lưu' }).click();
		expect(await loi(page, d)).toContain('Nhập số ngày');
		expect(daGoi, 'Bỏ trống số ngày mà vẫn gửi request').toEqual([]);
	});

	test('07_2_040_003 — Chặn khi chọn đối tượng Ngành hàng mà không chọn ngành nào', async ({ page }) => {
		chanNeuTat('07_2_040_003');
		const daGoi = await chanGhi(page);
		const d = await moFormHetHan(page);
		await d.locator('#name').fill('AUTO test het han');
		await d.locator('#expiryAlertDays').fill('30');
		await doiTuong(d, 'Ngành hàng');
		await d.getByRole('button', { name: 'Lưu' }).click();
		expect(await loi(page, d)).toContain('Chọn ngành hàng');
		expect(daGoi, 'Chưa chọn ngành mà vẫn gửi request').toEqual([]);
	});

	test('07_2_040_004 — Chặn khi chọn đối tượng SKU mà chưa thêm sản phẩm', async ({ page }) => {
		chanNeuTat('07_2_040_004');
		const daGoi = await chanGhi(page);
		const d = await moFormHetHan(page);
		await d.locator('#name').fill('AUTO test het han');
		await d.locator('#expiryAlertDays').fill('30');
		await doiTuong(d, 'Sản phẩm (SKU)');
		await d.getByRole('button', { name: 'Lưu' }).click();
		expect(await loi(page, d)).toContain('Vui lòng thêm ít nhất 1 SKU');
		expect(daGoi, 'Chưa thêm SKU mà vẫn gửi request').toEqual([]);
	});

	test('07_2_040_005 — Số ngày của từng sản phẩm mặc định lấy theo số ngày chung', async ({ page }) => {
		chanNeuTat('07_2_040_005');
		await chanGhi(page);
		const { sp } = k.duLieuSeed();
		const d = await moFormHetHan(page);
		await d.locator('#expiryAlertDays').fill('30');
		await doiTuong(d, 'Sản phẩm (SKU)');
		for (const ten of [sp.fifo.tenSanPham, sp.tieuChuan.tenSanPham]) {
			const o = d.getByPlaceholder('Tìm theo tên / SKU / barcode');
			await o.fill(ten);
			await page.locator('.ant-checkbox-wrapper, label, div').filter({ hasText: new RegExp(`^${ten}$`) }).last().click();
			// 🚫 Không bấm Escape: Escape đóng luôn cả drawer. Bấm ra tiêu đề drawer để đóng popup tìm.
			await d.locator('.ant-drawer-title').click();
		}
		// Danh sách SKU đã chọn KHÔNG phải bảng antd: mỗi dòng một ô số ngày (InputNumber + "ngày").
		for (const ten of [sp.fifo.tenSanPham, sp.tieuChuan.tenSanPham]) await expect(d, `SKU ${ten} không vào danh sách`).toContainText(ten);
		const o = d.locator('.ant-input-number-input:not(#expiryAlertDays)');
		await expect(o, 'Số dòng SKU khác 2').toHaveCount(2);
		for (let i = 0; i < 2; i += 1) await expect(o.nth(i), `Dòng ${i + 1}: số ngày không lấy theo số ngày chung 30`).toHaveValue('30');
		// Sửa riêng một dòng — dòng kia không đổi.
		await o.nth(0).fill('45');
		await expect(o.nth(0)).toHaveValue('45');
		await expect(o.nth(1)).toHaveValue('30');
	});

	test('07_2_030_001 — Chặn lưu cấu hình bán tồn kho âm khi bỏ trống Tên cấu hình', async ({ page }) => {
		chanNeuTat('07_2_030_001');
		const daGoi = await chanGhi(page);
		await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=negativeStock`, VAI);
		const f = khung(page);
		await expect(f.locator('#name')).toBeVisible({ timeout: 30_000 });
		await f.locator('#name').fill('');
		await f.getByRole('button', { name: 'Lưu cấu hình' }).click();
		expect(await loi(page, f)).toContain('Vui lòng nhập tên cấu hình');
		expect(daGoi, 'Bỏ trống tên mà vẫn gửi request lưu').toEqual([]);
	});

	test('07_2_030_002 — Chặn lưu khi chưa chọn phạm vi áp dụng', async ({ page }) => {
		chanNeuTat('07_2_030_002');
		const daGoi = await chanGhi(page);
		await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=negativeStock`, VAI);
		const f = khung(page);
		await expect(f.locator('#name')).toBeVisible({ timeout: 30_000 });
		await page.waitForTimeout(2_000);
		await f.locator('#name').fill('AUTO test 07_2_030_002');
		// RegionSelector (khuôn 07_4_010_003): bấm ô tick/mixed tới khi "Đã chọn N" về 0 — chỉ đổi trên form, request lưu bị chặn.
		const dem = async () => Number((chuan(await f.getByText(/đơn vị\/điểm bán/).first().innerText().catch(() => '')).match(/\d+/) || [0])[0]);
		const truoc = await dem();
		// Đơn vị đã chọn có thể nằm ở nhánh đang thu gọn ⇒ bật "Hiển thị các đơn vị đã chọn" để mọi ô tick đều hiện.
		const hien = f.locator('label.ant-checkbox-wrapper').filter({ hasText: 'Hiển thị các đơn vị đã chọn' }).first();
		if (await hien.count()) { await hien.click(); await page.waitForTimeout(1_000); }
		for (let i = 0; i < 120 && (await dem()) > 0; i += 1) {
			const c = f.locator('label.ant-checkbox-wrapper').filter({ has: page.locator('.ant-checkbox-checked, .ant-checkbox-indeterminate') })
				.filter({ hasNotText: 'Hiển thị các đơn vị đã chọn' }).filter({ visible: true }).first();
			if (!(await c.count())) break;
			await c.click(); await page.waitForTimeout(250);
		}
		const sau = await dem();
		const tb = new Set();
		const nghe = setInterval(async () => { for (const t of await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])) tb.add(chuan(t)); }, 200);
		await f.getByRole('button', { name: 'Lưu cấu hình' }).click();
		await page.waitForTimeout(2_000);
		clearInterval(nghe);
		const tt = [...tb, await loi(page, f)].filter(Boolean).join(' | ');
		test.info().annotations.push({ type: 'đo', description: `đã chọn ${truoc} → ${sau} · thông báo "${tt}" · request ghi ${JSON.stringify(daGoi)}` });
		expect(sau, '🔴 Bộ đếm còn đơn vị đã chọn nhưng không ô nào hiện để bỏ (kể cả bật "Hiển thị các đơn vị đã chọn") — đơn vị ma').toBe(0);
		expect(tt).toContain('Vui lòng chọn ít nhất một phạm vi áp dụng');
		expect(daGoi, 'Không có phạm vi mà vẫn gửi request lưu').toEqual([]);
	});

	test('07_2_030_003 — Ô Mô tả giới hạn 200 ký tự', async ({ page }) => {
		chanNeuTat('07_2_030_003');
		await chanGhi(page);
		await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=negativeStock`, VAI);
		const o = khung(page).locator('#description');
		await expect(o).toBeVisible({ timeout: 30_000 });
		await o.fill('x'.repeat(250));
		const v = await o.inputValue();
		expect(v.length, 'Ô Mô tả nhận quá 200 ký tự').toBe(200);
		await expect(khung(page), 'Bộ đếm không hiện 200 / 200').toContainText('200 / 200');
	});

	test('07_2_010_007 — Bộ lọc phạm vi áp dụng ở màn Khoá kho', async ({ page }) => {
		chanNeuTat('07_2_010_007');
		await chanGhi(page);
		await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=stockFreeze`, VAI);
		const f = khung(page);
		await expect(f.getByRole('button', { name: 'Thêm cấu hình khoá kho' })).toBeVisible({ timeout: 30_000 });
		// Đo 24/09/2026: khối "Danh sách cấu hình khoá kho" chỉ có bảng + nút thêm, KHÔNG có ô lọc nào
		// (ô "Tìm kiếm cấu hình" duy nhất là ô tìm MENU nhóm cấu hình bên trái).
		// Vùng nội dung của nhóm = thẻ đang mở chứa bảng cấu hình (đo: ô nhập/chọn trong vùng = 0).
		await expect(f.locator('.ant-table-wrapper').first()).toBeVisible();
		const vung = f.locator('.ant-tabs-tabpane-active').filter({ has: page.locator('.ant-table-wrapper') }).last();
		const oLoc = vung.locator('input, .ant-select, .ant-picker');
		test.info().annotations.push({ type: 'đo', description: `ô lọc trong vùng danh sách: ${await oLoc.count()}` });
		expect(await oLoc.count(), 'Màn Khoá kho không có bộ lọc phạm vi áp dụng').toBeGreaterThan(0);
	});

	test('07_2_010_008 — Tìm kiếm theo tên danh mục ở màn Khoá kho', async ({ page }) => {
		chanNeuTat('07_2_010_008');
		await chanGhi(page);
		const dm = require('../../00_seed/seed-state').doc().duLieu.sanPham.tenDanhMuc;
		await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=stockFreeze`, VAI);
		await khung(page).getByRole('button', { name: 'Thêm cấu hình khoá kho' }).click();
		const d = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm cấu hình khoá kho' }).last();
		await d.locator('.ant-tabs-tab').filter({ hasText: 'Danh mục / SKU' }).locator('.ant-tabs-tab-btn').dispatchEvent('click');
		await d.locator('.ant-radio-wrapper').filter({ hasText: 'Theo danh mục' }).click();
		await d.getByPlaceholder('Tìm kiếm danh mục').fill(dm.slice(0, -2));
		await page.waitForTimeout(2_500);
		await expect(d, `Tìm "${dm.slice(0, -2)}" không ra danh mục ${dm}`).toContainText(dm);
	});

	test('07_2_010_011 — Tìm kiếm theo tên sản phẩm ở màn Khoá kho', async ({ page }) => {
		chanNeuTat('07_2_010_011');
		await chanGhi(page);
		const ten = k.duLieuSeed().sp.tieuChuan.tenSanPham;
		await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=stockFreeze`, VAI);
		await khung(page).getByRole('button', { name: 'Thêm cấu hình khoá kho' }).click();
		const d = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm cấu hình khoá kho' }).last();
		await d.locator('.ant-tabs-tab').filter({ hasText: 'Danh mục / SKU' }).locator('.ant-tabs-tab-btn').dispatchEvent('click');
		await d.locator('.ant-radio-wrapper').filter({ hasText: 'Theo SKU' }).click();
		const cho = page.waitForResponse((r) => r.url().includes('basic-search-product-unit') && r.url().includes('productName='), { timeout: 30_000 });
		await d.getByPlaceholder('Tìm mã SKU hoặc tên sản phẩm').fill(ten);
		const b = await (await cho).json();
		// BE tìm theo TỪ ⇒ chỉ kiểm SP có đúng tên nằm trong kết quả, 🚫 không đòi mọi dòng chứa nguyên văn.
		expect((b.data || []).map((x) => x.productName), `Tìm "${ten}" không ra SP đó`).toContain(ten);
		await expect(page.getByText(ten, { exact: true }).last()).toBeVisible();
	});
});
