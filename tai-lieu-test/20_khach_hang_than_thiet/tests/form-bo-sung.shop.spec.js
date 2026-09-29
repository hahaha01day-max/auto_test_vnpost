'use strict';

/**
 * 20 · Form tích điểm / đổi điểm — các case VALIDATE / hiển thị, vai `shop`. 🚫 KHÔNG ghi: `chanGhi()` chặn mọi request
 * khác GET tới loyalty/campaign; mỗi case assert danh sách request bị chặn đúng như kỳ vọng.
 *
 * Trace `features/loyalty/pages/tabCampaign/DrawerUpdateCampaign.jsx` (25/09/2026): Switch `active`, thẻ "Đơn hàng"/"Sản phẩm"
 * (`isShowCampaignType` — chỉ ẩn khi TẠO MỚI và công tắc tắt), RangePicker `dates`, "Tích điểm sản phẩm theo ngành hàng",
 * "Chọn loại danh mục" (đổi loại ⇒ `categoryIds = null`), đối tượng "Toàn bộ khách hàng"/"Nhóm khách hàng" + ô
 * "Tìm kiếm và chọn nhóm khách hàng..." (`filterOption=false`, cuộn ⇒ `get-list` page+1). Toast: `:313` ngày bắt đầu tương lai,
 * `:318` "Bạn chưa chọn ngành hàng nào", `:329` ngày kết thúc, `:884` "Nhóm đã tồn tại trong danh sách".
 * Form TẠO MỚI chỉ có khi chuỗi CHƯA có chương trình ⇒ 010_031 giả `get-campaign` rỗng ở tầng mạng (🚫 không xoá chương trình thật).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, hopForm, khung, loiDangHien, moFormCapNhat, moMan, moThe } = require('./loyalty-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const dd = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const homNay = () => new Date();
const cong = (n) => new Date(Date.now() + n * 86_400_000);

async function bat(hop, bat = true) {
	const sw = hop.locator('.ant-switch').first();
	const dang = (await sw.getAttribute('aria-checked')) === 'true';
	if (dang !== bat) await sw.click();
	await hop.page().waitForTimeout(500);
}

/** Điền RangePicker `dates` (bắt đầu, kết thúc | null). */
async function datNgay(hop, bd, kt) {
	const rp = hop.locator('.ant-picker-range').first();
	await rp.click();
	const ins = rp.locator('input');
	await ins.nth(0).press('ControlOrMeta+a');
	await ins.nth(0).pressSequentially(dd(bd));
	// 🔴 Enter trong ô của Form là SUBMIT form (với giá trị cũ) ⇒ xác nhận ngày bằng Tab, 🚫 Enter.
	await ins.nth(0).press('Tab');
	await ins.nth(1).press('ControlOrMeta+a');
	if (kt) {
		await ins.nth(1).pressSequentially(dd(kt));
		await ins.nth(1).press('Tab');
	} else await ins.nth(1).press('Backspace');
	await hop.page().keyboard.press('Escape');
	await hop.page().waitForTimeout(500);
	return [await ins.nth(0).inputValue(), await ins.nth(1).inputValue()];
}

async function xacNhan(page) {
	await hopForm(page).getByRole('button', { name: 'Xác nhận' }).click();
	await page.waitForTimeout(2_000);
	return loiDangHien(page);
}

