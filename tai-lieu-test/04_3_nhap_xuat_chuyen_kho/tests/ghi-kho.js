'use strict';

/**
 * Helper GHI của phân hệ 04_3 — tạo / sửa / duyệt phiếu nhập–xuất trên điểm bán seed của làn.
 *
 * 🔴 Chỉ dùng trên điểm bán seed (`00_seed/seed-state.lane<N>.json`), 🚫 không trên điểm bán thật.
 * Dữ liệu (tên SP, SKU, shopId) đọc từ sổ seed — 🚫 không viết cứng mã của một làn.
 *
 * Đo DOM 23/09/2026 (vnpost-web af8cda07):
 * - Nút "Nhập kho" (tên trợ năng `import Nhập kho`) mở **Drawer** "Phiếu nhập kho" (🚫 không còn Modal).
 * - Ô "Tìm kiếm sản phẩm" gọi `GET /chain/products/basic-search-product-unit?productName=…`;
 *   bấm tên SP trong popup là thêm dòng.
 * - 🔴 Ở cấp điểm bán form KHÔNG có ô "Nhập từ" (NCC bị lọc bỏ cho xã/điểm bán, "Nội bộ" bị lọc
 *   bỏ cho mọi cấp) ⇒ `objectType=SHOP`, `supplierId=-1` ⇒ SP không phải giá tiêu chuẩn **không có
 *   bảng giá**, ô số lượng bị khoá (`isPriceMissing`). Chỉ SP `STANDARD` nhập tay được.
 * - Mọi dòng nhập phải có lô + NSX + HSD (nút "Nhập lô / serial" → drawer "Nhập lô hàng").
 * - Tạo: `POST /stock/v3/import-export?shopId=` ; duyệt: `…/v3/import-export/confirm`.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const BASE = () => process.env.VNPOST_BASE_URL;
/** Ghi chú đánh dấu phiếu nháp do 04_3_020_002 tạo — 020_003/004 tìm lại phiếu theo chuỗi này. */
const GHI_CHU_NHAP = 'AUTO test 04_3_020 nhap';
const HEADER_API = ['authorization', 'appid', 'chainid', 'shopid', 'orgunitcode', 'orgunittype'];

/** Dữ liệu seed của làn — ném lỗi nếu làn chưa seed (🚫 chạy với dữ liệu rỗng). */
function duLieuSeed() {
	const d = seed.doc().duLieu;
	const sp = d?.sanPham?.sanPhamTheoGiaVon;
	if (!d?.diemBan?.shopId || !sp) {
		throw new Error(`Làn ${seed.PREFIX} chưa seed điểm bán / sản phẩm — chạy 00_seed trước.`);
	}
	return { shopId: d.diemBan.shopId, tenShop: d.diemBan.tenShop, sp, tonKho: d.tonKho };
}

/** Theo dõi header xác thực mà app đang gửi — để gọi API đọc đối chiếu bằng CHÍNH phiên của vai. */
function batHeader(page) {
	const st = { h: null };
	page.on('request', (r) => {
		const h = r.headers();
		if (r.url().includes('/__api/') && h.authorization) {
			st.h = Object.fromEntries(HEADER_API.filter((k) => h[k]).map((k) => [k, h[k]]));
		}
	});
	return st;
}

async function goiApi(page, st, url, params = {}) {
	expect(st.h, 'Chưa bắt được header xác thực của app').toBeTruthy();
	const r = await page.request.get(`${BASE()}/__api${url}`, { headers: st.h, params });
	const body = await r.json();
	expect(String(body?.status?.code), `GET ${url} lỗi: ${JSON.stringify(body?.status)}`).toBe('200');
	return body;
}

/** Tổng tồn còn lại (Σ remainQuantity các lô) của một variant ở điểm bán. */
async function tonVariant(page, st, shopId, productId, variantId) {
	const b = await goiApi(page, st, '/stock/v2/batch-product', { shopId, productId, variantId, size: 500 });
	return (b.data || []).reduce((s, l) => s + Number(l.remainQuantity || 0), 0);
}

