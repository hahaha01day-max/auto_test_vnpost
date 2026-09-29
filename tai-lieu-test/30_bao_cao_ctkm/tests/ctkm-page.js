'use strict';

/**
 * Helper phân hệ 30 — Báo cáo hiệu quả chương trình khuyến mại.
 *
 * Trace vnpost-web `features/campaignReport/` (25/09/2026 — màn đã VIẾT LẠI, route cũ `/promotion/report` bỏ):
 *
 * | Thứ | Giá trị thật |
 * |---|---|
 * | Route | `/report/campaign-effectiveness` (perm `sale_report`) |
 * | Tiêu đề | `Báo cáo hiệu quả chương trình khuyến mại` |
 * | Thẻ tổng hợp | Số chương trình · Số hoá đơn áp dụng · Doanh thu (gồm VAT) · Doanh thu thuần (gồm VAT) · Tiền giảm giá · Lợi nhuận gộp |
 * | Bảng | "Hiệu quả theo từng chương trình" — STT · Tên chương trình · Trạng thái · Số hoá đơn áp dụng · Doanh thu (gồm VAT) · Doanh thu thuần (gồm VAT) · Tiền giảm giá · Doanh số tăng thêm · Lợi nhuận gộp · Ngân sách đã dùng |
 * | API | `GET /report/campaign/v2/effectiveness` (+ `/summary`, `/detail?campaignId`, `/applied-orders`, `/export`) — size mặc định FE 10 |
 * | Drawer | "Chi tiết hiệu quả chương trình khuyến mại" — tab Thông tin chương trình · Chỉ số hiệu quả (10 ô) · Đơn hàng đã áp dụng chương trình |
 * | Xuất | nút "Xuất Excel" ⇒ `bao_cao_hieu_qua_ctkm_YYYYMMDD_HHmmss.xlsx` |
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const seed = require('../../00_seed/seed-state');

const ROUTE = '/report/campaign-effectiveness';
const API = '/report/campaign/v2/effectiveness';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const bang = (page) => khung(page).locator('.ant-table').filter({ has: page.locator('th', { hasText: 'Tên chương trình' }) }).first();
const dong = (page) => bang(page).locator('.ant-table-tbody tr.ant-table-row');
const soTu = (s) => Number(String(s ?? '').replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

/**
 * Mở màn; trả mọi kết quả API báo cáo `[{ http, code, url }]` (rỗng = chưa gọi).
 * 🔴 BE trả lỗi quyền dạng HTTP 200 + `status.code = SSHOP-401` ⇒ phải đọc code trong body, không chỉ HTTP.
 */
async function moMan(page, vai) {
	const kq = [];
	page.on('response', async (r) => {
		if (!r.url().includes(API)) return;
		const b = await r.json().catch(() => null);
		kq.push({ http: r.status(), code: String(b?.status?.code ?? ''), url: r.url() });
	});
	await moTrang(page, ROUTE, vai);
	await page.waitForTimeout(6_000);
	return kq;
}
const okHet = (kq) => kq.length > 0 && kq.every((x) => x.http === 200 && x.code === '200');
const tomTat = (kq) => kq.map((x) => `${x.http}/${x.code} ${x.url.split('?')[0].split('/v2/')[1]}`).join(' · ') || '(không gọi)';

/** 🚫 Màn chỉ đọc — chặn ghi xuống marketing/report để một cú bấm nhầm không lọt xuống. */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/marketing|promotion|campaign/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
	});
	return { daGoi };
}

/** Kỳ mặc định của màn: đầu tháng → hết hôm nay (ms). */
function kyMacDinh() {
	const a = new Date(); a.setDate(1); a.setHours(0, 0, 0, 0);
	const b = new Date(); b.setHours(23, 59, 59, 999);
	return { startDate: a.getTime(), endDate: b.getTime() };
}

/** Gõ bộ lọc rồi bấm "Lọc"; chờ lời gọi danh sách. Trả { list, summary } body JSON. */
async function loc(page, { keyword, trangThai } = {}) {
	const o = khung(page).getByPlaceholder('Nhập mã hoặc tên');
	await o.fill(keyword ?? '');
	const sel = khung(page).locator('.ant-form-item').filter({ hasText: 'Trạng thái' }).locator('.ant-select').first();
	if (trangThai) {
		await sel.click();
		await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: new RegExp(`^${trangThai}$`) }).click();
	} else if (await sel.locator('.ant-select-clear').count()) {
		await sel.hover();
		await sel.locator('.ant-select-clear').click();
	}
	const choL = page.waitForResponse((r) => r.url().includes(`${API}?`), { timeout: 20_000 }).catch(() => null);
	const choS = page.waitForResponse((r) => r.url().includes(`${API}/summary`), { timeout: 20_000 }).catch(() => null);
	await khung(page).getByRole('button', { name: /Lọc/ }).click();
	const [l, s] = await Promise.all([choL, choS]);
	await page.waitForTimeout(1_500);
	return { list: l ? await l.json().catch(() => null) : null, summary: s ? await s.json().catch(() => null) : null, url: l?.url() };
}

/** Đọc dải thẻ tổng hợp ⇒ { nhãn: chữ giá trị }. */
async function the(page) {
	const out = {};
	const ds = khung(page).locator('.ant-pro-statistic-card');
	for (let i = 0; i < (await ds.count()); i += 1) {
		const t = chuan(await ds.nth(i).locator('.ant-statistic-title').first().innerText().catch(() => ''));
		const v = chuan(await ds.nth(i).locator('.ant-statistic-content').first().innerText().catch(() => ''));
		if (t) out[t] = v;
	}
	return out;
}

