'use strict';

/**
 * 07_3 · 020 — Logo in hoá đơn (`/settings?setting=printer`), vai `shop` — logo của ĐIỂM BÁN SEED.
 *
 * Nguồn (vnpost-web af8cda07, `settingContents/PrinterSetting.jsx`): ô file `accept="image/jpeg,image/png,image/webp"`;
 * `handleUploadLogo` chặn sai định dạng ("Logo cửa hàng chỉ hỗ trợ JPG, PNG hoặc WEBP") và
 * `file.size > MAX_LOGO_FILE_SIZE` (**5.1 MB**) ("Logo cửa hàng không được vượt quá 5 MB"); hợp lệ thì
 * resize ≤ 800px rồi tải lên → "Cập nhật logo đơn vị thành công".
 * Ảnh test tự sinh (PNG nhiễu ngẫu nhiên, đệm chunk phụ để đúng kích thước).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const MB = 1024 * 1024;

function crc32(buf) {
	let c = ~0;
	for (const b of buf) { c ^= b; for (let j = 0; j < 8; j += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
	return ~c >>> 0;
}
function khoi(t, d) {
	const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
	const td = Buffer.concat([Buffer.from(t), d]);
	const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td));
	return Buffer.concat([len, td, c]);
}
/** PNG hợp lệ 200×200 nhiễu, đệm chunk phụ `zzTx` cho ĐÚNG `kichThuoc` byte. */
function pngDungCo(file, kichThuoc) {
	const w = 200, h = 200;
	const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
	const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), crypto.randomBytes(w * 3)])));
	const dau = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), khoi('IHDR', ihdr), khoi('IDAT', zlib.deflateSync(raw))]);
	const cuoi = khoi('IEND', Buffer.alloc(0));
	const dem = kichThuoc - dau.length - cuoi.length - 12;
	const buf = Buffer.concat([dau, khoi('zzTx', Buffer.alloc(Math.max(0, dem), 0x41)), cuoi]);
	fs.writeFileSync(file, buf);
	return buf.length;
}

async function moMan(page) {
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/settings?setting=printer`, VAI);
	const o = page.locator('input[type=file][accept*="image/png"]');
	await expect(o).toBeAttached({ timeout: 60_000 });
	return o;
}
const thongBao = (page, chu) => page.locator('.ant-message-notice').filter({ hasText: chu }).first()
	.waitFor({ state: 'attached', timeout: 20_000 }).then(() => true, () => false);

test.describe('07_3 · 020 — Logo in hoá đơn (điểm bán seed)', () => {
	test('07_3_020_003 — Chặn tải logo sai định dạng hoặc quá 5 MB', async ({ page }, ti) => {
		chanNeuTat('07_3_020_003');
		const daGui = [];
		page.on('request', (r) => { if (r.method() !== 'GET' && /logo|upload|file/i.test(r.url())) daGui.push(r.url()); });
		const o = await moMan(page);
		// 1. Sai định dạng (GIF) — đặt thẳng vào ô file (bỏ qua bộ lọc accept của hộp chọn tệp).
		const gif = ti.outputPath('logo.gif');
		fs.writeFileSync(gif, Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64'));
		const tb1 = thongBao(page, 'Logo cửa hàng chỉ hỗ trợ JPG, PNG hoặc WEBP');
		await o.setInputFiles(gif);
		expect(await tb1, 'Không báo sai định dạng logo').toBe(true);
		// 2. PNG 6 MB (> 5.1 MB).
		const lon = ti.outputPath('logo-6mb.png');
		pngDungCo(lon, 6 * MB);
		const tb2 = thongBao(page, 'Logo cửa hàng không được vượt quá 5 MB');
		await o.setInputFiles(lon);
		expect(await tb2, 'Không báo logo quá 5 MB').toBe(true);
		await page.waitForTimeout(2_000);
		expect(daGui, 'Tệp bị từ chối mà vẫn gửi request tải lên').toEqual([]);
	});

	test('07_3_020_004 — Tải logo đúng định dạng và dưới 5 MB', async ({ page }, ti) => {
		chanNeuTat('07_3_020_004');
		for (const [ten, co] of [['logo-1mb.png', 1 * MB], ['logo-5mb.png', 5 * MB]]) {
			const o = await moMan(page);
			const f = ti.outputPath(ten);
			expect(pngDungCo(f, co), 'Không dựng được ảnh đúng kích thước').toBe(co);
			const res = [];
			page.on('response', async (r) => {
				if (r.request().method() !== 'GET' && /logo|upload|file/i.test(r.url())) res.push(`${r.status()} ${r.url().split('?')[0].split('/__api')[1]} ${(await r.text().catch(() => '')).slice(0, 160)}`);
			});
			const tb = thongBao(page, 'Cập nhật logo đơn vị thành công');
			await o.setInputFiles(f);
			const ok = await tb;
			const msg = await page.locator('.ant-message-notice').allInnerTexts();
			test.info().annotations.push({ type: 'đo', description: `${ten}: ${JSON.stringify({ msg, res })}` });
			expect(ok, `Ảnh ${ten} hợp lệ mà không tải lên được: ${JSON.stringify({ msg, res })}`).toBe(true);
			// Mở lại trang: logo vẫn còn (ảnh hiện trong khối Logo cửa hàng).
			await page.reload();
			await expect(page.locator('.ant-pro-page-container, main').first().locator('img').first(), 'Mở lại không thấy logo').toBeVisible({ timeout: 30_000 });
		}
	});
});
