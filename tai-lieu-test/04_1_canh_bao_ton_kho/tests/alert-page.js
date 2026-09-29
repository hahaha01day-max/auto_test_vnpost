'use strict';

/**
 * Locator dùng chung cho phân hệ **04_1 — Cảnh báo tồn kho**.
 *
 * Trace từ code thật, KHÔNG đoán:
 *   route   → `src/utils/constants/config.jsx:165-167`
 *             STOCK_ALERTS `/inventory/stock-alerts`
 *             STOCK_ALERT_SETTINGS `/inventory/stock-alerts/settings`
 *             STOCK_AUTO_PROPOSE `/inventory/stock-alerts/auto-propose`
 *   API     → `src/features/stockAlert/services/stockAlertApi.js`
 *   màn     → `src/features/stockAlert/StockAlertDashboard.jsx`,
 *             `StockAlertConfigPage.jsx`, `AutoProposePage.jsx`
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const ROUTE = '/inventory/stock-alerts';
const ROUTE_SETTINGS = '/inventory/stock-alerts/settings';
const ROUTE_PROPOSE = '/inventory/stock-alerts/auto-propose';

const API_ALERTS = '/stock/alerts';
const API_SUMMARY = '/stock/alerts/summary';
const API_POLICIES = '/stock-warning-policies';
const API_EXPIRY = '/expiry-alert-policies';
const API_PREVIEW = '/stock-requests/auto-propose/preview';
const API_CONFIRM = '/stock-requests/auto-propose/confirm';

/** Endpoint GHI của phân hệ — dùng cho `blockWrites`. */
const WRITE_ENDPOINTS = [
	{ method: 'POST', match: API_POLICIES },
	{ method: 'PATCH', match: API_POLICIES },
	{ method: 'DELETE', match: API_POLICIES },
	{ method: 'POST', match: API_EXPIRY },
	{ method: 'PATCH', match: API_EXPIRY },
	{ method: 'DELETE', match: API_EXPIRY },
	{ method: 'POST', match: API_CONFIRM },
];

/**
 * 🔴 Đo thực tế 17/09/2026: màn có **9 nhóm cảnh báo**, không phải 6 như tài liệu HDSD 010 liệt kê.
 *    Ba nhóm tài liệu bỏ sót: *Sắp hết (7 ngày)*, *Sắp hết (30 ngày)*, *Dự báo hết hàng*.
 */
const NHOM_CANH_BAO = [
	'Hết hàng',
	'Dưới định mức Min',
	'Vượt định mức Max',
	'Sắp hết (7 ngày)',
	'Sắp hết (30 ngày)',
	'Tồn lâu ngày',
	'Dự báo hết hàng',
	'Sắp hết hạn',
	'Đã hết hạn',
];

/** Cột mặc định của ba nhóm theo định mức (đo từ bảng thật). */
const COT_MAC_DINH = [
	'Sản phẩm',
	'Đơn vị',
	'Nguồn cấu hình',
	'Tồn hiện tại',
	'Tồn khả dụng',
	'Ngưỡng Min',
	'Ngưỡng Max',
	'SL đã đề xuất',
	'SL đã đặt hàng',
];

const main = (page) => page.locator('.ant-pro-page-container, main').first();
// 🔴 Cùng lý do với `tieuDeCot`: bảng của tab cũ còn nguyên trong DOM nên phải bó vào panel đang hiện,
//    nếu không sẽ đếm nhầm số dòng của nhóm trước.
const rows = (page) => page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row');
const pageTitle = (page) =>
	page.locator('.ant-pro-page-container-title, .ant-page-header-heading-title').first();

/** Mở màn Cảnh báo tồn kho bằng đúng vai. */
async function openAlerts(page, roleKey) {
	await moTrang(page, ROUTE, roleKey);
	await expect(pageTitle(page), 'Không mở được màn Cảnh báo tồn kho.').toContainText(
		'Cảnh báo tồn kho',
	);
	await settle(page);
}

/** Chờ mọi spinner tắt — `waitForResponse` xong ≠ bảng đã vẽ lại. */
async function settle(page) {
	await expect
		.poll(async () => (await page.locator('.ant-spin-spinning').count()) === 0, {
			message: 'Màn còn đang tải.',
			timeout: 30_000,
		})
		.toBe(true);
}

/** Thẻ nhóm cảnh báo trên dải chọn. */
/**
 * Thẻ nhóm cảnh báo trên dải chọn.
 * 🔴 Bám `.ant-tabs-tab` (phần tử CHA) chứ không `getByRole('tab')`: `role="tab"` nằm trên
 *    `.ant-tabs-tab-btn` bên trong, click vào đó không kích hoạt handler đổi tab của antd —
 *    click "thành công" mà tab vẫn nguyên, rồi case đỏ với lý do sai là "cột không đổi theo nhóm".
 */