/** Mở drawer chi tiết của CTKM tên `ten` (bấm tên trong bảng). */
async function moChiTiet(page, ten) {
	await dong(page).filter({ hasText: ten }).first().getByRole('link', { name: ten }).or(dong(page).filter({ hasText: ten }).first().locator('a').first()).first().click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết hiệu quả chương trình khuyến mại' }).last();
	await expect(dr, 'Không mở drawer chi tiết').toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(2_000);
	return dr;
}

/** Descriptions của tab đang mở ⇒ { nhãn: giá trị }. */
async function moTa(dr) {
	const out = {};
	const th = dr.locator('.ant-tabs-tabpane-active .ant-descriptions-item-label');
	const td = dr.locator('.ant-tabs-tabpane-active .ant-descriptions-item-content');
	const n = await th.count();
	for (let i = 0; i < n; i += 1) out[chuan(await th.nth(i).innerText())] = chuan(await td.nth(i).innerText());
	return out;
}

/**
 * CTKM RÁC theo đơn −10% ở RIÊNG điểm bán làn (vai tct tạo — giống phân hệ 20). `ngânSách` null = không giới hạn.
 * Trả campaignId. 🔴 Nhớ `dungKm` sau khi xong (API `change-status` STOP ⇒ EXPIRED).
 */
async function taoKm(tct, ten, { nganSach = null } = {}) {
	const bd = Date.now() - 60_000;
	const km = await k.goiGhi(tct.page, tct.st, 'POST', '/marketing/campaign/v2/create', { shopId: tct.st.h.shopid }, {
		promotionName: ten, totalBudget: nganSach, allocateBudgetByScope: false, applyOfflinePromotion: false,
		allowCombineWithOtherPromotions: true, promotionPriority: 1, provinceCanReallocateBudget: false,
		promotionScope: 'ORDER', productPromotionType: null, conditionId: null, customerGroupId: null,
		description: 'AUTO TEST KHONG DUNG — CTKM rác 30', startTime: bd, endTime: bd + 86_400_000,
		startTimeFrame: null, endTimeFrame: null, applyScopeLevel: 'DIEM_BAN_CU_THE', savedStatus: 1,
		scopes: [{ id: null, scopeType: 'DIEM_BAN', orgUnitCode: seed.doc().duLieu.diemBan.maShop }], budgetScopes: [],
		applyRealtime: false, allowPoint: true, orderDiscountBase: 'TOTAL_AMOUNT', orderDiscountUnit: 'PERCENT',
		orderDiscountValue: 10, applyGift: false, giftItems: null, productPromotions: null,
		birthdayPromotionType: 'NONE', mutualExclusionActionType: 'BLOCK', mutualExclusionCampaignIds: [],
	});
	expect(String(km?.status?.code), `Tạo CTKM rác lỗi: ${JSON.stringify(km?.status)}`).toBe('200');
	return km?.data?.campaignId ?? km?.data?.id ?? km?.data;
}

async function dungKm(tct, campaignId) {
	if (!campaignId || typeof campaignId === 'object') return null;
	const b = await k.goiGhi(tct.page, tct.st, 'PUT', '/marketing/campaign/v2/change-status', {}, { campaignId, action: 'STOP', endTime: null });
	return `${campaignId} → ${b?.status?.code}`;
}

/** Trong hộp CTKM của POS: chỉ giữ tick CTKM tên `ten`. */
async function chiGiuKm(page, ten) {
	await page.getByRole('button', { name: /Chương trình khuyến m[ãạ]i/i }).first().click({ force: true });
	const hop = page.getByRole('dialog').last();
	await expect(hop).toBeVisible({ timeout: 15_000 });
	for (const t of ['Theo đơn hàng', 'Theo sản phẩm', 'Theo danh mục']) {
		const tab = hop.getByRole('tab', { name: t });
		if (!(await tab.isVisible().catch(() => false))) continue;
		await tab.click();
		await page.waitForTimeout(600);
		const hang = hop.locator('.ant-tabs-tabpane-active .promotion-program-modal__table-row, .ant-tabs-tabpane-active tr');
		for (let i = 0; i < (await hang.count()); i += 1) {
			const h = hang.nth(i);
			const la = chuan(await h.innerText()).includes(ten);
			const dangTick = (await h.locator('.ant-checkbox-checked').count()) > 0;
			const khoa = (await h.locator('.ant-checkbox-disabled').count()) > 0;
			if (!khoa && la !== dangTick && (await h.locator('.ant-checkbox').count())) {
				await h.locator('.ant-checkbox').first().click();
				await page.waitForTimeout(300);
			}
		}
	}
	const xn = hop.getByRole('button', { name: /Áp dụng|Xác nhận|Đồng ý/ }).last();
	if (await xn.isVisible().catch(() => false)) await xn.click();
	else await page.keyboard.press('Escape');
	await page.waitForTimeout(2_000);
}

module.exports = { API, ROUTE, bang, chanGhi, chiGiuKm, chuan, dong, dungKm, k, khung, kyMacDinh, loc, moChiTiet, moMan, moTa, okHet, seed, soTu, taoKm, the, tomTat };
