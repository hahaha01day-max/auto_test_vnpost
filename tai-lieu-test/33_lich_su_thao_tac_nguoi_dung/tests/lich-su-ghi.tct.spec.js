'use strict';

/**
 * 33 · Lịch sử thao tác — các case cần THAO TÁC ĐÃ BIẾT. Tiền đề: vai `tct` tạo → sửa tên → xoá một VAI TRÒ RÁC `A7LS33_*`
 * (module ROLE_MANAGEMENT ghi log đủ CREATE/UPDATE/DELETE kèm beforeValue/afterValue/changeDetail — đo 25/09/2026).
 * Trace vnpost-web `features/chain/pages/userActionHistory/` (API `GET /operation-history?page&size&module&action&keyword&fromDate&toDate`,
 * size 20; drawer "Chi tiết lịch sử thao tác", tab "So sánh thuộc tính" (Thuộc tính · Giá trị cũ · Giá trị mới) + "JSON đầy đủ"
 * ("Trước thay đổi:" / "Sau thay đổi:")) và `features/dashboard/components/AuditLogPreview.jsx` ("Nhật ký thao tác gần đây", size 10).
 * 🔴 Case kịch bản ghi vai `province`: đo 25/09 vai tỉnh nhận SSHOP-401 ở `/operation-history` ⇒ mỗi case province kiểm quyền
 *    bằng `expect.soft` (fail = phát hiện) RỒI kiểm chức năng bằng vai tct — để một lỗi quyền không che mất phần chức năng.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const { chanGhi, chuan, dong, khung, moMan, thoiGian, timOLoc } = require('./history-page');

const GOC = path.join(__dirname, '..');
const API = '/operation-history';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

const D = { ma: null, t0: null, t1: null, loi: null };

/** Vai tỉnh có đọc được lịch sử không (soft — fail là phát hiện quyền, không dừng case). */
async function kiemTinh(browser) {
	const ps = await k.moPhienPhu(browser, 'province', '/chain/user-action-history');
	try {
		const b = await k.goiGhi(ps.page, ps.st, 'GET', API, { page: 0, size: 5 });
		const n = await dong(ps.page).count();
		ghiChu('vai province', `API ${b?.status?.code} · ${b?.page?.total_elements ?? '-'} bản ghi · bảng ${n} dòng`);
		expect.soft(String(b?.status?.code), `Vai tỉnh KHÔNG đọc được lịch sử thao tác (${b?.status?.code} ${b?.status?.message})`).toBe('200');
	} finally { await ps.dong(); }
}
/** Chờ response danh sách sau một thao tác trên màn. */
const choDs = (page) => page.waitForResponse((r) => r.url().includes(`${API}?`), { timeout: 15_000 }).catch(() => null);
const q = (r) => (r ? Object.fromEntries(new URL(r.url()).searchParams) : null);

