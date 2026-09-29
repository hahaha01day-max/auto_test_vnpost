'use strict';

/**
 * 27_070_005 · Tải lên TRÙNG file XML đã đối soát — vai `tct`, hoá đơn 52 (PO1000 `PO2609238817`, đã hạch toán).
 * XML dựng ĐÚNG snapshot hoá đơn 52 (`test-input.json` 27_050_001: ký hiệu C26PO, số 00001000, MST, dòng hàng, thuế 8%).
 * 🔴 An toàn dữ liệu: nếu BE hỏi "Thay thế hoá đơn gốc đã có?" ⇒ bấm HUỶ (thay thế có thể đổi id hoá đơn 52 mà
 *    các case 050_* bám theo) và kiểm KHÔNG nhân đôi bản ghi; nếu BE tự đối soát lại ⇒ kiểm số hoá đơn của PO giữ nguyên + Khớp.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const P = require('./reconcile-page');

const GOC = path.join(__dirname, '..');

function xmlTheoSnapshot(poCode, s) {
	const it = s.items[0];
	return `<?xml version="1.0" encoding="UTF-8"?>
<HDon><DLHDon><TTChung><KHMSHDon>1</KHMSHDon><KHHDon>${s.invoiceSerial}</KHHDon><SHDon>${s.invoiceNo}</SHDon>
<NLap>2026-09-23</NLap><HTTToan>${s.paymentMethod}</HTTToan>
<TTKhac><TTin><TTruong>POCode</TTruong><KDLieu>string</KDLieu><DLieu>${poCode}</DLieu></TTin></TTKhac></TTChung>
<NDHDon><NBan><Ten>${s.sellerName}</Ten><MST>${s.sellerTaxCode}</MST></NBan><NMua><Ten>${s.buyerName}</Ten></NMua>
<DSHHDVu><HHDVu><STT>1</STT><THHDVu>${it.productName}</THHDVu><DVTinh>${it.unitName}</DVTinh><SLuong>${it.quantity}</SLuong>
<DGia>${it.unitPrice}</DGia><ThTien>${it.amountBeforeTax}</ThTien><TSuat>${it.vatRate}%</TSuat></HHDVu></DSHHDVu>
<TToan><TgTCThue>${s.totalBeforeTax}</TgTCThue><TgTThue>${s.totalTax}</TgTThue><TgTTTBSo>${s.totalAmount}</TgTTTBSo></TToan></NDHDon></DLHDon></HDon>`;
}

test('27_070_005 — Tải lên trùng file XML đã đối soát', async ({ page }) => {
	const i = loadCaseInput(GOC, '27_070_005');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	const d = loadCaseInput(GOC, '27_050_001').data;
	await P.moMan(page, 'tct');
	const soHd = (x) => (x.body?.data?.invoices ?? []).map((v) => `${v.id}:${v.invoiceSerial ?? ''}${v.invoiceNo}`).sort();
	const trangThai = async () => (await P.apiGoi(page, 'GET', `/po-invoice-reconcile/invoices/${d.invoiceId}`)).body?.data?.invoice?.reconcileStatus;
	const tep = [{ name: `AUTOTEST_tai_lai_${d.invoiceNo}.xml`, mimeType: 'text/xml', buffer: Buffer.from(xmlTheoSnapshot(d.poCode, d.snapshot)) }];
	/** Tải một lượt; BE hỏi thay thế ⇒ ĐỒNG Ý (đây là file của chính lượt 1). Trả { hoi, tb }. */
	const taiLen = async () => {
		const res = await P.uploadXml(page, tep);
		const kq = (await res.json())?.data ?? [];
		const hoi = page.locator('.ant-modal-confirm');
		const coHoi = await hoi.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false);
		let chu = '';
		if (coHoi) {
			chu = P.chuan(await hoi.innerText());
			const cho = page.waitForResponse((r) => r.url().includes('/po-invoice-reconcile/upload') && r.url().includes('confirm=true'), { timeout: 30_000 }).catch(() => null);
			await hoi.getByRole('button', { name: /Thay thế|Đồng ý|OK|Xác nhận/ }).first().click();
			await cho;
		}
		const tb = await P.docThongBao(page, 10_000).catch(() => '');
		return { hoi: chu, tb, kq: kq[0] ?? {} };
	};
	try {
		const goc = await P.apiGoi(page, 'GET', `/po-invoice-reconcile/purchase-orders/${d.poId}`);
		const l1 = await taiLen();
		const s1 = await trangThai();
		const sau1 = await P.apiGoi(page, 'GET', `/po-invoice-reconcile/purchase-orders/${d.poId}`);
		await page.waitForTimeout(1_500);
		const l2 = await taiLen();
		const s2 = await trangThai();
		const sau2 = await P.apiGoi(page, 'GET', `/po-invoice-reconcile/purchase-orders/${d.poId}`);
		test.info().annotations.push({ type: 'lượt 1 (file đã đối soát)', description: `${JSON.stringify({ ...l1, kq: undefined, file: l1.kq.fileId, inv: l1.kq.invoiceId, rs: l1.kq.reconcileStatus })} · trạng thái ${s1} · hoá đơn ${soHd(goc).join(',')} → ${soHd(sau1).join(',')}` });
		test.info().annotations.push({ type: 'lượt 2 (tải lại đúng file)', description: `${JSON.stringify({ ...l2, kq: undefined, file: l2.kq.fileId, inv: l2.kq.invoiceId, rs: l2.kq.reconcileStatus })} · trạng thái ${s2} · hoá đơn ${soHd(sau2).join(',')}` });
		expect(soHd(sau2).length, 'Tải lại trùng file mà PO có thêm hoá đơn (nhân đôi bản ghi)').toBe(soHd(sau1).length);
		expect(s2, 'Tải lại đúng file đã đối soát mà kết quả đối soát khác lần trước').toBe(s1);
		// Kết quả đối soát trả ngay trong response upload (toast tắt trước khi kịp đọc).
		expect(['MATCHED', 'MISMATCHED'], 'Tải lại mà response không có kết quả đối soát').toContain(l2.kq.reconcileStatus);
		expect(l2.kq.invoiceId, 'Tải lại gắn vào hoá đơn KHÁC (nhân đôi)').toBe(d.invoiceId);
		const tep2 = (await P.tim(page, `AUTOTEST_tai_lai_${d.invoiceNo}`)).filter((r) => (r.filename ?? '').includes(`AUTOTEST_tai_lai_${d.invoiceNo}`));
		test.info().annotations.push({ type: 'bản ghi FILE cùng tên', description: `${tep2.length} (mỗi lượt tải lưu thêm 1 file; hoá đơn không nhân đôi)` });
	} finally {
		// Trả hoá đơn 52 về snapshot (như 27_DON).
		const ht = await P.apiGoi(page, 'GET', `/po-invoice-reconcile/invoices/${d.invoiceId}`);
		const r = await P.apiGoi(page, 'PUT', `/po-invoice-reconcile/invoices/${d.invoiceId}/edit`, { ...d.snapshot, invoiceDate: ht.body?.data?.invoice?.invoiceDate });
		test.info().annotations.push({ type: 'trả snapshot', description: `${JSON.stringify(r.body?.status)} · ${await trangThai()}` });
	}
});
