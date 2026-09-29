'use strict';

/**
 * 12_4 — Hợp đồng NCC + CTKM đặt hàng NCC, GHI THẬT, vai `tct` (26/09/2026).
 *
 * Nguồn vnpost-web: `features/supplierContract/{pages/SupplierContractListPage,components/SupplierContractFormDrawer}.jsx`,
 * `features/supplierPromotion/pages/{SupplierPromotionListPage,PromotionFormDrawer}.jsx`, PO: `features/purchaseOrder/pages/PurchaseOrderFormPage.jsx`.
 * - Hợp đồng: drawer "Thêm hợp đồng NCC" / "Cập nhật hợp đồng NCC" — Số hợp đồng* · Nhà cung cấp* · Loại hợp đồng* · Thời hạn hiệu lực* ·
 *   Tổng giá trị (trọn gói) · Chiết khấu (%) · Hạn mức công nợ · Hạn thanh toán (ngày) · Số ngày tối đa được phép trả hàng · Hợp đồng ký gửi …
 *   API `POST/PUT /chain-supplier-contract`, duyệt `POST …/{id}/status`, bật/tắt `POST …/{id}/active`, xoá `DELETE …/{id}`, tệp `…/{id}/files`.
 *   Duyệt: Modal "Phê duyệt hợp đồng?" (OK "Phê duyệt"); bật/tắt: "Ngừng kích hoạt hợp đồng?"/"Kích hoạt lại hợp đồng?".
 * - CTKM NCC: `POST /supplier-promotions`, `…/{id}/activate|deactivate|cancel`, áp giá `POST /supplier-promotions/apply`.
 * 🔴 Hợp đồng tạm `A<làn>HD<hậu tố>` cho chính NCC seed, NGÀY HIỆU LỰC TƯƠNG LAI (+400 ngày) để
 *    không chen vào PO đang dùng hợp đồng seed; case cần hợp đồng HIỆU LỰC dùng hợp đồng seed `AUTO<làn>_HD`. Xoá hợp đồng tạm ở finally.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const { batHeader, goiGhi } = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dongDs = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');
const hau = () => Date.now().toString().slice(-6);
const MA = (x = '') => `A${process.env.VNPOST_LANE || ''}HD${x}${hau()}`;
const NCC = () => seed.doc().duLieu.nhaCungCap.tenNcc;
const idNcc = () => seed.doc().duLieu.sanPhamNcc?.supplierId;
const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);

async function moHd(page) {
	const st = batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/supplier/contracts`, 'tct');
	await expect(khung(page).getByPlaceholder('Tìm số HĐ / tên / mã NCC')).toBeVisible({ timeout: 30_000 });
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	await page.waitForTimeout(1_500);
	const taoRa = [];
	const goi = (m, u, q, b) => goiGhi(page, st, m, u, q, b);
	return {
		st, goi, taoRa,
		don: async () => { for (const id of taoRa) await goi('DELETE', `/chain-supplier-contract/${id}`).catch(() => null); },
	};
}
async function timHd(page, tu) {
	const o = khung(page).getByPlaceholder('Tìm số HĐ / tên / mã NCC');
	const cho = page.waitForResponse((r) => r.url().includes('/chain-supplier-contract') && r.request().method() === 'GET', { timeout: 20_000 }).catch(() => null);
	await o.fill(tu);
	await o.press('Enter');
	await cho;
	await page.waitForTimeout(1_200);
	return dongDs(page).filter({ hasText: tu });
}
async function moForm(page) {
	await khung(page).getByRole('button', { name: /Thêm mới/ }).first().click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: /Thêm hợp đồng NCC|Cập nhật hợp đồng NCC/ }).last();
	await expect(dr.getByPlaceholder('Nhập số hợp đồng')).toBeVisible({ timeout: 20_000 });
	return dr;
}
const fi = (dr, nhan) => dr.locator('.ant-form-item').filter({ has: dr.page().locator(`label:text-is("${nhan}")`) }).first();
async function chonSelect(page, dr, nhan, giaTri) {
	const o = fi(dr, nhan).locator('.ant-select').first();
	await o.click();
	await page.keyboard.type(String(giaTri), { delay: 20 });
	await page.waitForTimeout(1_200);
	const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
	await dd.locator('.ant-select-item-option').filter({ hasText: String(giaTri) }).first().click();
}
async function chonLoai(page, dr, loai) {
	const o = fi(dr, 'Loại hợp đồng');
	if (await o.locator('.ant-radio-wrapper').count()) await o.locator('.ant-radio-wrapper').filter({ hasText: loai }).click();
	else { await o.locator('.ant-select').click(); await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: loai }).first().click(); }
}
const dmy = (t) => `${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
async function chonKhoang(page, dr, tu, den) {
	const ins = fi(dr, 'Thời hạn hiệu lực').locator('input');
	await ins.nth(0).click();
	await ins.nth(0).fill(dmy(tu));
	await ins.nth(0).press('Enter');
	await ins.nth(1).fill(dmy(den));
	await ins.nth(1).press('Enter');
	await page.waitForTimeout(500);
}
/** Điền form tối thiểu (ngày hiệu lực tương lai mặc định). */
async function dienHd(page, dr, { ma, loai, tu, den, ck, hanMuc, hanTt, traHang }) {
	await dr.getByPlaceholder('Nhập số hợp đồng').fill(ma);
	await chonSelect(page, dr, 'Nhà cung cấp', NCC());
	if (loai) await chonLoai(page, dr, loai);
	// 🔴 Mỗi hợp đồng tạm một khoảng hiệu lực RIÊNG (BE chặn duyệt khi trùng khoảng với hợp đồng hiệu lực khác của cùng NCC).
	const t0 = tu ?? new Date(Date.now() + (400 + Math.floor(Math.random() * 6000)) * 86400_000);
	await chonKhoang(page, dr, t0, den ?? new Date(t0.getTime() + 3 * 86400_000));
	if (ck != null) { const o = fi(dr, 'Chiết khấu (%)').locator('input').first(); await o.fill(String(ck)); await o.press('Tab'); }
	if (hanMuc != null) { const o = fi(dr, 'Hạn mức công nợ').locator('input').first(); await o.fill(String(hanMuc)); await o.press('Tab'); }
	if (hanTt != null) await fi(dr, 'Hạn thanh toán (ngày)').locator('input').first().fill(String(hanTt));
	if (traHang != null) await fi(dr, 'Số ngày tối đa được phép trả hàng').locator('input').first().fill(String(traHang));
}
/** Bấm Lưu/Xác nhận; gom toast ngay; trả { res, body, tb, loi }. */
async function luuHd(page, dr) {
	let rs = null;
	const cho = page.waitForResponse((r) => /chain-supplier-contract(\/\d+)?$/.test(new URL(r.url()).pathname) && ['POST', 'PUT'].includes(r.request().method()), { timeout: 15_000 }).then((r) => { rs = r; }).catch(() => null);
	await dr.getByRole('button', { name: /^(Lưu|Xác nhận|Thêm mới|Cập nhật)$/ }).last().click();
	const tbs = new Set();
	for (let i = 0; i < 25 && !rs; i += 1) { for (const t of await page.locator('.ant-message-notice').allInnerTexts()) tbs.add(chuan(t)); await page.waitForTimeout(300); }
	await cho;
	await page.waitForTimeout(1_000);
	for (const t of await page.locator('.ant-message-notice').allInnerTexts()) tbs.add(chuan(t));
	const body = rs ? await rs.json().catch(() => null) : null;
	return { res: rs, body, tb: [...tbs].join(' | '), loi: chuan((await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).join(' | ')) };
}
async function taoHdUi(page, m, khai) {
	const dr = await moForm(page);
	await dienHd(page, dr, khai);
	const kq = await luuHd(page, dr);
	expect(String(kq.body?.status?.code), `Tạo hợp đồng lỗi: ${kq.body?.status?.message ?? kq.tb} ${kq.loi}`).toBe('200');
	m.taoRa.push(kq.body?.data?.id);
	return { id: kq.body?.data?.id, ma: khai.ma, kq };
}
async function hopThoai(page, tieuDe, nut) {
	const h = page.locator('.ant-modal-confirm, .ant-modal').filter({ hasText: tieuDe }).last();
	await expect(h).toBeVisible({ timeout: 10_000 });
	const cho = page.waitForResponse((r) => /chain-supplier-contract\/\d+\/(status|active)/.test(r.url()), { timeout: 15_000 }).catch(() => null);
	await h.getByRole('button', { name: nut }).last().click();
	const r = await cho;
	await page.waitForTimeout(1_500);
	return r ? await r.json().catch(() => null) : null;
}
const docHd = async (m, id) => (await m.goi('GET', `/chain-supplier-contract/${id}`))?.data;
/** Cột "Kích hoạt" trên danh sách: true = "Đang kích hoạt", false = "Ngừng kích hoạt" (API chi tiết không trả cờ active). */
const dangKichHoat = async (page, ma) => { const t = chuan(await (await timHd(page, ma)).first().innerText()); return /Đang kích hoạt/.test(t) ? true : /Ngừng kích hoạt/.test(t) ? false : null; };

