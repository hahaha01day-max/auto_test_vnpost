'use strict';

/**
 * 14_3 · 040 Phát hành hoá đơn xuất trả (nhánh B — VNPost lập) — vai `province` (làn 8).
 *
 * 🔴 Đo 25/09/2026 — nhánh B KHÔNG tới được trên giao diện thật:
 *   (1) Không NCC nào có `CHAIN_SUPPLIER.return_invoice_issuer = VNPOST`, và FE không có ô sửa cột này;
 *   (2) BE KHÔNG trả `returnInvoiceIssuer` trong chi tiết phiếu trả (không có trong DTO) ⇒ `ReturnRequestDetailDrawer`
 *       luôn mặc định `SUPPLIER` ⇒ nút "Phát hành hoá đơn" không bao giờ hiện.
 *   ⇒ 010_002 / 040_019 kiểm đúng hợp đồng thật (đỏ kèm lý do). Case chỉ kiểm DRAWER phát hành thì CHÈN cờ
 *   `returnInvoiceIssuer = VNPOST` vào response chi tiết phiếu (`gaNhanhB`) — bản nháp vẫn lấy thật từ `GET /issue-draft`.
 *
 * 🔴 `POST /issue` đẩy hoá đơn ra nhà cung cấp HĐĐT / cơ quan thuế, KHÔNG thu hồi được ⇒ mọi test ở đây CHẶN request đó.
 *    Case cần phát hành thật (005/011/012/015 và vế "phát hành được" của 017/018) giữ skip, chờ user cho phép.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('./hoa-don');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const LY_DO_PHAT_HANH =
	'Phát hành thật đẩy hoá đơn ra hệ thống HĐĐT (invoice-service → nhà cung cấp) và KHÔNG thu hồi được; chưa có NCC nào khai VNPost lập hoá đơn. Chờ user cho phép + khai NCC (SQL ở _BAO_CAO_KY_VONG_CAN_CHOT.md mục 14_3).';

let pt = null;
let dot = null;
let daChanIssue = [];
test.describe.configure({ timeout: 240_000 });
test.beforeEach(async ({ page }) => {
	// Chặn phát hành TRƯỚC khi mở màn — không test nào ở file này được phép phát hành thật.
	daChanIssue = await t.chanGhiHd(page, /return-credit-note\/issue(\?|$)/);
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh(VAI, page, st);
	pt = { page, st };
});

async function dotChung() {
	if (!dot) dot = await t.dotRanh(pt);
	await t.goHet(pt, dot.id);
	return dot;
}

/** Chèn cờ nhánh B vào response chi tiết phiếu trả (xem đầu file). `sua(draft)` tuỳ chọn: sửa bản nháp trả về. */
async function gaNhanhB(page, { sua } = {}) {
	await page.route(/\/stock\/v2\/stock-return-request\/\d+(\?|$)/, async (route) => {
		if (route.request().method() !== 'GET') return route.continue();
		const res = await route.fetch();
		const b = await res.json();
		if (b?.data?.request) b.data.request.returnInvoiceIssuer = 'VNPOST';
		return route.fulfill({ response: res, json: b });
	});
	if (sua) {
		await page.route(/return-credit-note\/issue-draft/, async (route) => {
			const res = await route.fetch();
			const b = await res.json();
			b.data = sua(b.data);
			return route.fulfill({ response: res, json: b });
		});
	}
	test.info().annotations.push({ type: 'giả lập', description: 'Chèn returnInvoiceIssuer=VNPOST vào GET chi tiết phiếu trả (BE không trả trường này). Bản nháp lấy thật từ /issue-draft.' });
}

const drPhatHanh = (page) => page.locator('.ant-drawer-open').filter({ hasText: 'Phát hành hoá đơn xuất trả hàng' }).last();

async function moPhatHanh(page) {
	const d = await dotChung();
	const { khoi } = await t.moKhoi(page, d, { coHd: undefined });
	await khoi.getByRole('button', { name: 'Phát hành hoá đơn' }).click();
	const dr = drPhatHanh(page);
	await expect(dr).toBeVisible({ timeout: 20_000 });
	await expect(dr.locator('.ant-skeleton')).toHaveCount(0, { timeout: 20_000 });
	return { d, khoi, dr };
}

