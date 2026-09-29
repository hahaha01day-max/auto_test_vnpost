'use strict';

/**
 * 07_4 · 040 — Hòm mail nhận hoá đơn NCC (`/settings?setting=mailInbox`), vai `tct`, GHI (26/09/2026).
 * Nguồn vnpost-web `settingContents/mailInboxSetting/MailInboxSetting.jsx` + `services/mailInboxApi.js`:
 * `GET/POST /mail-inbox-configs`, `DELETE /mail-inbox-configs/{id}`, `POST …/{id}/test-connection`.
 * Cột "Máy chủ" = `${host}:${port} (${protocol || "imaps"})`. Kiểm tra: `data.success` ⇒ "Kết nối IMAP thành công",
 * ngược lại `data.message` hoặc "Kết nối thất bại".
 * 🔴 Hòm tạm `AUTO<làn>_HM…@auto-test.invalid`, host `imap.auto-test.invalid` (TLD `.invalid` — RFC 2606, không bao giờ phân giải) ⇒
 * không chạm hệ thống thư thật nào; `active=false` để poller không đọc. Xoá ở finally.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);

async function homTam(page) {
	const st = k.batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=mailInbox`, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const goi = (m, u, q, b) => k.goiGhi(page, st, m, u, q, b);
	const user = `auto${process.env.VNPOST_LANE || ''}_hm${Date.now().toString().slice(-6)}@auto-test.invalid`;
	const r = await goi('POST', '/mail-inbox-configs', {}, {
		orgLevel: 'TONG_CONG_TY', orgUnitCode: st.h.orgunitcode || st.h.orgUnitCode, host: 'imap.auto-test.invalid', port: 993, protocol: 'imaps',
		starttls: false, username: user, password: 'khong-dung', folderInbox: 'INBOX', folderProcessed: 'Processed', readFrom: null, active: false,
	});
	expect(String(r?.status?.code), `Tạo hòm mail tạm lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
	const x = r?.data?.id ? r.data : ds((await goi('GET', '/mail-inbox-configs', { page: 0, size: 500 }))?.data).find((z) => z.username === user);
	await page.reload();
	const dong = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: user }).first();
	await expect(dong).toBeVisible({ timeout: 30_000 });
	return { dong, user, don: () => goi('DELETE', `/mail-inbox-configs/${x.id}`).catch(() => null) };
}

test.describe('07_4 · 040 — Hòm mail nhận hoá đơn NCC (GHI hòm tạm)', () => {
	test('07_4_040_002 — Cột Máy chủ ghép đúng định dạng máy chủ cổng giao thức', async ({ page }) => {
		chanNeuTat('07_4_040_002');
		const h = await homTam(page);
		try {
			const t = chuan(await h.dong.innerText());
			test.info().annotations.push({ type: 'đo', description: `dòng: "${t}"` });
			expect(t).toContain('imap.auto-test.invalid:993 (imaps)');
		} finally { await h.don(); }
	});

	test('07_4_040_003 — Kiểm tra kết nối hòm mail trả kết quả rõ ràng', async ({ page }) => {
		chanNeuTat('07_4_040_003');
		const h = await homTam(page);
		try {
			let rs = null;
			const cho = page.waitForResponse((r) => /test-connection/.test(r.url()), { timeout: 60_000 }).then((r) => { rs = r; }).catch(() => null);
			await h.dong.getByRole('button', { name: 'Kiểm tra' }).click();
			const tb = new Set();
			for (let i = 0; i < 200 && tb.size === 0; i += 1) { for (const x of await page.locator('.ant-message-notice').allInnerTexts()) tb.add(chuan(x)); await page.waitForTimeout(300); }
			await cho;
			const body = rs ? await rs.json().catch(() => null) : null;
			const tt = [...tb].join(' | ');
			test.info().annotations.push({ type: 'đo', description: `thông báo "${tt}" · response ${JSON.stringify(body?.data ?? body?.status)?.slice(0, 300)}` });
			expect(tt, 'Bấm Kiểm tra không hiện kết quả nào').not.toBe('');
			expect(tt, 'Host không tồn tại mà báo kết nối thành công').not.toContain('Kết nối IMAP thành công');
			expect(tt, '🔴 Chỉ báo chung "Kết nối thất bại", không nêu nguyên nhân').not.toBe('Kết nối thất bại');
		} finally { await h.don(); }
	});
});
