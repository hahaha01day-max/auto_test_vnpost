'use strict';

/**
 * Helper 14_3 — hoá đơn điều chỉnh giảm cho đợt trả NCC.
 *
 * Trace 25/09/2026 (vnpost-web `CreditNoteBatchBlock.jsx` · `CreditNoteReconcileDrawer.jsx` · `returnCreditNoteApi.js`;
 * pod `SupplierReturnCreditNoteController/Service` · `SupplierReturnReconcileService` · `DefaultVietnamEInvoiceXmlReader`):
 *
 * - Khối hoá đơn chỉ hiện cho đợt `WAIT_CONFIRM` / `CONFIRMED` / `SETTLED` trong drawer chi tiết phiếu trả.
 * - Nhánh (A) NCC lập ⟺ `CHAIN_SUPPLIER.return_invoice_issuer = SUPPLIER` (mọi NCC của làn đều là SUPPLIER).
 * - Nạp XML ⇒ BE đối soát luôn (lỗi đối soát không ném lên, hoá đơn ở PENDING).
 * - 🔴 Gỡ hoá đơn (`DELETE`) nhả đợt ⇒ dùng lại được đợt đó. Chỉ CHỐT CHỨNG TỪ mới tiêu hao đợt vĩnh viễn.
 * - XML: `TTHDLQuan/TCHDon` 1=THAY_THẾ · 2=ĐIỀU_CHỈNH · không có khối ⇒ GỐC. Dấu: `TCDChinh` 1=Tăng · 2=Giảm · 0=Không đổi,
 *   thiếu thì theo ghi chú `ProcessInvNote`, rồi theo dấu `TgTTTBSo`; thiếu cả ba ⇒ `UNKNOWN`.
 * - Dòng hàng cần `TChat=1`; tiền sau thuế từng dòng ở `TTKhac/Amount` (đối soát so với `SHOP_STOCK_IN_OUT_ITEM.amount`).
 *
 * Tiền đề: đợt `WAIT_CONFIRM` chưa gắn hoá đơn ở HUB tỉnh làn 8 (sinh bởi 14_2) — mỗi đợt 1 dòng `AUTO8_SP_TD1`.
 */

const { expect } = require('@playwright/test');
const { BASE_URL } = require('../../shared/vnpost-config');
const rp = require('../../14_1_lap_va_duyet_phieu_xuat_tra/tests/return-page');

const { k, API, chuan } = rp;
const CN = '/stock/v2/return-credit-note';
const MST_NCC = '0100686209';

// ───────── XML ─────────
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let dem = 0;
/** Số hoá đơn duy nhất cho mỗi tệp (dedup theo MST + ký hiệu + số). */
const soMoi = () => `A${process.env.VNPOST_LANE || ''}${Date.now().toString().slice(-8)}${(dem++).toString().padStart(2, '0')}`;

const ttin = (ten, v) => `<TTin><TTruong>${esc(ten)}</TTruong><KDLieu>string</KDLieu><DLieu>${esc(v)}</DLieu></TTin>`;

/**
 * Dựng XML hoá đơn — bám khuôn `buildPoInvoiceXml` (vnpost-web `purchaseOrder/utils/poInvoiceXml.js`, nút "Tải XML test"
 * ở chi tiết PO): khối `TTHDLQuan` dùng thẻ `KHMSHDCLQuan/KHHDCLQuan/SHDCLQuan/NLHDCLQuan`, dấu điều chỉnh suy từ
 * `TTChung/TTKhac/ProcessInvNote` ("Điều chỉnh giảm cho hóa đơn …") như hoá đơn Hilo thật — 🚫 không có `TCDChinh`.
 *
 * `lines`: [{ ten, dvt, sl, tien (sau thuế), vat (số % hoặc null = để trống), tchat }].
 * `tong`: TgTTTBSo (null ⇒ bỏ thẻ). `tchdon`: '1' | '2' | null (null ⇒ không có khối TTHDLQuan = hoá đơn GỐC).
 * `dau`: 'GIAM' | 'TANG' | null — ghi vào ProcessInvNote (null ⇒ không ghi chú). `tcdc`: '0' | '1' | '2' — chỉ khi cần
 * thẻ `TCDChinh` (NCC khác Hilo; dùng cho "không đổi giá trị" vì ghi chú không diễn tả được).
 * `am`: true ⇒ số lượng + tiền mang dấu ÂM như biến thể `adjust` của khuôn PO.
 */
