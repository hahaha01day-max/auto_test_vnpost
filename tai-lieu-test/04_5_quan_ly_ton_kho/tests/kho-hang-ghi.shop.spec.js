'use strict';

/**
 * 04_5 · 020 — Quản lý kho hàng (GHI), vai `shop`, điểm bán seed của làn.
 *
 * Nguồn (vnpost-web af8cda07, `features/inventory/warehouse/ShopInventoryPage.jsx`):
 * - `/inventory/warehouses` — bảng "Mã kho · Tên kho · Địa chỉ · SĐT · Trạng thái · Hành động".
 * - Drawer "Thêm kho hàng" / "Sửa kho hàng": Tên kho (bắt buộc — "Vui lòng nhập tên kho"), Số điện
 *   thoại, Địa chỉ, Tỉnh/TP, Xã/Phường, "Kho mặc định" (Switch; khoá ở kho đang mặc định). Nút "Xác nhận".
 * - Cột Trạng thái là Switch (khoá ở kho mặc định đang bật): "Đã kích hoạt kho" / "Đã tắt kho".
 * - Xoá: Popconfirm "Xác nhận xóa kho hàng này?" → "Đồng ý" (khoá ở kho mặc định) → "Xóa kho thành công".
 * API: `GET/POST /shops/<id>/inventory`, `PUT …/<invId>`, `PUT …/<invId>/active`, `DELETE …/<invId>`.
 *
 * 🔴 Kho tạm của test mang tên `<PREFIX>KHO_T…` và được XOÁ ở cuối (`afterAll`); kho mặc định luôn
 *    được trả về kho gốc trước khi xoá.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const TIEN_TO = `${seed.PREFIX}KHO_T`;

async function moMan(page) {
	const st = k.batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/warehouses`, VAI);
	await expect(page.getByRole('button', { name: /Thêm kho/ })).toBeVisible({ timeout: 60_000 });
	await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 30_000 });
	return st;
}
const dsKho = async (page, st, shopId) => (await k.goiApi(page, st, `/shops/${shopId}/inventory`)).data || [];
/** Đặt lại kho mặc định bằng ĐÚNG payload FE gửi (gửi cả object kho thì BE bỏ qua `isDefault`). */
async function datMacDinh(page, st, shopId, kho) {
	const body = {
		name: kho.name, phone: kho.phone || '', address: kho.address || '',
		provinceId: kho.provinceId, provinceName: kho.provinceName || '', wardId: kho.wardId, wardName: kho.wardName || '',
		isDefault: true,
	};
	await k.goiGhi(page, st, 'PUT', `/shops/${shopId}/inventory/${kho.id}`, {}, body);
	const lai = (await dsKho(page, st, shopId)).find((x) => x.id === kho.id);
	expect(lai?.isDefault, `🔴 Không trả lại được kho mặc định ${kho.name} — điểm bán seed đang KHÔNG có kho mặc định`).toBe(true);
}
const dong = (page, ten) => page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ten }).first();

async function chonSelect(page, dr, id, ten) {
	await dr.locator(`#${id}`).click();
	await dr.locator(`#${id}`).fill(ten);
	await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: ten }).first().click();
}

/** Điền drawer rồi "Xác nhận"; chờ request ghi; trả body. */
async function luuDrawer(page, dr, method) {
	const cho = page.waitForResponse((r) => /\/shops\/\d+\/inventory/.test(r.url()) && r.request().method() === method, { timeout: 30_000 });
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	const b = await (await cho).json();
	expect(String(b?.status?.code), `${method} kho lỗi: ${b?.status?.message}`).toBe('200');
	await expect(dr).toBeHidden();
	return b;
}

