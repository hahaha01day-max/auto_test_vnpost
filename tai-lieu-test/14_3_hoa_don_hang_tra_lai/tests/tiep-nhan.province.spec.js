'use strict';

/**
 * 14_3 · 010 Tiếp nhận hoá đơn NCC — vai `province` (làn 8, HUB tỉnh).
 *
 * Nguồn: xem `fe-moc.json`. Tiền đề: đợt `WAIT_CONFIRM` chưa gắn hoá đơn (14_2 sinh). Mọi case nạp hoá đơn đều GỠ lại
 * trong `finally` ⇒ đợt quay về "Chưa tiếp nhận" (gỡ nhả `deleted_seq`, nạp lại được đúng số hoá đơn đó).
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

let pt = null;
let dot = null;
test.describe.configure({ timeout: 240_000 });
test.beforeEach(async ({ page }) => {
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh(VAI, page, st);
	pt = { page, st };
});

/** Một đợt dùng chung cả file — luôn gỡ sạch hoá đơn chưa chốt trước khi trả về. */
async function dotChung() {
	if (!dot) dot = await t.dotRanh(pt);
	await t.goHet(pt, dot.id);
	return dot;
}

test('14_3_010_001 — Khối hoá đơn của đợt hiện thẻ NCC phát hành và nút tiếp nhận', async ({ page }) => {
	chanNeuTat('14_3_010_001');
	const d = await dotChung();
	const { khoi } = await t.moKhoi(page, d);
	const nhan = await t.nhanKhoi(khoi);
	ghi(`Đợt #${d.id}: ${nhan.join(' / ')}`);
	expect(nhan).toContain('NCC phát hành');
	expect(nhan).toContain('Chưa tiếp nhận');
	await expect(khoi.getByRole('button', { name: 'Tiếp nhận hoá đơn NCC' })).toBeVisible();
	await expect(khoi.getByRole('button', { name: 'Phát hành hoá đơn' })).toHaveCount(0);
});

test('14_3_010_003 — Màn tiếp nhận mở đúng tiêu đề và dải căn cứ pháp lý', async ({ page }) => {
	chanNeuTat('14_3_010_003');
	const d = await dotChung();
	const { khoi } = await t.moKhoi(page, d);
	const dr = await t.moDoiSoat(page, khoi, 'Tiếp nhận hoá đơn NCC');
	const info = dr.locator('.ant-alert-info');
	await expect(info).toContainText('Đợt trả này chưa tiếp nhận hoá đơn điều chỉnh giảm');
	await expect(info).toContainText('Nghị định 70/2025/NĐ-CP');
	await expect(dr.locator('.ant-upload-drag')).toBeVisible();
	const vien = await dr.locator('.ant-upload-drag').evaluate((e) => getComputedStyle(e).borderStyle);
	expect(vien, 'Vùng kéo thả không có viền nét đứt').toBe('dashed');
});

