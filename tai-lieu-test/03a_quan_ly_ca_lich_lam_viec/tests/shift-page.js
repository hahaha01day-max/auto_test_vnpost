'use strict';

/**
 * Helper dùng chung phân hệ 03a — Quản lý ca & lịch làm việc.
 *
 * 🔴 Đo từ DOM thật 20/09/2026, 🚫 không suy từ JSX:
 *   - Ba màn: `/employee/shift` · `/employee/schedule` · `/employee/shift-report`.
 *   - Màn ca 🚫 KHÔNG có ô chọn cửa hàng — nó bám **phạm vi đăng nhập** (`useActiveScope`).
 *     Vì vậy vai nào đăng nhập quyết định thấy ca của điểm bán nào.
 *   - Drawer khai ca: `#name` · `#workTime`+ô kề "Kết thúc" · `#checkinTime`+ô kề "Đến" ·
 *     radio group `#active` (Hoạt động / Ngừng hoạt động). Nút **"Xác nhận"**, 🚫 không phải "Lưu".
 *   - Tiêu đề drawer: **"Thêm ca làm việc"** / **"Cập nhật ca làm việc"**.
 *   - 🔴 Ô chọn giờ KHÔNG hiện giờ 00–04 (antd `hideDisabledOptions`): danh sách bắt đầu từ `05`,
 *     19 mục. ⇒ assert "không có ô giờ 00–04", 🚫 không assert "ô đó disabled".
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE = {
	ca: '/employee/shift',
	lich: '/employee/schedule',
	baoCao: '/employee/shift-report',
};

const laApi = (phan) => (r) => r.url().includes(phan);
/** 🔴 Bỏ qua 401 của phiên cũ — xem bẫy đã ghi ở `playwright-quality-gates.md`. */
const laApiOk = (phan) => (r) => r.url().includes(phan) && r.status() !== 401;

async function moMan(page, route, vai, apiPhan) {
	const cho = page.waitForResponse(laApiOk(apiPhan), { timeout: 90_000 });
	await moTrang(page, route, vai);
	const res = await cho;
	expect(res.status(), `API ${apiPhan} không trả 200`).toBe(200);
	await page.waitForTimeout(1_500);
	return res;
}

const moManCa = (page, vai) => moMan(page, ROUTE.ca, vai, '/timekeeping/shift-all');
const moManLich = (page, vai) => moMan(page, ROUTE.lich, vai, '/timekeeping/schedule');
const moManBaoCao = (page, vai) =>
	moMan(page, ROUTE.baoCao, vai, '/timekeeping/shift-report/closed');

const khungMan = (page) => page.locator('.ant-pro-page-container');
const dong = (page) => page.locator('.ant-table-tbody tr.ant-table-row');
const theColumn = (page) => page.locator('.ant-table-thead th');
const drawer = (page) => page.locator('.ant-drawer-open').last();

/** Mở drawer "Thêm ca làm việc" và chờ thân form. */
async function moDrawerThemCa(page) {
	await page.getByRole('button', { name: 'Thêm ca làm việc' }).click();
	const dr = drawer(page);
	await expect(dr.locator('.ant-drawer-title')).toHaveText('Thêm ca làm việc', { timeout: 20_000 });
	await dr.locator('#name').waitFor({ state: 'visible', timeout: 20_000 });
	return dr;
}

/** Mở drawer sửa của dòng thứ `i` (nút bút chì, nút đầu ở cột Hành động). */
async function moDrawerSuaCa(page, i = 0) {
	await dong(page).nth(i).locator('td').last().locator('button').first().click();
	const dr = drawer(page);
	await expect(dr.locator('.ant-drawer-title')).toHaveText('Cập nhật ca làm việc', {
		timeout: 20_000,
	});
	// 🔴 Chờ GIÁ TRỊ CŨ về, không chỉ chờ ô hiện ra.
	await expect
		.poll(async () => (await dr.locator('#name').inputValue()).length, {
			timeout: 30_000,
			message: 'Drawer sửa ca không nạp lại dữ liệu cũ',
		})
		.toBeGreaterThan(0);
	return dr;
}

/**
 * Hai ô giờ của một `RangePicker`.
 *
 * 🔴 Ô thứ hai KHÔNG có id. Lấy theo thứ tự picker trong drawer (0 = Thời gian làm việc,
 * 1 = Thời gian chấm công), 🚫 đừng đi ngược cây từ `#<id>`: tổ tiên gần nhất là
 * `.ant-picker-input`, không phải `.ant-picker`, nên xpath kiểu đó trả locator rỗng và triệu
 * chứng là click timeout 15s.
 */
const oGio = (dr, id, thuHai = false) => {
	if (!thuHai) return dr.locator(`#${id}`);
	const viTri = id === 'workTime' ? 0 : 1;
	return dr.locator('.ant-picker-range').nth(viTri).locator('input').nth(1);
};

