'use strict';

/**
 * 14_3 · 020 Chốt chứng từ & các case sau khi chốt — vai `province` (làn 8, môi trường DEV).
 *
 * 🔴 GHI SỔ THẬT, KHÔNG HOÀN TÁC: chốt chứng từ ghi `SUPPLIER_DEBT_HISTORY` (âm), bút toán Nợ 331 / Có 156 / Có 1331 và
 * tự xác nhận đợt trả. Mỗi lượt chạy tiêu hao **một** đợt `WAIT_CONFIRM` (dùng chung cho cả file — `hdDaChot`).
 * Hoá đơn chốt: ngày hoá đơn 01/09/2026, tổng thấp hơn đợt 7đ (trong dung sai) ⇒ phủ luôn 020_019/020/021/022.
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
const NGAY_HD = '2026-09-01';
const LECH = -7;

let pt = null;
/**
 * { d, hd } — đợt + hoá đơn đã chốt, dùng chung cả file.
 * 🔴 Lưu ra FILE, 🚫 không chỉ biến module: test đỏ làm Playwright khởi động lại worker ⇒ biến mất ⇒ case sau chốt
 *    thêm một đợt nữa (lượt 25/09 09:03 lỡ chốt 9 đợt). File giữ qua cả các lượt chạy sau.
 */
const fs = require('node:fs');
const SO_CHOT = path.join(GOC, 'test-output', `hd-da-chot.lane${process.env.VNPOST_LANE || 0}.json`);
let chot = null;
const luuChot = (c) => {
	chot = c;
	fs.mkdirSync(path.dirname(SO_CHOT), { recursive: true });
	fs.writeFileSync(SO_CHOT, JSON.stringify({ d: c.d, hdId: c.hd.id, batchTruoc: c.batchTruoc }, null, 1));
};
test.describe.configure({ timeout: 240_000 });
test.beforeEach(async ({ page }) => {
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh(VAI, page, st);
	pt = { page, st };
});

/** Đợt + hoá đơn KHỚP chưa chốt (ngày 01/09, lệch 7đ). */
async function hdKhopMoi() {
	const d = await t.dotRanh(pt);
	const hd = await t.nap(pt, d.id, t.xmlHd({ lines: t.dongKhop(d, { lech: LECH }), ngay: NGAY_HD }));
	expect(hd.reconcileStatus, `Tiền đề: hoá đơn lệch ${LECH}đ phải KHỚP`).toBe('KHOP');
	return { d, hd, batchTruoc: d.status };
}

/** Hoá đơn đã chốt dùng chung — 020_013 chốt qua giao diện; case chạy lẻ thì chốt bằng API. */
async function hdDaChot() {
	if (!chot && fs.existsSync(SO_CHOT)) {
		const s = JSON.parse(fs.readFileSync(SO_CHOT, 'utf8'));
		const hd = await t.chiTiet(pt, s.hdId).catch(() => null);
		if (hd?.settleStatus === 'SETTLED') chot = { d: s.d, hd, batchTruoc: s.batchTruoc };
	}
	if (chot) return { ...chot, hd: await t.chiTiet(pt, chot.hd.id) };
	const x = await hdKhopMoi();
	const b = await t.goi(pt, 'POST', `${t.CN}/${x.hd.id}/settle`);
	expect(String(b?.status?.code), `Chốt chứng từ lỗi: ${b?.status?.message}`).toBe('200');
	luuChot({ ...x, hd: await t.chiTiet(pt, x.hd.id) });
	return chot;
}

const dotSau = async (d) => ((await t.goi(pt, 'GET', `${t.API}/${d.phieu.id}/supplier-batches`))?.data || []).find((b) => b.id === d.id);

test('14_3_020_013 — Chốt chứng từ khi khớp ghi giảm công nợ', async ({ page }) => {
	chanNeuTat('14_3_020_013');
	const x = await hdKhopMoi();
	const { khoi } = await t.moKhoi(page, x.d, { coHd: true });
	let dr = await t.moDoiSoat(page, khoi, 'Xem đối soát');
	await dr.getByRole('button', { name: 'Chốt chứng từ & ghi giảm công nợ' }).click();
	const hop = page.getByRole('dialog').filter({ hasText: 'Chốt chứng từ hoá đơn điều chỉnh này?' });
	await expect(hop).toBeVisible();
	const cho = page.waitForResponse((r) => /return-credit-note\/\d+\/settle/.test(r.url()), { timeout: 60_000 });
	const tb = await t.thongBao(page, () => hop.getByRole('button', { name: 'Chốt chứng từ' }).click(), 10_000);
	const body = await (await cho).json();
	ghi(`thông báo: ${tb} · settle ${body?.status?.code} ${body?.status?.message}`);
	expect(String(body?.status?.code)).toBe('200');
	luuChot({ ...x, hd: await t.chiTiet(pt, x.hd.id) });
	expect(tb).toContain('Đã chốt chứng từ và ghi giảm công nợ');
	// Drawer có thể tự đóng sau thao tác (lỗi 010_004) ⇒ mở lại để đọc kết quả.
	await page.waitForTimeout(2_000);
	if (!(await dr.isVisible())) {
		await t.dongHet(page);
		const k2 = (await t.moKhoi(page, x.d, { coHd: true })).khoi;
		dr = await t.moDoiSoat(page, k2, 'Xem đối soát');
	}
	await expect(t.oMoTa(dr, 'Trạng thái chứng từ')).toContainText('Đã chốt chứng từ', { timeout: 20_000 });
	const nguoi = t.chuan(await t.oMoTa(dr, 'Người chốt chứng từ').innerText());
	ghi(`Người chốt: ${nguoi}`);
	expect(nguoi, 'Mục "Người chốt chứng từ" không có tên người thao tác').not.toMatch(/^--/);
	expect(nguoi, 'Mục "Người chốt chứng từ" không kèm thời điểm').toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
	await expect(dr.getByText('Bút toán ghi giảm công nợ')).toBeVisible();
});

