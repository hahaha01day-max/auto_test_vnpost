'use strict';

/**
 * 13_1 · 070 gộp / 080 tách / 090_005 gửi lên TCT — vai `province` (tỉnh seed).
 *
 * Nguồn (vnpost-web af8cda07): `features/purchaseOrder/pages/{StockRequestListPage,StockRequestMergePage,
 * StockRequestSplitPage,StockRequestDetailPage}.jsx`. Danh sách: nút "+" (Thêm vào danh sách gộp) trên dòng →
 * nút "Gộp phiếu (n)"; nút tách trên dòng → `/inventory/purchase-request/split/:id`.
 * Phiếu tiền đề ("Đã duyệt" ở cấp xã) dựng trong case: phiên phụ CHT lập + gửi duyệt, phiên phụ `ward` duyệt.
 * 🔴 Phiếu KHÔNG xoá được ⇒ phiếu `AUTO TEST 13_1` / phiếu gộp, tách ở lại.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dx = require('./dx-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

const { phieuDaDuyet, moGop, moTach, bangTach, slGop, luuGop, oTach, nhapTach, theTach, guiTach } = require('./gop-tach-ghi');

test.describe('13_1 · gộp / tách phiếu đề xuất (tỉnh)', () => {
	test('13_1_070_001 — Kiểm tra hiển thị màn hình (gộp)', async ({ page, browser }) => {
		chanNeuTat('13_1_070_001');
		test.setTimeout(420_000);
		const ma = await phieuDaDuyet(browser, [2, 3]);
		await moGop(page, ma);
		const noi = dx.chuan(await page.locator('.ant-pro-page-container').innerText());
		test.info().annotations.push({ type: 'đo', description: noi.slice(0, 500) });
		for (const t of ['Thông tin chung', 'Danh sách sản phẩm sau khi gộp']) expect(noi, `Thiếu "${t}"`).toContain(t);
		for (const b of ['Huỷ', 'Lưu']) await expect(page.getByRole('button', { name: new RegExp(`^${b}$`) })).toBeVisible();
		await expect(page.locator('.anticon-arrow-left').first(), 'Không có nút Quay lại').toBeVisible();
		for (const m of ma) expect(noi, `Danh sách gộp thiếu phiếu ${m}`).toContain(m);
	});

	test('13_1_070_004 — Kiểm tra nút Huỷ (gộp)', async ({ page, browser }) => {
		chanNeuTat('13_1_070_004');
		test.setTimeout(420_000);
		const ma = await phieuDaDuyet(browser, [1, 1]);
		const bi = [];
		page.on('request', (r) => { if (/stock-requests\/merge/.test(r.url())) bi.push(r.url()); });
		await moGop(page, ma);
		await page.getByRole('button', { name: /^Huỷ$/ }).click();
		await page.waitForTimeout(1_500);
		expect(bi, 'Bấm Huỷ mà vẫn gửi request gộp').toEqual([]);
		await dx.moDs(page, 'province');
		for (const m of ma) await expect((await dx.timMa(page, m)).first()).toContainText('Đã duyệt');
	});

	test('13_1_070_005 — Kiểm tra nút Xoá phiếu khi có 2 phiếu', async ({ page, browser }) => {
		chanNeuTat('13_1_070_005');
		test.setTimeout(420_000);
		const ma = await phieuDaDuyet(browser, [1, 1]);
		await moGop(page, ma);
		const r = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ma[0] }).first();
		const tb = await dx.thongBaoQuanh(page, () => r.locator('button:has(.anticon-delete), button:has(.anticon-close)').first().click());
		test.info().annotations.push({ type: 'đo', description: tb });
		expect(tb).toContain('Danh sách gộp cần ít nhất 2 phiếu. Vui lòng quay lại danh sách để chọn thêm!');
	});

	test('13_1_070_002 — Kiểm tra Gộp phiếu đề xuất nhập hàng', async ({ page, browser }) => {
		chanNeuTat('13_1_070_002');
		test.setTimeout(420_000);
		const ma = await phieuDaDuyet(browser, [2, 3]);
		await moGop(page, ma);
		// Payload gộp (StockRequestMergePage) KHÔNG mang quantity — số lượng gộp là cột "Số lượng" trên bảng sau gộp.
		expect(await slGop(page), 'Số lượng gộp ≠ tổng các phiếu (2 + 3 = 5)').toBe(5);
		const { tb, body } = await luuGop(page);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, data: body?.data }).slice(0, 400) });
		expect(tb).toContain('Gộp phiếu thành công!');
		await dx.moDs(page, 'province');
		for (const m of ma) await expect((await dx.timMa(page, m)).first()).toContainText(/Đã gộp/);
	});

	test('13_1_080_001 — Kiểm tra hiển thị màn hình (tách)', async ({ page, browser }) => {
		chanNeuTat('13_1_080_001');
		test.setTimeout(300_000);
		const [ma] = await phieuDaDuyet(browser, [6]);
		await moTach(page, ma);
		const noi = dx.chuan(await page.locator('.ant-pro-page-container').innerText());
		test.info().annotations.push({ type: 'đo', description: noi.slice(0, 500) });
		for (const t of ['Thông tin chung phiếu gốc', 'Mã phiếu gốc', 'Danh sách phiếu tách', 'Tách sản phẩm']) expect(noi).toContain(t);
		for (const b of ['Huỷ', 'Lưu nháp', 'Gửi phê duyệt']) await expect(page.getByRole('button', { name: new RegExp(`${b}$`) }).first()).toBeVisible();
		expect(noi, 'Ô Cửa hàng/Kho hiện ID số (68152) thay vì tên').not.toMatch(/Cửa hàng\/Kho \d+/);
	});

	test('13_1_080_006 — Kiểm tra nút Xoá phiếu khi có 2 phiếu (tách)', async ({ page, browser }) => {
		chanNeuTat('13_1_080_006');
		test.setTimeout(300_000);
		const [ma] = await phieuDaDuyet(browser, [2]);
		await moTach(page, ma);
		const tb = await dx.thongBaoQuanh(page, () => page.getByRole('button').filter({ has: page.locator('.anticon-delete') }).first().click());
		test.info().annotations.push({ type: 'đo', description: tb });
		expect(tb).toContain('Yêu cầu chia thành ít nhất 2 phiếu');
	});

	test('13_1_080_005 — Kiểm tra nút Huỷ (tách)', async ({ page, browser }) => {
		chanNeuTat('13_1_080_005');
		test.setTimeout(300_000);
		const [ma] = await phieuDaDuyet(browser, [2]);
		const bi = [];
		page.on('request', (r) => { if (/stock-requests\/.+\/split/.test(r.url())) bi.push(r.url()); });
		await moTach(page, ma);
		await page.getByRole('button', { name: /^Huỷ$/ }).click();
		await page.waitForTimeout(1_500);
		expect(bi).toEqual([]);
		await dx.moDs(page, 'province');
		await expect((await dx.timMa(page, ma)).first()).toContainText('Đã duyệt');
	});

	test('13_1_080_002 — Kiểm tra Tách phiếu đề xuất nhập hàng nháp', async ({ page, browser }) => {
		chanNeuTat('13_1_080_002');
		test.setTimeout(300_000);
		const [ma] = await phieuDaDuyet(browser, [6]);
		await moTach(page, ma);
		const o = bangTach(page).locator('.ant-table-tbody tr.ant-table-row').first().locator('.ant-input-number-input');
		await o.nth(0).fill('4');
		await o.nth(0).press('Tab');
		const tuDien = await o.nth(1).inputValue();
		test.info().annotations.push({ type: 'đo', description: `phiếu 2 tự điền: ${tuDien} (13_1_080_009)` });
		if (!tuDien || tuDien === '0') { await o.nth(1).fill('2'); await o.nth(1).press('Tab'); }
		const cho = page.waitForResponse((r) => /stock-requests\/.+\/split|split/.test(r.url()) && r.request().method() !== 'GET', { timeout: 30_000 }).catch(() => null);
		const tb = await dx.thongBaoQuanh(page, () => page.getByRole('button', { name: /Lưu nháp$/ }).click());
		const res = await cho;
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, gui: res?.request().postData()?.slice(0, 400) }) });
		expect(tb).toContain('Tách phiếu thành công!');
		await dx.moDs(page, 'province');
		await expect((await dx.timMa(page, ma)).first()).toContainText(/Đã tách/);
	});

	test('13_1_080_009 — Kiểm tra tự đồng điền số lượng còn lại vào phiếu bên cạnh', async ({ page, browser }) => {
		chanNeuTat('13_1_080_009');
		test.setTimeout(300_000);
		const [ma] = await phieuDaDuyet(browser, [6]);
		await moTach(page, ma);
		const o = bangTach(page).locator('.ant-table-tbody tr.ant-table-row').first().locator('.ant-input-number-input');
		await o.nth(0).fill('4');
		await o.nth(0).press('Tab');
		await page.waitForTimeout(800);
		expect(await o.nth(1).inputValue(), 'Phiếu bên cạnh không tự điền số lượng còn lại (6 − 4 = 2)').toBe('2');
	});

	test('13_1_090_005 — Kiểm tra cấp Tỉnh gửi phiếu lên cấp TCT', async ({ page, browser }) => {
		chanNeuTat('13_1_090_005');
		test.setTimeout(300_000);
		const [ma] = await phieuDaDuyet(browser, [1]);
		// 🔴 Gửi lên TCT sinh PHIẾU MỚI mang mã TCT (drawer tự sinh), phiếu gốc thành "Đã gửi Tổng công ty".
		//    Bản cũ tìm MÃ GỐC ở vai TCT nên luôn đỏ oan.
		const kq = await require('../../13_3_dat_hang_va_nhap_hang/tests/tct-ghi').guiLenTct(page, ma);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb: kq.tb, maTct: kq.maTct }) });
		expect(kq.res?.status?.code == 200, `Gửi lên TCT lỗi: ${kq.tb}`).toBe(true);
		await dx.moDs(page, 'province');
		await expect((await dx.timMa(page, ma)).first()).toContainText(/Đã gửi Tổng công ty|Đã gửi TCT/);
		const t = await k.moPhienPhu(browser, 'tct', '/inventory/purchase-request');
		try {
			await dx.moDs(t.page, 'tct');
			const r = (await dx.timMa(t.page, kq.maTct)).first();
			await expect(r, `Gửi lên TCT mà TCT không thấy phiếu ${kq.maTct}`).toBeVisible({ timeout: 20_000 });
			test.info().annotations.push({ type: 'đo', description: `TCT thấy: ${dx.chuan(await r.innerText())}` });
		} finally { await t.dong(); }
	});

	test('13_1_070_003 — Kiểm tra Gộp phiếu các phiếu khác vào phiếu đã gộp', async ({ page, browser }) => {
		chanNeuTat('13_1_070_003');
		test.setTimeout(600_000);
		const [a, b, c] = await phieuDaDuyet(browser, [1, 2, 3]);
		await moGop(page, [a, b]);
		const l1 = await luuGop(page);
		expect(l1.tb, 'Gộp lần 1 không thành công').toContain('Gộp phiếu thành công!');
		let m = l1.body?.data?.code;
		if (!m) {
			await dx.moDs(page, 'province');
			await dx.timMa(page, '');
			const r = dx.dong(page).filter({ hasText: 'AUTO8_HUB' }).filter({ hasNotText: 'Đã gộp' }).first();
			m = dx.chuan(await r.locator('td').nth(1).innerText()).split(' ')[0];
		}
		test.info().annotations.push({ type: 'đo', description: `${a}+${b} → ${m} (response: ${JSON.stringify(l1.body?.data)?.slice(0, 200)})` });
		expect(m, 'Không xác định được mã phiếu đã gộp').toMatch(/^DX/);
		// Gộp phiếu đã gộp với phiếu C.
		await moGop(page, [m, c]);
		expect(await slGop(page), 'Số lượng sau gộp ≠ (1+2) + 3').toBe(6);
		const l2 = await luuGop(page);
		test.info().annotations.push({ type: 'đo', description: `lần 2: ${l2.tb} · ${JSON.stringify(l2.body?.data)?.slice(0, 200)}` });
		expect(l2.tb).toContain('Gộp phiếu thành công!');
		const m2 = l2.body?.data?.code;
		expect(m2, 'Response gộp lần 2 không trả mã phiếu mới').toMatch(/^DX/);
		await dx.moChiTiet(page, m2, 'province');
		await page.getByText('Lịch sử gộp, tách').click();
		const ls = page.locator('.ant-drawer-open').filter({ hasText: 'Lịch sử gộp / tách phiếu' }).last();
		await expect(ls.locator('.ant-timeline-item').first(), 'Lịch sử gộp / tách trống').toBeVisible({ timeout: 20_000 });
		const noi = dx.chuan(await ls.innerText());
		test.info().annotations.push({ type: 'đo', description: `Lịch sử ${m2}: ${noi.slice(0, 400)}` });
		expect(noi, 'Lịch sử không ghi lần gộp phiếu đã gộp').toContain(m);
		expect(noi).toContain(c);
	});

	test('13_1_070_006 — Kiểm tra nút Xoá phiếu khi có nhiều hơn 2 phiếu', async ({ page, browser }) => {
		chanNeuTat('13_1_070_006');
		test.setTimeout(600_000);
		const ma = await phieuDaDuyet(browser, [1, 2, 3]);
		await moGop(page, ma);
		expect(await slGop(page), 'Số lượng gộp 3 phiếu ≠ 1+2+3').toBe(6);
		const r = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ma[2] }).first();
		const tb = await dx.thongBaoQuanh(page, () => r.locator('button:has(.anticon-delete), button:has(.anticon-close)').first().click(), 4_000);
		test.info().annotations.push({ type: 'đo', description: `xoá ${ma[2]}: thông báo "${tb}"` });
		expect(tb, 'Còn 2 phiếu mà vẫn cảnh báo thiếu phiếu').not.toContain('cần ít nhất 2 phiếu');
		await expect(page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ma[2] })).toHaveCount(0);
		await expect.poll(() => slGop(page), { message: 'Xoá phiếu (3) mà số lượng sản phẩm không cập nhật về 1+2' }).toBe(3);
	});

	test('13_1_080_003 — Kiểm tra Tách phiếu đề xuất nhập hàng', async ({ page, browser }) => {
		chanNeuTat('13_1_080_003');
		test.setTimeout(300_000);
		const [ma] = await phieuDaDuyet(browser, [6]);
		await moTach(page, ma);
		const maCon = (await theTach(page).allInnerTexts()).map((t) => dx.chuan(t).match(/DX\S+|\S+$/)?.[0]);
		await nhapTach(page, [4, 2]);
		const { tb, gui } = await guiTach(page, 'Gửi phê duyệt');
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, maCon, gui }).slice(0, 500) });
		expect(tb).toContain('Tách phiếu thành công!');
		const q = (gui.splitGroups || []).map((g) => g.items.reduce((s, i) => s + i.quantity, 0));
		expect(q, 'Tổng sau tách ≠ phiếu gốc 6').toEqual([4, 2]);
		expect((gui.splitGroups || []).every((g) => g.status === 'PENDING')).toBe(true);
		await dx.moDs(page, 'province');
		await expect((await dx.timMa(page, ma)).first()).toContainText(/Đã tách/);
		for (const g of gui.splitGroups) await expect((await dx.timMa(page, g.code)).first(), `Phiếu tách ${g.code} không ở trạng thái Chờ duyệt`).toContainText('Chờ duyệt');
	});

	test('13_1_080_004 — Kiểm tra nút tách thêm phiếu', async ({ page, browser }) => {
		chanNeuTat('13_1_080_004');
		test.setTimeout(300_000);
		const [ma] = await phieuDaDuyet(browser, [6]);
		await moTach(page, ma);
		await expect(theTach(page)).toHaveCount(2);
		await page.getByRole('button', { name: /Tách thêm phiếu/ }).click();
		await expect(theTach(page), 'Bấm Tách thêm phiếu mà không thêm phiếu 3').toHaveCount(3);
		await expect(bangTach(page).locator('th').filter({ hasText: 'Phiếu 3' })).toHaveCount(1);
		await nhapTach(page, [3, 2, 1]);
		const { tb, gui } = await guiTach(page, 'Gửi phê duyệt');
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, gui }).slice(0, 500) });
		expect(tb).toContain('Tách phiếu thành công!');
		expect((gui.splitGroups || []).map((g) => g.items.reduce((s, i) => s + i.quantity, 0)), 'Tách không đúng số lượng đã chọn').toEqual([3, 2, 1]);
		await dx.moDs(page, 'province');
		for (const g of gui.splitGroups) await expect((await dx.timMa(page, g.code)).first(), `Phiếu tách ${g.code} không Chờ duyệt`).toContainText('Chờ duyệt');
	});

	test('13_1_080_007 — Kiểm tra nút Xoá phiếu khi có nhiều hơn 2 phiếu', async ({ page, browser }) => {
		chanNeuTat('13_1_080_007');
		test.setTimeout(300_000);
		const [ma] = await phieuDaDuyet(browser, [6]);
		await moTach(page, ma);
		await page.getByRole('button', { name: /Tách thêm phiếu/ }).click();
		await nhapTach(page, [3, 2, 1]);
		await expect(bangTach(page).getByText('Đã chia: 6/6')).toBeVisible();
		await theTach(page).nth(2).locator('button:has(.anticon-delete)').click();
		await expect(theTach(page), 'Xoá phiếu 3 mà số phiếu không giảm').toHaveCount(2);
		await expect(bangTach(page).locator('th').filter({ hasText: 'Phiếu 3' }), 'Bảng Tách sản phẩm còn cột Phiếu 3').toHaveCount(0);
		await expect(oTach(page)).toHaveCount(2);
		await expect(bangTach(page).getByText('Đã chia: 5/6'), 'Bảng không cập nhật số lượng đã chia sau khi xoá phiếu (3+2)').toBeVisible();
	});

	test('13_1_080_008 — Kiểm tra chỉnh sửa thông tin phiếu', async ({ page, browser }) => {
		chanNeuTat('13_1_080_008');
		test.setTimeout(300_000);
		const [ma] = await phieuDaDuyet(browser, [2]);
		await moTach(page, ma);
		const moi = `DXT${Date.now().toString().slice(-8)}`;
		await theTach(page).first().locator('button:has(.anticon-edit)').click();
		const hop = page.getByRole('dialog', { name: 'Phiếu 1' });
		await expect(hop).toBeVisible();
		await hop.getByPlaceholder('Nhập mã phiếu').fill(moi);
		await hop.getByPlaceholder('Nhập ghi chú').fill('AUTO TEST 13_1 sửa phiếu tách');
		await hop.getByRole('button', { name: /^Lưu$/ }).click();
		await expect(hop).toBeHidden();
		await expect(theTach(page).first(), 'Thẻ Phiếu 1 không hiện mã mới').toContainText(moi);
		await nhapTach(page, [1, 1]);
		const { tb, gui } = await guiTach(page, 'Lưu nháp');
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, gui }).slice(0, 500) });
		expect(tb).toContain('Tách phiếu thành công!');
		expect(gui.splitGroups?.[0]?.code).toBe(moi);
		expect(gui.splitGroups?.[0]?.note).toBe('AUTO TEST 13_1 sửa phiếu tách');
		await dx.moDs(page, 'province');
		await expect((await dx.timMa(page, moi)).first(), `Không có phiếu tách mang mã đã sửa ${moi}`).toBeVisible();
	});
});
