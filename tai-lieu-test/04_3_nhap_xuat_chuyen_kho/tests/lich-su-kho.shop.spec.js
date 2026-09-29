'use strict';

/**
 * Task 010 — Lịch sử xuất nhập kho, phần ĐỌC chạy bằng vai `shop`.
 *
 * 🔴 Cả file 🚫 KHÔNG ghi dữ liệu: bọc `chanGhi()` chặn mọi request khác GET tới nhóm `/stock*`.
 * Phân hệ này nếu ghi nhầm là **thổi tồn kho và giá vốn**, 🚫 không hoàn tác được bằng giao diện.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const {
	API_LICH_SU,
	PHAN_LOAI_NHAP,
	PHAN_LOAI_XUAT,
	boQua,
	chanGhi,
	chonOption,
	chuan,
	cot,
	dong,
	khung,
	moLichSu,
	moThe,
	nhanCacOption,
	oTim,
	taiLaiBoi,
	thamSo,
} = require('./warehouse-page');

const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('04_3 · 010 — Lịch sử xuất nhập kho', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moLichSu(page, VAI);
	});

	test('04_3_010_001 — Mở màn Lịch sử xuất nhập kho', async ({ page }) => {
		chanNeuTat('04_3_010_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Lịch sử xuất nhập kho',
		);
		const the = (await khung(page).locator('.ant-tabs-tab').allInnerTexts()).map((s) =>
			chuan(s.split('\n')[0]),
		);
		expect(the, `Thẻ đang có: ${the.join(' · ')}`).toEqual([
			'Phiếu nhập kho',
			'Phiếu xuất kho',
			'Thẻ kho',
			'Xuất huỷ hàng',
		]);
		await expect(oTim(page)).toBeVisible();
	});

	test('04_3_010_003 — Tìm kiếm theo mã phiếu', async ({ page }) => {
		chanNeuTat('04_3_010_003');

		if ((await dong(page).count()) === 0) {
			boQua(test, 'Điểm bán chưa có phiếu nhập nào để lấy mã tìm kiếm.');
		}
		const ma = chuan(await dong(page).first().locator('td').nth(3).innerText()).split(' ')[0];
		if (!ma) boQua(test, 'Không đọc được mã phiếu ở dòng đầu.');

		const res = await taiLaiBoi(page, API_LICH_SU, async () => {
			await oTim(page).fill(ma);
			await oTim(page).press('Enter');
		});
		expect(res.status()).toBe(200);

		const so = await dong(page).count();
		expect(so, `Tìm mã "${ma}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
		for (let i = 0; i < so; i += 1) {
			expect(chuan(await dong(page).nth(i).innerText())).toContain(ma);
		}
	});

	test('04_3_010_004 — Tìm kiếm mã phiếu không tồn tại', async ({ page }) => {
		chanNeuTat('04_3_010_004');

		await taiLaiBoi(page, API_LICH_SU, async () => {
			await oTim(page).fill('ZZZ-KHONG-TON-TAI-999');
			await oTim(page).press('Enter');
		});

		expect(await dong(page).count()).toBe(0);
		await expect(khung(page).locator('.ant-empty')).toBeVisible();
	});

	test('04_3_010_008 — Bộ lọc Phân loại sản phẩm', async ({ page }) => {
		chanNeuTat('04_3_010_008');

		const nhan = await nhanCacOption(page, 'Phân loại sản phẩm');
		if (nhan.length === 0) boQua(test, 'Ô "Phân loại sản phẩm" không có lựa chọn nào.');

		const res = await taiLaiBoi(page, API_LICH_SU, async () => {
			await chonOption(page, 'Phân loại sản phẩm', nhan[0]);
		});
		// 🔴 Điều kiện phải đi vào REQUEST, 🚫 không chỉ nhìn bảng: bảng rỗng cũng "trông như đã lọc".
		const p = thamSo(res);
		expect(
			Object.keys(p).some((k) => /categor|product|phanLoai/i.test(k)),
			`Chọn phân loại sản phẩm mà query không mang điều kiện nào: ${JSON.stringify(p)}`,
		).toBe(true);
	});

	test('04_3_010_009 — Lọc theo Nguồn nhập / xuất', async ({ page }) => {
		chanNeuTat('04_3_010_009');

		const nhan = await nhanCacOption(page, 'Nguồn nhập');
		expect(nhan.length, 'Ô "Nguồn nhập/ xuất" không có lựa chọn nào').toBeGreaterThan(0);

		const res = await taiLaiBoi(page, API_LICH_SU, async () => {
			await chonOption(page, 'Nguồn nhập', nhan[0]);
		});
		expect(res.status()).toBe(200);
		test.info().annotations.push({
			type: 'nguồn nhập/xuất đang có',
			description: nhan.join(' · '),
		});
	});

	test('04_3_010_010 — Lọc theo Phân loại phiếu NHẬP', async ({ page }) => {
		chanNeuTat('04_3_010_010');

		const nhan = await nhanCacOption(page, 'Phân loại phiếu nhập');
		for (const ten of PHAN_LOAI_NHAP) {
			expect(nhan, `Thiếu nhãn "${ten}"; đang có: ${nhan.join(' · ')}`).toContain(ten);
		}
	});

	test('04_3_010_011 — Lọc theo Phân loại phiếu XUẤT', async ({ page }) => {
		chanNeuTat('04_3_010_011');

		await moThe(page, 'Phiếu xuất kho');
		const nhan = await nhanCacOption(page, 'Phân loại phiếu xuất');
		for (const ten of PHAN_LOAI_XUAT) {
			expect(nhan, `Thiếu nhãn "${ten}"; đang có: ${nhan.join(' · ')}`).toContain(ten);
		}
	});

	test('04_3_010_012 — Xem chi tiết phiếu nhập kho', async ({ page }) => {
		chanNeuTat('04_3_010_012');

		if ((await dong(page).count()) === 0) boQua(test, 'Điểm bán chưa có phiếu nhập nào.');

		const nut = dong(page).first().getByRole('button', { name: 'Chi tiết' }).first();
		if ((await nut.count()) === 0) boQua(test, 'Dòng đầu không có nút Chi tiết.');
		await nut.click();
		await page.waitForTimeout(3_500);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const noi = chuan((await hop.count()) ? await hop.innerText() : await khung(page).innerText());

		for (const nhan of ['Số lượng', 'Đơn vị']) {
			expect(noi, `Chi tiết phiếu nhập thiếu cột "${nhan}"`).toContain(nhan);
		}

		const cotChiTiet = (await hop.locator('.ant-table-thead th').allInnerTexts()).map(chuan);
		const loaiChungTu = (noi.match(/Loại chứng từ kế toán\s*([^|]+)/) || [])[1] || '(không rõ)';
		// 🔴 Đo 20/09/2026 trên phiếu "Điều chuyển nội đơn vị": bảng chi tiết chỉ có 6 cột
		//    `# · Sản phẩm · PP tính giá vốn · Đơn vị · Số lượng · Serial / Lô` — KHÔNG có
		//    Giá vốn và Thành tiền như kịch bản đòi. Giữ nguyên kỳ vọng, 🚫 không hạ: người dùng
		//    không đối chiếu được tiền của phiếu nhập ngay trên màn chi tiết.
		expect(
			/Giá vốn|Đơn giá/.test(cotChiTiet.join(' | ')),
			`Bảng chi tiết phiếu nhập KHÔNG có cột giá vốn. Cột thật: ${cotChiTiet.join(' · ')}. ` +
				`Loại chứng từ của phiếu đang xem: ${chuan(loaiChungTu)}.`,
		).toBe(true);
		expect(
			/Thành tiền|Tổng tiền/.test(noi),
			`Chi tiết phiếu nhập không có dòng tiền nào. Cột thật: ${cotChiTiet.join(' · ')}.`,
		).toBe(true);
	});

	test('04_3_010_013 — Xem chi tiết phiếu xuất kho', async ({ page }) => {
		chanNeuTat('04_3_010_013');

		await moThe(page, 'Phiếu xuất kho');
		if ((await dong(page).count()) === 0) boQua(test, 'Điểm bán chưa có phiếu xuất nào.');

		const nut = dong(page).first().getByRole('button', { name: 'Chi tiết' }).first();
		if ((await nut.count()) === 0) boQua(test, 'Dòng đầu không có nút Chi tiết.');
		await nut.click();
		await page.waitForTimeout(3_500);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const noi = chuan((await hop.count()) ? await hop.innerText() : await khung(page).innerText());
		for (const nhan of ['Số lượng', 'Đơn vị']) {
			expect(noi, `Chi tiết phiếu xuất thiếu cột "${nhan}"`).toContain(nhan);
		}
		// 🔴 Với sản phẩm MAC, `price` và `basePrice` lệch nhau và phần lệch vào `adjust_val` —
		//    case này mới chỉ kiểm CÓ cột giá vốn; đối chiếu số tiền là việc của nhóm case ghi.
		expect(/Giá vốn|Đơn giá/.test(noi), 'Chi tiết phiếu xuất không có cột giá vốn').toBe(true);
	});

	test('04_3_010_006 — Xuất Excel danh sách phiếu nhập', async ({ page }) => {
		chanNeuTat('04_3_010_006');

		const nut = khung(page).getByRole('button', { name: 'Xuất excel' }).first();
		await expect(nut, 'Không thấy nút Xuất excel').toBeVisible();

		const cho = page.waitForEvent('download', { timeout: 90_000 }).catch(() => null);
		const goi = [];
		page.on('request', (r) => {
			if (/export|excel/i.test(r.url())) goi.push(`${r.method()} ${r.url()}`);
		});
		await nut.click({ force: true });
		const tai = await cho;
		await page.waitForTimeout(3_000);

		expect(
			tai !== null || goi.length > 0,
			'Bấm "Xuất excel" mà KHÔNG có tệp tải về và cũng KHÔNG có request xuất nào',
		).toBe(true);
		test.info().annotations.push({
			type: 'cách xuất Excel',
			description: tai
				? `tải thẳng tệp: ${tai.suggestedFilename()}`
				: `gửi việc xuất qua API: ${goi.join(' ; ')}`,
		});
	});

	test('04_3_010_007 — Xuất Excel danh sách phiếu xuất', async ({ page }) => {
		chanNeuTat('04_3_010_007');

		await moThe(page, 'Phiếu xuất kho');
		const nut = khung(page).getByRole('button', { name: 'Xuất excel' }).first();
		if ((await nut.count()) === 0) boQua(test, 'Thẻ Phiếu xuất kho không có nút Xuất excel.');

		const cho = page.waitForEvent('download', { timeout: 90_000 }).catch(() => null);
		const goi = [];
		page.on('request', (r) => {
			if (/export|excel/i.test(r.url())) goi.push(`${r.method()} ${r.url()}`);
		});
		await nut.click({ force: true });
		const tai = await cho;
		await page.waitForTimeout(3_000);

		expect(
			tai !== null || goi.length > 0,
			'Bấm "Xuất excel" ở thẻ phiếu xuất mà không có tệp lẫn request xuất nào',
		).toBe(true);
	});
});