async function chiTietPhieu(page, st, shopId, stockInOutId) {
	return (await goiApi(page, st, '/stock/v2/import-export/detail', { shopId, stockInOutId })).data;
}

/** Mở màn lịch sử rồi mở drawer tạo phiếu nhập. */
async function moFormNhap(page, vai) {
	await moTrang(page, `${BASE()}/inventory/import`, vai);
	const nut = page.getByRole('button', { name: 'import Nhập kho' });
	await expect(nut, 'Vai không có nút "Nhập kho" (thiếu CREATE_IMPORT_STOCK?)').toBeVisible({ timeout: 30_000 });
	await nut.click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thông tin phiếu nhập kho' }).last();
	await dr.locator('#code').waitFor({ state: 'visible', timeout: 20_000 });
	return dr;
}

/** Tìm và thêm một sản phẩm vào phiếu; trả về bản ghi SP từ API tìm kiếm (productId/variantId…). */
async function themSanPham(page, dr, ten) {
	const cho = page.waitForResponse(
		(r) => r.url().includes('basic-search-product-unit') && r.url().includes(encodeURIComponent(ten)),
		{ timeout: 30_000 },
	);
	await dr.getByPlaceholder(/Tìm kiếm sản phẩm/).first().fill(ten);
	const body = await (await cho).json();
	const sp = (body.data || []).find((x) => x.productName === ten);
	expect(sp, `API tìm kiếm không trả SP ${ten}`).toBeTruthy();
	await page.getByText(ten, { exact: true }).first().click();
	const dong = dr.locator('tr[data-row-key]').filter({ hasText: ten }).first();
	await expect(dong).toBeVisible();
	return { sp, dong };
}

/**
 * Nhập lô cho một dòng. `lo` = [{ ma?, sl?, nsx:'dd/mm/yyyy', hsd:'dd/mm/yyyy' }].
 * Bỏ `ma` ⇒ giữ mã lô FE tự sinh.
 */
async function nhapLo(page, dong, lo) {
	await dong.getByRole('button', { name: 'Nhập lô / serial' }).click();
	const dl = page.locator('.ant-drawer-open').filter({ hasText: 'Nhập lô hàng' }).last();
	await expect(dl).toBeVisible();
	for (let i = 0; i < lo.length; i += 1) {
		if (i > 0) await dl.getByRole('button', { name: 'Thêm lô' }).click();
		const ma = dl.getByPlaceholder('Nhập / tạo mã lô').nth(i);
		if (lo[i].ma) await ma.fill(lo[i].ma);
		const ngay = dl.getByPlaceholder('Chọn ngày');
		for (const [j, v] of [[2 * i, lo[i].nsx], [2 * i + 1, lo[i].hsd]]) {
			await ngay.nth(j).click();
			await page.keyboard.type(v);
			await page.keyboard.press('Enter');
		}
		if (lo[i].sl !== undefined) {
			const soLuong = dl.locator('input[role="spinbutton"]').nth(i);
			await soLuong.fill(String(lo[i].sl));
		}
	}
	await dl.getByRole('button', { name: 'Lưu' }).click();
	await expect(dl).toBeHidden();
}

/** Bấm nút ở chân drawer rồi chờ đúng request ghi; trả về body JSON. */
async function bamVaCho(page, nut, urlPhan, method = 'POST') {
	const cho = page.waitForResponse(
		(r) => r.url().includes(urlPhan) && r.request().method() === method,
		{ timeout: 60_000 },
	);
	await nut.click();
	const res = await cho;
	return { res, body: await res.json() };
}

/** Ghi chú đánh dấu phiếu XUẤT nháp do 04_3_030_002 tạo — 030_003 tìm lại theo chuỗi này. */
const GHI_CHU_XUAT = 'AUTO test 04_3_030 xuat';

