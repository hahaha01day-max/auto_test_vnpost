'use strict';

/** DỌN RÁC 29 (`-g "don rac 29"`) — xoá cấu hình báo cáo tuỳ chỉnh `AUTOTEST_BC_*` (thanh báo cáo dùng chung toàn chuỗi). */

const { test, expect } = require('@playwright/test');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const { moMan } = require('./report-page');

async function donBaoCaoRac(page) {
	const st = k.batHeader(page);
	await moMan(page, 'tuyChinh', 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const ds = await k.goiGhi(page, st, 'GET', '/report/reports/admin/list', { page: 0, size: 200 });
	const tat = Array.isArray(ds?.data) ? ds.data : (ds?.data?.content ?? ds?.data?.items ?? []);
	const rac = tat.filter((x) => JSON.stringify(x).includes('AUTOTEST_BC_'));
	const kq = [];
	for (const x of rac) {
		const r = await k.goiGhi(page, st, 'DELETE', `/report/reports/admin/${x.id ?? x.reportId}`);
		kq.push(`${x.id ?? x.reportId} → ${JSON.stringify(r?.status)}`);
	}
	return { tat: tat.length, mau: JSON.stringify(tat[0] ?? {}).slice(0, 300), kq, con: (await k.goiGhi(page, st, 'GET', '/report/reports/admin/list', { page: 0, size: 200 })) };
}

test('don rac 29 — xoá báo cáo tuỳ chỉnh rác', async ({ page }) => {
	const r = await donBaoCaoRac(page);
	test.info().annotations.push({ type: 'dọn', description: `${r.tat} cấu hình · mẫu ${r.mau} · ${r.kq.join(' ; ') || '(không có rác)'}` });
	expect(JSON.stringify(r.con?.data ?? {}), 'Còn báo cáo rác AUTOTEST_BC_*').not.toContain('AUTOTEST_BC_');
});

module.exports = { donBaoCaoRac };
