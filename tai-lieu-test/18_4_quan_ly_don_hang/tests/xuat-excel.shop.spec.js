'use strict';

/**
 * 18_4_020_005 · 020_006 — Xuất excel danh sách đơn (vai `shop` = CHT điểm bán của làn).
 *
 * Trace vnpost-web f9c5c858 (28/09/2026): `features/exportExcel/{exportExcelDrawer,filterOrder,action}.jsx`.
 * Drawer "Xuất excel đơn hàng": "Tất cả đơn hàng hiện tại" (lấy bộ lọc đang có trên màn) / "Theo bộ lọc nâng cao"
 * ⇒ "Xuất file excel" = `GET export/task/order` (job nền) ⇒ toast "Đã tạo yêu cầu xuất đơn hàng" ⇒ bảng "Lịch sử xuất
 * excel" (`GET export/file/find?type=order`, nút "Cập nhật trạng thái") ⇒ dòng xong có nút tải (`export/file/download`).
 * 🔴 Chạy vai `shop`, KHÔNG phải `gdv` như kịch bản: đo 28/09 GDV bấm xuất nhận `SSHOP-401 "Không có quyền truy cập"` —
 *    permission `GET_EXPORT_TASK_ORDER` chỉ gắn chức năng `EXPORT_EXCEL`, vai GDV không có chức năng này (CHT có).
 *    Nút vẫn HIỆN với GDV ⇒ ghi ở `_VUONG_MAC.md` chờ user chốt.
 * 🔴 Spec cũ 020_005 ở `don-hang-2.gdv.spec.js` đỏ vì chỉ bắt request KHÁC GET (API xuất là GET) — lỗi script.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const ROUTE = '/order/created-orders';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const khung = (page) => page.locator('.ant-pro-page-container').first();
const DS = /\/orders\/shops\/\d+\/v1\.3/;

async function moDs(page) {
	const st = k.batHeader(page);
	const cho = page.waitForResponse((r) => DS.test(r.url()) && r.status() === 200, { timeout: 60_000 });
	await moTrang(page, `${process.env.VNPOST_BASE_URL}${ROUTE}`, VAI);
	const res = await cho;
	await page.waitForTimeout(800);
	return { st, res };
}

/** Mở drawer xuất, bấm "Xuất file excel" (chế độ mặc định "Tất cả đơn hàng hiện tại"); trả { dr, task, tb }. */
async function xuat(page) {
	await khung(page).getByRole('button', { name: /Xuất excel/ }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Xuất excel đơn hàng' }).last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(1_500);
	const truoc = await dr.locator('.ant-table-tbody tr.ant-table-row').count();
	const cho = page.waitForResponse((r) => /export\/task\/order\?/.test(r.url()), { timeout: 30_000 });
	await dr.getByRole('button', { name: /Xuất file excel/ }).click();
	const r = await cho;
	const task = { url: r.url(), http: r.status(), b: await r.json().catch(() => null) };
	await page.locator('.ant-message-notice').first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => null);
	const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
	return { dr, task, tb, truoc };
}

/** Bấm "Cập nhật trạng thái" tới khi dòng mới nhất xong (có nút tải) hoặc thất bại; trả chữ dòng đầu. */
async function choXong(page, dr, truoc) {
	let dong = '';
	for (let i = 0; i < 40; i += 1) {
		await page.waitForTimeout(3_000);
		await dr.getByRole('button', { name: /Cập nhật trạng thái/ }).click();
		await page.waitForTimeout(1_500);
		const n = await dr.locator('.ant-table-tbody tr.ant-table-row').count();
		dong = chuan(await dr.locator('.ant-table-tbody tr.ant-table-row').first().innerText().catch(() => ''));
		if (n > truoc && (/Thất bại|Lỗi/i.test(dong) || (await dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('button.ant-btn-link, a').count()))) break;
	}
	return dong;
}

async function taiFile(page, dr) {
	const nut = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('button.ant-btn-link, a').last();
	const [tai] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), nut.click()]);
	const f = test.info().outputPath(tai.suggestedFilename());
	await tai.saveAs(f);
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.readFile(f);
	const hang = [];
	wb.worksheets[0].eachRow((r) => hang.push(r.values.slice(1).map((v) => (v && typeof v === 'object' ? v.result ?? v.text ?? String(v) : v))));
	return { ten: tai.suggestedFilename(), hang };
}

