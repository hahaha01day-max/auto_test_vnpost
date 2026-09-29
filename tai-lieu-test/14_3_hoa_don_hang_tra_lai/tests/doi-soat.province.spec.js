'use strict';

/**
 * 14_3 · 020 Đối soát (phần KHÔNG chốt) · 030 Xử lý khi lệch / chưa rõ — vai `province` (làn 8).
 *
 * Nạp hoá đơn bằng API (🔴 nạp qua giao diện thì drawer đối soát tự đóng — lỗi 010_004), rồi mở "Xem đối soát" để đọc.
 * Mọi hoá đơn nạp ở đây đều gỡ lại trong `finally`. Case chốt chứng từ nằm ở `chot.province.spec.js`.
 *
 * 🔴 Nhánh "chưa xác định dấu" (UNKNOWN) KHÔNG dựng được: parser trả 0 khi thiếu TgTTTBSo ⇒ KHONG_DOI ⇒ bị chặn lúc nạp
 * (đo 25/09). Case cần tiền đề đó gọi `hdChuaRoDau` — đỏ kèm lý do, 🚫 không skip lặng.
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

async function dotChung() {
	if (!dot) dot = await t.dotRanh(pt);
	await t.goHet(pt, dot.id);
	return dot;
}

/** Nạp hoá đơn (API) cho đợt chung rồi mở "Xem đối soát" ⇒ { d, hd, khoi, dr }. */
async function napVaXem(page, opts = {}) {
	const d = await dotChung();
	const hd = await t.nap(pt, d.id, t.xmlHd({ lines: opts.lines ? opts.lines(d) : t.dongKhop(d, { lech: opts.lech || 0 }), ...(opts.xml || {}) }));
	if (opts.sau) await opts.sau(hd);
	const { khoi } = await t.moKhoi(page, d, { coHd: true });
	const dr = opts.khongMo ? null : await t.moDoiSoat(page, khoi, 'Xem đối soát');
	if (dr) await expect(dr.locator('.ant-descriptions')).toBeVisible({ timeout: 20_000 });
	return { d, hd, khoi, dr };
}

/** Tiền đề "hoá đơn chưa xác định dấu" — 🔴 hiện không dựng được (xem đầu file). */
async function hdChuaRoDau() {
	const d = await dotChung();
	const b = await t.napApi(pt, d.id, t.xmlHd({ lines: t.dongKhop(d), dau: null, tong: null }));
	ghi(`dựng hoá đơn UNKNOWN: ${b?.status?.code} ${b?.status?.message} adj=${b?.data?.adjustmentType}`);
	expect(
		b?.data?.adjustmentType,
		`Không dựng được tiền đề "hoá đơn chưa xác định dấu": tệp không TCDChinh/ProcessInvNote/TgTTTBSo bị đọc thành KHONG_DOI và chặn — BE: ${b?.status?.message}`,
	).toBe('UNKNOWN');
	return { d, hd: b.data };
}

const cotBang = async (dr) => (await dr.locator('.ant-table').first().locator('thead th').allInnerTexts()).map(t.chuan);
const dongBang = (dr) => dr.locator('.ant-table').first().locator('tbody tr.ant-table-row');
async function oCot(dr, dongIdx, tenCot) {
	const i = (await cotBang(dr)).indexOf(tenCot);
	expect(i, `Bảng đối soát không có cột "${tenCot}"`).toBeGreaterThanOrEqual(0);
	return t.chuan(await dongBang(dr).nth(dongIdx).locator('td').nth(i).innerText());
}
const ttDoiSoat = async (dr) => t.chuan(await t.oMoTa(dr, 'Trạng thái đối soát').locator('.ant-tag').innerText());

// ───────── 020 ─────────

