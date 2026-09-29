'use strict';

/**
 * 13_3 · 040 — "Phiếu nhập hàng từ NCC thuộc TCT" (đơn giao thẳng NCC → tỉnh), vai `province`.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/purchaseOrder/pages/{DirectDeliveryPendingListPage,
 * DirectDeliveryPendingDetailPage}.jsx`. Đơn tiền đề dựng trọn chuỗi bằng `giao-thang-ghi.js`
 * (CHT → xã duyệt → tỉnh gửi TCT → TCT duyệt + tạo PO kho TCT / nhận HUB tỉnh → Gửi NCC → NCC xác nhận).
 * Kịch bản có 2 bộ mã trùng nội dung (040_001–010 sheet NCC, 040_011–020 sheet FUNC) ⇒ `cap` dùng chung phép kiểm.
 * 🔴 Xác nhận = nhập kho TCT + chuyển kho về tỉnh THẬT (user cho phép đụng kho TCT 24/09/2026).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const dx = require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi');
const seed = require('../../00_seed/seed-state');
const gt = require('./giao-thang-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 700) });
const hubId = () => seed.doc().duLieu.hubTinh.shopId;

/** Lô của SP ở kho HUB tỉnh (đọc bằng phiên phụ tỉnh). */
async function loHub(browser, productId, variantId) {
	const p = await k.moPhienPhu(browser, 'province', '/inventory/purchase-request');
	try {
		const b = await k.goiGhi(p.page, p.st, 'GET', '/stock/v2/batch-product', { shopId: hubId(), productId, variantId, size: 500 });
		return b.data || [];
	} finally { await p.dong(); }
}