/**
 * Mở drawer tạo phiếu XUẤT (thẻ "Phiếu xuất kho" → nút "Xuất kho").
 * 🔴 Ở cấp điểm bán "Xuất cho" bị ẩn, "Lý do xuất" cố định "Xuất hàng vỡ, hỏng" (`subType=BROKEN_DAMAGED`).
 */
async function moFormXuat(page, vai) {
	await moTrang(page, `${BASE()}/inventory/import`, vai);
	await page
		.locator('.ant-tabs-tab', { hasText: 'Phiếu xuất kho' })
		.first()
		.locator('.ant-tabs-tab-btn')
		.dispatchEvent('click');
	const nut = page.locator('.ant-pro-page-container').getByRole('button', { name: /Xuất kho$/ }).first();
	await expect(nut, 'Vai không có nút "Xuất kho" (thiếu CREATE_EXPORT_STOCK?)').toBeVisible({ timeout: 30_000 });
	await nut.click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thông tin phiếu xuất kho' }).last();
	await dr.locator('#code').waitFor({ state: 'visible', timeout: 20_000 });
	return dr;
}

/** Thêm SP vào phiếu xuất (ô "Tìm sản phẩm", API `basic-search-product-unit?…&isFull=true`). */
async function themSanPhamXuat(page, dr, ten) {
	const cho = page.waitForResponse(
		(r) => r.url().includes('basic-search-product-unit') && r.url().includes(encodeURIComponent(ten)),
		{ timeout: 30_000 },
	);
	// Tồn theo kho nạp sau khi thêm dòng — có màn không gọi (vd. chuyển kho bị chặn ghi) ⇒ không bắt buộc.
	const choTon = page.waitForResponse((r) => r.url().includes('/stock/by-variants'), { timeout: 10_000 }).catch(() => null);
	await dr.getByPlaceholder('Tìm sản phẩm').fill(ten);
	const sp = ((await (await cho).json()).data || []).find((x) => x.productName === ten);
	expect(sp, `API tìm kiếm không trả SP ${ten}`).toBeTruthy();
	await page.getByText(ten, { exact: true }).last().click();
	await choTon;
	const dong = dr.locator('tr[data-row-key]').filter({ hasText: ten }).first();
	await expect(dong).toBeVisible();
	return { sp, dong };
}

/**
 * Chọn lô cho dòng xuất (MAC / giá tiêu chuẩn / đích danh): `phanBo = { <mã lô>: <SL> }`, lô khác về 0.
 * Trả về danh sách lô đang hiện trong drawer (mã, tồn, giá vốn).
 */
async function chonLoXuat(page, dong, phanBo) {
	await dong.getByRole('button', { name: 'Chọn lô' }).click();
	const dl = page.locator('.ant-drawer-open').filter({ hasText: 'Số lượng cần phân bổ' }).last();
	await expect(dl).toBeVisible();
	const hang = dl.locator('tr[data-row-key]');
	await expect(hang.first()).toBeVisible();
	const lo = [];
	for (let i = 0; i < (await hang.count()); i += 1) {
		const h = hang.nth(i);
		const ma = await h.getAttribute('data-row-key');
		const o = (await h.locator('td').allInnerTexts()).map(chuan);
		lo.push({ ma, ton: Number(o[1].replace(/\./g, '')), gia: Number(o[2].replace(/\./g, '')) });
	}
	// `phanBo` là object, hoặc hàm (danh sách lô) → object — dùng khi cần biết tồn từng lô trước.
	const pb = typeof phanBo === 'function' ? phanBo(lo) : phanBo;
	if (pb) {
		// Về 0 hết trước rồi mới điền, để tổng tạm thời không vượt SL cần phân bổ.
		for (let i = 0; i < lo.length; i += 1) await hang.nth(i).locator('input[role="spinbutton"]').fill('0');
		for (let i = 0; i < lo.length; i += 1) {
			if (pb[lo[i].ma]) await hang.nth(i).locator('input[role="spinbutton"]').fill(String(pb[lo[i].ma]));
		}
	}
	await dl.getByRole('button', { name: 'Lưu' }).click();
	await expect(dl).toBeHidden();
	return lo;
}

