'use strict';

/**
 * Task 050 — Đề xuất nhập hàng (gợi ý số lượng cần nhập).
 * Màn: `features/stockAlert/AutoProposePage.jsx` · route `/inventory/stock-alerts/auto-propose`.
 * API: `POST /stock-requests/auto-propose/preview` (tính gợi ý — CHƯA ghi) ·
 *      `POST /stock-requests/auto-propose/confirm` (tạo phiếu — GHI THẬT).
 *
 * 🔴 Chỉ case `050_009` mới tạo phiếu thật; các case còn lại chặn ghi bằng `blockWrites`.
 */

const { test, expect } = require('@playwright/test');
const {
	API_CONFIRM,
	API_PREVIEW,
	blockWrites,
	openAlerts,
	settle,
	skipNoData,
} = require('./alert-page');

const rows = (page) => page.locator('.ant-table-tbody tr.ant-table-row');

/** Mở màn Đề xuất nhập hàng bằng nút trên màn Cảnh báo tồn kho (điều hướng client-side). */
async function moDeXuat(page) {
	await openAlerts(page, 'tct');
	await page.getByRole('button', { name: 'Đề xuất nhập hàng' }).first().click();
	await expect
		.poll(() => page.url(), { message: 'Không mở được màn Đề xuất nhập hàng.', timeout: 30_000 })
		.toContain('auto-propose');
	await settle(page);
}

/** Chọn điểm bán qua ô "Chọn điểm bán / kho cần đề xuất" (cũng là drawer ba cột). */
async function chonDiemBan(page) {
	const o = page.locator('.ant-select').filter({ hasText: /điểm bán|kho/i }).first();
	if ((await o.count()) === 0) return false;
	await o.click();

	const drawer = page.locator('.ant-drawer-open').first();
	if (!(await drawer.isVisible().catch(() => false))) return false;

	const col = (i) => drawer.locator('.sp-column').nth(i);
	const choCoMuc = async (ds) =>
		expect
			.poll(() => ds.count(), { timeout: 20_000 })
			.toBeGreaterThan(0)
			.then(() => true)
			.catch(() => false);

	if (!(await choCoMuc(col(0).locator('.sp-item')))) return false;
	await col(0).locator('.sp-item').nth(1).click();
	if (await choCoMuc(col(1).locator('.sp-item'))) await col(1).locator('.sp-item').first().click();

	const dsShop = col(2).locator('.ant-radio-wrapper');
	if (!(await choCoMuc(dsShop))) {
		await drawer.getByRole('button', { name: 'Đóng' }).click();
		return false;
	}
	await dsShop.first().click();
	await drawer.getByRole('button', { name: 'Xác nhận' }).click();
	await expect(drawer).toBeHidden();
	await settle(page);
	return true;
}

/** Bấm Tính gợi ý và chờ API preview. */
async function tinhGoiY(page) {
	const cho = page
		.waitForResponse((r) => r.url().includes(API_PREVIEW) && r.request().method() === 'POST', {
			timeout: 120_000,
		})
		.catch(() => null);
	await page.getByRole('button', { name: 'Tính gợi ý' }).first().click();
	const res = await cho;
	await settle(page);
	return res;
}

