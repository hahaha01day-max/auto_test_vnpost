'use strict';

/**
 * 18_2_010_001 · 18_2_020_001 — viết lại từ spec cũ `vnpost-pos.playwright.spec.js` (không khớp `testMatch`, chưa bao giờ
 * chạy; đăng nhập tài khoản QC điểm bán "An Giang"). Chạy trên POS của làn bằng helper `18_1/tests/pos-18.js`.
 *
 * Trace vnpost-web f9c5c858 (28/09/2026):
 * - `createOrderContent/orderInfoTab/overviewInfo/campaign/OrderCampaignSelection.jsx`: 3 tab `Theo đơn hàng` ·
 *   `Theo sản phẩm` · `Theo danh mục`; hàng tiêu đề `.promotion-program-modal__table-header`.
 * - Đo DOM 28/09 (làn 5): tiêu đề có 7 ô chữ "Chương trình khuyến mãi · Hình thức khuyến mãi · Quà khuyến mại ·
 *   Điều kiện áp dụng · Đối tượng áp dụng · Sinh nhật · Độ ưu tiên" — KHÔNG có "Áp dụng chung" như kịch bản.
 *   Assertion giữ theo kịch bản (🚫 sửa cho khớp màn).
 * 18_2_010_002: kỳ vọng user chốt 28/09 (B3) — POS KHÔNG cho sửa giảm giá tay (ô "Giảm giá (%)" của modal dòng hàng
 *    `AddOrEditProductModal.jsx` `disabled={true}`, khối giảm giá đơn ở OrderCampaignSelection.jsx bị comment).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

test.describe('18_2 — Tạo đơn + mở CTKM ở POS (vai gdv)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('18_2_010_001 — Tạo đơn hàng từ tìm kiếm sau đó chọn khách', async ({ page }) => {
		chanNeuTat('18_2_010_001');
		const st = await p.moBan(page, test);
		const kh = await p.taoKhach(page, st);
		// B1–2: gõ tên hàng vào ô tìm, chọn vào giỏ.
		await p.them(page, p.sp().tc);
		// B3: gắn khách SAU khi đã có hàng.
		await p.chonKhach(page, kh.customerName);
		// B4: thanh toán.
		const r = await p.thanhToanTienMat(page);
		ghiChu('thanh toán', `${JSON.stringify(r.draft?.status)} · đơn ${r.orderNumber} #${r.orderId} · khách ${kh.customerName}`);
		expect(r.orderId, `Thanh toán không thành công: ${JSON.stringify(r.draft?.status)}`).toBeTruthy();
		const don = await p.donTrongDs(page, st, r.orderId);
		ghiChu('dòng danh sách đơn', JSON.stringify(don && { orderNumber: don.orderNumber, customerName: don.customerName, status: don.status }));
		expect(don, 'Đơn vừa tạo không có trong danh sách đơn hàng').toBeTruthy();
		expect(p.chuan(don.customerName), 'Đơn trong danh sách không mang tên khách đã gắn').toBe(p.chuan(kh.customerName));
	});

	/**
	 * Kỳ vọng user chốt 28/09/2026 (B3): POS KHÔNG cho sửa (nhập) giảm giá tay. Modal dòng hàng (có ô "Giảm giá (%)",
	 * `#modal-product-discount-percent`) chỉ tự mở khi tick "Tự động mở chọn lô" + SP tiêu chuẩn/MAC/đích danh
	 * (`CreateOrderPage.jsx › shouldForceOpenDetail`). Không thanh toán; trả ô tick về như cũ.
	 */
	test('18_2_010_002 — Không cho sửa giảm giá tay khi tạo đơn', async ({ page }) => {
		chanNeuTat('18_2_010_002');
		await p.moBan(page, test);
		const oTick = page.getByText('Tự động mở chọn lô', { exact: true });
		const cb = page.getByRole('checkbox', { name: 'Tự động mở chọn lô' });
		const truoc = await cb.isChecked().catch(() => null);
		try {
			if (truoc === false) await oTick.click();
			await p.oTim(page).click();
			await p.oTim(page).fill(p.sp().tc);
			await page.getByText(p.sp().tc, { exact: true }).last().click();
			const md = page.locator('.ant-modal-wrap:visible').filter({ has: page.locator('#modal-product-discount-percent') }).last();
			const coModal = await md.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false);
			const oGiam = page.locator('#modal-product-discount-percent');
			const moDuoc = coModal ? await oGiam.isEnabled() : null;
			const giaTruoc = coModal ? await oGiam.inputValue() : null;
			if (coModal && moDuoc) await oGiam.fill('10').catch(() => null);
			if (coModal) await page.keyboard.press('Escape');
			await page.waitForTimeout(800);
			// Giỏ + khối thanh toán: không có ô nhập giảm giá tay nào đang bật.
			// 🔴 Loại ô COUPON (`#order-info-discount`, "Quét mã vạch hoặc nhập mã giảm giá…") — đó là mã giảm giá, 🚫 giảm giá tay (đo 28/09).
			const oGiamGio = page.locator('input[id*="discount" i]:enabled, input[placeholder*="giảm giá" i]:enabled').and(page.locator(':not(#order-info-discount)'));
			const soOGio = await oGiamGio.count();
			const cacO = await oGiamGio.evaluateAll((l) => l.map((e) => `${e.id || '-'}|${e.placeholder || '-'}|${e.closest('.ant-form-item, td, div')?.innerText?.slice(0, 40) || ''}`));
			test.info().annotations.push({ type: 'đo', description: `mở modal dòng hàng: ${coModal} · ô "Giảm giá (%)" bật: ${moDuoc} (giá trị "${giaTruoc}") · ô giảm giá tay đang bật trên màn: ${soOGio} ${JSON.stringify(cacO)}` });
			expect(coModal, 'Không mở được modal dòng hàng (tick "Tự động mở chọn lô") để đo ô giảm giá').toBe(true);
			expect(moDuoc, '🔴 Ô "Giảm giá (%)" của dòng hàng sửa được (phải khoá)').toBe(false);
			expect(soOGio, '🔴 Màn bán hàng còn ô nhập giảm giá tay đang bật').toBe(0);
		} finally {
			if (truoc === false && (await cb.isChecked().catch(() => false))) await oTick.click().catch(() => null);
			await p.donTab(page).catch(() => null);
		}
	});

	test('18_2_020_001 — Mở chương trình khuyến mãi', async ({ page }) => {
		chanNeuTat('18_2_020_001');
		await p.moBan(page, test);
		await p.them(page, p.sp().tc);
		const hop = page.getByRole('dialog').filter({ has: page.getByRole('tab', { name: 'Theo đơn hàng' }) });
		// B1: mở bằng F10.
		await page.mouse.click(700, 120);
		await page.keyboard.press('F10');
		await expect(hop, 'Phím F10 không mở cửa sổ Chương trình khuyến mãi').toBeVisible({ timeout: 15_000 });
		await page.keyboard.press('Escape');
		await expect(hop).toBeHidden({ timeout: 10_000 });
		// B1 (cách 2): bấm dòng "Chương trình khuyến mại" ở cột bên phải.
		await page.getByRole('button', { name: /Chương trình khuyến m[ãạ]i/i }).first().click({ force: true });
		await expect(hop, 'Bấm dòng "Chương trình khuyến mại" không mở cửa sổ').toBeVisible({ timeout: 15_000 });
		await expect(hop.getByText('Chương trình khuyến mãi').first()).toBeVisible();
		// B2: ba thẻ phạm vi.
		expect((await hop.getByRole('tab').allInnerTexts()).map(p.chuan)).toEqual(['Theo đơn hàng', 'Theo sản phẩm', 'Theo danh mục']);
		const tieuDe = hop.locator('.ant-tabs-tabpane-active .promotion-program-modal__table-header').first();
		await expect(tieuDe).toBeVisible();
		const cot = (await tieuDe.locator(':scope > *').allInnerTexts()).map(p.chuan);
		const coChon = await tieuDe.locator('.ant-checkbox').count();
		ghiChu('đo', `tiêu đề ${JSON.stringify(cot)} · ô chọn ở tiêu đề ${coChon}`);
		// Kịch bản: 8 cột — ô chọn + 7 cột chữ.
		expect(cot.filter(Boolean), 'Cột chữ của bảng CTKM khác kịch bản').toEqual([
			'Chương trình khuyến mãi', 'Hình thức khuyến mãi', 'Quà khuyến mại', 'Điều kiện áp dụng', 'Đối tượng áp dụng', 'Độ ưu tiên', 'Áp dụng chung',
		]);
	});
});
