'use strict';

/**
 * Bốn case bổ sung 20/09/2026 của phân hệ 13 — công nợ Điểm bán ↔ Tỉnh.
 *
 * 🔴 Hub công nợ là `/debt-reconciliation/remittance`, mở đúng khung con bằng `?tab=<key>`
 * (hàm `moKhungCon` trong `shared/auth/login.js` xử lý, kể cả khi tab bị thu vào nút `...`).
 *
 * 🔴 Cả file 🚫 KHÔNG ghi: đối soát và thu hồi công nợ là **tiền thật**.
 */

const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const DOC_DIR = path.join(__dirname, '..');
const HUB = '/debt-reconciliation/remittance';
const VAI = 'province';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const dong = (page) => khung(page).locator('.ant-table-tbody tr.ant-table-row');

function chanNeuTat(id, vai = VAI) {
	const thieuVai = missingRoleReason(vai);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(DOC_DIR, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
}

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/remittance|debt|settlement/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

/** Mở một tab của hub công nợ. */
async function moTab(page, tab, vai = VAI) {
	await moTrang(page, `${HUB}?tab=${tab}`, vai);
	await page.waitForTimeout(5_000);
	return khung(page);
}

test('CNDB-KY-011 — Phân trang và trạng thái rỗng của bảng đối soát', async ({ page }) => {
	chanNeuTat('CNDB-KY-011');
	await chanGhi(page);
	const box = await moTab(page, 'pos-settlement');

	const so = await dong(page).count();
	if (so === 0) {
		await expect(
			box.locator('.ant-empty'),
			'Bảng đối soát rỗng mà không hiện trạng thái rỗng',
		).toBeVisible();
		test.skip(true, 'Kỳ hiện tại chưa có điểm bán nào trong bảng đối soát để kiểm phân trang.');
	}

	// 🔴 Tổng kỳ tính trên TOÀN KỲ, 🚫 không trên trang đang xem ⇒ đổi trang thì tổng KHÔNG đổi.
	const doTong = async () => {
		const t = chuan(await box.innerText());
		return (t.match(/[\d.,]{4,}/g) || []).slice(0, 5).join('|');
	};
	const tongTruoc = await doTong();
	const trang2 = box.locator('.ant-pagination-item[title="2"]');
	if ((await trang2.count()) === 0) {
		test.skip(true, `Bảng đối soát chỉ có ${so} dòng — chưa đủ hai trang.`);
	}

	const dongTruoc = await dong(page).allInnerTexts();
	await trang2.click();
	await page.waitForTimeout(3_000);
	const dongSau = await dong(page).allInnerTexts();

	expect(dongSau.some((d) => dongTruoc.includes(d)), 'Trang 2 lặp dòng của trang 1').toBe(false);
	expect(await doTong(), 'Tổng kỳ ĐỔI khi chuyển trang — tổng đang tính trên trang, không trên kỳ').toBe(
		tongTruoc,
	);
});

test('CNDB-KY-012 — Tìm điểm bán trong bảng đối soát theo mã và tên', async ({ page }) => {
	chanNeuTat('CNDB-KY-012');
	await chanGhi(page);
	const box = await moTab(page, 'pos-settlement');

	if ((await dong(page).count()) === 0) {
		test.skip(true, 'Kỳ hiện tại chưa có điểm bán nào trong bảng đối soát để tìm.');
	}
	const o = box.locator('input[placeholder]').first();
	if ((await o.count()) === 0) test.skip(true, 'Bảng đối soát không có ô tìm kiếm.');

	const hangDau = chuan(await dong(page).first().innerText());
	const tuKhoa = hangDau.split(' ').filter((t) => t.length > 3)[0];
	if (!tuKhoa) test.skip(true, 'Không tách được từ khoá từ dòng đầu.');

	await o.fill(tuKhoa);
	await o.press('Enter');
	await page.waitForTimeout(3_000);
	expect(
		await dong(page).count(),
		`Tìm "${tuKhoa}" lấy từ chính bảng mà ra 0 dòng`,
	).toBeGreaterThan(0);

	await o.fill('zzzkhongtontai999');
	await o.press('Enter');
	await page.waitForTimeout(3_000);
	expect(await dong(page).count(), 'Từ khoá không tồn tại mà bảng vẫn có dòng').toBe(0);
});

test('CNDB-LPB-002 — Tong con treo cong tri tuyet doi khong trieu tieu am duong', async ({
	page,
}) => {
	chanNeuTat('CNDB-LPB-002');
	await chanGhi(page);

	// 🔴 Đối chiếu SỐ TRÊN MÀN với chính API `.../lpb/shortage/total` — 🚫 không tự cộng lại từ bảng.
	let tongApi = null;
	page.on('response', async (r) => {
		if (!/lpb\/shortage\/total/.test(r.url())) return;
		try {
			const j = await r.json();
			tongApi = j?.data ?? j?.data?.total ?? null;
		} catch {
			/* bỏ qua */
		}
	});

	// 🔴 Hub công nợ có ĐÚNG 9 tab (đo 20/09/2026): dashboard · shift-variance · cash-remittance ·
	//    daily-closing · province-cash-inflow · pos-settlement · opening-debt · cash-voucher ·
	//    report. 🚫 KHÔNG có tab nào cho khoản treo LPB.
	const box = await moTab(page, 'dashboard');
	await page.waitForTimeout(5_000);

	if (tongApi === null) {
		const tab = await page
			.locator('.ant-tabs-tab')
			.evaluateAll((l) => l.map((e) => e.getAttribute('data-node-key')));
		test.skip(
			true,
			'🔴 Không tìm thấy màn "khoản treo LPB": hub công nợ 🚫 không có tab nào gọi ' +
				`\`.../lpb/shortage/total\`. Tab đang có: ${tab.join(' · ')}. ` +
				'Cần user chỉ đúng lối vào, 🚫 không đoán.',
		);
	}
	expect(
		Number(tongApi),
		'Tổng còn treo phải là tổng TRỊ TUYỆT ĐỐI ⇒ 🚫 không thể âm',
	).toBeGreaterThanOrEqual(0);
});

test('CNDB-PQ-003 — Vai Tổng công ty xem được phạm vi rộng hơn vai Tỉnh', async ({ browser }) => {
	chanNeuTat('CNDB-PQ-003', 'tct');
	const thieuTinh = missingRoleReason('province');
	test.skip(Boolean(thieuTinh), thieuTinh ?? '');

	/** Đếm số dòng bảng đối soát bằng một vai. */
	const dem = async (vai) => {
		const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
		const p = await ctx.newPage();
		await p.route('**/*', async (route) => {
			const req = route.request();
			if (req.method() === 'GET') return route.continue();
			if (!/remittance|debt|settlement/i.test(req.url())) return route.continue();
			await route.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
		});
		await moTrang(p, `${HUB}?tab=pos-settlement`, vai);
		await p.waitForTimeout(6_000);
		const n = await p.locator('.ant-table-tbody tr.ant-table-row').count();
		const noi = chuan(await p.locator('.ant-pro-page-container, main').first().innerText());
		await ctx.close();
		return { n, noi };
	};

	const tct = await dem('tct');
	const tinh = await dem('province');

	test.info().annotations.push({
		type: 'phạm vi đo được',
		description: `tct: ${tct.n} dòng · province: ${tinh.n} dòng`,
	});

	// 🔴 Đo 20/09/2026: vai `tct` mở hub công nợ ra câu **"Tài khoản của bạn chưa được cấp chức
	//    năng nào trong nghiệp vụ này"** — 0 tab, 0 bảng. Đó là **cấu hình quyền của tài khoản**,
	//    🚫 không phải phạm vi dữ liệu ⇒ skip kèm lý do thay vì báo đỏ oan cho sản phẩm.
	if (/chưa được cấp chức năng/i.test(tct.noi)) {
		test.skip(
			true,
			'Tài khoản vai `tct` CHƯA được cấp chức năng nào trong nghiệp vụ công nợ ' +
				`(màn báo: "${tct.noi.slice(0, 90)}") ⇒ 🚫 không so được phạm vi với vai tỉnh. ` +
				'Cần user cấp quyền cho tài khoản tct rồi chạy lại.',
		);
	}

	if (tct.n === 0 && tinh.n === 0) {
		test.skip(
			true,
			'Cả hai vai đều thấy 0 dòng ⇒ 🚫 không kết luận được gì về phạm vi. Cần kỳ đối soát có dữ liệu.',
		);
	}
	// 🔴 Thiếu filter phạm vi thì backend trả TOÀN BỘ pod, 🚫 không phải rỗng ⇒ phải so CON SỐ.
	expect(
		tct.n,
		`Vai tct thấy ${tct.n} dòng, vai province thấy ${tinh.n} dòng — TCT phải thấy phạm vi rộng hơn ` +
			'hoặc bằng. Nhỏ hơn nghĩa là phạm vi đang bị cắt sai.',
	).toBeGreaterThanOrEqual(tinh.n);
});
