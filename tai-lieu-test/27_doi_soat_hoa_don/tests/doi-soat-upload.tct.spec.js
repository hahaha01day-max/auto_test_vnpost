'use strict';

/**
 * 27 · Upload tệp — các case KHÔNG để lại dữ liệu, vai `tct`.
 *
 *  - 010_002 / 071_004: tệp đọc không được. FE không gửi `shopId`, BE không suy ra được shop ⇒
 *    `uploadOne` ném lỗi TRƯỚC khi lưu file (đọc `PoInvoiceReconcileServiceImpl`).
 *  - 070_006: khối "Upload chứng từ" — chặn bằng route (GET danh sách trả rỗng, POST trả 200 giả),
 *    đo đúng giới hạn phía FE; 🚫 không có file nào lên server.
 *
 * 🔴 Mọi POST khác `/po-invoice-reconcile/upload` đều bị chặn.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const P = require('./reconcile-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const input = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i.data;
};

async function chanTruUpload(page) {
	const daGoi = [];
	await page.route(/po-invoice-reconcile|invoice-file/, (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (req.url().includes('/po-invoice-reconcile/upload') && !req.url().includes('confirm=true')) {
			daGoi.push(`${req.method()} ${req.url()}`);
			return route.continue();
		}
		daGoi.push(`CHẶN ${req.method()} ${req.url()}`);
		return route.fulfill({ status: 403, contentType: 'application/json', body: '{"status":{"code":"403","message":"Bị auto test chặn"}}' });
	});
	return daGoi;
}

test('27_010_002 — Một tệp lỗi không làm hỏng cả lô', async ({ page }) => {
	const d = input('27_010_002');
	await chanTruUpload(page);
	await P.moMan(page, VAI);
	const res = await P.uploadXml(page, [
		{ name: d.tepLoi, mimeType: 'text/xml', buffer: Buffer.from('day khong phai xml <<<') },
	]);
	const tb = await P.docThongBao(page);
	test.info().annotations.push({ type: 'thông báo thật', description: `${res.status()} · ${tb}` });
	expect(tb, 'Tệp lỗi làm hỏng cả lượt upload thay vì báo "có N file lỗi parse"').toMatch(/Đã upload, có 1 file lỗi parse/);
});

test('27_071_004 — Tải lên tệp sai định dạng thay cho XML', async ({ page }) => {
	const d = input('27_071_004');
	const daGoi = await chanTruUpload(page);
	await P.moMan(page, VAI);
	await P.khung(page).getByRole('button', { name: /Upload XML/ }).click();
	const modal = page.locator('.ant-modal').filter({ hasText: 'XML' }).last();
	const input1 = modal.locator('input[type=file]');
	test.info().annotations.push({ type: 'accept', description: await input1.getAttribute('accept') });
	await input1.setInputFiles([{ name: d.tep, mimeType: 'text/plain', buffer: Buffer.from('AUTOTEST tep van ban') }]);
	await page.waitForTimeout(1_000);
	const vaoDs = await modal.locator('.ant-upload-list-item').count();
	let tb = '(không có thông báo)';
	if (vaoDs > 0) {
		// FE nhận tệp ⇒ phải bị chặn ở bước Upload.
		const cho = page.waitForResponse((r) => r.url().includes('/po-invoice-reconcile/upload'));
		await modal.getByRole('button', { name: /^Upload$/ }).click();
		await cho;
		tb = await P.docThongBao(page);
		expect(tb, 'Tệp .txt lại được coi là đối soát thành công').not.toMatch(/Đã upload và đối soát XML/);
	} else {
		tb = await P.docThongBao(page, 3_000).catch(() => '(không có thông báo)');
		expect(daGoi, 'FE bỏ tệp khỏi danh sách mà vẫn gửi upload').toEqual([]);
	}
	test.info().annotations.push({ type: 'hành vi thật', description: `${vaoDs > 0 ? 'FE nhận tệp, BE chặn' : 'FE lọc bỏ tệp (accept)'} · ${tb}` });
	expect(daGoi.filter((x) => x.startsWith('CHẶN')), 'Có request ghi ngoài upload').toEqual([]);
	const rows = await P.tim(page, 'AUTOTEST');
	expect(rows.filter((r) => /AUTOTEST/.test(r.filename ?? '')), 'Tệp sai định dạng vẫn vào danh sách').toEqual([]);
});

test('27_070_006 — Tải ảnh vượt giới hạn số lượng ở tab đối soát phiếu PO', async ({ page }) => {
	const d = input('27_070_006');
	const daGui = [];
	await page.route(/\/invoice-file\//, (route) => {
		const req = route.request();
		if (req.method() === 'GET') {
			return route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":{"code":"200"},"data":[]}' });
		}
		const ten = (req.postDataBuffer()?.toString('latin1').match(/filename="([^"]+)"/) ?? [])[1];
		daGui.push(ten);
		return route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":{"code":"200","requestId":"auto"},"data":[]}' });
	});
	await P.moManDoiSoat(page, VAI, d);
	const khoi = page.getByText('Upload chứng từ').first();
	await khoi.click();
	const input1 = page.locator('.ant-upload input[type=file]').last();
	await expect(input1).toBeAttached();
	const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
	const tep = [{ name: 'AUTOTEST_hd.xml', mimeType: 'application/xml', buffer: Buffer.from('<HDon/>') }];
	for (let i = 1; i <= d.soAnh; i += 1) tep.push({ name: `AUTOTEST_anh_${i}.png`, mimeType: 'image/png', buffer: png });
	await input1.setInputFiles(tep);
	const tb = await P.docThongBao(page).catch(() => '(không có thông báo)');
	await expect.poll(() => daGui.length, { timeout: 20_000 }).toBeGreaterThan(0);
	await page.waitForTimeout(2_000);
	test.info().annotations.push({ type: 'thông báo', description: tb }, { type: 'đã gửi', description: daGui.join(', ') });
	const anh = daGui.filter((t) => /\.png$/.test(t ?? '')).length;
	const xml = daGui.filter((t) => /\.xml$/.test(t ?? '')).length;
	expect(xml, 'File xml bị bỏ').toBe(1);
	expect(anh, `Gửi ${d.soAnh} ảnh + 1 xml mà hệ thống ghi nhận ${anh} ảnh (kỳ vọng 9)`).toBe(9);
});