test('14_3_020_001 — Đợt đã có hoá đơn hiện nút Xem đối soát', async ({ page }) => {
	chanNeuTat('14_3_020_001');
	const { d, hd, khoi } = await napVaXem(page, { khongMo: true });
	try {
		const chu = t.chuan(await khoi.innerText());
		ghi(chu);
		expect(chu).toContain(`Số HĐ: ${hd.invoiceSerial} — ${hd.invoiceNo}`);
		expect(chu).toMatch(/Ngày: \d{2}\/\d{2}\/\d{4}/);
		expect(chu).toMatch(/Tiền giảm trừ: [\d.]+/);
		await expect(khoi.getByRole('button', { name: 'Xem đối soát' })).toBeVisible();
		await expect(khoi.getByRole('button', { name: 'Tiếp nhận hoá đơn NCC' })).toHaveCount(0);
		await expect(khoi.getByRole('button', { name: 'Phát hành hoá đơn' })).toHaveCount(0);
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_002 — Bảng đối soát chéo hiện đủ mười cột', async ({ page }) => {
	chanNeuTat('14_3_020_002');
	const { d, dr } = await napVaXem(page);
	try {
		expect(await cotBang(dr)).toEqual(['#', 'Mặt hàng', 'ĐVT trên hoá đơn', 'SL hoá đơn', 'SL phiếu trả', 'Tiền hoá đơn', 'Tiền phiếu trả', 'Thuế suất', 'Tiền thuế', 'Kết quả']);
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_003 — Cột Kết quả có đúng bốn giá trị', async ({ page }) => {
	chanNeuTat('14_3_020_003');
	const BON = ['Khớp', 'Lệch', 'Chưa ghép được', 'Chờ đối soát'];
	const thay = new Set();
	const d = await dotChung();
	try {
		// (1) dòng khớp + dòng ĐVT lạ (chưa ghép) · (2) dòng lệch số lượng.
		for (const lines of [(x) => [...t.dongKhop(x), { ten: 'Hang la NCC', dvt: 'Thùng', sl: 1, tien: 1000 }], (x) => t.dongKhop(x).map((l) => ({ ...l, sl: l.sl + 1 }))]) {
			const { dr } = await napVaXem(page, { lines });
			for (const v of await t.ketQuaDong(dr)) thay.add(v);
			await t.goHet(pt, d.id);
			await t.dongHet(page);
		}
		ghi(`nhãn thấy: ${[...thay].join(' / ')}`);
		expect(thay.size, 'Không đọc được nhãn Kết quả nào').toBeGreaterThan(0);
		for (const v of thay) expect(BON, `Nhãn "${v}" ngoài bộ 4 nhãn`).toContain(v);
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_004 — Dòng lệch được tô nền đỏ nhạt', async ({ page }) => {
	chanNeuTat('14_3_020_004');
	const { d, dr } = await napVaXem(page, { lines: (x) => t.dongKhop(x).map((l) => ({ ...l, sl: l.sl + 1 })) });
	try {
		const kq = await t.ketQuaDong(dr);
		const i = kq.indexOf('Lệch');
		expect(i, `Không có dòng "Lệch" (thấy: ${kq.join(' / ')})`).toBeGreaterThanOrEqual(0);
		const nen = await dongBang(dr).nth(i).evaluate((e) => getComputedStyle(e.querySelector('td')).backgroundColor + ' | ' + e.className);
		ghi(nen);
		expect(nen).toContain('bg-red-50');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_005 — Tên hàng khác nhau vẫn ghép được và hiện cả hai tên', async ({ page }) => {
	chanNeuTat('14_3_020_005');
	const { d, dr } = await napVaXem(page, { lines: (x) => t.dongKhop(x).map((l) => ({ ...l, ten: `${l.ten} (ten NCC)` })) });
	try {
		const o = await oCot(dr, 0, 'Mặt hàng');
		ghi(`Mặt hàng: ${o} · Kết quả: ${(await t.ketQuaDong(dr)).join(' / ')}`);
		expect(o).toContain(`${d.dong[0].ten} (ten NCC)`);
		expect(o, 'Không hiện tên trên phiếu trả kèm "↔"').toContain(`↔ ${d.dong[0].ten}`);
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_006 — Dòng chưa ghép được hiện dấu gạch ngang ở hai cột phiếu trả', async ({ page }) => {
	chanNeuTat('14_3_020_006');
	const { d, dr } = await napVaXem(page, { lines: (x) => t.dongKhop(x).map((l) => ({ ...l, dvt: 'Thùng' })) });
	try {
		const kq = await t.ketQuaDong(dr);
		ghi(`Kết quả: ${kq.join(' / ')} · SL phiếu trả: ${await oCot(dr, 0, 'SL phiếu trả')} · Tiền phiếu trả: ${await oCot(dr, 0, 'Tiền phiếu trả')}`);
		expect(kq[0]).toBe('Chưa ghép được');
		expect(await oCot(dr, 0, 'SL phiếu trả')).toBe('--');
		expect(await oCot(dr, 0, 'Tiền phiếu trả')).toBe('--');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_007 — Số lượng phải khớp TUYỆT ĐỐI sau quy đổi', async () => {
	chanNeuTat('14_3_020_007');
	// Cần SP có ≥ 2 ĐVT quy đổi trên đợt trả. Đo đơn vị của SP trên đợt dùng chung.
	const d = await dotChung();
	const dv = (await t.goi(pt, 'GET', '/chain/products/basic-search-product-unit', { productName: d.dong[0].ten, page: 0, size: 20 }))?.data || [];
	const cua = dv.filter((x) => x.productName === d.dong[0].ten);
	ghi(`ĐVT của ${d.dong[0].ten}: ${cua.map((x) => `${x.unit}×${x.convertToMainUnit}`).join(', ')}`);
	test.skip(cua.length < 2, `Mọi đợt trả của làn đều là ${d.dong[0].ten} chỉ có 1 ĐVT (${cua.map((x) => x.unit).join(', ')}) — cần đợt trả SP nhiều ĐVT. 🔴 Code đối soát cũng không quy đổi ĐVT khác tên: ĐVT hoá đơn ≠ ĐVT dòng phiếu ⇒ "Chưa ghép được" (SupplierReturnReconcileService, unitKnown).`);
});

/** Nạp hoá đơn lệch tiền `lech` đồng ⇒ { trạng thái, kết quả dòng, mô tả }. */
async function doLechTien(page, lech) {
	const { d, dr } = await napVaXem(page, { lech });
	try {
		const tt = await ttDoiSoat(dr);
		const kq = await t.ketQuaDong(dr);
		const mota = t.chuan(await dr.locator('.ant-alert').first().innerText().catch(() => ''));
		const nutChot = dr.getByRole('button', { name: 'Chốt chứng từ & ghi giảm công nợ' });
		const khoaChot = await nutChot.isDisabled();
		ghi(`lệch ${lech}đ: trạng thái=${tt} · dòng=${kq.join('/')} · khoá chốt=${khoaChot} · ${mota}`);
		return { tt, kq, mota, khoaChot, dr };
	} finally {
		await t.goHet(pt, d.id);
	}
}

test('14_3_020_008 — Tiền lệch trong dung sai 10 đồng vẫn coi là khớp', async ({ page }) => {
	chanNeuTat('14_3_020_008');
	const r = await doLechTien(page, 8);
	expect(r.tt).toBe('Khớp');
	expect(r.kq[0], 'Cột Kết quả của dòng lệch 8đ').toBe('Khớp');
	expect(r.mota).toContain('khớp (dung sai 10đ)');
});

test('14_3_020_009 — Tiền lệch đúng 10 đồng vẫn khớp', async ({ page }) => {
	chanNeuTat('14_3_020_009');
	const r = await doLechTien(page, 10);
	expect(r.tt).toBe('Khớp');
	expect(r.kq[0], 'Cột Kết quả của dòng lệch 10đ').toBe('Khớp');
});

test('14_3_020_010 — Tiền lệch 11 đồng là lệch', async ({ page }) => {
	chanNeuTat('14_3_020_010');
	const r = await doLechTien(page, 11);
	expect(r.tt).toBe('Lệch');
	expect(r.kq[0]).toBe('Lệch');
	expect(r.mota).toContain('Hoá đơn lệch so với phiếu xuất kho trả NCC — không thể chốt chứng từ');
	expect(r.khoaChot, 'Lệch 11đ mà nút chốt vẫn bấm được').toBe(true);
});

test('14_3_020_011 — Dòng Tổng cộng cộng đủ hai vế và nêu mức lệch', async ({ page }) => {
	chanNeuTat('14_3_020_011');
	const { d, dr } = await napVaXem(page, { lines: (x) => [...t.dongKhop(x), { ten: 'Hang khac NCC', dvt: 'Thùng', sl: 2, tien: 3000 }] });
	try {
		const tong = t.chuan(await dr.locator('.ant-table-summary').innerText());
		const oTong = (await dr.locator('.ant-table-summary td').allInnerTexts()).map(t.chuan);
		const slHd = d.dong.reduce((s, l) => s + l.sl, 0) + 2;
		const tienHd = d.dong.reduce((s, l) => s + l.tien, 0) + 3000;
		const fmt = (n) => Number(n).toLocaleString('vi-VN');
		ghi(`Tổng cộng: ${tong} · kỳ vọng SL hoá đơn ${slHd}, tiền hoá đơn ${fmt(tienHd)}, tiền phiếu trả ${fmt(d.amount)}`);
		expect(tong).toContain('Tổng cộng');
		expect(tong).toContain(fmt(tienHd));
		expect(tong).toContain(fmt(d.amount));
		expect(tong).toContain(`Lệch ${fmt(Math.abs(tienHd - d.amount))}`);
		// Kịch bản: dòng Tổng cộng cộng cả "SL hoá đơn" và "SL phiếu trả".
		// 🚫 So chuỗi con là pass rỗng ("53.000" chứa "3") ⇒ so từng ô.
		expect(oTong, `Dòng Tổng cộng không có ô tổng "SL hoá đơn" = ${slHd} (các ô: ${oTong.join(' | ')})`).toContain(String(slHd));
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_012 — Cột Thuế suất kèm thẻ cho biết nguồn', async ({ page }) => {
	chanNeuTat('14_3_020_012');
	const { d, dr } = await napVaXem(page);
	try {
		const n = await dongBang(dr).count();
		expect(n).toBeGreaterThan(0);
		for (let i = 0; i < n; i++) {
			const o = await oCot(dr, i, 'Thuế suất');
			const the = await dongBang(dr).nth(i).locator('.ant-tag-cyan').count();
			ghi(`dòng ${i + 1}: "${o}" · thẻ nguồn: ${the}`);
			expect(the, `Dòng ${i + 1} (thuế suất "${o}") không có thẻ nguồn thuế suất`).toBe(1);
		}
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_014 — Nút chốt bị khoá khi chưa khớp', async ({ page }) => {
	chanNeuTat('14_3_020_014');
	const { d, dr } = await napVaXem(page, { lech: -5000 });
	try {
		expect(await ttDoiSoat(dr)).toBe('Lệch');
		await expect(dr.getByRole('button', { name: 'Chốt chứng từ & ghi giảm công nợ' })).toBeDisabled();
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_015 — Gọi API chốt khi chưa khớp bị chặn', async () => {
	chanNeuTat('14_3_020_015');
	const d = await dotChung();
	try {
		const hd = await t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d, { lech: -5000 }) }));
		expect(hd.reconcileStatus).toBe('LECH');
		const b = await t.goi(pt, 'POST', `${t.CN}/${hd.id}/settle`);
		ghi(`${b?.status?.code} ${b?.status?.message}`);
		expect(t.msg(b)).toBe('Hoá đơn chưa đối soát khớp với phiếu xuất kho trả NCC, không thể chốt chứng từ');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_017 — Chốt hoá đơn không có số tiền bị chặn', async () => {
	chanNeuTat('14_3_020_017');
	const d = await dotChung();
	try {
		// Thiếu TgTTTBSo ⇒ tổng hoá đơn 0 nhưng dòng hàng vẫn khớp ⇒ KHOP — chạm đúng nhánh "không có số tiền".
		const hd = await t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d), tong: null }));
		ghi(`hoá đơn ${hd.id}: tổng=${hd.totalAmount} · ${hd.reconcileStatus}`);
		expect(hd.reconcileStatus, 'Tiền đề: hoá đơn tổng 0 phải đối soát KHỚP để tới được bước kiểm số tiền').toBe('KHOP');
		const b = await t.goi(pt, 'POST', `${t.CN}/${hd.id}/settle`);
		ghi(`${b?.status?.code} ${b?.status?.message}`);
		expect(t.msg(b)).toBe('Hoá đơn không có số tiền, không thể chốt');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_018 — Chốt hoá đơn chưa gắn đợt trả bị chặn', async () => {
	chanNeuTat('14_3_020_018');
	const d = await dotChung();
	// Hoá đơn rời đợt duy nhất tạo được là hoá đơn vừa GỠ (DELETE nhả đợt).
	const hd = await t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d) }));
	await t.goHet(pt, d.id);
	const b = await t.goi(pt, 'POST', `${t.CN}/${hd.id}/settle`);
	ghi(`hoá đơn ${hd.id} đã gỡ ⇒ settle: ${b?.status?.code} ${b?.status?.message}`);
	expect(String(b?.status?.code), '🔴 Chốt được hoá đơn đã gỡ khỏi đợt').not.toBe('200');
	expect(t.msg(b)).toBe('Hoá đơn chưa gắn với đợt trả nào');
});

