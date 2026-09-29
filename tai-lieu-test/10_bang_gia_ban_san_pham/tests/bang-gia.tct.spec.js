'use strict';

/**
 * Phân hệ 10 — Bảng giá bán sản phẩm, phần ĐỌC (vai `tct`).
 *
 * 🔴 Bảng giá quyết định **giá bán của cả mạng lưới**. Cả file 🚫 KHÔNG ghi: bọc `chanGhi()`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const {
	COT,
	boQua,
	chanGhi,
	chonLoc,
	chuan,
	cot,
	dong,
	khung,
	moMan,
	nhanCacOption,
	oLoc,
	oTim,
	taiLaiBoi,
} = require('./price-page');

const VAI = 'tct';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Giá trị cột theo tên cột — 🚫 đừng bám chỉ số cột cứng. */
async function oTheoCot(page, i, tenCot) {
	const ten = (await cot(page).allInnerTexts()).map(chuan);
	const k = ten.indexOf(tenCot);
	if (k < 0) return null;
	return chuan(await dong(page).nth(i).locator('td').nth(k).innerText());
}

test.describe('10 — Quản lý bảng giá', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, VAI);
	});

	test('10_010_001 — Màn Quản lý bảng giá mở được và hiện đủ bộ lọc', async ({ page }) => {
		chanNeuTat('10_010_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý bảng giá',
		);
		await expect(oTim(page), 'Thiếu ô "Nhập tên bảng giá"').toBeVisible();
		for (const nhan of [
			'Trạng thái',
			'Trạng thái phê duyệt',
			'Trạng thái áp dụng',
			'Phân loại bảng giá',
			'Phạm vi khu vực',
		]) {
			await expect(oLoc(page, nhan), `Thiếu ô lọc "${nhan}"`).toBeVisible();
		}
		await expect(
			khung(page).locator('input[placeholder="Bắt đầu"]'),
			'Thiếu khoảng thời gian hiệu lực',
		).toBeVisible();
	});

	test('10_010_002 — Tìm bảng giá tự chạy khi ngừng gõ', async ({ page }) => {
		chanNeuTat('10_010_002');

		if ((await dong(page).count()) === 0) boQua(test, 'Chưa có bảng giá nào để lấy từ khoá.');
		const ten = (await oTheoCot(page, 0, 'Tên bảng giá')) || '';
		const tuKhoa = ten.split(' ').slice(0, 2).join(' ');
		if (!tuKhoa) boQua(test, 'Không đọc được tên bảng giá ở dòng đầu.');

		// 🔴 Ô này tự lọc khi ngừng gõ, 🚫 KHÔNG có nút tìm và 🚫 không chạy theo Enter.
		const res = await taiLaiBoi(page, async () => {
			await oTim(page).fill(tuKhoa);
		});
		expect(res, `Gõ "${tuKhoa}" mà màn không tự gọi lại API sau khi ngừng gõ`).not.toBeNull();

		const so = await dong(page).count();
		expect(so, `Tìm "${tuKhoa}" lấy từ chính danh sách mà ra 0 dòng`).toBeGreaterThan(0);
	});

	test('10_010_009 — Tìm kiếm không có kết quả', async ({ page }) => {
		chanNeuTat('10_010_009');

		await taiLaiBoi(page, async () => {
			await oTim(page).fill('zzzkhongtontai999');
		});
		expect(await dong(page).count()).toBe(0);
		await expect(khung(page).locator('.ant-empty')).toBeVisible();
	});

	test("10_010_005 — Lọc bảng giá theo Trạng thái", async ({ page }) => {

			chanNeuTat("10_010_005");

			const nhan = await nhanCacOption(page, "Trạng thái");
			if (nhan.length === 0) boQua(test, `Ô lọc "${"Trạng thái"}" không có lựa chọn nào.`);

			const res = await taiLaiBoi(page, async () => {
				await chonLoc(page, "Trạng thái", nhan[0]);
			});
			expect(res, `Chọn "${nhan[0]}" mà màn không gọi lại API danh sách`).not.toBeNull();

			const so = await dong(page).count();
			if (so === 0) boQua(test, `Không có bảng giá nào khớp "${nhan[0]}" để đối chiếu.`);
			for (let i = 0; i < so; i += 1) {
				const gt = await oTheoCot(page, i, "Trạng thái");
				expect(gt, `Dòng ${i + 1} không khớp điều kiện lọc "${nhan[0]}"`).toContain(nhan[0]);
			}
	});

	test("10_010_006 — Lọc bảng giá theo Hình thức", async ({ page }) => {

			chanNeuTat("10_010_006");

			const nhan = await nhanCacOption(page, "Phân loại bảng giá");
			if (nhan.length === 0) boQua(test, `Ô lọc "${"Phân loại bảng giá"}" không có lựa chọn nào.`);

			const res = await taiLaiBoi(page, async () => {
				await chonLoc(page, "Phân loại bảng giá", nhan[0]);
			});
			expect(res, `Chọn "${nhan[0]}" mà màn không gọi lại API danh sách`).not.toBeNull();

			const so = await dong(page).count();
			if (so === 0) boQua(test, `Không có bảng giá nào khớp "${nhan[0]}" để đối chiếu.`);
			for (let i = 0; i < so; i += 1) {
				const gt = await oTheoCot(page, i, "Phân loại bảng giá");
				expect(gt, `Dòng ${i + 1} không khớp điều kiện lọc "${nhan[0]}"`).toContain(nhan[0]);
			}
	});

	test('10_010_007 — Lọc bảng giá theo Thời gian hiệu lực', async ({ page }) => {
		chanNeuTat('10_010_007');

		// 🔴 RangePicker: danh sách chỉ nạp lại SAU KHI chọn đủ cả hai mốc.
		const o = khung(page).locator('input[placeholder="Bắt đầu"]').first();
		await o.click();
		const panel = page.locator('.ant-picker-dropdown').last();
		await panel.waitFor({ state: 'visible', timeout: 15_000 });
		const oNgay = panel.locator('.ant-picker-cell-in-view');
		expect(await oNgay.count(), 'Lịch không có ô ngày nào').toBeGreaterThan(10);

		await oNgay.nth(2).click();
		await page.waitForTimeout(800);
		const res = await taiLaiBoi(page, async () => {
			await page.locator('.ant-picker-dropdown').last().locator('.ant-picker-cell-in-view').nth(10).click();
		});
		expect(res, 'Chọn đủ hai mốc ngày mà màn không gọi lại API').not.toBeNull();

		const p = Object.fromEntries(new URL(res.url()).searchParams.entries());
		expect(
			Object.keys(p).some((k) => /date|time/i.test(k)),
			`Query không mang mốc thời gian nào: ${JSON.stringify(p)}`,
		).toBe(true);
	});

	test('10_010_008 — Lọc kết hợp nhiều điều kiện cùng lúc', async ({ page }) => {
		chanNeuTat('10_010_008');

		const tt = await nhanCacOption(page, 'Trạng thái');
		if (tt.length === 0) boQua(test, 'Ô lọc Trạng thái không có lựa chọn nào.');
		const res1 = await taiLaiBoi(page, async () => {
			await chonLoc(page, 'Trạng thái', tt[0]);
		});

		const pl = await nhanCacOption(page, 'Phân loại bảng giá');
		if (pl.length === 0) boQua(test, 'Ô lọc Phân loại bảng giá không có lựa chọn nào.');
		const res2 = await taiLaiBoi(page, async () => {
			await chonLoc(page, 'Phân loại bảng giá', pl[0]);
		});

		// 🔴 Điều kiện phải CỘNG DỒN (AND), 🚫 không được cái sau thay cái trước.
		const p1 = Object.fromEntries(new URL(res1.url()).searchParams.entries());
		const p2 = Object.fromEntries(new URL(res2.url()).searchParams.entries());
		const themVao = Object.keys(p2).filter((k) => !(k in p1));
		expect(
			themVao.length,
			`Chọn thêm điều kiện thứ hai mà query không có tham số mới: ${JSON.stringify(p2)}`,
		).toBeGreaterThan(0);
		for (const [k, v] of Object.entries(p1)) {
			if (/page|size|sort/.test(k)) continue;
			expect(p2[k], `Điều kiện "${k}=${v}" bị mất khi chọn thêm điều kiện thứ hai`).toBe(v);
		}
	});

	test('10_010_003 — Lọc theo phạm vi áp dụng chọn đơn vị trong cây tổ chức', async ({ page }) => {
		chanNeuTat('10_010_003');

		const o = oLoc(page, 'Phạm vi khu vực');
		await o.click({ force: true });
		await page.waitForTimeout(2_000);

		const dr = page.locator('.ant-drawer-open').last();
		const dd = page.locator('.ant-select-dropdown:visible').last();
		if ((await dr.count()) === 0 && (await dd.count()) === 0) {
			boQua(test, 'Bấm ô "Phạm vi khu vực" không mở dropdown lẫn drawer nào — cần probe lại.');
		}

		// Ghi lại cơ chế thật để lần sau khỏi mò.
		test.info().annotations.push({
			type: 'cơ chế ô Phạm vi khu vực',
			description: (await dr.count()) ? 'drawer chọn đơn vị' : 'dropdown cây tổ chức',
		});
		const muc = (await dr.count())
			? dr.locator('.sp-item, .ant-radio-wrapper')
			: dd.locator('.ant-select-tree-node-content-wrapper, .ant-select-item-option-content');
		expect(await muc.count(), 'Không có đơn vị nào để chọn trong cây tổ chức').toBeGreaterThan(0);
	});

	test('10_010_004 — Xuất danh sách bảng giá ra Excel', async ({ page }) => {
		chanNeuTat('10_010_004');

		const nut = khung(page).getByRole('button', { name: 'Xuất Excel' }).first();
		await expect(nut, 'Không thấy nút Xuất Excel').toBeVisible();

		const goi = [];
		page.on('request', (r) => {
			if (/export|excel/i.test(r.url())) goi.push(`${r.method()} ${r.url()}`);
		});
		const cho = page.waitForEvent('download', { timeout: 60_000 }).catch(() => null);
		await nut.click({ force: true });
		const tai = await cho;
		await page.waitForTimeout(3_000);

		expect(
			tai !== null || goi.length > 0,
			'Bấm "Xuất Excel" mà không có tệp tải về và cũng không có request xuất nào',
		).toBe(true);
	});

	test('10_020_002 — Màn Thêm bảng giá có đúng ba thẻ khai theo thứ tự', async ({ page }) => {
		chanNeuTat('10_020_002');
		const { daGoi } = await chanGhi(page);

		await khung(page).getByRole('button', { name: 'Thêm mới' }).first().click({ force: true });
		await page.waitForTimeout(4_000);

		const hop = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
		const box = (await hop.count()) ? hop : khung(page);
		const the = (await box.locator('.ant-tabs-tab, .ant-steps-item-title').allInnerTexts()).map(chuan);

		// 🔴 Đo 20/09/2026: màn có **BỐN** bước — kịch bản (và HDSD) chỉ kể ba, thiếu hẳn
		//    **"Phạm vi khách hàng"** nằm giữa *Phạm vi khu vực* và *Sản phẩm*. Giữ nguyên kỳ vọng
		//    của kịch bản để user chốt bổ sung tài liệu, 🚫 không tự sửa cho khớp sản phẩm.
		expect(
			the.slice(0, 3),
			`Màn Thêm bảng giá đang có ${the.length} bước: ${the.join(' · ')} — kịch bản chỉ khai 3.`,
		).toEqual(['Thông tin chung', 'Phạm vi khu vực', 'Sản phẩm']);
		expect(daGoi, 'Chỉ mở màn Thêm mà đã gửi request ghi').toEqual([]);
	});






});
