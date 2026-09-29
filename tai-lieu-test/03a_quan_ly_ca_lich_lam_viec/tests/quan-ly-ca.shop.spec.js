'use strict';

/**
 * Task 010 + 020 — Khai ca làm việc và sửa / đổi trạng thái ca.
 *
 * 🔴 File này 🚫 KHÔNG ghi dữ liệu: mọi case validate đều bọc `chanGhi(page)`. Lý do nghiêm trọng
 * hơn thường lệ — ngừng hoạt động một ca sẽ **chốt ngay mọi phiên thu ngân đang mở** trong ca đó,
 * và xoá ca thì không dựng lại được. Case ghi nằm ở `test-input.json` với `allowMutation: false`.
 *
 * Vai `shop`: HDSD khai `[BUU_DIEN_XA, BUU_DIEN_TINH]`, nhưng đo 20/09/2026 thì phạm vi tỉnh
 * (`qltls01`) 🚫 không có ca nào ⇒ chạy ở đó là "pass rỗng". Xem chú thích trong `playwright.config.js`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const {
	chanGhi,
	chonKhungGio,
	chuan,
	dong,
	drawer,
	gioChonDuoc,
	loiValidate,
	moDrawerSuaCa,
	moDrawerThemCa,
	moManCa,
	oGio,
	theColumn,
} = require('./shift-page');

const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Tên ca dùng để thử — 🚫 không bao giờ được lưu, mọi request ghi đều bị chặn ở tầng mạng. */
const TEN_THU = 'AUTO TEST KHONG DUNG';

/** Khung giờ của một ca đang có, đọc từ cột "Thời gian làm việc" (`06:00 - 12:00`). */
async function caDangCo(page, i = 0) {
	const text = chuan(await dong(page).nth(i).locator('td').nth(2).innerText());
	const m = text.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
	return m ? { ten: chuan(await dong(page).nth(i).locator('td').nth(1).innerText()), batDau: m[1], ketThuc: m[2] } : null;
}

