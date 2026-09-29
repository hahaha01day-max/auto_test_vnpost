'use strict';

/**
 * 20_030_003–007, 030_009 · Thẻ "Phạm vi áp dụng" (RegionSelector) của form tích điểm — vai `province`.
 * Trace `components/regionSelector/RegionSelector.jsx`: thanh "Đã chọn N đơn vị/điểm bán" + "Hiển thị các đơn vị đã chọn",
 * "Áp dụng cho" (Radio.Group), cột `.sp-column` (placeholder "Chọn tỉnh/đơn vị trước" · "Chọn xã/phường trước"),
 * đổi cấp khi đã tích ⇒ Modal "Xác nhận thay đổi".
 * 🚫 Không ghi (`chanGhi`) — trừ 030_003 lưu THẬT rồi khôi phục bản gốc ở `finally` (cấu hình toàn chuỗi).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, hopForm, moFormCapNhat, moMan, moThe } = require('./loyalty-page');
const c = require('./cau-hinh-loyalty');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'province';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

const cot = (hop, i) => hop.locator('.ant-tabs-tabpane-active .sp-column').nth(i);
const muc = (hop, i) => cot(hop, i).locator('.ant-checkbox-wrapper, [class*=item]').filter({ has: hop.page().locator('.ant-checkbox') });
const soDaChon = async (hop) => Number((chuan(await hop.locator('.ant-tabs-tabpane-active').innerText()).match(/Đã chọn\s*(\d+)/) || [])[1] ?? NaN);

async function moPhamVi(page) {
	await moMan(page, VAI);
	const hop = await moFormCapNhat(page, 0);
	expect(hop, 'Vai tỉnh không mở được form Cập nhật chương trình tích điểm').toBeTruthy();
	await moThe(page, 'Phạm vi áp dụng');
	await hop.getByText('Chọn phạm vi cụ thể').click();
	await page.waitForTimeout(2_000);
	return hop;
}

async function capApDung(hop, nhan) {
	await hop.locator('.ant-tabs-tabpane-active .ant-radio-wrapper').filter({ hasText: nhan }).first().click();
	await hop.page().waitForTimeout(1_000);
}

/** Tích mục thứ `i` của cột `ci` (bỏ qua ô "chọn tất cả" ở header). Trả tên mục. */
async function tichMuc(hop, ci, i) {
	const m = cot(hop, ci).locator('.sp-column__list .ant-checkbox-wrapper').nth(i);
	await expect(m, `Cột ${ci + 1} không có mục thứ ${i + 1}`).toBeVisible({ timeout: 15_000 });
	const ten = chuan(await m.innerText());
	await m.click();
	await hop.page().waitForTimeout(500);
	return ten;
}

