'use strict';

/**
 * Bước 11 — CA LÀM VIỆC phủ gần cả ngày + LỊCH cho nhân viên điểm bán seed (vai `shop`).
 *
 * Vì sao: màn bán hàng chặn cứng "Yêu cầu mở ca trước khi bán hàng" (18_1_010_001), mà "Mở ca" chỉ có
 * khi nhân viên CÓ LỊCH ca hôm nay VÀ đang trong giờ ca. Điểm bán seed có sẵn Ca sáng 07:30–12:00 /
 * Ca chiều 13:00–19:00 (tự sinh lúc tạo điểm bán) nhưng CHƯA xếp lịch cho ai ⇒ "Chưa có ca làm việc
 * hôm nay". Chạy test ngoài giờ hai ca đó cũng không mở được ⇒ tạo thêm một ca dài.
 *
 * Nguồn (vnpost-web af8cda07): `pages/timekeeping/ShiftPage.jsx` (`/employee/shift`),
 * `pages/timekeeping/DrawerSchedule.jsx` (`/employee/schedule` → "Xếp lịch làm việc").
 * 🔴 TimePicker khoá giờ 0–4 (`disabledHours`) và bước phút 15 ⇒ ca dài nhất 05:00–23:45.
 *    Test chạy 00:00–05:00 vẫn KHÔNG mở ca được — không có cách nào qua FE.
 * 🔴 Ca mới trùng giờ với Ca sáng/chiều ⇒ FE hỏi xác nhận chồng ca (`confirmOverlap`) — bấm đồng ý.
 * 🔴 Chạy lẻ bước này phải `--no-deps`.
 */

const { test, expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const { doc, ghi, PREFIX } = require('../seed-state');

test.describe.configure({ mode: 'serial' });

const TEN_CA = `${PREFIX}CA_DAI`;

async function gioRange(page, o, [bd, kt]) {
	await o.click();
	const ins = o.locator('input');
	await ins.nth(0).fill(bd);
	await ins.nth(0).press('Enter');
	await ins.nth(1).fill(kt);
	await ins.nth(1).press('Enter');
}

test('seed 11.1 — tạo ca làm việc dài 05:00–23:45', async ({ page }) => {
	test.skip(Boolean(doc().duLieu?.caLamViec?.shiftId), 'Sổ seed đã có ca dài — 🚫 không tạo lại.');
	await moTrang(page, '/employee/shift', 'shop');
	const bang = page.locator('.ant-pro-page-container .ant-table-tbody');
	await expect(bang).toBeVisible({ timeout: 30_000 });
	if (await bang.getByText(TEN_CA, { exact: true }).count()) {
		test.info().annotations.push({ type: 'đo', description: 'ca đã có trên màn — chỉ ghi sổ' });
	} else {
		await page.getByRole('button', { name: 'Thêm ca làm việc' }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm ca làm việc' }).last();
		await dr.getByPlaceholder('Nhập tên ca').fill(TEN_CA);
		const pk = dr.locator('.ant-picker-range');
		await gioRange(page, pk.nth(0), ['05:00', '23:45']);
		await gioRange(page, pk.nth(1), ['05:00', '23:45']);
		const cho = page.waitForResponse((r) => /timekeeping\/shift$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', { timeout: 30_000 });
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		// Hỏi chồng ca → đồng ý.
		const md = page.locator('.ant-modal-confirm').last();
		if (await md.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) {
			await md.locator('.ant-btn-primary').click();
		}
		const res = await cho.catch(async (e) => {
			const loi = await dr.locator('.ant-form-item-explain-error').allInnerTexts();
			throw new Error(`${e.message}\nÔ bị chặn: ${loi.join(' | ') || '(không)'}`);
		});
		const body = await res.json();
		expect(String(body?.status?.code), `Tạo ca lỗi: ${body?.status?.message}`).toBe('200');
		expect(JSON.parse(res.request().postData()).beginTime).toBe('05:00');
	}
	const hang = page.locator('.ant-pro-page-container .ant-table-tbody tr').filter({ hasText: TEN_CA }).first();
	await expect(hang).toBeVisible({ timeout: 20_000 });
	ghi('caLamViec', { tenCa: TEN_CA, gio: '05:00–23:45', shiftId: 'xem API shift-all' });
});

test('seed 11.2 — xếp lịch ca dài 90 ngày cho GDV + CHT điểm bán seed', async ({ page }) => {
	test.skip(Boolean(doc().duLieu?.caLamViec?.daXepLich), 'Sổ seed đã xếp lịch — 🚫 không xếp lại.');
	await moTrang(page, '/employee/schedule', 'shop');
	await page.getByRole('button', { name: 'Xếp lịch làm việc' }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thêm lịch làm việc' }).last();
	await expect(dr).toBeVisible({ timeout: 20_000 });
	// Bám nhãn ô: chọn xong một người thì placeholder "Chọn nhân viên" biến mất.
	const oNv = dr.locator('.ant-form-item').filter({ has: page.locator('label[title="Nhân viên áp dụng"]') }).locator('.ant-select').first();
	const tenNv = [`${PREFIX}GDV`, `${PREFIX}CHT`];
	for (const t of tenNv) {
		await oNv.click();
		await oNv.locator('input').fill(t);
		await page.locator('.ant-select-item-option').filter({ hasText: t, visible: true }).first().click();
	}
	// Dropdown multiple còn mở che các ô bên dưới — đóng bằng bấm tiêu đề drawer (🚫 Escape: đóng cả drawer).
	await dr.locator('.ant-drawer-title').click();
	await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
	await dr.getByText('Lặp lại', { exact: true }).click();
	const ngay = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
	for (const [nhan, v] of [['Ngày bắt đầu', ngay(new Date())], ['Ngày kết thúc', ngay(new Date(Date.now() + 90 * 86_400_000))]]) {
		const o = dr.locator('.ant-form-item').filter({ has: page.locator(`label[title="${nhan}"]`) }).locator('input');
		await o.click();
		await o.fill(v);
		await o.press('Enter');
	}
	const oCa = dr.locator('.ant-select').filter({ hasText: 'Chọn ca' }).last();
	await oCa.click();
	await page.locator('.ant-select-item-option').filter({ hasText: TEN_CA, visible: true }).first().click();
	await dr.locator('.ant-drawer-title').click();
	for (const t of ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']) {
		const cb = dr.getByRole('checkbox', { name: t, exact: true });
		if (!(await cb.isChecked())) await cb.check();
	}
	const cho = page.waitForResponse((r) => /timekeeping\/schedule\/batch/.test(r.url()), { timeout: 30_000 });
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	const res = await cho;
	const body = await res.json().catch(() => ({}));
	test.info().annotations.push({ type: 'đo', description: `${res.request().postData()?.slice(0, 400)} → ${JSON.stringify(body?.status)}` });
	expect(String(body?.status?.code), `Xếp lịch lỗi: ${body?.status?.message}`).toBe('200');
	ghi('caLamViec', { daXepLich: true, nhanVien: tenNv, denNgay: ngay(new Date(Date.now() + 90 * 86_400_000)) });
});