test.describe('03a · 010 — Khai ca làm việc', () => {
	test.beforeEach(async ({ page }) => {
		await moManCa(page, VAI);
	});

	test('03a_010_001 — Màn Quản lý ca làm việc mở được và liệt kê ca', async ({ page }) => {
		chanNeuTat('03a_010_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toContainText(
			'Quản lý ca làm việc',
		);
		const ten = (await theColumn(page).allInnerTexts()).map(chuan);
		for (const c of ['Tên ca', 'Thời gian làm việc', 'Trạng thái', 'Hành động']) {
			expect(ten, `Bảng thiếu cột "${c}"`).toContain(c);
		}
		expect(
			await dong(page).count(),
			'Phạm vi đăng nhập không có ca nào — case sẽ "pass rỗng", đổi vai hoặc dựng dữ liệu nền.',
		).toBeGreaterThan(0);
	});

	test('03a_010_003 — Chặn thêm ca khi bỏ trống trường bắt buộc', async ({ page }) => {
		chanNeuTat('03a_010_003');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThemCa(page);
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);

		expect(await loiValidate(dr)).toContain('Vui lòng nhập tên ca');
		expect(daGoi, 'Form trống mà vẫn gửi request tạo ca').toEqual([]);
	});

	test('03a_010_005 — Bảng ca làm việc có đúng 7 cột', async ({ page }) => {
		chanNeuTat('03a_010_005');

		const ten = (await theColumn(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		expect(ten).toEqual([
			'STT',
			'Tên ca',
			'Thời gian làm việc',
			'Tổng giờ',
			'Lương/ca',
			'Trạng thái',
			'Hành động',
		]);
	});

	test('03a_010_006 — Bỏ trống Tên ca làm việc', async ({ page }) => {
		chanNeuTat('03a_010_006');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThemCa(page);
		await chonKhungGio(page, dr, 'workTime', '08:00', '17:00');
		await chonKhungGio(page, dr, 'checkinTime', '07:00', '18:00');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);

		expect(await loiValidate(dr)).toContain('Vui lòng nhập tên ca');
		expect(daGoi).toEqual([]);
	});

	test('03a_010_007 — Bỏ trống Thời gian làm việc', async ({ page }) => {
		chanNeuTat('03a_010_007');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThemCa(page);
		await dr.locator('#name').fill(TEN_THU);
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);

		expect(await loiValidate(dr)).toContain('Vui lòng chọn thời gian làm việc');
		expect(daGoi).toEqual([]);
	});

	test('03a_010_008 — Bỏ trống Thời gian cho phép nhân viên chấm công', async ({ page }) => {
		chanNeuTat('03a_010_008');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerThemCa(page);
		await dr.locator('#name').fill(TEN_THU);
		await chonKhungGio(page, dr, 'workTime', '08:00', '17:00');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);

		expect(await loiValidate(dr)).toContain('Vui lòng chọn thời gian chấm công');
		expect(daGoi).toEqual([]);
	});

	test('03a_010_010 — Giờ 00:00–04:59 bị vô hiệu ở mọi ô chọn giờ', async ({ page }) => {
		chanNeuTat('03a_010_010');

		const dr = await moDrawerThemCa(page);
		for (const [id, thuHai, ten] of [
			['workTime', false, 'giờ bắt đầu ca'],
			['workTime', true, 'giờ kết thúc ca'],
			['checkinTime', false, 'giờ bắt đầu chấm công'],
		]) {
			const gio = await gioChonDuoc(page, oGio(dr, id, thuHai));
			const chonDuoc = gio.filter((g) => !g.voHieu).map((g) => g.gio);
			// 🔴 antd `hideDisabledOptions`: giờ 00–04 KHÔNG hiện ra chứ không phải hiện-mà-mờ.
			for (const g of ['00', '01', '02', '03', '04']) {
				expect(chonDuoc, `Ô ${ten} vẫn chọn được giờ ${g}`).not.toContain(g);
			}
			expect(chonDuoc, `Ô ${ten} không có giờ nào chọn được`).toContain('05');
		}
	});

	test('03a_010_011 — Chặn cứng khi trùng KHÍT giờ bắt đầu và kết thúc của ca khác', async ({
		page,
	}) => {
		chanNeuTat('03a_010_011');
		const { daGoi } = await chanGhi(page);

		const ca = await caDangCo(page);
		if (!ca) test.skip(true, 'Không có ca nào đang khai để thử trùng khít.');

		const dr = await moDrawerThemCa(page);
		await dr.locator('#name').fill(TEN_THU);
		await chonKhungGio(page, dr, 'workTime', ca.batDau, ca.ketThuc);
		await chonKhungGio(page, dr, 'checkinTime', '05:00', '23:00');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(2_000);

		const thongBao = (await page.locator('.ant-message').allInnerTexts()).map(chuan).join(' | ');
		expect(thongBao).toContain(`Đã tồn tại ca cùng giờ bắt đầu và kết thúc: ${ca.ten}`);
		// 🔴 Chặn CỨNG: 🚫 không có hộp thoại cho đi tiếp như trường hợp chồng lấn một phần.
		expect(await page.locator('.ant-modal-confirm').count()).toBe(0);
		expect(daGoi, 'Trùng khít giờ mà vẫn gửi request tạo ca').toEqual([]);
	});

	test('03a_010_012 — Ca chồng lấn một phần: chọn Huỷ ở hộp thoại thì không lưu', async ({
		page,
	}) => {
		chanNeuTat('03a_010_012');
		const { daGoi } = await chanGhi(page);

		const ca = await caDangCo(page);
		if (!ca) test.skip(true, 'Không có ca nào đang khai để dựng tình huống chồng lấn.');

		// Chồng lấn MỘT PHẦN: lùi giờ bắt đầu 1 tiếng, giữ giờ kết thúc trong khung ca cũ.
		const lui = (gio, n) => String(Math.max(5, Number(gio.slice(0, 2)) + n)).padStart(2, '0') + ':00';
		const dr = await moDrawerThemCa(page);
		await dr.locator('#name').fill(TEN_THU);
		await chonKhungGio(page, dr, 'workTime', lui(ca.batDau, -1), lui(ca.ketThuc, -1));
		await chonKhungGio(page, dr, 'checkinTime', '05:00', '23:00');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(2_000);

		const hop = page.locator('.ant-modal-confirm').last();
		await expect(hop, 'Chồng lấn một phần mà không hiện hộp thoại cảnh báo').toBeVisible({
			timeout: 15_000,
		});
		expect(chuan(await hop.innerText())).toContain('Ca làm việc bị chồng lấn');

		await hop.getByRole('button', { name: 'Huỷ' }).click();
		await page.waitForTimeout(1_200);

		expect(daGoi, 'Bấm Huỷ ở hộp thoại chồng lấn mà vẫn gửi request').toEqual([]);
		await expect(drawer(page), 'Drawer bị đóng sau khi bấm Huỷ — dữ liệu đang nhập mất').toBeVisible();
		expect(chuan(await drawer(page).locator('#name').inputValue())).toBe(TEN_THU);
	});

	test('03a_010_015 — Ô chấm công bị giới hạn theo khung giờ làm việc', async ({ page }) => {
		chanNeuTat('03a_010_015');

		const dr = await moDrawerThemCa(page);
		await chonKhungGio(page, dr, 'workTime', '08:00', '17:00');

		const batDau = (await gioChonDuoc(page, oGio(dr, 'checkinTime'))).filter((g) => !g.voHieu);
		const ketThuc = (await gioChonDuoc(page, oGio(dr, 'checkinTime', true))).filter(
			(g) => !g.voHieu,
		);

		// Khoảng chấm công luôn PHỦ NGOÀI khung giờ làm việc.
		expect(
			batDau.map((g) => g.gio).every((g) => Number(g) <= 8),
			`Giờ bắt đầu chấm công chọn được cả sau 08: ${batDau.map((g) => g.gio).join(',')}`,
		).toBe(true);
		expect(
			ketThuc.map((g) => g.gio).every((g) => Number(g) >= 17),
			`Giờ kết thúc chấm công chọn được cả trước 17: ${ketThuc.map((g) => g.gio).join(',')}`,
		).toBe(true);
	});

	test('03a_010_016 — Trạng thái mặc định khi mở drawer thêm ca', async ({ page }) => {
		chanNeuTat('03a_010_016');

		const dr = await moDrawerThemCa(page);
		const daChon = dr.locator('#active .ant-radio-wrapper-checked');
		await expect(daChon).toHaveCount(1);
		expect(chuan(await daChon.innerText())).toBe('Hoạt động');
	});

	test('03a_010_017 — Huỷ drawer Thêm ca thì không lưu gì và không giữ dữ liệu cũ', async ({
		page,
	}) => {
		chanNeuTat('03a_010_017');
		const { daGoi } = await chanGhi(page);

		const soTruoc = await dong(page).count();
		let dr = await moDrawerThemCa(page);
		await dr.locator('#name').fill(TEN_THU);
		await chonKhungGio(page, dr, 'workTime', '08:00', '17:00');
		await dr.getByRole('button', { name: 'Huỷ' }).click();
		await page.waitForTimeout(1_500);

		expect(daGoi, 'Bấm Huỷ mà vẫn gửi request').toEqual([]);
		expect(await dong(page).count()).toBe(soTruoc);

		dr = await moDrawerThemCa(page);
		expect(chuan(await dr.locator('#name').inputValue()), 'Drawer mở lại còn dữ liệu cũ').toBe('');
		expect(chuan(await dr.locator('#active .ant-radio-wrapper-checked').innerText())).toBe(
			'Hoạt động',
		);
	});
});

