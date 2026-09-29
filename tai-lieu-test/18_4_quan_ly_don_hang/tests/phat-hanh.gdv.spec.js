'use strict';

/**
 * 18_4 nhóm 070 — PHÁT HÀNH HĐĐT từ danh sách đơn (vai `gdv`, điểm bán seed làn — đã bật HĐĐT).
 * User cho phép phát hành thật trên môi trường test (25/09/2026).
 * FE: `orderListPage/tableData/OrderTableData.jsx` (tick dòng ⇒ nút "Phát hành hoá đơn điện tử (n)"; checkbox khoá khi đơn đã
 * có hoá đơn / nháp / huỷ) ⇒ `features/invoice/components/DrawerConfirmPublishInvoice.jsx` (drawer "Xác nhận xuất hoá đơn",
 * cột # · Mã đơn · Loại hoá đơn · Mẫu hoá đơn · Thuế · Tổng tiền · Trạng thái · Thao tác(✎), nút Đóng / Xác nhận).
 * 🔴 Ghi thật: phát hành hoá đơn ra nhà cung cấp HĐĐT.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const h = require('./dh');

const GOC = path.join(__dirname, '..');
const { khung, dong, chuan } = h;
h.datTest(test);

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const boMa = (s) => chuan(s).replace(/\s*\([A-Za-z0-9]{6}\)/g, '');

/** Tick `n` dòng đầu có checkbox chọn được (chưa có hoá đơn); trả mã đơn. */
async function tick(page, n) {
	const ma = [];
	const ds = dong(page);
	for (let i = 0; i < (await ds.count()) && ma.length < n; i += 1) {
		const cb = ds.nth(i).locator('.ant-checkbox-input');
		if (!(await cb.count()) || (await cb.isDisabled())) continue;
		await cb.check({ force: true });
		ma.push(await h.oDong(page, i, 'Mã đơn').catch(() => ''));
	}
	return ma;
}
async function moXacNhan(page) {
	await khung(page).getByRole('button', { name: /Phát hành hoá đơn điện tử \(\d+\)/ }).click();
	const d = page.locator('.ant-drawer-open').filter({ hasText: 'Xác nhận xuất hoá đơn' }).last();
	await expect(d, 'Không mở drawer "Xác nhận xuất hoá đơn"').toBeVisible({ timeout: 20_000 });
	await page.waitForTimeout(1_500);
	return d;
}

