'use strict';

/**
 * 07_2 — Khoá kho (GHI) giới hạn ở ĐIỂM BÁN SEED của làn, vai `tct`.
 *
 * Nguồn (vnpost-web af8cda07):
 * - `features/shop/pages/settingPage/settingContents/StockFreezeSetting.jsx` — bảng
 *   "Đối tượng khoá · Phạm vi áp dụng · Lý do · Hành động" ("Xem chi tiết", Popconfirm "Bỏ khoá cấu
 *   hình này?" → "Bỏ khoá" / "Hủy" → "Đã bỏ khoá kho"); bảng rỗng "Chưa có cấu hình khoá kho nào".
 * - `StockFreezeDrawer.jsx` — drawer "Thêm cấu hình khoá kho", 3 thẻ: "Phạm vi áp dụng" (Áp dụng cho
 *   Bưu điện tỉnh / Bưu điện xã / Điểm bán + cây tỉnh → xã → điểm bán), "Danh mục / SKU" (Theo danh
 *   mục / Theo SKU), "Thông tin khác" (Lý do). Nút "Áp dụng khoá kho"; thiếu phạm vi ⇒ "Vui lòng chọn ít
 *   nhất một phạm vi khu vực". Thành công ⇒ "Áp dụng khoá kho thành công".
 * - Nghiệp vụ kho: ô chọn SP (`ProductUnitSearchSelector`, `isCheckFreeze`) gọi `POST /stock/v2/freeze-check`
 *   và chặn thêm dòng với "Sản phẩm đang bị khoá kho" (hoặc thông báo của BE).
 *
 * 🔴 Phạm vi CHỈ là `AUTO8_SHOP` (điểm bán seed) + SP giá tiêu chuẩn của seed ⇒ không ảnh hưởng ai
 *    khác. Khoá được bỏ ở 07_2_020_004.
 * 🔴 Các case nghiệp vụ bị khoá chạy bằng PHIÊN PHỤ của vai tương ứng (shop / seed_gdv) trong cùng
 *    test — thứ tự khoá → thử → bỏ khoá phải nằm trong một luồng.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const LY_DO = 'AUTO test khoa kho lan';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const bang = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');

async function moMan(page) {
	const cho = page.waitForResponse((r) => /stock-scope|freeze|stock\/scopes/i.test(r.url()) && r.request().method() === 'GET', { timeout: 60_000 }).catch(() => null);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=stockFreeze`, VAI);
	await expect(khung(page).getByRole('button', { name: 'Thêm cấu hình khoá kho' })).toBeVisible({ timeout: 60_000 });
	await cho;
	await page.waitForTimeout(1_500);
}

const dongCuaToi = (page) => bang(page).filter({ hasText: LY_DO });

async function moDrawer(page) {
	await khung(page).getByRole('button', { name: 'Thêm cấu hình khoá kho' }).click();
	const d = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm cấu hình khoá kho' }).last();
	await expect(d).toBeVisible();
	return d;
}

async function chonPhamViDiemBan(page, d) {
	const t = k.duLieuSeed();
	const seed = require('../../00_seed/seed-state').doc().duLieu;
	await d.locator('.ant-radio-wrapper').filter({ hasText: /Điểm bán/ }).first().click();
	await d.getByPlaceholder('Tìm kiếm').first().fill(seed.toChuc.tenTinh);
	await d.getByText(seed.toChuc.tenTinh, { exact: true }).first().click();
	await d.getByText(seed.toChuc.tenXa, { exact: true }).first().click();
	// Cột điểm bán: mỗi dòng `.sp-item` = checkbox + nút nhãn (bấm nhãn chỉ để bung cấp dưới).
	const o = d.locator('.sp-item').filter({ has: page.getByRole('button', { name: t.tenShop, exact: true }) }).first();
	await o.locator('.ant-checkbox-input, input[type=checkbox]').first().check({ force: true });
	await expect(d, 'Chọn điểm bán xong mà bộ đếm vẫn 0').not.toContainText(/Đã chọn\s*0 đơn vị/);
}

async function chonSku(page, d, ten) {
	await d.locator('.ant-tabs-tab').filter({ hasText: 'Danh mục / SKU' }).locator('.ant-tabs-tab-btn').dispatchEvent('click');
	await d.locator('.ant-radio-wrapper').filter({ hasText: 'Theo SKU' }).click();
	const o = d.getByPlaceholder('Tìm mã SKU hoặc tên sản phẩm');
	await o.fill(ten);
	const hang = page.locator('.ant-checkbox-wrapper, label, div').filter({ hasText: new RegExp(`^${ten}$`) }).last();
	await hang.click();
	await expect(d.locator('.ant-table-tbody'), `SP ${ten} không vào danh sách đã chọn`).toContainText(ten, { timeout: 15_000 });
}

async function apDung(page, d) {
	const cho = page.waitForResponse((r) => r.request().method() !== 'GET' && /scope|freeze/i.test(r.url()), { timeout: 60_000 });
	await d.getByRole('button', { name: 'Áp dụng khoá kho' }).click();
	const b = await (await cho).json();
	expect(String(b?.status?.code), `Áp dụng khoá kho lỗi: ${b?.status?.message}`).toBe('200');
	await expect(d).toBeHidden();
}

/** Bỏ khoá mọi dòng mang `LY_DO`. */
async function boKhoaHet(page) {
	for (let i = 0; i < 10 && (await dongCuaToi(page).count()); i += 1) {
		await dongCuaToi(page).first().getByRole('button', { name: 'Bỏ khoá' }).click();
		const pc = page.locator('.ant-popover:visible').filter({ hasText: 'Bỏ khoá cấu hình này?' }).last();
		await pc.getByRole('button', { name: 'Bỏ khoá' }).click();
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Đã bỏ khoá kho' }).first()).toBeAttached({ timeout: 20_000 });
		await page.waitForTimeout(1_500);
	}
}

