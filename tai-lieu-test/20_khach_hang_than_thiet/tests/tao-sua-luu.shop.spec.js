'use strict';

/**
 * 20 · Tạo / sửa chương trình tích điểm + đổi điểm có LƯU THẬT — vai `shop` (form), phiên phụ `tct` để đọc/khôi phục.
 *
 * 🔴 Cấu hình của TOÀN CHUỖI. Mọi case khôi phục bản gốc (`cau-hinh-loyalty.js` → `test-output/loyalty-goc.json`) ở
 *    `finally`; lượt hỏng giữa chừng: `-g "khoi phuc loyalty 20"`. User cho phép 25/09/2026.
 * Form TẠO MỚI chỉ hiện khi chuỗi chưa có chương trình (`CampaignList.jsx:102`) ⇒ giả `get-campaign` rỗng, rồi CHUYỂN request
 * `POST create-campaign` của form thành `PUT edit-campaign/<id gốc>` (cùng body) ⇒ payload form tạo được BE lưu thật mà
 * 🚫 không đẻ chương trình thứ hai. Toast đo được là toast NHÁNH TẠO của FE ("Tạo chương trình tích điểm thành công").
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chuan, hopForm, khung, loiDangHien, moFormCapNhat, moMan, moThe } = require('./loyalty-page');
const c = require('./cau-hinh-loyalty');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');

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
const cong = (n) => new Date(Date.now() + n * 86_400_000);

let tct;
let body = null;

async function thongBao(page) {
	const tb = page.locator('.ant-message-notice, .ant-notification-notice');
	await tb.first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => null);
	return chuan((await tb.allInnerTexts()).join(' | '));
}

async function batCT(hop, on = true) {
	const sw = hop.locator('.ant-switch').first();
	if (((await sw.getAttribute('aria-checked')) === 'true') !== on) await sw.click();
	await hop.page().waitForTimeout(400);
}

async function datNgay(hop, bd, kt = null) {
	const rp = hop.locator('.ant-picker').first();
	await rp.click();
	const ins = rp.locator('input');
	await ins.nth(0).press('ControlOrMeta+a');
	await ins.nth(0).pressSequentially(dd(bd));
	await ins.nth(0).press('Tab'); // 🔴 Enter = submit form
	if ((await ins.count()) > 1) {
		await ins.nth(1).press('ControlOrMeta+a');
		if (kt) await ins.nth(1).pressSequentially(dd(kt));
		else await ins.nth(1).press('Backspace');
		await ins.nth(1).press('Tab');
	}
	await hop.page().keyboard.press('Escape');
	await hop.page().waitForTimeout(400);
}

async function oSo(hop, id, v) {
	const o = hop.locator(`input#${id}`).first();
	await o.click();
	await o.press('ControlOrMeta+a');
	await o.press('Backspace');
	if (v != null) await o.pressSequentially(String(v));
}

/** Tick/bỏ checkbox theo nhãn. */
async function tick(hop, nhan, on = true) {
	const w = hop.locator('.ant-checkbox-wrapper').filter({ hasText: nhan }).first();
	if (((await w.locator('.ant-checkbox-checked').count()) > 0) !== on) await w.click();
}

/** Bấm Xác nhận, bắt request ghi (PUT/POST) của loyalty. Trả { req, res, tb }. */
async function luu(page, re = /loyalty\/(redeem-)?campaign\/(edit|create)-campaign/) {
	const cho = page.waitForResponse((r) => re.test(r.url()) && r.request().method() !== 'GET', { timeout: 20_000 }).catch(() => null);
	// Đóng dropdown gợi ý số tiền (AutoComplete) bằng cách bấm tiêu đề drawer — 🚫 Escape: đóng LUÔN drawer.
	await hopForm(page).locator('.ant-drawer-title').first().click().catch(() => null);
	await hopForm(page).getByRole('button', { name: 'Xác nhận' }).click();
	// 🔴 Đọc toast SONG SONG với chờ response: nhánh bị chặn không có response, chờ hết 20s thì toast đã tắt.
	const [r, tb] = await Promise.all([cho, thongBao(page)]);
	return { req: r?.request().postDataJSON() ?? null, res: r ? await r.json().catch(() => ({})) : null, tb };
}

