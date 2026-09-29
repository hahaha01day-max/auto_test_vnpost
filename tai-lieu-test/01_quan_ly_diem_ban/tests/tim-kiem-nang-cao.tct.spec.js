'use strict';

/**
 * Task 010 — nhóm case biên của ô tìm kiếm và bộ lọc. Vai: Tổng công ty.
 *
 * 🔴 Vì sao phải là `tct`: vai `province` (qltls01 — tỉnh Lý Sơn) chỉ thấy 3 điểm bán, toàn Hub,
 * toàn Đang hoạt động ⇒ mọi case cần phân trang / nhiều tỉnh đều skip vì phạm vi hẹp, không phải
 * vì môi trường thiếu dữ liệu. Vai `tct` thấy toàn chuỗi.
 *
 * 🚫 Chỉ đọc. Không case nào ở file này gửi request ghi.
 *
 * Trace: `ShopManagement.jsx` — `params = {page, size, keyword, shopType, shopGrade, status,
 * orgProvinceCode, orgWardCode}`; mọi onChange của bộ lọc đều `page: 0`; ô Bưu điện phường/xã
 * `disabled={!params.orgProvinceCode}`.
 */

const { test, expect } = require('@playwright/test');
const {
	API_LIST,
	filterProvince,
	filterStatus,
	filterType,
	filterWard,
	openDropdown,
	openShopList,
	pickOption,
	reloadBy,
	rows,
	searchBox,
	selectValue,
	settleTable,
	skipNoData,
	totalFromTitle,
} = require('./shop-page');

/** Mã điểm bán của mọi dòng đang hiển thị — dùng để so hai lần tìm có cùng tập bản ghi không. */
const maCacDong = (page) => rows(page).locator('td:nth-child(3)').allInnerTexts();

