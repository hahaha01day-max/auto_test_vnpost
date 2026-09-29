'use strict';

/**
 * 14_2 — Phạm vi: vai ĐIỂM BÁN không gom / tách / nhập kho tỉnh / xử lý hàng chờ trả (vai `shop`).
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `StockReturnRequestListPage.jsx` — `canSplitConsolidate` chỉ tỉnh/TCT (nút Gom +
 * cột ô chọn), `rowActions` (điểm bán chỉ có Sửa/Nộp/Huỷ ở Nháp–Chờ duyệt). BE chặn cấp ở đầu `consolidate` / `split`.
 * Lệnh gọi thẳng API đều bị BE chặn trước khi đụng dữ liệu (không ghi).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const t = require('./tra-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const VIEC = ['Trả hàng NCC', 'Nhập lại kho', 'Huỷ vỡ hỏng'];

let ps = null;
test.beforeEach(async ({ page }) => {
	const st = t.k.batHeader(page);
	await t.moDanhSach(page, VAI);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	t.datPhienChinh(VAI, page, st);
	ps = { page, st };
});

/** Phiếu của điểm bán ở trạng thái `status` (API list của chính điểm bán). */
async function phieuTheo(status) {
	const ds = (await t.doc(ps, '', { status, page: 0, size: 50 }))?.data || [];
	return ds.find((x) => !x.isConsolidated) || null;
}

async function menuCua(page, p) {
	await t.timMa(page, p.code);
	const r = t.dong(page).filter({ hasText: p.code }).first();
	await expect(r, `Điểm bán không thấy phiếu ${p.code} trên danh sách`).toBeVisible({ timeout: 20_000 });
	return (await t.menuXuLy(page, r)) || [];
}

test.describe('14_2 — Phạm vi điểm bán', () => {
	test('14_2_010_013 — Vai điểm bán không gom phiếu được', async ({ page }) => {
		chanNeuTat('14_2_010_013');
		await expect(t.khung(page).getByRole('button', { name: /Gom phiếu/ }), 'Điểm bán thấy nút Gom phiếu').toHaveCount(0);
		expect(await t.khung(page).locator('.ant-table-thead .ant-table-selection-column, .ant-table-tbody .ant-table-selection-column').count(), 'Điểm bán có cột ô chọn').toBe(0);
		const a = await phieuTheo('APPROVED');
		const ids = a ? [a.id, a.id + 1] : [1, 2];
		const b = await t.goi(ps, '/consolidate', { ids });
		expect(t.msg(b)).toBe('Chỉ cấp tỉnh/TCT được gom phiếu trả');
	});

	test('14_2_020_012 — Vai điểm bán và cấp xã không tách phiếu được', async ({ page }) => {
		chanNeuTat('14_2_020_012');
		const a = await phieuTheo('APPROVED');
		expect(a, 'Điểm bán chưa có phiếu Đã duyệt').toBeTruthy();
		const m = await menuCua(page, a);
		ghi(`menu phiếu Đã duyệt ${a.code}: ${JSON.stringify(m)}`);
		expect(m.map((x) => x.nhan), 'Điểm bán có mục "Tách phiếu"').not.toContain('Tách phiếu');
		const b = await t.goi(ps, `/${a.id}/split`);
		expect(t.msg(b)).toBe('Chỉ cấp tỉnh/TCT được tách phiếu');
		expect((await t.chiTietPhieu(ps.page, ps.st, a.id)).request.status).toBe('APPROVED');
	});

	test('14_2_030_012 — Vai điểm bán và cấp xã không nhập kho tỉnh được', async ({ page }) => {
		chanNeuTat('14_2_030_012');
		const a = await phieuTheo('APPROVED');
		expect(a, 'Điểm bán chưa có phiếu Đã duyệt').toBeTruthy();
		const m = await menuCua(page, a);
		expect(m.map((x) => x.nhan), 'Điểm bán có mục "Nhập hàng về kho"').not.toContain('Nhập hàng về kho');
	});

	test('14_2_040_023 — Vai điểm bán không xử lý hàng chờ trả được', async ({ page }) => {
		chanNeuTat('14_2_040_023');
		// Phiếu "Chưa trả hàng" do chính điểm bán lập (sau tỉnh tách). 🔴 Tách tự doanh chuyển shopId phiếu sang đơn vị
		// nợ NCC (HUB tỉnh) ⇒ phiếu có thể không còn trong danh sách điểm bán — đo và ghi lại.
		const c = (await phieuTheo('PROVINCE_NOT_RETURNED')) || (await phieuTheo('PARTIAL_PROCESSED')) || (await phieuTheo('TCT_NOT_SENT'));
		expect(c, 'Danh sách điểm bán không có phiếu Chưa trả hàng / Xử lý một phần / Chưa gửi TCT nào').toBeTruthy();
		ghi(`phiếu dùng: ${c.code} (${c.status})`);
		const m = await menuCua(page, c);
		ghi(`menu: ${JSON.stringify(m)}`);
		for (const v of VIEC) expect(m.map((x) => x.nhan), `Điểm bán có mục "${v}"`).not.toContain(v);
	});
});
