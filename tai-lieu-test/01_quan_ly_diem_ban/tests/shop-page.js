'use strict';

/**
 * Locator dùng chung cho màn **Danh sách điểm bán** (`/chain/shop-management`).
 *
 * Mọi hằng ở đây trace từ code thật `vnpost-web`, KHÔNG đoán:
 *   route      → src/utils/constants/config.jsx:370  `CHAIN_SHOP_MANAGEMENT`
 *   API        → src/features/shop/services/shopApi.js:167  `GET /shops/profile/chain`
 *   locator    → src/features/chain/pages/shopManagement/ShopManagement.jsx
 *
 * 🔴 Placeholder tiếng Việt do FE render ở dạng **NFD** (tổ hợp dấu rời). So khớp bằng chuỗi có
 * dấu gõ tay (NFC) sẽ KHÔNG khớp và test rớt với lý do vô nghĩa "không thấy ô tìm kiếm".
 * Vì vậy mọi selector ở đây chỉ dùng **đoạn không dấu** của placeholder.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

/** Route thật — không dò nhiều URL như các spec đời trước. */
const ROUTE = '/chain/shop-management';

/** API danh sách. Chờ đúng response này thay vì `waitForTimeout`. */
const API_LIST = '/shops/profile/chain';

/**
 * Các endpoint GHI của phân hệ (trace từ `src/features/shop/services/shopApi.js`).
 *
 * 🔴 Vì sao cần danh sách này: `VNPOST_BASE_URL` đang là FE dev server, nhưng `rsbuild.config.js`
 * proxy `/__api` sang `PUBLIC_BASE_URL` — hiện trỏ **API production**. Case "validate bỏ trống"
 * vẫn BẤM Xác nhận: nếu sản phẩm không chặn như kỳ vọng thì request ghi đi thẳng lên production.
 * Vì vậy mọi case validate phải chặn ghi ở tầng mạng, xem `blockWrites`.
 */
const WRITE_ENDPOINTS = [
	{ method: 'POST', match: '/shops/profile' },
	{ method: 'PUT', match: '/shops/profile' },
	{ method: 'DELETE', match: '/shops' },
	{ method: 'POST', match: '/import/api/v1/shops/excel' },
	// Task 050/060 — gắn / gỡ nhân viên (trace từ `features/chain/services/employeeChainApi.js`).
	{ method: 'POST', match: '/chain-employment-profile/v1.2/batch-assign-roles' },
	{ method: 'DELETE', match: '/chain-employment-profile/v1.2/assignment' },
];

/** Nhãn cột đúng thứ tự trong `columns` của ShopManagement.jsx. */
const COLUMNS = [
	'STT',
	'Tên điểm bán / hub',
	'Mã điểm',
	'Phân loại',
	'Bưu điện Xã',
	'Bưu điện Tỉnh',
	'SĐT người quản lý',
	'Trạng thái',
	'Số lượng nhân viên',
	'Hành động',
];

/** Ô tìm kiếm — placeholder đầy đủ là "Tìm theo tên, mã điểm bán". */
const searchBox = (page) => page.locator('input[placeholder*="theo t"]').first();

/**
 * Hàng lọc — `<div className="flex flex-wrap gap-3">` trong ProCard (ShopManagement.jsx).
 *
 * 🔴 KHÔNG bắt bộ lọc bằng `input[placeholder*="..."]`: antd v6 render placeholder của Select vào
 * một `<div>` chứ KHÔNG đặt lên `<input>`, nên `input[placeholder]` luôn rỗng và locator treo
 * tới hết timeout. Đo thực tế: 4 select trong hàng lọc đều có `input` với placeholder = "".
 * Thứ tự 4 select dưới đây đúng theo thứ tự khai trong ShopManagement.jsx.
 */
const filterRow = (page) => page.locator('div.flex.flex-wrap.gap-3').first();
const filterType = (page) => filterRow(page).locator('.ant-select').nth(0);
const filterStatus = (page) => filterRow(page).locator('.ant-select').nth(1);
const filterProvince = (page) => filterRow(page).locator('.ant-select').nth(2);
const filterWard = (page) => filterRow(page).locator('.ant-select').nth(3);

const rows = (page) => page.locator('.ant-table-tbody tr.ant-table-row');
const pageTitle = (page) => page.locator('.ant-page-header-heading-title, .ant-pro-page-container-title').first();

