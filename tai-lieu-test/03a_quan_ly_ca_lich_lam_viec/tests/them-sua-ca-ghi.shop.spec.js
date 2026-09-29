'use strict';

/**
 * Task 010 + 020 — phần **GHI DỮ LIỆU THẬT** của màn Quản lý ca.
 *
 * 🔴 Vì sao cả file để `allowMutation: false`:
 *   - **Ngừng hoạt động một ca ⇒ chốt ngay mọi phiên thu ngân đang mở** trong ca đó. Không hoàn tác
 *     được: phiên đã chốt thì nhân viên phải mở ca mới.
 *   - **Xoá ca** không dựng lại được nếu không nhớ đủ khung giờ và cấu hình chấm công.
 *   - Ca tạo ra sẽ xuất hiện trong ô xếp lịch của điểm bán thật.
 * 🚫 Không tự bật công tắc, 🚫 không "chạy thử một lần cho biết".
 *
 * Script viết đủ để lúc được phép là chạy ngay, và để báo cáo phân biệt *"chưa chạy vì chặn ghi"*
 * với *"chưa ai viết"*.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const {
	chonKhungGio,
	chuan,
	dong,
	moDrawerSuaCa,
	moDrawerThemCa,
	moManCa,
} = require('./shift-page');

const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const TEN_RAC = () => `AUTO TEST KHONG DUNG ${Date.now().toString().slice(-6)}`;

/** Chờ đúng response tạo/sửa ca. 🔴 Đăng ký TRƯỚC khi bấm Xác nhận. */
const choGhi = (page, method) =>
	page.waitForResponse(
		(r) => r.request().method() === method && r.url().includes('/timekeeping/shift'),
		{ timeout: 90_000 },
	);

