'use strict';

/**
 * 20 · Validate form chương trình tích điểm / đổi điểm, vai `shop`.
 *
 * 🔴 Chuỗi test đã có sẵn cả hai chương trình ⇒ 🚫 không còn form **Thêm**; các phép kiểm chạy
 * trên form **Cập nhật** (cùng component). `chanGhi()` chặn mọi request lưu — case chỉ kiểm
 * validate phía client, 🚫 tuyệt đối không đổi cấu hình tích điểm của chuỗi.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, hopForm, khung, loiDangHien, moFormCapNhat, moMan, moThe } =
	require('./loyalty-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const oTien = (hop) => hop.locator('#orderAmountPerPoint');
const nutXacNhan = (hop) => hop.getByRole('button', { name: 'Xác nhận' }).first();

test.describe('20 · Form chương trình tích điểm', () => {
	let chan;
	test.beforeEach(async ({ page }) => {
		chan = await chanGhi(page);
		await moMan(page, VAI);
	});

	test('20_010_019 — Nhập tỷ lệ tích điểm âm', async ({ page }) => {
		chanNeuTat('20_010_019');

		const hop = await moFormCapNhat(page, 0);
		expect(hop, 'Không mở được form chương trình tích điểm').not.toBeNull();

		await oTien(hop).fill('-5000');
		await oTien(hop).blur();
		await page.waitForTimeout(1_000);

		const gt = await oTien(hop).inputValue();
		// `InputCurrency` khai `min=0` ⇒ giá trị âm 🚫 không được tồn tại trong ô.
		expect(gt, `Ô Số tiền chi tiêu giữ nguyên giá trị âm "${gt}"`).not.toMatch(/^-/);
	});

	test('20_010_021 — Gõ chữ vào ô Số tiền chi tiêu', async ({ page }) => {
		chanNeuTat('20_010_021');

		const hop = await moFormCapNhat(page, 0);
		expect(hop).not.toBeNull();

		await oTien(hop).fill('');
		await oTien(hop).type('abc');
		await page.waitForTimeout(800);

		const gt = await oTien(hop).inputValue();
		expect(gt, `Ô số nhận cả ký tự chữ: "${gt}"`).not.toMatch(/[a-zA-Z]/);
	});

	test('20_010_020 — Bỏ trống riêng ô Số tiền chi tiêu', async ({ page }) => {
		chanNeuTat('20_010_020');

		const hop = await moFormCapNhat(page, 0);
		expect(hop).not.toBeNull();

		await oTien(hop).fill('');
		await oTien(hop).blur();
		await nutXacNhan(hop).click();
		await page.waitForTimeout(3_000);

		const loi = await loiDangHien(page);
		test.info().annotations.push({
			type: 'thông báo thật',
			description: loi.join(' | ') || '(không có thông báo nào)',
			});
		// 🔴 Kịch bản chốt theo code: validator khai sai chữ ký `(value)` trong khi antd truyền
		//    `(rule, value)` ⇒ điều kiện không bao giờ đúng, form KHÔNG chặn và vẫn gửi API.
		//    `chanGhi()` đã chặn ở tầng mạng nên dữ liệu thật an toàn; `daGoi` chính là bằng chứng.
		expect(
			loi.some((s) => /số tiền chi tiêu/i.test(s)) || chan.daGoi.length === 0,
			`Bỏ trống Số tiền chi tiêu mà form KHÔNG cảnh báo và VẪN gửi request lưu: ` +
				`${chan.daGoi.join(' ; ')}. Nếu chặn ghi tắt, cấu hình tích điểm toàn chuỗi đã bị đổi.`,
		).toBe(true);
	});

	test('20_010_002 — Bấm Xác nhận khi chưa nhập gì ở form tích điểm', async ({ page }) => {
		chanNeuTat('20_010_002');

		const hop = await moFormCapNhat(page, 0);
		expect(hop).not.toBeNull();

		const oNgay = hop.locator('#dates');
		await oNgay.click();
		await oNgay.fill('');
		// 🔴 Panel lịch của antd che nút Xác nhận ⇒ phải đóng panel rồi mới bấm, nếu không là
		//    "click timeout" chẳng liên quan gì tới điều case đang kiểm.
		await page.keyboard.press('Escape');
		await page.locator('.ant-drawer-title, .ant-modal-title').first().click({ force: true });
		await page.waitForTimeout(800);
		await nutXacNhan(hop).click({ force: true });
		await page.waitForTimeout(3_000);

		const loi = await loiDangHien(page);
		test.info().annotations.push({
			type: 'thông báo thật',
			description: loi.join(' | ') || '(không có thông báo nào)',
		});
		expect(
			loi.length,
			'Xoá rỗng thời gian áp dụng rồi Xác nhận mà form không cảnh báo gì',
		).toBeGreaterThan(0);
		expect(
			chan.daGoi,
			`Form thiếu dữ liệu bắt buộc mà vẫn gửi request lưu: ${chan.daGoi.join(' ; ')}`,
		).toEqual([]);
	});

	test('20_010_030 — Bấm Hủy giữa chừng khi đang tạo chương trình tích điểm', async ({ page }) => {
		chanNeuTat('20_010_030');

		const hop = await moFormCapNhat(page, 0);
		expect(hop).not.toBeNull();

		const truoc = await oTien(hop).inputValue();
		await oTien(hop).fill('987654');
		await hop.getByRole('button', { name: /Hủy|Huỷ/ }).first().click();
		await page.waitForTimeout(2_500);

		expect(chan.daGoi, `Bấm Hủy mà vẫn gửi request: ${chan.daGoi.join(' ; ')}`).toEqual([]);

		const lai = await moFormCapNhat(page, 0);
		expect(lai, 'Không mở lại được form').not.toBeNull();
		expect(
			await oTien(lai).inputValue(),
			'Mở lại form vẫn giữ giá trị nháp đã bỏ',
		).toBe(truoc);
	});

	test('20_020_004 — Nhập tỷ lệ đổi điểm bằng 0', async ({ page }) => {
		chanNeuTat('20_020_004');

		const hop = await moFormCapNhat(page, 1);
		expect(hop, 'Không mở được form chương trình đổi điểm').not.toBeNull();

		await oTien(hop).fill('0');
		await oTien(hop).blur();
		await nutXacNhan(hop).click();
		await page.waitForTimeout(3_000);

		const loi = await loiDangHien(page);
		test.info().annotations.push({
			type: 'thông báo thật',
			description: loi.join(' | ') || '(không có thông báo nào)',
		});
		expect(
			loi.some((s) => /lớn hơn 0/i.test(s)),
			`Nhập tỷ lệ 0 mà không có cảnh báo "Số tiền chi tiêu phải lớn hơn 0". ` +
				`Thông báo đang có: ${loi.join(' | ') || '(không có)'}`,
		).toBe(true);
		expect(chan.daGoi, `Tỷ lệ 0 mà vẫn gửi request: ${chan.daGoi.join(' ; ')}`).toEqual([]);
	});

	test('20_020_005 — Nhập tỷ lệ đổi điểm âm', async ({ page }) => {
		chanNeuTat('20_020_005');

		const hop = await moFormCapNhat(page, 1);
		expect(hop).not.toBeNull();

		await oTien(hop).fill('-1000');
		await oTien(hop).blur();
		await page.waitForTimeout(800);
		expect(
			await oTien(hop).inputValue(),
			'Ô đổi điểm giữ nguyên giá trị âm',
		).not.toMatch(/^-/);

		await nutXacNhan(hop).click();
		await page.waitForTimeout(3_000);
		expect(chan.daGoi, `Tỷ lệ âm mà vẫn gửi request: ${chan.daGoi.join(' ; ')}`).toEqual([]);
	});

	test('20_020_010 — Ô số tiền tối thiểu bị khoá cho tới khi tích ô Giá trị đơn hàng tối thiểu', async ({
		page,
	}) => {
		chanNeuTat('20_020_010');

		const hop = await moFormCapNhat(page, 1);
		expect(hop).not.toBeNull();

		const oTick = hop.locator('#isMinOrderValue');
		const oSo = hop.locator('#orderAmountConditional');
		if ((await oTick.count()) === 0 || (await oSo.count()) === 0) {
			test.skip(true, 'Form đổi điểm không có ô "Giá trị đơn hàng tối thiểu".');
		}

		const daTick = await oTick.isChecked();
		if (daTick) await oTick.uncheck({ force: true });
		await page.waitForTimeout(800);
		// 🔴 Kiểm bằng `toBeDisabled()`, 🚫 không soi class `.ant-input-disabled`.
		await expect(oSo, 'Chưa tích mà ô số tiền tối thiểu đã gõ được').toBeDisabled();

		await oTick.check({ force: true });
		await page.waitForTimeout(800);
		await expect(oSo, 'Đã tích mà ô số tiền tối thiểu vẫn bị khoá').toBeEnabled();
	});

	test('20_020_011 — Bấm Đóng giữa chừng ở form đổi điểm', async ({ page }) => {
		chanNeuTat('20_020_011');

		const hop = await moFormCapNhat(page, 1);
		expect(hop).not.toBeNull();

		const truoc = await oTien(hop).inputValue();
		await oTien(hop).fill('123456');
		await hop.getByRole('button', { name: /Đóng|Hủy|Huỷ/ }).first().click();
		await page.waitForTimeout(2_500);

		expect(chan.daGoi, `Bấm Đóng mà vẫn gửi request: ${chan.daGoi.join(' ; ')}`).toEqual([]);
		const lai = await moFormCapNhat(page, 1);
		expect(await oTien(lai).inputValue(), 'Mở lại form vẫn giữ giá trị nháp').toBe(truoc);
	});

	test('20_030_001 — Phạm vi áp dụng mặc định là Toàn hệ thống', async ({ page }) => {
		chanNeuTat('20_030_001');

		const hop = await moFormCapNhat(page, 0);
		expect(hop).not.toBeNull();
		expect(await moThe(page, 'Phạm vi áp dụng'), 'Form không có thẻ "Phạm vi áp dụng"').toBe(true);

		const chu = chuan(await hopForm(page).innerText());
		expect(chu, 'Thẻ Phạm vi áp dụng không có lựa chọn "Toàn hệ thống"').toContain('Toàn hệ thống');
		test.info().annotations.push({ type: 'nội dung thẻ phạm vi', description: chu.slice(0, 500) });
	});

	test('20_030_002 — Chọn phạm vi cụ thể nhưng không tích đơn vị nào', async ({ page }) => {
		chanNeuTat('20_030_002');

		const hop = await moFormCapNhat(page, 0);
		expect(hop).not.toBeNull();
		expect(await moThe(page, 'Phạm vi áp dụng')).toBe(true);

		const nut = hopForm(page).getByText('Chọn phạm vi cụ thể', { exact: false }).first();
		if ((await nut.count()) === 0) test.skip(true, 'Không có lựa chọn "Chọn phạm vi cụ thể".');
		await nut.click();
		await page.waitForTimeout(2_000);
		await nutXacNhan(hopForm(page)).click();
		await page.waitForTimeout(3_000);

		const loi = await loiDangHien(page);
		test.info().annotations.push({
			type: 'thông báo thật',
			description: loi.join(' | ') || '(không có thông báo nào)',
		});
		// 🔴 Hệ thống KHÔNG được tự hiểu "không tích gì" là toàn hệ thống.
		expect(
			chan.daGoi,
			`Chọn phạm vi cụ thể mà không tích đơn vị nào, form vẫn gửi request: ${chan.daGoi.join(' ; ')}`,
		).toEqual([]);
		expect(
			loi.some((s) => /phạm vi/i.test(s)),
			`Không có cảnh báo "Vui lòng chọn phạm vi áp dụng". Đang có: ${loi.join(' | ') || '(không có)'}`,
		).toBe(true);
	});
});
