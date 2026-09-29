'use strict';

/**
 * Task 040 (xếp lịch) + 050 (huỷ lịch) — các case GHI, chạy trên **điểm bán seed**
 * (`AUTO_SHOP_62391304`, vai `seed_shop`), 🚫 không trên Lý Sơn.
 *
 * 🔴 Mọi case chỉ đụng lịch của MỘT nhân viên riêng (`data.tenNhanVien`, mặc định
 *    `AUTO_NV_65402390`) — 🚫 không dùng `AUTO_NV_68051351` / `AUTO_NV_64359388`: hai người đó mang
 *    lịch hôm nay mà bộ dựng nền của 03b cần. Huỷ nhầm là 03b skip hàng loạt.
 * 🔴 Chỉ ghi lịch từ NGÀY MAI trở đi (trừ `050_002` cần một lịch đã chấm công hôm nay), và mọi
 *    case huỷ lại lịch mình vừa tạo trong `finally`.
 *
 * Đối chiếu bằng response `GET /timekeeping/schedule` mà CHÍNH màn hình gọi để vẽ lưới (khoảng
 * ≈ ±3 tuần quanh hôm nay) — lưới chỉ hiện một tuần nên 🚫 không đủ để kiểm ngày ở tuần sau.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { chuan, drawer, ROUTE } = require('./shift-page');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_shop';
const NGAY = 24 * 3600 * 1000;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** 00:00 giờ Việt Nam (+7) của ngày cách hôm nay `n` ngày, dạng ms. */
const dauNgay = (n = 0) => {
	const vn = Date.now() + 7 * 3600 * 1000;
	return Math.floor(vn / NGAY) * NGAY - 7 * 3600 * 1000 + n * NGAY;
};
const ddmmyyyy = (ms) => {
	const d = new Date(ms + 7 * 3600 * 1000);
	const p = (x) => String(x).padStart(2, '0');
	return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};
/** 1 = T2 … 7 = CN, theo giờ VN. */
const thu = (ms) => ((new Date(ms + 7 * 3600 * 1000).getUTCDay() + 6) % 7) + 1;

/**
 * Chờ body JSON của response KẾ TIẾP khớp `khop` (request) và trả HTTP 200.
 *
 * 🔴 `(await page.waitForResponse(...)).json()` ném *"No resource with given identifier"* khi
 *    trang điều hướng/nạp lại ngay sau response (đăng nhập lại của `moTrang`, lưới tự nạp lại sau
 *    khi ghi) — trình duyệt đã bỏ body. Đọc body NGAY TRONG predicate (async) thì còn nguyên.
 * 🔴 `page.route('**\/*')` + `route.fetch()` cũng tránh được lỗi đó nhưng làm treo request của
 *    app (đo 23/09: 5/6 case hết 60–90s) — 🚫 đừng quay lại cách đó.
 * Mặc định bỏ qua response khác 200 (401 của phiên cũ), chờ tiếp lần gọi sau.
 */
async function choJson(page, khop, timeout = 90_000, moiTrangThai = false) {
	let body;
	const cho = page.waitForResponse(
		async (r) => {
			if (!khop(r.request()) || (!moiTrangThai && r.status() !== 200)) return false;
			body = await r.json().catch(() => undefined);
			return body !== undefined;
		},
		{ timeout },
	);
	return { body: cho.then(() => body) };
}

/** Request lưới lịch — GET toàn điểm bán, không lọc nhân viên. */
const laLuoi = (q) =>
	q.url().includes('/timekeeping/schedule?') && !q.url().includes('employeeId=') && q.method() === 'GET';

function docLuoi(body) {
	expect(String(body?.status?.code), 'API lịch không trả 200').toBe('200');
	return body.data ?? [];
}

/** Mở màn lịch, trả { lich, nhanVien: {ten → sysUserId}, ca: {ten → id} }. */
async function moManLich(page) {
	const choLuoi = await choJson(page, laLuoi);
	const choNv = await choJson(page, (q) => q.url().includes('/chain-employment-profile/filter-employ-by-shopId'));
	const choCa = await choJson(page, (q) => q.url().includes('/timekeeping/shift-all'));
	await moTrang(page, ROUTE.lich, VAI);
	const [bl, bn, bc] = await Promise.all([choLuoi.body, choNv.body, choCa.body]);
	const nhanVien = {};
	for (const e of bn?.data ?? []) nhanVien[chuan(e.name || e.email)] = e.sysUserId;
	const ca = {};
	for (const x of bc?.data ?? []) ca[chuan(x.name)] = x.id ?? x.shiftId;
	return { lich: docLuoi(bl), nhanVien, ca };
}

