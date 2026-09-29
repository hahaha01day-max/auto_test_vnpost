'use strict';

/**
 * Task 070 — các case **NHẬP DỮ LIỆU THẬT** từ file Excel.
 *
 * 🔴 Mỗi case chạy là tạo điểm bán thật, và màn này KHÔNG có chức năng xoá. File sinh ra luôn đặt
 * tên `AUTO TEST KHONG DUNG <số>` và mã `0601AUTO<số>` để lọc lại sau. 🚫 Không chạy lặp cho vui.
 *
 * 🔴 Nhập chạy NỀN ở import-service: `POST /import/api/v1/shops/excel` chỉ trả `jobId`, kết quả
 * lấy bằng cách hỏi `/status` theo nhịp (`pollingInterval: 3000`). Vì vậy mọi case ở đây chờ theo
 * **trạng thái job**, 🚫 không `waitForTimeout` đoán chừng.
 *
 * 🔴 Thẻ Lịch sử nhập do **import-service** phục vụ; service tắt thì API trả 500 và case SKIP có
 * lý do chứ không đỏ. Kiểm nhanh: gọi thử `/import/api/v1/shops/history`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { openShopList, reloadBy, rows, searchBox, settleTable, skipNoData } = require('./shop-page');
const { dongHopLe, dongThieuTen, maMoi, taoFileExcel } = require('./excel-fixture');

test.describe.configure({ mode: 'serial' });

const API_IMPORT = '/import/api/v1/shops/excel';
const API_HISTORY = '/import/api/v1/shops/history';
const API_STATUS = '/import/api/v1/shops/status';

async function moDrawerNhap(page) {
	await page.getByRole('button', { name: 'Nhập từ excel' }).first().click();
	const drawer = page.locator('.ant-drawer-open').first();
	await expect(drawer, 'Không mở được drawer Nhập từ excel.').toBeVisible();
	await expect(drawer.locator('.ant-drawer-title')).toContainText(/Nhập điểm bán từ file excel/i);
	return drawer;
}

/** Mở thẻ Lịch sử nhập; SKIP có lý do nếu import-service không phục vụ được. */
async function moTheLichSu(page, drawer) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API_HISTORY) && r.request().method() === 'GET',
		{ timeout: 30_000 },
	);
	await drawer.getByRole('tab', { name: 'Lịch sử nhập' }).click();
	const res = await cho.catch(() => null);

	if (!res || res.status() !== 200) {
		skipNoData(
			test,
			`API lịch sử nhập trả ${res ? res.status() : 'không hồi âm'} — nhiều khả năng ` +
				'import-service không chạy. Bật service rồi chạy lại.',
		);
	}
	return drawer.locator('.ant-table-tbody tr.ant-table-row');
}

/**
 * Chọn file, bấm Xác nhận nhập, chờ job chạy xong.
 * @returns {{jobId: string|null, ketQua: object|null}}
 */
/** Trạng thái job đọc được từ chính response mà app hỏi định kỳ. Khoá là `jobId`. */
const trangThaiJob = new Map();

/** Đăng ký nghe `/status` — phải gọi TRƯỚC khi bấm Xác nhận nhập. */
function ngheTrangThaiJob(page) {
	// 🔴 `POST /excel` trả `data.jobId`, nhưng `/status` lại trả job dưới khoá `data.id` — hai giá
	//    trị này KHÔNG phải lúc nào cũng khớp. Vì mỗi lần chỉ có một job đang chạy, cứ giữ job mới
	//    nhất dưới khoá `MOI_NHAT` và đọc theo đó.
	page.on('response', async (res) => {
		if (!res.url().includes(API_STATUS)) return;
		const d = await res.json().catch(() => null);
		const job = d?.data;
		if (!job) return;
		// Chỉ nhận job được tạo TỪ LÚC case này bắt đầu gửi file trở đi.
		const moc = trangThaiJob.get('MOC_THOI_GIAN');
		if (moc && job.createdDate && new Date(job.createdDate).getTime() < moc - 5_000) return;
		trangThaiJob.set('MOI_NHAT', job);
		if (job.id != null) trangThaiJob.set(String(job.id), job);
	});
}