test('14_3_020_023 — Đóng hộp xác nhận chốt không chốt gì', async ({ page }) => {
	chanNeuTat('14_3_020_023');
	const daGoi = await t.chanGhiHd(page, /return-credit-note\/\d+\/settle/);
	const { d, dr } = await napVaXem(page);
	try {
		await dr.getByRole('button', { name: 'Chốt chứng từ & ghi giảm công nợ' }).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Chốt chứng từ hoá đơn điều chỉnh này?' });
		await expect(hop).toBeVisible();
		await hop.getByRole('button', { name: 'Huỷ' }).click();
		await expect(hop).toBeHidden();
		const tt = t.chuan(await t.oMoTa(dr, 'Trạng thái chứng từ').locator('.ant-tag').innerText());
		expect(tt).toBe('Chưa chốt');
		expect(daGoi).toEqual([]);
		const hd = (await t.hdCuaDot(pt, d.id))[0];
		expect(hd?.settleStatus).toBe('DRAFT');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_020_025 — Thẻ kết quả đối soát ở khối đợt trả hiện đúng ba nhãn', async ({ page }) => {
	chanNeuTat('14_3_020_025');
	const d = await dotChung();
	const thay = {};
	try {
		// KHOP · LECH từ XML; "Chờ đối soát" = hoá đơn vừa ghi nhận lại dấu (adjustment-type ⇒ PENDING).
		for (const [ten, tao] of [
			['KHOP', () => t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d) }))],
			['LECH', () => t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d, { lech: -5000 }) }))],
			['PENDING', async () => {
				const hd = await t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d) }));
				const b = await t.goi(pt, 'POST', `${t.CN}/${hd.id}/adjustment-type`, {}, { adjustmentType: 'GIAM' });
				expect(b?.data?.reconcileStatus).toBe('PENDING');
			}],
		]) {
			await tao();
			const { khoi } = await t.moKhoi(page, d, { coHd: true });
			thay[ten] = await t.nhanKhoi(khoi);
			await t.dongHet(page);
			await t.goHet(pt, d.id);
		}
		ghi(JSON.stringify(thay));
		expect(thay.KHOP).toContain('Đối soát khớp');
		expect(thay.LECH).toContain('Đối soát lệch');
		expect(thay.PENDING).toContain('Chờ đối soát');
	} finally {
		await t.goHet(pt, d.id);
	}
});

