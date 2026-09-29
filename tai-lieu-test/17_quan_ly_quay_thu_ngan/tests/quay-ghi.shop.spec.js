'use strict';

/**
 * Phân hệ 17 — Quầy thu ngân, phần GHI + validate (vai `shop`, điểm bán seed của làn).
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): `CashierCounterPage.jsx` + `ModalAddOrUpdateCounter.jsx`
 * (Modal, ô `#name` maxLength 255 · `#code` maxLength 100, rule `required` KHÔNG có `whitespace`) ·
 * BE `CashierCounterServiceImpl` (trùng mã/tên chỉ so với quầy ĐANG hoạt động, trim khi lưu).
 *
 * 🔴 Quầy không xoá cứng được ⇒ quầy test mang tiền tố `A<làn>Q…` và bị NGỪNG ở `finally`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const q = require('./quay-ghi');

const GOC = path.join(__dirname, '..');
const { chuan, khung, dong, modal } = q;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Mở modal Thêm quầy. */
async function moThem(page) {
	await khung(page).getByRole('button', { name: /Thêm quầy/ }).click();
	const box = modal(page);
	await expect(box.getByText('Thêm quầy thu ngân')).toBeVisible({ timeout: 15_000 });
	return box;
}

/** Mở modal Sửa của dòng quầy mang mã `ma`. */
async function moSua(page, ma) {
	const row = await q.dongQuay(page, ma);
	await expect(row, `Không thấy quầy ${ma} trong danh sách`).toBeVisible({ timeout: 15_000 });
	await row.getByRole('button', { name: 'Sửa' }).click();
	const box = modal(page);
	await expect(box.getByText('Cập nhật quầy thu ngân')).toBeVisible({ timeout: 15_000 });
	return box;
}

const bamOk = (box) => box.getByRole('button', { name: /OK|Đồng ý|Xác nhận/ }).last().click();
const bamHuy = (box) => box.getByRole('button', { name: /Cancel|Hủy|Huỷ/ }).last().click();