/** Chạy `viec`, rồi trả lưới lịch màn hình nạp lại NGAY SAU đó. */
async function sauKhi(page, viec) {
	const cho = await choJson(page, laLuoi, 60_000);
	await viec();
	return docLuoi(await cho.body);
}

// Request GHI: nhận MỌI mã HTTP — lỗi nghiệp vụ như `SSHOP-401` đi kèm HTTP 401, bỏ qua là treo.
const batBody = (page, khop) => choJson(page, khop, 60_000, true);

const cua = (lich, empId) => lich.filter((s) => s.employeeId === empId);

async function chonTrongSelect(page, dr, id, nhan) {
	await dr.locator(`#${id}`).click();
	const dd = page.locator(`.ant-select-dropdown:has(#${id}_list)`);
	await dd.waitFor({ state: 'visible', timeout: 15_000 });
	const opt = dd.locator('.ant-select-item-option').filter({ hasText: nhan });
	await expect(opt, `Ô ${id} không có lựa chọn "${nhan}"`).toHaveCount(1, { timeout: 15_000 });
	await opt.click();
	await page.keyboard.press('Escape');
}

async function dienNgay(page, o, ms) {
	await o.click();
	await o.fill(ddmmyyyy(ms));
	await page.keyboard.press('Enter');
	await expect(o).toHaveValue(ddmmyyyy(ms));
}

async function moDrawerXepLich(page) {
	await page.getByRole('button', { name: 'Xếp lịch làm việc' }).click();
	const dr = drawer(page);
	await expect(dr.locator('.ant-drawer-title')).toHaveText('Thêm lịch làm việc', { timeout: 20_000 });
	await dr.locator('#employeeIds').waitFor({ state: 'visible', timeout: 20_000 });
	return dr;
}

/** Xếp lịch một ngày qua drawer; trả lưới sau khi lưu. */
async function xepMotNgay(page, tenNv, tenCa, ms) {
	const dr = await moDrawerXepLich(page);
	await chonTrongSelect(page, dr, 'employeeIds', tenNv);
	await dienNgay(page, dr.locator('#targetDate'), ms);
	await chonTrongSelect(page, dr, 'shiftId', tenCa);
	const choPost = await batBody(
		page,
		(q) => /\/timekeeping\/schedule$/.test(q.url().split('?')[0]) && q.method() === 'POST',
	);
	const lich = await sauKhi(page, async () => {
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		const body = await choPost.body;
		expect(String(body?.status?.code), `Xếp lịch thất bại: ${JSON.stringify(body?.status)}`).toBe('200');
	});
	return lich;
}

/** Hộp thoại huỷ lịch: `pham` = 'FUTURE' | 'ALL'. Trả { lich, removed, thongBao }. */
async function huyLich(page, tenNv, pham, tuNgay) {
	await page.getByRole('button', { name: 'stop Huỷ lịch' }).click();
	const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
	await expect(hop.locator('.ant-drawer-title, .ant-modal-title')).toHaveText('Huỷ lịch làm việc', {
		timeout: 20_000,
	});
	await hop.locator('.ant-select').first().click();
	const dd = page.locator('.ant-select-dropdown:visible').last();
	const opt = dd.locator('.ant-select-item-option').filter({ hasText: tenNv });
	await expect(opt, `Hộp thoại huỷ không có nhân viên "${tenNv}"`).toHaveCount(1, { timeout: 15_000 });
	await opt.click();
	await page.keyboard.press('Escape');

	await hop
		.locator('.ant-radio-wrapper')
		.filter({ hasText: pham === 'ALL' ? 'Tất cả các lịch' : 'Từ một ngày trở đi' })
		.click();
	if (pham === 'FUTURE') await dienNgay(page, hop.locator('.ant-picker input').first(), tuNgay);

	const choPut = await batBody(page, (q) => q.url().includes('/timekeeping/schedule/cancel') && q.method() === 'PUT');
	let removed = null;
	const lich = await sauKhi(page, async () => {
		await hop.getByRole('button', { name: 'Xác nhận huỷ' }).click();
		const body = await choPut.body;
		expect(String(body?.status?.code), `Huỷ lịch thất bại: ${JSON.stringify(body?.status)}`).toBe('200');
		removed = Number(body?.data);
	});
	const thongBao = (await page.locator('.ant-message').allInnerTexts()).map(chuan).join(' | ');
	return { lich, removed, thongBao };
}

