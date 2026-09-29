'use strict';

/**
 * 08 · 020_005–020_020 — Form Thêm sản phẩm, GHI THẬT, vai `tct` (26/09/2026).
 *
 * SP tạm `AUTO<làn>_SPT_*` xoá lại ở finally (`DELETE /chain/products/multi`). Kiểm "mở lại chi tiết" bằng
 * `GET /chain/products/{id}/info` (API màn chi tiết gọi) + bất biến đơn vị ở `CHAIN_PRODUCT_UNIT` (chỉ SELECT).
 * 🔴 Danh mục = danh mục seed làn (`AUTO<làn>_DANHMUC`, con của `AUTO<làn>_DANHMUCCHA`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const g = require('./sp-ghi');
const { chuan } = require('./product-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const chiTiet = async (m, id) => (await m.goi('GET', `/chain/products/${id}/info`))?.data;

/** Ảnh PNG thật (chụp màn) làm tệp tải lên. */
async function anh(page, ten, w = 60) {
	const buffer = await page.screenshot({ clip: { x: 0, y: 0, width: w, height: w } });
	return { name: ten, mimeType: 'image/png', buffer };
}
const oFileAnh = (dr) => dr.locator('input[type=file][accept*=".png"]').first();

test.describe('08 — Form Thêm sản phẩm (GHI)', () => {
	test.describe.configure({ timeout: 300_000 });

	test('08_020_005 — SKU và Barcode ở Thông tin cơ bản khi thêm rồi XOÁ biến thể', async ({ page }) => {
		chanNeuTat('08_020_005');
		await g.moMan(page);
		const dr = await g.moFormThem(page);
		await g.oSku(dr).fill('A8SKU005');
		await g.oBc(dr).fill('A8BC005');
		await g.themPhanLoai(page, dr, 'Màu', ['Do']);
		const khoaSku = await g.oSku(dr).isDisabled();
		const khoaBc = await g.oBc(dr).isDisabled();
		const phSku = await g.oSku(dr).getAttribute('placeholder');
		await g.xoaPhanLoai(page, dr);
		const sau = { sku: await g.oSku(dr).inputValue(), bc: await g.oBc(dr).inputValue(), mo: await g.oSku(dr).isEnabled() };
		ghiDo(`có biến thể: SKU disabled=${khoaSku}, Barcode disabled=${khoaBc}, placeholder "${phSku}" (ô vẫn hiện, chỉ khoá) · xoá biến thể: ${JSON.stringify(sau)}`);
		expect(khoaSku && khoaBc, 'Có biến thể mà SKU/Barcode cơ bản không bị khoá').toBe(true);
		expect(sau.mo, 'Xoá hết biến thể mà ô SKU cơ bản không mở lại').toBe(true);
		expect(sau.sku, 'Xoá biến thể làm MẤT SKU đã nhập ở Thông tin cơ bản').toBe('A8SKU005');
		expect(sau.bc, 'Xoá biến thể làm MẤT Barcode đã nhập ở Thông tin cơ bản').toBe('A8BC005');
	});

	test('08_020_006 — SKU và Barcode ở Thông tin cơ bản khi nhập, xoá, rồi thêm biến thể', async ({ page }) => {
		chanNeuTat('08_020_006');
		await g.moMan(page);
		const dr = await g.moFormThem(page);
		await g.oSku(dr).fill('A8SKU006');
		await g.oBc(dr).fill('A8BC006');
		await g.oSku(dr).fill('');
		await g.oBc(dr).fill('');
		await g.themPhanLoai(page, dr, 'Màu', ['Do', 'Vang']);
		const loiCoBan = chuan((await dr.locator('.ant-form-item-has-error').filter({ hasText: /SKU|barcode/i }).allInnerTexts()).join(' | '));
		const soDong = await g.dongBienThe(dr).count();
		ghiDo(`SKU="${await g.oSku(dr).inputValue()}" disabled=${await g.oSku(dr).isDisabled()} · Barcode disabled=${await g.oBc(dr).isDisabled()} · lỗi ô cơ bản "${loiCoBan}" · dòng biến thể ${soDong}`);
		expect(await g.oSku(dr).isDisabled(), 'Thêm biến thể mà SKU cơ bản không chuyển sang mức biến thể').toBe(true);
		expect(await g.oSku(dr).inputValue()).toBe('');
		expect(loiCoBan, 'Ô đã xoá trắng vẫn báo lỗi validate sau khi có biến thể').toBe('');
		expect(soDong).toBe(2);
	});

	test('08_020_007 — Cột SKU và Barcode ở Bảng quy đổi đơn vị khi BỎ TRỐNG rồi thêm biến thể', async ({ page }) => {
		chanNeuTat('08_020_007');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const dr = await g.moFormThem(page);
			await g.dienCoBan(page, dr, { ten: g.TEN(`007_${h}`), sku: g.MA(`7${h}`), bc: g.MA(`7${h}B`) });
			const d = await g.themDvqd(page, dr, { ten: 'Hop', sl: 10 });
			const truoc = { sku: await d.getByPlaceholder('Nhập SKU').isEnabled(), ph: await d.getByRole('textbox').nth(1).getAttribute('placeholder') };
			await g.themPhanLoai(page, dr, 'Màu', ['Do', 'Vang']);
			const oSkuDvqd = g.dongDvqd(dr).first().getByRole('textbox').nth(1);
			const sauBt = { khoa: await oSkuDvqd.isDisabled(), ph: await oSkuDvqd.getAttribute('placeholder') };
			await g.dienBienThe(page, dr, g.MA(`7${h}`));
			const kq = await g.luu(page, dr);
			m.taoRa.push(kq.id);
			const ds = kq.id ? g.donViDb(kq.id) : [];
			ghiDo(`dòng quy đổi trước biến thể: SKU mở=${truoc.sku} · sau biến thể: SKU/Barcode quy đổi khoá=${sauBt.khoa} ("${sauBt.ph}") · lưu ${kq.body?.status?.code} "${kq.body?.status?.message ?? kq.tb}" · CHAIN_PRODUCT_UNIT ${JSON.stringify(ds)}`);
			expect(String(kq.body?.status?.code), `Lưu lỗi: ${kq.body?.status?.message ?? kq.tb} ${kq.loi}`).toBe('200');
			expect(g.kiemBatBien(ds), 'Bất biến đơn vị bị vi phạm').toEqual([]);
			// Mỗi biến thể phải có đủ 2 đơn vị (Cái gốc + Hop × 10).
			for (const v of [...new Set(ds.filter((x) => x.variant).map((x) => x.variant))]) {
				const dv = ds.filter((x) => x.variant === v);
				expect(dv.map((x) => `${x.unit}:${x.convert}`).sort(), `Biến thể ${v} không đủ 2 đơn vị`).toEqual(['Cái:1', 'Hop:10']);
			}
		} finally { await m.don(); }
	});

	test('08_020_008 — Cột SKU và Barcode ở Bảng quy đổi khi ĐÃ NHẬP rồi thêm biến thể', async ({ page }) => {
		chanNeuTat('08_020_008');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const dr = await g.moFormThem(page);
			await g.dienCoBan(page, dr, { ten: g.TEN(`008_${h}`), sku: g.MA(`8${h}`), bc: g.MA(`8${h}B`) });
			await g.themDvqd(page, dr, { ten: 'Hop', sl: 10, sku: g.MA(`8${h}H`), bc: g.MA(`8${h}HB`) });
			await g.themPhanLoai(page, dr, 'Màu', ['Do', 'Vang']);
			const o = g.dongDvqd(dr).first().getByRole('textbox');
			const sauBt = { sku: await o.nth(1).inputValue(), khoa: await o.nth(1).isDisabled() };
			// Dòng con của biến thể: SKU tự sinh cho từng tổ hợp?
			const bang = g.bangBienThe(dr);
			for (const c of await bang.locator('img[aria-label="caret-right"]').all()) await c.click().catch(() => null);
			const skuCon = await Promise.all((await bang.getByPlaceholder('Nhập SKU').all()).map((x) => x.inputValue()));
			ghiDo(`SKU dòng quy đổi sau khi thêm biến thể: "${sauBt.sku}" (khoá=${sauBt.khoa}) · SKU các dòng biến thể/tổ hợp: ${JSON.stringify(skuCon)}`);
			const trung = skuCon.filter((s, i) => s && skuCon.indexOf(s) !== i);
			expect(trung, 'Nhân bản dòng quy đổi cho biến thể mà SKU trùng nhau').toEqual([]);
			expect(sauBt.sku === g.MA(`8${h}H`) || skuCon.includes(g.MA(`8${h}H`)), 'SKU đã nhập ở dòng quy đổi bị mất khi thêm biến thể').toBe(true);
		} finally { await m.don(); }
	});

	test('08_020_009 — Cột SKU và Barcode ở Bảng quy đổi khi thêm rồi XOÁ biến thể', async ({ page }) => {
		chanNeuTat('08_020_009');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const dr = await g.moFormThem(page);
			await g.dienCoBan(page, dr, { ten: g.TEN(`009_${h}`), sku: g.MA(`9${h}`), bc: g.MA(`9${h}B`) });
			await g.themDvqd(page, dr, { ten: 'Hop', sl: 10, sku: g.MA(`9${h}H`), bc: g.MA(`9${h}HB`) });
			await g.themPhanLoai(page, dr, 'Màu', ['Do']);
			await g.xoaPhanLoai(page, dr);
			const o = g.dongDvqd(dr).first().getByRole('textbox');
			const sau = { soDong: await g.dongDvqd(dr).count(), sku: await o.nth(1).inputValue(), bc: await o.nth(2).inputValue(), skuCb: await g.oSku(dr).inputValue() };
			// Điền lại chỗ bị mất để lưu được, rồi kiểm DB.
			if (!sau.skuCb) await g.oSku(dr).fill(g.MA(`9${h}`));
			if (!(await g.oBc(dr).inputValue())) await g.oBc(dr).fill(g.MA(`9${h}B`));
			if (!sau.sku) await o.nth(1).fill(g.MA(`9${h}H`));
			const kq = await g.luu(page, dr);
			m.taoRa.push(kq.id);
			const ds = kq.id ? g.donViDb(kq.id) : [];
			ghiDo(`sau khi xoá biến thể: ${JSON.stringify(sau)} · lưu ${kq.body?.status?.code} "${kq.body?.status?.message ?? kq.tb}" · DB ${JSON.stringify(ds)}`);
			expect(String(kq.body?.status?.code), `Lưu lỗi: ${kq.body?.status?.message ?? kq.tb}`).toBe('200');
			const hop = ds.find((x) => x.unit === 'Hop' && x.variant);
			const goc = ds.find((x) => x.unit === 'Cái' && x.variant);
			expect(goc?.convert, 'Đơn vị gốc mất convert_to_main_unit=1 sau khi xoá biến thể').toBe('1');
			// 🔴 Dòng cấp biến thể: exchange_value = 1 (so với dòng cha cấp SP), tỉ lệ về gốc nằm ở convert_to_main_unit.
			expect(hop?.convert, 'Dòng quy đổi Hop mất tỉ lệ 10').toBe('10');
			expect(g.kiemBatBien(ds)).toEqual([]);
			expect(sau.soDong, 'Bảng quy đổi mất dòng sau khi xoá biến thể').toBe(1);
			expect(sau.sku, 'Xoá biến thể làm MẤT SKU đã nhập ở dòng quy đổi').toBe(g.MA(`9${h}H`));
		} finally { await m.don(); }
	});

	test('08_020_010 — Tính duy nhất của SKU khi thêm sản phẩm', async ({ page }) => {
		chanNeuTat('08_020_010');
		const m = await g.moMan(page);
		const h = g.hau();
		const skuCo = seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.tieuChuan.sku;
		try {
			const kqs = [];
			for (const sku of [skuCo, skuCo.toLowerCase()]) {
				const dr = await g.moFormThem(page);
				await g.dienCoBan(page, dr, { ten: g.TEN(`010_${h}`), sku, bc: g.MA(`10${h}${kqs.length}`) });
				const kq = await g.luu(page, dr);
				if (String(kq.body?.status?.code) === '200') m.taoRa.push(kq.id);
				kqs.push({ sku, code: kq.body?.status?.code ?? '(FE chặn)', msg: kq.body?.status?.message ?? kq.tb });
				await page.keyboard.press('Escape');
				await dr.getByRole('button', { name: 'Hủy' }).click().catch(() => null);
				await page.waitForTimeout(1_000);
			}
			ghiDo(JSON.stringify(kqs));
			expect(String(kqs[0].code), 'SKU trùng mà vẫn tạo được').not.toBe('200');
			expect(kqs[0].msg, 'Thông báo không nêu SKU đã tồn tại').toMatch(/SKU|tồn tại|đã có/i);
			expect(String(kqs[1].code), 'SKU trùng khác hoa/thường vẫn tạo được').not.toBe('200');
		} finally { await m.don(); }
	});

	test('08_020_011 — Validate các ô cần nhập số: Khối lượng, Thể tích, Kích thước', async ({ page }) => {
		chanNeuTat('08_020_011');
		await g.moMan(page);
		const dr = await g.moFormThem(page);
		// Code: cweight/volume/clength/cwidth/cheight đều InputNumber min={0}, không khai precision/max (AddProductDrawer.jsx ~3640–3790).
		const kq = {};
		for (const ph of ['Nhập khối lượng', 'Nhập thể tích', 'Dài', 'Rộng', 'Cao']) {
			const o = dr.getByRole('spinbutton', { name: ph });
			const doc = async (v) => { await o.fill(''); await o.pressSequentially(v); await o.blur(); await page.waitForTimeout(200); return o.inputValue(); };
			kq[ph] = { chu: await doc('ab'), am: await doc('-5'), khong: await doc('0'), thapPhan: await doc('1.25') };
		}
		ghiDo(JSON.stringify(kq));
		for (const [ph, v] of Object.entries(kq)) {
			expect(v.chu, `Ô ${ph} nhận chữ`).not.toMatch(/[a-z]/i);
			expect(v.am, `Ô ${ph} nhận số âm`).not.toMatch(/^-/);
			expect(v.khong, `Ô ${ph} không nhận 0 (min=0)`).toBe('0');
			expect(v.thapPhan, `Ô ${ph} không nhận thập phân (code không khai precision)`).toBe('1.25');
		}
	});

	test('08_020_012 — Thêm nhanh danh mục ngay trong form sản phẩm', async ({ page }) => {
		chanNeuTat('08_020_012');
		const m = await g.moMan(page);
		const h = g.hau();
		const ten = `${seed.PREFIX}DMT_NHANH_${h}`;
		let idDm;
		try {
			const dr = await g.moFormThem(page);
			await dr.getByRole('button', { name: /Thêm danh mục/ }).click();
			const d = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ has: page.locator('#catName') }).last();
			await expect(d.locator('#catName')).toBeVisible({ timeout: 20_000 });
			await d.locator('#catCode').fill(`${seed.PREFIX_MA}DMN${h}`).catch(() => null);
			await d.locator('#catName').fill(ten);
			const cho = page.waitForResponse((r) => /categor/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15_000 }).catch(() => null);
			await d.getByRole('button', { name: 'Xác nhận', exact: true }).click();
			const res = await cho;
			const body = res ? await res.json().catch(() => ({})) : null;
			idDm = body?.data?.id ?? body?.data?.categoryId ?? body?.data;
			await page.waitForTimeout(2_000);
			const oDm = chuan(await dr.locator('.ant-form-item').filter({ has: page.getByRole('combobox', { name: /Danh mục/ }) }).first().innerText());
			const db = g.sql(`select id from CHAIN_PRODUCT_CATEGORY where cat_name='${ten}' limit 1`);
			if (!idDm) idDm = db;
			ghiDo(`tạo ${body?.status?.code} "${body?.status?.message}" · ô Danh mục sau khi tạo "${oDm}" · DB id ${db}`);
			expect(String(body?.status?.code), 'Thêm nhanh danh mục lỗi').toBe('200');
			expect(db, 'Danh mục mới không có trong CHAIN_PRODUCT_CATEGORY').toBeTruthy();
			expect(oDm, 'Danh mục mới không tự chọn vào ô Danh mục của sản phẩm').toContain(ten);
		} finally {
			if (idDm) await m.goi('PUT', '/chain/product-categories/individual/delete', { type: 0, catId: idDm }).catch(() => null);
		}
	});

	const taoVaMoLai = async (page, m, khai) => {
		const dr = await g.moFormThem(page);
		await khai(dr);
		const kq = await g.luu(page, dr);
		m.taoRa.push(kq.id);
		expect(String(kq.body?.status?.code), `Lưu lỗi: ${kq.body?.status?.message ?? kq.tb} ${kq.loi}`).toBe('200');
		expect(kq.tb).toContain('Thêm thành công');
		return { kq, ct: await chiTiet(m, kq.id), ds: g.donViDb(kq.id) };
	};

	test('08_020_013 — Thêm sản phẩm có đơn vị quy đổi, KHÔNG có biến thể', async ({ page }) => {
		chanNeuTat('08_020_013');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const { ds, ct } = await taoVaMoLai(page, m, async (dr) => {
				await g.dienCoBan(page, dr, { ten: g.TEN(`013_${h}`), sku: g.MA(`13${h}`), bc: g.MA(`13${h}B`) });
				await g.themDvqd(page, dr, { ten: 'Hop', sl: 10, sku: g.MA(`13${h}H`) });
				await g.themDvqd(page, dr, { ten: 'Thung', sl: 50, sku: g.MA(`13${h}T`) });
			});
			ghiDo(`DB ${JSON.stringify(ds)} · info.productUnits ${JSON.stringify((ct?.productUnits || []).map((x) => [x.unit, x.exchangeValue, x.convertToMainUnit]))}`);
			const bt = ds.filter((x) => x.variant);
			expect(bt.map((x) => `${x.unit}:${x.convert}`).sort()).toEqual(['Cái:1', 'Hop:10', 'Thung:50']);
			expect(bt.find((x) => x.unit === 'Cái')?.convert, 'Đơn vị gốc thiếu convert_to_main_unit=1').toBe('1');
			expect(g.kiemBatBien(ds)).toEqual([]);
		} finally { await m.don(); }
	});

	test('08_020_014 — Thêm sản phẩm có biến thể, KHÔNG có đơn vị quy đổi', async ({ page }) => {
		chanNeuTat('08_020_014');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const { ds, ct } = await taoVaMoLai(page, m, async (dr) => {
				await g.dienCoBan(page, dr, { ten: g.TEN(`014_${h}`) });
				await g.themPhanLoai(page, dr, 'Màu', ['Do', 'Vang']);
				await g.dienBienThe(page, dr, g.MA(`14${h}`));
			});
			const bien = g.sql(`select id, coalesce(sku,''), product_id from CHAIN_PRODUCT_VARIANTS where product_id=${ct?.productId ?? 0} and coalesce(is_deleted,0)=0`);
			ghiDo(`DB unit ${JSON.stringify(ds)} · CHAIN_PRODUCT_VARIANTS ${bien.replace(/\n/g, ' ; ')} · info.variants ${(ct?.variants || []).map((v) => v.name).join(',')}`);
			const vs = [...new Set(ds.filter((x) => x.variant).map((x) => x.variant))];
			expect(vs.length, 'Không đủ 2 biến thể').toBe(2);
			expect(g.kiemBatBien(ds)).toEqual([]);
		} finally { await m.don(); }
	});

	test('08_020_015 — Thêm sản phẩm có biến thể ĐỒNG THỜI có đơn vị quy đổi', async ({ page }) => {
		chanNeuTat('08_020_015');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const { ds } = await taoVaMoLai(page, m, async (dr) => {
				await g.dienCoBan(page, dr, { ten: g.TEN(`015_${h}`) });
				await g.themDvqd(page, dr, { ten: 'Hop', sl: 10 });
				await g.themDvqd(page, dr, { ten: 'Thung', sl: 50 });
				await g.themPhanLoai(page, dr, 'Màu', ['Do', 'Vang']);
				await g.dienBienThe(page, dr, g.MA(`15${h}`));
			});
			ghiDo(`DB ${JSON.stringify(ds)}`);
			const vs = [...new Set(ds.filter((x) => x.variant).map((x) => x.variant))];
			expect(vs.length).toBe(2);
			for (const v of vs) expect(ds.filter((x) => x.variant === v).map((x) => `${x.unit}:${x.convert}`).sort(), `Tổ hợp biến thể ${v} thiếu đơn vị`).toEqual(['Cái:1', 'Hop:10', 'Thung:50']);
			expect(g.kiemBatBien(ds)).toEqual([]);
		} finally { await m.don(); }
	});

	test('08_020_016 — Thêm sản phẩm khi chọn danh mục CHA trong cây danh mục', async ({ page }) => {
		chanNeuTat('08_020_016');
		// Danh mục cha seed là danh mục GỐC — form khai `preventRootSelection` (CategoryTreeSelect selectable: level > 1).
		const m = await g.moMan(page);
		const h = g.hau();
		const spS = seed.doc().duLieu.sanPham;
		const cha = `${spS.maDanhMucCha} - ${spS.tenDanhMucCha}`;
		const dr = await g.moFormThem(page);
		let loiChon = '';
		try {
			await g.dienCoBan(page, dr, { ten: g.TEN(`016_${h}`), sku: g.MA(`16${h}`), bc: g.MA(`16${h}B`), danhMuc: cha }).catch((e) => { loiChon = e.message.split('\n')[0]; });
			ghiDo(`chọn danh mục cha "${cha}": ${loiChon || 'chọn được'}`);
			// Memory product_form_root_category_not_selectable: danh mục cấp 1 bị khoá trong form.
			expect(loiChon, 'Không chọn được danh mục CHA ở form sản phẩm (node bị khoá)').toBe('');
			const kq = await g.luu(page, dr);
			m.taoRa.push(kq.id);
			expect(String(kq.body?.status?.code)).toBe('200');
			const idCon = seed.doc().duLieu.sanPham.idDanhMuc;
			const loc = await m.goi('GET', '/chain/products/get-all', { categoryIds: idCon, categoryId: idCon, page: 0, size: 50, type: 0, keyword: g.MA(`16${h}`) });
			ghiDo(`lọc theo danh mục con ra: ${JSON.stringify(loc?.data)?.includes(g.MA(`16${h}`))}`);
		} finally { await m.don(); }
	});

	test('08_020_017 — Thêm thuộc tính bổ sung cho sản phẩm', async ({ page }) => {
		chanNeuTat('08_020_017');
		const m = await g.moMan(page);
		const h = g.hau();
		const thuocTinh = async (dr, ten, gt) => {
			await dr.getByRole('button', { name: /Thêm thuộc tính/ }).click();
			const hang = dr.locator('.list-data > div').last();
			await hang.getByPlaceholder('Tên', { exact: true }).fill(ten);
			await hang.getByPlaceholder('Nhập giá trị').fill(gt);
		};
		try {
			const { ct } = await taoVaMoLai(page, m, async (dr) => {
				await g.dienCoBan(page, dr, { ten: g.TEN(`017_${h}`), sku: g.MA(`17${h}`), bc: g.MA(`17${h}B`) });
				await thuocTinh(dr, 'Xuat xu', 'Viet Nam');
				await thuocTinh(dr, 'Chat lieu', 'Nhua');
			});
			const tt = (ct?.attributes || []).map((a) => `${a.name}=${[].concat(a.value).join(',')}`);
			ghiDo(`thuộc tính sau lưu: ${JSON.stringify(tt)}`);
			expect(tt.sort()).toEqual(['Chat lieu=Nhua', 'Xuat xu=Viet Nam']);
			// Trùng tên thuộc tính.
			const dr = await g.moFormThem(page);
			await g.dienCoBan(page, dr, { ten: g.TEN(`017b_${h}`), sku: g.MA(`17${h}X`), bc: g.MA(`17${h}XB`) });
			await thuocTinh(dr, 'Mau', 'Do');
			await thuocTinh(dr, 'Mau', 'Xanh');
			const kq = await g.luu(page, dr);
			if (String(kq.body?.status?.code) === '200') m.taoRa.push(kq.id);
			const ct2 = kq.id ? await chiTiet(m, kq.id) : null;
			ghiDo(`trùng tên thuộc tính: ${kq.body?.status?.code ?? 'FE chặn'} "${kq.body?.status?.message ?? kq.tb}" · lưu thành ${JSON.stringify(ct2?.attributes)}`);
		} finally { await m.don(); }
	});

	test('08_020_018 — Tải lên hình ảnh minh hoạ sản phẩm', async ({ page }) => {
		chanNeuTat('08_020_018');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const dr = await g.moFormThem(page);
			await g.dienCoBan(page, dr, { ten: g.TEN(`018_${h}`), sku: g.MA(`18${h}`), bc: g.MA(`18${h}B`) });
			const up = page.waitForResponse((r) => /image|upload|file/i.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 }).catch(() => null);
			await oFileAnh(dr).setInputFiles([await anh(page, 'a1.png')]);
			const rUp = await up;
			await page.waitForTimeout(2_000);
			const kq = await g.luu(page, dr);
			m.taoRa.push(kq.id);
			expect(String(kq.body?.status?.code), `Lưu lỗi: ${kq.body?.status?.message ?? kq.tb}`).toBe('200');
			const ct = await chiTiet(m, kq.id);
			const soAnh = g.sql(`select count(*) from CHAIN_PRODUCT_IMAGE where product_id=${kq.id}`);
			ghiDo(`upload ${rUp?.url()} ${rUp?.status()} · info.images ${JSON.stringify(ct?.images ?? ct?.imageUrl)} · CHAIN_PRODUCT_IMAGE ${soAnh}`);
			expect(Number(soAnh), 'Ảnh không lưu vào sản phẩm').toBe(1);
			// Tới đúng giới hạn 20 ảnh (MAX_PRODUCT_IMAGES) — 2 lô × 10 (MAX_IMAGES_PER_UPLOAD) trên form mới, chỉ đo FE nhận.
			const dr2 = await g.moFormThem(page);
			for (let lo = 0; lo < 2; lo += 1) {
				await oFileAnh(dr2).setInputFiles(await Promise.all(Array.from({ length: 10 }, (_, i) => anh(page, `b${lo}_${i}.png`, 40 + i))));
				await page.waitForTimeout(6_000);
			}
			const the = await dr2.locator('.ant-image, img[src*="blob"], img[src^="data:"], img[src*="http"]').count();
			const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
			ghiDo(`20 ảnh: số thẻ ảnh ${the} · thông báo "${tb}"`);
			expect(tb, 'Đủ 20 ảnh mà vẫn báo vượt giới hạn').not.toMatch(/tối đa 20/);
		} finally { await m.don(); }
	});

	test('08_020_019 — Tải lên ảnh sai định dạng hoặc quá dung lượng', async ({ page }) => {
		chanNeuTat('08_020_019');
		await g.moMan(page);
		const dr = await g.moFormThem(page);
		const tbSau = async () => { await page.waitForTimeout(3_000); return chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | ')); };
		await oFileAnh(dr).setInputFiles([{ name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%auto test\n') }]);
		const tbPdf = await tbSau();
		// Quá dung lượng: 5 MB tính SAU resize (resizeImageFile) — ảnh ngẫu nhiên lớn vẫn bị nén; đo xem FE có chặn được không.
		const to = Buffer.alloc(8 * 1024 * 1024, 7);
		await oFileAnh(dr).setInputFiles([{ name: 'to.jpg', mimeType: 'image/jpeg', buffer: to }]);
		const tbTo = await tbSau();
		// Quá số lượng: 11 ảnh một lô (MAX_IMAGES_PER_UPLOAD = 10).
		await oFileAnh(dr).setInputFiles(await Promise.all(Array.from({ length: 11 }, (_, i) => anh(page, `c${i}.png`, 30 + i))));
		const tbSl = await tbSau();
		ghiDo(`pdf "${tbPdf}" · 8MB "${tbTo}" · 11 ảnh "${tbSl}"`);
		expect(tbPdf, 'Tệp PDF không bị chặn với thông báo định dạng').toContain('Ảnh chỉ hỗ trợ định dạng JPG, PNG hoặc WEBP!');
		expect(tbTo, 'Ảnh quá dung lượng không có thông báo').toMatch(/5 MB|dung lượng|không hợp lệ|không đọc được/i);
		expect(tbSl, 'Chọn 11 ảnh một lần không có thông báo giới hạn').toContain('Mỗi lần chỉ tải lên tối đa 10 ảnh');
	});

	test('08_020_020 — Thêm sản phẩm thủ công với ĐẦY ĐỦ mọi thông tin', async ({ page }) => {
		chanNeuTat('08_020_020');
		const m = await g.moMan(page);
		const h = g.hau();
		try {
			const { ct, ds } = await taoVaMoLai(page, m, async (dr) => {
				await g.dienCoBan(page, dr, { ten: g.TEN(`020_${h}`) });
				await dr.getByPlaceholder('Nhập mã nội bộ').fill(`NB${h}`);
				await dr.getByRole('radio', { name: 'Hàng hóa' }).check();
				await dr.getByRole('spinbutton', { name: 'Nhập khối lượng' }).fill('250');
				await dr.getByRole('spinbutton', { name: 'Nhập thể tích' }).fill('330');
				await dr.getByRole('spinbutton', { name: 'Dài' }).fill('10');
				await dr.getByRole('spinbutton', { name: 'Rộng' }).fill('6');
				await dr.getByRole('spinbutton', { name: 'Cao' }).fill('12');
				await dr.getByRole('button', { name: /Thêm thuộc tính/ }).click();
				await dr.locator('.list-data > div').last().getByPlaceholder('Tên', { exact: true }).fill('Xuat xu');
				await dr.locator('.list-data > div').last().getByPlaceholder('Nhập giá trị').fill('Viet Nam');
				await oFileAnh(dr).setInputFiles([await anh(page, 'full.png')]);
				await page.waitForTimeout(3_000);
				await g.themDvqd(page, dr, { ten: 'Hop', sl: 6 });
				await g.themPhanLoai(page, dr, 'Màu', ['Do', 'Vang']);
				await g.dienBienThe(page, dr, g.MA(`20${h}`));
			});
			const so = {
				internalCode: ct?.internalCode, goodsMaterialType: ct?.goodsMaterialType, cweight: ct?.cweight, volume: ct?.volume,
				clength: ct?.clength, cwidth: ct?.cwidth, cheight: ct?.cheight, attributes: (ct?.attributes || []).map((a) => a.name),
				anh: g.sql(`select count(*) from CHAIN_PRODUCT_IMAGE where product_id=${ct?.productId}`), variants: (ct?.variants || []).length,
			};
			ghiDo(`chi tiết: ${JSON.stringify(so)} · DB unit ${JSON.stringify(ds)}`);
			expect(so.internalCode).toBe(`NB${h}`);
			expect(so.goodsMaterialType).toBe('HANG_HOA');
			expect(Number(so.cweight)).toBe(250);
			expect(Number(so.volume)).toBe(330);
			expect([so.clength, so.cwidth, so.cheight].map(Number)).toEqual([10, 6, 12]);
			expect(so.attributes).toContain('Xuat xu');
			expect(Number(so.anh), 'Ảnh không lưu').toBe(1);
			expect(so.variants).toBe(2);
			expect(g.kiemBatBien(ds)).toEqual([]);
		} finally { await m.don(); }
	});
});