test.describe('17 — Quầy thu ngân: thêm / sửa / ngừng (ghi thật)', () => {
	test.describe.configure({ timeout: 180_000 });

	let ctx;
	const taoRa = [];

	test.beforeEach(async ({ page }) => {
		ctx = await q.moQuay(page);
	});

	test.afterEach(async ({ page }) => {
		if (taoRa.length && ctx) await q.donQuay(page, ctx.st, ctx.shopId, taoRa.splice(0));
	});

	/** Quầy test tạo bằng API, tự dọn. */
	async function quayTest(page, o) {
		const x = await q.taoQuayApi(page, ctx.st, ctx.shopId, o);
		taoRa.push(x.counterId);
		return x;
	}

	/** Nhận các quầy vừa tạo qua UI (theo mã) vào danh sách dọn. */
	async function nhanDon(page, ma) {
		for (const x of await q.dsQuay(page, ctx.st, ctx.shopId, ma)) {
			if (x.code === ma && x.active) taoRa.push(x.counterId);
		}
	}

	test('17_010_003 — Khai báo quầy thu ngân mới', async ({ page }) => {
		chanNeuTat('17_010_003');
		const ma = q.maMoi();
		const ten = `${ma} Quầy test`;
		const box = await moThem(page);
		await box.locator('#name').fill(ten);
		await box.locator('#code').fill(ma);
		const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/create'));
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		const body = await (await cho).json();
		await nhanDon(page, ma);
		expect(String(body?.status?.code), JSON.stringify(body?.status)).toBe('200');
		expect(tb).toContain('Tạo quầy thu ngân thành công');
		const row = await q.dongQuay(page, ma);
		await expect(row).toBeVisible();
		expect(chuan(await row.locator('td').nth(1).innerText())).toBe(ma);
		expect(chuan(await row.locator('td').nth(2).innerText())).toBe(ten);
		await expect(row.getByText('Đang hoạt động')).toBeVisible();
	});

	test('17_010_004 — Chặn khai mã quầy trùng trong cùng điểm bán', async ({ page }) => {
		chanNeuTat('17_010_004');
		const a = await quayTest(page);
		const box = await moThem(page);
		await box.locator('#name').fill(`${a.code} ban sao khac ten`);
		await box.locator('#code').fill(a.code);
		const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/create'));
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		const body = await (await cho).json();
		await nhanDon(page, a.code);
		expect(q.boMa(body?.status?.message)).toBe('Mã quầy thu ngân đã tồn tại');
		expect(tb).toContain('Mã quầy thu ngân đã tồn tại');
		const cung = (await q.dsQuay(page, ctx.st, ctx.shopId, a.code)).filter((x) => x.code === a.code);
		expect(cung.length, 'Quầy trùng mã vẫn được tạo').toBe(1);
	});

	test('17_010_021 — Chặn khai mã quầy trùng trong cùng điểm bán', async ({ page }) => {
		chanNeuTat('17_010_021');
		const a = await quayTest(page);
		const box = await moThem(page);
		await box.locator('#name').fill(`${a.code} ban sao khac ten`);
		await box.locator('#code').fill(a.code);
		const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/create'));
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		const body = await (await cho).json();
		await nhanDon(page, a.code);
		expect(q.boMa(body?.status?.message)).toBe('Mã quầy thu ngân đã tồn tại');
		expect(tb).toContain('Mã quầy thu ngân đã tồn tại');
		const cung = (await q.dsQuay(page, ctx.st, ctx.shopId, a.code)).filter((x) => x.code === a.code);
		expect(cung.length, 'Quầy trùng mã vẫn được tạo').toBe(1);
	});

	test('17_010_005 — Chặn thêm quầy khi bỏ trống cả Tên quầy và Mã quầy', async ({ page }) => {
		chanNeuTat('17_010_005');
		const ghi = q.demGhi(page);
		const box = await moThem(page);
		await bamOk(box);
		await expect(q.loiO(box, 'Tên quầy')).toHaveText('Vui lòng nhập tên quầy');
		await expect(q.loiO(box, 'Mã quầy')).toHaveText('Vui lòng nhập mã quầy');
		expect(ghi).toEqual([]);
	});

	test('17_010_006 — Bỏ trống Tên quầy bị chặn', async ({ page }) => {
		chanNeuTat('17_010_006');
		const ghi = q.demGhi(page);
		const box = await moThem(page);
		await box.locator('#code').fill(q.maMoi());
		await bamOk(box);
		await expect(q.loiO(box, 'Tên quầy')).toHaveText('Vui lòng nhập tên quầy');
		await expect(q.loiO(box, 'Mã quầy')).toHaveCount(0);
		await expect(box.locator('#name')).toHaveAttribute('aria-invalid', 'true');
		expect(ghi).toEqual([]);
	});

	test('17_010_017 — Bỏ trống Tên quầy bị chặn', async ({ page }) => {
		chanNeuTat('17_010_017');
		const ghi = q.demGhi(page);
		const box = await moThem(page);
		await box.locator('#code').fill(q.maMoi());
		await bamOk(box);
		await expect(q.loiO(box, 'Tên quầy')).toHaveText('Vui lòng nhập tên quầy');
		await expect(q.loiO(box, 'Mã quầy')).toHaveCount(0);
		await expect(box.locator('#name')).toHaveAttribute('aria-invalid', 'true');
		expect(ghi).toEqual([]);
	});

	test('17_010_007 — Bỏ trống Mã quầy bị chặn', async ({ page }) => {
		chanNeuTat('17_010_007');
		const ghi = q.demGhi(page);
		const box = await moThem(page);
		await box.locator('#name').fill(`${q.TIEN_TO} chi co ten`);
		await bamOk(box);
		await expect(q.loiO(box, 'Mã quầy')).toHaveText('Vui lòng nhập mã quầy');
		await expect(q.loiO(box, 'Tên quầy')).toHaveCount(0);
		expect(ghi).toEqual([]);
	});

	test('17_010_018 — Bỏ trống Mã quầy bị chặn', async ({ page }) => {
		chanNeuTat('17_010_018');
		const ghi = q.demGhi(page);
		const box = await moThem(page);
		await box.locator('#name').fill(`${q.TIEN_TO} chi co ten`);
		await bamOk(box);
		await expect(q.loiO(box, 'Mã quầy')).toHaveText('Vui lòng nhập mã quầy');
		await expect(q.loiO(box, 'Tên quầy')).toHaveCount(0);
		expect(ghi).toEqual([]);
	});

	test('17_010_008 — Chặn thêm quầy khi nhập toàn khoảng trắng', async ({ page }) => {
		chanNeuTat('17_010_008');
		const ghi = q.demGhi(page);
		const truoc = (await q.dsQuay(page, ctx.st, ctx.shopId)).map((x) => x.counterId);
		const box = await moThem(page);
		await box.locator('#name').fill('     ');
		await box.locator('#code').fill('   ');
		const tb = await q.thongBaoSau(page, () => bamOk(box), 4_000);
		// Dọn nếu hệ thống lỡ tạo quầy tên rỗng.
		const moi = (await q.dsQuay(page, ctx.st, ctx.shopId)).filter((x) => !truoc.includes(x.counterId));
		taoRa.push(...moi.map((x) => x.counterId));
		expect(moi, `Hệ thống TẠO quầy tên rỗng: ${JSON.stringify(moi)} · thông báo "${tb}"`).toEqual([]);
		await expect(q.loiO(box, 'Tên quầy'), `Không báo lỗi bắt buộc ở ô Tên quầy · request: ${ghi.join(', ')} · "${tb}"`).toHaveText(
			'Vui lòng nhập tên quầy',
		);
		await expect(q.loiO(box, 'Mã quầy')).toHaveText('Vui lòng nhập mã quầy');
	});

	test('17_010_009 — Tên quầy đúng 255 ký tự lưu được', async ({ page }) => {
		chanNeuTat('17_010_009');
		const ma = q.maMoi();
		const ten = `${ma} `.padEnd(255, 'x');
		const box = await moThem(page);
		await box.locator('#name').fill(ten);
		await box.locator('#code').fill(ma);
		const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/create'));
		await bamOk(box);
		const body = await (await cho).json();
		await nhanDon(page, ma);
		expect(String(body?.status?.code), JSON.stringify(body?.status)).toBe('200');
		const luu = (await q.dsQuay(page, ctx.st, ctx.shopId, ma)).find((x) => x.code === ma);
		expect(luu?.name?.length).toBe(255);
		expect(luu?.name).toBe(ten);
	});

	test('17_010_010 — Tên quầy 256 ký tự bị cắt còn 255', async ({ page }) => {
		chanNeuTat('17_010_010');
		const box = await moThem(page);
		await box.locator('#name').fill('T'.repeat(256));
		expect((await box.locator('#name').inputValue()).length).toBe(255);
		await expect(q.loiO(box, 'Tên quầy')).toHaveCount(0);
	});

	test('17_010_019 — Tên quầy 300 ký tự bị cắt còn 255', async ({ page }) => {
		chanNeuTat('17_010_019');
		const box = await moThem(page);
		await box.locator('#name').fill('T'.repeat(300));
		expect((await box.locator('#name').inputValue()).length).toBe(255);
		await expect(q.loiO(box, 'Tên quầy')).toHaveCount(0);
	});

	test('17_010_020 — Mã quầy vượt 100 ký tự bị cắt', async ({ page }) => {
		chanNeuTat('17_010_020');
		const box = await moThem(page);
		await box.locator('#code').fill('C'.repeat(150));
		expect((await box.locator('#code').inputValue()).length).toBe(100);
	});

	test('17_010_011 — Mã quầy đúng 100 ký tự lưu được, 101 ký tự bị chặn', async ({ page }) => {
		chanNeuTat('17_010_011');
		const ma = q.maMoi().padEnd(100, '0');
		const box = await moThem(page);
		await box.locator('#code').fill(`${ma}9`);
		expect(await box.locator('#code').inputValue()).toBe(ma);
		await box.locator('#name').fill(`${ma.slice(0, 12)} ma 100`);
		const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/create'));
		await bamOk(box);
		const body = await (await cho).json();
		await nhanDon(page, ma);
		expect(String(body?.status?.code), JSON.stringify(body?.status)).toBe('200');
		const luu = (await q.dsQuay(page, ctx.st, ctx.shopId, ma)).find((x) => x.code === ma);
		expect(luu?.code?.length).toBe(100);
	});

	test('17_010_012 — Trùng TÊN quầy trong cùng điểm bán bị chặn', async ({ page }) => {
		chanNeuTat('17_010_012');
		const a = await quayTest(page);
		const ma = q.maMoi();
		const box = await moThem(page);
		await box.locator('#name').fill(a.name.toUpperCase());
		await box.locator('#code').fill(ma);
		const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/create'));
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		const body = await (await cho).json();
		await nhanDon(page, ma);
		expect(q.boMa(body?.status?.message)).toBe('Tên quầy thu ngân đã tồn tại');
		expect(tb).toContain('Tên quầy thu ngân đã tồn tại');
	});

	test('17_010_013 — Trùng mã với quầy ĐÃ NGỪNG hoạt động vẫn cho phép', async ({ page }) => {
		chanNeuTat('17_010_013');
		const a = await quayTest(page);
		await q.ngungQuayApi(page, ctx.st, ctx.shopId, a.counterId);
		const box = await moThem(page);
		await box.locator('#name').fill(`${a.code} tai su dung ma`);
		await box.locator('#code').fill(a.code);
		const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/create'));
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		const body = await (await cho).json();
		await nhanDon(page, a.code);
		expect(String(body?.status?.code), JSON.stringify(body?.status)).toBe('200');
		expect(tb).toContain('Tạo quầy thu ngân thành công');
	});

	test('17_010_014 — Huỷ thêm quầy thì không lưu gì', async ({ page }) => {
		chanNeuTat('17_010_014');
		const ghi = q.demGhi(page);
		const ma = q.maMoi();
		const box = await moThem(page);
		await box.locator('#name').fill(`${ma} huy`);
		await box.locator('#code').fill(ma);
		await bamHuy(box);
		await expect(box).toBeHidden();
		expect(ghi).toEqual([]);
		expect((await q.dsQuay(page, ctx.st, ctx.shopId, ma)).length).toBe(0);
	});

	test('17_010_015 — Phân trang danh sách quầy thu ngân', async ({ page }) => {
		chanNeuTat('17_010_015');
		let tong = (await q.k.goiApi(page, ctx.st, '/cashier-counter/get-all', { shopId: ctx.shopId, page: 0, size: 1 })).page
			?.total_elements;
		for (let i = Number(tong || 0); i < 12; i += 1) await quayTest(page);
		await q.moQuay(page);
		tong = (await q.k.goiApi(page, ctx.st, '/cashier-counter/get-all', { shopId: ctx.shopId, page: 0, size: 1 })).page
			?.total_elements;
		expect(tong).toBeGreaterThan(10);
		const trang1 = (await dong(page).allInnerTexts()).map(chuan);
		expect(trang1.length).toBe(10);
		const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/get-all') && r.url().includes('page=1'));
		await khung(page).locator('.ant-pagination-item-2').click();
		await cho;
		await page.waitForTimeout(800);
		const trang2 = (await dong(page).allInnerTexts()).map(chuan);
		expect(trang2.length).toBe(Math.min(10, tong - 10));
		expect(trang2.filter((t) => trang1.includes(t)), 'Trang 2 lặp dòng của trang 1').toEqual([]);
		const cho2 = page.waitForResponse((r) => r.url().includes('/cashier-counter/get-all') && r.url().includes('size=20'));
		await khung(page).locator('.ant-pagination-options .ant-select').click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: '20' }).first().click();
		await cho2;
		await page.waitForTimeout(800);
		expect(await dong(page).count()).toBe(Math.min(20, tong));
	});

	test('17_020_002 — Cập nhật tên và mã quầy', async ({ page }) => {
		chanNeuTat('17_020_002');
		const a = await quayTest(page);
		const maMoi = q.maMoi();
		const box = await moSua(page, a.code);
		await box.locator('#name').fill(`${maMoi} da sua`);
		await box.locator('#code').fill(maMoi);
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		expect(tb).toContain('Cập nhật quầy thu ngân thành công');
		const row = await q.dongQuay(page, maMoi);
		await expect(row).toBeVisible();
		expect(chuan(await row.locator('td').nth(2).innerText())).toBe(`${maMoi} da sua`);
	});

	test('17_020_003 — Màn Sửa quầy nạp sẵn dữ liệu hiện tại', async ({ page }) => {
		chanNeuTat('17_020_003');
		const a = await quayTest(page);
		const box = await moSua(page, a.code);
		await expect(box.locator('#name')).toHaveValue(a.name);
		await expect(box.locator('#code')).toHaveValue(a.code);
	});

	test('17_020_004 — Chặn lưu khi xoá hết cả hai ô ở màn Sửa', async ({ page }) => {
		chanNeuTat('17_020_004');
		const a = await quayTest(page);
		const ghi = q.demGhi(page);
		const box = await moSua(page, a.code);
		await box.locator('#name').fill('');
		await box.locator('#code').fill('');
		await bamOk(box);
		await expect(q.loiO(box, 'Tên quầy')).toHaveText('Vui lòng nhập tên quầy');
		await expect(q.loiO(box, 'Mã quầy')).toHaveText('Vui lòng nhập mã quầy');
		expect(ghi).toEqual([]);
		const luu = (await q.dsQuay(page, ctx.st, ctx.shopId, a.code)).find((x) => x.counterId === a.counterId);
		expect([luu?.name, luu?.code]).toEqual([a.name, a.code]);
	});

	test('17_020_005 — Chặn sửa Mã quầy thành mã đã có của quầy khác', async ({ page }) => {
		chanNeuTat('17_020_005');
		const a = await quayTest(page);
		const b = await quayTest(page);
		const box = await moSua(page, b.code);
		await box.locator('#code').fill(a.code);
		const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/update'));
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		const body = await (await cho).json();
		expect(q.boMa(body?.status?.message)).toBe('Mã quầy thu ngân đã tồn tại');
		expect(tb).toContain('Mã quầy thu ngân đã tồn tại');
		const luu = (await q.dsQuay(page, ctx.st, ctx.shopId, b.code)).find((x) => x.counterId === b.counterId);
		expect(luu?.code).toBe(b.code);
	});

	test('17_020_013 — Sửa Tên quầy thành tên đã tồn tại bị chặn', async ({ page }) => {
		chanNeuTat('17_020_013');
		const a = await quayTest(page);
		const b = await quayTest(page);
		const box = await moSua(page, b.code);
		await box.locator('#name').fill(a.name);
		const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/update'));
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		const body = await (await cho).json();
		expect(q.boMa(body?.status?.message)).toBe('Tên quầy thu ngân đã tồn tại');
		expect(tb).toContain('Tên quầy thu ngân đã tồn tại');
		const luu = (await q.dsQuay(page, ctx.st, ctx.shopId, b.code)).find((x) => x.counterId === b.counterId);
		expect(luu?.name).toBe(b.name);
	});

	test('17_020_006 — Lưu khi không sửa gì thì không đổi dữ liệu', async ({ page }) => {
		chanNeuTat('17_020_006');
		const a = await quayTest(page);
		const box = await moSua(page, a.code);
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		expect(tb).toContain('Cập nhật quầy thu ngân thành công');
		const luu = (await q.dsQuay(page, ctx.st, ctx.shopId, a.code)).find((x) => x.counterId === a.counterId);
		expect([luu?.name, luu?.code, luu?.active]).toEqual([a.name, a.code, true]);
	});

	test('17_020_007 — Huỷ thao tác sửa thì giữ nguyên dữ liệu cũ', async ({ page }) => {
		chanNeuTat('17_020_007');
		const a = await quayTest(page);
		const ghi = q.demGhi(page);
		const box = await moSua(page, a.code);
		await box.locator('#name').fill(`${a.code} ten moi bi huy`);
		await bamHuy(box);
		await expect(box).toBeHidden();
		expect(ghi).toEqual([]);
		const row = await q.dongQuay(page, a.code);
		expect(chuan(await row.locator('td').nth(2).innerText())).toBe(a.name);
	});

	test('17_020_011 — Tìm quầy khi nhập toàn khoảng trắng', async ({ page }) => {
		chanNeuTat('17_020_011');
		const tong = (await q.k.goiApi(page, ctx.st, '/cashier-counter/get-all', { shopId: ctx.shopId, page: 0, size: 10 })).data
			.length;
		expect(tong, 'Điểm bán không có quầy nào để đối chiếu').toBeGreaterThan(0);
		await q.tim(page, '     ');
		await expect(khung(page).locator('.ant-empty')).toHaveCount(0);
		expect(await dong(page).count()).toBe(tong);
	});

	test('17_020_012 — Tìm quầy không phân biệt hoa thường và dấu', async ({ page }) => {
		chanNeuTat('17_020_012');
		const ma = q.maMoi();
		await quayTest(page, { ma, ten: `Quầy Tài chính ${ma}` });
		await q.tim(page, `quay tai chinh ${ma.toLowerCase()}`);
		await expect(
			dong(page).filter({ hasText: ma }),
			'Gõ không dấu/chữ thường không ra quầy "Quầy Tài chính …"',
		).toHaveCount(1);
	});

	test('17_030_001 — Ngừng hoạt động quầy', async ({ page }) => {
		chanNeuTat('17_030_001');
		const a = await quayTest(page);
		const row = await q.dongQuay(page, a.code);
		await row.getByRole('button', { name: 'Ngừng' }).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Xác nhận ngừng quầy?' });
		const cho = page.waitForResponse((r) => r.url().includes('/cashier-counter/delete'));
		const tb = await q.thongBaoSau(page, () => hop.getByRole('button', { name: 'Ngừng quầy' }).click());
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		expect(tb).toContain('Đã ngừng quầy thu ngân');
		await expect(row.getByText('Ngừng hoạt động')).toBeVisible();
		const active = (await q.k.goiApi(page, ctx.st, '/cashier-counter/active-list', { shopId: ctx.shopId })).data || [];
		expect(active.map((x) => x.counterId), 'Quầy đã ngừng vẫn nằm trong danh sách chọn khi mở ca').not.toContain(a.counterId);
		// `GET /fund/get-all` chỉ trả quỹ đang hoạt động ⇒ quỹ bị khoá phải VẮNG ở đó,
		// nhưng lịch sử/số dư quỹ vẫn đọc được theo `cashFundId`.
		const quy = (await q.dsQuy(page, ctx.st, ctx.shopId)).find((f) => f.counterId === a.counterId);
		expect(quy?.active ?? false, 'Quỹ tiền mặt của quầy vẫn hoạt động sau khi ngừng quầy').toBe(false);
		expect(a.cashFundId, 'Tạo quầy không trả cashFundId').toBeTruthy();
		const b = await q.k.goiApi(page, ctx.st, '/fund/get-history', {
			shopId: ctx.shopId, fundId: a.cashFundId, page: 0, size: 5,
			beginTime: Date.now() - 86400_000, endTime: Date.now() + 86400_000,
		});
		expect(String(b?.status?.code), 'Lịch sử quỹ của quầy đã ngừng không đọc được').toBe('200');
	});

	test('17_030_002 — Kích hoạt lại quầy đã ngừng', async ({ page }) => {
		chanNeuTat('17_030_002');
		const a = await quayTest(page);
		await q.ngungQuayApi(page, ctx.st, ctx.shopId, a.counterId);
		const row = await q.dongQuay(page, a.code);
		await row.getByRole('button', { name: 'Kích hoạt lại' }).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Kích hoạt lại quầy?' });
		const tb = await q.thongBaoSau(page, () => hop.getByRole('button', { name: 'Kích hoạt lại' }).click());
		expect(tb).toContain('Đã kích hoạt lại quầy thu ngân');
		await expect(row.getByText('Đang hoạt động')).toBeVisible();
		const active = (await q.k.goiApi(page, ctx.st, '/cashier-counter/active-list', { shopId: ctx.shopId })).data || [];
		expect(active.map((x) => x.counterId)).toContain(a.counterId);
		const quy = (await q.dsQuy(page, ctx.st, ctx.shopId)).find((f) => f.counterId === a.counterId);
		expect(quy?.active, 'Kích hoạt lại quầy mà quỹ tiền mặt không mở lại').toBe(true);
	});

	test('17_030_004 — Hộp xác nhận ngừng quầy nêu rõ hệ quả khoá quỹ', async ({ page }) => {
		chanNeuTat('17_030_004');
		const a = await quayTest(page);
		const row = await q.dongQuay(page, a.code);
		await row.getByRole('button', { name: 'Ngừng' }).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Xác nhận ngừng quầy?' });
		await expect(hop).toBeVisible();
		expect(chuan(await hop.innerText())).toContain(
			`Quầy "${a.name}" sẽ bị ngừng hoạt động và khóa quỹ tiền mặt tương ứng.`,
		);
		const nut = hop.getByRole('button', { name: 'Ngừng quầy' });
		await expect(nut).toHaveClass(/ant-btn-dangerous/);
		await expect(hop.getByRole('button', { name: 'Hủy' })).toBeVisible();
		await hop.getByRole('button', { name: 'Hủy' }).click();
	});

	test('17_030_005 — Hộp xác nhận kích hoạt lại nêu rõ mở lại quỹ', async ({ page }) => {
		chanNeuTat('17_030_005');
		const a = await quayTest(page);
		await q.ngungQuayApi(page, ctx.st, ctx.shopId, a.counterId);
		const row = await q.dongQuay(page, a.code);
		await row.getByRole('button', { name: 'Kích hoạt lại' }).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Kích hoạt lại quầy?' });
		await expect(hop).toBeVisible();
		expect(chuan(await hop.innerText())).toContain(
			`Quầy "${a.name}" sẽ hoạt động trở lại và mở lại quỹ tiền mặt tương ứng.`,
		);
		await expect(hop.getByRole('button', { name: 'Kích hoạt lại' })).toBeVisible();
		await hop.getByRole('button', { name: 'Hủy' }).click();
		await expect(row.getByText('Ngừng hoạt động')).toBeVisible();
	});

	test('17_030_006 — Đóng hộp xác nhận ngừng quầy không đổi gì', async ({ page }) => {
		chanNeuTat('17_030_006');
		const a = await quayTest(page);
		const ghi = q.demGhi(page);
		const row = await q.dongQuay(page, a.code);
		await row.getByRole('button', { name: 'Ngừng' }).click();
		const hop = page.getByRole('dialog').filter({ hasText: 'Xác nhận ngừng quầy?' });
		await hop.getByRole('button', { name: 'Hủy' }).click();
		await expect(hop).toBeHidden();
		expect(ghi).toEqual([]);
		await expect(row.getByText('Đang hoạt động')).toBeVisible();
	});

	test('17_030_007 — Quầy đã ngừng hiện đúng nhãn và đổi nút', async ({ page }) => {
		chanNeuTat('17_030_007');
		const a = await quayTest(page);
		const b = await quayTest(page);
		await q.ngungQuayApi(page, ctx.st, ctx.shopId, b.counterId);
		const rowA = await q.dongQuay(page, a.code);
		await expect(rowA.locator('.ant-tag-success')).toHaveText('Đang hoạt động');
		await expect(rowA.getByRole('button', { name: 'Ngừng' })).toBeVisible();
		const rowB = await q.dongQuay(page, b.code);
		const tag = rowB.locator('.ant-tag');
		await expect(tag).toHaveText('Ngừng hoạt động');
		await expect(tag).not.toHaveClass(/ant-tag-(success|error|processing|warning)/);
		await expect(rowB.getByRole('button', { name: 'Kích hoạt lại' })).toBeVisible();
		await expect(rowB.getByRole('button', { name: 'Ngừng', exact: true })).toHaveCount(0);
	});

	test('17_010_022 — Thiếu shopId khi gọi API tạo quầy bị chặn', async ({ page }) => {
		chanNeuTat('17_010_022');
		const ma = q.maMoi();
		const body = await q.k.goiGhi(page, ctx.st, 'POST', '/cashier-counter/create', {}, { name: `${ma} khong shop`, code: ma });
		if (String(body?.status?.code) === '200' && body?.data?.counterId) taoRa.push(body.data.counterId);
		expect(q.boMa(body?.status?.message), JSON.stringify(body?.status)).toBe('Thiếu shopId');
	});

	test('17_020_014 — Thiếu counterId khi gọi API sửa quầy bị chặn', async ({ page }) => {
		chanNeuTat('17_020_014');
		const body = await q.suaQuayApi(page, ctx.st, { shopId: ctx.shopId, name: `${q.TIEN_TO} x` });
		expect(q.boMa(body?.status?.message), JSON.stringify(body?.status)).toBe('Thiếu counterId');
	});

	test('17_020_015 — Sửa quầy không tồn tại bị chặn', async ({ page }) => {
		chanNeuTat('17_020_015');
		const body = await q.suaQuayApi(page, ctx.st, { counterId: 999999999, shopId: ctx.shopId, name: `${q.TIEN_TO} x` });
		expect(q.boMa(body?.status?.message), JSON.stringify(body?.status)).toBe('Quầy thu ngân không tồn tại');
	});
});