/**
 * Mở màn danh sách và CHỜ ĐÚNG response API.
 *
 * 🔴 PHẢI mở bằng `moTrang(page, url, vai)`, KHÔNG dùng `page.goto` trần.
 * `storageState` của app này không khôi phục được phiên: access token nằm trong RAM, chỉ có
 * `refreshToken` ở cookie và hệ thống xoay vòng nó — nên file `.auth/<vai>.json` chỉ dùng được
 * cho TEST ĐẦU TIÊN của vai đó. `page.goto` trần thì app đá về `/account`, và triệu chứng là
 * `waitForResponse` treo tới hết timeout chứ không báo "chưa đăng nhập" — rất tốn công lần.
 * Cảnh báo này đã ghi sẵn ở `shared/auth/roles.setup.js`.
 *
 * 🔴 Không dùng `networkidle`: màn này còn gọi API danh mục tỉnh/xã nền, `networkidle` lúc nhanh
 * lúc chậm và sinh test chập chờn.
 */
async function openShopList(page, roleKey) {
	const waitList = page.waitForResponse(
		(res) => res.url().includes(API_LIST) && res.request().method() === 'GET',
		{ timeout: 60_000 },
	);
	await moTrang(page, ROUTE, roleKey);
	const res = await waitList;

	await expect(pageTitle(page), 'Không mở được màn Danh sách điểm bán.').toContainText('Danh sách điểm bán');
	await settleTable(page);
	return res;
}

/** Chờ một lần gọi lại API danh sách do thao tác `action` gây ra, rồi trả về body đã parse. */
async function reloadBy(page, action) {
	const waitList = page.waitForResponse(
		(res) => res.url().includes(API_LIST) && res.request().method() === 'GET',
		{ timeout: 30_000 },
	);
	await action();
	const res = await waitList;
	const body = await res.json().catch(() => null);
	await settleTable(page);
	return { res, body };
}

/** Tổng số bản ghi lấy từ tiêu đề: "Danh sách điểm bán (Tổng số: 1.234)". */
async function totalFromTitle(page) {
	const text = await pageTitle(page).innerText();
	const match = text.match(/Tổng số:\s*([\d.,]+)/);
	return match ? Number(match[1].replace(/[.,]/g, '')) : null;
}

/**
 * Mở drawer Chi tiết của dòng đầu tiên và chờ nội dung thật sự render.
 * 🔴 `.ant-drawer-content` xuất hiện trong DOM TRƯỚC khi có nội dung — assert ngay là rỗng.
 * Phải chờ text khác rỗng, nếu không case đỏ vì lý do sai (tưởng không mở được drawer).
 */
async function openDetailDrawer(page, rowIndex = 0) {
	await rows(page).nth(rowIndex).locator('td').last().locator('button').first().click();

	// 🔴 Đo thực tế trên antd v6: drawer chỉ có class `ant-drawer ant-drawer-right ant-drawer-open`,
	//    KHÔNG có `.ant-drawer-content` lồng trong như các bản antd cũ. Bám nhầm là "element not found".
	const drawer = page.locator('.ant-drawer-open').first();
	await expect(drawer, 'Không mở được drawer Chi tiết.').toBeVisible();
	await expect
		.poll(async () => (await drawer.innerText().catch(() => '')).trim().length, {
			message: 'Drawer Chi tiết mở ra nhưng không có nội dung.',
			timeout: 20_000,
		})
		.toBeGreaterThan(0);

	return drawer;
}

/**
 * Mở một Select và trả về ĐÚNG dropdown của nó.
 *
 * 🔴 KHÔNG dùng `.ant-select-dropdown:visible`: antd giữ dropdown đã mở trước đó trong DOM, nên
 * khi màn có nhiều Select thì selector này bắt trúng dropdown của Select KHÁC. Đo thực tế:
 * mở bộ lọc Bưu điện xã lại đọc ra danh sách TỈNH, và case "xã lọc theo tỉnh" đỏ oan.
 * antd nối Select với dropdown của nó qua `aria-controls` trên input — bám vào id đó mới chắc.
 */
async function openDropdown(page, select) {
	await select.click();

	// 🔴 `aria-controls` trỏ vào phần tử LISTBOX bên trong, phần tử đó luôn `hidden` với Playwright.
	//    Thứ hiển thị là `.ant-select-dropdown` bọc ngoài nó — phải đi ngược lên tổ tiên.
	const id = await select.locator('input').first().getAttribute('aria-controls');
	const dropdown = id
		? page.locator('.ant-select-dropdown').filter({ has: page.locator(`#${id}`) }).first()
		: page.locator('.ant-select-dropdown:visible').first();

	await expect(dropdown, 'Không mở được danh sách lựa chọn.').toBeVisible();
	return dropdown;
}

/**
 * Locate một ant Select theo TÊN FIELD của Form.Item, không theo placeholder.
 * 🔴 Placeholder biến mất ngay khi Select có giá trị, nên `filter({ hasText: 'Chọn bưu điện tỉnh' })`
 *    chỉ đúng ở lần mở đầu tiên; mở lại lần hai thì locator rỗng và `openDropdown` treo hết
 *    timeout mà không nói được lý do — đúng triệu chứng của case 01_020_011.
 */
