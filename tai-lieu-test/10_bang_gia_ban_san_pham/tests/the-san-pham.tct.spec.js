'use strict';

/**
 * 10 · 080 — Thẻ "Sản phẩm" của màn Thêm / Sửa bảng giá (27/09/2026). Vai `tct`. KHÔNG GHI: chặn mọi POST/PUT/DELETE tới pricing/price-list.
 * Nguồn vnpost-web `features/pricing/pages/PricingFormPage.jsx` (Tabs `onChange=setActiveTab` — bấm thẳng thẻ "Sản phẩm", không validate),
 * `components/tabs/TabGeneralInfo.jsx` (Radio `includeTax`: 0 = "Đơn giá chưa bao gồm VAT (Giá trước thuế)", 1 = "…đã bao gồm VAT (Giá sau thuế)"),
 * `components/tabs/TabProducts.jsx` + `components/PanelLeft.jsx` (Radio.Button "Thêm theo" Danh mục | Mã SKU, Select "Loại sản phẩm"
 * Sản phẩm thường | Combo sản phẩm — bị khoá khi includeTax = 0; ô "Nhập mã SKU" + nút áp dụng), `ProductPriceTable.jsx` (cột bảng),
 * note combo "Giá combo là giá sau VAT, hệ thống tự tính giá trước VAT…", bảng "Sản phẩm thêm mới" khi sửa.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');

const GOC = path.join(__dirname, '..');
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghiDo = (s) => test.info().annotations.push({ type: 'đo', description: String(s).slice(0, 1200) });
const D = () => seed.doc().duLieu;

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/__api/**', (r) => {
		const q = r.request();
		if (q.method() === 'GET' || /refresh-token|login|basic|search|list|bulk-fields|preview/i.test(q.url())) return r.continue();
		if (!/pric|price-list/i.test(q.url())) return r.continue();
		daGoi.push(`${q.method()} ${q.url()}`);
		return r.fulfill({ status: 403, contentType: 'application/json', body: '{"status":{"code":"403","message":"auto test chặn"}}' });
	});
	return daGoi;
}
async function moThe(page, { includeTax = 1, url = '/product/pricing/create' } = {}) {
	await moTrang(page, `${process.env.VNPOST_BASE_URL}${url}`, 'tct');
	await expect(khung(page).getByRole('tab', { name: 'Sản phẩm' })).toBeVisible({ timeout: 30_000 });
	if (includeTax !== null) {
		const nhan = includeTax === 1 ? 'Đơn giá đã bao gồm VAT (Giá sau thuế)' : 'Đơn giá chưa bao gồm VAT (Giá trước thuế)';
		await khung(page).getByText(nhan, { exact: true }).click();
		const hop = page.locator('.ant-modal-confirm').filter({ visible: true });
		if (await hop.count()) await hop.getByRole('button').last().click();
	}
	await khung(page).getByRole('tab', { name: 'Sản phẩm' }).click();
	await page.waitForTimeout(2_000);
}
async function themSku(page, sku) {
	const the = khung(page).locator('.ant-pro-card').filter({ hasText: 'Thêm Danh mục / Sản phẩm vào bảng giá' }).first();
	await the.getByText('Mã SKU', { exact: true }).click();
	const o = the.locator('textarea, input').filter({ visible: true }).last();
	await o.fill(sku);
	await the.getByRole('button', { name: /Áp dụng|Thêm/ }).filter({ visible: true }).last().click();
	await page.waitForTimeout(3_000);
}
const cotBang = async (page) => (await khung(page).locator('.ant-pro-card').filter({ hasText: /Danh sách sản phẩm được áp dụng/ }).locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);

test.describe('10 · 080 — Thẻ Sản phẩm của màn bảng giá (chặn ghi)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('10_080_001 — Giao diện thẻ Sản phẩm khi VAT là Đơn giá ĐÃ bao gồm VAT', async ({ page }) => {
		chanNeuTat('10_080_001');
		await chanGhi(page);
		await moThe(page, { includeTax: 1 });
		const macDinh = chuan(await khung(page).locator('.ant-radio-button-wrapper-checked').first().innerText());
		await themSku(page, D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		const cot = await cotBang(page);
		ghiDo(`"Thêm theo" mặc định: "${macDinh}" · cột bảng: ${cot.join(' · ')}`);
		expect(macDinh, 'Phần thêm SP không mặc định "Danh mục"').toBe('Danh mục');
		expect(cot, 'Bảng sản phẩm thiếu cột').toEqual(expect.arrayContaining(['SKU', 'Tên sản phẩm', 'Đơn vị', 'Đơn giá']));
	});

	test('10_080_002 — Giao diện thẻ Sản phẩm khi VAT là Đơn giá CHƯA bao gồm VAT', async ({ page }) => {
		chanNeuTat('10_080_002');
		await chanGhi(page);
		await moThe(page, { includeTax: 1 });
		await themSku(page, D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		const cotSau = await cotBang(page);
		await moThe(page, { includeTax: 0 });
		const macDinh = chuan(await khung(page).locator('.ant-radio-button-wrapper-checked').first().innerText());
		const loaiKhoa = await khung(page).locator('.ant-select-disabled').filter({ hasText: /Sản phẩm thường|Combo/ }).count();
		await themSku(page, D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		const cotTruoc = await cotBang(page);
		ghiDo(`sau thuế: ${cotSau.join(' · ')} · trước thuế: ${cotTruoc.join(' · ')} · mặc định "${macDinh}" · ô Loại SP bị khoá: ${loaiKhoa}`);
		expect(macDinh).toBe('Danh mục');
		expect(cotTruoc, '🔴 Bộ cột giá TRƯỚC thuế giống hệt bộ cột giá SAU thuế (kịch bản: phải thêm/bớt cột VAT)').not.toEqual(cotSau);
	});

	test('10_080_004 — Note giá combo khi bảng giá đã gồm VAT', async ({ page }) => {
		chanNeuTat('10_080_004');
		await chanGhi(page);
		await moThe(page, { includeTax: 1 });
		const the = khung(page).locator('.ant-pro-card').filter({ hasText: 'Thêm Danh mục / Sản phẩm vào bảng giá' }).first();
		await the.locator('.ant-select').filter({ hasText: /Sản phẩm thường/ }).first().click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: 'Combo sản phẩm' }).click();
		await themSku(page, D().combo.sku);
		const note = chuan(await khung(page).locator('.ant-alert').filter({ hasText: 'Giá combo' }).first().innerText().catch(() => ''));
		const ds = chuan(await khung(page).locator('.ant-pro-card').filter({ hasText: /Danh sách sản phẩm được áp dụng/ }).first().innerText().catch(() => ''));
		const tb = chuan((await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])).join(' | '));
		ghiDo(`combo ${D().combo.sku} · note: "${note}" · thông báo "${tb}" · danh sách: ${ds.slice(0, 300)}`);
		expect(note, 'Không hiện note giá combo').toMatch(/^Giá combo là giá sau VAT; hệ thống tự tí|^Giá combo là giá sau VAT, hệ thống tự tí/);
	});

	test('10_080_005 — Cây danh mục của bộ lọc theo Loại sản phẩm', async ({ page }) => {
		chanNeuTat('10_080_005');
		await chanGhi(page);
		await moThe(page, { includeTax: 1 });
		await themSku(page, D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		const the = khung(page).locator('.ant-pro-card').filter({ hasText: /Danh sách sản phẩm được áp dụng/ }).first();
		// Cây ảo chỉ vẽ ~12 nút ⇒ đo bằng response của CategoryTreeSelect (`GET /chain/product-categories?type=`, gọi lúc MOUNT / khi đổi loại).
		let resp = [];
		page.on('response', async (r) => { if (/\/chain\/product-categories/.test(r.url()) && r.request().method() === 'GET') { const b = await r.json().catch(() => null); resp.push({ type: new URL(r.url()).searchParams.get('type'), n: (b?.data || []).length }); } });
		const gom = () => (resp.length ? { types: [...new Set(resp.map((x) => x.type))].sort(), n: resp.reduce((t, x) => t + x.n, 0) } : null);
		await page.reload();
		await moThe(page, { includeTax: 1 });
		resp = [];
		await themSku(page, D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku); // thẻ danh sách mount ⇒ ô lọc nạp danh mục
		await page.waitForTimeout(2_000);
		const tatCa = gom();
		resp = [];
		await the.locator('.ant-select').filter({ hasText: 'Loại sản phẩm' }).first().click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /^Combo$/ }).click();
		await page.waitForTimeout(2_500);
		const combo = gom();
		ghiDo(`danh mục: chưa chọn loại ${JSON.stringify(tatCa)} · loại Combo ${JSON.stringify(combo)} (null = không gọi lại API — dùng dữ liệu đã nạp)`);
		expect(tatCa?.types, 'Chưa chọn loại mà không nạp danh mục cả hai loại').toEqual(['0', '10']);
		expect(combo?.types, 'Chọn loại Combo mà cây danh mục không nạp lại theo loại Combo').toEqual(['10']);
	});

	test('10_080_006 — Đổi Loại sản phẩm xoá danh mục đã chọn ở bộ lọc', async ({ page }) => {
		chanNeuTat('10_080_006');
		await chanGhi(page);
		await moThe(page, { includeTax: 1 });
		await themSku(page, D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		const the = khung(page).locator('.ant-pro-card').filter({ hasText: /Danh sách sản phẩm được áp dụng/ }).first();
		const loc = the.locator('.ant-select').filter({ hasText: 'Lọc theo danh mục' }).first();
		await loc.click();
		await page.waitForTimeout(1_500);
		const nut = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-tree-treenode');
		const soNut = await nut.count();
		for (const i of [0, 1]) await nut.nth(i).locator('.ant-select-tree-checkbox, .ant-select-tree-node-content-wrapper').first().click({ force: true }).catch(() => null);
		await page.waitForTimeout(800);
		await page.keyboard.press('Escape');
		const truoc = await loc.locator('.ant-select-selection-item').count();
		await the.locator('.ant-select').filter({ hasText: 'Loại sản phẩm' }).first().click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /^Sản phẩm$/ }).click();
		await page.waitForTimeout(1_500);
		const sau = await the.locator('.ant-select').filter({ has: page.locator('.ant-select-selection-placeholder', { hasText: 'Lọc theo danh mục' }) }).count();
		const sauChon = await loc.locator('.ant-select-selection-item').count().catch(() => 0);
		ghiDo(`nút cây mở được ${soNut} · danh mục đã chọn ${truoc} ⇒ sau đổi loại: còn ${sauChon} thẻ (ô về placeholder: ${sau > 0})`);
		expect(truoc, 'Tiền đề: không chọn được danh mục').toBeGreaterThan(0);
		expect(sau > 0 || sauChon === 0, 'Đổi Loại sản phẩm mà danh mục đã chọn vẫn giữ').toBe(true);
	});

	test('10_080_007 — Sửa bảng giá: bảng Sản phẩm thêm mới ở trên, sản phẩm hiện có ở dưới', async ({ page }) => {
		chanNeuTat('10_080_007');
		const daGoi = await chanGhi(page);
		await moThe(page, { includeTax: null, url: `/product/pricing/edit/${D().bangGiaBan.priceListId}` });
		await page.waitForTimeout(2_000);
		// SP CHƯA có trong bảng giá seed (tự doanh TD1) ⇒ phải vào bảng "Sản phẩm thêm mới".
		const moi = D().tuDoanhTinh.sanPham.TD1.sku;
		await themSku(page, moi);
		const tieuDe = (await khung(page).locator('.ant-pro-card').filter({ hasText: /Danh sách sản phẩm được áp dụng/ }).locator('*').filter({ hasText: /^Sản phẩm thêm mới$/ }).count());
		const bang = khung(page).locator('.ant-pro-card').filter({ hasText: /Danh sách sản phẩm được áp dụng/ }).locator('.ant-table');
		const n = await bang.count();
		const tren = n ? chuan(await bang.first().innerText()) : '';
		const duoi = n > 1 ? chuan(await bang.nth(1).innerText()) : '';
		ghiDo(`${n} bảng · nhãn "Sản phẩm thêm mới": ${tieuDe} · bảng trên: ${tren.slice(0, 200)} · bảng dưới: ${duoi.slice(0, 200)} · ghi bị chặn ${daGoi.length}`);
		expect(n, 'Không có 2 bảng (thêm mới + hiện có)').toBeGreaterThanOrEqual(2);
		expect(tieuDe, 'Không có nhãn "Sản phẩm thêm mới"').toBeGreaterThan(0);
		expect(tren, 'SP vừa thêm không nằm ở bảng trên').toContain(moi);
		expect(duoi, 'Bảng dưới không chứa SP đã lưu của bảng giá').toContain(D().sanPham.sanPhamTheoGiaVon.tieuChuan.sku);
		expect(duoi, 'SP vừa thêm lọt xuống bảng SP hiện có').not.toContain(moi);
	});
});