test('14_3_020_016 — Chốt lần thứ hai bị chặn', async () => {
	chanNeuTat('14_3_020_016');
	const { hd } = await hdDaChot();
	const b = await t.goi(pt, 'POST', `${t.CN}/${hd.id}/settle`);
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(String(b?.status?.code)).not.toBe('200');
	expect(t.msg(b)).toBe('Hoá đơn điều chỉnh đã chốt hoặc đã gắn cho đợt trả khác');
});

test('14_3_020_019 — Chốt chứng từ TỰ ĐỘNG xác nhận đợt trả còn chờ', async ({ page }) => {
	chanNeuTat('14_3_020_019');
	const c = await hdDaChot();
	expect(c.batchTruoc, 'Tiền đề: đợt phải đang Chờ NCC xác nhận trước khi chốt').toBe('WAIT_CONFIRM');
	const b = await dotSau(c.d);
	ghi(`đợt #${c.d.id}: ${c.batchTruoc} → ${b?.status} · confirmedBy=${b?.confirmedBy}`);
	expect(b?.status).not.toBe('WAIT_CONFIRM');
	const { the } = await t.moKhoi(page, c.d, { coHd: true });
	const nhan = t.chuan(await the.locator('.ant-tag').first().innerText());
	ghi(`thẻ đợt: ${nhan}`);
	expect(nhan).not.toBe('Chờ NCC xác nhận');
	await expect(the.getByRole('button', { name: 'NCC xác nhận' })).toHaveCount(0);
});

test('14_3_020_020 — Ngày ghi sổ bút toán là NGÀY HOÁ ĐƠN', async () => {
	chanNeuTat('14_3_020_020');
	const { hd } = await hdDaChot();
	const bt = hd.accountingEntry;
	ghi(`bút toán ${bt?.entryCode} · entryDate=${bt?.entryDate} · ngày hoá đơn ${hd.invoiceDate}`);
	expect(bt, 'Hoá đơn đã chốt mà không có bút toán').toBeTruthy();
	const d = new Date(Number(bt.entryDate) || bt.entryDate);
	const vn = new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
	expect(vn).toBe(NGAY_HD);
});

test('14_3_020_021 — Bút toán tách riêng tiền hàng và thuế GTGT đầu vào', async ({ page }) => {
	chanNeuTat('14_3_020_021');
	const c = await hdDaChot();
	const { khoi } = await t.moKhoi(page, c.d, { coHd: true });
	const dr = await t.moDoiSoat(page, khoi, 'Xem đối soát');
	const bang = dr.locator('.ant-table').filter({ has: page.locator('th', { hasText: 'Tài khoản' }) }).first();
	await expect(bang).toBeVisible({ timeout: 20_000 });
	expect((await bang.locator('thead th').allInnerTexts()).map(t.chuan)).toEqual(['Tài khoản', 'Diễn giải', 'Nợ', 'Có']);
	const dongBt = c.hd.accountingEntry?.lines || [];
	ghi(JSON.stringify(dongBt));
	const tk = dongBt.map((l) => String(l.account));
	expect(tk, 'Thiếu dòng tiền hàng (156)').toContain('156');
	expect(tk, 'Thiếu dòng thuế GTGT đầu vào (1331)').toContain('1331');
	const ncc = c.hd.supplierName;
	for (const l of dongBt.filter((x) => ['156', '1331'].includes(String(x.account)))) {
		expect(`${l.description} ${l.objectName ?? ''} ${l.partnerName ?? ''}`, `Dòng ${l.account} không gắn đối tượng NCC ${ncc}`).toContain(ncc);
	}
});

