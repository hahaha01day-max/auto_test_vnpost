'use strict';

/**
 * 10 · 130 — Giá ở QUẦY BÁN HÀNG theo bảng giá (vai `seed_gdv`, bảng giá tạm lập bằng phiên phụ `tct`).
 *
 * Vật thử: SP sản xuất `AUTO8_SP_SX_*` (sổ seed bước 10) — có tồn ở điểm bán seed và KHÔNG thuộc bảng
 * giá nào. 🚫 Không dùng 4 SP seed thường: chúng nằm trong `AUTO8_BANGGIA` (100.000) mà mọi case POS
 * khác đang đọc. Bảng giá tạm tên `AUTO8_BGP_*`, áp cho điểm bán SEED, xoá hết ở case cuối.
 * Chỉ thêm vào bill rồi xoá — 🚫 không thanh toán.
 *
 * 🔴 Worker khởi động lại sau mỗi case đỏ ⇒ trạng thái (tên bảng giá đã tạo) ghi ra file.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');
const bg = require('./bg-ghi');
const pp = require('./price-page');
const pos = require('./pos-10');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const TEN = (x) => `${seed.PREFIX}BGP_${x}`;
const FILE = path.join(GOC, 'test-output', 'ban-hang-gia-state.json');
const napTT = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { daTao: [] }; } };
const luuTT = (t) => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(t)); };
const ghiTao = (ten) => { const t = napTT(); if (!t.daTao.includes(ten)) t.daTao.push(ten); luuTT(t); };

const SX = () => seed.doc().duLieu.sanPhamSanXuat.coCongThuc;
// VAT bán hàng của SP sản xuất — seed bước 10 đặt 8% (mặc định lúc tạo là 0% ⇒ hai loại bảng giá ra cùng số).
const VAT = () => { const v = SX().vatPercent; if (!v) throw new Error('SP sản xuất chưa đặt VAT bán hàng (00_seed bước 10)'); return v / 100; };

/** Lập + (tuỳ chọn) duyệt bảng giá tạm cho SP sản xuất bằng phiên `tct`. */
async function lapBangGia(browser, { ma, gia, phamVi = 'seed', duyet = true, sku, loai, ...chung }) {
	const p = await k.moPhienPhu(browser, 'tct', pp.ROUTE);
	try {
		const ten = TEN(`${ma}${bg.hau()}`);
		await bg.taoTam(p.page, { ten, sku: sku || SX().sku, gia, phamVi, loai, ...chung });
		ghiTao(ten);
		if (duyet) await bg.duyet(p.page, ten);
		return ten;
	} finally {
		await p.dong();
	}
}

async function xoaBangGia(browser, ten) {
	const p = await k.moPhienPhu(browser, 'tct', pp.ROUTE);
	try {
		const x = await bg.chiTietTheoTen(p.page, p.st, ten);
		if (!x) return;
		if (x.status === 1 && x.isApproved === 1) await k.goiGhi(p.page, p.st, 'PUT', '/chain-price-list/update-status', { priceListId: x.priceListId, status: 0 });
		await k.goiGhi(p.page, p.st, 'DELETE', '/chain-price-list/delete', { priceListId: x.priceListId });
	} finally {
		await p.dong();
	}
}

const LOI_KHONG_BANG_GIA = (ten) => `Sản phẩm: ${ten} chưa nằm trong bảng giá nào có hiệu lực tại điểm bán`;

async function thuThemKhongGia(page, id) {
	await pos.moCa(page, test);
	await pos.moPos(page);
	const kq = await pos.them(page, SX().tenSanPham);
	test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
	await pos.xoaHet(page);
	expect(kq.thongBao, `${id}: không báo đúng nguyên văn lỗi thiếu bảng giá`).toContain(LOI_KHONG_BANG_GIA(SX().tenSanPham));
	expect(kq.dong, `🔴 ${id}: SP không có bảng giá hiệu lực VẪN thêm được vào bill (dòng: ${kq.dong})`).toBeNull();
}

