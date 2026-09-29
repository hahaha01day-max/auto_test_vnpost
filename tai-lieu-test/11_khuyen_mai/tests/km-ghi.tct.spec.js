'use strict';

/**
 * 11 · CTKM — soi form "Thêm mới chương trình", CTKM NHÁP, CRUD điều kiện / nhóm đối tượng TẠM (vai `tct`).
 *
 * Nguồn (vnpost-web af8cda07): `pages/promotionCampaign/campaignManagement/views/pages/PageAddOrUpdateCampaign.jsx`,
 * `conditionsManagement/views/{ConditionsManagement,conponents/TableData,modals/ModalAddOrUpdateCondition}.jsx`,
 * `loyaltyGroup/views/{LoyaltyGroupManagement,components/TableData,components/drawer/DrawerAddGroup}.jsx`,
 * `conditionsManagement/controllers/ConditionManagementControllers.js`, `loyaltyGroup/controllers/LoyaltyGroupControllers.js`.
 *
 * 🔴 Không chạm CTKM đang chạy. CTKM tạo ở đây chỉ là NHÁP (status 0 — không áp vào đơn), phạm vi = điểm bán
 *    RÁC. CTKM KHÔNG có chức năng xoá (11_050_003) ⇒ nháp `AUTO8_KM_*` ở lại, ghi báo cáo.
 * 🔴 Điều kiện / nhóm đối tượng là dữ liệu CẤP CHUỖI dùng chung — tên `AUTO8_KMDK_*` / `AUTO8_KMNH_*`,
 *    xoá ngay trong chuỗi case 080_008 / 070_009.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const pm = require('./promotion-page');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const BASE = () => process.env.VNPOST_BASE_URL;
const hau = () => Date.now().toString().slice(-6);
const FILE = path.join(GOC, 'test-output', 'km-ghi-state.json');
const napTT = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } };
const luuTT = (p) => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify({ ...napTT(), ...p })); };

async function thongBaoQuanh(page, fn, timeout = 15_000) {
	await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
	const tb = page.locator('.ant-message-notice').first().waitFor({ timeout }).then(() => page.locator('.ant-message-notice').allInnerTexts()).catch(() => []);
	await fn();
	return pm.chuan((await tb).join(' | '));
}

// ── Form Thêm mới CTKM ────────────────────────────────────────────────────────────────────
async function moForm(page) {
	await pm.moMan(page, 'tct');
	await pm.khung(page).getByRole('button', { name: 'Thêm mới chương trình' }).click();
	await expect(page.getByPlaceholder('Nhập tên chương trình khuyến mại')).toBeVisible({ timeout: 30_000 });
	return page.locator('.ant-tabs-tabpane-active');
}

async function chonHinhThuc(page, loai, hinhThuc) {
	await page.getByText(loai, { exact: true }).click();
	if (hinhThuc) await page.getByText(hinhThuc, { exact: true }).click();
	await page.waitForTimeout(800);
	return pm.chuan(await page.locator('.ant-tabs-tabpane-active').innerText());
}

// ── Bảng Điều kiện / Nhóm đối tượng ──────────────────────────────────────────────────────
const MAN = {
	dk: { route: '/promotion/condition', tim: 'Tìm kiếm điều kiện', them: 'Thêm điều kiện' },
	nh: { route: '/promotion/customer-group', tim: 'Tìm kiếm nhóm đối tượng', them: 'Thêm nhóm đối tượng' },
};

async function moBang(page, loai) {
	await moTrang(page, `${BASE()}${MAN[loai].route}`, 'tct');
	await expect(pm.khung(page).getByRole('button', { name: MAN[loai].them })).toBeVisible({ timeout: 30_000 });
}

async function tim(page, loai, tu) {
	const o = pm.khung(page).getByPlaceholder(MAN[loai].tim);
	await o.fill(tu);
	await o.press('Enter');
	await page.waitForTimeout(2_500);
	return pm.khung(page).locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: tu });
}

/** Dọn bản ghi tạm SÓT (lượt trước đỏ sau khi đã tạo) theo tiền tố. */
async function donSot(page, loai, tienTo) {
	const ds = await tim(page, loai, tienTo);
	for (let i = await ds.count(); i > 0; i--) await xoaDong(page, ds.first()).catch(() => {});
	await tim(page, loai, '');
}

async function xoaDong(page, dong) {
	await dong.locator('button:has(.anticon-close)').first().click();
	const pop = page.locator('.ant-popover:visible').filter({ hasText: 'Xác nhận xóa' }).last();
	await expect(pop).toBeVisible();
	return thongBaoQuanh(page, () => pop.locator('.ant-btn-primary').click());
}


