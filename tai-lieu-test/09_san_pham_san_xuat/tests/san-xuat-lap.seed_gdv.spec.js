'use strict';

/**
 * 09 · 010/020 — LẬP phiếu sản xuất bằng GDV điểm bán seed (`seed_gdv`).
 *
 * Kịch bản ghi "Vai: shop" nhưng Cửa hàng trưởng không có `create_import_stock` ⇒ không thấy nút
 * "Tạo phiếu sản xuất" (xem `sx-ghi.js`). Chạy bằng GDV của cùng điểm bán.
 * Case không cần lưu thật thì chặn POST `/production` ở mạng; chỉ `09_010_003` lưu phiếu Nháp thật
 * (phiếu Nháp KHÔNG có chức năng xoá — để lại, ghi chú `AUTO TEST 09`). 🔴 Đo 24/09: GDV bị BE trả 401
 * ở POST `/production` ⇒ `09_010_003` đỏ vì phân quyền, 🚫 không phải lỗi script.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const sx = require('./sx-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

/** Chặn POST tạo phiếu; trả mảng body đã bị chặn. */
async function chanTao(page) {
	const bi = [];
	await page.route('**/__api/production**', async (route) => {
		const r = route.request();
		if (r.method() !== 'POST') return route.continue();
		bi.push(r.postData());
		return route.fulfill({ status: 403, contentType: 'application/json', body: '{"status":{"code":"403","message":"Bị auto test chặn"}}' });
	});
	return bi;
}

const mau = (loc) => loc.evaluate((e) => (e.className.match(/text-(red|green|orange)-\d+/) || [''])[0]);

