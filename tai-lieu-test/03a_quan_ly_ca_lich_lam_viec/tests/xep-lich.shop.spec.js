'use strict';

/**
 * Task 040 (xếp lịch) + 050 (huỷ lịch) — màn `/employee/schedule`.
 *
 * 🔴 Huỷ lịch là thao tác **không dựng lại được bằng UI** nếu không nhớ lịch cũ ⇒ mọi case huỷ
 * thật đều `allowMutation: false`. Case đọc ở đây bọc `chanGhi`, chỉ mở hộp thoại để đối chiếu
 * nhãn và ràng buộc.
 *
 * Đo từ DOM 20/09/2026:
 *   - Nút trên màn: `Xếp lịch làm việc` · `Huỷ lịch` (tên trợ năng **`stop Huỷ lịch`** — mỗi nhân
 *     viên trong lịch còn có nút `Huỷ lịch làm việc của <tên>`, nên 🚫 không dùng tên khớp lỏng).
 *   - Drawer xếp lịch tiêu đề **"Thêm lịch làm việc"**, ô `#employeeIds` · `#targetDate` ·
 *     `#shiftId`, checkbox **Lặp lại** đổi form sang `#startDate` · `#endDate` + 7 ô thứ T2…CN.
 *   - Hộp thoại huỷ tiêu đề **"Huỷ lịch làm việc"**, nút **"Xác nhận huỷ"** (disabled khi chưa
 *     chọn nhân viên) và **"Đóng"**.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { chanGhi, chuan, drawer, moManLich } = require('./shift-page');

const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

async function moDrawerXepLich(page) {
	await page.getByRole('button', { name: 'Xếp lịch làm việc' }).click();
	const dr = drawer(page);
	await expect(dr.locator('.ant-drawer-title')).toHaveText('Thêm lịch làm việc', {
		timeout: 20_000,
	});
	await dr.locator('#employeeIds').waitFor({ state: 'visible', timeout: 20_000 });
	return dr;
}

async function moHopThoaiHuy(page) {
	// 🔴 Tên trợ năng có tiền tố icon (`stop Huỷ lịch`); tên khớp lỏng "Huỷ lịch" đụng cả nút huỷ
	//    của từng nhân viên trên lịch ⇒ strict mode violation.
	await page.getByRole('button', { name: 'stop Huỷ lịch' }).click();
	const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	await expect(hop.locator('.ant-drawer-title, .ant-modal-title')).toHaveText(
		'Huỷ lịch làm việc',
		{ timeout: 20_000 },
	);
	return hop;
}

test.describe('03a · 040 — Xếp lịch làm việc', () => {
	test.beforeEach(async ({ page }) => {
		await moManLich(page, VAI);
	});

	test('03a_040_002 — Danh sách ca khi xếp lịch chỉ gồm ca đang hoạt động', async ({ page }) => {
		chanNeuTat('03a_040_002');
		await chanGhi(page);

		// Đọc trạng thái thật của từng ca ở màn Quản lý ca trước, rồi đối chiếu.
		const { moManCa, dong } = require('./shift-page');
		await moManCa(page, VAI);
		const soCa = await dong(page).count();
		expect(soCa, 'Không có ca nào để đối chiếu').toBeGreaterThan(0);
		const ngung = [];
		for (let i = 0; i < soCa; i += 1) {
			const ten = chuan(await dong(page).nth(i).locator('td').nth(1).innerText());
			const tt = chuan(await dong(page).nth(i).locator('td').nth(5).innerText());
			if (tt.includes('Ngừng')) ngung.push(ten);
		}

		await moManLich(page, VAI);
		const dr = await moDrawerXepLich(page);
		await dr.locator('#shiftId').click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);

		expect(nhan.length, 'Danh sách ca khi xếp lịch rỗng').toBeGreaterThan(0);
		if (ngung.length === 0) {
			test.info().annotations.push({
				type: 'ghi chú',
				description:
					'Không có ca nào Ngừng hoạt động trên môi trường này ⇒ chỉ kiểm được vế "có liệt kê ca hoạt động".',
			});
		}
		for (const ten of ngung) {
			expect(nhan, `Ca "${ten}" đang Ngừng hoạt động mà vẫn xếp lịch được`).not.toContain(ten);
		}
	});

	test('03a_040_005 — Xếp lịch một ngày: bỏ trống từng ô bắt buộc', async ({ page }) => {
		chanNeuTat('03a_040_005');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerXepLich(page);
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);

		const loi = (await dr.locator('.ant-form-item-explain-error').allInnerTexts()).map(chuan);
		expect(loi, 'Không báo lỗi thiếu nhân viên').toContain('Vui lòng chọn nhân viên');
		expect(daGoi, 'Form trống mà vẫn gửi POST xếp lịch').toEqual([]);
	});

	test('03a_040_006 — Xếp lịch lặp lại: bỏ trống ca hoặc thứ trong tuần', async ({ page }) => {
		chanNeuTat('03a_040_006');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerXepLich(page);
		await dr.getByText('Lặp lại', { exact: true }).click();
		await page.waitForTimeout(1_000);
		await expect(dr.locator('#startDate'), 'Bật Lặp lại mà form không đổi').toBeVisible();

		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);

		// 🔴 Ở chế độ lặp, thiếu ca/thứ báo bằng `message.warning` mức toàn form — 🚫 không phải
		//    lỗi dưới từng ô. Ở đây form còn trống cả nhân viên nên chấp nhận cả hai kênh.
		const loi = [
			...(await dr.locator('.ant-form-item-explain-error').allInnerTexts()),
			...(await page.locator('.ant-message').allInnerTexts()),
		].map(chuan);
		expect(loi.join(' | '), 'Không có thông báo nào khi bấm Xác nhận với form trống').not.toBe('');
		expect(daGoi, 'Form lặp còn trống mà vẫn gửi POST batch').toEqual([]);
	});

	test('03a_040_007 — Xem lịch làm việc trên giao diện calendar', async ({ page }) => {
		chanNeuTat('03a_040_007');

		const khung = page.locator('.ant-pro-page-container');
		expect(chuan(await khung.innerText())).toContain('Danh sách nhân viên');

		// Kịch bản nói "tháng" ⇒ chuyển lưới sang chế độ Tháng trước khi quan sát.
		await khung.locator('.ant-segmented-item').filter({ hasText: 'Tháng' }).click();
		const tieuDe = khung.locator('.work-schedule-board-title');
		const thangNay = chuan(await tieuDe.innerText());
		expect(thangNay, 'Tiêu đề lưới không nói tháng đang xem').toMatch(/\d/);

		// Đổi sang kỳ sau phải nạp lại lịch THEO THÁNG MỚI.
		const cho = page.waitForResponse(
			(r) => r.url().includes('/timekeeping/schedule?') && r.request().method() === 'GET' && r.status() !== 401,
			{ timeout: 45_000 },
		);
		await khung.getByRole('button', { name: 'Kỳ sau' }).click();
		const res = await cho;
		expect(res.status()).toBe(200);
		const tieuDeMoi = chuan(await tieuDe.innerText());
		expect(tieuDeMoi, 'Bấm Kỳ sau mà tiêu đề tháng không đổi').not.toBe(thangNay);
		const q = new URL(res.url()).searchParams;
		const ketThuc = Number(q.get('end'));
		expect(ketThuc, 'Request nạp lại không mang khoảng thời gian').toBeGreaterThan(0);
		// Khoảng nạp phải phủ tới tháng mới (sau hôm nay ít nhất một tháng).
		expect(ketThuc, 'Nạp lại mà khoảng dữ liệu không chạm tới tháng mới').toBeGreaterThan(Date.now() + 28 * 24 * 3600 * 1000);
	});

	test('03a_040_009 — Đóng drawer Xếp lịch giữa chừng thì không lưu gì', async ({ page }) => {
		chanNeuTat('03a_040_009');
		const { daGoi } = await chanGhi(page);

		let dr = await moDrawerXepLich(page);
		await dr.locator('#employeeIds').click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		await dd.locator('.ant-select-item-option-content').first().click();
		await page.keyboard.press('Escape');

		await dr.getByRole('button', { name: 'Huỷ' }).click();
		await page.waitForTimeout(1_500);
		expect(daGoi, 'Đóng drawer mà vẫn gửi request xếp lịch').toEqual([]);

		dr = await moDrawerXepLich(page);
		expect(
			chuan(await dr.locator('#employeeIds').inputValue()),
			'Drawer mở lại còn giữ nhân viên đã chọn dở',
		).toBe('');
	});

	test('03a_040_003 — Chặn xếp lịch lặp lại quá 90 ngày', async ({ page }) => {
		const i = chanNeuTat('03a_040_003');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerXepLich(page);

		// 🔴 Phải chọn nhân viên TRƯỚC: bỏ trống thì form dừng ở lỗi "Vui lòng chọn nhân viên" và
		//    phép kiểm 90 ngày không bao giờ được chạm tới — case sẽ đỏ vì lý do sai.
		await dr.locator('#employeeIds').click();
		const ddNv = page.locator('.ant-select-dropdown').last();
		await ddNv.waitFor({ state: 'visible', timeout: 15_000 });
		if ((await ddNv.locator('.ant-select-item-option-content').count()) === 0) {
			await page.keyboard.press('Escape');
			test.skip(true, 'Điểm bán không có nhân viên nào để xếp lịch.');
		}
		await ddNv.locator('.ant-select-item-option-content').first().click();
		await page.keyboard.press('Escape');

		await dr.getByText('Lặp lại', { exact: true }).click();
		await page.waitForTimeout(1_000);

		// 🔴 HDSD nói "không quá 90 ngày" nhưng code FE KHÔNG có phép kiểm này (đã grep). Case chạy
		//    để phơi hành vi thật: nhập khoảng > 90 ngày rồi xem có chặn không.
		await dr.locator('#startDate').fill('01/01/2026');
		await page.keyboard.press('Enter');
		await dr.locator('#endDate').fill('31/12/2026');
		await page.keyboard.press('Enter');
		await page.waitForTimeout(800);

		// Khai đủ ca + thứ trong tuần, để thứ DUY NHẤT còn thiếu là khoảng ngày — nếu không, form
		// dừng ở "Vui lòng chọn đầy đủ ca và ngày trong tuần" và phép kiểm 90 ngày không được chạm.
		const oCa = dr.locator('.ant-select').filter({ hasText: 'Chọn ca' }).first();
		await oCa.click();
		const ddCa = page.locator('.ant-select-dropdown').last();
		await ddCa.waitFor({ state: 'visible', timeout: 15_000 });
		if ((await ddCa.locator('.ant-select-item-option-content').count()) === 0) {
			await page.keyboard.press('Escape');
			test.skip(true, 'Không có ca làm việc nào để xếp lịch lặp.');
		}
		await ddCa.locator('.ant-select-item-option-content').first().click();
		await page.keyboard.press('Escape');
		await dr.getByText('T2', { exact: true }).click();
		await page.waitForTimeout(600);
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(2_000);

		const thongBao = [
			...(await dr.locator('.ant-form-item-explain-error').allInnerTexts()),
			...(await page.locator('.ant-message').allInnerTexts()),
		]
			.map(chuan)
			.join(' | ');

		// 🔴 Bằng chứng đo được 20/09/2026: với khoảng **365 ngày**, FE VẪN gửi
		//    `POST /timekeeping/schedule/batch` (request bị `chanGhi` bắt lại), và không có thông
		//    báo nào nhắc tới 90 ngày. ⇒ FE 🚫 KHÔNG có phép kiểm này.
		//    Giữ nguyên kỳ vọng của HDSD — case đỏ ở đây là PHÁT HIỆN, 🚫 không phải lỗi script.
		expect(
			/90/.test(thongBao),
			`Khoảng 365 ngày KHÔNG bị chặn: FE gửi ${daGoi.length} request xếp lịch ` +
				`(${daGoi.join(' ; ') || 'không có'}), thông báo trên màn: "${thongBao}". ` +
				'HDSD 03a task 040 đòi "không quá 90 ngày" — cần user chốt chặn ở FE hay BE.',
		).toBe(true);
		void i;
	});
	/**
	 * Kỳ vọng user chốt 28/09/2026 (A7): lặp lại mà bỏ trống "Ngày kết thúc" ⇒ xếp TỐI ĐA 90 ngày kể từ ngày bắt đầu.
	 * Trace vnpost-web f9c5c858 `pages/timekeeping/DrawerSchedule.jsx`: FE gửi `endDate: null` lên `POST /timekeeping/schedule/batch`
	 * ⇒ BE quyết định ⇒ phải GHI THẬT mới đo được. An toàn: nhân viên riêng của làn `AUTO<làn>_DC_*` (02/dieu-chuyen), bắt đầu 04/01/2027
	 * (xa mọi lịch đang dùng), đếm `EMPLOYEE_SCHEDULE` (SELECT) rồi HUỶ bằng chính API huỷ lịch (`PUT /timekeeping/schedule/cancel`,
	 * type FUTURE từ 01/01/2027) ở finally.
	 */
	test('03a_040_008 — Chế độ lặp: bỏ trống Ngày kết thúc', async ({ page }) => {
		chanNeuTat('03a_040_008');
		const fs = require('node:fs');
		const seed = require('../../00_seed/seed-state');
		const ka = require('../../shared/kho-api');
		const soNv = path.join(GOC, '..', '02_quan_ly_nhan_vien', 'test-output', `nv-dieu-chuyen.lane${process.env.VNPOST_LANE || 0}.json`);
		test.skip(!fs.existsSync(soNv), 'Chưa có nhân viên riêng của làn — chạy 02/tests/dieu-chuyen.tct.spec.js (tiền đề) trước');
		const tenNv = `${seed.PREFIX}DC_${JSON.parse(fs.readFileSync(soNv, 'utf8')).maNv.match(/\d{6,}$/)[0]}`;
		const st = ka.k.batHeader(page);
		const dr = await moDrawerXepLich(page);
		await dr.locator('#employeeIds').click();
		await page.keyboard.type(tenNv);
		const ddNv = page.locator('.ant-select-dropdown').last();
		await ddNv.waitFor({ state: 'visible', timeout: 15_000 });
		const muc = ddNv.locator('.ant-select-item-option-content').filter({ hasText: tenNv }).first();
		test.skip(!(await muc.count()), `Nhân viên ${tenNv} không có trong ô chọn nhân viên của điểm bán`);
		await muc.click();
		await page.keyboard.press('Escape');
		await dr.getByText('Lặp lại', { exact: true }).click();
		await page.waitForTimeout(1_000);
		await dr.locator('#startDate').fill('04/01/2027');
		await page.keyboard.press('Enter');
		await page.waitForTimeout(500);
		const oCa = dr.locator('.ant-select').filter({ hasText: 'Chọn ca' }).first();
		await oCa.click();
		const ddCa = page.locator('.ant-select-dropdown').last();
		await ddCa.waitFor({ state: 'visible', timeout: 15_000 });
		await ddCa.locator('.ant-select-item-option-content').first().click();
		await page.keyboard.press('Escape');
		for (const t of ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']) await dr.getByText(t, { exact: true }).click();
		const cho = page.waitForResponse((r) => r.url().includes('/timekeeping/schedule/batch') && r.request().method() === 'POST', { timeout: 60_000 });
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		const res = await cho;
		const req = res.request().postDataJSON();
		const b = await res.json().catch(() => null);
		const empId = Number(req?.employeeIds?.[0]);
		const shopId = Number(req?.shopId);
		try {
			await page.waitForTimeout(3_000);
			const [n, dau, cuoi] = ka.sql(`select count(*), min(date), max(date) from EMPLOYEE_SCHEDULE where shop_id=${shopId} and employee_id=${empId} and date >= '2027-01-01'`).split('\t');
			const ngay = dau && cuoi && dau !== 'NULL' ? Math.round((new Date(cuoi) - new Date('2027-01-04')) / 86_400_000) + 1 : 0;
			test.info().annotations.push({ type: 'đo', description: `${tenNv} (#${empId}) · endDate gửi ${JSON.stringify(req?.endDate)} · ${JSON.stringify(b?.status)} · tạo ${n} lịch, ${dau} → ${cuoi} (${ngay} ngày tính từ 04/01/2027)` });
			expect(String(b?.status?.code), `Xếp lịch lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
			expect(Number(n), 'Không tạo lịch nào — không đo được giới hạn').toBeGreaterThan(0);
			expect(ngay, `🔴 Bỏ trống Ngày kết thúc mà xếp tới ${cuoi} (${ngay} ngày) — vượt 90 ngày`).toBeLessThanOrEqual(90);
		} finally {
			if (empId && shopId) {
				const huy = await ka.k.goiGhi(page, st, 'PUT', '/timekeeping/schedule/cancel', {}, { shopId, type: 'FUTURE', employeeId: empId, fromDate: new Date('2027-01-01T00:00:00+07:00').getTime() });
				test.info().annotations.push({ type: 'dọn', description: `huỷ lịch từ 01/01/2027: ${JSON.stringify(huy?.status)} · còn ${ka.sql(`select count(*) from EMPLOYEE_SCHEDULE where shop_id=${shopId} and employee_id=${empId} and date >= '2027-01-01'`)}` });
			}
		}
	});
});

test.describe('03a · 050 — Huỷ lịch làm việc', () => {
	test.beforeEach(async ({ page }) => {
		await moManLich(page, VAI);
	});


	test('03a_050_004 — Chưa chọn nhân viên thì không huỷ được', async ({ page }) => {
		chanNeuTat('03a_050_004');
		const { daGoi } = await chanGhi(page);

		const hop = await moHopThoaiHuy(page);
		const nut = hop.getByRole('button', { name: 'Xác nhận huỷ' });
		await expect(nut, 'Chưa chọn nhân viên mà nút Xác nhận huỷ vẫn bấm được').toBeDisabled();

		await nut.click({ force: true }).catch(() => {});
		await page.waitForTimeout(1_200);
		expect(daGoi, 'Đã gửi request huỷ lịch dù chưa chọn nhân viên').toEqual([]);
	});


});
