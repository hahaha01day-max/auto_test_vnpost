'use strict';

/**
 * 19 · Nhập khách hàng từ Excel — vai `shop` (CHT) đúng kịch bản.
 *
 * 28/09/2026: user chạy `.claude/sql/update_product/2026-09-28_authen_cht_cong_no_nhap_excel_khach.sql` ⇒ CHT có chức năng
 *    `IMPORT_EXCEL_CUSTOMER` (trước chỉ CORP_ADMIN nên spec tạm chạy vai tct — file cũ `nhap-excel.tct.spec.js`).
 * 🔴 GHI THẬT: tạo 2 khách rác `A<làn>KH19…`, xoá lại ở cuối.
 *
 * Trace `pages/customer/components/DrawerImportCustomer.jsx` + `components/importExcelDrawer/DrawerImportBase.jsx`:
 * drawer "Nhập khách hàng từ file excel" · tab "Nhập file" / "Lịch sử nhập" · nút "Xác nhận nhập" ·
 * `POST /import/api/v1/customer/excel` (multipart `file`, `stopOnError`) · poll `GET …/customer/status?jobId=` 3s ·
 * modal "Import thành công" / "Import hoàn tất, có dữ liệu lỗi" / "Import thất bại" ·
 * lịch sử `GET …/customer/history`, "Tải file lỗi" = `GET …/customer/error-file?jobId=` (blob).
 * Tệp mẫu `vnpost-web/public/files/KhachHang_Import.xlsx` (sheet "Khach hang", 27 cột, hàng 1 là tiêu đề).
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chuan, khung, moMan } = require('./customer-page');
const g = require('./khach-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const MAU = path.join(__dirname, '..', '..', '..', '..', 'vnpost-web', 'public', 'files', 'KhachHang_Import.xlsx');
const SO = path.join(GOC, 'test-output', `nhap-excel.lane${g.LAN}.json`);
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

/**
 * Tệp nhập từ khuôn mẫu: 2 dòng hợp lệ + 2 dòng lỗi — THIẾU TÊN (cột bắt buộc) và MÃ 1 KÝ TỰ
 * (sheet "Huong dan": mã tối thiểu 2 ký tự) ⇒ kỳ vọng 4 / 2 / 2.
 */
async function taoTep(duong) {
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.readFile(MAU);
	const ws = wb.getWorksheet('Khach hang');
	for (let r = ws.rowCount; r >= 2; r -= 1) ws.spliceRows(r, 1);
	const a = g.khachMoi('IMP1');
	// 🔴 Mã không được chứa nhau (tìm theo mã là tìm CHỨA): chèn chữ sau tiền tố, 🚫 không nối đuôi.
	const b = { ma: a.ma.replace(g.TIEN_TO, `${g.TIEN_TO}B`), sdt: `08${a.sdt.slice(2)}` };
	const loi = { ma: a.ma.replace(g.TIEN_TO, `${g.TIEN_TO}L`) };
	ws.addRow([1, a.ma, a.ten, a.sdt]);
	ws.addRow([1, b.ma, `${b.ma} AUTO TEST KHONG DUNG IMP2`, b.sdt]);
	ws.addRow([1, loi.ma, null, '0911111111']);
	const ngan = `${a.ma} MA NGAN AUTO TEST KHONG DUNG`;
	ws.addRow([1, 'Z', ngan, '0911111112']);
	await wb.xlsx.writeFile(duong);
	return { tot: [a.ma, b.ma], loi: loi.ma, ngan };
}

// 🚫 Không serial: 100_002 đọc lần nhập gần nhất ở tab Lịch sử, không cần 100_001 xanh.

