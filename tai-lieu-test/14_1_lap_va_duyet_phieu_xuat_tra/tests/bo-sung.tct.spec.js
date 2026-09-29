'use strict';

/**
 * 14_1_030_024 — vai `tct`: vòng đời phiếu con TCT (is_tct = 1, create_from_id ≠ null) chỉ 4 mốc.
 * Tiền đề (phiên phụ điểm bán + tỉnh): phiếu TC lô nhập tay → tỉnh duyệt → tách → Gửi lên TCT (BE sinh phiếu con TCT).
 * Nguồn: `statusConfig.js` (`rrIsTctChild` ⇒ Khởi tạo · Chờ Tổng công ty duyệt · Trả hàng / Xử lý · Hoàn tất).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('../../14_2_gom_tach_va_xu_ly_hang_tra/tests/tra-ghi');

const GOC = path.join(__dirname, '..');

test('14_1_030_024 — Vòng đời phiếu con TCT chỉ 4 mốc', async ({ page, browser }) => {
	const ly = skipReason(loadCaseInput(GOC, '14_1_030_024'));
	test.skip(Boolean(ly), ly ?? '');
	test.setTimeout(300_000);
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh('tct', page, st);
	const pt = await t.k.moPhienPhu(browser, 'province', t.ROUTE);
	const ps = await t.k.moPhienPhu(browser, 'shop', t.ROUTE);
	t.datPhienSan('province', pt);
	try {
		const p = await t.phieuDaDuyet(browser, ps, { loai: ['TC_TAY'], sl: 1 });
		expect((await t.tach(pt, p.id))[0].status).toBe('TCT_NOT_SENT');
		expect(String((await t.goi(pt, `/${p.id}/send-to-tct`))?.status?.code)).toBe('200');
		let con = null;
		await expect.poll(async () => {
			const ds = [...((await t.doc({ page, st }, '', { page: 0, size: 50 }))?.data || []), ...((await t.doc(ps, '', { page: 0, size: 50 }))?.data || [])];
			con = ds.find((x) => Number(x.createFromId) === Number(p.id)) || null;
			return Boolean(con);
		}, { timeout: 60_000 }).toBe(true);
		expect(con.isTct).toBe(1);
		await t.diToi(page, `${t.ROUTE}?detailId=${con.id}`);
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu xuất trả NCC' }).last();
		await expect(dr.locator('.ant-descriptions'), `TCT không mở được chi tiết phiếu con ${con.code}`).toBeVisible({ timeout: 30_000 });
		const vd = await t.vongDoi(dr);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(vd) });
		expect(vd.map((x) => x.ten), `Vòng đời phiếu con TCT ${con.code} (isTct ${con.isTct}, createFromId ${con.createFromId}): ${JSON.stringify(vd)}`).toEqual(['Khởi tạo', 'Chờ Tổng công ty duyệt', 'Trả hàng / Xử lý', 'Hoàn tất']);
	} finally {
		t.datPhienSan('province', null);
		await ps.dong();
		await pt.dong();
	}
});