/** Dọn: huỷ mọi lịch CHƯA chấm công của nhân viên từ ngày mai — chạy trong `finally`. */
async function donTuNgayMai(page, tenNv) {
	await moManLich(page);
	await huyLich(page, tenNv, 'FUTURE', dauNgay(1));
}

test.describe('03a · 040/050 — Xếp & huỷ lịch (ghi thật, điểm bán seed)', () => {
	test.describe.configure({ timeout: 300_000 });

	test('03a_040_001 — Xếp lịch một ngày cho một nhân viên', async ({ page }) => {
		const i = chanNeuTat('03a_040_001');
		const { tenNhanVien: tenNv, tenCa } = i.data;
		const { nhanVien, ca } = await moManLich(page);
		const empId = nhanVien[chuan(tenNv)];
		expect(empId, `Điểm bán seed không có nhân viên ${tenNv}`).toBeTruthy();
		const shiftId = ca[chuan(tenCa)];
		expect(shiftId, `Điểm bán seed không có ca ${tenCa}`).toBeTruthy();

		const ngay = dauNgay(2);
		try {
			const lich = await xepMotNgay(page, tenNv, tenCa, ngay);
			const khop = cua(lich, empId).filter((s) => s.date === ngay && s.shiftId === shiftId);
			expect(khop.length, `Lưới không có lịch ${tenCa} ngày ${ddmmyyyy(ngay)} của ${tenNv}`).toBe(1);
			expect(khop[0].status, 'Lịch vừa xếp không ở trạng thái chờ chấm công').toBe('PENDING');
			// Không lan sang người khác hoặc ngày khác.
			const lech = lich.filter(
				(s) => s.date === ngay && s.shiftId === shiftId && s.employeeId !== empId && s.scheduleId > khop[0].scheduleId,
			);
			expect(lech, 'Xếp cho một người mà sinh lịch cho người khác').toEqual([]);
		} finally {
			await donTuNgayMai(page, tenNv);
		}
	});

	test('03a_040_004 — Xếp lịch lặp lại theo thứ trong tuần', async ({ page }) => {
		const i = chanNeuTat('03a_040_004');
		const { tenNhanVien: tenNv, tenCa } = i.data;
		const { nhanVien, ca } = await moManLich(page);
		const empId = nhanVien[chuan(tenNv)];
		const shiftId = ca[chuan(tenCa)];
		expect(empId && shiftId, `Thiếu nhân viên ${tenNv} hoặc ca ${tenCa} ở điểm bán seed`).toBeTruthy();

		const tu = dauNgay(1);
		const den = dauNgay(7);
		const THU = { T2: 1, T4: 3, T6: 5 };
		try {
			const dr = await moDrawerXepLich(page);
			await chonTrongSelect(page, dr, 'employeeIds', tenNv);
			await dr.getByText('Lặp lại', { exact: true }).click();
			await dienNgay(page, dr.locator('#startDate'), tu);
			await dienNgay(page, dr.locator('#endDate'), den);

			const oCa = dr.locator('.ant-select').filter({ hasText: 'Chọn ca' }).first();
			await oCa.click();
			const ddCa = page.locator('.ant-select-dropdown:visible').last();
			await ddCa.locator('.ant-select-item-option').filter({ hasText: tenCa }).first().click();
			await page.keyboard.press('Escape');
			for (const t of Object.keys(THU)) await dr.getByText(t, { exact: true }).click();

			const choPost = await batBody(page, (q) => q.url().includes('/timekeeping/schedule/batch') && q.method() === 'POST');
			const lich = await sauKhi(page, async () => {
				await dr.getByRole('button', { name: 'Xác nhận' }).click();
				const body = await choPost.body;
				expect(String(body?.status?.code), `Xếp lịch lặp thất bại: ${JSON.stringify(body?.status)}`).toBe('200');
			});

			const trongKhoang = cua(lich, empId).filter((s) => s.date >= tu && s.date <= den && s.shiftId === shiftId);
			const ngayKyVong = [];
			for (let n = tu; n <= den; n += NGAY) if (Object.values(THU).includes(thu(n))) ngayKyVong.push(n);
			expect(ngayKyVong.length, 'Khoảng một tuần phải chứa đủ T2/T4/T6').toBe(3);
			expect(
				[...new Set(trongKhoang.map((s) => s.date))].sort().map(ddmmyyyy),
				'Lịch lặp không đúng các ngày T2, T4, T6',
			).toEqual(ngayKyVong.map(ddmmyyyy));
		} finally {
			await donTuNgayMai(page, tenNv);
		}
	});

	test('03a_050_001 — Huỷ lịch từ một ngày trở đi', async ({ page }) => {
		const i = chanNeuTat('03a_050_001');
		const { tenNhanVien: tenNv, tenCa } = i.data;
		const { nhanVien } = await moManLich(page);
		const empId = nhanVien[chuan(tenNv)];
		expect(empId, `Điểm bán seed không có nhân viên ${tenNv}`).toBeTruthy();

		const truoc = dauNgay(2);
		const sau = dauNgay(4);
		try {
			await xepMotNgay(page, tenNv, tenCa, truoc);
			const daXep = await xepMotNgay(page, tenNv, tenCa, sau);
			expect(cua(daXep, empId).filter((s) => [truoc, sau].includes(s.date)).length, 'Dựng lịch hai ngày không thành').toBe(2);

			const { lich, removed } = await huyLich(page, tenNv, 'FUTURE', dauNgay(3));
			const con = cua(lich, empId);
			expect(removed, 'Backend không báo đã huỷ đúng 1 lịch').toBe(1);
			expect(con.some((s) => s.date === sau), `Lịch ngày ${ddmmyyyy(sau)} (sau mốc) vẫn còn`).toBe(false);
			expect(con.some((s) => s.date === truoc), `Lịch ngày ${ddmmyyyy(truoc)} (trước mốc) bị huỷ theo`).toBe(true);
		} finally {
			await donTuNgayMai(page, tenNv);
		}
	});

	test('03a_050_002 — Lịch đã chấm công không bị huỷ', async ({ page }) => {
		const i = chanNeuTat('03a_050_002');
		const { tenNhanVien: tenNv, tenCa } = i.data;
		let { lich, nhanVien } = await moManLich(page);
		const empId = nhanVien[chuan(tenNv)];
		expect(empId, `Điểm bán seed không có nhân viên ${tenNv}`).toBeTruthy();

		const homNay = dauNgay(0);
		const mai = dauNgay(1);
		try {
			// 1) Một lịch ĐÃ chấm công hôm nay. Lượt trước để lại thì dùng luôn (🚫 không huỷ được).
			let daCham = cua(lich, empId).find((s) => s.date === homNay && s.checkInTime);
			if (!daCham) {
				let homNayChua = cua(lich, empId).find((s) => s.date === homNay && !s.checkInTime);
				if (!homNayChua) {
					lich = await xepMotNgay(page, tenNv, tenCa, homNay);
					homNayChua = cua(lich, empId).find((s) => s.date === homNay && !s.checkInTime);
				}
				expect(homNayChua, 'Không dựng được lịch hôm nay để chấm công').toBeTruthy();

				// Chấm công hộ ở drawer của chính lịch đó (bấm chip trên lưới tuần hiện tại).
				const oNgay = page.locator('.work-schedule-day').filter({ hasText: ddmmyyyy(homNay).slice(0, 5) });
				await oNgay.locator('.work-schedule-assignment').filter({ hasText: tenNv }).first().click();
				const dr = drawer(page);
				const oGioDen = dr.locator('#checkInTime');
				await oGioDen.waitFor({ state: 'visible', timeout: 20_000 });
				// 🔴 Drawer chấm công hộ bắt buộc CẢ giờ đến lẫn giờ về ("Vui lòng nhập giờ về") —
				//    chỉ điền giờ đến thì form chặn tại chỗ, 🚫 không request nào đi.
				const h = Math.min(new Date(Date.now() + 7 * 3600 * 1000).getUTCHours(), 21);
				for (const [id, gio] of [['#checkInTime', h], ['#checkOutTime', h + 1]]) {
					const o = dr.locator(id);
					await o.click();
					await o.fill(`${String(gio).padStart(2, '0')}:00`);
					await page.keyboard.press('Enter');
				}
				const choCham = await batBody(page, (q) => q.url().includes('/timekeeping/schedule/admin/') && q.method() === 'POST');
				await dr.getByRole('button', { name: 'Xác nhận' }).click();
				const kqCham = await choCham.body;
				// 🔴 Đo 23/09/2026: vai Cửa hàng trưởng của điểm bán seed nhận `SSHOP-401` ở
				//    `/timekeeping/schedule/admin/update` ⇒ 🚫 không tự dựng được lịch "đã chấm công".
				//    Đây là thiếu quyền của vai, 🚫 không phải lỗi sản phẩm của chức năng huỷ lịch.
				if (String(kqCham?.status?.code) === 'SSHOP-401') {
					test.skip(
						true,
						'Vai seed_shop (Cửa hàng trưởng) không có quyền chấm công hộ (SSHOP-401 ở /timekeeping/schedule/admin/update) ' +
							'⇒ không dựng được lịch đã chấm công cho nhân viên riêng của case.',
					);
				}
				expect(String(kqCham?.status?.code), `Chấm công hộ thất bại: ${JSON.stringify(kqCham?.status)}`).toBe('200');
				lich = (await moManLich(page)).lich;
				daCham = cua(lich, empId).find((s) => s.scheduleId === homNayChua.scheduleId);
				expect(daCham?.checkInTime, 'Chấm công hộ xong mà lịch vẫn chưa có giờ đến').toBeTruthy();
			}

			// 2) Một lịch CHƯA chấm công ngày mai.
			lich = await xepMotNgay(page, tenNv, tenCa, mai);
			const chuaCham = cua(lich, empId).find((s) => s.date === mai && !s.checkInTime);
			expect(chuaCham, 'Không dựng được lịch chưa chấm công ngày mai').toBeTruthy();

			// 3) Huỷ «Tất cả các lịch».
			const kq = await huyLich(page, tenNv, 'ALL');
			const con = cua(kq.lich, empId);
			expect(con.some((s) => s.scheduleId === chuaCham.scheduleId), 'Lịch chưa chấm công vẫn còn').toBe(false);
			expect(con.some((s) => s.scheduleId === daCham.scheduleId), 'Lịch ĐÃ chấm công bị huỷ theo').toBe(true);
		} finally {
			await donTuNgayMai(page, tenNv);
		}
	});

	test('03a_050_005 — Huỷ phạm vi «Tất cả các lịch» báo đúng SỐ lịch đã huỷ', async ({ page }) => {
		const i = chanNeuTat('03a_050_005');
		const { tenNhanVien: tenNv, tenCa } = i.data;
		const n = Number(i.data.soLich ?? 2);
		const { nhanVien } = await moManLich(page);
		const empId = nhanVien[chuan(tenNv)];
		expect(empId, `Điểm bán seed không có nhân viên ${tenNv}`).toBeTruthy();

		try {
			// Đưa nhân viên về 0 lịch chưa chấm công, để "đúng N lịch" là con số ta tự dựng.
			await huyLich(page, tenNv, 'ALL');
			for (let k = 0; k < n; k += 1) await xepMotNgay(page, tenNv, tenCa, dauNgay(2 + k));

			const kq = await huyLich(page, tenNv, 'ALL');
			expect(kq.removed, `Backend không trả đúng ${n} lịch đã huỷ`).toBe(n);
			expect(kq.thongBao, 'Thông báo không nói đúng số lịch đã huỷ').toContain(`Đã huỷ ${n} lịch của ${tenNv}`);
			expect(
				cua(kq.lich, empId).filter((s) => !s.checkInTime),
				'Sau khi huỷ tất cả, lưới vẫn còn lịch chưa chấm công của nhân viên',
			).toEqual([]);
		} finally {
			await donTuNgayMai(page, tenNv);
		}
	});

	test('03a_050_006 — Huỷ khi không có lịch nào phù hợp', async ({ page }) => {
		const i = chanNeuTat('03a_050_006');
		const { tenNhanVien: tenNv } = i.data;
		const { lich, nhanVien } = await moManLich(page);
		const empId = nhanVien[chuan(tenNv)];
		expect(empId, `Điểm bán seed không có nhân viên ${tenNv}`).toBeTruthy();

		// Mốc X thật xa ⇒ chắc chắn không có lịch nào từ X trở đi.
		const x = dauNgay(120);
		const truoc = cua(lich, empId).length;
		const kq = await huyLich(page, tenNv, 'FUTURE', x);
		expect(kq.removed, 'Backend báo có lịch bị huỷ dù không có lịch nào từ mốc X').toBe(0);
		expect(kq.thongBao, 'Không thấy thông báo nguyên văn').toContain('Không có lịch nào phù hợp để huỷ');
		expect(kq.thongBao, 'Không có gì để huỷ mà vẫn báo "Đã huỷ"').not.toMatch(/Đã huỷ \d+ lịch/);
		expect(cua(kq.lich, empId).length, 'Lưới đổi dù không huỷ gì').toBe(truoc);
	});
});