test.describe('03a · 010/020 — Khai và sửa ca (GHI DỮ LIỆU)', () => {
	test.describe.configure({ mode: 'serial' });

	test.beforeEach(async ({ page }) => {
		await moManCa(page, VAI);
	});

	test('03a_010_002 — Thêm ca làm việc mới với đủ trường bắt buộc', async ({ page }) => {
		chanNeuTat('03a_010_002');

		const ten = TEN_RAC();
		const dr = await moDrawerThemCa(page);
		await dr.locator('#name').fill(ten);
		await chonKhungGio(page, dr, 'workTime', '14:00', '20:00');
		await chonKhungGio(page, dr, 'checkinTime', '13:00', '21:00');

		const cho = choGhi(page, 'POST');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		const res = await cho;
		expect(String((await res.json())?.status?.code)).toBe('200');

		await moManCa(page, VAI);
		const ds = (await dong(page).allInnerTexts()).map(chuan).join(' | ');
		expect(ds, `Ca vừa tạo "${ten}" không có trong danh sách`).toContain(ten);
	});

	test('03a_010_004 — Ca qua đêm được hiểu đúng khi giờ kết thúc sớm hơn giờ bắt đầu', async ({
		page,
	}) => {
		chanNeuTat('03a_010_004');

		const ten = TEN_RAC();
		const dr = await moDrawerThemCa(page);
		await dr.locator('#name').fill(ten);
		// 22:00 → 06:00 hôm sau: `normalizeRange` cộng 24h khi `end <= start`.
		await chonKhungGio(page, dr, 'workTime', '22:00', '06:00');
		await chonKhungGio(page, dr, 'checkinTime', '21:00', '07:00');

		const cho = choGhi(page, 'POST');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		expect(String((await (await cho).json())?.status?.code)).toBe('200');

		await moManCa(page, VAI);
		const i = await viTriTheoTen(page, ten);
		expect(i, `Không tìm thấy ca "${ten}" vừa tạo`).toBeGreaterThanOrEqual(0);
		// Tổng giờ phải là 8, 🚫 không phải âm hay 16 — đó mới là điều case này kiểm.
		expect(chuan(await dong(page).nth(i).locator('td').nth(3).innerText())).toContain('8');
	});

	/**
	 * Kỳ vọng user chốt 28/09/2026 (A3): tên toàn dấu cách bị CHẶN như bỏ trống — "Vui lòng nhập tên ca", không tạo ca.
	 * Trace vnpost-web f9c5c858 `pages/timekeeping/ShiftPage.jsx`: ô `name` chỉ có `required` (không `whitespace`), 🚫 trim ⇒ FE
	 * có thể gửi POST — chặn phải đến từ FE hoặc BE, đo cả hai.
	 */
	test('03a_010_009 — Tên ca nhập toàn khoảng trắng', async ({ page }) => {
		chanNeuTat('03a_010_009');
		const soTruoc = await dong(page).count();
		const dr = await moDrawerThemCa(page);
		await dr.locator('#name').fill('        ');
		await chonKhungGio(page, dr, 'workTime', '12:00', '13:00');
		await chonKhungGio(page, dr, 'checkinTime', '11:00', '14:00');
		const gui = [];
		const nghe = (r) => { if (r.request().method() === 'POST' && r.url().includes('/timekeeping/shift')) gui.push(r); };
		page.on('response', nghe);
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(3_000);
		const hop = page.locator('.ant-modal-confirm').last();
		if (await hop.isVisible().catch(() => false)) await hop.getByRole('button', { name: 'Tiếp tục lưu' }).click().catch(() => null);
		await page.waitForTimeout(2_000);
		page.off('response', nghe);
		const loiO = (await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).map(chuan);
		const tb = (await page.locator('.ant-message-notice').allInnerTexts()).map(chuan);
		const bodies = await Promise.all(gui.map((r) => r.json().catch(() => null)));
		await moManCa(page, VAI);
		const soSau = await dong(page).count();
		// Dọn: ca rác tên rỗng (nếu BE đã tạo) — xoá qua đúng API nút "Xoá" (`DELETE /timekeeping/shift?shopId&id`; ca chưa dùng xoá vĩnh viễn).
		for (const x of bodies) {
			const id = x?.data?.id ?? x?.data?.shiftId;
			const shopId = gui[0]?.request().postDataJSON()?.shopId;
			if (String(x?.status?.code) === '200' && id && shopId) {
				const del = await page.request.delete(`${process.env.VNPOST_BASE_URL}/__api/timekeeping/shift`, { params: { shopId, id }, headers: await gui[0].request().allHeaders() }).then((r) => r.json()).catch((e) => ({ loi: e.message }));
				test.info().annotations.push({ type: 'dọn', description: `xoá ca rác #${id}: ${JSON.stringify(del?.status ?? del)}` });
			}
		}
		test.info().annotations.push({ type: 'đo', description: `lỗi dưới ô ${JSON.stringify(loiO)} · toast ${JSON.stringify(tb)} · POST ${JSON.stringify(bodies.map((x) => x?.status))} · số ca ${soTruoc} → ${soSau}` });
		expect(soSau, '🔴 Tạo được ca có tên toàn dấu cách').toBe(soTruoc);
		expect(bodies.some((x) => String(x?.status?.code) === '200'), '🔴 BE nhận tên ca toàn dấu cách (POST 200)').toBe(false);
		expect([...loiO, ...tb].join(' | '), 'Không báo như bỏ trống "Vui lòng nhập tên ca"').toContain('Vui lòng nhập tên ca');
	});

	test('03a_010_013 — Ca chồng lấn một phần: chọn Tiếp tục lưu thì lưu được', async ({ page }) => {
		chanNeuTat('03a_010_013');

		const caCu = chuan(await dong(page).first().locator('td').nth(2).innerText());
		const m = caCu.match(/(\d{2}):\d{2}\s*-\s*(\d{2}):\d{2}/);
		if (!m) test.skip(true, 'Không đọc được khung giờ của ca hiện có để dựng chồng lấn.');

		const ten = TEN_RAC();
		const dr = await moDrawerThemCa(page);
		await dr.locator('#name').fill(ten);
		const lui = (g, n) => String(Math.max(5, Number(g) + n)).padStart(2, '0') + ':00';
		await chonKhungGio(page, dr, 'workTime', lui(m[1], -1), lui(m[2], -1));
		await chonKhungGio(page, dr, 'checkinTime', '05:00', '23:00');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(2_000);

		const hop = page.locator('.ant-modal-confirm').last();
		await expect(hop).toBeVisible({ timeout: 15_000 });
		const cho = choGhi(page, 'POST');
		await hop.getByRole('button', { name: 'Tiếp tục lưu' }).click();
		const res = await cho;
		expect(String((await res.json())?.status?.code)).toBe('200');

		await moManCa(page, VAI);
		expect((await dong(page).allInnerTexts()).join(' | ')).toContain(ten);
	});

	/**
	 * Kỳ vọng user chốt 28/09/2026 (A4): ca Ngừng hoạt động ĐƯỢC trùng giờ với ca đang hoạt động — chỉ kiểm chồng lấn giữa ca đang
	 * hoạt động. Trace `ShiftPage.jsx`: kiểm "cùng giờ" / "chồng lấn" chỉ chạy khi `values.active`; ô "Trạng thái" là Radio `active`.
	 * Dựng trùng KHÍT với ca đang hoạt động đầu danh sách. Ca rác mang tên AUTO TEST KHONG DUNG, ở trạng thái ngừng (không vào xếp lịch).
	 */
	test('03a_010_014 — Ca khai ở trạng thái Ngừng hoạt động KHÔNG bị kiểm chồng lấn', async ({ page }) => {
		chanNeuTat('03a_010_014');
		const dongHd = dong(page).filter({ hasText: 'Hoạt động' }).filter({ hasNotText: 'Ngừng hoạt động' }).first();
		const caCu = chuan(await dongHd.locator('td').nth(2).innerText().catch(() => ''));
		const m = caCu.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
		test.skip(!m, `Không có ca đang hoạt động đọc được khung giờ ("${caCu}")`);
		const ten = TEN_RAC();
		const dr = await moDrawerThemCa(page);
		await dr.locator('#name').fill(ten);
		await chonKhungGio(page, dr, 'workTime', m[1], m[2]);
		await chonKhungGio(page, dr, 'checkinTime', '05:00', '23:00');
		await dr.getByRole('radio', { name: 'Ngừng hoạt động' }).check();
		const cho = choGhi(page, 'POST');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'chồng lấn' });
		const res = await Promise.race([cho.then((r) => ({ r })), hop.waitFor({ state: 'visible', timeout: 15_000 }).then(() => ({ hop: true }))]).catch(() => ({}));
		const tb = (await page.locator('.ant-message-notice').allInnerTexts()).map(chuan);
		const b = res.r ? await res.r.json().catch(() => null) : null;
		test.info().annotations.push({ type: 'đo', description: `ca hoạt động "${caCu}" · ca mới "${ten}" ${m[1]}-${m[2]} Ngừng hoạt động · hỏi chồng lấn: ${Boolean(res.hop)} · toast ${JSON.stringify(tb)} · POST ${JSON.stringify(b?.status)}` });
		expect(res.hop, '🔴 Ca Ngừng hoạt động vẫn bị hỏi chồng lấn').toBeFalsy();
		expect(tb.join(' | '), '🔴 Ca Ngừng hoạt động bị chặn vì trùng giờ').not.toContain('Đã tồn tại ca cùng giờ');
		expect(String(b?.status?.code), `Không lưu được ca Ngừng hoạt động trùng giờ: ${JSON.stringify(b?.status)}`).toBe('200');
		await moManCa(page, VAI);
		expect((await dong(page).allInnerTexts()).join(' | ')).toContain(ten);
	});

	test('03a_010_018 — Sau khi thêm ca: danh sách tăng 1 dòng và Tổng giờ tính đúng', async ({
		page,
	}) => {
		chanNeuTat('03a_010_018');

		const soTruoc = await dong(page).count();
		const ten = TEN_RAC();
		const dr = await moDrawerThemCa(page);
		await dr.locator('#name').fill(ten);
		await chonKhungGio(page, dr, 'workTime', '09:00', '15:00');
		await chonKhungGio(page, dr, 'checkinTime', '08:00', '16:00');

		const cho = choGhi(page, 'POST');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		await page.waitForTimeout(2_000);

		expect(await dong(page).count(), 'Danh sách không tự tăng 1 dòng sau khi tạo').toBe(
			soTruoc + 1,
		);
		const i = await viTriTheoTen(page, ten);
		expect(chuan(await dong(page).nth(i).locator('td').nth(3).innerText())).toContain('6');
	});

	test('03a_020_001 — Sửa tên ca đã khai', async ({ page }) => {
		chanNeuTat('03a_020_001');

		const i = await viTriRac(page);
		if (i < 0) test.skip(true, 'Không có ca rác của auto test để sửa — 🚫 không đụng ca thật.');

		const tenMoi = TEN_RAC();
		const dr = await moDrawerSuaCa(page, i);
		await dr.locator('#name').fill(tenMoi);

		const cho = choGhi(page, 'PUT');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		await page.waitForTimeout(2_000);

		expect((await dong(page).allInnerTexts()).map(chuan).join(' | ')).toContain(tenMoi);
	});

	test('03a_020_002 — Chuyển ca sang Ngừng hoạt động thì không xếp lịch được nữa', async ({
		page,
	}) => {
		chanNeuTat('03a_020_002');

		const i = await viTriRac(page);
		if (i < 0) test.skip(true, 'Không có ca rác của auto test — 🚫 không ngừng ca thật.');
		const ten = chuan(await dong(page).nth(i).locator('td').nth(1).innerText());

		const dr = await moDrawerSuaCa(page, i);
		await dr.locator('#active').getByText('Ngừng hoạt động', { exact: true }).click();
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);
		const hop = page.locator('.ant-modal-confirm').last();
		const cho = choGhi(page, 'PUT');
		await hop.getByRole('button', { name: 'Ngừng hoạt động' }).click();
		expect(String((await (await cho).json())?.status?.code)).toBe('200');

		// Ca đã ngừng 🚫 không được xuất hiện trong ô chọn ca của drawer xếp lịch.
		const { moManLich } = require('./shift-page');
		await moManLich(page, VAI);
		await page.getByRole('button', { name: 'Xếp lịch làm việc' }).click();
		const dr2 = page.locator('.ant-drawer-open').last();
		await dr2.locator('#shiftId').click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		expect(nhan, `Ca "${ten}" đã ngừng mà vẫn xếp lịch được`).not.toContain(ten);
	});



	test('03a_020_005 — Xoá được ca chưa từng sử dụng', async ({ page }) => {
		chanNeuTat('03a_020_005');

		const i = await viTriRac(page);
		if (i < 0) test.skip(true, 'Không có ca rác của auto test để xoá — 🚫 không xoá ca thật.');
		const ten = chuan(await dong(page).nth(i).locator('td').nth(1).innerText());

		await dong(page).nth(i).locator('td').last().locator('button').nth(1).click();
		await page.waitForTimeout(1_200);
		const cho = choGhi(page, 'DELETE');
		await page
			.locator('.ant-modal-confirm, .ant-popover')
			.last()
			.getByRole('button', { name: /Xoá|Xóa|OK|Đồng ý/ })
			.click();
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		await page.waitForTimeout(2_000);

		expect((await dong(page).allInnerTexts()).map(chuan).join(' | ')).not.toContain(ten);
	});

	test('03a_020_010 — Sửa tên ca thành công báo đúng thông báo', async ({ page }) => {
		chanNeuTat('03a_020_010');

		const i = await viTriRac(page);
		if (i < 0) test.skip(true, 'Không có ca rác của auto test để sửa — 🚫 không đụng ca thật.');

		const dr = await moDrawerSuaCa(page, i);
		await dr.locator('#name').fill(TEN_RAC());
		const cho = choGhi(page, 'PUT');
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await cho;

		// 🔴 Ghi lại NGUYÊN VĂN thông báo — kịch bản chưa chốt được chuỗi này.
		const thongBao = (await page.locator('.ant-message').allInnerTexts()).map(chuan).join(' | ');
		console.log('03a_020_010 — thông báo thật:', thongBao);
		expect(thongBao, 'Sửa xong không có thông báo nào').not.toBe('');
	});
});

/** Vị trí dòng theo tên ca, hoặc -1. */
async function viTriTheoTen(page, ten) {
	const so = await dong(page).count();
	for (let i = 0; i < so; i += 1) {
		if (chuan(await dong(page).nth(i).locator('td').nth(1).innerText()) === chuan(ten)) return i;
	}
	return -1;
}

/** Vị trí ca RÁC do auto test tạo — 🔴 mọi case sửa/xoá chỉ được đụng vào nhóm này. */
async function viTriRac(page) {
	const so = await dong(page).count();
	for (let i = 0; i < so; i += 1) {
		if (chuan(await dong(page).nth(i).locator('td').nth(1).innerText()).startsWith('AUTO TEST')) {
			return i;
		}
	}
	return -1;
}
