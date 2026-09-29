'use strict';

/**
 * 04_3 · 020 / 050 — Lô hàng khi NHẬP kho (nhập + duyệt ngay bằng nút "Nhập kho"), vai `seed_gdv`,
 * điểm bán seed của làn.
 *
 * 🔴 Ở cấp điểm bán chỉ SP giá tiêu chuẩn nhập tay được (xem `ghi-kho.js`), và ô "Mức giá" của SP
 * giá tiêu chuẩn KHÔNG sửa được (cố định = `macPrice` của đơn vị, `resolveStandardMacFields`).
 * Đối chiếu lô bằng `GET /stock/v2/batch-product` (mã lô, remainQuantity, price, NSX/HSD).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const k = require('./ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_gdv';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const NSX = '01/09/2026';
const HSD = '01/09/2027';

async function danhSachLo(page, st, shopId, sp) {
	const b = await k.goiApi(page, st, '/stock/v2/batch-product', { shopId, productId: sp.productId, variantId: sp.variantId, size: 500 });
	return b.data || [];
}

/** Bấm "Nhập kho" (tạo + duyệt), trả về { tao, duyet }. */
async function nhapNgay(page, dr) {
	const choDuyet = page.waitForResponse((r) => r.url().includes('/import-export/confirm'), { timeout: 60_000 });
	const { body } = await k.bamVaCho(page, dr.getByRole('button', { name: /^Nhập kho$/ }).last(), '/stock/v3/import-export?');
	expect(String(body?.status?.code), `Tạo phiếu nhập lỗi: ${body?.status?.message}`).toBe('200');
	const duyet = await (await choDuyet).json();
	expect(String(duyet?.status?.code), `Duyệt phiếu nhập lỗi: ${duyet?.status?.message}`).toBe('200');
	return { tao: body.data, duyet };
}

/** Ngày (+7) của mốc epoch ms mà API lô trả về — hệ thống lưu giờ Việt Nam. */
const ngayVn = (ms) => new Date(Number(ms) + 7 * 3600 * 1000).toISOString().slice(0, 10);

/** Mã lô duy nhất cho lượt chạy: `<tiền tố làn>L<giờ phút giây>`. */
const maLoMoi = (hau = '') => `${process.env.VNPOST_LANE ? `A${process.env.VNPOST_LANE}` : 'A'}L${Date.now().toString().slice(-7)}${hau}`;

