'use strict';

/**
 * Task 050 + 060 — các case **GHI DỮ LIỆU THẬT** (gắn / gỡ nhân viên).
 * API: `POST /chain-employment-profile/v1.2/batch-assign-roles` ·
 *      `DELETE /chain-employment-profile/v1.2/assignment`.
 *
 * 🔴 Chỉ thao tác trên điểm bán rác (`AUTO TEST KHONG DUNG…`). Case cuối GỠ lại nhân viên vừa gắn
 * để chạy lại nhiều lần không dồn phân công.
 * 🔴 Danh sách nhân viên phụ thuộc dữ liệu môi trường ⇒ không có nhân viên nào thì SKIP có lý do,
 * 🚫 tuyệt đối không "pass rỗng".
 */

const { test, expect } = require('@playwright/test');
const {
	firstNonHubRow,
	openAssignDrawer,
	openDropdown,
	openShopList,
	reloadBy,
	rows,
	searchBox,
	settleTable,
	skipNoData,
} = require('./shop-page');

test.describe.configure({ mode: 'serial' });

const TU_KHOA = 'AUTO';

/** Số dòng phân công ĐANG HIỂN THỊ trong drawer (mỗi dòng có đúng một ô Trạng thái). */
const soDongPhanCong = (drawer) => drawer.locator('.ant-select:has(input[id$="_status"])').count();

/**
 * TỔNG số phân công của điểm bán, 🔴 🚫 KHÔNG phải số dòng đang thấy.
 *
 * Danh sách phân công trong drawer **có phân trang**: gán xong, dòng mới rơi xuống trang cuối nên
 * số dòng trang 1 giữ nguyên ⇒ phép kiểm "số dòng tăng" đỏ oan với lý do
 * *"mở lại không thấy dòng phân công mới"* trong khi API đã trả 200 và dữ liệu đã vào.
 * Đọc tổng ở thanh phân trang; 🚫 không có phân trang thì mới rơi về đếm dòng.
 */
/**
 * Chờ danh sách phân công trong drawer nạp xong.
 *
 * 🔴 Drawer mở ra TRƯỚC khi dữ liệu về (một nhịp mạng). Đọc số dòng ngay là được **0**, rồi mọi
 *    phép kiểm dạng `toBe(truoc + n)` so với con số sai — đã trả giá ở `01_050_002`
 *    (*"Expected: 2, Received: 15"*, vì `truoc` đọc được 0 trong khi drawer đang có 13 dòng).
 */
async function choNapPhanCong(page, drawer) {
	await expect
		.poll(() => soDongPhanCong(drawer), { timeout: 20_000 })
		.toBeGreaterThan(0)
		.catch(() => {});
	await page.waitForTimeout(1_200);
}

async function tongPhanCong(drawer) {
	const tong = drawer.locator('.ant-pagination-total-text');
	if (await tong.count()) {
		const so = Number((await tong.first().innerText()).replace(/\D/g, '') || 0);
		if (so > 0) return so;
	}
	return soDongPhanCong(drawer);
}

/**
 * Thêm một dòng phân công và điền đủ **Nhân viên · Vai trò · Trạng thái**.
 *
 * 🔴 Ba cái bẫy đã trả giá ở `01_050_001`, cái nào cũng biểu hiện y hệt nhau — bấm Lưu thì
 *    **🚫 KHÔNG request nào đi**, case chết ở `waitForResponse` sau 180s, đọc như API sập:
 *
 *  1. **Bám ô bằng `.last()` theo placeholder** ⇒ khi drawer còn dòng trống khác, cú chọn rơi vào
 *     dòng KHÁC; dòng đang điền vẫn trống. ⇒ Bám theo **hàng** của dòng vừa thêm.
 *  2. **Người đầu danh sách đã được gán hết vai** ⇒ 🚫 không còn vai để chọn. Đây là bẫy
 *     *"xanh đúng một lần"*: lượt đầu xanh, lượt sau chính case này đã dùng mất người đó.
 *  3. 🔴 **`AssignmentRoleSelect` TỰ TRẢ Ô VỀ GIÁ TRỊ CŨ** khi cặp *(người × vai)* đã có ở dòng
 *     khác (đo `DrawerAssignEmployee.jsx`: `form.setFieldValue(... roleId, cũ)` kèm
 *     `message.warning`). Click "ăn" nhưng ô vẫn trống — 🚫 đừng tin cú click, phải **đọc lại ô**.
 *
 * ⇒ Dò theo CẶP: với mỗi người, thử lần lượt từng vai cho tới khi ô thật sự giữ được giá trị.
 */
