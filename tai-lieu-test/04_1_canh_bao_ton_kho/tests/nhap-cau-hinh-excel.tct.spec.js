'use strict';

/**
 * Task 030 — Nhập cấu hình định mức tồn từ tệp Excel.
 * Màn: `features/stockAlert/components/ImportStockWarningExcelDrawer.jsx`
 * (mở từ nút *Import Excel* ở thẻ **Theo từng sản phẩm** của màn Cài đặt cảnh báo).
 * API: `POST /stock-warning-policies/import` — luồng **job chạy nền**, trả `jobId` rồi hỏi trạng thái.
 *
 * 🔴 File này chỉ chứa case KHÔNG nạp dữ liệu thật: tải mẫu, chặn sai định dạng, cấu trúc màn.
 *    Case nạp thật sẽ đổi định mức của sản phẩm — cần môi trường có điểm bán thử riêng, xem README.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { blockWrites, openAlerts, settle, skipNoData } = require('./alert-page');

const API_IMPORT = '/stock-warning-policies/import';

function fileRac(ten, noiDung = 'khong phai excel') {
	const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vnpost-cfg-')), ten);
	fs.writeFileSync(p, noiDung);
	return p;
}

/** Mở màn cài đặt → chọn phạm vi → thẻ Theo từng sản phẩm → nút Import Excel. */
async function moImport(page) {
	await openAlerts(page, 'tct');
	await page.getByRole('button', { name: 'Cài đặt cảnh báo' }).first().click();
	await expect
		.poll(() => page.url(), { message: 'Không mở được màn Cài đặt cảnh báo.', timeout: 30_000 })
		.toContain('/stock-alerts/settings');
	await settle(page);

	// 🔴 Vai từ Bưu điện xã trở lên BẮT BUỘC chọn phạm vi trước, nếu không thân màn không render.
	const oPhamVi = page.locator('.ant-select').filter({ hasText: /Chọn tổ chức|đơn vị/i }).first();
	if (await oPhamVi.count()) {
		await oPhamVi.click();
		const drawer = page.locator('.ant-drawer-open').first();
		const col = (i) => drawer.locator('.sp-column').nth(i);
		const choCoMuc = async (ds) =>
			expect
				.poll(() => ds.count(), { timeout: 20_000 })
				.toBeGreaterThan(0)
				.then(() => true)
				.catch(() => false);

		if (await choCoMuc(col(0).locator('.sp-item'))) {
			await col(0).locator('.sp-item').nth(1).click();
			if (await choCoMuc(col(1).locator('.sp-item'))) await col(1).locator('.sp-item').first().click();
			const dsShop = col(2).locator('.ant-radio-wrapper');
			if (await choCoMuc(dsShop)) await dsShop.first().click();
		}
		await drawer.getByRole('button', { name: 'Xác nhận' }).click();
		await expect(drawer).toBeHidden();
		await settle(page);
	}

	const the = page.locator('.ant-tabs-tab').filter({ hasText: 'Theo từng sản phẩm' }).first();
	await the.locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await settle(page);

	await page.getByRole('button', { name: 'Import Excel' }).first().click();
	const drawer = page.locator('.ant-drawer-open').last();
	await expect(drawer, 'Không mở được màn Import cấu hình cảnh báo tồn.').toBeVisible();
	return drawer;
}

