'use strict';

/**
 * 26 · Chuỗi case GHI của phiếu thu, vai `shop` (Cửa hàng trưởng AUTO<lane>_SHOP).
 *
 * 🔴 Vì sao `shop` chứ không phải `gdv`: vai Giao dịch viên (SHOP_SALE) KHÔNG có quyền
 *    `GET_EXPENSES_VIEW_ALL_RECEIPTS` / `CREATE_EXPENSES_V2` — mở màn là 401 "Không có quyền truy cập",
 *    không có nút "Thêm phiếu thu". HDSD khai vai `DIEM_BAN`, Cửa hàng trưởng là vai điểm bán đủ quyền.
 *
 * Chuỗi (chạy theo thứ tự khai báo, 1 worker): tạo danh mục → lập phiếu → lọc/in/xem/sửa → xoá → DỌN.
 * 🔴 Mỗi test tự tra lại trạng thái từ server (ghi chú `AUTOTEST_26_*`), 🚫 không tin biến module:
 *    test đỏ làm Playwright khởi động lại worker, biến module mất sạch.
 * 🔴 Dọn bằng test CUỐI file, 🚫 afterAll.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { storageStateFor } = require('../../shared/auth/accounts');
const {
	tenGdv, API, ROUTE, batHeader, moTrang, boDau, chuan, dong, goiApi, khung, oTim, phieuHomNay, taiLaiBoi, thamSo,
	tongThuQuy,
} = require('./receipt-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const TIEN_TO = 'AUTOTEST_26';
const TEN_DM = `${TIEN_TO}_DM`;
const GHI_CHU_TM = `${TIEN_TO}_TM`;
const GHI_CHU_VISA = `${TIEN_TO}_VISA`;
const GHI_CHU_LO = `${TIEN_TO}_LO`;
const SO_TIEN = 12345;
const SO_TIEN_MOI = 20000;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Mở màn; trả `{ kho, shopId, userId }` lấy từ lời gọi danh sách đầu tiên của app. */
async function moManGhi(page) {
	const kho = batHeader(page);
	const cho = page.waitForResponse((r) => r.url().includes(API) && r.status() === 200, { timeout: 90_000 });
	await moTrang(page, ROUTE, VAI);
	const res = await cho;
	const shopId = Number(thamSo(res).shopId);
	const jwt = JSON.parse(Buffer.from(kho.h.authorization.split('.')[1], 'base64url').toString());
	return { kho, shopId, userId: Number(jwt.user_id ?? jwt.sub) };
}

const cuaToi = (ds, ghiChu) => (ds?.data ?? []).filter((p) => (p.note ?? '').startsWith(ghiChu));

/**
 * Phiếu tiền mặt AUTOTEST_26_TM của chuỗi. Case sau dùng lại phiếu 020_001 lập qua UI; nếu 020_001 đỏ
 * (hoặc chạy lẻ bằng -g) thì DỰNG BÙ qua API cùng payload để case sau vẫn kiểm được phần của nó.
 */
async function phieuTM(page, ctx) {
	let p = cuaToi(await phieuHomNay(page, ctx.kho, ctx.shopId), GHI_CHU_TM)[0];
	if (!p) {
		const quy = await quyTienMat(page, ctx.kho, ctx.shopId);
		await taoPhieuApi(page, ctx, { money: SO_TIEN, paymentMethod: 'CASH', note: GHI_CHU_TM, fundId: quy.fundId });
		test.info().annotations.push({ type: 'tiền đề', description: 'Dựng bù phiếu AUTOTEST_26_TM qua API' });
		p = cuaToi(await phieuHomNay(page, ctx.kho, ctx.shopId), GHI_CHU_TM)[0];
		await taiLaiBoi(page, () => page.reload());
	}
	return p;
}

async function quyTienMat(page, kho, shopId) {
	const r = await goiApi(page, kho, 'GET', '/fund/get-all', { params: { shopId, page: 0, size: 50 } });
	const q = (r.body?.data ?? []).find((f) => f.fundType === 'CASH' && f.active);
	expect(q, `Điểm bán ${shopId} không có quỹ tiền mặt nào: ${JSON.stringify(r.body?.data)}`).toBeTruthy();
	return q;
}