test.describe('03a · 020 — Sửa ca và đổi trạng thái', () => {
	test.beforeEach(async ({ page }) => {
		await moManCa(page, VAI);
	});

	test('03a_020_006 — Huỷ chỉnh sửa ca thì dữ liệu ca không thay đổi', async ({ page }) => {
		chanNeuTat('03a_020_006');
		const { daGoi } = await chanGhi(page);

		if ((await dong(page).count()) === 0) test.skip(true, 'Không có ca nào để mở màn sửa.');
		const tenCu = chuan(await dong(page).first().locator('td').nth(1).innerText());
		const gioCu = chuan(await dong(page).first().locator('td').nth(2).innerText());

		let dr = await moDrawerSuaCa(page, 0);
		await dr.locator('#name').fill(`${tenCu} SUA DO DANG`);
		await dr.getByRole('button', { name: 'Huỷ' }).click();
		await page.waitForTimeout(1_500);

		expect(daGoi, 'Bấm Huỷ mà vẫn gửi PUT cập nhật ca').toEqual([]);
		expect(chuan(await dong(page).first().locator('td').nth(1).innerText())).toBe(tenCu);
		expect(chuan(await dong(page).first().locator('td').nth(2).innerText())).toBe(gioCu);

		dr = await moDrawerSuaCa(page, 0);
		expect(
			chuan(await dr.locator('#name').inputValue()),
			'Mở sửa lại vẫn còn giá trị nhập dở của lần trước',
		).toBe(tenCu);
	});

	test('03a_020_007 — Đổi trạng thái ca sang Ngừng hoạt động hiện đúng cảnh báo', async ({
		page,
	}) => {
		chanNeuTat('03a_020_007');
		const { daGoi } = await chanGhi(page);

		const i = await dongTheoTrangThai(page, 'Hoạt động');
		if (i < 0) test.skip(true, 'Không có ca nào đang Hoạt động để thử ngừng.');

		const dr = await moDrawerSuaCa(page, i);
		await dr.locator('#active').getByText('Ngừng hoạt động', { exact: true }).click();
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(2_000);

		const hop = page.locator('.ant-modal-confirm').last();
		await expect(hop).toBeVisible({ timeout: 15_000 });
		const noi = chuan(await hop.innerText());
		expect(noi).toContain('Xác nhận ngừng hoạt động ca làm việc?');
		expect(noi).toContain(
			'Các phiên thu ngân đang mở trong ca này sẽ được chốt ngay. Nhân viên phải mở ca làm việc mới để tiếp tục thao tác bán hàng.',
		);
		const nutChinh = hop.getByRole('button', { name: 'Ngừng hoạt động' });
		await expect(nutChinh).toBeVisible();
		expect(await nutChinh.getAttribute('class')).toContain('dangerous');

		await hop.getByRole('button', { name: 'Huỷ' }).click().catch(() => {});
		expect(daGoi, '🔴 Đã gửi PUT đổi trạng thái khi mới chỉ xem cảnh báo').toEqual([]);
	});

	test('03a_020_008 — Bấm Huỷ ở hộp thoại ngừng hoạt động thì trạng thái không đổi', async ({
		page,
	}) => {
		chanNeuTat('03a_020_008');
		const { daGoi } = await chanGhi(page);

		const i = await dongTheoTrangThai(page, 'Hoạt động');
		if (i < 0) test.skip(true, 'Không có ca nào đang Hoạt động để thử ngừng.');
		const trangThaiCu = chuan(await dong(page).nth(i).locator('td').nth(5).innerText());

		const dr = await moDrawerSuaCa(page, i);
		await dr.locator('#active').getByText('Ngừng hoạt động', { exact: true }).click();
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(2_000);

		const hop = page.locator('.ant-modal-confirm').last();
		await expect(hop).toBeVisible({ timeout: 15_000 });
		await hop.getByRole('button', { name: 'Huỷ' }).click();
		await page.waitForTimeout(1_500);

		expect(daGoi, 'Bấm Huỷ mà vẫn gửi PUT đổi trạng thái').toEqual([]);
		await page.reload();
		await moManCa(page, VAI);
		expect(chuan(await dong(page).nth(i).locator('td').nth(5).innerText())).toBe(trangThaiCu);
	});

	test('03a_020_009 — Kích hoạt lại ca đang ngừng hiện cảnh báo khác', async ({ page }) => {
		chanNeuTat('03a_020_009');
		const { daGoi } = await chanGhi(page);

		const i = await dongTheoTrangThai(page, 'Ngừng hoạt động');
		if (i < 0) {
			test.skip(
				true,
				'Không có ca nào đang Ngừng hoạt động — cần dữ liệu nền, 🚫 không tự tạo bằng cách ngừng một ca thật.',
			);
		}

		const dr = await moDrawerSuaCa(page, i);
		await dr.locator('#active').getByText('Hoạt động', { exact: true }).click();
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(2_000);

		const hop = page.locator('.ant-modal-confirm').last();
		await expect(hop).toBeVisible({ timeout: 15_000 });
		const noi = chuan(await hop.innerText());
		expect(noi).toContain('Xác nhận kích hoạt ca làm việc?');
		expect(noi).toContain('Ca làm việc sẽ được chuyển sang trạng thái Hoạt động.');
		const nutChinh = hop.getByRole('button', { name: 'Kích hoạt' });
		await expect(nutChinh).toBeVisible();
		// 🔴 Khác hẳn hộp thoại ngừng: nút chính KHÔNG màu đỏ.
		expect(await nutChinh.getAttribute('class')).not.toContain('dangerous');

		await hop.getByRole('button', { name: 'Huỷ' }).click().catch(() => {});
		expect(daGoi).toEqual([]);
	});
});

/** Chỉ số dòng đầu tiên mang đúng trạng thái, hoặc -1. */
async function dongTheoTrangThai(page, nhan) {
	const so = await dong(page).count();
	for (let i = 0; i < so; i += 1) {
		if (chuan(await dong(page).nth(i).locator('td').nth(5).innerText()).includes(nhan)) return i;
	}
	return -1;
}
