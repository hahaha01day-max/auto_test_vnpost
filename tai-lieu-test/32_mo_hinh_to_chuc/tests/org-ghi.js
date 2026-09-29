'use strict';

/**
 * Helper GHI phân hệ 32 — chỉ thao tác trên CÂY RÁC `A7MH32*` (tỉnh rác dưới VNPOST, xã rác dưới tỉnh rác), dọn bằng
 * `DELETE /v1.0/organization-unit?unitCode=` (xã trước, tỉnh sau). 🚫 Không sửa/xoá nút thật.
 * Trace vnpost-web `features/chain/pages/organizationManagement/` + `services/organizationApi.js` (xem báo cáo trace 25/09/2026):
 *   drawer "Thêm đơn vị tổ chức" / "Cập nhật đơn vị tổ chức" (Mã đơn vị · Tên đơn vị · Loại đơn vị / Cấp tổ chức (tự theo cha,
 *   disabled) · Đơn vị cha (TreeSelect, chỉ chọn được TCT/tỉnh) …; nút "Huỷ" / "Xác nhận"; toast "Thêm đơn vị tổ chức thành công" /
 *   "Cập nhật đơn vị tổ chức thành công"); khung chi tiết nút "Xoá" (Popconfirm "Xoá đơn vị", okText "Xoá") · "Gán nhân viên" ·
 *   "Cập nhật" · "Tạo điểm bán/hub"; nút "+" hover trên nút cây (không aria-label, `button:has(.anticon-plus)`).
 */

const { expect } = require('@playwright/test');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const g = require('../../19_quan_ly_khach_hang/tests/khach-ghi');
const { chuan, khung, khungChiTiet, moMan, nutCay, oTim } = require('./org-page');

const TIEN_TO = 'A7MH32';
const VNPOST = 'VNPOST';
/**
 * 🔴 Nhánh RÁC CỐ ĐỊNH (tỉnh → xã → nút DIEM_BAN), trạng thái Ngừng hoạt động: BE cho TẠO nút DIEM_BAN qua org-unit API nhưng
 * KHÔNG cho xoá ("Không được phép xoá Điểm bán từ danh mục cây thư mục") ⇒ không dọn được. Dùng lại làm tiền đề 32_140_001.
 */
const CO_DINH = 'A7MH32T901183';
const tsNgan = () => String(Date.now()).slice(-6);

const phien = (browser) => k.moPhienPhu(browser, 'tct', '/chain/organization-management');