/**
 * Dòng đã lọt vào phiếu ⇒ bấm nút lập phiếu thật, gom mọi response ghi `/stock/v3/import-export*`.
 * Trả danh sách "path → mã: thông báo" — để biết BE có chặn ở bước lưu/duyệt không.
 */
async function thuLapPhieu(page, dr, nut) {
	const kq = [];
	page.on('response', async (r) => {
		if (r.url().includes('/stock/v3/import-export') && r.request().method() === 'POST') {
			const b = await r.json().catch(() => ({}));
			kq.push(`${r.url().split('?')[0].split('/').pop()}→${b?.status?.code}: ${b?.status?.message}`);
		}
	});
	await dr.getByRole('button', { name: nut }).last().click();
	await page.waitForTimeout(8_000);
	return kq;
}

/** Thử thêm SP vào một form nghiệp vụ ở phiên phụ; trả { thongBao, themDuoc }. */
async function thuThemSp(p, moForm, oTim, ten) {
	const dr = await moForm(p.page);
	const thongBao = p.page.locator('.ant-message-notice').first().waitFor({ state: 'attached', timeout: 15_000 })
		.then(async () => k.chuan((await p.page.locator('.ant-message-notice').allInnerTexts()).join(' | ')), () => '');
	await dr.getByPlaceholder(oTim).first().fill(ten);
	await p.page.getByText(ten, { exact: true }).last().click();
	const tb = await thongBao;
	await p.page.waitForTimeout(2_000);
	const themDuoc = (await dr.locator('tr[data-row-key]').filter({ hasText: ten }).count()) > 0;
	return { thongBao: tb, themDuoc };
}

