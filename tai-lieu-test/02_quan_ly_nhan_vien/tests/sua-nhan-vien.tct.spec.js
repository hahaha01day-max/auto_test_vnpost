'use strict';

/**
 * Task 030 — Sửa nhân viên và Điều chuyển.
 *
 * 🔴 Lối vào drawer Sửa KHÔNG nằm ở danh sách: màn danh sách **không có cột Hành động**. Phải mở
 * chi tiết nhân viên (bấm tên ở cột Tên nhân viên) rồi bấm nút **"Chỉnh sửa"** ở vùng extra.
 * Drawer Điều chuyển nằm trong thẻ **"Lịch sử làm việc"**, nút *Điều chuyển* ở cột Thao tác.
 *
 * Case ghi dữ liệu (`02_030_002` `003` `006`) để `allowMutation: false` ⇒ skip có lý do.
 * Case chỉ đọc vẫn chạy, và bọc `chanGhi` để một cú bấm nhầm không chạm dữ liệu thật.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

/** 🔴 `test-input.json` nằm ở GỐC phân hệ, không phải trong `tests/`. */
const GOC = path.join(__dirname, '..');
const {
	chanGhi,
	chuan,
	dong,
	loiValidate,
	moChiTiet,
	moDanhSach,
	moThe,
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

/** Mở drawer Sửa của một nhân viên; skip có lý do khi không tìm thấy mã. */
async function moDrawerSua(page, ma) {
	const tim = await moChiTiet(page, ma);
	if (!tim) test.skip(true, `Không tìm thấy nhân viên mã "${ma}" trên môi trường đang test.`);

	// 🔴 RACE đã trả giá: nút *Chỉnh sửa* gọi `infoRef.current.handleUpdateEmployee()`. Bấm trước
	//    khi thẻ Thông tin cá nhân nạp xong thì drawer VẪN MỞ nhưng `item` rỗng ⇒ mọi ô trắng, và
	//    triệu chứng đọc y hệt "sản phẩm không nạp lại dữ liệu cũ". Chờ dữ liệu chi tiết hiện ra
	//    trên màn rồi mới bấm.
	await expect(page.locator('.ant-tabs-tabpane-active')).toContainText(chuan(ma), {
		timeout: 30_000,
	});
	await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
	const dr = page.locator('.ant-drawer-open').last();
	await expect(dr.locator('.ant-drawer-title')).toHaveText('Chỉnh sửa nhân viên', {
		timeout: 20_000,
	});
	// 🔴 Chờ GIÁ TRỊ CŨ về, không chỉ chờ ô hiện ra: drawer mở ngay còn `form.setFieldsValue` chạy
	//    sau khi API chi tiết trả về (đo: ~3-4s). Đọc sớm thì mọi ô đều rỗng và case đỏ với lý do
	//    "không nạp lại dữ liệu" — trong khi sản phẩm nạp đúng.
	await dr.locator('#employeeCode').waitFor({ state: 'visible', timeout: 20_000 });
	await expect
		.poll(async () => (await dr.locator('#employeeCode').inputValue()).length, {
			timeout: 30_000,
			message: 'Drawer Sửa không nạp lại dữ liệu cũ sau 30s',
		})
		.toBeGreaterThan(0);
	return dr;
}

/** Mở drawer Điều chuyển từ thẻ Lịch sử làm việc. */
async function moDrawerDieuChuyen(page, ma) {
	const tim = await moChiTiet(page, ma);
	if (!tim) test.skip(true, `Không tìm thấy nhân viên mã "${ma}" trên môi trường đang test.`);

	const pane = await moThe(page, 'Lịch sử làm việc');
	const nut = pane.getByRole('button', { name: 'Điều chuyển' }).first();
	if ((await nut.count()) === 0) {
		test.skip(true, `Nhân viên "${ma}" không có phân công nào để điều chuyển.`);
	}
	await nut.click();
	const dr = page.locator('.ant-drawer-open').last();
	await expect(dr.locator('.ant-drawer-title')).toHaveText('Điều chuyển nhân viên', {
		timeout: 20_000,
	});
	return dr;
}

test.describe('02 · 030 — Sửa nhân viên và Điều chuyển', () => {
	test.beforeEach(async ({ page }) => {
		await moDanhSach(page, VAI);
	});

	test('02_030_001 — Mở màn chỉnh sửa hiển thị đủ dữ liệu cũ', async ({ page }) => {
		const i = chanNeuTat('02_030_001');
		await chanGhi(page);

		const dr = await moDrawerSua(page, i.data.employeeCode);

		expect(chuan(await dr.locator('#employeeCode').inputValue()), 'Mã nhân viên không được nạp lại').toBe(
			chuan(i.data.employeeCode),
		);
		for (const id of ['username', 'name', 'phone']) {
			expect(
				chuan(await dr.locator(`#${id}`).inputValue()),
				`Ô ${id} trống khi mở drawer Sửa`,
			).not.toBe('');
		}

		// Khối Vai trò phải nạp lại đủ phân công đang có.
		const soDong = await dr.locator('[id^="roles_"][id$="_roleId"]').count();
		expect(soDong, 'Khối Vai trò rỗng khi mở drawer Sửa').toBeGreaterThan(0);
	});

	/**
	 * 🔴 Case GHI DỮ LIỆU THẬT (mở khoá 22/09/2026). Nó đổi tên một nhân viên có thật rồi **tự
	 * khôi phục tên cũ ngay trong chính case** — 🚫 đừng bỏ bước khôi phục: nhân viên này là dữ
	 * liệu nền của `02_030_001`, `02_030_004`, `02_030_005`, đổi tên vĩnh viễn là hỏng cả cụm.
	 *
	 * 🔴 Kỳ vọng lấy từ code, 🚫 không từ sheet QC: thông báo nguyên văn là **"Cập nhật thành
	 * công"** (`addOrEditEmployeeModal/index.jsx`), sheet ghi "Chỉnh sửa nhân viên thành công".
	 */
	test('02_030_002 — Sửa tên nhân viên thành công', async ({ page }) => {
		const i = chanNeuTat('02_030_002');
		const ma = i.data.employeeCode;

		const tong = await tongSo(page);
		const dr = await moDrawerSua(page, ma);
		const tenCu = chuan(await dr.locator('#name').inputValue());
		expect(tenCu, `Drawer Sửa của "${ma}" không nạp được tên cũ`).not.toBe('');
		const tenMoi = `${tenCu} ĐÃ SỬA`;

		/** Bấm Lưu và chờ đúng API cập nhật — 🚫 đừng chỉ chờ toast, toast hiện cả khi lỗi. */
		const luu = async (dr) => {
			const cho = page.waitForResponse(
				(r) => r.url().includes('/chain-employment-profile/v1.2/update') && r.request().method() === 'PUT',
				{ timeout: 60_000 },
			);
			await dr.getByRole('button', { name: 'Lưu' }).click();
			const res = await cho;
			const body = await res.json().catch(() => null);
			expect(String(body?.status?.code), `Cập nhật thất bại: ${JSON.stringify(body?.status)}`).toBe('200');
		};

		await dr.locator('#name').fill(tenMoi);
		await luu(dr);

		// 🔴 Từ đây trở đi PHẢI nằm trong `try/finally`: dữ liệu thật đã bị đổi rồi. Đặt bước khôi
		//    phục ở cuối thân test là **sai** — case đỏ giữa chừng thì nó 🚫 không bao giờ chạy và
		//    nhân viên ở lại với cái tên "… ĐÃ SỬA" (đã trả giá đúng như vậy lượt 22/09).
		try {

			// Kỳ vọng 1 — thông báo NGUYÊN VĂN.
			await expect
				.poll(async () => (await page.locator('.ant-message').allInnerTexts()).map(chuan).join(' | '), {
					timeout: 20_000,
					message: 'Lưu xong không thấy thông báo "Cập nhật thành công"',
				})
				.toContain('Cập nhật thành công');

			// Kỳ vọng 2 — danh sách đổi theo.
			// 🔴 `moDrawerSua` đi qua màn CHI TIẾT nhân viên, nên sau khi lưu ta vẫn đứng ở đó — màn
			//    chi tiết 🚫 không có ô tìm kiếm của danh sách. Phải quay lại danh sách trước khi tìm,
			//    nếu không `timKiem` chết vì "locator.fill timeout" nghe như mất ô tìm kiếm.
			await moDanhSach(page, VAI);
			await timKiem(page, tenMoi);
			await expect
				.poll(async () => dong(page).filter({ hasText: tenMoi }).count(), {
					timeout: 20_000,
					message: `Cập nhật trả 200 nhưng danh sách vẫn chưa hiện tên "${tenMoi}"`,
				})
				.toBeGreaterThan(0);

			// Kỳ vọng 3 — sửa tên 🚫 không được đẻ thêm nhân viên.
			await timKiem(page, '');
			if (tong !== null) {
				await expect
					.poll(() => tongSo(page), { timeout: 20_000, message: 'Tổng số nhân viên đổi sau khi SỬA tên' })
					.toBe(tong);
			}

		} finally {
			// Trả lại tên cũ dù case đỏ ở bước nào.
			await moDanhSach(page, VAI);
			const dr2 = await moDrawerSua(page, ma);
			await dr2.locator('#name').fill(tenCu);
			await luu(dr2);
			await moDanhSach(page, VAI);
			await timKiem(page, tenCu);
			await expect
				.poll(async () => dong(page).filter({ hasText: tenCu }).count(), {
					timeout: 20_000,
					message: `🔴 KHÔI PHỤC HỎNG: nhân viên "${ma}" đang mang tên "${tenMoi}" — sửa tay trước khi chạy tiếp`,
				})
				.toBeGreaterThan(0);
		}
	});

	/**
	 * Kỳ vọng user chốt 28/09/2026 (A2 = a): đổi MỘT phân công sang "Đã nghỉ" thì CHỈ phân công đó đổi — các phân công khác giữ nguyên
	 * (sheet QC "đổi theo toàn bộ" không áp dụng). GHI THẬT trên nhân viên riêng của làn `AUTO<làn>_DC_*` (02/dieu-chuyen, có 1 phân công
	 * Đang làm ở điểm bán chính + 1 Đã nghỉ ở `diemBanNhan`): (1) bật lại phân công thứ hai ⇒ 2 Đang làm (tiền đề), (2) cho nghỉ phân công
	 * thứ hai ⇒ đo phân công thứ nhất. Trạng thái cuối = trạng thái đầu. Trace vnpost-web f9c5c858 `addOrEditEmployeeModal/index.jsx`:
	 * ô `roles_<i>_status` (Select trạng thái từng dòng); `workStatus` chung chỉ về "Đã nghỉ" khi MỌI dòng đều nghỉ.
	 */
	test('02_030_003 — Đổi trạng thái phân công từ Đang làm sang Đã nghỉ', async ({ page }) => {
		chanNeuTat('02_030_003');
		const fs = require('node:fs');
		const seed = require('../../00_seed/seed-state');
		const { chonOption, oDonViVaiTro } = require('./employee-page');
		const so = path.join(GOC, 'test-output', `nv-dieu-chuyen.lane${process.env.VNPOST_LANE || 0}.json`);
		test.skip(!fs.existsSync(so), 'Chưa có nhân viên riêng của làn — chạy dieu-chuyen.tct.spec.js (tiền đề) trước');
		const ma = JSON.parse(fs.readFileSync(so, 'utf8')).maNv;
		const d = seed.doc().duLieu;
		const [A, B] = [d.diemBan.tenShop, d.diemBanNhan.tenShop]; // B chứa A làm chuỗi con ⇒ so B trước
		const luu = async (dr) => {
			const cho = page.waitForResponse((r) => r.url().includes('/chain-employment-profile/v1.2/update') && r.request().method() === 'PUT', { timeout: 60_000 });
			await dr.getByRole('button', { name: 'Lưu' }).click();
			const res = await cho;
			const body = await res.json().catch(() => null);
			expect(String(body?.status?.code), `Cập nhật thất bại: ${JSON.stringify(body?.status)}`).toBe('200');
			await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 20_000 });
			return res.request().postDataJSON();
		};
		/** Đọc các dòng vai trò của drawer Sửa: [{ i, donVi: 'A'|'B'|?, trangThai }]. */
		const docDong = async (dr) => {
			const n = await dr.locator('[id^="roles_"][id$="_roleId"]').count();
			const kq = [];
			for (let i = 0; i < n; i += 1) {
				const dv = chuan(await oDonViVaiTro(dr, i).innerText());
				const tt = chuan(await dr.locator('.ant-select').filter({ has: page.locator(`#roles_${i}_status`) }).first().innerText());
				kq.push({ i, donVi: dv.includes(B) ? 'B' : dv.includes(A) ? 'A' : dv, trangThai: tt });
			}
			return kq;
		};
		const datTrangThai = async (dr, i, tt) => chonOption(page, dr.locator('.ant-select').filter({ has: page.locator(`#roles_${i}_status`) }).first(), tt);
		const moLai = async () => { await moDanhSach(page, VAI); return moDrawerSua(page, ma); };

		let dr = await moDrawerSua(page, ma);
		const dau = await docDong(dr);
		const iA = dau.find((x) => x.donVi === 'A')?.i;
		const iB = dau.find((x) => x.donVi === 'B')?.i;
		test.skip(iA === undefined || iB === undefined, `Nhân viên ${ma} không có đủ 2 dòng vai trò ở ${A} và ${B}: ${JSON.stringify(dau)}`);
		let buoc1 = null;
		try {
			// (1) Tiền đề: 2 phân công Đang làm.
			if (!/Đang làm/.test(dau[iB].trangThai)) { await datTrangThai(dr, iB, 'Đang làm'); buoc1 = await luu(dr); dr = await moLai(); }
			const giua = await docDong(dr);
			expect(giua.filter((x) => /Đang làm/.test(x.trangThai)).length, `Tiền đề hỏng — chưa có 2 phân công Đang làm: ${JSON.stringify(giua)}`).toBeGreaterThanOrEqual(2);
			// (2) Cho nghỉ đúng MỘT phân công (B).
			const jB = giua.find((x) => x.donVi === 'B').i;
			await datTrangThai(dr, jB, 'Đã nghỉ');
			const req = await luu(dr);
			dr = await moLai();
			const sau = await docDong(dr);
			await page.keyboard.press('Escape');
			test.info().annotations.push({ type: 'đo', description: `${ma} · đầu ${JSON.stringify(dau)} · sau bật lại B ${JSON.stringify(giua)} · gửi roles ${JSON.stringify((req?.roles || []).map((r) => ({ org: r.orgUnitCode, status: r.status })))} · sau khi nghỉ B ${JSON.stringify(sau)}` });
			expect(sau.find((x) => x.donVi === 'B')?.trangThai, 'Phân công B không chuyển "Đã nghỉ"').toMatch(/Đã nghỉ/);
			expect(sau.find((x) => x.donVi === 'A')?.trangThai, `🔴 Cho nghỉ phân công ${B} mà phân công ${A} cũng đổi theo (lan)`).toMatch(/Đang làm/);
			expect(sau.length, 'Số dòng vai trò đổi sau khi lưu').toBe(giua.length);
		} finally {
			void buoc1; // trạng thái cuối mong đợi = trạng thái đầu (A Đang làm, B Đã nghỉ) — bước (2) đã đưa về đúng.
		}
	});

	test('02_030_004 — Sửa: xoá trắng Tên nhân viên thì bị chặn', async ({ page }) => {
		const i = chanNeuTat('02_030_004');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerSua(page, i.data.employeeCode);
		await dr.locator('#name').fill('');
		await dr.getByRole('button', { name: 'Lưu' }).click();
		await page.waitForTimeout(1_500);

		expect(await loiValidate(dr)).toContain('Vui lòng nhập tên nhân viên');
		expect(daGoi, 'Tên nhân viên trống mà vẫn gửi PUT cập nhật').toEqual([]);
	});

	test('02_030_005 — Không xoá được dòng vai trò đã lưu trước đó', async ({ page }) => {
		const i = chanNeuTat('02_030_005');
		await chanGhi(page);

		const dr = await moDrawerSua(page, i.data.employeeCode);
		const nutXoa = dr.getByRole('button', { name: 'Xóa' });
		const soDaLuu = await nutXoa.count();
		expect(soDaLuu, 'Nhân viên này không có phân công nào đã lưu').toBeGreaterThan(0);

		for (let k = 0; k < soDaLuu; k += 1) {
			await expect(
				nutXoa.nth(k),
				`Dòng vai trò đã lưu thứ ${k + 1} vẫn xoá được — trái \`quantityRoleEdited > key\``,
			).toBeDisabled();
		}

		// Dòng thêm mới trong phiên thì phải xoá được.
		await dr.getByRole('button', { name: '+ Thêm vai trò và đơn vị quản lý' }).click();
		await page.waitForTimeout(600);
		await expect(dr.getByRole('button', { name: 'Xóa' }).nth(soDaLuu)).toBeEnabled();
	});

	// 02_030_006: có phép kiểm ở `dieu-chuyen.tct.spec.js` (28/09).

	test('02_030_007 — Điều chuyển: bỏ trống Đơn vị chuyển đến', async ({ page }) => {
		const i = chanNeuTat('02_030_007');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerDieuChuyen(page, i.data.employeeCode);
		await dr.getByRole('button', { name: /Xác nhận|Điều chuyển|Lưu/ }).last().click();
		await page.waitForTimeout(1_500);

		expect(await loiValidate(dr)).toContain('Vui lòng chọn đơn vị chuyển đến');
		expect(daGoi, 'Bỏ trống đơn vị chuyển đến mà vẫn gửi request điều chuyển').toEqual([]);
	});

	test('02_030_008 — Điều chuyển: bỏ trống Vai trò mới', async ({ page }) => {
		const i = chanNeuTat('02_030_008');
		const { daGoi } = await chanGhi(page);

		const dr = await moDrawerDieuChuyen(page, i.data.employeeCode);

		// Chọn đơn vị chuyển đến nhưng để trống Vai trò mới.
		const { chonDonVi } = require('./employee-page');
		const cay = dr.locator('.ant-tree-select').first();
		if ((await cay.count()) === 0) {
			test.skip(true, 'Drawer Điều chuyển không có ô cây đơn vị — cần probe lại.');
		}
		await chonDonVi(page, cay, 'Tong cong ty');

		await dr.getByRole('button', { name: /Xác nhận|Điều chuyển|Lưu/ }).last().click();
		await page.waitForTimeout(1_500);

		expect(await loiValidate(dr)).toContain('Vui lòng chọn vai trò mới');
		expect(daGoi, 'Bỏ trống vai trò mới mà vẫn gửi request điều chuyển').toEqual([]);
	});
});