/** Mở một ô giờ rồi đọc danh sách giờ CHỌN ĐƯỢC. */
async function gioChonDuoc(page, o) {
	await o.click();
	const pk = page.locator('.ant-picker-dropdown').last();
	await pk.waitFor({ state: 'visible', timeout: 15_000 });
	const cot = pk.locator('.ant-picker-time-panel-column').first();
	const gio = await cot
		.locator('.ant-picker-time-panel-cell')
		.evaluateAll((l) =>
			l.map((e) => ({
				gio: e.innerText.trim(),
				voHieu: e.className.includes('disabled'),
			})),
		);
	await page.keyboard.press('Escape');
	await page.waitForTimeout(400);
	return gio;
}

/** Điền một khung giờ (ví dụ 08:00 – 17:00) vào cặp ô của `id`. */
async function chonKhungGio(page, dr, id, batDau, ketThuc) {
	await dr.locator(`#${id}`).click();
	const pk = page.locator('.ant-picker-dropdown').last();
	await pk.waitFor({ state: 'visible', timeout: 15_000 });
	await pk.locator('.ant-picker-time-panel-cell-inner', { hasText: new RegExp(`^${batDau.slice(0, 2)}$`) }).first().click();
	await page.waitForTimeout(300);
	await pk.locator('.ant-picker-time-panel-column').nth(1).locator('.ant-picker-time-panel-cell-inner', { hasText: /^00$/ }).first().click();
	await page.waitForTimeout(300);
	await pk.getByRole('button', { name: 'OK' }).click().catch(() => {});
	await page.waitForTimeout(500);

	await pk.locator('.ant-picker-time-panel-cell-inner', { hasText: new RegExp(`^${ketThuc.slice(0, 2)}$`) }).first().click();
	await page.waitForTimeout(300);
	await pk.locator('.ant-picker-time-panel-column').nth(1).locator('.ant-picker-time-panel-cell-inner', { hasText: /^00$/ }).first().click();
	await page.waitForTimeout(300);
	await pk.getByRole('button', { name: 'OK' }).click().catch(() => {});
	await page.waitForTimeout(600);
}

async function loiValidate(scope) {
	return (await scope.locator('.ant-form-item-explain-error').allInnerTexts()).map(chuan);
}

/**
 * 🔴 Chặn ở tầng mạng mọi request GHI của phân hệ chấm công.
 *
 * Màn này đụng vào **ca làm việc đang chạy** và **lịch của người thật**: ngừng một ca là chốt ngay
 * mọi phiên thu ngân đang mở. Case validate vẫn phải bấm nút Xác nhận, nên chặn ở tầng mạng là
 * cách duy nhất vừa kiểm được vừa không chạm dữ liệu.
 */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/timekeeping/**', async (route) => {
		if (route.request().method() === 'GET') return route.continue();
		daGoi.push(`${route.request().method()} ${route.request().url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

/**
 * Mở hộp thoại huỷ ĐÚNG lối "từ một ca cụ thể": bấm chip ca trên lưới → drawer chấm công →
 * nút "Huỷ ca ngày …". 🔴 Nút huỷ ở danh sách nhân viên bên trái (`.work-schedule-employee-cancel`)
 * KHÔNG phải lối này — nó chỉ điền sẵn nhân viên, phạm vi vẫn là "Từ một ngày trở đi".
 * Nút "Huỷ ca ngày" chỉ có ở lịch CHƯA chấm công ⇒ thử lần lượt các chip. Trả null nếu không có.
 */
async function moHuyTuChip(page) {
	const chip = page.locator('.work-schedule-assignment');
	// 🔴 `moManLich` trả về ở response lịch ĐẦU TIÊN (lịch cá nhân, có `employeeId`) — lưới toàn
	//    điểm bán còn đang nạp. Đếm chip ngay lúc đó là đếm được 0.
	await chip.first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
	const so = await chip.count();
	for (let i = 0; i < so; i += 1) {
		await chip.nth(i).click();
		const dr = drawer(page);
		// Chờ thân drawer dựng xong (ô Giờ đến) rồi mới hỏi có nút huỷ hay không.
		await dr.locator('#checkInTime').waitFor({ state: 'visible', timeout: 15_000 });
		// 🔴 Tên trợ năng có tiền tố icon (`stop Huỷ ca ngày …`) ⇒ 🚫 không neo `^`.
		const nut = dr.getByRole('button', { name: /Huỷ ca ngày/ });
		if ((await nut.count()) > 0) {
			const nhanNut = chuan(await nut.innerText());
			await nut.click();
			const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
			await expect(hop.locator('.ant-drawer-title, .ant-modal-title')).toHaveText('Huỷ lịch làm việc', {
				timeout: 20_000,
			});
			return { hop, ngay: (nhanNut.match(/\d{2}\/\d{2}\/\d{4}/) || [''])[0] };
		}
		await page.keyboard.press('Escape');
		await expect(dr).toHaveCount(0);
	}
	return null;
}

module.exports = {
	moHuyTuChip,
	ROUTE,
	chanGhi,
	chonKhungGio,
	chuan,
	dong,
	drawer,
	gioChonDuoc,
	khungMan,
	laApi,
	laApiOk,
	loiValidate,
	moDrawerSuaCa,
	moDrawerThemCa,
	moMan,
	moManBaoCao,
	moManCa,
	moManLich,
	oGio,
	theColumn,
};
