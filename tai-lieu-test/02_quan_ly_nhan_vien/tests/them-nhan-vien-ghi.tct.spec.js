'use strict';

/**
 * Task 020 — phần **GHI DỮ LIỆU THẬT**.
 *
 * 🔴 Tạo nhân viên ở đây là tạo **TÀI KHOẢN ĐĂNG NHẬP thật** (`username` là khoá đăng nhập) cộng
 * **phân quyền thật vào đơn vị thật**. Nhân viên rác không chỉ bẩn danh sách — nó là một người
 * dùng CÓ QUYỀN trong hệ thống, và màn này 🚫 KHÔNG có chức năng xoá để dọn lại.
 *
 * ⇒ Mọi case trong file giữ `allowMutation: false` trong `test-input.json` và sẽ **skip có lý do**.
 * 🚫 Không tự bật, 🚫 không "chạy thử một lần cho biết". Chỉ mở khi user nói rõ đang trỏ môi trường
 * được phép ghi.
 *
 * Script vẫn viết đủ để lúc được phép là chạy được ngay, và để báo cáo phân biệt rõ
 * *"chưa chạy vì chặn ghi"* với *"chưa ai viết"*.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

/** 🔴 `test-input.json` nằm ở GỐC phân hệ, không phải trong `tests/`. */
const GOC = path.join(__dirname, '..');
const {
	chuan,
	dienDongVaiTro,
	dong,
	moDanhSach,
	moDrawerThem,
	oDonViVaiTro,
	themDongVaiTro,
	timKiem,
	tongSo,
} = require('./employee-page');

const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const stt = () => Date.now().toString().slice(-8);

/** Chờ đúng response tạo nhân viên. 🔴 Đăng ký TRƯỚC khi bấm Lưu. */
const choTao = (page) =>
	page.waitForResponse(
		(r) => r.request().method() === 'POST' && r.url().includes('/v1.2/create'),
		{ timeout: 120_000 },
	);

/** Điền toàn bộ phần thông tin bắt buộc bằng dữ liệu của case. */
async function dienHoSo(dr, data, { ma, sdt } = {}) {
	const n = stt();
	await dr.locator('#employeeCode').fill(ma ?? `${data.employeeCodePrefix}${n}`);
	await dr.locator('#username').fill(`nvauto${n}`);
	await dr.locator('#name').fill(`${data.namePrefix} ${n}`);
	await dr.locator('#phone').fill(sdt ?? `09${n}`);
	return { ma: await dr.locator('#employeeCode').inputValue(), ten: await dr.locator('#name').inputValue() };
}

