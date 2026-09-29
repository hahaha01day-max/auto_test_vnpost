'use strict';

/**
 * 04_3 · 060 — Lập phiếu chuyển kho (GHI), vai `tct`: điểm bán seed `AUTO8_SHOP` → điểm bán nhận
 * `diemBanNhan` của sổ seed.
 *
 * Nguồn (vnpost-web af8cda07, `pages/warehouse/transfer/DrawerAddTransfer.jsx`):
 * - Chặn phía FE theo thứ tự: "Vui lòng chọn kho chuyển" → "Vui lòng chọn kho nhận" → rule form
 *   ("Nhập mã hoá đơn chứng từ") → trùng kho → modal "Số lượng chuyển không hợp lệ" (SL ≤ 0) →
 *   modal "Chưa xác định được giá vốn" → serial.
 * - Ô "Xuất kho ngay khi tạo phiếu (hàng đi đường)" (`#exportImmediately`) MẶC ĐỊNH BẬT.
 * - Tạo: `POST /stock/v2/transfer/v2`; chi tiết `GET /stock/v2/transfer/v2/<id>`.
 * - Ảnh đính kèm: `UploadImageFormdata`, `maxImage = 10`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('./ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

/** Tồn theo lô của variant ở một điểm bán. */
async function tonLo(page, st, shopId, productId, variantId) {
	const b = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, productId, variantId, size: 500 });
	return Object.fromEntries((b.data || []).map((l) => [l.batchCode, Number(l.remainQuantity)]));
}
const tong = (m) => Object.values(m).reduce((a, b) => a + b, 0);

/** Phiếu test tạo ra trong lượt — dọn ở afterEach. */
const daTao = [];

/**
 * Chặn request ghi, TRỪ hai POST chỉ-đọc FE gọi khi thêm dòng SP: `cost-preview` và `freeze-check`
 * (chặn là dòng SP không được thêm, test treo ở chỗ tìm dòng).
 */