test('14_3_010_002 — NCC do Bưu điện lập hoá đơn hiện nút khác hẳn', async () => {
	chanNeuTat('14_3_010_002');
	const d = await dotChung();
	const ct = await t.chiTietPhieu(pt.page, pt.st, d.phieu.id);
	const co = ct?.request && Object.prototype.hasOwnProperty.call(ct.request, 'returnInvoiceIssuer');
	ghi(`chi tiết phiếu ${d.phieu.code}: returnInvoiceIssuer ${co ? `= ${ct.request.returnInvoiceIssuer}` : 'KHÔNG CÓ trong response'}`);
	expect(co, '🔴 BE không trả returnInvoiceIssuer trong chi tiết phiếu trả ⇒ FE luôn hiện nhánh "NCC phát hành", nhánh VNPost lập không bao giờ hiện').toBe(true);
});

test('14_3_040_019 — Bên lập hoá đơn khai theo từng nhà cung cấp', async () => {
	chanNeuTat('14_3_040_019');
	const d = await dotChung();
	const ct = await t.chiTietPhieu(pt.page, pt.st, d.phieu.id);
	ghi(`returnInvoiceIssuer=${ct?.request?.returnInvoiceIssuer} (NCC ${ct?.request?.supplierName})`);
	expect(ct?.request?.returnInvoiceIssuer, '🔴 Chi tiết phiếu trả không mang bên lập hoá đơn của NCC ⇒ FE không phân nhánh theo hồ sơ NCC được').toBeTruthy();
});

