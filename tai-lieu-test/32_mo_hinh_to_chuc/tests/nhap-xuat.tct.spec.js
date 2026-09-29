'use strict';

/**
 * 32_150 · Nhập / xuất Excel mô hình tổ chức, vai `tct`.
 * Nhập: drawer "Nhập mô hình tổ chức từ file excel" (DrawerImportBase: accept .xlsx/.xls — sai đuôi báo "<tên> không đúng định dạng file";
 *   nút "Xác nhận nhập"; POST `/import/api/v1/org-units/excel` ⇒ jobId, poll `/status`; xong: "Nhập file Excel thành công" hoặc
 *   "Có N dòng dữ liệu không hợp lệ. Vui lòng tải file lỗi…"). Tệp dựng từ mẫu `vnpost-web/public/files/MoHinhToChuc_Import.xlsx`
 *   (sheet DonViToChuc: Ma don vi · Ten don vi · Loai don vi · Don vi cha · Trang thai …; mã xã phải bắt đầu bằng mã cha).
 *   🔴 Chỉ nhập nút RÁC `A7MH32I*`, dọn ở finally.
 * Xuất: nút "Xuất excel" ⇒ drawer "Xuất excel mô hình tổ chức" (lọc Tên hoặc mã đơn vị · Cấp tổ chức · Mã đơn vị cha · Trạng thái;
 *   nút "Xuất file excel" ⇒ GET `export/task/organization-unit`, toast "Đã tạo yêu cầu xuất mô hình tổ chức"; bảng lịch sử có nút tải).
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const o = require('./org-ghi');

const GOC = path.join(__dirname, '..');
const MAU = '/Users/tungnguyen/project/java/vnpost/vnpost-web/public/files/MoHinhToChuc_Import.xlsx';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

async function mo(page) {
	const st = o.k.batHeader(page);
	await o.moMan(page, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	return { page, st };
}
/** Dựng tệp nhập: header của mẫu + các dòng [ma, ten, loai, cha, trangThai]. */
async function tepNhap(ten, dong) {
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.readFile(MAU);
	const ws = wb.getWorksheet('DonViToChuc');
	ws.spliceRows(2, ws.rowCount - 1);
	for (const d of dong) ws.addRow(d);
	const f = test.info().outputPath(ten);
	await wb.xlsx.writeFile(f);
	return f;
}
/** Mở drawer nhập, chọn tệp, bấm "Xác nhận nhập", chờ kết quả job. */
async function nhap(page, tep) {
	await o.khung(page).getByRole('button', { name: 'Nhập từ excel' }).click();
	const dr = o.drawer(page, 'Nhập mô hình tổ chức từ file excel');
	await expect(dr).toBeVisible({ timeout: 10_000 });
	const trangThai = [];
	page.on('response', async (r) => { if (/org-units\/(excel|status)/.test(r.url())) trangThai.push(`${r.url().split('org-units/')[1].split('?')[0]}:${JSON.stringify((await r.json().catch(() => ({})))?.data?.status ?? (await r.json().catch(() => ({})))?.status?.code)}`); });
	await dr.locator('input[type=file]').setInputFiles(tep);
	await page.waitForTimeout(1_500);
	const tbChon = await o.thongBao(page);
	await dr.getByRole('button', { name: 'Xác nhận nhập' }).click().catch(() => null);
	const ketQua = page.locator('.ant-message-notice').filter({ hasText: /Nhập file Excel thành công|không hợp lệ|lỗi|Vui lòng/i }).last();
	await ketQua.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => null);
	await page.waitForTimeout(1_500);
	return { dr, tbChon, tb: await o.thongBao(page), trangThai };
}