/**
 * CHUYỂN KHO (vai trên điểm bán, vd `tct`): mở drawer "Phiếu chuyển kho".
 * 🔴 Vai điểm bán KHÔNG dùng được: ô "Kho nhận" chỉ liệt kê chính điểm bán (tự lấy kho mặc định)
 *    ⇒ kho nhận luôn trùng kho chuyển. Vai trên dùng bộ chọn 3 cột "Chọn Điểm bán / Kho".
 */
async function moFormChuyen(page, vai) {
	await moTrang(page, `${BASE()}/inventory/transfer-warehouse`, vai);
	const nut = page.locator('.ant-pro-page-container').getByRole('button', { name: /Chuyển kho$/ }).first();
	await expect(nut, 'Vai không có nút "Chuyển kho"').toBeVisible({ timeout: 30_000 });
	await nut.click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thông tin phiếu chuyển kho' }).last();
	await dr.locator('#code').waitFor({ state: 'visible', timeout: 20_000 });
	return dr;
}

/** Chọn kho qua bộ chọn 3 cột: `o` = 'Chọn kho chuyển' | 'Chọn kho nhận'. */
async function chonKho(page, dr, o, { tinh, xa, shop }) {
	await dr.locator('.ant-select').filter({ hasText: o }).click();
	const p = page.locator('.ant-drawer-open').filter({ hasText: 'Chọn Điểm bán / Kho' }).last();
	await expect(p).toBeVisible();
	await p.getByPlaceholder('Tìm kiếm').nth(0).fill(tinh);
	await p.getByText(tinh, { exact: true }).first().click();
	await p.getByText(xa, { exact: true }).first().click();
	await p.getByText(shop, { exact: true }).last().click();
	await p.getByRole('button', { name: 'Xác nhận' }).click();
	await expect(p).toBeHidden();
	await expect(dr).toContainText(shop);
}

/** Điểm bán nguồn / nhận của làn cho chuyển kho. */
function khoChuyen() {
	const d = seed.doc().duLieu;
	if (!d?.diemBanNhan?.shopId) throw new Error(`Làn ${seed.PREFIX} chưa ghi "diemBanNhan" trong sổ seed.`);
	return {
		nguon: { tinh: d.toChuc.tenTinh, xa: d.toChuc.tenXa, shop: d.diemBan.tenShop, shopId: d.diemBan.shopId },
		nhan: { tinh: d.diemBanNhan.tenTinh, xa: d.diemBanNhan.tenXa, shop: d.diemBanNhan.tenShop, shopId: d.diemBanNhan.shopId },
	};
}

async function goiGhi(page, st, method, url, params = {}, data = undefined) {
	expect(st.h, 'Chưa bắt được header xác thực của app').toBeTruthy();
	const r = await page.request.fetch(`${BASE()}/__api${url}`, { method, headers: st.h, params, data });
	return r.json().catch(() => ({}));
}

/**
 * DỌN phiếu chuyển kho do test tạo: từ chối (nhả giữ chỗ tồn lô), rồi — nếu đã xuất kho nguồn —
 * "Nhập lại kho" để hàng đi đường về lại kho nguồn. 🔴 Phiếu Chờ xác nhận GIỮ CHỖ tồn lô: bỏ lại là
 * các lượt sau báo "Lô … không đủ tồn khả dụng để giữ chỗ". Từ chối được bằng phiên kho GỬI.
 */