/** Mở form TẠO MỚI tích điểm (giả chuỗi chưa có chương trình) + chuyển create → edit gốc. */
async function moFormTao(page) {
	const goc = await c.chup(tct.page, tct.st);
	await page.route(/\/loyalty\/campaign\/get-campaign(\?|$)/, (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: { code: '200' }, data: {} }) }),
	);
	await page.route(/\/loyalty\/campaign\/create-campaign/, async (r) => {
		body = r.request().postDataJSON();
		const url = r.request().url().replace(/create-campaign.*/, `edit-campaign/${goc.tich.campaignId}`);
		await r.fulfill({ response: await r.fetch({ url, method: 'PUT' }) });
	});
	await moMan(page, VAI);
	await khung(page).getByText('Thêm chương trình tích điểm').click();
	const hop = hopForm(page);
	await expect(hop).toContainText('Tạo chương trình tích điểm', { timeout: 15_000 });
	await batCT(hop, true);
	await datNgay(hop, new Date());
	// Form tạo KHÔNG chọn sẵn "Đối tượng áp dụng" (rule bắt buộc) — kịch bản: "Toàn bộ khách hàng".
	await hop.getByText('Toàn bộ khách hàng', { exact: true }).click();
	return hop;
}

/** Form TẠO MỚI đổi điểm (giả chuỗi chưa có chương trình đổi điểm) + chuyển create → edit gốc. */
async function moFormTaoDoi(page) {
	const goc = await c.chup(tct.page, tct.st);
	await page.route(/\/loyalty\/redeem-campaign\/get-campaign(\?|$)/, (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: { code: '200' }, data: {} }) }),
	);
	await page.route(/\/loyalty\/redeem-campaign\/create-campaign/, async (r) => {
		body = r.request().postDataJSON();
		const url = r.request().url().replace(/create-campaign.*/, `edit-campaign/${goc.doi.campaignId}`);
		await r.fulfill({ response: await r.fetch({ url, method: 'PUT' }) });
	});
	await moMan(page, VAI);
	await khung(page).getByText('Thêm chương trình đổi điểm').click();
	const hop = hopForm(page);
	await expect(hop).toContainText('Tạo chương trình đổi điểm', { timeout: 15_000 });
	return hop;
}

const hien = async () => (await c.doc(tct.page, tct.st)).tich;
const hienDoi = async () => (await c.doc(tct.page, tct.st)).doi;