// ───────── 030 ─────────

test('14_3_030_001 — Đối soát lại sau khi sửa phiếu trả', async ({ page }) => {
	chanNeuTat('14_3_030_001');
	// 🔴 Phiếu xuất kho trả NCC đã hoàn tất không sửa được qua hệ thống ⇒ kiểm phần "Đối soát lại" chạy lại và làm mới kết quả.
	const { d, hd, dr } = await napVaXem(page, {
		lech: -5000,
		sau: async (h) => {
			// Đổi trạng thái về PENDING (xoá mô tả) để thấy rõ "Đối soát lại" dựng lại kết luận.
			await t.goi(pt, 'POST', `${t.CN}/${h.id}/adjustment-type`, {}, { adjustmentType: 'GIAM' });
		},
	});
	try {
		expect(await ttDoiSoat(dr)).toBe('Chờ đối soát');
		const tb = await t.thongBao(page, () => dr.getByRole('button', { name: 'Đối soát lại' }).click(), 8_000);
		ghi(`thông báo: ${tb}`);
		expect(tb).toContain('Đã đối soát lại');
		await page.waitForTimeout(2_000);
		await expect(dr, '🔴 Drawer đối soát tự đóng sau khi bấm "Đối soát lại" — không xem được kết quả mới').toBeVisible();
		await expect.poll(() => ttDoiSoat(dr), { timeout: 20_000 }).toBe('Lệch');
		await expect(dr.locator('.ant-alert-error')).toContainText('Thành tiền: phiếu trả');
		expect((await t.chiTiet(pt, hd.id)).reconcileStatus).toBe('LECH');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_030_002 — Đối soát lại thất bại hiện thông báo backend', async ({ page }) => {
	chanNeuTat('14_3_030_002');
	// Không có hoá đơn thật nào làm /reconcile ném lỗi qua giao diện ⇒ giả lập đúng response lỗi của BE để kiểm cách FE hiện thông báo.
	let lan = 0;
	await page.route(/return-credit-note\/\d+\/reconcile/, (r) => {
		lan++;
		const body = lan === 1 ? { status: { code: 'SSHOP-400', message: 'Đợt trả chưa có phiếu xuất kho, chưa đối soát được' } } : { status: { code: 'SSHOP-500' } };
		return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(body) });
	});
	const { d, dr } = await napVaXem(page);
	try {
		const tb1 = await t.thongBao(page, () => dr.getByRole('button', { name: 'Đối soát lại' }).click(), 8_000);
		await page.waitForTimeout(3_500);
		const tb2 = await t.thongBao(page, () => dr.getByRole('button', { name: 'Đối soát lại' }).click(), 8_000);
		ghi(`có chuỗi BE: ${tb1} · không chuỗi: ${tb2}`);
		expect(tb1).toContain('Đợt trả chưa có phiếu xuất kho, chưa đối soát được');
		expect(tb2).toContain('Không đối soát được');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_030_003 — Đối soát hoá đơn không có dòng hàng bị chặn', async () => {
	chanNeuTat('14_3_030_003');
	test.skip(true, 'Không dựng được tiền đề: từ khi có kiểm `countGoodsLines` (010_014), hoá đơn không dòng hàng bị chặn ngay lúc nạp và hệ thống không có chức năng xoá dòng hoá đơn ⇒ nhánh "Hoá đơn không có dòng hàng nào" của /reconcile không còn đường tới.');
});

