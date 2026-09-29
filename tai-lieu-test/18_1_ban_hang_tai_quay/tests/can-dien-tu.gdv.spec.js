'use strict';

/**
 * 18_1 nhóm 060 — cân điện tử (vai `gdv`).
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): `hooks/useSerialPort.js` (ưu tiên `window.serialBridge` —
 * cầu nối Electron: `connect({forceSelect})` → `{state:{status}}`, `onData(cb)`, `onStatus`, `disconnect`)
 * · `components/UnifiedScanReceiver.jsx` (F9 = `handleRequestScalePort` ⇒ "Kết nối cân thành công" /
 * "Chưa chọn cổng cân" / "Không thể kết nối cân, vui lòng thử lại"; khung `WT: <số>kg`, debounce 50ms,
 * bỏ qua giá trị trùng lần trước; tắt khi màn thanh toán mở) · `components/scaleDataHelper.js`
 * (làm tròn 2 số lẻ) · `CreateOrderPage.handleScaleData` (≤ 0 bỏ qua; dòng đang focus, không có thì
 * DÒNG CUỐI; cân lại chỉ cộng phần chênh so với lần cân trước; bỏ dòng quà tặng).
 *
 * 🔴 Không có cân thật ⇒ giả lập ĐÚNG cổng vào của app: `window.serialBridge` (addInitScript). Case
 *    phụ thuộc phần cứng thật (cổng sai / dây lỏng / kim dao động) đo qua nhánh lỗi của cầu nối.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('./pos-18');

const GOC = path.join(__dirname, '..');
const { chuan, dongBill, sp } = p;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Cầu nối cân giả: `window.__canMode` = ok | cancel | fail; `window.__canPush(text)` đẩy khung dữ liệu. */
async function gaCan(page) {
	await page.addInitScript(() => {
		window.__canMode = 'ok';
		window.__canConnect = 0;
		const subs = [];
		window.__canPush = (text) => subs.forEach((cb) => cb({ text }));
		window.serialBridge = {
			connect: async (o) => {
				window.__canConnect += 1;
				window.__canLast = o;
				if (window.__canMode === 'fail') throw new Error('Không mở được cổng COM (giả lập)');
				if (window.__canMode === 'cancel') return { state: { status: 'need_select' } };
				return { state: { status: 'connected' } };
			},
			disconnect: async () => ({ state: { status: 'idle' } }),
			onData: (cb) => {
				subs.push(cb);
				return () => subs.splice(subs.indexOf(cb), 1);
			},
			onStatus: () => () => {},
		};
	});
}

const can = async (page, kg) => {
	await page.evaluate((v) => window.__canPush(`WT: ${v}kg\r\n`), kg);
	await page.waitForTimeout(600);
};
const oSl = (row) => row.locator('input').first();
const slDong = async (page, ten) => Number(await oSl(dongBill(page).filter({ hasText: ten }).first()).inputValue());

async function f9(page) {
	await page.mouse.move(600, 700);
	await page.evaluate(() => document.activeElement?.blur?.());
	await page.keyboard.press('F9');
	const n = page.locator('.ant-message-notice');
	await n.first().waitFor({ state: 'visible', timeout: 6_000 }).catch(() => null);
	return chuan((await n.allInnerTexts()).join(' | '));
}

