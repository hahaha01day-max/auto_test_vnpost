'use strict';

/**
 * 18_1 nhóm 030 — quét mã vạch (vai `gdv`, điểm bán seed của làn).
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): `UnifiedScanReceiver.jsx` (react-barcode-reader: bắt chuỗi
 * phím gõ NHANH kết thúc bằng Enter ở bất kỳ đâu, ngoài ô nhập; sau mỗi lần quét tự `blur`) ·
 * `CreateOrderPage.jsx:430-600` (hàng đợi quét) · `utils/scanCommand.js` (cú pháp `N*mã`, N nguyên
 * 1–999) · `utils/variableMeasureBarcode.js` (tem cân `PP IIIII VVVVV C`, PP 20–29, VVVVV 3 số lẻ kg,
 * `acceptMissingChecksum: true`).
 *
 * 🔴 Máy quét = bàn phím ⇒ giả lập bằng `keyboard.type` (không trễ) + Enter, sau khi rời mọi ô nhập.
 * Mã vạch SP seed = SKU (`AUTO<làn>_SKU_TC`…, đo `CHAIN_PRODUCTS.bar_code` 25/09).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('./pos-18');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const { chuan, dongBill, sp } = p;
const PF = seed.PREFIX; // "AUTO8_"
const MA = { tc: `${PF}SKU_TC`, fifo: `${PF}SKU_FIFO`, dd: `${PF}SKU_DD` };

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** EAN-13 check digit. */
const ck = (s12) => String((10 - ([...s12].reduce((t, d, i) => t + Number(d) * (i % 2 ? 3 : 1), 0) % 10)) % 10);
/** Tem cân: prefix 20, mã hàng 5 số, khối lượng gram (5 số). */
const temCan = (maHang, gram, { sai = false, thieu = false } = {}) => {
	const p12 = `20${maHang}${String(gram).padStart(5, '0')}`;
	if (thieu) return p12;
	return p12 + (sai ? String((Number(ck(p12)) + 1) % 10) : ck(p12));
};

/** Quét: rời ô nhập, gõ nhanh + Enter. */
async function quet(page, ma) {
	await page.mouse.move(600, 700);
	await page.evaluate(() => document.activeElement?.blur?.());
	await page.locator('body').click({ position: { x: 600, y: 650 } });
	await page.keyboard.type(ma, { delay: 5 });
	await page.keyboard.press('Enter');
}

async function tbSau(page, fn, cho = 6_000) {
	await fn();
	const n = page.locator('.ant-message-notice');
	await n.first().waitFor({ state: 'visible', timeout: cho }).catch(() => null);
	await page.waitForTimeout(800);
	return chuan((await n.allInnerTexts()).join(' | '));
}

const oSl = (row) => row.locator('input').first();
const dongCua = (page, ten) => dongBill(page).filter({ hasText: ten });
/** Chờ số lượng dòng `ten` đạt `sl`. */
const choSl = (page, ten, sl) => expect.poll(async () => Number(String(await oSl(dongCua(page, ten).first()).inputValue().catch(() => 0)).replace(/\./g, '').replace(',', '.')), { timeout: 20_000 }).toBe(sl);

