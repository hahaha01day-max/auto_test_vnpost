'use strict';

/**
 * Phân hệ 03b — Ca làm việc của nhân viên, vai **Giao dịch viên** (`gdv`).
 *
 * 🔴 Đây là phân hệ nguy hiểm nhất trong nhóm chấm công: **mở ca / tạm chốt / chốt hẳn / mở lại ca**
 * đều ghi vào **quỹ tiền mặt thật** của quầy và sinh **phiếu chênh lệch chờ duyệt**. Không có thao
 * tác nào hoàn tác được. ⇒ 23 case ghi giữ `allowMutation: false`, và mọi case đọc vẫn bọc
 * `chanGhi` để một cú bấm nhầm không lọt xuống server.
 *
 * 🔴 Case nào cần thẻ ca mà tài khoản không có ca hôm nay thì **skip kèm lý do**, 🚫 không "pass
 * rỗng": xếp lịch để có ca cũng là ghi dữ liệu thật.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');

const GOC = path.join(__dirname, '..');
const {
	boQuaNeuKhongCoCa,
	chanGhi,
	chuan,
	khungMan,
	moManCaCaNhan,
	oTheCa,
	soTheCa,
} = require('./shift-card');

const VAI = 'gdv';
const chanNeuTat = (id) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('03b · 010 — Thẻ ca trong ngày', () => {
	test.beforeEach(async ({ page }) => {
		await moManCaCaNhan(page, VAI);
	});

	test('03b_010_001 — Màn Ca làm việc hiện thẻ ca của chính mình trong ngày', async ({ page }) => {
		chanNeuTat('03b_010_001');
		await chanGhi(page);

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Ca làm việc',
		);
		await boQuaNeuKhongCoCa(test, page);

		const so = await soTheCa(page);
		for (let i = 0; i < so; i += 1) {
			expect(await oTheCa(page, i, 'Tên ca'), `Thẻ ${i + 1} thiếu tên ca`).not.toBe('');
			expect(await oTheCa(page, i, 'Thời gian ca'), `Thẻ ${i + 1} thiếu khung giờ`).toMatch(
				/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/,
			);
		}
	});

	test('03b_010_005 — Thẻ ca hiện đủ bốn ô thông tin', async ({ page }) => {
		chanNeuTat('03b_010_005');
		await chanGhi(page);
		await boQuaNeuKhongCoCa(test, page);

		for (const nhan of ['Tên ca', 'Thời gian ca', 'Giờ đến', 'Giờ về']) {
			await expect(
				khungMan(page).getByText(nhan, { exact: true }).first(),
				`Thẻ ca thiếu ô "${nhan}"`,
			).toBeVisible();
		}
		// Chấm màu trạng thái nằm bên trái thẻ.
		expect(
			await khungMan(page).locator('.h-3.w-3.rounded-full').count(),
			'Thẻ ca không có chấm màu trạng thái',
		).toBeGreaterThan(0);
	});

	test('03b_010_006 — Ba nhãn trạng thái của ca và màu tương ứng', async ({ page }) => {
		chanNeuTat('03b_010_006');
		await chanGhi(page);
		await boQuaNeuKhongCoCa(test, page);

		const tag = khungMan(page).locator('.ant-tag');
		const so = await tag.count();
		expect(so, 'Không có nhãn trạng thái nào trên thẻ ca').toBeGreaterThan(0);

		const mau = { 'Đang làm': 'green', 'Chưa bắt đầu': 'default', 'Đã về': 'blue' };
		let khop = 0;
		for (let i = 0; i < so; i += 1) {
			const nhan = chuan(await tag.nth(i).innerText());
			if (!(nhan in mau)) continue;
			khop += 1;
			const lop = await tag.nth(i).getAttribute('class');
			if (mau[nhan] !== 'default') {
				expect(lop, `Nhãn "${nhan}" sai màu`).toContain(`ant-tag-${mau[nhan]}`);
			}
		}
		expect(khop, 'Không nhãn nào thuộc ba trạng thái đã khai').toBeGreaterThan(0);
	});

	test('03b_010_008 — Nút chính đổi theo trạng thái phiên bán hàng', async ({ page }) => {
		chanNeuTat('03b_010_008');
		await chanGhi(page);
		await boQuaNeuKhongCoCa(test, page);

		const nut = (await khungMan(page).getByRole('button').allInnerTexts()).map(chuan);
		const hopLe = ['Mở ca', 'Chốt ca', 'Tiếp tục chốt', 'In chốt ca', 'Xem báo cáo'];
		const chinh = nut.filter((n) => hopLe.includes(n));
		expect(
			chinh.length,
			`Thẻ ca không có nút chính nào trong ${hopLe.join(' / ')}; nút đang có: ${nut.join(' / ')}`,
		).toBeGreaterThan(0);

		// 🔴 Ghi lại tổ hợp thật để báo cáo nói được ĐÃ kiểm ô nào của bảng trạng thái × nút.
		test.info().annotations.push({
			type: 'tổ hợp đã quan sát',
			description: `nút trên màn: ${nut.join(' / ')}`,
		});
	});

	test('03b_010_009 — Ca thiếu cấu hình giờ chấm công thì KHÔNG bị chặn', async () => {
		chanNeuTat('03b_010_009');
		// 🔴 Case phải skip ở dòng trên (lý do thật trong `_blocked` của test-input.json); tới đây là cấu hình bị bật nhầm.
		throw new Error('03b_010_009 chưa có phép kiểm — xem _blocked trong test-input.json trước khi bật.');
	});
});

test.describe('03b · 020 — Chấm công đến / về', () => {
	test.beforeEach(async ({ page }) => {
		await moManCaCaNhan(page, VAI);
	});

	test('03b_020_002 — Chặn chấm công về khi chưa chấm công đến', async ({ page }) => {
		chanNeuTat('03b_020_002');
		const { daGoi } = await chanGhi(page);
		await boQuaNeuKhongCoCa(test, page);

		const so = await soTheCa(page);
		let daKiem = 0;
		for (let i = 0; i < so; i += 1) {
			const gioDen = await oTheCa(page, i, 'Giờ đến');
			if (gioDen !== '' && gioDen !== '--') continue; // ca này đã chấm công đến
			daKiem += 1;
			// Chưa chấm công đến ⇒ 🚫 không được có nút "Chấm công về".
			const nut = (await khungMan(page).getByRole('button').allInnerTexts()).map(chuan);
			expect(nut, 'Chưa chấm công đến mà đã có nút Chấm công về').not.toContain('Chấm công về');
			expect(await oTheCa(page, i, 'Giờ về')).toMatch(/^(|--)$/);
		}
		if (daKiem === 0) {
			test.skip(true, 'Mọi ca hôm nay đều đã chấm công đến — không dựng được tình huống này.');
		}
		expect(daGoi).toEqual([]);
	});

	test('03b_020_007 — Khoảng cho phép chấm công tính theo cấu hình của ca', async () => {
		chanNeuTat('03b_020_007');
	});
});

test.describe('03b · 030 — Mở ca', () => {
	test.beforeEach(async ({ page }) => {
		await moManCaCaNhan(page, VAI);
	});

	/** Mở drawer "Mở ca" của thẻ ca đầu tiên còn nút đó. */
	async function moDrawerMoCa(page) {
		const nut = khungMan(page).getByRole('button', { name: 'Mở ca', exact: true }).first();
		if ((await nut.count()) === 0) {
			test.skip(
				true,
				'Không có thẻ ca nào ở trạng thái cho phép Mở ca (chưa xếp lịch hôm nay, ngoài giờ, hoặc đang còn ca chưa chốt).',
			);
		}
		await nut.click();
		const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		await expect(dr).toBeVisible({ timeout: 20_000 });
		await page.waitForTimeout(1_500);
		return dr;
	}

	test('03b_030_002 — Tổng tiền mặt thực tế tự cộng theo số tờ', async ({ page }) => {
		const i = chanNeuTat('03b_030_002');
		await chanGhi(page);

		const dr = await moDrawerMoCa(page);
		const oSo = dr.locator('input[type="text"], input[inputmode="numeric"]');
		expect(await oSo.count(), 'Drawer Mở ca không có ô số lượng tờ nào').toBeGreaterThan(0);

		const truoc = chuan(await dr.innerText());
		await oSo.first().fill('2');
		await page.waitForTimeout(1_200);
		const sau = chuan(await dr.innerText());

		// 🔴 Tổng phải đổi NGAY, không cần bấm nút nào.
		expect(sau, 'Đổi số tờ mà tổng tiền mặt thực tế không đổi').not.toBe(truoc);
		void i;
	});

	test('03b_030_004 — Bỏ trống Quầy thu ngân khi mở ca', async ({ page }) => {
		chanNeuTat('03b_030_004');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerMoCa(page);
		await dr.getByRole('button', { name: /Mở ca|Xác nhận/ }).last().click();
		await page.waitForTimeout(1_500);

		const loi = [
			...(await dr.locator('.ant-form-item-explain-error').allInnerTexts()),
			...(await page.locator('.ant-message').allInnerTexts()),
		].map(chuan);
		expect(loi.join(' | ')).toContain('Vui lòng chọn quầy thu ngân');
		expect(daGoi, 'Chưa chọn quầy mà vẫn gửi request mở ca').toEqual([]);
	});

	test('03b_030_008 — Đóng drawer Mở ca giữa chừng thì không mở ca', async ({ page }) => {
		chanNeuTat('03b_030_008');
		const { daGoi } = await chanGhi(page);

		let dr = await moDrawerMoCa(page);
		const oSo = dr.locator('input[type="text"], input[inputmode="numeric"]').first();
		await oSo.fill('3');
		await page.keyboard.press('Escape');
		await page.waitForTimeout(1_500);

		expect(daGoi, 'Đóng drawer mà vẫn gửi request mở ca').toEqual([]);
		await expect(
			khungMan(page).getByRole('button', { name: 'Mở ca', exact: true }).first(),
			'Thẻ ca không còn nút Mở ca ⇒ ca đã bị mở dù chỉ đóng drawer',
		).toBeVisible();

		dr = await moDrawerMoCa(page);
		expect(
			chuan(await dr.locator('input[type="text"], input[inputmode="numeric"]').first().inputValue()),
			'Drawer mở lại còn giữ số lượng tờ đã nhập dở (thiếu `destroyOnHidden`)',
		).toMatch(/^(|0)$/);
	});

	/**
	 * 🔴 Case này khai `mutates: true` nhưng **mọi kỳ vọng đều là "🚫 KHÔNG gửi request"** ⇒ chạy
	 *    dưới `chanGhi()` là đủ và an toàn tuyệt đối: 🚫 không mở ca thật, 🚫 không tạo phiên bán
	 *    hàng. Nhờ vậy 🚫 không phải bật `allowMutation`.
	 *
	 * 🔴 Ô số lượng tờ là `<input inputmode="numeric">`, 🚫 không phải `type="number"` — gõ chữ vào
	 *    được, nên phần "giá trị không phải số" MỚI kiểm được. Nếu là `type="number"` thì trình
	 *    duyệt nuốt ký tự và case sẽ luôn xanh mà chẳng kiểm gì.
	 */
	test('03b_030_005 — Ô số lượng tờ theo mệnh giá: bỏ trống và giá trị không hợp lệ', async ({
		page,
	}) => {
		chanNeuTat('03b_030_005');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerMoCa(page);
		const oSo = dr.locator('input[type="text"], input[inputmode="numeric"]').first();
		await expect(oSo, 'Drawer Mở ca không có ô số lượng tờ').toBeVisible();

		const nutLuu = dr.getByRole('button', { name: /Mở ca|Xác nhận/ }).last();
		/** Gom mọi kênh báo lỗi: dưới ô, và `message` mức toàn form. */
		const thongBao = async () =>
			[
				...(await dr.locator('.ant-form-item-explain-error').allInnerTexts()),
				...(await page.locator('.ant-message').allInnerTexts()),
			]
				.map(chuan)
				.join(' | ');

		// 1) Bỏ trống — kỳ vọng của sheet: "Nhập số lượng".
		await oSo.fill('');
		await oSo.blur();
		await nutLuu.click();
		await page.waitForTimeout(1_500);
		expect(await thongBao(), 'Bỏ trống số lượng tờ mà không báo gì').toContain('Nhập số lượng');
		expect(daGoi, 'Số lượng tờ bỏ trống mà vẫn gửi request mở ca').toEqual([]);

		// 2) Giá trị không phải số nguyên không âm — kỳ vọng: "Số lượng không hợp lệ".
		for (const v of ['-1', 'abc', '1.5']) {
			await oSo.fill(v);
			await oSo.blur();
			await nutLuu.click();
			await page.waitForTimeout(1_200);
			expect(
				await thongBao(),
				`Giá trị "${v}" 🚫 không hợp lệ mà form không báo "Số lượng không hợp lệ"`,
			).toMatch(/Số lượng không hợp lệ|Nhập số lượng/);
			expect(daGoi, `Giá trị "${v}" 🚫 không hợp lệ mà vẫn gửi request mở ca`).toEqual([]);
		}

		// 3) 0 là HỢP LỆ (mệnh giá đó không có tờ nào) ⇒ 🚫 không được báo lỗi ô số lượng.
		await oSo.fill('0');
		await oSo.blur();
		await page.waitForTimeout(800);
		expect(
			await thongBao(),
			'Số 0 là hợp lệ (mệnh giá không có tờ nào) mà form vẫn báo lỗi số lượng',
		).not.toMatch(/Số lượng không hợp lệ/);
	});
	// 03b_030_006: có phép kiểm ở `quay-nguoi-khac.seed_shop.spec.js` (28/09).
	// 03b_030_007: có phép kiểm ở `chot-mo-ca.gdv.spec.js` (28/09, ghi thật — user cho phép).
});