test.describe('09 · lập phiếu sản xuất (GDV điểm bán seed)', () => {
	test('09_010_002 — Chặn lập phiếu cho sản phẩm chưa khai công thức nguyên liệu', async ({ page }) => {
		chanNeuTat('09_010_002');
		const { sx: d } = sx.duLieu();
		const bi = await chanTao(page);
		const dr = await sx.moForm(page, 'seed_gdv');
		const the = await sx.chonThanhPham(page, dr, d.khongCongThuc.tenSanPham);
		await expect(the, 'Thẻ sản phẩm không công thức không báo "Chưa có công thức nguyên liệu"').toContainText('Chưa có công thức nguyên liệu');
		await sx.datSoLuong(page, the, 1);
		const kq = await sx.luu(page, dr, 8_000);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ thongBao: kq.thongBao, daGui: bi.length, payload: (bi[0] || '').slice(0, 300) }) });
		expect(bi.length, '🔴 Sản phẩm chế biến CHƯA có công thức vẫn gửi request lập phiếu (phiếu không có nguyên liệu tiêu hao)').toBe(0);
	});

	test('09_010_003 — Lập phiếu sản xuất ở trạng thái Nháp', async ({ page, browser }) => {
		chanNeuTat('09_010_003');
		test.setTimeout(180_000);
		const { data, thongBao } = await sx.lapPhieuNhap(page, 1);
		expect(thongBao).toContain('Tạo phiếu sản xuất thành công');
		expect(data?.id, 'Tạo phiếu không trả id').toBeTruthy();
		expect(data?.status, 'Phiếu mới không ở trạng thái DRAFT').toBe('DRAFT');
		test.info().annotations.push({ type: 'đo', description: `phiếu ${data.code} (id ${data.id})` });

		// GDV KHÔNG đọc được danh sách của chính mình (401) — ghi lại, kiểm hiển thị bằng vai tỉnh.
		const tinh = await k.moPhienPhu(browser, 'province', sx.ROUTE);
		try {
			await sx.moDanhSachTinh(tinh.page);
			const r = sx.dongPhieu(tinh.page, data.code);
			await expect(r, `Danh sách không có phiếu ${data.code}`).toBeVisible({ timeout: 20_000 });
			await expect(r).toContainText('Nháp');
			await expect(r.getByRole('button', { name: /Xác nhận/ }), 'Phiếu Nháp không có nút Xác nhận').toBeVisible();
		} finally {
			await tinh.dong();
		}
	});

	test('09_010_005 — Số lượng sản xuất: biên 0, số âm, số thập phân', async ({ page }) => {
		chanNeuTat('09_010_005');
		const { sx: d } = sx.duLieu();
		const bi = await chanTao(page);
		const dr = await sx.moForm(page, 'seed_gdv');
		const the = await sx.chonThanhPham(page, dr, d.coCongThuc.tenSanPham);
		const kq = {};
		kq.am = await sx.datSoLuong(page, the, -3);
		kq.thapPhan = await sx.datSoLuong(page, the, 1.5);
		kq.canThapPhan = (await sx.dongNguyenLieu(the))[0]?.can;
		kq.khong = await sx.datSoLuong(page, the, 0);
		kq.luuKhong = await sx.luu(page, dr, 5_000);
		kq.lon = await sx.datSoLuong(page, the, 100000);
		const nl = await sx.dongNguyenLieu(the);
		kq.nlLon = nl[0];
		kq.nutLuuLon = await dr.getByRole('button', { name: 'Lưu phiếu' }).isDisabled();
		kq.canhBao = await dr.getByText('Có nguyên liệu không đủ tồn — không thể lưu phiếu.').isVisible();
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ am: kq.am, thapPhan: kq.thapPhan, canThapPhan: kq.canThapPhan, khong: kq.luuKhong.thongBao, lon: kq.nlLon, nutLuuLon: kq.nutLuuLon, daGui: bi.length }) });

		// Âm: InputNumber `min={0}` kẹp về 0 — rồi bị chặn như 0.
		expect(kq.am, 'Số âm không bị kẹp về 0').toBe('0');
		expect(kq.luuKhong.thongBao, 'SL = 0 bấm Lưu mà không bị chặn').toContain('Vui lòng chọn sản phẩm sản xuất');
		// Thập phân: code KHÔNG khai `precision` ⇒ giữ nguyên, nguyên liệu nhân theo.
		expect(kq.thapPhan).toBe('1.5');
		expect(kq.canThapPhan, 'Nguyên liệu không nhân theo SL thập phân').toBeCloseTo(1.5 * d.coCongThuc.dinhMuc, 4);
		// Rất lớn: FE chặn NGAY Ở FORM (Thiếu + khoá Lưu), sớm hơn kịch bản (bước xác nhận).
		expect(kq.nlLon?.tag, 'SL vượt tồn nhiều lần mà nguyên liệu không báo Thiếu').toBe('Thiếu');
		expect(kq.nutLuuLon, 'SL vượt tồn mà nút Lưu phiếu vẫn bấm được').toBe(true);
		expect(bi.length, 'Có request lập phiếu bị gửi trong lúc thử biên').toBe(0);
	});

	test('09_010_006 — Nguyên liệu tự điền theo công thức khi chọn thành phẩm', async ({ page }) => {
		chanNeuTat('09_010_006');
		const { sx: d, shopId, tc } = sx.duLieu();
		const st = k.batHeader(page);
		await chanTao(page);
		const dr = await sx.moForm(page, 'seed_gdv');
		const the = await sx.chonThanhPham(page, dr, d.coCongThuc.tenSanPham);
		const dm = d.coCongThuc.dinhMuc;
		const doc = {};
		for (const sl of [1, 3, 7]) {
			await sx.datSoLuong(page, the, sl);
			doc[sl] = await sx.dongNguyenLieu(the);
		}
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(Object.fromEntries(Object.entries(doc).map(([s, v]) => [s, v.map((x) => x.text)]))) });
		for (const [sl, ds] of Object.entries(doc)) {
			expect(ds.length, `SL ${sl}: bảng nguyên liệu không đúng 1 dòng theo công thức`).toBe(1);
			expect(ds[0].text, 'Dòng nguyên liệu không phải nguyên liệu trong công thức').toContain(d.coCongThuc.nguyenLieu);
			expect(ds[0].can, `SL ${sl}: Cần ≠ định mức × SL (${dm} × ${sl})`).toBeCloseTo(dm * Number(sl), 4);
		}
		// Tồn hiển thị = tồn thật của nguyên liệu ở kho.
		const bt = (await k.goiApi(page, st, '/chain/products/basic-search-product-unit', { productName: tc.tenSanPham, isFull: true, page: 0, size: 20 })).data.find((x) => x.productName === tc.tenSanPham);
		expect(bt, `Không tra được variant của ${tc.tenSanPham}`).toBeTruthy();
		const ton = await k.tonVariant(page, st, shopId, bt.productId, bt.variantId);
		expect(doc[1][0].ton, 'Cột Tồn trên thẻ ≠ tồn lô thật của nguyên liệu').toBeCloseTo(ton, 4);
	});

	test('09_010_007 — Sửa tay lượng nguyên liệu khác công thức', async ({ page }) => {
		chanNeuTat('09_010_007');
		const { sx: d } = sx.duLieu();
		const bi = await chanTao(page);
		const dr = await sx.moForm(page, 'seed_gdv');
		const the = await sx.chonThanhPham(page, dr, d.coCongThuc.tenSanPham);
		await sx.datSoLuong(page, the, 2);
		const dongNl = the.locator('.grid').first();
		const oNhap = await dongNl.locator('input:not([type=search]):not([type=radio]):not([type=checkbox])').count();
		// Lô tiêu hao: drawer phân bổ chỉ nhận ĐỦ đúng lượng "Cần" (Xác nhận khoá khi lệch).
		await dongNl.getByRole('button', { name: 'Lô / serial' }).click();
		const pb = page.locator('.ant-drawer-open').filter({ hasText: 'Phân bổ lô tiêu hao' }).last();
		await expect(pb).toBeVisible();
		const canPb = sx.chuan(await pb.getByText(/Cần phân bổ/).innerText());
		await pb.getByRole('button', { name: 'Hủy' }).click();
		await sx.luu(page, dr, 8_000);
		const gui = JSON.parse(bi[0] || '{}');
		const m = gui.items?.[0]?.materials?.[0];
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ oNhapTrenDongNguyenLieu: oNhap, canPb, materialGui: m }) });
		// Hành vi thật: KHOÁ theo công thức — dòng nguyên liệu không có ô nhập lượng; payload gửi đúng định mức × SL.
		expect(oNhap, 'Dòng nguyên liệu CÓ ô nhập lượng — hệ thống cho sửa tay (cần chốt kỳ vọng giá vốn theo lượng đã sửa)').toBe(0);
		expect(bi.length, 'Không bắt được payload lập phiếu').toBe(1);
		expect(Number(m?.quantity), 'Lượng nguyên liệu gửi lên ≠ định mức × SL').toBeCloseTo(d.coCongThuc.dinhMuc * 2, 4);
	});

	test('09_020_002 — Màu chữ nút Lô serial phản ánh tình trạng nhập', async ({ page }) => {
		chanNeuTat('09_020_002');
		const { sx: d } = sx.duLieu();
		await chanTao(page);
		const dr = await sx.moForm(page, 'seed_gdv');
		const the = await sx.chonThanhPham(page, dr, d.coCongThuc.tenSanPham);
		const nutNl = the.locator('.grid').first().getByRole('button', { name: 'Lô / serial' });
		const nutTp = the.getByRole('button', { name: 'Lô / serial' }).first();
		const m = {};
		m.tpBanDau = await mau(nutTp);
		await expect.poll(() => mau(nutNl), { timeout: 20_000 }).not.toBe('');
		m.nlTuPhanBo = await mau(nutNl);
		// Chốt phân bổ tay (thôi tự phân bổ) rồi tăng SL ⇒ lô đã chọn thiếu so với "Cần".
		await nutNl.click();
		const pb = page.locator('.ant-drawer-open').filter({ hasText: 'Phân bổ lô tiêu hao' }).last();
		await pb.getByRole('button', { name: 'Xác nhận' }).click();
		await expect(pb).toBeHidden();
		await sx.datSoLuong(page, the, 3);
		m.nlThieu = await mau(nutNl);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify(m) + ' — "đỏ = chưa nhập gì" KHÔNG dựng được qua UI: FE tự sinh mã lô thành phẩm và tự phân bổ lô cũ nhất cho nguyên liệu ngay khi chọn.' });
		expect(m.tpBanDau, 'Nút Lô/serial thành phẩm (đã tự sinh mã lô) không xanh').toBe('text-green-600');
		expect(m.nlTuPhanBo, 'Nguyên liệu đã phân bổ đủ mà nút không xanh').toBe('text-green-600');
		expect(m.nlThieu, 'Lô nguyên liệu phân bổ THIẾU so với "Cần" mà nút không cam').toBe('text-orange-500');
	});
	test('09_020_003 — Bỏ trống lô / serial khi thành phẩm yêu cầu', async ({ page }) => {
		chanNeuTat('09_020_003');
		const { sx: d } = sx.duLieu();
		test.skip(!d.coSerial, 'Sổ seed chưa có thành phẩm quản lý serial — chạy 00_seed bước 10.');
		const bi = await chanTao(page);
		const dr = await sx.moForm(page, 'seed_gdv');
		const the = await sx.chonThanhPham(page, dr, d.coSerial.tenSanPham);
		await sx.datSoLuong(page, the, 2);
		const nutTp = the.getByRole('button', { name: 'Lô / serial' }).first();
		const m = { mauChuaSerial: await mau(nutTp) };
		// Bỏ trống serial → Lưu.
		m.trong = (await sx.luu(page, dr, 8_000)).thongBao;
		// Nhập thiếu (1/2) và thừa (3/2) trong drawer serial thành phẩm.
		await nutTp.click();
		const ds = page.locator('.ant-drawer-open').filter({ hasText: 'Lô / serial sản phẩm sản xuất' }).last();
		await expect(ds).toBeVisible();
		const o = ds.getByRole('combobox').first();
		const h = Date.now().toString().slice(-6);
		const ok = ds.getByRole('button', { name: 'Xác nhận' });
		await o.fill(`AUTO09S${h}1`); await o.press('Enter');
		m.thieu = { dem: sx.chuan(await ds.getByText(/Đã nhập:/).innerText()), okKhoa: await ok.isDisabled() };
		for (const x of [2, 3]) { await o.fill(`AUTO09S${h}${x}`); await o.press('Enter'); }
		m.thua = { dem: sx.chuan(await ds.getByText(/Đã nhập:/).innerText()), okKhoa: await ok.isDisabled() };
		await ds.getByRole('button', { name: 'Hủy' }).click();
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ ...m, daGui: bi.length }) });
		expect(m.trong, 'Bỏ trống serial thành phẩm mà Lưu không bị chặn đúng thông báo').toContain(`Thành phẩm "${d.coSerial.tenSanPham}" cần nhập đủ 2 serial`);
		expect(m.thieu.okKhoa, 'Nhập THIẾU serial (1/2) mà vẫn Xác nhận được').toBe(true);
		expect(m.thua.okKhoa, 'Nhập THỪA serial (3/2) mà vẫn Xác nhận được').toBe(true);
		expect(bi.length, 'Thiếu serial mà vẫn gửi request lập phiếu').toBe(0);
	});
	test('09_020_001 — Nút Lô serial có ở hai chỗ với hai nhiệm vụ khác nhau', async ({ page }) => {
		chanNeuTat('09_020_001');
		// Nguồn `ProductionCreateDrawer.jsx`: thanh xám thẻ thành phẩm → `ProductionBatchSerialDrawer` ("Lô / serial sản phẩm sản xuất");
		// cuối dòng nguyên liệu → `BatchLotAllocate` ("Phân bổ lô tiêu hao"). Chỉ mở/đóng — không lưu phiếu.
		const { sx: d } = sx.duLieu();
		const dr = await sx.moForm(page, 'seed_gdv');
		const the = await sx.chonThanhPham(page, dr, d.coCongThuc.tenSanPham);
		await sx.datSoLuong(page, the, 1);
		const thanhXam = the.locator('.bg-gray-200').first();
		const nutTp = thanhXam.getByRole('button', { name: /Lô \/ serial/ });
		const dongNl = the.locator('.grid').first();
		const nutNl = dongNl.getByRole('button', { name: /Lô \/ serial/ });
		const moVaDoc = async (nut) => {
			await nut.click();
			const x = page.locator('.ant-drawer-open').last();
			await page.waitForTimeout(1_200);
			const tieuDe = sx.chuan(await x.locator('.ant-drawer-title').innerText());
			const noi = sx.chuan(await x.locator('.ant-drawer-body').innerText()).slice(0, 200);
			await x.locator('.ant-drawer-close').click();
			await page.waitForTimeout(800);
			return { tieuDe, noi };
		};
		expect(await nutTp.count(), 'Thanh xám thẻ thành phẩm không có nút "Lô / serial"').toBe(1);
		expect(await nutNl.count(), 'Dòng nguyên liệu không có nút "Lô / serial"').toBe(1);
		const tp = await moVaDoc(nutTp);
		const nl = await moVaDoc(nutNl);
		test.info().annotations.push({ type: 'đo', description: `thành phẩm: ${JSON.stringify(tp)} · nguyên liệu (${sx.chuan(await dongNl.innerText()).slice(0, 80)}): ${JSON.stringify(nl)}` });
		expect(tp.tieuDe, 'Nút ở thanh xám không phải ghi lô/serial THÀNH PHẨM').toBe('Lô / serial sản phẩm sản xuất');
		expect(nl.tieuDe, 'Nút cuối dòng nguyên liệu không phải chọn lô tồn bị trừ').toBe('Phân bổ lô tiêu hao');
	});
});