test.describe('19 · Nhập khách từ Excel (vai tct, GHI THẬT)', () => {
	let st;
	test.beforeEach(async ({ page }) => {
		st = g.k.batHeader(page);
		await moMan(page, VAI);
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	});

	test('19_100_001 — Nhập khách hàng từ Excel chạy nền và báo kết quả', async ({ page }, info) => {
		chanNeuTat('19_100_001');
		test.setTimeout(240_000);
		fs.mkdirSync(info.outputDir, { recursive: true });
		const tep = path.join(info.outputDir, 'khach-nhap.xlsx');
		const du = await taoTep(tep);
		fs.writeFileSync(SO, JSON.stringify(du, null, 2));
		try {
			await khung(page).getByRole('button', { name: /Nhập Excel/ }).click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Nhập khách hàng từ file excel' }).last();
			await expect(dr).toBeVisible({ timeout: 15_000 });
			await expect(dr.getByText('Tải về file mẫu')).toBeVisible();
			await dr.locator('input[type="file"]').first().setInputFiles(tep);
			const gui = page.waitForResponse((r) => /import\/api\/v1\/customer\/excel/.test(r.url()), { timeout: 60_000 });
			await dr.getByRole('button', { name: 'Xác nhận nhập' }).click();
			const r = await gui;
			const b = await r.json().catch(() => ({}));
			ghiChu('gửi tệp', `${r.status()} ${JSON.stringify(b?.status)} jobId=${b?.data?.jobId ?? b?.data}`);
			expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
			// 🔴 Kết quả là <Result> TRONG drawer (không phải dialog); lô thành công hết thì drawer tự đóng, chỉ còn
			//    toast "Nhập file Excel thành công" ⇒ đọc số dòng từ response poll `customer/status`.
			let job = null;
			page.on('response', async (x) => {
				if (!/import\/api\/v1\/customer\/status/.test(x.url())) return;
				const d = (await x.json().catch(() => ({})))?.data;
				if (d) job = d;
			});
			await expect
				.poll(() => job?.status, { timeout: 180_000, message: 'Job nhập không tới trạng thái cuối (SUCCESS/FAILED) sau 3 phút' })
				.toMatch(/SUCCESS|FAILED/);
			await page.waitForTimeout(1_500);
			const tieuDe = chuan(await dr.locator('.ant-result-title').innerText().catch(() => ''));
			const tb = await g.thongBao(page, { cho: 3_000 });
			ghiChu('job', JSON.stringify({ status: job.status, total: job.totalRecords, ok: job.totalSuccess, loi: job.totalFailed }));
			ghiChu('màn kết quả', `${tieuDe || '(drawer đã đóng)'} · ${tb}`);
			expect(Number(job.totalRecords), 'Tổng số dòng').toBe(4);
			expect(Number(job.totalFailed), `Không đủ 2 dòng lỗi (thiếu tên + mã 1 ký tự) — kết quả "${tieuDe || tb}"`).toBe(2);
			expect(Number(job.totalSuccess)).toBe(2);
			expect(tieuDe).toBe('Import hoàn tất, có dữ liệu lỗi');
			for (const ma of du.tot) {
				await expect.poll(async () => (await g.timApi(page, st, ma)).length, { timeout: 30_000, message: `Dòng hợp lệ ${ma} không thành khách` }).toBe(1);
			}
			expect(await g.timApi(page, st, du.loi), 'Dòng THIẾU TÊN vẫn thành khách hàng').toHaveLength(0);
			expect(await g.timApi(page, st, du.ngan), 'Dòng MÃ 1 KÝ TỰ vẫn thành khách hàng').toHaveLength(0);
		} finally {
			// 🔴 Dọn theo id lấy bằng SELECT: nếu dòng thiếu tên lọt vào, API tìm kiếm cấp chuỗi trả 500.
			for (const ma of [...du.tot, du.loi]) {
				for (const id of g.idTheoMaDb(ma)) {
					const b = await g.xoaKhachApi(page, st, id);
					ghiChu('dọn khách', `${ma} ${id} → ${JSON.stringify(b?.status)}`);
				}
			}
		}
	});

	test('19_100_002 — Tải được file lỗi của lần nhập có dòng sai', async ({ page }, info) => {
		chanNeuTat('19_100_002');
		const du = fs.existsSync(SO) ? JSON.parse(fs.readFileSync(SO, 'utf8')) : null;
		test.skip(!du, 'Chưa có lần nhập tiền đề (19_100_001).');
		await khung(page).getByRole('button', { name: /Nhập Excel/ }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Nhập khách hàng từ file excel' }).last();
		await expect(dr).toBeVisible({ timeout: 15_000 });
		const cho = page.waitForResponse((r) => /import\/api\/v1\/customer\/history/.test(r.url()), { timeout: 30_000 });
		await dr.locator('.ant-tabs-tab', { hasText: 'Lịch sử nhập' }).locator('.ant-tabs-tab-btn').dispatchEvent('click');
		await cho;
		await page.waitForTimeout(1_500);
		const dong = dr.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').first();
		await expect(dong).toBeVisible({ timeout: 15_000 });
		ghiChu('dòng lịch sử mới nhất', chuan(await dong.innerText()));
		const nut = dong.getByRole('button', { name: /Tải file lỗi/ });
		// 🔴 FE chỉ bật nút khi trạng thái job = FAILED (DrawerImportBase.jsx:301); job có dòng lỗi mà BE báo
		//    SUCCESS là nút khoá — người dùng không lấy được danh sách dòng lỗi.
		await expect(nut, `Lần nhập có dòng lỗi mà nút "Tải file lỗi" bị khoá. Dòng lịch sử: ${chuan(await dong.innerText())}`).toBeEnabled({ timeout: 5_000 });
		const tai = page.waitForEvent('download', { timeout: 30_000 });
		await nut.click();
		const d = await tai;
		const duong = path.join(info.outputDir, d.suggestedFilename());
		await d.saveAs(duong);
		ghiChu('tệp', d.suggestedFilename());
		const wb = new ExcelJS.Workbook();
		await wb.xlsx.readFile(duong);
		const chu = [];
		wb.eachSheet((ws) => ws.eachRow((r) => chu.push((r.values || []).join(' | '))));
		ghiChu('nội dung', chu.slice(0, 6).join(' // '));
		const tong = chu.join('\n');
		expect(tong, 'File lỗi không có dòng mã 1 ký tự').toContain(du.ngan);
		expect(tong, 'File lỗi không có dòng thiếu tên').toContain(du.loi);
		for (const ma of du.tot) expect(tong, `File lỗi lẫn dòng hợp lệ ${ma}`).not.toContain(ma);
	});
});
