'use strict';

/**
 * Phân hệ 07_3 — Đơn hàng và thanh toán, phần ĐỌC của vai `tct`.
 *
 * Trace 20/09/2026 — tất cả nằm trong `/settings?setting=<key>`:
 * `order` (Đơn hàng) · `printer` (In hoá đơn bán hàng) · `payment` (Quản lý tài khoản thanh toán) ·
 * `paymentMethodConfig` (Cấu hình phương thức thanh toán).
 *
 * 🔴 Cả file 🚫 KHÔNG ghi: tắt một phương thức thanh toán là cả mạng lưới không thu tiền được bằng
 * phương thức đó.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/config|setting|payment/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

async function moNhom(page, key, vai = VAI) {
	await moTrang(page, `/settings?setting=${key}`, vai);
	await page.waitForTimeout(4_500);
	return khung(page);
}

test.describe('07_3 — Cấu hình đơn hàng và thanh toán', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhi(page);
	});

	test('07_3_010_001 — Nhóm Đơn hàng hiện hai khối cấu hình có công tắc riêng', async ({ page }) => {
		chanNeuTat('07_3_010_001');

		await moNhom(page, 'order');
		const noi = chuan(await khung(page).innerText());
		expect(noi, 'Thiếu khối "Cấu hình đơn đổi trả"').toContain('đổi trả');
		expect(noi, 'Thiếu khối "Cấu hình ngưỡng hoàn trả bất thường"').toContain('hoàn trả');

		expect(
			await khung(page).locator('.ant-switch').count(),
			'Hai khối phải có công tắc RIÊNG — đếm được ít hơn 2 công tắc',
		).toBeGreaterThanOrEqual(2);
		expect(
			await khung(page).getByRole('button', { name: 'Lưu' }).count(),
			'Hai khối phải có nút Lưu RIÊNG',
		).toBeGreaterThanOrEqual(2);
	});

	test('07_3_030_003 — Hai hình thức liên kết được phân biệt rõ', async ({ page }) => {
		chanNeuTat('07_3_030_003');

		await moNhom(page, 'payment');
		const noi = chuan(await khung(page).innerText());
		const co = (s) => noi.toLowerCase().includes(s.toLowerCase());
		expect(
			co('thủ công') && co('tích hợp'),
			`Màn không phân biệt hai hình thức liên kết (thủ công / tích hợp). Nội dung: ${noi.slice(0, 250)}`,
		).toBe(true);
	});

	test('07_3_040_001 — Khối Phương thức thanh toán hỗ trợ liệt kê đủ phương thức', async ({
		page,
	}) => {
		chanNeuTat('07_3_040_001');

		await moNhom(page, 'paymentMethodConfig');
		const noi = chuan(await khung(page).innerText());
		for (const pt of ['Tiền mặt', 'Chuyển khoản', 'PostPay', 'Thẻ VISA']) {
			expect(noi, `Thiếu phương thức "${pt}"`).toContain(pt);
		}
		// 🔴 Đo 20/09: màn có **6** phương thức, kịch bản chỉ kể 4 — hai cái thêm là
		//    *Thanh toán bằng điểm* và *Đa phương thức*. Ghi lại để user bổ sung kịch bản.
		const soCongTac = await khung(page).locator('.ant-switch').count();
		test.info().annotations.push({
			type: 'số phương thức thật trên màn',
			description: `${soCongTac} công tắc — nội dung: ${noi.slice(0, 200)}`,
		});
	});

	/**
	 * Kỳ vọng user chốt 28/09/2026 (A12): KHÔNG cần chặn — tắt hết phương thức thanh toán vẫn lưu được.
	 * Trace vnpost-web f9c5c858 `settingContents/paymentSetting/AllowedPaymentMethodsSetting.jsx`: mỗi công tắc LƯU NGAY
	 * (`PUT /api/v1/admin/configs?configKey=ALLOWED_PAYMENT_METHODS`), trạng thái đọc lại từ `GET /api/v1/internal/configs`.
	 * 🔴 Cấu hình DÙNG CHUNG CẢ CHUỖI ⇒ 🚫 ghi thật (tắt hết = mọi quầy không thu được tiền). Giả lập ở tầng mạng: PUT được giữ lại
	 *    trả "thành công", GET trả giá trị vừa "lưu" ⇒ FE chạy đúng luồng tắt lần lượt; đo FE có chặn công tắc CUỐI không.
	 *    Vế BE có nhận cấu hình "tắt hết" không và bước 3 (mở quầy) KHÔNG đo — cần ghi thật cấu hình chuỗi.
	 */
	test('07_3_040_004 — Tắt HẾT phương thức thanh toán', async ({ page }) => {
		chanNeuTat('07_3_040_004');
		let gia = null;
		let hinh = '';
		const put = [];
		await page.route('**/api/v1/internal/configs**', async (route) => {
			if (route.request().method() !== 'GET' || !gia) return route.continue();
			const res = await route.fetch();
			const b = await res.json();
			// 🔴 FE đọc `parsedValue` TRƯỚC `configValue` (coreChainConfig.js › getCoreConfigValue); data có thể là mảng hoặc object {KEY: giá trị}.
			const ds = Array.isArray(b?.data) ? b.data : Array.isArray(b?.data?.data) ? b.data.data : Array.isArray(b?.data?.content) ? b.data.content : null;
			if (ds) {
				const e = ds.find((x) => (x?.configKey || x?.key || x?.code) === 'ALLOWED_PAYMENT_METHODS');
				if (e) { e.configValue = JSON.stringify(gia); if ('parsedValue' in e) e.parsedValue = gia; if ('value' in e) e.value = JSON.stringify(gia); }
				else ds.push({ configKey: 'ALLOWED_PAYMENT_METHODS', configValue: JSON.stringify(gia), parsedValue: gia, dataType: 'JSON', isActive: true });
			} else if (b?.data && typeof b.data === 'object') {
				b.data.ALLOWED_PAYMENT_METHODS = typeof b.data.ALLOWED_PAYMENT_METHODS === 'string' ? JSON.stringify(gia) : gia;
			}
			hinh = hinh || JSON.stringify(b?.data).slice(0, 300);
			await route.fulfill({ response: res, json: b });
		});
		await page.route('**/api/v1/admin/configs**', async (route) => {
			const req = route.request();
			if (req.method() !== 'PUT') return route.continue();
			const body = req.postDataJSON();
			put.push(body);
			try { gia = JSON.parse(body?.configValue || '{}'); } catch { gia = null; }
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: { code: '200', message: 'Giả lập — auto test giữ lại, không ghi' }, data: null }) });
		});
		await moNhom(page, 'paymentMethodConfig');
		const the = page.locator('.ant-pro-card').filter({ hasText: 'Phương thức thanh toán hỗ trợ' }).first();
		const cong = the.locator('.ant-switch');
		const n = await cong.count();
		expect(n, 'Không thấy công tắc phương thức thanh toán').toBeGreaterThan(0);
		const tb = [];
		for (let i = 0; i < n; i += 1) {
			const c = cong.nth(i);
			if ((await c.getAttribute('aria-checked')) !== 'true') continue;
			const truoc = put.length;
			await c.click();
			await expect.poll(() => put.length, { timeout: 15_000, message: `Tắt công tắc #${i + 1} không gửi lưu` }).toBeGreaterThan(truoc);
			await page.waitForTimeout(1_200);
			tb.push((await page.locator('.ant-message-notice').allInnerTexts()).map(chuan).join(' | '));
		}
		const cuoi = put.at(-1);
		const giaTri = JSON.parse(cuoi?.configValue || '{}');
		const conBat = await the.locator('.ant-switch[aria-checked="true"]').count();
		test.info().annotations.push({ type: 'đo', description: `${n} công tắc · ${put.length} lần lưu (giả lập) · giá trị cuối ${cuoi?.configValue} · công tắc còn bật ${conBat} · thông báo ${JSON.stringify(tb)} · hình dữ liệu GET ${hinh}` });
		expect(Object.values(giaTri).every((v) => v === false), `Lần lưu cuối chưa phải "tắt hết": ${cuoi?.configValue}`).toBe(true);
		expect(conBat, 'FE còn giữ bật công tắc nào đó (tự chặn tắt hết)').toBe(0);
		expect(tb.join(' | '), 'FE báo chặn khi tắt công tắc cuối').not.toMatch(/ít nhất|không thể tắt|phải còn/i);
	});
});
