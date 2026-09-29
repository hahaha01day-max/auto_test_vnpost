'use strict';

/** 30 · Báo cáo hiệu quả CTKM, vai `shop` — các case CHỈ ĐỌC (dữ liệu phát sinh nằm ở `hieu-qua.gdv.spec.js`). 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { API, bang, chanGhi, chuan, dong, khung, loc, moMan, okHet, the, tomTat } = require('./ctkm-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const SAU_THE = ['Số chương trình', 'Số hoá đơn áp dụng', 'Doanh thu (gồm VAT)', 'Doanh thu thuần (gồm VAT)', 'Tiền giảm giá', 'Lợi nhuận gộp'];
const CHIN_COT = ['STT', 'Tên chương trình', 'Trạng thái', 'Số hoá đơn áp dụng', 'Doanh thu (gồm VAT)', 'Doanh thu thuần (gồm VAT)', 'Tiền giảm giá', 'Lợi nhuận gộp', 'Ngân sách đã dùng'];
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const dd = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/** Gõ cặp ngày vào RangePicker "Thời gian hiệu lực" (gõ + Enter từng đầu). Trả giá trị hai ô sau khi gõ. */
async function datKy(page, tu, den) {
	const rp = khung(page).locator('.ant-form-item').filter({ hasText: 'Thời gian hiệu lực' }).locator('.ant-picker-range').first();
	const ins = rp.locator('input');
	await ins.nth(0).click();
	await ins.nth(0).fill(tu);
	await ins.nth(0).press('Enter');
	await ins.nth(1).fill(den);
	await ins.nth(1).press('Enter');
	await page.waitForTimeout(3_000);
	await page.locator('body').click({ position: { x: 5, y: 5 } });
	return [await ins.nth(0).inputValue(), await ins.nth(1).inputValue()];
}