test.describe('04_5 · 020 — Quản lý kho hàng (điểm bán seed)', () => {
	test.describe.configure({ timeout: 240_000 });
	const { shopId } = (() => { try { return k.duLieuSeed(); } catch { return {}; } })();

	test.afterAll(async ({ browser }) => {
		// Dọn: trả kho mặc định về kho gốc (kho tự sinh lúc tạo điểm bán), xoá mọi kho tạm.
		const p = await k.moPhienPhu(browser, VAI, '/inventory/warehouses');
		const ds = await dsKho(p.page, p.st, shopId);
		const goc = ds.slice().sort((a, b) => a.id - b.id)[0];
		if (goc && !goc.isDefault) await datMacDinh(p.page, p.st, shopId, goc);
		// 🚫 Không bao giờ xoá kho đang mặc định.
		for (const x of (await dsKho(p.page, p.st, shopId)).filter((y) => y.name.startsWith(TIEN_TO) && !y.isDefault)) {
			await k.goiGhi(p.page, p.st, 'DELETE', `/shops/${shopId}/inventory/${x.id}`);
		}
		await p.dong();
	});

	test('04_5_020_004 — Thêm kho với đầy đủ thông tin', async ({ page }) => {
		chanNeuTat('04_5_020_004');
		const st = await moMan(page);
		const goc = (await dsKho(page, st, shopId)).find((x) => x.isDefault);
		const ten = `${TIEN_TO}${Date.now().toString().slice(-6)}`;
		await page.getByRole('button', { name: /Thêm kho/ }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm kho hàng' }).last();
		await dr.locator('#name').fill(ten);
		await dr.locator('#phone').fill('0911222333');
		await dr.locator('#address').fill('AUTO TEST so 1 duong thu');
		await chonSelect(page, dr, 'province', goc.provinceName);
		await chonSelect(page, dr, 'ward', goc.wardName);
		await luuDrawer(page, dr, 'POST');
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Thêm kho thành công' }).first()).toBeAttached();
		const moi = (await dsKho(page, st, shopId)).find((x) => x.name === ten);
		expect(moi, 'Kho vừa thêm không có trong danh sách').toBeTruthy();
		expect([moi.phone, moi.address, moi.provinceName, moi.wardName, moi.isDefault]).toEqual(['0911222333', 'AUTO TEST so 1 duong thu', goc.provinceName, goc.wardName, false]);
		await expect(dong(page, ten), 'Kho mới không hiện trong bảng').toBeVisible();
		// Mở lại: form sửa hiện đủ thông tin.
		await dong(page, ten).locator('button').filter({ has: page.locator('.anticon-edit') }).click();
		const sua = page.locator('.ant-drawer-open').filter({ hasText: 'Sửa kho hàng' }).last();
		await expect(sua.locator('#name')).toHaveValue(ten);
		await expect(sua.locator('#phone')).toHaveValue('0911222333');
		await expect(sua.locator('#address')).toHaveValue('AUTO TEST so 1 duong thu');
		await expect(sua).toContainText(goc.provinceName);
		await expect(sua).toContainText(goc.wardName);
	});

	test('04_5_020_002 — Thêm mới kho hàng', async ({ page }) => {
		chanNeuTat('04_5_020_002');
		const st = await moMan(page);
		const ten = `${TIEN_TO}${Date.now().toString().slice(-6)}`;
		await page.getByRole('button', { name: /Thêm kho/ }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm kho hàng' }).last();
		await dr.locator('#name').fill(ten);
		await luuDrawer(page, dr, 'POST');
		await expect(dong(page, ten), 'Kho vừa thêm không hiện trong bảng').toBeVisible({ timeout: 20_000 });
		expect((await dsKho(page, st, shopId)).some((x) => x.name === ten)).toBe(true);
	});

	test('04_5_020_009 — Chỉnh sửa thông tin kho', async ({ page }) => {
		chanNeuTat('04_5_020_009');
		const st = await moMan(page);
		const tam = (await dsKho(page, st, shopId)).find((x) => x.name.startsWith(TIEN_TO));
		test.skip(!tam, 'Chưa có kho tạm — chạy 04_5_020_002 trước.');
		const tenMoi = `${TIEN_TO}${Date.now().toString().slice(-6)}S`;
		await dong(page, tam.name).locator('button').filter({ has: page.locator('.anticon-edit') }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Sửa kho hàng' }).last();
		await dr.locator('#name').fill(tenMoi);
		await dr.locator('#address').fill('AUTO TEST dia chi da sua');
		await luuDrawer(page, dr, 'PUT');
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Cập nhật kho thành công' }).first()).toBeAttached();
		const sau = (await dsKho(page, st, shopId)).find((x) => x.id === tam.id);
		expect([sau.name, sau.address]).toEqual([tenMoi, 'AUTO TEST dia chi da sua']);
	});

	test('04_5_020_007 — Bật / tắt kho', async ({ page }) => {
		chanNeuTat('04_5_020_007');
		const st = await moMan(page);
		const tam = (await dsKho(page, st, shopId)).find((x) => x.name.startsWith(TIEN_TO) && x.isActive !== false);
		test.skip(!tam, 'Chưa có kho tạm đang bật.');
		const sw = dong(page, tam.name).locator('.ant-switch');
		// 🔴 Đo 24/09/2026: kho vừa tạo có `isActive = null` ⇒ Switch hiện TẮT dù kho dùng được.
		const dau = (await sw.getAttribute('aria-checked')) === 'true';
		test.info().annotations.push({ type: 'đo', description: `kho tạm isActive=${tam.isActive}, switch=${dau}` });
		for (const bat of [!dau, dau || true]) {
			const chu = bat ? 'Đã kích hoạt kho' : 'Đã tắt kho';
			if (((await sw.getAttribute('aria-checked')) === 'true') === bat) continue;
			const cho = page.waitForResponse((r) => r.url().includes(`/inventory/${tam.id}/active`), { timeout: 30_000 });
			await sw.click();
			expect(String((await (await cho).json())?.status?.code)).toBe('200');
			await expect(page.locator('.ant-message-notice').filter({ hasText: chu }).first()).toBeAttached();
			await expect(sw).toHaveAttribute('aria-checked', String(bat));
			expect((await dsKho(page, st, shopId)).find((x) => x.id === tam.id).isActive, `API không phản ánh trạng thái ${bat}`).toBe(bat);
		}
		// Hai chiều đều đã đi qua: bật → tắt → bật.
		if (!dau) {
			for (const bat of [false, true]) {
				const cho = page.waitForResponse((r) => r.url().includes(`/inventory/${tam.id}/active`), { timeout: 30_000 });
				await sw.click();
				expect(String((await (await cho).json())?.status?.code)).toBe('200');
				await expect(sw).toHaveAttribute('aria-checked', String(bat));
			}
		}
	});

	test('04_5_020_006 — Chuyển đổi kho mặc định', async ({ page }) => {
		chanNeuTat('04_5_020_006');
		const st = await moMan(page);
		const ds = await dsKho(page, st, shopId);
		const cu = ds.find((x) => x.isDefault);
		const tam = ds.find((x) => x.name.startsWith(TIEN_TO) && x.isActive !== false);
		test.skip(!tam, 'Chưa có kho tạm.');
		await dong(page, tam.name).locator('button').filter({ has: page.locator('.anticon-edit') }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Sửa kho hàng' }).last();
		await dr.locator('.ant-form-item').filter({ hasText: 'Kho mặc định' }).locator('.ant-switch').click();
		await luuDrawer(page, dr, 'PUT');
		const sau = await dsKho(page, st, shopId);
		expect(sau.filter((x) => x.isDefault).map((x) => x.id), 'Không đúng MỘT kho mặc định là kho vừa chọn').toEqual([tam.id]);
		expect(sau.find((x) => x.id === cu.id).isDefault, 'Kho mặc định cũ không mất dấu').toBe(false);
		await expect(dong(page, tam.name)).toContainText('Mặc định');
		await expect(dong(page, cu.name)).not.toContainText('Mặc định');
		// Trả lại kho mặc định gốc (đổi kho mặc định ảnh hưởng mọi form lập phiếu).
		await dong(page, cu.name).locator('button').filter({ has: page.locator('.anticon-edit') }).click();
		const dr2 = page.locator('.ant-drawer-open').filter({ hasText: 'Sửa kho hàng' }).last();
		await dr2.locator('.ant-form-item').filter({ hasText: 'Kho mặc định' }).locator('.ant-switch').click();
		await luuDrawer(page, dr2, 'PUT');
		expect((await dsKho(page, st, shopId)).find((x) => x.isDefault)?.id, 'Không trả lại được kho mặc định gốc').toBe(cu.id);
	});

	test('04_5_020_003 — Thêm mới kho và chọn làm kho mặc định', async ({ page }) => {
		chanNeuTat('04_5_020_003');
		const st = await moMan(page);
		const cu = (await dsKho(page, st, shopId)).find((x) => x.isDefault);
		const ten = `${TIEN_TO}${Date.now().toString().slice(-6)}M`;
		await page.getByRole('button', { name: /Thêm kho/ }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm kho hàng' }).last();
		await dr.locator('#name').fill(ten);
		await dr.locator('.ant-form-item').filter({ hasText: 'Kho mặc định' }).locator('.ant-switch').click();
		try {
			await luuDrawer(page, dr, 'POST');
			const sau = await dsKho(page, st, shopId);
			const moi = sau.find((x) => x.name === ten);
			expect(moi?.isDefault, 'Kho mới không thành kho mặc định').toBe(true);
			expect(sau.filter((x) => x.isDefault).length, 'Có nhiều hơn một kho mặc định').toBe(1);
			expect(sau.find((x) => x.id === cu.id).isDefault, 'Kho mặc định cũ không bị bỏ cờ').toBe(false);
			await expect(dong(page, ten)).toContainText('Mặc định');
		} finally {
			await datMacDinh(page, st, shopId, cu);
		}
	});

	test('04_5_020_010 — Xoá kho vật lý', async ({ page }) => {
		chanNeuTat('04_5_020_010');
		const st = await moMan(page);
		const ds = await dsKho(page, st, shopId);
		const tam = ds.find((x) => x.name.startsWith(TIEN_TO) && !x.isDefault);
		test.skip(!tam, 'Chưa có kho tạm không mặc định.');
		// 1. Kho chưa phát sinh giao dịch ⇒ xoá được.
		await dong(page, tam.name).locator('button.ant-btn-dangerous').click();
		const pc = page.locator('.ant-popover:visible, .ant-popconfirm:visible').filter({ hasText: 'Xác nhận xóa kho hàng này?' }).last();
		const cho = page.waitForResponse((r) => r.url().includes(`/inventory/${tam.id}`) && r.request().method() === 'DELETE', { timeout: 30_000 });
		await pc.getByRole('button', { name: 'Đồng ý' }).click();
		expect(String((await (await cho).json())?.status?.code), 'Xoá kho chưa phát sinh giao dịch lỗi').toBe('200');
		await expect(page.locator('.ant-message-notice').filter({ hasText: 'Xóa kho thành công' }).first()).toBeAttached();
		expect((await dsKho(page, st, shopId)).some((x) => x.id === tam.id), 'Kho đã xoá vẫn còn').toBe(false);
		// 2. Kho ĐANG CÓ TỒN: ở điểm bán seed chỉ kho mặc định có tồn, và nút xoá của kho mặc định bị khoá.
		const macDinh = ds.find((x) => x.isDefault);
		await expect(dong(page, macDinh.name).locator('button.ant-btn-dangerous'), 'Kho mặc định (đang có tồn) vẫn bấm xoá được').toBeDisabled();
		test.info().annotations.push({ type: 'đo', description: 'Chưa có kho KHÔNG mặc định đang có tồn để thử xoá — phần "tồn đi đâu" chưa đo được.' });
	});
});
