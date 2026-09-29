'use strict';

/**
 * Helper phân hệ 04_3 — Nhập / xuất / chuyển kho.
 *
 * 🔴 **Phân hệ GHI nặng nhất hệ thống**: 70/97 case ghi vào tồn kho, giá vốn và công nợ thật. Mọi
 * thứ trong file này chỉ phục vụ **đọc**; mọi spec đều bọc `chanGhi()` để một cú bấm nhầm không
 * lọt xuống server. 🚫 Không có helper nào ở đây được phép tạo/duyệt/huỷ phiếu.
 *
 * Đo từ DOM 20/09/2026:
 *
 * | Màn | Route | API danh sách |
 * |---|---|---|
 * | Lịch sử xuất nhập kho | `/inventory/import` | `GET /stock/v2/import-export/find` |
 * | Chuyển kho | `/inventory/transfer-warehouse` | `GET /stock/v2/transfer/find` |
 *
 * Màn lịch sử có **4 thẻ**: Phiếu nhập kho · Phiếu xuất kho · Thẻ kho · Xuất huỷ hàng; ba ô lọc
 * *Nguồn nhập/ xuất* · *Phân loại phiếu nhập* · *Phân loại sản phẩm*, ô *Tìm kiếm theo mã* và một
 * cặp ngày.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE_LICH_SU = '/inventory/import';
const ROUTE_CHUYEN_KHO = '/inventory/transfer-warehouse';

const API_LICH_SU = '/stock/v2/import-export/find';
const API_CHUYEN_KHO = '/stock/v2/transfer';

/** Ba trạng thái phiếu chuyển kho (`TRANSFER_STATUS`). */
const TRANG_THAI_CHUYEN = ['Chờ xác nhận', 'Đang đi đường', 'Đã nhận'];

/** 8 nhãn `IMPORT_TYPE` đang bật. */
const PHAN_LOAI_NHAP = [
	'Nhập kho thường',
	'Nhập lại từ đơn hàng hủy',
	'Nhập kho sản phẩm sản xuất',
	'Nhập chuyển kho',
	'Kiểm kho',
	'Nhập kho trả hàng',
	'Tồn đầu kỳ',
	'Hoàn chuyển kho',
];

/** 6 nhãn `EXPORT_TYPE` đang bật — 🔴 "Điều chỉnh phiếu nhập" là bút toán đảo, 🚫 không phải xuất thường. */
const PHAN_LOAI_XUAT = [
	'Xuất kho thường',
	'Xuất bán hàng',
	'Xuất trả hàng',
	'Xuất chuyển kho',
	'Xuất kho nguyên liệu sản xuất',
	'Điều chỉnh phiếu nhập',
];

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const cot = (page) => khung(page).locator('.ant-table-thead th');
const oTim = (page) => khung(page).locator('input[placeholder^="Tìm kiếm"]').first();

async function moMan(page, route, vai, apiPhan) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(apiPhan) && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, route, vai);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return res;
}

const moLichSu = (page, vai) => moMan(page, ROUTE_LICH_SU, vai, API_LICH_SU);
const moChuyenKho = (page, vai) => moMan(page, ROUTE_CHUYEN_KHO, vai, API_CHUYEN_KHO);

/** Chạy `hanhDong` rồi chờ đúng response danh sách kế tiếp. 🔴 Đăng ký chờ TRƯỚC hành động. */
async function taiLaiBoi(page, apiPhan, hanhDong, { timeout = 60_000 } = {}) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(apiPhan) && r.status() !== 401,
		{ timeout },
	);
	await hanhDong();
	const res = await cho;
	await page.waitForTimeout(1_000);
	return res;
}

const thamSo = (res) => Object.fromEntries(new URL(res.url()).searchParams.entries());

/** Đổi thẻ — 🔴 `.click()` trần KHÔNG đổi tab ở antd v6. */
async function moThe(page, nhan) {
	await khung(page)
		.locator('.ant-tabs-tab', { hasText: nhan })
		.first()
		.locator('.ant-tabs-tab-btn')
		.dispatchEvent('click');
	await page.waitForTimeout(2_000);
}

/** Mở một `.ant-select` theo chữ đang hiện, đọc danh sách nhãn rồi đóng lại. */
async function nhanCacOption(page, chuTrongO) {
	const o = khung(page).locator('.ant-select').filter({ hasText: chuTrongO }).first();
	await o.click();
	const dd = page.locator('.ant-select-dropdown').last();
	await dd.waitFor({ state: 'visible', timeout: 15_000 });
	const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
	await page.keyboard.press('Escape');
	await page.waitForTimeout(400);
	return nhan;
}

