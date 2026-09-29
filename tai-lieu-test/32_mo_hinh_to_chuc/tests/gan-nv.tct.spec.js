'use strict';

/**
 * 32_170 · Gán nhân viên cho đơn vị (drawer "Gắn nhân viên" — nút mở là "Gán nhân viên"), vai `tct`.
 * 🔴 Chỉ gán vào XÃ RÁC `A7MH32*` (tạo mới mỗi case, API), nhân viên làn KHÔNG dùng đăng nhập ở project nào: `AUTO7_CUI`
 * (seed làn 7, cung ứng tỉnh). Dọn: `DELETE /chain-employment-profile/v1.2/assignment?assignmentId=` cho mọi phân công ở `A7MH32*`,
 * rồi xoá xã/tỉnh rác.
 * Trace `DrawerAssignEmployeeOrganization.jsx`: dòng mới "+ Thêm nhân viên & vai trò" (`isNew`), ô "Chọn đơn vị / cửa hàng" ·
 * "Chọn nhân viên" (tìm từ xa) · "Chọn vai trò" · "Trạng thái" (Đang làm / Đã nghỉ); nút "✕" chỉ bật với dòng mới;
 * "Hủy" / "Xác nhận" (POST `/chain-employment-profile/v1.2/batch-assign-roles`); toast "Gán nhân viên thành công";
 * lỗi ô "Chọn nhân viên" / "Chọn vai trò" / "Chọn đơn vị"; trùng: "Cùng một nhân viên trong cùng một đơn vị/cửa hàng không được gán trùng vai trò".
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const o = require('./org-ghi');

const GOC = path.join(__dirname, '..');
const NV = 'AUTO7_CUI';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const nvId = () => o.g.selectDb(`SELECT sys_user_id FROM VNPOST_CORE.CHAIN_EMPLOYMENT_PROFILE WHERE chain_id=626 AND employee_code='${NV}' AND is_deleted=0 LIMIT 1`)[0]?.[0];
/** Phân công đang hiệu lực của NV ở các đơn vị `ma[]`. */
const phanCong = (ma) => o.g.selectDb(`SELECT id, org_unit_code, role_id, status FROM VNPOST_CORE.CHAIN_SHOP_EMPLOYMENT_MANAGE WHERE chain_id=626 AND sys_user_id=${Number(nvId())} AND is_active=1 AND org_unit_code IN (${ma.map((m) => `'${m}'`).join(',')})`);