function xmlHd({ lines, tong, so = soMoi(), kyHieu = 'C26AUTO', tchdon = '2', dau = 'GIAM', tcdc = null, am = false, ngay = hom(), ngayGoc = '2026-09-01' }) {
	if (am) lines = lines.map((l) => ({ ...l, sl: -Math.abs(l.sl), tien: -Math.abs(l.tien) }));
	if (tong === undefined) tong = lines.reduce((s, l) => s + Number(l.tien || 0), 0);
	const hh = lines
		.map((l, i) => {
			const vat = l.vat === undefined ? 10 : l.vat;
			const net = vat == null ? l.tien : Math.round(l.tien / (1 + vat / 100));
			return [
				'<HHDVu>',
				`<STT>${i + 1}</STT>`,
				`<TChat>${l.tchat ?? 1}</TChat>`,
				`<THHDVu>${esc(l.ten)}</THHDVu>`,
				`<DVTinh>${esc(l.dvt)}</DVTinh>`,
				`<SLuong>${l.sl}</SLuong>`,
				`<DGia>${l.sl ? Math.round(net / l.sl) : net}</DGia>`,
				vat == null ? '' : `<TSuat>${vat}%</TSuat>`,
				`<ThTien>${net}</ThTien>`,
				`<TTKhac>${ttin('VATAmount', l.tien - net)}${ttin('Total', net)}${ttin('Amount', l.tien)}</TTKhac>`,
				'</HHDVu>',
			].join('');
		})
		.join('\n');
	const net = Math.round(Number(tong || 0) / 1.1);
	const goc = `0${so}`;
	const lq =
		tchdon == null
			? ''
			: `<TTHDLQuan><TCHDon>${tchdon}</TCHDon><LHDCLQuan>1</LHDCLQuan>${tcdc == null ? '' : `<TCDChinh>${tcdc}</TCDChinh>`}<KHMSHDCLQuan>1</KHMSHDCLQuan><KHHDCLQuan>${kyHieu}</KHHDCLQuan><SHDCLQuan>${goc}</SHDCLQuan><NLHDCLQuan>${ngayGoc}</NLHDCLQuan></TTHDLQuan>`;
	const ngayGocVn = ngayGoc.split('-').reverse().join('/');
	const ghiChu =
		tchdon == null || !dau
			? ''
			: `Điều chỉnh ${dau === 'TANG' ? 'tăng' : 'giảm'} cho hóa đơn Mẫu số: 1, ký hiệu ${kyHieu}, số ${goc}, ngày ${ngayGocVn}`;
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<!-- AUTO TEST 14_3 - du lieu thu nghiem, khong phai hoa don that -->',
		'<HDon><DLHDon Id="DL"><TTChung>',
		`<PBan>2.1.0</PBan><THDon>Hóa đơn giá trị gia tăng</THDon><KHMSHDon>1</KHMSHDon><KHHDon>${kyHieu}</KHHDon><SHDon>${so}</SHDon><NLap>${ngay}</NLap>`,
		lq,
		'<HTTToan>Chuyển khoản</HTTToan>',
		ghiChu ? `<TTKhac>${ttin('ProcessInvNote', ghiChu)}</TTKhac>` : '',
		'</TTChung><NDHDon>',
		`<NBan><Ten>AUTO NCC TINH</Ten><MST>${MST_NCC}</MST></NBan><NMua><Ten>Buu dien</Ten><MST>0110570676</MST></NMua>`,
		`<DSHHDVu>${hh}</DSHHDVu>`,
		tong == null ? '<TToan></TToan>' : `<TToan><TgTCThue>${net}</TgTCThue><TgTThue>${Number(tong) - net}</TgTThue><TgTTTBSo>${tong}</TgTTTBSo></TToan>`,
		'</NDHDon></DLHDon></HDon>',
	].join('\n');
}

function hom() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Các dòng hoá đơn KHỚP đợt `dot` (từ `batchItems` × dòng phiếu). `lech`: cộng thêm vào tiền dòng đầu. */
function dongKhop(dot, { lech = 0 } = {}) {
	return dot.dong.map((d, i) => ({ ten: d.ten, dvt: d.dvt, sl: d.sl, tien: d.tien + (i === 0 ? lech : 0) }));
}

// ───────── API ─────────
const goi = (p, method, duong, params = {}, data) => k.goiGhi(p.page, p.st, method, duong, params, data);

/** Nạp tệp XML cho đợt qua API multipart (đúng request của `Upload.Dragger`: field `file`, query `batchId`). */
async function napApi(p, batchId, noiDung, ten = 'hoa-don.xml') {
	const h = { ...p.st.h };
	delete h['content-type'];
	const multipart = noiDung === null ? { ghiChu: 'khong co file' } : { file: { name: ten, mimeType: 'text/xml', buffer: Buffer.isBuffer(noiDung) ? noiDung : Buffer.from(noiDung) } };
	const r = await p.page.request.fetch(`${BASE_URL}/__api${CN}/upload`, { method: 'POST', headers: h, params: { batchId }, multipart });
	return r.json().catch(async () => ({ status: { code: String(r.status()), message: (await r.text()).slice(0, 300) } }));
}