async function themPhanCong(page, drawer, { loaiTru } = {}) {
	/**
	 * 🔴 Mặc định loại trừ **người đang có phân công hiển thị trong drawer**.
	 *
	 * Không loại thì case chọn trúng người đã có, và `batch-assign-roles` trả **`200` kèm
	 * `data.errors`** (`"Vai trò đã được gán cho nhân viên trong đơn vị này"`) — dòng 🚫 không được
	 * tạo. Dữ liệu tích luỹ theo từng lượt chạy nên lỗi này càng ngày càng dễ gặp.
	 */
	const boLoc = loaiTru
		?? [(await drawer.innerText()).normalize('NFC').replace(/\s+/g, ' ')];
	const truoc = await soDongPhanCong(drawer);
	await drawer.getByRole('button', { name: /Thêm nhân viên/ }).click();
	await expect
		.poll(() => soDongPhanCong(drawer), {
			message: 'Bấm "Thêm nhân viên & vai trò" nhưng không thấy dòng mới.',
			timeout: 10_000,
		})
		.toBeGreaterThan(truoc);

	/**
	 * Mỗi dòng phân công có đúng **ba** `.ant-select` theo thứ tự **nhân viên · vai trò · trạng
	 * thái** (đo `DrawerAssignEmployee.jsx`) ⇒ dòng thứ `n` chiếm các vị trí `3n`, `3n+1`, `3n+2`
	 * trong drawer.
	 *
	 * 🔴 🚫 Đừng leo `xpath=ancestor::*[…]` để khoanh "hàng": các ô nằm trong ba `Form.Item` anh em
	 *    chứ 🚫 không có phần tử bọc riêng cho một dòng, nên biểu thức đó ra 0 hoặc ra cả khối.
	 */
	/**
	 * 🔴 🚫 KHÔNG tính vị trí bằng `sốDòng × 3`: drawer còn có **phân trang danh sách phân công**
	 *    (ô "số dòng / trang" cũng là một `.ant-select`), nên chỉ số tuyệt đối lệch ngay khi danh
	 *    sách dài hơn một trang. Neo vào **ô Trạng thái CUỐI CÙNG** — dòng vừa thêm luôn nằm cuối
	 *    trang đang xem — rồi lấy lùi hai ô: `[-2] nhân viên · [-1] vai trò · [0] trạng thái`.
	 */
	const dsSel = drawer.locator('.ant-select');
	const soSelect = await dsSel.count();
	let iTrangThai = -1;
	for (let k = soSelect - 1; k >= 0; k -= 1) {
		if (await dsSel.nth(k).locator('input[id$="_status"]').count()) {
			iTrangThai = k;
			break;
		}
	}
	expect(iTrangThai, 'Không tìm được ô Trạng thái của dòng vừa thêm').toBeGreaterThanOrEqual(2);
	const o = (i) => dsSel.nth(iTrangThai - 2 + i);
	const chuOVaiTro = async () => (await o(1).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();

	const dsNV = await openDropdown(page, o(0));
	// 🔴 `toBeGreaterThanOrEqual(0)` là poll VÔ NGHĨA — luôn đúng ngay nhịp đầu, nên case skip oan
	//    với lý do "chuỗi chưa có nhân viên" trong khi DB có 5.559 người.
	const coNhanVien = await expect
		.poll(() => dsNV.locator('.ant-select-item-option').count(), { timeout: 20_000 })
		.toBeGreaterThan(0)
		.then(() => true)
		.catch(() => false);
	if (!coNhanVien) {
		skipNoData(test, 'Danh sách nhân viên của chuỗi không nạp được lựa chọn nào sau 20s.');
	}

	/**
	 * 🔴 Ô nhân viên chỉ nạp **một trang đầu** của danh sách (chuỗi có hơn 5.500 người). Duyệt hết
	 *    trang đó mà vẫn hết cặp trống thì **gõ tìm kiếm** để nạp nhóm khác — 🚫 đừng kết luận
	 *    "hết người" khi mới nhìn thấy vài chục dòng đầu.
	 */
	const goTim = async (tu) => {
		await o(0).locator('input').first().fill(tu);
		await page.waitForTimeout(1_500);
	};
	let soNV = await dsNV.locator('.ant-select-item-option').count();
	let tenNV = null;

	for (let i = 0; i < Math.min(soNV, 40) && !tenNV; i += 1) {
		const muc = dsNV.locator('.ant-select-item-option').nth(i);
		const ten = (await muc.innerText()).trim();
		/**
		 * 🔴 `loaiTru`: chuỗi mô tả những người ĐÃ có phân công ở điểm bán này. Gán thêm một vai
		 *    cho họ 🚫 KHÔNG làm cột "Số lượng nhân viên" tăng — cột đó đếm **người**, 🚫 không đếm
		 *    phân công.
		 *
		 * 🔴 So bằng **phần tên** (đoạn trước dấu `-` đầu tiên): option hiển thị đầy đủ
		 *    `Tên - MÃ - SĐT`, còn dòng đã lưu trong drawer chỉ hiện tên ⇒ so nguyên chuỗi là
		 *    🚫 không bao giờ khớp và bộ loại trừ thành vô dụng.
		 */
		const chiTen = ten.split(' - ')[0].trim();
		// 🔴 Chỉ loại khi tên đủ dài. `boLoc` là TOÀN BỘ chữ trong drawer, nên một cái tên ngắn
		//    ("Lý", "An") khớp lung tung và **loại sạch danh sách** — case skip oan với lý do
		//    "hết cặp trống" trong khi còn rất nhiều người chọn được.
		if (chiTen.length >= 6 && boLoc.some((x) => x && String(x).includes(chiTen))) continue;
		await muc.click();

		// Vai trò chỉ mở khoá SAU khi chọn nhân viên (`disabled={!currentUserId}`).
		const dsVT = await openDropdown(page, o(1));
		const chonDuoc = dsVT.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)');
		const soVT = await expect
			.poll(() => chonDuoc.count(), { timeout: 12_000 })
			.toBeGreaterThan(0)
			.then(() => chonDuoc.count())
			.catch(() => 0);

		for (let k = 0; k < Math.min(soVT, 8); k += 1) {
			await chonDuoc.nth(k).click().catch(() => {});
			const chu = await chuOVaiTro();
			if (chu && !/Chọn vai trò/.test(chu)) {
				tenNV = ten;
				break;
			}
			// Cặp (người × vai) này đã tồn tại ⇒ component trả ô về rỗng. Mở lại và thử vai kế tiếp.
			await openDropdown(page, o(1)).catch(() => {});
		}

		if (!tenNV) {
			// Người này hết cặp dùng được — đóng dropdown vai rồi quay lại ô nhân viên.
			await page.keyboard.press('Escape');
			await openDropdown(page, o(0));
		}
	}

	// Chưa được thì gõ tìm để nạp nhóm nhân viên khác (mỗi từ khoá ra một tập khác nhau).
	for (const tu of ['a', 'n', 'AUTO']) {
		if (tenNV) break;
		await goTim(tu);
		soNV = await dsNV.locator('.ant-select-item-option').count();
		for (let i = 0; i < Math.min(soNV, 20) && !tenNV; i += 1) {
			const muc = dsNV.locator('.ant-select-item-option').nth(i);
			const ten = (await muc.innerText()).trim();
			const chiTen = ten.split(' - ')[0].trim();
			if (chiTen.length >= 6 && boLoc.some((x) => x && String(x).includes(chiTen))) continue;
			await muc.click();
			const dsVT2 = await openDropdown(page, o(1));
			const chonDuoc2 = dsVT2.locator(
				'.ant-select-item-option:not(.ant-select-item-option-disabled)',
			);
			const soVT2 = await chonDuoc2.count().catch(() => 0);
			for (let k = 0; k < Math.min(soVT2, 8); k += 1) {
				await chonDuoc2.nth(k).click().catch(() => {});
				const chu = await chuOVaiTro();
				if (chu && !/Chọn vai trò/.test(chu)) {
					tenNV = ten;
					break;
				}
				await openDropdown(page, o(1)).catch(() => {});
			}
			if (!tenNV) {
				await page.keyboard.press('Escape');
				await openDropdown(page, o(0));
			}
		}
	}

	if (!tenNV) {
		skipNoData(
			test,
			'Mọi cặp (nhân viên × vai trò) tìm được đều đã gán ở điểm bán này — kể cả sau khi gõ tìm '
				+ 'để nạp thêm nhóm khác. Cần điểm bán chưa dùng, hoặc thêm nhân viên/vai trò mới.',
		);
	}

	const dsTT = await openDropdown(page, o(2));
	await dsTT.locator('.ant-select-item-option').first().click();

	return tenNV;
}

