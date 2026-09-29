'use strict';

/**
 * Helper phân hệ 26 — Phiếu thu.
 *
 * Đo từ DOM 20/09/2026, route `/finance/receipt-management`:
 *
 * | Thứ | Giá trị thật |
 * |---|---|
 * | Tiêu đề | `Quản lý phiếu thu` |
 * | Thẻ | `Tất cả · Tiền mặt · Chuyển khoản · Thẻ VISA` (phương thức, 🚫 không phải trạng thái) |
 * | Cột | `# · Ngày tạo · Mã Phiếu · Phân loại phiếu · Thực hiện · Thu từ · Tổng tiền · Phương thức · Ghi chú · Hình ảnh / chứng từ · Hành động` |
 * | API | `GET /__api/expenses/view_all_receipts?pageNum=&pageSize=&shopId=&start_date=&end_date=` |
 * | Bộ lọc | `Tìm kiếm theo mã` · cặp ngày · select `Chọn nguồn thu` · select `Phân loại phiếu` |
 * | Nút (vai shop) | `Thêm phiếu thu` · `Danh mục phiếu thu` |
 *
 * 🔴 Mặc định `start_date`/`end_date` là **hôm nay** ⇒ danh sách rỗng 🚫 không có nghĩa là mất dữ liệu.
 */

const { moTrang: moTrangGoc } = require('../../shared/auth/login');

/**
 * `moTrang` bọc thêm một lối thoát cho bẫy đăng nhập đo ở lane 8 (23/09/2026):
 * tài khoản 1 phạm vi đôi khi được app **tự vào thẳng** trong khi `.env.lane*` vẫn khai
 * `VNPOST_SCOPE_LABEL_*` ⇒ `dangNhapVai` chờ màn chọn phạm vi và ném *"Không thấy đơn vị …"*
 * dù phiên đã vào app; lần khác lại kẹt ở `/account` sau khi bấm dòng phạm vi. Cả hai là lỗi
 * bước đăng nhập (🚫 không phải lỗi màn phiếu thu) ⇒ xoá cookie, đăng nhập lại, tối đa 3 lần.
 */
async function moTrang(page, url, vai) {
	for (let lan = 1; ; lan += 1) {
		try {
			await moTrangGoc(page, url, vai);
			return;
		} catch (e) {
			const msg = String(e?.message);
			// Chỉ thử lại lỗi của BƯỚC ĐĂNG NHẬP (kẹt/nhảy qua màn chọn phạm vi), tối đa 3 lần.
			const loiDangNhap = /Không thấy đơn vị|Nhãn phạm vi khớp|\/account\(\?:/.test(msg);
			if (!loiDangNhap || lan >= 3) throw e;
			await page.context().clearCookies();
			await page.goto('/account', { waitUntil: 'domcontentloaded' }).catch(() => {});
		}
	}
}

const ROUTE = '/finance/receipt-management';
const API = '/expenses/view_all_receipts';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
// 🔴 Placeholder tiếng Việt trong DOM ở dạng **tổ hợp (NFD)**: `placeholder^="Tìm kiếm"` viết
//    bằng NFC 🚫 KHÔNG khớp dù mắt nhìn giống hệt. Bám vào đoạn KHÔNG DẤU để tránh bẫy này.
const oTim = (page) => khung(page).locator('input[placeholder*="m ki"]').first();

/** Mở màn; trả về mọi status của lời gọi danh sách (rỗng = chưa gọi lần nào). */
async function moMan(page, vai) {
	const trangThai = [];
	page.on('response', (r) => {
		if (r.url().includes(API)) trangThai.push(r.status());
	});
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
		if (!/expenses|receipt|fund|finance/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

/**
 * Bắt header xác thực mà app gắn vào lời gọi API (token chỉ nằm trong RAM của app).
 * Trả về object `{ h }`; `h` được cập nhật mỗi lần app gọi API, nên luôn là token mới nhất.
 */
function batHeader(page) {
	const kho = { h: null };
	page.on('request', (r) => {
		const h = r.headers();
		if (h.authorization && /vnpost-api|__api/.test(r.url())) kho.h = h;
	});
	return kho;
}

const API_BASE = (process.env.VNPOST_API_BASE_URL || '').replace(/\/$/, '');

/** Gọi API bằng đúng header của phiên đang mở. Trả `{ status, body }`. */
async function goiApi(page, kho, method, duong, { params, data } = {}) {
	if (!kho.h) throw new Error('Chưa bắt được header xác thực — app chưa gọi API nào.');
	const h = Object.fromEntries(
		Object.entries(kho.h).filter(([k]) => !/^(host|content-length|accept-encoding|cookie)$/i.test(k)),
	);
	const url = new URL(API_BASE + duong);
	for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined) url.searchParams.set(k, v);
	const r = await page.request.fetch(url.toString(), {
		method, headers: { ...h, 'content-type': 'application/json' }, data,
	});
	let body = null;
	try { body = await r.json(); } catch { body = null; }
	return { status: r.status(), body };
}

const dauNgay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Danh sách phiếu thu HÔM NAY của shop, tối đa 200 dòng. */
async function phieuHomNay(page, kho, shopId, them = {}) {
	const r = await goiApi(page, kho, 'GET', API, {
		params: {
			shopId, pageNum: 1, pageSize: 200, page: 0, size: 200,
			start_date: dauNgay(), end_date: dauNgay() + 86_400_000 - 1000, sort: 'createdDate,DESC', ...them,
		},
	});
	if (String(r.body?.status?.code) !== '200') {
		throw new Error(`view_all_receipts lỗi: ${r.status} ${JSON.stringify(r.body?.status)}`);
	}
	return r.body;
}

/** Tổng thu của một quỹ trong hôm nay (`totalMoneyReceive`). */
async function tongThuQuy(page, kho, shopId, fundId) {
	const r = await goiApi(page, kho, 'GET', '/fund/fund-total', {
		params: { shopId, fundId, beginTime: dauNgay(), endTime: dauNgay() + 86_400_000 - 1000 },
	});
	if (String(r.body?.status?.code) !== '200') {
		throw new Error(`fund-total lỗi: ${r.status} ${JSON.stringify(r.body?.status)}`);
	}
	return Number(r.body.data.totalMoneyReceive ?? 0);
}

/**
 * Tên (mã) nhân viên GDV của làn — lấy từ sổ seed (`duLieu.taiKhoanLan.gdv.maNhanVien`), 🚫 không ghép cứng `AUTO<làn>_GDV`:
 * làn seed bằng tiền tố khác (web tool /seed cho nhập tiền tố bộ dữ liệu) thì tên ghép cứng không có trong dropdown.
 */
function tenGdv() {
	const seed = require('../../00_seed/seed-state');
	const gdv = seed.doc()?.duLieu?.taiKhoanLan?.gdv;
	if (!gdv?.maNhanVien) {
		throw new Error(`Sổ seed của làn ${process.env.VNPOST_LANE || '(mặc định)'} chưa có tài khoản GDV (duLieu.taiKhoanLan.gdv) — chạy bước seed tài khoản làn trước.`);
	}
	return gdv.maNhanVien;
}

module.exports = {
	tenGdv,
	API, ROUTE, moTrang, batHeader, boDau, chanGhi, chonOption, chuan, dauNgay, dong, goiApi, khung, moMan,
	moThe, nhanCacOption, oTim, phieuHomNay, taiLaiBoi, thamSo, timOLoc, tongThuQuy,
};
