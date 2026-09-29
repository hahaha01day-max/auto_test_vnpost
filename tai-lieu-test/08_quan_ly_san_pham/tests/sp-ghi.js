'use strict';

/**
 * Helper GHI phân hệ 08 — form Thêm/Sửa sản phẩm + dọn SP tạm bằng API, vai `tct` (26/09/2026, vnpost-web develop).
 *
 * Đo DOM 26/09 (`zz` thăm dò làn 5):
 * - Thông tin cơ bản: "Tên sản phẩm" · combobox "* Danh mục" (TreeSelect, nút "Thêm danh mục") · SKU `Nhập SKU` · barcode
 *   `Nhập mã barcode` · `Nhập mã kế toán` · VAT mặc định 8%. Có biến thể ⇒ SKU/barcode cơ bản **disabled**, placeholder
 *   "Quản lý theo biến thể bên dưới".
 * - "Biến thể & Đơn vị quy đổi": `* Đơn vị` (placeholder "VD: ml, hộp, chai, thùng") · nút "Thêm đơn vị quy đổi" ⇒ dòng bảng
 *   (`Nhập tên đơn vị` · spinbutton `Nhập số lượng` · combobox đơn vị gốc · `Nhập SKU` · `Nhập Barcode` · nút close).
 * - Phân loại: nút "Thêm phân loại" ⇒ ô `Tên` + Select tags "Nhập giá trị"; bảng "Cấu hình giá bán" mỗi biến thể một dòng
 *   (SKU tự sinh 6 số, `* Barcode` trống).
 * - Lưu: "Xác nhận" ⇒ `POST /chain/products` (TCT dùng API chain). Thành công: toast "Thêm thành công".
 * - Xoá: `DELETE /chain/products/multi?productIds=…` (khuôn `ModalConfirmDeleteMultipleProducts.jsx`).
 * 🔴 SP tạm: tên `<PREFIX>SPT_<hậu tố>`, SKU `A<làn>SPT<hậu tố>…`, dọn ở finally bằng `don()`.
 */

const { expect } = require('@playwright/test');
const seed = require('../../00_seed/seed-state');
const { chon: chonO } = require('../../00_seed/helpers');
const { chon } = require('../../shared/db/otp');
const { batHeader, goiGhi } = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const { khung, moSanPham, chuan } = require('./product-page');

const hau = () => Date.now().toString().slice(-7);
const TEN = (x) => `${seed.PREFIX}SPT_${x}`;
const MA = (x) => `${seed.PREFIX_MA}SPT${x}`;
const sql = (q) => chon(q, 'VNPOST_CORE');

