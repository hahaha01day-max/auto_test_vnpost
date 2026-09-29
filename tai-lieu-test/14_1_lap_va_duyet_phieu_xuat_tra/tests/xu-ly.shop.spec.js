'use strict';

/**
 * 14_1 · 020 / 030 / 040_006 / 050 — vai `shop`: danh sách phiếu trả, menu "Xử lý", sửa / nộp / huỷ, chi tiết.
 * Tiền đề tạo bằng API (`taoPhieuApi`, payload đối chiếu request thật) rồi thao tác trên GIAO DIỆN.
 * Dọn: `donPhieu` trong finally (Nháp/Chờ duyệt ⇒ huỷ; Xã đã duyệt ⇒ tỉnh từ chối).
 * Nguồn FE: `StockReturnRequestListPage.jsx`, `StockReturnRequestFormPage.jsx`, `ReturnRequestDetailDrawer.jsx`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const r = require('./return-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const sd = () => r.seed.doc().duLieu;
const shopId = () => sd().diemBan.shopId;
/**
 * Phiếu của điểm bán KHÁC: #45 Nháp, #46 Chờ duyệt — điểm bán seed làn 5 (shop 68150, tỉnh AUTO5_T), tạo bằng
 * API ngày 24/09/2026 cho đúng tiền đề (phiếu của 68038 đều đã qua Nháp/Chờ duyệt ⇒ BE chặn theo trạng thái trước).
 */
const PHIEU_KHAC_NHAP = 45;
const PHIEU_KHAC_CHO = 46;

let st;
let ps;
const tao = [];

