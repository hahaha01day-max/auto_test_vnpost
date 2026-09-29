'use strict';

/**
 * Phân hệ 16 · 040 Hoá đơn NCC của kỳ · 050 Ghi nợ chính thức — vai `tct` (làn 7).
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/consignmentInvoice/pages/ConsignmentInvoiceTab.jsx`,
 * `services/consignmentInvoiceApi.js`, `utils/sampleInvoiceXml.js` (khuôn XML — `xmlKy` bám đúng `buildXml`),
 * `features/consignmentRecon/pages/ConsignmentReconDetailPage.jsx` (thẻ "Hoá đơn NCC", `?tab=invoice`).
 * 🔴 Vai `tct`: 36/36 kỳ thuộc TCT. Đo 25/09/2026: kỳ LOCKED 76 (NCC 96) + 1 (NCC 90) chưa có hoá đơn · kỳ INVOICED 2 có 1 hoá đơn KHỚP.
 *
 * 🔴 AN TOÀN:
 *   - Hoá đơn nạp thử vào kỳ LOCKED đều XOÁ lại trong `finally` (xoá được khi kỳ chưa ghi nợ).
 *   - Mọi test giao diện CHẶN `POST .../post-debt` và `post-internal-debt` (ghi nợ chính thức KHÔNG hoàn tác).
 *   - API `post-debt` chỉ gọi khi tiền đề đã kiểm bằng API là BE CHẮC CHẮN chặn (kỳ OPEN / chưa hoá đơn / hoá đơn LỆCH /
 *     id không tồn tại / kỳ đã INVOICED). Ghi nợ thành công (050_013/015/017) + nhóm 070: chờ user cho phép.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const { BASE_URL } = require('../../shared/vnpost-config');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const ROUTE = '/debt-reconciliation/consignment-recon';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const msg = (b) => chuan(b?.status?.message).replace(/\s*\([A-Za-z0-9]{6}\)$/, '');
const LY_DO_GHI_NO = 'Ghi nợ chính thức ghi sổ công nợ NCC + bút toán trên kỳ THẬT của chuỗi (NCC ký gửi dùng chung, không phải dữ liệu làn) và KHÔNG hoàn tác — chờ user cho phép rõ (bàn giao 24/09: nhóm 050 ghi nợ là một chiều).';

// ───────── XML (bám `buildXml` của sampleInvoiceXml.js) ─────────
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let dem = 0;
const soMoi = () => `7${Date.now().toString().slice(-6)}${dem++ % 10}`;
const homNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
function xmlKy({ total, no = soMoi(), related, adjustment, note, taxCode = '0100686209', serial = 'C26A7T' } = {}) {
	const truoc = Math.round(total / 1.08);
	const lq = related
		? `<TTHDLQuan><TCHDon>${related === 'THAY_THE' ? '1' : '2'}</TCHDon><KHMSHDCLQuan>1</KHMSHDCLQuan><KHHDCLQuan>${esc(serial)}</KHHDCLQuan><SHDCLQuan>00000001</SHDCLQuan><NLHDCLQuan>${homNay()}</NLHDCLQuan>${adjustment ? `<TCDChinh>${adjustment}</TCDChinh>` : ''}</TTHDLQuan>`
		: '';
	const gc = note ? `<TTKhac><TTin><TTruong>ProcessInvNote</TTruong><DLieu>${esc(note)}</DLieu></TTin></TTKhac>` : '';
	return `<?xml version="1.0" encoding="UTF-8"?>
<!-- AUTO TEST 16 lan 7 - du lieu thu nghiem -->
<HDon><DLHDon><TTChung><KHMSHDon>1</KHMSHDon><KHHDon>${esc(serial)}</KHHDon><SHDon>${esc(no)}</SHDon><NLap>${homNay()}</NLap><HTTToan>TM/CK</HTTToan></TTChung>${lq}
<NDHDon><NBan><Ten>Nha cung cap hang ky gui (AUTO TEST)</Ten><MST>${esc(taxCode)}</MST></NBan><NMua><Ten>Tong cong ty Buu dien Viet Nam</Ten><MST>0100686209</MST></NMua>
<HHDVu><STT>1</STT><THHDVu>Hang ky gui (auto test)</THHDVu><DVTinh>Hop</DVTinh><SLuong>1</SLuong><DGia>${total}</DGia><ThTien>${truoc}</ThTien><TSuat>8%</TSuat></HHDVu>
<TToan><TgTCThue>${truoc}</TgTCThue><TgTThue>${total - truoc}</TgTThue><TgTTTBSo>${total}</TgTTTBSo></TToan></NDHDon>${gc}</DLHDon></HDon>`;
}

// ───────── Phiên + API ─────────
let pt = null;
test.describe.configure({ timeout: 240_000 });

/** Mở chi tiết kỳ `id` ở thẻ `tab` (hoặc danh sách nếu không có id). Chặn post-debt TRƯỚC khi mở. */
async function mo(page, id, tab = 'invoice') {
	const daGoi = [];
	await page.route(/\/consignment-recon\/periods\/\d+\/post-(internal-)?debt/, async (route) => {
		daGoi.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
		await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	const st = k.batHeader(page);
	await moTrang(page, id ? `${ROUTE}/${id}?tab=${tab}` : ROUTE, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	pt = { page, st };
	if (id) await expect(khung(page).locator('.ant-tabs-tab-active')).toContainText(tab === 'invoice' ? 'Hoá đơn NCC' : '', { timeout: 30_000 });
	return daGoi;
}
const g = (u, x = {}) => k.goiGhi(pt.page, pt.st, 'GET', u, x);
const goiGhi = (m, u, x = {}, d) => k.goiGhi(pt.page, pt.st, m, u, x, d);
const hoaDon = async (id) => (await g('/consignment-invoices', { periodId: id })).data || [];
const kyTheo = async (dk) => ((await g('/consignment-recon/periods', { page: 0, size: 500 })).data || []).find(dk);

async function napApi(periodId, xml, ten = 'hoa-don.xml') {
	const h = { ...pt.st.h };
	delete h['content-type'];
	const r = await pt.page.request.fetch(`${BASE_URL}/__api/consignment-invoices/upload`, {
		method: 'POST', headers: h, params: { periodId }, multipart: { files: { name: ten, mimeType: 'text/xml', buffer: Buffer.from(xml) } },
	});
	return r.json().catch(async () => ({ status: { code: `HTTP ${r.status()}`, message: (await r.text()).slice(0, 200) } }));
}
/** Xoá hoá đơn do test nạp (id không có trong `giu`). */
async function donHd(periodId, giu = []) {
	for (const i of await hoaDon(periodId).catch(() => [])) if (!giu.includes(i.id)) await goiGhi('DELETE', `/consignment-invoices/${i.id}`);
}

/**
 * Kỳ LOCKED chưa có hoá đơn nào (dùng để nạp thử). `duong`: ưu tiên kỳ có tổng biên bản DƯƠNG — đo 25/09 kỳ 76 có biên bản
 * ÂM (-113.791.878đ: giảm trừ > phát sinh), muốn "khớp" phải nạp hoá đơn gốc tổng âm.
 */
async function kyChot({ duong = false } = {}) {
	const ds = ((await g('/consignment-recon/periods', { page: 0, size: 500 })).data || []).filter((p) => p.status === 'LOCKED');
	const trong = [];
	for (const p of ds) if (!(await hoaDon(p.id)).length) trong.push(p);
	test.skip(!trong.length, `Không còn kỳ LOCKED nào chưa có hoá đơn (${ds.map((p) => p.id).join(', ')}) — không nạp thử được.`);
	if (!duong) return trong[0];
	for (const p of trong) {
		p.bb = await tongBienBan(p.id);
		if (p.bb > 0) return p;
	}
	return trong[0];
}
const kyGhiNo = () => kyTheo((p) => p.status === 'INVOICED');
const kyMo = () => kyTheo((p) => p.status === 'OPEN');

/** Tổng biên bản của kỳ: nạp hoá đơn 1đ, đọc ghi chú kiểm tổng "biên bản N", rồi xoá. */
async function tongBienBan(periodId) {
	const b = await napApi(periodId, xmlKy({ total: 1 }));
	const hd = await hoaDon(periodId);
	const note = hd[0]?.totalCheckNote || '';
	await donHd(periodId);
	const m = note.match(/biên bản\s*(-?[\d.,]+)/i);
	ghi(`dò biên bản kỳ ${periodId}: nạp ${b?.status?.code} · "${note.slice(0, 160)}"`);
	expect(m, `Không đọc được tổng biên bản từ ghi chú kiểm tổng: "${note}"`).toBeTruthy();
	return Math.round(Number(m[1].replace(/,/g, '')));
}

const alertKq = (page) => khung(page).locator('.ant-tabs-tabpane-active .ant-alert').first();
const bangHd = (page) => khung(page).locator('.ant-tabs-tabpane-active .ant-table').first();
async function napUi(page, files) {
	const cho = page.waitForResponse((r) => r.url().includes('/consignment-invoices/upload'), { timeout: 30_000 }).catch(() => null);
	await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
	await khung(page).locator('.ant-tabs-tabpane-active input[type=file]').setInputFiles(files);
	const res = await cho;
	await page.locator('.ant-message-notice').first().waitFor({ timeout: 8_000 }).catch(() => {});
	return { tb: chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | ')), body: res ? await res.json().catch(() => null) : null };
}
const f = (xml, ten = 'hd.xml') => ({ name: ten, mimeType: 'text/xml', buffer: Buffer.from(xml) });

// ───────── 040 ─────────

test('16_040_001 — Kỳ chưa chốt thì thẻ hoá đơn chỉ hiện ô nhắc', async ({ page }) => {
	chanNeuTat('16_040_001');
	await mo(page);
	const ky = await kyMo();
	await mo(page, ky.id);
	const a = alertKq(page);
	await expect(a).toContainText('Kỳ chưa chốt');
	await expect(a).toContainText('Nhà cung cấp chỉ xuất hoá đơn sau khi ba bên (Bưu điện tỉnh · Tổng công ty · Nhà cung cấp) đối soát xong. Hãy chốt kỳ trước, rồi tải hoá đơn vào đây.');
	await expect(khung(page).locator('.ant-tabs-tabpane-active .ant-upload-drag')).toHaveCount(0);
});

test('16_040_002 — Gọi API tải hoá đơn cho kỳ chưa chốt bị chặn', async ({ page }) => {
	chanNeuTat('16_040_002');
	await mo(page);
	const ky = await kyMo();
	const b = await napApi(ky.id, xmlKy({ total: 60000 }));
	await donHd(ky.id);
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(msg(b)).toBe(`Kỳ ${ky.id} chưa chốt nên chưa nhận hoá đơn nhà cung cấp. Hãy chốt kỳ trước — hoá đơn phải khớp với biên bản đã đóng băng.`);
});

test('16_040_003 — Tải hoá đơn XML cho kỳ đã chốt', async ({ page }) => {
	chanNeuTat('16_040_003');
	await mo(page);
	const ky = await kyChot();
	try {
		await mo(page, ky.id);
		const { tb, body } = await napUi(page, f(xmlKy({ total: 60000 })));
		ghi(`kỳ ${ky.id}: "${tb}" · ${JSON.stringify(body?.data?.[0] || body?.status).slice(0, 200)}`);
		expect(tb).toContain('Đã ghi nhận hoá đơn');
		await expect(bangHd(page).locator('tbody tr.ant-table-row')).toHaveCount(1, { timeout: 20_000 });
		await expect(alertKq(page)).toContainText(/Khớp biên bản|Lệch biên bản|Chưa kiểm/, { timeout: 20_000 });
	} finally {
		await donHd(ky.id);
	}
});

test('16_040_004 — Tải hoá đơn đã tồn tại hiện cảnh báo', async ({ page }) => {
	chanNeuTat('16_040_004');
	await mo(page);
	const ky = await kyChot();
	const xml = xmlKy({ total: 60000 });
	try {
		await mo(page, ky.id);
		await napUi(page, f(xml));
		await expect(bangHd(page).locator('tbody tr.ant-table-row')).toHaveCount(1, { timeout: 20_000 });
		const { tb } = await napUi(page, f(xml));
		const lop = await page.locator('.ant-message-notice .anticon').first().getAttribute('class').catch(() => '');
		ghi(`nạp lại: "${tb}" · icon ${lop}`);
		expect(lop, 'Nạp trùng mà hiện thông báo THÀNH CÔNG').toMatch(/exclamation|warning/);
		expect((await hoaDon(ky.id)).length, 'Hoá đơn bị nhân đôi').toBe(1);
	} finally {
		await donHd(ky.id);
	}
});

test('16_040_005 — Tệp XML hỏng bị chặn', async ({ page }) => {
	chanNeuTat('16_040_005');
	await mo(page);
	const ky = await kyChot();
	try {
		const b = await napApi(ky.id, '<HDon><DLHDon><TTChung><SHDon>1</SHDon></TTChung>');
		ghi(`${b?.status?.code} ${b?.status?.message} · ${JSON.stringify(b?.data)?.slice(0, 200)}`);
		const chuoi = msg(b) || chuan(b?.data?.[0]?.message);
		expect(chuoi).toMatch(/^Không đọc được file XML hoá đơn: /);
		expect(await hoaDon(ky.id)).toEqual([]);
	} finally {
		await donHd(ky.id);
	}
});

test('16_040_006 — Ba kết quả đối chiếu hiển thị đúng nhãn', async ({ page }) => {
	chanNeuTat('16_040_006');
	await mo(page);
	const thay = {};
	const ky2 = await kyGhiNo();
	await mo(page, ky2.id);
	await expect(alertKq(page)).toContainText(/Khớp biên bản|Lệch biên bản|Chưa kiểm/, { timeout: 20_000 }); // thẻ vẽ trước khi summary về ⇒ thoáng hiện "Kỳ chưa chốt"
	thay.KHOP = { nhan: chuan(await alertKq(page).locator('.ant-alert-title, .ant-alert-message').first().innerText()), lop: await alertKq(page).getAttribute('class') };
	await mo(page);
	const ky = await kyChot();
	try {
		const bb = ky.bb ?? (await tongBienBan(ky.id));
		await napApi(ky.id, xmlKy({ total: bb + 5000 }));
		await mo(page, ky.id);
		await expect(alertKq(page)).toContainText(/Khớp biên bản|Lệch biên bản|Chưa kiểm/, { timeout: 20_000 }); // thẻ vẽ trước khi summary về ⇒ thoáng hiện "Kỳ chưa chốt"
		thay.LECH = { nhan: chuan(await alertKq(page).locator('.ant-alert-title, .ant-alert-message').first().innerText()), lop: await alertKq(page).getAttribute('class'), mota: chuan(await alertKq(page).innerText()) };
	} finally {
		await donHd(ky.id);
	}
	ghi(JSON.stringify(thay));
	expect(thay.KHOP.nhan).toBe('Khớp biên bản');
	expect(thay.KHOP.lop).toContain('ant-alert-success');
	expect(thay.LECH.nhan).toBe('Lệch biên bản');
	expect(thay.LECH.lop).toContain('ant-alert-error');
	expect(thay.LECH.mota, 'Lệch mà không kèm nội dung lệch').toMatch(/biên bản.*hoá đơn/i);
	// "Chưa kiểm" (PENDING): mọi lượt nạp đều kiểm tổng ngay ⇒ chưa gặp trạng thái này trên dữ liệu thật.
	const coPending = [];
	for (const p of (await g('/consignment-recon/periods', { page: 0, size: 500 })).data || []) {
		if (p.status === 'OPEN') continue;
		for (const i of await hoaDon(p.id)) if (i.totalCheckStatus === 'PENDING') coPending.push(p.id);
	}
	test.skip(!coPending.length, 'Khớp + Lệch đạt; nhãn "Chưa kiểm" chưa kiểm được — không hoá đơn nào ở PENDING (nạp xong BE kiểm tổng ngay).');
});

test('16_040_007 — Bảng hoá đơn của kỳ hiện đủ chín cột', async ({ page }) => {
	chanNeuTat('16_040_007');
	await mo(page);
	const ky = await kyGhiNo();
	await mo(page, ky.id);
	await expect(bangHd(page).locator('tbody tr.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
	const c = (await bangHd(page).locator('thead th').allInnerTexts()).map(chuan);
	ghi(c.join(' | '));
	expect(c.filter(Boolean)).toEqual(['Loại', 'Ký hiệu / Số', 'Ngày hoá đơn', 'Hạn thanh toán', 'Điều chỉnh', 'Trước thuế', 'Thuế', 'Tổng tiền', 'Nguồn']);
	await expect(bangHd(page).locator('tbody tr.ant-table-row').first().getByRole('button', { name: 'Xoá' })).toBeVisible();
});

test('16_040_008 — Hạn thanh toán trống khi hợp đồng chưa khai ngày trả chậm', async ({ page }) => {
	chanNeuTat('16_040_008');
	await mo(page);
	const ky = await kyGhiNo();
	const hd = (await hoaDon(ky.id)).find((i) => !i.dueDate);
	test.skip(!hd, 'Mọi hoá đơn đều có hạn thanh toán.');
	await mo(page, ky.id);
	await expect(bangHd(page).locator('tbody tr.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
	const c = (await bangHd(page).locator('thead th').allInnerTexts()).map(chuan);
	const o = chuan(await bangHd(page).locator('tbody tr.ant-table-row').first().locator('td').nth(c.indexOf('Hạn thanh toán')).innerText());
	expect(o).toBe('Chưa xác định hạn');
	await expect(khung(page).getByRole('button', { name: /Ghi nợ chính thức/ })).toBeVisible();
});

test('16_040_009 — Cột Nguồn phân biệt ba đường vào hệ thống', async ({ page }) => {
	chanNeuTat('16_040_009');
	await mo(page);
	const nguon = new Set();
	for (const p of (await g('/consignment-recon/periods', { page: 0, size: 500 })).data || []) {
		if (p.status !== 'OPEN') for (const i of await hoaDon(p.id)) nguon.add(i.source);
	}
	const ky = await kyGhiNo();
	await mo(page, ky.id);
	await expect(bangHd(page).locator('tbody tr.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
	const c = (await bangHd(page).locator('thead th').allInnerTexts()).map(chuan);
	const o = chuan(await bangHd(page).locator('tbody tr.ant-table-row').first().locator('td').nth(c.indexOf('Nguồn')).innerText());
	ghi(`nguồn có trong chuỗi: ${[...nguon].join(', ')} · ô đầu: "${o}"`);
	expect(o).toBe('Tải lên');
	test.skip(!(nguon.has('MAIL') && nguon.has('MANUAL_ENTRY')), `"Tải lên" đạt; chưa có hoá đơn nguồn Email / Nhập tay để kiểm (nguồn hiện có: ${[...nguon].join(', ')}). Email cần job IMAP; Nhập tay có API POST /consignment-invoices nhưng FE không có màn nhập tay.`);
});

test('16_040_010 — Một kỳ nhiều hoá đơn thì đối chiếu TỔNG của cả cụm', async ({ page }) => {
	chanNeuTat('16_040_010');
	await mo(page);
	const ky = await kyChot({ duong: true });
	try {
		const bb = ky.bb ?? (await tongBienBan(ky.id));
		// Gốc dư 2.000 + điều chỉnh GIẢM 2.000 ⇒ tổng cụm = biên bản; từng hoá đơn đều lệch.
		// 🔴 Hoá đơn điều chỉnh ghi số DƯƠNG, dấu ở TCDChinh (2 = giảm) — BE trừ theo trị tuyệt đối (đo 25/09).
		const a = await napApi(ky.id, xmlKy({ total: bb + 2000 }));
		const b = await napApi(ky.id, xmlKy({ total: 2000, related: 'DIEU_CHINH', adjustment: '2' }));
		const hd = await hoaDon(ky.id);
		ghi(`biên bản ${bb} · nạp ${a?.status?.code}/${b?.status?.code} · ${hd.map((i) => `${i.invoiceType}:${i.totalAmount}:${i.totalCheckStatus}`).join(' | ')} · ${hd[0]?.totalCheckNote}`);
		expect(hd.length).toBe(2);
		expect(hd[0].totalCheckStatus, `Tổng cụm (${bb + 2000} − 2000) = biên bản ${bb} mà không ra KHỚP`).toBe('KHOP');
		await mo(page, ky.id);
		await expect(alertKq(page)).toContainText('Khớp biên bản');
	} finally {
		await donHd(ky.id);
	}
});

test('16_040_011 — Kiểm tổng lại sau khi NCC sửa hoá đơn', async ({ page }) => {
	chanNeuTat('16_040_011');
	await mo(page);
	const ky = await kyChot({ duong: true });
	try {
		const bb = ky.bb ?? (await tongBienBan(ky.id));
		await napApi(ky.id, xmlKy({ total: bb + 3000 }));
		await mo(page, ky.id);
		await expect(alertKq(page)).toContainText('Lệch biên bản');
		await napApi(ky.id, xmlKy({ total: 3000, related: 'DIEU_CHINH', adjustment: '2' }));
		const cho = page.waitForResponse((r) => r.url().includes('/consignment-invoices/rerun-check'), { timeout: 30_000 });
		await khung(page).getByRole('button', { name: 'Kiểm tổng lại' }).click();
		const r = await (await cho).json();
		ghi(`rerun-check ${r?.status?.code}`);
		expect(String(r?.status?.code)).toBe('200');
		await expect(alertKq(page)).toContainText('Khớp biên bản', { timeout: 20_000 });
	} finally {
		await donHd(ky.id);
	}
});

test('16_040_012 — Xoá hoá đơn nhập sai', async ({ page }) => {
	chanNeuTat('16_040_012');
	await mo(page);
	const ky = await kyChot({ duong: true });
	try {
		const bb = ky.bb ?? (await tongBienBan(ky.id));
		await napApi(ky.id, xmlKy({ total: bb }));
		// Quan sát: hai hoá đơn GỐC trong một kỳ thì BE kiểm tổng thế nào (lượt 25/09: vẫn "Khớp" — hoá đơn gốc thứ hai bị bỏ qua).
		await napApi(ky.id, xmlKy({ total: 1234 }));
		const hai = await hoaDon(ky.id);
		ghi(`2 hoá đơn GỐC (${hai.map((i) => i.totalAmount).join(' + ')}) ⇒ ${hai[0]?.totalCheckStatus}: ${hai[0]?.totalCheckNote}`);
		await donHd(ky.id);
		// "Nhập sai" = hoá đơn điều chỉnh TĂNG 1.234 nạp nhầm ⇒ cụm lệch; xoá nó ⇒ kiểm tổng lại về khớp.
		await napApi(ky.id, xmlKy({ total: bb }));
		await napApi(ky.id, xmlKy({ total: 1234, related: 'DIEU_CHINH', adjustment: '1' }));
		await mo(page, ky.id);
		await expect(alertKq(page)).toContainText('Lệch biên bản');
		const dong = bangHd(page).locator('tbody tr.ant-table-row').filter({ hasText: '1.234' }).first();
		await dong.getByRole('button', { name: 'Xoá' }).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Xoá hoá đơn nhà cung cấp?' });
		await expect(hop).toBeVisible();
		await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
		await hop.getByRole('button', { name: 'Xoá' }).click();
		await page.locator('.ant-message-notice').first().waitFor({ timeout: 10_000 });
		const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
		ghi(`thông báo: ${tb}`);
		expect(tb).toContain('Đã xoá hoá đơn');
		await expect(alertKq(page), 'Xoá xong không kiểm tổng lại (số cũ còn nằm lại)').toContainText('Khớp biên bản', { timeout: 20_000 });
	} finally {
		await donHd(ky.id);
	}
});

test('16_040_013 — Kỳ đã ghi nợ thì nút Xoá bị khoá', async ({ page }) => {
	chanNeuTat('16_040_013');
	await mo(page);
	const ky = await kyGhiNo();
	await mo(page, ky.id);
	await expect(bangHd(page).locator('tbody tr.ant-table-row').first().getByRole('button', { name: 'Xoá' })).toBeDisabled();
});

test('16_040_014 — Gọi API xoá hoá đơn của kỳ đã ghi nợ bị chặn', async ({ page }) => {
	chanNeuTat('16_040_014');
	await mo(page);
	const ky = await kyGhiNo();
	expect(ky?.status, 'Tiền đề: kỳ phải ĐÃ GHI NỢ (BE chặn xoá)').toBe('INVOICED');
	const hd = (await hoaDon(ky.id))[0];
	const b = await goiGhi('DELETE', `/consignment-invoices/${hd.id}`);
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect((await hoaDon(ky.id)).map((i) => i.id), '🔴 Xoá được hoá đơn của kỳ đã ghi nợ').toContain(hd.id);
	expect(msg(b)).toBe(`Kỳ ${ky.id} đã ghi nợ chính thức nên không xoá được hoá đơn. Nếu cần điều chỉnh, hãy nạp hoá đơn điều chỉnh tăng/giảm.`);
});

test('16_040_015 — Xoá hoá đơn không tồn tại bị chặn', async ({ page }) => {
	chanNeuTat('16_040_015');
	await mo(page);
	const b = await goiGhi('DELETE', '/consignment-invoices/999999999');
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(msg(b)).toBe('Không tìm thấy hoá đơn id=999999999');
});

test('16_040_016 — Vùng tải tệp bị khoá khi kỳ đã ghi nợ', async ({ page }) => {
	chanNeuTat('16_040_016');
	await mo(page);
	const ky = await kyGhiNo();
	await mo(page, ky.id);
	await expect(khung(page).locator('.ant-tabs-tabpane-active .ant-upload-drag')).toHaveClass(/ant-upload-disabled/);
	await expect(khung(page).locator('.ant-tabs-tabpane-active input[type=file]')).toBeDisabled();
});

test('16_040_017 — Nút Tải XML mẫu để test chỉ dùng khi kiểm thử', async ({ page }) => {
	chanNeuTat('16_040_017');
	await mo(page);
	const ky = await kyGhiNo();
	await mo(page, ky.id);
	const goiMay = [];
	page.on('request', (r) => r.method() !== 'GET' && r.url().includes('/__api/') && goiMay.push(r.url()));
	await khung(page).getByRole('button', { name: /Tải XML mẫu để test/ }).click();
	const dl = page.waitForEvent('download', { timeout: 20_000 });
	await page.locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item').filter({ hasText: 'Gốc, khớp biên bản' }).click();
	const d = await dl;
	const noi = require('node:fs').readFileSync(await d.path(), 'utf8');
	ghi(`tệp ${d.suggestedFilename()} · ${noi.length} ký tự`);
	expect(d.suggestedFilename()).toMatch(/^hoadon-mau-goc-khop.*\.xml$/);
	expect(noi).toContain('<HDon>');
	expect(noi, 'Tệp mẫu không ghi rõ là dữ liệu thử').toMatch(/MAU TEST|mau test/);
	expect(goiMay, 'Tải XML mẫu mà gọi máy chủ ghi').toEqual([]);
});

test('16_040_018 — Đóng hộp xác nhận xoá hoá đơn không xoá gì', async ({ page }) => {
	chanNeuTat('16_040_018');
	await mo(page);
	const ky = await kyChot();
	try {
		await napApi(ky.id, xmlKy({ total: 60000 }));
		await mo(page, ky.id);
		const xoa = [];
		page.on('request', (r) => r.method() === 'DELETE' && xoa.push(r.url()));
		await bangHd(page).locator('tbody tr.ant-table-row').first().getByRole('button', { name: 'Xoá' }).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Xoá hoá đơn nhà cung cấp?' });
		await hop.getByRole('button', { name: 'Huỷ' }).click();
		await expect(hop).toBeHidden();
		expect(xoa).toEqual([]);
		await expect(bangHd(page).locator('tbody tr.ant-table-row')).toHaveCount(1);
	} finally {
		await donHd(ky.id);
	}
});

test('16_040_019 — 🔴 Chưa xác định được ngưỡng dung sai khi kiểm tổng', async ({ page }) => {
	chanNeuTat('16_040_019');
	await mo(page);
	const ky = await kyChot({ duong: true });
	const kq = [];
	try {
		const bb = ky.bb ?? (await tongBienBan(ky.id));
		for (const lech of [5, 10, 11]) {
			await napApi(ky.id, xmlKy({ total: bb + lech }));
			kq.push(`+${lech}đ ⇒ ${(await hoaDon(ky.id))[0]?.totalCheckStatus}`);
			await donHd(ky.id);
		}
	} finally {
		await donHd(ky.id);
	}
	ghi(`dung sai kiểm tổng: ${kq.join(' · ')}`);
	test.skip(true, `Kỳ vọng CHƯA CHỐT — đã ghi hành vi thật: ${kq.join(' · ')} (FE sampleInvoiceXml khai DUNG_SAI_KIEM_TONG = 10).`);
});

// ───────── 050 ─────────

test('16_050_001 — Nút Ghi nợ chính thức bị khoá khi chưa Khớp biên bản', async ({ page }) => {
	chanNeuTat('16_050_001');
	await mo(page);
	const ky = await kyChot({ duong: true });
	try {
		const bb = ky.bb ?? (await tongBienBan(ky.id));
		await napApi(ky.id, xmlKy({ total: bb + 5000 }));
		await mo(page, ky.id);
		await expect(alertKq(page)).toContainText('Lệch biên bản');
		await expect(khung(page).getByRole('button', { name: 'Ghi nợ chính thức' })).toBeDisabled();
	} finally {
		await donHd(ky.id);
	}
});

test('16_050_002 — Gọi API ghi nợ khi hoá đơn LỆCH bị chặn', async ({ page }) => {
	chanNeuTat('16_050_002');
	await mo(page);
	const ky = await kyChot({ duong: true });
	try {
		const bb = ky.bb ?? (await tongBienBan(ky.id));
		await napApi(ky.id, xmlKy({ total: bb + 5000 }));
		const hd = await hoaDon(ky.id);
		// 🔴 Chỉ gọi khi CHẮC CHẮN đang LỆCH — khớp là ghi nợ thật, không hoàn tác.
		expect(hd.length && hd.every((i) => i.totalCheckStatus === 'LECH'), `Tiền đề không an toàn để gọi post-debt: ${hd.map((i) => i.totalCheckStatus).join(',')}`).toBeTruthy();
		const b = await goiGhi('POST', `/consignment-recon/periods/${ky.id}/post-debt`);
		ghi(`${b?.status?.code} ${b?.status?.message}`);
		expect(String(b?.status?.code), '🔴 Ghi nợ được khi hoá đơn LỆCH').not.toBe('200');
		expect(msg(b)).toMatch(new RegExp(`^Kỳ ${ky.id} có hoá đơn NCC LỆCH so với biên bản đã chốt: .+\\. Liên hệ NCC xuất lại hoặc xuất hoá đơn điều chỉnh, rồi kiểm tổng lại trước khi ghi nợ\\.$`));
	} finally {
		await donHd(ky.id);
	}
});

test('16_050_003 — Ghi nợ khi kỳ chưa chốt bị chặn', async ({ page }) => {
	chanNeuTat('16_050_003');
	await mo(page);
	const ky = await kyMo();
	expect(ky.status).toBe('OPEN');
	const b = await goiGhi('POST', `/consignment-recon/periods/${ky.id}/post-debt`);
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(msg(b)).toBe(`Kỳ ${ky.id} đang ở trạng thái OPEN. Phải CHỐT KỲ (đóng băng biên bản) trước khi ghi nợ chính thức.`);
});

test('16_050_004 — Ghi nợ khi kỳ chưa có hoá đơn bị chặn', async ({ page }) => {
	chanNeuTat('16_050_004');
	await mo(page);
	const ky = await kyChot();
	expect(await hoaDon(ky.id), 'Tiền đề: kỳ chưa có hoá đơn').toEqual([]);
	const b = await goiGhi('POST', `/consignment-recon/periods/${ky.id}/post-debt`);
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(msg(b)).toBe(`Kỳ ${ky.id} chưa có hoá đơn NCC. Nhà cung cấp xuất hoá đơn sau khi 3 bên đối soát xong — hãy tải hoá đơn vào kỳ này trước khi ghi nợ chính thức.`);
});

/** Kỳ LOCKED + hoá đơn KHỚP (nạp đúng tổng biên bản) rồi mở modal ghi nợ. post-debt đã bị chặn bởi `mo`. */
async function moModalGhiNo(page, { kyId } = {}) {
	await mo(page);
	const ky = kyId ? await kyTheo((p) => p.id === kyId) : await kyChot({ duong: true });
	expect(await hoaDon(ky.id), `Kỳ ${ky.id} đã có hoá đơn — không nạp thử được`).toEqual([]);
	const bb = ky.bb ?? (await tongBienBan(ky.id));
	await napApi(ky.id, xmlKy({ total: bb }));
	expect((await hoaDon(ky.id))[0]?.totalCheckStatus, 'Nạp đúng tổng biên bản mà không KHỚP').toBe('KHOP');
	const daGoi = await mo(page, ky.id);
	const shops = (await g(`/consignment-recon/periods/${ky.id}/debt-shops`)).data || [];
	await khung(page).getByRole('button', { name: 'Ghi nợ chính thức' }).click();
	const hop = page.getByRole('dialog').filter({ hasText: 'Ghi nợ chính thức cho kỳ này?' });
	await expect(hop).toBeVisible();
	return { ky, hop, daGoi, shops };
}

test('16_050_005 — Màn xác nhận ghi nợ có đúng một trường bắt buộc', async ({ page }) => {
	chanNeuTat('16_050_005');
	let ky;
	try {
		const x = await moModalGhiNo(page);
		ky = x.ky;
		await expect(x.hop.locator('.ant-alert-warning')).toContainText('khoản nợ trở thành CHÍNH THỨC');
		await expect(x.hop.locator('.font-medium').filter({ hasText: 'Kho ghi nợ' })).toBeVisible();
		expect(await x.hop.locator('.text-red-500').filter({ hasText: '*' }).count(), 'Số trường bắt buộc (dấu * đỏ)').toBe(1);
		expect(await x.hop.locator('.ant-select').count()).toBe(1);
		expect(x.daGoi).toEqual([]);
	} finally {
		if (ky) await donHd(ky.id);
	}
});

test('16_050_006 — Nhãn mỗi kho gồm tên kho và số chứng từ', async ({ page }) => {
	chanNeuTat('16_050_006');
	let ky;
	try {
		const x = await moModalGhiNo(page);
		ky = x.ky;
		test.skip(x.shops.length < 2, `Kỳ ${ky.id} chỉ có ${x.shops.length} kho hợp lệ.`);
		await x.hop.locator('.ant-select').click();
		const nhan = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(chuan);
		ghi(nhan.join(' | '));
		expect(nhan).toEqual(x.shops.map((s) => chuan(`${s.shopName} — ${s.soChungTu} chứng từ`)));
	} finally {
		if (ky) await donHd(ky.id);
	}
});

test('16_050_007 — Chỉ một kho hợp lệ thì hệ thống điền sẵn', async ({ page }) => {
	chanNeuTat('16_050_007');
	await mo(page);
	const ds = ((await g('/consignment-recon/periods', { page: 0, size: 500 })).data || []).filter((p) => p.status === 'LOCKED');
	const mot = [];
	for (const p of ds) if (((await g(`/consignment-recon/periods/${p.id}/debt-shops`)).data || []).length === 1) mot.push(p.id);
	ghi(`kỳ LOCKED có đúng 1 kho: ${mot.join(', ') || '(không)'}`);
	test.skip(!mot.length, `Không kỳ LOCKED nào có đúng 1 kho hợp lệ (${ds.map((p) => p.id).join(', ')}).`);
	let ky;
	try {
		const x = await moModalGhiNo(page, { kyId: mot[0] });
		ky = x.ky;
		expect(x.shops.length).toBe(1);
		await expect(x.hop.locator('.ant-select')).toContainText(x.shops[0].shopName);
	} finally {
		if (ky) await donHd(ky.id);
	}
});

test('16_050_008 — Nhiều kho hợp lệ thì để trống, không đoán hộ', async ({ page }) => {
	chanNeuTat('16_050_008');
	let ky;
	try {
		const x = await moModalGhiNo(page);
		ky = x.ky;
		test.skip(x.shops.length < 2, `Kỳ ${ky.id} chỉ có ${x.shops.length} kho.`);
		await page.waitForTimeout(1_500);
		await expect(x.hop.locator('.ant-select-placeholder, .ant-select-selection-placeholder').first()).toHaveText('Chọn kho ghi nợ');
	} finally {
		if (ky) await donHd(ky.id);
	}
});

test('16_050_009 — Bỏ trống Kho ghi nợ bị chặn', async ({ page }) => {
	chanNeuTat('16_050_009');
	let ky;
	try {
		const x = await moModalGhiNo(page);
		ky = x.ky;
		test.skip(x.shops.length < 2, `Kỳ ${ky.id} chỉ có ${x.shops.length} kho (1 kho thì FE điền sẵn, không để trống được).`);
		await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
		await x.hop.getByRole('button', { name: 'Ghi nợ chính thức' }).click();
		await page.locator('.ant-message-notice').first().waitFor({ timeout: 8_000 });
		const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
		expect(tb).toContain('Chọn kho ghi nợ trước khi ghi nợ chính thức');
		expect(x.daGoi, 'Bỏ trống kho mà vẫn gửi POST post-debt').toEqual([]);
	} finally {
		if (ky) await donHd(ky.id);
	}
});

test('16_050_010 — Kỳ không có kho hợp lệ hiện thông báo riêng', async ({ page }) => {
	chanNeuTat('16_050_010');
	await mo(page);
	const ds = ((await g('/consignment-recon/periods', { page: 0, size: 500 })).data || []).filter((p) => p.status === 'LOCKED');
	const khong = [];
	for (const p of ds) if (!((await g(`/consignment-recon/periods/${p.id}/debt-shops`)).data || []).length) khong.push(p.id);
	ghi(`kỳ LOCKED không có kho hợp lệ: ${khong.join(', ') || '(không)'}`);
	test.skip(!khong.length, 'Mọi kỳ LOCKED đều có kho hợp lệ.');
	let ky;
	try {
		const x = await moModalGhiNo(page);
		ky = x.ky;
		test.skip(x.shops.length > 0, `Kỳ nạp thử (${ky.id}) có kho; kỳ không kho (${khong.join(',')}) không nạp thử được.`);
		await x.hop.locator('.ant-select').click();
		await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toContainText('Không có kho nào đã phát sinh chứng từ với nhà cung cấp của kỳ này');
	} finally {
		if (ky) await donHd(ky.id);
	}
});

test('16_050_011 — Ô Kho ghi nợ chỉ liệt kê kho của đúng đơn vị đứng tên kỳ', async ({ page }) => {
	chanNeuTat('16_050_011');
	await mo(page);
	const ky = await kyChot();
	const shops = (await g(`/consignment-recon/periods/${ky.id}/debt-shops`)).data || [];
	ghi(`kỳ ${ky.id} (${ky.orgUnitType} ${ky.orgUnitCode}): ${shops.map((s) => `${s.shopId} ${s.shopName} ${s.shopType}`).join(' | ')}`);
	expect(shops.length).toBeGreaterThan(0);
	// Kho của đơn vị làn 7 (tỉnh/xã/điểm bán AUTO7) không được lọt vào kỳ của TCT.
	for (const s of shops) expect(s.shopName, `Kho ${s.shopName} thuộc đơn vị làn test, không phải ${ky.orgUnitCode}`).not.toMatch(/AUTO\d/);
});

test('16_050_012 — Chọn kho của đơn vị khác bị chặn', async () => {
	chanNeuTat('16_050_012');
	test.skip(true, `Chỉ tới được khi kỳ đã KHỚP biên bản ⇒ nếu BE không kiểm kho thuộc đơn vị thì lệnh này GHI NỢ THẬT. ${LY_DO_GHI_NO}`);
});

test('16_050_013 — Ghi nợ chính thức thành công', async () => {
	chanNeuTat('16_050_013');
	test.skip(true, LY_DO_GHI_NO);
});

test('16_050_014 — Ghi nợ lại kỳ đã ghi nợ thì bỏ qua', async ({ page }) => {
	chanNeuTat('16_050_014');
	await mo(page);
	const ky = await kyGhiNo();
	expect(ky?.status, 'Tiền đề: kỳ ĐÃ ghi nợ (BE bỏ qua, không ghi thêm)').toBe('INVOICED');
	const shops = (await g(`/consignment-recon/periods/${ky.id}/debt-shops`)).data || [];
	const b = await goiGhi('POST', `/consignment-recon/periods/${ky.id}/post-debt`, shops[0] ? { shopId: shops[0].shopId } : {});
	ghi(`${b?.status?.code} ${b?.status?.message} · ${JSON.stringify(b?.data).slice(0, 300)}`);
	expect(b?.data?.daGhiTruoc, 'Ghi nợ lại kỳ đã ghi nợ mà không báo daGhiTruoc').toBe(true);
});

test('16_050_015 — Kỳ không phát sinh nghĩa vụ thì khép kỳ mà không ghi nợ', async () => {
	chanNeuTat('16_050_015');
	test.skip(true, `Khép kỳ (đổi trạng thái kỳ sang đã ghi nợ) là một chiều. ${LY_DO_GHI_NO}`);
});

test('16_050_016 — Bút toán sau ghi nợ không sửa trực tiếp được', async () => {
	chanNeuTat('16_050_016');
	test.skip(true, 'Kỳ vọng nêu "mở sổ kế toán tìm bút toán vừa sinh" nhưng kịch bản không chỉ màn sổ kế toán nào hiển thị bút toán ghi nợ ký gửi, và ghi nợ thật đang chờ user cho phép — cần chốt màn kiểm.');
});

test('16_050_017 — Sau khi ghi nợ thì lập được lệnh chi cho NCC', async () => {
	chanNeuTat('16_050_017');
	test.skip(true, `Cần ghi nợ chính thức trước (050_013). ${LY_DO_GHI_NO}`);
});

test('16_050_018 — Đóng màn xác nhận ghi nợ không ghi gì', async ({ page }) => {
	chanNeuTat('16_050_018');
	let ky;
	try {
		const x = await moModalGhiNo(page);
		ky = x.ky;
		await x.hop.locator('.ant-modal-close').click();
		await expect(x.hop).toBeHidden();
		expect(x.daGoi).toEqual([]);
		const p = (await g('/consignment-recon/periods', { page: 0, size: 500 })).data.find((q) => q.id === ky.id);
		expect(p.status, 'Nhãn kỳ đổi sau khi đóng màn').toBe('LOCKED');
	} finally {
		if (ky) await donHd(ky.id);
	}
});

test('16_050_019 — Ghi nợ cho kỳ không tồn tại bị chặn', async ({ page }) => {
	chanNeuTat('16_050_019');
	await mo(page);
	const b = await goiGhi('POST', '/consignment-recon/periods/999999999/post-debt');
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(msg(b)).toBe('Không tìm thấy kỳ đối soát id=999999999');
});
