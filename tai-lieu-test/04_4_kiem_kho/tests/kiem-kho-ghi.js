'use strict';

/**
 * Helper GHI phân hệ 04_4 — Kiểm kho theo PHIÊN, điểm bán seed của làn, vai `shop`.
 *
 * Đo DOM 23/09/2026 (vnpost-web af8cda07):
 * - `/inventory/inventory-check` → nút "Mở phiên kiểm kho" (cấp điểm bán: tự lấy kho mặc định, mở
 *   hoặc tiếp tục phiên, vào `/session-manage?shopId&sessionId`).
 * - Trang quản lý phiên, chân trang: "Thêm phiếu kiểm của tôi" · "Hủy phiên" · "Chốt phiên".
 *   Thêm phiếu ⇒ `POST /stock/v3/inventory-check/sessions/<id>/tickets` rồi sang
 *   `/session?shopId&stockInOutId&sessionId`.
 * - Trang phiếu: ô SL cập nhật KHOÁ — đếm qua nút "Kiểm lô" (drawer "Kiểm kho theo lô", ô
 *   placeholder "Chưa đếm" mỗi lô; rỗng = CHƯA ĐẾM). Lưu lô ⇒ `POST …/inventory-check/<id>/items`.
 *   Chân trang: "Lưu thông tin" · "Xác nhận đếm".
 * - Chốt phiên: drawer "Xem lại bảng tổng hợp trước khi chốt phiên" → "Xác nhận chốt phiên".
 *   Còn lô chưa ai kiểm ⇒ BE trả `UNCOUNTED_LOTS_WARNING`, drawer "Còn lô/serial chưa được kiểm"
 *   ("Quay lại kiểm tiếp" / "Vẫn chốt (áp tồn về 0)").
 * 🔴 Phiên đang mở KHOÁ KHO (freeze-check) ⇒ mọi case phải chốt hoặc HUỶ phiên trước khi kết thúc.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const BASE = () => process.env.VNPOST_BASE_URL;

/** Phiên đang mở của kho mặc định (hoặc null). */
async function phienMo(page, st, shopId) {
	const kho = await k.goiApi(page, st, `/shops/${shopId}/inventory`);
	const inv = (kho.data || []).find((x) => x.isDefault) || (kho.data || [])[0];
	const b = await k.goiApi(page, st, '/stock/v3/inventory-check/sessions/open', { shopId, inventoryId: inv.id });
	return b.data;
}

async function chiTietPhien(page, st, shopId, sessionId) {
	return (await k.goiApi(page, st, `/stock/v3/inventory-check/sessions/${sessionId}`, { shopId })).data;
}

/** Mở (hoặc tiếp tục) phiên, về trang quản lý phiên. Trả sessionId. */
async function moPhien(page, vai) {
	await moTrang(page, `${BASE()}/inventory/inventory-check`, vai);
	const nut = page.getByRole('button', { name: /Mở phiên kiểm kho|Tiếp tục/ }).first();
	await expect(nut).toBeVisible({ timeout: 30_000 });
	await nut.click();
	await page.waitForURL(/session-manage/, { timeout: 30_000 });
	return Number(new URL(page.url()).searchParams.get('sessionId'));
}

/** Từ trang quản lý phiên: thêm phiếu kiểm của tôi → trang phiếu. Trả stockInOutId. */
async function themPhieu(page) {
	const cho = page.waitForResponse((r) => /\/sessions\/\d+\/tickets/.test(r.url()) && r.request().method() === 'POST');
	await page.getByRole('button', { name: /Thêm phiếu kiểm của tôi/ }).click();
	const b = await (await cho).json();
	expect(String(b?.status?.code), `Thêm phiếu lỗi: ${b?.status?.message}`).toBe('200');
	await page.waitForURL(/stockInOutId=\d+/, { timeout: 30_000 });
	return Number(new URL(page.url()).searchParams.get('stockInOutId'));
}