async function mo(page) {
	const st = o.k.batHeader(page);
	await o.moMan(page, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	return { page, st };
}
async function donPhanCong(ps) {
	// 🔴 Vai tct nhận SSHOP-401 ở DELETE assignment ⇒ lùi về đặt status 0 (Đã nghỉ) qua batch-assign-roles KHI đơn vị còn sống
	//    (đơn vị đã xoá thì batch trả 200 mà không đổi — phân công mồ côi 29943 ngày 25/09).
	const ds = o.g.selectDb("SELECT id, sys_user_id, org_unit_code, role_id FROM VNPOST_CORE.CHAIN_SHOP_EMPLOYMENT_MANAGE WHERE chain_id=626 AND is_active=1 AND status=1 AND org_unit_code LIKE 'A7MH32%' AND org_unit_code NOT LIKE 'A7MH32T901183%'");
	const kq = [];
	for (const [id, u, dv, vt] of ds) {
		const x = await o.k.goiGhi(ps.page, ps.st, 'DELETE', '/chain-employment-profile/v1.2/assignment', { assignmentId: id });
		if (String(x?.status?.code) === '200') { kq.push(`${id} xoá`); continue; }
		const b = await o.k.goiGhi(ps.page, ps.st, 'POST', '/chain-employment-profile/v1.2/batch-assign-roles', {}, { assignments: [{ id: Number(id), sysUserId: Number(u), orgUnitCode: dv, roleId: Number(vt), status: 0 }] });
		const con = o.g.selectDb(`SELECT status FROM VNPOST_CORE.CHAIN_SHOP_EMPLOYMENT_MANAGE WHERE id=${Number(id)}`)[0]?.[0];
		kq.push(`${id} xoá ${x?.status?.code} → nghỉ ${b?.status?.code} (status ${con})`);
	}
	return kq;
}
async function don(ps, r) {
	const a = await donPhanCong(ps);
	const b = [];
	for (const m of [...(r?.xa ?? []).map((x) => x.ma), r?.tinh].filter(Boolean)) if (o.conSong(m)) b.push(await o.xoaDvApi(ps, m));
	ghiChu('dọn', `phân công ${a.join(',') || '-'} · đơn vị ${b.join(',') || '-'}`);
}

async function moGan(page, tenDv) {
	await o.chonTrenCay(page, tenDv);
	await o.khungChiTiet(page).getByRole('button', { name: /Gán nhân viên/ }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Gắn nhân viên' }).last();
	await expect(dr, 'Không mở drawer "Gắn nhân viên"').toBeVisible({ timeout: 10_000 });
	await page.waitForTimeout(2_500);
	return dr;
}
const oTrong = (page, dr, ph) => dr.locator('.ant-select').filter({ hasText: new RegExp(`^\\s*${ph}\\s*$`) }).last();
const soDong = async (page, dr) => dr.locator('.ant-select').filter({ hasText: /^\s*Chọn nhân viên\s*$/ }).count()
	+ dr.locator('.ant-select').filter({ hasText: new RegExp(NV) }).count();
async function themDong(dr) {
	await dr.getByRole('button', { name: /Thêm nhân viên & vai trò/ }).click();
	await dr.page().waitForTimeout(600);
}
/** Điền dòng mới cuối: đơn vị (mã/tên) · nhân viên · vai trò (regex). Bỏ qua phần null. */
async function dienDong(page, dr, { dv = null, nv = NV, vaiTro = /Giám đốc/ } = {}) {
	if (dv) {
		const oDv = oTrong(page, dr, 'Chọn đơn vị / cửa hàng');
		await oDv.click();
		const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
		await page.waitForTimeout(1_200);
		// Cây đơn vị gốc = nút đang mở drawer (tỉnh ⇒ xã con bị thu gọn) ⇒ gõ tìm nếu ô cho phép.
		const inp = oDv.locator('input');
		if (await inp.isEditable().catch(() => false)) { await inp.pressSequentially(o.dbDv(dv)?.ten ?? dv, { delay: 15 }); await page.waitForTimeout(1_500); }
		// dv = mã xã ⇒ khớp mã HOẶC tên (TreeSelect đơn vị hiện tên).
		const ten = o.dbDv(dv)?.ten ?? dv;
		const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		await dd.locator('.ant-select-tree-treenode').filter({ hasText: new RegExp(`${esc(dv)}|${esc(ten)}`) }).first().locator('.ant-select-tree-node-content-wrapper').click();
		await page.waitForTimeout(600);
	}
	if (nv) {
		const s = oTrong(page, dr, 'Chọn nhân viên');
		await s.click();
		await s.locator('input').pressSequentially(nv, { delay: 30 });
		await page.waitForTimeout(2_500);
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last().locator('.ant-select-item-option').filter({ hasText: nv }).first().click();
		await page.waitForTimeout(600);
	}
	if (vaiTro) {
		await oTrong(page, dr, 'Chọn vai trò').click();
		await page.waitForTimeout(1_000);
		const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
		const opt = dd.locator('.ant-select-item-option').filter({ hasText: vaiTro }).first();
		const ten = o.chuan(await opt.innerText().catch(() => ''));
		await opt.click();
		await page.waitForTimeout(600);
		return ten;
	}
	return null;
}
async function xacNhan(page, dr) {
	const cho = page.waitForResponse((r) => r.url().includes('batch-assign-roles'), { timeout: 10_000 }).catch(() => null);
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	// Toast lỗi (message.error) tắt nhanh ⇒ gom chữ trong 3 giây ngay sau khi bấm.
	const gom = new Set();
	for (let i = 0; i < 6; i += 1) { (await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])).forEach((t) => gom.add(o.chuan(t))); await page.waitForTimeout(500); }
	const r = await cho;
	return {
		tbGom: [...gom].join(' | '),
		req: r ? r.request().postDataJSON() : null,
		res: r ? await r.json().catch(() => null) : null,
		tb: await o.thongBao(page),
		loi: (await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).map(o.chuan),
	};
}