/** Nạp + assert 200 ⇒ trả chi tiết hoá đơn (đã đối soát). */
async function nap(p, batchId, noiDung) {
	const b = await napApi(p, batchId, noiDung);
	expect(String(b?.status?.code), `Nạp XML cho đợt ${batchId} lỗi: ${b?.status?.message}`).toBe('200');
	return b.data;
}

const chiTiet = async (p, id) => (await goi(p, 'GET', `${CN}/${id}`))?.data;
const hdCuaDot = async (p, batchId) => (await goi(p, 'GET', CN, { batchId }))?.data || [];

/** Gỡ mọi hoá đơn CHƯA chốt của đợt (dọn dẹp — không assert). */
async function goHet(p, batchId) {
	for (const n of await hdCuaDot(p, batchId).catch(() => [])) {
		if (n.settleStatus !== 'SETTLED') await goi(p, 'DELETE', `${CN}/${n.id}`);
	}
}

/** Thông báo BE bỏ đuôi mã request. */
const msg = rp.msg;

// ───────── Tìm đợt ─────────
const daDung = new Set();

/**
 * Đợt còn rảnh (`WAIT_CONFIRM`, chưa gắn hoá đơn) trong phạm vi phiên `p` — mặc định bỏ qua đợt đã cấp trong lượt này.
 * Trả { id, amount, status, batch, phieu: { id, code }, dong: [{ ten, dvt, sl, tien, itemId }] }.
 * `trangThai`: 'WAIT_CONFIRM' | 'CONFIRMED' | 'REJECTED'. `coHd`: true ⇒ lấy đợt ĐÃ gắn hoá đơn.
 */
async function dotRanh(p, { trangThai = 'WAIT_CONFIRM', coHd = false, giuLai = true } = {}) {
	for (let trang = 0; trang < 6; trang++) {
		const ds = (await goi(p, 'GET', API, { page: trang, size: 50 }))?.data || [];
		if (!ds.length) break;
		for (const r of ds.filter((x) => ['PARTIAL_PROCESSED', 'RETURNED', 'PROCESSED', 'COMPLETED'].includes(x.status) || x.supplierLevel)) {
			const bs = (await goi(p, 'GET', `${API}/${r.id}/supplier-batches`))?.data || [];
			for (const b of bs) {
				if (b.status !== trangThai || Boolean(b.creditNoteId) !== coHd || daDung.has(b.id)) continue;
				if (!b.stockInOutId) continue;
				const ct = await rp.chiTietPhieu(p.page, p.st, r.id);
				const items = new Map((ct?.items || []).map((it) => [it.id, it]));
				let bi = [];
				try {
					bi = JSON.parse(b.batchItems || '[]');
				} catch (_) {
					bi = [];
				}
				const dong = bi.map((x) => {
					const it = items.get(x.itemId) || {};
					return { itemId: x.itemId, ten: it.productName, dvt: it.unitName || 'Cái', sl: Number(x.quantity), tien: Math.round(Number(it.price) * Number(x.quantity)) };
				});
				if (!dong.length || dong.some((d) => !d.ten)) continue;
				if (giuLai) daDung.add(b.id);
				return { id: b.id, amount: Number(b.amount), status: b.status, batch: b, phieu: { id: r.id, code: r.code || ct?.request?.code }, dong };
			}
		}
	}
	throw new Error(`Hết đợt trả ${trangThai}${coHd ? ' đã gắn hoá đơn' : ' chưa gắn hoá đơn'} trong phạm vi vai — dựng thêm bằng 14_2 (phiếu con tỉnh → Trả NCC).`);
}

// ───────── Giao diện ─────────
/** Mở drawer chi tiết phiếu `code` trên danh sách (phiên chính đang ở màn phiếu trả) ⇒ trả drawer. */
async function moPhieu(page, code) {
	await rp.timMa(page, code);
	const row = rp.dong(page).filter({ hasText: code }).first();
	await expect(row, `Danh sách không có phiếu ${code}`).toBeVisible({ timeout: 20_000 });
	return rp.moChiTiet(page, row);
}

/** Thẻ đợt `#id` trong drawer chi tiết. */
function theDot(dr, id) {
	return dr.locator('.rounded-lg.border').filter({ has: dr.page().getByText(`Đợt #${id}`, { exact: true }) }).first();
}

/** Khối hoá đơn của thẻ đợt. */
const khoiHd = (the) => the.locator('.bg-gray-50').filter({ hasText: 'Hoá đơn điều chỉnh giảm' }).first();