/**
 * Vào phiếu nháp CỦA TÔI trong phiên đang mở (tạo mới nếu chưa có). Nhân viên đã có phiếu nháp thì
 * "Thêm phiếu" bị chặn bằng modal "Không thể mở phiếu mới" → nút "Tiếp tục đếm phiếu hiện tại".
 */
async function vaoPhieuCuaToi(page, vai) {
	const sessionId = await moPhien(page, vai);
	await page.getByRole('button', { name: /Thêm phiếu kiểm của tôi/ }).click();
	const md = page.locator('.ant-modal-confirm').filter({ hasText: 'Không thể mở phiếu mới' });
	const chan = await md.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false);
	if (chan) await md.getByRole('button', { name: /Tiếp tục đếm phiếu hiện tại/ }).click();
	await page.waitForURL(/stockInOutId=\d+/, { timeout: 30_000 });
	await expect(page.getByRole('button', { name: 'Nhập từ Excel' })).toBeVisible({ timeout: 30_000 });
	return { sessionId, phieu: Number(new URL(page.url()).searchParams.get('stockInOutId')) };
}

/** Dòng SP trên trang phiếu (dòng có nút "Kiểm lô"). */
const dongSp = (page, ten, bienThe) => {
	let d = page.locator('tr[data-row-key]').filter({ hasText: ten }).filter({ has: page.getByRole('button', { name: /lô/ }) });
	if (bienThe) d = d.filter({ hasText: bienThe });
	return d.first();
};

/** Thêm SP vào phiếu (nếu chưa có). */
async function themSp(page, ten, bienThe) {
	if (await dongSp(page, ten, bienThe).count()) return dongSp(page, ten, bienThe);
	await page.getByPlaceholder(/Tìm sản phẩm|Tên SP|Tìm kiếm sản phẩm/).first().fill(ten);
	// Popup tự vẽ: SP nhiều biến thể liệt kê từng dòng "Màu: Đỏ"… dưới tên SP.
	const popup = page.locator('div.absolute').filter({ hasText: ten }).last();
	if (bienThe) await popup.getByText(bienThe.includes(':') ? bienThe : new RegExp(`:\\s*${bienThe}$`), { exact: bienThe.includes(':') }).first().click();
	else await page.getByText(ten, { exact: true }).last().click();
	await expect(dongSp(page, ten, bienThe)).toBeVisible({ timeout: 20_000 });
	return dongSp(page, ten, bienThe);
}

/**
 * Đếm theo lô: `dem = { <mã lô>: số | '' }` ('' = để trống / chưa đếm). Chờ request lưu dòng.
 */
async function demLo(page, ten, dem, bienThe) {
	const d = dongSp(page, ten, bienThe);
	await d.getByRole('button', { name: /lô/ }).first().click();
	const dl = page.locator('.ant-drawer-open').filter({ hasText: 'Kiểm kho theo lô' }).last();
	await expect(dl).toBeVisible();
	for (const [ma, v] of Object.entries(dem)) {
		const h = dl.locator('tr').filter({ hasText: ma }).first();
		await h.getByPlaceholder('Chưa đếm').fill(String(v));
	}
	// Lần đầu POST, sửa lại dòng đã có thì PUT/PATCH ⇒ nhận mọi request ghi vào items.
	const cho = page.waitForResponse((r) => /inventory-check\/\d+\/items/.test(r.url()) && r.request().method() !== 'GET', { timeout: 12_000 }).catch(() => null);
	await dl.getByRole('button', { name: 'Lưu' }).click();
	// Đếm lại dòng đã đếm ⇒ FE hỏi "Thời gian kiểm kho" trước khi lưu — giữ thời gian gốc.
	const hoi = page.locator('.ant-modal-confirm').filter({ hasText: 'Thời gian kiểm kho' });
	if (await hoi.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false)) {
		await hoi.getByRole('button', { name: 'Giữ thời gian gốc' }).click();
	}
	const r = await cho;
	if (r) {
		const b = await r.json();
		expect(String(b?.status?.code), `Lưu số đếm ${ten} lỗi: ${b?.status?.message}`).toBe('200');
	} else {
		// Không có request (vd. số đếm trùng lần lưu trước) ⇒ ít nhất dòng phải báo đã kiểm đủ lô.
		const chu = await dongSp(page, ten, bienThe).innerText();
		const m = chu.match(/đã kiểm (\d+)\/(\d+) lô/);
		expect(m && m[1] === m[2], `Lưu số đếm ${ten}${bienThe ? ` (${bienThe})` : ''} không gửi request và dòng chưa kiểm đủ lô: ${chu.replace(/\s+/g, ' ')}`).toBeTruthy();
	}
	await expect(dl).toBeHidden();
	return dongSp(page, ten, bienThe);
}

