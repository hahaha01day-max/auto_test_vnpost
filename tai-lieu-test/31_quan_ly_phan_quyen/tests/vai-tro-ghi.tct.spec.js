'use strict';

/**
 * 31 · Quản lý vai trò — các case GHI, vai `tct`. 🔴 CHỈ ghi trên VAI TRÒ RÁC `A7PQ31_*` (phạm vi DIEM_BAN, không gán nhân viên)
 * do chính test tạo qua API `POST /auth/chain-role/create`, xoá ở `finally` bằng `DELETE /auth/chain-role/delete?roleCode=`.
 * 🚫 Không tick/lưu quyền trên vai trò thật.
 * Trace vnpost-web `features/role/role/components/`: drawer-update-business-role ("Thêm mới vai trò" / "Cập nhật vai trò", nút
 * "Xác nhận", lỗi "Vui lòng nhập tên vai trò"), drawer-assign-role-function ("Gán chức năng: <tên>", "Đóng" / "Xác nhận",
 * toast "Gán chức năng thành công"), drawer-delete-business-role ("Xác nhận xóa vai trò", "Hủy" / "Xóa vai trò", toast
 * "Xóa vai trò thành công"), drawer-assign-role-employee (toast "Vui lòng thêm ít nhất một nhân viên").
 * Cây chức năng `shared-grouped-tree-table`: "Tổng cộng: N" · "Đã chọn: N" · "Chỉ hiển thị mục đã chọn" · "Làm mới" (= refetch).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const { chuan, dongVaiTro, khung, moVaiTro, oTim, tim } = require('./role-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const thongBao = async (page) => chuan((await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])).join(' | '));

/** Tạo vai trò rác; trả { ma, ten, st }. */
async function taoRac(page, id) {
	const st = k.batHeader(page);
	await moVaiTro(page);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const ts = Date.now().toString().slice(-6);
	const ma = `A7PQ31_${id.slice(3).replace(/_/g, '')}_${ts}`;
	const ten = `A7PQ31 Vai trò rác ${id} ${ts}`;
	const r = await k.goiGhi(page, st, 'POST', '/auth/chain-role/create', {}, { roleCode: ma, roleName: ten, allowedLevel: 'DIEM_BAN', note: 'AUTO TEST — rác 31' });
	expect(String(r?.status?.code), `Tạo vai trò rác lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
	await page.reload();
	await page.waitForTimeout(5_000);
	return { ma, ten, st };
}
async function xoaRac(page, v) {
	if (!v?.ma) return;
	const r = await k.goiGhi(page, v.st, 'DELETE', '/auth/chain-role/delete', { roleCode: v.ma }).catch(() => null);
	ghiChu('dọn vai trò rác', `${v.ma} → ${r?.status?.code}`);
}
const chiTiet = (page, v) => k.goiGhi(page, v.st, 'GET', '/auth/chain-role/get-detail', { roleCode: v.ma, includeFunctions: true });
const dongCua = (page, ten) => dongVaiTro(page).filter({ hasText: ten }).first();

async function moSua(page, v) {
	await tim(page, v.ten);
	await dongCua(page, v.ten).getByRole('button', { name: 'edit' }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Cập nhật vai trò' }).last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(2_000);
	return dr;
}
async function moGanChucNang(page, v) {
	await tim(page, v.ten);
	await dongCua(page, v.ten).getByRole('button', { name: /Gán chức năng/ }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: `Gán chức năng: ${v.ten}` }).last();
	await expect(dr, 'Không mở drawer gán chức năng').toBeVisible({ timeout: 15_000 });
	await expect(dr.getByText(/Tổng cộng:/)).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(2_500);
	return dr;
}
const demSo = async (dr, nhan) => Number(((chuan(await dr.innerText()).match(new RegExp(`${nhan}:\\s*([\\d.]+)`)) || [])[1] || '').replace(/\./g, '') || NaN);
const nutCay = (dr) => dr.locator('.ant-tree-treenode');
// 🔴 `hasNot` phải là locator TƯƠNG ĐỐI (page.locator), locator gốc từ drawer không lọc được. Nút nhóm có switcher `_open/_close`.
const la = (dr) => nutCay(dr).filter({ has: dr.page().locator('.ant-tree-title, .ant-tree-node-content-wrapper') }).filter({ hasNot: dr.page().locator('.ant-tree-switcher_open, .ant-tree-switcher_close') });
async function timCn(page, dr, tu) {
	const o = dr.getByPlaceholder('Tìm kiếm Tên, Mã...');
	await o.fill(tu);
	await page.waitForTimeout(2_000);
}
/** Tên các nút lá đang hiện trong cây (virtual list — chỉ phần đang render). */
const tenLa = async (dr) => (await la(dr).allInnerTexts()).map(chuan).filter(Boolean);

test.describe('31 · Vai trò — thao tác ghi trên vai trò rác (vai tct)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('31_030_006 — Mỗi dòng vai trò có nút Xóa', async ({ page }) => {
		chanNeuTat('31_030_006');
		await moVaiTro(page);
		const so = await dongVaiTro(page).count();
		expect(so, 'Không có dòng vai trò nào').toBeGreaterThan(0);
		const thieu = [];
		for (let i = 0; i < so; i += 1) {
			const d = dongVaiTro(page).nth(i);
			if ((await d.getByRole('button', { name: 'close' }).count()) === 0) thieu.push(chuan(await d.innerText()).slice(0, 40));
		}
		ghiChu('đo', `${so} dòng · nút dòng đầu: ${(await dongVaiTro(page).first().getByRole('button').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label') || x.innerText))).join(' · ')}`);
		expect(thieu, 'Dòng KHÔNG có nút Xoá').toEqual([]);
		const v = { ma: null };
		// Bấm được: mở drawer xác nhận (không bấm xoá thật trên vai trò thật) rồi Hủy.
		await dongVaiTro(page).first().getByRole('button', { name: 'close' }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Xác nhận xóa vai trò' }).last();
		await expect(dr, 'Bấm nút Xoá không mở drawer xác nhận').toBeVisible({ timeout: 10_000 });
		await dr.getByRole('button', { name: 'Hủy' }).click();
		void v;
	});

	test('31_030_008 — Giao diện co giãn khi thu nhỏ màn hình', async ({ page }) => {
		chanNeuTat('31_030_008');
		await moVaiTro(page);
		const kq = {};
		for (const [w, h] of [[1440, 1000], [1024, 800], [768, 1000]]) {
			await page.setViewportSize({ width: w, height: h });
			await page.waitForTimeout(1_500);
			kq[w] = await page.evaluate(() => {
				const doc = document.scrollingElement;
				const bang = document.querySelector('.ant-tree')?.closest('.overflow-x-auto');
				return {
					trangTran: doc.scrollWidth - doc.clientWidth,
					bangCuon: bang ? getComputedStyle(bang).overflowX : null,
					bangRong: bang ? bang.scrollWidth - bang.clientWidth : null,
				};
			});
			await page.screenshot({ path: test.info().outputPath(`vai-tro-${w}.png`) });
		}
		ghiChu('đo', JSON.stringify(kq));
		for (const [w, x] of Object.entries(kq)) {
			expect(x.trangTran, `Rộng ${w}px: TRANG tràn ngang ${x.trangTran}px (phải để bảng tự cuộn)`).toBeLessThanOrEqual(1);
			expect(x.bangCuon, `Rộng ${w}px: bảng không có cuộn ngang`).toMatch(/auto|scroll/);
		}
	});

	test('31_040_006 — Tìm vai trò với nhiều khoảng trắng liên tiếp', async ({ page }) => {
		chanNeuTat('31_040_006');
		const reqs = [];
		page.on('request', (r) => { if (r.url().includes('/auth/chain-role/get-all')) reqs.push(new URL(r.url()).searchParams.get('keyword')); });
		await moVaiTro(page);
		const banDau = await dongVaiTro(page).count();
		await tim(page, '     ');
		const sau = await dongVaiTro(page).count();
		ghiChu('hành vi thật', `${banDau} → ${sau} dòng · keyword gửi BE: ${JSON.stringify(reqs)}`);
		expect(sau, 'Gõ toàn khoảng trắng mà danh sách không còn đủ').toBe(banDau);
	});

	test('31_050_001 — Thêm vai trò bị trùng tên', async ({ page }) => {
		chanNeuTat('31_050_001');
		const st = k.batHeader(page);
		await moVaiTro(page);
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
		const tenCo = chuan(await dongVaiTro(page).first().locator('.ant-tree-title, [class*=title]').first().innerText()).split(/\s{2,}|Bưu|Tổng|Điểm|Pos/)[0].trim();
		const ds = (await k.goiGhi(page, st, 'GET', '/auth/chain-role/get-all', { page: 0, size: 5000 }))?.data ?? [];
		const mau = ds.find((x) => x.roleName && !/A7PQ31/.test(x.roleName)) ?? ds[0];
		const ma = `A7PQ31_TRUNG_${Date.now().toString().slice(-6)}`;
		const v = { ma: null, st };
		try {
			await khung(page).getByRole('button', { name: 'Thêm vai trò' }).click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm mới vai trò' }).last();
			await expect(dr).toBeVisible({ timeout: 10_000 });
			await dr.getByPlaceholder('Vui lòng nhập mã').fill(ma);
			await dr.getByPlaceholder('Vui lòng nhập tên').fill(mau.roleName);
			await dr.locator('.ant-select').first().click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /^Điểm Bán$/ }).click();
			const cho = page.waitForResponse((r) => r.url().includes('/auth/chain-role/create'), { timeout: 15_000 }).catch(() => null);
			await dr.getByRole('button', { name: 'Xác nhận' }).click();
			const r = await cho;
			await page.waitForTimeout(1_500);
			const tb = await thongBao(page);
			const moi = ((await k.goiGhi(page, st, 'GET', '/auth/chain-role/get-all', { page: 0, size: 5000 }))?.data ?? []).filter((x) => x.roleName === mau.roleName);
			if (moi.some((x) => x.roleCode === ma)) v.ma = ma;
			ghiChu('nguyên văn', `tên trùng "${mau.roleName}" (${tenCo}) · ${r ? `${r.status()} ${JSON.stringify((await r.json().catch(() => ({})))?.status)}` : 'không gửi'} · tb "${tb}" · số vai trò cùng tên sau: ${moi.length}`);
			expect(v.ma, `Tạo được vai trò THỨ HAI cùng tên "${mau.roleName}" (mã ${ma}) — không chặn trùng tên`).toBeNull();
		} finally {
			await xoaRac(page, v);
		}
	});

	test('31_060_001 — Mở màn chỉnh sửa vai trò nạp sẵn thông tin', async ({ page }) => {
		chanNeuTat('31_060_001');
		const v = await taoRac(page, '31_060_001');
		try {
			const dr = await moSua(page, v);
			const gt = {
				ma: await dr.getByPlaceholder('Vui lòng nhập mã').inputValue(),
				maKhoa: await dr.getByPlaceholder('Vui lòng nhập mã').isDisabled(),
				ten: await dr.getByPlaceholder('Vui lòng nhập tên').inputValue(),
				phamVi: chuan(await dr.locator('.ant-form-item').filter({ hasText: 'Phạm vi' }).locator('.ant-select').first().innerText().catch(() => '')),
				moTa: await dr.getByPlaceholder('Vui lòng nhập mô tả').inputValue(),
			};
			ghiChu('nạp sẵn', JSON.stringify(gt));
			expect(gt).toEqual({ ma: v.ma, maKhoa: true, ten: v.ten, phamVi: 'Điểm Bán', moTa: 'AUTO TEST — rác 31' });
		} finally { await xoaRac(page, v); }
	});

	test('31_060_002 — Chỉnh sửa bỏ trống trường bắt buộc', async ({ page }) => {
		chanNeuTat('31_060_002');
		const v = await taoRac(page, '31_060_002');
		try {
			const dr = await moSua(page, v);
			const ghi = [];
			page.on('request', (r) => { if (r.url().includes('/auth/chain-role/update')) ghi.push(r.method()); });
			const o = dr.getByPlaceholder('Vui lòng nhập tên');
			await o.click();
			await o.press('ControlOrMeta+a');
			await o.press('Backspace');
			await dr.getByRole('button', { name: 'Xác nhận' }).click();
			await page.waitForTimeout(1_500);
			const loi = chuan((await dr.locator('.ant-form-item-explain-error').allInnerTexts()).join(' | '));
			const ct = await chiTiet(page, v);
			ghiChu('nguyên văn', `${loi} · request update: ${ghi.length}`);
			expect(loi).toContain('Vui lòng nhập tên vai trò');
			expect(ghi, 'Vẫn gửi update khi bỏ trống tên').toEqual([]);
			expect(ct?.data?.roleName).toBe(v.ten);
		} finally { await xoaRac(page, v); }
	});

	test('31_060_003 — Huỷ thao tác chỉnh sửa vai trò', async ({ page }) => {
		chanNeuTat('31_060_003');
		const v = await taoRac(page, '31_060_003');
		try {
			const dr = await moSua(page, v);
			await dr.getByPlaceholder('Vui lòng nhập tên').fill(`${v.ten} SỬA DỞ`);
			await dr.locator('.ant-drawer-close').click();
			await expect(dr).toBeHidden({ timeout: 10_000 });
			const ct = await chiTiet(page, v);
			// Mở lại: form phải nạp lại bản đang lưu, không giữ chữ sửa dở.
			const dr2 = await moSua(page, v);
			const lai = await dr2.getByPlaceholder('Vui lòng nhập tên').inputValue();
			ghiChu('đo', `BE "${ct?.data?.roleName}" · mở lại "${lai}"`);
			expect(ct?.data?.roleName).toBe(v.ten);
			expect(lai, 'Mở lại form vẫn còn chữ sửa dở chưa lưu').toBe(v.ten);
		} finally { await xoaRac(page, v); }
	});

	test('31_080_001 — Tìm chức năng với từ khoá hợp lệ ở màn phân quyền', async ({ page }) => {
		chanNeuTat('31_080_001');
		const v = await taoRac(page, '31_080_001');
		try {
			const dr = await moGanChucNang(page, v);
			const tong = await demSo(dr, 'Tổng cộng');
			await timCn(page, dr, 'Bán hàng');
			const t = await tenLa(dr);
			const tong2 = await demSo(dr, 'Tổng cộng');
			ghiChu('đo', `tổng ${tong} → ${tong2} · lá: ${t.slice(0, 8).join(' · ')}`);
			expect(tong2).toBeGreaterThan(0);
			expect(tong2).toBeLessThan(tong);
		} finally { await xoaRac(page, v); }
	});

	test('31_080_002 — Tìm chức năng với ký tự đặc biệt', async ({ page }) => {
		chanNeuTat('31_080_002');
		const v = await taoRac(page, '31_080_002');
		try {
			const dr = await moGanChucNang(page, v);
			const tong = await demSo(dr, 'Tổng cộng');
			const kq = {};
			for (const tu of ['%', '_', '%_', '<script>']) { await timCn(page, dr, tu); kq[tu] = await demSo(dr, 'Tổng cộng'); }
			ghiChu('hành vi thật', `tổng ${tong} · ${JSON.stringify(kq)}`);
			for (const [tu, n] of Object.entries(kq)) expect(n, `Tìm "${tu}" trả toàn bộ ${tong} chức năng`).toBeLessThan(tong);
		} finally { await xoaRac(page, v); }
	});

	test('31_080_003 — Tìm chức năng với từ khoá có khoảng trắng', async ({ page }) => {
		chanNeuTat('31_080_003');
		const v = await taoRac(page, '31_080_003');
		try {
			const dr = await moGanChucNang(page, v);
			await timCn(page, dr, 'Bán hàng');
			const goc = await demSo(dr, 'Tổng cộng');
			await timCn(page, dr, '   Bán hàng   ');
			const dau = await demSo(dr, 'Tổng cộng');
			await timCn(page, dr, 'Bán   hàng');
			const giua = await demSo(dr, 'Tổng cộng');
			ghiChu('đo', `"Bán hàng" ${goc} · khoảng trắng đầu/cuối ${dau} · nhiều khoảng giữa ${giua}`);
			expect(goc).toBeGreaterThan(0);
			expect(dau, 'Khoảng trắng đầu/cuối làm đổi kết quả').toBe(goc);
		} finally { await xoaRac(page, v); }
	});

	test('31_080_004 — Tìm chức năng không phân biệt hoa thường', async ({ page }) => {
		chanNeuTat('31_080_004');
		const v = await taoRac(page, '31_080_004');
		try {
			const dr = await moGanChucNang(page, v);
			await timCn(page, dr, 'bán hàng');
			const thuong = await demSo(dr, 'Tổng cộng');
			await timCn(page, dr, 'BÁN HÀNG');
			const hoa = await demSo(dr, 'Tổng cộng');
			ghiChu('đo', `thường ${thuong} · hoa ${hoa}`);
			expect(thuong).toBeGreaterThan(0);
			expect(hoa).toBe(thuong);
		} finally { await xoaRac(page, v); }
	});

	test('31_080_005 — Tìm chức năng khi để trống ô tìm kiếm', async ({ page }) => {
		chanNeuTat('31_080_005');
		const v = await taoRac(page, '31_080_005');
		try {
			const dr = await moGanChucNang(page, v);
			const tong = await demSo(dr, 'Tổng cộng');
			await timCn(page, dr, 'ZZZ_KHONG_CO');
			const rong = await demSo(dr, 'Tổng cộng');
			await timCn(page, dr, '');
			const lai = await demSo(dr, 'Tổng cộng');
			ghiChu('đo', `${tong} → ${rong} → ${lai}`);
			expect(rong).toBe(0);
			expect(lai).toBe(tong);
		} finally { await xoaRac(page, v); }
	});

	test('31_080_006 — Chọn tất cả chức năng cho vai trò', async ({ page }) => {
		chanNeuTat('31_080_006');
		const v = await taoRac(page, '31_080_006');
		try {
			const dr = await moGanChucNang(page, v);
			const tong = await demSo(dr, 'Tổng cộng');
			// Ô "chọn tất cả" ở header giả của cây — 🔴 KHÔNG phải checkbox "Chỉ hiển thị mục đã chọn" (đứng trước trong DOM).
			await dr.locator('.ant-checkbox-wrapper').filter({ hasNotText: /Chỉ hiển thị/ }).first().click();
			await page.waitForTimeout(2_000);
			const chon = await demSo(dr, 'Đã chọn');
			ghiChu('đo', `tổng ${tong} · đã chọn ${chon}`);
			expect(chon).toBe(tong);
			// Chỉ trên vai trò rác; đóng không lưu.
			await dr.locator('.ant-drawer-footer').getByRole('button', { name: 'Đóng' }).click();
		} finally { await xoaRac(page, v); }
	});

	test('31_080_007 — Chỉ hiển thị mục đã chọn', async ({ page }) => {
		chanNeuTat('31_080_007');
		const v = await taoRac(page, '31_080_007');
		try {
			const dr = await moGanChucNang(page, v);
			await timCn(page, dr, 'Bán hàng');
			// 🔴 Nút nhóm (checkStrictly) trông như lá khi đang lọc — tick nó đổi cả nhánh. Chỉ giữ nút tick xong "Đã chọn" tăng đúng 1.
			const ten = [];
			const buoc = [];
			const ung = [...new Set(await tenLa(dr))];
			for (const t of ung) {
				if (ten.length === 2) break;
				const o = la(dr).filter({ hasText: new RegExp(`^\\s*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) }).first().locator('.ant-tree-checkbox');
				const truoc = await demSo(dr, 'Đã chọn');
				await o.click();
				await page.waitForTimeout(500);
				const sau = await demSo(dr, 'Đã chọn');
				buoc.push(`${t}: ${truoc}→${sau}`);
				if (sau === truoc + 1) ten.push(t);
				else { await o.click(); await page.waitForTimeout(500); }
			}
			const n = ten.length;
			await timCn(page, dr, '');
			const chon = await demSo(dr, 'Đã chọn');
			ghiChu('từng bước', `${buoc.join(' · ')} · xoá ô tìm → ${chon}`);
			await dr.getByText('Chỉ hiển thị mục đã chọn').click();
			await page.waitForTimeout(2_000);
			const hien = await la(dr).count();
			const chuaTick = await la(dr).filter({ hasNot: page.locator('.ant-tree-checkbox-checked') }).count();
			const tenChua = (await la(dr).filter({ hasNot: page.locator('.ant-tree-checkbox-checked') }).evaluateAll((ns) => ns.map((x) => `${x.innerText.trim()}[${x.querySelector('.ant-tree-switcher')?.className.replace(/ant-tree-switcher/g, '').trim()}|${x.getAttribute('aria-expanded') ?? ''}]`)));
			ghiChu('lá chưa tick đang hiện', tenChua.join(' · '));
			ghiChu('đo', `tick ${n} · Đã chọn ${chon} · lá đang hiện ${hien} (chưa tick ${chuaTick})`);
			expect(chon).toBe(n);
			expect(hien).toBe(n);
			expect(chuaTick).toBe(0);
		} finally { await xoaRac(page, v); }
	});

	test('31_080_008 — Làm mới các chức năng đã chọn', async ({ page }) => {
		chanNeuTat('31_080_008');
		const v = await taoRac(page, '31_080_008');
		try {
			const dr = await moGanChucNang(page, v);
			const truoc = await demSo(dr, 'Đã chọn');
			await timCn(page, dr, 'Bán hàng');
			await la(dr).locator('.ant-tree-checkbox').first().click();
			await page.waitForTimeout(600);
			const giua = await demSo(dr, 'Đã chọn');
			await timCn(page, dr, '');
			await dr.getByRole('button', { name: /Làm mới/ }).click();
			await page.waitForTimeout(3_000);
			const sau = await demSo(dr, 'Đã chọn');
			ghiChu('đo', `đang lưu ${truoc} · tick dở ${giua} · sau "Làm mới" ${sau}`);
			expect(giua).toBe(truoc + 1);
			expect(sau, '"Làm mới" không bỏ lựa chọn chưa lưu (nút chỉ nạp lại danh sách chức năng)').toBe(truoc);
		} finally { await xoaRac(page, v); }
	});

	test('31_080_009 — Gán chức năng thành công cho vai trò', async ({ page }) => {
		chanNeuTat('31_080_009');
		const v = await taoRac(page, '31_080_009');
		try {
			const dr = await moGanChucNang(page, v);
			await timCn(page, dr, 'Bán hàng');
			const ten = chuan(await la(dr).first().innerText());
			await la(dr).locator('.ant-tree-checkbox').first().click();
			await page.waitForTimeout(600);
			await dr.getByRole('button', { name: 'Xác nhận' }).click();
			await page.waitForTimeout(1_500);
			const tb = await thongBao(page);
			const ct = await chiTiet(page, v);
			const dr2 = await moGanChucNang(page, v);
			const lai = await demSo(dr2, 'Đã chọn');
			ghiChu('đo', `chức năng "${ten}" · tb "${tb}" · BE ${JSON.stringify((ct?.data?.functions ?? []).map((f) => f.code))} · mở lại Đã chọn ${lai}`);
			expect(tb).toContain('Gán chức năng thành công');
			expect((ct?.data?.functions ?? []).length).toBe(1);
			expect(lai).toBe(1);
		} finally { await xoaRac(page, v); }
	});

	test('31_080_010 — Xoá vai trò thành công', async ({ page }) => {
		chanNeuTat('31_080_010');
		const v = await taoRac(page, '31_080_010');
		try {
			await tim(page, v.ten);
			await dongCua(page, v.ten).getByRole('button', { name: 'close' }).click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Xác nhận xóa vai trò' }).last();
			await expect(dr).toBeVisible({ timeout: 10_000 });
			ghiChu('nguyên văn cảnh báo', chuan(await dr.locator('.ant-alert').first().innerText()));
			await expect(dr.getByRole('button', { name: 'Xóa vai trò' })).toBeEnabled({ timeout: 15_000 });
			await dr.getByRole('button', { name: 'Xóa vai trò' }).click();
			await page.waitForTimeout(1_500);
			const tb = await thongBao(page);
			await page.waitForTimeout(1_500);
			const con = await dongVaiTro(page).filter({ hasText: v.ten }).count();
			const ct = await chiTiet(page, v);
			ghiChu('đo', `tb "${tb}" · còn trên màn ${con} · get-detail ${ct?.status?.code}`);
			expect(tb).toContain('Xóa vai trò thành công');
			expect(con).toBe(0);
			if (!ct?.data?.roleCode) v.ma = null;
		} finally { await xoaRac(page, v); }
	});

	test('31_080_011 — Gán nhân viên khi chưa chọn ai', async ({ page }) => {
		chanNeuTat('31_080_011');
		const v = await taoRac(page, '31_080_011');
		try {
			const ghi = [];
			page.on('request', (r) => { if (r.method() !== 'GET' && /assign/i.test(r.url())) ghi.push(r.url()); });
			await tim(page, v.ten);
			await dongCua(page, v.ten).getByRole('button', { name: /Gán nhân viên/ }).click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Gán nhân viên' }).last();
			await expect(dr).toBeVisible({ timeout: 10_000 });
			await page.waitForTimeout(2_500);
			await dr.getByRole('button', { name: 'Xác nhận' }).click();
			await page.waitForTimeout(1_000);
			const tb = await thongBao(page);
			ghiChu('nguyên văn', `${tb} · request ghi ${ghi.length}`);
			expect(tb).toContain('Vui lòng thêm ít nhất một nhân viên');
			expect(ghi).toEqual([]);
		} finally { await xoaRac(page, v); }
	});

	test('31_090_002 — Phân trang danh sách vai trò', async ({ page }) => {
		chanNeuTat('31_090_002');
		const reqs = [];
		page.on('request', (r) => { if (r.url().includes('/auth/chain-role/get-all')) reqs.push(Object.fromEntries(new URL(r.url()).searchParams)); });
		await moVaiTro(page);
		const so = await dongVaiTro(page).count();
		const pg = await khung(page).locator('.ant-pagination').count();
		ghiChu('đo', `${so} dòng vai trò trên 1 màn · ${pg} thanh phân trang · tham số ${JSON.stringify(reqs[0])}`);
		void oTim;
		expect(pg, `Danh sách vai trò KHÔNG có phân trang: nạp một lần size=${reqs[0]?.size} (${so} vai trò) vào cây`).toBeGreaterThan(0);
	});

	// ───────── 010 · luồng chính Thêm / Tìm / Sửa / Xoá + 020 mở gán chức năng ─────────

	test('31_010_001 — Mở màn Quản lý vai trò', async ({ page }) => {
		chanNeuTat('31_010_001');
		await moVaiTro(page);
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Quản lý vai trò');
		expect(await dongVaiTro(page).count(), 'Không thấy vai trò nào').toBeGreaterThan(0);
		for (const n of ['Thêm vai trò', 'Xuất excel']) await expect(khung(page).getByRole('button', { name: n })).toBeVisible();
		await expect(oTim(page)).toBeVisible();
	});

	test('31_010_002 — Kiểm tra control chính trên danh sách vai trò', async ({ page }) => {
		chanNeuTat('31_010_002');
		await moVaiTro(page);
		const nut = (await khung(page).getByRole('button').evaluateAll((b) => b.map((x) => (x.innerText || x.getAttribute('aria-label') || '').trim()))).filter(Boolean);
		const boLoc = await khung(page).locator('.ant-select, .ant-picker').count();
		const d = dongVaiTro(page).first();
		const tacVu = await d.getByRole('button').evaluateAll((b) => b.map((x) => (x.innerText || x.getAttribute('aria-label') || '').trim()));
		ghiChu('đo', `nút: ${[...new Set(nut)].join(' · ')} · ô lọc (select/picker): ${boLoc} · thao tác dòng: ${tacVu.join(' · ')}`);
		await expect(oTim(page), 'Không có ô tìm kiếm').toBeVisible();
		await expect(khung(page).getByRole('button', { name: 'Thêm vai trò' })).toBeVisible();
		expect(await dongVaiTro(page).count(), 'Không có bảng danh sách').toBeGreaterThan(0);
		// Nút icon (edit / close) không có chữ — tên truy cập lấy từ <img aria-label> bên trong ⇒ đếm bằng getByRole.
		for (const t of ['edit', 'Gán chức năng', 'Gán nhân viên', 'close']) expect(await d.getByRole('button', { name: t }).count(), `Dòng thiếu thao tác "${t}"`).toBeGreaterThan(0);
		expect(boLoc, 'Màn KHÔNG có ô LỌC nào (chỉ có ô tìm kiếm) — kịch bản đòi "tìm kiếm, lọc"').toBeGreaterThan(0);
	});

	test('31_010_003 — Mở form Thêm vai trò và kiểm tra trường bắt buộc', async ({ page }) => {
		chanNeuTat('31_010_003');
		await moVaiTro(page);
		await khung(page).getByRole('button', { name: 'Thêm vai trò' }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm mới vai trò' }).last();
		await expect(dr).toBeVisible({ timeout: 10_000 });
		const nhan = (await dr.locator('.ant-form-item-label label').allInnerTexts()).map(chuan);
		const batBuoc = await dr.locator('.ant-form-item-required').allInnerTexts();
		const nut = (await dr.getByRole('button').evaluateAll((b) => b.map((x) => (x.innerText || x.getAttribute('aria-label') || '').trim()))).filter(Boolean);
		ghiChu('đo', `nhãn ${nhan.join(' · ')} · bắt buộc ${batBuoc.map(chuan).join(' · ')} · nút ${nut.join(' · ')}`);
		for (const n of ['Mã vai trò', 'Tên vai trò', 'Phạm vi', 'Mô tả']) expect(nhan).toContain(n);
		expect(batBuoc.map(chuan).sort()).toEqual(['Mã vai trò', 'Phạm vi', 'Tên vai trò'].sort());
		expect(nut).toContain('Xác nhận');
		expect(nut.some((x) => /^Hu[ỷỷy]$/i.test(x) || x === 'Hủy'), `Form KHÔNG có nút "Huỷ" (chỉ có dấu X "${nut.join(' · ')}")`).toBe(true);
	});

	test('31_010_004 — Thêm vai trò - validate form rỗng', async ({ page }) => {
		chanNeuTat('31_010_004');
		const ghi = [];
		page.on('request', (r) => { if (r.url().includes('/auth/chain-role/create')) ghi.push(r.method()); });
		await moVaiTro(page);
		await khung(page).getByRole('button', { name: 'Thêm vai trò' }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm mới vai trò' }).last();
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_000);
		const loi = (await dr.locator('.ant-form-item-explain-error').allInnerTexts()).map(chuan);
		ghiChu('nguyên văn lỗi', loi.join(' | '));
		expect(loi.sort()).toEqual(['Vui lòng chọn phạm vi', 'Vui lòng nhập mã vai trò', 'Vui lòng nhập tên vai trò'].sort());
		expect(ghi).toEqual([]);
	});

	test('31_010_005 — Thêm vai trò hợp lệ', async ({ page }) => {
		chanNeuTat('31_010_005');
		const st = k.batHeader(page);
		await moVaiTro(page);
		const ts = Date.now().toString().slice(-6);
		const v = { ma: null, st, ten: `A7PQ31 Vai trò UI ${ts}` };
		const ma = `A7PQ31_UI_${ts}`;
		try {
			await khung(page).getByRole('button', { name: 'Thêm vai trò' }).click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm mới vai trò' }).last();
			await dr.getByPlaceholder('Vui lòng nhập mã').fill(ma);
			await dr.getByPlaceholder('Vui lòng nhập tên').fill(v.ten);
			await dr.locator('.ant-select').first().click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /^Điểm Bán$/ }).click();
			await dr.getByPlaceholder('Vui lòng nhập mô tả').fill('AUTO TEST — rác 31 UI');
			const cho = page.waitForResponse((r) => r.url().includes('/auth/chain-role/create'), { timeout: 15_000 });
			await dr.getByRole('button', { name: 'Xác nhận' }).click();
			const b = await (await cho).json().catch(() => null);
			if (String(b?.status?.code) === '200') v.ma = ma;
			await page.waitForTimeout(1_000);
			const tb = await thongBao(page);
			await page.waitForTimeout(2_000);
			await tim(page, v.ten);
			const thay = await dongVaiTro(page).filter({ hasText: v.ten }).count();
			ghiChu('đo', `${JSON.stringify(b?.status)} · tb "${tb}" · trong danh sách ${thay}`);
			expect(tb).toContain('Thêm mới thành công');
			expect(thay).toBe(1);
			expect(chuan(await dongCua(page, v.ten).innerText())).toMatch(/điểm bán/i);
		} finally { await xoaRac(page, v); }
	});

	test('31_010_006 — Tìm kiếm vai trò theo mã/tên', async ({ page }) => {
		chanNeuTat('31_010_006');
		const v = await taoRac(page, '31_010_006');
		try {
			await tim(page, v.ten);
			const theoTen = (await dongVaiTro(page).allInnerTexts()).map(chuan);
			await tim(page, v.ma);
			const theoMa = (await dongVaiTro(page).allInnerTexts()).map(chuan);
			ghiChu('đo', `tên → ${theoTen.length} dòng · mã → ${theoMa.length} dòng (${theoMa.join(' | ').slice(0, 200)})`);
			expect(theoTen).toHaveLength(1);
			expect(theoTen[0]).toContain(v.ten);
			expect(theoMa.length, `Tìm theo MÃ vai trò "${v.ma}" không ra`).toBe(1);
		} finally { await xoaRac(page, v); }
	});

	test('31_010_007 — Cập nhật tên/phạm vi vai trò', async ({ page }) => {
		chanNeuTat('31_010_007');
		const v = await taoRac(page, '31_010_007');
		try {
			const dr = await moSua(page, v);
			const moi = `${v.ten} SỬA`;
			await dr.getByPlaceholder('Vui lòng nhập tên').fill(moi);
			await dr.locator('.ant-form-item').filter({ hasText: 'Phạm vi' }).locator('.ant-select').first().click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /^Bưu Điện Xã$/ }).click();
			await dr.getByRole('button', { name: 'Xác nhận' }).click();
			await page.waitForTimeout(1_000);
			const tb = await thongBao(page);
			await page.waitForTimeout(2_000);
			const ct = await chiTiet(page, v);
			await tim(page, moi);
			const dongMoi = chuan(await dongCua(page, moi).innerText().catch(() => ''));
			ghiChu('đo', `tb "${tb}" · BE ${ct?.data?.roleName}/${ct?.data?.allowedLevel} · dòng "${dongMoi}"`);
			expect(tb).toContain('Cập nhật thành công');
			expect([ct?.data?.roleName, ct?.data?.allowedLevel]).toEqual([moi, 'BUU_DIEN_XA']);
			expect(dongMoi, 'Danh sách chưa cập nhật tên/phạm vi').toMatch(/SỬA.*B[ưƯ]u [đĐ]i[ệỆ]n X[ãÃ]/i);
		} finally { await xoaRac(page, v); }
	});

	test('31_010_008 — Hủy thao tác xóa vai trò', async ({ page }) => {
		chanNeuTat('31_010_008');
		const v = await taoRac(page, '31_010_008');
		try {
			const ghi = [];
			page.on('request', (r) => { if (r.url().includes('/auth/chain-role/delete')) ghi.push(r.method()); });
			await tim(page, v.ten);
			await dongCua(page, v.ten).getByRole('button', { name: 'close' }).click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Xác nhận xóa vai trò' }).last();
			await expect(dr).toBeVisible({ timeout: 10_000 });
			await dr.getByRole('button', { name: 'Hủy' }).click();
			await expect(dr).toBeHidden({ timeout: 10_000 });
			const ct = await chiTiet(page, v);
			expect(ghi).toEqual([]);
			expect(ct?.data?.roleCode).toBe(v.ma);
			expect(await dongVaiTro(page).filter({ hasText: v.ten }).count()).toBe(1);
		} finally { await xoaRac(page, v); }
	});

	test('31_020_001 — Mở màn gán quyền chức năng cho vai trò', async ({ page }) => {
		chanNeuTat('31_020_001');
		const v = await taoRac(page, '31_020_001');
		try {
			const dr = await moGanChucNang(page, v);
			const tong = await demSo(dr, 'Tổng cộng');
			const hop = await dr.locator('.ant-tree-checkbox').count();
			ghiChu('đo', `tổng ${tong} chức năng · ${hop} ô tick đang render`);
			expect(tong).toBeGreaterThan(0);
			expect(hop).toBeGreaterThan(0);
		} finally { await xoaRac(page, v); }
	});

	// Gán một chức năng qua drawer, trả mã chức năng BE đã lưu.
	const ganMot = async (page, v, tu) => {
		const dr = await moGanChucNang(page, v);
		await timCn(page, dr, tu);
		await la(dr).locator('.ant-tree-checkbox').first().click();
		await page.waitForTimeout(600);
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);
		return { tb: await thongBao(page), ma: ((await chiTiet(page, v))?.data?.functions ?? []).map((f) => f.code) };
	};

	test('31_020_002 — Tick quyền chức năng và hủy', async ({ page }) => {
		chanNeuTat('31_020_002');
		const v = await taoRac(page, '31_020_002');
		try {
			// Tiền đề: vai trò có sẵn MỘT chức năng đã tích (để bước 3 "bỏ tích chức năng đang tích sẵn" có nghĩa).
			const truoc = await ganMot(page, v, 'Bán hàng');
			expect(truoc.ma, `Không dựng được chức năng tích sẵn: ${truoc.tb}`).toHaveLength(1);
			const dr = await moGanChucNang(page, v);
			expect(await demSo(dr, 'Đã chọn'), 'Mở lại không thấy chức năng tích sẵn').toBe(1);
			const ghi = [];
			page.on('request', (r) => { if (r.method() !== 'GET' && /chain-role/i.test(r.url())) ghi.push(`${r.method()} ${r.url()}`); });
			// Bước 2: tích thêm vài dòng chưa chọn.
			await timCn(page, dr, 'Kho');
			const chuaChon = la(dr).filter({ hasNot: page.locator('.ant-tree-checkbox-checked') });
			expect(await chuaChon.count(), 'Không có chức năng chưa chọn để tích').toBeGreaterThan(1);
			for (const i of [0, 1]) await chuaChon.nth(0).locator('.ant-tree-checkbox').click().then(() => page.waitForTimeout(400)).catch(() => {});
			// Bước 3: bỏ tích chức năng đang tích sẵn.
			await timCn(page, dr, 'Bán hàng');
			await la(dr).filter({ has: page.locator('.ant-tree-checkbox-checked') }).first().locator('.ant-tree-checkbox').click();
			await page.waitForTimeout(600);
			const giua = await demSo(dr, 'Đã chọn');
			// Bước 4: huỷ (drawer chỉ có "Đóng" / "Xác nhận" — "Đóng" là nút huỷ).
			// 🔴 Có HAI nút tên "Đóng": dấu X ở đầu drawer (aria-label) và nút footer — bấm nút footer.
			await dr.locator('.ant-drawer-footer').getByRole('button', { name: 'Đóng' }).click();
			await expect(dr).toBeHidden({ timeout: 10_000 });
			const sau = ((await chiTiet(page, v))?.data?.functions ?? []).map((f) => f.code);
			const dr2 = await moGanChucNang(page, v);
			const lai = await demSo(dr2, 'Đã chọn');
			ghiChu('đo', `trước ${JSON.stringify(truoc.ma)} · sau khi tích/bỏ tích Đã chọn ${giua} · request ghi ${ghi.length} · BE sau huỷ ${JSON.stringify(sau)} · mở lại Đã chọn ${lai}`);
			expect(giua, 'Tích 2 + bỏ tích 1 mà bộ đếm "Đã chọn" không đổi').toBe(2);
			expect(ghi, `Bấm Đóng mà vẫn gửi request ghi: ${ghi.join(' ; ')}`).toEqual([]);
			expect(sau, 'Huỷ mà quyền đã lưu bị đổi').toEqual(truoc.ma);
			expect(lai, 'Mở lại sau khi huỷ mà thao tác chưa được thu hồi').toBe(1);
		} finally { await xoaRac(page, v); }
	});

	test('31_020_003 — Tick quyền chức năng và xác nhận', async ({ page }) => {
		chanNeuTat('31_020_003');
		const v = await taoRac(page, '31_020_003');
		try {
			const kq = await ganMot(page, v, 'Kho');
			const dr = await moGanChucNang(page, v);
			const lai = await demSo(dr, 'Đã chọn');
			ghiChu('đo', `tb "${kq.tb}" · BE ${JSON.stringify(kq.ma)} · mở lại Đã chọn ${lai}`);
			expect(kq.tb).toContain('Gán chức năng thành công');
			expect(kq.ma).toHaveLength(1);
			expect(lai).toBe(1);
		} finally { await xoaRac(page, v); }
	});

	test('31_010_009 — Xóa vai trò vừa tạo', async ({ page }) => {
		chanNeuTat('31_010_009');
		const v = await taoRac(page, '31_010_009');
		try {
			await tim(page, v.ten);
			await expect(dongCua(page, v.ten), 'Không thấy vai trò vừa tạo trên danh sách').toBeVisible({ timeout: 15_000 });
			await dongCua(page, v.ten).getByRole('button', { name: 'close' }).click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Xác nhận xóa vai trò' }).last();
			await expect(dr).toBeVisible({ timeout: 10_000 });
			await expect(dr.getByRole('button', { name: 'Xóa vai trò' })).toBeEnabled({ timeout: 15_000 });
			await dr.getByRole('button', { name: 'Xóa vai trò' }).click();
			await page.waitForTimeout(1_500);
			const tb = await thongBao(page);
			await tim(page, v.ten);
			const con = await dongVaiTro(page).filter({ hasText: v.ten }).count();
			const ct = await chiTiet(page, v);
			ghiChu('đo', `tb "${tb}" · còn trên danh sách ${con} · get-detail ${JSON.stringify(ct?.status)}`);
			expect(tb).toContain('Xóa vai trò thành công');
			expect(con, 'Xoá xong vai trò vẫn còn trong danh sách').toBe(0);
			if (!ct?.data?.roleCode) v.ma = null;
		} finally { await xoaRac(page, v); }
	});
});