test.describe('30 · Báo cáo hiệu quả CTKM (vai shop, chỉ đọc)', () => {
	let kq;
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		kq = await moMan(page, VAI);
	});

	test('30_010_003 — Thẻ tổng hợp hiển thị đủ sáu chỉ số', async ({ page }) => {
		chanNeuTat('30_010_003');
		const t = await the(page);
		ghiChu('thẻ thật', JSON.stringify(t));
		for (const nhan of SAU_THE) expect(Object.keys(t), `Thiếu thẻ "${nhan}"`).toContain(nhan);
	});

	test('30_010_004 — Bảng hiệu quả theo chương trình đủ chín cột', async ({ page }) => {
		chanNeuTat('30_010_004');
		const cot = (await bang(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);
		ghiChu('cột thật', cot.join(' · '));
		for (const nhan of CHIN_COT) expect(cot, `Bảng thiếu cột "${nhan}"`).toContain(nhan);
	});

	test('30_050_001 — Danh sách báo cáo rỗng khi kỳ không có chương trình', async ({ page }) => {
		chanNeuTat('30_050_001');
		const cho = page.waitForResponse((r) => r.url().includes(`${API}?`), { timeout: 20_000 }).catch(() => null);
		const gt = await datKy(page, '01/01/2020', '31/01/2020');
		const r = await cho;
		const b = r ? await r.json().catch(() => null) : null;
		ghiChu('kỳ + API', `${gt.join(' → ')} · ${r?.status()}/${b?.status?.code} · ${b?.page?.total_elements} · ${tomTat(kq)}`);
		expect(r, 'Đổi kỳ mà màn không gọi lại danh sách').toBeTruthy();
		expect(String(b?.status?.code), 'Kỳ rỗng mà API báo lỗi (bảng rỗng do lỗi, không phải do không có chương trình)').toBe('200');
		expect(await dong(page).count()).toBe(0);
		const rong = bang(page).locator('.ant-empty').first();
		await expect(rong, 'Bảng rỗng mà không có khối trạng thái rỗng').toBeVisible();
		ghiChu('nguyên văn trạng thái rỗng', chuan(await rong.innerText()));
	});

	test('30_050_004 — Chọn khoảng thời gian có ngày kết thúc trước ngày bắt đầu', async ({ page }) => {
		chanNeuTat('30_050_004');
		const h = new Date();
		const q = new Date(h.getTime() - 5 * 86_400_000);
		const cho = page.waitForResponse((r) => r.url().includes(`${API}?`), { timeout: 8_000 }).catch(() => null);
		const gt = await datKy(page, dd(h), dd(q));
		const r = await cho;
		const p = r ? Object.fromEntries(new URL(r.url()).searchParams) : null;
		ghiChu('hành vi thật', `sau khi gõ "${dd(h)}" → "${dd(q)}": ô "${gt.join('" → "')}" · lời gọi ${p ? JSON.stringify({ s: new Date(+p.startDate).toISOString(), e: new Date(+p.endDate).toISOString() }) : '(không)'} · ${await dong(page).count()} dòng`);
		// Kịch bản chấp nhận: bị chặn ở bộ chọn (ô không giữ cặp ngược / không gọi API) hoặc trả rỗng. 🚫 Không được gọi API với start > end mà trả dữ liệu.
		const nguoc = p && Number(p.startDate) > Number(p.endDate);
		expect(!nguoc || (await dong(page).count()) === 0, 'Gửi khoảng ngày NGƯỢC xuống BE mà vẫn trả dữ liệu').toBe(true);
	});

	test('30_050_002 — Phân trang bảng hiệu quả chương trình', async ({ page }) => {
		chanNeuTat('30_050_002');
		expect(okHet(kq), `API báo cáo lỗi: ${tomTat(kq)}`).toBe(true);
		const pg = khung(page).locator('.ant-pagination').last();
		const tong = chuan(await pg.locator('.ant-pagination-total-text').innerText().catch(() => ''));
		ghiChu('tổng', tong);
		const tenTrang = async () => (await dong(page).locator('td:nth-child(2)').allInnerTexts()).map(chuan);
		const t1 = await tenTrang();
		test.skip((await pg.locator('.ant-pagination-item').count()) < 2, `Kỳ mặc định chỉ có 1 trang chương trình (${tong}).`);
		expect(t1.length, 'Mặc định số dòng/trang').toBe(10);
		const cho2 = page.waitForResponse((r) => r.url().includes(`${API}?`), { timeout: 20_000 });
		await pg.locator('.ant-pagination-item-2').click();
		const q2 = Object.fromEntries(new URL((await cho2).url()).searchParams);
		await page.waitForTimeout(1_500);
		const t2 = await tenTrang();
		ghiChu('trang 2', `${JSON.stringify(q2)} · ${t2.length} dòng`);
		expect(q2.page, 'page gửi BE (0-based)').toBe('1');
		expect(t2.filter((x) => t1.includes(x)), 'Trang 2 lặp dòng trang 1').toEqual([]);
		// Đổi số dòng/trang = 20
		await pg.locator('.ant-pagination-options .ant-select').click();
		const cho3 = page.waitForResponse((r) => r.url().includes(`${API}?`), { timeout: 20_000 });
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /^20/ }).click();
		const q3 = Object.fromEntries(new URL((await cho3).url()).searchParams);
		await page.waitForTimeout(1_500);
		const n3 = await dong(page).count();
		const tongSo = Number((tong.match(/trên ([\d.]+)/) || [])[1]?.replace(/\./g, '') || 0);
		ghiChu('size 20', `${JSON.stringify(q3)} · ${n3} dòng`);
		expect(q3.size).toBe('20');
		expect(n3).toBe(Math.min(20, tongSo - Number(q3.page) * 20));
		// Trang cuối
		const cuoi = pg.locator('.ant-pagination-item').last();
		const choC = page.waitForResponse((r) => r.url().includes(`${API}?`), { timeout: 20_000 }).catch(() => null);
		await cuoi.click();
		const rc = await choC;
		const bc = rc ? await rc.json().catch(() => null) : null;
		ghiChu('trang cuối', `${rc?.url().split('?')[1]} · ${bc?.status?.code}`);
		if (rc) expect(String(bc?.status?.code), 'Trang cuối lỗi').toBe('200');
	});

	test('30_050_003 — Xoá bộ lọc trở về mặc định', async ({ page }) => {
		chanNeuTat('30_050_003');
		const macDinh = { the: await the(page), n: await dong(page).count() };
		const loc1 = await loc(page, { keyword: 'KHONG_CO_CTKM_NAO_30', trangThai: 'Đã kết thúc' });
		const giua = { the: await the(page), n: await dong(page).count() };
		// Không có nút "Xoá bộ lọc" riêng ⇒ xoá ô tìm + bỏ chọn trạng thái rồi Lọc lại.
		const loc2 = await loc(page, {});
		const sau = { the: await the(page), n: await dong(page).count() };
		ghiChu('đo', JSON.stringify({ macDinh, giua, sau, q1: loc1.url?.split('?')[1], q2: loc2.url?.split('?')[1] }));
		const nutXoa = await khung(page).getByRole('button', { name: /Xoá|Xóa|Đặt lại|Reset/ }).count();
		ghiChu('nút xoá lọc', nutXoa ? 'có' : '🚫 KHÔNG có nút xoá/đặt lại bộ lọc — phải xoá tay từng ô');
		expect(giua.n, 'Lọc từ khoá không tồn tại mà vẫn còn dòng').toBe(0);
		expect(sau).toEqual(macDinh);
		// Xoá lọc = đúng tham số mặc định ⇒ RTK Query trả từ cache, có thể KHÔNG gửi request (url undefined).
		if (loc2.url) {
			expect(loc2.url, 'Còn gửi keyword sau khi xoá').not.toMatch(/keyword=/);
			expect(loc2.url, 'Còn gửi campaignStatus sau khi xoá').not.toMatch(/campaignStatus=/);
		}
	});

	test('30_050_005 — Tìm chương trình bằng ký tự đặc biệt', async ({ page }) => {
		chanNeuTat('30_050_005');
		const tong0 = Number(String((await the(page))['Số chương trình'] ?? '').replace(/\D/g, ''));
		expect(tong0, 'Không đọc được tổng số chương trình mặc định').toBeGreaterThan(0);
		const kqs = {};
		for (const tu of ['%', '_', '%_%', "'"]) {
			const r = await loc(page, { keyword: tu });
			kqs[tu] = { code: r.list?.status?.code, n: r.list?.page?.total_elements, ten: (r.list?.data ?? []).slice(0, 3).map((x) => x.campaignName) };
		}
		ghiChu('hành vi thật', `tổng không lọc ${tong0} · ${JSON.stringify(kqs)}`);
		for (const [tu, v] of Object.entries(kqs)) {
			expect(String(v.code), `Từ khoá "${tu}" lỗi`).toBe('200');
			const khop = v.ten.every((t) => t.includes(tu));
			expect(v.n < tong0 || (khop && v.n > 0), `Từ khoá "${tu}" trả về TOÀN BỘ ${v.n}/${tong0} chương trình (ký tự đại diện LIKE không được escape)`).toBe(true);
		}
	});
});
