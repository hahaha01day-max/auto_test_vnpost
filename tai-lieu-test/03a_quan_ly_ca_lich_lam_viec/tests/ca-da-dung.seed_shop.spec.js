'use strict';

/**
 * Task 020 — sửa/xoá ca ĐÃ ĐƯỢC SỬ DỤNG, chạy trên điểm bán seed (vai `seed_shop`).
 *
 * - `020_003`: "Ca sáng" của điểm bán seed đã có phiên chốt sổ (bộ vòng đời ca của 03b mở/chốt ca
 *   trong khung 07:30–12:00). Case thử đổi giờ kết thúc; lỡ server CHO lưu thì `finally` gõ lại
 *   đúng khung giờ cũ.
 * - `020_004`: 🚫 không thử xoá ca thật. Case tự tạo một ca `AUTO TEST …`, xếp lịch ngày mai cho
 *   nhân viên riêng `AUTO_NV_65402390` bằng ca đó, rồi thử xoá. `finally` huỷ lịch và xoá ca.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chuan, dong, drawer, moDrawerSuaCa, moDrawerThemCa, moManCa, moManLich, oGio } = require('./shift-page');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_shop';
const NV_RIENG = 'AUTO_NV_65402390';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const choGhi = (page, method, phan = '/timekeeping/shift') =>
	page.waitForResponse((r) => r.request().method() === method && r.url().includes(phan), { timeout: 90_000 });

async function viTriTheoTen(page, ten) {
	const so = await dong(page).count();
	for (let i = 0; i < so; i += 1) {
		if (chuan(await dong(page).nth(i).locator('td').nth(1).innerText()) === chuan(ten)) return i;
	}
	return -1;
}

const khungGio = async (page, i) => chuan(await dong(page).nth(i).locator('td').nth(2).innerText());

/** Gõ thẳng một khung giờ `HH:mm` vào cặp ô của RangePicker rồi kiểm lại giá trị trong ô. */
async function goKhungGio(page, dr, id, tu, den) {
	const a = oGio(dr, id);
	const b = oGio(dr, id, true);
	await a.click();
	await a.fill(tu);
	await page.keyboard.press('Enter');
	await b.click();
	await b.fill(den);
	await page.keyboard.press('Enter');
	await page.keyboard.press('Escape');
	await expect(a).toHaveValue(tu);
	await expect(b).toHaveValue(den);
}

/** Bấm Xác nhận; nếu hiện hộp "chồng lấn" thì chọn Tiếp tục lưu. Trả body của request ghi. */
async function xacNhan(page, dr, method) {
	const cho = choGhi(page, method);
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	const hop = page.locator('.ant-modal-confirm').last();
	const tiep = hop.getByRole('button', { name: 'Tiếp tục lưu' });
	await tiep.waitFor({ state: 'visible', timeout: 4_000 }).then(() => tiep.click()).catch(() => {});
	return (await cho).json();
}

async function xoaDong(page, i) {
	await dong(page).nth(i).locator('td').last().locator('button:has(.anticon-delete)').click();
	const cho = choGhi(page, 'DELETE');
	await page
		.locator('.ant-popover:visible, .ant-modal-confirm')
		.last()
		.getByRole('button', { name: /Xoá|Xóa|OK|Đồng ý|Xác nhận/ })
		.click();
	return (await cho).json();
}

const thongBao = async (page) => (await page.locator('.ant-message').allInnerTexts()).map(chuan).join(' | ');