test.describe('02 · 040 — Chi tiết nhân viên', () => {
	test.beforeEach(async ({ page }) => {
		await moDanhSach(page, VAI);
	});

	test('02_040_001 — Mở chi tiết nhân viên bằng cách bấm tên trong danh sách', async ({ page }) => {
		chanNeuTat('02_040_001');

		expect(await dong(page).count()).toBeGreaterThan(0);
		// 🔴 Danh sách KHÔNG có cột Hành động — lối vào duy nhất là liên kết ở cột Tên nhân viên.
		const cotHanhDong = page.locator('.ant-table-thead th', { hasText: 'Hành động' });
		expect(await cotHanhDong.count()).toBe(0);

		await dong(page).first().locator('td').nth(3).getByRole('link').click();
		await page.waitForURL(/\/employee\/detail\/[^/]+\/\d+\/\d+/, { timeout: 30_000 });

		// 🔴 Ba thẻ được dựng dần — chờ đủ số lượng rồi mới đọc, 🚫 đừng đọc ngay sau khi URL đổi.
		await expect(page.locator('.ant-tabs-tab')).toHaveCount(3, { timeout: 30_000 });
		const the = (await page.locator('.ant-tabs-tab').allInnerTexts()).map(chuan);
		expect(the).toEqual(['Thông tin cá nhân', 'Lịch sử làm việc', 'Công nợ nhân viên']);
	});

	test('02_040_002 — Thẻ Thông tin cá nhân hiển thị đúng dữ liệu đã nhập', async ({ page }) => {
		const i = chanNeuTat('02_040_002');

		const tim = await moChiTiet(page, i.data.employeeCode);
		if (!tim) test.skip(true, `Không tìm thấy nhân viên mã "${i.data.employeeCode}".`);

		const pane = await moThe(page, 'Thông tin cá nhân');
		const noiDung = chuan(await pane.innerText());

		expect(noiDung, 'Chi tiết không hiện mã nhân viên đang xem').toContain(
			chuan(i.data.employeeCode),
		);
		for (const nhan of ['Ngày sinh', 'Giới tính', 'Địa chỉ', 'Ngày bắt đầu làm việc']) {
			expect(noiDung, `Thiếu trường "${nhan}" ở thẻ Thông tin cá nhân`).toContain(nhan);
		}
		// 🔴 Trường bỏ trống phải hiện chữ tiếng Việt, 🚫 không lộ "null"/"undefined".
		expect(noiDung.toLowerCase()).not.toMatch(/\bnull\b|\bundefined\b/);
	});

	test('02_040_003 — Thẻ Lịch sử làm việc hiển thị đủ đơn vị và vai trò', async ({ page }) => {
		const i = chanNeuTat('02_040_003');

		// Đọc trước hàng mở rộng ở danh sách để có cái đối chiếu.
		const tim = await moChiTiet(page, i.data.employeeCode);
		if (!tim) test.skip(true, `Không tìm thấy nhân viên mã "${i.data.employeeCode}".`);

		const pane = await moThe(page, 'Lịch sử làm việc');
		const cot = (await pane.locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		for (const c of ['Đơn vị', 'Vai trò', 'Trạng thái']) {
			expect(cot, `Thẻ Lịch sử làm việc thiếu cột "${c}"`).toContain(c);
		}

		const soDong = await pane.locator('.ant-table-tbody tr.ant-table-row').count();
		expect(soDong, 'Thẻ Lịch sử làm việc không có phân công nào').toBeGreaterThan(0);
	});

	// 02_040_004 chuyển sang cong-no-nv.tct.spec.js (28/09): tự dựng đơn ghi nợ của GDV làn.
});