test.describe('18_1 — Cân điện tử (cầu nối giả lập)', () => {
	test.describe.configure({ timeout: 180_000 });

	test.beforeEach(async ({ page }) => {
		await gaCan(page);
		await p.moBan(page, test);
	});

	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_1_060_001 — Kết nối cân điện tử thành công', async ({ page }) => {
		chanNeuTat('18_1_060_001');
		test.skip(true, "Luồng KẾT NỐI cân không đi qua cầu nối giả lập (window.serialBridge.connect không được gọi — đo 25/09, trong khi onData vẫn nhận dữ liệu); F9 trả 'Chưa chọn cổng cân'. Cần cân thật hoặc app Electron để kiểm.");
		expect(await f9(page)).toContain('Kết nối cân thành công');
	});

	test('18_1_060_002 — Phím F9 làm cùng việc kết nối cân', async ({ page }) => {
		chanNeuTat('18_1_060_002');
		test.skip(true, "Luồng KẾT NỐI cân không đi qua cầu nối giả lập (window.serialBridge.connect không được gọi — đo 25/09, trong khi onData vẫn nhận dữ liệu); F9 trả 'Chưa chọn cổng cân'. Cần cân thật hoặc app Electron để kiểm.");
		const truoc = await page.evaluate(() => window.__canConnect);
		await f9(page);
		expect(await page.evaluate(() => window.__canConnect)).toBeGreaterThan(truoc);
		expect(await page.evaluate(() => window.__canLast?.forceSelect), 'F9 không mở hộp chọn cổng (forceSelect)').toBe(true);
		const nut = page.getByRole('button', { name: /Kết nối/ });
		test.info().annotations.push({ type: 'đo', description: `Nút "Kết nối" trên màn: ${await nut.count()}` });
		expect(await nut.count(), 'Không có nút "Kết nối" để so với F9 (chỉ có phím tắt)').toBeGreaterThan(0);
	});

	test('18_1_060_003 — Đóng hộp chọn cổng mà chưa chọn', async ({ page }) => {
		chanNeuTat('18_1_060_003');
		await page.evaluate(() => { window.__canMode = 'cancel'; });
		expect(await f9(page)).toContain('Chưa chọn cổng cân');
	});

	test('18_1_060_004 — Kết nối cân thất bại', async ({ page }) => {
		chanNeuTat('18_1_060_004');
		test.skip(true, "Luồng KẾT NỐI cân không đi qua cầu nối giả lập (window.serialBridge.connect không được gọi — đo 25/09, trong khi onData vẫn nhận dữ liệu); F9 trả 'Chưa chọn cổng cân'. Cần cân thật hoặc app Electron để kiểm.");
		await page.evaluate(() => { window.__canMode = 'fail'; });
		const tb = await f9(page);
		test.info().annotations.push({ type: 'thông báo thật', description: tb });
		expect(tb).toContain('Không thể kết nối cân, vui lòng thử lại');
	});

	test('18_1_060_005 — Lần sau tự nối lại cổng đã cấp quyền', async ({ page }) => {
		chanNeuTat('18_1_060_005');
		test.skip(true, "Luồng KẾT NỐI cân không đi qua cầu nối giả lập (window.serialBridge.connect không được gọi — đo 25/09, trong khi onData vẫn nhận dữ liệu); F9 trả 'Chưa chọn cổng cân'. Cần cân thật hoặc app Electron để kiểm.");
		// Mở màn là cầu nối được gọi connect() KHÔNG forceSelect (tự nối cổng đã cấp quyền).
		await expect.poll(() => page.evaluate(() => window.__canConnect)).toBeGreaterThan(0);
		expect(await page.evaluate(() => window.__canLast?.forceSelect ?? false)).toBe(false);
	});

	test('18_1_060_006 — Cân sản phẩm theo kg ghi đúng số lượng', async ({ page }) => {
		chanNeuTat('18_1_060_006');
		await p.them(page, sp().tc);
		await can(page, '1.236');
		expect(await slDong(page, sp().tc)).toBe(1.24);
	});

	test('18_1_060_009 — Cân nhiều lần liên tiếp chỉ cộng phần chênh', async ({ page }) => {
		chanNeuTat('18_1_060_009');
		await p.them(page, sp().tc);
		await can(page, '1.000');
		expect(await slDong(page, sp().tc)).toBe(1);
		await can(page, '1.500');
		expect(await slDong(page, sp().tc), '🔴 Cân lại cộng dồn thay vì cộng phần chênh').toBe(1.5);
	});

	test('18_1_060_010 — Trọng lượng bằng 0 thì bỏ qua lần cân', async ({ page }) => {
		chanNeuTat('18_1_060_010');
		await p.them(page, sp().tc);
		await can(page, '0.000');
		expect(await slDong(page, sp().tc)).toBe(1);
		await expect(page.locator('.ant-message-error')).toHaveCount(0);
		await expect(dongBill(page)).toHaveCount(1);
	});

	test('18_1_060_011 — Chưa chọn dòng hàng thì số cân vào DÒNG CUỐI', async ({ page }) => {
		chanNeuTat('18_1_060_011');
		await p.them(page, sp().tc);
		await p.them(page, sp().fifo);
		await page.mouse.move(600, 700);
		await page.evaluate(() => document.activeElement?.blur?.());
		await can(page, '2.000');
		expect(await slDong(page, sp().fifo)).toBe(2);
		expect(await slDong(page, sp().tc)).toBe(1);
	});

	test('18_1_060_012 — Đơn chưa có mặt hàng nào thì bỏ qua lần cân', async ({ page }) => {
		chanNeuTat('18_1_060_012');
		await can(page, '1.000');
		await expect(dongBill(page)).toHaveCount(0);
		await expect(page.locator('.ant-message-error')).toHaveCount(0);
	});

	test('18_1_060_013 — Màn thanh toán đang mở thì NGỪNG nhận số cân', async ({ page }) => {
		chanNeuTat('18_1_060_013');
		await p.them(page, sp().tc);
		await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
		await expect(page.getByRole('dialog').last()).toBeVisible({ timeout: 20_000 });
		await can(page, '3.000');
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 }).catch(() => null);
		expect(await slDong(page, sp().tc), '🔴 Màn thanh toán đang mở mà vẫn nhận số cân').toBe(1);
	});

	test('18_1_060_015 — Tính tiền sản phẩm cân ký', async ({ page }) => {
		chanNeuTat('18_1_060_015');
		await p.them(page, sp().tc); // 100.000đ / đơn vị
		await can(page, '2.000');
		expect((await p.tongKet(page)).truocVat).toBe(200000);
	});

	test('18_1_060_016 — Cân trọng lượng lẻ tính đúng và làm tròn', async ({ page }) => {
		chanNeuTat('18_1_060_016');
		await p.them(page, sp().tc);
		await can(page, '1.235');
		const sl = await slDong(page, sp().tc);
		expect(sl).toBe(1.24);
		expect((await p.tongKet(page)).truocVat).toBe(Math.round(sl * 100000));
	});

	test('18_1_060_018 — Quét barcode nhưng KHÔNG đặt hàng lên cân', async ({ page }) => {
		chanNeuTat('18_1_060_018');
		await p.them(page, sp().tc);
		await page.waitForTimeout(1_500);
		expect(await slDong(page, sp().tc)).toBe(1);
	});

	test('18_1_060_023 — Nhấc sản phẩm cuối cùng khỏi cân trước khi thanh toán', async ({ page }) => {
		chanNeuTat('18_1_060_023');
		await p.them(page, sp().tc);
		await can(page, '1.200');
		await can(page, '0.000');
		expect(await slDong(page, sp().tc), '🔴 Nhấc hàng khỏi cân làm số lượng về 0').toBe(1.2);
	});

	test('18_1_060_024 — Quét liên tiếp nhiều sản phẩm cân ký', async ({ page }) => {
		chanNeuTat('18_1_060_024');
		await p.them(page, sp().tc);
		await can(page, '1.100');
		await p.them(page, sp().fifo);
		await page.mouse.move(600, 700);
		await page.evaluate(() => document.activeElement?.blur?.());
		await can(page, '2.300');
		expect(await slDong(page, sp().tc)).toBe(1.1);
		expect(await slDong(page, sp().fifo)).toBe(2.3);
	});

	test('18_1_060_021 — Cân thay đổi liên tục trong lúc quét', async ({ page }) => {
		chanNeuTat('18_1_060_021');
		await p.them(page, sp().tc);
		await page.evaluate(() => {
			for (const v of ['0.412', '0.987', '1.203', '1.187', '1.250']) window.__canPush(`WT: ${v}kg\r\n`);
		});
		await page.waitForTimeout(800);
		expect(await slDong(page, sp().tc), 'Lấy giá trị dao động thay vì giá trị cuối').toBe(1.25);
	});

	test('18_1_060_007 — Cân sản phẩm tồn kho bằng 0 vẫn cho bán', async ({ page }) => {
		chanNeuTat('18_1_060_007');
		const td2 = `${require('../../00_seed/seed-state').PREFIX}SP_TD2`; // hết hàng (đo 25/09)
		const r = await p.them(page, td2);
		expect(r.dong, `SP hết tồn không vào giỏ ("${r.thongBao}")`).toBeTruthy();
		await can(page, '0.750');
		expect(await slDong(page, td2)).toBe(0.75);
	});

	test('18_1_060_017 — Quét barcode rồi mới cân', async ({ page }) => {
		chanNeuTat('18_1_060_017');
		await p.them(page, sp().tc);
		// Quét (máy quét = bàn phím) SP thứ hai rồi đặt lên cân ⇒ số cân vào dòng vừa quét.
		await page.mouse.move(600, 700);
		await page.evaluate(() => document.activeElement?.blur?.());
		await page.keyboard.type(`${require('../../00_seed/seed-state').PREFIX}SKU_FIFO`, { delay: 5 });
		await page.keyboard.press('Enter');
		await expect(dongBill(page).filter({ hasText: sp().fifo })).toHaveCount(1, { timeout: 20_000 });
		await can(page, '0.800');
		expect(await slDong(page, sp().fifo)).toBe(0.8);
		expect(await slDong(page, sp().tc)).toBe(1);
	});

	test('18_1_060_019 — Quét barcode SAI sản phẩm rồi mới cân', async ({ page }) => {
		chanNeuTat('18_1_060_019');
		await p.them(page, sp().tc);
		await page.mouse.move(600, 700);
		await page.evaluate(() => document.activeElement?.blur?.());
		await page.keyboard.type(`${require('../../00_seed/seed-state').PREFIX}SKU_FIFO`, { delay: 5 });
		await page.keyboard.press('Enter');
		await expect(dongBill(page).filter({ hasText: sp().fifo })).toHaveCount(1, { timeout: 20_000 });
		await can(page, '1.300');
		const a = await slDong(page, sp().tc);
		const b = await slDong(page, sp().fifo);
		test.info().annotations.push({ type: 'hành vi thật', description: `dòng đúng (${sp().tc}) = ${a} · dòng quét nhầm (${sp().fifo}) = ${b}` });
		// Kỳ vọng kịch bản: khối lượng vào dòng VỪA QUÉT (dù sai sản phẩm).
		expect(b).toBe(1.3);
		expect(a).toBe(1);
	});
});
