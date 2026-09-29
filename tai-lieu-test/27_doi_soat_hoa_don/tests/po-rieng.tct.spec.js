'use strict';

/**
 * 27_010_001 · 27_060_001 — upload hoá đơn XML vào PO RIÊNG của làn (seed bước 19 `po-rieng`), vai `tct`.
 *
 * 🔴 GHI THẬT, không dọn: hoá đơn khớp PO là hệ thống TỰ hạch toán + ghi công nợ NCC (`autoAccountIfMatched`). Chỉ làm trên PO
 *    riêng của làn — mỗi lần chạy TIÊU một PO (`00_seed/po-rieng.js` `layPoTrong`); hết PO ⇒ skip kèm lệnh bù seed.
 * Trace vnpost-web f9c5c858: `features/purchaseOrder/pages/InvoiceReconcilePage.jsx:203` (toast "Đã upload và đối soát XML"),
 * `InvoiceReconcileDetailPage.jsx:680-700,804-811` (dải cảnh báo `hasUnknownAdjustment` + Select "Chọn dấu điều chỉnh"
 * ▲ Tăng · ▼ Giảm · ● Không đổi khi `needsManualSign`).
 * BE `DefaultVietnamEInvoiceXmlReader.parseAdjustmentInfo`: HĐ điều chỉnh = `TTHDLQuan/TCHDon=2`; dấu UNKNOWN khi KHÔNG có
 * `TCDChinh`, không có ghi chú "tăng/giảm" và KHÔNG có `TgTTTBSo`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const seed = require('../../00_seed/seed-state');
const { layPoTrong, poCuaCase } = require('../../00_seed/po-rieng');
const P = require('./reconcile-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description).slice(0, 900) });
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const soHd = () => String(Date.now()).slice(-8);
const tenNcc = () => seed.doc().duLieu?.nhaCungCap?.tenNcc || 'AUTOTEST_NCC';

function layPo(maCase) {
	const po = layPoTrong(maCase);
	test.skip(!po, `Hết PO riêng trống của làn — chạy lại seed: VNPOST_LANE=${process.env.VNPOST_LANE || '<làn>'} node tool/bin/seed.js --api --buoc=19`);
	return po;
}

/** XML hoá đơn ĐIỀU CHỈNH (TCHDon=2) tham chiếu HĐ gốc, cố ý 🚫 TCDChinh / ghi chú dấu / TgTTTBSo ⇒ dấu UNKNOWN. */
function xmlDieuChinh({ poCode, so, goc, kyHieu = 'AUTOTEST', ncc }) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<HDon><DLHDon><TTChung><KHMSHDon>1</KHMSHDon><KHHDon>${kyHieu}</KHHDon><SHDon>${so}</SHDon>
<NLap>2026-09-28</NLap><HTTToan>Chuyển khoản</HTTToan>
<TTHDLQuan><TCHDon>2</TCHDon><LHDCLQuan>1</LHDCLQuan><KHMSHDCLQuan>1</KHMSHDCLQuan><KHHDCLQuan>${kyHieu}</KHHDCLQuan><SHDCLQuan>${goc}</SHDCLQuan><NLHDCLQuan>2026-09-28</NLHDCLQuan></TTHDLQuan>
<TTKhac><TTin><TTruong>POCode</TTruong><KDLieu>string</KDLieu><DLieu>${poCode}</DLieu></TTin></TTKhac></TTChung>
<NDHDon><NBan><Ten>${ncc}</Ten><MST>0000000000</MST></NBan><NMua><Ten>AUTOTEST</Ten></NMua>
<DSHHDVu><HHDVu><STT>1</STT><THHDVu>AUTOTEST_HANG</THHDVu><DVTinh>Cái</DVTinh><SLuong>1</SLuong>
<DGia>1000</DGia><ThTien>1000</ThTien><TSuat>0%</TSuat></HHDVu></DSHHDVu>
<TToan><TgTCThue>1000</TgTCThue><TgTThue>0</TgTThue></TToan></NDHDon></DLHDon></HDon>`;
}

/** Upload một tệp; tự bấm "Thay thế" nếu BE hỏi. Trả { tb, kq } — `kq` = data của response upload. */
async function upload(page, ten, xml) {
	// 🔴 Gom toast LIÊN TỤC từ trước khi bấm Upload: `P.docThongBao` bám `.ant-message-notice-content` và đọc ra rỗng
	//    (đo 28/09) dù FE gọi `message.success` — toast antd v6 tắt nhanh / khác lớp con.
	const gom = new Set();
	let dung = false;
	const quet = (async () => {
		while (!dung) {
			for (const t of await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])) if (P.chuan(t)) gom.add(P.chuan(t));
			await page.waitForTimeout(150);
		}
	})();
	const res = await P.uploadXml(page, [{ name: ten, mimeType: 'text/xml', buffer: Buffer.from(xml) }]);
	const b = await res.json().catch(() => ({}));
	await page.waitForTimeout(3_000);
	dung = true;
	await quet;
	const tb = [...gom].join(' | ');
	return { tb, kq: b?.data ?? [], status: b?.status };
}

test('27_010_001 — Tải hoá đơn XML lên và đối soát tự động', async ({ page }) => {
	chanNeuTat('27_010_001');
	test.setTimeout(240_000);
	const po = layPo('27_010_001');
	await P.moMan(page, VAI);
	const so = soHd();
	const u = await upload(page, `AUTOTEST_${po.ma}_${so}.xml`, P.xmlHoaDon({ poCode: po.ma, so, tenNcc: tenNcc(), tong: 1000 }));
	ghiChu('upload', `PO ${po.ma} · HĐ ${so} · ${JSON.stringify(u.status)} · "${u.tb}" · kq ${JSON.stringify(u.kq).slice(0, 400)}`);
	expect(u.tb).toBe('Đã upload và đối soát XML');
	// Mỗi hoá đơn một dòng ở thẻ "Theo hoá đơn", kèm mã phiếu đặt hàng tự tìm được + cột Đối soát ∈ Khớp/Lệch/Chưa đối soát.
	const ds = await P.tim(page, so);
	const d = P.dong(page).filter({ hasText: so });
	await expect(d, `Không có dòng hoá đơn ${so} ở thẻ Theo hoá đơn`).toHaveCount(1, { timeout: 20_000 });
	const hang = (await d.locator('td').allInnerTexts()).map(P.chuan);
	ghiChu('dòng', `${JSON.stringify(hang)} · API ${JSON.stringify((ds || []).find((x) => String(x.invoiceNo) === so) || {}).slice(0, 300)}`);
	expect(hang.join(' | '), 'Dòng hoá đơn không mang mã PO tự tìm được').toContain(po.ma);
	const cot = (await P.khung(page).locator('.ant-table-thead tr').last().locator('th').allInnerTexts()).map(P.chuan);
	expect(['Khớp', 'Lệch', 'Chưa đối soát']).toContain(hang[cot.indexOf('Đối soát')]);
});

test('27_060_001 — Cảnh báo khi còn hoá đơn điều chỉnh chưa rõ dấu', async ({ page }) => {
	chanNeuTat('27_060_001');
	test.setTimeout(300_000);
	// Chạy lại ⇒ dùng lại đúng PO của case (🚫 tiêu thêm PO): HĐ gốc đã có thì 🚫 upload lại (BE hỏi thay thế).
	const po = poCuaCase('27_060_001') || layPo('27_060_001');
	await P.moMan(page, VAI);
	// 🔴 `GET …/purchase-orders/{id seed}` trả `invoices: []` dù PO đã có HĐ gốc (đo 28/09) ⇒ tra ở danh sách Theo hoá đơn.
	const hienCo = ((await P.tim(page, po.ma)) || []).filter((x) => x.poCode === po.ma);
	ghiChu('HĐ có sẵn của PO', JSON.stringify(hienCo.map((x) => ({ so: x.invoiceNo, loai: x.invoiceType, id: x.id }))));
	let goc = hienCo.find((x) => !x.invoiceType || x.invoiceType === 'GOC')?.invoiceNo;
	let u1 = { tb: '(dùng HĐ gốc có sẵn)' };
	if (!goc) {
		// Tiền đề: HĐ gốc của PO, rồi HĐ điều chỉnh tham chiếu HĐ gốc mà KHÔNG xác định được dấu.
		goc = soHd();
		u1 = await upload(page, `AUTOTEST_${po.ma}_${goc}.xml`, P.xmlHoaDon({ poCode: po.ma, so: goc, tenNcc: tenNcc(), tong: 1000 }));
		ghiChu('upload gốc', `${JSON.stringify(u1.status)} · "${u1.tb}" · ${JSON.stringify(u1.kq).slice(0, 300)}`);
		expect(u1.tb, `Upload HĐ gốc lỗi: ${JSON.stringify(u1.status)}`).toBe('Đã upload và đối soát XML');
		await page.waitForTimeout(1_500);
	}
	const dc = soHd();
	const u2 = await upload(page, `AUTOTEST_${po.ma}_${dc}_DC.xml`, xmlDieuChinh({ poCode: po.ma, so: dc, goc, ncc: tenNcc() }));
	ghiChu('upload', `PO ${po.ma} · gốc ${goc} "${u1.tb}" · điều chỉnh ${dc} ${JSON.stringify(u2.status)} "${u2.tb}" · kq ${JSON.stringify(u2.kq).slice(0, 300)}`);
	expect(u2.tb, `Upload HĐ điều chỉnh lỗi: ${JSON.stringify(u2.status)}`).toBe('Đã upload và đối soát XML');
	// B1–2: thẻ "Theo phiếu PO" → "Xem".
	await P.moThe(page, 'Theo phiếu PO');
	// 🔴 Ô tìm đã mang sẵn mã PO (tra HĐ gốc ở trên) ⇒ gõ lại cùng giá trị KHÔNG sinh request, `P.tim` treo 60s.
	if (P.chuan(await P.oTim(page).inputValue()) !== po.ma) await P.tim(page, po.ma);
	// 🔴 Bảng của thẻ "Theo hoá đơn" (đang ẩn) cũng có dòng mang mã PO ⇒ bám thẻ ĐANG MỞ.
	const d = P.khung(page).locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').filter({ hasText: po.ma }).first();
	await expect(d, `Thẻ Theo phiếu PO không có ${po.ma}`).toBeVisible({ timeout: 20_000 });
	const nghe = [];
	page.on('response', (r) => { if (/po-invoice-reconcile/.test(r.url())) nghe.push(`${r.status()} ${r.url().split('__api')[1] ?? r.url()}`); });
	const cho = page.waitForResponse((r) => /\/po-invoice-reconcile\/purchase-orders\/\d+/.test(r.url()), { timeout: 30_000 }).catch(() => null);
	await d.getByRole('button', { name: 'Xem', exact: true }).click();
	await expect(page).toHaveURL(/invoice-reconcile\/detail/, { timeout: 20_000 });
	const rct = await cho;
	await page.waitForTimeout(3_000);
	ghiChu('API màn chi tiết', `${page.url()} · ${nghe.join(' ; ')}`);
	const ct = rct ? await rct.json().catch(() => ({})) : {};
	await expect(page.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 20_000 });
	// B3: đầu thẻ "Đối soát công nợ (PO)".
	const pane = await P.moTheChiTiet(page, 'Đối soát công nợ (PO)');
	const canh = pane.locator('.ant-alert-warning').filter({ hasText: 'Có hoá đơn điều chỉnh chưa xác định được dấu tăng/giảm' });
	ghiChu('PO', `hasUnknownAdjustment=${ct?.data?.hasUnknownAdjustment} · HĐ ${JSON.stringify((ct?.data?.invoices || []).map((x) => ({ so: x.invoiceNo, loai: x.invoiceType, dau: x.adjustmentType, can: x.needsManualSign })))}`);
	await expect(canh, 'Không có dải cảnh báo vàng về hoá đơn điều chỉnh chưa rõ dấu').toBeVisible({ timeout: 15_000 });
	// Dòng HĐ điều chỉnh có ô chọn Tính chất / Dấu với ba lựa chọn.
	const o = pane.locator('.ant-select').filter({ hasText: 'Chọn dấu điều chỉnh' }).first();
	await expect(o, `HĐ điều chỉnh ${dc} không có ô chọn dấu`).toBeVisible();
	await o.click();
	const lc = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(P.chuan);
	await page.keyboard.press('Escape');
	ghiChu('lựa chọn', JSON.stringify(lc));
	expect(lc.map((x) => x.replace(/^[▲▼●]\s*/, ''))).toEqual(['Tăng', 'Giảm', 'Không đổi']);
});

/** XML HĐ gốc KHỚP đúng dòng PO seed (SP giá tiêu chuẩn × SL × giá nhập, VAT 0) — để PO đạt "Khớp — đủ điều kiện". */
function xmlKhop({ poCode, so, ncc, ten, sl, gia }) {
	const tong = sl * gia;
	return `<?xml version="1.0" encoding="UTF-8"?>
