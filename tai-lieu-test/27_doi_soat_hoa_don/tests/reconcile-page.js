'use strict';

/**
 * Helper phân hệ 27 — Đối soát hoá đơn PO.
 *
 * Đo từ DOM 20/09/2026, route `/supplier/invoice-reconcile`:
 *
 * | Thứ | Giá trị thật |
 * |---|---|
 * | Tiêu đề | `Đối soát hoá đơn PO` |
 * | Thẻ | `Theo hoá đơn` · `Theo phiếu PO` |
 * | Cột | `Mã PO · Hoá đơn · Nhà cung cấp · Mã số thuế · Nguồn · Ngày phát hành · Hạn thanh toán · Tổng tiền · File · Đối soát · Hạch toán · Thao tác` |
 * | API | `GET /__api/po-invoice-reconcile/invoices?page=&size=` |
 * | Bộ lọc | `Mã PO, số HĐ, MST, NCC` · 2 cặp ngày (`Xuất HĐ từ…đến`, `Hạn TT từ…đến`) · select `Trạng thái` · select `Nhà cung cấp` |
 * | Nút | `Upload XML` · mỗi dòng có `Chi tiết` + `Đối soát` |
 *
 * 🔴 **Vai `shop` mở màn được nhưng MỌI lời gọi trả 401** (cả `/shops/<id>/supplier`) ⇒ bảng rỗng
 * không phải "chưa có phiếu" mà là **không được phép đọc**. Case đọc/lọc vì thế chạy bằng vai `tct`.
 *
 * 🔴 Nhãn/placeholder tiếng Việt trong DOM ở dạng **tổ hợp (NFD)** — tìm ô lọc bằng `timOLoc()`
 * (bỏ dấu cả hai vế), 🚫 không dùng `hasText` với chuỗi có dấu.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const ROUTE = '/supplier/invoice-reconcile';
const API = '/po-invoice-reconcile/invoices';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
// 🔴 Placeholder tiếng Việt trong DOM ở dạng **tổ hợp (NFD)**: `placeholder^="Tìm kiếm"` viết
//    bằng NFC 🚫 KHÔNG khớp dù mắt nhìn giống hệt. Bám vào đoạn KHÔNG DẤU để tránh bẫy này.
const oTim = (page) => khung(page).locator('input[placeholder*="PO"]').first();

/** Header của lời gọi API thật gần nhất (token nằm trong RAM app) — dùng cho `apiGoi()`. */
const HEADER = new WeakMap();

/** Mở màn; trả về mọi status của lời gọi danh sách (rỗng = chưa gọi lần nào). */
async function moMan(page, vai) {
	const trangThai = [];
	page.on('response', (r) => {
		if (r.url().includes(API)) trangThai.push(r.status());
	});
	ghiHeader(page);
	await moTrang(page, ROUTE, vai);
	await page.waitForTimeout(6_000);
	return trangThai;
}

/** 🔴 Đăng ký chờ TRƯỚC hành động; bỏ qua 401 do storageState cũ. */
async function taiLaiBoi(page, hanhDong, { timeout = 60_000 } = {}) {
	const cho = page.waitForResponse((r) => r.url().includes(API) && r.status() !== 401, { timeout });
	await hanhDong();
	const res = await cho;
	await page.waitForTimeout(1_000);
	return res;
}

const thamSo = (res) => Object.fromEntries(new URL(res.url()).searchParams.entries());

/** Đổi thẻ — 🔴 `.click()` trần KHÔNG đổi tab ở antd v6. */
async function moThe(page, nhan) {
	const the = khung(page).locator('.ant-tabs-tab', { hasText: nhan }).first();
	if ((await the.count()) === 0) return false;
	await the.locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await page.waitForTimeout(2_500);
	return true;
}

