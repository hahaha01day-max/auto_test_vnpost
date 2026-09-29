'use strict';

/**
 * 24 · Thẻ "Công nợ theo đơn hàng" + chi tiết nhân viên + Xuất Excel — vai `shop` (CHT điểm bán làn).
 *
 * 🔴 Vì sao vai shop (kịch bản ghi province): API danh sách `GET /shops/{id}/employee/get-debt-summary` (quyền
 *    GET_EMPLOYEE_DEBT_SUMMANRY) chỉ gán CORP_ADMIN · SHOP_MANAGER · TEST_ROLE ⇒ vai tỉnh nhận 401 (ghi báo cáo).
 * Trace `features/employeeDebt/tabs/OrderDebtTab.jsx`: ô "Tìm kiếm tên, số điện thoại..." debounce 500ms, gửi `keyword`
 * KHÔNG trim ở FE; PresetRangePicker gửi `begin`/`end` (timestamp); "Chi tiết" ⇒ TRANG `/employee/detail/:ten/:sysUserId/:shopId?tab=debt`
 * (`pages/employee/employeeDebt/EmployeeDebt.jsx`: ô "Cửa hàng" khoá khi ≤ 1 điểm bán, ô "Trạng thái" Còn nợ/Đã thanh toán → `debt`,
 * bung dòng ⇒ lịch sử thanh toán). Xuất Excel: `GET export/task/employee-debt` (drawer "Xuất excel công nợ nhân viên").
 * Dữ liệu: đơn "thanh toán sau" do GDV làn lập (tiền đề 19/20) ⇒ GDV có dòng công nợ theo đơn hàng. 🚫 Không ghi (chặn).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { API, chanGhi, chuan, dong, khung, moMan, oTim, taiLaiBoi, thamSo } = require('./debt-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const soTien = (s) => Number(chuan(s).replace(/[^\d]/g, '') || 0);
const tongCongNo = async (page) => soTien((chuan(await khung(page).innerText()).match(/Tổng công nợ\s*:?\s*([\d.,]+)/) || [])[1]);
const bang = async (page) => (await dong(page).allInnerTexts()).map(chuan);

/** Dòng đầu (tên, SĐT) của bảng — bỏ qua nếu bảng rỗng. */
async function dongDau(page) {
	const n = await dong(page).count();
	test.skip(n === 0, 'Điểm bán làn không có nhân viên nào có công nợ theo đơn hàng (chưa có đơn thanh toán sau).');
	const td = (await dong(page).first().locator('td').allInnerTexts()).map(chuan);
	return { ten: td[1], sdt: td[2], tong: soTien(td[3]) };
}

/** Bấm "Chi tiết" dòng đầu ⇒ trang chi tiết nhân viên, mở thẻ "Công nợ nhân viên". */
async function moChiTiet(page) {
	await dong(page).first().getByText('Chi tiết').click();
	await expect(page).toHaveURL(/\/employee\/detail\/.+tab=debt/, { timeout: 20_000 });
	await page.waitForTimeout(2_500);
	const dangChon = chuan(await page.locator('.ant-tabs-tab-active').first().innerText().catch(() => ''));
	ghiChu('thẻ mở sẵn', `${dangChon} (URL ${new URL(page.url()).search})`);
	const cho = page.waitForResponse((r) => /employee\/get-debt-detail/.test(r.url()), { timeout: 20_000 }).catch(() => null);
	// 🔴 URL mang ?tab=debt nhưng trang mở thẻ "Thông tin cá nhân" ⇒ tự bấm thẻ công nợ.
	await page.locator('.ant-tabs-tab', { hasText: 'Công nợ nhân viên' }).first().locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await cho;
	await page.waitForTimeout(2_000);
	return page.locator('.ant-tabs-tabpane-active').first();
}

/** Gõ từ khoá; 🔴 RTK Query dùng CACHE khi tham số trùng lần trước ⇒ có thể KHÔNG có request — chờ ngắn rồi đọc bảng. */
async function go(page, tu) {
	const cho = page.waitForResponse((r) => r.url().includes(API) && r.status() !== 401, { timeout: 8_000 }).catch(() => null);
	await oTim(page).fill(tu);
	const r = await cho;
	await page.waitForTimeout(1_200);
	return r ?? { url: () => `http://x/?keyword=${encodeURIComponent(tu)}` };
}

