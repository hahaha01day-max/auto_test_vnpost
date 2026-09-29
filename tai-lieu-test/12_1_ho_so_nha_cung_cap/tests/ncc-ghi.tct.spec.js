'use strict';

/**
 * 12_1 Hồ sơ nhà cung cấp — chuỗi case GHI trên **một NCC tự tạo** (vai `tct`).
 *
 * Chuỗi: 020_011 thêm → 020_001 xem chi tiết → 020_012 sửa → 020_014 huỷ xoá → 020_013 xoá.
 * 🔴 Chạy theo thứ tự file (workers: 1), mọi case thao tác trên cùng NCC `AUTOTEST_NCC_<lượt>`.
 *    🚫 KHÔNG `serial`: 020_014 / 020_013 đỏ vì lệch đặc tả, `serial` sẽ bỏ luôn case sau nó.
 *    Lượt lấy từ `VNPOST_12_1_LUOT` (config đặt) ⇒ worker mới sau case đỏ vẫn trỏ đúng NCC.
 *
 * 🔴 Màn `/supplier/list` 🚫 KHÔNG có chức năng XOÁ NCC (đo 23/09/2026): cột "Hành động" chỉ có
 *    Xem chi tiết · Chỉnh sửa · Ngừng/Kích hoạt (`features/supplier/pages/TableData.jsx`). API xoá
 *    `DELETE /chain-supplier/{id}` chỉ còn được gọi từ màn cũ `pages/warehouse/supplier` (route
 *    `/inventory/warehouse-supplier`, không còn vào được). ⇒ 020_013 / 020_014 giữ NGUYÊN kỳ vọng
 *    của sheet (có nút Xoá) và ĐỎ — lệch đặc tả, 🚫 không đổi sang "Ngừng kích hoạt" cho xanh.
 * 🔴 Vì không xoá được, NCC tự tạo được **ngừng kích hoạt** ở test "dọn" cuối file (🚫 `afterAll`:
 *    nó chạy khi worker đầu kết thúc — tức ngay sau case đỏ — trước khi 020_013 kịp chạy).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chon } = require('../../00_seed/helpers');
const { chuan, dong, khung, moMan, tim } = require('./supplier-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const LUOT = process.env.VNPOST_12_1_LUOT || String(Date.now()).slice(-8);
const maNcc = `AUTOTEST_NCC_${LUOT}`;
const tenNcc = `AUTOTEST_NCC_${LUOT}`;
const tenNccSua = `${tenNcc}_SUA`;
const sdt = `09${LUOT}`;

const hop = (page) => page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();

/** Dòng của NCC tự tạo, sau khi tìm theo mã. */
async function dongNcc(page) {
	await tim(page, maNcc);
	const d = dong(page).filter({ hasText: maNcc }).first();
	await expect(d, `Không thấy NCC "${maNcc}" — case 020_011 chưa chạy?`).toBeVisible({ timeout: 20_000 });
	return d;
}

/** Nút Xoá của dòng — sheet đòi nút này; bám icon xoá hoặc tooltip/aria "Xoá". */
const nutXoa = (d) => d.locator('button:has(.anticon-delete), button[title*="Xoá"], button[title*="Xóa"]');