test.describe('20 · Phạm vi áp dụng (vai province)', () => {
	test('20_030_004 — Cột Cấp xã phường khi chưa chọn tỉnh', async ({ page }) => {
		chanNeuTat('20_030_004');
		const { daGoi } = await chanGhi(page);
		const hop = await moPhamVi(page);
		await capApDung(hop, 'Bưu điện xã');
		const chu = chuan(await cot(hop, 1).innerText());
		ghiChu('cột 2', chu.slice(0, 200));
		expect(chu).toContain('Chọn tỉnh/đơn vị trước');
		expect(await cot(hop, 1).locator('.sp-column__list .ant-checkbox').count(), 'Chưa chọn tỉnh mà cột xã đã có ô tích').toBe(0);
		expect(daGoi).toEqual([]);
	});

	test('20_030_005 — Cột Điểm bán khi chưa chọn xã phường', async ({ page }) => {
		chanNeuTat('20_030_005');
		const { daGoi } = await chanGhi(page);
		const hop = await moPhamVi(page);
		await capApDung(hop, 'Điểm bán');
		await cot(hop, 0).locator('.sp-column__list > *').first().click(); // mở tỉnh (không tích xã)
		await page.waitForTimeout(1_500);
		const chu = chuan(await cot(hop, 2).innerText());
		ghiChu('cột 3', chu.slice(0, 200));
		expect(chu).toContain('Chọn xã/phường trước');
		expect(daGoi).toEqual([]);
	});

	test('20_030_006 — Đổi cấp Áp dụng cho sau khi đã tích đơn vị', async ({ page }) => {
		chanNeuTat('20_030_006');
		const { daGoi } = await chanGhi(page);
		const hop = await moPhamVi(page);
		await capApDung(hop, 'Bưu điện tỉnh');
		const ds = cot(hop, 0).locator('.sp-column__list .ant-checkbox-wrapper');
		const nTinh = Math.min(2, await ds.count());
		test.skip(nTinh === 0, 'Vai tỉnh không thấy đơn vị nào để tích.');
		for (let i = 0; i < nTinh; i += 1) await tichMuc(hop, 0, i);
		const truoc = await soDaChon(hop);
		await capApDung(hop, 'Bưu điện xã');
		const hoi = page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận thay đổi' });
		await expect(hoi, 'Đổi cấp khi đã tích mà không hỏi "Xác nhận thay đổi"').toBeVisible({ timeout: 10_000 });
		await hoi.getByRole('button', { name: /Hủy|Huỷ/ }).click();
		await page.waitForTimeout(800);
		expect(await soDaChon(hop), 'Bấm Hủy mà mất lựa chọn').toBe(truoc);
		expect(await hop.locator('.ant-tabs-tabpane-active .ant-radio-wrapper-checked').innerText()).toContain('Bưu điện tỉnh');
		await capApDung(hop, 'Bưu điện xã');
		await page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận thay đổi' }).getByRole('button', { name: /Đồng ý|OK|Xác nhận/ }).click();
		await page.waitForTimeout(800);
		ghiChu('đã chọn', `${truoc} → Hủy giữ ${truoc} → Đồng ý ${await soDaChon(hop)}`);
		expect(await soDaChon(hop)).toBe(0);
		expect(daGoi).toEqual([]);
	});

	test('20_030_007 — Lọc nhanh bằng ô Hiển thị các đơn vị đã chọn', async ({ page }) => {
		chanNeuTat('20_030_007');
		const { daGoi } = await chanGhi(page);
		const hop = await moPhamVi(page);
		await capApDung(hop, 'Bưu điện tỉnh');
		const ds = cot(hop, 0).locator('.sp-column__list .ant-checkbox-wrapper');
		const n = await ds.count();
		test.skip(n < 2, `Vai tỉnh chỉ thấy ${n} đơn vị — không lọc "đã chọn" có ý nghĩa.`);
		const chon = [];
		for (const i of [0, n - 1]) chon.push(await tichMuc(hop, 0, i));
		await hop.locator('.ant-checkbox-wrapper').filter({ hasText: 'Hiển thị các đơn vị đã chọn' }).click();
		await page.waitForTimeout(1_000);
		const con = (await ds.allInnerTexts()).map(chuan);
		ghiChu('lọc', `${n} → ${con.length}: ${con.join(' · ')}`);
		expect(con.sort()).toEqual(chon.sort());
		await hop.locator('.ant-checkbox-wrapper').filter({ hasText: 'Hiển thị các đơn vị đã chọn' }).click();
		await page.waitForTimeout(1_000);
		expect(await ds.count()).toBe(n);
		expect(daGoi).toEqual([]);
	});

	test('20_030_009 — Tìm đơn vị trong cột Cấp tỉnh', async ({ page }) => {
		chanNeuTat('20_030_009');
		const { daGoi } = await chanGhi(page);
		const hop = await moPhamVi(page);
		await capApDung(hop, 'Bưu điện tỉnh');
		const ds = cot(hop, 0).locator('.sp-column__list .ant-checkbox-wrapper');
		const n = await ds.count();
		const ten = chuan(await ds.first().innerText());
		const o = cot(hop, 0).locator('input[placeholder*="Tìm"]').first();
		const thu = async (tu) => {
			await o.fill(tu);
			await page.waitForTimeout(1_200);
			return (await ds.allInnerTexts()).map(chuan);
		};
		const dung = await thu(ten);
		const phan = await thu(ten.slice(0, Math.max(3, Math.floor(ten.length / 2))));
		const khong = await thu('ZZZ_KHONG_TON_TAI_123');
		const trang = await thu('     ');
		ghiChu('kết quả', `đúng "${ten}": ${dung.length} · một phần: ${phan.length} · không tồn tại: ${khong.length} · khoảng trắng: ${trang.length}/${n}`);
		expect(dung).toContain(ten);
		expect(phan).toContain(ten);
		expect(khong).toHaveLength(0);
		expect(trang.length, 'Chuỗi toàn khoảng trắng lọc mất danh sách').toBe(n);
		expect(daGoi).toEqual([]);
	});

	test('20_030_003 — Khai phạm vi tới cấp Bưu điện tỉnh', async ({ page, browser }) => {
		chanNeuTat('20_030_003');
		test.setTimeout(240_000);
		const tct = await g.k.moPhienPhu(browser, 'tct', '/care/loyalty');
		try {
			await c.chup(tct.page, tct.st);
			const hop = await moPhamVi(page);
			await capApDung(hop, 'Bưu điện tỉnh');
			// Bỏ mọi tích cũ rồi tích đúng 1 tỉnh.
			const daTick = cot(hop, 0).locator('.sp-column__list .ant-checkbox-wrapper-checked');
			for (let i = 0; i < 200 && (await daTick.count()); i += 1) await daTick.first().click();
			const ten = await tichMuc(hop, 0, 0);
			expect(await soDaChon(hop), 'Dòng "Đã chọn" không bằng 1').toBe(1);
			const cho = page.waitForResponse((r) => /campaign\/edit-campaign/.test(r.url()), { timeout: 20_000 });
			await hopForm(page).getByRole('button', { name: 'Xác nhận' }).click();
			const r = await cho;
			const body = r.request().postDataJSON();
			const b = await r.json();
			ghiChu('body', JSON.stringify({ scopeType: body.scopeType, scopes: body.scopes }));
			ghiChu('BE', JSON.stringify(b?.status));
			expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
			expect(body.scopeType).toBe('BUU_DIEN_TINH');
			expect(body.scopes).toHaveLength(1);
			const h = (await c.doc(tct.page, tct.st)).tich;
			expect(h.scopes?.map((s) => s.orgUnitCode)).toEqual([body.scopes[0].orgUnitCode]);
			ghiChu('tỉnh', `${ten} → ${body.scopes[0].orgUnitCode}`);
		} finally {
			ghiChu('khôi phục', JSON.stringify(await c.khoiPhuc(tct.page, tct.st)));
			await tct.dong();
		}
	});
});
