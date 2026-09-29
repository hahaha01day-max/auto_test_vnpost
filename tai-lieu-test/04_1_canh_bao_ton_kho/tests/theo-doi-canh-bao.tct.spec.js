'use strict';

/**
 * Task 010 — Theo dõi cảnh báo tồn kho (vai Tổng công ty).
 * Nguồn kỳ vọng: `resource/hdsd/hdsd04_1_canh_bao_ton_kho/tasks/010_theo_doi_canh_bao.md`.
 *
 * 🔴 Case chỉ ĐỌC. Case duy nhất chạm nút ghi (`010_010`) chặn ghi bằng `blockWrites`.
 * 🔴 Case cần dữ liệu thật đều `skipNoData` kèm lý do khi điểm bán không có cảnh báo nào —
 *    🚫 tuyệt đối không để vòng lặp đối chiếu chạy 0 lần rồi tự xanh ("pass rỗng").
 */

const { test, expect } = require('@playwright/test');
const {
	NHOM_CANH_BAO,
	COT_MAC_DINH,
	blockWrites,
	chonDiemBanDauTien,
	chonNhom,
	main,
	openAlerts,
	rows,
	skipNoData,
	theNhom,
	tieuDeCot,
} = require('./alert-page');

test.describe('04_1 — Theo dõi cảnh báo tồn kho (vai Tổng công ty)', () => {
	test.beforeEach(async ({ page }) => {
		await openAlerts(page, 'tct');
	});

	test('04_1_010_001 - Màn hiển thị đủ 9 nhóm cảnh báo', async ({ page }) => {
		// 🔴 Dùng `toHaveCount(1)` chứ không `toBeVisible()`: dải 9 tab tràn bề ngang màn, tab cuối
		//    bị antd đẩy ra ngoài vùng nhìn nên `toBeVisible()` đỏ dù nhóm vẫn tồn tại và bấm được.
		for (const nhom of NHOM_CANH_BAO) {
			await expect(theNhom(page, nhom), `Thiếu nhóm cảnh báo "${nhom}" trên dải thẻ.`).toHaveCount(
				1,
			);
		}
		// 🔴 Tài liệu HDSD 010 chỉ liệt kê 6 nhóm; sản phẩm có 9. Case này chốt con số thật để
		//    lần sau đổi số nhóm là biết ngay, và để đối chiếu lại tài liệu.
		expect(
			await page.locator('.ant-tabs-tab').count(),
			'Số nhóm cảnh báo đã đổi so với lần đo 17/09/2026 (9 nhóm).',
		).toBe(NHOM_CANH_BAO.length);
	});

	test('04_1_010_002 - Vai cấp trên chưa chọn điểm bán thì bảng trống, không báo lỗi', async ({
		page,
	}) => {
		await expect(
			main(page).locator('.ant-select').first(),
			'Vai Tổng công ty phải có ô chọn Điểm bán / Kho.',
		).toBeVisible();

		// HDSD 010: chưa chọn điểm bán thì bảng TRỐNG chứ không báo lỗi — đừng hiểu nhầm là
		// điểm bán không có cảnh báo nào.
		expect(await rows(page).count(), 'Chưa chọn điểm bán mà bảng đã có dữ liệu.').toBe(0);
		await expect(
			page.locator('.ant-alert-error, .ant-result-error'),
			'Chưa chọn điểm bán KHÔNG được coi là lỗi.',
		).toHaveCount(0);
	});

	test('04_1_010_003 - Chọn điểm bán thì bảng nạp dữ liệu của điểm bán đó', async ({ page }) => {
		const ok = await chonDiemBanDauTien(page);
		if (!ok) skipNoData(test, 'Cây tổ chức không có điểm bán nào để chọn.');

		await expect(
			main(page).locator('.ant-select').first(),
			'Chọn xong thì ô Điểm bán / Kho phải hiện tên điểm bán, không còn placeholder.',
		).not.toContainText('Chọn điểm bán / kho cần xem');
	});

	test('04_1_010_004 - Nhóm theo định mức hiển thị đủ cột quy định', async ({ page }) => {
		if (!(await chonDiemBanDauTien(page))) {
			skipNoData(test, 'Không chọn được điểm bán nào.');
		}
		await chonNhom(page, 'Hết hàng');

		const cot = await tieuDeCot(page);
		for (const c of COT_MAC_DINH) {
			expect(cot, `Nhóm Hết hàng thiếu cột "${c}".`).toContain(c);
		}
	});

	test('04_1_010_005 - Nhóm Tồn lâu ngày bỏ cột Nguồn cấu hình, thêm cột tuổi tồn', async ({
		page,
	}) => {
		if (!(await chonDiemBanDauTien(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		await chonNhom(page, 'Tồn lâu ngày');

		// 🔴 Đổi tab xong ≠ bảng đã vẽ lại cột. Khi nhóm mới KHÔNG có dữ liệu thì cũng KHÔNG có
		//    request nào, `settle` (chờ spinner) trả về ngay và ta đọc trúng cột của nhóm cũ.
		//    Phải poll tới khi cột thật sự đổi.
		await expect
			.poll(async () => (await tieuDeCot(page)).includes('Nguồn cấu hình'), {
				message: 'HDSD 010 — nhóm Tồn lâu ngày KHÔNG có cột Nguồn cấu hình.',
				timeout: 20_000,
			})
			.toBe(false);

		const cot = await tieuDeCot(page);
		for (const c of ['SL tồn lâu', 'Tuổi tồn cũ nhất', 'Tuổi tồn TB', 'Ngày nhập cũ nhất']) {
			expect(cot, `Nhóm Tồn lâu ngày thiếu cột "${c}".`).toContain(c);
		}
	});

	test('04_1_010_006 - Nhóm Sắp hết hạn hiển thị cột Lô/Serial và SL sắp hết hạn', async ({
		page,
	}) => {
		if (!(await chonDiemBanDauTien(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		await chonNhom(page, 'Sắp hết hạn');

		// Xem chú thích ở case 010_005 về việc phải poll cột.
		await expect
			.poll(async () => (await tieuDeCot(page)).includes('Nguồn cấu hình'), {
				message: 'Nhóm Sắp hết hạn KHÔNG có cột Nguồn cấu hình.',
				timeout: 20_000,
			})
			.toBe(false);

		const cot = await tieuDeCot(page);
		expect(cot.join(' | '), 'Nhóm Sắp hết hạn phải có cột Lô / Serial.').toMatch(/Lô\s*\/\s*Serial/i);
		expect(cot.join(' | '), 'Nhóm Sắp hết hạn phải có cột SL sắp hết hạn.').toMatch(
			/SL sắp hết hạn/i,
		);
	});

	test('04_1_010_007 - Hai nhóm hạn sử dụng đổi nút thao tác, không có nút tạo yêu cầu nhập', async ({
		page,
	}) => {
		if (!(await chonDiemBanDauTien(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		await chonNhom(page, 'Sắp hết hạn');

		if ((await rows(page).count()) === 0) {
			skipNoData(test, 'Điểm bán không có lô hàng nào sắp hết hạn để kiểm nút thao tác.');
		}
		await rows(page).first().locator('.ant-checkbox-input').first().check();

		// HDSD 010: hàng sắp hết hạn cần đẩy đi chứ không nhập thêm.
		await expect(
			page.getByRole('button', { name: /Tạo yêu cầu nhập hàng/i }),
			'Nhóm Sắp hết hạn KHÔNG được có nút Tạo yêu cầu nhập hàng.',
		).toHaveCount(0);
		await expect(
			page.getByRole('button', { name: /Chuyển sang Hàng xả kho|Xuất huỷ hàng hết hạn/i }).first(),
			'Nhóm Sắp hết hạn phải có nút Chuyển sang Hàng xả kho hoặc Xuất huỷ hàng hết hạn.',
		).toBeVisible();
	});

	test('04_1_010_008 - Tích chọn sản phẩm thì nút Tạo yêu cầu nhập hàng hiện kèm số dòng', async ({
		page,
	}) => {
		if (!(await chonDiemBanDauTien(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		await chonNhom(page, 'Hết hàng');

		const so = await rows(page).count();
		if (so < 2) skipNoData(test, `Nhóm Hết hàng chỉ có ${so} dòng, cần ít nhất 2 để kiểm số đếm.`);

		await rows(page).nth(0).locator('.ant-checkbox-input').check();
		await rows(page).nth(1).locator('.ant-checkbox-input').check();

		// Nhãn nút kèm số dòng đang chọn — HDSD 010 bước 5.
		await expect(
			page.getByRole('button', { name: /Tạo yêu cầu nhập hàng\s*\(2\)/i }).first(),
			'Tích 2 dòng thì nhãn nút phải kèm số 2.',
		).toBeVisible();
	});

	test('04_1_010_009 - Đổi nhóm cảnh báo thì bỏ các dòng đã tích', async ({ page }) => {
		if (!(await chonDiemBanDauTien(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		await chonNhom(page, 'Hết hàng');
		if ((await rows(page).count()) === 0) {
			skipNoData(test, 'Nhóm Hết hàng không có dòng nào để tích.');
		}

		await rows(page).first().locator('.ant-checkbox-input').check();
		await expect(page.getByRole('button', { name: /Tạo yêu cầu nhập hàng/i }).first()).toBeVisible();

		await chonNhom(page, 'Tồn lâu ngày');
		await expect(
			page.getByRole('button', { name: /Tạo yêu cầu nhập hàng/i }),
			'Đổi nhóm mà vẫn giữ lựa chọn cũ thì dễ tạo yêu cầu nhầm sản phẩm.',
		).toHaveCount(0);
	});

	test('04_1_010_010 - Bấm Tạo yêu cầu nhập hàng mở màn lập phiếu, chưa ghi gì', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		if (!(await chonDiemBanDauTien(page))) skipNoData(test, 'Không chọn được điểm bán nào.');
		await chonNhom(page, 'Hết hàng');
		if ((await rows(page).count()) === 0) {
			skipNoData(test, 'Nhóm Hết hàng không có dòng nào để tạo yêu cầu.');
		}

		await rows(page).first().locator('.ant-checkbox-input').check();
		await page.getByRole('button', { name: /Tạo yêu cầu nhập hàng/i }).first().click();

		// Mở màn lập phiếu là thao tác ĐỌC — chưa được gửi request ghi nào.
		await expect
			.poll(() => page.url(), { message: 'Bấm nút không mở được màn lập phiếu.', timeout: 30_000 })
			.toMatch(/auto-propose|purchase-request|stock-request/i);
		expect(attempted, 'Mới mở màn lập phiếu mà đã gửi request ghi lên server.').toEqual([]);
	});
});