async function mo(page) {
	st = r.k.batHeader(page);
	ps = { page, st };
	r.datPhienChinh('shop', page, st);
	await r.moDanhSach(page, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
}
async function taoP(opt) {
	const p = await r.taoPhieuApi(ps.page, st, opt);
	tao.push(p.id);
	return p;
}
async function dongMa(page, code) {
	await r.timMa(page, code);
	const d = r.dong(page).filter({ hasText: code }).first();
	await expect(d, `Không thấy phiếu ${code} trên danh sách`).toBeVisible({ timeout: 20_000 });
	return d;
}

test.describe('14_1 — Danh sách, sửa, nộp, huỷ phiếu trả (điểm bán)', () => {
	test.describe.configure({ timeout: 240_000 });

	test.beforeEach(async ({ page }) => {
		tao.length = 0;
		await mo(page);
	});
	test.afterEach(async ({ browser }) => {
		for (const id of tao) await r.donPhieu(browser, ps, id);
	});

	test('14_1_020_001 — Menu Xử lý của phiếu Nháp có đủ ba việc', async ({ page }) => {
		chanNeuTat('14_1_020_001');
		const p = await taoP({ draft: true });
		const m = await r.menuXuLy(page, await dongMa(page, p.code));
		expect(m.map((x) => x.nhan)).toEqual(['Sửa', 'Nộp phiếu', 'Huỷ phiếu']);
		expect(m.find((x) => x.nhan === 'Huỷ phiếu').nguyHiem, 'Mục "Huỷ phiếu" không màu đỏ').toBe(true);
	});

	test('14_1_020_002 — Màn sửa phiếu nháp mở sẵn nguồn SKU và nút Nộp phiếu', async ({ page }) => {
		chanNeuTat('14_1_020_002');
		const p = await taoP({ draft: true });
		await r.bamMenu(page, await dongMa(page, p.code), 'Sửa');
		await expect(page).toHaveURL(new RegExp(`/inventory/stock-return-request/edit/${p.id}$`));
		const box = r.khung(page);
		await expect(box.locator('.ant-radio-button-wrapper-checked')).toHaveText('Theo SKU / Mã lô / Serial');
		await expect(r.nutFooter(page, 'Nộp phiếu (chờ duyệt)')).toBeVisible();
		await expect(r.nutFooter(page, 'Tạo phiếu (chờ duyệt)')).toHaveCount(0);
	});

	test('14_1_020_003 — Lưu sửa thay toàn bộ danh sách hàng chứ không cộng thêm', async ({ page }) => {
		chanNeuTat('14_1_020_003');
		const p = await taoP({ draft: true, soDong: 3 });
		await r.bamMenu(page, await dongMa(page, p.code), 'Sửa');
		const box = r.khung(page);
		await expect(r.hang(box)).toHaveCount(3, { timeout: 20_000 });
		const xoa = r.chuan(await r.hang(box).first().locator('td').nth(1).innerText());
		await r.hang(box).first().locator('button.ant-btn-dangerous').click();
		await expect(r.hang(box)).toHaveCount(2);
		const tb = await r.bam(page, 'Lưu nháp');
		expect(tb).toContain('Đã lưu nháp');
		const ct = await r.chiTietPhieu(page, st, p.id);
		expect(ct.items.length, 'Sau khi xoá 1 dòng và lưu, phiếu không còn đúng 2 dòng').toBe(2);
		expect(ct.items.map((x) => x.productSku).join(' '), `Dòng đã xoá (${xoa}) còn trên phiếu`).not.toContain(xoa.split(' ')[0]);
		const tong = ct.items.reduce((s, x) => s + Number(x.quantity) * Number(x.price || 0), 0);
		expect(Number(ct.request.totalAmount), 'Tổng tiền không tính lại theo giá gốc lô').toBeCloseTo(tong, 0);
	});

	test('14_1_020_004 — Sửa phiếu Chờ duyệt bị kiểm lại tồn kho', async ({ page }) => {
		chanNeuTat('14_1_020_004');
		const p = await taoP({ draft: false });
		const [dong] = await r.dongDauKy(page, st, { sl: 1 });
		const ton = (await r.loCon(page, st, shopId(), dong.productId, dong.variantId)).filter((l) => l.batchCode === dong.batchCode).reduce((s, l) => s + Number(l.remainQuantity), 0);
		const it = { ...dong, productName: dong.productName };
		// 🔴 Ô SL trên màn sửa có max = tồn ⇒ không gõ vượt được; gửi đúng payload của nút "Nộp phiếu" bằng API.
		const body = await r.k.goiGhi(page, st, 'PUT', `${r.API}/${p.id}`, {}, {
			shopId: shopId(), sourceType: 'BY_SKU', note: 'Hàng bán chậm', draft: false, items: [{ ...dong, quantity: ton + 5 }],
		});
		// Tên SP trong thông báo kèm biến thể, vd "AUTO8_SP_BT (Màu: Đỏ)".
		const ten = it.variantName && it.variantName !== 'Mặc định' ? `${it.productName} (${it.variantName})` : it.productName;
		expect(r.msg(body)).toBe(
			`Sản phẩm "${ten}" trong kho điểm bán chỉ còn ${ton}, không đủ để trả (${ton + 5}). Vui lòng kiểm tra lại tồn kho.`,
		);
	});

	test('14_1_020_005 — Nộp phiếu Nháp chưa có sản phẩm bị chặn', async ({ page }) => {
		chanNeuTat('14_1_020_005');
		const p = await taoP({ draft: true, items: [] });
		const d = await dongMa(page, p.code);
		await r.bamMenu(page, d, 'Nộp phiếu');
		await page.locator('.ant-modal-confirm').filter({ hasText: 'Nộp phiếu nháp?' }).getByRole('button', { name: /OK|Đồng ý/ }).click();
		const loi = page.locator('.ant-modal-confirm-error');
		await expect(loi).toContainText('Không nộp được phiếu');
		await expect(loi).toContainText('Phiếu nháp chưa có sản phẩm để nộp');
		expect((await r.chiTietPhieu(page, st, p.id)).request.status).toBe('DRAFT');
	});

	test('14_1_020_006 — Nộp phiếu Nháp từ menu chuyển sang Chờ duyệt', async ({ page }) => {
		chanNeuTat('14_1_020_006');
		const p = await taoP({ draft: true });
		const d = await dongMa(page, p.code);
		await r.bamMenu(page, d, 'Nộp phiếu');
		const tb = await r.thongBao(page, () =>
			page.locator('.ant-modal-confirm').filter({ hasText: 'Nộp phiếu nháp?' }).getByRole('button', { name: /OK|Đồng ý/ }).click(),
		);
		expect(tb).toContain('Đã nộp phiếu');
		await expect(d.locator('.ant-tag')).toHaveText('Chờ duyệt', { timeout: 20_000 });
		const m = await r.menuXuLy(page, d);
		expect(m.map((x) => x.nhan), 'Phiếu đã nộp vẫn còn mục "Nộp phiếu"').not.toContain('Nộp phiếu');
	});

	test('14_1_020_007 — Nộp lại phiếu đã ở Chờ duyệt không tạo phiếu trùng', async ({ page }) => {
		chanNeuTat('14_1_020_007');
		const p = await taoP({ draft: false });
		const tong = async () => (await r.k.goiApi(page, st, r.API, { page: 0, size: 1 })).page.total_elements;
		const truoc = await tong();
		const b = await r.k.goiGhi(page, st, 'POST', `${r.API}/${p.id}/submit`);
		expect(r.msg(b)).toBe('Chỉ nộp được phiếu đang ở trạng thái Nháp');
		expect(await tong()).toBe(truoc);
		expect((await r.chiTietPhieu(page, st, p.id)).request.status).toBe('PENDING');
	});

	test('14_1_020_008 — Không sửa được phiếu đã duyệt', async ({ page, browser }) => {
		chanNeuTat('14_1_020_008');
		const p = await taoP({ draft: false });
		await r.duyetDu(browser, 'ward', p.id);
		await r.duyetDu(browser, 'province', p.id);
		const tb = await r.thongBao(page, () => r.diToi(page, `/inventory/stock-return-request/edit/${p.id}`), 15_000);
		expect(tb).toContain('Chỉ sửa được phiếu ở trạng thái Nháp hoặc Chờ duyệt');
		await expect(page).toHaveURL(new RegExp(`${r.ROUTE}$`), { timeout: 15_000 });
		const b = await r.k.goiGhi(page, st, 'PUT', `${r.API}/${p.id}`, {}, { shopId: shopId(), sourceType: 'BY_SKU', note: 'x', draft: true, items: [] });
		expect(r.msg(b)).toBe('Chỉ sửa được phiếu đang ở trạng thái Nháp hoặc Chờ duyệt');
	});

	test('14_1_020_009 — Không sửa được phiếu của điểm bán khác', async ({ page }) => {
		chanNeuTat('14_1_020_009');
		const b = await r.k.goiGhi(page, st, 'PUT', `${r.API}/${PHIEU_KHAC_CHO}`, {}, { shopId: shopId(), sourceType: 'BY_SKU', note: 'x', draft: true, items: [] });
		expect(r.msg(b)).toBe('Không có quyền sửa phiếu của điểm bán khác');
	});

	test('14_1_020_010 — Không nộp được phiếu nháp của điểm bán khác', async ({ page }) => {
		chanNeuTat('14_1_020_010');
		const b = await r.k.goiGhi(page, st, 'POST', `${r.API}/${PHIEU_KHAC_NHAP}/submit`);
		expect(r.msg(b)).toBe('Không có quyền nộp phiếu nháp của điểm bán khác');
	});

	test('14_1_020_011 — Rời màn sửa không lưu thay đổi', async ({ page }) => {
		chanNeuTat('14_1_020_011');
		const p = await taoP({ draft: true, soDong: 3 });
		await r.bamMenu(page, await dongMa(page, p.code), 'Sửa');
		const box = r.khung(page);
		await expect(r.hang(box)).toHaveCount(3, { timeout: 20_000 });
		await r.hang(box).first().locator('button.ant-btn-dangerous').click();
		await expect(r.hang(box)).toHaveCount(2);
		await page.locator('.ant-page-header-heading-title button').first().click();
		await expect(page).toHaveURL(new RegExp(`${r.ROUTE}$`));
		expect((await r.chiTietPhieu(page, st, p.id)).items.length).toBe(3);
	});

	test('14_1_020_012 — Ma trận trạng thái phiếu và việc Sửa', async ({ page, browser }) => {
		chanNeuTat('14_1_020_012');
		// Dựng được bằng luồng 14_1: Nháp · Chờ duyệt · Xã đã duyệt · Đã duyệt · Từ chối · Đã huỷ.
		const nhap = await taoP({ draft: true });
		const cho = await taoP({ draft: false });
		const xa = await taoP({ draft: false });
		await r.duyetDu(browser, 'ward', xa.id);
		const tinh = await taoP({ draft: false });
		await r.duyetDu(browser, 'ward', tinh.id);
		await r.duyetDu(browser, 'province', tinh.id);
		const tc = await taoP({ draft: false });
		expect(String((await r.goiDuyet(browser, 'ward', tc.id, { approved: false, description: 'AUTO TEST 020_012' }))?.status?.code)).toBe('200');
		const huy = await taoP({ draft: false });
		await r.huyPhieu(page, st, huy.id);
		const kq = {};
		for (const [ten, p] of Object.entries({ Nháp: nhap, 'Chờ duyệt': cho, 'Xã đã duyệt': xa, 'Đã duyệt': tinh, 'Từ chối': tc, 'Đã huỷ': huy })) {
			const m = await r.menuXuLy(page, await dongMa(page, p.code));
			kq[ten] = (m || []).some((x) => x.nhan === 'Sửa');
		}
		expect(kq).toEqual({ Nháp: true, 'Chờ duyệt': true, 'Xã đã duyệt': false, 'Đã duyệt': false, 'Từ chối': false, 'Đã huỷ': false });
		// Đã gom / Đã tách / Xử lý một phần / Đã xử lý xong: dựng ở 14_2 — ghi rõ phần chưa phủ.
		test.info().annotations.push({ type: 'phạm vi', description: 'Chưa phủ 4 trạng thái của luồng gom/tách (14_2): Đã gom phiếu, Đã tách phiếu, Xử lý một phần, Đã xử lý xong' });
	});

	test('14_1_030_001 — Mở danh sách Xuất trả NCC khi có dữ liệu', async ({ page }) => {
		chanNeuTat('14_1_030_001');
		await taoP({ draft: true });
		const body = await r.k.goiApi(page, st, r.API, { page: 0, size: 20 });
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Xuất trả nhà cung cấp');
		await expect(r.dong(page).first()).toBeVisible();
		expect(body.data.length).toBeGreaterThan(0);
		const t = body.data.map((x) => new Date(x.createdDate).getTime());
		expect(t, 'Danh sách không sắp mới nhất trước').toEqual([...t].sort((a, b) => b - a));
	});

	test('14_1_030_002 — Danh sách hiện đủ 9 cột', async ({ page }) => {
		chanNeuTat('14_1_030_002');
		const p = await taoP({ draft: true });
		const d = await dongMa(page, p.code);
		const th = (await r.cot(page).allInnerTexts()).map(r.chuan).filter(Boolean);
		expect(th).toEqual(['STT', 'Mã phiếu', 'Mã PO tham chiếu', 'Nhà cung cấp', 'Tỉnh / Xã', 'Tổng tiền', 'Trạng thái', 'Ngày tạo', 'Hành động']);
		expect(r.chuan(await d.locator('td').nth(2).innerText())).toBe('--');
	});

	test('14_1_030_003 — Lọc theo Trạng thái trả đúng tập phiếu', async ({ page }) => {
		chanNeuTat('14_1_030_003');
		await taoP({ draft: true });
		await taoP({ draft: false });
		await r.khung(page).locator('.ant-form-item').first().locator('.ant-select').click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="Chờ duyệt"]').click();
		const { url } = await r.bamTimKiem(page);
		expect(url.searchParams.get('status')).toBe('PENDING');
		const tags = (await r.dong(page).locator('td .ant-tag').allInnerTexts()).map(r.chuan);
		expect(tags.length).toBeGreaterThan(0);
		expect(new Set(tags)).toEqual(new Set(['Chờ duyệt']));
	});

	test('14_1_030_004 — Tìm theo mã phiếu khớp chính xác', async ({ page }) => {
		chanNeuTat('14_1_030_004');
		const p = await taoP({ draft: true });
		await r.timMa(page, p.code);
		await expect(r.dong(page)).toHaveCount(1);
		expect(r.chuan(await r.dong(page).first().locator('td').nth(1).innerText())).toBe(p.code);
	});

	test('14_1_030_005 — Tìm theo một phần mã phiếu', async ({ page }) => {
		chanNeuTat('14_1_030_005');
		const p = await taoP({ draft: true });
		const giua = p.code.slice(5, 9);
		const { body } = await r.timMa(page, giua);
		expect(body.data.map((x) => x.code), `Tìm "${giua}" không ra phiếu ${p.code}`).toContain(p.code);
		for (const x of body.data) expect(x.code).toContain(giua);
	});

	test('14_1_030_006 — Tìm mã phiếu không tồn tại ra danh sách rỗng', async ({ page }) => {
		chanNeuTat('14_1_030_006');
		const tb = await r.thongBao(page, () => r.timMa(page, 'ZZZ999999'), 3_000);
		await expect(r.dong(page)).toHaveCount(0);
		await expect(r.khung(page).locator('.ant-empty')).toBeVisible();
		expect(tb).toBe('');
	});

	test('14_1_030_007 — Tìm bằng chuỗi toàn khoảng trắng', async ({ page }) => {
		chanNeuTat('14_1_030_007');
		const tong = (await r.k.goiApi(page, st, r.API, { page: 0, size: 1 })).page.total_elements;
		const { url, body } = await r.timMa(page, '     ');
		expect(body.page.total_elements, `Chuỗi toàn khoảng trắng không được trim (keyword="${url.searchParams.get('keyword')}")`).toBe(tong);
	});

	test('14_1_030_008 — Tìm bằng ký tự đặc biệt không gây lỗi', async ({ page }) => {
		chanNeuTat('14_1_030_008');
		const sai = [];
		page.on('response', (x) => { if (x.url().includes(r.API) && x.status() >= 500) sai.push(x.status()); });
		const tb = await r.thongBao(page, () => r.timMa(page, "' OR 1=1 --"), 3_000);
		await expect(r.dong(page)).toHaveCount(0);
		expect(sai).toEqual([]);
		expect(tb).toBe('');
	});

	test('14_1_030_009 — Tìm không phân biệt hoa thường', async ({ page }) => {
		chanNeuTat('14_1_030_009');
		const p = await taoP({ draft: true });
		const { body } = await r.timMa(page, p.code.toLowerCase());
		expect(body.data.map((x) => x.code), 'Tìm mã chữ thường không ra phiếu').toContain(p.code);
	});

	test('14_1_030_010 — Lọc theo khoảng ngày tạo', async ({ page }) => {
		chanNeuTat('14_1_030_010');
		await taoP({ draft: true });
		const hom = new Date();
		const f = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
		const o = r.khung(page).locator('.ant-picker-range input');
		await o.first().click();
		await o.first().fill(f(hom));
		await o.last().fill(f(hom));
		await page.keyboard.press('Enter');
		const { url, body } = await r.bamTimKiem(page);
		const ngay = hom.toISOString().slice(0, 10);
		expect([url.searchParams.get('fromDate'), url.searchParams.get('toDate')]).toEqual([ngay, ngay]);
		expect(body.data.length).toBeGreaterThan(0);
		for (const x of body.data) {
			const v = new Date(new Date(x.createdDate).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
			expect(v, `Phiếu ${x.code} ngoài khoảng ngày`).toBe(ngay);
		}
	});

	test('14_1_030_011 — Chọn Từ ngày lớn hơn Đến ngày', async ({ page }) => {
		chanNeuTat('14_1_030_011');
		const b = await r.k.goiApi(page, st, r.API, { page: 0, size: 20, fromDate: '2026-12-31', toDate: '2026-01-01' });
		expect(b.data).toEqual([]);
	});

	test('14_1_030_012 — Tổ hợp ba bộ lọc cùng lúc', async ({ page }) => {
		chanNeuTat('14_1_030_012');
		const p = await taoP({ draft: false });
		const hom = new Date().toISOString().slice(0, 10);
		const b = await r.k.goiApi(page, st, r.API, { page: 0, size: 100, status: 'PENDING', keyword: p.code.slice(4, 8), fromDate: hom, toDate: hom });
		expect(b.data.map((x) => x.code)).toContain(p.code);
		for (const x of b.data) {
			expect(x.status).toBe('PENDING');
			expect(x.code).toContain(p.code.slice(4, 8));
		}
		const khac = await r.k.goiApi(page, st, r.API, { page: 0, size: 100, status: 'APPROVED', keyword: p.code });
		expect(khac.data, 'Lọc là HỢP chứ không phải AND').toEqual([]);
	});

	test('14_1_030_013 — Xoá lọc trả về danh sách đầy đủ', async ({ page }) => {
		chanNeuTat('14_1_030_013');
		const tong = (await r.k.goiApi(page, st, r.API, { page: 0, size: 1 })).page.total_elements;
		await r.timMa(page, 'ZZZ999999');
		await expect(r.dong(page)).toHaveCount(0);
		await r.khung(page).getByPlaceholder('Tìm theo mã phiếu').fill('');
		await r.bamTimKiem(page); // bộ lọc về như lúc đầu ⇒ RTK trả cache, có thể không gửi request
		await expect(r.dong(page)).toHaveCount(Math.min(tong, 20), { timeout: 20_000 });
	});

	test('14_1_030_014 — Phân trang hoạt động đúng', async ({ page }) => {
		chanNeuTat('14_1_030_014');
		let tong = (await r.k.goiApi(page, st, r.API, { page: 0, size: 1 })).page.total_elements;
		while (tong <= 21) {
			await taoP({ draft: true });
			tong++;
		}
		const body = await r.k.goiApi(page, st, r.API, { page: 0, size: 20 });
		await r.timMa(page, 'RTR');
		await expect(r.dong(page)).toHaveCount(20);
		const cho = page.waitForResponse((x) => x.url().includes(r.API) && /size=10(&|$)/.test(x.url()));
		const doi = r.khung(page).locator('.ant-pagination-options .ant-select');
		await doi.scrollIntoViewIfNeeded();
		await doi.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="10 / trang"]').click();
		const u = new URL((await cho).url());
		expect([u.searchParams.get('size'), u.searchParams.get('page')]).toEqual(['10', '0']);
		const cuoi = Math.ceil(body.page.total_elements / 10);
		const choCuoi = page.waitForResponse((x) => x.url().includes(r.API) && x.url().includes(`page=${cuoi - 1}`));
		await r.khung(page).locator(`.ant-pagination-item-${cuoi}`).click();
		await choCuoi;
		await expect(r.dong(page)).toHaveCount(body.page.total_elements - (cuoi - 1) * 10);
	});

	test('14_1_030_015 — Danh sách sắp theo ngày tạo mới nhất trước', async ({ page }) => {
		chanNeuTat('14_1_030_015');
		const body = await r.k.goiApi(page, st, r.API, { page: 0, size: 20 });
		expect(body.data.length).toBeGreaterThanOrEqual(3);
		await expect(r.dong(page)).toHaveCount(Math.min(20, body.page.total_elements));
		const v = (await r.dong(page).locator('td:nth-child(8)').allInnerTexts()).map((s) => {
			const [d, t] = r.chuan(s).split(' ');
			const [dd, mm, yy] = d.split('/');
			return `${yy}${mm}${dd}${t}`;
		});
		expect(v).toEqual([...v].sort().reverse());
	});

	test('14_1_030_018 — Xem lịch sử xử lý phiếu', async ({ page, browser }) => {
		chanNeuTat('14_1_030_018');
		const p = await taoP({ draft: false });
		await r.duyetDu(browser, 'ward', p.id);
		const dr = await r.moChiTiet(page, await dongMa(page, p.code));
		const cho = page.waitForResponse((x) => x.url().includes(`${r.API}/${p.id}/history`));
		await dr.getByRole('button', { name: 'Xem lịch sử' }).click();
		const ls = await (await cho).json();
		const h = page.locator('.ant-drawer-open').filter({ hasText: 'Lịch sử xử lý' }).last();
		await expect(h).toBeVisible();
		expect((ls.data || []).length, 'Phiếu đã qua 2 cấp mà lịch sử trống').toBeGreaterThanOrEqual(1);
		await expect(h.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(ls.data.length);
	});

	test('14_1_030_021 — Điểm bán chỉ thấy phiếu của chính mình', async ({ page }) => {
		chanNeuTat('14_1_030_021');
		const b = await r.k.goiApi(page, st, r.API, { page: 0, size: 200 });
		expect(b.data.length).toBeGreaterThan(0);
		for (const x of b.data) expect([x.shopId, x.createdShopId], `Phiếu ${x.code} không thuộc điểm bán`).toContain(shopId());
		const khac = await r.k.goiApi(page, st, r.API, { page: 0, size: 200, keyword: 'RTR-E8D4C15F' });
		expect(khac.data, 'Điểm bán thấy phiếu của điểm bán khác').toEqual([]);
	});

	test('14_1_030_025 — Phiếu bị từ chối dừng ở mốc duyệt đang dở', async ({ page, browser }) => {
		chanNeuTat('14_1_030_025');
		const p = await taoP({ draft: false });
		await r.duyetDu(browser, 'ward', p.id);
		const b = await r.goiDuyet(browser, 'province', p.id, { approved: false, description: 'AUTO TEST 030_025' });
		expect(String(b?.status?.code), b?.status?.message).toBe('200');
		const dr = await r.moChiTiet(page, await dongMa(page, p.code));
		const v = await r.vongDoi(dr);
		const i = v.findIndex((x) => x.ten === 'Chờ duyệt cấp 2');
		expect(v[i].tt).toBe('error');
		for (const x of v.slice(0, i)) expect(x.tt, `Mốc trước "${x.ten}"`).toBe('finish');
		for (const x of v.slice(i + 1)) expect(x.tt, `Mốc sau "${x.ten}"`).toBe('wait');
	});

	test('14_1_030_026 — Phiếu chưa duyệt hiện gạch ngang ở cột SL duyệt', async ({ page }) => {
		chanNeuTat('14_1_030_026');
		const p = await taoP({ draft: false, soDong: 2, sl: 2 });
		const dr = await r.moChiTiet(page, await dongMa(page, p.code));
		const th = (await dr.locator('.ant-table-thead th').allInnerTexts()).map(r.chuan);
		const i = th.indexOf('SL duyệt');
		const o = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('td').nth(i);
		for (const d of await dr.locator('.ant-table-tbody tr.ant-table-row').all()) {
			const c = d.locator('td').nth(i);
			expect(r.chuan(await c.innerText())).toBe('--');
			await expect(c.locator('.text-gray-400')).toHaveCount(1);
		}
		expect(o).toBeTruthy();
	});

	test('14_1_040_006 — Vai điểm bán không duyệt được phiếu', async ({ page }) => {
		chanNeuTat('14_1_040_006');
		const p = await taoP({ draft: false });
		const m = await r.menuXuLy(page, await dongMa(page, p.code));
		expect(m.map((x) => x.nhan)).not.toContain('Duyệt');
		const ct = await r.chiTietPhieu(page, st, p.id);
		const b = await r.k.goiGhi(page, st, 'POST', `${r.API}/${p.id}/approve`, {}, { approved: true, items: ct.items.map((x) => ({ itemId: x.id, approvedQuantity: Number(x.quantity) })) });
		expect(r.msg(b)).toBe('Chỉ cấp xã, cấp tỉnh hoặc TCT được duyệt phiếu trả');
	});

	test('14_1_050_001 — Điểm bán huỷ phiếu của chính mình', async ({ page }) => {
		chanNeuTat('14_1_050_001');
		const p = await taoP({ draft: false });
		const d = await dongMa(page, p.code);
		await r.bamMenu(page, d, 'Huỷ phiếu');
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Huỷ phiếu trả này?' });
		await expect(hop.locator('textarea'), 'Huỷ phiếu mà bắt nhập lý do').toHaveCount(0);
		const tb = await r.thongBao(page, () => hop.getByRole('button', { name: 'Huỷ phiếu' }).click());
		expect(tb).toContain('Đã huỷ phiếu');
		await expect(d.locator('.ant-tag')).toHaveText('Đã huỷ', { timeout: 20_000 });
	});

	test('14_1_050_005 — Phiếu đã huỷ chỉ còn nút Chi tiết', async ({ page }) => {
		chanNeuTat('14_1_050_005');
		const p = await taoP({ draft: false });
		await r.huyPhieu(page, st, p.id);
		const d = await dongMa(page, p.code);
		const nut = (await d.locator('td').last().getByRole('button').allInnerTexts()).map(r.chuan);
		expect(nut).toEqual(['Chi tiết']);
	});
});