test('14_3_040_001 — Màn phát hành mở với bản nháp tự tổng hợp', async ({ page }) => {
	chanNeuTat('14_3_040_001');
	await gaNhanhB(page);
	const { dr } = await moPhatHanh(page);
	await expect(dr.getByText('Hàng hoá tổng hợp từ phiếu xuất trả')).toBeVisible();
	await expect(dr.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible();
	for (const nhan of ['Tổng tiền trước thuế', 'Tổng tiền thuế GTGT']) await expect(dr.getByText(nhan)).toBeVisible();
	expect(daChanIssue).toEqual([]);
});

test('14_3_040_002 — Bảy trường thông tin đầu màn chỉ để đọc', async ({ page }) => {
	chanNeuTat('14_3_040_002');
	await gaNhanhB(page);
	const { dr } = await moPhatHanh(page);
	const BAY = ['Người bán', 'Người mua (NCC)', 'Địa chỉ người mua', 'Mẫu số / Ký hiệu', 'Hình thức thanh toán', 'Phiếu xuất trả kho', 'Phiếu xuất trả NCC'];
	const nhan = (await dr.locator('th.ant-descriptions-item-label').allInnerTexts()).map(t.chuan);
	ghi(nhan.join(' / '));
	for (const n of BAY) {
		expect(nhan).toContain(n);
		const o = t.oMoTa(dr, n);
		expect(await o.locator('input, textarea, .ant-select').count(), `Mục "${n}" sửa được`).toBe(0);
	}
});

test('14_3_040_003 — Bảng hàng hoá hiện đủ tám cột', async ({ page }) => {
	chanNeuTat('14_3_040_003');
	await gaNhanhB(page);
	const { dr } = await moPhatHanh(page);
	const cot = (await dr.locator('.ant-table thead th').allInnerTexts()).map(t.chuan);
	ghi(cot.join(' / '));
	// Kịch bản ghi "8 cột" nhưng liệt kê 9 tên — so theo danh sách tên.
	expect(cot).toEqual(['#', 'Mặt hàng', 'ĐVT', 'SL trả', 'Đơn giá gốc', 'Tiền trước thuế', 'Thuế suất', 'Tiền thuế', 'Tổng cộng']);
});

test('14_3_040_004 — Dòng diễn giải điền sẵn và sửa được', async ({ page }) => {
	chanNeuTat('14_3_040_004');
	await gaNhanhB(page);
	const { dr } = await moPhatHanh(page);
	const o = t.oMoTa(dr, 'Dòng diễn giải trên hoá đơn').locator('textarea');
	const san = await o.inputValue();
	ghi(`điền sẵn: "${san}"`);
	expect(await o.getAttribute('placeholder')).toBe('Điều chỉnh cho hoá đơn Mẫu số… ký hiệu… số… ngày…');
	expect(san.trim(), 'Ô diễn giải không điền sẵn nội dung').not.toBe('');
	await o.fill('AUTO TEST sửa diễn giải');
	await expect(o).toHaveValue('AUTO TEST sửa diễn giải');
});

test('14_3_040_006 — Chưa có phiếu xuất kho hoàn tất thì chỉ hiện cảnh báo', async ({ page }) => {
	chanNeuTat('14_3_040_006');
	// Mọi đợt trả đều sinh kèm phiếu xuất ⇒ giả lập BE trả bản nháp rỗng (data = null) để kiểm cách FE xử lý.
	await gaNhanhB(page, { sua: () => null });
	const { dr } = await moPhatHanh(page);
	await expect(dr.locator('.ant-alert-warning')).toContainText('Chưa tổng hợp được bản nháp hoá đơn');
	await expect(dr.locator('.ant-table')).toHaveCount(0);
	await expect(dr.getByRole('button', { name: 'Phát hành hoá đơn' })).toBeDisabled();
});

/** Bản nháp giả có 2 dòng chưa xác định thuế suất (nhân đôi dòng thật, xoá vatRate). */
const haiDongThieuThue = (x) => {
	const it = (x?.items || [])[0] || {};
	return { ...x, items: [0, 1].map((i) => ({ ...it, id: `${it.id || 'x'}-${i}`, lineNo: i + 1, vatRate: null, vatRateSource: null })) };
};

test('14_3_040_007 — Còn dòng thiếu thuế suất thì chặn phát hành', async ({ page }) => {
	chanNeuTat('14_3_040_007');
	await gaNhanhB(page, { sua: haiDongThieuThue });
	const { dr } = await moPhatHanh(page);
	const loi = dr.locator('.ant-alert-error');
	await expect(loi).toContainText('Còn 2 dòng chưa xác định được thuế suất');
	await expect(loi).toContainText('bảng giá NCC → hoá đơn gốc NCC → phiếu đặt hàng → phiếu nhập gốc');
	await expect(dr.getByRole('button', { name: 'Phát hành hoá đơn' })).toBeDisabled();
});

test('14_3_040_008 — Hệ thống KHÔNG tự mặc định thuế suất bằng không', async ({ page }) => {
	chanNeuTat('14_3_040_008');
	await gaNhanhB(page, { sua: haiDongThieuThue });
	const { dr } = await moPhatHanh(page);
	const cot = (await dr.locator('.ant-table thead th').allInnerTexts()).map(t.chuan);
	const i = cot.indexOf('Thuế suất');
	const o = t.chuan(await dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('td').nth(i).innerText());
	ghi(`Thuế suất dòng thiếu: "${o}"`);
	expect(o).not.toBe('0%');
	expect(o).toBe('Chưa xác định');
});

test('14_3_040_009 — Gọi API phát hành khi còn dòng thiếu thuế suất bị chặn', async () => {
	chanNeuTat('14_3_040_009');
	const d = await dotChung();
	const nhap = (await t.goi(pt, 'GET', `${t.CN}/issue-draft`, { batchId: d.id }))?.data;
	const thieu = (nhap?.items || []).filter((x) => x.vatRate == null).length;
	ghi(`bản nháp đợt #${d.id}: ${nhap?.items?.length} dòng, thiếu thuế ${thieu}`);
	// 🚫 Bản nháp ĐỦ thuế mà gọi /issue là phát hành thật ⇒ chỉ gọi khi chắc chắn thiếu thuế.
	test.skip(thieu === 0, `Mọi đợt trả của làn đều suy được thuế suất (${nhap?.items?.map((x) => `${x.vatRate}% ${x.vatRateSource}`).join(', ')}) — gọi /issue lúc này là PHÁT HÀNH THẬT. Cần SP không có thuế suất ở cả 4 nguồn.`);
	const b = await t.goi(pt, 'POST', `${t.CN}/issue`, { batchId: d.id }, {});
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(t.msg(b)).toBe('Không xác định được thuế suất của mặt hàng, vui lòng nhập tay');
});

test('14_3_040_013 — Phát hành cho đợt trả không tồn tại bị chặn', async () => {
	chanNeuTat('14_3_040_013');
	// An toàn: issue() tra đợt đầu tiên, không có đợt thì ném lỗi trước mọi bước khác.
	const b = await t.goi(pt, 'POST', `${t.CN}/issue`, { batchId: 999999999 }, {});
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(t.msg(b)).toBe('Không tìm thấy đợt trả');
});

test('14_3_040_014 — Lấy bản nháp khi phiếu xuất kho không có dòng hàng bị chặn', async () => {
	chanNeuTat('14_3_040_014');
	test.skip(true, 'Không dựng được tiền đề: phiếu xuất kho trả NCC luôn có ít nhất một dòng (đợt chỉ sinh khi trả SL > 0), không có chức năng gỡ dòng phiếu xuất đã hoàn tất.');
});

test('14_3_040_016 — Đóng hộp xác nhận phát hành không phát hành gì', async ({ page }) => {
	chanNeuTat('14_3_040_016');
	await gaNhanhB(page);
	const { khoi, dr } = await moPhatHanh(page);
	await dr.getByRole('button', { name: 'Phát hành hoá đơn' }).click();
	const hop = page.getByRole('dialog').filter({ hasText: 'Phát hành hoá đơn xuất trả hàng?' });
	await expect(hop).toBeVisible();
	await hop.getByRole('button', { name: 'Huỷ' }).click();
	await expect(hop).toBeHidden();
	await dr.locator('.ant-drawer-footer').getByRole('button', { name: 'Đóng' }).click();
	expect(await t.nhanKhoi(khoi)).toContain('Chưa phát hành');
	expect(daChanIssue).toEqual([]);
});

/** Quan sát 017/018: FE có chặn diễn giải rỗng không; nếu không, request /issue (đã bị chặn) mang `note` gì. */
async function quanSatDienGiai(page, giaTri) {
	await gaNhanhB(page);
	const { dr } = await moPhatHanh(page);
	const o = t.oMoTa(dr, 'Dòng diễn giải trên hoá đơn').locator('textarea');
	await o.fill(giaTri);
	const cho = page.waitForRequest((r) => /return-credit-note\/issue(\?|$)/.test(r.url()) && r.method() === 'POST', { timeout: 8_000 }).catch(() => null);
	await dr.getByRole('button', { name: 'Phát hành hoá đơn' }).click();
	const hop = page.getByRole('dialog').filter({ hasText: 'Phát hành hoá đơn xuất trả hàng?' });
	const coHop = await hop.isVisible({ timeout: 5_000 }).catch(() => false);
	if (coHop) await hop.getByRole('button', { name: 'Phát hành' }).click();
	const req = await cho;
	const note = req ? JSON.parse(req.postData() || '{}').note : undefined;
	const thongBao = (await page.locator('.ant-message-notice, .ant-form-item-explain-error').allInnerTexts()).map((x) => x.normalize('NFC').replace(/\s+/g, ' ').trim()).join(' | ');
	const kq = `FE ${coHop ? 'KHÔNG chặn — mở hộp xác nhận' : 'chặn (không mở hộp xác nhận)'}; request /issue (bị auto test chặn) ${req ? `gửi note=${JSON.stringify(note)}` : 'không gửi'}; thông báo "${thongBao}"`;
	ghi(kq);
	return { kq, coHop, daGui: Boolean(req), thongBao };
}

/** Kỳ vọng user chốt 28/09/2026 (A16): diễn giải bỏ trống / toàn dấu cách bị CHẶN, báo "Vui lòng nhập diễn giải". */
function kiemChanDienGiai(x) {
	expect(x.daGui, `🔴 Diễn giải rỗng vẫn gửi request phát hành (${x.kq})`).toBe(false);
	expect(x.coHop, `🔴 Diễn giải rỗng vẫn mở hộp xác nhận phát hành (${x.kq})`).toBe(false);
	expect(x.thongBao, 'Không báo "Vui lòng nhập diễn giải"').toContain('Vui lòng nhập diễn giải');
}

test('14_3_040_017 — Dòng diễn giải bỏ trống', async ({ page }) => {
	chanNeuTat('14_3_040_017');
	kiemChanDienGiai(await quanSatDienGiai(page, ''));
});

test('14_3_040_018 — Dòng diễn giải toàn khoảng trắng', async ({ page }) => {
	chanNeuTat('14_3_040_018');
	kiemChanDienGiai(await quanSatDienGiai(page, '     '));
});

test('14_3_040_005 — Phát hành hoá đơn thành công', async () => {
	chanNeuTat('14_3_040_005');
	test.skip(true, LY_DO_PHAT_HANH);
});

test('14_3_040_011 — Phát hành lên hệ thống HĐĐT thất bại', async () => {
	chanNeuTat('14_3_040_011');
	test.skip(true, LY_DO_PHAT_HANH);
});

test('14_3_040_012 — Phát hành lại sau khi thất bại không tạo hoá đơn trùng', async () => {
	chanNeuTat('14_3_040_012');
	test.skip(true, LY_DO_PHAT_HANH);
});

test('14_3_040_015 — Hoá đơn phát hành xong không thu hồi được', async () => {
	chanNeuTat('14_3_040_015');
	test.skip(true, LY_DO_PHAT_HANH);
});