/**
 * Đếm TOÀN KHO: phiên cấp điểm bán là `productTargetType=ALL` — chốt phiên đòi mọi lô còn tồn đều
 * có số đếm (thiếu ⇒ `UNCOUNTED_LOTS_WARNING`, xác nhận là áp lô đó về 0). Lô không nằm trong
 * `ghiDe` được đếm ĐÚNG tồn hiện tại (không đổi). `ghiDe = { <mã lô>: SL }`.
 */
async function demToanKho(page, st, shopId, ghiDe = {}) {
	const b = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, size: 500 });
	const nhom = {};
	for (const l of (b.data || []).filter((x) => Number(x.remainQuantity) > 0)) {
		const khoa = `${l.productName}|${l.variantName}`;
		(nhom[khoa] ||= { ten: l.productName, bienThe: l.variantName === 'Mặc định' ? null : l.variantName, lo: {} }).lo[l.batchCode] =
			ghiDe[l.batchCode] ?? Number(l.remainQuantity);
	}
	for (const g of Object.values(nhom)) {
		await themSp(page, g.ten, g.bienThe);
		await demLo(page, g.ten, g.lo, g.bienThe);
	}
	return nhom;
}

/** Chọn lý do chênh lệch đầu tiên cho dòng (BE đòi ghi chú dòng lệch khi chốt). */
async function chonLyDo(page, ten) {
	const d = dongSp(page, ten);
	await d.locator('.ant-select').last().click();
	await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
}

/**
 * Mở bảng tổng hợp chốt phiên và điền ghi chú cho MỌI dòng bắt buộc
 * (`MergedCheckDetailPanel`: ô placeholder "Bắt buộc nhập ghi chú" — BE chặn `MISSING_DIFF_NOTE`).
 * Trả drawer.
 */
async function moTongHop(page) {
	await page.getByRole('button', { name: 'Chốt phiên' }).click();
	const rv = page.locator('.ant-drawer-open').filter({ hasText: 'Xem lại bảng tổng hợp trước khi chốt phiên' }).last();
	await expect(rv).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(3_000);
	const o = rv.getByPlaceholder('Bắt buộc nhập ghi chú');
	for (let i = 0; i < (await o.count()); i += 1) await o.nth(i).fill('AUTO test kiem kho');
	return rv;
}

/** Hủy phiên (dọn) qua API — 🔴 bắt buộc để không khoá kho các phân hệ khác. */
async function huyPhien(page, st, shopId, sessionId) {
	if (!sessionId) return;
	await k.goiGhi(page, st, 'POST', `/stock/v3/inventory-check/sessions/${sessionId}/cancel`, { shopId });
}

const COT_MAU = ['SKU', 'Tên sản phẩm', 'Tên biến thể', 'Đơn vị', 'PP tính giá vốn', 'Mã lô', 'Tồn kho', 'Tồn kho thực tế', 'Serial', 'Ghi chú'];

/** Tải file mẫu (API của chính nút "Tải mẫu"): trả { status, buffer, dong: [[...10 cột]] }. */
async function taiMau(page, st, shopId, coTon) {
	const r = await page.request.get(`${BASE()}/__api/stock/v3/inventory-check/template`, {
		headers: st.h, params: { shopId, inventoryId: '', includeStock: String(coTon) },
	});
	const buffer = await r.body();
	const ExcelJS = require('exceljs');
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.load(buffer);
	const ws = wb.worksheets[0];
	const dong = [];
	ws.eachRow((row) => dong.push(row.values.slice(1).map((v) => (v == null ? '' : v))));
	return { status: r.status(), sheet: ws.name, dong };
}