const boDau = (s) =>
	chuan(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Mở một `.ant-select` theo chữ đang hiện, đọc nhãn các lựa chọn rồi đóng lại. */
async function nhanCacOption(page, chuTrongO) {
	const o = await timOLoc(page, chuTrongO);
	if (!o) return [];
	await o.click();
	const dd = page.locator('.ant-select-dropdown').last();
	await dd.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
	const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
	await page.keyboard.press('Escape');
	await page.waitForTimeout(400);
	return nhan;
}

/**
 * Trả về locator của ô `.ant-select` có chữ khớp (đã bỏ dấu), hoặc `null`.
 *
 * 🔴 Dùng chỉ số DOM thay cho `hasText`: `hasText` so chuỗi NFC với DOM NFD nên trượt.
 */
async function timOLoc(page, chuTrongO) {
	const can = boDau(chuTrongO);
	const ds = khung(page).locator('.ant-select');
	const n = await ds.count();
	for (let i = 0; i < n; i += 1) {
		const chu = boDau(await ds.nth(i).innerText().catch(() => ''));
		if (chu.includes(can)) return ds.nth(i);
	}
	return null;
}

/** Chọn lựa chọn thứ `viTri` của một ô lọc; trả `false` khi ô không có lựa chọn nào. */
async function chonOption(page, chuTrongO, viTri = 0) {
	const o = await timOLoc(page, chuTrongO);
	if (!o) return false;
	await o.click();
	const dd = page.locator('.ant-select-dropdown').last();
	await dd.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
	const muc = dd.locator('.ant-select-item-option');
	if ((await muc.count()) <= viTri) return false;
	await muc.nth(viTri).click();
	await page.waitForTimeout(800);
	return true;
}

/** 🔴 Chặn mọi request GHI — lập phiếu thu là **ghi vào quỹ tiền mặt thật**. */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/reconcile|invoice|supplier|po-/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bổ sung 23/09/2026 — probe DOM + nguồn FE (`InvoiceReconcilePage`, `DrawerInvoiceQuickView`,
// `DrawerEditInvoice`, `InvoiceReconcileDetailPage`, `InvoiceFileSection`):
//
// | Thứ | Giá trị thật |
// |---|---|
// | Nút dòng | `Chi tiết` · `Đối soát` · nút icon làm mới (không nhãn) → `POST /invoices/{id}/rerun` |
// | Ô tìm | gọi API mỗi lần đổi giá trị (`keyword=`), KHÔNG lọc client |
// | Dòng nhóm | tag `Gồm N hoá đơn`; bung bằng `.ant-table-row-expand-icon` → `tr.ant-table-expanded-row` |
// | Drawer | `Chi tiết hoá đơn` (bảng `Danh sách hoá đơn của PO`, `Chi tiết hàng hoá`; nút `Xem`, `Đóng`, `Chỉnh sửa`) |
// | Drawer con | `Chi tiết hoá đơn con` (bảng `Dòng hàng trên hoá đơn`) |
// | Drawer sửa | `Chỉnh sửa hoá đơn` (nút `Thêm dòng`, icon thùng rác, `Lưu thông tin & đối soát lại`, `Đóng`) |
// | Màn đối soát | `/supplier/invoice-reconcile/detail?invoiceId&poId&shopId`, tiêu đề `Đối soát hoá đơn, chứng từ`, thẻ `Đối soát công nợ (PO)` · `Phiếu nhập kho` · `Phiếu đặt hàng`, bảng phải `Kết quả đối soát XML` + nút `Xoá XML` |
// | Modal upload | `Upload hoá đơn XML`, input file accept `.xml,text/xml,application/xml`, nút `Hủy` · `Upload` |
// | Chứng từ | khối `Upload chứng từ` (mặc định thu gọn, bấm để mở), tối đa 10 file / tham chiếu |

const API_GOC = (process.env.VNPOST_API_BASE_URL || process.env.VNPOST_BASE_URL || '').replace(/\/$/, '');

function ghiHeader(page) {
	if (HEADER.has(page)) return;
	HEADER.set(page, null);
	// 🔴 Chỉ lấy header của lời gọi ĐÃ 200: lời gọi đầu mang token cũ của storageState ⇒ 401.
	page.on('response', async (r) => {
		if (!r.url().includes('/po-invoice-reconcile/') || r.status() !== 200) return;
		const h = await r.request().allHeaders().catch(() => null);
		if (h?.authorization) HEADER.set(page, h);
	});
}

/** Gọi thẳng API bằng header app vừa dùng — chỉ để ĐỌC đối chứng hoặc DỌN dữ liệu của chính test. */
async function apiGoi(page, method, duong, data) {
	const h = HEADER.get(page);
	if (!h) throw new Error('Chưa bắt được header API — mở màn bằng moMan() trước.');
	const headers = Object.fromEntries(
		Object.entries(h).filter(([k]) => !k.startsWith(':') && !['content-length', 'content-type', 'host', 'accept-encoding'].includes(k)),
	);
	const res = await page.request.fetch(`${API_GOC}${duong}`, {
		method,
		headers: { ...headers, 'content-type': 'application/json' },
		data: data === undefined ? undefined : JSON.stringify(data),
	});
	const txt = await res.text().catch(() => '');
	let body = {};
	try { body = JSON.parse(txt); } catch { body = { _loi: `không phải JSON: ${txt.slice(0, 200)}` }; }
	if (res.status() >= 400) body._loi = `${res.status()} ${(await res.text().catch(() => '')).slice(0, 200)}`;
	return { status: res.status(), body };
}

/** Gõ từ khoá vào ô tìm và chờ đúng lời gọi danh sách mang từ khoá đó. */
async function tim(page, tuKhoa) {
	const res = await taiLaiBoi(page, () => oTim(page).fill(tuKhoa));
	return (await res.json().catch(() => ({})))?.data ?? [];
}

const nutDong = (page, nhan, viTri = 0) =>
	dong(page).nth(viTri).getByRole('button', { name: nhan });

/** Nút icon làm mới (không nhãn) ở cột Thao tác. */
const nutLamMoi = (page, viTri = 0) => dong(page).nth(viTri).locator('button:has(.anticon-reload)');

/** Drawer đang mở có tiêu đề đúng `tieuDe` (so sau chuẩn hoá NFC). */
async function drawer(page, tieuDe) {
	const can = boDau(tieuDe);
	await expect
		.poll(async () => {
			const ts = await page.locator('.ant-drawer-open .ant-drawer-title').allInnerTexts();
			return ts.some((t) => boDau(t) === can || boDau(t).startsWith(can));
		}, { message: `Không thấy drawer "${tieuDe}"`, timeout: 20_000 })
		.toBe(true);
	const ds = page.locator('.ant-drawer-open');
	const n = await ds.count();
	for (let i = n - 1; i >= 0; i -= 1) {
		const t = boDau(await ds.nth(i).locator('.ant-drawer-title').first().innerText().catch(() => ''));
		if (t === can || t.startsWith(can)) return ds.nth(i);
	}
	return ds.last();
}

/** Mở drawer Chi tiết hoá đơn của dòng `viTri`; chờ API chi tiết. */
async function moChiTiet(page, viTri = 0) {
	const cho = page.waitForResponse((r) => /\/po-invoice-reconcile\/invoices\/\d+$/.test(r.url()) && r.status() !== 401);
	await nutDong(page, 'Chi tiết', viTri).click();
	const res = await cho;
	const d = await drawer(page, 'Chi tiết hoá đơn');
	await expect(d.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 20_000 });
	return { d, body: await res.json().catch(() => ({})) };
}

/** Bảng antd trong phạm vi `goc` có tiêu đề (ProTable headerTitle) chứa `tieuDe`. */
function bangTheoTieuDe(goc, tieuDe) {
	return goc.locator('.ant-pro-table').filter({ hasText: tieuDe }).first();
}

const dongBang = (bang) => bang.locator('.ant-table-tbody tr.ant-table-row');

/** Tên cột lá (bỏ cột nhóm) của một bảng. */
async function cotBang(bang) {
	return (await bang.locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);
}

const ROUTE_CHI_TIET = '/supplier/invoice-reconcile/detail';

/** Mở màn Đối soát hoá đơn, chứng từ bằng tham số như nút `Đối soát` / `Xem` sinh ra. */
async function moManDoiSoat(page, vai, { invoiceId, poId, shopId }) {
	ghiHeader(page);
	const q = new URLSearchParams();
	if (invoiceId) q.set('invoiceId', invoiceId);
	if (poId) q.set('poId', poId);
	if (shopId) q.set('shopId', shopId);
	const url = `${ROUTE_CHI_TIET}?${q}`;
	const cho = page.waitForResponse(
		(r) => r.url().includes(`/po-invoice-reconcile/purchase-orders/${poId}`) && r.status() !== 401,
		{ timeout: 60_000 },
	).catch(() => null);
	await moTrang(page, url, vai);
	await cho;
	await expect(page.locator('.ant-page-header-heading-title').first()).toBeVisible();
	await expect(page.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 20_000 });
}