/** Nhãn thẻ (Tag) trong khối hoá đơn, đã chuẩn hoá. */
async function nhanKhoi(khoi) {
	return (await khoi.locator('.ant-tag').allInnerTexts()).map(chuan).filter(Boolean);
}

/** Mở phiếu, trả { dr, the, khoi } của đợt. `coHd`: chờ khối nạp xong danh sách hoá đơn (true ⇒ có "Xem đối soát", false ⇒ có nút tiếp nhận). */
async function moKhoi(page, dot, { coHd } = {}) {
	const dr = await moPhieu(page, dot.phieu.code);
	const the = theDot(dr, dot.id);
	await expect(the, `Drawer phiếu ${dot.phieu.code} không có thẻ Đợt #${dot.id}`).toBeVisible({ timeout: 20_000 });
	const khoi = khoiHd(the);
	await expect(khoi, `Đợt #${dot.id} không có khối hoá đơn`).toBeVisible({ timeout: 20_000 });
	// 🔴 Khối vẽ trước khi GET danh sách hoá đơn về ⇒ đọc ngay là thấy "Chưa tiếp nhận" dù đợt đã có hoá đơn.
	if (coHd !== undefined) {
		await expect(khoi.getByRole('button', { name: coHd ? 'Xem đối soát' : 'Tiếp nhận hoá đơn NCC' }), `Khối đợt #${dot.id} không về trạng thái ${coHd ? 'đã có' : 'chưa có'} hoá đơn`).toBeVisible({ timeout: 20_000 });
	}
	return { dr, the, khoi };
}

/** Drawer đối soát (mở từ "Tiếp nhận hoá đơn NCC" / "Xem đối soát"). */
const drDoiSoat = (page) => page.locator('.ant-drawer-open').filter({ hasText: 'Đối soát hoá đơn điều chỉnh giảm với phiếu xuất kho trả NCC' }).last();

async function moDoiSoat(page, khoi, nut) {
	await khoi.getByRole('button', { name: nut }).click();
	const d = drDoiSoat(page);
	await expect(d).toBeVisible({ timeout: 20_000 });
	return d;
}

/** Giá trị ô Descriptions (bordered: nhãn ở `th`, giá trị ở `td` kế bên — 🚫 không có `.ant-descriptions-item` bọc). */
const oMoTa = (box, nhan) => box.locator('th.ant-descriptions-item-label').filter({ hasText: nhan }).first().locator('xpath=following-sibling::td[1]');

/** Nạp tệp qua vùng kéo thả của drawer; gom thông báo + response upload. */
async function napUi(page, d, files) {
	const cho = page.waitForResponse((r) => r.url().includes(`${CN}/upload`), { timeout: 30_000 }).catch(() => null);
	const tb = await rp.thongBao(page, async () => {
		await d.locator('input[type=file]').setInputFiles(files);
	}, 8_000);
	const res = await cho;
	if (!res) return { tb, body: null, http: null };
	const body = await res.json().catch(async () => ({ status: { code: `HTTP ${res.status()}`, message: (await res.text().catch(() => '')).slice(0, 200) } }));
	return { tb, body, http: res.status() };
}

/** Cột Kết quả từng dòng bảng đối soát chéo. */
async function ketQuaDong(d) {
	const bang = d.locator('.ant-table').first();
	const heads = (await bang.locator('thead th').allInnerTexts()).map(chuan);
	const i = heads.indexOf('Kết quả');
	return bang.locator('tbody tr.ant-table-row').evaluateAll((rs, i) => rs.map((r) => (r.children[i]?.textContent || '').normalize('NFC').trim()), i);
}

/** Chặn request ghi vào luồng hoá đơn (trả 403) — ghi lại những gì đã bị chặn. */
async function chanGhiHd(page, loc = /return-credit-note/) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET' || !loc.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	return daGoi;
}

/** Đóng mọi drawer/modal đang mở (Escape tới khi hết) — dùng giữa các vòng lặp trong một test. */
async function dongHet(page) {
	for (let i = 0; i < 5 && (await page.locator('.ant-drawer-open, .ant-modal-wrap:visible').count()); i++) {
		await page.keyboard.press('Escape');
		await page.waitForTimeout(600);
	}
}

module.exports = {
	...rp,
	dongHet,
	CN,
	MST_NCC,
	xmlHd,
	soMoi,
	dongKhop,
	napApi,
	nap,
	chiTiet,
	hdCuaDot,
	goHet,
	goi,
	msg,
	dotRanh,
	moPhieu,
	theDot,
	khoiHd,
	nhanKhoi,
	moKhoi,
	oMoTa,
	drDoiSoat,
	moDoiSoat,
	napUi,
	ketQuaDong,
	chanGhiHd,
};