test.describe('03a · 020 — Ca đã được sử dụng (ghi thật, điểm bán seed)', () => {
	test.describe.configure({ timeout: 300_000 });

	test('03a_020_003 — Chặn đổi khung giờ của ca đã có phiên chốt sổ', async ({ page }) => {
		const i0 = chanNeuTat('03a_020_003');
		const tenCa = i0.data?.tenCa || 'Ca sáng';
		await moManCa(page, VAI);
		const i = await viTriTheoTen(page, tenCa);
		expect(i, `Điểm bán seed không có "${tenCa}"`).toBeGreaterThanOrEqual(0);
		const cu = await khungGio(page, i);
		const m = cu.match(/^(\d{2}:\d{2}) - (\d{2}:\d{2})$/);
		expect(m, `Không đọc được khung giờ "${cu}"`).toBeTruthy();
		const [, tu, den] = m;
		const denMoi = `${String(Number(den.slice(0, 2)) - 1).padStart(2, '0')}${den.slice(2)}`;

		let daLuu = false;
		try {
			const dr = await moDrawerSuaCa(page, i);
			await goKhungGio(page, dr, 'workTime', tu, denMoi);
			const body = await xacNhan(page, dr, 'PUT');
			daLuu = String(body?.status?.code) === '200';
			expect(daLuu, `Server CHO đổi khung giờ ca đã có phiên chốt sổ: ${JSON.stringify(body?.status)}`).toBe(false);
			await expect.poll(() => thongBao(page), { timeout: 15_000, message: 'Bị chặn mà không báo lỗi' }).not.toBe('');

			await page.keyboard.press('Escape');
			await moManCa(page, VAI);
			expect(await khungGio(page, await viTriTheoTen(page, tenCa)), 'Khung giờ ca bị đổi dù server từ chối').toBe(cu);
		} finally {
			if (daLuu) {
				await moManCa(page, VAI);
				const dr = await moDrawerSuaCa(page, await viTriTheoTen(page, tenCa));
				await goKhungGio(page, dr, 'workTime', tu, den);
				await xacNhan(page, dr, 'PUT');
			}
		}
	});

	test('03a_020_004 — Chặn xoá ca đã được sử dụng', async ({ page }) => {
		chanNeuTat('03a_020_004');
		const ten = `AUTO TEST CA DUNG ${Date.now().toString().slice(-6)}`;
		const mai = new Date(Date.now() + 7 * 3600 * 1000 + 24 * 3600 * 1000);
		const p = (x) => String(x).padStart(2, '0');
		const ngayMai = `${p(mai.getUTCDate())}/${p(mai.getUTCMonth() + 1)}/${mai.getUTCFullYear()}`;
		let daTaoCa = false;
		let daXoa = false;
		try {
			// 1) Tạo ca riêng của case.
			await moManCa(page, VAI);
			let dr = await moDrawerThemCa(page);
			await dr.locator('#name').fill(ten);
			await goKhungGio(page, dr, 'workTime', '06:00', '07:00');
			await goKhungGio(page, dr, 'checkinTime', '05:00', '08:00');
			const tao = await xacNhan(page, dr, 'POST');
			expect(String(tao?.status?.code), `Không tạo được ca riêng: ${JSON.stringify(tao?.status)}`).toBe('200');
			daTaoCa = true;

			// 2) Gán ca đó cho nhân viên riêng vào ngày mai ⇒ ca "đã gán nhân viên".
			await moManLich(page, VAI);
			await page.getByRole('button', { name: 'Xếp lịch làm việc' }).click();
			dr = drawer(page);
			await dr.locator('#employeeIds').click();
			await page.locator('.ant-select-dropdown:has(#employeeIds_list) .ant-select-item-option').filter({ hasText: NV_RIENG }).click();
			await page.keyboard.press('Escape');
			await dr.locator('#targetDate').click();
			await dr.locator('#targetDate').fill(ngayMai);
			await page.keyboard.press('Enter');
			await dr.locator('#shiftId').click();
			await page.locator('.ant-select-dropdown:has(#shiftId_list) .ant-select-item-option').filter({ hasText: ten }).click();
			await page.keyboard.press('Escape');
			const choXep = page.waitForResponse(
				(r) => /\/timekeeping\/schedule$/.test(r.url().split('?')[0]) && r.request().method() === 'POST',
				{ timeout: 60_000 },
			);
			await dr.getByRole('button', { name: 'Xác nhận' }).click();
			expect(String((await (await choXep).json())?.status?.code), 'Không xếp được lịch bằng ca riêng').toBe('200');

			// 3) Thử xoá ca đã gán.
			await moManCa(page, VAI);
			const i = await viTriTheoTen(page, ten);
			expect(i, 'Không thấy ca vừa tạo').toBeGreaterThanOrEqual(0);
			const xoa = await xoaDong(page, i);
			daXoa = String(xoa?.status?.code) === '200';
			expect(daXoa, `Server CHO xoá ca đang có lịch của nhân viên: ${JSON.stringify(xoa?.status)}`).toBe(false);
			await expect.poll(() => thongBao(page), { timeout: 15_000, message: 'Bị chặn mà không báo lỗi' }).not.toBe('');
			await moManCa(page, VAI);
			expect(await viTriTheoTen(page, ten), 'Ca biến khỏi bảng dù server từ chối xoá').toBeGreaterThanOrEqual(0);
		} finally {
			// Huỷ lịch từ ngày mai của nhân viên riêng, rồi xoá ca riêng.
			await moManLich(page, VAI);
			await page.getByRole('button', { name: 'stop Huỷ lịch' }).click();
			const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
			await hop.locator('.ant-select').first().click();
			await page.locator('.ant-select-dropdown:visible').last().locator('.ant-select-item-option').filter({ hasText: NV_RIENG }).click();
			await page.keyboard.press('Escape');
			await hop.locator('.ant-radio-wrapper').filter({ hasText: 'Từ một ngày trở đi' }).click();
			const oNgay = hop.locator('.ant-picker input').first();
			await oNgay.click();
			await oNgay.fill(ngayMai);
			await page.keyboard.press('Enter');
			const choHuy = choGhi(page, 'PUT', '/timekeeping/schedule/cancel');
			await hop.getByRole('button', { name: 'Xác nhận huỷ' }).click();
			await choHuy;
			if (daTaoCa && !daXoa) {
				await moManCa(page, VAI);
				const i = await viTriTheoTen(page, ten);
				if (i >= 0) await xoaDong(page, i);
			}
		}
	});
});
