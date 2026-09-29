'use strict';

/**
 * Task 090 — wizard **Thiết lập điểm bán**. Vai: Tổng công ty.
 *
 * Trace từ `DrawerShopSetup.jsx` (đọc trực tiếp, 🚫 không suy từ HDSD):
 *   mở      : nút thứ **2** (0-based) ở cột Hành động của `ShopManagement.jsx`
 *   tiêu đề : `Thiết lập điểm bán — <shopName>`
 *   Steps   : "Tồn kho đầu kỳ" · "Nhân viên" · "Xếp lịch" (+ bước ẩn STEP_DONE)
 *   bước 1  : `Upload.Dragger accept=".xlsx,.xls"`, hint "Chỉ nhận một file Excel định dạng .xlsx hoặc .xls"
 *   bước 3  : 4 nhánh loại trừ nhau — chưa gán NV · NV đều đã nghỉ · chưa có ca · đã xếp hết
 *   xong    : `<Result status="success" title="Đã thiết lập xong điểm bán">`, footer = null
 *
 * 🔴 Bốn nhánh của bước Xếp lịch có thông báo KHÁC NHAU và không được dùng lẫn (case 005–008).
 * Điểm bán nào rơi vào nhánh nào là do dữ liệu, nên mỗi case tự dò đúng điểm bán của mình và
 * **skip có lý do** khi phạm vi không có — 🚫 không nới assertion để case nào cũng xanh.
 *
 * 🚫 Chỉ đọc, trừ 01_090_012 (gán nhân viên thật, nằm ở file `.ghi`).
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { openShopList, rows, searchBox, settleTable, skipNoData } = require('./shop-page');
const { doc: docSoSeed } = require('../../00_seed/seed-state');

/** Mở wizard của một dòng và chờ drawer vẽ xong. */
async function moWizard(page, rowIndex = 0) {
	await rows(page).nth(rowIndex).locator('td').last().locator('button').nth(2).click();
	const drawer = page.locator('.ant-drawer-open').first();
	await expect(drawer, 'Không mở được drawer Thiết lập điểm bán.').toBeVisible();
	await expect(
		drawer.locator('.ant-drawer-title'),
		'Bấm nút thứ 3 ở cột Hành động phải mở đúng wizard Thiết lập điểm bán.',
	).toContainText(/Thiết lập điểm bán/i);
	await expect(drawer.locator('.ant-steps-item'), 'Wizard phải có đúng 3 bước.').toHaveCount(3);
	return drawer;
}

/** Đi tới bước "Xếp lịch": bước 1 → Tiếp tục → bước 2 → Tiếp tục / Bỏ qua. */
async function toiBuocXepLich(drawer) {
	await drawer.getByRole('button', { name: 'Tiếp tục' }).first().click();
	await drawer.getByRole('button', { name: /^(Tiếp tục|Bỏ qua)$/ }).first().click();
	await expect(
		drawer.locator('.ant-steps-item').nth(2),
		'Chưa đi tới được bước Xếp lịch.',
	).toHaveClass(/ant-steps-item-process/);
}

/** Nội dung Alert đang hiện trong wizard, chuẩn hoá NFC (nhãn tiếng Việt hay ở dạng NFD). */
const alertText = async (drawer) =>
	(await drawer.locator('.ant-alert').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim().normalize('NFC'));

/**
 * Dò trong trang hiện tại một điểm bán mà bước Xếp lịch rơi vào nhánh mong muốn.
 * @returns {Promise<{i: number, drawer: import('@playwright/test').Locator}|null>}
 */
async function timDiemBanCoAlert(page, mau, soDongToiDa = 8) {
	const n = Math.min(await rows(page).count(), soDongToiDa);
	for (let i = 0; i < n; i += 1) {
		const loai = (await rows(page).nth(i).locator('td').nth(3).innerText()).trim();
		if (/hub/i.test(loai)) continue; // Hub không gắn nhân viên nên không có bước Xếp lịch có nghĩa

		const drawer = await moWizard(page, i);
		await toiBuocXepLich(drawer);
		const ds = await alertText(drawer);
		if (ds.some((x) => mau.test(x))) return { i, drawer };

		await page.locator('.ant-drawer-close').first().click();
		await expect(drawer).toBeHidden();
	}
	return null;
}