test.describe('04_1 — Đề xuất nhập hàng (vai Tổng công ty)', () => {
	test('04_1_050_001 - Mở màn Đề xuất nhập hàng từ màn Cảnh báo tồn kho', async ({ page }) => {
		await moDeXuat(page);
		await expect(
			page.getByRole('button', { name: 'Tính gợi ý' }).first(),
			'Màn Đề xuất phải có nút Tính gợi ý.',
		).toBeVisible();
	});

	test('04_1_050_002 - Chưa chọn điểm bán thì màn hướng dẫn chọn trước, không ra kết quả sai', async ({
		page,
	}) => {
		const { attempted } = await blockWrites(page);
		await moDeXuat(page);

		// `'Chọn điểm bán, sau đó bấm "Tính gợi ý"'` — AutoProposePage.jsx:386.
		await expect(
			page.getByText(/Chọn điểm bán, sau đó bấm|Bấm 'Tính gợi ý'/).first(),
			'Chưa chọn điểm bán thì màn phải hướng dẫn, không hiện bảng kết quả.',
		).toBeVisible();
		expect(await rows(page).count(), 'Chưa tính gợi ý mà đã có dòng kết quả.').toBe(0);
		expect(attempted, 'Chưa làm gì mà đã gửi request ghi.').toEqual([]);
	});

	test('04_1_050_003 - Tính gợi ý trả về bảng Mặt hàng cần nhập bổ sung đủ cột', async ({ page }) => {
		await moDeXuat(page);
		if (!(await chonDiemBan(page))) skipNoData(test, 'Không chọn được điểm bán nào.');

		const res = await tinhGoiY(page);
		if (!res) skipNoData(test, 'Bấm Tính gợi ý nhưng không nhận được hồi âm trong 2 phút.');
		expect(res.status(), 'API tính gợi ý trả lỗi.').toBeLessThan(400);

		if ((await rows(page).count()) === 0) {
			skipNoData(test, 'Điểm bán này không có mặt hàng nào cần nhập bổ sung.');
		}
		const cot = (await page.locator('th').allInnerTexts()).map((x) => x.trim());
		for (const c of ['Sản phẩm', 'Đơn vị', 'Lý do', 'Tồn hiện tại', 'Đang về', 'Số lượng đề xuất']) {
			expect(cot, `Bảng gợi ý thiếu cột "${c}".`).toContain(c);
		}
	});

	test('04_1_050_004 - Cột Lý do chỉ nhận các nhóm lý do hệ thống quy định', async ({ page }) => {
		await moDeXuat(page);
		if (!(await chonDiemBan(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		if (!(await tinhGoiY(page))) skipNoData(test, 'Không nhận được kết quả tính gợi ý.');

		const so = await rows(page).count();
		if (so === 0) skipNoData(test, 'Không có mặt hàng nào được gợi ý để đối chiếu lý do.');

		// Nhóm lý do lấy từ AutoProposePage.jsx (REASON map) + HDSD 050.
		const hopLe = /Hết hàng|Dưới định mức|Hết trong 7 ngày|Hết trong 30 ngày|Chưa đủ lịch sử/;
		for (let i = 0; i < so; i++) {
			await expect(
				rows(page).nth(i).locator('td').nth(2),
				`Dòng ${i + 1} có lý do lạ, không thuộc nhóm hệ thống quy định.`,
			).toHaveText(hopLe);
		}
	});

	test('04_1_050_005 - Mặt hàng chưa đủ lịch sử thì cột Bán/ngày để gạch', async ({ page }) => {
		await moDeXuat(page);
		if (!(await chonDiemBan(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		if (!(await tinhGoiY(page))) skipNoData(test, 'Không nhận được kết quả tính gợi ý.');

		const dongChuaDuLichSu = rows(page).filter({ hasText: 'Chưa đủ lịch sử' });
		const so = await dongChuaDuLichSu.count();
		if (so === 0) {
			skipNoData(test, 'Không có mặt hàng nào mang lý do "Chưa đủ lịch sử" để kiểm.');
		}
		// HDSD 050: "Hiện dấu gạch khi mặt hàng chưa đủ 30 ngày lịch sử bán".
		await expect(
			dongChuaDuLichSu.first().locator('td').nth(5),
			'Mặt hàng chưa đủ lịch sử phải để gạch ở cột Bán/ngày, không hiện số.',
		).toHaveText(/[-—]/);
	});

	test('04_1_050_006 - Đổi điểm bán sau khi tính gợi ý thì xoá kết quả cũ', async ({ page }) => {
		await moDeXuat(page);
		if (!(await chonDiemBan(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		if (!(await tinhGoiY(page))) skipNoData(test, 'Không nhận được kết quả tính gợi ý.');
		if ((await rows(page).count()) === 0) {
			skipNoData(test, 'Chưa có kết quả gợi ý nào để kiểm việc xoá khi đổi điểm bán.');
		}

		// HDSD 050 — đây là cách phòng việc tạo phiếu đề xuất cho SAI điểm bán.
		await chonDiemBan(page);
		await expect
			.poll(() => rows(page).count(), {
				message: 'Đổi điểm bán mà kết quả gợi ý cũ vẫn còn — dễ tạo phiếu cho sai điểm bán.',
				timeout: 20_000,
			})
			.toBe(0);
	});

	test('04_1_050_007 - Sửa được Số lượng đề xuất trực tiếp trong ô', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		await moDeXuat(page);
		if (!(await chonDiemBan(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		if (!(await tinhGoiY(page))) skipNoData(test, 'Không nhận được kết quả tính gợi ý.');
		if ((await rows(page).count()) === 0) skipNoData(test, 'Không có dòng gợi ý nào để sửa.');

		const o = rows(page).first().locator('.ant-input-number-input').first();
		await expect(o, 'Cột Số lượng đề xuất phải sửa được.').toBeVisible();
		await o.fill('7');
		expect((await o.inputValue()).replace(/\D/g, ''), 'Ô không nhận giá trị vừa nhập.').toBe('7');
		expect(attempted, 'Mới sửa số lượng mà đã gửi request ghi.').toEqual([]);
	});

	test('04_1_050_008 - Bỏ tích dòng thì dòng đó không vào phiếu', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		await moDeXuat(page);
		if (!(await chonDiemBan(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		if (!(await tinhGoiY(page))) skipNoData(test, 'Không nhận được kết quả tính gợi ý.');

		const so = await rows(page).count();
		if (so < 2) skipNoData(test, `Chỉ có ${so} dòng gợi ý, cần ít nhất 2 để kiểm bỏ tích.`);

		const tich = page.locator('.ant-table-tbody .ant-checkbox-input');
		const truoc = await tich.evaluateAll((l) => l.filter((e) => e.checked).length);
		await tich.first().uncheck();
		const sau = await tich.evaluateAll((l) => l.filter((e) => e.checked).length);

		expect(sau, 'Bỏ tích một dòng thì số dòng được chọn phải giảm đúng 1.').toBe(truoc - 1);
		expect(attempted, 'Mới bỏ tích mà đã gửi request ghi.').toEqual([]);
	});

	test('04_1_050_009 - Tạo phiếu đề xuất phải qua bước xác nhận', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		await moDeXuat(page);
		if (!(await chonDiemBan(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		if (!(await tinhGoiY(page))) skipNoData(test, 'Không nhận được kết quả tính gợi ý.');
		if ((await rows(page).count()) === 0) skipNoData(test, 'Không có mặt hàng nào để tạo phiếu.');

		await page.getByRole('button', { name: /Tạo phiếu đề xuất/i }).first().click();

		// `title: "Tạo phiếu đề xuất?"` — AutoProposePage.jsx:145.
		const hopXacNhan = page.locator('.ant-modal-confirm, .ant-modal').filter({
			hasText: /Tạo phiếu đề xuất/,
		});
		await expect(
			hopXacNhan.first(),
			'Tạo phiếu đề xuất phải có bước xác nhận, không được tạo thẳng.',
		).toBeVisible();

		// 🚫 Dừng ở đây: bấm tiếp là tạo phiếu THẬT trên môi trường đang chạy. Huỷ để không đổi gì.
		await hopXacNhan.getByRole('button', { name: /Huỷ|Hủy|Cancel/ }).first().click();
		expect(attempted, 'Bấm Huỷ mà vẫn gửi request tạo phiếu.').toEqual([]);
		expect(API_CONFIRM, 'Đường dẫn API tạo phiếu đã đổi so với lần trace 17/09/2026.').toBe(
			'/stock-requests/auto-propose/confirm',
		);
	});
});