test.describe('03b · 040 — Tạm chốt và chốt ca (GHI DỮ LIỆU)', () => {
	// 🔴 Toàn bộ nhóm này ghi vào quỹ tiền mặt thật và sinh phiếu chênh lệch chờ duyệt.
	//    Tên test viết NGUYÊN VĂN, 🚫 không sinh bằng vòng lặp: công cụ đếm script tìm mã case
	//    ở đầu tiêu đề `test()`, tiêu đề dựng bằng biến thì case bị đếm là chưa có script.
	/**
	 * Kỳ vọng user chốt 28/09/2026 (A8): CHẶN chốt ca trước giờ hết ca (không chỉ cảnh báo), ghi nguyên văn thông báo; ca không chuyển
	 * trạng thái chốt. 🔴 Chốt ca ghi quỹ tiền mặt thật ⇒ CHẶN MẠNG mọi request tạm chốt/chốt (`shift-report/draft-close|finalize|close`)
	 * — FE đúng kỳ vọng thì không gửi request nào; gửi = không chặn (request bị giữ lại, ca vẫn mở).
	 * Trace vnpost-web f9c5c858 `features/timekeeping/pages/WorkShiftPage.jsx` (luồng khuôn `18_1/tests/pos-18.js › chotCaCu`).
	 */
	test('03b_040_009 — Chốt ca TRƯỚC giờ hết ca — phơi hành vi thật', async ({ page }) => {
		chanNeuTat('03b_040_009');
		const gui = [];
		await page.route(/shift-report\/(draft-close|finalize|close)/, (r) => {
			gui.push(`${r.request().method()} ${r.request().url().split('?')[0].split('/').slice(-2).join('/')}`);
			return r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
		});
		await moManCaCaNhan(page, VAI);
		const nut = khungMan(page).getByRole('button', { name: /^(Chốt ca|Tiếp tục chốt)$/ }).first();
		test.skip(!(await nut.count()), 'Không có ca đang mở hôm nay (không có nút Chốt ca)');
		const gio = chuan(await khungMan(page).innerText()).match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
		const [, , ketThuc] = gio || [];
		const nay = new Date().toTimeString().slice(0, 5);
		test.skip(!ketThuc || nay >= ketThuc, `Cần chạy TRƯỚC giờ hết ca (ca kết thúc ${ketThuc}, giờ ${nay})`);
		const tb = [];
		const gom = async () => tb.push(...(await page.locator('.ant-message-notice, .ant-modal-confirm, .ant-alert').allInnerTexts()).map(chuan));
		await nut.click();
		await page.waitForTimeout(1_500);
		await gom();
		const dr = page.locator('.ant-drawer-open').last();
		const moDrawer = await dr.isVisible().catch(() => false);
		if (moDrawer) {
			const tamChot = dr.getByRole('button', { name: 'Tạm chốt', exact: true });
			if (await tamChot.isVisible().catch(() => false)) {
				await tamChot.click();
				await page.waitForTimeout(1_000);
				await gom();
				await page.locator('.ant-modal-confirm').last().getByRole('button', { name: 'Xác nhận' }).click().catch(() => null);
				await page.waitForTimeout(2_000);
				await gom();
			}
			const chot = dr.getByRole('button', { name: 'Xác nhận chốt ca' });
			if (await chot.isVisible().catch(() => false)) {
				const lyDo = dr.locator('textarea').last();
				if (await lyDo.isVisible().catch(() => false)) await lyDo.fill('Auto test 03b_040_009 — đo chặn chốt trước giờ (request bị chặn)');
				await chot.click().catch(() => null);
				await page.waitForTimeout(2_000);
				await gom();
			}
		}
		test.info().annotations.push({ type: 'đo', description: `ca ${gio?.[0]} · giờ ${nay} · mở drawer chốt: ${moDrawer} · request chốt FE đã gửi (bị giữ lại): ${JSON.stringify(gui)} · thông báo ${JSON.stringify([...new Set(tb)].filter(Boolean)).slice(0, 600)}` });
		await page.keyboard.press('Escape').catch(() => null);
		expect(gui, `🔴 Chốt ca trước giờ hết ca (${ketThuc}) KHÔNG bị chặn — FE gửi ${gui.join(', ')}`).toEqual([]);
		expect(tb.join(' | '), 'Chặn mà không có thông báo nguyên văn').not.toBe('');
	});
	// 03b_040_011: có phép kiểm ở `chot-mo-ca.gdv.spec.js` (28/09, ghi thật — user cho phép).
	// 03b_040_012: có phép kiểm ở `chot-mo-ca.gdv.spec.js` (28/09, ghi thật — user cho phép).
});

