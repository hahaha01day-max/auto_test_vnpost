'use strict';

/**
 * Helper GHI của 14_2 — dựng phiếu trả Đã duyệt từ hàng CÓ NGUỒN NCC (tiền đề `tien-de.province.spec.js`).
 *
 * Nguồn hàng ở điểm bán seed (sổ seed `duLieu.traNcc14_2`):
 * - `TD1` — SP tự doanh tỉnh, PO tỉnh `poTd1` về HUB rồi chuyển xuống ⇒ tách ra nhóm NCC tỉnh (Chưa trả hàng).
 * - `TC`  — SP TCT, PO TCT `poTc` về kho TCT rồi chuyển xuống ⇒ tách ra nhóm TCT (Chưa gửi TCT).
 * - `DK`  — hàng tồn đầu kỳ (không truy được NCC) ⇒ dùng cho case "tách thất bại".
 * API BE (`ReturnRequestController`): `/consolidate` · `/{id}/split` · `/{id}/receive-to-province` · `/{id}/return-to-supplier`
 * · `/{id}/restock` · `/{id}/dispose` · `/{id}/send-to-tct` · `/{id}/supplier-batches` · `/supplier-batches/{b}/(confirm|reject|resolve-rejection)`.
 */

const { expect } = require('@playwright/test');
const rp = require('../../14_1_lap_va_duyet_phieu_xuat_tra/tests/return-page');

const { k, seed, API } = rp;
const d = () => seed.doc().duLieu;
const shopId = () => d().diemBan.shopId;

function nguon() {
	const t = d().traNcc14_2;
	if (!t?.chuyen || !t?.chuyenTc) throw new Error('Làn chưa chạy tiền đề 14_2 (`-g "tien de 14_2"`) — chưa có hàng có nguồn NCC ở điểm bán.');
	return { TD1: d().tuDoanhTinh.sanPham.TD1.productId, TC: t.tcProductId };
}

/** Lô khả dụng của SP ở điểm bán, ưu tiên lô sinh từ phiếu chuyển (có nguồn PO). */
async function loNguon(page, st, productId, sl, { coNguon = true } = {}) {
	const ma = Object.entries(nguon()).find(([, v]) => v === productId)?.[0];
	const coLo = d().traNcc14_2?.loCoNguon?.[ma] || [];
	const ds = ((await k.goiApi(page, st, '/stock/v2/batch-product', { shopId: shopId(), productId, size: 500 })).data || [])
		.filter((l) => !l.deleted && l.inventoryId !== d().khoPhu?.id && Number(l.remainQuantity) - Number(l.reservedQuantity || 0) >= sl)
		// 🔴 Điểm bán có cả lô GDV nhập tay (không truy được NCC) ⇒ chỉ lấy lô ghi trong sổ `loCoNguon`, hoặc đúng lô nhập tay khi coNguon=false.
		.filter((l) => (coNguon ? coLo.includes(l.batchCode) : !coLo.includes(l.batchCode) && /^A\d/.test(l.batchCode)));
	expect(ds.length, `Điểm bán hết hàng khả dụng SP ${productId} (cần ${sl}) — chạy lại tiền đề 14_2 để bổ sung`).toBeGreaterThan(0);
	return ds.sort((a, b) => Number(b.stockInOutId || 0) - Number(a.stockInOutId || 0))[0];
}

/** Dòng payload phiếu trả từ một lô (khuôn request thật của form, xem 14_1 `dongDauKy`). */
function dongTuLo(l, sl) {
	return {
		productId: l.productId, variantId: l.variantId, productName: l.productName, variantName: l.variantName,
		productSku: l.sku || l.productSku, unitId: l.productUnitId, unitName: l.unit || l.unitName || 'Cái', convertToMainUnit: 1,
		quantity: sl, batchCode: l.batchCode, batchProductId: l.id ?? l.batchProductId, sourceShopId: shopId(), inventoryId: l.inventoryId,
	};
}

/**
 * Điểm bán lập phiếu (`loai`: mảng 'TD1' | 'TC' | 'DK'), xã + tỉnh duyệt đủ ⇒ trả { id, code } phiếu APPROVED.
 * `ps` = phiên điểm bán { page, st }.
 */
let phienXa = null;
async function phieuDaDuyet(browser, ps, { loai = ['TD1'], sl = 1, note } = {}) {
	// 'TC_TAY' = hàng TCT từ lô GDV nhập tay (mất truy xuất nguồn gốc).
	const items = [];
	for (const x of loai) {
		if (x === 'DK') items.push(...(await rp.dongDauKy(ps.page, ps.st, { sl, soDong: 1 })));
		else if (x === 'TC_TAY') items.push(dongTuLo(await loNguon(ps.page, ps.st, nguon().TC, sl, { coNguon: false }), sl));
		else items.push(dongTuLo(await loNguon(ps.page, ps.st, nguon()[x], sl), sl));
	}
	const p = await rp.taoPhieuApi(ps.page, ps.st, { items, note: note || `AUTO TEST 14_2 ${loai.join('+')}` });
	// Phiên xã giữ suốt worker (browser dùng chung) — mỗi phiếu đăng nhập xã một lần là quá nhiều lượt đăng nhập.
	if (!phienXa || phienXa.browser !== browser) {
		phienXa = { browser, ...(await k.moPhienPhu(browser, 'ward', rp.ROUTE)) };
		rp.datPhienSan('ward', phienXa);
	}
	await rp.duyetDu(browser, 'ward', p.id);
	await rp.duyetDu(browser, 'province', p.id);
	const ct = await rp.chiTietPhieu(ps.page, ps.st, p.id);
	expect(ct?.request?.status, `Phiếu ${p.code} duyệt xong mà không ở APPROVED`).toBe('APPROVED');
	return { id: p.id, code: p.code };
}