<HDon><DLHDon><TTChung><KHMSHDon>1</KHMSHDon><KHHDon>AUTOTEST</KHHDon><SHDon>${so}</SHDon>
<NLap>2026-09-28</NLap><HTTToan>Chuyển khoản</HTTToan>
<TTKhac><TTin><TTruong>POCode</TTruong><KDLieu>string</KDLieu><DLieu>${poCode}</DLieu></TTin></TTKhac></TTChung>
<NDHDon><NBan><Ten>${ncc}</Ten><MST>0000000000</MST></NBan><NMua><Ten>AUTOTEST</Ten></NMua>
<DSHHDVu><HHDVu><TChat>1</TChat><STT>1</STT><THHDVu>${ten}</THHDVu><DVTinh>Cái</DVTinh><SLuong>${sl}</SLuong>
<DGia>${gia}</DGia><ThTien>${tong}</ThTien><TSuat>0%</TSuat></HHDVu></DSHHDVu>
<TToan><TgTCThue>${tong}</TgTCThue><TgTThue>0</TgTThue><TgTTTBSo>${tong}</TgTTTBSo></TToan></NDHDon></DLHDon></HDon>`;
}

/** Từ thẻ Theo hoá đơn: bấm "Đối soát" của dòng HĐ `so` ⇒ màn đối soát chi tiết; trả body chi tiết PO. */
async function moDoiSoatCuaHd(page, so) {
	if (P.chuan(await P.oTim(page).inputValue()) !== so) await P.tim(page, so);
	const d = P.khung(page).locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').filter({ hasText: so }).first();
	await expect(d, `Không có dòng HĐ ${so}`).toBeVisible({ timeout: 20_000 });
	const cho = page.waitForResponse((r) => /\/po-invoice-reconcile\/purchase-orders\/\d+/.test(r.url()), { timeout: 30_000 }).catch(() => null);
	await d.getByRole('button', { name: 'Đối soát', exact: true }).click();
	await expect(page).toHaveURL(/invoice-reconcile\/detail/, { timeout: 20_000 });
	const r = await cho;
	await expect(page.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 20_000 });
	return r ? (await r.json().catch(() => ({})))?.data : null;
}

test('27_040_004 — Gỡ hoá đơn khỏi đối soát của phiếu', async ({ page }) => {
	chanNeuTat('27_040_004');
	test.setTimeout(300_000);
	const po = layPo('27_040_004');
	await P.moMan(page, VAI);
	const so = soHd();
	const u = await upload(page, `AUTOTEST_${po.ma}_${so}.xml`, P.xmlHoaDon({ poCode: po.ma, so, tenNcc: tenNcc(), tong: 1000 }));
	expect(u.tb, `Tiền đề: upload HĐ lỗi ${JSON.stringify(u.status)}`).toBe('Đã upload và đối soát XML');
	const truoc = await moDoiSoatCuaHd(page, so);
	ghiChu('trước', JSON.stringify((truoc?.invoices || []).map((x) => x.invoiceNo)));
	expect((truoc?.invoices || []).map((x) => String(x.invoiceNo)), 'Tiền đề: PO chưa gắn HĐ vừa upload').toContain(so);
	// B1: "Xoá XML" góc trên bảng "Kết quả đối soát XML" · B2: "Xoá".
	await page.getByRole('button', { name: /Xoá XML/ }).click();
	const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Xoá hoá đơn XML đối soát?' });
	await expect(hop).toBeVisible({ timeout: 10_000 });
	const cho = page.waitForResponse((r) => /po-invoice-reconcile/.test(r.url()) && r.request().method() === 'DELETE', { timeout: 30_000 }).catch(() => null);
	await hop.getByRole('button', { name: 'Xoá', exact: true }).click();
	const r = await cho;
	await page.locator('.ant-message-notice').first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => null);
	const tb = P.chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
	const sau = ((await P.apiGoi(page, 'GET', `/po-invoice-reconcile/invoices?page=0&size=20&keyword=${so}`)).body?.data || []).filter((x) => String(x.invoiceNo) === so);
	ghiChu('xoá', `${r ? `${r.request().method()} ${r.url().split('__api')[1] ?? r.url()} → ${r.status()}` : '(không có DELETE)'} · "${tb}" · HĐ ${so} còn trong danh sách ${sau.length}`);
	expect(tb).toContain('Đã xoá hoá đơn XML');
	expect(sau, 'Xoá XML xong hoá đơn vẫn còn ở danh sách đối soát').toHaveLength(0);
});

test('27_060_003 — Xác nhận hạch toán công nợ mở đường cho thanh toán', async ({ page }) => {
	chanNeuTat('27_060_003');
	test.setTimeout(300_000);
	const po = layPo('27_060_003');
	const d = seed.doc().duLieu;
	const ten = d.sanPham.sanPhamTheoGiaVon.tieuChuan.tenSanPham;
	const gia = Number(d.sanPhamNcc.giaNhapTheoSku?.[d.sanPham.sanPhamTheoGiaVon.tieuChuan.sku] ?? d.sanPhamNcc.giaNhap);
	await P.moMan(page, VAI);
	const so = soHd();
	// Tiền đề: HĐ khớp đúng từng mặt hàng của phiếu nhập.
	const u = await upload(page, `AUTOTEST_${po.ma}_${so}_KHOP.xml`, xmlKhop({ poCode: po.ma, so, ncc: tenNcc(), ten, sl: po.sl, gia }));
	ghiChu('upload', `PO ${po.ma} · ${ten} × ${po.sl} × ${gia} · ${JSON.stringify(u.status)} · "${u.tb}" · ${JSON.stringify(u.kq).slice(0, 300)}`);
	expect(u.tb, `Tiền đề: upload HĐ lỗi ${JSON.stringify(u.status)}`).toBe('Đã upload và đối soát XML');
	const ct = await moDoiSoatCuaHd(page, so);
	const pane = await P.moTheChiTiet(page, 'Đối soát công nợ (PO)');
	const nut = pane.getByRole('button', { name: /hạch toán công nợ/ }).first();
	const trangThai = await P.giaTriMoTa(pane, 'Trạng thái hạch toán');
	const duDk = await P.giaTriMoTa(pane, 'Đủ điều kiện');
	ghiChu('trước bấm', `eligible=${ct?.eligible} · accountingStatus=${ct?.accountingStatus} · "${trangThai}" · "${duDk}" · nút "${P.chuan(await nut.innerText())}" enabled=${await nut.isEnabled()}`);
	expect(ct?.eligible, `Tiền đề: HĐ khớp từng mặt hàng mà PO không đủ điều kiện (${duDk})`).toBe(true);
	// Kỳ vọng user chốt 28/09/2026 (B19): HĐ khớp ⇒ hệ thống TỰ ĐỘNG hạch toán ngay khi upload (autoAccountIfMatched) — 🚫 còn bước bấm tay.
	const tuDong = await pane.getByText(/Tự động hạch toán/).count();
	ghiChu('tự hạch toán', `ghi chú "Tự động hạch toán…" trên màn: ${tuDong}`);
	expect(trangThai, `Upload HĐ khớp mà KHÔNG tự hạch toán (trạng thái "${trangThai}", ${ct?.accountingStatus})`).toContain('Đã hạch toán công nợ');
	await expect(nut, 'Đã tự hạch toán mà nút tay vẫn không đổi nhãn').toHaveText('Đã hạch toán công nợ');
	await expect(nut, 'Đã tự hạch toán mà nút tay vẫn bấm được').toBeDisabled();
});
