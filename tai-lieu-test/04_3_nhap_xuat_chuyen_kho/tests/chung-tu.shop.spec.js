'use strict';

/**
 * 04_3 · 010 — Chứng từ đính kèm phiếu (upload / giới hạn / xoá), vai `shop`, điểm bán seed.
 *
 * Nguồn (vnpost-web af8cda07): nút "Chứng từ" ở chân drawer chi tiết phiếu mở `InvoiceFileDrawer`
 * (`features/purchaseOrder/components/InvoiceFileSection.jsx`): `MAX_FILES = 10`, `MAX_SIZE = 10MB`,
 * upload ngay khi chọn file (`POST /invoice-file/stock-in-out/<id>`), danh sách
 * `GET /invoice-file/stock-in-out/<id>`, xoá qua modal "Xoá hoá đơn?".
 * 🔴 Đủ 10 file thì ô upload BIẾN MẤT ⇒ "vượt giới hạn" chỉ thử được bằng một lượt chọn nhiều file.
 *
 * Phiếu dùng: phiếu nhập ĐÃ DUYỆT mới nhất ở trang đầu danh sách của điểm bán seed.
 * Mỗi case dọn sạch file đã upload trong `finally` để phiếu trở về 0 chứng từ.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const zlib = require('node:zlib');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('./ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const MAX_FILES = 10;
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

/** PNG 4×4 hợp lệ, màu theo chỉ số — mỗi file khác nội dung. */
function taoPng(dir, i) {
	const crc = (buf) => {
		let c = ~0;
		for (const b of buf) {
			c ^= b;
			for (let j = 0; j < 8; j += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
		}
		return ~c >>> 0;
	};
	const khoi = (t, d) => {
		const len = Buffer.alloc(4);
		len.writeUInt32BE(d.length);
		const td = Buffer.concat([Buffer.from(t), d]);
		const c = Buffer.alloc(4);
		c.writeUInt32BE(crc(td));
		return Buffer.concat([len, td, c]);
	};
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(4, 0);
	ihdr.writeUInt32BE(4, 4);
	ihdr.set([8, 2, 0, 0, 0], 8);
	const px = Buffer.from([(i * 37) % 256, (i * 91) % 256, (i * 53) % 256]);
	const raw = Buffer.concat(Array.from({ length: 4 }, () => Buffer.concat([Buffer.from([0]), px, px, px, px])));
	const buf = Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		khoi('IHDR', ihdr),
		khoi('IDAT', zlib.deflateSync(raw)),
		khoi('IEND', Buffer.alloc(0)),
	]);
	const f = path.join(dir, `auto-chung-tu-${i}.png`);
	fs.writeFileSync(f, buf);
	return f;
}

