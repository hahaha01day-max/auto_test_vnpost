'use strict';

/**
 * 14_2 · 010 — Gom phiếu trả (GHI + chặn ở BE), vai `province`.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/returnToSupplier/pages/StockReturnRequestListPage.jsx` (`doConsolidate`,
 * `rowActions`, `rowSelection`), BE `ReturnRequestService.consolidate` (thứ tự chặn: cấp → < 2 id sau distinct → từng phiếu:
 * APPROVED → phiếu con/tổng → phạm vi tỉnh → cùng chuỗi → sau vòng lặp: còn SP hiệu lực).
 * Tiền đề: `tien-de.province.spec.js` (hàng TD1 có nguồn NCC ở điểm bán seed). Phiếu gom là 1 SP TD1 × 1.
 * 🔴 Gom là một chiều — phiếu nguồn khép ở "Đã gom phiếu", phiếu tổng `RTG-…` ở lại (ghi chú AUTO TEST 14_2).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('./tra-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });

let pt = null; // phiên chính (tỉnh)
let ps = null; // phiên phụ điểm bán
test.describe.configure({ timeout: 300_000 });
test.beforeEach(async ({ page, browser }) => {
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh(VAI, page, st);
	pt = { page, st };
});
// Phiên phụ mở MỘT lần cho cả file — đăng nhập lại mỗi test (vài chục lần/lượt) làm màn chọn phạm vi chập chờn.
test.beforeAll(async ({ browser }) => {
	ps = await t.k.moPhienPhu(browser, 'shop', t.ROUTE);
});
test.afterAll(async () => {
	await ps?.dong();
});

/** Một phiếu APPROVED có sẵn trong phạm vi tỉnh (không phải phiếu tổng). */
async function phieuApprovedSan() {
	const ds = (await t.doc(pt, '', { status: 'APPROVED', page: 0, size: 100 }))?.data || [];
	const p = ds.find((x) => !x.isConsolidated && x.parentId == null);
	expect(p, 'Phạm vi tỉnh không còn phiếu Đã duyệt nào (thường) để làm tham số').toBeTruthy();
	return p;
}

const nutGom = (page) => t.khung(page).getByRole('button', { name: /Gom phiếu/ }).first();

/** Tìm mã rồi tích ô chọn của dòng đó. */
async function tichMa(page, ma) {
	const r = t.dong(page).filter({ hasText: ma }).first();
	await expect(r, `Danh sách không có phiếu ${ma}`).toBeVisible({ timeout: 20_000 });
	await r.locator('input[type="checkbox"]').first().check();
	return r;
}

/** Tick 2 phiếu (lọc theo tiền tố mã chung "RTR-") rồi bấm Gom, ghi chú `note`, OK. Trả { tb, body }. */
async function gomQuaUi(page, ma1, ma2, note) {
	// Hai phiếu vừa tạo nằm đầu danh sách (mới nhất trước). 🔴 Bấm Tìm với bộ lọc cũ thì RTK Query trả CACHE
	//    (không có 2 phiếu mới) ⇒ đổi từ khoá sang tiền tố chung "RTR-" để buộc gửi request mới.
	await t.timMa(page, 'RTR-');
	await tichMa(page, ma1);
	await tichMa(page, ma2);
	await expect(nutGom(page)).toContainText('(2)');
	await nutGom(page).click();
	const hop = page.getByRole('dialog').filter({ hasText: 'Gom 2 phiếu Đã duyệt?' }).last();
	await expect(hop, 'Không hiện hộp "Gom 2 phiếu Đã duyệt?"').toBeVisible();
	const o = hop.getByPlaceholder('Ghi chú (tuỳ chọn)');
	await expect(o, 'Ô ghi chú không mang placeholder "Ghi chú (tuỳ chọn)"').toBeVisible();
	if (note) await o.fill(note);
	const cho = page.waitForResponse((r) => r.url().includes(`${t.API}/consolidate`), { timeout: 30_000 });
	const tb = await t.thongBao(page, () => hop.getByRole('button', { name: /OK|Đồng ý/ }).click(), 6_000);
	const body = await (await cho).json();
	return { tb, body };
}