test.describe('12_4 — Hợp đồng NCC (GHI)', () => {
	test.describe.configure({ timeout: 300_000 });

	test('12_4_020_001 — Khai báo hợp đồng NCC mới', async ({ page }) => {
		chanNeuTat('12_4_020_001');
		const m = await moHd(page);
		try {
			const ma = MA('N');
			const { id } = await taoHdUi(page, m, { ma, ck: 5 });
			const r = (await timHd(page, ma)).first();
			const t = chuan(await r.innerText());
			ghiDo(`dòng mới: ${t}`);
			expect(t).toContain(ma);
			expect(t, 'Hợp đồng mới không ở trạng thái Nháp').toMatch(/Nháp/);
			expect((await docHd(m, id))?.discountRate).toBe(5);
		} finally { await m.don(); }
	});

	test('12_4_020_002 — Chặn khai hợp đồng khi bỏ trống trường bắt buộc', async ({ page }) => {
		chanNeuTat('12_4_020_002');
		await moHd(page);
		const dr = await moForm(page);
		const kq = await luuHd(page, dr);
		ghiDo(`lỗi: "${kq.loi}" · request ${kq.res ? 'CÓ' : 'không'}`);
		expect(kq.res, 'Bỏ trống vẫn gửi request tạo').toBeNull();
		expect(kq.loi).toContain('Vui lòng nhập số hợp đồng');
	});

	test('12_4_080_022 — Mở popup thêm hợp đồng', async ({ page }) => {
		chanNeuTat('12_4_080_022');
		await moHd(page);
		const dr = await moForm(page);
		const nhan = (await dr.locator('.ant-form-item-label label').allInnerTexts()).map(chuan);
		ghiDo(nhan.join(' · '));
		for (const n of ['Số hợp đồng', 'Nhà cung cấp', 'Loại hợp đồng', 'Thời hạn hiệu lực']) expect(nhan).toContain(n);
	});

	test('12_4_080_028 — Hủy thêm mới', async ({ page }) => {
		chanNeuTat('12_4_080_028');
		await moHd(page);
		const dr = await moForm(page);
		const ma = MA('H');
		await dr.getByPlaceholder('Nhập số hợp đồng').fill(ma);
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'POST' && /chain-supplier-contract/.test(r.url())) daGoi.push(r.url()); });
		await dr.getByRole('button', { name: /^(Hủy|Huỷ)$/ }).first().click();
		await expect(dr).toBeHidden({ timeout: 10_000 });
		expect(daGoi).toEqual([]);
		expect(await (await timHd(page, ma)).count()).toBe(0);
	});

	test('12_4_080_023 — Ngày kết thúc nhỏ hơn ngày bắt đầu', async ({ page }) => {
		chanNeuTat('12_4_080_023');
		const m = await moHd(page);
		try {
			const dr = await moForm(page);
			const tu = new Date(Date.now() + 420 * 86400_000);
			await dienHd(page, dr, { ma: MA('D'), tu, den: new Date(tu.getTime() - 10 * 86400_000) });
			const giaTri = await fi(dr, 'Thời hạn hiệu lực').locator('input').evaluateAll((x) => x.map((i) => i.value));
			const kq = await luuHd(page, dr);
			if (String(kq.body?.status?.code) === '200') m.taoRa.push(kq.body?.data?.id);
			ghiDo(`khoảng sau khi nhập: ${JSON.stringify(giaTri)} · lưu ${kq.body?.status?.code ?? 'FE chặn'} "${kq.body?.status?.message ?? kq.tb} ${kq.loi}"`);
			// RangePicker antd tự đảo/không cho chọn ngày kết thúc < bắt đầu; nếu vẫn lưu thì từ ≤ đến.
			const d = kq.body?.data;
			if (d) expect(new Date(d.effectiveTo) >= new Date(d.effectiveFrom), '🔴 Lưu được hợp đồng kết thúc trước ngày bắt đầu').toBe(true);
		} finally { await m.don(); }
	});

	test('12_4_080_024 — Trùng số hợp đồng', async ({ page }) => {
		chanNeuTat('12_4_080_024');
		const m = await moHd(page);
		try {
			const ma = MA('T');
			await taoHdUi(page, m, { ma });
			const dr = await moForm(page);
			await dienHd(page, dr, { ma, tu: new Date(Date.now() + 500 * 86400_000) });
			const kq = await luuHd(page, dr);
			if (String(kq.body?.status?.code) === '200') m.taoRa.push(kq.body?.data?.id);
			ghiDo(`trùng số HĐ: ${kq.body?.status?.code} "${kq.body?.status?.message ?? kq.tb}"`);
			expect(String(kq.body?.status?.code), '🔴 Trùng số hợp đồng vẫn tạo được').not.toBe('200');
			expect(`${kq.body?.status?.message} ${kq.tb}`).toMatch(/tồn tại|trùng|đã có/i);
		} finally { await m.don(); }
	});

	test('12_4_080_038 — Kiểm tra khoảng trắng đầu/cuối khi nhập số HĐ', async ({ page }) => {
		chanNeuTat('12_4_080_038');
		const m = await moHd(page);
		try {
			const ma = MA('K');
			const { id } = await taoHdUi(page, m, { ma: `  ${ma}  ` });
			const luu = (await docHd(m, id))?.contractCode;
			ghiDo(`nhập "  ${ma}  " ⇒ lưu "${luu}"`);
			expect(luu, 'Không trim khoảng trắng số hợp đồng').toBe(ma);
		} finally { await m.don(); }
	});

	test('12_4_080_039 — Nhập giá trị âm cho hạn mức công nợ', async ({ page }) => {
		chanNeuTat('12_4_080_039');
		await moHd(page);
		const dr = await moForm(page);
		const o = fi(dr, 'Hạn mức công nợ').locator('input').first();
		await o.fill('-1000');
		await o.press('Tab');
		const v = await o.inputValue();
		ghiDo(`gõ -1000 ⇒ "${v}"`);
		expect(v, 'Hạn mức công nợ nhận số âm').not.toMatch(/^-/);
	});

	test('12_4_080_040 — Nhập chiết khấu >100%', async ({ page }) => {
		chanNeuTat('12_4_080_040');
		await moHd(page);
		const dr = await moForm(page);
		const o = fi(dr, 'Chiết khấu (%)').locator('input').first();
		await o.fill('120');
		await o.press('Tab');
		const v = await o.inputValue();
		const loi = chuan((await fi(dr, 'Chiết khấu (%)').locator('.ant-form-item-explain-error').allInnerTexts()).join(' '));
		ghiDo(`gõ 120 ⇒ "${v}" · lỗi "${loi}"`);
		expect(Number(String(v).replace(/[^\d.]/g, '')) <= 100 || loi !== '', 'Chiết khấu 120% được nhận, không báo lỗi').toBe(true);
	});

	test('12_4_080_013 — Kiểm tra loại hợp đồng', async ({ page }) => {
		chanNeuTat('12_4_080_013');
		await moHd(page);
		const dr = await moForm(page);
		const o = fi(dr, 'Loại hợp đồng');
		await o.locator('.ant-select, .ant-radio-group').first().click();
		const lua = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts().catch(() => [])).map(chuan);
		const radio = (await o.locator('.ant-radio-wrapper').allInnerTexts()).map(chuan);
		const cacLoai = lua.length ? lua : radio;
		await page.keyboard.press('Escape');
		const ketQua = {};
		for (const l of cacLoai) { await chonLoai(page, dr, l); await page.waitForTimeout(400); ketQua[l] = await fi(dr, 'Tổng giá trị hợp đồng (trọn gói)').isVisible().catch(() => false); }
		ghiDo(`loại: ${JSON.stringify(cacLoai)} · ô "Tổng giá trị (trọn gói)" hiện: ${JSON.stringify(ketQua)}`);
		expect(cacLoai.length, 'Không có 2 loại hợp đồng').toBe(2);
		expect(Object.entries(ketQua).some(([l, v]) => /trọn gói/i.test(l) && v), 'Loại trọn gói không có ô Tổng giá trị').toBe(true);
	});

	test('12_4_030_001 — Nút thao tác đổi theo trạng thái hợp đồng', async ({ page }) => {
		chanNeuTat('12_4_030_001');
		const m = await moHd(page);
		try {
			const ma = MA('S');
			await taoHdUi(page, m, { ma });
			const nhap = chuan(await (await timHd(page, ma)).first().locator('td').last().innerText());
			const hl = chuan(await (await timHd(page, seed.doc().duLieu.sanPhamNcc.soHopDong)).first().locator('td').last().innerText());
			ghiDo(`Nháp: "${nhap}" · hợp đồng seed hiệu lực: "${hl}"`);
			expect(nhap).toContain('Phê duyệt');
			expect(hl).toMatch(/Ngừng/);
		} finally { await m.don(); }
	});

	test('12_4_030_002 — Phê duyệt hợp đồng Nháp', async ({ page }) => {
		chanNeuTat('12_4_030_002');
		const m = await moHd(page);
		try {
			const ma = MA('P');
			const { id } = await taoHdUi(page, m, { ma });
			await (await timHd(page, ma)).first().getByRole('button', { name: 'Phê duyệt' }).click();
			const b = await hopThoai(page, 'Phê duyệt hợp đồng?', 'Phê duyệt');
			const r = chuan(await (await timHd(page, ma)).first().innerText());
			ghiDo(`duyệt ${JSON.stringify(b?.status)} · dòng "${r}" · status ${(await docHd(m, id))?.status}`);
			expect(r, 'Không chuyển sang Hiệu lực').toMatch(/Hiệu lực/);
			expect(r, 'Nút Phê duyệt còn hiện').not.toContain('Phê duyệt');
		} finally { await m.don(); }
	});

	async function hdDaDuyet(page, m, x) {
		const ma = MA(x);
		const { id } = await taoHdUi(page, m, { ma });
		const dv = await m.goi('POST', `/chain-supplier-contract/${id}/status`, { status: 'ACTIVE' });
		const st = (await docHd(m, id))?.status;
		if (st !== 'ACTIVE') ghiDo(`duyệt hợp đồng tạm qua API: ${JSON.stringify(dv?.status)}`);
		if (st === 'DRAFT') {
			await (await timHd(page, ma)).first().getByRole('button', { name: 'Phê duyệt' }).click();
			await hopThoai(page, 'Phê duyệt hợp đồng?', 'Phê duyệt');
		}
		// Duyệt qua API ⇒ danh sách FE còn dữ liệu cũ (RTK cache) ⇒ tải lại.
		await page.reload();
		await page.waitForTimeout(2_000);
		return { id, ma };
	}

	test('12_4_030_003 — Ngừng kích hoạt hợp đồng đang hiệu lực', async ({ page }) => {
		chanNeuTat('12_4_030_003');
		// (hdDaDuyet: duyệt qua API; lỗi duyệt được ghi vào annotation)
		const m = await moHd(page);
		try {
			const { id, ma } = await hdDaDuyet(page, m, 'G');
			await (await timHd(page, ma)).first().getByRole('button', { name: /Ngừng/ }).click();
			const h = page.locator('.ant-modal-confirm, .ant-modal').filter({ hasText: 'Ngừng kích hoạt hợp đồng?' }).last();
			await h.locator('textarea, input').first().fill('AUTO TEST 12_4').catch(() => null);
			const b = await hopThoai(page, 'Ngừng kích hoạt hợp đồng?', 'Ngừng kích hoạt');
			const kh = await dangKichHoat(page, ma);
			ghiDo(`ngừng ${JSON.stringify(b?.status)} · kích hoạt=${kh} · dòng "${chuan(await (await timHd(page, ma)).first().innerText())}"`);
			expect(String(b?.status?.code)).toBe('200');
			expect(kh, 'Hợp đồng chưa ngừng kích hoạt').toBe(false);
		} finally { await m.don(); }
	});

	test('12_4_080_031 — Kích hoạt hợp đồng đang Ngừng', async ({ page }) => {
		chanNeuTat('12_4_080_031');
		const m = await moHd(page);
		try {
			const { id, ma } = await hdDaDuyet(page, m, 'L');
			await m.goi('POST', `/chain-supplier-contract/${id}/active`, { active: false, reason: 'AUTO TEST' });
			await page.reload();
			await page.waitForTimeout(2_000);
			await (await timHd(page, ma)).first().getByRole('button', { name: /^Kích hoạt/ }).click();
			const b = await hopThoai(page, 'Kích hoạt lại hợp đồng?', 'Kích hoạt');
			const kh = await dangKichHoat(page, ma);
			ghiDo(`kích hoạt ${JSON.stringify(b?.status)} · kích hoạt=${kh}`);
			expect(kh).toBe(true);
		} finally { await m.don(); }
	});

	test('12_4_080_032 — Hủy thao tác kích hoạt', async ({ page }) => {
		chanNeuTat('12_4_080_032');
		const m = await moHd(page);
		try {
			const { id, ma } = await hdDaDuyet(page, m, 'C');
			await m.goi('POST', `/chain-supplier-contract/${id}/active`, { active: false, reason: 'AUTO TEST' });
			await page.reload();
			await page.waitForTimeout(2_000);
			await (await timHd(page, ma)).first().getByRole('button', { name: /^Kích hoạt/ }).click();
			const h = page.locator('.ant-modal-confirm, .ant-modal').filter({ hasText: 'Kích hoạt lại hợp đồng?' }).last();
			await h.getByRole('button', { name: /Hủy|Huỷ|Cancel/ }).click();
			await page.waitForTimeout(1_000);
			await page.reload();
			await page.waitForTimeout(1_500);
			expect(await dangKichHoat(page, ma), 'Bấm Hủy mà trạng thái vẫn đổi').toBe(false);
		} finally { await m.don(); }
	});

	test('12_4_080_033 — Hủy thao tác ngừng', async ({ page }) => {
		chanNeuTat('12_4_080_033');
		const m = await moHd(page);
		try {
			const { id, ma } = await hdDaDuyet(page, m, 'U');
			await (await timHd(page, ma)).first().getByRole('button', { name: /Ngừng/ }).click();
			const h = page.locator('.ant-modal-confirm, .ant-modal').filter({ hasText: 'Ngừng kích hoạt hợp đồng?' }).last();
			await h.getByRole('button', { name: /Hủy|Huỷ|Cancel/ }).click();
			await page.waitForTimeout(1_000);
			await page.reload();
			await page.waitForTimeout(1_500);
			expect(await dangKichHoat(page, ma), 'Bấm Hủy mà hợp đồng bị ngừng').toBe(true);
		} finally { await m.don(); }
	});

	test('12_4_080_011 — Kiểm tra sửa thông tin hợp đồng', async ({ page }) => {
		chanNeuTat('12_4_080_011');
		const m = await moHd(page);
		try {
			const ma = MA('E');
			const { id } = await taoHdUi(page, m, { ma, ck: 3 });
			const r = (await timHd(page, ma)).first();
			await r.getByRole('button', { name: /Sửa/ }).first().click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Cập nhật hợp đồng NCC' }).last();
			await expect(dr).toBeVisible({ timeout: 15_000 });
			const o = fi(dr, 'Chiết khấu (%)').locator('input').first();
			await o.fill('7');
			await o.press('Tab');
			const kq = await luuHd(page, dr);
			const d = await docHd(m, id);
			ghiDo(`sửa ${kq.body?.status?.code} "${kq.tb}" · CK ${d?.discountRate} · status ${d?.status}`);
			expect(kq.tb).toContain('Cập nhật hợp đồng thành công');
			expect(d?.discountRate).toBe(7);
			expect(d?.status, 'Hợp đồng sau sửa không ở Nháp').toBe('DRAFT');
		} finally { await m.don(); }
	});

	test('12_4_080_025 — Upload tài liệu hợp đồng', async ({ page }) => {
		chanNeuTat('12_4_080_025');
		const m = await moHd(page);
		try {
			const dr = await moForm(page);
			const ma = MA('F');
			await dienHd(page, dr, { ma });
			await dr.locator('input[type=file]').first().setInputFiles([{ name: 'hop-dong.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% AUTO TEST 12_4\n') }]);
			await page.waitForTimeout(800);
			const kq = await luuHd(page, dr);
			const id = kq.body?.data?.id;
			m.taoRa.push(id);
			await page.waitForTimeout(2_000);
			const tep = ds((await m.goi('GET', `/chain-supplier-contract/${id}/files`))?.data);
			ghiDo(`lưu ${kq.body?.status?.code} "${kq.tb}" · tệp ${JSON.stringify(tep).slice(0, 200)}`);
			expect(tep.length, 'Tệp hợp đồng không được lưu').toBe(1);
		} finally { await m.don(); }
	});

	test('12_4_080_026 — Upload file sai định dạng', async ({ page }) => {
		chanNeuTat('12_4_080_026');
		await moHd(page);
		const dr = await moForm(page);
		const truoc = await dr.locator('.ant-upload-list-item').count();
		await dr.locator('input[type=file]').first().setInputFiles([{ name: 'virus.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') }]);
		await page.waitForTimeout(1_500);
		const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
		const sau = await dr.locator('.ant-upload-list-item').count();
		const accept = await dr.locator('input[type=file]').first().getAttribute('accept');
		ghiDo(`accept="${accept}" · thông báo "${tb}" · danh sách tệp ${truoc} ⇒ ${sau}`);
		expect(sau === truoc || /định dạng|không hỗ trợ/i.test(tb), '🔴 Nhận tệp .exe không báo lỗi định dạng').toBe(true);
	});

	test('12_4_080_027 — Upload file vượt dung lượng', async ({ page }) => {
		chanNeuTat('12_4_080_027');
		await moHd(page);
		const dr = await moForm(page);
		await dr.locator('input[type=file]').first().setInputFiles([{ name: 'to.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(11 * 1024 * 1024, 1) }]);
		await page.waitForTimeout(1_500);
		const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
		ghiDo(`11MB: "${tb}"`);
		expect(tb).toContain('vượt quá 10MB');
	});

	test('12_4_080_029 — Xem tài liệu hợp đồng', async ({ page }) => {
		chanNeuTat('12_4_080_029');
		const m = await moHd(page);
		try {
			const dr = await moForm(page);
			const ma = MA('V');
			await dienHd(page, dr, { ma });
			await dr.locator('input[type=file]').first().setInputFiles([{ name: 'xem.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% xem\n') }]);
			const kq = await luuHd(page, dr);
			m.taoRa.push(kq.body?.data?.id);
			await (await timHd(page, ma)).first().getByRole('button', { name: 'Xem' }).click();
			const ct = page.locator('.ant-drawer-open').last();
			await expect(ct).toBeVisible({ timeout: 15_000 });
			const link = ct.getByText('xem.pdf').first();
			await expect(link, 'Chi tiết không liệt kê tệp đã tải').toBeVisible({ timeout: 15_000 });
			// ContractFileSection.jsx: <a href={f.url} target="_blank"> — tệp mở được khi url là http(s) tải được.
			const href = await link.locator('xpath=ancestor-or-self::a[1]').getAttribute('href').catch(() => null);
			let tai = null;
			if (href && /^https?:/.test(href)) tai = await page.request.get(href).then((r) => r.status()).catch((e) => e.message);
			ghiDo(`href tệp: ${href} · GET ⇒ ${tai}`);
			expect(href || '(không có href)', '🔴 Link tệp hợp đồng không có URL http(s) (f.url rỗng / s3://…) ⇒ bấm không mở được').toMatch(/^https?:/);
			expect(tai).toBe(200);
		} finally { await m.don(); }
	});

	test('12_4_080_030 — Hiển thị đúng trạng thái hợp đồng', async ({ page }) => {
		chanNeuTat('12_4_080_030');
		const m = await moHd(page);
		try {
			const { id, ma } = await hdDaDuyet(page, m, 'X');
			await (await timHd(page, ma)).first().getByRole('button', { name: 'Xem' }).click();
			const ct = page.locator('.ant-drawer-open').last();
			await expect(ct).toContainText(ma, { timeout: 15_000 });
			const t = chuan(await ct.innerText());
			ghiDo(`${(await docHd(m, id))?.status} · chi tiết: ${t.slice(0, 250)}`);
			expect(t).toMatch(/Hiệu lực/);
		} finally { await m.don(); }
	});

	test('12_4_080_034 — Kiểm tra tổng giá trị hợp đồng', async ({ page }) => {
		chanNeuTat('12_4_080_034');
		const m = await moHd(page);
		try {
			const dr = await moForm(page);
			const ma = MA('V');
			await dienHd(page, dr, { ma });
			const loai = fi(dr, 'Loại hợp đồng');
			await loai.locator('.ant-select, .ant-radio-group').first().click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /trọn gói/i }).first().click().catch(async () => loai.locator('.ant-radio-wrapper').filter({ hasText: /trọn gói/i }).click());
			const o = fi(dr, 'Tổng giá trị hợp đồng (trọn gói)').locator('input').first();
			await o.fill('123456000');
			await o.press('Tab');
			const kq = await luuHd(page, dr);
			m.taoRa.push(kq.body?.data?.id);
			const r = chuan(await (await timHd(page, ma)).first().innerText());
			ghiDo(`lưu ${kq.body?.status?.code} · dòng "${r}"`);
			expect(r, 'Tổng giá trị hiển thị sai').toMatch(/123\.456\.000/);
		} finally { await m.don(); }
	});

	test('12_4_080_035 — Đóng popup chi tiết', async ({ page }) => {
		chanNeuTat('12_4_080_035');
		await moHd(page);
		await (await timHd(page, seed.doc().duLieu.sanPhamNcc.soHopDong)).first().getByRole('button', { name: 'Xem' }).click();
		const ct = page.locator('.ant-drawer-open').last();
		await expect(ct).toBeVisible({ timeout: 15_000 });
		await ct.locator('.ant-drawer-close, button[aria-label="Close"], button[aria-label="Đóng"]').first().click();
		await expect(ct).toBeHidden({ timeout: 10_000 });
	});

	test('12_4_080_036 — Kiểm tra dữ liệu sau khi reload', async ({ page }) => {
		chanNeuTat('12_4_080_036');
		const m = await moHd(page);
		try {
			const { ma } = await hdDaDuyet(page, m, 'R');
			const truoc = chuan(await (await timHd(page, ma)).first().innerText());
			await page.reload();
			await page.waitForTimeout(3_000);
			const sau = chuan(await (await timHd(page, ma)).first().innerText());
			expect(sau).toBe(truoc);
		} finally { await m.don(); }
	});

	test('12_4_080_037 — Kiểm tra hiệu lực theo ngày hiện tại', async ({ page }) => {
		chanNeuTat('12_4_080_037');
		const m = await moHd(page);
		const r = await m.goi('GET', '/chain-supplier-contract', { page: 0, size: 100 });
		const hom = Date.now();
		const lech = ds(r?.data).filter((c) => c.status === 'ACTIVE' && c.effectiveTo && new Date(c.effectiveTo).getTime() < hom && (c.active === true || c.active === 1));
		ghiDo(`${ds(r?.data).length} hợp đồng · Hiệu lực mà đã quá ngày kết thúc: ${lech.map((c) => `${c.contractCode}(${c.effectiveTo})`).join(', ') || 'không'}`);
		expect(lech, '🔴 Hợp đồng đã hết hạn vẫn hiển thị Hiệu lực').toEqual([]);
	});

	test('12_4_080_018 — Tìm kiếm không tồn tại', async ({ page }) => {
		chanNeuTat('12_4_080_018');
		await moHd(page);
		await timHd(page, `KHONGCO_${hau()}`);
		await expect(khung(page).locator('.ant-empty, .ant-table-placeholder').first()).toBeVisible();
		expect(await dongDs(page).count()).toBe(0);
	});

	test('12_4_080_019 — Xóa bộ lọc', async ({ page }) => {
		chanNeuTat('12_4_080_019');
		await moHd(page);
		const dau = await dongDs(page).count();
		await timHd(page, `KHONGCO_${hau()}`);
		const nut = khung(page).getByRole('button', { name: /Xóa bộ lọc|Xoá bộ lọc|Đặt lại/ });
		if (await nut.count()) await nut.first().click();
		else await timHd(page, '');
		await page.waitForTimeout(1_500);
		ghiDo(`nút xoá lọc: ${await nut.count()} · dòng ${dau} ⇒ ${await dongDs(page).count()}`);
		expect(await dongDs(page).count()).toBe(dau);
	});

	test('12_4_080_020 — Refresh danh sách', async ({ page }) => {
		chanNeuTat('12_4_080_020');
		await moHd(page);
		const cho = page.waitForResponse((r) => r.url().includes('/chain-supplier-contract') && r.request().method() === 'GET', { timeout: 15_000 }).catch(() => null);
		// Thanh công cụ ProTable: ô cài đặt chứa icon reload.
		const nut = khung(page).getByRole('img', { name: 'reload' }).first();
		await nut.click({ force: true });
		const r = await cho;
		ghiDo(`refresh gọi ${r?.url().replace(/.*__api/, '')}`);
		expect(r, 'Refresh không gọi lại danh sách').toBeTruthy();
	});

	test('12_4_080_021 — Phân trang', async ({ page }) => {
		chanNeuTat('12_4_080_021');
		await moHd(page);
		const p2 = khung(page).locator('.ant-pagination-item-2');
		test.skip(!(await p2.count()), 'Danh sách hợp đồng chưa đủ 2 trang');
		const truoc = chuan(await dongDs(page).first().innerText());
		await p2.click();
		await page.waitForTimeout(2_000);
		expect(chuan(await dongDs(page).first().innerText())).not.toBe(truoc);
	});

	test('12_4_010_004 — Lọc Sắp hết hạn chỉ trả hợp đồng còn dưới 30 ngày', async ({ page }) => {
		chanNeuTat('12_4_010_004');
		const m = await moHd(page);
		try {
			// Tiền đề: hợp đồng hết hạn sau 10 ngày (tự dựng, phê duyệt).
			const ma = MA('SH');
			const { id } = await taoHdUi(page, m, { ma, tu: new Date(Date.now() - 86400_000), den: new Date(Date.now() + 10 * 86400_000) });
			await m.goi('POST', `/chain-supplier-contract/${id}/status`, { status: 'ACTIVE' });
			await page.reload();
			await page.waitForTimeout(2_000);
			const o = khung(page).locator('.ant-select').filter({ hasText: /Hiệu lực/ }).first();
			await o.click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: 'Sắp hết hạn' }).first().click();
			await page.waitForTimeout(2_500);
			const ngay = (await dongDs(page).locator('td:nth-child(5)').allInnerTexts()).map(chuan);
			const hom = new Date();
			const qua = ngay.filter((t) => { const [dd, mm, yy] = t.split('/').map(Number); const d = new Date(yy, mm - 1, dd); return (d - hom) / 86400_000 > 30 || d < new Date(hom.toDateString()); });
			ghiDo(`${ngay.length} dòng: ${ngay.slice(0, 8).join(', ')} · ngoài 30 ngày: ${qua.join(', ') || 'không'}`);
			expect(ngay.length, 'Lọc Sắp hết hạn không ra hợp đồng tiền đề').toBeGreaterThan(0);
			expect(qua).toEqual([]);
		} finally { await m.don(); }
	});
});
