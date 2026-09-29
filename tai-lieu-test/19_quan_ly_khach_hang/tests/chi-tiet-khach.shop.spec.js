'use strict';

/** 19 · Form thêm khách + chi tiết khách, vai `shop`. 🚫 KHÔNG ghi (bọc `chanGhi()`). */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan } = require('./customer-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

async function moChiTietDongDau(page) {
	if ((await dong(page).count()) === 0) return null;
	const ten = chuan(await dong(page).first().locator('td').nth(2).innerText());
	// 🔴 Tên khách là <a href="/customer/detail/:id"> NẰM TRONG ô — bấm vào ô (td) 🚫 không điều hướng.
		await dong(page).first().locator('td').nth(2).locator('a').click();
	await page.waitForTimeout(4_000);
	return ten;
}

async function moThe(page, nhan) {
	const the = khung(page).locator('.ant-tabs-tab', { hasText: nhan }).first();
	if ((await the.count()) === 0) return false;
	await the.locator('.ant-tabs-tab-btn').dispatchEvent('click'); // 🔴 antd v6: click trần không đổi tab
	await page.waitForTimeout(3_000);
	return true;
}

test.describe('19 · Khách hàng (vai điểm bán/shop)', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, VAI);
	});

	test('19_020_002 — Sinh mã khách hàng ngẫu nhiên', async ({ page }) => {
		chanNeuTat('19_020_002');

		const nut = khung(page).getByRole('button', { name: 'Thêm khách hàng' });
		if ((await nut.count()) === 0) {
			test.skip(
				true,
				'Vai này không có nút "Thêm khách hàng" trên màn — xem 19_020_006 về lệch quyền. ' +
					'Nút đang có: ' +
					chuan((await khung(page).locator('button').allInnerTexts()).join(' · ')),
			);
		}
		await nut.first().click();
		await page.waitForTimeout(2_500);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		// 🔴 Bám theo NHÃN, 🚫 không lấy `input` đầu tiên của drawer: thứ tự ô đổi là test đỏ oan.
		const muc = hop
			.locator('.ant-form-item')
			.filter({ hasText: /Mã khách hàng/ })
			.first();
		expect(
			await muc.count(),
			'Form thêm khách hàng không có ô "Mã khách hàng". Nhãn đang có: ' +
				chuan((await hop.locator('.ant-form-item-label').allInnerTexts()).join(' · ')),
		).toBeGreaterThan(0);
		const oMa = muc.locator('input').first();
		const truoc = await oMa.inputValue();
		const banhXe = muc.locator('.ant-input-suffix, .ant-input-group-addon, button').first();
		expect(await banhXe.count(), 'Ô Mã khách hàng không có biểu tượng sinh mã').toBeGreaterThan(0);
		await banhXe.click({ force: true });
		await page.waitForTimeout(1_500);

		const sau = await oMa.inputValue();
		expect(sau, 'Bấm sinh mã mà ô Mã khách hàng vẫn rỗng').not.toBe('');
		expect(sau, 'Bấm sinh mã mà giá trị không đổi').not.toBe(truoc);
	});

	test('19_050_007 — Nội dung popup xác nhận xoá khách hàng', async ({ page }) => {
		chanNeuTat('19_050_007');

		const ten = await moChiTietDongDau(page);
		if (!ten) test.skip(true, 'Không có khách nào để mở chi tiết.');

		const nut = khung(page).getByRole('button', { name: /Xoá|Xóa/ }).first();
		if ((await nut.count()) === 0) {
			test.skip(
				true,
				`Vai shop không thấy nút xoá ở chi tiết khách "${ten}". Nút đang có: ` +
					chuan((await khung(page).locator('button').allInnerTexts()).join(' · ')),
			);
		}
		await nut.click();
		await page.waitForTimeout(2_000);

		const pop = page.locator('.ant-modal-confirm, .ant-popconfirm, .ant-modal-wrap:visible').last();
		const chu = chuan(await pop.innerText());
		expect(chu, 'Bấm xoá mà không có popup xác nhận nào').not.toBe('');
		test.info().annotations.push({ type: 'nguyên văn popup xoá', description: chu });
		// 🔴 Dấu tiếng Việt: "xoá" và "xóa" đặt dấu ở hai chữ khác nhau — regex phải nhận cả hai.
		expect(
			/x[oó][áa]/i.test(chu),
			`Popup xác nhận không nhắc tới việc xoá. Nguyên văn: ${chu}`,
		).toBe(true);
	});

	test('19_050_006 — Huỷ xoá khách hàng ở popup xác nhận', async ({ page }) => {
		chanNeuTat('19_050_006');

		const { daGoi } = await chanGhi(page);
		const ten = await moChiTietDongDau(page);
		if (!ten) test.skip(true, 'Không có khách nào để mở chi tiết.');

		const nut = khung(page).getByRole('button', { name: /Xoá|Xóa/ }).first();
		if ((await nut.count()) === 0) test.skip(true, `Không thấy nút xoá ở chi tiết "${ten}".`);
		await nut.click();
		await page.waitForTimeout(2_000);

		const pop = page.locator('.ant-modal-confirm, .ant-popconfirm, .ant-modal-wrap:visible').last();
		await pop.getByRole('button', { name: /Huỷ|Hủy|Không/ }).first().click();
		await page.waitForTimeout(2_500);

		// 🔴 Điều quan trọng nhất của case: KHÔNG có request xoá nào lọt xuống server.
		expect(daGoi, `Bấm Huỷ mà vẫn gửi request ghi: ${daGoi.join(' ; ')}`).toEqual([]);
		expect(chuan(await khung(page).innerText()), 'Huỷ xoá mà mất luôn khách khỏi màn').toContain(
			ten,
		);
	});

	test('19_080_001 — Tab Sản phẩm đã mua hiện đủ cột', async ({ page }) => {
		chanNeuTat('19_080_001');

		const ten = await moChiTietDongDau(page);
		if (!ten) test.skip(true, 'Không có khách nào để mở chi tiết.');

		if (!(await moThe(page, 'Sản phẩm đã mua'))) {
			test.skip(
				true,
				'Chi tiết khách không có tab "Sản phẩm đã mua". Tab đang có: ' +
					chuan((await khung(page).locator('.ant-tabs-tab').allInnerTexts()).join(' · ')),
			);
		}

		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		for (const nhan of ['Ngày mua', 'Tên sản phẩm', 'Đơn hàng', 'Loại', 'Số lượng', 'Tổng tiền']) {
			expect(cot.join(' · '), `Tab Sản phẩm đã mua thiếu cột "${nhan}"`).toContain(nhan);
		}
	});

	test('19_090_004 — Bấm Thanh toán khi chưa chọn đơn hàng nào', async ({ page }) => {
		chanNeuTat('19_090_004');

		const { daGoi } = await chanGhi(page);
		const ten = await moChiTietDongDau(page);
		if (!ten) test.skip(true, 'Không có khách nào để mở chi tiết.');

		if (!(await moThe(page, 'Công nợ'))) {
			test.skip(
				true,
				'Chi tiết khách không có tab "Công nợ". Tab đang có: ' +
					chuan((await khung(page).locator('.ant-tabs-tab').allInnerTexts()).join(' · ')),
			);
		}
		const nut = khung(page).getByRole('button', { name: /^Thanh toán/ }).first();
		if ((await nut.count()) === 0) {
			test.skip(true, `Tab Công nợ của khách "${ten}" không có nút Thanh toán.`);
		}
		// 🔴 Nút bị vô hiệu hoá khi chưa chọn đơn cũng là một cách chặn HỢP LỆ — phải phân biệt
		//    với "bấm được mà im lặng", 🚫 không ép một kết cục rồi đổ oan.
		if (await nut.isDisabled()) {
			test.info().annotations.push({
				type: 'cách chặn',
				description: 'nút Thanh toán bị vô hiệu hoá khi chưa chọn đơn nào',
			});
			expect(daGoi, `Nút disabled mà vẫn có request: ${daGoi.join(' ; ')}`).toEqual([]);
			return;
		}
		await nut.click({ force: true });
		await page.waitForTimeout(2_500);

		const canhBao = chuan(
			await page.locator('.ant-message, .ant-notification').first().innerText().catch(() => ''),
		);
		test.info().annotations.push({
			type: 'hành vi khi chưa chọn đơn',
			description: canhBao || '(không có thông báo nào)',
		});
		// 🔴 Dù cảnh báo hay không, tuyệt đối 🚫 KHÔNG được có request ghi công nợ.
		expect(daGoi, `Chưa chọn đơn mà vẫn gửi request: ${daGoi.join(' ; ')}`).toEqual([]);
		expect(
			canhBao,
			'Bấm Thanh toán khi chưa chọn đơn nào mà hệ thống im lặng — người dùng không biết vì sao ' +
				'không có gì xảy ra.',
		).not.toBe('');
	});
});