test.describe('33 · Lịch sử thao tác có tiền đề (vai trò rác A7LS33)', () => {
	test.describe.configure({ timeout: 180_000 });

	test.beforeAll(async ({ browser }) => {
		const ps = await k.moPhienPhu(browser, 'tct', '/chain/user-action-history');
		try {
			D.ma = `A7LS33_${String(Date.now()).slice(-6)}`;
			D.t0 = Date.now();
			const c = await k.goiGhi(ps.page, ps.st, 'POST', '/auth/chain-role/create', {}, { roleCode: D.ma, roleName: `A7LS33 rác ${D.ma}`, allowedLevel: 'DIEM_BAN', note: 'rác 33 trước' });
			if (String(c?.status?.code) !== '200') throw new Error(`tạo vai trò rác: ${JSON.stringify(c?.status)}`);
			const u = await k.goiGhi(ps.page, ps.st, 'PUT', '/auth/chain-role/update', {}, { roleCode: D.ma, roleName: `A7LS33 rác ${D.ma} SỬA`, allowedLevel: 'DIEM_BAN', note: 'rác 33 sau' });
			D.sua = u?.status?.code;
			const x = await k.goiGhi(ps.page, ps.st, 'DELETE', '/auth/chain-role/delete', { roleCode: D.ma });
			D.xoa = x?.status?.code;
			D.t1 = Date.now();
			await ps.page.waitForTimeout(5_000);
			const b = await k.goiGhi(ps.page, ps.st, 'GET', API, { page: 0, size: 20 });
			D.log = (b?.data ?? []).filter((r) => r.objectId === D.ma);
		} catch (e) {
			D.loi = String(e?.message ?? e).slice(0, 300);
		} finally { await ps.dong(); }
	});
	const canTienDe = () => test.skip(!D.log?.length, `Tiền đề 33 không có log: ${D.loi ?? JSON.stringify(D)}`);
	const logSua = () => D.log.find((r) => r.action === 'UPDATE');

	// ───────── Vai province (kịch bản) ─────────

	test('33_010_001 — Màn Lịch sử người dùng mở được và xếp mới nhất trước', async ({ page, browser }) => {
		chanNeuTat('33_010_001');
		canTienDe();
		await kiemTinh(browser);
		await chanGhi(page);
		await moMan(page, 'tct');
		const tg = [];
		for (let i = 0; i < (await dong(page).count()); i += 1) tg.push(await thoiGian(page, i));
		const nguoc = tg.findIndex((t, i) => i > 0 && t > tg[i - 1]);
		const chu = chuan(await dong(page).first().innerText());
		ghiChu('đo', `${tg.length} dòng · dòng đầu "${chu.slice(0, 160)}"`);
		expect(nguoc, `Dòng ${nguoc + 1} mới hơn dòng trước — không xếp mới nhất trước`).toBe(-1);
		// Thao tác ghi dữ liệu vừa làm phải có mặt ở trang đầu.
		expect(chuan(await khung(page).innerText()), `Thao tác trên vai trò ${D.ma} vừa làm không có ở trang đầu`).toContain(D.ma);
	});

	test('33_020_001 — Đổi bộ lọc luôn quay về trang đầu', async ({ page, browser }) => {
		chanNeuTat('33_020_001');
		await kiemTinh(browser);
		await chanGhi(page);
		await moMan(page, 'tct');
		const pg = khung(page).locator('.ant-pagination').last();
		const c1 = choDs(page);
		await pg.locator('.ant-pagination-item-2').click();
		const q1 = q(await c1);
		await page.waitForTimeout(1_500);
		const o = await timOLoc(page, 'Hành động');
		const c2 = choDs(page);
		await o.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
		const q2 = q(await c2);
		await page.waitForTimeout(1_500);
		const trang = chuan(await pg.locator('.ant-pagination-item-active').innerText().catch(() => ''));
		ghiChu('đo', `trang 2: ${JSON.stringify(q1)} · đổi lọc: ${JSON.stringify(q2)} · trang đang chọn "${trang}"`);
		expect(q1?.page).toBe('1');
		expect(q2?.page, 'Đổi bộ lọc mà vẫn gửi trang cũ').toBe('0');
		expect(trang).toBe('1');
	});

	test('33_020_002 — Nhiều điều kiện lọc cùng lúc là AND', async ({ page, browser }) => {
		chanNeuTat('33_020_002');
		canTienDe();
		await kiemTinh(browser);
		const st = k.batHeader(page);
		await chanGhi(page);
		await moMan(page, 'tct');
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
		// A = module ROLE_MANAGEMENT (có CREATE + DELETE của vai trò rác) · B = action DELETE.
		const chiA = await k.goiGhi(page, st, 'GET', API, { page: 0, size: 50, module: 'ROLE_MANAGEMENT' });
		const ab = await k.goiGhi(page, st, 'GET', API, { page: 0, size: 50, module: 'ROLE_MANAGEMENT', action: 'DELETE' });
		const sai = (ab?.data ?? []).filter((r) => r.module !== 'ROLE_MANAGEMENT' || r.action !== 'DELETE');
		const taoCo = (chiA?.data ?? []).some((r) => r.objectId === D.ma && r.action === 'CREATE');
		const taoLot = (ab?.data ?? []).some((r) => r.objectId === D.ma && r.action === 'CREATE');
		ghiChu('đo', `chỉ A ${chiA?.page?.total_elements} · A+B ${ab?.page?.total_elements} · dòng sai ${sai.length} · CREATE rác ở A: ${taoCo}, ở A+B: ${taoLot}`);
		expect(taoCo, 'Chỉ lọc A không thấy log CREATE của vai trò rác (không kiểm được AND)').toBe(true);
		expect(taoLot, 'Log CREATE (thoả A, không thoả B) vẫn lọt khi lọc A+B').toBe(false);
		expect(sai).toEqual([]);
	});

	test('33_030_001 — Chi tiết thao tác hiện thuộc tính đã đổi kèm trước và sau', async ({ page, browser }) => {
		chanNeuTat('33_030_001');
		canTienDe();
		await kiemTinh(browser);
		const sua = logSua();
		expect(sua, `Không có log UPDATE của ${D.ma} (update trả ${D.sua})`).toBeTruthy();
		await chanGhi(page);
		await moMan(page, 'tct');
		const dr = await moChiTietCua(page, D.ma, 'Cập nhật|Sửa');
		const hang = (await dr.locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row').allInnerTexts()).map(chuan);
		ghiChu('bảng so sánh', hang.join(' | '));
		const ten = hang.find((h) => /Tên vai trò/.test(h));
		expect(ten, 'Không có dòng thuộc tính "Tên vai trò" đã đổi').toBeTruthy();
		expect(ten).toContain(`A7LS33 rác ${D.ma}`);
		expect(ten).toContain('SỬA');
		const ghiChuDong = hang.find((h) => /Ghi chú/.test(h));
		expect(ghiChuDong, 'Thiếu dòng "Ghi chú" (đổi "rác 33 trước" → "rác 33 sau")').toMatch(/rác 33 trước.*rác 33 sau/);
		expect(hang.filter((h) => /Cấp quản lý/.test(h)), 'Thuộc tính KHÔNG đổi (Cấp quản lý) vẫn hiện trong bảng so sánh').toEqual([]);
	});

	test('33_040_001 — Đối chiếu toàn văn dữ liệu trước và sau', async ({ page, browser }) => {
		chanNeuTat('33_040_001');
		canTienDe();
		await kiemTinh(browser);
		await chanGhi(page);
		await moMan(page, 'tct');
		const dr = await moChiTietCua(page, D.ma, 'Cập nhật|Sửa');
		await dr.getByRole('tab', { name: 'JSON đầy đủ' }).click();
		await page.waitForTimeout(800);
		const t = chuan(await dr.locator('.ant-tabs-tabpane-active').innerText());
		ghiChu('JSON', t.slice(0, 600));
		expect(t).toMatch(/Trước thay đổi:/);
		expect(t).toMatch(/Sau thay đổi:/);
		const [truoc, sau] = t.split('Sau thay đổi:');
		expect(truoc, 'Phần "Trước" không có tên cũ').toContain(`"roleName": "A7LS33 rác ${D.ma}"`);
		expect(sau, 'Phần "Sau" không có tên mới').toContain('SỬA');
		expect(sau, 'Phần "Sau" thiếu thuộc tính không đổi (không trọn vẹn)').toContain('"allowedLevel": "DIEM_BAN"');
	});

	test('33_050_001 — Trang chủ hiện mười thao tác mới nhất', async ({ page, browser }) => {
		chanNeuTat('33_050_001');
		await kiemTinh(browser);
		const st = k.batHeader(page);
		await chanGhi(page);
		const { moTrang } = require('../../shared/auth/login');
		await moTrang(page, '/', 'tct');
		await page.waitForTimeout(6_000);
		const the = page.locator('.ant-pro-card').filter({ hasText: 'Nhật ký thao tác gần đây' }).first();
		await expect(the, 'Trang chủ không có khối "Nhật ký thao tác gần đây"').toBeVisible({ timeout: 20_000 });
		const muc = the.locator('.ant-pro-card-body [class*=cursor-pointer], .ant-pro-card-body li, .ant-list-item');
		const n = await muc.count();
		const ds = await k.goiGhi(page, st, 'GET', API, { page: 0, size: 10 });
		const chu = chuan(await the.innerText());
		const thieu = (ds?.data ?? []).filter((r) => !chu.includes(r.operatorName ?? '---'));
		ghiChu('đo', `${n} mục · API 10 mới nhất ${(ds?.data ?? []).length} · khối: ${chu.slice(0, 300)}`);
		expect(n).toBe(10);
		expect(thieu).toEqual([]);
	});

	test('33_050_002 — Mở chi tiết ngay từ Trang chủ', async ({ page, browser }) => {
		chanNeuTat('33_050_002');
		await kiemTinh(browser);
		await chanGhi(page);
		const { moTrang } = require('../../shared/auth/login');
		await moTrang(page, '/', 'tct');
		await page.waitForTimeout(6_000);
		const the = page.locator('.ant-pro-card').filter({ hasText: 'Nhật ký thao tác gần đây' }).first();
		await the.locator('.ant-pro-card-body [class*=cursor-pointer]').first().click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết lịch sử thao tác' }).last();
		await expect(dr, 'Bấm dòng nhật ký không mở chi tiết').toBeVisible({ timeout: 10_000 });
		ghiChu('đo', `url vẫn là "${new URL(page.url()).pathname}" · ${chuan(await dr.innerText()).slice(0, 200)}`);
		expect(new URL(page.url()).pathname, 'Phải chuyển sang màn tra cứu mới xem được').not.toContain('user-action-history');
	});

	// ───────── Vai tct ─────────

	test('33_010_004 — Hiển thị dấu ba gạch khi không tra được tên', async ({ page }) => {
		chanNeuTat('33_010_004');
		// Bản ghi không tra được người thao tác: DB USER_OPERATION_HISTORY.operator_id NULL (tên/vai trò/đơn vị tra lúc đọc).
		const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');
		const r0 = g.selectDb("SELECT id,module,action,object_id FROM VNPOST_CORE.USER_OPERATION_HISTORY WHERE chain_id=626 AND operator_id IS NULL ORDER BY action_time DESC, id DESC LIMIT 1")[0];
		test.skip(!r0, 'Không có bản ghi nào mất người thao tác (hoặc không đọc được DB).');
		const [id, mod, act, obj] = r0;
		const st = k.batHeader(page);
		await chanGhi(page);
		await moMan(page, 'tct');
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
		// Vị trí bản ghi trong danh sách lọc theo đúng module + action.
		let trang = -1; let viTri = -1; let ban = null;
		for (let pg = 0; pg < 30 && trang < 0; pg += 1) {
			const b = await k.goiGhi(page, st, 'GET', API, { page: pg, size: 20, module: mod, action: act });
			const ds = b?.data ?? [];
			const i = ds.findIndex((x) => String(x.id ?? '') === String(id) || (x.objectId === obj && !x.operatorId));
			if (i >= 0) { trang = pg; viTri = i; ban = ds[i]; }
			if (ds.length < 20) break;
		}
		expect(trang, `API không trả bản ghi #${id} (${mod}/${act})`).toBeGreaterThanOrEqual(0);
		for (const [nhan, giaTri] of [['Nhóm nghiệp vụ', ban.moduleName], ['Hành động', ban.actionName]]) {
			const o = await timOLoc(page, nhan);
			const c = choDs(page);
			await o.click();
			// 🔴 Dropdown là virtual list — lựa chọn ở dưới chưa render ⇒ cuộn holder tới khi thấy.
			const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
			const opt = dd.locator('.ant-select-item-option').filter({ hasText: new RegExp(`^${giaTri}$`) }).first();
			for (let t = 0; t < 15 && !(await opt.isVisible().catch(() => false)); t += 1) {
				await dd.locator('.rc-virtual-list-holder').evaluate((e) => { e.scrollTop += 120; }).catch(() => null);
				await page.waitForTimeout(250);
			}
			await opt.click();
			await c;
			await page.waitForTimeout(1_000);
		}
		if (trang > 0) {
			const c = choDs(page);
			await khung(page).locator('.ant-pagination').last().locator(`.ant-pagination-item-${trang + 1}`).click();
			await c;
			await page.waitForTimeout(1_200);
		}
		const td = (await dong(page).nth(viTri).locator('td').allInnerTexts()).map(chuan);
		const cot = (await khung(page).locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		const o = (n) => td[cot.indexOf(n)];
		ghiChu('đo', `#${id} ${obj} · Người thao tác "${o('Người thao tác')}" · Vai trò "${o('Vai trò')}" · Đơn vị "${o('Đơn vị')}" · API ${JSON.stringify({ id: ban.operatorId, ma: ban.operatorCode, ten: ban.operatorName })}`);
		expect(td.join(' | ')).toContain(obj.split(' ')[0]);
		for (const n of ['Người thao tác', 'Vai trò', 'Đơn vị']) expect(o(n), `Ô "${n}" không tra được mà không hiện "---"`).toBe('---');
		expect(ban.operatorId ?? ban.operatorCode, 'Bản ghi KHÔNG giữ mã/ID người thao tác (operator_id NULL trong DB) — không truy được ai đã thao tác').toBeTruthy();
	});

	test('33_010_005 — Thời gian hiển thị theo giờ Việt Nam', async ({ page }) => {
		chanNeuTat('33_010_005');
		canTienDe();
		await chanGhi(page);
		await moMan(page, 'tct');
		const i = (await dong(page).allInnerTexts()).findIndex((x) => x.includes(D.ma));
		expect(i, `Log của ${D.ma} không có ở trang đầu`).toBeGreaterThanOrEqual(0);
		const tg = await thoiGian(page, i);
		// thoiGian() dựng Date từ chữ trên màn theo múi giờ của máy chạy test (Asia/Ho_Chi_Minh) ⇒ phải nằm trong [t0 − 5s, t1 + 5s].
		ghiChu('đo', `chữ "${chuan(await dong(page).nth(i).innerText()).match(/\d{2}\/\d{2}\/\d{4} [\d:]+/)?.[0]}" · thao tác thật ${new Date(D.t0).toISOString()} – ${new Date(D.t1).toISOString()} · TZ máy ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
		expect(tg).toBeGreaterThanOrEqual(D.t0 - 5_000);
		expect(tg).toBeLessThanOrEqual(D.t1 + 5_000);
	});

	test('33_020_007 — Bỏ chọn bộ lọc thì không lọc theo tiêu chí đó', async ({ page }) => {
		chanNeuTat('33_020_007');
		await chanGhi(page);
		const bat = [];
		page.on('response', (r) => { if (r.url().includes(`${API}?`)) bat.push(r.url()); });
		await moMan(page, 'tct');
		const tong0 = chuan(await khung(page).locator('.ant-pagination-total-text').innerText().catch(() => ''));
		const o = await timOLoc(page, 'Nhóm nghiệp vụ');
		await o.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
		await page.waitForTimeout(2_000);
		const coLoc = bat[bat.length - 1];
		await o.hover();
		await o.locator('.ant-select-clear').click();
		await page.waitForTimeout(2_500);
		const sau = bat[bat.length - 1];
		const tong1 = chuan(await khung(page).locator('.ant-pagination-total-text').innerText().catch(() => ''));
		ghiChu('đo', `lọc: ${coLoc?.split('?')[1]} · bỏ lọc: ${sau?.split('?')[1]} · tổng ${tong0} → ${tong1}`);
		expect(coLoc).toMatch(/module=/);
		if (sau !== coLoc) expect(sau, 'Bỏ chọn mà vẫn gửi module').not.toMatch(/module=/);
		expect(tong1).toBe(tong0);
		expect(await dong(page).count()).toBeGreaterThan(0);
	});

	test('33_020_010 — Lọc khoảng ngày có Đến ngày trước Từ ngày', async ({ page }) => {
		chanNeuTat('33_020_010');
		await chanGhi(page);
		await moMan(page, 'tct');
		const rp = khung(page).locator('.ant-picker-range').first();
		const ins = rp.locator('input');
		const c = choDs(page);
		await ins.nth(0).click();
		await ins.nth(0).fill('2026-09-25');
		await ins.nth(0).press('Enter');
		await ins.nth(1).fill('2026-09-20');
		await ins.nth(1).press('Enter');
		const r = await c;
		await page.waitForTimeout(1_500);
		const p = q(r);
		const gt = [await ins.nth(0).inputValue(), await ins.nth(1).inputValue()];
		ghiChu('hành vi thật', `ô ${gt.join(' → ')} · lời gọi ${JSON.stringify(p)} · ${await dong(page).count()} dòng`);
		// 🔴 RangePicker màn này định dạng YYYY-MM-DD (mặc định antd). Không có lời gọi mà ô vẫn giữ cặp ngược = chưa đo được ⇒ fail rõ.
		expect(Boolean(r) || gt[0] !== '2026-09-25' || gt[1] !== '2026-09-20', 'Không đo được: ô giữ cặp ngày ngược mà màn không gọi lại danh sách').toBe(true);
		const nguoc = p?.fromDate && p?.toDate && p.fromDate > p.toDate;
		expect(!nguoc || (await dong(page).count()) === 0, 'Gửi khoảng ngày NGƯỢC mà vẫn trả dữ liệu').toBe(true);
	});

	test('33_060_001 — Danh sách lịch sử rỗng khi kỳ không có thao tác', async ({ page }) => {
		chanNeuTat('33_060_001');
		await chanGhi(page);
		await moMan(page, 'tct');
		const rp = khung(page).locator('.ant-picker-range').first();
		const ins = rp.locator('input');
		const c = choDs(page);
		await ins.nth(0).click();
		await ins.nth(0).fill('2020-01-01');
		await ins.nth(0).press('Enter');
		await ins.nth(1).click();
		await ins.nth(1).fill('2020-01-02');
		await ins.nth(1).press('Enter');
		await page.locator('body').click({ position: { x: 5, y: 5 } });
		const r = await c;
		ghiChu('ô ngày', `${await ins.nth(0).inputValue()} → ${await ins.nth(1).inputValue()}`);
		await page.waitForTimeout(1_500);
		const b = r ? await r.json().catch(() => null) : null;
		ghiChu('đo', `${JSON.stringify(q(r))} · ${b?.status?.code} · ${b?.page?.total_elements}`);
		expect(String(b?.status?.code)).toBe('200');
		expect(await dong(page).count()).toBe(0);
		const rong = khung(page).locator('.ant-empty').first();
		await expect(rong).toBeVisible();
		ghiChu('nguyên văn trạng thái rỗng', chuan(await rong.innerText()));
	});
});

/** Mở drawer chi tiết của dòng log chứa `ma` + hành động khớp `hd`. */
async function moChiTietCua(page, ma, hd) {
	const d = dong(page).filter({ hasText: ma }).filter({ hasText: new RegExp(hd) }).first();
	await expect(d, `Không thấy dòng log ${hd} của ${ma} ở trang đầu`).toBeVisible({ timeout: 10_000 });
	await d.getByRole('button').last().click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết lịch sử thao tác' }).last();
	await expect(dr).toBeVisible({ timeout: 10_000 });
	await page.waitForTimeout(1_000);
	return dr;
}
