'use strict';

/**
 * Task 010 — Tra cứu danh sách nhân viên (vai `tct`).
 *
 * 26 case đọc, 🚫 KHÔNG case nào ghi dữ liệu. Ba case của task này chạy bằng vai khác nằm ở
 * `pham-vi.province.spec.js`.
 *
 * 🔴 Lệch đặc tả đã biết, 🚫 đừng "sửa test cho khớp":
 *   - Sheet QC `FUNC_NHANVIEN__2` khai ô tìm kiếm là *"Tên nhân viên"* + 1 dropdown; sản phẩm có
 *     placeholder *"Tìm kiếm theo tên và số điện thoại"* + **4** bộ lọc.
 *   - Sheet QC `FUNC_NHANVIEN__3` đặt Vai trò / Chi nhánh / Trạng thái làm việc ở **bảng chính**;
 *     sản phẩm đặt ở **hàng mở rộng**, và bảng chính còn cột **Chức danh** sheet không nhắc.
 *   - Nút thứ ba ở vùng extra tên thật là **"Quản lý chức danh"**, tài liệu gọi tắt "Chức danh".
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

/** 🔴 `test-input.json` nằm ở GỐC phân hệ, không phải trong `tests/`. */
const GOC = path.join(__dirname, '..');
const {
	boQua,
	chonDonVi,
	chonOption,
	chuan,
	dong,
	moDanhSach,
	nhanCacOption,
	oLoc,
	oTimKiem,
	phanTrang,
	taiLaiBoi,
	thamSo,
	theColumn,
	tieuDeBang,
	timKiem,
	tongSo,
} = require('./employee-page');

