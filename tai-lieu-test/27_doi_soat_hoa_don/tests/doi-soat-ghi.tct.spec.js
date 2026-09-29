'use strict';

/**
 * 27 · Case GHI có dọn — vai `tct`, hoá đơn 52 của PO1000 `PO2609238817`.
 *
 * 🔴 Chọn PO1000 vì PO đã ở `DA_HACH_TOAN` và đủ điều kiện: mỗi lần đối soát lại (`recomputePo`) KHÔNG
 * tự hạch toán / ghi công nợ lại (`autoAccountIfMatched` chỉ chạy khi chưa hạch toán). Chọn PO chưa
 * hạch toán là sửa hoá đơn xong hệ thống tự ghi công nợ NCC — 🚫 không dọn được.
 *
 * Dọn: 050_001 trả snapshot ngay trong `finally`; test `DON` cuối file kiểm lại và trả lần nữa.
 * 🚫 Không `serial`, 🚫 không `afterAll`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const P = require('./reconcile-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const input = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i.data;
};
const NHAN_TT = { MATCHED: 'Khớp', MISMATCHED: 'Lệch', NOT_RECONCILED: 'Chưa đối soát' };
const cotDoiSoat = (page) => P.dong(page).first().locator('td').nth(10);

/** Trả hoá đơn về đúng snapshot (giữ ngày phát hành hiện tại). */
async function traSnapshot(page, d) {
	const ht = await P.apiGoi(page, 'GET', `/po-invoice-reconcile/invoices/${d.invoiceId}`);
	const r = await P.apiGoi(page, 'PUT', `/po-invoice-reconcile/invoices/${d.invoiceId}/edit`, {
		...d.snapshot,
		invoiceDate: ht.body?.data?.invoice?.invoiceDate,
	});
	expect(String(r.body?.status?.code), `Trả snapshot hoá đơn ${d.invoiceId} thất bại: ${r.body?._loi ?? ''}`).toBe('200');
	return r.body?.data;
}

test('27_050_001 — Sửa hoá đơn rồi cho đối chiếu lại', async ({ page }) => {
	const d = input('27_050_001');
	await P.moMan(page, VAI);
	await P.tim(page, d.poCode);
	await expect(cotDoiSoat(page)).toHaveText('Khớp');
	try {
		const { d: dr } = await P.moChiTiet(page);
		await dr.getByRole('button', { name: 'Chỉnh sửa' }).click();
		const sua = await P.drawer(page, 'Chỉnh sửa hoá đơn');
		const o = sua.locator('.ant-table-tbody tr.ant-table-row').first().locator('td').nth(3).locator('input');
		await o.fill(String(d.slMoi));
		await o.blur();
		const cho = page.waitForResponse((r) => r.url().includes(`/invoices/${d.invoiceId}/edit`) && r.request().method() === 'PUT');
		const choDs = page.waitForResponse((r) => r.url().includes('/po-invoice-reconcile/invoices?') && r.status() === 200);
		await sua.getByRole('button', { name: /Lưu thông tin & đối soát lại/ }).click();
		const res = await cho;
		expect(res.status()).toBe(200);
		expect(await P.docThongBao(page)).toBe('Đã lưu và đối soát lại hoá đơn');
		const ds = await (await choDs).json();
		const moi = (ds.data ?? []).find((r) => r.id === d.invoiceId);
		expect(moi?.reconcileStatus, 'Sửa SL lệch phiếu nhập mà kết quả vẫn Khớp').toBe('MISMATCHED');
		await sua.locator('.ant-drawer-footer').getByRole('button', { name: 'Đóng' }).click();
		await expect(cotDoiSoat(page), 'Cột Đối soát ở danh sách không cập nhật').toHaveText(NHAN_TT[moi.reconcileStatus]);
	} finally {
		const sau = await traSnapshot(page, d);
		expect(sau?.invoice?.reconcileStatus, 'Trả snapshot xong không về Khớp').toBe('MATCHED');
	}
});