test.describe('20 · Tạo/sửa chương trình có LƯU THẬT (vai shop, khôi phục sau mỗi case)', () => {
	test.describe.configure({ timeout: 240_000 });

	test.beforeEach(async ({ browser }) => {
		body = null;
		tct = await g.k.moPhienPhu(browser, 'tct', '/care/loyalty');
		await c.chup(tct.page, tct.st);
	});
	test.afterEach(async () => {
		ghiChu('khôi phục', JSON.stringify(await c.khoiPhuc(tct.page, tct.st)));
		await tct.dong();
	});

	// ───── Form TẠO MỚI ─────
	for (const [id, ten, the, dien, kiemBody] of [
		['20_010_004', 'Tạo chương trình tích điểm theo sản phẩm thành công', 'Sản phẩm', async (h) => oSo(h, 'orderAmountPerPoint', 20_000), (b) => ({ campaignType: 1, orderAmountPerPoint: 20_000 })],
		['20_010_005', 'Tạo chương trình theo đơn hàng có Giá trị đơn hàng tối thiểu', 'Đơn hàng', async (h) => {
			await oSo(h, 'orderAmountPerPoint', 10_000);
			const o = h.locator('input#orderAmountConditional');
			ghiChu('ô tối thiểu trước khi tích', (await o.isDisabled()) ? 'khoá' : 'MỞ');
			expect(await o.isDisabled(), 'Ô số tiền tối thiểu nhập được khi CHƯA tích').toBe(true);
			await tick(h, 'Giá trị đơn hàng tối thiểu');
			await oSo(h, 'orderAmountConditional', 300_000);
		}, () => ({ campaignType: 0, orderAmountConditional: 300_000 })],
		['20_010_006', 'Tạo chương trình theo sản phẩm có Giá trị đơn hàng tối thiểu', 'Sản phẩm', async (h) => {
			await oSo(h, 'orderAmountPerPoint', 20_000);
			await tick(h, 'Giá trị đơn hàng tối thiểu');
			await oSo(h, 'orderAmountConditional', 300_000);
		}, () => ({ campaignType: 1, orderAmountConditional: 300_000 })],
		['20_010_007', 'Tạo theo đơn hàng tick Không tích điểm cho sản phẩm giảm giá', 'Đơn hàng', async (h) => { await oSo(h, 'orderAmountPerPoint', 1_000); await tick(h, 'Không tích điểm cho sản phẩm giảm giá'); }, () => ({ campaignType: 0, noPointForDiscountedProduct: true })],
		['20_010_008', 'Tạo theo sản phẩm tick Không tích điểm cho sản phẩm giảm giá', 'Sản phẩm', async (h) => { await oSo(h, 'orderAmountPerPoint', 1_000); await tick(h, 'Không tích điểm cho sản phẩm giảm giá'); }, () => ({ campaignType: 1, noPointForDiscountedProduct: true })],
		['20_010_009', 'Tạo theo đơn hàng tick Không tích điểm cho hóa đơn giảm giá', 'Đơn hàng', async (h) => { await oSo(h, 'orderAmountPerPoint', 1_000); await tick(h, 'Không tích điểm cho hóa đơn giảm giá'); }, () => ({ campaignType: 0, noPointForDiscountedInvoice: true })],
		['20_010_010', 'Tạo theo sản phẩm tick Không tích điểm cho hóa đơn giảm giá', 'Sản phẩm', async (h) => { await oSo(h, 'orderAmountPerPoint', 1_000); await tick(h, 'Không tích điểm cho hóa đơn giảm giá'); }, () => ({ campaignType: 1, noPointForDiscountedInvoice: true })],
		['20_010_011', 'Tạo theo đơn hàng tick Không tích điểm cho HĐ thanh toán bằng điểm', 'Đơn hàng', async (h) => { await oSo(h, 'orderAmountPerPoint', 1_000); await tick(h, /thanh toán bằng điểm/); }, () => ({ campaignType: 0, noPointForPointPaymentInvoice: true })],
		['20_010_012', 'Tạo theo sản phẩm tick Không tích điểm cho HĐ thanh toán bằng điểm', 'Sản phẩm', async (h) => { await oSo(h, 'orderAmountPerPoint', 1_000); await tick(h, /thanh toán bằng điểm/); }, () => ({ campaignType: 1, noPointForPointPaymentInvoice: true })],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			const hop = await moFormTao(page);
			await hop.getByText(the, { exact: true }).first().click();
			await page.waitForTimeout(500);
			if (the === 'Sản phẩm') await expect(hop.getByText('Giá bán sau thuế (VAT)').first(), 'Thẻ Sản phẩm: nhãn ô tỷ lệ không đổi sang "Giá bán sau thuế (VAT)"').toBeVisible();
			await dien(hop);
			const { tb } = await luu(page, /create-campaign|edit-campaign/);
			ghiChu('body form tạo', JSON.stringify(body));
			ghiChu('toast', tb);
			expect(body, 'Form tạo không gửi request create-campaign').toBeTruthy();
			const mong = kiemBody(body);
			for (const [k, v] of Object.entries(mong)) expect(body[k], `body.${k}`).toEqual(v);
			expect(tb).toContain('Tạo chương trình tích điểm thành công');
			const h = await hien();
			for (const [k, v] of Object.entries(mong)) expect(h[k], `BE chưa lưu ${k}`).toEqual(v);
		});
	}

	test('20_010_013 — Khai chương trình chỉ áp dụng cho Nhóm khách hàng cụ thể', async ({ page }) => {
		chanNeuTat('20_010_013');
		const hop = await moFormTao(page);
		await oSo(hop, 'orderAmountPerPoint', 1_000);
		await hop.getByText('Nhóm khách hàng', { exact: true }).click();
		await hop.locator('.ant-select').filter({ hasText: 'Tìm kiếm và chọn nhóm khách hàng...' }).first().click();
		const m = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first();
		await expect(m).toBeVisible({ timeout: 15_000 });
		await m.click();
		const cot = (await hop.locator('.ant-table-thead th').allInnerTexts()).map(chuan).filter(Boolean);
		const dong = chuan(await hop.locator('.ant-table-tbody tr.ant-table-row').first().innerText());
		ghiChu('bảng nhóm', `${cot.join(' | ')} · ${dong}`);
		for (const k of ['STT', 'Tên nhóm', 'Đối tượng áp dụng', 'Số lượng thành viên', 'Thao tác']) expect(cot.join(' | ')).toContain(k);
		expect(dong).toMatch(/\d+ thành viên/);
		const { tb } = await luu(page, /create-campaign|edit-campaign/);
		expect(body?.isAppliedAll).toBe(false);
		expect(body?.customerGroupIds?.length).toBe(1);
		expect(tb).toContain('Tạo chương trình tích điểm thành công');
		expect((await hien()).customerGroupIds).toEqual(body.customerGroupIds);
	});

	// ───── Form CẬP NHẬT (lưu thật) ─────
	test('20_010_014 — Đặt ngày bắt đầu trong quá khứ rồi bật công tắc', async ({ page }) => {
		chanNeuTat('20_010_014');
		await moMan(page, VAI);
		const hop = await moFormCapNhat(page, 0);
		await batCT(hop, true);
		await datNgay(hop, cong(-1));
		const { req, res, tb } = await luu(page);
		ghiChu('kết quả', `${JSON.stringify(res?.status)} · ${tb} · startTime ${req?.startTime}`);
		expect(String(res?.status?.code), 'Ngày bắt đầu quá khứ mà KHÔNG lưu được').toBe('200');
		expect(tb, 'Kỳ vọng kịch bản dùng câu nhánh TẠO; màn Cập nhật báo câu khác').toMatch(/Tạo chương trình tích điểm thành công|Cập nhật chương trình tích điểm thành công/);
		expect(c.ngay((await hien()).startTime)).toBe(dd(cong(-1)));
	});

	test('20_010_018 — Nhập tỷ lệ tích điểm bằng 0', async ({ page }) => {
		chanNeuTat('20_010_018');
		await moMan(page, VAI);
		const hop = await moFormCapNhat(page, 0);
		await oSo(hop, 'orderAmountPerPoint', 0);
		const { req, res, tb } = await luu(page);
		const loi = await loiDangHien(page);
		ghiChu('kết quả', `${JSON.stringify(res?.status)} · ${tb} · lỗi form ${loi.join(' | ')} · body.orderAmountPerPoint=${req?.orderAmountPerPoint}`);
		// Kỳ vọng kịch bản (đã chốt theo code): FE KHÔNG chặn 0 ⇒ lưu 0 (🔴 mọi đơn sau đó 0 điểm).
		expect(req, 'FE chặn tỷ lệ 0 (không gửi request)').toBeTruthy();
		expect(req.orderAmountPerPoint).toBe(0);
		expect(String(res?.status?.code)).toBe('200');
		expect((await hien()).orderAmountPerPoint).toBe(0);
	});

	test('20_010_022 — Nhập số tiền chi tiêu rất lớn', async ({ page }) => {
		chanNeuTat('20_010_022');
		await moMan(page, VAI);
		const hop = await moFormCapNhat(page, 0);
		await oSo(hop, 'orderAmountPerPoint', 999_999_999_999);
		const dien = chuan(await hop.locator('input#orderAmountPerPoint').inputValue());
		const { req, res, tb } = await luu(page);
		ghiChu('hành vi thật', `ô hiện "${dien}" · body ${req?.orderAmountPerPoint} · ${JSON.stringify(res?.status)} · ${tb}`);
		if (String(res?.status?.code) === '200') expect((await hien()).orderAmountPerPoint).toBe(req.orderAmountPerPoint);
		else expect(tb, 'API lỗi mà không báo').not.toBe('');
	});

	test('20_040_007 — Tạm ngừng chương trình tích điểm bằng công tắc', async ({ page }) => {
		chanNeuTat('20_040_007');
		await moMan(page, VAI);
		const truoc = chuan(await khung(page).innerText());
		const hop = await moFormCapNhat(page, 0);
		await batCT(hop, false);
		const { res, tb } = await luu(page);
		expect(String(res?.status?.code), JSON.stringify(res?.status)).toBe('200');
		expect(tb).toContain('Cập nhật chương trình tích điểm thành công');
		await page.waitForTimeout(2_000);
		const o = khung(page).locator('.ant-tag').filter({ hasText: 'Ngừng hoạt động' }).first();
		await expect(o, 'Ô chương trình không đổi nhãn "Ngừng hoạt động"').toBeVisible({ timeout: 15_000 });
		const tom = (truoc.match(/\d[\d.,]*\s*đ[^.]*điểm/) || [''])[0];
		ghiChu('câu tóm tắt', tom);
		if (tom) expect(chuan(await khung(page).innerText())).toContain(tom);
		expect((await hien()).active).toBe(false);
	});

	test('20_040_008 — Bật lại chương trình tích điểm đã tạm ngừng', async ({ page }) => {
		chanNeuTat('20_040_008');
		await c.suaTich(tct.page, tct.st, { active: false });
		const goc = JSON.parse(require('node:fs').readFileSync(c.GOC, 'utf8')).tich;
		await moMan(page, VAI);
		const hop = await moFormCapNhat(page, 0);
		await batCT(hop, true);
		const { res, tb } = await luu(page);
		expect(String(res?.status?.code), JSON.stringify(res?.status)).toBe('200');
		expect(tb).toContain('Cập nhật chương trình tích điểm thành công');
		const h = await hien();
		expect(h.active).toBe(true);
		for (const k of ['orderAmountPerPoint', 'orderAmountConditional', 'campaignType', 'isAppliedAll']) expect(h[k], `Bật lại mà ${k} bị đổi`).toEqual(goc[k]);
		await expect(khung(page).locator('.ant-tag').filter({ hasText: 'Đang hoạt động' }).first()).toBeVisible({ timeout: 15_000 });
	});

	test('20_040_010 — Bật lại chương trình có ngày kết thúc đã qua', async ({ page }) => {
		chanNeuTat('20_040_010');
		await c.suaTich(tct.page, tct.st, { active: false, startTime: dd(cong(-10)), endTime: dd(cong(-1)) });
		await moMan(page, VAI);
		const hop = await moFormCapNhat(page, 0);
		await batCT(hop, true);
		const { req, tb } = await luu(page);
		const loi = await loiDangHien(page);
		ghiChu('kết quả', `${tb} · ${loi.join(' | ')} · request ${req ? 'CÓ' : 'không'}`);
		expect([tb, ...loi].join(' | ')).toContain('Ngày kết thúc phải lớn hơn thời gian hiện tại, không thể kích hoạt chương trình');
		expect(req, 'Bị chặn mà vẫn gửi request lưu').toBeNull();
		expect((await hien()).active).toBe(false);
	});

	test('20_040_012 — Đổi loại tích điểm từ Đơn hàng sang Sản phẩm khi sửa', async ({ page }) => {
		chanNeuTat('20_040_012');
		await moMan(page, VAI);
		const hop = await moFormCapNhat(page, 0);
		const truoc = await hop.locator('input#orderAmountPerPoint').inputValue();
		await hop.getByText('Sản phẩm', { exact: true }).first().click();
		await page.waitForTimeout(600);
		await expect(hop.getByText('Giá bán sau thuế (VAT)').first()).toBeVisible();
		await expect(hop.getByText('Tích điểm sản phẩm theo ngành hàng')).toBeVisible();
		expect(await hop.locator('input#orderAmountPerPoint').inputValue(), 'Đổi thẻ mà giá trị tỷ lệ bị đổi').toBe(truoc);
		const { req, res } = await luu(page);
		expect(String(res?.status?.code), JSON.stringify(res?.status)).toBe('200');
		expect(req.campaignType).toBe(1);
		expect((await hien()).campaignType).toBe(1);
		await khung(page).getByRole('button', { name: 'Xem chi tiết' }).first().click();
		await expect(hopForm(page), 'Chi tiết không hiện "Theo sản phẩm"').toContainText('Theo sản phẩm', { timeout: 15_000 });
	});

	test('20_040_013 — Sửa tỷ lệ tích điểm không tính lại đơn cũ', async ({ page }) => {
		chanNeuTat('20_040_013');
		const d = g.selectDb("SELECT h.chain_customer_id, SUM(h.point) FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY_HISTORY h JOIN VNPOST_CORE.CHAIN_CUSTOMER c ON c.customer_id=h.chain_customer_id WHERE c.customer_code LIKE 'A7KH19%' GROUP BY 1 HAVING SUM(h.point) > 0 LIMIT 1")[0];
		test.skip(!d, 'Chưa có khách rác nào đã tích điểm (chạy tich-diem.gdv trước) hoặc không đọc được DB.');
		const tongTruoc = Number(d[1]);
		await moMan(page, VAI);
		const hop = await moFormCapNhat(page, 0);
		await oSo(hop, 'orderAmountPerPoint', 500);
		const { res } = await luu(page);
		expect(String(res?.status?.code), JSON.stringify(res?.status)).toBe('200');
		await page.waitForTimeout(15_000);
		const sau = Number(g.selectDb(`SELECT SUM(point) FROM LOYALTY.CHAIN_CUSTOMER_LOYALTY_HISTORY WHERE chain_customer_id=${Number(d[0])}`)[0]?.[0]);
		ghiChu('điểm khách', `${d[0]}: ${tongTruoc} → ${sau} (tỷ lệ 1000 → 500)`);
		expect(sau, 'Đổi tỷ lệ mà điểm đã tích của khách bị tính lại').toBe(tongTruoc);
	});

	test('20_040_015 — Mở lại màn Cập nhật sau khi đã lưu phạm vi cụ thể', async ({ page }) => {
		chanNeuTat('20_040_015');
		const goc = (await c.chup(tct.page, tct.st)).tich;
		const pv = (goc.scopes || []).filter((s) => s.scopeType === 'BUU_DIEN_TINH').slice(0, 2).map((s) => ({ scopeType: s.scopeType, orgUnitCode: s.orgUnitCode }));
		await c.suaTich(tct.page, tct.st, { scopeType: 'BUU_DIEN_TINH', scopes: pv });
		await moMan(page, VAI);
		for (const lan of [1, 2]) {
			const hop = await moFormCapNhat(page, 0);
			await moThe(page, 'Phạm vi áp dụng');
			const chon = chuan(await hop.locator('.ant-radio-wrapper-checked').filter({ hasText: /Toàn hệ thống|Chọn phạm vi cụ thể/ }).innerText());
			const chu = chuan(await hop.locator('.ant-tabs-tabpane-active').innerText());
			ghiChu(`lần ${lan}`, `${chon} · ${chu.slice(0, 200)}`);
			expect(chon).toBe('Chọn phạm vi cụ thể');
			expect(chu, 'Không nạp lại số đơn vị đã lưu').toMatch(/Đã chọn\s*2/);
			await hop.getByRole('button', { name: /Hủy/ }).first().click();
			await page.waitForTimeout(1_000);
		}
	});

	// ───── Đổi điểm ─────
	test('20_020_006 — Đặt ngày bắt đầu quá khứ cho chương trình đổi điểm rồi bật công tắc', async ({ page }) => {
		chanNeuTat('20_020_006');
		await moMan(page, VAI);
		const hop = await moFormCapNhat(page, 1);
		await batCT(hop, true);
		await datNgay(hop, cong(-1));
		const { res, tb } = await luu(page);
		ghiChu('kết quả', `${JSON.stringify(res?.status)} · ${tb}`);
		expect(String(res?.status?.code)).toBe('200');
		expect(tb).toMatch(/(Tạo|Cập nhật) chương trình đổi điểm thành công/);
		expect(c.ngay((await hienDoi()).startTime)).toBe(dd(cong(-1)));
	});

	test('20_020_008 — Đặt ngày kết thúc bằng hôm nay cho chương trình đổi điểm rồi bật công tắc', async ({ page }) => {
		chanNeuTat('20_020_008');
		await moMan(page, VAI);
		const hop = await moFormCapNhat(page, 1);
		await batCT(hop, true);
		const pk = hop.locator('.ant-picker');
		ghiChu('số ô ngày', await pk.count());
		if ((await pk.count()) > 1) {
			const o = pk.nth(1);
			await o.click();
			const inp = o.locator('input').last();
			await inp.press('ControlOrMeta+a');
			await inp.pressSequentially(dd(new Date()));
			await inp.press('Tab');
			await page.keyboard.press('Escape');
		} else await datNgay(hop, new Date(), new Date());
		const { res, tb } = await luu(page);
		ghiChu('kết quả', `${JSON.stringify(res?.status)} · ${tb}`);
		expect(String(res?.status?.code), `Ngày kết thúc = hôm nay bị chặn (${tb})`).toBe('200');
		expect(c.ngay((await hienDoi()).endTime)).toBe(dd(new Date()));
	});

	test('20_040_009 — Tắt chương trình đổi điểm bằng công tắc', async ({ page }) => {
		chanNeuTat('20_040_009');
		await moMan(page, VAI);
		const hop = await moFormCapNhat(page, 1);
		await batCT(hop, false);
		const { res, tb } = await luu(page);
		expect(String(res?.status?.code), JSON.stringify(res?.status)).toBe('200');
		expect(tb).toContain('Cập nhật chương trình đổi điểm thành công');
		expect((await hienDoi()).active).toBe(false);
		// 🔴 Kỳ vọng "calculate-loyalty-amount trả Chiến dịch không hoạt động" KHÔNG kiểm được: mọi dòng quyền của
		//    REDEEM_CAMPAIGN_CALCULATE_LOYALTY_AMOUNT đều active=0 (401 với mọi vai) và FE không gọi API này.
		//    Hệ quả ở POS đo ở 20_060_007 (dùng điểm khi chương trình đổi điểm tắt).
		await expect(khung(page).locator('.ant-tag').filter({ hasText: 'Ngừng hoạt động' }).first()).toBeVisible({ timeout: 15_000 });
	});

	// ───── API tạo chương trình thứ hai ─────
	test('20_010_032 — Tạo chương trình tích điểm khi đã có chương trình đang hoạt động', async () => {
		chanNeuTat('20_010_032');
		const goc = (await c.chup(tct.page, tct.st)).tich;
		const b = await g.k.goiGhi(tct.page, tct.st, 'POST', '/loyalty/campaign/create-campaign', {}, { ...c.bodyTich(goc), active: true });
		ghiChu('BE', JSON.stringify(b?.status));
		const moi = b?.data?.campaignId;
		if (String(b?.status?.code) === '200' && moi && moi !== goc.campaignId) {
			ghiChu('🔴 tạo được chương trình THỨ HAI — xoá', JSON.stringify((await g.k.goiGhi(tct.page, tct.st, 'DELETE', `/loyalty/campaign/delete-campaign/${moi}`))?.status));
		}
		expect(b?.status?.message).toBe('Có một chiến dịch đang chạy, vui lòng tạm ngừng chiến dịch hiện tại trước khi tiếp tục.');
	});

	test('20_020_012 — Tạo chương trình đổi điểm khi đã có chương trình đang hoạt động', async () => {
		chanNeuTat('20_020_012');
		const goc = (await c.chup(tct.page, tct.st)).doi;
		const b = await g.k.goiGhi(tct.page, tct.st, 'POST', '/loyalty/redeem-campaign/create-campaign', {}, { ...c.bodyDoi(goc), active: true });
		ghiChu('BE', JSON.stringify(b?.status));
		const moi = b?.data?.campaignId;
		if (String(b?.status?.code) === '200' && moi && moi !== goc.campaignId) {
			ghiChu('🔴 tạo được chương trình THỨ HAI — xoá', JSON.stringify((await g.k.goiGhi(tct.page, tct.st, 'DELETE', `/loyalty/redeem-campaign/delete-campaign/${moi}`))?.status));
		}
		expect(b?.status?.message).toBe('Có một chiến dịch đang chạy, vui lòng tạm ngừng trước khi tiếp tục.');
	});

	// ───── Mở form tạo / tạo mới (bổ sung) ─────
	test('20_010_001 — Mở form Thêm chương trình tích điểm', async ({ page }) => {
		chanNeuTat('20_010_001');
		const { daGoi } = await require('./loyalty-page').chanGhi(page);
		const goc = await c.chup(tct.page, tct.st);
		void goc;
		await page.route(/\/loyalty\/campaign\/get-campaign(\?|$)/, (r) =>
			r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: { code: '200' }, data: {} }) }),
		);
		await moMan(page, VAI);
		await khung(page).getByText('Thêm chương trình tích điểm').click();
		const hop = hopForm(page);
		await expect(hop).toContainText('Tạo chương trình tích điểm', { timeout: 15_000 });
		for (const t of ['Thông tin chung', 'Phạm vi áp dụng']) await expect(hop.locator('.ant-tabs-tab', { hasText: t })).toBeVisible();
		expect(await hop.locator('.ant-switch').first().getAttribute('aria-checked'), 'Công tắc không BẬT sẵn').toBe('true');
		await expect(hop.getByText('Đơn hàng', { exact: true }).first()).toBeVisible();
		await expect(hop.getByText('Sản phẩm', { exact: true }).first()).toBeVisible();
		const cls = await hop.getByText('Đơn hàng', { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]').getAttribute('class');
		ghiChu('thẻ Đơn hàng', cls);
		expect(cls, 'Thẻ "Đơn hàng" không được chọn sẵn').toMatch(/app-primary-color|report-box-bg/);
		expect(daGoi).toEqual([]);
	});

	test('20_010_003 — Tạo chương trình tích điểm theo đơn hàng thành công', async ({ page }) => {
		chanNeuTat('20_010_003');
		const hop = await moFormTao(page);
		await hop.getByText('Đơn hàng', { exact: true }).first().click();
		await oSo(hop, 'orderAmountPerPoint', 10_000);
		const { tb } = await luu(page, /create-campaign|edit-campaign/);
		ghiChu('body', JSON.stringify(body));
		expect(body?.campaignType).toBe(0);
		expect(body?.orderAmountPerPoint).toBe(10_000);
		expect(body?.endTime ?? null).toBeNull();
		expect(tb).toContain('Tạo chương trình tích điểm thành công');
		await expect(hopForm(page).filter({ hasText: 'Tạo chương trình tích điểm' })).toBeHidden({ timeout: 10_000 });
		const h = await hien();
		expect(h.orderAmountPerPoint).toBe(10_000);
		expect(h.campaignType).toBe(0);
	});

	test('20_020_001 — Mở form Thêm chương trình đổi điểm', async ({ page }) => {
		chanNeuTat('20_020_001');
		const { daGoi } = await require('./loyalty-page').chanGhi(page);
		const hop = await moFormTaoDoi(page);
		const chu = chuan(await hop.innerText());
		ghiChu('form', chu.slice(0, 400));
		for (const k of ['Thông tin chung', 'Phạm vi áp dụng', 'Tỷ lệ đổi điểm', 'Thời gian áp dụng', 'Điều kiện']) expect(chu, `Thiếu "${k}"`).toContain(k);
		for (const k of ['Đối tượng áp dụng', 'Không tích điểm cho', 'Sản phẩm']) expect(chu, `Form đổi điểm KHÔNG được có "${k}"`).not.toContain(k);
		expect(daGoi).toEqual([]);
	});

	test('20_020_002 — Bấm Xác nhận khi chưa nhập gì ở form đổi điểm', async ({ page }) => {
		chanNeuTat('20_020_002');
		const { daGoi } = await require('./loyalty-page').chanGhi(page);
		const hop = await moFormTaoDoi(page);
		const pk = hop.locator('.ant-picker').first();
		await pk.hover();
		await pk.locator('.ant-picker-clear').click({ force: true }).catch(() => null);
		await oSo(hop, 'orderAmountPerPoint', null);
		await hop.locator('.ant-drawer-title').first().click();
		await hop.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(1_500);
		const loi = await loiDangHien(page);
		ghiChu('lỗi', loi.join(' | '));
		expect(loi.join(' | ')).toContain('Vui lòng chọn thời gian bắt đầu');
		expect(loi.join(' | ')).toContain('Số tiền chi tiêu phải lớn hơn 0');
		expect(daGoi, `Vẫn gọi API ghi: ${daGoi.join(' ; ')}`).toEqual([]);
	});

	test('20_020_003 — Tạo chương trình đổi điểm thành công', async ({ page }) => {
		chanNeuTat('20_020_003');
		const hop = await moFormTaoDoi(page);
		await batCT(hop, true);
		await oSo(hop, 'orderAmountPerPoint', 1_000);
		await datNgay(hop, new Date());
		const { tb } = await luu(page, /redeem-campaign\/(create|edit)-campaign/);
		ghiChu('body', JSON.stringify(body));
		expect(body?.orderAmountPerPoint).toBe(1_000);
		expect(tb).toContain('Tạo chương trình đổi điểm thành công');
		expect((await hienDoi()).orderAmountPerPoint).toBe(1_000);
		await page.unroute(/\/loyalty\/redeem-campaign\/get-campaign(\?|$)/);
		await moMan(page, VAI);
		await expect(khung(page), 'Ô đổi điểm chưa hiện tỷ lệ mới').toContainText('Thành viên có thể đổi 1 điểm để nhận ưu đãi trị giá 1.000 đ', { timeout: 15_000 });
	});

	test('20_040_004 — Trạng thái chương trình theo thời gian áp dụng', async ({ page }) => {
		chanNeuTat('20_040_004');
		await moMan(page, VAI);
		await expect(khung(page).locator('.ant-tag').filter({ hasText: 'Đang hoạt động' }).first(), 'Chương trình gốc (bắt đầu đã qua) không hiện "Đang hoạt động"').toBeVisible();
		// Ngày bắt đầu ở TƯƠNG LAI + active=true (gọi thẳng API — FE chặn ở form).
		await c.suaTich(tct.page, tct.st, { active: true, startTime: dd(cong(2)), endTime: null });
		const h = await hien();
		ghiChu('get-campaign sau khi đặt bắt đầu = +2 ngày', JSON.stringify({ active: h.active, startTime: c.ngay(h.startTime) }));
		await moMan(page, VAI);
		const nhan = chuan(await khung(page).locator('.ant-card, [class*=card]').filter({ hasText: 'Chương trình tích điểm' }).first().innerText());
		ghiChu('ô tích điểm', nhan.slice(0, 200));
		expect(h.active, 'get-campaign KHÔNG tự đặt active=false khi chưa tới ngày bắt đầu').toBe(false);
		expect(nhan).toContain('Ngừng hoạt động');
	});
});
