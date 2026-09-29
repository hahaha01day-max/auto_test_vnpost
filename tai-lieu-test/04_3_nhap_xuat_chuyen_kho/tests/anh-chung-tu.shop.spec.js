'use strict';

/**
 * 04_3 · 010_016 — Tải xuống ảnh chứng từ của phiếu nhập, GHI (26/09/2026). Vai chính `shop`, phiên phụ `seed_gdv` lập phiếu
 * (Cửa hàng trưởng bị tắt CREATE_IMPORT_STOCK).
 *
 * Tiền đề tự dựng: upload 1 ảnh PNG bằng đúng API FE dùng (`utils/service/fileService.js › uploadFormData`: hỏi
 * `GET /file/storage-config` ⇒ SEAWEEDFS: presign → PUT → complete; còn lại `POST /file/v2/shop/{shopId}/image/upload`, field `files`),
 * rồi nhập phiếu `POST /stock/v3/import-export` kèm `imageIds` (1 cái SP giá tiêu chuẩn) + duyệt. Mở chi tiết phiếu ở màn
 * Lịch sử xuất nhập kho (`DrawerDetailImportReceipt`) tìm ảnh / nút tải.
 * 🔴 Code FE: khối "Hình ảnh chứng từ đính kèm" của drawer chi tiết đang bị COMMENT (`DrawerDetailImportReceipt.jsx` ~dòng 1076).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const zlib = require('node:zlib');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chon } = require('../../shared/db/otp');
const k = require('./ghi-kho');
const { moLichSu, khung, chuan } = require('./warehouse-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const hau = () => Date.now().toString().slice(-7);

/** PNG 8×8 đỏ hợp lệ (tự sinh, không đọc file ngoài). */
function png() {
	const crc = (b) => { let c = ~0; for (const x of b) { c ^= x; for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
	const khoi = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
	const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(8, 0); ihdr.writeUInt32BE(8, 4); ihdr[8] = 8; ihdr[9] = 2;
	const raw = Buffer.concat(Array.from({ length: 8 }, () => Buffer.concat([Buffer.from([0]), Buffer.from(Array(8).fill([255, 0, 0]).flat())])));
	return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), khoi('IHDR', ihdr), khoi('IDAT', zlib.deflateSync(raw)), khoi('IEND', Buffer.alloc(0))]);
}

async function uploadAnh(p, shopId, buf, ten) {
	const base = `${process.env.VNPOST_BASE_URL}/__api`;
	const cfg = await p.page.request.get(`${base}/file/storage-config`, { headers: p.st.h }).then((r) => r.json()).catch(() => ({}));
	const nhaCc = String(cfg?.data?.provider || 'DISK').toUpperCase();
	if (nhaCc.startsWith('SEAWEED')) {
		const pre = (await k.goiGhi(p.page, p.st, 'POST', `/file/v3/shop/${shopId}/presign-upload`, {}, { fileName: ten, contentType: 'image/png', fileSize: buf.length, prefix: 'attachments' }))?.data;
		const put = await p.page.request.fetch(pre.uploadUrl, { method: 'PUT', data: buf, headers: { 'Content-Type': 'image/png' } });
		expect(put.ok(), `PUT ảnh lên SeaweedFS lỗi ${put.status()}`).toBe(true);
		const xong = await k.goiGhi(p.page, p.st, 'POST', `/file/v3/shop/${shopId}/complete-upload`, {}, { objectKey: pre.objectKey, fileName: ten, contentType: 'image/png', fileSize: buf.length });
		return { nhaCc, f: xong?.data };
	}
	const r = await p.page.request.fetch(`${base}/file/v2/shop/${shopId}/image/upload`, { method: 'POST', headers: p.st.h, multipart: { files: { name: ten, mimeType: 'image/png', buffer: buf } } });
	const b = await r.json().catch(() => ({}));
	return { nhaCc, f: (b?.data || [])[0], raw: b?.status };
}