test('14_3_010_004 — Tải XML hợp lệ, đối soát khớp', async ({ page }) => {
	chanNeuTat('14_3_010_004');
	const d = await dotChung();
	try {
		const { khoi } = await t.moKhoi(page, d);
		const dr = await t.moDoiSoat(page, khoi, 'Tiếp nhận hoá đơn NCC');
		const { tb, body } = await t.napUi(page, dr, { name: 'khop.xml', mimeType: 'text/xml', buffer: Buffer.from(t.xmlHd({ lines: t.dongKhop(d) })) });
		ghi(`thông báo: ${tb} · reconcile=${body?.data?.reconcileStatus}`);
		expect(tb).toContain('Đã đọc XML — đối soát KHỚP với phiếu xuất trả');
		await expect(dr.locator('.ant-alert-success')).toContainText('Hoá đơn khớp với phiếu xuất kho trả NCC', { timeout: 20_000 });
		await expect(dr.getByText('Đối soát chéo theo dòng hàng')).toBeVisible();
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_010_005 — Tải XML hợp lệ nhưng lệch', async ({ page }) => {
	chanNeuTat('14_3_010_005');
	const d = await dotChung();
	try {
		const { khoi } = await t.moKhoi(page, d);
		const dr = await t.moDoiSoat(page, khoi, 'Tiếp nhận hoá đơn NCC');
		const { tb } = await t.napUi(page, dr, { name: 'lech.xml', mimeType: 'text/xml', buffer: Buffer.from(t.xmlHd({ lines: t.dongKhop(d, { lech: -5000 }) })) });
		ghi(`thông báo: ${tb}`);
		expect(tb).toContain('Đã đọc XML — đối soát LỆCH, xem chi tiết bên dưới');
		await expect(dr.locator('.ant-alert-error')).toContainText('Hoá đơn lệch so với phiếu xuất kho trả NCC — không thể chốt chứng từ', { timeout: 20_000 });
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_010_006 — Tải XML chưa xác định được tính chất điều chỉnh', async ({ page }) => {
	chanNeuTat('14_3_010_006');
	const d = await dotChung();
	try {
		const { khoi } = await t.moKhoi(page, d);
		const dr = await t.moDoiSoat(page, khoi, 'Tiếp nhận hoá đơn NCC');
		// Không ghi chú ProcessInvNote, không TCDChinh, không TgTTTBSo ⇒ UNKNOWN.
		const { tb, body } = await t.napUi(page, dr, { name: 'unknown.xml', mimeType: 'text/xml', buffer: Buffer.from(t.xmlHd({ lines: t.dongKhop(d), dau: null, tong: null })) });
		ghi(`thông báo: ${tb} · adj=${body?.data?.adjustmentType} · BE: ${body?.status?.message}`);
		// 🔴 Đo 25/09: parser `number()` trả 0 khi thiếu TgTTTBSo ⇒ dấu suy ra KHONG_DOI (bị chặn), nhánh UNKNOWN không tới được.
		expect(body?.data?.adjustmentType, `Tệp không có TCDChinh / ProcessInvNote / TgTTTBSo không được nhận là "chưa xác định dấu" — BE: ${body?.status?.message}`).toBe('UNKNOWN');
		expect(tb).toContain('Đã đọc XML, chưa đối soát được — bấm Đối soát lại để xem lý do');
		await expect(dr.locator('.ant-alert-warning')).toContainText('Chưa xác định được hoá đơn điều chỉnh tăng hay giảm', { timeout: 20_000 });
		await expect(dr.locator('.ant-tag').filter({ hasText: 'Chưa xác định dấu' })).toBeVisible();
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_010_007 — Tệp vượt 10MB bị chặn ngay tại giao diện', async ({ page }) => {
	chanNeuTat('14_3_010_007');
	const d = await dotChung();
	const daGoi = await t.chanGhiHd(page);
	const { khoi } = await t.moKhoi(page, d);
	const dr = await t.moDoiSoat(page, khoi, 'Tiếp nhận hoá đơn NCC');
	const buf = Buffer.alloc(10 * 1024 * 1024 + 1024, 0x20);
	const { tb } = await t.napUi(page, dr, { name: 'qua-lon.xml', mimeType: 'text/xml', buffer: buf });
	ghi(`thông báo: ${tb}`);
	expect(tb).toContain('File "qua-lon.xml" vượt quá 10MB.');
	expect(daGoi, 'Tệp quá lớn mà FE vẫn gửi POST upload').toEqual([]);
});

test('14_3_010_008 — Tệp đúng 10MB được chấp nhận', async ({ page }) => {
	chanNeuTat('14_3_010_008');
	const d = await dotChung();
	try {
		const { khoi } = await t.moKhoi(page, d);
		const dr = await t.moDoiSoat(page, khoi, 'Tiếp nhận hoá đơn NCC');
		// Đệm bằng chú thích XML tới đúng 10MB (FE chặn khi size > 10MB ⇒ đúng 10MB phải qua).
		const goc = t.xmlHd({ lines: t.dongKhop(d) });
		const dem = 10 * 1024 * 1024 - Buffer.byteLength(goc) - 8;
		const buf = Buffer.from(`${goc}\n<!--${' '.repeat(dem)}-->`);
		expect(buf.length).toBe(10 * 1024 * 1024);
		const { tb, body, http } = await t.napUi(page, dr, { name: 'dung-10mb.xml', mimeType: 'text/xml', buffer: buf });
		ghi(`thông báo: ${tb} · HTTP ${http} · code=${body?.status?.code} ${body?.status?.message ?? ''}`);
		expect(tb, 'Tệp đúng 10MB bị FE báo vượt dung lượng').not.toContain('vượt quá 10MB');
		expect(body, 'Tệp đúng 10MB không được gửi lên hệ thống').not.toBeNull();
		// "Được chấp nhận" = hệ thống nhận tệp, 🚫 không chỉ là FE không chặn. Đo 25/09: nginx trả 413 ⇒ người dùng thấy "Đọc XML thất bại".
		expect(http, `FE cho phép tới 10MB nhưng máy chủ từ chối tệp: ${body?.status?.code} ${String(body?.status?.message).slice(0, 80)}`).not.toBe(413);
		expect(String(body?.status?.code), `Tệp 10MB hợp lệ không nạp được: ${body?.status?.message}`).toBe('200');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_010_009 — Tệp không đọc được bị chặn', async ({ page }) => {
	chanNeuTat('14_3_010_009');
	const d = await dotChung();
	try {
		const { khoi } = await t.moKhoi(page, d);
		const dr = await t.moDoiSoat(page, khoi, 'Tiếp nhận hoá đơn NCC');
		const { tb } = await t.napUi(page, dr, { name: 'hong.xml', mimeType: 'text/xml', buffer: Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj <<>> endobj\n') });
		ghi(`thông báo: ${tb}`);
		expect(/Đọc XML thất bại|Không đọc được nội dung tệp hoá đơn:/.test(tb), `Thông báo thật: "${tb}"`).toBe(true);
		expect(await t.hdCuaDot(pt, d.id), 'Tệp hỏng mà vẫn neo hoá đơn vào đợt').toEqual([]);
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_010_010 — Gửi lên mà không kèm tệp bị chặn', async () => {
	chanNeuTat('14_3_010_010');
	const d = await dotChung();
	// Part `file` rỗng ⇒ đi đúng nhánh kiểm `file.isEmpty()` của service.
	const b = await t.napApi(pt, d.id, Buffer.alloc(0), 'rong.xml');
	// Thiếu hẳn part `file` ⇒ Spring chặn trước service (MissingServletRequestPart) — chỉ ghi lại để đối chiếu.
	const khong = await t.napApi(pt, d.id, null);
	ghi(`tệp rỗng: ${JSON.stringify(b?.status)} · không có part file: ${JSON.stringify(khong?.status)}`);
	await t.goHet(pt, d.id);
	expect(t.msg(b)).toBe('Chưa chọn tệp hoá đơn');
});

/** Nạp tệp cho đợt chung qua API, trả thông báo BE; tự gỡ nếu lỡ nạp được. */
async function napLoi(xml) {
	const d = await dotChung();
	try {
		const b = await t.napApi(pt, d.id, xml);
		ghi(`${b?.status?.code} ${b?.status?.message}`);
		return b;
	} finally {
		await t.goHet(pt, d.id);
	}
}

test('14_3_010_011 — Hoá đơn không phải loại điều chỉnh bị chặn', async () => {
	chanNeuTat('14_3_010_011');
	const d = await dotChung();
	const goc = await napLoi(t.xmlHd({ lines: t.dongKhop(d), tchdon: null }));
	const thay = await napLoi(t.xmlHd({ lines: t.dongKhop(d), tchdon: '1' }));
	expect(t.msg(goc)).toBe('Tệp không phải hoá đơn điều chỉnh (nhận được: GOC)');
	expect(t.msg(thay)).toBe('Tệp không phải hoá đơn điều chỉnh (nhận được: THAY_THE)');
});

test('14_3_010_012 — Hoá đơn điều chỉnh TĂNG bị chặn', async () => {
	chanNeuTat('14_3_010_012');
	const d = await dotChung();
	const b = await napLoi(t.xmlHd({ lines: t.dongKhop(d), dau: 'TANG' }));
	expect(t.msg(b)).toBe('Hoá đơn điều chỉnh TANG không dùng được cho trả hàng (cần điều chỉnh GIẢM)');
});

test('14_3_010_013 — Hoá đơn điều chỉnh KHÔNG ĐỔI GIÁ TRỊ bị chặn', async () => {
	chanNeuTat('14_3_010_013');
	const d = await dotChung();
	const b = await napLoi(t.xmlHd({ lines: t.dongKhop(d), dau: null, tcdc: '0' }));
	expect(t.msg(b)).toBe('Hoá đơn điều chỉnh KHONG_DOI không dùng được cho trả hàng (cần điều chỉnh GIẢM)');
});

test('14_3_010_014 — Hoá đơn không có dòng hàng hoá bị chặn ngay lúc nạp', async () => {
	chanNeuTat('14_3_010_014');
	const d = await dotChung();
	// TChat 3 = chiết khấu thương mại, 4 = ghi chú/diễn giải ⇒ BE bỏ qua dòng.
	const b = await napLoi(t.xmlHd({ lines: [{ ten: 'Chiet khau', dvt: 'Cái', sl: 1, tien: 1000, tchat: 3 }, { ten: 'Dien giai', dvt: '', sl: 0, tien: 0, tchat: 4 }] }));
	expect(t.msg(b)).toBe('Hoá đơn không có dòng hàng hoá nào đọc được — kiểm tra lại tệp XML');
	expect(await t.hdCuaDot(pt, d.id), 'Hoá đơn không dòng hàng vẫn bị neo vào đợt').toEqual([]);
});

test('14_3_010_015 — Hoá đơn trùng trong hệ thống bị chặn', async () => {
	chanNeuTat('14_3_010_015');
	const d = await dotChung();
	const d2 = await t.dotRanh(pt);
	const so = t.soMoi();
	try {
		await t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d), so }));
		const b = await t.napApi(pt, d2.id, t.xmlHd({ lines: t.dongKhop(d2), so }));
		ghi(`${b?.status?.code} ${b?.status?.message}`);
		expect(t.msg(b)).toBe('Hoá đơn đã tồn tại trong hệ thống (trùng MST người bán + ký hiệu + số)');
	} finally {
		await t.goHet(pt, d.id);
		await t.goHet(pt, d2.id);
	}
});

test('14_3_010_016 — Đợt đã gắn hoá đơn không nạp thêm được', async () => {
	chanNeuTat('14_3_010_016');
	const d = await dotChung();
	try {
		await t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d) }));
		const b = await t.napApi(pt, d.id, t.xmlHd({ lines: t.dongKhop(d) }));
		ghi(`${b?.status?.code} ${b?.status?.message}`);
		expect(t.msg(b)).toBe('Đợt trả đã gắn hoá đơn điều chỉnh, không thể nạp thêm');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_010_017 — Tiếp nhận cho đợt không ở trạng thái chờ xác nhận bị chặn', async () => {
	chanNeuTat('14_3_010_017');
	const r = await t.dotRanh(pt, { trangThai: 'REJECTED', giuLai: false });
	const b = await t.napApi(pt, r.id, t.xmlHd({ lines: t.dongKhop(r) }));
	ghi(`đợt #${r.id} REJECTED: ${b?.status?.code} ${b?.status?.message}`);
	await t.goHet(pt, r.id);
	expect(t.msg(b)).toBe('Đợt trả không ở trạng thái chờ xác nhận');
});

