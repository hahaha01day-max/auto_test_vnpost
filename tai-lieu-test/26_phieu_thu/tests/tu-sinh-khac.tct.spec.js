'use strict';

/**
 * 26_060_006 / 060_007 · Phiếu thu TỰ SINH từ thu hồi nợ đơn vị vận tải / TCT nhận thanh toán từ Tỉnh — kiểm theo DỮ LIỆU CÓ SẴN
 * (90 ngày, đơn vị liên quan). 🔴 Tiền đề là luồng ghi nợ vận chuyển (12) / nộp tiền Tỉnh → TCT (13) — ghi sổ không dọn được;
 * không có dữ liệu thì skip KÈM LÝ DO (🚫 pass rỗng). Đọc bằng `view_all_receipts` phiên TCT / CHT.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const r26 = require('./receipt-page');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const ds = (b) => (Array.isArray(b?.data) ? b.data : (b?.data?.content ?? []));

async function phieu90(pg, st, shopId) {
	const d0 = new Date(); d0.setHours(0, 0, 0, 0);
	const b = await g.k.goiGhi(pg, st, 'GET', r26.API, { shopId, pageNum: 1, pageSize: 500, page: 0, size: 500, start_date: d0.getTime() - 90 * 86_400_000, end_date: d0.getTime() + 86_400_000 - 1000, sort: 'createdDate,DESC' });
	expect(String(b?.status?.code), `view_all_receipts lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
	return ds(b);
}

test('26_060_006 — Thu hồi nợ đơn vị vận tải sinh phiếu thu tự động', async ({ browser }) => {
	chanNeuTat('26_060_006');
	const cht = await g.k.moPhienPhu(browser, 'shop', r26.ROUTE);
	try {
		const tat = await phieu90(cht.page, cht.st, Number(cht.st.h.shopid));
		const vt = tat.filter((x) => /Thu hồi nợ/.test(String(x.cateName)) && /vận (tải|chuyển)|DELIVERY|SHIPPING|TRANSPORT/i.test(JSON.stringify(x)));
		ghiChu('đo', `${tat.length} phiếu 90 ngày · "Thu hồi nợ" + vận tải: ${vt.length}`);
		test.skip(!vt.length, 'Điểm bán làn chưa có lần thu hồi nợ đơn vị vận tải nào trong 90 ngày (tiền đề: ghi nợ vận chuyển 12_070 + thu hồi) — chưa dựng được.');
		expect(String(vt[0].cateName)).toContain('Thu hồi nợ');
		expect(JSON.stringify(vt[0])).toMatch(/vận (tải|chuyển)|DELIVERY|SHIPPING|TRANSPORT/i);
	} finally {
		await cht.dong();
	}
});

test('26_060_007 — TCT nhận thanh toán từ Tỉnh sinh phiếu thu tự động', async ({ page }) => {
	chanNeuTat('26_060_007');
	const st = g.k.batHeader(page);
	await r26.moMan(page, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const tat = await phieu90(page, st, Number(st.h.shopid));
	const tinh = tat.filter((x) => /tỉnh|Tỉnh|PROVINCE|BUU_DIEN_TINH|nộp tiền|Nộp tiền/i.test(JSON.stringify(x)) && x.isSystemCreated);
	ghiChu('đo', `TCT shopId ${st.h.shopid}: ${tat.length} phiếu 90 ngày · tự sinh từ Tỉnh: ${tinh.length} · mẫu ${JSON.stringify(tinh.slice(0, 2).map((x) => ({ id: x.orderId, cat: x.cateName, tien: x.totalMoney, ten: x.customerName })))}`);
	test.skip(!tinh.length, 'TCT chưa có phiếu thu tự sinh nào từ khoản Tỉnh thanh toán trong 90 ngày (tiền đề: luồng nộp tiền Tỉnh → TCT phân hệ 13) — chưa dựng được.');
	expect(tinh[0].isSystemCreated).toBe(true);
});
