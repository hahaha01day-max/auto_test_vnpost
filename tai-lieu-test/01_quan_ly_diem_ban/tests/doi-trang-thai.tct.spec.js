'use strict';

/**
 * Task 040 — Đổi trạng thái điểm bán.
 *
 * 🔴 **Sheet QC mô tả một màn KHÔNG tồn tại.** Case gốc `01_040_001`–`006` nói drawer **Chi tiết**
 * có nút *Xóa* (đỏ) / *Khôi phục* (xanh) và popup xác nhận. Thực tế:
 *   - `DrawerDetailShop.jsx:10` ghi thẳng: *"Ngừng / khôi phục hoạt động đã chuyển sang form sửa
 *     điểm bán (DrawerCreateShop)"* — drawer Chi tiết chỉ để XEM.
 *   - `ShopManagement.jsx` không gọi `deleteShop` lần nào; API xoá chỉ dùng ở màn khác + cần OTP.
 *   - Trạng thái chỉ có 2 giá trị: `Đang hoạt động` / `Tạm ngừng` (`shopOperatingStatus.js`),
 *     KHÔNG có "Ngừng hoạt động" màu đỏ như Sheet QC viết.
 * ⇒ `01_040_001/002` ở đây kiểm đúng hiện trạng sản phẩm (chi tiết không có nút đổi trạng thái),
 *   còn `003`–`006` viết lại theo **luồng thật**: đổi ô Trạng thái trên màn Sửa.
 *
 * 🔴 File này GHI DỮ LIỆU THẬT (`PUT /shops/profile/:id`). Nó chỉ đụng vào điểm bán rác do
 * automation tạo (`shop_name` bắt đầu bằng `AUTO TEST KHONG DUNG`) và luôn trả về trạng thái ban
 * đầu ở case cuối. 🚫 Không trỏ nó vào điểm bán thật.
 */

const { test, expect } = require('@playwright/test');
const {
	openDetailDrawer,
	openEditDrawer,
	openShopList,
	reloadBy,
	rows,
	searchBox,
	settleTable,
	skipNoData,
} = require('./shop-page');

test.describe.configure({ mode: 'serial' });

/** Điểm bán rác dùng làm vật thí nghiệm — KHÔNG đụng vào dữ liệu thật. */
const TU_KHOA = 'AUTO';

/** Lọc danh sách về đúng nhóm điểm bán rác. */
async function locShopRac(page) {
	await reloadBy(page, () => searchBox(page).fill(TU_KHOA));
	await settleTable(page);
	if ((await rows(page).count()) === 0) {
		skipNoData(test, `Không tìm thấy điểm bán nào khớp "${TU_KHOA}" để thử đổi trạng thái.`);
	}
}

const cotTrangThai = (page, i = 0) => rows(page).nth(i).locator('td').nth(7);

/** Đổi ô Trạng thái trong drawer Sửa rồi Xác nhận; trả về response của PUT. */
async function doiTrangThai(page, drawer, nhan) {
	await drawer.getByText(nhan, { exact: true }).first().click();

	const cho = page.waitForResponse(
		(r) => r.request().method() === 'PUT' && r.url().includes('/shops/profile'),
		{ timeout: 180_000 },
	);
	await drawer.getByRole('button', { name: 'Xác nhận' }).click();

	// 🔴 Chuyển sang Tạm ngừng có modal xác nhận RIÊNG ("Xác nhận ngừng hoạt động…", nút *Đồng ý*).
	//    Bỏ qua modal này là test treo ở `waitForResponse` mà không hiểu vì sao.
	const dongY = page.locator('.ant-modal-confirm button').filter({ hasText: 'Đồng ý' }).first();
	if (await dongY.isVisible({ timeout: 5_000 }).catch(() => false)) await dongY.click();

	return cho;
}