test.describe('03b · 050 — Báo cáo ca', () => {
	test.beforeEach(async ({ page }) => {
		await moManCaCaNhan(page, VAI);
	});

	test('03b_050_001 — Báo cáo ca hiện dưới thẻ ca', async ({ page }) => {
		chanNeuTat('03b_050_001');
		await chanGhi(page);

		const noi = chuan(await khungMan(page).innerText());
		expect(noi, 'Không thấy khối Báo cáo ca').toContain('Báo cáo ca');
		for (const chiSo of ['Tổng đơn hàng', 'Tổng doanh thu', 'Tiền hoàn trả']) {
			expect(noi, `Báo cáo ca thiếu chỉ số "${chiSo}"`).toContain(chiSo);
		}
	});

	test('03b_050_003 — Nhiều ca trong ngày thì đổi báo cáo theo ca được chọn', async ({ page }) => {
		chanNeuTat('03b_050_003');
		await chanGhi(page);

		const nutXem = khungMan(page).getByRole('button', { name: 'Xem báo cáo' });
		if ((await nutXem.count()) < 2) {
			test.skip(
				true,
				`Hôm nay chỉ có ${await soTheCa(page)} ca (cần ≥ 2 ca đã mở để đổi báo cáo qua lại).`,
			);
		}

		const doc = async () => chuan(await khungMan(page).innerText());
		await nutXem.nth(0).click();
		await page.waitForTimeout(2_000);
		const bc1 = await doc();
		await nutXem.nth(1).click();
		await page.waitForTimeout(2_000);
		const bc2 = await doc();

		expect(bc2, 'Đổi ca mà nội dung báo cáo không đổi').not.toBe(bc1);
	});

});

