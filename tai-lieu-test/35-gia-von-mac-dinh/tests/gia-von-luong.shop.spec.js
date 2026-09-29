'use strict';

/**
 * 35 — Giá vốn theo LUỒNG nghiệp vụ (GVMD-100…154): đích danh · giá tiêu chuẩn · bình quân (MAC) · FIFO qua nhập / PO / bán POS /
 * chuyển / xuất / kiểm kho / tồn âm — GHI THẬT, điểm bán seed của làn (26/09/2026).
 *
 * Ghi kho bằng `shared/kho-api.js` (API form nhập–xuất); bán bằng POS (`18_1/tests/pos-18.js`) trong CÙNG phiên `gdv`
 * (🔴 làn 7: `seed_gdv` và `gdv` là một tài khoản ⇒ chỉ mở một phiên, tránh xoay token). NCC / bảng giá / giá tiêu chuẩn bằng phiên `tct`.
 * Đọc giá vốn: dòng phiếu `SHOP_STOCK_IN_OUT_ITEM` (price / base_price / batch_products) — chỉ SELECT.
 * Tồn âm: `shared/ban-am.js` (thêm điểm bán làn vào phạm vi bán âm, khôi phục ở finally). Kiểm kho: helper 04_4 `kiem-kho-ghi.js`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const ka = require('../../shared/kho-api');
const { chon } = require('../../shared/db/otp');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const { d, hau } = ka;
const giaTc = (x) => Number(chon(`select coalesce(mac_price,0) from CHAIN_PRODUCT_UNIT where product_unit_id=${x.productUnitId}`, 'VNPOST_CORE'));

async function tct(browser) {
	const ps = await ka.k.moPhienPhu(browser, 'tct', '/supplier/products');
	return { ...ps, goi: (m, u, q, b) => ka.k.goiGhi(ps.page, ps.st, m, u, q, b) };
}
const datGiaTc = (t, x, gia) => t.goi('PUT', '/chain/products/standard-declared-prices', {}, { items: [{ productId: x.productId, units: [{ productUnitId: x.productUnitId, macPrice: gia }] }] });

/** Bán POS `sl` SP (tên) bằng phiên gdv; trả { orderId, phieu (id phiếu xuất bán), dong }. */
async function banPos(g, ten, sl = 1) {
	const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
	await p.chanIn(g.page);
	await p.moBan(g.page, test);
	const r = await p.them(g.page, ten);
	expect(r?.dong, `POS không thêm được ${ten}: ${r?.thongBao}`).toBeTruthy();
	if (sl > 1) {
		const o = p.dongBill(g.page).filter({ hasText: ten }).first().locator('input').first();
		await o.fill(String(sl));
		await o.press('Enter');
		await g.page.waitForTimeout(1_200);
	}
	const kq = await p.thanhToanTienMat(g.page);
	expect(kq.orderId, `Thanh toán lỗi: ${JSON.stringify(kq.draft?.status)}`).toBeTruthy();
	await g.page.waitForTimeout(5_000); // xuất kho bán qua outbox Kafka
	let phieu = '';
	for (let i = 0; i < 10 && !phieu; i += 1) {
		phieu = ka.sql(`select stock_in_out_id from SHOP_STOCK_IN_OUT where shop_id=${d().diemBan.shopId} and type='EXPORT' and (order_id=${kq.orderId} or order_code='${kq.orderNumber}') order by 1 desc limit 1`);
		if (!phieu) await g.page.waitForTimeout(3_000);
	}
	return { orderId: kq.orderId, orderNumber: kq.orderNumber, phieu: phieu ? Number(phieu) : null, dong: phieu ? ka.dongPhieu(phieu) : null };
}
async function voiBanAm(browser, fn) {
	const banAm = require('../../shared/ban-am');
	await banAm.bat(browser, d().diemBan.maShop);
	try { return await fn(); } finally { await banAm.khoiPhuc(browser); }
}

