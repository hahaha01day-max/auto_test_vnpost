'use strict';

/**
 * 14_1 · 010 — Tạo phiếu xuất trả NCC: case GHI (vai `shop`, điểm bán seed của làn 8).
 *
 * 🔴 Ghi thật: phiếu trả + (case 031/032) Xã và Tỉnh duyệt ⇒ tồn lô bị trừ. Dọn trong `finally`:
 * phiếu còn Nháp/Chờ duyệt ⇒ điểm bán HUỶ (`/cancel`); phiếu đã tới Xã/Tỉnh duyệt ⇒ Tỉnh TỪ CHỐI
 * (hàng hoàn về kho điểm bán — nghiệp vụ của 14_1_050_003).
 * Nguồn lô: `phieuNhapNhieuLo()` nhập mới 2 lô × 10 của SP giá tiêu chuẩn cho mỗi lượt chạy.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const r = require('./return-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const sd = () => r.seed.doc().duLieu;
const shopId = () => sd().diemBan.shopId;
const SP = () => sd().sanPham.sanPhamTheoGiaVon;
const so = (s) => Number(r.chuan(s).replace(/\./g, '').replace(',', '.').split(' ')[0]);

let st;
let box;
let nguon; // phiếu nhập 2 lô của lượt chạy

/** Mở form tạo phiếu, theo dõi POST tạo phiếu ⇒ trả id phiếu vừa tạo qua `taoRa`. */
async function moForm(page) {
	st = r.k.batHeader(page);
	await r.moDanhSach(page, VAI);
	box = await r.moFormTao(page);
	expect(box, 'Vai điểm bán không thấy nút "Tạo phiếu trả"').toBeTruthy();
	await expect(box.getByPlaceholder(r.O_PHIEU)).toBeVisible({ timeout: 20_000 });
}

/** Bấm nút footer tạo/lưu phiếu, trả { tb, id, body }; tự đồng ý hộp "còn dòng chưa nhập SL". */
async function luuPhieu(page, nhan) {
	const cho = page.waitForResponse((x) => x.url().includes(r.API) && x.request().method() === 'POST', { timeout: 30_000 }).catch(() => null);
	const tb = await r.thongBao(page, async () => {
		await r.nutFooter(page, nhan).click();
		const m = page.locator('.ant-modal-confirm').filter({ hasText: 'Có sản phẩm chưa nhập số lượng trả' });
		if (await m.waitFor({ timeout: 3_000 }).then(() => true).catch(() => false)) {
			await m.getByRole('button', { name: 'Tiếp tục tạo phiếu' }).click();
		}
	}, 15_000);
	const res = await cho;
	const body = res ? await res.json().catch(() => null) : null;
	return { tb, id: body?.data?.id, body };
}

/** Chọn lô ở cột Lô (Select multiple) của một dòng. */
async function chonLo(page, d, dsMa) {
	await d.locator('td').filter({ has: page.locator('.ant-select') }).last().locator('.ant-select').click();
	for (const ma of dsMa) {
		await page.locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${ma}"]`).click();
	}
	await page.keyboard.press('Escape');
}

/** SL từng lô khi đã chọn ≥ 2 lô. */
async function slLo(d, ma, sl) {
	const o = d.locator('.flex.items-center.gap-2').filter({ hasText: ma }).locator('.ant-input-number-input');
	await o.fill(String(sl));
	await o.press('Tab');
}

async function chiTiet(page, id) {
	return (await r.k.goiApi(page, st, `${r.API}/${id}`)).data;
}

/** Duyệt đủ SL bằng API phiên phụ của `vai` (ward | province). */
async function duyet(browser, vai, id) {
	const p = await r.k.moPhienPhu(browser, vai, r.ROUTE);
	try {
		const ct = (await r.k.goiApi(p.page, p.st, `${r.API}/${id}`)).data;
		const res = await r.k.goiGhi(p.page, p.st, 'POST', `${r.API}/${id}/approve`, {}, {
			approved: true,
			items: ct.items.map((it) => ({ itemId: it.id, approvedQuantity: Number(it.quantity) })),
		});
		expect(String(res?.status?.code), `${vai} duyệt phiếu ${id} lỗi: ${res?.status?.message}`).toBe('200');
	} finally {
		await p.dong();
	}
}