test('27_050_003 — Đối chiếu lại mà không sửa gì', async ({ page }) => {
	const d = input('27_050_003');
	await P.moMan(page, VAI);
	await P.tim(page, d.poCode);
	const cho = page.waitForResponse((r) => r.url().includes(`/invoices/${d.invoiceId}/rerun`) && r.request().method() === 'POST');
	const choDs = page.waitForResponse((r) => r.url().includes('/po-invoice-reconcile/invoices?') && r.status() === 200);
	await P.nutLamMoi(page).click();
	const res = await cho;
	expect(res.status()).toBe(200);
	const kq = (await res.json())?.data?.invoice?.reconcileStatus;
	expect(kq, 'Rerun không trả kết quả đối soát').toBeTruthy();
	await choDs;
	await expect(cotDoiSoat(page), 'Cột Đối soát không theo kết quả chạy lại').toHaveText(NHAN_TT[kq]);
});

test('27_010_003 — Hoá đơn gốc thứ hai cho cùng phiếu hỏi thay thế', async ({ page }) => {
	const d = input('27_010_003');
	const daGoi = [];
	await page.route(/po-invoice-reconcile/, (route) => {
		const req = route.request();
		if (req.method() !== 'GET') daGoi.push(`${req.method()} ${req.url()}`);
		if (req.method() !== 'GET' && req.url().includes('confirm=true')) {
			return route.fulfill({ status: 403, contentType: 'application/json', body: '{"status":{"code":"403"}}' });
		}
		return route.continue();
	});
	await P.moMan(page, VAI);
	const truoc = await P.apiGoi(page, 'GET', `/po-invoice-reconcile/purchase-orders/${d.poId}`);
	const xml = P.xmlHoaDon({ poCode: d.poCode, so: '99991000', mst: d.mst });
	const res = await P.uploadXml(page, [{ name: 'AUTOTEST_goc_thu_hai.xml', mimeType: 'text/xml', buffer: Buffer.from(xml) }]);
	const kq = (await res.json())?.data ?? [];
	expect(kq[0]?.requireConfirm, `BE không hỏi xác nhận: ${JSON.stringify(kq[0])}`).toBe(true);
	const hoi = page.locator('.ant-modal-confirm');
	await expect(hoi.locator('.ant-modal-confirm-title')).toHaveText('Thay thế hoá đơn gốc đã có?');
	await expect(hoi.locator('.ant-modal-confirm-content')).toContainText(d.invoiceNo);
	await hoi.getByRole('button', { name: 'Huỷ' }).click();
	await expect(hoi).toHaveCount(0);
	expect(daGoi, 'Bấm Huỷ mà vẫn gửi upload lần hai').toHaveLength(1);
	const sau = await P.apiGoi(page, 'GET', `/po-invoice-reconcile/purchase-orders/${d.poId}`);
	const soHd = (x) => (x.body?.data?.invoices ?? []).map((i) => `${i.id}:${i.invoiceNo}`);
	expect(soHd(sau), 'Huỷ mà hoá đơn của PO thay đổi').toEqual(soHd(truoc));
});

test('27_DON — Dọn: hoá đơn 52 về đúng snapshot', async ({ page }) => {
	const d = loadCaseInput(GOC, '27_050_001').data;
	await P.moMan(page, VAI);
	const ht = (await P.apiGoi(page, 'GET', `/po-invoice-reconcile/invoices/${d.invoiceId}`)).body?.data;
	const lech =
		ht?.invoice?.invoiceNo !== d.snapshot.invoiceNo ||
		ht?.invoice?.reconcileStatus !== 'MATCHED' ||
		Number(ht?.invoice?.totalAmount) !== d.snapshot.totalAmount;
	test.info().annotations.push({ type: 'trạng thái trước dọn', description: `${ht?.invoice?.invoiceNo} · ${ht?.invoice?.reconcileStatus} · ${ht?.invoice?.totalAmount}` });
	if (lech) await traSnapshot(page, d);
	const sau = (await P.apiGoi(page, 'GET', `/po-invoice-reconcile/invoices/${d.invoiceId}`)).body?.data?.invoice;
	expect(sau?.invoiceNo).toBe(d.snapshot.invoiceNo);
	expect(sau?.reconcileStatus).toBe('MATCHED');
});