const theNhom = (page, ten) =>
	page
		.locator('.ant-tabs-tab')
		// 🔴 Tên nhóm có dấu ngoặc ("Sắp hết (7 ngày)") — không escape thì `(7 ngày)` thành nhóm bắt
		//    trong regex, locator khớp 0 phần tử và case báo "thiếu nhóm cảnh báo" dù nó vẫn ở đó.
		.filter({ hasText: new RegExp(`^${ten.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
		.first();

/** Chọn một nhóm cảnh báo và chờ bảng nạp lại. */
async function chonNhom(page, ten) {
	const cho = page
		.waitForResponse((r) => r.url().includes(API_ALERTS) && r.request().method() === 'GET', {
			timeout: 60_000,
		})
		.catch(() => null);
	// 🔴 `.click()` thường KHÔNG đổi được nhóm. Dải 9 tab tràn bề ngang màn, antd phủ lớp cuộn lên
	//    nên cú bấm chỉ tới hộp giới hạn của tab chứ không tới handler: Playwright báo click thành
	//    công, tab vẫn nguyên, và case đỏ với lý do sai là "cột không đổi theo nhóm".
	//    `dispatchEvent('click')` bắn thẳng sự kiện vào `.ant-tabs-tab-btn` thì ăn — đo 17/09/2026.
	const tab = theNhom(page, ten);
	await tab.scrollIntoViewIfNeeded().catch(() => {});
	await tab.locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await cho;

	// 🔴 Bấm xong ≠ đã đổi nhóm. Phải chờ tab thật sự ở trạng thái active rồi mới đọc bảng, nếu
	//    không ta đọc đúng cột của nhóm TRƯỚC và kết luận sai rằng "cột không đổi theo nhóm".
	// 🔴 antd v6 đánh dấu tab đang chọn bằng class `.ant-tabs-tab-active` trên phần tử BỌC NGOÀI,
	//    không phải `aria-selected` trên chính `[role=tab]`.
	await expect(
		theNhom(page, ten),
		`Bấm nhóm "${ten}" nhưng tab không chuyển sang trạng thái đang chọn.`,
	).toHaveClass(/ant-tabs-tab-active/);
	await settle(page);
}

/**
 * Chọn điểm bán đầu tiên có thật qua ô **Điểm bán / Kho**.
 *
 * 🔴 Ô này KHÔNG phải Select thường: với vai từ Bưu điện xã trở lên nó mở một **drawer ba cột**
 *    (Tỉnh/TCT → Xã/Phường → Điểm bán/Kho) có nút *Xác nhận* — `SelectShopMultiple.jsx`.
 *    Bấm rồi tìm `.ant-select-item-option` là ra 0 lựa chọn và test đỏ với lý do sai.
 * 🔴 Mỗi cột có ô *Tìm kiếm* RIÊNG: ô đầu tìm trong cột Tỉnh, không phải tìm điểm bán toàn hệ thống.
 *    Phải chọn lần lượt từ trái sang phải; cột sau chỉ nạp sau khi cột trước có lựa chọn.
 *
 * @returns {boolean} false khi môi trường không có điểm bán nào để chọn.
 */
async function chonDiemBanDauTien(page) {
	await main(page).locator('.ant-select').first().click();

	const drawer = page.locator('.ant-drawer-open').first();
	await expect(drawer, 'Không mở được drawer Chọn Điểm bán / Kho.').toBeVisible();
	await expect(drawer.locator('.ant-drawer-title')).toContainText(/Chọn Điểm bán/i);

	// 🔴 Class BEM riêng của component, ổn định hơn cấu trúc div: `sp-column` là một cột,
	//    `sp-column__title` là tiêu đề cột, `sp-item__label` là một mục chọn được.
	//    (Đo 17/09/2026. 🚫 Đừng bám `.ant-tree-treenode` — component KHÔNG dùng antd Tree.)
	// 🔴 Ba cột `.sp-column` theo thứ tự cố định: 0 Tỉnh/TCT · 1 Xã/Phường · 2 Điểm bán/Kho.
	//    🚫 Đừng lọc cột bằng `filter({ has: ... })` — locator `has` giải theo gốc khác nên không
	//    khớp cột nào, và hàm lặng lẽ trả về "không có điểm bán" dù danh sách đầy.
	const col = (i) => drawer.locator('.sp-column').nth(i);

	// 🔴 Cột sau chỉ nạp SAU khi cột trước được chọn, qua mạng nên mất một nhịp.
	//    🚫 `poll(...).toBeGreaterThanOrEqual(0)` là poll VÔ NGHĨA — đúng ngay nhịp đầu, không chờ
	//    gì cả, rồi `count()` vẫn 0 và hàm bỏ qua cột bắt buộc. Phải poll `> 0` thật sự.
	const choCotCoMuc = async (ds, toiThieu = 1) =>
		expect
			.poll(() => ds.count(), { timeout: 20_000 })
			.toBeGreaterThanOrEqual(toiThieu)
			.then(() => true)
			.catch(() => false);

	// Cột 1: Tỉnh / Tổng công ty. Bỏ qua mục "Tổng công ty" vì nó không dẫn tới điểm bán cụ thể.
	// 🔴 Danh sách tỉnh nạp qua mạng SAU khi drawer hiện. Đọc ngay lúc drawer vừa visible chỉ thấy
	//    đúng 1 mục ("Tổng công ty") và hàm kết luận nhầm là môi trường không có điểm bán nào.
	const dsTinh = col(0).locator('.sp-item');
	if (!(await choCotCoMuc(dsTinh, 2))) return false;
	await dsTinh.nth(1).click();

	// Cột 2: Xã / Phường.
	const dsXa = col(1).locator('.sp-item');
	if (await choCotCoMuc(dsXa)) await dsXa.first().click();

	// 🔴 Cột 3 KHÁC hai cột đầu: điểm bán là **radio** (`.ant-radio-wrapper`) — trace từ
	//    `resource/hdsd/hdsd04_1_canh_bao_ton_kho/video_spec_canh_bao_ton_kho.js` bước 2.5,
	//    kịch bản đã chạy thật khi dựng tài liệu HDSD. Ba mục đầu (`Pos mini`, `Pos plus`, `Kho`)
	//    là bộ lọc phân loại, không phải điểm bán.
	const dsShop = col(2).locator('.ant-radio-wrapper');
	if (!(await choCotCoMuc(dsShop))) {
		await drawer.getByRole('button', { name: 'Đóng' }).click();
		return false;
	}
	await dsShop.first().click();

	const cho = page
		.waitForResponse((r) => r.url().includes(API_ALERTS), { timeout: 60_000 })
		.catch(() => null);
	await drawer.getByRole('button', { name: 'Xác nhận' }).click();
	await expect(drawer, 'Bấm Xác nhận phải đóng drawer chọn điểm bán.').toBeHidden();
	await cho;
	await settle(page);
	return true;
}

/** Chặn mọi request GHI của phân hệ ở tầng mạng; trả về danh sách request đã bị chặn. */
async function blockWrites(page) {
	const attempted = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		const hit = WRITE_ENDPOINTS.some(
			(w) => req.method() === w.method && req.url().includes(w.match),
		);
		if (!hit) return route.continue();
		attempted.push(`${req.method()} ${req.url().split('?')[0]}`);
		return route.abort();
	});
	return { attempted };
}

/** Bỏ qua case khi môi trường thiếu dữ liệu — LUÔN kèm lý do. */
function skipNoData(test, reason) {
	test.info().annotations.push({ type: 'thiếu dữ liệu', description: reason });
	test.skip(true, reason);
}

/**
 * Tiêu đề các cột của bảng đang hiển thị.
 *
 * 🔴 antd Tabs GIỮ NGUYÊN bảng của tab cũ trong DOM (panel chỉ bị ẩn, không bị gỡ). `page.locator('th')`
 *    vì thế gom cả cột của nhóm trước: ở nhóm *Sắp hết hạn* vẫn đọc ra "Nguồn cấu hình" của nhóm
 *    *Dưới định mức Min*, và case đỏ oan vì tưởng sản phẩm không ẩn cột đúng quy định.
 *    Phải giới hạn trong `.ant-tabs-tabpane-active`.
 */
const tieuDeCot = async (page) =>
	(await page.locator('.ant-tabs-tabpane-active th').allInnerTexts())
		.map((x) => x.trim().normalize('NFC'))
		.filter(Boolean);

module.exports = {
	ROUTE,
	ROUTE_SETTINGS,
	ROUTE_PROPOSE,
	API_ALERTS,
	API_SUMMARY,
	API_POLICIES,
	API_EXPIRY,
	API_PREVIEW,
	API_CONFIRM,
	WRITE_ENDPOINTS,
	NHOM_CANH_BAO,
	COT_MAC_DINH,
	main,
	rows,
	pageTitle,
	openAlerts,
	settle,
	theNhom,
	chonNhom,
	chonDiemBanDauTien,
	blockWrites,
	skipNoData,
	tieuDeCot,
};
