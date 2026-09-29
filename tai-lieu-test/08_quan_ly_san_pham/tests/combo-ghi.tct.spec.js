'use strict';

/**
 * 08 · 090 + 030_020–022 — Sản phẩm gộp (combo), GHI THẬT, vai `tct` (26/09/2026).
 *
 * Đo DOM 26/09: màn `/product/combo` "Quản lý Sản phẩm gộp" (nút Thêm mới). Drawer "Thêm mới sản phẩm gộp": `* Tên sản phẩm gộp`
 * (placeholder "Tên sản phẩm") · `* Danh mục` (TreeSelect) · `* Mã SKU` / `* Mã vạch` (placeholder "Nhập giá trị") · `Nhập mã kế toán` ·
 * `* Đơn vị` ("Cái, chiếc, hộp...") · "Thêm sản phẩm vào sản phẩm gộp" = `ProductUnitSearchSelector` (ô "Chọn sản phẩm" ⇒ danh sách
 * CHECKBOX, tick lại = bỏ chọn) + bảng *Tên sản phẩm · Phân loại · Số lượng · Đơn vị · Xóa*. Nút header "Huỷ" / "Xác nhận".
 * Lưu = `POST /chain/products` (type 10) rồi `POST /chain/products/product-combo`. Upload ảnh combo: accept image/*, ≤ 800Kb (code).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const g = require('./sp-ghi');
const { batHeader, goiGhi } = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const { chuan, khung } = require('./product-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const SP = () => seed.doc().duLieu.sanPham;
/**
 * 🔴 Form combo dùng cây danh mục RIÊNG (CHAIN_PRODUCT_CATEGORY.type = 10), seed làn không có ⇒ tự dựng (idempotent):
 * cha `AUTO<làn>_DM_COMBO_CHA` (mã `AUTO<làn>DMCC`) › con `AUTO<làn>_DM_COMBO` (mã `AUTO<làn>DMCB`). Nhãn node = "<mã> - <tên>".
 */
const DMC = { cha: { ten: `${seed.PREFIX}DM_COMBO_CHA`, ma: `${seed.PREFIX_MA}DMCC` }, con: { ten: `${seed.PREFIX}DM_COMBO`, ma: `${seed.PREFIX_MA}DMCB` } };
async function dmCombo(m) {
	const tim = (t) => g.sql(`select id from CHAIN_PRODUCT_CATEGORY where cat_name='${t}' and type=10 and coalesce(is_active,1)=1 order by id limit 1`);
	let cha = tim(DMC.cha.ten);
	if (!cha) {
		await m.goi('POST', '/chain/product-categories/individual', { type: 10 }, { catName: DMC.cha.ten, type: 10, parentId: 0, code: DMC.cha.ma, imageUrl: '', note: '' });
		cha = tim(DMC.cha.ten);
	}
	if (!tim(DMC.con.ten)) await m.goi('POST', '/chain/product-categories/individual', { type: 10 }, { catName: DMC.con.ten, type: 10, parentId: Number(cha), code: DMC.con.ma, imageUrl: '', note: '' });
	expect(tim(DMC.con.ten), 'Không dựng được danh mục combo (type 10)').toBeTruthy();
}
const dmSeed = () => `${DMC.con.ma} - ${DMC.con.ten}`;

