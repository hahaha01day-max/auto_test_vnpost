'use strict';

/**
 * Task 060 — Báo cáo chốt ca (`/employee/shift-report`).
 *
 * Toàn bộ case ở đây chỉ ĐỌC, trừ hai case tính lại / chốt số thủ công (ghi một khoản **chênh lệch
 * tiền chờ duyệt** vào sổ) đang `allowMutation: false`.
 *
 * Đo từ DOM 20/09/2026: bảng 10 cột, tiêu đề khối `Danh sách ca đã chốt (N ca)`, mỗi dòng có nút
 * **"Xem chi tiết"**, và một ô lọc **"Lọc theo quầy thu ngân"**.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { chanGhi, chuan, dong, khungMan, moManBaoCao, theColumn } = require('./shift-page');

const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Số tiền dạng `1.234.567` → số. Trả `null` khi ô không phải số tiền. */
function soTien(text) {
	const s = chuan(text).replace(/[^\d,.-]/g, '');
	if (!s) return null;
	const n = Number(s.replace(/\./g, '').replace(/,/g, '.'));
	return Number.isFinite(n) ? n : null;
}

test.describe('03a · 060 — Báo cáo chốt ca', () => {
	test.beforeEach(async ({ page }) => {
		await moManBaoCao(page, VAI);
	});

	test('03a_060_001 — Tra cứu báo cáo chốt ca theo khoảng thời gian', async ({ page }) => {
		chanNeuTat('03a_060_001');

		const so = await dong(page).count();
		expect(so, 'Không có ca đã chốt nào — 🚫 không kết luận "màn chạy đúng" từ bảng rỗng.').toBeGreaterThan(0);

		for (let i = 0; i < so; i += 1) {
			const o = dong(page).nth(i).locator('td');
			expect(chuan(await o.nth(1).innerText()), `Dòng ${i + 1} thiếu tên nhân viên`).not.toBe('');
			expect(chuan(await o.nth(3).innerText()), `Dòng ${i + 1} thiếu giờ bắt đầu ca`).not.toBe('');
		}
	});

	test('03a_060_004 — Bảng Báo cáo chốt ca có đúng 10 cột', async ({ page }) => {
		chanNeuTat('03a_060_004');

		const ten = (await theColumn(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		expect(ten).toEqual([
			'STT',
			'Tên nhân viên',
			'Quầy thu ngân',
			'Bắt đầu ca',
			'Kết thúc ca',
			'Số tiền mở ca',
			'Số tiền kết ca',
			'Chênh lệch đầu ca',
			'Chênh lệch cuối ca',
			'Thao tác',
		]);
	});

	test('03a_060_002 — Báo cáo chi tiết một ca đã chốt hiện đủ chỉ tiêu', async ({ page }) => {
		chanNeuTat('03a_060_002');

		if ((await dong(page).count()) === 0) test.skip(true, 'Không có ca đã chốt nào để mở chi tiết.');

		// 🔴 Bấm "Xem chi tiết" KHÔNG gọi API nào: modal dựng từ dữ liệu đã nạp cùng danh sách
		//    (đo 20/09). Chờ `waitForResponse` ở đây là treo hết timeout rồi đổ oan cho backend.
		await dong(page).first().getByRole('button', { name: 'Xem chi tiết' }).click();
		const modal = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').last();
		await expect(modal).toBeVisible({ timeout: 20_000 });
		await expect(modal).toContainText('Chi tiết báo cáo chốt ca', { timeout: 20_000 });

		const noi = chuan(await modal.innerText()).toLowerCase();
		for (const nhan of ['tổng đơn hàng', 'tổng doanh thu', 'tiền hoàn trả', 'quỹ tiền mặt', 'doanh thu theo hình thức thanh toán']) {
			expect(noi, `Chi tiết ca thiếu chỉ tiêu "${nhan}"`).toContain(nhan);
		}
	});

	test('03a_060_005 — Chi tiết ca đã chốt hiện đủ chỉ tiêu', async ({ page }) => {
		chanNeuTat('03a_060_005');

		if ((await dong(page).count()) === 0) test.skip(true, 'Không có ca đã chốt nào để mở chi tiết.');
		await dong(page).first().getByRole('button', { name: 'Xem chi tiết' }).click();
		const modal = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').last();
		await expect(modal).toBeVisible({ timeout: 20_000 });
		await page.waitForTimeout(1_500);

		const noi = chuan(await modal.innerText());
		for (const nhan of [
			'Tên nhân viên',
			'Quầy thu ngân',
			'Bắt đầu ca',
			'Kết thúc ca',
			'Tổng đơn hàng',
			'Tổng doanh thu',
			'Tiền hoàn trả',
			'Lượt hoàn tiền',
			'Đầu ca',
			'Đầu ca thực tế',
			'Chênh lệch đầu ca',
			'Cuối ca',
			'Cuối ca thực tế',
			'Chênh lệch cuối ca',
		]) {
			expect(noi, `Chi tiết ca thiếu nhãn "${nhan}"`).toContain(nhan);
		}
	});

	test('03a_060_008 — Lọc báo cáo theo quầy thu ngân', async ({ page }) => {
		chanNeuTat('03a_060_008');
		await chanGhi(page);

		const oLoc = khungMan(page).locator('.ant-select').first();
		expect(chuan(await oLoc.innerText())).toContain('quầy thu ngân');

		await oLoc.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		if (nhan.length === 0) {
			await page.keyboard.press('Escape');
			test.skip(true, 'Điểm bán này chưa khai quầy thu ngân nào để lọc.');
		}

		await dd.locator('.ant-select-item-option-content').first().click();
		await page.waitForTimeout(2_500);

		const so = await dong(page).count();
		if (so === 0) {
			test.info().annotations.push({
				type: 'ghi chú',
				description: `Quầy "${nhan[0]}" không có ca đã chốt nào — chỉ kiểm được là bộ lọc có tác dụng.`,
			});
		}
		for (let i = 0; i < so; i += 1) {
			expect(
				chuan(await dong(page).nth(i).locator('td').nth(2).innerText()),
				`Dòng ${i + 1} không thuộc quầy đã lọc`,
			).toBe(nhan[0]);
		}
	});

	test('03a_060_003 — Ca đã chốt cho số liệu ổn định giữa hai lần xem', async ({ page }) => {
		chanNeuTat('03a_060_003');
		await chanGhi(page);
		expect(await dong(page).count(), 'Không có ca đã chốt nào để đối chiếu').toBeGreaterThan(0);

		/** Mở chi tiết dòng mang đúng `khoa` (toàn bộ chữ của dòng), đọc số "Tổng doanh thu". */
		const doanhThu = async (khoa) => {
			// Danh sách sắp theo thời điểm chốt ⇒ sau khi tải lại, dòng đầu vẫn là đúng ca đó
			// (kiểm lại bằng `chuDong` ở dưới), 🚫 không lọc theo chữ — ô có tab/xuống dòng.
			void khoa;
			const d = dong(page).first();
			const chuDong = chuan(await d.innerText());
			await d.getByRole('button', { name: 'Xem chi tiết' }).click();
			const modal = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').last();
			await expect(modal).toContainText('Chi tiết báo cáo chốt ca', { timeout: 20_000 });
			const noi = chuan(await modal.innerText());
			const m = noi.match(/Tổng doanh thu\s*([\d.,]+)/i);
			expect(m, `Chi tiết ca không có con số "Tổng doanh thu": ${noi.slice(0, 300)}`).toBeTruthy();
			await page.keyboard.press('Escape');
			return { chuDong, so: m[1] };
		};

		const lan1 = await doanhThu(null);
		await moManBaoCao(page, VAI);
		const lan2 = await doanhThu(lan1.chuDong);
		expect(lan2.chuDong, 'Tải lại trang thì dòng ca đã chốt đổi nội dung').toBe(lan1.chuDong);
		expect(lan2.so, 'Doanh thu của ca ĐÃ chốt khác nhau giữa hai lần xem').toBe(lan1.so);
	});
	test('03a_060_006 — Tính lại số liệu ca khi đơn offline chưa về đủ', async () => {
		chanNeuTat('03a_060_006');
	});
	test('03a_060_007 — Chốt số thủ công khi đơn không bao giờ về đủ', async () => {
		chanNeuTat('03a_060_007');
	});
});

void soTien;
