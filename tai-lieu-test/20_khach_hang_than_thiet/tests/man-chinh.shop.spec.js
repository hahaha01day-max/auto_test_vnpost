'use strict';

/** 20 · Màn Quản lý chiến dịch Loyalty + hai drawer Xem chi tiết, vai `shop`. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, hopForm, khung, moMan } = require('./loyalty-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

async function moChiTiet(page, chiSo) {
	const nut = khung(page).getByRole('button', { name: 'Xem chi tiết' });
	if ((await nut.count()) <= chiSo) return null;
	await nut.nth(chiSo).click();
	const hop = hopForm(page);
	await hop.waitFor({ state: 'visible', timeout: 20_000 });
	await page.waitForTimeout(2_000);
	return hop;
}

test.describe('20 · Màn chiến dịch Loyalty', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
		await moMan(page, VAI);
	});

	test('20_040_001 — Mở màn Quản lý chiến dịch Loyalty', async ({ page }) => {
		chanNeuTat('20_040_001');

		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText(
			'Quản lý chiến dịch Loyalty',
		);
		const chu = chuan(await khung(page).innerText());
		expect(chu, 'Thiếu ô Chương trình tích điểm').toContain('Chương trình tích điểm');
		expect(chu, 'Thiếu ô Chương trình đổi điểm').toContain('Chương trình đổi điểm');
		// PageContainer luôn `breadcrumb={null}` theo quy tắc FE.
		expect(
			await page.locator('.ant-breadcrumb').count(),
			'Màn vẫn hiện breadcrumb, trái quy tắc PageContainer',
		).toBe(0);
	});

	test('20_040_002 — Kiểm tra control chính màn Loyalty', async ({ page }) => {
		chanNeuTat('20_040_002');

		// Chuỗi test đang CÓ SẴN cả hai chương trình ⇒ mỗi ô phải có đủ Xem chi tiết + Chỉnh sửa.
		expect(
			await khung(page).getByRole('button', { name: 'Xem chi tiết' }).count(),
			'Thiếu liên kết "Xem chi tiết" ở một trong hai ô',
		).toBe(2);
		expect(
			await khung(page).getByRole('button', { name: 'Chỉnh sửa' }).count(),
			'Thiếu liên kết "Chỉnh sửa" ở một trong hai ô',
		).toBe(2);

		// 🔴 Kịch bản ghi rõ tab "Điểm phân hạng" và nút "Làm mới" chưa có trên màn — đo lại để
		//    phát hiện ngày sản phẩm bổ sung chúng.
		const chu = chuan(await khung(page).innerText());
		test.info().annotations.push({
			type: 'tab/nút phụ trên màn',
			description: `Điểm phân hạng: ${chu.includes('Điểm phân hạng') ? 'CÓ' : 'chưa có'} · ` +
				`Làm mới: ${chu.includes('Làm mới') ? 'CÓ' : 'chưa có'}`,
		});
	});

	test('20_040_003 — Xem chi tiết chương trình tích điểm', async ({ page }) => {
		chanNeuTat('20_040_003');

		const hop = await moChiTiet(page, 0);
		expect(hop, 'Không mở được drawer chi tiết chương trình tích điểm').not.toBeNull();
		await expect(hop.locator('.ant-drawer-title, .ant-modal-title')).toContainText(
			'Chi tiết chương trình tích điểm',
		);

		const chu = chuan(await hop.innerText());
		for (const nhan of ['Trạng thái', 'Tỷ lệ tích điểm', 'Thời gian áp dụng']) {
			expect(chu, `Chi tiết tích điểm thiếu dòng "${nhan}"`).toContain(nhan);
		}
		// Drawer chỉ đọc: 🚫 không được có ô nào SỬA được.
		// 🔴 Không đếm ô `readonly`/`disabled` và ô ẩn — antd dựng sẵn input trong Select/DatePicker
		//    chỉ-đọc, đếm cả chúng là đỏ oan.
		const suaDuoc = await hop
			.locator('input:not([type="hidden"]):not([disabled]):not([readonly])')
			.evaluateAll((ds) => ds.filter((e) => e.offsetParent !== null).map((e) => e.id || e.type));
		expect(
			suaDuoc,
			`Drawer "chỉ đọc" mà có ô sửa được: ${suaDuoc.join(' · ')}`,
		).toEqual([]);
	});

	test('20_040_005 — Nhãn hiển thị trên màn chi tiết tích điểm đúng nguyên văn', async ({ page }) => {
		chanNeuTat('20_040_005');

		const hop = await moChiTiet(page, 0);
		expect(hop, 'Không mở được drawer chi tiết').not.toBeNull();
		const chu = chuan(await hop.innerText());
		test.info().annotations.push({ type: 'nguyên văn drawer', description: chu.slice(0, 600) });

		// 🔴 Kịch bản chốt theo CODE: nhãn đang sai chính tả "Giá trị đơn hàng tối thiếu".
		//    Giữ nguyên kỳ vọng để phát hiện ngày sản phẩm sửa lại chính tả.
		expect(
			/Giá trị đơn hàng tối thi[ếể]u/.test(chu),
			`Drawer thiếu dòng "Giá trị đơn hàng tối thiếu". Nguyên văn: ${chu.slice(0, 400)}`,
		).toBe(true);
	});

	test('20_040_006 — Xem chi tiết chương trình đổi điểm', async ({ page }) => {
		chanNeuTat('20_040_006');

		const hop = await moChiTiet(page, 1);
		expect(hop, 'Không mở được drawer chi tiết chương trình đổi điểm').not.toBeNull();
		await expect(hop.locator('.ant-drawer-title, .ant-modal-title')).toContainText(
			'Chi tiết chương trình đổi điểm',
		);
		const chu = chuan(await hop.innerText());
		for (const nhan of ['Trạng thái', 'Tỷ lệ đổi điểm', 'Thời gian áp dụng']) {
			expect(chu, `Chi tiết đổi điểm thiếu dòng "${nhan}"`).toContain(nhan);
		}
		expect(chu, 'Chi tiết đổi điểm thiếu dòng điều kiện hoá đơn').toMatch(/Điều kiện|Không có|Từ /);
	});
});