test.describe('04_3 · 020/050 — Lô hàng khi nhập kho (điểm bán seed)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('04_3_020_017 — Lô hàng khi nhập kho', async ({ page }) => {
		chanNeuTat('04_3_020_017');
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const dr = await k.moFormNhap(page, VAI);
		const { sp: tc, dong } = await k.themSanPham(page, dr, sp.tieuChuan.tenSanPham);
		// Mã lô FE tự sinh khi thêm dòng (MAC / giá tiêu chuẩn bỏ trống mã lô ⇒ hệ thống tự sinh).
		const tuSinh = k.chuan(await dong.locator('td').nth(7).innerText()).split(' ')[0];
		expect(tuSinh, 'Dòng mới không có mã lô tự sinh').toMatch(/^\w{6,}$/);

		const ma = maLoMoi();
		await dong.locator('input[role="spinbutton"]').first().fill('3');
		await k.nhapLo(page, dong, [{ ma, nsx: NSX, hsd: HSD }]);
		await nhapNgay(page, dr);

		const lo = (await danhSachLo(page, st, shopId, tc)).find((l) => l.batchCode === ma);
		expect(lo, `Không thấy lô ${ma} sau khi nhập`).toBeTruthy();
		expect(Number(lo.remainQuantity), 'Tồn lô mới sai').toBe(3);
		expect(ngayVn(lo.expiryDate), 'Hạn sử dụng lô sai').toBe('2027-09-01');
		expect(ngayVn(lo.manufactureDate), 'Ngày sản xuất lô sai').toBe('2026-09-01');
	});

	test('04_3_020_016 — Giá vốn sau nhập kho sản phẩm giá tiêu chuẩn', async ({ page }) => {
		chanNeuTat('04_3_020_016');
		const { shopId, sp } = k.duLieuSeed();
		const giaChuan = Number(sp.tieuChuan.giaTieuChuan);
		expect(giaChuan).toBeGreaterThan(0);
		const st = k.batHeader(page);
		const dr = await k.moFormNhap(page, VAI);
		const { sp: tc, dong } = await k.themSanPham(page, dr, sp.tieuChuan.tenSanPham);
		const ma = maLoMoi();
		await k.nhapLo(page, dong, [{ ma, nsx: NSX, hsd: HSD }]);
		const { tao } = await nhapNgay(page, dr);

		const ct = await k.chiTietPhieu(page, st, shopId, tao.stockInOutId);
		expect(Number(ct.items[0].basePrice), 'Giá vốn dòng nhập ≠ đơn giá tiêu chuẩn').toBe(giaChuan);
		const lo = (await danhSachLo(page, st, shopId, tc)).find((l) => l.batchCode === ma);
		expect(Number(lo?.price), 'Giá vốn lô mới ≠ đơn giá tiêu chuẩn').toBe(giaChuan);
		// Lô cũ vẫn mang đơn giá tiêu chuẩn — phương pháp không bình quân lại.
		for (const l of (await danhSachLo(page, st, shopId, tc)).filter((x) => Number(x.remainQuantity) > 0)) {
			expect(Number(l.price), `Lô ${l.batchCode} đổi giá vốn khỏi đơn giá tiêu chuẩn`).toBe(giaChuan);
		}
	});

	test('04_3_020_008 — Nhập kho từ nội bộ cửa hàng', async ({ page }) => {
		chanNeuTat('04_3_020_008');
		// 🔴 Form cấp điểm bán không có ô "Nhập từ" — mọi phiếu nhập tay đi `objectType=SHOP`, màn chi
		//    tiết ghi "Nhập từ: Nội bộ". Đó chính là nguồn "nội bộ cửa hàng" của case này.
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const dr = await k.moFormNhap(page, VAI);
		const { sp: tc, dong } = await k.themSanPham(page, dr, sp.tieuChuan.tenSanPham);
		const tonTruoc = await k.tonVariant(page, st, shopId, tc.productId, tc.variantId);
		await dong.locator('input[role="spinbutton"]').first().fill('2');
		await k.nhapLo(page, dong, [{ ma: maLoMoi(), nsx: NSX, hsd: HSD }]);
		const { tao } = await nhapNgay(page, dr);

		expect(await k.tonVariant(page, st, shopId, tc.productId, tc.variantId), 'Tồn không tăng đúng 2').toBe(tonTruoc + 2);
		const ct = await k.chiTietPhieu(page, st, shopId, tao.stockInOutId);
		expect(ct.objectType, 'Phiếu không mang nguồn nội bộ').toBe('SHOP');
		expect(Number(ct.objectId), 'Phiếu nội bộ lại gắn một đối tượng (NCC?)').toBe(0);
		// Không phát sinh công nợ: phiếu không có dòng lịch sử công nợ nào.
		expect(ct.debtHistoryIds ?? [], 'Phiếu nhập nội bộ sinh công nợ').toEqual([]);
		const ctMan = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu nhập kho' }).last();
		await expect(ctMan, 'Màn chi tiết không ghi "Nhập từ: Nội bộ"').toContainText(/Nhập từ\s*Nội bộ/);
	});

	test('04_3_050_001 — Nhập thêm lô mới không ảnh hưởng lô cũ', async ({ page }) => {
		chanNeuTat('04_3_050_001');
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const dr = await k.moFormNhap(page, VAI);
		const { sp: tc, dong } = await k.themSanPham(page, dr, sp.tieuChuan.tenSanPham);
		const truoc = (await danhSachLo(page, st, shopId, tc)).filter((l) => Number(l.remainQuantity) > 0);
		expect(truoc.length, 'SP chưa có lô cũ còn tồn').toBeGreaterThan(0);
		const ma = maLoMoi();
		await dong.locator('input[role="spinbutton"]').first().fill('2');
		await k.nhapLo(page, dong, [{ ma, nsx: NSX, hsd: HSD }]);
		await nhapNgay(page, dr);

		const sau = await danhSachLo(page, st, shopId, tc);
		for (const c of truoc) {
			const s = sau.find((l) => l.batchProductId === c.batchProductId);
			expect(s, `Lô cũ ${c.batchCode} biến mất`).toBeTruthy();
			expect([s.batchCode, Number(s.remainQuantity), Number(s.price), s.expiryDate], `Lô cũ ${c.batchCode} bị đổi`)
				.toEqual([c.batchCode, Number(c.remainQuantity), Number(c.price), c.expiryDate]);
		}
		const moi = sau.filter((l) => l.batchCode === ma);
		expect(moi.length, 'Lô mới không phải một dòng riêng').toBe(1);
		expect(Number(moi[0].remainQuantity)).toBe(2);
	});

	test('04_3_050_003 — Nhập lô mới TRÙNG mã lô đã có — chọn gộp lô', async ({ page }) => {
		chanNeuTat('04_3_050_003');
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const dr = await k.moFormNhap(page, VAI);
		const { sp: tc, dong } = await k.themSanPham(page, dr, sp.tieuChuan.tenSanPham);
		const cu = (await danhSachLo(page, st, shopId, tc)).filter((l) => Number(l.remainQuantity) > 0).pop();
		expect(cu, 'SP chưa có lô còn tồn để trùng mã').toBeTruthy();
		await k.nhapLo(page, dong, [{ ma: cu.batchCode, nsx: NSX, hsd: HSD }]);

		// Kỳ vọng: hệ thống phát hiện trùng mã lô và cho CHỌN gộp / đổi tên TRƯỚC khi ghi.
		const daGui = [];
		page.on('response', async (r) => {
			if (r.url().includes('/stock/v3/import-export') && r.request().method() === 'POST') {
				daGui.push(`${r.url().split('?')[0].split('/').pop()}→${(await r.json().catch(() => ({})))?.status?.message}`);
			}
		});
		await dr.getByRole('button', { name: /^Nhập kho$/ }).last().click();
		const hoi = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').filter({ hasText: /trùng|gộp/i });
		const coHoi = await hoi.first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false);
		await page.waitForTimeout(3_000);
		const sau = (await danhSachLo(page, st, shopId, tc)).filter((l) => l.batchCode === cu.batchCode);
		expect(coHoi, `Không có hộp thoại chọn gộp / đổi tên khi trùng mã lô ${cu.batchCode}. `
			+ `Đo được: request ghi [${daGui.join(' · ')}]; sau đó có ${sau.length} dòng lô mã này, tồn ${sau.map((l) => l.remainQuantity).join(' + ')}`).toBe(true);
	});

	test('04_3_050_004 — Nhập lô mới trùng mã lô — chọn đổi tên lô mới', async ({ page }) => {
		chanNeuTat('04_3_050_004');
		const { shopId, sp } = k.duLieuSeed();
		const st = k.batHeader(page);
		const { daGoi } = await require('./warehouse-page').chanGhi(page);
		const dr = await k.moFormNhap(page, VAI);
		const { sp: tc, dong } = await k.themSanPham(page, dr, sp.tieuChuan.tenSanPham);
		const cu = (await danhSachLo(page, st, shopId, tc)).filter((l) => Number(l.remainQuantity) > 0).pop();
		expect(cu).toBeTruthy();
		await k.nhapLo(page, dong, [{ ma: cu.batchCode, nsx: NSX, hsd: HSD }]);
		// 🚫 Không ghi: chỉ kiểm có lựa chọn "đổi tên lô mới" trước khi gửi.
		await dr.getByRole('button', { name: /^Nhập kho$/ }).last().click();
		const hoi = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').filter({ hasText: /trùng|đổi tên/i });
		const coHoi = await hoi.first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false);
		expect(coHoi, `Không có lựa chọn "đổi tên lô mới" khi trùng mã lô ${cu.batchCode} (đã chặn ghi: ${daGoi.length} request bị chặn)`).toBe(true);
	});
});
