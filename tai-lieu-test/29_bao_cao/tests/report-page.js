'use strict';

/**
 * Helper phân hệ 29 — Báo cáo (5 màn khác nhau, mỗi màn một API riêng).
 *
 * Đo từ DOM 20/09/2026:
 *
 * | Màn | Route | Tiêu đề | API chính |
 * |---|---|---|---|
 * | Doanh thu | `/report/revenue-sale` | `Báo cáo doanh thu…` | `/report/revenue/v1/monthly/{kpi,summary,province-summary,category-tree,trend,category-share}` |
 * | Lãi/Lỗ | `/report/profit-loss` | `Báo Cáo Lãi/Lỗ (P&L) Chi Nhánh` | `/report/revenue/v1/monthly/overhead` |
 * | Trị giá tồn kho | `/report/inventory-value` | `Báo cáo Trị giá Tồn kho` | `/report/inventory/monthly-summary…` |
 * | Đối soát HĐ mua hàng | `/report/po-reconciliation` | `Báo cáo Đối soát Hóa đơn Mua hàng & Công nợ NCC` | `/report/po-reconciliation/{metadata,suppliers,summary}` |
 * | Báo cáo tuỳ chỉnh | `/report/dynamic` | `Báo cáo` | `/report/reports/menu` + `POST /report/reports/guest-token/<id>` |
 *
 * 🔴 Báo cáo lọc **theo tháng** (`reportMonth=YYYY-MM-01`), 🚫 không phải khoảng ngày.
 * 🔴 Nhãn tiếng Việt trong DOM ở dạng NFD — tìm ô lọc bằng `timOLoc()` (bỏ dấu cả hai vế).
 */

const { moTrang } = require('../../shared/auth/login');

const MAN = {
	doanhThu: { route: '/report/revenue-sale', api: '/report/revenue/v1/monthly/summary' },
	laiLo: { route: '/report/profit-loss', api: '/report/revenue/v1/monthly/overhead' },
	tonKho: { route: '/report/inventory-value', api: '/report/inventory/monthly-summary' },
	doiSoat: { route: '/report/po-reconciliation', api: '/report/po-reconciliation/suppliers' },
	tuyChinh: { route: '/report/dynamic', api: '/report/reports/menu' },
};

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const boDau = (s) =>
	chuan(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
/** Đọc số tiền/số lượng từ chuỗi kiểu `1.234.567 đ`. */
const soTu = (s) => Number(chuan(s).replace(/[^\d-]/g, '') || 0);

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');

/** Mở một màn báo cáo; trả về mọi status của API chính (rỗng = chưa gọi lần nào). */
async function moMan(page, ten, vai) {
	const m = MAN[ten];
	const trangThai = [];
	page.on('response', (r) => {
		if (r.url().includes(m.api)) trangThai.push(r.status());
	});
	await moTrang(page, m.route, vai);
	await page.waitForTimeout(7_000);
	return trangThai;
}

/** 🔴 Đăng ký chờ TRƯỚC hành động; bỏ qua 401 do storageState cũ. */
async function taiLaiBoi(page, ten, hanhDong, { timeout = 60_000 } = {}) {
	const m = MAN[ten];
	const cho = page.waitForResponse((r) => r.url().includes(m.api) && r.status() !== 401, {
		timeout,
	});
	await hanhDong();
	const res = await cho;
	await page.waitForTimeout(1_500);
	return res;
}

const thamSo = (res) => Object.fromEntries(new URL(res.url()).searchParams.entries());

/** 🔴 Tìm ô `.ant-select` bằng chữ ĐÃ BỎ DẤU — `hasText` NFC không khớp DOM NFD. */
async function timOLoc(page, chuTrongO) {
	const can = boDau(chuTrongO);
	const ds = khung(page).locator('.ant-select');
	const n = await ds.count();
	for (let i = 0; i < n; i += 1) {
		if (boDau(await ds.nth(i).innerText().catch(() => '')).includes(can)) return ds.nth(i);
	}
	return null;
}

/** Ô chọn tháng (`Chọn tháng`) — dùng đoạn không dấu để tránh bẫy NFD. */
const oThang = (page) => khung(page).locator('input[placeholder*="n th"]').first();

/** Đổi tháng báo cáo về `lui` tháng trước tháng hiện tại; trả nhãn đã chọn. */
async function chonThangTruoc(page, lui = 1) {
	const o = oThang(page);
	await o.click();
	const panel = page.locator('.ant-picker-dropdown:visible').last();
	await panel.waitFor({ state: 'visible', timeout: 15_000 });
	const cell = panel.locator('.ant-picker-cell-in-view');
	const n = await cell.count();
	if (n === 0) return null;

	const homNay = new Date();
	const dich = new Date(homNay.getFullYear(), homNay.getMonth() - lui, 1);
	const nhan = `${dich.getMonth() + 1}`;
	const muc = panel.locator('.ant-picker-cell-in-view', { hasText: new RegExp(`^Th${'.'}*${nhan}$`) });
	const chon = (await muc.count()) > 0 ? muc.first() : cell.nth(Math.max(0, dich.getMonth()));
	const ten = chuan(await chon.innerText());
	await chon.click();
	await page.waitForTimeout(2_500);
	return ten;
}

/** 🔴 Chặn mọi request GHI — "Tổng hợp lại báo cáo" / "Chốt kho" là **ghi số liệu thật**. */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/report|inventory|reconcil/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

module.exports = {
	MAN, boDau, chanGhi, chonThangTruoc, chuan, dong, khung, moMan, oThang, soTu, taiLaiBoi,
	thamSo, timOLoc,
};