async function nhapFile(page, drawerVao, duongDan, { dungKhiLoi = false } = {}) {
	let drawer = drawerVao;
	if (dungKhiLoi) await drawer.locator('.ant-checkbox-input').first().check();

	await drawer.locator('input[type="file"]').setInputFiles(duongDan);
	// 🔴 `showUploadList={false}` (DrawerImportBase.jsx) ⇒ KHÔNG có `.ant-upload-list-item` nào.
	//    Tên file được vẽ thẳng vào `.ant-upload-text` bên trong vùng kéo thả. Bám nhầm danh sách
	//    upload là chờ hết timeout rồi đỏ với lý do "element not found".
	await expect(
		drawer.locator('.ant-upload-text'),
		'File hợp lệ phải được nhận (tên file hiện trong vùng kéo thả).',
	).toContainText(path.basename(duongDan));

	// 🔴 Xoá ngay trước khi bấm: app có thể còn hỏi `/status` của job case TRƯỚC, và listener sẽ
	//    ghi đè `MOI_NHAT` bằng job cũ đã `completedDate` ⇒ case này đọc số liệu của case trước.
	trangThaiJob.clear();
	trangThaiJob.set('MOC_THOI_GIAN', Date.now());

	const choPost = page.waitForResponse(
		(r) => r.url().includes(API_IMPORT) && r.request().method() === 'POST',
		{ timeout: 180_000 },
	);
	await drawer.getByRole('button', { name: 'Xác nhận nhập' }).click();
	const body = await (await choPost).json().catch(() => null);
	expect(String(body?.status?.code), `Gửi file nhập thất bại: ${JSON.stringify(body?.status)}`).toBe(
		'200',
	);

	const jobId = body?.data?.jobId != null ? String(body.data.jobId) : null;
	if (!jobId) return { jobId: null, ketQua: null };

	// 🔴 Chờ theo KẾT QUẢ HIỆN TRÊN MÀN, không chờ theo thời gian và cũng không chỉ dựa vào
	//    listener `/status`: app ngừng hỏi `/status` ngay khi job kết thúc, nên nếu lỡ nhịp thì
	//    poll trên listener treo tới hết giờ dù job đã xong từ lâu.
	// 🔴 🚫 Cũng KHÔNG hỏi `/status` bằng `page.request`: request đó không mang token của app,
	//    trả 401 và poll thấy `null` mãi.
	// 🔴 Hai kết cục KHÁC HẲN nhau, phải chờ cả hai:
	//    - nhập sạch lỗi  → `message.success` rồi **drawer TỰ ĐÓNG** (`handleClose`),
	//    - có dòng lỗi    → drawer ở lại và hiện khối "Import thất bại … / Xem lịch sử".
	//    Chỉ chờ chữ trong drawer là hỏng ở trường hợp đầu: drawer biến mất, locator không tìm
	//    thấy gì và case đỏ với lý do "job không kết thúc" trong khi job đã xong xuôi.
	const ketThuc = drawer
		.getByText(/Import (thành công|thất bại)|Xem lịch sử/i)
		.first();
	await expect
		.poll(
			async () =>
				(await drawer.isVisible().catch(() => false)) === false ||
				(await ketThuc.isVisible().catch(() => false)),
			{ message: 'Job nhập Excel không kết thúc trong 3 phút.', timeout: 180_000 },
		)
		.toBe(true);

	// 🔴 Chỉ tin listener khi job đã có `completedDate`; response cuối app kịp nhận thường vẫn là
	//    PENDING với `totalRecords = 0`, tin vào đó là đối chiếu số liệu của một job chưa chạy xong.
	// 🔴 Chờ thêm một nhịp cho job KẾT THÚC trước khi quay sang đọc Lịch sử nhập: bảng lịch sử sắp
	//    xếp mới nhất trước, mà job vừa gửi có thể CHƯA kịp vào bảng ⇒ đọc trúng job của case
	//    TRƯỚC. Triệu chứng đúng kiểu "chạy riêng thì xanh, chạy cả nhóm thì đỏ".
	await expect
		.poll(() => Boolean(trangThaiJob.get('MOI_NHAT')?.completedDate), { timeout: 60_000 })
		.toBe(true)
		.catch(() => {});

	const tuListener = trangThaiJob.get('MOI_NHAT');
	if (tuListener?.completedDate) return { jobId, ketQua: tuListener };

	// Drawer có thể đã tự đóng sau khi nhập sạch lỗi ⇒ mở lại rồi đọc thẻ Lịch sử nhập.
	if (!(await drawer.isVisible().catch(() => false))) drawer = await moDrawerNhap(page);
	return { jobId, ketQua: await ketQuaTuLichSu(page, drawer) };
}