async function taoDvApi(ps, { ma, ten, loai, cha }) {
	const b = await k.goiGhi(ps.page, ps.st, 'POST', '/v1.0/organization-unit', {}, { unitCode: ma, unitName: ten, unitType: loai, parentCode: cha, status: true });
	expect(String(b?.status?.code), `Tạo đơn vị rác ${ma} lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
	return ma;
}
const xoaDvApi = (ps, ma) => k.goiGhi(ps.page, ps.st, 'DELETE', '/v1.0/organization-unit', { unitCode: ma }).then((b) => `${ma}→${b?.status?.code}`).catch(() => `${ma}→lỗi`);

/** Tỉnh rác (+ `soXa` xã rác). Trả { tinh, tenTinh, xa: [{ma, ten}] }. */
async function taoNhanhRac(ps, soXa = 0) {
	const ts = tsNgan();
	const tinh = `${TIEN_TO}T${ts}`;
	const tenTinh = `${TIEN_TO} Tỉnh rác ${ts}`;
	await taoDvApi(ps, { ma: tinh, ten: tenTinh, loai: 'BUU_DIEN_TINH', cha: VNPOST });
	const xa = [];
	for (let i = 1; i <= soXa; i += 1) {
		const ma = `${tinh}0${i}`;
		const ten = `${TIEN_TO} Xã rác ${ts}-${i}`;
		await taoDvApi(ps, { ma, ten, loai: 'BUU_DIEN_XA', cha: tinh });
		xa.push({ ma, ten });
	}
	return { tinh, tenTinh, xa };
}

/** Xoá mọi nút `A7MH32*` còn sống (sâu trước). Trả danh sách kết quả. */
async function donRac(ps, tienTo = TIEN_TO) {
	const ds = g.selectDb(`SELECT unit_code, LENGTH(tree)-LENGTH(REPLACE(tree,'/','')) d FROM VNPOST_CORE.ORGANIZATION_UNIT WHERE chain_id=626 AND is_deleted=0 AND unit_code LIKE '${tienTo}%' AND unit_code NOT LIKE '${CO_DINH}%' ORDER BY d DESC`);
	const kq = [];
	for (const [ma] of ds) kq.push(await xoaDvApi(ps, ma));
	return kq;
}

/** Bản ghi DB của nút (null nếu không có / đã xoá). */
function dbDv(ma) {
	const r = g.selectDb(`SELECT unit_code, unit_name, unit_type, parent_code, tree, is_deleted, status FROM VNPOST_CORE.ORGANIZATION_UNIT WHERE chain_id=626 AND unit_code='${ma}' ORDER BY is_deleted, id DESC LIMIT 1`)[0];
	return r ? { ma: r[0], ten: r[1], loai: r[2], cha: r[3], tree: r[4], xoa: r[5] === '1', status: r[6] } : null;
}
const conSong = (ma) => { const d = dbDv(ma); return Boolean(d && !d.xoa); };

const thongBao = async (page) => chuan((await page.locator('.ant-message-notice').allInnerTexts().catch(() => [])).join(' | '));
const drawer = (page, tieuDe) => page.locator('.ant-drawer-open').filter({ hasText: tieuDe }).last();

/** Tìm tên trên cây rồi bấm chọn nút đó. */
async function chonTrenCay(page, ten) {
	await oTim(page).fill(ten);
	await page.waitForTimeout(2_500);
	const nut = nutCay(page).filter({ hasText: ten }).first();
	await expect(nut, `Cây không có "${ten}"`).toBeVisible({ timeout: 20_000 });
	await nut.locator('.ant-tree-node-content-wrapper').first().click();
	await page.waitForTimeout(2_500);
	return nut;
}

/** Chọn đơn vị cha trong TreeSelect theo MÃ (🔴 nút TreeSelect hiển thị mã đơn vị, không phải tên). */
async function chonCha(page, dr, ten) {
	const o = oForm(dr, 'Đơn vị cha').locator('.ant-select').first();
	await o.click();
	const inp = o.locator('input');
	if (await inp.isEditable().catch(() => false)) await inp.pressSequentially(ten.slice(0, 30), { delay: 20 });
	await page.waitForTimeout(1_500);
	const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
	const nut = dd.locator('.ant-select-tree-treenode').filter({ has: page.locator('.ant-select-tree-title', { hasText: new RegExp(`^\\s*${ten}(\\s|$|\\W)`) }) }).first();
	await expect(nut, `TreeSelect "Đơn vị cha" không có "${ten}"`).toBeVisible({ timeout: 15_000 });
	await nut.locator('.ant-select-tree-node-content-wrapper').first().click();
	await page.waitForTimeout(800);
}

/** Form.Item theo NHÃN chính xác (🔴 filter hasText 'Đơn vị cha' khớp nhầm ô "Loại đơn vị" có placeholder "Tự động theo đơn vị cha"). */
const oForm = (dr, nhan) => dr.locator('.ant-form-item').filter({ has: dr.page().locator('.ant-form-item-label label', { hasText: new RegExp(`^\\s*${nhan.replace(/[/()]/g, '\\$&')}\\s*\\*?\\s*$`) }) });

async function moThem(page) {
	await khung(page).getByRole('button', { name: 'Thêm đơn vị' }).first().click();
	const dr = drawer(page, 'Thêm đơn vị tổ chức');
	await expect(dr, 'Không mở drawer "Thêm đơn vị tổ chức"').toBeVisible({ timeout: 10_000 });
	await page.waitForTimeout(1_000);
	return dr;
}

/** Bấm Xác nhận; trả { req, res, tb, loi } (req = body POST/PUT nếu có gửi). */
async function xacNhan(page, dr) {
	const cho = page.waitForResponse((r) => r.url().includes('/v1.0/organization-unit') && r.request().method() !== 'GET', { timeout: 10_000 }).catch(() => null);
	await dr.getByRole('button', { name: 'Xác nhận' }).click();
	const r = await cho;
	await page.waitForTimeout(1_200);
	return {
		req: r ? r.request().postDataJSON() : null,
		res: r ? await r.json().catch(() => null) : null,
		tb: await thongBao(page),
		loi: (await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).map(chuan),
	};
}

module.exports = { CO_DINH, oForm, TIEN_TO, VNPOST, chonCha, chonTrenCay, chuan, conSong, dbDv, donRac, drawer, g, k, khung, khungChiTiet, moMan, moThem, nutCay, oTim, phien, taoDvApi, taoNhanhRac, thongBao, tsNgan, xacNhan, xoaDvApi };