/** Chọn lựa chọn khớp `nhan` (so sau khi bỏ dấu — DOM là NFD) trong dropdown ĐANG MỞ của combobox. */
async function chonTrong(page, combobox, nhan) {
	await combobox.click();
	const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
	await dd.waitFor({ state: 'visible' });
	const muc = dd.locator('.ant-select-item-option');
	await expect(muc.first()).toBeVisible();
	const ds = await muc.allInnerTexts();
	const i = ds.findIndex((s) => boDau(s) === boDau(nhan));
	expect(i, `Không có lựa chọn "${nhan}". Đang có: ${ds.map(chuan).join(' · ')}`).toBeGreaterThanOrEqual(0);
	await muc.nth(i).click();
	await expect(dd).toBeHidden();
}

/** Tạo phiếu qua API bằng đúng payload FE gửi (`DrawerAddAndUpdateReceipt.handleSubmit`). */
async function taoPhieuApi(page, ctx, { money, paymentMethod, note, cateName = 'Chưa phân loại', fundId }) {
	const r = await goiApi(page, ctx.kho, 'POST', '/expenses/v2/create', {
		params: { shopId: ctx.shopId },
		data: {
			shopId: ctx.shopId, date: Date.now(), createdBy: ctx.userId, receiptCode: undefined,
			cateName, sourceType: 'STAFF', sourceId: ctx.userId, money, fundId, note,
			imageIds: [], type: 2, orderType: 2, paymentMethod,
		},
	});
	expect(String(r.body?.status?.code), `Tạo phiếu qua API lỗi: ${JSON.stringify(r.body?.status)}`).toBe('200');
	return r.body.data;
}

async function xoaPhieuApi(page, ctx, orderId) {
	const r = await goiApi(page, ctx.kho, 'PUT', '/expenses/delete_receipts', {
		params: { orderId, shopId: ctx.shopId },
	});
	return r;
}