const VAI = 'tct';
const input = (id) => loadCaseInput(GOC, id);
const chanNeuTat = (id) => {
	const i = input(id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('02 · 010 — Tra cứu danh sách nhân viên', () => {
	test.beforeEach(async ({ page }) => {
		await moDanhSach(page, VAI);
	});

	test('02_010_001 — Màn Quản lý nhân viên hiển thị đúng bố cục', async ({ page }) => {
		chanNeuTat('02_010_001');

		// 🔴 Tiêu đề màn nằm ở `.ant-page-header-heading-title` (đo 20/09), KHÔNG phải
		//    `.ant-pro-page-container-title` — lớp đó không tồn tại trong bản antd đang dùng.
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý nhân viên',
		);
		await expect(page.locator('.ant-breadcrumb')).toHaveCount(0);
		await expect(page.locator('.ant-pro-card').first()).toBeVisible();

		// Vùng extra — 🔴 tên thật của nút thứ ba là "Quản lý chức danh".
		// 🔴 🚫 KHÔNG dùng `exact: true`: tên trợ năng của nút antd gồm cả TÊN ICON đứng trước
		//    (`export Xuất Excel`, `plus Thêm mới`) ⇒ so khít chuỗi là "element(s) not found",
		//    trông y như nút bị ẩn vì thiếu quyền.
		for (const nhan of ['Xuất Excel', 'Nhập từ excel', 'Quản lý chức danh', 'Thêm mới']) {
			await expect(
				page.getByRole('button', { name: nhan }),
				`Thiếu nút "${nhan}" ở vùng extra`,
			).toBeVisible();
		}

		const tieuDe = chuan(await tieuDeBang(page).innerText());
		expect(tieuDe).toContain('Danh sách nhân viên');
		expect(tieuDe, 'Tiêu đề bảng phải kèm tổng số nhân viên').toMatch(/[\d.,]+ nhân viên/);
	});

	test('02_010_002 — Vùng lọc có đủ 5 ô, đúng placeholder', async ({ page }) => {
		chanNeuTat('02_010_002');

		await expect(oTimKiem(page)).toBeVisible();

		// 🔴 Placeholder của Select antd nằm trong `<div>`, không phải thuộc tính của `<input>`
		//    ⇒ đọc bằng innerText của cả `.ant-select`.
		const nhan = [];
		for (let i = 0; i < 4; i += 1) nhan.push(chuan(await oLoc(page, i).innerText()));

		expect(nhan).toEqual([
			'Chọn chi nhánh làm việc',
			'Chọn vai trò',
			'Trạng thái tài khoản',
			'Trạng thái làm việc',
		]);
	});

	test('02_010_003 — Tiêu đề cột của bảng chính', async ({ page }) => {
		chanNeuTat('02_010_003');

		const ten = (await theColumn(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		expect(ten).toEqual([
			'STT',
			'Mã nhân viên',
			'Tên nhân viên',
			'Chức danh',
			'Số điện thoại / Email',
			'Trạng thái',
		]);
	});

	test('02_010_004 — Dữ liệu trong bảng không lộ giá trị rỗng kỹ thuật', async ({ page }) => {
		chanNeuTat('02_010_004');

		const so = await dong(page).count();
		expect(so, 'Không có dòng nào để đối chiếu — case này sẽ "pass rỗng".').toBeGreaterThan(0);

		for (let i = 0; i < so; i += 1) {
			const o = dong(page).nth(i).locator('td');
			for (const cot of [3, 5]) {
				const giaTri = chuan(await o.nth(cot).innerText());
				expect(giaTri, `Dòng ${i + 1} cột ${cot} rỗng — phải hiện dấu "—"`).not.toBe('');
				expect(giaTri.toLowerCase()).not.toMatch(/^(null|undefined|nan)$/);
			}
		}
	});

	test('02_010_005 — Hàng mở rộng hiển thị Vai trò · Chi nhánh làm việc · Trạng thái làm việc', async ({
		page,
	}) => {
		chanNeuTat('02_010_005');

		expect(await dong(page).count()).toBeGreaterThan(0);
		await dong(page).first().locator('.ant-table-row-expand-icon').click();
		await page.waitForTimeout(1_200);

		const con = page.locator('.ant-table-expanded-row').first();
		const cot = (await con.locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		expect(cot).toEqual(['Vai trò', 'Chi nhánh làm việc', 'Trạng thái làm việc']);

		const dongCon = con.locator('.ant-table-tbody tr.ant-table-row');
		expect(await dongCon.count(), 'Hàng mở rộng không có phân công nào').toBeGreaterThan(0);

		const trangThai = chuan(await dongCon.first().locator('td').nth(2).innerText());
		expect(['Đang làm', 'Đã nghỉ']).toContain(trangThai);
	});

	test('02_010_006 — Tìm kiếm theo tên nhân viên với từ khoá hợp lệ', async ({ page }) => {
		chanNeuTat('02_010_006');

		expect(await dong(page).count()).toBeGreaterThan(0);
		const ten = chuan(await dong(page).first().locator('td').nth(3).innerText());
		const tuKhoa = ten.split(' ').slice(0, 2).join(' ');

		const res = await timKiem(page, tuKhoa);
		expect(thamSo(res).keyword).toBe(tuKhoa);

		const so = await dong(page).count();
		expect(so, `Tìm "${tuKhoa}" không ra dòng nào dù lấy từ chính danh sách`).toBeGreaterThan(0);

		const khongDau = (s) =>
			chuan(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
		for (let i = 0; i < so; i += 1) {
			const hang = khongDau(await dong(page).nth(i).innerText());
			expect(hang, `Dòng ${i + 1} không chứa từ khoá`).toContain(khongDau(tuKhoa));
		}
	});

	test('02_010_007 — Tìm kiếm theo SỐ ĐIỆN THOẠI', async ({ page }) => {
		chanNeuTat('02_010_007');

		expect(await dong(page).count()).toBeGreaterThan(0);
		const sdt = chuan(await dong(page).first().locator('td').nth(5).innerText());
		if (!/^[0-9+ .-]+$/.test(sdt)) {
			boQua(test, `Dòng đầu không có số điện thoại để tìm (giá trị: "${sdt}").`);
		}
		const so = sdt.replace(/[^0-9]/g, '');

		await timKiem(page, so);
		const n = await dong(page).count();
		expect(n, `Tìm theo số điện thoại "${so}" không ra dòng nào`).toBeGreaterThan(0);
		for (let i = 0; i < n; i += 1) {
			const oSdt = (await dong(page).nth(i).locator('td').nth(5).innerText()).replace(
				/[^0-9]/g,
				'',
			);
			expect(oSdt).toContain(so.slice(-9));
		}
	});

	test('02_010_008 — Tìm kiếm với từ khoá không tồn tại', async ({ page }) => {
		chanNeuTat('02_010_008');

		await timKiem(page, 'zzzkhongtontai999');
		expect(await dong(page).count()).toBe(0);
		expect(await tongSo(page)).toBe(0);
		await expect(page.locator('.ant-empty')).toBeVisible();
	});

	test('02_010_009 — Tìm kiếm với ký tự đặc biệt', async ({ page }) => {
		chanNeuTat('02_010_009');

		const banDau = await tongSo(page);
		const res = await timKiem(page, '%_\'"<>');
		expect(res.status(), 'Ký tự đặc biệt làm API đổ lỗi').toBe(200);

		const sau = await tongSo(page);
		// 🔴 `%` và `_` KHÔNG được hiểu như ký tự đại diện SQL LIKE. Trả về nguyên danh sách là
		//    lỗi thoát ký tự ở backend — giữ nguyên assertion này, 🚫 không nới lỏng.
		expect(sau, 'Ký tự đại diện SQL lọt xuống backend: kết quả bằng cả danh sách').not.toBe(
			banDau,
		);
	});

	test('02_010_010 — Từ khoá có khoảng trắng đầu/cuối bị loại bỏ', async ({ page }) => {
		chanNeuTat('02_010_010');

		expect(await dong(page).count()).toBeGreaterThan(0);
		const ten = chuan(await dong(page).first().locator('td').nth(3).innerText())
			.split(' ')
			.slice(0, 2)
			.join(' ');

		await timKiem(page, `  ${ten}  `);
		const coKhoangTrang = await tongSo(page);

		await timKiem(page, ten);
		const khongKhoangTrang = await tongSo(page);

		expect(
			coKhoangTrang,
			'Từ khoá kèm khoảng trắng thừa cho kết quả khác — thiếu trim ở FE hoặc BE.',
		).toBe(khongKhoangTrang);
	});

	test('02_010_011 — Tìm kiếm không phân biệt hoa/thường và không dấu', async ({ page }) => {
		chanNeuTat('02_010_011');
		// Từ khoá có dấu cố định: họ "Nguyễn" (trang đầu có thể toàn tên không dấu/NFD).
		const ten = 'Nguyễn';
		const khongDau = ten.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
		const kq = {};
		for (const [nhan, tu] of [['HOA', ten.toUpperCase()], ['thường', ten.toLowerCase()], ['gốc', ten], ['không dấu', khongDau]]) {
			await timKiem(page, tu);
			kq[nhan] = await tongSo(page);
		}
		test.info().annotations.push({ type: 'đo', description: `tên "${ten}" · ${JSON.stringify(kq)} (vế không dấu chưa có đặc tả — chỉ ghi nhận)` });
		expect(kq.HOA, 'Chữ HOA và chữ thường cho kết quả khác nhau').toBe(kq['thường']);
		expect(kq.HOA, 'Chữ HOA không tìm ra nhân viên có trong danh sách').toBeGreaterThan(0);
	});

	test('02_010_012 — Xoá trắng ô tìm kiếm trở về danh sách ban đầu', async ({ page }) => {
		chanNeuTat('02_010_012');

		const banDau = await tongSo(page);
		expect(await dong(page).count()).toBeGreaterThan(0);
		const ten = chuan(await dong(page).first().locator('td').nth(3).innerText());

		await timKiem(page, ten);
		expect(await tongSo(page)).toBeLessThanOrEqual(banDau);

		// 🔴 Không cần Enter lần nữa: `onChange` gọi `handlSearch()` ngay khi ô rỗng.
		await taiLaiBoi(page, async () => {
			await oTimKiem(page).fill('');
		});
		expect(await tongSo(page), 'Xoá trắng ô tìm kiếm không trả về danh sách đầy đủ').toBe(banDau);
	});

	test('02_010_013 — Nhập nhiều khoảng trắng liên tiếp vào ô tìm kiếm', async ({ page }) => {
		chanNeuTat('02_010_013');
		const banDau = await tongSo(page);
		const goi = [];
		page.on('request', (r) => { if (r.url().includes('/chain-employment-profile/v1.2/list')) goi.push(decodeURIComponent(r.url())); });
		await timKiem(page, '     ');
		const sau = await tongSo(page);
		test.info().annotations.push({ type: 'đo', description: `ban đầu ${banDau} · 5 dấu cách + Enter ⇒ ${sau} · request ${goi.slice(-1)[0]?.split('?')[1]?.slice(0, 200) ?? 'không gửi'}` });
		expect(sau, '5 dấu cách không trả về danh sách ban đầu (FE không trim, BE không trim)').toBe(banDau);
	});

	test('02_010_014 — Cột Trạng thái (tài khoản) hiển thị đúng nhãn và màu', async ({ page }) => {
		chanNeuTat('02_010_014');

		const so = await dong(page).count();
		expect(so).toBeGreaterThan(0);

		for (let i = 0; i < so; i += 1) {
			const tag = dong(page).nth(i).locator('td').nth(6).locator('.ant-tag');
			const nhan = chuan(await tag.innerText());
			expect(['Kích hoạt', 'Khóa']).toContain(nhan);
			const lop = await tag.getAttribute('class');
			expect(lop, `Dòng ${i + 1}: nhãn "${nhan}" sai màu`).toContain(
				nhan === 'Kích hoạt' ? 'ant-tag-success' : 'ant-tag-error',
			);
		}
	});

	test('02_010_015 — Tìm kiếm chỉ chạy khi nhấn Enter', async ({ page }) => {
		chanNeuTat('02_010_015');

		const goi = [];
		page.on('request', (r) => {
			if (r.url().includes('/chain-employment-profile/v1.2/list')) goi.push(r.url());
		});

		await oTimKiem(page).fill('nguyen');
		await page.waitForTimeout(3_000);
		expect(goi, 'Gõ phím đã gọi API danh sách — code chỉ khai `onPressEnter`').toHaveLength(0);

		await taiLaiBoi(page, () => oTimKiem(page).press('Enter'));
		expect(goi.length, 'Nhấn Enter không gọi API danh sách').toBeGreaterThan(0);
	});

	test('02_010_016 — Lọc theo chi nhánh làm việc', async ({ page }) => {
		chanNeuTat('02_010_016');

		const res = await taiLaiBoi(page, async () => {
			await chonDonVi(page, oLoc(page, 0), 'Tong cong ty');
		});
		expect(thamSo(res).org_unit_code, 'Bộ lọc chi nhánh không đi vào query').toBeTruthy();

		const so = await dong(page).count();
		expect(so, 'Lọc theo chi nhánh ra 0 dòng — không đối chiếu được gì').toBeGreaterThan(0);
	});

	test('02_010_017 — Ô lọc Vai trò bị vô hiệu khi chưa chọn chi nhánh', async ({ page }) => {
		chanNeuTat('02_010_017');

		const oVaiTro = oLoc(page, 1);
		await expect(oVaiTro).toHaveClass(/ant-select-disabled/);
		await oVaiTro.click({ force: true });
		await page.waitForTimeout(800);
		expect(
			await page.locator('.ant-select-dropdown:visible').count(),
			'Ô Vai trò mở được dropdown dù chưa chọn chi nhánh',
		).toBe(0);

		await taiLaiBoi(page, async () => {
			await chonDonVi(page, oLoc(page, 0), 'Tong cong ty');
		});
		await expect(oLoc(page, 1)).not.toHaveClass(/ant-select-disabled/);

		const nhan = await nhanCacOption(page, oLoc(page, 1));
		expect(nhan.length, 'Chọn chi nhánh rồi mà ô Vai trò không có option nào').toBeGreaterThan(0);
	});

	test('02_010_018 — Lọc Trạng thái tài khoản = Khóa', async ({ page }) => {
		chanNeuTat('02_010_018');

		const res = await taiLaiBoi(page, async () => {
			await chonOption(page, oLoc(page, 2), 'Khóa');
		});
		expect(thamSo(res).workStatus).toBe('0');

		const so = await dong(page).count();
		if (so === 0) boQua(test, 'Không có nhân viên nào ở trạng thái tài khoản "Khóa" để đối chiếu.');
		for (let i = 0; i < so; i += 1) {
			expect(chuan(await dong(page).nth(i).locator('td').nth(6).innerText())).toBe('Khóa');
		}
	});

	/**
	 * Kỳ vọng user chốt 28/09/2026 (A1 = phương án 3): lọc "Đã nghỉ" chỉ trả nhân viên ĐÃ NGHỈ Ở MỌI phân công — người còn một phân
	 * công "Đang làm" thì KHÔNG hiện. Trace vnpost-web f9c5c858 `pages/employee/index.jsx`: ô lọc thứ 4 ⇒ tham số `manageStatus` (0/1).
	 * Dữ liệu đối chứng: nhân viên riêng của làn `AUTO<làn>_DC_*` (02/dieu-chuyen) — 1 phân công Đang làm + 1 Ngừng/Đã nghỉ. Chỉ đọc.
	 */
	test('02_010_019 — Lọc Trạng thái làm việc = Đã nghỉ', async ({ page }) => {
		chanNeuTat('02_010_019');
		const fs = require('node:fs');
		const seed = require('../../00_seed/seed-state');
		const so = path.join(GOC, 'test-output', `nv-dieu-chuyen.lane${process.env.VNPOST_LANE || 0}.json`);
		test.skip(!fs.existsSync(so), 'Chưa có nhân viên đối chứng — chạy dieu-chuyen.tct.spec.js (tiền đề) trước');
		const tenNv = `${seed.PREFIX}DC_${JSON.parse(fs.readFileSync(so, 'utf8')).maNv.match(/\d{6,}$/)[0]}`;
		// 🔴 Chỉ dòng CHÍNH (có nút mở rộng): antd giữ dòng con của hàng mở rộng trong DOM kể cả khi đã đóng ⇒ `dong(page).nth()` lệch.
		const hangChinh = () => page.locator('.ant-table-tbody tr.ant-table-row:has(.ant-table-row-expand-icon)');
		const moRong = async (hang) => {
			await hang.locator('.ant-table-row-expand-icon').click();
			await page.waitForTimeout(1_200);
			const con = page.locator('.ant-table-expanded-row:visible').last();
			const pc = (await con.locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map(chuan);
			// 🔴 Đóng lại: dòng con của hàng mở rộng cũng khớp `dong(page)` ⇒ để mở là chỉ số `nth()` các dòng sau bị lệch.
			await hang.locator('.ant-table-row-expand-icon').click();
			await page.waitForTimeout(600);
			return pc;
		};
		// 1. Đối chứng: không lọc trạng thái, tìm nhân viên DC ⇒ phải thấy, và có cả phân công Đang làm lẫn Đã nghỉ.
		await timKiem(page, tenNv);
		const hangDc = hangChinh().filter({ hasText: tenNv }).first();
		await expect(hangDc, `Không tìm thấy nhân viên đối chứng ${tenNv}`).toBeVisible({ timeout: 20_000 });
		const pcDc = await moRong(hangDc);
		test.skip(!(pcDc.some((x) => x.includes('Đang làm')) && pcDc.some((x) => x.includes('Đã nghỉ'))), `Nhân viên đối chứng không còn đủ 1 Đang làm + 1 Đã nghỉ: ${JSON.stringify(pcDc)}`);
		// 2. Lọc Đã nghỉ + cùng từ khoá ⇒ KHÔNG hiện.
		const res = await taiLaiBoi(page, () => chonOption(page, oLoc(page, 3), 'Đã nghỉ'));
		const ts = thamSo(res);
		const soDc = await hangChinh().filter({ hasText: tenNv }).count();
		// 3. Lọc Đã nghỉ, bỏ từ khoá ⇒ mọi nhân viên trả về phải nghỉ ở MỌI phân công (soi tối đa 5 dòng đầu).
		await timKiem(page, '');
		const soDong = await hangChinh().count();
		const soi = [];
		for (let i = 0; i < Math.min(5, soDong); i += 1) {
			const h = hangChinh().nth(i);
			soi.push({ nv: chuan(await h.locator('td').nth(3).innerText()), pc: await moRong(h) });
		}
		test.info().annotations.push({ type: 'đo', description: `đối chứng ${tenNv}: ${JSON.stringify(pcDc)} · tham số lọc ${JSON.stringify(ts)} · lọc Đã nghỉ + tên DC ⇒ ${soDc} dòng · lọc Đã nghỉ ${soDong} dòng, soi: ${JSON.stringify(soi)}` });
		expect(String(ts.manageStatus ?? ts.manage_status), 'Bộ lọc "Đã nghỉ" không đi vào request').toBe('0');
		expect(soDc, `🔴 Lọc "Đã nghỉ" vẫn hiện ${tenNv} dù còn phân công Đang làm (lọc theo PHÂN CÔNG, không theo NHÂN VIÊN)`).toBe(0);
		for (const x of soi) {
			expect(x.pc.length, `${x.nv}: hàng mở rộng rỗng`).toBeGreaterThan(0);
			expect(x.pc.filter((p) => p.includes('Đang làm')), `🔴 ${x.nv} còn phân công Đang làm mà vẫn ra ở lọc "Đã nghỉ"`).toEqual([]);
		}
	});

	test('02_010_020 — Lọc kết hợp chi nhánh + vai trò + trạng thái làm việc', async ({ page }) => {
		chanNeuTat('02_010_020');

		await taiLaiBoi(page, async () => {
			await chonDonVi(page, oLoc(page, 0), 'Tong cong ty');
		});

		const vaiTro = await nhanCacOption(page, oLoc(page, 1));
		if (vaiTro.length === 0) boQua(test, 'Chi nhánh đã chọn không có vai trò nào để lọc kết hợp.');

		const resVaiTro = await taiLaiBoi(page, async () => {
			await chonOption(page, oLoc(page, 1), vaiTro[0]);
		});
		const res = await taiLaiBoi(page, async () => {
			await chonOption(page, oLoc(page, 3), 'Đang làm');
		});

		// 🔴 Điều kiện phải CỘNG DỒN, 🚫 không được cái sau thay cái trước.
		const p = thamSo(res);
		expect(p.org_unit_code, 'Mất điều kiện chi nhánh sau khi chọn thêm').toBeTruthy();
		expect(p.role_id, 'Mất điều kiện vai trò sau khi chọn thêm').toBe(thamSo(resVaiTro).role_id);
		expect(p.manageStatus).toBe('1');
	});

	test('02_010_021 — Xoá toàn bộ bộ lọc trở về danh sách đầy đủ', async ({ page }) => {
		chanNeuTat('02_010_021');

		const banDau = await tongSo(page);

		await timKiem(page, 'nguyen');
		await taiLaiBoi(page, async () => {
			await chonDonVi(page, oLoc(page, 0), 'Tong cong ty');
		});
		await taiLaiBoi(page, async () => {
			await chonOption(page, oLoc(page, 2), 'Kích hoạt');
		});
		await taiLaiBoi(page, async () => {
			await chonOption(page, oLoc(page, 3), 'Đang làm');
		});

		// Xoá lần lượt bằng nút clear của từng ô (chỉ hiện khi hover).
		for (const i of [3, 2, 0]) {
			await oLoc(page, i).hover();
			await taiLaiBoi(page, async () => {
				await oLoc(page, i).locator('.ant-select-clear').click({ force: true });
			});
		}
		const cuoi = await taiLaiBoi(page, async () => {
			await oTimKiem(page).fill('');
		});

		const p = thamSo(cuoi);
		expect(p.keyword ?? '').toBe('');
		expect(p.org_unit_code, 'Query còn sót điều kiện chi nhánh').toBeUndefined();
		expect(p.role_id, 'Query còn sót điều kiện vai trò').toBeUndefined();
		expect(p.workStatus, 'Query còn sót điều kiện trạng thái tài khoản').toBeUndefined();
		expect(p.manageStatus, 'Query còn sót điều kiện trạng thái làm việc').toBeUndefined();
		expect(await tongSo(page)).toBe(banDau);
	});

	test('02_010_022 — Phân trang: đổi trang và dòng tổng kết', async ({ page }) => {
		chanNeuTat('02_010_022');

		const tong = await tongSo(page);
		if (tong <= 10) boQua(test, `Chỉ có ${tong} nhân viên — không đủ hai trang để kiểm.`);

		const tomTat = () => chuan(page.locator('.ant-pagination-total-text').innerText());
		await expect(page.locator('.ant-pagination-total-text')).toHaveText(
			/1 - 10 trên [\d.,]+ nhân viên/,
		);
		const maTrang1 = await dong(page).evaluateAll((l) =>
			l.map((e) => e.querySelectorAll('td')[2]?.innerText),
		);

		const res = await taiLaiBoi(page, async () => {
			await phanTrang(page).locator('.ant-pagination-item[title="2"]').click();
		});
		expect(thamSo(res).page, 'Màn này 1-based ở UI, gửi 0-based xuống API').toBe('1');
		await expect(page.locator('.ant-pagination-total-text')).toHaveText(
			/11 - 20 trên [\d.,]+ nhân viên/,
		);
		void tomTat;

		const maTrang2 = await dong(page).evaluateAll((l) =>
			l.map((e) => e.querySelectorAll('td')[2]?.innerText),
		);
		expect(maTrang2.some((m) => maTrang1.includes(m)), 'Trang 2 lặp dòng của trang 1').toBe(false);
	});

	test('02_010_023 — Không có ô đổi số dòng mỗi trang', async ({ page }) => {
		chanNeuTat('02_010_023');

		await expect(phanTrang(page)).toBeVisible();
		expect(
			await page.locator('.ant-pagination-options-size-changer').count(),
			'Có ô đổi số dòng mỗi trang — trái `showSizeChanger: false` trong code',
		).toBe(0);
	});

	test('02_010_024 — Đổi bộ lọc khi đang ở trang 3 thì nhảy về trang 1', async ({ page }) => {
		chanNeuTat('02_010_024');

		const tong = await tongSo(page);
		if (tong <= 20) boQua(test, `Chỉ có ${tong} nhân viên — không tới được trang 3.`);

		await taiLaiBoi(page, async () => {
			await phanTrang(page).locator('.ant-pagination-item[title="3"]').click();
		});
		await expect(phanTrang(page).locator('.ant-pagination-item-active')).toHaveText('3');

		const res = await timKiem(page, 'nguyen');
		expect(thamSo(res).page, 'Tìm kiếm không đặt lại về trang 1').toBe('0');
		await expect(phanTrang(page).locator('.ant-pagination-item-active')).toHaveText('1');
	});

	test('02_010_025 — Trang cuối hiển thị đúng số bản ghi còn lại', async ({ page }) => {
		chanNeuTat('02_010_025');

		const tong = await tongSo(page);
		if (tong <= 10) boQua(test, `Chỉ có ${tong} nhân viên — chỉ có một trang.`);

		await taiLaiBoi(page, async () => {
			await phanTrang(page).locator('.ant-pagination-item').last().click();
		});

		const conLai = tong % 10 === 0 ? 10 : tong % 10;
		expect(await dong(page).count(), 'Số dòng trang cuối không khớp phần dư').toBe(conLai);
		await expect(page.locator('.ant-pagination-total-text')).toHaveText(
			new RegExp(`${tong - conLai + 1} - ${tong} `.replace(/\d/g, '[\\d.,]')),
		);
	});

	test('02_010_026 — Trạng thái rỗng khi bộ lọc không ra kết quả', async ({ page }) => {
		chanNeuTat('02_010_026');

		await timKiem(page, 'zzz-khong-co-nhan-vien-nao-999');
		expect(await dong(page).count()).toBe(0);
		expect(await tongSo(page)).toBe(0);
		await expect(page.locator('.ant-empty')).toBeVisible();
		expect(await page.locator('.ant-table-expanded-row').count()).toBe(0);
	});
});
