'use strict';

/**
 * 07_1 — Bật/tắt + lưu cấu hình CHUỖI dùng chung, GHI (27/09/2026). Vai `tct`.
 * 🔴 Cấu hình áp cho cả chuỗi 626 (mọi làn + người dùng dev). User cho phép (memory `auto_test_moi_truong_test_lam_thoai_mai`, 25/09):
 *    tự bật/tắt để dựng tiền đề, KHÔI PHỤC nguyên trạng ở finally; đã báo phiên làn 7 trước khi chạy.
 * Công tắc nằm ở góc phải thẻ tóm tắt của nhóm (`/settings?setting=<key>`). Case "đang tắt": nhóm đang bật thì tắt trước rồi mới bật để đo.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { NHOM, chuan, khung, moFormSua, moNhom } = require('./settings-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 900) });

async function bamCongTac(page, sw) {
	const tb = new Set();
	const nghe = setInterval(async () => { for (const x of await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])) tb.add(chuan(x)); }, 150);
	await sw.click();
	await page.waitForTimeout(2_500);
	clearInterval(nghe);
	return { tb: [...tb].join(' | '), bat: (await sw.getAttribute('aria-checked')) === 'true' };
}

async function doBat(page, id, key, cau) {
	chanNeuTat(id);
	await moNhom(page, key, VAI);
	const sw = khung(page).locator('.ant-switch').filter({ visible: true }).first();
	await expect(sw, `Nhóm ${key} không có công tắc bật/tắt`).toBeVisible({ timeout: 20_000 });
	const goc = (await sw.getAttribute('aria-checked')) === 'true';
	let tat = null;
	try {
		if (goc) tat = await bamCongTac(page, sw); // đưa về "đang tắt"
		const bat = await bamCongTac(page, sw);
		ghiDo(`${key}: gốc ${goc ? 'BẬT' : 'TẮT'} · ${tat ? `tắt "${tat.tb}" · ` : ''}bật "${bat.tb}" ⇒ ${bat.bat}`);
		expect(bat.bat, 'Bấm công tắc mà không bật').toBe(true);
		expect(bat.tb, `Không báo nguyên văn "${cau}"`).toContain(cau);
	} finally {
		const nay = (await sw.getAttribute('aria-checked').catch(() => null)) === 'true';
		if (nay !== goc) await bamCongTac(page, sw).catch(() => null);
	}
}

test('07_1_010_002 — Bật cấu hình làm tròn tiền', async ({ page }) => doBat(page, '07_1_010_002', NHOM.lamTronTien, 'Đã bật cấu hình làm tròn'));
test('07_1_020_001 — Bật cấu hình làm tròn số lượng', async ({ page }) => doBat(page, '07_1_020_001', NHOM.lamTronSoLuong, 'Đã bật cấu hình làm tròn số lượng'));
test('07_1_030_003 — Bật cấu hình tiền tệ', async ({ page }) => doBat(page, '07_1_030_003', NHOM.tienTe, 'Đã bật cấu hình tiền tệ'));
test('07_1_040_002 — Bật cấu hình VAT mặc định', async ({ page }) => doBat(page, '07_1_040_002', NHOM.vat, 'Đã bật cấu hình VAT mặc định'));
test('07_1_050_001 — Bật cấu hình tự động khoá màn hình', async ({ page }) => doBat(page, '07_1_050_001', NHOM.tuDongDangXuat, 'Đã bật cấu hình tự động khóa màn hình'));

test('07_1_050_005 — Giá trị mới giữ sau khi tải lại trang', async ({ page }) => {
	chanNeuTat('07_1_050_005');
	// Nhóm Tiền tệ: đổi ô Mô tả (không ảnh hưởng số tiền), lưu, F5, đọc lại — khôi phục mô tả gốc ở finally.
	await moNhom(page, NHOM.tienTe, VAI);
	let dr = await moFormSua(page);
	const o = dr.locator('#description, textarea').first();
	const goc = await o.inputValue();
	const moi = `AUTO test 07_1_050_005 ${Date.now().toString().slice(-6)}`;
	try {
		await o.fill(moi);
		const cho = page.waitForResponse((r) => r.request().method() !== 'GET' && /config|setting/i.test(r.url()), { timeout: 30_000 });
		await dr.getByRole('button', { name: 'Lưu cấu hình' }).click();
		const b = await (await cho).json().catch(() => null);
		await page.reload();
		await page.waitForTimeout(4_000);
		dr = await moFormSua(page);
		const sau = await dr.locator('#description, textarea').first().inputValue();
		ghiDo(`mô tả gốc "${goc}" → lưu ${JSON.stringify(b?.status)} → sau F5 "${sau}"`);
		expect(sau, 'Tải lại trang mất giá trị vừa lưu').toBe(moi);
	} finally {
		const d2 = page.locator('.ant-drawer-open').last();
		if (!(await d2.count())) await moFormSua(page).catch(() => null);
		const x = page.locator('.ant-drawer-open').last();
		await x.locator('#description, textarea').first().fill(goc).catch(() => null);
		await x.getByRole('button', { name: 'Lưu cấu hình' }).click().catch(() => null);
		await page.waitForTimeout(2_000);
	}
});

test('07_1_030_006 — Mô tả tiền tệ nhập toàn khoảng trắng', async ({ page }) => {
	chanNeuTat('07_1_030_006');
	await moNhom(page, NHOM.tienTe, VAI);
	let dr = await moFormSua(page);
	const o = dr.locator('#description, textarea').first();
	const goc = await o.inputValue();
	try {
		await o.fill(' '.repeat(10));
		const cho = page.waitForResponse((r) => r.request().method() !== 'GET' && /config|setting/i.test(r.url()), { timeout: 20_000 }).catch(() => null);
		await dr.getByRole('button', { name: 'Lưu cấu hình' }).click();
		const res = await cho;
		const gui = res ? res.request().postData() : null;
		await page.reload();
		await page.waitForTimeout(4_000);
		dr = await moFormSua(page);
		const sau = await dr.locator('#description, textarea').first().inputValue();
		const dem = chuan(await dr.innerText()).match(/(\d+)\s*\/\s*200/)?.[1];
		ghiDo(`gửi ${res ? `${res.status()} body ${String(gui).slice(0, 200)}` : 'không gửi'} · sau F5 mô tả ${JSON.stringify(sau)} · bộ đếm ${dem}/200`);
		// Kỳ vọng kịch bản: phơi hành vi — mô tả rỗng sau trim thì không được lưu thành 10 dấu cách (bộ đếm 10/200 mà nội dung rỗng).
		expect(sau.trim() === '' ? sau.length : 0, '🔴 Lưu nguyên 10 dấu cách (không trim) — bộ đếm 10/200 mà nội dung rỗng').toBe(0);
	} finally {
		const x = page.locator('.ant-drawer-open').last();
		if (!(await x.count())) await moFormSua(page).catch(() => null);
		const y = page.locator('.ant-drawer-open').last();
		await y.locator('#description, textarea').first().fill(goc).catch(() => null);
		await y.getByRole('button', { name: 'Lưu cấu hình' }).click().catch(() => null);
		await page.waitForTimeout(2_000);
	}
});
