'use strict';

/**
 * Helper dùng chung cho phân hệ 02 — Quản lý nhân viên.
 *
 * 🔴 Mọi giá trị ở đây đều ĐO TỪ DOM THẬT (probe 20/09/2026), 🚫 không suy từ JSX:
 *   - Ô lọc là **4 `.ant-select` trong `.ant-pro-card` đầu tiên**, id sinh tự động (`_r_1i_`…)
 *     ⇒ 🚫 đừng bám id; thứ tự cố định theo mã nguồn: 0 chi nhánh · 1 vai trò · 2 trạng thái tài
 *     khoản · 3 trạng thái làm việc.
 *   - Drawer Thêm/Sửa dùng id **ổn định**: `#employeeCode` `#username` `#name` `#phone`
 *     `#nationalId` `#startDate` `#gender` `#birthday` `#address` `#positionId`, và mỗi dòng vai trò
 *     có `#roles_<n>_roleId` · `#roles_<n>_status`. Riêng ô **Đơn vị** là `OrganizationTreeSelect`
 *     với id động ⇒ bám `.ant-tree-select` theo thứ tự (0 = Chi nhánh trả lương, 1+ = dòng vai trò).
 *   - Tiêu đề drawer là **"Thêm nhân viên" / "Chỉnh sửa nhân viên"** — tài liệu gọi là *modal*,
 *     nhưng DOM là `.ant-drawer`.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

/** Nhãn tiếng Việt trong DOM hay ở dạng tổ hợp (NFD) — chuẩn hoá trước mọi phép so. */
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE_DANH_SACH = '/employee/list';
const API_DANH_SACH = '/chain-employment-profile/v1.2/list';

/** Request GET danh sách nhân viên — dùng cho mọi phép chờ "bảng đã nạp lại". */
const laApiDanhSach = (r) =>
	r.request().method() === 'GET' && r.url().includes(API_DANH_SACH);

/**
 * Mở màn danh sách nhân viên bằng một vai.
 *
 * 🔴 Dùng `moTrang`, 🚫 KHÔNG `page.goto` trần: `storageState` chỉ dùng được cho test đầu tiên của
 * vai (refresh token xoay vòng), `goto` trần sẽ bị đá về `/account` và mọi `waitForResponse` sau đó
 * treo hết timeout mà không hề báo "chưa đăng nhập".
 */
async function moDanhSach(page, vai) {
	// 🔴 Bỏ qua lần gọi 401 của PHIÊN CŨ. `storageState` chỉ dùng được cho context đầu tiên; với
	//    mọi test sau, lần nạp trang đầu gọi API bằng token hết hạn → 401 → app đá về `/account`
	//    rồi `moTrang` tự đăng nhập lại. Bắt đúng response đầu tiên là bắt trúng cái 401 đó và
	//    case đỏ với lý do sai hoàn toàn ("API không trả 200", trong khi sản phẩm không sao).
	const cho = page.waitForResponse((r) => laApiDanhSach(r) && r.status() !== 401, {
		timeout: 90_000,
	});
	await moTrang(page, ROUTE_DANH_SACH, vai);
	const res = await cho;
	expect(res.status(), 'API danh sách nhân viên không trả 200').toBe(200);
	await bang(page).waitFor({ state: 'visible', timeout: 30_000 });
	return res;
}

const bang = (page) => page.locator('.ant-table').first();
const dong = (page) => page.locator('.ant-table-tbody tr.ant-table-row');
const theColumn = (page) => page.locator('.ant-table-thead th');
const khoiLoc = (page) => page.locator('.ant-pro-card').first();
const oTimKiem = (page) =>
	khoiLoc(page).locator('input[placeholder="Tìm kiếm theo tên và số điện thoại"]');
/** 0 chi nhánh làm việc · 1 vai trò · 2 trạng thái tài khoản · 3 trạng thái làm việc. */
const oLoc = (page, i) => khoiLoc(page).locator('.ant-select').nth(i);
const tieuDeBang = (page) => page.locator('.ant-pro-table-list-toolbar-title').first();
const phanTrang = (page) => page.locator('.ant-pagination').first();

/**
 * Chạy `hanhDong` rồi chờ đúng response danh sách tiếp theo.
 *
 * 🔴 Đăng ký `waitForResponse` TRƯỚC hành động — đăng ký sau là đã lỡ response, test treo tới hết
 * timeout và người đọc log tưởng API chậm.
 */
