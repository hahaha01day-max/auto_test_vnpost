'use strict';

/**
 * 14_3 · Phạm vi vai **điểm bán** — 010_021 · 040_021.
 *
 * HDSD khai vai_tro chỉ `BUU_DIEN_TINH` và `TONG_CONG_TY`. 🔴 Đo 25/09: điểm bán VẪN thấy phiếu con (đã chuyển về HUB
 * tỉnh) kèm "Các đợt trả nhà cung cấp", và `CreditNoteBatchBlock` không kiểm vai ⇒ phải mở đúng CHI TIẾT phiếu có đợt
 * `WAIT_CONFIRM` chưa gắn hoá đơn mới kiểm được (bản cũ chỉ đọc nút ở màn danh sách — không chạm khối hoá đơn).
 * Mọi request ghi vào luồng hoá đơn bị chặn.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('./hoa-don');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });

let ps = null;
let daGoi = [];
test.describe.configure({ timeout: 240_000 });
test.beforeEach(async ({ page }) => {
	daGoi = await t.chanGhiHd(page, /return-credit-note|supplier-batches\/\d+\/(confirm|reject)/);
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	ps = { page, st };
});

/** Mở khối hoá đơn của một đợt WAIT_CONFIRM chưa gắn hoá đơn mà điểm bán nhìn thấy ⇒ { d, khoi, nut }. */
async function khoiCuaDiemBan(page) {
	const d = await t.dotRanh(ps, { giuLai: false });
	const { khoi } = await t.moKhoi(page, d, { coHd: undefined });
	await page.waitForTimeout(3_000); // chờ GET danh sách hoá đơn của đợt (khối vẽ trước khi có dữ liệu)
	const nut = (await khoi.getByRole('button').allInnerTexts()).map(t.chuan).filter(Boolean);
	ghi(`điểm bán mở phiếu ${d.phieu.code} · đợt #${d.id}: thẻ ${(await t.nhanKhoi(khoi)).join(' / ')} · nút ${nut.join(' / ') || '(không)'}`);
	return { d, khoi, nut };
}

test('14_3_010_021 — Vai điểm bán không thấy khối hoá đơn thao tác được', async ({ page }) => {
	chanNeuTat('14_3_010_021');
	const { nut } = await khoiCuaDiemBan(page);
	expect(nut.filter((n) => /Tiếp nhận hoá đơn NCC|Phát hành hoá đơn/.test(n)), 'Vai điểm bán vẫn thấy nút thao tác hoá đơn — HDSD chỉ khai BUU_DIEN_TINH và TONG_CONG_TY').toEqual([]);
	expect(daGoi, 'Chỉ mở màn mà đã gửi request ghi').toEqual([]);
});

test('14_3_040_021 — Vai điểm bán không phát hành hoá đơn được', async ({ page }) => {
	chanNeuTat('14_3_040_021');
	const { nut } = await khoiCuaDiemBan(page);
	expect(nut, 'Vai điểm bán thấy nút "Phát hành hoá đơn"').not.toContain('Phát hành hoá đơn');
	// Vế API: điểm bán gọi thẳng /issue-draft (chỉ ĐỌC) — nếu 200 thì BE không chặn theo vai.
	const d = await t.dotRanh(ps, { giuLai: false });
	const b = await t.goi(ps, 'GET', `${t.CN}/issue-draft`, { batchId: d.id });
	ghi(`điểm bán GET issue-draft đợt #${d.id}: ${b?.status?.code} ${b?.status?.message}`);
	expect(daGoi).toEqual([]);
});