test.describe('13_3 · 040 đơn giao thẳng NCC → tỉnh', () => {
	const kiem_040_011 = async (page) => {
		const b = await gt.moDsGiaoThang(page);
		const noi = dx.chuan(await page.locator('.ant-pro-page-container').innerText());
		ghi(noi);
		expect(noi).toContain('Đơn giao thẳng cần xác nhận');
		await expect(page.getByPlaceholder('Tìm theo mã PO...')).toBeVisible();
		const cot = (await page.locator('.ant-table-thead th').allInnerTexts()).map(dx.chuan).filter(Boolean);
		for (const c of ['STT', 'Mã phiếu', 'Nhà cung cấp', 'Ngày nhập dự kiến', 'Tổng SL', 'SL nhận', 'Tổng tiền', 'Trạng thái', 'Hành động']) expect(cot, `Thiếu cột "${c}"`).toContain(c);
		for (const i of ['reload', 'setting', 'fullscreen']) await expect(page.locator(`.ant-pro-table-list-toolbar [aria-label="${i}"]`), `Thiếu nút ${i}`).toBeVisible();
		await page.locator('.ant-select').filter({ hasText: /Chờ xác nhận|Tất cả trạng thái/ }).first().click();
		const tt = (await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').allInnerTexts()).map(dx.chuan);
		ghi(`trạng thái: ${tt.join(', ')} · ${b?.page?.total_elements} đơn`);
		expect(tt).toContain('Chờ xác nhận');
		expect.soft(tt, 'QC ghi trạng thái "Xác nhận" — sản phẩm là "Đã xác nhận"').toContain('Xác nhận');
	};
	test('13_3_040_011 — Kiểm tra giao diện', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_011');
		test.setTimeout(600_000);
		await kiem_040_011(page, browser);
	});

	const kiem_040_002 = async (page, browser) => {
		const d = await gt.donGiaoThang(browser, page);
		await gt.moDsGiaoThang(page);
		const cho = page.waitForResponse((r) => /direct-deliver/i.test(r.url()) && r.url().includes(encodeURIComponent(d.maPO).slice(0, 6)), { timeout: 20_000 }).catch(() => null);
		await page.getByPlaceholder('Tìm theo mã PO...').fill(d.maPO);
		await page.getByPlaceholder('Tìm theo mã PO...').press('Enter');
		await cho;
		await page.waitForTimeout(1_000);
		const rows = page.locator('.ant-table-tbody tr.ant-table-row');
		ghi(`${d.maPO}: ${(await rows.allInnerTexts()).map(dx.chuan).join(' | ')}`);
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toContainText(d.maPO);
	};
	test('13_3_040_002 — Tìm kiếm theo mã PO', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_002');
		test.setTimeout(600_000);
		await kiem_040_002(page, browser);
	});
	test('13_3_040_012 — Tìm kiếm theo mã PO', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_012');
		test.setTimeout(600_000);
		await kiem_040_002(page, browser);
	});

	const kiem_040_003 = async (page, browser) => {
		await gt.donGiaoThang(browser, page);
		await gt.moDsGiaoThang(page);
		for (const tt of ['Chờ xác nhận', 'Đã xác nhận']) {
			await page.locator('.ant-pro-page-container .ant-select').filter({ hasText: /xác nhận|Tất cả trạng thái/ }).first().click();
			const cho = page.waitForResponse((r) => /direct-deliver/i.test(r.url()) && r.request().method() === 'GET', { timeout: 20_000 });
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${tt}$`) }).click();
			const ds = (await (await cho).json()).data || [];
			await page.waitForTimeout(800);
			const nhan = (await page.locator('.ant-table-tbody tr.ant-table-row .ant-tag').allInnerTexts()).map(dx.chuan);
			ghi(`${tt}: ${ds.length} đơn · nhãn ${[...new Set(nhan)].join(',')}`);
			expect(nhan.length, `Lọc "${tt}" không ra đơn nào`).toBeGreaterThan(0);
			// Lọc "Đã xác nhận" (DIRECT_RECEIVED) gồm cả đơn nhận đủ lẫn nhận một phần — nhãn dòng tách "Nhận một phần".
			if (tt === 'Chờ xác nhận') for (const x of nhan) expect(x).toBe(tt);
			else for (const x of nhan) expect(x, 'Lọc "Đã xác nhận" lẫn đơn chưa xác nhận').toMatch(/^(Đã xác nhận|Nhận một phần|Đã nhận)$/);
		}
	};
	test('13_3_040_003 — Bộ lọc trạng thái phiếu', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_003');
		test.setTimeout(600_000);
		await kiem_040_003(page, browser);
	});
	test('13_3_040_013 — Bộ lọc trạng thái phiếu', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_013');
		test.setTimeout(600_000);
		await kiem_040_003(page, browser);
	});

	const kiem_040_004 = async (page, browser) => {
		const d = await gt.donGiaoThang(browser, page, { sl: 2 });
		await gt.moChiTietGiaoThang(page, d.maPO);
		await expect(page.getByText('Danh sách sản phẩm').first()).toBeVisible({ timeout: 30_000 });
		const noi = dx.chuan(await page.locator('.ant-pro-page-container').innerText());
		ghi(noi);
		for (const x of ['Thông tin chung', 'Thông tin khác', 'Danh sách sản phẩm', d.maPO, dx.SP().tenSanPham, '120.000']) expect(noi, `Chi tiết thiếu "${x}"`).toContain(x);
	};
	test('13_3_040_004 — Xem chi tiết phiếu PO', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_004');
		test.setTimeout(600_000);
		await kiem_040_004(page, browser);
	});
	test('13_3_040_014 — Xem chi tiết phiếu PO', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_014');
		test.setTimeout(600_000);
		await kiem_040_004(page, browser);
	});

	const kiem_040_005 = async (page, browser) => {
		const d = await gt.donGiaoThang(browser, page, { sl: 2 });
		await gt.moChiTietGiaoThang(page, d.maPO);
		const x = await gt.xacNhanGiaoThang(page);
		ghi(`${d.maPO} · ${x.tb} · ${JSON.stringify(x.res?.data)?.slice(0, 500)}`);
		expect(x.tb).toContain('Đã xác nhận đơn giao thẳng');
		expect(x.res?.data?.status, 'Nhận đủ 2/2 mà PO không sang Đã giao').toBe('COMPLETED');
		const lo = x.gui.items[0].lots[0].batchCode;
		const it = d.luu.body.data.items?.[0] || {};
		const ds = await loHub(browser, it.productId, it.variantId);
		const l = ds.find((b) => b.batchCode === lo);
		ghi(`lô ${lo} ở HUB: ${JSON.stringify(l)?.slice(0, 300)}`);
		expect(l, `Kho HUB tỉnh không có lô ${lo} — hàng chưa chuyển về tỉnh`).toBeTruthy();
		expect(Number(l.remainQuantity)).toBe(2);
		// Chứng từ sinh ra (đo DB 24/09): TCT nhập NCC `DD-<PO>-IN-TCT` + TCT xuất nội bộ `DD-<PO>` · HUB nhập `DD-<PO>-IN`.
		const tim = async (vai, shopId, code) => {
			const p = await k.moPhienPhu(browser, vai, '/inventory/purchase-request');
			try { return (await k.goiGhi(p.page, p.st, 'GET', '/stock/v2/import-export/find', { shopId, code, page: 0, size: 20 })).data || []; } finally { await p.dong(); }
		};
		const tctId = d.luu.body.data.shopId;
		const nhapTct = (await tim('tct', tctId, `DD-${d.maPO}-IN-TCT`)).find((x) => x.code === `DD-${d.maPO}-IN-TCT`);
		const xuatTct = (await tim('tct', tctId, `DD-${d.maPO}`)).find((x) => x.code === `DD-${d.maPO}`);
		const nhapHub = (await tim('province', hubId(), `DD-${d.maPO}-IN`)).find((x) => x.code === `DD-${d.maPO}-IN`);
		ghi(`chứng từ: ${JSON.stringify({ nhapTct: nhapTct?.type, xuatTct: xuatTct?.type, nhapHub: nhapHub?.type })}`);
		expect(nhapTct, 'Không sinh phiếu NHẬP kho TCT từ NCC').toBeTruthy();
		expect(xuatTct, 'Không sinh phiếu XUẤT chuyển kho TCT → tỉnh').toBeTruthy();
		expect(nhapHub, 'Không sinh phiếu NHẬP chuyển kho ở HUB tỉnh').toBeTruthy();
	};
	test('13_3_040_005 — Xác nhận phiếu đặt hàng (nhập kho TCT + chuyển kho về tỉnh)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_005');
		test.setTimeout(600_000);
		await kiem_040_005(page, browser);
	});
	test('13_3_040_015 — Xác nhận phiếu đặt hàng (nhập kho TCT + chuyển kho về tỉnh)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_015');
		test.setTimeout(600_000);
		await kiem_040_005(page, browser);
	});

	const kiem_040_007 = async (page, browser) => {
		const ten = seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.fifo.tenSanPham;
		const d = await gt.donGiaoThang(browser, page, { sl: 2, ten });
		const it = d.luu.body.data.items?.[0] || {};
		const truoc = await loHub(browser, it.productId, it.variantId);
		await gt.moChiTietGiaoThang(page, d.maPO);
		const x = await gt.xacNhanGiaoThang(page);
		expect(x.tb).toContain('Đã xác nhận đơn giao thẳng');
		const lo = x.gui.items[0].lots[0].batchCode;
		const sau = await loHub(browser, it.productId, it.variantId);
		ghi(`${ten}: lô trước ${truoc.length} · sau ${sau.length} · lô mới ${lo}`);
		expect(truoc.find((b) => b.batchCode === lo), 'Lô nhận đã có từ trước — không phải lô mới').toBeFalsy();
		const l = sau.find((b) => b.batchCode === lo);
		expect(l, `FIFO: không ghi nhận lô mới ${lo} ở HUB tỉnh`).toBeTruthy();
		expect(Number(l.remainQuantity)).toBe(2);
		expect(Number(l.price), 'Giá lô mới ≠ giá nhập 60.000').toBe(60000);
	};
	test('13_3_040_007 — Xác nhận phiếu đặt hàng sản phẩm FIFO (ghi nhận lô mới)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_007');
		test.setTimeout(600_000);
		await kiem_040_007(page, browser);
	});
	test('13_3_040_017 — Xác nhận phiếu đặt hàng sản phẩm FIFO (ghi nhận lô mới)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_017');
		test.setTimeout(600_000);
		await kiem_040_007(page, browser);
	});

	const kiem_040_008 = async (page, browser) => {
		const d = await gt.donGiaoThang(browser, page, { sl: 3 });
		await gt.moChiTietGiaoThang(page, d.maPO);
		const x = await gt.xacNhanGiaoThang(page, { slNhan: 2 });
		ghi(`${d.maPO} · ${x.tb} · ${JSON.stringify(x.gui)}`);
		expect(x.tb).toContain('Đã xác nhận đơn giao thẳng');
		expect(x.gui.items[0].receivedQuantity).toBe(2);
		expect(x.res?.data?.status, 'Nhận 2/3 mà PO không sang Giao một phần').toBe('PARTIAL_DELIVERED');
		const it = d.luu.body.data.items?.[0] || {};
		const l = (await loHub(browser, it.productId, it.variantId)).find((b) => b.batchCode === x.gui.items[0].lots[0].batchCode);
		expect(Number(l?.remainQuantity), 'Tồn lô ở HUB ≠ số lượng xác nhận 2').toBe(2);
	};
	test('13_3_040_008 — Xác nhận nhận hàng 1 phần', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_008');
		test.setTimeout(600_000);
		await kiem_040_008(page, browser);
	});
	test('13_3_040_018 — Xác nhận nhận hàng 1 phần', async ({ page, browser }, info) => {
		chanNeuTat('13_3_040_018');
		test.setTimeout(600_000);
		await kiem_040_008(page, browser);
	});

	const kiem_040_006 = async (page, browser) => {
		const ten = seed.doc().duLieu.sanPham.sanPhamTheoGiaVon.mac.tenSanPham;
		const d = await gt.donGiaoThang(browser, page, { sl: 2, ten });
		await gt.moChiTietGiaoThang(page, d.maPO);
		const x = await gt.xacNhanGiaoThang(page);
		expect(x.tb).toContain('Đã xác nhận đơn giao thẳng');
		const p = await k.moPhienPhu(browser, 'province', '/inventory/purchase-request');
		try {
			const ma = `DD-${d.maPO}-IN`;
			const pn = ((await k.goiGhi(p.page, p.st, 'GET', '/stock/v2/import-export/find', { shopId: hubId(), code: ma, page: 0, size: 20 })).data || []).find((y) => y.code === ma);
			expect(pn, `Không thấy phiếu nhập chuyển kho ${ma} ở HUB`).toBeTruthy();
			const id = pn.stockInOutId ?? pn.id;
			const b = await k.goiGhi(p.page, p.st, 'GET', '/stock/v2/import-export/detail/items', { shopId: hubId(), stockInOutId: id, page: 0, size: 50 });
			const dsDong = Array.isArray(b?.data) ? b.data : b?.data?.content || b?.data?.items || [];
			ghi(`${ten} · ${ma} · dòng: ${JSON.stringify(dsDong).slice(0, 600)}`);
			expect(dsDong.length, 'Phiếu nhập HUB không có dòng').toBeGreaterThan(0);
			const it = dsDong[0];
			const n = (v) => Number(v ?? NaN);
			const [preQ, preT, postQ, postT, sl, gia] = [n(it.preQuantity), n(it.preTotalAmount), n(it.postQuantity), n(it.postTotalAmount), n(it.quantity), n(it.price)];
			for (const [k2, v] of Object.entries({ preQuantity: preQ, preTotalAmount: preT, postQuantity: postQ, postTotalAmount: postT })) expect(Number.isFinite(v), `Dòng nhập không ghi ${k2} — không đối chiếu được giá vốn bình quân`).toBe(true);
			expect(postQ, 'Tồn sau nhập ≠ tồn trước + SL nhận').toBeCloseTo(preQ + sl, 4);
			expect(postT, 'Giá trị tồn sau nhập ≠ trước + SL × đơn giá (không tính lại giá vốn)').toBeCloseTo(preT + sl * gia, 0);
			const macMoi = postT / postQ;
			ghi(`MAC trước ${preQ ? (preT / preQ).toFixed(2) : '—'} → sau ${macMoi.toFixed(2)} (nhập ${sl} × ${gia})`);
		} finally { await p.dong(); }
	};
	test('13_3_040_006 — Kiểm tra xác nhận phiếu đặt hàng sản phẩm MAC', async ({ page, browser }) => {
		chanNeuTat('13_3_040_006');
		test.setTimeout(600_000);
		await kiem_040_006(page, browser);
	});
	test('13_3_040_016 — Kiểm tra xác nhận phiếu đặt hàng sản phẩm MAC', async ({ page, browser }) => {
		chanNeuTat('13_3_040_016');
		test.setTimeout(600_000);
		await kiem_040_006(page, browser);
	});

	/** Công nợ nội bộ con nợ = HUB tỉnh (đọc bằng phiên phụ tỉnh): list debts + invoices của debt có chủ nợ TCT. */
	async function congNoNoiBo(browser, tctShopId) {
		const p = await k.moPhienPhu(browser, 'province', '/inventory/purchase-request');
		try {
			const ds = (await k.goiGhi(p.page, p.st, 'GET', `/internal-debt/by-debtor/${hubId()}`)).data || [];
			const debt = ds.find((x) => String(x.creditorShopId) === String(tctShopId)) || ds[0];
			const inv = debt ? ((await k.goiGhi(p.page, p.st, 'GET', `/internal-debt/${debt.id ?? debt.debtId}/invoices`, { page: 0, size: 50 })).data || []) : [];
			return { ds, debt, inv: Array.isArray(inv) ? inv : inv.content || [] };
		} finally { await p.dong(); }
	}
	const kiem_040_009 = async (page, browser) => {
		const d = await gt.donGiaoThang(browser, page, { sl: 2 });
		const tctId = d.luu.body.data.shopId;
		const truoc = await congNoNoiBo(browser, tctId);
		await gt.moChiTietGiaoThang(page, d.maPO);
		const x = await gt.xacNhanGiaoThang(page);
		expect(x.tb).toContain('Đã xác nhận đơn giao thẳng');
		let sau;
		await expect.poll(async () => { sau = await congNoNoiBo(browser, tctId); return sau.inv.length + (sau.debt ? 0 : -1); }, { message: 'Xác nhận đơn giao thẳng mà công nợ nội bộ HUB tỉnh → TCT không thêm phiếu nợ', timeout: 30_000 }).toBeGreaterThan(truoc.inv.length + (truoc.debt ? 0 : -1));
		const cu = new Set(truoc.inv.map((i) => JSON.stringify(i)));
		const moi = sau.inv.filter((i) => !cu.has(JSON.stringify(i)));
		ghi(`debt ${JSON.stringify(sau.debt)?.slice(0, 250)} · phiếu nợ mới ${JSON.stringify(moi).slice(0, 400)}`);
		const khop = moi.find((i) => JSON.stringify(i).includes(d.maPO));
		expect(khop, `Phiếu nợ nội bộ không tham chiếu đơn ${d.maPO}`).toBeTruthy();
		expect(JSON.stringify(khop), 'Số nợ nội bộ ≠ giá trị nhận 2 × 60.000').toMatch(/\b120000(\.0+)?\b/);
		expect(String(sau.debt.creditorShopId ?? ''), 'Chủ nợ không phải kho TCT').toBe(String(tctId));
	};
	test('13_3_040_009 — Kiểm tra ghi nhận công nợ nội bộ giữa TCT và tỉnh', async ({ page, browser }) => {
		chanNeuTat('13_3_040_009');
		test.setTimeout(600_000);
		await kiem_040_009(page, browser);
	});
	test('13_3_040_019 — Kiểm tra ghi nhận công nợ nội bộ giữa TCT và tỉnh', async ({ page, browser }) => {
		chanNeuTat('13_3_040_019');
		test.setTimeout(600_000);
		await kiem_040_009(page, browser);
	});
});
