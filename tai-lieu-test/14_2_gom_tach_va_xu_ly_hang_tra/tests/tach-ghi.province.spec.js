'use strict';

/**
 * 14_2 · 020 — Tách phiếu theo nhà cung cấp, vai `province`.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `StockReturnRequestListPage.jsx` (`doSplit` — hộp "Tách phiếu theo nhà cung cấp?",
 * thông báo 1 nhóm, mở `SplitResultDrawer` khi có phiếu con), `SplitResultDrawer.jsx`, `ReturnRequestDetailDrawer.jsx`.
 * BE `ReturnRequestService.split`: tỉnh chỉ tách APPROVED (TCT thêm SEND_TO_TCT), phạm vi `orgUnitCode`, nhóm theo
 * NCC tỉnh (SP tự doanh của tỉnh) + một nhóm "TCT" cho hàng TCT; 1 nhóm ⇒ gán tại chỗ, không sinh phiếu con.
 * Tiền đề: `tien-de.province.spec.js` — TD1 (tự doanh, NCC tỉnh) + TC (hàng TCT, PO TCT) có nguồn ở điểm bán seed.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('./tra-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });

let pt = null;
let ps = null;
test.describe.configure({ timeout: 300_000 });
test.beforeEach(async ({ page, browser }) => {
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh(VAI, page, st);
	pt = { page, st };
});
// Phiên phụ mở MỘT lần cho cả file — đăng nhập lại mỗi test (vài chục lần/lượt) làm màn chọn phạm vi chập chờn.
test.beforeAll(async ({ browser }) => {
	ps = await t.k.moPhienPhu(browser, 'shop', t.ROUTE);
});
test.afterAll(async () => {
	await ps?.dong();
});

const hopTach = (page) => page.getByRole('dialog').filter({ hasText: 'Tách phiếu theo nhà cung cấp?' }).last();
const drKetQua = (page) => page.locator('.ant-drawer-open').filter({ hasText: 'Kết quả tách phiếu' }).last();
const dongMa = (page, ma) => t.dong(page).filter({ has: page.locator('td', { hasText: new RegExp(`^${ma}$`) }) }).first();

/** Tìm phiếu theo mã, Xử lý › Tách phiếu ⇒ trả hộp xác nhận. */
async function moHopTach(page, ma) {
	await t.timMa(page, ma);
	await t.bamMenu(page, dongMa(page, ma), 'Tách phiếu');
	await expect(hopTach(page), 'Không hiện hộp "Tách phiếu theo nhà cung cấp?"').toBeVisible();
	return hopTach(page);
}