async function moMan(page) {
	const st = batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/product/combo`, 'tct');
	await expect(khung(page).getByRole('button', { name: /Thêm mới/ })).toBeVisible({ timeout: 60_000 });
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	await page.waitForTimeout(1_500);
	const taoRa = [];
	await dmCombo({ goi: (m, u, q, b) => goiGhi(page, st, m, u, q, b) });
	return {
		st, taoRa, goi: (m, u, q, b) => goiGhi(page, st, m, u, q, b),
		don: async () => { const ids = taoRa.filter(Boolean); if (ids.length) await goiGhi(page, st, 'DELETE', '/chain/products/multi', { productIds: ids.join(',') }).catch(() => null); },
	};
}

async function moThem(page) {
	await khung(page).getByRole('button', { name: /Thêm mới/ }).first().click({ force: true });
	const dr = page.getByRole('dialog', { name: 'Thêm mới sản phẩm gộp' }).last();
	await expect(dr.getByRole('textbox', { name: /Tên sản phẩm gộp/ })).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(1_000);
	return dr;
}
// 🔴 Nhãn form combo lẫn Unicode NFD ("Mã vạch" dựng từ a + dấu rời) ⇒ regex NFC không khớp. Khớp cả hai dạng.
const nhan = (t) => new RegExp(`${t.normalize('NFC')}|${t.normalize('NFD')}`);
const oSkuC = (dr) => dr.getByRole('textbox', { name: nhan('Mã SKU') });
const oBcC = (dr) => dr.getByRole('textbox', { name: nhan('Mã vạch') });
const dongTp = (dr) => dr.locator('.ant-form-item').filter({ hasText: 'Thêm sản phẩm vào sản phẩm gộp' }).locator('tbody tr.ant-table-row');

/** Tick SP (hoặc biến thể `bienThe`) trong ProductUnitSearchSelector. */
async function chonTp(page, dr, ten, bienThe) {
	const o = dr.getByPlaceholder('Chọn sản phẩm');
	await o.fill('');
	await o.fill(ten);
	await page.waitForTimeout(2_500);
	const ds = dr.locator('div.absolute.z-\\[999\\]');
	await expect(ds.getByText(ten, { exact: true }).first(), `Không thấy "${ten}" trong danh sách chọn`).toBeVisible({ timeout: 20_000 });
	if (bienThe) await ds.locator('div.pl-10').filter({ hasText: bienThe }).first().click();
	else await ds.getByText(ten, { exact: true }).first().click();
	await page.waitForTimeout(1_000);
	await dr.getByRole('textbox', { name: /Tên sản phẩm gộp/ }).click();
	await page.waitForTimeout(500);
}

async function dien(page, dr, { ten, sku, bc, maKt, danhMuc, donVi = 'Combo', tp = [] }) {
	await dr.getByRole('textbox', { name: /Tên sản phẩm gộp/ }).fill(ten);
	await g.chonO(page, dr, /Danh mục/, danhMuc ?? dmSeed());
	if (sku !== undefined) await oSkuC(dr).fill(sku);
	if (bc !== undefined) await oBcC(dr).fill(bc);
	await dr.getByPlaceholder('Nhập mã kế toán').fill(maKt ?? sku ?? g.MA(g.hau()));
	await dr.getByPlaceholder('Cái, chiếc, hộp...').fill(donVi);
	for (const t of tp) await chonTp(page, dr, t);
}

/** Bấm Xác nhận; trả { sp, combo, tb, loi, id }. */
async function luu(page, dr) {
	let rs = null;
	const choSp = page.waitForResponse((r) => /\/chain\/products(\/\d+)?(\?|$)/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), { timeout: 15_000 }).then((r) => { rs = r; return r; }).catch(() => null);
	const choCb = page.waitForResponse((r) => /product-combo/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), { timeout: 20_000 }).catch(() => null);
	await dr.getByRole('button', { name: /^(Xác nhận|Cập nhật)$/ }).first().click();
	// Gom toast NGAY (toast FE chặn tắt sau ~3s, chờ response 15s là mất).
	const tbs = new Set();
	for (let i = 0; i < 25 && !rs; i += 1) {
		for (const t of await page.locator('.ant-message-notice').allInnerTexts()) tbs.add(chuan(t));
		await page.waitForTimeout(300);
	}
	await choSp;
	const sp = rs ? await rs.json().catch(() => ({})) : null;
	const rc = sp && String(sp?.status?.code) === '200' ? await choCb : null;
	const combo = rc ? await rc.json().catch(() => ({})) : null;
	await page.waitForTimeout(1_500);
	for (const t of await page.locator('.ant-message-notice').allInnerTexts()) tbs.add(chuan(t));
	const tb = [...tbs].join(' | ');
	const loi = chuan((await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).join(' | '));
	return { sp, combo, tb, loi, id: sp?.data?.productId };
}
const thanhPhan = (id) => g.sql(`select c.product_id, c.variant_id, c.quantity from CHAIN_PRODUCT_COMBO c where c.product_combo_id=${Number(id)} and c.active=1 order by c.product_id`).split('\n').filter(Boolean);
const ten = (x) => g.TEN(`CB${x}_${g.hau()}`);

test.describe('08 — Sản phẩm gộp / combo (GHI)', () => {
	test.describe.configure({ timeout: 300_000 });

	test('08_090_001 — Thêm combo khi bỏ trống toàn bộ ô bắt buộc', async ({ page }) => {
		chanNeuTat('08_090_001');
		await moMan(page);
		const dr = await moThem(page);
		await oSkuC(dr).fill('');
		const daGoi = [];
		page.on('request', (r) => { if (['POST', 'PUT'].includes(r.method()) && /chain\/products/.test(r.url())) daGoi.push(r.url()); });
		await dr.getByRole('button', { name: 'Xác nhận' }).first().click();
		await page.waitForTimeout(2_000);
		const loi = (await dr.locator('.ant-form-item-has-error').allInnerTexts()).map(chuan);
		const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
		ghiDo(`thông báo "${tb}" · lỗi từng ô: ${JSON.stringify(loi)}`);
		expect(daGoi).toEqual([]);
		for (const o of ['Tên sản phẩm gộp', 'Danh mục', 'Mã SKU', 'Mã vạch', 'Mã kế toán', 'Đơn vị']) expect(loi.some((x) => x.includes(o)), `Ô "${o}" không báo lỗi riêng`).toBe(true);
	});

	test('08_090_002 — Thêm combo thủ công với đầy đủ thông tin bắt buộc', async ({ page }) => {
		chanNeuTat('08_090_002');
		const m = await moMan(page);
		try {
			const sku = g.MA(`CB2${g.hau()}`);
			const dr = await moThem(page);
			await dien(page, dr, { ten: ten(2), sku, bc: `${sku}B`, tp: [SP().sanPhamTheoGiaVon.tieuChuan.tenSanPham, SP().sanPhamTheoGiaVon.fifo.tenSanPham] });
			const o = dongTp(dr).first().locator('.ant-input-number-input');
			await o.fill('2');
			await o.blur();
			const kq = await luu(page, dr);
			m.taoRa.push(kq.id);
			const tp = kq.id ? thanhPhan(kq.id) : [];
			ghiDo(`SP ${kq.sp?.status?.code} · combo ${kq.combo?.status?.code} · "${kq.tb}" · thành phần ${JSON.stringify(tp)}`);
			expect(String(kq.sp?.status?.code)).toBe('200');
			expect(String(kq.combo?.status?.code)).toBe('200');
			expect(tp.length).toBe(2);
			expect(tp.map((x) => Number(x.split('\t')[2])).sort()).toEqual([1, 2]);
		} finally { await m.don(); }
	});

	test('08_090_003 — Thêm combo khi chọn danh mục CHA trong cây danh mục', async ({ page }) => {
		chanNeuTat('08_090_003');
		await moMan(page);
		const dr = await moThem(page);
		const cha = `${DMC.cha.ma} - ${DMC.cha.ten}`;
		const loi = await g.chonO(page, dr, /Danh mục/, cha).then(() => '', (e) => e.message.split('\n')[0]);
		ghiDo(`chọn danh mục cha "${cha}" ở form combo: ${loi || 'chọn được'}`);
		expect(loi, 'Không chọn được danh mục CHA ở form combo').toBe('');
	});

	test('08_090_004 — Bỏ trống sản phẩm trong danh sách thành phần combo', async ({ page }) => {
		chanNeuTat('08_090_004');
		await moMan(page);
		const dr = await moThem(page);
		await dien(page, dr, { ten: ten(4), sku: g.MA(`CB4${g.hau()}`), bc: g.MA(`CB4${g.hau()}B`) });
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'POST' && /chain\/products/.test(r.url())) daGoi.push(r.url()); });
		await dr.getByRole('button', { name: 'Xác nhận' }).first().click();
		await page.waitForTimeout(2_000);
		const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
		ghiDo(`không có "dòng trống" trong bảng thành phần (chỉ thêm bằng tick) · thông báo "${tb}" · request ${daGoi.length}`);
		expect(tb).toContain('Thêm ít nhất 1 sản phẩm/dịch vụ vào sản phẩm combo');
		expect(daGoi).toEqual([]);
	});

	test('08_090_005 — Thêm sản phẩm TRÙNG với sản phẩm đã có trong bảng thành phần', async ({ page }) => {
		chanNeuTat('08_090_005');
		await moMan(page);
		const dr = await moThem(page);
		const tc = SP().sanPhamTheoGiaVon.tieuChuan.tenSanPham;
		await chonTp(page, dr, tc);
		const sau1 = await dongTp(dr).count();
		await chonTp(page, dr, tc);
		const sau2 = await dongTp(dr).count();
		ghiDo(`chọn TC lần 1: ${sau1} dòng · chọn lại lần 2: ${sau2} dòng ⇒ ${sau2 === 0 ? 'tick lại = BỎ CHỌN (không trùng, không gộp)' : sau2 === 1 ? 'giữ 1 dòng' : 'cho 2 dòng trùng'}`);
		expect(sau1).toBe(1);
		expect(sau2, '🔴 Cho 2 dòng trùng cùng SP').toBeLessThan(2);
	});

	test('08_090_006 — Thêm sản phẩm CÓ BIẾN THỂ vào combo', async ({ page }) => {
		chanNeuTat('08_090_006');
		await moMan(page);
		const dr = await moThem(page);
		const bt = seed.doc().duLieu.sanPham.sanPhamBienThe;
		await chonTp(page, dr, bt.tenSanPham, 'Xanh');
		const dong = (await dongTp(dr).allInnerTexts()).map(chuan);
		ghiDo(`dòng thành phần: ${JSON.stringify(dong)}`);
		expect(dong.length).toBe(1);
		expect(dong[0], 'Dòng không mang biến thể cụ thể').toContain('Xanh');
	});

	test('08_090_007 — Thêm biến thể TRÙNG với biến thể đã có trong bảng', async ({ page }) => {
		chanNeuTat('08_090_007');
		await moMan(page);
		const dr = await moThem(page);
		const bt = seed.doc().duLieu.sanPham.sanPhamBienThe;
		await chonTp(page, dr, bt.tenSanPham, 'Xanh');
		await chonTp(page, dr, bt.tenSanPham, 'Xanh');
		const n = await dongTp(dr).count();
		ghiDo(`chọn biến thể Xanh 2 lần ⇒ ${n} dòng (${n === 0 ? 'tick lại = bỏ chọn' : n === 1 ? 'giữ 1' : 'trùng'})`);
		expect(n, '🔴 Cho 2 dòng trùng cùng biến thể').toBeLessThan(2);
	});

	test('08_090_008 — Tính duy nhất của SKU combo', async ({ page }) => {
		chanNeuTat('08_090_008');
		const m = await moMan(page);
		try {
			const kqs = [];
			for (const sku of [SP().sanPhamTheoGiaVon.tieuChuan.sku, seed.doc().duLieu.combo?.sku].filter(Boolean)) {
				const dr = await moThem(page);
				await dien(page, dr, { ten: ten(8), sku, bc: g.MA(`CB8${g.hau()}`), tp: [SP().sanPhamTheoGiaVon.fifo.tenSanPham] });
				const kq = await luu(page, dr);
				if (String(kq.sp?.status?.code) === '200') m.taoRa.push(kq.id);
				kqs.push({ sku, code: kq.sp?.status?.code ?? 'FE chặn', msg: kq.sp?.status?.message ?? kq.tb });
				await dr.getByRole('button', { name: /Hu[ỷy]/ }).first().click().catch(() => null);
				await page.waitForTimeout(1_000);
			}
			ghiDo(JSON.stringify(kqs));
			for (const k of kqs) expect(String(k.code), `SKU combo trùng ${k.sku} vẫn tạo được`).not.toBe('200');
		} finally { await m.don(); }
	});

	test('08_090_009 — Validate ô số của combo: Khối lượng, Thể tích, Kích thước', async ({ page }) => {
		chanNeuTat('08_090_009');
		await moMan(page);
		const dr = await moThem(page);
		const kq = {};
		for (const ph of ['Nhập khối lượng', 'Nhập thể tích', 'Dài', 'Rộng', 'Cao']) {
			const o = dr.getByPlaceholder(ph, { exact: true });
			const doc = async (v) => { await o.fill(''); await o.pressSequentially(v); await o.blur(); await page.waitForTimeout(200); return o.inputValue(); };
			kq[ph] = { chu: await doc('ab'), am: await doc('-5'), khong: await doc('0') };
		}
		ghiDo(JSON.stringify(kq));
		for (const [ph, v] of Object.entries(kq)) {
			expect(v.chu, `Ô ${ph} nhận chữ`).not.toMatch(/[a-z]/i);
			expect(v.am, `Ô ${ph} nhận số âm`).not.toMatch(/^-/);
		}
	});

	test('08_090_010 — Thêm nhanh danh mục từ form combo', async ({ page }) => {
		chanNeuTat('08_090_010');
		const m = await moMan(page);
		const h = g.hau();
		const tenDm = `${seed.PREFIX}DMT_CBNHANH_${h}`;
		let idDm = null;
		try {
			const dr = await moThem(page);
			await dr.getByRole('button', { name: /Thêm danh mục/ }).click();
			const d = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ has: page.locator('#catName') }).last();
			await expect(d.locator('#catName')).toBeVisible({ timeout: 20_000 });
			await d.locator('#catCode').fill(`${seed.PREFIX_MA}DCN${h}`).catch(() => null);
			await d.locator('#catName').fill(tenDm);
			const cho = page.waitForResponse((r) => /categor/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15_000 }).catch(() => null);
			await d.getByRole('button', { name: 'Xác nhận', exact: true }).click();
			const body = await (await cho)?.json().catch(() => ({}));
			await page.waitForTimeout(2_000);
			idDm = g.sql(`select id from CHAIN_PRODUCT_CATEGORY where cat_name='${tenDm}' limit 1`);
			const oDm = chuan(await dr.locator('.ant-form-item').filter({ has: page.getByRole('combobox', { name: /Danh mục/ }) }).first().innerText());
			ghiDo(`tạo ${body?.status?.code} · ô danh mục "${oDm}" · DB ${idDm}`);
			expect(idDm).toBeTruthy();
			expect(oDm, 'Danh mục mới không tự chọn vào ô Danh mục của combo').toContain(tenDm);
		} finally { if (idDm) await m.goi('PUT', '/chain/product-categories/individual/delete', { type: 10, catId: idDm }).catch(() => null); }
	});

	const themThuocTinh = async (dr, t, v) => {
		await dr.getByRole('button', { name: /Thêm thuộc tính/ }).click();
		await dr.page().waitForTimeout(500);
		await dr.getByPlaceholder('Tên', { exact: true }).last().fill(t);
		await dr.getByPlaceholder('Nhập giá trị', { exact: true }).last().fill(v);
	};

	test('08_090_011 — Thêm thuộc tính bổ sung cho combo', async ({ page }) => {
		chanNeuTat('08_090_011');
		const m = await moMan(page);
		try {
			const sku = g.MA(`CB11${g.hau()}`);
			const dr = await moThem(page);
			await dien(page, dr, { ten: ten(11), sku, bc: `${sku}B`, tp: [SP().sanPhamTheoGiaVon.fifo.tenSanPham] });
			await themThuocTinh(dr, 'Xuat xu', 'Viet Nam');
			await themThuocTinh(dr, 'Han dung', '12 thang');
			const kq = await luu(page, dr);
			m.taoRa.push(kq.id);
			const ct = (await m.goi('GET', `/chain/products/${kq.id}/info`))?.data;
			const tt = (ct?.attributes || []).map((a) => `${a.name}=${[].concat(a.value).join(',')}`).sort();
			ghiDo(`thuộc tính ${JSON.stringify(tt)}`);
			expect(tt).toEqual(['Han dung=12 thang', 'Xuat xu=Viet Nam']);
		} finally { await m.don(); }
	});

	test('08_090_012 — Tải lên hình ảnh minh hoạ combo', async ({ page }) => {
		chanNeuTat('08_090_012');
		const m = await moMan(page);
		try {
			const sku = g.MA(`CB12${g.hau()}`);
			const dr = await moThem(page);
			await dien(page, dr, { ten: ten(12), sku, bc: `${sku}B`, tp: [SP().sanPhamTheoGiaVon.fifo.tenSanPham] });
			const buffer = await page.screenshot({ clip: { x: 0, y: 0, width: 60, height: 60 } });
			await dr.locator('input[type=file]').first().setInputFiles([{ name: 'cb.png', mimeType: 'image/png', buffer }]);
			await page.waitForTimeout(2_000);
			const kq = await luu(page, dr);
			m.taoRa.push(kq.id);
			const n = g.sql(`select count(*) from CHAIN_PRODUCT_IMAGE where product_id=${kq.id}`);
			ghiDo(`lưu ${kq.sp?.status?.code} · ảnh DB ${n}`);
			expect(Number(n), 'Ảnh combo không lưu').toBe(1);
		} finally { await m.don(); }
	});

	test('08_090_013 — Tải lên ảnh combo sai định dạng hoặc quá dung lượng', async ({ page }) => {
		chanNeuTat('08_090_013');
		await moMan(page);
		const dr = await moThem(page);
		const oF = dr.locator('input[type=file]').first();
		const tbSau = async () => { await page.waitForTimeout(2_000); return chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | ')); };
		await oF.setInputFiles([{ name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n') }]);
		const tbPdf = await tbSau();
		await oF.setInputFiles([{ name: 'to.png', mimeType: 'image/png', buffer: Buffer.alloc(900 * 1024, 1) }]);
		const tbTo = await tbSau();
		ghiDo(`pdf "${tbPdf}" · 900KB "${tbTo}"`);
		expect(tbPdf).toContain('Bạn chỉ có thể tải lên file có định dạng image!');
		expect(tbTo).toContain('Ảnh up không được vượt quá giới hạn 800Kb!');
	});

	test('08_090_014 — Thêm combo với ĐẦY ĐỦ mọi thông tin', async ({ page }) => {
		chanNeuTat('08_090_014');
		const m = await moMan(page);
		const h = g.hau();
		try {
			const sku = g.MA(`CB14${h}`);
			const dr = await moThem(page);
			await dien(page, dr, { ten: ten(14), sku, bc: `${sku}B`, tp: [SP().sanPhamTheoGiaVon.fifo.tenSanPham, SP().sanPhamTheoGiaVon.tieuChuan.tenSanPham] });
			await dr.getByPlaceholder('Nhập mã nội bộ').fill(`NB${h}`);
			await dr.getByRole('radio', { name: 'Hàng hóa' }).check();
			await dr.getByPlaceholder('Nhập khối lượng', { exact: true }).fill('500');
			await dr.getByPlaceholder('Nhập thể tích', { exact: true }).fill('250');
			await dr.getByPlaceholder('Dài', { exact: true }).fill('20');
			await dr.getByPlaceholder('Rộng', { exact: true }).fill('10');
			await dr.getByPlaceholder('Cao', { exact: true }).fill('5');
			await themThuocTinh(dr, 'Xuat xu', 'Viet Nam');
			const kq = await luu(page, dr);
			m.taoRa.push(kq.id);
			const ct = (await m.goi('GET', `/chain/products/${kq.id}/info`))?.data;
			const so = { internalCode: ct?.internalCode, goodsMaterialType: ct?.goodsMaterialType, cweight: ct?.cweight, volume: ct?.volume, kt: [ct?.clength, ct?.cwidth, ct?.cheight], tt: (ct?.attributes || []).map((a) => a.name), tp: thanhPhan(kq.id).length };
			ghiDo(JSON.stringify(so));
			expect(so.internalCode).toBe(`NB${h}`);
			expect(so.goodsMaterialType).toBe('HANG_HOA');
			expect(Number(so.cweight)).toBe(500);
			expect(Number(so.volume)).toBe(250);
			expect(so.kt.map(Number)).toEqual([20, 10, 5]);
			expect(so.tt).toContain('Xuat xu');
			expect(so.tp).toBe(2);
		} finally { await m.don(); }
	});

	// ───── 030_020–022: sửa / xoá combo ─────
	async function moSuaCombo(page, sku) {
		const o = khung(page).getByPlaceholder('Tìm kiếm theo tên');
		await o.fill(sku.replace(/^.*?_/, ''));
		await o.press('Enter');
		await page.waitForTimeout(2_500);
		const d = khung(page).locator('tr.ant-table-row').filter({ hasText: sku }).first();
		await expect(d).toBeVisible({ timeout: 20_000 });
		return d;
	}

	test('08_030_020 — Sửa combo sản phẩm khi xoá HẾT sản phẩm trong bảng danh sách', async ({ page }) => {
		chanNeuTat('08_030_020');
		const m = await moMan(page);
		try {
			const tc = await g.taoSpApi(m, { ten: g.TEN(`TP20_${g.hau()}`), sku: g.MA(`TP20${g.hau()}`) });
			const c = await g.taoCombo(m, [tc], g.TEN(`CB20_${g.hau()}`));
			await page.reload();
			await page.waitForTimeout(3_000);
			const d = await moSuaCombo(page, c.ten);
			await g.thaoTac(page, d, /Xem chi tiết|Chỉnh sửa|Sửa/);
			const nutSua = page.getByRole('dialog', { name: 'Chi tiết sản phẩm gộp' }).getByRole('button', { name: /Chỉnh sửa/ });
			if (await nutSua.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) await nutSua.click();
			const dr = page.locator('.ant-drawer-open').last();
			await page.waitForTimeout(2_000);
			while (await dongTp(dr).count()) { await dongTp(dr).first().locator('button, .anticon-delete, [aria-label=delete]').last().click(); await page.waitForTimeout(600); }
			const kq = await luu(page, dr);
			const tp = thanhPhan(c.id);
			ghiDo(`lưu ${kq.sp?.status?.code ?? 'FE chặn'} "${kq.tb}" · thành phần DB còn ${tp.length}`);
			expect(kq.tb).toContain('Thêm ít nhất 1 sản phẩm/dịch vụ vào sản phẩm combo');
			expect(tp.length).toBe(1);
		} finally { m.taoRa.reverse(); await m.don(); }
	});

	test('08_030_021 — Sửa combo sản phẩm thành công', async ({ page }) => {
		chanNeuTat('08_030_021');
		const m = await moMan(page);
		try {
			const a = await g.taoSpApi(m, { ten: g.TEN(`TP21A_${g.hau()}`), sku: g.MA(`TP21A${g.hau()}`) });
			const b = await g.taoSpApi(m, { ten: g.TEN(`TP21B_${g.hau()}`), sku: g.MA(`TP21B${g.hau()}`) });
			const c = await g.taoCombo(m, [a], g.TEN(`CB21_${g.hau()}`));
			await page.reload();
			await page.waitForTimeout(3_000);
			const d = await moSuaCombo(page, c.ten);
			await g.thaoTac(page, d, /Xem chi tiết|Chỉnh sửa|Sửa/);
			const nutSua = page.getByRole('dialog', { name: 'Chi tiết sản phẩm gộp' }).getByRole('button', { name: /Chỉnh sửa/ });
			if (await nutSua.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) await nutSua.click();
			const dr = page.locator('.ant-drawer-open').last();
			await page.waitForTimeout(2_000);
			await dr.getByRole('textbox', { name: /Tên sản phẩm gộp/ }).fill(`${c.ten}_SUA`);
			const o = dongTp(dr).first().locator('.ant-input-number-input');
			await o.fill('3');
			await o.blur();
			await chonTp(page, dr, b.ten);
			const kq = await luu(page, dr);
			const tp = thanhPhan(c.id);
			const ct = (await m.goi('GET', `/chain/products/${c.id}/info`))?.data;
			ghiDo(`lưu ${kq.sp?.status?.code} / combo ${kq.combo?.status?.code} "${kq.tb}" · tên ${ct?.productName} · thành phần ${JSON.stringify(tp)}`);
			expect(ct?.productName).toBe(`${c.ten}_SUA`);
			expect(tp.length).toBe(2);
			expect(tp.some((x) => x.startsWith(`${a.id}\t`) && Number(x.split('\t')[2]) === 3), 'SL thành phần A không thành 3').toBe(true);
		} finally { m.taoRa.reverse(); await m.don(); }
	});

	test('08_030_022 — Xoá combo CHƯA phát sinh giao dịch', async ({ page }) => {
		chanNeuTat('08_030_022');
		const m = await moMan(page);
		try {
			const a = await g.taoSpApi(m, { ten: g.TEN(`TP22_${g.hau()}`), sku: g.MA(`TP22${g.hau()}`) });
			const c = await g.taoCombo(m, [a], g.TEN(`CB22_${g.hau()}`));
			await page.reload();
			await page.waitForTimeout(3_000);
			const d = await moSuaCombo(page, c.ten);
			await g.thaoTac(page, d, /Xóa/);
			const hop = page.getByRole('tooltip').filter({ hasText: /hoàn tác|xóa/i }).last();
			const hop2 = page.getByRole('dialog').filter({ hasText: /xóa/i }).last();
			const cho = page.waitForResponse((r) => r.request().method() === 'DELETE', { timeout: 20_000 }).catch(() => null);
			if (await hop.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) await hop.getByRole('button', { name: 'Đồng ý' }).click();
			else await hop2.getByRole('button', { name: /OK|Đồng ý|Xác nhận/ }).last().click();
			const body = await (await cho)?.json().catch(() => ({}));
			await page.waitForTimeout(2_000);
			const conCombo = g.sql(`select coalesce(active,0) from CHAIN_PRODUCTS where product_id=${c.id}`);
			const conTp = g.sql(`select coalesce(active,0) from CHAIN_PRODUCTS where product_id=${a.id}`);
			ghiDo(`xoá ${body?.status?.code} "${body?.status?.message}" · combo active=${conCombo} · thành phần active=${conTp}`);
			expect(String(body?.status?.code)).toBe('200');
			expect(conTp, 'Xoá combo kéo theo xoá SP thành phần').toBe('1');
			m.taoRa.splice(m.taoRa.indexOf(c.id), 1);
		} finally { await m.don(); }
	});
});