/** Đổi thẻ ở màn đối soát chi tiết (thẻ antd cấp đầu). */
async function moTheChiTiet(page, nhan) {
	const the = page.locator('.ant-tabs-tab').filter({ hasText: nhan }).first();
	await the.locator('.ant-tabs-tab-btn').click();
	await expect(the).toHaveClass(/ant-tabs-tab-active/);
	const pane = page.locator('.ant-tabs-tabpane-active').first();
	await expect(pane.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 20_000 });
	return pane;
}

/** Giá trị ô Descriptions theo nhãn trong phạm vi `goc`. */
async function giaTriMoTa(goc, nhan) {
	const labels = goc.locator('.ant-descriptions-item-label');
	const n = await labels.count();
	for (let i = 0; i < n; i += 1) {
		if (boDau(await labels.nth(i).innerText()) === boDau(nhan)) {
			return chuan(
				await labels.nth(i).locator('xpath=following-sibling::td[1] | following-sibling::*[1]').first().innerText(),
			);
		}
	}
	return null;
}

/** Tin nhắn antd (message) đầu tiên xuất hiện sau hành động. */
async function docThongBao(page, timeout = 20_000) {
	const m = page.locator('.ant-message-notice-content').first();
	await m.waitFor({ state: 'visible', timeout });
	return chuan(await m.innerText());
}