/** Mở màn, tìm phiếu nhập đã duyệt của auto test, mở chi tiết + drawer Chứng từ. */
async function moChungTu(page, testInfo) {
	const { shopId } = k.duLieuSeed();
	const st = k.batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/import`, VAI);
	await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 60_000 });
	const ds = await k.goiApi(page, st, '/stock/v2/import-export/find', {
		shopId, type: 'IMPORT', page: 0, size: 50, sort: 'actionTime,DESC',
	});
	// 🔴 Chỉ xét 10 phiếu đầu = trang đầu của bảng (size 10) — phiếu cũ hơn không bấm được.
	const phieu = (ds.data || []).slice(0, 10).find((x) => x.status !== 'DRAFT' && x.type === 'IMPORT');
	test.skip(!phieu, 'Trang đầu danh sách không có phiếu nhập đã duyệt — chạy 04_3_020_017 / 020_004 trước.');
	const mo = async () => {
		const dong = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: phieu.code }).first();
		await expect(dong, `Phiếu ${phieu.code} không ở trang đầu danh sách`).toBeVisible();
		await dong.getByText(phieu.code).click();
		const ct = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu nhập kho' }).last();
		await expect(ct).toBeVisible();
		const cho = page.waitForResponse((r) => r.url().includes(`/invoice-file/stock-in-out/${phieu.stockInOutId}`) && r.request().method() === 'GET');
		await ct.getByRole('button', { name: 'Chứng từ' }).click();
		const files = (await (await cho).json()).data || [];
		// 🔴 Lọc theo TIÊU ĐỀ, 🚫 không theo chữ "Upload chứng từ" — đủ 10 file thì khối upload biến mất.
		const dr = page
			.locator('.ant-drawer-open')
			.filter({ has: page.locator('.ant-drawer-title', { hasText: /^Chứng từ$/ }) })
			.last();
		await expect(dr).toBeVisible();
		return { dr, files };
	};
	const { dr, files } = await mo();
	const dir = testInfo.outputPath('anh');
	fs.mkdirSync(dir, { recursive: true });
	return { st, phieu, dr, files, mo, dir };
}

async function danhSach(page, st, id) {
	return (await k.goiApi(page, st, `/invoice-file/stock-in-out/${id}`)).data || [];
}

/** Upload một lượt nhiều file, chờ đủ `soChoDoi` response POST. */
async function upload(page, dr, files, soChoDoi) {
	let n = 0;
	const xong = new Promise((resolve) => {
		const f = (r) => {
			if (r.url().includes('/invoice-file/stock-in-out/') && r.request().method() === 'POST') {
				n += 1;
				if (n >= soChoDoi) {
					page.off('response', f);
					resolve();
				}
			}
		};
		page.on('response', f);
	});
	await dr.locator('input[type=file]').setInputFiles(files);
	await Promise.race([xong, page.waitForTimeout(90_000)]);
	return n;
}

/** Xoá một file qua giao diện (nút Xoá của thẻ theo tên file → modal "Xoá hoá đơn?"). */
async function xoaMot(page, dr, ten) {
	const the = dr.locator('.border.rounded-md').filter({ hasText: ten }).first();
	await the.locator('button.ant-btn-dangerous').click();
	const md = page.locator('.ant-modal-confirm').last();
	await expect(md).toContainText('Xoá hoá đơn?');
	const cho = page.waitForResponse((r) => r.url().includes('/invoice-file/') && r.request().method() === 'DELETE');
	await md.getByRole('button', { name: 'Xoá' }).click();
	const res = await cho;
	expect(String((await res.json())?.status?.code), `Xoá ${ten} lỗi`).toBe('200');
	await expect(the).toBeHidden();
}

/** Dọn: xoá mọi file có tên bắt đầu `auto-chung-tu-` còn trên phiếu. */
async function donSach(page, ctx) {
	for (let vong = 0; vong < MAX_FILES + 2; vong += 1) {
		const con = (await danhSach(page, ctx.st, ctx.phieu.stockInOutId)).filter((f) => f.filename.startsWith('auto-chung-tu-'));
		if (!con.length) return;
		await xoaMot(page, ctx.dr, con[0].filename);
	}
}

test.describe('04_3 · 010 — Chứng từ đính kèm phiếu (điểm bán seed)', () => {
	test.describe.configure({ timeout: 300_000 });

	test('04_3_010_014 — Upload chứng từ đi kèm phiếu', async ({ page }, testInfo) => {
		chanNeuTat('04_3_010_014');
		const ctx = await moChungTu(page, testInfo);
		try {
			const truoc = ctx.files.length;
			const f = taoPng(ctx.dir, 1);
			expect(await upload(page, ctx.dr, [f], 1)).toBe(1);
			await expect(ctx.dr).toContainText('auto-chung-tu-1.png');

			// Tải lại trang, mở lại phiếu — file phải còn (đã lưu server).
			await page.reload();
			await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 60_000 });
			const lai = await ctx.mo();
			ctx.dr = lai.dr;
			expect(lai.files.length, 'Sau tải lại số chứng từ không tăng 1').toBe(truoc + 1);
			await expect(lai.dr).toContainText('auto-chung-tu-1.png');
		} finally {
			await donSach(page, ctx);
		}
	});

	test('04_3_010_018 — Upload đúng số lượng ảnh tối đa', async ({ page }, testInfo) => {
		chanNeuTat('04_3_010_018');
		const ctx = await moChungTu(page, testInfo);
		test.skip(ctx.files.length > 0, `Phiếu ${ctx.phieu.code} đã có ${ctx.files.length} chứng từ — case cần phiếu chưa có chứng từ.`);
		try {
			const files = Array.from({ length: MAX_FILES }, (_, i) => taoPng(ctx.dir, i + 1));
			expect(await upload(page, ctx.dr, files, MAX_FILES), `Không gửi đủ ${MAX_FILES} request upload`).toBe(MAX_FILES);
			await expect(page.locator('.ant-message-error')).toHaveCount(0);
			expect((await danhSach(page, ctx.st, ctx.phieu.stockInOutId)).length, 'Server không nhận đủ 10 file').toBe(MAX_FILES);
		} finally {
			await donSach(page, ctx);
		}
	});

	test('04_3_010_015 — Upload vượt giới hạn số ảnh chứng từ', async ({ page }, testInfo) => {
		chanNeuTat('04_3_010_015');
		const ctx = await moChungTu(page, testInfo);
		test.skip(ctx.files.length > 0, `Phiếu ${ctx.phieu.code} đã có ${ctx.files.length} chứng từ — case cần phiếu chưa có chứng từ.`);
		try {
			// Màn ghi rõ giới hạn.
			await expect(ctx.dr, 'Màn không ghi giới hạn số file').toContainText(`tối đa 10MB × ${MAX_FILES} file`);
			const files = Array.from({ length: MAX_FILES + 1 }, (_, i) => taoPng(ctx.dir, i + 1));
			// 🔴 Toast tự tắt sau ~3 giây — bắt ngay lúc hiện, 🚫 không đọc sau khi chờ 10 lượt upload.
			const thongBao = page
				.locator('.ant-message-notice')
				.filter({ hasText: `Chỉ được tối đa ${MAX_FILES} file` })
				.first()
				.waitFor({ state: 'attached', timeout: 20_000 })
				.then(() => true, () => false);
			await upload(page, ctx.dr, files, MAX_FILES);
			expect(await thongBao, `Không có thông báo "Chỉ được tối đa ${MAX_FILES} file"`).toBe(true);
			const con = await danhSach(page, ctx.st, ctx.phieu.stockInOutId);
			expect(con.length, 'File vượt giới hạn vẫn lọt lên server').toBe(MAX_FILES);
		} finally {
			await donSach(page, ctx);
		}
	});

	test('04_3_010_017 — Xoá ảnh chứng từ', async ({ page }, testInfo) => {
		chanNeuTat('04_3_010_017');
		const ctx = await moChungTu(page, testInfo);
		try {
			await upload(page, ctx.dr, [taoPng(ctx.dir, 1), taoPng(ctx.dir, 2)], 2);
			await expect(ctx.dr).toContainText('auto-chung-tu-2.png');
			await xoaMot(page, ctx.dr, 'auto-chung-tu-1.png');
			await expect(ctx.dr).toContainText('auto-chung-tu-2.png');

			await page.reload();
			await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 60_000 });
			const lai = await ctx.mo();
			ctx.dr = lai.dr;
			const ten = lai.files.map((f) => f.filename);
			expect(ten, 'Ảnh đã xoá quay lại sau khi tải lại trang').not.toContain('auto-chung-tu-1.png');
			expect(ten, 'Ảnh còn lại bị ảnh hưởng khi xoá ảnh kia').toContain('auto-chung-tu-2.png');
		} finally {
			await donSach(page, ctx);
		}
	});
});