function selectByField(scope, name) {
	return scope.locator(`.ant-select:has(input[id$="${name}"])`).first();
}

/**
 * Giá trị ĐANG hiển thị của một ant Select (rỗng ⇒ locator count 0).
 *
 * 🔴 antd v6 KHÔNG render giá trị đã chọn vào `.ant-select-selection-item` như các bản trước —
 * nó nằm ở `.ant-select-content.ant-select-content-has-value` (kèm attribute `title`). Bám nhầm
 * `.ant-select-selection-item` thì locator luôn rỗng, nên `toHaveCount(0)` kiểu "ô lọc đã sạch"
 * XANH GIẢ: đúng cả khi ô vẫn còn nguyên giá trị. Luôn dùng hàm này để đọc/khẳng định.
 */
const selectValue = (select) => select.locator('.ant-select-content-has-value');

/** Chọn một giá trị trong ant Select đã locate sẵn. */
async function pickOption(page, select, label) {
	const dropdown = await openDropdown(page, select);
	const option = dropdown.locator('.ant-select-item-option').filter({ hasText: label }).first();
	await expect(option, `Không thấy lựa chọn "${label}" trong danh sách.`).toBeVisible();
	await option.click();
}

/**
 * Chờ bảng vẽ xong sau khi đổi bộ lọc.
 *
 * 🔴 `waitForResponse` chỉ chắc API đã TRẢ VỀ, không chắc bảng đã VẼ LẠI. Đếm dòng ngay sau đó
 * là đếm trúng dữ liệu cũ: case lọc "Pos mini" thấy còn dòng nên không skip, rồi giữa chừng bảng
 * vẽ lại thành rỗng và assert đỏ với lý do "element not found" — sai hoàn toàn bản chất.
 */
async function settleTable(page) {
	await expect
		.poll(async () => (await page.locator('.ant-spin-spinning').count()) === 0, {
			message: 'Bảng còn đang tải.',
			timeout: 20_000,
		})
		.toBe(true);

	// Chờ số dòng đứng yên hai nhịp liên tiếp.
	let previous = -1;
	for (let i = 0; i < 10; i += 1) {
		const current = await rows(page).count();
		if (current === previous) return current;
		previous = current;
		await page.waitForTimeout(400);
	}
	return previous;
}

/**
 * Chặn mọi request GHI của phân hệ và ghi nhận đã có ai định ghi chưa.
 *
 * 🔴 Dùng cho case validate: bấm Xác nhận là hành vi cần kiểm, nhưng KHÔNG được để request ghi
 * chạm server thật. Chặn xong còn assert `attempted` rỗng — nếu sản phẩm gửi request dù form
 * thiếu trường bắt buộc thì đó chính là lỗi cần bắt, và test đỏ đúng lý do.
 *
 * @returns {{attempted: string[]}} danh sách request ghi đã bị chặn
 */
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

/** Mở drawer Thêm điểm bán. */
async function openCreateDrawer(page) {
	await page.getByRole('button', { name: 'Thêm điểm bán' }).first().click();
	const drawer = page.locator('.ant-drawer-open').first();
	await expect(drawer, 'Không mở được drawer Thêm điểm bán.').toBeVisible();
	await expect(drawer.locator('.ant-drawer-title')).toContainText(/Thêm điểm bán/i);
	return drawer;
}

/**
 * Mở drawer Sửa của một dòng.
 * 🔴 Nút Sửa là nút thứ HAI ở cột Hành động với vai đủ quyền (tct thấy 4 nút, province chỉ 3 và
 * KHÔNG có nút Gắn nhân viên) — đừng bám theo chỉ số cố định cho mọi vai.
 * 🔴 Drawer mở xong ≠ form đã vẽ. `DrawerCreateShop.jsx:720` bọc TOÀN BỘ thân form trong
 *    `{!!orgLevel && ...}`; `orgLevel` chỉ có sau khi record về, nên đọc nhãn ngay lúc drawer
 *    visible là đọc trúng lúc form còn rỗng — đúng triệu chứng "probe thấy có, test không thấy"
 *    của case 01_030_006.
 */
async function openEditDrawer(page, rowIndex = 0) {
	await rows(page).nth(rowIndex).locator('td').last().locator('button').nth(1).click();
	const drawer = page.locator('.ant-drawer-open').first();
	await expect(drawer, 'Không mở được drawer Sửa điểm bán.').toBeVisible();
	await expect(drawer.locator('.ant-drawer-title')).toContainText(/Sửa điểm bán/i);
	await waitFormBody(drawer);
	return drawer;
}

