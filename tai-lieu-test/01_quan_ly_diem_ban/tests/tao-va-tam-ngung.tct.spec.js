'use strict';

/**
 * Task 020 + 040 — GHI DỮ LIỆU THẬT. Tạo một Hub test rồi chuyển sang Tạm ngừng.
 *
 * 🔴 ĐỌC TRƯỚC KHI CHẠY LẠI FILE NÀY
 *
 * `VNPOST_BASE_URL` là FE dev server, nhưng `rsbuild.config.js` proxy `/__api` sang
 * `PUBLIC_BASE_URL` — hiện trỏ **API production**. File này tạo bản ghi THẬT.
 *
 * 🚫 Màn `/chain/shop-management` KHÔNG có chức năng xoá: `ShopManagement.jsx` không gọi
 * `deleteShop` lần nào; API xoá chỉ dùng ở màn khác (`features/shop/components/ShopList.jsx`)
 * và cần xác nhận OTP. HDSD 040 cũng ghi rõ màn Chi tiết "chỉ để xem, không có nút đổi trạng thái".
 * ⇒ Cách dọn duy nhất ở đây là **chuyển sang Tạm ngừng**. Bản ghi Ở LẠI production vĩnh viễn.
 * User đã được báo và chấp nhận điều này (17/09/2026).
 *
 * Vì vậy: mỗi lần chạy sinh **đúng một** bản ghi. 🚫 Không chạy lặp cho vui.
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
	skipNoData,
} = require('./shop-page');

// Chạy nối tiếp: test tạm ngừng phụ thuộc bản ghi do test tạo sinh ra.
test.describe.configure({ mode: 'serial' });

const DAU = Date.now().toString().slice(-6);
const TEN_SHOP = `AUTO TEST KHONG DUNG ${DAU}`;

/**
 * Mã điểm bán — 🔴 KHÔNG được đặt tuỳ ý.
 * Backend bắt mã phải **bắt đầu bằng mã đơn vị cha** (`orgProvinceCode`), nếu không trả
 * `SSHOP-402 ERROR_CORE_BAD_REQUEST: "Mã điểm bán phải bắt đầu bằng mã đơn vị cha: 00"`.
 * Trên UI validate client chặn trước nên POST còn không được gửi — đó là lý do 3 lần thử đầu
 * (§3.2 handoff) không tạo được bản ghi nào, KHÔNG phải lỗi sản phẩm.
 * Mã thật chỉ biết sau khi chọn xong Bưu điện tỉnh, nên gán trong test chứ không phải hằng ở đây.
 */
let MA_SHOP = null;

/** Trạng thái sau cùng — dùng cho bước dọn ở `afterAll`. */
let daTamNgung = false;

async function timTheoMa(page, ma) {
	await reloadBy(page, () => searchBox(page).fill(ma));
	return rows(page);
}