test.describe('01 — Tìm kiếm và lọc, các trường hợp biên (vai Tổng công ty)', () => {
	test.beforeEach(async ({ page }) => {
		await openShopList(page, 'tct');
	});

	test('01_010_019 - Tìm kiếm bằng từ khoá toàn khoảng trắng', async ({ page }) => {
		const tongBanDau = await totalFromTitle(page);

		const { res } = await reloadBy(page, () => searchBox(page).fill('     '));
		expect(String((await res.json().catch(() => null))?.status?.code ?? '200')).toBe('200');

		// 🔴 Case PHƠI HÀNH VI: FE không trim keyword (`handleKeywordChange` gửi thẳng value).
		//    Kỳ vọng chốt là "không gãy": không có lỗi đỏ, màn vẫn ở trạng thái đọc được —
		//    hoặc trả về như khi bỏ trống, hoặc trạng thái rỗng. 🚫 Không assert một trong hai.
		await expect(page.locator('.ant-message-error'), 'Từ khoá toàn khoảng trắng không được sinh lỗi đỏ.').toHaveCount(0);

		const tongSau = await totalFromTitle(page);
		const soDong = await rows(page).count();
		test.info().annotations.push({
			type: 'đo được',
			description: `keyword = 5 dấu cách ⇒ total_elements = ${tongSau} (bỏ trống là ${tongBanDau}), bảng vẽ ${soDong} dòng.`,
		});

		const nhuBoTrong = tongSau === tongBanDau;
		const rong = soDong === 0;
		expect(
			nhuBoTrong || rong,
			`Từ khoá toàn khoảng trắng phải hoặc bị coi là rỗng (total = ${tongBanDau}) hoặc trả rỗng; đo được total = ${tongSau} với ${soDong} dòng.`,
		).toBe(true);
		if (rong) {
			await expect(page.locator('.ant-empty, .ant-table-placeholder').first()).toBeVisible();
		}
	});

	test('01_010_020 - Tìm kiếm bằng ký tự đặc biệt', async ({ page }) => {
		const tongBanDau = await totalFromTitle(page);
		expect(tongBanDau, 'Không đọc được tổng số bản ghi ban đầu.').toBeGreaterThan(0);

		const { res } = await reloadBy(page, () => searchBox(page).fill('%_\'"<>'));
		expect(res.status(), 'Ký tự đặc biệt trong từ khoá không được làm backend nổ 500.').toBeLessThan(500);

		const tongSau = await totalFromTitle(page);
		test.info().annotations.push({
			type: 'đo được',
			description: `keyword = %_'"<> ⇒ total_elements = ${tongSau} (không lọc là ${tongBanDau}).`,
		});

		// 🔴 % và _ là ký tự đại diện của SQL LIKE. Trả về TOÀN BỘ danh sách nghĩa là backend
		//    không thoát ký tự — đó chính là lỗi cần bắt, 🚫 không được nới assertion cho xanh.
		expect(
			tongSau,
			'Từ khoá "%_" trả về đúng bằng toàn bộ danh sách ⇒ ký tự đại diện SQL LIKE không được thoát ở backend.',
		).toBeLessThan(tongBanDau);
		await expect(page.locator('.ant-table')).toBeVisible();
	});

	test('01_010_021 - Tìm kiếm không phân biệt hoa/thường', async ({ page }) => {
		expect(await rows(page).count(), 'Phạm vi không có điểm bán nào để lấy từ khoá.').toBeGreaterThan(0);
		const ten = (await rows(page).first().locator('td').nth(1).innerText()).trim();
		if (!ten) skipNoData(test, 'Dòng đầu tiên không có tên để dùng làm từ khoá.');

		await reloadBy(page, () => searchBox(page).fill(ten.toUpperCase()));
		const tongHoa = await totalFromTitle(page);
		const maHoa = await maCacDong(page);

		await reloadBy(page, () => searchBox(page).fill(ten.toLowerCase()));
		const tongThuong = await totalFromTitle(page);
		const maThuong = await maCacDong(page);

		expect(tongThuong, `Tìm "${ten.toUpperCase()}" ra ${tongHoa} bản ghi, tìm chữ thường ra ${tongThuong} — tìm kiếm đang phân biệt hoa/thường.`).toBe(tongHoa);
		expect(maThuong, 'Hai lần tìm phải trả về cùng tập mã điểm bán.').toEqual(maHoa);
	});

	test('01_010_022 - Tìm kiếm bằng từ khoá KHÔNG DẤU', async ({ page }) => {
		// Tìm một điểm bán có tên thật sự mang dấu tiếng Việt.
		const tenCacDong = await rows(page).locator('td:nth-child(2)').allInnerTexts();
		const coDau = tenCacDong
			.map((x) => x.trim())
			.find((x) => x.normalize('NFD') !== x.normalize('NFC').normalize('NFD').replace(/[̀-ͯ]/g, ''));
		if (!coDau) skipNoData(test, 'Trang đầu không có điểm bán nào mang tên tiếng Việt có dấu.');

		const khongDau = coDau.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

		await reloadBy(page, () => searchBox(page).fill(coDau));
		const tongCoDau = await totalFromTitle(page);

		await reloadBy(page, () => searchBox(page).fill(khongDau));
		const tongKhongDau = await totalFromTitle(page);

		// 🔴 Case ĐO, không đoán: kịch bản ghi rõ kỳ vọng chốt sau khi đo. Điều duy nhất khẳng
		//    định được là hệ thống không gãy; con số thật ghi vào annotation để user chốt.
		test.info().annotations.push({
			type: 'đo được',
			description: `"${coDau}" ⇒ ${tongCoDau} bản ghi · "${khongDau}" (bỏ dấu) ⇒ ${tongKhongDau} bản ghi ⇒ backend ${tongKhongDau > 0 ? 'CÓ' : 'KHÔNG'} chuẩn hoá dấu.`,
		});
		expect(tongCoDau, 'Tìm bằng chính tên có dấu phải ra ít nhất 1 bản ghi.').toBeGreaterThan(0);
		await expect(page.locator('.ant-message-error'), 'Từ khoá không dấu không được sinh lỗi đỏ.').toHaveCount(0);
	});

	test('01_010_023 - Khoảng trắng đầu/cuối của từ khoá', async ({ page }) => {
		expect(await rows(page).count(), 'Phạm vi không có điểm bán nào để lấy từ khoá.').toBeGreaterThan(0);
		const ten = (await rows(page).first().locator('td').nth(1).innerText()).trim();
		if (!ten) skipNoData(test, 'Dòng đầu tiên không có tên để dùng làm từ khoá.');

		await reloadBy(page, () => searchBox(page).fill(ten));
		const tongSach = await totalFromTitle(page);

		await reloadBy(page, () => searchBox(page).fill(`  ${ten}  `));
		const tongThua = await totalFromTitle(page);

		test.info().annotations.push({
			type: 'đo được',
			description: `"${ten}" ⇒ ${tongSach} · "  ${ten}  " ⇒ ${tongThua}.`,
		});
		expect(
			tongThua,
			`Thêm khoảng trắng đầu/cuối làm kết quả đổi từ ${tongSach} xuống ${tongThua} ⇒ từ khoá không được trim.`,
		).toBe(tongSach);
	});

	test('01_010_024 - Xoá toàn bộ bộ lọc trả về danh sách đầy đủ', async ({ page }) => {
		const tongBanDau = await totalFromTitle(page);
		expect(tongBanDau, 'Không đọc được tổng số bản ghi ban đầu.').toBeGreaterThan(0);

		// 🔴 Gom MỌI request danh sách thay vì `waitForResponse` từng bước: RTK Query phục vụ lại
		//    từ cache khi bộ lọc quay về một tổ hợp đã gọi trước đó, nên bước "xoá lọc" có thể
		//    KHÔNG sinh request nào — `reloadBy` sẽ treo hết timeout và đỏ với lý do sai.
		const lichSu = [];
		page.on('request', (req) => {
			if (req.method() === 'GET' && req.url().includes(API_LIST)) lichSu.push(req.url());
		});

		await reloadBy(page, () => pickOption(page, filterType(page), 'Hub'));
		const { res: resLoc } = await reloadBy(page, () => pickOption(page, filterStatus(page), 'Tạm ngừng'));
		await reloadBy(page, () => searchBox(page).fill('HUB'));

		const queryLoc = new URL(lichSu[lichSu.length - 1]).searchParams;
		expect(queryLoc.get('keyword'), 'Chưa áp được điều kiện từ khoá.').toBeTruthy();
		expect(queryLoc.get('status'), 'Chưa áp được điều kiện Trạng thái.').toBeTruthy();
		expect(resLoc.status(), 'Request lọc phải thành công.').toBeLessThan(400);

		// Xoá từng ô lọc. 🔴 `.ant-select-clear` của antd chỉ hiện khi hover — bấm thẳng thì
		//    không nổ sự kiện onChange nào cả.
		await searchBox(page).fill('');
		for (const o of [filterStatus(page), filterType(page)]) {
			await o.hover();
			await o.locator('.ant-select-clear').first().click();
		}
		await settleTable(page);

		// Trạng thái cuối cùng đo bằng MÀN HÌNH, không bằng request (xem chú thích cache ở trên).
		await expect
			.poll(() => totalFromTitle(page), {
				message: 'Xoá hết bộ lọc thì tổng phải trở về đúng lúc mới vào màn.',
				timeout: 20_000,
			})
			.toBe(tongBanDau);

		// 🔴 Vì sao KHÔNG assert query string của "request cuối": đo thực tế cho thấy sau khi xoá
		//    hết lọc, RTK Query phục vụ lại tổ hợp params ban đầu TỪ CACHE và không phát request
		//    nào — request cuối trong lịch sử vẫn là `keyword=HUB`. Bằng chứng tương đương cho
		//    "không còn điều kiện lọc nào" là: tổng trở về đúng số ban đầu (poll ở trên) + mọi ô
		//    lọc trên màn đã sạch.
		test.info().annotations.push({
			type: 'đo được',
			description: 'Xoá hết bộ lọc KHÔNG sinh request mới — RTK Query trả lại tổ hợp params ban đầu từ cache.',
		});

		expect(await searchBox(page).inputValue(), 'Ô tìm kiếm phải trống sau khi xoá.').toBe('');
		for (const [ten, o] of [['Phân loại', filterType(page)], ['Trạng thái', filterStatus(page)]]) {
			await expect(
				selectValue(o),
				`Ô lọc ${ten} vẫn còn giá trị sau khi bấm xoá.`,
			).toHaveCount(0);
		}
	});

	test('01_010_025 - Ô lọc Bưu điện phường/xã bị vô hiệu khi chưa chọn Bưu điện tỉnh', async ({ page }) => {
		// Trace: `ShopManagement.jsx` — Select Bưu điện phường/xã có `disabled={!params.orgProvinceCode}`.
		const xa = filterWard(page);
		await expect(xa, 'Màn hình phải có bộ lọc Bưu điện phường / xã.').toHaveCount(1);
		await expect(xa, 'Chưa chọn Bưu điện tỉnh thì ô Bưu điện phường/xã phải bị vô hiệu.').toHaveClass(/ant-select-disabled/);

		await xa.click();
		await expect(
			page.locator('.ant-select-dropdown:visible'),
			'Ô bị vô hiệu mà vẫn mở được danh sách lựa chọn.',
		).toHaveCount(0);

		// Chọn tỉnh xong thì ô phải mở khoá — nếu không, "disabled" là bug chứ không phải thiết kế.
		const ds = await openDropdown(page, filterProvince(page));
		if ((await ds.locator('.ant-select-item-option').count()) === 0) {
			skipNoData(test, 'Bộ lọc Bưu điện Tỉnh không có lựa chọn nào để mở khoá ô xã.');
		}
		await reloadBy(page, () => ds.locator('.ant-select-item-option').first().click());
		await expect(xa, 'Chọn xong Bưu điện tỉnh thì ô Bưu điện phường/xã phải mở khoá.').not.toHaveClass(/ant-select-disabled/);
	});

	test('01_010_026 - Đổi bộ lọc khi đang ở trang 3 thì nhảy về trang 1', async ({ page }) => {
		const tong = await totalFromTitle(page);
		if (!tong || tong <= 20) skipNoData(test, `Chỉ có ${tong ?? 0} điểm bán, không đủ 3 trang để kiểm.`);

		await reloadBy(page, () => page.locator('.ant-pagination-item-3').first().click());
		await expect(page.locator('.ant-pagination-item-active'), 'Chưa sang được trang 3.').toHaveText('3');

		const { res } = await reloadBy(page, () => pickOption(page, filterType(page), 'Pos mini'));
		const query = new URL(res.url()).searchParams;

		// 🔴 Kiểm ở tầng REQUEST trước: giữ page=2 rồi trả bảng rỗng nhìn giống hệt "không có dữ liệu".
		expect(query.get('page'), 'Đổi bộ lọc phải gửi page=0, không được giữ trang cũ.').toBe('0');
		await expect(page.locator('.ant-pagination-item-active'), 'Thanh phân trang phải về trang 1.').toHaveText('1');
	});

	test('01_010_027 - Trang cuối hiển thị đúng số bản ghi còn lại', async ({ page }) => {
		const tong = await totalFromTitle(page);
		if (!tong || tong <= 10) skipNoData(test, `Chỉ có ${tong ?? 0} điểm bán, không đủ để kiểm trang cuối.`);

		const pageSize = await rows(page).count();
		expect(pageSize, 'Trang 1 phải có dòng để suy ra pageSize.').toBeGreaterThan(0);

		const trangCuoi = Math.ceil(tong / pageSize);
		await reloadBy(page, async () => {
			const nut = page.locator(`.ant-pagination-item-${trangCuoi}`).first();
			if (await nut.count()) return nut.click();
			// Danh sách dài thì antd thu gọn số trang — đi bằng nút "nhảy 5 trang" rồi bấm số.
			await page.locator('.ant-pagination-jump-next').first().click();
			await page.locator('.ant-pagination-item').last().click();
		});
		await settleTable(page);

		const trangHienTai = Number((await page.locator('.ant-pagination-item-active').innerText()).trim());
		const conLai = tong - (trangHienTai - 1) * pageSize;
		const kyVong = Math.min(conLai, pageSize);

		await expect(
			rows(page),
			`Trang ${trangHienTai}/${trangCuoi}: tổng ${tong}, pageSize ${pageSize} ⇒ phải còn đúng ${kyVong} dòng.`,
		).toHaveCount(kyVong);
	});
});
