'use strict';

/**
 * Phân hệ 16 · 020 Sinh kỳ từ hợp đồng · 070 Ghi nợ nội bộ (phần bị chặn) — vai `tct` (làn 7).
 *
 * Nguồn: `features/consignmentRecon/pages/ConsignmentReconListPage.jsx` (`handleGenerate`),
 * `services/consignmentReconApi.js`; BE `ReconPeriodService/Writer` (kỳ đã có ⇒ `soKyDaCo`, không tạo trùng — job định kỳ
 * cũng chạy đúng việc này ⇒ bấm tay là thao tác thường, an toàn).
 * 070: chỉ gọi `post-internal-debt` khi tiền đề chắc chắn bị chặn (kỳ chưa ghi nợ NCC / id không tồn tại).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

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
test.describe.configure({ timeout: 180_000 });

let pt = null;
async function mo(page) {
	const st = k.batHeader(page);
	await moTrang(page, ROUTE, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	pt = { page, st };
}
const soKy = async () => ((await k.goiGhi(pt.page, pt.st, 'GET', '/consignment-recon/periods', { page: 0, size: 1000 })).data || []);

/** Bấm "Sinh kỳ từ hợp đồng" ⇒ { thông báo, body }. */
async function sinhKy(page) {
	const cho = page.waitForResponse((r) => r.url().includes('/consignment-recon/periods/generate'), { timeout: 120_000 });
	await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
	await khung(page).getByRole('button', { name: /Sinh kỳ từ hợp đồng/ }).click();
	const body = await (await cho).json();
	await page.locator('.ant-message-notice').first().waitFor({ timeout: 10_000 });
	return { tb: chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | ')), body };
}

test('16_020_003 — Sinh kỳ từ hợp đồng và đọc kết quả', async ({ page }) => {
	chanNeuTat('16_020_003');
	await mo(page);
	const truoc = await soKy();
	const { tb, body } = await sinhKy(page);
	const sau = await soKy();
	const moi = sau.filter((p) => !truoc.some((q) => q.id === p.id));
	ghi(`"${tb}" · ${JSON.stringify(body?.data)} · kỳ ${truoc.length} → ${sau.length} (mới: ${moi.map((p) => `${p.id}:${p.status}`).join(', ') || '0'})`);
	const kq = body.data;
	expect(tb).toContain(`Sinh kỳ xong: ${kq.soKyTaoMoi ?? 0} kỳ mới, ${kq.soKyDaCo ?? 0} kỳ đã có`);
	expect(moi.length).toBe(kq.soKyTaoMoi ?? 0);
	for (const p of moi) expect(p.status, `Kỳ mới ${p.id} không ở trạng thái Đang gom số`).toBe('OPEN');
});

test('16_020_004 — Sinh kỳ nhiều lần không tạo kỳ trùng', async ({ page }) => {
	chanNeuTat('16_020_004');
	await mo(page);
	await sinhKy(page);
	await page.waitForTimeout(3_500);
	const truoc = (await soKy()).length;
	const { tb, body } = await sinhKy(page);
	const sau = (await soKy()).length;
	ghi(`lần 2: "${tb}" · kỳ ${truoc} → ${sau}`);
	expect(body.data.soKyTaoMoi ?? 0).toBe(0);
	expect(tb).toContain('Sinh kỳ xong: 0 kỳ mới');
	expect(sau, 'Tổng số kỳ tăng sau lần sinh thứ hai').toBe(truoc);
});

test('16_020_005 — Hợp đồng khai thiếu bị bỏ qua khi sinh kỳ', async ({ page }) => {
	chanNeuTat('16_020_005');
	await mo(page);
	const { tb, body } = await sinhKy(page);
	ghi(`"${tb}" · ${JSON.stringify(body?.data)}`);
	test.skip(!body?.data?.soHopDongLoi, `Chuỗi không có hợp đồng ký gửi nào khai thiếu chu kỳ / ngày neo (soHopDongLoi = ${body?.data?.soHopDongLoi ?? 0}). Tạo hợp đồng khai thiếu là sửa dữ liệu hợp đồng dùng chung — chờ user.`);
	expect(tb).toContain(`${body.data.soHopDongLoi} hợp đồng lỗi`);
});

test('16_020_006 — Sinh kỳ thất bại hiện thông báo backend', async ({ page }) => {
	chanNeuTat('16_020_006');
	// Không có cấu hình hợp đồng "lỗi nặng" làm /generate ném lỗi ⇒ giả lập response lỗi (không chạm BE).
	let lan = 0;
	await page.route(/consignment-recon\/periods\/generate/, (r) => {
		lan++;
		const body = lan === 1 ? { status: { code: 'SSHOP-400', message: 'Hợp đồng HD-01 thiếu ngày neo kỳ' } } : { status: { code: 'SSHOP-500' } };
		return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(body) });
	});
	await mo(page);
	const bam = async () => {
		await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
		await khung(page).getByRole('button', { name: /Sinh kỳ từ hợp đồng/ }).click();
		await page.locator('.ant-message-notice').first().waitFor({ timeout: 10_000 });
		return chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | '));
	};
	const t1 = await bam();
	const t2 = await bam();
	ghi(`có chuỗi BE: "${t1}" · không chuỗi: "${t2}"`);
	expect(t1).toContain('Hợp đồng HD-01 thiếu ngày neo kỳ');
	expect(t2).toContain('Không sinh được kỳ đối soát');
});

test('16_070_002 — Ghi nợ nội bộ khi chưa ghi nợ chính thức bị chặn', async ({ page }) => {
	chanNeuTat('16_070_002');
	await mo(page);
	const ky = (await soKy()).find((p) => p.status === 'LOCKED');
	test.skip(!ky, 'Không có kỳ Đã chốt chưa ghi nợ.');
	expect(ky.status, 'Tiền đề: kỳ CHƯA ghi nợ NCC (BE chặn ghi nợ nội bộ)').toBe('LOCKED');
	const b = await k.goiGhi(page, pt.st, 'POST', `/consignment-recon/periods/${ky.id}/post-internal-debt`);
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(String(b?.status?.code), '🔴 Ghi nợ nội bộ được khi chưa ghi nợ NCC').not.toBe('200');
	expect(msg(b)).toBe(`Kỳ ${ky.id} đang ở trạng thái LOCKED. Phải GHI NỢ CHÍNH THỨC với NCC trước, rồi mới ghi công nợ nội bộ TCT ↔ BĐT.`);
});

test('16_070_003 — Ghi nợ nội bộ cho kỳ không tồn tại bị chặn', async ({ page }) => {
	chanNeuTat('16_070_003');
	await mo(page);
	const b = await k.goiGhi(page, pt.st, 'POST', '/consignment-recon/periods/999999999/post-internal-debt');
	ghi(`${b?.status?.code} ${b?.status?.message}`);
	expect(msg(b)).toBe('Không tìm thấy kỳ đối soát id=999999999');
});
