'use strict';

/**
 * 08 · 060 — Danh mục sản phẩm (GHI), vai `tct`.
 *
 * Đo DOM 24/09/2026 (vnpost-web af8cda07), `/product/category?type=0`:
 * - Ô tìm "Tìm kiếm theo mã, tên danh mục"; nút "Nhập từ Excel" · "Xuất Excel" · "Thêm mới".
 * - Dòng: nút mã danh mục (mở drawer "Chi tiết danh mục" → nút "Chỉnh sửa"), nút "Thao tác"
 *   (menu Xem chi tiết · Cấu hình Ngừng kích hoạt · Xóa → Popconfirm "Đồng ý" → `PUT /chain/product-categories/individual/delete`).
 * - Drawer "Thêm danh mục": `#catCode` "Nhập mã danh mục", `#catName` "Nhập tên danh mục", `#parentId`
 *   (Danh mục cha), `#stockType`; nút "Hủy" · "Xác nhận".
 *
 * 🔴 Danh mục tạm của test: tên `<PREFIX>DMT_…`, mã `A<làn>DMT…`, xoá trong chính case.
 * 🔴 Case "xoá danh mục CÓ sản phẩm" dùng bộ danh mục RÁC `…_55976508` (do lượt seed chạy nhầm đẻ ra,
 *    chứa SP rác) — nếu hệ thống cho xoá thì chỉ mất dữ liệu rác, 🚫 không đụng `AUTO8_DANHMUC` thật.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const { chon } = require('../../00_seed/helpers');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page, chu) => khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: chu }).first();
const hau = () => Date.now().toString().slice(-6);
const TEN = (x) => `${seed.PREFIX}DMT_${x}`;
const MA = (x) => `${seed.PREFIX_MA}DMT${x}`;

async function moMan(page) {
	const cho = page.waitForResponse((r) => r.url().includes('/chain/product-categories') && r.request().method() === 'GET', { timeout: 60_000 }).catch(() => null);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/product/category?type=0`, VAI);
	await expect(khung(page).getByRole('button', { name: 'Thêm mới' })).toBeVisible({ timeout: 60_000 });
	await cho;
	await page.waitForTimeout(1_000);
}

async function tim(page, tu) {
	const o = khung(page).getByPlaceholder('Tìm kiếm theo mã, tên danh mục');
	const cho = page.waitForResponse((r) => r.url().includes('/chain/product-categories') && r.request().method() === 'GET', { timeout: 30_000 }).catch(() => null);
	await o.fill(tu);
	await o.press('Enter');
	await cho;
	await page.waitForTimeout(1_500);
}

async function moThem(page) {
	await khung(page).getByRole('button', { name: 'Thêm mới' }).click();
	const d = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ hasText: 'Thêm danh mục' }).last();
	await expect(d.locator('#catName')).toBeVisible({ timeout: 20_000 });
	return d;
}

/** Bấm Xác nhận; trả { res, body, loi } (res = null nếu FE chặn). */
async function xacNhan(page, d, method = 'POST') {
	const cho = page.waitForResponse((r) => /categor/i.test(r.url()) && r.request().method() === method, { timeout: 8_000 }).catch(() => null);
	await d.getByRole('button', { name: 'Xác nhận', exact: true }).click();
	const res = await cho;
	const body = res ? await res.json().catch(() => ({})) : null;
	await page.waitForTimeout(1_000);
	const loi = chuan([...(await d.locator('.ant-form-item-explain-error').allInnerTexts()), ...(await page.locator('.ant-message-notice').allInnerTexts())].join(' | '));
	return { res, body, loi };
}

async function taoDanhMuc(page, { ma, ten, cha }) {
	const d = await moThem(page);
	await d.locator('#catCode').fill(ma);
	await d.locator('#catName').fill(ten);
	if (cha) await chon(page, d, /Danh mục cha/, cha);
	const kq = await xacNhan(page, d);
	expect(String(kq.body?.status?.code), `Tạo danh mục ${ten} lỗi: ${kq.body?.status?.message ?? kq.loi}`).toBe('200');
	await expect(d).toBeHidden();
}

