'use strict';

/**
 * 10 · GHI bảng giá tạm: tạo · sửa · phê duyệt · đổi trạng thái · xoá (vai `tct`).
 *
 * 🔴 Mọi bảng giá ở đây áp cho điểm bán RÁC `diemBanNhan` (tỉnh rác `…_55976508`) — xem `bg-ghi.js`.
 *    Phê duyệt chúng KHÔNG đổi giá ở điểm bán seed. Tên `AUTO8_BGT_*`, xoá hết ở case cuối "dọn bảng giá tạm".
 * 🔴 Vế "kiểm giá ở quầy" của các case (030_005, 050_002, 120_002, 020_007) KHÔNG chạy ở đây — thuộc nhóm
 *    `10_130_*` (POS, cần ca mở). Ghi rõ trong annotation.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const bg = require('./bg-ghi');
const pp = require('./price-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

// 🔴 KHÔNG dùng mode serial: một case đỏ là cả chuỗi sau bị bỏ. Case chạy tuần tự (1 worker) nhưng
//    worker khởi động lại sau mỗi case đỏ ⇒ biến module mất ⇒ trạng thái dùng chung ghi ra FILE.
const fs = require('node:fs');
const FILE = path.join(GOC, 'test-output', 'bg-ghi-state.json');
const H0 = bg.hau();
function napTT() {
	try {
		const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
		if (Date.now() - j.luc < 60 * 60_000) return j;
	} catch {}
	return null;
}
const TT = napTT() || { luc: Date.now(), A: { ten: bg.TEN(`A${H0}`) }, C: { ten: bg.TEN(`C${H0}`) }, D: { ten: bg.TEN(`D${H0}`) }, daTao: [] };
const luuTT = () => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(TT)); };
const { A, C, D } = TT; // A: tạo → duyệt → sửa · C: Ngừng kích hoạt · D: Chưa gồm VAT
const H = TT.A.ten.slice(-7);
const DA_TAO = {
	has: (t) => TT.daTao.includes(t),
	add: (t) => { if (!TT.daTao.includes(t)) TT.daTao.push(t); luuTT(); },
	delete: (t) => { TT.daTao = TT.daTao.filter((x) => x !== t); luuTT(); },
	get size() { return TT.daTao.length; },
	[Symbol.iterator]: () => TT.daTao[Symbol.iterator](),
};
test.afterEach(() => luuTT());

async function moSua(page, st, ten) {
	const x = await bg.chiTietTheoTen(page, st, ten);
	expect(x, `Không tra được bảng giá ${ten}`).toBeTruthy();
	// Đi từ danh sách (nút sửa) — Lưu gọi `navigate(-1)`, mở thẳng URL sửa là lùi ra khỏi màn.
	const d = await bg.timDong(page, ten);
	await bg.nutIcon(d, 'edit').click();
	await expect(page.getByPlaceholder('Nhập tên bảng giá')).toHaveValue(ten, { timeout: 30_000 });
	return x;
}

async function trangThaiDong(page, ten) {
	const d = await bg.timDong(page, ten);
	await expect(d, `Danh sách không có ${ten}`).toBeVisible({ timeout: 20_000 });
	return { d, duyet: await bg.oCot(page, d, 'Trạng thái phê duyệt'), tt: await bg.oCot(page, d, 'Trạng thái'), hl: await bg.oCot(page, d, 'Thời gian hiệu lực') };
}

test.describe('10 · ghi bảng giá tạm (tct)', () => {
	test('10_020_003 — Lập bảng giá mới đầy đủ ba thẻ', async ({ page }) => {
		chanNeuTat('10_020_003');
		test.setTimeout(180_000);
		// Lượt mới: làm lại trạng thái (tên mới), để bảng cũ cho afterAll dọn theo tiền tố.
		Object.assign(TT, { luc: Date.now(), daTao: [] });
		A.ten = bg.TEN(`A${H0}`); C.ten = bg.TEN(`C${H0}`); D.ten = bg.TEN(`D${H0}`); delete A.daDuyet;
		luuTT();
		const kq = await bg.taoTam(page, { ten: A.ten, ketThuc: bg.sauNgay(30) });
		DA_TAO.add(A.ten);
		const r = await trangThaiDong(page, A.ten);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ ...r, d: undefined, gui: { startDate: kq.gui.startDate, endDate: kq.gui.endDate, scopeType: kq.gui.scopeType, scopes: kq.gui.scopes } }) });
		expect(r.duyet).toBe('Chờ phê duyệt');
		expect(r.hl, 'Thời gian hiệu lực không có ngày bắt đầu đã khai').toContain(bg.homNay());
		expect(r.hl, 'Thời gian hiệu lực không có ngày kết thúc đã khai').toContain(bg.sauNgay(30));
	});

	test('10_050_004 — Bảng giá mới tạo có trạng thái phê duyệt là Chờ phê duyệt', async ({ page }) => {
		chanNeuTat('10_050_004');
		test.skip(!DA_TAO.has(A.ten), 'Không có bảng giá A từ 10_020_003.');
		const st = k.batHeader(page);
		const r = await trangThaiDong(page, A.ten);
		const x = await bg.chiTietTheoTen(page, st, A.ten);
		expect(r.duyet).toBe('Chờ phê duyệt');
		expect(x.isApproved, 'API: isApproved của bảng mới ≠ 0').toBe(0);
	});

	test('10_070_001 — Chọn phạm vi theo Điểm bán', async ({ page }) => {
		chanNeuTat('10_070_001');
		test.skip(!DA_TAO.has(A.ten), 'Không có bảng giá A từ 10_020_003.');
		const { rac } = bg.duLieu();
		const st = k.batHeader(page);
		await pp.moMan(page, 'tct');
		const x = await bg.chiTietTheoTen(page, st, A.ten);
		const sc = x.ct?.scopes || [];
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ scopeType: x.ct?.scopeType, scopes: sc }).slice(0, 600) });
		expect(sc.length, 'Phạm vi nở ra nhiều hơn 1 điểm bán đã chọn').toBe(1);
		expect(JSON.stringify(sc[0]), 'Phạm vi không phải điểm bán đã chọn').toMatch(new RegExp(String(rac.shopId)));
	});

	test('10_020_001 — Chặn lập bảng giá trùng tên', async ({ page }) => {
		chanNeuTat('10_020_001');
		test.skip(!DA_TAO.has(A.ten), 'Không có bảng giá A từ 10_020_003.');
		test.setTimeout(180_000);
		const { sp } = bg.duLieu();
		const st = k.batHeader(page);
		await bg.moTao(page);
		await bg.dienChung(page, { ten: A.ten, pb: 'PB2' });
		await bg.chonPhamViRac(page);
		await bg.themSku(page, sp.tieuChuan.sku);
		await bg.datGia(page, sp.tieuChuan.sku, 1000);
		const kq = await bg.luu(page);
		const code = kq.body?.status?.code;
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ http: kq.res?.status(), code, msg: kq.body?.status?.message, tb: kq.thongBao }) });
		await pp.moMan(page, 'tct');
		const ds = ((await k.goiApi(page, st, '/chain-price-list/get-all', { name: A.ten, page: 0, size: 20 })).data || []).filter((v) => v.name === A.ten);
		expect(ds.length, '🔴 Tạo được bảng giá TRÙNG TÊN (đã có 2 bảng cùng tên)').toBe(1);
		expect(kq.thongBao, 'Trùng tên mà vẫn báo "Thêm bảng giá thành công"').not.toContain('Thêm bảng giá thành công');
	});

	test('10_020_007 — Tạo bảng giá với trạng thái Ngừng kích hoạt', async ({ page }) => {
		chanNeuTat('10_020_007');
		test.setTimeout(180_000);
		await bg.taoTam(page, { ten: C.ten, status: 0 });
		DA_TAO.add(C.ten);
		await expect(page.getByText('Quản lý bảng giá').first(), 'Lưu xong không về màn Quản lý bảng giá').toBeVisible({ timeout: 20_000 });
		const r = await trangThaiDong(page, C.ten);
		test.info().annotations.push({ type: 'đo', description: `${r.tt} — vế "không áp giá ở quầy" thuộc 10_130_003 (POS)` });
		expect(r.tt).toBe('Ngừng kích hoạt');
	});

	test('10_020_008 — Tạo bảng giá CHƯA bao gồm thuế VAT', async ({ page }) => {
		chanNeuTat('10_020_008');
		test.setTimeout(180_000);
		const st = k.batHeader(page);
		const kq = await bg.taoTam(page, { ten: D.ten, includeTax: 0 });
		DA_TAO.add(D.ten);
		expect(kq.gui.includeTax, 'Payload không mang includeTax = 0').toBe(0);
		const r = await trangThaiDong(page, D.ten);
		const x = await bg.chiTietTheoTen(page, st, D.ten);
		expect(x.ct?.includeTax, 'Chi tiết: phương thức VAT không phải "chưa bao gồm"').toBe(0);
		test.info().annotations.push({ type: 'đo', description: `cột Giá gồm thuế: ${await bg.oCot(page, r.d, 'Giá gồm thuế')}` });
		await moTrang(page, `${process.env.VNPOST_BASE_URL}/product/pricing/detail/${x.priceListId}`, 'tct');
		await expect(page.locator('.ant-pro-page-container')).toContainText('chưa bao gồm', { ignoreCase: true, timeout: 20_000 });
	});

	for (const [id, cap] of [['10_070_003', 'xa'], ['10_070_004', 'tinh']]) {
		test(`${id} — Áp dụng cho Bưu điện ${cap === 'xa' ? 'xã' : 'tỉnh'} — đúng cấp`, async ({ page }) => {
			chanNeuTat(id);
			test.setTimeout(180_000);
			const { rac, sp } = bg.duLieu();
			const st = k.batHeader(page);
			const ten = bg.TEN(`${cap.toUpperCase()}${H}`);
			await bg.moTao(page);
			await bg.dienChung(page, { ten, pb: 'PB' });
			await bg.the(page, 'Phạm vi khu vực').click();
			const body = page.locator('.sp-body').first();
			const cot = (i) => body.locator('.sp-column').nth(i);
			await cot(0).locator('.sp-column__search input').fill(rac.tenTinh);
			const tinh = cot(0).locator('.sp-item').filter({ hasText: rac.tenTinh }).first();
			if (cap === 'tinh') {
				await tinh.locator('input[type="checkbox"]').check();
			} else {
				await tinh.locator('.sp-item__label').click();
				await cot(1).locator('.sp-column__search input').fill(rac.tenXa);
				await cot(1).locator('.sp-item').filter({ hasText: rac.tenXa }).first().locator('input[type="checkbox"]').check();
			}
			await bg.themSku(page, sp.tieuChuan.sku);
			await bg.datGia(page, sp.tieuChuan.sku, 1000);
			const kq = await bg.luu(page);
			if (kq.res?.status() < 400) DA_TAO.add(ten);
			expect(kq.thongBao).toContain('Thêm bảng giá thành công');
			await pp.moMan(page, 'tct');
			const x = await bg.chiTietTheoTen(page, st, ten);
			test.info().annotations.push({ type: 'đo', description: JSON.stringify({ gui: { scopeType: kq.gui?.scopeType ?? JSON.parse(kq.res.request().postData()).scopeType, scopes: JSON.parse(kq.res.request().postData()).scopes }, scopeType: x.ct?.scopeType, scopes: x.ct?.scopes }).slice(0, 800) });
			const sc = x.ct?.scopes || [];
			expect(sc.length, `Phạm vi ${cap} bị nở/hạ thành ${sc.length} đơn vị`).toBe(1);
			// `ct.scopeType` cấp gốc là MÃ SỐ; cấp thật đọc ở `scopes[0].unitType`.
			expect(String(sc[0]?.unitType || ''), `Phạm vi không ghi đúng cấp ${cap}`).toBe(cap === 'xa' ? 'BUU_DIEN_XA' : 'BUU_DIEN_TINH');
			expect(sc[0]?.unitName).toBe(cap === 'xa' ? rac.tenXa : rac.tenTinh);
		});
	}

	test('10_050_001 — Phê duyệt bảng giá hỏi xác nhận trước', async ({ page }) => {
		chanNeuTat('10_050_001');
		test.skip(!DA_TAO.has(A.ten), 'Không có bảng giá A.');
		const goi = [];
		page.on('request', (r) => { if (/chain-price-list\/approve/.test(r.url())) goi.push(r.url()); });
		const { d } = await trangThaiDong(page, A.ten);
		const hop = await bg.popconfirm(page, d, 'check', 'Xác nhận phê duyệt bảng giá?');
		await expect(hop.getByRole('button', { name: 'Đồng ý' })).toBeVisible();
		await hop.getByRole('button', { name: 'Hủy' }).dispatchEvent('click');
		expect(goi, 'Mới mở hộp xác nhận đã gửi request phê duyệt').toEqual([]);
	});

	test('10_050_002 — Phê duyệt xong bảng giá đổi trạng thái', async ({ page }) => {
		chanNeuTat('10_050_002');
		test.skip(!DA_TAO.has(A.ten), 'Không có bảng giá A.');
		const { d } = await trangThaiDong(page, A.ten);
		const hop = await bg.popconfirm(page, d, 'check', 'Xác nhận phê duyệt bảng giá?');
		const tb = await bg.thongBaoQuanh(page, () => hop.getByRole('button', { name: 'Đồng ý' }).click());
		expect(tb).toContain('Phê duyệt bảng giá thành công');
		const r = await trangThaiDong(page, A.ten);
		test.info().annotations.push({ type: 'đo', description: `${r.duyet} — vế "áp dụng được ở điểm bán" thuộc 10_130_* (POS)` });
		expect(r.duyet).not.toBe('Chờ phê duyệt');
		A.daDuyet = true;
	});

	test('10_050_005 — Bảng giá ĐÃ phê duyệt không phê duyệt lại được', async ({ page }) => {
		chanNeuTat('10_050_005');
		test.skip(!A.daDuyet, 'Bảng giá A chưa được phê duyệt ở 10_050_002.');
		const { d } = await trangThaiDong(page, A.ten);
		await expect(bg.nutIcon(d, 'check'), 'Bảng giá đã duyệt vẫn còn nút phê duyệt').toHaveCount(0);
	});

	test('10_050_003 — Biểu tượng đổi trạng thái thay đổi theo trạng thái hiện tại', async ({ page }) => {
		chanNeuTat('10_050_003');
		test.skip(!DA_TAO.has(A.ten) || !DA_TAO.has(C.ten), 'Thiếu bảng giá A (Kích hoạt) hoặc C (Ngừng kích hoạt).');
		const a = (await trangThaiDong(page, A.ten)).d;
		const ia = await a.locator('button:has(.anticon-pause-circle), button:has(.anticon-pause)').first().evaluate((e) => e.className).catch(() => '');
		const c = (await trangThaiDong(page, C.ten)).d;
		const ic = await c.locator('button:has(.anticon-play-circle), button:has(.anticon-caret-right)').first().evaluate((e) => e.className).catch(() => '');
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ kichHoat: ia, ngung: ic }) });
		expect(ia, 'Bảng giá Kích hoạt không có biểu tượng tạm dừng màu cam').toContain('text-orange-500');
		expect(ic, 'Bảng giá Ngừng kích hoạt không có biểu tượng phát màu xanh').toContain('text-green-500');
	});

	test('10_030_001 — Sửa bảng giá đã phê duyệt thì quay lại Chờ phê duyệt', async ({ page }) => {
		chanNeuTat('10_030_001');
		test.skip(!A.daDuyet, 'Bảng giá A chưa được phê duyệt.');
		const { sp } = bg.duLieu();
		const st = k.batHeader(page);
		await pp.moMan(page, 'tct');
		await moSua(page, st, A.ten);
		await bg.the(page, 'Sản phẩm').click();
		await expect(bg.dongSp(page, sp.tieuChuan.sku)).toBeVisible({ timeout: 20_000 });
		await bg.datGia(page, sp.tieuChuan.sku, 124_000);
		const kq = await bg.luu(page, { sua: true });
		expect(kq.thongBao).toContain('Cập nhật bảng giá thành công');
		const r = await trangThaiDong(page, A.ten);
		expect(r.duyet, 'Sửa bảng giá đã duyệt mà không quay về Chờ phê duyệt').toBe('Chờ phê duyệt');
		A.daDuyet = false;
	});

	test('10_030_004 — Sửa bảng giá — thêm sản phẩm mới vào thẻ Sản phẩm', async ({ page }) => {
		chanNeuTat('10_030_004');
		test.skip(!DA_TAO.has(A.ten), 'Không có bảng giá A.');
		const { sp } = bg.duLieu();
		const st = k.batHeader(page);
		await pp.moMan(page, 'tct');
		const x = await moSua(page, st, A.ten);
		const tb = await bg.themSku(page, sp.fifo.sku);
		expect(tb).toBe('Đã thêm 1 sản phẩm mới.');
		const khoiMoi = page.locator('.ant-tabs-tabpane-active').locator('div').filter({ has: page.getByText('Sản phẩm thêm mới', { exact: true }) }).filter({ has: page.locator('.ant-table') }).last();
		await expect(khoiMoi, 'Không có bảng "Sản phẩm thêm mới"').toBeVisible();
		await expect(khoiMoi.locator('tr.ant-table-row').filter({ hasText: sp.fifo.sku }), 'SP mới không nằm trong bảng "Sản phẩm thêm mới"').toHaveCount(1);
		await bg.datGia(page, sp.fifo.sku, 55_000);
		const kq = await bg.luu(page, { sua: true });
		expect(kq.thongBao).toContain('Cập nhật bảng giá thành công');
		await pp.moMan(page, 'tct');
		const items = await bg.sanPhamCua(page, st, x.priceListId);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(items.map((i) => [i.sku, i.price ?? i.unitPrice])) });
		expect(items.map((i) => i.sku), 'Sau khi lưu SP mới không gộp vào danh sách chính').toContain(sp.fifo.sku);
	});

	test('10_120_002 — Sửa bảng giá — xoá sản phẩm khỏi thẻ Sản phẩm', async ({ page }) => {
		chanNeuTat('10_120_002');
		test.skip(!DA_TAO.has(A.ten), 'Không có bảng giá A.');
		const { sp } = bg.duLieu();
		const st = k.batHeader(page);
		await pp.moMan(page, 'tct');
		const x = await moSua(page, st, A.ten);
		await bg.the(page, 'Sản phẩm').click();
		const r = bg.dongSp(page, sp.fifo.sku);
		await expect(r, `Bảng giá A không có ${sp.fifo.sku} (10_030_004 chưa chạy?)`).toBeVisible({ timeout: 20_000 });
		// Nút xoá dòng là icon `close` (`ProductPriceTable.jsx` cột Thao tác), xoá ngay không hỏi.
		await r.locator('button:has(.anticon-close)').first().click();
		await expect(bg.dongSp(page, sp.fifo.sku)).toHaveCount(0);
		const kq = await bg.luu(page, { sua: true });
		expect(kq.thongBao).toContain('Cập nhật bảng giá thành công');
		await pp.moMan(page, 'tct');
		const items = await bg.sanPhamCua(page, st, x.priceListId);
		test.info().annotations.push({ type: 'đo', description: `${JSON.stringify(items.map((i) => i.sku))} — vế "ở quầy không còn lấy giá" thuộc 10_130_003` });
		expect(items.map((i) => i.sku), 'Xoá rồi lưu mà SP vẫn còn trong bảng giá').not.toContain(sp.fifo.sku);
	});

	test('10_030_003 — Sửa tên bảng giá thành tên KHÔNG trùng', async ({ page }) => {
		chanNeuTat('10_030_003');
		test.skip(!DA_TAO.has(A.ten), 'Không có bảng giá A.');
		const st = k.batHeader(page);
		await pp.moMan(page, 'tct');
		await moSua(page, st, A.ten);
		const moi = `${A.ten}_DOI`;
		const oTen = page.getByPlaceholder('Nhập tên bảng giá');
		await oTen.fill(moi);
		// 🔴 Đo 24/09: gõ ngay khi màn sửa vừa hiện tên thì ~2 giây sau form NẠP LẠI, ô tên bị đè về tên cũ
		//    (không báo gì) ⇒ lưu ra tên cũ mà vẫn "Cập nhật bảng giá thành công". Ghi lại, rồi gõ lại sau khi yên.
		await page.waitForTimeout(3_000);
		const bịĐè = (await oTen.inputValue()) !== moi;
		if (bịĐè) {
			await oTen.fill(moi);
			await page.waitForTimeout(3_000);
		}
		const giuDuoc = await oTen.inputValue();
		test.info().annotations.push({ type: 'đo', description: `ô tên bị form nạp lại đè lần đầu: ${bịĐè}` });
		const kq = await bg.luu(page, { sua: true });
		expect(kq.thongBao).toContain('Cập nhật bảng giá thành công');
		DA_TAO.add(moi);
		await pp.moMan(page, 'tct');
		const apiMoi = await bg.chiTietTheoTen(page, st, moi);
		const apiCu = await bg.chiTietTheoTen(page, st, A.ten);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ oSau2s: giuDuoc, gui: JSON.parse(kq.res?.request().postData() || '{}').name, apiMoi: apiMoi?.name, apiCu: apiCu?.name }) });
		expect(apiMoi, `Lưu báo thành công nhưng API không có bảng giá tên mới (tên cũ còn: ${Boolean(apiCu)})`).toBeTruthy();
		const d = await bg.timDong(page, moi);
		await expect(d, 'Tên mới không hiện ở danh sách').toBeVisible({ timeout: 20_000 });
		DA_TAO.delete(A.ten);
		A.ten = moi;
	});

	test('10_030_005 — Sửa bảng giá — cập nhật phạm vi khu vực', async ({ page }) => {
		chanNeuTat('10_030_005');
		test.skip(!DA_TAO.has(A.ten), 'Không có bảng giá A.');
		const { rac } = bg.duLieu();
		const st = k.batHeader(page);
		await pp.moMan(page, 'tct');
		const truoc = await moSua(page, st, A.ten);
		// Phạm vi hiện tại đã là cấp XÃ (FE gom điểm bán duy nhất lên xã — xem 10_070_001) ⇒ đổi lên cả TỈNH rác.
		await bg.the(page, 'Phạm vi khu vực').click();
		const body = page.locator('.sp-body').first();
		const cot = (i) => body.locator('.sp-column').nth(i);
		await cot(0).locator('.sp-column__search input').fill(rac.tenTinh);
		await cot(0).locator('.sp-item').filter({ hasText: rac.tenTinh }).first().locator('input[type="checkbox"]').check({ force: true });
		const kq = await bg.luu(page, { sua: true });
		expect(kq.thongBao).toContain('Cập nhật bảng giá thành công');
		await pp.moMan(page, 'tct');
		const sau = await bg.chiTietTheoTen(page, st, A.ten);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ truoc: [truoc.ct?.scopeType, truoc.ct?.scopes], sau: [sau.ct?.scopeType, sau.ct?.scopes] }).slice(0, 900) + ' — vế giá ở quầy (đơn vị bị bỏ/mới) thuộc 10_130_*' });
		expect(JSON.stringify(sau.ct?.scopes), 'Phạm vi không đổi sau khi sửa').not.toBe(JSON.stringify(truoc.ct?.scopes));
		expect(sau.ct?.scopes?.[0]?.unitType, 'Phạm vi mới không phải cấp tỉnh đã chọn').toBe('BUU_DIEN_TINH');
	});

	test('10_030_006 — Không sửa được Hình thức của bảng giá đã tồn tại', async ({ page }) => {
		chanNeuTat('10_030_006');
		test.skip(!DA_TAO.has(A.ten), 'Không có bảng giá A.');
		const st = k.batHeader(page);
		await pp.moMan(page, 'tct');
		await moSua(page, st, A.ten);
		const o = page.getByText(/^(Mua bán|Ký gửi)$/);
		const n = await o.count();
		test.info().annotations.push({ type: 'đo', description: `ô Hình thức (Mua bán/Ký gửi) trên màn sửa: ${n} phần tử` });
		expect(n, '🔴 Màn sửa bảng giá KHÔNG còn ô "Hình thức" (FE đã comment-out) — không kiểm được "khoá không cho đổi"').toBeGreaterThan(0);
	});

	test('10_060_001 — Xoá bảng giá hỏi xác nhận trước', async ({ page }) => {
		chanNeuTat('10_060_001');
		test.skip(!DA_TAO.has(C.ten), 'Không có bảng giá C.');
		const { d } = await trangThaiDong(page, C.ten);
		const hop = await bg.popconfirm(page, d, 'delete', 'Xác nhận xóa bảng giá?');
		await expect(hop.getByRole('button', { name: 'Xóa', exact: true })).toBeVisible();
		await expect(hop.getByRole('button', { name: 'Hủy', exact: true })).toBeVisible();
		await hop.getByRole('button', { name: 'Hủy', exact: true }).click();
	});

	test('10_060_003 — Xoá bảng giá — bấm Huỷ thì không xoá', async ({ page }) => {
		chanNeuTat('10_060_003');
		test.skip(!DA_TAO.has(C.ten), 'Không có bảng giá C.');
		const goi = [];
		page.on('request', (r) => { if (/chain-price-list\/delete/.test(r.url())) goi.push(r.url()); });
		const { d } = await trangThaiDong(page, C.ten);
		const hop = await bg.popconfirm(page, d, 'delete', 'Xác nhận xóa bảng giá?');
		await hop.getByRole('button', { name: 'Hủy', exact: true }).click();
		await expect(hop).toBeHidden();
		expect(goi).toEqual([]);
		await expect((await trangThaiDong(page, C.ten)).d).toBeVisible();
	});

	test('10_060_002 — Xoá bảng giá thành công và vẫn giữ lịch sử', async ({ page }) => {
		chanNeuTat('10_060_002');
		test.skip(!DA_TAO.has(C.ten), 'Không có bảng giá C.');
		const st = k.batHeader(page);
		const { d } = await trangThaiDong(page, C.ten);
		const truoc = await bg.chiTietTheoTen(page, st, C.ten);
		const hop = await bg.popconfirm(page, d, 'delete', 'Xác nhận xóa bảng giá?');
		const tb = await bg.thongBaoQuanh(page, () => hop.getByRole('button', { name: 'Xóa', exact: true }).click());
		expect(tb).toContain('Xóa bảng giá thành công');
		DA_TAO.delete(C.ten);
		await expect((await bg.timDong(page, C.ten)), 'Xoá xong vẫn còn trong danh sách').toHaveCount(0);
		const ls = await k.goiGhi(page, st, 'GET', '/chain-price-list/audit-log', { priceListId: truoc.priceListId, page: 0, size: 20 });
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ auditLog: ls?.status, soDong: (ls?.data || []).length, hanhDong: (ls?.data || []).map((x) => x.actionName) }).slice(0, 600) });
		expect(String(ls?.status?.code), 'Xoá xong không tra được lịch sử của bảng giá').toBe('200');
		expect((ls.data || []).length, 'Xoá xong lịch sử bảng giá rỗng').toBeGreaterThan(0);
	});

	test('10_060_004 — Không xoá được bảng giá đang Kích hoạt và đã Phê duyệt', async ({ page }) => {
		chanNeuTat('10_060_004');
		test.skip(!DA_TAO.has(D.ten), 'Không có bảng giá D.');
		const st = k.batHeader(page);
		// Duyệt D (Kích hoạt) bằng UI rồi thử xoá.
		let { d } = await trangThaiDong(page, D.ten);
		const hop = await bg.popconfirm(page, d, 'check', 'Xác nhận phê duyệt bảng giá?');
		await bg.thongBaoQuanh(page, () => hop.getByRole('button', { name: 'Đồng ý' }).click());
		({ d } = await trangThaiDong(page, D.ten));
		const x = await bg.chiTietTheoTen(page, st, D.ten);
		expect([x.status, x.isApproved], 'D chưa ở trạng thái Kích hoạt + Đã duyệt').toEqual([1, 1]);
		const nut = bg.nutIcon(d, 'delete');
		const bi = await nut.isDisabled().catch(() => null);
		let kq = null;
		if (!bi) {
			const h = await bg.popconfirm(page, d, 'delete', 'Xác nhận xóa bảng giá?');
			const cho = page.waitForResponse((r) => /chain-price-list\/delete/.test(r.url()), { timeout: 20_000 });
			const tb = await bg.thongBaoQuanh(page, () => h.getByRole('button', { name: 'Xóa', exact: true }).click());
			const res = await cho;
			kq = { http: res.status(), body: await res.json().catch(() => null), tb };
		}
		const con = await bg.chiTietTheoTen(page, st, D.ten);
		if (!con) DA_TAO.delete(D.ten);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ nutDisabled: bi, kq, conTon: Boolean(con) }) });
		expect(Boolean(con), '🔴 Xoá được bảng giá đang Kích hoạt + Đã phê duyệt').toBe(true);
	});
	// Dọn là CASE CUỐI (🚫 afterAll: nó chạy mỗi khi worker tắt — sau mỗi case đỏ — và xoá bảng giữa chừng).
	test('dọn bảng giá tạm AUTO8_BGT_*', async ({ browser }) => {
		test.setTimeout(180_000);
		const p = await k.moPhienPhu(browser, 'tct', pp.ROUTE);
		try {
			// Dọn cả bảng giá tạm SÓT từ lượt trước (lỗi giữa chừng sau khi đã tạo).
			const sot = ((await k.goiApi(p.page, p.st, '/chain-price-list/get-all', { name: bg.TEN(''), page: 0, size: 100 })).data || []).map((v) => v.name).filter((n) => n?.startsWith(bg.TEN('')));
			for (const ten of new Set([...DA_TAO, ...sot])) {
				const x = await bg.chiTietTheoTen(p.page, p.st, ten).catch(() => null);
				if (!x) continue;
				if (x.status === 1 && x.isApproved === 1) await k.goiGhi(p.page, p.st, 'PUT', '/chain-price-list/update-status', { priceListId: x.priceListId, status: 0 });
				await k.goiGhi(p.page, p.st, 'DELETE', '/chain-price-list/delete', { priceListId: x.priceListId });
			}
		} finally {
			await p.dong();
		}
	});

});