test.describe('07_2 — Khoá kho theo SKU ở điểm bán seed', () => {
	test.describe.configure({ timeout: 300_000, mode: 'default' });
	const { sp } = (() => { try { return k.duLieuSeed(); } catch { return {}; } })();
	const TEN = sp?.tieuChuan?.tenSanPham;

	// 🔴 KHÔNG dùng afterAll để bỏ khoá: case đỏ (vd. 010_006 đang đỏ vì lỗi phạm vi) làm Playwright
	//    đổi worker ⇒ afterAll chạy NGAY, xoá khoá trước khi các case "đang bị khoá" kịp chạy. Dọn khoá
	//    nằm ở 07_2_020_004 (bỏ khoá) và đầu 07_2_010_006 (dọn sót lượt trước).
	test('07_2_010_003 — Chặn thêm cấu hình khi chưa chọn phạm vi áp dụng', async ({ page }) => {
		chanNeuTat('07_2_010_003');
		await moMan(page);
		const daGoi = [];
		page.on('request', (r) => { if (r.method() !== 'GET' && /scope|freeze/i.test(r.url())) daGoi.push(r.url()); });
		const d = await moDrawer(page);
		const tb = page.locator('.ant-message-notice').filter({ hasText: 'Vui lòng chọn ít nhất một phạm vi khu vực' }).first()
			.waitFor({ state: 'attached', timeout: 10_000 }).then(() => true, () => false);
		await d.getByRole('button', { name: 'Áp dụng khoá kho' }).click();
		expect(await tb, 'Không có thông báo "Vui lòng chọn ít nhất một phạm vi khu vực"').toBe(true);
		expect(daGoi, 'Chưa chọn phạm vi mà vẫn gửi request').toEqual([]);
	});

	test('07_2_010_006 — Tạo cấu hình khoá kho theo SKU', async ({ page }) => {
		chanNeuTat('07_2_010_006');
		await moMan(page);
		await boKhoaHet(page); // lượt trước còn sót
		const d = await moDrawer(page);
		await chonPhamViDiemBan(page, d);
		await chonSku(page, d, TEN);
		await d.locator('.ant-tabs-tab').filter({ hasText: 'Thông tin khác' }).locator('.ant-tabs-tab-btn').dispatchEvent('click');
		await d.getByPlaceholder('Nhập lý do khoá kho').fill(LY_DO);
		await apDung(page, d);
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Áp dụng khoá kho thành công' }).first()).toBeAttached();
		await page.waitForTimeout(2_000);
		const r = dongCuaToi(page).first();
		await expect(r, 'Cấu hình vừa tạo không hiện trong bảng').toBeVisible({ timeout: 20_000 });
		await expect(r).toContainText('Sản phẩm / SKU');
		// Bảng không ghi tên SP / điểm bán — đối chiếu ở "Xem chi tiết".
		await r.getByRole('button', { name: 'Xem chi tiết' }).click();
		const ct = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await expect(ct).toBeVisible();
		await page.waitForTimeout(2_000);
		const chu = k.chuan(await ct.innerText());
		test.info().annotations.push({ type: 'đo', description: `dòng: ${k.chuan(await r.innerText())} · chi tiết: ${chu.slice(0, 500)}` });
		await ct.locator('.ant-tabs-tab').filter({ hasText: /Danh mục \/ SKU/ }).locator('.ant-tabs-tab-btn').dispatchEvent('click');
		await page.waitForTimeout(1_500);
		expect(k.chuan(await ct.innerText()), 'Chi tiết cấu hình không có SP đã khoá').toContain(TEN);
		// 🔴 Đo 24/09/2026: xã AUTO8_XA chỉ có 1 điểm bán ⇒ tích điểm bán là FE tự tích luôn xã cha và gửi
		//    `scopes: [{ scopeType: BUU_DIEN_XA, orgUnitCode: <mã xã> }]` (scopeType ngoài = DIEM_BAN) —
		//    tức khoá CẢ XÃ. Kịch bản: phạm vi phải là đúng điểm bán đã chọn.
		expect.soft(chu, 'Chọn một điểm bán mà cấu hình lưu phạm vi là cả Bưu điện xã').toContain(k.duLieuSeed().tenShop);
		// Đã chọn "Áp dụng cho: Điểm bán" ⇒ cột Phạm vi phải là Điểm bán.
		expect.soft(k.chuan(await r.innerText()), 'Chọn phạm vi "Điểm bán" mà bảng ghi cấp khác').toContain('Điểm bán');
	});

	test('07_2_010_013 — Xem danh sách đơn vị đã chọn trong cấu hình khoá', async ({ page }) => {
		chanNeuTat('07_2_010_013');
		await moMan(page);
		const r = dongCuaToi(page).first();
		test.skip(!(await r.count()), 'Chưa có cấu hình khoá của test — chạy 07_2_010_006.');
		await r.getByRole('button', { name: 'Xem chi tiết' }).click();
		const ct = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await expect(ct).toBeVisible();
		await expect(ct, 'Chi tiết không liệt kê điểm bán đã chọn').toContainText(k.duLieuSeed().tenShop);
	});

	test('07_2_060_002 — Xuất kho với sản phẩm đang bị khoá', async ({ browser }) => {
		chanNeuTat('07_2_060_002');
		const p = await k.moPhienPhu(browser, 'shop');
		try {
			let dr;
			const kq = await thuThemSp(p, async (pg) => { dr = await k.moFormXuat(pg, 'shop'); return dr; }, 'Tìm sản phẩm', TEN);
			// Lọt qua bước chọn ⇒ thử lập phiếu thật: BE phải chặn (giới hạn thiệt hại: 1 đơn vị SP seed).
			if (kq.themDuoc) {
				await dr.locator('#supplierNote').fill('AUTO test 07_2_060_002 khoa kho');
				kq.lapPhieu = await thuLapPhieu(p.page, dr, /^Xuất kho$/);
			}
			test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
			const chan = !kq.themDuoc || (kq.lapPhieu || []).some((x) => !/→200:/.test(x));
			expect(chan, `SP đang khoá vẫn XUẤT được: ${JSON.stringify(kq)}`).toBe(true);
			expect([kq.thongBao, ...(kq.lapPhieu || [])].join(' '), 'Không có thông báo SP đang bị khoá').toMatch(/khoá|khóa/i);
		} finally { await p.dong(); }
	});

	test('07_2_060_003 — Nhập kho với sản phẩm đang bị khoá', async ({ browser }) => {
		chanNeuTat('07_2_060_003');
		const p = await k.moPhienPhu(browser, 'seed_gdv');
		try {
			let dr;
			const kq = await thuThemSp(p, async (pg) => { dr = await k.moFormNhap(pg, 'seed_gdv'); return dr; }, /Tìm kiếm sản phẩm/, TEN);
			if (kq.themDuoc) {
				const dong = dr.locator('tr[data-row-key]').filter({ hasText: TEN }).first();
				await k.nhapLo(p.page, dong, [{ nsx: '01/09/2026', hsd: '01/09/2027' }]);
				await dr.locator('#supplierNote').fill('AUTO test 07_2_060_003 khoa kho');
				kq.lapPhieu = await thuLapPhieu(p.page, dr, /^Nhập kho$/);
			}
			test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
			const chan = !kq.themDuoc || (kq.lapPhieu || []).some((x) => !/→200:/.test(x));
			expect(chan, `SP đang khoá vẫn NHẬP được: ${JSON.stringify(kq)}`).toBe(true);
			expect([kq.thongBao, ...(kq.lapPhieu || [])].join(' '), 'Không có thông báo SP đang bị khoá').toMatch(/khoá|khóa/i);
		} finally { await p.dong(); }
	});

	test('07_2_060_004 — Chuyển kho sản phẩm đang bị khoá', async ({ page }) => {
		chanNeuTat('07_2_060_004');
		const kho = k.khoChuyen();
		const dr = await k.moFormChuyen(page, VAI);
		await k.chonKho(page, dr, 'Chọn kho chuyển', kho.nguon);
		const tb = page.locator('.ant-message-notice').first().waitFor({ state: 'attached', timeout: 15_000 })
			.then(async () => k.chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | ')), () => '');
		await dr.getByPlaceholder('Tìm sản phẩm').fill(TEN);
		await page.getByText(TEN, { exact: true }).last().click();
		const thongBao = await tb;
		await page.waitForTimeout(2_000);
		const themDuoc = (await dr.locator('tr[data-row-key]').filter({ hasText: TEN }).count()) > 0;
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ thongBao, themDuoc }) });
		expect(themDuoc, 'SP đang khoá vẫn thêm được vào phiếu chuyển').toBe(false);
		expect(thongBao, 'Không có thông báo SP đang bị khoá').toMatch(/khoá|khóa/i);
	});

	test('07_2_020_002 — Bỏ khoá hỏi xác nhận trước khi thực hiện', async ({ page }) => {
		chanNeuTat('07_2_020_002');
		await moMan(page);
		const r = dongCuaToi(page).first();
		test.skip(!(await r.count()), 'Chưa có cấu hình khoá của test.');
		await r.getByRole('button', { name: 'Bỏ khoá' }).click();
		const pc = page.locator('.ant-popover:visible').filter({ hasText: 'Bỏ khoá cấu hình này?' }).last();
		await expect(pc, 'Không hỏi xác nhận trước khi bỏ khoá').toBeVisible();
		await expect(pc.getByRole('button', { name: 'Bỏ khoá' })).toBeVisible();
		await expect(pc.getByRole('button', { name: 'Hủy' })).toBeVisible();
		await pc.getByRole('button', { name: 'Hủy' }).click();
	});

	test('07_2_020_003 — Huỷ ở hộp xác nhận thì giữ nguyên cấu hình', async ({ page }) => {
		chanNeuTat('07_2_020_003');
		await moMan(page);
		const n = await dongCuaToi(page).count();
		test.skip(!n, 'Chưa có cấu hình khoá của test.');
		const daGoi = [];
		page.on('request', (r) => { if (r.method() === 'DELETE' || (r.method() !== 'GET' && /unfreeze|scope/i.test(r.url()))) daGoi.push(r.url()); });
		await dongCuaToi(page).first().getByRole('button', { name: 'Bỏ khoá' }).click();
		const pc = page.locator('.ant-popover:visible').filter({ hasText: 'Bỏ khoá cấu hình này?' }).last();
		await pc.getByRole('button', { name: 'Hủy' }).click();
		await page.waitForTimeout(1_500);
		expect(daGoi, 'Bấm Hủy mà vẫn gửi request bỏ khoá').toEqual([]);
		expect(await dongCuaToi(page).count(), 'Cấu hình biến mất dù đã Hủy').toBe(n);
	});

	test('07_2_020_004 — Bỏ khoá xoá hẳn cấu hình khỏi bảng', async ({ page }) => {
		chanNeuTat('07_2_020_004');
		await moMan(page);
		const n = await dongCuaToi(page).count();
		test.skip(!n, 'Chưa có cấu hình khoá của test.');
		await boKhoaHet(page);
		await page.reload();
		await expect(khung(page).getByRole('button', { name: 'Thêm cấu hình khoá kho' })).toBeVisible({ timeout: 60_000 });
		await page.waitForTimeout(2_000);
		expect(await dongCuaToi(page).count(), 'Cấu hình còn trong bảng sau khi bỏ khoá + tải lại').toBe(0);
	});

	test('07_2_060_009 — Xuất kho với sản phẩm đã bỏ khoá', async ({ browser }) => {
		chanNeuTat('07_2_060_009');
		const p = await k.moPhienPhu(browser, 'shop');
		try {
			const kq = await thuThemSp(p, (pg) => k.moFormXuat(pg, 'shop'), 'Tìm sản phẩm', TEN);
			expect(kq.themDuoc, `SP đã bỏ khoá vẫn không thêm được vào phiếu xuất (${kq.thongBao})`).toBe(true);
		} finally { await p.dong(); }
	});

	test('07_2_060_008 — Nhập kho với sản phẩm đã bỏ khoá', async ({ browser }) => {
		chanNeuTat('07_2_060_008');
		const p = await k.moPhienPhu(browser, 'seed_gdv');
		try {
			const kq = await thuThemSp(p, (pg) => k.moFormNhap(pg, 'seed_gdv'), /Tìm kiếm sản phẩm/, TEN);
			expect(kq.themDuoc, `SP đã bỏ khoá vẫn không thêm được vào phiếu nhập (${kq.thongBao})`).toBe(true);
		} finally { await p.dong(); }
	});
});