test('14_3_020_022 — Số tiền ghi sổ lấy từ HOÁ ĐƠN không lấy từ đợt trả', async () => {
	chanNeuTat('14_3_020_022');
	const c = await hdDaChot();
	const no331 = (c.hd.accountingEntry?.lines || []).find((l) => String(l.account) === '331');
	ghi(`đợt ${c.d.amount} · hoá đơn ${c.hd.totalAmount} · Nợ 331 = ${no331?.debit}`);
	expect(Number(c.hd.totalAmount)).toBe(c.d.amount + LECH);
	expect(Number(no331?.debit)).toBe(Number(c.hd.totalAmount));
});

test('14_3_020_024 — Hai trạng thái chứng từ hiển thị đúng nhãn', async ({ page }) => {
	chanNeuTat('14_3_020_024');
	const c = await hdDaChot();
	const d2 = await t.dotRanh(pt);
	try {
		await t.nap(pt, d2.id, t.xmlHd({ lines: t.dongKhop(d2) }));
		const doc = async (d) => {
			const { khoi } = await t.moKhoi(page, d, { coHd: true });
			const tag = khoi.locator('.ant-tag').filter({ hasText: /Chưa chốt|Đã chốt chứng từ/ }).first();
			const r = { nhan: t.chuan(await tag.innerText()), lop: await tag.getAttribute('class') };
			await t.dongHet(page);
			return r;
		};
		const a = await doc(c.d);
		const b = await doc(d2);
		ghi(`đã chốt: ${JSON.stringify(a)} · chưa chốt: ${JSON.stringify(b)}`);
		expect(a.nhan).toBe('Đã chốt chứng từ');
		expect(a.lop).toContain('ant-tag-green');
		expect(b.nhan).toBe('Chưa chốt');
		expect(b.lop, 'Nhãn "Chưa chốt" không phải màu xám mặc định').not.toMatch(/ant-tag-(green|red|gold|blue|orange)/);
	} finally {
		await t.goHet(pt, d2.id);
	}
});

test('14_3_030_005 — Đối soát hoá đơn đã chốt bị chặn', async () => {
	chanNeuTat('14_3_030_005');
	const { hd } = await hdDaChot();
	const b = await t.goi(pt, 'POST', `${t.CN}/${hd.id}/reconcile`);
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(String(b?.status?.code), '🔴 Đối soát lại được hoá đơn đã chốt').not.toBe('200');
	expect(t.msg(b)).toBe('Hoá đơn điều chỉnh đã chốt hoặc đã gắn cho đợt trả khác');
});

test('14_3_030_012 — Ghi nhận dấu cho hoá đơn đã chốt bị chặn', async () => {
	chanNeuTat('14_3_030_012');
	const { hd } = await hdDaChot();
	const b = await t.goi(pt, 'POST', `${t.CN}/${hd.id}/adjustment-type`, {}, { adjustmentType: 'GIAM' });
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(String(b?.status?.code)).not.toBe('200');
	expect(t.msg(b)).toBe('Hoá đơn điều chỉnh đã chốt hoặc đã gắn cho đợt trả khác');
});

test('14_3_030_014 — Biểu tượng gỡ không hiện với hoá đơn đã chốt', async ({ page }) => {
	chanNeuTat('14_3_030_014');
	const c = await hdDaChot();
	const { khoi } = await t.moKhoi(page, c.d, { coHd: true });
	await expect(khoi.locator('.ant-tag').filter({ hasText: 'Đã chốt chứng từ' })).toBeVisible();
	await expect(khoi.locator('button.ant-btn-dangerous')).toHaveCount(0);
	await khoi.getByText('Hoá đơn điều chỉnh giảm').hover();
	await expect(page.getByText('Gỡ hoá đơn khỏi đợt trả để nạp lại tệp khác')).toHaveCount(0);
});

test('14_3_030_015 — Gọi API xoá hoá đơn đã chốt bị chặn', async () => {
	chanNeuTat('14_3_030_015');
	const { d, hd } = await hdDaChot();
	const b = await t.goi(pt, 'DELETE', `${t.CN}/${hd.id}`);
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(String(b?.status?.code), '🔴 Xoá được hoá đơn đã chốt').not.toBe('200');
	expect((await t.hdCuaDot(pt, d.id)).length, 'Hoá đơn đã chốt biến khỏi đợt').toBe(1);
	expect(t.msg(b)).toBe('Hoá đơn điều chỉnh đã chốt hoặc đã gắn cho đợt trả khác');
});

test('14_3_040_010 — Phát hành cho đợt đã có hoá đơn chốt bị chặn', async () => {
	chanNeuTat('14_3_040_010');
	// An toàn: issue() dựng bản nháp, kiểm thuế suất và kiểm hoá đơn đã chốt TRƯỚC khi gọi invoice-service.
	const { d } = await hdDaChot();
	const b = await t.goi(pt, 'POST', `${t.CN}/issue`, { batchId: d.id }, {});
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(String(b?.status?.code), '🔴 Phát hành được cho đợt đã có hoá đơn chốt').not.toBe('200');
	expect(t.msg(b)).toBe('Hoá đơn điều chỉnh đã chốt hoặc đã gắn cho đợt trả khác');
});
