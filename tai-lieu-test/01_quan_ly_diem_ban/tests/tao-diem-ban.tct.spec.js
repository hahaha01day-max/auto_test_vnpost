'use strict';

/**
 * Task 020 — các case tạo điểm bán còn lại. **GHI DỮ LIỆU THẬT.**
 *
 * 🔴 Mỗi case chạy một lần là sinh MỘT điểm bán thật trên môi trường đang trỏ tới, và màn này
 * KHÔNG có chức năng xoá (chỉ chuyển Tạm ngừng). Tất cả bản ghi đều mang tên
 * `AUTO TEST KHONG DUNG <số>` để lọc ra sau này. 🚫 Không chạy lặp cho vui.
 *
 * 🔴 Ba điều đã trả giá mới rút ra được (§3.1c handoff), đừng phát minh lại:
 *  1. Mã điểm bán PHẢI bắt đầu bằng mã đơn vị cha (`orgWardCode` ở cấp Xã, `orgProvinceCode` ở cấp
 *     Tỉnh), nếu không backend trả `SSHOP-402`. Mã đơn vị không có trên DOM — lấy `unitCode` từ
 *     response `/v1.0/organization-unit/*` mà app đã gọi.
 *  2. `POST /shops/profile` mất tới **120 giây** khi Kafka 9092 tắt ⇒ timeout 180s.
 *  3. Dropdown Bưu điện xã chỉ nạp SAU khi chọn xong Bưu điện tỉnh.
 */

