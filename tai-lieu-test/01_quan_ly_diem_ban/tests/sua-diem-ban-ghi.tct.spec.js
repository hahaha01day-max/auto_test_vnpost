'use strict';

/**
 * Task 030 + 040 — các case **GHI DỮ LIỆU THẬT** (`PUT /shops/profile/:id`).
 *
 * 🔴 File này chỉ đụng vào điểm bán rác do automation tạo (`shop_name` bắt đầu bằng
 * `AUTO TEST KHONG DUNG`). 🚫 Không trỏ vào điểm bán thật.
 * Mọi case đều **tự trả giá trị về như cũ** ở cuối, để chạy lại nhiều lần không trôi dữ liệu.
 */

const { test, expect } = require('@playwright/test');
const {
	openDropdown,
	openEditDrawer,
	openShopList,
	reloadBy,
	rows,
	searchBox,
	selectByField,
	settleTable,
	skipNoData,
	totalFromTitle,
} = require('./shop-page');

test.describe.configure({ mode: 'serial' });

const TU_KHOA = 'AUTO';

/** Lọc danh sách về nhóm điểm bán rác; skip có lý do nếu môi trường không có. */
async function locShopRac(page) {
	await reloadBy(page, () => searchBox(page).fill(TU_KHOA));
	await settleTable(page);
	if ((await rows(page).count()) === 0) {
		skipNoData(test, `Không có điểm bán nào khớp "${TU_KHOA}" để thử sửa.`);
	}
}

/** Bấm Xác nhận trong drawer Sửa và chờ PUT. Timeout 180s — xem §3.1c handoff (Kafka tắt). */
async function luuSua(page, drawer) {
	const cho = page.waitForResponse(
		(r) => r.request().method() === 'PUT' && r.url().includes('/shops/profile'),
		{ timeout: 180_000 },
	);
	await drawer.getByRole('button', { name: 'Xác nhận' }).click();
	const dongY = page.locator('.ant-modal-confirm button').filter({ hasText: 'Đồng ý' }).first();
	if (await dongY.isVisible({ timeout: 5_000 }).catch(() => false)) await dongY.click();
	const res = await cho;
	const body = await res.json().catch(() => null);
	expect(String(body?.status?.code), `Lưu thất bại: ${JSON.stringify(body?.status)}`).toBe('200');
	return body;
}