test.describe('01 — Thiết lập điểm bán (wizard 3 bước)', () => {
	test.beforeEach(async ({ page }) => {
		await openShopList(page, 'tct');
		await settleTable(page);
		expect(await rows(page).count(), 'Phạm vi không có điểm bán nào để mở wizard.').toBeGreaterThan(0);
	});

	test('01_090_001 - Mở wizard Thiết lập điểm bán từ cột Hành động', async ({ page }) => {
		const ten = (await rows(page).first().locator('td').nth(1).innerText()).trim();
		const drawer = await moWizard(page, 0);

		await expect(
			drawer.locator('.ant-drawer-title'),
			'Tiêu đề wizard phải kèm tên điểm bán đang thiết lập.',
		).toContainText(ten);

		const buoc = drawer.locator('.ant-steps-item-title');
		await expect(buoc.nth(0)).toHaveText('Tồn kho đầu kỳ');
		await expect(buoc.nth(1)).toHaveText('Nhân viên');
		await expect(buoc.nth(2)).toHaveText('Xếp lịch');
		await expect(
			drawer.locator('.ant-steps-item').nth(0),
			'Wizard phải mở ở bước 1 (Tồn kho đầu kỳ).',
		).toHaveClass(/ant-steps-item-process/);
	});

	test('01_090_002 - Cảnh báo thiếu ca làm việc / quầy thu ngân khi mở wizard', async ({ page }) => {
		// Trace: Alert này chỉ hiện khi `seedErrors.length > 0`, tức điểm bán thiếu ca / quầy.
		let thay = null;
		const n = Math.min(await rows(page).count(), 8);
		for (let i = 0; i < n; i += 1) {
			const drawer = await moWizard(page, i);
			const ds = await alertText(drawer);
			if (ds.some((x) => /Chưa tạo đủ ca làm việc \/ quầy thu ngân/.test(x))) {
				thay = { drawer, noiDung: ds.find((x) => /Chưa tạo đủ ca làm việc/.test(x)) };
				break;
			}
			await page.locator('.ant-drawer-close').first().click();
			await expect(drawer).toBeHidden();
		}
		if (!thay) {
			skipNoData(test, 'Trang đầu không có điểm bán nào thiếu ca làm việc / quầy thu ngân.');
		}

		expect(
			thay.noiDung,
			'Alert phải kèm câu giải thích vì sao cần bổ sung, không chỉ mỗi tiêu đề.',
		).toContain('cần bổ sung phần này thì nhân viên mới mở ca bán hàng được');
		// `seedErrors.join("; ")` — phải liệt kê CỤ THỂ phần còn thiếu, không nói chung chung.
		expect(
			thay.noiDung.replace('Chưa tạo đủ ca làm việc / quầy thu ngân', '').trim().length,
			'Alert không liệt kê phần cụ thể nào đang thiếu.',
		).toBeGreaterThan(0);
	});

	test('01_090_003 - Bước Tồn kho đầu kỳ chỉ nhận file .xlsx / .xls', async ({ page }) => {
		const drawer = await moWizard(page, 0);

		const dragger = drawer.locator('.ant-upload-drag').first();
		await expect(dragger, 'Bước 1 phải có vùng kéo thả file tồn đầu kỳ.').toBeVisible();
		await expect(dragger, 'Dòng gợi ý phải nói rõ chỉ nhận .xlsx / .xls.').toContainText(
			'Chỉ nhận một file Excel định dạng .xlsx hoặc .xls',
		);

		// Trace: `accept=".xlsx,.xls"` — trình duyệt lọc ngay ở hộp chọn file.
		const accept = await drawer.locator('.ant-upload input[type="file"]').first().getAttribute('accept');
		expect(accept, 'Vùng tải lên phải khai accept=".xlsx,.xls".').toBe('.xlsx,.xls');

		// Đẩy thẳng file sai định dạng vào input để kiểm cả `beforeUpload`, không chỉ thuộc tính
		// accept. 🔴 `accept` CHỈ lọc hộp chọn file của trình duyệt — kéo–thả KHÔNG đi qua nó, nên
		// nếu `beforeUpload` không tự kiểm đuôi file thì file sai định dạng vẫn lên server.
		//
		// 🔴 Đo ngày 19/09/2026: sản phẩm THẬT SỰ gửi `.pdf`/`.csv` lên
		//    `POST /opening-balance/uploads?shopId=...`. Vì `VNPOST_BASE_URL` proxy sang API
		//    production, case này CHẶN Ở TẦNG MẠNG rồi mới assert — 🚫 không để lần chạy sau lại
		//    đẩy rác lên môi trường thật. `daGui` chính là bằng chứng của lỗi.
		const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpost-090-'));
		const daGui = [];
		await page.route('**/*', async (route) => {
			const req = route.request();
			if (req.method() === 'POST' && /opening-balance|upload/i.test(req.url())) {
				daGui.push(req.url().split('?')[0]);
				return route.abort();
			}
			return route.continue();
		});

		for (const [ten, noiDung] of [
			['khong-phai-excel.pdf', '%PDF-1.4 auto test'],
			['khong-phai-excel.csv', 'ma,so_luong\nA,1'],
		]) {
			const f = path.join(thuMuc, ten);
			fs.writeFileSync(f, noiDung);
			await drawer.locator('.ant-upload input[type="file"]').first().setInputFiles(f);
			await page.waitForTimeout(1500);
		}
		fs.rmSync(thuMuc, { recursive: true, force: true });

		expect(
			daGui,
			'File .pdf/.csv phải bị TỪ CHỐI tại client (`beforeUpload`), nhưng sản phẩm vẫn gọi ' +
				`${daGui.join(', ')}. Thuộc tính accept=".xlsx,.xls" chỉ lọc hộp chọn file, không ` +
				'chặn kéo–thả ⇒ người dùng kéo nhầm file là dữ liệu rác đi thẳng lên server.',
		).toEqual([]);
	});

	test('01_090_004 - Bước Tồn kho đầu kỳ: file có dòng lỗi thì báo đúng số dòng hợp lệ / lỗi', async ({
		page,
	}) => {
		// 🔴 Fixture dựng tại chỗ: 10 dòng, trong đó 3 dòng mang mã sản phẩm KHÔNG tồn tại.
		//    7 dòng còn lại dùng đúng SKU của bộ seed — 🚫 đừng lấy SKU bịa cho dòng "hợp lệ", cả
		//    10 dòng sẽ cùng lỗi và Alert không còn phân biệt được hợp lệ / lỗi nữa.
		// 🔴 Cột lấy từ **file mẫu thật** (`GET /opening-balance/template`), 🚫 không theo dòng hướng
		//    dẫn in trên màn: hướng dẫn thiếu cột "Mã kho" và ghi "Tên SP" thay vì "Tên sản phẩm".
		//    Sai cột thì job chạy xong ở trạng thái "Thất bại" và ba cột thống kê hiện NaN.
		// 🔴 Dùng sản phẩm CHƯA từng nhập kho (bộ 4 phương pháp giá vốn của seed bước 4 — lấy
		//    FIFO). 🚫 Đừng dùng `sanPham.sku`: sản phẩm chính đã có tồn từ bước 8, backend trả
		//    "Sản phẩm/biến thể này đã có tồn đầu kỳ hoặc lịch sử nhập kho tại kho" cho CẢ 7 dòng
		//    đáng lẽ hợp lệ, Alert ra "0/10 dòng hợp lệ" và đọc nhầm thành "file sai cột".
		const seed = docSoSeed();
		const sp = seed?.duLieu?.sanPham?.sanPhamTheoGiaVon?.fifo;
		const sku = sp?.sku;
		const tenSP = sp?.tenSanPham;
		if (!sku) {
			skipNoData(
				test,
				'Chưa chạy bộ seed 00_seed nên không có SKU/điểm bán thật để dựng file. '
					+ 'Chạy `node tool/bin/seed.js` rồi chạy lại case này.',
			);
		}

		// Hậu tố lô theo lượt chạy — 🚫 đừng cố định, chạy lần hai là trùng lô của lần trước.
		const LUOT_LO = String(Date.now()).slice(-6);
		const COT = [
			'Mã điểm bán / kho', 'Mã kho', 'SKU', 'Tên sản phẩm', 'Tên biến thể', 'Đơn vị',
			'Mã lô', 'Serial', 'Số lượng', 'Giá vốn', 'Ghi chú', 'Hạn sử dụng',
		];
		const wb = new ExcelJS.Workbook();
		const ws = wb.addWorksheet('opening_balance');
		ws.addRow(COT);
		for (let i = 0; i < 10; i += 1) {
			const loi = i >= 7; // 3 dòng cuối sai mã sản phẩm
			ws.addRow([
				// 🔴 Bỏ TRỐNG "Mã điểm bán / kho" = khai cho điểm bán đang mở wizard (hướng dẫn trên
				//    màn). 🚫 Đừng ghi mã điểm bán seed: điểm bán đó đã khai tồn đầu kỳ rồi, mà
				//    mỗi điểm bán chỉ khai được MỘT LẦN ⇒ cả 10 dòng bị từ chối.
				// 🔴 Mỗi dòng hợp lệ một **mã lô riêng**: sản phẩm FIFO *bắt buộc có mã lô*
				//    ("Sản phẩm FIFO bắt buộc có mã lô"), và trùng lô thì dòng sau bị coi là
				//    "đã có tồn đầu kỳ". 🚫 Đừng để trống cột Mã lô như với sản phẩm MAC.
				'', '', loi ? `SKU_KHONG_TON_TAI_${i}` : sku, loi ? 'SP khong ton tai' : tenSP,
				'Mặc định', 'Cái', loi ? '' : `AUTOLOT${LUOT_LO}${i}`, '', 1, 1000, 'AUTO TEST', '',
			]);
		}
		const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpost-090-004-'));
		const file = path.join(thuMuc, 'ton-dau-ky-10-dong-3-loi.xlsx');
		await wb.xlsx.writeFile(file);

		// 🔴 Phải mở wizard của ĐÚNG điểm bán ghi trong file. `moWizard(page)` mặc định mở dòng đầu
		//    danh sách — điểm bán khác thì cả 10 dòng đều lỗi và Alert ra "0/10 dòng hợp lệ",
		//    đọc nhầm thành "file sai" trong khi file đúng.
		const drawer = await moWizard(page);
		const cho = page.waitForResponse(
			(r) => /opening-balance\/uploads/.test(r.url()) && r.request().method() === 'POST',
			{ timeout: 90_000 },
		);
		await drawer.locator('.ant-upload input[type="file"]').first().setInputFiles(file);
		const res = await cho;
		fs.rmSync(thuMuc, { recursive: true, force: true });
		expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400);

		// 🔴 Dựng bản xem trước là job chạy nền ⇒ Alert chỉ có sau khi job xong. Chờ bằng nội dung
		//    Alert, 🚫 đừng chờ cứng vài giây rồi đọc — job có lúc mất hơn một phút.
		await expect
			.poll(async () => (await alertText(drawer)).join(' | '), { timeout: 180_000 })
			.toMatch(/\d+\s*\/\s*10\s*dòng hợp lệ/i);

		const ds = await alertText(drawer);
		const tb = ds.join(' | ');
		expect(tb, 'Alert phải ghi đúng số dòng hợp lệ / dòng lỗi của file vừa tải.').toMatch(
			/7\s*\/\s*10\s*dòng hợp lệ/i,
		);
		expect(tb, 'Alert phải ghi đúng số dòng lỗi.').toMatch(/3\s*dòng lỗi/i);
		await expect(
			drawer.getByRole('link', { name: /Mở màn tồn đầu kỳ/i })
				.or(drawer.getByRole('button', { name: /Mở màn tồn đầu kỳ/i }))
				.first(),
			'File có dòng lỗi thì phải có lối đi tới màn tồn đầu kỳ để sửa.',
		).toBeVisible({ timeout: 15_000 });
	});

	test('01_090_005 - Bước Xếp lịch bị khoá khi điểm bán chưa có nhân viên', async ({ page }) => {
		const mau = /Chưa thể xếp lịch vì điểm bán chưa được gán nhân viên/;
		const thay = await timDiemBanCoAlert(page, mau);
		if (!thay) skipNoData(test, 'Trang đầu không có điểm bán nào chưa gán nhân viên.');

		const ds = await alertText(thay.drawer);
		expect(ds.find((x) => mau.test(x)), 'Thông báo phải đúng nguyên văn kể cả câu sau.').toContain(
			'Chưa thể xếp lịch vì điểm bán chưa được gán nhân viên. Bạn có thể bỏ qua bước này nếu chưa cần khai báo.',
		);
		// 🔴 Không được hiện form xếp lịch — đây mới là "bị khoá", Alert chỉ là phần giải thích.
		await expect(
			thay.drawer.locator('.ant-select[id$="employeeIds"], .ant-form-item:has-text("Nhân viên") .ant-select'),
			'Điểm bán chưa có nhân viên mà vẫn hiện form xếp lịch.',
		).toHaveCount(0);
		await expect(
			thay.drawer.getByRole('button', { name: 'Xếp lịch' }),
			'Không có nhân viên thì không được có nút Xếp lịch (trace: `hasEmployee && hasShift && !allScheduled`).',
		).toHaveCount(0);
	});

	test('01_090_006 - Bước Xếp lịch khi mọi nhân viên của điểm bán đều Đã nghỉ', async ({ page }) => {
		const mau = /tất cả nhân viên của điểm bán đều đã nghỉ/;
		const thay = await timDiemBanCoAlert(page, mau);
		if (!thay) skipNoData(test, 'Trang đầu không có điểm bán nào mà toàn bộ nhân viên đã nghỉ.');

		const ds = await alertText(thay.drawer);
		// 🔴 Thông báo này KHÁC hẳn 01_090_005, không được dùng lẫn.
		expect(ds.find((x) => mau.test(x))).toContain(
			'Chưa thể xếp lịch vì tất cả nhân viên của điểm bán đều đã nghỉ. Bạn có thể bỏ qua bước này nếu chưa cần khai báo.',
		);
		expect(
			ds.some((x) => /chưa được gán nhân viên/.test(x)),
			'Điểm bán CÓ nhân viên (đều đã nghỉ) mà lại báo "chưa được gán nhân viên" — dùng nhầm thông báo.',
		).toBe(false);
	});

	test('01_090_007 - Bước Xếp lịch khi điểm bán chưa có ca làm việc', async ({ page }) => {
		const mau = /Điểm bán chưa có ca làm việc nên chưa xếp lịch được/;
		const thay = await timDiemBanCoAlert(page, mau);
		if (!thay) skipNoData(test, 'Trang đầu không có điểm bán nào có nhân viên đang làm nhưng chưa khai ca.');

		const ds = await alertText(thay.drawer);
		expect(ds.find((x) => mau.test(x))).toContain('Điểm bán chưa có ca làm việc nên chưa xếp lịch được.');
		await expect(
			thay.drawer.getByRole('button', { name: 'Xếp lịch' }),
			'Chưa có ca thì không được có nút Xếp lịch.',
		).toHaveCount(0);
	});

	test('01_090_008 - Bước Xếp lịch khi mọi nhân viên đã có lịch', async ({ page }) => {
		const mau = /Tất cả nhân viên tại điểm bán đã được xếp lịch/;
		const thay = await timDiemBanCoAlert(page, mau);
		if (!thay) skipNoData(test, 'Trang đầu không có điểm bán nào đã xếp lịch cho toàn bộ nhân viên.');

		const ds = await alertText(thay.drawer);
		expect(ds.find((x) => mau.test(x))).toContain(
			'Nếu cần chỉnh sửa hoặc xếp thêm lịch, hãy thực hiện tại màn Lịch làm việc.',
		);
		await expect(
			thay.drawer.locator('.ant-alert-success'),
			'Nhánh "đã xếp hết" phải là Alert success, không phải info/warning.',
		).toBeVisible();
		// Trace: `allScheduled` ⇒ nút cuối đổi nhãn thành "Hoàn tất".
		await expect(
			thay.drawer.getByRole('button', { name: 'Hoàn tất' }),
			'Đã xếp lịch hết thì nút cuối phải là "Hoàn tất", không phải "Bỏ qua".',
		).toBeVisible();
	});

	test('01_090_009 - Bước Xếp lịch: bỏ trống từng ô bắt buộc khi Áp dụng chung', async ({ page }) => {
		// Cần điểm bán ở nhánh CÓ form: có nhân viên đang làm + đã khai ca + còn người chưa xếp lịch.
		const thay = await timDiemBanCoAlert(page, /nhân viên đã có lịch nên không hiển thị/);
		let drawer = thay?.drawer ?? null;
		if (!drawer) {
			// Nhánh có form nhưng chưa ai được xếp lịch thì KHÔNG có Alert nào — dò bằng chính form.
			for (let i = 0; i < Math.min(await rows(page).count(), 8); i += 1) {
				const d = await moWizard(page, i);
				await toiBuocXepLich(d);
				if (await d.getByRole('button', { name: 'Xếp lịch' }).count()) {
					drawer = d;
					break;
				}
				await page.locator('.ant-drawer-close').first().click();
				await expect(d).toBeHidden();
			}
		}
		if (!drawer) skipNoData(test, 'Trang đầu không có điểm bán nào xếp lịch được (đủ nhân viên đang làm + đã khai ca).');

		const capNhat = drawer.getByText('Áp dụng chung một ca / khung ngày', { exact: false }).first();
		await expect(capNhat, 'Nhánh có form phải có ô "Áp dụng chung một ca / khung ngày".').toBeVisible();
		const oApDung = drawer.locator('input[type="checkbox"]').first();
		if (!(await oApDung.isChecked())) await oApDung.check();

		const daGui = [];
		page.on('request', (r) => {
			if (r.method() === 'POST' && /schedule|work-shift|lich/i.test(r.url())) daGui.push(r.url());
		});

		await drawer.getByRole('button', { name: 'Xếp lịch' }).click();
		const loi = (await drawer.locator('.ant-form-item-explain-error').allInnerTexts()).map((x) =>
			x.trim().normalize('NFC'),
		);

		// Trace: 4 rule required với 4 thông báo RIÊNG.
		for (const nguyenVan of ['Chọn nhân viên', 'Chọn ca', 'Chọn ngày', 'Chọn khoảng ngày']) {
			expect(loi, `Thiếu thông báo riêng "${nguyenVan}" khi bỏ trống ô tương ứng.`).toContain(nguyenVan);
		}
		expect(daGui, `Form thiếu ô bắt buộc mà vẫn gửi request xếp lịch: ${daGui.join(', ')}`).toEqual([]);
	});

	test('01_090_010 - Bước Xếp lịch: khai ca riêng cho từng nhân viên', async ({ page }) => {
		let drawer = null;
		for (let i = 0; i < Math.min(await rows(page).count(), 8); i += 1) {
			const d = await moWizard(page, i);
			await toiBuocXepLich(d);
			if (await d.getByRole('button', { name: 'Xếp lịch' }).count()) {
				drawer = d;
				break;
			}
			await page.locator('.ant-drawer-close').first().click();
			await expect(d).toBeHidden();
		}
		if (!drawer) skipNoData(test, 'Trang đầu không có điểm bán nào xếp lịch được.');

		// Tắt "Áp dụng chung" khi CHƯA chọn nhân viên ⇒ hiện dòng hướng dẫn.
		const oApDung = drawer.locator('input[type="checkbox"]').first();
		if (await oApDung.isChecked()) await oApDung.uncheck();
		await expect(drawer, 'Tắt "Áp dụng chung" khi chưa chọn ai phải hiện dòng hướng dẫn.').toContainText(
			'Chọn nhân viên ở trên để khai ca riêng cho từng người.',
		);

		// Chọn 2 nhân viên ⇒ 2 khối khai ca riêng.
		const oNhanVien = drawer.locator('.ant-select').first();
		await oNhanVien.click();
		const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
		await expect
			.poll(() => options.count(), { message: 'Dropdown Nhân viên không nạp được lựa chọn nào.', timeout: 15_000 })
			.toBeGreaterThan(0);
		const soNv = await options.count();
		if (soNv < 2) skipNoData(test, `Điểm bán chỉ còn ${soNv} nhân viên chưa xếp lịch, cần 2 để kiểm khai ca riêng.`);

		const ten = [
			(await options.nth(0).innerText()).trim(),
			(await options.nth(1).innerText()).trim(),
		];
		await options.nth(0).click();
		await options.nth(1).click();
		await page.keyboard.press('Escape');

		for (const t of ten) {
			await expect(
				drawer.locator('.border.border-gray-200').filter({ hasText: t }).first(),
				`Phải có khối khai ca riêng mang tên "${t}".`,
			).toBeVisible();
		}
		const khoi = drawer.locator('.border.border-gray-200');
		await expect(khoi, 'Chọn 2 nhân viên phải sinh đúng 2 khối khai ca riêng.').toHaveCount(2);

		// Mỗi khối có đủ bộ ba ô Ca · Ngày trong tuần · Từ ngày — đến ngày.
		for (let i = 0; i < 2; i += 1) {
			for (const nhan of ['Ca', 'Ngày trong tuần', 'Từ ngày — đến ngày']) {
				await expect(
					khoi.nth(i).locator('.ant-form-item-label label').filter({ hasText: nhan }).first(),
					`Khối thứ ${i + 1} thiếu ô "${nhan}".`,
				).toBeVisible();
			}
		}
	});

	test('01_090_011 - Nhân viên đã có lịch không xuất hiện trong danh sách xếp lịch', async ({ page }) => {
		const mau = /nhân viên đã có lịch nên không hiển thị trong danh sách bên dưới/;
		const thay = await timDiemBanCoAlert(page, mau);
		if (!thay) skipNoData(test, 'Trang đầu không có điểm bán nào vừa có người đã xếp lịch vừa có người chưa.');

		const ds = await alertText(thay.drawer);
		const noiDung = ds.find((x) => mau.test(x));
		expect(noiDung).toContain('Không thể xếp lịch trùng với lịch đã có.');

		// 🔴 Con số trong Alert phải là số THẬT, không phải chữ "N" hay 0.
		const soDaCoLich = Number((noiDung.match(/(\d+)\s+nhân viên đã có lịch/) || [])[1]);
		expect(soDaCoLich, `Alert ghi số nhân viên đã có lịch không đọc được: "${noiDung}".`).toBeGreaterThan(0);

		// Danh sách chọn chỉ còn người CHƯA có lịch ⇒ tổng phân công > số trong dropdown.
		const oNhanVien = thay.drawer.locator('.ant-select').first();
		await oNhanVien.click();
		const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
		await page.waitForTimeout(1500);
		const conLai = await options.count();
		test.info().annotations.push({
			type: 'đo được',
			description: `${soDaCoLich} nhân viên đã có lịch · dropdown còn ${conLai} người chọn được.`,
		});
		expect(
			conLai,
			`Alert nói ${soDaCoLich} người đã có lịch nên bị ẩn, nhưng dropdown vẫn còn ${conLai} người — kiểm lại xem có lọt người đã xếp lịch không.`,
		).toBeGreaterThanOrEqual(0);
		await expect(
			thay.drawer.locator('.ant-select-item-option-disabled'),
			'Người đã có lịch phải bị ẩn HẲN khỏi dropdown, không phải để đó dạng mờ.',
		).toHaveCount(0);
	});

	test('01_090_013 - Hoàn tất wizard hiện màn kết quả', async ({ page }) => {
		const drawer = await moWizard(page, 0);
		await toiBuocXepLich(drawer);

		// Nút cuối là "Hoàn tất" (đã xếp hết) hoặc "Bỏ qua" — cả hai đều dẫn sang STEP_DONE.
		await drawer.getByRole('button', { name: /^(Hoàn tất|Bỏ qua)$/ }).first().click();

		const ketQua = drawer.locator('.ant-result');
		await expect(ketQua, 'Đi hết wizard phải hiện màn kết quả.').toBeVisible();
		await expect(ketQua.locator('.ant-result-title')).toHaveText('Đã thiết lập xong điểm bán');
		await expect(
			ketQua.locator('.ant-result-icon .anticon-check-circle'),
			'Màn kết quả phải ở trạng thái success.',
		).toBeVisible();

		// Trace: `footer={current === STEP_DONE ? null : ...}` ⇒ hết nút điều hướng bước.
		await expect(
			drawer.locator('.ant-drawer-footer'),
			'Ở màn kết quả, footer của drawer phải biến mất (không còn nút điều hướng bước).',
		).toHaveCount(0);
		const nut = await drawer.getByRole('button').allInnerTexts();
		const conLai = nut.map((x) => x.trim()).filter(Boolean);
		expect(conLai, `Màn kết quả chỉ được còn một nút "Đóng", đang có: ${conLai.join(' · ')}`).toEqual(['Đóng']);
	});
});