test.describe('04_3 · 010 — Ảnh chứng từ (GHI)', () => {
	test.describe.configure({ timeout: 300_000 });

	test('04_3_010_016 — Tải xuống ảnh chứng từ', async ({ page, browser }) => {
		chanNeuTat('04_3_010_016');
		const { shopId, sp } = k.duLieuSeed();
		const g = await k.moPhienPhu(browser, 'seed_gdv', '/inventory/import');
		let ma;
		const buf = png();
		let up;
		try {
			up = await uploadAnh(g, shopId, buf, `auto_chung_tu_${hau()}.png`);
			expect(up.f?.fileId, `Upload ảnh (${up.nhaCc}) không trả fileId: ${JSON.stringify(up.raw ?? up.f)}`).toBeTruthy();
			// 🔴 Dòng ĐVT gốc có variant_id NULL, không mang giá ⇒ lấy dòng biến thể; giá tiêu chuẩn = mac_price (BE ép, StockImport).
			const [productId, productUnitId, variantId, unit, gia] = chon(`select product_id, product_unit_id, variant_id, unit, mac_price from CHAIN_PRODUCT_UNIT where sku='${sp.tieuChuan.sku}' and convert_to_main_unit=1 and variant_id is not null limit 1`, 'VNPOST_CORE').split('\t');
			const kho = (await k.goiGhi(g.page, g.st, 'GET', `/shops/${shopId}/inventory`))?.data;
			const khoId = ((Array.isArray(kho) ? kho : kho?.content || []).find((x) => x.isDefault || x.defaultInventory) || (Array.isArray(kho) ? kho : kho?.content || [])[0])?.id;
			ma = `NK${hau()}AT`;
			const ngay = new Date().toISOString().slice(0, 10);
			const r = await k.goiGhi(g.page, g.st, 'POST', '/stock/v3/import-export', { shopId }, {
				code: ma, objectId: 0, objectType: 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [up.f.fileId], paidAmount: 0, note: 'AUTO TEST 04_3_010_016 ảnh chứng từ',
				actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: false,
				items: [{ amount: +gia, price: +gia, productId: +productId, productName: sp.tieuChuan.tenSanPham, batchCode: null,
					batchProducts: [{ batchCode: `A${process.env.VNPOST_LANE || ''}AT${hau()}`, quantity: 1, manufactureDate: ngay, expiryDate: '2028-12-31', serials: [] }],
					quantity: 1, serials: [], totalAmount: +gia, unit, variantId: +variantId, variantName: null, itemId: null, shopId, inventoryId: khoId, productUnit: unit, convertToMainUnit: 1, productUnitId: +productUnitId }],
			});
			const id = r?.data?.stockInOutId ?? r?.stockInOutId;
			expect(id, `Nhập phiếu kèm ảnh lỗi: ${JSON.stringify(r?.status ?? r).slice(0, 300)}`).toBeTruthy();
			await k.goiGhi(g.page, g.st, 'POST', '/stock/v3/import-export/confirm', { shopId, stockInOutId: id });
		} finally { await g.dong(); }

		// Vai shop mở chi tiết phiếu ở Lịch sử xuất nhập kho.
		const st = k.batHeader(page);
		await moLichSu(page, 'shop');
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
		const ct = [];
		page.on('response', async (res) => { if (/import-export\/\d+|stock-in-out\/\d+|import-export\/detail/.test(res.url()) && res.request().method() === 'GET') ct.push(await res.json().catch(() => null)); });
		const o = khung(page).getByPlaceholder(/Tìm|mã phiếu/i).first();
		await o.fill(ma); await o.press('Enter');
		const dong = khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: ma }).first();
		await expect(dong, `Không thấy phiếu ${ma} ở Lịch sử`).toBeVisible({ timeout: 30_000 });
		await dong.getByText(ma).first().click();
		const dr = page.locator('.ant-drawer-open').last();
		await expect(dr).toBeVisible({ timeout: 20_000 });
		await page.waitForTimeout(2_500);
		const anh = await dr.locator('.ant-image img, img[src*="file"], img[src*="attach"]').count();
		const chu = chuan(await dr.innerText());
		const imgs = ct.flatMap((b) => b?.data?.images || []);
		test.info().annotations.push({ type: 'đo', description: `kho ảnh ${up.nhaCc} · fileId ${up.f.fileId} · phiếu ${ma} · API chi tiết trả ${imgs.length} ảnh ${JSON.stringify(imgs.map((x) => x.filePath || x.url)).slice(0, 200)} · drawer: ${anh} thẻ ảnh · có chữ "Hình ảnh chứng từ": ${/Hình ảnh chứng từ/.test(chu)}` });
		expect(anh, '🔴 Drawer chi tiết phiếu không hiện ảnh chứng từ (khối ảnh bị comment trong DrawerDetailImportReceipt) ⇒ không có chỗ tải ảnh').toBeGreaterThan(0);
		// Có ảnh thì tải về và so byte với ảnh đã upload.
		const src = await dr.locator('.ant-image img, img[src*="file"], img[src*="attach"]').first().getAttribute('src');
		const tai = await page.request.get(src);
		expect(tai.ok(), `Tải ảnh ${src} lỗi ${tai.status()}`).toBe(true);
		expect(Buffer.compare(await tai.body(), buf), 'Ảnh tải về khác ảnh đã upload').toBe(0);
	});
});
