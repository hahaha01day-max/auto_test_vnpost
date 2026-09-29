'use strict';

/**
 * Dựng file Excel cho case nạp tồn đầu kỳ.
 *
 * 🔴 🚫 KHÔNG tự bịa cấu trúc cột. Cách làm ở đây: **tải chính tệp mẫu của sản phẩm**
 * (`GET /opening-balance/template`) rồi sửa lại trên bản đó. Bịa cột là file bị backend loại cả
 * tệp, thông báo lỗi không nói thiếu cột nào, và mất cả buổi để lần — bẫy đã trả giá ở phân hệ 01.
 */

const ExcelJS = require('exceljs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const THU_MUC = path.join(os.tmpdir(), 'vnpost-auto-test-04-2');

function bảođảmThưMục() {
	if (!fs.existsSync(THU_MUC)) fs.mkdirSync(THU_MUC, { recursive: true });
	return THU_MUC;
}

/**
 * Tải tệp mẫu. Trả về đường dẫn tệp đã lưu.
 *
 * 🔴 Nút **"Tải mẫu excel" ở vùng extra của màn KHÔNG tải gì** — đo 20/09/2026: nó chỉ
 * `setOpenDrawer(true)`, y hệt nút "Khai báo tồn đầu kỳ" bên cạnh (`OpeningBalancePage.jsx:592`).
 * Nút tải thật nằm ở **bước 1 bên trong drawer**. Bám nút ngoài màn là chờ `download` tới hết
 * timeout rồi tưởng sản phẩm hỏng.
 *
 * 🔴 Phải `click({ force: true })`: một `.ant-alert` hướng dẫn nằm đè lên vùng nút, Playwright
 * báo "subtree intercepts pointer events" và thử lại tới hết timeout.
 */
/**
 * Bản xem trước của lượt trước còn trên server ⇒ drawer mở thẳng vào bước xem trước, 🚫 không có
 * ô chọn tệp. Huỷ nó bằng đúng lối của người dùng ("Tải lên file excel mới" → xác nhận).
 *
 * 🔴 Chỉ an toàn vì vai `seed_shop2` là điểm bán seed DÀNH RIÊNG cho auto test — bản xem trước ở
 *    đây chỉ có thể là của chính bộ test. `chanGhiTon` chặn `DELETE previews/{id}`, nên mở tạm
 *    đúng request đó (route đăng ký sau được xét trước).
 */
async function huyXemTruocDangDo(page, dr) {
	const nut = dr.getByRole('button', { name: 'Tải lên file excel mới' }).first();
	if ((await nut.count()) === 0) return;
	const moCho = async (route) => {
		const q = route.request();
		if (q.method() === 'DELETE' && /\/previews\/[^/]+(\?|$)/.test(q.url())) return route.continue();
		return route.fallback();
	};
	await page.route('**/opening-balance/**', moCho);
	try {
		await nut.click();
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Tải lên file excel mới?' });
		await hop.waitFor({ state: 'visible', timeout: 15_000 });
		const cho = page.waitForResponse((r) => r.request().method() === 'DELETE' && /\/previews\//.test(r.url()), { timeout: 30_000 });
		await hop.getByRole('button', { name: /OK|Đồng ý|Xác nhận/ }).click();
		await cho;
		await dr.locator('input[type="file"]').first().waitFor({ state: 'attached', timeout: 20_000 });
	} finally {
		await page.unroute('**/opening-balance/**', moCho);
	}
}

let tepMauDaTai = null;

async function taiTepMau(page) {
	bảođảmThưMục();
	// 🔴 Dùng lại tệp đã tải trong cùng lượt chạy. Lý do KHÔNG chỉ là tiết kiệm: khi điểm bán đã
	//    có bản xem trước, drawer mở thẳng vào bước xem trước và **bước 1 (nút Tải mẫu) không còn
	//    trên màn** ⇒ test sau sẽ đỏ với "click timeout" mà chẳng liên quan gì tới điều nó kiểm.
	if (tepMauDaTai && fs.existsSync(tepMauDaTai)) return tepMauDaTai;

	const dr = await moDrawerKhaiBao(page);
	let nut = dr.getByRole('button', { name: 'Tải mẫu excel' });
	if ((await nut.count()) === 0) {
		await huyXemTruocDangDo(page, dr);
		nut = dr.getByRole('button', { name: 'Tải mẫu excel' });
	}
	if ((await nut.count()) === 0) {
		throw new Error(
			'Drawer không có nút "Tải mẫu excel" ở bước 1 — điểm bán này đang có bản xem trước dở ' +
				'nên drawer mở thẳng vào bước sau. Dọn bản xem trước trước khi chạy, hoặc dùng điểm bán test.',
		);
	}

	const cho = page.waitForEvent('download', { timeout: 60_000 });
	await nut.first().click({ force: true });
	const tai = await cho;
	const dich = path.join(THU_MUC, tai.suggestedFilename() || 'mau-ton-dau-ky.xlsx');
	await tai.saveAs(dich);
	tepMauDaTai = dich;
	return dich;
}

/** Mở drawer "Nhập tồn kho đầu kỳ" (tiêu đề drawer khác nhãn nút). */
async function moDrawerKhaiBao(page) {
	const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	if (await dr.count()) {
		const tieuDe = await dr.locator('.ant-drawer-title, .ant-modal-title').innerText().catch(() => '');
		if (/Nhập tồn kho đầu kỳ/.test(tieuDe)) return dr;
	}
	await page.getByRole('button', { name: 'Khai báo tồn đầu kỳ' }).click({ force: true });
	const moi = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	await moi.waitFor({ state: 'visible', timeout: 20_000 });
	await page.waitForTimeout(1_500);
	return moi;
}

/** Đọc tiêu đề cột của tệp mẫu — dùng để đối chiếu với tài liệu, 🚫 không để đoán. */
async function docTieuDe(duongDan) {
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.readFile(duongDan);
	const ws = wb.worksheets[0];
	const out = [];
	for (let r = 1; r <= Math.min(ws.rowCount, 10); r += 1) {
		const hang = ws.getRow(r);
		const oData = [];
		hang.eachCell({ includeEmpty: false }, (cell) => oData.push(String(cell.value ?? '').trim()));
		if (oData.length >= 5) return { dong: r, tieuDe: oData, ws, wb };
		out.push(oData);
	}
	return { dong: null, tieuDe: [], ws, wb };
}

/**
 * Tạo một bản sao của tệp mẫu, thêm đúng một dòng dữ liệu.
 * `giaTri` là map `<tên cột>` → giá trị; cột không khai thì để trống.
 */
async function themMotDong(duongDanMau, giaTri, tenFile = 'ton-dau-ky.xlsx') {
	const { dong, tieuDe, ws, wb } = await docTieuDe(duongDanMau);
	if (!dong) throw new Error(`Không tìm được dòng tiêu đề trong tệp mẫu ${duongDanMau}`);

	const viTri = new Map();
	ws.getRow(dong).eachCell({ includeEmpty: false }, (cell, col) => {
		viTri.set(String(cell.value ?? '').trim(), col);
	});

	const hangMoi = ws.getRow(dong + 1);
	for (const [ten, gt] of Object.entries(giaTri)) {
		const col = [...viTri.entries()].find(([k]) =>
			k.toLowerCase().includes(ten.toLowerCase()),
		)?.[1];
		if (!col) continue;
		hangMoi.getCell(col).value = gt;
	}
	hangMoi.commit();

	const dich = path.join(bảođảmThưMục(), tenFile);
	await wb.xlsx.writeFile(dich);
	return { duongDan: dich, tieuDe };
}

/** File sai định dạng (.txt) để kiểm phép chặn `accept`. */
function taoFileSaiDinhDang(tenFile = 'khong-phai-excel.txt') {
	const dich = path.join(bảođảmThưMục(), tenFile);
	fs.writeFileSync(dich, 'Đây không phải file Excel.');
	return dich;
}

/** File .xlsx RỖNG (chỉ có tiêu đề, không dòng dữ liệu nào). */
async function taoFileRong(duongDanMau, tenFile = 'ton-dau-ky-rong.xlsx') {
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.readFile(duongDanMau);
	const dich = path.join(bảođảmThưMục(), tenFile);
	await wb.xlsx.writeFile(dich);
	return dich;
}

/**
 * Như `themMotDong` nhưng ghi NHIỀU dòng liên tiếp (mỗi phần tử của `dsGiaTri` là một dòng).
 * Dùng cho case cần bản xem trước nhiều dòng: tìm kiếm, phân trang, xoá dòng lỗi.
 */
async function themNhieuDong(duongDanMau, dsGiaTri, tenFile = 'ton-dau-ky-nhieu-dong.xlsx') {
	const { dong, tieuDe, ws, wb } = await docTieuDe(duongDanMau);
	if (!dong) throw new Error(`Không tìm được dòng tiêu đề trong tệp mẫu ${duongDanMau}`);
	const viTri = new Map();
	ws.getRow(dong).eachCell({ includeEmpty: false }, (cell, col) => {
		viTri.set(String(cell.value ?? '').trim(), col);
	});
	dsGiaTri.forEach((giaTri, k) => {
		const hang = ws.getRow(dong + 1 + k);
		for (const [ten, gt] of Object.entries(giaTri)) {
			const col = [...viTri.entries()].find(([x]) => x.toLowerCase().includes(ten.toLowerCase()))?.[1];
			if (col) hang.getCell(col).value = gt;
		}
		hang.commit();
	});
	const dich = path.join(bảođảmThưMục(), tenFile);
	await wb.xlsx.writeFile(dich);
	return { duongDan: dich, tieuDe };
}

module.exports = {
	huyXemTruocDangDo,
	themNhieuDong,
	THU_MUC,
	moDrawerKhaiBao,
	docTieuDe,
	taiTepMau,
	taoFileRong,
	taoFileSaiDinhDang,
	themMotDong,
};