/** Ghi file .xlsx theo đúng mẫu (sheet `inventory_check`) rồi "Nhập từ Excel". Trả chữ kết quả drawer. */
async function nhapExcel(page, dong, file) {
	const ExcelJS = require('exceljs');
	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet('inventory_check');
	ws.addRow(COT_MAU);
	for (const d of dong) ws.addRow(d);
	await wb.xlsx.writeFile(file);
	await page.getByRole('button', { name: 'Nhập từ Excel' }).click();
	const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ hasText: 'Nhập số đếm từ Excel' }).last();
	await expect(dr).toBeVisible();
	await dr.locator('input[type=file]').setInputFiles(file);
	await dr.getByRole('button', { name: 'Nhập dữ liệu' }).click();
	await expect(dr).toContainText(/Đã nhập \d+\/\d+ dòng|thành công/i, { timeout: 60_000 });
	const chu = (await dr.innerText()).replace(/\s+/g, ' ');
	const nut = dr.getByRole('button', { name: 'Đóng', exact: true }).last();
	if (await nut.count()) await nut.click();
	return chu;
}

/**
 * Đếm TOÀN KHO bằng Excel theo LÔ: mọi lô còn tồn = đúng tồn, trừ `ghiDe = { <mã lô>: SL }`.
 * SKU lấy từ file mẫu có tồn (khoá: tên SP + tên biến thể).
 */
/** Serial còn tồn của một lô (SELECT, dò 3 pod). */
function serialCuaLo(shopId, batchProductId) {
	const { chon } = require('../../shared/db/otp');
	for (const db of ['VNPOST_POD_02', 'VNPOST_POD_01', 'VNPOST_POD_03']) {
		try {
			const r = chon(`select serial_number from SHOP_STOCK_SERIAL where shop_id=${shopId} and batch_product_id=${batchProductId} and status=1 order by serial_number`, db);
			if (r) return r.split('\n').filter(Boolean);
		} catch { /* pod khác */ }
	}
	return [];
}

async function demToanKhoExcel(page, st, shopId, ghiDe, file) {
	const mau = await taiMau(page, st, shopId, true);
	const sku = Object.fromEntries(mau.dong.slice(1).map((d) => [`${d[1]}|${d[2]}`, d]));
	const b = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, size: 500 });
	const dong = [];
	for (const l of (b.data || []).filter((x) => Number(x.remainQuantity) > 0)) {
		const bt = l.variantName === 'Mặc định' ? 'Mặc định' : l.variantName;
		const m = sku[`${l.productName}|${bt}`] || Object.values(sku).find((d) => d[1] === l.productName && String(d[2]).endsWith(l.variantName));
		expect(m, `File mẫu không có dòng cho ${l.productName} / ${l.variantName}`).toBeTruthy();
		// 🔴 SP quản lý serial: BE bỏ qua dòng thiếu cột Serial ("phải nhập danh sách serial") ⇒ điền serial CÒN TỒN của đúng lô
		//    (SHOP_STOCK_SERIAL status=1, theo batch_product_id — chỉ SELECT; BE tách bằng , ; xuống dòng).
		const sr = serialCuaLo(shopId, l.batchProductId);
		dong.push([m[0], m[1], m[2], m[3], m[4], l.batchCode, Number(l.remainQuantity), ghiDe[l.batchCode] ?? Number(l.remainQuantity), sr.join(','), 'AUTO test kiem kho']);
	}
	const kq = await nhapExcel(page, dong, file);
	expect(kq, `Nhập Excel toàn kho có dòng bị bỏ qua: ${kq}`).toContain(`Đã nhập ${dong.length}/${dong.length} dòng`);
	return dong;
}

module.exports = { vaoPhieuCuaToi, COT_MAU, taiMau, nhapExcel, demToanKhoExcel, demToanKho, moTongHop, phienMo, chiTietPhien, moPhien, themPhieu, dongSp, themSp, demLo, chonLyDo, huyPhien };
