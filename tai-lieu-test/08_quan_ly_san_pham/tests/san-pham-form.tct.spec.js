'use strict';

/**
 * 08 · 020 / 070 / 080 — Form Thêm sản phẩm, Nhập từ Excel, In tem nhãn — vai `tct`, CHỈ ĐỌC
 * (mọi request ghi sản phẩm/danh mục bị chặn bằng `chanGhi()`).
 *
 * Đo DOM 24/09/2026 (vnpost-web af8cda07): drawer Thêm sản phẩm có 6 khối "Thông tin cơ bản ·
 * Biến thể & Đơn vị quy đổi · Bảng quy đổi đơn vị · Kho hàng · Thông tin vật lý · Thông tin bổ sung";
 * "Hình thức phân phối" là radio Mua bán / Ký gửi; nút "Xác nhận". Thanh tiêu đề màn có nút
 * "Nhập từ Excel" trực tiếp (🚫 không nằm trong "Xem thêm").
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, khung, moSanPham } = require('./product-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

async function moFormThem(page) {
	await moSanPham(page, VAI);
	await khung(page).getByRole('button', { name: 'Thêm mới' }).first().click({ force: true });
	const dr = page.locator('.ant-drawer-open').filter({ has: page.getByPlaceholder('Tên sản phẩm', { exact: true }) }).last();
	await expect(dr.getByPlaceholder('Tên sản phẩm', { exact: true })).toBeVisible({ timeout: 30_000 });
	return dr;
}

test.describe('08 — Form sản phẩm (chỉ đọc)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('08_020_002 — Thêm sản phẩm - kiểm tra thông tin vật lý, giá bán, kho hàng', async ({ page }) => {
		chanNeuTat('08_020_002');
		const { daGoi } = await chanGhi(page);
		const dr = await moFormThem(page);
		const khoi = (await dr.locator('.ant-collapse-header, .ant-card-head-title, .font-medium, .font-semibold').allInnerTexts()).map(chuan);
		for (const k of ['Thông tin cơ bản', 'Biến thể & Đơn vị quy đổi', 'Kho hàng', 'Thông tin vật lý', 'Thông tin bổ sung']) {
			expect(khoi, `Form thiếu khối "${k}"`).toContain(k);
		}
		// Ô số của Thông tin vật lý nhận số, bỏ chữ.
		const nhan = (await dr.locator('label').allInnerTexts()).map(chuan);
		for (const o of ['Khối lượng', 'Thể tích', 'Chiều dài', 'Chiều rộng', 'Chiều cao', 'Phương pháp tính giá vốn']) {
			expect(nhan, `Form thiếu ô "${o}"`).toContain(o);
		}
		const oKl = dr.locator('.ant-form-item').filter({ hasText: /^Khối lượng/ }).locator('input').first();
		await oKl.fill('');
		await oKl.pressSequentially('12abc');
		await oKl.blur();
		test.info().annotations.push({ type: 'đo', description: `Khối lượng gõ "12abc" → "${await oKl.inputValue()}"` });
		expect(await oKl.inputValue(), 'Ô Khối lượng nhận ký tự chữ').not.toMatch(/[a-z]/i);
		expect(daGoi).toEqual([]);
	});

	test('08_020_003 — Thêm sản phẩm - validate form rỗng', async ({ page }) => {
		chanNeuTat('08_020_003');
		const { daGoi } = await chanGhi(page);
		const dr = await moFormThem(page);
		const tb = page.locator('.ant-message-notice').filter({ hasText: 'Vui lòng điền đầy đủ các thông tin được yêu cầu' }).first()
			.waitFor({ state: 'attached', timeout: 10_000 }).then(() => true, () => false);
		await dr.getByRole('button', { name: 'Xác nhận', exact: true }).click();
		const coTb = await tb;
		await page.waitForTimeout(1_500);
		const loi = (await dr.locator('.ant-form-item-has-error .ant-form-item-label, .ant-form-item-has-error label').allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'đo', description: `thông báo chung: ${coTb}; ô báo đỏ: ${[...new Set(loi)].join(' · ')}` });
		expect(coTb, 'Không có thông báo "Vui lòng điền đầy đủ các thông tin được yêu cầu"').toBe(true);
		for (const o of ['Tên sản phẩm', 'Danh mục', 'SKU', 'Mã barcode', 'Mã kế toán', 'VAT', 'Đơn vị']) {
			expect(loi.some((x) => x.startsWith(o)), `Ô "${o}" không báo đỏ khi bỏ trống`).toBe(true);
		}
		expect(daGoi, 'Form rỗng mà vẫn gửi request tạo').toEqual([]);
	});

	test('08_020_004 — Thêm sản phẩm - chọn Ký gửi hiển thị Loại hàng ký gửi', async ({ page }) => {
		chanNeuTat('08_020_004');
		await chanGhi(page);
		const dr = await moFormThem(page);
		const radio = (t) => dr.locator('.ant-radio-wrapper').filter({ hasText: new RegExp(`^${t}$`) }).first();
		const oLoai = dr.locator('label').filter({ hasText: /Loại hàng ký gửi/ });
		await radio('Mua bán').click();
		await expect(oLoai, 'Hình thức Mua bán mà vẫn hiện "Loại hàng ký gửi"').toHaveCount(0);
		await radio('Ký gửi').click();
		await expect(oLoai.first(), 'Chọn Ký gửi mà không hiện "Loại hàng ký gửi"').toBeVisible({ timeout: 10_000 });
		await radio('Mua bán').click();
		await expect(oLoai, 'Đổi lại Mua bán mà "Loại hàng ký gửi" không ẩn').toHaveCount(0);
	});

	test('08_070_001 — Nhập sản phẩm từ Excel - mở drawer import', async ({ page }) => {
		chanNeuTat('08_070_001');
		await chanGhi(page);
		await moSanPham(page, VAI);
		await khung(page).getByRole('button', { name: 'Nhập từ Excel' }).first().click({ force: true });
		const d = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await expect(d).toBeVisible({ timeout: 20_000 });
		const chu = chuan(await d.innerText());
		test.info().annotations.push({ type: 'đo', description: chu.slice(0, 300) });
		expect(chu, 'Thiếu thẻ Nhập file').toContain('Nhập file');
		expect(chu, 'Thiếu thẻ Lịch sử nhập').toContain('Lịch sử nhập');
		await expect(d.getByRole('button', { name: /Tải về file mẫu/ }), 'Thiếu nút Tải về file mẫu').toBeVisible();
		expect(chu, 'Thiếu vùng kéo thả chọn file').toMatch(/Kéo thả|bấm để chọn file/i);
	});

	test('08_070_002 — Nhập sản phẩm từ Excel - validate chưa chọn file', async ({ page }) => {
		chanNeuTat('08_070_002');
		const { daGoi } = await chanGhi(page);
		await moSanPham(page, VAI);
		await khung(page).getByRole('button', { name: 'Nhập từ Excel' }).first().click({ force: true });
		const d = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await expect(d).toBeVisible({ timeout: 20_000 });
		const nut = d.getByRole('button', { name: /^(Nhập|Nhập dữ liệu|Tải lên|Import)/ }).last();
		const khoa = await nut.isDisabled().catch(() => true);
		let tb = '';
		if (!khoa) {
			await nut.click();
			await page.waitForTimeout(1_500);
			tb = chuan((await page.locator('.ant-message-notice, .ant-form-item-explain-error').allInnerTexts()).join(' | '));
		}
		const chu = chuan(await d.innerText());
		test.info().annotations.push({ type: 'đo', description: `nút nhập khoá=${khoa}; thông báo: ${tb}; mô tả: ${chu.slice(0, 250)}` });
		expect(khoa || /chưa chọn|chọn file|chọn tệp/i.test(tb), 'Chưa chọn file mà vẫn cho nhập, không báo').toBe(true);
		expect(daGoi.filter((x) => /import/i.test(x)), 'Chưa chọn file mà đã chạy tiến trình nhập').toEqual([]);
		expect(chu, 'Không ghi rõ chỉ nhận .xls/.xlsx').toMatch(/xlsx?/i);
	});

});