/** Tách qua giao diện (bấm OK). Trả { tb, body }. */
async function tachUi(page, ma) {
	const hop = await moHopTach(page, ma);
	const cho = page.waitForResponse((r) => /\/split$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', { timeout: 30_000 });
	const tb = await t.thongBao(page, () => hop.getByRole('button', { name: /OK|Đồng ý/ }).click(), 6_000);
	return { tb, body: await (await cho).json() };
}

async function trangThai(page, ma) {
	await t.timMa(page, ma);
	return t.chuan(await dongMa(page, ma).locator('.ant-tag').last().innerText());
}

/** Phiếu hỗn hợp TD1 + TC đã tách qua UI — dùng chung cho 001/002/006/007/008 trong một lượt. */
let honHop = null;
async function tachHonHop(page, browser) {
	if (honHop) return honHop;
	const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1', 'TC'], sl: 1 });
	const { tb, body } = await tachUi(page, p.code);
	expect(String(body?.status?.code), `Tách phiếu hỗn hợp lỗi: ${body?.status?.message}`).toBe('200');
	honHop = { ...p, tb, con: body.data };
	ghi(`tách ${p.code} → ${body.data.map((c) => `${c.code}/${c.status}/${c.supplierName}`).join(', ')}`);
	return honHop;
}

test.describe('14_2 · 020 — Tách phiếu', () => {
	test('14_2_020_001 — Tách phiếu nhiều nhà cung cấp sinh ra phiếu con', async ({ page, browser }) => {
		chanNeuTat('14_2_020_001');
		const h = await tachHonHop(page, browser);
		expect(h.con.length, 'Phiếu 2 nguồn (NCC tỉnh + TCT) không sinh 2 phiếu con').toBe(2);
		const dr = drKetQua(page);
		await expect(dr, 'Không mở màn "Kết quả tách phiếu"').toBeVisible({ timeout: 15_000 });
		await expect(dr).toContainText('Đã tách thành 2 phiếu theo nhà cung cấp');
		for (const c of h.con) {
			const the = dr.locator('.rounded-lg').filter({ hasText: c.code }).first();
			await expect(the, `Màn kết quả thiếu phiếu con ${c.code}`).toBeVisible();
			await expect(the).toContainText('Nhà cung cấp');
			await expect(the).toContainText(c.supplierName || 'Tổng công ty');
			await expect(the).toContainText('Tổng tiền');
			await expect(the).toContainText(Number(c.totalAmount).toLocaleString('vi-VN'));
		}
		await dr.getByRole('button', { name: 'Đóng' }).last().click();
		expect(await trangThai(page, h.code), 'Phiếu gốc không sang "Đã tách phiếu"').toBe('Đã tách phiếu');
	});

	test('14_2_020_002 — Mở thẳng chi tiết một phiếu con từ màn kết quả tách', async ({ page, browser }) => {
		chanNeuTat('14_2_020_002');
		honHop = null;
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1', 'TC'], sl: 1 });
		// Mở chi tiết phiếu gốc trước để kiểm "drawer chi tiết phiếu gốc đã đóng".
		await t.timMa(page, p.code);
		const drGoc = await t.moChiTiet(page, dongMa(page, p.code));
		await drGoc.locator('.ant-drawer-close').first().click();
		const { body } = await tachUi(page, p.code);
		expect(String(body?.status?.code)).toBe('200');
		const c = body.data[0];
		const dr = drKetQua(page);
		await expect(dr).toBeVisible({ timeout: 15_000 });
		await dr.locator('.rounded-lg').filter({ hasText: c.code }).getByRole('button', { name: 'Xem chi tiết' }).click();
		const ct = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu xuất trả NCC' }).last();
		await expect(ct, 'Bấm "Xem chi tiết" không mở chi tiết phiếu con').toBeVisible({ timeout: 20_000 });
		await expect(ct.locator('.ant-descriptions')).toContainText(c.code);
		expect(await page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu xuất trả NCC' }).count(), 'Còn nhiều hơn một drawer chi tiết đang mở').toBe(1);
		await expect(ct.locator('.ant-descriptions'), 'Drawer chi tiết đang mở là của phiếu gốc').not.toContainText(new RegExp(`${p.code}(?!-)`));
	});

	test('14_2_020_003 — Nội dung hộp xác nhận tách đổi theo cấp', async ({ page, browser }) => {
		chanNeuTat('14_2_020_003');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		const hop = await moHopTach(page, p.code);
		await expect(hop).toContainText('Hệ thống sẽ tách sản phẩm tự doanh theo NCC cấp tỉnh và tách riêng hàng Tổng công ty.');
		await hop.getByRole('button', { name: /Cancel|Huỷ|Hủy/ }).click();
		await expect(hop).not.toContainText('theo đúng nhà cung cấp ban đầu');
		// Câu của cấp TCT kiểm ở `tct-ghi.tct.spec.js` (cùng mã case, vai tct).
	});

	test('14_2_020_004 — Phiếu chỉ một nhà cung cấp thì gán tại chỗ, không tạo phiếu con', async ({ page, browser }) => {
		chanNeuTat('14_2_020_004');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		const { tb, body } = await tachUi(page, p.code);
		expect(String(body?.status?.code)).toBe('200');
		expect(tb).toContain(`Phiếu chỉ có 1 nhà cung cấp — đã gán: ${t.seed.doc().duLieu.tuDoanhTinh.tenNcc}`);
		await expect(drKetQua(page), 'Phiếu 1 NCC mà vẫn mở màn Kết quả tách').toHaveCount(0);
		expect(body.data.length).toBe(1);
		expect(body.data[0].id, 'Phiếu 1 NCC mà sinh phiếu mới').toBe(p.id);
		expect(await trangThai(page, p.code)).toBe('Chưa trả hàng');
		await expect(dongMa(page, p.code)).toContainText(t.seed.doc().duLieu.tuDoanhTinh.tenNcc);
	});

	test('14_2_020_005 — Phiếu toàn hàng Tổng công ty chuyển thẳng sang Chưa gửi TCT', async ({ page, browser }) => {
		chanNeuTat('14_2_020_005');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TC'], sl: 1 });
		const { tb, body } = await tachUi(page, p.code);
		expect(String(body?.status?.code)).toBe('200');
		expect(tb).toContain("Phiếu chỉ gồm sản phẩm của Tổng công ty — đã chuyển 'Chưa gửi TCT'");
		await expect(drKetQua(page)).toHaveCount(0);
		expect(await trangThai(page, p.code)).toBe('Chưa gửi TCT');
	});

	test('14_2_020_006 — Phiếu con mang đúng hai loại nhãn theo nguồn hàng', async ({ page, browser }) => {
		chanNeuTat('14_2_020_006');
		const h = await tachHonHop(page, browser);
		const dr = drKetQua(page);
		if (await dr.count()) await dr.getByRole('button', { name: 'Đóng' }).last().click();
		const td = h.con.find((c) => c.supplierLevel === 'TINH');
		const tct = h.con.find((c) => c.supplierLevel === 'TCT');
		expect(td && tct, `Không đủ 2 loại phiếu con: ${JSON.stringify(h.con.map((c) => c.supplierLevel))}`).toBeTruthy();
		expect(await trangThai(page, td.code), 'Phiếu con tự doanh sai nhãn').toBe('Chưa trả hàng');
		expect(await trangThai(page, tct.code), 'Phiếu con hàng TCT sai nhãn').toBe('Chưa gửi TCT');
	});

	test('14_2_020_007 — Mã phiếu con bắt đầu bằng mã phiếu gốc', async ({ page, browser }) => {
		chanNeuTat('14_2_020_007');
		const h = await tachHonHop(page, browser);
		const dr = drKetQua(page);
		if (await dr.count()) await dr.getByRole('button', { name: 'Đóng' }).last().click();
		await t.timMa(page, h.code);
		const ma = (await t.dong(page).locator('td:nth-child(3)').allInnerTexts()).map(t.chuan);
		ghi(`tìm ${h.code}: ${ma.join(', ')}`);
		expect(ma, 'Kết quả tìm không có phiếu gốc').toContain(h.code);
		h.con.forEach((c, i) => {
			expect(c.code, 'Mã phiếu con không phải mã gốc + đuôi số').toBe(`${h.code}-${i + 1}`);
			expect(ma, `Kết quả tìm thiếu phiếu con ${c.code}`).toContain(c.code);
		});
	});

	test('14_2_020_008 — Đóng nhầm màn Kết quả tách phiếu không mất gì', async ({ page, browser }) => {
		chanNeuTat('14_2_020_008');
		honHop = null;
		const h = await tachHonHop(page, browser);
		const dr = drKetQua(page);
		await expect(dr).toBeVisible({ timeout: 15_000 });
		await dr.locator('.ant-drawer-close').first().click();
		await expect(dr).toBeHidden();
		await t.timMa(page, h.code);
		for (const c of h.con) await expect(dongMa(page, c.code), `Đóng màn kết quả xong mất phiếu con ${c.code}`).toBeVisible();
	});

	test('14_2_020_009 — Tách phiếu chưa ở trạng thái Đã duyệt bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_020_009');
		const p = await t.taoPhieuApi(ps.page, ps.st, { items: [t.dongTuLo(await t.loNguon(ps.page, ps.st, t.nguon().TD1, 1), 1)], note: 'AUTO TEST 14_2 020_009' });
		try {
			const b = await t.goi(pt, `/${p.id}/split`);
			expect(t.msg(b)).toBe('Phiếu chưa ở trạng thái có thể tách');
		} finally {
			await t.donPhieu(browser, ps, p.id);
		}
	});

	test('14_2_020_011 — Cấp tỉnh không tách được phiếu Đã gửi TCT', async () => {
		chanNeuTat('14_2_020_011');
		const ds = (await t.doc(pt, '', { status: 'SEND_TO_TCT', page: 0, size: 20 }))?.data || [];
		expect(ds.length, 'Tỉnh chưa có phiếu "Đã gửi TCT" — chạy 050_001 trước').toBeGreaterThan(0);
		const b = await t.goi(pt, `/${ds[0].id}/split`);
		expect(t.msg(b)).toBe('Phiếu chưa ở trạng thái có thể tách');
	});

	test('14_2_020_013 — Cấp tỉnh không tách được phiếu của tỉnh khác', async () => {
		chanNeuTat('14_2_020_013');
		// Phiếu #46 (Chờ duyệt) của điểm bán làn 5 (tỉnh AUTO5_T, cùng pod) — tiền đề phạm vi để lại từ 14_1.
		const b = await t.goi(pt, '/46/split');
		expect(t.msg(b)).toBe('Phiếu không thuộc phạm vi tỉnh của bạn');
	});

	test('14_2_020_014 — Tách phiếu không có sản phẩm bị chặn', async () => {
		chanNeuTat('14_2_020_014');
		// BE `create` chặn "Phiếu trả không có sản phẩm", gom bỏ dòng SL 0 và chặn khi rỗng ⇒ không có đường nào tạo ra
		// phiếu Đã duyệt không còn dòng hàng. Kiểm lại chính hai cửa đó thay cho tiền đề không dựng được.
		const b = await t.k.goiGhi(ps.page, ps.st, 'POST', t.API, {}, { shopId: t.seed.doc().duLieu.diemBan.shopId, sourceType: 'BY_SKU', note: 'AUTO TEST 14_2 020_014', items: [], draft: false });
		expect(t.msg(b), 'BE cho tạo phiếu trả rỗng — tiền đề 020_014 dựng được, cần viết lại case').toBe('Phiếu trả không có sản phẩm');
		test.info().annotations.push({ type: 'không dựng được tiền đề', description: 'Phiếu Đã duyệt 0 dòng hàng không tạo được qua bất kỳ API nào ⇒ nhánh "Phiếu không có sản phẩm để tách" chỉ là phòng thủ.' });
	});

	test('14_2_020_015 — Phiếu đã tách không sửa và không huỷ được', async ({ page, browser }) => {
		chanNeuTat('14_2_020_015');
		const h = await tachHonHop(page, browser);
		const dr = drKetQua(page);
		if (await dr.count()) await dr.getByRole('button', { name: 'Đóng' }).last().click();
		await t.timMa(page, h.code);
		const m = (await t.menuXuLy(page, dongMa(page, h.code))) || [];
		ghi(`menu phiếu Đã tách: ${JSON.stringify(m)}`);
		for (const n of ['Sửa', 'Huỷ phiếu', 'Từ chối']) expect(m.map((x) => x.nhan), `Phiếu đã tách còn mục "${n}"`).not.toContain(n);
		const b = await t.goi(pt, `/${h.id}/cancel`, {});
		expect(t.msg(b)).toBe('Không thể hủy phiếu đã xử lý/đã tách/đã gom');
	});

	test('14_2_020_016 — Đóng hộp xác nhận tách không tách gì', async ({ page, browser }) => {
		chanNeuTat('14_2_020_016');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'POST' && /\/split$/.test(r.url().split('?')[0])) daGoi.push(r.url()); });
		const hop = await moHopTach(page, p.code);
		await hop.getByRole('button', { name: /Cancel|Huỷ|Hủy/ }).click();
		await expect(hop).toBeHidden();
		await page.waitForTimeout(1_500);
		expect(daGoi, 'Bấm Huỷ mà vẫn gửi POST split').toEqual([]);
		expect((await t.chiTietPhieu(pt.page, pt.st, p.id)).request.status).toBe('APPROVED');
	});

	test('14_2_020_017 — Tách phiếu thất bại hiện thông báo của backend', async ({ page, browser }) => {
		chanNeuTat('14_2_020_017');
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
		// 🔴 Không dựng được dòng tự doanh "mất truy xuất nguồn gốc" (mọi lô TD1 đều sinh từ PO) ⇒ giả lập response lỗi
		//    của `/split` để kiểm đúng phần FE: hiện chuỗi BE, rỗng thì câu dự phòng. Phiếu không bị tách thật.
		const CAU = 'Không xác định được nhà cung cấp ban đầu của sản phẩm "X": (giả lập auto test)';
		for (const [msg, mongDoi] of [[CAU, CAU], [null, 'Không tách được phiếu']]) {
			await page.route('**/split', (r) => r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ status: { code: '400', message: msg } }) }));
			const hop = await moHopTach(page, p.code);
			const tb = await t.thongBao(page, () => hop.getByRole('button', { name: /OK|Đồng ý/ }).click(), 6_000);
			await page.unroute('**/split');
			expect(tb, `BE trả message=${JSON.stringify(msg)} mà FE không hiện "${mongDoi}"`).toContain(mongDoi);
			await page.keyboard.press('Escape');
		}
		expect((await t.chiTietPhieu(pt.page, pt.st, p.id)).request.status).toBe('APPROVED');
		test.info().annotations.push({ type: 'giả lập', description: 'Response /split bị thay bằng lỗi 400 (không đổi dữ liệu).' });
	});
});
