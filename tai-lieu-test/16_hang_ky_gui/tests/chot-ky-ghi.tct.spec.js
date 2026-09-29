'use strict';

/**
 * 16 · 030_022 — Chốt kỳ đối soát ký gửi THẬT (26/09/2026). Vai `tct` (dữ liệu ký gửi của chuỗi ở TCT — xem ghi chú đầu `chi-tiet-ky.tct`).
 * 🔴 Chốt kỳ là MỘT CHIỀU (không mở lại). Môi trường dev ⇒ được ghi (memory `auto_test_moi_truong_test_lam_thoai_mai`). Ứng viên: kỳ OPEN
 * có số liệu NXT, 0 cảnh báo (`audit`), cũ → mới. Kỳ chốt lỗi được ghi lại (lỗi không đổi trạng thái) rồi thử kỳ kế, tối đa 5.
 * Kỳ đã chốt lưu `test-output/ky-da-chot.lane<N>.json` cho các case sau (ghi nợ, lệnh chi…).
 * Luồng UI: `/debt-reconciliation/consignment-recon/{id}` → nút "Chốt kỳ" → hộp "Chốt kỳ đối soát?" → "Chốt kỳ" (`POST …/periods/{id}/lock`).
 * Khoản nghĩa vụ: `GET /consignment-debt/obligations` (PENDING = Tạm tính, RECONCILED = Đã đối soát).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const ROUTE = '/debt-reconciliation/consignment-recon';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();
const SO = path.join(GOC, 'test-output', `ky-da-chot.lane${process.env.VNPOST_LANE || ''}.json`);
const nutChot = (page) => khung(page).locator('.ant-page-header-heading-extra button').first();

async function chotQuaUi(page, ky) {
	await moTrang(page, `${ROUTE}/${ky.id}`, 'tct');
	await expect(nutChot(page)).toHaveText('Chốt kỳ', { timeout: 30_000 });
	await nutChot(page).click();
	const hop = page.getByRole('dialog').filter({ hasText: 'Chốt kỳ đối soát?' });
	await expect(hop).toBeVisible();
	const tb = new Set();
	const nghe = setInterval(async () => { for (const x of await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])) tb.add(chuan(x)); }, 200);
	const cho = page.waitForResponse((r) => new RegExp(`/periods/${ky.id}/lock`).test(r.url()), { timeout: 60_000 });
	await hop.getByRole('button', { name: 'Chốt kỳ' }).click();
	const lock = await (await cho).json().catch(() => null);
	await page.waitForTimeout(3_000);
	clearInterval(nghe);
	return { lock, tb: [...tb].join(' | ') };
}

test('16_030_022 — Chốt kỳ thành công đổi trạng thái khoản nghĩa vụ', async ({ page }) => {
	const ly = skipReason(loadCaseInput(GOC, '16_030_022'));
	test.skip(Boolean(ly), ly ?? '');
	test.setTimeout(480_000);
	const st = k.batHeader(page);
	await moTrang(page, ROUTE, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const ds = ((await k.goiApi(page, st, '/consignment-recon/periods', { page: 0, size: 500 })).data || []).filter((x) => x.status === 'OPEN').sort((a, b) => a.periodFrom - b.periodFrom);
	const ungVien = [];
	for (const p of ds) {
		const s = (await k.goiApi(page, st, `/consignment-recon/periods/${p.id}/summary`, {})).data || {};
		const a = (await k.goiApi(page, st, `/consignment-recon/periods/${p.id}/audit`, {})).data || {};
		if ((s.nxt || []).length && !(a.lechDoiChieu || []).length && !(a.skuChuaGanNcc || []).length) ungVien.push(p);
	}
	expect(ungVien.length, 'Không còn kỳ OPEN nào có số liệu và sạch cảnh báo').toBeGreaterThan(0);
	const loi = [];
	let ky = null;
	let kq = null;
	for (const p of ungVien.slice(0, 5)) {
		const x = await chotQuaUi(page, p);
		if (String(x.lock?.status?.code) === '200') { ky = p; kq = x; break; }
		loi.push({ id: p.id, ncc: p.chainSupplierName, tu: new Date(p.periodFrom).toISOString().slice(0, 10), loi: x.lock?.status?.message });
	}
	test.info().annotations.push({ type: 'đo', description: `kỳ chốt lỗi: ${JSON.stringify(loi)}` });
	expect(ky, `Không chốt được kỳ nào trong ${Math.min(5, ungVien.length)} ứng viên sạch cảnh báo (lỗi ở trên)`).toBeTruthy();
	fs.mkdirSync(path.dirname(SO), { recursive: true });
	fs.writeFileSync(SO, JSON.stringify({ id: ky.id, ngay: new Date().toISOString() }));
	const sau = (await k.goiApi(page, st, `/consignment-recon/periods/${ky.id}`, {})).data;
	const nv = ((await k.goiApi(page, st, '/consignment-debt/obligations', { page: 0, size: 1000 })).data || []).filter((x) => x.reconciliationPeriodId === ky.id);
	const tag = chuan((await khung(page).locator('.ant-page-header-heading-title .ant-tag').allInnerTexts()).join(' '));
	test.info().annotations.push({ type: 'đo', description: `kỳ ${ky.id} (${ky.chainSupplierName}): "${kq.tb}" · trạng thái ${sau?.status} · tag "${tag}" · nút "${chuan(await nutChot(page).innerText())}" · ${nv.length} khoản nghĩa vụ: ${JSON.stringify([...new Set(nv.map((x) => x.status))])}` });
	expect(kq.tb, 'Không báo "Đã chốt kỳ đối soát"').toContain('Đã chốt kỳ đối soát');
	expect(sau?.status).toBe('LOCKED');
	expect(tag).toContain('Đã chốt');
	await expect(nutChot(page)).toBeDisabled();
	expect(nv.every((x) => x.status === 'RECONCILED'), 'Còn khoản nghĩa vụ của kỳ chưa sang "Đã đối soát"').toBe(true);
});