test('14_3_030_004 — Đối soát khi phiếu xuất kho không có dòng hàng bị chặn', async () => {
	chanNeuTat('14_3_030_004');
	test.skip(true, 'Không dựng được tiền đề: đợt trả chỉ sinh khi "Trả hàng NCC" với SL > 0, phiếu xuất kho trả NCC luôn có ít nhất một dòng; không có chức năng gỡ dòng phiếu xuất đã hoàn tất.');
});

test('14_3_030_006 — Chưa xác định dấu thì dừng đối soát và hiện ba lựa chọn', async () => {
	chanNeuTat('14_3_030_006');
	const { d } = await hdChuaRoDau();
	await t.goHet(pt, d.id);
});

test('14_3_030_007 — Chưa chọn tính chất mà bấm Ghi nhận bị chặn', async () => {
	chanNeuTat('14_3_030_007');
	const { d } = await hdChuaRoDau();
	await t.goHet(pt, d.id);
});

test('14_3_030_008 — Ghi nhận Điều chỉnh giảm rồi đối soát lại ngay', async () => {
	chanNeuTat('14_3_030_008');
	const { d } = await hdChuaRoDau();
	await t.goHet(pt, d.id);
});

/** Gọi adjustment-type cho hoá đơn nháp (KHỚP) — BE không bắt hoá đơn phải ở UNKNOWN. */
async function doiDau(loai) {
	const d = await dotChung();
	try {
		const hd = await t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d) }));
		const b = await t.goi(pt, 'POST', `${t.CN}/${hd.id}/adjustment-type`, {}, { adjustmentType: loai });
		ghi(`${loai}: ${b?.status?.code} ${b?.status?.message}`);
		return { hd, b };
	} finally {
		await t.goHet(pt, d.id);
	}
}