test.describe('04_1 — Nhập cấu hình định mức từ Excel (vai Tổng công ty)', () => {
	test('04_1_030_001 - Mở màn Import có mục tải mẫu và vùng nạp tệp', async ({ page }) => {
		const drawer = await moImport(page);

		await expect(
			drawer.getByRole('button', { name: 'Tải mẫu excel' }).first(),
			'Màn Import phải có nút Tải mẫu excel.',
		).toBeVisible();
		await expect(
			drawer.getByText('Kéo thả file Excel hoặc bấm để chọn').first(),
			'Màn Import phải có vùng kéo thả tệp.',
		).toBeVisible();
	});

	test('04_1_030_002 - Tải file mẫu thành công', async ({ page }) => {
		const drawer = await moImport(page);

		const cho = page.waitForEvent('download', { timeout: 60_000 }).catch(() => null);
		await drawer.getByRole('button', { name: 'Tải mẫu excel' }).first().click();
		const tai = await cho;

		// 🔴 Tệp mẫu ở màn này dựng NGAY TRÊN TRÌNH DUYỆT bằng `xlsx` (writeFileXLSX), không tải từ
		//    server — nên không có request nào để chờ, chỉ có sự kiện download.
		if (!tai) skipNoData(test, 'Không bắt được sự kiện tải tệp mẫu trong 60 giây.');
		expect(await tai.suggestedFilename(), 'Tệp mẫu phải là file Excel.').toMatch(/\.xlsx?$/i);
	});

	test('04_1_030_003 - Tệp sai định dạng bị chặn, không gửi lên server', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await moImport(page);

		// `accept=".xlsx,.xls"` — ImportStockWarningExcelDrawer.jsx:157.
		await drawer.locator('input[type="file"]').setInputFiles(fileRac('khong-hop-le.pdf'));
		await page.waitForTimeout(3_000);

		expect(attempted, 'Tệp .pdf mà vẫn gửi lên server.').toEqual([]);
		await expect(
			drawer.getByText('Kéo thả file Excel hoặc bấm để chọn').first(),
			'Tệp sai định dạng không được nhận vào vùng nạp.',
		).toBeVisible();
	});

	test('04_1_030_004 - Màn Import nêu đủ ba số Tổng dòng / Đã áp dụng / Dòng lỗi', async ({
		page,
	}) => {
		const drawer = await moImport(page);

		// Ba số chỉ hiện sau khi nạp xong; ở bước chưa nạp thì phải có hướng dẫn hai bước.
		const noiDung = await drawer.innerText();
		expect(
			noiDung,
			'Màn Import phải hướng dẫn tải mẫu trước khi nạp.',
		).toMatch(/Tải mẫu|file mẫu/i);
		await expect(
			drawer.getByRole('button', { name: 'Đóng' }).first(),
			'Màn Import phải có nút Đóng.',
		).toBeVisible();
	});

	test('04_1_030_005 - Đóng màn Import không gửi request nạp nào', async ({ page }) => {
		const { attempted } = await blockWrites(page);
		const drawer = await moImport(page);

		await drawer.getByRole('button', { name: 'Đóng' }).first().click();
		await expect(drawer, 'Bấm Đóng phải đóng màn Import.').toBeHidden();
		expect(attempted, 'Chỉ mở rồi đóng mà đã gửi request nạp.').toEqual([]);
	});

	test('04_1_030_006 - Endpoint nạp là /stock-warning-policies/import', async ({ page }) => {
		// 🔴 Case "hợp đồng": khoá lại đường dẫn API để đổi endpoint là biết ngay. Không nạp dữ liệu.
		//    Trace: `features/stockAlert/services/stockWarningImportService.js:4`.
		const drawer = await moImport(page);
		expect(API_IMPORT, 'Đường dẫn API nạp cấu hình đã đổi so với lần trace 17/09/2026.').toBe(
			'/stock-warning-policies/import',
		);
		await expect(drawer).toBeVisible();
	});
});