/**
 * Đọc Tổng / Thành công / Thất bại của lần nhập mới nhất từ thẻ **Lịch sử nhập**.
 * Dùng khi listener `/status` lỡ nhịp. Cột theo `DrawerImportBase.jsx`:
 * 0 STT · 1 Thời gian tạo · 2 Thời gian hoàn thành · 3 Tổng · 4 Thành công · 5 Thất bại · 6 Trạng thái.
 */
async function ketQuaTuLichSu(page, drawer) {
	await drawer.getByRole('tab', { name: 'Lịch sử nhập' }).click().catch(() => null);
	const dong = drawer.locator('.ant-table-tbody tr.ant-table-row').first();
	if (!(await dong.count())) return null;

	const so = async (i) => Number((await dong.locator('td').nth(i).innerText()).replace(/\D/g, '') || 0);
	return {
		status: (await dong.locator('td').nth(6).innerText()).trim(),
		totalRecords: await so(3),
		totalSuccess: await so(4),
		totalFailed: await so(5),
	};
}

/** Đếm số điểm bán khớp mã trên màn danh sách. */
async function demTheoMa(page, ma) {
	await openShopList(page, 'tct');
	await reloadBy(page, () => searchBox(page).fill(ma));
	await settleTable(page);
	return rows(page).count();
}