/** Xoá qua menu Thao tác → Xóa → xác nhận. Trả { body, thongBao }. */
async function xoa(page, chu) {
	await tim(page, chu);
	const r = dong(page, chu);
	await expect(r, `Không thấy danh mục ${chu} để xoá`).toBeVisible();
	await r.getByRole('button', { name: 'Thao tác' }).click();
	await page.locator('.ant-dropdown:not(.ant-dropdown-hidden) li').filter({ hasText: 'Xóa' }).first().click();
	// Popconfirm "Hành động này sẽ không thể hoàn tác…" → "Đồng ý"; API thật là PUT …/individual/delete.
	const md = page.locator('.ant-popover:visible').filter({ hasText: 'không thể hoàn tác' }).last();
	await expect(md).toBeVisible();
	const cho = page.waitForResponse((x) => x.url().includes('/individual/delete'), { timeout: 20_000 }).catch(() => null);
	await md.getByRole('button', { name: 'Đồng ý' }).click();
	const res = await cho;
	await page.waitForTimeout(1_500);
	return { body: res ? await res.json().catch(() => ({})) : null, thongBao: chuan((await page.locator('.ant-message-notice, .ant-modal-confirm').allInnerTexts()).join(' | ')) };
}

async function moSua(page, ma) {
	await tim(page, ma);
	await dong(page, ma).getByRole('button', { name: ma, exact: true }).click();
	const ct = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết danh mục' }).last();
	await ct.getByRole('button', { name: 'Chỉnh sửa' }).click();
	const d = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ has: page.locator('#catName') }).last();
	await expect(d.locator('#catName')).toHaveValue(/.+/, { timeout: 20_000 });
	return d;
}