/**
 * Thêm một dòng phân công, chọn nhân viên (theo tên nếu chỉ định) và vai trò theo thứ tự.
 * @returns {Promise<boolean>} false khi không còn vai trò ở vị trí `thuTuVaiTro` để chọn.
 */
async function themDongChoNhanVien(page, drawer, { tenNhanVien, thuTuVaiTro = 0 } = {}) {
	const truoc = await soDongPhanCong(drawer);
	await drawer.getByRole('button', { name: /Thêm nhân viên/ }).click();
	await expect
		.poll(() => soDongPhanCong(drawer), {
			message: 'Bấm "Thêm nhân viên & vai trò" nhưng không thấy dòng mới.',
			timeout: 10_000,
		})
		.toBeGreaterThan(truoc);

	// Neo theo ô Trạng thái CUỐI (dòng vừa thêm) — xem chú thích ở `themPhanCong`.
	const dsSel = drawer.locator('.ant-select');
	const soSelect = await dsSel.count();
	let iTrangThai = -1;
	for (let k = soSelect - 1; k >= 0; k -= 1) {
		if (await dsSel.nth(k).locator('input[id$="_status"]').count()) {
			iTrangThai = k;
			break;
		}
	}
	expect(iTrangThai, 'Không tìm được ô Trạng thái của dòng vừa thêm').toBeGreaterThanOrEqual(2);
	const o = (i) => dsSel.nth(iTrangThai - 2 + i);

	const dsNV = await openDropdown(page, o(0));
	await expect
		.poll(() => dsNV.locator('.ant-select-item-option').count(), {
			message: 'Danh sách nhân viên của chuỗi không nạp được lựa chọn nào.',
			timeout: 20_000,
		})
		.toBeGreaterThan(0);
	const chon = tenNhanVien
		? dsNV.locator('.ant-select-item-option').filter({ hasText: tenNhanVien }).first()
		: dsNV.locator('.ant-select-item-option').first();
	await chon.click();

	const dsVT = await openDropdown(page, o(1));
	await expect
		.poll(() => dsVT.locator('.ant-select-item-option').count(), {
			message: 'Chọn nhân viên xong mà danh sách vai trò vẫn rỗng.',
			timeout: 20_000,
		})
		.toBeGreaterThan(0);
	if ((await dsVT.locator('.ant-select-item-option').count()) <= thuTuVaiTro) {
		await page.keyboard.press('Escape');
		return false;
	}
	await dsVT.locator('.ant-select-item-option').nth(thuTuVaiTro).click();
	/**
	 * 🔴 **Đọc lại ô Vai trò** — 🚫 đừng tin cú click. `AssignmentRoleSelect` tự **trả ô về giá trị
	 *    cũ** khi cặp *(người × vai)* đã tồn tại ở dòng khác (`DrawerAssignEmployee.jsx`), nên ô có
	 *    thể vẫn trống dù click "thành công". Đi tiếp là lúc Lưu form chặn, **🚫 không request nào
	 *    đi**, và case chết ở `waitForResponse` sau 180s — đọc như API sập.
	 */
	const chuVaiTro = (await o(1).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
	if (!chuVaiTro || /Chọn vai trò/.test(chuVaiTro)) {
		await page.keyboard.press('Escape');
		return false;
	}

	const dsTT = await openDropdown(page, o(2));
	await dsTT.locator('.ant-select-item-option').first().click();
	return true;
}

/** Bấm Xác nhận và chờ API gán. */
async function luuPhanCong(page, drawer) {
	const cho = page.waitForResponse(
		(r) => r.url().includes('batch-assign-roles') && r.request().method() === 'POST',
		{ timeout: 180_000 },
	);
	await drawer.getByRole('button', { name: 'Xác nhận' }).click();
	const body = await (await cho).json().catch(() => null);
	expect(String(body?.status?.code), `Gán nhân viên thất bại: ${JSON.stringify(body?.status)}`).toBe(
		'200',
	);
	/**
	 * 🔴 `batch-assign-roles` trả **`200` kể cả khi từng dòng hỏng** — danh sách dòng hỏng nằm ở
	 *    `data.errors` / `data.failures` (FE đọc nó ra để tô đỏ từng dòng, xem `DrawerAssignEmployee`).
	 *    Dừng ở `status.code === '200'` là coi như đã gán xong trong khi 🚫 không bản ghi nào được
	 *    tạo, rồi phép kiểm sau đỏ với lý do *"mở lại không thấy dòng phân công mới"* — đọc như lỗi
	 *    hiển thị, trong khi bản chất là **ghi thất bại**.
	 */
	const loiDong = body?.data?.errors || body?.data?.failures || [];
	expect(
		loiDong,
		`Server nhận 200 nhưng TỪNG DÒNG hỏng: ${JSON.stringify(loiDong).slice(0, 500)}`,
	).toEqual([]);
	return body;
}

/**
 * Về màn danh sách và định vị ĐÚNG điểm bán cần thao tác.
 *
 * 🔴 Bám theo MÃ, không theo chỉ số dòng. Sau khi gán nhân viên, danh sách tải lại và thứ tự dòng
 * có thể đổi ⇒ mở lại theo chỉ số cũ là mở nhầm điểm bán khác, rồi kết luận sai rằng
 * "gán xong không thấy dòng phân công" trong khi dữ liệu vẫn đúng.
 *
 * @param {string} [ma] mã điểm bán cần mở; bỏ trống thì lấy điểm bán rác đầu tiên không phải Hub.
 * @returns {{idx: number, ma: string}}
 */
async function moShopRac(page, ma) {
	await openShopList(page, 'tct');
	await reloadBy(page, () => searchBox(page).fill(ma || TU_KHOA));
	await settleTable(page);
	if ((await rows(page).count()) === 0) {
		skipNoData(test, `Không có điểm bán nào khớp "${ma || TU_KHOA}".`);
	}

	/**
	 * 🔴 Khi 🚫 không chỉ đích danh mã, chọn điểm bán **ÍT NHÂN VIÊN NHẤT**, 🚫 đừng lấy dòng
	 *    không-Hub đầu tiên.
	 *
	 *    Lý do đo được 23/09: mọi case ghi của nhóm này đều rơi vào **cùng một** điểm bán rác, nên
	 *    sau vài lượt chạy nó **bão hoà** — mọi cặp *(người × vai)* đều đã gán, và cả nhóm skip với
	 *    lý do "hết cặp trống" dù chuỗi có hơn 5.500 nhân viên. Xoay sang điểm bán trống nhất là
	 *    mỗi lượt lại có chỗ để gán.
	 */
	let idx = ma ? 0 : null;
	if (idx === null) {
		const n = await rows(page).count();
		let itNhat = Number.POSITIVE_INFINITY;
		for (let i = 0; i < n; i += 1) {
			const loai = (await rows(page).nth(i).locator('td').nth(3).innerText()).trim();
			if (/hub/i.test(loai)) continue;
			const so = Number(
				(await rows(page).nth(i).locator('td').nth(8).innerText()).replace(/\D/g, '') || 0,
			);
			if (so < itNhat) {
				itNhat = so;
				idx = i;
			}
		}
	}
	if (idx === null) skipNoData(test, 'Chỉ còn điểm bán loại Hub — Hub không gắn nhân viên được.');
	return { idx, ma: (await rows(page).nth(idx).locator('td').nth(2).innerText()).trim() };
}

const cotSoNhanVien = (page, i = 0) => rows(page).nth(i).locator('td').nth(8);

test.describe('01 — Gắn / gỡ nhân viên (GHI DỮ LIỆU THẬT)', () => {
	test('01_050_001 - Gán một nhân viên vào điểm bán thành công', async ({ page }) => {
		const { idx, ma } = await moShopRac(page);
		const drawer = await openAssignDrawer(page, idx);
		await choNapPhanCong(page, drawer);

		const truoc = await tongPhanCong(drawer);
		const tenNV = await themPhanCong(page, drawer);
		await luuPhanCong(page, drawer);

		// Mở lại drawer CỦA ĐÚNG điểm bán đó: dòng vừa gán phải còn đó.
		const lai = await moShopRac(page, ma);
		const drawer2 = await openAssignDrawer(page, lai.idx);
		await choNapPhanCong(page, drawer2);
		// 🔴 Poll chứ 🚫 đừng đọc một lần: drawer mở ra trước, danh sách phân công nạp sau một nhịp
		//    mạng, nên lần đọc đầu tiên còn là con số của lượt trước.
		await expect
			.poll(() => tongPhanCong(drawer2), {
				message: `Gán "${tenNV}" xong nhưng mở lại TỔNG số phân công 🚫 không tăng (trước: ${truoc}).`,
				timeout: 25_000,
			})
			.toBeGreaterThan(truoc);
	});

	test('01_050_007 - Cột Số lượng nhân viên tăng đúng 1 sau khi gắn', async ({ page }) => {
		const { idx, ma } = await moShopRac(page);
		const truoc = Number((await cotSoNhanVien(page, idx).innerText()).replace(/\D/g, '') || 0);

		const drawer = await openAssignDrawer(page, idx);
		await choNapPhanCong(page, drawer);
		/**
		 * 🔴 Phải gán cho **NGƯỜI CHƯA có ở điểm bán này**. Cột "Số lượng nhân viên" đếm **người**,
		 *    nên thêm một vai nữa cho người đã có thì cột **giữ nguyên** — case đỏ với lý do
		 *    *"cột không cập nhật"*, đọc như lỗi hiển thị, trong khi phân công đã được tạo đúng.
		 */
		// Phải chờ danh sách nạp xong rồi mới đọc — xem `choNapPhanCong`.
		await choNapPhanCong(page, drawer);
		// Lấy TOÀN BỘ chữ trong drawer làm bộ loại trừ — bao trùm cả dòng đã lưu hiển thị dạng text
		// lẫn ô select đã chọn, 🚫 không phụ thuộc vào cách từng dòng được render.
		const dangCo = [(await drawer.innerText()).normalize('NFC').replace(/\s+/g, ' ')];
		await themPhanCong(page, drawer, { loaiTru: dangCo });
		await luuPhanCong(page, drawer);

		const lai = await moShopRac(page, ma);
		await expect
			.poll(
				async () =>
					Number((await cotSoNhanVien(page, lai.idx).innerText()).replace(/\D/g, '') || 0),
				{
					message:
						`Cột "Số lượng nhân viên" 🚫 không tăng. Trước khi gắn: ${truoc}. `
						+ `Người đã có sẵn ở điểm bán (đã loại khỏi danh sách chọn): `
						+ `${JSON.stringify(dangCo).slice(0, 200)}`,
					timeout: 30_000,
				},
			)
			.toBe(truoc + 1);
	});

	test('01_050_002 - Thêm hai nhân viên trong cùng một lần lưu', async ({ page }) => {
		const { idx, ma } = await moShopRac(page);
		const drawer = await openAssignDrawer(page, idx);
		await choNapPhanCong(page, drawer);

		const truoc = await soDongPhanCong(drawer);
		/**
		 * 🔴 Loại trừ người đã có phân công ở điểm bán này.
		 *
		 * Phát hiện 23/09: FE chỉ chặn cặp *(người × vai)* trùng **trong các dòng ĐANG HIỂN THỊ**,
		 * mà danh sách phân công **có phân trang** ⇒ người ở trang khác 🚫 không được tính. Khi đó
		 * `batch-assign-roles` vẫn trả **`200`** nhưng kèm `data.errors`:
		 * `"Vai trò đã được gán cho nhân viên trong đơn vị này"` — tức dòng đó **🚫 không được tạo**
		 * mà người dùng 🚫 không hề biết.
		 */
		const daCo = [(await drawer.innerText()).normalize('NFC').replace(/\s+/g, ' ')];
		await themPhanCong(page, drawer, { loaiTru: daCo });
		await themPhanCong(page, drawer, { loaiTru: daCo });
		expect(
			await soDongPhanCong(drawer),
			'Bấm thêm hai lần phải ra đúng hai dòng phân công mới.',
		).toBe(truoc + 2);

		await luuPhanCong(page, drawer);

		const lai = await moShopRac(page, ma);
		const drawer2 = await openAssignDrawer(page, lai.idx);
		await choNapPhanCong(page, drawer2);
		// 🔴 Poll — drawer mở trước, danh sách về sau; đọc một lần là đọc trúng số 0 (xem
		//    `choNapPhanCong`).
		await expect
			.poll(() => soDongPhanCong(drawer2), {
				message: `Lưu một lần hai dòng nhưng mở lại 🚫 không thấy đủ hai (trước: ${truoc}).`,
				timeout: 25_000,
			})
			.toBeGreaterThanOrEqual(truoc + 2);
	});

	test('01_060_001 - Bấm ✕ gỡ dòng vừa thêm, không ảnh hưởng dòng đã lưu', async ({ page }) => {
		const { idx } = await moShopRac(page);
		const drawer = await openAssignDrawer(page, idx);
		await choNapPhanCong(page, drawer);

		const truoc = await soDongPhanCong(drawer);
		await themPhanCong(page, drawer);
		expect(await soDongPhanCong(drawer), 'Chưa thêm được dòng để thử gỡ.').toBe(truoc + 1);

		// 🔴 Nút ✕ chỉ BẬT ở dòng vừa thêm (`disabled={!isNew}`) — dòng đã lưu phải cho thôi việc
		//    bằng ô Trạng thái, không xoá hẳn (case 01_060_003).
		const nutXoa = drawer.getByRole('button', { name: '✕' });
		await nutXoa.last().click();

		await expect
			.poll(() => soDongPhanCong(drawer), {
				message: 'Bấm ✕ nhưng dòng phân công không biến mất.',
				timeout: 10_000,
			})
			.toBe(truoc);
	});

	test('01_050_009 - Một nhân viên được gán nhiều vai trò KHÁC nhau trong cùng điểm bán', async ({
		page,
	}) => {
		const { idx, ma } = await moShopRac(page);
		const drawer = await openAssignDrawer(page, idx);
		await choNapPhanCong(page, drawer);
		const truoc = await soDongPhanCong(drawer);

		/**
		 * Dòng 1 — 🔴 dùng `themPhanCong` (có **dò cặp còn trống**), 🚫 KHÔNG dùng
		 * `themDongChoNhanVien({thuTuVaiTro: 0})`: hàm đó lấy **người đầu danh sách**, mà người đó
		 * thường đã có phân công ở điểm bán ⇒ `AssignmentRoleSelect` trả ô về rỗng, dòng 1 trống,
		 * rồi lúc Lưu form chặn — **🚫 không request nào đi** và case chết sau 180 giây.
		 */
		const tenDayDu = await themPhanCong(page, drawer);
		const tenNV = String(tenDayDu).split(' - ')[0].trim();

		// Dòng 2: CÙNG nhân viên A + vai trò KHÁC ⇒ hợp lệ, không được cảnh báo.
		const coVaiTroThuHai = await themDongChoNhanVien(page, drawer, {
			tenNhanVien: tenNV,
			thuTuVaiTro: 1,
		});
		if (!coVaiTroThuHai) {
			skipNoData(test, `Nhân viên "${tenNV}" chỉ có một vai trò chọn được, không kiểm được nhiều vai trò.`);
		}

		await expect(
			page.locator('.ant-message').filter({ hasText: 'Vai trò này đã được gán cho nhân viên' }),
			'Hai vai trò KHÁC nhau của cùng một người là hợp lệ, không được cảnh báo trùng.',
		).toHaveCount(0);

		await luuPhanCong(page, drawer);
		await expect(
			page.locator('.ant-message').filter({ hasText: 'Gán nhân viên thành công' }).first(),
			'Lưu thành công phải hiện thông báo "Gán nhân viên thành công".',
		).toBeVisible({ timeout: 15_000 });

		const lai = await moShopRac(page, ma);
		const drawer2 = await openAssignDrawer(page, lai.idx);
		await choNapPhanCong(page, drawer2);
		await expect
			.poll(() => soDongPhanCong(drawer2), {
				message: `Gán 2 vai trò cho "${tenNV}" xong nhưng mở lại không thấy đủ hai dòng.`,
				timeout: 20_000,
			})
			.toBeGreaterThanOrEqual(truoc + 2);
	});

	test('01_060_002 - Cho nhân viên thôi việc bằng cách đổi trạng thái sang Đã nghỉ', async ({
		page,
	}) => {
		const { idx, ma } = await moShopRac(page);
		const drawer = await openAssignDrawer(page, idx);
		await choNapPhanCong(page, drawer);

		// Cần một dòng ĐÃ LƯU đang ở trạng thái "Đang làm".
		const daLuu = await drawer
			.getByRole('button', { name: '✕' })
			.first()
			.waitFor({ timeout: 20_000 })
			.then(() => drawer.getByRole('button', { name: '✕' }).count())
			.catch(() => 0);
		if (daLuu === 0) skipNoData(test, `Điểm bán ${ma} chưa có phân công nào đã lưu để cho thôi việc.`);

		const soDongTruoc = await soDongPhanCong(drawer);
		const oTrangThai = drawer.locator('.ant-select:has(input[id$="_status"])').first();
		const truoc = ((await oTrangThai.locator('.ant-select-content-has-value').getAttribute('title')) ?? '').trim();
		if (truoc !== 'Đang làm') {
			skipNoData(test, `Dòng phân công đầu tiên đang ở trạng thái "${truoc}", không phải "Đang làm".`);
		}

		const ds = await openDropdown(page, oTrangThai);
		await ds.locator('.ant-select-item-option').filter({ hasText: 'Đã nghỉ' }).first().click();
		await luuPhanCong(page, drawer);

		// 🔴 Điểm cốt lõi: dòng KHÔNG biến mất — hệ thống giữ lịch sử phân công, chỉ đổi trạng thái.
		const lai = await moShopRac(page, ma);
		const drawer2 = await openAssignDrawer(page, lai.idx);
		await choNapPhanCong(page, drawer2);
		await expect
			.poll(() => soDongPhanCong(drawer2), {
				message: 'Cho thôi việc mà dòng phân công biến mất — mất lịch sử phân công.',
				timeout: 20_000,
			})
			.toBe(soDongTruoc);
		await expect(
			drawer2.locator('.ant-select:has(input[id$="_status"])').first().locator('.ant-select-content-has-value'),
			'Dòng nhân viên phải mang trạng thái "Đã nghỉ" sau khi cho thôi việc.',
		).toHaveText('Đã nghỉ');

		// Trả môi trường về như cũ để chạy lại được nhiều lần.
		const dsVe = await openDropdown(page, drawer2.locator('.ant-select:has(input[id$="_status"])').first());
		await dsVe.locator('.ant-select-item-option').filter({ hasText: 'Đang làm' }).first().click();
		await luuPhanCong(page, drawer2);
	});
});