test.describe('20 · Form loyalty — validate bổ sung (vai shop, CHẶN GHI)', () => {
	let daGoi;
	test.beforeEach(async ({ page }) => {
		({ daGoi } = await chanGhi(page));
		await moMan(page, VAI);
	});

	test('20_010_015 — Đặt ngày bắt đầu ở tương lai rồi bật công tắc', async ({ page }) => {
		chanNeuTat('20_010_015');
		const hop = await moFormCapNhat(page, 0);
		await bat(hop, true);
		ghiChu('ngày', JSON.stringify(await datNgay(hop, cong(1), null)));
		const loi = await xacNhan(page);
		ghiChu('thông báo', loi.join(' | '));
		expect(loi.join(' | ')).toContain('Ngày bắt đầu ở trong tương lai, không thể kích hoạt chương trình');
		expect(daGoi, `Vẫn gọi API ghi: ${daGoi.join(' ; ')}`).toEqual([]);
	});

	test('20_010_016 — Đặt ngày kết thúc bằng hôm nay rồi bật công tắc', async ({ page }) => {
		chanNeuTat('20_010_016');
		const hop = await moFormCapNhat(page, 0);
		await bat(hop, true);
		ghiChu('ngày', JSON.stringify(await datNgay(hop, homNay(), homNay())));
		const loi = await xacNhan(page);
		ghiChu('thông báo', loi.join(' | '));
		expect(loi.join(' | ')).toContain('Ngày kết thúc phải lớn hơn thời gian hiện tại, không thể kích hoạt chương trình');
		expect(daGoi).toEqual([]);
	});

	test('20_010_017 — Chọn ngày kết thúc trước ngày bắt đầu', async ({ page }) => {
		chanNeuTat('20_010_017');
		const hop = await moFormCapNhat(page, 0);
		const [bd, kt] = await datNgay(hop, homNay(), cong(-1));
		ghiChu('ô ngày sau khi chọn ngược', `${bd} → ${kt}`);
		const loi = await xacNhan(page);
		ghiChu('thông báo', loi.join(' | ') || '(không)');
		// RangePicker tự đảo: ngày bắt đầu KHÔNG được lớn hơn ngày kết thúc sau khi chọn.
		const so = (s) => s.split('/').reverse().join('');
		expect(!kt || so(bd) <= so(kt), `RangePicker giữ cặp ngày ngược: ${bd} → ${kt}`).toBe(true);
		expect(loi.join(' | ')).not.toContain('Thời gian kết thúc phải sau thời gian bắt đầu');
	});

	test('20_010_023 — Tích ngành hàng nhưng để trống danh mục', async ({ page }) => {
		chanNeuTat('20_010_023');
		const hop = await moFormCapNhat(page, 0);
		await hop.getByText('Sản phẩm', { exact: true }).first().click();
		const cb = hop.getByText('Tích điểm sản phẩm theo ngành hàng');
		await expect(cb, 'Thẻ Sản phẩm không có "Tích điểm sản phẩm theo ngành hàng"').toBeVisible({ timeout: 10_000 });
		const o = hop.locator('.ant-checkbox-wrapper').filter({ hasText: 'Tích điểm sản phẩm theo ngành hàng' });
		if (!(await o.locator('.ant-checkbox-checked').count())) await o.click();
		const loi = await xacNhan(page);
		ghiChu('thông báo', loi.join(' | '));
		expect(loi.join(' | ')).toContain('Vui lòng chọn danh mục hoặc combo');
		expect(loi.join(' | ')).toContain('Bạn chưa chọn ngành hàng nào');
		expect(daGoi).toEqual([]);
	});

	test('20_010_024 — Đổi loại danh mục sau khi đã chọn danh mục', async ({ page }) => {
		chanNeuTat('20_010_024');
		const hop = await moFormCapNhat(page, 0);
		await hop.getByText('Sản phẩm', { exact: true }).first().click();
		const o = hop.locator('.ant-checkbox-wrapper').filter({ hasText: 'Tích điểm sản phẩm theo ngành hàng' });
		if (!(await o.locator('.ant-checkbox-checked').count())) await o.click();
		const loai = hop.locator('.ant-select').filter({ hasText: /Chọn loại danh mục|Danh mục sản phẩm|Danh mục combo/ }).first();
		await loai.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: 'Danh mục sản phẩm' }).click();
		const cay = hop.locator('.ant-select').filter({ hasText: 'Tìm kiếm theo danh mục' }).first();
		await cay.click();
		const nut = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-tree-checkbox');
		await expect(nut.first(), 'Cây danh mục rỗng').toBeVisible({ timeout: 15_000 });
		await nut.nth(0).click();
		if ((await nut.count()) > 1) await nut.nth(1).click();
		await page.keyboard.press('Escape');
		const truoc = await hop.locator('.ant-select-selection-item').count();
		ghiChu('đã chọn', truoc);
		expect(truoc, 'Chưa chọn được danh mục nào').toBeGreaterThan(0);
		await loai.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: 'Danh mục combo' }).click();
		await page.waitForTimeout(800);
		const hoi = await page.locator('.ant-modal-confirm').count();
		const cayChu = chuan(await hop.locator('.ant-select').filter({ has: page.locator('.ant-select-tree, [class*=tree]') }).first().innerText().catch(() => ''));
		ghiChu('sau khi đổi loại', `hộp xác nhận: ${hoi} · ô danh mục: "${cayChu}"`);
		expect(await hop.locator('.ant-form-item').filter({ hasText: /Tìm kiếm theo danh mục/ }).locator('.ant-select-selection-item').count(), 'Đổi loại danh mục mà danh mục cũ vẫn còn').toBe(0);
	});

	test('20_010_025 — Chọn trùng một nhóm khách hàng hai lần', async ({ page }) => {
		chanNeuTat('20_010_025');
		const hop = await moFormCapNhat(page, 0);
		await hop.getByText('Nhóm khách hàng', { exact: true }).click();
		const o = hop.locator('.ant-select').filter({ hasText: 'Tìm kiếm và chọn nhóm khách hàng...' }).first();
		const chonDau = async () => {
			await o.click();
			const m = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first();
			await expect(m, 'Không có nhóm khách hàng nào để chọn').toBeVisible({ timeout: 15_000 });
			const ten = chuan(await m.innerText());
			await m.click();
			await page.waitForTimeout(800);
			return ten;
		};
		const ten = await chonDau();
		const n1 = await hop.locator('.ant-table-tbody tr.ant-table-row').count();
		await chonDau();
		const loi = await loiDangHien(page);
		const n2 = await hop.locator('.ant-table-tbody tr.ant-table-row').count();
		ghiChu('nhóm', `${ten} · dòng ${n1} → ${n2} · ${loi.join(' | ')}`);
		expect(loi.join(' | ')).toContain('Nhóm đã tồn tại trong danh sách');
		expect(n2).toBe(n1);
	});

	test('20_010_026 — Chọn Nhóm khách hàng nhưng để bảng trống', async ({ page }) => {
		chanNeuTat('20_010_026');
		const hop = await moFormCapNhat(page, 0);
		await hop.getByText('Nhóm khách hàng', { exact: true }).click();
		// Bỏ hết nhóm đang có (nếu chương trình đã gắn sẵn).
		for (let i = 0; i < 20 && (await hop.getByRole('button', { name: /^X[oó]a$/ }).count()); i += 1) await hop.getByRole('button', { name: /^X[oó]a$/ }).first().click();
		const loi = await xacNhan(page);
		ghiChu('thông báo', loi.join(' | '));
		expect(loi.join(' | ')).toContain('Vui lòng chọn ít nhất một nhóm khách hàng');
		expect(daGoi).toEqual([]);
	});

	test('20_010_027 — Xoá một nhóm khách hàng khỏi bảng đã chọn', async ({ page }) => {
		chanNeuTat('20_010_027');
		const hop = await moFormCapNhat(page, 0);
		await hop.getByText('Nhóm khách hàng', { exact: true }).click();
		const o = hop.locator('.ant-select').filter({ hasText: 'Tìm kiếm và chọn nhóm khách hàng...' }).first();
		for (const i of [0, 1]) {
			await o.click();
			const m = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').nth(i);
			await expect(m).toBeVisible({ timeout: 15_000 });
			await m.click();
			await page.waitForTimeout(600);
		}
		const dong = hop.locator('.ant-table-tbody tr.ant-table-row');
		const n = await dong.count();
		expect(n, 'Không dựng được bảng 2 nhóm').toBeGreaterThanOrEqual(2);
		await dong.first().getByRole('button', { name: /X[oó]a/ }).click();
		await expect(dong).toHaveCount(n - 1);
		expect(chuan(await dong.first().locator('td').first().innerText()), 'STT không đánh lại từ 1').toBe('1');
		while (await dong.count()) await dong.first().getByRole('button', { name: /X[oó]a/ }).click();
		await expect(hop).toContainText('Chưa có nhóm khách hàng nào được chọn');
		const loi = await xacNhan(page);
		expect(loi.join(' | ')).toContain('Vui lòng chọn ít nhất một nhóm khách hàng');
		expect(daGoi).toEqual([]);
	});

	test('20_010_028 — Tìm nhóm khách hàng bằng chữ thường và không dấu', async ({ page }) => {
		chanNeuTat('20_010_028');
		const hop = await moFormCapNhat(page, 0);
		await hop.getByText('Nhóm khách hàng', { exact: true }).click();
		const o = hop.locator('.ant-select').filter({ hasText: 'Tìm kiếm và chọn nhóm khách hàng...' }).first();
		await o.click();
		const ds = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
		await expect(ds.first()).toBeVisible({ timeout: 15_000 });
		const coDau = (await ds.allInnerTexts()).map(chuan).find((t) => /[à-ỹđ]/i.test(t));
		test.skip(!coDau, 'Trang đầu danh sách nhóm không có nhóm nào tên có dấu.');
		const tu = coDau.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().split(' ').slice(0, 2).join(' ');
		const cho = page.waitForResponse((r) => /customer-group\/get-list/.test(r.url()) && new URL(r.url()).searchParams.get('keyword') === tu, { timeout: 20_000 });
		await page.keyboard.type(tu);
		const r = await cho;
		await page.waitForTimeout(1_500);
		const kq = (await ds.allInnerTexts()).map(chuan);
		ghiChu('tìm', `"${tu}" (từ "${coDau}") → ${new URL(r.url()).searchParams.get('keyword')} · ${kq.length} kết quả: ${kq.slice(0, 5).join(' · ')}`);
		expect(new URL(r.url()).searchParams.get('keyword'), 'Từ khoá không được gửi lên API').toBe(tu);
		expect(kq, `Tìm không dấu "${tu}" không ra nhóm "${coDau}" (giới hạn tìm kiếm BE)`).toContain(coDau);
	});

	test('20_010_029 — Cuộn danh sách nhóm khách hàng để tải thêm', async ({ page }) => {
		chanNeuTat('20_010_029');
		const trang = [];
		page.on('request', (r) => {
			if (/customer-group\/get-list/.test(r.url())) trang.push(Object.fromEntries(new URL(r.url()).searchParams));
		});
		const hop = await moFormCapNhat(page, 0);
		await hop.getByText('Nhóm khách hàng', { exact: true }).click();
		await hop.locator('.ant-select').filter({ hasText: 'Tìm kiếm và chọn nhóm khách hàng...' }).first().click();
		const ds = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
		await expect(ds.first()).toBeVisible({ timeout: 15_000 });
		const n0 = await ds.count();
		const hop2 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .rc-virtual-list-holder').first();
		for (let i = 0; i < 4; i += 1) {
			await hop2.evaluate((e) => e.scrollTo(0, e.scrollHeight));
			await page.waitForTimeout(1_500);
		}
		const ten = (await ds.allInnerTexts()).map(chuan);
		ghiChu('request', JSON.stringify(trang.map((t) => ({ page: t.page, size: t.size }))));
		ghiChu('số nhóm', `${n0} → ${ten.length}`);
		expect(trang.some((t) => Number(t.page) >= 1), 'Cuộn tới đáy mà không gọi trang tiếp theo').toBe(true);
		expect(new Set(ten).size, 'Danh sách có nhóm lặp').toBe(ten.length);
	});

	test('20_040_011 — Hai thẻ loại tích điểm luôn hiện ở màn Cập nhật', async ({ page }) => {
		chanNeuTat('20_040_011');
		const hop = await moFormCapNhat(page, 0);
		await expect(hop).toContainText('Cập nhật chương trình tích điểm');
		await bat(hop, false);
		await expect(hop.getByText('Đơn hàng', { exact: true }).first(), 'Tắt công tắc ở màn Cập nhật mà thẻ Đơn hàng biến mất').toBeVisible();
		await expect(hop.getByText('Sản phẩm', { exact: true }).first()).toBeVisible();
		expect(daGoi).toEqual([]);
	});

	test('20_040_014 — Không có nút xoá chương trình trên màn hình', async ({ page }) => {
		chanNeuTat('20_040_014');
		const xoa = /X[oó][aá]|Delete/;
		expect(await khung(page).getByRole('button', { name: xoa }).count(), 'Màn chính có nút xoá').toBe(0);
		for (const i of [0, 1]) {
			const hop = await moFormCapNhat(page, i);
			expect(await hop.getByRole('button', { name: /X[oó]a chương trình|Delete/ }).count(), `Form cập nhật ${i} có nút xoá chương trình`).toBe(0);
			await hop.getByRole('button', { name: /Hủy|Đóng/ }).first().click();
			await page.waitForTimeout(800);
		}
		const ct = khung(page).getByRole('button', { name: 'Xem chi tiết' });
		for (let i = 0; i < (await ct.count()); i += 1) {
			await ct.nth(i).click();
			const dr = hopForm(page);
			await dr.waitFor({ state: 'visible' });
			expect(await dr.getByRole('button', { name: xoa }).count(), `Drawer chi tiết ${i} có nút xoá`).toBe(0);
			await page.keyboard.press('Escape');
			await page.waitForTimeout(800);
		}
	});

	test('20_030_008 — Đóng form khi đang khai phạm vi dở dang', async ({ page }) => {
		chanNeuTat('20_030_008');
		let hop = await moFormCapNhat(page, 0);
		await moThe(page, 'Phạm vi áp dụng');
		const truoc = await hop.locator('.ant-radio-wrapper-checked').filter({ hasText: /Toàn hệ thống|Chọn phạm vi cụ thể/ }).innerText();
		await hop.getByText('Chọn phạm vi cụ thể').click();
		await page.waitForTimeout(1_500);
		const o = hop.locator('.ant-tabs-tabpane-active .ant-checkbox-input');
		if (await o.count()) await o.first().check({ force: true });
		ghiChu('đã tích', String(await hop.locator('.ant-tabs-tabpane-active .ant-checkbox-checked').count()));
		await hop.getByRole('button', { name: /Hủy/ }).first().click();
		await page.waitForTimeout(1_000);
		hop = await moFormCapNhat(page, 0);
		await moThe(page, 'Phạm vi áp dụng');
		const sau = await hop.locator('.ant-radio-wrapper-checked').filter({ hasText: /Toàn hệ thống|Chọn phạm vi cụ thể/ }).innerText();
		ghiChu('phạm vi', `trước: ${chuan(truoc)} · mở lại: ${chuan(sau)}`);
		expect(chuan(sau), 'Mở lại form mà phạm vi không về như trước khi sửa dở').toBe(chuan(truoc));
		expect(daGoi).toEqual([]);
	});

	test('20_020_007 — Đặt ngày bắt đầu tương lai cho chương trình đổi điểm rồi bật công tắc', async ({ page }) => {
		chanNeuTat('20_020_007');
		const hop = await moFormCapNhat(page, 1);
		await bat(hop, true);
		const rp = hop.locator('.ant-picker').first();
		await rp.click();
		const i0 = rp.locator('input').first();
		await i0.press('ControlOrMeta+a');
		await i0.pressSequentially(dd(cong(1)));
		await i0.press('Tab');
		await page.keyboard.press('Escape');
		const loi = await xacNhan(page);
		ghiChu('thông báo', loi.join(' | '));
		expect(loi.join(' | ')).toContain('Ngày bắt đầu ở trong tương lai, không thể kich hoạt chương trình');
		expect(daGoi).toEqual([]);
	});

	test('20_020_009 — Đặt ngày kết thúc đã qua cho chương trình đổi điểm rồi bật công tắc', async ({ page }) => {
		chanNeuTat('20_020_009');
		const hop = await moFormCapNhat(page, 1);
		await bat(hop, true);
		const pk = hop.locator('.ant-picker');
		const n = await pk.count();
		ghiChu('số ô ngày', n);
		const oKt = n > 1 ? pk.nth(1) : pk.first();
		await oKt.click();
		const inp = oKt.locator('input').last();
		await inp.press('ControlOrMeta+a');
		await inp.pressSequentially(dd(cong(-1)));
		await inp.press('Tab');
		await page.keyboard.press('Escape');
		const loi = await xacNhan(page);
		ghiChu('thông báo', loi.join(' | '));
		expect(loi.join(' | ')).toContain('Ngày kết thúc phải lớn hơn thời gian hiện tại, không thể kích hoạt chương trình');
		expect(daGoi).toEqual([]);
	});
});