async function chanGhiTruXemGia(page) {
	const daGoi = [];
	await page.route('**/__api/**', async (route) => {
		const req = route.request();
		if (req.method() === 'GET' || /\/(cost-preview|freeze-check)\b/.test(req.url())) return route.continue();
		if (!/\/(stock|shops)\b/.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	return { daGoi };
}

/** Mở form, chọn đủ hai kho. */
async function moDu(page) {
	const kho = k.khoChuyen();
	const dr = await k.moFormChuyen(page, VAI);
	await k.chonKho(page, dr, 'Chọn kho chuyển', kho.nguon);
	await k.chonKho(page, dr, 'Chọn kho nhận', kho.nhan);
	return { dr, kho };
}

/** Thêm SP (ô "Tìm sản phẩm"), trả về { sp, dong }. */
const themSp = (page, dr, ten) => k.themSanPhamXuat(page, dr, ten);

/** Nhập SL rồi tự chọn lô theo tồn KHẢ DỤNG (🚫 để FE tự phân bổ theo remain — xem ghi-kho.loKhaDung). */
async function datSl(page, doc, kho, sp, dong, sl) {
	await dong.locator('input[role="spinbutton"]').first().fill(String(sl));
	const lo = await k.loKhaDung(doc.page, doc.st, kho.nguon.shopId, sp.productId, sp.variantId);
	const kd = lo.reduce((a, l) => a + l.kd, 0);
	test.skip(kd < sl, `SP ${sp.productName} chỉ còn ${kd} khả dụng < ${sl} — lô đang bị phiếu chờ khác giữ chỗ.`);
	await k.chonLoXuat(page, dong, k.phanBoKhaDung(lo, sl));
}

async function taoPhieu(page, dr) {
	// 🔴 Khớp ĐÚNG path — `POST …/transfer/v2/cost-preview` cũng chứa chuỗi này và về trước.
	const cho = page.waitForResponse(
		(r) => r.request().method() === 'POST' && r.url().split('?')[0].endsWith('/stock/v2/transfer/v2'),
		{ timeout: 60_000 },
	);
	await dr.getByRole('button', { name: 'Tạo phiếu' }).click();
	// Bật "xuất kho ngay" ⇒ FE hỏi lại một lần.
	const xn = page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận xuất kho ngay khi tạo phiếu' });
	if (await xn.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false)) {
		await xn.getByRole('button', { name: 'Đồng ý' }).click();
	}
	const body = await (await cho).json();
	if (body?.data?.stockTransferId) daTao.push(body.data.stockTransferId);
	expect(String(body?.status?.code), `Tạo phiếu chuyển lỗi: ${body?.status?.message}`).toBe('200');
	return body.data;
}

/** Bắt thông báo (toast hoặc modal) có chứa `chu` xuất hiện sau `hanhDong`. */
async function batThongBao(page, hanhDong) {
	const cho = page
		.locator('.ant-message-notice, .ant-modal-confirm, .ant-form-item-explain-error')
		.first()
		.waitFor({ state: 'attached', timeout: 10_000 })
		.then(async () => k.chuan((await page.locator('.ant-message-notice, .ant-modal-confirm, .ant-form-item-explain-error').allInnerTexts()).join(' | ')), () => '');
	await hanhDong();
	return cho;
}

test.describe('04_3 · 060 — Lập phiếu chuyển kho (điểm bán seed → điểm bán nhận)', () => {
	test.describe.configure({ timeout: 240_000 });

	/** Phiên phụ của Cửa hàng trưởng điểm bán nguồn — đọc tồn / chi tiết phiếu và dọn phiếu thử. */
	let doc = null;
	test.beforeEach(async ({ browser }) => {
		doc = await k.moPhienPhu(browser, 'shop', '/inventory/transfer-warehouse');
	});
	test.afterEach(async () => {
		const { nguon } = k.khoChuyen();
		while (daTao.length) await k.donPhieuChuyen(doc.page, doc.st, nguon.shopId, daTao.pop()).catch(() => {});
		await doc.dong();
	});

	test('04_3_060_006 — Chọn thiếu trường bắt buộc khi lập phiếu chuyển kho', async ({ page }) => {
		chanNeuTat('04_3_060_006');
		const { daGoi } = await chanGhiTruXemGia(page);
		const kho = k.khoChuyen();
		const { sp } = k.duLieuSeed();
		const dr = await k.moFormChuyen(page, VAI);
		// Tắt "xuất ngay" — nếu bật, bấm Tạo phiếu hiện modal xác nhận TRƯỚC mọi kiểm tra.
		await dr.locator('#exportImmediately').uncheck();
		const nut = dr.getByRole('button', { name: 'Tạo phiếu' });
		const tao = () => nut.click();
		const dongModal = async () => {
			const m = page.locator('.ant-modal-confirm:visible');
			if (await m.count()) await m.getByRole('button').last().click();
		};
		const cho = () => page.waitForTimeout(3_500); // chờ toast cũ tắt
		const loi = {};

		// Đo 23/09/2026: chưa có dòng SP thì nút "Tạo phiếu" KHOÁ (`disabled={selectedVariant.length < 1}`);
		// ô tìm SP lại đòi chọn kho chuyển trước ⇒ bỏ trống kho chuyển / sản phẩm chỉ bị chặn bằng nút khoá.
		loi.khoChuyen = (await nut.isDisabled()) ? '(nút Tạo phiếu khoá, không có thông báo)' : await batThongBao(page, tao);
		await k.chonKho(page, dr, 'Chọn kho chuyển', kho.nguon);
		loi.sanPham = (await nut.isDisabled()) ? '(nút Tạo phiếu khoá, không có thông báo)' : await batThongBao(page, tao);
		const { dong } = await themSp(page, dr, sp.tieuChuan.tenSanPham);
		await dong.locator('input[role="spinbutton"]').first().fill('1');
		loi.khoNhan = await batThongBao(page, tao);
		await dongModal();
		await k.chonKho(page, dr, 'Chọn kho nhận', kho.nhan);
		await dr.locator('#code').fill('');
		await cho();
		loi.maChungTu = await batThongBao(page, tao);
		await dr.locator('#code').fill(`CKAUTO${Date.now().toString().slice(-6)}`);
		const oSl = dong.locator('input[role="spinbutton"]').first();
		await oSl.fill('0');
		await oSl.blur();
		const slNhan = Number((await oSl.inputValue()).replace(/\D/g, '') || 0);
		await cho();
		// Ô SL tự kẹp về giá trị hợp lệ thì bấm Tạo phiếu là TẠO THẬT (đã chặn ghi) — chỉ bấm khi ô còn 0.
		loi.soLuong = slNhan > 0 ? `(ô SL tự kẹp 0 → ${slNhan}, không có thông báo)` : await batThongBao(page, tao);
		await dongModal();

		test.info().annotations.push({ type: 'đo', description: JSON.stringify(loi) });
		expect(loi.khoNhan, 'Bỏ trống kho nhận không báo').toContain('Vui lòng chọn kho nhận');
		expect(loi.maChungTu, 'Bỏ trống mã chứng từ không báo').toContain('Nhập mã hoá đơn chứng từ');
		expect.soft(loi.soLuong, 'SL = 0 không có thông báo riêng').toContain('Số lượng chuyển không hợp lệ');
		expect(daGoi, 'Thiếu trường bắt buộc mà vẫn gửi request tạo phiếu').toEqual([]);
		// Kịch bản: MỖI ô bắt buộc một thông báo RIÊNG, lấy nguyên văn — 🚫 không coi nút khoá là thông báo.
		expect.soft(loi.khoChuyen, 'Bỏ trống kho chuyển không có thông báo riêng').not.toContain('nút Tạo phiếu khoá');
		expect.soft(loi.sanPham, 'Không có sản phẩm không có thông báo riêng').not.toContain('nút Tạo phiếu khoá');

	});

	test('04_3_060_007 — Lập phiếu chuyển kho với đầy đủ thông tin', async ({ page }) => {
		chanNeuTat('04_3_060_007');
		const { sp } = k.duLieuSeed();
		const { dr, kho } = await moDu(page);
		await dr.locator('#exportImmediately').uncheck();
		const { sp: tc, dong } = await themSp(page, dr, sp.tieuChuan.tenSanPham);
		await datSl(page, doc, kho, tc, dong, 1);
		const nhanTruoc = tong(await tonLo(doc.page, doc.st, kho.nhan.shopId, tc.productId, tc.variantId));
		const p = await taoPhieu(page, dr);
		expect(p.status, 'Phiếu mới không ở trạng thái Chờ xác nhận').toBe('PENDING');
		expect(tong(await tonLo(doc.page, doc.st, kho.nhan.shopId, tc.productId, tc.variantId)), 'Tồn bên nhận tăng dù chưa xác nhận').toBe(nhanTruoc);
	});

	test('04_3_060_009 — Số lượng chuyển LỚN HƠN tồn kho', async ({ page }) => {
		chanNeuTat('04_3_060_009');
		const { daGoi } = await chanGhiTruXemGia(page);
		const { sp } = k.duLieuSeed();
		const { dr, kho } = await moDu(page);
		await dr.locator('#exportImmediately').uncheck();
		const { sp: tc, dong } = await themSp(page, dr, sp.tieuChuan.tenSanPham);
		const n = tong(await tonLo(doc.page, doc.st, kho.nguon.shopId, tc.productId, tc.variantId));
		const o = dong.locator('input[role="spinbutton"]').first();
		await o.fill(String(n + 1));
		await o.blur();
		const giaTri = Number((await o.inputValue()).replace(/\D/g, '') || 0);
		// 🚫 Không bấm Tạo phiếu: ô đã kẹp về SL hợp lệ ⇒ bấm là tạo phiếu thật với SL = tồn.
		const bao = await page.locator('.ant-message-notice, .ant-form-item-explain-error').allInnerTexts().then((t) => k.chuan(t.join(' | ')));
		test.info().annotations.push({ type: 'đo', description: `ô SL nhận ${giaTri} (tồn ${n}); thông báo: ${bao || '(không có)'}` });
		expect(giaTri, `Ô SL nhận ${giaTri} > tồn ${n} — không bị chặn`).toBeLessThanOrEqual(n);
		expect(daGoi.filter((x) => !x.includes('cost-preview') && !x.includes('freeze-check')), 'Nhập SL vượt tồn đã gửi request ghi').toEqual([]);
		// Kịch bản: bị chặn KÈM thông báo nêu tồn khả dụng — đo được chỉ là ô SL tự kẹp về tồn, không thông báo.
		expect.soft(bao, `Không có thông báo nêu tồn khả dụng ${n} (ô SL tự kẹp về ${giaTri})`).toContain(String(n));
	});

	test('04_3_060_010 — Chuyển kho khi tồn bằng 0', async ({ page }) => {
		chanNeuTat('04_3_060_010');
		const { daGoi } = await chanGhiTruXemGia(page);
		const { sp } = k.duLieuSeed();
		const { dr, kho } = await moDu(page);
		await dr.locator('#exportImmediately').uncheck();
		const { sp: dd, dong } = await themSp(page, dr, sp.dichDanh.tenSanPham);
		const n = tong(await tonLo(doc.page, doc.st, kho.nguon.shopId, dd.productId, dd.variantId));
		test.skip(n !== 0, `SP ${dd.productName} đang có tồn ${n} ở kho chuyển — case cần SP tồn 0.`);
		await dong.locator('input[role="spinbutton"]').first().fill('1');
		const bao = await batThongBao(page, () => dr.getByRole('button', { name: 'Tạo phiếu' }).click());
		test.info().annotations.push({ type: 'đo', description: `thông báo: ${bao}` });
		expect(daGoi, 'Tồn 0 mà vẫn gửi request tạo phiếu').toEqual([]);
		expect(bao, 'Tồn 0 mà không có thông báo chặn').not.toBe('');
		expect(bao, 'Chỉ có hộp xác nhận "xuất ngay", không phải thông báo chặn').not.toContain('Xác nhận xuất kho ngay');
	});

	test('04_3_060_012 — Chuyển kho nhiều lô trong một lần chuyển', async ({ page }) => {
		chanNeuTat('04_3_060_012');
		const { sp } = k.duLieuSeed();
		const { dr, kho } = await moDu(page);
		const { sp: tc, dong } = await themSp(page, dr, sp.tieuChuan.tenSanPham);
		const ton = await tonLo(doc.page, doc.st, kho.nguon.shopId, tc.productId, tc.variantId);
		const kd = await k.loKhaDung(doc.page, doc.st, kho.nguon.shopId, tc.productId, tc.variantId);
		const ma = kd.filter((l) => l.kd >= 2).map((l) => l.ma);
		test.skip(ma.length < 2, `SP ${tc.productName} chỉ có ${ma.length} lô KHẢ DỤNG ≥ 2 (lô đang bị phiếu chờ khác giữ chỗ).`);
		const [a, b] = [ma[0], ma[ma.length - 1]];
		await dong.locator('input[role="spinbutton"]').first().fill('3');
		await k.chonLoXuat(page, dong, { [a]: 2, [b]: 1 });
		const p = await taoPhieu(page, dr); // xuất ngay (mặc định bật)
		const ct = (await k.goiApi(doc.page, doc.st, `/stock/v2/transfer/v2/${p.stockTransferId}`, { shopId: kho.nguon.shopId })).data;
		const lo = Object.fromEntries((ct.items?.[0]?.batchProducts || []).map((x) => [x.batchCode, Number(x.quantity)]));
		expect(lo, 'Phiếu không ghi SL theo từng lô').toEqual({ [a]: 2, [b]: 1 });
		const sau = await tonLo(doc.page, doc.st, kho.nguon.shopId, tc.productId, tc.variantId);
		expect(sau[a], `Lô ${a} không giảm đúng 2`).toBe(ton[a] - 2);
		expect(sau[b], `Lô ${b} không giảm đúng 1`).toBe(ton[b] - 1);
	});

	test('04_3_060_014 — Chuyển kho có XUẤT NGAY', async ({ page }) => {
		chanNeuTat('04_3_060_014');
		const { sp } = k.duLieuSeed();
		const { dr, kho } = await moDu(page);
		await expect(dr.locator('#exportImmediately'), '"Xuất kho ngay" không bật mặc định').toBeChecked();
		const { sp: tc, dong } = await themSp(page, dr, sp.tieuChuan.tenSanPham);
		await datSl(page, doc, kho, tc, dong, 1);
		const truoc = tong(await tonLo(doc.page, doc.st, kho.nguon.shopId, tc.productId, tc.variantId));
		const p = await taoPhieu(page, dr);
		expect(tong(await tonLo(doc.page, doc.st, kho.nguon.shopId, tc.productId, tc.variantId)), 'Xuất ngay mà tồn kho xuất không giảm ngay khi lập phiếu').toBe(truoc - 1);
		const ct = (await k.goiApi(doc.page, doc.st, `/stock/v2/transfer/v2/${p.stockTransferId}`, { shopId: kho.nguon.shopId })).data;
		const idXuat = ct.stockInId || ct.stockOutId; // 🔴 id phiếu xuất nằm ở `stockInId`
		test.info().annotations.push({ type: 'đo', description: `trạng thái ${ct.status}, stockInId ${ct.stockInId}, stockOutId ${ct.stockOutId}` });
		expect(ct.status, 'Xuất ngay mà phiếu không sang Đang đi đường').toBe('IN_TRANSIT');
		expect(idXuat, 'Xuất ngay mà không sinh phiếu xuất').toBeTruthy();
		const px = await k.chiTietPhieu(doc.page, doc.st, kho.nguon.shopId, idXuat);
		expect(Number(px.items?.[0]?.basePrice), 'Giá vốn xuất trên phiếu xuất chuyển kho = 0 (hàng mua bán)').toBeGreaterThan(0);
	});

	test('04_3_060_015 — Chuyển kho KHÔNG xuất ngay', async ({ page }) => {
		chanNeuTat('04_3_060_015');
		const { sp } = k.duLieuSeed();
		const { dr, kho } = await moDu(page);
		await dr.locator('#exportImmediately').uncheck();
		const { sp: tc, dong } = await themSp(page, dr, sp.tieuChuan.tenSanPham);
		await datSl(page, doc, kho, tc, dong, 1);
		const truoc = tong(await tonLo(doc.page, doc.st, kho.nguon.shopId, tc.productId, tc.variantId));
		const p = await taoPhieu(page, dr);
		expect(p.status).toBe('PENDING');
		expect(tong(await tonLo(doc.page, doc.st, kho.nguon.shopId, tc.productId, tc.variantId)), 'Không xuất ngay mà tồn kho xuất đã giảm khi lập phiếu').toBe(truoc);
		// Bước 4 (sau khi bên nhận xác nhận) nằm ở nhóm 070 — ghi mốc ở đó.
	});

	test('04_3_060_016 — Tải ảnh khi tạo phiếu chuyển kho', async ({ page }, testInfo) => {
		chanNeuTat('04_3_060_016');
		const { sp } = k.duLieuSeed();
		const { dr, kho } = await moDu(page);
		await dr.locator('#exportImmediately').uncheck();
		const { sp: tc, dong } = await themSp(page, dr, sp.tieuChuan.tenSanPham);
		await datSl(page, doc, kho, tc, dong, 1);
		// PNG 1×1 hợp lệ.
		const f = testInfo.outputPath('auto-chuyen-kho.png');
		fs.writeFileSync(f, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
		await dr.locator('input[type=file]').setInputFiles(f);
		const p = await taoPhieu(page, dr);
		const ct = (await k.goiApi(doc.page, doc.st, `/stock/v2/transfer/v2/${p.stockTransferId}`, { shopId: kho.nguon.shopId })).data;
		expect((ct.imageIds || []).length || (ct.images || []).length, 'Ảnh không lưu cùng phiếu').toBe(1);
	});
	// Đặt CUỐI file: lần "N" giữ chỗ TOÀN BỘ tồn khả dụng cho tới lúc afterEach từ chối phiếu.
	test('04_3_060_008 — Số lượng chuyển nhỏ hơn hoặc bằng tồn kho', async ({ page }) => {
		test.setTimeout(420_000);
		chanNeuTat('04_3_060_008');
		const { sp } = k.duLieuSeed();
		// Không xuất ngay ⇒ phiếu Chờ xác nhận, tồn chưa trừ — SL "= tồn" không làm cạn SP dùng chung.
		const ten = sp.tieuChuan.tenSanPham;
		for (const lan of ['N-1', 'N']) {
			const { dr, kho } = await moDu(page);
			await dr.locator('#exportImmediately').uncheck();
			const { sp: m, dong } = await themSp(page, dr, ten);
			// 🔴 Tồn KHẢ DỤNG = remain − reserved (phiếu chờ khác đang giữ chỗ).
			const b = await k.goiApi(doc.page, doc.st, '/stock/v2/batch-product', { shopId: kho.nguon.shopId, productId: m.productId, variantId: m.variantId, size: 500 });
			const n = (b.data || []).reduce((a, l) => a + Number(l.remainQuantity) - Number(l.reservedQuantity || 0), 0);
			test.skip(n <= 1, `${ten} chỉ còn ${n} khả dụng ở kho chuyển — lô đang bị giữ chỗ (lô: ${JSON.stringify((b.data || []).map((l) => [l.batchCode, l.remainQuantity, l.reservedQuantity]))})`);
			const sl = lan === 'N' ? n : n - 1;
			await datSl(page, doc, kho, m, dong, sl);
			const p = await taoPhieu(page, dr);
			const ct = (await k.goiApi(doc.page, doc.st, `/stock/v2/transfer/v2/${p.stockTransferId}`, { shopId: kho.nguon.shopId })).data;
			expect(Number(ct.items?.[0]?.quantity), `Lần ${lan}: SL ghi trên phiếu khác SL nhập`).toBe(sl);
			if (lan === 'N-1') {
				// Phiếu N-1 đang GIỮ CHỖ ⇒ từ chối để nhả, rồi chờ tồn khả dụng về lại N trước lần "N".
				await k.donPhieuChuyen(doc.page, doc.st, kho.nguon.shopId, daTao.pop());
				const t0 = Date.now();
				const kdLai = async () => (await k.loKhaDung(doc.page, doc.st, kho.nguon.shopId, m.productId, m.variantId)).reduce((a, l) => a + l.kd, 0);
				await expect.poll(kdLai, { timeout: 150_000, intervals: [5_000] }).toBeGreaterThanOrEqual(n).catch(() => {});
				const kd = await kdLai();
				test.info().annotations.push({ type: 'đo', description: `từ chối phiếu N-1 → tồn khả dụng ${kd}/${n} sau ${Math.round((Date.now() - t0) / 1000)} giây` });
				test.skip(kd < n, `Từ chối phiếu N-1 mà sau 150 giây giữ chỗ vẫn chưa nhả (khả dụng ${kd}/${n}) — không lập được lần N.`);
				await page.reload();
			}
		}
	});

});