test.describe('18_1 — Quét mã vạch', () => {
	test.describe.configure({ timeout: 180_000 });

	test.beforeEach(async ({ page }) => {
		await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await p.donTab(page).catch(() => null);
	});

	test('18_1_030_001 — Kết nối máy quét mã vạch', async ({ page }) => {
		chanNeuTat('18_1_030_001');
		// Nhận dãy mã ở BẤT KỲ vị trí nào — con trỏ không nằm trong ô tìm kiếm.
		await quet(page, MA.tc);
		expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('product-search');
		await expect(dongCua(page, sp().tc)).toHaveCount(1, { timeout: 20_000 });
	});

	test('18_1_030_002 — Quét barcode sản phẩm còn tồn', async ({ page }) => {
		chanNeuTat('18_1_030_002');
		await quet(page, MA.tc);
		await choSl(page, sp().tc, 1);
		expect((await p.tongKet(page)).truocVat).toBe(100000);
	});

	test('18_1_030_005 — Quét liên tiếp cùng một barcode thì cộng dồn', async ({ page }) => {
		chanNeuTat('18_1_030_005');
		for (let i = 0; i < 3; i += 1) await quet(page, MA.fifo);
		await choSl(page, sp().fifo, 3);
		await expect(dongCua(page, sp().fifo)).toHaveCount(1);
		expect(await page.evaluate(() => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName))).toBe(false);
	});

	test('18_1_030_007 — Quét barcode không tồn tại', async ({ page }) => {
		chanNeuTat('18_1_030_007');
		const ma = 'KHONGCO123456';
		const tb = await tbSau(page, () => quet(page, ma));
		expect(tb).toContain(`Mã vạch/SKU không tồn tại(${ma})`);
		await expect(dongBill(page)).toHaveCount(0);
		await expect(p.oTim(page)).toHaveValue('');
	});

	test('18_1_030_008 — Quét barcode sản phẩm đã ngừng kinh doanh', async ({ page }) => {
		chanNeuTat('18_1_030_008');
		// "Cốc 20" — bar_code 0030926501, status NGUNG_KICH_HOAT (CHAIN_PRODUCTS, đo 25/09).
		const tb = await tbSau(page, () => quet(page, '0030926501'));
		test.info().annotations.push({ type: 'thông báo thật', description: tb });
		expect(tb).toMatch(/Sản phẩm '.+' đã bị ngừng kinh doanh hoặc ngừng bán\./);
		await expect(dongBill(page)).toHaveCount(0);
	});

	/**
	 * Kỳ vọng user chốt 28/09/2026 (B8): hàng ngừng kinh doanh — HOẶC thêm vào đơn bị chặn kèm thông báo, HOẶC không tìm thấy hàng đó;
	 * hàng 🚫 vào giỏ. Đo cả hai lối vào: ô tìm (gọi spa-products `disableProductNotActive=true` — trace 25/09) và quét mã.
	 * Vật thử như 030_008: "Cốc 20" — bar_code 0030926501, NGUNG_KICH_HOAT.
	 */
	test('18_1_020_020 — Hàng ngừng kinh doanh KHÔNG thêm được vào đơn', async ({ page }) => {
		chanNeuTat('18_1_020_020');
		const TEN = 'Cốc 20';
		// Lối 1: ô tìm theo tên.
		await p.oTim(page).click();
		await p.oTim(page).fill(TEN);
		await page.waitForTimeout(3_000);
		const goiY = page.getByText(TEN, { exact: true });
		const thayKhiTim = await goiY.count();
		let tbTim = '';
		if (thayKhiTim) tbTim = await tbSau(page, () => goiY.last().click());
		await page.keyboard.press('Escape');
		const gioSauTim = await dongBill(page).count();
		// Lối 2: quét mã vạch.
		const tbQuet = await tbSau(page, () => quet(page, '0030926501'));
		const gioSauQuet = await dongBill(page).count();
		test.info().annotations.push({ type: 'đo', description: `tìm "${TEN}": ${thayKhiTim} gợi ý${thayKhiTim ? ` → bấm ⇒ "${tbTim}"` : ''} · giỏ ${gioSauTim} · quét 0030926501 ⇒ "${tbQuet || '(không thông báo)'}" · giỏ ${gioSauQuet}` });
		const chanCoTb = (tb) => /ngừng kinh doanh|ngừng bán|không tìm thấy|không tồn tại/i.test(tb);
		expect(gioSauTim, '🔴 Hàng ngừng kinh doanh vào giỏ qua ô tìm').toBe(0);
		expect(thayKhiTim === 0 || chanCoTb(tbTim), `Ô tìm hiện hàng ngừng KD mà bấm vào không có thông báo chặn ("${tbTim}")`).toBe(true);
		expect(gioSauQuet, '🔴 Hàng ngừng kinh doanh vào giỏ qua quét mã').toBe(0);
		expect(!tbQuet || chanCoTb(tbQuet), `Quét mã hàng ngừng KD ra thông báo lạ: "${tbQuet}"`).toBe(true);
	});

	test('18_1_030_012 — Quét kèm số lượng bằng cú pháp N*mã', async ({ page }) => {
		chanNeuTat('18_1_030_012');
		await quet(page, `6*${MA.tc}`);
		await choSl(page, sp().tc, 6);
	});

	test('18_1_030_013 — Số lượng trong cú pháp N*mã phải là số nguyên 1–999', async ({ page }) => {
		chanNeuTat('18_1_030_013');
		await quet(page, `1*${MA.tc}`);
		await choSl(page, sp().tc, 1);
		const tb999 = await tbSau(page, () => quet(page, `999*${MA.tc}`));
		test.info().annotations.push({ type: 'N=999', description: tb999 || '(không thông báo)' });
		await choSl(page, sp().tc, 1000);
		for (const [n, loi] of [['0', 'Số lượng không hợp lệ'], ['1000', 'Số lượng quá lớn'], ['1.5', 'Số lượng không hợp lệ']]) {
			const tb = await tbSau(page, () => quet(page, `${n}*${MA.tc}`));
			expect(tb, `N=${n}`).toContain(`Lỗi quét mã: ${loi}`);
			await choSl(page, sp().tc, 1000);
		}
	});

	test('18_1_030_014 — Quét mã vạch hàng cân tách đúng mã hàng và khối lượng', async ({ page }) => {
		chanNeuTat('18_1_030_014');
		// Mã hàng 5 số "12541" = Bút bi BK03 (bar_code 12541, KICH_HOAT). 1.500 gram = 1,5.
		await quet(page, temCan('12541', 1500));
		await expect(dongCua(page, 'Bút bi BK03')).toHaveCount(1, { timeout: 20_000 });
		await choSl(page, 'Bút bi BK03', 1.5);
	});

	test('18_1_030_015 — Mã vạch hàng cân sai checksum bị chặn', async ({ page }) => {
		chanNeuTat('18_1_030_015');
		const tb = await tbSau(page, () => quet(page, temCan('12541', 1500, { sai: true })));
		expect(tb).toContain('Barcode hàng cân sai checksum, vui lòng quét lại.');
		await expect(dongBill(page)).toHaveCount(0);
	});

	test('18_1_030_016 — Mã vạch hàng cân thiếu checksum bị chặn', async ({ page }) => {
		chanNeuTat('18_1_030_016');
		const tb = await tbSau(page, () => quet(page, temCan('12541', 1500, { thieu: true })));
		test.info().annotations.push({ type: 'hành vi thật', description: `"${tb}" · ${await dongBill(page).count()} dòng` });
		expect(tb).toContain('Barcode hàng cân thiếu checksum');
		await expect(dongBill(page)).toHaveCount(0);
	});

	test('18_1_030_017 — Mã vạch hàng cân có trọng lượng bằng 0 bị chặn', async ({ page }) => {
		chanNeuTat('18_1_030_017');
		const tb = await tbSau(page, () => quet(page, temCan('12541', 0)));
		expect(tb).toContain('Barcode hàng cân có trọng lượng không hợp lệ');
		await expect(dongBill(page)).toHaveCount(0);
	});

	test('18_1_030_018 — Tự gõ mã vạch bằng tiêu chí Barcode', async ({ page }) => {
		chanNeuTat('18_1_030_018');
		await page.mouse.move(600, 700);
		await page.locator('body').click({ position: { x: 600, y: 650 } });
		await page.keyboard.press('F6');
		const o = page.getByPlaceholder('Tìm kiếm theo Barcode');
		await expect(o).toBeFocused();
		await o.pressSequentially(MA.fifo, { delay: 60 });
		await o.press('Enter');
		await expect(dongCua(page, sp().fifo)).toHaveCount(1, { timeout: 20_000 });
	});

	test('18_1_030_019 — Màn thanh toán đang mở thì NGỪNG nhận mã vạch', async ({ page }) => {
		chanNeuTat('18_1_030_019');
		await quet(page, MA.tc);
		await choSl(page, sp().tc, 1);
		await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
		const tt = page.getByRole('dialog').last();
		await expect(tt).toBeVisible({ timeout: 20_000 });
		await page.keyboard.type(MA.fifo, { delay: 5 });
		await page.keyboard.press('Enter').catch(() => null);
		await page.waitForTimeout(3_000);
		await page.keyboard.press('Escape');
		await expect(tt).toBeHidden({ timeout: 10_000 }).catch(() => null);
		await expect(dongCua(page, sp().fifo), '🔴 Màn thanh toán đang mở mà vẫn nhận mã vạch').toHaveCount(0);
	});

	test('18_1_030_020 — Quét liên tiếp nhiều mặt hàng khác nhau', async ({ page }) => {
		chanNeuTat('18_1_030_020');
		await quet(page, MA.tc);
		await quet(page, MA.fifo);
		await quet(page, `${PF.replace(/_/g, '')}SKUTD1`);
		await expect(dongBill(page)).toHaveCount(3, { timeout: 30_000 });
		const t = (await dongBill(page).allInnerTexts()).map(chuan).join(' / ');
		expect(t).toContain(sp().tc);
		expect(t).toContain(sp().fifo);
		expect(t).toContain(`${PF}SP_TD1`);
	});

	test('18_1_030_006 — Quét barcode quá số lượng tồn kho', async ({ page }) => {
		chanNeuTat('18_1_030_006');
		test.skip(true, "SP nhiều ĐVT của seed (BT) KHÔNG có mã vạch (CHAIN_PRODUCTS.bar_code NULL, đo 25/09); quét SKU biến thể/ĐVT trả 'không tồn tại' ⇒ không có mã để quét vượt tồn theo ĐVT.");
		// BT Đỏ - Hộp (SKU `…SKU_BT-1-HOP`) tồn ít: quét N = tồn + 2.
		await p.oTim(page).fill(sp().bt);
		const dd = page.locator('.order-search-product:not(.ant-select-dropdown-hidden)').last();
		const muc = dd.locator('.ant-select-item-option').filter({ hasText: 'Đỏ - Hộp' }).first();
		await expect(muc).toBeVisible({ timeout: 15_000 });
		const ton = Number((chuan(await muc.innerText()).match(/Kho: (\d+)/) || [])[1]);
		await p.oTim(page).fill('');
		expect(ton, 'Không đọc được tồn BT Đỏ - Hộp').toBeGreaterThan(0);
		await quet(page, `${PF}SKU_BT-1-HOP`);
		await choSl(page, sp().bt, 1);
		const tb = await tbSau(page, () => quet(page, `${ton + 1}*${PF}SKU_BT-1-HOP`));
		expect(tb).toContain('Chú ý: Số lượng đang vượt quá số lượng tồn kho');
		await choSl(page, sp().bt, ton + 2);
	});

	test('18_1_030_010 — Quét barcode sản phẩm có nhiều đơn vị tính', async ({ page }) => {
		chanNeuTat('18_1_030_010');
		test.skip(true, "SP nhiều ĐVT của seed (BT) KHÔNG có mã vạch; chuỗi không có SP nhiều ĐVT có mã vạch bán được ở điểm bán seed.");
		await quet(page, `${PF}SKU_BT-1-HOP`);
		const row = dongCua(page, sp().bt).first();
		await expect(row).toBeVisible({ timeout: 20_000 });
		expect(chuan(await row.innerText()), 'Quét mã ĐVT Hộp mà dòng hàng không ra đơn vị Hộp').toContain('Hộp');
		await quet(page, `${PF}SKU_BT-1`);
		await expect(dongBill(page).filter({ hasText: 'Cái' })).toHaveCount(1, { timeout: 20_000 });
	});

	test('18_1_030_003 — Quét barcode sản phẩm HẾT tồn vẫn thêm được', async ({ page }) => {
		chanNeuTat('18_1_030_003');
		// TD2 seed: hết hàng (bar_code `AUTO<làn>SKUTD2`, đo 25/09).
		const ma = `${PF.replace(/_/g, '')}SKUTD2`;
		const tb = await tbSau(page, () => quet(page, ma));
		expect(tb).toContain('Chú ý: Sản phẩm này đã hết hàng');
		await expect(dongCua(page, `${PF}SP_TD2`), `🔴 Hết tồn mà quét KHÔNG thêm vào đơn ("${tb}")`).toHaveCount(1);
	});

	test('18_1_030_009 — Quét barcode khớp nhiều mặt hàng', async ({ page }) => {
		chanNeuTat('18_1_030_009');
		test.skip(true, "Mã vạch trùng duy nhất đo được (142234, 4 mặt hàng) không bán ở điểm bán seed ⇒ trả 'không tồn tại'. Cần 2 SP cùng mã vạch trong bảng giá điểm bán.");
		// bar_code 142234 khai cho 4 mặt hàng KICH_HOAT của chuỗi (đo 25/09).
		const tb = await tbSau(page, () => quet(page, '142234'));
		test.info().annotations.push({ type: 'hành vi thật', description: `"${tb}" · ${await dongBill(page).count()} dòng` });
		expect(tb).toContain('Mã vạch/SKU trùng lặp. Vui lòng chọn thủ công.');
		await expect(dongBill(page)).toHaveCount(0);
	});
});