/**
 * Bộ chọn phạm vi của CTKM (`RegionSelectorPromotion.jsx`, tiền tố `rs-`). "Áp dụng cho" mặc định
 * "Bưu điện tỉnh" (một cột) ⇒ tick TỈNH RÁC — tỉnh này chỉ chứa điểm bán rác `diemBanNhan`.
 */
async function chonPhamViRac(page) {
	const rac = seed.doc().duLieu.diemBanNhan;
	await page.getByRole('tab', { name: 'Phạm vi áp dụng' }).click();
	const pane = page.locator('.ant-tabs-tabpane-active');
	await expect(pane.getByRole('radio', { name: 'Bưu điện tỉnh' })).toBeChecked();
	await pane.locator('.rs-column__search input').first().fill(rac.tenTinh);
	const hang = pane.locator('.rs-column').first().locator('.rs-item').filter({ hasText: rac.tenTinh }).first();
	await expect(hang, `Cột tỉnh không có ${rac.tenTinh}`).toBeVisible({ timeout: 20_000 });
	const cb = hang.locator('input[type="checkbox"]').first();
	await cb.check({ force: true });
	await expect(cb).toBeChecked();
	await expect(pane.locator('.rs-status-bar__count')).toHaveText('1');
}

/** Khai đủ ô bắt buộc tối thiểu cho CTKM "Theo đơn hàng" (đo 24/09: nháp cũng validate đầy đủ). */
async function dienNhap(page, ten) {
	await page.getByPlaceholder('Nhập tên chương trình khuyến mại').fill(ten);
	for (const [nhan, ph] of [['Điều kiện áp dụng', 'Chọn điều kiện áp dụng'], ['Đối tượng áp dụng', 'Chọn nhóm khách hàng']]) {
		// 🔴 Chọn bằng Enter trên dropdown ĐANG mở: lọc `.ant-select-item-option` theo visible vẫn bắt nhầm
		//    mục của dropdown trước (đang đóng dở) ⇒ ô thứ hai không nhận.
		const o = page.locator('.ant-form-item').filter({ has: page.getByText(nhan, { exact: true }) }).locator('.ant-select').first();
		await o.click();
		await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first()).toBeVisible();
		await page.keyboard.press('Enter');
		await expect(o, `Ô "${ph}" không nhận lựa chọn`).not.toContainText(ph);
		await page.locator('#promotionName').click();
	}
	for (const t of ['Không cài đặt ngày kết thúc', 'Không cài đặt khung giờ']) {
		const cb = page.getByRole('checkbox', { name: t });
		if (!(await cb.isChecked())) await cb.check();
	}
	const d = new Date(Date.now() + 30 * 86_400_000);
	const o = page.locator('#startTime');
	await o.click();
	await o.fill(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} 08:00`);
	await o.press('Enter');
	await page.getByText('Theo đơn hàng', { exact: true }).click();
	for (const [id, v] of [['orderDiscountValue', '1'], ['totalBudget', '1000'], ['promotionPriority', '99']]) {
		await page.locator(`#${id}`).fill(v);
		await page.locator(`#${id}`).press('Tab');
	}
	await chonPhamViRac(page);
}