test.describe('08 · 060 — Danh mục sản phẩm (ghi, danh mục tạm)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('08_060_006 — CRUD danh mục - thêm, sửa, xóa thật', async ({ page }) => {
		chanNeuTat('08_060_006');
		await moMan(page);
		const h = hau();
		const cha = { ma: MA(`C${h}`), ten: TEN(`CHA_${h}`) };
		const con = { ma: MA(`K${h}`), ten: TEN(`CON_${h}`) };
		try {
			await taoDanhMuc(page, cha);
			await taoDanhMuc(page, { ...con, cha: cha.ten });
			await tim(page, con.ma);
			await expect(dong(page, con.ma), 'Danh mục vừa tạo không hiện').toBeVisible();
			// Sửa tên.
			const d = await moSua(page, con.ma);
			await d.locator('#catName').fill(`${con.ten}_SUA`);
			const kq = await xacNhan(page, d, 'PUT');
			expect(String(kq.body?.status?.code), `Sửa danh mục lỗi: ${kq.body?.status?.message ?? kq.loi}`).toBe('200');
			await tim(page, con.ma);
			await expect(dong(page, con.ma), 'Tên mới không hiện').toContainText(`${con.ten}_SUA`);
			// Xoá con rồi cha.
			const x = await xoa(page, con.ma);
			expect(String(x.body?.status?.code), `Xoá danh mục lỗi: ${x.body?.status?.message ?? x.thongBao}`).toBe('200');
			await tim(page, con.ma);
			await expect(dong(page, con.ma), 'Danh mục đã xoá vẫn còn').toHaveCount(0);
		} finally {
			await xoa(page, cha.ma).catch(() => {});
		}
	});

	test('08_060_008 — Thêm danh mục với các ô không hợp lệ', async ({ page }) => {
		chanNeuTat('08_060_008');
		await moMan(page);
		const tenCo = seed.doc().duLieu.sanPham.tenDanhMuc;
		const kq = {};
		const maX = MA(`X${hau()}`);
		let d = await moThem(page);
		await d.locator('#catCode').fill(maX);
		kq.trong = await xacNhan(page, d);
		// 🔴 Trùng tên phải trùng CÙNG CẤP CHA: backend chỉ chặn trùng trong cùng cha. Để trống cha thì
		//    tên seed (nằm dưới cha seed) KHÔNG trùng ⇒ tạo được danh mục gốc cùng tên — đẻ rác thật
		//    (đo 24/09: sinh `AUTO8DMTX572701`). Chọn đúng cha của danh mục seed.
		await chon(page, d, /Danh mục cha/, seed.doc().duLieu.sanPham.tenDanhMucCha);
		await d.locator('#catName').fill(tenCo);
		kq.trung = await xacNhan(page, d);
		if (String(kq.trung.body?.status?.code) === '200') {
			await page.keyboard.press('Escape').catch(() => {});
			await moMan(page);
			await xoa(page, maX).catch(() => {});
			throw new Error(`🔴 Trùng tên trong cùng cha "${seed.doc().duLieu.sanPham.tenDanhMucCha}" vẫn tạo được danh mục (đã xoá ${maX}).`);
		}
		// Toàn khoảng trắng: chặn request ở mạng để khỏi đẻ danh mục không tên nếu FE không chặn.
		const bi = [];
		await page.route('**/__api/**', async (route) => {
			const r = route.request();
			if (r.method() === 'POST' && /categor/i.test(r.url())) { bi.push(r.postData()); return route.fulfill({ status: 403, contentType: 'application/json', body: '{"status":{"code":"403","message":"Bị auto test chặn"}}' }); }
			return route.continue();
		});
		await page.waitForTimeout(3_500);
		await d.locator('#catName').fill('     ');
		kq.khoang = await xacNhan(page, d);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ trong: kq.trong.loi, trung: kq.trung.body?.status?.message ?? kq.trung.loi, khoangTrangGuiDi: bi.length, khoang: kq.khoang.loi }) });
		expect(kq.trong.res, 'Bỏ trống tên mà vẫn gửi request').toBeNull();
		expect(kq.trong.loi, 'Bỏ trống tên không báo đỏ').not.toBe('');
		expect(kq.trung.body?.status?.message ?? kq.trung.loi, 'Trùng tên không báo đúng khuôn').toContain(`Tên danh mục "${tenCo}" đã tồn tại`);
		expect(bi.length, '🔴 Tên toàn khoảng trắng vẫn được gửi đi tạo (tạo được danh mục không tên)').toBe(0);
		void d;
		d = null;
	});

	test('08_060_010 — Sửa danh mục: bỏ trống các ô bắt buộc', async ({ page }) => {
		chanNeuTat('08_060_010');
		await moMan(page);
		const h = hau();
		const dm = { ma: MA(`E${h}`), ten: TEN(`E_${h}`) };
		await taoDanhMuc(page, dm);
		try {
			const d = await moSua(page, dm.ma);
			await d.locator('#catName').fill('');
			const kq = await xacNhan(page, d, 'PUT');
			const maO = d.locator('#catCode');
			let kqMa = null;
			if (await maO.isEnabled()) {
				await d.locator('#catName').fill(dm.ten);
				await maO.fill('');
				kqMa = await xacNhan(page, d, 'PUT');
			}
			test.info().annotations.push({ type: 'đo', description: JSON.stringify({ ten: kq.loi, ma: kqMa?.loi ?? '(ô mã khoá khi sửa)' }) });
			expect(kq.res, 'Xoá trắng tên mà vẫn gửi request sửa').toBeNull();
			expect(kq.loi, 'Xoá trắng tên không báo').not.toBe('');
			if (kqMa) expect(kqMa.res, 'Xoá trắng mã mà vẫn gửi request sửa').toBeNull();
			await page.keyboard.press('Escape');
			await tim(page, dm.ma);
			await expect(dong(page, dm.ma), 'Dữ liệu cũ bị đổi').toContainText(dm.ten);
		} finally {
			await moMan(page);
			await xoa(page, dm.ma).catch(() => {});
		}
	});

	test('08_060_011 — Sửa trường Danh mục cha', async ({ page }) => {
		chanNeuTat('08_060_011');
		await moMan(page);
		const h = hau();
		const a = { ma: MA(`A${h}`), ten: TEN(`A_${h}`) };
		const b = { ma: MA(`B${h}`), ten: TEN(`B_${h}`) };
		const c = { ma: MA(`N${h}`), ten: TEN(`N_${h}`) };
		try {
			await taoDanhMuc(page, a);
			await taoDanhMuc(page, b);
			await taoDanhMuc(page, { ...c, cha: a.ten });
			let d = await moSua(page, c.ma);
			await chon(page, d, /Danh mục cha/, b.ten);
			const kq = await xacNhan(page, d, 'PUT');
			expect(String(kq.body?.status?.code), `Đổi danh mục cha lỗi: ${kq.body?.status?.message ?? kq.loi}`).toBe('200');
			await tim(page, c.ma);
			await dong(page, c.ma).getByRole('button', { name: c.ma, exact: true }).click();
			await expect(page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết danh mục' }).last(), 'Đường dẫn chưa theo cha mới').toContainText(b.ten);
			await page.keyboard.press('Escape');
			// Đặt cha là CHÍNH NÓ / con của nó: phải chặn.
			d = await moSua(page, a.ma);
			const o = d.getByRole('combobox', { name: /Danh mục cha/ });
			await o.click();
			await o.fill(a.ten);
			await page.waitForTimeout(1_500);
			const ds = page.locator('.ant-select-dropdown:visible').last();
			const tuChon = ds.locator('.ant-select-tree-treenode:not(.ant-select-tree-treenode-disabled) .ant-select-tree-node-content-wrapper').filter({ hasText: new RegExp(`^${a.ten}$`) });
			const coTheChonChinhNo = (await tuChon.count()) > 0;
			let ketQua = '(không chọn được chính nó trong cây)';
			if (coTheChonChinhNo) {
				await tuChon.first().click();
				const k2 = await xacNhan(page, d, 'PUT');
				ketQua = `${k2.body?.status?.code}: ${k2.body?.status?.message ?? k2.loi}`;
				expect(String(k2.body?.status?.code), `🔴 Đặt danh mục cha là chính nó mà lưu được (${ketQua})`).not.toBe('200');
			}
			test.info().annotations.push({ type: 'đo', description: `đặt cha = chính nó: ${ketQua}` });
		} finally {
			await moMan(page);
			for (const x of [c, a, b]) await xoa(page, x.ma).catch(() => {});
		}
	});

	test('08_060_012 — Xoá danh mục cấp nhỏ nhất KHÔNG chứa sản phẩm', async ({ page }) => {
		chanNeuTat('08_060_012');
		await moMan(page);
		const dm = { ma: MA(`L${hau()}`), ten: TEN(`L_${hau()}`) };
		await taoDanhMuc(page, dm);
		const x = await xoa(page, dm.ma);
		expect(String(x.body?.status?.code), `Xoá danh mục lá rỗng lỗi: ${x.body?.status?.message ?? x.thongBao}`).toBe('200');
		await tim(page, dm.ma);
		await expect(dong(page, dm.ma), 'Danh mục đã xoá vẫn còn trong danh sách').toHaveCount(0);
	});

	test('08_060_013 — Xoá danh mục cấp nhỏ nhất CÓ chứa sản phẩm', async ({ page }) => {
		chanNeuTat('08_060_013');
		await moMan(page);
		const ma = 'ADM55976508'; // danh mục RÁC chứa SP rác AUTO8_SP_*_55976508
		await tim(page, ma);
		test.skip(!(await dong(page, ma).count()), `Không còn danh mục rác ${ma} (có SP) để thử.`);
		const x = await xoa(page, ma);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(x) });
		expect(String(x.body?.status?.code ?? ''), `🔴 Xoá được danh mục đang có sản phẩm: ${JSON.stringify(x)}`).not.toBe('200');
		expect(x.body?.status?.message ?? x.thongBao, 'Thông báo không nêu danh mục còn sản phẩm').toMatch(/sản phẩm/i);
	});

	test('08_060_014 — Xoá danh mục CHA khi cây con KHÔNG có sản phẩm', async ({ page }) => {
		chanNeuTat('08_060_014');
		await moMan(page);
		const h = hau();
		const cha = { ma: MA(`P${h}`), ten: TEN(`P_${h}`) };
		const con = { ma: MA(`Q${h}`), ten: TEN(`Q_${h}`) };
		await taoDanhMuc(page, cha);
		await taoDanhMuc(page, { ...con, cha: cha.ten });
		const x = await xoa(page, cha.ma);
		await tim(page, con.ma);
		const conCon = await dong(page, con.ma).count();
		test.info().annotations.push({ type: 'đo', description: `xoá cha: ${x.body?.status?.code} ${x.body?.status?.message ?? x.thongBao} · con còn: ${conCon}` });
		// Kỳ vọng: hành vi RÕ RÀNG — hoặc chặn (cha còn nguyên), hoặc xoá cả cây (con cũng mất); 🚫 không để con mồ côi.
		await tim(page, cha.ma);
		const chaCon = await dong(page, cha.ma).count();
		expect(!(chaCon === 0 && conCon > 0), '🔴 Xoá cha xong danh mục con còn lại mồ côi').toBe(true);
		if (conCon) await xoa(page, con.ma).catch(() => {});
		if (chaCon) await xoa(page, cha.ma).catch(() => {});
	});

	test('08_060_015 — Xoá danh mục CHA khi cây con CÓ sản phẩm', async ({ page }) => {
		chanNeuTat('08_060_015');
		await moMan(page);
		const ma = 'ADMC55976508'; // danh mục CHA rác, con ADM55976508 chứa SP rác
		await tim(page, ma);
		test.skip(!(await dong(page, ma).count()), `Không còn danh mục cha rác ${ma}.`);
		const x = await xoa(page, ma);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(x) });
		expect(String(x.body?.status?.code ?? ''), `🔴 Xoá được danh mục cha có SP trong cây con: ${JSON.stringify(x)}`).not.toBe('200');
	});

	test('08_060_017 — Tìm kiếm danh mục theo MỘT PHẦN từ khoá', async ({ page }) => {
		chanNeuTat('08_060_017');
		await moMan(page);
		const ten = seed.doc().duLieu.sanPham.tenDanhMuc; // AUTO8_DANHMUC
		await tim(page, ten.slice(0, -3));
		const t = (await khung(page).locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map(chuan);
		test.info().annotations.push({ type: 'đo', description: `${t.length} dòng: ${t.slice(0, 5).join(' || ')}` });
		expect(t.length).toBeGreaterThan(0);
		expect(t.join(' '), `Tìm một phần không ra ${ten}`).toContain(ten);
	});

	test('08_060_018 — Tìm kiếm danh mục theo FULL từ khoá', async ({ page }) => {
		chanNeuTat('08_060_018');
		await moMan(page);
		const ten = seed.doc().duLieu.sanPham.tenDanhMuc;
		await tim(page, ten);
		await expect(dong(page, ten), `Tìm đúng tên không ra ${ten}`).toBeVisible();
	});

	test('08_060_019 — Tìm kiếm danh mục không tồn tại', async ({ page }) => {
		chanNeuTat('08_060_019');
		await moMan(page);
		await tim(page, 'zzzkhongtontai999');
		await expect(khung(page).locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(0);
		await expect(khung(page).locator('.ant-empty').first(), 'Không hiện trạng thái rỗng').toBeVisible();
		await expect(page.locator('.ant-message-error')).toHaveCount(0);
	});

	test('08_060_020 — Tìm kiếm rồi XOÁ tìm kiếm', async ({ page }) => {
		chanNeuTat('08_060_020');
		await moMan(page);
		const dem = async () => (await khung(page).locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map(chuan).join('||');
		const dau = await dem();
		await tim(page, seed.doc().duLieu.sanPham.tenDanhMuc);
		expect(await dem(), 'Tìm kiếm không lọc bớt').not.toBe(dau);
		await tim(page, '');
		expect(await dem(), 'Xoá ô tìm mà danh sách không về như ban đầu').toBe(dau);
	});
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 26/09/2026 — 060_007/009 (liệt kê ô), 060_016 (danh mục trong CTKM), 060_021–025 (nhập/xuất Excel).
// Nhập Excel: drawer "Nhập danh mục từ file excel" (DrawerImportBase) ⇒ `POST /import/api/v1/categories/excel?type=0&stopOnError=…`
// rồi poll `GET /import/api/v1/categories/status?jobId=` tới SUCCESS/FAILED (totalRecords / totalSuccess / totalFailed).
// File mẫu: `/files/DanhMucSanPham_Import_Mau.xlsx`, cột *Mã danh mục * · Tên danh mục * · Mã danh mục cha · Ghi chú*.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const ExcelJS = require('exceljs');
const { batHeader, goiGhi } = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

async function fileExcel(dong) {
	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet('Danh mục sản phẩm');
	ws.addRow(['Mã danh mục *', 'Tên danh mục *', 'Mã danh mục cha', 'Ghi chú']);
	for (const d of dong) ws.addRow(d);
	return { name: 'danh_muc_auto.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}

/** Nhập file qua drawer; trả { job, tb } (job = data status cuối). */
async function nhapExcel(page, file) {
	await khung(page).getByRole('button', { name: 'Nhập từ Excel' }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Nhập danh mục từ file excel' }).last();
	await expect(dr).toBeVisible({ timeout: 20_000 });
	await dr.locator('input[type=file]').first().setInputFiles(file);
	await page.waitForTimeout(1_000);
	let job = null;
	const nghe = async (r) => { if (/categories\/status/.test(r.url())) { const b = await r.json().catch(() => null); if (b?.data) job = b.data; } };
	page.on('response', nghe);
	const tbs = new Set();
	await dr.getByRole('button', { name: 'Xác nhận nhập' }).click();
	for (let i = 0; i < 60 && !['SUCCESS', 'FAILED'].includes(job?.status); i += 1) {
		for (const t of await page.locator('.ant-message-notice').allInnerTexts()) tbs.add(chuan(t));
		await page.waitForTimeout(1_000);
	}
	await page.waitForTimeout(1_500);
	for (const t of await page.locator('.ant-message-notice').allInnerTexts()) tbs.add(chuan(t));
	page.off('response', nghe);
	const ketQua = chuan(await dr.innerText().catch(() => '')).slice(0, 500);
	await page.keyboard.press('Escape').catch(() => null);
	return { job, tb: [...tbs].join(' | '), ketQua };
}
const dmDb = (ma) => g2(`select id, cat_name, parent_id from CHAIN_PRODUCT_CATEGORY where code='${ma}' order by id desc limit 1`);
const g2 = (q) => require('../../shared/db/otp').chon(q, 'VNPOST_CORE');
/** Xoá danh mục theo mã bằng API (con trước), bỏ qua lỗi. */
async function xoaMa(page, st, mas) {
	for (const ma of mas) {
		const id = (dmDb(ma) || '').split('\t')[0];
		if (id) await goiGhi(page, st, 'PUT', '/chain/product-categories/individual/delete', { type: 0, catId: id }).catch(() => null);
	}
}

test.describe('08 · 060 — Danh mục: liệt kê ô, CTKM, Excel (26/09)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('08_060_007 — Thêm danh mục — ba case gốc KHÔNG có nội dung', async ({ page }) => {
		chanNeuTat('08_060_007');
		await moMan(page);
		const d = await moThem(page);
		const o = [];
		for (const it of await d.locator('.ant-form-item').all()) {
			const nhan = chuan(await it.locator('label').first().innerText().catch(() => ''));
			if (!nhan) continue;
			const bb = (await it.locator('.ant-form-item-required').count()) > 0;
			const vo = it.locator('input, textarea').first();
			const max = await vo.getAttribute('maxlength').catch(() => null);
			o.push(`${nhan}${bb ? ' (bắt buộc)' : ''}${max ? ` max ${max}` : ''}`);
		}
		await d.getByRole('button', { name: 'Xác nhận', exact: true }).click();
		await page.waitForTimeout(1_000);
		const loi = chuan((await d.locator('.ant-form-item-explain-error').allInnerTexts()).join(' | '));
		test.info().annotations.push({ type: 'đo', description: `ô: ${o.join(' · ')} · bỏ trống bấm Xác nhận: "${loi}" (dong21/dong24 trống nội dung — để user đối chiếu)` });
		expect(o.some((x) => x.startsWith('Mã danh mục')), 'Drawer thiếu ô Mã danh mục').toBe(true);
		expect(o.some((x) => x.startsWith('Tên danh mục')), 'Drawer thiếu ô Tên danh mục').toBe(true);
		expect(loi, 'Bỏ trống ô bắt buộc không báo lỗi').not.toBe('');
	});

	test('08_060_009 — Sửa danh mục — năm case gốc KHÔNG có nội dung', async ({ page }) => {
		chanNeuTat('08_060_009');
		await moMan(page);
		const h = hau();
		const x = { ma: MA(`S9${h}`), ten: TEN(`S9_${h}`) };
		try {
			await taoDanhMuc(page, x);
			const d = await moSua(page, x.ma);
			const o = [];
			for (const it of await d.locator('.ant-form-item').all()) {
				const nhan = chuan(await it.locator('label').first().innerText().catch(() => ''));
				if (!nhan) continue;
				const khoa = await it.locator('input:disabled, .ant-select-disabled, textarea:disabled').count();
				o.push(`${nhan}: ${khoa ? 'KHOÁ' : 'sửa được'}`);
			}
			test.info().annotations.push({ type: 'đo', description: `ô form sửa: ${o.join(' · ')} (dong27/dong30–34 trống nội dung — để user đối chiếu)` });
			expect(o.find((s) => s.startsWith('Tên danh mục')), 'Form sửa không cho sửa Tên danh mục').toMatch(/sửa được/);
		} finally { await xoa(page, x.ma).catch(() => {}); }
	});

	test('08_060_016 — Xoá danh mục đang nằm trong CTKM', async ({ page }) => {
		chanNeuTat('08_060_016');
		const st = batHeader(page);
		await moMan(page);
		const h = hau();
		const cha = { ma: MA(`K16${h}`), ten: TEN(`K16_${h}`) };
		let idKm = null;
		try {
			await taoDanhMuc(page, cha);
			const id = Number(dmDb(cha.ma).split('\t')[0]);
			const bd = Date.now() - 60_000;
			const r = await goiGhi(page, st, 'POST', '/marketing/campaign/v2/create', { shopId: st.h.shopid }, {
				promotionName: TEN(`DM_CTKM_${h}`), totalBudget: null, allocateBudgetByScope: false, applyOfflinePromotion: false, allowCombineWithOtherPromotions: true,
				promotionPriority: 1, provinceCanReallocateBudget: false, conditionId: null, customerGroupId: null, description: 'AUTO TEST 08_060_016 (tự dừng)',
				startTime: bd, endTime: bd + 86_400_000, startTimeFrame: null, endTimeFrame: null, applyScopeLevel: 'DIEM_BAN_CU_THE', savedStatus: 1,
				scopes: [{ id: null, scopeType: 'DIEM_BAN', orgUnitCode: seed.doc().duLieu.diemBan.maShop }], budgetScopes: [], applyRealtime: false,
				birthdayPromotionType: 'NONE', mutualExclusionActionType: 'BLOCK', mutualExclusionCampaignIds: [], promotionScope: 'CATEGORY',
				productPromotionType: 'DISCOUNT_SALE', orderDiscountBase: null, orderDiscountUnit: null, orderDiscountValue: 0, applyGift: null, giftItems: null,
				productPromotions: [{ id: null, allowPoint: false, applyToClearance: false, minQuantity: 1, discountSaleSubType: 'EACH_PRODUCT', discountUnit: 'VND', discountValue: 1_000, applyByQuantity: null, categoryIds: [id] }],
			});
			expect(String(r?.status?.code), `Tạo CTKM tiền đề lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
			idKm = r?.data?.campaignId ?? r?.data?.id ?? r?.data;
			const kq = await xoa(page, cha.ma);
			await tim(page, cha.ma);
			const con = await dong(page, cha.ma).count();
			test.info().annotations.push({ type: 'đo', description: `xoá: ${JSON.stringify(kq.body?.status)} · "${kq.thongBao}" · còn trên DS ${con}` });
			expect(con, '🔴 Xoá được danh mục đang dùng trong CTKM').toBe(1);
			expect(`${kq.body?.status?.message} ${kq.thongBao}`).toMatch(/CTKM|khuyến m|PROMOTION/i);
		} finally {
			if (idKm && typeof idKm !== 'object') await goiGhi(page, st, 'PUT', '/marketing/campaign/v2/change-status', {}, { campaignId: idKm, action: 'STOP' }).catch(() => null);
			await xoa(page, cha.ma).catch(() => {});
		}
	});

	test('08_060_021 — Import Excel danh mục — file toàn dòng HỢP LỆ', async ({ page }) => {
		chanNeuTat('08_060_021');
		const st = batHeader(page);
		await moMan(page);
		const h = hau();
		const ma = [MA(`I1${h}`), MA(`I2${h}`), MA(`I3${h}`)];
		try {
			// Đối chứng: chính file mẫu của hệ thống (vnpost-web/public/files) — nếu cũng FAILED 0 dòng thì lỗi ở dịch vụ import, không ở file test.
			const mau = require('node:path').join(__dirname, '../../../../vnpost-web/public/files/DanhMucSanPham_Import_Mau.xlsx');
			if (require('node:fs').existsSync(mau)) {
				const dc = await nhapExcel(page, mau);
				test.info().annotations.push({ type: 'đối chứng file mẫu', description: `${dc.job?.status} · tổng ${dc.job?.totalRecords} · "${dc.tb}"` });
				await xoaMa(page, st, ['DM010101', 'DM0101', 'DM0201', 'DM01', 'DM02']);
			}
			const kq = await nhapExcel(page, await fileExcel([[ma[0], TEN(`I1_${h}`), null, 'cấp 1'], [ma[1], TEN(`I2_${h}`), ma[0], 'cấp 2'], [ma[2], TEN(`I3_${h}`), ma[1], 'cấp 3']]));
			const db = ma.map((m) => dmDb(m));
			test.info().annotations.push({ type: 'đo', description: `job ${JSON.stringify(kq.job)} · "${kq.tb}" · DB ${JSON.stringify(db)}` });
			expect(kq.job?.status).toBe('SUCCESS');
			expect(Number(kq.job?.totalSuccess)).toBe(3);
			const id = db.map((x) => x.split('\t'));
			expect(id.every((x) => x[0]), 'Thiếu danh mục trong DB').toBe(true);
			expect(id[1][2], 'Quan hệ cha–con cấp 2 sai').toBe(id[0][0]);
			expect(id[2][2], 'Quan hệ cha–con cấp 3 sai').toBe(id[1][0]);
		} finally { await xoaMa(page, st, [...ma].reverse()); }
	});

	test('08_060_022 — Import Excel danh mục — file toàn dòng KHÔNG hợp lệ', async ({ page }) => {
		chanNeuTat('08_060_022');
		await moMan(page);
		const h = hau();
		const trung = seed.doc().duLieu.sanPham.maDanhMuc;
		const kq = await nhapExcel(page, await fileExcel([[trung, TEN(`E1_${h}`), null, 'trùng mã'], [MA(`E2${h}`), null, null, 'thiếu tên'], [MA(`E3${h}`), TEN(`E3_${h}`), `KHONGCO${h}`, 'cha không tồn tại']]));
		const tao = [MA(`E2${h}`), MA(`E3${h}`)].map((m) => dmDb(m)).filter(Boolean);
		test.info().annotations.push({ type: 'đo', description: `job ${JSON.stringify(kq.job)} · "${kq.tb}" · kết quả "${kq.ketQua}" · tạo nhầm ${JSON.stringify(tao)}` });
		expect(Number(kq.job?.totalSuccess ?? 0), 'Có dòng lỗi vẫn được nhận').toBe(0);
		expect(Number(kq.job?.totalFailed)).toBe(3);
		expect(tao).toEqual([]);
	});

	test('08_060_023 — Import Excel danh mục — file LẪN dòng hợp lệ và lỗi', async ({ page }) => {
		chanNeuTat('08_060_023');
		const st = batHeader(page);
		await moMan(page);
		const h = hau();
		const tot = MA(`M1${h}`);
		try {
			const kq = await nhapExcel(page, await fileExcel([[tot, TEN(`M1_${h}`), null, 'hợp lệ'], [MA(`M2${h}`), null, null, 'thiếu tên']]));
			const co = Boolean(dmDb(tot));
			test.info().annotations.push({ type: 'đo', description: `stopOnError mặc định (không tick) · job ${JSON.stringify(kq.job)} · "${kq.tb}" · dòng hợp lệ được tạo=${co} ⇒ ${co ? 'NHẬN PHẦN HỢP LỆ, bỏ dòng lỗi' : 'TỪ CHỐI CẢ FILE'} (chưa có đặc tả — user chốt)` });
			expect(Number(kq.job?.totalFailed), 'Không báo dòng lỗi').toBe(1);
			expect(co === (Number(kq.job?.totalSuccess) === 1), 'Số dòng thành công báo lệch với dữ liệu thật').toBe(true);
		} finally { await xoaMa(page, st, [tot]); }
	});

	test('08_060_024 — Tải file Excel mẫu import danh mục', async ({ page }) => {
		chanNeuTat('08_060_024');
		await moMan(page);
		await khung(page).getByRole('button', { name: 'Nhập từ Excel' }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Nhập danh mục từ file excel' }).last();
		await expect(dr).toBeVisible({ timeout: 20_000 });
		const cho = page.waitForEvent('download', { timeout: 20_000 });
		await dr.getByRole('button', { name: /Tải về file mẫu/ }).click();
		const dl = await cho;
		const wb = new ExcelJS.Workbook();
		await wb.xlsx.readFile(await dl.path());
		const ws = wb.worksheets[0];
		const tieuDe = [1, 2, 3, 4].map((i) => chuan(ws.getRow(1).getCell(i).text));
		const lechCha = [];
		ws.eachRow((r, i) => { if (i > 1 && r.getCell(3).value != null && typeof r.getCell(3).value !== 'string') lechCha.push(`dòng ${i}: mã cha = ${r.getCell(3).value}`); });
		test.info().annotations.push({ type: 'đo', description: `${dl.suggestedFilename()} · cột ${JSON.stringify(tieuDe)} · dữ liệu mẫu lạ: ${lechCha.join('; ') || 'không'}` });
		expect(tieuDe.slice(0, 3)).toEqual(['Mã danh mục *', 'Tên danh mục *', 'Mã danh mục cha']);
	});

	test('08_060_025 — Xuất Excel danh mục hiện có', async ({ page }) => {
		chanNeuTat('08_060_025');
		await moMan(page);
		const cho = page.waitForEvent('download', { timeout: 60_000 });
		await khung(page).getByRole('button', { name: /Xuất Excel/ }).click();
		const dl = await cho;
		const wb = new ExcelJS.Workbook();
		await wb.xlsx.readFile(await dl.path());
		const ws = wb.worksheets[0];
		const tieuDe = [1, 2, 3, 4].map((i) => chuan(ws.getRow(1).getCell(i).text));
		const soDong = ws.actualRowCount - 1;
		const db = Number(g2(`select count(*) from CHAIN_PRODUCT_CATEGORY where chain_id=(select chain_id from CHAIN_PRODUCT_CATEGORY where code='${seed.doc().duLieu.sanPham.maDanhMuc}' limit 1) and type=0 and coalesce(is_active,1)=1`));
		test.info().annotations.push({ type: 'đo', description: `cột ${JSON.stringify(tieuDe)} · ${soDong} dòng · DB ${db} danh mục type 0` });
		expect(soDong, 'Số dòng xuất lệch số danh mục').toBe(db);
		// File xuất bỏ dấu "*" ở tiêu đề — so theo tên cột (bỏ "*").
		expect(tieuDe.slice(0, 3).map((t) => t.replace(/\s*\*$/, '')), 'Bộ cột file xuất khác file mẫu ⇒ không nhập lại được').toEqual(['Mã danh mục', 'Tên danh mục', 'Mã danh mục cha']);
	});
});