test.describe('32_150 · Nhập / xuất Excel mô hình tổ chức (vai tct)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('32_150_001 — Nhập Excel hợp lệ tạo hàng loạt đơn vị', async ({ page }) => {
		chanNeuTat('32_150_001');
		const ps = await mo(page);
		const tinh = `${o.TIEN_TO}I${o.tsNgan()}`;
		const xa = `${tinh}01`;
		try {
			const tep = await tepNhap('hop-le.xlsx', [
				[tinh, `${o.TIEN_TO} Tỉnh nhập ${tinh.slice(-6)}`, 'Buu dien tinh', o.VNPOST, 'Hoat dong'],
				[xa, `${o.TIEN_TO} Xã nhập ${tinh.slice(-6)}`, 'Buu dien xa', tinh, 'Hoat dong'],
			]);
			const kq = await nhap(page, tep);
			const a = o.dbDv(tinh);
			const b = o.dbDv(xa);
			ghiChu('đo', `tb "${kq.tb}" · job ${kq.trangThai.join(' ')} · tỉnh ${JSON.stringify(a)} · xã ${JSON.stringify(b)}`);
			expect(kq.tb).toContain('Nhập file Excel thành công');
			expect(a && [a.loai, a.cha, a.xoa]).toEqual(['BUU_DIEN_TINH', o.VNPOST, false]);
			expect(b && [b.loai, b.cha, b.xoa]).toEqual(['BUU_DIEN_XA', tinh, false]);
		} finally {
			for (const m of [xa, tinh]) if (o.conSong(m)) ghiChu('dọn', await o.xoaDvApi(ps, m));
		}
	});

	test('32_150_002 — Nhập tệp sai định dạng', async ({ page }) => {
		chanNeuTat('32_150_002');
		await mo(page);
		const f = test.info().outputPath('sai-dinh-dang.txt');
		fs.writeFileSync(f, 'Ma don vi,Ten don vi\nA7MH32ZZ,rác');
		const goi = [];
		page.on('request', (r) => { if (r.url().includes('org-units/excel')) goi.push(r.method()); });
		const kq = await nhap(page, f);
		ghiChu('nguyên văn', `khi chọn tệp: "${kq.tbChon}" · sau: "${kq.tb}" · request nhập ${goi.length}`);
		expect(goi, 'Tệp .txt vẫn được gửi lên nhập').toEqual([]);
		expect(`${kq.tbChon} ${kq.tb}`).toMatch(/không đúng định dạng file|Vui lòng chọn file excel/);
	});

	test('32_150_003 — Nhập Excel có dòng mã đơn vị trùng', async ({ page }) => {
		chanNeuTat('32_150_003');
		const ps = await mo(page);
		// 🔴 Đích trùng mã là TỈNH RÁC tạo sẵn — 25/09 dùng AUTO7_T thì nhập GHI ĐÈ tên tỉnh của làn (đã khôi phục).
		const r = await o.taoNhanhRac(ps, 0);
		const tinh = `${o.TIEN_TO}I${o.tsNgan()}`;
		try {
			const tep = await tepNhap('trung-ma.xlsx', [
				[r.tinh, `${o.TIEN_TO} GHI ĐÈ TÊN`, 'Buu dien tinh', o.VNPOST, 'Hoat dong'],
				[tinh, `${o.TIEN_TO} Tỉnh nhập hợp lệ`, 'Buu dien tinh', o.VNPOST, 'Hoat dong'],
			]);
			const kq = await nhap(page, tep);
			const cu = o.dbDv(r.tinh);
			ghiChu('hành vi thật', `tb "${kq.tb}" · job ${kq.trangThai.join(' ')} · đơn vị có sẵn tên "${cu.ten}" (gốc "${r.tenTinh}") · dòng hợp lệ ${o.conSong(tinh) ? 'ĐƯỢC tạo' : 'KHÔNG tạo'} · nút tải file lỗi: ${await kq.dr.getByRole('button', { name: /Tải file lỗi/ }).count()}`);
			expect(cu.ten, 'Nhập trùng mã GHI ĐÈ đơn vị có sẵn (không báo trùng)').toBe(r.tenTinh);
			expect(kq.tb, 'Không báo dòng trùng mã').toMatch(/không hợp lệ|trùng|tồn tại/i);
		} finally {
			for (const m of [tinh, r.tinh]) if (o.conSong(m)) ghiChu('dọn', await o.xoaDvApi(ps, m));
		}
	});

	test('32_150_004 — Nhập Excel có Đơn vị cha không tồn tại', async ({ page }) => {
		chanNeuTat('32_150_004');
		const ps = await mo(page);
		const ma = `${o.TIEN_TO}IX${o.tsNgan()}`;
		try {
			const tep = await tepNhap('cha-sai.xlsx', [[ma, `${o.TIEN_TO} Xã mồ côi`, 'Buu dien xa', `${o.TIEN_TO}KHONGCO`, 'Hoat dong']]);
			const kq = await nhap(page, tep);
			ghiChu('đo', `tb "${kq.tb}" · job ${kq.trangThai.join(' ')} · DB ${JSON.stringify(o.dbDv(ma))}`);
			expect(o.conSong(ma), 'Tạo đơn vị MỒ CÔI (cha không tồn tại)').toBe(false);
			expect(kq.tb).toMatch(/không hợp lệ|lỗi/i);
		} finally {
			if (o.conSong(ma)) ghiChu('dọn', await o.xoaDvApi(ps, ma));
		}
	});

	test('32_150_005 — Nhập Excel rỗng chỉ có dòng tiêu đề', async ({ page }) => {
		chanNeuTat('32_150_005');
		await mo(page);
		const truoc = o.g.selectDb("SELECT COUNT(*) FROM VNPOST_CORE.ORGANIZATION_UNIT WHERE chain_id=626 AND is_deleted=0")[0][0];
		const tep = await tepNhap('rong.xlsx', []);
		const kq = await nhap(page, tep);
		const sau = o.g.selectDb("SELECT COUNT(*) FROM VNPOST_CORE.ORGANIZATION_UNIT WHERE chain_id=626 AND is_deleted=0")[0][0];
		ghiChu('nguyên văn', `tb "${kq.tb}" · job ${kq.trangThai.join(' ')} · số đơn vị ${truoc} → ${sau}`);
		expect(sau).toBe(truoc);
		expect(kq.tb, 'Tệp rỗng mà báo "thành công" / không báo rõ tệp không có dữ liệu').toMatch(/không có dữ liệu|trống|rỗng|không hợp lệ/i);
	});

	/** Mở drawer xuất, lọc (tuỳ chọn), bấm "Xuất file excel", chờ dòng lịch sử mới rồi tải về. */
	async function xuat(page, { ten = null } = {}) {
		await o.khung(page).getByRole('button', { name: 'Xuất excel' }).click();
		const dr = o.drawer(page, 'Xuất excel mô hình tổ chức');
		await expect(dr).toBeVisible({ timeout: 10_000 });
		await page.waitForTimeout(1_500);
		const dau = o.chuan(await dr.locator('.ant-table-tbody tr.ant-table-row').first().innerText().catch(() => ''));
		if (ten) await dr.locator('input#name').fill(ten);
		await dr.getByRole('button', { name: 'Xuất file excel' }).click();
		await page.waitForTimeout(1_500);
		const tb = await o.thongBao(page);
		let dong = dau;
		for (let i = 0; i < 20 && dong === dau; i += 1) {
			await page.waitForTimeout(3_000);
			await dr.getByRole('button', { name: /Làm mới|reload/i }).first().click().catch(() => null);
			dong = o.chuan(await dr.locator('.ant-table-tbody tr.ant-table-row').first().innerText().catch(() => ''));
		}
		const tai = page.waitForEvent('download', { timeout: 60_000 }).catch(() => null);
		await dr.locator('.ant-table-tbody tr.ant-table-row').first().getByRole('button').last().click().catch(() => null);
		const d = await tai;
		const hang = [];
		if (d) {
			const wb = new ExcelJS.Workbook();
			await wb.xlsx.readFile(await d.path());
			wb.worksheets[0].eachRow((r) => hang.push(r.values.slice(1).map((x) => o.chuan(String(x?.richText ? x.richText.map((t) => t.text).join('') : x ?? '')))));
		}
		return { tb, dong, ten: d?.suggestedFilename(), hang };
	}

	test('32_150_006 — Xuất Excel danh sách toàn bộ đơn vị', async ({ page }) => {
		chanNeuTat('32_150_006');
		await mo(page);
		const kq = await xuat(page);
		const ma = new Set(kq.hang.slice(1).map((h) => h[0]));
		const soDb = Number(o.g.selectDb("SELECT COUNT(*) FROM VNPOST_CORE.ORGANIZATION_UNIT WHERE chain_id=626 AND is_deleted=0 AND unit_type<>'DIEM_BAN'")[0][0]);
		const soDbAll = Number(o.g.selectDb("SELECT COUNT(*) FROM VNPOST_CORE.ORGANIZATION_UNIT WHERE chain_id=626 AND is_deleted=0")[0][0]);
		ghiChu('đo', `tb "${kq.tb}" · dòng lịch sử "${kq.dong.slice(0, 120)}" · tệp ${kq.ten} · ${kq.hang.length - 1} dòng dữ liệu · header ${JSON.stringify(kq.hang[0])} · DB ${soDb} (không kể điểm bán) / ${soDbAll}`);
		expect(kq.tb).toContain('Đã tạo yêu cầu xuất mô hình tổ chức');
		expect(kq.ten, 'Không tải được tệp xuất').toBeTruthy();
		for (const m of [o.VNPOST, 'AUTO7_T', 'AUTO7_T_01']) expect(ma.has(m), `Tệp xuất thiếu đơn vị ${m}`).toBe(true);
		expect([soDb, soDbAll], `Số dòng tệp (${kq.hang.length - 1}) không bằng số đơn vị trên cây`).toContain(kq.hang.length - 1);
	});

	test('32_150_007 — Xuất Excel khi chưa có đơn vị nào', async ({ page }) => {
		chanNeuTat('32_150_007');
		await mo(page);
		const kq = await xuat(page, { ten: 'ZZZ_KHONG_CO_DON_VI_32' });
		ghiChu('hành vi thật', `tb "${kq.tb}" · tệp ${kq.ten ?? '(không có)'} · ${kq.hang.length} dòng (kể header) · header ${JSON.stringify(kq.hang[0] ?? null)}`);
		expect(kq.tb, 'Xuất ở phạm vi rỗng báo lỗi kỹ thuật').not.toMatch(/Không thể tạo yêu cầu|lỗi/i);
		if (kq.ten) expect(kq.hang.length, 'Phạm vi rỗng mà tệp có dữ liệu').toBeLessThanOrEqual(1);
	});
});