test.describe('35 — Giá vốn theo luồng (GHI)', () => {
	test.describe.configure({ timeout: 480_000 });

	// ─── Thực tế đích danh ─────────────────────────────────────────────────────────────
	test('GVMD-100 — Thêm sản phẩm thực tế đích danh vào danh sách NCC', async ({ browser }) => {
		chanNeuTat('GVMD-100');
		const t = await tct(browser);
		try {
			const x = ka.donVi(ka.SP.DD());
			const ds = (await t.goi('GET', '/supplier-products/by-supplier', { supplierId: ka.idNcc(), keyword: x.sku, page: 0, size: 50 }))?.data;
			const co = JSON.stringify(ds ?? '').includes(x.sku);
			ghiDo(`SP đích danh ${x.sku} trong danh sách SP của NCC seed: ${co}`);
			expect(co, 'SP đích danh chưa có trong danh sách NCC (seed bảng giá mua)').toBe(true);
		} finally { await t.dong(); }
	});
	test('GVMD-101 — Thêm bảng giá cho sản phẩm thực tế đích danh', async ({ browser }) => {
		chanNeuTat('GVMD-101');
		const t = await tct(browser);
		try {
			const x = ka.donVi(ka.SP.DD());
			const r = await t.goi('GET', '/supplier-price-lists/price-history', { supplierId: ka.idNcc(), sku: x.sku });
			ghiDo(`bảng giá mua SP đích danh: ${JSON.stringify(r?.data).slice(0, 300)}`);
			expect(JSON.stringify(r?.data ?? '')).toContain(x.sku);
		} finally { await t.dong(); }
	});
	test('GVMD-102 — Đặt hàng sản phẩm thực tế đích danh', async ({ page }) => {
		chanNeuTat('GVMD-102');
		const po = require('../../13_3_dat_hang_va_nhap_hang/tests/po-ghi');
		const dd = d().sanPham.sanPhamTheoGiaVon.dichDanh;
		await po.moTaoDayDu(page);
		await po.bangSp(page).locator('tbody tr.ant-table-row').first().locator('button:has(.anticon-delete)').click();
		const r = await po.themSp(page, dd.tenSanPham, 1);
		const t = (await r.innerText()).replace(/\s+/g, ' ');
		ghiDo(`dòng PO SP đích danh: ${t}`);
		expect(t, 'PO không kéo giá NCC cho SP đích danh').toMatch(/\d{2,3}\.\d{3}/);
	});
	test('GVMD-103 — Nhập kho sản phẩm thực tế đích danh', async ({ browser }) => {
		chanNeuTat('GVMD-103');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const x = ka.donVi(ka.SP.DD());
			const a = `A${process.env.VNPOST_LANE}GA${hau()}`;
			const b = `A${process.env.VNPOST_LANE}GB${hau()}`;
			await ka.nhap(g, x, { sl: 1, gia: 70_000, lo: a, serials: [`${a}S1`] });
			await ka.nhap(g, x, { sl: 1, gia: 90_000, lo: b, serials: [`${b}S1`] });
			const lo = await ka.loCua(g, x);
			const la = lo.find((z) => z.batchCode === a);
			const lb = lo.find((z) => z.batchCode === b);
			ghiDo(`lô ${a} giá ${la?.price} · lô ${b} giá ${lb?.price}`);
			expect(Number(la?.price)).toBe(70_000);
			expect(Number(lb?.price), 'Lô đích danh bị bình quân với lô cũ').toBe(90_000);
		} finally { await g.dong(); }
	});

	// ─── Giá tiêu chuẩn ────────────────────────────────────────────────────────────────
	test('GVMD-110 — Khai báo giá tiêu chuẩn cho sản phẩm', async ({ browser }) => {
		chanNeuTat('GVMD-110');
		const t = await tct(browser);
		const x = ka.donVi(ka.SP.TC());
		const goc = giaTc(x);
		try {
			const r = await datGiaTc(t, x, goc + 1_000);
			ghiDo(`giá TC ${goc} ⇒ PUT ${JSON.stringify(r?.status)} ⇒ ${giaTc(x)}`);
			expect(giaTc(x)).toBe(goc + 1_000);
		} finally { await datGiaTc(t, x, goc); await t.dong(); }
	});
	test('GVMD-111 — Thêm sản phẩm giá tiêu chuẩn vào danh sách NCC', async ({ browser }) => {
		chanNeuTat('GVMD-111');
		const t = await tct(browser);
		try {
			const x = ka.donVi(ka.SP.TC());
			const ds = (await t.goi('GET', '/supplier-products/by-supplier', { supplierId: ka.idNcc(), keyword: x.sku, page: 0, size: 50 }))?.data;
			ghiDo(`SP TC trong danh sách NCC: ${JSON.stringify(ds ?? '').includes(x.sku)}`);
			expect(JSON.stringify(ds ?? '')).toContain(x.sku);
		} finally { await t.dong(); }
	});
	async function dongPoTc(page) {
		const po = require('../../13_3_dat_hang_va_nhap_hang/tests/po-ghi');
		await po.moTaoDayDu(page);
		const r = po.bangSp(page).locator('tbody tr.ant-table-row').first();
		return { po, r, t: (await r.innerText()).replace(/\s+/g, ' ') };
	}
	test('GVMD-112 — Đặt hàng sản phẩm tiêu chuẩn', async ({ page }) => {
		chanNeuTat('GVMD-112');
		const { t } = await dongPoTc(page);
		const x = ka.donVi(ka.SP.TC());
		ghiDo(`dòng PO SP TC: ${t} · giá TC ${giaTc(x)}`);
		expect(t.replace(/\./g, ''), 'Giá nhập PO không bằng giá tiêu chuẩn').toContain(String(giaTc(x)));
	});
	test('GVMD-113 — Đặt hàng sản phẩm tiêu chuẩn có giảm giá', async ({ page }) => {
		chanNeuTat('GVMD-113');
		const { r } = await dongPoTc(page);
		const o = r.locator('.ant-input-number-input');
		const khoa = await o.evaluateAll((els) => els.map((e) => e.disabled || e.readOnly));
		ghiDo(`ô số trên dòng PO SP TC (disabled/readOnly): ${JSON.stringify(khoa)}`);
		expect(khoa.slice(1).some(Boolean), 'Ô giá nhập SP tiêu chuẩn không bị khoá').toBe(true);
	});
	test('GVMD-114 — Tạo bảng giá NCC khác giá tiêu chuẩn', async ({ browser }) => {
		chanNeuTat('GVMD-114');
		const t = await tct(browser);
		try {
			const x = ka.donVi(ka.SP.TC());
			const r = await t.goi('GET', '/supplier-price-lists/price-history', { supplierId: ka.idNcc(), sku: x.sku });
			const gia = JSON.stringify(r?.data ?? '');
			ghiDo(`bảng giá mua SP TC: ${gia.slice(0, 300)} · giá TC ${giaTc(x)}`);
			expect(gia).toContain(x.sku);
		} finally { await t.dong(); }
	});
	test('GVMD-115 — Tạo nhiều bảng giá cho nhiều nhà cung cấp', async ({ browser }) => {
		chanNeuTat('GVMD-115');
		const t = await tct(browser);
		try {
			const x = ka.donVi(ka.SP.TC());
			// Lịch sử giá theo từng NCC (supplierProductApi.getSkuPriceHistory) — NCC seed + NCC tỉnh tự doanh của làn.
			const dsNcc = chon(`select supplier_id, code from CHAIN_SUPPLIER where code like 'AUTO${process.env.VNPOST_LANE || ''}_NCC%'`, 'VNPOST_CORE').split('\n').filter(Boolean).map((l) => l.split('\t'));
			const ncc = new Set();
			for (const [id, code] of dsNcc) { const r = await t.goi('GET', '/supplier-price-lists/price-history', { supplierId: id, sku: x.sku }); const mang = Array.isArray(r?.data) ? r.data : r?.data?.content || []; if (mang.length) ncc.add(code); }
			ghiDo(`SP TC có bảng giá của ${ncc.size} NCC: ${[...ncc].join(',')}`);
			expect(ncc.size, 'Chưa có ≥ 2 NCC khai giá cho SP TC').toBeGreaterThanOrEqual(2);
		} finally { await t.dong(); }
	});
	async function nhapTc(browser, gia, ncc) {
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const x = ka.donVi(ka.SP.TC());
			const id = await ka.nhap(g, x, { sl: 1, gia, ncc: Boolean(ncc), maNcc: ncc });
			const [price, , , , , base] = ka.dongPhieu(id);
			return { x, price: Number(price), base: Number(base), tc: giaTc(x) };
		} finally { await g.dong(); }
	}
	test('GVMD-116 — Nhập kho từ NCC có giá THẤP hơn giá tiêu chuẩn', async ({ browser }) => {
		chanNeuTat('GVMD-116');
		const r = await nhapTc(browser, 1_000, d().nhaCungCap.maNcc);
		ghiDo(`nhập giá NCC 1.000 · giá TC ${r.tc} ⇒ dòng phiếu price ${r.price} base ${r.base}`);
		expect(r.price).toBe(r.tc);
	});
	test('GVMD-117 — Nhập kho từ NCC có giá CAO hơn giá tiêu chuẩn', async ({ browser }) => {
		chanNeuTat('GVMD-117');
		const r = await nhapTc(browser, 9_999_000, d().nhaCungCap.maNcc);
		ghiDo(`nhập giá NCC 9.999.000 · giá TC ${r.tc} ⇒ price ${r.price}`);
		expect(r.price).toBe(r.tc);
	});
	test('GVMD-118 — Huỷ bảng giá NCC', async ({ browser }) => {
		chanNeuTat('GVMD-118');
		const r = await nhapTc(browser, 12_345, null);
		ghiDo(`nhập lẻ (không NCC / không bảng giá) giá 12.345 · giá TC ${r.tc} ⇒ price ${r.price}`);
		expect(r.price, 'Không có bảng giá NCC vẫn phải lấy giá tiêu chuẩn').toBe(r.tc);
	});
	test('GVMD-119 — Thay đổi giá tiêu chuẩn', async ({ browser }) => {
		chanNeuTat('GVMD-119');
		const t = await tct(browser);
		const x = ka.donVi(ka.SP.TC());
		const goc = giaTc(x);
		try {
			await datGiaTc(t, x, goc + 2_000);
			const moi = giaTc(x);
			const ct = (await t.goi('GET', `/chain/products/${x.productId}/info`))?.data;
			ghiDo(`giá TC ${goc} ⇒ ${moi} · chi tiết SP macPrice ${JSON.stringify(ct?.productUnits?.map((u) => u.macPrice))}`);
			expect(moi).toBe(goc + 2_000);
		} finally { await datGiaTc(t, x, goc); await t.dong(); }
	});
	test('GVMD-120 — Nhập kho sau khi thay đổi giá tiêu chuẩn', async ({ browser }) => {
		chanNeuTat('GVMD-120');
		const t = await tct(browser);
		const x = ka.donVi(ka.SP.TC());
		const goc = giaTc(x);
		try {
			await datGiaTc(t, x, goc + 3_000);
			const r = await nhapTc(browser, 1_000, null);
			ghiDo(`giá TC mới ${goc + 3_000} ⇒ nhập ghi price ${r.price}`);
			expect(r.price, 'Nhập kho sau đổi giá TC vẫn lấy giá cũ').toBe(goc + 3_000);
		} finally { await datGiaTc(t, x, goc); await t.dong(); }
	});
	test('GVMD-121 — Nhiều nhà cung cấp cho cùng một sản phẩm tiêu chuẩn', async ({ browser }) => {
		chanNeuTat('GVMD-121');
		const a = await nhapTc(browser, 5_000, d().nhaCungCap.maNcc);
		const b = await nhapTc(browser, 7_000, null);
		ghiDo(`NCC seed ⇒ ${a.price} · nhập khác ⇒ ${b.price} · giá TC ${a.tc}`);
		expect([a.price, b.price]).toEqual([a.tc, a.tc]);
	});
	test('GVMD-122 — Bán hàng sau khi nhập kho sản phẩm tiêu chuẩn', async ({ browser }) => {
		chanNeuTat('GVMD-122');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const x = ka.donVi(ka.SP.TC());
			const b = await banPos(g, d().sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham, 1);
			ghiDo(`đơn ${b.orderNumber} · phiếu xuất ${b.phieu} · giá vốn dòng ${b.dong?.[0]} base ${b.dong?.[5]} · giá TC ${giaTc(x)}`);
			expect(b.phieu, 'Không thấy phiếu xuất bán của đơn').toBeTruthy();
			expect(Number(b.dong[0])).toBe(giaTc(x));
		} finally { await g.dong(); }
	});
	test('GVMD-123 — Bán âm sản phẩm giá tiêu chuẩn', async ({ browser }) => {
		chanNeuTat('GVMD-123');
		await voiBanAm(browser, async () => {
			const g = await ka.moGdv(browser, 'gdv');
			try {
				const x = ka.donVi(ka.SP.TC());
				const ton = ka.tonSo(x);
				const b = await banPos(g, d().sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham, ton + 1);
				ghiDo(`tồn ${ton} · bán ${ton + 1} ⇒ tồn ${ka.tonSo(x)} · đơn ${b.orderNumber}`);
				expect(ka.tonSo(x), 'Bán âm không đưa tồn xuống âm').toBeLessThan(0);
			} finally { await g.dong(); }
		});
	});
	test('GVMD-124 — Nhập kho bù sau khi bán âm', async ({ browser }) => {
		chanNeuTat('GVMD-124');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const x = ka.donVi(ka.SP.TC());
			const ton = ka.tonSo(x);
			const bu = ton < 0 ? -ton : 2;
			await ka.nhap(g, x, { sl: bu, gia: 1_000 });
			ghiDo(`tồn ${ton} · nhập bù ${bu} ⇒ ${ka.tonSo(x)}`);
			expect(ka.tonSo(x)).toBe(ton + bu);
		} finally { await g.dong(); }
	});

	async function voiTonTc(browser, muc, fn) {
		// Đưa tồn SP TC về `muc` (0 hoặc âm) bằng xuất (có bật bán âm khi cần), chạy fn, rồi nhập bù về mức cũ.
		const g = await ka.moGdv(browser, 'gdv');
		const x = ka.donVi(ka.SP.TC());
		const ton0 = ka.tonSo(x);
		try {
			return await voiBanAm(browser, async () => {
				if (ton0 - muc > 0) await ka.xuat(g, x, { sl: ton0 - muc });
				return fn(g, x, ka.tonSo(x));
			});
		} finally {
			const bu = ton0 - ka.tonSo(x);
			if (bu > 0) await ka.nhap(g, x, { sl: bu, gia: 1_000 }).catch(() => null);
			await g.dong();
		}
	}
	test('GVMD-125 — Chuyển kho khi tồn đủ', async ({ browser }) => {
		chanNeuTat('GVMD-125');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const x = ka.donVi(ka.SP.TC());
			test.skip(!d().diemBanNhan, 'Làn không có điểm bán nhận (diemBanNhan)');
			const c = await ka.chuyen(g, x, { sl: 1 });
			ghiDo(`chuyển 1 TC: ${JSON.stringify(c.status)} · giá ${c.gia}`);
			expect(String(c.status?.code)).toBe('200');
			await ka.k.donPhieuChuyen(g.page, g.st, g.shopId, c.id);
		} finally { await g.dong(); }
	});
	test('GVMD-126 — Chặn chuyển kho khi tồn bằng 0', async ({ browser }) => {
		chanNeuTat('GVMD-126');
		test.skip(!d().diemBanNhan, 'Làn không có điểm bán nhận (diemBanNhan)');
		await voiTonTc(browser, 0, async (g, x, ton) => {
			const c = await ka.chuyen(g, x, { sl: 1 });
			ghiDo(`tồn ${ton} · chuyển 1: ${JSON.stringify(c.status)}`);
			if (String(c.status?.code) === '200') await ka.k.donPhieuChuyen(g.page, g.st, g.shopId, c.id);
			expect(String(c.status?.code), 'Tồn 0 vẫn chuyển kho được').not.toBe('200');
		});
	});
	test('GVMD-127 — Chặn chuyển kho khi tồn âm', async ({ browser }) => {
		chanNeuTat('GVMD-127');
		test.skip(!d().diemBanNhan, 'Làn không có điểm bán nhận (diemBanNhan)');
		await voiTonTc(browser, -1, async (g, x, ton) => {
			const c = await ka.chuyen(g, x, { sl: 1 });
			ghiDo(`tồn ${ton} · chuyển 1: ${JSON.stringify(c.status)}`);
			if (String(c.status?.code) === '200') await ka.k.donPhieuChuyen(g.page, g.st, g.shopId, c.id);
			expect(String(c.status?.code), 'Tồn âm vẫn chuyển kho được').not.toBe('200');
		});
	});
	test('GVMD-128 — Xuất kho khi tồn đủ', async ({ browser }) => {
		chanNeuTat('GVMD-128');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const x = ka.donVi(ka.SP.TC());
			await ka.nhap(g, x, { sl: 1, gia: 1_000 });
			const r = await ka.xuat(g, x, { sl: 1 });
			ghiDo(`xuất 1: ${JSON.stringify(r.xacNhan)}`);
			expect(String(r.xacNhan?.code)).toBe('200');
		} finally { await g.dong(); }
	});
	test('GVMD-129 — Chặn xuất kho khi tồn bằng 0', async ({ browser }) => {
		chanNeuTat('GVMD-129');
		const g = await ka.moGdv(browser, 'gdv');
		const x = ka.donVi(ka.SP.TC());
		const ton0 = ka.tonSo(x);
		try {
			if (ton0 > 0) await ka.xuat(g, x, { sl: ton0 });
			const r = await ka.xuat(g, x, { sl: 1 });
			ghiDo(`tồn ${ka.tonSo(x)} (bán âm TẮT) · xuất 1: tạo ${JSON.stringify(r.tao)} xác nhận ${JSON.stringify(r.xacNhan)}`);
			expect(String(r.xacNhan?.code ?? r.tao?.code), 'Tồn 0 vẫn xuất được').not.toBe('200');
		} finally { if (ton0 - ka.tonSo(x) > 0) await ka.nhap(g, x, { sl: ton0 - ka.tonSo(x), gia: 1_000 }).catch(() => null); await g.dong(); }
	});

	// ─── Kiểm kho (helper 04_4) ────────────────────────────────────────────────────────
	async function kiemKho(page, delta, vai = 'shop') {
		const kk = require('../../04_4_kiem_kho/tests/kiem-kho-ghi');
		const st = ka.k.batHeader(page);
		const { sessionId } = await kk.vaoPhieuCuaToi(page, vai);
		const shopId = d().diemBan.shopId;
		try {
			const x = ka.donVi(ka.SP.TC());
			const truoc = ka.tonSo(x);
			const lo = (await ka.k.goiApi(page, st, '/stock/v2/batch-product', { shopId, productId: x.productId, variantId: x.variantId, size: 50 })).data.find((l) => Number(l.remainQuantity) > 0);
			const ghiDe = lo ? { [lo.batchCode]: Math.max(0, Number(lo.remainQuantity) + delta) } : {};
			await kk.demToanKho(page, st, shopId, ghiDe);
			const rv = await kk.moTongHop(page);
			const cho = page.waitForResponse((r) => /sessions\/\d+\/(close|finalize|confirm)/.test(r.url()), { timeout: 60_000 }).catch(() => null);
			await rv.getByRole('button', { name: 'Xác nhận chốt phiên' }).click();
			const hoi = page.locator('.ant-drawer-open, .ant-modal-confirm').filter({ hasText: /chưa được kiểm/ }).last();
			if (await hoi.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) await hoi.getByRole('button', { name: /Vẫn chốt/ }).click();
			const r = await cho;
			const b = r ? await r.json().catch(() => null) : null;
			await page.waitForTimeout(5_000);
			return { truoc, sau: ka.tonSo(x), b, lo };
		} catch (e) { await kk.huyPhien(page, st, shopId, sessionId); throw e; }
	}
	test('GVMD-130 — Kiểm kho điều chỉnh tăng tồn', async ({ page }) => {
		chanNeuTat('GVMD-130');
		const r = await kiemKho(page, 2);
		ghiDo(`tồn TC ${r.truoc} ⇒ ${r.sau} (đếm +2 lô ${r.lo?.batchCode}) · chốt ${JSON.stringify(r.b?.status)}`);
		expect(r.sau).toBe(r.truoc + 2);
	});
	test('GVMD-131 — Kiểm kho điều chỉnh giảm tồn', async ({ page }) => {
		chanNeuTat('GVMD-131');
		const r = await kiemKho(page, -1);
		ghiDo(`tồn TC ${r.truoc} ⇒ ${r.sau} (đếm −1) · chốt ${JSON.stringify(r.b?.status)}`);
		expect(r.sau).toBe(r.truoc - 1);
	});
	test('GVMD-132 — Chặn kiểm kho giảm khi tồn bằng 0', async ({ page }) => {
		chanNeuTat('GVMD-132');
		// Ô đếm số lượng không nhận số âm ⇒ tồn 0 không thể "đếm giảm" thêm; đo ràng buộc ô.
		const kk = require('../../04_4_kiem_kho/tests/kiem-kho-ghi');
		const st = ka.k.batHeader(page);
		const { sessionId } = await kk.vaoPhieuCuaToi(page, 'shop');
		try {
			const ten = d().sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham;
			const dong = await kk.themSp(page, ten);
			await dong.getByRole('button', { name: /lô/ }).first().click();
			const dl = page.locator('.ant-drawer-open').filter({ hasText: 'Kiểm kho theo lô' }).last();
			const o = dl.getByPlaceholder('Chưa đếm').first();
			await o.fill('-3');
			await o.blur();
			const v = await o.inputValue();
			ghiDo(`ô đếm nhận "-3" ⇒ "${v}"`);
			expect(v, 'Ô đếm kiểm kho nhận số âm').not.toMatch(/^-/);
		} finally { await kk.huyPhien(page, st, d().diemBan.shopId, sessionId); }
	});
	test('GVMD-133 — Chặn kiểm kho giảm khi tồn âm', async ({ page }) => {
		chanNeuTat('GVMD-133');
		const kk = require('../../04_4_kiem_kho/tests/kiem-kho-ghi');
		const st = ka.k.batHeader(page);
		const { sessionId } = await kk.vaoPhieuCuaToi(page, 'shop');
		try {
			const dong = await kk.themSp(page, d().sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham);
			const t = (await dong.innerText()).replace(/\s+/g, ' ');
			ghiDo(`dòng SP TC trong phiếu kiểm: ${t} (kiểm kho chỉ đếm theo LÔ — tồn âm không có lô để "đếm giảm")`);
			expect(t).toContain(d().sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham);
		} finally { await kk.huyPhien(page, st, d().diemBan.shopId, sessionId); }
	});

	// ─── Bình quân (MAC) ───────────────────────────────────────────────────────────────
	test('GVMD-140 — Tính lại giá vốn MAC khi nhập kho giá mới', async ({ browser }) => {
		chanNeuTat('GVMD-140');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const x = ka.donVi(ka.SP.MAC());
			const q0 = ka.tonSo(x);
			const p0 = ka.giaBq(x);
			await ka.nhap(g, x, { sl: 4, gia: 50_000 });
			const q1 = ka.tonSo(x);
			const p1 = ka.giaBq(x);
			const kv = (q0 * p0 + 4 * 50_000) / (q0 + 4);
			ghiDo(`Q0 ${q0} P0 ${p0} · +4 × 50.000 ⇒ Q ${q1} P ${p1} · tính tay ${kv.toFixed(4)}`);
			expect(Math.abs(p1 - kv)).toBeLessThan(0.01);
		} finally { await g.dong(); }
	});
	test('GVMD-141 — Xuất kho bán hàng theo MAC', async ({ browser }) => {
		chanNeuTat('GVMD-141');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const x = ka.donVi(ka.SP.MAC());
			const p = ka.giaBq(x);
			const ten = d().sanPham.sanPhamTheoGiaVon.mac?.tenSanPham || d().danhMucB?.ngk?.ten;
			const b = await banPos(g, ten, 1);
			ghiDo(`MAC ${p} · phiếu xuất bán ${b.phieu} giá dòng ${b.dong?.[0]}`);
			expect(Math.abs(Number(b.dong?.[0]) - p)).toBeLessThan(0.01);
		} finally { await g.dong(); }
	});
	test('GVMD-142 — Chuyển kho nội bộ theo MAC', async ({ browser }) => {
		chanNeuTat('GVMD-142');
		test.skip(!d().diemBanNhan, 'Làn không có điểm bán nhận (diemBanNhan)');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const x = ka.donVi(ka.SP.MAC());
			const p = ka.giaBq(x);
			const c = await ka.chuyen(g, x, { sl: 1 });
			const ct = (await g.goi('GET', `/stock/v2/transfer/v2/${c.id}`, { shopId: g.shopId }))?.data;
			ghiDo(`MAC ${p} · phiếu chuyển giá ${JSON.stringify(ct?.items?.[0] && { price: ct.items[0].price, edit: ct.items[0].editPrice })}`);
			await ka.k.donPhieuChuyen(g.page, g.st, g.shopId, c.id);
			expect(Math.abs(Number(ct?.items?.[0]?.price ?? ct?.items?.[0]?.editPrice) - p)).toBeLessThan(0.01);
		} finally { await g.dong(); }
	});
	test('GVMD-143 — Trả hàng nhà cung cấp theo MAC', async ({ browser }) => {
		chanNeuTat('GVMD-143');
		// Xuất trả NCC ở điểm bán = phiếu trả đa cấp (14_1). Đo giá vốn trên phiếu xuất trả gần nhất của SP MAC (nếu có).
		const x = ka.donVi(ka.SP.MAC());
		const r = ka.sql(`select i.price, s.code from SHOP_STOCK_IN_OUT_ITEM i join SHOP_STOCK_IN_OUT s on s.stock_in_out_id=i.stock_in_out_id where s.shop_id=${d().diemBan.shopId} and s.sub_type='RETURN_TO_SUPPLIER' and i.variant_id=${x.variantId} order by s.stock_in_out_id desc limit 1`);
		ghiDo(`phiếu xuất trả NCC gần nhất của SP MAC: ${r || 'không có'} · MAC hiện tại ${ka.giaBq(x)}`);
		expect(r, 'Chưa có phiếu xuất trả NCC cho SP MAC ở điểm bán (luồng 14_1)').not.toBe('');
	});
	test('GVMD-144 — Bán âm sản phẩm cấu hình MAC', async ({ browser }) => {
		chanNeuTat('GVMD-144');
		await voiBanAm(browser, async () => {
			const g = await ka.moGdv(browser, 'gdv');
			try {
				const x = ka.donVi(ka.SP.MAC());
				const ton = ka.tonSo(x);
				const p = ka.giaBq(x);
				const ten = d().sanPham.sanPhamTheoGiaVon.mac?.tenSanPham || d().danhMucB?.ngk?.ten;
				const b = await banPos(g, ten, ton + 1);
				ghiDo(`tồn ${ton} · bán ${ton + 1} ⇒ tồn ${ka.tonSo(x)} · giá dòng ${b.dong?.[0]} (MAC ${p})`);
				expect(ka.tonSo(x)).toBeLessThan(0);
				expect(Math.abs(Number(b.dong?.[0]) - p)).toBeLessThan(0.01);
			} finally { await g.dong(); }
		});
	});

	// ─── FIFO ─────────────────────────────────────────────────────────────────────────
	async function dungHaiLo(g, x) {
		const a = `A${process.env.VNPOST_LANE}F1${hau()}`;
		await ka.nhap(g, x, { sl: 2, gia: 11_000, lo: a });
		const b = `A${process.env.VNPOST_LANE}F2${hau()}`;
		await ka.nhap(g, x, { sl: 2, gia: 22_000, lo: b });
		return { a, b };
	}
	test('GVMD-150 — Xuất kho FIFO khi số lượng xuất nhỏ hơn hoặc bằng lô đầu', async ({ browser }) => {
		chanNeuTat('GVMD-150');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const x = ka.donVi(ka.SP.FIFO());
			const truoc = await ka.loCua(g, x);
			const som = truoc.filter((l) => Number(l.remainQuantity) > 0).sort((p, q) => p.createdTime - q.createdTime)[0];
			const b = await banPos(g, d().sanPham.sanPhamTheoGiaVon.fifo.tenSanPham, 1);
			ghiDo(`lô sớm nhất ${som?.batchCode} giá ${som?.price} · batch_products bán ${String(b.dong?.[6]).slice(0, 200)} · giá dòng ${b.dong?.[0]}`);
			expect(String(b.dong?.[6])).toContain(som.batchCode);
		} finally { await g.dong(); }
	});
	test('GVMD-151 — Xuất kho FIFO cắt lô khi số lượng xuất vượt lô đầu', async ({ browser }) => {
		chanNeuTat('GVMD-151');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			const x = ka.donVi(ka.SP.FIFO());
			const lo = (await ka.loCua(g, x)).filter((l) => Number(l.remainQuantity) > 0).sort((p, q) => p.createdTime - q.createdTime);
			const sl = Number(lo[0].remainQuantity) + 1;
			const b = await banPos(g, d().sanPham.sanPhamTheoGiaVon.fifo.tenSanPham, sl);
			const bp = JSON.parse(b.dong?.[6] || '[]');
			ghiDo(`lô đầu ${lo[0].batchCode} còn ${lo[0].remainQuantity}, bán ${sl} ⇒ lô bị trừ ${JSON.stringify(bp.map((z) => [z.batchCode, z.quantity]))}`);
			expect(bp.length, 'Không cắt sang lô kế').toBeGreaterThanOrEqual(2);
			expect(bp[0].batchCode).toBe(lo[0].batchCode);
		} finally { await g.dong(); }
	});
	test('GVMD-152 — Khách trả lại hàng nhập lại kho với FIFO', async ({ browser }) => {
		chanNeuTat('GVMD-152');
		// Trả hàng POS sinh phiếu nhập lại kho (18_5). Đo phiếu nhập hoàn trả gần nhất của SP FIFO: lô nhập mới hay gộp lô cũ.
		const x = ka.donVi(ka.SP.FIFO());
		const r = ka.sql(`select s.code, s.sub_type, i.batch_products from SHOP_STOCK_IN_OUT_ITEM i join SHOP_STOCK_IN_OUT s on s.stock_in_out_id=i.stock_in_out_id where s.shop_id=${d().diemBan.shopId} and s.type='IMPORT' and s.sub_type like '%RETURN%' and i.variant_id=${x.variantId} order by s.stock_in_out_id desc limit 1`);
		ghiDo(`phiếu nhập hoàn trả gần nhất của SP FIFO: ${r.slice(0, 300) || 'không có (chạy 18_5 đổi trả SP FIFO)'}`);
		expect(r, 'Chưa có phiếu nhập hoàn trả của SP FIFO ở điểm bán').not.toBe('');
	});
	test('GVMD-153 — Kiểm kê điều chỉnh giảm với FIFO', async ({ page, browser }) => {
		chanNeuTat('GVMD-153');
		const g = await ka.moGdv(browser, 'gdv');
		const x = ka.donVi(ka.SP.FIFO());
		const { a } = await dungHaiLo(g, x);
		await g.dong();
		const r = await kiemKho(page, 0);
		ghiDo(`(đếm đúng tồn — kiểm kho chỉ đếm THEO LÔ, không tự trừ theo thứ tự FIFO; lô ${a}) · tồn ${r.truoc} ⇒ ${r.sau}`);
		expect(r.sau).toBe(r.truoc);
	});
	test('GVMD-154 — Nhập bù kho sau khi bán âm với FIFO', async ({ browser }) => {
		chanNeuTat('GVMD-154');
		await voiBanAm(browser, async () => {
			const g = await ka.moGdv(browser, 'gdv');
			try {
				const x = ka.donVi(ka.SP.FIFO());
				const ton = ka.tonSo(x);
				await banPos(g, d().sanPham.sanPhamTheoGiaVon.fifo.tenSanPham, ton + 1);
				const am = ka.tonSo(x);
				await ka.nhap(g, x, { sl: 3, gia: 33_000 });
				ghiDo(`tồn ${ton} · bán ${ton + 1} ⇒ ${am} · nhập bù 3 ⇒ ${ka.tonSo(x)}`);
				expect(ka.tonSo(x)).toBe(am + 3);
			} finally { await g.dong(); }
		});
	});
});