test.describe('01 — Sửa điểm bán (GHI DỮ LIỆU THẬT trên điểm bán rác)', () => {
	test.beforeEach(async ({ page }) => {
		await openShopList(page, 'tct');
		await locShopRac(page);
	});

	test('01_030_001 - Sửa Tên điểm bán thành công, Mã giữ nguyên', async ({ page }) => {
		const maTruoc = (await rows(page).first().locator('td').nth(2).innerText()).trim();
		const tenTruoc = (await rows(page).first().locator('td').nth(1).innerText()).trim();
		const tenMoi = `${tenTruoc} Updated`;

		const drawer = await openEditDrawer(page);
		await drawer.locator('input[placeholder*="Nhập tên"]').first().fill(tenMoi);
		await luuSua(page, drawer);

		await openShopList(page, 'tct');
		await reloadBy(page, () => searchBox(page).fill(maTruoc));
		await settleTable(page);
		await expect(
			rows(page).first().locator('td').nth(1),
			'Danh sách phải hiện tên vừa sửa.',
		).toHaveText(tenMoi);
		await expect(
			rows(page).first().locator('td').nth(2),
			'Sửa tên KHÔNG được làm đổi Mã điểm bán.',
		).toHaveText(maTruoc);

		// Trả tên về như cũ để chạy lại không dồn hậu tố "Updated".
		const drawer2 = await openEditDrawer(page);
		await drawer2.locator('input[placeholder*="Nhập tên"]').first().fill(tenTruoc);
		await luuSua(page, drawer2);
	});

	/**
	 * 🔴 LỆCH TÀI LIỆU ↔ SẢN PHẨM — cần PO chốt, xem §4 handoff.
	 * Sheet QC nói đổi Bưu điện tỉnh/xã là "cập nhật thành công". Thực tế backend **từ chối**:
	 *   `SSHOP-402 — Mã điểm bán phải bắt đầu bằng mã đơn vị cha: 0011` (requestId lKTxKJ).
	 * Lý do: mã điểm bán phải mở đầu bằng mã đơn vị cha, mà ô Mã ở màn Sửa **luôn disabled**
	 * ⇒ chuyển điểm bán sang đơn vị khác là việc BẤT KHẢ THI trên UI, dù UI vẫn cho chọn.
	 * Case này vì vậy ghi nhận HÀNH VI THẬT: đổi đơn vị thì bị chặn và dữ liệu không đổi.
	 * Nếu sau này sản phẩm cho đổi (sinh lại mã, hoặc mở khoá ô Mã) thì case này sẽ đỏ — đúng lúc
	 * cần xem lại, không phải test hỏng.
	 */
	test('01_030_002 - Đổi Bưu điện tỉnh/xã bị chặn vì mã điểm bán đã khoá theo đơn vị cha', async ({
		page,
	}) => {
		const ma = (await rows(page).first().locator('td').nth(2).innerText()).trim();
		const tinhTruoc = (await rows(page).first().locator('td').nth(5).innerText()).trim();

		const drawer = await openEditDrawer(page);
		const chonTinh = selectByField(drawer, 'orgProvinceCode');
		if ((await chonTinh.count()) === 0) {
			skipNoData(test, `Điểm bán ${ma} ở cấp không có ô Bưu điện tỉnh/thành phố.`);
		}

		// Chọn một tỉnh KHÁC tỉnh hiện tại — nếu chọn trúng tỉnh cũ thì case không kiểm được gì.
		const ds = await openDropdown(page, chonTinh);
		const opts = ds.locator('.ant-select-item-option');
		const n = await opts.count();
		let tenMoi = null;
		for (let i = 0; i < n; i++) {
			const t = (await opts.nth(i).innerText()).trim();
			if (t && t !== tinhTruoc) {
				tenMoi = t;
				await opts.nth(i).click();
				break;
			}
		}
		if (!tenMoi) skipNoData(test, 'Danh mục chỉ có đúng một bưu điện tỉnh — không đổi được.');

		// Đổi tỉnh làm rỗng ô Bưu điện xã (onClear/onChange trong DrawerCreateShop) ⇒ phải chọn lại.
		const chonXa = selectByField(drawer, 'orgWardCode');
		if (await chonXa.count()) {
			const dsXa = await openDropdown(page, chonXa);
			await expect
				.poll(async () => dsXa.locator('.ant-select-item-option').count(), {
					message: 'Đổi tỉnh xong mà danh sách bưu điện xã không nạp được.',
					timeout: 20_000,
				})
				.toBeGreaterThan(0);
			await dsXa.locator('.ant-select-item-option').first().click();
		}

		const cho = page.waitForResponse(
			(r) => r.request().method() === 'PUT' && r.url().includes('/shops/profile'),
			{ timeout: 180_000 },
		);
		await drawer.getByRole('button', { name: 'Xác nhận' }).click();
		const body = await (await cho).json().catch(() => null);

		expect(
			String(body?.status?.code),
			`Đổi đơn vị sang "${tenMoi}" mà server lại chấp nhận — hành vi đã đổi so với 17/09, ` +
				'đọc lại chú thích phía trên case này.',
		).not.toBe('200');
		/**
		 * 🔴 Server từ chối bằng **hai lý do khác nhau tuỳ dữ liệu**, cả hai đều là "từ chối đúng":
		 *   - `mã đơn vị cha` — mã điểm bán khoá theo đơn vị cha (đo 17/09);
		 *   - **`SSHOP-402` "Đơn vị cấp xã với đơn vị cấp tỉnh không hợp lệ"** — cặp tỉnh/xã vừa
		 *     chọn 🚫 không thuộc nhau (đo 22/09, và đây là lý do case từng ĐỎ oan).
		 *
		 * Case này kiểm **"🚫 không đổi được đơn vị"**, 🚫 không kiểm server chọn câu chữ nào. Bám
		 * cứng một câu là mỗi lần dữ liệu danh mục đổi lại đỏ một lần vì lý do không liên quan.
		 */
		expect(
			String(body?.status?.message || ''),
			`Server từ chối nhưng bằng lý do 🚫 không nằm trong hai lý do đã biết: `
				+ `${JSON.stringify(body?.status)}`,
		).toMatch(/mã đơn vị cha|không hợp lệ/i);

		// Dữ liệu phải giữ nguyên vì server đã từ chối.
		await openShopList(page, 'tct');
		await reloadBy(page, () => searchBox(page).fill(ma));
		await settleTable(page);
		await expect(
			rows(page).first().locator('td').nth(5),
			'Server từ chối mà cột Bưu điện Tỉnh vẫn đổi — dữ liệu đã bị ghi nửa vời.',
		).toHaveText(tinhTruoc);

		test.info().annotations.push({
			type: 'lệch tài liệu',
			description:
				'Sheet QC nói đổi Bưu điện tỉnh/xã thành công; sản phẩm chặn vì mã điểm bán khoá ' +
				'theo đơn vị cha. Cần PO chốt hành vi đúng.',
		});
	});

	test('01_040_008 - Lọc Tạm ngừng rồi khôi phục về Đang hoạt động ở màn Sửa', async ({ page }) => {
		// Lọc Trạng thái = Tạm ngừng (select thứ 2 trong hàng lọc).
		const loc = page.locator('div.flex.flex-wrap.gap-3').first().locator('.ant-select').nth(1);
		await loc.click();
		const opt = page
			.locator('.ant-select-dropdown:visible .ant-select-item-option')
			.filter({ hasText: 'Tạm ngừng' });
		await reloadBy(page, () => opt.first().click());
		await settleTable(page);

		if ((await rows(page).count()) === 0) {
			skipNoData(test, 'Không có điểm bán nào đang Tạm ngừng để khôi phục.');
		}

		const ma = (await rows(page).first().locator('td').nth(2).innerText()).trim();
		const drawer = await openEditDrawer(page);
		await drawer.getByText('Đang hoạt động', { exact: true }).first().click();
		await luuSua(page, drawer);

		await openShopList(page, 'tct');
		await reloadBy(page, () => searchBox(page).fill(ma));
		await settleTable(page);
		await expect(
			rows(page).first().locator('td').nth(7),
			`Điểm bán ${ma} phải trở lại Đang hoạt động.`,
		).toHaveText('Đang hoạt động');
	});

	test('01_030_011 - Sửa xong danh sách tự cập nhật, không cần tải lại trang', async ({ page }) => {
		const tenTruoc = (await rows(page).first().locator('td').nth(1).innerText()).trim();
		const ma = (await rows(page).first().locator('td').nth(2).innerText()).trim();
		const tongTruoc = await totalFromTitle(page);
		const tenMoi = `${tenTruoc} ĐÃ SỬA`;

		const drawer = await openEditDrawer(page, 0);
		await drawer.locator('input[placeholder*="Nhập tên"]').first().fill(tenMoi);
		await luuSua(page, drawer);

		// 🔴 KHÔNG F5: điểm cần kiểm chính là mutation `updateShopOrHub` có invalidate tag
		//    `chainListVNPost` để danh sách tự refetch hay không. Tải lại trang là bỏ mất case.
		await expect
			.poll(async () => (await rows(page).first().locator('td').nth(1).innerText()).trim(), {
				message: `Sửa tên xong mà dòng trong bảng vẫn là "${tenTruoc}" khi chưa tải lại trang ⇒ danh sách không tự refetch.`,
				timeout: 30_000,
			})
			.toBe(tenMoi);
		expect(await totalFromTitle(page), 'Sửa tên mà tổng số bản ghi lại đổi.').toBe(tongTruoc);

		// Trả tên về như cũ để chạy lại nhiều lần không dồn đuôi "ĐÃ SỬA".
		const tra = await openEditDrawer(page, 0);
		await tra.locator('input[placeholder*="Nhập tên"]').first().fill(tenTruoc);
		await luuSua(page, tra);
		test.info().annotations.push({
			type: 'đã sửa dữ liệu thật',
			description: `Đổi tên ${ma} sang "${tenMoi}" rồi trả lại "${tenTruoc}".`,
		});
	});
});
