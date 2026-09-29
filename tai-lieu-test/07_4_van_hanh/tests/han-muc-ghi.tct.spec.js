'use strict';

/**
 * 07_4 · 020 / 050 — Cấu hình HẠN MỨC DUYỆT và luồng duyệt nhiều bước, GHI THẬT (26/09/2026). Vai chính `tct`.
 *
 * Nguồn vnpost-web `features/shop/pages/settingPage/settingContents/ApprovalLimitSetting.jsx` + `services/approvalLimitApi.js`:
 * `GET/POST /approval-limits`, `PUT /approval-limits/{id}`, `PATCH …/{id}/status`, `DELETE …/{id}`. Form "Cập nhật cấu hình hạn mức":
 * Mã cấu hình (actionCode) · Tên action · Hiệu lực · danh sách khoảng tiền (Min (>=) / Max (<)) · mỗi khoảng có các bước (Tên bước ·
 * Cấp tổ chức: Điểm bán / Bưu điện xã / Bưu điện tỉnh / Tổng công ty · Role). 🔴 Nút "Thêm mới" và "Xoá" trên bảng đang bị COMMENT ⇒
 * cấu hình tạm tạo qua API (actionCode `AUTO<làn>_HM_*` — không gắn nghiệp vụ nào nên không chặn phiếu thật), xoá ở finally.
 * Luồng duyệt thật đo trên cấu hình "Duyệt phiếu đề xuất đặt hàng" bằng helper 13_1 (`dx-ghi`, `han-muc`): < 50 triệu 1 bước Giám đốc xã;
 * ≥ 50 triệu 2 bước xã → Quản lý tỉnh. Cấu hình CHUNG cả chuỗi ⇒ mọi lần đổi đều trả lại nguyên trạng ở finally.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: s });
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const hau = () => Date.now().toString().slice(-6);
const ds = (x) => (Array.isArray(x) ? x : x?.content || x?.data || []);
const TEN_DX = 'Duyệt phiếu đề xuất đặt hàng';

async function phien(page) {
	const st = k.batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=approvalLimit`, 'tct');
	await expect(page.locator('.ant-table-tbody').first()).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(1_500);
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const goi = (m, u, q, b) => k.goiGhi(page, st, m, u, q, b);
	const tam = [];
	// 🔴 BE bắt buộc roleCode từng bước ("step_order/org_unit_type/role_code là bắt buộc") ⇒ lấy role THẬT theo cấp tổ chức từ cấu hình đang có.
	const vaiTheoCap = {};
	for (const c of ds((await goi('GET', '/approval-limits', { page: 0, size: 5000 }))?.data)) {
		for (const f of c.flows || []) for (const b of f.steps || []) if (b.roleCode && !vaiTheoCap[b.orgUnitType]) vaiTheoCap[b.orgUnitType] = b.roleCode;
	}
	// Cấp chưa có ở cấu hình nào (vd. Điểm bán) ⇒ role mặc định của chuỗi 626 (AUTHEN.TBL_CHAIN_ROLE.allowed_level).
	for (const [cap, vai] of Object.entries({ DIEM_BAN: 'SHOP_MANAGER', BUU_DIEN_XA: 'WARD_MANAGER', BUU_DIEN_TINH: 'PROVINCE_MANAGER', TONG_CONG_TY: 'CORP_ADMIN' })) vaiTheoCap[cap] ??= vai;
	const dien = (flows) => flows.map((f) => ({ ...f, steps: f.steps.map((b) => ({ ...b, roleCode: b.roleCode || vaiTheoCap[b.orgUnitType] })) }));
	return {
		st, goi, tam, dien, vaiTheoCap,
		async tao(flows) {
			const code = `AUTO${process.env.VNPOST_LANE || ''}_HM_${hau()}`;
			const r = await goi('POST', '/approval-limits', {}, { actionCode: code, actionName: `AUTO TEST hạn mức ${code}`, active: true, flows: dien(flows) });
			expect(String(r?.status?.code), `Tạo cấu hình hạn mức tạm lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
			const x = r?.data?.id ? r.data : ds((await goi('GET', '/approval-limits', { page: 0, size: 5000 }))?.data).find((z) => z.actionCode === code);
			tam.push(x.id);
			await page.reload();
			await page.waitForTimeout(2_000);
			return x;
		},
		don: async () => { for (const id of tam) await goi('DELETE', `/approval-limits/${id}`).catch(() => null); },
	};
}
const ROLE = {};
const buoc = (n, loai = 'BUU_DIEN_XA', role = null) => {
	const lv = ROLE[loai] ? loai : Object.keys(ROLE)[0];
	return { stepOrder: n, stepName: `Bước ${n}`, orgUnitType: lv, roleCode: role ?? ROLE[lv], active: true };
};
const khoang = (min, max, steps) => ({ minAmount: min, maxAmount: max, active: true, steps });
const dong = (page, ten) => page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ten }).first();
async function moSua(page, ten) {
	await dong(page, ten).locator('button:has(.anticon-edit)').first().click();
	const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ hasText: /Cập nhật cấu hình hạn mức|Tạo cấu hình hạn mức/ }).last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(800);
	return dr;
}
async function luu(page, dr) {
	let rs = null;
	const cho = page.waitForResponse((r) => /approval-limits/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), { timeout: 12_000 }).then((r) => { rs = r; }).catch(() => null);
	await dr.getByRole('button', { name: /^(Cập nhật|Tạo mới)$/ }).last().click();
	const tbs = new Set();
	for (let i = 0; i < 20 && !rs; i += 1) { for (const t of await page.locator('.ant-message-notice').allInnerTexts()) tbs.add(chuan(t)); await page.waitForTimeout(300); }
	await cho;
	await page.waitForTimeout(800);
	for (const t of await page.locator('.ant-message-notice').allInnerTexts()) tbs.add(chuan(t));
	return { body: rs ? await rs.json().catch(() => null) : null, tb: [...tbs].join(' | '), loi: chuan((await dr.locator('.ant-form-item-explain-error').allInnerTexts()).join(' | ')) };
}
const doc = async (s, id) => (await s.goi('GET', `/approval-limits/${id}`))?.data;

test.describe('07_4 — Hạn mức duyệt (GHI)', () => {
	test.describe.configure({ timeout: 480_000 });

	test('07_4_050_001 — Giao diện cấu hình hạn mức duyệt có đủ trường', async ({ page }) => {
		chanNeuTat('07_4_050_001');
		const s = await phien(page);
		const x = await s.tao([khoang(0, 1_000_000, [buoc(1)])]);
		try {
		const dr = await moSua(page, x.actionName);
		const nhan = (await dr.locator('.ant-form-item-label label').allInnerTexts()).map(chuan);
		const nutThem = await page.getByRole('button', { name: /Thêm mới/ }).count();
		ghiDo(`trường: ${[...new Set(nhan)].join(' · ')} · nút "Thêm mới" trên bảng: ${nutThem} (đang comment trong code)`);
		for (const t of ['Mã cấu hình', 'Tên action', 'Hiệu lực']) expect(nhan).toContain(t);
		} finally { await s.don(); }
	});

	test('07_4_050_002 — Tạo hạn mức duyệt với một khoảng tiền', async ({ page }) => {
		chanNeuTat('07_4_050_002');
		const s = await phien(page);
		try {
			const nutThem = await page.getByRole('button', { name: /Thêm mới/ }).count();
			const x = await s.tao([khoang(0, 1_000_000, [buoc(1)])]);
			const t = chuan(await dong(page, x.actionName).innerText());
			ghiDo(`nút Thêm mới trên UI: ${nutThem} ⇒ tạo qua API · dòng "${t}"`);
			expect(nutThem, '🔴 Không có nút "Thêm mới" cấu hình hạn mức (bị comment) — không tạo được trên giao diện').toBeGreaterThan(0);
			expect(t).toContain(x.actionName);
		} finally { await s.don(); }
	});

	test('07_4_050_003 — Tạo nhiều khoảng tiền trong một cấu hình', async ({ page }) => {
		chanNeuTat('07_4_050_003');
		const s = await phien(page);
		try {
			const x = await s.tao([khoang(0, 1_000_000, [buoc(1)]), khoang(1_000_000, 5_000_000, [buoc(1)]), khoang(5_000_000, 9_000_000, [buoc(1)])]);
			const dr = await moSua(page, x.actionName);
			const mins = await dr.locator('input[id*="minAmount"]').evaluateAll((a) => a.map((i) => i.value));
			const soDong = chuan(await dong(page, x.actionName).innerText());
			ghiDo(`mở lại form: Min ${JSON.stringify(mins)} · dòng bảng "${soDong}"`);
			expect(mins.length).toBe(3);
			expect(mins.map((v) => Number(String(v).replace(/\D/g, '')))).toEqual([0, 1_000_000, 5_000_000]);
		} finally { await s.don(); }
	});

	test('07_4_050_004 — Một khoảng tiền có nhiều bước duyệt', async ({ page }) => {
		chanNeuTat('07_4_050_004');
		const s = await phien(page);
		try {
			const x = await s.tao([khoang(0, 1_000_000, [buoc(1, 'DIEM_BAN'), buoc(2, 'BUU_DIEN_XA'), buoc(3, 'BUU_DIEN_TINH')])]);
			const d = await doc(s, x.id);
			const b = (d?.flows?.[0]?.steps || []).map((z) => `${z.stepOrder}:${z.orgUnitType}`);
			ghiDo(`các bước sau lưu: ${JSON.stringify(b)}`);
			expect(b).toEqual(['1:DIEM_BAN', '2:BUU_DIEN_XA', '3:BUU_DIEN_TINH']);
		} finally { await s.don(); }
	});

	test('07_4_050_005 — Mỗi bước duyệt chỉ gán được một vai', async ({ page }) => {
		chanNeuTat('07_4_050_005');
		const s = await phien(page);
		const x = await s.tao([khoang(0, 1_000_000, [buoc(1)])]);
		try {
		const dr = await moSua(page, x.actionName);
		const roleSel = dr.locator('.ant-select').filter({ hasText: /role|Role|Chọn role/ }).first();
		const coMulti = await dr.locator('.ant-select-multiple').count();
		ghiDo(`ô Role dạng nhiều lựa chọn: ${coMulti} · ô role thấy: ${await roleSel.count()}`);
		expect(coMulti, 'Ô Role cho chọn nhiều vai trong một bước').toBe(0);
		} finally { await s.don(); }
	});

	test('07_4_050_006 — Danh sách cấp tổ chức trong cấu hình duyệt', async ({ page }) => {
		chanNeuTat('07_4_050_006');
		const s = await phien(page);
		const x = await s.tao([khoang(0, 1_000_000, [buoc(1)])]);
		try {
		const dr = await moSua(page, x.actionName);
		const o = dr.locator('.ant-select').filter({ hasText: /Bưu điện|Điểm bán|Tổng công ty|Cấp tổ chức/ }).first();
		await o.click();
		const lua = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(chuan);
		await page.keyboard.press('Escape');
		ghiDo(`cấp tổ chức: ${JSON.stringify(lua)}`);
		expect(lua).toEqual(['Điểm bán', 'Bưu điện xã', 'Bưu điện tỉnh', 'Tổng công ty']);
		} finally { await s.don(); }
	});

	test('07_4_050_007 — Khoảng tiền Min nhỏ hơn Max', async ({ page }) => {
		chanNeuTat('07_4_050_007');
		const s = await phien(page);
		try {
			const x = await s.tao([khoang(0, 500_000, [buoc(1)])]);
			const dr = await moSua(page, x.actionName);
			await dr.locator('input[id*="minAmount"]').first().fill('1000000');
			await dr.locator('input[id*="maxAmount"]').first().fill('5000000');
			const kq = await luu(page, dr);
			const d = await doc(s, x.id);
			ghiDo(`lưu ${kq.body?.status?.code} "${kq.tb}" · khoảng ${d?.flows?.[0]?.minAmount}–${d?.flows?.[0]?.maxAmount}`);
			expect(kq.tb).toContain('Cập nhật thành công');
			expect([Number(d?.flows?.[0]?.minAmount), Number(d?.flows?.[0]?.maxAmount)]).toEqual([1_000_000, 5_000_000]);
		} finally { await s.don(); }
	});

	test('07_4_050_008 — Khoảng tiền Min lớn hơn hoặc bằng Max', async ({ page }) => {
		chanNeuTat('07_4_050_008');
		const s = await phien(page);
		try {
			const x = await s.tao([khoang(0, 500_000, [buoc(1)])]);
			const kqs = [];
			for (const [mn, mx] of [[5_000_000, 1_000_000], [1_000_000, 1_000_000]]) {
				const dr = await moSua(page, x.actionName);
				await dr.locator('input[id*="minAmount"]').first().fill(String(mn));
				await dr.locator('input[id*="maxAmount"]').first().fill(String(mx));
				const kq = await luu(page, dr);
				kqs.push({ mn, mx, code: kq.body?.status?.code ?? 'FE chặn', tb: kq.tb, loi: kq.loi });
				await page.keyboard.press('Escape');
				await page.waitForTimeout(800);
			}
			ghiDo(JSON.stringify(kqs));
			for (const q of kqs) expect(String(q.code), `🔴 Lưu được khoảng Min ${q.mn} ≥ Max ${q.mx}`).not.toBe('200');
			for (const q of kqs) expect(`${q.tb} ${q.loi}`).toContain('Min phải nhỏ hơn Max');
		} finally { await s.don(); }
	});

	test('07_4_050_009 — Hai khoảng tiền giao thoa nhau', async ({ page }) => {
		chanNeuTat('07_4_050_009');
		const s = await phien(page);
		try {
			const code = `AUTO${process.env.VNPOST_LANE || ''}_HM_${hau()}`;
			const r = await s.goi('POST', '/approval-limits', {}, { actionCode: code, actionName: `AUTO TEST giao thoa ${code}`, active: true, flows: s.dien([khoang(1_000_000, 5_000_000, [buoc(1)]), khoang(3_000_000, 7_000_000, [buoc(1), buoc(2, 'BUU_DIEN_TINH')])]) });
			if (r?.data?.id) s.tam.push(r.data.id);
			else { const x = ds((await s.goi('GET', '/approval-limits', { page: 0, size: 5000 }))?.data).find((z) => z.actionCode === code); if (x) s.tam.push(x.id); }
			ghiDo(`lưu 2 khoảng giao thoa 1–5tr / 3–7tr: ${JSON.stringify(r?.status)} (phần "phiếu 4tr đi theo khoảng nhiều bước" cần action gắn nghiệp vụ — xem 050_011)`);
			expect(String(r?.status?.code), '🔴 BE cho lưu hai khoảng tiền giao thoa').not.toBe('200');
		} finally { await s.don(); }
	});

	test('07_4_020_002 — Số khoảng tiền trên bảng khớp số khoảng đã khai trong chi tiết', async ({ page }) => {
		chanNeuTat('07_4_020_002');
		const s = await phien(page);
		try {
			const x = await s.tao([khoang(0, 1_000_000, [buoc(1)]), khoang(1_000_000, 2_000_000, [buoc(1)])]);
			const t = chuan(await dong(page, x.actionName).innerText());
			const d = await doc(s, x.id);
			ghiDo(`dòng "${t}" · chi tiết ${d?.flows?.length} khoảng`);
			expect(t).toMatch(/\b2\b/);
			expect(d?.flows?.length).toBe(2);
		} finally { await s.don(); }
	});

	test('07_4_020_003 — Bật / tắt cấu hình hạn mức duyệt', async ({ page }) => {
		chanNeuTat('07_4_020_003');
		const s = await phien(page);
		try {
			const x = await s.tao([khoang(0, 1_000_000, [buoc(1)])]);
			const sw = dong(page, x.actionName).locator('.ant-switch');
			await sw.click();
			await page.waitForTimeout(1_500);
			const tat = await sw.getAttribute('aria-checked');
			await sw.click();
			await page.waitForTimeout(1_500);
			const bat = await sw.getAttribute('aria-checked');
			ghiDo(`tắt ⇒ ${tat} · bật lại ⇒ ${bat} (hành vi phiếu khi TẮT đo ở 13_1_090 — tắt "${TEN_DX}" thì phiếu không qua duyệt hạn mức)`);
			expect([tat, bat]).toEqual(['false', 'true']);
		} finally { await s.don(); }
	});

	test('07_4_020_004 — Chỉnh sửa cấu hình hạn mức duyệt', async ({ page }) => {
		chanNeuTat('07_4_020_004');
		const s = await phien(page);
		try {
			const x = await s.tao([khoang(0, 1_000_000, [buoc(1)])]);
			const dr = await moSua(page, x.actionName);
			await dr.locator('input[id*="maxAmount"]').first().fill('2000000');
			const kq = await luu(page, dr);
			const d = await doc(s, x.id);
			ghiDo(`sửa Max 1tr→2tr: "${kq.tb}" · mở lại ${d?.flows?.[0]?.maxAmount}`);
			expect(Number(d?.flows?.[0]?.maxAmount)).toBe(2_000_000);
		} finally { await s.don(); }
	});

	test('07_4_050_016 — Xoá một bước duyệt khỏi cấu hình', async ({ page }) => {
		chanNeuTat('07_4_050_016');
		const s = await phien(page);
		try {
			const x = await s.tao([khoang(0, 1_000_000, [buoc(1), buoc(2, 'BUU_DIEN_TINH')])]);
			const dr = await moSua(page, x.actionName);
			const nutXoa = dr.locator('button:has(.anticon-delete), button:has(.anticon-minus-circle), button:has(.anticon-close)');
			const truoc = await nutXoa.count();
			await nutXoa.last().click();
			const pc = page.locator('.ant-popover:visible').last();
			if (await pc.waitFor({ state: 'visible', timeout: 2_000 }).then(() => true, () => false)) await pc.locator('.ant-btn-primary').click();
			const kq = await luu(page, dr);
			const d = await doc(s, x.id);
			ghiDo(`nút xoá ${truoc} · lưu "${kq.tb}" · bước còn ${JSON.stringify((d?.flows?.[0]?.steps || []).filter((z) => z.active !== false).map((z) => z.stepOrder))} (phiếu đang chờ ở bước bị xoá: cần action gắn nghiệp vụ — ghi báo cáo)`);
			expect((d?.flows?.[0]?.steps || []).filter((z) => z.active !== false).length).toBe(1);
		} finally { await s.don(); }
	});

	test('07_4_050_017 — Xoá một khoảng tiền khỏi cấu hình', async ({ page }) => {
		chanNeuTat('07_4_050_017');
		const s = await phien(page);
		try {
			const x = await s.tao([khoang(0, 1_000_000, [buoc(1)]), khoang(1_000_000, 2_000_000, [buoc(1)])]);
			const dr = await moSua(page, x.actionName);
			const xoaKhoang = dr.getByRole('button', { name: /Xoá khoảng|Xóa khoảng/ });
			if (await xoaKhoang.count()) await xoaKhoang.last().click();
			else await dr.locator('.ant-collapse-extra button, .ant-card-extra button').last().click();
			const pc = page.locator('.ant-popover:visible').filter({ hasText: 'Xoá khoảng tiền này?' }).last();
			if (await pc.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false)) await pc.locator('.ant-btn-primary').click();
			const kq = await luu(page, dr);
			const d = await doc(s, x.id);
			ghiDo(`lưu "${kq.tb}" · khoảng còn ${(d?.flows || []).filter((f) => f.active !== false).length}`);
			expect((d?.flows || []).filter((f) => f.active !== false).length).toBe(1);
		} finally { await s.don(); }
	});

	test('07_4_050_010 — Phiếu không thuộc khoảng tiền nào đã cấu hình', async ({ page }) => {
		chanNeuTat('07_4_050_010');
		const s = await phien(page);
		const hm = ds((await s.goi('GET', '/approval-limits', { page: 0, size: 5000 }))?.data).find((z) => z.actionName === TEN_DX);
		const kh = (hm?.flows || []).filter((f) => f.active !== false).map((f) => [Number(f.minAmount), Number(f.maxAmount)]).sort((a, b) => a[0] - b[0]);
		// Tìm "khe" không có luồng: [0, min đầu) hoặc giữa các khoảng hoặc ≥ max cuối.
		const khe = [];
		if (!kh.length || kh[0][0] > 0) khe.push(`[0, ${kh[0]?.[0] ?? '∞'})`);
		for (let i = 1; i < kh.length; i += 1) if (kh[i][0] > kh[i - 1][1]) khe.push(`[${kh[i - 1][1]}, ${kh[i][0]})`);
		const maxCuoi = kh.at(-1)?.[1];
		// Form không có lựa chọn "không giới hạn" ⇒ Max ≥ 999.999.999.999 (tiền đề `tien-de-han-muc`) coi là không trần.
		if (maxCuoi && maxCuoi < 999_999_999_999) khe.push(`≥ ${maxCuoi}`);
		ghiDo(`khoảng của "${TEN_DX}": ${JSON.stringify(kh)} · khe không có luồng duyệt: ${khe.join(', ') || 'không'}`);
		expect(khe, '🔴 Có giá trị phiếu không thuộc khoảng nào ⇒ nguồn phiếu treo (xem báo cáo)').toEqual([]);
	});

	// ─── Luồng duyệt nhiều bước (helper 13_1, cấu hình "Duyệt phiếu đề xuất đặt hàng") ───
	async function voiHanMuc(browser, fn) {
		const hmx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/han-muc');
		const truoc = await hmx.datHanMuc(browser, true);
		try { return await fn(); } finally { await hmx.datHanMuc(browser, truoc); }
	}
	async function phieu900(browser) {
		const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
		const p = await k.moPhienPhu(browser, 'shop', '/inventory/purchase-request');
		try { return await dx.lapChoDuyet(p.page, 900); } finally { await p.dong(); }
	}
	async function thay(browser, vai, ma) {
		const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
		const p = await k.moPhienPhu(browser, vai, '/inventory/purchase-request');
		try {
			await p.page.evaluate(() => sessionStorage.removeItem('__sofin_sr_active_tab')).catch(() => {});
			await dx.moDs(p.page, vai);
			if (await (await dx.timMa(p.page, ma)).first().count()) return 'tab thường';
			const tab = p.page.locator('.ant-tabs-tab').filter({ hasText: 'vượt hạn mức' });
			if (await tab.count()) { await tab.click(); const r = p.page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').filter({ hasText: ma }).first(); if (await r.waitFor({ timeout: 15_000 }).then(() => true, () => false)) return chuan(await r.innerText()); }
			return null;
		} finally { await p.dong(); }
	}
	const tienTrinh = async (page) => chuan(await page.locator('.ant-pro-card').filter({ hasText: 'Tiến trình phê duyệt' }).first().innerText());

	test('07_4_050_011 — Luồng duyệt nhiều bước: trạng thái phiếu', async ({ page, browser }) => {
		chanNeuTat('07_4_050_011');
		await voiHanMuc(browser, async () => {
			const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
			const ma = await phieu900(browser);
			await dx.moChiTiet(page, ma, 'ward');
			const t = await tienTrinh(page);
			ghiDo(`${ma}: ${t}`);
			expect(t).toContain('Đã duyệt 0/2');
		});
	});
	test('07_4_050_012 — Thứ tự duyệt: vai bước 2 chưa thấy phiếu khi bước 1 chưa xong', async ({ browser }) => {
		chanNeuTat('07_4_050_012');
		await voiHanMuc(browser, async () => {
			const ma = await phieu900(browser);
			const t = await thay(browser, 'province_manager', ma);
			ghiDo(`${ma}: Quản lý tỉnh thấy = ${t}`);
			expect(t, '🔴 Vai bước 2 thấy phiếu khi bước 1 chưa duyệt').toBeNull();
		});
	});
	test('07_4_050_013 — Bước 2 được duyệt sau khi bước 1 hoàn thành', async ({ page, browser }) => {
		chanNeuTat('07_4_050_013');
		await voiHanMuc(browser, async () => {
			const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
			const ma = await phieu900(browser);
			await dx.moChiTiet(page, ma, 'ward');
			await page.getByRole('button', { name: /^Xác nhận$/ }).click();
			const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Duyệt phiếu đề xuất' }).last();
			const tb = await dx.thongBaoQuanh(page, () => dr.locator('.ant-drawer-footer .ant-btn-primary').last().click());
			const t = await thay(browser, 'province_manager', ma);
			ghiDo(`xã duyệt: "${tb}" · Quản lý tỉnh thấy: ${t}`);
			expect(t, 'Bước 1 xong mà vai bước 2 không thấy phiếu').not.toBeNull();
			expect(t).toContain('Bước 2/2');
		});
	});
	test('07_4_050_014 — Từ chối tại bước 1', async ({ page, browser }) => {
		chanNeuTat('07_4_050_014');
		await voiHanMuc(browser, async () => {
			const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
			const ma = await phieu900(browser);
			await dx.moChiTiet(page, ma, 'ward');
			await page.getByRole('button', { name: /^Từ chối$/ }).click();
			const m = page.locator('.ant-modal-wrap:visible').filter({ hasText: 'Từ chối phiếu đề xuất' }).last();
			await m.getByPlaceholder('Nhập lý do từ chối...').fill('AUTO TEST 07_4 từ chối bước 1');
			const tb = await dx.thongBaoQuanh(page, () => m.getByRole('button', { name: 'Xác nhận từ chối' }).click());
			const t = await thay(browser, 'province_manager', ma);
			ghiDo(`từ chối: "${tb}" · Quản lý tỉnh thấy: ${t}`);
			expect(tb).toContain('Đã từ chối phiếu');
			expect(t, 'Phiếu bị từ chối ở bước 1 vẫn chuyển sang bước 2').toBeNull();
		});
	});
	test('07_4_050_015 — Từ chối phiếu khi không có quyền duyệt', async ({ browser }) => {
		chanNeuTat('07_4_050_015');
		await voiHanMuc(browser, async () => {
			const ma = await phieu900(browser);
			// Vai NGOÀI luồng: Cửa hàng trưởng (người lập) — thử gọi đúng API từ chối FE dùng.
			const p = await k.moPhienPhu(browser, 'shop', '/inventory/purchase-request');
			try {
				const shopId = Number(p.st.h.shopid);
				const tim = await k.goiGhi(p.page, p.st, 'GET', '/stock-requests', { shopId, keyword: ma, page: 0, size: 10 });
				const phieu = ds(tim?.data).find((z) => z.code === ma);
				const r = phieu ? await k.goiGhi(p.page, p.st, 'POST', `/stock-requests/${phieu.id}/reject`, { shopId }, { reason: 'AUTO TEST 07_4 ngoài luồng' }) : null;
				ghiDo(`phiếu ${ma} (${phieu?.id}) · vai shop từ chối: ${JSON.stringify(r?.status)}`);
				expect(phieu, 'Không tra được phiếu vừa lập').toBeTruthy();
				expect(String(r?.status?.code), '🔴 Vai ngoài luồng duyệt vẫn từ chối được phiếu').not.toBe('200');
			} finally { await p.dong(); }
		});
	});
});