/** Dọn: Nháp/Chờ duyệt ⇒ điểm bán huỷ; Xã đã duyệt/Đã duyệt ⇒ tỉnh từ chối. */
async function don(browser, page, id) {
	if (!id) return;
	const { test } = require('@playwright/test');
	const ct = await chiTiet(page, id).catch(() => null);
	const s = ct?.request?.status;
	if (['DRAFT', 'PENDING'].includes(s)) await r.huyPhieu(page, st, id);
	else if (['WARD_APPROVED', 'APPROVED'].includes(s)) {
		const p = await r.k.moPhienPhu(browser, 'province', r.ROUTE);
		try {
			// 🔴 Đo 24/09: phiếu APPROVED thì BE chặn từ chối ("Cấp tỉnh chỉ duyệt được phiếu đã được cấp xã
			//    duyệt") và `/cancel` không hoàn kho ⇒ phiếu Đã duyệt KHÔNG dọn được, hàng giữ chỗ ở lại.
			const x = await r.k.goiGhi(p.page, p.st, 'POST', `${r.API}/${id}/approve`, {}, { approved: false, description: 'AUTO TEST 14_1 dọn phiếu' });
			if (String(x?.status?.code) !== '200') {
				test.info().annotations.push({ type: 'không dọn được', description: `Phiếu trả ${ct.request.code} (${s}): ${x?.status?.message}` });
			}
		} finally {
			await p.dong();
		}
	}
}

const tonLo = async (page, ma) => {
	const l = (await r.loCon(page, st, shopId(), nguon.sp.productId, nguon.sp.variantId)).find((x) => x.batchCode === ma);
	return l ? Number(l.remainQuantity) : 0;
};