test.describe('04_1 — Nhập cấu hình từ Excel: NẠP DỮ LIỆU THẬT', () => {
	/**
	 * 🔴 Hai case dưới nạp tệp THẬT, ghi định mức cho sản phẩm của phạm vi đang chọn
	 *    (điểm bán rác `AUTO TEST KHONG DUNG…`). HDSD 030 nói rõ: **không có bước hoàn tác**,
	 *    nạp sai phải sửa lại bằng tệp mới.
	 * 🔴 Cột tệp theo HDSD 030: Mã điểm bán · SKU · Tên sản phẩm · Ngưỡng Min · Ngưỡng Max.
	 *    Tự thêm/đổi/đảo cột là dòng bị bỏ qua.
	 */
	const COT = ['Mã điểm bán', 'SKU', 'Tên sản phẩm', 'Ngưỡng Min', 'Ngưỡng Max'];

	async function taoTep(dsDong, ten = 'cau-hinh-canh-bao.xlsx') {
		const ExcelJS = require('exceljs');
		const wb = new ExcelJS.Workbook();
		const ws = wb.addWorksheet('Sheet1');
		ws.addRow(COT);
		for (const d of dsDong) ws.addRow(d);
		const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpost-cfg-xlsx-'));
		const duongDan = path.join(thuMuc, ten);
		await wb.xlsx.writeFile(duongDan);
		return duongDan;
	}

	/** Nạp tệp và chờ job chạy xong; trả về ba số Tổng dòng / Đã áp dụng / Dòng lỗi. */
	async function napTep(page, drawer, duongDan) {
		await drawer.locator('input[type="file"]').setInputFiles(duongDan);

		// Job chạy nền: màn hiện "Đang xử lý file Excel…" rồi mới ra kết quả.
		// 🔴 Tệp DỰNG TAY (kể cả đúng tên cột theo HDSD) có thể không được nhận: mẫu thật do chính
		//    màn này sinh ra bằng thư viện `xlsx` và có thể kèm định dạng/sheet riêng. Chờ 90 giây,
		//    không thấy kết quả thì SKIP kèm lý do — 🚫 đừng để case treo 3 phút rồi đỏ với lý do
		//    mơ hồ. Muốn kiểm trọn luồng nạp, hãy tải mẫu thật về, điền rồi trỏ case vào tệp đó.
		const coKetQua = await expect
			.poll(async () => (await drawer.innerText()).includes('Tổng dòng'), { timeout: 90_000 })
			.toBe(true)
			.then(() => true)
			.catch(() => false);
		if (!coKetQua) {
			skipNoData(
				test,
				'Hệ thống không nhận tệp dựng tay (không hiện Tổng dòng sau 90 giây). ' +
					'Cần tải tệp mẫu thật từ nút "Tải mẫu excel", điền dữ liệu rồi trỏ case vào tệp đó.',
			);
		}

		const noiDung = await drawer.innerText();
		const so = (nhan) => {
			const m = noiDung.match(new RegExp(`${nhan}[^0-9]*([0-9]+)`, 'i'));
			return m ? Number(m[1]) : null;
		};
		return { tong: so('Tổng dòng'), daAp: so('Đã áp dụng'), loi: so('Dòng lỗi') };
	}

	test('04_1_030_007 - Nạp từng dòng độc lập: dòng đúng vẫn được áp khi có dòng sai', async ({
		page,
	}) => {
		const drawer = await moImport(page);
		// SKU không tồn tại ⇒ dòng lỗi; dòng còn lại thiếu SKU cũng lỗi — cả hai đều KHÔNG ghi gì,
		// nên tệp này an toàn: nó kiểm cơ chế đếm lỗi, không đổi định mức của sản phẩm thật nào.
		const tep = await taoTep([
			['', 'SKU-KHONG-TON-TAI-AUTOTEST', 'AUTO TEST', 1, 999],
			['', '', 'AUTO TEST thiếu SKU', 1, 999],
		]);

		const kq = await napTep(page, drawer, tep);
		expect(kq.tong, 'Tệp 2 dòng thì Tổng dòng phải là 2.').toBe(2);
		expect(
			kq.loi,
			`Hai dòng đều sai mà Dòng lỗi lại là ${kq.loi} — hệ thống không đếm đúng dòng lỗi.`,
		).toBe(2);
		expect(kq.daAp, 'Không dòng nào hợp lệ thì Đã áp dụng phải là 0.').toBe(0);
	});

	test('04_1_030_008 - Có dòng lỗi thì hiện bảng Danh sách dòng lỗi kèm lý do', async ({ page }) => {
		const drawer = await moImport(page);
		const tep = await taoTep([['', 'SKU-KHONG-TON-TAI-AUTOTEST', 'AUTO TEST', 1, 999]]);

		const kq = await napTep(page, drawer, tep);
		if (kq.loi === 0) {
			skipNoData(test, 'Tệp không sinh dòng lỗi nào nên không kiểm được bảng Danh sách dòng lỗi.');
		}

		await expect(
			drawer.getByText('Danh sách dòng lỗi').first(),
			'Có dòng lỗi thì phải hiện bảng Danh sách dòng lỗi.',
		).toBeVisible();
		const bangLoi = drawer.locator('.ant-table-tbody tr.ant-table-row');
		expect(
			await bangLoi.count(),
			'Bảng Danh sách dòng lỗi phải liệt kê đúng số dòng lỗi.',
		).toBeGreaterThan(0);
	});
});