async function moDanhMuc(page) {
	await khung(page).getByRole('button', { name: 'Danh mục phiếu thu' }).click();
	const dm = page.getByRole('dialog', { name: 'Danh mục phiếu thu' });
	await expect(dm.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible();
	return dm;
}

const dongCua = (page, ma) => dong(page).filter({ hasText: ma });

/** Lọc danh sách về đúng mã phiếu (danh sách chỉ hiện 12 dòng mới nhất) rồi trả dòng đó. */
async function timDong(page, ma) {
	await taiLaiBoi(page, async () => {
		await oTim(page).fill(ma);
		await oTim(page).press('Enter');
	});
	const d = dongCua(page, ma);
	await expect(d, `Không tìm thấy phiếu ${ma} trên danh sách`).toHaveCount(1);
	return d;
}

test.describe('26 · Phiếu thu — chuỗi ghi (Cửa hàng trưởng)', () => {
	test('26_050_003 — Thêm danh mục mới dùng được ngay khi lập phiếu', async ({ page }) => {
		chanNeuTat('26_050_003');
		await moManGhi(page);

		const dm = await moDanhMuc(page);
		await dm.getByRole('button', { name: 'Thêm mới' }).click();
		const them = page.getByRole('dialog', { name: 'Thêm mới danh mục' });
		await them.getByPlaceholder('Nhập tên danh mục').fill(TEN_DM);
		// Chọn biểu tượng thứ 2 (biểu tượng 1 là mặc định) để kiểm "kèm biểu tượng vừa chọn".
		const bieuTuong = them.locator('.ant-spin-container .ant-col > div');
		await expect(bieuTuong.nth(1)).toBeVisible();
		const anh = await bieuTuong.nth(1).locator('div').first().evaluate((e) => getComputedStyle(e).backgroundImage);
		await bieuTuong.nth(1).click();

		const choLuu = page.waitForResponse((r) => r.url().includes('/expenses/create-receipt-option'));
		await them.getByRole('button', { name: 'Lưu' }).click();
		expect((await choLuu).status()).toBeLessThan(500);
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Thêm thành công' })).toBeVisible();

		const dongDm = dm.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: TEN_DM });
		await expect(dongDm, 'Danh mục mới không có trong danh sách').toHaveCount(1);
		const anhDong = await dongDm.locator('td').nth(1).locator('div > div').first()
			.evaluate((e) => getComputedStyle(e).backgroundImage);
		expect(anhDong, 'Biểu tượng của danh mục khác biểu tượng vừa chọn').toBe(anh);
		await dm.getByRole('button', { name: 'Đóng' }).click();

		// Dùng được ngay ở ô Danh mục phiếu của màn lập phiếu.
		await khung(page).getByRole('button', { name: 'Thêm phiếu thu' }).click();
		const d = page.getByRole('dialog', { name: 'Phiếu thu tiền' });
		await d.getByRole('combobox', { name: 'Danh mục phiếu' }).click();
		const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
		await expect(dd.locator('.ant-select-item-option').filter({ hasText: TEN_DM })).toHaveCount(1);
	});

	test('26_050_001 — Danh mục riêng của điểm bán xếp trước danh mục mặc định', async ({ page }) => {
		chanNeuTat('26_050_001');
		const ctx = await moManGhi(page);
		const r = await goiApi(page, ctx.kho, 'GET', '/expenses/get-receipt-options', {
			params: { shopId: ctx.shopId, typeOption: 'RECEIPTS' },
		});
		const rieng = (r.body?.data ?? []).filter((c) => c.type !== 'SYSTEM').map((c) => c.text);
		expect(rieng, 'Điểm bán chưa có danh mục riêng nào (050_003 chưa tạo?)').toContain(TEN_DM);

		const dm = await moDanhMuc(page);
		const hang = dm.locator('.ant-table-tbody tr.ant-table-row');
		await expect(hang).toHaveCount(7);
		const ten = (await hang.locator('td:nth-child(2)').allInnerTexts()).map(chuan);
		expect(ten.slice(0, rieng.length), `Thứ tự trang 1: ${ten.join(' · ')}`).toEqual(rieng.slice(0, 7));
	});

	test('26_020_001 — Lập phiếu thu tiền mặt', async ({ page }) => {
		chanNeuTat('26_020_001');
		const ctx = await moManGhi(page);
		const quy = await quyTienMat(page, ctx.kho, ctx.shopId);
		const quyTruoc = await tongThuQuy(page, ctx.kho, ctx.shopId, quy.fundId);

		await khung(page).getByRole('button', { name: 'Thêm phiếu thu' }).click();
		const d = page.getByRole('dialog', { name: 'Phiếu thu tiền' });
		await chonTrong(page, d.getByRole('combobox', { name: 'Danh mục phiếu' }), TEN_DM);
		// "Thu từ" mặc định = Nhân viên; ô đối tượng là combobox không tên ngay sau nó.
		await expect(d.getByRole('combobox', { name: 'Thu từ' })).toBeVisible();
		const oNhanVien = d.locator('.ant-form-item').filter({ has: page.locator('label', { hasText: /^Nhân viên$/ }) })
			.getByRole('combobox');
		await chonTrong(page, oNhanVien, tenGdv());
		await chonTrong(page, d.getByRole('combobox', { name: 'Quỹ thu' }), quy.name);
		await d.getByRole('spinbutton', { name: 'Số tiền cần thu' }).fill(String(SO_TIEN));
		await d.getByRole('textbox', { name: 'Ghi chú' }).fill(GHI_CHU_TM);
		const ma = await d.getByRole('textbox', { name: 'Mã phiếu thu' }).inputValue();

		const choTao = page.waitForResponse((r) => r.url().includes('/expenses/v2/create'));
		await d.getByRole('button', { name: 'Hoàn thành' }).click();
		const res = await choTao;
		const body = await res.json();
		expect(String(body?.status?.code), JSON.stringify(body?.status)).toBe('200');
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Thành công' })).toBeVisible();

		await expect(dongCua(page, ma), `Phiếu ${ma} không xuất hiện trong danh sách`).toHaveCount(1);
		const ds = await phieuHomNay(page, ctx.kho, ctx.shopId);
		const p = cuaToi(ds, GHI_CHU_TM);
		expect(p.length).toBe(1);
		expect(p[0].totalAmount).toBe(SO_TIEN);
		expect(p[0].paymentMethod).toBe('CASH');
		await expect
			.poll(() => tongThuQuy(page, ctx.kho, ctx.shopId, quy.fundId), {
				message: `Tổng thu quỹ "${quy.name}" không tăng đúng ${SO_TIEN}`, timeout: 30_000,
			})
			.toBe(quyTruoc + SO_TIEN);
	});

	test('26_010_003 — Bốn thẻ lọc theo phương thức thanh toán', async ({ page }) => {
		chanNeuTat('26_010_003');
		const ctx = await moManGhi(page);
		await phieuTM(page, ctx);
		// Dựng thêm 1 phiếu Thẻ VISA (qua API, không gắn quỹ) để có ≥ 2 phương thức.
		if (cuaToi(await phieuHomNay(page, ctx.kho, ctx.shopId), GHI_CHU_VISA).length === 0) {
			await taoPhieuApi(page, ctx, { money: 5000, paymentMethod: 'VISA', note: GHI_CHU_VISA });
		}
		const tatCa = await phieuHomNay(page, ctx.kho, ctx.shopId);
		const cacPt = new Set(tatCa.data.map((p) => p.paymentMethod));
		expect(cacPt.size, `Chỉ có phương thức: ${[...cacPt].join(',')}`).toBeGreaterThanOrEqual(2);
		await page.reload();
		await expect(dong(page).first()).toBeVisible();

		// "Tất cả" đang active lúc mở màn ⇒ bấm nó trước sẽ không gọi API; đi 3 thẻ kia rồi mới quay về.
		const TAB = { 'Tiền mặt': 'CASH', 'Chuyển khoản': 'TRANSFER', 'Thẻ VISA': 'VISA', 'Tất cả': null };
		for (const [nhan, key] of Object.entries(TAB)) {
			const res = await taiLaiBoi(page, () =>
				khung(page).locator('.ant-tabs-tab').filter({ hasText: nhan }).first().locator('.ant-tabs-tab-btn')
					.dispatchEvent('click'));
			const p = thamSo(res);
			const body = await res.json();
			const mongDoi = tatCa.data.filter((x) => key === null || x.paymentMethod === key);
			if (key) expect(p.payment_method, `Thẻ "${nhan}" không gửi payment_method`).toBe(key);
			expect(body.data.every((x) => key === null || x.paymentMethod === key), `Thẻ "${nhan}" trả sai phương thức`).toBe(true);
			expect(body.page.total_elements, `Thẻ "${nhan}": số phiếu`).toBe(mongDoi.length);
			await expect(dong(page)).toHaveCount(Math.min(12, mongDoi.length));
			const tong = mongDoi.reduce((s, x) => s + x.totalAmount, 0);
			const chuTong = chuan(await khung(page).locator('.main-content .flexbox--right').innerText());
			expect(Number(chuTong.replace(/\D/g, '')), `Thẻ "${nhan}": "${chuTong}" ≠ ${tong}`).toBe(tong);
		}
	});

	test('26_010_004 — In được phiếu thu từ danh sách', async ({ page }) => {
		chanNeuTat('26_010_004');
		const ctx = await moManGhi(page);
		const p = await phieuTM(page, ctx);
		expect(p, 'Không còn phiếu AUTOTEST_26_TM (020_001 chưa tạo?)').toBeTruthy();
		const d = await timDong(page, p.orderNumber);

		const soFrame = page.frames().length;
		await d.getByRole('button', { name: 'printer' }).click();
		// react-to-print dựng nội dung in (ẩn) rồi mở iframe in.
		const banIn = page.locator('div[style*="display: none"]').filter({ hasText: 'PHIẾU THU' });
		await expect(banIn, 'Không dựng bản in phiếu thu').toHaveCount(1);
		await expect(banIn).toContainText(p.orderNumber);
		await expect.poll(() => page.frames().length, { message: 'Không mở khung in' }).toBeGreaterThan(soFrame);
	});

	test('26_090_004 — Tìm phiếu thu bằng ký tự đặc biệt', async ({ page }) => {
		const i = chanNeuTat('26_090_004');
		const ctx = await moManGhi(page);
		const banDau = (await phieuHomNay(page, ctx.kho, ctx.shopId)).data.length;
		expect(banDau, 'Hôm nay chưa có phiếu nào để đối chứng').toBeGreaterThan(0);
		const tuKhoa = i?.data?.tuKhoa || '%_';
		const res = await taiLaiBoi(page, async () => {
			await oTim(page).fill(tuKhoa);
			await oTim(page).press('Enter');
		});
		expect(res.status(), 'Ký tự đặc biệt làm API lỗi').toBeLessThan(500);
		expect(thamSo(res).keyword).toBe(tuKhoa);
		const soDong = (await res.json()).data?.length ?? 0;
		expect(soDong, `Tìm "${tuKhoa}" vẫn trả ${soDong}/${banDau} phiếu ⇒ ký tự đại diện SQL không escape`)
			.toBeLessThan(banDau);
	});

	test('26_090_001 — Phân trang danh sách phiếu thu', async ({ page }) => {
		chanNeuTat('26_090_001');
		const ctx = await moManGhi(page);
		// Mỗi trang 12 dòng ⇒ dựng đủ 13+ phiếu hôm nay.
		const hienCo = (await phieuHomNay(page, ctx.kho, ctx.shopId)).data.length;
		for (let k = hienCo; k < 26; k += 1) {
			await taoPhieuApi(page, ctx, { money: 1000 + k, paymentMethod: 'CASH', note: `${GHI_CHU_LO}_${k}` });
		}
		const tong = (await phieuHomNay(page, ctx.kho, ctx.shopId)).data.length;
		await page.reload();
		await expect(dong(page)).toHaveCount(12);
		const phanTrang = khung(page).locator('.ant-pagination');
		await expect(phanTrang).toContainText(`trên ${tong} phiếu thu`);

		const trang1 = (await dong(page).locator('td:nth-child(3)').allInnerTexts()).map(chuan);
		let res = await taiLaiBoi(page, () => phanTrang.locator('.ant-pagination-item-2').click());
		expect(Number(thamSo(res).page)).toBe(1);
		const trang2 = (await dong(page).locator('td:nth-child(3)').allInnerTexts()).map(chuan);
		expect(trang2.length).toBe(12);
		expect(trang2.filter((m) => trang1.includes(m)), 'Trang 2 trùng dòng với trang 1').toEqual([]);

		// Đổi số dòng mỗi trang sang 20.
		res = await taiLaiBoi(page, async () => {
			await phanTrang.locator('.ant-pagination-options .ant-select').click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
				.filter({ hasText: '20' }).click();
		});
		expect(Number(thamSo(res).size)).toBe(20);
		await expect(dong(page)).toHaveCount(Math.min(20, Math.max(0, tong - 20 * (Number(thamSo(res).page)))));

		// Về trang cuối.
		const cuoi = Math.ceil(tong / 20);
		// Antd giữ nguyên trang hiện tại khi đổi cỡ trang ⇒ có thể đã ĐANG ở trang cuối (bấm lại không gọi API).
		if (Number(thamSo(res).page) + 1 !== cuoi) {
			res = await taiLaiBoi(page, () => phanTrang.locator(`.ant-pagination-item-${cuoi}`).click());
		}
		expect(res.status()).toBe(200);
		expect(Number(thamSo(res).page)).toBe(cuoi - 1);
		await expect(dong(page)).toHaveCount(tong - 20 * (cuoi - 1));
	});

	test('26_090_003 — Tổ hợp bộ lọc trên danh sách phiếu thu', async ({ page }) => {
		chanNeuTat('26_090_003');
		const ctx = await moManGhi(page);
		const tatCa = (await phieuHomNay(page, ctx.kho, ctx.shopId)).data;
		expect(tatCa.length, 'Hôm nay chưa có phiếu nào để lọc').toBeGreaterThan(0);

		// 1. Khoảng thời gian: mặc định hôm nay (đã có start/end). 2. Nguồn thu = Nhân viên. 3. Thẻ Tiền mặt.
		await taiLaiBoi(page, async () => {
			await khung(page).locator('.ant-select').filter({ hasText: /Ch.*n ngu/ }).first().click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
				.nth(2).click();
		});
		const res = await taiLaiBoi(page, () =>
			khung(page).locator('.ant-tabs-tab').filter({ hasText: 'Tiền mặt' }).first().locator('.ant-tabs-tab-btn')
				.dispatchEvent('click'));
		const p = thamSo(res);
		expect(p.start_date && p.end_date, 'Mất điều kiện thời gian').toBeTruthy();
		expect(p.source_type, `Query: ${JSON.stringify(p)}`).toBe('STAFF');
		expect(p.payment_method).toBe('CASH');
		const kq = (await res.json()).data;
		const mongDoi = tatCa.filter((x) => x.sourceType === 'STAFF' && x.paymentMethod === 'CASH');
		expect(mongDoi.length, 'Không có phiếu nào thoả cả 3 điều kiện để đối chiếu').toBeGreaterThan(0);
		expect(kq.every((x) => x.sourceType === 'STAFF' && x.paymentMethod === 'CASH'), 'Có phiếu không thoả điều kiện').toBe(true);
		expect((await res.json()).page.total_elements).toBe(mongDoi.length);
	});

	test('26_070_001 — Cấp trên xem được phiếu của cấp dưới trực thuộc', async ({ page, browser }) => {
		chanNeuTat('26_070_001');
		const ctx = await moManGhi(page);
		const p = await phieuTM(page, ctx);
		expect(p, 'Không còn phiếu AUTOTEST_26_TM ở điểm bán (020_001 chưa tạo?)').toBeTruthy();

		// Mở màn bằng vai province trong CONTEXT RIÊNG (phiên riêng), 🚫 không đăng xuất giữa chừng.
		const c = await browser.newContext({ storageState: storageStateFor('province') });
		try {
			const tp = await c.newPage();
			const goi = [];
			tp.on('response', (r) => { if (r.url().includes(API)) goi.push(r); });
			await moTrang(tp, ROUTE, 'province');
			await expect(tp.locator('.ant-page-header-heading-title').first()).toHaveText('Quản lý phiếu thu');
			await tp.waitForTimeout(8_000);
			expect(
				goi.length,
				'Vai cấp tỉnh mở màn Quản lý phiếu thu mà app KHÔNG gọi danh sách phiếu lần nào ' +
					'(màn trống) ⇒ không xem được phiếu của điểm bán trực thuộc',
			).toBeGreaterThan(0);
			await expect(dongCua(tp, p.orderNumber), `Cấp tỉnh không thấy phiếu ${p.orderNumber} của điểm bán`)
				.toHaveCount(1);
		} finally {
			await c.close();
		}
	});

	test('26_030_001 — Chi tiết phiếu thu là màn chỉ đọc', async ({ page }) => {
		chanNeuTat('26_030_001');
		const ctx = await moManGhi(page);
		const p = await phieuTM(page, ctx);
		expect(p, 'Không còn phiếu AUTOTEST_26_TM').toBeTruthy();
		await (await timDong(page, p.orderNumber)).getByRole('button', { name: 'edit' }).click();
		const ct = page.getByRole('dialog', { name: 'Chi tiết phiếu thu tiền' });
		await expect(ct).toContainText(p.orderNumber);
		for (const khoi of ['Thông tin phiếu thu', 'Thông tin tiền thu', 'Thông tin khác']) {
			await expect(ct.locator('.font-medium').filter({ hasText: khoi }), `Thiếu khối "${khoi}"`).toHaveCount(1);
		}
		await expect(ct.locator('.ant-drawer-body').locator('input, textarea, .ant-select'), 'Màn chi tiết có ô nhập được')
			.toHaveCount(0);
		await expect(ct.getByRole('button', { name: 'Chỉnh sửa' })).toBeVisible();
	});

	test('26_030_002 — Cửa hàng và Nhân viên tạo phiếu không sửa được', async ({ page }) => {
		chanNeuTat('26_030_002');
		const ctx = await moManGhi(page);
		const p = await phieuTM(page, ctx);
		expect(p, 'Không còn phiếu AUTOTEST_26_TM').toBeTruthy();
		await (await timDong(page, p.orderNumber)).getByRole('button', { name: 'edit' }).click();
		await page.getByRole('dialog', { name: 'Chi tiết phiếu thu tiền' }).getByRole('button', { name: 'Chỉnh sửa' }).click();
		const d = page.getByRole('dialog', { name: 'Phiếu thu tiền' });
		await expect(d.getByRole('button', { name: 'Cập nhật' })).toBeVisible();
		await expect(d.getByRole('combobox', { name: 'Cửa hàng' })).toBeDisabled();
		const oNv = d.locator('.ant-form-item').filter({ has: page.locator('label', { hasText: 'Nhân viên tạo phiếu' }) });
		await expect(oNv.getByRole('combobox')).toBeDisabled();
		await expect(d.getByRole('spinbutton', { name: 'Số tiền cần thu' }), 'Đối chứng: ô số tiền phải sửa được').toBeEnabled();
	});

	test('26_030_003 — Sửa phiếu thu điều chỉnh lại ghi nhận quỹ', async ({ page }) => {
		chanNeuTat('26_030_003');
		const ctx = await moManGhi(page);
		const quy = await quyTienMat(page, ctx.kho, ctx.shopId);
		const p = await phieuTM(page, ctx);
		expect(p, 'Không còn phiếu AUTOTEST_26_TM').toBeTruthy();
		const soCu = p.totalAmount;
		const moi = soCu === SO_TIEN_MOI ? SO_TIEN : SO_TIEN_MOI;
		const quyTruoc = await tongThuQuy(page, ctx.kho, ctx.shopId, quy.fundId);
		const tongTruoc = (await phieuHomNay(page, ctx.kho, ctx.shopId)).extraData.sumReceipt;

		await (await timDong(page, p.orderNumber)).getByRole('button', { name: 'edit' }).click();
		await page.getByRole('dialog', { name: 'Chi tiết phiếu thu tiền' }).getByRole('button', { name: 'Chỉnh sửa' }).click();
		const d = page.getByRole('dialog', { name: 'Phiếu thu tiền' });
		const o = d.getByRole('spinbutton', { name: 'Số tiền cần thu' });
		await o.fill(String(moi));
		const cho = page.waitForResponse((r) => r.url().includes('/expenses/update-receipts/v2'));
		await d.getByRole('button', { name: 'Cập nhật' }).click();
		const body = await (await cho).json();
		expect(String(body?.status?.code), JSON.stringify(body?.status)).toBe('200');
		await expect(page.locator('.ant-message-notice').filter({ hasText: /^Thành công$/ })).toBeVisible();

		const sau = cuaToi(await phieuHomNay(page, ctx.kho, ctx.shopId), GHI_CHU_TM)[0];
		expect(sau.totalAmount).toBe(moi);
		await expect
			.poll(() => tongThuQuy(page, ctx.kho, ctx.shopId, quy.fundId), {
				message: `Ghi nhận quỹ không điều chỉnh theo số tiền mới (${soCu} → ${moi})`, timeout: 30_000,
			})
			.toBe(quyTruoc - soCu + moi);
		const tongSau = (await phieuHomNay(page, ctx.kho, ctx.shopId)).extraData.sumReceipt;
		expect(tongSau).toBe(tongTruoc - soCu + moi);
		await page.reload();
		const chuTong = chuan(await khung(page).locator('.main-content .flexbox--right').innerText());
		expect(Number(chuTong.replace(/\D/g, '')), `Dòng Tổng tiền thu: "${chuTong}"`).toBe(tongSau);
	});

	test('26_040_001 — Xoá phiếu thu hỏi xác nhận không hoàn tác', async ({ page }) => {
		chanNeuTat('26_040_001');
		const ctx = await moManGhi(page);
		const p = await phieuTM(page, ctx);
		expect(p, 'Không còn phiếu AUTOTEST_26_TM').toBeTruthy();
		await (await timDong(page, p.orderNumber)).getByRole('button', { name: 'close' }).click();
		const hoi = page.getByRole('tooltip').filter({ has: page.getByRole('button', { name: 'Đồng ý' }) });
		await expect(hoi).toBeVisible();
		expect(chuan(await hoi.innerText())).toContain('Hành động này sẽ không thể hoàn tác, bạn có chắc chắn muốn xóa?');
		await expect(hoi.getByRole('button', { name: 'Đồng ý' })).toBeVisible();
		await hoi.getByRole('button', { name: 'Hủy' }).click();
		await expect(hoi).toBeHidden();
		expect(cuaToi(await phieuHomNay(page, ctx.kho, ctx.shopId), GHI_CHU_TM).length, 'Bấm Hủy mà phiếu vẫn bị xoá').toBe(1);
	});

	test('26_040_002 — Xoá phiếu thu huỷ luôn ghi nhận quỹ', async ({ page }) => {
		chanNeuTat('26_040_002');
		const ctx = await moManGhi(page);
		const quy = await quyTienMat(page, ctx.kho, ctx.shopId);
		const p = await phieuTM(page, ctx);
		expect(p, 'Không còn phiếu AUTOTEST_26_TM').toBeTruthy();
		const quyTruoc = await tongThuQuy(page, ctx.kho, ctx.shopId, quy.fundId);
		const tongTruoc = (await phieuHomNay(page, ctx.kho, ctx.shopId)).extraData.sumReceipt;

		await (await timDong(page, p.orderNumber)).getByRole('button', { name: 'close' }).click();
		const hoi = page.getByRole('tooltip').filter({ has: page.getByRole('button', { name: 'Đồng ý' }) });
		await hoi.getByRole('button', { name: 'Đồng ý' }).click();
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Xóa thành công' })).toBeVisible();
		await expect(dongCua(page, p.orderNumber)).toHaveCount(0);

		const ds = await phieuHomNay(page, ctx.kho, ctx.shopId);
		expect(cuaToi(ds, GHI_CHU_TM).length).toBe(0);
		expect(ds.extraData.sumReceipt, 'Tổng tiền thu không trừ phiếu đã xoá').toBe(tongTruoc - p.totalAmount);
		await expect
			.poll(() => tongThuQuy(page, ctx.kho, ctx.shopId, quy.fundId), {
				message: `Số dư/ghi nhận quỹ không GIẢM ${p.totalAmount} sau khi xoá`, timeout: 30_000,
			})
			.toBe(quyTruoc - p.totalAmount);
	});

	test('26_050_004 — Danh mục mặc định của hệ thống không xoá được', async ({ page }) => {
		chanNeuTat('26_050_004');
		await moManGhi(page);
		const dm = await moDanhMuc(page);
		const heThong = dm.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: 'Chưa phân loại' });
		const nut = heThong.getByRole('button', { name: 'close' });
		await expect(
			nut,
			'Nút xoá danh mục mặc định bị MỜ (disabled) ⇒ không bấm được "Đồng ý" để nhận thông báo ' +
				'"Truyền sai tham số" như kịch bản',
		).toBeEnabled({ timeout: 5_000 });
		await nut.click();
		await page.getByRole('tooltip').getByRole('button', { name: 'Đồng ý' }).click();
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Truyền sai tham số' })).toBeVisible();
	});

	test('26_DON — Dọn dữ liệu AUTOTEST_26 (phiếu + danh mục)', async ({ page }) => {
		const ctx = await moManGhi(page);
		const con = cuaToi(await phieuHomNay(page, ctx.kho, ctx.shopId), TIEN_TO);
		for (const p of con) {
			const r = await xoaPhieuApi(page, ctx, p.orderId);
			expect(String(r.body?.status?.code), `Xoá ${p.orderNumber}: ${JSON.stringify(r.body?.status)}`).toBe('200');
		}
		expect(cuaToi(await phieuHomNay(page, ctx.kho, ctx.shopId), TIEN_TO)).toEqual([]);

		const r = await goiApi(page, ctx.kho, 'GET', '/expenses/get-receipt-options', {
			params: { shopId: ctx.shopId, typeOption: 'RECEIPTS' },
		});
		for (const c of (r.body?.data ?? []).filter((x) => (x.text ?? '').startsWith(TIEN_TO))) {
			const x = await goiApi(page, ctx.kho, 'DELETE', '/expenses/delete-receipt-options', {
				params: { shopId: ctx.shopId, cateId: c.id },
			});
			expect(String(x.body?.status?.code), `Xoá danh mục ${c.text}: ${JSON.stringify(x.body?.status)}`).toBe('200');
		}
		const sau = await goiApi(page, ctx.kho, 'GET', '/expenses/get-receipt-options', {
			params: { shopId: ctx.shopId, typeOption: 'RECEIPTS' },
		});
		expect((sau.body?.data ?? []).filter((x) => (x.text ?? '').startsWith(TIEN_TO))).toEqual([]);
	});
});