async function taiLaiBoi(page, hanhDong, { timeout = 45_000 } = {}) {
	const cho = page.waitForResponse(laApiDanhSach, { timeout });
	await hanhDong();
	const res = await cho;
	await page.waitForTimeout(600); // antd vẽ lại bảng sau khi response về
	return res;
}

/** Tham số query của một response danh sách — dùng để kiểm bộ lọc đã đi vào request thật. */
const thamSo = (res) => Object.fromEntries(new URL(res.url()).searchParams.entries());

/**
 * Tổng số nhân viên hiện trên tiêu đề bảng (`Danh sách nhân viên (5,235 nhân viên)`).
 *
 * 🔴 Khi bộ lọc không ra kết quả, sản phẩm BỎ HẲN phần `(N nhân viên)` và cả thanh phân trang —
 * không hiện "(0 nhân viên)" như kịch bản mô tả. Vì vậy bảng rỗng được quy về 0 ở đây, và chỗ lệch
 * nhỏ đó ghi trong `test-cases.md`. 🚫 Không trả `null` — trả `null` làm case so sánh nào cũng đỏ
 * với lý do vô nghĩa.
 */
async function tongSo(page) {
	const text = chuan(await tieuDeBang(page).innerText());
	const m = text.match(/\(([\d.,]+)/);
	if (m) return Number(m[1].replace(/[.,]/g, ''));
	if ((await page.locator('.ant-empty').count()) > 0) return 0;
	return null;
}

/** Tìm kiếm — 🔴 chỉ chạy khi nhấn Enter (`onPressEnter`), gõ không thôi thì KHÔNG tìm. */
async function timKiem(page, tuKhoa) {
	await oTimKiem(page).fill(tuKhoa);
	return taiLaiBoi(page, () => oTimKiem(page).press('Enter'));
}

/** Mở một `.ant-select` rồi chọn option theo nhãn, trong đúng dropdown vừa mở. */
async function chonOption(page, select, nhan) {
	await select.click();
	const dd = page.locator('.ant-select-dropdown').last();
	await dd.waitFor({ state: 'visible', timeout: 15_000 });
	const muc = dd.locator('.ant-select-item-option-content', { hasText: nhan }).first();
	await muc.waitFor({ state: 'visible', timeout: 15_000 });
	await muc.click();
}

/** Danh sách nhãn option của một `.ant-select` (mở ra đọc rồi đóng lại). */
async function nhanCacOption(page, select) {
	await select.click();
	const dd = page.locator('.ant-select-dropdown').last();
	await dd.waitFor({ state: 'visible', timeout: 15_000 });
	const nhan = await dd.locator('.ant-select-item-option-content').allInnerTexts();
	await page.keyboard.press('Escape');
	return nhan.map(chuan);
}

/** Chọn một nút của cây đơn vị (`OrganizationTreeSelect`). */
async function chonDonVi(page, treeSelect, tenDonVi) {
	await treeSelect.click();
	const dd = page.locator('.ant-select-dropdown').last();
	await dd.waitFor({ state: 'visible', timeout: 15_000 });

	// 🔴 Cây đơn vị dài và CUỘN ẢO: nút chưa render thì locator không thấy, dù đơn vị có thật.
	//    Phải GÕ để lọc, 🚫 không cuộn tìm. Triệu chứng khi thiếu bước này là timeout 15s ở
	//    "waiting for .ant-select-tree-node-content-wrapper ... to be visible" — trông hệt như
	//    đơn vị không tồn tại, nên rất dễ đi sửa nhầm dữ liệu thay vì sửa locator.
	const o = treeSelect.locator('input').first();
	if (await o.count()) await o.fill(String(tenDonVi));

	const nut = dd
		.locator('.ant-select-tree-node-content-wrapper')
		.filter({ hasText: tenDonVi })
		.first();
	await nut.waitFor({ state: 'visible', timeout: 15_000 });
	await nut.click();
	await page.waitForTimeout(800);
}

/** Drawer đang mở (Thêm / Chỉnh sửa / Điều chuyển). */
const drawer = (page) => page.locator('.ant-drawer-open').last();

/** Mở drawer "Thêm nhân viên" từ màn danh sách. */
async function moDrawerThem(page) {
	await page.getByRole('button', { name: 'Thêm mới' }).click();
	const dr = drawer(page);
	await expect(dr.locator('.ant-drawer-title')).toHaveText('Thêm nhân viên', { timeout: 20_000 });
	// 🔴 Chờ THÂN form, không chỉ chờ drawer `open`: drawer hiện trước khi các ô được dựng, đọc sớm
	//    thì mọi locator đều rỗng (đúng bẫy đã trả giá ở phân hệ 01).
	await dr.locator('#employeeCode').waitFor({ state: 'visible', timeout: 20_000 });
	return dr;
}

/** Thêm một dòng vai trò trong drawer. */
async function themDongVaiTro(dr) {
	await dr.getByRole('button', { name: '+ Thêm vai trò và đơn vị quản lý' }).click();
	await dr.page().waitForTimeout(500);
}

/** Ô Đơn vị của dòng vai trò thứ `i` — `.ant-tree-select` nth(i+1) vì nth(0) là Chi nhánh trả lương. */
const oDonViVaiTro = (dr, i = 0) => dr.locator('.ant-tree-select').nth(i + 1);

/** Điền một dòng vai trò đầy đủ: đơn vị → vai trò → trạng thái. */
async function dienDongVaiTro(page, dr, { donVi, vaiTro, trangThai = 'Đang làm', dong: i = 0 }) {
	await chonDonVi(page, oDonViVaiTro(dr, i), donVi);
	await chonOption(page, dr.locator(`#roles_${i}_roleId`), vaiTro);
	await chonOption(page, dr.locator(`#roles_${i}_status`), trangThai);
}

/** Thông báo validate đang hiện trong drawer. */
async function loiValidate(dr) {
	return (await dr.locator('.ant-form-item-explain-error').allInnerTexts()).map(chuan);
}

/**
 * 🔴 Chặn ở tầng mạng mọi request GHI của phân hệ nhân viên.
 *
 * Dùng cho case validate: bấm *Lưu* là hành vi cần kiểm, nhưng 🚫 không được để request ghi chạm
 * dữ liệu thật. Assert `daGoi` rỗng — nếu sản phẩm vẫn gửi request khi form thiếu trường bắt buộc
 * thì đó chính là lỗi cần bắt.
 */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/chain-employment-profile/**', async (route) => {
		const method = route.request().method();
		if (method === 'GET') return route.continue();
		daGoi.push(`${method} ${route.request().url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

/** Bỏ qua case kèm LÝ DO — 🚫 không bao giờ để case thiếu dữ liệu nền tự pass. */
function boQua(test, lyDo) {
	test.skip(true, lyDo);
}

/** Tìm một nhân viên theo mã rồi mở chi tiết. Trả về `null` khi không có để case tự skip. */
async function moChiTiet(page, maNhanVien) {
	await timKiem(page, maNhanVien);
	const d = dong(page);
	if ((await d.count()) === 0) return null;
	const hang = d.filter({ hasText: maNhanVien }).first();
	if ((await hang.count()) === 0) return null;
	await hang.locator('td').nth(3).getByRole('link').click();
	await page.waitForURL(/\/employee\/detail\//, { timeout: 30_000 });
	await page.locator('.ant-tabs-tab').first().waitFor({ state: 'visible', timeout: 30_000 });
	return hang;
}

/**
 * Chuyển thẻ trên màn chi tiết.
 *
 * 🔴 `.click()` vào `.ant-tabs-tab` KHÔNG đổi thẻ — phải `dispatchEvent('click')` lên
 * `.ant-tabs-tab-btn` (bẫy antd đã trả giá ở phân hệ 04_1).
 */
async function moThe(page, nhan) {
	await page
		.locator('.ant-tabs-tab', { hasText: nhan })
		.locator('.ant-tabs-tab-btn')
		.dispatchEvent('click');
	await page.waitForTimeout(1_500);
	return page.locator('.ant-tabs-tabpane-active');
}

module.exports = {
	API_DANH_SACH,
	ROUTE_DANH_SACH,
	bang,
	boQua,
	chanGhi,
	chonDonVi,
	chonOption,
	chuan,
	dienDongVaiTro,
	dong,
	drawer,
	khoiLoc,
	laApiDanhSach,
	loiValidate,
	moChiTiet,
	moDanhSach,
	moDrawerThem,
	moThe,
	nhanCacOption,
	oDonViVaiTro,
	oLoc,
	oTimKiem,
	phanTrang,
	taiLaiBoi,
	thamSo,
	theColumn,
	themDongVaiTro,
	tieuDeBang,
	timKiem,
	tongSo,
};