test.describe('02 · 020 — Thêm nhân viên (GHI DỮ LIỆU)', () => {
	test.describe.configure({ mode: 'serial' });

	test.beforeEach(async ({ page }) => {
		await moDanhSach(page, VAI);
	});

	test('02_020_001 — Thêm mới nhân viên thành công', async ({ page }) => {
		const i = chanNeuTat('02_020_001');

		const dr = await moDrawerThem(page);
		const { ma } = await dienHoSo(dr, i.data);
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: i.data.roleName });

		const cho = choTao(page);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		const res = await cho;
		expect(String((await res.json())?.status?.code)).toBe('200');

		await expect(page.getByText('Thêm thành công', { exact: true })).toBeVisible({
			timeout: 20_000,
		});
		await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 20_000 });

		await timKiem(page, ma);
		expect(await dong(page).count(), `Không tìm thấy nhân viên vừa tạo "${ma}"`).toBe(1);
		expect(chuan(await dong(page).first().locator('td').nth(6).innerText())).toBe('Kích hoạt');

		await dong(page).first().locator('.ant-table-row-expand-icon').click();
		await page.waitForTimeout(1_200);
		const con = page.locator('.ant-table-expanded-row .ant-table-tbody tr').first();
		expect(chuan(await con.locator('td').nth(0).innerText())).toBe(i.data.roleName);
	});

	test('02_020_003 — Thêm trùng mã nhân viên', async ({ page }) => {
		const i = chanNeuTat('02_020_003');

		const tongTruoc = await tongSo(page);
		const dr = await moDrawerThem(page);
		await dienHoSo(dr, i.data, { ma: i.data.employeeCodeTonTai });
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: i.data.roleName });

		const cho = choTao(page);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		const res = await cho;

		// 🔴 FE KHÔNG kiểm trùng mã — quyết định hoàn toàn ở backend.
		expect(String((await res.json())?.status?.code)).not.toBe('200');
		await expect(page.locator('.ant-message-error')).toContainText(/đã tồn tại/i, {
			timeout: 20_000,
		});
		await expect(page.locator('.ant-drawer-open')).toHaveCount(1);

		await page.reload();
		await moDanhSach(page, VAI);
		expect(await tongSo(page), 'Trùng mã mà vẫn tạo được bản ghi').toBe(tongTruoc);
	});

	test('02_020_006 — Bỏ trống toàn bộ ô KHÔNG bắt buộc vẫn lưu được', async ({ page }) => {
		const i = chanNeuTat('02_020_006');

		const dr = await moDrawerThem(page);
		const { ma } = await dienHoSo(dr, i.data);
		// 🚫 Không chạm Căn cước / Ngày bắt đầu / Chi nhánh trả lương / Giới tính / Ngày sinh /
		//    Địa chỉ / Chức danh — đó chính là điều case này kiểm.
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: i.data.roleName });

		const cho = choTao(page);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		await expect(page.getByText('Thêm thành công', { exact: true })).toBeVisible({
			timeout: 20_000,
		});

		await timKiem(page, ma);
		expect(await dong(page).count()).toBe(1);
		// Ô bỏ trống phải hiện "—", 🚫 không "null".
		expect(chuan(await dong(page).first().locator('td').nth(3).innerText())).toBe('—');
	});

	test('02_020_014 — Mã nhân viên nhập toàn khoảng trắng', async ({ page }) => {
		const i = chanNeuTat('02_020_014');
		const dr = await moDrawerThem(page);
		await dienHoSo(dr, i.data, { ma: '     ' });
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: i.data.roleName });
		const cho = choTao(page).catch(() => null);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		const res = await Promise.race([cho, page.waitForTimeout(8_000).then(() => null)]);
		const b = res ? await res.json().catch(() => null) : null;
		const loi = chuan((await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).join(' | '));
		test.info().annotations.push({ type: 'đo', description: `mã "     ": ${res ? `gửi request → ${JSON.stringify(b?.status)}` : 'FE không gửi'} · lỗi form "${loi}"` });
		expect(String(b?.status?.code ?? 'FE chặn'), '🔴 Mã nhân viên toàn khoảng trắng vẫn tạo được nhân viên').not.toBe('200');
	});

	test('02_020_015 — Chi nhánh trả lương chọn rồi xoá vẫn lưu được', async ({ page }) => {
		const i = chanNeuTat('02_020_015');

		const dr = await moDrawerThem(page);
		const { ma } = await dienHoSo(dr, i.data);

		// Chọn rồi xoá lại ô Chi nhánh trả lương — `.ant-tree-select` nth(0) của drawer.
		const oLuong = dr.locator('.ant-tree-select').first();
		const { chonDonVi } = require('./employee-page');
		await chonDonVi(page, oLuong, i.data.orgUnitName);
		await oLuong.hover();
		await oLuong.locator('.ant-select-clear').click({ force: true });
		await page.waitForTimeout(500);

		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: i.data.roleName });

		const cho = choTao(page);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		expect(
			String((await (await cho).json())?.status?.code),
			'Bỏ trống Chi nhánh trả lương bị chặn — trái với rule hiện tại (không bắt buộc)',
		).toBe('200');
		await timKiem(page, ma);
		expect(await dong(page).count()).toBe(1);
	});

	test('02_020_023 — Thêm nhân viên trùng số điện thoại', async ({ page }) => {
		const i = chanNeuTat('02_020_023');

		const tongTruoc = await tongSo(page);
		const dr = await moDrawerThem(page);
		await dienHoSo(dr, i.data, { sdt: i.data.phoneTonTai });
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: i.data.roleName });

		const cho = choTao(page);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		const res = await cho;

		expect(
			String((await res.json())?.status?.code),
			'Trùng số điện thoại mà backend vẫn tạo được',
		).not.toBe('200');
		await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 20_000 });
		// 🔴 Ghi lại nguyên văn thông báo thật để chốt kỳ vọng (sheet QC đoán "Số điện thoại đã tồn tại").
		console.log(
			'02_020_023 — thông báo thật:',
			chuan(await page.locator('.ant-message-error').innerText()),
		);

		await page.reload();
		await moDanhSach(page, VAI);
		expect(await tongSo(page)).toBe(tongTruoc);
	});

	test('02_020_024 — Thêm nhân viên làm việc ở nhiều đơn vị và nhiều vai trò', async ({ page }) => {
		const i = chanNeuTat('02_020_024');

		const dr = await moDrawerThem(page);
		const { ma } = await dienHoSo(dr, i.data);

		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: i.data.roleName, dong: 0 });

		await themDongVaiTro(dr);
		// Dòng 2: đơn vị khác nếu cây có, vai trò khác trên cùng cây.
		await oDonViVaiTro(dr, 1).click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nut = dd.locator('.ant-select-tree-node-content-wrapper');
		if ((await nut.count()) < 2) {
			await page.keyboard.press('Escape');
			test.skip(true, 'Cây tổ chức chỉ có 1 nút — không dựng được phân công ở đơn vị thứ hai.');
		}
		await nut.nth(1).click();
		await page.waitForTimeout(1_000);
		const { chonOption, nhanCacOption } = require('./employee-page');
		const vaiTro2 = await nhanCacOption(page, dr.locator('#roles_1_roleId'));
		expect(vaiTro2.length).toBeGreaterThan(0);
		await chonOption(page, dr.locator('#roles_1_roleId'), vaiTro2[0]);
		await chonOption(page, dr.locator('#roles_1_status'), 'Đang làm');

		const cho = choTao(page);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		// 🔴 Nguyên văn "Thêm thành công" — 🚫 KHÔNG phải "Thêm mới thành công" như sheet QC ghi.
		await expect(page.getByText('Thêm thành công', { exact: true })).toBeVisible({
			timeout: 20_000,
		});

		await timKiem(page, ma);
		await dong(page).first().locator('.ant-table-row-expand-icon').click();
		await page.waitForTimeout(1_200);
		const dongCon = page.locator('.ant-table-expanded-row .ant-table-tbody tr.ant-table-row');
		expect(await dongCon.count(), 'Không ghi đủ 2 phân công').toBe(2);
		for (let k = 0; k < 2; k += 1) {
			expect(chuan(await dongCon.nth(k).locator('td').nth(2).innerText())).toBe('Đang làm');
		}
	});

	test('02_020_025 — Thêm nhân viên trùng ĐƠN VỊ nhưng khác vai trò', async ({ page }) => {
		const i = chanNeuTat('02_020_025');
		// Kỳ vọng kịch bản (theo phân hệ 01): cùng đơn vị + KHÁC vai trò là hợp lệ. Sheet QC FUNC_NHANVIEN__19 đòi chặn — ghi báo cáo.
		const dr = await moDrawerThem(page);
		const { ma } = await dienHoSo(dr, i.data);
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: i.data.roleName });
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: 'Quản lý cung ứng', dong: 1 });
		const cho = choTao(page).catch(() => null);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		const res = await Promise.race([cho, page.waitForTimeout(10_000).then(() => null)]);
		const b = res ? await res.json().catch(() => null) : null;
		const loi = chuan((await dr.locator('.ant-form-item-explain-error, .ant-message-notice').allInnerTexts().catch(() => [])).join(' | '));
		test.info().annotations.push({ type: 'đo', description: `${ma}: ${i.data.orgUnitName} × [${i.data.roleName}, Quản lý cung ứng] ⇒ ${res ? JSON.stringify(b?.status) : 'FE không gửi'} · lỗi "${loi}"` });
		expect(String(b?.status?.code), 'Cùng đơn vị khác vai trò bị chặn').toBe('200');
		await timKiem(page, ma);
		await dong(page).first().locator('.ant-table-row-expand-icon').click();
		await page.waitForTimeout(1_200);
		const vt = (await page.locator('.ant-table-expanded-row .ant-table-tbody tr').allInnerTexts()).map(chuan).join(' | ');
		expect(vt).toContain(i.data.roleName);
		expect(vt).toContain('Quản lý cung ứng');
	});

	test('02_020_026 — Thêm nhân viên trùng cả đơn vị và vai trò', async ({ page }) => {
		const i = chanNeuTat('02_020_026');
		const tongTruoc = await tongSo(page);
		const dr = await moDrawerThem(page);
		await dienHoSo(dr, i.data);
		for (let n = 0; n < 2; n += 1) {
			await themDongVaiTro(dr);
			await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: i.data.roleName, dong: n });
		}
		const cho = choTao(page).catch(() => null);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		const res = await Promise.race([cho, page.waitForTimeout(10_000).then(() => null)]);
		const b = res ? await res.json().catch(() => null) : null;
		const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])).join(' | ') + ' ' + (await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).join(' | '));
		test.info().annotations.push({ type: 'đo', description: `2 dòng ${i.data.orgUnitName} × ${i.data.roleName}: ${res ? JSON.stringify(b?.status) : 'FE không gửi'} · thông báo "${tb}"` });
		expect(String(b?.status?.code ?? 'FE chặn'), '🔴 Trùng cả đơn vị lẫn vai trò vẫn tạo được').not.toBe('200');
		await page.reload();
		await moDanhSach(page, VAI);
		expect(await tongSo(page), 'Bị chặn mà vẫn sinh bản ghi').toBe(tongTruoc);
	});

	test('02_020_028 — Tên nhân viên nhập toàn khoảng trắng', async ({ page }) => {
		const i = chanNeuTat('02_020_028');
		const dr = await moDrawerThem(page);
		await dienHoSo(dr, i.data);
		await dr.locator('#name').fill('          ');
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: i.data.roleName });
		const cho = choTao(page).catch(() => null);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		const res = await Promise.race([cho, page.waitForTimeout(8_000).then(() => null)]);
		const b = res ? await res.json().catch(() => null) : null;
		const loi = chuan((await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).join(' | '));
		test.info().annotations.push({ type: 'đo', description: `tên 10 dấu cách: ${res ? `gửi request → ${JSON.stringify(b?.status)}` : 'FE không gửi'} · lỗi form "${loi}"` });
		expect(String(b?.status?.code ?? 'FE chặn'), '🔴 Tên nhân viên toàn khoảng trắng vẫn tạo được').not.toBe('200');
	});

	test('02_020_030 — Sau khi thêm thành công thì tổng nhân viên tăng 1 và tìm được ngay', async ({
		page,
	}) => {
		const i = chanNeuTat('02_020_030');

		const tongTruoc = await tongSo(page);
		const dr = await moDrawerThem(page);
		const { ten } = await dienHoSo(dr, i.data);
		await themDongVaiTro(dr);
		await dienDongVaiTro(page, dr, { donVi: i.data.orgUnitName, vaiTro: i.data.roleName });

		const cho = choTao(page);
		await dr.getByRole('button', { name: 'Lưu' }).click();
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		await expect(page.getByText('Thêm thành công', { exact: true })).toBeVisible({
			timeout: 20_000,
		});
		await page.waitForTimeout(2_000);

		// 🔴 KHÔNG tải lại trang — màn phải tự `setReload`.
		expect(await tongSo(page), 'Tổng không tăng đúng 1 sau khi tạo').toBe(tongTruoc + 1);

		await timKiem(page, ten);
		expect(await dong(page).count()).toBe(1);
		expect(chuan(await dong(page).first().locator('td').nth(6).innerText())).toBe('Kích hoạt');
	});
});