/** Sinh XML hoá đơn tối giản đúng thẻ mà `DefaultVietnamEInvoiceXmlReader` đọc. */
function xmlHoaDon({ poCode, kyHieu = 'AUTOTEST', so, mst = '0000000000', tenNcc = 'AUTOTEST_NCC', tong = 1000 }) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<HDon><DLHDon><TTChung><KHMSHDon>1</KHMSHDon><KHHDon>${kyHieu}</KHHDon><SHDon>${so}</SHDon>
<NLap>2026-09-23</NLap><HTTToan>Chuyển khoản</HTTToan>
<TTKhac><TTin><TTruong>POCode</TTruong><KDLieu>string</KDLieu><DLieu>${poCode}</DLieu></TTin></TTKhac></TTChung>
<NDHDon><NBan><Ten>${tenNcc}</Ten><MST>${mst}</MST></NBan><NMua><Ten>AUTOTEST</Ten></NMua>
<DSHHDVu><HHDVu><STT>1</STT><THHDVu>AUTOTEST_HANG</THHDVu><DVTinh>Cái</DVTinh><SLuong>1</SLuong>
<DGia>${tong}</DGia><ThTien>${tong}</ThTien><TSuat>0%</TSuat></HHDVu></DSHHDVu>
<TToan><TgTCThue>${tong}</TgTCThue><TgTThue>0</TgTThue><TgTTTBSo>${tong}</TgTTTBSo></TToan></NDHDon></DLHDon></HDon>`;
}

/** Mở modal Upload XML, nạp tệp (`{name, mimeType, buffer}`) và bấm `Upload`; trả response upload. */
async function uploadXml(page, tep) {
	await khung(page).getByRole('button', { name: /Upload XML/ }).click();
	const modal = page.locator('.ant-modal').filter({ hasText: 'XML' }).last();
	await expect(modal).toBeVisible();
	await modal.locator('input[type=file]').setInputFiles(tep);
	await expect(modal.locator('.ant-upload-list-item')).toHaveCount(tep.length);
	const cho = page.waitForResponse((r) => r.url().includes('/po-invoice-reconcile/upload'));
	await modal.getByRole('button', { name: /^Upload$/ }).click();
	return cho;
}

module.exports = {
	API, ROUTE, ROUTE_CHI_TIET, apiGoi, bangTheoTieuDe, boDau, chanGhi, chonOption, chuan, cotBang,
	docThongBao, dong, dongBang, drawer, giaTriMoTa, khung, moChiTiet, moMan, moManDoiSoat, moThe,
	moTheChiTiet, nhanCacOption, nutDong, nutLamMoi, oTim, taiLaiBoi, thamSo, tim, timOLoc, uploadXml,
	xmlHoaDon,
};
