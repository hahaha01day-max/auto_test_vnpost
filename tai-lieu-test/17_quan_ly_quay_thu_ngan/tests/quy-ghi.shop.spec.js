'use strict';

/**
 * Phân hệ 17 — Quản lý quỹ: cấp quỹ + chuyển quỹ (vai `shop`, điểm bán seed của làn).
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): `FundPage.jsx` · `TableFundData.jsx` · `DrawerFundDetail.jsx`
 * (nút "Cấp quỹ" ở footer, 4 thẻ số liệu từ `GET /fund/fund-total`) · `ModalAddFundHistory.jsx` ·
 * `ModalTransferFund.jsx` (5 ô: Quỹ chuyển · Loại quỹ chuyển · Quỹ nhận · Loại quỹ nhận · Số tiền
 * chuyển; validator trùng quỹ + "Số tiền phải lớn hơn 0") · `SelectFund.jsx` (nhãn = tên quỹ) ·
 * `SelectFundPaymentType.jsx` (nhãn "Tiền mặt" / "Ngân hàng").
 *
 * 🔴 Tiền ở đây là tiền mặt sổ quỹ của điểm bán SEED. Mỗi case tự dựng quầy test mới ⇒ quỹ rỗng
 *    riêng, cấp tiền bằng API, và NGỪNG quầy ở `finally` (quỹ bị khoá theo).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const q = require('./quay-ghi');

const GOC = path.join(__dirname, '..');
const { chuan, khung, dong } = q;

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const oCua = (page, box, nhan) =>
	box.locator('.ant-form-item').filter({ has: page.locator(`label:text-is("${nhan}")`) });
const loiCua = (page, box, nhan) => oCua(page, box, nhan).locator('.ant-form-item-explain-error');
const bamOk = (box) => box.getByRole('button', { name: /OK|Đồng ý|Xác nhận/ }).last().click();

test.describe('17 — Quản lý quỹ: cấp quỹ / chuyển quỹ (ghi thật)', () => {
	test.describe.configure({ timeout: 180_000 });

	let ctx;
	const taoRa = [];

	test.beforeEach(async ({ page }) => {
		ctx = await q.moQuy(page);
	});

	test.afterEach(async ({ page }) => {
		if (taoRa.length && ctx) await q.donQuay(page, ctx.st, ctx.shopId, taoRa.splice(0));
	});

	/** Hai quỹ mới (qua 2 quầy test), quỹ 1 được cấp `cap` đồng. Tải lại màn để Select thấy quỹ mới. */
	async function haiQuy(page, cap = 0) {
		const x = await q.haiQuyMoi(page, ctx.st, ctx.shopId);
		taoRa.push(...x.quay.map((c) => c.counterId));
		if (cap > 0) await q.capQuyApi(page, ctx.st, ctx.shopId, x.quy[0].fundId, cap);
		await q.moQuy(page);
		return x.quy;
	}

	const du = (page, f) => q.soDu(page, ctx.st, ctx.shopId, f.fundId);

	async function dienChuyen(page, box, nguon, nhan, tien) {
		if (nguon) await q.chonQuy(page, box, 'Quỹ chuyển', nguon.name);
		if (nhan) await q.chonQuy(page, box, 'Quỹ nhận', nhan.name);
		if (tien !== undefined) await oCua(page, box, 'Số tiền chuyển').locator('input').first().fill(String(tien));
	}

	test('17_040_001 — Bảng Quản lý quỹ phân biệt quỹ quầy và quỹ chung', async ({ page }) => {
		chanNeuTat('17_040_001');
		let ds = await q.dsQuy(page, ctx.st, ctx.shopId);
		if (!ds.some((f) => !f.counterId)) {
			// Điểm bán seed chưa có quỹ chung ⇒ dựng 1 (idempotent theo tên, 🚫 không xoá được).
			const b = await q.k.goiGhi(page, ctx.st, 'POST', '/fund/create', {}, {
				shopId: ctx.shopId,
				name: `${q.TIEN_TO} Quỹ chung điểm bán`,
				fundType: 'CASH',
			});
			expect(String(b?.status?.code), `Tạo quỹ chung lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
			await q.moQuy(page);
			ds = await q.dsQuy(page, ctx.st, ctx.shopId);
		}
		const chung = ds.find((f) => !f.counterId);
		const quay = ds.find((f) => f.counterId);
		expect(quay, 'Điểm bán không có quỹ quầy nào').toBeTruthy();
		const counters = await q.dsQuay(page, ctx.st, ctx.shopId);
		const c = counters.find((x) => x.counterId === quay.counterId);
		const rowQuay = dong(page).filter({ hasText: quay.name }).first();
		const rowChung = dong(page).filter({ hasText: chung.name }).first();
		await expect(rowQuay.locator('td').nth(2)).toHaveText(`${c.name} (${c.code})`);
		await expect(rowChung.locator('td').nth(2)).toHaveText(/^[—-]$/);
	});

	test('17_040_002 — Cấp tiền cho quỹ của quầy', async ({ page }) => {
		chanNeuTat('17_040_002');
		const [f1] = await haiQuy(page);
		const truoc = await du(page, f1);
		const row = dong(page).filter({ hasText: f1.name }).first();
		await row.getByRole('button', { name: f1.name }).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thông tin chi tiết quỹ' });
		await dr.getByRole('button', { name: 'Cấp quỹ' }).click();
		const box = page.getByRole('dialog').filter({ hasText: 'Cấp quỹ' }).last();
		await oCua(page, box, 'Số tiền cấp quỹ').locator('input').fill('250000');
		await oCua(page, box, 'Nội dung cấp').locator('textarea').fill(`${q.TIEN_TO} auto test cấp quỹ UI`);
		const cho = page.waitForResponse((r) => r.url().includes('/fund/add-history'));
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		expect(tb).toContain('Thêm thành công');
		expect(await du(page, f1)).toBe(truoc + 250000);
	});

	test('17_040_003 — Quầy đã ngừng thì sổ quỹ bị khoá', async ({ page }) => {
		chanNeuTat('17_040_003');
		const [f1] = await haiQuy(page);
		await q.ngungQuayApi(page, ctx.st, ctx.shopId, f1.counterId);
		await q.moQuy(page);
		await expect(dong(page).filter({ hasText: f1.name }), 'Quỹ của quầy đã ngừng vẫn hiện để cấp tiền').toHaveCount(0);
		const truoc = await du(page, f1);
		const b = await q.k.goiGhi(page, ctx.st, 'POST', '/fund/add-history', {}, {
			shopId: ctx.shopId, fundId: f1.fundId, money: 1000, content: `${q.TIEN_TO} thử cấp quỹ đã khoá`,
			type: 'GRANT', provideTime: Date.now(), moneyType: 'CASH',
		});
		expect(await du(page, f1), `Cấp tiền vào quỹ ĐÃ KHOÁ vẫn làm tăng số dư (BE trả ${JSON.stringify(b?.status)})`).toBe(truoc);
		expect(String(b?.status?.code), 'BE nhận cấp quỹ vào sổ quỹ đã khoá').not.toBe('200');
	});

	test('17_040_004 — Bảng quỹ đọc từ API fund-total và get-all', async ({ page }) => {
		chanNeuTat('17_040_004');
		const url = [];
		page.on('request', (r) => {
			if (/\/fund\//.test(r.url())) url.push(r.url());
		});
		const choDs = page.waitForResponse((r) => r.url().includes('/fund/get-all') && r.status() === 200);
		await q.moQuy(page);
		await choDs;
		const ds = await q.dsQuy(page, ctx.st, ctx.shopId);
		expect(ds.length).toBeGreaterThan(0);
		const choTong = page.waitForResponse((r) => r.url().includes('/fund/fund-total'), { timeout: 30_000 });
		await dong(page).first().locator('td').nth(1).getByRole('button').click();
		expect((await choTong).status()).toBe(200);
		const ga = url.filter((u) => /\/fund\/(get-all|fund-total)/.test(u));
		expect(ga.some((u) => u.includes('/__api/fund/get-all'))).toBe(true);
		expect(ga.some((u) => u.includes('/__api/fund/fund-total'))).toBe(true);
		for (const u of ga) expect(u, 'API quỹ mang prefix service').toMatch(/\/__api\/fund\//);
	});

	test('17_050_001 — Chuyển tiền giữa hai quỹ cùng điểm bán', async ({ page }) => {
		chanNeuTat('17_050_001');
		const [f1, f2] = await haiQuy(page, 100000);
		const [a1, a2] = [await du(page, f1), await du(page, f2)];
		const box = await q.moChuyenQuy(page);
		await dienChuyen(page, box, f1, f2, 30000);
		const cho = page.waitForResponse((r) => r.url().includes('/fund/transfer'));
		await bamOk(box);
		expect(String((await (await cho).json())?.status?.code)).toBe('200');
		expect(await du(page, f1)).toBe(a1 - 30000);
		expect(await du(page, f2)).toBe(a2 + 30000);
	});

	test('17_050_002 — Chặn chuyển quá số dư thực có', async ({ page }) => {
		chanNeuTat('17_050_002');
		const [f1, f2] = await haiQuy(page, 100000);
		const [a1, a2] = [await du(page, f1), await du(page, f2)];
		expect(a1).toBe(100000);
		const box = await q.moChuyenQuy(page);
		await dienChuyen(page, box, f1, f2, 200000);
		const cho = page.waitForResponse((r) => r.url().includes('/fund/transfer'), { timeout: 15_000 }).catch(() => null);
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		const res = await cho;
		const body = res ? await res.json().catch(() => null) : null;
		const [b1, b2] = [await du(page, f1), await du(page, f2)];
		test.info().annotations.push({ type: 'hành vi thật', description: `BE ${JSON.stringify(body?.status)} · "${tb}" · số dư ${b1}/${b2}` });
		expect([b1, b2], `Chuyển 200.000 từ quỹ còn 100.000 KHÔNG bị chặn — quỹ nguồn âm (${b1}) · "${tb}"`).toEqual([a1, a2]);
	});

	test('17_050_013 — Chặn chuyển quá số dư thực có', async ({ page }) => {
		chanNeuTat('17_050_013');
		const [f1, f2] = await haiQuy(page, 100000);
		const [a1, a2] = [await du(page, f1), await du(page, f2)];
		expect(a1).toBe(100000);
		const box = await q.moChuyenQuy(page);
		await dienChuyen(page, box, f1, f2, 200000);
		const cho = page.waitForResponse((r) => r.url().includes('/fund/transfer'), { timeout: 15_000 }).catch(() => null);
		const tb = await q.thongBaoSau(page, () => bamOk(box));
		const res = await cho;
		const body = res ? await res.json().catch(() => null) : null;
		const [b1, b2] = [await du(page, f1), await du(page, f2)];
		test.info().annotations.push({ type: 'hành vi thật', description: `BE ${JSON.stringify(body?.status)} · "${tb}" · số dư ${b1}/${b2}` });
		expect([b1, b2], `Chuyển 200.000 từ quỹ còn 100.000 KHÔNG bị chặn — quỹ nguồn âm (${b1}) · "${tb}"`).toEqual([a1, a2]);
	});

	test('17_050_004 — Chặn chuyển quỹ khi Quỹ chuyển trùng Quỹ nhận', async ({ page }) => {
		chanNeuTat('17_050_004');
		const [f1] = await haiQuy(page, 50000);
		const truoc = await du(page, f1);
		const ghi = q.demGhi(page, /\/fund\/transfer/);
		const box = await q.moChuyenQuy(page);
		await dienChuyen(page, box, f1, f1, 10000);
		await bamOk(box);
		await expect(loiCua(page, box, 'Quỹ nhận').or(loiCua(page, box, 'Quỹ chuyển')).first()).toHaveText(
			'Quỹ chuyển và quỹ nhận không được trùng nhau',
		);
		expect(ghi).toEqual([]);
		expect(await du(page, f1)).toBe(truoc);
	});

	test('17_050_014 — Chặn chuyển quỹ khi Quỹ chuyển trùng Quỹ nhận', async ({ page }) => {
		chanNeuTat('17_050_014');
		const [f1] = await haiQuy(page, 50000);
		const truoc = await du(page, f1);
		const ghi = q.demGhi(page, /\/fund\/transfer/);
		const box = await q.moChuyenQuy(page);
		await dienChuyen(page, box, f1, f1, 10000);
		await bamOk(box);
		await expect(loiCua(page, box, 'Quỹ nhận').or(loiCua(page, box, 'Quỹ chuyển')).first()).toHaveText(
			'Quỹ chuyển và quỹ nhận không được trùng nhau',
		);
		expect(ghi).toEqual([]);
		expect(await du(page, f1)).toBe(truoc);
	});

	test('17_050_005 — Chặn chuyển quỹ với số tiền bằng 0', async ({ page }) => {
		chanNeuTat('17_050_005');
		const [f1, f2] = await haiQuy(page, 50000);
		const ghi = q.demGhi(page, /\/fund\/transfer/);
		const box = await q.moChuyenQuy(page);
		await dienChuyen(page, box, f1, f2, 0);
		await bamOk(box);
		await expect(loiCua(page, box, 'Số tiền chuyển')).toHaveText('Số tiền phải lớn hơn 0');
		expect(ghi).toEqual([]);
	});

	test('17_050_006 — Số tiền chuyển bằng 0 hoặc âm bị chặn', async ({ page }) => {
		chanNeuTat('17_050_006');
		const [f1, f2] = await haiQuy(page, 50000);
		const [a1, a2] = [await du(page, f1), await du(page, f2)];
		const ghi = q.demGhi(page, /\/fund\/transfer/);
		const box = await q.moChuyenQuy(page);
		const o = oCua(page, box, 'Số tiền chuyển').locator('input').first();
		await dienChuyen(page, box, f1, f2);
		for (const v of ['0', '-1000']) {
			await o.fill(v);
			await o.blur();
			const hien = await o.inputValue();
			await bamOk(box);
			await expect(loiCua(page, box, 'Số tiền chuyển'), `Nhập ${v} (ô hiện "${hien}") mà không báo lỗi`).toHaveText(
				/Số tiền phải lớn hơn 0|Vui lòng nhập số tiền chuyển/,
			);
			test.info().annotations.push({ type: 'thông báo thật', description: `${v} → ô "${hien}" · lỗi "${chuan(await loiCua(page, box, 'Số tiền chuyển').innerText())}"` });
		}
		expect(ghi).toEqual([]);
		expect([await du(page, f1), await du(page, f2)]).toEqual([a1, a2]);
	});

	test('17_050_012 — Số tiền chuyển bằng 0 hoặc âm bị chặn', async ({ page }) => {
		chanNeuTat('17_050_012');
		const [f1, f2] = await haiQuy(page, 50000);
		const [a1, a2] = [await du(page, f1), await du(page, f2)];
		const ghi = q.demGhi(page, /\/fund\/transfer/);
		const box = await q.moChuyenQuy(page);
		const o = oCua(page, box, 'Số tiền chuyển').locator('input').first();
		await dienChuyen(page, box, f1, f2);
		for (const v of ['0', '-1000']) {
			await o.fill(v);
			await o.blur();
			const hien = await o.inputValue();
			await bamOk(box);
			await expect(loiCua(page, box, 'Số tiền chuyển'), `Nhập ${v} (ô hiện "${hien}") mà không báo lỗi`).toHaveText(
				/Số tiền phải lớn hơn 0|Vui lòng nhập số tiền chuyển/,
			);
			test.info().annotations.push({ type: 'thông báo thật', description: `${v} → ô "${hien}" · lỗi "${chuan(await loiCua(page, box, 'Số tiền chuyển').innerText())}"` });
		}
		expect(ghi).toEqual([]);
		expect([await du(page, f1), await du(page, f2)]).toEqual([a1, a2]);
	});

	test('17_050_007 — Chọn Loại quỹ Chuyển khoản thì hiện ô chọn ngân hàng', async ({ page }) => {
		chanNeuTat('17_050_007');
		const box = await q.moChuyenQuy(page);
		const loai = oCua(page, box, 'Loại quỹ chuyển');
		await expect(loai.locator('.ant-select-content, .ant-select-selection-item').first()).toHaveText('Tiền mặt');
		const soOTruoc = await box.locator('.ant-form-item').count();
		await loai.locator('.ant-select').click();
		const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
		const nhan = (await dd.locator('.ant-select-item-option').allInnerTexts()).map(chuan);
		await dd.locator('.ant-select-item-option').nth(1).click();
		await expect(box.locator('.ant-form-item')).toHaveCount(soOTruoc + 1);
		await expect(loai.locator('xpath=following-sibling::*[1]').locator('.ant-select')).toBeVisible();
		expect(nhan, `Nhãn loại quỹ đang có: ${nhan.join(' · ')}`).toContain('Chuyển khoản');
	});

	test('17_050_008 — Chặn khi chọn Chuyển khoản mà bỏ trống ngân hàng', async ({ page }) => {
		chanNeuTat('17_050_008');
		const [f1, f2] = await haiQuy(page, 50000);
		const ghi = q.demGhi(page, /\/fund\/transfer/);
		const box = await q.moChuyenQuy(page);
		await dienChuyen(page, box, f1, f2, 10000);
		await oCua(page, box, 'Loại quỹ chuyển').locator('.ant-select').click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').nth(1).click();
		await bamOk(box);
		await expect(box.locator('.ant-form-item-explain-error').filter({ hasText: 'Vui lòng chọn ngân hàng chuyển' })).toBeVisible();
		expect(ghi).toEqual([]);
	});

	test('17_050_009 — Ô Số tiền chuyển tự chấm phân cách hàng nghìn', async ({ page }) => {
		chanNeuTat('17_050_009');
		const [f1, f2] = await haiQuy(page, 2000000);
		const box = await q.moChuyenQuy(page);
		await dienChuyen(page, box, f1, f2);
		const o = oCua(page, box, 'Số tiền chuyển').locator('input').first();
		await o.fill('');
		await o.pressSequentially('1500000');
		await o.blur();
		await expect(o).toHaveValue('1.500.000');
		const cho = page.waitForRequest((r) => r.url().includes('/fund/transfer'));
		await bamOk(box);
		expect(Number((await cho).postDataJSON()?.money)).toBe(1500000);
	});

	test('17_050_010 — Chuyển quỹ hiện đủ năm trường bắt buộc', async ({ page }) => {
		chanNeuTat('17_050_010');
		const box = await q.moChuyenQuy(page);
		for (const n of ['Quỹ chuyển', 'Loại quỹ chuyển', 'Quỹ nhận', 'Loại quỹ nhận', 'Số tiền chuyển']) {
			await expect(box.locator(`label.ant-form-item-required:text-is("${n}")`), `Thiếu ô bắt buộc "${n}"`).toBeVisible();
		}
	});

	test('17_050_011 — Bỏ trống từng trường của Chuyển quỹ bị chặn', async ({ page }) => {
		chanNeuTat('17_050_011');
		const [f1, f2] = await haiQuy(page, 50000);
		const ghi = q.demGhi(page, /\/fund\/transfer/);
		const loi = {
			'Quỹ chuyển': 'Vui lòng chọn quỹ chuyển',
			'Loại quỹ chuyển': 'Vui lòng chọn loại quỹ',
			'Quỹ nhận': 'Vui lòng chọn quỹ nhận',
			'Loại quỹ nhận': 'Vui lòng chọn loại quỹ',
			'Số tiền chuyển': 'Vui lòng nhập số tiền chuyển',
		};
		for (const [bo, tb] of Object.entries(loi)) {
			const box = await q.moChuyenQuy(page);
			await dienChuyen(page, box, bo === 'Quỹ chuyển' ? null : f1, bo === 'Quỹ nhận' ? null : f2, bo === 'Số tiền chuyển' ? undefined : 10000);
			if (bo.startsWith('Loại')) {
				const s = oCua(page, box, bo).locator('.ant-select');
				await s.hover();
				await s.locator('.ant-select-clear').click();
			}
			await bamOk(box);
			await expect(loiCua(page, box, bo), `Bỏ trống "${bo}" mà ô không báo lỗi`).toHaveText(tb);
			for (const khac of Object.keys(loi).filter((x) => x !== bo)) {
				await expect(loiCua(page, box, khac), `Bỏ trống "${bo}" mà ô "${khac}" cũng báo lỗi`).toHaveCount(0);
			}
			// Ô tiền (InputCurrency) bật hộp gợi ý số tiền đè lên footer ⇒ đóng modal bằng Esc
			// (Esc lần 1 có thể chỉ đóng hộp gợi ý).
			await page.keyboard.press('Escape');
			if (await box.isVisible()) await page.keyboard.press('Escape');
			await expect(box).toBeHidden();
		}
		expect(ghi).toEqual([]);
	});

	test('17_030_003 — Ngừng quầy khi còn ca chưa chốt bị chặn', async ({ page }) => {
		chanNeuTat('17_030_003');
		// Quầy có ca chưa chốt: `GET /timekeeping/shift-report/unclosed` (FE `shiftReportApi.getUnclosedShifts`).
		const b = await q.k.goiGhi(page, ctx.st, 'GET', '/timekeeping/shift-report/unclosed', { shopId: ctx.shopId, allUsers: true });
		const ds = Array.isArray(b?.data) ? b.data : b?.data?.content || [];
		const counterId = ds.find((x) => x.counterId)?.counterId;
		test.skip(!counterId, `Điểm bán seed không có ca chưa chốt nào gắn quầy (unclosed → ${JSON.stringify(b?.status)}, ${ds.length} ca).`);
		const r = await q.ngungQuayApi(page, ctx.st, ctx.shopId, counterId);
		if (String(r?.status?.code) === '200') {
			await q.suaQuayApi(page, ctx.st, { counterId, shopId: ctx.shopId, active: true });
		}
		expect(q.boMa(r?.status?.message)).toBe('Quầy đang có ca chưa chốt, vui lòng chốt ca trước');
	});
});
