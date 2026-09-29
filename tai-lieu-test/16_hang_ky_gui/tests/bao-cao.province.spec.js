'use strict';

/**
 * Phân hệ 16 · 060 — Báo cáo hàng ký gửi, phần KHÔNG cần dữ liệu (nhãn đầu màn, validate bộ lọc) — vai `province`.
 * Nguồn: `features/consignmentReport/ConsignmentReport.jsx` (`validate`) · `components/ReportMetaBanner.jsx` ·
 * `components/ConsignmentFilterPanel.jsx`. Chỉ ĐỌC.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const ROUTE = '/report/consignment';
const API = '/report/consignment-report';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
test.describe.configure({ timeout: 180_000 });

async function moMan(page) {
	const cho = page.waitForResponse((r) => r.url().includes(`${API}/nxt`), { timeout: 90_000 });
	await moTrang(page, ROUTE, VAI);
	const res = await cho;
	await expect(khung(page).getByRole('button', { name: /Xem báo cáo/ })).toBeVisible();
	return res.json();
}
const banner = (page) => khung(page).locator('.ant-pro-card .ant-alert').first();

/** Bấm "Xem báo cáo" ⇒ { thông báo, số request NXT phát sinh }. */
async function bamXem(page) {
	let n = 0;
	const urls = [];
	const dem = (r) => r.url().includes(`${API}/`) && !r.url().includes('/periods') && (n++, urls.push(r.url()));
	page.on('request', dem);
	await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
	await khung(page).getByRole('button', { name: /Xem báo cáo/ }).click();
	await page.locator('.ant-message-notice').first().waitFor({ timeout: 6_000 }).catch(() => {});
	await page.waitForTimeout(1_500);
	page.off('request', dem);
	return { tb: chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | ')), n, urls };
}

test('16_060_001 — Màn Báo cáo hàng ký gửi mở được và nêu rõ là số quản trị', async ({ page }) => {
	chanNeuTat('16_060_001');
	const b = await moMan(page);
	const meta = b?.extraData?.meta || {};
	const t = chuan(await banner(page).innerText());
	ghi(`nhãn: ${t} · meta ${JSON.stringify(meta).slice(0, 300)}`);
	await expect(khung(page).locator('.ant-page-header-heading-title')).toHaveText('Báo cáo hàng ký gửi');
	expect(t).toMatch(/quản trị/i);
	expect(t).toMatch(/Không dùng thay biên bản đối soát/);
	expect(t, 'Nhãn không nêu thời điểm dữ liệu đã cập nhật tới').toMatch(/\d{2}:\d{2}/);
});

test('16_060_002 — Nhãn chuyển đỏ khi dữ liệu trễ quá ngưỡng', async ({ page }) => {
	chanNeuTat('16_060_002');
	// Không điều khiển được độ trễ DW ⇒ giữ nguyên response thật, chỉ đặt cờ trễ trong `meta` để kiểm cách FE hiển thị.
	await page.route(/consignment-report\/nxt\?/, async (route) => {
		const res = await route.fetch();
		const b = await res.json();
		b.extraData = { ...(b.extraData || {}), meta: { ...(b.extraData?.meta || {}), delayWarning: true, delayMinutes: 47, inSync: false } };
		return route.fulfill({ response: res, json: b });
	});
	test.info().annotations.push({ type: 'giả lập', description: 'Đặt meta.delayWarning=true, delayMinutes=47 trên response NXT thật.' });
	await moMan(page);
	await expect(banner(page)).toHaveClass(/ant-alert-error/);
	await expect(banner(page)).toContainText('Dữ liệu kho đang chậm 47 phút so với hệ thống gốc');
});

test('16_060_006 — Bỏ trống khoảng thời gian bị chặn', async ({ page }) => {
	chanNeuTat('16_060_006');
	await moMan(page);
	const o = khung(page).locator('.ant-picker-range input');
	const truoc = await o.evaluateAll((l) => l.map((e) => e.value));
	await o.nth(0).click();
	await o.nth(0).press('ControlOrMeta+a');
	await o.nth(0).press('Backspace');
	await o.nth(1).click();
	await o.nth(1).press('ControlOrMeta+a');
	await o.nth(1).press('Backspace');
	await page.locator('.ant-page-header-heading-title').first().click();
	const sau = await o.evaluateAll((l) => l.map((e) => e.value));
	const coX = await khung(page).locator('.ant-picker-range .ant-picker-clear').count();
	ghi(`trước ${truoc.join(' → ')} · sau khi xoá ${sau.join(' → ')} · nút xoá (x): ${coX}`);
	test.skip(sau.every(Boolean), `Không tạo được tiền đề: ô "Khoảng thời gian" khai allowClear={false}, xoá chữ thì tự trả lại ${sau.join(' → ')} ⇒ nhánh "Vui lòng chọn khoảng thời gian" không tới được từ giao diện.`);
	const { tb, n, urls } = await bamXem(page);
	const q = urls[0] ? new URL(urls[0]).searchParams : null;
	ghi(`bấm Xem: thông báo "${tb}" · request ${n} ${q ? `fromDate=${q.get('fromDate')} toDate=${q.get('toDate')}` : ''}`);
	test.skip(Boolean(q?.get('fromDate') && q?.get('toDate')), `Không tạo được tiền đề: ô khai allowClear={false}; xoá chữ trong ô chỉ làm TRỐNG HIỂN THỊ, giá trị vẫn giữ (request gửi fromDate=${q?.get('fromDate')} toDate=${q?.get('toDate')}) ⇒ nhánh "Vui lòng chọn khoảng thời gian" không tới được.`);
	expect(tb).toContain('Vui lòng chọn khoảng thời gian');
	expect(n).toBe(0);
});

test('16_060_007 — Từ ngày lớn hơn Đến ngày bị chặn', async ({ page }) => {
	chanNeuTat('16_060_007');
	await moMan(page);
	const o = khung(page).locator('.ant-picker-range input');
	await o.nth(0).click();
	await o.nth(0).press('ControlOrMeta+a');
	await o.nth(0).fill('20/09/2026');
	await o.nth(0).press('Enter');
	await o.nth(1).press('ControlOrMeta+a');
	await o.nth(1).fill('10/09/2026');
	await o.nth(1).press('Enter');
	await page.locator('.ant-page-header-heading-title').first().click();
	const v = await o.evaluateAll((l) => l.map((e) => e.value));
	ghi(`sau khi gõ 20/09 → 10/09: ${v.join(' → ')}`);
	const dao = (s) => s.split('/').reverse().join('');
	test.skip(!(v[0] && v[1] && dao(v[0]) > dao(v[1])), `Không tạo được tiền đề: RangePicker không nhận "Từ ngày" > "Đến ngày" (còn ${v.join(' → ')}) ⇒ cảnh báo của validate() không tới được từ giao diện.`);
	const { tb, n } = await bamXem(page);
	expect(tb).toContain('"Từ ngày" phải nhỏ hơn hoặc bằng "Đến ngày"');
	expect(n).toBe(0);
});

test('16_060_009 — Không xác định được chuỗi thì chặn xem báo cáo', async () => {
	chanNeuTat('16_060_009');
	test.skip(true, 'Không có tài khoản thiếu chainId: mọi vai đăng nhập đều mang chainId của chuỗi (useActiveScope). Nhánh validate() "Không xác định được chuỗi (chainId)" chỉ tới được khi sửa state ứng dụng — không phải hành vi người dùng.');
});