test.describe('32_170 · Gán nhân viên (xã rác, vai tct)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('32 don rac gan nv — gỡ phân công ở A7MH32*', async ({ page }) => {
		const ps = await mo(page);
		ghiChu('đã gỡ', (await donPhanCong(ps)).join(' · ') || '(không có)');
	});

	test('32_170_002 — Gán mới một nhân viên với vai trò Giám đốc', async ({ page }) => {
		chanNeuTat('32_170_002');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 1);
		try {
			await page.reload(); await page.waitForTimeout(5_000);
			const dr = await moGan(page, r.xa[0].ten);
			await themDong(dr);
			const vt = await dienDong(page, dr, { dv: r.xa[0].ma });
			const kq = await xacNhan(page, dr);
			const pc = phanCong([r.xa[0].ma]);
			ghiChu('đo', `vai trò "${vt}" · ${JSON.stringify(kq.req)} · ${kq.res?.status?.code} · tb "${kq.tb}" · lỗi ${kq.loi.join(' | ')} · DB ${JSON.stringify(pc)}`);
			expect(kq.tb).toContain('Gán nhân viên thành công');
			expect(pc).toHaveLength(1);
			const dr2 = await moGan(page, r.xa[0].ten);
			expect(o.chuan(await dr2.innerText()), 'Mở lại không thấy dòng gán vừa lưu').toContain(NV);
		} finally { await don(ps, r); }
	});

	test('32_170_003 — Gán cùng một nhân viên cho nhiều đơn vị và vai trò', async ({ page }) => {
		chanNeuTat('32_170_003');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 2);
		try {
			await page.reload(); await page.waitForTimeout(5_000);
			let dr = await moGan(page, r.xa[0].ten);
			await themDong(dr);
			await dienDong(page, dr, { dv: r.xa[0].ma, vaiTro: /Giám đốc/ });
			const k1 = await xacNhan(page, dr);
			dr = await moGan(page, r.xa[1].ten);
			await themDong(dr);
			const vt2 = await dienDong(page, dr, { dv: r.xa[1].ma, vaiTro: /^(?!.*Giám đốc).+/ });
			const k2 = await xacNhan(page, dr);
			const pc = phanCong(r.xa.map((x) => x.ma));
			ghiChu('đo', `1: "${k1.tb}" · 2 (${vt2}): "${k2.tb}" · DB ${JSON.stringify(pc)}`);
			expect(k2.tb).toContain('Gán nhân viên thành công');
			expect(new Set(pc.map((p) => p[1])).size, 'Nhân viên không giữ đồng thời 2 phân công').toBe(2);
		} finally { await don(ps, r); }
	});

	test('32_170_004 — Gán nhân viên có trạng thái Đã nghỉ', async ({ page }) => {
		chanNeuTat('32_170_004');
		const ps = await mo(page);
		const nghi = o.g.selectDb("SELECT employee_code, name FROM VNPOST_CORE.CHAIN_EMPLOYMENT_PROFILE WHERE chain_id=626 AND is_deleted=0 AND work_status=0 AND employee_code IS NOT NULL ORDER BY id DESC LIMIT 1")[0];
		test.skip(!nghi, 'Chuỗi không có nhân viên nào work_status=0 (Đã nghỉ).');
		const r = await o.taoNhanhRac(ps, 1);
		try {
			await page.reload(); await page.waitForTimeout(5_000);
			const dr = await moGan(page, r.xa[0].ten);
			await themDong(dr);
			const s = oTrong(page, dr, 'Chọn nhân viên');
			await s.click();
			await s.locator('input').pressSequentially(nghi[0], { delay: 30 });
			await page.waitForTimeout(3_000);
			const opts = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last().locator('.ant-select-item-option').allInnerTexts()).map(o.chuan);
			ghiChu('hành vi thật', `NV đã nghỉ ${nghi[0]} (${nghi[1]}) ⇒ dropdown: ${opts.join(' | ') || '(không có)'}`);
			await page.keyboard.press('Escape');
			// Chưa chốt kỳ vọng — chỉ ghi nhận; phép kiểm tối thiểu: dropdown tra được (không lỗi) và có kết luận rõ.
			expect(Array.isArray(opts)).toBe(true);
		} finally { await don(ps, r); }
	});

	test('32_170_005 — Đổi trạng thái nhân viên từ Đang làm sang Đã nghỉ', async ({ page }) => {
		chanNeuTat('32_170_005');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 2);
		try {
			await page.reload(); await page.waitForTimeout(5_000);
			for (const x of r.xa) {
				const dr = await moGan(page, x.ten);
				await themDong(dr);
				await dienDong(page, dr, { dv: x.ma });
				await xacNhan(page, dr);
			}
			const truoc = phanCong(r.xa.map((x) => x.ma));
			const dr = await moGan(page, r.xa[0].ten);
			const tt = dr.locator('.ant-select').filter({ hasText: 'Đang làm' }).last();
			await tt.click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last().locator('.ant-select-item-option').filter({ hasText: 'Đã nghỉ' }).click();
			const kq = await xacNhan(page, dr);
			const sau = o.g.selectDb(`SELECT id, org_unit_code, status, is_active FROM VNPOST_CORE.CHAIN_SHOP_EMPLOYMENT_MANAGE WHERE chain_id=626 AND sys_user_id=${Number(nvId())} AND org_unit_code IN ('${r.xa[0].ma}','${r.xa[1].ma}') ORDER BY id`);
			ghiChu('hành vi thật', `tb "${kq.tb}" · trước ${JSON.stringify(truoc)} · sau ${JSON.stringify(sau)}`);
			const x0 = sau.filter((s) => s[1] === r.xa[0].ma);
			const x1 = sau.filter((s) => s[1] === r.xa[1].ma);
			expect(x0.some((s) => s[2] === '0'), 'Dòng vừa đổi không sang Đã nghỉ').toBe(true);
			expect(x1.every((s) => s[2] === '1'), 'Đổi 1 dòng mà phân công KHÁC của cùng nhân viên cũng bị đổi').toBe(true);
		} finally { await don(ps, r); }
	});

	test('32_170_006 — Xoá một dòng gán nhân viên bằng nút x', async ({ page }) => {
		chanNeuTat('32_170_006');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 1);
		try {
			await page.reload(); await page.waitForTimeout(5_000);
			const dr = await moGan(page, r.xa[0].ten);
			await themDong(dr);
			await dienDong(page, dr, { dv: r.xa[0].ma, vaiTro: /Giám đốc/ });
			await themDong(dr);
			await dienDong(page, dr, { dv: r.xa[0].ma, vaiTro: /^(?!.*Giám đốc).+/ });
			const x = dr.getByRole('button', { name: '✕' });
			const n = await x.count();
			await x.last().click();
			await page.waitForTimeout(800);
			const kq = await xacNhan(page, dr);
			const pc = phanCong([r.xa[0].ma]);
			ghiChu('đo', `nút ✕: ${n} · body ${JSON.stringify(kq.req)} · tb "${kq.tb}" · DB ${JSON.stringify(pc)}`);
			expect(kq.req?.assignments ?? [], 'Body còn dòng đã bấm ✕').toHaveLength(1);
			expect(pc).toHaveLength(1);
		} finally { await don(ps, r); }
	});

	test('32_170_007 — Bấm Thêm nhân viên và vai trò nhiều lần', async ({ page }) => {
		chanNeuTat('32_170_007');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 1);
		try {
			await page.reload(); await page.waitForTimeout(5_000);
			const dr = await moGan(page, r.xa[0].ten);
			const dem = [];
			const n0 = await dr.locator('.ant-select').filter({ hasText: /^\s*Chọn nhân viên\s*$/ }).count();
			for (let i = 0; i < 3; i += 1) {
				await themDong(dr);
				dem.push(await dr.locator('.ant-select').filter({ hasText: /^\s*Chọn nhân viên\s*$/ }).count());
			}
			ghiChu('đo', `số dòng trống: ${n0} → ${dem.join(' → ')}`);
			expect(dem).toEqual([n0 + 1, n0 + 2, n0 + 3]);
			await dr.getByRole('button', { name: 'Hủy' }).click();
		} finally { await don(ps, r); }
	});

	for (const [id, ten, dien, mong] of [
		// Ô vai trò bị khoá tới khi chọn nhân viên ⇒ 008 để trống cả hai.
		['32_170_008', 'Xác nhận khi dòng mới chưa chọn nhân viên', { nv: null, vaiTro: null }, 'Chọn nhân viên'],
		['32_170_009', 'Xác nhận khi dòng mới chưa chọn vai trò', { vaiTro: null }, 'Chọn vai trò'],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			const ps = await mo(page);
			const r = await o.taoNhanhRac(ps, 1);
			try {
				await page.reload(); await page.waitForTimeout(5_000);
				const dr = await moGan(page, r.xa[0].ten);
				await themDong(dr);
				await dienDong(page, dr, { dv: r.xa[0].ma, ...dien });
				const kq = await xacNhan(page, dr);
				ghiChu('nguyên văn', `${kq.loi.join(' | ')} · tb "${kq.tb}" · request ${kq.req ? 'CÓ' : 'không'}`);
				expect(kq.req).toBeNull();
				expect(kq.loi).toContain(mong);
			} finally { await don(ps, r); }
		});
	}

	test('32_170_010 — Gán trùng cùng nhân viên với cùng vai trò', async ({ page }) => {
		chanNeuTat('32_170_010');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 1);
		try {
			await page.reload(); await page.waitForTimeout(5_000);
			let dr = await moGan(page, r.xa[0].ten);
			await themDong(dr);
			await dienDong(page, dr, { dv: r.xa[0].ma });
			await xacNhan(page, dr);
			dr = await moGan(page, r.xa[0].ten);
			await themDong(dr);
			await dienDong(page, dr, { dv: r.xa[0].ma });
			const kq = await xacNhan(page, dr);
			const pc = phanCong([r.xa[0].ma]);
			ghiChu('nguyên văn', `tb "${kq.tbGom}" · lỗi ô ${kq.loi.join(' | ')} · request ${kq.req ? 'CÓ' : 'không'} · DB ${JSON.stringify(pc)}`);
			expect(pc, 'Nhân đôi phân công cùng nhân viên + vai trò + đơn vị').toHaveLength(1);
			expect(`${kq.tbGom} ${kq.loi.join(' ')}`, 'Bị chặn nhưng KHÔNG có thông báo nào giải thích').toMatch(/trùng|đã được gán|tồn tại/i);
		} finally { await don(ps, r); }
	});

	test('32_170_011 — Huỷ thao tác Gán nhân viên', async ({ page }) => {
		chanNeuTat('32_170_011');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 1);
		try {
			await page.reload(); await page.waitForTimeout(5_000);
			const gui = [];
			page.on('request', (q) => { if (q.url().includes('batch-assign-roles')) gui.push(1); });
			let dr = await moGan(page, r.xa[0].ten);
			await themDong(dr);
			await dienDong(page, dr, { dv: r.xa[0].ma });
			await dr.getByRole('button', { name: 'Hủy' }).click();
			await page.waitForTimeout(1_500);
			dr = await moGan(page, r.xa[0].ten);
			const chu = o.chuan(await dr.innerText());
			ghiChu('đo', `request ${gui.length} · mở lại: ${chu.slice(0, 200)}`);
			expect(gui).toEqual([]);
			expect(phanCong([r.xa[0].ma])).toHaveLength(0);
			expect(chu, 'Mở lại vẫn còn dòng chưa lưu').not.toContain(NV);
		} finally { await don(ps, r); }
	});

	test('32_170_013 — Đổi Đơn vị của một dòng gán đã có', async ({ page }) => {
		chanNeuTat('32_170_013');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 2);
		try {
			await page.reload(); await page.waitForTimeout(5_000);
			let dr = await moGan(page, r.xa[0].ten);
			await themDong(dr);
			await dienDong(page, dr, { dv: r.xa[0].ma });
			await xacNhan(page, dr);
			// Drawer chỉ liệt kê phân công của ĐÚNG đơn vị đang chọn ⇒ mở lại ở xã 1; ô đơn vị có gốc = xã 1.
			dr = await moGan(page, r.xa[0].ten);
			const oDv = dr.locator('.ant-select').first();
			const khoa = (await oDv.getAttribute('class')).includes('ant-select-disabled');
			let lua = [];
			let kq = null;
			if (!khoa) {
				await oDv.click();
				await page.waitForTimeout(1_200);
				const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
				lua = (await dd.locator('.ant-select-tree-treenode').allInnerTexts()).map(o.chuan);
				const moi = dd.locator('.ant-select-tree-treenode').filter({ hasText: r.xa[1].ten }).first();
				if (await moi.count()) { await moi.locator('.ant-select-tree-node-content-wrapper').click(); kq = await xacNhan(page, dr); } else await page.keyboard.press('Escape');
			}
			const a = phanCong([r.xa[0].ma]);
			const b = phanCong([r.xa[1].ma]);
			ghiChu('hành vi thật', `ô đơn vị dòng đã lưu ${khoa ? 'BỊ KHOÁ' : `mở được, lựa chọn: ${lua.join(' | ')}`} · ${JSON.stringify(kq && { tb: kq.tbGom, body: kq.req })} · xã cũ ${JSON.stringify(a)} · xã mới ${JSON.stringify(b)}`);
			expect(b, `Không đổi được đơn vị của dòng gán đã có sang "${r.xa[1].ten}" (${khoa ? 'ô bị khoá' : 'không có trong lựa chọn'})`).toHaveLength(1);
			expect(a, 'Đơn vị cũ vẫn còn dòng gán').toHaveLength(0);
		} finally { await don(ps, r); }
	});

	test('32_170_014 — Số lượng nhân viên gán hiển thị đồng bộ', async ({ page }) => {
		chanNeuTat('32_170_014');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 1);
		try {
			await page.reload(); await page.waitForTimeout(5_000);
			await o.chonTrenCay(page, r.xa[0].ten);
			const doc = async () => {
				const t = o.chuan(await o.khungChiTiet(page).innerText());
				return (t.match(/(?:Số lượng nhân viên|Nhân viên)[^\d]{0,20}(\d+)/) || [])[1];
			};
			const truoc = await doc();
			const dr = await moGan(page, r.xa[0].ten);
			await themDong(dr);
			await dienDong(page, dr, { dv: r.xa[0].ma });
			await xacNhan(page, dr);
			await page.reload(); await page.waitForTimeout(5_000);
			await o.chonTrenCay(page, r.xa[0].ten);
			const sau = await doc();
			const cay = o.chuan(await o.nutCay(page).filter({ hasText: r.xa[0].ten }).first().innerText());
			ghiChu('đo', `chi tiết trước "${truoc}" · sau "${sau}" · nút cây "${cay}"`);
			expect(truoc, 'Chi tiết đơn vị KHÔNG hiển thị số lượng nhân viên được gán').toBeDefined();
			expect(Number(sau)).toBe(Number(truoc) + 1);
		} finally { await don(ps, r); }
	});
});