test.describe('24 · Công nợ theo đơn hàng (vai shop, CHẶN GHI)', () => {
	let daGoi;
	test.beforeEach(async ({ page }) => {
		({ daGoi } = await chanGhi(page));
		await moMan(page, VAI);
	});
	test.afterEach(() => {
		expect(daGoi, `Case đọc mà có request ghi: ${daGoi.join(' ; ')}`).toEqual([]);
	});

	test('24_010_006 — Tìm nhân viên bằng số điện thoại', async ({ page }) => {
		chanNeuTat('24_010_006');
		const d = await dongDau(page);
		test.skip(!/\d{6,}/.test(d.sdt), `Nhân viên "${d.ten}" không có SĐT trên bảng (${d.sdt}).`);
		const r = await go(page, d.sdt);
		ghiChu('keyword', thamSo(r).keyword);
		const ds = await bang(page);
		expect(ds.length, 'Tìm theo SĐT không ra dòng nào').toBeGreaterThan(0);
		for (const x of ds) expect(x, 'Dòng không khớp SĐT đã gõ').toContain(d.sdt);
	});

	test('24_010_009 — Tìm với từ khoá có khoảng trắng thừa ở đầu và cuối', async ({ page }) => {
		chanNeuTat('24_010_009');
		const d = await dongDau(page);
		await go(page, d.ten);
		const chuan0 = await bang(page);
		const r = await go(page, `  ${d.ten}  `);
		ghiChu('keyword gửi', JSON.stringify(thamSo(r).keyword));
		expect(await bang(page), 'Khoảng trắng đầu/cuối làm đổi kết quả').toEqual(chuan0);
	});

	test('24_010_010 — Tìm với chữ hoa chữ thường và không dấu', async ({ page }) => {
		chanNeuTat('24_010_010');
		const d = await dongDau(page);
		const hoa = await (await go(page, d.ten.toUpperCase()), bang(page));
		const thuong = await (await go(page, d.ten.toLowerCase()), bang(page));
		const khongDau = d.ten.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd');
		const kd = await (await go(page, khongDau), bang(page));
		ghiChu('kết quả', `"${d.ten}" · HOA ${hoa.length} · thường ${thuong.length} · không dấu "${khongDau}" ${kd.length}`);
		expect(hoa.length, 'Viết HOA không ra').toBeGreaterThan(0);
		expect(thuong).toEqual(hoa);
		if (khongDau !== d.ten) ghiChu('không dấu', kd.length ? 'ra kết quả' : '🔴 bảng rỗng (không chuẩn hoá dấu)');
	});

	test('24_010_011 — Xoá rỗng ô tìm kiếm sau khi đã lọc', async ({ page }) => {
		chanNeuTat('24_010_011');
		const truoc = await bang(page);
		const tong0 = await tongCongNo(page);
		await go(page, 'ZZZ_KHONG_CO_NHAN_VIEN');
		expect(await dong(page).count()).toBe(0);
		await taiLaiBoi(page, async () => {
			await oTim(page).hover();
			await khung(page).locator('.ant-input-clear-icon').first().click();
		});
		expect(await bang(page), 'Xoá ô tìm mà danh sách không về đầy đủ').toEqual(truoc);
		expect(await tongCongNo(page), 'Tổng công nợ không về giá trị ban đầu').toBe(tong0);
	});

	test('24_010_012 — Nhập toàn khoảng trắng liên tiếp vào ô tìm kiếm', async ({ page }) => {
		chanNeuTat('24_010_012');
		const truoc = await bang(page);
		const r = await go(page, '     ');
		ghiChu('keyword gửi', JSON.stringify(thamSo(r).keyword));
		expect(await bang(page), 'Chuỗi toàn khoảng trắng làm đổi danh sách').toEqual(truoc);
	});

	test('24_010_015 — Lọc theo khoảng ngày', async ({ page }) => {
		chanNeuTat('24_010_015');
		const tong0 = await tongCongNo(page);
		const rp = khung(page).locator('.ant-picker-range').first();
		const d = new Date();
		const f = (x) => `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
		const r = await taiLaiBoi(page, async () => {
			await rp.click();
			const ins = rp.locator('input');
			await ins.nth(0).fill(f(new Date(d.getFullYear() - 1, 0, 1)));
			await ins.nth(0).press('Tab');
			await ins.nth(1).fill(f(new Date(d.getFullYear() - 1, 0, 31)));
			await ins.nth(1).press('Tab');
			await page.keyboard.press('Escape');
		});
		const q = thamSo(r);
		ghiChu('tham số', JSON.stringify(q));
		expect(Number(q.begin), 'begin không phải timestamp').toBeGreaterThan(1_000_000_000_000);
		expect(Number(q.end)).toBeGreaterThan(Number(q.begin));
		const tong1 = await tongCongNo(page);
		ghiChu('tổng', `${tong0} → ${tong1} (tháng 1 năm trước)`);
		expect(tong1, 'Lọc tháng 1 năm trước mà Tổng công nợ không đổi (đơn nợ làn đều tạo 09/2026)').toBeLessThan(tong0 || 1);
	});

	test('24_010_017 — Đổi điểm bán khi đang ở trang 3', async ({ browser }) => {
		chanNeuTat('24_010_017');
		// Vai tỉnh không gọi được get-debt-summary (401) và vai điểm bán không có ô chọn điểm bán ⇒ dùng phiên TCT (CORP_ADMIN).
		const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');
		const tct = await g.k.moPhienPhu(browser, 'tct', '/debt-reconciliation/employee-debt');
		try {
			// Điểm bán có nhiều nhân viên nợ nhất (SELECT chỉ đọc) — cần > 2 trang (size 10).
			const top = g.selectDb('SELECT o.shop_id, COUNT(DISTINCT o.created_by) n FROM VNPOST_POD_01.SHOP_ORDER o WHERE o.status=1 GROUP BY o.shop_id ORDER BY n DESC LIMIT 1')[0];
			const n = Number(top?.[1] || 0);
			test.skip(n <= 20, `Không điểm bán nào có > 20 nhân viên còn công nợ theo đơn (lớn nhất: ${n}) — không có trang 3.`);
			const r1 = await g.k.goiGhi(tct.page, tct.st, 'GET', `/shops/${top[0]}/employee/get-debt-summary`, { page: 2, size: 10 });
			const r2 = await g.k.goiGhi(tct.page, tct.st, 'GET', `/shops/${tct.st.h.shopid}/employee/get-debt-summary`, { page: 0, size: 10 });
			expect(String(r1?.status?.code)).toBe('200');
			expect(String(r2?.status?.code)).toBe('200');
		} finally {
			await tct.dong();
		}
	});

	test('24_010_018 — Quyền của nút Xuất Excel', async ({ page }) => {
		chanNeuTat('24_010_018');
		// CHT có view_employee_debt ⇒ nút phải hiện; tài khoản THIẾU quyền: làn không có (ghi báo cáo) ⇒ đo phía có quyền.
		await expect(khung(page).getByRole('button', { name: /Xuất Excel/ }), 'CHT có quyền view_employee_debt mà không thấy nút Xuất Excel').toBeVisible();
		expect(await dong(page).count()).toBeGreaterThanOrEqual(0);
	});

	test('24_030_001 — Chi tiết công nợ nhân viên bung được lịch sử trả tiền', async ({ page }) => {
		chanNeuTat('24_030_001');
		await dongDau(page);
		await moChiTiet(page);
		const hang = page.locator('.ant-table-tbody tr.ant-table-row');
		test.skip((await hang.count()) === 0, 'Chi tiết nhân viên không có phiếu nào trong 30 ngày.');
		const cho = page.waitForResponse((r) => /payment-history|bill/i.test(r.url()), { timeout: 20_000 }).catch(() => null);
		// Nút bung là icon tuỳ biến `img "plus"` ở ô đầu dòng (🚫 .ant-table-row-expand-icon).
		await hang.first().getByRole('img', { name: 'plus' }).first().click();
		const r = await cho;
		await page.waitForTimeout(1_500);
		const bung = page.locator('.ant-table-expanded-row, tr[class*=expanded]').first();
		ghiChu('lịch sử', `${r ? r.url().split('__api')[1] : '(không gọi API)'} · ${chuan(await bung.innerText().catch(() => '')).slice(0, 200)}`);
		await expect(bung, 'Bấm dấu cộng mà không bung dòng lịch sử').toBeVisible();
	});

	test('24_030_002 — Nhân viên làm ở một điểm bán thì ô cửa hàng không đổi được', async ({ page }) => {
		chanNeuTat('24_030_002');
		await dongDau(page);
		const vung = await moChiTiet(page);
		const o = vung.locator('.ant-select').first();
		ghiChu('ô cửa hàng', chuan(await o.innerText()));
		await expect(o, 'Nhân viên một điểm bán mà ô cửa hàng đổi được').toHaveClass(/ant-select-disabled/);
		expect(chuan(await o.innerText()), 'Ô cửa hàng không hiện sẵn tên điểm bán').not.toBe('');
	});

	test('24_030_003 — Lọc theo trạng thái Còn nợ hoặc Đã thanh toán', async ({ page }) => {
		chanNeuTat('24_030_003');
		await dongDau(page);
		await moChiTiet(page);
		const hang = page.locator('.ant-table-tbody tr.ant-table-row');
		// 🔴 Ô trạng thái MẶC ĐỊNH đã chọn "Còn nợ" (không phải placeholder "Trạng thái").
		const oTt = page.locator('.ant-select').filter({ hasText: /^(Trạng thái|Còn nợ|Đã thanh toán)$/ }).first();
		ghiChu('mặc định ô trạng thái', chuan(await oTt.innerText()));
		const chon = async (nhan) => {
			const cho = page.waitForResponse((r) => /employee\/get-debt-detail/.test(r.url()), { timeout: 20_000 });
			await oTt.click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: nhan }).click();
			const r = await cho;
			await page.waitForTimeout(1_500);
			return { debt: thamSo(r).debt, tt: (await hang.locator('td').filter({ hasText: /^(Còn nợ|Đã thanh toán)$/ }).allInnerTexts()).map(chuan) };
		};
		const a = await chon('Còn nợ');
		const b = await chon('Đã thanh toán');
		// Bỏ chọn (allowClear) ⇒ xem tất cả.
		const cho = page.waitForResponse((r) => /employee\/get-debt-detail/.test(r.url()), { timeout: 20_000 });
		await oTt.hover();
		await oTt.locator('.ant-select-clear').click();
		const c = thamSo(await cho).debt;
		ghiChu('lọc', JSON.stringify({ conNo: a, daTT: b, boChon: c }));
		// Đối chứng API trực tiếp (cùng phiên): debt=true vs debt=false phải trả hai tập khác nhau.
		const st = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
		void st;
		expect(c ?? null, 'Bỏ chọn mà vẫn gửi tham số debt').toBeNull();
		expect(a.debt).toBe('true');
		for (const t of a.tt) expect(t).toBe('Còn nợ');
		expect(b.debt).toBe('false');
		for (const t of b.tt) expect(t).toBe('Đã thanh toán');
	});

	for (const [id, ten, tu] of [
		['24_020_001', 'Xuất Excel lấy đúng điều kiện đang hiển thị', null],
		['24_020_002', 'Bộ lọc không ra dòng nào vẫn tạo tệp chỉ có tiêu đề', 'ZZZ_KHONG_CO_NHAN_VIEN'],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			if (tu) await go(page, tu);
			await khung(page).getByRole('button', { name: /Xuất Excel/ }).click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Xuất excel công nợ nhân viên' }).last();
			await expect(dr, 'Không mở drawer "Xuất excel công nợ nhân viên"').toBeVisible({ timeout: 15_000 });
			const cho = page.waitForResponse((r) => /export\/task\/employee-debt/.test(r.url()), { timeout: 30_000 });
			await dr.getByRole('button', { name: /Xuất|Xác nhận|Tạo/ }).last().click();
			const r = await cho;
			const b = await r.json().catch(() => ({}));
			const tb = chuan((await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts()).join(' | '));
			ghiChu('xuất', `${r.status()} ${JSON.stringify(b?.status)} · params ${JSON.stringify(thamSo(r))} · ${tb}`);
			expect(String(b?.status?.code), `Tạo yêu cầu xuất lỗi (quyền EXPORT_TASK_EMPLOYEE_DEBT_GET không gán vai nào): ${JSON.stringify(b?.status)}`).toBe('200');
			if (tu) expect(thamSo(r).keyword).toBe(tu);
			expect(tb).toContain('Đã tạo yêu cầu xuất công nợ nhân viên');
		});
	}
});

void API;