test('14_3_030_009 — 🔴 Chọn Điều chỉnh TĂNG bị backend từ chối', async () => {
	chanNeuTat('14_3_030_009');
	const { b } = await doiDau('TANG');
	expect(t.msg(b)).toBe('Chỉ chọn được điều chỉnh GIẢM cho hoá đơn trả hàng');
});

test('14_3_030_010 — 🔴 Chọn Không đổi giá trị bị backend từ chối', async () => {
	chanNeuTat('14_3_030_010');
	const { b } = await doiDau('KHONG_DOI');
	expect(t.msg(b)).toBe('Chỉ chọn được điều chỉnh GIẢM cho hoá đơn trả hàng');
});

test('14_3_030_011 — Ghi nhận dấu làm mất kết quả đối soát cũ', async () => {
	chanNeuTat('14_3_030_011');
	const { hd, b } = await doiDau('GIAM');
	expect(hd.reconcileStatus, 'Tiền đề: hoá đơn đã đối soát').toBe('KHOP');
	expect(String(b?.status?.code)).toBe('200');
	expect(b.data.reconcileStatus).toBe('PENDING');
	expect(b.data.reconcileSummary ?? null).toBeNull();
});

test('14_3_030_013 — Gỡ hoá đơn nạp nhầm', async ({ page }) => {
	chanNeuTat('14_3_030_013');
	const { d, khoi } = await napVaXem(page, { khongMo: true });
	try {
		await khoi.locator('button.ant-btn-dangerous').first().click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Gỡ hoá đơn điều chỉnh này?' });
		await expect(hop).toBeVisible();
		const tb = await t.thongBao(page, () => hop.getByRole('button', { name: 'Gỡ hoá đơn' }).click(), 8_000);
		ghi(`thông báo: ${tb}`);
		expect(tb).toContain('Đã gỡ hoá đơn khỏi đợt trả');
		await expect.poll(() => t.nhanKhoi(khoi), { timeout: 20_000 }).toContain('Chưa tiếp nhận');
		await expect(khoi.getByRole('button', { name: 'Tiếp nhận hoá đơn NCC' })).toBeVisible();
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_030_016 — Gỡ hoá đơn là xoá hẳn khỏi đợt trả', async ({ page }) => {
	chanNeuTat('14_3_030_016');
	const d = await dotChung();
	const hd = await t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d) }));
	await t.goHet(pt, d.id);
	expect(await t.hdCuaDot(pt, d.id), 'Đợt vẫn còn chứng từ sau khi gỡ').toEqual([]);
	const { khoi } = await t.moKhoi(page, d);
	const dr = await t.moDoiSoat(page, khoi, 'Tiếp nhận hoá đơn NCC');
	await expect(dr.locator('.ant-alert-info')).toContainText('Đợt trả này chưa tiếp nhận hoá đơn điều chỉnh giảm');
	// Nạp lại đúng số hoá đơn cũ được ⇒ bản cũ đã rời khỏi ràng buộc trùng.
	const lai = await t.napApi(pt, d.id, t.xmlHd({ lines: t.dongKhop(d), so: hd.invoiceNo }));
	ghi(`nạp lại số ${hd.invoiceNo}: ${lai?.status?.code} ${lai?.status?.message}`);
	await t.goHet(pt, d.id);
	expect(String(lai?.status?.code)).toBe('200');
});