test.describe('20 · Form TẠO MỚI (giả chuỗi chưa có chương trình, CHẶN GHI)', () => {
	test('20_010_031 — Tắt công tắc khi đang TẠO MỚI chương trình tích điểm', async ({ page }) => {
		chanNeuTat('20_010_031');
		const { daGoi } = await chanGhi(page);
		// Giả `get-campaign` rỗng ⇒ màn hiện "Thêm chương trình tích điểm" (CampaignList.jsx:102) — 🚫 không xoá chương trình thật.
		await page.route(/\/loyalty\/campaign\/get-campaign(\?|$)/, (r) =>
			r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: { code: '200' }, data: {} }) }),
		);
		await moMan(page, VAI);
		const lk = khung(page).getByText('Thêm chương trình tích điểm');
		await expect(lk, 'Không hiện liên kết "Thêm chương trình tích điểm" khi chuỗi chưa có chương trình').toBeVisible({ timeout: 20_000 });
		await lk.click();
		const hop = hopForm(page);
		await expect(hop).toContainText('Tạo chương trình tích điểm', { timeout: 15_000 });
		await bat(hop, false);
		const an = !(await hop.getByText('Đơn hàng', { exact: true }).first().isVisible().catch(() => false));
		await bat(hop, true);
		const hien = await hop.getByText('Đơn hàng', { exact: true }).first().isVisible().catch(() => false);
		ghiChu('thẻ loại', `tắt ⇒ ẩn: ${an} · bật ⇒ hiện: ${hien}`);
		expect(an, 'Tắt công tắc khi tạo mới mà thẻ Đơn hàng/Sản phẩm vẫn hiện').toBe(true);
		expect(hien, 'Bật lại công tắc mà thẻ không hiện lại').toBe(true);
		expect(daGoi).toEqual([]);
	});
});