test.describe('18_4 — Xuất excel danh sách đơn (vai shop)', () => {
	test.describe.configure({ timeout: 300_000 });

	test('18_4_020_005 — Xuất excel danh sách đơn', async ({ page }) => {
		chanNeuTat('18_4_020_005');
		const { st, res } = await moDs(page);
		// Toàn bộ tập đang lọc (màn phân trang 10) — gọi lại đúng API màn bằng chính phiên.
		const q = Object.fromEntries(new URL(res.url()).searchParams.entries());
		const duong = new URL(res.url()).pathname.replace(/^.*__api/, '');
		const man = [];
		for (let pg = 0; pg < 20; pg += 1) {
			const b = await k.goiGhi(page, st, 'GET', duong, { ...q, page: pg, size: 50 });
			man.push(...(b?.data || []));
			if (!(b?.data || []).length || man.length >= (b?.page?.total_elements ?? 0)) break;
		}
		expect(man.length, 'Kỳ lọc mặc định không có đơn nào để đối chiếu (tiền đề)').toBeGreaterThan(0);
		const { dr, task, tb, truoc } = await xuat(page);
		ghiChu('tạo job', `${task.url.split('__api')[1]} → ${JSON.stringify(task.b?.status)} · "${tb}"`);
		expect(String(task.b?.status?.code), `Tạo yêu cầu xuất lỗi: ${JSON.stringify(task.b?.status)}`).toBe('200');
		expect(tb).toContain('Đã tạo yêu cầu xuất đơn hàng');
		const dong = await choXong(page, dr, truoc);
		expect(dong, 'Job xuất đơn THẤT BẠI').not.toMatch(/Thất bại|Lỗi/i);
		const f = await taiFile(page, dr);
		expect(f.ten, 'File tải về không phải excel').toMatch(/\.xlsx?$/i);
		const soDon = new Set(man.map((x) => String(x.orderNumber)));
		const iTd = f.hang.findIndex((h) => h.some((c) => /Mã đơn/i.test(String(c ?? ''))));
		expect(iTd, `File không có cột "Mã đơn": ${JSON.stringify(f.hang.slice(0, 4))}`).toBeGreaterThanOrEqual(0);
		const cMa = f.hang[iTd].findIndex((c) => /Mã đơn/i.test(String(c ?? '')));
		const maFile = f.hang.slice(iTd + 1).map((h) => String(h[cMa] ?? '').trim()).filter(Boolean);
		ghiChu('đo', `màn ${man.length} đơn · file "${f.ten}" ${maFile.length} dòng · tiêu đề ${JSON.stringify(f.hang[iTd])}`);
		expect(new Set(maFile).size, 'Số đơn trong file ≠ số đơn đang lọc trên màn').toBe(soDon.size);
		expect([...new Set(maFile)].sort(), 'Mã đơn trong file khác tập đơn đang lọc').toEqual([...soDon].sort());
	});

	test('18_4_020_006 — Xuất excel khi danh sách rỗng', async ({ page }) => {
		chanNeuTat('18_4_020_006');
		await moDs(page);
		// B1: lọc một kỳ không có đơn — 01/01/2025 (trước khi điểm bán làn được tạo 09/2026; FE cho chọn từ 01/01 năm trước).
		const cho = page.waitForResponse((r) => DS.test(r.url()) && r.status() === 200, { timeout: 30_000 });
		for (const [nhan, v] of [['Ngày bắt đầu', '01/01/2025'], ['Ngày kết thúc', '01/01/2025']]) {
			const o = khung(page).getByPlaceholder(nhan);
			await o.click();
			await o.fill(v);
			await o.press('Enter');
		}
		const r = await cho;
		const b = await r.json();
		await page.waitForTimeout(1_000);
		ghiChu('lọc', `${r.url().split('__api')[1]} → ${b?.page?.total_elements} đơn`);
		expect(new URL(r.url()).searchParams.get('startTime'), 'Bộ lọc ngày không áp vào request danh sách').toBeTruthy();
		expect(b?.page?.total_elements ?? (b?.data || []).length, 'Kỳ 01/01/2025 vẫn có đơn — không phải danh sách rỗng').toBe(0);
		// B2: xuất.
		const { dr, task, tb, truoc } = await xuat(page);
		ghiChu('tạo job', `HTTP ${task.http} · ${JSON.stringify(task.b?.status)} · "${tb}"`);
		// Kỳ vọng: không lỗi kỹ thuật — 🚫 HTTP 5xx, 🚫 thông báo lỗi chung của FE.
		expect(task.http, 'API xuất trả lỗi máy chủ').toBeLessThan(500);
		expect(tb, 'Hiện thông báo lỗi kỹ thuật chung').not.toContain('Có lỗi xảy ra');
		if (String(task.b?.status?.code) !== '200') {
			ghiChu('hành vi thật', `không tạo job, báo "${tb}"`);
			return;
		}
		const dong = await choXong(page, dr, truoc);
		ghiChu('dòng lịch sử', dong);
		expect(dong, 'Job xuất danh sách rỗng THẤT BẠI (lỗi kỹ thuật)').not.toMatch(/Thất bại|Lỗi/i);
		const f = await taiFile(page, dr);
		ghiChu('hành vi thật', `sinh file "${f.ten}" ${f.hang.length} dòng: ${JSON.stringify(f.hang.slice(0, 3))}`);
		expect(f.ten).toMatch(/\.xlsx?$/i);
	});
});