test.describe('12_1 — Hồ sơ nhà cung cấp (chuỗi ghi NCC)', () => {
	test('12_1_020_011 — Kiểm tra thêm mới NCC', async ({ page }) => {
		chanNeuTat('12_1_020_011');
		await moMan(page, VAI);
		await khung(page).getByRole('button', { name: 'Thêm mới' }).first().click();
		const form = hop(page);
		await expect(form.getByText('Thêm nhà cung cấp').first(), 'Không mở được form Thêm NCC').toBeVisible({ timeout: 20_000 });

		// Mười một ô bắt buộc (đo 23/09/2026) — khuôn điền giống seed bước 6.
		await form.getByPlaceholder('Nhập mã NCC').fill(maNcc);
		await form.getByPlaceholder('Nhập tên NCC').first().fill(tenNcc);
		await chon(page, form, /Tỉnh \/ Thành phố/);
		await chon(page, form, /Phường \/ Xã/);
		await chon(page, form, /Nhóm NCC/);
		// 🔴 Placeholder "Nhập số điện thoại"/"Nhập Số điện thoại" khớp cả ba ô ⇒ bám accessible name.
		await form.getByRole('textbox', { name: /^\*? ?Tên người nhận đơn/ }).fill(tenNcc);
		await form.getByRole('textbox', { name: /^\*? ?Tên người xử lí khiếu nại/ }).fill(tenNcc);
		const oSdt = form.getByRole('textbox', { name: /^\*? ?Số điện thoại/ });
		expect(await oSdt.count(), 'Form phải có 3 ô Số điện thoại (NCC · nhận đơn · khiếu nại)').toBe(3);
		for (let i = 0; i < 3; i += 1) await oSdt.nth(i).fill(sdt);
		await form.getByRole('spinbutton', { name: /Dung sai/ }).fill('0');

		const cho = page.waitForResponse(
			(r) => /\/chain-supplier(\?|$)/.test(r.url()) && r.request().method() === 'POST',
			{ timeout: 45_000 },
		);
		await form.getByRole('button', { name: 'Xác nhận' }).first().click();
		const res = await cho;
		expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400);

		// Kỳ vọng sheet: thông báo "Thêm thành công".
		await expect(page.locator('.ant-message'), 'Không hiện thông báo thêm thành công').toContainText(/Thêm.*thành công/i, { timeout: 15_000 });
		await dongNcc(page);
	});

	test('12_1_020_001 — Xem chi tiết NCC khi có dữ liệu', async ({ page }) => {
		chanNeuTat('12_1_020_001');
		await moMan(page, VAI);
		const d = await dongNcc(page);
		await d.locator('button:has(.anticon-info-circle)').first().click();
		const chiTiet = hop(page);
		await expect(chiTiet.getByText('Thông tin nhà cung cấp').first(), 'Bấm (i) không mở drawer chi tiết').toBeVisible({ timeout: 20_000 });

		// Kỳ vọng sheet: hiển thị ĐẦY ĐỦ thông tin đã nhập ⇒ đối chiếu đúng giá trị case 020_011 đã gõ.
		const noiDung = chuan(await chiTiet.innerText());
		for (const [nhan, gt] of [['Tên NCC', tenNcc], ['Mã NCC', maNcc], ['Số điện thoại', sdt], ['Người nhận đơn', tenNcc], ['Người xử lí', tenNcc]]) {
			expect(noiDung, `Chi tiết thiếu "${nhan}" = ${gt}`).toContain(`${nhan} ${gt}`);
		}
	});

	test('12_1_020_012 — Kiểm tra chỉnh sửa thông tin NCC', async ({ page }) => {
		chanNeuTat('12_1_020_012');
		await moMan(page, VAI);
		const d = await dongNcc(page);
		await d.locator('button:has(.anticon-edit)').first().click();
		const form = hop(page);
		const oTen = form.getByPlaceholder('Nhập tên NCC').first();
		await expect(oTen, 'Form sửa không nạp đúng tên NCC').toHaveValue(tenNcc, { timeout: 20_000 });
		await oTen.fill(tenNccSua);

		const cho = page.waitForResponse(
			(r) => /\/chain-supplier\/\d+(\?|$)/.test(r.url()) && r.request().method() === 'PUT',
			{ timeout: 45_000 },
		);
		await form.getByRole('button', { name: 'Xác nhận' }).first().click();
		const res = await cho;
		expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400);

		// Kỳ vọng sheet: LƯU thông tin đã nhập ⇒ tên mới phải hiện trên danh sách, 🚫 dừng ở mã 200.
		const sau = await dongNcc(page);
		await expect(sau, 'Sửa trả 200 nhưng danh sách vẫn tên cũ').toContainText(tenNccSua, { timeout: 20_000 });
	});

	test('12_1_020_014 — Kiểm tra huỷ Xoá NCC', async ({ page }) => {
		chanNeuTat('12_1_020_014');
		await moMan(page, VAI);
		const d = await dongNcc(page);
		// Sheet: bấm "Xoá" rồi "Huỷ". Màn hiện tại 🚫 có nút Xoá ⇒ đỏ = lệch đặc tả (xem đầu file).
		expect(
			await nutXoa(d).count(),
			'Màn /supplier/list không có nút Xoá NCC — cột Hành động chỉ có Xem · Sửa · Ngừng kích hoạt. Lệch đặc tả.',
		).toBeGreaterThan(0);
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'DELETE' && /chain-supplier/.test(r.url())) daGoi.push(r.url()); });
		await nutXoa(d).first().click();
		await page.locator('.ant-popconfirm:visible, .ant-popover:visible, .ant-modal-confirm').last()
			.getByRole('button', { name: /Huỷ|Hủy|Không/ }).first().click();
		expect(daGoi, 'Bấm Huỷ mà vẫn gửi request xoá NCC').toEqual([]);
		await expect(dong(page).filter({ hasText: maNcc }), 'NCC biến mất dù đã bấm Huỷ').toHaveCount(1);
	});

	test('12_1_020_013 — Kiểm tra Xoá NCC', async ({ page }) => {
		chanNeuTat('12_1_020_013');
		await moMan(page, VAI);
		const d = await dongNcc(page);
		expect(
			await nutXoa(d).count(),
			'Màn /supplier/list không có nút Xoá NCC — cột Hành động chỉ có Xem · Sửa · Ngừng kích hoạt. Lệch đặc tả.',
		).toBeGreaterThan(0);
		const cho = page.waitForResponse((r) => /chain-supplier/.test(r.url()) && r.request().method() === 'DELETE', { timeout: 30_000 });
		await nutXoa(d).first().click();
		await page.locator('.ant-popconfirm:visible, .ant-popover:visible, .ant-modal-confirm').last()
			.getByRole('button', { name: /Đồng ý|Xác nhận|OK|Xoá|Xóa/ }).first().click();
		const res = await cho;
		expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400);
		await expect(page.locator('.ant-message'), 'Không hiện thông báo xoá thành công').toContainText(/[Xx]o[áa].*thành công/, { timeout: 15_000 });
		await tim(page, maNcc);
		await expect(dong(page).filter({ hasText: maNcc }), `NCC "${maNcc}" vẫn còn sau khi xoá`).toHaveCount(0);
	});

	// 🔴 Dọn — KHÔNG phải case: màn không xoá được NCC ⇒ ngừng kích hoạt NCC tự tạo để nó rời danh
	//    sách NCC đang hoạt động (PO/công nợ chỉ chọn NCC đang hoạt động). Chạy CUỐI, sau mọi case.
	test('dọn — ngừng kích hoạt NCC tự tạo', async ({ page }) => {
		await moMan(page, VAI);
		await tim(page, maNcc);
		const d = dong(page).filter({ hasText: maNcc }).first();
		test.skip(!(await d.count()), `Không có NCC ${maNcc} để dọn (020_011 không tạo được hoặc đã xoá).`);
		const cho = page.waitForResponse((r) => /\/chain-supplier\/\d+\/status/.test(r.url()), { timeout: 30_000 });
		await d.locator('button:has(.anticon-stop)').first().click();
		await page.locator('.ant-popconfirm:visible, .ant-popover:visible').last()
			.getByRole('button', { name: /OK|Đồng ý|Xác nhận|Có/ }).first().click();
		const res = await cho;
		expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400);
	});
});