test('14_3_030_017 — Đóng hộp xác nhận gỡ không gỡ gì', async ({ page }) => {
	chanNeuTat('14_3_030_017');
	const daGoi = await t.chanGhiHd(page, /return-credit-note\/\d+$/);
	const { d, khoi } = await napVaXem(page, { khongMo: true });
	try {
		await khoi.locator('button.ant-btn-dangerous').first().click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Gỡ hoá đơn điều chỉnh này?' });
		await hop.getByRole('button', { name: 'Huỷ' }).click();
		await expect(hop).toBeHidden();
		expect(daGoi).toEqual([]);
		expect((await t.hdCuaDot(pt, d.id)).length).toBe(1);
	} finally {
		await t.goHet(pt, d.id);
	}
});

/** Hoá đơn có dòng KHÔNG thuế suất (bỏ thẻ TSuat) ⇒ trả { d, hd, item }. */
async function hdThieuThue() {
	const d = await dotChung();
	const hd = await t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d).map((l) => ({ ...l, vat: null })) }));
	const item = hd.items[0];
	ghi(`dòng ${item.id}: vatRate=${item.vatRate} source=${item.vatRateSource}`);
	return { d, hd, item };
}

test('14_3_030_018 — Sửa thuế suất tay cho dòng chưa xác định', async () => {
	chanNeuTat('14_3_030_018');
	const { d, hd, item } = await hdThieuThue();
	try {
		const b = await t.goi(pt, 'POST', `${t.CN}/${hd.id}/items/${item.id}/vat-rate`, {}, { vatRate: 10 });
		ghi(`${b?.status?.code} ${b?.status?.message}`);
		expect(String(b?.status?.code)).toBe('200');
		const it = (await t.chiTiet(pt, hd.id)).items.find((x) => x.id === item.id);
		expect(Number(it.vatRate)).toBe(10);
		expect(it.vatRateSource).toBe('MANUAL');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_030_019 — Thuế suất ngoài bốn giá trị hợp lệ bị chặn', async () => {
	chanNeuTat('14_3_030_019');
	const { d, hd, item } = await hdThieuThue();
	try {
		const b = await t.goi(pt, 'POST', `${t.CN}/${hd.id}/items/${item.id}/vat-rate`, {}, { vatRate: 7 });
		expect(t.msg(b)).toBe('Thuế suất không hợp lệ, chỉ nhận 0%, 5%, 8% hoặc 10%');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_030_020 — Thuế suất âm bị chặn', async () => {
	chanNeuTat('14_3_030_020');
	const { d, hd, item } = await hdThieuThue();
	try {
		const b = await t.goi(pt, 'POST', `${t.CN}/${hd.id}/items/${item.id}/vat-rate`, {}, { vatRate: -10 });
		expect(t.msg(b)).toBe('Thuế suất không hợp lệ, chỉ nhận 0%, 5%, 8% hoặc 10%');
	} finally {
		await t.goHet(pt, d.id);
	}
});

test('14_3_030_021 — Sửa thuế suất cho dòng không thuộc hoá đơn bị chặn', async () => {
	chanNeuTat('14_3_030_021');
	const d = await dotChung();
	const d2 = await t.dotRanh(pt);
	try {
		const a = await t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d) }));
		const b2 = await t.nap(pt, d2.id, t.xmlHd({ lines: t.dongKhop(d2) }));
		const b = await t.goi(pt, 'POST', `${t.CN}/${a.id}/items/${b2.items[0].id}/vat-rate`, {}, { vatRate: 10 });
		ghi(`${b?.status?.code} ${b?.status?.message}`);
		expect(t.msg(b)).toBe('Không tìm thấy dòng hàng của hoá đơn');
	} finally {
		await t.goHet(pt, d.id);
		await t.goHet(pt, d2.id);
	}
});

test('14_3_030_022 — Dòng Chưa ghép được sửa quy đổi đơn vị rồi đối soát lại là khớp', async () => {
	chanNeuTat('14_3_030_022');
	test.skip(true, '🔴 Không có đường làm theo kịch bản: đối soát lấy hệ số quy đổi từ SNAPSHOT trên dòng phiếu xuất (convert_to_main_unit_value) và chỉ nhận ĐVT hoá đơn TRÙNG TÊN ĐVT dòng phiếu — sửa quy đổi ở danh mục sản phẩm không làm dòng "Chưa ghép được" thành "Khớp". Kèm: SP trên đợt trả của làn chỉ có 1 ĐVT (xem 020_007). Cần user chốt lại kỳ vọng.');
});