const { test, expect } = require('@playwright/test');
const {
	openDropdown,
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

const nhap = (drawer, placeholder) => drawer.locator(`input[placeholder*="${placeholder}"]`).first();

/**
 * Điền trọn form Thêm điểm bán và bấm Xác nhận.
 * @returns {{ma: string, body: object|null}}
 */
async function taoDiemBan(
	page,
	donViTheoTen,
	{ cap, phanLoai, diaChi = 'AUTO TEST - khong su dung', maTuChon, tenTuChon },
) {
	const dau = Date.now().toString().slice(-6);
	const ten = tenTuChon ?? `AUTO TEST KHONG DUNG ${dau}`;

	await page.getByRole('button', { name: 'Thêm điểm bán' }).first().click();
	const drawer = page.locator('.ant-drawer-open').first();
	await expect(drawer, 'Không mở được drawer Thêm điểm bán.').toBeVisible();

	await drawer.getByText(cap, { exact: true }).first().click();
	// Danh sách Phân loại phụ thuộc Cấp nên chỉ render sau một nhịp — chờ nút hiện rồi mới bấm.
	const nutPhanLoai = drawer.getByText(phanLoai, { exact: true }).first();
	await expect(nutPhanLoai, `Cấp "${cap}" không có phân loại "${phanLoai}".`).toBeVisible();
	await nutPhanLoai.click();

	await nhap(drawer, 'Nhập tên').fill(ten);
	await nhap(drawer, 'Nhập email').fill(`autotest${dau}@example.com`);
	await nhap(drawer, 'Nhập số điện thoại').fill('0900000000');
	if (await nhap(drawer, 'Nhập SĐT quản lý').count()) {
		await nhap(drawer, 'Nhập SĐT quản lý').fill('0900000001');
	}
	if (diaChi && (await nhap(drawer, 'Số nhà').count())) {
		await nhap(drawer, 'Số nhà').fill(diaChi);
	}

	// Loại hình điểm bán — chỉ Pos mini / Pos plus mới có.
	const loaiHinh = drawer.locator('.ant-select').filter({ hasText: 'Chọn loại hình' }).first();
	if (await loaiHinh.count()) {
		await (await openDropdown(page, loaiHinh)).locator('.ant-select-item-option').first().click();
	}

	// Bưu điện tỉnh — bắt buộc, và quyết định mã đơn vị cha ở cấp Tỉnh.
	let maCha = null;
	const chonTinh = selectByField(drawer, 'orgProvinceCode');
	if (await chonTinh.count()) {
		const ds = await openDropdown(page, chonTinh);
		const tenTinh = (await ds.locator('.ant-select-item-option').first().innerText()).trim();
		// 🔴 Map danh mục gom từ response của app. Nó có thể tới CHẬM hơn thao tác mở dropdown,
		//    nên phải poll chứ đừng đọc một phát rồi kết luận "không tra được mã".
		await expect
			.poll(() => donViTheoTen.get(tenTinh), {
				message: `Không tra được mã đơn vị của bưu điện tỉnh "${tenTinh}".`,
				timeout: 15_000,
			})
			.toBeTruthy();
		maCha = donViTheoTen.get(tenTinh);
		await ds.locator('.ant-select-item-option').first().click();
	}

	// Bưu điện xã — ở cấp Xã thì đây mới là đơn vị cha của mã điểm bán.
	const chonXa = selectByField(drawer, 'orgWardCode');
	if (await chonXa.count()) {
		const ds = await openDropdown(page, chonXa);
		await expect
			.poll(async () => ds.locator('.ant-select-item-option').count(), {
				message: 'Dropdown Bưu điện xã/phường không nạp được lựa chọn nào.',
				timeout: 20_000,
			})
			.toBeGreaterThan(0);
		const tenXa = (await ds.locator('.ant-select-item-option').first().innerText()).trim();
		await expect
			.poll(() => donViTheoTen.get(tenXa), {
				message: `Không tra được mã bưu điện xã "${tenXa}".`,
				timeout: 15_000,
			})
			.toBeTruthy();
		maCha = donViTheoTen.get(tenXa);
		await ds.locator('.ant-select-item-option').first().click();
	}

	const ma = maTuChon ?? `${maCha}AUTO${dau}`;
	await nhap(drawer, 'Nhập mã').fill(ma);

	// Tỉnh/TP + Xã/Phường hành chính (khác với Bưu điện tỉnh/xã ở trên).
	const tinhTP = drawer.locator('.ant-select').filter({ hasText: 'Chọn tỉnh/thành phố' }).first();
	if (await tinhTP.count()) {
		await (await openDropdown(page, tinhTP)).locator('.ant-select-item-option').first().click();
		const xaPhuong = drawer.locator('.ant-select').filter({ hasText: 'Chọn xã/phường' }).first();
		if (await xaPhuong.count()) {
			const dsXa = await openDropdown(page, xaPhuong);
			if (await dsXa.locator('.ant-select-item-option').count()) {
				await dsXa.locator('.ant-select-item-option').first().click();
			} else {
				await page.keyboard.press('Escape');
			}
		}
	}

	const cho = page
		.waitForResponse(
			(r) => r.request().method() === 'POST' && r.url().includes('/shops/profile'),
			{ timeout: 180_000 },
		)
		.catch(() => null);
	await drawer.getByRole('button', { name: 'Xác nhận' }).click();
	const res = await cho;

	if (!res) {
		const loi = await drawer.locator('.ant-form-item-explain-error').allInnerTexts();
		throw new Error(
			`Không nhận được hồi âm của POST /shops/profile trong 180s. Lỗi validate đang hiện: ${
				loi.join(' · ') || '(không có)'
			}. Kiểm DB trước khi chạy lại — bản ghi có thể VẪN được tạo.`,
		);
	}
	return { ma, ten, diaChi, body: await res.json().catch(() => null) };
}

/** Tìm đúng một dòng theo mã và trả về locator dòng đó. */
async function timTheoMa(page, ma) {
	await openShopList(page, 'tct');
	await reloadBy(page, () => searchBox(page).fill(ma));
	await settleTable(page);
	return rows(page);
}

test.describe('01 — Thêm điểm bán (GHI DỮ LIỆU THẬT)', () => {
	/** Danh mục đơn vị tổ chức, gom từ chính response của app (xem chú thích trong `taoDiemBan`). */
	let donViTheoTen;

	test.beforeEach(async ({ page }) => {
		// 🔴 Phải đăng ký TRƯỚC `openShopList`: app gọi `/v1.0/organization-unit/*` ngay khi vào màn,
		//    đăng ký muộn là bỏ lỡ response và case đỏ với lý do "không tra được mã đơn vị".
		donViTheoTen = new Map();
		page.on('response', async (res) => {
			if (!res.url().includes('organization-unit')) return;
			const body = await res.json().catch(() => null);
			for (const x of body?.data || []) {
				if (x?.unitName && x?.unitCode) donViTheoTen.set(String(x.unitName).trim(), x.unitCode);
			}
		});
		await openShopList(page, 'tct');
	});

	test('01_020_002 - Tạo Pos mini kèm Địa chỉ chi tiết, chi tiết hiện đúng địa chỉ', async ({
		page,
	}) => {
		const diaChi = 'AUTO TEST - 123 Duong ABC';
		const { ma, body } = await taoDiemBan(page, donViTheoTen, {
			cap: 'Xã',
			phanLoai: 'Pos mini',
			diaChi,
		});
		expect(String(body?.status?.code), `Tạo thất bại: ${JSON.stringify(body?.status)}`).toBe('200');

		const found = await timTheoMa(page, ma);
		await expect(found, `Tạo xong nhưng tìm mã ${ma} không ra dòng nào.`).toHaveCount(1);

		// Địa chỉ chi tiết không có trên bảng — phải mở drawer Chi tiết mới đối chiếu được.
		await found.first().locator('td').last().locator('button').first().click();
		const chiTiet = page.locator('.ant-drawer-open').first();
		await expect(chiTiet, 'Không mở được drawer Chi tiết.').toBeVisible();
		await expect(chiTiet, 'Chi tiết phải hiện đúng Địa chỉ đã nhập.').toContainText(diaChi);
	});

	test('01_020_004 - Tạo Pos plus thành công, danh sách hiện đúng phân loại', async ({ page }) => {
		const { ma, body } = await taoDiemBan(page, donViTheoTen, { cap: 'Xã', phanLoai: 'Pos plus' });
		expect(String(body?.status?.code), `Tạo thất bại: ${JSON.stringify(body?.status)}`).toBe('200');

		const found = await timTheoMa(page, ma);
		await expect(found, `Tạo xong nhưng tìm mã ${ma} không ra dòng nào.`).toHaveCount(1);
		await expect(found.first().locator('td').nth(3), 'Phân loại phải là Pos plus.').toHaveText(
			/Pos plus/i,
		);
		await expect(found.first().locator('td').nth(7), 'Điểm bán mới phải đang hoạt động.').toHaveText(
			'Đang hoạt động',
		);
	});

	test('01_020_006 - Tạo Hub ở cấp Tỉnh thành công', async ({ page }) => {
		const { ma, body } = await taoDiemBan(page, donViTheoTen, { cap: 'Tỉnh', phanLoai: 'Hub' });
		expect(String(body?.status?.code), `Tạo Hub thất bại: ${JSON.stringify(body?.status)}`).toBe(
			'200',
		);

		const found = await timTheoMa(page, ma);
		await expect(found, `Tạo xong nhưng tìm mã ${ma} không ra dòng nào.`).toHaveCount(1);
		await expect(found.first().locator('td').nth(3), 'Phân loại phải là Hub.').toHaveText(/Hub/i);
	});

	test('01_020_037 - Sau khi tạo thành công thì tổng bản ghi tăng 1 và tìm được ngay', async ({
		page,
	}) => {
		const tongTruoc = await totalFromTitle(page);
		expect(tongTruoc, 'Không đọc được tổng số bản ghi trước khi tạo.').toBeGreaterThan(0);

		const { ma, body } = await taoDiemBan(page, donViTheoTen, { cap: 'Xã', phanLoai: 'Pos mini' });
		expect(String(body?.status?.code), `Tạo thất bại: ${JSON.stringify(body?.status)}`).toBe('200');

		// 🔴 KHÔNG tải lại trang: điểm cần kiểm chính là mutation `addShop` có invalidate tag
		//    `chainListVNPost` để danh sách tự refetch hay không. F5 làm case này mất ý nghĩa.
		await expect
			.poll(() => totalFromTitle(page), {
				message: `Tạo xong mà tổng không tăng từ ${tongTruoc} lên ${tongTruoc + 1} khi chưa tải lại trang ⇒ danh sách không tự refetch.`,
				timeout: 60_000,
			})
			.toBe(tongTruoc + 1);

		const found = await timTheoMa(page, ma);
		await expect(found, `Tìm mã ${ma} phải ra đúng 1 dòng.`).toHaveCount(1);
		const o = found.first().locator('td');
		await expect(o.nth(7), 'Điểm bán mới phải ở trạng thái Đang hoạt động.').toHaveText('Đang hoạt động');
		await expect(o.nth(8), 'Điểm bán mới chưa gán ai thì Số lượng nhân viên phải là 0.').toContainText(/(^|\D)0(\D|$)/);
	});

	test('01_020_032 - Mã điểm bán trùng nhưng khác hoa/thường', async ({ page }) => {
		// Lấy mã của một điểm bán rác đã có rồi đổi sang CHỮ HOA.
		await reloadBy(page, () => searchBox(page).fill('AUTO'));
		await settleTable(page);
		expect(await rows(page).count(), 'Chưa có điểm bán rác nào để lấy mã trùng.').toBeGreaterThan(0);
		const maGoc = (await rows(page).first().locator('td').nth(2).innerText()).trim();
		const maHoa = maGoc.toUpperCase();
		if (maHoa === maGoc) {
			skipNoData(test, `Mã "${maGoc}" vốn đã toàn chữ hoa, không dựng được biến thể khác hoa/thường.`);
		}
		const soDongTruoc = await rows(page).count();

		await openShopList(page, 'tct');
		const { body } = await taoDiemBan(page, donViTheoTen, {
			cap: 'Xã',
			phanLoai: 'Pos mini',
			maTuChon: maHoa,
		});

		// 🔴 Case PHƠI HÀNH VI: FE không kiểm trùng, quyết định nằm ở backend. Ghi lại nguyên văn
		//    thông báo thật để user chốt, rồi mới assert theo kỳ vọng nghiệp vụ.
		test.info().annotations.push({
			type: 'đo được',
			description: `Mã gốc "${maGoc}" ⇒ tạo lại bằng "${maHoa}": status.code = ${body?.status?.code}, message = ${body?.status?.message ?? '(không có)'}.`,
		});

		expect(
			String(body?.status?.code),
			`Mã điểm bán là khoá nghiệp vụ, "${maHoa}" chỉ khác hoa/thường với "${maGoc}" đã có mà server vẫn nhận ⇒ sinh hai điểm bán cùng mã.`,
		).not.toBe('200');

		await openShopList(page, 'tct');
		await reloadBy(page, () => searchBox(page).fill('AUTO'));
		await settleTable(page);
		expect(
			await rows(page).count(),
			'Tạo trùng mã bị từ chối mà danh sách vẫn nhiều thêm một dòng.',
		).toBe(soDongTruoc);
	});

	test('01_020_033 - Tên điểm bán trùng với điểm bán đã có', async ({ page }) => {
		await reloadBy(page, () => searchBox(page).fill('AUTO'));
		await settleTable(page);
		expect(await rows(page).count(), 'Chưa có điểm bán rác nào để lấy tên trùng.').toBeGreaterThan(0);
		const tenTrung = (await rows(page).first().locator('td').nth(1).innerText()).trim();

		await openShopList(page, 'tct');
		const { ma, body } = await taoDiemBan(page, donViTheoTen, {
			cap: 'Xã',
			phanLoai: 'Pos mini',
			tenTuChon: tenTrung,
		});

		// 🔴 MÂU THUẪN ĐẶC TẢ đã ghi trong kịch bản: HDSD 020 bước 5 nói "Mã và tên không được
		//    trùng", nhưng `DrawerCreateShop.jsx` chỉ có rule `required` cho `shopName` — không có
		//    ràng buộc duy nhất. Case này ĐO hành vi thật; 🚫 không tự sửa tài liệu, báo để user chốt.
		const chan = String(body?.status?.code) !== '200';
		test.info().annotations.push({
			type: chan ? 'đo được' : 'lệch đặc tả',
			description: chan
				? `Trùng tên "${tenTrung}" bị chặn: ${body?.status?.code} — ${body?.status?.message ?? ''}.`
				: `Hệ thống CHO PHÉP hai điểm bán trùng tên "${tenTrung}" (mã khác nhau, mã mới = ${ma}). HDSD 020 bước 5 nói không được trùng tên ⇒ tài liệu và sản phẩm lệch nhau, cần user quyết sửa bên nào.`,
		});

		// Dù chặn hay không, điều PHẢI đúng: tên không phải khoá nên không được làm hỏng dữ liệu —
		// tìm theo mã mới vẫn ra đúng một bản ghi (nếu đã tạo), và không có lỗi 500.
		if (!chan) {
			const found = await timTheoMa(page, ma);
			await expect(found, `Tạo thành công nhưng tìm mã ${ma} không ra đúng 1 dòng.`).toHaveCount(1);
		} else {
			const found = await timTheoMa(page, ma);
			await expect(found, `Bị chặn mà vẫn tạo ra bản ghi mang mã ${ma}.`).toHaveCount(0);
		}
	});

	test('01_020_014 - Mã điểm bán trùng thì bị chặn, không tạo bản ghi thứ hai', async ({ page }) => {
		// Lấy mã của một điểm bán rác đã có làm mã trùng.
		await reloadBy(page, () => searchBox(page).fill('AUTO'));
		await settleTable(page);
		expect(await rows(page).count(), 'Chưa có điểm bán rác nào để lấy mã trùng.').toBeGreaterThan(0);
		const maTrung = (await rows(page).first().locator('td').nth(2).innerText()).trim();
		const soDongTruoc = await rows(page).count();

		await openShopList(page, 'tct');
		const { body } = await taoDiemBan(page, donViTheoTen, {
			cap: 'Xã',
			phanLoai: 'Pos mini',
			maTuChon: maTrung,
		});

		expect(
			String(body?.status?.code),
			`Mã "${maTrung}" đã tồn tại mà server vẫn nhận — sinh ra hai điểm bán cùng mã.`,
		).not.toBe('200');

		// Và danh sách không được mọc thêm dòng nào.
		await openShopList(page, 'tct');
		await reloadBy(page, () => searchBox(page).fill('AUTO'));
		await settleTable(page);
		expect(
			await rows(page).count(),
			'Tạo trùng mã bị từ chối mà danh sách vẫn nhiều thêm một dòng.',
		).toBe(soDongTruoc);
	});
});
