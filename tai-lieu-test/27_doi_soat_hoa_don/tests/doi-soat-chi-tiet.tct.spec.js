'use strict';

/**
 * 27 · Tra cứu / chi tiết / đối soát hoá đơn PO — vai `tct`, CHỈ ĐỌC.
 *
 * Dữ liệu nền (SELECT server dev 23/09/2026, khai trong `test-input.json`):
 *  - PO727 `PO2607165382`: nhóm 2 hoá đơn (Gốc 00000727 + Điều chỉnh 20000727, dấu Giảm).
 *  - PO813 `PO2607292185` (hoá đơn 43): đã hạch toán, có phiếu nhập kho giao thẳng.
 *  - PO1000 `PO2609238817` (hoá đơn 52): khớp, đủ điều kiện, đã hạch toán.
 *
 * 🚫 Không ghi: `chanGhi()` chặn mọi request khác GET tới reconcile/invoice/supplier; case nào lỡ
 * bấm nút ghi thì request bị chặn và ghi vào `daGoi`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const P = require('./reconcile-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const input = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i.data;
};
const so = (s) => Number(String(s ?? '').replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
const NHAN_LOAI = ['Gốc', 'Điều chỉnh', 'Thay thế'];
const NHAN_TT = { MATCHED: 'Khớp', MISMATCHED: 'Lệch', NOT_RECONCILED: 'Chưa đối soát' };
const NHAN_HT = { DA_HACH_TOAN: 'Đã hạch toán', CHUA_HACH_TOAN: 'Chưa hạch toán' };

let chan;
test.beforeEach(async ({ page }) => {
	chan = await P.chanGhi(page);
});
test.afterEach(async () => {
	expect(chan.daGoi, `Case đọc mà gửi request ghi: ${chan.daGoi.join(' ; ')}`).toEqual([]);
});

test.describe('27 · Danh sách hoá đơn', () => {
	test.beforeEach(async ({ page }) => {
		await P.moMan(page, VAI);
	});

	test('27_020_001 — Ô tìm kiếm tra đồng thời bốn trường', async ({ page }) => {
		const d = input('27_020_001');
		const truong = [
			['mã PO', d.poCode, (r) => r.poCode],
			['số hoá đơn', d.invoiceNo, (r) => r.invoiceNo],
			['mã số thuế', d.mst, (r) => r.sellerTaxCode],
			['tên NCC', d.tenNcc, (r) => r.sellerName],
		];
		for (const [ten, tuKhoa, lay] of truong) {
			const rows = await P.tim(page, tuKhoa);
			expect.soft(rows.length, `Tìm theo ${ten} "${tuKhoa}" không ra dòng nào`).toBeGreaterThan(0);
			expect.soft(
				rows.map((r) => r.id),
				`Tìm theo ${ten} "${tuKhoa}" không ra hoá đơn ${d.invoiceId}`,
			).toContain(d.invoiceId);
			const sai = rows.filter((r) => !P.chuan(lay(r)).toLowerCase().includes(P.chuan(tuKhoa).toLowerCase()));
			expect.soft(sai.map((r) => r.id), `Tìm theo ${ten} trả dòng không chứa từ khoá`).toEqual([]);
			await expect.soft(P.dong(page), `Bảng không hiện kết quả tìm theo ${ten}`).toHaveCount(rows.length);
		}
	});

	test('27_020_003 — Bung nhóm hoá đơn cùng một phiếu', async ({ page }) => {
		const d = input('27_020_003');
		const rows = await P.tim(page, d.poCode);
		const nhom = rows.find((r) => r.memberCount > 1);
		expect(nhom, `PO ${d.poCode} không còn dòng nhóm (memberCount>1)`).toBeTruthy();
		const dongNhom = P.dong(page).first();
		await expect(dongNhom).toContainText(`Gồm ${nhom.memberCount} hoá đơn`);

		await dongNhom.locator('.ant-table-row-expand-icon').click();
		const bung = P.khung(page).locator('tr.ant-table-expanded-row').first();
		await expect(bung).toBeVisible();
		const dongCon = bung.locator('.border-b');
		await expect(dongCon).toHaveCount(nhom.memberCount);
		for (const t of (await dongCon.allInnerTexts()).map(P.chuan)) {
			expect(NHAN_LOAI.some((n) => t.startsWith(n)), `Dòng con không mang nhãn Gốc/Điều chỉnh/Thay thế: "${t}"`).toBe(true);
		}
	});

	test('27_020_004 — Thẻ Theo phiếu PO nhìn theo phía phiếu đặt hàng', async ({ page }) => {
		const d = input('27_020_004');
		const cho = page.waitForResponse((r) => r.url().includes('/po-invoice-reconcile/purchase-orders?') && r.status() !== 401);
		await P.moTheChiTiet(page, 'Theo phiếu PO');
		await cho;
		const pane = page.locator('.ant-tabs-tabpane-active');
		const cot = await P.cotBang(pane);
		for (const c of ['Mã PO', 'Tổng PO', 'Tổng hoá đơn', 'Số HĐ']) {
			expect.soft(cot, `Thẻ Theo phiếu PO thiếu cột "${c}"`).toContain(c);
		}
		const choPo = page.waitForResponse((r) => r.url().includes('/po-invoice-reconcile/purchase-orders?') && r.url().includes('keyword=') && r.status() !== 401, { timeout: 30_000 });
		await P.oTim(page).fill(d.poCode);
		const poRes = await choPo;
		const po = ((await poRes.json()).data ?? []).find((r) => r.code === d.poCode);
		expect(po, `Không thấy phiếu ${d.poCode} ở thẻ Theo phiếu PO`).toBeTruthy();
		const dongPo = pane.locator('tr.ant-table-row').filter({ hasText: d.poCode }).first();
		await expect(dongPo).toBeVisible();
		const cells = (await dongPo.locator('td').allInnerTexts()).map(P.chuan);
		const idx = (c) => cot.indexOf(c);
		expect(so(cells[idx('Tổng PO')]), 'Tổng PO sai').toBe(Math.round(po.totalAmount));
		expect(so(cells[idx('Tổng hoá đơn')]), 'Tổng hoá đơn sai').toBe(Math.round(po.invoiceTotalAmount));
		expect(so(cells[idx('Số HĐ')]), 'Số hoá đơn đã nhận sai').toBe(2);
	});

	test('27_020_005 — Cột Hạch toán là trạng thái của cả phiếu không phải của hoá đơn', async ({ page }) => {
		const d = input('27_020_005');
		const rows = await P.tim(page, d.poCode);
		const cungPo = rows.filter((r) => r.poId === d.poId).flatMap((r) => [r, ...(r.members ?? [])]);
		expect(cungPo.length, `PO ${d.poCode} cần ≥2 hoá đơn`).toBeGreaterThanOrEqual(2);
		const trangThai = [...new Set(cungPo.map((r) => r.accountingStatus))];
		expect(trangThai, `Các hoá đơn cùng PO mang nhiều trạng thái hạch toán: ${trangThai.join(', ')}`).toHaveLength(1);
		const poCt = await P.apiGoi(page, 'GET', `/po-invoice-reconcile/purchase-orders/${d.poId}`);
		expect(trangThai[0], 'Trạng thái hạch toán hoá đơn ≠ trạng thái của PO').toBe(poCt.body?.data?.accountingStatus);
		await expect(P.dong(page).first()).toContainText(NHAN_HT[trangThai[0]]);
	});

	test('27_030_001 — Chi tiết hoá đơn hiện danh sách hoá đơn của PO', async ({ page }) => {
		const d = input('27_030_001');
		await P.tim(page, d.poCode);
		const { d: dr } = await P.moChiTiet(page);
		const bang = P.bangTheoTieuDe(dr, 'Danh sách hoá đơn của PO');
		const cot = await P.cotBang(bang);
		for (const c of ['Loại', 'Số hoá đơn', 'Tổng tiền', 'Dấu điều chỉnh']) {
			expect.soft(cot, `Bảng thiếu cột "${c}"`).toContain(c);
		}
		const dongs = P.dongBang(bang);
		await expect(dongs).toHaveCount(2);
		for (const t of (await dongs.allInnerTexts()).map(P.chuan)) {
			expect(NHAN_LOAI.some((n) => t.includes(n)), `Dòng không ghi loại: "${t}"`).toBe(true);
			expect(t, 'Dòng không có số hoá đơn').toMatch(/C26PO - \d+/);
			expect(t, 'Dòng không có tổng tiền').toMatch(/đ/);
		}
	});

	test('27_030_002 — Chi tiết hoá đơn con hiện dòng hàng đọc từ chính tệp đó', async ({ page }) => {
		const d = input('27_030_002');
		await P.tim(page, d.poCode);
		const { d: dr } = await P.moChiTiet(page);
		const bang = P.bangTheoTieuDe(dr, 'Danh sách hoá đơn của PO');
		const dongDc = P.dongBang(bang).filter({ hasText: 'Điều chỉnh' }).first();
		const cho = page.waitForResponse((r) => /\/po-invoice-reconcile\/invoices\/\d+$/.test(r.url()) && r.status() !== 401);
		await dongDc.getByRole('button', { name: /Xem/ }).click();
		const ct = await (await cho).json();
		const con = await P.drawer(page, 'Chi tiết hoá đơn con');
		await expect(con.locator('.ant-spin-spinning')).toHaveCount(0);
		expect(await P.giaTriMoTa(con, 'Loại')).toBe('Điều chỉnh');
		const bangCon = P.bangTheoTieuDe(con, 'Dòng hàng trên hoá đơn');
		const cot = await P.cotBang(bangCon);
		for (const c of ['Sản phẩm', 'ĐVT', 'SL', 'Đơn giá', 'Tiền trước thuế', '%VAT', 'Tiền sau thuế']) {
			expect.soft(cot, `Bảng dòng hàng thiếu cột "${c}"`).toContain(c);
		}
		const soDong = (ct?.data?.items ?? []).length;
		expect(soDong, 'Hoá đơn con không có dòng hàng để đối chiếu').toBeGreaterThan(0);
		await expect(P.dongBang(bangCon), 'Số dòng khác số dòng của RIÊNG hoá đơn con').toHaveCount(soDong);
		expect(P.chuan(await P.dongBang(bangCon).first().innerText()), 'Dòng hàng ĐC phải là số âm').toMatch(/-/);
	});

	test('27_030_003 — Bảng Chi tiết hàng hoá là số của cả nhóm hoá đơn', async ({ page }) => {
		const d = input('27_030_003');
		await P.tim(page, d.poCode);
		const { d: dr } = await P.moChiTiet(page);
		const tongSlCuaCon = async (nhanLoai) => {
			const dongX = P.dongBang(P.bangTheoTieuDe(dr, 'Danh sách hoá đơn của PO')).filter({ hasText: nhanLoai }).first();
			await dongX.getByRole('button', { name: /Xem/ }).click();
			const con = await P.drawer(page, 'Chi tiết hoá đơn con');
			await expect(con.locator('.ant-spin-spinning')).toHaveCount(0);
			const bangCon = P.bangTheoTieuDe(con, 'Dòng hàng trên hoá đơn');
			await expect(P.dongBang(bangCon).first()).toBeVisible();
			const iSl = (await P.cotBang(bangCon)).indexOf('SL');
			let tong = 0;
			for (const r of await P.dongBang(bangCon).all()) tong += so(await r.locator('td').nth(iSl).innerText());
			await con.locator('.ant-drawer-footer').getByRole('button', { name: 'Đóng' }).click();
			await expect(page.locator('.ant-drawer-open')).toHaveCount(1);
			return tong;
		};
		const slGoc = await tongSlCuaCon('Gốc');
		const slDc = await tongSlCuaCon('Điều chỉnh');
		const bangHang = P.bangTheoTieuDe(dr, 'Chi tiết hàng hoá');
		let slNhom = 0;
		for (const r of await P.dongBang(bangHang).all()) slNhom += so(await r.locator('td').nth(3).innerText());
		test.info().annotations.push({ type: 'SL', description: `Gốc ${slGoc} · ĐC ${slDc} · bảng Chi tiết hàng hoá ${slNhom}` });
		expect(slNhom, `Bảng Chi tiết hàng hoá phải là tổng CẢ NHÓM (gốc ${slGoc} + điều chỉnh ${slDc})`).toBe(slGoc + slDc);
		expect(slNhom, 'Bảng Chi tiết hàng hoá trùng số của riêng hoá đơn gốc').not.toBe(slGoc);
		await expect(P.bangTheoTieuDe(dr, 'Chi tiết hàng hoá').locator('.ant-table-thead')).toContainText('Phiếu nhập kho');
	});

	test('27_040_001 — Màn đối soát chia đôi chứng từ và hoá đơn', async ({ page }) => {
		const d = input('27_040_001');
		await P.tim(page, d.poCode);
		await P.nutDong(page, 'Đối soát').click();
		await page.waitForURL(/\/supplier\/invoice-reconcile\/detail\?/);
		expect(new URL(page.url()).searchParams.get('invoiceId')).toBe(String(d.invoiceId));
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(/Đối soát hoá đơn, chứng từ/);
		const trai = page.locator('.ant-tabs').first();
		await expect(trai.locator('.ant-tabs-tab')).toHaveText(['Đối soát công nợ (PO)', 'Phiếu nhập kho', 'Phiếu đặt hàng']);
		const phai = P.bangTheoTieuDe(page, 'Kết quả đối soát XML');
		await expect(phai, 'Nửa phải không có Kết quả đọc hoá đơn').toBeVisible();
		await expect(P.dongBang(phai).first()).toBeVisible();
		await expect(page.getByText(/po2607292185-invoice\.xml/).first(), 'Nửa phải không hiện tệp gốc').toBeVisible();
		const [bTrai, bPhai] = [await trai.boundingBox(), await phai.boundingBox()];
		expect(bPhai.x, 'Kết quả hoá đơn không nằm bên phải chứng từ').toBeGreaterThan(bTrai.x + bTrai.width / 2);
	});
});

test.describe('27 · Màn đối soát chi tiết', () => {
	test('27_040_002 — Thẻ Phiếu nhập kho đối chiếu số hàng thực nhận', async ({ page }) => {
		const d = input('27_040_002');
		await P.moManDoiSoat(page, VAI, d);
		const pane = await P.moTheChiTiet(page, 'Phiếu nhập kho');
		for (const nhan of ['Mã phiếu', 'Ngày xác nhận', 'Người nhập kho']) {
			const v = await P.giaTriMoTa(pane, nhan);
			expect.soft(v, `Thẻ Phiếu nhập kho không có "${nhan}"`).not.toBeNull();
			expect.soft(v, `"${nhan}" để trống`).not.toMatch(/^(—|-|)$/);
		}
		const cot = await P.cotBang(pane);
		for (const c of ['Tên sản phẩm', 'SL', 'Đơn giá', 'Thành tiền']) expect.soft(cot).toContain(c);
		await expect(pane.locator('tr.ant-table-row').first()).toBeVisible();
	});

	test('27_040_003 — Thẻ Phiếu đặt hàng hiện ba con số theo mặt hàng', async ({ page }) => {
		const d = input('27_040_003');
		await P.moManDoiSoat(page, VAI, d);
		const pane = await P.moTheChiTiet(page, 'Phiếu đặt hàng');
		const cot = await P.cotBang(pane);
		for (const c of ['Đặt hàng', 'NCC xác nhận', 'Đã nhập kho']) expect(cot, `Thiếu cột "${c}"`).toContain(c);
		const dongs = pane.locator('tr.ant-table-row');
		expect(await dongs.count(), 'Phiếu đặt hàng không có mặt hàng').toBeGreaterThan(0);
		for (const r of await dongs.all()) {
			const td = (await r.locator('td').allInnerTexts()).map(P.chuan);
			// Cột lá: STT · Sản phẩm · Đơn vị · Đặt hàng · NCC xác nhận · Đã nhập kho · …
			for (const i of [3, 4, 5]) expect(td[i], `Ô số lượng thứ ${i} không phải số: ${td.join(' | ')}`).toMatch(/^\d/);
		}
	});

	test('27_060_002 — Bảng Đối soát theo sản phẩm chỉ ra chỗ lệch', async ({ page }) => {
		const d = input('27_060_002');
		const docBang = async (po) => {
			await P.moManDoiSoat(page, VAI, po);
			const pane = await P.moTheChiTiet(page, 'Đối soát công nợ (PO)');
			const bang = pane.locator('.ant-table-wrapper').last();
			const cot = await P.cotBang(bang);
			for (const c of ['Hoá đơn (Σ)', 'Phiếu nhập (Σ)', 'Kết quả']) expect(cot, `Thiếu cột "${c}"`).toContain(c);
			const dongs = await bang.locator('tr.ant-table-row').all();
			expect(dongs.length, 'Bảng Đối soát theo sản phẩm rỗng').toBeGreaterThan(0);
			const out = [];
			for (const r of dongs) {
				const td = (await r.locator('td').allInnerTexts()).map(P.chuan);
				out.push({ sp: td[1], hd: td[3], pn: td[4], kq: td[5] });
				expect(['Khớp', 'Lệch SL', 'Lệch tiền'], `Kết quả lạ: ${td[5]}`).toContain(td[5]);
			}
			return out;
		};
		const khop = await docBang(d.poKhop);
		for (const r of khop) {
			const cung = r.hd === r.pn;
			expect(r.kq === 'Khớp', `Mặt hàng ${r.sp}: HĐ "${r.hd}" vs PN "${r.pn}" mà kết quả ${r.kq}`).toBe(cung);
		}
		// Đối chứng: Σ phiếu nhập ở bảng này phải bằng SL ở thẻ Phiếu nhập kho của chính màn.
		const lech = await docBang(d.poLech);
		const pn = await P.moTheChiTiet(page, 'Phiếu nhập kho');
		const slPn = {};
		for (const r of await pn.locator('tr.ant-table-row').all()) {
			const td = (await r.locator('td').allInnerTexts()).map(P.chuan);
			slPn[td[1]] = so(td[3]);
		}
		for (const r of lech) {
			const slBang = so((r.pn.match(/SL:\s*(-?[\d.,]+)/) ?? [])[1]);
			expect.soft(slBang, `PO ${d.poLech.poCode} mặt hàng ${r.sp}: "Phiếu nhập (Σ)" = ${slBang} nhưng thẻ Phiếu nhập kho ghi ${slPn[r.sp]}`).toBe(slPn[r.sp]);
		}
	});

	test('27_070_007 — Báo cáo đối soát hiển thị đúng các chỉ tiêu', async ({ page }) => {
		const d = input('27_070_007');
		const { moTrang } = require('../../shared/auth/login');
		const cho = page.waitForResponse((r) => r.url().includes('/report/po-reconciliation') && r.url().includes('summary') && r.status() !== 401, { timeout: 60_000 }).catch(() => null);
		await moTrang(page, d.route, VAI);
		const res = await cho;
		await expect(page.locator('.ant-page-header-heading-title').first()).toContainText('Báo cáo Đối soát');
		const the = page.locator('.ant-pro-statistic-card, .ant-statistic');
		await expect(the.first()).toBeVisible();
		const tieuDe = (await page.locator('.ant-statistic-title').allInnerTexts()).map(P.chuan);
		test.info().annotations.push({ type: 'chỉ tiêu đang có', description: tieuDe.join(' · ') });
		for (const t of ['PO khớp đối soát', 'PO lệch đối soát', 'PO chưa đối soát']) expect.soft(tieuDe).toContain(t);
		const giaTri = async (t) => so(await page.locator('.ant-statistic').filter({ has: page.locator('.ant-statistic-title', { hasText: t }) }).locator('.ant-statistic-content').first().innerText());
		const tongDaDoiSoat = tieuDe.find((t) => /đã đối soát/i.test(t));
		expect(tongDaDoiSoat, `Báo cáo không có chỉ tiêu "số đã đối soát" — chỉ có: ${tieuDe.join(' · ')}`).toBeTruthy();
		const tong = (await giaTri('PO khớp đối soát')) + (await giaTri('PO lệch đối soát')) + (await giaTri('PO chưa đối soát'));
		expect(await giaTri(tongDaDoiSoat), 'Tổng các nhóm ≠ số đã đối soát').toBe(tong);
		expect(res?.status() ?? 0, 'API tổng hợp báo cáo lỗi').toBeLessThan(400);
	});
});

test.describe('27 · Drawer chỉnh sửa (không lưu)', () => {
	test.beforeEach(async ({ page }) => {
		await P.moMan(page, VAI);
	});

	const moSua = async (page, d, { timLai = true } = {}) => {
		// 🔴 Từ khoá không đổi ⇒ app KHÔNG gọi lại danh sách; chỉ tìm ở lần mở đầu.
		if (timLai) await P.tim(page, d.poCode);
		const { d: dr } = await P.moChiTiet(page);
		await dr.getByRole('button', { name: 'Chỉnh sửa' }).click();
		const sua = await P.drawer(page, 'Chỉnh sửa hoá đơn');
		await expect(sua.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible();
		return sua;
	};

	test('27_050_002 — Thêm và xoá dòng hàng trong màn chỉnh sửa', async ({ page }) => {
		const d = input('27_050_002');
		const sua = await moSua(page, d);
		const dongs = sua.locator('.ant-table-tbody tr.ant-table-row');
		const n = await dongs.count();
		await sua.getByRole('button', { name: /Thêm dòng/ }).click();
		await expect(dongs).toHaveCount(n + 1);
		await dongs.nth(n).locator('input').nth(1).fill('AUTOTEST_DONG_THEM');
		await expect(dongs.nth(n).locator('input').nth(1)).toHaveValue('AUTOTEST_DONG_THEM');
		await dongs.nth(n).locator('button:has(.anticon-delete)').click();
		await expect(dongs).toHaveCount(n);
		await expect(sua.locator('input[value="AUTOTEST_DONG_THEM"]')).toHaveCount(0);
	});

	test('27_071_005 — Huỷ giữa chừng khi đang đối soát', async ({ page }) => {
		const d = input('27_071_005');
		const truoc = await P.apiGoi(page, 'GET', `/po-invoice-reconcile/invoices/${d.invoiceId}`);
		const sua = await moSua(page, d);
		const oNguoiMua = sua.locator('#buyerName');
		const cu = await oNguoiMua.inputValue();
		await oNguoiMua.fill('AUTOTEST_NHAP_DO');
		await sua.locator('.ant-drawer-footer').getByRole('button', { name: 'Đóng' }).click();
		await expect(page.locator('.ant-drawer-open')).toHaveCount(0);
		const sau = await P.apiGoi(page, 'GET', `/po-invoice-reconcile/invoices/${d.invoiceId}`);
		expect(sau.body?.data?.invoice?.reconcileStatus).toBe(truoc.body?.data?.invoice?.reconcileStatus);
		expect(sau.body?.data?.invoice?.modifiedDate ?? null).toBe(truoc.body?.data?.invoice?.modifiedDate ?? null);
		const lai = await moSua(page, d, { timLai: false });
		await expect(lai.locator('#buyerName'), 'Mở lại vẫn giữ giá trị nhập dở').toHaveValue(cu);
	});
});
