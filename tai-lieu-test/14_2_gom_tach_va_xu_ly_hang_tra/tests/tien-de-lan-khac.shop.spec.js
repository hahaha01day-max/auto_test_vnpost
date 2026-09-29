'use strict';

/**
 * 14_2 — TIỀN ĐỀ phạm vi (không phải case): một phiếu Đã duyệt của TỈNH KHÁC cùng pod để 010_010 gom thử.
 * Chạy bằng làn KHÁC làn đang test, ví dụ: `VNPOST_LANE=5 … --project=shop -g "tien de lan khac"`.
 * Ghi id/mã phiếu vào sổ seed của làn đích `VNPOST_LANE_DICH` (mặc định 8) → `duLieu.traNcc14_2.phieuTinhKhac`.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const rp = require('../../14_1_lap_va_duyet_phieu_xuat_tra/tests/return-page');

test('tien de lan khac 14_2 — phiếu Đã duyệt của tỉnh khác', async ({ page, browser }) => {
	test.setTimeout(300_000);
	const st = rp.k.batHeader(page);
	await rp.moDanhSach(page, 'shop');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	rp.datPhienChinh('shop', page, st);
	const p = await rp.taoPhieuApi(page, st, { sl: 1, note: 'AUTO TEST 14_2 tiền đề phạm vi tỉnh khác' });
	await rp.duyetDu(browser, 'ward', p.id);
	await rp.duyetDu(browser, 'province', p.id);
	const ct = (await rp.chiTietPhieu(page, st, p.id)).request;
	expect(ct.status).toBe('APPROVED');
	const f = path.join(__dirname, '../../00_seed', `seed-state.lane${process.env.VNPOST_LANE_DICH || 8}.json`);
	const s = JSON.parse(fs.readFileSync(f, 'utf8'));
	s.duLieu.traNcc14_2 = { ...(s.duLieu.traNcc14_2 || {}), phieuTinhKhac: { id: p.id, code: p.code, tinh: ct.orgUnitCode, lan: process.env.VNPOST_LANE } };
	fs.writeFileSync(f, `${JSON.stringify(s, null, 2)}\n`);
	test.info().annotations.push({ type: 'kq', description: `${p.code} (${ct.orgUnitCode})` });
});