test('14_3_010_019 — Chỉ tải được một tệp mỗi lần', async ({ page }) => {
	chanNeuTat('14_3_010_019');
	const d = await dotChung();
	const daGoi = await t.chanGhiHd(page);
	const { khoi } = await t.moKhoi(page, d);
	const dr = await t.moDoiSoat(page, khoi, 'Tiếp nhận hoá đơn NCC');
	const input = dr.locator('input[type=file]');
	expect(await input.getAttribute('multiple'), 'Ô chọn tệp cho chọn nhiều tệp').toBeNull();
	const f = (n) => ({ name: `${n}.xml`, mimeType: 'text/xml', buffer: Buffer.from(t.xmlHd({ lines: t.dongKhop(d) })) });
	const loi = await input.setInputFiles([f('a'), f('b')]).then(() => null, (e) => e.message);
	await page.waitForTimeout(3_000);
	ghi(`setInputFiles 2 tệp: ${loi ?? 'nhận'} · POST: ${daGoi.length}`);
	expect(daGoi.length, 'Chọn 2 tệp mà FE gửi hơn một request upload').toBeLessThanOrEqual(1);
});

test('14_3_010_020 — Đóng màn tiếp nhận trước khi tải không ghi gì', async ({ page }) => {
	chanNeuTat('14_3_010_020');
	const d = await dotChung();
	const daGoi = await t.chanGhiHd(page);
	const { khoi } = await t.moKhoi(page, d);
	const dr = await t.moDoiSoat(page, khoi, 'Tiếp nhận hoá đơn NCC');
	await dr.locator('.ant-drawer-close').click();
	await expect(dr).toBeHidden();
	expect(await t.nhanKhoi(khoi)).toContain('Chưa tiếp nhận');
	expect(daGoi).toEqual([]);
});

test('14_3_010_018 — Hoá đơn đến qua hộp thư điện tử hiện đúng nguồn tiếp nhận', async () => {
	chanNeuTat('14_3_010_018');
	// Nhãn FE đã có: source MAIL ⇒ "Nhận qua email" (CreditNoteReconcileDrawer SOURCE_LABEL). Thiếu là đường dữ liệu vào.
	test.skip(true, 'Chưa dựng được tiền đề: hoá đơn nguồn MAIL chỉ sinh khi job IMAP của pod đọc thư NCC gửi vào hòm thư đơn vị rồi tự ghép đợt trả — không có API/giao diện nạp với source=MAIL, làn test không có hòm thư cấu hình. Cần user cho hòm thư test (hoặc chốt bỏ case).');
});