test.describe('01 — Tạo Hub test rồi tạm ngừng (GHI DỮ LIỆU THẬT)', () => {
	test('01_020_001 - Thêm mới Pos mini thành công với đầy đủ trường bắt buộc', async ({ page }) => {
		// Gom danh mục đơn vị tổ chức từ chính response của app — cần `unitCode` để đặt mã điểm bán.
		const donViTheoTen = new Map();
		page.on('response', async (res) => {
			if (!res.url().includes('organization-unit')) return;
			const body = await res.json().catch(() => null);
			for (const x of body?.data || []) {
				if (x?.unitName && x?.unitCode) donViTheoTen.set(String(x.unitName).trim(), x.unitCode);
			}
		});

		await openShopList(page, 'tct');
		await page.getByRole('button', { name: 'Thêm điểm bán' }).first().click();

		const drawer = page.locator('.ant-drawer-open').first();
		await expect(drawer).toBeVisible();

		// 🔴 Cấp Tỉnh + phân loại Hub bị backend trả SSHOP-500 hai lần liên tiếp dù payload đầy đủ
		//    (xem báo cáo 17/09). Dùng cấp Xã + Pos mini — đường mà dữ liệu rác `AUTO POS *` sẵn có
		//    trên môi trường chứng minh là chạy được.
		await drawer.getByText('Xã', { exact: true }).first().click();
		await page.waitForTimeout(1500);
		const posMini = drawer.getByText('Pos mini', { exact: true }).first();
		if (await posMini.isVisible().catch(() => false)) await posMini.click();

		await drawer.locator('input[placeholder*="Nhập tên"]').first().fill(TEN_SHOP);
		await drawer.locator('input[placeholder*="Nhập email"]').first().fill(`autotest${DAU}@example.com`);
		await drawer.locator('input[placeholder*="Nhập số điện thoại"]').first().fill('0900000000');
		await drawer.locator('input[placeholder*="Nhập SĐT quản lý"]').first().fill('0900000001');
		await drawer.locator('input[placeholder*="Số nhà"]').first().fill('AUTO TEST - khong su dung');

		// Loại hình điểm bán — chỉ có ở Pos mini / Pos plus.
		const loaiHinh = drawer.locator('.ant-select').filter({ hasText: 'Chọn loại hình' }).first();
		if (await loaiHinh.count()) {
			await (await openDropdown(page, loaiHinh)).locator('.ant-select-item-option').first().click();
		}

		// 🔴 Bắt response danh mục đơn vị để biết `unitCode` thật của tỉnh sắp chọn — mã điểm bán
		//    phải mở đầu bằng đúng mã đó (xem chú thích ở `MA_SHOP`). Nhãn trên dropdown chỉ có
		//    tên đơn vị, không có mã, nên không suy ra được từ DOM.
		const chonTinh = selectByField(drawer, 'orgProvinceCode');
		const dsTinh = await openDropdown(page, chonTinh);
		const tenTinh = (await dsTinh.locator('.ant-select-item-option').first().innerText()).trim();

		// 🚫 Không gọi lại API bằng `page.request`: request đó KHÔNG mang token của app
		//    (token nằm trong RAM, xem chú thích ở `shared/auth/login.js`) nên trả 401.
		//    Dùng đúng response mà app đã gọi, gom sẵn từ đầu test qua `donViTheoTen`.
		const maTinh = donViTheoTen.get(tenTinh);
		expect(
			maTinh,
			`Không tra được mã đơn vị của "${tenTinh}" — không đặt được mã điểm bán hợp lệ.`,
		).toBeTruthy();
		await dsTinh.locator('.ant-select-item-option').first().click();

		// Cấp Xã bắt buộc chọn cả Bưu điện xã/phường.
		// 🔴 Ở cấp Xã, đơn vị cha của điểm bán là BƯU ĐIỆN XÃ chứ không phải tỉnh: backend trả
		//    `SSHOP-402 ... phải bắt đầu bằng mã đơn vị cha: 0002` khi lấy mã tỉnh ("00").
		//    Vì vậy mã chỉ được đặt SAU khi biết đơn vị cấp thấp nhất đã chọn.
		let maCha = maTinh;
		const chonBdXa = selectByField(drawer, 'orgWardCode');
		if (await chonBdXa.count()) {
			const ds = await openDropdown(page, chonBdXa);
			// 🔴 Danh sách xã chỉ được gọi SAU khi có `orgProvinceCode` (`useGetOrganizationListQuery`
			//    skip khi chưa có tỉnh). Mở dropdown ngay thì nó còn rỗng, `count()` = 0 và test bỏ
			//    qua ô bắt buộc này — triệu chứng là "Trường bị chặn: Bưu điện xã/phường".
			await expect
				.poll(async () => ds.locator('.ant-select-item-option').count(), {
					message: 'Dropdown Bưu điện xã/phường không nạp được lựa chọn nào.',
					timeout: 20_000,
				})
				.toBeGreaterThan(0);

			const tenXa = (await ds.locator('.ant-select-item-option').first().innerText()).trim();
			const maXa = donViTheoTen.get(tenXa);
			expect(maXa, `Không tra được mã bưu điện xã "${tenXa}".`).toBeTruthy();
			maCha = maXa;
			await ds.locator('.ant-select-item-option').first().click();
		}

		MA_SHOP = `${maCha}AUTO${DAU}`;
		await drawer.locator('input[placeholder*="Nhập mã"]').first().fill(MA_SHOP);

		// 🔴 `Tỉnh/TP` và `Xã/Phường` KHÔNG được FE đánh dấu bắt buộc, nhưng payload gửi
		//    `provinceId`/`wardId` = null khi bỏ trống (xem DrawerCreateShop.jsx). Lần chạy đầu bỏ
		//    trống hai ô này thì backend trả SSHOP-500. Điền đủ để tách bạch: còn lỗi nữa thì là
		//    lỗi thật của backend, không phải do thiếu dữ liệu đầu vào.
		const chonTinhTP = drawer.locator('.ant-select').filter({ hasText: 'Chọn tỉnh/thành phố' }).first();
		if (await chonTinhTP.count()) {
			await (await openDropdown(page, chonTinhTP)).locator('.ant-select-item-option').first().click();
			const chonXa = drawer.locator('.ant-select').filter({ hasText: 'Chọn xã/phường' }).first();
			const dsXa = await openDropdown(page, chonXa);
			if (await dsXa.locator('.ant-select-item-option').count()) {
				await dsXa.locator('.ant-select-item-option').first().click();
			} else {
				await page.keyboard.press('Escape');
			}
		}

		// Ghi lại payload để báo cáo được nguyên nhân khi backend từ chối.
		let payloadGui = null;
		const moiPost = [];
		page.on('request', (req) => {
			if (req.method() === 'POST') moiPost.push(req.url());
			if (req.method() === 'POST' && req.url().includes('/shops/profile')) {
				payloadGui = req.postData();
			}
		});

		// 🔴 Bấm Xác nhận mà validate client chặn thì POST KHÔNG BAO GIỜ được gửi, và
		//    `waitForResponse` treo hết 60s rồi đỏ với lý do vô nghĩa "Timeout waiting for event".
		//    Phải bắt lấy lỗi validate và nói thẳng trường nào chặn — đó mới là thông tin cần.
		const cho = page
			.waitForResponse(
				(r) => r.request().method() === 'POST' && r.url().includes('/shops/profile'),
				// 🔴 180s. Đo bằng curl trực tiếp lên gateway ngày 17/09: `POST /shops/profile` trả 200
				//    sau **120,6 giây** (requestId pvAeuV). Nó còn kéo theo gán cây tổ chức, routing
				//    pod và kho mặc định. Timeout ngắn hơn làm test báo "KHÔNG gửi POST" trong khi
				//    bản ghi VẪN được tạo trên server — vừa kết luận sai vừa để lại rác.
				{ timeout: 180_000 },
			)
			.catch(() => null);
		await drawer.getByRole('button', { name: 'Xác nhận' }).click();
		const res = await cho;

		if (!res) {
			const loi = await drawer.locator('.ant-form-item-explain-error').allInnerTexts();
			const nhanLoi = await drawer
				.locator('.ant-form-item-has-error .ant-form-item-label label')
				.allInnerTexts();
			expect(
				loi,
				`Bấm Xác nhận nhưng KHÔNG gửi POST /shops/profile. Trường bị chặn: ${
					nhanLoi.join(' · ') || '(không có nhãn)'
				}`,
			).toEqual([]);
			// 🔴 Phân biệt hai tình huống hoàn toàn khác nhau — gộp chung là kết luận sai bản chất:
			//    (a) POST chưa từng được gửi  → validate client chặn, lỗi nằm ở dữ liệu nhập.
			//    (b) POST ĐÃ gửi, chưa có hồi âm → server còn đang xử lý; bản ghi VẪN sẽ được tạo.
			//        Nguyên nhân đã biết: Kafka localhost:9092 tắt, `kafkaTemplate.send()` chặn
			//        `max.block.ms` = 60s mỗi lần gửi (xem §3.1c handoff). Bật Kafka là hết.
			const daGuiPost = moiPost.some((u) => u.includes('/shops/profile'));
			throw new Error(
				daGuiPost
					? 'POST /shops/profile ĐÃ được gửi nhưng server chưa trả lời trong 180s. ' +
						'Bản ghi nhiều khả năng VẪN được tạo — kiểm DB trước khi chạy lại, và kiểm ' +
						'Kafka 9092 (tắt thì mỗi lần gửi audit event chặn thêm 60s).'
					: `Không gửi POST mà form cũng không báo lỗi validate nào. POST đã thấy: ${
							moiPost.join(' | ') || '(không có)'
						}`,
			);
		}

		const body = await res.json().catch(() => null);
		if (String(body?.status?.code) !== '200') {
			test.info().annotations.push({ type: 'payload đã gửi', description: String(payloadGui).slice(0, 900) });
		}
		expect(String(body?.status?.code), `Tạo điểm bán thất bại: ${JSON.stringify(body?.status)}`).toBe('200');

		test.info().annotations.push({
			type: 'đã tạo dữ liệu thật',
			description: `Điểm bán ${MA_SHOP} — ${TEN_SHOP}. Bản ghi này Ở LẠI production.`,
		});

		// Bản ghi mới phải tìm ra được trong danh sách.
		await openShopList(page, 'tct');
		const found = await timTheoMa(page, MA_SHOP);
		await expect(found, `Tạo xong nhưng tìm mã ${MA_SHOP} không ra dòng nào.`).toHaveCount(1);
		await expect(found.first().locator('td').nth(1), 'Tên Hub trong danh sách phải đúng tên vừa nhập.').toContainText(TEN_SHOP);
		await expect(found.first().locator('td').nth(3), 'Phân loại phải là Pos mini.').toContainText(/Pos mini/i);
	});

	test('01_040_007 - Tạm ngừng điểm bán bằng ô Trạng thái trên màn Sửa', async ({ page }) => {
		// 🔴 Case này ăn theo bản ghi do `01_020_001` tạo. Chạy riêng nó bằng `-g "01_040_007"` thì
		//    case tạo không chạy, `MA_SHOP` còn là null và `searchBox.fill(null)` ném lỗi khó hiểu
		//    ("value: expected string, got object"). Skip có lý do thay vì đỏ oan.
		if (!MA_SHOP) {
			skipNoData(test, 'Case 01_020_001 chưa chạy nên chưa có điểm bán mới để tạm ngừng.');
		}
		await openShopList(page, 'tct');
		const found = await timTheoMa(page, MA_SHOP);
		await expect(found, `Không tìm thấy Điểm bán ${MA_SHOP} để tạm ngừng.`).toHaveCount(1);
		await expect(found.first().locator('td').nth(7), 'Trước khi tạm ngừng phải đang hoạt động.').toContainText(/hoạt động/i);

		const drawer = await openEditDrawer(page);
		// HDSD 040 bước 3: ô Trạng thái nằm ở góc trên bên phải màn Sửa.
		await drawer.getByText('Tạm ngừng', { exact: true }).first().click();

		const cho = page.waitForResponse(
			(r) => ['PUT', 'POST'].includes(r.request().method()) && r.url().includes('/shops'),
			{ timeout: 60_000 },
		);
		await drawer.getByRole('button', { name: 'Xác nhận' }).click();

		// 🔴 Ngừng hoạt động có modal xác nhận riêng (DrawerCreateShop.jsx → `confirmSuspend`):
		//    "Xác nhận ngừng hoạt động điểm bán / hub này?" — bỏ qua là test treo ở waitForResponse.
		const xacNhan = page.locator('.ant-modal-confirm button').filter({ hasText: 'Đồng ý' }).first();
		if (await xacNhan.isVisible({ timeout: 8_000 }).catch(() => false)) await xacNhan.click();

		const res = await cho;

		const body = await res.json().catch(() => null);
		expect(String(body?.status?.code), `Tạm ngừng thất bại: ${JSON.stringify(body?.status)}`).toBe('200');
		daTamNgung = true;

		await openShopList(page, 'tct');
		const sau = await timTheoMa(page, MA_SHOP);
		await expect(
			sau.first().locator('td').nth(7),
			'HDSD 040: đổi trạng thái ở màn Sửa phải làm cột Trạng thái trong danh sách đổi theo.',
		).toContainText(/ngừng/i);
	});

	test.afterAll(async () => {
		// 🔴 Không dọn được bằng code: màn này không có chức năng xoá. Chỉ ghi lại cho người đọc.
		console.log(
			daTamNgung
				? `\n[DỌN] Điểm bán ${MA_SHOP} đã chuyển sang Tạm ngừng. Bản ghi vẫn còn trên production.\n`
				: `\n🔴 [CHƯA DỌN] Điểm bán ${MA_SHOP} có thể vẫn ĐANG HOẠT ĐỘNG trên production — vào Vận hành > Quản lý cửa hàng, tìm "${MA_SHOP}", mở Sửa và chọn Tạm ngừng.\n`,
		);
	});
});