/** Chọn một option của `.ant-select` theo chữ đang hiện trong ô. */
async function chonOption(page, chuTrongO, nhan) {
	const o = khung(page).locator('.ant-select').filter({ hasText: chuTrongO }).first();
	await o.click();
	const dd = page.locator('.ant-select-dropdown').last();
	await dd.waitFor({ state: 'visible', timeout: 15_000 });
	await dd.locator('.ant-select-item-option-content', { hasText: nhan }).first().click();
	await page.waitForTimeout(500);
}

/**
 * 🔴 Chặn ở tầng mạng MỌI request ghi của phân hệ kho.
 *
 * Phạm vi rộng có chủ ý: nhập kho, xuất kho, chuyển kho, huỷ phiếu, gộp lô — tất cả đều ghi vào
 * tồn kho và giá vốn, và 🚫 không thao tác nào hoàn tác được bằng giao diện.
 */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		const url = req.url();
		const cham = /\/(stock|shops)\b|\/stock-requests|\/opening-balance/.test(url);
		if (!cham) return route.continue();
		daGoi.push(`${req.method()} ${url}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

/**
 * Chọn một điểm bán / kho qua **drawer ba cột** "Chọn Điểm bán / Kho".
 *
 * 🔴 Bẫy đã trả giá 20/09/2026: ô này TRÔNG như `.ant-select` nhưng bấm vào 🚫 KHÔNG mở
 * `.ant-select-dropdown` — nó mở một **drawer** với ba cột Tỉnh → Xã → Điểm bán (cùng component
 * với phân hệ 04_1). Chờ dropdown ở đây là timeout 15s rồi đổ oan cho vai thiếu quyền.
 *
 * Cột 0 Tỉnh/TCT · cột 1 Xã/Phường · cột 2 Điểm bán (là **radio**, và ba mục đầu là bộ lọc phân
 * loại chứ không phải điểm bán). Cột sau chỉ nạp SAU khi cột trước được chọn.
 *
 * @returns {string|null} tên đơn vị đã chọn, hoặc `null` khi không có gì để chọn.
 */
async function chonDiemBanQuaDrawer(page, chuTrongO = 'điểm bán') {
	const o = khung(page).locator('.ant-select').filter({ hasText: chuTrongO }).first();
	if ((await o.count()) === 0) return null;
	await o.click({ force: true });

	const dr = page.locator('.ant-drawer-open').last();
	await dr.waitFor({ state: 'visible', timeout: 20_000 });
	await expect(dr.locator('.ant-drawer-title')).toContainText(/Chọn Điểm bán/i, { timeout: 15_000 });

	const cot3 = (i) => dr.locator('.sp-column').nth(i);
	const choCoMuc = async (ds, toiThieu = 1) =>
		expect
			.poll(() => ds.count(), { timeout: 20_000 })
			.toBeGreaterThanOrEqual(toiThieu)
			.then(() => true)
			.catch(() => false);

	const dsTinh = cot3(0).locator('.sp-item');
	if (await choCoMuc(dsTinh, 2)) {
		await dsTinh.nth(1).click();
	} else if (await choCoMuc(dsTinh, 1)) {
		await dsTinh.first().click();
	}

	const dsXa = cot3(1).locator('.sp-item');
	if (await choCoMuc(dsXa)) await dsXa.first().click();

	const dsShop = cot3(2).locator('.ant-radio-wrapper');
	if (!(await choCoMuc(dsShop))) {
		await dr.getByRole('button', { name: 'Đóng' }).click().catch(() => {});
		return null;
	}
	const ten = chuan(await dsShop.first().innerText());
	await dsShop.first().click();
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	await dr.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
	await page.waitForTimeout(2_000);
	return ten;
}

function boQua(test, lyDo) {
	test.skip(true, lyDo);
}

module.exports = {
	API_CHUYEN_KHO,
	API_LICH_SU,
	PHAN_LOAI_NHAP,
	PHAN_LOAI_XUAT,
	ROUTE_CHUYEN_KHO,
	ROUTE_LICH_SU,
	TRANG_THAI_CHUYEN,
	boQua,
	chanGhi,
	chonDiemBanQuaDrawer,
	chonOption,
	chuan,
	cot,
	dong,
	khung,
	moChuyenKho,
	moLichSu,
	moMan,
	moThe,
	nhanCacOption,
	oTim,
	taiLaiBoi,
	thamSo,
};