/**
 * Mở drawer **Gắn nhân viên** của một dòng.
 * 🔴 Cột Hành động có 4 nút, đúng thứ tự khai trong `ShopManagement.jsx`:
 *    0 Chi tiết · 1 Sửa · 2 Thiết lập điểm bán · 3 Gắn nhân viên.
 *    Đo thực tế: bấm nhầm nút 2 thì ra drawer "Thiết lập điểm bán" (có nút Tải file mẫu), rất dễ
 *    tưởng là đúng màn. Với vai `province` nút Gắn nhân viên bị ẩn hẳn (chỉ 3 nút) — đừng dùng
 *    chỉ số này cho vai khác tct mà không đo lại.
 * 🔴 Hub không gắn được nhân viên (nút mờ) ⇒ gọi hàm này trên dòng Hub là treo.
 */
async function openAssignDrawer(page, rowIndex = 0) {
	await rows(page).nth(rowIndex).locator('td').last().locator('button').nth(3).click();
	const drawer = page.locator('.ant-drawer-open').first();
	await expect(drawer, 'Không mở được drawer Gắn nhân viên.').toBeVisible();
	await expect(drawer.locator('.ant-drawer-title')).toContainText(/Gắn nhân viên/i);
	return drawer;
}

/** Chỉ số dòng đầu tiên KHÔNG phải Hub (cột Phân loại), hoặc null nếu bảng toàn Hub. */
async function firstNonHubRow(page) {
	const n = await rows(page).count();
	for (let i = 0; i < n; i++) {
		const loai = (await rows(page).nth(i).locator('td').nth(3).innerText()).trim();
		if (!/hub/i.test(loai)) return i;
	}
	return null;
}

/**
 * Chỉ số dòng đầu tiên KHÔNG phải Hub và CÓ ít nhất một nhân viên (cột "Số lượng nhân viên").
 * null nếu trang hiện tại không có dòng nào như vậy.
 *
 * 🔴 Vì sao cần: `firstNonHubRow` hay rơi đúng vào điểm bán 0 nhân viên, nên mọi case về danh
 * sách phân công (phân trang, nút ✕ của dòng đã lưu, cho thôi việc) đều skip và cả nhóm trông
 * như "môi trường thiếu dữ liệu" trong khi dữ liệu có sẵn ở dòng khác.
 */
async function firstRowWithEmployee(page, { timeout = 15_000 } = {}) {
	// 🔴 Cột "Số lượng nhân viên" do một API riêng đổ vào, tới SAU khi bảng đã vẽ và
	//    `settleTable` đã trả về. Quét một lần là quét lúc mọi dòng còn đếm 0 ⇒ trả null và cả
	//    nhóm case về phân công skip với lý do sai "không điểm bán nào có nhân viên".
	const hetHan = Date.now() + timeout;
	do {
		const n = await rows(page).count();
		for (let i = 0; i < n; i++) {
			const o = rows(page).nth(i).locator('td');
			const loai = (await o.nth(3).innerText()).trim();
			if (/hub/i.test(loai)) continue;
			const so = Number(((await o.nth(8).innerText()).trim().match(/\d+/) || [0])[0]);
			if (so > 0) return i;
		}
		await page.waitForTimeout(1000);
	} while (Date.now() < hetHan);
	return null;
}

/** Chờ thân form của drawer Thêm/Sửa vẽ xong (xem chú thích ở `openEditDrawer`). */
async function waitFormBody(drawer) {
	await expect(
		drawer.locator('input[placeholder*="Nhập mã"]').first(),
		'Thân form chưa vẽ (orgLevel chưa có) — đọc nhãn lúc này sẽ ra rỗng.',
	).toBeVisible();
}

/**
 * Bỏ qua case khi môi trường không có dữ liệu cần thiết.
 * 🔴 Ghi rõ LÝ DO vào annotation. Skip không lý do nhìn y hệt case vô hại, che mất việc
 * môi trường thiếu dữ liệu — và cả bộ test trông vẫn xanh.
 */
function skipNoData(test, reason) {
	test.info().annotations.push({ type: 'thiếu dữ liệu', description: reason });
	test.skip(true, reason);
}

module.exports = {
	ROUTE,
	API_LIST,
	COLUMNS,
	searchBox,
	filterRow,
	filterType,
	filterStatus,
	filterProvince,
	filterWard,
	openCreateDrawer,
	openDetailDrawer,
	openDropdown,
	openEditDrawer,
	blockWrites,
	WRITE_ENDPOINTS,
	settleTable,
	rows,
	pageTitle,
	openShopList,
	reloadBy,
	totalFromTitle,
	pickOption,
	selectByField,
	selectValue,
	waitFormBody,
	openAssignDrawer,
	firstNonHubRow,
	firstRowWithEmployee,
	skipNoData,
};