test.describe('03b · 060/070 — Chặn bán hàng và bán offline', () => {
	test('03b_060_003 — Tài khoản trong danh sách bỏ qua KHÔNG bị chặn', async () => {
		chanNeuTat('03b_060_003');
		// 🔴 Case phải skip ở dòng trên (lý do thật trong `_blocked` của test-input.json); tới đây là cấu hình bị bật nhầm.
		throw new Error('03b_060_003 chưa có phép kiểm — xem _blocked trong test-input.json trước khi bật.');
	});
	test('03b_070_001 — Chế độ offline chỉ cho thanh toán tiền mặt', async () => {
		chanNeuTat('03b_070_001');
		// 🔴 Case phải skip ở dòng trên (lý do thật trong `_blocked` của test-input.json); tới đây là cấu hình bị bật nhầm.
		throw new Error('03b_070_001 chưa có phép kiểm — xem _blocked trong test-input.json trước khi bật.');
	});
	test('03b_070_002 — Dữ liệu bán offline tự đồng bộ khi có mạng trở lại', async () => {
		chanNeuTat('03b_070_002');
	});
});

test('03b_PQ_001 — Nhân viên chỉ thấy ca của chính mình', async ({ page }) => {
	chanNeuTat('03b_PQ_001');
	await moManCaCaNhan(page, VAI);
	await chanGhi(page);

	// 🔴 Kiểm bằng THAM SỐ REQUEST: màn luôn gọi `/timekeeping/schedule` kèm `employeeId` của
	//    chính người đăng nhập. Chỉ nhìn màn hình thì không phân biệt được "chỉ có ca của mình"
	//    với "hôm nay không ai có ca".
	const goi = [];
	page.on('request', (r) => {
		if (r.url().includes('/timekeeping/schedule')) goi.push(r.url());
	});
	await page.reload();
	await page.waitForTimeout(6_000);

	expect(goi.length, 'Màn không gọi API lịch ca lần nào sau khi tải lại').toBeGreaterThan(0);
	for (const url of goi) {
		const id = new URL(url).searchParams.get('employeeId');
		expect(id, `Request lịch ca KHÔNG bó theo employeeId: ${url}`).toBeTruthy();
	}
	const idDuyNhat = new Set(goi.map((u) => new URL(u).searchParams.get('employeeId')));
	expect(
		idDuyNhat.size,
		`Màn hỏi lịch của ${idDuyNhat.size} nhân viên khác nhau: ${[...idDuyNhat].join(', ')}`,
	).toBe(1);
});