/** Gọi một hành động POST của luồng phiếu trả bằng phiên `p` (không tự assert). */
const goi = (p, duong, data = {}, params = {}) => k.goiGhi(p.page, p.st, 'POST', `${API}${duong}`, params, data);
const doc = (p, duong, params = {}) => k.goiGhi(p.page, p.st, 'GET', `${API}${duong}`, params);

/** Tách phiếu, assert 200, trả danh sách phiếu (con hoặc chính nó). */
async function tach(p, id) {
	const b = await goi(p, `/${id}/split`);
	expect(String(b?.status?.code), `Tách phiếu ${id} lỗi: ${b?.status?.message}`).toBe('200');
	return b.data;
}

/** Danh sách phiếu (API list) lọc theo từ khoá mã. */
async function timApi(p, keyword, extra = {}) {
	const b = await doc(p, '', { keyword, code: keyword, page: 0, size: 50, ...extra });
	return b?.data || [];
}

/** Phiếu con "Chưa trả hàng" (NCC tỉnh) sẵn sàng xử lý: lập TD1 → duyệt → tách tại chỗ. */
async function phieuChuaTra(browser, ps, pt, { sl = 1 } = {}) {
	const p = await phieuDaDuyet(browser, ps, { loai: ['TD1'], sl });
	const ds = await tach(pt, p.id);
	const c = ds[0];
	expect(c?.status, `Tách phiếu TD1 không ra "Chưa trả hàng": ${JSON.stringify(c).slice(0, 300)}`).toBe('PROVINCE_NOT_RETURNED');
	return { ...p, con: c };
}

/**
 * Phiếu con NCC tỉnh sinh từ tách THẬT (TD1 + TC ⇒ 2 phiếu con). 🔴 Tách tại chỗ (1 NCC) giữ org_unit_type = DIEM_BAN nên
 * đợt bị NCC từ chối mang reject_stage = DIEM_BAN — không cấp nào quyết định được (đo 24/09, báo cáo 14_2). Phiếu con
 * tách thật mang BUU_DIEN_TINH ⇒ dùng cho các case theo dõi đợt trả. `sl` áp cho dòng TD1.
 */
async function phieuConTinh(browser, ps, pt, { sl = 1 } = {}) {
	const items = [dongTuLo(await loNguon(ps.page, ps.st, nguon().TD1, sl), sl), dongTuLo(await loNguon(ps.page, ps.st, nguon().TC, 1), 1)];
	const p = await rp.taoPhieuApi(ps.page, ps.st, { items, note: 'AUTO TEST 14_2 TD1+TC' });
	if (!phienXa || phienXa.browser !== browser) {
		phienXa = { browser, ...(await k.moPhienPhu(browser, 'ward', rp.ROUTE)) };
		rp.datPhienSan('ward', phienXa);
	}
	await rp.duyetDu(browser, 'ward', p.id);
	await rp.duyetDu(browser, 'province', p.id);
	const con = (await tach(pt, p.id)).find((c) => c.supplierLevel === 'TINH');
	expect(con?.status, 'Tách TD1+TC không ra phiếu con NCC tỉnh "Chưa trả hàng"').toBe('PROVINCE_NOT_RETURNED');
	return { id: con.id, code: con.code, cha: p, con };
}

/** Phiếu "Chưa gửi TCT": lập TC → duyệt → tách tại chỗ. */
async function phieuChuaGuiTct(browser, ps, pt, { sl = 1 } = {}) {
	const p = await phieuDaDuyet(browser, ps, { loai: ['TC'], sl });
	const ds = await tach(pt, p.id);
	expect(ds[0]?.status, `Tách phiếu TC không ra "Chưa gửi TCT": ${JSON.stringify(ds[0]).slice(0, 300)}`).toBe('TCT_NOT_SENT');
	return { ...p, con: ds[0] };
}

/** Item của phiếu (chi tiết) — [{ id, quantity, remainQuantity, ... }]. */
async function itemCua(p, id) {
	return (await rp.chiTietPhieu(p.page, p.st, id))?.items || [];
}

/** Payload xử lý: mỗi item `sl` (số hoặc hàm item → SL). */
async function xuLy(p, id, viec, sl) {
	const items = (await itemCua(p, id)).map((it) => ({ itemId: it.id, quantity: typeof sl === 'function' ? sl(it) : sl }));
	const duong = { RETURN: 'return-to-supplier', RESTOCK: 'restock', DISPOSE: 'dispose' }[viec];
	return goi(p, `/${id}/${duong}`, { items });
}

module.exports = { ...rp, phieuConTinh, nguon, loNguon, dongTuLo, phieuDaDuyet, goi, doc, tach, timApi, phieuChuaTra, phieuChuaGuiTct, itemCua, xuLy };