test.describe('10 · 130 — giá ở quầy theo bảng giá', () => {
	test('10_130_003 — Sản phẩm KHÔNG nằm trong bảng giá nào tại điểm bán', async ({ page }) => {
		chanNeuTat('10_130_003');
		luuTT({ daTao: [] });
		await thuThemKhongGia(page, '10_130_003');
	});

	test('10_130_004 — Sản phẩm nằm trong nhiều bảng giá nhưng CHƯA có hiệu lực', async ({ page, browser }) => {
		chanNeuTat('10_130_004');
		test.setTimeout(300_000);
		const t = napTT();
		if (!t.tuongLai) {
			t.tuongLai = [await lapBangGia(browser, { ma: 'TL1', gia: 41_000, batDau: bg.sauNgay(1) }), await lapBangGia(browser, { ma: 'TL2', gia: 42_000, batDau: bg.sauNgay(2) })];
			luuTT({ ...napTT(), tuongLai: t.tuongLai });
		}
		await thuThemKhongGia(page, '10_130_004');
	});

	test('10_130_007 — Sản phẩm nằm trong bảng giá hiệu lực tại ĐIỂM BÁN KHÁC', async ({ page, browser }) => {
		chanNeuTat('10_130_007');
		test.setTimeout(300_000);
		const t = napTT();
		if (!t.khac) luuTT({ ...t, khac: await lapBangGia(browser, { ma: 'KHAC', gia: 43_000, phamVi: 'rac' }) });
		await thuThemKhongGia(page, '10_130_007');
	});

	test('10_130_001 — Giá bán khi sản phẩm nằm trong bảng giá CHƯA gồm VAT, có hiệu lực tại điểm bán', async ({ page, browser }) => {
		chanNeuTat('10_130_001');
		test.setTimeout(300_000);
		const gia = 50_000;
		const ten = await lapBangGia(browser, { ma: 'TRUOC', gia, includeTax: 0 });
		try {
			await pos.moCa(page, test);
			await pos.moPos(page);
			const kq = await pos.them(page, SX().tenSanPham);
			test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
			await pos.xoaHet(page);
			const ky = Math.round(gia * (1 + VAT()));
			expect(kq.dong, 'SP trong bảng giá hiệu lực mà không thêm được vào bill').not.toBeNull();
			expect(kq.giaGoiY, 'Giá ở thanh tìm kiếm ≠ giá bán × (1 + %VAT)').toBe(ky);
			expect(kq.dong, 'Giá trên bill ≠ giá bán × (1 + %VAT)').toContain(new Intl.NumberFormat('vi-VN').format(ky));
			// 🔴 Điểm bán seed đang dính CTKM đơn hàng của chuỗi ("giảm 5k đơn", tự áp) ⇒ ô VAT tính trên số
			//    SAU giảm giá đơn: VAT = (sau VAT − giảm) × v/(1+v). Không có giảm thì = giá bán × %VAT.
			const giam = (kq.tong?.sauVat ?? 0) - (kq.tong?.canThanhToan ?? kq.tong?.sauVat ?? 0);
			const vatKy = giam > 0 ? Math.round((ky - giam) * VAT() / (1 + VAT())) : Math.round(gia * VAT());
			test.info().annotations.push({ type: 'đo', description: `giảm giá đơn tự áp: ${giam} đ — VAT kỳ vọng ${vatKy}` });
			expect(kq.tong?.vat, 'Ô VAT ≠ %VAT tính trên số phải thu (sau giảm giá đơn)').toBe(vatKy);
			expect(kq.tong?.truocVat, 'Tổng trước VAT ≠ giá bán khai trong bảng giá').toBe(gia);
		} finally {
			await xoaBangGia(browser, ten);
		}
	});

	test('10_130_002 — Giá bán khi sản phẩm nằm trong bảng giá ĐÃ gồm VAT, có hiệu lực', async ({ page, browser }) => {
		chanNeuTat('10_130_002');
		test.setTimeout(300_000);
		const gia = 70_200;
		const ten = await lapBangGia(browser, { ma: 'SAU', gia, includeTax: 1 });
		const t = napTT();
		luuTT({ ...t, sau: ten });
		await pos.moCa(page, test);
		await pos.moPos(page);
		const kq = await pos.them(page, SX().tenSanPham);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
		await pos.xoaHet(page);
		expect(kq.dong, 'SP trong bảng giá hiệu lực mà không thêm được vào bill').not.toBeNull();
		expect(kq.giaGoiY, 'Giá ở thanh tìm kiếm ≠ đúng giá bán khai (đã gồm VAT)').toBe(gia);
		expect(kq.dong).toContain(new Intl.NumberFormat('vi-VN').format(gia));
		expect(kq.tong?.sauVat, 'Tổng sau VAT ≠ giá bán khai').toBe(gia);
		expect(kq.tong?.truocVat, 'Tổng trước VAT ≠ giá bán / (1 + %VAT)').toBe(Math.round(gia / (1 + VAT())));
	});

	test('10_130_005 — Nhiều bảng giá hiệu lực, khác NGÀY bắt đầu', async ({ page, browser }) => {
		chanNeuTat('10_130_005');
		test.setTimeout(300_000);
		const t = napTT();
		test.skip(!t.sau, 'Cần bảng giá "SAU" (bắt đầu hôm nay) từ 10_130_002.');
		// Bảng giá thứ hai bắt đầu HÔM QUA, giá khác. Kỳ vọng kịch bản: bảng bắt đầu muộn nhất (hôm nay) thắng.
		let cu = null;
		try {
			cu = await lapBangGia(browser, { ma: 'CU', gia: 61_000, includeTax: 1, batDau: bg.sauNgay(-1) });
		} catch (e) {
			test.skip(true, `Không lập được bảng giá bắt đầu HÔM QUA (FE/BE chặn ngày quá khứ): ${String(e.message).slice(0, 200)}`);
		}
		await pos.moCa(page, test);
		await pos.moPos(page);
		const kq = await pos.them(page, SX().tenSanPham);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ homNay: 70_200, homQua: 61_000, kq }) });
		await pos.xoaHet(page);
		expect(kq.giaGoiY, 'Giá không lấy từ bảng giá có ngày bắt đầu MUỘN NHẤT').toBe(70_200);
		void cu;
	});

	/**
	 * Kỳ vọng user chốt 28/09/2026 (A13): nhiều bảng giá cùng hiệu lực, khác KHUNG GIỜ trong ngày ⇒ áp bảng có khung giờ CHỨA giờ bán
	 * hiện tại; cả hai cùng chứa ⇒ bảng TẠO SAU thắng. Trace vnpost-web f9c5c858 `features/pricing/components/tabs/TabGeneralInfo.jsx`:
	 * "Giờ bắt đầu"/"Giờ kết thúc" + ô "Không cài đặt khung giờ" (mặc định tick). Ba bảng tạm (bắt đầu hôm nay, phạm vi điểm bán seed):
	 * X 00:00–23:59 @71.000 → Y khung KHÔNG chứa giờ hiện tại @72.000 (tạo sau X) ⇒ POS phải ra X; rồi Z 00:00–23:59 @73.000 ⇒ POS
	 * phải ra Z. Chỉ thêm vào bill rồi xoá, 🚫 thanh toán. Xoá cả ba bảng ở finally.
	 */
	test('10_130_006 — Nhiều bảng giá hiệu lực, cùng ngày nhưng khác GIỜ bắt đầu', async ({ page, browser }) => {
		chanNeuTat('10_130_006');
		test.setTimeout(420_000);
		const gioNay = new Date().getHours();
		test.skip(gioNay < 1 || gioNay >= 23, 'Cần giờ chạy trong 01:00–23:00 để dựng khung giờ KHÔNG chứa giờ hiện tại');
		const daTao = [];
		const docGia = async () => {
			await pos.moCa(page, test);
			await pos.moPos(page);
			const kq = await pos.them(page, SX().tenSanPham);
			await pos.xoaHet(page).catch(() => null);
			return kq;
		};
		try {
			daTao.push(await lapBangGia(browser, { ma: 'GIOX', gia: 71_000, includeTax: 1, gio: ['00:00', '23:59'] }));
			daTao.push(await lapBangGia(browser, { ma: 'GIOY', gia: 72_000, includeTax: 1, gio: ['00:00', '00:30'] }));
			const kq1 = await docGia();
			daTao.push(await lapBangGia(browser, { ma: 'GIOZ', gia: 73_000, includeTax: 1, gio: ['00:00', '23:59'] }));
			const kq2 = await docGia();
			test.info().annotations.push({ type: 'đo', description: `giờ chạy ${new Date().toTimeString().slice(0, 5)} · X 00:00–23:59 71.000 · Y 00:00–00:30 72.000 (tạo sau X) ⇒ POS ${kq1.giaGoiY} · + Z 00:00–23:59 73.000 (tạo sau cùng) ⇒ POS ${kq2.giaGoiY} · ${JSON.stringify({ kq1: kq1.goiY, kq2: kq2.goiY })}` });
			expect(kq1.giaGoiY, '🔴 Bảng có khung giờ KHÔNG chứa giờ bán (Y, tạo sau) vẫn được áp').not.toBe(72_000);
			expect(kq1.giaGoiY, 'Không áp bảng có khung giờ chứa giờ bán hiện tại (X)').toBe(71_000);
			expect(kq2.giaGoiY, 'Hai bảng cùng chứa giờ bán mà không áp bảng TẠO SAU (Z)').toBe(73_000);
		} finally {
			for (const ten of daTao) await xoaBangGia(browser, ten).catch(() => null);
		}
	});

	test('10_130_008 — Giá bán combo khi nằm trong bảng giá hiệu lực tại điểm bán', async ({ page, browser }) => {
		chanNeuTat('10_130_008');
		test.setTimeout(300_000);
		const p = await k.moPhienPhu(browser, 'tct', pp.ROUTE);
		const b = await k.goiApi(p.page, p.st, '/chain/products/basic-search', { type: 10, page: 0, size: 100 });
		await p.dong();
		const c = (b.data || []).find((x) => x.status === 'KICH_HOAT' && x.distributionMethod === 'MUA_BAN' && x.variants?.[0]?.sku && !/\s/.test(x.variants[0].sku));
		test.skip(!c, 'Chuỗi không có combo MUA_BAN KICH_HOAT có SKU hợp lệ.');
		const gia = 99_000;
		const ten = await lapBangGia(browser, { ma: 'COMBO', gia, includeTax: 1, sku: c.variants[0].sku, loai: 'Combo sản phẩm' });
		try {
			await pos.moCa(page, test);
			await pos.moPos(page);
			const kq = await pos.them(page, c.productName);
			test.info().annotations.push({ type: 'đo', description: JSON.stringify({ combo: [c.productName, c.variants[0].sku], kq }) });
			await pos.xoaHet(page);
			expect(kq.dong, 'Combo trong bảng giá hiệu lực không thêm được vào bill').not.toBeNull();
			expect(kq.giaGoiY, 'Giá combo không lấy đúng từ bảng giá').toBe(gia);
		} finally {
			await xoaBangGia(browser, ten);
		}
	});

	test('dọn bảng giá tạm AUTO8_BGP_*', async ({ browser }) => {
		test.setTimeout(300_000);
		const p = await k.moPhienPhu(browser, 'tct', pp.ROUTE);
		const ds = ((await k.goiApi(p.page, p.st, '/chain-price-list/get-all', { name: TEN(''), page: 0, size: 100 })).data || []).filter((v) => v.name?.startsWith(TEN('')));
		for (const x of ds) {
			if (x.status === 1 && x.isApproved === 1) await k.goiGhi(p.page, p.st, 'PUT', '/chain-price-list/update-status', { priceListId: x.priceListId, status: 0 });
			await k.goiGhi(p.page, p.st, 'DELETE', '/chain-price-list/delete', { priceListId: x.priceListId });
		}
		const con = ((await k.goiApi(p.page, p.st, '/chain-price-list/get-all', { name: TEN(''), page: 0, size: 100 })).data || []).filter((v) => v.name?.startsWith(TEN('')));
		await p.dong();
		luuTT({ daTao: [] });
		expect(con.map((x) => x.name), 'Còn bảng giá tạm chưa dọn').toEqual([]);
	});
});