test.describe('14_1 · 010 — Tạo phiếu xuất trả (ghi thật)', () => {
	test.describe.configure({ mode: 'default', timeout: 300_000 });

	test.beforeAll(async ({ browser }) => {
		nguon = await r.phieuNhapNhieuLo(browser, { soLo: 2, sl: 10 });
	});

	/** Nạp phiếu nhập 2 lô của lượt chạy; trả dòng SP. */
	async function napNguon(page) {
		await r.traPhieuNhap(page, box, nguon.code);
		const d = r.hang(box).filter({ hasText: nguon.tc.sku }).first();
		await expect(d, `Không nạp được phiếu ${nguon.code}`).toBeVisible({ timeout: 20_000 });
		if (!nguon.sp) {
			const ct = await r.k.goiApi(page, st, '/stock/v2/import-export/detail', { shopId: shopId(), code: nguon.code, fetchItems: true });
			nguon.sp = ct.data.items[0];
		}
		return d;
	}

	test('14_1_010_030 — Hàng có lô mà không chọn lô bị chặn', async ({ page }) => {
		chanNeuTat('14_1_010_030');
		await r.chanGhi(page);
		const posts = r.ghiPhieuTra(page);
		await moForm(page);
		const d = await napNguon(page);
		await expect(d.locator('.ant-select').filter({ hasText: 'Chọn lô trả' }), 'Phiếu 2 lô mà cột Lô không để trống cho người dùng chọn').toBeVisible();
		await r.nhapSl(d, 1);
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		const tb = await r.bam(page, 'Tạo phiếu (chờ duyệt)');
		expect(tb).toContain(`Sản phẩm "${nguon.tc.tenSanPham}": chọn lô hàng để trả`);
		expect(posts).toEqual([]);
	});

	test('14_1_010_041 — Lập phiếu chưa khoá tồn hàng vẫn bán được', async ({ page, browser }) => {
		chanNeuTat('14_1_010_041');
		await moForm(page);
		const d = await napNguon(page);
		const [l1] = nguon.lo;
		const truoc = await tonLo(page, l1);
		await chonLo(page, d, [l1]);
		await r.nhapSl(d, 5);
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		const { tb, id } = await luuPhieu(page, 'Tạo phiếu (chờ duyệt)');
		try {
			expect(tb).toContain('Đã tạo phiếu xuất trả — chờ duyệt');
			expect((await chiTiet(page, id)).request.status).toBe('PENDING');
			expect(await tonLo(page, l1), 'Phiếu Chờ duyệt đã trừ/khoá tồn lô').toBe(truoc);
			const b = await r.k.goiApi(page, st, '/stock/v2/batch-product', { shopId: shopId(), productId: nguon.sp.productId, variantId: nguon.sp.variantId, size: 500 });
			const lo = (b.data || []).find((x) => x.batchCode === l1);
			expect(Number(lo.reservedQuantity || 0), 'Phiếu Chờ duyệt đã giữ chỗ tồn lô (hàng không còn bán được)').toBe(0);
		} finally {
			await don(browser, page, id);
		}
	});

	test('14_1_010_031 — Trả hàng NCC theo một lô làm giảm đúng tồn lô đó', async ({ page, browser }) => {
		chanNeuTat('14_1_010_031');
		await moForm(page);
		const d = await napNguon(page);
		const [l1, l2] = nguon.lo;
		const [t1, t2] = [await tonLo(page, l1), await tonLo(page, l2)];
		expect([t1, t2], 'Hai lô nguồn không đủ 10').toEqual([10, 10]);
		await chonLo(page, d, [l1]);
		await r.nhapSl(d, 5);
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		const { tb, id } = await luuPhieu(page, 'Tạo phiếu (chờ duyệt)');
		try {
			expect(tb).toContain('Đã tạo phiếu xuất trả — chờ duyệt');
			await duyet(browser, 'ward', id);
			expect(await tonLo(page, l1), 'Xã duyệt mà đã trừ tồn lô (chỉ khoá khi tỉnh duyệt)').toBe(10);
			await duyet(browser, 'province', id);
			const ctd = await chiTiet(page, id);
			expect(ctd.request.status).toBe('APPROVED');
			const b = await r.k.goiApi(page, st, '/stock/v2/batch-product', { shopId: shopId(), productId: nguon.sp.productId, variantId: nguon.sp.variantId, size: 500 });
			const lo = (b.data || []).find((x) => x.batchCode === l1);
			const tv = await r.k.goiApi(page, st, `/shops/${shopId()}/stock/by-variants`, { variantIds: nguon.sp.variantId });
			test.info().annotations.push({ type: 'đo', description: `Sau tỉnh duyệt: lô ${l1} remain=${lo?.remainQuantity} reserved=${lo?.reservedQuantity}; reserveStockInOutId=${ctd.request.reserveStockInOutId}; tồn variant=${JSON.stringify(tv.data)}` });
			expect(await tonLo(page, l1), `Tỉnh duyệt trả 5 từ lô ${l1}: tồn lô sai (reserved=${lo?.reservedQuantity}, phiếu xuất giữ chỗ=${ctd.request.reserveStockInOutId})`).toBe(5);
			expect(await tonLo(page, l2), `Lô ${l2} không liên quan mà bị đổi tồn`).toBe(10);
		} finally {
			await don(browser, page, id);
		}
	});

	test('14_1_010_032 — Trả hàng NCC theo nhiều lô làm giảm đúng từng lô', async ({ page, browser }) => {
		chanNeuTat('14_1_010_032');
		await moForm(page);
		const d = await napNguon(page);
		const [l1, l2] = nguon.lo;
		const [t1, t2] = [await tonLo(page, l1), await tonLo(page, l2)];
		await chonLo(page, d, [l1, l2]);
		await slLo(d, l1, 5);
		await slLo(d, l2, 5);
		await r.chonLyDo(page, box, 'Hàng bán chậm');
		const { tb, id } = await luuPhieu(page, 'Tạo phiếu (chờ duyệt)');
		try {
			expect(tb).toContain('Đã tạo phiếu xuất trả — chờ duyệt');
			const ct = await chiTiet(page, id);
			expect(ct.items.map((x) => [x.batchCode, Number(x.quantity)]).sort(), 'Phiếu không tách đúng 2 dòng lô').toEqual([[l1, 5], [l2, 5]].sort());
			await duyet(browser, 'ward', id);
			await duyet(browser, 'province', id);
			expect(await tonLo(page, l1), `Tồn lô ${l1} sau khi tỉnh duyệt`).toBe(t1 - 5);
			expect(await tonLo(page, l2), `Tồn lô ${l2} sau khi tỉnh duyệt`).toBe(t2 - 5);
		} finally {
			await don(browser, page, id);
		}
	});

	test('14_1_010_023 — SL trả bằng đúng SL khả dụng được chấp nhận', async ({ page, browser }) => {
		chanNeuTat('14_1_010_023');
		await moForm(page);
		const d = await napNguon(page);
		const [l1] = nguon.lo;
		await chonLo(page, d, [l1]);
		const kd = so((await d.locator('td').allInnerTexts())[3]);
		const ton = await tonLo(page, l1);
		// SL khả dụng cả dòng = Σ lô của phiếu; trả trọn 1 lô = đúng trần của lô đó.
		await r.nhapSl(d, ton);
		await r.chonLyDo(page, box, 'Hàng lỗi');
		const { tb, id } = await luuPhieu(page, 'Tạo phiếu (chờ duyệt)');
		try {
			expect(tb, `Trả đúng ${ton} (khả dụng dòng ${kd}) bị cảnh báo`).not.toContain('vượt SL khả dụng');
			expect(tb).toContain('Đã tạo phiếu xuất trả — chờ duyệt');
			expect(Number((await chiTiet(page, id)).items[0].quantity)).toBe(ton);
		} finally {
			await don(browser, page, id);
		}
	});

	test('14_1_010_037 — Lưu nháp bỏ qua mọi phép kiểm tồn và lý do', async ({ page, browser }) => {
		chanNeuTat('14_1_010_037');
		await moForm(page);
		const d = await napNguon(page);
		// Không chọn lô, không chọn lý do — nộp phiếu sẽ bị chặn cả hai (xem 010_016, 010_030).
		await r.nhapSl(d, 3);
		const { tb, id } = await luuPhieu(page, 'Lưu nháp');
		try {
			expect(tb, 'Lưu nháp bị chặn bởi phép kiểm').toContain('Đã lưu nháp');
			expect(tb).not.toContain('chọn lô hàng');
			await expect(page).toHaveURL(new RegExp(`${r.ROUTE}$`));
			const ct = await chiTiet(page, id);
			expect(ct.request.status).toBe('DRAFT');
			const dongDs = r.dong(page).filter({ hasText: ct.request.code });
			await expect(dongDs.locator('.ant-tag').filter({ hasText: 'Nháp' })).toBeVisible({ timeout: 20_000 });
		} finally {
			await don(browser, page, id);
		}
	});

	test('14_1_010_038 — Tạo phiếu chờ duyệt thành công', async ({ page, browser }) => {
		chanNeuTat('14_1_010_038');
		await moForm(page);
		const d = await napNguon(page);
		await chonLo(page, d, [nguon.lo[1]]);
		await r.nhapSl(d, 2);
		await r.chonLyDo(page, box, 'Lý do khác');
		await r.fItem(box, 'Nội dung lý do').locator('textarea').fill('AUTO TEST 14_1 010_038');
		const { tb, id } = await luuPhieu(page, 'Tạo phiếu (chờ duyệt)');
		try {
			expect(tb).toContain('Đã tạo phiếu xuất trả — chờ duyệt');
			await expect(page).toHaveURL(new RegExp(`${r.ROUTE}$`));
			const ct = await chiTiet(page, id);
			expect(ct.request.note, 'Lý do khác không ghi đúng chữ người dùng nhập').toBe('AUTO TEST 14_1 010_038');
			const dau = r.dong(page).first();
			await expect(dau, 'Phiếu mới không ở đầu danh sách').toContainText(ct.request.code, { timeout: 20_000 });
			await expect(dau.locator('.ant-tag').filter({ hasText: 'Chờ duyệt' })).toBeVisible();
		} finally {
			await don(browser, page, id);
		}
	});

	test('14_1_010_034 — Không lập được phiếu trả khi tồn bằng 0', async ({ page, browser }) => {
		chanNeuTat('14_1_010_034');
		await moForm(page);
		await r.doiNguonSku(page, box);
		// SP tự doanh tỉnh (không serial) chưa từng về điểm bán seed ⇒ tồn 0, không có lô.
		const td = sd().tuDoanhTinh.sanPham.TD1;
		const d = await r.themSku(page, box, td.ten);
		test.info().annotations.push({ type: 'đo', description: `Dòng tồn 0: ${(await d.locator('td').allInnerTexts()).map(r.chuan).join(' | ')}` });
		let id;
		try {
			await r.nhapSl(d, 1);
			await r.chonLyDo(page, box, 'Hàng bán chậm');
			const x = await luuPhieu(page, 'Tạo phiếu (chờ duyệt)');
			id = x.id;
			expect(id, `Tồn 0 mà vẫn tạo được phiếu trả (thông báo: ${x.tb})`).toBeFalsy();
			const loi = r.chuan(`${x.tb} ${await page.locator('.ant-modal-confirm').allInnerTexts().then((a) => a.join(' '))}`);
			expect(loi).toMatch(/vượt SL khả dụng \(0 |chỉ còn 0, không đủ để trả \(1\)/);
		} finally {
			await don(browser, page, id);
		}
	});

	test('14_1_010_036 — Hàng quá thời hạn trả theo hợp đồng bị chặn lúc nộp phiếu', async ({ page, browser }) => {
		chanNeuTat('14_1_010_036');
		// Tiền đề (26/09/2026): lô TD1 có nguồn PO tỉnh (`traNcc14_2.loCoNguon.TD1`, mã 2409…) truy về phiếu nhập NCC
		// AUTO8_NCC_TINH ngày 24/09 (sớm nhất NK240926E44D 17:35, muộn nhất 18:58) gắn hợp đồng tỉnh (`tuDoanhTinh.contractId`).
		// BE (`ReturnRequestService.traceOriginsForCreate`) chặn khi floor(ngày) > maxReturnDays ⇒ đặt HĐ maxReturnDays = 1,
		// cần ≥ 2 ngày tròn kể từ phiếu nhập muộn nhất (24/09 18:58 ⇒ từ 26/09 18:59). Khôi phục maxReturnDays gốc ở finally.
		const moc = new Date('2026-09-26T18:59:00+07:00').getTime();
		test.skip(Date.now() < moc, 'Chưa đủ 2 ngày tròn kể từ phiếu nhập NCC 24/09 18:58 — chạy lại sau 26/09/2026 18:59');
		const td = sd().tuDoanhTinh;
		const loTd1 = sd().traNcc14_2?.loCoNguon?.TD1 || [];
		const hd = await r.k.moPhienPhu(browser, 'province', '/supplier/contract');
		let goc;
		let id;
		try {
			const ct = (await r.k.goiGhi(hd.page, hd.st, 'GET', `/chain-supplier-contract/${td.contractId}`, {}))?.data;
			expect(ct, `Không đọc được hợp đồng ${td.contractId}`).toBeTruthy();
			goc = ct.maxReturnDays ?? null;
			const put = await r.k.goiGhi(hd.page, hd.st, 'PUT', `/chain-supplier-contract/${td.contractId}`, {}, { ...ct, maxReturnDays: 1 });
			expect(String(put?.status?.code), `Đặt maxReturnDays = 1 lỗi: ${JSON.stringify(put?.status)}`).toBe('200');
			await moForm(page);
			const con = await r.loCon(page, st, shopId(), td.sanPham.TD1.productId);
			const lo = con.find((l) => loTd1.includes(l.batchCode ?? l.lotCode ?? l.code));
			test.info().annotations.push({ type: 'lô', description: `HĐ ${ct.contractCode} maxReturnDays ${goc} → 1 · lô TD1 còn: ${con.map((l) => `${l.batchCode ?? l.lotCode}:${l.remainQuantity}`).join(', ')} · chọn ${lo?.batchCode ?? lo?.lotCode}` });
			test.skip(!lo, 'Điểm bán không còn lô TD1 nào có nguồn PO ngày 24/09 (chạy tiền đề 14_2)');
			const tb = await r.traLo(page, box, lo.batchCode ?? lo.lotCode);
			const d = r.hang(box).filter({ hasText: td.sanPham.TD1.ten }).last();
			await expect(d, `Tra lô không thêm dòng (${tb})`).toBeVisible({ timeout: 15_000 });
			await r.nhapSl(d, 1);
			await r.chonLyDo(page, box, 'Hàng bán chậm');
			const x = await luuPhieu(page, 'Tạo phiếu (chờ duyệt)');
			id = x.id;
			const loi = r.chuan(`${x.tb} ${await page.locator('.ant-modal-confirm').allInnerTexts().then((a) => a.join(' '))}`);
			test.info().annotations.push({ type: 'thông báo', description: loi });
			expect(id, `Quá hạn trả theo hợp đồng mà vẫn tạo được phiếu (thông báo: ${x.tb})`).toBeFalsy();
			expect(loi).toMatch(new RegExp(`Sản phẩm "${td.sanPham.TD1.ten}[^"]*" đã quá thời hạn trả hàng theo hợp đồng ${ct.contractCode}: đã \\d+ ngày kể từ ngày nhập kho, hợp đồng chỉ cho phép trả trong 1 ngày\\.`));
		} finally {
			await don(browser, page, id);
			if (goc !== undefined) {
				const ct = (await r.k.goiGhi(hd.page, hd.st, 'GET', `/chain-supplier-contract/${td.contractId}`, {}))?.data;
				const b = await r.k.goiGhi(hd.page, hd.st, 'PUT', `/chain-supplier-contract/${td.contractId}`, {}, { ...ct, maxReturnDays: goc });
				test.info().annotations.push({ type: 'khôi phục HĐ', description: `maxReturnDays → ${goc}: ${JSON.stringify(b?.status)}` });
			}
			await hd.dong();
		}
	});

	test('14_1_010_035 — Không lập được phiếu trả khi tồn âm', async ({ page, browser }) => {
		chanNeuTat('14_1_010_035');
		// Tiền đề: SP sản xuất của làn đã bị bán vượt tồn (18_1 `ton-am.gdv` › "tien de ton am", bật bán âm tạm thời).
		const { chon } = require('../../shared/db/otp');
		let sx = null;
		for (const db of ['VNPOST_POD_01', 'VNPOST_POD_02', 'VNPOST_POD_03']) {
			let x = '';
			try { x = chon(`select product_name, sum(quantity) from ${db}.SHOP_STOCK where shop_id=${shopId()} and active=1 and product_name like '${r.seed.PREFIX}SP_SX_%' group by product_name limit 1`, db); } catch { /* pod khác */ }
			if (x) { const [ten, ton] = x.split('\t'); sx = { ten, ton: Number(ton) }; break; }
		}
		test.skip(!(sx?.ton < 0), `Chưa có hàng tồn âm ở điểm bán (SP sản xuất tồn ${sx?.ton}) — chạy 18_1 ton-am.gdv trước`);
		await moForm(page);
		await r.doiNguonSku(page, box);
		const d = await r.themSku(page, box, sx.ten);
		test.info().annotations.push({ type: 'đo', description: `${sx.ten} tồn ${sx.ton} · dòng: ${(await d.locator('td').allInnerTexts()).map(r.chuan).join(' | ')}` });
		let id;
		try {
			await r.nhapSl(d, 1);
			await r.chonLyDo(page, box, 'Hàng bán chậm');
			const x = await luuPhieu(page, 'Tạo phiếu (chờ duyệt)');
			id = x.id;
			expect(id, `Tồn âm mà vẫn tạo được phiếu trả (thông báo: ${x.tb})`).toBeFalsy();
			const loi = r.chuan(`${x.tb} ${await page.locator('.ant-modal-confirm').allInnerTexts().then((a) => a.join(' '))}`);
			test.info().annotations.push({ type: 'thông báo', description: loi });
			expect(loi).toMatch(new RegExp(`chỉ còn ${String(sx.ton).replace('-', '\\-')}[^,]*, không đủ để trả \\(1\\)`));
		} finally {
			await don(browser, page, id);
		}
	});
});