async function donPhieuChuyen(page, st, shopId, id) {
	const ct = (await goiGhi(page, st, 'GET', `/stock/v2/transfer/v2/${id}`, { shopId }))?.data;
	if (!ct) return;
	if (['PENDING', 'IN_TRANSIT'].includes(ct.status)) {
		await goiGhi(page, st, 'PUT', `/stock/v2/transfer/v2/${id}/reject`, { shopId }, { reason: 'AUTO test dọn phiếu thử' });
	}
	// 🔴 Phiếu đã xuất kho nguồn mang id phiếu xuất ở `stockInId` (🚫 không phải `stockOutId` — đo 23/09/2026).
	if (ct.status === 'IN_TRANSIT' || ct.stockInId || ct.stockOutId) {
		await goiGhi(page, st, 'PUT', `/stock/v2/transfer/v2/${id}/restock`, { shopId });
	}
}

/**
 * Phiên PHỤ của một vai khác, CHỈ để gọi API đọc / dọn (🚫 không thao tác giao diện).
 * 🔴 Dùng khi dữ liệu nằm ở pod của điểm bán: header phiên TCT route về pod TCT ⇒ đọc phiếu chuyển /
 *    tồn lô của điểm bán trả 404 hoặc rỗng (đo 23/09/2026).
 */
async function moPhienPhu(browser, vai, route = '/inventory/import') {
	const { storageStateFor } = require('../../shared/auth/accounts');
	const ctx = await browser.newContext({ storageState: storageStateFor(vai) });
	const page = await ctx.newPage();
	const st = batHeader(page);
	await moTrang(page, `${BASE()}${route}`, vai);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	return { page, st, dong: () => ctx.close() };
}

/**
 * Lô còn KHẢ DỤNG (remain − reserved > 0) của một variant, lô cũ trước.
 * 🔴 Phải dùng thay cho remainQuantity khi chọn lô: phiếu chuyển Chờ xác nhận GIỮ CHỖ tồn lô, nên lô
 *    "còn tồn" có thể khả dụng 0 — FE tự phân bổ theo remain, BE từ chối "Lô … không đủ tồn khả dụng
 *    để giữ chỗ". (23/09/2026 từng thấy giữ chỗ còn ~20 phút sau khi từ chối, lần đo sau nhả ngay —
 *    chưa rõ nguyên nhân, xem báo cáo 04_3.)
 */
async function loKhaDung(page, st, shopId, productId, variantId) {
	const b = await goiApi(page, st, '/stock/v2/batch-product', { shopId, productId, variantId, size: 500 });
	return (b.data || [])
		.map((l) => ({ ma: l.batchCode, kd: Number(l.remainQuantity) - Number(l.reservedQuantity || 0), ton: Number(l.remainQuantity), gia: Number(l.price), tao: l.createdTime }))
		.filter((l) => l.kd > 0)
		.sort((a, b) => a.tao - b.tao);
}

/** Phân bổ `sl` vào các lô khả dụng (lô cũ trước) → { mã lô: SL } cho `chonLoXuat`. */
function phanBoKhaDung(lo, sl) {
	let con = sl;
	const kq = {};
	for (const l of lo) {
		if (con <= 0) break;
		const x = Math.min(con, l.kd);
		kq[l.ma] = x;
		con -= x;
	}
	expect(con, `Không đủ tồn khả dụng để phân bổ ${sl} (thiếu ${con})`).toBeLessThanOrEqual(0);
	return kq;
}

module.exports = {
	batHeader,
	loKhaDung,
	phanBoKhaDung,
	moPhienPhu,
	goiGhi,
	donPhieuChuyen,
	moFormChuyen,
	chonKho,
	khoChuyen,
	GHI_CHU_NHAP,
	GHI_CHU_XUAT,
	moFormXuat,
	themSanPhamXuat,
	chonLoXuat,
	chuan,
	duLieuSeed,
	batHeader,
	goiApi,
	tonVariant,
	chiTietPhieu,
	moFormNhap,
	themSanPham,
	nhapLo,
	bamVaCho,
};