/** Mở màn SP bằng vai `tct`, bắt header để gọi API trên CHÍNH phiên này (🚫 phiên phụ cùng tài khoản — xoay token). */
async function moMan(page) {
	const st = batHeader(page);
	await moSanPham(page, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const taoRa = [];
	return {
		st,
		taoRa,
		goi: (m, u, q, b) => goiGhi(page, st, m, u, q, b),
		/** Xoá mọi SP đã ghi nhận (bỏ qua lỗi — SP có giao dịch thì để lại, ghi chú). */
		don: async () => {
			const ids = [...new Set(taoRa.filter(Boolean))];
			if (ids.length) await goiGhi(page, st, 'DELETE', '/chain/products/multi', { productIds: ids.join(',') }).catch(() => null);
		},
	};
}

async function moFormThem(page) {
	await khung(page).getByRole('button', { name: 'Thêm mới' }).first().click({ force: true });
	const dr = page.getByRole('dialog', { name: 'Thêm sản phẩm' }).last();
	await expect(dr.getByPlaceholder('Tên sản phẩm', { exact: true })).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(1_000);
	return dr;
}

const oSku = (dr) => dr.getByRole('textbox', { name: /SKU \( Dành cho người bán \)/ });
const oBc = (dr) => dr.getByRole('textbox', { name: /Mã barcode \(sử dụng máy quét\)/ });
const bangDvqd = (dr) => dr.locator('#config-units');
const dongDvqd = (dr) => bangDvqd(dr).locator('tbody tr.ant-table-row');
// 🔴 `has` phải là locator TƯƠNG ĐỐI (page.…), 🚫 dr.getByRole (neo sẵn vào drawer ⇒ không khớp gì).
const bangBienThe = (dr) => dr.locator('table').filter({ has: dr.page().getByRole('columnheader', { name: 'Phân loại', exact: true }) });
const dongBienThe = (dr) => bangBienThe(dr).locator('tbody tr.ant-table-row');

/** Khai thông tin cơ bản tối thiểu (danh mục = danh mục seed làn, trừ khi truyền `danhMuc`). */
async function dienCoBan(page, dr, { ten, sku, bc, maKt, danhMuc, donVi = 'Cái' }) {
	await dr.getByPlaceholder('Tên sản phẩm', { exact: true }).fill(ten);
	// 🔴 Nhãn node cây = "<mã> - <tên>" (khuôn seed 10); danh mục GỐC bị khoá (preventRootSelection).
	const sp = seed.doc().duLieu.sanPham;
	await chonO(page, dr, /Danh mục/, danhMuc ?? `${sp.maDanhMuc} - ${sp.tenDanhMuc}`);
	if (sku !== undefined) await oSku(dr).fill(sku);
	if (bc !== undefined) await oBc(dr).fill(bc);
	await dr.getByPlaceholder('Nhập mã kế toán').fill(maKt ?? (sku || MA(hau())));
	if (donVi) await dr.getByPlaceholder('VD: ml, hộp, chai, thùng').fill(donVi);
}

/** Thêm một dòng đơn vị quy đổi (dòng cuối bảng). */
async function themDvqd(page, dr, { ten, sl, sku, bc }) {
	await dr.getByRole('button', { name: /Thêm đơn vị quy đổi/ }).click();
	await page.waitForTimeout(500);
	const d = dongDvqd(dr).last();
	await d.getByPlaceholder('Nhập tên đơn vị').fill(ten);
	if (sl) { const o = d.getByRole('spinbutton'); await o.fill(String(sl)); await o.blur(); }
	if (sku !== undefined && await d.getByPlaceholder('Nhập SKU').isEnabled().catch(() => false)) await d.getByPlaceholder('Nhập SKU').fill(sku);
	if (bc !== undefined && await d.getByPlaceholder('Nhập Barcode').isEnabled().catch(() => false)) await d.getByPlaceholder('Nhập Barcode').fill(bc);
	return d;
}

/** Thêm phân loại `ten` với các giá trị. */
async function themPhanLoai(page, dr, ten, giaTri) {
	await dr.getByRole('button', { name: /Thêm phân loại/ }).click();
	await page.waitForTimeout(500);
	// Ô "Tên" của phân loại nằm trong khối có Select "Nhập giá trị" (🚫 nhầm ô "Tên" của thuộc tính bổ sung).
	const khoi = dr.locator('.ant-form-item').filter({ hasText: 'Bạn có thể thêm biến thể' }).first();
	const o = khoi.getByPlaceholder('Tên', { exact: true }).last();
	await o.fill(ten);
	// Select tags "Nhập giá trị" = .ant-select ĐẦU TIÊN đứng sau ô Tên (🚫 ancestor ant-row — layout không chắc có Row).
	const gt0 = o.locator('xpath=following::div[contains(concat(" ",normalize-space(@class)," ")," ant-select ")][1]');
	// 🔴 Neo theo id input: có biến thể thì bảng giá chèn thêm Select "Barcode phụ" ⇒ `following::[1]` trôi sang ô khác.
	const idIn = await gt0.locator('input').first().getAttribute('id');
	const gt = dr.locator('.ant-select').filter({ has: dr.page().locator(`[id="${idIn}"]`) });
	await gt.click();
	// 🔴 Đo 26/09: gõ liền tay chỉ giữ giá trị CUỐI (state phân loại cập nhật trễ) ⇒ mỗi giá trị chờ tag hiện rồi mới gõ tiếp.
	for (const v of giaTri) {
		await gt.locator('input').first().pressSequentially(v, { delay: 30 });
		await page.keyboard.press('Enter');
		// antd v6 đổi class tag ⇒ đo bằng chữ của cả ô.
		await expect.poll(async () => (await gt.innerText()).includes(v), { timeout: 5_000 }).toBe(true);
		await page.waitForTimeout(600);
	}
	await page.keyboard.press('Escape');
	await dr.locator('.ant-drawer-body').first().click({ position: { x: 5, y: 5 } }).catch(() => null);
	await expect(dongBienThe(dr)).toHaveCount(giaTri.length, { timeout: 10_000 }).catch(() => null);
	await page.waitForTimeout(800);
}

/** Xoá phân loại thứ i (nút close cạnh ô giá trị). */
async function xoaPhanLoai(page, dr, i = 0) {
	const khoi = dr.locator('.ant-form-item').filter({ hasText: 'Bạn có thể thêm biến thể' }).first();
	await khoi.getByRole('button', { name: 'close', exact: true }).nth(i).click();
	await page.waitForTimeout(1_000);
}

/** Điền barcode (và SKU nếu truyền) cho mọi dòng biến thể đang hiện — cả dòng con (đơn vị quy đổi của biến thể) nếu có. */
async function dienBienThe(page, dr, goc) {
	const bang = bangBienThe(dr);
	// Bung mọi dòng để lộ dòng đơn vị con.
	for (const c of await bang.locator('img[aria-label="caret-right"]').all()) await c.click().catch(() => null);
	const sku = bang.getByPlaceholder('Nhập SKU');
	const bc = bang.getByPlaceholder(/^(Nhập Barcode|Barcode)$/);
	const n = await bc.count();
	for (let i = 0; i < n; i += 1) {
		const o = bc.nth(i);
		if (await o.isEnabled().catch(() => false) && !(await o.inputValue())) await o.fill(`${goc}B${i}`);
	}
	for (let i = 0; i < (await sku.count()); i += 1) {
		const o = sku.nth(i);
		if (await o.isEnabled().catch(() => false)) await o.fill(`${goc}S${i}`);
	}
}

/** Bấm Xác nhận; trả { res, body, id, tb } (res null nếu FE chặn). */
async function luu(page, dr, { method = 'POST', re = /\/chain\/products(\/\d+)?(\?|$)/ } = {}) {
	const cho = page.waitForResponse((r) => re.test(r.url()) && r.request().method() === method, { timeout: 15_000 }).catch(() => null);
	// Form thêm: "Xác nhận" · form sửa: "Cập nhật".
	await dr.getByRole('button', { name: /^(Xác nhận|Cập nhật)$/ }).last().click();
	const res = await cho;
	const body = res ? await res.json().catch(() => ({})) : null;
	await page.waitForTimeout(1_500);
	const tb = chuan((await page.locator('.ant-message-notice, .ant-notification-notice').allInnerTexts()).join(' | '));
	const loi = chuan((await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).join(' | '));
	return { res, body, id: body?.data?.productId, tb, loi };
}

/** Dòng CHAIN_PRODUCT_UNIT còn hiệu lực của SP: [{id, unit, exchange, parent, sku, bc, variant, convert}]. */
function donViDb(productId) {
	const t = sql(`select product_unit_id, unit, exchange_value, parent_id, coalesce(sku,''), coalesce(bar_code,''), coalesce(variant_id,0), coalesce(convert_to_main_unit,'NULL') from CHAIN_PRODUCT_UNIT where product_id=${Number(productId)} and coalesce(is_deleted,0)=0 order by product_unit_id`);
	return t ? t.split('\n').map((l) => { const [id, unit, ex, parent, sku, bc, variant, convert] = l.split('\t'); return { id: +id, unit, ex: +ex, parent: +parent, sku, bc, variant: +variant, convert }; }) : [];
}

/** Bất biến đơn vị (memory chain_product_unit_variant_no_parent0 / transfer_unit_label_vs_stock_mismatch). */
function kiemBatBien(ds) {
	const loi = [];
	const bienThe = [...new Set(ds.filter((d) => d.variant).map((d) => d.variant))];
	for (const v of bienThe) {
		const dv = ds.filter((d) => d.variant === v);
		if (dv.some((d) => d.parent === 0)) loi.push(`biến thể ${v} có dòng parent_id=0`);
		const goc = dv.filter((d) => String(d.convert) === '1');
		if (goc.length !== 1) loi.push(`biến thể ${v} có ${goc.length} dòng convert_to_main_unit=1`);
	}
	const skus = ds.filter((d) => d.variant && d.sku).map((d) => d.sku);
	const trung = skus.filter((s, i) => skus.indexOf(s) !== i);
	if (trung.length) loi.push(`SKU trùng giữa các dòng biến thể: ${[...new Set(trung)].join(',')}`);
	return loi;
}

/** Tạo SP qua FORM (khai = async (dr) => …), trả { id, sku } — ghi nhận để dọn. */
async function taoQuaForm(page, m, khai) {
	const dr = await moFormThem(page);
	await khai(dr);
	const kq = await luu(page, dr);
	expect(String(kq.body?.status?.code), `Tạo SP tạm lỗi: ${kq.body?.status?.message ?? kq.tb} ${kq.loi}`).toBe('200');
	m.taoRa.push(kq.id);
	await expect(dr).toBeHidden({ timeout: 15_000 }).catch(() => null);
	return { id: kq.id, data: kq.body?.data };
}

/** Tạo SP đơn giản bằng API (khuôn seed 4.2), có thể kèm đơn vị quy đổi `dvqd: [{ unit, exchangeValue }]`. */
async function taoSpApi(m, { ten, sku, dvqd = [], requireStock = true, vat = 0 }) {
	const h = m.st.h;
	const r = await m.goi('POST', '/chain/products', {}, {
		productName: ten, sku, barCode: sku, accountingCode: sku, deductibleTaxPercent: vat, unit: 'Cái',
		categoryId: Number(seed.doc().duLieu.sanPham.idDanhMuc), categoryName: 'Sản phẩm', isTopping: false, distributionMethod: 'MUA_BAN',
		goodsMaterialType: 'KHONG_PHAN_LOAI', isLoyalty: true, price: 0, chainId: Number(h.chainid), type: 0, isSell: 1, attributes: [],
		options: [], variants: [], productUnits: dvqd.map((d) => ({ unit: d.unit, exchangeValue: d.exchangeValue, parentUnit: 'Cái', sku: `${sku}${d.unit}` })),
		images: [], imageUrl: [], description: 'AUTO TEST 08 — SP tạm', requireStock, quantityWarning: null, stockType: requireStock ? 'MAC' : null,
		isSerialRequired: false, enableVat: true, vatPercent: 0, directTaxPercent: 0, pitTaxPercent: 0, specialProductCategory: null,
		isIngredient: false, clength: null, cwidth: null, cheight: null, active: true, status: 'KICH_HOAT', priceBeforeDiscount: 0,
		isComposite: false, secondaryBarCodes: [],
	});
	expect(String(r?.status?.code), `Tạo SP API lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
	const id = r?.data?.productId;
	m.taoRa.push(id);
	const [productUnitId, variantId] = sql(`select product_unit_id, variant_id from CHAIN_PRODUCT_UNIT where product_id=${id} and variant_id is not null and convert_to_main_unit=1 order by product_unit_id limit 1`).split('\t');
	return { id, sku, ten, productUnitId: Number(productUnitId), variantId: Number(variantId), unit: 'Cái' };
}

/** Tìm SP trên danh sách; trả dòng. */
async function dongSp(page, tuKhoa) {
	const { tim } = require('./product-page');
	await tim(page, tuKhoa);
	const d = khung(page).locator('tr.ant-table-row').filter({ hasText: tuKhoa }).first();
	await expect(d, `Không thấy SP "${tuKhoa}" trên danh sách`).toBeVisible({ timeout: 20_000 });
	return d;
}

async function thaoTac(page, dong, muc) {
	await dong.getByRole('button', { name: 'Thao tác' }).click();
	await page.waitForTimeout(800);
	await page.locator('.ant-dropdown:not(.ant-dropdown-hidden)').getByRole('menuitem', { name: muc }).last().click({ force: true });
}

/** Mở drawer "Cập nhật sản phẩm" từ danh sách (Thao tác › Xem chi tiết › Sửa thông tin). */
async function moSua(page, tuKhoa) {
	const d = await dongSp(page, tuKhoa);
	await thaoTac(page, d, 'Xem chi tiết');
	const ct = page.getByRole('dialog', { name: 'Chi tiết sản phẩm' }).last();
	await expect(ct).toBeVisible({ timeout: 20_000 });
	await ct.getByRole('button', { name: /Sửa thông tin/ }).click();
	const dr = page.getByRole('dialog', { name: 'Cập nhật sản phẩm' }).last();
	await expect(dr.getByPlaceholder('Tên sản phẩm', { exact: true })).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(1_500);
	return dr;
}

/** Xoá SP qua giao diện (Thao tác › Xóa › "Xác nhận xóa sản phẩm"); trả { code, msg, tb, conTrenDs }. */
async function xoaUi(page, tuKhoa) {
	// Đóng drawer chi tiết/sửa còn mở (che nút Thao tác).
	for (let i = 0; i < 3 && (await page.locator('.ant-drawer-open').count()); i += 1) { await page.keyboard.press('Escape'); await page.waitForTimeout(600); }
	const d = await dongSp(page, tuKhoa);
	await thaoTac(page, d, 'Xóa');
	// Xoá 1 SP = Popconfirm (tooltip) "Hành động này sẽ không thể hoàn tác…" nút Hủy / Đồng ý.
	const hop = page.getByRole('tooltip').filter({ hasText: 'không thể hoàn tác' }).last();
	await expect(hop).toBeVisible({ timeout: 15_000 });
	const cho = page.waitForResponse((r) => /\/products.*multi|\/chain\/products\/\d+/.test(r.url()) && r.request().method() === 'DELETE', { timeout: 20_000 }).catch(() => null);
	await hop.getByRole('button', { name: 'Đồng ý' }).click();
	const res = await cho;
	const body = res ? await res.json().catch(() => ({})) : null;
	await page.waitForTimeout(2_500);
	const tb = chuan((await page.locator('.ant-message-notice, .ant-notification-notice, .ant-modal-confirm, [role=dialog]:visible').allInnerTexts()).join(' | ')).slice(0, 600);
	await page.keyboard.press('Escape').catch(() => null);
	const { tim } = require('./product-page');
	await tim(page, tuKhoa);
	const conTrenDs = await khung(page).locator('tr.ant-table-row').filter({ hasText: tuKhoa }).count();
	return { code: body?.status?.code, msg: body?.status?.message, label: body?.status?.label, data: body?.data, tb, conTrenDs };
}

/** Nhập kho 1 phiếu (5 cái) cho SP ở điểm bán seed bằng phiên phụ `seed_gdv` — tạo "giao dịch" cho SP. */
async function nhapKho(browser, x, sl = 5) {
	const { moPhienPhu } = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
	const ps = await moPhienPhu(browser, 'seed_gdv', '/inventory/import');
	try {
		const shopId = Number(ps.st.h.shopid);
		const kho = ((await goiGhi(ps.page, ps.st, 'GET', `/shops/${shopId}/inventory`))?.data || []).find((k) => k.isDefault)?.id;
		expect(kho, 'Không tìm được kho mặc định của seed_gdv').toBeTruthy();
		const h = hau();
		const ngay = new Date().toISOString().slice(0, 10);
		const tao = await goiGhi(ps.page, ps.st, 'POST', '/stock/v3/import-export', { shopId }, {
			code: `NK${h}SPT`, objectId: 0, objectType: 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0,
			note: 'AUTO TEST 08 — tạo giao dịch cho SP tạm', actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: false,
			items: [{ amount: 1000 * sl, price: 1000, productId: x.id, productName: x.ten, batchCode: null,
				batchProducts: [{ batchCode: `A8SPT${h}`, quantity: sl, manufactureDate: ngay, expiryDate: '2027-12-31', serials: [] }],
				quantity: sl, serials: [], totalAmount: 1000 * sl, unit: x.unit, variantId: x.variantId, variantName: null, itemId: null, shopId,
				inventoryId: kho, productUnit: x.unit, convertToMainUnit: 1, productUnitId: x.productUnitId }],
		});
		const id = tao?.data?.stockInOutId ?? tao?.stockInOutId;
		expect(id, `Nhập kho SP tạm lỗi: ${JSON.stringify(tao?.status ?? tao).slice(0, 300)}`).toBeTruthy();
		await goiGhi(ps.page, ps.st, 'POST', '/stock/v3/import-export/confirm', { shopId, stockInOutId: id });
		return id;
	} finally { await ps.dong(); }
}

/** Bảng giá riêng chứa SP (khuôn seed 16.1), phạm vi xã seed; trả priceListId. */
async function bangGia(m, x, gia = 10_000) {
	const hai = (n) => String(n).padStart(2, '0');
	const d = new Date();
	const ten = `${seed.PREFIX}BG_SPT_${hau()}`;
	await m.goi('POST', '/chain-price-list/create', {}, {
		name: ten, versionName: `${ten}_PB`, startDate: `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`, endDate: null,
		startTime: null, endTime: null, status: 1, includeTax: 1, priceListScopeMode: 'REGION', scopeType: 3,
		scopes: [{ scopeType: 'BUU_DIEN_XA', orgUnitCode: seed.doc().duLieu.diemBan.maXa }],
		items: [{ sku: x.sku, unitPrice: gia, listedPrice: gia, discountRate: 0 }],
	});
	const ds = (await m.goi('GET', '/chain-price-list/get-all', { page: 0, size: 10, name: ten }))?.data || [];
	const bg = ds.find((b) => b.name === ten);
	expect(bg?.priceListId, `Không tạo được bảng giá ${ten}`).toBeTruthy();
	return bg.priceListId;
}

/** Combo (khuôn seed 15) gồm các SP `tp` ({productId, variantId, productUnitId}); trả { id, sku, ten }. */
async function taoCombo(m, tp, ten) {
	const h = m.st.h;
	const sku = MA(`C${hau()}`);
	const r = await m.goi('POST', '/chain/products', {}, {
		productName: ten ?? TEN(`COMBO_${hau()}`), sku, barCode: sku, accountingCode: sku, deductibleTaxPercent: 0, unit: 'Combo',
		categoryId: Number(seed.doc().duLieu.sanPham.idDanhMuc), categoryName: 'Sản phẩm', isTopping: false, distributionMethod: 'MUA_BAN',
		goodsMaterialType: 'KHONG_PHAN_LOAI', isLoyalty: false, price: 0, chainId: Number(h.chainid), type: 10, isSell: 1, attributes: [],
		options: [], variants: [], images: [], imageUrl: [], requireStock: true, enableVat: true, vatPercent: 0, active: true, status: 'KICH_HOAT',
		priceBeforeDiscount: 0, description: 'AUTO TEST 08 — combo tạm',
	});
	expect(String(r?.status?.code), `Tạo combo lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
	const id = r?.data?.productId ?? Number(sql(`select product_id from CHAIN_PRODUCT_UNIT where sku='${sku}' order by product_unit_id desc limit 1`));
	m.taoRa.push(id);
	const c = await m.goi('POST', '/chain/products/product-combo', {}, { productComboId: id, productsCombo: tp.map((x) => ({ productId: x.productId ?? x.id, variantId: x.variantId, quantity: 1, productUnitId: x.productUnitId })) });
	expect(String(c?.status?.code), `Gắn thành phần combo lỗi: ${JSON.stringify(c?.status)}`).toBe('200');
	return { id, sku, ten: r?.data?.productName ?? ten };
}

module.exports = { goiGhi, taoQuaForm, taoSpApi, dongSp, thaoTac, moSua, xoaUi, nhapKho, bangGia, taoCombo, bangBienThe, hau, TEN, MA, sql, moMan, moFormThem, oSku, oBc, bangDvqd, dongDvqd, dongBienThe, dienCoBan, themDvqd, themPhanLoai, xoaPhanLoai, dienBienThe, luu, donViDb, kiemBatBien, chonO };