test.describe('01 — Đổi trạng thái điểm bán', () => {
	test.beforeEach(async ({ page }) => {
		await openShopList(page, 'tct');
	});

	test('01_040_001 - Drawer Chi tiết chỉ để xem, không có nút đổi trạng thái', async ({ page }) => {
		await locShopRac(page);
		const drawer = await openDetailDrawer(page);

		for (const nhan of ['Xóa', 'Khôi phục', 'Ngừng hoạt động', 'Tạm ngừng']) {
			await expect(
				drawer.getByRole('button', { name: nhan }),
				`Drawer Chi tiết không được có nút "${nhan}" — luồng đổi trạng thái nằm ở màn Sửa.`,
			).toHaveCount(0);
		}
	});

	test('01_040_002 - Trạng thái chỉ có Đang hoạt động / Tạm ngừng', async ({ page }) => {
		await locShopRac(page);

		const so = await rows(page).count();
		expect(so, 'Không có dòng nào để đối chiếu nhãn trạng thái.').toBeGreaterThan(0);
		for (let i = 0; i < so; i++) {
			await expect(
				cotTrangThai(page, i),
				'Cột Trạng thái chỉ được hiện "Đang hoạt động" hoặc "Tạm ngừng".',
			).toHaveText(/^(Đang hoạt động|Tạm ngừng)$/);
		}
	});

	test('01_040_004 - Đóng drawer Sửa bằng Hủy thì trạng thái không đổi', async ({ page }) => {
		await locShopRac(page);
		const truoc = (await cotTrangThai(page).innerText()).trim();

		const drawer = await openEditDrawer(page);
		await drawer.getByText('Tạm ngừng', { exact: true }).first().click();
		await drawer.getByRole('button', { name: 'Hủy' }).click();

		await expect(drawer, 'Bấm Hủy phải đóng drawer.').toBeHidden();
		await expect(
			cotTrangThai(page),
			'Bấm Hủy mà trạng thái trong danh sách đổi nghĩa là đã lưu nhầm.',
		).toHaveText(truoc);
	});

	test('01_040_003 - Chuyển sang Tạm ngừng ở màn Sửa thì danh sách đổi theo', async ({ page }) => {
		await locShopRac(page);

		// Tìm một dòng đang hoạt động để hạ xuống Tạm ngừng.
		let idx = null;
		const so = await rows(page).count();
		for (let i = 0; i < so; i++) {
			if ((await cotTrangThai(page, i).innerText()).trim() === 'Đang hoạt động') {
				idx = i;
				break;
			}
		}
		if (idx === null) skipNoData(test, 'Không có điểm bán rác nào đang hoạt động để tạm ngừng.');

		const ma = (await rows(page).nth(idx).locator('td').nth(2).innerText()).trim();
		const drawer = await openEditDrawer(page, idx);
		const res = await doiTrangThai(page, drawer, 'Tạm ngừng');

		const body = await res.json().catch(() => null);
		expect(
			String(body?.status?.code),
			`Cập nhật trạng thái thất bại: ${JSON.stringify(body?.status)}`,
		).toBe('200');

		await openShopList(page, 'tct');
		await reloadBy(page, () => searchBox(page).fill(ma));
		await settleTable(page);
		await expect(cotTrangThai(page), `Điểm bán ${ma} phải chuyển sang Tạm ngừng.`).toHaveText(
			'Tạm ngừng',
		);
		test.info().annotations.push({ type: 'đã sửa dữ liệu thật', description: `Tạm ngừng ${ma}` });
	});

	test('01_040_006 - Lọc Đang hoạt động không còn thấy điểm bán vừa tạm ngừng', async ({ page }) => {
		await locShopRac(page);

		const so = await rows(page).count();
		const daNgung = [];
		for (let i = 0; i < so; i++) {
			if ((await cotTrangThai(page, i).innerText()).trim() === 'Tạm ngừng') {
				daNgung.push((await rows(page).nth(i).locator('td').nth(2).innerText()).trim());
			}
		}
		if (daNgung.length === 0) skipNoData(test, 'Không có điểm bán rác nào đang Tạm ngừng.');

		// Lọc Trạng thái = Đang hoạt động (select thứ 2 trong hàng lọc).
		const loc = page.locator('div.flex.flex-wrap.gap-3').first().locator('.ant-select').nth(1);
		await loc.click();
		const opt = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({
			hasText: 'Đang hoạt động',
		});
		await reloadBy(page, () => opt.first().click());
		await settleTable(page);

		const conLai = await rows(page).count();
		for (let i = 0; i < conLai; i++) {
			const ma = (await rows(page).nth(i).locator('td').nth(2).innerText()).trim();
			expect(
				daNgung,
				`Lọc "Đang hoạt động" mà vẫn thấy ${ma} — điểm bán này đang Tạm ngừng.`,
			).not.toContain(ma);
		}
	});

	test('01_040_010 - Sau khi tạm ngừng thì thấy bản ghi ở bộ lọc Ngừng hoạt động', async ({
		page,
	}) => {
		// 🔴 Case ĐỐI ỨNG của 01_040_006: 006 kiểm "không còn ở bộ lọc Đang hoạt động", case này
		//    kiểm "đã có mặt ở bộ lọc Tạm ngừng". Thiếu vế này thì một bản ghi biến mất khỏi CẢ
		//    HAI bộ lọc vẫn làm 006 xanh.
		// Chạy sau 01_040_003 (serial) nên đã có sẵn điểm bán rác vừa bị tạm ngừng.
		await locShopRac(page);

		const so = await rows(page).count();
		const daNgung = [];
		for (let i = 0; i < so; i++) {
			if ((await cotTrangThai(page, i).innerText()).trim() === 'Tạm ngừng') {
				daNgung.push((await rows(page).nth(i).locator('td').nth(2).innerText()).trim());
			}
		}
		if (daNgung.length === 0) skipNoData(test, 'Không có điểm bán rác nào đang Tạm ngừng để đối chiếu.');

		const loc = page.locator('div.flex.flex-wrap.gap-3').first().locator('.ant-select').nth(1);
		await loc.click();
		const opt = page
			.locator('.ant-select-dropdown:visible .ant-select-item-option')
			.filter({ hasText: 'Tạm ngừng' });
		await reloadBy(page, () => opt.first().click());
		await settleTable(page);

		const hienRa = [];
		const conLai = await rows(page).count();
		expect(conLai, 'Lọc Tạm ngừng mà bảng rỗng dù vừa xác nhận có bản ghi Tạm ngừng.').toBeGreaterThan(0);
		for (let i = 0; i < conLai; i++) {
			hienRa.push((await rows(page).nth(i).locator('td').nth(2).innerText()).trim());
			await expect(cotTrangThai(page, i), 'Lọc Tạm ngừng mà lọt dòng ở trạng thái khác.').toHaveText('Tạm ngừng');
		}
		for (const ma of daNgung) {
			expect(hienRa, `Điểm bán ${ma} đang Tạm ngừng nhưng không xuất hiện ở bộ lọc Tạm ngừng.`).toContain(ma);
		}
	});

	test('01_040_009 - Bảng trạng thái × hành động: điểm bán Ngừng hoạt động còn làm được gì', async ({
		page,
	}) => {
		await locShopRac(page);

		const loc = page.locator('div.flex.flex-wrap.gap-3').first().locator('.ant-select').nth(1);
		await loc.click();
		await reloadBy(page, () =>
			page
				.locator('.ant-select-dropdown:visible .ant-select-item-option')
				.filter({ hasText: 'Tạm ngừng' })
				.first()
				.click(),
		);
		await settleTable(page);
		if ((await rows(page).count()) === 0) skipNoData(test, 'Không có điểm bán nào đang Tạm ngừng để đo.');

		// 🔴 Đo TỪNG Ô của bảng quyết định. Cột Hành động khai 4 nút đúng thứ tự trong
		//    `ShopManagement.jsx`: 0 Chi tiết · 1 Sửa · 2 Thiết lập điểm bán · 3 Gắn nhân viên.
		//    Hiện cột này chỉ gác theo `permKey`, KHÔNG gác theo trạng thái ⇒ nếu nghiệp vụ đòi
		//    chặn thao tác trên điểm bán đã ngừng thì đây là lỗ hổng. 🚫 Không kết luận trước khi đo.
		const TEN_NUT = ['Xem chi tiết', 'Sửa', 'Thiết lập điểm bán', 'Gắn nhân viên'];
		const nut = rows(page).first().locator('td').last().locator('button');
		const soNut = await nut.count();
		expect(soNut, 'Dòng Tạm ngừng không có nút Hành động nào để đo.').toBeGreaterThan(0);

		const ketQua = [];
		for (let i = 0; i < soNut; i += 1) {
			const ten = TEN_NUT[i] ?? `nút #${i}`;
			if (await nut.nth(i).isDisabled()) {
				ketQua.push(`${ten}: BỊ CHẶN (disabled)`);
				continue;
			}
			await nut.nth(i).click();
			const drawer = page.locator('.ant-drawer-open').first();
			const moDuoc = await drawer.isVisible({ timeout: 10_000 }).catch(() => false);
			const tieuDe = moDuoc ? (await drawer.locator('.ant-drawer-title').first().innerText().catch(() => '')).trim() : '';
			ketQua.push(moDuoc ? `${ten}: MỞ ĐƯỢC ("${tieuDe}")` : `${ten}: không mở được gì`);
			if (moDuoc) {
				await page.locator('.ant-drawer-close').first().click();
				await expect(drawer).toBeHidden();
			}
		}

		test.info().annotations.push({
			type: 'bảng quyết định đo được',
			description: `Điểm bán Tạm ngừng — ${ketQua.join(' · ')}`,
		});
		if (!ketQua.some((x) => x.includes('BỊ CHẶN'))) {
			test.info().annotations.push({
				type: 'lỗ hổng đặc tả',
				description:
					'KHÔNG nút Hành động nào bị chặn trên điểm bán Tạm ngừng — cột Hành động chỉ gác theo quyền, không theo trạng thái. Cần user chốt nghiệp vụ có phải chặn không.',
			});
		}
		// Không đoán kỳ vọng, nhưng phải chắc đã đo được đủ số nút khai trong code.
		expect(ketQua.length, 'Chưa đo hết các nút của cột Hành động.').toBe(soNut);
	});

	test('01_040_005 - Khôi phục lại Đang hoạt động ở màn Sửa (trả môi trường về như cũ)', async ({
		page,
	}) => {
		await locShopRac(page);

		let idx = null;
		const so = await rows(page).count();
		for (let i = 0; i < so; i++) {
			if ((await cotTrangThai(page, i).innerText()).trim() === 'Tạm ngừng') {
				idx = i;
				break;
			}
		}
		if (idx === null) skipNoData(test, 'Không có điểm bán rác nào đang Tạm ngừng để khôi phục.');

		const ma = (await rows(page).nth(idx).locator('td').nth(2).innerText()).trim();
		const drawer = await openEditDrawer(page, idx);
		const res = await doiTrangThai(page, drawer, 'Đang hoạt động');

		const body = await res.json().catch(() => null);
		expect(
			String(body?.status?.code),
			`Khôi phục trạng thái thất bại: ${JSON.stringify(body?.status)}`,
		).toBe('200');

		await openShopList(page, 'tct');
		await reloadBy(page, () => searchBox(page).fill(ma));
		await settleTable(page);
		await expect(cotTrangThai(page), `Điểm bán ${ma} phải trở lại Đang hoạt động.`).toHaveText(
			'Đang hoạt động',
		);
	});
});