test.describe('01 — Nhập điểm bán từ Excel (GHI DỮ LIỆU THẬT)', () => {
	test.beforeEach(async ({ page }) => {
		// 🔴 Map ở phạm vi module nên GIỮ NGUYÊN giữa các test: không xoá thì case sau đọc trúng
		//    job của case trước, thấy `completedDate` có sẵn và kết luận "xong" ngay lập tức.
		trangThaiJob.clear();
		ngheTrangThaiJob(page);
		await openShopList(page, 'tct');
	});

	test('01_070_002 - Nhập file hợp lệ: job báo Tổng/Thành công đúng, điểm bán được tạo', async ({
		page,
	}) => {
		const ma = maMoi();
		const file = await taoFileExcel([dongHopLe({ ma, ten: `AUTO TEST KHONG DUNG ${ma}` })]);

		const drawer = await moDrawerNhap(page);
		const { jobId, ketQua } = await nhapFile(page, drawer, file);
		if (!jobId) skipNoData(test, 'Server không trả jobId — không theo dõi được tiến trình nhập.');

		expect(Number(ketQua?.totalRecords), 'File 1 dòng thì Tổng phải là 1.').toBe(1);
		expect(
			Number(ketQua?.totalSuccess),
			`Nhập thất bại: thành công ${ketQua?.totalSuccess}/${ketQua?.totalRecords}.`,
		).toBe(1);

		expect(await demTheoMa(page, ma), `Nhập xong nhưng tìm mã ${ma} không ra dòng nào.`).toBe(1);
	});

	test('01_070_003 - File có 1 dòng lỗi 1 dòng đúng: đếm đúng Thành công/Thất bại', async ({
		page,
	}) => {
		const maOk = maMoi();
		const maLoi = `${maOk}X`;
		const file = await taoFileExcel([
			dongHopLe({ ma: maOk, ten: `AUTO TEST KHONG DUNG ${maOk}` }),
			dongThieuTen({ ma: maLoi }),
		]);

		const drawer = await moDrawerNhap(page);
		const { jobId, ketQua } = await nhapFile(page, drawer, file);
		if (!jobId) skipNoData(test, 'Server không trả jobId.');

		expect(Number(ketQua?.totalRecords), 'File 2 dòng thì Tổng phải là 2.').toBe(2);
		expect(
			Number(ketQua?.totalSuccess),
			'Dòng hợp lệ phải được tạo dù dòng kia lỗi.',
		).toBe(1);
		expect(
			Number(ketQua?.totalFailed),
			'Dòng thiếu Tên cửa hàng (trường bắt buộc) phải bị đếm là thất bại.',
		).toBe(1);

		expect(await demTheoMa(page, maOk), 'Dòng hợp lệ phải tạo được điểm bán.').toBe(1);
		expect(await demTheoMa(page, maLoi), 'Dòng lỗi KHÔNG được tạo điểm bán.').toBe(0);
	});

	test('01_070_008 - File chỉ có tiêu đề, không dòng nào: không tạo bản ghi', async ({ page }) => {
		const file = await taoFileExcel([], 'chi-co-tieu-de.xlsx');

		const drawer = await moDrawerNhap(page);
		const { jobId, ketQua } = await nhapFile(page, drawer, file);

		// Sản phẩm được phép xử lý hai kiểu: chặn ngay, hoặc chạy job với Tổng = 0.
		// Điều KHÔNG được phép là tạo ra bản ghi nào.
		if (jobId) {
			expect(
				Number(ketQua?.totalSuccess || 0),
				'File rỗng mà vẫn tạo được bản ghi.',
			).toBe(0);
		}
	});

	test('01_070_010 - Tắt "Dừng lại khi có lỗi": dòng sau dòng lỗi vẫn được nhập', async ({
		page,
	}) => {
		const maLoi = `${maMoi()}X`;
		const maSau = maMoi();
		const file = await taoFileExcel([
			dongThieuTen({ ma: maLoi }),
			dongHopLe({ ma: maSau, ten: `AUTO TEST KHONG DUNG ${maSau}` }),
		]);

		const drawer = await moDrawerNhap(page);
		// Mặc định đã TẮT (`useState(false)`) — khẳng định lại để case nói rõ điều kiện của nó.
		await expect(
			drawer.locator('.ant-checkbox-input').first(),
			'Case này cần "Dừng lại khi có lỗi" ở trạng thái TẮT.',
		).not.toBeChecked();

		const { jobId, ketQua } = await nhapFile(page, drawer, file);
		if (!jobId) skipNoData(test, 'Server không trả jobId.');

		expect(
			Number(ketQua?.totalSuccess),
			'Tắt "Dừng lại khi có lỗi" thì dòng hợp lệ SAU dòng lỗi vẫn phải được nhập. ' +
				`Job báo: Tổng=${ketQua?.totalRecords} Thành công=${ketQua?.totalSuccess} ` +
				`Thất bại=${ketQua?.totalFailed} · lỗi: ${ketQua?.errorMessage ?? '(không có)'}`,
		).toBe(1);
		expect(await demTheoMa(page, maSau), `Dòng sau dòng lỗi phải tạo được điểm bán.`).toBe(1);
	});

	test('01_070_011 - Lần nhập có dòng lỗi thì tải được file lỗi ở Lịch sử nhập', async ({ page }) => {
		const drawer = await moDrawerNhap(page);
		const dong = await moTheLichSu(page, drawer);

		const so = await dong.count();
		if (so === 0) skipNoData(test, 'Lịch sử nhập chưa có lần nhập nào để tải file lỗi.');

		// 🔴 Nút Thao tác chỉ BẬT khi job ở trạng thái FAILED (`disabled` ở DrawerImportBase.jsx).
		//    Không có lần nhập FAILED nào thì SKIP, 🚫 đừng assert nút phải bấm được.
		const nutTai = drawer.locator('.ant-table-tbody button').filter({ hasNot: page.locator('x') });
		let idx = -1;
		for (let i = 0; i < (await nutTai.count()); i++) {
			if (await nutTai.nth(i).isEnabled()) {
				idx = i;
				break;
			}
		}
		if (idx < 0) skipNoData(test, 'Chưa có lần nhập nào ở trạng thái Thất bại để tải file lỗi.');

		const cho = page.waitForEvent('download', { timeout: 60_000 });
		await nutTai.nth(idx).click();
		const tai = await cho;
		expect(
			await tai.suggestedFilename(),
			'File lỗi tải về phải là file Excel.',
		).toMatch(/\.xlsx?$/i);
	});

	test('01_070_006 - Lọc Lịch sử nhập theo khoảng thời gian', async ({ page }) => {
		const drawer = await moDrawerNhap(page);
		await moTheLichSu(page, drawer);

		// 🔴 Kiểm ĐIỀU KIỆN SKIP TRƯỚC khi tạo promise chờ response. Gọi `skipNoData` trong lúc
		//    `waitForResponse` đang treo thì Playwright huỷ test và báo "page.waitForResponse:
		//    Test ended" — nhìn như lỗi sản phẩm, thực ra chỉ là skip đặt sai chỗ.
		await drawer.locator('.ant-picker').first().click();
		const homNay = page
			.locator('.ant-picker-dropdown:visible .ant-picker-preset, .ant-picker-dropdown:visible .ant-tag')
			.first();
		if (!(await homNay.count())) {
			await page.keyboard.press('Escape');
			skipNoData(test, 'Ô chọn khoảng thời gian không có lựa chọn dựng sẵn để bấm.');
		}

		const cho = page.waitForResponse(
			(r) => r.url().includes(API_HISTORY) && r.request().method() === 'GET',
			{ timeout: 30_000 },
		);
		await homNay.click();
		const res = await cho;

		const q = new URL(res.url()).searchParams;
		expect(
			q.get('startTime'),
			'Đổi khoảng thời gian mà request không mang startTime — bộ lọc không có tác dụng.',
		).toBeTruthy();
		expect(q.get('endTime'), 'Request lịch sử nhập phải mang endTime.').toBeTruthy();
	});

	test('01_070_012 - Đóng drawer khi đang nhập thì job vẫn chạy tiếp và vào Lịch sử', async ({
		page,
	}) => {
		const ma = maMoi();
		const file = await taoFileExcel([dongHopLe({ ma, ten: `AUTO TEST KHONG DUNG ${ma}` })]);

		const drawer = await moDrawerNhap(page);
		await drawer.locator('input[type="file"]').setInputFiles(file);
		await expect(drawer.locator('.ant-upload-text')).toContainText(path.basename(file));

		const choPost = page.waitForResponse(
			(r) => r.url().includes(API_IMPORT) && r.request().method() === 'POST',
			{ timeout: 180_000 },
		);
		await drawer.getByRole('button', { name: 'Xác nhận nhập' }).click();
		const body = await (await choPost).json().catch(() => null);
		expect(String(body?.status?.code), 'Gửi file nhập thất bại.').toBe('200');

		// Đóng drawer NGAY khi job còn đang chạy.
		await drawer.locator('.ant-drawer-close').first().click();
		await expect(drawer, 'Bấm X phải đóng drawer.').toBeHidden();

		// Job chạy nền ở import-service nên vẫn phải hoàn tất: điểm bán xuất hiện trong danh sách.
		await expect
			.poll(async () => demTheoMa(page, ma), {
				message: `Đóng drawer giữa chừng và điểm bán ${ma} không bao giờ được tạo.`,
				timeout: 180_000,
			})
			.toBe(1);
	});
});