test.describe('18_4 — Phát hành hoá đơn điện tử', () => {
	test.describe.configure({ timeout: 240_000 });

	test('18_4_070_003 — Màn Xác nhận xuất hoá đơn đủ cột, chỉ Mẫu hoá đơn sửa được', async ({ page }) => {
		chanNeuTat('18_4_070_003');
		await h.moDs(page);
		const ma = await tick(page, 1);
		expect(ma.length, 'Không có đơn nào chọn được để phát hành').toBe(1);
		const d = await moXacNhan(page);
		const th = (await d.locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);
		test.info().annotations.push({ type: 'cột', description: th.join(' · ') });
		expect(th).toEqual(['#', 'Mã đơn', 'Loại hoá đơn', 'Mẫu hoá đơn', 'Thuế', 'Tổng tiền', 'Trạng thái', 'Thao tác']);
		const hang = d.locator('.ant-table-tbody tr.ant-table-row').first();
		const sua = [];
		for (let i = 0; i < th.length; i += 1) {
			if (await hang.locator('td').nth(i).locator('input, .ant-select:not(.ant-select-disabled)').count()) sua.push(th[i]);
		}
		test.info().annotations.push({ type: 'cột sửa được', description: sua.join(' · ') || '(không cột nào có ô nhập)' });
		expect(sua).toEqual(['Mẫu hoá đơn']);
		await d.getByRole('button', { name: 'Đóng', exact: true }).last().click();
	});

	test('18_4_070_004 — Bỏ bớt một đơn ở màn xác nhận', async ({ page }) => {
		chanNeuTat('18_4_070_004');
		await h.moDs(page);
		const ma = await tick(page, 2);
		expect(ma.length, 'Cần ≥ 2 đơn chọn được').toBe(2);
		const d = await moXacNhan(page);
		const hang = d.locator('.ant-table-tbody tr.ant-table-row');
		const nut = hang.nth(1).locator('td').last().locator('button, [role="img"]');
		const nhan = await nut.evaluateAll((xs) => xs.map((x) => x.getAttribute('aria-label') || x.textContent || x.className).join(','));
		test.info().annotations.push({ type: 'cột Thao tác', description: `${await nut.count()} điều khiển: ${nhan}` });
		const xoa = hang.nth(1).locator('td').last().locator('[aria-label="delete"], [aria-label="close"], [aria-label="minus-circle"]');
		expect(await xoa.count(), '🔴 Cột Thao tác chỉ có nút sửa (✎) — không bỏ được dòng khỏi đợt phát hành').toBeGreaterThan(0);
	});

	test('18_4_070_001 — Phát hành hoá đơn điện tử cho đơn đã chọn', async ({ page }) => {
		chanNeuTat('18_4_070_001');
		await h.moDs(page);
		const ma = await tick(page, 1);
		expect(ma.length).toBe(1);
		const d = await moXacNhan(page);
		// Mẫu hoá đơn để trống ("Chọn mẫu hoá đơn") ⇒ chọn mẫu đầu tiên cho mọi dòng.
		const oMau = d.locator('.ant-select').filter({ hasText: 'Chọn mẫu hoá đơn' });
		const mau = [];
		for (let i = 0; i < 5 && (await oMau.count()); i += 1) {
			await oMau.first().click();
			const op = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first();
			// 🔴 25/09: danh sách mẫu RỖNG — mẫu chỉ có khi điểm bán đã kết nối nhà cung cấp HĐĐT (`SelectInvoiceTemplate.jsx`
			//    › getInvPConnected). AUTO8 chưa kết nối; kết nối cần tài khoản thật của NCC HĐĐT ⇒ chặn có lý do.
			const coMau = await op.isVisible({ timeout: 10_000 }).catch(() => false);
			test.skip(!coMau, 'Điểm bán seed chưa kết nối nhà cung cấp HĐĐT ⇒ không có "Mẫu hoá đơn" để phát hành (cần tài khoản NCC HĐĐT thật)');
			mau.push(chuan(await op.innerText()));
			await op.click();
			await page.waitForTimeout(600);
		}
		test.info().annotations.push({ type: 'mẫu hoá đơn', description: mau.join(' · ') || '(đã có sẵn)' });
		const cho = page.waitForResponse((r) => /invoice/i.test(r.url()) && r.request().method() === 'POST', { timeout: 60_000 }).catch(() => null);
		await d.getByRole('button', { name: 'Xác nhận', exact: true }).last().click();
		await page.waitForTimeout(2_000);
		const xn2 = page.locator('.ant-popconfirm:visible, .ant-modal-confirm:visible').last();
		if (await xn2.isVisible().catch(() => false)) {
			test.info().annotations.push({ type: 'hộp xác nhận 2', description: chuan(await xn2.innerText()) });
			await xn2.getByRole('button', { name: /Đồng ý|Xác nhận|OK|Có/ }).last().click();
		} else test.info().annotations.push({ type: 'sau bấm Xác nhận', description: `nút: ${(await d.getByRole('button').allInnerTexts()).map(chuan).join(' · ')} · ${chuan(await d.innerText()).slice(0, 400)}` });
		const res = await cho;
		const body = res ? await res.json().catch(() => null) : null;
		const n = page.locator('.ant-message-notice');
		await n.first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => null);
		const tb = boMa((await n.allInnerTexts()).join(' | '));
		test.info().annotations.push({ type: 'phát hành', description: `${ma[0]} · "${tb}" · ${res?.url().split('__api')[1]} ${JSON.stringify(body?.status)} · ${String(JSON.stringify(body?.data ?? null)).slice(0, 400)}` });
		expect(tb).toContain('Phát hành hoá đơn thành công');
		require('node:fs').writeFileSync(path.join(GOC, 'test-output', `hd-phat-hanh.lane${process.env.VNPOST_LANE || 'x'}.json`), JSON.stringify({ ma: ma[0] }));
		await h.moDs(page);
		await h.tim(page, ma[0]);
		const tt = await h.oDong(page, 0, 'TT. Hoá đơn');
		test.info().annotations.push({ type: 'TT. Hoá đơn sau', description: tt });
		expect(tt, 'TT. Hoá đơn không đổi sau khi phát hành').not.toMatch(/^-$|Chưa/);
	});

	test('18_4_070_007 — Xem thông tin hoá đơn đã phát hành', async ({ page }) => {
		chanNeuTat('18_4_070_007');
		let ma;
		try { ma = JSON.parse(require('node:fs').readFileSync(path.join(GOC, 'test-output', `hd-phat-hanh.lane${process.env.VNPOST_LANE || 'x'}.json`), 'utf8')).ma; } catch { /* */ }
		test.skip(!ma, 'Chưa có đơn đã phát hành (chạy 070_001 trước)');
		await h.moDs(page);
		await h.tim(page, ma);
		await dong(page).first().getByText('Thao tác').click();
		await page.locator('.ant-dropdown:visible .ant-dropdown-menu-item').filter({ hasText: 'Xem thông tin hoá đơn' }).click();
		await page.waitForTimeout(3_000);
		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const t = chuan(await hop.innerText().catch(() => ''));
		test.info().annotations.push({ type: 'thông tin hoá đơn', description: t.slice(0, 600) });
		for (const nhan of [/mã hoá đơn|số hoá đơn|mã tra cứu/i, /loại hoá đơn/i, /trạng thái/i, /cơ quan thuế|CQT/i, /mã số thuế|MST/i]) expect(t).toMatch(nhan);
	});
});