test.describe('14_2 · 010 — Gom phiếu (ghi)', () => {
	test('14_2_010_004 — Gọi API gom với ít hơn 2 phiếu bị chặn', async () => {
		chanNeuTat('14_2_010_004');
		const p = await phieuApprovedSan();
		const b = await t.goi(pt, '/consolidate', { ids: [p.id] });
		expect(String(b?.status?.code)).not.toBe('200');
		expect(t.msg(b)).toBe('Chọn ít nhất 2 phiếu để gom');
		// Nhánh FE "Chọn ít nhất 2 phiếu Đã duyệt để gom" chỉ chạy khi bấm được nút — nút khoá khi < 2 (010_003).
		await expect(nutGom(pt.page), 'Chưa chọn phiếu mà nút Gom bật').toBeDisabled();
		ghi('Nhánh cảnh báo FE không tới được bằng UI: nút Gom phiếu khoá khi chọn < 2 phiếu.');
	});

	test('14_2_010_005 — Gom hai id trùng nhau bị coi là một phiếu', async () => {
		chanNeuTat('14_2_010_005');
		const p = await phieuApprovedSan();
		const b = await t.goi(pt, '/consolidate', { ids: [p.id, p.id] });
		expect(t.msg(b)).toBe('Chọn ít nhất 2 phiếu để gom');
		expect((await t.chiTietPhieu(pt.page, pt.st, p.id)).request.status, 'Phiếu bị đổi trạng thái sau lệnh gom lỗi').toBe('APPROVED');
	});

	for (const [id, ten, note] of [
		['14_2_010_006', 'Gom nhiều phiếu Đã duyệt thành một phiếu tổng', 'AUTO TEST 14_2 gom'],
		['14_2_010_007', 'Ghi chú khi gom là tuỳ chọn', ''],
	]) {
		test(`${id} — ${ten}`, async ({ page, browser }) => {
			chanNeuTat(id);
			const a = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 1 });
			const b = await t.phieuDaDuyet(browser, ps, { loai: ['TD1'], sl: 2 });
			const ta = Number((await t.chiTietPhieu(pt.page, pt.st, a.id)).request.totalAmount);
			const tb2 = Number((await t.chiTietPhieu(pt.page, pt.st, b.id)).request.totalAmount);
			const { tb, body } = await gomQuaUi(page, a.code, b.code, note);
			ghi(`gom ${a.code}+${b.code}: "${tb}" · ${body?.data?.code}`);
			expect(String(body?.status?.code), `Gom lỗi: ${body?.status?.message}`).toBe('200');
			expect(tb).toContain('Đã gom phiếu');
			const master = body.data;
			expect(master.code, 'Phiếu tổng không mang mã RTG-').toMatch(/^RTG-/);
			expect(Number(master.totalAmount), 'Tổng tiền phiếu tổng ≠ tổng 2 phiếu nguồn').toBe(ta + tb2);
			for (const x of [a, b]) {
				const ct = (await t.chiTietPhieu(pt.page, pt.st, x.id)).request;
				expect(ct.status, `Phiếu nguồn ${x.code} không sang CONSOLIDATED`).toBe('CONSOLIDATED');
				expect(ct.consolidatedToId).toBe(master.id);
			}
			if (id === '14_2_010_006') {
				// Phiếu tổng ở đầu danh sách, hai phiếu nguồn mang thẻ "Đã gom phiếu", ô tích đã bỏ.
				await expect(nutGom(page), 'Gom xong nhãn nút không về (0)').toContainText('(0)');
				expect(await page.locator('.ant-table-tbody input[type="checkbox"]:checked').count(), 'Gom xong còn dòng đang tích').toBe(0);
				// Từ khoá "RTR-" đang lọc mất phiếu tổng (mã RTG-) ⇒ bỏ từ khoá rồi đọc đầu danh sách.
				await t.timMa(page, '');
				await expect(t.dong(page).first(), 'Phiếu tổng không ở đầu danh sách').toContainText(master.code, { timeout: 20_000 });
				for (const x of [a, b]) await expect(t.dong(page).filter({ hasText: x.code }).first()).toContainText('Đã gom phiếu');
				await expect(nutGom(page), 'Gom xong nhãn nút không về (0)').toContainText('(0)');
				expect(await page.locator('.ant-table-tbody input[type="checkbox"]:checked').count(), 'Gom xong còn dòng đang tích').toBe(0);
			} else {
				expect(t.chuan(master.note || ''), 'Không ghi chú mà note phiếu tổng không chỉ gồm "Gom từ"').toContain('Gom từ');
			}
		});
	}

	test('14_2_010_008 — Gom phiếu chưa ở trạng thái Đã duyệt bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_010_008');
		const cho = await t.taoPhieuApi(ps.page, ps.st, { items: [t.dongTuLo(await t.loNguon(ps.page, ps.st, t.nguon().TD1, 1), 1)], note: 'AUTO TEST 14_2 010_008' });
		try {
			const p = await phieuApprovedSan();
			const b = await t.goi(pt, '/consolidate', { ids: [cho.id, p.id] });
			expect(t.msg(b)).toBe(`Phiếu ${cho.code} chưa ở trạng thái Đã duyệt — không gom được`);
		} finally {
			await t.donPhieu(browser, ps, cho.id);
		}
	});

	test('14_2_010_009 — Gom phiếu con hoặc phiếu tổng bị chặn', async () => {
		chanNeuTat('14_2_010_009');
		const ds = (await t.doc(pt, '', { status: 'APPROVED', page: 0, size: 100 }))?.data || [];
		const tong = ds.find((x) => x.isConsolidated === 1);
		expect(tong, 'Chưa có phiếu tổng Đã duyệt — chạy 010_006 trước').toBeTruthy();
		const p = ds.find((x) => !x.isConsolidated && x.parentId == null);
		const b = await t.goi(pt, '/consolidate', { ids: [tong.id, p.id] });
		expect(t.msg(b)).toBe(`Phiếu ${tong.code} là phiếu con/phiếu tổng — không gom được`);
		// Phiếu con (parentId) sinh ra ở trạng thái Chưa trả hàng / Chưa gửi TCT — không bao giờ APPROVED ⇒ BE chặn ở bước trạng thái trước.
		const con = (await t.doc(pt, '', { status: 'PROVINCE_NOT_RETURNED', page: 0, size: 50 }))?.data?.find((x) => x.parentId != null);
		if (con) {
			const c = await t.goi(pt, '/consolidate', { ids: [con.id, p.id] });
			ghi(`gom phiếu con ${con.code}: "${t.msg(c)}"`);
			expect(t.msg(c)).toMatch(/không gom được/);
		}
	});

	test('14_2_010_012 — Gom phiếu không còn sản phẩm hiệu lực bị chặn', async ({ browser }) => {
		chanNeuTat('14_2_010_012');
		const rong = [];
		for (let i = 0; i < 2; i++) {
			const p = await t.taoPhieuApi(ps.page, ps.st, { items: [t.dongTuLo(await t.loNguon(ps.page, ps.st, t.nguon().TD1, 1), 1)], note: 'AUTO TEST 14_2 010_012 SL duyệt 0' });
			await t.duyetDu(browser, 'ward', p.id);
			const b = await t.goiDuyet(browser, 'province', p.id, { sl: 0 });
			expect(String(b?.status?.code), `Tỉnh duyệt SL 0 lỗi: ${b?.status?.message}`).toBe('200');
			rong.push(p);
		}
		const b = await t.goi(pt, '/consolidate', { ids: rong.map((x) => x.id) });
		expect(t.msg(b)).toBe('Các phiếu gom không còn sản phẩm hiệu lực');
		for (const x of rong) expect((await t.chiTietPhieu(pt.page, pt.st, x.id)).request.status, 'Gom lỗi mà phiếu nguồn vẫn bị đổi trạng thái').toBe('APPROVED');
	});

	test('14_2_010_016 — Phiếu đã gom không thao tác được nữa', async ({ page }) => {
		chanNeuTat('14_2_010_016');
		const ds = (await t.doc(pt, '', { status: 'CONSOLIDATED', page: 0, size: 20 }))?.data || [];
		expect(ds.length, 'Chưa có phiếu "Đã gom phiếu" — chạy 010_006 trước').toBeGreaterThan(0);
		await t.timMa(page, ds[0].code);
		const r = t.dong(page).filter({ hasText: ds[0].code }).first();
		await expect(r).toContainText('Đã gom phiếu');
		await expect(r.getByRole('button', { name: 'Chi tiết' })).toBeVisible();
		await expect(r.getByRole('button', { name: 'Xử lý' }), 'Phiếu đã gom vẫn có menu "Xử lý"').toHaveCount(0);
	});

	test('14_2_010_017 — Gom xong không tách ngược về phiếu cũ được', async ({ page }) => {
		chanNeuTat('14_2_010_017');
		const tong = ((await t.doc(pt, '', { status: 'APPROVED', page: 0, size: 100 }))?.data || []).find((x) => x.isConsolidated === 1);
		const nguon = ((await t.doc(pt, '', { status: 'CONSOLIDATED', page: 0, size: 100 }))?.data || []).find((x) => x.consolidatedToId === tong?.id);
		expect(tong && nguon, 'Chưa có cặp phiếu tổng / phiếu nguồn — chạy 010_006 trước').toBeTruthy();
		await t.timMa(page, tong.code);
		const m = await t.menuXuLy(page, t.dong(page).filter({ hasText: tong.code }).first());
		ghi(`menu phiếu tổng ${tong.code}: ${JSON.stringify(m)}`);
		expect((m || []).filter((x) => /gom|hoàn tác|tách ngược|khôi phục/i.test(x.nhan)), 'Phiếu tổng có chức năng huỷ gom').toEqual([]);
		await t.timMa(page, nguon.code);
		await expect(t.dong(page).filter({ hasText: nguon.code }).first().getByRole('button', { name: 'Xử lý' }), 'Phiếu nguồn còn menu Xử lý').toHaveCount(0);
		// BE cũng không có đường mở lại phiếu nguồn: huỷ bị chặn.
		const c = await t.goi(pt, `/${nguon.id}/cancel`, {});
		expect(t.msg(c)).toBe('Không thể hủy phiếu đã xử lý/đã tách/đã gom');
	});
});