test.describe('11 · CTKM — form, nháp, điều kiện, nhóm đối tượng (tct)', () => {
	test('11_030_004 — Kiểm tra thời gian áp dụng', async ({ page }) => {
		chanNeuTat('11_030_004');
		await pm.chanGhi(page);
		const pane = await moForm(page);
		const noi = pm.chuan(await pane.innerText());
		for (const t of ['Thời gian áp dụng', 'Ngày bắt đầu', 'Ngày kết thúc', 'Không cài đặt ngày kết thúc', 'Giờ bắt đầu', 'Giờ kết thúc', 'Không cài đặt khung giờ']) expect(noi, `Thiếu "${t}"`).toContain(t);
		await expect(page.locator('#startTime')).toBeVisible();
		await expect(page.locator('#endTime')).toBeVisible();
		await expect(page.locator('#startTimeFrame')).toBeVisible();
		await expect(page.locator('#endTimeFrame')).toBeVisible();
	});

	test('11_030_005 — Kiểm tra Theo đơn hàng', async ({ page }) => {
		chanNeuTat('11_030_005');
		await pm.chanGhi(page);
		await moForm(page);
		const noi = await chonHinhThuc(page, 'Theo đơn hàng');
		test.info().annotations.push({ type: 'đo', description: noi.slice(noi.indexOf('Phân loại khuyến mại'), noi.indexOf('Phân loại khuyến mại') + 300) });
		for (const t of ['Thiết lập giảm giá & Quà tặng', 'Theo % hoá đơn', 'Theo số tiền', 'Áp dụng quà tặng']) expect(noi, `Theo đơn hàng thiếu "${t}"`).toContain(t);
		await expect(page.locator('#orderDiscountValue')).toBeVisible();
	});

	/** Form "Theo sản phẩm" — kiểm các ô của một hình thức (gom phép kiểm; tiêu đề test viết nguyên văn để công cụ đếm được mã case). */
	async function kiemTheoSp(page, id, hinhThuc, can) {
		chanNeuTat(id);
		await pm.chanGhi(page);
		await moForm(page);
		const noi = await chonHinhThuc(page, 'Theo sản phẩm', hinhThuc);
		const i = noi.indexOf('Hình thức khuyến mại');
		test.info().annotations.push({ type: 'đo', description: noi.slice(i, i + 500) });
		for (const t of can) expect(noi, `"${hinhThuc}" thiếu "${t}"`).toContain(t);
		await expect(page.locator('#conditions_0_minQuantity'), 'Không có ô số lượng mua').toBeVisible();
		if (hinhThuc === 'Giảm giá bán') await expect(page.locator('#conditions_0_productDiscount'), 'Không có ô số tiền giảm').toBeVisible();
		if (hinhThuc !== 'Giảm giá bán') {
			// Tặng kèm / mua giá thấp phải có khu cấu hình SẢN PHẨM ĐI KÈM (khác "Được giảm giá cho mỗi sản phẩm").
			expect(noi, `"${hinhThuc}" vẫn hiện cấu hình của Giảm giá bán`).not.toContain('Được giảm giá cho mỗi sản phẩm');
		}
	}

	test('11_040_001 — Kiểm tra Theo sản phẩm - Giảm giá bán', async ({ page }) => {
		await kiemTheoSp(page, '11_040_001', 'Giảm giá bán', ['Mua từ', 'Sản phẩm áp dụng', 'Được giảm giá cho mỗi sản phẩm']);
	});
	test('11_040_002 — Kiểm tra Theo sản phẩm - Tặng kèm sản phẩm khác', async ({ page }) => {
		await kiemTheoSp(page, '11_040_002', 'Tặng kèm sản phẩm khác', ['Mua từ', 'Sản phẩm áp dụng']);
	});
	test('11_040_003 — Kiểm tra Theo sản phẩm - Được mua sản phẩm bất kỳ giá thấp', async ({ page }) => {
		await kiemTheoSp(page, '11_040_003', 'Được mua sản phẩm bất kỳ giá thấp', ['Mua từ', 'Sản phẩm áp dụng']);
	});

	// ── Điều kiện ───────────────────────────────────────────────────────────────────────
	test('11_080_006 — Thêm điều kiện khuyến mại hợp lệ', async ({ page }) => {
		chanNeuTat('11_080_006');
		const ten = `${seed.PREFIX}KMDK_${hau()}`;
		await moBang(page, 'dk');
		await donSot(page, 'dk', `${seed.PREFIX}KMDK_`);
		await pm.khung(page).getByRole('button', { name: 'Thêm điều kiện' }).click();
		const m = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').filter({ hasText: 'Thêm mới điều kiện đơn hàng' }).last();
		await m.locator('#conditionName').fill(ten);
		await m.getByText('Tính theo giá trị tối thiểu của tổng đơn hàng', { exact: true }).click();
		await m.getByPlaceholder('Nhập giá số tiền').fill('123000');
		await m.getByText('Không yêu cầu', { exact: true }).click();
		const tb = await thongBaoQuanh(page, () => m.getByRole('button', { name: 'Xác nhận' }).click());
		expect(tb).toMatch(/Thêm .*thành công/);
		luuTT({ dk: ten });
		await expect((await tim(page, 'dk', ten)).first(), 'Điều kiện mới không hiện trong danh sách').toBeVisible({ timeout: 15_000 });
	});

	test('11_080_007 — Sửa điều kiện khuyến mại vừa tạo', async ({ page }) => {
		chanNeuTat('11_080_007');
		const cu = napTT().dk;
		test.skip(!cu, 'Không có điều kiện tạm từ 11_080_006.');
		const moi = `${cu}_S`;
		await moBang(page, 'dk');
		const d = (await tim(page, 'dk', cu)).first();
		await d.locator('button:has(.anticon-edit)').first().click();
		const m = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').filter({ hasText: 'Cập nhật điều kiện đơn hàng' }).last();
		await expect(m.locator('#conditionName')).toHaveValue(cu, { timeout: 15_000 });
		await m.locator('#conditionName').fill(moi);
		const tb = await thongBaoQuanh(page, () => m.getByRole('button', { name: 'Xác nhận' }).click());
		expect(tb).toMatch(/Cập nhật .*thành công/);
		luuTT({ dk: moi });
		await expect((await tim(page, 'dk', moi)).first(), 'Tên mới không hiện trong danh sách').toBeVisible({ timeout: 15_000 });
	});

	test('11_080_008 — Xoá điều kiện khuyến mại vừa tạo', async ({ page }) => {
		chanNeuTat('11_080_008');
		const ten = napTT().dk;
		test.skip(!ten, 'Không có điều kiện tạm.');
		await moBang(page, 'dk');
		const tb = await xoaDong(page, (await tim(page, 'dk', ten)).first());
		expect(tb).toMatch(/Xo[aá] .*thành công/);
		luuTT({ dk: null });
		await expect(await tim(page, 'dk', ten), 'Xoá xong vẫn còn trong danh sách').toHaveCount(0);
	});

	// ── Nhóm đối tượng ──────────────────────────────────────────────────────────────────
	test('11_070_007 — Thêm nhóm đối tượng áp dụng hợp lệ', async ({ page }) => {
		chanNeuTat('11_070_007');
		const ten = `${seed.PREFIX}KMNH_${hau()}`;
		await moBang(page, 'nh');
		await donSot(page, 'nh', `${seed.PREFIX}KMNH_`);
		await pm.khung(page).getByRole('button', { name: 'Thêm nhóm đối tượng' }).click();
		const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ hasText: 'Thêm nhóm đối tượng khách hàng áp dụng' }).last();
		await dr.locator('#groupName').fill(ten);
		await dr.locator('#description').fill('AUTO TEST 11 - khong su dung');
		// "Khách mới": không cần bảng điều kiện (loại "Nhóm khách hàng" bắt buộc điều kiện — DrawerAddGroup.jsx).
		await dr.getByText('Khách mới', { exact: true }).click();
		const tb = await thongBaoQuanh(page, () => dr.getByRole('button', { name: 'Xác nhận' }).click());
		expect(tb).toMatch(/Thêm .*thành công/);
		luuTT({ nh: ten });
		await expect((await tim(page, 'nh', ten)).first(), 'Nhóm mới không hiện trong danh sách').toBeVisible({ timeout: 15_000 });
	});

	test('11_070_008 — Sửa nhóm đối tượng áp dụng vừa tạo', async ({ page }) => {
		chanNeuTat('11_070_008');
		const cu = napTT().nh;
		test.skip(!cu, 'Không có nhóm tạm từ 11_070_007.');
		const moi = `${cu}_S`;
		await moBang(page, 'nh');
		const d = (await tim(page, 'nh', cu)).first();
		await d.locator('button:has(.anticon-edit)').first().click();
		const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').filter({ has: page.locator('#groupName') }).last();
		await expect(dr.locator('#groupName')).toHaveValue(cu, { timeout: 15_000 });
		await dr.locator('#groupName').fill(moi);
		const tb = await thongBaoQuanh(page, () => dr.getByRole('button', { name: 'Xác nhận' }).click());
		expect(tb).toMatch(/Cập nhật .*thành công/);
		luuTT({ nh: moi });
		await expect((await tim(page, 'nh', moi)).first(), 'Tên mới không hiện trong danh sách').toBeVisible({ timeout: 15_000 });
	});

	test('11_070_009 — Xoá nhóm đối tượng áp dụng vừa tạo', async ({ page }) => {
		chanNeuTat('11_070_009');
		const ten = napTT().nh;
		test.skip(!ten, 'Không có nhóm tạm.');
		await moBang(page, 'nh');
		const tb = await xoaDong(page, (await tim(page, 'nh', ten)).first());
		expect(tb).toMatch(/Xo[aá] .*thành công/);
		luuTT({ nh: null });
		await expect(await tim(page, 'nh', ten), 'Xoá xong vẫn còn trong danh sách').toHaveCount(0);
	});

	// ── CTKM nháp ───────────────────────────────────────────────────────────────────────
	test('11_030_006 — Thêm chương trình khuyến mại dạng lưu nháp', async ({ page }) => {
		chanNeuTat('11_030_006');
		test.setTimeout(180_000);
		const ten = `${seed.PREFIX}KM_NHAP_${hau()}`;
		await moForm(page);
		await dienNhap(page, ten);
		const cho = page.waitForResponse((r) => /marketing\/campaign/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), { timeout: 30_000 }).catch(() => null);
		const tb = await thongBaoQuanh(page, () => page.getByRole('button', { name: 'Lưu nháp' }).click());
		const res = await cho;
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ tb, http: res?.status(), gui: (res?.request().postData() || '').slice(0, 300) }) });
		expect(res, `Lưu nháp không gửi request. Thông báo: ${tb}`).not.toBeNull();
		expect(res.status(), tb).toBeLessThan(400);
		luuTT({ nhap: ten });
		await pm.moMan(page, 'tct');
		await pm.oTim(page).fill(ten);
		await page.waitForTimeout(3_000);
		const d = pm.dong(page).filter({ hasText: ten }).first();
		await expect(d, 'CTKM nháp không hiện trong danh sách').toBeVisible({ timeout: 20_000 });
		test.info().annotations.push({ type: 'đo', description: `dòng: ${pm.chuan(await d.innerText())}` });
		await expect(d).toContainText(/Nháp|Lưu nháp/);
	});

	test('11_050_002 — Sửa chương trình khuyến mại dạng lưu nháp', async ({ page }) => {
		chanNeuTat('11_050_002');
		test.setTimeout(180_000);
		const cu = napTT().nhap;
		test.skip(!cu, 'Không có CTKM nháp từ 11_030_006.');
		const moi = `${cu}_S`;
		await pm.moMan(page, 'tct');
		await pm.oTim(page).fill(cu);
		await page.waitForTimeout(3_000);
		const d = pm.dong(page).filter({ hasText: cu }).first();
		await expect(d).toBeVisible({ timeout: 20_000 });
		// Icon thao tác của CTKM là <span class="anticon"> trần, 🚫 không bọc <button> (`CampaignManagement.jsx`).
		await d.locator('.anticon-edit').first().click();
		const o = page.getByPlaceholder('Nhập tên chương trình khuyến mại');
		await expect(o).toHaveValue(cu, { timeout: 30_000 });
		await page.waitForTimeout(2_000);
		await o.fill(moi);
		const tb = await thongBaoQuanh(page, () => page.getByRole('button', { name: 'Lưu nháp' }).click());
		test.info().annotations.push({ type: 'đo', description: tb });
		await pm.moMan(page, 'tct');
		await pm.oTim(page).fill(moi);
		await page.waitForTimeout(3_000);
		await expect(pm.dong(page).filter({ hasText: moi }).first(), `Sửa nháp không lưu tên mới (thông báo: ${tb})`).toBeVisible({ timeout: 20_000 });
		luuTT({ nhap: moi });
	});

	test('11_060_001 — Kiểm tra thao tác dừng / tiếp tục / bắt đầu', async ({ page }) => {
		chanNeuTat('11_060_001');
		const { daGoi } = await pm.chanGhi(page);
		await pm.moMan(page, 'tct');
		// Dừng = pause-circle · Bắt đầu = play-circle · Tiếp tục = reload (chỉ CTKM đã lưu chính thức, `savedStatus === 1`).
		const icons = ['pause-circle', 'play-circle', 'reload'];
		let nut = null;
		for (const ic of icons) {
			const n = pm.dong(page).locator(`.anticon-${ic}`).first();
			if (await n.count()) { nut = n; break; }
		}
		test.skip(!nut, 'Danh sách không có nút dừng/tiếp tục/bắt đầu nào ở trang 1.');
		const dong = nut.locator('xpath=ancestor::tr[1]');
		const truoc = pm.chuan(await dong.innerText());
		await nut.click();
		const hop = page.locator('.ant-modal-wrap:visible, .ant-popover:visible, .ant-modal-confirm').last();
		await expect(hop, 'Bấm dừng/tiếp tục/bắt đầu mà không hỏi xác nhận').toBeVisible({ timeout: 10_000 });
		const noi = pm.chuan(await hop.innerText());
		await hop.getByRole('button', { name: /^(Đóng|Hủy|Huỷ|Không)$/ }).first().click();
		await page.waitForTimeout(1_500);
		test.info().annotations.push({ type: 'đo', description: JSON.stringify({ popup: noi, daGoi }) });
		expect(daGoi, 'Bấm Hủy mà vẫn gửi request đổi trạng thái').toEqual([]);
		expect(pm.chuan(await dong.innerText()), 'Hủy mà trạng thái dòng đổi').toBe(truoc);
	});
});
