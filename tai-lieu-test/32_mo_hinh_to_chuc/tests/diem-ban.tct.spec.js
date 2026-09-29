'use strict';

/**
 * 32_160 · Tạo / sửa / xoá điểm bán từ Mô hình tổ chức, vai `tct`.
 * Trace `features/chain/pages/shopManagement/components/DrawerCreateShop.jsx` ("Thêm điểm bán / hub" · Cấp (radio TCT/Tỉnh/Xã) ·
 * Phân loại (radio: TCT → Pos plus/Hub, Tỉnh → Hub, Xã → Pos mini/Hub) · Mã/Tên điểm bán · Loại hình điểm bán (multi) · Bưu điện
 * tỉnh/xã · Email · Số điện thoại · Địa chỉ chi tiết · Tỉnh/TP · Xã/Phường (KHÔNG có rule bắt buộc) · "Hủy"/"Xác nhận";
 * POST `/shops/profile`, toast "Thêm điểm bán thành công" / "Cập nhật điểm bán thành công").
 * 🔴 Điểm bán KHÔNG xoá được (BE: "Không được phép xoá Điểm bán từ danh mục cây thư mục"; drawer chi tiết không có nút xoá)
 *    ⇒ case chặn/validate CHẶN request `POST /shops/profile` bằng route giả (đo FE có gửi hay không, KHÔNG tạo dữ liệu);
 *    chỉ 160_001 / 160_002 tạo THẬT (tên `A7MH32 RÁC …`, Pos mini đặt dưới xã rác cố định `CO_DINH`01).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const o = require('./org-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const XA_RAC = () => `${o.CO_DINH}01`;

async function mo(page) {
	const st = o.k.batHeader(page);
	await o.moMan(page, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	return { page, st };
}
/** Chặn tạo cửa hàng: ghi lại body rồi trả 403 giả. */
async function chanTao(page) {
	const gui = [];
	// 🔴 Glob '**/shops/profile' KHÔNG khớp (đã tạo nhầm 2 cửa hàng thật 25/09 — AUTO7_T_01Z323538/348393, đã cho ngừng) ⇒ predicate theo pathname.
	await page.route((u) => /\/shops\/profile\/?$/.test(u.pathname), async (route) => {
		if (route.request().method() !== 'POST') return route.continue();
		gui.push(route.request().postDataJSON());
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	return gui;
}
/** Mở drawer "Thêm điểm bán / hub" từ nút "Tạo điểm bán/hub" ở khung chi tiết của đơn vị `ten`. */
async function moTao(page, ten) {
	await o.chonTrenCay(page, ten);
	await o.khungChiTiet(page).getByRole('button', { name: /Tạo điểm bán\/hub|Tạo Hub/ }).click();
	const dr = o.drawer(page, 'Thêm điểm bán / hub');
	await expect(dr, 'Không mở drawer "Thêm điểm bán / hub"').toBeVisible({ timeout: 10_000 });
	await page.waitForTimeout(1_500);
	return dr;
}
const radio = (dr, nhan) => dr.locator('.ant-radio-wrapper').filter({ hasText: new RegExp(`^\\s*${nhan}\\s*$`) }).first();
async function chonSelect(page, dr, nhan, luaChon = null) {
	await o.oForm(dr, nhan).locator('.ant-select').first().click();
	const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
	const opt = luaChon ? dd.locator('.ant-select-item-option').filter({ hasText: luaChon }).first() : dd.locator('.ant-select-item-option').first();
	await opt.click();
	await page.keyboard.press('Escape').catch(() => null);
	await page.waitForTimeout(500);
}
/** Điền phần bắt buộc chung (trừ những ô trong `bo`). */
async function dien(page, dr, { ma, ten, bo = [] }) {
	if (!bo.includes('ma')) await o.oForm(dr, 'Mã điểm bán').locator('input').fill(ma);
	if (!bo.includes('ten')) await o.oForm(dr, 'Tên điểm bán').locator('input').fill(ten);
	if (!bo.includes('loaiHinh')) await chonSelect(page, dr, 'Loại hình điểm bán');
	await o.oForm(dr, 'Email').locator('input').fill('auto7.rac32@example.com');
	const sdt = o.oForm(dr, 'Số điện thoại').locator('input').first();
	await sdt.click();
	await sdt.pressSequentially('0912000732', { delay: 15 });
}
async function xacNhan(page, dr) {
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	await page.waitForTimeout(2_000);
	return { tb: await o.thongBao(page), loi: (await dr.locator('.ant-form-item-explain-error').allInnerTexts()).map(o.chuan) };
}

test.describe('32_160 · Điểm bán trong mô hình tổ chức (vai tct)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('32_160_001 — Tạo Điểm bán phân loại Pos mini', async ({ page }) => {
		chanNeuTat('32_160_001');
		await mo(page);
		const xa = o.dbDv(XA_RAC());
		test.skip(!xa || xa.xoa, 'Xã rác cố định không còn — xem org-ghi.js CO_DINH.');
		const ma = `${XA_RAC()}S${o.tsNgan()}`;
		const ten = `A7MH32 RÁC Pos mini ${ma.slice(-6)}`;
		const dr = await moTao(page, xa.ten);
		await radio(dr, 'Xã').click().catch(() => null);
		await radio(dr, 'Pos mini').click();
		await page.waitForTimeout(800);
		await dien(page, dr, { ma, ten });
		const cho = page.waitForResponse((r) => r.url().includes('/shops/profile') && r.request().method() === 'POST', { timeout: 60_000 }).catch(() => null);
		const kq = await xacNhan(page, dr);
		const r = await cho;
		const body = r ? r.request().postDataJSON() : null;
		const res = r ? await r.json().catch(() => null) : null;
		await page.waitForTimeout(3_000);
		const db = o.dbDv(ma);
		ghiChu('đo', `body ${JSON.stringify(body && { shopType: body.shopType, shopGrade: body.shopGrade, orgWardCode: body.orgWardCode, shopCode: body.shopCode })} · ${res?.status?.code} ${res?.status?.message} · tb "${kq.tb}" · lỗi ${kq.loi.join(' | ')} · DB ${JSON.stringify(db)}`);
		expect(kq.tb).toContain('Thêm điểm bán thành công');
		expect([body?.shopType, body?.shopGrade]).toEqual(['STORE', 'NORMAL']);
		expect(db && [db.loai, db.cha]).toEqual(['DIEM_BAN', XA_RAC()]);
	});

	test('32_160_002 — Tạo Điểm bán phân loại Pos plus', async ({ page }) => {
		chanNeuTat('32_160_002');
		await mo(page);
		const ma = `A7MH32P${o.tsNgan()}`;
		const dr = await moTao(page, 'Tong cong ty Buu dien Viet Nam');
		await radio(dr, 'TCT').click();
		await page.waitForTimeout(500);
		await radio(dr, 'Pos plus').click();
		await page.waitForTimeout(800);
		await dien(page, dr, { ma, ten: `A7MH32 RÁC Pos plus ${ma.slice(-6)}` });
		const cho = page.waitForResponse((r) => r.url().includes('/shops/profile') && r.request().method() === 'POST', { timeout: 60_000 }).catch(() => null);
		const kq = await xacNhan(page, dr);
		const r = await cho;
		const body = r ? r.request().postDataJSON() : null;
		await page.waitForTimeout(3_000);
		const db = o.dbDv(ma);
		ghiChu('đo', `body ${JSON.stringify(body && { shopType: body.shopType, shopGrade: body.shopGrade, orgUnitCode: body.orgUnitCode, orgProvinceCode: body.orgProvinceCode, orgWardCode: body.orgWardCode })} · tb "${kq.tb}" · lỗi ${kq.loi.join(' | ')} · DB ${JSON.stringify(db)}`);
		expect(kq.tb).toContain('Thêm điểm bán thành công');
		expect([body?.shopType, body?.shopGrade]).toEqual(['STORE', 'PLUS']);
		expect(db?.loai).toBe('DIEM_BAN');
	});

	for (const [id, ten, cap, bo, mong] of [
		['32_160_004', 'Bỏ trống Tên điểm bán khi tạo', 'Xã', ['ten'], /Vui lòng nhập tên điểm bán/],
		['32_160_005', 'Bỏ trống Bưu điện tỉnh hoặc xã khi tạo điểm bán', 'Xã', [], /Vui lòng chọn bưu điện (tỉnh|xã)/],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			await mo(page);
			const gui = await chanTao(page);
			// Mở từ nút TCT (không nạp sẵn bưu điện tỉnh/xã) để 160_005 thật sự để trống hai ô đó.
			const dr = await moTao(page, id === '32_160_005' ? 'Tong cong ty Buu dien Viet Nam' : o.dbDv(XA_RAC()).ten);
			await radio(dr, cap).click().catch(() => null);
			await radio(dr, 'Pos mini').click();
			await page.waitForTimeout(800);
			await dien(page, dr, { ma: `${XA_RAC()}Z${o.tsNgan()}`, ten: 'A7MH32 KHÔNG TẠO', bo });
			const kq = await xacNhan(page, dr);
			expect(o.g.selectDb("SELECT COUNT(*) FROM VNPOST_CORE.ORGANIZATION_UNIT WHERE unit_name='A7MH32 KHÔNG TẠO' AND created_date > NOW() - INTERVAL 5 MINUTE")[0]?.[0], '🔴 Route chặn KHÔNG hoạt động — đã tạo cửa hàng thật').toBe('0');
			ghiChu('nguyên văn', `${kq.loi.join(' | ')} · request gửi ${gui.length}`);
			expect(gui, 'Vẫn gửi tạo điểm bán khi thiếu trường bắt buộc').toEqual([]);
			expect(kq.loi.join(' | ')).toMatch(mong);
		});
	}

	for (const [id, ten, bo] of [
		['32_160_006', 'Bỏ trống Tỉnh thành phố hoặc Xã phường khi tạo điểm bán', 'tinhXa'],
		['32_160_007', 'Tạo điểm bán không nhập Địa chỉ chi tiết', 'diaChi'],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			await mo(page);
			const gui = await chanTao(page);
			const dr = await moTao(page, o.dbDv(XA_RAC()).ten);
			await radio(dr, 'Pos mini').click();
			await page.waitForTimeout(800);
			await dien(page, dr, { ma: `${XA_RAC()}Z${o.tsNgan()}`, ten: 'A7MH32 KHÔNG TẠO' });
			if (bo === 'diaChi') {
				await chonSelect(page, dr, 'Tỉnh/TP');
				await page.waitForTimeout(1_000);
				await chonSelect(page, dr, 'Xã/Phường');
			} else {
				await o.oForm(dr, 'Địa chỉ chi tiết').locator('input, textarea').first().fill('Số 1 đường rác');
			}
			const kq = await xacNhan(page, dr);
			expect(o.g.selectDb("SELECT COUNT(*) FROM VNPOST_CORE.ORGANIZATION_UNIT WHERE unit_name='A7MH32 KHÔNG TẠO' AND created_date > NOW() - INTERVAL 5 MINUTE")[0]?.[0], '🔴 Route chặn KHÔNG hoạt động — đã tạo cửa hàng thật').toBe('0');
			ghiChu('hành vi thật', `lỗi ô: ${kq.loi.join(' | ') || '(không)'} · FE ${gui.length ? 'GỬI tạo' : 'KHÔNG gửi'} (request bị test chặn, không tạo thật) · body ${JSON.stringify(gui[0] && { address: gui[0].address, provinceId: gui[0].provinceId, wardId: gui[0].wardId })}`);
			if (id === '32_160_006') {
				expect(gui, 'Bỏ trống Tỉnh/TP + Xã/Phường mà FE vẫn gửi tạo điểm bán (hai ô không bắt buộc)').toEqual([]);
			} else {
				// Chưa chốt kỳ vọng — ghi nhận: không nhập địa chỉ chi tiết có tạo được không.
				expect(kq.loi.filter((x) => /địa chỉ/i.test(x)).length + gui.length, 'Không bị chặn mà cũng không gửi — không đo được').toBeGreaterThan(0);
			}
		});
	}

	/** Mở "Cập nhật điểm bán", đổi tên (nếu có) + chọn "Tạm ngừng", xác nhận hộp "Xác nhận ngừng hoạt động…". */
	async function suaShop(page, ten, { tenMoi = null, ngung = true } = {}) {
		await o.chonTrenCay(page, ten);
		await o.khungChiTiet(page).getByRole('button', { name: /Cập nhật điểm bán/ }).click();
		const dr = o.drawer(page, 'Sửa điểm bán / hub');
		await expect(dr).toBeVisible({ timeout: 10_000 });
		await page.waitForTimeout(2_000);
		if (tenMoi) await o.oForm(dr, 'Tên điểm bán').locator('input').fill(tenMoi);
		if (ngung) await dr.locator('.ant-radio-wrapper').filter({ hasText: 'Tạm ngừng' }).click();
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);
		const hop = page.locator('.ant-modal-wrap:visible, .ant-popover:visible').filter({ hasText: /ngừng hoạt động/ }).last();
		if (await hop.count()) { await hop.getByRole('button', { name: /Đồng ý|Xác nhận|OK|Có|Tạm ngừng/ }).last().click(); await page.waitForTimeout(2_500); }
		return { tb: await o.thongBao(page), loi: (await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).map(o.chuan) };
	}

	test('32_160_008 — Xem chi tiết điểm bán và chỉnh sửa', async ({ page }) => {
		chanNeuTat('32_160_008');
		await mo(page);
		// Điểm bán rác Pos plus (dưới VNPOST đang hoạt động) do 160_002 tạo — sửa tên + cho Tạm ngừng luôn (giảm rác đang chạy).
		const shop = o.g.selectDb("SELECT unit_code, unit_name FROM VNPOST_CORE.ORGANIZATION_UNIT WHERE chain_id=626 AND is_deleted=0 AND unit_type='DIEM_BAN' AND unit_name LIKE 'A7MH32 RÁC Pos plus%' AND status=1 ORDER BY id DESC LIMIT 1")[0];
		test.skip(!shop, 'Chưa có điểm bán rác Pos plus đang hoạt động (chạy 32_160_002 trước).');
		const moi = `A7MH32 RÁC Pos plus ${shop[0].slice(-6)} SỬA`;
		const kq = await suaShop(page, shop[1], { tenMoi: moi });
		await page.waitForTimeout(2_000);
		const db = o.g.selectDb(`SELECT shop_name, status FROM VNPOST_CORE.SHOP_PROFILE WHERE shop_code='${shop[0]}'`)[0];
		ghiChu('đo', `tb "${kq.tb}" · lỗi ${kq.loi.join(' | ')} · SHOP_PROFILE ${JSON.stringify(db)}`);
		expect(kq.tb).toContain('Cập nhật điểm bán thành công');
		await page.reload();
		await page.waitForTimeout(5_000);
		await o.chonTrenCay(page, moi);
		const ct = o.chuan(await o.khungChiTiet(page).innerText());
		expect(ct).toContain(moi);
		expect(ct, 'Chi tiết không phản ánh trạng thái vừa đổi').toMatch(/Tạm ngừng|Ngừng/);
	});

	test('32 don rac diem ban — cho Tạm ngừng mọi điểm bán rác A7MH32 còn hoạt động', async ({ page }) => {
		await mo(page);
		const ds = o.g.selectDb("SELECT p.shop_code, p.shop_name FROM VNPOST_CORE.SHOP_PROFILE p WHERE p.chain_id=626 AND p.shop_name LIKE 'A7MH32 %' AND p.status=1");
		const kq = [];
		for (const [ma, ten] of ds) kq.push(`${ma}: ${(await suaShop(page, ten).catch((e) => ({ tb: String(e).slice(0, 80) }))).tb}`);
		ghiChu('đã xử lý', kq.join(' · ') || '(không có)');
	});

	test('32_160_009 — Xoá điểm bán từ màn chi tiết', async ({ page }) => {
		chanNeuTat('32_160_009');
		await mo(page);
		await o.chonTrenCay(page, 'AUTO7_SHOP');
		const nut = (await o.khungChiTiet(page).getByRole('button').allInnerTexts()).map(o.chuan).filter(Boolean);
		ghiChu('nút ở chi tiết điểm bán', nut.join(' · '));
		// Chỉ ĐỌC — không bấm xoá điểm bán thật của làn.
		expect(nut.some((x) => /^Xo[áa]/.test(x)), 'Chi tiết điểm bán KHÔNG có nút Xoá (Xoá bị ẩn với DIEM_BAN; BE cũng cấm xoá điểm bán từ cây)').toBe(true);
	});

	for (const [id, ten, nhan] of [
		['32_160_003', 'Tạo điểm bán phân loại Hub và đánh dấu Là cửa hàng mẫu', /Là cửa hàng mẫu/],
		['32_160_010', 'Tạo điểm bán khi danh mục Cửa hàng mẫu rỗng', /Cửa hàng mẫu|Mẫu cửa hàng/],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			await mo(page);
			const gui = await chanTao(page);
			const dr = await moTao(page, o.dbDv(XA_RAC()).ten);
			await radio(dr, 'Hub').click();
			await page.waitForTimeout(1_000);
			const chu = o.chuan(await dr.innerText());
			ghiChu('đo', `form Hub: ${chu.slice(0, 400)} · request ${gui.length}`);
			await dr.getByRole('button', { name: 'Hủy' }).click();
			// Kỳ vọng kịch bản: form có ${nhan} — FE hiện đã comment out (DrawerDetailShop.jsx:148-155) ⇒ fail = phát hiện.
			expect(chu, `Form tạo Hub KHÔNG có ${nhan} (đã bị gỡ/comment trong FE)`).toMatch(nhan);
		});
	}
});
