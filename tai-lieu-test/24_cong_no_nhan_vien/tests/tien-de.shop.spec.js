'use strict';

/**
 * TIỀN ĐỀ 24 (`VNPOST_TIEN_DE=1 … -g "tien de 24"`) — công nợ nhân viên VỚI CỬA HÀNG ở điểm bán làn.
 *
 * Luồng thật (vnpost-web `features/employeeDebt/ghi_nhan_cong_no_kho_flow.md` mục 3): phiếu XUẤT KHO hàng vỡ/hỏng
 * (`subType=BROKEN_DAMAGED`, cấp điểm bán cố định lý do này) → nút "Ghi nợ nhân viên" ở chi tiết phiếu → drawer
 * `DrawerAllocateExportDebt` → `POST /employee-debt/from-stock-export {shopId, referenceId=stockInOutId, allocations[]}`.
 * Tiền đề tạo phiếu bằng GIAO DIỆN (helper 04_3) và ghi nợ bằng ĐÚNG API của drawer (🚫 referenceId bịa).
 * Mỗi lượt: 2 phiếu × 1 SP giá tiêu chuẩn (giá vốn 60.000đ) ⇒ GDV nợ 2 khoản (30.000 + 20.000, ghi cách nhau) · CHT 1 khoản 10.000.
 * 🔴 Ghi THẬT: trừ tồn 2 SP ở điểm bán rác, ghi công nợ nhân viên (EMPLOYEE_DEBT_HISTORY). Sổ `test-output/tien-de.lane<làn>.json`.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');
const seed = require('../../00_seed/seed-state');

const LAN = process.env.VNPOST_LANE || '0';
const SO = path.join(__dirname, '..', 'test-output', `tien-de.lane${LAN}.json`);
const uid = (vai) => {
	const tk = String(process.env[`VNPOST_ACCOUNT_${vai.toUpperCase()}`] || '').replace(/[^a-z0-9_]/gi, '');
	return Number(g.selectDb(`SELECT user_id FROM AUTHEN.USER WHERE username='${tk}'`)[0]?.[0]);
};

test.describe('tien de 24', () => {
	test.skip(!process.env.VNPOST_TIEN_DE, 'Chỉ chạy khi đặt VNPOST_TIEN_DE=1 (ghi dữ liệu thật).');

	test('tien de 24 — phiếu xuất hỏng + ghi nợ nhân viên', async ({ page }) => {
		test.setTimeout(360_000);
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const gdv = uid('gdv');
		const cht = uid('shop');
		expect(gdv && cht, 'Không tra được sysUserId GDV/CHT của làn (AUTHEN.USER)').toBeTruthy();
		const phieu = [];
		for (const [i, alloc] of [[1, [{ sysUserId: gdv, amount: 30_000 }, { sysUserId: cht, amount: 10_000 }]], [2, [{ sysUserId: gdv, amount: 20_000 }]]]) {
			const dr = await k.moFormXuat(page, 'shop');
			await k.themSanPhamXuat(page, dr, sp.tieuChuan.tenSanPham);
			await dr.locator('#supplierNote').fill(`AUTO test tien de 24 — hàng hỏng ${i}`);
			const choDuyet = page.waitForResponse((r) => r.url().includes('/import-export/confirm'), { timeout: 60_000 });
			const { body } = await k.bamVaCho(page, dr.getByRole('button', { name: /^Xuất kho$/ }).last(), '/stock/v3/import-export?');
			expect(String(body?.status?.code), `Tạo phiếu xuất lỗi: ${body?.status?.message}`).toBe('200');
			expect(String((await (await choDuyet).json())?.status?.code), 'Duyệt phiếu xuất lỗi').toBe('200');
			const id = body.data.stockInOutId;
			const ct = await k.chiTietPhieu(page, st, shopId, id);
			ghiChu(`phiếu ${i}`, `${id} ${ct?.code ?? ''} · subType ${ct?.subType} · giá vốn ${ct?.items?.[0]?.basePrice}`);
			const b = await k.goiGhi(page, st, 'POST', '/employee-debt/from-stock-export', {}, { shopId, referenceId: id, note: `AUTO test tien de 24 — phiếu ${i}`, allocations: alloc });
			expect(String(b?.status?.code), `Ghi nợ nhân viên lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
			phieu.push({ stockInOutId: id, allocations: alloc });
			await page.waitForTimeout(1_500); // hai khoản của GDV khác createdDate ⇒ thứ tự cũ → mới xác định
		}
		const so = { gdv, cht, shopId, phieu, luc: new Date().toISOString(), tenCa: seed.PREFIX };
		fs.mkdirSync(path.dirname(SO), { recursive: true });
		fs.writeFileSync(SO, JSON.stringify(so, null, 2));
	});
});

function ghiChu(type, description) {
	test.info().annotations.push({ type, description: String(description) });
}
